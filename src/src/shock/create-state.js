'use strict';

module.exports = function (regl, config) {
  return new Array(config.count).fill(0).map(() => {
    var texture = regl.texture({
      width: config.n,
      height: 1,
      type: 'float',
      min: 'linear',
      mag: 'linear',
      wrapS: 'clamp',
      wrapT: 'clamp',
    });
    return {
      texture: texture,
      fbo: regl.framebuffer({color: texture})
    };
  });
};
