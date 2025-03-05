const glsl = require('glslify');

module.exports = function initialize (regl) {
	return regl({
		vert: `
			precision lowp float;
			attribute vec2 xy;
			varying vec2 uv;
			void main () {
				uv = 0.5 + 0.5 * xy;
				gl_Position = vec4(xy, 0, 1);
			}
		`,
		frag: glsl`
			precision highp float;
			#pragma glslify: noise = require(glsl-noise/periodic/2d)

			varying vec2 uv;
			void main () {
				float height = 0.0;

				for (int i = 1; i < 10; i++) {
					height += 0.7 / pow(float(i), 1.2) * (0.5 + 0.7 * noise((uv - cos(float(i)) * vec2(0.1208, 0.8497) * float(i)) * float(i), vec2(i)));
				}

				float vignette = 1.0;
				//float vignette = 0.6 * exp(-pow(dot(uv - 0.5, uv - 0.5) / 0.4, 2.0));
				//float vignette = sqrt(16. * (1. - uv.x) * uv.x * (1. - uv.y) * uv.y);
				//gl_FragColor = vec4(0.5 + 0.5 * cos(2.0 * uv.x * 3.14159) * cos(2.0 * 3.14159 * uv.y), 0, 0, 1);

				gl_FragColor = vec4(vignette * height, 0, 0, 1);
			}
		`,
		attributes: {
			xy: [-4, -4, 4, -4, 0, 4],
		},
		count: 3,
		depth: { enable: false }
	});
};
