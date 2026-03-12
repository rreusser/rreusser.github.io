// https://observablehq.com/@rreusser/gl-vec2@205
function _1(md){return(
md`# gl-vec2`
)}

function _2(md){return(
md`This notebook re-exports functions from [stackgl/gl-vec2](https://github.com/stackgl/gl-vec2). The license may be found [here](https://github.com/stackgl/gl-vec2/blob/master/LICENSE.md).`
)}

function _3(md){return(
md`## License

Copyright (c) 2013 Brandon Jones, Colin MacKenzie IV

This software is provided 'as-is', without any express or implied
warranty. In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

 1. The origin of this software must not be misrepresented you must not
    claim that you wrote the original software. If you use this software
    in a product, an acknowledgment in the product documentation would be
    appreciated but is not required.

 2. Altered source versions must be plainly marked as such, and must not
    be misrepresented as being the original software.

 3. This notice may not be removed or altered from any source distribution.`
)}

function _4(md){return(
md`## Usage

There are two basic ways to use this module. You may either import all functions

\`\`\`js
import {vec2} from '@rreusser/gl-vec2'
\`\`\`

after which you can use the functions like normal, e.g.`
)}

function _a(vec2){return(
vec2.create()
)}

function _6(md){return(
md`
or you may import single functions directly

\`\`\`js
import {vec2create} from '@rreusser/gl-vec2'
\`\`\`
`
)}

function _b(vec2create){return(
vec2create()
)}

function _8(md){return(
md`## Implementation`
)}

function _vec2(EPSILON,vec2create,vec2clone,vec2fromValues,vec2copy,vec2set,vec2equals,vec2exactEquals,vec2add,vec2subtract,vec2sub,vec2multiply,vec2mul,vec2divide,vec2div,vec2inverse,vec2min,vec2max,vec2rotate,vec2floor,vec2ceil,vec2round,vec2scale,vec2scaleAndAdd,vec2distance,vec2dist,vec2squaredDistance,vec2sqrDist,vec2length,vec2len,vec2squaredLength,vec2sqrLen,vec2negate,vec2normalize,vec2dot,vec2cross,vec2lerp,vec2random,vec2transformMat2,vec2transformMat2d,vec2transformMat3,vec2transformMat4,vec2forEach,vec2limit){return(
{
  EPSILON,
  create: vec2create,
  clone: vec2clone,
  fromValues: vec2fromValues,
  copy: vec2copy,
  set: vec2set,
  equals: vec2equals,
  exactEquals: vec2exactEquals,
  add: vec2add,
  subtract: vec2subtract,
  sub: vec2sub,
  multiply: vec2multiply,
  mul: vec2mul,
  divide: vec2divide,
  div: vec2div,
  inverse: vec2inverse,
  min: vec2min,
  max: vec2max,
  rotate: vec2rotate,
  floor: vec2floor,
  ceil: vec2ceil,
  round: vec2round,
  scale: vec2scale,
  scaleAndAdd: vec2scaleAndAdd,
  distance: vec2distance,
  dist: vec2dist,
  squaredDistance: vec2squaredDistance,
  sqrDist: vec2sqrDist,
  length: vec2length,
  len: vec2len,
  squaredLength: vec2squaredLength,
  sqrLen: vec2sqrLen,
  negate: vec2negate,
  normalize: vec2normalize,
  dot: vec2dot,
  cross: vec2cross,
  lerp: vec2lerp,
  random: vec2random,
  transformMat2: vec2transformMat2,
  transformMat2d: vec2transformMat2d,
  transformMat3: vec2transformMat3,
  transformMat4: vec2transformMat4,
  forEach: vec2forEach,
  limit: vec2limit,
}
)}

function _EPSILON(){return(
0.000001
)}

function _vec2add(){return(
function vec2add(out, a, b) {
    out[0] = a[0] + b[0]
    out[1] = a[1] + b[1]
    return out
}
)}

function _vec2ceil(){return(
function vec2ceil(out, a) {
  out[0] = Math.ceil(a[0])
  out[1] = Math.ceil(a[1])
  return out
}
)}

function _vec2clone(){return(
function vec2clone(a) {
    var out = new Float32Array(2)
    out[0] = a[0]
    out[1] = a[1]
    return out
}
)}

