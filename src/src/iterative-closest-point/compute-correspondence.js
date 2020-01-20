module.exports = computeCorrespondence;

function computeCorrespondence (correspondence, source, target, edgeAvoidance, temperature) {
  var targetVertices = target.vertices;
  var targetVerticesLength = target.vertices.length;
  var sourceVertices = source.vertices;
  var sourceVerticesLength = source.vertices.length;
  var vertexCount = sourceVerticesLength/ 2;

  correspondence = correspondence || new Uint16Array(vertexCount);

  var variance = new Float32Array(vertexCount);

  var varianceSum = 0;

  for (var i2 = 0, i = 0; i2 < sourceVerticesLength; i2 += 2, i++) {
    var minR2 = Infinity;
    var minIndex = -1;

    var sourceX = sourceVertices[i2];
    var sourceY = sourceVertices[i2 + 1];

    for (var j2 = 0, j = 0; j2 < targetVerticesLength; j2 += 2, j++) {
      var dx = targetVertices[j2] - sourceX;
      var dy = targetVertices[j2 + 1] - sourceY;

      var r2 = (dx * dx + dy * dy);

      if (r2 < minR2) {
        minIndex = j;
        minR2 = r2;
      }
    }

    if (minIndex >= edgeAvoidance && minIndex < vertexCount - edgeAvoidance) {
      varianceSum += minR2;
      variance[i] = minR2;
    } else {
      variance[i] = Infinity;
    }

    correspondence[i] = minIndex;
  }

  var avgVariance = varianceSum / vertexCount;

  return {
    indices: correspondence,
    avgVariance: avgVariance,
    variance: variance,
  };
}
