class Domain {
	constructor({regl, resolution}={}) {
		this.regl = regl;

		this.heightTexture = [0, 1].map(() => regl.texture({
			radius: resolution,
			type: 'float',
			format: 'rgba',
			wrapS: 'repeat',
			wrapT: 'repeat',
			min: 'linear',
			mag: 'linear',
		}));

		this.height = this.heightTexture.map(color => regl.framebuffer({
			color,
			depth: false,
			stencil: false,
		}));
	}
}

module.exports = Domain;
