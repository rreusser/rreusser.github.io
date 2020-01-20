module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec3 aPosition, aNormal;
      attribute vec2 aUv;
      uniform mat4 uProjectionView, uView;
      uniform vec3 uEye;
      varying vec3 vNormal, vEyeDir;
      varying vec2 vUv;

      void main () {
        vNormal = mat3(uView) * aNormal;
        vEyeDir = normalize(mat3(uView) * (aPosition - uEye));
        vUv = aUv;

        gl_Position = uProjectionView * vec4(aPosition, 1);
      }
    `,
    frag: `
      #extension GL_OES_standard_derivatives : enable
      precision highp float;

      vec2 matcap(vec3 eye, vec3 normal) {
        vec3 reflected = reflect(eye, normal);
        float m = 2.8284271247461903 * sqrt( reflected.z+1.0 );
        return reflected.xy / m + 0.5;
      }

      float gridFactor (float parameter, float width, float feather) {
        float w1 = width - feather * 0.5;
        float d = fwidth(parameter);
        float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        return smoothstep(d * w1, d * (w1 + feather), looped);
      }

      float gridFactor (vec2 parameter, float width, float feather) {
        float w1 = width - feather * 0.5;
        vec2 d = fwidth(parameter);
        vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        vec2 a2 = smoothstep(d * w1, d * (w1 + feather), looped);
        return min(a2.x, a2.y);
      }

      const vec3 DARK_BLUE = vec3(0.475, 0.588, 0.690) * 1.2;
      const vec3 LIGHT_BLUE = vec3(0.905, 0.934, 0.969) / 0.97;

      //uniform sampler2D uMatcap;
      uniform float uBorderWidth;
      uniform vec4 uBorderColor;
      varying vec3 vNormal, vEyeDir;
      varying vec2 vUv;
      void main () {
        float edgeFactor = 1.0;
        vec3 normal = normalize(vNormal);
        vec2 matcapUv = matcap(vEyeDir, normal);

        //vec3 color = texture2D(uMatcap, matcapUv).rgb;

        matcapUv -= vec2(0.2, 0.8);
        vec3 color = mix(LIGHT_BLUE, DARK_BLUE, dot(matcapUv, matcapUv) * 1.414);

        // Basic lambert lighting
        float incidence = dot(-vEyeDir, normal);

        // Darken the backfaces
        if (incidence < 0.0) color = mix(color, DARK_BLUE, 0.7) * 0.9;

        // Light the backfaces
        incidence = abs(incidence);

        //incidence /= fwidth(incidence);
        incidence /= length(vec2(dFdx(incidence), dFdy(incidence)));
        //incidence /= fwidth(incidence);
        incidence /= 2.0;

        // Cartoon-outline the edges of the model
        edgeFactor = min(edgeFactor, smoothstep(uBorderWidth, uBorderWidth + 2.0, incidence));

        // Cartoon-outline the edges in uv-space
        edgeFactor = min(edgeFactor, gridFactor((vUv.x * 0.5 + 1.0) * 0.25, uBorderWidth, 2.0));

        // UV gridlines
        // edgeFactor = min(edgeFactor, gridFactor(vUv * 4.0, uBorderWidth * 0.5, 2.0));

        // Mix everythign together
        color = mix(uBorderColor.rgb, color, 1.0 - (1.0 - edgeFactor) * uBorderColor.a);

        gl_FragColor = vec4(color, 1);
      }
    `,
    uniforms: {
      //uMatcap: assets.matcap,
      uBorderWidth: (ctx, props) => props.borderWidth * ctx.pixelRatio,
      uBorderColor: (ctx, props) => props.borderColor || [0.1, 0.2, 0.3, 1.0],
    },
    attributes: {
      aPosition: regl.prop('vertices'),
      aNormal: regl.prop('normals'),
      aUv: regl.prop('uvs'),
    },
    count: regl.prop('count'),
  });
};
