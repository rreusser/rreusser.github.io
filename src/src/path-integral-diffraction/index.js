'use strict';

var glsl = require('glslify');
var h = require('h');

var Controls = require('./control-panel-2');
var Gui = require('./control-panel-2/gui');

require('insert-css')(`
canvas {
  cursor: move;
}
`);

// Source:
// Feynman, Richard Phillips, Albert R. Hibbs, and Daniel F. Styer.
//    "Quantum Mechanics and Path Integrals." Mineola, NY: Dover Publications, 2005.
//
// Chapter 3.2, "Diffraction through a Slit".
//
// Plotted here is Eq. 3.40 for a particle passing through a known region of width b
// at some time T. Note that as ħ goes to zero, it approaches a classical slit which
// casts a sharp shadow (well, in one dimension, that is). The color of the field at
// horizontal slice represents the probability of finding the particle at that point
// and time given it passed through the slit at time T.
//
// TODO: Re-derive by hand to confirm whether the Fresnel integral listed is
// scaled or unscaled definition.
//
// Libraries:
// - https://github.com/stdlib-js/stdlib
//

require('regl')({
  pixelRatio: Math.min(window.devicePixelRatio, 1.5),
  extensions: ['oes_texture_float', 'oes_texture_float_linear'],
  attributes: {
    antialias: false
  },
  onDone: require('fail-nicely')(run)
});

require('insert-css')(`
.axis-label {
  font-family: sans-serif;
  color: white;
  position: fixed;
  font-weight: 200;
  font-style: italic;
}
.x-axis {
  bottom: 8px;
  right: 10px;
}
.y-axis {
  transform: translate(0, 100%) rotate(-90deg) translate(-50%, 0);
  transform-origin: 0% 0%;
  left: 8px;
  bottom: 50%;
}
.
`);

