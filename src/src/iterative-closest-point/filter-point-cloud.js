var PointCloud = require('./point-cloud');

module.exports = function filterPointCloud (pointCloud, indices) {
  var verticesOut = new Float32Array(indices.length * 2);
  for (var i = 0; i < indices.length; i++) {
    var index = indices[i];
    verticesOut[2 * i] = pointCloud.vertices[2 * index];
    verticesOut[2 * i + 1] = pointCloud.vertices[2 * index + 1];
  }
  return verticesOut;
};
