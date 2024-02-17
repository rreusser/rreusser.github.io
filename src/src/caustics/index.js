const createREGL = require('regl');
const { Pane } = require('./tweakpane.js');

const PARAMS = window.p = {
  frequency: 1.0,
  amplitude: 1.0,
  bloom: 2.0,
  alpha: 1,
  tonemap: 0.1,
  background: {r: 0.0, g: 0.25, b: 0.4},
};

const pane = new Pane({title: 'Parameters'});
pane.addBinding(PARAMS, 'frequency', {min: 0.5, max: 2});
pane.addBinding(PARAMS, 'amplitude', {min: 0, max: 4});
pane.addBinding(PARAMS, 'bloom', {min: 0, max: 10});
pane.addBinding(PARAMS, 'alpha', {min: 0, max: 2});
pane.addBinding(PARAMS, 'tonemap', {min: 0.0, max: 0.2});
pane.addBinding(PARAMS, 'background', {color: {type: 'float'}});

require('insert-css')(`
html, body {
  background: black;
}

body > canvas {
  z-index: -1;
}

.sketch-nav {
  right: auto !important;
  left: 0 !important;
}
`);

const regl = createREGL({
  extensions: [
    'OES_element_index_uint',
    'OES_texture_half_float',
    'OES_texture_half_float_linear',
  ],
  attributes: {
    antialias: false,
    depthStencil: false,
    alpha: false
  }
});

const n = 200;
const drawBlur = require('./draw-blur.js')(regl);
const drawMesh = require('./draw-mesh.js')(regl, n);
const transfer = require('./transfer.js')(regl);
const transferToScreen = require('./transfer-to-screen.js')(regl);

const fbo = [0, 1].map(() => regl.framebuffer({
  color: regl.texture({
    width: regl._gl.canvas.width,
    height: regl._gl.canvas.height,
    type: 'float16'
  })
}));

const downsize = 8;
const bloomFbo = [0, 1].map(() => regl.framebuffer({
  color: regl.texture({
    width: (regl._gl.canvas.width / downsize) | 0,
    height: (regl._gl.canvas.height / downsize) | 0,
    type: 'float16',
    min: 'linear',
    mag: 'linear',
  })
}));

const loop = regl.frame(() => {
  try {
    fbo.forEach(fbo => fbo.resize(regl._gl.canvas.width, regl._gl.canvas.height));
    bloomFbo.forEach(fbo => fbo.resize((regl._gl.canvas.width / downsize) | 0, (regl._gl.canvas.height / downsize) | 0));

    fbo[0].use(() => {
      regl.clear({color: [0, 0, 0, 0]});
      drawMesh({alpha: 0.5, ...PARAMS});
    });

    if (PARAMS.bloom) {
      bloomFbo[0].use(() => {
        regl.clear({color: [0, 0, 0, 0]});
        drawMesh({
          ...PARAMS,
          alpha: 0.1 * PARAMS.bloom * PARAMS.alpha,
        });
      });

      for (let i = 0; i < 2; i++) {
        bloomFbo[1].use(() => {
          regl.clear({color: [0, 0, 0, 0]});
          drawBlur({src: bloomFbo[0], direction: [1, 0]});
        });
        bloomFbo[0].use(() => {
          regl.clear({color: [0, 0, 0, 0]});
          drawBlur({src: bloomFbo[1], direction: [0, 1]});
        });
      }
    }

    fbo[1].use(() => {
      regl.clear({color: [PARAMS.background.r, PARAMS.background.g, PARAMS.background.b, 1]});
      transfer({src: fbo[0]});
      if (PARAMS.bloom) transfer({src: bloomFbo[0] });
    });

    transferToScreen({src: fbo[1], ...PARAMS})
  } catch (e) {
    console.error(e);
    loop.cancel();
  }
});
