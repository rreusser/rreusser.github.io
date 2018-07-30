'use strict';

var assert = require('assert');
var vec3cross = require('gl-vec3/cross');
var vec3normalize = require('gl-vec3/normalize');

var DEFAULT_RESOLUTION = 30;
var SPLINE_BOUNDARY_CLOSED = 'closed';

module.exports = meshNurbsSurface;

/*
 * Compute the mesh for a spline surface
 *
 * @param meshData {object} - an object which receives vertices and faces. If arrays are not
 *     present, they will be allocated. If you provide them, they'll be written in-place, but
 *     be forwarned that it's real picky and won't accept an incorrect size.
 * @param spline {nurbs} - The `nurbs` object representing the surface to be meshed
 * @param opts {object} - Object of options:
 *     @param divisions {Number|Array} - the number of faces in both the u and v parameter dimension
 *         or an array specifying the number of faces in each dimension respectively
 *     @param quads {Boolean} - Whether to create a mesh of triangles or quads. Default is triangles.
 *     @param computeNormals {Boolean} - Whether to compute normals. Default is false
 *     @param computeUvs {Boolean} - Whether to compute uvs. Default is false
 */
function meshNurbsSurface (meshData, spline, opts) {
  var i, j, u, v, index, nbUFaces, nbVFaces, dpdu, dpdv;
  var tmp1 = [];
  var tmp2 = [];

  assert.strictEqual(spline.dimension, 3, 'Expected a spline that lives in three dimensional space but received a spline in '+spline.dimension+' dimensional space.');
  assert.strictEqual(spline.splineDimension, 2, 'Expected surface spline (2D) but received a '+spline.splineDimension+' dimensional spline');

  meshData = meshData || {};

  opts = opts || {};
  var computeNormals = !!opts.computeNormals;
  var computeUvs = !!opts.computeUvs;
  var isQuads = !!opts.quads;
  var unwrapU = !!opts.unwrapU;
  var unwrapV = !!opts.unwrapV;

  if (Array.isArray(opts.divisions)) {
    nbUFaces = opts.divisions[0];
    nbVFaces = opts.divisions[1];
  } else {
    nbUFaces = nbVFaces = opts.divisions === undefined ? DEFAULT_RESOLUTION : opts.divisions;
  }

  var uIsClosed = spline.boundary[0] === SPLINE_BOUNDARY_CLOSED && !unwrapU;
  var vIsClosed = spline.boundary[1] === SPLINE_BOUNDARY_CLOSED && !unwrapV;

  // DEV: Indexing periodic surfaces is tricky. The boundary-adjusted number of faces takes into
  // account whether the last row is equal to the first row (i.e. periodic) or not (i.e. non-periodic).
  var nbBoundaryAdjustedUFaces = nbUFaces;
  var nbBoundaryAdjustedVFaces = nbVFaces;
  if (!uIsClosed) nbBoundaryAdjustedUFaces += 1;
  if (!vIsClosed) nbBoundaryAdjustedVFaces += 1;

  var nbVertices = nbBoundaryAdjustedUFaces * nbBoundaryAdjustedVFaces;
  var vertexDataLength = nbVertices * 3;
  var vertices = meshData.vertices = meshData.vertices || new Float32Array(vertexDataLength);
  assert.strictEqual(vertices.length, vertexDataLength, 'Incorrect number of vertices in pre-allocated array');

  var divisions = nbUFaces * nbVFaces * (isQuads ? 1 : 2);
  var faceDataLength = divisions * (isQuads ? 4 : 3);
  var faces = meshData.faces = meshData.faces || new Uint32Array(faceDataLength);
  assert.strictEqual(faces.length, faceDataLength, 'Incorrect number of faces in pre-allocated array');

  var normals, uvs;
  if (computeNormals) {
    normals = meshData.normals = meshData.normals || new Float32Array(vertexDataLength);
    assert.strictEqual(normals.length, vertexDataLength, 'Incorrect number of normals in pre-allocated array');
  }

  var uvDataLength = nbVertices * 2;
  if (computeUvs) {
    uvs = meshData.uvs = meshData.uvs || new Float32Array(uvDataLength);
    assert.strictEqual(uvs.length, uvDataLength, 'Incorrect number of uvs in pre-allocated array');
  }

  if (computeNormals) {
    dpdu = spline.evaluator([1, 0]);
    dpdv = spline.evaluator([0, 1]);
  }

  var domain = spline.domain;
  var uDomain = domain[0];
  var vDomain = domain[1];

  for (i = 0; i < nbBoundaryAdjustedUFaces; i++) {
    u = uDomain[0] + (uDomain[1] - uDomain[0]) * i / nbUFaces;
    for (j = 0; j < nbBoundaryAdjustedVFaces; j++) {
      v = vDomain[0] + (vDomain[1] - vDomain[0]) * j / nbVFaces;

      index = 3 * (i + nbBoundaryAdjustedUFaces * j);

      spline.evaluate(tmp1, u, v);

      vertices[index] = tmp1[0];
      vertices[index + 1] = tmp1[1];
      vertices[index + 2] = tmp1[2];

      if (computeNormals) {
        dpdu(tmp1, u, v);
        dpdv(tmp2, u, v);
        vec3normalize(tmp1, vec3cross(tmp1, tmp1, tmp2));

        normals[index] = tmp1[0];
        normals[index + 1] = tmp1[1];
        normals[index + 2] = tmp1[2];
      }

      if (computeUvs) {
        var uvIndex = 2 * (i + nbBoundaryAdjustedUFaces * j);
        uvs[uvIndex] = u;
        uvs[uvIndex + 1] = v;
      }
    }
  }

  var faceIndex = 0;
  for (i = 0; i < nbUFaces; i++) {
    var iPlusOne = i + 1;
    if (uIsClosed) iPlusOne = iPlusOne % nbUFaces;
    for (j = 0; j < nbVFaces; j++) {
      var jPlusOne = j + 1;
      if (vIsClosed) jPlusOne = jPlusOne % nbVFaces;

      if (isQuads) {
        faces[faceIndex++] = i + nbBoundaryAdjustedUFaces * j;
        faces[faceIndex++] = iPlusOne + nbBoundaryAdjustedUFaces * j;
        faces[faceIndex++] = iPlusOne + nbBoundaryAdjustedUFaces * jPlusOne;
        faces[faceIndex++] = i + nbBoundaryAdjustedUFaces * jPlusOne;
      } else {
        faces[faceIndex++] = i + nbBoundaryAdjustedUFaces * j;
        faces[faceIndex++] = iPlusOne + nbBoundaryAdjustedUFaces * j;
        faces[faceIndex++] = iPlusOne + nbBoundaryAdjustedUFaces * jPlusOne;

        faces[faceIndex++] = i + nbBoundaryAdjustedUFaces * j;
        faces[faceIndex++] = iPlusOne + nbBoundaryAdjustedUFaces * jPlusOne;
        faces[faceIndex++] = i + nbBoundaryAdjustedUFaces * jPlusOne;
      }
    }
  }

  // DEV: This shouldn't happen, but if it does, it means this function has an internal
  // error and has produced an incorrect number of faces
  assert.strictEqual(faceIndex, faceDataLength, 'Evaluating surface produced incorrect number of faces.');

  return meshData;
};
