require('insert-css')(`
html, body {
	width: 100%;
	height: 100%;
	background: #333;
}
`);

const createREGL = require('regl');
const createCamera = require('./regl-turntable-camera');
const Domain = require('./domain.js');

const regl = createREGL({
	extensions: [
		'OES_standard_derivatives',
		'ANGLE_instanced_arrays',
		'OES_element_index_uint',
		'OES_texture_float',
		'OES_texture_float_linear',
		'OES_texture_half_float',
		'OES_texture_half_float_linear',
	]
});

const camera = createCamera(regl, {
    distance: 2.5,
    center: [0.5, 0.25, 0.5],
	up: [0, 1, 0],
	theta: 1,
	phi: 0.3,
	far: 100,
});

const resolution = 1024;

const domain = new Domain({regl, resolution});
const initialize = require('./initialize.js')(regl);
const draw = require('./draw.js')(regl);
const setUniforms = require('./uniforms.js')(regl);
const iterate = require('./iterate.js')(regl);
const swap = require('./swap.js');
const gridGeometry = require('./create-draw-geometry.js')(regl, resolution);
const drawBg = require('./draw-bg.js')(regl);

const drawTerrain = require('./draw-terrain.js')(regl, resolution);

regl.poll();
domain.height[0].use(() => {
	initialize();
});

let frame = 0;
let loop = regl.frame(() => {
	try {
		setUniforms(({resolution}), () => {

			if (++frame < 5000) {
				iterate({domain});
				swap(domain.height)
				if (frame % 10 === 0) camera.taint();
			}


			camera(({dirty}) => {
				if (!dirty) return;
				regl.clear({color: [1, 1, 1, 1]});
				drawBg();

				const rng = 1;
				for (let i = -rng; i <= rng; i++) {
					for (let j = -rng; j <= rng; j++) {
						drawTerrain({
							positions: gridGeometry.positions,
							elements: gridGeometry.elements,
							nel: gridGeometry.nel,
							hf: domain.height[0],
							ambient: [0.0 + 0.08, 0.04 + 0.08, 0.12 + 0.08],
							snowLine: 0.7,
							rockiness: -0.5,
							treeLine: 0.7,
							stratification: 1.0,
							translate: [i, 0, j],
							lambertLights: [
							  {color: [0.9, 0.75, 0.7], position: [80, 100, 80]},
							  {color: [0.1, 0.21, 0.22], position: [-80, 100, -80]},
							]
						});
					}
				}
			});
		});

	} catch (e) {
		console.error(e);
		if (loop) loop.cancel();
		loop = null;
	}
});

