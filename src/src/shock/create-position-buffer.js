'use strict';

module.exports = function (regl, config) {
  var x = new Float32Array(config.n);
  for (var i = 0; i < config.n; i++) {
    x[i] = (i + 0.5) / config.n;
  }
  return regl.buffer(x);
};
