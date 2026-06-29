var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../notes/node_modules/@stdlib/assert/has-symbol-support/lib/main.js
var require_main = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-symbol-support/lib/main.js"(exports, module) {
    "use strict";
    function hasSymbolSupport() {
      return typeof Symbol === "function" && typeof /* @__PURE__ */ Symbol("foo") === "symbol";
    }
    module.exports = hasSymbolSupport;
  }
});

// ../notes/node_modules/@stdlib/assert/has-symbol-support/lib/index.js
var require_lib = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-symbol-support/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/assert/has-tostringtag-support/lib/main.js
var require_main2 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-tostringtag-support/lib/main.js"(exports, module) {
    "use strict";
    var hasSymbols = require_lib();
    var FLG = hasSymbols();
    function hasToStringTagSupport() {
      return FLG && typeof Symbol.toStringTag === "symbol";
    }
    module.exports = hasToStringTagSupport;
  }
});

// ../notes/node_modules/@stdlib/assert/has-tostringtag-support/lib/index.js
var require_lib2 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-tostringtag-support/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main2();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/utils/native-class/lib/tostring.js
var require_tostring = __commonJS({
  "../notes/node_modules/@stdlib/utils/native-class/lib/tostring.js"(exports, module) {
    "use strict";
    var toStr = Object.prototype.toString;
    module.exports = toStr;
  }
});

// ../notes/node_modules/@stdlib/utils/native-class/lib/main.js
var require_main3 = __commonJS({
  "../notes/node_modules/@stdlib/utils/native-class/lib/main.js"(exports, module) {
    "use strict";
    var toStr = require_tostring();
    function nativeClass(v) {
      return toStr.call(v);
    }
    module.exports = nativeClass;
  }
});

// ../notes/node_modules/@stdlib/assert/has-own-property/lib/main.js
var require_main4 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-own-property/lib/main.js"(exports, module) {
    "use strict";
    var has = Object.prototype.hasOwnProperty;
    function hasOwnProp(value, property) {
      if (value === void 0 || value === null) {
        return false;
      }
      return has.call(value, property);
    }
    module.exports = hasOwnProp;
  }
});

// ../notes/node_modules/@stdlib/assert/has-own-property/lib/index.js
var require_lib3 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-own-property/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main4();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/symbol/ctor/lib/main.js
var require_main5 = __commonJS({
  "../notes/node_modules/@stdlib/symbol/ctor/lib/main.js"(exports, module) {
    "use strict";
    var Sym = typeof Symbol === "function" ? Symbol : void 0;
    module.exports = Sym;
  }
});

// ../notes/node_modules/@stdlib/symbol/ctor/lib/index.js
var require_lib4 = __commonJS({
  "../notes/node_modules/@stdlib/symbol/ctor/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main5();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/utils/native-class/lib/tostringtag.js
var require_tostringtag = __commonJS({
  "../notes/node_modules/@stdlib/utils/native-class/lib/tostringtag.js"(exports, module) {
    "use strict";
    var Symbol2 = require_lib4();
    var toStrTag = typeof Symbol2 === "function" ? Symbol2.toStringTag : "";
    module.exports = toStrTag;
  }
});

// ../notes/node_modules/@stdlib/utils/native-class/lib/polyfill.js
var require_polyfill = __commonJS({
  "../notes/node_modules/@stdlib/utils/native-class/lib/polyfill.js"(exports, module) {
    "use strict";
    var hasOwnProp = require_lib3();
    var toStringTag = require_tostringtag();
    var toStr = require_tostring();
    function nativeClass(v) {
      var isOwn;
      var tag;
      var out;
      if (v === null || v === void 0) {
        return toStr.call(v);
      }
      tag = v[toStringTag];
      isOwn = hasOwnProp(v, toStringTag);
      try {
        v[toStringTag] = void 0;
      } catch (err) {
        return toStr.call(v);
      }
      out = toStr.call(v);
      if (isOwn) {
        v[toStringTag] = tag;
      } else {
        delete v[toStringTag];
      }
      return out;
    }
    module.exports = nativeClass;
  }
});

// ../notes/node_modules/@stdlib/utils/native-class/lib/index.js
var require_lib5 = __commonJS({
  "../notes/node_modules/@stdlib/utils/native-class/lib/index.js"(exports, module) {
    "use strict";
    var hasToStringTag = require_lib2();
    var builtin = require_main3();
    var polyfill = require_polyfill();
    var main;
    if (hasToStringTag()) {
      main = polyfill;
    } else {
      main = builtin;
    }
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/assert/is-float64array/lib/main.js
var require_main6 = __commonJS({
  "../notes/node_modules/@stdlib/assert/is-float64array/lib/main.js"(exports, module) {
    "use strict";
    var nativeClass = require_lib5();
    var hasFloat64Array = typeof Float64Array === "function";
    function isFloat64Array(value) {
      return hasFloat64Array && value instanceof Float64Array || // eslint-disable-line stdlib/require-globals
      nativeClass(value) === "[object Float64Array]";
    }
    module.exports = isFloat64Array;
  }
});

// ../notes/node_modules/@stdlib/assert/is-float64array/lib/index.js
var require_lib6 = __commonJS({
  "../notes/node_modules/@stdlib/assert/is-float64array/lib/index.js"(exports, module) {
    "use strict";
    var isFloat64Array = require_main6();
    module.exports = isFloat64Array;
  }
});

// ../notes/node_modules/@stdlib/assert/has-float64array-support/lib/float64array.js
var require_float64array = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-float64array-support/lib/float64array.js"(exports, module) {
    "use strict";
    var main = typeof Float64Array === "function" ? Float64Array : null;
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/assert/has-float64array-support/lib/main.js
var require_main7 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-float64array-support/lib/main.js"(exports, module) {
    "use strict";
    var isFloat64Array = require_lib6();
    var GlobalFloat64Array = require_float64array();
    function hasFloat64ArraySupport() {
      var bool;
      var arr;
      if (typeof GlobalFloat64Array !== "function") {
        return false;
      }
      try {
        arr = new GlobalFloat64Array([1, 3.14, -3.14, NaN]);
        bool = isFloat64Array(arr) && arr[0] === 1 && arr[1] === 3.14 && arr[2] === -3.14 && arr[3] !== arr[3];
      } catch (err) {
        bool = false;
      }
      return bool;
    }
    module.exports = hasFloat64ArraySupport;
  }
});

// ../notes/node_modules/@stdlib/assert/has-float64array-support/lib/index.js
var require_lib7 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-float64array-support/lib/index.js"(exports, module) {
    "use strict";
    var hasFloat64ArraySupport = require_main7();
    module.exports = hasFloat64ArraySupport;
  }
});

