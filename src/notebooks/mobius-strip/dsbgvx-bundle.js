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

// ../notes/node_modules/@stdlib/math/base/special/sqrt/lib/main.js
var require_main9 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/special/sqrt/lib/main.js"(exports, module) {
    "use strict";
    var sqrt3 = Math.sqrt;
    module.exports = sqrt3;
  }
});

// ../notes/node_modules/@stdlib/math/base/special/sqrt/lib/index.js
var require_lib11 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/special/sqrt/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main9();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/constants/float64/pinf/lib/index.js
var require_lib12 = __commonJS({
  "../notes/node_modules/@stdlib/constants/float64/pinf/lib/index.js"(exports, module) {
    "use strict";
    var FLOAT64_PINF = Number.POSITIVE_INFINITY;
    module.exports = FLOAT64_PINF;
  }
});

// ../notes/node_modules/@stdlib/math/base/assert/is-positive-zero/lib/main.js
var require_main10 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/assert/is-positive-zero/lib/main.js"(exports, module) {
    "use strict";
    var PINF = require_lib12();
    function isPositiveZero(x) {
      return x === 0 && 1 / x === PINF;
    }
    module.exports = isPositiveZero;
  }
});

// ../notes/node_modules/@stdlib/math/base/assert/is-positive-zero/lib/index.js
var require_lib13 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/assert/is-positive-zero/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main10();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/math/base/assert/is-nan/lib/main.js
var require_main11 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/assert/is-nan/lib/main.js"(exports, module) {
    "use strict";
    function isnan(x) {
      return x !== x;
    }
    module.exports = isnan;
  }
});

// ../notes/node_modules/@stdlib/math/base/assert/is-nan/lib/index.js
var require_lib14 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/assert/is-nan/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main11();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/math/base/special/max/lib/main.js
var require_main12 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/special/max/lib/main.js"(exports, module) {
    "use strict";
    var isPositiveZero = require_lib13();
    var isnan = require_lib14();
    var PINF = require_lib12();
    function max4(x, y) {
      if (isnan(x) || isnan(y)) {
        return NaN;
      }
      if (x === PINF || y === PINF) {
        return PINF;
      }
      if (x === y && x === 0) {
        if (isPositiveZero(x)) {
          return x;
        }
        return y;
      }
      if (x > y) {
        return x;
      }
      return y;
    }
    module.exports = max4;
  }
});

// ../notes/node_modules/@stdlib/math/base/special/max/lib/index.js
var require_lib15 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/special/max/lib/index.js"(exports, module) {
    "use strict";
    var max4 = require_main12();
    module.exports = max4;
  }
});

// ../notes/node_modules/@stdlib/number/ctor/lib/main.js
var require_main13 = __commonJS({
  "../notes/node_modules/@stdlib/number/ctor/lib/main.js"(exports, module) {
    "use strict";
    module.exports = Number;
  }
});

// ../notes/node_modules/@stdlib/number/ctor/lib/index.js
var require_lib16 = __commonJS({
  "../notes/node_modules/@stdlib/number/ctor/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main13();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/constants/float64/ninf/lib/index.js
var require_lib17 = __commonJS({
  "../notes/node_modules/@stdlib/constants/float64/ninf/lib/index.js"(exports, module) {
    "use strict";
    var Number2 = require_lib16();
    var FLOAT64_NINF = Number2.NEGATIVE_INFINITY;
    module.exports = FLOAT64_NINF;
  }
});

// ../notes/node_modules/@stdlib/math/base/assert/is-negative-zero/lib/main.js
var require_main14 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/assert/is-negative-zero/lib/main.js"(exports, module) {
    "use strict";
    var NINF = require_lib17();
    function isNegativeZero(x) {
      return x === 0 && 1 / x === NINF;
    }
    module.exports = isNegativeZero;
  }
});

// ../notes/node_modules/@stdlib/math/base/assert/is-negative-zero/lib/index.js
var require_lib18 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/assert/is-negative-zero/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main14();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/math/base/special/min/lib/main.js
var require_main15 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/special/min/lib/main.js"(exports, module) {
    "use strict";
    var isNegativeZero = require_lib18();
    var isnan = require_lib14();
    var NINF = require_lib17();
    function min4(x, y) {
      if (isnan(x) || isnan(y)) {
        return NaN;
      }
      if (x === NINF || y === NINF) {
        return NINF;
      }
      if (x === y && x === 0) {
        if (isNegativeZero(x)) {
          return x;
        }
        return y;
      }
      if (x < y) {
        return x;
      }
      return y;
    }
    module.exports = min4;
  }
});

// ../notes/node_modules/@stdlib/math/base/special/min/lib/index.js
var require_lib19 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/special/min/lib/index.js"(exports, module) {
    "use strict";
    var min4 = require_main15();
    module.exports = min4;
  }
});

// ../notes/node_modules/@stdlib/math/base/special/floor/lib/main.js
var require_main16 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/special/floor/lib/main.js"(exports, module) {
    "use strict";
    var floor3 = Math.floor;
    module.exports = floor3;
  }
});

