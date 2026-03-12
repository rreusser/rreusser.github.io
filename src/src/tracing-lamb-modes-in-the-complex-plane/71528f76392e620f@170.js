// https://observablehq.com/@rreusser/gl-vec3@170
function _1(md){return(
md`# gl-vec3`
)}

function _2(md){return(
md`This notebook re-exports functions from [stackgl/gl-vec3](https://github.com/stackgl/gl-vec3). The license may be found [here](https://github.com/stackgl/gl-vec3/blob/master/LICENSE.md).`
)}

function _3(md){return(
md`## License

Copyright (c) 2013 Brandon Jones, Colin MacKenzie IV

This software is provided 'as-is', without any express or implied warranty. In no event will the authors be held liable for any damages arising from the use of this software.

Permission is granted to anyone to use this software for any purpose, including commercial applications, and to alter it and redistribute it freely, subject to the following restrictions:

The origin of this software must not be misrepresented you must not claim that you wrote the original software. If you use this software in a product, an acknowledgment in the product documentation would be appreciated but is not required.

Altered source versions must be plainly marked as such, and must not be misrepresented as being the original software.

This notice may not be removed or altered from any source distribution.
`
)}

function _4(md){return(
md`## Usage

There are two basic ways to use this module. You may either import all functions

\`\`\`js
import {vec3} from '@rreusser/gl-vec3'
\`\`\`

after which you can use the functions like normal, e.g.`
)}

function _a(vec3){return(
vec3.create()
)}

function _6(md){return(
md`
or you may import single functions directly

\`\`\`js
import {vec3create} from '@rreusser/gl-vec3'
\`\`\`
`
)}

function _b(vec3create){return(
vec3create()
)}

function _8(md){return(
md`## Implementation`
)}

function _vec3(EPSILON,vec3create,vec3clone,vec3angle,vec3fromValues,vec3copy,vec3set,vec3equals,vec3exactEquals,vec3add,vec3subtract,vec3sub,vec3multiply,vec3mul,vec3divide,vec3div,vec3min,vec3max,vec3floor,vec3ceil,vec3round,vec3scale,vec3scaleAndAdd,vec3distance,vec3dist,vec3squaredDistance,vec3sqrDist,vec3length,vec3len,vec3squaredLength,vec3sqrLen,vec3negate,vec3inverse,vec3normalize,vec3dot,vec3cross,vec3lerp,vec3random,vec3transformMat4,vec3transformMat3,vec3transformQuat,vec3rotateX,vec3rotateY,vec3rotateZ,vec3forEach){return(
{
  EPSILON, 
  create: vec3create,
  clone: vec3clone,
  angle: vec3angle,
  fromValues: vec3fromValues,
  copy: vec3copy,
  set: vec3set,
  equals: vec3equals,
  exactEquals: vec3exactEquals,
  add: vec3add,
  subtract: vec3subtract,
  sub: vec3sub,
  multiply: vec3multiply,
  mul: vec3mul,
  divide: vec3divide,
  div: vec3div,
  min: vec3min,
  max: vec3max,
  floor: vec3floor,
  ceil: vec3ceil,
  round: vec3round,
  scale: vec3scale,
  scaleAndAdd: vec3scaleAndAdd,
  distance: vec3distance,
  dist: vec3dist,
  squaredDistance: vec3squaredDistance,
  sqrDist: vec3sqrDist,
  length: vec3length,
  len: vec3len,
  squaredLength: vec3squaredLength,
  sqrLen: vec3sqrLen,
  negate: vec3negate,
  inverse: vec3inverse,
  normalize: vec3normalize,
  dot: vec3dot,
  cross: vec3cross,
  lerp: vec3lerp,
  random: vec3random,
  transformMat4: vec3transformMat4,
  transformMat3: vec3transformMat3,
  transformQuat: vec3transformQuat,
  rotateX: vec3rotateX,
  rotateY: vec3rotateY,
  rotateZ: vec3rotateZ,
  forEach: vec3forEach,
}
)}

function _EPSILON(){return(
0.000001
)}

function _vec3add(){return(
function vec3add(out, a, b) {
    out[0] = a[0] + b[0]
    out[1] = a[1] + b[1]
    out[2] = a[2] + b[2]
    return out
}
)}

function _vec3angle(vec3fromValues,vec3normalize,vec3dot){return(
function vec3angle(a, b) {
    var tempA = vec3fromValues(a[0], a[1], a[2])
    var tempB = vec3fromValues(b[0], b[1], b[2])
 
    vec3normalize(tempA, tempA)
    vec3normalize(tempB, tempB)
 
    var cosine = vec3dot(tempA, tempB)

    if(cosine > 1.0){
        return 0
    } else {
        return Math.acos(cosine)
    }     
}
)}

