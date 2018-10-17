'use strict';
//var div = document.createElement('div');
//div.style.width = '2048px';
//div.style.height = '2048px';
//document.body.appendChild(div);

require('regl')({
  pixelRatio: Math.min(window.devicePixelRatio, 2.0),
  extensions: ['oes_texture_float'],
  //container: div,
  optionalExtensions: ['oes_texture_half_float'],
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

  var w = 512;
  var h = 512;

  var scales = [
    //{ activatorRadius: 600, inhibitorRadius: 1200, amount: 0.05 },
    //{ activatorRadius: 300,  inhibitorRadius: 600,  amount: 0.03 },
    { activatorRadius: 100,  inhibitorRadius: 200,  amount: 0.04 },
    { activatorRadius: 40,  inhibitorRadius: 80,  amount: 0.04 },
    { activatorRadius: 20,  inhibitorRadius: 40,  amount: 0.03 },
    { activatorRadius: 5,   inhibitorRadius: 10,  amount: 0.02 },
    { activatorRadius: 1,   inhibitorRadius: 2,   amount: 0.01 }
  ];

  var step = require('./step')(regl, scales.length);

  var y = createStates(2, w, h);
  var yFFT = createStates(2, w, h);
  var kernel = createStates(1, w, h)[0];
  var kernelFFT = createStates(scales.length, w, h);
  var scratch = createStates(2, w, h);
  var variations = createStates(scales.length, w, h);
  var maxAmount = Math.max.apply(null, scales.map(s => s.amount));

  var fft = createFFT(w, h, scratch[0].fbo, scratch[1].fbo);

  // Initialize the main state to random values
  var iteration;
  function initialize (seed) {
    iteration = 0;
    initializeState({
      output: y[0],
      seed: seed
    });
  }

  // Precompute the kernels
  for (var i = 0; i < scales.length; i++) {
    scales[i].variation = variations[i];

    initializeKernel(Object.assign({
      output: kernel
    }, scales[i]));

    fft.forward({
      input: kernel,
      output: kernelFFT[i]
    });
  }
  kernel.fbo.destroy();
  kernel.texture.destroy();

  initialize(Math.random());

  var dirty = false;
  var dt = 1.0;

  regl.frame(({tick}) => {
    //if (tick % 5 !== 1) return;
    /*
    if (iteration++ > 200) {
      if (!dirty) return;
      drawToScreen({input: y[0]});
      dirty = false;
      return;
    }
    */

    // Compute the fft of the current state
    fft.forward({
      input: y[0],
      output: yFFT[0]
    });

    for (var i = 0; i < scales.length; i++) {
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
    initialize(Math.random());
  });

  window.addEventListener('resize', function () {
    dirty = true;
  });

}
