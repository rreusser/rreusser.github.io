'use strict';

const d3 = require('d3');
const makeMesh = require('./mesh.js');

require('regl')({
  extensions: [
    'oes_standard_derivatives',
    'oes_element_index_uint',
    'ANGLE_instanced_arrays',
  ],
  pixelRatio: Math.min(2, window.devicePixelRatio),
  attributes: {
    antialias: true,
    stencil: false,
    depth: false,
    alpha: false,
  },
  onDone: require('fail-nicely')(run)
});

function lut(interpolator, n = 256) {
  return d3.quantize(interpolator, n).map(c => {
    return (c = d3.rgb(c)), [c.r, c.g, c.b, 1];
  });
}

function run (regl) {
  const size = [61, 141];

  const colorscale = regl.texture([lut(d3.interpolateViridis)]);

  const camera = require('./camera-2d.js')(regl, {xmin: -1.7, xmax: 2.3});
  window.addEventListener('resize', camera.resize);

  const state = require('./state.js')();
  state.$onChanges(camera.taint);

  const mesh = makeMesh(
    (r, th) => [Math.pow(r, 2), th],
    size[0], size[1], [0, Math.sqrt(2)], [0, Math.PI * 2]
  );

  const draw = require('./draw-mesh.js')(regl, mesh, colorscale);

  const pressureMesh = makeMesh(
    (r, th) => [r, th],
    2, 501, [0, 1], [1e-3, Math.PI * 2 - 1e-3]
  );
  const drawPressure = require('./draw-pressure.js')(regl, pressureMesh, colorscale);
  const drawArrows = require('./draw-arrow.js')(regl);

  const setUniforms = require('./uniforms.js')(regl);

  const forceVerts = regl.buffer([0, 0, 0, 0]);
  const forceDir = regl.buffer([0, 1]);
  const componentDirs = regl.buffer([0, 0, 0, 0]);

  regl.frame(({tick}) => {
    camera.draw(({dirty}) => {
      if (!dirty) return;

      setUniforms(state.tabs, () => {
        regl.clear({color: [0.17, 0.17, 0.17, 1]});
        draw();
        if (state.tabs.aerodynamics.forces) {
          drawPressure();

          const c = Math.cos(state.tabs.aerodynamics.alpha * Math.PI / 180);
          const s = Math.sin(state.tabs.aerodynamics.alpha * Math.PI / 180);
          const G = state.tabs.aerodynamics.circulation;

          componentDirs.subdata([c * s, s * s, -s * c, c * c]);

          drawArrows([{
            vertices: forceVerts,
            normals: componentDirs,
            arrowColor: [1, 1, 1, 1],
            arrowScale: state.tabs.aerodynamics.circulation * 0.5,
            arrowheadLength: 25,
            arrowheadWidth: 15,
            arrowTailWidth: 6,
            vertexCount: 2,
          }, {
            vertices: forceVerts,
            normals: forceDir,
            arrowColor: [1, 1, 1, 1],
            arrowScale: state.tabs.aerodynamics.circulation * 0.5,
            arrowheadLength: 25,
            arrowheadWidth: 25,
            arrowTailWidth: 10,
            vertexCount: 1,
          }, {
            vertices: forceVerts,
            normals: componentDirs,
            arrowColor: [0, 0, 0, 1],
            arrowScale: state.tabs.aerodynamics.circulation * 0.5,
            arrowheadLength: 25,
            arrowheadWidth: 15,
            arrowTailWidth: 6,
            vertexCount: 2,
            inset: 2,
          }, {
            vertices: forceVerts,
            normals: forceDir,
            arrowColor: [1, 0, 0, 1],
            arrowScale: state.tabs.aerodynamics.circulation * 0.5,
            arrowheadLength: 25,
            arrowheadWidth: 25,
            arrowTailWidth: 10,
            vertexCount: 1,
            inset: 3,
          }]);
        }
      });
    });
  });
}
