module.exports = function (regl, mesh, opts) {
  var bufferData = {};

  if (mesh.vertices) bufferData.vertices = regl.buffer(mesh.vertices);
  if (mesh.normals) bufferData.normals = regl.buffer(mesh.normals);
  if (mesh.uvs) bufferData.uvs = regl.buffer(mesh.uvs);

  return Object.assign(bufferData, {
    count: mesh.vertices.length / 3,
  }, opts || {});
};
