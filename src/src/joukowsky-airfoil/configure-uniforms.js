'use strict';

module.exports = function (regl) {
  return regl({
    uniforms: {
      circulation: (_, {smoothedCirculation, field: {circulation}}) => smoothedCirculation * 0.5 / Math.PI,
      globalScale: 1,//(_, {plot: {debug}}) => Math.pow(2, -debug),
      invert: (_, {plot: {invert}}) => invert ? -1 : 1,
      colorscale: regl.prop("colorscale"),
      ealpha: (_, {field: {alpha}}) => [Math.cos(alpha * Math.PI / 180), Math.sin(alpha * Math.PI / 180)],
      joukowsky: regl.prop('field.joukowskyTransform'),
      mu: (_, {field: {mux, muy}}) => [mux, muy],
      R2: (_, {field: {mux, muy}}) => (1 - mux) ** 2 + muy ** 2,
    }
  });
}
