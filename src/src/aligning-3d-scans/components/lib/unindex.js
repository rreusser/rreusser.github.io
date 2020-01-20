module.exports = function unindex (model) {
  var faces = model.faces;
  var vertices = model.vertices;
  var normals = model.normals;
  var uvs = model.uvs;

  var unindexed = {
    vertices: new Float32Array(faces.length * 3),
    count: faces.length,
  };

  if (model.normals) {
    unindexed.normals = new Float32Array(faces.length * 3);
  }

  if (model.uvs) {
    unindexed.uvs = new Float32Array(faces.length * 2);
  }

  var numFaces = faces.length;
  for (var i = 0; i < numFaces; i++) {
    var index3 = faces[i] * 3;
    unindexed.vertices[i * 3] = vertices[index3];
    unindexed.vertices[i * 3 + 1] = vertices[index3 + 1];
    unindexed.vertices[i * 3 + 2] = vertices[index3 + 2];

    if (model.normals) {
      unindexed.normals[i * 3] = normals[index3];
      unindexed.normals[i * 3 + 1] = normals[index3 + 1];
      unindexed.normals[i * 3 + 2] = normals[index3 + 2];
    }

    if (model.uvs) {
      var index2 = faces[i] * 2;
      unindexed.uvs[i * 2] = uvs[index2];
      unindexed.uvs[i * 2 + 1] = uvs[index2 + 1];
    }
  }

  return unindexed;
};
