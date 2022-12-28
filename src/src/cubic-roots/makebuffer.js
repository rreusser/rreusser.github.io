module.exports = function makebuffer(regl, output, mesh) {
  output = output || {};
  if (mesh.positions) output.positions = (output.positions || regl.buffer)(mesh.positions);
  if (mesh.nextPositions) output.nextPositions = (output.nextPositions || regl.buffer)(mesh.nextPositions);
  if (mesh.directions) output.directions = (output.directions || regl.buffer)(mesh.directions);
  if (mesh.angles) output.angles = (output.angles || regl.buffer)(mesh.angles);
  if (mesh.cells) output.cells = (output.cells || regl.elements)(mesh.cells);
  if (mesh.cells) output.cellCount = mesh.cells.length * 3;
  if (mesh.positions) output.positionsCount = mesh.positions.length;
  return output;
}

