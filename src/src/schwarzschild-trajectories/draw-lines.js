const glsl = require('glslify');

module.exports = function (regl) {
  return regl({
    vert: glsl`
      precision mediump float;
      uniform mat4 view;
      uniform float lineWidth, aspect;
      attribute vec2 aVertex, aNextVertex, aLine;
      void main () {
        gl_Position = view * vec4(mix(aVertex, aNextVertex, aLine.y), 0, 1);
        gl_Position.xy += lineWidth * aLine.x * vec2(-1.0 / aspect, 1) * normalize(aNextVertex - aVertex).yx;
      }
    `,
    frag: `
      precision mediump float;
      uniform vec4 uColor;
      void main () {
        gl_FragColor = uColor;
      }
    `,
    depth: {enable: false},
    attributes: {
      aVertex: {buffer: regl.prop('vertices'), divisor: 1},
      aNextVertex: {buffer: regl.prop('vertices'), divisor: 1, offset: 8},
      aLine: [-1, 0, 1, 0, -1, 1, 1, 1],
    },
    uniforms: {
      uColor: regl.prop('color'),
      lineWidth: (ctx, props) => props.lineWidth / ctx.framebufferHeight * ctx.pixelRatio,
      aspect: ctx => ctx.framebufferWidth / ctx.framebufferHeight,
    },
    primitive: 'triangle strip',
    instances: (ctx, props) => props.vertices.length - 1,
    count: 4,
  });
};
