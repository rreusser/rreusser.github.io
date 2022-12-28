const mat3create = require('gl-mat3/create');
const mat4create = require('gl-mat4/create');
const mat4fromMat3 = require('./mat4-from-mat3');
const mat3invert = require('gl-mat3/invert');
const mat3fromLinearScales = require('./mat3-from-linear-scales');

module.exports = function createReglLinearScaleConfiguration(regl) {
  const matrices = {
    view3: mat3create(),
    inverseView3: mat3create(),
    view: mat4create(),
    inverseView: mat4create()
  };
  const command = regl({
    context: {
      view3: regl.prop('view3'),
      inverseView3: regl.prop('inverseView3'),
      view: regl.prop('view'),
      inverseView: regl.prop('inverseView')
    },
    uniforms: {
      view3: regl.prop('view3'),
      inverseView3: regl.prop('inverseView3'),
      view: regl.prop('view'),
      inverseView: regl.prop('inverseView')
    }
  });

  return function(xScale, yScale, clbk) {
    mat3fromLinearScales(matrices.view3, xScale, yScale);
    mat3invert(matrices.inverseView3, matrices.view3);
    mat4fromMat3(matrices.view, matrices.view3);
    mat4fromMat3(matrices.inverseView, matrices.inverseView3);
    command(matrices, clbk);
  };
}
