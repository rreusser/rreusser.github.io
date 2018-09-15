const regl = require('regl');

regl({
  extensions: ['oes_texture_float'],
  optionalExtensions: ['oes_texture_half_float'],
  onDone: start,
  pixelRatio: Math.min(1.5, window.devicePixelRatio),
  attributes: {alpha: false, antialias: false}
});

function particleLookup (w, h) {
  return new Array(w * h).fill(0).map((d, i) => [
    (i % w) / Math.max(1, w - 1),
    Math.floor(i / w) / (h - 1)
  ]);
}

function start (err, regl) {
  if (err) return console.error(err);

  var dataType = 'float';
  var supportsWritingFloat = require('./supports-float')(regl);

  if (!supportsWritingFloat) {
    if (regl.hasExtension('oes_texture_half_float')) {
      dataType = 'half float';
    } else {
      throw new Error('Sorry, can\'t write to floating point textures!');
    }
  }
  
  const floatingPointScale = 1000.0;
  const state = {
    sqrtNumPoints: 512,
    F: 7.5,
    h: 0.05,
    μ: 1,
    Ω: 0,
  };

  var controlRoot = document.createElement('div');
  document.body.appendChild(require('./controls')(null, controlRoot));

  require('control-panel')([
    {label: 'sqrtNumPoints', type: 'range', min: 4, max: 2048, initial: state.sqrtNumPoints, step: 1},
    {label: 'F', type: 'range', min: 0, max: 16, initial: state.F, step: 0.1},
    {label: 'h', type: 'range', min: 0, max: 1.0, initial: state.h, step: 0.01},
    {label: 'μ', type: 'range', min: 0, max: 1.0, initial: state.μ, step: 0.01},
    {label: 'Ω', type: 'range', min: 0, max: 2.0, initial: state.Ω, step: 0.01},
  ], {root: controlRoot}).on('input', data => {
    var needsAlloc = state.sqrtNumPoints !== data.sqrtNumPoints;
    Object.assign(state, data);
    if (needsAlloc) allocate();
  });
  
  var textures = [null, null];
  var fbos = [null, null];
  var lookup = null;

  function allocate () {
    textures = textures.map(t => (t || regl.texture)({
      data: new Array(state.sqrtNumPoints * state.sqrtNumPoints * 4).fill(0).map((d, i) => (Math.random() - 0.5) * 3.0 * floatingPointScale),
      radius: state.sqrtNumPoints,
      type: 'float'
    }));
    fbos = fbos.map((fbo, i) => (fbo || regl.framebuffer)({
      depthStencil: false,
      color: textures[i]
    }));
    lookup = (lookup || regl.buffer)(particleLookup(state.sqrtNumPoints, state.sqrtNumPoints));
  }
  allocate();
  
  const integrate = regl({
    vert: `
      precision highp float;
      attribute vec2 aXy;
      varying vec2 vUv;
      void main () {
        vUv = 0.5 * aXy + 0.5;
        gl_Position = vec4(aXy, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uSrc;
      uniform float uF, uh, umu, uOmega2;
      const float dt = 0.03;

      vec3 derivative (vec3 p) {
        return vec3(
          p.y,
          uF * cos(p.z) - 
            uh * p.y -
            p.x * (
              uOmega2 +
              umu * p.x * p.x
            ),
          1.0
        );
      }

      void main () {
        vec3 y0 = texture2D(uSrc, vUv).xyz / ${floatingPointScale.toFixed(4)};

        // Fourth order Runge-Kutta (RK4) integration:
        vec3 k1 = dt * derivative(y0);
        vec3 k2 = dt * derivative(y0 + 0.5 * k1);
        vec3 k3 = dt * derivative(y0 + 0.5 * k2);
        vec3 k4 = dt * derivative(y0 + k3);
        gl_FragColor = vec4(y0 + 0.16666666666 * (k1 + k4 + 2.0 * (k2 + k3)), 1.0) * ${floatingPointScale.toFixed(4)};
      }
    `,
    attributes: {aXy: [[-4, -4], [0, 4], [4, -4]]},
    uniforms: {
      uSrc: regl.prop('src'),
      uF: () => state.F,
      uh: () => state.h,
      umu: () => state.μ,
      uh: () => state.h,
      uOmega2: () => state.Ω * state.Ω,
    },
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: 3,
  })
  
  const drawPoints = regl({
    vert: `
      precision highp float;
      attribute vec2 aUv;
      uniform float uAspect;
      uniform sampler2D uPosition;
      uniform mat4 projection, view;
      void main () {
        vec3 p = texture2D(uPosition, aUv).xyz;
        gl_Position = vec4(vec2(p.x * 2.0, p.y * uAspect) / 8.0 / ${floatingPointScale.toFixed(4)}, 0, 1);
        gl_PointSize = 2.0;
      }
    `,
    frag: `
      precision highp float;
      uniform float uAlpha;
      void main () {
        gl_FragColor = vec4(0.4, 0.6, 0.8, uAlpha);
      }
    `,
    attributes: {
      aUv: lookup
    },
    uniforms: {
      uPosition: regl.prop('src'),
      uAlpha: ctx => Math.max(4 / 255, 1.0 / Math.pow(state.sqrtNumPoints / ctx.framebufferWidth * 6, 2)),
      uAspect: ctx => ctx.framebufferWidth / ctx.framebufferHeight,
    },
    depth: {enable: false},
    blend: {
      enable: true,
      func: {srcRGB: 'src alpha', srcAlpha: 1, dstRGB: 1, dstAlpha: 1},
      equation: {rgb: 'add', alpha: 'add'}
    },
    primitive: 'points',
    count: () => state.sqrtNumPoints * state.sqrtNumPoints
  });
  
  regl.frame(({tick}) => {
    integrate({
      src: fbos[tick % 2],
      dst: fbos[(tick + 1) % 2]
    });
    
    regl.clear({color: [0.12, 0.12, 0.12, 1]});
    drawPoints({src: fbos[(tick + 1) % 2]})
  })
}
