const glsl = require('glslify');

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      void main () {
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      precision highp float;
      #pragma glslify: random = require(glsl-random)
      void main () {
        gl_FragColor = (vec4(
          random(gl_FragCoord.xy + 0.0),
          random(gl_FragCoord.xy + 1.0),
          random(gl_FragCoord.xy + 2.0),
          random(gl_FragCoord.xy + 3.0)
        ) * 2.0 - 1.0) * 0.03;
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    depth: {enable: false},
    count: 3
  });
}
