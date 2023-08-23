const fs = require('fs');
const path = require('path');
const d3 = require('d3');
const createZoom = require('./create-zoom.js');
const invertMat4 = require('gl-mat4/invert');
const Complex = require('complex.js');
const ResetTimer = require('./reset-timer');
const createControls = require('./controls');
const State = require('controls-state');
const GUI = require('controls-gui');
const css = require('insert-css');

css(fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8'));

const regl = require('regl')({
  extensions: ['oes_standard_derivatives'],
  attributes: {antialias: false, depth: false, alpha: false, stencil: false},
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  const w2c2 = [0, 0, 0, 0];
  function computeConstants () {
    const rho = 1.0;
    const nu = state.t.config.nu
    const w = state.t.config.omega;
    const lossTangent = state.t.config.lossTangent;
    const E = Complex(Math.cos(lossTangent), Math.sin(lossTangent));
    const cl = E.sqrt().mul(Math.sqrt((1 - nu) / rho / (1 + nu) / (1 - 2 * nu)));
    const ct = E.sqrt().div(Math.sqrt(2 * rho * (1 + nu)));
    const w2cl2 = cl.pow(-2).mul(w * w);
    const w2ct2 = ct.pow(-2).mul(w * w);
    w2c2[0] = w2cl2.re;
    w2c2[1] = w2cl2.im;
    w2c2[2] = w2ct2.re;
    w2c2[3] = w2ct2.im;
    scales.dirty = true;
  }

  const state = GUI(State({
    t: State.Tabs({
      config: State.Section({
        omega: State.Slider(20.0, {min: 0.05, max: 100.0, step: 0.001, label: 'Frequency, ω'}),
        nu: State.Slider(0.33, {min: 0, max: 0.49, step: 0.001, label: 'Poisson ratio, ν'}),
        lossTangent: State.Slider(0.12, {min: 0, max: Math.PI * 2 + 1e-8, step: Math.PI / 1000, label: 'Loss tangent'}),
      }, {label: 'Config'}),
      dc: State.Section({
        contrastRamp: State.Slider(2, {min: 1, max: 10, step: 0.01}),
        bias: State.Slider(1.2, {min: 1, max: 2, step: 0.01}),
        saturation: State.Slider(1, {min: 0, max: 1, step: 0.01}),
        magnitude: State.Section({
          divisions: State.Slider(2, {min: 2, max: 8, step: 1}),
          octaves: State.Slider(9, {min: 2, max: 10, step: 1}),
          scale: State.Slider(0.2, {min: 0.01, max: 0.5, step: 0.01}),
          shading: State.Slider(1.0, {min: 0, max: 1, step: 0.01}),
          grid: State.Slider(0.7, {min: 0, max: 1, step: 0.01}),
        }, {expanded: false}),
        phase: State.Section({
          divisions: State.Slider(8, {min: 2, max: 8, step: 1}),
          octaves: State.Slider(4, {min: 2, max: 10, step: 1}),
          scale: State.Slider(0.1, {min: 0.01, max: 0.5, step: 0.01}),
          shading: State.Slider(0.1, {min: 0, max: 1, step: 0.01}),
          grid: State.Slider(0.2, {min: 0, max: 1, step: 0.01}),
        }, {expanded: false}),
      }, {label: 'Domain coloring'})
    })
  }), {
    containerCSS: `
      position: absolute;
      top: 0;
      width: 300px;
      right: 0;
      z-index: 10;
      padding-bottom: 400px;
      pointer-events: none;
    `,
    className: 'controls'
  });

  const canvas = regl._gl.canvas;

  const extent = 20;
  const aspect = canvas.width / canvas.height;
  const scales = {
    x: d3.scaleLinear().domain([-aspect, aspect]),
    y: d3.scaleLinear().domain([-extent, extent]),
    dirty: true
  };

  const margin = {
    l: 50, r: 20, t: 20, b: 30
  };

  const svg = d3.create('svg').attr('class', 'axes');
  const xaxis = svg.append('g');
  const yaxis = svg.append('g');
  document.body.append(svg.node());
  function updateAxis() {
    const {innerWidth: w, innerHeight: h} = window;
    svg.attr('width', w)
    svg.attr('height', h)
    xaxis
      .attr('transform', `translate(0,${h - margin.b})`)
      .call(d3.axisBottom(scales.x));
    yaxis
      .attr('transform', `translate(${margin.l},0)`)
      .call(d3.axisLeft(scales.y));
  }

  function onResize () {
    const {innerWidth: w, innerHeight: h} = window;
    scales.x.range([margin.l, w - margin.r]);
    scales.y.range([h - margin.b, margin.t]);
    scales.dirty = true;
    createZoom(canvas, scales, updateAxis);
    updateAxis();
  }

  onResize();
  window.addEventListener('resize', onResize);
  state.$onChange(() => {
    scales.dirty = true;
    computeConstants();
  });
  computeConstants();

  const configureViewport = require('./configure-viewport.js')(regl);
  const configureLinearScales = require('./configure-linear-scales.js')(regl);
  const drawField = require('./draw-field.js')(regl);

  const loop = regl.frame(({time}) => {
    try {
      configureViewport({margin}, () => {
        configureLinearScales(scales, ({dirty, xDomain, yDomain, viewportWidth, viewportHeight}) => {
          if (!dirty) return;
          regl.clear({color: [0.1, 0.1, 0.1, 1]});
          drawField({...state, w2c2});
        });
      });
    } catch (e) {
      loop.cancel();
      console.error(e);
    }
  });
}
