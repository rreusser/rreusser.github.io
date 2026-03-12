function _1(md){return(
md`# regl-camera`
)}

function _createReglCamera(self,require)
{
  var global = {};
  var exports = {};
  var module = {};
  var define;
  (function(f) {
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = f();
    } else if (typeof define === "function" && define.amd) {
      define([], f);
    } else {
      var g;
      if (typeof window !== "undefined") {
        g = window;
      } else if (typeof global !== "undefined") {
        g = global;
      } else if (typeof self !== "undefined") {
        g = self;
      } else {
        g = this;
      }
      g.createREGLCamera = f();
    }
  })(function() {
    var define, module, exports;
    return (function() {
      function r(e, n, t) {
        function o(i, f) {
          if (!n[i]) {
            if (!e[i]) {
              var c = "function" == typeof require && require;
              if (!f && c) return c(i, !0);
              if (u) return u(i, !0);
              var a = new Error("Cannot find module '" + i + "'");
              throw ((a.code = "MODULE_NOT_FOUND"), a);
            }
            var p = (n[i] = { exports: {} });
            e[i][0].call(
              p.exports,
              function(r) {
                var n = e[i][1][r];
                return o(n || r);
              },
              p,
              p.exports,
              r,
              e,
              n,
              t
            );
          }
          return n[i].exports;
        }
        for (
          var u = "function" == typeof require && require, i = 0;
          i < t.length;
          i++
        )
          o(t[i]);
        return o;
      }
      return r;
    })()(
      {
        1: [
          function(require, module, exports) {
            module.exports = create;

            /**
             * Creates a new identity mat4
             *
             * @returns {mat4} a new 4x4 matrix
             */
            function create() {
              var out = new Float32Array(16);
              out[0] = 1;
              out[1] = 0;
              out[2] = 0;
              out[3] = 0;
              out[4] = 0;
              out[5] = 1;
              out[6] = 0;
              out[7] = 0;
              out[8] = 0;
              out[9] = 0;
              out[10] = 1;
              out[11] = 0;
              out[12] = 0;
              out[13] = 0;
              out[14] = 0;
              out[15] = 1;
              return out;
            }
          },
          {}
        ],
        2: [
          function(require, module, exports) {
            module.exports = identity;

            /**
             * Set a mat4 to the identity matrix
             *
             * @param {mat4} out the receiving matrix
             * @returns {mat4} out
             */
            function identity(out) {
              out[0] = 1;
              out[1] = 0;
              out[2] = 0;
              out[3] = 0;
              out[4] = 0;
              out[5] = 1;
              out[6] = 0;
              out[7] = 0;
              out[8] = 0;
              out[9] = 0;
              out[10] = 1;
              out[11] = 0;
              out[12] = 0;
              out[13] = 0;
              out[14] = 0;
              out[15] = 1;
              return out;
            }
          },
          {}
        ],
        3: [
          function(require, module, exports) {
            module.exports = invert;

            /**
             * Inverts a mat4
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the source matrix
             * @returns {mat4} out
             */
            function invert(out, a) {
              var a00 = a[0],
                a01 = a[1],
                a02 = a[2],
                a03 = a[3],
                a10 = a[4],
                a11 = a[5],
                a12 = a[6],
                a13 = a[7],
                a20 = a[8],
                a21 = a[9],
                a22 = a[10],
                a23 = a[11],
                a30 = a[12],
                a31 = a[13],
                a32 = a[14],
                a33 = a[15],
                b00 = a00 * a11 - a01 * a10,
                b01 = a00 * a12 - a02 * a10,
                b02 = a00 * a13 - a03 * a10,
                b03 = a01 * a12 - a02 * a11,
                b04 = a01 * a13 - a03 * a11,
                b05 = a02 * a13 - a03 * a12,
                b06 = a20 * a31 - a21 * a30,
                b07 = a20 * a32 - a22 * a30,
                b08 = a20 * a33 - a23 * a30,
                b09 = a21 * a32 - a22 * a31,
                b10 = a21 * a33 - a23 * a31,
                b11 = a22 * a33 - a23 * a32,
                // Calculate the determinant
                det =
                  b00 * b11 -
                  b01 * b10 +
                  b02 * b09 +
                  b03 * b08 -
                  b04 * b07 +
                  b05 * b06;

              if (!det) {
                return null;
              }
              det = 1.0 / det;

              out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
              out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
              out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
              out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
              out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
              out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
              out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
              out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
              out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
              out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
              out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
              out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
              out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
              out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
              out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
              out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

              return out;
            }
          },
          {}
        ],
        4: [
          function(require, module, exports) {
            var identity = require('./identity');

            module.exports = lookAt;

            /**
             * Generates a look-at matrix with the given eye position, focal point, and up axis
             *
             * @param {mat4} out mat4 frustum matrix will be written into
             * @param {vec3} eye Position of the viewer
             * @param {vec3} center Point the viewer is looking at
             * @param {vec3} up vec3 pointing up
             * @returns {mat4} out
             */
            function lookAt(out, eye, center, up) {
              var x0,
                x1,
                x2,
                y0,
                y1,
                y2,
                z0,
                z1,
                z2,
                len,
                eyex = eye[0],
                eyey = eye[1],
                eyez = eye[2],
                upx = up[0],
                upy = up[1],
                upz = up[2],
                centerx = center[0],
                centery = center[1],
                centerz = center[2];

              if (
                Math.abs(eyex - centerx) < 0.000001 &&
                Math.abs(eyey - centery) < 0.000001 &&
                Math.abs(eyez - centerz) < 0.000001
              ) {
                return identity(out);
              }

              z0 = eyex - centerx;
              z1 = eyey - centery;
              z2 = eyez - centerz;

              len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
              z0 *= len;
              z1 *= len;
              z2 *= len;

              x0 = upy * z2 - upz * z1;
              x1 = upz * z0 - upx * z2;
              x2 = upx * z1 - upy * z0;
              len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
              if (!len) {
                x0 = 0;
                x1 = 0;
                x2 = 0;
              } else {
                len = 1 / len;
                x0 *= len;
                x1 *= len;
                x2 *= len;
              }

              y0 = z1 * x2 - z2 * x1;
              y1 = z2 * x0 - z0 * x2;
              y2 = z0 * x1 - z1 * x0;

              len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
              if (!len) {
                y0 = 0;
                y1 = 0;
                y2 = 0;
              } else {
                len = 1 / len;
                y0 *= len;
                y1 *= len;
                y2 *= len;
              }

              out[0] = x0;
              out[1] = y0;
              out[2] = z0;
              out[3] = 0;
              out[4] = x1;
              out[5] = y1;
              out[6] = z1;
              out[7] = 0;
              out[8] = x2;
              out[9] = y2;
              out[10] = z2;
              out[11] = 0;
              out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
              out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
              out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
              out[15] = 1;

              return out;
            }
          },
          { "./identity": 2 }
        ],
        5: [
          function(require, module, exports) {
            module.exports = multiply;

            /**
             * Multiplies two mat4's
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the first operand
             * @param {mat4} b the second operand
             * @returns {mat4} out
             */
            function multiply(out, a, b) {
              var a00 = a[0],
                a01 = a[1],
                a02 = a[2],
                a03 = a[3],
                a10 = a[4],
                a11 = a[5],
                a12 = a[6],
                a13 = a[7],
                a20 = a[8],
                a21 = a[9],
                a22 = a[10],
                a23 = a[11],
                a30 = a[12],
                a31 = a[13],
                a32 = a[14],
                a33 = a[15];

              // Cache only the current line of the second matrix
              var b0 = b[0],
                b1 = b[1],
                b2 = b[2],
                b3 = b[3];
              out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
              out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
              out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
              out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

              b0 = b[4];
              b1 = b[5];
              b2 = b[6];
              b3 = b[7];
              out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
              out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
              out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
              out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

              b0 = b[8];
              b1 = b[9];
              b2 = b[10];
              b3 = b[11];
              out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
              out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
              out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
              out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

              b0 = b[12];
              b1 = b[13];
              b2 = b[14];
              b3 = b[15];
              out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
              out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
              out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
              out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
              return out;
            }
          },
          {}
        ],
        6: [
          function(require, module, exports) {
            module.exports = perspective;

            /**
             * Generates a perspective projection matrix with the given bounds
             *
             * @param {mat4} out mat4 frustum matrix will be written into
             * @param {number} fovy Vertical field of view in radians
             * @param {number} aspect Aspect ratio. typically viewport width/height
             * @param {number} near Near bound of the frustum
             * @param {number} far Far bound of the frustum
             * @returns {mat4} out
             */
            function perspective(out, fovy, aspect, near, far) {
              var f = 1.0 / Math.tan(fovy / 2),
                nf = 1 / (near - far);
              out[0] = f / aspect;
              out[1] = 0;
              out[2] = 0;
              out[3] = 0;
              out[4] = 0;
              out[5] = f;
              out[6] = 0;
              out[7] = 0;
              out[8] = 0;
              out[9] = 0;
              out[10] = (far + near) * nf;
              out[11] = -1;
              out[12] = 0;
              out[13] = 0;
              out[14] = 2 * far * near * nf;
              out[15] = 0;
              return out;
            }
          },
          {}
        ],
        7: [
          function(require, module, exports) {
            module.exports = scale;

            /**
             * Scales the mat4 by the dimensions in the given vec3
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to scale
             * @param {vec3} v the vec3 to scale the matrix by
             * @returns {mat4} out
             **/
            function scale(out, a, v) {
              var x = v[0],
                y = v[1],
                z = v[2];

              out[0] = a[0] * x;
              out[1] = a[1] * x;
              out[2] = a[2] * x;
              out[3] = a[3] * x;
              out[4] = a[4] * y;
              out[5] = a[5] * y;
              out[6] = a[6] * y;
              out[7] = a[7] * y;
              out[8] = a[8] * z;
              out[9] = a[9] * z;
              out[10] = a[10] * z;
              out[11] = a[11] * z;
              out[12] = a[12];
              out[13] = a[13];
              out[14] = a[14];
              out[15] = a[15];
              return out;
            }
          },
          {}
        ],
        8: [
          function(require, module, exports) {
            module.exports = translate;

            /**
             * Translate a mat4 by the given vector
             *
             * @param {mat4} out the receiving matrix
             * @param {mat4} a the matrix to translate
             * @param {vec3} v vector to translate by
             * @returns {mat4} out
             */
            function translate(out, a, v) {
              var x = v[0],
                y = v[1],
                z = v[2],
                a00,
                a01,
                a02,
                a03,
                a10,
                a11,
                a12,
                a13,
                a20,
                a21,
                a22,
                a23;

              if (a === out) {
                out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
                out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
                out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
                out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
              } else {
                a00 = a[0];
                a01 = a[1];
                a02 = a[2];
                a03 = a[3];
                a10 = a[4];
                a11 = a[5];
                a12 = a[6];
                a13 = a[7];
                a20 = a[8];
                a21 = a[9];
                a22 = a[10];
                a23 = a[11];

                out[0] = a00;
                out[1] = a01;
                out[2] = a02;
                out[3] = a03;
                out[4] = a10;
                out[5] = a11;
                out[6] = a12;
                out[7] = a13;
                out[8] = a20;
                out[9] = a21;
                out[10] = a22;
                out[11] = a23;

                out[12] = a00 * x + a10 * y + a20 * z + a[12];
                out[13] = a01 * x + a11 * y + a21 * z + a[13];
                out[14] = a02 * x + a12 * y + a22 * z + a[14];
                out[15] = a03 * x + a13 * y + a23 * z + a[15];
              }

              return out;
            }
          },
          {}
        ],
        9: [
          function(require, module, exports) {
            module.exports = add;

            /**
             * Adds two vec3's
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @returns {vec3} out
             */
            function add(out, a, b) {
              out[0] = a[0] + b[0];
              out[1] = a[1] + b[1];
              out[2] = a[2] + b[2];
              return out;
            }
          },
          {}
        ],
        10: [
          function(require, module, exports) {
            module.exports = copy;

            /**
             * Copy the values from one vec3 to another
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the source vector
             * @returns {vec3} out
             */
            function copy(out, a) {
              out[0] = a[0];
              out[1] = a[1];
              out[2] = a[2];
              return out;
            }
          },
          {}
        ],
        11: [
          function(require, module, exports) {
            module.exports = 0.000001;
          },
          {}
        ],
        12: [
          function(require, module, exports) {
            module.exports = equals;

            var EPSILON = require('./epsilon');

            /**
             * Returns whether or not the vectors have approximately the same elements in the same position.
             *
             * @param {vec3} a The first vector.
             * @param {vec3} b The second vector.
             * @returns {Boolean} True if the vectors are equal, false otherwise.
             */
            function equals(a, b) {
              var a0 = a[0];
              var a1 = a[1];
              var a2 = a[2];
              var b0 = b[0];
              var b1 = b[1];
              var b2 = b[2];
              return (
                Math.abs(a0 - b0) <=
                  EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
                Math.abs(a1 - b1) <=
                  EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
                Math.abs(a2 - b2) <=
                  EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2))
              );
            }
          },
          { "./epsilon": 11 }
        ],
        13: [
          function(require, module, exports) {
            module.exports = normalize;

            /**
             * Normalize a vec3
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a vector to normalize
             * @returns {vec3} out
             */
            function normalize(out, a) {
              var x = a[0],
                y = a[1],
                z = a[2];
              var len = x * x + y * y + z * z;
              if (len > 0) {
                //TODO: evaluate use of glm_invsqrt here?
                len = 1 / Math.sqrt(len);
                out[0] = a[0] * len;
                out[1] = a[1] * len;
                out[2] = a[2] * len;
              }
              return out;
            }
          },
          {}
        ],
        14: [
          function(require, module, exports) {
            module.exports = rotateX;

            /**
             * Rotate a 3D vector around the x-axis
             * @param {vec3} out The receiving vec3
             * @param {vec3} a The vec3 point to rotate
             * @param {vec3} b The origin of the rotation
             * @param {Number} c The angle of rotation
             * @returns {vec3} out
             */
            function rotateX(out, a, b, c) {
              var by = b[1];
              var bz = b[2];

              // Translate point to the origin
              var py = a[1] - by;
              var pz = a[2] - bz;

              var sc = Math.sin(c);
              var cc = Math.cos(c);

              // perform rotation and translate to correct position
              out[0] = a[0];
              out[1] = by + py * cc - pz * sc;
              out[2] = bz + py * sc + pz * cc;

              return out;
            }
          },
          {}
        ],
        15: [
          function(require, module, exports) {
            module.exports = rotateY;

            /**
             * Rotate a 3D vector around the y-axis
             * @param {vec3} out The receiving vec3
             * @param {vec3} a The vec3 point to rotate
             * @param {vec3} b The origin of the rotation
             * @param {Number} c The angle of rotation
             * @returns {vec3} out
             */
            function rotateY(out, a, b, c) {
              var bx = b[0];
              var bz = b[2];

              // translate point to the origin
              var px = a[0] - bx;
              var pz = a[2] - bz;

              var sc = Math.sin(c);
              var cc = Math.cos(c);

              // perform rotation and translate to correct position
              out[0] = bx + pz * sc + px * cc;
              out[1] = a[1];
              out[2] = bz + pz * cc - px * sc;

              return out;
            }
          },
          {}
        ],
        16: [
          function(require, module, exports) {
            module.exports = scaleAndAdd;

            /**
             * Adds two vec3's after scaling the second operand by a scalar value
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the first operand
             * @param {vec3} b the second operand
             * @param {Number} scale the amount to scale b by before adding
             * @returns {vec3} out
             */
            function scaleAndAdd(out, a, b, scale) {
              out[0] = a[0] + b[0] * scale;
              out[1] = a[1] + b[1] * scale;
              out[2] = a[2] + b[2] * scale;
              return out;
            }
          },
          {}
        ],
        17: [
          function(require, module, exports) {
            module.exports = transformMat4;

            /**
             * Transforms the vec3 with a mat4.
             * 4th vector component is implicitly '1'
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the vector to transform
             * @param {mat4} m matrix to transform with
             * @returns {vec3} out
             */
            function transformMat4(out, a, m) {
              var x = a[0],
                y = a[1],
                z = a[2],
                w = m[3] * x + m[7] * y + m[11] * z + m[15];
              w = w || 1.0;
              out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
              out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
              out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
              return out;
            }
          },
          {}
        ],
        18: [
          function(require, module, exports) {
            "use strict";

            var transformMat4 = require('gl-vec3/transformMat4');
            var vec3RotateY = require('gl-vec3/rotateY');
            var vec3RotateX = require('gl-vec3/rotateX');
            var vec3Equals = require('gl-vec3/equals');
            var vec3Add = require('gl-vec3/add');
            var vec3ScaleAndAdd = require('gl-vec3/scaleAndAdd');
            var vec3Copy = require('gl-vec3/copy');
            var vec3Normalize = require('gl-vec3/normalize');
            var mat4Identity = require('gl-mat4/identity');
            var mat4Invert = require('gl-mat4/invert');
            var mat4Translate = require('gl-mat4/translate');
            var mat4Scale = require('gl-mat4/scale');
            var lookAt = require('gl-mat4/lookAt');
            var perspective = require('gl-mat4/perspective');

            // This is a quick and dirty way of avoiding the poles.
            var MAX_PHI = Math.PI * 0.5 - 1e-4;
            var MIN_PHI = -Math.PI * 0.5 + 1e-4;

            module.exports = function createCamera(opts) {
              opts = opts || {};

              // A proxy flag with which we track the dirty params so that it doesn't need
              // an extra method to tell the camera that the scene *has been* rendered.
              var willBeDirty = true;

              var params = {
                aspectRatio: opts.aspectRatio ? opts.aspectRatio : 1,

                // Zoom about the cursor as opposed to the center of the scene
                zoomAboutCursor:
                  opts.zoomAboutCursor === undefined
                    ? true
                    : opts.zoomAboutCursor,

                // Spherical coords!
                distance: opts.distance === undefined ? 10 : opts.distance,
                phi: opts.phi === undefined ? 0 : opts.phi,
                theta: opts.theta === undefined ? 0 : opts.theta,

                // Camera parameters
                fovY: opts.fovY === undefined ? Math.PI / 4 : opts.fovY,
                near: opts.near === undefined ? 0.1 : opts.near,
                far: opts.far === undefined ? 100 : opts.far,

                // Decay of inertia, in ms
                panDecayTime: opts.panDecayTime || 100,
                zoomDecayTime: opts.zoomDecayTime || 100,
                rotationDecayTime: opts.rotationDecayTime || 100,

                dirty: true,

                up: opts.up || new Float32Array([0, 1, 0]),
                center: opts.center || new Float32Array(3),
                rotationCenter:
                  opts.rotationCenter ||
                  (opts.center && opts.center.slice()) ||
                  new Float32Array(3),

                // Current interactions, which can be set directly. If setting directly, changes
                // will be additive to changes resulting from interactions.
                zoom: 0,
                panX: 0,
                panY: 0,
                panZ: 0,
                pitch: 0,
                yaw: 0,
                dTheta: 0,
                dPhi: 0,

                // Mouse coordinates of the interaction. Note that we fudge things ever so slightly
                // here and only store one mouse position per frame, so that we might actually
                // apply multiple accumulated events per frame about the *slightly* incorrect point.
                // In reality, I think this fudgeable.
                mouseX: 0,
                mouseY: 0
              };

              var t0 = null;
              var camera = {
                tick: function(mergeState) {
                  // If we've accumulated interactions, then set them in the params directly.
                  // Alternatively, we could recompute the full params on every single interaction
                  // event, but that would result in maybe twice as many full matrix/view updates
                  // as could ever be rendered in browsers like Safari that dispatch multiple
                  // events per requestAnimationFrame.
                  if (accumulator.zoom) params.zoom = accumulator.zoom;
                  if (accumulator.dTheta) params.dTheta = accumulator.dTheta;
                  if (accumulator.dPhi) params.dPhi = accumulator.dPhi;
                  if (accumulator.panX) params.panX = accumulator.panX;
                  if (accumulator.panY) params.panY = accumulator.panY;
                  if (accumulator.panZ) params.panZ = accumulator.panZ;
                  if (accumulator.yaw) params.yaw = accumulator.yaw;
                  if (accumulator.pitch) params.pitch = accumulator.pitch;
                  zeroChanges(accumulator);

                  if (mergeState) {
                    // Okay, so if we just merge changes, that totally breaks mouse interaction
                    // because provided dPhi will zero out dPhi resulting from mouse interaction.
                    // It would be better to accumulate mouse pixel changes separately and then
                    // add this in afterwards, but since we've accumulated dPhi etc right in the
                    // params, we need to cache this, then merge changes, then add these back in
                    // if necessary. Consider this a low-priority cleanup item.
                    var cachedDPhi = params.dPhi;
                    var cachedDTheta = params.dTheta;
                    var cachedZoom = params.zoom;
                    var cachedPanX = params.panX;
                    var cachedPanY = params.panY;
                    var cachedPanZ = params.panZ;
                    var cachedPitch = params.pitch;
                    var cachedYaw = params.yaw;

                    // This merges anything and everything in the params vector.
                    Object.assign(params, mergeState);

                    // Yup, so add them back in.
                    if (mergeState.dPhi !== undefined)
                      params.dPhi += cachedDPhi;
                    if (mergeState.dTheta !== undefined)
                      params.dTheta += cachedDTheta;
                    if (mergeState.zoom !== undefined)
                      params.zoom += cachedZoom;
                    if (mergeState.panX !== undefined)
                      params.panX += cachedPanX;
                    if (mergeState.panY !== undefined)
                      params.panY += cachedPanY;
                    if (mergeState.panZ !== undefined)
                      params.panZ += cachedPanZ;
                    if (mergeState.pitch !== undefined)
                      params.pitch += cachedPitch;
                    if (mergeState.yaw !== undefined) params.yaw += cachedYaw;
                  }

                  // Check for and apply passive changes to the params vector. That is, if you
                  // set camera.params.distance, this will automatically factor in those changes.
                  if (paramsVectorHasChanged()) {
                    applyStateChanges();
                  }

                  // Check if the view is changing above some threshold tolerance.
                  if (viewIsChanging()) {
                    // If so, update the view.
                    applyViewChanges(params);
                  } else {
                    // If not, fully zero it out.
                    zeroChanges(params);
                  }

                  // Not the highest resolution timer, but we only use it for inertia decay.
                  var t = Date.now();
                  if (t0 !== null) decay(t - t0);
                  t0 = t;

                  // Transfer this flag in a subtle way so that camera.params.dirty is writable.
                  camera.state.dirty = willBeDirty;
                  willBeDirty = false;

                  storeCurrentState();
                },
                taint: taint,
                resize: resize,
                params: params,
                rotate: rotate,
                pivot: pivot,
                pan: pan,
                zoom: zoom,
                computeMatrices: computeMatrices
              };

              camera.state = {};

              camera.state.projection = new Float32Array(16);
              camera.state.viewInv = new Float32Array(16);
              camera.state.view = new Float32Array(16);
              camera.state.width = null;
              camera.state.height = null;
              camera.state.eye = new Float32Array(3);

              // Vectors used but not exposed. Not they couldn't be, but you can get these
              // from the view matrix just fine.
              var tmp = new Float32Array(3);
              var viewUp = new Float32Array(3);
              var viewRight = new Float32Array(3);
              var viewForward = new Float32Array(3);
              var origin = new Float32Array(3);
              var dView = new Float32Array(16);

              // Track the previous params so that we can detect changes in these parameters
              var previousState = {
                up: new Float32Array(3),
                center: new Float32Array(3)
              };
              storeCurrentState();

              function storeCurrentState() {
                vec3Copy(previousState.up, params.up);
                vec3Copy(previousState.center, params.center);
                previousState.near = params.near;
                previousState.far = params.far;
                previousState.distance = params.distance;
                previousState.phi = params.phi;
                previousState.theta = params.theta;
                previousState.fovY = params.fovY;
              }

              function paramsVectorHasChanged() {
                if (!vec3Equals(params.up, previousState.up)) return true;
                if (!vec3Equals(params.center, previousState.center))
                  return true;
                if (params.near !== previousState.near) return true;
                if (params.far !== previousState.far) return true;
                if (params.phi !== previousState.phi) return true;
                if (params.theta !== previousState.theta) return true;
                if (params.distance !== previousState.distance) return true;
                if (params.fovY !== previousState.fovY) return true;
                return false;
              }

              var paramsChanges = {};
              function applyStateChanges() {
                paramsChanges.dPhi = params.phi - previousState.phi;
                paramsChanges.dTheta = params.theta - previousState.theta;
                paramsChanges.zoom =
                  params.distance / previousState.distance - 1;
                params.theta = previousState.theta;
                params.distance = previousState.distance;
                params.phi = previousState.phi;
                paramsChanges.yaw = 0;
                paramsChanges.pitch = 0;
                paramsChanges.panX = 0;
                paramsChanges.panY = 0;
                paramsChanges.panZ = 0;
                paramsChanges.mouseX = 0;
                paramsChanges.mouseY = 0;

                applyViewChanges(paramsChanges);
              }

              // The meat of it. Note that this function is intentionally very simple! There must
              // not be any logic or complexity to this function. The complexity is in moving this
              // view, not constructing it.
              function computeMatrices() {
                // Spherical coords
                camera.state.eye[0] = 0;
                camera.state.eye[1] = 0;
                camera.state.eye[2] = params.distance;
                vec3RotateX(
                  camera.state.eye,
                  camera.state.eye,
                  origin,
                  -params.phi
                );
                vec3RotateY(
                  camera.state.eye,
                  camera.state.eye,
                  origin,
                  params.theta
                );
                vec3Add(camera.state.eye, camera.state.eye, params.center);

                // View + projection
                lookAt(
                  camera.state.view,
                  camera.state.eye,
                  params.center,
                  params.up
                );
                perspective(
                  camera.state.projection,
                  params.fovY,
                  camera.params.aspectRatio,
                  params.near,
                  params.far
                );

                // For convenience, but also because we already use this, so let's just expose it
                mat4Invert(camera.state.viewInv, camera.state.view);
              }

              // Track this not on the params itself so that you can write camera.params.dirty
              function taint() {
                willBeDirty = true;
              }

              function resize(aspectRatio) {
                camera.params.aspectRatio = aspectRatio;
                computeMatrices();
                taint();
              }

              // All of these are mosty unitless, proportional, or at least relative to a window
              // size that doesn't change much so that fixed tolerances seem fine.
              function viewIsChanging() {
                if (Math.abs(params.zoom) > 1e-4) return true;
                if (Math.abs(params.panX) > 1e-4) return true;
                if (Math.abs(params.panY) > 1e-4) return true;
                if (Math.abs(params.panZ) > 1e-4) return true;
                if (Math.abs(params.dTheta) > 1e-4) return true;
                if (Math.abs(params.dPhi) > 1e-4) return true;
                if (Math.abs(params.yaw) > 1e-4) return true;
                if (Math.abs(params.pitch) > 1e-4) return true;
              }

              function zeroChanges(obj) {
                obj.zoom = 0;
                obj.dTheta = 0;
                obj.dPhi = 0;
                obj.panX = 0;
                obj.panY = 0;
                obj.panZ = 0;
                obj.yaw = 0;
                obj.pitch = 0;
              }

              // Exponential decay. Basically time-correct proportional decay.
              function decay(dt) {
                var panDecay = params.panDecayTime
                  ? Math.exp(-dt / params.panDecayTime / Math.LN2)
                  : 0;
                var zoomDecay = params.zoomDecayTime
                  ? Math.exp(-dt / params.zoomDecayTime / Math.LN2)
                  : 0;
                var rotateDecay = params.rotationDecayTime
                  ? Math.exp(-dt / params.rotationDecayTime / Math.LN2)
                  : 0;
                params.zoom *= zoomDecay;
                params.panX *= panDecay;
                params.panY *= panDecay;
                params.panZ *= panDecay;
                params.dTheta *= rotateDecay;
                params.dPhi *= rotateDecay;
                params.yaw *= rotateDecay;
                params.pitch *= rotateDecay;
              }

              // Accumulate changes per-frame since it turns out that Safari dispatches mouse events
              // more than once per RAF while chrome sticks to strictly once per RAF. How surprising!
              var accumulator = {};
              zeroChanges(accumulator);

              function pan(panX, panY) {
                var scaleFactor =
                  camera.params.distance *
                  Math.tan(camera.params.fovY * 0.5) *
                  2.0;
                accumulator.panX += panX * params.aspectRatio * scaleFactor;
                accumulator.panY += panY * scaleFactor;
                return camera;
              }

              function zoom(mouseX, mouseY, zoom) {
                accumulator.zoom += zoom;
                params.mouseX = mouseX;
                params.mouseY = mouseY;
                return camera;
              }

              function pivot(yaw, pitch) {
                var scaleFactor = camera.params.fovY;
                accumulator.yaw += yaw * scaleFactor * params.aspectRatio;
                accumulator.pitch += pitch * scaleFactor;
              }

              function rotate(dTheta, dPhi) {
                accumulator.dTheta += dTheta;
                accumulator.dPhi += dPhi;
              }

              function applyViewChanges(changes) {
                var zoomScaleFactor;

                // Initialize a veiw-space transformation for panning and zooming
                mat4Identity(dView);

                // Zoom about the mouse location in view-space
                if (params.zoomAboutCursor) {
                  zoomScaleFactor =
                    params.distance * Math.tan(params.fovY * 0.5);
                  tmp[0] =
                    changes.mouseX * params.aspectRatio * zoomScaleFactor;
                  tmp[1] = changes.mouseY * zoomScaleFactor;
                  tmp[2] = 0;
                  mat4Translate(dView, dView, tmp);
                }

                tmp[0] = 1 + changes.zoom;
                tmp[1] = 1 + changes.zoom;
                tmp[2] = 1;
                mat4Scale(dView, dView, tmp);

                if (params.zoomAboutCursor) {
                  zoomScaleFactor =
                    params.distance * Math.tan(params.fovY * 0.5);
                  tmp[0] =
                    -changes.mouseX * params.aspectRatio * zoomScaleFactor;
                  tmp[1] = -changes.mouseY * zoomScaleFactor;
                  tmp[2] = 0;
                  mat4Translate(dView, dView, tmp);
                }

                // Pan the view matrix
                dView[12] -= changes.panX * 0.5;
                dView[13] -= changes.panY * 0.5;

                // transform into view space, then transfor, then invert again
                transformMat4(params.center, params.center, camera.state.view);
                transformMat4(params.center, params.center, dView);
                transformMat4(
                  params.center,
                  params.center,
                  camera.state.viewInv
                );

                // If rotating about the center of the screen, then copy center -> rotationCenter
                if (params.rotateAboutCenter) {
                  vec3Copy(params.rotationCenter, params.center);
                }

                params.distance *= 1 + changes.zoom;

                var prevPhi = params.phi;
                params.phi += changes.dPhi;
                params.phi = Math.min(MAX_PHI, Math.max(MIN_PHI, params.phi));
                var dPhi = params.phi - prevPhi;

                var prevTheta = params.theta;
                params.theta += changes.dTheta;
                var dTheta = params.theta - prevTheta;

                vec3RotateY(
                  params.center,
                  params.center,
                  params.rotationCenter,
                  dTheta - params.theta
                );
                vec3RotateX(
                  params.center,
                  params.center,
                  params.rotationCenter,
                  -dPhi
                );
                vec3RotateY(
                  params.center,
                  params.center,
                  params.rotationCenter,
                  params.theta
                );

                if (changes.yaw !== 0 || changes.pitch !== 0) {
                  viewRight[0] = camera.state.view[0];
                  viewRight[1] = camera.state.view[4];
                  viewRight[2] = camera.state.view[8];
                  vec3Normalize(viewRight, viewRight);

                  viewUp[0] = camera.state.view[1];
                  viewUp[1] = camera.state.view[5];
                  viewUp[2] = camera.state.view[9];
                  vec3Normalize(viewUp, viewUp);

                  viewForward[0] = camera.state.view[2];
                  viewForward[1] = camera.state.view[6];
                  viewForward[2] = camera.state.view[10];
                  vec3Normalize(viewForward, viewForward);

                  var clippedPhi = Math.min(
                    MAX_PHI,
                    Math.max(MIN_PHI, params.phi + changes.pitch * 0.5)
                  );
                  var clippedPitch = clippedPhi - params.phi;

                  vec3ScaleAndAdd(
                    params.center,
                    params.center,
                    viewRight,
                    -Math.sin(changes.yaw * 0.5) * params.distance
                  );
                  vec3ScaleAndAdd(
                    params.center,
                    params.center,
                    viewUp,
                    -Math.sin(clippedPitch) * params.distance
                  );
                  vec3ScaleAndAdd(
                    params.center,
                    params.center,
                    viewForward,
                    (2 - Math.cos(changes.yaw * 0.5) - Math.cos(clippedPitch)) *
                      params.distance
                  );
                  params.phi = clippedPhi;
                  params.theta += changes.yaw * 0.5;
                }

                computeMatrices();
                taint();
              }

              resize(camera.params.aspectRatio);

              return camera;
            };
          },
          {
            "gl-mat4/identity": 2,
            "gl-mat4/invert": 3,
            "gl-mat4/lookAt": 4,
            "gl-mat4/perspective": 6,
            "gl-mat4/scale": 7,
            "gl-mat4/translate": 8,
            "gl-vec3/add": 9,
            "gl-vec3/copy": 10,
            "gl-vec3/equals": 12,
            "gl-vec3/normalize": 13,
            "gl-vec3/rotateX": 14,
            "gl-vec3/rotateY": 15,
            "gl-vec3/scaleAndAdd": 16,
            "gl-vec3/transformMat4": 17
          }
        ],
        19: [
          function(require, module, exports) {
            "use strict";

            var mat4create = require('gl-mat4/create');
            var mat4multiply = require('gl-mat4/multiply');
            var createCamera = require('./inertial-turntable-camera');

            module.exports = function createReglCamera(regl, opts) {
              var element = regl._gl.canvas;

              function getAspectRatio() {
                return element.clientWidth / element.clientHeight;
              }

              var camera = createCamera(
                Object.assign(
                  {},
                  {
                    aspectRatio: getAspectRatio()
                  },
                  opts || {}
                )
              );

              var mProjectionView = mat4create();
              var setCameraUniforms = regl({
                context: {
                  projection: () => camera.state.projection,
                  view: () => camera.state.view,
                  viewInv: () => camera.state.viewInv,
                  eye: () => camera.state.eye
                },
                uniforms: {
                  uProjectionView: ctx =>
                    mat4multiply(mProjectionView, ctx.projection, ctx.view)
                }
              });

              function invokeCamera(props, callback) {
                if (!callback) {
                  callback = props;
                  props = {};
                }

                camera.tick(props);

                if (props.afterTick) {
                  props.afterTick(camera.state, camera.params);
                  camera.computeMatrices();
                }

                setCameraUniforms(function() {
                  callback(camera.state, camera.params);
                });
              }

              invokeCamera.taint = camera.taint;
              invokeCamera.resize = camera.resize;
              invokeCamera.tick = camera.tick;
              invokeCamera.setUniforms = setCameraUniforms;
              invokeCamera.computeMatrices = camera.computeMatrices;

              invokeCamera.rotate = camera.rotate;
              invokeCamera.pan = camera.pan;
              invokeCamera.pivot = camera.pivot;
              invokeCamera.zoom = camera.zoom;

              Object.defineProperties(invokeCamera, {
                state: {
                  get: function() {
                    return camera.state;
                  },
                  set: function(value) {
                    camera.state = value;
                  }
                },
                params: {
                  get: function() {
                    return camera.params;
                  },
                  set: function(value) {
                    camera.params = value;
                  }
                },
                element: {
                  get: function() {
                    return element;
                  }
                }
              });

              window.addEventListener(
                'resize',
                function() {
                  camera.resize(getAspectRatio());
                },
                false
              );

              return invokeCamera;
            };
          },
          {
            "./inertial-turntable-camera": 18,
            "gl-mat4/create": 1,
            "gl-mat4/multiply": 5
          }
        ]
      },
      {},
      [19]
    )(19);
  });
  return module.exports;
}


