const d3 = require('d3');
const createREGL = require('regl');
const createZoom = require('./create-zoom.js');
const mat4invert = require('gl-mat4/invert');
const mat4create = require('gl-mat4/create');
const mat4multiply = require('gl-mat4/multiply');
const mat4fromScaling = require('gl-mat4/fromScaling');
const { Pane } = require('../../lib/tweakpane.js');

const PARAMS = window.p = {
  k: 10.0,
  U: 2.0,
};

const pane = window.pane = new Pane({title: 'Parameters'});
pane.addBinding(PARAMS, 'k', {min: 0, max: 20, step: 0.01});
pane.addBinding(PARAMS, 'U', {min: 0.5, max: 2, step: 0.01});

require('insert-css')(`
html, body { background: #333; }
body > canvas { z-index: -1; }
.sketch-nav { right: auto !important; left: 0 !important;
.tp-dfwv { position: fixed !important; }
}`);

createREGL({
  extensions: [
    'OES_standard_derivatives',
  ],
  attributes: {
    antialias: false,
    depthStencil: false,
    alpha: false,
  },
  onDone: require('fail-nicely')(run)
});

function run (regl) {

  const setUniforms = regl({
    uniforms: {
      resolution: ({viewportWidth: w, viewportHeight: h}) => [w, h],
    },
  });

  const canvas = regl._gl.canvas;
  const range = 100.2;
  const aspect = canvas.width / canvas.height;
  const scales = {
    x: d3.scaleLinear().domain([-range, range]),
    y: d3.scaleLinear().domain([-range / aspect, range / aspect])
  };

  let dirty = true;
  function onResize () {
    scales.x.range([0, window.innerWidth]);
    scales.y.range([window.innerHeight, 0]);
    createZoom(canvas, scales, () => dirty = true);
  }
  onResize();
  window.addEventListener('resize', onResize);

  const configureViewport = require('./configure-viewport.js')(regl);
  const configureLinearScales = require('./configure-linear-scales.js')(regl);

  const drawToScreen = regl({
    vert: `
      precision highp float;
      attribute vec2 uv;
      varying vec2 xy;
      uniform vec2 resolution;
      uniform mat4 inverseView;
      void main () {
        gl_Position = vec4(uv, 0, 1);
        xy = (inverseView * vec4(uv, 0, 1)).xy;
      }`,
    frag: `
      #extension GL_OES_standard_derivatives : enable

      precision highp float;
      varying vec2 xy;
      uniform float k, U;

      vec3 COL = vec3(0, 107, 227) / 255. * 1.25;
      vec3 GAMMA = vec3(2.2);

      vec3 tanh(vec3 x) {
        vec3 e2x = exp(2.0 * x);
        return (e2x - 1.0) / (e2x + 1.0);
      }
      float linearstep(float a, float b, float x) {
        return clamp((x - a) / (b - a), 0.0, 1.0);
      }

      void main () {
        const vec2 SOURCE = vec2(100, 0);
        vec2 r = vec2(xy.x, abs(xy.y)) - SOURCE;

        float f = 0.0;
        float g = 1.0;

        float weightSum = 0.0;
        for (float k = 0.0; k < 2.0; k += 0.02) {
          float w = sqrt(g * k);
          float thetaPhase = acos(sqrt(g / k) / U);
          vec2 kPhase = k * vec2(cos(thetaPhase), sin(thetaPhase));

          float thetaGroup = acos(sqrt(g/k * 0.5) / U);
          vec2 kGroup = k * vec2(cos(thetaGroup), sin(thetaGroup));
          float selectGroup = smoothstep(1.0, -1.0, dot(r, kGroup));



          float weight = 1.0 / (k + 1.0e-2);
          f -= weight * cos(dot(kPhase, r)) * selectGroup;
          weightSum += weight;
        }
        

        f /= weightSum;

        vec3 col = pow(COL, GAMMA) + f * 10.0;
        col = 0.5 + 0.5 * tanh(col - 0.5);
        gl_FragColor = vec4(pow(col, 1.0/GAMMA), 1);

        // Draw the theoretical wake angle
        const float thetaKelvin = ${Math.asin(1.0/3.0)};
        const vec2 kKelvin = vec2(sin(thetaKelvin), cos(thetaKelvin));
        float fIdeal = dot(kKelvin, r);
        fIdeal /= fwidth(fIdeal);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1, 0, 0), 0.5 * linearstep(2.5, 1.5, abs(fIdeal)));
      }`,
    attributes: { uv: [-4, -4, 4, -4, 0, 4] },
    uniforms: {
      k: regl.prop('k'),
      U: regl.prop('U'),
    },
    depth: {enable: false},
    count: 3
  });

  pane.on('change', () => dirty = true);

  let frame = 0;
  const loop = regl.frame(() => {
    try {
      if (!dirty) return;
      setUniforms(PARAMS, () => {
        configureViewport({}, () => {
          configureLinearScales(scales, ({view}) => {
            drawToScreen(PARAMS);
          });
        });
      });
      dirty = false;
    } catch (e) {
      console.error(e);
      loop.cancel();
    }
  });
}
