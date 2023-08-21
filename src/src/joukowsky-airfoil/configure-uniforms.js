'use strict';

module.exports = function (regl) {
  return regl({
    uniforms: {
      circulation: (_, {smoothedCirculation, t: {field: {circulation}}}) => smoothedCirculation * 0.5 / Math.PI,
      globalScale: 1,//(_, {plot: {debug}}) => Math.pow(2, -debug),
      invert: (_, {t: {plot: {invert}}}) => invert ? -1 : 1,
      colorscale: regl.prop("colorscale"),
      ealpha: (_, {t: {field: {alpha}}}) => [Math.cos(alpha * Math.PI / 180), Math.sin(alpha * Math.PI / 180)],
      rotation: (_, {t: {field: {alpha, relativeRotation}}}) => relativeRotation ? [Math.cos(alpha * Math.PI / 180), Math.sin(-alpha * Math.PI / 180)] : [1, 0],
      joukowsky: regl.prop('t.field.joukowskyTransform'),
      kuttaCondition: regl.prop('t.field.kuttaCondition'),
      mu: (_, {t: {field: {mux, muy}}}) => [mux, muy],
      R2: (_, {t: {field: {mux, muy}}}) => (1 - mux) ** 2 + muy ** 2,
      contrast: (_, {t: {plot: {contrast}}}) => contrast / (1.0 - contrast),
    }
  });
}