function _vec2copy(){return(
function vec2copy(out, a) {
    out[0] = a[0]
    out[1] = a[1]
    return out
}
)}

function _vec2create(){return(
function vec2create() {
    var out = new Float32Array(2)
    out[0] = 0
    out[1] = 0
    return out
}
)}

function _vec2cross(){return(
function vec2cross(out, a, b) {
    var z = a[0] * b[1] - a[1] * b[0]
    out[0] = out[1] = 0
    out[2] = z
    return out
}
)}

function _vec2distance(){return(
function vec2distance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1]
    return Math.sqrt(x*x + y*y)
}
)}

function _vec2dist(vec2distance){return(
vec2distance
)}

function _vec2divide(){return(
function vec2divide(out, a, b) {
    out[0] = a[0] / b[0]
    out[1] = a[1] / b[1]
    return out
}
)}

function _vec2div(vec2divide){return(
vec2divide
)}

function _vec2dot(){return(
function vec2dot(a, b) {
    return a[0] * b[0] + a[1] * b[1]
}
)}

function _vec2equals(EPSILON){return(
function vec2equals(a, b) {
  var a0 = a[0]
  var a1 = a[1]
  var b0 = b[0]
  var b1 = b[1]
  return (Math.abs(a0 - b0) <= EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
          Math.abs(a1 - b1) <= EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)))
}
)}

function _vec2exactEquals(){return(
function vec2exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1]
}
)}

function _vec2floor(){return(
function vec2floor(out, a) {
  out[0] = Math.floor(a[0])
  out[1] = Math.floor(a[1])
  return out
}
)}

function _vec2forEach(vec2create)
{
  let vec = vec2create();
  return function forEach(a, stride, offset, count, fn, arg) {
      var i, l
      if(!stride) {
          stride = 2
      }

      if(!offset) {
          offset = 0
      }

      if(count) {
          l = Math.min((count * stride) + offset, a.length)
      } else {
          l = a.length
      }

      for(i = offset; i < l; i += stride) {
          vec[0] = a[i]
          vec[1] = a[i+1]
          fn(vec, vec, arg)
          a[i] = vec[0]
          a[i+1] = vec[1]
      }

      return a
  }
}


function _vec2fromValues(){return(
function vec2fromValues(x, y) {
    var out = new Float32Array(2)
    out[0] = x
    out[1] = y
    return out
}
)}

function _vec2inverse(){return(
function vec2inverse(out, a) {
  out[0] = 1.0 / a[0]
  out[1] = 1.0 / a[1]
  return out
}
)}

function _vec2length(){return(
function vec2length(a) {
    var x = a[0],
        y = a[1]
    return Math.sqrt(x*x + y*y)
}
)}

function _vec2len(vec2length){return(
vec2length
)}

function _vec2lerp(){return(
function vec2lerp(out, a, b, t) {
    var ax = a[0],
        ay = a[1]
    out[0] = ax + t * (b[0] - ax)
    out[1] = ay + t * (b[1] - ay)
    return out
}
)}

function _vec2limit(){return(
function vec2limit(out, a, max) {
  var mSq = a[0] * a[0] + a[1] * a[1];

  if (mSq > max * max) {
    var n = Math.sqrt(mSq);
    out[0] = a[0] / n * max;
    out[1] = a[1] / n * max;
  } else {
    out[0] = a[0];
    out[1] = a[1];
  }

  return out;
}
)}

function _vec2max(){return(
function vec2max(out, a, b) {
    out[0] = Math.max(a[0], b[0])
    out[1] = Math.max(a[1], b[1])
    return out
}
)}

function _vec2min(){return(
function vec2min(out, a, b) {
    out[0] = Math.min(a[0], b[0])
    out[1] = Math.min(a[1], b[1])
    return out
}
)}

function _vec2multiply(){return(
function vec2multiply(out, a, b) {
    out[0] = a[0] * b[0]
    out[1] = a[1] * b[1]
    return out
}
)}

function _vec2mul(vec2multiply){return(
vec2multiply
)}

function _vec2negate(){return(
function vec2negate(out, a) {
    out[0] = -a[0]
    out[1] = -a[1]
    return out
}
)}

