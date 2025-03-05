module.exports = function draw (regl) {
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
		frag: `
			precision highp float;
			varying vec2 uv;
			uniform sampler2D src;
			void main () {
				gl_FragColor = vec4(vec3(pow(texture2D(src, uv).r, 0.454)), 1);
			}
		`,
		uniforms: {
			src: regl.prop('src'),
		},
		attributes: {
			xy: [-4, -4, 4, -4, 0, 4],
		},
		count: 3,
		depth: { enable: false }
	});
};
