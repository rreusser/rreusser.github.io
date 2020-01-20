'use strict';

var mat4create = require('gl-mat4/create');
var pack = require('array-pack-2d');

module.exports = PointCloud;

function PointCloud (vertices, kwargs) {
  kwargs = kwargs || {};

  if (vertices instanceof PointCloud) {
    vertices = vertices.vertices;
    this.modelMatrix = vertices.modelMatrix ? new Float32Array(vertices.modelMatrix) : mat4create();
    this.pointSize = vertices.pointSize || kwargs.pointSize || 6;
    this.pointColor = vertices.pointColor || kwargs.pointColor || [0, 0, 0, 1];
  } else {
    this.modelMatrix = kwargs.modelMatrix ? new Float32Array(kwargs.modelMatrix) : mat4create();
    this.pointSize = kwargs.pointSize || 6;
    this.pointColor = kwargs.pointColor || [0, 0, 0, 1];
  }

  this._vertices = pack(vertices);
  this.bufferStale = true;
}

PointCloud.prototype = {
  set vertices (newVertices) {
    this._vertices = pack(newVertices);
    this.bufferStale = true;
  },

  get count () {
    return this._vertices.length / 2;
  },

  get vertices () {
    return this._vertices;
  },

  getBuffer: function (regl) {
    if (this.bufferStale) {
      this.buffer = (regl.buffer || this.buffer)(this._vertices);
      this.bufferStale = false;
    }
    return this.buffer;
  }
};

