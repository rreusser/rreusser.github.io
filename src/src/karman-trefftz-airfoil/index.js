require('regl')({
  extensions: ['oes_standard_derivatives'],
  pixelRatio: Math.min(1.5, window.devicePixelRatio),
  attributes: {
    antialias: false,
    stencil: false,
    depth: false,
    alpha: false,
  },
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  var size = [61, 141];

  var camera = require('./camera-2d')(regl, {xmin: -1.7, xmax: 2.3});
  window.addEventListener('resize', camera.resize);

  var state = require('./state')();
  state.$onChanges(camera.taint);

  var mesh = require('./mesh')(
    (r, th) => [Math.pow(r, 1.5), th],
    size[0], size[1], [0, 1], [0, Math.PI * 2]
  );

  var draw = require('./draw-mesh')(regl, mesh);
  var setUniforms = require('./uniforms')(regl);

  regl.frame(({tick}) => {
    camera.draw(({dirty}) => {
      if (!dirty) return;

      setUniforms(state.tabs, () => {
        regl.clear({color: [1, 1, 1, 1], depth: 1});
        draw();
      });
    });
  });
}