// ../notes/node_modules/@stdlib/array/float64/lib/main.js
var require_main8 = __commonJS({
  "../notes/node_modules/@stdlib/array/float64/lib/main.js"(exports, module) {
    "use strict";
    var ctor = typeof Float64Array === "function" ? Float64Array : void 0;
    module.exports = ctor;
  }
});

// ../notes/node_modules/@stdlib/array/float64/lib/polyfill.js
var require_polyfill2 = __commonJS({
  "../notes/node_modules/@stdlib/array/float64/lib/polyfill.js"(exports, module) {
    "use strict";
    function polyfill() {
      throw new Error("not implemented");
    }
    module.exports = polyfill;
  }
});

// ../notes/node_modules/@stdlib/array/float64/lib/index.js
var require_lib8 = __commonJS({
  "../notes/node_modules/@stdlib/array/float64/lib/index.js"(exports, module) {
    "use strict";
    var hasFloat64ArraySupport = require_lib7();
    var builtin = require_main8();
    var polyfill = require_polyfill2();
    var ctor;
    if (hasFloat64ArraySupport()) {
      ctor = builtin;
    } else {
      ctor = polyfill;
    }
    module.exports = ctor;
  }
});

// ../notes/lib/lapack/base/dpbtrf/lib/base.js
var import_lib = __toESM(require_lib8(), 1);

// ../notes/lib/blas/base/dscal/lib/base.js
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
var base_default = dscal;

// ../notes/lib/blas/base/dsyr/lib/base.js
function dsyr(uplo, N, alpha, x, strideX, offsetX, A, strideA1, strideA2, offsetA) {
  var temp;
  var sa1;
  var sa2;
  var ix;
  var jx;
  var i;
  var j;
  if (N === 0 || alpha === 0) {
    return A;
  }
  sa1 = strideA1;
  sa2 = strideA2;
  if (uplo === "upper") {
    jx = offsetX;
    for (j = 0; j < N; j++) {
      if (x[jx] !== 0) {
        temp = alpha * x[jx];
        ix = offsetX;
        for (i = 0; i <= j; i++) {
          A[offsetA + i * sa1 + j * sa2] += x[ix] * temp;
          ix += strideX;
        }
      }
      jx += strideX;
    }
  } else {
    jx = offsetX;
    for (j = 0; j < N; j++) {
      if (x[jx] !== 0) {
        temp = alpha * x[jx];
        ix = jx;
        for (i = j; i < N; i++) {
          A[offsetA + i * sa1 + j * sa2] += x[ix] * temp;
          ix += strideX;
        }
      }
      jx += strideX;
    }
  }
  return A;
}
var base_default2 = dsyr;

// ../notes/lib/lapack/base/dpbtf2/lib/base.js
function dpbtf2(uplo, N, kd, AB, strideAB1, strideAB2, offsetAB) {
  var sa1;
  var sa2;
  var kld;
  var ajj;
  var kn;
  var j;
  if (N === 0) {
    return 0;
  }
  sa1 = strideAB1;
  sa2 = strideAB2;
  kld = Math.max(1, sa2 - sa1);
  if (uplo === "upper") {
    for (j = 0; j < N; j++) {
      ajj = AB[offsetAB + kd * sa1 + j * sa2];
      if (ajj <= 0) {
        AB[offsetAB + kd * sa1 + j * sa2] = ajj;
        return j + 1;
      }
      ajj = Math.sqrt(ajj);
      AB[offsetAB + kd * sa1 + j * sa2] = ajj;
      kn = Math.min(kd, N - j - 1);
      if (kn > 0) {
        base_default(kn, 1 / ajj, AB, kld, offsetAB + (kd - 1) * sa1 + (j + 1) * sa2);
        base_default2("upper", kn, -1, AB, kld, offsetAB + (kd - 1) * sa1 + (j + 1) * sa2, AB, sa1, kld, offsetAB + kd * sa1 + (j + 1) * sa2);
      }
    }
  } else {
    for (j = 0; j < N; j++) {
      ajj = AB[offsetAB + j * sa2];
      if (ajj <= 0) {
        AB[offsetAB + j * sa2] = ajj;
        return j + 1;
      }
      ajj = Math.sqrt(ajj);
      AB[offsetAB + j * sa2] = ajj;
      kn = Math.min(kd, N - j - 1);
      if (kn > 0) {
        base_default(kn, 1 / ajj, AB, sa1, offsetAB + sa1 + j * sa2);
        base_default2("lower", kn, -1, AB, sa1, offsetAB + sa1 + j * sa2, AB, sa1, kld, offsetAB + (j + 1) * sa2);
      }
    }
  }
  return 0;
}
var base_default3 = dpbtf2;

