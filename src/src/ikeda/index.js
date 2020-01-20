const regl = require('regl');
const Controls = require('controls-state');
const GUI = require('controls-gui');
const glsl = require('glslify');
const css = require('insert-css');

css(`
@import url('https://fonts.googleapis.com/css?family=Fira+Sans+Condensed');

.sketch-nav {
  right: auto !important;
  left: 0 !important;
}

canvas {
  position: fixed !important;
}
`);

const Eqn = require('./equation')(GUI.preact);

regl({
  extensions: ['oes_texture_float'],
  optionalExtensions: ['oes_texture_half_float'],
  onDone: start,
  pixelRatio: Math.min(2.0, window.devicePixelRatio),
  attributes: {alpha: false, antialias: false}
});

function particleLUT (w, h) {
  return new Array(w * h).fill(0).map((d, i) => [
    (i % w) / Math.max(1, w - 1),
    Math.floor(i / w) / (h - 1)
  ]);
}

function start (err, regl) {
  if (err) return console.error(err);

  var dataType = 'float';
  var camera = require('./camera-2d')(regl, {
    xmin: -0.5,
    xmax: 2.0,
    ymin: -2.0,
    ymax: 1.0
  });
  window.addEventListener('resize', camera.resize);

  const supportsWritingFloat = require('./supports-float')(regl);

  if (!supportsWritingFloat) {
    if (regl.hasExtension('oes_texture_half_float')) {
      dataType = 'half float';
    } else {
      throw new Error('Sorry, can\'t write to floating point textures!');
    }
  }

  console.log('dataType:', dataType);

  const state = GUI(Controls({
    about: Controls.Raw(h => h('p', {style: 'max-width: 275px'}, `
      This sketch plots the `, h('a', {href: 'https://en.wikipedia.org/wiki/Ikeda_map'}, 'Ikeda map'), ` defined by `,
      h(Eqn, {latex: `\\displaystyle x_{n+1} = 1 +u(x_n \\cos t_n - y_n \\sin t_n),`, style: {display: 'block', textAlign: 'center'}}),
      h(Eqn, {latex: `\\displaystyle y_{n+1} = u(x_n \\sin t_n + y_n \\cos t_n),`, style: {display: 'block', textAlign: 'center'}}),
      `with parameter `, h(Eqn, {latex: 'u'}), ` and `,
      h(Eqn, {latex: `\\displaystyle t_{n} = 0.4 - \\frac{6}{1 + x_n^2 + y_n^2}.`, style: {display: 'block', textAlign: 'center'}}),
      `It's colored in an ad-hoc manner using the distance moved by the previous few iterates.`
    )),
    u: Controls.Slider(0.9, {min: 0, max: 1, step: 0.0001}),
    numPoints: Controls.Slider(400000, {min: 100, max: 4e6, step: 100}).onChange(allocate),
    alpha: Controls.Slider(0.4, {min: 0, max: 1, step: 0.01}),
    persistence: Controls.Slider(0.3, {min: 0, max: 1, step: 0.01}),
    restart: initialize,
  }), {
    containerCSS: "position:absolute; top:0; right:8px; min-width:300px; max-width:100%",
    theme: {
      fontFamily: "'Fira Sans Condensed', sans-serif",
    }
  });

  var particleTextures = [null, null];
  var particleFbos = [null, null];
  var screenFbos = [null, null]
  var lookup = null;
  var radius = null;

  function allocateDrawing () {
    screenFbos = screenFbos.map(fbo => (fbo || regl.framebuffer)({
      width: regl._gl.canvas.width,
      height: regl._gl.canvas.height,
      depthStencil: false,
      colorType: dataType,
      colorFormat: 'rgba'
    }));
  }

  window.addEventListener('resize', allocateDrawing);

  function allocate () {
    radius = Math.ceil(Math.sqrt(state.numPoints / 2));
    particleTextures = particleTextures.map(t => (t || regl.texture)({radius: radius, type: dataType}));
    particleFbos = particleFbos.map((fbo, i) => (fbo || regl.framebuffer)({depthStencil: false, color: particleTextures[i]}));
    initialize();
    lookup = (lookup || regl.buffer)(particleLUT(radius, radius));
  }

  function initialize () {
    allocateDrawing();
    if (dataType === 'float') {
      var n = radius * radius * 4;
      var randomData = new Float32Array(n);
      for (var i = 0; i < n; i++) {
        randomData[i] = (Math.random() * 2 - 1) * 0.01;
      }
      particleTextures[0].subimage(randomData);
      particleTextures[1].subimage(randomData);
    } else {
      particleFbos[0].use(drawInitialize);
      particleFbos[1].use(drawInitialize);
    }
  }

  // Initialize particle positions
  var drawInitialize = require('./initialize')(regl);

  // Iterate and update particle positions
  var drawIterate = require('./iterate')(regl);

  // Perturb particle positions to avoid collapsing to a single floating point value
  var drawPerturb = require('./perturb')(regl);

  // Draw points to a framebuffer
  var drawPoints = require('./points')(regl);

  // Transfer drawing buffer to screen
  var drawTransfer = require('./transfer')(regl);

  // Decay the accumulated colors in the drawing buffer
  var drawDecay = require('./decay')(regl);

  // Draw an xy axis
  var drawAxis = require('./axis')(regl);
  
  allocate();
  //allocateDrawing();

  var ping = 0;

  regl.frame(({tick}) => {
    camera.draw(({view}) => {
      if (tick % 100 === 0) {
        drawPerturb({
          src: particleFbos[ping % 2],
          dst: particleFbos[(ping + 1) % 2],
        });
        ping++;
      }

      drawIterate({
        src: particleFbos[ping % 2],
        dst: particleFbos[(ping + 1) % 2],
        u: state.u
      });
      ping++;

      screenFbos[tick % 2].use(() => {
        drawDecay({
          src: screenFbos[(tick + 1) % 2],
          factor: state.persistence
        });

        drawPoints({
          lookup: lookup,
          src: particleFbos[(ping + 1) % 2],
          firstPair: true,
          radius: radius,
          alpha: state.alpha,
          u: state.u,
        })

        drawPoints({
          lookup: lookup,
          src: particleFbos[(ping + 1) % 2],
          firstPair: false,
          radius: radius,
          alpha: state.alpha,
          u: state.u,
        })
      });

      drawTransfer({
        src: screenFbos[tick % 2],
        alpha: Math.pow(state.alpha / 0.3, 2)
          * (window.innerWidth / 640)
          * Math.sqrt(500000 / state.numPoints)
          / radius
          * 20.0
          / (1 / (1 - (state.persistence === 1 ? 0.99 : state.persistence)))
          * view[0],
      });

      drawAxis();
    });
  })
}