function _vec3ceil(){return(
function vec3ceil(out, a) {
  out[0] = Math.ceil(a[0])
  out[1] = Math.ceil(a[1])
  out[2] = Math.ceil(a[2])
  return out
}
)}

function _vec3clone(){return(
function vec3clone(a) {
    var out = new Float32Array(3)
    out[0] = a[0]
    out[1] = a[1]
    out[2] = a[2]
    return out
}
)}

function _vec3copy(){return(
function vec3copy(out, a) {
    out[0] = a[0]
    out[1] = a[1]
    out[2] = a[2]
    return out
}
)}

function _vec3create(){return(
function vec3create() {
    var out = new Float32Array(3)
    out[0] = 0
    out[1] = 0
    out[2] = 0
    return out
}
)}

function _vec3cross(){return(
function vec3cross(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2],
        bx = b[0], by = b[1], bz = b[2]

    out[0] = ay * bz - az * by
    out[1] = az * bx - ax * bz
    out[2] = ax * by - ay * bx
    return out
}
)}

function _vec3distance(){return(
function vec3distance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2]
    return Math.sqrt(x*x + y*y + z*z)
}
)}

function _vec3dist(vec3distance){return(
vec3distance
)}

function _vec3divide(){return(
function vec3divide(out, a, b) {
    out[0] = a[0] / b[0]
    out[1] = a[1] / b[1]
    out[2] = a[2] / b[2]
    return out
}
)}

function _vec3div(vec3divide){return(
vec3divide
)}

function _vec3dot(){return(
function vec3dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
)}

function _vec3equals(EPSILON){return(
function vec3equals(a, b) {
  var a0 = a[0]
  var a1 = a[1]
  var a2 = a[2]
  var b0 = b[0]
  var b1 = b[1]
  var b2 = b[2]
  return (Math.abs(a0 - b0) <= EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
          Math.abs(a1 - b1) <= EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
          Math.abs(a2 - b2) <= EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)))
}
)}

function _vec3exactEquals(){return(
function vec3exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}
)}

function _vec3floor(){return(
function vec3floor(out, a) {
  out[0] = Math.floor(a[0])
  out[1] = Math.floor(a[1])
  out[2] = Math.floor(a[2])
  return out
}
)}

function _vec3forEach(vec3create)
{
  let vec = vec3create()
  return function vec3forEach(a, stride, offset, count, fn, arg) {
        var i, l
        if(!stride) {
            stride = 3
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
            vec[2] = a[i+2]
            fn(vec, vec, arg)
            a[i] = vec[0] 
            a[i+1] = vec[1] 
            a[i+2] = vec[2]
        }
        
        return a
    }
}


function _vec3fromValues(){return(
function vec3fromValues(x, y, z) {
    var out = new Float32Array(3)
    out[0] = x
    out[1] = y
    out[2] = z
    return out
}
)}

function _vec3inverse(){return(
function vec3inverse(out, a) {
  out[0] = 1.0 / a[0]
  out[1] = 1.0 / a[1]
  out[2] = 1.0 / a[2]
  return out
}
)}

function _vec3length(){return(
function vec3length(a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    return Math.sqrt(x*x + y*y + z*z)
}
)}

function _vec3len(vec3length){return(
vec3length
)}

function _vec3lerp(){return(
function vec3lerp(out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2]
    out[0] = ax + t * (b[0] - ax)
    out[1] = ay + t * (b[1] - ay)
    out[2] = az + t * (b[2] - az)
    return out
}
)}

function _vec3max(){return(
function vec3max(out, a, b) {
    out[0] = Math.max(a[0], b[0])
    out[1] = Math.max(a[1], b[1])
    out[2] = Math.max(a[2], b[2])
    return out
}
)}

function _vec3min(){return(
function vec3min(out, a, b) {
    out[0] = Math.min(a[0], b[0])
    out[1] = Math.min(a[1], b[1])
    out[2] = Math.min(a[2], b[2])
    return out
}
)}

function _vec3multiply(){return(
function vec3multiply(out, a, b) {
    out[0] = a[0] * b[0]
    out[1] = a[1] * b[1]
    out[2] = a[2] * b[2]
    return out
}
)}

function _vec3mul(vec3multiply){return(
vec3multiply
)}

function _vec3negate(){return(
function vec3negate(out, a) {
    out[0] = -a[0]
    out[1] = -a[1]
    out[2] = -a[2]
    return out
}
)}

function _vec3normalize(){return(
function vec3normalize(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    var len = x*x + y*y + z*z
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len)
        out[0] = a[0] * len
        out[1] = a[1] * len
        out[2] = a[2] * len
    }
    return out
}
)}

