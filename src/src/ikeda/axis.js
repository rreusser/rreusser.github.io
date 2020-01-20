module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 aPosition;
      uniform vec2 uInverseAspect;
      uniform mat4 view;
      void main () {
        gl_Position = view * vec4(aPosition, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      void main () {
        gl_FragColor = vec4(1);
      }
    `,
    attributes: {
      aPosition: new Float32Array([
        -100, 0,  100, 0,
        0, -100,  0, 100
      ])
    },
    uniforms: {
      uInverseAspect: ctx => [ctx.framebufferHeight / ctx.framebufferWidth, 1],
    },
    primitive: 'lines',
    count: 4,
  });
}
