const regl = require('regl');
const Controls = require('controls-state');
const GUI = require('controls-gui');
const glsl = require('glslify');
const css = require('insert-css');

css(`
@import url('https://fonts.googleapis.com/css?family=Fira+Sans+Condensed');

.sketch-nav {
  right: auto !important;
  left: 0 !important;
}
`);

const Eqn = require('./equation')(GUI.preact);

regl({
  extensions: ['oes_texture_float'],
  optionalExtensions: ['oes_texture_half_float'],
  onDone: start,
  pixelRatio: Math.min(2.0, window.devicePixelRatio),
  attributes: {alpha: false, antialias: false}
});

function particleLUT (w, h) {
  return new Array(w * h).fill(0).map((d, i) => [
    (i % w) / Math.max(1, w - 1),
    Math.floor(i / w) / (h - 1)
  ]);
}

function start (err, regl) {
  if (err) return console.error(err);

  var dataType = 'float';
  const supportsWritingFloat = require('./supports-float')(regl);

  if (!supportsWritingFloat) {
    if (regl.hasExtension('oes_texture_half_float')) {
      dataType = 'half float';
    } else {
      throw new Error('Sorry, can\'t write to floating point textures!');
    }
  }

  console.log('dataType:', dataType);

  const state = GUI(Controls({
    about: Controls.Raw(h => h('p', {style: 'max-width: 275px'}, `
      This sketch plots the `, h('a', {href: 'https://en.wikipedia.org/wiki/Ikeda_map'}, 'Ikeda map'), ` defined by `,
      h(Eqn, {latex: `\\displaystyle x_{n+1} = 1 +u(x_n \\cos t_n - y_n \\sin t_n),`, style: {display: 'block', textAlign: 'center'}}),
      h(Eqn, {latex: `\\displaystyle y_{n+1} = u(x_n \\sin t_n + y_n \\cos t_n),`, style: {display: 'block', textAlign: 'center'}}),
      `with parameter `, h(Eqn, {latex: 'u'}), ` and `,
      h(Eqn, {latex: `\\displaystyle t_{n} = 0.4 - \\frac{6}{1 + x_n^2 + y_n^2}.`, style: {display: 'block', textAlign: 'center'}}),
      `It's colored in an ad-hoc manner using the distance moved by the previous few iterates.`
    )),
    u: Controls.Slider(0.9, {min: 0, max: 1, step: 0.005}),
    numPoints: Controls.Slider(100000, {min: 100, max: 4e6, step: 100}).onChange(allocate),
    alpha: Controls.Slider(0.3, {min: 0, max: 1, step: 0.01}),
    restart: initialize,
  }), {
    containerCSS: "position:fixed; top:0; right:8px; min-width:300px; max-width:100%",
    theme: {
      fontFamily: "'Fira Sans Condensed', sans-serif",
    }
  });

  var textures = [null, null];
  var particleFbos = [null, null];
  var drawFbos = [null, null]
  var lookup = null;
  var radius = null;

  function allocateDrawing () {
    drawFbos = drawFbos.map(fbo => (fbo || regl.framebuffer)({
      width: regl._gl.canvas.width,
      height: regl._gl.canvas.height,
      depthStencil: false,
      colorType: dataType,
      colorFormat: 'rgba'
    }));
  }

  window.addEventListener('resize', allocateDrawing);

  function allocate () {
    radius = Math.ceil(Math.sqrt(state.numPoints / 2));
    textures = textures.map(t => (t || regl.texture)({radius: radius, type: dataType}));
    particleFbos = particleFbos.map((fbo, i) => (fbo || regl.framebuffer)({depthStencil: false, color: textures[i]}));
    initialize();
    lookup = (lookup || regl.buffer)(particleLUT(radius, radius));
  }

  function initialize () {
    particleFbos[0].use(drawInitialize);
    particleFbos[1].use(drawInitialize);
  }

  const drawInitialize = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      void main () {
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      precision highp float;
      #pragma glslify: random = require(glsl-random)
      void main () {
        gl_FragColor = (vec4(
          random(gl_FragCoord.xy + 0.0),
          random(gl_FragCoord.xy + 1.0),
          random(gl_FragCoord.xy + 2.0),
          random(gl_FragCoord.xy + 3.0)
        ) * 2.0 - 1.0) * 0.03;
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    depth: {enable: false},
    count: 3
  });

  var iterate = regl({
    vert: `
      precision highp float;
      attribute vec2 aXy;
      varying vec2 vUv;
      void main () {
        vUv = 0.5 * aXy + 0.5;
        gl_Position = vec4(aXy, 0, 1);
      }
    `,
    frag: glsl`
      precision highp float;

      #pragma glslify: ikeda = require(./ikeda)

      varying vec2 vUv;
      uniform sampler2D uSrc;
      uniform float uU;

      void main () {
        vec4 state = texture2D(uSrc, vUv);

        gl_FragColor = vec4(
          ikeda(state.xy, uU),
          ikeda(state.zw, uU)
        );
      }
    `,
    attributes: {
      aXy: [[-4, -4], [0, 4], [4, -4]]
    },
    uniforms: {
      uSrc: regl.prop('src'),
      uU: () => state.u,
    },
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: 3,
  })

  var perturb = regl({
    vert: `
      precision highp float;
      attribute vec2 aXy;
      varying vec2 vUv;
      void main () {
        vUv = 0.5 * aXy + 0.5;
        gl_Position = vec4(aXy, 0, 1);
      }
    `,
    frag: glsl`
      precision highp float;
      #pragma glslify: random = require(glsl-random)
      varying vec2 vUv;
      uniform sampler2D uSrc;
      void main () {
        vec4 state = texture2D(uSrc, vUv);

        if (dot(state.xy, state.xy) > 32.0) state.xy /= 2.0;
        if (dot(state.zw, state.zw) > 32.0) state.zw /= 2.0;

        gl_FragColor = state + (vec4(
          random(gl_FragCoord.xy + 0.0),
          random(gl_FragCoord.xy + 1.0),
          random(gl_FragCoord.xy + 2.0),
          random(gl_FragCoord.xy + 3.0)
        ) * 2.0 - 1.0) * 0.001;
      }
    `,
    attributes: {aXy: [[-4, -4], [0, 4], [4, -4]]},
    uniforms: {uSrc: regl.prop('src')},
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: 3,
  })

  const drawPoints = regl({
    vert: glsl`
      precision highp float;

      #pragma glslify: ikeda = require(./ikeda)

      attribute vec2 aUv;
      uniform vec2 uInverseAspect;
      uniform sampler2D uPosition;
      uniform bool uFirstPair;
      uniform float uU;
      varying vec3 vColor;

      void main () {
        vec4 state = texture2D(uPosition, aUv);
        vec2 xy = uFirstPair ? state.xy : state.zw;

        vec2 dx, prev;
        prev = xy;
        vec2 next = ikeda(xy, uU);
        dx = next - prev;
        float r1 = dot(dx, dx);
        prev = next;
        next = ikeda(next, uU);
        dx = next - prev;
        float r2 = dot(dx, dx);
        prev = next;
        next = ikeda(next, uU);
        dx = next - prev;
        float r3 = dot(dx, dx);
        prev = next;
        next = ikeda(next, uU);
        dx = next - prev;
        float r4 = dot(dx, dx);

        vColor = vec3(0.5);

        vColor += r1 * vec3(1, 0, 0);
        vColor += r2 * vec3(0.5, 0.5, 0);
        vColor += r3 * vec3(0.0, 0.5, 0.5);
        vColor += r4 * vec3(0.0, 0.0, 1.0);

        vColor = normalize(vColor);
        
        gl_Position = vec4((xy - vec2(0.8, -0.6)) * uInverseAspect / 2.0, 0, 1);
        gl_PointSize = 2.0;
      }
    `,
    frag: `
      precision highp float;
      uniform float uAlpha;
      varying vec3 vColor;
      void main () {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `,
    attributes: {
      aUv: () => lookup
    },
    uniforms: {
      uFirstPair: regl.prop('firstPair'),
      uPosition: regl.prop('src'),
      uAlpha: ctx => state.alpha,
      uInverseAspect: ctx => [ctx.framebufferHeight / ctx.framebufferWidth, 1],
      uU: () => state.u
    },
    depth: {enable: false},
    blend: {
      enable: true,
      func: {srcRGB: 'src alpha', srcAlpha: 1, dstRGB: 1, dstAlpha: 1},
      equation: {rgb: 'add', alpha: 'add'}
    },
    primitive: 'points',
    count: () => radius * radius
  });

  var decay = regl({
    vert: `
      precision highp float;
      attribute vec2 aXy;
      varying vec2 vUv;
      void main () {
        vUv = aXy * 0.5 + 0.5;
        gl_Position = vec4(aXy, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uSrc;
      void main () {
        vec3 color = texture2D(uSrc, vUv).rgb;
        gl_FragColor = vec4(color * 0.3, 1.0);
      }
    `,
    attributes: {aXy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {uSrc: regl.prop('src')},
    depth: {enable: false},
    count: 3
  });

  var transfer = regl({
    vert: `
      precision highp float;
      attribute vec2 aXy;
      varying vec2 vUv;
      void main () {
        vUv = aXy * 0.5 + 0.5;
        gl_Position = vec4(aXy, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uSrc;
      uniform float uAlpha;
      void main () {
        vec3 color = texture2D(uSrc, vUv).rgb * uAlpha;
        gl_FragColor = vec4(
          0.12 + vec3(
            color.r,
            color.g,
            color.b
          ),
          1.0
        );
      }
    `,
    attributes: {aXy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uSrc: regl.prop('src'),
      uAlpha: regl.prop('alpha')
    },
    depth: {enable: false},
    count: 3
  });

  var drawAxis = regl({
    vert: `
      precision highp float;
      attribute vec2 aPosition;
      uniform vec2 uInverseAspect;
      void main () {
        vec2 uv = (aPosition - vec2(0.8, -0.6)) * uInverseAspect / 2.0;
        gl_Position = vec4(uv, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      void main () {
        gl_FragColor = vec4(1);
      }
    `,
    attributes: {
      aPosition: new Float32Array([
        -10, 0,  10, 0,
        0, -10,  0, 10
      ])
    },
    uniforms: {
      uInverseAspect: ctx => [ctx.framebufferHeight / ctx.framebufferWidth, 1],
    },
    primitive: 'lines',
    count: 4,
  });
  

  
  allocate();
  allocateDrawing();

  var ping = 0;

  regl.frame(({tick}) => {
    if (tick % 100 === 0) {
      perturb({
        src: particleFbos[ping % 2],
        dst: particleFbos[(ping + 1) % 2],
      });
      ping++;
    }

    iterate({
      src: particleFbos[ping % 2],
      dst: particleFbos[(ping + 1) % 2],
    });
    ping++;

    drawFbos[tick % 2].use(() => {
      decay({src: drawFbos[(tick + 1) % 2]});

      drawPoints({
        src: particleFbos[(ping + 1) % 2],
        firstPair: true,
      })

      drawPoints({
        src: particleFbos[(ping + 1) % 2],
        firstPair: false,
      })
    });

    transfer({
      src: drawFbos[tick % 2],
      alpha: Math.pow(state.alpha / 0.3, 2) * (window.innerWidth / 640) * Math.sqrt(500000 / state.numPoints) / radius * 20.0,
    });

    drawAxis();
  })
}
