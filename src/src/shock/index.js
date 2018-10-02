'use strict';

var glsl = require('glslify');
require('regl')({
  pixelRatio: Math.min(window.devicePixelRatio, 1.5),
  extensions: [
    'angle_instanced_arrays',
    'oes_texture_float',
    'oes_texture_float_linear',
  ],
  attributes: {
    antialias: true
  },
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  var constants = {
    gamma: 1.4,
    n: 200,
    xmin: 0,
    xmax: 1,
    lineWidth: 1,
  };

  var step = require('./step')(regl);
  var setConstants = require('./constants')(regl);
  var initialize = require('./initialize')(regl);
  var drawLines = require('./draw-lines')(regl);
  var drawDensity = require('./draw-density')(regl);
  var drawPressure = require('./draw-pressure')(regl);
  var drawVelocity = require('./draw-velocity')(regl);

  var u = require('./create-state')(regl, Object.assign({count: 2}, constants));
  var x = require('./create-position-buffer')(regl, constants);

  setConstants(constants, () => {
    initialize({
      leftState: {rho: 1.0, p: 1.0, u: 0.0},
      rightState: {rho: 0.125, p: 0.1, u: 0.0},
      destination: u[0],
    });
  });

  var loop = regl.frame(({tick}) => {
    try {
      var i1 = (tick + 1) % 2;
      var i2 = (tick + 0) % 2;
      setConstants(constants, () => {
        for (var i = 0; i < 20; i++) {
          step({input: u[i1], output: u[i2]});
          step({input: u[i2], output: u[i1]});
        }

        regl.clear({color: [0.15, 0.15, 0.15, 1]});
        drawDensity(Object.assign({position: x, state: u[i1]}, constants));
        drawPressure(Object.assign({position: x, state: u[i1]}, constants));
        drawVelocity(Object.assign({position: x, state: u[i1]}, constants));
      });
    } catch (err) {
      loop.cancel();
      throw err;
    }
    if (tick === 200) {
      loop.cancel();
    }
  });

  
}
