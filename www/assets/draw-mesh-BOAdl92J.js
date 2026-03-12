function t(e){return e({vert:`
      precision highp float;
      attribute vec3 aPosition, aNormal;
      attribute vec2 aUv;
      uniform mat4 projection, view;
      uniform vec3 eye;
      varying vec3 vNormal, vEyeDir;
      varying vec2 vUv;

      void main () {
        vNormal = mat3(view) * aNormal;
        vEyeDir = normalize(mat3(view) * (aPosition - eye));
        vUv = aUv;
        gl_Position = projection * view * vec4(aPosition, 1);
      }
    `,frag:`
      #extension GL_OES_standard_derivatives : enable
      precision highp float;

      vec2 matcap(vec3 eye, vec3 normal) {
        vec3 reflected = reflect(eye, normal);
        float m = 2.8284271247461903 * sqrt(reflected.z + 1.0);
        return reflected.xy / m + 0.5;
      }

      float gridFactor(float parameter, float width, float feather) {
        float w1 = width - feather * 0.5;
        float d = fwidth(parameter);
        float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        return smoothstep(d * w1, d * (w1 + feather), looped);
      }

      const vec3 DARK_BLUE = vec3(0.475, 0.588, 0.690) * 1.2;
      const vec3 LIGHT_BLUE = vec3(0.905, 0.934, 0.969) / 0.97;

      uniform float uBorderWidth;
      uniform vec4 uBorderColor;
      uniform float uDrawOpenEdges;
      varying vec3 vNormal, vEyeDir;
      varying vec2 vUv;

      void main () {
        float edgeFactor = 1.0;
        vec3 normal = normalize(vNormal);
        vec2 matcapUv = matcap(vEyeDir, normal);

        matcapUv -= vec2(0.2, 0.8);
        vec3 color = mix(LIGHT_BLUE, DARK_BLUE, dot(matcapUv, matcapUv) * 1.414);

        float incidence = dot(-vEyeDir, normal);
        if (incidence < 0.0) color = mix(color, DARK_BLUE, 0.7) * 0.9;

        incidence = abs(incidence);
        incidence /= length(vec2(dFdx(incidence), dFdy(incidence)));
        incidence /= 2.0;

        edgeFactor = min(edgeFactor, smoothstep(uBorderWidth, uBorderWidth + 2.0, incidence));

        // Use vUv.x directly for open edges (cylinders), or transformed to avoid edges
        float uvParam = uDrawOpenEdges > 0.5 ? vUv.x : (vUv.x * 0.5 + 1.0) * 0.25;
        edgeFactor = min(edgeFactor, gridFactor(uvParam, uBorderWidth, 2.0));

        color = mix(uBorderColor.rgb, color, 1.0 - (1.0 - edgeFactor) * uBorderColor.a);
        gl_FragColor = vec4(color, 1);
      }
    `,uniforms:{projection:e.context("projection"),view:e.context("view"),eye:e.context("eye"),uBorderWidth:(r,o)=>(o.borderWidth||1.5)*r.pixelRatio,uBorderColor:(r,o)=>o.borderColor||[.1,.2,.3,1],uDrawOpenEdges:(r,o)=>o.drawOpenEdges?1:0},attributes:{aPosition:e.prop("vertices"),aNormal:e.prop("normals"),aUv:e.prop("uvs")},count:e.prop("count")})}export{t as createDrawMesh};
