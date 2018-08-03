'use strict';

var vec2transformMat3 = require('gl-vec2/transformMat3');
var vec2forEach = require('gl-vec2/forEach');

module.exports = transformPointCloud;

function transformPointCloud (pointCloud, transform) {
  vec2forEach(pointCloud.vertices, null, null, null, function (x) {
    vec2transformMat3(x, x, transform);
  });
  pointCloud.bufferStale = true;
}
