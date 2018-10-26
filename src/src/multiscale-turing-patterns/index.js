'use strict';

var hsl2rgb = require('float-hsl2rgb');
var rgb2hsl = require('float-rgb2hsl');
var createControls = require('./control-panel');
var colorStringify = require('color-stringify');
var colorRgba = require('color-rgba');

var pixelRatio = 1.0;
var size = 512;

var inDiv = false;

if (inDiv) {
  var div = document.createElement('div');
  div.style.width = (size / pixelRatio) + 'px';
  div.style.height = (size / pixelRatio) + 'px';
  document.body.appendChild(div);
}

require('regl')({
  pixelRatio: pixelRatio,//Math.min(window.devicePixelRatio, 4.0),
  extensions: [
    'oes_texture_float',
  ],
  optionalExtensions: [
    'webgl_draw_buffers',
  ],
  container: inDiv ? div : null,
  attributes: {
    antialias: false,
    depthStencil: false,
    alpha: false,
  },
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  var convolve = require('./convolve')(regl);
  var initializeState = require('./initialize')(regl);
  var initializeKernel = require('./initialize-kernel')(regl);
  var drawToScreen = require('./draw-to-screen')(regl);
  var createStates = require('./create-state')(regl, 'float');
  var createFFT = require('./fft')(regl);
  var swap = require('./swap');

  var w = size;
  var h = size;

  var scales = [
    { activatorRadius: 250, inhibitorRadius: 500, amount: 0.05,  kernel: 'circular'},
    { activatorRadius: 45,  inhibitorRadius: 90,  amount: 0.04,  kernel: 'circular'},
    { activatorRadius: 20,  inhibitorRadius: 40,  amount: -0.03, kernel: 'circular'},
    { activatorRadius: 10,  inhibitorRadius: 20,  amount: 0.02,  kernel: 'circular'},
    { activatorRadius: 3,   inhibitorRadius: 6,   amount: 0.02,  kernel: 'circular'},
    { activatorRadius: 1,   inhibitorRadius: 2,   amount: 0.01,  kernel: 'circular'}
  ];

  function scaleScales () {
    for (var i = 0; i < scales.length; i++) {
      var factor = size / 1024;
      scales[i].activatorRadius *= factor;
      scales[i].inhibitorRadius *= factor;
    }
  }

  scaleScales();
  computeColors(scales, 0);

  function stringifyColor (color) {
    return colorStringify([
      Math.max(0, Math.min(255, Math.floor(color[0] * 256))),
      Math.max(0, Math.min(255, Math.floor(color[1] * 256))),
      Math.max(0, Math.min(255, Math.floor(color[2] * 256))),
      Math.max(0, Math.min(1, color[3]))
    ], 'hex');
  }

  function parseColor (color) {
    return colorRgba(color).slice(0, 3).map(x => x / 255);
  }

  var maxSize = w / 3;
  var controls = createControls(
    new Array(scales.length).fill(0).map((d, i) => [
      {type: 'heading', label: 'Scale ' + (i + 1)},
      {name: 'radius' + i, label: 'Radius', type: 'range', min: 0, max: maxSize, step: 1, initial: scales[i].activatorRadius},
      {name: 'amount' + i, label: 'Amount', type: 'range', min: -0.03, max: 0.05, step: 0.001, initial: scales[i].amount},
      {name: 'kernel' + i, label: 'Kernel', type: 'select', options: ['gaussian', 'circular'], initial: scales[i].kernel},
      {name: 'color' + i,  label: 'Color',  type: 'color', min: 0, max: 360, step: 1, initial: stringifyColor(scales[i].color, 'hex')},
    ]).flat()
  , {
    onInput: function (state) {
      console.log('state:', state);
      var needsInitialize = false;
      for (var i = 0; i < scales.length; i++) {
        if (scales[i].activatorRadius !== state['radius'+i] ||
          scales[i].kernel !== state['kernel'+i]
        ) {
          needsInitialize = true;
        }
        scales[i].activatorRadius = state['radius' + i];
        scales[i].inhibitorRadius = state['radius' + i] * 2;
        scales[i].amount = state['amount' + i];
        scales[i].color = parseColor(state['color' + i]);
        scales[i].kernel = state['kernel' + i];
        if (needsInitialize) initializeKernels();
      }
    }
  });

  function updatePanel () {
    controls.update({
      radius0: scales[0].activatorRadius,
      radius1: scales[1].activatorRadius,
      radius2: scales[2].activatorRadius,
      radius3: scales[3].activatorRadius,
      radius4: scales[4].activatorRadius,
      radius5: scales[5].activatorRadius,
      amount0: scales[0].amount,
      amount1: scales[1].amount,
      amount2: scales[2].amount,
      amount3: scales[3].amount,
      amount4: scales[4].amount,
      amount5: scales[5].amount,
      kernel0: scales[0].kernel,
      kernel1: scales[1].kernel,
      kernel2: scales[2].kernel,
      kernel3: scales[3].kernel,
      kernel4: scales[4].kernel,
      kernel5: scales[5].kernel,
      color0: stringifyColor(scales[0].color),
      color1: stringifyColor(scales[1].color),
      color2: stringifyColor(scales[2].color),
      color3: stringifyColor(scales[3].color),
      color4: stringifyColor(scales[4].color),
      color5: stringifyColor(scales[5].color),
    });
  }

  function randomizeScales () {
    for (var i = 0; i < scales.length; i++) {
      var radius;
      switch(i) {
        case 0:
          scales[i].amount = 0.03 + 0.02 * Math.random();
          radius = w * (0.125 + 0.375 * Math.random()) * 0.6;
          break;
        case 1:
          scales[i].amount = -0.01 + 0.05 * Math.random();
          radius = Math.max(2, w * (0.25 * Math.random() * Math.random()));
          break;
        default:
          scales[i].amount = 0.01 + 0.02 * Math.random();
          radius = Math.max(2, w * (0.125 * Math.random() * Math.random()));
          break;
      }
      scales[i].kernel = Math.random() > 0.5 ? 'circular' : 'gaussian';
      scales[i].activatorRadius = radius;
      scales[i].inhibitorRadius = radius * 2;
    }
    maxAmount = Math.max.apply(null, scales.map(s => s.amount));
  }

  function randomizeColors () {
    for (var i = 0; i < scales.length; i++) {
      scales[i].color = hsl2rgb([Math.random(), 0.9, 0.5 + 0.4 * Math.random()]);
    }
  }

  function computeColors (scales, phaseShift) {
    scales[0].color = hsl2rgb([230 / 360, 0.7, 0.6]);
    scales[1].color = hsl2rgb([240 / 360, 0.7, 0.5]);
    scales[2].color = hsl2rgb([208 / 360, 0.8, 0.5]);
    scales[3].color = hsl2rgb([210 / 360, 0.8, 0.5]);
    scales[4].color = hsl2rgb([270 / 360, 0.7, 0.5]);
    scales[5].color = hsl2rgb([0 / 360, 1, 0.81]);
  }

  var step = require('./step')(regl, scales.length);

  var y = new Array(2).fill(0).map(() => {
    var simulationData = regl.texture({width: w, height: h, type: 'float', wrapS: 'repeat', wrapT: 'repeat'});
    var result = {width: w, height: h, texture: simulationData};
    if (regl.hasExtension('webgl_draw_buffers')) {
      result.color = regl.texture({width: w, height: h, type: 'float', wrapS: 'repeat', wrapT: 'repeat'});
      result.fbo = regl.framebuffer({colors: [simulationData, result.color]});
    } else {
      result.fbo = regl.framebuffer({color: simulationData});
    }
    return result;
  });

  var multiplexedScalesCount = Math.ceil(scales.length / 2);

  var yFFT = createStates(2, w, h);
  var kernel = createStates(1, w, h)[0];
  var kernelFFT = createStates(multiplexedScalesCount, w, h);
  var scratch = createStates(2, w, h);
  var variations = createStates(multiplexedScalesCount, w, h);
  var maxAmount = Math.max.apply(null, scales.map(s => s.amount));

  var fft = createFFT(w, h, scratch[0].fbo, scratch[1].fbo);

  // Precompute the kernels
  function initializeKernels () {
    for (var i = 0, i2 = 0; i < multiplexedScalesCount; i++, i2+=2) {
      initializeKernel(Object.assign({output: kernel}, {scale1: scales[i2], scale2: scales[i2 + 1]}));

      fft.forward({
        input: kernel,
        output: kernelFFT[i]
      });
    }
  }

  // Initialize the main state to random values
  var iteration;
  function initialize (seed) {
    iteration = 0;
    initializeState({output: y[0], seed: seed});
    initializeKernels();
  }

  initialize(Math.random());

  var dirty = false;
  var dt = 1.0;

  regl.frame(({tick}) => {
    //if (tick % 4 !== 1) return;
    iteration++;

    if (iteration > 10000) {
      if (!dirty) return;
      drawToScreen({input: y[0]});
      dirty = false;
      return;
    }

    // Compute the fft of the current state
    fft.forward({
      input: y[0],
      output: yFFT[0]
    });

    for (var i = 0, i2 = 0; i < multiplexedScalesCount; i++, i2+=2) {
      // Convolve the current state with a given kernel
      convolve({
        input: yFFT[0],
        kernel: kernelFFT[i],
        output: yFFT[1]
      });

      // Inverse-fft the convolved state
      fft.inverse({
        input: yFFT[1],
        output: variations[i]
      });
    }

    // With the convolved states as inputs, compute the update
    step({
      variations: variations,
      scales: scales,
      input: y[0],
      output: y[1],
      dt: dt,
      maxAmount: maxAmount,
    });

    // Swap states and draw
    swap(y);

    drawToScreen({input: y[0]});

    //if (iteration > 350) randomizeIt();
  });

  function randomizeIt () {
    randomizeScales();
    randomizeColors();
    iteration = 0;
    initializeKernels();
    updatePanel();
  }

  window.addEventListener('click', randomizeIt);

  window.addEventListener('resize', function () {
    dirty = true;
  });

}
