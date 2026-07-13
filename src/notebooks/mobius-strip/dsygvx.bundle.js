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

// ../notes/node_modules/@stdlib/assert/is-int32array/lib/main.js
var require_main6 = __commonJS({
  "../notes/node_modules/@stdlib/assert/is-int32array/lib/main.js"(exports, module) {
    "use strict";
    var nativeClass = require_lib5();
    var hasInt32Array = typeof Int32Array === "function";
    function isInt32Array(value) {
      return hasInt32Array && value instanceof Int32Array || // eslint-disable-line stdlib/require-globals
      nativeClass(value) === "[object Int32Array]";
    }
    module.exports = isInt32Array;
  }
});

// ../notes/node_modules/@stdlib/assert/is-int32array/lib/index.js
var require_lib6 = __commonJS({
  "../notes/node_modules/@stdlib/assert/is-int32array/lib/index.js"(exports, module) {
    "use strict";
    var isInt32Array = require_main6();
    module.exports = isInt32Array;
  }
});

// ../notes/node_modules/@stdlib/constants/int32/max/lib/index.js
var require_lib7 = __commonJS({
  "../notes/node_modules/@stdlib/constants/int32/max/lib/index.js"(exports, module) {
    "use strict";
    var INT32_MAX = 2147483647 | 0;
    module.exports = INT32_MAX;
  }
});

// ../notes/node_modules/@stdlib/constants/int32/min/lib/index.js
var require_lib8 = __commonJS({
  "../notes/node_modules/@stdlib/constants/int32/min/lib/index.js"(exports, module) {
    "use strict";
    var INT32_MIN = -2147483648 | 0;
    module.exports = INT32_MIN;
  }
});

// ../notes/node_modules/@stdlib/assert/has-int32array-support/lib/int32array.js
var require_int32array = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-int32array-support/lib/int32array.js"(exports, module) {
    "use strict";
    var main = typeof Int32Array === "function" ? Int32Array : null;
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/assert/has-int32array-support/lib/main.js
var require_main7 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-int32array-support/lib/main.js"(exports, module) {
    "use strict";
    var isInt32Array = require_lib6();
    var INT32_MAX = require_lib7();
    var INT32_MIN = require_lib8();
    var GlobalInt32Array = require_int32array();
    function hasInt32ArraySupport() {
      var bool;
      var arr;
      if (typeof GlobalInt32Array !== "function") {
        return false;
      }
      try {
        arr = new GlobalInt32Array([1, 3.14, -3.14, INT32_MAX + 1]);
        bool = isInt32Array(arr) && arr[0] === 1 && arr[1] === 3 && // truncation
        arr[2] === -3 && // truncation
        arr[3] === INT32_MIN;
      } catch (err) {
        bool = false;
      }
      return bool;
    }
    module.exports = hasInt32ArraySupport;
  }
});

// ../notes/node_modules/@stdlib/assert/has-int32array-support/lib/index.js
var require_lib9 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-int32array-support/lib/index.js"(exports, module) {
    "use strict";
    var hasInt32ArraySupport = require_main7();
    module.exports = hasInt32ArraySupport;
  }
});

// ../notes/node_modules/@stdlib/array/int32/lib/main.js
var require_main8 = __commonJS({
  "../notes/node_modules/@stdlib/array/int32/lib/main.js"(exports, module) {
    "use strict";
    var ctor = typeof Int32Array === "function" ? Int32Array : void 0;
    module.exports = ctor;
  }
});

// ../notes/node_modules/@stdlib/array/int32/lib/polyfill.js
var require_polyfill2 = __commonJS({
  "../notes/node_modules/@stdlib/array/int32/lib/polyfill.js"(exports, module) {
    "use strict";
    function polyfill() {
      throw new Error("not implemented");
    }
    module.exports = polyfill;
  }
});

// ../notes/node_modules/@stdlib/array/int32/lib/index.js
var require_lib10 = __commonJS({
  "../notes/node_modules/@stdlib/array/int32/lib/index.js"(exports, module) {
    "use strict";
    var hasInt32ArraySupport = require_lib9();
    var builtin = require_main8();
    var polyfill = require_polyfill2();
    var ctor;
    if (hasInt32ArraySupport()) {
      ctor = builtin;
    } else {
      ctor = polyfill;
    }
    module.exports = ctor;
  }
});

