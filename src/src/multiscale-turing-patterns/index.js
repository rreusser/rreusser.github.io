'use strict';

var hsl2rgb = require('float-hsl2rgb');
var rgb2hsl = require('float-rgb2hsl');
var createControls = require('./control-panel');
var colorStringify = require('color-stringify');
var colorRgba = require('color-rgba');
var qs = require('query-string');

var queryparams = qs.parse(window.location.hash);
var pixelRatio = parseFloat(queryparams.pr || 1.0);
var size = queryparams.s || 256;
var scaleKnob = parseInt(queryparams.scale2 || 0);
var scaleFactor = Math.round(Math.log(size / 256) / Math.log(2));
var haltAt = parseInt(queryparams.halt || 0);
var inDiv = queryparams.div === 'yes' ? true : false;
var seed = parseInt(queryparams.seed || 0);

if (inDiv) {
  var container = document.createElement('div');
  container.style.textAlign = 'center'
  var div = document.createElement('div');
  div.style.display = 'inline-block';
  div.style.width = (size / pixelRatio) + 'px';
  div.style.height = (size / pixelRatio) + 'px';
  container.appendChild(div);
  document.body.appendChild(container);
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
  if (!inDiv) regl._gl.canvas.style.position = 'fixed';

  var convolve = require('./convolve')(regl);
  var initializeState = require('./initialize')(regl);
  var initializeKernel = require('./initialize-kernel')(regl);
  var drawToScreen = require('./draw-to-screen')(regl);
  var createStates = require('./create-state')(regl, 'float');
  var createFFT = require('./fft')(regl);
  var swap = require('./swap');

  var w = size;
  var h = size;

  function toqs () {
    var factor = size / 1024;
    return {
      pr: pixelRatio,
      s: size,
      ar: scales.map(s => s.activatorRadius / factor),
      ir: scales.map(s => s.inhibitorRadius / factor),
      k: scales.map(s => s.kernel),
      a: scales.map(s => s.amount),
      c: scales.map(s => stringifyColor(s.color)),
      halt: haltAt,
      div: inDiv ? 'yes' : 'no',
      seed: seed,
      scale: scaleFactor,
      scale2: scaleKnob,
    };
  }

  var scales = [
    { activatorRadius: 250, inhibitorRadius: 500, amount: 0.05,  kernel: 'circular'},
    { activatorRadius: 45,  inhibitorRadius: 90,  amount: 0.04,  kernel: 'circular'},
    { activatorRadius: 20,  inhibitorRadius: 40,  amount: -0.03, kernel: 'circular'},
    { activatorRadius: 10,  inhibitorRadius: 20,  amount: 0.02,  kernel: 'circular'},
    { activatorRadius: 3,   inhibitorRadius: 6,   amount: 0.02,  kernel: 'circular'},
    { activatorRadius: 1,   inhibitorRadius: 2,   amount: 0.01,  kernel: 'circular'}
  ];

  function scaleScales (factor) {
    factor = factor || (size / 1024);
    for (var i = 0; i < scales.length; i++) {
      scales[i].activatorRadius *= factor;
      scales[i].inhibitorRadius *= factor;
    }
  }

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

  if (queryparams.ir) queryparams.ir.forEach((ir, i) => scales[i].inhibitorRadius = parseFloat(ir));
  if (queryparams.ar) queryparams.ar.forEach((ar, i) => scales[i].activatorRadius = parseFloat(ar));
  if (queryparams.a) queryparams.a.forEach((a, i) => scales[i].amount = parseFloat(a));
  if (queryparams.k) queryparams.k.forEach((k, i) => scales[i].kernel = k);
  if (queryparams.c) {
    queryparams.c.forEach((c, i) => {
      scales[i].color = parseColor(c)
    });
  } else {
    computeColors(scales, 0);
  }

  scaleScales();

  var maxSize = 100;
  var controls = createControls(
    [
      {name: 'res', type: 'range', min: 8, max: 13, initial: Math.round(Math.log(size) / Math.log(2))},
      {name: 'pixelRat', type: 'range', min: 0.5, max: 4, step: 0.5, initial: parseFloat(pixelRatio)},
      {name: 'scale', type: 'range', min: -8, max: 8, step: 1, initial: scaleFactor},
      {name: 'scale2', type: 'range', min: -8, max: 8, step: 1, initial: scaleKnob},
      {name: 'halt', type: 'range', min: 0, max: 1000, step: 1, initial: haltAt},
      {name: 'inDiv', type: 'select', options: ['yes', 'no'], initial: inDiv ? 'yes' : 'no'},
      {name: 'seed', type: 'button', action: () => { seed = Math.random(); initialize(seed); }},
      {name: 'randomize', type: 'button', action: randomizeIt},
      {name: 'randomize color', type: 'button', action: randomizeColor},
    ].concat(
    new Array(scales.length).fill(0).map((d, i) => [
      {type: 'heading', label: 'Scale ' + (i + 1)},
      {name: 'radius' + i, label: 'Radius', type: 'range', min: 0.05, max: maxSize, step: 0.05, initial: scales[i].activatorRadius},
      {name: 'amount' + i, label: 'Amount', type: 'range', min: -0.03, max: 0.05, step: 0.001, initial: scales[i].amount},
      {name: 'kernel' + i, label: 'Kernel', type: 'select', options: ['gaussian', 'circular'], initial: scales[i].kernel},
      {name: 'color' + i,  label: 'Color',  type: 'color', min: 0, max: 360, step: 1, initial: stringifyColor(scales[i].color, 'hex')},
    ]).flat())
  , {
    onInput: function (state) {
      haltAt = state.halt;
      var resChanged = state.res !== scaleFactor;
      var needsReload = false;
      if (Math.pow(2, state.res) !== parseInt(size) || state.pixelRat !== pixelRatio || (state.inDiv === 'yes') !== inDiv) {
        var newSize = Math.pow(2, state.res);
        if (state.res === scaleFactor || state.res < 11 || window.confirm('This resolution ('+ newSize +'x'+newSize+') may lock up your browser or worse. Are you sure you want to continue?')) {
          needsReload = true;
          scaleScales(Math.pow(2, state.res) / size);
          size = Math.round(Math.pow(2, state.res));
        }
      }
      inDiv = state.inDiv === 'yes';
      var needsInitialize = false;
      if (state.scale !== scaleFactor || scaleKnob !== state.scale2) {
        needsInitialize = true;
      }
      scaleKnob = state.scale2;
      scaleFactor = state.scale;
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
      pixelRatio = state.pixelRat;
      window.location.hash = qs.stringify(toqs());

      if (needsReload) setTimeout(function () {
        window.location.reload();
      }, 500);
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
      color0: stringifyColor(scales[0].color, 'hex'),
      color1: stringifyColor(scales[1].color, 'hex'),
      color2: stringifyColor(scales[2].color, 'hex'),
      color3: stringifyColor(scales[3].color, 'hex'),
      color4: stringifyColor(scales[4].color, 'hex'),
      color5: stringifyColor(scales[5].color, 'hex'),
    });
  }

  function randomizeScales () {
    for (var i = 0; i < scales.length; i++) {
      var radius;
      var ref = 256;
      switch(i) {
        case 0:
          scales[i].amount = 0.03 + 0.02 * Math.random();
          radius = ref * (0.125 + 0.375 * Math.random()) * 0.6;
          break;
        case 1:
          scales[i].amount = -0.01 + 0.05 * Math.random();
          radius = Math.max(0.01, ref * (0.25 * Math.random() * Math.random()));
          break;
        default:
          scales[i].amount = 0.01 + 0.02 * Math.random();
          radius = Math.max(0.01, ref * (0.125 * Math.random() * Math.random()));
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
      initializeKernel(Object.assign({output: kernel}, {scale1: scales[i2], scale2: scales[i2 + 1], scaleFactor: Math.pow(2, scaleFactor + scaleKnob)}));

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
    window.location.hash = qs.stringify(toqs());
  }

  initialize(seed);

  var dirty = false;
  var dt = 1.0;

  regl.frame(({tick}) => {

    if (haltAt > 0 && iteration > haltAt) {
      if (!dirty) return;
      drawToScreen({input: y[0]});
      dirty = false;
      return;
    }

    //if (tick % 4 !== 1) return;
    iteration++;

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

  function randomizeColor () {
    randomizeColors();
    iteration = 0;
    initializeKernels();
    updatePanel();
    window.location.hash = qs.stringify(toqs());
  }

  function randomizeIt () {
    randomizeScales();
    randomizeColors();
    iteration = 0;
    initializeKernels();
    updatePanel();
    window.location.hash = qs.stringify(toqs());
  }

  //window.addEventListener('click', randomizeIt);

  window.addEventListener('resize', function () {
    dirty = true;
  });

}
