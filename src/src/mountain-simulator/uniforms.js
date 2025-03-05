module.exports = function setUniforms (regl) {
	return regl({
		uniforms: {
			resolution: (_, {resolution}) => [resolution, resolution],
		}
	});
};
