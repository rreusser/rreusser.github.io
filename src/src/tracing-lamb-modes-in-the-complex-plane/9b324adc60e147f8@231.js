// https://observablehq.com/@rreusser/utils@231
function _1(md){return(
md`# utils

## Markup utils`
)}

function _$(tex){return(
tex
)}

function _$$(tex){return(
tex.block
)}

function _isThumbnailDaemon(){return(
!!navigator.userAgent.match('HeadlessChrome')
)}

function _5(md){return(
md`I haven't used this, but I saw this formatting code in [@mootari's notebook](https://observablehq.com/@mootari/codepens-in-observable?collection=@mootari/tools) and knew instantly that I had to have it. So I'm stashing it here for subsequent use and modification.`
)}

async function _sprintf(require){return(
(await require('sprintf-js@1.1.2/dist/sprintf.min.js')).sprintf
)}

function _qs(require){return(
require('qs@6.9.1/dist/qs.js')
)}

function _sig(md,html){return(
function sig(fn, desc = '') {
  const pattern = /\)(?= *?\{)/;
  const head = fn.toString().split(pattern, 1)[0] + ')';
  const code = md`\`\`\`javascript\n${head}\n\`\`\``;
  return html`<div style="border:1px solid #eee;padding:.5em 1em;margin-bottom:1em">
    <div style="border-bottom:1px solid #eee">${code}</div>
    ${desc}
  `;
}
)}

function _decodeHash(){return(
function decodeHash (hash) {
  try {
    var parts = hash.replace(/^#/,'').split('&').map(x => x.split('=').map(x => decodeURIComponent(x)))
    var output = {}
    for (var i = 0; i < parts.length; i++) {
      output[parts[i][0]] = parts[i][1]
    }
  } catch (e) {
    return {}
  }
  return output
}
)}

function _h(){return(
{ f: 'z', x: [1, 2] }
)}

function _11(encodeHash,h){return(
encodeHash(h)
)}

function _encodeHash(URLSearchParams){return(
function encodeHash(hash) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(hash)) {
    q.set(key, value);
  }
  return q.toString();
}
)}

function _13(parseQueryString){return(
parseQueryString("f=z&x=1%2C2")
)}

function _parseQueryString(URLSearchParams)
{
  return function parseQueryString(str) {
    let asNumber;
    const q = new URLSearchParams(str);
    const obj = {};
    for (let [key, value] of q.entries()) {
      if (value.length === 0 || value === "true") {
        value = true;
      } else if (value === "false") {
        value = false;
      } else if (!isNaN((asNumber = parseFloat(value)))) {
        value = asNumber;
      } else {
        value = decodeURIComponent(value);
      }
      if (obj.hasOwnProperty(key)) {
        if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
        obj[key].push(value);
      } else {
        obj[key] = value;
      }
    }
    return obj;
  };
}


function _floatRgbToHex(){return(
function floatRgbToHex (rgb) {
  return '#' + rgb.map(x => Math.floor(Math.max(0, Math.min(255, x * 255))).toString(16).padStart(2, '0')).join('')
}
)}