function _vec2normalize(){return(
function vec2normalize(out, a) {
    var x = a[0],
        y = a[1]
    var len = x*x + y*y
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len)
        out[0] = a[0] * len
        out[1] = a[1] * len
    }
    return out
}
)}

function _vec2random(){return(
function vec2random(out, scale) {
    scale = scale || 1.0
    var r = Math.random() * 2.0 * Math.PI
    out[0] = Math.cos(r) * scale
    out[1] = Math.sin(r) * scale
    return out
}
)}

function _vec2rotate(){return(
function vec2rotate(out, a, angle) {
  var c = Math.cos(angle),
      s = Math.sin(angle)
  var x = a[0],
      y = a[1]

  out[0] = x * c - y * s
  out[1] = x * s + y * c

  return out
}
)}

function _vec2round(){return(
function vec2round(out, a) {
  out[0] = Math.round(a[0])
  out[1] = Math.round(a[1])
  return out
}
)}

function _vec2scale(){return(
function vec2scale(out, a, b) {
    out[0] = a[0] * b
    out[1] = a[1] * b
    return out
}
)}

function _vec2scaleAndAdd(){return(
function vec2scaleAndAdd(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale)
    out[1] = a[1] + (b[1] * scale)
    return out
}
)}

function _vec2set(){return(
function vec2set(out, x, y) {
    out[0] = x
    out[1] = y
    return out
}
)}

function _vec2squaredDistance(){return(
function vec2squaredDistance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1]
    return x*x + y*y
}
)}

function _vec2sqrDist(vec2squaredDistance){return(
vec2squaredDistance
)}

function _vec2squaredLength(){return(
function vec2squaredLength(a) {
    var x = a[0],
        y = a[1]
    return x*x + y*y
}
)}

function _vec2sqrLen(vec2squaredLength){return(
vec2squaredLength
)}

function _vec2subtract(){return(
function vec2subtract(out, a, b) {
    out[0] = a[0] - b[0]
    out[1] = a[1] - b[1]
    return out
}
)}

function _vec2sub(vec2subtract){return(
vec2subtract
)}

function _vec2transformMat2(){return(
function vec2transformMat2(out, a, m) {
    var x = a[0],
        y = a[1]
    out[0] = m[0] * x + m[2] * y
    out[1] = m[1] * x + m[3] * y
    return out
}
)}

function _vec2transformMat2d(){return(
function vec2transformMat2d(out, a, m) {
    var x = a[0],
        y = a[1]
    out[0] = m[0] * x + m[2] * y + m[4]
    out[1] = m[1] * x + m[3] * y + m[5]
    return out
}
)}

function _vec2transformMat3(){return(
function vec2transformMat3(out, a, m) {
    var x = a[0],
        y = a[1]
    out[0] = m[0] * x + m[3] * y + m[6]
    out[1] = m[1] * x + m[4] * y + m[7]
    return out
}
)}