// ../notes/node_modules/@stdlib/assert/is-float64array/lib/main.js
var require_main9 = __commonJS({
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
var require_lib11 = __commonJS({
  "../notes/node_modules/@stdlib/assert/is-float64array/lib/index.js"(exports, module) {
    "use strict";
    var isFloat64Array = require_main9();
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
var require_main10 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-float64array-support/lib/main.js"(exports, module) {
    "use strict";
    var isFloat64Array = require_lib11();
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
var require_lib12 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-float64array-support/lib/index.js"(exports, module) {
    "use strict";
    var hasFloat64ArraySupport = require_main10();
    module.exports = hasFloat64ArraySupport;
  }
});

// ../notes/node_modules/@stdlib/array/float64/lib/main.js
var require_main11 = __commonJS({
  "../notes/node_modules/@stdlib/array/float64/lib/main.js"(exports, module) {
    "use strict";
    var ctor = typeof Float64Array === "function" ? Float64Array : void 0;
    module.exports = ctor;
  }
});

// ../notes/node_modules/@stdlib/array/float64/lib/polyfill.js
var require_polyfill3 = __commonJS({
  "../notes/node_modules/@stdlib/array/float64/lib/polyfill.js"(exports, module) {
    "use strict";
    function polyfill() {
      throw new Error("not implemented");
    }
    module.exports = polyfill;
  }
});

// ../notes/node_modules/@stdlib/array/float64/lib/index.js
var require_lib13 = __commonJS({
  "../notes/node_modules/@stdlib/array/float64/lib/index.js"(exports, module) {
    "use strict";
    var hasFloat64ArraySupport = require_lib12();
    var builtin = require_main11();
    var polyfill = require_polyfill3();
    var ctor;
    if (hasFloat64ArraySupport()) {
      ctor = builtin;
    } else {
      ctor = polyfill;
    }
    module.exports = ctor;
  }
});

// ../notes/lib/blas/base/dtrsm/lib/base.js
function dtrsm(side, uplo, transa, diag, M5, N, alpha, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB) {
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
  if (M5 === 0 || N === 0) {
    return B;
  }
  if (alpha === 0) {
    for (j = 0; j < N; j++) {
      pb = offsetB + j * strideB2;
      for (i = 0; i < M5; i++) {
        B[pb] = 0;
        pb += strideB1;
      }
    }
    return B;
  }
  nounit = diag === "non-unit";
  if (side === "left") {
    MM = M5;
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
    NN = M5;
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
var base_default = dtrsm;

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
var base_default2 = dsyrk;

// ../notes/lib/lapack/base/dpotrf2/lib/base.js
function dpotrf2(uplo, N, A, strideA1, strideA2, offsetA) {
  var upper;
  var iinfo;
  var sa1;
  var sa2;
  var n1;
  var n2;
  upper = uplo === "upper";
  sa1 = strideA1;
  sa2 = strideA2;
  if (N === 0) {
    return 0;
  }
  if (N === 1) {
    if (A[offsetA] <= 0 || A[offsetA] !== A[offsetA]) {
      return 1;
    }
    A[offsetA] = Math.sqrt(A[offsetA]);
    return 0;
  }
  n1 = N / 2 | 0;
  n2 = N - n1;
  iinfo = dpotrf2(uplo, n1, A, sa1, sa2, offsetA);
  if (iinfo !== 0) {
    return iinfo;
  }
  if (upper) {
    base_default("left", "upper", "transpose", "non-unit", n1, n2, 1, A, sa1, sa2, offsetA, A, sa1, sa2, offsetA + n1 * sa2);
    base_default2(uplo, "transpose", n2, n1, -1, A, sa1, sa2, offsetA + n1 * sa2, 1, A, sa1, sa2, offsetA + n1 * sa1 + n1 * sa2);
    iinfo = dpotrf2(uplo, n2, A, sa1, sa2, offsetA + n1 * sa1 + n1 * sa2);
    if (iinfo !== 0) {
      return iinfo + n1;
    }
  } else {
    base_default("right", "lower", "transpose", "non-unit", n2, n1, 1, A, sa1, sa2, offsetA, A, sa1, sa2, offsetA + n1 * sa1);
    base_default2(uplo, "no-transpose", n2, n1, -1, A, sa1, sa2, offsetA + n1 * sa1, 1, A, sa1, sa2, offsetA + n1 * sa1 + n1 * sa2);
    iinfo = dpotrf2(uplo, n2, A, sa1, sa2, offsetA + n1 * sa1 + n1 * sa2);
    if (iinfo !== 0) {
      return iinfo + n1;
    }
  }
  return 0;
}
var base_default3 = dpotrf2;

// ../notes/lib/blas/base/dgemm/lib/base.js
var MC = 128;
var NC = 64;
var KC = 256;
function dgemm(transa, transb, M5, N, K, alpha, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB, beta, C, strideC1, strideC2, offsetC) {
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
  if (M5 === 0 || N === 0 || (alpha === 0 || K === 0) && beta === 1) {
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
        for (i = 0; i < M5; i++) {
          C[pc] = 0;
          pc += strideC1;
        }
      } else {
        for (i = 0; i < M5; i++) {
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
      for (ic = 0; ic < M5; ic += MC) {
        icEnd = ic + MC;
        if (icEnd > M5) {
          icEnd = M5;
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
      for (ii = 0; ii < M5; ii++) {
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
var base_default4 = dgemm;

// ../notes/lib/lapack/base/dpotrf/lib/base.js
var NB = 64;
function dpotrf(uplo, N, A, strideA1, strideA2, offsetA) {
  var upper;
  var info;
  var sa1;
  var sa2;
  var jb;
  var j;
  upper = uplo === "upper";
  if (N === 0) {
    return 0;
  }
  sa1 = strideA1;
  sa2 = strideA2;
  if (NB <= 1 || NB >= N) {
    return base_default3(uplo, N, A, sa1, sa2, offsetA);
  }
  if (upper) {
    for (j = 0; j < N; j += NB) {
      jb = Math.min(NB, N - j);
      base_default2("upper", "transpose", jb, j, -1, A, sa1, sa2, offsetA + j * sa2, 1, A, sa1, sa2, offsetA + j * sa1 + j * sa2);
      info = base_default3("upper", jb, A, sa1, sa2, offsetA + j * sa1 + j * sa2);
      if (info !== 0) {
        return info + j;
      }
      if (j + jb < N) {
        base_default4("transpose", "no-transpose", jb, N - j - jb, j, -1, A, sa1, sa2, offsetA + j * sa2, A, sa1, sa2, offsetA + (j + jb) * sa2, 1, A, sa1, sa2, offsetA + j * sa1 + (j + jb) * sa2);
        base_default("left", "upper", "transpose", "non-unit", jb, N - j - jb, 1, A, sa1, sa2, offsetA + j * sa1 + j * sa2, A, sa1, sa2, offsetA + j * sa1 + (j + jb) * sa2);
      }
    }
  } else {
    for (j = 0; j < N; j += NB) {
      jb = Math.min(NB, N - j);
      base_default2("lower", "no-transpose", jb, j, -1, A, sa1, sa2, offsetA + j * sa1, 1, A, sa1, sa2, offsetA + j * sa1 + j * sa2);
      info = base_default3("lower", jb, A, sa1, sa2, offsetA + j * sa1 + j * sa2);
      if (info !== 0) {
        return info + j;
      }
      if (j + jb < N) {
        base_default4("no-transpose", "transpose", N - j - jb, jb, j, -1, A, sa1, sa2, offsetA + (j + jb) * sa1, A, sa1, sa2, offsetA + j * sa1, 1, A, sa1, sa2, offsetA + (j + jb) * sa1 + j * sa2);
        base_default("right", "lower", "transpose", "non-unit", N - j - jb, jb, 1, A, sa1, sa2, offsetA + j * sa1 + j * sa2, A, sa1, sa2, offsetA + (j + jb) * sa1 + j * sa2);
      }
    }
  }
  return 0;
}
var base_default5 = dpotrf;

// ../notes/lib/blas/base/daxpy/lib/base.js
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
var base_default6 = daxpy;

// ../notes/lib/blas/base/dscal/lib/base.js
var M2 = 5;
function dscal(N, da, x, strideX, offsetX) {
  var ix;
  var m;
  var i;
  if (N <= 0) {
    return x;
  }
  ix = offsetX;
  if (strideX === 1) {
    m = N % M2;
    if (m > 0) {
      for (i = 0; i < m; i++) {
        x[ix] *= da;
        ix += 1;
      }
    }
    if (N < M2) {
      return x;
    }
    for (i = m; i < N; i += M2) {
      x[ix] *= da;
      x[ix + 1] *= da;
      x[ix + 2] *= da;
      x[ix + 3] *= da;
      x[ix + 4] *= da;
      ix += M2;
    }
    return x;
  }
  for (i = 0; i < N; i++) {
    x[ix] *= da;
    ix += strideX;
  }
  return x;
}
var base_default7 = dscal;

// ../notes/lib/blas/base/dsyr2/lib/base.js
function dsyr2(uplo, N, alpha, x, strideX, offsetX, y, strideY, offsetY, A, strideA1, strideA2, offsetA) {
  var upper;
  var sa1;
  var sa2;
  var t10;
  var t11;
  var t12;
  var t13;
  var t20;
  var t21;
  var t22;
  var t23;
  var sx;
  var sy;
  var x0;
  var x1;
  var x2;
  var x3;
  var y0;
  var y1;
  var y2;
  var y3;
  var t1;
  var t2;
  var xv;
  var yv;
  var a0;
  var a1;
  var a2;
  var a3;
  var n4;
  var ix;
  var iy;
  var jx;
  var jy;
  var kx;
  var ky;
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
  sy = strideY;
  n4 = N - N % 4;
  if (Math.abs(sa1) <= Math.abs(sa2)) {
    jx = offsetX;
    jy = offsetY;
    for (j = 0; j < n4; j += 4) {
      x0 = x[jx];
      x1 = x[jx + sx];
      x2 = x[jx + 2 * sx];
      x3 = x[jx + 3 * sx];
      y0 = y[jy];
      y1 = y[jy + sy];
      y2 = y[jy + 2 * sy];
      y3 = y[jy + 3 * sy];
      if ((x0 !== 0 || y0 !== 0) && (x1 !== 0 || y1 !== 0) && (x2 !== 0 || y2 !== 0) && (x3 !== 0 || y3 !== 0)) {
        t10 = alpha * y0;
        t11 = alpha * y1;
        t12 = alpha * y2;
        t13 = alpha * y3;
        t20 = alpha * x0;
        t21 = alpha * x1;
        t22 = alpha * x2;
        t23 = alpha * x3;
        if (upper) {
          a0 = offsetA + j * sa2;
          a1 = a0 + sa2;
          a2 = a1 + sa2;
          a3 = a2 + sa2;
          ix = offsetX;
          iy = offsetY;
          for (i = 0; i <= j; i++) {
            xv = x[ix];
            yv = y[iy];
            A[a0] += xv * t10 + yv * t20;
            A[a1] += xv * t11 + yv * t21;
            A[a2] += xv * t12 + yv * t22;
            A[a3] += xv * t13 + yv * t23;
            a0 += sa1;
            a1 += sa1;
            a2 += sa1;
            a3 += sa1;
            ix += sx;
            iy += sy;
          }
          x0 = x[ix];
          x1 = x[ix + sx];
          x2 = x[ix + 2 * sx];
          y0 = y[iy];
          y1 = y[iy + sy];
          y2 = y[iy + 2 * sy];
          A[a1] += x0 * t11 + y0 * t21;
          A[a2] += x0 * t12 + y0 * t22;
          A[a2 + sa1] += x1 * t12 + y1 * t22;
          A[a3] += x0 * t13 + y0 * t23;
          A[a3 + sa1] += x1 * t13 + y1 * t23;
          A[a3 + 2 * sa1] += x2 * t13 + y2 * t23;
        } else {
          a0 = offsetA + j * sa2 + j * sa1;
          A[a0] += x0 * t10 + y0 * t20;
          A[a0 + sa1] += x1 * t10 + y1 * t20;
          A[a0 + 2 * sa1] += x2 * t10 + y2 * t20;
          a1 = a0 + sa2 + sa1;
          A[a1] += x1 * t11 + y1 * t21;
          A[a1 + sa1] += x2 * t11 + y2 * t21;
          a2 = a1 + sa2 + sa1;
          A[a2] += x2 * t12 + y2 * t22;
          a0 = offsetA + j * sa2 + (j + 3) * sa1;
          a1 = a0 + sa2;
          a2 = a1 + sa2;
          a3 = a2 + sa2;
          ix = jx + 3 * sx;
          iy = jy + 3 * sy;
          for (i = j + 3; i < N; i++) {
            xv = x[ix];
            yv = y[iy];
            A[a0] += xv * t10 + yv * t20;
            A[a1] += xv * t11 + yv * t21;
            A[a2] += xv * t12 + yv * t22;
            A[a3] += xv * t13 + yv * t23;
            a0 += sa1;
            a1 += sa1;
            a2 += sa1;
            a3 += sa1;
            ix += sx;
            iy += sy;
          }
        }
      } else {
        kx = jx;
        ky = jy;
        for (k = j; k < j + 4; k++) {
          xv = x[kx];
          yv = y[ky];
          if (xv !== 0 || yv !== 0) {
            t1 = alpha * yv;
            t2 = alpha * xv;
            if (upper) {
              a0 = offsetA + k * sa2;
              ix = offsetX;
              iy = offsetY;
              for (i = 0; i <= k; i++) {
                A[a0] += x[ix] * t1 + y[iy] * t2;
                a0 += sa1;
                ix += sx;
                iy += sy;
              }
            } else {
              a0 = offsetA + k * sa2 + k * sa1;
              ix = kx;
              iy = ky;
              for (i = k; i < N; i++) {
                A[a0] += x[ix] * t1 + y[iy] * t2;
                a0 += sa1;
                ix += sx;
                iy += sy;
              }
            }
          }
          kx += sx;
          ky += sy;
        }
      }
      jx += 4 * sx;
      jy += 4 * sy;
    }
    for (j = n4; j < N; j++) {
      xv = x[jx];
      yv = y[jy];
      if (xv !== 0 || yv !== 0) {
        t1 = alpha * yv;
        t2 = alpha * xv;
        if (upper) {
          a0 = offsetA + j * sa2;
          ix = offsetX;
          iy = offsetY;
          for (i = 0; i <= j; i++) {
            A[a0] += x[ix] * t1 + y[iy] * t2;
            a0 += sa1;
            ix += sx;
            iy += sy;
          }
        } else {
          a0 = offsetA + j * sa2 + j * sa1;
          ix = jx;
          iy = jy;
          for (i = j; i < N; i++) {
            A[a0] += x[ix] * t1 + y[iy] * t2;
            a0 += sa1;
            ix += sx;
            iy += sy;
          }
        }
      }
      jx += sx;
      jy += sy;
    }
  } else {
    kx = offsetX;
    ky = offsetY;
    for (i = 0; i < n4; i += 4) {
      x0 = x[kx];
      x1 = x[kx + sx];
      x2 = x[kx + 2 * sx];
      x3 = x[kx + 3 * sx];
      y0 = y[ky];
      y1 = y[ky + sy];
      y2 = y[ky + 2 * sy];
      y3 = y[ky + 3 * sy];
      if (upper) {
        if (x0 !== 0 || y0 !== 0) {
          t1 = alpha * y0;
          t2 = alpha * x0;
          A[offsetA + i * sa1 + i * sa2] += x0 * t1 + y0 * t2;
        }
        if (x1 !== 0 || y1 !== 0) {
          t1 = alpha * y1;
          t2 = alpha * x1;
          a0 = offsetA + i * sa1 + (i + 1) * sa2;
          A[a0] += x0 * t1 + y0 * t2;
          A[a0 + sa1] += x1 * t1 + y1 * t2;
        }
        if (x2 !== 0 || y2 !== 0) {
          t1 = alpha * y2;
          t2 = alpha * x2;
          a0 = offsetA + i * sa1 + (i + 2) * sa2;
          A[a0] += x0 * t1 + y0 * t2;
          A[a0 + sa1] += x1 * t1 + y1 * t2;
          A[a0 + 2 * sa1] += x2 * t1 + y2 * t2;
        }
        a0 = offsetA + i * sa1 + (i + 3) * sa2;
        a1 = a0 + sa1;
        a2 = a1 + sa1;
        a3 = a2 + sa1;
        jx = kx + 3 * sx;
        jy = ky + 3 * sy;
        for (j = i + 3; j < N; j++) {
          xv = x[jx];
          yv = y[jy];
          if (xv !== 0 || yv !== 0) {
            t1 = alpha * yv;
            t2 = alpha * xv;
            A[a0] += x0 * t1 + y0 * t2;
            A[a1] += x1 * t1 + y1 * t2;
            A[a2] += x2 * t1 + y2 * t2;
            A[a3] += x3 * t1 + y3 * t2;
          }
          a0 += sa2;
          a1 += sa2;
          a2 += sa2;
          a3 += sa2;
          jx += sx;
          jy += sy;
        }
      } else {
        a0 = offsetA + i * sa1;
        a1 = a0 + sa1;
        a2 = a1 + sa1;
        a3 = a2 + sa1;
        jx = offsetX;
        jy = offsetY;
        for (j = 0; j <= i; j++) {
          xv = x[jx];
          yv = y[jy];
          if (xv !== 0 || yv !== 0) {
            t1 = alpha * yv;
            t2 = alpha * xv;
            A[a0] += x0 * t1 + y0 * t2;
            A[a1] += x1 * t1 + y1 * t2;
            A[a2] += x2 * t1 + y2 * t2;
            A[a3] += x3 * t1 + y3 * t2;
          }
          a0 += sa2;
          a1 += sa2;
          a2 += sa2;
          a3 += sa2;
          jx += sx;
          jy += sy;
        }
        if (x1 !== 0 || y1 !== 0) {
          t1 = alpha * y1;
          t2 = alpha * x1;
          a0 = offsetA + (i + 1) * sa1 + (i + 1) * sa2;
          A[a0] += x1 * t1 + y1 * t2;
          A[a0 + sa1] += x2 * t1 + y2 * t2;
          A[a0 + 2 * sa1] += x3 * t1 + y3 * t2;
        }
        if (x2 !== 0 || y2 !== 0) {
          t1 = alpha * y2;
          t2 = alpha * x2;
          a0 = offsetA + (i + 2) * sa1 + (i + 2) * sa2;
          A[a0] += x2 * t1 + y2 * t2;
          A[a0 + sa1] += x3 * t1 + y3 * t2;
        }
        if (x3 !== 0 || y3 !== 0) {
          t1 = alpha * y3;
          t2 = alpha * x3;
          A[offsetA + (i + 3) * sa1 + (i + 3) * sa2] += x3 * t1 + y3 * t2;
        }
      }
      kx += 4 * sx;
      ky += 4 * sy;
    }
    for (i = n4; i < N; i++) {
      x0 = x[kx];
      y0 = y[ky];
      if (upper) {
        a0 = offsetA + i * sa1 + i * sa2;
        jx = kx;
        jy = ky;
        for (j = i; j < N; j++) {
          xv = x[jx];
          yv = y[jy];
          if (xv !== 0 || yv !== 0) {
            t1 = alpha * yv;
            t2 = alpha * xv;
            A[a0] += x0 * t1 + y0 * t2;
          }
          a0 += sa2;
          jx += sx;
          jy += sy;
        }
      } else {
        a0 = offsetA + i * sa1;
        jx = offsetX;
        jy = offsetY;
        for (j = 0; j <= i; j++) {
          xv = x[jx];
          yv = y[jy];
          if (xv !== 0 || yv !== 0) {
            t1 = alpha * yv;
            t2 = alpha * xv;
            A[a0] += x0 * t1 + y0 * t2;
          }
          a0 += sa2;
          jx += sx;
          jy += sy;
        }
      }
      kx += sx;
      ky += sy;
    }
  }
  return A;
}
var base_default8 = dsyr2;

// ../notes/lib/blas/base/dtrmv/lib/base.js
function dtrmv(uplo, trans, diag, N, A, strideA1, strideA2, offsetA, x, strideX, offsetX) {
  var nounit;
  var upper;
  var temp;
  var sb1;
  var sb2;
  var id0;
  var id1;
  var id2;
  var id3;
  var sd;
  var sx;
  var x0;
  var x1;
  var x2;
  var x3;
  var s0;
  var s1;
  var s2;
  var s3;
  var a0;
  var a1;
  var a2;
  var a3;
  var ia;
  var ix;
  var jx;
  var xv;
  var i;
  var j;
  if (N <= 0) {
    return x;
  }
  nounit = diag === "non-unit";
  if (trans === "no-transpose") {
    sb1 = strideA1;
    sb2 = strideA2;
    upper = uplo === "upper";
  } else {
    sb1 = strideA2;
    sb2 = strideA1;
    upper = uplo === "lower";
  }
  sd = sb1 + sb2;
  sx = strideX;
  if (upper) {
    if (Math.abs(sb2) <= Math.abs(sb1)) {
      jx = offsetX;
      for (i = 0; i + 3 < N; i += 4) {
        x0 = x[jx];
        x1 = x[jx + sx];
        x2 = x[jx + 2 * sx];
        x3 = x[jx + 3 * sx];
        id0 = offsetA + i * sd;
        id1 = id0 + sd;
        id2 = id1 + sd;
        id3 = id2 + sd;
        if (nounit) {
          s0 = A[id0] * x0;
          s1 = A[id1] * x1;
          s2 = A[id2] * x2;
          s3 = A[id3] * x3;
        } else {
          s0 = x0;
          s1 = x1;
          s2 = x2;
          s3 = x3;
        }
        s0 += A[id0 + sb2] * x1 + A[id0 + 2 * sb2] * x2 + A[id0 + 3 * sb2] * x3;
        s1 += A[id1 + sb2] * x2 + A[id1 + 2 * sb2] * x3;
        s2 += A[id2 + sb2] * x3;
        a0 = id0 + 4 * sb2;
        a1 = a0 + sb1;
        a2 = a1 + sb1;
        a3 = a2 + sb1;
        ix = jx + 4 * sx;
        for (j = i + 4; j < N; j++) {
          xv = x[ix];
          s0 += A[a0] * xv;
          s1 += A[a1] * xv;
          s2 += A[a2] * xv;
          s3 += A[a3] * xv;
          a0 += sb2;
          a1 += sb2;
          a2 += sb2;
          a3 += sb2;
          ix += sx;
        }
        x[jx] = s0;
        x[jx + sx] = s1;
        x[jx + 2 * sx] = s2;
        x[jx + 3 * sx] = s3;
        jx += 4 * sx;
      }
      for (; i < N; i++) {
        temp = nounit ? A[offsetA + i * sd] * x[jx] : x[jx];
        ia = offsetA + i * sd + sb2;
        ix = jx + sx;
        for (j = i + 1; j < N; j++) {
          temp += A[ia] * x[ix];
          ia += sb2;
          ix += sx;
        }
        x[jx] = temp;
        jx += sx;
      }
      return x;
    }
    jx = offsetX;
    for (j = 0; j + 3 < N; j += 4) {
      x0 = x[jx];
      x1 = x[jx + sx];
      x2 = x[jx + 2 * sx];
      x3 = x[jx + 3 * sx];
      a0 = offsetA + j * sb2;
      a1 = a0 + sb2;
      a2 = a1 + sb2;
      a3 = a2 + sb2;
      ix = offsetX;
      for (i = 0; i < j; i++) {
        x[ix] += x0 * A[a0] + x1 * A[a1] + x2 * A[a2] + x3 * A[a3];
        a0 += sb1;
        a1 += sb1;
        a2 += sb1;
        a3 += sb1;
        ix += sx;
      }
      id0 = offsetA + j * sd;
      id1 = id0 + sd;
      id2 = id1 + sd;
      id3 = id2 + sd;
      s0 = (nounit ? A[id0] * x0 : x0) + A[id0 + sb2] * x1 + A[id0 + 2 * sb2] * x2 + A[id0 + 3 * sb2] * x3;
      s1 = (nounit ? A[id1] * x1 : x1) + A[id1 + sb2] * x2 + A[id1 + 2 * sb2] * x3;
      s2 = (nounit ? A[id2] * x2 : x2) + A[id2 + sb2] * x3;
      s3 = nounit ? A[id3] * x3 : x3;
      x[jx] = s0;
      x[jx + sx] = s1;
      x[jx + 2 * sx] = s2;
      x[jx + 3 * sx] = s3;
      jx += 4 * sx;
    }
    for (; j < N; j++) {
      if (x[jx] !== 0) {
        temp = x[jx];
        ia = offsetA + j * sb2;
        ix = offsetX;
        for (i = 0; i < j; i++) {
          x[ix] += temp * A[ia];
          ia += sb1;
          ix += sx;
        }
        if (nounit) {
          x[jx] *= A[offsetA + j * sd];
        }
      }
      jx += sx;
    }
    return x;
  }
  if (Math.abs(sb2) <= Math.abs(sb1)) {
    jx = offsetX + (N - 4) * sx;
    for (i = N - 4; i >= 0; i -= 4) {
      x0 = x[jx];
      x1 = x[jx + sx];
      x2 = x[jx + 2 * sx];
      x3 = x[jx + 3 * sx];
      id0 = offsetA + i * sd;
      id1 = id0 + sd;
      id2 = id1 + sd;
      id3 = id2 + sd;
      if (nounit) {
        s0 = A[id0] * x0;
        s1 = A[id1] * x1;
        s2 = A[id2] * x2;
        s3 = A[id3] * x3;
      } else {
        s0 = x0;
        s1 = x1;
        s2 = x2;
        s3 = x3;
      }
      s1 += A[id1 - sb2] * x0;
      s2 += A[id2 - 2 * sb2] * x0 + A[id2 - sb2] * x1;
      s3 += A[id3 - 3 * sb2] * x0 + A[id3 - 2 * sb2] * x1 + A[id3 - sb2] * x2;
      a0 = offsetA + i * sb1;
      a1 = a0 + sb1;
      a2 = a1 + sb1;
      a3 = a2 + sb1;
      ix = offsetX;
      for (j = 0; j < i; j++) {
        xv = x[ix];
        s0 += A[a0] * xv;
        s1 += A[a1] * xv;
        s2 += A[a2] * xv;
        s3 += A[a3] * xv;
        a0 += sb2;
        a1 += sb2;
        a2 += sb2;
        a3 += sb2;
        ix += sx;
      }
      x[jx] = s0;
      x[jx + sx] = s1;
      x[jx + 2 * sx] = s2;
      x[jx + 3 * sx] = s3;
      jx -= 4 * sx;
    }
    jx = offsetX + (N % 4 - 1) * sx;
    for (i = N % 4 - 1; i >= 0; i--) {
      temp = nounit ? A[offsetA + i * sd] * x[jx] : x[jx];
      ia = offsetA + i * sb1;
      ix = offsetX;
      for (j = 0; j < i; j++) {
        temp += A[ia] * x[ix];
        ia += sb2;
        ix += sx;
      }
      x[jx] = temp;
      jx -= sx;
    }
    return x;
  }
  jx = offsetX + (N - 4) * sx;
  for (j = N - 4; j >= 0; j -= 4) {
    x0 = x[jx];
    x1 = x[jx + sx];
    x2 = x[jx + 2 * sx];
    x3 = x[jx + 3 * sx];
    a0 = offsetA + (j + 4) * sb1 + j * sb2;
    a1 = a0 + sb2;
    a2 = a1 + sb2;
    a3 = a2 + sb2;
    ix = jx + 4 * sx;
    for (i = j + 4; i < N; i++) {
      x[ix] += x0 * A[a0] + x1 * A[a1] + x2 * A[a2] + x3 * A[a3];
      a0 += sb1;
      a1 += sb1;
      a2 += sb1;
      a3 += sb1;
      ix += sx;
    }
    id0 = offsetA + j * sd;
    id1 = id0 + sd;
    id2 = id1 + sd;
    id3 = id2 + sd;
    s0 = nounit ? A[id0] * x0 : x0;
    s1 = (nounit ? A[id1] * x1 : x1) + A[id1 - sb2] * x0;
    s2 = (nounit ? A[id2] * x2 : x2) + A[id2 - 2 * sb2] * x0 + A[id2 - sb2] * x1;
    s3 = (nounit ? A[id3] * x3 : x3) + A[id3 - 3 * sb2] * x0 + A[id3 - 2 * sb2] * x1 + A[id3 - sb2] * x2;
    x[jx] = s0;
    x[jx + sx] = s1;
    x[jx + 2 * sx] = s2;
    x[jx + 3 * sx] = s3;
    jx -= 4 * sx;
  }
  jx = offsetX + (N % 4 - 1) * sx;
  for (j = N % 4 - 1; j >= 0; j--) {
    if (x[jx] !== 0) {
      temp = x[jx];
      ia = offsetA + (j + 1) * sb1 + j * sb2;
      ix = jx + sx;
      for (i = j + 1; i < N; i++) {
        x[ix] += temp * A[ia];
        ia += sb1;
        ix += sx;
      }
      if (nounit) {
        x[jx] *= A[offsetA + j * sd];
      }
    }
    jx -= sx;
  }
  return x;
}
var base_default9 = dtrmv;

// ../notes/lib/blas/base/dtrsv/lib/base.js
function dtrsv(uplo, trans, diag, N, A, strideA1, strideA2, offsetA, x, strideX, offsetX) {
  var nounit;
  var upper;
  var temp;
  var sb1;
  var sb2;
  var id0;
  var id1;
  var id2;
  var id3;
  var sd;
  var sx;
  var x0;
  var x1;
  var x2;
  var x3;
  var s0;
  var s1;
  var s2;
  var s3;
  var a0;
  var a1;
  var a2;
  var a3;
  var ia;
  var ix;
  var jx;
  var xv;
  var i;
  var j;
  if (N <= 0) {
    return x;
  }
  nounit = diag === "non-unit";
  if (trans === "no-transpose") {
    sb1 = strideA1;
    sb2 = strideA2;
    upper = uplo === "upper";
  } else {
    sb1 = strideA2;
    sb2 = strideA1;
    upper = uplo === "lower";
  }
  sd = sb1 + sb2;
  sx = strideX;
  if (upper) {
    if (Math.abs(sb2) <= Math.abs(sb1)) {
      jx = offsetX + (N - 4) * sx;
      for (i = N - 4; i >= 0; i -= 4) {
        s0 = 0;
        s1 = 0;
        s2 = 0;
        s3 = 0;
        id0 = offsetA + i * sd;
        id1 = id0 + sd;
        id2 = id1 + sd;
        id3 = id2 + sd;
        a0 = id0 + 4 * sb2;
        a1 = a0 + sb1;
        a2 = a1 + sb1;
        a3 = a2 + sb1;
        ix = jx + 4 * sx;
        for (j = i + 4; j < N; j++) {
          xv = x[ix];
          s0 += A[a0] * xv;
          s1 += A[a1] * xv;
          s2 += A[a2] * xv;
          s3 += A[a3] * xv;
          a0 += sb2;
          a1 += sb2;
          a2 += sb2;
          a3 += sb2;
          ix += sx;
        }
        x3 = x[jx + 3 * sx] - s3;
        if (nounit) {
          x3 /= A[id3];
        }
        x2 = x[jx + 2 * sx] - s2 - A[id2 + sb2] * x3;
        if (nounit) {
          x2 /= A[id2];
        }
        x1 = x[jx + sx] - s1 - A[id1 + sb2] * x2 - A[id1 + 2 * sb2] * x3;
        if (nounit) {
          x1 /= A[id1];
        }
        x0 = x[jx] - s0 - A[id0 + sb2] * x1 - A[id0 + 2 * sb2] * x2 - A[id0 + 3 * sb2] * x3;
        if (nounit) {
          x0 /= A[id0];
        }
        x[jx] = x0;
        x[jx + sx] = x1;
        x[jx + 2 * sx] = x2;
        x[jx + 3 * sx] = x3;
        jx -= 4 * sx;
      }
      jx = offsetX + (N % 4 - 1) * sx;
      for (i = N % 4 - 1; i >= 0; i--) {
        temp = x[jx];
        ia = offsetA + i * sd + sb2;
        ix = jx + sx;
        for (j = i + 1; j < N; j++) {
          temp -= A[ia] * x[ix];
          ia += sb2;
          ix += sx;
        }
        if (nounit) {
          temp /= A[offsetA + i * sd];
        }
        x[jx] = temp;
        jx -= sx;
      }
      return x;
    }
    jx = offsetX + (N - 4) * sx;
    for (j = N - 4; j >= 0; j -= 4) {
      id0 = offsetA + j * sd;
      id1 = id0 + sd;
      id2 = id1 + sd;
      id3 = id2 + sd;
      x3 = x[jx + 3 * sx];
      if (nounit) {
        x3 /= A[id3];
      }
      x2 = x[jx + 2 * sx] - A[id2 + sb2] * x3;
      if (nounit) {
        x2 /= A[id2];
      }
      x1 = x[jx + sx] - A[id1 + sb2] * x2 - A[id1 + 2 * sb2] * x3;
      if (nounit) {
        x1 /= A[id1];
      }
      x0 = x[jx] - A[id0 + sb2] * x1 - A[id0 + 2 * sb2] * x2 - A[id0 + 3 * sb2] * x3;
      if (nounit) {
        x0 /= A[id0];
      }
      x[jx] = x0;
      x[jx + sx] = x1;
      x[jx + 2 * sx] = x2;
      x[jx + 3 * sx] = x3;
      a0 = offsetA + j * sb2;
      a1 = a0 + sb2;
      a2 = a1 + sb2;
      a3 = a2 + sb2;
      ix = offsetX;
      for (i = 0; i < j; i++) {
        x[ix] -= x0 * A[a0] + x1 * A[a1] + x2 * A[a2] + x3 * A[a3];
        a0 += sb1;
        a1 += sb1;
        a2 += sb1;
        a3 += sb1;
        ix += sx;
      }
      jx -= 4 * sx;
    }
    jx = offsetX + (N % 4 - 1) * sx;
    for (j = N % 4 - 1; j >= 0; j--) {
      if (x[jx] !== 0) {
        if (nounit) {
          x[jx] /= A[offsetA + j * sd];
        }
        temp = x[jx];
        ia = offsetA + j * sb2;
        ix = offsetX;
        for (i = 0; i < j; i++) {
          x[ix] -= temp * A[ia];
          ia += sb1;
          ix += sx;
        }
      }
      jx -= sx;
    }
    return x;
  }
  if (Math.abs(sb2) <= Math.abs(sb1)) {
    jx = offsetX;
    for (i = 0; i + 3 < N; i += 4) {
      s0 = 0;
      s1 = 0;
      s2 = 0;
      s3 = 0;
      a0 = offsetA + i * sb1;
      a1 = a0 + sb1;
      a2 = a1 + sb1;
      a3 = a2 + sb1;
      ix = offsetX;
      for (j = 0; j < i; j++) {
        xv = x[ix];
        s0 += A[a0] * xv;
        s1 += A[a1] * xv;
        s2 += A[a2] * xv;
        s3 += A[a3] * xv;
        a0 += sb2;
        a1 += sb2;
        a2 += sb2;
        a3 += sb2;
        ix += sx;
      }
      id0 = offsetA + i * sd;
      id1 = id0 + sd;
      id2 = id1 + sd;
      id3 = id2 + sd;
      x0 = x[jx] - s0;
      if (nounit) {
        x0 /= A[id0];
      }
      x1 = x[jx + sx] - s1 - A[id1 - sb2] * x0;
      if (nounit) {
        x1 /= A[id1];
      }
      x2 = x[jx + 2 * sx] - s2 - A[id2 - 2 * sb2] * x0 - A[id2 - sb2] * x1;
      if (nounit) {
        x2 /= A[id2];
      }
      x3 = x[jx + 3 * sx] - s3 - A[id3 - 3 * sb2] * x0 - A[id3 - 2 * sb2] * x1 - A[id3 - sb2] * x2;
      if (nounit) {
        x3 /= A[id3];
      }
      x[jx] = x0;
      x[jx + sx] = x1;
      x[jx + 2 * sx] = x2;
      x[jx + 3 * sx] = x3;
      jx += 4 * sx;
    }
    for (; i < N; i++) {
      temp = x[jx];
      ia = offsetA + i * sb1;
      ix = offsetX;
      for (j = 0; j < i; j++) {
        temp -= A[ia] * x[ix];
        ia += sb2;
        ix += sx;
      }
      if (nounit) {
        temp /= A[offsetA + i * sd];
      }
      x[jx] = temp;
      jx += sx;
    }
    return x;
  }
  jx = offsetX;
  for (j = 0; j + 3 < N; j += 4) {
    id0 = offsetA + j * sd;
    id1 = id0 + sd;
    id2 = id1 + sd;
    id3 = id2 + sd;
    x0 = x[jx];
    if (nounit) {
      x0 /= A[id0];
    }
    x1 = x[jx + sx] - A[id1 - sb2] * x0;
    if (nounit) {
      x1 /= A[id1];
    }
    x2 = x[jx + 2 * sx] - A[id2 - 2 * sb2] * x0 - A[id2 - sb2] * x1;
    if (nounit) {
      x2 /= A[id2];
    }
    x3 = x[jx + 3 * sx] - A[id3 - 3 * sb2] * x0 - A[id3 - 2 * sb2] * x1 - A[id3 - sb2] * x2;
    if (nounit) {
      x3 /= A[id3];
    }
    x[jx] = x0;
    x[jx + sx] = x1;
    x[jx + 2 * sx] = x2;
    x[jx + 3 * sx] = x3;
    a0 = offsetA + (j + 4) * sb1 + j * sb2;
    a1 = a0 + sb2;
    a2 = a1 + sb2;
    a3 = a2 + sb2;
    ix = jx + 4 * sx;
    for (i = j + 4; i < N; i++) {
      x[ix] -= x0 * A[a0] + x1 * A[a1] + x2 * A[a2] + x3 * A[a3];
      a0 += sb1;
      a1 += sb1;
      a2 += sb1;
      a3 += sb1;
      ix += sx;
    }
    jx += 4 * sx;
  }
  for (; j < N; j++) {
    if (x[jx] !== 0) {
      if (nounit) {
        x[jx] /= A[offsetA + j * sd];
      }
      temp = x[jx];
      ia = offsetA + (j + 1) * sb1 + j * sb2;
      ix = jx + sx;
      for (i = j + 1; i < N; i++) {
        x[ix] -= temp * A[ia];
        ia += sb1;
        ix += sx;
      }
    }
    jx += sx;
  }
  return x;
}
var base_default10 = dtrsv;

// ../notes/lib/lapack/base/dsygs2/lib/base.js
function dsygs2(itype, uplo, N, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB) {
  var upper;
  var akk;
  var bkk;
  var sa1;
  var sa2;
  var sb1;
  var sb2;
  var ct;
  var k;
  upper = uplo === "upper";
  if (N === 0) {
    return 0;
  }
  sa1 = strideA1;
  sa2 = strideA2;
  sb1 = strideB1;
  sb2 = strideB2;
  if (itype === 1) {
    if (upper) {
      for (k = 0; k < N; k++) {
        akk = A[offsetA + k * sa1 + k * sa2];
        bkk = B[offsetB + k * sb1 + k * sb2];
        akk /= bkk * bkk;
        A[offsetA + k * sa1 + k * sa2] = akk;
        if (k < N - 1) {
          base_default7(N - k - 1, 1 / bkk, A, sa2, offsetA + k * sa1 + (k + 1) * sa2);
          ct = -0.5 * akk;
          base_default6(N - k - 1, ct, B, sb2, offsetB + k * sb1 + (k + 1) * sb2, A, sa2, offsetA + k * sa1 + (k + 1) * sa2);
          base_default8(uplo, N - k - 1, -1, A, sa2, offsetA + k * sa1 + (k + 1) * sa2, B, sb2, offsetB + k * sb1 + (k + 1) * sb2, A, sa1, sa2, offsetA + (k + 1) * sa1 + (k + 1) * sa2);
          base_default6(N - k - 1, ct, B, sb2, offsetB + k * sb1 + (k + 1) * sb2, A, sa2, offsetA + k * sa1 + (k + 1) * sa2);
          base_default10(uplo, "transpose", "non-unit", N - k - 1, B, sb1, sb2, offsetB + (k + 1) * sb1 + (k + 1) * sb2, A, sa2, offsetA + k * sa1 + (k + 1) * sa2);
        }
      }
    } else {
      for (k = 0; k < N; k++) {
        akk = A[offsetA + k * sa1 + k * sa2];
        bkk = B[offsetB + k * sb1 + k * sb2];
        akk /= bkk * bkk;
        A[offsetA + k * sa1 + k * sa2] = akk;
        if (k < N - 1) {
          base_default7(N - k - 1, 1 / bkk, A, sa1, offsetA + (k + 1) * sa1 + k * sa2);
          ct = -0.5 * akk;
          base_default6(N - k - 1, ct, B, sb1, offsetB + (k + 1) * sb1 + k * sb2, A, sa1, offsetA + (k + 1) * sa1 + k * sa2);
          base_default8(uplo, N - k - 1, -1, A, sa1, offsetA + (k + 1) * sa1 + k * sa2, B, sb1, offsetB + (k + 1) * sb1 + k * sb2, A, sa1, sa2, offsetA + (k + 1) * sa1 + (k + 1) * sa2);
          base_default6(N - k - 1, ct, B, sb1, offsetB + (k + 1) * sb1 + k * sb2, A, sa1, offsetA + (k + 1) * sa1 + k * sa2);
          base_default10(uplo, "no-transpose", "non-unit", N - k - 1, B, sb1, sb2, offsetB + (k + 1) * sb1 + (k + 1) * sb2, A, sa1, offsetA + (k + 1) * sa1 + k * sa2);
        }
      }
    }
  } else {
    if (upper) {
      for (k = 0; k < N; k++) {
        akk = A[offsetA + k * sa1 + k * sa2];
        bkk = B[offsetB + k * sb1 + k * sb2];
        base_default9(uplo, "no-transpose", "non-unit", k, B, sb1, sb2, offsetB, A, sa1, offsetA + k * sa2);
        ct = 0.5 * akk;
        base_default6(k, ct, B, sb1, offsetB + k * sb2, A, sa1, offsetA + k * sa2);
        base_default8(uplo, k, 1, A, sa1, offsetA + k * sa2, B, sb1, offsetB + k * sb2, A, sa1, sa2, offsetA);
        base_default6(k, ct, B, sb1, offsetB + k * sb2, A, sa1, offsetA + k * sa2);
        base_default7(k, bkk, A, sa1, offsetA + k * sa2);
        A[offsetA + k * sa1 + k * sa2] = akk * bkk * bkk;
      }
    } else {
      for (k = 0; k < N; k++) {
        akk = A[offsetA + k * sa1 + k * sa2];
        bkk = B[offsetB + k * sb1 + k * sb2];
        base_default9(uplo, "transpose", "non-unit", k, B, sb1, sb2, offsetB, A, sa2, offsetA + k * sa1);
        ct = 0.5 * akk;
        base_default6(k, ct, B, sb2, offsetB + k * sb1, A, sa2, offsetA + k * sa1);
        base_default8(uplo, k, 1, A, sa2, offsetA + k * sa1, B, sb2, offsetB + k * sb1, A, sa1, sa2, offsetA);
        base_default6(k, ct, B, sb2, offsetB + k * sb1, A, sa2, offsetA + k * sa1);
        base_default7(k, bkk, A, sa2, offsetA + k * sa1);
        A[offsetA + k * sa1 + k * sa2] = akk * bkk * bkk;
      }
    }
  }
  return 0;
}
var base_default11 = dsygs2;

// ../notes/lib/blas/base/dsymm/lib/base.js
var NC2 = 64;
var KC2 = 256;
var PACK = new Float64Array(4 * KC2);
function packRows(A, sa1, sa2, oa, upper, i, nr, kc, kcEnd) {
  var split;
  var pLo;
  var pHi;
  var sLo;
  var sHi;
  var q;
  var r;
  var l;
  q = 0;
  for (r = i; r < i + nr; r++) {
    split = r;
    if (split < kc) {
      split = kc;
    }
    if (split > kcEnd) {
      split = kcEnd;
    }
    if (upper) {
      pLo = oa + kc * sa1 + r * sa2;
      sLo = sa1;
      pHi = oa + r * sa1 + split * sa2;
      sHi = sa2;
    } else {
      pLo = oa + r * sa1 + kc * sa2;
      sLo = sa2;
      pHi = oa + split * sa1 + r * sa2;
      sHi = sa1;
    }
    for (l = kc; l < split; l++) {
      PACK[q] = A[pLo];
      pLo += sLo;
      q += 1;
    }
    for (l = split; l < kcEnd; l++) {
      PACK[q] = A[pHi];
      pHi += sHi;
      q += 1;
    }
  }
}
function dsymm(side, uplo, M5, N, alpha, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB, beta, C, strideC1, strideC2, offsetC) {
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
  var a0;
  var a1;
  var a2;
  var a3;
  var b0;
  var b1;
  var b2;
  var b3;
  var upper;
  var lside;
  var K;
  var NN;
  var sb1;
  var sb2;
  var sc1;
  var sc2;
  var pb0;
  var pb1;
  var pb2;
  var pb3;
  var pc;
  var pcc;
  var pb;
  var jc;
  var kc;
  var j;
  var i;
  var k;
  var l;
  var jj;
  var ii;
  var jcEnd;
  var kcEnd;
  var kcLen;
  var nb;
  var mb;
  var bz;
  var k1;
  var k2;
  var k3;
  var ic;
  var temp;
  var temp1;
  var temp2;
  if (M5 === 0 || N === 0 || alpha === 0 && beta === 1) {
    return C;
  }
  if (alpha === 0) {
    if (beta === 0) {
      for (j = 0; j < N; j++) {
        ic = offsetC + j * strideC2;
        for (i = 0; i < M5; i++) {
          C[ic] = 0;
          ic += strideC1;
        }
      }
    } else {
      for (j = 0; j < N; j++) {
        ic = offsetC + j * strideC2;
        for (i = 0; i < M5; i++) {
          C[ic] *= beta;
          ic += strideC1;
        }
      }
    }
    return C;
  }
  upper = uplo === "upper";
  lside = side === "left";
  if (lside && (M5 < 4 || N < 2) || !lside && (N < 4 || M5 < 2)) {
    if (lside) {
      if (upper) {
        for (j = 0; j < N; j++) {
          for (i = 0; i < M5; i++) {
            temp1 = alpha * B[offsetB + i * strideB1 + j * strideB2];
            temp2 = 0;
            for (k = 0; k < i; k++) {
              C[offsetC + k * strideC1 + j * strideC2] += temp1 * A[offsetA + k * strideA1 + i * strideA2];
              temp2 += B[offsetB + k * strideB1 + j * strideB2] * A[offsetA + k * strideA1 + i * strideA2];
            }
            if (beta === 0) {
              C[offsetC + i * strideC1 + j * strideC2] = temp1 * A[offsetA + i * strideA1 + i * strideA2] + alpha * temp2;
            } else {
              C[offsetC + i * strideC1 + j * strideC2] = beta * C[offsetC + i * strideC1 + j * strideC2] + temp1 * A[offsetA + i * strideA1 + i * strideA2] + alpha * temp2;
            }
          }
        }
      } else {
        for (j = 0; j < N; j++) {
          for (i = M5 - 1; i >= 0; i--) {
            temp1 = alpha * B[offsetB + i * strideB1 + j * strideB2];
            temp2 = 0;
            for (k = i + 1; k < M5; k++) {
              C[offsetC + k * strideC1 + j * strideC2] += temp1 * A[offsetA + k * strideA1 + i * strideA2];
              temp2 += B[offsetB + k * strideB1 + j * strideB2] * A[offsetA + k * strideA1 + i * strideA2];
            }
            if (beta === 0) {
              C[offsetC + i * strideC1 + j * strideC2] = temp1 * A[offsetA + i * strideA1 + i * strideA2] + alpha * temp2;
            } else {
              C[offsetC + i * strideC1 + j * strideC2] = beta * C[offsetC + i * strideC1 + j * strideC2] + temp1 * A[offsetA + i * strideA1 + i * strideA2] + alpha * temp2;
            }
          }
        }
      }
    } else {
      for (j = 0; j < N; j++) {
        temp1 = alpha * A[offsetA + j * strideA1 + j * strideA2];
        if (beta === 0) {
          for (i = 0; i < M5; i++) {
            C[offsetC + i * strideC1 + j * strideC2] = temp1 * B[offsetB + i * strideB1 + j * strideB2];
          }
        } else {
          for (i = 0; i < M5; i++) {
            C[offsetC + i * strideC1 + j * strideC2] = beta * C[offsetC + i * strideC1 + j * strideC2] + temp1 * B[offsetB + i * strideB1 + j * strideB2];
          }
        }
        for (k = 0; k < j; k++) {
          if (upper) {
            temp1 = alpha * A[offsetA + k * strideA1 + j * strideA2];
          } else {
            temp1 = alpha * A[offsetA + j * strideA1 + k * strideA2];
          }
          for (i = 0; i < M5; i++) {
            C[offsetC + i * strideC1 + j * strideC2] += temp1 * B[offsetB + i * strideB1 + k * strideB2];
          }
        }
        for (k = j + 1; k < N; k++) {
          if (upper) {
            temp1 = alpha * A[offsetA + j * strideA1 + k * strideA2];
          } else {
            temp1 = alpha * A[offsetA + k * strideA1 + j * strideA2];
          }
          for (i = 0; i < M5; i++) {
            C[offsetC + i * strideC1 + j * strideC2] += temp1 * B[offsetB + i * strideB1 + k * strideB2];
          }
        }
      }
    }
    return C;
  }
  if (lside) {
    K = M5;
    NN = N;
    sb1 = strideB1;
    sb2 = strideB2;
    sc1 = strideC1;
    sc2 = strideC2;
  } else {
    K = N;
    NN = M5;
    sb1 = strideB2;
    sb2 = strideB1;
    sc1 = strideC2;
    sc2 = strideC1;
  }
  mb = K - K % 4;
  for (jc = 0; jc < NN; jc += NC2) {
    jcEnd = jc + NC2;
    if (jcEnd > NN) {
      jcEnd = NN;
    }
    nb = jc + (jcEnd - jc - (jcEnd - jc) % 4);
    for (kc = 0; kc < K; kc += KC2) {
      kcEnd = kc + KC2;
      if (kcEnd > K) {
        kcEnd = K;
      }
      kcLen = kcEnd - kc;
      bz = kc === 0 ? beta : 1;
      k1 = kcLen;
      k2 = 2 * kcLen;
      k3 = 3 * kcLen;
      for (i = 0; i < mb; i += 4) {
        packRows(A, strideA1, strideA2, offsetA, upper, i, 4, kc, kcEnd);
        for (j = jc; j < nb; j += 4) {
          pb0 = offsetB + j * sb2 + kc * sb1;
          pb1 = pb0 + sb2;
          pb2 = pb1 + sb2;
          pb3 = pb2 + sb2;
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
          for (l = 0; l < kcLen; l++) {
            a0 = PACK[l];
            a1 = PACK[k1 + l];
            a2 = PACK[k2 + l];
            a3 = PACK[k3 + l];
            b0 = B[pb0 + l * sb1];
            b1 = B[pb1 + l * sb1];
            b2 = B[pb2 + l * sb1];
            b3 = B[pb3 + l * sb1];
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
          if (bz === 0) {
            pcc = pc;
            C[pcc] = alpha * c00;
            C[pcc + sc1] = alpha * c10;
            C[pcc + 2 * sc1] = alpha * c20;
            C[pcc + 3 * sc1] = alpha * c30;
            pcc = pc + sc2;
            C[pcc] = alpha * c01;
            C[pcc + sc1] = alpha * c11;
            C[pcc + 2 * sc1] = alpha * c21;
            C[pcc + 3 * sc1] = alpha * c31;
            pcc = pc + 2 * sc2;
            C[pcc] = alpha * c02;
            C[pcc + sc1] = alpha * c12;
            C[pcc + 2 * sc1] = alpha * c22;
            C[pcc + 3 * sc1] = alpha * c32;
            pcc = pc + 3 * sc2;
            C[pcc] = alpha * c03;
            C[pcc + sc1] = alpha * c13;
            C[pcc + 2 * sc1] = alpha * c23;
            C[pcc + 3 * sc1] = alpha * c33;
          } else {
            pcc = pc;
            C[pcc] = alpha * c00 + bz * C[pcc];
            C[pcc + sc1] = alpha * c10 + bz * C[pcc + sc1];
            C[pcc + 2 * sc1] = alpha * c20 + bz * C[pcc + 2 * sc1];
            C[pcc + 3 * sc1] = alpha * c30 + bz * C[pcc + 3 * sc1];
            pcc = pc + sc2;
            C[pcc] = alpha * c01 + bz * C[pcc];
            C[pcc + sc1] = alpha * c11 + bz * C[pcc + sc1];
            C[pcc + 2 * sc1] = alpha * c21 + bz * C[pcc + 2 * sc1];
            C[pcc + 3 * sc1] = alpha * c31 + bz * C[pcc + 3 * sc1];
            pcc = pc + 2 * sc2;
            C[pcc] = alpha * c02 + bz * C[pcc];
            C[pcc + sc1] = alpha * c12 + bz * C[pcc + sc1];
            C[pcc + 2 * sc1] = alpha * c22 + bz * C[pcc + 2 * sc1];
            C[pcc + 3 * sc1] = alpha * c32 + bz * C[pcc + 3 * sc1];
            pcc = pc + 3 * sc2;
            C[pcc] = alpha * c03 + bz * C[pcc];
            C[pcc + sc1] = alpha * c13 + bz * C[pcc + sc1];
            C[pcc + 2 * sc1] = alpha * c23 + bz * C[pcc + 2 * sc1];
            C[pcc + 3 * sc1] = alpha * c33 + bz * C[pcc + 3 * sc1];
          }
        }
        for (jj = nb; jj < jcEnd; jj++) {
          pb = offsetB + jj * sb2 + kc * sb1;
          c00 = 0;
          c10 = 0;
          c20 = 0;
          c30 = 0;
          for (l = 0; l < kcLen; l++) {
            b0 = B[pb + l * sb1];
            c00 += PACK[l] * b0;
            c10 += PACK[k1 + l] * b0;
            c20 += PACK[k2 + l] * b0;
            c30 += PACK[k3 + l] * b0;
          }
          pc = offsetC + i * sc1 + jj * sc2;
          if (bz === 0) {
            C[pc] = alpha * c00;
            C[pc + sc1] = alpha * c10;
            C[pc + 2 * sc1] = alpha * c20;
            C[pc + 3 * sc1] = alpha * c30;
          } else {
            C[pc] = alpha * c00 + bz * C[pc];
            C[pc + sc1] = alpha * c10 + bz * C[pc + sc1];
            C[pc + 2 * sc1] = alpha * c20 + bz * C[pc + 2 * sc1];
            C[pc + 3 * sc1] = alpha * c30 + bz * C[pc + 3 * sc1];
          }
        }
      }
      for (ii = mb; ii < K; ii++) {
        packRows(A, strideA1, strideA2, offsetA, upper, ii, 1, kc, kcEnd);
        for (jj = jc; jj < jcEnd; jj++) {
          pb = offsetB + jj * sb2 + kc * sb1;
          temp = 0;
          for (l = 0; l < kcLen; l++) {
            temp += PACK[l] * B[pb + l * sb1];
          }
          pc = offsetC + ii * sc1 + jj * sc2;
          C[pc] = bz === 0 ? alpha * temp : alpha * temp + bz * C[pc];
        }
      }
    }
  }
  return C;
}
var base_default12 = dsymm;

// ../notes/lib/blas/base/dsyr2k/lib/base.js
function tiled(upper, N, K, alpha, X, strideX1, strideX2, offsetX, Y, strideY1, strideY2, offsetY, C, strideC1, strideC2, offsetC) {
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
  var px0;
  var px1;
  var px2;
  var px3;
  var py0;
  var py1;
  var py2;
  var py3;
  var pcc;
  var pxk;
  var pyk;
  var xr;
  var xk;
  var yr;
  var yk;
  var sc1;
  var sc2;
  var a0;
  var a1;
  var a2;
  var a3;
  var b0;
  var b1;
  var b2;
  var b3;
  var pc;
  var nb;
  var jj;
  var ii;
  var px;
  var py;
  var tt;
  var i;
  var j;
  var l;
  xr = strideX1;
  xk = strideX2;
  yr = strideY1;
  yk = strideY2;
  sc1 = strideC1;
  sc2 = strideC2;
  nb = N - N % 4;
  if (upper) {
    for (j = 0; j < nb; j += 4) {
      py0 = offsetY + j * yr;
      py1 = py0 + yr;
      py2 = py1 + yr;
      py3 = py2 + yr;
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
        px0 = offsetX + i * xr;
        px1 = px0 + xr;
        px2 = px1 + xr;
        px3 = px2 + xr;
        for (l = 0; l < K; l++) {
          pxk = l * xk;
          pyk = l * yk;
          a0 = X[px0 + pxk];
          a1 = X[px1 + pxk];
          a2 = X[px2 + pxk];
          a3 = X[px3 + pxk];
          b0 = Y[py0 + pyk];
          b1 = Y[py1 + pyk];
          b2 = Y[py2 + pyk];
          b3 = Y[py3 + pyk];
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
        py = offsetY + jj * yr;
        for (ii = i; ii <= jj; ii++) {
          tt = 0;
          px = offsetX + ii * xr;
          for (l = 0; l < K; l++) {
            tt += X[px + l * xk] * Y[py + l * yk];
          }
          C[offsetC + ii * sc1 + jj * sc2] += alpha * tt;
        }
      }
    }
    for (jj = nb; jj < N; jj++) {
      py = offsetY + jj * yr;
      for (ii = 0; ii <= jj; ii++) {
        tt = 0;
        px = offsetX + ii * xr;
        for (l = 0; l < K; l++) {
          tt += X[px + l * xk] * Y[py + l * yk];
        }
        C[offsetC + ii * sc1 + jj * sc2] += alpha * tt;
      }
    }
    return C;
  }
  for (j = 0; j < nb; j += 4) {
    py0 = offsetY + j * yr;
    py1 = py0 + yr;
    py2 = py1 + yr;
    py3 = py2 + yr;
    for (jj = j; jj < j + 4; jj++) {
      py = offsetY + jj * yr;
      for (ii = jj; ii < j + 4; ii++) {
        tt = 0;
        px = offsetX + ii * xr;
        for (l = 0; l < K; l++) {
          tt += X[px + l * xk] * Y[py + l * yk];
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
      px0 = offsetX + i * xr;
      px1 = px0 + xr;
      px2 = px1 + xr;
      px3 = px2 + xr;
      for (l = 0; l < K; l++) {
        pxk = l * xk;
        pyk = l * yk;
        a0 = X[px0 + pxk];
        a1 = X[px1 + pxk];
        a2 = X[px2 + pxk];
        a3 = X[px3 + pxk];
        b0 = Y[py0 + pyk];
        b1 = Y[py1 + pyk];
        b2 = Y[py2 + pyk];
        b3 = Y[py3 + pyk];
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
      py = offsetY + jj * yr;
      for (ii = i; ii < N; ii++) {
        tt = 0;
        px = offsetX + ii * xr;
        for (l = 0; l < K; l++) {
          tt += X[px + l * xk] * Y[py + l * yk];
        }
        C[offsetC + ii * sc1 + jj * sc2] += alpha * tt;
      }
    }
  }
  for (jj = nb; jj < N; jj++) {
    py = offsetY + jj * yr;
    for (ii = jj; ii < N; ii++) {
      tt = 0;
      px = offsetX + ii * xr;
      for (l = 0; l < K; l++) {
        tt += X[px + l * xk] * Y[py + l * yk];
      }
      C[offsetC + ii * sc1 + jj * sc2] += alpha * tt;
    }
  }
  return C;
}
function dsyr2k(uplo, trans, N, K, alpha, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB, beta, C, strideC1, strideC2, offsetC) {
  var upper;
  var nota;
  var sc1;
  var sc2;
  var ar;
  var ak;
  var br;
  var bk;
  var ic;
  var i;
  var j;
  upper = uplo === "upper";
  nota = trans === "no-transpose";
  if (N === 0 || (alpha === 0 || K === 0) && beta === 1) {
    return C;
  }
  sc1 = strideC1;
  sc2 = strideC2;
  ar = nota ? strideA1 : strideA2;
  ak = nota ? strideA2 : strideA1;
  br = nota ? strideB1 : strideB2;
  bk = nota ? strideB2 : strideB1;
  if (beta !== 1) {
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
  }
  if (alpha === 0 || K === 0) {
    return C;
  }
  tiled(upper, N, K, alpha, A, ar, ak, offsetA, B, br, bk, offsetB, C, sc1, sc2, offsetC);
  tiled(upper, N, K, alpha, B, br, bk, offsetB, A, ar, ak, offsetA, C, sc1, sc2, offsetC);
  return C;
}
var base_default13 = dsyr2k;

// ../notes/lib/blas/base/dtrmm/lib/base.js
function dtrmm(side, uplo, transa, diag, M5, N, alpha, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB) {
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
  var b00;
  var b01;
  var b02;
  var b03;
  var b10;
  var b11;
  var b12;
  var b13;
  var b20;
  var b21;
  var b22;
  var b23;
  var b30;
  var b31;
  var b32;
  var b33;
  var t01;
  var t02;
  var t03;
  var t12;
  var t13;
  var t23;
  var d0;
  var d1;
  var d2;
  var d3;
  var a0;
  var a1;
  var a2;
  var a3;
  var e0;
  var e1;
  var e2;
  var e3;
  var pa0;
  var pa1;
  var pa2;
  var pa3;
  var pb0;
  var pb1;
  var pb2;
  var pb3;
  var nounit;
  var temp;
  var eup;
  var ea1;
  var ea2;
  var eb1;
  var eb2;
  var nb4;
  var tmp;
  var pd;
  var pb;
  var pw;
  var pa;
  var nr;
  var nc;
  var mb;
  var i0;
  var i;
  var j;
  var l;
  if (M5 === 0 || N === 0) {
    return B;
  }
  if (alpha === 0) {
    for (j = 0; j < N; j++) {
      pb = offsetB + j * strideB2;
      for (i = 0; i < M5; i++) {
        B[pb] = 0;
        pb += strideB1;
      }
    }
    return B;
  }
  nounit = diag === "non-unit";
  eup = uplo === "upper";
  if (side === "left") {
    nr = M5;
    nc = N;
    ea1 = strideA1;
    ea2 = strideA2;
    eb1 = strideB1;
    eb2 = strideB2;
  } else {
    nr = N;
    nc = M5;
    ea1 = strideA2;
    ea2 = strideA1;
    eb1 = strideB2;
    eb2 = strideB1;
    eup = !eup;
  }
  if (transa === "transpose") {
    tmp = ea1;
    ea1 = ea2;
    ea2 = tmp;
    eup = !eup;
  }
  mb = nr - nr % 4;
  nb4 = nc - nc % 4;
  if (eup) {
    for (i0 = 0; i0 < mb; i0 += 4) {
      pd = offsetA + i0 * ea1 + i0 * ea2;
      t01 = A[pd + ea2];
      t02 = A[pd + 2 * ea2];
      t03 = A[pd + 3 * ea2];
      t12 = A[pd + ea1 + 2 * ea2];
      t13 = A[pd + ea1 + 3 * ea2];
      t23 = A[pd + 2 * ea1 + 3 * ea2];
      if (nounit) {
        d0 = A[pd];
        d1 = A[pd + ea1 + ea2];
        d2 = A[pd + 2 * (ea1 + ea2)];
        d3 = A[pd + 3 * (ea1 + ea2)];
      } else {
        d0 = 1;
        d1 = 1;
        d2 = 1;
        d3 = 1;
      }
      for (j = 0; j < nb4; j += 4) {
        pb = offsetB + i0 * eb1 + j * eb2;
        pw = pb;
        b00 = B[pw];
        b10 = B[pw + eb1];
        b20 = B[pw + 2 * eb1];
        b30 = B[pw + 3 * eb1];
        pw += eb2;
        b01 = B[pw];
        b11 = B[pw + eb1];
        b21 = B[pw + 2 * eb1];
        b31 = B[pw + 3 * eb1];
        pw += eb2;
        b02 = B[pw];
        b12 = B[pw + eb1];
        b22 = B[pw + 2 * eb1];
        b32 = B[pw + 3 * eb1];
        pw += eb2;
        b03 = B[pw];
        b13 = B[pw + eb1];
        b23 = B[pw + 2 * eb1];
        b33 = B[pw + 3 * eb1];
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
        pa0 = pd + 4 * ea2;
        pa1 = pa0 + ea1;
        pa2 = pa1 + ea1;
        pa3 = pa2 + ea1;
        pb0 = offsetB + (i0 + 4) * eb1 + j * eb2;
        pb1 = pb0 + eb2;
        pb2 = pb1 + eb2;
        pb3 = pb2 + eb2;
        for (l = i0 + 4; l < nr; l++) {
          a0 = A[pa0];
          a1 = A[pa1];
          a2 = A[pa2];
          a3 = A[pa3];
          e0 = B[pb0];
          e1 = B[pb1];
          e2 = B[pb2];
          e3 = B[pb3];
          c00 += a0 * e0;
          c10 += a1 * e0;
          c20 += a2 * e0;
          c30 += a3 * e0;
          c01 += a0 * e1;
          c11 += a1 * e1;
          c21 += a2 * e1;
          c31 += a3 * e1;
          c02 += a0 * e2;
          c12 += a1 * e2;
          c22 += a2 * e2;
          c32 += a3 * e2;
          c03 += a0 * e3;
          c13 += a1 * e3;
          c23 += a2 * e3;
          c33 += a3 * e3;
          pa0 += ea2;
          pa1 += ea2;
          pa2 += ea2;
          pa3 += ea2;
          pb0 += eb1;
          pb1 += eb1;
          pb2 += eb1;
          pb3 += eb1;
        }
        c00 += d0 * b00 + t01 * b10 + t02 * b20 + t03 * b30;
        c01 += d0 * b01 + t01 * b11 + t02 * b21 + t03 * b31;
        c02 += d0 * b02 + t01 * b12 + t02 * b22 + t03 * b32;
        c03 += d0 * b03 + t01 * b13 + t02 * b23 + t03 * b33;
        c10 += d1 * b10 + t12 * b20 + t13 * b30;
        c11 += d1 * b11 + t12 * b21 + t13 * b31;
        c12 += d1 * b12 + t12 * b22 + t13 * b32;
        c13 += d1 * b13 + t12 * b23 + t13 * b33;
        c20 += d2 * b20 + t23 * b30;
        c21 += d2 * b21 + t23 * b31;
        c22 += d2 * b22 + t23 * b32;
        c23 += d2 * b23 + t23 * b33;
        c30 += d3 * b30;
        c31 += d3 * b31;
        c32 += d3 * b32;
        c33 += d3 * b33;
        pw = pb;
        B[pw] = alpha * c00;
        B[pw + eb1] = alpha * c10;
        B[pw + 2 * eb1] = alpha * c20;
        B[pw + 3 * eb1] = alpha * c30;
        pw += eb2;
        B[pw] = alpha * c01;
        B[pw + eb1] = alpha * c11;
        B[pw + 2 * eb1] = alpha * c21;
        B[pw + 3 * eb1] = alpha * c31;
        pw += eb2;
        B[pw] = alpha * c02;
        B[pw + eb1] = alpha * c12;
        B[pw + 2 * eb1] = alpha * c22;
        B[pw + 3 * eb1] = alpha * c32;
        pw += eb2;
        B[pw] = alpha * c03;
        B[pw + eb1] = alpha * c13;
        B[pw + 2 * eb1] = alpha * c23;
        B[pw + 3 * eb1] = alpha * c33;
      }
      for (j = nb4; j < nc; j++) {
        pb = offsetB + i0 * eb1 + j * eb2;
        b00 = B[pb];
        b10 = B[pb + eb1];
        b20 = B[pb + 2 * eb1];
        b30 = B[pb + 3 * eb1];
        c00 = 0;
        c10 = 0;
        c20 = 0;
        c30 = 0;
        pa0 = pd + 4 * ea2;
        pa1 = pa0 + ea1;
        pa2 = pa1 + ea1;
        pa3 = pa2 + ea1;
        pb0 = offsetB + (i0 + 4) * eb1 + j * eb2;
        for (l = i0 + 4; l < nr; l++) {
          e0 = B[pb0];
          c00 += A[pa0] * e0;
          c10 += A[pa1] * e0;
          c20 += A[pa2] * e0;
          c30 += A[pa3] * e0;
          pa0 += ea2;
          pa1 += ea2;
          pa2 += ea2;
          pa3 += ea2;
          pb0 += eb1;
        }
        c00 += d0 * b00 + t01 * b10 + t02 * b20 + t03 * b30;
        c10 += d1 * b10 + t12 * b20 + t13 * b30;
        c20 += d2 * b20 + t23 * b30;
        c30 += d3 * b30;
        B[pb] = alpha * c00;
        B[pb + eb1] = alpha * c10;
        B[pb + 2 * eb1] = alpha * c20;
        B[pb + 3 * eb1] = alpha * c30;
      }
    }
    for (i = mb; i < nr; i++) {
      for (j = 0; j < nc; j++) {
        pb = offsetB + i * eb1 + j * eb2;
        temp = nounit ? A[offsetA + i * (ea1 + ea2)] * B[pb] : B[pb];
        pa = offsetA + i * ea1 + (i + 1) * ea2;
        pb0 = pb + eb1;
        for (l = i + 1; l < nr; l++) {
          temp += A[pa] * B[pb0];
          pa += ea2;
          pb0 += eb1;
        }
        B[pb] = alpha * temp;
      }
    }
  } else {
    for (i = nr - 1; i >= mb; i--) {
      for (j = 0; j < nc; j++) {
        pb = offsetB + i * eb1 + j * eb2;
        temp = nounit ? A[offsetA + i * (ea1 + ea2)] * B[pb] : B[pb];
        pa = offsetA + i * ea1;
        pb0 = offsetB + j * eb2;
        for (l = 0; l < i; l++) {
          temp += A[pa] * B[pb0];
          pa += ea2;
          pb0 += eb1;
        }
        B[pb] = alpha * temp;
      }
    }
    for (i0 = mb - 4; i0 >= 0; i0 -= 4) {
      pd = offsetA + i0 * ea1 + i0 * ea2;
      t01 = A[pd + ea1];
      t02 = A[pd + 2 * ea1];
      t03 = A[pd + 3 * ea1];
      t12 = A[pd + 2 * ea1 + ea2];
      t13 = A[pd + 3 * ea1 + ea2];
      t23 = A[pd + 3 * ea1 + 2 * ea2];
      if (nounit) {
        d0 = A[pd];
        d1 = A[pd + ea1 + ea2];
        d2 = A[pd + 2 * (ea1 + ea2)];
        d3 = A[pd + 3 * (ea1 + ea2)];
      } else {
        d0 = 1;
        d1 = 1;
        d2 = 1;
        d3 = 1;
      }
      for (j = 0; j < nb4; j += 4) {
        pb = offsetB + i0 * eb1 + j * eb2;
        pw = pb;
        b00 = B[pw];
        b10 = B[pw + eb1];
        b20 = B[pw + 2 * eb1];
        b30 = B[pw + 3 * eb1];
        pw += eb2;
        b01 = B[pw];
        b11 = B[pw + eb1];
        b21 = B[pw + 2 * eb1];
        b31 = B[pw + 3 * eb1];
        pw += eb2;
        b02 = B[pw];
        b12 = B[pw + eb1];
        b22 = B[pw + 2 * eb1];
        b32 = B[pw + 3 * eb1];
        pw += eb2;
        b03 = B[pw];
        b13 = B[pw + eb1];
        b23 = B[pw + 2 * eb1];
        b33 = B[pw + 3 * eb1];
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
        pa0 = offsetA + i0 * ea1;
        pa1 = pa0 + ea1;
        pa2 = pa1 + ea1;
        pa3 = pa2 + ea1;
        pb0 = offsetB + j * eb2;
        pb1 = pb0 + eb2;
        pb2 = pb1 + eb2;
        pb3 = pb2 + eb2;
        for (l = 0; l < i0; l++) {
          a0 = A[pa0];
          a1 = A[pa1];
          a2 = A[pa2];
          a3 = A[pa3];
          e0 = B[pb0];
          e1 = B[pb1];
          e2 = B[pb2];
          e3 = B[pb3];
          c00 += a0 * e0;
          c10 += a1 * e0;
          c20 += a2 * e0;
          c30 += a3 * e0;
          c01 += a0 * e1;
          c11 += a1 * e1;
          c21 += a2 * e1;
          c31 += a3 * e1;
          c02 += a0 * e2;
          c12 += a1 * e2;
          c22 += a2 * e2;
          c32 += a3 * e2;
          c03 += a0 * e3;
          c13 += a1 * e3;
          c23 += a2 * e3;
          c33 += a3 * e3;
          pa0 += ea2;
          pa1 += ea2;
          pa2 += ea2;
          pa3 += ea2;
          pb0 += eb1;
          pb1 += eb1;
          pb2 += eb1;
          pb3 += eb1;
        }
        c00 += d0 * b00;
        c01 += d0 * b01;
        c02 += d0 * b02;
        c03 += d0 * b03;
        c10 += t01 * b00 + d1 * b10;
        c11 += t01 * b01 + d1 * b11;
        c12 += t01 * b02 + d1 * b12;
        c13 += t01 * b03 + d1 * b13;
        c20 += t02 * b00 + t12 * b10 + d2 * b20;
        c21 += t02 * b01 + t12 * b11 + d2 * b21;
        c22 += t02 * b02 + t12 * b12 + d2 * b22;
        c23 += t02 * b03 + t12 * b13 + d2 * b23;
        c30 += t03 * b00 + t13 * b10 + t23 * b20 + d3 * b30;
        c31 += t03 * b01 + t13 * b11 + t23 * b21 + d3 * b31;
        c32 += t03 * b02 + t13 * b12 + t23 * b22 + d3 * b32;
        c33 += t03 * b03 + t13 * b13 + t23 * b23 + d3 * b33;
        pw = pb;
        B[pw] = alpha * c00;
        B[pw + eb1] = alpha * c10;
        B[pw + 2 * eb1] = alpha * c20;
        B[pw + 3 * eb1] = alpha * c30;
        pw += eb2;
        B[pw] = alpha * c01;
        B[pw + eb1] = alpha * c11;
        B[pw + 2 * eb1] = alpha * c21;
        B[pw + 3 * eb1] = alpha * c31;
        pw += eb2;
        B[pw] = alpha * c02;
        B[pw + eb1] = alpha * c12;
        B[pw + 2 * eb1] = alpha * c22;
        B[pw + 3 * eb1] = alpha * c32;
        pw += eb2;
        B[pw] = alpha * c03;
        B[pw + eb1] = alpha * c13;
        B[pw + 2 * eb1] = alpha * c23;
        B[pw + 3 * eb1] = alpha * c33;
      }
      for (j = nb4; j < nc; j++) {
        pb = offsetB + i0 * eb1 + j * eb2;
        b00 = B[pb];
        b10 = B[pb + eb1];
        b20 = B[pb + 2 * eb1];
        b30 = B[pb + 3 * eb1];
        c00 = 0;
        c10 = 0;
        c20 = 0;
        c30 = 0;
        pa0 = offsetA + i0 * ea1;
        pa1 = pa0 + ea1;
        pa2 = pa1 + ea1;
        pa3 = pa2 + ea1;
        pb0 = offsetB + j * eb2;
        for (l = 0; l < i0; l++) {
          e0 = B[pb0];
          c00 += A[pa0] * e0;
          c10 += A[pa1] * e0;
          c20 += A[pa2] * e0;
          c30 += A[pa3] * e0;
          pa0 += ea2;
          pa1 += ea2;
          pa2 += ea2;
          pa3 += ea2;
          pb0 += eb1;
        }
        c00 += d0 * b00;
        c10 += t01 * b00 + d1 * b10;
        c20 += t02 * b00 + t12 * b10 + d2 * b20;
        c30 += t03 * b00 + t13 * b10 + t23 * b20 + d3 * b30;
        B[pb] = alpha * c00;
        B[pb + eb1] = alpha * c10;
        B[pb + 2 * eb1] = alpha * c20;
        B[pb + 3 * eb1] = alpha * c30;
      }
    }
  }
  return B;
}
var base_default14 = dtrmm;

// ../notes/lib/lapack/base/dsygst/lib/base.js
var NB2 = 64;
function dsygst(itype, uplo, N, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB) {
  var upper;
  var sa1;
  var sa2;
  var sb1;
  var sb2;
  var kb;
  var k;
  upper = uplo === "upper";
  if (N === 0) {
    return 0;
  }
  sa1 = strideA1;
  sa2 = strideA2;
  sb1 = strideB1;
  sb2 = strideB2;
  if (NB2 <= 1 || NB2 >= N) {
    return base_default11(itype, uplo, N, A, sa1, sa2, offsetA, B, sb1, sb2, offsetB);
  }
  if (itype === 1) {
    if (upper) {
      for (k = 0; k < N; k += NB2) {
        kb = Math.min(N - k, NB2);
        base_default11(itype, uplo, kb, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1 + k * sb2);
        if (k + kb < N) {
          base_default("left", uplo, "transpose", "non-unit", kb, N - k - kb, 1, B, sb1, sb2, offsetB + k * sb1 + k * sb2, A, sa1, sa2, offsetA + k * sa1 + (k + kb) * sa2);
          base_default12("left", uplo, kb, N - k - kb, -0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1 + (k + kb) * sb2, 1, A, sa1, sa2, offsetA + k * sa1 + (k + kb) * sa2);
          base_default13(uplo, "transpose", N - k - kb, kb, -1, A, sa1, sa2, offsetA + k * sa1 + (k + kb) * sa2, B, sb1, sb2, offsetB + k * sb1 + (k + kb) * sb2, 1, A, sa1, sa2, offsetA + (k + kb) * sa1 + (k + kb) * sa2);
          base_default12("left", uplo, kb, N - k - kb, -0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1 + (k + kb) * sb2, 1, A, sa1, sa2, offsetA + k * sa1 + (k + kb) * sa2);
          base_default("right", uplo, "no-transpose", "non-unit", kb, N - k - kb, 1, B, sb1, sb2, offsetB + (k + kb) * sb1 + (k + kb) * sb2, A, sa1, sa2, offsetA + k * sa1 + (k + kb) * sa2);
        }
      }
    } else {
      for (k = 0; k < N; k += NB2) {
        kb = Math.min(N - k, NB2);
        base_default11(itype, uplo, kb, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1 + k * sb2);
        if (k + kb < N) {
          base_default("right", uplo, "transpose", "non-unit", N - k - kb, kb, 1, B, sb1, sb2, offsetB + k * sb1 + k * sb2, A, sa1, sa2, offsetA + (k + kb) * sa1 + k * sa2);
          base_default12("right", uplo, N - k - kb, kb, -0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + (k + kb) * sb1 + k * sb2, 1, A, sa1, sa2, offsetA + (k + kb) * sa1 + k * sa2);
          base_default13(uplo, "no-transpose", N - k - kb, kb, -1, A, sa1, sa2, offsetA + (k + kb) * sa1 + k * sa2, B, sb1, sb2, offsetB + (k + kb) * sb1 + k * sb2, 1, A, sa1, sa2, offsetA + (k + kb) * sa1 + (k + kb) * sa2);
          base_default12("right", uplo, N - k - kb, kb, -0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + (k + kb) * sb1 + k * sb2, 1, A, sa1, sa2, offsetA + (k + kb) * sa1 + k * sa2);
          base_default("left", uplo, "no-transpose", "non-unit", N - k - kb, kb, 1, B, sb1, sb2, offsetB + (k + kb) * sb1 + (k + kb) * sb2, A, sa1, sa2, offsetA + (k + kb) * sa1 + k * sa2);
        }
      }
    }
  } else {
    if (upper) {
      for (k = 0; k < N; k += NB2) {
        kb = Math.min(N - k, NB2);
        base_default14("left", uplo, "no-transpose", "non-unit", k, kb, 1, B, sb1, sb2, offsetB, A, sa1, sa2, offsetA + k * sa2);
        base_default12("right", uplo, k, kb, 0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb2, 1, A, sa1, sa2, offsetA + k * sa2);
        base_default13(uplo, "no-transpose", k, kb, 1, A, sa1, sa2, offsetA + k * sa2, B, sb1, sb2, offsetB + k * sb2, 1, A, sa1, sa2, offsetA);
        base_default12("right", uplo, k, kb, 0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb2, 1, A, sa1, sa2, offsetA + k * sa2);
        base_default14("right", uplo, "transpose", "non-unit", k, kb, 1, B, sb1, sb2, offsetB + k * sb1 + k * sb2, A, sa1, sa2, offsetA + k * sa2);
        base_default11(itype, uplo, kb, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1 + k * sb2);
      }
    } else {
      for (k = 0; k < N; k += NB2) {
        kb = Math.min(N - k, NB2);
        base_default14("right", uplo, "no-transpose", "non-unit", kb, k, 1, B, sb1, sb2, offsetB, A, sa1, sa2, offsetA + k * sa1);
        base_default12("left", uplo, kb, k, 0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1, 1, A, sa1, sa2, offsetA + k * sa1);
        base_default13(uplo, "transpose", k, kb, 1, A, sa1, sa2, offsetA + k * sa1, B, sb1, sb2, offsetB + k * sb1, 1, A, sa1, sa2, offsetA);
        base_default12("left", uplo, kb, k, 0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1, 1, A, sa1, sa2, offsetA + k * sa1);
        base_default14("left", uplo, "transpose", "non-unit", kb, k, 1, B, sb1, sb2, offsetB + k * sb1 + k * sb2, A, sa1, sa2, offsetA + k * sa1);
        base_default11(itype, uplo, kb, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1 + k * sb2);
      }
    }
  }
  return 0;
}
var base_default15 = dsygst;

// ../notes/lib/lapack/base/dsyevx/lib/base.js
var import_lib8 = __toESM(require_lib10(), 1);

// ../notes/lib/lapack/base/dlamch/lib/base.js
var EPS = 11102230246251565e-32;
var SFMIN = 22250738585072014e-324;
var BASE = 2;
var PREC = EPS * BASE;
var DIGITS = 53;
var RND = 1;
var EMIN = -1021;
var RMIN = 22250738585072014e-324;
var EMAX = 1024;
var RMAX = 17976931348623157e292;
var TABLE = {
  "epsilon": EPS,
  "Epsilon": EPS,
  "safe-minimum": SFMIN,
  "Safe minimum": SFMIN,
  "base": BASE,
  "Base": BASE,
  "precision": PREC,
  "Precision": PREC,
  "digits": DIGITS,
  "rounding": RND,
  "min-exponent": EMIN,
  "underflow": RMIN,
  "max-exponent": EMAX,
  "overflow": RMAX,
  "scale": SFMIN,
  "E": EPS,
  "e": EPS,
  "S": SFMIN,
  "s": SFMIN,
  "B": BASE,
  "b": BASE,
  "P": PREC,
  "p": PREC,
  "N": DIGITS,
  "n": DIGITS,
  "R": RND,
  "r": RND,
  "M": EMIN,
  "m": EMIN,
  "U": RMIN,
  "u": RMIN,
  "L": EMAX,
  "l": EMAX,
  "O": RMAX,
  "o": RMAX
};
function dlamch(cmach) {
  var v = TABLE[cmach];
  if (v !== void 0) {
    return v;
  }
  return 0;
}
var base_default16 = dlamch;

// ../notes/lib/lapack/base/dlassq/lib/base.js
var TSML = Math.pow(2, -511);
var TBIG = Math.pow(2, 486);
var SSML = Math.pow(2, 537);
var SBIG = Math.pow(2, -538);
function dlassq(N, x, stride, offset, scale, sumsq) {
  var notbig;
  var abig;
  var amed;
  var asml;
  var ymax;
  var ymin;
  var ax;
  var ix;
  var i;
  if (scale !== scale || sumsq !== sumsq) {
    return {
      "scl": scale,
      "sumsq": sumsq
    };
  }
  if (sumsq === 0) {
    scale = 1;
  }
  if (scale === 0) {
    scale = 1;
    sumsq = 0;
  }
  if (N <= 0) {
    return {
      "scl": scale,
      "sumsq": sumsq
    };
  }
  notbig = true;
  asml = 0;
  amed = 0;
  abig = 0;
  ix = offset;
  if (stride < 0) {
    ix = offset - (N - 1) * stride;
  }
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
  if (sumsq > 0) {
    ax = scale * Math.sqrt(sumsq);
    if (ax > TBIG) {
      if (scale > 1) {
        scale *= SBIG;
        abig += scale * (scale * sumsq);
      } else {
        abig += scale * (scale * (SBIG * (SBIG * sumsq)));
      }
    } else if (ax < TSML) {
      if (notbig) {
        if (scale < 1) {
          scale *= SSML;
          asml += scale * (scale * sumsq);
        } else {
          asml += scale * (scale * (SSML * (SSML * sumsq)));
        }
      }
    } else {
      amed += scale * (scale * sumsq);
    }
  }
  if (abig > 0) {
    if (amed > 0 || amed !== amed) {
      abig += amed * SBIG * SBIG;
    }
    scale = 1 / SBIG;
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
      scale = 1;
      sumsq = ymax * ymax * (1 + ymin / ymax * (ymin / ymax));
    } else {
      scale = 1 / SSML;
      sumsq = asml;
    }
  } else {
    scale = 1;
    sumsq = amed;
  }
  return {
    "scl": scale,
    "sumsq": sumsq
  };
}
var base_default17 = dlassq;

// ../notes/lib/lapack/base/dlansy/lib/base.js
function dlansy(norm, uplo, N, A, strideA1, strideA2, offsetA, WORK, strideWork, offsetWork) {
  var value;
  var scale;
  var absa;
  var sum;
  var out;
  var ai;
  var wi;
  var i;
  var j;
  if (N === 0) {
    return 0;
  }
  if (norm === "max") {
    value = 0;
    if (uplo === "upper") {
      for (j = 0; j < N; j++) {
        ai = offsetA + j * strideA2;
        for (i = 0; i <= j; i++) {
          sum = Math.abs(A[ai]);
          if (value < sum || sum !== sum) {
            value = sum;
          }
          ai += strideA1;
        }
      }
    } else {
      for (j = 0; j < N; j++) {
        ai = offsetA + j * strideA2 + j * strideA1;
        for (i = j; i < N; i++) {
          sum = Math.abs(A[ai]);
          if (value < sum || sum !== sum) {
            value = sum;
          }
          ai += strideA1;
        }
      }
    }
  } else if (norm === "inf-norm" || norm === "one-norm" || norm === "one-norm") {
    value = 0;
    if (uplo === "upper") {
      for (j = 0; j < N; j++) {
        sum = 0;
        ai = offsetA + j * strideA2;
        for (i = 0; i < j; i++) {
          absa = Math.abs(A[ai]);
          sum += absa;
          WORK[offsetWork + i * strideWork] += absa;
          ai += strideA1;
        }
        WORK[offsetWork + j * strideWork] = sum + Math.abs(A[ai]);
      }
      for (i = 0; i < N; i++) {
        wi = offsetWork + i * strideWork;
        sum = WORK[wi];
        if (value < sum || sum !== sum) {
          value = sum;
        }
      }
    } else {
      for (i = 0; i < N; i++) {
        WORK[offsetWork + i * strideWork] = 0;
      }
      for (j = 0; j < N; j++) {
        sum = WORK[offsetWork + j * strideWork] + Math.abs(A[offsetA + j * strideA2 + j * strideA1]);
        ai = offsetA + j * strideA2 + (j + 1) * strideA1;
        for (i = j + 1; i < N; i++) {
          absa = Math.abs(A[ai]);
          sum += absa;
          WORK[offsetWork + i * strideWork] += absa;
          ai += strideA1;
        }
        if (value < sum || sum !== sum) {
          value = sum;
        }
      }
    }
  } else if (norm === "frobenius" || norm === "frobenius") {
    scale = 0;
    sum = 1;
    if (uplo === "upper") {
      for (j = 1; j < N; j++) {
        out = base_default17(j, A, strideA1, offsetA + j * strideA2, scale, sum);
        scale = out.scl;
        sum = out.sumsq;
      }
    } else {
      for (j = 0; j < N - 1; j++) {
        out = base_default17(N - j - 1, A, strideA1, offsetA + j * strideA2 + (j + 1) * strideA1, scale, sum);
        scale = out.scl;
        sum = out.sumsq;
      }
    }
    sum *= 2;
    out = base_default17(N, A, strideA1 + strideA2, offsetA, scale, sum);
    scale = out.scl;
    sum = out.sumsq;
    value = scale * Math.sqrt(sum);
  } else {
    value = 0;
  }
  return value;
}
var base_default18 = dlansy;

// ../notes/lib/lapack/base/dsytrd/lib/base.js
var import_lib = __toESM(require_lib13(), 1);

// ../notes/lib/blas/base/dnrm2/lib/base.js
var TSML2 = 14916681462400413e-170;
var TBIG2 = 1997919072202235e131;
var SSML2 = 44989137945431964e145;
var SBIG2 = 11113793747425387e-178;
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
    if (ax > TBIG2) {
      abig += ax * SBIG2 * (ax * SBIG2);
      notbig = false;
    } else if (ax < TSML2) {
      if (notbig) {
        asml += ax * SSML2 * (ax * SSML2);
      }
    } else {
      amed += ax * ax;
    }
    ix += stride;
  }
  if (abig > 0) {
    if (amed > 0 || amed !== amed) {
      abig += amed * SBIG2 * SBIG2;
    }
    scl = 1 / SBIG2;
    sumsq = abig;
  } else if (asml > 0) {
    if (amed > 0 || amed !== amed) {
      amed = Math.sqrt(amed);
      asml = Math.sqrt(asml) / SSML2;
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
      scl = 1 / SSML2;
      sumsq = asml;
    }
  } else {
    scl = 1;
    sumsq = amed;
  }
  return scl * Math.sqrt(sumsq);
}
var base_default19 = dnrm2;

// ../notes/lib/lapack/base/dlapy2/lib/base.js
function dlapy2(x, y) {
  var xabs;
  var yabs;
  var w;
  var z;
  if (x !== x) {
    return x;
  }
  if (y !== y) {
    return y;
  }
  xabs = Math.abs(x);
  yabs = Math.abs(y);
  w = Math.max(xabs, yabs);
  z = Math.min(xabs, yabs);
  if (z === 0 || w > 17976931348623157e292) {
    return w;
  }
  return w * Math.sqrt(1 + z / w * (z / w));
}
var base_default20 = dlapy2;

// ../notes/lib/lapack/base/dlarfg/lib/base.js
function dlarfg(N, alpha, offsetAlpha, x, strideX, offsetX, tau, offsetTau) {
  var rsafmn;
  var safmin;
  var xnorm;
  var sign;
  var beta;
  var knt;
  var j;
  if (N <= 1) {
    tau[offsetTau] = 0;
    return;
  }
  xnorm = base_default19(N - 1, x, strideX, offsetX);
  if (xnorm === 0) {
    tau[offsetTau] = 0;
  } else {
    sign = Math.sign(alpha[offsetAlpha]) || 1;
    beta = -sign * base_default20(alpha[offsetAlpha], xnorm);
    safmin = base_default16("safe-minimum") / base_default16("epsilon");
    knt = 0;
    if (Math.abs(beta) < safmin) {
      rsafmn = 1 / safmin;
      do {
        knt += 1;
        base_default7(N - 1, rsafmn, x, strideX, offsetX);
        beta *= rsafmn;
        alpha[offsetAlpha] *= rsafmn;
      } while (Math.abs(beta) < safmin && knt < 20);
      xnorm = base_default19(N - 1, x, strideX, offsetX);
      sign = Math.sign(alpha[offsetAlpha]) || 1;
      beta = -sign * base_default20(alpha[offsetAlpha], xnorm);
    }
    tau[offsetTau] = (beta - alpha[offsetAlpha]) / beta;
    base_default7(N - 1, 1 / (alpha[offsetAlpha] - beta), x, strideX, offsetX);
    for (j = 0; j < knt; j++) {
      beta *= safmin;
    }
    alpha[offsetAlpha] = beta;
  }
}
var base_default21 = dlarfg;

// ../notes/lib/blas/base/dsymv/lib/base.js
function dsymv(uplo, N, alpha, A, strideA1, strideA2, offsetA, x, strideX, offsetX, beta, y, strideY, offsetY) {
  var temp1;
  var temp2;
  var a0v;
  var a1v;
  var a2v;
  var a3v;
  var ia0;
  var ia1;
  var ia2;
  var ia3;
  var sa1;
  var sa2;
  var xv;
  var n4;
  var s0;
  var s1;
  var s2;
  var s3;
  var t0;
  var t1;
  var t2;
  var t3;
  var ia;
  var ix;
  var iy;
  var jx;
  var jy;
  var i;
  var j;
  if (N === 0 || alpha === 0 && beta === 1) {
    return y;
  }
  if (beta !== 1) {
    iy = offsetY;
    if (beta === 0) {
      for (i = 0; i < N; i++) {
        y[iy] = 0;
        iy += strideY;
      }
    } else {
      for (i = 0; i < N; i++) {
        y[iy] *= beta;
        iy += strideY;
      }
    }
  }
  if (alpha === 0) {
    return y;
  }
  if (uplo === "upper") {
    sa1 = strideA1;
    sa2 = strideA2;
  } else {
    sa1 = strideA2;
    sa2 = strideA1;
  }
  n4 = N - N % 4;
  jx = offsetX;
  jy = offsetY;
  if (Math.abs(sa1) <= Math.abs(sa2)) {
    for (j = 0; j < n4; j += 4) {
      t0 = alpha * x[jx];
      t1 = alpha * x[jx + strideX];
      t2 = alpha * x[jx + 2 * strideX];
      t3 = alpha * x[jx + 3 * strideX];
      s0 = 0;
      s1 = 0;
      s2 = 0;
      s3 = 0;
      ia0 = offsetA + j * sa2;
      ia1 = ia0 + sa2;
      ia2 = ia1 + sa2;
      ia3 = ia2 + sa2;
      ix = offsetX;
      iy = offsetY;
      for (i = 0; i < j; i++) {
        xv = x[ix];
        a0v = A[ia0];
        a1v = A[ia1];
        a2v = A[ia2];
        a3v = A[ia3];
        y[iy] += t0 * a0v + t1 * a1v + t2 * a2v + t3 * a3v;
        s0 += a0v * xv;
        s1 += a1v * xv;
        s2 += a2v * xv;
        s3 += a3v * xv;
        ia0 += sa1;
        ia1 += sa1;
        ia2 += sa1;
        ia3 += sa1;
        ix += strideX;
        iy += strideY;
      }
      y[jy] += t0 * A[ia0] + alpha * s0;
      a0v = A[ia1];
      y[jy] += t1 * a0v;
      s1 += a0v * x[ix];
      y[jy + strideY] += t1 * A[ia1 + sa1] + alpha * s1;
      a0v = A[ia2];
      a1v = A[ia2 + sa1];
      y[jy] += t2 * a0v;
      y[jy + strideY] += t2 * a1v;
      s2 += a0v * x[ix] + a1v * x[ix + strideX];
      y[jy + 2 * strideY] += t2 * A[ia2 + 2 * sa1] + alpha * s2;
      a0v = A[ia3];
      a1v = A[ia3 + sa1];
      a2v = A[ia3 + 2 * sa1];
      y[jy] += t3 * a0v;
      y[jy + strideY] += t3 * a1v;
      y[jy + 2 * strideY] += t3 * a2v;
      s3 += a0v * x[ix] + a1v * x[ix + strideX] + a2v * x[ix + 2 * strideX];
      y[jy + 3 * strideY] += t3 * A[ia3 + 3 * sa1] + alpha * s3;
      jx += 4 * strideX;
      jy += 4 * strideY;
    }
    for (; j < N; j++) {
      temp1 = alpha * x[jx];
      temp2 = 0;
      ix = offsetX;
      iy = offsetY;
      ia = offsetA + j * sa2;
      for (i = 0; i < j; i++) {
        y[iy] += temp1 * A[ia];
        temp2 += A[ia] * x[ix];
        ia += sa1;
        ix += strideX;
        iy += strideY;
      }
      y[jy] += temp1 * A[ia] + alpha * temp2;
      jx += strideX;
      jy += strideY;
    }
  } else {
    for (j = 0; j < n4; j += 4) {
      t0 = alpha * x[jx];
      t1 = alpha * x[jx + strideX];
      t2 = alpha * x[jx + 2 * strideX];
      t3 = alpha * x[jx + 3 * strideX];
      s0 = 0;
      s1 = 0;
      s2 = 0;
      s3 = 0;
      ia = offsetA + j * sa1 + j * sa2;
      y[jy] += t0 * A[ia];
      a0v = A[ia + sa2];
      a1v = A[ia + 2 * sa2];
      a2v = A[ia + 3 * sa2];
      y[jy + strideY] += t0 * a0v;
      y[jy + 2 * strideY] += t0 * a1v;
      y[jy + 3 * strideY] += t0 * a2v;
      s0 += a0v * x[jx + strideX] + a1v * x[jx + 2 * strideX] + a2v * x[jx + 3 * strideX];
      ia += sa1 + sa2;
      y[jy + strideY] += t1 * A[ia];
      a0v = A[ia + sa2];
      a1v = A[ia + 2 * sa2];
      y[jy + 2 * strideY] += t1 * a0v;
      y[jy + 3 * strideY] += t1 * a1v;
      s1 += a0v * x[jx + 2 * strideX] + a1v * x[jx + 3 * strideX];
      ia += sa1 + sa2;
      y[jy + 2 * strideY] += t2 * A[ia];
      a0v = A[ia + sa2];
      y[jy + 3 * strideY] += t2 * a0v;
      s2 += a0v * x[jx + 3 * strideX];
      ia += sa1 + sa2;
      y[jy + 3 * strideY] += t3 * A[ia];
      ia0 = offsetA + j * sa1 + (j + 4) * sa2;
      ia1 = ia0 + sa1;
      ia2 = ia1 + sa1;
      ia3 = ia2 + sa1;
      ix = jx + 4 * strideX;
      iy = jy + 4 * strideY;
      for (i = j + 4; i < N; i++) {
        xv = x[ix];
        a0v = A[ia0];
        a1v = A[ia1];
        a2v = A[ia2];
        a3v = A[ia3];
        y[iy] += t0 * a0v + t1 * a1v + t2 * a2v + t3 * a3v;
        s0 += a0v * xv;
        s1 += a1v * xv;
        s2 += a2v * xv;
        s3 += a3v * xv;
        ia0 += sa2;
        ia1 += sa2;
        ia2 += sa2;
        ia3 += sa2;
        ix += strideX;
        iy += strideY;
      }
      y[jy] += alpha * s0;
      y[jy + strideY] += alpha * s1;
      y[jy + 2 * strideY] += alpha * s2;
      y[jy + 3 * strideY] += alpha * s3;
      jx += 4 * strideX;
      jy += 4 * strideY;
    }
    for (; j < N; j++) {
      temp1 = alpha * x[jx];
      temp2 = 0;
      ia = offsetA + j * sa1 + j * sa2;
      y[jy] += temp1 * A[ia];
      ix = jx;
      iy = jy;
      for (i = j + 1; i < N; i++) {
        ia += sa2;
        ix += strideX;
        iy += strideY;
        y[iy] += temp1 * A[ia];
        temp2 += A[ia] * x[ix];
      }
      y[jy] += alpha * temp2;
      jx += strideX;
      jy += strideY;
    }
  }
  return y;
}
var base_default22 = dsymv;

// ../notes/lib/blas/base/ddot/lib/base.js
var M3 = 5;
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
    m = N % M3;
    if (m > 0) {
      for (i = 0; i < m; i++) {
        dtemp += x[ix] * y[iy];
        ix += 1;
        iy += 1;
      }
    }
    if (N < M3) {
      return dtemp;
    }
    for (i = m; i < N; i += M3) {
      dtemp += x[ix] * y[iy] + x[ix + 1] * y[iy + 1] + x[ix + 2] * y[iy + 2] + x[ix + 3] * y[iy + 3] + x[ix + 4] * y[iy + 4];
      ix += M3;
      iy += M3;
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
var base_default23 = ddot;

// ../notes/lib/lapack/base/dsytd2/lib/base.js
var HALF = 0.5;
function dsytd2(uplo, N, A, strideA1, strideA2, offsetA, d, strideD, offsetD, e, strideE, offsetE, TAU, strideTAU, offsetTAU) {
  var alpha;
  var taui;
  var sa1;
  var sa2;
  var i;
  if (N <= 0) {
    return 0;
  }
  sa1 = strideA1;
  sa2 = strideA2;
  if (uplo === "upper") {
    for (i = N - 2; i >= 0; i--) {
      base_default21(
        i + 1,
        // N = Fortran I = i+1
        A,
        offsetA + i * sa1 + (i + 1) * sa2,
        // alpha at A(i, i+1)
        A,
        sa1,
        offsetA + (i + 1) * sa2,
        // x = column i+1 starting at row 0, stride=sa1
        TAU,
        offsetTAU + i * strideTAU
        // taui output
      );
      e[offsetE + i * strideE] = A[offsetA + i * sa1 + (i + 1) * sa2];
      taui = TAU[offsetTAU + i * strideTAU];
      if (taui !== 0) {
        A[offsetA + i * sa1 + (i + 1) * sa2] = 1;
        base_default22(
          uplo,
          i + 1,
          taui,
          A,
          sa1,
          sa2,
          offsetA,
          // A, leading (i+1)x(i+1)
          A,
          sa1,
          offsetA + (i + 1) * sa2,
          // v = column i+1, rows 0..i
          0,
          TAU,
          strideTAU,
          offsetTAU
          // w = TAU array used as workspace
        );
        alpha = -(HALF * taui) * base_default23(i + 1, TAU, strideTAU, offsetTAU, A, sa1, offsetA + (i + 1) * sa2);
        base_default6(i + 1, alpha, A, sa1, offsetA + (i + 1) * sa2, TAU, strideTAU, offsetTAU);
        base_default8(uplo, i + 1, -1, A, sa1, offsetA + (i + 1) * sa2, TAU, strideTAU, offsetTAU, A, sa1, sa2, offsetA);
        A[offsetA + i * sa1 + (i + 1) * sa2] = e[offsetE + i * strideE];
      }
      d[offsetD + (i + 1) * strideD] = A[offsetA + (i + 1) * sa1 + (i + 1) * sa2];
      TAU[offsetTAU + i * strideTAU] = taui;
    }
    d[offsetD] = A[offsetA];
  } else {
    for (i = 0; i < N - 1; i++) {
      base_default21(
        N - i - 1,
        // N_reflector
        A,
        offsetA + (i + 1) * sa1 + i * sa2,
        // alpha at A(i+1, i)
        A,
        sa1,
        offsetA + Math.min(i + 2, N - 1) * sa1 + i * sa2,
        // x starting at A(min(i+2,N-1), i)
        TAU,
        offsetTAU + i * strideTAU
        // taui output
      );
      e[offsetE + i * strideE] = A[offsetA + (i + 1) * sa1 + i * sa2];
      taui = TAU[offsetTAU + i * strideTAU];
      if (taui !== 0) {
        A[offsetA + (i + 1) * sa1 + i * sa2] = 1;
        base_default22(
          uplo,
          N - i - 1,
          taui,
          A,
          sa1,
          sa2,
          offsetA + (i + 1) * sa1 + (i + 1) * sa2,
          // A submatrix at (i+1, i+1)
          A,
          sa1,
          offsetA + (i + 1) * sa1 + i * sa2,
          // v = A(i+1:N-1, i)
          0,
          TAU,
          strideTAU,
          offsetTAU + i * strideTAU
          // w = TAU(i:)
        );
        alpha = -(HALF * taui) * base_default23(N - i - 1, TAU, strideTAU, offsetTAU + i * strideTAU, A, sa1, offsetA + (i + 1) * sa1 + i * sa2);
        base_default6(N - i - 1, alpha, A, sa1, offsetA + (i + 1) * sa1 + i * sa2, TAU, strideTAU, offsetTAU + i * strideTAU);
        base_default8(uplo, N - i - 1, -1, A, sa1, offsetA + (i + 1) * sa1 + i * sa2, TAU, strideTAU, offsetTAU + i * strideTAU, A, sa1, sa2, offsetA + (i + 1) * sa1 + (i + 1) * sa2);
        A[offsetA + (i + 1) * sa1 + i * sa2] = e[offsetE + i * strideE];
      }
      d[offsetD + i * strideD] = A[offsetA + i * sa1 + i * sa2];
      TAU[offsetTAU + i * strideTAU] = taui;
    }
    d[offsetD + (N - 1) * strideD] = A[offsetA + (N - 1) * sa1 + (N - 1) * sa2];
  }
  return 0;
}
var base_default24 = dsytd2;

// ../notes/lib/blas/base/dgemv/lib/base.js
function dgemv(trans, M5, N, alpha, A, strideA1, strideA2, offsetA, x, strideX, offsetX, beta, y, strideY, offsetY) {
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
  if (M5 === 0 || N === 0 || alpha === 0 && beta === 1) {
    return y;
  }
  if (noTrans) {
    leny = M5;
    lenx = N;
    sb1 = strideA1;
    sb2 = strideA2;
  } else {
    leny = N;
    lenx = M5;
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
var base_default25 = dgemv;

// ../notes/lib/lapack/base/dlatrd/lib/base.js
function dlatrd(uplo, N, nb, A, strideA1, strideA2, offsetA, e, strideE, offsetE, TAU, strideTAU, offsetTAU, W, strideW1, strideW2, offsetW) {
  var alpha;
  var iw;
  var i;
  if (N <= 0) {
    return;
  }
  if (uplo === "upper") {
    for (i = N - 1; i >= N - nb; i--) {
      iw = i - N + nb;
      if (i < N - 1) {
        base_default25("no-transpose", i + 1, N - 1 - i, -1, A, strideA1, strideA2, offsetA + (i + 1) * strideA2, W, strideW2, offsetW + i * strideW1 + (iw + 1) * strideW2, 1, A, strideA1, offsetA + i * strideA2);
        base_default25("no-transpose", i + 1, N - 1 - i, -1, W, strideW1, strideW2, offsetW + (iw + 1) * strideW2, A, strideA2, offsetA + i * strideA1 + (i + 1) * strideA2, 1, A, strideA1, offsetA + i * strideA2);
      }
      if (i > 0) {
        base_default21(i, A, offsetA + (i - 1) * strideA1 + i * strideA2, A, strideA1, offsetA + i * strideA2, TAU, offsetTAU + (i - 1) * strideTAU);
        e[offsetE + (i - 1) * strideE] = A[offsetA + (i - 1) * strideA1 + i * strideA2];
        A[offsetA + (i - 1) * strideA1 + i * strideA2] = 1;
        base_default22("upper", i, 1, A, strideA1, strideA2, offsetA, A, strideA1, offsetA + i * strideA2, 0, W, strideW1, offsetW + iw * strideW2);
        if (i < N - 1) {
          base_default25("transpose", i, N - 1 - i, 1, W, strideW1, strideW2, offsetW + (iw + 1) * strideW2, A, strideA1, offsetA + i * strideA2, 0, W, strideW1, offsetW + (i + 1) * strideW1 + iw * strideW2);
          base_default25("no-transpose", i, N - 1 - i, -1, A, strideA1, strideA2, offsetA + (i + 1) * strideA2, W, strideW1, offsetW + (i + 1) * strideW1 + iw * strideW2, 1, W, strideW1, offsetW + iw * strideW2);
          base_default25("transpose", i, N - 1 - i, 1, A, strideA1, strideA2, offsetA + (i + 1) * strideA2, A, strideA1, offsetA + i * strideA2, 0, W, strideW1, offsetW + (i + 1) * strideW1 + iw * strideW2);
          base_default25("no-transpose", i, N - 1 - i, -1, W, strideW1, strideW2, offsetW + (iw + 1) * strideW2, W, strideW1, offsetW + (i + 1) * strideW1 + iw * strideW2, 1, W, strideW1, offsetW + iw * strideW2);
        }
        base_default7(i, TAU[offsetTAU + (i - 1) * strideTAU], W, strideW1, offsetW + iw * strideW2);
        alpha = -(0.5 * TAU[offsetTAU + (i - 1) * strideTAU]) * base_default23(i, W, strideW1, offsetW + iw * strideW2, A, strideA1, offsetA + i * strideA2);
        base_default6(i, alpha, A, strideA1, offsetA + i * strideA2, W, strideW1, offsetW + iw * strideW2);
      }
    }
  } else {
    for (i = 0; i < nb; i++) {
      base_default25("no-transpose", N - i, i, -1, A, strideA1, strideA2, offsetA + i * strideA1, W, strideW2, offsetW + i * strideW1, 1, A, strideA1, offsetA + i * strideA1 + i * strideA2);
      base_default25("no-transpose", N - i, i, -1, W, strideW1, strideW2, offsetW + i * strideW1, A, strideA2, offsetA + i * strideA1, 1, A, strideA1, offsetA + i * strideA1 + i * strideA2);
      if (i < N - 1) {
        base_default21(N - i - 1, A, offsetA + (i + 1) * strideA1 + i * strideA2, A, strideA1, offsetA + Math.min(i + 2, N - 1) * strideA1 + i * strideA2, TAU, offsetTAU + i * strideTAU);
        e[offsetE + i * strideE] = A[offsetA + (i + 1) * strideA1 + i * strideA2];
        A[offsetA + (i + 1) * strideA1 + i * strideA2] = 1;
        base_default22("lower", N - i - 1, 1, A, strideA1, strideA2, offsetA + (i + 1) * strideA1 + (i + 1) * strideA2, A, strideA1, offsetA + (i + 1) * strideA1 + i * strideA2, 0, W, strideW1, offsetW + (i + 1) * strideW1 + i * strideW2);
        base_default25("transpose", N - i - 1, i, 1, W, strideW1, strideW2, offsetW + (i + 1) * strideW1, A, strideA1, offsetA + (i + 1) * strideA1 + i * strideA2, 0, W, strideW1, offsetW + i * strideW2);
        base_default25("no-transpose", N - i - 1, i, -1, A, strideA1, strideA2, offsetA + (i + 1) * strideA1, W, strideW1, offsetW + i * strideW2, 1, W, strideW1, offsetW + (i + 1) * strideW1 + i * strideW2);
        base_default25("transpose", N - i - 1, i, 1, A, strideA1, strideA2, offsetA + (i + 1) * strideA1, A, strideA1, offsetA + (i + 1) * strideA1 + i * strideA2, 0, W, strideW1, offsetW + i * strideW2);
        base_default25("no-transpose", N - i - 1, i, -1, W, strideW1, strideW2, offsetW + (i + 1) * strideW1, W, strideW1, offsetW + i * strideW2, 1, W, strideW1, offsetW + (i + 1) * strideW1 + i * strideW2);
        base_default7(N - i - 1, TAU[offsetTAU + i * strideTAU], W, strideW1, offsetW + (i + 1) * strideW1 + i * strideW2);
        alpha = -(0.5 * TAU[offsetTAU + i * strideTAU]) * base_default23(N - i - 1, W, strideW1, offsetW + (i + 1) * strideW1 + i * strideW2, A, strideA1, offsetA + (i + 1) * strideA1 + i * strideA2);
        base_default6(N - i - 1, alpha, A, strideA1, offsetA + (i + 1) * strideA1 + i * strideA2, W, strideW1, offsetW + (i + 1) * strideW1 + i * strideW2);
      }
    }
  }
}
var base_default26 = dlatrd;

// ../notes/lib/lapack/base/dsytrd/lib/base.js
var NB3 = 32;
function dsytrd(uplo, N, A, strideA1, strideA2, offsetA, d, strideD, offsetD, e, strideE, offsetE, TAU, strideTAU, offsetTAU) {
  var ldwork;
  var work;
  var sa1;
  var sa2;
  var nb;
  var nx;
  var kk;
  var i;
  var j;
  if (N === 0) {
    return 0;
  }
  sa1 = strideA1;
  sa2 = strideA2;
  if (N <= NB3) {
    return base_default24(uplo, N, A, sa1, sa2, offsetA, d, strideD, offsetD, e, strideE, offsetE, TAU, strideTAU, offsetTAU);
  }
  nb = NB3;
  nx = nb;
  ldwork = N;
  work = new import_lib.default(ldwork * nb);
  if (uplo === "upper") {
    kk = N - Math.floor((N - nx + nb - 1) / nb) * nb;
    for (i = N - nb; i >= kk; i -= nb) {
      base_default26(uplo, i + nb, nb, A, sa1, sa2, offsetA, e, strideE, offsetE, TAU, strideTAU, offsetTAU, work, 1, ldwork, 0);
      base_default13(uplo, "no-transpose", i, nb, -1, A, sa1, sa2, offsetA + i * sa2, work, 1, ldwork, 0, 1, A, sa1, sa2, offsetA);
      for (j = i; j < i + nb; j++) {
        A[offsetA + (j - 1) * sa1 + j * sa2] = e[offsetE + (j - 1) * strideE];
        d[offsetD + j * strideD] = A[offsetA + j * sa1 + j * sa2];
      }
    }
    base_default24(uplo, kk, A, sa1, sa2, offsetA, d, strideD, offsetD, e, strideE, offsetE, TAU, strideTAU, offsetTAU);
  } else {
    i = 0;
    while (i <= N - nx - 1) {
      base_default26(uplo, N - i, nb, A, sa1, sa2, offsetA + i * sa1 + i * sa2, e, strideE, offsetE + i * strideE, TAU, strideTAU, offsetTAU + i * strideTAU, work, 1, ldwork, 0);
      base_default13(uplo, "no-transpose", N - i - nb, nb, -1, A, sa1, sa2, offsetA + (i + nb) * sa1 + i * sa2, work, 1, ldwork, nb, 1, A, sa1, sa2, offsetA + (i + nb) * sa1 + (i + nb) * sa2);
      for (j = i; j < i + nb; j++) {
        A[offsetA + (j + 1) * sa1 + j * sa2] = e[offsetE + j * strideE];
        d[offsetD + j * strideD] = A[offsetA + j * sa1 + j * sa2];
      }
      i += nb;
    }
    base_default24(uplo, N - i, A, sa1, sa2, offsetA + i * sa1 + i * sa2, d, strideD, offsetD + i * strideD, e, strideE, offsetE + i * strideE, TAU, strideTAU, offsetTAU + i * strideTAU);
  }
  return 0;
}
var base_default27 = dsytrd;

// ../notes/lib/blas/base/dger/lib/base.js
function dger(M5, N, alpha, x, strideX, offsetX, y, strideY, offsetY, A, strideA1, strideA2, offsetA) {
  var yv;
  var x0;
  var x1;
  var x2;
  var x3;
  var t0;
  var t1;
  var t2;
  var t3;
  var a0;
  var a1;
  var a2;
  var a3;
  var m4;
  var n4;
  var ix;
  var jy;
  var jj;
  var aj;
  var i;
  var j;
  var k;
  if (M5 === 0 || N === 0 || alpha === 0) {
    return A;
  }
  if (Math.abs(strideA1) <= Math.abs(strideA2)) {
    n4 = N - N % 4;
    jy = offsetY;
    for (j = 0; j < n4; j += 4) {
      t0 = y[jy];
      t1 = y[jy + strideY];
      t2 = y[jy + 2 * strideY];
      t3 = y[jy + 3 * strideY];
      if (t0 !== 0 && t1 !== 0 && t2 !== 0 && t3 !== 0) {
        t0 *= alpha;
        t1 *= alpha;
        t2 *= alpha;
        t3 *= alpha;
        a0 = offsetA + j * strideA2;
        a1 = a0 + strideA2;
        a2 = a1 + strideA2;
        a3 = a2 + strideA2;
        ix = offsetX;
        for (i = 0; i < M5; i++) {
          x0 = x[ix];
          A[a0] += x0 * t0;
          A[a1] += x0 * t1;
          A[a2] += x0 * t2;
          A[a3] += x0 * t3;
          a0 += strideA1;
          a1 += strideA1;
          a2 += strideA1;
          a3 += strideA1;
          ix += strideX;
        }
      } else {
        jj = jy;
        aj = offsetA + j * strideA2;
        for (k = 0; k < 4; k++) {
          yv = y[jj];
          if (yv !== 0) {
            t0 = alpha * yv;
            a0 = aj;
            ix = offsetX;
            for (i = 0; i < M5; i++) {
              A[a0] += x[ix] * t0;
              a0 += strideA1;
              ix += strideX;
            }
          }
          jj += strideY;
          aj += strideA2;
        }
      }
      jy += 4 * strideY;
    }
    for (; j < N; j++) {
      yv = y[jy];
      if (yv !== 0) {
        t0 = alpha * yv;
        a0 = offsetA + j * strideA2;
        ix = offsetX;
        for (i = 0; i < M5; i++) {
          A[a0] += x[ix] * t0;
          a0 += strideA1;
          ix += strideX;
        }
      }
      jy += strideY;
    }
  } else {
    m4 = M5 - M5 % 4;
    ix = offsetX;
    for (i = 0; i < m4; i += 4) {
      x0 = x[ix];
      x1 = x[ix + strideX];
      x2 = x[ix + 2 * strideX];
      x3 = x[ix + 3 * strideX];
      a0 = offsetA + i * strideA1;
      a1 = a0 + strideA1;
      a2 = a1 + strideA1;
      a3 = a2 + strideA1;
      jy = offsetY;
      for (j = 0; j < N; j++) {
        yv = y[jy];
        if (yv !== 0) {
          t0 = alpha * yv;
          A[a0] += x0 * t0;
          A[a1] += x1 * t0;
          A[a2] += x2 * t0;
          A[a3] += x3 * t0;
        }
        a0 += strideA2;
        a1 += strideA2;
        a2 += strideA2;
        a3 += strideA2;
        jy += strideY;
      }
      ix += 4 * strideX;
    }
    for (; i < M5; i++) {
      x0 = x[ix];
      a0 = offsetA + i * strideA1;
      jy = offsetY;
      for (j = 0; j < N; j++) {
        yv = y[jy];
        if (yv !== 0) {
          A[a0] += x0 * (alpha * yv);
        }
        a0 += strideA2;
        jy += strideY;
      }
      ix += strideX;
    }
  }
  return A;
}
var base_default28 = dger;

// ../notes/lib/lapack/base/iladlr/lib/base.js
function iladlr(M5, N, A, strideA1, strideA2, offsetA) {
  var result;
  var i;
  var j;
  if (M5 === 0) {
    return -1;
  }
  if (A[offsetA + (M5 - 1) * strideA1] !== 0 || A[offsetA + (M5 - 1) * strideA1 + (N - 1) * strideA2] !== 0) {
    return M5 - 1;
  }
  result = -1;
  for (j = 0; j < N; j++) {
    i = M5 - 1;
    while (i >= 0 && A[offsetA + i * strideA1 + j * strideA2] === 0) {
      i -= 1;
    }
    if (i > result) {
      result = i;
    }
  }
  return result;
}
var base_default29 = iladlr;

// ../notes/lib/lapack/base/iladlc/lib/base.js
function iladlc(M5, N, A, strideA1, strideA2, offsetA) {
  var i;
  var j;
  if (N === 0) {
    return -1;
  }
  if (A[offsetA + (N - 1) * strideA2] !== 0 || A[offsetA + (M5 - 1) * strideA1 + (N - 1) * strideA2] !== 0) {
    return N - 1;
  }
  for (j = N - 1; j >= 0; j--) {
    for (i = 0; i < M5; i++) {
      if (A[offsetA + i * strideA1 + j * strideA2] !== 0) {
        return j;
      }
    }
  }
  return -1;
}
var base_default30 = iladlc;

// ../notes/lib/lapack/base/dlarf/lib/base.js
function dlarf(side, M5, N, v, strideV, offsetV, tau, C, strideC1, strideC2, offsetC, WORK, strideWork, offsetWork) {
  var applyLeft;
  var lastv;
  var lastc;
  var ix;
  applyLeft = side === "left";
  lastv = 0;
  lastc = 0;
  if (tau !== 0) {
    if (applyLeft) {
      lastv = M5;
    } else {
      lastv = N;
    }
    if (strideV > 0) {
      ix = offsetV + (lastv - 1) * strideV;
    } else {
      ix = offsetV;
    }
    while (lastv > 0 && v[ix] === 0) {
      lastv -= 1;
      ix -= strideV;
    }
    if (applyLeft) {
      lastc = base_default30(lastv, N, C, strideC1, strideC2, offsetC) + 1;
    } else {
      lastc = base_default29(M5, lastv, C, strideC1, strideC2, offsetC) + 1;
    }
  }
  if (applyLeft) {
    if (lastv > 0) {
      base_default25("transpose", lastv, lastc, 1, C, strideC1, strideC2, offsetC, v, strideV, offsetV, 0, WORK, strideWork, offsetWork);
      base_default28(lastv, lastc, -tau, v, strideV, offsetV, WORK, strideWork, offsetWork, C, strideC1, strideC2, offsetC);
    }
  } else if (lastv > 0) {
    base_default25("no-transpose", lastc, lastv, 1, C, strideC1, strideC2, offsetC, v, strideV, offsetV, 0, WORK, strideWork, offsetWork);
    base_default28(lastc, lastv, -tau, WORK, strideWork, offsetWork, v, strideV, offsetV, C, strideC1, strideC2, offsetC);
  }
}
var base_default31 = dlarf;

// ../notes/lib/lapack/base/dorg2r/lib/base.js
function dorg2r(M5, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWork, offsetWork) {
  var i;
  var j;
  var l;
  if (N <= 0) {
    return 0;
  }
  for (j = K; j < N; j++) {
    for (l = 0; l < M5; l++) {
      A[offsetA + l * strideA1 + j * strideA2] = 0;
    }
    A[offsetA + j * strideA1 + j * strideA2] = 1;
  }
  for (i = K - 1; i >= 0; i--) {
    if (i < N - 1) {
      A[offsetA + i * strideA1 + i * strideA2] = 1;
      base_default31("left", M5 - i, N - i - 1, A, strideA1, offsetA + i * strideA1 + i * strideA2, TAU[offsetTAU + i * strideTAU], A, strideA1, strideA2, offsetA + i * strideA1 + (i + 1) * strideA2, WORK, strideWork, offsetWork);
    }
    if (i < M5 - 1) {
      base_default7(M5 - i - 1, -TAU[offsetTAU + i * strideTAU], A, strideA1, offsetA + (i + 1) * strideA1 + i * strideA2);
    }
    A[offsetA + i * strideA1 + i * strideA2] = 1 - TAU[offsetTAU + i * strideTAU];
    for (l = 0; l < i; l++) {
      A[offsetA + l * strideA1 + i * strideA2] = 0;
    }
  }
  return 0;
}
var base_default32 = dorg2r;

// ../notes/lib/lapack/base/dlarft/lib/base.js
function dlarft(direct, storev, N, K, V, strideV1, strideV2, offsetV, TAU, strideTAU, offsetTAU, T, strideT1, strideT2, offsetT) {
  var prevlastv;
  var lastv;
  var jj;
  var i;
  var j;
  if (N === 0) {
    return;
  }
  if (direct === "forward") {
    prevlastv = N;
    for (i = 0; i < K; i++) {
      prevlastv = Math.max(prevlastv, i);
      if (TAU[offsetTAU + i * strideTAU] === 0) {
        for (j = 0; j <= i; j++) {
          T[offsetT + j * strideT1 + i * strideT2] = 0;
        }
      } else {
        if (storev === "columnwise") {
          lastv = N;
          for (jj = N - 1; jj > i; jj--) {
            if (V[offsetV + jj * strideV1 + i * strideV2] !== 0) {
              break;
            }
            lastv = jj;
          }
          for (j = 0; j < i; j++) {
            T[offsetT + j * strideT1 + i * strideT2] = -(TAU[offsetTAU + i * strideTAU] * V[offsetV + i * strideV1 + j * strideV2]);
          }
          jj = Math.min(lastv, prevlastv);
          if (jj - i - 1 > 0) {
            base_default25("transpose", jj - i - 1, i, -TAU[offsetTAU + i * strideTAU], V, strideV1, strideV2, offsetV + (i + 1) * strideV1, V, strideV1, offsetV + (i + 1) * strideV1 + i * strideV2, 1, T, strideT1, offsetT + i * strideT2);
          }
        } else {
          lastv = N;
          for (jj = N - 1; jj > i; jj--) {
            if (V[offsetV + i * strideV1 + jj * strideV2] !== 0) {
              break;
            }
            lastv = jj;
          }
          for (j = 0; j < i; j++) {
            T[offsetT + j * strideT1 + i * strideT2] = -(TAU[offsetTAU + i * strideTAU] * V[offsetV + j * strideV1 + i * strideV2]);
          }
          jj = Math.min(lastv, prevlastv);
          if (jj - i - 1 > 0) {
            base_default25("no-transpose", i, jj - i - 1, -TAU[offsetTAU + i * strideTAU], V, strideV1, strideV2, offsetV + (i + 1) * strideV2, V, strideV2, offsetV + i * strideV1 + (i + 1) * strideV2, 1, T, strideT1, offsetT + i * strideT2);
          }
        }
        if (i > 0) {
          base_default9("upper", "no-transpose", "non-unit", i, T, strideT1, strideT2, offsetT, T, strideT1, offsetT + i * strideT2);
        }
        T[offsetT + i * strideT1 + i * strideT2] = TAU[offsetTAU + i * strideTAU];
        if (i > 0) {
          prevlastv = Math.max(prevlastv, lastv);
        } else {
          prevlastv = lastv;
        }
      }
    }
  } else {
    prevlastv = 0;
    for (i = K - 1; i >= 0; i--) {
      if (TAU[offsetTAU + i * strideTAU] === 0) {
        for (j = i; j < K; j++) {
          T[offsetT + j * strideT1 + i * strideT2] = 0;
        }
      } else {
        if (i < K - 1) {
          if (storev === "columnwise") {
            lastv = 0;
            for (jj = 0; jj < i; jj++) {
              if (V[offsetV + jj * strideV1 + i * strideV2] !== 0) {
                break;
              }
              lastv = jj + 1;
            }
            for (j = i + 1; j < K; j++) {
              T[offsetT + j * strideT1 + i * strideT2] = -(TAU[offsetTAU + i * strideTAU] * V[offsetV + (N - K + i) * strideV1 + j * strideV2]);
            }
            jj = Math.max(lastv, prevlastv);
            if (N - K + i - jj > 0) {
              base_default25("transpose", N - K + i - jj, K - i - 1, -TAU[offsetTAU + i * strideTAU], V, strideV1, strideV2, offsetV + jj * strideV1 + (i + 1) * strideV2, V, strideV1, offsetV + jj * strideV1 + i * strideV2, 1, T, strideT1, offsetT + (i + 1) * strideT1 + i * strideT2);
            }
          } else {
            lastv = 0;
            for (jj = 0; jj < i; jj++) {
              if (V[offsetV + i * strideV1 + jj * strideV2] !== 0) {
                break;
              }
              lastv = jj + 1;
            }
            for (j = i + 1; j < K; j++) {
              T[offsetT + j * strideT1 + i * strideT2] = -(TAU[offsetTAU + i * strideTAU] * V[offsetV + j * strideV1 + (N - K + i) * strideV2]);
            }
            jj = Math.max(lastv, prevlastv);
            if (N - K + i - jj > 0) {
              base_default25("no-transpose", K - i - 1, N - K + i - jj, -TAU[offsetTAU + i * strideTAU], V, strideV1, strideV2, offsetV + (i + 1) * strideV1 + jj * strideV2, V, strideV2, offsetV + i * strideV1 + jj * strideV2, 1, T, strideT1, offsetT + (i + 1) * strideT1 + i * strideT2);
            }
          }
          base_default9("lower", "no-transpose", "non-unit", K - i - 1, T, strideT1, strideT2, offsetT + (i + 1) * strideT1 + (i + 1) * strideT2, T, strideT1, offsetT + (i + 1) * strideT1 + i * strideT2);
          if (i > 0) {
            prevlastv = Math.min(prevlastv, lastv);
          } else {
            prevlastv = lastv;
          }
        }
        T[offsetT + i * strideT1 + i * strideT2] = TAU[offsetTAU + i * strideTAU];
      }
    }
  }
}
var base_default33 = dlarft;

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
var base_default34 = dcopy;

// ../notes/lib/lapack/base/dlarfb/lib/base.js
function dlarfb(side, trans, direct, storev, M5, N, K, V, strideV1, strideV2, offsetV, T, strideT1, strideT2, offsetT, C, strideC1, strideC2, offsetC, WORK, strideWork1, strideWork2, offsetWork) {
  var transt;
  var i;
  var j;
  if (M5 <= 0 || N <= 0) {
    return;
  }
  if (trans === "no-transpose") {
    transt = "transpose";
  } else {
    transt = "no-transpose";
  }
  if (storev === "columnwise") {
    if (direct === "forward") {
      if (side === "left") {
        for (j = 0; j < K; j++) {
          base_default34(N, C, strideC2, offsetC + j * strideC1, WORK, strideWork1, offsetWork + j * strideWork2);
        }
        base_default14("right", "lower", "no-transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWork1, strideWork2, offsetWork);
        if (M5 > K) {
          base_default4("transpose", "no-transpose", N, K, M5 - K, 1, C, strideC1, strideC2, offsetC + K * strideC1, V, strideV1, strideV2, offsetV + K * strideV1, 1, WORK, strideWork1, strideWork2, offsetWork);
        }
        base_default14("right", "upper", transt, "non-unit", N, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWork1, strideWork2, offsetWork);
        if (M5 > K) {
          base_default4("no-transpose", "transpose", M5 - K, N, K, -1, V, strideV1, strideV2, offsetV + K * strideV1, WORK, strideWork1, strideWork2, offsetWork, 1, C, strideC1, strideC2, offsetC + K * strideC1);
        }
        base_default14("right", "lower", "transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWork1, strideWork2, offsetWork);
        for (j = 0; j < K; j++) {
          for (i = 0; i < N; i++) {
            C[offsetC + j * strideC1 + i * strideC2] -= WORK[offsetWork + i * strideWork1 + j * strideWork2];
          }
        }
      } else if (side === "right") {
        for (j = 0; j < K; j++) {
          base_default34(M5, C, strideC1, offsetC + j * strideC2, WORK, strideWork1, offsetWork + j * strideWork2);
        }
        base_default14("right", "lower", "no-transpose", "unit", M5, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWork1, strideWork2, offsetWork);
        if (N > K) {
          base_default4("no-transpose", "no-transpose", M5, K, N - K, 1, C, strideC1, strideC2, offsetC + K * strideC2, V, strideV1, strideV2, offsetV + K * strideV1, 1, WORK, strideWork1, strideWork2, offsetWork);
        }
        base_default14("right", "upper", trans, "non-unit", M5, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWork1, strideWork2, offsetWork);
        if (N > K) {
          base_default4("no-transpose", "transpose", M5, N - K, K, -1, WORK, strideWork1, strideWork2, offsetWork, V, strideV1, strideV2, offsetV + K * strideV1, 1, C, strideC1, strideC2, offsetC + K * strideC2);
        }
        base_default14("right", "lower", "transpose", "unit", M5, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWork1, strideWork2, offsetWork);
        for (j = 0; j < K; j++) {
          for (i = 0; i < M5; i++) {
            C[offsetC + i * strideC1 + j * strideC2] -= WORK[offsetWork + i * strideWork1 + j * strideWork2];
          }
        }
      }
    } else if (side === "left") {
      for (j = 0; j < K; j++) {
        base_default34(N, C, strideC2, offsetC + (M5 - K + j) * strideC1, WORK, strideWork1, offsetWork + j * strideWork2);
      }
      base_default14("right", "upper", "no-transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV + (M5 - K) * strideV1, WORK, strideWork1, strideWork2, offsetWork);
      if (M5 > K) {
        base_default4("transpose", "no-transpose", N, K, M5 - K, 1, C, strideC1, strideC2, offsetC, V, strideV1, strideV2, offsetV, 1, WORK, strideWork1, strideWork2, offsetWork);
      }
      base_default14("right", "lower", transt, "non-unit", N, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWork1, strideWork2, offsetWork);
      if (M5 > K) {
        base_default4("no-transpose", "transpose", M5 - K, N, K, -1, V, strideV1, strideV2, offsetV, WORK, strideWork1, strideWork2, offsetWork, 1, C, strideC1, strideC2, offsetC);
      }
      base_default14("right", "upper", "transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV + (M5 - K) * strideV1, WORK, strideWork1, strideWork2, offsetWork);
      for (j = 0; j < K; j++) {
        for (i = 0; i < N; i++) {
          C[offsetC + (M5 - K + j) * strideC1 + i * strideC2] -= WORK[offsetWork + i * strideWork1 + j * strideWork2];
        }
      }
    } else if (side === "right") {
      for (j = 0; j < K; j++) {
        base_default34(M5, C, strideC1, offsetC + (N - K + j) * strideC2, WORK, strideWork1, offsetWork + j * strideWork2);
      }
      base_default14("right", "upper", "no-transpose", "unit", M5, K, 1, V, strideV1, strideV2, offsetV + (N - K) * strideV1, WORK, strideWork1, strideWork2, offsetWork);
      if (N > K) {
        base_default4("no-transpose", "no-transpose", M5, K, N - K, 1, C, strideC1, strideC2, offsetC, V, strideV1, strideV2, offsetV, 1, WORK, strideWork1, strideWork2, offsetWork);
      }
      base_default14("right", "lower", trans, "non-unit", M5, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWork1, strideWork2, offsetWork);
      if (N > K) {
        base_default4("no-transpose", "transpose", M5, N - K, K, -1, WORK, strideWork1, strideWork2, offsetWork, V, strideV1, strideV2, offsetV, 1, C, strideC1, strideC2, offsetC);
      }
      base_default14("right", "upper", "transpose", "unit", M5, K, 1, V, strideV1, strideV2, offsetV + (N - K) * strideV1, WORK, strideWork1, strideWork2, offsetWork);
      for (j = 0; j < K; j++) {
        for (i = 0; i < M5; i++) {
          C[offsetC + i * strideC1 + (N - K + j) * strideC2] -= WORK[offsetWork + i * strideWork1 + j * strideWork2];
        }
      }
    }
  } else if (direct === "forward") {
    if (side === "left") {
      for (j = 0; j < K; j++) {
        base_default34(N, C, strideC2, offsetC + j * strideC1, WORK, strideWork1, offsetWork + j * strideWork2);
      }
      base_default14("right", "upper", "transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWork1, strideWork2, offsetWork);
      if (M5 > K) {
        base_default4("transpose", "transpose", N, K, M5 - K, 1, C, strideC1, strideC2, offsetC + K * strideC1, V, strideV1, strideV2, offsetV + K * strideV2, 1, WORK, strideWork1, strideWork2, offsetWork);
      }
      base_default14("right", "upper", transt, "non-unit", N, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWork1, strideWork2, offsetWork);
      if (M5 > K) {
        base_default4("transpose", "transpose", M5 - K, N, K, -1, V, strideV1, strideV2, offsetV + K * strideV2, WORK, strideWork1, strideWork2, offsetWork, 1, C, strideC1, strideC2, offsetC + K * strideC1);
      }
      base_default14("right", "upper", "no-transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWork1, strideWork2, offsetWork);
      for (j = 0; j < K; j++) {
        for (i = 0; i < N; i++) {
          C[offsetC + j * strideC1 + i * strideC2] -= WORK[offsetWork + i * strideWork1 + j * strideWork2];
        }
      }
    } else if (side === "right") {
      for (j = 0; j < K; j++) {
        base_default34(M5, C, strideC1, offsetC + j * strideC2, WORK, strideWork1, offsetWork + j * strideWork2);
      }
      base_default14("right", "upper", "transpose", "unit", M5, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWork1, strideWork2, offsetWork);
      if (N > K) {
        base_default4("no-transpose", "transpose", M5, K, N - K, 1, C, strideC1, strideC2, offsetC + K * strideC2, V, strideV1, strideV2, offsetV + K * strideV2, 1, WORK, strideWork1, strideWork2, offsetWork);
      }
      base_default14("right", "upper", trans, "non-unit", M5, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWork1, strideWork2, offsetWork);
      if (N > K) {
        base_default4("no-transpose", "no-transpose", M5, N - K, K, -1, WORK, strideWork1, strideWork2, offsetWork, V, strideV1, strideV2, offsetV + K * strideV2, 1, C, strideC1, strideC2, offsetC + K * strideC2);
      }
      base_default14("right", "upper", "no-transpose", "unit", M5, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWork1, strideWork2, offsetWork);
      for (j = 0; j < K; j++) {
        for (i = 0; i < M5; i++) {
          C[offsetC + i * strideC1 + j * strideC2] -= WORK[offsetWork + i * strideWork1 + j * strideWork2];
        }
      }
    }
  } else if (side === "left") {
    for (j = 0; j < K; j++) {
      base_default34(N, C, strideC2, offsetC + (M5 - K + j) * strideC1, WORK, strideWork1, offsetWork + j * strideWork2);
    }
    base_default14("right", "lower", "transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV + (M5 - K) * strideV2, WORK, strideWork1, strideWork2, offsetWork);
    if (M5 > K) {
      base_default4("transpose", "transpose", N, K, M5 - K, 1, C, strideC1, strideC2, offsetC, V, strideV1, strideV2, offsetV, 1, WORK, strideWork1, strideWork2, offsetWork);
    }
    base_default14("right", "lower", transt, "non-unit", N, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWork1, strideWork2, offsetWork);
    if (M5 > K) {
      base_default4("transpose", "transpose", M5 - K, N, K, -1, V, strideV1, strideV2, offsetV, WORK, strideWork1, strideWork2, offsetWork, 1, C, strideC1, strideC2, offsetC);
    }
    base_default14("right", "lower", "no-transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV + (M5 - K) * strideV2, WORK, strideWork1, strideWork2, offsetWork);
    for (j = 0; j < K; j++) {
      for (i = 0; i < N; i++) {
        C[offsetC + (M5 - K + j) * strideC1 + i * strideC2] -= WORK[offsetWork + i * strideWork1 + j * strideWork2];
      }
    }
  } else if (side === "right") {
    for (j = 0; j < K; j++) {
      base_default34(M5, C, strideC1, offsetC + (N - K + j) * strideC2, WORK, strideWork1, offsetWork + j * strideWork2);
    }
    base_default14("right", "lower", "transpose", "unit", M5, K, 1, V, strideV1, strideV2, offsetV + (N - K) * strideV2, WORK, strideWork1, strideWork2, offsetWork);
    if (N > K) {
      base_default4("no-transpose", "transpose", M5, K, N - K, 1, C, strideC1, strideC2, offsetC, V, strideV1, strideV2, offsetV, 1, WORK, strideWork1, strideWork2, offsetWork);
    }
    base_default14("right", "lower", trans, "non-unit", M5, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWork1, strideWork2, offsetWork);
    if (N > K) {
      base_default4("no-transpose", "no-transpose", M5, N - K, K, -1, WORK, strideWork1, strideWork2, offsetWork, V, strideV1, strideV2, offsetV, 1, C, strideC1, strideC2, offsetC);
    }
    base_default14("right", "lower", "no-transpose", "unit", M5, K, 1, V, strideV1, strideV2, offsetV + (N - K) * strideV2, WORK, strideWork1, strideWork2, offsetWork);
    for (j = 0; j < K; j++) {
      for (i = 0; i < M5; i++) {
        C[offsetC + i * strideC1 + (N - K + j) * strideC2] -= WORK[offsetWork + i * strideWork1 + j * strideWork2];
      }
    }
  }
}
var base_default35 = dlarfb;

// ../notes/lib/lapack/base/dorgqr/lib/base.js
var NB4 = 32;
function dorgqr(M5, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWork, offsetWork) {
  var ldwork;
  var nb;
  var nx;
  var kk;
  var ki;
  var ib;
  var i;
  var j;
  var l;
  if (N <= 0) {
    return 0;
  }
  nb = NB4;
  nx = 0;
  ldwork = N;
  if (nb >= 2 && nb < K) {
    nx = 0;
    if (nx < K) {
      ki = Math.floor((K - nx - 1) / nb) * nb;
      kk = Math.min(K, ki + nb);
      for (j = kk; j < N; j++) {
        for (i = 0; i < kk; i++) {
          A[offsetA + i * strideA1 + j * strideA2] = 0;
        }
      }
    }
  } else {
    kk = 0;
  }
  if (kk < N) {
    base_default32(M5 - kk, N - kk, K - kk, A, strideA1, strideA2, offsetA + kk * strideA1 + kk * strideA2, TAU, strideTAU, offsetTAU + kk * strideTAU, WORK, strideWork, offsetWork);
  }
  if (kk > 0) {
    for (i = ki; i >= 0; i -= nb) {
      ib = Math.min(nb, K - i);
      if (i + ib < N) {
        base_default33("forward", "columnwise", M5 - i, ib, A, strideA1, strideA2, offsetA + i * strideA1 + i * strideA2, TAU, strideTAU, offsetTAU + i * strideTAU, WORK, 1, ldwork, offsetWork);
        base_default35("left", "no-transpose", "forward", "columnwise", M5 - i, N - i - ib, ib, A, strideA1, strideA2, offsetA + i * strideA1 + i * strideA2, WORK, 1, ldwork, offsetWork, A, strideA1, strideA2, offsetA + i * strideA1 + (i + ib) * strideA2, WORK, 1, ldwork, offsetWork + ib);
      }
      base_default32(M5 - i, ib, ib, A, strideA1, strideA2, offsetA + i * strideA1 + i * strideA2, TAU, strideTAU, offsetTAU + i * strideTAU, WORK, 1, offsetWork);
      for (j = i; j < i + ib; j++) {
        for (l = 0; l < i; l++) {
          A[offsetA + l * strideA1 + j * strideA2] = 0;
        }
      }
    }
  }
  return 0;
}
var base_default36 = dorgqr;

// ../notes/lib/lapack/base/dorgql/lib/base.js
var import_lib2 = __toESM(require_lib13(), 1);

// ../notes/lib/lapack/base/dorg2l/lib/base.js
function dorg2l(M5, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWork, offsetWork) {
  var ii;
  var i;
  var j;
  var l;
  if (N <= 0) {
    return 0;
  }
  for (j = 0; j < N - K; j++) {
    for (l = 0; l < M5; l++) {
      A[offsetA + l * strideA1 + j * strideA2] = 0;
    }
    A[offsetA + (M5 - N + j) * strideA1 + j * strideA2] = 1;
  }
  for (i = 0; i < K; i++) {
    ii = N - K + i;
    A[offsetA + (M5 - N + ii) * strideA1 + ii * strideA2] = 1;
    if (ii > 0) {
      base_default31("left", M5 - N + ii + 1, ii, A, strideA1, offsetA + ii * strideA2, TAU[offsetTAU + i * strideTAU], A, strideA1, strideA2, offsetA, WORK, strideWork, offsetWork);
    }
    if (M5 - N + ii > 0) {
      base_default7(M5 - N + ii, -TAU[offsetTAU + i * strideTAU], A, strideA1, offsetA + ii * strideA2);
    }
    A[offsetA + (M5 - N + ii) * strideA1 + ii * strideA2] = 1 - TAU[offsetTAU + i * strideTAU];
    for (l = M5 - N + ii + 1; l < M5; l++) {
      A[offsetA + l * strideA1 + ii * strideA2] = 0;
    }
  }
  return 0;
}
var base_default37 = dorg2l;

// ../notes/lib/lapack/base/dorgql/lib/base.js
var NB5 = 32;
function dorgql(M5, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWork, offsetWork) {
  var ldwork;
  var work;
  var nb;
  var kk;
  var ib;
  var i;
  var j;
  var l;
  if (N <= 0) {
    return 0;
  }
  nb = NB5;
  ldwork = N;
  if (nb >= 2 && nb < K) {
    kk = Math.min(K, Math.floor((K + nb - 1) / nb) * nb);
    for (j = 0; j < N - kk; j++) {
      for (i = M5 - kk; i < M5; i++) {
        A[offsetA + i * strideA1 + j * strideA2] = 0;
      }
    }
  } else {
    kk = 0;
  }
  base_default37(M5 - kk, N - kk, K - kk, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWork, offsetWork);
  if (kk > 0) {
    work = new import_lib2.default(ldwork * nb);
    for (i = K - kk; i < K; i += nb) {
      ib = Math.min(nb, K - i);
      if (N - K + i > 0) {
        base_default33("backward", "columnwise", M5 - K + i + ib, ib, A, strideA1, strideA2, offsetA + (N - K + i) * strideA2, TAU, strideTAU, offsetTAU + i * strideTAU, work, 1, ldwork, 0);
        base_default35("left", "no-transpose", "backward", "columnwise", M5 - K + i + ib, N - K + i, ib, A, strideA1, strideA2, offsetA + (N - K + i) * strideA2, work, 1, ldwork, 0, A, strideA1, strideA2, offsetA, work, 1, ldwork, ib);
      }
      base_default37(M5 - K + i + ib, ib, ib, A, strideA1, strideA2, offsetA + (N - K + i) * strideA2, TAU, strideTAU, offsetTAU + i * strideTAU, work, 1, 0);
      for (j = N - K + i; j < N - K + i + ib; j++) {
        for (l = M5 - K + i + ib; l < M5; l++) {
          A[offsetA + l * strideA1 + j * strideA2] = 0;
        }
      }
    }
  }
  return 0;
}
var base_default38 = dorgql;

// ../notes/lib/lapack/base/dorgtr/lib/base.js
function dorgtr(uplo, N, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWork, offsetWork) {
  var upper;
  var pa;
  var i;
  var j;
  upper = uplo === "upper";
  if (N === 0) {
    return 0;
  }
  if (upper) {
    for (j = 0; j < N - 1; j++) {
      for (i = 0; i < j; i++) {
        A[offsetA + i * strideA1 + j * strideA2] = A[offsetA + i * strideA1 + (j + 1) * strideA2];
      }
      A[offsetA + (N - 1) * strideA1 + j * strideA2] = 0;
    }
    for (i = 0; i < N - 1; i++) {
      A[offsetA + i * strideA1 + (N - 1) * strideA2] = 0;
    }
    A[offsetA + (N - 1) * strideA1 + (N - 1) * strideA2] = 1;
    if (N - 1 > 0) {
      base_default38(N - 1, N - 1, N - 1, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWork, offsetWork);
    }
  } else {
    for (j = N - 1; j >= 1; j--) {
      A[offsetA + j * strideA2] = 0;
      for (i = j + 1; i < N; i++) {
        A[offsetA + i * strideA1 + j * strideA2] = A[offsetA + i * strideA1 + (j - 1) * strideA2];
      }
    }
    A[offsetA] = 1;
    for (i = 1; i < N; i++) {
      A[offsetA + i * strideA1] = 0;
    }
    if (N > 1) {
      pa = offsetA + strideA1 + strideA2;
      base_default36(N - 1, N - 1, N - 1, A, strideA1, strideA2, pa, TAU, strideTAU, offsetTAU, WORK, strideWork, offsetWork);
    }
  }
  return 0;
}
var base_default39 = dorgtr;

// ../notes/lib/lapack/base/dlacpy/lib/base.js
function dlacpy(uplo, M5, N, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB) {
  var da0;
  var db0;
  var i;
  var j;
  if (uplo === "upper") {
    for (j = 0; j < N; j++) {
      da0 = offsetA + j * strideA2;
      db0 = offsetB + j * strideB2;
      for (i = 0; i <= j && i < M5; i++) {
        B[db0 + i * strideB1] = A[da0 + i * strideA1];
      }
    }
  } else if (uplo === "lower") {
    for (j = 0; j < N; j++) {
      da0 = offsetA + j * strideA2;
      db0 = offsetB + j * strideB2;
      for (i = j; i < M5; i++) {
        B[db0 + i * strideB1] = A[da0 + i * strideA1];
      }
    }
  } else {
    for (j = 0; j < N; j++) {
      da0 = offsetA + j * strideA2;
      db0 = offsetB + j * strideB2;
      for (i = 0; i < M5; i++) {
        B[db0 + i * strideB1] = A[da0 + i * strideA1];
      }
    }
  }
  return B;
}
var base_default40 = dlacpy;

// ../notes/lib/lapack/base/dsteqr/lib/base.js
var import_lib3 = __toESM(require_lib13(), 1);

// ../notes/lib/lapack/base/dlanst/lib/base.js
function dlanst(norm, N, d, strideD, offsetD, e, strideE, offsetE) {
  var anorm;
  var sum;
  var out;
  var id;
  var ie;
  var i;
  if (N <= 0) {
    return 0;
  }
  if (norm === "max") {
    id = offsetD + (N - 1) * strideD;
    anorm = Math.abs(d[id]);
    id = offsetD;
    ie = offsetE;
    for (i = 0; i < N - 1; i++) {
      sum = Math.abs(d[id]);
      if (anorm < sum || sum !== sum) {
        anorm = sum;
      }
      sum = Math.abs(e[ie]);
      if (anorm < sum || sum !== sum) {
        anorm = sum;
      }
      id += strideD;
      ie += strideE;
    }
  } else if (norm === "one-norm" || norm === "one-norm" || norm === "inf-norm") {
    if (N === 1) {
      anorm = Math.abs(d[offsetD]);
    } else {
      anorm = Math.abs(d[offsetD]) + Math.abs(e[offsetE]);
      sum = Math.abs(e[offsetE + (N - 2) * strideE]) + Math.abs(d[offsetD + (N - 1) * strideD]);
      if (anorm < sum || sum !== sum) {
        anorm = sum;
      }
      id = offsetD + strideD;
      ie = offsetE;
      for (i = 1; i < N - 1; i++) {
        sum = Math.abs(d[id]) + Math.abs(e[ie]) + Math.abs(e[ie + strideE]);
        if (anorm < sum || sum !== sum) {
          anorm = sum;
        }
        id += strideD;
        ie += strideE;
      }
    }
  } else if (norm === "frobenius") {
    if (N > 1) {
      out = base_default17(N - 1, e, strideE, offsetE, 0, 1);
      sum = 2 * out.sumsq;
    } else {
      sum = 1;
    }
    if (N > 1) {
      out = base_default17(N, d, strideD, offsetD, out.scl, sum);
    } else {
      out = base_default17(N, d, strideD, offsetD, 0, 1);
    }
    anorm = out.scl * Math.sqrt(out.sumsq);
  }
  return anorm;
}
var base_default41 = dlanst;

// ../notes/lib/lapack/base/dlae2/lib/base.js
function dlae2(a, b, c) {
  var acmn;
  var acmx;
  var adf;
  var rt1;
  var rt2;
  var sm;
  var tb;
  var ab;
  var df;
  var rt;
  sm = a + c;
  df = a - c;
  adf = Math.abs(df);
  tb = b + b;
  ab = Math.abs(tb);
  if (Math.abs(a) > Math.abs(c)) {
    acmx = a;
    acmn = c;
  } else {
    acmx = c;
    acmn = a;
  }
  if (adf > ab) {
    rt = adf * Math.sqrt(1 + ab / adf * (ab / adf));
  } else if (adf < ab) {
    rt = ab * Math.sqrt(1 + adf / ab * (adf / ab));
  } else {
    rt = ab * Math.sqrt(2);
  }
  if (sm < 0) {
    rt1 = 0.5 * (sm - rt);
    rt2 = acmx / rt1 * acmn - b / rt1 * b;
  } else if (sm > 0) {
    rt1 = 0.5 * (sm + rt);
    rt2 = acmx / rt1 * acmn - b / rt1 * b;
  } else {
    rt1 = 0.5 * rt;
    rt2 = -(0.5 * rt);
  }
  return {
    "rt1": rt1,
    "rt2": rt2
  };
}
var base_default42 = dlae2;

// ../notes/lib/lapack/base/dlaev2/lib/base.js
function dlaev2(a, b, c) {
  var acmn;
  var acmx;
  var sgn1;
  var sgn2;
  var adf;
  var acs;
  var cs1;
  var sn1;
  var rt1;
  var rt2;
  var sm;
  var tb;
  var ab;
  var cs;
  var ct;
  var df;
  var rt;
  var tn;
  sm = a + c;
  df = a - c;
  adf = Math.abs(df);
  tb = b + b;
  ab = Math.abs(tb);
  if (Math.abs(a) > Math.abs(c)) {
    acmx = a;
    acmn = c;
  } else {
    acmx = c;
    acmn = a;
  }
  if (adf > ab) {
    rt = adf * Math.sqrt(1 + ab / adf * (ab / adf));
  } else if (adf < ab) {
    rt = ab * Math.sqrt(1 + adf / ab * (adf / ab));
  } else {
    rt = ab * Math.sqrt(2);
  }
  if (sm < 0) {
    rt1 = 0.5 * (sm - rt);
    sgn1 = -1;
    rt2 = acmx / rt1 * acmn - b / rt1 * b;
  } else if (sm > 0) {
    rt1 = 0.5 * (sm + rt);
    sgn1 = 1;
    rt2 = acmx / rt1 * acmn - b / rt1 * b;
  } else {
    rt1 = 0.5 * rt;
    rt2 = -(0.5 * rt);
    sgn1 = 1;
  }
  if (df >= 0) {
    cs = df + rt;
    sgn2 = 1;
  } else {
    cs = df - rt;
    sgn2 = -1;
  }
  acs = Math.abs(cs);
  if (acs > ab) {
    ct = -(tb / cs);
    sn1 = 1 / Math.sqrt(1 + ct * ct);
    cs1 = ct * sn1;
  } else if (ab === 0) {
    cs1 = 1;
    sn1 = 0;
  } else {
    tn = -(cs / tb);
    cs1 = 1 / Math.sqrt(1 + tn * tn);
    sn1 = tn * cs1;
  }
  if (sgn1 === sgn2) {
    tn = cs1;
    cs1 = -sn1;
    sn1 = tn;
  }
  return {
    "rt1": rt1,
    "rt2": rt2,
    "cs1": cs1,
    "sn1": sn1
  };
}
var base_default43 = dlaev2;

// ../notes/lib/lapack/base/dlartg/lib/base.js
var SAFMIN = 22250738585072014e-324;
var SAFMAX = 449423283715579e293;
var RTMIN = Math.sqrt(SAFMIN);
var RTMAX = Math.sqrt(SAFMAX / 2);
function dlartg(f, g, out) {
  var f1;
  var g1;
  var fs;
  var gs;
  var d;
  var u;
  f1 = Math.abs(f);
  g1 = Math.abs(g);
  if (g === 0) {
    out[0] = 1;
    out[1] = 0;
    out[2] = f;
  } else if (f === 0) {
    out[0] = 0;
    out[1] = g > 0 ? 1 : -1;
    out[2] = g1;
  } else if (f1 > RTMIN && f1 < RTMAX && g1 > RTMIN && g1 < RTMAX) {
    d = Math.sqrt(f * f + g * g);
    out[0] = f1 / d;
    out[2] = f > 0 ? d : -d;
    out[1] = g / out[2];
  } else {
    u = Math.min(SAFMAX, Math.max(SAFMIN, f1, g1));
    fs = f / u;
    gs = g / u;
    d = Math.sqrt(fs * fs + gs * gs);
    out[0] = Math.abs(fs) / d;
    out[2] = f > 0 ? d * u : -(d * u);
    out[1] = gs / (f > 0 ? d : -d);
  }
  return out;
}
var base_default44 = dlartg;

// ../notes/lib/lapack/base/dlascl/lib/base.js
function dlascl(type, kl, ku, cfrom, cto, M5, N, A, strideA1, strideA2, offsetA) {
  var smlnum;
  var bignum;
  var cfromc;
  var cfrom1;
  var itype;
  var ctoc;
  var cto1;
  var done;
  var iMax;
  var iMin;
  var mul;
  var k1;
  var k2;
  var k3;
  var k4;
  var ai;
  var i;
  var j;
  if (type === "general") {
    itype = 0;
  } else if (type === "lower") {
    itype = 1;
  } else if (type === "upper") {
    itype = 2;
  } else if (type === "upper-hessenberg") {
    itype = 3;
  } else if (type === "lower-band") {
    itype = 4;
  } else if (type === "upper-band") {
    itype = 5;
  } else if (type === "band") {
    itype = 6;
  } else {
    return -1;
  }
  if (N === 0 || M5 === 0) {
    return 0;
  }
  smlnum = base_default16("safe-minimum");
  bignum = 1 / smlnum;
  cfromc = cfrom;
  ctoc = cto;
  done = false;
  while (!done) {
    cfrom1 = cfromc * smlnum;
    if (cfrom1 === cfromc) {
      mul = ctoc / cfromc;
      done = true;
    } else {
      cto1 = ctoc / bignum;
      if (cto1 === ctoc) {
        mul = ctoc;
        done = true;
        cfromc = 1;
      } else if (Math.abs(cfrom1) > Math.abs(ctoc) && ctoc !== 0) {
        mul = smlnum;
        done = false;
        cfromc = cfrom1;
      } else if (Math.abs(cto1) > Math.abs(cfromc)) {
        mul = bignum;
        done = false;
        ctoc = cto1;
      } else {
        mul = ctoc / cfromc;
        done = true;
        if (mul === 1) {
          return 0;
        }
      }
    }
    if (itype === 0) {
      for (j = 0; j < N; j++) {
        for (i = 0; i < M5; i++) {
          ai = offsetA + i * strideA1 + j * strideA2;
          A[ai] *= mul;
        }
      }
    } else if (itype === 1) {
      for (j = 0; j < N; j++) {
        for (i = j; i < M5; i++) {
          ai = offsetA + i * strideA1 + j * strideA2;
          A[ai] *= mul;
        }
      }
    } else if (itype === 2) {
      for (j = 0; j < N; j++) {
        iMax = Math.min(j + 1, M5);
        for (i = 0; i < iMax; i++) {
          ai = offsetA + i * strideA1 + j * strideA2;
          A[ai] *= mul;
        }
      }
    } else if (itype === 3) {
      for (j = 0; j < N; j++) {
        iMax = Math.min(j + 2, M5);
        for (i = 0; i < iMax; i++) {
          ai = offsetA + i * strideA1 + j * strideA2;
          A[ai] *= mul;
        }
      }
    } else if (itype === 4) {
      k3 = kl + 1;
      k4 = N + 1;
      for (j = 0; j < N; j++) {
        iMax = Math.min(k3, k4 - j - 1);
        for (i = 0; i < iMax; i++) {
          ai = offsetA + i * strideA1 + j * strideA2;
          A[ai] *= mul;
        }
      }
    } else if (itype === 5) {
      k1 = ku + 2;
      k3 = ku + 1;
      for (j = 0; j < N; j++) {
        iMin = Math.max(k1 - j - 2, 0);
        for (i = iMin; i < k3; i++) {
          ai = offsetA + i * strideA1 + j * strideA2;
          A[ai] *= mul;
        }
      }
    } else if (itype === 6) {
      k1 = kl + ku + 2;
      k2 = kl + 1;
      k3 = 2 * kl + ku + 1;
      k4 = kl + ku + 1 + M5;
      for (j = 0; j < N; j++) {
        iMin = Math.max(k1 - j - 2, k2 - 1);
        iMax = Math.min(k3, k4 - j - 1);
        for (i = iMin; i < iMax; i++) {
          ai = offsetA + i * strideA1 + j * strideA2;
          A[ai] *= mul;
        }
      }
    }
  }
  return 0;
}
var base_default45 = dlascl;

// ../notes/lib/lapack/base/dlaset/lib/base.js
function dlaset(uplo, M5, N, alpha, beta, A, strideA1, strideA2, offsetA) {
  var idx;
  var mn;
  var i;
  var j;
  mn = Math.min(M5, N);
  if (uplo === "upper") {
    for (j = 1; j < N; j++) {
      idx = offsetA + j * strideA2;
      for (i = 0; i < Math.min(j, M5); i++) {
        A[idx] = alpha;
        idx += strideA1;
      }
    }
  } else if (uplo === "lower") {
    for (j = 0; j < mn; j++) {
      idx = offsetA + (j + 1) * strideA1 + j * strideA2;
      for (i = j + 1; i < M5; i++) {
        A[idx] = alpha;
        idx += strideA1;
      }
    }
  } else {
    for (j = 0; j < N; j++) {
      idx = offsetA + j * strideA2;
      for (i = 0; i < M5; i++) {
        A[idx] = alpha;
        idx += strideA1;
      }
    }
  }
  idx = offsetA;
  for (i = 0; i < mn; i++) {
    A[idx] = beta;
    idx += strideA1 + strideA2;
  }
  return A;
}
var base_default46 = dlaset;

// ../notes/lib/lapack/base/dlasr/lib/base.js
function dlasr(side, pivot, direct, M5, N, c, strideC, offsetC, s, strideS, offsetS, A, strideA1, strideA2, offsetA) {
  var ctemp;
  var stemp;
  var base1;
  var base2;
  var temp;
  var idx1;
  var idx2;
  var i;
  var j;
  if (M5 === 0 || N === 0) {
    return A;
  }
  if (side === "left") {
    if (pivot === "variable") {
      if (direct === "forward") {
        for (j = 0; j < M5 - 1; j++) {
          ctemp = c[offsetC + j * strideC];
          stemp = s[offsetS + j * strideS];
          if (ctemp !== 1 || stemp !== 0) {
            base1 = offsetA + (j + 1) * strideA1;
            base2 = offsetA + j * strideA1;
            for (i = 0; i < N; i++) {
              idx1 = base1 + i * strideA2;
              idx2 = base2 + i * strideA2;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx2];
              A[idx2] = stemp * temp + ctemp * A[idx2];
            }
          }
        }
      } else {
        for (j = M5 - 2; j >= 0; j--) {
          ctemp = c[offsetC + j * strideC];
          stemp = s[offsetS + j * strideS];
          if (ctemp !== 1 || stemp !== 0) {
            base1 = offsetA + (j + 1) * strideA1;
            base2 = offsetA + j * strideA1;
            for (i = 0; i < N; i++) {
              idx1 = base1 + i * strideA2;
              idx2 = base2 + i * strideA2;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx2];
              A[idx2] = stemp * temp + ctemp * A[idx2];
            }
          }
        }
      }
    } else if (pivot === "top") {
      base2 = offsetA;
      if (direct === "forward") {
        for (j = 1; j < M5; j++) {
          ctemp = c[offsetC + (j - 1) * strideC];
          stemp = s[offsetS + (j - 1) * strideS];
          if (ctemp !== 1 || stemp !== 0) {
            base1 = offsetA + j * strideA1;
            for (i = 0; i < N; i++) {
              idx1 = base1 + i * strideA2;
              idx2 = base2 + i * strideA2;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx2];
              A[idx2] = stemp * temp + ctemp * A[idx2];
            }
          }
        }
      } else {
        for (j = M5 - 1; j >= 1; j--) {
          ctemp = c[offsetC + (j - 1) * strideC];
          stemp = s[offsetS + (j - 1) * strideS];
          if (ctemp !== 1 || stemp !== 0) {
            base1 = offsetA + j * strideA1;
            for (i = 0; i < N; i++) {
              idx1 = base1 + i * strideA2;
              idx2 = base2 + i * strideA2;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx2];
              A[idx2] = stemp * temp + ctemp * A[idx2];
            }
          }
        }
      }
    } else if (pivot === "bottom") {
      base2 = offsetA + (M5 - 1) * strideA1;
      if (direct === "forward") {
        for (j = 0; j < M5 - 1; j++) {
          ctemp = c[offsetC + j * strideC];
          stemp = s[offsetS + j * strideS];
          if (ctemp !== 1 || stemp !== 0) {
            base1 = offsetA + j * strideA1;
            for (i = 0; i < N; i++) {
              idx1 = base1 + i * strideA2;
              idx2 = base2 + i * strideA2;
              temp = A[idx1];
              A[idx1] = stemp * A[idx2] + ctemp * temp;
              A[idx2] = ctemp * A[idx2] - stemp * temp;
            }
          }
        }
      } else {
        for (j = M5 - 2; j >= 0; j--) {
          ctemp = c[offsetC + j * strideC];
          stemp = s[offsetS + j * strideS];
          if (ctemp !== 1 || stemp !== 0) {
            base1 = offsetA + j * strideA1;
            for (i = 0; i < N; i++) {
              idx1 = base1 + i * strideA2;
              idx2 = base2 + i * strideA2;
              temp = A[idx1];
              A[idx1] = stemp * A[idx2] + ctemp * temp;
              A[idx2] = ctemp * A[idx2] - stemp * temp;
            }
          }
        }
      }
    }
  } else if (side === "right") {
    if (pivot === "variable") {
      if (direct === "forward") {
        for (j = 0; j < N - 1; j++) {
          ctemp = c[offsetC + j * strideC];
          stemp = s[offsetS + j * strideS];
          if (ctemp !== 1 || stemp !== 0) {
            base1 = offsetA + (j + 1) * strideA2;
            base2 = offsetA + j * strideA2;
            for (i = 0; i < M5; i++) {
              idx1 = base1 + i * strideA1;
              idx2 = base2 + i * strideA1;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx2];
              A[idx2] = stemp * temp + ctemp * A[idx2];
            }
          }
        }
      } else {
        for (j = N - 2; j >= 0; j--) {
          ctemp = c[offsetC + j * strideC];
          stemp = s[offsetS + j * strideS];
          if (ctemp !== 1 || stemp !== 0) {
            base1 = offsetA + (j + 1) * strideA2;
            base2 = offsetA + j * strideA2;
            for (i = 0; i < M5; i++) {
              idx1 = base1 + i * strideA1;
              idx2 = base2 + i * strideA1;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx2];
              A[idx2] = stemp * temp + ctemp * A[idx2];
            }
          }
        }
      }
    } else if (pivot === "top") {
      base2 = offsetA;
      if (direct === "forward") {
        for (j = 1; j < N; j++) {
          ctemp = c[offsetC + (j - 1) * strideC];
          stemp = s[offsetS + (j - 1) * strideS];
          if (ctemp !== 1 || stemp !== 0) {
            base1 = offsetA + j * strideA2;
            for (i = 0; i < M5; i++) {
              idx1 = base1 + i * strideA1;
              idx2 = base2 + i * strideA1;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx2];
              A[idx2] = stemp * temp + ctemp * A[idx2];
            }
          }
        }
      } else {
        for (j = N - 1; j >= 1; j--) {
          ctemp = c[offsetC + (j - 1) * strideC];
          stemp = s[offsetS + (j - 1) * strideS];
          if (ctemp !== 1 || stemp !== 0) {
            base1 = offsetA + j * strideA2;
            for (i = 0; i < M5; i++) {
              idx1 = base1 + i * strideA1;
              idx2 = base2 + i * strideA1;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx2];
              A[idx2] = stemp * temp + ctemp * A[idx2];
            }
          }
        }
      }
    } else if (pivot === "bottom") {
      base2 = offsetA + (N - 1) * strideA2;
      if (direct === "forward") {
        for (j = 0; j < N - 1; j++) {
          ctemp = c[offsetC + j * strideC];
          stemp = s[offsetS + j * strideS];
          if (ctemp !== 1 || stemp !== 0) {
            base1 = offsetA + j * strideA2;
            for (i = 0; i < M5; i++) {
              idx1 = base1 + i * strideA1;
              idx2 = base2 + i * strideA1;
              temp = A[idx1];
              A[idx1] = stemp * A[idx2] + ctemp * temp;
              A[idx2] = ctemp * A[idx2] - stemp * temp;
            }
          }
        }
      } else {
        for (j = N - 2; j >= 0; j--) {
          ctemp = c[offsetC + j * strideC];
          stemp = s[offsetS + j * strideS];
          if (ctemp !== 1 || stemp !== 0) {
            base1 = offsetA + j * strideA2;
            for (i = 0; i < M5; i++) {
              idx1 = base1 + i * strideA1;
              idx2 = base2 + i * strideA1;
              temp = A[idx1];
              A[idx1] = stemp * A[idx2] + ctemp * temp;
              A[idx2] = ctemp * A[idx2] - stemp * temp;
            }
          }
        }
      }
    }
  }
  return A;
}
var base_default47 = dlasr;

// ../notes/lib/lapack/base/dlasrt/lib/base.js
var SELECT = 20;
function dlasrt(id, N, d, stride, offset) {
  var stkpnt;
  var stack;
  var start;
  var dmnmx;
  var endd;
  var dir;
  var tmp;
  var d1;
  var d2;
  var d3;
  var i;
  var j;
  dir = -1;
  if (id === "decreasing") {
    dir = 0;
  } else if (id === "increasing") {
    dir = 1;
  }
  if (dir === -1) {
    return -1;
  }
  if (N < 0) {
    return -2;
  }
  if (N <= 1) {
    return 0;
  }
  stkpnt = 1;
  stack = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  stack[0] = 0;
  stack[1] = N - 1;
  while (stkpnt > 0) {
    stkpnt -= 1;
    start = stack[2 * stkpnt];
    endd = stack[2 * stkpnt + 1];
    if (endd - start <= SELECT && endd - start > 0) {
      if (dir === 0) {
        for (i = start + 1; i <= endd; i++) {
          for (j = i; j >= start + 1; j--) {
            if (d[offset + j * stride] > d[offset + (j - 1) * stride]) {
              dmnmx = d[offset + j * stride];
              d[offset + j * stride] = d[offset + (j - 1) * stride];
              d[offset + (j - 1) * stride] = dmnmx;
            } else {
              break;
            }
          }
        }
      } else {
        for (i = start + 1; i <= endd; i++) {
          for (j = i; j >= start + 1; j--) {
            if (d[offset + j * stride] < d[offset + (j - 1) * stride]) {
              dmnmx = d[offset + j * stride];
              d[offset + j * stride] = d[offset + (j - 1) * stride];
              d[offset + (j - 1) * stride] = dmnmx;
            } else {
              break;
            }
          }
        }
      }
    } else if (endd - start > SELECT) {
      d1 = d[offset + start * stride];
      d2 = d[offset + endd * stride];
      i = (start + endd) / 2 | 0;
      d3 = d[offset + i * stride];
      if (d1 < d2) {
        if (d3 < d1) {
          dmnmx = d1;
        } else if (d3 < d2) {
          dmnmx = d3;
        } else {
          dmnmx = d2;
        }
      } else if (d3 < d2) {
        dmnmx = d2;
      } else if (d3 < d1) {
        dmnmx = d3;
      } else {
        dmnmx = d1;
      }
      if (dir === 0) {
        i = start - 1;
        j = endd + 1;
        while (true) {
          do {
            j -= 1;
          } while (d[offset + j * stride] < dmnmx);
          do {
            i += 1;
          } while (d[offset + i * stride] > dmnmx);
          if (i < j) {
            tmp = d[offset + i * stride];
            d[offset + i * stride] = d[offset + j * stride];
            d[offset + j * stride] = tmp;
          } else {
            break;
          }
        }
      } else {
        i = start - 1;
        j = endd + 1;
        while (true) {
          do {
            j -= 1;
          } while (d[offset + j * stride] > dmnmx);
          do {
            i += 1;
          } while (d[offset + i * stride] < dmnmx);
          if (i < j) {
            tmp = d[offset + i * stride];
            d[offset + i * stride] = d[offset + j * stride];
            d[offset + j * stride] = tmp;
          } else {
            break;
          }
        }
      }
      if (j - start > endd - j - 1) {
        stack[2 * stkpnt] = start;
        stack[2 * stkpnt + 1] = j;
        stkpnt += 1;
        stack[2 * stkpnt] = j + 1;
        stack[2 * stkpnt + 1] = endd;
        stkpnt += 1;
      } else {
        stack[2 * stkpnt] = j + 1;
        stack[2 * stkpnt + 1] = endd;
        stkpnt += 1;
        stack[2 * stkpnt] = start;
        stack[2 * stkpnt + 1] = j;
        stkpnt += 1;
      }
    }
  }
  return 0;
}
var base_default48 = dlasrt;

// ../notes/lib/blas/base/dswap/lib/base.js
function dswap(N, x, strideX, offsetX, y, strideY, offsetY) {
  var tmp;
  var ix;
  var iy;
  var i;
  if (N <= 0) {
    return y;
  }
  ix = offsetX;
  iy = offsetY;
  for (i = 0; i < N; i++) {
    tmp = x[ix];
    x[ix] = y[iy];
    y[iy] = tmp;
    ix += strideX;
    iy += strideY;
  }
  return y;
}
var base_default49 = dswap;

// ../notes/lib/lapack/base/dsteqr/lib/base.js
var MAXIT = 30;
function dsteqr(compz, N, d, strideD, offsetD, e, strideE, offsetE, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, offsetWork) {
  var nmaxit;
  var ssfmax;
  var ssfmin;
  var safmax;
  var safmin;
  var icompz;
  var lendsv;
  var iscale;
  var anorm;
  var info;
  var jtot;
  var lend;
  var eps2;
  var eps;
  var tst;
  var obj;
  var lsv;
  var rot;
  var mm;
  var l1;
  var ii;
  var l;
  var m;
  var p;
  var g;
  var r;
  var f;
  var b;
  var c;
  var s;
  var i;
  var j;
  var k;
  rot = new import_lib3.default(3);
  if (compz === "none") {
    icompz = 0;
  } else if (compz === "update") {
    icompz = 1;
  } else if (compz === "initialize") {
    icompz = 2;
  } else {
    return -1;
  }
  if (N === 0) {
    return 0;
  }
  if (N === 1) {
    if (icompz === 2) {
      Z[offsetZ] = 1;
    }
    return 0;
  }
  eps = base_default16("epsilon");
  eps2 = eps * eps;
  safmin = base_default16("safe-minimum");
  safmax = 1 / safmin;
  ssfmax = Math.sqrt(safmax) / 3;
  ssfmin = Math.sqrt(safmin) / eps2;
  if (icompz === 2) {
    base_default46("Full", N, N, 0, 1, Z, strideZ1, strideZ2, offsetZ);
  }
  nmaxit = N * MAXIT;
  jtot = 0;
  l1 = 0;
  while (l1 < N) {
    if (l1 > 0) {
      e[offsetE + (l1 - 1) * strideE] = 0;
    }
    m = N - 1;
    if (l1 <= N - 2) {
      for (m = l1; m <= N - 2; m++) {
        tst = Math.abs(e[offsetE + m * strideE]);
        if (tst === 0) {
          break;
        }
        if (tst <= Math.sqrt(Math.abs(d[offsetD + m * strideD])) * Math.sqrt(Math.abs(d[offsetD + (m + 1) * strideD])) * eps) {
          e[offsetE + m * strideE] = 0;
          break;
        }
      }
    }
    l = l1;
    lsv = l;
    lend = m;
    lendsv = lend;
    l1 = m + 1;
    if (lend === l) {
      continue;
    }
    anorm = base_default41("max", lend - l + 1, d, strideD, offsetD + l * strideD, e, strideE, offsetE + l * strideE);
    iscale = 0;
    if (anorm === 0) {
      continue;
    }
    if (anorm > ssfmax) {
      iscale = 1;
      base_default45("general", 0, 0, anorm, ssfmax, lend - l + 1, 1, d, strideD, 0, offsetD + l * strideD);
      base_default45("general", 0, 0, anorm, ssfmax, lend - l, 1, e, strideE, 0, offsetE + l * strideE);
    } else if (anorm < ssfmin) {
      iscale = 2;
      base_default45("general", 0, 0, anorm, ssfmin, lend - l + 1, 1, d, strideD, 0, offsetD + l * strideD);
      base_default45("general", 0, 0, anorm, ssfmin, lend - l, 1, e, strideE, 0, offsetE + l * strideE);
    }
    if (Math.abs(d[offsetD + lend * strideD]) < Math.abs(d[offsetD + l * strideD])) {
      lend = lsv;
      l = lendsv;
    }
    if (lend > l) {
      while (true) {
        if (l === lend) {
          m = lend;
        } else {
          for (m = l; m <= lend - 1; m++) {
            tst = Math.abs(e[offsetE + m * strideE]);
            tst *= tst;
            if (tst <= eps2 * Math.abs(d[offsetD + m * strideD]) * Math.abs(d[offsetD + (m + 1) * strideD]) + safmin) {
              break;
            }
          }
          if (m > lend - 1) {
            m = lend;
          }
        }
        if (m < lend) {
          e[offsetE + m * strideE] = 0;
        }
        p = d[offsetD + l * strideD];
        if (m === l) {
          d[offsetD + l * strideD] = p;
          l += 1;
          if (l <= lend) {
            continue;
          }
          break;
        }
        if (m === l + 1) {
          if (icompz > 0) {
            obj = base_default43(d[offsetD + l * strideD], e[offsetE + l * strideE], d[offsetD + (l + 1) * strideD]);
            WORK[offsetWork + l * strideWork] = obj.cs1;
            WORK[offsetWork + (N - 1 + l) * strideWork] = obj.sn1;
            base_default47("right", "variable", "backward", N, 2, WORK, strideWork, offsetWork + l * strideWork, WORK, strideWork, offsetWork + (N - 1 + l) * strideWork, Z, strideZ1, strideZ2, offsetZ + l * strideZ2);
            d[offsetD + l * strideD] = obj.rt1;
            d[offsetD + (l + 1) * strideD] = obj.rt2;
          } else {
            obj = base_default42(d[offsetD + l * strideD], e[offsetE + l * strideE], d[offsetD + (l + 1) * strideD]);
            d[offsetD + l * strideD] = obj.rt1;
            d[offsetD + (l + 1) * strideD] = obj.rt2;
          }
          e[offsetE + l * strideE] = 0;
          l += 2;
          if (l <= lend) {
            continue;
          }
          break;
        }
        if (jtot === nmaxit) {
          break;
        }
        jtot += 1;
        g = (d[offsetD + (l + 1) * strideD] - p) / (2 * e[offsetE + l * strideE]);
        r = base_default20(g, 1);
        g = d[offsetD + m * strideD] - p + e[offsetE + l * strideE] / (g + (Math.abs(g) * (Math.sign(g) || 1) > 0 ? r : -r));
        s = 1;
        c = 1;
        p = 0;
        for (i = m - 1; i >= l; i--) {
          f = s * e[offsetE + i * strideE];
          b = c * e[offsetE + i * strideE];
          base_default44(g, f, rot);
          c = rot[0];
          s = rot[1];
          r = rot[2];
          if (i !== m - 1) {
            e[offsetE + (i + 1) * strideE] = r;
          }
          g = d[offsetD + (i + 1) * strideD] - p;
          r = (d[offsetD + i * strideD] - g) * s + 2 * c * b;
          p = s * r;
          d[offsetD + (i + 1) * strideD] = g + p;
          g = c * r - b;
          if (icompz > 0) {
            WORK[offsetWork + i * strideWork] = c;
            WORK[offsetWork + (N - 1 + i) * strideWork] = -s;
          }
        }
        if (icompz > 0) {
          mm = m - l + 1;
          base_default47("right", "variable", "backward", N, mm, WORK, strideWork, offsetWork + l * strideWork, WORK, strideWork, offsetWork + (N - 1 + l) * strideWork, Z, strideZ1, strideZ2, offsetZ + l * strideZ2);
        }
        d[offsetD + l * strideD] -= p;
        e[offsetE + l * strideE] = g;
      }
    } else {
      while (true) {
        if (l === lend) {
          m = lend;
        } else {
          for (m = l; m >= lend + 1; m--) {
            tst = Math.abs(e[offsetE + (m - 1) * strideE]);
            tst *= tst;
            if (tst <= eps2 * Math.abs(d[offsetD + m * strideD]) * Math.abs(d[offsetD + (m - 1) * strideD]) + safmin) {
              break;
            }
          }
          if (m < lend + 1) {
            m = lend;
          }
        }
        if (m > lend) {
          e[offsetE + (m - 1) * strideE] = 0;
        }
        p = d[offsetD + l * strideD];
        if (m === l) {
          d[offsetD + l * strideD] = p;
          l -= 1;
          if (l >= lend) {
            continue;
          }
          break;
        }
        if (m === l - 1) {
          if (icompz > 0) {
            obj = base_default43(d[offsetD + (l - 1) * strideD], e[offsetE + (l - 1) * strideE], d[offsetD + l * strideD]);
            WORK[offsetWork + m * strideWork] = obj.cs1;
            WORK[offsetWork + (N - 1 + m) * strideWork] = obj.sn1;
            base_default47("right", "variable", "forward", N, 2, WORK, strideWork, offsetWork + m * strideWork, WORK, strideWork, offsetWork + (N - 1 + m) * strideWork, Z, strideZ1, strideZ2, offsetZ + (l - 1) * strideZ2);
            d[offsetD + (l - 1) * strideD] = obj.rt1;
            d[offsetD + l * strideD] = obj.rt2;
          } else {
            obj = base_default42(d[offsetD + (l - 1) * strideD], e[offsetE + (l - 1) * strideE], d[offsetD + l * strideD]);
            d[offsetD + (l - 1) * strideD] = obj.rt1;
            d[offsetD + l * strideD] = obj.rt2;
          }
          e[offsetE + (l - 1) * strideE] = 0;
          l -= 2;
          if (l >= lend) {
            continue;
          }
          break;
        }
        if (jtot === nmaxit) {
          break;
        }
        jtot += 1;
        g = (d[offsetD + (l - 1) * strideD] - p) / (2 * e[offsetE + (l - 1) * strideE]);
        r = base_default20(g, 1);
        g = d[offsetD + m * strideD] - p + e[offsetE + (l - 1) * strideE] / (g + (Math.abs(g) * (Math.sign(g) || 1) > 0 ? r : -r));
        s = 1;
        c = 1;
        p = 0;
        for (i = m; i <= l - 1; i++) {
          f = s * e[offsetE + i * strideE];
          b = c * e[offsetE + i * strideE];
          base_default44(g, f, rot);
          c = rot[0];
          s = rot[1];
          r = rot[2];
          if (i !== m) {
            e[offsetE + (i - 1) * strideE] = r;
          }
          g = d[offsetD + i * strideD] - p;
          r = (d[offsetD + (i + 1) * strideD] - g) * s + 2 * c * b;
          p = s * r;
          d[offsetD + i * strideD] = g + p;
          g = c * r - b;
          if (icompz > 0) {
            WORK[offsetWork + i * strideWork] = c;
            WORK[offsetWork + (N - 1 + i) * strideWork] = s;
          }
        }
        if (icompz > 0) {
          mm = l - m + 1;
          base_default47("right", "variable", "forward", N, mm, WORK, strideWork, offsetWork + m * strideWork, WORK, strideWork, offsetWork + (N - 1 + m) * strideWork, Z, strideZ1, strideZ2, offsetZ + m * strideZ2);
        }
        d[offsetD + l * strideD] -= p;
        e[offsetE + (l - 1) * strideE] = g;
      }
    }
    if (iscale === 1) {
      base_default45("general", 0, 0, ssfmax, anorm, lendsv - lsv + 1, 1, d, strideD, 0, offsetD + lsv * strideD);
      base_default45("general", 0, 0, ssfmax, anorm, lendsv - lsv, 1, e, strideE, 0, offsetE + lsv * strideE);
    } else if (iscale === 2) {
      base_default45("general", 0, 0, ssfmin, anorm, lendsv - lsv + 1, 1, d, strideD, 0, offsetD + lsv * strideD);
      base_default45("general", 0, 0, ssfmin, anorm, lendsv - lsv, 1, e, strideE, 0, offsetE + lsv * strideE);
    }
    if (jtot >= nmaxit) {
      break;
    }
  }
  if (jtot >= nmaxit) {
    info = 0;
    for (i = 0; i < N - 1; i++) {
      if (e[offsetE + i * strideE] !== 0) {
        info += 1;
      }
    }
    return info;
  }
  if (icompz === 0) {
    base_default48("increasing", N, d, strideD, offsetD);
  } else {
    for (ii = 1; ii < N; ii++) {
      i = ii - 1;
      k = i;
      p = d[offsetD + i * strideD];
      for (j = ii; j < N; j++) {
        if (d[offsetD + j * strideD] < p) {
          k = j;
          p = d[offsetD + j * strideD];
        }
      }
      if (k !== i) {
        d[offsetD + k * strideD] = d[offsetD + i * strideD];
        d[offsetD + i * strideD] = p;
        base_default49(N, Z, strideZ1, offsetZ + i * strideZ2, Z, strideZ1, offsetZ + k * strideZ2);
      }
    }
  }
  return 0;
}
var base_default50 = dsteqr;

// ../notes/lib/lapack/base/dsterf/lib/base.js
var MAXIT2 = 30;
function dsterf(N, d, strideD, offsetD, e, strideE, offsetE) {
  var ssfmax;
  var ssfmin;
  var safmin;
  var safmax;
  var lendsv;
  var nmaxit;
  var oldgam;
  var iscale;
  var anorm;
  var sigma;
  var alpha;
  var gamma;
  var oldc;
  var jtot;
  var lend;
  var info;
  var eps2;
  var eps;
  var rte;
  var lsv;
  var rt;
  var bb;
  var l1;
  var l;
  var m;
  var p;
  var r;
  var s;
  var c;
  var i;
  info = 0;
  if (N <= 1) {
    return info;
  }
  eps = base_default16("epsilon");
  eps2 = eps * eps;
  safmin = base_default16("safe-minimum");
  safmax = 1 / safmin;
  ssfmax = Math.sqrt(safmax) / 3;
  ssfmin = Math.sqrt(safmin) / eps2;
  nmaxit = N * MAXIT2;
  sigma = 0;
  jtot = 0;
  l1 = 0;
  while (l1 < N) {
    if (l1 > 0) {
      e[offsetE + (l1 - 1) * strideE] = 0;
    }
    for (m = l1; m < N - 1; m++) {
      if (Math.abs(e[offsetE + m * strideE]) <= Math.sqrt(Math.abs(d[offsetD + m * strideD])) * Math.sqrt(Math.abs(d[offsetD + (m + 1) * strideD])) * eps) {
        e[offsetE + m * strideE] = 0;
        break;
      }
    }
    if (m === N - 1) {
    }
    l = l1;
    lsv = l;
    lend = m;
    lendsv = lend;
    l1 = m + 1;
    if (lend === l) {
      continue;
    }
    anorm = base_default41("max", lend - l + 1, d, strideD, offsetD + l * strideD, e, strideE, offsetE + l * strideE);
    iscale = 0;
    if (anorm === 0) {
      continue;
    }
    if (anorm > ssfmax) {
      iscale = 1;
      base_default45("general", 0, 0, anorm, ssfmax, lend - l + 1, 1, d, 1, strideD, offsetD + l * strideD);
      base_default45("general", 0, 0, anorm, ssfmax, lend - l, 1, e, 1, strideE, offsetE + l * strideE);
    } else if (anorm < ssfmin) {
      iscale = 2;
      base_default45("general", 0, 0, anorm, ssfmin, lend - l + 1, 1, d, 1, strideD, offsetD + l * strideD);
      base_default45("general", 0, 0, anorm, ssfmin, lend - l, 1, e, 1, strideE, offsetE + l * strideE);
    }
    for (i = l; i < lend; i++) {
      e[offsetE + i * strideE] = e[offsetE + i * strideE] * e[offsetE + i * strideE];
    }
    if (Math.abs(d[offsetD + lend * strideD]) < Math.abs(d[offsetD + l * strideD])) {
      lend = lsv;
      l = lendsv;
    }
    if (lend >= l) {
      while (true) {
        if (l === lend) {
          m = lend;
        } else {
          for (m = l; m < lend; m++) {
            if (Math.abs(e[offsetE + m * strideE]) <= eps2 * Math.abs(d[offsetD + m * strideD] * d[offsetD + (m + 1) * strideD])) {
              break;
            }
          }
          if (m === lend) {
          }
        }
        if (m < lend) {
          e[offsetE + m * strideE] = 0;
        }
        p = d[offsetD + l * strideD];
        if (m === l) {
          d[offsetD + l * strideD] = p;
          l += 1;
          if (l <= lend) {
            continue;
          }
          break;
        }
        if (m === l + 1) {
          rte = Math.sqrt(e[offsetE + l * strideE]);
          rt = base_default42(d[offsetD + l * strideD], rte, d[offsetD + (l + 1) * strideD]);
          d[offsetD + l * strideD] = rt.rt1;
          d[offsetD + (l + 1) * strideD] = rt.rt2;
          e[offsetE + l * strideE] = 0;
          l += 2;
          if (l <= lend) {
            continue;
          }
          break;
        }
        if (jtot === nmaxit) {
          break;
        }
        jtot += 1;
        rte = Math.sqrt(e[offsetE + l * strideE]);
        sigma = (d[offsetD + (l + 1) * strideD] - p) / (2 * rte);
        r = base_default20(sigma, 1);
        sigma = p - rte / (sigma + Math.abs(r) * (Math.sign(sigma) || 1));
        c = 1;
        s = 0;
        gamma = d[offsetD + m * strideD] - sigma;
        p = gamma * gamma;
        for (i = m - 1; i >= l; i--) {
          bb = e[offsetE + i * strideE];
          r = p + bb;
          if (i !== m - 1) {
            e[offsetE + (i + 1) * strideE] = s * r;
          }
          oldc = c;
          c = p / r;
          s = bb / r;
          oldgam = gamma;
          alpha = d[offsetD + i * strideD];
          gamma = c * (alpha - sigma) - s * oldgam;
          d[offsetD + (i + 1) * strideD] = oldgam + (alpha - gamma);
          if (c === 0) {
            p = oldc * bb;
          } else {
            p = gamma * gamma / c;
          }
        }
        e[offsetE + l * strideE] = s * p;
        d[offsetD + l * strideD] = sigma + gamma;
      }
    } else {
      while (true) {
        for (m = l; m > lend; m--) {
          if (Math.abs(e[offsetE + (m - 1) * strideE]) <= eps2 * Math.abs(d[offsetD + m * strideD] * d[offsetD + (m - 1) * strideD])) {
            break;
          }
        }
        if (m === lend + 1) {
          m = lend;
        }
        if (m > lend) {
          e[offsetE + (m - 1) * strideE] = 0;
        }
        p = d[offsetD + l * strideD];
        if (m === l) {
          d[offsetD + l * strideD] = p;
          l -= 1;
          if (l >= lend) {
            continue;
          }
          break;
        }
        if (m === l - 1) {
          rte = Math.sqrt(e[offsetE + (l - 1) * strideE]);
          rt = base_default42(d[offsetD + l * strideD], rte, d[offsetD + (l - 1) * strideD]);
          d[offsetD + l * strideD] = rt.rt1;
          d[offsetD + (l - 1) * strideD] = rt.rt2;
          e[offsetE + (l - 1) * strideE] = 0;
          l -= 2;
          if (l >= lend) {
            continue;
          }
          break;
        }
        if (jtot === nmaxit) {
          break;
        }
        jtot += 1;
        rte = Math.sqrt(e[offsetE + (l - 1) * strideE]);
        sigma = (d[offsetD + (l - 1) * strideD] - p) / (2 * rte);
        r = base_default20(sigma, 1);
        sigma = p - rte / (sigma + Math.abs(r) * (Math.sign(sigma) || 1));
        c = 1;
        s = 0;
        gamma = d[offsetD + m * strideD] - sigma;
        p = gamma * gamma;
        for (i = m; i < l; i++) {
          bb = e[offsetE + i * strideE];
          r = p + bb;
          if (i !== m) {
            e[offsetE + (i - 1) * strideE] = s * r;
          }
          oldc = c;
          c = p / r;
          s = bb / r;
          oldgam = gamma;
          alpha = d[offsetD + (i + 1) * strideD];
          gamma = c * (alpha - sigma) - s * oldgam;
          d[offsetD + i * strideD] = oldgam + (alpha - gamma);
          if (c === 0) {
            p = oldc * bb;
          } else {
            p = gamma * gamma / c;
          }
        }
        e[offsetE + (l - 1) * strideE] = s * p;
        d[offsetD + l * strideD] = sigma + gamma;
      }
    }
    if (iscale === 1) {
      base_default45("general", 0, 0, ssfmax, anorm, lendsv - lsv + 1, 1, d, 1, strideD, offsetD + lsv * strideD);
    }
    if (iscale === 2) {
      base_default45("general", 0, 0, ssfmin, anorm, lendsv - lsv + 1, 1, d, 1, strideD, offsetD + lsv * strideD);
    }
    if (jtot >= nmaxit) {
      for (i = 0; i < N - 1; i++) {
        if (e[offsetE + i * strideE] !== 0) {
          info += 1;
        }
      }
      return info;
    }
  }
  base_default48("increasing", N, d, strideD, offsetD);
  return info;
}
var base_default51 = dsterf;

// ../notes/lib/lapack/base/dstebz/lib/base.js
var import_lib4 = __toESM(require_lib13(), 1);
var import_lib5 = __toESM(require_lib10(), 1);

// ../notes/lib/lapack/base/dlaebz/lib/base.js
var abs = Math.abs;
var min = Math.min;
var max = Math.max;
function dlaebz(ijob, nitmax, N, mmax, minp, nbmin, abstol, reltol, pivmin, d, strideD, offsetD, e, strideE, offsetE, E2, strideE2, offsetE2, NVAL, strideNVAL, offsetNVAL, AB, strideAB1, strideAB2, offsetAB, c, strideC, offsetC, mout, NAB, strideNAB1, strideNAB2, offsetNAB, WORK, strideWork, offsetWork, IWORK, strideIWork, offsetIWork) {
  var klnew;
  var kfnew;
  var itmp1;
  var itmp2;
  var info;
  var tmp1;
  var tmp2;
  var jit;
  var kf;
  var kl;
  var ji;
  var jp;
  var j;
  info = 0;
  if (ijob < 1 || ijob > 3) {
    return -1;
  }
  if (ijob === 1) {
    mout[0] = 0;
    for (ji = 0; ji < minp; ji++) {
      for (jp = 0; jp < 2; jp++) {
        tmp1 = d[offsetD] - AB[offsetAB + ji * strideAB1 + jp * strideAB2];
        if (abs(tmp1) < pivmin) {
          tmp1 = -pivmin;
        }
        NAB[offsetNAB + ji * strideNAB1 + jp * strideNAB2] = 0;
        if (tmp1 <= 0) {
          NAB[offsetNAB + ji * strideNAB1 + jp * strideNAB2] = 1;
        }
        for (j = 1; j < N; j++) {
          tmp1 = d[offsetD + j * strideD] - E2[offsetE2 + (j - 1) * strideE2] / tmp1 - AB[offsetAB + ji * strideAB1 + jp * strideAB2];
          if (abs(tmp1) < pivmin) {
            tmp1 = -pivmin;
          }
          if (tmp1 <= 0) {
            NAB[offsetNAB + ji * strideNAB1 + jp * strideNAB2] += 1;
          }
        }
      }
      mout[0] += NAB[offsetNAB + ji * strideNAB1 + strideNAB2] - NAB[offsetNAB + ji * strideNAB1];
    }
    return info;
  }
  kf = 0;
  kl = minp;
  if (ijob === 2) {
    for (ji = 0; ji < minp; ji++) {
      c[offsetC + ji * strideC] = 0.5 * (AB[offsetAB + ji * strideAB1] + AB[offsetAB + ji * strideAB1 + strideAB2]);
    }
  }
  for (jit = 0; jit < nitmax; jit++) {
    if (kl - kf >= nbmin && nbmin > 0) {
      for (ji = kf; ji < kl; ji++) {
        WORK[offsetWork + ji * strideWork] = d[offsetD] - c[offsetC + ji * strideC];
        IWORK[offsetIWork + ji * strideIWork] = 0;
        if (WORK[offsetWork + ji * strideWork] <= pivmin) {
          IWORK[offsetIWork + ji * strideIWork] = 1;
          WORK[offsetWork + ji * strideWork] = min(WORK[offsetWork + ji * strideWork], -pivmin);
        }
        for (j = 1; j < N; j++) {
          WORK[offsetWork + ji * strideWork] = d[offsetD + j * strideD] - E2[offsetE2 + (j - 1) * strideE2] / WORK[offsetWork + ji * strideWork] - c[offsetC + ji * strideC];
          if (WORK[offsetWork + ji * strideWork] <= pivmin) {
            IWORK[offsetIWork + ji * strideIWork] += 1;
            WORK[offsetWork + ji * strideWork] = min(WORK[offsetWork + ji * strideWork], -pivmin);
          }
        }
      }
      if (ijob <= 2) {
        klnew = kl;
        for (ji = kf; ji < kl; ji++) {
          IWORK[offsetIWork + ji * strideIWork] = min(NAB[offsetNAB + ji * strideNAB1 + strideNAB2], max(NAB[offsetNAB + ji * strideNAB1], IWORK[offsetIWork + ji * strideIWork]));
          if (IWORK[offsetIWork + ji * strideIWork] === NAB[offsetNAB + ji * strideNAB1 + strideNAB2]) {
            AB[offsetAB + ji * strideAB1 + strideAB2] = c[offsetC + ji * strideC];
          } else if (IWORK[offsetIWork + ji * strideIWork] === NAB[offsetNAB + ji * strideNAB1]) {
            AB[offsetAB + ji * strideAB1] = c[offsetC + ji * strideC];
          } else {
            klnew += 1;
            if (klnew <= mmax) {
              AB[offsetAB + (klnew - 1) * strideAB1 + strideAB2] = AB[offsetAB + ji * strideAB1 + strideAB2];
              NAB[offsetNAB + (klnew - 1) * strideNAB1 + strideNAB2] = NAB[offsetNAB + ji * strideNAB1 + strideNAB2];
              AB[offsetAB + (klnew - 1) * strideAB1] = c[offsetC + ji * strideC];
              NAB[offsetNAB + (klnew - 1) * strideNAB1] = IWORK[offsetIWork + ji * strideIWork];
              AB[offsetAB + ji * strideAB1 + strideAB2] = c[offsetC + ji * strideC];
              NAB[offsetNAB + ji * strideNAB1 + strideNAB2] = IWORK[offsetIWork + ji * strideIWork];
            } else {
              info = mmax + 1;
            }
          }
        }
        if (info !== 0) {
          mout[0] = kl;
          return info;
        }
        kl = klnew;
      } else {
        for (ji = kf; ji < kl; ji++) {
          if (IWORK[offsetIWork + ji * strideIWork] <= NVAL[offsetNVAL + ji * strideNVAL]) {
            AB[offsetAB + ji * strideAB1] = c[offsetC + ji * strideC];
            NAB[offsetNAB + ji * strideNAB1] = IWORK[offsetIWork + ji * strideIWork];
          }
          if (IWORK[offsetIWork + ji * strideIWork] >= NVAL[offsetNVAL + ji * strideNVAL]) {
            AB[offsetAB + ji * strideAB1 + strideAB2] = c[offsetC + ji * strideC];
            NAB[offsetNAB + ji * strideNAB1 + strideNAB2] = IWORK[offsetIWork + ji * strideIWork];
          }
        }
      }
    } else {
      klnew = kl;
      for (ji = kf; ji < kl; ji++) {
        tmp1 = c[offsetC + ji * strideC];
        tmp2 = d[offsetD] - tmp1;
        itmp1 = 0;
        if (tmp2 <= pivmin) {
          itmp1 = 1;
          tmp2 = min(tmp2, -pivmin);
        }
        for (j = 1; j < N; j++) {
          tmp2 = d[offsetD + j * strideD] - E2[offsetE2 + (j - 1) * strideE2] / tmp2 - tmp1;
          if (tmp2 <= pivmin) {
            itmp1 += 1;
            tmp2 = min(tmp2, -pivmin);
          }
        }
        if (ijob <= 2) {
          itmp1 = min(NAB[offsetNAB + ji * strideNAB1 + strideNAB2], max(NAB[offsetNAB + ji * strideNAB1], itmp1));
          if (itmp1 === NAB[offsetNAB + ji * strideNAB1 + strideNAB2]) {
            AB[offsetAB + ji * strideAB1 + strideAB2] = tmp1;
          } else if (itmp1 === NAB[offsetNAB + ji * strideNAB1]) {
            AB[offsetAB + ji * strideAB1] = tmp1;
          } else if (klnew < mmax) {
            klnew += 1;
            AB[offsetAB + (klnew - 1) * strideAB1 + strideAB2] = AB[offsetAB + ji * strideAB1 + strideAB2];
            NAB[offsetNAB + (klnew - 1) * strideNAB1 + strideNAB2] = NAB[offsetNAB + ji * strideNAB1 + strideNAB2];
            AB[offsetAB + (klnew - 1) * strideAB1] = tmp1;
            NAB[offsetNAB + (klnew - 1) * strideNAB1] = itmp1;
            AB[offsetAB + ji * strideAB1 + strideAB2] = tmp1;
            NAB[offsetNAB + ji * strideNAB1 + strideNAB2] = itmp1;
          } else {
            info = mmax + 1;
            mout[0] = kl;
            return info;
          }
        } else {
          if (itmp1 <= NVAL[offsetNVAL + ji * strideNVAL]) {
            AB[offsetAB + ji * strideAB1] = tmp1;
            NAB[offsetNAB + ji * strideNAB1] = itmp1;
          }
          if (itmp1 >= NVAL[offsetNVAL + ji * strideNVAL]) {
            AB[offsetAB + ji * strideAB1 + strideAB2] = tmp1;
            NAB[offsetNAB + ji * strideNAB1 + strideNAB2] = itmp1;
          }
        }
      }
      kl = klnew;
    }
    kfnew = kf;
    for (ji = kf; ji < kl; ji++) {
      tmp1 = abs(AB[offsetAB + ji * strideAB1 + strideAB2] - AB[offsetAB + ji * strideAB1]);
      tmp2 = max(abs(AB[offsetAB + ji * strideAB1 + strideAB2]), abs(AB[offsetAB + ji * strideAB1]));
      if (tmp1 < max(abstol, pivmin, reltol * tmp2) || NAB[offsetNAB + ji * strideNAB1] >= NAB[offsetNAB + ji * strideNAB1 + strideNAB2]) {
        if (ji > kfnew) {
          tmp1 = AB[offsetAB + ji * strideAB1];
          tmp2 = AB[offsetAB + ji * strideAB1 + strideAB2];
          itmp1 = NAB[offsetNAB + ji * strideNAB1];
          itmp2 = NAB[offsetNAB + ji * strideNAB1 + strideNAB2];
          AB[offsetAB + ji * strideAB1] = AB[offsetAB + kfnew * strideAB1];
          AB[offsetAB + ji * strideAB1 + strideAB2] = AB[offsetAB + kfnew * strideAB1 + strideAB2];
          NAB[offsetNAB + ji * strideNAB1] = NAB[offsetNAB + kfnew * strideNAB1];
          NAB[offsetNAB + ji * strideNAB1 + strideNAB2] = NAB[offsetNAB + kfnew * strideNAB1 + strideNAB2];
          AB[offsetAB + kfnew * strideAB1] = tmp1;
          AB[offsetAB + kfnew * strideAB1 + strideAB2] = tmp2;
          NAB[offsetNAB + kfnew * strideNAB1] = itmp1;
          NAB[offsetNAB + kfnew * strideNAB1 + strideNAB2] = itmp2;
          if (ijob === 3) {
            itmp1 = NVAL[offsetNVAL + ji * strideNVAL];
            NVAL[offsetNVAL + ji * strideNVAL] = NVAL[offsetNVAL + kfnew * strideNVAL];
            NVAL[offsetNVAL + kfnew * strideNVAL] = itmp1;
          }
        }
        kfnew += 1;
      }
    }
    kf = kfnew;
    for (ji = kf; ji < kl; ji++) {
      c[offsetC + ji * strideC] = 0.5 * (AB[offsetAB + ji * strideAB1] + AB[offsetAB + ji * strideAB1 + strideAB2]);
    }
    if (kf >= kl) {
      break;
    }
  }
  info = max(kl - kf, 0);
  mout[0] = kl;
  return info;
}
var base_default52 = dlaebz;

// ../notes/lib/lapack/base/dstebz/lib/base.js
var abs2 = Math.abs;
var min2 = Math.min;
var max2 = Math.max;
var log = Math.log;
var sqrt = Math.sqrt;
var floor = Math.floor;
var ZERO = 0;
var ONE = 1;
var TWO = 2;
var HALF2 = 0.5;
var FUDGE = 2.1;
var RELFAC = 2;
function dstebz(range, order, N, vl, vu, il, iu, abstol, d, strideD, offsetD, e, strideE, offsetE, M5, nsplit, w, strideW, offsetW, IBLOCK, strideIBLOCK, offsetIBLOCK, ISPLIT, strideISPLIT, offsetISPLIT, WORK, strideWork, offsetWork, IWORK, strideIWork, offsetIWork) {
  var iwScratch;
  var wScratch;
  var nabWork;
  var ncnvrg;
  var toofew;
  var irange;
  var iorder;
  var ibegin;
  var idiscl;
  var idiscu;
  var pivmin;
  var safemn;
  var idumma;
  var abWork;
  var bnorm;
  var tnorm;
  var iinfo;
  var iwoff;
  var wkill;
  var atoli;
  var rtoli;
  var itmax;
  var itmp1;
  var jdisc;
  var cWork;
  var iout;
  var info;
  var ioff;
  var iend;
  var tmp1;
  var tmp2;
  var mout;
  var nwl;
  var nwu;
  var wlu;
  var wul;
  var in_;
  var ulp;
  var nsp;
  var nb;
  var gl;
  var gu;
  var im;
  var wl;
  var wu;
  var ib;
  var ie;
  var iw;
  var jb;
  var je;
  var m;
  var j;
  info = 0;
  if (range === "all") {
    irange = 1;
  } else if (range === "value") {
    irange = 2;
  } else if (range === "index") {
    irange = 3;
  } else {
    irange = 0;
  }
  if (order === "block") {
    iorder = 2;
  } else if (order === "entire") {
    iorder = 1;
  } else {
    iorder = 0;
  }
  if (irange <= 0) {
    info = -1;
  } else if (iorder <= 0) {
    info = -2;
  } else if (N < 0) {
    info = -3;
  } else if (irange === 2) {
    if (vl >= vu) {
      info = -5;
    }
  } else if (irange === 3 && (il < 1 || il > max2(1, N))) {
    info = -6;
  } else if (irange === 3 && (iu < min2(N, il) || iu > N)) {
    info = -7;
  }
  if (info !== 0) {
    return info;
  }
  info = 0;
  ncnvrg = false;
  toofew = false;
  m = 0;
  M5[0] = 0;
  if (N === 0) {
    return info;
  }
  if (irange === 3 && il === 1 && iu === N) {
    irange = 1;
  }
  safemn = base_default16("safe-minimum");
  ulp = base_default16("precision");
  rtoli = ulp * RELFAC;
  nb = 0;
  if (N === 1) {
    nsplit[0] = 1;
    ISPLIT[offsetISPLIT] = 1;
    if (irange === 2 && (vl >= d[offsetD] || vu < d[offsetD])) {
      M5[0] = 0;
    } else {
      w[offsetW] = d[offsetD];
      IBLOCK[offsetIBLOCK] = 1;
      M5[0] = 1;
    }
    return info;
  }
  nsp = 1;
  WORK[offsetWork + (N - 1) * strideWork] = ZERO;
  pivmin = ONE;
  for (j = 1; j < N; j++) {
    tmp1 = e[offsetE + (j - 1) * strideE] * e[offsetE + (j - 1) * strideE];
    if (abs2(d[offsetD + j * strideD] * d[offsetD + (j - 1) * strideD]) * ulp * ulp + safemn > tmp1) {
      ISPLIT[offsetISPLIT + (nsp - 1) * strideISPLIT] = j;
      nsp += 1;
      WORK[offsetWork + (j - 1) * strideWork] = ZERO;
    } else {
      WORK[offsetWork + (j - 1) * strideWork] = tmp1;
      pivmin = max2(pivmin, tmp1);
    }
  }
  ISPLIT[offsetISPLIT + (nsp - 1) * strideISPLIT] = N;
  nsplit[0] = nsp;
  pivmin *= safemn;
  if (irange === 3) {
    gu = d[offsetD];
    gl = d[offsetD];
    tmp1 = ZERO;
    for (j = 0; j < N - 1; j++) {
      tmp2 = sqrt(WORK[offsetWork + j * strideWork]);
      gu = max2(gu, d[offsetD + j * strideD] + tmp1 + tmp2);
      gl = min2(gl, d[offsetD + j * strideD] - tmp1 - tmp2);
      tmp1 = tmp2;
    }
    gu = max2(gu, d[offsetD + (N - 1) * strideD] + tmp1);
    gl = min2(gl, d[offsetD + (N - 1) * strideD] - tmp1);
    tnorm = max2(abs2(gl), abs2(gu));
    gl = gl - FUDGE * tnorm * ulp * N - FUDGE * TWO * pivmin;
    gu = gu + FUDGE * tnorm * ulp * N + FUDGE * pivmin;
    itmax = floor((log(tnorm + pivmin) - log(pivmin)) / log(TWO)) + 2;
    if (abstol <= ZERO) {
      atoli = ulp * tnorm;
    } else {
      atoli = abstol;
    }
    abWork = new import_lib4.default(4);
    nabWork = new import_lib5.default(4);
    cWork = new import_lib4.default(2);
    var nvalWork = new import_lib5.default(2);
    wScratch = new import_lib4.default(2);
    iwScratch = new import_lib5.default(2);
    mout = new import_lib5.default(1);
    abWork[0] = gl;
    abWork[1] = gl;
    abWork[2] = gu;
    abWork[3] = gu;
    cWork[0] = gl;
    cWork[1] = gu;
    nabWork[0] = -1;
    nabWork[1] = -1;
    nabWork[2] = N + 1;
    nabWork[3] = N + 1;
    nvalWork[0] = il - 1;
    nvalWork[1] = iu;
    iinfo = base_default52(3, itmax, N, 2, 2, nb, atoli, rtoli, pivmin, d, strideD, offsetD, e, strideE, offsetE, WORK, strideWork, offsetWork, nvalWork, 1, 0, abWork, 1, 2, 0, cWork, 1, 0, mout, nabWork, 1, 2, 0, wScratch, 1, 0, iwScratch, 1, 0);
    if (nvalWork[1] === iu) {
      wl = abWork[0];
      wlu = abWork[2];
      nwl = nabWork[0];
      wu = abWork[3];
      wul = abWork[1];
      nwu = nabWork[3];
    } else {
      wl = abWork[1];
      wlu = abWork[3];
      nwl = nabWork[1];
      wu = abWork[2];
      wul = abWork[0];
      nwu = nabWork[2];
    }
    if (nwl < 0 || nwl >= N || nwu < 1 || nwu > N) {
      info = 4;
      M5[0] = m;
      return info;
    }
  } else {
    tnorm = max2(abs2(d[offsetD]) + abs2(e[offsetE]), abs2(d[offsetD + (N - 1) * strideD]) + abs2(e[offsetE + (N - 2) * strideE]));
    for (j = 1; j < N - 1; j++) {
      tnorm = max2(tnorm, abs2(d[offsetD + j * strideD]) + abs2(e[offsetE + (j - 1) * strideE]) + abs2(e[offsetE + j * strideE]));
    }
    if (abstol <= ZERO) {
      atoli = ulp * tnorm;
    } else {
      atoli = abstol;
    }
    if (irange === 2) {
      wl = vl;
      wu = vu;
    } else {
      wl = ZERO;
      wu = ZERO;
    }
  }
  m = 0;
  iend = 0;
  info = 0;
  nwl = 0;
  nwu = 0;
  mout = new import_lib5.default(1);
  idumma = new import_lib5.default(1);
  for (jb = 0; jb < nsp; jb++) {
    ioff = iend;
    ibegin = ioff;
    iend = ISPLIT[offsetISPLIT + jb * strideISPLIT];
    in_ = iend - ioff;
    if (in_ === 1) {
      if (irange === 1 || wl >= d[offsetD + ibegin * strideD] - pivmin) {
        nwl += 1;
      }
      if (irange === 1 || wu >= d[offsetD + ibegin * strideD] - pivmin) {
        nwu += 1;
      }
      if (irange === 1 || wl < d[offsetD + ibegin * strideD] - pivmin && wu >= d[offsetD + ibegin * strideD] - pivmin) {
        w[offsetW + m * strideW] = d[offsetD + ibegin * strideD];
        IBLOCK[offsetIBLOCK + m * strideIBLOCK] = jb + 1;
        m += 1;
      }
    } else {
      gu = d[offsetD + ibegin * strideD];
      gl = d[offsetD + ibegin * strideD];
      tmp1 = ZERO;
      for (j = ibegin; j < iend - 1; j++) {
        tmp2 = abs2(e[offsetE + j * strideE]);
        gu = max2(gu, d[offsetD + j * strideD] + tmp1 + tmp2);
        gl = min2(gl, d[offsetD + j * strideD] - tmp1 - tmp2);
        tmp1 = tmp2;
      }
      gu = max2(gu, d[offsetD + (iend - 1) * strideD] + tmp1);
      gl = min2(gl, d[offsetD + (iend - 1) * strideD] - tmp1);
      bnorm = max2(abs2(gl), abs2(gu));
      gl = gl - FUDGE * bnorm * ulp * in_ - FUDGE * pivmin;
      gu = gu + FUDGE * bnorm * ulp * in_ + FUDGE * pivmin;
      if (abstol <= ZERO) {
        atoli = ulp * max2(abs2(gl), abs2(gu));
      } else {
        atoli = abstol;
      }
      if (irange > 1) {
        if (gu < wl) {
          nwl += in_;
          nwu += in_;
          continue;
        }
        gl = max2(gl, wl);
        gu = min2(gu, wu);
        if (gl >= gu) {
          continue;
        }
      }
      abWork = new import_lib4.default(in_ * 2);
      nabWork = new import_lib5.default(in_ * 2);
      cWork = new import_lib4.default(in_);
      wScratch = new import_lib4.default(in_);
      iwScratch = new import_lib5.default(in_);
      abWork[0] = gl;
      abWork[in_] = gu;
      iinfo = base_default52(1, 0, in_, in_, 1, nb, atoli, rtoli, pivmin, d, strideD, offsetD + ibegin * strideD, e, strideE, offsetE + ibegin * strideE, WORK, strideWork, offsetWork + ibegin * strideWork, idumma, 1, 0, abWork, 1, in_, 0, cWork, 1, 0, mout, nabWork, 1, in_, 0, wScratch, 1, 0, iwScratch, 1, 0);
      nwl += nabWork[0];
      nwu += nabWork[in_];
      iwoff = m - nabWork[0];
      im = mout[0];
      itmax = floor((log(gu - gl + pivmin) - log(pivmin)) / log(TWO)) + 2;
      iinfo = base_default52(2, itmax, in_, in_, 1, nb, atoli, rtoli, pivmin, d, strideD, offsetD + ibegin * strideD, e, strideE, offsetE + ibegin * strideE, WORK, strideWork, offsetWork + ibegin * strideWork, idumma, 1, 0, abWork, 1, in_, 0, cWork, 1, 0, mout, nabWork, 1, in_, 0, wScratch, 1, 0, iwScratch, 1, 0);
      iout = mout[0];
      for (j = 0; j < iout; j++) {
        tmp1 = HALF2 * (abWork[j] + abWork[j + in_]);
        if (j > iout - 1 - iinfo) {
          ncnvrg = true;
          ib = -(jb + 1);
        } else {
          ib = jb + 1;
        }
        for (je = nabWork[j] + iwoff; je < nabWork[j + in_] + iwoff; je++) {
          w[offsetW + je * strideW] = tmp1;
          IBLOCK[offsetIBLOCK + je * strideIBLOCK] = ib;
        }
      }
      m += im;
    }
  }
  if (irange === 3) {
    im = 0;
    idiscl = il - 1 - nwl;
    idiscu = nwu - iu;
    if (idiscl > 0 || idiscu > 0) {
      for (je = 0; je < m; je++) {
        if (w[offsetW + je * strideW] <= wlu && idiscl > 0) {
          idiscl -= 1;
        } else if (w[offsetW + je * strideW] >= wul && idiscu > 0) {
          idiscu -= 1;
        } else {
          w[offsetW + im * strideW] = w[offsetW + je * strideW];
          IBLOCK[offsetIBLOCK + im * strideIBLOCK] = IBLOCK[offsetIBLOCK + je * strideIBLOCK];
          im += 1;
        }
      }
      m = im;
    }
    if (idiscl > 0 || idiscu > 0) {
      if (idiscl > 0) {
        wkill = wu;
        for (jdisc = 0; jdisc < idiscl; jdisc++) {
          iw = -1;
          for (je = 0; je < m; je++) {
            if (IBLOCK[offsetIBLOCK + je * strideIBLOCK] !== 0 && (w[offsetW + je * strideW] < wkill || iw === -1)) {
              iw = je;
              wkill = w[offsetW + je * strideW];
            }
          }
          IBLOCK[offsetIBLOCK + iw * strideIBLOCK] = 0;
        }
      }
      if (idiscu > 0) {
        wkill = wl;
        for (jdisc = 0; jdisc < idiscu; jdisc++) {
          iw = -1;
          for (je = 0; je < m; je++) {
            if (IBLOCK[offsetIBLOCK + je * strideIBLOCK] !== 0 && (w[offsetW + je * strideW] > wkill || iw === -1)) {
              iw = je;
              wkill = w[offsetW + je * strideW];
            }
          }
          IBLOCK[offsetIBLOCK + iw * strideIBLOCK] = 0;
        }
      }
      im = 0;
      for (je = 0; je < m; je++) {
        if (IBLOCK[offsetIBLOCK + je * strideIBLOCK] !== 0) {
          w[offsetW + im * strideW] = w[offsetW + je * strideW];
          IBLOCK[offsetIBLOCK + im * strideIBLOCK] = IBLOCK[offsetIBLOCK + je * strideIBLOCK];
          im += 1;
        }
      }
      m = im;
    }
    if (idiscl < 0 || idiscu < 0) {
      toofew = true;
    }
  }
  if (iorder === 1 && nsp > 1) {
    for (je = 0; je < m - 1; je++) {
      ie = -1;
      tmp1 = w[offsetW + je * strideW];
      for (j = je + 1; j < m; j++) {
        if (w[offsetW + j * strideW] < tmp1) {
          ie = j;
          tmp1 = w[offsetW + j * strideW];
        }
      }
      if (ie !== -1) {
        itmp1 = IBLOCK[offsetIBLOCK + ie * strideIBLOCK];
        w[offsetW + ie * strideW] = w[offsetW + je * strideW];
        IBLOCK[offsetIBLOCK + ie * strideIBLOCK] = IBLOCK[offsetIBLOCK + je * strideIBLOCK];
        w[offsetW + je * strideW] = tmp1;
        IBLOCK[offsetIBLOCK + je * strideIBLOCK] = itmp1;
      }
    }
  }
  M5[0] = m;
  info = 0;
  if (ncnvrg) {
    info += 1;
  }
  if (toofew) {
    info += 2;
  }
  return info;
}
var base_default53 = dstebz;

// ../notes/lib/lapack/base/dstein/lib/base.js
var import_lib7 = __toESM(require_lib10(), 1);

// ../notes/lib/lapack/base/dlarnv/lib/base.js
var import_lib6 = __toESM(require_lib13(), 1);

// ../notes/lib/lapack/base/dlaruv/lib/base.js
var IPW2 = 4096;
var R = 1 / IPW2;
var MM_TABLE = [
  // eslint-disable-line max-lines
  494,
  322,
  2508,
  2549,
  2637,
  789,
  3754,
  1145,
  255,
  1440,
  1766,
  2253,
  2008,
  752,
  3572,
  305,
  1253,
  2859,
  2893,
  3301,
  3344,
  123,
  307,
  1065,
  4084,
  1848,
  1297,
  3133,
  1739,
  643,
  3966,
  2913,
  3143,
  2405,
  758,
  3285,
  3468,
  2638,
  2598,
  1241,
  688,
  2344,
  3406,
  1197,
  1657,
  46,
  2922,
  3729,
  1238,
  3814,
  1038,
  2501,
  3166,
  913,
  2934,
  1673,
  1292,
  3649,
  2091,
  541,
  3422,
  339,
  2451,
  2753,
  1270,
  3808,
  1580,
  949,
  2016,
  822,
  1958,
  2361,
  154,
  2832,
  2055,
  1165,
  2862,
  3078,
  1507,
  4081,
  697,
  3633,
  1078,
  2725,
  1706,
  2970,
  3273,
  3305,
  491,
  637,
  17,
  3069,
  931,
  2249,
  854,
  3617,
  1444,
  2081,
  2916,
  3733,
  444,
  4019,
  3971,
  409,
  3577,
  1478,
  2889,
  2157,
  3944,
  242,
  3831,
  1361,
  2184,
  481,
  2621,
  3973,
  1661,
  2075,
  1541,
  1865,
  3482,
  4058,
  893,
  2525,
  657,
  622,
  736,
  1409,
  3023,
  3376,
  3992,
  3445,
  3618,
  812,
  787,
  3577,
  1267,
  234,
  2125,
  77,
  1828,
  641,
  2364,
  3761,
  164,
  4005,
  2460,
  2149,
  3798,
  1122,
  257,
  1449,
  3087,
  3135,
  1574,
  3005,
  2400,
  2640,
  3912,
  225,
  2870,
  2302,
  1216,
  85,
  3876,
  40,
  3248,
  3673,
  1905,
  1832,
  3401,
  3117,
  1593,
  2247,
  2124,
  3089,
  1797,
  2034,
  2762,
  1349,
  1234,
  2637,
  149,
  2057,
  3460,
  1287,
  2245,
  413,
  328,
  1691,
  166,
  65,
  2861,
  496,
  466,
  1845,
  1950,
  1597,
  4018,
  697,
  617,
  2394,
  1399,
  3085,
  2070,
  2584,
  190,
  3441,
  3331,
  1843,
  2879,
  1573,
  769,
  336,
  153,
  3689,
  1558,
  1472,
  2320,
  2941,
  2412,
  2407,
  18,
  929,
  2800,
  433,
  712,
  533,
  189,
  2096,
  2159,
  2841,
  287,
  1761,
  2318,
  4077,
  2045,
  2810,
  2091,
  721,
  1227,
  566,
  3443,
  2821,
  2838,
  442,
  1510,
  2249,
  209,
  41,
  449,
  2397,
  2770,
  1238,
  1956,
  2817,
  3654,
  1086,
  2201,
  245,
  3993,
  603,
  3137,
  1913,
  192,
  840,
  3399,
  1997,
  2253,
  3168,
  1321,
  3121,
  3491,
  1499,
  2271,
  997,
  2889,
  1084,
  3667,
  1833,
  2857,
  3438,
  2703,
  2877,
  2094,
  2408,
  629,
  1633,
  1818,
  1589,
  2365,
  981,
  688,
  2391,
  2431,
  2009,
  1407,
  288,
  1113,
  941,
  634,
  26,
  3922,
  2449,
  3231,
  512,
  2554,
  197,
  815,
  1456,
  184,
  2441,
  3524,
  171,
  2099,
  285,
  1914,
  1677,
  3228,
  1473,
  516,
  2657,
  4012,
  2741,
  164,
  2270,
  1921,
  3129,
  303,
  2587,
  3452,
  909,
  2144,
  2961,
  3901,
  2801,
  3480,
  1970,
  572,
  421,
  119,
  1817,
  3309,
  4073,
  3357,
  676,
  3171,
  2813,
  837,
  1410,
  817,
  2337,
  2826,
  3723,
  3039,
  1429,
  2332,
  2803,
  1696,
  1177,
  2089,
  3185,
  1256,
  1901,
  3780,
  184,
  3715,
  81,
  1700,
  663,
  2077,
  1669,
  3712,
  499,
  3019,
  2633,
  150,
  3784,
  1497,
  2269,
  2e3,
  1631,
  1101,
  129,
  3375,
  1925,
  717,
  1141,
  1621,
  3912,
  51,
  249,
  3090,
  1398,
  981,
  3917,
  3765,
  1349,
  1978,
  2481,
  1149,
  1441,
  1813,
  3941,
  3146,
  2224,
  3881,
  2217,
  33,
  2411,
  76,
  2749,
  3082,
  1907,
  3846,
  3041,
  2741,
  3192,
  3694,
  1877,
  359,
  2786,
  1682,
  345,
  3316,
  382,
  124,
  2861,
  1749,
  37,
  1660,
  1809,
  185,
  759,
  3997,
  3141,
  2784,
  2948,
  479,
  2825,
  2202,
  1862,
  1141,
  157,
  2199,
  3802,
  886,
  2881,
  1364,
  2423,
  3514,
  3637,
  1244,
  2051,
  1301,
  1465,
  2020,
  2295,
  3604,
  2829,
  3160,
  1332,
  1888,
  2161,
  2785,
  1832,
  1836,
  3365,
  2772,
  2405,
  1990,
  361,
  1217,
  3638,
  2058,
  2685,
  1822,
  3661,
  692,
  3745,
  1245,
  327,
  1194,
  2325,
  2252,
  3660,
  20,
  3609,
  3904,
  716,
  3285,
  3821,
  2774,
  1842,
  2046,
  3537,
  997,
  3987,
  2107,
  517,
  2573,
  1368,
  3508,
  3017,
  1148,
  1848,
  3525,
  2141,
  545,
  2366,
  3801,
  1537
];
function dlaruv(iseed, strideISEED, offsetISEED, N, x, strideX, offsetX) {
  var it1;
  var it2;
  var it3;
  var it4;
  var lv;
  var i1;
  var i2;
  var i3;
  var i4;
  var ix;
  var mi;
  var i;
  var v;
  if (N < 1) {
    return;
  }
  i1 = iseed[offsetISEED];
  i2 = iseed[offsetISEED + strideISEED];
  i3 = iseed[offsetISEED + 2 * strideISEED];
  i4 = iseed[offsetISEED + 3 * strideISEED];
  lv = Math.min(N, 128);
  ix = offsetX;
  for (i = 0; i < lv; i++) {
    mi = i * 4;
    while (true) {
      it4 = i4 * MM_TABLE[mi + 3];
      it3 = it4 / IPW2 | 0;
      it4 -= IPW2 * it3;
      it3 = it3 + i3 * MM_TABLE[mi + 3] + i4 * MM_TABLE[mi + 2];
      it2 = it3 / IPW2 | 0;
      it3 -= IPW2 * it2;
      it2 = it2 + i2 * MM_TABLE[mi + 3] + i3 * MM_TABLE[mi + 2] + i4 * MM_TABLE[mi + 1];
      it1 = it2 / IPW2 | 0;
      it2 -= IPW2 * it1;
      it1 = it1 + i1 * MM_TABLE[mi + 3] + i2 * MM_TABLE[mi + 2] + i3 * MM_TABLE[mi + 1] + i4 * MM_TABLE[mi + 0];
      it1 %= IPW2;
      v = R * (it1 + R * (it2 + R * (it3 + R * it4)));
      if (v !== 1) {
        break;
      }
      i1 += 2;
      i2 += 2;
      i3 += 2;
      i4 += 2;
    }
    x[ix] = v;
    ix += strideX;
  }
  iseed[offsetISEED] = it1;
  iseed[offsetISEED + strideISEED] = it2;
  iseed[offsetISEED + 2 * strideISEED] = it3;
  iseed[offsetISEED + 3 * strideISEED] = it4;
}
var base_default54 = dlaruv;

// ../notes/lib/lapack/base/dlarnv/lib/base.js
var LV = 128;
var TWOPI = 6.283185307179586;
function dlarnv(idist, iseed, strideISEED, offsetISEED, N, x, stride, offset) {
  var il2;
  var il;
  var iv;
  var ix;
  var u;
  var i;
  u = new import_lib6.default(LV);
  for (iv = 0; iv < N; iv += LV / 2) {
    il = Math.min(LV / 2, N - iv);
    if (idist === 3) {
      il2 = 2 * il;
    } else {
      il2 = il;
    }
    base_default54(iseed, strideISEED, offsetISEED, il2, u, 1, 0);
    ix = offset + iv * stride;
    if (idist === 1) {
      for (i = 0; i < il; i++) {
        x[ix] = u[i];
        ix += stride;
      }
    } else if (idist === 2) {
      for (i = 0; i < il; i++) {
        x[ix] = 2 * u[i] - 1;
        ix += stride;
      }
    } else if (idist === 3) {
      for (i = 0; i < il; i++) {
        x[ix] = Math.sqrt(-2 * Math.log(u[2 * i])) * Math.cos(TWOPI * u[2 * i + 1]);
        ix += stride;
      }
    }
  }
}
var base_default55 = dlarnv;

// ../notes/lib/blas/base/idamax/lib/base.js
function idamax(N, x, strideX, offsetX) {
  var dmax;
  var imax;
  var ix;
  var i;
  if (N < 1 || strideX <= 0) {
    return -1;
  }
  if (N === 1) {
    return 0;
  }
  ix = offsetX;
  dmax = Math.abs(x[ix]);
  imax = 0;
  ix += strideX;
  for (i = 1; i < N; i++) {
    if (Math.abs(x[ix]) > dmax) {
      imax = i;
      dmax = Math.abs(x[ix]);
    }
    ix += strideX;
  }
  return imax;
}
var base_default56 = idamax;

// ../notes/lib/lapack/base/dlagtf/lib/base.js
var EPS2 = base_default16("Epsilon");
function dlagtf(N, a, strideA, offsetA, lambda, b, strideB, offsetB, c, strideC, offsetC, tol, d, strideD, offsetD, IN, strideIN, offsetIN) {
  var scale1;
  var scale2;
  var mult;
  var piv1;
  var piv2;
  var temp;
  var tl;
  var pa;
  var pb;
  var pc;
  var pd;
  var pi;
  var k;
  if (N < 0) {
    return -1;
  }
  if (N === 0) {
    return 0;
  }
  a[offsetA] -= lambda;
  IN[offsetIN + (N - 1) * strideIN] = 0;
  if (N === 1) {
    if (a[offsetA] === 0) {
      IN[offsetIN] = 1;
    }
    return 0;
  }
  tl = Math.max(tol, EPS2);
  pa = offsetA;
  pb = offsetB;
  pc = offsetC;
  pd = offsetD;
  pi = offsetIN;
  scale1 = Math.abs(a[pa]) + Math.abs(b[pb]);
  for (k = 0; k < N - 1; k++) {
    a[pa + strideA] -= lambda;
    scale2 = Math.abs(c[pc]) + Math.abs(a[pa + strideA]);
    if (k < N - 2) {
      scale2 += Math.abs(b[pb + strideB]);
    }
    if (a[pa] === 0) {
      piv1 = 0;
    } else {
      piv1 = Math.abs(a[pa]) / scale1;
    }
    if (c[pc] === 0) {
      IN[pi] = 0;
      piv2 = 0;
      scale1 = scale2;
      if (k < N - 2) {
        d[pd] = 0;
      }
    } else {
      piv2 = Math.abs(c[pc]) / scale2;
      if (piv2 <= piv1) {
        IN[pi] = 0;
        scale1 = scale2;
        c[pc] = c[pc] / a[pa];
        a[pa + strideA] -= c[pc] * b[pb];
        if (k < N - 2) {
          d[pd] = 0;
        }
      } else {
        IN[pi] = 1;
        mult = a[pa] / c[pc];
        a[pa] = c[pc];
        temp = a[pa + strideA];
        a[pa + strideA] = b[pb] - mult * temp;
        if (k < N - 2) {
          d[pd] = b[pb + strideB];
          b[pb + strideB] = -mult * d[pd];
        }
        b[pb] = temp;
        c[pc] = mult;
      }
    }
    if (Math.max(piv1, piv2) <= tl && IN[offsetIN + (N - 1) * strideIN] === 0) {
      IN[offsetIN + (N - 1) * strideIN] = k + 1;
    }
    pa += strideA;
    pb += strideB;
    pc += strideC;
    if (k < N - 2) {
      pd += strideD;
    }
    pi += strideIN;
  }
  if (Math.abs(a[pa]) <= scale1 * tl && IN[offsetIN + (N - 1) * strideIN] === 0) {
    IN[offsetIN + (N - 1) * strideIN] = N;
  }
  return 0;
}
var base_default57 = dlagtf;

// ../notes/lib/lapack/base/dlagts/lib/base.js
var EPS3 = base_default16("Epsilon");
var SFMIN2 = base_default16("Safe minimum");
var BIGNUM = 1 / SFMIN2;
function dlagts(job, N, a, strideA, offsetA, b, strideB, offsetB, c, strideC, offsetC, d, strideD, offsetD, IN, strideIN, offsetIN, y, strideY, offsetY, tol) {
  var absak;
  var pert;
  var temp;
  var ak;
  var k;
  if (Math.abs(job) > 2 || job === 0) {
    return -1;
  }
  if (N < 0) {
    return -2;
  }
  if (N === 0) {
    return 0;
  }
  if (job < 0) {
    if (tol <= 0) {
      tol = Math.abs(a[offsetA]);
      if (N > 1) {
        tol = Math.max(tol, Math.abs(a[offsetA + strideA]), Math.abs(b[offsetB]));
      }
      for (k = 2; k < N; k++) {
        tol = Math.max(tol, Math.abs(a[offsetA + k * strideA]), Math.abs(b[offsetB + (k - 1) * strideB]), Math.abs(d[offsetD + (k - 2) * strideD]));
      }
      tol *= EPS3;
      if (tol === 0) {
        tol = EPS3;
      }
    }
  }
  if (Math.abs(job) === 1) {
    for (k = 1; k < N; k++) {
      if (IN[offsetIN + (k - 1) * strideIN] === 0) {
        y[offsetY + k * strideY] -= c[offsetC + (k - 1) * strideC] * y[offsetY + (k - 1) * strideY];
      } else {
        temp = y[offsetY + (k - 1) * strideY];
        y[offsetY + (k - 1) * strideY] = y[offsetY + k * strideY];
        y[offsetY + k * strideY] = temp - c[offsetC + (k - 1) * strideC] * y[offsetY + k * strideY];
      }
    }
    if (job === 1) {
      for (k = N - 1; k >= 0; k--) {
        if (k <= N - 3) {
          temp = y[offsetY + k * strideY] - b[offsetB + k * strideB] * y[offsetY + (k + 1) * strideY] - d[offsetD + k * strideD] * y[offsetY + (k + 2) * strideY];
        } else if (k === N - 2) {
          temp = y[offsetY + k * strideY] - b[offsetB + k * strideB] * y[offsetY + (k + 1) * strideY];
        } else {
          temp = y[offsetY + k * strideY];
        }
        ak = a[offsetA + k * strideA];
        absak = Math.abs(ak);
        if (absak < 1) {
          if (absak < SFMIN2) {
            if (absak === 0 || Math.abs(temp) * SFMIN2 > absak) {
              return k + 1;
            }
            temp *= BIGNUM;
            ak *= BIGNUM;
          } else if (Math.abs(temp) > absak * BIGNUM) {
            return k + 1;
          }
        }
        y[offsetY + k * strideY] = temp / ak;
      }
    } else {
      for (k = N - 1; k >= 0; k--) {
        if (k <= N - 3) {
          temp = y[offsetY + k * strideY] - b[offsetB + k * strideB] * y[offsetY + (k + 1) * strideY] - d[offsetD + k * strideD] * y[offsetY + (k + 2) * strideY];
        } else if (k === N - 2) {
          temp = y[offsetY + k * strideY] - b[offsetB + k * strideB] * y[offsetY + (k + 1) * strideY];
        } else {
          temp = y[offsetY + k * strideY];
        }
        ak = a[offsetA + k * strideA];
        pert = Math.abs(tol) * (ak >= 0 ? 1 : -1);
        while (true) {
          absak = Math.abs(ak);
          if (absak < 1) {
            if (absak < SFMIN2) {
              if (absak === 0 || Math.abs(temp) * SFMIN2 > absak) {
                ak += pert;
                pert *= 2;
                continue;
              }
              temp *= BIGNUM;
              ak *= BIGNUM;
            } else if (Math.abs(temp) > absak * BIGNUM) {
              ak += pert;
              pert *= 2;
              continue;
            }
          }
          break;
        }
        y[offsetY + k * strideY] = temp / ak;
      }
    }
  } else {
    if (job === 2) {
      for (k = 0; k < N; k++) {
        if (k >= 2) {
          temp = y[offsetY + k * strideY] - b[offsetB + (k - 1) * strideB] * y[offsetY + (k - 1) * strideY] - d[offsetD + (k - 2) * strideD] * y[offsetY + (k - 2) * strideY];
        } else if (k === 1) {
          temp = y[offsetY + k * strideY] - b[offsetB + (k - 1) * strideB] * y[offsetY + (k - 1) * strideY];
        } else {
          temp = y[offsetY + k * strideY];
        }
        ak = a[offsetA + k * strideA];
        absak = Math.abs(ak);
        if (absak < 1) {
          if (absak < SFMIN2) {
            if (absak === 0 || Math.abs(temp) * SFMIN2 > absak) {
              return k + 1;
            }
            temp *= BIGNUM;
            ak *= BIGNUM;
          } else if (Math.abs(temp) > absak * BIGNUM) {
            return k + 1;
          }
        }
        y[offsetY + k * strideY] = temp / ak;
      }
    } else {
      for (k = 0; k < N; k++) {
        if (k >= 2) {
          temp = y[offsetY + k * strideY] - b[offsetB + (k - 1) * strideB] * y[offsetY + (k - 1) * strideY] - d[offsetD + (k - 2) * strideD] * y[offsetY + (k - 2) * strideY];
        } else if (k === 1) {
          temp = y[offsetY + k * strideY] - b[offsetB + (k - 1) * strideB] * y[offsetY + (k - 1) * strideY];
        } else {
          temp = y[offsetY + k * strideY];
        }
        ak = a[offsetA + k * strideA];
        pert = Math.abs(tol) * (ak >= 0 ? 1 : -1);
        while (true) {
          absak = Math.abs(ak);
          if (absak < 1) {
            if (absak < SFMIN2) {
              if (absak === 0 || Math.abs(temp) * SFMIN2 > absak) {
                ak += pert;
                pert *= 2;
                continue;
              }
              temp *= BIGNUM;
              ak *= BIGNUM;
            } else if (Math.abs(temp) > absak * BIGNUM) {
              ak += pert;
              pert *= 2;
              continue;
            }
          }
          break;
        }
        y[offsetY + k * strideY] = temp / ak;
      }
    }
    for (k = N - 1; k >= 1; k--) {
      if (IN[offsetIN + (k - 1) * strideIN] === 0) {
        y[offsetY + (k - 1) * strideY] -= c[offsetC + (k - 1) * strideC] * y[offsetY + k * strideY];
      } else {
        temp = y[offsetY + (k - 1) * strideY];
        y[offsetY + (k - 1) * strideY] = y[offsetY + k * strideY];
        y[offsetY + k * strideY] = temp - c[offsetC + (k - 1) * strideC] * y[offsetY + k * strideY];
      }
    }
  }
  return 0;
}
var base_default58 = dlagts;

// ../notes/lib/lapack/base/dstein/lib/base.js
var MAXITS = 5;
var EXTRA = 2;
var ODM3 = 1e-3;
var ODM1 = 0.1;
var TEN = 10;
var EPS4 = base_default16("Precision");
function dstein(N, d, strideD, offsetD, e, strideE, offsetE, M5, w, strideW, offsetW, IBLOCK, strideIBLOCK, offsetIBLOCK, ISPLIT, strideISPLIT, offsetISPLIT, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, offsetWork, IWORK, strideIWork, offsetIWork, IFAIL, strideIFAIL, offsetIFAIL) {
  var nrmchk;
  var dtpcrt;
  var indrv1;
  var indrv2;
  var indrv3;
  var indrv4;
  var indrv5;
  var onenrm;
  var blksiz;
  var pertol;
  var iseed;
  var gpind;
  var ortol;
  var jblk;
  var jmax;
  var info;
  var nblk;
  var eps1;
  var its;
  var scl;
  var sep;
  var tol;
  var nrm;
  var xjm;
  var ztr;
  var xj;
  var b1;
  var bn;
  var j1;
  var j;
  var i;
  info = 0;
  for (i = 0; i < M5; i++) {
    IFAIL[offsetIFAIL + i * strideIFAIL] = 0;
  }
  if (N < 0) {
    return -1;
  }
  if (M5 < 0 || M5 > N) {
    return -4;
  }
  for (j = 1; j < M5; j++) {
    if (IBLOCK[offsetIBLOCK + j * strideIBLOCK] < IBLOCK[offsetIBLOCK + (j - 1) * strideIBLOCK]) {
      return -6;
    }
    if (IBLOCK[offsetIBLOCK + j * strideIBLOCK] === IBLOCK[offsetIBLOCK + (j - 1) * strideIBLOCK] && w[offsetW + j * strideW] < w[offsetW + (j - 1) * strideW]) {
      return -5;
    }
  }
  if (N === 0 || M5 === 0) {
    return 0;
  }
  if (N === 1) {
    Z[offsetZ] = 1;
    return 0;
  }
  iseed = new import_lib7.default([1, 1, 1, 1]);
  indrv1 = offsetWork;
  indrv2 = indrv1 + N * strideWork;
  indrv3 = indrv2 + N * strideWork;
  indrv4 = indrv3 + N * strideWork;
  indrv5 = indrv4 + N * strideWork;
  j1 = 0;
  for (nblk = 1; nblk <= IBLOCK[offsetIBLOCK + (M5 - 1) * strideIBLOCK]; nblk++) {
    if (nblk === 1) {
      b1 = 0;
    } else {
      b1 = ISPLIT[offsetISPLIT + (nblk - 2) * strideISPLIT];
    }
    bn = ISPLIT[offsetISPLIT + (nblk - 1) * strideISPLIT] - 1;
    blksiz = bn - b1 + 1;
    if (blksiz !== 1) {
      gpind = j1;
      onenrm = Math.abs(d[offsetD + b1 * strideD]) + Math.abs(e[offsetE + b1 * strideE]);
      onenrm = Math.max(onenrm, Math.abs(d[offsetD + bn * strideD]) + Math.abs(e[offsetE + (bn - 1) * strideE]));
      for (i = b1 + 1; i <= bn - 1; i++) {
        onenrm = Math.max(onenrm, Math.abs(d[offsetD + i * strideD]) + Math.abs(e[offsetE + (i - 1) * strideE]) + Math.abs(e[offsetE + i * strideE]));
      }
      ortol = ODM3 * onenrm;
      dtpcrt = Math.sqrt(ODM1 / blksiz);
    }
    jblk = 0;
    for (j = j1; j < M5; j++) {
      if (IBLOCK[offsetIBLOCK + j * strideIBLOCK] !== nblk) {
        j1 = j;
        break;
      }
      jblk++;
      xj = w[offsetW + j * strideW];
      if (blksiz === 1) {
        WORK[indrv1] = 1;
        _storeEigenvector(N, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, indrv1, b1, blksiz, j);
        xjm = xj;
        if (j === M5 - 1) {
          j1 = M5;
        }
        continue;
      }
      if (jblk > 1) {
        eps1 = Math.abs(EPS4 * xj);
        pertol = TEN * eps1;
        sep = xj - xjm;
        if (sep < pertol) {
          xj = xjm + pertol;
        }
      }
      its = 0;
      nrmchk = 0;
      base_default55(2, iseed, 1, 0, blksiz, WORK, strideWork, indrv1);
      base_default34(blksiz, d, strideD, offsetD + b1 * strideD, WORK, strideWork, indrv4);
      base_default34(blksiz - 1, e, strideE, offsetE + b1 * strideE, WORK, strideWork, indrv2 + strideWork);
      base_default34(blksiz - 1, e, strideE, offsetE + b1 * strideE, WORK, strideWork, indrv3);
      tol = 0;
      base_default57(blksiz, WORK, strideWork, indrv4, xj, WORK, strideWork, indrv2 + strideWork, WORK, strideWork, indrv3, tol, WORK, strideWork, indrv5, IWORK, strideIWork, offsetIWork);
      while (true) {
        its++;
        if (its > MAXITS) {
          info++;
          IFAIL[offsetIFAIL + (info - 1) * strideIFAIL] = j + 1;
          break;
        }
        jmax = base_default56(blksiz, WORK, strideWork, indrv1);
        scl = blksiz * onenrm * Math.max(EPS4, Math.abs(WORK[indrv4 + (blksiz - 1) * strideWork])) / Math.abs(WORK[indrv1 + jmax * strideWork]);
        base_default7(blksiz, scl, WORK, strideWork, indrv1);
        base_default58(-1, blksiz, WORK, strideWork, indrv4, WORK, strideWork, indrv2 + strideWork, WORK, strideWork, indrv3, WORK, strideWork, indrv5, IWORK, strideIWork, offsetIWork, WORK, strideWork, indrv1, tol);
        if (jblk !== 1) {
          if (Math.abs(xj - xjm) > ortol) {
            gpind = j;
          }
          if (gpind !== j) {
            for (i = gpind; i < j; i++) {
              ztr = -base_default23(blksiz, WORK, strideWork, indrv1, Z, strideZ1, offsetZ + b1 * strideZ1 + i * strideZ2);
              base_default6(blksiz, ztr, Z, strideZ1, offsetZ + b1 * strideZ1 + i * strideZ2, WORK, strideWork, indrv1);
            }
          }
        }
        jmax = base_default56(blksiz, WORK, strideWork, indrv1);
        nrm = Math.abs(WORK[indrv1 + jmax * strideWork]);
        if (nrm < dtpcrt) {
          continue;
        }
        nrmchk++;
        if (nrmchk < EXTRA + 1) {
          continue;
        }
        break;
      }
      scl = 1 / base_default19(blksiz, WORK, strideWork, indrv1);
      jmax = base_default56(blksiz, WORK, strideWork, indrv1);
      if (WORK[indrv1 + jmax * strideWork] < 0) {
        scl = -scl;
      }
      base_default7(blksiz, scl, WORK, strideWork, indrv1);
      _storeEigenvector(N, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, indrv1, b1, blksiz, j);
      xjm = xj;
      if (j === M5 - 1) {
        j1 = M5;
      }
    }
  }
  return info;
}
function _storeEigenvector(N, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, indrv1, b1, blksiz, j) {
  var i;
  for (i = 0; i < N; i++) {
    Z[offsetZ + i * strideZ1 + j * strideZ2] = 0;
  }
  for (i = 0; i < blksiz; i++) {
    Z[offsetZ + (b1 + i) * strideZ1 + j * strideZ2] = WORK[indrv1 + i * strideWork];
  }
}
var base_default59 = dstein;

// ../notes/lib/lapack/base/dorm2l/lib/base.js
function dorm2l(side, trans, M5, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWork, offsetWork) {
  var notran;
  var left;
  var idxA;
  var aii;
  var nq;
  var mi;
  var ni;
  var i1;
  var i2;
  var i3;
  var i;
  if (M5 === 0 || N === 0 || K === 0) {
    return 0;
  }
  left = side === "left";
  notran = trans === "no-transpose";
  if (left) {
    nq = M5;
  } else {
    nq = N;
  }
  if (left && notran || !left && !notran) {
    i1 = 0;
    i2 = K;
    i3 = 1;
  } else {
    i1 = K - 1;
    i2 = -1;
    i3 = -1;
  }
  if (left) {
    ni = N;
  } else {
    mi = M5;
  }
  for (i = i1; i !== i2; i += i3) {
    if (left) {
      mi = M5 - K + i + 1;
    } else {
      ni = N - K + i + 1;
    }
    idxA = offsetA + (nq - K + i) * strideA1 + i * strideA2;
    aii = A[idxA];
    A[idxA] = 1;
    base_default31(side, mi, ni, A, strideA1, offsetA + i * strideA2, TAU[offsetTAU + i * strideTAU], C, strideC1, strideC2, offsetC, WORK, strideWork, offsetWork);
    A[idxA] = aii;
  }
  return 0;
}
var base_default60 = dorm2l;

// ../notes/lib/lapack/base/dormql/lib/base.js
var NB6 = 32;
function dormql(side, trans, M5, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWork, offsetWork) {
  var offsetT;
  var notran;
  var ldwork;
  var left;
  var ldt;
  var nw;
  var nb;
  var nq;
  var mi;
  var ni;
  var ib;
  var i1;
  var i2;
  var i3;
  var T;
  var i;
  if (M5 === 0 || N === 0 || K === 0) {
    return 0;
  }
  left = side === "left";
  notran = trans === "no-transpose";
  if (left) {
    nq = M5;
    nw = Math.max(1, N);
  } else {
    nq = N;
    nw = Math.max(1, M5);
  }
  nb = NB6;
  if (nb > K) {
    nb = K;
  }
  if (nb < 2 || nb >= K) {
    return base_default60(side, trans, M5, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWork, offsetWork);
  }
  ldwork = nw;
  ldt = nb + 1;
  T = WORK;
  offsetT = offsetWork + nw * nb;
  if (left && notran || !left && !notran) {
    i1 = 0;
    i2 = K;
    i3 = nb;
  } else {
    i1 = Math.floor((K - 1) / nb) * nb;
    i2 = -1;
    i3 = -nb;
  }
  if (left) {
    ni = N;
  } else {
    mi = M5;
  }
  for (i = i1; i3 > 0 ? i < i2 : i > i2; i += i3) {
    ib = Math.min(nb, K - i);
    base_default33("backward", "columnwise", nq - K + i + ib, ib, A, strideA1, strideA2, offsetA + i * strideA2, TAU, strideTAU, offsetTAU + i * strideTAU, T, 1, ldt, offsetT);
    if (left) {
      mi = M5 - K + i + ib;
    } else {
      ni = N - K + i + ib;
    }
    base_default35(side, trans, "backward", "columnwise", mi, ni, ib, A, strideA1, strideA2, offsetA + i * strideA2, T, 1, ldt, offsetT, C, strideC1, strideC2, offsetC, WORK, 1, ldwork, offsetWork);
  }
  return 0;
}
var base_default61 = dormql;

// ../notes/lib/lapack/base/dorm2r/lib/base.js
function dorm2r(side, trans, M5, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWork, offsetWork) {
  var notran;
  var left;
  var idxA;
  var aii;
  var mi;
  var ni;
  var ic;
  var jc;
  var i1;
  var i2;
  var i3;
  var i;
  if (M5 === 0 || N === 0 || K === 0) {
    return 0;
  }
  left = side === "left";
  notran = trans === "no-transpose";
  if (left && !notran || !left && notran) {
    i1 = 0;
    i2 = K;
    i3 = 1;
  } else {
    i1 = K - 1;
    i2 = -1;
    i3 = -1;
  }
  if (left) {
    ni = N;
    jc = 0;
  } else {
    mi = M5;
    ic = 0;
  }
  for (i = i1; i !== i2; i += i3) {
    if (left) {
      mi = M5 - i;
      ic = i;
    } else {
      ni = N - i;
      jc = i;
    }
    idxA = offsetA + i * strideA1 + i * strideA2;
    aii = A[idxA];
    A[idxA] = 1;
    base_default31(side, mi, ni, A, strideA1, offsetA + i * strideA1 + i * strideA2, TAU[offsetTAU + i * strideTAU], C, strideC1, strideC2, offsetC + ic * strideC1 + jc * strideC2, WORK, strideWork, offsetWork);
    A[idxA] = aii;
  }
  return 0;
}
var base_default62 = dorm2r;

// ../notes/lib/lapack/base/dormqr/lib/base.js
var NB7 = 32;
function dormqr(side, trans, M5, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWork, offsetWork) {
  var offsetT;
  var notran;
  var ldwork;
  var left;
  var ldt;
  var nw;
  var nb;
  var nq;
  var mi;
  var ni;
  var ic;
  var jc;
  var ib;
  var i1;
  var i2;
  var i3;
  var T;
  var i;
  left = side === "left";
  notran = trans === "no-transpose";
  if (left) {
    nq = M5;
    nw = Math.max(1, N);
  } else {
    nq = N;
    nw = Math.max(1, M5);
  }
  if (M5 === 0 || N === 0 || K === 0) {
    return 0;
  }
  nb = NB7;
  ldwork = nw;
  ldt = nb + 1;
  T = WORK;
  offsetT = offsetWork + nw * nb;
  if (nb >= K) {
    base_default62(side, trans, M5, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWork, offsetWork);
    return 0;
  }
  if (left && !notran || !left && notran) {
    i1 = 0;
    i2 = K;
    i3 = nb;
  } else {
    i1 = Math.floor((K - 1) / nb) * nb;
    i2 = -1;
    i3 = -nb;
  }
  if (left) {
    ni = N;
    jc = 0;
  } else {
    mi = M5;
    ic = 0;
  }
  for (i = i1; i3 > 0 ? i < i2 : i > i2; i += i3) {
    ib = Math.min(nb, K - i);
    base_default33("forward", "columnwise", nq - i, ib, A, strideA1, strideA2, offsetA + i * strideA1 + i * strideA2, TAU, strideTAU, offsetTAU + i * strideTAU, T, 1, ldt, offsetT);
    if (left) {
      mi = M5 - i;
      ic = i;
    } else {
      ni = N - i;
      jc = i;
    }
    base_default35(side, trans, "forward", "columnwise", mi, ni, ib, A, strideA1, strideA2, offsetA + i * strideA1 + i * strideA2, T, 1, ldt, offsetT, C, strideC1, strideC2, offsetC + ic * strideC1 + jc * strideC2, WORK, 1, ldwork, offsetWork);
  }
  return 0;
}
var base_default63 = dormqr;

// ../notes/lib/lapack/base/dormtr/lib/base.js
function dormtr(side, uplo, trans, M5, N, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWork, offsetWork, lwork) {
  var upper;
  var left;
  var nq;
  var mi;
  var ni;
  var i1;
  var i2;
  left = side === "left";
  upper = uplo === "upper";
  if (left) {
    nq = M5;
  } else {
    nq = N;
  }
  if (M5 === 0 || N === 0 || nq === 1) {
    return 0;
  }
  if (left) {
    mi = M5 - 1;
    ni = N;
  } else {
    mi = M5;
    ni = N - 1;
  }
  if (upper) {
    base_default61(side, trans, mi, ni, nq - 1, A, strideA1, strideA2, offsetA + strideA2, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWork, offsetWork);
  } else {
    if (left) {
      i1 = 1;
      i2 = 0;
    } else {
      i1 = 0;
      i2 = 1;
    }
    base_default63(side, trans, mi, ni, nq - 1, A, strideA1, strideA2, offsetA + strideA1, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC + i1 * strideC1 + i2 * strideC2, WORK, strideWork, offsetWork);
  }
  return 0;
}
var base_default64 = dormtr;

// ../notes/lib/lapack/base/dsyevx/lib/base.js
var sqrt2 = Math.sqrt;
var min3 = Math.min;
function dsyevx(jobz, range, uplo, N, A, strideA1, strideA2, offsetA, vl, vu, il, iu, abstol, out, w, strideW, offsetW, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, offsetWork, lwork, IWORK, strideIWork, offsetIWork, IFAIL, strideIFAIL, offsetIFAIL) {
  var alleig;
  var valeig;
  var indeig;
  var safmin;
  var smlnum;
  var bignum;
  var iscale;
  var abstll;
  var indtau;
  var indwrk;
  var indwkn;
  var llwrkn;
  var nsplit;
  var indibl;
  var indisp;
  var indiwo;
  var wantz;
  var lower;
  var sigma;
  var indee;
  var order;
  var itmp1;
  var anrm;
  var rmin;
  var rmax;
  var info;
  var imax;
  var inde;
  var indd;
  var Mout;
  var tmp1;
  var test;
  var eps;
  var vll;
  var vuu;
  var jj;
  var i;
  var j;
  var M5;
  wantz = jobz === "compute-vectors";
  alleig = range === "all";
  valeig = range === "value";
  indeig = range === "index";
  lower = uplo === "lower";
  info = 0;
  M5 = 0;
  if (N === 0) {
    out.M = 0;
    return 0;
  }
  if (N === 1) {
    if (alleig || indeig) {
      M5 = 1;
      w[offsetW] = A[offsetA];
    } else if (valeig) {
      if (vl < A[offsetA] && vu >= A[offsetA]) {
        M5 = 1;
        w[offsetW] = A[offsetA];
      }
    }
    if (wantz && M5 === 1) {
      Z[offsetZ] = 1;
    }
    out.M = M5;
    return 0;
  }
  safmin = base_default16("safe-minimum");
  eps = base_default16("epsilon");
  smlnum = safmin / eps;
  bignum = 1 / smlnum;
  rmin = sqrt2(smlnum);
  rmax = min3(sqrt2(bignum), 1 / sqrt2(sqrt2(safmin)));
  iscale = 0;
  abstll = abstol;
  vll = vl;
  vuu = vu;
  anrm = base_default18("max", uplo, N, A, strideA1, strideA2, offsetA, WORK, strideWork, offsetWork);
  sigma = 1;
  if (anrm > 0 && anrm < rmin) {
    iscale = 1;
    sigma = rmin / anrm;
  } else if (anrm > rmax) {
    iscale = 1;
    sigma = rmax / anrm;
  }
  if (iscale === 1) {
    if (lower) {
      for (j = 0; j < N; j++) {
        base_default7(N - j, sigma, A, strideA1, offsetA + j * strideA1 + j * strideA2);
      }
    } else {
      for (j = 0; j < N; j++) {
        base_default7(j + 1, sigma, A, strideA1, offsetA + j * strideA2);
      }
    }
    if (abstol > 0) {
      abstll = abstol * sigma;
    }
    if (valeig) {
      vll = vl * sigma;
      vuu = vu * sigma;
    }
  }
  indtau = offsetWork;
  inde = indtau + N;
  indd = inde + N;
  indwrk = indd + N;
  base_default27(uplo, N, A, strideA1, strideA2, offsetA, WORK, strideWork, indd, WORK, strideWork, inde, WORK, strideWork, indtau);
  test = false;
  if (indeig) {
    if (il === 1 && iu === N) {
      test = true;
    }
  }
  if ((alleig || test) && abstol <= 0) {
    base_default34(N, WORK, strideWork, indd, w, strideW, offsetW);
    indee = indwrk + 2 * N;
    if (!wantz) {
      base_default34(N - 1, WORK, strideWork, inde, WORK, strideWork, indee);
      info = base_default51(N, w, strideW, offsetW, WORK, strideWork, indee);
    } else {
      base_default40("all", N, N, A, strideA1, strideA2, offsetA, Z, strideZ1, strideZ2, offsetZ);
      base_default39(uplo, N, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, indtau, WORK, strideWork, indwrk);
      base_default34(N - 1, WORK, strideWork, inde, WORK, strideWork, indee);
      info = base_default50("update", N, w, strideW, offsetW, WORK, strideWork, indee, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, indwrk);
      if (info === 0) {
        for (i = 0; i < N; i++) {
          IFAIL[offsetIFAIL + i * strideIFAIL] = 0;
        }
      }
    }
    if (info === 0) {
      M5 = N;
    } else {
      info = 0;
      M5 = 0;
    }
  }
  if (M5 === 0 && info === 0) {
    if (wantz) {
      order = "block";
    } else {
      order = "entire";
    }
    indibl = offsetIWork;
    indisp = indibl + N;
    indiwo = indisp + N;
    Mout = new import_lib8.default(1);
    nsplit = new import_lib8.default(1);
    info = base_default53(range, order, N, vll, vuu, il, iu, abstll, WORK, strideWork, indd, WORK, strideWork, inde, Mout, nsplit, w, strideW, offsetW, IWORK, strideIWork, indibl, IWORK, strideIWork, indisp, WORK, strideWork, indwrk, IWORK, strideIWork, indiwo);
    M5 = Mout[0];
    if (wantz && M5 > 0) {
      info = base_default59(N, WORK, strideWork, indd, WORK, strideWork, inde, M5, w, strideW, offsetW, IWORK, strideIWork, indibl, IWORK, strideIWork, indisp, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, indwrk, IWORK, strideIWork, indiwo, IFAIL, strideIFAIL, offsetIFAIL);
      indwkn = inde;
      llwrkn = lwork - (indwkn - offsetWork);
      base_default64("left", uplo, "no-transpose", N, M5, A, strideA1, strideA2, offsetA, WORK, strideWork, indtau, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, indwkn, llwrkn);
    }
  }
  if (iscale === 1) {
    if (info === 0) {
      imax = M5;
    } else {
      imax = info - 1;
    }
    base_default7(imax, 1 / sigma, w, strideW, offsetW);
  }
  if (wantz) {
    for (j = 0; j < M5 - 1; j++) {
      i = -1;
      tmp1 = w[offsetW + j * strideW];
      for (jj = j + 1; jj < M5; jj++) {
        if (w[offsetW + jj * strideW] < tmp1) {
          i = jj;
          tmp1 = w[offsetW + jj * strideW];
        }
      }
      if (i >= 0) {
        itmp1 = IWORK[indibl + i];
        w[offsetW + i * strideW] = w[offsetW + j * strideW];
        IWORK[indibl + i] = IWORK[indibl + j];
        w[offsetW + j * strideW] = tmp1;
        IWORK[indibl + j] = itmp1;
        base_default49(N, Z, strideZ1, offsetZ + i * strideZ2, Z, strideZ1, offsetZ + j * strideZ2);
        if (info !== 0) {
          itmp1 = IFAIL[offsetIFAIL + i * strideIFAIL];
          IFAIL[offsetIFAIL + i * strideIFAIL] = IFAIL[offsetIFAIL + j * strideIFAIL];
          IFAIL[offsetIFAIL + j * strideIFAIL] = itmp1;
        }
      }
    }
  }
  out.M = M5;
  return info;
}
var base_default65 = dsyevx;

// ../notes/lib/lapack/base/dsygvx/lib/base.js
function dsygvx(itype, jobz, range, uplo, N, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB, vl, vu, il, iu, abstol, out, w, strideW, offsetW, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, offsetWork, lwork, IWORK, strideIWork, offsetIWork, IFAIL, strideIFAIL, offsetIFAIL) {
  var wantz;
  var upper;
  var trans;
  var info;
  var M5;
  wantz = jobz === "compute-vectors";
  upper = uplo === "upper";
  out.M = 0;
  if (N === 0) {
    return 0;
  }
  info = base_default5(uplo, N, B, strideB1, strideB2, offsetB);
  if (info !== 0) {
    return N + info;
  }
  base_default15(itype, uplo, N, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB);
  info = base_default65(jobz, range, uplo, N, A, strideA1, strideA2, offsetA, vl, vu, il, iu, abstol, out, w, strideW, offsetW, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, offsetWork, lwork, IWORK, strideIWork, offsetIWork, IFAIL, strideIFAIL, offsetIFAIL);
  M5 = out.M;
  if (wantz) {
    if (info > 0) {
      M5 = info - 1;
    }
    if (M5 > 0) {
      if (itype === 1 || itype === 2) {
        if (upper) {
          trans = "no-transpose";
        } else {
          trans = "transpose";
        }
        base_default("left", uplo, trans, "non-unit", N, M5, 1, B, strideB1, strideB2, offsetB, Z, strideZ1, strideZ2, offsetZ);
      } else if (itype === 3) {
        if (upper) {
          trans = "transpose";
        } else {
          trans = "no-transpose";
        }
        base_default14("left", uplo, trans, "non-unit", N, M5, 1, B, strideB1, strideB2, offsetB, Z, strideZ1, strideZ2, offsetZ);
      }
    }
  }
  return info;
}
var base_default66 = dsygvx;
export {
  base_default66 as default
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
@stdlib/assert/is-int32array/lib/main.js:
@stdlib/assert/is-int32array/lib/index.js:
@stdlib/constants/int32/max/lib/index.js:
@stdlib/constants/int32/min/lib/index.js:
@stdlib/assert/has-int32array-support/lib/int32array.js:
@stdlib/assert/has-int32array-support/lib/main.js:
@stdlib/assert/has-int32array-support/lib/index.js:
@stdlib/array/int32/lib/main.js:
@stdlib/array/int32/lib/polyfill.js:
@stdlib/array/int32/lib/index.js:
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
