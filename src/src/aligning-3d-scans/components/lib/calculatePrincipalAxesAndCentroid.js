'use strict';

var evdSymmetric = require('./evd-symmetric');
var vec3fromValues = require('gl-vec3/fromValues');
var vec3dot = require('gl-vec3/dot');
var vec3scale = require('gl-vec3/scale');
var vec3cross = require('gl-vec3/cross');
var vec3create = require('gl-vec3/create');
var vec3normalize = require('gl-vec3/normalize');

// Computes the principal axes of a mesh
//
// Arguments:
// - meshes: A mesh or array of mesh objects
//
// Returns: Object containing
//  - `matrix`: mat4 containing the principal axes of the model in the upper 3x3 submatrix
//  - `strengths`: vec3 containing the relative strength of the three alignment vectors
//  - `centroid`: geometric centroid of the mesh with respect to surface area
//  - `surfaceArea`: surface area of the mesh
// 
//
// This alignment comes from the solution of the problem
//
//     argmin_v ( Σ_i ( v * n_i )^2 )
//
//     st. |v| = 1.
//
// where v is some axis we don't yet know and n_i are the surface area vectors (i.e.
// normal vectors with magnitude equal to the area of the triangle).
//
// The rationale is that assuming some axis v, you can dot it with all the normal
// vectors, square the magnitude, and add up the terms. I assert that the 'principal'
// axis of the model is the one that minimizes the sum.
//
// Like imagine a cylinder. If the axis is oriented along the cylinder, then the dot
// product with the unit normals will be all zero (except for the end caps, but those
// will be a small contribution).
//
// The |v| = 1 constraint is required to avoid the trivial solution v = 0. It doesn't
// matter what it is; it just can't be zero.
//
// The above may be written as a Lagrange multiplier problem. More precisely:
//
//   min (f)  =  Σ_i ( v_x * n_ix + v_y * n_iy + v_z * n_iz )^2
//
//   s.t.  g  =  v_x^2  +  v_y^2  +  v_z^2  - 1  =  0
//
// Expanding, collecting terms, and breaking this down, you get:
//
//   v_x * A_xx + v_y * A_xy + v_z * A_xz = lambda * v_x
//   v_x * A_xy + v_y * A_yy + v_z * A_yz = lambda * v_y
//   v_x * A_xz + v_y * A_yz + v_z * A_zz = lambda * v_z
//   v_x * v_x + v_y * v_y + v_z * v_z - 1 = 0
//
// Where:
//   - lambda is the lagrange multiplier (enforces g = 0),
//   - A_xx = Σ_i (n_ix * n_ix)
//   - A_xy = Σ_i (n_ix * n_iy)
//   - A_xz = Σ_i (n_ix * n_iz)
//   - A_yy = Σ_i (n_iy * n_iy)
//   - A_yz = Σ_i (n_iy * n_iz)
//   - A_zz = Σ_i (n_iz * n_iz)
//
// The above is *precisely* the form of an eigenproblem, A * x = lambda * x. Plug it
// into an eigensolver and we're eigendone.
//
module.exports = function calcualtePrincipleAxesAndCentroid(meshes) {
  // Allow it to operate on one or multiple meshes
  meshes = Array.isArray(meshes) ? meshes : [meshes];

  var vertexAIndex, vertexBIndex, vertexCIndex, vertexDIndex;
  var vertexUX, vertexUY, vertexUZ;
  var vertexVX, vertexVY, vertexVZ;
  var vertexWX, vertexWY, vertexWZ;
  var vectorVUX, vectorVUY, vectorVUZ;
  var vectorWUX, vectorWUY, vectorWUZ;
  var normalX, normalY, normalZ;
  var dArea;
  
  // Surface area moments
  var AXX = 0;
  var AXY = 0;
  var AXZ = 0;
  var AYY = 0;
  var AYZ = 0;
  var AZZ = 0;

  // Set this to epsilon to avoid zero for perfectly closed surfaces
  var areaVectorX = 0;
  var areaVectorY = 0;
  var areaVectorZ = 0;

  var areaAccumulator = 0;
  var centroidAccumulatorX = 0;
  var centroidAccumulatorY = 0;
  var centroidAccumulatorZ = 0;

  for (var i = 0; i < meshes.length; i++) {
    var mesh = meshes[i];

    var faceIndexArray = mesh.faces;
    var vertexArray = mesh.vertices;
    var nbFaces = mesh.count;

    for (var j = 0; j < nbFaces; j++) {
      var faceIndex = j * 3;

      // Base index of the four vertices
      vertexAIndex = faceIndexArray[faceIndex] * 3;
      vertexBIndex = faceIndexArray[faceIndex + 1] * 3;
      vertexCIndex = faceIndexArray[faceIndex + 2] * 3;

      vertexUX = vertexArray[vertexAIndex];
      vertexUY = vertexArray[vertexAIndex + 1];
      vertexUZ = vertexArray[vertexAIndex + 2];

      vertexVX = vertexArray[vertexBIndex];
      vertexVY = vertexArray[vertexBIndex + 1];
      vertexVZ = vertexArray[vertexBIndex + 2];

      vertexWX = vertexArray[vertexCIndex];
      vertexWY = vertexArray[vertexCIndex + 1];
      vertexWZ = vertexArray[vertexCIndex + 2];

      vectorVUX = vertexVX - vertexUX;
      vectorVUY = vertexVY - vertexUY;
      vectorVUZ = vertexVZ - vertexUZ;

      vectorWUX = vertexWX - vertexUX;
      vectorWUY = vertexWY - vertexUY;
      vectorWUZ = vertexWZ - vertexUZ;

      // Compute the area vector
      normalX = 0.5 * (vectorVUY * vectorWUZ - vectorVUZ * vectorWUY);
      normalY = 0.5 * (vectorVUZ * vectorWUX - vectorVUX * vectorWUZ);
      normalZ = 0.5 * (vectorVUX * vectorWUY - vectorVUY * vectorWUX);

      // Compute the area of this triangle
      dArea = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
      areaAccumulator += dArea;

      centroidAccumulatorX += dArea * (vertexUX + vertexVX + vertexWX) / 3;
      centroidAccumulatorY += dArea * (vertexUY + vertexVY + vertexWY) / 3;
      centroidAccumulatorZ += dArea * (vertexUZ + vertexVZ + vertexWZ) / 3;

      // Accumulate the total area
      areaVectorX += normalX;
      areaVectorY += normalY;
      areaVectorZ += normalZ;

      // Accumulate moments of the surface area
      AXX += normalX * normalX;
      AXY += normalX * normalY;
      AXZ += normalX * normalZ;
      AYY += normalY * normalY;
      AYZ += normalY * normalZ;
      AZZ += normalZ * normalZ;
    }
  }

  // Total moment matrix (symmetric so only the lower triangular part is used)
  var AA = [
    [AXX,   0,   0],
    [AXY, AYY,   0],
    [AXZ, AYZ, AZZ]
  ];

  // Decompose the moment matrix into eigenvectors and eigenvalues. Symmetry guarantees the
  // orthonormality of eigenvectors. There should be no multiplicity for models that are not
  // perfectly flat.
  // var eig = [ eigenvalues, multiplicity, eigenvectors ]
  var eig = evdSymmetric(AA);
  var eigenvalues = eig[0];
  var eigenvectors = eig[2];

  // Get two of the alignment axes. The eigenvalue decomposition guarantees they're already
  // unit vectors. Ignore the third and compute it below from axisVector1 and axisVector2 in
  // order to guarantee parity.
  //
  // NOTE: There's a somewhat unexpected transpose involved here. I'd expect to be able to just
  // use the eigenvectors directly as returned, but here we are. I have *no idea* why this is the
  // case. But it works flawlessly. Not worth debugging now.
  var axisVector1 = vec3fromValues(eigenvectors[0][0], eigenvectors[1][0], eigenvectors[2][0]);
  var axisVector2 = vec3fromValues(eigenvectors[0][1], eigenvectors[1][1], eigenvectors[2][1]);

  // The eigenvectors may flip direction completely arbitrarily, so the criteria below select a
  // consistent orientation relative to the area vector. Rotating to select a nice direction for
  // typical scans is done elsewhere.
  var areaVector = vec3fromValues(areaVectorX, areaVectorY, areaVectorZ);
  if (vec3dot(areaVector, axisVector1) < 0) vec3scale(axisVector1, axisVector1, -1);
  if (vec3dot(areaVector, axisVector2) < 0) vec3scale(axisVector2, axisVector2, -1);

  // Calculate the third axis as the orthogonal vector relative to the two other axis vectors.
  // This enforces parity so that the model is rotated and not reflected and is identically
  // equal to the third eigenvector to within a sign.
  var axisVector3 = vec3cross(vec3create(), axisVector1, axisVector2);
  vec3normalize(axisVector3, axisVector3); 

  return {
    // Return the transformation matrix containing the alignment *of the model* (so aligning
    // the model to global x/y/z requires inverting the matrix before applying)
    matrix: new Float32Array([
      axisVector1[0], axisVector1[1], axisVector1[2], 0,
      axisVector2[0], axisVector2[1], axisVector2[2], 0,
      axisVector3[0], axisVector3[1], axisVector3[2], 0,
                   0,              0,              0, 1
    ]),
    strengths: [
      // Magnitudes of each eigenvectors so that you can figure out the relative
      // strength of each axis. This step is a bit arbitrary but scales and inverts
      // the numbers to make them intuitively useful.
      Math.sqrt(1.0 / eigenvalues[0]),
      Math.sqrt(1.0 / eigenvalues[1]),
      Math.sqrt(1.0 / eigenvalues[2])
    ],
    centroid: vec3fromValues(
      centroidAccumulatorX / areaAccumulator,
      centroidAccumulatorY / areaAccumulator,
      centroidAccumulatorZ / areaAccumulator
    ),
    surfaceArea: areaAccumulator
  };
};
