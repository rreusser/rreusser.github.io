const fs = require('fs');
const path = require('path');
const d3 = require('d3');
const createZoom = require('./create-zoom.js');
const mat4create = require('gl-mat4/create');
const mat4multiply = require('gl-mat4/multiply');
const mat4invert = require('gl-mat4/invert');
const mat4fromScaling = require('gl-mat4/fromScaling');
const css = require('insert-css');
const failIfNot = require('fail-nicely');
const rand = require('@stdlib/random-base-uniform');

const COLORSCALES = ["Blues","BrBG","BuGn","BuPu","Cividis","Cool","CubehelixDefault","GnBu","Greens","Greys","Inferno","Magma","OrRd","Oranges","PRGn","PiYG","Plasma","PuBu","PuBuGn","PuOr","PuRd","Purples","Rainbow","RdBu","RdGy","RdPu","RdYlBu","RdYlGn","Reds","Sinebow","Spectral","Turbo","Viridis","Warm","YlGn","YlGnBu","YlOrBr","YlOrRd"];


css(`
canvas {
  position: fixed !important;
  cursor: move;
}
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
  position: fixed;
  pointer-events: none;
};
`);

const glslComplex = fs.readFileSync(path.join(__dirname, 'complex.glsl'), 'utf8');

function createCylinderGLSL(joukowsky=true) {
  return `
  ${glslComplex}

  uniform float circulation, R2;
  uniform vec2 ealpha;
  uniform vec2 mu;

  vec2 joukowsky(vec2 z) {
    return cmul(ealpha, (z + mu) + cdiv_fast(vec2(1, 0), (z + mu)));
  }

  vec2 inverseJoukowsky(vec2 z) {
    vec2 r1 = 0.5 * z + csqrt_fast(csqr(z * 0.5) - vec2(1, 0));
    vec2 r2 = z - r1;
    vec2 a1 = mu - r1;
    vec2 a2 = mu - r2;
    return dot(a1, a1) < dot(a2, a2) ? r2 : r1;
  }

  vec2 derivative(vec2 z, float t) {
    z = cmul(z, ealpha);
    ${joukowsky ? 'vec2 zeta = inverseJoukowsky(z);' : 'vec2 zeta = z;'}
    vec2 zetamu = zeta - mu;
    if (dot(zetamu, zetamu) < R2) return vec2(0);

    vec2 Wt = vec2(ealpha.x, -ealpha.y) +
      cdiv_fast(circulation, zetamu) -
      R2 * cdiv_fast(ealpha, csqr(zetamu));

    ${joukowsky ? `
    vec2 W = cdiv_fast(Wt, vec2(1, 0) - cinvsqr_fast(zeta));
    return cmul(vec2(W.x, -W.y), vec2(ealpha.x, -ealpha.y));
    ` : `
    return cmul(vec2(Wt.x, -Wt.y), vec2(ealpha.x, -ealpha.y));
    `}

  }`;
}

const fieldColor = `
uniform sampler2D colorscale;
uniform float invert;
const float a = 0.0;
const float b = 2.0;
vec4 fieldColor(float value) {
  value = (value - a) / (b - a);
  value = 0.5 + invert * atan(2.0 * (value * 2.0 - 1.0)) * ${1 / Math.PI};
  return texture2D(colorscale, vec2(value, 0.5));
}`;

function mod(n, m) {
  return ((n % m) + m) % m;
}

const State = require('controls-state');
const GUI = require('controls-gui');

const regl = require('regl')({
  attributes: {
    antialias: false,
    depthStencil: false,
    alpha: false
  },
  extensions: ['ANGLE_instanced_arrays', 'OES_standard_derivatives'],
  optionalExtensions: [ ],
  onDone: failIfNot(run),
});

function qrand2d(i) {
  const g = 1.32471795724474602596;
  const a1 = 1.0 / g;
  const a2 = 1.0 / (g * g);
  return [(0.5 + a1 * i) % 1, (0.5 + a2 * i) % 1];
}

function lut(interpolator, n = 256) {
  return new Uint8ClampedArray(d3.quantize(interpolator, n).map(c => {
    return (c = d3.rgb(c)), [c.r, c.g, c.b, 255];
  }).flat());
}

