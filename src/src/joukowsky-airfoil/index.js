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

const COLORSCALES = ["Blues","BrBG","BuGn","BuPu","Cool","CubehelixDefault","GnBu","Greens","Greys","Inferno","Magma","OrRd","Oranges","PRGn","PiYG","Plasma","PuBu","PuBuGn","PuOr","PuRd","Purples","Rainbow","RdBu","RdGy","RdPu","RdYlBu","RdYlGn","Reds","Sinebow","Spectral","Viridis","Warm","YlGn","YlGnBu","YlOrBr","YlOrRd"];


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
svg.axes {
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
  uniform vec2 ealpha, rotation;
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
    z = cmul(z, vec2(rotation.x, -rotation.y));
    ${joukowsky ? 'vec2 zeta = inverseJoukowsky(z);' : 'vec2 zeta = z;'}
    vec2 zetamu = zeta - mu;
    if (dot(zetamu, zetamu) < R2) return vec2(0);

    vec2 Wt = vec2(ealpha.x, -ealpha.y) +
      cdiv_fast(circulation, zetamu) -
      R2 * cdiv_fast(ealpha, csqr(zetamu));

    ${joukowsky ? `
    vec2 W = cdiv_fast(Wt, vec2(1, 0) - cinvsqr_fast(zeta));
    return cmul(vec2(W.x, -W.y), rotation);
    ` : `
    return cmul(vec2(Wt.x, -Wt.y), rotation);
    `}

  }`;
}

const fieldColor = `
uniform sampler2D colorscale;
uniform float invert, contrast;
const float a = 0.0;
const float b = 2.0;
vec4 fieldColor(float value, float adjustment) {
  value = (value - a) / (b - a);
  value = 0.5 + invert * atan(contrast * (value * 2.0 - 1.0)) * ${1 / Math.PI};
  return texture2D(colorscale, vec2(value + adjustment, 0.5));
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

  const state = window.state = GUI(State({
    t: State.Tabs({
      field: State.Section({
        explanation: State.Raw(h => [
          h('p', {},
            'This page visualizes flow over an airfoil using the ',
            h('a', {href: 'https://en.wikipedia.org/wiki/Joukowsky_transform'}, 'Joukowsky transform'),
            ', z = ζ + 1/ζ. This conformal map has the remarkable property that it transforms flow over a cylinder into flow over an airfoil.'
          ),
          h('p', {},
            'Adjust the parameters below and observe that flow leaves the trailing edge smoothly when the ',
            h('a', {href: 'https://en.wikipedia.org/wiki/Kutta_condition'}, 'Kutta condition'),
            ' is enforced, resulting in a flow field which generates lift.'
          )
        ]),
        diagram: State.Raw((h, {state}) => {
          var aspectRatio = 1.5;
          var width = 278;
          var height= width / aspectRatio;
          var margin = 1;
          var x = d3.scaleLinear().domain([-2 * aspectRatio, 2 * aspectRatio]).range([margin, width - margin]);
          var y = d3.scaleLinear().domain([-2, 2]).range([height - margin, margin]);
          var mux = x(state.t.field.mux);
          var muy = y(state.t.field.muy);
          var r0 = Math.sqrt(Math.pow(1 - state.t.field.mux, 2) + Math.pow(state.t.field.muy, 2)) * 1;//state.t.field.radius;
          var radius = x(state.t.field.mux + r0) - mux;
          var theta = Math.atan2(state.t.field.muy, 1 - state.t.field.mux);

          return h('div', {className: 'rawContent'}, h('svg', {
            style: {display: 'block', margin: '5px auto'},
            width: width,
            height: height
          },
            // horizontal gridlines
            [-3, -2, -1, 0, 1, 2, 3].map(i => h('line', {
              x1: x(i),
              x2: x(i),
              y1: y(-10),
              y2: y(10),
              stroke: 'rgba(255,255,255,'+(i === 0 ? 0.8 : 0.3)+')',
              'stroke-dasharray': i === 0 ? 2 : 2,
              'stroke-width': 1,
            })),

            // vertical gridlines
            [-2, -1, 0, 1, 2].map(i => h('line', {
              x1: x(-10),
              x2: x(10),
              y1: y(i),
              y2: y(i),
              stroke: 'rgba(255,255,255,'+(i === 0 ? 0.8 : 0.3)+')',
              'stroke-dasharray': i === 0 ? 2 : 2,
              'stroke-width': 1,
            })),

            // (1, 0) reticle
            h('line', {
              x1: x(1) - 4,
              x2: x(1) + 4,
              y1: y(0) - 4,
              y2: y(0) + 4,
              stroke: 'rgba(255,80,50,1)',
              'stroke-width': 2
            }),
            h('line', {
              x1: x(1) - 4,
              x2: x(1) + 4,
              y1: y(0) + 4,
              y2: y(0) - 4,
              stroke: 'rgba(255,80,50,1)',
              'stroke-width': 2
            }),

            // (-1, 0) reticle
            h('line', {
              x1: x(-1) - 4,
              x2: x(-1) + 4,
              y1: y(0) - 4,
              y2: y(0) + 4,
              stroke: 'rgba(255,80,50,1)',
              'stroke-width': 2
            }),
            h('line', {
              x1: x(-1) - 4,
              x2: x(-1) + 4,
              y1: y(0) + 4,
              y2: y(0) - 4,
              stroke: 'rgba(255,80,50,1)',
              'stroke-width': 2
            }),
            h('circle', {
              cx: x(state.t.field.mux),
              cy: y(state.t.field.muy),
              r: radius,
              stroke: 'white',
              fill: 'rgba(255, 255, 255, 0.05)',
              'stroke-width': 1
            }),

            // mu center reticle
            h('line', {
              x1: mux - 6,
              x2: mux + 6,
              y1: muy,
              y2: muy,
              stroke: 'rgba(255,255,255,1)',
              'stroke-width': 2
            }),
            h('line', {
              x1: mux,
              x2: mux,
              y1: muy - 6,
              y2: muy + 6,
              stroke: 'rgba(255,255,255,1)',
              'stroke-width': 2
            }),

            // (1, 0) label
            h('text', {
              x: x(1) + 3,
              y: y(0) + 13,
              fill: 'white',
              style: {'text-shadow': '0 0 2px black', 'font-style': 'italic', 'font-family': 'serif'}},
              '1 + 0i'
            ),

            // (-1, 0) label
            h('text', {
              x: x(-1) + 3,
              y: y(0) + 13,
              fill: 'white',
              'text-anchor': 'start',
              style: {'text-shadow': '0 0 2px black', 'font-style': 'italic', 'font-family': 'serif'}},
              '-1 + 0i'
            ),

            // mu label
            h('text', {
              x: mux - 3,
              y: muy - 3,
              fill: 'white',
              'text-anchor': 'end',
              style: {'text-shadow': '0 0 2px black', 'font-style': 'italic', 'font-family': 'serif'}},
              'µ'
            ),

            // radius line
            h('line', {
              x1: mux,
              y1: muy,
              x2: mux + radius * Math.cos(theta),
              y2: muy + radius * Math.sin(theta),
              stroke: 'rgba(255,255,255,1)',
              'stroke-width': 1,
            }),

          ));
        }),
        joukowskyTransform: State.Checkbox(true, {label: 'Joukowsky transform'}),
        mux: State.Slider(-0.1, {min: -0.5, max: 0, step: 0.001, label: 'µx'}),
        muy: State.Slider(0.08, {min: -0.5, max: 0.5, step: 0.001, label: 'µy'}),
        alpha: State.Slider(10, {min: -90, max: 90, step: 0.01, label: 'Angle of attack, α'}),
        circulation: State.Slider(0, {min: -Math.PI * 4, max: 4 * Math.PI, step: 0.01, label: 'circulation, Γ'}),
        kuttaCondition: State.Checkbox(true, {label: 'Kutta condition'}),
        relativeRotation: State.Checkbox(true, {label: 'rotate display by -α'}),
      }, { label: 'Airfoil configuration', expanded: true }),
      plot: State.Section({
        colorscale: State.Select('Magma', {options: COLORSCALES}),
        contrast: State.Slider(0.7, {min: 0, max: 1, step: 0.001, label: 'contrast'}),
        invert: false,
        grid: State.Slider(0, {min: 0, max: 1, step: 0.01}),
        //debug: State.Slider(0, {min: 0, max: 3, step: 0.01}),

        lic: State.Section({
          animate: true,
          count: State.Slider(30000, {min: 1000, max: MAX_POINTS, step: 1}),
          steps: State.Slider(20, {min: 5, max: 40, step: 1, label: 'integration steps'}),
          zrange: State.Slider(3, {min: 2, max: 5, step: 1, label: 'octaves'}),
          length: State.Slider(0.7, {min: 0, max: 1, step: 0.01, label: 'line length'}),
          lineWidth: State.Slider(3, {min: 1, max: 10, step: 0.1, label: 'line width'}),
          blending: State.Slider(1, {min: 0, max: 1, step: 0.01, label: 'line blending'}),
          texture: State.Slider(0.08, {min: 0, max: 0.5, step: 0.01}),
          striping: State.Slider(0.04, {min: 0, max: 0.5, step: 0.01, label: 'stripe strength'}),
          frequency: State.Slider(0.2, {min: 0, max: 4, step: 0.01, label: 'stripe frequency'}),
          speed: State.Slider(10.0, {min: 0, max: 10, step: 0.01}),
          //zblend: State.Slider(0, {min: 0, max: 1, step: 0.1}),
          //fadeInEnd: State.Slider(0.25, {min: 0, max: 1, step: 0.01}),
          //fadeOutStart: State.Slider(0.75, {min: 0, max: 1, step: 0.01}),
        }, {
          label: 'Line Integral Convolution',
          expanded: true
        }),
      }, { label: 'Plot'}),
    })
  }), {
    containerCSS: `
      position: absolute;
      width: 300px;
      right: 5px;
      z-index: 10;
    `
  });

  let smoothedCirculation = state.t.field.circulation;

  function setCirculation () {
    if (!state.t.field.kuttaCondition) return;
    const R = Math.sqrt((1 - state.t.field.mux)**2 + state.t.field.muy**2);
    state.t.field.circulation = 4 * Math.PI * R * Math.sin((state.t.field.alpha * Math.PI / 180) + Math.asin(state.t.field.muy / R));
  }
  state.$path.t.field.muy.onChange(setCirculation);
  state.$path.t.field.kuttaCondition.onChange(({value}) => {
    if (value) {
      setCirculation();
    } else {
      state.t.field.circulation = 0;
    }
  });
  state.t.field.$onChanges((updates) => {
    if (!state.t.field.kuttaCondition) return;
    if (updates.circulation !== undefined) {
      const R = Math.sqrt((1 - state.t.field.mux)**2 + state.t.field.muy**2);
      state.t.field.alpha = 180 / Math.PI * (
        Math.asin(state.t.field.circulation / (4 * Math.PI * R)) - Math.asin(state.t.field.muy / R)
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

  state.$path.t.plot.colorscale.onChange(({value}) => {
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
          const circulationChanged = Math.abs(state.t.field.circulation - smoothedCirculation) > 1e-2;
          const type = state.t.field.joukowskyTransform ? 'joukowsky' : 'cylinder';
          const animate = state.t.plot.lic.animate && state.t.plot.lic.striping > 0;

          if (!dirty && !animate && !circulationChanged) return;

          smoothedCirculation = 0.9 * smoothedCirculation + 0.1 * state.t.field.circulation;

          regl.clear({color: [0.1, 0.1, 0.1, 1]});
          configureUniforms({...state, colorscale, smoothedCirculation}, () => {
            drawField[type]({...state});
            for (let z = 0; z < Math.floor(state.t.plot.lic.zrange /*+ state.t.plot.lic.zblend*/); z++) {
              drawLIC[type]({
                ...state,
                xy,
                xDomain,
                yDomain,
                z,
              });
            }
            drawPoint();
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
