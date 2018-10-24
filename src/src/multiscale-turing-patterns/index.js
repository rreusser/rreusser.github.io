'use strict';

var hsl2rgb = require('float-hsl2rgb');

var pixelRatio = 1;
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
    { activatorRadius: 250, inhibitorRadius: 500, amount: 0.05 },
    { activatorRadius: 45,  inhibitorRadius: 90,  amount: 0.04, },
    { activatorRadius: 20,  inhibitorRadius: 40,  amount: -0.03, },
    { activatorRadius: 10,   inhibitorRadius: 20,  amount: 0.02, },
    { activatorRadius: 3,   inhibitorRadius: 6,  amount: 0.02, },
    { activatorRadius: 1,   inhibitorRadius: 2,   amount: 0.01, }
  ];

  function randomizeScales () {
    for (var i = 0; i < scales.length; i++) {
      var radius;
      switch(i) {
        case 0:
          scales[i].amount = 0.03 + 0.02 * Math.random();
          radius = w * (0.125 + 0.375 * Math.random());
          break;
        case 1:
          scales[i].amount = -0.02 + 0.05 * Math.random();
          radius = w * (0.125 + 0.125 * Math.random() * Math.random());
          break;
        default:
          scales[i].amount = -0.01 + 0.04 * Math.random();
          radius = Math.max(1, w * (0.125 * Math.random() * Math.random()));
          break;
      }
      scales[i].activatorRadius = radius;
      scales[i].inhibitorRadius = radius * 0.5;
    }
    maxAmount = Math.max.apply(null, scales.map(s => s.amount));
  }

  function randomizeColors () {
    var phaseShift = Math.random() * 360;
    scales[5].color = hsl2rgb([0 / 360, 1, 0.5]);
    for (var i = 0; i < scales.length; i++) {
      //var phase = ((-120 + ((1 + i * Math.floor(scales.length / 2 + 1)) % scales.length) / scales.length * 270 + 360 + (phaseShift % 360)) %  360) / 360;
      var phase = ((((2 + i * Math.floor(scales.length / 2 + 1)) % scales.length) / scales.length * 320 + 360 - 40 + (phaseShift % 360)) % 360) / 360;
      scales[i].color = hsl2rgb([phase, 0.9, 0.5 + 0.4 * Math.random()]);
    }
  }

  function scaleScales () {
    for (var i = 0; i < scales.length; i++) {
      var factor = size / 1024;
      scales[i].activatorRadius *= factor;
      scales[i].inhibitorRadius *= factor;
    }
  }

  function computeColors (scales, phaseShift) {
    scales[0].color = hsl2rgb([230 / 360, 0.7, 0.6]);
    scales[1].color = hsl2rgb([240 / 360, 0.7, 0.5]);
    scales[2].color = hsl2rgb([208 / 360, 0.8, 0.5]);
    scales[3].color = hsl2rgb([210 / 360, 0.8, 0.5]);
    scales[4].color = hsl2rgb([270 / 360, 0.7, 0.5]);
    scales[5].color = hsl2rgb([0 / 360, 1, 0.8]);
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

  scaleScales();
  computeColors(scales, 0);

  initialize(Math.random());

  var dirty = false;
  var dt = 1.0;

  regl.frame(({tick}) => {
    //if (tick % 20 !== 1) return;
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
  });

  window.addEventListener('click', function () {
    randomizeScales();
    randomizeColors();
    initialize(Math.random());
  });

  window.addEventListener('resize', function () {
    dirty = true;
  });

}
