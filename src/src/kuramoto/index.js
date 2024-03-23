const d3 = require('d3');
const createREGL = require('regl');
const createZoom = require('./create-zoom.js');
const mat4invert = require('gl-mat4/invert');
const mat4create = require('gl-mat4/create');
const mat4multiply = require('gl-mat4/multiply');
const mat4fromScaling = require('gl-mat4/fromScaling');
const { Pane } = require('../../lib/tweakpane.js');

const PARAMS = window.p = {
  k: 3.5,
  h: 0.01,
  '⍵₀': 0.1,
  '⍵_noise': 1.0,
};

const pane = new Pane({title: 'Parameters'});
pane.addBinding(PARAMS, 'k', {min: 0, max: 4.0});
pane.addBinding(PARAMS, '⍵₀', {min: -1, max: 1.0});
pane.addBinding(PARAMS, '⍵_noise', {min: 0, max: 4.0});
const restartBtn = pane.addButton({title: 'Restart'})

require('insert-css')(`
html, body {
  background: black;
}
body > canvas {
  z-index: -1;
}
.sketch-nav {
  right: auto !important;
  left: 0 !important;
}`);

const pixelRatio = window.devicePixelRatio;
createREGL({
  extensions: [
    'OES_texture_float',
  ],
  attributes: {
    antialias: false,
    depthStencil: false,
    alpha: false
  },
  pixelRatio,
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  restartBtn.on('click', function ( ){
    regl.poll();
    initialize({out: s[0]});
  });

  const width = 128;
  const height = 128;

  const setUniforms = regl({
    uniforms: {
      viewportRes: ({viewportWidth, viewportHeight, pixelRatio}) => [viewportWidth, viewportHeight],
      resolutionInv: [1 / width, 1 / height],
      k: regl.prop('k'),
      h: regl.prop('h'),
      omeganoise: regl.prop('⍵_noise'),
      omega0: regl.prop('⍵₀'),
    },
  });

  const canvas = regl._gl.canvas;
  const scales = {
    x: d3.scaleLinear().domain([-0.5 * canvas.width / canvas.height, 0.5 * canvas.width / canvas.height]),
    y: d3.scaleLinear().domain([-0.5, 0.5])
  };

  function onResize () {
    scales.x.range([0, window.innerWidth]);
    scales.y.range([window.innerHeight, 0]);
    createZoom(canvas, scales);
  }
  onResize();
  window.addEventListener('resize', onResize);

  const configureViewport = require('./configure-viewport.js')(regl);
  const configureLinearScales = require('./configure-linear-scales.js')(regl);

  const initialize = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      void main () {
        gl_Position = vec4(xy, 0, 1);
      }`,
    frag: `
      precision highp float;

      highp float random(vec2 co) {
          highp float a = 12.9898;
          highp float b = 78.233;
          highp float c = 43758.5453;
          highp float dt= dot(co.xy ,vec2(a,b));
          highp float sn= mod(dt,3.14);
          return fract(sin(sn) * c);
      }

      void main () {
        float u1 = random(gl_FragCoord.xy + 1.3852);
        float u2 = random(gl_FragCoord.xy + 0.8352);

        gl_FragColor = vec4(
          random(gl_FragCoord.xy) * 1.0,
          sqrt(max(0.0, -2.0 * log(max(1e-8, u1)))) * cos(2.0 * ${Math.PI} * u2),
          0,
          0
        );
      }`,
    attributes: { xy: [-4, -4, 4, -4, 0, 4] },
    framebuffer: regl.prop('out'),
    depth: {enable: false},
    count: 3,
  });

  // Compute out = f(x)
  const deriv = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      void main () {
        gl_Position = vec4(xy, 0, 1);
      }`,
    frag: `
      precision highp float;
      uniform vec2 resolutionInv;
      uniform sampler2D x;
      uniform float k, omeganoise, omega0;
      #define TWOPI (${Math.PI * 2})

      void main () {
        vec2 uv = resolutionInv * gl_FragCoord.xy;
        vec2 f = texture2D(x, uv).xy;
        float n = texture2D(x, vec2(uv.x, uv.y + resolutionInv.y)).x;
        float s = texture2D(x, vec2(uv.x, uv.y - resolutionInv.y)).x;
        float e = texture2D(x, vec2(uv.x + resolutionInv.x, uv.y)).x;
        float w = texture2D(x, vec2(uv.x - resolutionInv.x, uv.y)).x;
        float omega = omega0 + f.y * omeganoise;
        gl_FragColor = vec4(
          omega + k * (
            sin(TWOPI * (n - f.x)) +
            sin(TWOPI * (s - f.x)) +
            sin(TWOPI * (e - f.x)) +
            sin(TWOPI * (w - f.x))
          ),
          0, 0, 0
        );
      }`,
    attributes: { xy: [-4, -4, 4, -4, 0, 4] },
    uniforms: { x: regl.prop('x') },
    framebuffer: regl.prop('out'),
    depth: {enable: false},
    count: 3
  });

  // Compute out = a * x + y
  const axpy = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      void main () {
        gl_Position = vec4(xy, 0, 1);
      }`,
    frag: `
      precision highp float;
      uniform vec2 resolutionInv;
      uniform sampler2D x, y;
      uniform float a;
      void main () {
        vec2 uv = resolutionInv * gl_FragCoord.xy;
        gl_FragColor = a * texture2D(x, uv) + texture2D(y, uv);
      }`,
    attributes: { xy: [-4, -4, 4, -4, 0, 4] },
    uniforms: {
      a: regl.prop('a'),
      x: regl.prop('x'),
      y: regl.prop('y'),
    },
    framebuffer: regl.prop('out'),
    depth: {enable: false},
    count: 3
  });

  const draw = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      void main () {
        gl_Position = vec4(xy, 0, 1);
      }`,
    frag: `
      precision highp float;
      uniform vec2 resolutionInv;
      uniform sampler2D x;
      #define PI ${Math.PI}

      vec4 rainbow(vec2 p) {
        // A rainbow colorscale with p in [0, 1] x [0, 1]
        float theta = p.x * (2.0 * 3.141592653589793);
        float c = cos(theta);
        float s = sin(theta);
        return vec4(
          mat3( 0.52308510,  0.56637411,  0.46725319,
                0.12769652,  0.14082407,  0.13691271,
               -0.25934743, -0.12121582,  0.23487050 ) *
          vec3(1.0, 0.0, s) +
          mat3( 0.35556640, -0.11472876, -0.01250831,
                0.15243126, -0.03668075,  0.07652310 ,
               -0.00192128, -0.01350681, -0.00365260 ) *
          vec3(c, s * c, c * c - s * s),
          1.0
        );
      }

      void main () {
        vec2 uv = gl_FragCoord.xy * resolutionInv;
        float value = texture2D(x, uv).x;

        float x = fract(value);
        //gl_FragColor = vec4(vec3(fract(value)), 1);
        gl_FragColor = rainbow(vec2(x, 0.5));
      }`,
    attributes: { xy: [-4, -4, 4, -4, 0, 4] },
    uniforms: { x: regl.prop('x') },
    depth: {enable: false},
    framebuffer: regl.prop('out'),
    count: 3
  });

  const drawToScreen = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      void main () {
        gl_Position = vec4(xy, 0, 1);
      }`,
    frag: `
      precision highp float;
      uniform vec2 viewportRes;
      uniform mat4 inverseView;
      uniform sampler2D x;

      void main () {
        vec2 uv = (inverseView * vec4((-1.0 + 2.0 * gl_FragCoord.xy / viewportRes), 0, 1)).xy;
        gl_FragColor = texture2D(x, uv);
      }`,
    attributes: { xy: [-4, -4, 4, -4, 0, 4] },
    uniforms: {
      x: regl.prop('x')
    },
    depth: {enable: false},
    count: 3
  });


  // Compute out = a * x + y
  const s = [0, 1, 2].map((i) => regl.framebuffer({
    depthStencil: false,
    color: regl.texture({
      width,
      height,
      type: 'float',
      format: 'rgba',
      wrapS: 'repeat',
      wrapT: 'repeat',
      min: 'nearest',
      mag: 'nearest',
    })
  }));

  const screenBuffer = regl.framebuffer({
    depthStencil: false,
    color: regl.texture({
      width,
      height,
      type: 'uint8',
      format: 'rgba',
      min: 'linear',
      mag: 'linear',
      wrapS: 'repeat',
      wrapT: 'repeat',
    })
  });

  // const c2 = 8/15;
  // const c3 = 2/3;
  const a21 = 8/15;
  const a32 = 5/12;
  const b1 = 1/4;
  const b3 = 3/4;

  regl.poll();
  initialize({out: s[0]});

  let frame = 0;
  const loop = regl.frame(() => {
    try {
      setUniforms(PARAMS, () => {
        /*
        // s[1] = F(s[0])
        deriv({out: s[1], x: s[0]});

        // s[2] = s[0] + (b1 * h) * s[1]
        deriv({out: s[2], a: b1 * PARAMS.h, x: s[1], y: s[0]});

        // s[0]  = s[2] + (a21 - b1) * h * s[1]
        axpy({out: s[0], a: (a21 - b1) * PARAMS.h, x: s[1], y: s[2]});

        // s[1] = F(s[0])
        deriv({out: s[1], x: s[0]});

        // s[0]  = s[2] + (a32 * h) * s[1]
        axpy({out: s[0], a: a32 * PARAMS.h, x: s[1], y: s[2]});

        // s[1] = F(s[0])
        deriv({out: s[1], x: s[0]});

        // s[0] = s[2] + (b3 * h) * s[1]
        axpy({out: s[0], a: b3 * PARAMS.h, x: s[1], y: s[2]});
        */

        //if (++frame % 100 === 0) {
          deriv({out: s[1], x: s[0]});
          axpy({out: s[2], a: 0.5 * PARAMS.h, x: s[1], y: s[0]});

          deriv({out: s[1], x: s[2]});
          axpy({out: s[2], a: PARAMS.h, x: s[1], y: s[0]});

          //axpy({out: s[1], a: 0, x: s[2], y: s[0]});
          //axpy({out: s[0], a: 0, x: s[2], y: s[1]});

          let tmp = s[0];
          s[0] = s[2];
          s[2] = tmp;
        //}

        draw({x: s[0], out: screenBuffer});

        configureViewport({}, () => {
          configureLinearScales(scales, ({view}) => {
            drawToScreen({x: screenBuffer});
          });
        });
      });
    } catch (e) {
      console.error(e);
      loop.cancel();
    }
  });
}



// s[0] := u[n]

// s[1] = F(s[0])
// s[2] = s[0] + (b1 * h) * s[1]
// s[0]  = s[2] + (a21 - b1) * h * s[1]
// s[1] = F(s[0])
// s[0]  = s[2] + (a32 * h) * s[1]
// s[1] = F(s[0])
// s[0] = s[2] + (b3 * h) * s[1]

// u[n+1] := s[0]


// 0  |
// c2 | a21
// c3 | a31 a32
// .  | .       .
// .  | .         .
// .  | .           .
// cs | as1 as2 . . . a[s,s-1]
// ---+--------------------------
//    | b1  b2  . . . b[s-1]   bs
//
//
// Wray-van der Houwen
// 
// 0    |
// 8/15 | 8/15
// 2/3  | 1/4  5/12
// -----+------------
     // | 1/4  0    3/4
// 
// c2 = 8/15
// c3 = 2/3
// a21 = 8/15
// a31 = 1/4
// a32 = 5/12
// b1 = 1/4
// b2 = 0
// b3 = 3/4
//
//
//
// I := u[n]
//
// J = F(I)
// K = I + b1 * h * J
//
// L = K + (a21 - b1) * h * J
// M = F(L)
// S2 = K
//
// N = S2 + a32 * h * M
// O = F(N)
// u[n+1] = S2 + b3 * h * O

