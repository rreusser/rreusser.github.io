'use strict';

module.exports = function (regl) {
  return regl({
    vert: `
      precision mediump float;
      attribute vec3 position;
      uniform mat4 uProjectionView;
      void main () {
        gl_Position = uProjectionView * vec4(position, 1);
      }
    `,
    frag: `
      precision mediump float;
      void main () {
        gl_FragColor = vec4(1);
      }
    `,
    attributes: {
      position: (ctx, mesh) => mesh.positions,
    },
    elements: (ctx, mesh) => mesh.cells,
    count: (ctx, mesh) => mesh.cells.length * 3,
  });
  
};
