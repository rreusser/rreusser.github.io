'use strict';

const mat3create = require('gl-mat3/create');
const mat3invert = require('gl-mat3/invert');
const mat4create = require('gl-mat4/create');
const mat3fromLinearScales = require('./mat3-from-linear-scales.js');
const mat4fromMat3 = require('./mat4-from-mat3.js');

module.exports = function createReglLinearScaleConfiguration(regl) {
  const matrices = {
    view3: mat3create(),
    inverseView3: mat3create(),
    view: mat4create(),
    inverseView: mat4create(),
    xDomain: [0, 0],
    yDomain: [0, 0],
    dirty: true,
  };
  const command = regl({
    context: {
      view3: regl.prop("view3"),
      inverseView3: regl.prop("inverseView3"),
      view: regl.prop("view"),
      inverseView: regl.prop("inverseView"),
      xDomain: regl.prop('xDomain'),
      yDomain: regl.prop('yDomain'),
      dirty: regl.prop('dirty'),
    },
    uniforms: {
      view3: regl.prop("view3"),
      inverseView3: regl.prop("inverseView3"),
      view: regl.prop("view"),
      inverseView: regl.prop("inverseView"),
      xDomain: regl.prop('xDomain'),
      yDomain: regl.prop('yDomain'),
    }
  });

  return function (scales, clbk) {
    mat3fromLinearScales(matrices.view3, scales);
    mat3invert(matrices.inverseView3, matrices.view3);
    mat4fromMat3(matrices.view, matrices.view3);
    mat4fromMat3(matrices.inverseView, matrices.inverseView3);
    const xd = scales.x.domain();
    const xc = 0.5 * (xd[1] + xd[0]);
    const xr = 0.5 * (xd[1] - xd[0]);
    const yd = scales.y.domain();
    const yc = 0.5 * (yd[1] + yd[0]);
    const yr = 0.5 * (yd[1] - yd[0]);
    matrices.xDomain = [xc - xr, xc + xr];
    matrices.yDomain = [yc - yr, yc + yr];
    matrices.dirty = scales.dirty;
    command(matrices, clbk);
    scales.dirty = false;
  };
}
