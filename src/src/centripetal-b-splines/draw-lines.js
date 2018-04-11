const glsl = require('glslify');

module.exports = function (regl) {
  return regl({
    vert: glsl`
      #pragma glslify: linevoffset = require('screen-projected-lines')
      precision mediump float;
      uniform mat4 view;
      uniform float width, aspect;
      attribute vec2 position, nextpos;
      attribute float direction;
      void main () {
        vec4 p = view * vec4(position, 0.0, 1);
        vec4 n = view * vec4(nextpos, 0.0, 1);
        vec4 offset = linevoffset(p, n, direction, aspect);
        gl_Position = p + offset * width;
      }
    `,
    frag: `
      precision mediump float;
      uniform vec3 color;
      void main () {
        gl_FragColor = vec4(color, 1);
      }
    `,
    depth: {
      enable: false,
    },
    attributes: {
      position: regl.prop('positions'),
      nextpos: regl.prop('nextPositions'),
      direction: regl.prop('directions'),
    },
    uniforms: {
      color: regl.prop('color'),
      width: (ctx, props) => props.width / ctx.framebufferHeight * ctx.pixelRatio,
      aspect: ctx => ctx.framebufferWidth / ctx.framebufferHeight,
    },
    elements: regl.prop('cells'),
    count: regl.prop('cellCount'),
  });
};
