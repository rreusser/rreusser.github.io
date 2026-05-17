var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// ../../../../../private/tmp/blapack/lib/blas/base/ddot/lib/base.js
var require_base = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/ddot/lib/base.js"(exports, module) {
    "use strict";
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
    module.exports = ddot;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/daxpy/lib/base.js
var require_base2 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/daxpy/lib/base.js"(exports, module) {
    "use strict";
    var M = 4;
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
        m = N % M;
        if (m > 0) {
          for (i = 0; i < m; i++) {
            y[iy] += alpha * x[ix];
            ix += 1;
            iy += 1;
          }
        }
        if (N < M) {
          return y;
        }
        for (i = m; i < N; i += M) {
          y[iy] += alpha * x[ix];
          y[iy + 1] += alpha * x[ix + 1];
          y[iy + 2] += alpha * x[ix + 2];
          y[iy + 3] += alpha * x[ix + 3];
          ix += M;
          iy += M;
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
    module.exports = daxpy;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dscal/lib/base.js
var require_base3 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dscal/lib/base.js"(exports, module) {
    "use strict";
    var M = 5;
    function dscal(N, da, x, strideX, offsetX) {
      var ix;
      var m;
      var i;
      if (N <= 0) {
        return x;
      }
      ix = offsetX;
      if (strideX === 1) {
        m = N % M;
        if (m > 0) {
          for (i = 0; i < m; i++) {
            x[ix] *= da;
            ix += 1;
          }
        }
        if (N < M) {
          return x;
        }
        for (i = m; i < N; i += M) {
          x[ix] *= da;
          x[ix + 1] *= da;
          x[ix + 2] *= da;
          x[ix + 3] *= da;
          x[ix + 4] *= da;
          ix += M;
        }
        return x;
      }
      for (i = 0; i < N; i++) {
        x[ix] *= da;
        ix += strideX;
      }
      return x;
    }
    module.exports = dscal;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dnrm2/lib/base.js
var require_base4 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dnrm2/lib/base.js"(exports, module) {
    "use strict";
    var TSML = 14916681462400413e-170;
    var TBIG = 1997919072202235e131;
    var SSML = 44989137945431964e145;
    var SBIG = 11113793747425387e-178;
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
      var i;
      if (N <= 0) {
        return 0;
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
    module.exports = dnrm2;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dcopy/lib/base.js
var require_base5 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dcopy/lib/base.js"(exports, module) {
    "use strict";
    var M = 7;
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
        m = N % M;
        if (m > 0) {
          for (i = 0; i < m; i++) {
            y[iy] = x[ix];
            ix += 1;
            iy += 1;
          }
        }
        if (N < M) {
          return y;
        }
        for (i = m; i < N; i += M) {
          y[iy] = x[ix];
          y[iy + 1] = x[ix + 1];
          y[iy + 2] = x[ix + 2];
          y[iy + 3] = x[ix + 3];
          y[iy + 4] = x[ix + 4];
          y[iy + 5] = x[ix + 5];
          y[iy + 6] = x[ix + 6];
          ix += M;
          iy += M;
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
    module.exports = dcopy;
  }
});

// ../../../../../private/tmp/blas1-entry.cjs
var require_blas1_entry = __commonJS({
  "../../../../../private/tmp/blas1-entry.cjs"(exports, module) {
    module.exports = {
      ddot: require_base(),
      daxpy: require_base2(),
      dscal: require_base3(),
      dnrm2: require_base4(),
      dcopy: require_base5()
    };
  }
});
export default require_blas1_entry();
