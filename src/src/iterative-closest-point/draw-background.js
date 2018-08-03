const glsl = require('glslify');

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 aUv;
      varying vec2 vXy;
      void main () {
        vXy = aUv;
        gl_Position = vec4(aUv, 0, 1);
      }
    `,
    frag: glsl`
      #extension GL_OES_standard_derivatives : enable
      precision highp float;

      varying vec2 vXy;
      uniform vec3 uEye;
      uniform float uLineWidth;
      uniform float uGrid1Strength, uGrid1Density;
      uniform mat4 uProjectionInv, uViewInv, uProjection, uView;

      float grid (vec2 parameter, float width, float feather) {
        float w1 = width - feather * 0.5;
        vec2 d = fwidth(parameter);
        vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        vec2 a2 = smoothstep(d * w1, d * (w1 + feather), looped);
        return min(a2.x, a2.y);
      }

      void main () {
        vec4 x = uViewInv * vec4((uProjectionInv * vec4(-vXy, 0.0, 1.0)).xy, -1.0, 0.0);
        vec2 xy = (uEye + x.xyz * uEye.z / x.z).xy;

        float gridFactor1 = (1.0 - grid(xy * uGrid1Density, uLineWidth, 1.5));

        gl_FragColor = vec4(mix(
          vec3(0.92, 0.94, 0.95) * 0.98,
          vec3(0.85, 0.86, 0.87) * 0.98,
          gridFactor1
        ), 1);
      }
    `,
    attributes: {aUv: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uLineWidth: (ctx, props) => props.lineWidth * ctx.pixelRatio,
      uGrid1Density: regl.prop('grid1Density'),
      uGrid1Strength: regl.prop('grid1Strength'),
    },
    depth: {enable: false},
    count: 3
  });
};
