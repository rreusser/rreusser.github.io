const d3 = require('d3');
const createZoom = require('./create-zoom.js');
const mat4create = require('gl-mat4/create');
const mat4multiply = require('gl-mat4/multiply');
const mat4invert = require('gl-mat4/invert');
const mat4fromScaling = require('gl-mat4/fromScaling');
const css = require('insert-css');
const failIfNot = require('fail-nicely');

css(`
canvas { cursor: move; }
.sketch-nav {
  left: 0 !important;
  right: auto !important;
  text-align: left !important;
}
.tick line {
  stroke: white;
}
.tick text {
  fill: white;
}
.domain {
  stroke: white !important;
}
svg {
  z-index: 1;
  position: relative;
  pointer-events: none;
};
`);

function mod(n, m) {
  return ((n % m) + m) % m;
}

const State = require('controls-state');
const GUI = require('controls-gui');

const regl = require('regl')({
  attributes: {antialias: true},
  optionalExtensions: [ ],
  onDone: failIfNot(run),
});

function qrand2d(i) {
  const g = 1.32471795724474602596;
  const a1 = 1.0 / g;
  const a2 = 1.0 / (g * g);
  return [
    (0.5 + a1 * i) % 1 + (Math.random() * 2 - 1) * 0.001,
    (0.5 + a2 * i) % 1 + (Math.random() * 2 - 1) * 0.001,
    Math.random()
  ];
}

function lut(interpolator, n = 256) {
  return new Uint8ClampedArray(d3.quantize(interpolator, n).map(c => {
    return (c = d3.rgb(c)), [c.r, c.g, c.b, 255];
  }).flat());
}

function run (regl) {
  const MAX_POINTS = 1000000;

  const state = GUI(State({
    count: State.Slider(100000, {min: 1000, max: MAX_POINTS, step: 1}),
    zrange: State.Slider(3.5, {min: 2, max: 6, step: 0.1}),
    zblend: State.Slider(0.5, {min: 0, max: 1, step: 0.1}),
    pointSize: State.Slider(5, {min: 1, max: 10, step: 0.1}),
    fadeInEnd: State.Slider(0.2, {min: 0, max: 1, step: 0.01}),
    fadeOutStart: State.Slider(0.5, {min: 0, max: 1, step: 0.01}),
    debug: State.Slider(0, {min: 0, max: 3, step: 0.01}),
    scalePoints: true,
  }));

  const colorscale = regl.texture({
    width: 256,
    height: 1,
    mag: 'nearest',
    min: 'nearest',
    data: lut(d3.interpolateViridis)
  });

  const xy = regl.buffer([...Array(MAX_POINTS).keys()].map(qrand2d));

  const configureUniforms = require('./configure-uniforms.js')(regl);
  const drawPoints = require('./draw-points.js')(regl);

  const canvas = regl._gl.canvas;

  const scales = window.scales = {
    x: d3.scaleLinear().domain([-canvas.width / canvas.height, canvas.width / canvas.height]),
    y: d3.scaleLinear().domain([-0.99, 0.99]),
    dirty: true
  };

  const margin = {
    l: 50, r: 20, t: 20, b: 30
  };

  const svg = d3.create('svg');
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

  const pixelRatio = regl._gl.canvas.width / regl._gl.canvas.offsetWidth;

  function onResize () {
    const {innerWidth: w, innerHeight: h} = window;
    scales.x.range([margin.l, w - margin.r]);
    scales.y.range([h - margin.b, margin.t]);
    scales.dirty = true;
    createZoom(canvas, scales);
    updateAxis();
  }

  onResize();
  window.addEventListener('resize', onResize);
  state.$onChange(() => scales.dirty = true);

  const configureViewport = require('./configure-viewport.js')(regl);
  const configureLinearScales = require('./configure-linear-scales.js')(regl);
  const drawBox = require('./draw-box.js')(regl);

  let loop = regl.frame(({tick}) => {
    try {
      configureViewport({margin}, () => {
        configureLinearScales(scales, ({dirty, xDomain, yDomain, viewportWidth, viewportHeight}) => {
          if (!dirty) return;
          regl.clear({color: [0.1, 0.1, 0.1, 1]});
          configureUniforms(state, () => {
            for (let z = 0; z < Math.floor(state.zrange + state.zblend); z++) {
              drawPoints({
                ...state,
                xy,
                xDomain,
                yDomain,
                z,
                colorscale,
              });
            }
            if (state.debug) drawBox();
          });
          updateAxis();
        });
      });
    } catch (e) {
      console.error(e);
      loop.cancel();
    }
  });
}
