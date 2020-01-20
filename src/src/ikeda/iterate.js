const glsl = require('glslify');

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 aXy;
      varying vec2 vUv;
      void main () {
        vUv = 0.5 * aXy + 0.5;
        gl_Position = vec4(aXy, 0, 1);
      }
    `,
    frag: glsl`
      precision highp float;

      #pragma glslify: ikeda = require(./ikeda)

      varying vec2 vUv;
      uniform sampler2D uSrc;
      uniform float uU;

      void main () {
        vec4 state = texture2D(uSrc, vUv);

        gl_FragColor = vec4(
          ikeda(state.xy, uU),
          ikeda(state.zw, uU)
        );
      }
    `,
    attributes: {
      aXy: [[-4, -4], [0, 4], [4, -4]]
    },
    uniforms: {
      uSrc: regl.prop('src'),
      uU: regl.prop('u'),
    },
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: 3,
  })
}
