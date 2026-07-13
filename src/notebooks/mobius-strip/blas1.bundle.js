// ../notes/lib/blas/base/ddot/lib/base.js
var M = 5;
function ddot(N, x, strideX, offsetX, y, strideY, offsetY) {
  var dtemp;
  var ix;
  var iy;
  var m;
  var i;
  dtemp = 0;
  if (N <= 0) {
    return dtemp;
  }
  ix = offsetX;
  iy = offsetY;
  if (strideX === 1 && strideY === 1) {
    m = N % M;
    if (m > 0) {
      for (i = 0; i < m; i++) {
        dtemp += x[ix] * y[iy];
        ix += 1;
        iy += 1;
      }
    }
    if (N < M) {
      return dtemp;
    }
    for (i = m; i < N; i += M) {
      dtemp += x[ix] * y[iy] + x[ix + 1] * y[iy + 1] + x[ix + 2] * y[iy + 2] + x[ix + 3] * y[iy + 3] + x[ix + 4] * y[iy + 4];
      ix += M;
      iy += M;
    }
    return dtemp;
  }
  for (i = 0; i < N; i++) {
    dtemp += x[ix] * y[iy];
    ix += strideX;
    iy += strideY;
  }
  return dtemp;
}
var base_default = ddot;

// ../notes/lib/blas/base/daxpy/lib/base.js
var M2 = 4;
function daxpy(N, alpha, x, strideX, offsetX, y, strideY, offsetY) {
  var ix;
  var iy;
  var m;
  var i;
  if (N <= 0) {
    return y;
  }
  if (alpha === 0) {
    return y;
  }
  ix = offsetX;
  iy = offsetY;
  if (strideX === 1 && strideY === 1) {
    m = N % M2;
    if (m > 0) {
      for (i = 0; i < m; i++) {
        y[iy] += alpha * x[ix];
        ix += 1;
        iy += 1;
      }
    }
    if (N < M2) {
      return y;
    }
    for (i = m; i < N; i += M2) {
      y[iy] += alpha * x[ix];
      y[iy + 1] += alpha * x[ix + 1];
      y[iy + 2] += alpha * x[ix + 2];
      y[iy + 3] += alpha * x[ix + 3];
      ix += M2;
      iy += M2;
    }
    return y;
  }
  for (i = 0; i < N; i++) {
    y[iy] += alpha * x[ix];
    ix += strideX;
    iy += strideY;
  }
  return y;
}
var base_default2 = daxpy;

// ../notes/lib/blas/base/dscal/lib/base.js
var M3 = 5;
function dscal(N, da, x, strideX, offsetX) {
  var ix;
  var m;
  var i;
  if (N <= 0) {
    return x;
  }
  ix = offsetX;
  if (strideX === 1) {
    m = N % M3;
    if (m > 0) {
      for (i = 0; i < m; i++) {
        x[ix] *= da;
        ix += 1;
      }
    }
    if (N < M3) {
      return x;
    }
    for (i = m; i < N; i += M3) {
      x[ix] *= da;
      x[ix + 1] *= da;
      x[ix + 2] *= da;
      x[ix + 3] *= da;
      x[ix + 4] *= da;
      ix += M3;
    }
    return x;
  }
  for (i = 0; i < N; i++) {
    x[ix] *= da;
    ix += strideX;
  }
  return x;
}
var base_default3 = dscal;

