module.exports = function (mesh, points, options) {
  options = options || {};
  mesh = mesh || {};

  mesh.cells = mesh.cells || [];
  mesh.positions = points;

  var nCells = points.length - (options.closed ? 0 : 1);
  for (var i = 0; i < nCells; i++) {
    mesh.cells[i] = [i, (i + 1) % points.length];
  }
  mesh.cells.length = nCells;

  return mesh;
};
