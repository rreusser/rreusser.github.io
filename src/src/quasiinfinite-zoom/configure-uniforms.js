'use strict';

module.exports = function (regl) {
  return regl({
    uniforms: {
      globalScale: (_, {debug}) => Math.pow(2, -debug)
    }
  });
}