// ../notes/lib/blas/base/dnrm2/lib/base.js
var TSML = 14916681462400413e-170;
var TBIG = 1997919072202235e131;
var SSML = 44989137945431964e145;
var SBIG = 11113793747425387e-178;
var SSQ_SML = 1e-140;
var SSQ_BIG = 1e140;
function dnrm2(N, x, stride, offset) {
  var notbig;
  var sumsq;
  var abig;
  var amed;
  var asml;
  var ymin;
  var ymax;
  var scl;
  var ax;
  var ix;
  var s0;
  var s1;
  var s2;
  var s3;
  var v0;
  var v1;
  var v2;
  var v3;
  var m;
  var i;
  if (N <= 0) {
    return 0;
  }
  s0 = 0;
  s1 = 0;
  s2 = 0;
  s3 = 0;
  ix = offset;
  m = N - N % 4;
  if (stride === 1) {
    for (i = 0; i < m; i += 4) {
      v0 = x[ix];
      v1 = x[ix + 1];
      v2 = x[ix + 2];
      v3 = x[ix + 3];
      s0 += v0 * v0;
      s1 += v1 * v1;
      s2 += v2 * v2;
      s3 += v3 * v3;
      ix += 4;
    }
  } else {
    for (i = 0; i < m; i += 4) {
      v0 = x[ix];
      v1 = x[ix + stride];
      v2 = x[ix + 2 * stride];
      v3 = x[ix + 3 * stride];
      s0 += v0 * v0;
      s1 += v1 * v1;
      s2 += v2 * v2;
      s3 += v3 * v3;
      ix += 4 * stride;
    }
  }
  for (; i < N; i++) {
    v0 = x[ix];
    s0 += v0 * v0;
    ix += stride;
  }
  sumsq = s0 + s1 + (s2 + s3);
  if (sumsq > SSQ_SML && sumsq < SSQ_BIG) {
    return Math.sqrt(sumsq);
  }
  scl = 1;
  sumsq = 0;
  notbig = true;
  asml = 0;
  amed = 0;
  abig = 0;
  ix = offset;
  for (i = 0; i < N; i++) {
    ax = Math.abs(x[ix]);
    if (ax > TBIG) {
      abig += ax * SBIG * (ax * SBIG);
      notbig = false;
    } else if (ax < TSML) {
      if (notbig) {
        asml += ax * SSML * (ax * SSML);
      }
    } else {
      amed += ax * ax;
    }
    ix += stride;
  }
  if (abig > 0) {
    if (amed > 0 || amed !== amed) {
      abig += amed * SBIG * SBIG;
    }
    scl = 1 / SBIG;
    sumsq = abig;
  } else if (asml > 0) {
    if (amed > 0 || amed !== amed) {
      amed = Math.sqrt(amed);
      asml = Math.sqrt(asml) / SSML;
      if (asml > amed) {
        ymin = amed;
        ymax = asml;
      } else {
        ymin = asml;
        ymax = amed;
      }
      scl = 1;
      sumsq = ymax * ymax * (1 + ymin / ymax * (ymin / ymax));
    } else {
      scl = 1 / SSML;
      sumsq = asml;
    }
  } else {
    scl = 1;
    sumsq = amed;
  }
  return scl * Math.sqrt(sumsq);
}
var base_default4 = dnrm2;

// ../notes/lib/blas/base/dcopy/lib/base.js
var M4 = 7;
function dcopy(N, x, strideX, offsetX, y, strideY, offsetY) {
  var ix;
  var iy;
  var m;
  var i;
  if (N <= 0) {
    return y;
  }
  ix = offsetX;
  iy = offsetY;
  if (strideX === 1 && strideY === 1) {
    m = N % M4;
    if (m > 0) {
      for (i = 0; i < m; i++) {
        y[iy] = x[ix];
        ix += 1;
        iy += 1;
      }
    }
    if (N < M4) {
      return y;
    }
    for (i = m; i < N; i += M4) {
      y[iy] = x[ix];
      y[iy + 1] = x[ix + 1];
      y[iy + 2] = x[ix + 2];
      y[iy + 3] = x[ix + 3];
      y[iy + 4] = x[ix + 4];
      y[iy + 5] = x[ix + 5];
      y[iy + 6] = x[ix + 6];
      ix += M4;
      iy += M4;
    }
    return y;
  }
  for (i = 0; i < N; i++) {
    y[iy] = x[ix];
    ix += strideX;
    iy += strideY;
  }
  return y;
}
var base_default5 = dcopy;

// ../notes/blas1.bundle.js
var blas1_bundle_default = { ddot: base_default, daxpy: base_default2, dscal: base_default3, dnrm2: base_default4, dcopy: base_default5 };
export {
  blas1_bundle_default as default
};
/**
* @license MIT
*
* Copyright (c) 2026 Ricky Reusser.
*
* Derived from the BLAS 3.12.0 reference implementation (BSD-3-Clause).
* See LICENSE.txt in the repository root for the full license text and
* upstream attribution.
*/
