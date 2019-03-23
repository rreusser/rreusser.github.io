'use strict';

var findRoots = require('durand-kerner');

module.exports = function (mu) {
  var mu2 = mu * mu;
  var mu3 = mu * mu2;
  var mu4 = mu2 * mu2;

  var L1, L2, L3;

  // These are the coefficients for x > 1 - mu, which corresponds
  // to the L2 point (e.g. just beyond the moon)
  var L2Roots = findRoots([
    -3 * mu2 + 3 * mu - 1,
    mu4 - 2 * mu3 + mu2 - 4 * mu + 2,
    4 * mu3 - 6 * mu2 + 2 * mu - 1,
    6 * mu2 - 6 * mu + 1,
    4 * mu - 2,
    1
  ]);
  for (var i = 0; i < 5; i++) {
    if (Math.abs(L2Roots[1][i]) < 1e-8) {
      L2 = L2Roots[0][i];
    }
  }


  // These are the coefficients for x > 1 - mu, corresponding
  // to the L1 point (e.g. just in front of the moon)
  var L1Roots = findRoots([
    2 * mu3 - 3 * mu2 + 3 * mu - 1,
    mu4 - 2 * mu3 + 5 * mu2 - 4 * mu + 2,
    4 * mu3 - 6 * mu2 + 4 * mu - 1,
    6 * mu2 - 6 * mu + 1,
    4 * mu - 2,
    1
  ]);
  for (var i = 0; i < 5; i++) {
    if (Math.abs(L1Roots[1][i]) < 1e-8) {
      L1 = L1Roots[0][i];
    }
  }

  // These are the coefficients for x > 1 - mu, corresponding
  // to the L3 point (e.g. opposite the earth from the moon)
  var L3Roots = findRoots([
    3 * mu2 - 3 * mu + 1,
    mu4 - 2 * mu3 + mu2 + 4 * mu - 2,
    4 * mu3 - 6 * mu2 + 2 * mu + 1,
    6 * mu2 - 6 * mu + 1,
    4 * mu - 2,
    1
  ]);
  for (var i = 0; i < 5; i++) {
    if (Math.abs(L3Roots[1][i]) < 1e-8) {
      L3 = L3Roots[0][i];
    }
  }

  // L4 and L5 form an equilateral triangle with the two bodies in the
  // synodic (rotating) frame
  var L4x = 0.5 - mu;
  var L4y = 0.5 * Math.sqrt(3);

  var L5x = L4x;
  var L5y = -L4y;

  return new Float32Array([
    L1, 0.0,
    L2, 0.0,
    L3, 0.0,
    L4x, L4y,
    L5x, L5y
  ]);
};
