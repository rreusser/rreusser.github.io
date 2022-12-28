module.exports = function (regl) {
  return regl({
    vert: `
      precision mediump float;
      attribute vec2 position;
      uniform vec2 aspect;
      uniform mat4 view;
      uniform float size;
      void main () {
        gl_Position = view * vec4(position, 0, 1);
        gl_PointSize = size;
      }
    `,
    frag: `
      precision mediump float;
      uniform vec3 color;
      void main () {
        if (dot(gl_PointCoord - 0.5, gl_PointCoord - 0.5) > 0.25) discard;
        gl_FragColor = vec4(color, 1);
      }
    `,
    depth: {
      enable: false,
    },
    attributes: {
      position: regl.prop('positions')
    },
    uniforms: {
      aspect: ctx => [1, ctx.framebufferWidth / ctx.framebufferHeight],
      size: (ctx, props) => props.size * ctx.pixelRatio,
      color: regl.prop('color'),
    },
    primitive: 'points',
    count: regl.prop('positionsCount')
  });

};
