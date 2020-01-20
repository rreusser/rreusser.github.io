const glsl = require('glslify');
const invertMat4 = require('gl-mat4/invert');
const Complex = require('complex.js');
const css = require('insert-css');

css(`
@import url('https://fonts.googleapis.com/css?family=Fira+Sans+Condensed');

.sketch-nav {
  right: auto !important;
  left: 0 !important;
}
`);

const regl = require('regl')({
  pixelRatio: Math.min(1.5, window.devicePixelRatio),
  extensions: ['oes_standard_derivatives'],
  attributes: {antialias: false, depth: false, alpha: false, stencil: false},
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  const camera = require('./camera-2d')(regl, {xmin: -15, xmax: 15});
  const w2c2 = new Float32Array(4);
  const state = require('./state')();

  function computeConstants () {
    var mat = state.material;
    var rho = 1.0;
    var E = Complex(Math.cos(mat.viscoelasticity), Math.sin(mat.viscoelasticity));
    var cl = E.sqrt().mul(Math.sqrt((1 - mat.nu) / rho / (1 + mat.nu) / (1 - 2 * mat.nu)));
    var ct = E.sqrt().div(Math.sqrt(2 * rho * (1 + mat.nu)));
    var w2cl2 = cl.pow(-2).mul(mat.omega * mat.omega);
    var w2ct2 = ct.pow(-2).mul(mat.omega * mat.omega);
    w2c2[0] = w2cl2.re;
    w2c2[1] = w2cl2.im;
    w2c2[2] = w2ct2.re;
    w2c2[3] = w2ct2.im;
    camera.taint();
  }

  state.$onChanges(computeConstants);
  computeConstants(state);

  const mViewInv = new Float32Array(16);
  const draw = regl({
    vert: `
      precision highp float;
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

      uniform float w, viewportHeight;
      uniform vec2 strength, steps, scale, grid;
      uniform vec4 w2c2;
      uniform bool polar, antisymmetric;

      varying vec2 z;

      #pragma glslify: domainColoring = require(./domain-coloring)
      #pragma glslify: csincos = require(./glsl-complex/sincos)
      #pragma glslify: csqr = require(./glsl-complex/sqr)
      #pragma glslify: cmul = require(./glsl-complex/mul)

      vec4 computePQ (vec2 k2) {
        vec4 pq2 = w2c2 - k2.xyxy;
        vec2 mag2 = pq2.xz * pq2.xz + pq2.yw * pq2.yw;
        float pmag = sqrt(sqrt(mag2.x));
        float qmag = sqrt(sqrt(mag2.y));
        float parg = 0.5 * atan(pq2.y, pq2.x);
        float qarg = 0.5 * atan(pq2.w, pq2.z);
        return vec4(
          pmag * vec2(cos(parg), sin(parg)),
          qmag * vec2(cos(qarg), sin(qarg))
        );
      }

      vec2 f(vec2 z, bool antisymmetric) {
        vec2 k2 = csqr(z.xy);
        vec4 p2_q2 = w2c2 - k2.xyxy;

        vec4 halfPq = computePQ(k2) * 0.5;

        // (k^2 - q^2)^2:
        vec2 k2q22 = csqr(k2 - p2_q2.zw);

        // 4 * k^2 * q * p:
        vec2 k24pq = 16.0 * cmul(k2, cmul(halfPq.xy, halfPq.zw));

        vec4 scHalfP = csincos(halfPq.xy);
        vec4 scHalfQ = csincos(halfPq.zw);
        vec2 cospsinq = cmul(scHalfP.zw, scHalfQ.xy);
        vec2 cosqsinp = cmul(scHalfQ.zw, scHalfP.xy);

        if (antisymmetric) {
          return cmul(k2q22, cospsinq) + cmul(k24pq, cosqsinp);
        } else {
          return cmul(k2q22, cosqsinp) + cmul(k24pq, cospsinq);
        }
      }

      void main () {
        gl_FragColor = vec4(domainColoring(
          f(z, antisymmetric),
          polar,
          steps,
          scale,
          strength,
          grid,
          viewportHeight
        ), 1.0);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      mViewInv: ctx => invertMat4(mViewInv, ctx.view),
			viewportHeight: regl.context('viewportHeight'),
      antisymmetric: () => state.material.modes === 'antisymmetric',
      steps: () => [state.visualization.magnitude.steps, state.visualization.phase.steps],
      strength: () => [state.visualization.magnitude.strength, state.visualization.phase.strength],
      scale: () => [state.visualization.magnitude.scale, state.visualization.phase.scale],
      grid: () => [state.visualization.magnitude.grid, state.visualization.phase.grid],
      polar: true,
      w2c2: () => w2c2,
      w: () => w,
    },
    depth: {enable: false},
    count: 3
  });

  regl.frame(({time}) => {
    camera.draw(({dirty}) => {
      if (!dirty) return;
      draw();
    });
  });

  window.addEventListener('resize', camera.resize);
}