// ../notes/node_modules/@stdlib/math/base/special/floor/lib/index.js
var require_lib20 = __commonJS({
  "../notes/node_modules/@stdlib/math/base/special/floor/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main16();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/assert/is-float64array/lib/main.js
var require_main17 = __commonJS({
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
var require_lib21 = __commonJS({
  "../notes/node_modules/@stdlib/assert/is-float64array/lib/index.js"(exports, module) {
    "use strict";
    var isFloat64Array = require_main17();
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
var require_main18 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-float64array-support/lib/main.js"(exports, module) {
    "use strict";
    var isFloat64Array = require_lib21();
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
var require_lib22 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-float64array-support/lib/index.js"(exports, module) {
    "use strict";
    var hasFloat64ArraySupport = require_main18();
    module.exports = hasFloat64ArraySupport;
  }
});

// ../notes/node_modules/@stdlib/array/float64/lib/main.js
var require_main19 = __commonJS({
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
var require_lib23 = __commonJS({
  "../notes/node_modules/@stdlib/array/float64/lib/index.js"(exports, module) {
    "use strict";
    var hasFloat64ArraySupport = require_lib22();
    var builtin = require_main19();
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

// ../notes/lib/lapack/base/dsbgvx/lib/base.js
var import_lib12 = __toESM(require_lib10(), 1);

// ../notes/lib/lapack/base/dpbstf/lib/base.js
var import_lib = __toESM(require_lib11(), 1);
var import_lib2 = __toESM(require_lib15(), 1);
var import_lib3 = __toESM(require_lib19(), 1);
var import_lib4 = __toESM(require_lib20(), 1);

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

// ../notes/lib/lapack/base/dpbstf/lib/base.js
function dpbstf(uplo, N, kd, AB, strideAB1, strideAB2, offsetAB) {
  var sa1;
  var sa2;
  var kld;
  var ajj;
  var km;
  var m;
  var j;
  if (N === 0) {
    return 0;
  }
  sa1 = strideAB1;
  sa2 = strideAB2;
  kld = (0, import_lib2.default)(1, sa2 - sa1);
  m = (0, import_lib4.default)((N + kd) / 2);
  if (uplo === "upper") {
    for (j = N - 1; j >= m; j--) {
      ajj = AB[offsetAB + kd * sa1 + j * sa2];
      if (ajj <= 0) {
        AB[offsetAB + kd * sa1 + j * sa2] = ajj;
        return j + 1;
      }
      ajj = (0, import_lib.default)(ajj);
      AB[offsetAB + kd * sa1 + j * sa2] = ajj;
      km = (0, import_lib3.default)(j, kd);
      base_default(km, 1 / ajj, AB, sa1, offsetAB + (kd - km) * sa1 + j * sa2);
      base_default2("upper", km, -1, AB, sa1, offsetAB + (kd - km) * sa1 + j * sa2, AB, sa1, kld, offsetAB + kd * sa1 + (j - km) * sa2);
    }
    for (j = 0; j < m; j++) {
      ajj = AB[offsetAB + kd * sa1 + j * sa2];
      if (ajj <= 0) {
        AB[offsetAB + kd * sa1 + j * sa2] = ajj;
        return j + 1;
      }
      ajj = (0, import_lib.default)(ajj);
      AB[offsetAB + kd * sa1 + j * sa2] = ajj;
      km = (0, import_lib3.default)(kd, m - j - 1);
      if (km > 0) {
        base_default(km, 1 / ajj, AB, kld, offsetAB + (kd - 1) * sa1 + (j + 1) * sa2);
        base_default2("upper", km, -1, AB, kld, offsetAB + (kd - 1) * sa1 + (j + 1) * sa2, AB, sa1, kld, offsetAB + kd * sa1 + (j + 1) * sa2);
      }
    }
  } else {
    for (j = N - 1; j >= m; j--) {
      ajj = AB[offsetAB + j * sa2];
      if (ajj <= 0) {
        AB[offsetAB + j * sa2] = ajj;
        return j + 1;
      }
      ajj = (0, import_lib.default)(ajj);
      AB[offsetAB + j * sa2] = ajj;
      km = (0, import_lib3.default)(j, kd);
      base_default(km, 1 / ajj, AB, kld, offsetAB + km * sa1 + (j - km) * sa2);
      base_default2("lower", km, -1, AB, kld, offsetAB + km * sa1 + (j - km) * sa2, AB, sa1, kld, offsetAB + (j - km) * sa2);
    }
    for (j = 0; j < m; j++) {
      ajj = AB[offsetAB + j * sa2];
      if (ajj <= 0) {
        AB[offsetAB + j * sa2] = ajj;
        return j + 1;
      }
      ajj = (0, import_lib.default)(ajj);
      AB[offsetAB + j * sa2] = ajj;
      km = (0, import_lib3.default)(kd, m - j - 1);
      if (km > 0) {
        base_default(km, 1 / ajj, AB, sa1, offsetAB + sa1 + j * sa2);
        base_default2("lower", km, -1, AB, sa1, offsetAB + sa1 + j * sa2, AB, sa1, kld, offsetAB + (j + 1) * sa2);
      }
    }
  }
  return 0;
}
var base_default3 = dpbstf;

// ../notes/lib/lapack/base/dsbgst/lib/base.js
var import_lib5 = __toESM(require_lib23(), 1);

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
var base_default4 = dger;

// ../notes/lib/blas/base/drot/lib/base.js
function drot(N, x, strideX, offsetX, y, strideY, offsetY, c, s) {
  var temp;
  var ix;
  var iy;
  var i;
  if (N <= 0) {
    return y;
  }
  ix = offsetX;
  iy = offsetY;
  for (i = 0; i < N; i++) {
    temp = c * x[ix] + s * y[iy];
    y[iy] = c * y[iy] - s * x[ix];
    x[ix] = temp;
    ix += strideX;
    iy += strideY;
  }
  return y;
}
var base_default5 = drot;

// ../notes/lib/lapack/base/dlar2v/lib/base.js
function dlar2v(N, x, strideX, offsetX, y, strideY, offsetY, z, strideZ, offsetZ, c, strideC, offsetC, s, strideS, offsetS) {
  var ci;
  var si;
  var t1;
  var t2;
  var t3;
  var t4;
  var t5;
  var t6;
  var xi;
  var yi;
  var zi;
  var ix;
  var iy;
  var iz;
  var ic;
  var is;
  var i;
  ix = offsetX;
  iy = offsetY;
  iz = offsetZ;
  ic = offsetC;
  is = offsetS;
  for (i = 0; i < N; i++) {
    xi = x[ix];
    yi = y[iy];
    zi = z[iz];
    ci = c[ic];
    si = s[is];
    t1 = si * zi;
    t2 = ci * zi;
    t3 = t2 - si * xi;
    t4 = t2 + si * yi;
    t5 = ci * xi + t1;
    t6 = ci * yi - t1;
    x[ix] = ci * t5 + si * t4;
    y[iy] = ci * t6 - si * t3;
    z[iz] = ci * t4 - si * t5;
    ix += strideX;
    iy += strideY;
    iz += strideZ;
    ic += strideC;
    is += strideS;
  }
}
var base_default6 = dlar2v;

// ../notes/lib/lapack/base/dlargv/lib/base.js
function dlargv(N, x, strideX, offsetX, y, strideY, offsetY, c, strideC, offsetC) {
  var tt;
  var ix;
  var iy;
  var ic;
  var f;
  var g;
  var t;
  var i;
  ix = offsetX;
  iy = offsetY;
  ic = offsetC;
  for (i = 0; i < N; i += 1) {
    f = x[ix];
    g = y[iy];
    if (g === 0) {
      c[ic] = 1;
    } else if (f === 0) {
      c[ic] = 0;
      y[iy] = 1;
      x[ix] = g;
    } else if (Math.abs(f) > Math.abs(g)) {
      t = g / f;
      tt = Math.sqrt(1 + t * t);
      c[ic] = 1 / tt;
      y[iy] = t * c[ic];
      x[ix] = f * tt;
    } else {
      t = f / g;
      tt = Math.sqrt(1 + t * t);
      y[iy] = 1 / tt;
      c[ic] = t * y[iy];
      x[ix] = g * tt;
    }
    ic += strideC;
    iy += strideY;
    ix += strideX;
  }
}
var base_default7 = dlargv;

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
var base_default8 = dlartg;

// ../notes/lib/lapack/base/dlartv/lib/base.js
function dlartv(N, x, strideX, offsetX, y, strideY, offsetY, c, strideC, offsetC, s, strideS, offsetS) {
  var xi;
  var yi;
  var ix;
  var iy;
  var ic;
  var is;
  var i;
  ix = offsetX;
  iy = offsetY;
  ic = offsetC;
  is = offsetS;
  for (i = 0; i < N; i++) {
    xi = x[ix];
    yi = y[iy];
    x[ix] = c[ic] * xi + s[is] * yi;
    y[iy] = c[ic] * yi - s[is] * xi;
    ix += strideX;
    iy += strideY;
    ic += strideC;
    is += strideS;
  }
}
var base_default9 = dlartv;

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
var base_default10 = dlaset;

// ../notes/lib/lapack/base/dsbgst/lib/base.js
var DLARTG_OUT = new import_lib5.default(3);
function idx2(o, s1, s2, i, j) {
  return o + i * s1 + j * s2;
}
function dsbgst(vect, uplo, N, ka, kb, AB, strideAB1, strideAB2, offsetAB, BB, strideBB1, strideBB2, offsetBB, X, strideX1, strideX2, offsetX, WORK, strideWork, offsetWork) {
  var update;
  var wantx;
  var upper;
  var ka1;
  var kb1;
  var kbt;
  var bii;
  var ra1;
  var j1t;
  var j2t;
  var nrt;
  var sA1;
  var sA2;
  var sB1;
  var sB2;
  var ra;
  var oA;
  var oB;
  var i0;
  var i1;
  var i2;
  var j1;
  var j2;
  var nr;
  var nx;
  var M5;
  var p;
  var t;
  var i;
  var j;
  var k;
  var l;
  wantx = vect === "update";
  upper = uplo === "upper";
  ka1 = ka + 1;
  kb1 = kb + 1;
  if (N === 0) {
    return 0;
  }
  oA = offsetAB;
  oB = offsetBB;
  sA1 = strideAB1;
  sA2 = strideAB2;
  sB1 = strideBB1;
  sB2 = strideBB2;
  if (wantx) {
    base_default10("none", N, N, 0, 1, X, strideX1, strideX2, offsetX);
  }
  M5 = Math.floor((N + kb) / 2);
  update = true;
  i = N + 1;
  while (true) {
    if (update) {
      i -= 1;
      kbt = Math.min(kb, i - 1);
      i0 = i - 1;
      i1 = Math.min(N, i + ka);
      i2 = i - kbt + ka1;
      if (i < M5 + 1) {
        update = false;
        i += 1;
        i0 = M5;
        if (ka === 0) {
          break;
        }
        continue;
      }
    } else {
      i += ka;
      if (i > N - 1) {
        break;
      }
    }
    if (upper) {
      if (update) {
        bii = BB[idx2(oB, sB1, sB2, kb1 - 1, i - 1)];
        for (j = i; j <= i1; j++) {
          p = idx2(oA, sA1, sA2, i - j + ka1 - 1, j - 1);
          AB[p] = AB[p] / bii;
        }
        for (j = Math.max(1, i - ka); j <= i; j++) {
          p = idx2(oA, sA1, sA2, j - i + ka1 - 1, i - 1);
          AB[p] = AB[p] / bii;
        }
        for (k = i - kbt; k <= i - 1; k++) {
          for (j = i - kbt; j <= k; j++) {
            p = idx2(oA, sA1, sA2, j - k + ka1 - 1, k - 1);
            AB[p] = AB[p] - BB[idx2(oB, sB1, sB2, j - i + kb1 - 1, i - 1)] * AB[idx2(oA, sA1, sA2, k - i + ka1 - 1, i - 1)] - BB[idx2(oB, sB1, sB2, k - i + kb1 - 1, i - 1)] * AB[idx2(oA, sA1, sA2, j - i + ka1 - 1, i - 1)] + AB[idx2(oA, sA1, sA2, ka1 - 1, i - 1)] * BB[idx2(oB, sB1, sB2, j - i + kb1 - 1, i - 1)] * BB[idx2(oB, sB1, sB2, k - i + kb1 - 1, i - 1)];
          }
          for (j = Math.max(1, i - ka); j <= i - kbt - 1; j++) {
            p = idx2(oA, sA1, sA2, j - k + ka1 - 1, k - 1);
            AB[p] = AB[p] - BB[idx2(oB, sB1, sB2, k - i + kb1 - 1, i - 1)] * AB[idx2(oA, sA1, sA2, j - i + ka1 - 1, i - 1)];
          }
        }
        for (j = i; j <= i1; j++) {
          for (k = Math.max(j - ka, i - kbt); k <= i - 1; k++) {
            p = idx2(oA, sA1, sA2, k - j + ka1 - 1, j - 1);
            AB[p] = AB[p] - BB[idx2(oB, sB1, sB2, k - i + kb1 - 1, i - 1)] * AB[idx2(oA, sA1, sA2, i - j + ka1 - 1, j - 1)];
          }
        }
        if (wantx) {
          base_default(N - M5, 1 / bii, X, strideX1, offsetX + M5 * strideX1 + (i - 1) * strideX2);
          if (kbt > 0) {
            base_default4(N - M5, kbt, -1, X, strideX1, offsetX + M5 * strideX1 + (i - 1) * strideX2, BB, strideBB1, offsetBB + (kb1 - kbt - 1) * strideBB1 + (i - 1) * strideBB2, X, strideX1, strideX2, offsetX + M5 * strideX1 + (i - kbt - 1) * strideX2);
          }
        }
        ra1 = AB[idx2(oA, sA1, sA2, i - i1 + ka1 - 1, i1 - 1)];
      }
      for (k = 1; k <= kb - 1; k++) {
        if (update) {
          if (i - k + ka < N && i - k > 1) {
            base_default8(AB[idx2(oA, sA1, sA2, k, i - k + ka - 1)], ra1, DLARTG_OUT);
            WORK[offsetWork + (N + i - k + ka - M5 - 1) * strideWork] = DLARTG_OUT[0];
            WORK[offsetWork + (i - k + ka - M5 - 1) * strideWork] = DLARTG_OUT[1];
            ra = DLARTG_OUT[2];
            t = -BB[idx2(oB, sB1, sB2, kb1 - k - 1, i - 1)] * ra1;
            p = idx2(oA, sA1, sA2, 0, i - k + ka - 1);
            WORK[offsetWork + (i - k - 1) * strideWork] = WORK[offsetWork + (N + i - k + ka - M5 - 1) * strideWork] * t - WORK[offsetWork + (i - k + ka - M5 - 1) * strideWork] * AB[p];
            AB[p] = WORK[offsetWork + (i - k + ka - M5 - 1) * strideWork] * t + WORK[offsetWork + (N + i - k + ka - M5 - 1) * strideWork] * AB[p];
            ra1 = ra;
          }
        }
        j2 = i - k - 1 + Math.max(1, k - i0 + 2) * ka1;
        nr = Math.floor((N - j2 + ka) / ka1);
        j1 = j2 + (nr - 1) * ka1;
        if (update) {
          j2t = Math.max(j2, i + 2 * ka - k + 1);
        } else {
          j2t = j2;
        }
        nrt = Math.floor((N - j2t + ka) / ka1);
        for (j = j2t; j <= j1; j += ka1) {
          WORK[offsetWork + (j - M5 - 1) * strideWork] = WORK[offsetWork + (j - M5 - 1) * strideWork] * AB[idx2(oA, sA1, sA2, 0, j)];
          AB[idx2(oA, sA1, sA2, 0, j)] = WORK[offsetWork + (N + j - M5 - 1) * strideWork] * AB[idx2(oA, sA1, sA2, 0, j)];
        }
        if (nrt > 0) {
          base_default7(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, 0, j2t), WORK, ka1 * strideWork, offsetWork + (j2t - M5 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (N + j2t - M5 - 1) * strideWork);
        }
        if (nr > 0) {
          for (l = 1; l <= ka - 1; l++) {
            base_default9(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l - 1, j2 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka - l - 1, j2), WORK, ka1 * strideWork, offsetWork + (N + j2 - M5 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - M5 - 1) * strideWork);
          }
          base_default6(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - 1, j2 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - 1, j2), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka - 1, j2), WORK, ka1 * strideWork, offsetWork + (N + j2 - M5 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - M5 - 1) * strideWork);
        }
        for (l = ka - 1; l >= kb - k + 1; l--) {
          nrt = Math.floor((N - j2 + l) / ka1);
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, l - 1, j2 + ka1 - l - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, l, j2 + ka1 - l - 1), WORK, ka1 * strideWork, offsetWork + (N + j2 - M5 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - M5 - 1) * strideWork);
          }
        }
        if (wantx) {
          for (j = j2; j <= j1; j += ka1) {
            base_default5(N - M5, X, strideX1, offsetX + M5 * strideX1 + (j - 1) * strideX2, X, strideX1, offsetX + M5 * strideX1 + j * strideX2, WORK[offsetWork + (N + j - M5 - 1) * strideWork], WORK[offsetWork + (j - M5 - 1) * strideWork]);
          }
        }
      }
      if (update) {
        if (i2 <= N && kbt > 0) {
          WORK[offsetWork + (i - kbt - 1) * strideWork] = -BB[idx2(oB, sB1, sB2, kb1 - kbt - 1, i - 1)] * ra1;
        }
      }
      for (k = kb; k >= 1; k--) {
        if (update) {
          j2 = i - k - 1 + Math.max(2, k - i0 + 1) * ka1;
        } else {
          j2 = i - k - 1 + Math.max(1, k - i0 + 1) * ka1;
        }
        for (l = kb - k; l >= 1; l--) {
          nrt = Math.floor((N - j2 + ka + l) / ka1);
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, l - 1, j2 - l), AB, sA2 * ka1, idx2(oA, sA1, sA2, l, j2 - l), WORK, ka1 * strideWork, offsetWork + (N + j2 - ka - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - ka - 1) * strideWork);
          }
        }
        nr = Math.floor((N - j2 + ka) / ka1);
        j1 = j2 + (nr - 1) * ka1;
        for (j = j1; j >= j2; j -= ka1) {
          WORK[offsetWork + (j - 1) * strideWork] = WORK[offsetWork + (j - ka - 1) * strideWork];
          WORK[offsetWork + (N + j - 1) * strideWork] = WORK[offsetWork + (N + j - ka - 1) * strideWork];
        }
        for (j = j2; j <= j1; j += ka1) {
          WORK[offsetWork + (j - 1) * strideWork] = WORK[offsetWork + (j - 1) * strideWork] * AB[idx2(oA, sA1, sA2, 0, j)];
          AB[idx2(oA, sA1, sA2, 0, j)] = WORK[offsetWork + (N + j - 1) * strideWork] * AB[idx2(oA, sA1, sA2, 0, j)];
        }
        if (update) {
          if (i - k < N - ka && k <= kbt) {
            WORK[offsetWork + (i - k + ka - 1) * strideWork] = WORK[offsetWork + (i - k - 1) * strideWork];
          }
        }
      }
      for (k = kb; k >= 1; k--) {
        j2 = i - k - 1 + Math.max(1, k - i0 + 1) * ka1;
        nr = Math.floor((N - j2 + ka) / ka1);
        j1 = j2 + (nr - 1) * ka1;
        if (nr > 0) {
          base_default7(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, 0, j2 - 1), WORK, ka1 * strideWork, offsetWork + (j2 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (N + j2 - 1) * strideWork);
          for (l = 1; l <= ka - 1; l++) {
            base_default9(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l - 1, j2 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka - l - 1, j2), WORK, ka1 * strideWork, offsetWork + (N + j2 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - 1) * strideWork);
          }
          base_default6(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - 1, j2 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - 1, j2), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka - 1, j2), WORK, ka1 * strideWork, offsetWork + (N + j2 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - 1) * strideWork);
        }
        for (l = ka - 1; l >= kb - k + 1; l--) {
          nrt = Math.floor((N - j2 + l) / ka1);
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, l - 1, j2 + ka1 - l - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, l, j2 + ka1 - l - 1), WORK, ka1 * strideWork, offsetWork + (N + j2 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - 1) * strideWork);
          }
        }
        if (wantx) {
          for (j = j2; j <= j1; j += ka1) {
            base_default5(N - M5, X, strideX1, offsetX + M5 * strideX1 + (j - 1) * strideX2, X, strideX1, offsetX + M5 * strideX1 + j * strideX2, WORK[offsetWork + (N + j - 1) * strideWork], WORK[offsetWork + (j - 1) * strideWork]);
          }
        }
      }
      for (k = 1; k <= kb - 1; k++) {
        j2 = i - k - 1 + Math.max(1, k - i0 + 2) * ka1;
        for (l = kb - k; l >= 1; l--) {
          nrt = Math.floor((N - j2 + l) / ka1);
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, l - 1, j2 + ka1 - l - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, l, j2 + ka1 - l - 1), WORK, ka1 * strideWork, offsetWork + (N + j2 - M5 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - M5 - 1) * strideWork);
          }
        }
      }
      if (kb > 1) {
        for (j = N - 1; j >= i - kb + 2 * ka + 1; j--) {
          WORK[offsetWork + (N + j - M5 - 1) * strideWork] = WORK[offsetWork + (N + j - ka - M5 - 1) * strideWork];
          WORK[offsetWork + (j - M5 - 1) * strideWork] = WORK[offsetWork + (j - ka - M5 - 1) * strideWork];
        }
      }
    } else {
      if (update) {
        bii = BB[idx2(oB, sB1, sB2, 0, i - 1)];
        for (j = i; j <= i1; j++) {
          p = idx2(oA, sA1, sA2, j - i, i - 1);
          AB[p] = AB[p] / bii;
        }
        for (j = Math.max(1, i - ka); j <= i; j++) {
          p = idx2(oA, sA1, sA2, i - j, j - 1);
          AB[p] = AB[p] / bii;
        }
        for (k = i - kbt; k <= i - 1; k++) {
          for (j = i - kbt; j <= k; j++) {
            p = idx2(oA, sA1, sA2, k - j, j - 1);
            AB[p] = AB[p] - BB[idx2(oB, sB1, sB2, i - j, j - 1)] * AB[idx2(oA, sA1, sA2, i - k, k - 1)] - BB[idx2(oB, sB1, sB2, i - k, k - 1)] * AB[idx2(oA, sA1, sA2, i - j, j - 1)] + AB[idx2(oA, sA1, sA2, 0, i - 1)] * BB[idx2(oB, sB1, sB2, i - j, j - 1)] * BB[idx2(oB, sB1, sB2, i - k, k - 1)];
          }
          for (j = Math.max(1, i - ka); j <= i - kbt - 1; j++) {
            p = idx2(oA, sA1, sA2, k - j, j - 1);
            AB[p] = AB[p] - BB[idx2(oB, sB1, sB2, i - k, k - 1)] * AB[idx2(oA, sA1, sA2, i - j, j - 1)];
          }
        }
        for (j = i; j <= i1; j++) {
          for (k = Math.max(j - ka, i - kbt); k <= i - 1; k++) {
            p = idx2(oA, sA1, sA2, j - k, k - 1);
            AB[p] = AB[p] - BB[idx2(oB, sB1, sB2, i - k, k - 1)] * AB[idx2(oA, sA1, sA2, j - i, i - 1)];
          }
        }
        if (wantx) {
          base_default(N - M5, 1 / bii, X, strideX1, offsetX + M5 * strideX1 + (i - 1) * strideX2);
          if (kbt > 0) {
            base_default4(N - M5, kbt, -1, X, strideX1, offsetX + M5 * strideX1 + (i - 1) * strideX2, BB, strideBB2 - strideBB1, offsetBB + kbt * strideBB1 + (i - kbt - 1) * strideBB2, X, strideX1, strideX2, offsetX + M5 * strideX1 + (i - kbt - 1) * strideX2);
          }
        }
        ra1 = AB[idx2(oA, sA1, sA2, i1 - i, i - 1)];
      }
      for (k = 1; k <= kb - 1; k++) {
        if (update) {
          if (i - k + ka < N && i - k > 1) {
            base_default8(AB[idx2(oA, sA1, sA2, ka1 - k - 1, i - 1)], ra1, DLARTG_OUT);
            WORK[offsetWork + (N + i - k + ka - M5 - 1) * strideWork] = DLARTG_OUT[0];
            WORK[offsetWork + (i - k + ka - M5 - 1) * strideWork] = DLARTG_OUT[1];
            ra = DLARTG_OUT[2];
            t = -BB[idx2(oB, sB1, sB2, k, i - k - 1)] * ra1;
            p = idx2(oA, sA1, sA2, ka1 - 1, i - k - 1);
            WORK[offsetWork + (i - k - 1) * strideWork] = WORK[offsetWork + (N + i - k + ka - M5 - 1) * strideWork] * t - WORK[offsetWork + (i - k + ka - M5 - 1) * strideWork] * AB[p];
            AB[p] = WORK[offsetWork + (i - k + ka - M5 - 1) * strideWork] * t + WORK[offsetWork + (N + i - k + ka - M5 - 1) * strideWork] * AB[p];
            ra1 = ra;
          }
        }
        j2 = i - k - 1 + Math.max(1, k - i0 + 2) * ka1;
        nr = Math.floor((N - j2 + ka) / ka1);
        j1 = j2 + (nr - 1) * ka1;
        if (update) {
          j2t = Math.max(j2, i + 2 * ka - k + 1);
        } else {
          j2t = j2;
        }
        nrt = Math.floor((N - j2t + ka) / ka1);
        for (j = j2t; j <= j1; j += ka1) {
          WORK[offsetWork + (j - M5 - 1) * strideWork] = WORK[offsetWork + (j - M5 - 1) * strideWork] * AB[idx2(oA, sA1, sA2, ka1 - 1, j - ka)];
          AB[idx2(oA, sA1, sA2, ka1 - 1, j - ka)] = WORK[offsetWork + (N + j - M5 - 1) * strideWork] * AB[idx2(oA, sA1, sA2, ka1 - 1, j - ka)];
        }
        if (nrt > 0) {
          base_default7(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - 1, j2t - ka - 1), WORK, ka1 * strideWork, offsetWork + (j2t - M5 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (N + j2t - M5 - 1) * strideWork);
        }
        if (nr > 0) {
          for (l = 1; l <= ka - 1; l++) {
            base_default9(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, l, j2 - l - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, l + 1, j2 - l - 1), WORK, ka1 * strideWork, offsetWork + (N + j2 - M5 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - M5 - 1) * strideWork);
          }
          base_default6(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, 0, j2 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, 0, j2), AB, sA2 * ka1, idx2(oA, sA1, sA2, 1, j2 - 1), WORK, ka1 * strideWork, offsetWork + (N + j2 - M5 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - M5 - 1) * strideWork);
        }
        for (l = ka - 1; l >= kb - k + 1; l--) {
          nrt = Math.floor((N - j2 + l) / ka1);
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l, j2 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l - 1, j2), WORK, ka1 * strideWork, offsetWork + (N + j2 - M5 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - M5 - 1) * strideWork);
          }
        }
        if (wantx) {
          for (j = j2; j <= j1; j += ka1) {
            base_default5(N - M5, X, strideX1, offsetX + M5 * strideX1 + (j - 1) * strideX2, X, strideX1, offsetX + M5 * strideX1 + j * strideX2, WORK[offsetWork + (N + j - M5 - 1) * strideWork], WORK[offsetWork + (j - M5 - 1) * strideWork]);
          }
        }
      }
      if (update) {
        if (i2 <= N && kbt > 0) {
          WORK[offsetWork + (i - kbt - 1) * strideWork] = -BB[idx2(oB, sB1, sB2, kbt, i - kbt - 1)] * ra1;
        }
      }
      for (k = kb; k >= 1; k--) {
        if (update) {
          j2 = i - k - 1 + Math.max(2, k - i0 + 1) * ka1;
        } else {
          j2 = i - k - 1 + Math.max(1, k - i0 + 1) * ka1;
        }
        for (l = kb - k; l >= 1; l--) {
          nrt = Math.floor((N - j2 + ka + l) / ka1);
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l, j2 - ka - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l - 1, j2 - ka), WORK, ka1 * strideWork, offsetWork + (N + j2 - ka - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - ka - 1) * strideWork);
          }
        }
        nr = Math.floor((N - j2 + ka) / ka1);
        j1 = j2 + (nr - 1) * ka1;
        for (j = j1; j >= j2; j -= ka1) {
          WORK[offsetWork + (j - 1) * strideWork] = WORK[offsetWork + (j - ka - 1) * strideWork];
          WORK[offsetWork + (N + j - 1) * strideWork] = WORK[offsetWork + (N + j - ka - 1) * strideWork];
        }
        for (j = j2; j <= j1; j += ka1) {
          WORK[offsetWork + (j - 1) * strideWork] = WORK[offsetWork + (j - 1) * strideWork] * AB[idx2(oA, sA1, sA2, ka1 - 1, j - ka)];
          AB[idx2(oA, sA1, sA2, ka1 - 1, j - ka)] = WORK[offsetWork + (N + j - 1) * strideWork] * AB[idx2(oA, sA1, sA2, ka1 - 1, j - ka)];
        }
        if (update) {
          if (i - k < N - ka && k <= kbt) {
            WORK[offsetWork + (i - k + ka - 1) * strideWork] = WORK[offsetWork + (i - k - 1) * strideWork];
          }
        }
      }
      for (k = kb; k >= 1; k--) {
        j2 = i - k - 1 + Math.max(1, k - i0 + 1) * ka1;
        nr = Math.floor((N - j2 + ka) / ka1);
        j1 = j2 + (nr - 1) * ka1;
        if (nr > 0) {
          base_default7(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - 1, j2 - ka - 1), WORK, ka1 * strideWork, offsetWork + (j2 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (N + j2 - 1) * strideWork);
          for (l = 1; l <= ka - 1; l++) {
            base_default9(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, l, j2 - l - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, l + 1, j2 - l - 1), WORK, ka1 * strideWork, offsetWork + (N + j2 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - 1) * strideWork);
          }
          base_default6(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, 0, j2 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, 0, j2), AB, sA2 * ka1, idx2(oA, sA1, sA2, 1, j2 - 1), WORK, ka1 * strideWork, offsetWork + (N + j2 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - 1) * strideWork);
        }
        for (l = ka - 1; l >= kb - k + 1; l--) {
          nrt = Math.floor((N - j2 + l) / ka1);
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l, j2 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l - 1, j2), WORK, ka1 * strideWork, offsetWork + (N + j2 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - 1) * strideWork);
          }
        }
        if (wantx) {
          for (j = j2; j <= j1; j += ka1) {
            base_default5(N - M5, X, strideX1, offsetX + M5 * strideX1 + (j - 1) * strideX2, X, strideX1, offsetX + M5 * strideX1 + j * strideX2, WORK[offsetWork + (N + j - 1) * strideWork], WORK[offsetWork + (j - 1) * strideWork]);
          }
        }
      }
      for (k = 1; k <= kb - 1; k++) {
        j2 = i - k - 1 + Math.max(1, k - i0 + 2) * ka1;
        for (l = kb - k; l >= 1; l--) {
          nrt = Math.floor((N - j2 + l) / ka1);
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l, j2 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l - 1, j2), WORK, ka1 * strideWork, offsetWork + (N + j2 - M5 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j2 - M5 - 1) * strideWork);
          }
        }
      }
      if (kb > 1) {
        for (j = N - 1; j >= i - kb + 2 * ka + 1; j--) {
          WORK[offsetWork + (N + j - M5 - 1) * strideWork] = WORK[offsetWork + (N + j - ka - M5 - 1) * strideWork];
          WORK[offsetWork + (j - M5 - 1) * strideWork] = WORK[offsetWork + (j - ka - M5 - 1) * strideWork];
        }
      }
    }
  }
  update = true;
  i = 0;
  while (true) {
    if (update) {
      i += 1;
      kbt = Math.min(kb, M5 - i);
      i0 = i + 1;
      i1 = Math.max(1, i - ka);
      i2 = i + kbt - ka1;
      if (i > M5) {
        update = false;
        i -= 1;
        i0 = M5 + 1;
        if (ka === 0) {
          return 0;
        }
        continue;
      }
    } else {
      i -= ka;
      if (i < 2) {
        return 0;
      }
    }
    if (i < M5 - kbt) {
      nx = M5;
    } else {
      nx = N;
    }
    if (upper) {
      if (update) {
        bii = BB[idx2(oB, sB1, sB2, kb1 - 1, i - 1)];
        for (j = i1; j <= i; j++) {
          p = idx2(oA, sA1, sA2, j - i + ka1 - 1, i - 1);
          AB[p] = AB[p] / bii;
        }
        for (j = i; j <= Math.min(N, i + ka); j++) {
          p = idx2(oA, sA1, sA2, i - j + ka1 - 1, j - 1);
          AB[p] = AB[p] / bii;
        }
        for (k = i + 1; k <= i + kbt; k++) {
          for (j = k; j <= i + kbt; j++) {
            p = idx2(oA, sA1, sA2, k - j + ka1 - 1, j - 1);
            AB[p] = AB[p] - BB[idx2(oB, sB1, sB2, i - j + kb1 - 1, j - 1)] * AB[idx2(oA, sA1, sA2, i - k + ka1 - 1, k - 1)] - BB[idx2(oB, sB1, sB2, i - k + kb1 - 1, k - 1)] * AB[idx2(oA, sA1, sA2, i - j + ka1 - 1, j - 1)] + AB[idx2(oA, sA1, sA2, ka1 - 1, i - 1)] * BB[idx2(oB, sB1, sB2, i - j + kb1 - 1, j - 1)] * BB[idx2(oB, sB1, sB2, i - k + kb1 - 1, k - 1)];
          }
          for (j = i + kbt + 1; j <= Math.min(N, i + ka); j++) {
            p = idx2(oA, sA1, sA2, k - j + ka1 - 1, j - 1);
            AB[p] = AB[p] - BB[idx2(oB, sB1, sB2, i - k + kb1 - 1, k - 1)] * AB[idx2(oA, sA1, sA2, i - j + ka1 - 1, j - 1)];
          }
        }
        for (j = i1; j <= i; j++) {
          for (k = i + 1; k <= Math.min(j + ka, i + kbt); k++) {
            p = idx2(oA, sA1, sA2, j - k + ka1 - 1, k - 1);
            AB[p] = AB[p] - BB[idx2(oB, sB1, sB2, i - k + kb1 - 1, k - 1)] * AB[idx2(oA, sA1, sA2, j - i + ka1 - 1, i - 1)];
          }
        }
        if (wantx) {
          base_default(nx, 1 / bii, X, strideX1, offsetX + (i - 1) * strideX2);
          if (kbt > 0) {
            base_default4(nx, kbt, -1, X, strideX1, offsetX + (i - 1) * strideX2, BB, strideBB2 - strideBB1, offsetBB + (kb - 1) * strideBB1 + i * strideBB2, X, strideX1, strideX2, offsetX + i * strideX2);
          }
        }
        ra1 = AB[idx2(oA, sA1, sA2, i1 - i + ka1 - 1, i - 1)];
      }
      for (k = 1; k <= kb - 1; k++) {
        if (update) {
          if (i + k - ka1 > 0 && i + k < M5) {
            base_default8(AB[idx2(oA, sA1, sA2, k, i - 1)], ra1, DLARTG_OUT);
            WORK[offsetWork + (N + i + k - ka - 1) * strideWork] = DLARTG_OUT[0];
            WORK[offsetWork + (i + k - ka - 1) * strideWork] = DLARTG_OUT[1];
            ra = DLARTG_OUT[2];
            t = -BB[idx2(oB, sB1, sB2, kb1 - k - 1, i + k - 1)] * ra1;
            p = idx2(oA, sA1, sA2, 0, i + k - 1);
            WORK[offsetWork + (M5 - kb + i + k - 1) * strideWork] = WORK[offsetWork + (N + i + k - ka - 1) * strideWork] * t - WORK[offsetWork + (i + k - ka - 1) * strideWork] * AB[p];
            AB[p] = WORK[offsetWork + (i + k - ka - 1) * strideWork] * t + WORK[offsetWork + (N + i + k - ka - 1) * strideWork] * AB[p];
            ra1 = ra;
          }
        }
        j2 = i + k + 1 - Math.max(1, k + i0 - M5 + 1) * ka1;
        nr = Math.floor((j2 + ka - 1) / ka1);
        j1 = j2 - (nr - 1) * ka1;
        if (update) {
          j2t = Math.min(j2, i - 2 * ka + k - 1);
        } else {
          j2t = j2;
        }
        nrt = Math.floor((j2t + ka - 1) / ka1);
        for (j = j1; j <= j2t; j += ka1) {
          WORK[offsetWork + (j - 1) * strideWork] = WORK[offsetWork + (j - 1) * strideWork] * AB[idx2(oA, sA1, sA2, 0, j + ka - 2)];
          AB[idx2(oA, sA1, sA2, 0, j + ka - 2)] = WORK[offsetWork + (N + j - 1) * strideWork] * AB[idx2(oA, sA1, sA2, 0, j + ka - 2)];
        }
        if (nrt > 0) {
          base_default7(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, 0, j1 + ka - 1), WORK, ka1 * strideWork, offsetWork + (j1 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (N + j1 - 1) * strideWork);
        }
        if (nr > 0) {
          for (l = 1; l <= ka - 1; l++) {
            base_default9(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l - 1, j1 + l - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka - l - 1, j1 + l - 1), WORK, ka1 * strideWork, offsetWork + (N + j1 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j1 - 1) * strideWork);
          }
          base_default6(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - 1, j1 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - 1, j1 - 2), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka - 1, j1 - 1), WORK, ka1 * strideWork, offsetWork + (N + j1 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j1 - 1) * strideWork);
        }
        for (l = ka - 1; l >= kb - k + 1; l--) {
          nrt = Math.floor((j2 + l - 1) / ka1);
          j1t = j2 - (nrt - 1) * ka1;
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, l - 1, j1t - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, l, j1t - 2), WORK, ka1 * strideWork, offsetWork + (N + j1t - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j1t - 1) * strideWork);
          }
        }
        if (wantx) {
          for (j = j1; j <= j2; j += ka1) {
            base_default5(nx, X, strideX1, offsetX + (j - 1) * strideX2, X, strideX1, offsetX + (j - 2) * strideX2, WORK[offsetWork + (N + j - 1) * strideWork], WORK[offsetWork + (j - 1) * strideWork]);
          }
        }
      }
      if (update) {
        if (i2 > 0 && kbt > 0) {
          WORK[offsetWork + (M5 - kb + i + kbt - 1) * strideWork] = -BB[idx2(oB, sB1, sB2, kb1 - kbt - 1, i + kbt - 1)] * ra1;
        }
      }
      for (k = kb; k >= 1; k--) {
        if (update) {
          j2 = i + k + 1 - Math.max(2, k + i0 - M5) * ka1;
        } else {
          j2 = i + k + 1 - Math.max(1, k + i0 - M5) * ka1;
        }
        for (l = kb - k; l >= 1; l--) {
          nrt = Math.floor((j2 + ka + l - 1) / ka1);
          j1t = j2 - (nrt - 1) * ka1;
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, l - 1, j1t + ka - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, l, j1t + ka - 2), WORK, ka1 * strideWork, offsetWork + (N + M5 - kb + j1t + ka - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (M5 - kb + j1t + ka - 1) * strideWork);
          }
        }
        nr = Math.floor((j2 + ka - 1) / ka1);
        j1 = j2 - (nr - 1) * ka1;
        for (j = j1; j <= j2; j += ka1) {
          WORK[offsetWork + (M5 - kb + j - 1) * strideWork] = WORK[offsetWork + (M5 - kb + j + ka - 1) * strideWork];
          WORK[offsetWork + (N + M5 - kb + j - 1) * strideWork] = WORK[offsetWork + (N + M5 - kb + j + ka - 1) * strideWork];
        }
        for (j = j1; j <= j2; j += ka1) {
          WORK[offsetWork + (M5 - kb + j - 1) * strideWork] = WORK[offsetWork + (M5 - kb + j - 1) * strideWork] * AB[idx2(oA, sA1, sA2, 0, j + ka - 2)];
          AB[idx2(oA, sA1, sA2, 0, j + ka - 2)] = WORK[offsetWork + (N + M5 - kb + j - 1) * strideWork] * AB[idx2(oA, sA1, sA2, 0, j + ka - 2)];
        }
        if (update) {
          if (i + k > ka1 && k <= kbt) {
            WORK[offsetWork + (M5 - kb + i + k - ka - 1) * strideWork] = WORK[offsetWork + (M5 - kb + i + k - 1) * strideWork];
          }
        }
      }
      for (k = kb; k >= 1; k--) {
        j2 = i + k + 1 - Math.max(1, k + i0 - M5) * ka1;
        nr = Math.floor((j2 + ka - 1) / ka1);
        j1 = j2 - (nr - 1) * ka1;
        if (nr > 0) {
          base_default7(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, 0, j1 + ka - 1), WORK, ka1 * strideWork, offsetWork + (M5 - kb + j1 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (N + M5 - kb + j1 - 1) * strideWork);
          for (l = 1; l <= ka - 1; l++) {
            base_default9(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l - 1, j1 + l - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka - l - 1, j1 + l - 1), WORK, ka1 * strideWork, offsetWork + (N + M5 - kb + j1 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (M5 - kb + j1 - 1) * strideWork);
          }
          base_default6(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - 1, j1 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - 1, j1 - 2), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka - 1, j1 - 1), WORK, ka1 * strideWork, offsetWork + (N + M5 - kb + j1 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (M5 - kb + j1 - 1) * strideWork);
        }
        for (l = ka - 1; l >= kb - k + 1; l--) {
          nrt = Math.floor((j2 + l - 1) / ka1);
          j1t = j2 - (nrt - 1) * ka1;
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, l - 1, j1t - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, l, j1t - 2), WORK, ka1 * strideWork, offsetWork + (N + M5 - kb + j1t - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (M5 - kb + j1t - 1) * strideWork);
          }
        }
        if (wantx) {
          for (j = j1; j <= j2; j += ka1) {
            base_default5(nx, X, strideX1, offsetX + (j - 1) * strideX2, X, strideX1, offsetX + (j - 2) * strideX2, WORK[offsetWork + (N + M5 - kb + j - 1) * strideWork], WORK[offsetWork + (M5 - kb + j - 1) * strideWork]);
          }
        }
      }
      for (k = 1; k <= kb - 1; k++) {
        j2 = i + k + 1 - Math.max(1, k + i0 - M5 + 1) * ka1;
        for (l = kb - k; l >= 1; l--) {
          nrt = Math.floor((j2 + l - 1) / ka1);
          j1t = j2 - (nrt - 1) * ka1;
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, l - 1, j1t - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, l, j1t - 2), WORK, ka1 * strideWork, offsetWork + (N + j1t - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j1t - 1) * strideWork);
          }
        }
      }
      if (kb > 1) {
        for (j = 2; j <= Math.min(i + kb, M5) - 2 * ka - 1; j++) {
          WORK[offsetWork + (N + j - 1) * strideWork] = WORK[offsetWork + (N + j + ka - 1) * strideWork];
          WORK[offsetWork + (j - 1) * strideWork] = WORK[offsetWork + (j + ka - 1) * strideWork];
        }
      }
    } else {
      if (update) {
        bii = BB[idx2(oB, sB1, sB2, 0, i - 1)];
        for (j = i1; j <= i; j++) {
          p = idx2(oA, sA1, sA2, i - j, j - 1);
          AB[p] = AB[p] / bii;
        }
        for (j = i; j <= Math.min(N, i + ka); j++) {
          p = idx2(oA, sA1, sA2, j - i, i - 1);
          AB[p] = AB[p] / bii;
        }
        for (k = i + 1; k <= i + kbt; k++) {
          for (j = k; j <= i + kbt; j++) {
            p = idx2(oA, sA1, sA2, j - k, k - 1);
            AB[p] = AB[p] - BB[idx2(oB, sB1, sB2, j - i, i - 1)] * AB[idx2(oA, sA1, sA2, k - i, i - 1)] - BB[idx2(oB, sB1, sB2, k - i, i - 1)] * AB[idx2(oA, sA1, sA2, j - i, i - 1)] + AB[idx2(oA, sA1, sA2, 0, i - 1)] * BB[idx2(oB, sB1, sB2, j - i, i - 1)] * BB[idx2(oB, sB1, sB2, k - i, i - 1)];
          }
          for (j = i + kbt + 1; j <= Math.min(N, i + ka); j++) {
            p = idx2(oA, sA1, sA2, j - k, k - 1);
            AB[p] = AB[p] - BB[idx2(oB, sB1, sB2, k - i, i - 1)] * AB[idx2(oA, sA1, sA2, j - i, i - 1)];
          }
        }
        for (j = i1; j <= i; j++) {
          for (k = i + 1; k <= Math.min(j + ka, i + kbt); k++) {
            p = idx2(oA, sA1, sA2, k - j, j - 1);
            AB[p] = AB[p] - BB[idx2(oB, sB1, sB2, k - i, i - 1)] * AB[idx2(oA, sA1, sA2, i - j, j - 1)];
          }
        }
        if (wantx) {
          base_default(nx, 1 / bii, X, strideX1, offsetX + (i - 1) * strideX2);
          if (kbt > 0) {
            base_default4(nx, kbt, -1, X, strideX1, offsetX + (i - 1) * strideX2, BB, strideBB1, offsetBB + 1 * strideBB1 + (i - 1) * strideBB2, X, strideX1, strideX2, offsetX + i * strideX2);
          }
        }
        ra1 = AB[idx2(oA, sA1, sA2, i - i1, i1 - 1)];
      }
      for (k = 1; k <= kb - 1; k++) {
        if (update) {
          if (i + k - ka1 > 0 && i + k < M5) {
            base_default8(AB[idx2(oA, sA1, sA2, ka1 - k - 1, i + k - ka - 1)], ra1, DLARTG_OUT);
            WORK[offsetWork + (N + i + k - ka - 1) * strideWork] = DLARTG_OUT[0];
            WORK[offsetWork + (i + k - ka - 1) * strideWork] = DLARTG_OUT[1];
            ra = DLARTG_OUT[2];
            t = -BB[idx2(oB, sB1, sB2, k, i - 1)] * ra1;
            p = idx2(oA, sA1, sA2, ka1 - 1, i + k - ka - 1);
            WORK[offsetWork + (M5 - kb + i + k - 1) * strideWork] = WORK[offsetWork + (N + i + k - ka - 1) * strideWork] * t - WORK[offsetWork + (i + k - ka - 1) * strideWork] * AB[p];
            AB[p] = WORK[offsetWork + (i + k - ka - 1) * strideWork] * t + WORK[offsetWork + (N + i + k - ka - 1) * strideWork] * AB[p];
            ra1 = ra;
          }
        }
        j2 = i + k + 1 - Math.max(1, k + i0 - M5 + 1) * ka1;
        nr = Math.floor((j2 + ka - 1) / ka1);
        j1 = j2 - (nr - 1) * ka1;
        if (update) {
          j2t = Math.min(j2, i - 2 * ka + k - 1);
        } else {
          j2t = j2;
        }
        nrt = Math.floor((j2t + ka - 1) / ka1);
        for (j = j1; j <= j2t; j += ka1) {
          WORK[offsetWork + (j - 1) * strideWork] = WORK[offsetWork + (j - 1) * strideWork] * AB[idx2(oA, sA1, sA2, ka1 - 1, j - 2)];
          AB[idx2(oA, sA1, sA2, ka1 - 1, j - 2)] = WORK[offsetWork + (N + j - 1) * strideWork] * AB[idx2(oA, sA1, sA2, ka1 - 1, j - 2)];
        }
        if (nrt > 0) {
          base_default7(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - 1, j1 - 1), WORK, ka1 * strideWork, offsetWork + (j1 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (N + j1 - 1) * strideWork);
        }
        if (nr > 0) {
          for (l = 1; l <= ka - 1; l++) {
            base_default9(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, l, j1 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, l + 1, j1 - 2), WORK, ka1 * strideWork, offsetWork + (N + j1 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j1 - 1) * strideWork);
          }
          base_default6(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, 0, j1 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, 0, j1 - 2), AB, sA2 * ka1, idx2(oA, sA1, sA2, 1, j1 - 2), WORK, ka1 * strideWork, offsetWork + (N + j1 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j1 - 1) * strideWork);
        }
        for (l = ka - 1; l >= kb - k + 1; l--) {
          nrt = Math.floor((j2 + l - 1) / ka1);
          j1t = j2 - (nrt - 1) * ka1;
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l, j1t - ka1 + l - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l - 1, j1t - ka1 + l - 1), WORK, ka1 * strideWork, offsetWork + (N + j1t - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j1t - 1) * strideWork);
          }
        }
        if (wantx) {
          for (j = j1; j <= j2; j += ka1) {
            base_default5(nx, X, strideX1, offsetX + (j - 1) * strideX2, X, strideX1, offsetX + (j - 2) * strideX2, WORK[offsetWork + (N + j - 1) * strideWork], WORK[offsetWork + (j - 1) * strideWork]);
          }
        }
      }
      if (update) {
        if (i2 > 0 && kbt > 0) {
          WORK[offsetWork + (M5 - kb + i + kbt - 1) * strideWork] = -BB[idx2(oB, sB1, sB2, kbt, i - 1)] * ra1;
        }
      }
      for (k = kb; k >= 1; k--) {
        if (update) {
          j2 = i + k + 1 - Math.max(2, k + i0 - M5) * ka1;
        } else {
          j2 = i + k + 1 - Math.max(1, k + i0 - M5) * ka1;
        }
        for (l = kb - k; l >= 1; l--) {
          nrt = Math.floor((j2 + ka + l - 1) / ka1);
          j1t = j2 - (nrt - 1) * ka1;
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l, j1t + l - 2), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l - 1, j1t + l - 2), WORK, ka1 * strideWork, offsetWork + (N + M5 - kb + j1t + ka - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (M5 - kb + j1t + ka - 1) * strideWork);
          }
        }
        nr = Math.floor((j2 + ka - 1) / ka1);
        j1 = j2 - (nr - 1) * ka1;
        for (j = j1; j <= j2; j += ka1) {
          WORK[offsetWork + (M5 - kb + j - 1) * strideWork] = WORK[offsetWork + (M5 - kb + j + ka - 1) * strideWork];
          WORK[offsetWork + (N + M5 - kb + j - 1) * strideWork] = WORK[offsetWork + (N + M5 - kb + j + ka - 1) * strideWork];
        }
        for (j = j1; j <= j2; j += ka1) {
          WORK[offsetWork + (M5 - kb + j - 1) * strideWork] = WORK[offsetWork + (M5 - kb + j - 1) * strideWork] * AB[idx2(oA, sA1, sA2, ka1 - 1, j - 2)];
          AB[idx2(oA, sA1, sA2, ka1 - 1, j - 2)] = WORK[offsetWork + (N + M5 - kb + j - 1) * strideWork] * AB[idx2(oA, sA1, sA2, ka1 - 1, j - 2)];
        }
        if (update) {
          if (i + k > ka1 && k <= kbt) {
            WORK[offsetWork + (M5 - kb + i + k - ka - 1) * strideWork] = WORK[offsetWork + (M5 - kb + i + k - 1) * strideWork];
          }
        }
      }
      for (k = kb; k >= 1; k--) {
        j2 = i + k + 1 - Math.max(1, k + i0 - M5) * ka1;
        nr = Math.floor((j2 + ka - 1) / ka1);
        j1 = j2 - (nr - 1) * ka1;
        if (nr > 0) {
          base_default7(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - 1, j1 - 1), WORK, ka1 * strideWork, offsetWork + (M5 - kb + j1 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (N + M5 - kb + j1 - 1) * strideWork);
          for (l = 1; l <= ka - 1; l++) {
            base_default9(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, l, j1 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, l + 1, j1 - 2), WORK, ka1 * strideWork, offsetWork + (N + M5 - kb + j1 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (M5 - kb + j1 - 1) * strideWork);
          }
          base_default6(nr, AB, sA2 * ka1, idx2(oA, sA1, sA2, 0, j1 - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, 0, j1 - 2), AB, sA2 * ka1, idx2(oA, sA1, sA2, 1, j1 - 2), WORK, ka1 * strideWork, offsetWork + (N + M5 - kb + j1 - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (M5 - kb + j1 - 1) * strideWork);
        }
        for (l = ka - 1; l >= kb - k + 1; l--) {
          nrt = Math.floor((j2 + l - 1) / ka1);
          j1t = j2 - (nrt - 1) * ka1;
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l, j1t - ka1 + l - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l - 1, j1t - ka1 + l - 1), WORK, ka1 * strideWork, offsetWork + (N + M5 - kb + j1t - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (M5 - kb + j1t - 1) * strideWork);
          }
        }
        if (wantx) {
          for (j = j1; j <= j2; j += ka1) {
            base_default5(nx, X, strideX1, offsetX + (j - 1) * strideX2, X, strideX1, offsetX + (j - 2) * strideX2, WORK[offsetWork + (N + M5 - kb + j - 1) * strideWork], WORK[offsetWork + (M5 - kb + j - 1) * strideWork]);
          }
        }
      }
      for (k = 1; k <= kb - 1; k++) {
        j2 = i + k + 1 - Math.max(1, k + i0 - M5 + 1) * ka1;
        for (l = kb - k; l >= 1; l--) {
          nrt = Math.floor((j2 + l - 1) / ka1);
          j1t = j2 - (nrt - 1) * ka1;
          if (nrt > 0) {
            base_default9(nrt, AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l, j1t - ka1 + l - 1), AB, sA2 * ka1, idx2(oA, sA1, sA2, ka1 - l - 1, j1t - ka1 + l - 1), WORK, ka1 * strideWork, offsetWork + (N + j1t - 1) * strideWork, WORK, ka1 * strideWork, offsetWork + (j1t - 1) * strideWork);
          }
        }
      }
      if (kb > 1) {
        for (j = 2; j <= Math.min(i + kb, M5) - 2 * ka - 1; j++) {
          WORK[offsetWork + (N + j - 1) * strideWork] = WORK[offsetWork + (N + j + ka - 1) * strideWork];
          WORK[offsetWork + (j - 1) * strideWork] = WORK[offsetWork + (j + ka - 1) * strideWork];
        }
      }
    }
  }
}
var base_default11 = dsbgst;

