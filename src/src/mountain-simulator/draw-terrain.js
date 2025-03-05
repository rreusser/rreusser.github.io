const glslify = require('glslify');

module.exports = function (regl, n) {
  return regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      varying vec2 uv;
      varying vec3 n, p;
      varying float laplacian;
      varying vec2 gradient;
      uniform sampler2D ht;
      uniform vec2 h;
      uniform mat4 uProjection, uView;
	  uniform vec3 translate;

      vec3 falloff(vec3 position) {
          float r = dot(position.xz - 0.5, position.xz - 0.5) / 2.5;
          return vec3(position.x, position.y * exp(-r * r), position.z);
      }

      void main () {
        vec2 uv = 0.5 * (1.0 + xy);
        vec2 tuv = uv + translate.xz;
        p = falloff(vec3(tuv, texture2D(ht, uv).x).xzy);
        vec3 pn = falloff(vec3(tuv + vec2(0, h.y), texture2D(ht, uv + vec2(0, h.y)).x).xzy);
        vec3 ps = falloff(vec3(tuv - vec2(0, h.y), texture2D(ht, uv - vec2(0, h.y)).x).xzy);
        vec3 pe = falloff(vec3(tuv + vec2(h.x, 0), texture2D(ht, uv + vec2(h.x, 0)).x).xzy);
        vec3 pw = falloff(vec3(tuv - vec2(h.x, 0), texture2D(ht, uv - vec2(h.x, 0)).x).xzy);

        float lapScale = 4.0;
        float hx = h.x * lapScale;
        float hy = h.y * lapScale;
        float p20 = falloff(vec3(tuv, texture2D(ht, uv).x).xzy).y;
        float p2n = falloff(vec3(tuv + vec2(hx, 0), texture2D(ht, uv + vec2(hx, 0)).x).xzy).y;
        float p2s = falloff(vec3(tuv - vec2(hx, 0), texture2D(ht, uv - vec2(hx, 0)).x).xzy).y;
        float p2e = falloff(vec3(tuv + vec2(0, hy), texture2D(ht, uv + vec2(0, hy)).x).xzy).y;
        float p2w = falloff(vec3(tuv - vec2(0, hy), texture2D(ht, uv - vec2(0, hy)).x).xzy).y;
        laplacian = (p2e + p2w - 2.0 * p20) / hx / hx + (p2n + p2s - 2.0 * p20) / hy / hy;
        gradient = vec2((p2e - p2w) * 0.5 / hx, (p2n - p2s) * 0.5 / hy);

        n = normalize(cross(pn - ps, pe - pw));
        gl_Position = uProjection * uView * vec4(p, 1);
      }
    `,
    frag: glslify (`
      #extension GL_OES_standard_derivatives : enable

      precision mediump float;

      #pragma glslify: lambert = require('glsl-diffuse-lambert');
      #pragma glslify: snoise = require('glsl-noise/simplex/2d');
      #pragma glslify: snoise3 = require('glsl-noise/simplex/3d');
      #pragma glslify: fog = require('./fog.glsl');

      float grid (vec3 uv) {
        vec3 d = fwidth(uv);
        vec3 a3 = smoothstep(vec3(0.0), 1.5 * d, 0.5 - abs(mod(uv, 1.0) - 0.5));
        return a3.x;
      }

      struct Light {
        vec3 color;
        vec3 position;
      };

      uniform float stratification, snowLine, treeLine, rockiness;
      varying vec3 n, p;
      varying float laplacian;
      varying vec2 gradient;
      uniform vec3 ambient, uEye;
      uniform Light lambertLights[2];

      vec3 terrain (vec3 p, float lap, vec2 grad) {
        float noise = snoise(p.xz * 10.0);
        float noise2 = snoise(p.xz * 5.0);
        float strat = snoise3(2.0 * vec3(
			p.x * 1.5,
			(p.z - 0.4 * p.x - 0.4 * p.y) * 20.0,
			p.y * 1.5
		)) * (1.0 + 1.0 * stratification);
        float htfac = exp(-p.y / 1.4);

        float snowEdge =
          0.01 * noise +
          0.01 * noise2 +
          0.001 * laplacian * smoothstep(0.1, 0.3, p.y);

        float rockExposure =
          smoothstep(1.0, 1.1,
            (1.0 - rockiness) / length(gradient - vec2(0.0, 0.5 * p.y)) +
            snowEdge + laplacian * 0.004
          );

		float effectiveSnowLine = snowLine - laplacian * 0.002;

        float snow =
          smoothstep(effectiveSnowLine - 0.005, effectiveSnowLine + 0.005,
            p.y + snowEdge
          ) * rockExposure;

        float trees = smoothstep(treeLine, treeLine - 0.3,
          p.y -
          0.02 * noise +
          0.1 * noise2 +
          0.3 * length(grad + vec2(0.0, 1.0))
        ) * rockExposure;

        vec3 snowColor = vec3(1.0);

        vec3 treeColor = vec3(0.58, 0.65, 0.45) *
          (0.95 + 0.05 * noise) *
          (0.8 - 0.1 * atan(0.01 * laplacian));

        vec3 rockColor = vec3(0.7) *
          (0.8 - max(-0.1, min(0.2, 0.001 * laplacian)))
          * (0.97 + 0.03 * strat);

        return mix(
			mix(rockColor, treeColor, trees),
			snowColor, 
			snow
        );
      }

      void main () {
        vec3 color = terrain(p, laplacian, gradient);
		vec3 nn = normalize(n);
        color *= ambient +
          lambert(normalize(lambertLights[0].position - p), nn) * lambertLights[0].color +
          lambert(normalize(lambertLights[1].position - p), nn) * lambertLights[1].color;
        gl_FragColor = vec4(color, 1);


		float dist = length(p - uEye) - length(uEye - vec3(.5, 0, .5));
		gl_FragColor.rgb = fog(gl_FragColor.rgb, dist);
      }
    `),
    elements: regl.prop('elements'),
    attributes: {xy: regl.prop('positions')},
    uniforms: {
	  translate: regl.prop('translate'),
      ht: regl.prop('hf'),
      h: (context, props) => [
        1 / props.hf.width,
        1 / props.hf.height
      ],
      snowLine: regl.prop('snowLine'),
      rockiness: regl.prop('rockiness'),
      treeLine: regl.prop('treeLine'),
      stratification: regl.prop('stratification'),
      ambient: regl.prop('ambient'),
      'lambertLights[0].color': regl.prop('lambertLights[0].color'),
      'lambertLights[0].position': regl.prop('lambertLights[0].position'),
      'lambertLights[1].color': regl.prop('lambertLights[1].color'),
      'lambertLights[1].position': regl.prop('lambertLights[1].position'),
    },
    count: (context, props) => props.nel
  });
};
