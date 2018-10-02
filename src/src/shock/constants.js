'use strict';

module.exports = function (regl) {
  return regl({
    context: {
      gamma: regl.prop('gamma'),
      xmin: regl.prop('xmin'),
      xmax: regl.prop('xmax'),
      dx: (ctx, props) => (props.xmax - props.xmin) / ctx.framebufferWidth,
    }
  });
};