// ../notes/lib/lapack/base/dsbtrd/lib/base.js
var import_lib6 = __toESM(require_lib23(), 1);
var rot = new import_lib6.default(3);
function dsbtrd(vect, uplo, N, kd, AB, strideAB1, strideAB2, offsetAB, d, strideD, offsetD, e, strideE, offsetE, Q, strideQ1, strideQ2, offsetQ, WORK, strideWork, offsetWork) {
  var iqaend;
  var j1end;
  var initq;
  var iqend;
  var wantq;
  var upper;
  var inca;
  var incx;
  var jend;
  var jinc;
  var last;
  var lend;
  var temp;
  var kdm1;
  var ibl;
  var iqb;
  var kd1;
  var kdn;
  var nrt;
  var nr;
  var nq;
  var i2;
  var j1;
  var j2;
  var i;
  var j;
  var k;
  var l;
  initq = vect === "initialize";
  wantq = initq || vect === "update";
  upper = uplo === "upper";
  kd1 = kd + 1;
  kdm1 = kd - 1;
  incx = strideAB2 - strideAB1;
  iqend = 1;
  if (N === 0) {
    return 0;
  }
  if (initq) {
    base_default10("full", N, N, 0, 1, Q, strideQ1, strideQ2, offsetQ);
  }
  inca = kd1 * strideAB2;
  kdn = Math.min(N - 1, kd);
  if (upper) {
    if (kd > 1) {
      nr = 0;
      j1 = kdn + 2;
      j2 = 1;
      for (i = 1; i <= N - 2; i++) {
        for (k = kdn + 1; k >= 2; k--) {
          j1 += kdn;
          j2 += kdn;
          if (nr > 0) {
            base_default7(nr, AB, inca, offsetAB + (j1 - 2) * strideAB2, WORK, kd1 * strideWork, offsetWork + (j1 - 1) * strideWork, d, kd1 * strideD, offsetD + (j1 - 1) * strideD);
            if (nr >= 2 * kd - 1) {
              for (l = 1; l <= kd - 1; l++) {
                base_default9(nr, AB, inca, offsetAB + l * strideAB1 + (j1 - 2) * strideAB2, AB, inca, offsetAB + (l - 1) * strideAB1 + (j1 - 1) * strideAB2, d, kd1 * strideD, offsetD + (j1 - 1) * strideD, WORK, kd1 * strideWork, offsetWork + (j1 - 1) * strideWork);
              }
            } else {
              jend = j1 + (nr - 1) * kd1;
              for (jinc = j1; jinc <= jend; jinc += kd1) {
                base_default5(kdm1, AB, strideAB1, offsetAB + strideAB1 + (jinc - 2) * strideAB2, AB, strideAB1, offsetAB + (jinc - 1) * strideAB2, d[offsetD + (jinc - 1) * strideD], WORK[offsetWork + (jinc - 1) * strideWork]);
              }
            }
          }
          if (k > 2) {
            if (k <= N - i + 1) {
              base_default8(AB[offsetAB + (kd - k + 2) * strideAB1 + (i + k - 3) * strideAB2], AB[offsetAB + (kd - k + 1) * strideAB1 + (i + k - 2) * strideAB2], rot);
              d[offsetD + (i + k - 2) * strideD] = rot[0];
              WORK[offsetWork + (i + k - 2) * strideWork] = rot[1];
              temp = rot[2];
              AB[offsetAB + (kd - k + 2) * strideAB1 + (i + k - 3) * strideAB2] = temp;
              base_default5(k - 3, AB, strideAB1, offsetAB + (kd - k + 3) * strideAB1 + (i + k - 3) * strideAB2, AB, strideAB1, offsetAB + (kd - k + 2) * strideAB1 + (i + k - 2) * strideAB2, d[offsetD + (i + k - 2) * strideD], WORK[offsetWork + (i + k - 2) * strideWork]);
            }
            nr += 1;
            j1 -= kdn + 1;
          }
          if (nr > 0) {
            base_default6(nr, AB, inca, offsetAB + kd * strideAB1 + (j1 - 2) * strideAB2, AB, inca, offsetAB + kd * strideAB1 + (j1 - 1) * strideAB2, AB, inca, offsetAB + (kd - 1) * strideAB1 + (j1 - 1) * strideAB2, d, kd1 * strideD, offsetD + (j1 - 1) * strideD, WORK, kd1 * strideWork, offsetWork + (j1 - 1) * strideWork);
          }
          if (nr > 0) {
            if (2 * kd - 1 < nr) {
              for (l = 1; l <= kd - 1; l++) {
                if (j2 + l > N) {
                  nrt = nr - 1;
                } else {
                  nrt = nr;
                }
                if (nrt > 0) {
                  base_default9(nrt, AB, inca, offsetAB + (kd - l - 1) * strideAB1 + (j1 + l - 1) * strideAB2, AB, inca, offsetAB + (kd - l) * strideAB1 + (j1 + l - 1) * strideAB2, d, kd1 * strideD, offsetD + (j1 - 1) * strideD, WORK, kd1 * strideWork, offsetWork + (j1 - 1) * strideWork);
                }
              }
            } else {
              j1end = j1 + kd1 * (nr - 2);
              if (j1end >= j1) {
                for (jinc = j1; jinc <= j1end; jinc += kd1) {
                  base_default5(kd - 1, AB, incx, offsetAB + (kd - 2) * strideAB1 + jinc * strideAB2, AB, incx, offsetAB + (kd - 1) * strideAB1 + jinc * strideAB2, d[offsetD + (jinc - 1) * strideD], WORK[offsetWork + (jinc - 1) * strideWork]);
                }
              }
              lend = Math.min(kdm1, N - j2);
              last = j1end + kd1;
              if (lend > 0) {
                base_default5(lend, AB, incx, offsetAB + (kd - 2) * strideAB1 + last * strideAB2, AB, incx, offsetAB + (kd - 1) * strideAB1 + last * strideAB2, d[offsetD + (last - 1) * strideD], WORK[offsetWork + (last - 1) * strideWork]);
              }
            }
          }
          if (wantq) {
            if (initq) {
              iqend = Math.max(iqend, j2);
              i2 = Math.max(0, k - 3);
              iqaend = 1 + i * kd;
              if (k === 2) {
                iqaend += kd;
              }
              iqaend = Math.min(iqaend, iqend);
              for (j = j1; j <= j2; j += kd1) {
                ibl = i - Math.floor(i2 / kdm1);
                i2 += 1;
                iqb = Math.max(1, j - ibl);
                nq = 1 + iqaend - iqb;
                iqaend = Math.min(iqaend + kd, iqend);
                base_default5(nq, Q, strideQ1, offsetQ + (iqb - 1) * strideQ1 + (j - 2) * strideQ2, Q, strideQ1, offsetQ + (iqb - 1) * strideQ1 + (j - 1) * strideQ2, d[offsetD + (j - 1) * strideD], WORK[offsetWork + (j - 1) * strideWork]);
              }
            } else {
              for (j = j1; j <= j2; j += kd1) {
                base_default5(N, Q, strideQ1, offsetQ + (j - 2) * strideQ2, Q, strideQ1, offsetQ + (j - 1) * strideQ2, d[offsetD + (j - 1) * strideD], WORK[offsetWork + (j - 1) * strideWork]);
              }
            }
          }
          if (j2 + kdn > N) {
            nr -= 1;
            j2 -= kdn + 1;
          }
          for (j = j1; j <= j2; j += kd1) {
            WORK[offsetWork + (j + kd - 1) * strideWork] = WORK[offsetWork + (j - 1) * strideWork] * AB[offsetAB + (j + kd - 1) * strideAB2];
            AB[offsetAB + (j + kd - 1) * strideAB2] = d[offsetD + (j - 1) * strideD] * AB[offsetAB + (j + kd - 1) * strideAB2];
          }
        }
      }
    }
    if (kd > 0) {
      for (i = 1; i <= N - 1; i++) {
        e[offsetE + (i - 1) * strideE] = AB[offsetAB + (kd - 1) * strideAB1 + i * strideAB2];
      }
    } else {
      for (i = 1; i <= N - 1; i++) {
        e[offsetE + (i - 1) * strideE] = 0;
      }
    }
    for (i = 1; i <= N; i++) {
      d[offsetD + (i - 1) * strideD] = AB[offsetAB + kd * strideAB1 + (i - 1) * strideAB2];
    }
  } else {
    if (kd > 1) {
      nr = 0;
      j1 = kdn + 2;
      j2 = 1;
      for (i = 1; i <= N - 2; i++) {
        for (k = kdn + 1; k >= 2; k--) {
          j1 += kdn;
          j2 += kdn;
          if (nr > 0) {
            base_default7(nr, AB, inca, offsetAB + kd * strideAB1 + (j1 - kd1 - 1) * strideAB2, WORK, kd1 * strideWork, offsetWork + (j1 - 1) * strideWork, d, kd1 * strideD, offsetD + (j1 - 1) * strideD);
            if (nr > 2 * kd - 1) {
              for (l = 1; l <= kd - 1; l++) {
                base_default9(nr, AB, inca, offsetAB + (kd - l) * strideAB1 + (j1 - kd1 + l - 1) * strideAB2, AB, inca, offsetAB + (kd - l + 1) * strideAB1 + (j1 - kd1 + l - 1) * strideAB2, d, kd1 * strideD, offsetD + (j1 - 1) * strideD, WORK, kd1 * strideWork, offsetWork + (j1 - 1) * strideWork);
              }
            } else {
              jend = j1 + kd1 * (nr - 1);
              for (jinc = j1; jinc <= jend; jinc += kd1) {
                base_default5(kdm1, AB, incx, offsetAB + (kd - 1) * strideAB1 + (jinc - kd - 1) * strideAB2, AB, incx, offsetAB + kd * strideAB1 + (jinc - kd - 1) * strideAB2, d[offsetD + (jinc - 1) * strideD], WORK[offsetWork + (jinc - 1) * strideWork]);
              }
            }
          }
          if (k > 2) {
            if (k <= N - i + 1) {
              base_default8(AB[offsetAB + (k - 2) * strideAB1 + (i - 1) * strideAB2], AB[offsetAB + (k - 1) * strideAB1 + (i - 1) * strideAB2], rot);
              d[offsetD + (i + k - 2) * strideD] = rot[0];
              WORK[offsetWork + (i + k - 2) * strideWork] = rot[1];
              temp = rot[2];
              AB[offsetAB + (k - 2) * strideAB1 + (i - 1) * strideAB2] = temp;
              base_default5(k - 3, AB, incx, offsetAB + (k - 3) * strideAB1 + i * strideAB2, AB, incx, offsetAB + (k - 2) * strideAB1 + i * strideAB2, d[offsetD + (i + k - 2) * strideD], WORK[offsetWork + (i + k - 2) * strideWork]);
            }
            nr += 1;
            j1 -= kdn + 1;
          }
          if (nr > 0) {
            base_default6(nr, AB, inca, offsetAB + (j1 - 2) * strideAB2, AB, inca, offsetAB + (j1 - 1) * strideAB2, AB, inca, offsetAB + strideAB1 + (j1 - 2) * strideAB2, d, kd1 * strideD, offsetD + (j1 - 1) * strideD, WORK, kd1 * strideWork, offsetWork + (j1 - 1) * strideWork);
          }
          if (nr > 0) {
            if (nr > 2 * kd - 1) {
              for (l = 1; l <= kd - 1; l++) {
                if (j2 + l > N) {
                  nrt = nr - 1;
                } else {
                  nrt = nr;
                }
                if (nrt > 0) {
                  base_default9(nrt, AB, inca, offsetAB + (l + 1) * strideAB1 + (j1 - 2) * strideAB2, AB, inca, offsetAB + l * strideAB1 + (j1 - 1) * strideAB2, d, kd1 * strideD, offsetD + (j1 - 1) * strideD, WORK, kd1 * strideWork, offsetWork + (j1 - 1) * strideWork);
                }
              }
            } else {
              j1end = j1 + kd1 * (nr - 2);
              if (j1end >= j1) {
                for (jinc = j1; jinc <= j1end; jinc += kd1) {
                  base_default5(kdm1, AB, strideAB1, offsetAB + 2 * strideAB1 + (jinc - 2) * strideAB2, AB, strideAB1, offsetAB + strideAB1 + (jinc - 1) * strideAB2, d[offsetD + (jinc - 1) * strideD], WORK[offsetWork + (jinc - 1) * strideWork]);
                }
              }
              lend = Math.min(kdm1, N - j2);
              last = j1end + kd1;
              if (lend > 0) {
                base_default5(lend, AB, strideAB1, offsetAB + 2 * strideAB1 + (last - 2) * strideAB2, AB, strideAB1, offsetAB + strideAB1 + (last - 1) * strideAB2, d[offsetD + (last - 1) * strideD], WORK[offsetWork + (last - 1) * strideWork]);
              }
            }
          }
          if (wantq) {
            if (initq) {
              iqend = Math.max(iqend, j2);
              i2 = Math.max(0, k - 3);
              iqaend = 1 + i * kd;
              if (k === 2) {
                iqaend += kd;
              }
              iqaend = Math.min(iqaend, iqend);
              for (j = j1; j <= j2; j += kd1) {
                ibl = i - Math.floor(i2 / kdm1);
                i2 += 1;
                iqb = Math.max(1, j - ibl);
                nq = 1 + iqaend - iqb;
                iqaend = Math.min(iqaend + kd, iqend);
                base_default5(nq, Q, strideQ1, offsetQ + (iqb - 1) * strideQ1 + (j - 2) * strideQ2, Q, strideQ1, offsetQ + (iqb - 1) * strideQ1 + (j - 1) * strideQ2, d[offsetD + (j - 1) * strideD], WORK[offsetWork + (j - 1) * strideWork]);
              }
            } else {
              for (j = j1; j <= j2; j += kd1) {
                base_default5(N, Q, strideQ1, offsetQ + (j - 2) * strideQ2, Q, strideQ1, offsetQ + (j - 1) * strideQ2, d[offsetD + (j - 1) * strideD], WORK[offsetWork + (j - 1) * strideWork]);
              }
            }
          }
          if (j2 + kdn > N) {
            nr -= 1;
            j2 -= kdn + 1;
          }
          for (j = j1; j <= j2; j += kd1) {
            WORK[offsetWork + (j + kd - 1) * strideWork] = WORK[offsetWork + (j - 1) * strideWork] * AB[offsetAB + kd * strideAB1 + (j - 1) * strideAB2];
            AB[offsetAB + kd * strideAB1 + (j - 1) * strideAB2] = d[offsetD + (j - 1) * strideD] * AB[offsetAB + kd * strideAB1 + (j - 1) * strideAB2];
          }
        }
      }
    }
    if (kd > 0) {
      for (i = 1; i <= N - 1; i++) {
        e[offsetE + (i - 1) * strideE] = AB[offsetAB + strideAB1 + (i - 1) * strideAB2];
      }
    } else {
      for (i = 1; i <= N - 1; i++) {
        e[offsetE + (i - 1) * strideE] = 0;
      }
    }
    for (i = 1; i <= N; i++) {
      d[offsetD + (i - 1) * strideD] = AB[offsetAB + (i - 1) * strideAB2];
    }
  }
  return 0;
}
var base_default12 = dsbtrd;

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
var base_default13 = dlamch;

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
var base_default14 = dlassq;

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
      out = base_default14(N - 1, e, strideE, offsetE, 0, 1);
      sum = 2 * out.sumsq;
    } else {
      sum = 1;
    }
    if (N > 1) {
      out = base_default14(N, d, strideD, offsetD, out.scl, sum);
    } else {
      out = base_default14(N, d, strideD, offsetD, 0, 1);
    }
    anorm = out.scl * Math.sqrt(out.sumsq);
  }
  return anorm;
}
var base_default15 = dlanst;

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
var base_default16 = dlapy2;

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
var base_default17 = dlae2;

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
  smlnum = base_default13("safe-minimum");
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
var base_default18 = dlascl;

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
var base_default19 = dlasrt;