function _vec3random(){return(
function vec3random(out, scale) {
    scale = scale || 1.0

    var r = Math.random() * 2.0 * Math.PI
    var z = (Math.random() * 2.0) - 1.0
    var zScale = Math.sqrt(1.0-z*z) * scale

    out[0] = Math.cos(r) * zScale
    out[1] = Math.sin(r) * zScale
    out[2] = z * scale
    return out
}
)}

function _vec3rotateX(){return(
function vec3rotateX(out, a, b, c){
    var by = b[1]
    var bz = b[2]

    // Translate point to the origin
    var py = a[1] - by
    var pz = a[2] - bz

    var sc = Math.sin(c)
    var cc = Math.cos(c)

    // perform rotation and translate to correct position
    out[0] = a[0]
    out[1] = by + py * cc - pz * sc
    out[2] = bz + py * sc + pz * cc

    return out
}
)}

function _vec3rotateY(){return(
function vec3rotateY(out, a, b, c){
    var bx = b[0]
    var bz = b[2]

    // translate point to the origin
    var px = a[0] - bx
    var pz = a[2] - bz
    
    var sc = Math.sin(c)
    var cc = Math.cos(c)
  
    // perform rotation and translate to correct position
    out[0] = bx + pz * sc + px * cc
    out[1] = a[1]
    out[2] = bz + pz * cc - px * sc
  
    return out
}
)}

function _vec3rotateZ(){return(
function vec3rotateZ(out, a, b, c){
    var bx = b[0]
    var by = b[1]

    //Translate point to the origin
    var px = a[0] - bx
    var py = a[1] - by
  
    var sc = Math.sin(c)
    var cc = Math.cos(c)

    // perform rotation and translate to correct position
    out[0] = bx + px * cc - py * sc
    out[1] = by + px * sc + py * cc
    out[2] = a[2]
  
    return out
}
)}

function _vec3round(){return(
function vec3round(out, a) {
  out[0] = Math.round(a[0])
  out[1] = Math.round(a[1])
  out[2] = Math.round(a[2])
  return out
}
)}

function _vec3scale(){return(
function vec3scale(out, a, b) {
    out[0] = a[0] * b
    out[1] = a[1] * b
    out[2] = a[2] * b
    return out
}
)}

function _vec3scaleAndAdd(){return(
function vec3scaleAndAdd(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale)
    out[1] = a[1] + (b[1] * scale)
    out[2] = a[2] + (b[2] * scale)
    return out
}
)}

function _vec3set(){return(
function vec3set(out, x, y, z) {
    out[0] = x
    out[1] = y
    out[2] = z
    return out
}
)}

function _vec3squaredDistance(){return(
function vec3squaredDistance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2]
    return x*x + y*y + z*z
}
)}

function _vec3sqrDist(vec3squaredDistance){return(
vec3squaredDistance
)}

function _vec3squaredLength(){return(
function vec3squaredLength(a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    return x*x + y*y + z*z
}
)}

function _vec3sqrLen(vec3squaredLength){return(
vec3squaredLength
)}

function _vec3subtract(){return(
function vec3subtract(out, a, b) {
    out[0] = a[0] - b[0]
    out[1] = a[1] - b[1]
    out[2] = a[2] - b[2]
    return out
}
)}

function _vec3sub(vec3subtract){return(
vec3subtract
)}

function _vec3transformMat3(){return(
function vec3transformMat3(out, a, m) {
    var x = a[0], y = a[1], z = a[2]
    out[0] = x * m[0] + y * m[3] + z * m[6]
    out[1] = x * m[1] + y * m[4] + z * m[7]
    out[2] = x * m[2] + y * m[5] + z * m[8]
    return out
}
)}

function _vec3transformMat4(){return(
function vec3transformMat4(out, a, m) {
    var x = a[0], y = a[1], z = a[2],
        w = m[3] * x + m[7] * y + m[11] * z + m[15]
    w = w || 1.0
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
    return out
}
)}