function run (regl) {
  const MAX_POINTS = 100000;

  const state = GUI(State({
    field: State.Section({
      joukowskyTransform: State.Checkbox(true, {label: 'Joukowsky transform'}),
      mux: State.Slider(-0.08, {min: -0.5, max: 0, step: 0.001, label: 'µx'}),
      muy: State.Slider(0.08, {min: -0.5, max: 0.5, step: 0.001, label: 'µy'}),
      alpha: State.Slider(10, {min: -90, max: 90, step: 0.01}),
      circulation: State.Slider(0, {min: -Math.PI * 4, max: 4 * Math.PI, step: 0.01}),
      kuttaCondition: true
    }, { label: 'Airfoil configuration', expanded: true }),
    plot: State.Section({
      colorscale: State.Select('Magma', {options: COLORSCALES}),
      invert: false,
      grid: State.Slider(0, {min: 0, max: 1, step: 0.01}),
      //debug: State.Slider(0, {min: 0, max: 3, step: 0.01}),
    }, { label: 'Field', expanded: false }),
    lic: State.Section({
      integration: State.Section({
        count: State.Slider(50000, {min: 1000, max: MAX_POINTS, step: 1}),
        steps: State.Slider(20, {min: 5, max: 40, step: 1}),
        length: State.Slider(0.5, {min: 0, max: 1, step: 0.01}),
      }, {label: 'Integration', expanded: false}),
      appearance: State.Section({
        zrange: State.Slider(3, {min: 2, max: 6, step: 0.1}),
        blending: State.Slider(1, {min: 0, max: 1, step: 0.01}),
        texture: State.Slider(0.15, {min: 0, max: 1, step: 0.01}),
        striping: State.Slider(0.04, {min: 0, max: 0.5, step: 0.01}),
        lineWidth: State.Slider(3, {min: 1, max: 10, step: 0.1}),
        //zblend: State.Slider(0, {min: 0, max: 1, step: 0.1}),
        //fadeInEnd: State.Slider(0.25, {min: 0, max: 1, step: 0.01}),
        //fadeOutStart: State.Slider(0.75, {min: 0, max: 1, step: 0.01}),
      }, {label: 'Appearance', expanded: false}),
      animation: State.Section({
        animate: true,
        frequency: State.Slider(1.0, {min: 0, max: 4, step: 0.01}),
        speed: State.Slider(2.0, {min: 0, max: 10, step: 0.01}),
      }, {label: 'Animation', expanded: false})
    }, {
      label: 'Line Integral Convolution',
      expanded: false
    }),
  }), {
    containerCSS: `
      position: absolute;
      width: 300px;
      right: 5px;
      z-index: 10;
    `
  });

  let smoothedCirculation = state.field.circulation;

  function setCirculation () {
    if (!state.field.kuttaCondition) return;
    const R = Math.sqrt((1 - state.field.mux)**2 + state.field.muy**2);
    state.field.circulation = 4 * Math.PI * R * Math.sin((state.field.alpha * Math.PI / 180) + Math.asin(state.field.muy / R));
  }
  state.$path.field.muy.onChange(setCirculation);
  state.$path.field.kuttaCondition.onChange(({value}) => {
    if (value) {
      setCirculation();
    } else {
      state.field.circulation = 0;
    }
  });
  state.field.$onChanges((updates) => {
    if (!state.field.kuttaCondition) return;
    if (updates.circulation !== undefined) {
      const R = Math.sqrt((1 - state.field.mux)**2 + state.field.muy**2);
      state.field.alpha = 180 / Math.PI * (
        Math.asin(state.field.circulation / (4 * Math.PI * R)) - Math.asin(state.field.muy / R)
      );
    } else if (updates.alpha !== undefined) {
      setCirculation();
    }
  });
  setCirculation();
  

  const colorscale = regl.texture({
    width: 256,
    height: 1,
    mag: 'nearest',
    min: 'nearest',
    data: lut(d3.interpolateMagma)
  });

  state.$path.plot.colorscale.onChange(({value}) => {
    colorscale({
      width: 256,
      height: 1,
      mag: 'nearest',
      min: 'nearest',
      data: lut(d3[`interpolate${value}`])
    });
  });

  const random = rand.factory({seed: 1});

  const xy = regl.buffer([...Array(MAX_POINTS).keys()].map(i => qrand2d(i).concat(i, random(0, 1))));

  const configureUniforms = require('./configure-uniforms.js')(regl);
  const drawPoints = require('./draw-points.js')(regl);
  const drawPoint = require('./draw-point.js')(regl);
  const drawLIC = require('./draw-lic.js')(regl, createCylinderGLSL, fieldColor);
  const drawField = require('./draw-field.js')(regl, createCylinderGLSL, fieldColor);

  const canvas = regl._gl.canvas;

  const extent = 3;
  const aspect = canvas.width / canvas.height;
  const scales = {
    x: d3.scaleLinear().domain([-aspect, aspect]),
    y: d3.scaleLinear().domain([-extent, extent]),
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
          const circulationChanged = Math.abs(state.field.circulation - smoothedCirculation) > 1e-2;
          const type = state.field.joukowskyTransform ? 'joukowsky' : 'cylinder';
          const animate = state.lic.animation.animate && state.lic.appearance.striping > 0;

          if (!dirty && !animate && !circulationChanged) return;

          smoothedCirculation = 0.9 * smoothedCirculation + 0.1 * state.field.circulation;
          console.log(smoothedCirculation);

          regl.clear({color: [0.1, 0.1, 0.1, 1]});
          configureUniforms({...state, colorscale, smoothedCirculation}, () => {
            drawField[type]({...state});
            for (let z = 0; z < Math.floor(state.lic.appearance.zrange /*+ state.lic.appearance.zblend*/); z++) {
              drawLIC[type]({
                ...state,
                xy,
                xDomain,
                yDomain,
                z,
              });
            }
            if (state.field.kuttaCondition) drawPoint();
            //if (state.plot.debug) drawBox();
          });
          if (dirty) updateAxis();
        });
      });
    } catch (e) {
      console.error(e);
      loop.cancel();
    }
  });
}