function _hexRgbToFloat(){return(
function hexRgbToFloat (hex) {
  let match
  if ((match = hex.match(/#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/))) {
    return [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255]
  } else if ((match = hex.match(/#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/))) {
    return [parseInt(match[1], 16) / 15, parseInt(match[2], 16) / 15, parseInt(match[3], 16) / 15]
  }
  return [0, 0, 0]
}
)}

function _hexToFloatRgba(){return(
function hexToFloatRgba(hex, alpha) {
  let match;
  alpha = alpha === undefined ? 1 : +alpha;
  if (
    (match = hex.match(/#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/))
  ) {
    return [
      parseInt(match[1], 16) / 255,
      parseInt(match[2], 16) / 255,
      parseInt(match[3], 16) / 255,
      alpha
    ];
  } else if ((match = hex.match(/#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/))) {
    return [
      parseInt(match[1], 16) / 15,
      parseInt(match[2], 16) / 15,
      parseInt(match[3], 16) / 15,
      alpha
    ];
  }
  return [0, 0, 0, alpha];
}
)}

function _mouseEventOffset()
{
  // Obtained from: https://github.com/mattdesl/mouse-event-offset
  //
  // The MIT License (MIT) Copyright (c) 2014 Matt DesLauriers
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the "Software"),
  // to deal in the Software without restriction, including without limitation
  // the rights to use, copy, modify, merge, publish, distribute, sublicense,
  // and/or sell copies of the Software, and to permit persons to whom the
  // Software is furnished to do so, subject to the following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  // FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
  // IN THE SOFTWARE.
  var rootPosition = { left: 0, top: 0 };

  function getBoundingClientOffset(element) {
    if (
      element === window ||
      element === document ||
      element === document.body
    ) {
      return rootPosition;
    } else {
      return element.getBoundingClientRect();
    }
  }

  function mouseEventOffset(ev, target, out) {
    target = target || ev.currentTarget || ev.srcElement;
    if (!Array.isArray(out)) {
      out = [0, 0];
    }
    var cx = ev.clientX || 0;
    var cy = ev.clientY || 0;
    var rect = getBoundingClientOffset(target);
    out[0] = cx - rect.left;
    out[1] = cy - rect.top;
    return out;
  }

  return mouseEventOffset;
}


function _19(md){return(
md`## Test utils`
)}

function _assert(almostEqual)
{
  function assert (ok, message) {
    if (!ok) throw new Error('✗ '+(message ? message : 'not ok'));
  }
  
  assert.almostEqual = function assertAlmostEqual (a, b, msg, tol) {
    if (!almostEqual(a, b)) throw new Error('✗ '+(msg ? msg + ' ' : '')+'Expected '+a+' to equal '+b+' within tolerance '+tol)
  }
  
  assert.arrayAlmostEqual = function assertArrayAlmostEqual (a, b, tol) {
    tol = almostEqual.DBL_EPSILON
    if (a.length !== b.length) throw new Error('✗ Expected a.length (='+a.length+') to equal b.length (='+b.length+')')
    for (var i = 0; i < a.length; i++) {
      if (!almostEqual(a[i], b[i], tol, tol)) throw new Error('✗ Expected a['+i+'] (='+a[i]+') to equal b['+i+'] (='+b[i]+') within tolerance '+tol)
    }
  }
  return assert;
}


function _21(md){return(
md`## Math utils`
)}

function _binarySearch(){return(
function binarySearch(x, value) {
  let lo = 0,
    hi = x.length - 1;
  if (value <= x[0]) return lo;
  if (value >= x[hi]) return hi;
  while (lo < hi - 1) {
    let m = ((lo + hi) / 2) | 0;
    let xm = x[m];
    if (xm > value) {
      hi = m;
    } else if (xm < value) {
      lo = m;
    } else {
      return m;
    }
  }
  return lo;
}
)}

function _almostEqual()
{
  // This module is imported from: https://github.com/scijs/almost-equal
  //
  // The MIT License (MIT)
  //
  // Copyright (c) 2013 Mikola Lysenko
  // 
  // Permission is hereby granted, free of charge, to any person obtaining a copy
  // of this software and associated documentation files (the "Software"), to deal
  // in the Software without restriction, including without limitation the rights
  // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  // copies of the Software, and to permit persons to whom the Software is
  // furnished to do so, subject to the following conditions:
  // 
  // The above copyright notice and this permission notice shall be included in
  // all copies or substantial portions of the Software.
  // 
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  // THE SOFTWARE.
  function almostEqual (a, b, absoluteError, relativeError) {
    var d = Math.abs(a - b)

    if (absoluteError == null) absoluteError = almostEqual.DBL_EPSILON
    if (relativeError == null) relativeError = absoluteError

    if(d <= absoluteError) {
      return true
    }
    if(d <= relativeError * Math.min(Math.abs(a), Math.abs(b))) {
      return true
    }
    return a === b
  }

  almostEqual.FLT_EPSILON = 1.19209290e-7
  almostEqual.DBL_EPSILON = 2.2204460492503131e-16
  
  return almostEqual
}


function _arrayAlmostEqual(almostEqual){return(
function arrayAlmostEqual (a, b, absoluteError, relativeError) {
  if (a.length !== b.length) return false
  for (var i = 0; i < a.length; i++) {
    if (!almostEqual(a[i], b[i], absoluteError, relativeError)) return false
  }
  return true
}
)}

function _dup()
{
  // Retrieved from: https://github.com/scijs/dup/blob/master/dup.js
  //
  // The MIT License (MIT)
  //
  // Copyright (c) 2013 Mikola Lysenko
  //
  // Permission is hereby granted, free of charge, to any person obtaining a copy
  // of this software and associated documentation files (the "Software"), to deal
  // in the Software without restriction, including without limitation the rights
  // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  // copies of the Software, and to permit persons to whom the Software is
  // furnished to do so, subject to the following conditions:
  //
  // The above copyright notice and this permission notice shall be included in
  // all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  // THE SOFTWARE.
  function dupe_array(count, value, i) {
    var c = count[i] | 0;
    if (c <= 0) {
      return [];
    }
    var result = new Array(c),
      j;
    if (i === count.length - 1) {
      for (j = 0; j < c; ++j) {
        result[j] = value;
      }
    } else {
      for (j = 0; j < c; ++j) {
        result[j] = dupe_array(count, value, i + 1);
      }
    }
    return result;
  }

  function dupe_number(count, value) {
    var result, i;
    result = new Array(count);
    for (i = 0; i < count; ++i) {
      result[i] = value;
    }
    return result;
  }

  function dupe(count, value) {
    if (typeof value === "undefined") {
      value = 0;
    }
    switch (typeof count) {
      case "number":
        if (count > 0) {
          return dupe_number(count | 0, value);
        }
        break;
      case "object":
        if (typeof count.length === "number") {
          return dupe_array(count, value, 0);
        }
        break;
    }
    return [];
  }
  return dupe;
}


function _26(arrayAlmostEqual){return(
arrayAlmostEqual([0, 1], [1e-16, 1], 1e-4, 1e-4)
)}

function _nextPow2()
{
  // Source from: https://github.com/mikolalysenko/next-pow-2/blob/master/LICENSE
  //
  // The MIT License (MIT)
  //
  // Copyright (c) 2015 Mikola Lysenko
  // 
  // Permission is hereby granted, free of charge, to any person obtaining a copy
  // of this software and associated documentation files (the "Software"), to deal
  // in the Software without restriction, including without limitation the rights
  // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  // copies of the Software, and to permit persons to whom the Software is
  // furnished to do so, subject to the following conditions:
  // 
  // The above copyright notice and this permission notice shall be included in
  // all copies or substantial portions of the Software.
  // 
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  // THE SOFTWARE.
  return function nextPowTwo (v) {
    v += v === 0
    --v
    v |= v >>> 1
    v |= v >>> 2
    v |= v >>> 4
    v |= v >>> 8
    v |= v >>> 16
    return v + 1
  }
}


function _28(md){return(
md`## SVG Utils`
)}

function _arrowhead(){return(
function arrowhead (opts) {
  opts = opts || {}
  const w = opts.width === undefined ? 9 : opts.width
  const l = opts.length === undefined ? 11 : opts.length
  const c = opts.cut === undefined ? 1 : opts.cut
  return function (el) {
    return el.attr('refX', l / 2)
      .attr('refY', w / 2)
      .attr('markerWidth', l)
      .attr('markerHeight', w)
      .attr('viewbox', `0 0 ${l} ${w}`)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', `M2,2L${l - 2},${w / 2}L2,${w - 2}L${2 + c},${w / 2}L2,2`)
  }
}
)}

function _downloadURI(){return(
function downloadURI(uri, filename) {
  var link = document.createElement("a");
  link.target = '_blank';
  link.download = filename;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
)}

function _31(md){return(
md`## License

The code in this notebook is MIT Licensed.`
)}

function _LICENSE(){return(
"mit"
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("$")).define("$", ["tex"], _$);
  main.variable(observer("$$")).define("$$", ["tex"], _$$);
  main.variable(observer("isThumbnailDaemon")).define("isThumbnailDaemon", _isThumbnailDaemon);
  main.variable(observer()).define(["md"], _5);
  main.variable(observer("sprintf")).define("sprintf", ["require"], _sprintf);
  main.variable(observer("qs")).define("qs", ["require"], _qs);
  main.variable(observer("sig")).define("sig", ["md","html"], _sig);
  main.variable(observer("decodeHash")).define("decodeHash", _decodeHash);
  main.variable(observer("h")).define("h", _h);
  main.variable(observer()).define(["encodeHash","h"], _11);
  main.variable(observer("encodeHash")).define("encodeHash", ["URLSearchParams"], _encodeHash);
  main.variable(observer()).define(["parseQueryString"], _13);
  main.variable(observer("parseQueryString")).define("parseQueryString", ["URLSearchParams"], _parseQueryString);
  main.variable(observer("floatRgbToHex")).define("floatRgbToHex", _floatRgbToHex);
  main.variable(observer("hexRgbToFloat")).define("hexRgbToFloat", _hexRgbToFloat);
  main.variable(observer("hexToFloatRgba")).define("hexToFloatRgba", _hexToFloatRgba);
  main.variable(observer("mouseEventOffset")).define("mouseEventOffset", _mouseEventOffset);
  main.variable(observer()).define(["md"], _19);
  main.variable(observer("assert")).define("assert", ["almostEqual"], _assert);
  main.variable(observer()).define(["md"], _21);
  main.variable(observer("binarySearch")).define("binarySearch", _binarySearch);
  main.variable(observer("almostEqual")).define("almostEqual", _almostEqual);
  main.variable(observer("arrayAlmostEqual")).define("arrayAlmostEqual", ["almostEqual"], _arrayAlmostEqual);
  main.variable(observer("dup")).define("dup", _dup);
  main.variable(observer()).define(["arrayAlmostEqual"], _26);
  main.variable(observer("nextPow2")).define("nextPow2", _nextPow2);
  main.variable(observer()).define(["md"], _28);
  main.variable(observer("arrowhead")).define("arrowhead", _arrowhead);
  main.variable(observer("downloadURI")).define("downloadURI", _downloadURI);
  main.variable(observer()).define(["md"], _31);
  main.variable(observer("LICENSE")).define("LICENSE", _LICENSE);
  return main;
}