// ../notes/lib/blas/base/ddot/lib/base.js
var M2 = 5;
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
    m = N % M2;
    if (m > 0) {
      for (i = 0; i < m; i++) {
        dtemp += x[ix] * y[iy];
        ix += 1;
        iy += 1;
      }
    }
    if (N < M2) {
      return dtemp;
    }
    for (i = m; i < N; i += M2) {
      dtemp += x[ix] * y[iy] + x[ix + 1] * y[iy + 1] + x[ix + 2] * y[iy + 2] + x[ix + 3] * y[iy + 3] + x[ix + 4] * y[iy + 4];
      ix += M2;
      iy += M2;
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
var base_default4 = ddot;

// ../notes/lib/blas/base/dgemv/lib/base.js
function dgemv(trans, M3, N, alpha, A, strideA1, strideA2, offsetA, x, strideX, offsetX, beta, y, strideY, offsetY) {
  var noTrans;
  var temp;
  var leny;
  var sa1;
  var sa2;
  var ia;
  var ix;
  var iy;
  var jx;
  var jy;
  var i;
  var j;
  noTrans = trans === "no-transpose";
  if (M3 === 0 || N === 0 || alpha === 0 && beta === 1) {
    return y;
  }
  sa1 = strideA1;
  sa2 = strideA2;
  if (noTrans) {
    leny = M3;
  } else {
    leny = N;
  }
  if (beta !== 1) {
    iy = offsetY;
    if (beta === 0) {
      for (i = 0; i < leny; i++) {
        y[iy] = 0;
        iy += strideY;
      }
    } else {
      for (i = 0; i < leny; i++) {
        y[iy] *= beta;
        iy += strideY;
      }
    }
  }
  if (alpha === 0) {
    return y;
  }
  if (noTrans) {
    jx = offsetX;
    for (j = 0; j < N; j++) {
      temp = alpha * x[jx];
      iy = offsetY;
      ia = offsetA + j * sa2;
      for (i = 0; i < M3; i++) {
        y[iy] += temp * A[ia];
        iy += strideY;
        ia += sa1;
      }
      jx += strideX;
    }
  } else {
    jy = offsetY;
    for (j = 0; j < N; j++) {
      temp = 0;
      ix = offsetX;
      ia = offsetA + j * sa2;
      for (i = 0; i < M3; i++) {
        temp += A[ia] * x[ix];
        ix += strideX;
        ia += sa1;
      }
      y[jy] += alpha * temp;
      jy += strideY;
    }
  }
  return y;
}
var base_default5 = dgemv;

// ../notes/lib/lapack/base/dpotf2/lib/base.js
function dpotf2(uplo, N, A, strideA1, strideA2, offsetA) {
  var ajj;
  var sa1;
  var sa2;
  var j;
  sa1 = strideA1;
  sa2 = strideA2;
  if (N === 0) {
    return 0;
  }
  if (uplo === "upper") {
    for (j = 0; j < N; j++) {
      ajj = A[offsetA + j * sa1 + j * sa2] - base_default4(j, A, sa1, offsetA + j * sa2, A, sa1, offsetA + j * sa2);
      if (ajj <= 0 || ajj !== ajj) {
        A[offsetA + j * sa1 + j * sa2] = ajj;
        return j + 1;
      }
      ajj = Math.sqrt(ajj);
      A[offsetA + j * sa1 + j * sa2] = ajj;
      if (j < N - 1) {
        base_default5("transpose", j, N - j - 1, -1, A, sa1, sa2, offsetA + (j + 1) * sa2, A, sa1, offsetA + j * sa2, 1, A, sa2, offsetA + j * sa1 + (j + 1) * sa2);
        base_default(N - j - 1, 1 / ajj, A, sa2, offsetA + j * sa1 + (j + 1) * sa2);
      }
    }
  } else {
    for (j = 0; j < N; j++) {
      ajj = A[offsetA + j * sa1 + j * sa2] - base_default4(j, A, sa2, offsetA + j * sa1, A, sa2, offsetA + j * sa1);
      if (ajj <= 0 || ajj !== ajj) {
        A[offsetA + j * sa1 + j * sa2] = ajj;
        return j + 1;
      }
      ajj = Math.sqrt(ajj);
      A[offsetA + j * sa1 + j * sa2] = ajj;
      if (j < N - 1) {
        base_default5("no-transpose", N - j - 1, j, -1, A, sa1, sa2, offsetA + (j + 1) * sa1, A, sa2, offsetA + j * sa1, 1, A, sa1, offsetA + (j + 1) * sa1 + j * sa2);
        base_default(N - j - 1, 1 / ajj, A, sa1, offsetA + (j + 1) * sa1 + j * sa2);
      }
    }
  }
  return 0;
}
var base_default6 = dpotf2;

// ../notes/lib/blas/base/dtrsm/lib/base.js
function dtrsm(side, uplo, transa, diag, M3, N, alpha, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB) {
  var nounit;
  var lside;
  var upper;
  var temp;
  var sa1;
  var sa2;
  var sb1;
  var sb2;
  var ia;
  var ib;
  var i;
  var j;
  var k;
  lside = side === "left";
  nounit = diag === "non-unit";
  upper = uplo === "upper";
  if (M3 === 0 || N === 0) {
    return B;
  }
  sa1 = strideA1;
  sa2 = strideA2;
  sb1 = strideB1;
  sb2 = strideB2;
  if (alpha === 0) {
    for (j = 0; j < N; j++) {
      ib = offsetB + j * sb2;
      for (i = 0; i < M3; i++) {
        B[ib] = 0;
        ib += sb1;
      }
    }
    return B;
  }
  if (lside) {
    if (transa === "no-transpose") {
      if (upper) {
        for (j = 0; j < N; j++) {
          if (alpha !== 1) {
            ib = offsetB + j * sb2;
            for (i = 0; i < M3; i++) {
              B[ib] *= alpha;
              ib += sb1;
            }
          }
          for (k = M3 - 1; k >= 0; k--) {
            ib = offsetB + k * sb1 + j * sb2;
            if (B[ib] !== 0) {
              if (nounit) {
                B[ib] /= A[offsetA + k * sa1 + k * sa2];
              }
              ia = offsetA + k * sa2;
              for (i = 0; i < k; i++) {
                B[offsetB + i * sb1 + j * sb2] -= B[ib] * A[ia];
                ia += sa1;
              }
            }
          }
        }
      } else {
        for (j = 0; j < N; j++) {
          if (alpha !== 1) {
            ib = offsetB + j * sb2;
            for (i = 0; i < M3; i++) {
              B[ib] *= alpha;
              ib += sb1;
            }
          }
          for (k = 0; k < M3; k++) {
            ib = offsetB + k * sb1 + j * sb2;
            if (B[ib] !== 0) {
              if (nounit) {
                B[ib] /= A[offsetA + k * sa1 + k * sa2];
              }
              for (i = k + 1; i < M3; i++) {
                B[offsetB + i * sb1 + j * sb2] -= B[ib] * A[offsetA + i * sa1 + k * sa2];
              }
            }
          }
        }
      }
    } else if (upper) {
      for (j = 0; j < N; j++) {
        for (i = 0; i < M3; i++) {
          temp = alpha * B[offsetB + i * sb1 + j * sb2];
          ia = offsetA + i * sa2;
          for (k = 0; k < i; k++) {
            temp -= A[ia] * B[offsetB + k * sb1 + j * sb2];
            ia += sa1;
          }
          if (nounit) {
            temp /= A[offsetA + i * sa1 + i * sa2];
          }
          B[offsetB + i * sb1 + j * sb2] = temp;
        }
      }
    } else {
      for (j = 0; j < N; j++) {
        for (i = M3 - 1; i >= 0; i--) {
          temp = alpha * B[offsetB + i * sb1 + j * sb2];
          for (k = i + 1; k < M3; k++) {
            temp -= A[offsetA + k * sa1 + i * sa2] * B[offsetB + k * sb1 + j * sb2];
          }
          if (nounit) {
            temp /= A[offsetA + i * sa1 + i * sa2];
          }
          B[offsetB + i * sb1 + j * sb2] = temp;
        }
      }
    }
  } else if (transa === "no-transpose") {
    if (upper) {
      for (j = 0; j < N; j++) {
        if (alpha !== 1) {
          ib = offsetB + j * sb2;
          for (i = 0; i < M3; i++) {
            B[ib] *= alpha;
            ib += sb1;
          }
        }
        for (k = 0; k < j; k++) {
          if (A[offsetA + k * sa1 + j * sa2] !== 0) {
            for (i = 0; i < M3; i++) {
              B[offsetB + i * sb1 + j * sb2] -= A[offsetA + k * sa1 + j * sa2] * B[offsetB + i * sb1 + k * sb2];
            }
          }
        }
        if (nounit) {
          temp = 1 / A[offsetA + j * sa1 + j * sa2];
          ib = offsetB + j * sb2;
          for (i = 0; i < M3; i++) {
            B[ib] *= temp;
            ib += sb1;
          }
        }
      }
    } else {
      for (j = N - 1; j >= 0; j--) {
        if (alpha !== 1) {
          ib = offsetB + j * sb2;
          for (i = 0; i < M3; i++) {
            B[ib] *= alpha;
            ib += sb1;
          }
        }
        for (k = j + 1; k < N; k++) {
          if (A[offsetA + k * sa1 + j * sa2] !== 0) {
            for (i = 0; i < M3; i++) {
              B[offsetB + i * sb1 + j * sb2] -= A[offsetA + k * sa1 + j * sa2] * B[offsetB + i * sb1 + k * sb2];
            }
          }
        }
        if (nounit) {
          temp = 1 / A[offsetA + j * sa1 + j * sa2];
          ib = offsetB + j * sb2;
          for (i = 0; i < M3; i++) {
            B[ib] *= temp;
            ib += sb1;
          }
        }
      }
    }
  } else if (upper) {
    for (k = N - 1; k >= 0; k--) {
      if (nounit) {
        temp = 1 / A[offsetA + k * sa1 + k * sa2];
        ib = offsetB + k * sb2;
        for (i = 0; i < M3; i++) {
          B[ib] *= temp;
          ib += sb1;
        }
      }
      for (j = 0; j < k; j++) {
        if (A[offsetA + j * sa1 + k * sa2] !== 0) {
          temp = A[offsetA + j * sa1 + k * sa2];
          for (i = 0; i < M3; i++) {
            B[offsetB + i * sb1 + j * sb2] -= temp * B[offsetB + i * sb1 + k * sb2];
          }
        }
      }
      if (alpha !== 1) {
        ib = offsetB + k * sb2;
        for (i = 0; i < M3; i++) {
          B[ib] *= alpha;
          ib += sb1;
        }
      }
    }
  } else {
    for (k = 0; k < N; k++) {
      if (nounit) {
        temp = 1 / A[offsetA + k * sa1 + k * sa2];
        ib = offsetB + k * sb2;
        for (i = 0; i < M3; i++) {
          B[ib] *= temp;
          ib += sb1;
        }
      }
      for (j = k + 1; j < N; j++) {
        if (A[offsetA + j * sa1 + k * sa2] !== 0) {
          temp = A[offsetA + j * sa1 + k * sa2];
          for (i = 0; i < M3; i++) {
            B[offsetB + i * sb1 + j * sb2] -= temp * B[offsetB + i * sb1 + k * sb2];
          }
        }
      }
      if (alpha !== 1) {
        ib = offsetB + k * sb2;
        for (i = 0; i < M3; i++) {
          B[ib] *= alpha;
          ib += sb1;
        }
      }
    }
  }
  return B;
}
var base_default7 = dtrsm;

// ../notes/lib/blas/base/dsyrk/lib/base.js
function dsyrk(uplo, trans, N, K, alpha, A, strideA1, strideA2, offsetA, beta, C, strideC1, strideC2, offsetC) {
  var upper;
  var nota;
  var temp;
  var sa1;
  var sa2;
  var sc1;
  var sc2;
  var ic;
  var ia;
  var i;
  var j;
  var l;
  upper = uplo === "upper";
  nota = trans === "no-transpose";
  if (N === 0 || (alpha === 0 || K === 0) && beta === 1) {
    return C;
  }
  sa1 = strideA1;
  sa2 = strideA2;
  sc1 = strideC1;
  sc2 = strideC2;
  if (alpha === 0) {
    if (upper) {
      if (beta === 0) {
        for (j = 0; j < N; j++) {
          ic = offsetC + j * sc2;
          for (i = 0; i <= j; i++) {
            C[ic] = 0;
            ic += sc1;
          }
        }
      } else {
        for (j = 0; j < N; j++) {
          ic = offsetC + j * sc2;
          for (i = 0; i <= j; i++) {
            C[ic] *= beta;
            ic += sc1;
          }
        }
      }
    } else if (beta === 0) {
      for (j = 0; j < N; j++) {
        ic = offsetC + j * sc1 + j * sc2;
        for (i = j; i < N; i++) {
          C[ic] = 0;
          ic += sc1;
        }
      }
    } else {
      for (j = 0; j < N; j++) {
        ic = offsetC + j * sc1 + j * sc2;
        for (i = j; i < N; i++) {
          C[ic] *= beta;
          ic += sc1;
        }
      }
    }
    return C;
  }
  if (nota) {
    if (upper) {
      for (j = 0; j < N; j++) {
        if (beta === 0) {
          ic = offsetC + j * sc2;
          for (i = 0; i <= j; i++) {
            C[ic] = 0;
            ic += sc1;
          }
        } else if (beta !== 1) {
          ic = offsetC + j * sc2;
          for (i = 0; i <= j; i++) {
            C[ic] *= beta;
            ic += sc1;
          }
        }
        for (l = 0; l < K; l++) {
          if (A[offsetA + j * sa1 + l * sa2] !== 0) {
            temp = alpha * A[offsetA + j * sa1 + l * sa2];
            ia = offsetA + l * sa2;
            ic = offsetC + j * sc2;
            for (i = 0; i <= j; i++) {
              C[ic] += temp * A[ia];
              ia += sa1;
              ic += sc1;
            }
          }
        }
      }
    } else {
      for (j = 0; j < N; j++) {
        if (beta === 0) {
          ic = offsetC + j * sc1 + j * sc2;
          for (i = j; i < N; i++) {
            C[ic] = 0;
            ic += sc1;
          }
        } else if (beta !== 1) {
          ic = offsetC + j * sc1 + j * sc2;
          for (i = j; i < N; i++) {
            C[ic] *= beta;
            ic += sc1;
          }
        }
        for (l = 0; l < K; l++) {
          if (A[offsetA + j * sa1 + l * sa2] !== 0) {
            temp = alpha * A[offsetA + j * sa1 + l * sa2];
            ia = offsetA + j * sa1 + l * sa2;
            ic = offsetC + j * sc1 + j * sc2;
            for (i = j; i < N; i++) {
              C[ic] += temp * A[ia];
              ia += sa1;
              ic += sc1;
            }
          }
        }
      }
    }
  } else if (upper) {
    for (j = 0; j < N; j++) {
      for (i = 0; i <= j; i++) {
        temp = 0;
        for (l = 0; l < K; l++) {
          temp += A[offsetA + l * sa1 + i * sa2] * A[offsetA + l * sa1 + j * sa2];
        }
        if (beta === 0) {
          C[offsetC + i * sc1 + j * sc2] = alpha * temp;
        } else {
          C[offsetC + i * sc1 + j * sc2] = alpha * temp + beta * C[offsetC + i * sc1 + j * sc2];
        }
      }
    }
  } else {
    for (j = 0; j < N; j++) {
      for (i = j; i < N; i++) {
        temp = 0;
        for (l = 0; l < K; l++) {
          temp += A[offsetA + l * sa1 + i * sa2] * A[offsetA + l * sa1 + j * sa2];
        }
        if (beta === 0) {
          C[offsetC + i * sc1 + j * sc2] = alpha * temp;
        } else {
          C[offsetC + i * sc1 + j * sc2] = alpha * temp + beta * C[offsetC + i * sc1 + j * sc2];
        }
      }
    }
  }
  return C;
}
var base_default8 = dsyrk;

// ../notes/lib/blas/base/dgemm/lib/base.js
var MC = 128;
var NC = 64;
var KC = 256;
function dgemm(transa, transb, M3, N, K, alpha, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB, beta, C, strideC1, strideC2, offsetC) {
  var c00;
  var c01;
  var c02;
  var c03;
  var c10;
  var c11;
  var c12;
  var c13;
  var c20;
  var c21;
  var c22;
  var c23;
  var c30;
  var c31;
  var c32;
  var c33;
  var nota;
  var notb;
  var ar;
  var ak;
  var bk;
  var bn;
  var a0;
  var a1;
  var a2;
  var a3;
  var b0;
  var b1;
  var b2;
  var b3;
  var pa0;
  var pa1;
  var pa2;
  var pa3;
  var pb0;
  var pb1;
  var pb2;
  var pb3;
  var pc;
  var pcc;
  var pak;
  var jc;
  var kc;
  var ic;
  var j;
  var i;
  var l;
  var jcEnd;
  var kcEnd;
  var icEnd;
  var kcLen;
  var nb;
  var mb;
  var bz;
  var jj;
  var ii;
  var pa;
  var pb;
  var temp;
  if (M3 === 0 || N === 0 || (alpha === 0 || K === 0) && beta === 1) {
    return C;
  }
  nota = transa === "no-transpose";
  notb = transb === "no-transpose";
  ar = nota ? strideA1 : strideA2;
  ak = nota ? strideA2 : strideA1;
  bk = notb ? strideB1 : strideB2;
  bn = notb ? strideB2 : strideB1;
  if (alpha === 0) {
    for (j = 0; j < N; j++) {
      pc = offsetC + j * strideC2;
      if (beta === 0) {
        for (i = 0; i < M3; i++) {
          C[pc] = 0;
          pc += strideC1;
        }
      } else {
        for (i = 0; i < M3; i++) {
          C[pc] *= beta;
          pc += strideC1;
        }
      }
    }
    return C;
  }
  for (jc = 0; jc < N; jc += NC) {
    jcEnd = jc + NC;
    if (jcEnd > N) {
      jcEnd = N;
    }
    nb = jc + (jcEnd - jc - (jcEnd - jc) % 4);
    for (kc = 0; kc < K; kc += KC) {
      kcEnd = kc + KC;
      if (kcEnd > K) {
        kcEnd = K;
      }
      kcLen = kcEnd - kc;
      bz = kc === 0 ? beta : 1;
      for (ic = 0; ic < M3; ic += MC) {
        icEnd = ic + MC;
        if (icEnd > M3) {
          icEnd = M3;
        }
        mb = ic + (icEnd - ic - (icEnd - ic) % 4);
        for (j = jc; j < nb; j += 4) {
          pb0 = offsetB + j * bn + kc * bk;
          pb1 = pb0 + bn;
          pb2 = pb1 + bn;
          pb3 = pb2 + bn;
          for (i = ic; i < mb; i += 4) {
            c00 = 0;
            c10 = 0;
            c20 = 0;
            c30 = 0;
            c01 = 0;
            c11 = 0;
            c21 = 0;
            c31 = 0;
            c02 = 0;
            c12 = 0;
            c22 = 0;
            c32 = 0;
            c03 = 0;
            c13 = 0;
            c23 = 0;
            c33 = 0;
            pa0 = offsetA + i * ar + kc * ak;
            pa1 = pa0 + ar;
            pa2 = pa1 + ar;
            pa3 = pa2 + ar;
            for (l = 0; l < kcLen; l++) {
              pak = l * ak;
              a0 = A[pa0 + pak];
              a1 = A[pa1 + pak];
              a2 = A[pa2 + pak];
              a3 = A[pa3 + pak];
              b0 = B[pb0 + l * bk];
              b1 = B[pb1 + l * bk];
              b2 = B[pb2 + l * bk];
              b3 = B[pb3 + l * bk];
              c00 += a0 * b0;
              c10 += a1 * b0;
              c20 += a2 * b0;
              c30 += a3 * b0;
              c01 += a0 * b1;
              c11 += a1 * b1;
              c21 += a2 * b1;
              c31 += a3 * b1;
              c02 += a0 * b2;
              c12 += a1 * b2;
              c22 += a2 * b2;
              c32 += a3 * b2;
              c03 += a0 * b3;
              c13 += a1 * b3;
              c23 += a2 * b3;
              c33 += a3 * b3;
            }
            pc = offsetC + i * strideC1 + j * strideC2;
            if (bz === 0) {
              pcc = pc;
              C[pcc] = alpha * c00;
              C[pcc + strideC1] = alpha * c10;
              C[pcc + 2 * strideC1] = alpha * c20;
              C[pcc + 3 * strideC1] = alpha * c30;
              pcc = pc + strideC2;
              C[pcc] = alpha * c01;
              C[pcc + strideC1] = alpha * c11;
              C[pcc + 2 * strideC1] = alpha * c21;
              C[pcc + 3 * strideC1] = alpha * c31;
              pcc = pc + 2 * strideC2;
              C[pcc] = alpha * c02;
              C[pcc + strideC1] = alpha * c12;
              C[pcc + 2 * strideC1] = alpha * c22;
              C[pcc + 3 * strideC1] = alpha * c32;
              pcc = pc + 3 * strideC2;
              C[pcc] = alpha * c03;
              C[pcc + strideC1] = alpha * c13;
              C[pcc + 2 * strideC1] = alpha * c23;
              C[pcc + 3 * strideC1] = alpha * c33;
            } else {
              pcc = pc;
              C[pcc] = alpha * c00 + bz * C[pcc];
              C[pcc + strideC1] = alpha * c10 + bz * C[pcc + strideC1];
              C[pcc + 2 * strideC1] = alpha * c20 + bz * C[pcc + 2 * strideC1];
              C[pcc + 3 * strideC1] = alpha * c30 + bz * C[pcc + 3 * strideC1];
              pcc = pc + strideC2;
              C[pcc] = alpha * c01 + bz * C[pcc];
              C[pcc + strideC1] = alpha * c11 + bz * C[pcc + strideC1];
              C[pcc + 2 * strideC1] = alpha * c21 + bz * C[pcc + 2 * strideC1];
              C[pcc + 3 * strideC1] = alpha * c31 + bz * C[pcc + 3 * strideC1];
              pcc = pc + 2 * strideC2;
              C[pcc] = alpha * c02 + bz * C[pcc];
              C[pcc + strideC1] = alpha * c12 + bz * C[pcc + strideC1];
              C[pcc + 2 * strideC1] = alpha * c22 + bz * C[pcc + 2 * strideC1];
              C[pcc + 3 * strideC1] = alpha * c32 + bz * C[pcc + 3 * strideC1];
              pcc = pc + 3 * strideC2;
              C[pcc] = alpha * c03 + bz * C[pcc];
              C[pcc + strideC1] = alpha * c13 + bz * C[pcc + strideC1];
              C[pcc + 2 * strideC1] = alpha * c23 + bz * C[pcc + 2 * strideC1];
              C[pcc + 3 * strideC1] = alpha * c33 + bz * C[pcc + 3 * strideC1];
            }
          }
        }
        for (jj = jc; jj < nb; jj++) {
          pb = offsetB + jj * bn + kc * bk;
          for (ii = mb; ii < icEnd; ii++) {
            temp = 0;
            pa = offsetA + ii * ar + kc * ak;
            for (l = 0; l < kcLen; l++) {
              temp += A[pa + l * ak] * B[pb + l * bk];
            }
            pc = offsetC + ii * strideC1 + jj * strideC2;
            C[pc] = bz === 0 ? alpha * temp : alpha * temp + bz * C[pc];
          }
        }
      }
    }
    for (jj = nb; jj < jcEnd; jj++) {
      pb = offsetB + jj * bn;
      for (ii = 0; ii < M3; ii++) {
        temp = 0;
        pa = offsetA + ii * ar;
        for (l = 0; l < K; l++) {
          temp += A[pa + l * ak] * B[pb + l * bk];
        }
        pc = offsetC + ii * strideC1 + jj * strideC2;
        C[pc] = beta === 0 ? alpha * temp : alpha * temp + beta * C[pc];
      }
    }
  }
  return C;
}
var base_default9 = dgemm;

// ../notes/lib/lapack/base/dpbtrf/lib/base.js
var NBMAX = 32;
var LDWORK = NBMAX + 1;
function dpbtrf(uplo, N, kd, AB, strideAB1, strideAB2, offsetAB) {
  var iinfo;
  var WORK;
  var sa1;
  var sa2;
  var nb;
  var ib;
  var i2;
  var i3;
  var jj;
  var ii;
  var i;
  if (N === 0) {
    return 0;
  }
  sa1 = strideAB1;
  sa2 = strideAB2;
  nb = NBMAX;
  if (nb < 1) {
    nb = 1;
  }
  nb = Math.min(nb, NBMAX);
  if (nb <= 1 || nb > kd) {
    return base_default3(uplo, N, kd, AB, sa1, sa2, offsetAB);
  }
  WORK = new import_lib.default(LDWORK * NBMAX);
  if (uplo === "upper") {
    for (jj = 0; jj < nb; jj++) {
      for (ii = 0; ii < jj; ii++) {
        WORK[ii + jj * LDWORK] = 0;
      }
    }
    for (i = 0; i < N; i += nb) {
      ib = Math.min(nb, N - i);
      iinfo = base_default6("upper", ib, AB, sa1, sa2 - sa1, offsetAB + kd * sa1 + i * sa2);
      if (iinfo !== 0) {
        return i + iinfo;
      }
      if (i + ib < N) {
        i2 = Math.min(kd - ib, N - i - ib);
        i3 = Math.min(ib, N - i - kd);
        if (i2 > 0) {
          base_default7("left", "upper", "transpose", "non-unit", ib, i2, 1, AB, sa1, sa2 - sa1, offsetAB + kd * sa1 + i * sa2, AB, sa1, sa2 - sa1, offsetAB + (kd - ib) * sa1 + (i + ib) * sa2);
          base_default8("upper", "transpose", i2, ib, -1, AB, sa1, sa2 - sa1, offsetAB + (kd - ib) * sa1 + (i + ib) * sa2, 1, AB, sa1, sa2 - sa1, offsetAB + kd * sa1 + (i + ib) * sa2);
        }
        if (i3 > 0) {
          for (jj = 0; jj < i3; jj++) {
            for (ii = jj; ii < ib; ii++) {
              WORK[ii + jj * LDWORK] = AB[offsetAB + (ii - jj) * sa1 + (jj + i + kd) * sa2];
            }
          }
          base_default7("left", "upper", "transpose", "non-unit", ib, i3, 1, AB, sa1, sa2 - sa1, offsetAB + kd * sa1 + i * sa2, WORK, 1, LDWORK, 0);
          if (i2 > 0) {
            base_default9("transpose", "no-transpose", i2, i3, ib, -1, AB, sa1, sa2 - sa1, offsetAB + (kd - ib) * sa1 + (i + ib) * sa2, WORK, 1, LDWORK, 0, 1, AB, sa1, sa2 - sa1, offsetAB + ib * sa1 + (i + kd) * sa2);
          }
          base_default8("upper", "transpose", i3, ib, -1, WORK, 1, LDWORK, 0, 1, AB, sa1, sa2 - sa1, offsetAB + kd * sa1 + (i + kd) * sa2);
          for (jj = 0; jj < i3; jj++) {
            for (ii = jj; ii < ib; ii++) {
              AB[offsetAB + (ii - jj) * sa1 + (jj + i + kd) * sa2] = WORK[ii + jj * LDWORK];
            }
          }
        }
      }
    }
  } else {
    for (jj = 0; jj < nb; jj++) {
      for (ii = jj + 1; ii < nb; ii++) {
        WORK[ii + jj * LDWORK] = 0;
      }
    }
    for (i = 0; i < N; i += nb) {
      ib = Math.min(nb, N - i);
      iinfo = base_default6("lower", ib, AB, sa1, sa2 - sa1, offsetAB + i * sa2);
      if (iinfo !== 0) {
        return i + iinfo;
      }
      if (i + ib < N) {
        i2 = Math.min(kd - ib, N - i - ib);
        i3 = Math.min(ib, N - i - kd);
        if (i2 > 0) {
          base_default7("right", "lower", "transpose", "non-unit", i2, ib, 1, AB, sa1, sa2 - sa1, offsetAB + i * sa2, AB, sa1, sa2 - sa1, offsetAB + ib * sa1 + i * sa2);
          base_default8("lower", "no-transpose", i2, ib, -1, AB, sa1, sa2 - sa1, offsetAB + ib * sa1 + i * sa2, 1, AB, sa1, sa2 - sa1, offsetAB + (i + ib) * sa2);
        }
        if (i3 > 0) {
          for (jj = 0; jj < ib; jj++) {
            for (ii = 0; ii < Math.min(jj + 1, i3); ii++) {
              WORK[ii + jj * LDWORK] = AB[offsetAB + (kd - jj + ii) * sa1 + (jj + i) * sa2];
            }
          }
          base_default7("right", "lower", "transpose", "non-unit", i3, ib, 1, AB, sa1, sa2 - sa1, offsetAB + i * sa2, WORK, 1, LDWORK, 0);
          if (i2 > 0) {
            base_default9("no-transpose", "transpose", i3, i2, ib, -1, WORK, 1, LDWORK, 0, AB, sa1, sa2 - sa1, offsetAB + ib * sa1 + i * sa2, 1, AB, sa1, sa2 - sa1, offsetAB + (kd - ib) * sa1 + (i + ib) * sa2);
          }
          base_default8("lower", "no-transpose", i3, ib, -1, WORK, 1, LDWORK, 0, 1, AB, sa1, sa2 - sa1, offsetAB + (i + kd) * sa2);
          for (jj = 0; jj < ib; jj++) {
            for (ii = 0; ii < Math.min(jj + 1, i3); ii++) {
              AB[offsetAB + (kd - jj + ii) * sa1 + (jj + i) * sa2] = WORK[ii + jj * LDWORK];
            }
          }
        }
      }
    }
  }
  return 0;
}
var base_default10 = dpbtrf;

// ../notes/lib/blas/base/dtbsv/lib/base.js
function dtbsv(uplo, trans, diag, N, K, A, strideA1, strideA2, offsetA, x, strideX, offsetX) {
  var nounit;
  var kplus1;
  var temp;
  var sa1;
  var sa2;
  var ix;
  var jx;
  var kx;
  var ia;
  var i;
  var j;
  var l;
  if (N <= 0) {
    return x;
  }
  nounit = diag === "non-unit";
  sa1 = strideA1;
  sa2 = strideA2;
  kx = offsetX;
  if (trans === "no-transpose") {
    if (uplo === "upper") {
      kplus1 = K;
      jx = kx + (N - 1) * strideX;
      for (j = N - 1; j >= 0; j--) {
        if (x[jx] !== 0) {
          l = kplus1 - j;
          if (nounit) {
            x[jx] /= A[offsetA + kplus1 * sa1 + j * sa2];
          }
          temp = x[jx];
          ix = jx - strideX;
          for (i = j - 1; i >= Math.max(0, j - K); i--) {
            ia = offsetA + (l + i) * sa1 + j * sa2;
            x[ix] -= temp * A[ia];
            ix -= strideX;
          }
        }
        jx -= strideX;
      }
    } else {
      jx = kx;
      for (j = 0; j < N; j++) {
        if (x[jx] !== 0) {
          l = -j;
          if (nounit) {
            x[jx] /= A[offsetA + j * sa2];
          }
          temp = x[jx];
          ix = jx + strideX;
          for (i = j + 1; i < Math.min(N, j + K + 1); i++) {
            ia = offsetA + (l + i) * sa1 + j * sa2;
            x[ix] -= temp * A[ia];
            ix += strideX;
          }
        }
        jx += strideX;
      }
    }
  } else if (uplo === "upper") {
    kplus1 = K;
    jx = kx;
    for (j = 0; j < N; j++) {
      temp = x[jx];
      l = kplus1 - j;
      ix = kx;
      for (i = Math.max(0, j - K); i < j; i++) {
        ia = offsetA + (l + i) * sa1 + j * sa2;
        temp -= A[ia] * x[ix];
        ix += strideX;
      }
      if (nounit) {
        temp /= A[offsetA + kplus1 * sa1 + j * sa2];
      }
      x[jx] = temp;
      jx += strideX;
      if (j >= K) {
        kx += strideX;
      }
    }
  } else {
    jx = kx + (N - 1) * strideX;
    for (j = N - 1; j >= 0; j--) {
      temp = x[jx];
      l = -j;
      ix = kx + (N - 1) * strideX;
      for (i = Math.min(N - 1, j + K); i > j; i--) {
        ia = offsetA + (l + i) * sa1 + j * sa2;
        temp -= A[ia] * x[ix];
        ix -= strideX;
      }
      if (nounit) {
        temp /= A[offsetA + j * sa2];
      }
      x[jx] = temp;
      jx -= strideX;
      if (N - 1 - j >= K) {
        kx -= strideX;
      }
    }
  }
  return x;
}
var base_default11 = dtbsv;

// ../notes/lib/lapack/base/dpbtrs/lib/base.js
function dpbtrs(uplo, N, kd, nrhs, AB, strideAB1, strideAB2, offsetAB, B, strideB1, strideB2, offsetB) {
  var upper;
  var j;
  if (N === 0 || nrhs === 0) {
    return 0;
  }
  upper = uplo === "upper";
  if (upper) {
    for (j = 0; j < nrhs; j++) {
      base_default11("upper", "transpose", "non-unit", N, kd, AB, strideAB1, strideAB2, offsetAB, B, strideB1, offsetB + j * strideB2);
      base_default11("upper", "no-transpose", "non-unit", N, kd, AB, strideAB1, strideAB2, offsetAB, B, strideB1, offsetB + j * strideB2);
    }
  } else {
    for (j = 0; j < nrhs; j++) {
      base_default11("lower", "no-transpose", "non-unit", N, kd, AB, strideAB1, strideAB2, offsetAB, B, strideB1, offsetB + j * strideB2);
      base_default11("lower", "transpose", "non-unit", N, kd, AB, strideAB1, strideAB2, offsetAB, B, strideB1, offsetB + j * strideB2);
    }
  }
  return 0;
}
var base_default12 = dpbtrs;

// ../notes/lib/lapack/base/dpbsv/lib/base.js
function dpbsv(uplo, N, kd, nrhs, AB, strideAB1, strideAB2, offsetAB, B, strideB1, strideB2, offsetB) {
  var info;
  info = base_default10(uplo, N, kd, AB, strideAB1, strideAB2, offsetAB);
  if (info === 0) {
    info = base_default12(uplo, N, kd, nrhs, AB, strideAB1, strideAB2, offsetAB, B, strideB1, strideB2, offsetB);
  }
  return info;
}
var base_default13 = dpbsv;
export {
  base_default13 as default
};
/**
* @license Apache-2.0
*
* Copyright (c) 2025 The Stdlib Authors.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
/*! Bundled license information:

@stdlib/assert/has-symbol-support/lib/main.js:
@stdlib/assert/has-symbol-support/lib/index.js:
@stdlib/assert/has-tostringtag-support/lib/main.js:
@stdlib/assert/has-tostringtag-support/lib/index.js:
@stdlib/utils/native-class/lib/tostring.js:
@stdlib/utils/native-class/lib/main.js:
@stdlib/assert/has-own-property/lib/main.js:
@stdlib/assert/has-own-property/lib/index.js:
@stdlib/symbol/ctor/lib/main.js:
@stdlib/symbol/ctor/lib/index.js:
@stdlib/utils/native-class/lib/tostringtag.js:
@stdlib/utils/native-class/lib/polyfill.js:
@stdlib/utils/native-class/lib/index.js:
@stdlib/assert/is-float64array/lib/main.js:
@stdlib/assert/is-float64array/lib/index.js:
@stdlib/assert/has-float64array-support/lib/float64array.js:
@stdlib/assert/has-float64array-support/lib/main.js:
@stdlib/assert/has-float64array-support/lib/index.js:
@stdlib/array/float64/lib/main.js:
@stdlib/array/float64/lib/polyfill.js:
@stdlib/array/float64/lib/index.js:
  (**
  * @license Apache-2.0
  *
  * Copyright (c) 2018 The Stdlib Authors.
  *
  * Licensed under the Apache License, Version 2.0 (the "License");
  * you may not use this file except in compliance with the License.
  * You may obtain a copy of the License at
  *
  *    http://www.apache.org/licenses/LICENSE-2.0
  *
  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS,
  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  * See the License for the specific language governing permissions and
  * limitations under the License.
  *)
*/
