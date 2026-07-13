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
  var upper;
  var sa1;
  var sa2;
  var sx;
  var x0;
  var x1;
  var x2;
  var x3;
  var t0;
  var t1;
  var t2;
  var t3;
  var xv;
  var a0;
  var a1;
  var a2;
  var a3;
  var n4;
  var ix;
  var jx;
  var jj;
  var i;
  var j;
  var k;
  if (N === 0 || alpha === 0) {
    return A;
  }
  upper = uplo === "upper";
  sa1 = strideA1;
  sa2 = strideA2;
  sx = strideX;
  n4 = N - N % 4;
  if (Math.abs(sa1) <= Math.abs(sa2)) {
    jx = offsetX;
    for (j = 0; j < n4; j += 4) {
      t0 = x[jx];
      t1 = x[jx + sx];
      t2 = x[jx + 2 * sx];
      t3 = x[jx + 3 * sx];
      if (t0 !== 0 && t1 !== 0 && t2 !== 0 && t3 !== 0) {
        t0 *= alpha;
        t1 *= alpha;
        t2 *= alpha;
        t3 *= alpha;
        if (upper) {
          a0 = offsetA + j * sa2;
          a1 = a0 + sa2;
          a2 = a1 + sa2;
          a3 = a2 + sa2;
          ix = offsetX;
          for (i = 0; i <= j; i++) {
            xv = x[ix];
            A[a0] += xv * t0;
            A[a1] += xv * t1;
            A[a2] += xv * t2;
            A[a3] += xv * t3;
            a0 += sa1;
            a1 += sa1;
            a2 += sa1;
            a3 += sa1;
            ix += sx;
          }
          x0 = x[ix];
          x1 = x[ix + sx];
          x2 = x[ix + 2 * sx];
          A[a1] += x0 * t1;
          A[a2] += x0 * t2;
          A[a2 + sa1] += x1 * t2;
          A[a3] += x0 * t3;
          A[a3 + sa1] += x1 * t3;
          A[a3 + 2 * sa1] += x2 * t3;
        } else {
          x0 = x[jx];
          x1 = x[jx + sx];
          x2 = x[jx + 2 * sx];
          a0 = offsetA + j * sa2 + j * sa1;
          A[a0] += x0 * t0;
          A[a0 + sa1] += x1 * t0;
          A[a0 + 2 * sa1] += x2 * t0;
          a1 = a0 + sa2 + sa1;
          A[a1] += x1 * t1;
          A[a1 + sa1] += x2 * t1;
          a2 = a1 + sa2 + sa1;
          A[a2] += x2 * t2;
          a0 = offsetA + j * sa2 + (j + 3) * sa1;
          a1 = a0 + sa2;
          a2 = a1 + sa2;
          a3 = a2 + sa2;
          ix = jx + 3 * sx;
          for (i = j + 3; i < N; i++) {
            xv = x[ix];
            A[a0] += xv * t0;
            A[a1] += xv * t1;
            A[a2] += xv * t2;
            A[a3] += xv * t3;
            a0 += sa1;
            a1 += sa1;
            a2 += sa1;
            a3 += sa1;
            ix += sx;
          }
        }
      } else {
        jj = jx;
        for (k = j; k < j + 4; k++) {
          xv = x[jj];
          if (xv !== 0) {
            t0 = alpha * xv;
            if (upper) {
              a0 = offsetA + k * sa2;
              ix = offsetX;
              for (i = 0; i <= k; i++) {
                A[a0] += x[ix] * t0;
                a0 += sa1;
                ix += sx;
              }
            } else {
              a0 = offsetA + k * sa2 + k * sa1;
              ix = jj;
              for (i = k; i < N; i++) {
                A[a0] += x[ix] * t0;
                a0 += sa1;
                ix += sx;
              }
            }
          }
          jj += sx;
        }
      }
      jx += 4 * sx;
    }
    for (j = n4; j < N; j++) {
      xv = x[jx];
      if (xv !== 0) {
        t0 = alpha * xv;
        if (upper) {
          a0 = offsetA + j * sa2;
          ix = offsetX;
          for (i = 0; i <= j; i++) {
            A[a0] += x[ix] * t0;
            a0 += sa1;
            ix += sx;
          }
        } else {
          a0 = offsetA + j * sa2 + j * sa1;
          ix = jx;
          for (i = j; i < N; i++) {
            A[a0] += x[ix] * t0;
            a0 += sa1;
            ix += sx;
          }
        }
      }
      jx += sx;
    }
  } else {
    jj = offsetX;
    for (i = 0; i < n4; i += 4) {
      x0 = x[jj];
      x1 = x[jj + sx];
      x2 = x[jj + 2 * sx];
      x3 = x[jj + 3 * sx];
      if (upper) {
        if (x0 !== 0) {
          t0 = alpha * x0;
          A[offsetA + i * sa1 + i * sa2] += x0 * t0;
        }
        if (x1 !== 0) {
          t1 = alpha * x1;
          a0 = offsetA + i * sa1 + (i + 1) * sa2;
          A[a0] += x0 * t1;
          A[a0 + sa1] += x1 * t1;
        }
        if (x2 !== 0) {
          t2 = alpha * x2;
          a0 = offsetA + i * sa1 + (i + 2) * sa2;
          A[a0] += x0 * t2;
          A[a0 + sa1] += x1 * t2;
          A[a0 + 2 * sa1] += x2 * t2;
        }
        a0 = offsetA + i * sa1 + (i + 3) * sa2;
        a1 = a0 + sa1;
        a2 = a1 + sa1;
        a3 = a2 + sa1;
        jx = jj + 3 * sx;
        for (j = i + 3; j < N; j++) {
          xv = x[jx];
          if (xv !== 0) {
            t0 = alpha * xv;
            A[a0] += x0 * t0;
            A[a1] += x1 * t0;
            A[a2] += x2 * t0;
            A[a3] += x3 * t0;
          }
          a0 += sa2;
          a1 += sa2;
          a2 += sa2;
          a3 += sa2;
          jx += sx;
        }
      } else {
        a0 = offsetA + i * sa1;
        a1 = a0 + sa1;
        a2 = a1 + sa1;
        a3 = a2 + sa1;
        jx = offsetX;
        for (j = 0; j <= i; j++) {
          xv = x[jx];
          if (xv !== 0) {
            t0 = alpha * xv;
            A[a0] += x0 * t0;
            A[a1] += x1 * t0;
            A[a2] += x2 * t0;
            A[a3] += x3 * t0;
          }
          a0 += sa2;
          a1 += sa2;
          a2 += sa2;
          a3 += sa2;
          jx += sx;
        }
        if (x1 !== 0) {
          t1 = alpha * x1;
          a0 = offsetA + (i + 1) * sa1 + (i + 1) * sa2;
          A[a0] += x1 * t1;
          A[a0 + sa1] += x2 * t1;
          A[a0 + 2 * sa1] += x3 * t1;
        }
        if (x2 !== 0) {
          t2 = alpha * x2;
          a0 = offsetA + (i + 2) * sa1 + (i + 2) * sa2;
          A[a0] += x2 * t2;
          A[a0 + sa1] += x3 * t2;
        }
        if (x3 !== 0) {
          t3 = alpha * x3;
          A[offsetA + (i + 3) * sa1 + (i + 3) * sa2] += x3 * t3;
        }
      }
      jj += 4 * sx;
    }
    for (i = n4; i < N; i++) {
      x0 = x[jj];
      if (upper) {
        a0 = offsetA + i * sa1 + i * sa2;
        jx = jj;
        for (j = i; j < N; j++) {
          xv = x[jx];
          if (xv !== 0) {
            A[a0] += x0 * (alpha * xv);
          }
          a0 += sa2;
          jx += sx;
        }
      } else {
        a0 = offsetA + i * sa1;
        jx = offsetX;
        for (j = 0; j <= i; j++) {
          xv = x[jx];
          if (xv !== 0) {
            A[a0] += x0 * (alpha * xv);
          }
          a0 += sa2;
          jx += sx;
        }
      }
      jj += sx;
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
  var leny;
  var lenx;
  var sb1;
  var sb2;
  var s0;
  var s1;
  var s2;
  var s3;
  var t0;
  var t1;
  var t2;
  var t3;
  var xv;
  var m4;
  var a0;
  var a1;
  var a2;
  var a3;
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
  if (noTrans) {
    leny = M3;
    lenx = N;
    sb1 = strideA1;
    sb2 = strideA2;
  } else {
    leny = N;
    lenx = M3;
    sb1 = strideA2;
    sb2 = strideA1;
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
  if (Math.abs(sb2) <= Math.abs(sb1)) {
    m4 = leny - leny % 4;
    iy = offsetY;
    for (i = 0; i < m4; i += 4) {
      s0 = 0;
      s1 = 0;
      s2 = 0;
      s3 = 0;
      a0 = offsetA + i * sb1;
      a1 = a0 + sb1;
      a2 = a1 + sb1;
      a3 = a2 + sb1;
      ix = offsetX;
      for (j = 0; j < lenx; j++) {
        xv = x[ix];
        s0 += A[a0] * xv;
        s1 += A[a1] * xv;
        s2 += A[a2] * xv;
        s3 += A[a3] * xv;
        a0 += sb2;
        a1 += sb2;
        a2 += sb2;
        a3 += sb2;
        ix += strideX;
      }
      y[iy] += alpha * s0;
      y[iy + strideY] += alpha * s1;
      y[iy + 2 * strideY] += alpha * s2;
      y[iy + 3 * strideY] += alpha * s3;
      iy += 4 * strideY;
    }
    for (; i < leny; i++) {
      s0 = 0;
      a0 = offsetA + i * sb1;
      ix = offsetX;
      for (j = 0; j < lenx; j++) {
        s0 += A[a0] * x[ix];
        a0 += sb2;
        ix += strideX;
      }
      y[iy] += alpha * s0;
      iy += strideY;
    }
  } else {
    m4 = lenx - lenx % 4;
    jx = offsetX;
    for (j = 0; j < m4; j += 4) {
      t0 = alpha * x[jx];
      t1 = alpha * x[jx + strideX];
      t2 = alpha * x[jx + 2 * strideX];
      t3 = alpha * x[jx + 3 * strideX];
      a0 = offsetA + j * sb2;
      a1 = a0 + sb2;
      a2 = a1 + sb2;
      a3 = a2 + sb2;
      jy = offsetY;
      for (i = 0; i < leny; i++) {
        y[jy] += t0 * A[a0] + t1 * A[a1] + t2 * A[a2] + t3 * A[a3];
        a0 += sb1;
        a1 += sb1;
        a2 += sb1;
        a3 += sb1;
        jy += strideY;
      }
      jx += 4 * strideX;
    }
    for (; j < lenx; j++) {
      t0 = alpha * x[jx];
      a0 = offsetA + j * sb2;
      jy = offsetY;
      for (i = 0; i < leny; i++) {
        y[jy] += t0 * A[a0];
        a0 += sb1;
        jy += strideY;
      }
      jx += strideX;
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
  var nounit;
  var eupper;
  var ea1;
  var ea2;
  var eb1;
  var eb2;
  var oa;
  var ob;
  var MM;
  var NN;
  var u01;
  var u02;
  var u03;
  var u12;
  var u13;
  var u23;
  var d0;
  var d1;
  var d2;
  var d3;
  var x0;
  var x1;
  var x2;
  var x3;
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
  var t0;
  var t1;
  var t2;
  var t3;
  var pa;
  var pb;
  var pk;
  var pl;
  var rem;
  var nb;
  var kl;
  var i0;
  var i;
  var j;
  var l;
  if (M3 === 0 || N === 0) {
    return B;
  }
  if (alpha === 0) {
    for (j = 0; j < N; j++) {
      pb = offsetB + j * strideB2;
      for (i = 0; i < M3; i++) {
        B[pb] = 0;
        pb += strideB1;
      }
    }
    return B;
  }
  nounit = diag === "non-unit";
  if (side === "left") {
    MM = M3;
    NN = N;
    eb1 = strideB1;
    eb2 = strideB2;
    if (transa === "no-transpose") {
      ea1 = strideA1;
      ea2 = strideA2;
      eupper = uplo === "upper";
    } else {
      ea1 = strideA2;
      ea2 = strideA1;
      eupper = uplo !== "upper";
    }
  } else {
    MM = N;
    NN = M3;
    eb1 = strideB2;
    eb2 = strideB1;
    if (transa === "no-transpose") {
      ea1 = strideA2;
      ea2 = strideA1;
      eupper = uplo !== "upper";
    } else {
      ea1 = strideA1;
      ea2 = strideA2;
      eupper = uplo === "upper";
    }
  }
  oa = offsetA;
  ob = offsetB;
  if (!eupper) {
    oa += (MM - 1) * (ea1 + ea2);
    ea1 = -ea1;
    ea2 = -ea2;
    ob += (MM - 1) * eb1;
    eb1 = -eb1;
  }
  rem = MM % 4;
  nb = NN - NN % 4;
  for (j = 0; j < nb; j += 4) {
    for (i0 = MM - 4; i0 >= rem; i0 -= 4) {
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
      kl = MM - i0 - 4;
      pa0 = oa + i0 * ea1 + (i0 + 4) * ea2;
      pa1 = pa0 + ea1;
      pa2 = pa1 + ea1;
      pa3 = pa2 + ea1;
      pb0 = ob + (i0 + 4) * eb1 + j * eb2;
      pb1 = pb0 + eb2;
      pb2 = pb1 + eb2;
      pb3 = pb2 + eb2;
      for (l = 0; l < kl; l++) {
        pk = l * ea2;
        a0 = A[pa0 + pk];
        a1 = A[pa1 + pk];
        a2 = A[pa2 + pk];
        a3 = A[pa3 + pk];
        pl = l * eb1;
        b0 = B[pb0 + pl];
        b1 = B[pb1 + pl];
        b2 = B[pb2 + pl];
        b3 = B[pb3 + pl];
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
      pa = oa + i0 * ea1 + i0 * ea2;
      u01 = A[pa + ea2];
      u02 = A[pa + 2 * ea2];
      u03 = A[pa + 3 * ea2];
      u12 = A[pa + ea1 + 2 * ea2];
      u13 = A[pa + ea1 + 3 * ea2];
      u23 = A[pa + 2 * ea1 + 3 * ea2];
      if (nounit) {
        d0 = A[pa];
        d1 = A[pa + ea1 + ea2];
        d2 = A[pa + 2 * (ea1 + ea2)];
        d3 = A[pa + 3 * (ea1 + ea2)];
      }
      pb = ob + i0 * eb1 + j * eb2;
      x3 = alpha * B[pb + 3 * eb1] - c30;
      if (nounit) {
        x3 /= d3;
      }
      x2 = alpha * B[pb + 2 * eb1] - c20 - u23 * x3;
      if (nounit) {
        x2 /= d2;
      }
      x1 = alpha * B[pb + eb1] - c10 - u12 * x2 - u13 * x3;
      if (nounit) {
        x1 /= d1;
      }
      x0 = alpha * B[pb] - c00 - u01 * x1 - u02 * x2 - u03 * x3;
      if (nounit) {
        x0 /= d0;
      }
      B[pb] = x0;
      B[pb + eb1] = x1;
      B[pb + 2 * eb1] = x2;
      B[pb + 3 * eb1] = x3;
      pb += eb2;
      x3 = alpha * B[pb + 3 * eb1] - c31;
      if (nounit) {
        x3 /= d3;
      }
      x2 = alpha * B[pb + 2 * eb1] - c21 - u23 * x3;
      if (nounit) {
        x2 /= d2;
      }
      x1 = alpha * B[pb + eb1] - c11 - u12 * x2 - u13 * x3;
      if (nounit) {
        x1 /= d1;
      }
      x0 = alpha * B[pb] - c01 - u01 * x1 - u02 * x2 - u03 * x3;
      if (nounit) {
        x0 /= d0;
      }
      B[pb] = x0;
      B[pb + eb1] = x1;
      B[pb + 2 * eb1] = x2;
      B[pb + 3 * eb1] = x3;
      pb += eb2;
      x3 = alpha * B[pb + 3 * eb1] - c32;
      if (nounit) {
        x3 /= d3;
      }
      x2 = alpha * B[pb + 2 * eb1] - c22 - u23 * x3;
      if (nounit) {
        x2 /= d2;
      }
      x1 = alpha * B[pb + eb1] - c12 - u12 * x2 - u13 * x3;
      if (nounit) {
        x1 /= d1;
      }
      x0 = alpha * B[pb] - c02 - u01 * x1 - u02 * x2 - u03 * x3;
      if (nounit) {
        x0 /= d0;
      }
      B[pb] = x0;
      B[pb + eb1] = x1;
      B[pb + 2 * eb1] = x2;
      B[pb + 3 * eb1] = x3;
      pb += eb2;
      x3 = alpha * B[pb + 3 * eb1] - c33;
      if (nounit) {
        x3 /= d3;
      }
      x2 = alpha * B[pb + 2 * eb1] - c23 - u23 * x3;
      if (nounit) {
        x2 /= d2;
      }
      x1 = alpha * B[pb + eb1] - c13 - u12 * x2 - u13 * x3;
      if (nounit) {
        x1 /= d1;
      }
      x0 = alpha * B[pb] - c03 - u01 * x1 - u02 * x2 - u03 * x3;
      if (nounit) {
        x0 /= d0;
      }
      B[pb] = x0;
      B[pb + eb1] = x1;
      B[pb + 2 * eb1] = x2;
      B[pb + 3 * eb1] = x3;
    }
    for (i = rem - 1; i >= 0; i--) {
      pb = ob + i * eb1 + j * eb2;
      t0 = alpha * B[pb];
      t1 = alpha * B[pb + eb2];
      t2 = alpha * B[pb + 2 * eb2];
      t3 = alpha * B[pb + 3 * eb2];
      pa = oa + i * ea1 + (i + 1) * ea2;
      pb = ob + (i + 1) * eb1 + j * eb2;
      for (l = i + 1; l < MM; l++) {
        a0 = A[pa];
        pa += ea2;
        t0 -= a0 * B[pb];
        t1 -= a0 * B[pb + eb2];
        t2 -= a0 * B[pb + 2 * eb2];
        t3 -= a0 * B[pb + 3 * eb2];
        pb += eb1;
      }
      if (nounit) {
        d0 = A[oa + i * (ea1 + ea2)];
        t0 /= d0;
        t1 /= d0;
        t2 /= d0;
        t3 /= d0;
      }
      pb = ob + i * eb1 + j * eb2;
      B[pb] = t0;
      B[pb + eb2] = t1;
      B[pb + 2 * eb2] = t2;
      B[pb + 3 * eb2] = t3;
    }
  }
  for (j = nb; j < NN; j++) {
    for (i = MM - 1; i >= 0; i--) {
      t0 = alpha * B[ob + i * eb1 + j * eb2];
      pa = oa + i * ea1 + (i + 1) * ea2;
      pb = ob + (i + 1) * eb1 + j * eb2;
      for (l = i + 1; l < MM; l++) {
        t0 -= A[pa] * B[pb];
        pa += ea2;
        pb += eb1;
      }
      if (nounit) {
        t0 /= A[oa + i * (ea1 + ea2)];
      }
      B[ob + i * eb1 + j * eb2] = t0;
    }
  }
  return B;
}
var base_default7 = dtrsm;

// ../notes/lib/blas/base/dsyrk/lib/base.js
function dsyrk(uplo, trans, N, K, alpha, A, strideA1, strideA2, offsetA, beta, C, strideC1, strideC2, offsetC) {
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
  var pa0;
  var pa1;
  var pa2;
  var pa3;
  var pb0;
  var pb1;
  var pb2;
  var pb3;
  var pcc;
  var pak;
  var sc1;
  var sc2;
  var up;
  var nt;
  var ar;
  var ak;
  var a0;
  var a1;
  var a2;
  var a3;
  var b0;
  var b1;
  var b2;
  var b3;
  var pc;
  var ic;
  var nb;
  var jj;
  var ii;
  var pa;
  var pb;
  var tt;
  var i;
  var j;
  var l;
  up = uplo === "upper";
  nt = trans === "no-transpose";
  if (N === 0 || (alpha === 0 || K === 0) && beta === 1) {
    return C;
  }
  sc1 = strideC1;
  sc2 = strideC2;
  ar = nt ? strideA1 : strideA2;
  ak = nt ? strideA2 : strideA1;
  if (beta !== 1) {
    if (up) {
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
  }
  if (alpha === 0 || K === 0) {
    return C;
  }
  nb = N - N % 4;
  if (up) {
    for (j = 0; j < nb; j += 4) {
      pb0 = offsetA + j * ar;
      pb1 = pb0 + ar;
      pb2 = pb1 + ar;
      pb3 = pb2 + ar;
      for (i = 0; i + 3 <= j; i += 4) {
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
        pa0 = offsetA + i * ar;
        pa1 = pa0 + ar;
        pa2 = pa1 + ar;
        pa3 = pa2 + ar;
        for (l = 0; l < K; l++) {
          pak = l * ak;
          a0 = A[pa0 + pak];
          a1 = A[pa1 + pak];
          a2 = A[pa2 + pak];
          a3 = A[pa3 + pak];
          b0 = A[pb0 + pak];
          b1 = A[pb1 + pak];
          b2 = A[pb2 + pak];
          b3 = A[pb3 + pak];
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
        pc = offsetC + i * sc1 + j * sc2;
        pcc = pc;
        C[pcc] += alpha * c00;
        C[pcc + sc1] += alpha * c10;
        C[pcc + 2 * sc1] += alpha * c20;
        C[pcc + 3 * sc1] += alpha * c30;
        pcc = pc + sc2;
        C[pcc] += alpha * c01;
        C[pcc + sc1] += alpha * c11;
        C[pcc + 2 * sc1] += alpha * c21;
        C[pcc + 3 * sc1] += alpha * c31;
        pcc = pc + 2 * sc2;
        C[pcc] += alpha * c02;
        C[pcc + sc1] += alpha * c12;
        C[pcc + 2 * sc1] += alpha * c22;
        C[pcc + 3 * sc1] += alpha * c32;
        pcc = pc + 3 * sc2;
        C[pcc] += alpha * c03;
        C[pcc + sc1] += alpha * c13;
        C[pcc + 2 * sc1] += alpha * c23;
        C[pcc + 3 * sc1] += alpha * c33;
      }
      for (jj = j; jj < j + 4; jj++) {
        pb = offsetA + jj * ar;
        for (ii = i; ii <= jj; ii++) {
          tt = 0;
          pa = offsetA + ii * ar;
          for (l = 0; l < K; l++) {
            tt += A[pa + l * ak] * A[pb + l * ak];
          }
          C[offsetC + ii * sc1 + jj * sc2] += alpha * tt;
        }
      }
    }
    for (jj = nb; jj < N; jj++) {
      pb = offsetA + jj * ar;
      for (ii = 0; ii <= jj; ii++) {
        tt = 0;
        pa = offsetA + ii * ar;
        for (l = 0; l < K; l++) {
          tt += A[pa + l * ak] * A[pb + l * ak];
        }
        C[offsetC + ii * sc1 + jj * sc2] += alpha * tt;
      }
    }
  } else {
    for (j = 0; j < nb; j += 4) {
      pb0 = offsetA + j * ar;
      pb1 = pb0 + ar;
      pb2 = pb1 + ar;
      pb3 = pb2 + ar;
      for (jj = j; jj < j + 4; jj++) {
        pb = offsetA + jj * ar;
        for (ii = jj; ii < j + 4; ii++) {
          tt = 0;
          pa = offsetA + ii * ar;
          for (l = 0; l < K; l++) {
            tt += A[pa + l * ak] * A[pb + l * ak];
          }
          C[offsetC + ii * sc1 + jj * sc2] += alpha * tt;
        }
      }
      for (i = j + 4; i + 4 <= N; i += 4) {
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
        pa0 = offsetA + i * ar;
        pa1 = pa0 + ar;
        pa2 = pa1 + ar;
        pa3 = pa2 + ar;
        for (l = 0; l < K; l++) {
          pak = l * ak;
          a0 = A[pa0 + pak];
          a1 = A[pa1 + pak];
          a2 = A[pa2 + pak];
          a3 = A[pa3 + pak];
          b0 = A[pb0 + pak];
          b1 = A[pb1 + pak];
          b2 = A[pb2 + pak];
          b3 = A[pb3 + pak];
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
        pc = offsetC + i * sc1 + j * sc2;
        pcc = pc;
        C[pcc] += alpha * c00;
        C[pcc + sc1] += alpha * c10;
        C[pcc + 2 * sc1] += alpha * c20;
        C[pcc + 3 * sc1] += alpha * c30;
        pcc = pc + sc2;
        C[pcc] += alpha * c01;
        C[pcc + sc1] += alpha * c11;
        C[pcc + 2 * sc1] += alpha * c21;
        C[pcc + 3 * sc1] += alpha * c31;
        pcc = pc + 2 * sc2;
        C[pcc] += alpha * c02;
        C[pcc + sc1] += alpha * c12;
        C[pcc + 2 * sc1] += alpha * c22;
        C[pcc + 3 * sc1] += alpha * c32;
        pcc = pc + 3 * sc2;
        C[pcc] += alpha * c03;
        C[pcc + sc1] += alpha * c13;
        C[pcc + 2 * sc1] += alpha * c23;
        C[pcc + 3 * sc1] += alpha * c33;
      }
      for (jj = j; jj < j + 4; jj++) {
        pb = offsetA + jj * ar;
        for (ii = i; ii < N; ii++) {
          tt = 0;
          pa = offsetA + ii * ar;
          for (l = 0; l < K; l++) {
            tt += A[pa + l * ak] * A[pb + l * ak];
          }
          C[offsetC + ii * sc1 + jj * sc2] += alpha * tt;
        }
      }
    }
    for (jj = nb; jj < N; jj++) {
      pb = offsetA + jj * ar;
      for (ii = jj; ii < N; ii++) {
        tt = 0;
        pa = offsetA + ii * ar;
        for (l = 0; l < K; l++) {
          tt += A[pa + l * ak] * A[pb + l * ak];
        }
        C[offsetC + ii * sc1 + jj * sc2] += alpha * tt;
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
  if (alpha === 0 || K === 0) {
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
* @license MIT
*
* Copyright (c) 2026 Ricky Reusser.
*
* Derived from the BLAS 3.12.0 reference implementation (BSD-3-Clause).
* See LICENSE.txt in the repository root for the full license text and
* upstream attribution.
*/
/**
* @license MIT
*
* Copyright (c) 2026 Ricky Reusser.
*
* Derived from the LAPACK 3.12.0 reference implementation (BSD-3-Clause).
* See LICENSE.txt in the repository root for the full license text and
* upstream attribution.
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