// ../notes/lib/lapack/base/dsterf/lib/base.js
var MAXIT = 30;
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
  eps = base_default13("epsilon");
  eps2 = eps * eps;
  safmin = base_default13("safe-minimum");
  safmax = 1 / safmin;
  ssfmax = Math.sqrt(safmax) / 3;
  ssfmin = Math.sqrt(safmin) / eps2;
  nmaxit = N * MAXIT;
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
    anorm = base_default15("max", lend - l + 1, d, strideD, offsetD + l * strideD, e, strideE, offsetE + l * strideE);
    iscale = 0;
    if (anorm === 0) {
      continue;
    }
    if (anorm > ssfmax) {
      iscale = 1;
      base_default18("general", 0, 0, anorm, ssfmax, lend - l + 1, 1, d, 1, strideD, offsetD + l * strideD);
      base_default18("general", 0, 0, anorm, ssfmax, lend - l, 1, e, 1, strideE, offsetE + l * strideE);
    } else if (anorm < ssfmin) {
      iscale = 2;
      base_default18("general", 0, 0, anorm, ssfmin, lend - l + 1, 1, d, 1, strideD, offsetD + l * strideD);
      base_default18("general", 0, 0, anorm, ssfmin, lend - l, 1, e, 1, strideE, offsetE + l * strideE);
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
          rt = base_default17(d[offsetD + l * strideD], rte, d[offsetD + (l + 1) * strideD]);
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
        r = base_default16(sigma, 1);
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
          rt = base_default17(d[offsetD + l * strideD], rte, d[offsetD + (l - 1) * strideD]);
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
        r = base_default16(sigma, 1);
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
      base_default18("general", 0, 0, ssfmax, anorm, lendsv - lsv + 1, 1, d, 1, strideD, offsetD + lsv * strideD);
    }
    if (iscale === 2) {
      base_default18("general", 0, 0, ssfmin, anorm, lendsv - lsv + 1, 1, d, 1, strideD, offsetD + lsv * strideD);
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
  base_default19("increasing", N, d, strideD, offsetD);
  return info;
}
var base_default20 = dsterf;

