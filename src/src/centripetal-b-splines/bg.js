const glsl = require('glslify');

module.exports = function (regl) {
  return regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      uniform mat4 viewInv;
      varying vec2 uv;
      void main () {
        uv = (viewInv * vec4(xy, 0, 1)).xy;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      #extension GL_OES_standard_derivatives : enable
      precision mediump float;
      #pragma glslify: grid = require(glsl-solid-wireframe/cartesian/scaled)
      varying vec2 uv;
      uniform float width;
      uniform float grid1Strength, grid1Density;
      void main () {
        float gridFactor1 = grid1Strength * (1.0 - grid(uv * grid1Density, width, 1.5));
        float gridFactor2 = (1.0 - grid1Strength) * (1.0 - grid(uv * grid1Density * 10.0, width, 1.5));
        gl_FragColor = vec4(mix(
          vec3(0.93, 0.97, 1.0),
          vec3(0.8, 0.84, 0.9),
          gridFactor1 + gridFactor2
        ), 1);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      viewInv: regl.prop('viewInv'),
      width: (ctx, props) => props.width * ctx.pixelRatio,
      grid1Density: regl.prop('grid1Density'),
      grid1Strength: regl.prop('grid1Strength'),
    },
    depth: {enable: false},
    count: 3
  });
};
