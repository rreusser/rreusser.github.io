const KS = require('./kuramoto-sivashinsky.js');
const d3 = require('d3');
const createZoom = require('./create-zoom.js');
const mat4create = require('gl-mat4/create');
const mat4multiply = require('gl-mat4/multiply');
const mat4invert = require('gl-mat4/invert');
const mat4fromScaling = require('gl-mat4/fromScaling');
const explanation = require('./explanation.js');
const css = require('insert-css');

css(`canvas { cursor: move; }`);

const State = require('controls-state');
const GUI = require('controls-gui');

const regl = require('regl')({
  attributes: {antialias: false},
  pixelRatio: 1,
  extensions: [
    'oes_texture_float',
    'oes_texture_float_linear',
    'oes_standard_derivatives',
  ],
  onDone: require('fail-nicely')(run),
});

function lut(interpolator, n = 256) {
  return d3.quantize(interpolator, n).map(c => {
    return (c = d3.rgb(c)), [c.r, c.g, c.b, 1];
  });
}

function run (regl) {
  const N = [256, 256];

  const state = GUI(State({
    Linv: State.Slider(4 / N[0], {min: Math.floor(2 / N[0] * 1000) / 1000, max: 0.25, step: 0.001, label: 'L⁻¹'}),
    LxLy: State.Slider(1, {min: 1, max: 10, step: 0.001, label: 'Lx/Ly'}),
    grid: State.Slider(0.1, {min: 0, max: 1, step: 0.01, label: 'grid opacity'}),
    colorscale: State.Select('Magma', {options: [
      'Magma', 'Inferno', 'Plasma', 'Viridis', 'Cividis', 'Turbo', 'Warm', 'Cool',
      'CubehelixDefault', 'Spectral', 'Rainbow', 'Sinebow', 'Blues', 'Greens',
      'Greys', 'Oranges', 'Purples', 'Reds', 'BuGn', 'BuPu', 'GnBu', 'OrRd', 'PuBu',
      'PuRd', 'YlGn', 'PuBuGn', 'YlGnBu', 'YlOrBr', 'YlOrRd', 'RdPu', 'PuOr', 'RdBu',
      'RdGy', 'BrBG', 'PRGn', 'PiYG', 'RdYlBu', 'RdYlGn',
    ], label: 'color scale'}).onChange(({value}) => {
      colorscale([lut(d3[`interpolate${value}`])])
    }),
    contrast: State.Slider(1, {min: 0.01, max: 2, step: 0.01, label: 'contrast'}),
    invert: State.Checkbox(false, {label: 'invert colors'}),
    restart: () => pde.initialize(),
    exp: State.Section({exp: State.Raw(explanation)}, {label: 'Details'})
  }), {
    containerCSS: 'max-width:100%;width:350px;right:5px;position:absolute;'
  });

  const canvas = regl._gl.canvas;
  const colorscale = regl.texture([lut(d3[`interpolate${state.colorscale}`])]);

  const scales = {
    x: d3.scaleLinear().domain([0.5 - canvas.width / canvas.height, 0.5 + canvas.width / canvas.height]),
    y: d3.scaleLinear().domain([-0.5, 1.5])
  };

  function onResize () {
    scales.x.range([0, canvas.width]);
    scales.y.range([canvas.height, 0]);
    createZoom(canvas, scales);
  }
  onResize();
  window.addEventListener('resize', onResize);

  const pde = new KS(regl, {colorscale, N});

  const configureViewport = require('./configure-viewport.js')(regl);
  const configureLinearScales = require('./configure-linear-scales.js')(regl);

  function createViewScaler (regl) {
    const mView = mat4create();
    const mInverseView = mat4create();
    const mTmp = mat4create();

    const setView = regl({
      context: {
        view: regl.prop('view'),
        inverseView: regl.prop('mInverseView'),
      }
    });

    return function ({scale, view}, fn) {
      mat4multiply(mView, view, mat4fromScaling(mTmp, scale));
      mat4invert(mInverseView, mView);
      setView({mView, mInverseView}, fn);
    };
  }

  const scaleView = createViewScaler(regl);

  pde.initialize();

  let loop = regl.frame(({tick}) => {
    try {
      configureViewport({}, () => {
        configureLinearScales(scales, ({view}) => {
          scaleView({view, scale: [1, 1 / state.LxLy, 1]}, () => {
            pde.iterate({}, {
              ...state,
              colorscale
            });
          });
        });
      });
    } catch (e) {
      console.error(e);
      loop.cancel();
    }
  });
}
