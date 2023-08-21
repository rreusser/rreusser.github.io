'use strict';

module.exports = function (regl) {
  return regl({
    vert: `
    precision highp float;
    attribute vec2 xy;
    uniform float globalScale;
    void main () {
      gl_Position = vec4(xy * globalScale, 0, 1);
    }`,
    frag: `
    precision lowp float;
    void main () {
      gl_FragColor = vec4(1, 0, 0, 1);
    }`,
    attributes: {
      xy: [-1, -1, 1, -1, 1, 1, -1, 1, -1, -1]
    },
    primitive: 'line strip',
    count: 5
  });
}
