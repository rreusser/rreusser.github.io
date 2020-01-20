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
  console.log('supportsWritingFloat:', supportsWritingFloat);

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
    integrator: 'Midpoint (RK2)',
  };
  const dt = 0.03;

  console.log('dataType:', dataType);

  var controlRoot = document.createElement('div');
  document.body.appendChild(require('./controls')(null, controlRoot));

  require('control-panel')([
    {label: 'sqrtNumPoints', type: 'range', min: 4, max: 2048, initial: state.sqrtNumPoints, step: 1},
    {label: 'integrator', type: 'select', options: ['Euler', 'Midpoint (RK2)', 'Runge-Kutta (RK4)'], initial: state.integrator},
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
      radius: state.sqrtNumPoints,
      type: dataType,
    }));
    fbos = fbos.map((fbo, i) => (fbo || regl.framebuffer)({
      depthStencil: false,
      color: textures[i]
    }));

    fbos[0].use(initialize);
    fbos[1].use(initialize);

    lookup = (lookup || regl.buffer)(particleLookup(state.sqrtNumPoints, state.sqrtNumPoints));
  }

  const initialize = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = xy * 0.5 + 0.5;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      varying vec2 uv;

      float random(vec2 co) {
          highp float a = 12.9898;
          highp float b = 78.233;
          highp float c = 43758.5453;
          highp float dt = dot(co.xy, vec2(a,b));
          highp float sn = mod(dt, 3.14);
          return fract(sin(sn) * c);
      }

      void main () {
        gl_FragColor = vec4(
          (random(gl_FragCoord.xy + 0.112095) * 2.0 - 1.0) * 1.5 * ${floatingPointScale.toFixed(4)},
          (random(gl_FragCoord.xy + 0.22910) * 2.0 - 1.0) * 1.5 * ${floatingPointScale.toFixed(4)},
          random(gl_FragCoord.xy) * 3.14159 * 2.0 * ${floatingPointScale.toFixed(4)},
          1.0
        );
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    depth: {enable: false},
    count: 3
  });
  
  const EULER = `
    gl_FragColor = vec4(y0 + dt * derivative(t, y0), y0WithPhase.z, 1.0) * ${floatingPointScale.toFixed(4)};
  `;

  const RK2 = `
    vec2 k1 = dt * derivative(t, y0);
    gl_FragColor = vec4(y0 + dt * derivative(t + dt * 0.5, y0 + k1 * 0.5), y0WithPhase.z, 1.0) * ${floatingPointScale.toFixed(4)};
  `;

  const RK4 = `
    vec2 k1 = dt * derivative(t, y0);
    vec2 k2 = dt * derivative(t + dt * 0.5, y0 + 0.5 * k1);
    vec2 k3 = dt * derivative(t + dt * 0.5, y0 + 0.5 * k2);
    vec2 k4 = dt * derivative(t + dt, y0 + k3);
    gl_FragColor = vec4(y0 + 0.16666666666 * (k1 + k4 + 2.0 * (k2 + k3)), y0WithPhase.z, 1.0) * ${floatingPointScale.toFixed(4)};
  `;

  function createIntegrator (method) {
    return regl({
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
        uniform float uF, uh, umu, uOmega2, uT;
        const float dt = ${dt.toFixed(3)};

        vec2 derivative (float t, vec2 p) {
          return vec2(
            p.y,
            uF * cos(t) - 
              uh * p.y -
              p.x * (
                uOmega2 +
                umu * p.x * p.x
              )
          );
        }

        void main () {
          vec3 y0WithPhase = texture2D(uSrc, vUv).xyz / ${floatingPointScale.toFixed(4)};
          float t = uT + y0WithPhase.z;
          vec2 y0 = y0WithPhase.xy;

          ${method}
        }
      `,
      attributes: {aXy: [[-4, -4], [0, 4], [4, -4]]},
      uniforms: {
        uSrc: regl.prop('src'),
        uF: () => state.F,
        uh: () => state.h,
        umu: () => state.μ,
        uh: () => state.h,
        uT: regl.prop('t'),
        uOmega2: () => state.Ω * state.Ω,
      },
      framebuffer: regl.prop('dst'),
      depth: {enable: false},
      count: 3,
    })
  }

  var integrator = {
    'Euler': createIntegrator(EULER),
    'Midpoint (RK2)': createIntegrator(RK2),
    'Runge-Kutta (RK4)': createIntegrator(RK4),
  };
  
  const drawPoints = regl({
    vert: `
      precision highp float;
      attribute vec2 aUv;
      uniform float uAspect;
      uniform sampler2D uPosition;
      uniform mat4 projection, view;
      varying vec3 vColor;

      #define PI 3.1415926535
      #define PI_2 1.57079633

      float fakeSine (float x) {
        x = mod(x + (PI * 4.0), PI * 2.0);
        float sgn = x < PI ? 1.0 : -1.0;
        float arg = (mod(x, PI) - PI_2) * (1.0 / PI_2);
        return (1.0 - arg * arg) * sgn;
      }

      void main () {
        vec3 p = texture2D(uPosition, aUv).xyz / ${floatingPointScale.toFixed(4)};
        float phase = p.z;

        vColor = normalize(0.33333333 + 0.3333333 * vec3(
          fakeSine(phase),
          fakeSine(phase + (2.0 * 3.14159 / 3.0)),
          fakeSine(phase + (4.0 * 3.14159 / 3.0))
        ));
        
        gl_Position = vec4(vec2(p.x * 2.0, p.y * uAspect) / 8.0, 0, 1);
        gl_PointSize = 2.0;
      }
    `,
    frag: `
      precision highp float;
      uniform float uAlpha;
      varying vec3 vColor;
      void main () {
        gl_FragColor = vec4(vColor, uAlpha);
      }
    `,
    attributes: {
      aUv: () => lookup
    },
    uniforms: {
      uPosition: regl.prop('src'),
      uAlpha: ctx => Math.max(4 / 255, 1.0 / Math.pow(state.sqrtNumPoints / ctx.framebufferWidth * 6, 2)) * 1.5,
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
  
  allocate();

  var t = 0.0;
  regl.frame(({tick}) => {
    integrator[state.integrator]({
      src: fbos[tick % 2],
      dst: fbos[(tick + 1) % 2],
      t: t,
    });

    t = (t + dt) % (Math.PI * 2.0);
    
    regl.clear({color: [0.12, 0.12, 0.12, 1]});
    drawPoints({src: fbos[(tick + 1) % 2]})
  })
}
