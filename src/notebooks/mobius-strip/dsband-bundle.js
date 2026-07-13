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

// ../notes/node_modules/@stdlib/utils/define-property/lib/define_property.js
var require_define_property = __commonJS({
  "../notes/node_modules/@stdlib/utils/define-property/lib/define_property.js"(exports, module) {
    "use strict";
    var main = typeof Object.defineProperty === "function" ? Object.defineProperty : null;
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/utils/define-property/lib/has_define_property_support.js
var require_has_define_property_support = __commonJS({
  "../notes/node_modules/@stdlib/utils/define-property/lib/has_define_property_support.js"(exports, module) {
    "use strict";
    var defineProperty = require_define_property();
    function hasDefinePropertySupport() {
      try {
        defineProperty({}, "x", {});
        return true;
      } catch (err) {
        return false;
      }
    }
    module.exports = hasDefinePropertySupport;
  }
});

// ../notes/node_modules/@stdlib/utils/define-property/lib/builtin.js
var require_builtin = __commonJS({
  "../notes/node_modules/@stdlib/utils/define-property/lib/builtin.js"(exports, module) {
    "use strict";
    var defineProperty = Object.defineProperty;
    module.exports = defineProperty;
  }
});

// ../notes/node_modules/@stdlib/string/base/format-interpolate/lib/is_number.js
var require_is_number = __commonJS({
  "../notes/node_modules/@stdlib/string/base/format-interpolate/lib/is_number.js"(exports, module) {
    "use strict";
    function isNumber(value) {
      return typeof value === "number";
    }
    module.exports = isNumber;
  }
});

// ../notes/node_modules/@stdlib/string/base/format-interpolate/lib/zero_pad.js
var require_zero_pad = __commonJS({
  "../notes/node_modules/@stdlib/string/base/format-interpolate/lib/zero_pad.js"(exports, module) {
    "use strict";
    function startsWithMinus(str) {
      return str[0] === "-";
    }
    function zeros(n) {
      var out = "";
      var i;
      for (i = 0; i < n; i++) {
        out += "0";
      }
      return out;
    }
    function zeroPad(str, width, right) {
      var negative = false;
      var pad = width - str.length;
      if (pad < 0) {
        return str;
      }
      if (startsWithMinus(str)) {
        negative = true;
        str = str.substr(1);
      }
      str = right ? str + zeros(pad) : zeros(pad) + str;
      if (negative) {
        str = "-" + str;
      }
      return str;
    }
    module.exports = zeroPad;
  }
});

// ../notes/node_modules/@stdlib/string/base/format-interpolate/lib/format_integer.js
var require_format_integer = __commonJS({
  "../notes/node_modules/@stdlib/string/base/format-interpolate/lib/format_integer.js"(exports, module) {
    "use strict";
    var isNumber = require_is_number();
    var zeroPad = require_zero_pad();
    var lowercase = String.prototype.toLowerCase;
    var uppercase = String.prototype.toUpperCase;
    function formatInteger(token) {
      var base;
      var out;
      var i;
      switch (token.specifier) {
        case "b":
          base = 2;
          break;
        case "o":
          base = 8;
          break;
        case "x":
        case "X":
          base = 16;
          break;
        case "d":
        case "i":
        case "u":
        default:
          base = 10;
          break;
      }
      out = token.arg;
      i = parseInt(out, 10);
      if (!isFinite(i)) {
        if (!isNumber(out)) {
          throw new Error("invalid integer. Value: " + out);
        }
        i = 0;
      }
      if (i < 0 && (token.specifier === "u" || base !== 10)) {
        i = 4294967295 + i + 1;
      }
      if (i < 0) {
        out = (-i).toString(base);
        if (token.precision) {
          out = zeroPad(out, token.precision, token.padRight);
        }
        out = "-" + out;
      } else {
        out = i.toString(base);
        if (!i && !token.precision) {
          out = "";
        } else if (token.precision) {
          out = zeroPad(out, token.precision, token.padRight);
        }
        if (token.sign) {
          out = token.sign + out;
        }
      }
      if (base === 16) {
        if (token.alternate) {
          out = "0x" + out;
        }
        out = token.specifier === uppercase.call(token.specifier) ? uppercase.call(out) : lowercase.call(out);
      }
      if (base === 8) {
        if (token.alternate && out.charAt(0) !== "0") {
          out = "0" + out;
        }
      }
      return out;
    }
    module.exports = formatInteger;
  }
});

// ../notes/node_modules/@stdlib/string/base/format-interpolate/lib/is_string.js
var require_is_string = __commonJS({
  "../notes/node_modules/@stdlib/string/base/format-interpolate/lib/is_string.js"(exports, module) {
    "use strict";
    function isString(value) {
      return typeof value === "string";
    }
    module.exports = isString;
  }
});

// ../notes/node_modules/@stdlib/string/base/format-interpolate/lib/format_double.js
var require_format_double = __commonJS({
  "../notes/node_modules/@stdlib/string/base/format-interpolate/lib/format_double.js"(exports, module) {
    "use strict";
    var isNumber = require_is_number();
    var abs = Math.abs;
    var lowercase = String.prototype.toLowerCase;
    var uppercase = String.prototype.toUpperCase;
    var replace = String.prototype.replace;
    var RE_EXP_POS_DIGITS = /e\+(\d)$/;
    var RE_EXP_NEG_DIGITS = /e-(\d)$/;
    var RE_ONLY_DIGITS = /^(\d+)$/;
    var RE_DIGITS_BEFORE_EXP = /^(\d+)e/;
    var RE_TRAILING_PERIOD_ZERO = /\.0$/;
    var RE_PERIOD_ZERO_EXP = /\.0*e/;
    var RE_ZERO_BEFORE_EXP = /(\..*[^0])0*e/;
    function formatDouble(token) {
      var digits;
      var out;
      var f = parseFloat(token.arg);
      if (!isFinite(f)) {
        if (!isNumber(token.arg)) {
          throw new Error("invalid floating-point number. Value: " + out);
        }
        f = token.arg;
      }
      switch (token.specifier) {
        case "e":
        case "E":
          out = f.toExponential(token.precision);
          break;
        case "f":
        case "F":
          out = f.toFixed(token.precision);
          break;
        case "g":
        case "G":
          if (abs(f) < 1e-4) {
            digits = token.precision;
            if (digits > 0) {
              digits -= 1;
            }
            out = f.toExponential(digits);
          } else {
            out = f.toPrecision(token.precision);
          }
          if (!token.alternate) {
            out = replace.call(out, RE_ZERO_BEFORE_EXP, "$1e");
            out = replace.call(out, RE_PERIOD_ZERO_EXP, "e");
            out = replace.call(out, RE_TRAILING_PERIOD_ZERO, "");
          }
          break;
        default:
          throw new Error("invalid double notation. Value: " + token.specifier);
      }
      out = replace.call(out, RE_EXP_POS_DIGITS, "e+0$1");
      out = replace.call(out, RE_EXP_NEG_DIGITS, "e-0$1");
      if (token.alternate) {
        out = replace.call(out, RE_ONLY_DIGITS, "$1.");
        out = replace.call(out, RE_DIGITS_BEFORE_EXP, "$1.e");
      }
      if (f >= 0 && token.sign) {
        out = token.sign + out;
      }
      out = token.specifier === uppercase.call(token.specifier) ? uppercase.call(out) : lowercase.call(out);
      return out;
    }
    module.exports = formatDouble;
  }
});

// ../notes/node_modules/@stdlib/string/base/format-interpolate/lib/space_pad.js
var require_space_pad = __commonJS({
  "../notes/node_modules/@stdlib/string/base/format-interpolate/lib/space_pad.js"(exports, module) {
    "use strict";
    function spaces(n) {
      var out = "";
      var i;
      for (i = 0; i < n; i++) {
        out += " ";
      }
      return out;
    }
    function spacePad(str, width, right) {
      var pad = width - str.length;
      if (pad < 0) {
        return str;
      }
      str = right ? str + spaces(pad) : spaces(pad) + str;
      return str;
    }
    module.exports = spacePad;
  }
});

// ../notes/node_modules/@stdlib/string/base/format-interpolate/lib/main.js
var require_main = __commonJS({
  "../notes/node_modules/@stdlib/string/base/format-interpolate/lib/main.js"(exports, module) {
    "use strict";
    var formatInteger = require_format_integer();
    var isString = require_is_string();
    var formatDouble = require_format_double();
    var spacePad = require_space_pad();
    var zeroPad = require_zero_pad();
    var fromCharCode = String.fromCharCode;
    var isArray = Array.isArray;
    function isnan(value) {
      return value !== value;
    }
    function initialize(token) {
      var out = {};
      out.specifier = token.specifier;
      out.precision = token.precision === void 0 ? 1 : token.precision;
      out.width = token.width;
      out.flags = token.flags || "";
      out.mapping = token.mapping;
      return out;
    }
    function formatInterpolate(tokens) {
      var hasPeriod;
      var flags;
      var token;
      var flag;
      var num;
      var out;
      var pos;
      var i;
      var j;
      if (!isArray(tokens)) {
        throw new TypeError("invalid argument. First argument must be an array. Value: `" + tokens + "`.");
      }
      out = "";
      pos = 1;
      for (i = 0; i < tokens.length; i++) {
        token = tokens[i];
        if (isString(token)) {
          out += token;
        } else {
          hasPeriod = token.precision !== void 0;
          token = initialize(token);
          if (!token.specifier) {
            throw new TypeError("invalid argument. Token is missing `specifier` property. Index: `" + i + "`. Value: `" + token + "`.");
          }
          if (token.mapping) {
            pos = token.mapping;
          }
          flags = token.flags;
          for (j = 0; j < flags.length; j++) {
            flag = flags.charAt(j);
            switch (flag) {
              case " ":
                token.sign = " ";
                break;
              case "+":
                token.sign = "+";
                break;
              case "-":
                token.padRight = true;
                token.padZeros = false;
                break;
              case "0":
                token.padZeros = flags.indexOf("-") < 0;
                break;
              case "#":
                token.alternate = true;
                break;
              default:
                throw new Error("invalid flag: " + flag);
            }
          }
          if (token.width === "*") {
            token.width = parseInt(arguments[pos], 10);
            pos += 1;
            if (isnan(token.width)) {
              throw new TypeError("the argument for * width at position " + pos + " is not a number. Value: `" + token.width + "`.");
            }
            if (token.width < 0) {
              token.padRight = true;
              token.width = -token.width;
            }
          }
          if (hasPeriod) {
            if (token.precision === "*") {
              token.precision = parseInt(arguments[pos], 10);
              pos += 1;
              if (isnan(token.precision)) {
                throw new TypeError("the argument for * precision at position " + pos + " is not a number. Value: `" + token.precision + "`.");
              }
              if (token.precision < 0) {
                token.precision = 1;
                hasPeriod = false;
              }
            }
          }
          token.arg = arguments[pos];
          switch (token.specifier) {
            case "b":
            case "o":
            case "x":
            case "X":
            case "d":
            case "i":
            case "u":
              if (hasPeriod) {
                token.padZeros = false;
              }
              token.arg = formatInteger(token);
              break;
            case "s":
              token.maxWidth = hasPeriod ? token.precision : -1;
              token.arg = String(token.arg);
              break;
            case "c":
              if (!isnan(token.arg)) {
                num = parseInt(token.arg, 10);
                if (num < 0 || num > 127) {
                  throw new Error("invalid character code. Value: " + token.arg);
                }
                token.arg = isnan(num) ? String(token.arg) : fromCharCode(num);
              }
              break;
            case "e":
            case "E":
            case "f":
            case "F":
            case "g":
            case "G":
              if (!hasPeriod) {
                token.precision = 6;
              }
              token.arg = formatDouble(token);
              break;
            default:
              throw new Error("invalid specifier: " + token.specifier);
          }
          if (token.maxWidth >= 0 && token.arg.length > token.maxWidth) {
            token.arg = token.arg.substring(0, token.maxWidth);
          }
          if (token.padZeros) {
            token.arg = zeroPad(token.arg, token.width || token.precision, token.padRight);
          } else if (token.width) {
            token.arg = spacePad(token.arg, token.width, token.padRight);
          }
          out += token.arg || "";
          pos += 1;
        }
      }
      return out;
    }
    module.exports = formatInterpolate;
  }
});

// ../notes/node_modules/@stdlib/string/base/format-interpolate/lib/index.js
var require_lib = __commonJS({
  "../notes/node_modules/@stdlib/string/base/format-interpolate/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/string/base/format-tokenize/lib/main.js
var require_main2 = __commonJS({
  "../notes/node_modules/@stdlib/string/base/format-tokenize/lib/main.js"(exports, module) {
    "use strict";
    var RE = /%(?:([1-9]\d*)\$)?([0 +\-#]*)(\*|\d+)?(?:(\.)(\*|\d+)?)?[hlL]?([%A-Za-z])/g;
    function parse(match) {
      var token = {
        "mapping": match[1] ? parseInt(match[1], 10) : void 0,
        "flags": match[2],
        "width": match[3],
        "precision": match[5],
        "specifier": match[6]
      };
      if (match[4] === "." && match[5] === void 0) {
        token.precision = "1";
      }
      return token;
    }
    function formatTokenize(str) {
      var content;
      var tokens;
      var match;
      var prev;
      tokens = [];
      prev = 0;
      match = RE.exec(str);
      while (match) {
        content = str.slice(prev, RE.lastIndex - match[0].length);
        if (content.length) {
          tokens.push(content);
        }
        tokens.push(parse(match));
        prev = RE.lastIndex;
        match = RE.exec(str);
      }
      content = str.slice(prev);
      if (content.length) {
        tokens.push(content);
      }
      return tokens;
    }
    module.exports = formatTokenize;
  }
});

// ../notes/node_modules/@stdlib/string/base/format-tokenize/lib/index.js
var require_lib2 = __commonJS({
  "../notes/node_modules/@stdlib/string/base/format-tokenize/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main2();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/string/format/lib/is_string.js
var require_is_string2 = __commonJS({
  "../notes/node_modules/@stdlib/string/format/lib/is_string.js"(exports, module) {
    "use strict";
    function isString(value) {
      return typeof value === "string";
    }
    module.exports = isString;
  }
});

// ../notes/node_modules/@stdlib/string/format/lib/main.js
var require_main3 = __commonJS({
  "../notes/node_modules/@stdlib/string/format/lib/main.js"(exports, module) {
    "use strict";
    var interpolate = require_lib();
    var tokenize = require_lib2();
    var isString = require_is_string2();
    function format3(str) {
      var args;
      var i;
      if (!isString(str)) {
        throw new TypeError(format3("invalid argument. First argument must be a string. Value: `%s`.", str));
      }
      args = [tokenize(str)];
      for (i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      return interpolate.apply(null, args);
    }
    module.exports = format3;
  }
});

// ../notes/node_modules/@stdlib/string/format/lib/index.js
var require_lib3 = __commonJS({
  "../notes/node_modules/@stdlib/string/format/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main3();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/utils/define-property/lib/polyfill.js
var require_polyfill = __commonJS({
  "../notes/node_modules/@stdlib/utils/define-property/lib/polyfill.js"(exports, module) {
    "use strict";
    var format3 = require_lib3();
    var objectProtoype = Object.prototype;
    var toStr = objectProtoype.toString;
    var defineGetter = objectProtoype.__defineGetter__;
    var defineSetter = objectProtoype.__defineSetter__;
    var lookupGetter = objectProtoype.__lookupGetter__;
    var lookupSetter = objectProtoype.__lookupSetter__;
    function defineProperty(obj, prop, descriptor) {
      var prototype;
      var hasValue;
      var hasGet;
      var hasSet;
      if (typeof obj !== "object" || obj === null || toStr.call(obj) === "[object Array]") {
        throw new TypeError(format3("invalid argument. First argument must be an object. Value: `%s`.", obj));
      }
      if (typeof descriptor !== "object" || descriptor === null || toStr.call(descriptor) === "[object Array]") {
        throw new TypeError(format3("invalid argument. Property descriptor must be an object. Value: `%s`.", descriptor));
      }
      hasValue = "value" in descriptor;
      if (hasValue) {
        if (lookupGetter.call(obj, prop) || lookupSetter.call(obj, prop)) {
          prototype = obj.__proto__;
          obj.__proto__ = objectProtoype;
          delete obj[prop];
          obj[prop] = descriptor.value;
          obj.__proto__ = prototype;
        } else {
          obj[prop] = descriptor.value;
        }
      }
      hasGet = "get" in descriptor;
      hasSet = "set" in descriptor;
      if (hasValue && (hasGet || hasSet)) {
        throw new Error("invalid argument. Cannot specify one or more accessors and a value or writable attribute in the property descriptor.");
      }
      if (hasGet && defineGetter) {
        defineGetter.call(obj, prop, descriptor.get);
      }
      if (hasSet && defineSetter) {
        defineSetter.call(obj, prop, descriptor.set);
      }
      return obj;
    }
    module.exports = defineProperty;
  }
});

// ../notes/node_modules/@stdlib/utils/define-property/lib/index.js
var require_lib4 = __commonJS({
  "../notes/node_modules/@stdlib/utils/define-property/lib/index.js"(exports, module) {
    "use strict";
    var hasDefinePropertySupport = require_has_define_property_support();
    var builtin = require_builtin();
    var polyfill = require_polyfill();
    var defineProperty;
    if (hasDefinePropertySupport()) {
      defineProperty = builtin;
    } else {
      defineProperty = polyfill;
    }
    module.exports = defineProperty;
  }
});

// ../notes/node_modules/@stdlib/utils/define-nonenumerable-read-only-property/lib/main.js
var require_main4 = __commonJS({
  "../notes/node_modules/@stdlib/utils/define-nonenumerable-read-only-property/lib/main.js"(exports, module) {
    "use strict";
    var defineProperty = require_lib4();
    function setNonEnumerableReadOnly(obj, prop, value) {
      defineProperty(obj, prop, {
        "configurable": false,
        "enumerable": false,
        "writable": false,
        "value": value
      });
    }
    module.exports = setNonEnumerableReadOnly;
  }
});

// ../notes/node_modules/@stdlib/utils/define-nonenumerable-read-only-property/lib/index.js
var require_lib5 = __commonJS({
  "../notes/node_modules/@stdlib/utils/define-nonenumerable-read-only-property/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main4();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/assert/has-symbol-support/lib/main.js
var require_main5 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-symbol-support/lib/main.js"(exports, module) {
    "use strict";
    function hasSymbolSupport() {
      return typeof Symbol === "function" && typeof /* @__PURE__ */ Symbol("foo") === "symbol";
    }
    module.exports = hasSymbolSupport;
  }
});

// ../notes/node_modules/@stdlib/assert/has-symbol-support/lib/index.js
var require_lib6 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-symbol-support/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main5();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/assert/has-tostringtag-support/lib/main.js
var require_main6 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-tostringtag-support/lib/main.js"(exports, module) {
    "use strict";
    var hasSymbols = require_lib6();
    var FLG = hasSymbols();
    function hasToStringTagSupport() {
      return FLG && typeof Symbol.toStringTag === "symbol";
    }
    module.exports = hasToStringTagSupport;
  }
});

// ../notes/node_modules/@stdlib/assert/has-tostringtag-support/lib/index.js
var require_lib7 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-tostringtag-support/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main6();
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
var require_main7 = __commonJS({
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
var require_main8 = __commonJS({
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
var require_lib8 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-own-property/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main8();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/symbol/ctor/lib/main.js
var require_main9 = __commonJS({
  "../notes/node_modules/@stdlib/symbol/ctor/lib/main.js"(exports, module) {
    "use strict";
    var Sym = typeof Symbol === "function" ? Symbol : void 0;
    module.exports = Sym;
  }
});

// ../notes/node_modules/@stdlib/symbol/ctor/lib/index.js
var require_lib9 = __commonJS({
  "../notes/node_modules/@stdlib/symbol/ctor/lib/index.js"(exports, module) {
    "use strict";
    var main = require_main9();
    module.exports = main;
  }
});

// ../notes/node_modules/@stdlib/utils/native-class/lib/tostringtag.js
var require_tostringtag = __commonJS({
  "../notes/node_modules/@stdlib/utils/native-class/lib/tostringtag.js"(exports, module) {
    "use strict";
    var Symbol2 = require_lib9();
    var toStrTag = typeof Symbol2 === "function" ? Symbol2.toStringTag : "";
    module.exports = toStrTag;
  }
});

// ../notes/node_modules/@stdlib/utils/native-class/lib/polyfill.js
var require_polyfill2 = __commonJS({
  "../notes/node_modules/@stdlib/utils/native-class/lib/polyfill.js"(exports, module) {
    "use strict";
    var hasOwnProp = require_lib8();
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
var require_lib10 = __commonJS({
  "../notes/node_modules/@stdlib/utils/native-class/lib/index.js"(exports, module) {
    "use strict";
    var hasToStringTag = require_lib7();
    var builtin = require_main7();
    var polyfill = require_polyfill2();
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
var require_main10 = __commonJS({
  "../notes/node_modules/@stdlib/assert/is-int32array/lib/main.js"(exports, module) {
    "use strict";
    var nativeClass = require_lib10();
    var hasInt32Array = typeof Int32Array === "function";
    function isInt32Array(value) {
      return hasInt32Array && value instanceof Int32Array || // eslint-disable-line stdlib/require-globals
      nativeClass(value) === "[object Int32Array]";
    }
    module.exports = isInt32Array;
  }
});

// ../notes/node_modules/@stdlib/assert/is-int32array/lib/index.js
var require_lib11 = __commonJS({
  "../notes/node_modules/@stdlib/assert/is-int32array/lib/index.js"(exports, module) {
    "use strict";
    var isInt32Array = require_main10();
    module.exports = isInt32Array;
  }
});

// ../notes/node_modules/@stdlib/constants/int32/max/lib/index.js
var require_lib12 = __commonJS({
  "../notes/node_modules/@stdlib/constants/int32/max/lib/index.js"(exports, module) {
    "use strict";
    var INT32_MAX = 2147483647 | 0;
    module.exports = INT32_MAX;
  }
});

// ../notes/node_modules/@stdlib/constants/int32/min/lib/index.js
var require_lib13 = __commonJS({
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
var require_main11 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-int32array-support/lib/main.js"(exports, module) {
    "use strict";
    var isInt32Array = require_lib11();
    var INT32_MAX = require_lib12();
    var INT32_MIN = require_lib13();
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
var require_lib14 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-int32array-support/lib/index.js"(exports, module) {
    "use strict";
    var hasInt32ArraySupport = require_main11();
    module.exports = hasInt32ArraySupport;
  }
});

// ../notes/node_modules/@stdlib/array/int32/lib/main.js
var require_main12 = __commonJS({
  "../notes/node_modules/@stdlib/array/int32/lib/main.js"(exports, module) {
    "use strict";
    var ctor = typeof Int32Array === "function" ? Int32Array : void 0;
    module.exports = ctor;
  }
});

// ../notes/node_modules/@stdlib/array/int32/lib/polyfill.js
var require_polyfill3 = __commonJS({
  "../notes/node_modules/@stdlib/array/int32/lib/polyfill.js"(exports, module) {
    "use strict";
    function polyfill() {
      throw new Error("not implemented");
    }
    module.exports = polyfill;
  }
});

// ../notes/node_modules/@stdlib/array/int32/lib/index.js
var require_lib15 = __commonJS({
  "../notes/node_modules/@stdlib/array/int32/lib/index.js"(exports, module) {
    "use strict";
    var hasInt32ArraySupport = require_lib14();
    var builtin = require_main12();
    var polyfill = require_polyfill3();
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
var require_main13 = __commonJS({
  "../notes/node_modules/@stdlib/assert/is-float64array/lib/main.js"(exports, module) {
    "use strict";
    var nativeClass = require_lib10();
    var hasFloat64Array = typeof Float64Array === "function";
    function isFloat64Array(value) {
      return hasFloat64Array && value instanceof Float64Array || // eslint-disable-line stdlib/require-globals
      nativeClass(value) === "[object Float64Array]";
    }
    module.exports = isFloat64Array;
  }
});

// ../notes/node_modules/@stdlib/assert/is-float64array/lib/index.js
var require_lib16 = __commonJS({
  "../notes/node_modules/@stdlib/assert/is-float64array/lib/index.js"(exports, module) {
    "use strict";
    var isFloat64Array = require_main13();
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
var require_main14 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-float64array-support/lib/main.js"(exports, module) {
    "use strict";
    var isFloat64Array = require_lib16();
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
var require_lib17 = __commonJS({
  "../notes/node_modules/@stdlib/assert/has-float64array-support/lib/index.js"(exports, module) {
    "use strict";
    var hasFloat64ArraySupport = require_main14();
    module.exports = hasFloat64ArraySupport;
  }
});

// ../notes/node_modules/@stdlib/array/float64/lib/main.js
var require_main15 = __commonJS({
  "../notes/node_modules/@stdlib/array/float64/lib/main.js"(exports, module) {
    "use strict";
    var ctor = typeof Float64Array === "function" ? Float64Array : void 0;
    module.exports = ctor;
  }
});

// ../notes/node_modules/@stdlib/array/float64/lib/polyfill.js
var require_polyfill4 = __commonJS({
  "../notes/node_modules/@stdlib/array/float64/lib/polyfill.js"(exports, module) {
    "use strict";
    function polyfill() {
      throw new Error("not implemented");
    }
    module.exports = polyfill;
  }
});

// ../notes/node_modules/@stdlib/array/float64/lib/index.js
var require_lib18 = __commonJS({
  "../notes/node_modules/@stdlib/array/float64/lib/index.js"(exports, module) {
    "use strict";
    var hasFloat64ArraySupport = require_lib17();
    var builtin = require_main15();
    var polyfill = require_polyfill4();
    var ctor;
    if (hasFloat64ArraySupport()) {
      ctor = builtin;
    } else {
      ctor = polyfill;
    }
    module.exports = ctor;
  }
});

// ../notes/lib/arpack/base/dsband/lib/main.js
var import_lib11 = __toESM(require_lib5(), 1);

// ../notes/lib/arpack/base/dsband/lib/dsband.js
var import_lib9 = __toESM(require_lib3(), 1);

// ../notes/lib/arpack/base/dsband/lib/base.js
var import_lib8 = __toESM(require_lib15(), 1);

// ../notes/lib/blas/base/dcopy/lib/base.js
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
var base_default = dcopy;

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

// ../notes/lib/blas/base/dgbmv/lib/base.js
function dgbmv(trans, M5, N, kl, ku, alpha, A, strideA1, strideA2, offsetA, x, strideX, offsetX, beta, y, strideY, offsetY) {
  var leny;
  var temp;
  var sa1;
  var sa2;
  var iy;
  var jx;
  var jy;
  var kx;
  var ky;
  var ia;
  var i;
  var j;
  var k;
  if (M5 === 0 || N === 0 || alpha === 0 && beta === 1) {
    return y;
  }
  sa1 = strideA1;
  sa2 = strideA2;
  if (trans === "no-transpose") {
    leny = M5;
  } else {
    leny = N;
  }
  kx = offsetX;
  ky = offsetY;
  if (beta !== 1) {
    iy = ky;
    if (beta === 0) {
      for (i = 0; i < leny; i += 1) {
        y[iy] = 0;
        iy += strideY;
      }
    } else {
      for (i = 0; i < leny; i += 1) {
        y[iy] *= beta;
        iy += strideY;
      }
    }
  }
  if (alpha === 0) {
    return y;
  }
  if (trans === "no-transpose") {
    jx = kx;
    for (j = 0; j < N; j += 1) {
      if (x[jx] !== 0) {
        temp = alpha * x[jx];
        k = ku - j;
        for (i = Math.max(0, j - ku); i < Math.min(M5, j + kl + 1); i += 1) {
          ia = offsetA + (k + i) * sa1 + j * sa2;
          y[offsetY + i * strideY] += temp * A[ia];
        }
      }
      jx += strideX;
      if (j >= ku) {
        ky += strideY;
      }
    }
  } else {
    jy = ky;
    for (j = 0; j < N; j += 1) {
      temp = 0;
      k = ku - j;
      for (i = Math.max(0, j - ku); i < Math.min(M5, j + kl + 1); i += 1) {
        ia = offsetA + (k + i) * sa1 + j * sa2;
        temp += A[ia] * x[offsetX + i * strideX];
      }
      y[jy] += alpha * temp;
      jy += strideY;
      if (j >= ku) {
        kx += strideX;
      }
    }
  }
  return y;
}
var base_default3 = dgbmv;

// ../notes/lib/lapack/base/dgbtrf/lib/base.js
var import_lib = __toESM(require_lib18(), 1);

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
var base_default4 = idamax;

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
var base_default5 = dger;

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
var base_default6 = dscal;

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
var base_default7 = dswap;

// ../notes/lib/lapack/base/dgbtf2/lib/base.js
function dgbtf2(M5, N, kl, ku, AB, strideAB1, strideAB2, offsetAB, IPIV, strideIPIV, offsetIPIV) {
  var info;
  var sa1;
  var sa2;
  var kv;
  var km;
  var jp;
  var ju;
  var i;
  var j;
  sa1 = strideAB1;
  sa2 = strideAB2;
  kv = ku + kl;
  info = 0;
  if (M5 === 0 || N === 0) {
    return 0;
  }
  for (j = ku + 1; j < Math.min(kv, N); j++) {
    for (i = kv - j; i < kl; i++) {
      AB[offsetAB + i * sa1 + j * sa2] = 0;
    }
  }
  ju = 0;
  for (j = 0; j < Math.min(M5, N); j++) {
    if (j + kv < N) {
      for (i = 0; i < kl; i++) {
        AB[offsetAB + i * sa1 + (j + kv) * sa2] = 0;
      }
    }
    km = Math.min(kl, M5 - j - 1);
    jp = base_default4(km + 1, AB, sa1, offsetAB + kv * sa1 + j * sa2);
    IPIV[offsetIPIV + j * strideIPIV] = jp + j;
    if (AB[offsetAB + (kv + jp) * sa1 + j * sa2] === 0) {
      if (info === 0) {
        info = j + 1;
      }
    } else {
      ju = Math.max(ju, Math.min(j + ku + jp, N - 1));
      if (jp !== 0) {
        base_default7(ju - j + 1, AB, sa2 - sa1, offsetAB + (kv + jp) * sa1 + j * sa2, AB, sa2 - sa1, offsetAB + kv * sa1 + j * sa2);
      }
      if (km > 0) {
        base_default6(km, 1 / AB[offsetAB + kv * sa1 + j * sa2], AB, sa1, offsetAB + (kv + 1) * sa1 + j * sa2);
        if (ju > j) {
          base_default5(km, ju - j, -1, AB, sa1, offsetAB + (kv + 1) * sa1 + j * sa2, AB, sa2 - sa1, offsetAB + (kv - 1) * sa1 + (j + 1) * sa2, AB, sa1, sa2 - sa1, offsetAB + kv * sa1 + (j + 1) * sa2);
        }
      }
    }
  }
  return info;
}
var base_default8 = dgbtf2;

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
var base_default9 = dgemm;

// ../notes/lib/lapack/base/dlaswp/lib/base.js
var BLOCK_SIZE = 32;
function dlaswp(N, A, strideA1, strideA2, offsetA, k1, k2, inck, IPIV, strideIPIV, offsetIPIV) {
  var nrows;
  var n32;
  var tmp;
  var row;
  var ia1;
  var ia2;
  var ip;
  var i;
  var j;
  var k;
  var n;
  var o;
  if (inck > 0) {
    nrows = k2 - k1;
  } else {
    nrows = k1 - k2;
  }
  nrows += 1;
  n32 = (N / BLOCK_SIZE | 0) * BLOCK_SIZE;
  if (n32 !== 0) {
    for (j = 0; j < n32; j += BLOCK_SIZE) {
      ip = offsetIPIV;
      for (i = 0, k = k1; i < nrows; i++, k += inck) {
        row = IPIV[ip];
        if (row !== k) {
          ia1 = offsetA + k * strideA1;
          ia2 = offsetA + row * strideA1;
          for (n = j; n < j + BLOCK_SIZE; n++) {
            o = n * strideA2;
            tmp = A[ia1 + o];
            A[ia1 + o] = A[ia2 + o];
            A[ia2 + o] = tmp;
          }
        }
        ip += strideIPIV;
      }
    }
  }
  if (n32 !== N) {
    ip = offsetIPIV;
    for (i = 0, k = k1; i < nrows; i++, k += inck) {
      row = IPIV[ip];
      if (row !== k) {
        ia1 = offsetA + k * strideA1;
        ia2 = offsetA + row * strideA1;
        for (n = n32; n < N; n++) {
          o = n * strideA2;
          tmp = A[ia1 + o];
          A[ia1 + o] = A[ia2 + o];
          A[ia2 + o] = tmp;
        }
      }
      ip += strideIPIV;
    }
  }
  return A;
}
var base_default10 = dlaswp;

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
var base_default11 = dtrsm;

// ../notes/lib/lapack/base/dgbtrf/lib/base.js
var NB = 32;
var NBMAX = 64;
var LDWORK = NBMAX + 1;
function dgbtrf(M5, N, kl, ku, AB, strideAB1, strideAB2, offsetAB, IPIV, strideIPIV, offsetIPIV) {
  var WORK13;
  var WORK31;
  var minMN;
  var info;
  var temp;
  var sa1;
  var sa2;
  var kv;
  var km;
  var jp;
  var jb;
  var jm;
  var ju;
  var i2;
  var i3;
  var j2;
  var j3;
  var k2;
  var nw;
  var ip;
  var ii;
  var jj;
  var i;
  var j;
  sa1 = strideAB1;
  sa2 = strideAB2;
  kv = ku + kl;
  info = 0;
  if (M5 === 0 || N === 0) {
    return 0;
  }
  if (NB <= 1 || NB > kl) {
    return base_default8(M5, N, kl, ku, AB, sa1, sa2, offsetAB, IPIV, strideIPIV, offsetIPIV);
  }
  minMN = Math.min(M5, N);
  WORK13 = new import_lib.default(LDWORK * NBMAX);
  WORK31 = new import_lib.default(LDWORK * NBMAX);
  for (j = 0; j < NB; j++) {
    for (i = 0; i < j; i++) {
      WORK13[i + j * LDWORK] = 0;
    }
  }
  for (j = 0; j < NB; j++) {
    for (i = j + 1; i < NB; i++) {
      WORK31[i + j * LDWORK] = 0;
    }
  }
  for (j = ku + 1; j < Math.min(kv, N); j++) {
    for (i = kv - j; i < kl; i++) {
      AB[offsetAB + i * sa1 + j * sa2] = 0;
    }
  }
  ju = 0;
  for (j = 0; j < minMN; j += NB) {
    jb = Math.min(NB, minMN - j);
    i2 = Math.min(kl - jb, M5 - j - jb);
    if (i2 < 0) {
      i2 = 0;
    }
    i3 = Math.min(jb, M5 - j - kl);
    if (i3 < 0) {
      i3 = 0;
    }
    for (jj = j; jj < j + jb; jj++) {
      if (jj + kv < N) {
        for (i = 0; i < kl; i++) {
          AB[offsetAB + i * sa1 + (jj + kv) * sa2] = 0;
        }
      }
      km = Math.min(kl, M5 - jj - 1);
      jp = base_default4(km + 1, AB, sa1, offsetAB + kv * sa1 + jj * sa2);
      IPIV[offsetIPIV + jj * strideIPIV] = jp + jj - j;
      if (AB[offsetAB + (kv + jp) * sa1 + jj * sa2] !== 0) {
        ju = Math.max(ju, Math.min(jj + ku + jp, N - 1));
        if (jp !== 0) {
          if (jp + jj < j + kl) {
            base_default7(jb, AB, sa2 - sa1, offsetAB + (kv + jj - j) * sa1 + j * sa2, AB, sa2 - sa1, offsetAB + (kv + jp + jj - j) * sa1 + j * sa2);
          } else {
            base_default7(jj - j, AB, sa2 - sa1, offsetAB + (kv + jj - j) * sa1 + j * sa2, WORK31, LDWORK, (jp + jj - j - kl) * 1);
            base_default7(j + jb - jj, AB, sa2 - sa1, offsetAB + kv * sa1 + jj * sa2, AB, sa2 - sa1, offsetAB + (kv + jp) * sa1 + jj * sa2);
          }
        }
        base_default6(km, 1 / AB[offsetAB + kv * sa1 + jj * sa2], AB, sa1, offsetAB + (kv + 1) * sa1 + jj * sa2);
        jm = Math.min(ju, j + jb - 1);
        if (jm > jj) {
          base_default5(km, jm - jj, -1, AB, sa1, offsetAB + (kv + 1) * sa1 + jj * sa2, AB, sa2 - sa1, offsetAB + (kv - 1) * sa1 + (jj + 1) * sa2, AB, sa1, sa2 - sa1, offsetAB + kv * sa1 + (jj + 1) * sa2);
        }
      } else if (info === 0) {
        info = jj + 1;
      }
      nw = Math.min(jj - j + 1, i3);
      if (nw > 0) {
        base_default(nw, AB, sa1, offsetAB + (kv + kl - jj + j) * sa1 + jj * sa2, WORK31, 1, (jj - j) * LDWORK);
      }
    }
    if (j + jb < N) {
      j2 = Math.min(ju - j + 1, kv) - jb;
      if (j2 < 0) {
        j2 = 0;
      }
      j3 = Math.max(0, ju - j - kv + 1);
      base_default10(j2, AB, sa1, sa2 - sa1, offsetAB + (kv - jb) * sa1 + (j + jb) * sa2, 0, jb - 1, 1, IPIV, strideIPIV, offsetIPIV + j * strideIPIV);
      for (i = j; i < j + jb; i++) {
        IPIV[offsetIPIV + i * strideIPIV] += j;
      }
      k2 = j + jb + j2;
      for (i = 0; i < j3; i++) {
        jj = k2 + i;
        for (ii = j + i; ii < j + jb; ii++) {
          ip = IPIV[offsetIPIV + ii * strideIPIV];
          if (ip !== ii) {
            temp = AB[offsetAB + (kv + ii - jj) * sa1 + jj * sa2];
            AB[offsetAB + (kv + ii - jj) * sa1 + jj * sa2] = AB[offsetAB + (kv + ip - jj) * sa1 + jj * sa2];
            AB[offsetAB + (kv + ip - jj) * sa1 + jj * sa2] = temp;
          }
        }
      }
      if (j2 > 0) {
        base_default11("left", "lower", "no-transpose", "unit", jb, j2, 1, AB, sa1, sa2 - sa1, offsetAB + kv * sa1 + j * sa2, AB, sa1, sa2 - sa1, offsetAB + (kv - jb) * sa1 + (j + jb) * sa2);
        if (i2 > 0) {
          base_default9("no-transpose", "no-transpose", i2, j2, jb, -1, AB, sa1, sa2 - sa1, offsetAB + (kv + jb) * sa1 + j * sa2, AB, sa1, sa2 - sa1, offsetAB + (kv - jb) * sa1 + (j + jb) * sa2, 1, AB, sa1, sa2 - sa1, offsetAB + kv * sa1 + (j + jb) * sa2);
        }
        if (i3 > 0) {
          base_default9("no-transpose", "no-transpose", i3, j2, jb, -1, WORK31, 1, LDWORK, 0, AB, sa1, sa2 - sa1, offsetAB + (kv - jb) * sa1 + (j + jb) * sa2, 1, AB, sa1, sa2 - sa1, offsetAB + (kv + kl - jb) * sa1 + (j + jb) * sa2);
        }
      }
      if (j3 > 0) {
        for (jj = 0; jj < j3; jj++) {
          for (ii = jj; ii < jb; ii++) {
            WORK13[ii + jj * LDWORK] = AB[offsetAB + (ii - jj) * sa1 + (jj + j + kv) * sa2];
          }
        }
        base_default11("left", "lower", "no-transpose", "unit", jb, j3, 1, AB, sa1, sa2 - sa1, offsetAB + kv * sa1 + j * sa2, WORK13, 1, LDWORK, 0);
        if (i2 > 0) {
          base_default9("no-transpose", "no-transpose", i2, j3, jb, -1, AB, sa1, sa2 - sa1, offsetAB + (kv + jb) * sa1 + j * sa2, WORK13, 1, LDWORK, 0, 1, AB, sa1, sa2 - sa1, offsetAB + jb * sa1 + (j + kv) * sa2);
        }
        if (i3 > 0) {
          base_default9("no-transpose", "no-transpose", i3, j3, jb, -1, WORK31, 1, LDWORK, 0, WORK13, 1, LDWORK, 0, 1, AB, sa1, sa2 - sa1, offsetAB + kl * sa1 + (j + kv) * sa2);
        }
        for (jj = 0; jj < j3; jj++) {
          for (ii = jj; ii < jb; ii++) {
            AB[offsetAB + (ii - jj) * sa1 + (jj + j + kv) * sa2] = WORK13[ii + jj * LDWORK];
          }
        }
      }
    } else {
      for (i = j; i < j + jb; i++) {
        IPIV[offsetIPIV + i * strideIPIV] += j;
      }
    }
    for (jj = j + jb - 1; jj >= j; jj--) {
      jp = IPIV[offsetIPIV + jj * strideIPIV] - jj;
      if (jp !== 0) {
        if (jp + jj < j + kl) {
          base_default7(jj - j, AB, sa2 - sa1, offsetAB + (kv + jj - j) * sa1 + j * sa2, AB, sa2 - sa1, offsetAB + (kv + jp + jj - j) * sa1 + j * sa2);
        } else {
          base_default7(jj - j, AB, sa2 - sa1, offsetAB + (kv + jj - j) * sa1 + j * sa2, WORK31, LDWORK, (jp + jj - j - kl) * 1);
        }
      }
      nw = Math.min(i3, jj - j + 1);
      if (nw > 0) {
        base_default(nw, WORK31, 1, (jj - j) * LDWORK, AB, sa1, offsetAB + (kv + kl - jj + j) * sa1 + jj * sa2);
      }
    }
  }
  return info;
}
var base_default12 = dgbtrf;

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
var base_default13 = dtbsv;

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
var base_default14 = dgemv;

// ../notes/lib/lapack/base/dgbtrs/lib/base.js
function dgbtrs(trans, N, kl, ku, nrhs, AB, strideAB1, strideAB2, offsetAB, IPIV, strideIPIV, offsetIPIV, B, strideB1, strideB2, offsetB) {
  var notran;
  var lnoti;
  var sb1;
  var sb2;
  var sa1;
  var sa2;
  var kd;
  var lm;
  var l;
  var i;
  var j;
  if (N === 0 || nrhs === 0) {
    return 0;
  }
  sa1 = strideAB1;
  sa2 = strideAB2;
  sb1 = strideB1;
  sb2 = strideB2;
  kd = ku + kl;
  lnoti = kl > 0;
  notran = trans === "no-transpose";
  if (notran) {
    if (lnoti) {
      for (j = 0; j < N - 1; j++) {
        lm = Math.min(kl, N - j - 1);
        l = IPIV[offsetIPIV + j * strideIPIV];
        if (l !== j) {
          base_default7(nrhs, B, sb2, offsetB + l * sb1, B, sb2, offsetB + j * sb1);
        }
        base_default5(lm, nrhs, -1, AB, sa1, offsetAB + (kd + 1) * sa1 + j * sa2, B, sb2, offsetB + j * sb1, B, sb1, sb2, offsetB + (j + 1) * sb1);
      }
    }
    for (i = 0; i < nrhs; i++) {
      base_default13("upper", "no-transpose", "non-unit", N, kl + ku, AB, sa1, sa2, offsetAB, B, sb1, offsetB + i * sb2);
    }
  } else {
    for (i = 0; i < nrhs; i++) {
      base_default13("upper", "transpose", "non-unit", N, kl + ku, AB, sa1, sa2, offsetAB, B, sb1, offsetB + i * sb2);
    }
    if (lnoti) {
      for (j = N - 2; j >= 0; j--) {
        lm = Math.min(kl, N - j - 1);
        base_default14("transpose", lm, nrhs, -1, B, sb1, sb2, offsetB + (j + 1) * sb1, AB, sa1, offsetAB + (kd + 1) * sa1 + j * sa2, 1, B, sb2, offsetB + j * sb1);
        l = IPIV[offsetIPIV + j * strideIPIV];
        if (l !== j) {
          base_default7(nrhs, B, sb2, offsetB + l * sb1, B, sb2, offsetB + j * sb1);
        }
      }
    }
  }
  return 0;
}
var base_default15 = dgbtrs;

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
var base_default16 = dlacpy;

// ../notes/lib/arpack/base/dsaupd/lib/base.js
var import_lib5 = __toESM(require_lib15(), 1);

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
var base_default17 = dlamch;

// ../notes/lib/blas/base/ddot/lib/base.js
var M4 = 5;
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
    m = N % M4;
    if (m > 0) {
      for (i = 0; i < m; i++) {
        dtemp += x[ix] * y[iy];
        ix += 1;
        iy += 1;
      }
    }
    if (N < M4) {
      return dtemp;
    }
    for (i = m; i < N; i += M4) {
      dtemp += x[ix] * y[iy] + x[ix + 1] * y[iy + 1] + x[ix + 2] * y[iy + 2] + x[ix + 3] * y[iy + 3] + x[ix + 4] * y[iy + 4];
      ix += M4;
      iy += M4;
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
var base_default18 = ddot;

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
var base_default19 = dnrm2;

// ../notes/lib/arpack/base/dgetv0/lib/base.js
var import_lib3 = __toESM(require_lib15(), 1);

// ../notes/lib/lapack/base/dlarnv/lib/base.js
var import_lib2 = __toESM(require_lib18(), 1);

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
var base_default20 = dlaruv;

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
  u = new import_lib2.default(LV);
  for (iv = 0; iv < N; iv += LV / 2) {
    il = Math.min(LV / 2, N - iv);
    if (idist === 3) {
      il2 = 2 * il;
    } else {
      il2 = il;
    }
    base_default20(iseed, strideISEED, offsetISEED, il2, u, 1, 0);
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
var base_default21 = dlarnv;

// ../notes/lib/arpack/base/dgetv0/lib/base.js
function dgetv0(state, ido, bmat, itry, initv, N, j, V, strideV1, strideV2, offsetV, resid, strideResid, offsetResid, rnorm, ipntr, strideIpntr, offsetIpntr, workd, strideWorkd, offsetWorkd) {
  var entry;
  var ierr;
  var ip0;
  var ip1;
  var w0;
  var wn;
  var jj;
  ierr = 0;
  w0 = offsetWorkd;
  wn = offsetWorkd + N * strideWorkd;
  ip0 = offsetIpntr;
  ip1 = offsetIpntr + strideIpntr;
  if (!state.inited) {
    state.iseed = new import_lib3.default([1, 3, 5, 7]);
    state.first = false;
    state.orth = false;
    state.iter = 0;
    state.rnorm0 = 0;
    state.inited = true;
  }
  if (ido[0] === 0) {
    entry = 0;
  } else if (state.first) {
    entry = 20;
  } else if (state.orth) {
    entry = 40;
  } else {
    entry = 1;
  }
  if (entry === 0) {
    ierr = 0;
    state.iter = 0;
    state.first = false;
    state.orth = false;
    if (!initv) {
      base_default21(2, state.iseed, 1, 0, N, resid, strideResid, offsetResid);
    }
    if (itry === 1) {
      ipntr[ip0] = 0;
      ipntr[ip1] = N;
      base_default(N, resid, strideResid, offsetResid, workd, strideWorkd, w0);
      ido[0] = -1;
      return ierr;
    }
    if (itry > 1 && bmat === "generalized") {
      base_default(N, resid, strideResid, offsetResid, workd, strideWorkd, wn);
    }
    entry = 1;
  }
  if (entry === 1) {
    state.first = true;
    if (itry === 1) {
      base_default(N, workd, strideWorkd, wn, resid, strideResid, offsetResid);
    }
    if (bmat === "generalized") {
      ipntr[ip0] = N;
      ipntr[ip1] = 0;
      ido[0] = 2;
      return ierr;
    }
    base_default(N, resid, strideResid, offsetResid, workd, strideWorkd, w0);
    entry = 20;
  }
  if (entry === 20) {
    state.first = false;
    if (bmat === "generalized") {
      state.rnorm0 = Math.sqrt(Math.abs(base_default18(N, resid, strideResid, offsetResid, workd, strideWorkd, w0)));
    } else {
      state.rnorm0 = base_default19(N, resid, strideResid, offsetResid);
    }
    rnorm[0] = state.rnorm0;
    if (j === 1) {
      ido[0] = 99;
      return ierr;
    }
    state.orth = true;
    entry = 30;
  }
  for (; ; ) {
    if (entry === 30) {
      base_default14("transpose", N, j - 1, 1, V, strideV1, strideV2, offsetV, workd, strideWorkd, w0, 0, workd, strideWorkd, wn);
      base_default14("no-transpose", N, j - 1, -1, V, strideV1, strideV2, offsetV, workd, strideWorkd, wn, 1, resid, strideResid, offsetResid);
      if (bmat === "generalized") {
        base_default(N, resid, strideResid, offsetResid, workd, strideWorkd, wn);
        ipntr[ip0] = N;
        ipntr[ip1] = 0;
        ido[0] = 2;
        return ierr;
      }
      base_default(N, resid, strideResid, offsetResid, workd, strideWorkd, w0);
      entry = 40;
    }
    if (entry === 40) {
      if (bmat === "generalized") {
        rnorm[0] = Math.sqrt(Math.abs(base_default18(N, resid, strideResid, offsetResid, workd, strideWorkd, w0)));
      } else {
        rnorm[0] = base_default19(N, resid, strideResid, offsetResid);
      }
      if (rnorm[0] > 0.717 * state.rnorm0) {
        ido[0] = 99;
        return ierr;
      }
      state.iter += 1;
      if (state.iter <= 5) {
        state.rnorm0 = rnorm[0];
        entry = 30;
        continue;
      }
      for (jj = 0; jj < N; jj++) {
        resid[offsetResid + jj * strideResid] = 0;
      }
      rnorm[0] = 0;
      ierr = -1;
      ido[0] = 99;
      return ierr;
    }
  }
}
var base_default22 = dgetv0;

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
  smlnum = base_default17("safe-minimum");
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
var base_default23 = dlascl;

// ../notes/lib/arpack/base/dsaitr/lib/base.js
function dsaitr(state, ido, bmat, N, k, np, mode, resid, strideResid, offsetResid, rnorm, V, strideV1, strideV2, offsetV, H, strideH1, strideH2, offsetH, ipntr, strideIpntr, offsetIpntr, workd, strideWorkd, offsetWorkd) {
  var generalized;
  var rnorm1;
  var temp1;
  var wnorm;
  var info;
  var ipj;
  var irj;
  var ivj;
  var pc;
  var jj;
  var oc;
  var hj;
  generalized = bmat === "generalized";
  if (!state.saitrInit) {
    state.safmin = base_default17("safe-minimum");
    state.gv0 = {};
    state.saitrInit = true;
  }
  info = 0;
  if (ido[0] === 0) {
    state.step3 = false;
    state.step4 = false;
    state.rstart = false;
    state.orth1 = false;
    state.orth2 = false;
    state.j = k + 1;
    state.ipj = 0;
    state.irj = N;
    state.ivj = 2 * N;
  }
  ipj = state.ipj;
  irj = state.irj;
  ivj = state.ivj;
  if (state.step3) {
    pc = 50;
  } else if (state.step4) {
    pc = 60;
  } else if (state.orth1) {
    pc = 70;
  } else if (state.orth2) {
    pc = 90;
  } else if (state.rstart) {
    pc = 30;
  } else {
    pc = 1e3;
  }
  for (; ; ) {
    oc = offsetV + (state.j - 1) * strideV2;
    hj = offsetH + (state.j - 1) * strideH1;
    if (pc === 1e3) {
      if (rnorm[0] > 0) {
        pc = 40;
      } else {
        state.itry = 1;
        pc = 20;
      }
    }
    if (pc === 20) {
      state.rstart = true;
      ido[0] = 0;
      pc = 30;
    }
    if (pc === 30) {
      state.ierr = base_default22(state.gv0, ido, bmat, state.itry, false, N, state.j, V, strideV1, strideV2, offsetV, resid, strideResid, offsetResid, rnorm, ipntr, strideIpntr, offsetIpntr, workd, strideWorkd, offsetWorkd);
      if (ido[0] !== 99) {
        return info;
      }
      if (state.ierr < 0) {
        state.itry += 1;
        if (state.itry <= 3) {
          pc = 20;
          continue;
        }
        info = state.j - 1;
        ido[0] = 99;
        return info;
      }
      pc = 40;
    }
    if (pc === 40) {
      base_default(N, resid, strideResid, offsetResid, V, strideV1, oc);
      if (rnorm[0] >= state.safmin) {
        temp1 = 1 / rnorm[0];
        base_default6(N, temp1, V, strideV1, oc);
        base_default6(N, temp1, workd, strideWorkd, offsetWorkd + ipj * strideWorkd);
      } else {
        base_default23("general", 0, 0, rnorm[0], 1, N, 1, V, strideV1, strideV2, oc);
        base_default23("general", 0, 0, rnorm[0], 1, N, 1, workd, strideWorkd, strideWorkd, offsetWorkd + ipj * strideWorkd);
      }
      state.step3 = true;
      base_default(N, V, strideV1, oc, workd, strideWorkd, offsetWorkd + ivj * strideWorkd);
      ipntr[offsetIpntr] = ivj;
      ipntr[offsetIpntr + strideIpntr] = irj;
      ipntr[offsetIpntr + 2 * strideIpntr] = ipj;
      ido[0] = 1;
      return info;
    }
    if (pc === 50) {
      state.step3 = false;
      base_default(N, workd, strideWorkd, offsetWorkd + irj * strideWorkd, resid, strideResid, offsetResid);
      if (mode === 2) {
        pc = 65;
      } else {
        if (generalized) {
          state.step4 = true;
          ipntr[offsetIpntr] = irj;
          ipntr[offsetIpntr + strideIpntr] = ipj;
          ido[0] = 2;
          return info;
        }
        base_default(N, resid, strideResid, offsetResid, workd, strideWorkd, offsetWorkd + ipj * strideWorkd);
        pc = 60;
      }
    }
    if (pc === 60) {
      state.step4 = false;
      pc = 65;
    }
    if (pc === 65) {
      if (mode === 2) {
        wnorm = Math.sqrt(Math.abs(base_default18(N, resid, strideResid, offsetResid, workd, strideWorkd, offsetWorkd + ivj * strideWorkd)));
      } else if (generalized) {
        wnorm = Math.sqrt(Math.abs(base_default18(N, resid, strideResid, offsetResid, workd, strideWorkd, offsetWorkd + ipj * strideWorkd)));
      } else {
        wnorm = base_default19(N, resid, strideResid, offsetResid);
      }
      state.wnorm = wnorm;
      if (mode === 2) {
        base_default14("transpose", N, state.j, 1, V, strideV1, strideV2, offsetV, workd, strideWorkd, offsetWorkd + ivj * strideWorkd, 0, workd, strideWorkd, offsetWorkd + irj * strideWorkd);
      } else {
        base_default14("transpose", N, state.j, 1, V, strideV1, strideV2, offsetV, workd, strideWorkd, offsetWorkd + ipj * strideWorkd, 0, workd, strideWorkd, offsetWorkd + irj * strideWorkd);
      }
      base_default14("no-transpose", N, state.j, -1, V, strideV1, strideV2, offsetV, workd, strideWorkd, offsetWorkd + irj * strideWorkd, 1, resid, strideResid, offsetResid);
      H[hj + strideH2] = workd[offsetWorkd + (irj + state.j - 1) * strideWorkd];
      if (state.j === 1 || state.rstart) {
        H[hj] = 0;
      } else {
        H[hj] = rnorm[0];
      }
      state.orth1 = true;
      state.iter = 0;
      if (generalized) {
        base_default(N, resid, strideResid, offsetResid, workd, strideWorkd, offsetWorkd + irj * strideWorkd);
        ipntr[offsetIpntr] = irj;
        ipntr[offsetIpntr + strideIpntr] = ipj;
        ido[0] = 2;
        return info;
      }
      base_default(N, resid, strideResid, offsetResid, workd, strideWorkd, offsetWorkd + ipj * strideWorkd);
      pc = 70;
    }
    if (pc === 70) {
      state.orth1 = false;
      if (generalized) {
        rnorm[0] = Math.sqrt(Math.abs(base_default18(N, resid, strideResid, offsetResid, workd, strideWorkd, offsetWorkd + ipj * strideWorkd)));
      } else {
        rnorm[0] = base_default19(N, resid, strideResid, offsetResid);
      }
      if (rnorm[0] > 0.717 * state.wnorm) {
        pc = 100;
      } else {
        pc = 80;
      }
    }
    if (pc === 80) {
      base_default14("transpose", N, state.j, 1, V, strideV1, strideV2, offsetV, workd, strideWorkd, offsetWorkd + ipj * strideWorkd, 0, workd, strideWorkd, offsetWorkd + irj * strideWorkd);
      base_default14("no-transpose", N, state.j, -1, V, strideV1, strideV2, offsetV, workd, strideWorkd, offsetWorkd + irj * strideWorkd, 1, resid, strideResid, offsetResid);
      if (state.j === 1 || state.rstart) {
        H[hj] = 0;
      }
      H[hj + strideH2] += workd[offsetWorkd + (irj + state.j - 1) * strideWorkd];
      state.orth2 = true;
      if (generalized) {
        base_default(N, resid, strideResid, offsetResid, workd, strideWorkd, offsetWorkd + irj * strideWorkd);
        ipntr[offsetIpntr] = irj;
        ipntr[offsetIpntr + strideIpntr] = ipj;
        ido[0] = 2;
        return info;
      }
      base_default(N, resid, strideResid, offsetResid, workd, strideWorkd, offsetWorkd + ipj * strideWorkd);
      pc = 90;
    }
    if (pc === 90) {
      if (generalized) {
        rnorm1 = Math.sqrt(Math.abs(base_default18(N, resid, strideResid, offsetResid, workd, strideWorkd, offsetWorkd + ipj * strideWorkd)));
      } else {
        rnorm1 = base_default19(N, resid, strideResid, offsetResid);
      }
      if (rnorm1 > 0.717 * rnorm[0]) {
        rnorm[0] = rnorm1;
      } else {
        rnorm[0] = rnorm1;
        state.iter += 1;
        if (state.iter <= 1) {
          pc = 80;
          continue;
        }
        for (jj = 0; jj < N; jj++) {
          resid[offsetResid + jj * strideResid] = 0;
        }
        rnorm[0] = 0;
      }
      pc = 100;
    }
    if (pc === 100) {
      state.rstart = false;
      state.orth2 = false;
      if (H[hj] < 0) {
        H[hj] = -H[hj];
        if (state.j < k + np) {
          base_default6(N, -1, V, strideV1, offsetV + state.j * strideV2);
        } else {
          base_default6(N, -1, resid, strideResid, offsetResid);
        }
      }
      state.j += 1;
      if (state.j > k + np) {
        ido[0] = 99;
        return info;
      }
      pc = 1e3;
    }
  }
}
var base_default24 = dsaitr;

// ../notes/lib/arpack/base/dstqrb/lib/base.js
var import_lib4 = __toESM(require_lib18(), 1);

// ../notes/lib/lapack/base/dlassq/lib/base.js
var TSML2 = Math.pow(2, -511);
var TBIG2 = Math.pow(2, 486);
var SSML2 = Math.pow(2, 537);
var SBIG2 = Math.pow(2, -538);
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
  if (sumsq > 0) {
    ax = scale * Math.sqrt(sumsq);
    if (ax > TBIG2) {
      if (scale > 1) {
        scale *= SBIG2;
        abig += scale * (scale * sumsq);
      } else {
        abig += scale * (scale * (SBIG2 * (SBIG2 * sumsq)));
      }
    } else if (ax < TSML2) {
      if (notbig) {
        if (scale < 1) {
          scale *= SSML2;
          asml += scale * (scale * sumsq);
        } else {
          asml += scale * (scale * (SSML2 * (SSML2 * sumsq)));
        }
      }
    } else {
      amed += scale * (scale * sumsq);
    }
  }
  if (abig > 0) {
    if (amed > 0 || amed !== amed) {
      abig += amed * SBIG2 * SBIG2;
    }
    scale = 1 / SBIG2;
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
      scale = 1;
      sumsq = ymax * ymax * (1 + ymin / ymax * (ymin / ymax));
    } else {
      scale = 1 / SSML2;
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
var base_default25 = dlassq;

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
      out = base_default25(N - 1, e, strideE, offsetE, 0, 1);
      sum = 2 * out.sumsq;
    } else {
      sum = 1;
    }
    if (N > 1) {
      out = base_default25(N, d, strideD, offsetD, out.scl, sum);
    } else {
      out = base_default25(N, d, strideD, offsetD, 0, 1);
    }
    anorm = out.scl * Math.sqrt(out.sumsq);
  }
  return anorm;
}
var base_default26 = dlanst;

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
var base_default27 = dlapy2;

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
var base_default28 = dlae2;

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
var base_default29 = dlaev2;

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
var base_default30 = dlartg;

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
var base_default31 = dlasr;

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
var base_default32 = dlasrt;

// ../notes/lib/arpack/base/dstqrb/lib/base.js
var MAXIT = 30;
function dstqrb(N, d, strideD, offsetD, e, strideE, offsetE, Z, strideZ, offsetZ, WORK, strideWork, offsetWork) {
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
  var zi;
  var zj;
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
  rot = new import_lib4.default(3);
  info = 0;
  icompz = 2;
  if (N === 0) {
    return 0;
  }
  if (N === 1) {
    if (icompz === 2) {
      Z[offsetZ] = 1;
    }
    return 0;
  }
  eps = base_default17("epsilon");
  eps2 = eps * eps;
  safmin = base_default17("safe-minimum");
  safmax = 1 / safmin;
  ssfmax = Math.sqrt(safmax) / 3;
  ssfmin = Math.sqrt(safmin) / eps2;
  if (icompz === 2) {
    for (j = 0; j < N - 1; j++) {
      Z[offsetZ + j * strideZ] = 0;
    }
    Z[offsetZ + (N - 1) * strideZ] = 1;
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
      if (m > N - 2) {
        m = N - 1;
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
    anorm = base_default26("max", lend - l + 1, d, strideD, offsetD + l * strideD, e, strideE, offsetE + l * strideE);
    iscale = 0;
    if (anorm === 0) {
      continue;
    }
    if (anorm > ssfmax) {
      iscale = 1;
      base_default23("general", 0, 0, anorm, ssfmax, lend - l + 1, 1, d, strideD, 0, offsetD + l * strideD);
      base_default23("general", 0, 0, anorm, ssfmax, lend - l, 1, e, strideE, 0, offsetE + l * strideE);
    } else if (anorm < ssfmin) {
      iscale = 2;
      base_default23("general", 0, 0, anorm, ssfmin, lend - l + 1, 1, d, strideD, 0, offsetD + l * strideD);
      base_default23("general", 0, 0, anorm, ssfmin, lend - l, 1, e, strideE, 0, offsetE + l * strideE);
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
            obj = base_default29(d[offsetD + l * strideD], e[offsetE + l * strideE], d[offsetD + (l + 1) * strideD]);
            c = obj.cs1;
            s = obj.sn1;
            WORK[offsetWork + l * strideWork] = c;
            WORK[offsetWork + (N - 1 + l) * strideWork] = s;
            tst = Z[offsetZ + (l + 1) * strideZ];
            Z[offsetZ + (l + 1) * strideZ] = c * tst - s * Z[offsetZ + l * strideZ];
            Z[offsetZ + l * strideZ] = s * tst + c * Z[offsetZ + l * strideZ];
          } else {
            obj = base_default28(d[offsetD + l * strideD], e[offsetE + l * strideE], d[offsetD + (l + 1) * strideD]);
          }
          d[offsetD + l * strideD] = obj.rt1;
          d[offsetD + (l + 1) * strideD] = obj.rt2;
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
        r = base_default27(g, 1);
        g = d[offsetD + m * strideD] - p + e[offsetE + l * strideE] / (g + (g < 0 || Object.is(g, -0) ? -r : r));
        s = 1;
        c = 1;
        p = 0;
        for (i = m - 1; i >= l; i--) {
          f = s * e[offsetE + i * strideE];
          b = c * e[offsetE + i * strideE];
          base_default30(g, f, rot);
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
          base_default31("right", "variable", "backward", 1, mm, WORK, strideWork, offsetWork + l * strideWork, WORK, strideWork, offsetWork + (N - 1 + l) * strideWork, Z, strideZ, strideZ, offsetZ + l * strideZ);
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
            obj = base_default29(d[offsetD + (l - 1) * strideD], e[offsetE + (l - 1) * strideE], d[offsetD + l * strideD]);
            c = obj.cs1;
            s = obj.sn1;
            tst = Z[offsetZ + l * strideZ];
            Z[offsetZ + l * strideZ] = c * tst - s * Z[offsetZ + (l - 1) * strideZ];
            Z[offsetZ + (l - 1) * strideZ] = s * tst + c * Z[offsetZ + (l - 1) * strideZ];
          } else {
            obj = base_default28(d[offsetD + (l - 1) * strideD], e[offsetE + (l - 1) * strideE], d[offsetD + l * strideD]);
          }
          d[offsetD + (l - 1) * strideD] = obj.rt1;
          d[offsetD + l * strideD] = obj.rt2;
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
        r = base_default27(g, 1);
        g = d[offsetD + m * strideD] - p + e[offsetE + (l - 1) * strideE] / (g + (g < 0 || Object.is(g, -0) ? -r : r));
        s = 1;
        c = 1;
        p = 0;
        for (i = m; i <= l - 1; i++) {
          f = s * e[offsetE + i * strideE];
          b = c * e[offsetE + i * strideE];
          base_default30(g, f, rot);
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
          base_default31("right", "variable", "forward", 1, mm, WORK, strideWork, offsetWork + m * strideWork, WORK, strideWork, offsetWork + (N - 1 + m) * strideWork, Z, strideZ, strideZ, offsetZ + m * strideZ);
        }
        d[offsetD + l * strideD] -= p;
        e[offsetE + (l - 1) * strideE] = g;
      }
    }
    if (iscale === 1) {
      base_default23("general", 0, 0, ssfmax, anorm, lendsv - lsv + 1, 1, d, strideD, 0, offsetD + lsv * strideD);
      base_default23("general", 0, 0, ssfmax, anorm, lendsv - lsv, 1, e, strideE, 0, offsetE + lsv * strideE);
    } else if (iscale === 2) {
      base_default23("general", 0, 0, ssfmin, anorm, lendsv - lsv + 1, 1, d, strideD, 0, offsetD + lsv * strideD);
      base_default23("general", 0, 0, ssfmin, anorm, lendsv - lsv, 1, e, strideE, 0, offsetE + lsv * strideE);
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
    base_default32("increasing", N, d, strideD, offsetD);
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
        zi = offsetZ + i * strideZ;
        zj = offsetZ + k * strideZ;
        p = Z[zj];
        Z[zj] = Z[zi];
        Z[zi] = p;
      }
    }
  }
  return 0;
}
var base_default33 = dstqrb;

// ../notes/lib/arpack/base/dseigt/lib/base.js
function dseigt(rnorm, N, H, strideH1, strideH2, offsetH, eig, strideEig, offsetEig, bounds, strideBounds, offsetBounds, workl, strideWorkl, offsetWorkl) {
  var ierr;
  var ib;
  var k;
  base_default(N, H, strideH1, offsetH + strideH2, eig, strideEig, offsetEig);
  base_default(N - 1, H, strideH1, offsetH + strideH1, workl, strideWorkl, offsetWorkl);
  ierr = base_default33(N, eig, strideEig, offsetEig, workl, strideWorkl, offsetWorkl, bounds, strideBounds, offsetBounds, workl, strideWorkl, offsetWorkl + N * strideWorkl);
  if (ierr !== 0) {
    return ierr;
  }
  ib = offsetBounds;
  for (k = 0; k < N; k++) {
    bounds[ib] = rnorm * Math.abs(bounds[ib]);
    ib += strideBounds;
  }
  return ierr;
}
var base_default34 = dseigt;

// ../notes/lib/arpack/base/dsortr/lib/base.js
function dsortr(which, apply, N, x1, strideX1, offsetX1, x2, strideX2, offsetX2) {
  var igap;
  var swap;
  var temp;
  var a1;
  var b1;
  var a2;
  var b2;
  var i;
  var j;
  igap = N >> 1;
  while (igap > 0) {
    for (i = igap; i < N; i++) {
      j = i - igap;
      while (j >= 0) {
        a1 = offsetX1 + j * strideX1;
        b1 = offsetX1 + (j + igap) * strideX1;
        if (which === "SA") {
          swap = x1[a1] < x1[b1];
        } else if (which === "SM") {
          swap = Math.abs(x1[a1]) < Math.abs(x1[b1]);
        } else if (which === "LA") {
          swap = x1[a1] > x1[b1];
        } else {
          swap = Math.abs(x1[a1]) > Math.abs(x1[b1]);
        }
        if (!swap) {
          break;
        }
        temp = x1[a1];
        x1[a1] = x1[b1];
        x1[b1] = temp;
        if (apply) {
          a2 = offsetX2 + j * strideX2;
          b2 = offsetX2 + (j + igap) * strideX2;
          temp = x2[a2];
          x2[a2] = x2[b2];
          x2[b2] = temp;
        }
        j -= igap;
      }
    }
    igap >>= 1;
  }
}
var base_default35 = dsortr;

// ../notes/lib/arpack/base/dsgets/lib/base.js
function dsgets(ishift, which, kev, np, ritz, strideRitz, offsetRitz, bounds, strideBounds, offsetBounds, shifts, strideShifts, offsetShifts) {
  var kevd2;
  var mn;
  var mx;
  if (which === "BE") {
    base_default35("LA", true, kev + np, ritz, strideRitz, offsetRitz, bounds, strideBounds, offsetBounds);
    kevd2 = kev >> 1;
    if (kev > 1) {
      mn = Math.min(kevd2, np);
      mx = Math.max(kevd2, np);
      base_default7(mn, ritz, strideRitz, offsetRitz, ritz, strideRitz, offsetRitz + mx * strideRitz);
      base_default7(mn, bounds, strideBounds, offsetBounds, bounds, strideBounds, offsetBounds + mx * strideBounds);
    }
  } else {
    base_default35(which, true, kev + np, ritz, strideRitz, offsetRitz, bounds, strideBounds, offsetBounds);
  }
  if (ishift === 1 && np > 0) {
    base_default35("SM", true, np, bounds, strideBounds, offsetBounds, ritz, strideRitz, offsetRitz);
    base_default(np, ritz, strideRitz, offsetRitz, shifts, strideShifts, offsetShifts);
  }
}
var base_default36 = dsgets;

// ../notes/lib/arpack/base/dsconv/lib/base.js
function dsconv(N, ritz, strideRITZ, offsetRITZ, bounds, strideBOUNDS, offsetBOUNDS, tol) {
  var eps23;
  var nconv;
  var temp;
  var ir;
  var ib;
  var i;
  eps23 = Math.pow(base_default17("epsilon"), 2 / 3);
  nconv = 0;
  ir = offsetRITZ;
  ib = offsetBOUNDS;
  for (i = 0; i < N; i++) {
    temp = Math.max(eps23, Math.abs(ritz[ir]));
    if (bounds[ib] <= tol * temp) {
      nconv += 1;
    }
    ir += strideRITZ;
    ib += strideBOUNDS;
  }
  return nconv;
}
var base_default37 = dsconv;

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
var base_default38 = dlaset;

// ../notes/lib/arpack/base/dsapps/lib/base.js
function dsapps(n, kev, np, shift, strideShift, offsetShift, v, strideV1, strideV2, offsetV, h, strideH1, strideH2, offsetH, resid, strideResid, offsetResid, q, strideQ1, strideQ2, offsetQ, workd, strideWorkd, offsetWorkd) {
  var epsmch;
  var kplusp;
  var istart;
  var itop;
  var iend;
  var big;
  var rot;
  var a1;
  var a2;
  var a3;
  var a4;
  var jj;
  var c;
  var f;
  var g;
  var i;
  var j;
  var r;
  var s;
  function ih(ii, col) {
    return offsetH + (ii - 1) * strideH1 + (col - 1) * strideH2;
  }
  function iq(ii, jx) {
    return offsetQ + (ii - 1) * strideQ1 + (jx - 1) * strideQ2;
  }
  function iv(ii, jx) {
    return offsetV + (ii - 1) * strideV1 + (jx - 1) * strideV2;
  }
  epsmch = base_default17("epsilon");
  itop = 1;
  rot = new Float64Array(3);
  kplusp = kev + np;
  base_default38("all", kplusp, kplusp, 0, 1, q, strideQ1, strideQ2, offsetQ);
  if (np === 0) {
    return;
  }
  for (jj = 1; jj <= np; jj++) {
    istart = itop;
    for (; ; ) {
      iend = kplusp;
      for (i = istart; i <= kplusp - 1; i++) {
        big = Math.abs(h[ih(i, 2)]) + Math.abs(h[ih(i + 1, 2)]);
        if (h[ih(i + 1, 1)] <= epsmch * big) {
          h[ih(i + 1, 1)] = 0;
          iend = i;
          break;
        }
      }
      if (istart < iend) {
        f = h[ih(istart, 2)] - shift[offsetShift + (jj - 1) * strideShift];
        g = h[ih(istart + 1, 1)];
        base_default30(f, g, rot);
        c = rot[0];
        s = rot[1];
        r = rot[2];
        a1 = c * h[ih(istart, 2)] + s * h[ih(istart + 1, 1)];
        a2 = c * h[ih(istart + 1, 1)] + s * h[ih(istart + 1, 2)];
        a4 = c * h[ih(istart + 1, 2)] - s * h[ih(istart + 1, 1)];
        a3 = c * h[ih(istart + 1, 1)] - s * h[ih(istart, 2)];
        h[ih(istart, 2)] = c * a1 + s * a2;
        h[ih(istart + 1, 2)] = c * a4 - s * a3;
        h[ih(istart + 1, 1)] = c * a3 + s * a4;
        for (j = 1; j <= Math.min(istart + jj, kplusp); j++) {
          a1 = c * q[iq(j, istart)] + s * q[iq(j, istart + 1)];
          q[iq(j, istart + 1)] = -s * q[iq(j, istart)] + c * q[iq(j, istart + 1)];
          q[iq(j, istart)] = a1;
        }
        for (i = istart + 1; i <= iend - 1; i++) {
          f = h[ih(i, 1)];
          g = s * h[ih(i + 1, 1)];
          h[ih(i + 1, 1)] = c * h[ih(i + 1, 1)];
          base_default30(f, g, rot);
          c = rot[0];
          s = rot[1];
          r = rot[2];
          if (r < 0) {
            r = -r;
            c = -c;
            s = -s;
          }
          h[ih(i, 1)] = r;
          a1 = c * h[ih(i, 2)] + s * h[ih(i + 1, 1)];
          a2 = c * h[ih(i + 1, 1)] + s * h[ih(i + 1, 2)];
          a3 = c * h[ih(i + 1, 1)] - s * h[ih(i, 2)];
          a4 = c * h[ih(i + 1, 2)] - s * h[ih(i + 1, 1)];
          h[ih(i, 2)] = c * a1 + s * a2;
          h[ih(i + 1, 2)] = c * a4 - s * a3;
          h[ih(i + 1, 1)] = c * a3 + s * a4;
          for (j = 1; j <= Math.min(i + jj, kplusp); j++) {
            a1 = c * q[iq(j, i)] + s * q[iq(j, i + 1)];
            q[iq(j, i + 1)] = -s * q[iq(j, i)] + c * q[iq(j, i + 1)];
            q[iq(j, i)] = a1;
          }
        }
      }
      istart = iend + 1;
      if (h[ih(iend, 1)] < 0) {
        h[ih(iend, 1)] = -h[ih(iend, 1)];
        base_default6(kplusp, -1, q, strideQ1, iq(1, iend));
      }
      if (iend < kplusp) {
        continue;
      }
      break;
    }
    for (i = itop; i <= kplusp - 1; i++) {
      if (h[ih(i + 1, 1)] > 0) {
        break;
      }
      itop += 1;
    }
  }
  for (i = itop; i <= kplusp - 1; i++) {
    big = Math.abs(h[ih(i, 2)]) + Math.abs(h[ih(i + 1, 2)]);
    if (h[ih(i + 1, 1)] <= epsmch * big) {
      h[ih(i + 1, 1)] = 0;
    }
  }
  if (h[ih(kev + 1, 1)] > 0) {
    base_default14("no-transpose", n, kplusp, 1, v, strideV1, strideV2, offsetV, q, strideQ1, iq(1, kev + 1), 0, workd, strideWorkd, offsetWorkd + n * strideWorkd);
  }
  for (i = 1; i <= kev; i++) {
    base_default14("no-transpose", n, kplusp - i + 1, 1, v, strideV1, strideV2, offsetV, q, strideQ1, iq(1, kev - i + 1), 0, workd, strideWorkd, offsetWorkd);
    base_default(n, workd, strideWorkd, offsetWorkd, v, strideV1, iv(1, kplusp - i + 1));
  }
  for (i = 1; i <= kev; i++) {
    base_default(n, v, strideV1, iv(1, np + i), v, strideV1, iv(1, i));
  }
  if (h[ih(kev + 1, 1)] > 0) {
    base_default(n, workd, strideWorkd, offsetWorkd + n * strideWorkd, v, strideV1, iv(1, kev + 1));
  }
  base_default6(n, q[iq(kplusp, kev)], resid, strideResid, offsetResid);
  if (h[ih(kev + 1, 1)] > 0) {
    base_default2(n, h[ih(kev + 1, 1)], v, strideV1, iv(1, kev + 1), resid, strideResid, offsetResid);
  }
}
var base_default39 = dsapps;

// ../notes/lib/arpack/base/dsaup2/lib/base.js
function opposite(which) {
  if (which === "LM") {
    return "SM";
  }
  if (which === "SM") {
    return "LM";
  }
  if (which === "LA") {
    return "SA";
  }
  return "LA";
}
function dsaup2(state, ido, bmat, N, which, nev, np, tol, resid, strideResid, offsetResid, mode, iupd, ishift, mxiter, V, strideV1, strideV2, offsetV, H, strideH1, strideH2, offsetH, ritz, strideRitz, offsetRitz, bounds, strideBounds, offsetBounds, Q, strideQ1, strideQ2, offsetQ, workl, strideWorkl, offsetWorkl, ipntr, strideIpntr, offsetIpntr, workd, strideWorkd, offsetWorkd, infoIn) {
  var generalized;
  var nptemp;
  var nevbef;
  var kplusp;
  var resume;
  var nevd2;
  var nevm2;
  var ierr;
  var temp;
  var info;
  var mn;
  var mx;
  var j;
  generalized = bmat === "generalized";
  info = 0;
  if (ido[0] === 0) {
    state.eps23 = Math.pow(base_default17("epsilon"), 2 / 3);
    state.nev0 = nev[0];
    state.np0 = np[0];
    state.kplusp = nev[0] + np[0];
    state.nconv = 0;
    state.iter = 0;
    state.getv0 = true;
    state.update = false;
    state.ushift = false;
    state.cnorm = false;
    state.initv = infoIn !== 0;
    state.gv0 = {};
    state.saitr = {};
    state.rnorm = new Float64Array(1);
  }
  kplusp = state.kplusp;
  if (state.getv0) {
    info = base_default22(state.gv0, ido, bmat, 1, state.initv, N, 1, V, strideV1, strideV2, offsetV, resid, strideResid, offsetResid, state.rnorm, ipntr, strideIpntr, offsetIpntr, workd, strideWorkd, offsetWorkd);
    if (ido[0] !== 99) {
      return info;
    }
    if (state.rnorm[0] === 0) {
      info = -9;
      ido[0] = 99;
      return info;
    }
    state.getv0 = false;
    ido[0] = 0;
  }
  if (state.update) {
    resume = 20;
  } else if (state.ushift) {
    resume = 50;
  } else if (state.cnorm) {
    resume = 100;
  } else {
    resume = 0;
  }
  if (resume === 0) {
    info = base_default24(state.saitr, ido, bmat, N, 0, state.nev0, mode, resid, strideResid, offsetResid, state.rnorm, V, strideV1, strideV2, offsetV, H, strideH1, strideH2, offsetH, ipntr, strideIpntr, offsetIpntr, workd, strideWorkd, offsetWorkd);
    if (ido[0] !== 99) {
      return info;
    }
    if (info > 0) {
      np[0] = info;
      mxiter[0] = state.iter;
      info = -9999;
      ido[0] = 99;
      return info;
    }
    resume = 1e3;
  }
  for (; ; ) {
    if (resume === 1e3) {
      state.iter += 1;
      ido[0] = 0;
      resume = 20;
    }
    if (resume === 20) {
      state.update = true;
      info = base_default24(state.saitr, ido, bmat, N, nev[0], np[0], mode, resid, strideResid, offsetResid, state.rnorm, V, strideV1, strideV2, offsetV, H, strideH1, strideH2, offsetH, ipntr, strideIpntr, offsetIpntr, workd, strideWorkd, offsetWorkd);
      if (ido[0] !== 99) {
        return info;
      }
      if (info > 0) {
        np[0] = info;
        mxiter[0] = state.iter;
        info = -9999;
        ido[0] = 99;
        return info;
      }
      state.update = false;
      ierr = base_default34(state.rnorm[0], kplusp, H, strideH1, strideH2, offsetH, ritz, strideRitz, offsetRitz, bounds, strideBounds, offsetBounds, workl, strideWorkl, offsetWorkl);
      if (ierr !== 0) {
        info = -8;
        ido[0] = 99;
        return info;
      }
      base_default(kplusp, ritz, strideRitz, offsetRitz, workl, strideWorkl, offsetWorkl + kplusp * strideWorkl);
      base_default(kplusp, bounds, strideBounds, offsetBounds, workl, strideWorkl, offsetWorkl + 2 * kplusp * strideWorkl);
      nev[0] = state.nev0;
      np[0] = state.np0;
      base_default36(ishift, which, nev[0], np[0], ritz, strideRitz, offsetRitz, bounds, strideBounds, offsetBounds, workl, strideWorkl, offsetWorkl);
      base_default(nev[0], bounds, strideBounds, offsetBounds + np[0] * strideBounds, workl, strideWorkl, offsetWorkl + np[0] * strideWorkl);
      state.nconv = base_default37(nev[0], ritz, strideRitz, offsetRitz + np[0] * strideRitz, workl, strideWorkl, offsetWorkl + np[0] * strideWorkl, tol);
      nptemp = np[0];
      for (j = 0; j < nptemp; j++) {
        if (bounds[offsetBounds + j * strideBounds] === 0) {
          np[0] -= 1;
          nev[0] += 1;
        }
      }
      if (state.nconv >= state.nev0 || state.iter > mxiter[0] || np[0] === 0) {
        if (which === "BE") {
          base_default35("SA", true, kplusp, ritz, strideRitz, offsetRitz, bounds, strideBounds, offsetBounds);
          nevd2 = state.nev0 / 2 | 0;
          nevm2 = state.nev0 - nevd2;
          if (nev[0] > 1) {
            np[0] = kplusp - state.nev0;
            mn = Math.min(nevd2, np[0]);
            mx = Math.max(kplusp - nevd2, kplusp - np[0]);
            base_default7(mn, ritz, strideRitz, offsetRitz + nevm2 * strideRitz, ritz, strideRitz, offsetRitz + mx * strideRitz);
            base_default7(mn, bounds, strideBounds, offsetBounds + nevm2 * strideBounds, bounds, strideBounds, offsetBounds + mx * strideBounds);
          }
        } else {
          base_default35(opposite(which), true, kplusp, ritz, strideRitz, offsetRitz, bounds, strideBounds, offsetBounds);
        }
        for (j = 0; j < state.nev0; j++) {
          temp = Math.max(state.eps23, Math.abs(ritz[offsetRitz + j * strideRitz]));
          bounds[offsetBounds + j * strideBounds] /= temp;
        }
        base_default35("LA", true, state.nev0, bounds, strideBounds, offsetBounds, ritz, strideRitz, offsetRitz);
        for (j = 0; j < state.nev0; j++) {
          temp = Math.max(state.eps23, Math.abs(ritz[offsetRitz + j * strideRitz]));
          bounds[offsetBounds + j * strideBounds] *= temp;
        }
        if (which === "BE") {
          base_default35("LA", true, state.nconv, ritz, strideRitz, offsetRitz, bounds, strideBounds, offsetBounds);
        } else {
          base_default35(which, true, state.nconv, ritz, strideRitz, offsetRitz, bounds, strideBounds, offsetBounds);
        }
        H[offsetH] = state.rnorm[0];
        if (state.iter > mxiter[0] && state.nconv < nev[0]) {
          info = 1;
        }
        if (np[0] === 0 && state.nconv < state.nev0) {
          info = 2;
        }
        np[0] = state.nconv;
        mxiter[0] = state.iter;
        nev[0] = state.nconv;
        ido[0] = 99;
        return info;
      }
      if (state.nconv < nev[0] && ishift === 1) {
        nevbef = nev[0];
        nev[0] += Math.min(state.nconv, np[0] / 2 | 0);
        if (nev[0] === 1 && kplusp >= 6) {
          nev[0] = kplusp / 2 | 0;
        } else if (nev[0] === 1 && kplusp > 2) {
          nev[0] = 2;
        }
        np[0] = kplusp - nev[0];
        if (nevbef < nev[0]) {
          base_default36(ishift, which, nev[0], np[0], ritz, strideRitz, offsetRitz, bounds, strideBounds, offsetBounds, workl, strideWorkl, offsetWorkl);
        }
      }
      if (ishift === 0) {
        state.ushift = true;
        ido[0] = 3;
        return info;
      }
      resume = 50;
    }
    if (resume === 50) {
      state.ushift = false;
      if (ishift === 0) {
        base_default(np[0], workl, strideWorkl, offsetWorkl, ritz, strideRitz, offsetRitz);
      }
      base_default39(N, nev[0], np[0], ritz, strideRitz, offsetRitz, V, strideV1, strideV2, offsetV, H, strideH1, strideH2, offsetH, resid, strideResid, offsetResid, Q, strideQ1, strideQ2, offsetQ, workd, strideWorkd, offsetWorkd);
      state.cnorm = true;
      if (generalized) {
        base_default(N, resid, strideResid, offsetResid, workd, strideWorkd, offsetWorkd + N * strideWorkd);
        ipntr[offsetIpntr] = N;
        ipntr[offsetIpntr + strideIpntr] = 0;
        ido[0] = 2;
        return info;
      }
      base_default(N, resid, strideResid, offsetResid, workd, strideWorkd, offsetWorkd);
      resume = 100;
    }
    if (resume === 100) {
      if (generalized) {
        state.rnorm[0] = Math.sqrt(Math.abs(base_default18(N, resid, strideResid, offsetResid, workd, strideWorkd, offsetWorkd)));
      } else {
        state.rnorm[0] = base_default19(N, resid, strideResid, offsetResid);
      }
      state.cnorm = false;
      resume = 1e3;
    }
  }
}
var base_default40 = dsaup2;

// ../notes/lib/arpack/base/dsaupd/lib/base.js
function dsaupd(state, ido, bmat, N, which, nev, tol, resid, strideResid, offsetResid, ncv, V, strideV1, strideV2, offsetV, iparam, strideIparam, offsetIparam, ipntr, strideIpntr, offsetIpntr, workd, strideWorkd, offsetWorkd, workl, strideWorkl, offsetWorkl, lworkl, infoIn) {
  var ishift;
  var bounds;
  var ierr;
  var mode;
  var ritz;
  var ldh;
  var next;
  var info;
  var iq;
  var iw;
  var ih;
  var np;
  var j;
  info = 0;
  if (ido[0] === 0) {
    ishift = iparam[offsetIparam];
    state.mxiter = new import_lib5.default([iparam[offsetIparam + 2 * strideIparam]]);
    mode = iparam[offsetIparam + 6 * strideIparam];
    ierr = 0;
    if (N <= 0) {
      ierr = -1;
    } else if (nev <= 0) {
      ierr = -2;
    } else if (ncv <= nev || ncv > N) {
      ierr = -3;
    }
    if (state.mxiter[0] <= 0) {
      ierr = -4;
    }
    if (which !== "LM" && which !== "SM" && which !== "LA" && which !== "SA" && which !== "BE") {
      ierr = -5;
    }
    if (bmat !== "standard" && bmat !== "generalized") {
      ierr = -6;
    }
    if (lworkl < ncv * ncv + 8 * ncv) {
      ierr = -7;
    }
    if (mode < 1 || mode > 5) {
      ierr = -10;
    } else if (mode === 1 && bmat === "generalized") {
      ierr = -11;
    } else if (ishift < 0 || ishift > 1) {
      ierr = -12;
    } else if (nev === 1 && which === "BE") {
      ierr = -13;
    }
    if (ierr !== 0) {
      ido[0] = 99;
      return ierr;
    }
    if (tol <= 0) {
      tol = base_default17("epsilon");
    }
    np = ncv - nev;
    state.nev0 = new import_lib5.default([nev]);
    state.np = new import_lib5.default([np]);
    state.tol = tol;
    state.mode = mode;
    state.ishift = ishift;
    state.bmat = bmat;
    for (j = 0; j < ncv * ncv + 8 * ncv; j++) {
      workl[offsetWorkl + j * strideWorkl] = 0;
    }
    ldh = ncv;
    ih = 1;
    ritz = ih + 2 * ldh;
    bounds = ritz + ncv;
    iq = bounds + ncv;
    iw = iq + ncv * ncv;
    next = iw + 3 * ncv;
    state.ldh = ldh;
    state.ih = ih;
    state.ritz = ritz;
    state.bounds = bounds;
    state.iq = iq;
    state.iw = iw;
    ipntr[offsetIpntr + 3 * strideIpntr] = next;
    ipntr[offsetIpntr + 4 * strideIpntr] = ih;
    ipntr[offsetIpntr + 5 * strideIpntr] = ritz;
    ipntr[offsetIpntr + 6 * strideIpntr] = bounds;
    ipntr[offsetIpntr + 10 * strideIpntr] = iw;
    state.saup2 = {};
  }
  info = base_default40(state.saup2, ido, state.bmat, N, which, state.nev0, state.np, state.tol, resid, strideResid, offsetResid, state.mode, 1, state.ishift, state.mxiter, V, strideV1, strideV2, offsetV, workl, strideWorkl, state.ldh * strideWorkl, offsetWorkl + (state.ih - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (state.ritz - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (state.bounds - 1) * strideWorkl, workl, strideWorkl, state.ldh * strideWorkl, offsetWorkl + (state.iq - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (state.iw - 1) * strideWorkl, ipntr, strideIpntr, offsetIpntr, workd, strideWorkd, offsetWorkd, infoIn);
  if (ido[0] === 3) {
    iparam[offsetIparam + 7 * strideIparam] = state.np[0];
  }
  if (ido[0] !== 99) {
    return info;
  }
  iparam[offsetIparam + 2 * strideIparam] = state.mxiter[0];
  iparam[offsetIparam + 4 * strideIparam] = state.np[0];
  iparam[offsetIparam + 8 * strideIparam] = 0;
  iparam[offsetIparam + 9 * strideIparam] = 0;
  iparam[offsetIparam + 10 * strideIparam] = 0;
  if (info < 0) {
    return info;
  }
  if (info === 2) {
    info = 3;
  }
  return info;
}
var base_default41 = dsaupd;

// ../notes/lib/arpack/base/dseupd/lib/base.js
var import_lib7 = __toESM(require_lib18(), 1);

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
    beta = -sign * base_default27(alpha[offsetAlpha], xnorm);
    safmin = base_default17("safe-minimum") / base_default17("epsilon");
    knt = 0;
    if (Math.abs(beta) < safmin) {
      rsafmn = 1 / safmin;
      do {
        knt += 1;
        base_default6(N - 1, rsafmn, x, strideX, offsetX);
        beta *= rsafmn;
        alpha[offsetAlpha] *= rsafmn;
      } while (Math.abs(beta) < safmin && knt < 20);
      xnorm = base_default19(N - 1, x, strideX, offsetX);
      sign = Math.sign(alpha[offsetAlpha]) || 1;
      beta = -sign * base_default27(alpha[offsetAlpha], xnorm);
    }
    tau[offsetTau] = (beta - alpha[offsetAlpha]) / beta;
    base_default6(N - 1, 1 / (alpha[offsetAlpha] - beta), x, strideX, offsetX);
    for (j = 0; j < knt; j++) {
      beta *= safmin;
    }
    alpha[offsetAlpha] = beta;
  }
}
var base_default42 = dlarfg;

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
var base_default43 = iladlr;

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
var base_default44 = iladlc;

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
      lastc = base_default44(lastv, N, C, strideC1, strideC2, offsetC) + 1;
    } else {
      lastc = base_default43(M5, lastv, C, strideC1, strideC2, offsetC) + 1;
    }
  }
  if (applyLeft) {
    if (lastv > 0) {
      base_default14("transpose", lastv, lastc, 1, C, strideC1, strideC2, offsetC, v, strideV, offsetV, 0, WORK, strideWork, offsetWork);
      base_default5(lastv, lastc, -tau, v, strideV, offsetV, WORK, strideWork, offsetWork, C, strideC1, strideC2, offsetC);
    }
  } else if (lastv > 0) {
    base_default14("no-transpose", lastc, lastv, 1, C, strideC1, strideC2, offsetC, v, strideV, offsetV, 0, WORK, strideWork, offsetWork);
    base_default5(lastc, lastv, -tau, WORK, strideWork, offsetWork, v, strideV, offsetV, C, strideC1, strideC2, offsetC);
  }
}
var base_default45 = dlarf;

// ../notes/lib/lapack/base/dgeqr2/lib/base.js
function dgeqr2(M5, N, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWork, offsetWork) {
  var alpha;
  var aii;
  var K;
  var i;
  K = Math.min(M5, N);
  for (i = 0; i < K; i++) {
    aii = offsetA + i * strideA1 + i * strideA2;
    base_default42(M5 - i, A, aii, A, strideA1, offsetA + Math.min(i + 1, M5 - 1) * strideA1 + i * strideA2, TAU, offsetTAU + i * strideTAU);
    if (i < N - 1) {
      alpha = A[aii];
      A[aii] = 1;
      base_default45("left", M5 - i, N - i - 1, A, strideA1, aii, TAU[offsetTAU + i * strideTAU], A, strideA1, strideA2, offsetA + i * strideA1 + (i + 1) * strideA2, WORK, strideWork, offsetWork);
      A[aii] = alpha;
    }
  }
  return 0;
}
var base_default46 = dgeqr2;

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
    base_default45(side, mi, ni, A, strideA1, offsetA + i * strideA1 + i * strideA2, TAU[offsetTAU + i * strideTAU], C, strideC1, strideC2, offsetC + ic * strideC1 + jc * strideC2, WORK, strideWork, offsetWork);
    A[idxA] = aii;
  }
  return 0;
}
var base_default47 = dorm2r;

// ../notes/lib/lapack/base/dsteqr/lib/base.js
var import_lib6 = __toESM(require_lib18(), 1);
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
  rot = new import_lib6.default(3);
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
  eps = base_default17("epsilon");
  eps2 = eps * eps;
  safmin = base_default17("safe-minimum");
  safmax = 1 / safmin;
  ssfmax = Math.sqrt(safmax) / 3;
  ssfmin = Math.sqrt(safmin) / eps2;
  if (icompz === 2) {
    base_default38("Full", N, N, 0, 1, Z, strideZ1, strideZ2, offsetZ);
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
    anorm = base_default26("max", lend - l + 1, d, strideD, offsetD + l * strideD, e, strideE, offsetE + l * strideE);
    iscale = 0;
    if (anorm === 0) {
      continue;
    }
    if (anorm > ssfmax) {
      iscale = 1;
      base_default23("general", 0, 0, anorm, ssfmax, lend - l + 1, 1, d, strideD, 0, offsetD + l * strideD);
      base_default23("general", 0, 0, anorm, ssfmax, lend - l, 1, e, strideE, 0, offsetE + l * strideE);
    } else if (anorm < ssfmin) {
      iscale = 2;
      base_default23("general", 0, 0, anorm, ssfmin, lend - l + 1, 1, d, strideD, 0, offsetD + l * strideD);
      base_default23("general", 0, 0, anorm, ssfmin, lend - l, 1, e, strideE, 0, offsetE + l * strideE);
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
            obj = base_default29(d[offsetD + l * strideD], e[offsetE + l * strideE], d[offsetD + (l + 1) * strideD]);
            WORK[offsetWork + l * strideWork] = obj.cs1;
            WORK[offsetWork + (N - 1 + l) * strideWork] = obj.sn1;
            base_default31("right", "variable", "backward", N, 2, WORK, strideWork, offsetWork + l * strideWork, WORK, strideWork, offsetWork + (N - 1 + l) * strideWork, Z, strideZ1, strideZ2, offsetZ + l * strideZ2);
            d[offsetD + l * strideD] = obj.rt1;
            d[offsetD + (l + 1) * strideD] = obj.rt2;
          } else {
            obj = base_default28(d[offsetD + l * strideD], e[offsetE + l * strideE], d[offsetD + (l + 1) * strideD]);
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
        r = base_default27(g, 1);
        g = d[offsetD + m * strideD] - p + e[offsetE + l * strideE] / (g + (Math.abs(g) * (Math.sign(g) || 1) > 0 ? r : -r));
        s = 1;
        c = 1;
        p = 0;
        for (i = m - 1; i >= l; i--) {
          f = s * e[offsetE + i * strideE];
          b = c * e[offsetE + i * strideE];
          base_default30(g, f, rot);
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
          base_default31("right", "variable", "backward", N, mm, WORK, strideWork, offsetWork + l * strideWork, WORK, strideWork, offsetWork + (N - 1 + l) * strideWork, Z, strideZ1, strideZ2, offsetZ + l * strideZ2);
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
            obj = base_default29(d[offsetD + (l - 1) * strideD], e[offsetE + (l - 1) * strideE], d[offsetD + l * strideD]);
            WORK[offsetWork + m * strideWork] = obj.cs1;
            WORK[offsetWork + (N - 1 + m) * strideWork] = obj.sn1;
            base_default31("right", "variable", "forward", N, 2, WORK, strideWork, offsetWork + m * strideWork, WORK, strideWork, offsetWork + (N - 1 + m) * strideWork, Z, strideZ1, strideZ2, offsetZ + (l - 1) * strideZ2);
            d[offsetD + (l - 1) * strideD] = obj.rt1;
            d[offsetD + l * strideD] = obj.rt2;
          } else {
            obj = base_default28(d[offsetD + (l - 1) * strideD], e[offsetE + (l - 1) * strideE], d[offsetD + l * strideD]);
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
        r = base_default27(g, 1);
        g = d[offsetD + m * strideD] - p + e[offsetE + (l - 1) * strideE] / (g + (Math.abs(g) * (Math.sign(g) || 1) > 0 ? r : -r));
        s = 1;
        c = 1;
        p = 0;
        for (i = m; i <= l - 1; i++) {
          f = s * e[offsetE + i * strideE];
          b = c * e[offsetE + i * strideE];
          base_default30(g, f, rot);
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
          base_default31("right", "variable", "forward", N, mm, WORK, strideWork, offsetWork + m * strideWork, WORK, strideWork, offsetWork + (N - 1 + m) * strideWork, Z, strideZ1, strideZ2, offsetZ + m * strideZ2);
        }
        d[offsetD + l * strideD] -= p;
        e[offsetE + (l - 1) * strideE] = g;
      }
    }
    if (iscale === 1) {
      base_default23("general", 0, 0, ssfmax, anorm, lendsv - lsv + 1, 1, d, strideD, 0, offsetD + lsv * strideD);
      base_default23("general", 0, 0, ssfmax, anorm, lendsv - lsv, 1, e, strideE, 0, offsetE + lsv * strideE);
    } else if (iscale === 2) {
      base_default23("general", 0, 0, ssfmin, anorm, lendsv - lsv + 1, 1, d, strideD, 0, offsetD + lsv * strideD);
      base_default23("general", 0, 0, ssfmin, anorm, lendsv - lsv, 1, e, strideE, 0, offsetE + lsv * strideE);
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
    base_default32("increasing", N, d, strideD, offsetD);
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
        base_default7(N, Z, strideZ1, offsetZ + i * strideZ2, Z, strideZ1, offsetZ + k * strideZ2);
      }
    }
  }
  return 0;
}
var base_default48 = dsteqr;

// ../notes/lib/arpack/base/dsesrt/lib/base.js
function dsesrt(which, apply, N, x, strideX, offsetX, na, A, strideA1, strideA2, offsetA) {
  var igap;
  var swap;
  var temp;
  var a1;
  var b1;
  var i;
  var j;
  igap = N >> 1;
  while (igap > 0) {
    for (i = igap; i < N; i++) {
      j = i - igap;
      while (j >= 0) {
        a1 = offsetX + j * strideX;
        b1 = offsetX + (j + igap) * strideX;
        if (which === "SA") {
          swap = x[a1] < x[b1];
        } else if (which === "SM") {
          swap = Math.abs(x[a1]) < Math.abs(x[b1]);
        } else if (which === "LA") {
          swap = x[a1] > x[b1];
        } else {
          swap = Math.abs(x[a1]) > Math.abs(x[b1]);
        }
        if (!swap) {
          break;
        }
        temp = x[a1];
        x[a1] = x[b1];
        x[b1] = temp;
        if (apply) {
          base_default7(na, A, strideA1, offsetA + j * strideA2, A, strideA1, offsetA + (j + igap) * strideA2);
        }
        j -= igap;
      }
    }
    igap >>= 1;
  }
}
var base_default49 = dsesrt;

// ../notes/lib/arpack/base/dseupd/lib/base.js
function dseupd(rvec, howmny, select, strideSelect, offsetSelect, d, strideD, offsetD, z, strideZ1, strideZ2, offsetZ, sigma, bmat, N, which, nev, tol, resid, strideResid, offsetResid, ncv, v, strideV1, strideV2, offsetV, iparam, strideIparam, offsetIparam, ipntr, strideIpntr, offsetIpntr, workd, strideWorkd, offsetWorkd, workl, strideWorkl, offsetWorkl, lworkl) {
  var leftptr;
  var rghtptr;
  var bounds;
  var numcnv;
  var bnorm2;
  var ishift;
  var reord;
  var type;
  var work1;
  var eps23;
  var nconv;
  var rnorm;
  var temp1;
  var mode;
  var ierr;
  var info;
  var ldh;
  var ldq;
  var ihd;
  var ihb;
  var ibd;
  var irz;
  var np;
  var ih;
  var iq;
  var iw;
  var jj;
  var oq;
  var j;
  var k;
  mode = iparam[offsetIparam + 6 * strideIparam];
  nconv = iparam[offsetIparam + 4 * strideIparam];
  info = 0;
  if (nconv === 0) {
    return info;
  }
  ierr = 0;
  if (nconv <= 0) {
    ierr = -14;
  }
  if (N <= 0) {
    ierr = -1;
  }
  if (nev <= 0) {
    ierr = -2;
  }
  if (ncv <= nev || ncv > N) {
    ierr = -3;
  }
  if (which !== "LM" && which !== "SM" && which !== "LA" && which !== "SA" && which !== "BE") {
    ierr = -5;
  }
  if (bmat !== "standard" && bmat !== "generalized") {
    ierr = -6;
  }
  if (howmny !== "all" && howmny !== "partial" && howmny !== "select" && rvec) {
    ierr = -15;
  }
  if (rvec && howmny === "select") {
    ierr = -16;
  }
  if (rvec && lworkl < ncv * ncv + 8 * ncv) {
    ierr = -7;
  }
  if (mode === 1 || mode === 2) {
    type = "REGULR";
  } else if (mode === 3) {
    type = "SHIFTI";
  } else if (mode === 4) {
    type = "BUCKLE";
  } else if (mode === 5) {
    type = "CAYLEY";
  } else {
    ierr = -10;
  }
  if (mode === 1 && bmat === "generalized") {
    ierr = -11;
  }
  if (nev === 1 && which === "BE") {
    ierr = -12;
  }
  if (ierr !== 0) {
    return ierr;
  }
  ih = ipntr[offsetIpntr + 4 * strideIpntr];
  bounds = ipntr[offsetIpntr + 6 * strideIpntr];
  ldh = ncv;
  ldq = ncv;
  ihd = bounds + ldh;
  ihb = ihd + ldh;
  iq = ihb + ldh;
  iw = iq + ldh * ncv;
  ipntr[offsetIpntr + 3 * strideIpntr] = iw + 2 * ncv;
  ipntr[offsetIpntr + 7 * strideIpntr] = ihd;
  ipntr[offsetIpntr + 8 * strideIpntr] = ihb;
  ipntr[offsetIpntr + 9 * strideIpntr] = iq;
  irz = ipntr[offsetIpntr + 10 * strideIpntr] + ncv;
  ibd = irz + ncv;
  eps23 = base_default17("epsilon");
  eps23 = Math.pow(eps23, 2 / 3);
  rnorm = workl[offsetWorkl + (ih - 1) * strideWorkl];
  if (bmat === "standard") {
    bnorm2 = rnorm;
  } else {
    bnorm2 = base_default19(N, workd, strideWorkd, offsetWorkd);
  }
  if (rvec) {
    reord = false;
    for (j = 1; j <= ncv; j++) {
      workl[offsetWorkl + (bounds + j - 2) * strideWorkl] = j;
      select[offsetSelect + (j - 1) * strideSelect] = false;
    }
    np = ncv - nev;
    ishift = 0;
    base_default36(ishift, which, nev, np, workl, strideWorkl, offsetWorkl + (irz - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (bounds - 1) * strideWorkl, workl, strideWorkl, offsetWorkl);
    numcnv = 0;
    for (j = 1; j <= ncv; j++) {
      temp1 = Math.max(eps23, Math.abs(workl[offsetWorkl + (irz + ncv - j - 1) * strideWorkl]));
      jj = workl[offsetWorkl + (bounds + ncv - j - 1) * strideWorkl];
      if (numcnv < nconv && workl[offsetWorkl + (ibd + jj - 2) * strideWorkl] <= tol * temp1) {
        select[offsetSelect + (jj - 1) * strideSelect] = true;
        numcnv += 1;
        if (jj > nconv) {
          reord = true;
        }
      }
    }
    if (numcnv !== nconv) {
      return -17;
    }
    base_default(ncv - 1, workl, strideWorkl, offsetWorkl + ih * strideWorkl, workl, strideWorkl, offsetWorkl + (ihb - 1) * strideWorkl);
    base_default(ncv, workl, strideWorkl, offsetWorkl + (ih + ldh - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (ihd - 1) * strideWorkl);
    oq = offsetWorkl + (iq - 1) * strideWorkl;
    ierr = base_default48("initialize", ncv, workl, strideWorkl, offsetWorkl + (ihd - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (ihb - 1) * strideWorkl, workl, strideWorkl, strideWorkl * ldq, oq, workl, strideWorkl, offsetWorkl + (iw - 1) * strideWorkl);
    if (ierr !== 0) {
      return -8;
    }
    if (reord) {
      leftptr = 1;
      rghtptr = ncv;
      if (ncv !== 1) {
        do {
          if (select[offsetSelect + (leftptr - 1) * strideSelect]) {
            leftptr += 1;
          } else if (select[offsetSelect + (rghtptr - 1) * strideSelect] === false) {
            rghtptr -= 1;
          } else {
            temp1 = workl[offsetWorkl + (ihd + leftptr - 2) * strideWorkl];
            workl[offsetWorkl + (ihd + leftptr - 2) * strideWorkl] = workl[offsetWorkl + (ihd + rghtptr - 2) * strideWorkl];
            workl[offsetWorkl + (ihd + rghtptr - 2) * strideWorkl] = temp1;
            base_default(ncv, workl, strideWorkl, oq + ncv * (leftptr - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (iw - 1) * strideWorkl);
            base_default(ncv, workl, strideWorkl, oq + ncv * (rghtptr - 1) * strideWorkl, workl, strideWorkl, oq + ncv * (leftptr - 1) * strideWorkl);
            base_default(ncv, workl, strideWorkl, offsetWorkl + (iw - 1) * strideWorkl, workl, strideWorkl, oq + ncv * (rghtptr - 1) * strideWorkl);
            leftptr += 1;
            rghtptr -= 1;
          }
        } while (leftptr < rghtptr);
      }
    }
    base_default(nconv, workl, strideWorkl, offsetWorkl + (ihd - 1) * strideWorkl, d, strideD, offsetD);
  } else {
    base_default(nconv, workl, strideWorkl, offsetWorkl + (ipntr[offsetIpntr + 5 * strideIpntr] - 1) * strideWorkl, d, strideD, offsetD);
    base_default(ncv, workl, strideWorkl, offsetWorkl + (ipntr[offsetIpntr + 5 * strideIpntr] - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (ihd - 1) * strideWorkl);
  }
  if (type === "REGULR") {
    if (rvec) {
      base_default49("LA", rvec, nconv, d, strideD, offsetD, ncv, workl, strideWorkl, strideWorkl * ldq, offsetWorkl + (iq - 1) * strideWorkl);
    } else {
      base_default(ncv, workl, strideWorkl, offsetWorkl + (bounds - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (ihb - 1) * strideWorkl);
    }
  } else {
    base_default(ncv, workl, strideWorkl, offsetWorkl + (ihd - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (iw - 1) * strideWorkl);
    if (type === "SHIFTI") {
      for (k = 1; k <= ncv; k++) {
        workl[offsetWorkl + (ihd + k - 2) * strideWorkl] = 1 / workl[offsetWorkl + (ihd + k - 2) * strideWorkl] + sigma;
      }
    } else if (type === "BUCKLE") {
      for (k = 1; k <= ncv; k++) {
        workl[offsetWorkl + (ihd + k - 2) * strideWorkl] = sigma * workl[offsetWorkl + (ihd + k - 2) * strideWorkl] / (workl[offsetWorkl + (ihd + k - 2) * strideWorkl] - 1);
      }
    } else if (type === "CAYLEY") {
      for (k = 1; k <= ncv; k++) {
        workl[offsetWorkl + (ihd + k - 2) * strideWorkl] = sigma * (workl[offsetWorkl + (ihd + k - 2) * strideWorkl] + 1) / (workl[offsetWorkl + (ihd + k - 2) * strideWorkl] - 1);
      }
    }
    base_default(nconv, workl, strideWorkl, offsetWorkl + (ihd - 1) * strideWorkl, d, strideD, offsetD);
    base_default35("LA", true, nconv, workl, strideWorkl, offsetWorkl + (ihd - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (iw - 1) * strideWorkl);
    if (rvec) {
      base_default49("LA", rvec, nconv, d, strideD, offsetD, ncv, workl, strideWorkl, strideWorkl * ldq, offsetWorkl + (iq - 1) * strideWorkl);
    } else {
      base_default(ncv, workl, strideWorkl, offsetWorkl + (bounds - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (ihb - 1) * strideWorkl);
      base_default6(ncv, bnorm2 / rnorm, workl, strideWorkl, offsetWorkl + (ihb - 1) * strideWorkl);
      base_default35("LA", true, nconv, d, strideD, offsetD, workl, strideWorkl, offsetWorkl + (ihb - 1) * strideWorkl);
    }
  }
  if (rvec && howmny === "all") {
    base_default46(ncv, nconv, workl, strideWorkl, strideWorkl * ldq, offsetWorkl + (iq - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (iw + ncv - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (ihb - 1) * strideWorkl);
    base_default47("right", "no-transpose", N, ncv, nconv, workl, strideWorkl, strideWorkl * ldq, offsetWorkl + (iq - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (iw + ncv - 1) * strideWorkl, v, strideV1, strideV2, offsetV, workd, strideWorkd, offsetWorkd + N * strideWorkd);
    base_default16("all", N, nconv, v, strideV1, strideV2, offsetV, z, strideZ1, strideZ2, offsetZ);
    for (j = 1; j <= ncv - 1; j++) {
      workl[offsetWorkl + (ihb + j - 2) * strideWorkl] = 0;
    }
    workl[offsetWorkl + (ihb + ncv - 2) * strideWorkl] = 1;
    work1 = new import_lib7.default(1);
    base_default47("left", "transpose", ncv, 1, nconv, workl, strideWorkl, strideWorkl * ldq, offsetWorkl + (iq - 1) * strideWorkl, workl, strideWorkl, offsetWorkl + (iw + ncv - 1) * strideWorkl, workl, strideWorkl, strideWorkl * ncv, offsetWorkl + (ihb - 1) * strideWorkl, work1, 1, 0);
    for (j = 1; j <= nconv; j++) {
      workl[offsetWorkl + (iw + ncv + j - 2) * strideWorkl] = workl[offsetWorkl + (ihb + j - 2) * strideWorkl];
    }
  }
  if (type === "REGULR" && rvec) {
    for (j = 1; j <= ncv; j++) {
      workl[offsetWorkl + (ihb + j - 2) * strideWorkl] = rnorm * Math.abs(workl[offsetWorkl + (ihb + j - 2) * strideWorkl]);
    }
  } else if (type !== "REGULR" && rvec) {
    base_default6(ncv, bnorm2, workl, strideWorkl, offsetWorkl + (ihb - 1) * strideWorkl);
    if (type === "SHIFTI") {
      for (k = 1; k <= ncv; k++) {
        workl[offsetWorkl + (ihb + k - 2) * strideWorkl] = Math.abs(workl[offsetWorkl + (ihb + k - 2) * strideWorkl]) / (workl[offsetWorkl + (iw + k - 2) * strideWorkl] * workl[offsetWorkl + (iw + k - 2) * strideWorkl]);
      }
    } else if (type === "BUCKLE") {
      for (k = 1; k <= ncv; k++) {
        temp1 = workl[offsetWorkl + (iw + k - 2) * strideWorkl] - 1;
        workl[offsetWorkl + (ihb + k - 2) * strideWorkl] = sigma * Math.abs(workl[offsetWorkl + (ihb + k - 2) * strideWorkl]) / (temp1 * temp1);
      }
    } else if (type === "CAYLEY") {
      for (k = 1; k <= ncv; k++) {
        workl[offsetWorkl + (ihb + k - 2) * strideWorkl] = Math.abs(workl[offsetWorkl + (ihb + k - 2) * strideWorkl] / workl[offsetWorkl + (iw + k - 2) * strideWorkl] * (workl[offsetWorkl + (iw + k - 2) * strideWorkl] - 1));
      }
    }
  }
  if (rvec && (type === "SHIFTI" || type === "CAYLEY")) {
    for (k = 0; k <= nconv - 1; k++) {
      workl[offsetWorkl + (iw + k - 1) * strideWorkl] = workl[offsetWorkl + (iw + ncv + k - 1) * strideWorkl] / workl[offsetWorkl + (iw + k - 1) * strideWorkl];
    }
  } else if (rvec && type === "BUCKLE") {
    for (k = 0; k <= nconv - 1; k++) {
      workl[offsetWorkl + (iw + k - 1) * strideWorkl] = workl[offsetWorkl + (iw + ncv + k - 1) * strideWorkl] / (workl[offsetWorkl + (iw + k - 1) * strideWorkl] - 1);
    }
  }
  if (rvec && type !== "REGULR") {
    base_default5(N, nconv, 1, resid, strideResid, offsetResid, workl, strideWorkl, offsetWorkl + (iw - 1) * strideWorkl, z, strideZ1, strideZ2, offsetZ);
  }
  return info;
}
var base_default50 = dseupd;

// ../notes/lib/arpack/base/dsband/lib/base.js
function dsband(rvec, howmny, select, strideSelect, offsetSelect, d, strideD, offsetD, Z, strideZ1, strideZ2, offsetZ, sigma, N, AB, strideAB1, strideAB2, offsetAB, MB, strideMB1, strideMB2, offsetMB, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, kl, ku, which, bmat, nev, tol, resid, strideResid, offsetResid, ncv, V, strideV1, strideV2, offsetV, iparam, strideIparam, offsetIparam, workd, strideWorkd, offsetWorkd, workl, strideWorkl, offsetWorkl, lworkl, iwork, strideIwork, offsetIwork, infoIn) {
  var abBand;
  var mbBand;
  var saupd;
  var ipntr;
  var mode;
  var info;
  var itop;
  var imid;
  var ibot;
  var type;
  var ierr;
  var ido;
  var ox;
  var oy;
  var ob;
  var i;
  var j;
  mode = iparam[offsetIparam + 6 * strideIparam];
  if (mode === 1) {
    type = 1;
  } else if (mode === 3 && bmat === "standard") {
    type = 2;
  } else if (mode === 2) {
    type = 3;
  } else if (mode === 3 && bmat === "generalized") {
    type = 4;
  } else if (mode === 4) {
    type = 5;
  } else if (mode === 5) {
    type = 6;
  } else {
    return infoIn;
  }
  ido = new import_lib8.default(1);
  ipntr = new import_lib8.default(14);
  saupd = {};
  info = infoIn;
  iparam[offsetIparam] = 1;
  itop = kl + 1;
  imid = kl + ku + 1;
  ibot = 2 * kl + ku + 1;
  abBand = offsetAB + (itop - 1) * strideAB1;
  mbBand = offsetMB + (itop - 1) * strideMB1;
  if (type === 2 || type === 6 && bmat === "standard") {
    base_default16("all", ibot, N, AB, strideAB1, strideAB2, offsetAB, RFAC, strideRFAC1, strideRFAC2, offsetRFAC);
    for (j = 0; j < N; j++) {
      RFAC[offsetRFAC + (imid - 1) * strideRFAC1 + j * strideRFAC2] = AB[offsetAB + (imid - 1) * strideAB1 + j * strideAB2] - sigma;
    }
    ierr = base_default12(N, N, kl, ku, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, iwork, strideIwork, offsetIwork);
    if (ierr !== 0) {
      return info;
    }
  } else if (type === 3) {
    base_default16("all", ibot, N, MB, strideMB1, strideMB2, offsetMB, RFAC, strideRFAC1, strideRFAC2, offsetRFAC);
    ierr = base_default12(N, N, kl, ku, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, iwork, strideIwork, offsetIwork);
    if (ierr !== 0) {
      return info;
    }
  } else if (type === 4 || type === 5 || type === 6 && bmat === "generalized") {
    for (j = 0; j < N; j++) {
      for (i = itop - 1; i < ibot; i++) {
        RFAC[offsetRFAC + i * strideRFAC1 + j * strideRFAC2] = AB[offsetAB + i * strideAB1 + j * strideAB2] - sigma * MB[offsetMB + i * strideMB1 + j * strideMB2];
      }
    }
    ierr = base_default12(N, N, kl, ku, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, iwork, strideIwork, offsetIwork);
    if (ierr !== 0) {
      return info;
    }
  }
  for (; ; ) {
    info = base_default41(saupd, ido, bmat, N, which, nev, tol, resid, strideResid, offsetResid, ncv, V, strideV1, strideV2, offsetV, iparam, strideIparam, offsetIparam, ipntr, 1, 0, workd, strideWorkd, offsetWorkd, workl, strideWorkl, offsetWorkl, lworkl, infoIn);
    ox = offsetWorkd + ipntr[0] * strideWorkd;
    oy = offsetWorkd + ipntr[1] * strideWorkd;
    ob = offsetWorkd + ipntr[2] * strideWorkd;
    if (ido[0] === -1) {
      if (type === 1) {
        base_default3("no-transpose", N, N, kl, ku, 1, AB, strideAB1, strideAB2, abBand, workd, strideWorkd, ox, 0, workd, strideWorkd, oy);
      } else if (type === 2) {
        base_default(N, workd, strideWorkd, ox, workd, strideWorkd, oy);
        base_default15("no-transpose", N, kl, ku, 1, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, iwork, strideIwork, offsetIwork, workd, strideWorkd, N * strideWorkd, oy);
      } else if (type === 3) {
        base_default3("no-transpose", N, N, kl, ku, 1, AB, strideAB1, strideAB2, abBand, workd, strideWorkd, ox, 0, workd, strideWorkd, oy);
        base_default(N, workd, strideWorkd, oy, workd, strideWorkd, ox);
        base_default15("no-transpose", N, kl, ku, 1, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, iwork, strideIwork, offsetIwork, workd, strideWorkd, N * strideWorkd, oy);
      } else if (type === 4) {
        base_default3("no-transpose", N, N, kl, ku, 1, MB, strideMB1, strideMB2, mbBand, workd, strideWorkd, ox, 0, workd, strideWorkd, oy);
        base_default15("no-transpose", N, kl, ku, 1, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, iwork, strideIwork, offsetIwork, workd, strideWorkd, N * strideWorkd, oy);
      } else if (type === 5) {
        base_default3("no-transpose", N, N, kl, ku, 1, AB, strideAB1, strideAB2, abBand, workd, strideWorkd, ox, 0, workd, strideWorkd, oy);
        base_default15("no-transpose", N, kl, ku, 1, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, iwork, strideIwork, offsetIwork, workd, strideWorkd, N * strideWorkd, oy);
      } else if (type === 6) {
        if (bmat === "generalized") {
          base_default3("no-transpose", N, N, kl, ku, 1, AB, strideAB1, strideAB2, abBand, workd, strideWorkd, ox, 0, workd, strideWorkd, oy);
          base_default3("no-transpose", N, N, kl, ku, sigma, MB, strideMB1, strideMB2, mbBand, workd, strideWorkd, ox, 1, workd, strideWorkd, oy);
        } else {
          base_default(N, workd, strideWorkd, ox, workd, strideWorkd, oy);
          base_default3("no-transpose", N, N, kl, ku, 1, AB, strideAB1, strideAB2, abBand, workd, strideWorkd, ox, sigma, workd, strideWorkd, oy);
        }
        base_default15("no-transpose", N, kl, ku, 1, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, iwork, strideIwork, offsetIwork, workd, strideWorkd, N * strideWorkd, oy);
      }
    } else if (ido[0] === 1) {
      if (type === 1) {
        base_default3("no-transpose", N, N, kl, ku, 1, AB, strideAB1, strideAB2, abBand, workd, strideWorkd, ox, 0, workd, strideWorkd, oy);
      } else if (type === 2) {
        base_default(N, workd, strideWorkd, ox, workd, strideWorkd, oy);
        base_default15("no-transpose", N, kl, ku, 1, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, iwork, strideIwork, offsetIwork, workd, strideWorkd, N * strideWorkd, oy);
      } else if (type === 3) {
        base_default3("no-transpose", N, N, kl, ku, 1, AB, strideAB1, strideAB2, abBand, workd, strideWorkd, ox, 0, workd, strideWorkd, oy);
        base_default(N, workd, strideWorkd, oy, workd, strideWorkd, ox);
        base_default15("no-transpose", N, kl, ku, 1, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, iwork, strideIwork, offsetIwork, workd, strideWorkd, N * strideWorkd, oy);
      } else if (type === 4) {
        base_default(N, workd, strideWorkd, ob, workd, strideWorkd, oy);
        base_default15("no-transpose", N, kl, ku, 1, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, iwork, strideIwork, offsetIwork, workd, strideWorkd, N * strideWorkd, oy);
      } else if (type === 5) {
        base_default(N, workd, strideWorkd, ob, workd, strideWorkd, oy);
        base_default15("no-transpose", N, kl, ku, 1, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, iwork, strideIwork, offsetIwork, workd, strideWorkd, N * strideWorkd, oy);
      } else if (type === 6) {
        if (bmat === "generalized") {
          base_default3("no-transpose", N, N, kl, ku, 1, AB, strideAB1, strideAB2, abBand, workd, strideWorkd, ox, 0, workd, strideWorkd, oy);
          base_default2(N, sigma, workd, strideWorkd, ob, workd, strideWorkd, oy);
        } else {
          base_default(N, workd, strideWorkd, ox, workd, strideWorkd, oy);
          base_default3("no-transpose", N, N, kl, ku, 1, AB, strideAB1, strideAB2, abBand, workd, strideWorkd, ox, sigma, workd, strideWorkd, oy);
        }
        base_default15("no-transpose", N, kl, ku, 1, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, iwork, strideIwork, offsetIwork, workd, strideWorkd, N * strideWorkd, oy);
      }
    } else if (ido[0] === 2) {
      if (type === 5) {
        base_default3("no-transpose", N, N, kl, ku, 1, AB, strideAB1, strideAB2, abBand, workd, strideWorkd, ox, 0, workd, strideWorkd, oy);
      } else {
        base_default3("no-transpose", N, N, kl, ku, 1, MB, strideMB1, strideMB2, mbBand, workd, strideWorkd, ox, 0, workd, strideWorkd, oy);
      }
    } else {
      if (info < 0) {
        return info;
      }
      if (iparam[offsetIparam + 4 * strideIparam] > 0) {
        ierr = base_default50(rvec, "all", select, strideSelect, offsetSelect, d, strideD, offsetD, Z, strideZ1, strideZ2, offsetZ, sigma, bmat, N, which, nev, saupd.tol, resid, strideResid, offsetResid, ncv, V, strideV1, strideV2, offsetV, iparam, strideIparam, offsetIparam, ipntr, 1, 0, workd, strideWorkd, offsetWorkd, workl, strideWorkl, offsetWorkl, lworkl);
        if (ierr !== 0) {
          return ierr;
        }
      }
      return info;
    }
  }
}
var base_default51 = dsband;

// ../notes/lib/arpack/base/dsband/lib/dsband.js
function dsband2(rvec, howmny, select, d, Z, ldz, sigma, N, AB, MB, lda, RFAC, kl, ku, which, bmat, nev, tol, resid, ncv, V, ldv, iparam, workd, workl, lworkl, iwork, infoIn) {
  if (bmat !== "standard" && bmat !== "generalized") {
    throw new TypeError((0, import_lib9.default)("invalid argument. Sixteenth argument must be one of `standard` or `generalized`. Value: `%s`.", bmat));
  }
  if (which !== "LM" && which !== "SM" && which !== "LA" && which !== "SA" && which !== "BE") {
    throw new TypeError((0, import_lib9.default)("invalid argument. Fifteenth argument must be one of `LM`, `SM`, `LA`, `SA`, or `BE`. Value: `%s`.", which));
  }
  if (N < 0) {
    throw new RangeError((0, import_lib9.default)("invalid argument. Eighth argument must be a nonnegative integer. Value: `%d`.", N));
  }
  if (!workd || workd.length < 3 * N) {
    throw new RangeError((0, import_lib9.default)("invalid argument. workd array must have at least %d elements. Provided length: %d.", 3 * N, workd ? workd.length : 0));
  }
  if (!workl || workl.length < ncv * ncv + 8 * ncv) {
    throw new RangeError((0, import_lib9.default)("invalid argument. workl array must have at least %d elements. Provided length: %d.", ncv * ncv + 8 * ncv, workl ? workl.length : 0));
  }
  return base_default51(rvec, howmny, select, 1, 0, d, 1, 0, Z, 1, ldz, 0, sigma, N, AB, 1, lda, 0, MB, 1, lda, 0, RFAC, 1, lda, 0, kl, ku, which, bmat, nev, tol, resid, 1, 0, ncv, V, 1, ldv, 0, iparam, 1, 0, workd, 1, 0, workl, 1, 0, lworkl, iwork, 1, 0, infoIn);
}
var dsband_default = dsband2;

// ../notes/lib/arpack/base/dsband/lib/ndarray.js
var import_lib10 = __toESM(require_lib3(), 1);
function dsband3(rvec, howmny, select, strideSelect, offsetSelect, d, strideD, offsetD, Z, strideZ1, strideZ2, offsetZ, sigma, N, AB, strideAB1, strideAB2, offsetAB, MB, strideMB1, strideMB2, offsetMB, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, kl, ku, which, bmat, nev, tol, resid, strideResid, offsetResid, ncv, V, strideV1, strideV2, offsetV, iparam, strideIparam, offsetIparam, workd, strideWorkd, offsetWorkd, workl, strideWorkl, offsetWorkl, lworkl, iwork, strideIwork, offsetIwork, infoIn) {
  if (bmat !== "standard" && bmat !== "generalized") {
    throw new TypeError((0, import_lib10.default)("invalid argument. Thirtieth argument must be one of `standard` or `generalized`. Value: `%s`.", bmat));
  }
  if (which !== "LM" && which !== "SM" && which !== "LA" && which !== "SA" && which !== "BE") {
    throw new TypeError((0, import_lib10.default)("invalid argument. Twenty-ninth argument must be one of `LM`, `SM`, `LA`, `SA`, or `BE`. Value: `%s`.", which));
  }
  if (N < 0) {
    throw new RangeError((0, import_lib10.default)("invalid argument. Fourteenth argument must be a nonnegative integer. Value: `%d`.", N));
  }
  if (!workd || workd.length - offsetWorkd < 3 * N) {
    throw new RangeError((0, import_lib10.default)("invalid argument. workd array must have at least %d elements from offset %d. Provided length: %d.", 3 * N, offsetWorkd, workd ? workd.length : 0));
  }
  if (!workl || workl.length - offsetWorkl < ncv * ncv + 8 * ncv) {
    throw new RangeError((0, import_lib10.default)("invalid argument. workl array must have at least %d elements from offset %d. Provided length: %d.", ncv * ncv + 8 * ncv, offsetWorkl, workl ? workl.length : 0));
  }
  return base_default51(rvec, howmny, select, strideSelect, offsetSelect, d, strideD, offsetD, Z, strideZ1, strideZ2, offsetZ, sigma, N, AB, strideAB1, strideAB2, offsetAB, MB, strideMB1, strideMB2, offsetMB, RFAC, strideRFAC1, strideRFAC2, offsetRFAC, kl, ku, which, bmat, nev, tol, resid, strideResid, offsetResid, ncv, V, strideV1, strideV2, offsetV, iparam, strideIparam, offsetIparam, workd, strideWorkd, offsetWorkd, workl, strideWorkl, offsetWorkl, lworkl, iwork, strideIwork, offsetIwork, infoIn);
}
var ndarray_default = dsband3;

// ../notes/lib/arpack/base/dsband/lib/main.js
(0, import_lib11.default)(dsband_default, "ndarray", ndarray_default);
var main_default = dsband_default;
export {
  main_default as default
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
/**
* @license MIT
*
* Copyright (c) 2026 Ricky Reusser.
*
* Derived from ARPACK (arpack-ng 3.9.1), Copyright (c) 1996-2008 Rice
* University. Developed by D.C. Sorensen, R.B. Lehoucq, C. Yang, and
* K. Maschhoff, under the BSD-3-Clause license. See LICENSE.txt in the
* repository root for the full license text and upstream attribution.
*/
/**
* @license MIT
*
* Copyright (c) 2026 Ricky Reusser.
*
* Derived from ARPACK (arpack-ng 3.9.1), Copyright (c) 1996-2008 Rice
* University. Developed by D.C. Sorensen, R.B. Lehoucq, C. Yang, and
* K. Maschhoff, under the BSD-3-Clause license. See LICENSE.txt in the
* repository root for the full license text and upstream attribution.
*
* dstqrb is a modification of the LAPACK routine dsteqr: it computes all
* eigenvalues and only the last row of the eigenvector matrix, so Z is a
* length-N vector rather than an N-by-N matrix.
*/
/*! Bundled license information:

@stdlib/utils/define-property/lib/define_property.js:
@stdlib/utils/define-property/lib/has_define_property_support.js:
  (**
  * @license Apache-2.0
  *
  * Copyright (c) 2021 The Stdlib Authors.
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

@stdlib/utils/define-property/lib/builtin.js:
@stdlib/utils/define-property/lib/polyfill.js:
@stdlib/utils/define-property/lib/index.js:
@stdlib/utils/define-nonenumerable-read-only-property/lib/main.js:
@stdlib/utils/define-nonenumerable-read-only-property/lib/index.js:
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

@stdlib/string/base/format-interpolate/lib/is_number.js:
@stdlib/string/base/format-interpolate/lib/zero_pad.js:
@stdlib/string/base/format-interpolate/lib/format_integer.js:
@stdlib/string/base/format-interpolate/lib/is_string.js:
@stdlib/string/base/format-interpolate/lib/format_double.js:
@stdlib/string/base/format-interpolate/lib/space_pad.js:
@stdlib/string/base/format-interpolate/lib/main.js:
@stdlib/string/base/format-interpolate/lib/index.js:
@stdlib/string/base/format-tokenize/lib/main.js:
@stdlib/string/base/format-tokenize/lib/index.js:
@stdlib/string/format/lib/is_string.js:
@stdlib/string/format/lib/main.js:
@stdlib/string/format/lib/index.js:
  (**
  * @license Apache-2.0
  *
  * Copyright (c) 2022 The Stdlib Authors.
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