// ../notes/lib/lapack/base/dsteqr/lib/base.js
var import_lib7 = __toESM(require_lib23(), 1);

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
var base_default21 = dlaev2;

// ../notes/lib/lapack/base/dlasr/lib/base.js
function dlasr(side, pivot, direct, M5, N, c, strideC, offsetC, s, strideS, offsetS, A, strideA1, strideA2, offsetA) {
  var ctemp;
  var stemp;
  var base1;
  var base2;
  var temp;
  var idx1;
  var idx22;
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
              idx22 = base2 + i * strideA2;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx22];
              A[idx22] = stemp * temp + ctemp * A[idx22];
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
              idx22 = base2 + i * strideA2;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx22];
              A[idx22] = stemp * temp + ctemp * A[idx22];
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
              idx22 = base2 + i * strideA2;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx22];
              A[idx22] = stemp * temp + ctemp * A[idx22];
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
              idx22 = base2 + i * strideA2;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx22];
              A[idx22] = stemp * temp + ctemp * A[idx22];
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
              idx22 = base2 + i * strideA2;
              temp = A[idx1];
              A[idx1] = stemp * A[idx22] + ctemp * temp;
              A[idx22] = ctemp * A[idx22] - stemp * temp;
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
              idx22 = base2 + i * strideA2;
              temp = A[idx1];
              A[idx1] = stemp * A[idx22] + ctemp * temp;
              A[idx22] = ctemp * A[idx22] - stemp * temp;
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
              idx22 = base2 + i * strideA1;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx22];
              A[idx22] = stemp * temp + ctemp * A[idx22];
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
              idx22 = base2 + i * strideA1;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx22];
              A[idx22] = stemp * temp + ctemp * A[idx22];
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
              idx22 = base2 + i * strideA1;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx22];
              A[idx22] = stemp * temp + ctemp * A[idx22];
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
              idx22 = base2 + i * strideA1;
              temp = A[idx1];
              A[idx1] = ctemp * temp - stemp * A[idx22];
              A[idx22] = stemp * temp + ctemp * A[idx22];
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
              idx22 = base2 + i * strideA1;
              temp = A[idx1];
              A[idx1] = stemp * A[idx22] + ctemp * temp;
              A[idx22] = ctemp * A[idx22] - stemp * temp;
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
              idx22 = base2 + i * strideA1;
              temp = A[idx1];
              A[idx1] = stemp * A[idx22] + ctemp * temp;
              A[idx22] = ctemp * A[idx22] - stemp * temp;
            }
          }
        }
      }
    }
  }
  return A;
}
var base_default22 = dlasr;

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
var base_default23 = dswap;

