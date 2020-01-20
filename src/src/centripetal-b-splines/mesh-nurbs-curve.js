var assert = require('assert');
var DEFAULT_RESOLUTION = 50;

module.exports = function (mesh, spline, opts) {
  opts = opts || {};
  var i;
  var nbVertices = opts.resolution === undefined ? DEFAULT_RESOLUTION : opts.resolution;
  var dim = spline.dimension;

  mesh = mesh || {};
  mesh.positions = mesh.positions || [];
  mesh.cells = mesh.cells || [];

  assert.strictEqual(spline.splineDimension, 1, 'Expected one-dimensional spline curve to evaluate');

  var t0 = spline.domain[0][0];
  var t1 = spline.domain[0][1];

  for (i = 0; i < nbVertices; i++) {
    var t = t0 + (t1 - t0) * i / (nbVertices - 1);
    mesh.positions[i] = spline.evaluate(mesh.positions[i] || [], t);
  }

  for (i = 0; i < nbVertices - 1; i++) {
    mesh.cells[i] = [i, i + 1];
  }

  return mesh;
};
