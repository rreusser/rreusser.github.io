'use strict';

var nurbs = require('nurbs');
var ndarray = require('ndarray');
var qr = require('ndarray-householder-qr');
var show = require('ndarray-show');

var length = [];
var A = ndarray([], [4, 4]);
var b = ndarray([], [1]);
var d = ndarray([], [1]);

// Compute a centripetal parameterization of a spline curve
module.exports = function (points, degree, weights, knots, boundary, options) {
  var options = {};
  if (!Array.isArray(points)) {
    options = degree;
    boundary = points.boundary;
    knots = points.knots;
    weights = points.weights;
    degree = points.degree;
    points = points.points;
  }

  var i, j, k;
  var nbPoints = points.length;
  var dim = points[0].length;
  var knots = [0];

  for (i = 0; i < nbPoints; i++) {
    var sqrLen = 0.0;
    for (j = 0; j < dim; j++) {
      var dx = points[(i + 1) % nbPoints][j] - points[i][j];
      sqrLen += dx * dx;
    }
    if (options.centripetal) {
      length[i] = Math.sqrt(sqrLen);
    } else {
      length[i] = 1;
    }
    knots[i + 1] = knots[i] + length[i];
  }

  if (boundary !== 'closed') {
    knots.pop();
    for (i = 0; i < degree - 1; i++) {
      knots.unshift(knots[0]);
      knots.push(knots[knots.length - 1]);
    }
  }

  /*
  var lastKnot = knots[knots.length - 1];
  for (i = 0; i < degree - 1; i++) {
    knots.push(lastKnot + knots[i + 1] - knots[0]);
  }
  for (i = 0; i < degree - 1; i++) {
    knots.shift();
  }
  */

  var placeholderSpline = nurbs({
    size: nbPoints,
    degree: degree,
    weights: weights,
    knots: knots,
    boundary: boundary
  });

  var basis = placeholderSpline.evaluator(0, true);

  A.shape[0] = nbPoints;
  A.shape[1] = nbPoints;
  A.stride[0] = nbPoints;
  b.shape[0] = nbPoints;
  d.shape[0] = nbPoints;

  for (i = 0; i < nbPoints; i++) {
    for (j = 0; j < nbPoints; j++) {
      A.data[i + j * nbPoints] = basis(knots[j], i);
      //A.set(j, i, basis(knots[j], i));
    }
  }
  qr.factor(A, d);

  var newPoints = [];
  for (i = 0; i < nbPoints; i++) {
    newPoints[i] = [];
  }

  for (k = 0; k < dim; k++) {
    for (i = 0; i < nbPoints; i++) {
      b.set(i, points[i][k]);
    }

    qr.solve(A, d, b);

    for (i = 0; i < nbPoints; i++) {
      newPoints[i][k] = b.data[i];
    }
  }

  return {
    points: newPoints,
    degree: degree,
    boundary: boundary,
    knots: knots
  };
};
