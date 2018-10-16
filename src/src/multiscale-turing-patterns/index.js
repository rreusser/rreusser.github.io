'use strict';

require('regl')({
  pixelRatio: Math.min(window.devicePixelRatio, 2.0),
  extensions: ['oes_texture_float'],
  attributes: {
    antialias: false
  },
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  var convolve = require('./convolve')(regl);
  var initializeState = require('./initialize')(regl);
  var initializeKernel = require('./initialize-kernel')(regl);
  var drawToScreen = require('./draw-to-screen')(regl);
  var createStates = require('./create-state')(regl);
  var createFFT = require('./fft')(regl);
  var normalize = require('./normalize')(regl);
  var step = require('./step')(regl);

  var scales = [
    { activatorRadius: 200,  inhibitorRadius: 400,  amount: 0.03,  weight: 1 },
    { activatorRadius: 50,  inhibitorRadius: 100,  amount: 0.03,  weight: 1 },
    { activatorRadius: 10,  inhibitorRadius: 20,  amount: 0.03,  weight: 1 },
    { activatorRadius: 5,   inhibitorRadius: 10,  amount: 0.02,  weight: 1 },
    { activatorRadius: 1,   inhibitorRadius: 2,   amount: 0.01,  weight: 1 }
  ];

  var maxAmount = Math.max.apply(null, scales.map(s => s.amount));
  console.log('maxAmount:', maxAmount);

  var w = 1024;
  var h = 1024;
  var y = createStates(2, w, h);
  var yFFT = createStates(2, w, h);
  var kernel = createStates(1, w, h)[0];
  var kernelFFT = createStates(scales.length, w, h);
  var scratch = createStates(2, w, h);
  var variations = createStates(scales.length, w, h);

  var fft = createFFT(w, h, scratch[0].fbo, scratch[1].fbo);
  var iteration;

  function initialize (seed) {
    iteration = 0;
    initializeState({
      output: y[0],
      seed: seed
    });
  }

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

  initialize(0);

  var dirty = false;
  var dt = 1.0;

  regl.frame(({tick}) => {
    //if (tick % 20 !== 1) return;
    if (iteration++ > 400) {
      if (!dirty) return;
      drawToScreen({input: y[0]});
      dirty = false;
      return;
    }
    if (iteration % 100 === 1) console.log('iteration = ' + (iteration - 1));

    fft.forward({
      input: y[0],
      output: yFFT[0]
    });

    for (var i = 0; i < scales.length; i++) {
      convolve({
        input: yFFT[0],
        kernel: kernelFFT[i],
        output: yFFT[1]
      });

      fft.inverse({
        input: yFFT[1],
        output: variations[i]
      });
    }

    step({
      scales: scales,
      input: y[0],
      output: y[1],
      dt: dt,
    });

    normalize({
      input: y[1],
      output: y[0],
      dt: dt,
      maxAmount: maxAmount,
    });

    drawToScreen({input: y[0]});
  });

  window.addEventListener('click', function () {
    initialize(Math.random());
  });

  window.addEventListener('resize', function () {
    dirty = true;
  });

}