// ../notes/lib/lapack/base/dsteqr/lib/base.js
var MAXIT2 = 30;
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
  var rot2;
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
  rot2 = new import_lib7.default(3);
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
  eps = base_default13("epsilon");
  eps2 = eps * eps;
  safmin = base_default13("safe-minimum");
  safmax = 1 / safmin;
  ssfmax = Math.sqrt(safmax) / 3;
  ssfmin = Math.sqrt(safmin) / eps2;
  if (icompz === 2) {
    base_default10("Full", N, N, 0, 1, Z, strideZ1, strideZ2, offsetZ);
  }
  nmaxit = N * MAXIT2;
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
    anorm = base_default15("max", lend - l + 1, d, strideD, offsetD + l * strideD, e, strideE, offsetE + l * strideE);
    iscale = 0;
    if (anorm === 0) {
      continue;
    }
    if (anorm > ssfmax) {
      iscale = 1;
      base_default18("general", 0, 0, anorm, ssfmax, lend - l + 1, 1, d, strideD, 0, offsetD + l * strideD);
      base_default18("general", 0, 0, anorm, ssfmax, lend - l, 1, e, strideE, 0, offsetE + l * strideE);
    } else if (anorm < ssfmin) {
      iscale = 2;
      base_default18("general", 0, 0, anorm, ssfmin, lend - l + 1, 1, d, strideD, 0, offsetD + l * strideD);
      base_default18("general", 0, 0, anorm, ssfmin, lend - l, 1, e, strideE, 0, offsetE + l * strideE);
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
            obj = base_default21(d[offsetD + l * strideD], e[offsetE + l * strideE], d[offsetD + (l + 1) * strideD]);
            WORK[offsetWork + l * strideWork] = obj.cs1;
            WORK[offsetWork + (N - 1 + l) * strideWork] = obj.sn1;
            base_default22("right", "variable", "backward", N, 2, WORK, strideWork, offsetWork + l * strideWork, WORK, strideWork, offsetWork + (N - 1 + l) * strideWork, Z, strideZ1, strideZ2, offsetZ + l * strideZ2);
            d[offsetD + l * strideD] = obj.rt1;
            d[offsetD + (l + 1) * strideD] = obj.rt2;
          } else {
            obj = base_default17(d[offsetD + l * strideD], e[offsetE + l * strideE], d[offsetD + (l + 1) * strideD]);
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
        r = base_default16(g, 1);
        g = d[offsetD + m * strideD] - p + e[offsetE + l * strideE] / (g + (Math.abs(g) * (Math.sign(g) || 1) > 0 ? r : -r));
        s = 1;
        c = 1;
        p = 0;
        for (i = m - 1; i >= l; i--) {
          f = s * e[offsetE + i * strideE];
          b = c * e[offsetE + i * strideE];
          base_default8(g, f, rot2);
          c = rot2[0];
          s = rot2[1];
          r = rot2[2];
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
          base_default22("right", "variable", "backward", N, mm, WORK, strideWork, offsetWork + l * strideWork, WORK, strideWork, offsetWork + (N - 1 + l) * strideWork, Z, strideZ1, strideZ2, offsetZ + l * strideZ2);
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
            obj = base_default21(d[offsetD + (l - 1) * strideD], e[offsetE + (l - 1) * strideE], d[offsetD + l * strideD]);
            WORK[offsetWork + m * strideWork] = obj.cs1;
            WORK[offsetWork + (N - 1 + m) * strideWork] = obj.sn1;
            base_default22("right", "variable", "forward", N, 2, WORK, strideWork, offsetWork + m * strideWork, WORK, strideWork, offsetWork + (N - 1 + m) * strideWork, Z, strideZ1, strideZ2, offsetZ + (l - 1) * strideZ2);
            d[offsetD + (l - 1) * strideD] = obj.rt1;
            d[offsetD + l * strideD] = obj.rt2;
          } else {
            obj = base_default17(d[offsetD + (l - 1) * strideD], e[offsetE + (l - 1) * strideE], d[offsetD + l * strideD]);
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
        r = base_default16(g, 1);
        g = d[offsetD + m * strideD] - p + e[offsetE + (l - 1) * strideE] / (g + (Math.abs(g) * (Math.sign(g) || 1) > 0 ? r : -r));
        s = 1;
        c = 1;
        p = 0;
        for (i = m; i <= l - 1; i++) {
          f = s * e[offsetE + i * strideE];
          b = c * e[offsetE + i * strideE];
          base_default8(g, f, rot2);
          c = rot2[0];
          s = rot2[1];
          r = rot2[2];
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
          base_default22("right", "variable", "forward", N, mm, WORK, strideWork, offsetWork + m * strideWork, WORK, strideWork, offsetWork + (N - 1 + m) * strideWork, Z, strideZ1, strideZ2, offsetZ + m * strideZ2);
        }
        d[offsetD + l * strideD] -= p;
        e[offsetE + (l - 1) * strideE] = g;
      }
    }
    if (iscale === 1) {
      base_default18("general", 0, 0, ssfmax, anorm, lendsv - lsv + 1, 1, d, strideD, 0, offsetD + lsv * strideD);
      base_default18("general", 0, 0, ssfmax, anorm, lendsv - lsv, 1, e, strideE, 0, offsetE + lsv * strideE);
    } else if (iscale === 2) {
      base_default18("general", 0, 0, ssfmin, anorm, lendsv - lsv + 1, 1, d, strideD, 0, offsetD + lsv * strideD);
      base_default18("general", 0, 0, ssfmin, anorm, lendsv - lsv, 1, e, strideE, 0, offsetE + lsv * strideE);
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
    base_default19("increasing", N, d, strideD, offsetD);
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
        base_default23(N, Z, strideZ1, offsetZ + i * strideZ2, Z, strideZ1, offsetZ + k * strideZ2);
      }
    }
  }
  return 0;
}
var base_default24 = dsteqr;

