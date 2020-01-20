'use strict';

var vec2create = require('gl-vec2/create');
var vec2fromValues = require('gl-vec2/fromValues');
var vec2dot = require('gl-vec2/dot');
var mlMatrix = require('ml-matrix');
var Matrix = window.Matrix = mlMatrix.Matrix;
var SVD = mlMatrix.SVD;

module.exports = function (source, target, weight, temperature) {
  var sourceVertices = source.vertices;
  var targetVertices = target.vertices;
  var sourceVerticesLength = sourceVertices.length;

  var sourceCentroid = vec2create();
  var targetCentroid = vec2create();

  var weightsum = 0;
  for (var i2 = 0, i = 0; i2 < sourceVerticesLength; i2 += 2, i++) {
    var w = weight ? weight[i] : 1;
    weightsum += w;

    sourceCentroid[0] += sourceVertices[i2] * w;
    sourceCentroid[1] += sourceVertices[i2 + 1] * w;

    targetCentroid[0] += targetVertices[i2] * w;
    targetCentroid[1] += targetVertices[i2 + 1] * w;
  }

  sourceCentroid[0] /= weightsum;
  sourceCentroid[1] /= weightsum;
  targetCentroid[0] /= weightsum;
  targetCentroid[1] /= weightsum;

  var H00 = 0;
  var H10 = 0;
  var H01 = 0;
  var H11 = 0;

  weightsum = 0;
  for (var i2 = 0, i = 0; i2 < sourceVerticesLength; i2 += 2, i++) {
    var sourceX = sourceVertices[i2] - sourceCentroid[0];
    var sourceY = sourceVertices[i2 + 1] - sourceCentroid[1];

    var targetX = targetVertices[i2] - targetCentroid[0];
    var targetY = targetVertices[i2 + 1] - targetCentroid[1];

    var w = weight ? weight[i] : 1;
    weightsum += w;

    w *= (1.0 - temperature) + temperature * Math.random();

    H00 += sourceX * targetX * w;
    H10 += sourceY * targetX * w;

    H01 += sourceX * targetY * w;
    H11 += sourceY * targetY * w;
  }

  var H = new Matrix([[H00, H01], [H10, H11]]);

  var svd = new SVD(H);
  var Ut = svd.leftSingularVectors.transpose();
  var V = svd.rightSingularVectors;
  var R = V.mmul(Ut);

  if (R.det() < 0.0) {
    V[0][1] *= -1;
    V[1][1] *= -1;
    R = V.mmul(Ut);
  }

  var transform = new Float32Array([
    R[0][0], R[1][0], 0,
    R[0][1], R[1][1], 0,
    targetCentroid[0] - vec2dot(sourceCentroid, R[0]),
    targetCentroid[1] - vec2dot(sourceCentroid, R[1]), 1
  ]);

  return transform;
};