function _vec3transformQuat(){return(
function vec3transformQuat(out, a, q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx
    return out
}
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["md"], _2);
  main.variable(observer()).define(["md"], _3);
  main.variable(observer()).define(["md"], _4);
  main.variable(observer("a")).define("a", ["vec3"], _a);
  main.variable(observer()).define(["md"], _6);
  main.variable(observer("b")).define("b", ["vec3create"], _b);
  main.variable(observer()).define(["md"], _8);
  main.variable(observer("vec3")).define("vec3", ["EPSILON","vec3create","vec3clone","vec3angle","vec3fromValues","vec3copy","vec3set","vec3equals","vec3exactEquals","vec3add","vec3subtract","vec3sub","vec3multiply","vec3mul","vec3divide","vec3div","vec3min","vec3max","vec3floor","vec3ceil","vec3round","vec3scale","vec3scaleAndAdd","vec3distance","vec3dist","vec3squaredDistance","vec3sqrDist","vec3length","vec3len","vec3squaredLength","vec3sqrLen","vec3negate","vec3inverse","vec3normalize","vec3dot","vec3cross","vec3lerp","vec3random","vec3transformMat4","vec3transformMat3","vec3transformQuat","vec3rotateX","vec3rotateY","vec3rotateZ","vec3forEach"], _vec3);
  main.variable(observer("EPSILON")).define("EPSILON", _EPSILON);
  main.variable(observer("vec3add")).define("vec3add", _vec3add);
  main.variable(observer("vec3angle")).define("vec3angle", ["vec3fromValues","vec3normalize","vec3dot"], _vec3angle);
  main.variable(observer("vec3ceil")).define("vec3ceil", _vec3ceil);
  main.variable(observer("vec3clone")).define("vec3clone", _vec3clone);
  main.variable(observer("vec3copy")).define("vec3copy", _vec3copy);
  main.variable(observer("vec3create")).define("vec3create", _vec3create);
  main.variable(observer("vec3cross")).define("vec3cross", _vec3cross);
  main.variable(observer("vec3distance")).define("vec3distance", _vec3distance);
  main.variable(observer("vec3dist")).define("vec3dist", ["vec3distance"], _vec3dist);
  main.variable(observer("vec3divide")).define("vec3divide", _vec3divide);
  main.variable(observer("vec3div")).define("vec3div", ["vec3divide"], _vec3div);
  main.variable(observer("vec3dot")).define("vec3dot", _vec3dot);
  main.variable(observer("vec3equals")).define("vec3equals", ["EPSILON"], _vec3equals);
  main.variable(observer("vec3exactEquals")).define("vec3exactEquals", _vec3exactEquals);
  main.variable(observer("vec3floor")).define("vec3floor", _vec3floor);
  main.variable(observer("vec3forEach")).define("vec3forEach", ["vec3create"], _vec3forEach);
  main.variable(observer("vec3fromValues")).define("vec3fromValues", _vec3fromValues);
  main.variable(observer("vec3inverse")).define("vec3inverse", _vec3inverse);
  main.variable(observer("vec3length")).define("vec3length", _vec3length);
  main.variable(observer("vec3len")).define("vec3len", ["vec3length"], _vec3len);
  main.variable(observer("vec3lerp")).define("vec3lerp", _vec3lerp);
  main.variable(observer("vec3max")).define("vec3max", _vec3max);
  main.variable(observer("vec3min")).define("vec3min", _vec3min);
  main.variable(observer("vec3multiply")).define("vec3multiply", _vec3multiply);
  main.variable(observer("vec3mul")).define("vec3mul", ["vec3multiply"], _vec3mul);
  main.variable(observer("vec3negate")).define("vec3negate", _vec3negate);
  main.variable(observer("vec3normalize")).define("vec3normalize", _vec3normalize);
  main.variable(observer("vec3random")).define("vec3random", _vec3random);
  main.variable(observer("vec3rotateX")).define("vec3rotateX", _vec3rotateX);
  main.variable(observer("vec3rotateY")).define("vec3rotateY", _vec3rotateY);
  main.variable(observer("vec3rotateZ")).define("vec3rotateZ", _vec3rotateZ);
  main.variable(observer("vec3round")).define("vec3round", _vec3round);
  main.variable(observer("vec3scale")).define("vec3scale", _vec3scale);
  main.variable(observer("vec3scaleAndAdd")).define("vec3scaleAndAdd", _vec3scaleAndAdd);
  main.variable(observer("vec3set")).define("vec3set", _vec3set);
  main.variable(observer("vec3squaredDistance")).define("vec3squaredDistance", _vec3squaredDistance);
  main.variable(observer("vec3sqrDist")).define("vec3sqrDist", ["vec3squaredDistance"], _vec3sqrDist);
  main.variable(observer("vec3squaredLength")).define("vec3squaredLength", _vec3squaredLength);
  main.variable(observer("vec3sqrLen")).define("vec3sqrLen", ["vec3squaredLength"], _vec3sqrLen);
  main.variable(observer("vec3subtract")).define("vec3subtract", _vec3subtract);
  main.variable(observer("vec3sub")).define("vec3sub", ["vec3subtract"], _vec3sub);
  main.variable(observer("vec3transformMat3")).define("vec3transformMat3", _vec3transformMat3);
  main.variable(observer("vec3transformMat4")).define("vec3transformMat4", _vec3transformMat4);
  main.variable(observer("vec3transformQuat")).define("vec3transformQuat", _vec3transformQuat);
  return main;
}