function _vec2transformMat4(){return(
function vec2transformMat4(out, a, m) {
    var x = a[0], 
        y = a[1]
    out[0] = m[0] * x + m[4] * y + m[12]
    out[1] = m[1] * x + m[5] * y + m[13]
    return out
}
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["md"], _2);
  main.variable(observer()).define(["md"], _3);
  main.variable(observer()).define(["md"], _4);
  main.variable(observer("a")).define("a", ["vec2"], _a);
  main.variable(observer()).define(["md"], _6);
  main.variable(observer("b")).define("b", ["vec2create"], _b);
  main.variable(observer()).define(["md"], _8);
  main.variable(observer("vec2")).define("vec2", ["EPSILON","vec2create","vec2clone","vec2fromValues","vec2copy","vec2set","vec2equals","vec2exactEquals","vec2add","vec2subtract","vec2sub","vec2multiply","vec2mul","vec2divide","vec2div","vec2inverse","vec2min","vec2max","vec2rotate","vec2floor","vec2ceil","vec2round","vec2scale","vec2scaleAndAdd","vec2distance","vec2dist","vec2squaredDistance","vec2sqrDist","vec2length","vec2len","vec2squaredLength","vec2sqrLen","vec2negate","vec2normalize","vec2dot","vec2cross","vec2lerp","vec2random","vec2transformMat2","vec2transformMat2d","vec2transformMat3","vec2transformMat4","vec2forEach","vec2limit"], _vec2);
  main.variable(observer("EPSILON")).define("EPSILON", _EPSILON);
  main.variable(observer("vec2add")).define("vec2add", _vec2add);
  main.variable(observer("vec2ceil")).define("vec2ceil", _vec2ceil);
  main.variable(observer("vec2clone")).define("vec2clone", _vec2clone);
  main.variable(observer("vec2copy")).define("vec2copy", _vec2copy);
  main.variable(observer("vec2create")).define("vec2create", _vec2create);
  main.variable(observer("vec2cross")).define("vec2cross", _vec2cross);
  main.variable(observer("vec2distance")).define("vec2distance", _vec2distance);
  main.variable(observer("vec2dist")).define("vec2dist", ["vec2distance"], _vec2dist);
  main.variable(observer("vec2divide")).define("vec2divide", _vec2divide);
  main.variable(observer("vec2div")).define("vec2div", ["vec2divide"], _vec2div);
  main.variable(observer("vec2dot")).define("vec2dot", _vec2dot);
  main.variable(observer("vec2equals")).define("vec2equals", ["EPSILON"], _vec2equals);
  main.variable(observer("vec2exactEquals")).define("vec2exactEquals", _vec2exactEquals);
  main.variable(observer("vec2floor")).define("vec2floor", _vec2floor);
  main.variable(observer("vec2forEach")).define("vec2forEach", ["vec2create"], _vec2forEach);
  main.variable(observer("vec2fromValues")).define("vec2fromValues", _vec2fromValues);
  main.variable(observer("vec2inverse")).define("vec2inverse", _vec2inverse);
  main.variable(observer("vec2length")).define("vec2length", _vec2length);
  main.variable(observer("vec2len")).define("vec2len", ["vec2length"], _vec2len);
  main.variable(observer("vec2lerp")).define("vec2lerp", _vec2lerp);
  main.variable(observer("vec2limit")).define("vec2limit", _vec2limit);
  main.variable(observer("vec2max")).define("vec2max", _vec2max);
  main.variable(observer("vec2min")).define("vec2min", _vec2min);
  main.variable(observer("vec2multiply")).define("vec2multiply", _vec2multiply);
  main.variable(observer("vec2mul")).define("vec2mul", ["vec2multiply"], _vec2mul);
  main.variable(observer("vec2negate")).define("vec2negate", _vec2negate);
  main.variable(observer("vec2normalize")).define("vec2normalize", _vec2normalize);
  main.variable(observer("vec2random")).define("vec2random", _vec2random);
  main.variable(observer("vec2rotate")).define("vec2rotate", _vec2rotate);
  main.variable(observer("vec2round")).define("vec2round", _vec2round);
  main.variable(observer("vec2scale")).define("vec2scale", _vec2scale);
  main.variable(observer("vec2scaleAndAdd")).define("vec2scaleAndAdd", _vec2scaleAndAdd);
  main.variable(observer("vec2set")).define("vec2set", _vec2set);
  main.variable(observer("vec2squaredDistance")).define("vec2squaredDistance", _vec2squaredDistance);
  main.variable(observer("vec2sqrDist")).define("vec2sqrDist", ["vec2squaredDistance"], _vec2sqrDist);
  main.variable(observer("vec2squaredLength")).define("vec2squaredLength", _vec2squaredLength);
  main.variable(observer("vec2sqrLen")).define("vec2sqrLen", ["vec2squaredLength"], _vec2sqrLen);
  main.variable(observer("vec2subtract")).define("vec2subtract", _vec2subtract);
  main.variable(observer("vec2sub")).define("vec2sub", ["vec2subtract"], _vec2sub);
  main.variable(observer("vec2transformMat2")).define("vec2transformMat2", _vec2transformMat2);
  main.variable(observer("vec2transformMat2d")).define("vec2transformMat2d", _vec2transformMat2d);
  main.variable(observer("vec2transformMat3")).define("vec2transformMat3", _vec2transformMat3);
  main.variable(observer("vec2transformMat4")).define("vec2transformMat4", _vec2transformMat4);
  return main;
}
