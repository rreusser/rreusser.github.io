const createREGL = require('regl');
const { Pane } = require('../../lib/tweakpane.js');

const PARAMS = window.p = {
  k: 0.25,
  h: 0.05,
  omeganoise: 0.0,
  omega0: 0.0,
};

const pane = new Pane({title: 'Parameters'});
const restartBtn = pane.addButton({title: 'Restart'})
pane.addBinding(PARAMS, 'k', {min: 0, max: 1.0});
pane.addBinding(PARAMS, 'omega0', {min: -1, max: 1.0});
pane.addBinding(PARAMS, 'omeganoise', {min: 0, max: 1.0});


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






// s[0] := u[n]

// s[1] = F(s[0])
// s[2] = s[0] + (b1 * h) * s[1]
// s[0]  = s[2] + (a21 - b1) * h * s[1]
// s[1] = F(s[0])
// s[0]  = s[2] + (a32 * h) * s[1]
// s[1] = F(s[0])
// s[0] = s[2] + (b3 * h) * s[1]

// u[n+1] := s[0]

createREGL({
  extensions: [
    'OES_element_index_uint',
    'OES_texture_float',
    'OES_texture_float_linear',
  ],
  attributes: {
    antialias: false,
    depthStencil: false,
    alpha: false
  },
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  restartBtn.on('click', function ( ){
    regl.poll();
    initialize({out: s[0]});
  });

  const width = (window.innerWidth / 2) | 0;
  const height = (window.innerHeight / 2) | 0;

  const setUniforms = regl({
    uniforms: {
      viewportRes: ({viewportWidth, viewportHeight}) => [viewportWidth, viewportHeight],
      resolutionInv: [1 / width, 1 / height],
      k: regl.prop('k'),
      h: regl.prop('h'),
      omeganoise: regl.prop('omeganoise'),
      omega0: regl.prop('omega0'),
    },
  });

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

  // Compute out = a * x + y
  const draw = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      void main () {
        gl_Position = vec4(xy, 0, 1);
      }`,
    frag: `
      precision highp float;
      uniform vec2 viewportRes;
      uniform sampler2D x;
      #define PI ${Math.PI}

      vec4 rainbow(vec2 p) {
        // A rainbow colorscale with p in [0, 1] x [0, 1]
        float theta = p.x * (2.0 * 3.141592653589793);
        float c = cos(theta);
        float s = sin(theta);
        return vec4(
          mat3( 0.5230851 ,  0.56637411,  0.46725319,
                0.12769652,  0.14082407,  0.13691271,
               -0.25934743, -0.12121582,  0.2348705 ) *
          vec3(1.0, p.y * 2.0 - 1.0, s) +
          mat3( 0.3555664 , -0.11472876, -0.01250831,
                0.15243126, -0.03668075,  0.0765231 ,
               -0.00192128, -0.01350681, -0.0036526 ) *
          vec3(c, s * c, c * c - s * s),
          1.0
        );
      }

      void main () {
        vec2 uv = gl_FragCoord.xy / viewportRes;
        float value = texture2D(x, uv).x;

        float x = fract(value);
        //gl_FragColor = vec4(vec3(fract(value)), 1);
        gl_FragColor = rainbow(vec2(x, 0.5));

          /*vec4(pow(0.5 + 0.5 * (
            sin(2.0 * PI * x - 0.0 * PI / 3.0),
            sin(2.0 * PI * x - 2.0 * PI / 3.0),
            sin(2.0 * PI * x - 4.0 * PI / 3.0)
          ), vec3(0.454)), 1);*/
      }`,
    attributes: { xy: [-4, -4, 4, -4, 0, 4] },
    uniforms: { x: regl.prop('x') },
    depth: {enable: false},
    count: 3
  });

  const s = [0, 1, 2].map((i) => regl.framebuffer({
    depthStencil: false,
    color: regl.texture({
      width,
      height,
      type: 'float',
      format: 'rgba',
      //min: i === 0  ? 'linear' : 'nearest',
      //mag: i === 0  ? 'linear' : 'nearest',
    })
  }));

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

        draw({x: s[0]});
      });
    } catch (e) {
      console.error(e);
      loop.cancel();
    }
  });
}



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