function _createInteractions(self,require)
{
  var global = {};
  var exports = {};
  var module = {};
  var define;
  (function(f) {
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = f();
    } else if (typeof define === "function" && define.amd) {
      define([], f);
    } else {
      var g;
      if (typeof window !== "undefined") {
        g = window;
      } else if (typeof global !== "undefined") {
        g = global;
      } else if (typeof self !== "undefined") {
        g = self;
      } else {
        g = this;
      }
      g.createInteractions = f();
    }
  })(function() {
    var define, module, exports;
    return (function() {
      function r(e, n, t) {
        function o(i, f) {
          if (!n[i]) {
            if (!e[i]) {
              var c = "function" == typeof require && require;
              if (!f && c) return c(i, !0);
              if (u) return u(i, !0);
              var a = new Error("Cannot find module '" + i + "'");
              throw ((a.code = "MODULE_NOT_FOUND"), a);
            }
            var p = (n[i] = { exports: {} });
            e[i][0].call(
              p.exports,
              function(r) {
                var n = e[i][1][r];
                return o(n || r);
              },
              p,
              p.exports,
              r,
              e,
              n,
              t
            );
          }
          return n[i].exports;
        }
        for (
          var u = "function" == typeof require && require, i = 0;
          i < t.length;
          i++
        )
          o(t[i]);
        return o;
      }
      return r;
    })()(
      {
        1: [
          function(require, module, exports) {
            "use strict";

            var assign = require('es5-ext/object/assign'),
              normalizeOpts = require('es5-ext/object/normalize-options'),
              isCallable = require('es5-ext/object/is-callable'),
              contains = require('es5-ext/string/#/contains'),
              d;

            d = module.exports = function(dscr, value /*, options*/) {
              var c, e, w, options, desc;
              if (arguments.length < 2 || typeof dscr !== 'string') {
                options = value;
                value = dscr;
                dscr = null;
              } else {
                options = arguments[2];
              }
              if (dscr == null) {
                c = w = true;
                e = false;
              } else {
                c = contains.call(dscr, 'c');
                e = contains.call(dscr, 'e');
                w = contains.call(dscr, 'w');
              }

              desc = {
                value: value,
                configurable: c,
                enumerable: e,
                writable: w
              };
              return !options ? desc : assign(normalizeOpts(options), desc);
            };

            d.gs = function(dscr, get, set /*, options*/) {
              var c, e, options, desc;
              if (typeof dscr !== 'string') {
                options = set;
                set = get;
                get = dscr;
                dscr = null;
              } else {
                options = arguments[3];
              }
              if (get == null) {
                get = undefined;
              } else if (!isCallable(get)) {
                options = get;
                get = set = undefined;
              } else if (set == null) {
                set = undefined;
              } else if (!isCallable(set)) {
                options = set;
                set = undefined;
              }
              if (dscr == null) {
                c = true;
                e = false;
              } else {
                c = contains.call(dscr, 'c');
                e = contains.call(dscr, 'e');
              }

              desc = { get: get, set: set, configurable: c, enumerable: e };
              return !options ? desc : assign(normalizeOpts(options), desc);
            };
          },
          {
            "es5-ext/object/assign": 3,
            "es5-ext/object/is-callable": 6,
            "es5-ext/object/normalize-options": 11,
            "es5-ext/string/#/contains": 14
          }
        ],
        2: [
          function(require, module, exports) {
            "use strict";

            // eslint-disable-next-line no-empty-function
            module.exports = function() {};
          },
          {}
        ],
        3: [
          function(require, module, exports) {
            "use strict";

            module.exports = require("./is-implemented")()
              ? Object.assign
              : require("./shim");
          },
          { "./is-implemented": 4, "./shim": 5 }
        ],
        4: [
          function(require, module, exports) {
            "use strict";

            module.exports = function() {
              var assign = Object.assign,
                obj;
              if (typeof assign !== "function") return false;
              obj = { foo: "raz" };
              assign(obj, { bar: "dwa" }, { trzy: "trzy" });
              return obj.foo + obj.bar + obj.trzy === "razdwatrzy";
            };
          },
          {}
        ],
        5: [
          function(require, module, exports) {
            "use strict";

            var keys = require("../keys"),
              value = require("../valid-value"),
              max = Math.max;

            module.exports = function(dest, src /*, …srcn*/) {
              var error,
                i,
                length = max(arguments.length, 2),
                assign;
              dest = Object(value(dest));
              assign = function(key) {
                try {
                  dest[key] = src[key];
                } catch (e) {
                  if (!error) error = e;
                }
              };
              for (i = 1; i < length; ++i) {
                src = arguments[i];
                keys(src).forEach(assign);
              }
              if (error !== undefined) throw error;
              return dest;
            };
          },
          { "../keys": 8, "../valid-value": 13 }
        ],
        6: [
          function(require, module, exports) {
            // Deprecated

            "use strict";

            module.exports = function(obj) {
              return typeof obj === "function";
            };
          },
          {}
        ],
        7: [
          function(require, module, exports) {
            "use strict";

            var _undefined = require("../function/noop")(); // Support ES3 engines

            module.exports = function(val) {
              return val !== _undefined && val !== null;
            };
          },
          { "../function/noop": 2 }
        ],
        8: [
          function(require, module, exports) {
            "use strict";

            module.exports = require("./is-implemented")()
              ? Object.keys
              : require("./shim");
          },
          { "./is-implemented": 9, "./shim": 10 }
        ],
        9: [
          function(require, module, exports) {
            "use strict";

            module.exports = function() {
              try {
                Object.keys("primitive");
                return true;
              } catch (e) {
                return false;
              }
            };
          },
          {}
        ],
        10: [
          function(require, module, exports) {
            "use strict";

            var isValue = require("../is-value");

            var keys = Object.keys;

            module.exports = function(object) {
              return keys(isValue(object) ? Object(object) : object);
            };
          },
          { "../is-value": 7 }
        ],
        11: [
          function(require, module, exports) {
            "use strict";

            var isValue = require("./is-value");

            var forEach = Array.prototype.forEach,
              create = Object.create;

            var process = function(src, obj) {
              var key;
              for (key in src) obj[key] = src[key];
            };

            // eslint-disable-next-line no-unused-vars
            module.exports = function(opts1 /*, …options*/) {
              var result = create(null);
              forEach.call(arguments, function(options) {
                if (!isValue(options)) return;
                process(Object(options), result);
              });
              return result;
            };
          },
          { "./is-value": 7 }
        ],
        12: [
          function(require, module, exports) {
            "use strict";

            module.exports = function(fn) {
              if (typeof fn !== "function")
                throw new TypeError(fn + " is not a function");
              return fn;
            };
          },
          {}
        ],
        13: [
          function(require, module, exports) {
            "use strict";

            var isValue = require("./is-value");

            module.exports = function(value) {
              if (!isValue(value))
                throw new TypeError("Cannot use null or undefined");
              return value;
            };
          },
          { "./is-value": 7 }
        ],
        14: [
          function(require, module, exports) {
            "use strict";

            module.exports = require("./is-implemented")()
              ? String.prototype.contains
              : require("./shim");
          },
          { "./is-implemented": 15, "./shim": 16 }
        ],
        15: [
          function(require, module, exports) {
            "use strict";

            var str = "razdwatrzy";

            module.exports = function() {
              if (typeof str.contains !== "function") return false;
              return (
                str.contains("dwa") === true && str.contains("foo") === false
              );
            };
          },
          {}
        ],
        16: [
          function(require, module, exports) {
            "use strict";

            var indexOf = String.prototype.indexOf;

            module.exports = function(searchString /*, position*/) {
              return indexOf.call(this, searchString, arguments[1]) > -1;
            };
          },
          {}
        ],
        17: [
          function(require, module, exports) {
            "use strict";

            var d = require('d'),
              callable = require('es5-ext/object/valid-callable'),
              apply = Function.prototype.apply,
              call = Function.prototype.call,
              create = Object.create,
              defineProperty = Object.defineProperty,
              defineProperties = Object.defineProperties,
              hasOwnProperty = Object.prototype.hasOwnProperty,
              descriptor = {
                configurable: true,
                enumerable: false,
                writable: true
              },
              on,
              once,
              off,
              emit,
              methods,
              descriptors,
              base;

            on = function(type, listener) {
              var data;

              callable(listener);

              if (!hasOwnProperty.call(this, '__ee__')) {
                data = descriptor.value = create(null);
                defineProperty(this, '__ee__', descriptor);
                descriptor.value = null;
              } else {
                data = this.__ee__;
              }
              if (!data[type]) data[type] = listener;
              else if (typeof data[type] === 'object')
                data[type].push(listener);
              else data[type] = [data[type], listener];

              return this;
            };

            once = function(type, listener) {
              var once, self;

              callable(listener);
              self = this;
              on.call(
                this,
                type,
                (once = function() {
                  off.call(self, type, once);
                  apply.call(listener, this, arguments);
                })
              );

              once.__eeOnceListener__ = listener;
              return this;
            };

            off = function(type, listener) {
              var data, listeners, candidate, i;

              callable(listener);

              if (!hasOwnProperty.call(this, '__ee__')) return this;
              data = this.__ee__;
              if (!data[type]) return this;
              listeners = data[type];

              if (typeof listeners === 'object') {
                for (i = 0; (candidate = listeners[i]); ++i) {
                  if (
                    candidate === listener ||
                    candidate.__eeOnceListener__ === listener
                  ) {
                    if (listeners.length === 2)
                      data[type] = listeners[i ? 0 : 1];
                    else listeners.splice(i, 1);
                  }
                }
              } else {
                if (
                  listeners === listener ||
                  listeners.__eeOnceListener__ === listener
                ) {
                  delete data[type];
                }
              }

              return this;
            };

            emit = function(type) {
              var i, l, listener, listeners, args;

              if (!hasOwnProperty.call(this, '__ee__')) return;
              listeners = this.__ee__[type];
              if (!listeners) return;

              if (typeof listeners === 'object') {
                l = arguments.length;
                args = new Array(l - 1);
                for (i = 1; i < l; ++i) args[i - 1] = arguments[i];

                listeners = listeners.slice();
                for (i = 0; (listener = listeners[i]); ++i) {
                  apply.call(listener, this, args);
                }
              } else {
                switch (arguments.length) {
                  case 1:
                    call.call(listeners, this);
                    break;
                  case 2:
                    call.call(listeners, this, arguments[1]);
                    break;
                  case 3:
                    call.call(listeners, this, arguments[1], arguments[2]);
                    break;
                  default:
                    l = arguments.length;
                    args = new Array(l - 1);
                    for (i = 1; i < l; ++i) {
                      args[i - 1] = arguments[i];
                    }
                    apply.call(listeners, this, args);
                }
              }
            };

            methods = {
              on: on,
              once: once,
              off: off,
              emit: emit
            };

            descriptors = {
              on: d(on),
              once: d(once),
              off: d(off),
              emit: d(emit)
            };

            base = defineProperties({}, descriptors);

            module.exports = exports = function(o) {
              return o == null
                ? create(base)
                : defineProperties(Object(o), descriptors);
            };
            exports.methods = methods;
          },
          { d: 1, "es5-ext/object/valid-callable": 12 }
        ],
        18: [
          function(require, module, exports) {
            module.exports = transformMat4;

            /**
             * Transforms the vec3 with a mat4.
             * 4th vector component is implicitly '1'
             *
             * @param {vec3} out the receiving vector
             * @param {vec3} a the vector to transform
             * @param {mat4} m matrix to transform with
             * @returns {vec3} out
             */
            function transformMat4(out, a, m) {
              var x = a[0],
                y = a[1],
                z = a[2],
                w = m[3] * x + m[7] * y + m[11] * z + m[15];
              w = w || 1.0;
              out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
              out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
              out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
              return out;
            }
          },
          {}
        ],
        19: [
          function(require, module, exports) {
            "use strict";

            module.exports = mouseListen;

            var mouse = require('mouse-event');

            function mouseListen(element, callback) {
              if (!callback) {
                callback = element;
                element = window;
              }

              var buttonState = 0;
              var x = 0;
              var y = 0;
              var mods = {
                shift: false,
                alt: false,
                control: false,
                meta: false
              };
              var attached = false;

              function updateMods(ev) {
                var changed = false;
                if ('altKey' in ev) {
                  changed = changed || ev.altKey !== mods.alt;
                  mods.alt = !!ev.altKey;
                }
                if ('shiftKey' in ev) {
                  changed = changed || ev.shiftKey !== mods.shift;
                  mods.shift = !!ev.shiftKey;
                }
                if ('ctrlKey' in ev) {
                  changed = changed || ev.ctrlKey !== mods.control;
                  mods.control = !!ev.ctrlKey;
                }
                if ('metaKey' in ev) {
                  changed = changed || ev.metaKey !== mods.meta;
                  mods.meta = !!ev.metaKey;
                }
                return changed;
              }

              function handleEvent(nextButtons, ev) {
                var nextX = mouse.x(ev);
                var nextY = mouse.y(ev);
                if ('buttons' in ev) {
                  nextButtons = ev.buttons | 0;
                }
                if (
                  nextButtons !== buttonState ||
                  nextX !== x ||
                  nextY !== y ||
                  updateMods(ev)
                ) {
                  buttonState = nextButtons | 0;
                  x = nextX || 0;
                  y = nextY || 0;
                  callback && callback(buttonState, x, y, mods);
                }
              }

              function clearState(ev) {
                handleEvent(0, ev);
              }

              function handleBlur() {
                if (
                  buttonState ||
                  x ||
                  y ||
                  mods.shift ||
                  mods.alt ||
                  mods.meta ||
                  mods.control
                ) {
                  x = y = 0;
                  buttonState = 0;
                  mods.shift = mods.alt = mods.control = mods.meta = false;
                  callback && callback(0, 0, 0, mods);
                }
              }

              function handleMods(ev) {
                if (updateMods(ev)) {
                  callback && callback(buttonState, x, y, mods);
                }
              }

              function handleMouseMove(ev) {
                if (mouse.buttons(ev) === 0) {
                  handleEvent(0, ev);
                } else {
                  handleEvent(buttonState, ev);
                }
              }

              function handleMouseDown(ev) {
                handleEvent(buttonState | mouse.buttons(ev), ev);
              }

              function handleMouseUp(ev) {
                handleEvent(buttonState & ~mouse.buttons(ev), ev);
              }

              function attachListeners() {
                if (attached) {
                  return;
                }
                attached = true;

                element.addEventListener('mousemove', handleMouseMove);
                element.addEventListener('mousedown', handleMouseDown);
                element.addEventListener('mouseup', handleMouseUp);

                element.addEventListener('mouseleave', clearState);
                element.addEventListener('mouseenter', clearState);
                element.addEventListener('mouseout', clearState);
                element.addEventListener('mouseover', clearState);

                if (element !== window) {
                  window.addEventListener('blur', handleBlur);
                  window.addEventListener('keyup', handleMods);
                  window.addEventListener('keydown', handleMods);
                  window.addEventListener('keypress', handleMods);
                }
              }

              function detachListeners() {
                if (!attached) {
                  return;
                }
                attached = false;

                element.removeEventListener('mousemove', handleMouseMove);
                element.removeEventListener('mousedown', handleMouseDown);
                element.removeEventListener('mouseup', handleMouseUp);

                element.removeEventListener('mouseleave', clearState);
                element.removeEventListener('mouseenter', clearState);
                element.removeEventListener('mouseout', clearState);
                element.removeEventListener('mouseover', clearState);

                if (element !== window) {
                  window.removeEventListener('blur', handleBlur);
                  window.removeEventListener('keyup', handleMods);
                  window.removeEventListener('keydown', handleMods);
                  window.removeEventListener('keypress', handleMods);
                }
              }

              // Attach listeners
              attachListeners();

              var result = {
                element: element
              };

              Object.defineProperties(result, {
                enabled: {
                  get: function() {
                    return attached;
                  },
                  set: function(f) {
                    if (f) {
                      attachListeners();
                    } else {
                      detachListeners();
                    }
                  },
                  enumerable: true
                },
                buttons: {
                  get: function() {
                    return buttonState;
                  },
                  enumerable: true
                },
                x: {
                  get: function() {
                    return x;
                  },
                  enumerable: true
                },
                y: {
                  get: function() {
                    return y;
                  },
                  enumerable: true
                },
                mods: {
                  get: function() {
                    return mods;
                  },
                  enumerable: true
                }
              });

              return result;
            }
          },
          { "mouse-event": 21 }
        ],
        20: [
          function(require, module, exports) {
            var rootPosition = { left: 0, top: 0 };

            module.exports = mouseEventOffset;
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
          },
          {}
        ],
        21: [
          function(require, module, exports) {
            "use strict";

            function mouseButtons(ev) {
              if (typeof ev === 'object') {
                if ('buttons' in ev) {
                  return ev.buttons;
                } else if ('which' in ev) {
                  var b = ev.which;
                  if (b === 2) {
                    return 4;
                  } else if (b === 3) {
                    return 2;
                  } else if (b > 0) {
                    return 1 << (b - 1);
                  }
                } else if ('button' in ev) {
                  var b = ev.button;
                  if (b === 1) {
                    return 4;
                  } else if (b === 2) {
                    return 2;
                  } else if (b >= 0) {
                    return 1 << b;
                  }
                }
              }
              return 0;
            }
            exports.buttons = mouseButtons;

            function mouseElement(ev) {
              return ev.target || ev.srcElement || window;
            }
            exports.element = mouseElement;

            function mouseRelativeX(ev) {
              if (typeof ev === 'object') {
                if ('offsetX' in ev) {
                  return ev.offsetX;
                }
                var target = mouseElement(ev);
                var bounds = target.getBoundingClientRect();
                return ev.clientX - bounds.left;
              }
              return 0;
            }
            exports.x = mouseRelativeX;

            function mouseRelativeY(ev) {
              if (typeof ev === 'object') {
                if ('offsetY' in ev) {
                  return ev.offsetY;
                }
                var target = mouseElement(ev);
                var bounds = target.getBoundingClientRect();
                return ev.clientY - bounds.top;
              }
              return 0;
            }
            exports.y = mouseRelativeY;
          },
          {}
        ],
        22: [
          function(require, module, exports) {
            "use strict";

            const vec3TransformMat4 = require('gl-vec3/transformMat4');
            const interactionEvents = require('./normalized-interaction-events');

            module.exports = attachCameraControls;

            const RADIANS_PER_HALF_SCREEN_WIDTH = Math.PI * 0.75;

            function attachCameraControls(camera, opts) {
              opts = opts || {};
              var element = camera.element;
              var zoomSpeed =
                (opts.zoomSpeed === undefined ? 1 : opts.zoomSpeed) * 0.5;
              var zoom = opts.zoom === undefined ? true : opts.zoom;
              var touchZoom =
                opts.touchZoom !== undefined
                  ? !!opts.touchZoom
                  : opts.zoom !== undefined
                  ? !!opts.zoom
                  : true;

              var onStart = null;
              var onEnd = null;
              var onMove = null;

              var singletonEventData = {
                defaultPrevented: false
              };

              function localPreventDefault() {
                singletonEventData.defaultPrevented = true;
              }

              function resetLocalPreventDefault() {
                singletonEventData.defaultPrevented = false;
              }

              function providePreventDefault(ev) {
                ev.defaultPrevented = singletonEventData.defaultPrevented;
                ev.preventDefault = function() {
                  ev.defaultPrevented = true;
                  localPreventDefault();
                };
                return ev;
              }
              var v = [0, 0, 0];
              var xy = [0, 0];
              function transformXY(ev) {
                v[0] = ev.x;
                v[1] = ev.y;
                v[2] = 0;
                if (opts.invViewportShift) {
                  vec3TransformMat4(v, v, opts.invViewportShift);
                }
                xy[0] = v[0];
                xy[1] = v[1];
                return xy;
              }

              interactionEvents(element)
                .on('wheel', function(ev) {
                  if (!zoom) return;
                  ev.originalEvent.preventDefault();

                  camera.zoom(ev.x0, ev.y0, Math.exp(-ev.dy * zoomSpeed) - 1.0);
                })
                .on('mousedown', function(ev) {
                  resetLocalPreventDefault();

                  ev = providePreventDefault(ev);
                  onStart && onStart(ev);

                  ev.originalEvent.preventDefault();
                })
                .on('mousemove', function(ev) {
                  ev = providePreventDefault(ev);
                  onMove && onMove(ev);

                  if (ev.defaultPrevented) return;

                  if (!ev.active || ev.buttons !== 1) return;

                  if (ev.mods.alt) {
                    if (!zoom) return;
                    camera.zoom(
                      ev.x0,
                      ev.y0,
                      Math.exp(ev.dy * zoomSpeed) - 1.0
                    );
                    ev.originalEvent.preventDefault();
                  } else if (ev.mods.shift) {
                    camera.pan(ev.dx, ev.dy);
                    ev.originalEvent.preventDefault();
                  } else if (ev.mods.meta) {
                    camera.pivot(ev.dx, ev.dy);
                    ev.originalEvent.preventDefault();
                  } else {
                    camera.rotate(
                      -ev.dx * RADIANS_PER_HALF_SCREEN_WIDTH,
                      -ev.dy * RADIANS_PER_HALF_SCREEN_WIDTH
                    );
                    ev.originalEvent.preventDefault();
                  }
                })
                .on('mouseup', function(ev) {
                  resetLocalPreventDefault();
                  ev = providePreventDefault(ev);
                  onEnd && onEnd(ev);
                })
                .on('touchstart', function(ev) {
                  ev.originalEvent.preventDefault();

                  ev = providePreventDefault(ev);
                  onStart && onStart(ev);
                })
                .on('touchmove', function(ev) {
                  ev = providePreventDefault(ev);
                  onMove && onMove(ev);

                  if (ev.defaultPrevented) return;

                  if (!ev.active) return;
                  camera.rotate(
                    -ev.dx * RADIANS_PER_HALF_SCREEN_WIDTH,
                    -ev.dy * RADIANS_PER_HALF_SCREEN_WIDTH
                  );
                  ev.originalEvent.preventDefault();
                })
                .on('touchend', function(ev) {
                  resetLocalPreventDefault();
                  ev = providePreventDefault(ev);
                  onEnd && onEnd(ev);
                })
                .on('pinchmove', function(ev) {
                  if (!ev.active) return;
                  transformXY(ev);
                  if (touchZoom) camera.zoom(xy[0], xy[1], 1 - ev.zoomx);
                  camera.pan(ev.dx, ev.dy);

                  ev.originalEvent.preventDefault();
                })
                .on('pinchstart', function(ev) {
                  ev.originalEvent.preventDefault();
                });

              onStart = opts.onStart;
              onMove = opts.onMove;
              onEnd = opts.onEnd;

              return {
                setInteractions: function(interactions) {
                  onStart = interactions.onStart;
                  onEnd = interactions.onEnd;
                  onMove = interactions.onMove;
                }
              };
            }
          },
          { "./normalized-interaction-events": 23, "gl-vec3/transformMat4": 18 }
        ],
        23: [
          function(require, module, exports) {
            "use strict";

            module.exports = normalizedInteractionEvents;

            var mouseChange = require('mouse-change');
            var eventOffset = require('mouse-event-offset');
            var eventEmitter = require('event-emitter');

            function normalizedInteractionEvents(element) {
              element = element || window;

              var emitter = eventEmitter();
              var previousPosition = [null, null];
              var previousFingerPosition = [null, null];
              var currentPosition = [null, null];
              var fingers = [null, null];
              var activeTouchCount = 0;
              var ev = {};

              var width, height;

              var getSize =
                element === window
                  ? function() {
                      width = window.innerWidth;
                      height = window.innerHeight;
                    }
                  : function() {
                      width = element.clientWidth;
                      height = element.clientHeight;
                    };

              var buttons = 0;
              var mouseX;
              var mouseY;
              var mods = {};
              var changeListener = mouseChange(element, function(
                pbuttons,
                px,
                py,
                pmods
              ) {
                mouseX = px;
                mouseY = py;
                buttons = pbuttons;
                mods = pmods;
              });

              function onWheel(event) {
                eventOffset(event, element, currentPosition);
                getSize();

                ev.buttons = buttons;
                ev.mods = mods;
                ev.x0 = ev.x = ev.x1 = (2 * currentPosition[0]) / width - 1;
                ev.y0 = ev.y = ev.y1 = 1 - (2 * currentPosition[1]) / height;
                ev.x2 = null;
                ev.y2 = null;
                ev.dx = (2 * event.deltaX) / width;
                ev.dy = (-2 * event.deltaY) / height;
                ev.dz = (2 * event.deltaZ) / width;
                ev.active = 1;
                ev.zoomx = 1;
                ev.zoomy = 1;
                ev.theta = 0;
                ev.dtheta = 0;
                ev.originalEvent = event;

                emitter.emit('wheel', ev);

                previousPosition[0] = currentPosition[0];
                previousPosition[1] = currentPosition[1];
              }

              var x0 = null;
              var y0 = null;
              var active = 0;

              function onMouseUp(event) {
                eventOffset(event, element, currentPosition);
                active = 0;
                getSize();

                ev.buttons = buttons;
                ev.mods = mods;
                ev.x = ev.x1 = (2 * currentPosition[0]) / width - 1;
                ev.y = ev.y1 = 1 - (2 * currentPosition[1]) / height;
                ev.x2 = null;
                ev.y2 = null;
                ev.active = active;
                ev.x0 = (2 * x0) / width - 1;
                ev.y0 = 1 - (2 * y0) / height;
                ev.dx = 0;
                ev.dy = 0;
                ev.dz = 0;
                ev.zoomx = 1;
                ev.zoomy = 1;
                ev.theta = 0;
                ev.dtheta = 0;
                ev.originalEvent = event;

                emitter.emit('mouseup', ev);

                x0 = y0 = null;

                previousPosition[0] = currentPosition[0];
                previousPosition[1] = currentPosition[1];
              }

              function onMouseDown(event) {
                eventOffset(event, element, currentPosition);
                active = 1;
                getSize();

                x0 = mouseX;
                y0 = mouseY;

                ev.buttons = buttons;
                ev.mods = mods;
                ev.x = ev.x0 = ev.x1 = (2 * currentPosition[0]) / width - 1;
                ev.y = ev.y0 = ev.y1 = 1 - (2 * currentPosition[1]) / height;
                ev.x2 = null;
                ev.y2 = null;
                ev.active = active;
                ev.dx = 0;
                ev.dy = 0;
                ev.dz = 0;
                ev.zoomx = 1;
                ev.zoomy = 1;
                ev.theta = 0;
                ev.dtheta = 0;
                ev.originalEvent = event;

                emitter.emit('mousedown', ev);

                previousPosition[0] = currentPosition[0];
                previousPosition[1] = currentPosition[1];
              }

              function onMouseMove(event) {
                eventOffset(event, element, currentPosition);
                getSize();

                ev.buttons = buttons;
                ev.mods = mods;
                ev.x0 = (2 * x0) / width - 1;
                ev.y0 = 1 - (2 * y0) / height;
                ev.x = ev.x1 = (2 * currentPosition[0]) / width - 1;
                ev.y = ev.y1 = 1 - (2 * currentPosition[1]) / height;
                ev.x2 = null;
                ev.y2 = null;
                ev.dx =
                  (2 * (currentPosition[0] - previousPosition[0])) / width;
                ev.dy =
                  (-2 * (currentPosition[1] - previousPosition[1])) / height;
                ev.active = active;
                ev.dz = 0;
                ev.zoomx = 1;
                ev.zoomy = 1;
                ev.theta = 0;
                ev.dtheta = 0;
                ev.originalEvent = event;

                emitter.emit('mousemove', ev);

                previousPosition[0] = currentPosition[0];
                previousPosition[1] = currentPosition[1];
              }

              function indexOfTouch(touch) {
                var id = touch.identifier;
                for (var i = 0; i < fingers.length; i++) {
                  if (
                    fingers[i] &&
                    fingers[i].touch &&
                    fingers[i].touch.identifier === id
                  ) {
                    return i;
                  }
                }
                return -1;
              }

              function onTouchStart(event) {
                previousFingerPosition[0] = null;
                previousFingerPosition[1] = null;

                for (var i = 0; i < event.changedTouches.length; i++) {
                  var newTouch = event.changedTouches[i];
                  var id = newTouch.identifier;
                  var idx = indexOfTouch(id);

                  if (idx === -1 && activeTouchCount < 2) {
                    var first = activeTouchCount === 0;

                    // newest and previous finger (previous may be undefined)
                    var newIndex = fingers[0] ? 1 : 0;
                    var oldIndex = fingers[0] ? 0 : 1;
                    var newFinger = {
                      position: [0, 0],
                      touch: null
                    };

                    // add to stack
                    fingers[newIndex] = newFinger;
                    activeTouchCount++;

                    // update touch event & position
                    newFinger.touch = newTouch;
                    eventOffset(newTouch, element, newFinger.position);

                    var oldTouch = fingers[oldIndex]
                      ? fingers[oldIndex].touch
                      : undefined;
                  }
                }

                var xavg = 0;
                var yavg = 0;
                var fingerCount = 0;
                for (var i = 0; i < fingers.length; i++) {
                  if (!fingers[i]) continue;
                  xavg += fingers[i].position[0];
                  yavg += fingers[i].position[1];
                  fingerCount++;
                }
                xavg /= fingerCount;
                yavg /= fingerCount;

                if (activeTouchCount > 0) {
                  ev.theta = 0;

                  if (fingerCount > 1) {
                    var dx = fingers[1].position[0] - fingers[0].position[0];
                    var dy =
                      ((fingers[0].position[1] - fingers[1].position[1]) *
                        width) /
                      height;
                    ev.theta = Math.atan2(dy, dx);
                  }

                  getSize();
                  ev.buttons = 0;
                  ev.mods = {};
                  ev.active = activeTouchCount;
                  x0 = xavg;
                  y0 = yavg;
                  ev.x0 = (2 * x0) / width - 1;
                  ev.y0 = 1 - (2 * y0) / height;
                  ev.x = (2 * xavg) / width - 1;
                  ev.y = 1 - (2 * yavg) / height;
                  ev.x1 = (2 * fingers[0].position[0]) / width - 1;
                  ev.y1 = 1 - (2 * fingers[0].position[1]) / height;
                  if (activeTouchCount > 1) {
                    ev.x2 = (2 * fingers[1].position[0]) / width - 1;
                    ev.y2 = 1 - (2 * fingers[1].position[1]) / height;
                  }
                  ev.active = activeTouchCount;
                  ev.dx = 0;
                  ev.dy = 0;
                  ev.dz = 0;
                  ev.zoomx = 1;
                  ev.zoomy = 1;
                  ev.dtheta = 0;
                  ev.originalEvent = event;
                  emitter.emit(
                    activeTouchCount === 1 ? 'touchstart' : 'pinchstart',
                    ev
                  );
                }
              }

              function onTouchMove(event) {
                var idx;
                var changed = false;
                for (var i = 0; i < event.changedTouches.length; i++) {
                  var movedTouch = event.changedTouches[i];
                  idx = indexOfTouch(movedTouch);

                  if (idx !== -1) {
                    changed = true;
                    fingers[idx].touch = movedTouch; // avoid caching touches
                    eventOffset(movedTouch, element, fingers[idx].position);
                  }
                }

                if (changed) {
                  if (activeTouchCount === 1) {
                    for (idx = 0; idx < fingers.length; idx++) {
                      if (fingers[idx]) break;
                    }

                    if (fingers[idx] && previousFingerPosition[idx]) {
                      var x = fingers[idx].position[0];
                      var y = fingers[idx].position[1];

                      var dx = x - previousFingerPosition[idx][0];
                      var dy = y - previousFingerPosition[idx][1];

                      ev.buttons = 0;
                      ev.mods = {};
                      ev.active = activeTouchCount;
                      ev.x = ev.x1 = (2 * x) / width - 1;
                      ev.y = ev.y1 = 1 - (2 * y) / height;
                      ev.x2 = null;
                      ev.y2 = null;
                      ev.x0 = (2 * x0) / width - 1;
                      ev.y0 = 1 - (2 * y0) / height;
                      ev.dx = (2 * dx) / width;
                      ev.dy = (-2 * dy) / height;
                      ev.dz = 0;
                      ev.zoomx = 1;
                      ev.zoomy = 1;
                      ev.theta = 0;
                      ev.dtheta = 0;
                      ev.originalEvent = event;

                      emitter.emit('touchmove', ev);
                    }
                  } else if (activeTouchCount === 2) {
                    if (
                      previousFingerPosition[0] &&
                      previousFingerPosition[1]
                    ) {
                      // Previous two-finger vector:
                      var pos0A = previousFingerPosition[0];
                      var pos0B = previousFingerPosition[1];
                      var dx0 = pos0B[0] - pos0A[0];
                      var dy0 = ((pos0B[1] - pos0A[1]) * width) / height;

                      // Current two-finger vector:
                      var pos1A = fingers[0].position;
                      var pos1B = fingers[1].position;
                      var dx1 = pos1B[0] - pos1A[0];
                      var dy1 = ((pos1A[1] - pos1B[1]) * width) / height;

                      // r, theta for the previous two-finger touch:
                      var r0 = Math.sqrt(dx0 * dx0 + dy0 * dy0) * 0.5;
                      var theta0 = Math.atan2(dy0, dx0);

                      // r, theta for the current two-finger touch:
                      var r1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) * 0.5;
                      var theta1 = Math.atan2(dy1, dx1);

                      var xavg = (pos0B[0] + pos0A[0]) * 0.5;
                      var yavg = (pos0B[1] + pos0A[1]) * 0.5;
                      var dx =
                        0.5 * (pos1B[0] + pos1A[0] - pos0A[0] - pos0B[0]);
                      var dy =
                        0.5 * (pos1B[1] + pos1A[1] - pos0A[1] - pos0B[1]);

                      var dr = r1 / r0;
                      var dtheta = theta1 - theta0;

                      ev.buttons = 0;
                      ev.mods = mods;
                      ev.active = activeTouchCount;
                      ev.x = (2 * xavg) / width - 1;
                      ev.y = 1 - (2 * yavg) / height;
                      ev.x0 = (2 * x0) / width - 1;
                      ev.y0 = 1 - (2 * y0) / height;
                      ev.x1 = (2 * pos1A[0]) / width - 1;
                      ev.y1 = 1 - (2 * pos1A[1]) / height;
                      ev.x2 = (2 * pos1B[0]) / width - 1;
                      ev.y2 = 1 - (2 * pos1B[1]) / height;
                      ev.dx = (2 * dx) / width;
                      ev.dy = (-2 * dy) / height;
                      ev.dz = 0;
                      ev.zoomx = dr;
                      ev.zoomy = dr;
                      ev.theta = theta1;
                      ev.dtheta = dtheta;
                      ev.originalEvent = event;

                      emitter.emit('pinchmove', ev);
                    }
                  }
                }

                if (fingers[0]) {
                  previousFingerPosition[0] = fingers[0].position.slice();
                }

                if (fingers[1]) {
                  previousFingerPosition[1] = fingers[1].position.slice();
                }
              }

              function onTouchRemoved(event) {
                var lastFinger;
                for (var i = 0; i < event.changedTouches.length; i++) {
                  var removed = event.changedTouches[i];
                  var idx = indexOfTouch(removed);

                  if (idx !== -1) {
                    lastFinger = fingers[idx];
                    fingers[idx] = null;
                    activeTouchCount--;
                    var otherIdx = idx === 0 ? 1 : 0;
                    var otherTouch = fingers[otherIdx]
                      ? fingers[otherIdx].touch
                      : undefined;
                  }
                }

                var xavg = 0;
                var yavg = 0;
                if (activeTouchCount === 0) {
                  if (lastFinger) {
                    xavg = lastFinger.position[0];
                    yavg = lastFinger.position[1];
                  }
                } else {
                  var fingerCount = 0;
                  for (var i = 0; i < fingers.length; i++) {
                    if (!fingers[i]) continue;
                    xavg += fingers[i].position[0];
                    yavg += fingers[i].position[1];
                    fingerCount++;
                  }
                  xavg /= fingerCount;
                  yavg /= fingerCount;
                }

                if (activeTouchCount < 2) {
                  ev.buttons = 0;
                  ev.mods = mods;
                  ev.active = activeTouchCount;
                  ev.x = (2 * xavg) / width - 1;
                  ev.y = 1 - (2 * yavg) / height;
                  ev.x0 = (2 * x0) / width - 1;
                  ev.y0 = 1 - (2 * y0) / height;
                  ev.dx = 0;
                  ev.dy = 0;
                  ev.dz = 0;
                  ev.zoomx = 1;
                  ev.zoomy = 1;
                  ev.theta = 0;
                  ev.dtheta = 0;
                  ev.originalEvent = event;
                  emitter.emit(
                    activeTouchCount === 0 ? 'touchend' : 'pinchend',
                    ev
                  );
                }
                if (activeTouchCount === 0) {
                  x0 = y0 = null;
                }
              }

              var enabled = false;
              function enable() {
                if (enabled) return;
                enabled = true;
                changeListener.enabled = true;
                element.addEventListener('wheel', onWheel, false);
                element.addEventListener('mousedown', onMouseDown, false);
                window.addEventListener('mousemove', onMouseMove, false);
                window.addEventListener('mouseup', onMouseUp, false);

                element.addEventListener('touchstart', onTouchStart, false);
                window.addEventListener('touchmove', onTouchMove, false);
                window.addEventListener('touchend', onTouchRemoved, false);
                window.addEventListener('touchcancel', onTouchRemoved, false);
              }

              function disable() {
                if (!enabled) return;
                enabled = false;
                changeListener.enabled = false;
                element.removeEventListener('wheel', onWheel, false);
                element.removeEventListener('mousedown', onMouseDown, false);
                window.removeEventListener('mousemove', onMouseMove, false);
                window.removeEventListener('mouseup', onMouseUp, false);

                element.removeEventListener('touchstart', onTouchStart, false);
                window.removeEventListener('touchmove', onTouchMove, false);
                window.removeEventListener('touchend', onTouchRemoved, false);
                window.removeEventListener(
                  'touchcancel',
                  onTouchRemoved,
                  false
                );
              }

              enable();

              emitter.enable = enable;
              emitter.disable = disable;

              return emitter;
            }
          },
          { "event-emitter": 17, "mouse-change": 19, "mouse-event-offset": 20 }
        ]
      },
      {},
      [22]
    )(22);
  });
  return module.exports;
}


export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("createReglCamera")).define("createReglCamera", ["self","require"], _createReglCamera);
  main.variable(observer("createInteractions")).define("createInteractions", ["self","require"], _createInteractions);
  return main;
}