// ../notes/lib/lapack/base/dstebz/lib/base.js
var import_lib8 = __toESM(require_lib23(), 1);
var import_lib9 = __toESM(require_lib10(), 1);

// ../notes/lib/lapack/base/dlaebz/lib/base.js
var abs = Math.abs;
var min2 = Math.min;
var max2 = Math.max;
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
          WORK[offsetWork + ji * strideWork] = min2(WORK[offsetWork + ji * strideWork], -pivmin);
        }
        for (j = 1; j < N; j++) {
          WORK[offsetWork + ji * strideWork] = d[offsetD + j * strideD] - E2[offsetE2 + (j - 1) * strideE2] / WORK[offsetWork + ji * strideWork] - c[offsetC + ji * strideC];
          if (WORK[offsetWork + ji * strideWork] <= pivmin) {
            IWORK[offsetIWork + ji * strideIWork] += 1;
            WORK[offsetWork + ji * strideWork] = min2(WORK[offsetWork + ji * strideWork], -pivmin);
          }
        }
      }
      if (ijob <= 2) {
        klnew = kl;
        for (ji = kf; ji < kl; ji++) {
          IWORK[offsetIWork + ji * strideIWork] = min2(NAB[offsetNAB + ji * strideNAB1 + strideNAB2], max2(NAB[offsetNAB + ji * strideNAB1], IWORK[offsetIWork + ji * strideIWork]));
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
          tmp2 = min2(tmp2, -pivmin);
        }
        for (j = 1; j < N; j++) {
          tmp2 = d[offsetD + j * strideD] - E2[offsetE2 + (j - 1) * strideE2] / tmp2 - tmp1;
          if (tmp2 <= pivmin) {
            itmp1 += 1;
            tmp2 = min2(tmp2, -pivmin);
          }
        }
        if (ijob <= 2) {
          itmp1 = min2(NAB[offsetNAB + ji * strideNAB1 + strideNAB2], max2(NAB[offsetNAB + ji * strideNAB1], itmp1));
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
      tmp2 = max2(abs(AB[offsetAB + ji * strideAB1 + strideAB2]), abs(AB[offsetAB + ji * strideAB1]));
      if (tmp1 < max2(abstol, pivmin, reltol * tmp2) || NAB[offsetNAB + ji * strideNAB1] >= NAB[offsetNAB + ji * strideNAB1 + strideNAB2]) {
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
  info = max2(kl - kf, 0);
  mout[0] = kl;
  return info;
}
var base_default25 = dlaebz;

// ../notes/lib/lapack/base/dstebz/lib/base.js
var abs2 = Math.abs;
var min3 = Math.min;
var max3 = Math.max;
var log = Math.log;
var sqrt2 = Math.sqrt;
var floor2 = Math.floor;
var ZERO = 0;
var ONE = 1;
var TWO = 2;
var HALF = 0.5;
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
  } else if (irange === 3 && (il < 1 || il > max3(1, N))) {
    info = -6;
  } else if (irange === 3 && (iu < min3(N, il) || iu > N)) {
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
  safemn = base_default13("safe-minimum");
  ulp = base_default13("precision");
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
      pivmin = max3(pivmin, tmp1);
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
      tmp2 = sqrt2(WORK[offsetWork + j * strideWork]);
      gu = max3(gu, d[offsetD + j * strideD] + tmp1 + tmp2);
      gl = min3(gl, d[offsetD + j * strideD] - tmp1 - tmp2);
      tmp1 = tmp2;
    }
    gu = max3(gu, d[offsetD + (N - 1) * strideD] + tmp1);
    gl = min3(gl, d[offsetD + (N - 1) * strideD] - tmp1);
    tnorm = max3(abs2(gl), abs2(gu));
    gl = gl - FUDGE * tnorm * ulp * N - FUDGE * TWO * pivmin;
    gu = gu + FUDGE * tnorm * ulp * N + FUDGE * pivmin;
    itmax = floor2((log(tnorm + pivmin) - log(pivmin)) / log(TWO)) + 2;
    if (abstol <= ZERO) {
      atoli = ulp * tnorm;
    } else {
      atoli = abstol;
    }
    abWork = new import_lib8.default(4);
    nabWork = new import_lib9.default(4);
    cWork = new import_lib8.default(2);
    var nvalWork = new import_lib9.default(2);
    wScratch = new import_lib8.default(2);
    iwScratch = new import_lib9.default(2);
    mout = new import_lib9.default(1);
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
    iinfo = base_default25(3, itmax, N, 2, 2, nb, atoli, rtoli, pivmin, d, strideD, offsetD, e, strideE, offsetE, WORK, strideWork, offsetWork, nvalWork, 1, 0, abWork, 1, 2, 0, cWork, 1, 0, mout, nabWork, 1, 2, 0, wScratch, 1, 0, iwScratch, 1, 0);
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
    tnorm = max3(abs2(d[offsetD]) + abs2(e[offsetE]), abs2(d[offsetD + (N - 1) * strideD]) + abs2(e[offsetE + (N - 2) * strideE]));
    for (j = 1; j < N - 1; j++) {
      tnorm = max3(tnorm, abs2(d[offsetD + j * strideD]) + abs2(e[offsetE + (j - 1) * strideE]) + abs2(e[offsetE + j * strideE]));
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
  mout = new import_lib9.default(1);
  idumma = new import_lib9.default(1);
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
        gu = max3(gu, d[offsetD + j * strideD] + tmp1 + tmp2);
        gl = min3(gl, d[offsetD + j * strideD] - tmp1 - tmp2);
        tmp1 = tmp2;
      }
      gu = max3(gu, d[offsetD + (iend - 1) * strideD] + tmp1);
      gl = min3(gl, d[offsetD + (iend - 1) * strideD] - tmp1);
      bnorm = max3(abs2(gl), abs2(gu));
      gl = gl - FUDGE * bnorm * ulp * in_ - FUDGE * pivmin;
      gu = gu + FUDGE * bnorm * ulp * in_ + FUDGE * pivmin;
      if (abstol <= ZERO) {
        atoli = ulp * max3(abs2(gl), abs2(gu));
      } else {
        atoli = abstol;
      }
      if (irange > 1) {
        if (gu < wl) {
          nwl += in_;
          nwu += in_;
          continue;
        }
        gl = max3(gl, wl);
        gu = min3(gu, wu);
        if (gl >= gu) {
          continue;
        }
      }
      abWork = new import_lib8.default(in_ * 2);
      nabWork = new import_lib9.default(in_ * 2);
      cWork = new import_lib8.default(in_);
      wScratch = new import_lib8.default(in_);
      iwScratch = new import_lib9.default(in_);
      abWork[0] = gl;
      abWork[in_] = gu;
      iinfo = base_default25(1, 0, in_, in_, 1, nb, atoli, rtoli, pivmin, d, strideD, offsetD + ibegin * strideD, e, strideE, offsetE + ibegin * strideE, WORK, strideWork, offsetWork + ibegin * strideWork, idumma, 1, 0, abWork, 1, in_, 0, cWork, 1, 0, mout, nabWork, 1, in_, 0, wScratch, 1, 0, iwScratch, 1, 0);
      nwl += nabWork[0];
      nwu += nabWork[in_];
      iwoff = m - nabWork[0];
      im = mout[0];
      itmax = floor2((log(gu - gl + pivmin) - log(pivmin)) / log(TWO)) + 2;
      iinfo = base_default25(2, itmax, in_, in_, 1, nb, atoli, rtoli, pivmin, d, strideD, offsetD + ibegin * strideD, e, strideE, offsetE + ibegin * strideE, WORK, strideWork, offsetWork + ibegin * strideWork, idumma, 1, 0, abWork, 1, in_, 0, cWork, 1, 0, mout, nabWork, 1, in_, 0, wScratch, 1, 0, iwScratch, 1, 0);
      iout = mout[0];
      for (j = 0; j < iout; j++) {
        tmp1 = HALF * (abWork[j] + abWork[j + in_]);
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
var base_default26 = dstebz;

// ../notes/lib/lapack/base/dstein/lib/base.js
var import_lib11 = __toESM(require_lib10(), 1);

// ../notes/lib/lapack/base/dlarnv/lib/base.js
var import_lib10 = __toESM(require_lib23(), 1);

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
var base_default27 = dlaruv;

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
  u = new import_lib10.default(LV);
  for (iv = 0; iv < N; iv += LV / 2) {
    il = Math.min(LV / 2, N - iv);
    if (idist === 3) {
      il2 = 2 * il;
    } else {
      il2 = il;
    }
    base_default27(iseed, strideISEED, offsetISEED, il2, u, 1, 0);
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
var base_default28 = dlarnv;

// ../notes/lib/blas/base/dcopy/lib/base.js
var M2 = 7;
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
    m = N % M2;
    if (m > 0) {
      for (i = 0; i < m; i++) {
        y[iy] = x[ix];
        ix += 1;
        iy += 1;
      }
    }
    if (N < M2) {
      return y;
    }
    for (i = m; i < N; i += M2) {
      y[iy] = x[ix];
      y[iy + 1] = x[ix + 1];
      y[iy + 2] = x[ix + 2];
      y[iy + 3] = x[ix + 3];
      y[iy + 4] = x[ix + 4];
      y[iy + 5] = x[ix + 5];
      y[iy + 6] = x[ix + 6];
      ix += M2;
      iy += M2;
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
var base_default29 = dcopy;

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
var base_default30 = ddot;

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
var base_default31 = dnrm2;

// ../notes/lib/blas/base/daxpy/lib/base.js
var M4 = 4;
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
    m = N % M4;
    if (m > 0) {
      for (i = 0; i < m; i++) {
        y[iy] += alpha * x[ix];
        ix += 1;
        iy += 1;
      }
    }
    if (N < M4) {
      return y;
    }
    for (i = m; i < N; i += M4) {
      y[iy] += alpha * x[ix];
      y[iy + 1] += alpha * x[ix + 1];
      y[iy + 2] += alpha * x[ix + 2];
      y[iy + 3] += alpha * x[ix + 3];
      ix += M4;
      iy += M4;
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
var base_default32 = daxpy;

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
var base_default33 = idamax;

// ../notes/lib/lapack/base/dlagtf/lib/base.js
var EPS2 = base_default13("Epsilon");
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
var base_default34 = dlagtf;

// ../notes/lib/lapack/base/dlagts/lib/base.js
var EPS3 = base_default13("Epsilon");
var SFMIN2 = base_default13("Safe minimum");
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
var base_default35 = dlagts;

// ../notes/lib/lapack/base/dstein/lib/base.js
var MAXITS = 5;
var EXTRA = 2;
var ODM3 = 1e-3;
var ODM1 = 0.1;
var TEN = 10;
var EPS4 = base_default13("Precision");
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
  iseed = new import_lib11.default([1, 1, 1, 1]);
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
      base_default28(2, iseed, 1, 0, blksiz, WORK, strideWork, indrv1);
      base_default29(blksiz, d, strideD, offsetD + b1 * strideD, WORK, strideWork, indrv4);
      base_default29(blksiz - 1, e, strideE, offsetE + b1 * strideE, WORK, strideWork, indrv2 + strideWork);
      base_default29(blksiz - 1, e, strideE, offsetE + b1 * strideE, WORK, strideWork, indrv3);
      tol = 0;
      base_default34(blksiz, WORK, strideWork, indrv4, xj, WORK, strideWork, indrv2 + strideWork, WORK, strideWork, indrv3, tol, WORK, strideWork, indrv5, IWORK, strideIWork, offsetIWork);
      while (true) {
        its++;
        if (its > MAXITS) {
          info++;
          IFAIL[offsetIFAIL + (info - 1) * strideIFAIL] = j + 1;
          break;
        }
        jmax = base_default33(blksiz, WORK, strideWork, indrv1);
        scl = blksiz * onenrm * Math.max(EPS4, Math.abs(WORK[indrv4 + (blksiz - 1) * strideWork])) / Math.abs(WORK[indrv1 + jmax * strideWork]);
        base_default(blksiz, scl, WORK, strideWork, indrv1);
        base_default35(-1, blksiz, WORK, strideWork, indrv4, WORK, strideWork, indrv2 + strideWork, WORK, strideWork, indrv3, WORK, strideWork, indrv5, IWORK, strideIWork, offsetIWork, WORK, strideWork, indrv1, tol);
        if (jblk !== 1) {
          if (Math.abs(xj - xjm) > ortol) {
            gpind = j;
          }
          if (gpind !== j) {
            for (i = gpind; i < j; i++) {
              ztr = -base_default30(blksiz, WORK, strideWork, indrv1, Z, strideZ1, offsetZ + b1 * strideZ1 + i * strideZ2);
              base_default32(blksiz, ztr, Z, strideZ1, offsetZ + b1 * strideZ1 + i * strideZ2, WORK, strideWork, indrv1);
            }
          }
        }
        jmax = base_default33(blksiz, WORK, strideWork, indrv1);
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
      scl = 1 / base_default31(blksiz, WORK, strideWork, indrv1);
      jmax = base_default33(blksiz, WORK, strideWork, indrv1);
      if (WORK[indrv1 + jmax * strideWork] < 0) {
        scl = -scl;
      }
      base_default(blksiz, scl, WORK, strideWork, indrv1);
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
var base_default36 = dstein;

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
var base_default37 = dlacpy;

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
var base_default38 = dgemv;

// ../notes/lib/lapack/base/dsbgvx/lib/base.js
function dsbgvx(jobz, range, uplo, N, ka, kb, AB, strideAB1, strideAB2, offsetAB, BB, strideBB1, strideBB2, offsetBB, Q, strideQ1, strideQ2, offsetQ, vl, vu, il, iu, abstol, out, w, strideW, offsetW, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, offsetWork, IWORK, strideIWork, offsetIWork, IFAIL, strideIFAIL, offsetIFAIL) {
  var indeig;
  var nsplit;
  var indibl;
  var indisp;
  var indiwo;
  var indwrk;
  var alleig;
  var wantz;
  var indee;
  var order;
  var itmp1;
  var Mout;
  var info;
  var indd;
  var inde;
  var tmp1;
  var test;
  var vect;
  var jj;
  var M5;
  var i;
  var j;
  wantz = jobz === "compute-vectors";
  alleig = range === "all";
  indeig = range === "index";
  info = 0;
  M5 = 0;
  if (N === 0) {
    out.M = 0;
    return 0;
  }
  info = base_default3(uplo, N, kb, BB, strideBB1, strideBB2, offsetBB);
  if (info !== 0) {
    out.M = 0;
    return N + info;
  }
  base_default11(wantz ? "update" : "none", uplo, N, ka, kb, AB, strideAB1, strideAB2, offsetAB, BB, strideBB1, strideBB2, offsetBB, Q, strideQ1, strideQ2, offsetQ, WORK, strideWork, offsetWork);
  indd = offsetWork;
  inde = indd + N * strideWork;
  indwrk = inde + N * strideWork;
  if (wantz) {
    vect = "update";
  } else {
    vect = "none";
  }
  base_default12(vect, uplo, N, ka, AB, strideAB1, strideAB2, offsetAB, WORK, strideWork, indd, WORK, strideWork, inde, Q, strideQ1, strideQ2, offsetQ, WORK, strideWork, indwrk);
  test = false;
  if (indeig) {
    if (il === 1 && iu === N) {
      test = true;
    }
  }
  if ((alleig || test) && abstol <= 0) {
    base_default29(N, WORK, strideWork, indd, w, strideW, offsetW);
    indee = indwrk + 2 * N * strideWork;
    if (wantz) {
      base_default37("all", N, N, Q, strideQ1, strideQ2, offsetQ, Z, strideZ1, strideZ2, offsetZ);
      base_default29(N - 1, WORK, strideWork, inde, WORK, strideWork, indee);
      info = base_default24("update", N, w, strideW, offsetW, WORK, strideWork, indee, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, indwrk);
      if (info === 0) {
        for (i = 0; i < N; i++) {
          IFAIL[offsetIFAIL + i * strideIFAIL] = 0;
        }
      }
    } else {
      base_default29(N - 1, WORK, strideWork, inde, WORK, strideWork, indee);
      info = base_default20(N, w, strideW, offsetW, WORK, strideWork, indee);
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
    indisp = indibl + N * strideIWork;
    indiwo = indisp + N * strideIWork;
    Mout = new import_lib12.default(1);
    nsplit = new import_lib12.default(1);
    base_default26(range, order, N, vl, vu, il, iu, abstol, WORK, strideWork, indd, WORK, strideWork, inde, Mout, nsplit, w, strideW, offsetW, IWORK, strideIWork, indibl, IWORK, strideIWork, indisp, WORK, strideWork, indwrk, IWORK, strideIWork, indiwo);
    M5 = Mout[0];
    if (wantz && M5 > 0) {
      info = base_default36(N, WORK, strideWork, indd, WORK, strideWork, inde, M5, w, strideW, offsetW, IWORK, strideIWork, indibl, IWORK, strideIWork, indisp, Z, strideZ1, strideZ2, offsetZ, WORK, strideWork, indwrk, IWORK, strideIWork, indiwo, IFAIL, strideIFAIL, offsetIFAIL);
      for (j = 0; j < M5; j++) {
        base_default29(N, Z, strideZ1, offsetZ + j * strideZ2, WORK, strideWork, offsetWork);
        base_default38("no-transpose", N, N, 1, Q, strideQ1, strideQ2, offsetQ, WORK, strideWork, offsetWork, 0, Z, strideZ1, offsetZ + j * strideZ2);
      }
    }
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
        itmp1 = IWORK[offsetIWork + i * strideIWork];
        w[offsetW + i * strideW] = w[offsetW + j * strideW];
        IWORK[offsetIWork + i * strideIWork] = IWORK[offsetIWork + j * strideIWork];
        w[offsetW + j * strideW] = tmp1;
        IWORK[offsetIWork + j * strideIWork] = itmp1;
        base_default23(N, Z, strideZ1, offsetZ + i * strideZ2, Z, strideZ1, offsetZ + j * strideZ2);
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
var base_default39 = dsbgvx;
export {
  base_default39 as default
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
@stdlib/math/base/special/sqrt/lib/main.js:
@stdlib/math/base/special/sqrt/lib/index.js:
@stdlib/constants/float64/pinf/lib/index.js:
@stdlib/math/base/assert/is-positive-zero/lib/main.js:
@stdlib/math/base/assert/is-positive-zero/lib/index.js:
@stdlib/math/base/assert/is-nan/lib/main.js:
@stdlib/math/base/assert/is-nan/lib/index.js:
@stdlib/math/base/special/max/lib/main.js:
@stdlib/math/base/special/max/lib/index.js:
@stdlib/number/ctor/lib/main.js:
@stdlib/number/ctor/lib/index.js:
@stdlib/constants/float64/ninf/lib/index.js:
@stdlib/math/base/assert/is-negative-zero/lib/main.js:
@stdlib/math/base/assert/is-negative-zero/lib/index.js:
@stdlib/math/base/special/min/lib/main.js:
@stdlib/math/base/special/min/lib/index.js:
@stdlib/math/base/special/floor/lib/main.js:
@stdlib/math/base/special/floor/lib/index.js:
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
