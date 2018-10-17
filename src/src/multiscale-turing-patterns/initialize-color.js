'use strict';

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      void main () {
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      void main () {
        gl_FragColor = vec4(1);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    framebuffer: regl.prop('output.fbo'),
    depth: {enable: false},
    count: 3
  });
};
