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
      #pragma glslify: random = require(glsl-random)
      varying vec2 vUv;
      uniform sampler2D uSrc;
      void main () {
        vec4 state = texture2D(uSrc, vUv);

        if (dot(state.xy, state.xy) > 128.0) state.xy /= 2.0;
        if (dot(state.zw, state.zw) > 128.0) state.zw /= 2.0;

        gl_FragColor = state + (vec4(
          random(gl_FragCoord.xy + 0.0),
          random(gl_FragCoord.xy + 1.0),
          random(gl_FragCoord.xy + 2.0),
          random(gl_FragCoord.xy + 3.0)
        ) * 2.0 - 1.0) * 0.0001;
      }
    `,
    attributes: {aXy: [[-4, -4], [0, 4], [4, -4]]},
    uniforms: {uSrc: regl.prop('src')},
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: 3,
  })
};
