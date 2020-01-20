'use strict';

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      uniform mat4 uViewInverse, uModelInverse;
      varying vec2 vXy;
      void main () {
        vXy = (uModelInverse * uViewInverse * vec4(xy, 0, 1)).xy;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision highp float;

      #extension GL_OES_standard_derivatives : enable

      float gridFactor (float parameter, float width, float feather) {
				float w1 = width - feather * 0.5;
				float d = fwidth(parameter);
				float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
				return smoothstep(d * w1, d * (w1 + feather), looped);
			}

      varying vec2 vXy;
      uniform float uR1, uR2, uM1, uM2, uSynodicField;
      uniform sampler2D uColormap;
      uniform float uOpacity, uContourOpacity;

      void main () {
        float y2 = vXy.y * vXy.y;
        float rad2 = dot(vXy, vXy);
				float dX1 = vXy.x - uR1;
				float dX2 = vXy.x + uR2;
        float V = -uM1 / sqrt(dX1 * dX1 + y2) + -uM2 / sqrt(dX2 * dX2 + y2) + -0.5 * rad2 * uSynodicField;

				float grid = gridFactor(V * 16.0, 1.0, 2.0);
        grid = (1.0 - grid) * smoothstep(-10.0, -0.2, V);

        float cmin = -4.0;
        float cmax = -1.0 + (1.0 - uSynodicField) * 1.5;
        vec3 color = texture2D(uColormap, vec2(
          (V - cmin) / (cmax - cmin)
         )).rgb;

        gl_FragColor = vec4(vec3(1.0 - uContourOpacity * grid) * color, uOpacity);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uOpacity: regl.prop('opacity'),
      uContourOpacity: regl.prop('contourOpacity'),
    },
    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        srcAlpha: 'src alpha',
        dstRGB: 'one minus src alpha',
        dstAlpha: 'one minus src alpha'
      },
    },
    depth: {enable: false},
    count: 3
  });
};
