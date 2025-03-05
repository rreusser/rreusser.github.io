const glsl = require('glslify');

function iterate (regl) {
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

			uniform vec2 resolution;
			uniform sampler2D src;

			varying vec2 uv;
			void main () {
				vec2 d = 1.0 / resolution;
				float f = texture2D(src, uv).r;
				float fnw = texture2D(src, uv + vec2(-d.x, d.y)).r;
				float fn = texture2D(src, uv + vec2(0, d.y)).r;
				float fne = texture2D(src, uv + vec2(d.x, d.y)).r;
				float fw = texture2D(src, uv + vec2(-d.x, 0)).r;
				float fe = texture2D(src, uv + vec2(d.x, 0)).r;
				float fsw = texture2D(src, uv + vec2(-d.x, -d.y)).r;
				float fs = texture2D(src, uv + vec2(0, -d.y)).r;
				float fse = texture2D(src, uv + vec2(d.x, -d.y)).r;

				// Oono-Puri laplacian: https://en.wikipedia.org/wiki/Nine-point_stencil#Implementation
				float laplacian = 0.25 * (fne + fnw + fse + fsw) + 0.5 * (fn + fs + fe + fw) - 3.0 * f;

				// Sobel gradient: https://en.wikipedia.org/wiki/Sobel_operator#Formulation
				vec2 grad = vec2(
					fne + fse - fnw - fsw + 2.0 * (fe - fw),
					fne + fnw - fse - fsw + 2.0 * (fn - fs)
				);

				// Periodic noise, as a factor of position only
				float noiseFactor = 0.5 * (0.5 + 0.5 * (
					0.4 * noise(uv * 5.0, vec2(5)) +
					0.3 * noise(uv * 20.0, vec2(20)) +
					0.2 * noise(uv * 40.0, vec2(40)) +
					0.1 * noise(uv * 80.0, vec2(80))
				)) * (0.5 + 0.5 * smoothstep(0.0, 0.8, noise(uv * 8.0, vec2(8))));

				float dt = 0.5;
				gl_FragColor = vec4(vec3(
					f + dt * (0.04 * laplacian - 0.5 * pow(dot(grad, grad), 0.75) * noiseFactor)
				), 1);
			}
		`,
		attributes: {
			xy: [-4, -4, 4, -4, 0, 4],
		},
		uniforms: {
			src: regl.prop('domain.height[0]')
		},
		count: 3,
		depth: { enable: false },
		framebuffer: regl.prop('domain.height[1]'),
	});
};

module.exports = iterate;
