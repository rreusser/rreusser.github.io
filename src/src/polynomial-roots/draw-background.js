const glsl = require('glslify');

module.exports = function (regl) {
  return regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      uniform mat4 inverseView;
      varying vec2 uv;
      void main () {
        uv = (inverseView * vec4(xy, 0, 1)).xy;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      #extension GL_OES_standard_derivatives : enable
      precision mediump float;
      #pragma glslify: grid = require(glsl-solid-wireframe/cartesian/scaled)
      varying vec2 uv;
      uniform float width;
      uniform vec2 grid1StrengthDensity;
      void main () {
        float gridFactor1 = grid1StrengthDensity.x * (1.0 - grid(uv * grid1StrengthDensity.y, width, 1.5));
        float gridFactor2 = (1.0 - grid1StrengthDensity.x) * (1.0 - grid(uv * grid1StrengthDensity.y * 10.0, width, 1.5));
        gl_FragColor = vec4(mix(
          vec3(0.93, 0.97, 1.0),
          vec3(0.8, 0.84, 0.9),
          gridFactor1 + gridFactor2
        ), 1);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      width: (ctx, props) => props.width * ctx.pixelRatio,
      grid1StrengthDensity: (ctx, props) => {
        const logViewSpan = Math.log(ctx.view3[0]) / Math.log(10);
        const logViewSpanQuant = Math.floor(logViewSpan);
        return [
          1.0 - (logViewSpan - logViewSpanQuant),
          Math.pow(10, logViewSpanQuant) * 5.0
        ];
      },
    },
    depth: {enable: false},
    count: 3
  });
};