function run (regl) {
  var m = 1.0    // mass
  var x0 = 0.0;
  var T = 0.5    // time before scattering
  var b = 0.5    // slit width
  var hbar = 0.05;
  var scaleFactor = 0.5;
  var V = x0 / T    // velocity

  var i0 = window.innerWidth / 2;
  var j0 = window.innerHeight / 2;

  function taint () { dirty = true; }
  var state = Controls({
    hbar: Controls.Slider(5e-3, {min: 1e-4, max: 0.1, step: 0.0001}).onChange(taint),
    aperture: Controls.Slider(0.2, {min: 1e-3, max: 1, step: 0.001}).onChange(taint),
  });

  Gui(state, h('p', null, [
    'This page plots Eq. 3.40 from Feynman and Hibbs\' ',
    h('a', {href: 'http://store.doverpublications.com/0486477223.html', target: 'blank'}, 'Quantum Mechanic and Path Integrals'),
    '. It depicts the magnitude of the wavefunction for a particle passing through a known aperture at a known time. The function is computed by adding up all paths passing through the slit and taking into account interference of the particle with itself. Two slits aren\'t required for a particle to interfere with itself! As ℏ approaches zero, it approaches a sharp shadow.'
  ]));

  require('mouse-change')(function (buttons, i, j) {
    if (buttons === 0) return;
    V = 2.0 * i / window.innerWidth;
    x0 = xmin + (xmax - xmin) * i / window.innerWidth;
    T = tmin + (tmax - tmin) * (1.0 - j / window.innerHeight);
    V = x0 / T;
    dirty = true;
  });

  regl._gl.canvas.addEventListener('touchmove', function (ev) {
    if (ev.touches.length !== 1) return;
    ev.preventDefault();
    var touch = ev.touches[0];
    var i = touch.clientX;
    var j = touch.clientY;

    V = 2.0 * i / window.innerWidth;
    x0 = xmin + (xmax - xmin) * i / window.innerWidth;
    T = tmin + (tmax - tmin) * (1.0 - j / window.innerHeight);
    V = x0 / T;
    dirty = true;
  });



  window.addEventListener('wheel', function (e) {
    e.preventDefault();
    state.aperture = Math.min(1.0, Math.max(1e-3, state.aperture * Math.exp(-e.deltaY * 0.01)));
  });

  document.body.appendChild(h('div', {class: 'x-axis axis-label'}, 'Space ⟶'));
  document.body.appendChild(h('div', {class: 'y-axis axis-label'}, 'Time ⟶'));

  var tmin = 0.0;
  var tmax = 2.0;
  var xmin = -2.0;
  var xmax = 2.0;

  var colormap = regl.texture([require('./plasma')]);

  var setUniforms = regl({
    uniforms: {
      uColormap: colormap,
      uAxes: [xmin, xmax, tmin, tmax],
      uT: () => T,
      uV: () => V,
      uX0: () => x0,
      uB: () => state.aperture,
      uHbar: () => state.hbar,
      uM: m,
      uColorScaleFactor: () => scaleFactor * T / state.aperture,
      uRes: ctx => [1.0 / ctx.framebufferWidth, 1.0 / ctx.framebufferHeight],
    }
  });

  var draw = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      uniform vec4 uAxes;
      varying vec2 vXt;
      void main () {
        vec2 uv = xy * 0.5 + 0.5;
        vXt = uAxes.xz + (uAxes.yw - uAxes.xz) * uv;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      precision highp float;

      #pragma glslify: random = require(glsl-random)
      #pragma glslify: fresnel = require(./fresnel)

      uniform sampler2D uColormap;//, uSrc;
      uniform float uT, uV, uB, uHbar, uM, uX0, uColorScaleFactor;
      varying vec2 vXt;

      #define PI 3.1415926535

      vec4 colormap (float x) {
        x = sqrt(x);
        return texture2D(uColormap, vec2(x + 1.0 / 256.0 * (random(gl_FragCoord.xy) - 0.5), 0.5), 1.0);
        //return texture2D(uColormap, vec2(x, 0.5), 1.0);
      }

      float u (vec2 xt, float sgn) {
        float k = 1.0 + xt.y / uT;
        return ((xt.x - uV * xt.y) + sgn * uB * k) / sqrt(PI * uHbar * xt.y / uM * k);
      }

      float psi(vec2 xt) {
        vec2 SC = fresnel(u(xt, 1.0)) - fresnel(u(xt, -1.0));
        return uM / (2.0 * PI * (uT + xt.y)) * 0.5 * dot(SC, SC);
      }

      void main () {
        gl_FragColor = colormap(psi(vXt - vec2(uX0, uT)) * uColorScaleFactor);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    scissor: {
      enable: true,
      box: {
        x: 0,
        y: ctx => Math.max(0, Math.floor((T - tmin) / (tmax - tmin) * ctx.framebufferHeight)),
        width: ctx => ctx.framebufferWidth,
        height: ctx => ctx.framebufferHeight,
      }
    },
    depth: {enable: false},
    count: 3
  });

  var drawLower = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      uniform vec4 uAxes;
      varying vec2 vXt;
      void main () {
        vec2 uv = xy * 0.5 + 0.5;
        vXt = uAxes.xz + (uAxes.yw - uAxes.xz) * uv;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      precision highp float;

      #pragma glslify: random = require(glsl-random)
      #pragma glslify: fresnel = require(./fresnel)

      uniform sampler2D uColormap;//, uSrc;
      uniform float uT, uV, uB, uHbar, uM, uX0, uColorScaleFactor;
      uniform vec4 uAxes;
      uniform vec2 uRes;
      varying vec2 vXt;

      #define PI 3.1415926535

      vec4 colormap (float x) {
        x = sqrt(x);
        return texture2D(uColormap, vec2(x + 1.0 / 256.0 * (random(gl_FragCoord.xy) - 0.5), 0.5), 1.0);
        //return texture2D(uColormap, vec2(x, 0.5), 1.0);
      }

      float u (vec2 xt, float sgn) {
        float k = 1.0 + xt.y / uT;
        return ((xt.x - uV * xt.y) + sgn * uB * k) / sqrt(PI * uHbar * (xt.y + uT) / uM * k);
      }

      float step (float x) {
        return x > 0.0 ? 1.0 : 0.0;
      }

      float psi(vec2 xt) {
        return uM / (2.0 * PI * (uT + xt.y)) * (step(u(xt, 1.0)) - step(u(xt, -1.0)));
      }

      void main () {
        gl_FragColor = colormap(psi(vXt - vec2(uX0, uT)) * uColorScaleFactor);
        if (vXt.y - uT > (-uRes.y * 5.0 * (uAxes.w - uAxes.z)) && ((vXt.x - uV * uT) < -uB || (vXt.x - uV * uT) > uB)) gl_FragColor = vec4(1);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    scissor: {
      enable: true,
      box: {
        x: 0,
        y: 0,//ctx => Math.ceil((T - tmin) / (tmax - tmin) * ctx.framebufferHeight),
        width: ctx => ctx.framebufferWidth,
        height: ctx => Math.max(0, Math.ceil((T - tmin) / (tmax - tmin) * ctx.framebufferHeight)),
      }
    },
    depth: {enable: false},
    count: 3
  });
  
  
  var dirty = true;
  regl.frame(() => {
    if (!dirty) return;
    setUniforms(() => {
      draw();
      drawLower();
    });
    dirty = false;
  });
}
