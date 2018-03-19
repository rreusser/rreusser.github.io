const glsl = require('glslify');
const invertMat4 = require('gl-mat4/invert');
const Complex = require('complex.js');
const regl = require('regl')({
  pixelRatio: Math.min(1.5, window.devicePixelRatio),
  extensions: ['oes_standard_derivatives'],
  attributes: {antialias: false, depth: false, alpha: false, stencil: false},
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  const camera = require('./camera-2d')(regl, {xmin: -5, xmax: 5});

  var E = Complex(1, 0);
  var rho = 1.0;
  var nu = 0.33;
  var h = 1.0;
  var w = 5.0;
  var w;
  var viscoelasticity = 0.0;
  var w2c2 = [];

  require('control-panel')([
    {type: 'range', label: 'ω', min: 0.05, max: 40.0, initial: w, step: 0.01},
    {type: 'range', label: 'ν', min: 0, max: 0.49, initial: nu, step: 0.01},
    {type: 'range', label: 'viscoelasticity', min: 0, max: Math.PI * 2, initial: viscoelasticity},
  ]).on('input', computeConstants);

  function computeConstants (state) {
    nu = state.ν;
    w = state.ω;
    E = Complex(Math.cos(state.viscoelasticity), Math.sin(state.viscoelasticity));
    var cl = E.sqrt().mul(Math.sqrt((1 - nu) / rho / (1 + nu) / (1 - 2 * nu)));
    var ct = E.sqrt().div(Math.sqrt(2 * rho * (1 + nu)));
    var w2cl2 = cl.pow(-2).mul(w * w);
    var w2ct2 = ct.pow(-2).mul(w * w);
    w2c2[0] = w2cl2.re;
    w2c2[1] = w2cl2.im;
    w2c2[2] = w2ct2.re;
    w2c2[3] = w2ct2.im;
    camera.taint();
  }

  computeConstants({ω: w, viscoelasticity: viscoelasticity, ν: nu});

  const mViewInv = new Float32Array(16);
  const draw = regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      uniform mat4 mViewInv;
      varying vec2 z;
      void main () {
        z = (mViewInv * vec4(xy, 0, 1)).xy;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      #extension GL_OES_standard_derivatives : enable

      precision highp float;

      #pragma glslify: hsv2rgb = require(glsl-hsv2rgb)
      #pragma glslify: hypot = require(glsl-hypot)
      #pragma glslify: computeGrid = require(glsl-solid-wireframe/cartesian/scaled)

      #define M_PI 3.141592653

      vec4 domainColoring (vec2 z, vec2 gridSpacing, float saturation, float gridStrength, float magStrength) {
        float carg = atan(z.y, z.x);
        float cmod = hypot(z);
        float logmag = log2(cmod);

        gridSpacing /= cmod;

        float phaseGrid = 1.0 - computeGrid(z.xy * gridSpacing, 0.5, 0.5);
        float magGrid = 1.0 - computeGrid(logmag, 0.5, 0.5);

        return vec4(
          hsv2rgb(vec3(
            carg * 0.5 / M_PI,
            saturation,
            0.5 + 0.5 * saturation
          )) * (0.4 + 0.6 * smoothstep(0.0, 10.0, logmag))
          - gridStrength * phaseGrid + magGrid * magStrength,
          1.0);
      }

      #pragma glslify: hypot = require(glsl-hypot)
      uniform float w;
      uniform vec4 w2c2;
      varying vec2 z;

      float sqr (float x) {return x * x;}

      vec2 sinhcosh (float x) {
        vec2 ex = exp(vec2(x, -x));
        return 0.5 * (ex - vec2(ex.y, -ex.x));
      }

      vec2 cdiv (vec2 a, vec2 b) {
        return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / dot(b, b);
      }

      vec2 cmul (vec2 a, vec2 b) {
        return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
      }

      vec2 csqr (vec2 a) {
        return vec2(a.x * a.x - a.y * a.y, 2.0 * a.x * a.y);
      }

      vec2 cinv (vec2 a) {
        return vec2(a.x, -a.y) / dot(a, a);
      }

      float cmag2 (vec2 a) {
        return dot(a, a);
      }

      float cosh (float x) {
        return 0.5 * (exp(x) + exp(-x));
      }

      float sinh (float x) {
        return 0.5 * (exp(x) - exp(-x));
      }

      vec2 csin (vec2 z) {
        return vec2(
          sin(z.x) * cosh(z.y),
          cos(z.x) * sinh(z.y)
        );
      }

      vec2 ccos (vec2 z) {
        return vec2(
          cos(z.x) * cosh(z.y),
          -sin(z.x) * sinh(z.y)
        );
      }

      vec4 computePQ (vec2 z) {
        vec2 k2 = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
        vec4 pq2 = w2c2 - k2.xyxy;
        vec2 mag2 = pq2.xz * pq2.xz + pq2.yw * pq2.yw;
        float pmag = pow(mag2.x, 0.25);
        float qmag = pow(mag2.y, 0.25);
        float parg = 0.5 * atan(pq2.y, pq2.x);
        float qarg = 0.5 * atan(pq2.w, pq2.z);
        return vec4(pmag * vec2(cos(parg), sin(parg)), qmag * vec2(cos(qarg), sin(qarg)));
      }

      void main () {
        float mag = cmag2(z);
        vec4 pq = computePQ(z);

        vec2 k2 = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
        vec2 q2 = vec2(pq.z * pq.z - pq.w * pq.w, 2.0 * pq.z * pq.w);

        // (k^2 - q^2)^2:
        vec2 k2q22 = vec2(sqr(k2.x - q2.x) - sqr(k2.y - q2.y), 2.0 * (k2.y - q2.y) * (k2.x - q2.x));

        // 4 * k^2 * q * p:
        vec2 k24pq = 4.0 * vec2(
          k2.x * (pq.x * pq.z - pq.y * pq.w) - k2.y * (pq.y * pq.z + pq.x * pq.w),
          k2.y * (pq.x * pq.z - pq.y * pq.w) + k2.x * (pq.y * pq.z + pq.x * pq.w));

        vec2 cospsinq = cmul(ccos(pq.xy * 0.5), csin(pq.zw * 0.5));
        vec2 cosqsinp = cmul(ccos(pq.zw * 0.5), csin(pq.xy * 0.5));

        vec2 fz = cmul(k2q22, cospsinq) + cmul(k24pq, cosqsinp);

        // tan qh:
        /*
        vec2 sch = sinhcosh(2.0 * pq.w);
        float arg = 2.0 * pq.z;
        vec2 tqh = vec2(sin(arg), sch.x) / (sch.y + cos(arg));

        sch = sinhcosh(2.0 * pq.y);
        arg = 2.0 * pq.x;
        vec2 tph = vec2(sin(arg), sch.x) / (sch.y + cos(arg));

        vec2 fz = vec2(
          k24pq.x * tqh.x - k24pq.y * tqh.y + k2q22.x * tph.x - k2q22.y * tph.y,
          k24pq.y * tqh.x + k24pq.x * tqh.y + k2q22.y * tph.x + k2q22.x * tph.y
        );
        */

        gl_FragColor = domainColoring(fz / w / w, vec2(1e-5), 0.7, 0.20, 0.2);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      mViewInv: ({view}) => invertMat4(mViewInv, view),
      w2c2: () => w2c2,
      w: () => w
    },
    depth: {enable: false},
    count: 3
  });

  regl.frame(() => {
    camera.draw(({dirty}) => {
      if (!dirty) return;
      draw();
    });
  });

  window.addEventListener('resize', camera.resize);
}
