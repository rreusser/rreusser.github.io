var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// ../../../../../private/tmp/blapack/lib/blas/base/dtrsm/lib/base.js
var require_base = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dtrsm/lib/base.js"(exports, module) {
    "use strict";
    function dtrsm(side, uplo, transa, diag, M, N, alpha, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB) {
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
      if (M === 0 || N === 0) {
        return B;
      }
      sa1 = strideA1;
      sa2 = strideA2;
      sb1 = strideB1;
      sb2 = strideB2;
      if (alpha === 0) {
        for (j = 0; j < N; j++) {
          ib = offsetB + j * sb2;
          for (i = 0; i < M; i++) {
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
                for (i = 0; i < M; i++) {
                  B[ib] *= alpha;
                  ib += sb1;
                }
              }
              for (k = M - 1; k >= 0; k--) {
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
                for (i = 0; i < M; i++) {
                  B[ib] *= alpha;
                  ib += sb1;
                }
              }
              for (k = 0; k < M; k++) {
                ib = offsetB + k * sb1 + j * sb2;
                if (B[ib] !== 0) {
                  if (nounit) {
                    B[ib] /= A[offsetA + k * sa1 + k * sa2];
                  }
                  for (i = k + 1; i < M; i++) {
                    B[offsetB + i * sb1 + j * sb2] -= B[ib] * A[offsetA + i * sa1 + k * sa2];
                  }
                }
              }
            }
          }
        } else if (upper) {
          for (j = 0; j < N; j++) {
            for (i = 0; i < M; i++) {
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
            for (i = M - 1; i >= 0; i--) {
              temp = alpha * B[offsetB + i * sb1 + j * sb2];
              for (k = i + 1; k < M; k++) {
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
              for (i = 0; i < M; i++) {
                B[ib] *= alpha;
                ib += sb1;
              }
            }
            for (k = 0; k < j; k++) {
              if (A[offsetA + k * sa1 + j * sa2] !== 0) {
                for (i = 0; i < M; i++) {
                  B[offsetB + i * sb1 + j * sb2] -= A[offsetA + k * sa1 + j * sa2] * B[offsetB + i * sb1 + k * sb2];
                }
              }
            }
            if (nounit) {
              temp = 1 / A[offsetA + j * sa1 + j * sa2];
              ib = offsetB + j * sb2;
              for (i = 0; i < M; i++) {
                B[ib] *= temp;
                ib += sb1;
              }
            }
          }
        } else {
          for (j = N - 1; j >= 0; j--) {
            if (alpha !== 1) {
              ib = offsetB + j * sb2;
              for (i = 0; i < M; i++) {
                B[ib] *= alpha;
                ib += sb1;
              }
            }
            for (k = j + 1; k < N; k++) {
              if (A[offsetA + k * sa1 + j * sa2] !== 0) {
                for (i = 0; i < M; i++) {
                  B[offsetB + i * sb1 + j * sb2] -= A[offsetA + k * sa1 + j * sa2] * B[offsetB + i * sb1 + k * sb2];
                }
              }
            }
            if (nounit) {
              temp = 1 / A[offsetA + j * sa1 + j * sa2];
              ib = offsetB + j * sb2;
              for (i = 0; i < M; i++) {
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
            for (i = 0; i < M; i++) {
              B[ib] *= temp;
              ib += sb1;
            }
          }
          for (j = 0; j < k; j++) {
            if (A[offsetA + j * sa1 + k * sa2] !== 0) {
              temp = A[offsetA + j * sa1 + k * sa2];
              for (i = 0; i < M; i++) {
                B[offsetB + i * sb1 + j * sb2] -= temp * B[offsetB + i * sb1 + k * sb2];
              }
            }
          }
          if (alpha !== 1) {
            ib = offsetB + k * sb2;
            for (i = 0; i < M; i++) {
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
            for (i = 0; i < M; i++) {
              B[ib] *= temp;
              ib += sb1;
            }
          }
          for (j = k + 1; j < N; j++) {
            if (A[offsetA + j * sa1 + k * sa2] !== 0) {
              temp = A[offsetA + j * sa1 + k * sa2];
              for (i = 0; i < M; i++) {
                B[offsetB + i * sb1 + j * sb2] -= temp * B[offsetB + i * sb1 + k * sb2];
              }
            }
          }
          if (alpha !== 1) {
            ib = offsetB + k * sb2;
            for (i = 0; i < M; i++) {
              B[ib] *= alpha;
              ib += sb1;
            }
          }
        }
      }
      return B;
    }
    module.exports = dtrsm;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dsyrk/lib/base.js
var require_base2 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dsyrk/lib/base.js"(exports, module) {
    "use strict";
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
    module.exports = dsyrk;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dpotrf2/lib/base.js
var require_base3 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dpotrf2/lib/base.js"(exports, module) {
    "use strict";
    var dtrsm = require_base();
    var dsyrk = require_base2();
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
        dtrsm("left", "upper", "transpose", "non-unit", n1, n2, 1, A, sa1, sa2, offsetA, A, sa1, sa2, offsetA + n1 * sa2);
        dsyrk(uplo, "transpose", n2, n1, -1, A, sa1, sa2, offsetA + n1 * sa2, 1, A, sa1, sa2, offsetA + n1 * sa1 + n1 * sa2);
        iinfo = dpotrf2(uplo, n2, A, sa1, sa2, offsetA + n1 * sa1 + n1 * sa2);
        if (iinfo !== 0) {
          return iinfo + n1;
        }
      } else {
        dtrsm("right", "lower", "transpose", "non-unit", n2, n1, 1, A, sa1, sa2, offsetA, A, sa1, sa2, offsetA + n1 * sa1);
        dsyrk(uplo, "no-transpose", n2, n1, -1, A, sa1, sa2, offsetA + n1 * sa1, 1, A, sa1, sa2, offsetA + n1 * sa1 + n1 * sa2);
        iinfo = dpotrf2(uplo, n2, A, sa1, sa2, offsetA + n1 * sa1 + n1 * sa2);
        if (iinfo !== 0) {
          return iinfo + n1;
        }
      }
      return 0;
    }
    module.exports = dpotrf2;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dgemm/lib/base.js
var require_base4 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dgemm/lib/base.js"(exports, module) {
    "use strict";
    function dgemm(transa, transb, M, N, K, alpha, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB, beta, C, strideC1, strideC2, offsetC) {
      var nota;
      var notb;
      var temp;
      var sa1;
      var sa2;
      var sb1;
      var sb2;
      var sc1;
      var sc2;
      var ia;
      var ib;
      var ic;
      var i;
      var j;
      var l;
      nota = transa === "no-transpose";
      notb = transb === "no-transpose";
      if (M === 0 || N === 0 || (alpha === 0 || K === 0) && beta === 1) {
        return C;
      }
      sa1 = strideA1;
      sa2 = strideA2;
      sb1 = strideB1;
      sb2 = strideB2;
      sc1 = strideC1;
      sc2 = strideC2;
      if (alpha === 0) {
        if (beta === 0) {
          for (j = 0; j < N; j++) {
            ic = offsetC + j * sc2;
            for (i = 0; i < M; i++) {
              C[ic] = 0;
              ic += sc1;
            }
          }
        } else {
          for (j = 0; j < N; j++) {
            ic = offsetC + j * sc2;
            for (i = 0; i < M; i++) {
              C[ic] *= beta;
              ic += sc1;
            }
          }
        }
        return C;
      }
      if (notb) {
        if (nota) {
          for (j = 0; j < N; j++) {
            if (beta === 0) {
              ic = offsetC + j * sc2;
              for (i = 0; i < M; i++) {
                C[ic] = 0;
                ic += sc1;
              }
            } else if (beta !== 1) {
              ic = offsetC + j * sc2;
              for (i = 0; i < M; i++) {
                C[ic] *= beta;
                ic += sc1;
              }
            }
            for (l = 0; l < K; l++) {
              temp = alpha * B[offsetB + l * sb1 + j * sb2];
              ia = offsetA + l * sa2;
              ic = offsetC + j * sc2;
              for (i = 0; i < M; i++) {
                C[ic] += temp * A[ia];
                ia += sa1;
                ic += sc1;
              }
            }
          }
        } else {
          for (j = 0; j < N; j++) {
            for (i = 0; i < M; i++) {
              temp = 0;
              ia = offsetA + i * sa2;
              ib = offsetB + j * sb2;
              for (l = 0; l < K; l++) {
                temp += A[ia] * B[ib];
                ia += sa1;
                ib += sb1;
              }
              ic = offsetC + i * sc1 + j * sc2;
              if (beta === 0) {
                C[ic] = alpha * temp;
              } else {
                C[ic] = alpha * temp + beta * C[ic];
              }
            }
          }
        }
      } else if (nota) {
        for (j = 0; j < N; j++) {
          if (beta === 0) {
            ic = offsetC + j * sc2;
            for (i = 0; i < M; i++) {
              C[ic] = 0;
              ic += sc1;
            }
          } else if (beta !== 1) {
            ic = offsetC + j * sc2;
            for (i = 0; i < M; i++) {
              C[ic] *= beta;
              ic += sc1;
            }
          }
          for (l = 0; l < K; l++) {
            temp = alpha * B[offsetB + j * sb1 + l * sb2];
            ia = offsetA + l * sa2;
            ic = offsetC + j * sc2;
            for (i = 0; i < M; i++) {
              C[ic] += temp * A[ia];
              ia += sa1;
              ic += sc1;
            }
          }
        }
      } else {
        for (j = 0; j < N; j++) {
          for (i = 0; i < M; i++) {
            temp = 0;
            ia = offsetA + i * sa2;
            ib = offsetB + j * sb1;
            for (l = 0; l < K; l++) {
              temp += A[ia] * B[ib];
              ia += sa1;
              ib += sb2;
            }
            ic = offsetC + i * sc1 + j * sc2;
            if (beta === 0) {
              C[ic] = alpha * temp;
            } else {
              C[ic] = alpha * temp + beta * C[ic];
            }
          }
        }
      }
      return C;
    }
    module.exports = dgemm;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dpotrf/lib/base.js
var require_base5 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dpotrf/lib/base.js"(exports, module) {
    "use strict";
    var dpotrf2 = require_base3();
    var dsyrk = require_base2();
    var dgemm = require_base4();
    var dtrsm = require_base();
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
        return dpotrf2(uplo, N, A, sa1, sa2, offsetA);
      }
      if (upper) {
        for (j = 0; j < N; j += NB) {
          jb = Math.min(NB, N - j);
          dsyrk("upper", "transpose", jb, j, -1, A, sa1, sa2, offsetA + j * sa2, 1, A, sa1, sa2, offsetA + j * sa1 + j * sa2);
          info = dpotrf2("upper", jb, A, sa1, sa2, offsetA + j * sa1 + j * sa2);
          if (info !== 0) {
            return info + j;
          }
          if (j + jb < N) {
            dgemm("transpose", "no-transpose", jb, N - j - jb, j, -1, A, sa1, sa2, offsetA + j * sa2, A, sa1, sa2, offsetA + (j + jb) * sa2, 1, A, sa1, sa2, offsetA + j * sa1 + (j + jb) * sa2);
            dtrsm("left", "upper", "transpose", "non-unit", jb, N - j - jb, 1, A, sa1, sa2, offsetA + j * sa1 + j * sa2, A, sa1, sa2, offsetA + j * sa1 + (j + jb) * sa2);
          }
        }
      } else {
        for (j = 0; j < N; j += NB) {
          jb = Math.min(NB, N - j);
          dsyrk("lower", "no-transpose", jb, j, -1, A, sa1, sa2, offsetA + j * sa1, 1, A, sa1, sa2, offsetA + j * sa1 + j * sa2);
          info = dpotrf2("lower", jb, A, sa1, sa2, offsetA + j * sa1 + j * sa2);
          if (info !== 0) {
            return info + j;
          }
          if (j + jb < N) {
            dgemm("no-transpose", "transpose", N - j - jb, jb, j, -1, A, sa1, sa2, offsetA + (j + jb) * sa1, A, sa1, sa2, offsetA + j * sa1, 1, A, sa1, sa2, offsetA + (j + jb) * sa1 + j * sa2);
            dtrsm("right", "lower", "transpose", "non-unit", N - j - jb, jb, 1, A, sa1, sa2, offsetA + j * sa1 + j * sa2, A, sa1, sa2, offsetA + (j + jb) * sa1 + j * sa2);
          }
        }
      }
      return 0;
    }
    module.exports = dpotrf;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/daxpy/lib/base.js
var require_base6 = __commonJS({
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
var require_base7 = __commonJS({
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

// ../../../../../private/tmp/blapack/lib/blas/base/dsyr2/lib/base.js
var require_base8 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dsyr2/lib/base.js"(exports, module) {
    "use strict";
    function dsyr2(uplo, N, alpha, x, strideX, offsetX, y, strideY, offsetY, A, strideA1, strideA2, offsetA) {
      var temp1;
      var temp2;
      var sa1;
      var sa2;
      var ix;
      var iy;
      var jx;
      var jy;
      var i;
      var j;
      if (N === 0 || alpha === 0) {
        return A;
      }
      sa1 = strideA1;
      sa2 = strideA2;
      if (uplo === "upper") {
        jx = offsetX;
        jy = offsetY;
        for (j = 0; j < N; j++) {
          if (x[jx] !== 0 || y[jy] !== 0) {
            temp1 = alpha * y[jy];
            temp2 = alpha * x[jx];
            ix = offsetX;
            iy = offsetY;
            for (i = 0; i <= j; i++) {
              A[offsetA + i * sa1 + j * sa2] += x[ix] * temp1 + y[iy] * temp2;
              ix += strideX;
              iy += strideY;
            }
          }
          jx += strideX;
          jy += strideY;
        }
      } else {
        jx = offsetX;
        jy = offsetY;
        for (j = 0; j < N; j++) {
          if (x[jx] !== 0 || y[jy] !== 0) {
            temp1 = alpha * y[jy];
            temp2 = alpha * x[jx];
            ix = jx;
            iy = jy;
            for (i = j; i < N; i++) {
              A[offsetA + i * sa1 + j * sa2] += x[ix] * temp1 + y[iy] * temp2;
              ix += strideX;
              iy += strideY;
            }
          }
          jx += strideX;
          jy += strideY;
        }
      }
      return A;
    }
    module.exports = dsyr2;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dtrmv/lib/base.js
var require_base9 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dtrmv/lib/base.js"(exports, module) {
    "use strict";
    function dtrmv(uplo, trans, diag, N, A, strideA1, strideA2, offsetA, x, strideX, offsetX) {
      var nounit;
      var temp;
      var sa1;
      var sa2;
      var ix;
      var jx;
      var ia;
      var i;
      var j;
      if (N <= 0) {
        return x;
      }
      nounit = diag === "non-unit";
      sa1 = strideA1;
      sa2 = strideA2;
      if (trans === "no-transpose") {
        if (uplo === "upper") {
          jx = offsetX;
          for (j = 0; j < N; j++) {
            if (x[jx] !== 0) {
              temp = x[jx];
              ix = offsetX;
              ia = offsetA + j * sa2;
              for (i = 0; i < j; i++) {
                x[ix] += temp * A[ia];
                ix += strideX;
                ia += sa1;
              }
              if (nounit) {
                x[jx] *= A[offsetA + j * sa1 + j * sa2];
              }
            }
            jx += strideX;
          }
        } else {
          jx = offsetX + (N - 1) * strideX;
          for (j = N - 1; j >= 0; j--) {
            if (x[jx] !== 0) {
              temp = x[jx];
              ix = offsetX + (N - 1) * strideX;
              ia = offsetA + (N - 1) * sa1 + j * sa2;
              for (i = N - 1; i > j; i--) {
                x[ix] += temp * A[ia];
                ix -= strideX;
                ia -= sa1;
              }
              if (nounit) {
                x[jx] *= A[offsetA + j * sa1 + j * sa2];
              }
            }
            jx -= strideX;
          }
        }
      } else if (uplo === "upper") {
        jx = offsetX + (N - 1) * strideX;
        for (j = N - 1; j >= 0; j--) {
          temp = x[jx];
          if (nounit) {
            temp *= A[offsetA + j * sa1 + j * sa2];
          }
          ix = offsetX + (j - 1) * strideX;
          ia = offsetA + (j - 1) * sa1 + j * sa2;
          for (i = j - 1; i >= 0; i--) {
            temp += A[ia] * x[ix];
            ix -= strideX;
            ia -= sa1;
          }
          x[jx] = temp;
          jx -= strideX;
        }
      } else {
        jx = offsetX;
        for (j = 0; j < N; j++) {
          temp = x[jx];
          if (nounit) {
            temp *= A[offsetA + j * sa1 + j * sa2];
          }
          ix = offsetX + (j + 1) * strideX;
          ia = offsetA + (j + 1) * sa1 + j * sa2;
          for (i = j + 1; i < N; i++) {
            temp += A[ia] * x[ix];
            ix += strideX;
            ia += sa1;
          }
          x[jx] = temp;
          jx += strideX;
        }
      }
      return x;
    }
    module.exports = dtrmv;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dtrsv/lib/base.js
var require_base10 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dtrsv/lib/base.js"(exports, module) {
    "use strict";
    function dtrsv(uplo, trans, diag, N, A, strideA1, strideA2, offsetA, x, strideX, offsetX) {
      var nounit;
      var temp;
      var sa1;
      var sa2;
      var ix;
      var jx;
      var ia;
      var i;
      var j;
      if (N <= 0) {
        return x;
      }
      nounit = diag === "non-unit";
      sa1 = strideA1;
      sa2 = strideA2;
      if (trans === "no-transpose") {
        if (uplo === "upper") {
          jx = offsetX + (N - 1) * strideX;
          for (j = N - 1; j >= 0; j--) {
            if (x[jx] !== 0) {
              if (nounit) {
                x[jx] /= A[offsetA + j * sa1 + j * sa2];
              }
              temp = x[jx];
              ix = jx - strideX;
              ia = offsetA + (j - 1) * sa1 + j * sa2;
              for (i = j - 1; i >= 0; i--) {
                x[ix] -= temp * A[ia];
                ix -= strideX;
                ia -= sa1;
              }
            }
            jx -= strideX;
          }
        } else {
          jx = offsetX;
          for (j = 0; j < N; j++) {
            if (x[jx] !== 0) {
              if (nounit) {
                x[jx] /= A[offsetA + j * sa1 + j * sa2];
              }
              temp = x[jx];
              ix = jx + strideX;
              ia = offsetA + (j + 1) * sa1 + j * sa2;
              for (i = j + 1; i < N; i++) {
                x[ix] -= temp * A[ia];
                ix += strideX;
                ia += sa1;
              }
            }
            jx += strideX;
          }
        }
      } else if (uplo === "upper") {
        jx = offsetX;
        for (j = 0; j < N; j++) {
          temp = x[jx];
          ix = offsetX;
          ia = offsetA + j * sa2;
          for (i = 0; i < j; i++) {
            temp -= A[ia] * x[ix];
            ix += strideX;
            ia += sa1;
          }
          if (nounit) {
            temp /= A[offsetA + j * sa1 + j * sa2];
          }
          x[jx] = temp;
          jx += strideX;
        }
      } else {
        jx = offsetX + (N - 1) * strideX;
        for (j = N - 1; j >= 0; j--) {
          temp = x[jx];
          ix = offsetX + (N - 1) * strideX;
          ia = offsetA + (N - 1) * sa1 + j * sa2;
          for (i = N - 1; i > j; i--) {
            temp -= A[ia] * x[ix];
            ix -= strideX;
            ia -= sa1;
          }
          if (nounit) {
            temp /= A[offsetA + j * sa1 + j * sa2];
          }
          x[jx] = temp;
          jx -= strideX;
        }
      }
      return x;
    }
    module.exports = dtrsv;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dsygs2/lib/base.js
var require_base11 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dsygs2/lib/base.js"(exports, module) {
    "use strict";
    var daxpy = require_base6();
    var dscal = require_base7();
    var dsyr2 = require_base8();
    var dtrmv = require_base9();
    var dtrsv = require_base10();
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
              dscal(N - k - 1, 1 / bkk, A, sa2, offsetA + k * sa1 + (k + 1) * sa2);
              ct = -0.5 * akk;
              daxpy(N - k - 1, ct, B, sb2, offsetB + k * sb1 + (k + 1) * sb2, A, sa2, offsetA + k * sa1 + (k + 1) * sa2);
              dsyr2(uplo, N - k - 1, -1, A, sa2, offsetA + k * sa1 + (k + 1) * sa2, B, sb2, offsetB + k * sb1 + (k + 1) * sb2, A, sa1, sa2, offsetA + (k + 1) * sa1 + (k + 1) * sa2);
              daxpy(N - k - 1, ct, B, sb2, offsetB + k * sb1 + (k + 1) * sb2, A, sa2, offsetA + k * sa1 + (k + 1) * sa2);
              dtrsv(uplo, "transpose", "non-unit", N - k - 1, B, sb1, sb2, offsetB + (k + 1) * sb1 + (k + 1) * sb2, A, sa2, offsetA + k * sa1 + (k + 1) * sa2);
            }
          }
        } else {
          for (k = 0; k < N; k++) {
            akk = A[offsetA + k * sa1 + k * sa2];
            bkk = B[offsetB + k * sb1 + k * sb2];
            akk /= bkk * bkk;
            A[offsetA + k * sa1 + k * sa2] = akk;
            if (k < N - 1) {
              dscal(N - k - 1, 1 / bkk, A, sa1, offsetA + (k + 1) * sa1 + k * sa2);
              ct = -0.5 * akk;
              daxpy(N - k - 1, ct, B, sb1, offsetB + (k + 1) * sb1 + k * sb2, A, sa1, offsetA + (k + 1) * sa1 + k * sa2);
              dsyr2(uplo, N - k - 1, -1, A, sa1, offsetA + (k + 1) * sa1 + k * sa2, B, sb1, offsetB + (k + 1) * sb1 + k * sb2, A, sa1, sa2, offsetA + (k + 1) * sa1 + (k + 1) * sa2);
              daxpy(N - k - 1, ct, B, sb1, offsetB + (k + 1) * sb1 + k * sb2, A, sa1, offsetA + (k + 1) * sa1 + k * sa2);
              dtrsv(uplo, "no-transpose", "non-unit", N - k - 1, B, sb1, sb2, offsetB + (k + 1) * sb1 + (k + 1) * sb2, A, sa1, offsetA + (k + 1) * sa1 + k * sa2);
            }
          }
        }
      } else {
        if (upper) {
          for (k = 0; k < N; k++) {
            akk = A[offsetA + k * sa1 + k * sa2];
            bkk = B[offsetB + k * sb1 + k * sb2];
            dtrmv(uplo, "no-transpose", "non-unit", k, B, sb1, sb2, offsetB, A, sa1, offsetA + k * sa2);
            ct = 0.5 * akk;
            daxpy(k, ct, B, sb1, offsetB + k * sb2, A, sa1, offsetA + k * sa2);
            dsyr2(uplo, k, 1, A, sa1, offsetA + k * sa2, B, sb1, offsetB + k * sb2, A, sa1, sa2, offsetA);
            daxpy(k, ct, B, sb1, offsetB + k * sb2, A, sa1, offsetA + k * sa2);
            dscal(k, bkk, A, sa1, offsetA + k * sa2);
            A[offsetA + k * sa1 + k * sa2] = akk * bkk * bkk;
          }
        } else {
          for (k = 0; k < N; k++) {
            akk = A[offsetA + k * sa1 + k * sa2];
            bkk = B[offsetB + k * sb1 + k * sb2];
            dtrmv(uplo, "transpose", "non-unit", k, B, sb1, sb2, offsetB, A, sa2, offsetA + k * sa1);
            ct = 0.5 * akk;
            daxpy(k, ct, B, sb2, offsetB + k * sb1, A, sa2, offsetA + k * sa1);
            dsyr2(uplo, k, 1, A, sa2, offsetA + k * sa1, B, sb2, offsetB + k * sb1, A, sa1, sa2, offsetA);
            daxpy(k, ct, B, sb2, offsetB + k * sb1, A, sa2, offsetA + k * sa1);
            dscal(k, bkk, A, sa2, offsetA + k * sa1);
            A[offsetA + k * sa1 + k * sa2] = akk * bkk * bkk;
          }
        }
      }
      return 0;
    }
    module.exports = dsygs2;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dsymm/lib/base.js
var require_base12 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dsymm/lib/base.js"(exports, module) {
    "use strict";
    function dsymm(side, uplo, M, N, alpha, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB, beta, C, strideC1, strideC2, offsetC) {
      var upper;
      var lside;
      var temp1;
      var temp2;
      var sa1;
      var sa2;
      var sb1;
      var sb2;
      var sc1;
      var sc2;
      var ic;
      var i;
      var j;
      var k;
      lside = side === "left";
      upper = uplo === "upper";
      if (M === 0 || N === 0 || alpha === 0 && beta === 1) {
        return C;
      }
      sa1 = strideA1;
      sa2 = strideA2;
      sb1 = strideB1;
      sb2 = strideB2;
      sc1 = strideC1;
      sc2 = strideC2;
      if (alpha === 0) {
        if (beta === 0) {
          for (j = 0; j < N; j++) {
            ic = offsetC + j * sc2;
            for (i = 0; i < M; i++) {
              C[ic] = 0;
              ic += sc1;
            }
          }
        } else {
          for (j = 0; j < N; j++) {
            ic = offsetC + j * sc2;
            for (i = 0; i < M; i++) {
              C[ic] *= beta;
              ic += sc1;
            }
          }
        }
        return C;
      }
      if (lside) {
        if (upper) {
          for (j = 0; j < N; j++) {
            for (i = 0; i < M; i++) {
              temp1 = alpha * B[offsetB + i * sb1 + j * sb2];
              temp2 = 0;
              for (k = 0; k < i; k++) {
                C[offsetC + k * sc1 + j * sc2] += temp1 * A[offsetA + k * sa1 + i * sa2];
                temp2 += B[offsetB + k * sb1 + j * sb2] * A[offsetA + k * sa1 + i * sa2];
              }
              if (beta === 0) {
                C[offsetC + i * sc1 + j * sc2] = temp1 * A[offsetA + i * sa1 + i * sa2] + alpha * temp2;
              } else {
                C[offsetC + i * sc1 + j * sc2] = beta * C[offsetC + i * sc1 + j * sc2] + temp1 * A[offsetA + i * sa1 + i * sa2] + alpha * temp2;
              }
            }
          }
        } else {
          for (j = 0; j < N; j++) {
            for (i = M - 1; i >= 0; i--) {
              temp1 = alpha * B[offsetB + i * sb1 + j * sb2];
              temp2 = 0;
              for (k = i + 1; k < M; k++) {
                C[offsetC + k * sc1 + j * sc2] += temp1 * A[offsetA + k * sa1 + i * sa2];
                temp2 += B[offsetB + k * sb1 + j * sb2] * A[offsetA + k * sa1 + i * sa2];
              }
              if (beta === 0) {
                C[offsetC + i * sc1 + j * sc2] = temp1 * A[offsetA + i * sa1 + i * sa2] + alpha * temp2;
              } else {
                C[offsetC + i * sc1 + j * sc2] = beta * C[offsetC + i * sc1 + j * sc2] + temp1 * A[offsetA + i * sa1 + i * sa2] + alpha * temp2;
              }
            }
          }
        }
      } else {
        for (j = 0; j < N; j++) {
          temp1 = alpha * A[offsetA + j * sa1 + j * sa2];
          if (beta === 0) {
            for (i = 0; i < M; i++) {
              C[offsetC + i * sc1 + j * sc2] = temp1 * B[offsetB + i * sb1 + j * sb2];
            }
          } else {
            for (i = 0; i < M; i++) {
              C[offsetC + i * sc1 + j * sc2] = beta * C[offsetC + i * sc1 + j * sc2] + temp1 * B[offsetB + i * sb1 + j * sb2];
            }
          }
          for (k = 0; k < j; k++) {
            if (upper) {
              temp1 = alpha * A[offsetA + k * sa1 + j * sa2];
            } else {
              temp1 = alpha * A[offsetA + j * sa1 + k * sa2];
            }
            for (i = 0; i < M; i++) {
              C[offsetC + i * sc1 + j * sc2] += temp1 * B[offsetB + i * sb1 + k * sb2];
            }
          }
          for (k = j + 1; k < N; k++) {
            if (upper) {
              temp1 = alpha * A[offsetA + j * sa1 + k * sa2];
            } else {
              temp1 = alpha * A[offsetA + k * sa1 + j * sa2];
            }
            for (i = 0; i < M; i++) {
              C[offsetC + i * sc1 + j * sc2] += temp1 * B[offsetB + i * sb1 + k * sb2];
            }
          }
        }
      }
      return C;
    }
    module.exports = dsymm;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dsyr2k/lib/base.js
var require_base13 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dsyr2k/lib/base.js"(exports, module) {
    "use strict";
    function dsyr2k(uplo, trans, N, K, alpha, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB, beta, C, strideC1, strideC2, offsetC) {
      var upper;
      var temp1;
      var temp2;
      var nota;
      var sa1;
      var sa2;
      var sb1;
      var sb2;
      var sc1;
      var sc2;
      var ic;
      var ia;
      var ib;
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
      sb1 = strideB1;
      sb2 = strideB2;
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
              if (A[offsetA + j * sa1 + l * sa2] !== 0 || B[offsetB + j * sb1 + l * sb2] !== 0) {
                temp1 = alpha * B[offsetB + j * sb1 + l * sb2];
                temp2 = alpha * A[offsetA + j * sa1 + l * sa2];
                ia = offsetA + l * sa2;
                ib = offsetB + l * sb2;
                ic = offsetC + j * sc2;
                for (i = 0; i <= j; i++) {
                  C[ic] += A[ia] * temp1 + B[ib] * temp2;
                  ia += sa1;
                  ib += sb1;
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
              if (A[offsetA + j * sa1 + l * sa2] !== 0 || B[offsetB + j * sb1 + l * sb2] !== 0) {
                temp1 = alpha * B[offsetB + j * sb1 + l * sb2];
                temp2 = alpha * A[offsetA + j * sa1 + l * sa2];
                ia = offsetA + j * sa1 + l * sa2;
                ib = offsetB + j * sb1 + l * sb2;
                ic = offsetC + j * sc1 + j * sc2;
                for (i = j; i < N; i++) {
                  C[ic] += A[ia] * temp1 + B[ib] * temp2;
                  ia += sa1;
                  ib += sb1;
                  ic += sc1;
                }
              }
            }
          }
        }
      } else if (upper) {
        for (j = 0; j < N; j++) {
          for (i = 0; i <= j; i++) {
            temp1 = 0;
            temp2 = 0;
            for (l = 0; l < K; l++) {
              temp1 += A[offsetA + l * sa1 + i * sa2] * B[offsetB + l * sb1 + j * sb2];
              temp2 += B[offsetB + l * sb1 + i * sb2] * A[offsetA + l * sa1 + j * sa2];
            }
            if (beta === 0) {
              C[offsetC + i * sc1 + j * sc2] = alpha * temp1 + alpha * temp2;
            } else {
              C[offsetC + i * sc1 + j * sc2] = beta * C[offsetC + i * sc1 + j * sc2] + alpha * temp1 + alpha * temp2;
            }
          }
        }
      } else {
        for (j = 0; j < N; j++) {
          for (i = j; i < N; i++) {
            temp1 = 0;
            temp2 = 0;
            for (l = 0; l < K; l++) {
              temp1 += A[offsetA + l * sa1 + i * sa2] * B[offsetB + l * sb1 + j * sb2];
              temp2 += B[offsetB + l * sb1 + i * sb2] * A[offsetA + l * sa1 + j * sa2];
            }
            if (beta === 0) {
              C[offsetC + i * sc1 + j * sc2] = alpha * temp1 + alpha * temp2;
            } else {
              C[offsetC + i * sc1 + j * sc2] = beta * C[offsetC + i * sc1 + j * sc2] + alpha * temp1 + alpha * temp2;
            }
          }
        }
      }
      return C;
    }
    module.exports = dsyr2k;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dtrmm/lib/base.js
var require_base14 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dtrmm/lib/base.js"(exports, module) {
    "use strict";
    function dtrmm(side, uplo, transa, diag, M, N, alpha, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB) {
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
      if (M === 0 || N === 0) {
        return B;
      }
      lside = side === "left";
      upper = uplo === "upper";
      nounit = diag === "non-unit";
      sa1 = strideA1;
      sa2 = strideA2;
      sb1 = strideB1;
      sb2 = strideB2;
      if (alpha === 0) {
        for (j = 0; j < N; j++) {
          ib = offsetB + j * sb2;
          for (i = 0; i < M; i++) {
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
              for (k = 0; k < M; k++) {
                ib = offsetB + k * sb1 + j * sb2;
                if (B[ib] !== 0) {
                  temp = alpha * B[ib];
                  ia = offsetA + k * sa2;
                  for (i = 0; i < k; i++) {
                    B[offsetB + i * sb1 + j * sb2] += temp * A[ia];
                    ia += sa1;
                  }
                  if (nounit) {
                    B[ib] = temp * A[offsetA + k * sa1 + k * sa2];
                  } else {
                    B[ib] = temp;
                  }
                }
              }
            }
          } else {
            for (j = 0; j < N; j++) {
              for (k = M - 1; k >= 0; k--) {
                ib = offsetB + k * sb1 + j * sb2;
                if (B[ib] !== 0) {
                  temp = alpha * B[ib];
                  B[ib] = temp;
                  if (nounit) {
                    B[ib] = temp * A[offsetA + k * sa1 + k * sa2];
                  }
                  ia = offsetA + (k + 1) * sa1 + k * sa2;
                  for (i = k + 1; i < M; i++) {
                    B[offsetB + i * sb1 + j * sb2] += temp * A[ia];
                    ia += sa1;
                  }
                }
              }
            }
          }
        } else if (upper) {
          for (j = 0; j < N; j++) {
            for (i = M - 1; i >= 0; i--) {
              temp = B[offsetB + i * sb1 + j * sb2];
              if (nounit) {
                temp *= A[offsetA + i * sa1 + i * sa2];
              }
              ia = offsetA + i * sa2;
              for (k = 0; k < i; k++) {
                temp += A[ia] * B[offsetB + k * sb1 + j * sb2];
                ia += sa1;
              }
              B[offsetB + i * sb1 + j * sb2] = alpha * temp;
            }
          }
        } else {
          for (j = 0; j < N; j++) {
            for (i = 0; i < M; i++) {
              temp = B[offsetB + i * sb1 + j * sb2];
              if (nounit) {
                temp *= A[offsetA + i * sa1 + i * sa2];
              }
              for (k = i + 1; k < M; k++) {
                temp += A[offsetA + k * sa1 + i * sa2] * B[offsetB + k * sb1 + j * sb2];
              }
              B[offsetB + i * sb1 + j * sb2] = alpha * temp;
            }
          }
        }
      } else if (transa === "no-transpose") {
        if (upper) {
          for (j = N - 1; j >= 0; j--) {
            temp = alpha;
            if (nounit) {
              temp *= A[offsetA + j * sa1 + j * sa2];
            }
            ib = offsetB + j * sb2;
            for (i = 0; i < M; i++) {
              B[ib] *= temp;
              ib += sb1;
            }
            for (k = 0; k < j; k++) {
              if (A[offsetA + k * sa1 + j * sa2] !== 0) {
                temp = alpha * A[offsetA + k * sa1 + j * sa2];
                for (i = 0; i < M; i++) {
                  B[offsetB + i * sb1 + j * sb2] += temp * B[offsetB + i * sb1 + k * sb2];
                }
              }
            }
          }
        } else {
          for (j = 0; j < N; j++) {
            temp = alpha;
            if (nounit) {
              temp *= A[offsetA + j * sa1 + j * sa2];
            }
            ib = offsetB + j * sb2;
            for (i = 0; i < M; i++) {
              B[ib] *= temp;
              ib += sb1;
            }
            for (k = j + 1; k < N; k++) {
              if (A[offsetA + k * sa1 + j * sa2] !== 0) {
                temp = alpha * A[offsetA + k * sa1 + j * sa2];
                for (i = 0; i < M; i++) {
                  B[offsetB + i * sb1 + j * sb2] += temp * B[offsetB + i * sb1 + k * sb2];
                }
              }
            }
          }
        }
      } else if (upper) {
        for (k = 0; k < N; k++) {
          for (j = 0; j < k; j++) {
            if (A[offsetA + j * sa1 + k * sa2] !== 0) {
              temp = alpha * A[offsetA + j * sa1 + k * sa2];
              for (i = 0; i < M; i++) {
                B[offsetB + i * sb1 + j * sb2] += temp * B[offsetB + i * sb1 + k * sb2];
              }
            }
          }
          temp = alpha;
          if (nounit) {
            temp *= A[offsetA + k * sa1 + k * sa2];
          }
          if (temp !== 1) {
            ib = offsetB + k * sb2;
            for (i = 0; i < M; i++) {
              B[ib] *= temp;
              ib += sb1;
            }
          }
        }
      } else {
        for (k = N - 1; k >= 0; k--) {
          for (j = k + 1; j < N; j++) {
            if (A[offsetA + j * sa1 + k * sa2] !== 0) {
              temp = alpha * A[offsetA + j * sa1 + k * sa2];
              for (i = 0; i < M; i++) {
                B[offsetB + i * sb1 + j * sb2] += temp * B[offsetB + i * sb1 + k * sb2];
              }
            }
          }
          temp = alpha;
          if (nounit) {
            temp *= A[offsetA + k * sa1 + k * sa2];
          }
          if (temp !== 1) {
            ib = offsetB + k * sb2;
            for (i = 0; i < M; i++) {
              B[ib] *= temp;
              ib += sb1;
            }
          }
        }
      }
      return B;
    }
    module.exports = dtrmm;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dsygst/lib/base.js
var require_base15 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dsygst/lib/base.js"(exports, module) {
    "use strict";
    var dsygs2 = require_base11();
    var dsymm = require_base12();
    var dsyr2k = require_base13();
    var dtrmm = require_base14();
    var dtrsm = require_base();
    var NB = 64;
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
      if (NB <= 1 || NB >= N) {
        return dsygs2(itype, uplo, N, A, sa1, sa2, offsetA, B, sb1, sb2, offsetB);
      }
      if (itype === 1) {
        if (upper) {
          for (k = 0; k < N; k += NB) {
            kb = Math.min(N - k, NB);
            dsygs2(itype, uplo, kb, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1 + k * sb2);
            if (k + kb < N) {
              dtrsm("left", uplo, "transpose", "non-unit", kb, N - k - kb, 1, B, sb1, sb2, offsetB + k * sb1 + k * sb2, A, sa1, sa2, offsetA + k * sa1 + (k + kb) * sa2);
              dsymm("left", uplo, kb, N - k - kb, -0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1 + (k + kb) * sb2, 1, A, sa1, sa2, offsetA + k * sa1 + (k + kb) * sa2);
              dsyr2k(uplo, "transpose", N - k - kb, kb, -1, A, sa1, sa2, offsetA + k * sa1 + (k + kb) * sa2, B, sb1, sb2, offsetB + k * sb1 + (k + kb) * sb2, 1, A, sa1, sa2, offsetA + (k + kb) * sa1 + (k + kb) * sa2);
              dsymm("left", uplo, kb, N - k - kb, -0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1 + (k + kb) * sb2, 1, A, sa1, sa2, offsetA + k * sa1 + (k + kb) * sa2);
              dtrsm("right", uplo, "no-transpose", "non-unit", kb, N - k - kb, 1, B, sb1, sb2, offsetB + (k + kb) * sb1 + (k + kb) * sb2, A, sa1, sa2, offsetA + k * sa1 + (k + kb) * sa2);
            }
          }
        } else {
          for (k = 0; k < N; k += NB) {
            kb = Math.min(N - k, NB);
            dsygs2(itype, uplo, kb, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1 + k * sb2);
            if (k + kb < N) {
              dtrsm("right", uplo, "transpose", "non-unit", N - k - kb, kb, 1, B, sb1, sb2, offsetB + k * sb1 + k * sb2, A, sa1, sa2, offsetA + (k + kb) * sa1 + k * sa2);
              dsymm("right", uplo, N - k - kb, kb, -0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + (k + kb) * sb1 + k * sb2, 1, A, sa1, sa2, offsetA + (k + kb) * sa1 + k * sa2);
              dsyr2k(uplo, "no-transpose", N - k - kb, kb, -1, A, sa1, sa2, offsetA + (k + kb) * sa1 + k * sa2, B, sb1, sb2, offsetB + (k + kb) * sb1 + k * sb2, 1, A, sa1, sa2, offsetA + (k + kb) * sa1 + (k + kb) * sa2);
              dsymm("right", uplo, N - k - kb, kb, -0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + (k + kb) * sb1 + k * sb2, 1, A, sa1, sa2, offsetA + (k + kb) * sa1 + k * sa2);
              dtrsm("left", uplo, "no-transpose", "non-unit", N - k - kb, kb, 1, B, sb1, sb2, offsetB + (k + kb) * sb1 + (k + kb) * sb2, A, sa1, sa2, offsetA + (k + kb) * sa1 + k * sa2);
            }
          }
        }
      } else {
        if (upper) {
          for (k = 0; k < N; k += NB) {
            kb = Math.min(N - k, NB);
            dtrmm("left", uplo, "no-transpose", "non-unit", k, kb, 1, B, sb1, sb2, offsetB, A, sa1, sa2, offsetA + k * sa2);
            dsymm("right", uplo, k, kb, 0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb2, 1, A, sa1, sa2, offsetA + k * sa2);
            dsyr2k(uplo, "no-transpose", k, kb, 1, A, sa1, sa2, offsetA + k * sa2, B, sb1, sb2, offsetB + k * sb2, 1, A, sa1, sa2, offsetA);
            dsymm("right", uplo, k, kb, 0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb2, 1, A, sa1, sa2, offsetA + k * sa2);
            dtrmm("right", uplo, "transpose", "non-unit", k, kb, 1, B, sb1, sb2, offsetB + k * sb1 + k * sb2, A, sa1, sa2, offsetA + k * sa2);
            dsygs2(itype, uplo, kb, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1 + k * sb2);
          }
        } else {
          for (k = 0; k < N; k += NB) {
            kb = Math.min(N - k, NB);
            dtrmm("right", uplo, "no-transpose", "non-unit", kb, k, 1, B, sb1, sb2, offsetB, A, sa1, sa2, offsetA + k * sa1);
            dsymm("left", uplo, kb, k, 0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1, 1, A, sa1, sa2, offsetA + k * sa1);
            dsyr2k(uplo, "transpose", k, kb, 1, A, sa1, sa2, offsetA + k * sa1, B, sb1, sb2, offsetB + k * sb1, 1, A, sa1, sa2, offsetA);
            dsymm("left", uplo, kb, k, 0.5, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1, 1, A, sa1, sa2, offsetA + k * sa1);
            dtrmm("left", uplo, "transpose", "non-unit", kb, k, 1, B, sb1, sb2, offsetB + k * sb1 + k * sb2, A, sa1, sa2, offsetA + k * sa1);
            dsygs2(itype, uplo, kb, A, sa1, sa2, offsetA + k * sa1 + k * sa2, B, sb1, sb2, offsetB + k * sb1 + k * sb2);
          }
        }
      }
      return 0;
    }
    module.exports = dsygst;
  }
});

// ../../../../../private/tmp/dgeev-shims/stdlib-array-float64.js
var require_stdlib_array_float64 = __commonJS({
  "../../../../../private/tmp/dgeev-shims/stdlib-array-float64.js"(exports, module) {
    module.exports = Float64Array;
  }
});

// ../../../../../private/tmp/dgeev-shims/stdlib-array-int32.js
var require_stdlib_array_int32 = __commonJS({
  "../../../../../private/tmp/dgeev-shims/stdlib-array-int32.js"(exports, module) {
    module.exports = Int32Array;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlamch/lib/base.js
var require_base16 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlamch/lib/base.js"(exports, module) {
    "use strict";
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
    module.exports = dlamch;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlassq/lib/base.js
var require_base17 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlassq/lib/base.js"(exports, module) {
    "use strict";
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
    module.exports = dlassq;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlansy/lib/base.js
var require_base18 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlansy/lib/base.js"(exports, module) {
    "use strict";
    var dlassq = require_base17();
    function dlansy(norm, uplo, N, A, strideA1, strideA2, offsetA, WORK, strideWORK, offsetWORK) {
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
              WORK[offsetWORK + i * strideWORK] += absa;
              ai += strideA1;
            }
            WORK[offsetWORK + j * strideWORK] = sum + Math.abs(A[ai]);
          }
          for (i = 0; i < N; i++) {
            wi = offsetWORK + i * strideWORK;
            sum = WORK[wi];
            if (value < sum || sum !== sum) {
              value = sum;
            }
          }
        } else {
          for (i = 0; i < N; i++) {
            WORK[offsetWORK + i * strideWORK] = 0;
          }
          for (j = 0; j < N; j++) {
            sum = WORK[offsetWORK + j * strideWORK] + Math.abs(A[offsetA + j * strideA2 + j * strideA1]);
            ai = offsetA + j * strideA2 + (j + 1) * strideA1;
            for (i = j + 1; i < N; i++) {
              absa = Math.abs(A[ai]);
              sum += absa;
              WORK[offsetWORK + i * strideWORK] += absa;
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
            out = dlassq(j, A, strideA1, offsetA + j * strideA2, scale, sum);
            scale = out.scl;
            sum = out.sumsq;
          }
        } else {
          for (j = 0; j < N - 1; j++) {
            out = dlassq(N - j - 1, A, strideA1, offsetA + j * strideA2 + (j + 1) * strideA1, scale, sum);
            scale = out.scl;
            sum = out.sumsq;
          }
        }
        sum *= 2;
        out = dlassq(N, A, strideA1 + strideA2, offsetA, scale, sum);
        scale = out.scl;
        sum = out.sumsq;
        value = scale * Math.sqrt(sum);
      } else {
        value = 0;
      }
      return value;
    }
    module.exports = dlansy;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dnrm2/lib/base.js
var require_base19 = __commonJS({
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

// ../../../../../private/tmp/blapack/lib/lapack/base/dlapy2/lib/base.js
var require_base20 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlapy2/lib/base.js"(exports, module) {
    "use strict";
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
    module.exports = dlapy2;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlarfg/lib/base.js
var require_base21 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlarfg/lib/base.js"(exports, module) {
    "use strict";
    var dnrm2 = require_base19();
    var dscal = require_base7();
    var dlamch = require_base16();
    var dlapy2 = require_base20();
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
      xnorm = dnrm2(N - 1, x, strideX, offsetX);
      if (xnorm === 0) {
        tau[offsetTau] = 0;
      } else {
        sign = Math.sign(alpha[offsetAlpha]) || 1;
        beta = -sign * dlapy2(alpha[offsetAlpha], xnorm);
        safmin = dlamch("safe-minimum") / dlamch("epsilon");
        knt = 0;
        if (Math.abs(beta) < safmin) {
          rsafmn = 1 / safmin;
          do {
            knt += 1;
            dscal(N - 1, rsafmn, x, strideX, offsetX);
            beta *= rsafmn;
            alpha[offsetAlpha] *= rsafmn;
          } while (Math.abs(beta) < safmin && knt < 20);
          xnorm = dnrm2(N - 1, x, strideX, offsetX);
          sign = Math.sign(alpha[offsetAlpha]) || 1;
          beta = -sign * dlapy2(alpha[offsetAlpha], xnorm);
        }
        tau[offsetTau] = (beta - alpha[offsetAlpha]) / beta;
        dscal(N - 1, 1 / (alpha[offsetAlpha] - beta), x, strideX, offsetX);
        for (j = 0; j < knt; j++) {
          beta *= safmin;
        }
        alpha[offsetAlpha] = beta;
      }
    }
    module.exports = dlarfg;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dsymv/lib/base.js
var require_base22 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dsymv/lib/base.js"(exports, module) {
    "use strict";
    function dsymv(uplo, N, alpha, A, strideA1, strideA2, offsetA, x, strideX, offsetX, beta, y, strideY, offsetY) {
      var temp1;
      var temp2;
      var sa1;
      var sa2;
      var ia;
      var ix;
      var iy;
      var jx;
      var jy;
      var i;
      var j;
      sa1 = strideA1;
      sa2 = strideA2;
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
        jx = offsetX;
        jy = offsetY;
        for (j = 0; j < N; j++) {
          temp1 = alpha * x[jx];
          temp2 = 0;
          ix = offsetX;
          iy = offsetY;
          ia = offsetA + j * sa2;
          for (i = 0; i < j; i++) {
            y[iy] += temp1 * A[ia + i * sa1];
            temp2 += A[ia + i * sa1] * x[ix];
            ix += strideX;
            iy += strideY;
          }
          y[jy] += temp1 * A[ia + j * sa1] + alpha * temp2;
          jx += strideX;
          jy += strideY;
        }
      } else {
        jx = offsetX;
        jy = offsetY;
        for (j = 0; j < N; j++) {
          temp1 = alpha * x[jx];
          temp2 = 0;
          ia = offsetA + j * sa2;
          y[jy] += temp1 * A[ia + j * sa1];
          ix = jx;
          iy = jy;
          for (i = j + 1; i < N; i++) {
            ix += strideX;
            iy += strideY;
            y[iy] += temp1 * A[ia + i * sa1];
            temp2 += A[ia + i * sa1] * x[ix];
          }
          y[jy] += alpha * temp2;
          jx += strideX;
          jy += strideY;
        }
      }
      return y;
    }
    module.exports = dsymv;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/ddot/lib/base.js
var require_base23 = __commonJS({
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

// ../../../../../private/tmp/blapack/lib/lapack/base/dsytd2/lib/base.js
var require_base24 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dsytd2/lib/base.js"(exports, module) {
    "use strict";
    var dlarfg = require_base21();
    var dsymv = require_base22();
    var dsyr2 = require_base8();
    var ddot = require_base23();
    var daxpy = require_base6();
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
          dlarfg(
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
            dsymv(
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
            alpha = -(HALF * taui) * ddot(i + 1, TAU, strideTAU, offsetTAU, A, sa1, offsetA + (i + 1) * sa2);
            daxpy(i + 1, alpha, A, sa1, offsetA + (i + 1) * sa2, TAU, strideTAU, offsetTAU);
            dsyr2(uplo, i + 1, -1, A, sa1, offsetA + (i + 1) * sa2, TAU, strideTAU, offsetTAU, A, sa1, sa2, offsetA);
            A[offsetA + i * sa1 + (i + 1) * sa2] = e[offsetE + i * strideE];
          }
          d[offsetD + (i + 1) * strideD] = A[offsetA + (i + 1) * sa1 + (i + 1) * sa2];
          TAU[offsetTAU + i * strideTAU] = taui;
        }
        d[offsetD] = A[offsetA];
      } else {
        for (i = 0; i < N - 1; i++) {
          dlarfg(
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
            dsymv(
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
            alpha = -(HALF * taui) * ddot(N - i - 1, TAU, strideTAU, offsetTAU + i * strideTAU, A, sa1, offsetA + (i + 1) * sa1 + i * sa2);
            daxpy(N - i - 1, alpha, A, sa1, offsetA + (i + 1) * sa1 + i * sa2, TAU, strideTAU, offsetTAU + i * strideTAU);
            dsyr2(uplo, N - i - 1, -1, A, sa1, offsetA + (i + 1) * sa1 + i * sa2, TAU, strideTAU, offsetTAU + i * strideTAU, A, sa1, sa2, offsetA + (i + 1) * sa1 + (i + 1) * sa2);
            A[offsetA + (i + 1) * sa1 + i * sa2] = e[offsetE + i * strideE];
          }
          d[offsetD + i * strideD] = A[offsetA + i * sa1 + i * sa2];
          TAU[offsetTAU + i * strideTAU] = taui;
        }
        d[offsetD + (N - 1) * strideD] = A[offsetA + (N - 1) * sa1 + (N - 1) * sa2];
      }
      return 0;
    }
    module.exports = dsytd2;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dgemv/lib/base.js
var require_base25 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dgemv/lib/base.js"(exports, module) {
    "use strict";
    function dgemv(trans, M, N, alpha, A, strideA1, strideA2, offsetA, x, strideX, offsetX, beta, y, strideY, offsetY) {
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
      if (M === 0 || N === 0 || alpha === 0 && beta === 1) {
        return y;
      }
      sa1 = strideA1;
      sa2 = strideA2;
      if (noTrans) {
        leny = M;
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
          for (i = 0; i < M; i++) {
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
          for (i = 0; i < M; i++) {
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
    module.exports = dgemv;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlatrd/lib/base.js
var require_base26 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlatrd/lib/base.js"(exports, module) {
    "use strict";
    var dgemv = require_base25();
    var dsymv = require_base22();
    var dlarfg = require_base21();
    var dscal = require_base7();
    var ddot = require_base23();
    var daxpy = require_base6();
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
            dgemv("no-transpose", i + 1, N - 1 - i, -1, A, strideA1, strideA2, offsetA + (i + 1) * strideA2, W, strideW2, offsetW + i * strideW1 + (iw + 1) * strideW2, 1, A, strideA1, offsetA + i * strideA2);
            dgemv("no-transpose", i + 1, N - 1 - i, -1, W, strideW1, strideW2, offsetW + (iw + 1) * strideW2, A, strideA2, offsetA + i * strideA1 + (i + 1) * strideA2, 1, A, strideA1, offsetA + i * strideA2);
          }
          if (i > 0) {
            dlarfg(i, A, offsetA + (i - 1) * strideA1 + i * strideA2, A, strideA1, offsetA + i * strideA2, TAU, offsetTAU + (i - 1) * strideTAU);
            e[offsetE + (i - 1) * strideE] = A[offsetA + (i - 1) * strideA1 + i * strideA2];
            A[offsetA + (i - 1) * strideA1 + i * strideA2] = 1;
            dsymv("upper", i, 1, A, strideA1, strideA2, offsetA, A, strideA1, offsetA + i * strideA2, 0, W, strideW1, offsetW + iw * strideW2);
            if (i < N - 1) {
              dgemv("transpose", i, N - 1 - i, 1, W, strideW1, strideW2, offsetW + (iw + 1) * strideW2, A, strideA1, offsetA + i * strideA2, 0, W, strideW1, offsetW + (i + 1) * strideW1 + iw * strideW2);
              dgemv("no-transpose", i, N - 1 - i, -1, A, strideA1, strideA2, offsetA + (i + 1) * strideA2, W, strideW1, offsetW + (i + 1) * strideW1 + iw * strideW2, 1, W, strideW1, offsetW + iw * strideW2);
              dgemv("transpose", i, N - 1 - i, 1, A, strideA1, strideA2, offsetA + (i + 1) * strideA2, A, strideA1, offsetA + i * strideA2, 0, W, strideW1, offsetW + (i + 1) * strideW1 + iw * strideW2);
              dgemv("no-transpose", i, N - 1 - i, -1, W, strideW1, strideW2, offsetW + (iw + 1) * strideW2, W, strideW1, offsetW + (i + 1) * strideW1 + iw * strideW2, 1, W, strideW1, offsetW + iw * strideW2);
            }
            dscal(i, TAU[offsetTAU + (i - 1) * strideTAU], W, strideW1, offsetW + iw * strideW2);
            alpha = -(0.5 * TAU[offsetTAU + (i - 1) * strideTAU]) * ddot(i, W, strideW1, offsetW + iw * strideW2, A, strideA1, offsetA + i * strideA2);
            daxpy(i, alpha, A, strideA1, offsetA + i * strideA2, W, strideW1, offsetW + iw * strideW2);
          }
        }
      } else {
        for (i = 0; i < nb; i++) {
          dgemv("no-transpose", N - i, i, -1, A, strideA1, strideA2, offsetA + i * strideA1, W, strideW2, offsetW + i * strideW1, 1, A, strideA1, offsetA + i * strideA1 + i * strideA2);
          dgemv("no-transpose", N - i, i, -1, W, strideW1, strideW2, offsetW + i * strideW1, A, strideA2, offsetA + i * strideA1, 1, A, strideA1, offsetA + i * strideA1 + i * strideA2);
          if (i < N - 1) {
            dlarfg(N - i - 1, A, offsetA + (i + 1) * strideA1 + i * strideA2, A, strideA1, offsetA + Math.min(i + 2, N - 1) * strideA1 + i * strideA2, TAU, offsetTAU + i * strideTAU);
            e[offsetE + i * strideE] = A[offsetA + (i + 1) * strideA1 + i * strideA2];
            A[offsetA + (i + 1) * strideA1 + i * strideA2] = 1;
            dsymv("lower", N - i - 1, 1, A, strideA1, strideA2, offsetA + (i + 1) * strideA1 + (i + 1) * strideA2, A, strideA1, offsetA + (i + 1) * strideA1 + i * strideA2, 0, W, strideW1, offsetW + (i + 1) * strideW1 + i * strideW2);
            dgemv("transpose", N - i - 1, i, 1, W, strideW1, strideW2, offsetW + (i + 1) * strideW1, A, strideA1, offsetA + (i + 1) * strideA1 + i * strideA2, 0, W, strideW1, offsetW + i * strideW2);
            dgemv("no-transpose", N - i - 1, i, -1, A, strideA1, strideA2, offsetA + (i + 1) * strideA1, W, strideW1, offsetW + i * strideW2, 1, W, strideW1, offsetW + (i + 1) * strideW1 + i * strideW2);
            dgemv("transpose", N - i - 1, i, 1, A, strideA1, strideA2, offsetA + (i + 1) * strideA1, A, strideA1, offsetA + (i + 1) * strideA1 + i * strideA2, 0, W, strideW1, offsetW + i * strideW2);
            dgemv("no-transpose", N - i - 1, i, -1, W, strideW1, strideW2, offsetW + (i + 1) * strideW1, W, strideW1, offsetW + i * strideW2, 1, W, strideW1, offsetW + (i + 1) * strideW1 + i * strideW2);
            dscal(N - i - 1, TAU[offsetTAU + i * strideTAU], W, strideW1, offsetW + (i + 1) * strideW1 + i * strideW2);
            alpha = -(0.5 * TAU[offsetTAU + i * strideTAU]) * ddot(N - i - 1, W, strideW1, offsetW + (i + 1) * strideW1 + i * strideW2, A, strideA1, offsetA + (i + 1) * strideA1 + i * strideA2);
            daxpy(N - i - 1, alpha, A, strideA1, offsetA + (i + 1) * strideA1 + i * strideA2, W, strideW1, offsetW + (i + 1) * strideW1 + i * strideW2);
          }
        }
      }
    }
    module.exports = dlatrd;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dsytrd/lib/base.js
var require_base27 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dsytrd/lib/base.js"(exports, module) {
    "use strict";
    var Float64Array2 = require_stdlib_array_float64();
    var dsytd2 = require_base24();
    var dlatrd = require_base26();
    var dsyr2k = require_base13();
    var NB = 32;
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
      if (N <= NB) {
        return dsytd2(uplo, N, A, sa1, sa2, offsetA, d, strideD, offsetD, e, strideE, offsetE, TAU, strideTAU, offsetTAU);
      }
      nb = NB;
      nx = nb;
      ldwork = N;
      work = new Float64Array2(ldwork * nb);
      if (uplo === "upper") {
        kk = N - Math.floor((N - nx + nb - 1) / nb) * nb;
        for (i = N - nb; i >= kk; i -= nb) {
          dlatrd(uplo, i + nb, nb, A, sa1, sa2, offsetA, e, strideE, offsetE, TAU, strideTAU, offsetTAU, work, 1, ldwork, 0);
          dsyr2k(uplo, "no-transpose", i, nb, -1, A, sa1, sa2, offsetA + i * sa2, work, 1, ldwork, 0, 1, A, sa1, sa2, offsetA);
          for (j = i; j < i + nb; j++) {
            A[offsetA + (j - 1) * sa1 + j * sa2] = e[offsetE + (j - 1) * strideE];
            d[offsetD + j * strideD] = A[offsetA + j * sa1 + j * sa2];
          }
        }
        dsytd2(uplo, kk, A, sa1, sa2, offsetA, d, strideD, offsetD, e, strideE, offsetE, TAU, strideTAU, offsetTAU);
      } else {
        i = 0;
        while (i <= N - nx - 1) {
          dlatrd(uplo, N - i, nb, A, sa1, sa2, offsetA + i * sa1 + i * sa2, e, strideE, offsetE + i * strideE, TAU, strideTAU, offsetTAU + i * strideTAU, work, 1, ldwork, 0);
          dsyr2k(uplo, "no-transpose", N - i - nb, nb, -1, A, sa1, sa2, offsetA + (i + nb) * sa1 + i * sa2, work, 1, ldwork, nb, 1, A, sa1, sa2, offsetA + (i + nb) * sa1 + (i + nb) * sa2);
          for (j = i; j < i + nb; j++) {
            A[offsetA + (j + 1) * sa1 + j * sa2] = e[offsetE + j * strideE];
            d[offsetD + j * strideD] = A[offsetA + j * sa1 + j * sa2];
          }
          i += nb;
        }
        dsytd2(uplo, N - i, A, sa1, sa2, offsetA + i * sa1 + i * sa2, d, strideD, offsetD + i * strideD, e, strideE, offsetE + i * strideE, TAU, strideTAU, offsetTAU + i * strideTAU);
      }
      return 0;
    }
    module.exports = dsytrd;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dger/lib/base.js
var require_base28 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dger/lib/base.js"(exports, module) {
    "use strict";
    function dger(M, N, alpha, x, strideX, offsetX, y, strideY, offsetY, A, strideA1, strideA2, offsetA) {
      var temp;
      var ix;
      var jy;
      var i;
      var j;
      if (M === 0 || N === 0 || alpha === 0) {
        return A;
      }
      jy = offsetY;
      for (j = 0; j < N; j++) {
        if (y[jy] !== 0) {
          temp = alpha * y[jy];
          ix = offsetX;
          for (i = 0; i < M; i++) {
            A[offsetA + i * strideA1 + j * strideA2] += x[ix] * temp;
            ix += strideX;
          }
        }
        jy += strideY;
      }
      return A;
    }
    module.exports = dger;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/iladlr/lib/base.js
var require_base29 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/iladlr/lib/base.js"(exports, module) {
    "use strict";
    function iladlr(M, N, A, strideA1, strideA2, offsetA) {
      var result;
      var i;
      var j;
      if (M === 0) {
        return -1;
      }
      if (A[offsetA + (M - 1) * strideA1] !== 0 || A[offsetA + (M - 1) * strideA1 + (N - 1) * strideA2] !== 0) {
        return M - 1;
      }
      result = -1;
      for (j = 0; j < N; j++) {
        i = M - 1;
        while (i >= 0 && A[offsetA + i * strideA1 + j * strideA2] === 0) {
          i -= 1;
        }
        if (i > result) {
          result = i;
        }
      }
      return result;
    }
    module.exports = iladlr;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/iladlc/lib/base.js
var require_base30 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/iladlc/lib/base.js"(exports, module) {
    "use strict";
    function iladlc(M, N, A, strideA1, strideA2, offsetA) {
      var i;
      var j;
      if (N === 0) {
        return -1;
      }
      if (A[offsetA + (N - 1) * strideA2] !== 0 || A[offsetA + (M - 1) * strideA1 + (N - 1) * strideA2] !== 0) {
        return N - 1;
      }
      for (j = N - 1; j >= 0; j--) {
        for (i = 0; i < M; i++) {
          if (A[offsetA + i * strideA1 + j * strideA2] !== 0) {
            return j;
          }
        }
      }
      return -1;
    }
    module.exports = iladlc;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlarf/lib/base.js
var require_base31 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlarf/lib/base.js"(exports, module) {
    "use strict";
    var dgemv = require_base25();
    var dger = require_base28();
    var iladlr = require_base29();
    var iladlc = require_base30();
    function dlarf(side, M, N, v, strideV, offsetV, tau, C, strideC1, strideC2, offsetC, WORK, strideWORK, offsetWORK) {
      var applyLeft;
      var lastv;
      var lastc;
      var ix;
      applyLeft = side === "left";
      lastv = 0;
      lastc = 0;
      if (tau !== 0) {
        if (applyLeft) {
          lastv = M;
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
          lastc = iladlc(lastv, N, C, strideC1, strideC2, offsetC) + 1;
        } else {
          lastc = iladlr(M, lastv, C, strideC1, strideC2, offsetC) + 1;
        }
      }
      if (applyLeft) {
        if (lastv > 0) {
          dgemv("transpose", lastv, lastc, 1, C, strideC1, strideC2, offsetC, v, strideV, offsetV, 0, WORK, strideWORK, offsetWORK);
          dger(lastv, lastc, -tau, v, strideV, offsetV, WORK, strideWORK, offsetWORK, C, strideC1, strideC2, offsetC);
        }
      } else if (lastv > 0) {
        dgemv("no-transpose", lastc, lastv, 1, C, strideC1, strideC2, offsetC, v, strideV, offsetV, 0, WORK, strideWORK, offsetWORK);
        dger(lastc, lastv, -tau, WORK, strideWORK, offsetWORK, v, strideV, offsetV, C, strideC1, strideC2, offsetC);
      }
    }
    module.exports = dlarf;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dorg2r/lib/base.js
var require_base32 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dorg2r/lib/base.js"(exports, module) {
    "use strict";
    var dlarf = require_base31();
    var dscal = require_base7();
    function dorg2r(M, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWORK, offsetWORK) {
      var i;
      var j;
      var l;
      if (N <= 0) {
        return 0;
      }
      for (j = K; j < N; j++) {
        for (l = 0; l < M; l++) {
          A[offsetA + l * strideA1 + j * strideA2] = 0;
        }
        A[offsetA + j * strideA1 + j * strideA2] = 1;
      }
      for (i = K - 1; i >= 0; i--) {
        if (i < N - 1) {
          A[offsetA + i * strideA1 + i * strideA2] = 1;
          dlarf("left", M - i, N - i - 1, A, strideA1, offsetA + i * strideA1 + i * strideA2, TAU[offsetTAU + i * strideTAU], A, strideA1, strideA2, offsetA + i * strideA1 + (i + 1) * strideA2, WORK, strideWORK, offsetWORK);
        }
        if (i < M - 1) {
          dscal(M - i - 1, -TAU[offsetTAU + i * strideTAU], A, strideA1, offsetA + (i + 1) * strideA1 + i * strideA2);
        }
        A[offsetA + i * strideA1 + i * strideA2] = 1 - TAU[offsetTAU + i * strideTAU];
        for (l = 0; l < i; l++) {
          A[offsetA + l * strideA1 + i * strideA2] = 0;
        }
      }
      return 0;
    }
    module.exports = dorg2r;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlarft/lib/base.js
var require_base33 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlarft/lib/base.js"(exports, module) {
    "use strict";
    var dgemv = require_base25();
    var dtrmv = require_base9();
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
                dgemv("transpose", jj - i - 1, i, -TAU[offsetTAU + i * strideTAU], V, strideV1, strideV2, offsetV + (i + 1) * strideV1, V, strideV1, offsetV + (i + 1) * strideV1 + i * strideV2, 1, T, strideT1, offsetT + i * strideT2);
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
                dgemv("no-transpose", i, jj - i - 1, -TAU[offsetTAU + i * strideTAU], V, strideV1, strideV2, offsetV + (i + 1) * strideV2, V, strideV2, offsetV + i * strideV1 + (i + 1) * strideV2, 1, T, strideT1, offsetT + i * strideT2);
              }
            }
            if (i > 0) {
              dtrmv("upper", "no-transpose", "non-unit", i, T, strideT1, strideT2, offsetT, T, strideT1, offsetT + i * strideT2);
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
                  dgemv("transpose", N - K + i - jj, K - i - 1, -TAU[offsetTAU + i * strideTAU], V, strideV1, strideV2, offsetV + jj * strideV1 + (i + 1) * strideV2, V, strideV1, offsetV + jj * strideV1 + i * strideV2, 1, T, strideT1, offsetT + (i + 1) * strideT1 + i * strideT2);
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
                  dgemv("no-transpose", K - i - 1, N - K + i - jj, -TAU[offsetTAU + i * strideTAU], V, strideV1, strideV2, offsetV + (i + 1) * strideV1 + jj * strideV2, V, strideV2, offsetV + i * strideV1 + jj * strideV2, 1, T, strideT1, offsetT + (i + 1) * strideT1 + i * strideT2);
                }
              }
              dtrmv("lower", "no-transpose", "non-unit", K - i - 1, T, strideT1, strideT2, offsetT + (i + 1) * strideT1 + (i + 1) * strideT2, T, strideT1, offsetT + (i + 1) * strideT1 + i * strideT2);
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
    module.exports = dlarft;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dcopy/lib/base.js
var require_base34 = __commonJS({
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

// ../../../../../private/tmp/blapack/lib/lapack/base/dlarfb/lib/base.js
var require_base35 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlarfb/lib/base.js"(exports, module) {
    "use strict";
    var dcopy = require_base34();
    var dgemm = require_base4();
    var dtrmm = require_base14();
    function dlarfb(side, trans, direct, storev, M, N, K, V, strideV1, strideV2, offsetV, T, strideT1, strideT2, offsetT, C, strideC1, strideC2, offsetC, WORK, strideWORK1, strideWORK2, offsetWORK) {
      var transt;
      var i;
      var j;
      if (M <= 0 || N <= 0) {
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
              dcopy(N, C, strideC2, offsetC + j * strideC1, WORK, strideWORK1, offsetWORK + j * strideWORK2);
            }
            dtrmm("right", "lower", "no-transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWORK1, strideWORK2, offsetWORK);
            if (M > K) {
              dgemm("transpose", "no-transpose", N, K, M - K, 1, C, strideC1, strideC2, offsetC + K * strideC1, V, strideV1, strideV2, offsetV + K * strideV1, 1, WORK, strideWORK1, strideWORK2, offsetWORK);
            }
            dtrmm("right", "upper", transt, "non-unit", N, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWORK1, strideWORK2, offsetWORK);
            if (M > K) {
              dgemm("no-transpose", "transpose", M - K, N, K, -1, V, strideV1, strideV2, offsetV + K * strideV1, WORK, strideWORK1, strideWORK2, offsetWORK, 1, C, strideC1, strideC2, offsetC + K * strideC1);
            }
            dtrmm("right", "lower", "transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWORK1, strideWORK2, offsetWORK);
            for (j = 0; j < K; j++) {
              for (i = 0; i < N; i++) {
                C[offsetC + j * strideC1 + i * strideC2] -= WORK[offsetWORK + i * strideWORK1 + j * strideWORK2];
              }
            }
          } else if (side === "right") {
            for (j = 0; j < K; j++) {
              dcopy(M, C, strideC1, offsetC + j * strideC2, WORK, strideWORK1, offsetWORK + j * strideWORK2);
            }
            dtrmm("right", "lower", "no-transpose", "unit", M, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWORK1, strideWORK2, offsetWORK);
            if (N > K) {
              dgemm("no-transpose", "no-transpose", M, K, N - K, 1, C, strideC1, strideC2, offsetC + K * strideC2, V, strideV1, strideV2, offsetV + K * strideV1, 1, WORK, strideWORK1, strideWORK2, offsetWORK);
            }
            dtrmm("right", "upper", trans, "non-unit", M, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWORK1, strideWORK2, offsetWORK);
            if (N > K) {
              dgemm("no-transpose", "transpose", M, N - K, K, -1, WORK, strideWORK1, strideWORK2, offsetWORK, V, strideV1, strideV2, offsetV + K * strideV1, 1, C, strideC1, strideC2, offsetC + K * strideC2);
            }
            dtrmm("right", "lower", "transpose", "unit", M, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWORK1, strideWORK2, offsetWORK);
            for (j = 0; j < K; j++) {
              for (i = 0; i < M; i++) {
                C[offsetC + i * strideC1 + j * strideC2] -= WORK[offsetWORK + i * strideWORK1 + j * strideWORK2];
              }
            }
          }
        } else if (side === "left") {
          for (j = 0; j < K; j++) {
            dcopy(N, C, strideC2, offsetC + (M - K + j) * strideC1, WORK, strideWORK1, offsetWORK + j * strideWORK2);
          }
          dtrmm("right", "upper", "no-transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV + (M - K) * strideV1, WORK, strideWORK1, strideWORK2, offsetWORK);
          if (M > K) {
            dgemm("transpose", "no-transpose", N, K, M - K, 1, C, strideC1, strideC2, offsetC, V, strideV1, strideV2, offsetV, 1, WORK, strideWORK1, strideWORK2, offsetWORK);
          }
          dtrmm("right", "lower", transt, "non-unit", N, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWORK1, strideWORK2, offsetWORK);
          if (M > K) {
            dgemm("no-transpose", "transpose", M - K, N, K, -1, V, strideV1, strideV2, offsetV, WORK, strideWORK1, strideWORK2, offsetWORK, 1, C, strideC1, strideC2, offsetC);
          }
          dtrmm("right", "upper", "transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV + (M - K) * strideV1, WORK, strideWORK1, strideWORK2, offsetWORK);
          for (j = 0; j < K; j++) {
            for (i = 0; i < N; i++) {
              C[offsetC + (M - K + j) * strideC1 + i * strideC2] -= WORK[offsetWORK + i * strideWORK1 + j * strideWORK2];
            }
          }
        } else if (side === "right") {
          for (j = 0; j < K; j++) {
            dcopy(M, C, strideC1, offsetC + (N - K + j) * strideC2, WORK, strideWORK1, offsetWORK + j * strideWORK2);
          }
          dtrmm("right", "upper", "no-transpose", "unit", M, K, 1, V, strideV1, strideV2, offsetV + (N - K) * strideV1, WORK, strideWORK1, strideWORK2, offsetWORK);
          if (N > K) {
            dgemm("no-transpose", "no-transpose", M, K, N - K, 1, C, strideC1, strideC2, offsetC, V, strideV1, strideV2, offsetV, 1, WORK, strideWORK1, strideWORK2, offsetWORK);
          }
          dtrmm("right", "lower", trans, "non-unit", M, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWORK1, strideWORK2, offsetWORK);
          if (N > K) {
            dgemm("no-transpose", "transpose", M, N - K, K, -1, WORK, strideWORK1, strideWORK2, offsetWORK, V, strideV1, strideV2, offsetV, 1, C, strideC1, strideC2, offsetC);
          }
          dtrmm("right", "upper", "transpose", "unit", M, K, 1, V, strideV1, strideV2, offsetV + (N - K) * strideV1, WORK, strideWORK1, strideWORK2, offsetWORK);
          for (j = 0; j < K; j++) {
            for (i = 0; i < M; i++) {
              C[offsetC + i * strideC1 + (N - K + j) * strideC2] -= WORK[offsetWORK + i * strideWORK1 + j * strideWORK2];
            }
          }
        }
      } else if (direct === "forward") {
        if (side === "left") {
          for (j = 0; j < K; j++) {
            dcopy(N, C, strideC2, offsetC + j * strideC1, WORK, strideWORK1, offsetWORK + j * strideWORK2);
          }
          dtrmm("right", "upper", "transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWORK1, strideWORK2, offsetWORK);
          if (M > K) {
            dgemm("transpose", "transpose", N, K, M - K, 1, C, strideC1, strideC2, offsetC + K * strideC1, V, strideV1, strideV2, offsetV + K * strideV2, 1, WORK, strideWORK1, strideWORK2, offsetWORK);
          }
          dtrmm("right", "upper", transt, "non-unit", N, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWORK1, strideWORK2, offsetWORK);
          if (M > K) {
            dgemm("transpose", "transpose", M - K, N, K, -1, V, strideV1, strideV2, offsetV + K * strideV2, WORK, strideWORK1, strideWORK2, offsetWORK, 1, C, strideC1, strideC2, offsetC + K * strideC1);
          }
          dtrmm("right", "upper", "no-transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWORK1, strideWORK2, offsetWORK);
          for (j = 0; j < K; j++) {
            for (i = 0; i < N; i++) {
              C[offsetC + j * strideC1 + i * strideC2] -= WORK[offsetWORK + i * strideWORK1 + j * strideWORK2];
            }
          }
        } else if (side === "right") {
          for (j = 0; j < K; j++) {
            dcopy(M, C, strideC1, offsetC + j * strideC2, WORK, strideWORK1, offsetWORK + j * strideWORK2);
          }
          dtrmm("right", "upper", "transpose", "unit", M, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWORK1, strideWORK2, offsetWORK);
          if (N > K) {
            dgemm("no-transpose", "transpose", M, K, N - K, 1, C, strideC1, strideC2, offsetC + K * strideC2, V, strideV1, strideV2, offsetV + K * strideV2, 1, WORK, strideWORK1, strideWORK2, offsetWORK);
          }
          dtrmm("right", "upper", trans, "non-unit", M, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWORK1, strideWORK2, offsetWORK);
          if (N > K) {
            dgemm("no-transpose", "no-transpose", M, N - K, K, -1, WORK, strideWORK1, strideWORK2, offsetWORK, V, strideV1, strideV2, offsetV + K * strideV2, 1, C, strideC1, strideC2, offsetC + K * strideC2);
          }
          dtrmm("right", "upper", "no-transpose", "unit", M, K, 1, V, strideV1, strideV2, offsetV, WORK, strideWORK1, strideWORK2, offsetWORK);
          for (j = 0; j < K; j++) {
            for (i = 0; i < M; i++) {
              C[offsetC + i * strideC1 + j * strideC2] -= WORK[offsetWORK + i * strideWORK1 + j * strideWORK2];
            }
          }
        }
      } else if (side === "left") {
        for (j = 0; j < K; j++) {
          dcopy(N, C, strideC2, offsetC + (M - K + j) * strideC1, WORK, strideWORK1, offsetWORK + j * strideWORK2);
        }
        dtrmm("right", "lower", "transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV + (M - K) * strideV2, WORK, strideWORK1, strideWORK2, offsetWORK);
        if (M > K) {
          dgemm("transpose", "transpose", N, K, M - K, 1, C, strideC1, strideC2, offsetC, V, strideV1, strideV2, offsetV, 1, WORK, strideWORK1, strideWORK2, offsetWORK);
        }
        dtrmm("right", "lower", transt, "non-unit", N, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWORK1, strideWORK2, offsetWORK);
        if (M > K) {
          dgemm("transpose", "transpose", M - K, N, K, -1, V, strideV1, strideV2, offsetV, WORK, strideWORK1, strideWORK2, offsetWORK, 1, C, strideC1, strideC2, offsetC);
        }
        dtrmm("right", "lower", "no-transpose", "unit", N, K, 1, V, strideV1, strideV2, offsetV + (M - K) * strideV2, WORK, strideWORK1, strideWORK2, offsetWORK);
        for (j = 0; j < K; j++) {
          for (i = 0; i < N; i++) {
            C[offsetC + (M - K + j) * strideC1 + i * strideC2] -= WORK[offsetWORK + i * strideWORK1 + j * strideWORK2];
          }
        }
      } else if (side === "right") {
        for (j = 0; j < K; j++) {
          dcopy(M, C, strideC1, offsetC + (N - K + j) * strideC2, WORK, strideWORK1, offsetWORK + j * strideWORK2);
        }
        dtrmm("right", "lower", "transpose", "unit", M, K, 1, V, strideV1, strideV2, offsetV + (N - K) * strideV2, WORK, strideWORK1, strideWORK2, offsetWORK);
        if (N > K) {
          dgemm("no-transpose", "transpose", M, K, N - K, 1, C, strideC1, strideC2, offsetC, V, strideV1, strideV2, offsetV, 1, WORK, strideWORK1, strideWORK2, offsetWORK);
        }
        dtrmm("right", "lower", trans, "non-unit", M, K, 1, T, strideT1, strideT2, offsetT, WORK, strideWORK1, strideWORK2, offsetWORK);
        if (N > K) {
          dgemm("no-transpose", "no-transpose", M, N - K, K, -1, WORK, strideWORK1, strideWORK2, offsetWORK, V, strideV1, strideV2, offsetV, 1, C, strideC1, strideC2, offsetC);
        }
        dtrmm("right", "lower", "no-transpose", "unit", M, K, 1, V, strideV1, strideV2, offsetV + (N - K) * strideV2, WORK, strideWORK1, strideWORK2, offsetWORK);
        for (j = 0; j < K; j++) {
          for (i = 0; i < M; i++) {
            C[offsetC + i * strideC1 + (N - K + j) * strideC2] -= WORK[offsetWORK + i * strideWORK1 + j * strideWORK2];
          }
        }
      }
    }
    module.exports = dlarfb;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dorgqr/lib/base.js
var require_base36 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dorgqr/lib/base.js"(exports, module) {
    "use strict";
    var Float64Array2 = require_stdlib_array_float64();
    var dorg2r = require_base32();
    var dlarft = require_base33();
    var dlarfb = require_base35();
    var NB = 32;
    function dorgqr(M, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWORK, offsetWORK) {
      var ldwork;
      var work;
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
      nb = NB;
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
        dorg2r(M - kk, N - kk, K - kk, A, strideA1, strideA2, offsetA + kk * strideA1 + kk * strideA2, TAU, strideTAU, offsetTAU + kk * strideTAU, WORK, strideWORK, offsetWORK);
      }
      if (kk > 0) {
        work = new Float64Array2(ldwork * nb);
        for (i = ki; i >= 0; i -= nb) {
          ib = Math.min(nb, K - i);
          if (i + ib < N) {
            dlarft("forward", "columnwise", M - i, ib, A, strideA1, strideA2, offsetA + i * strideA1 + i * strideA2, TAU, strideTAU, offsetTAU + i * strideTAU, work, 1, ldwork, 0);
            dlarfb("left", "no-transpose", "forward", "columnwise", M - i, N - i - ib, ib, A, strideA1, strideA2, offsetA + i * strideA1 + i * strideA2, work, 1, ldwork, 0, A, strideA1, strideA2, offsetA + i * strideA1 + (i + ib) * strideA2, work, 1, ldwork, ib);
          }
          dorg2r(M - i, ib, ib, A, strideA1, strideA2, offsetA + i * strideA1 + i * strideA2, TAU, strideTAU, offsetTAU + i * strideTAU, work, 1, 0);
          for (j = i; j < i + ib; j++) {
            for (l = 0; l < i; l++) {
              A[offsetA + l * strideA1 + j * strideA2] = 0;
            }
          }
        }
      }
      return 0;
    }
    module.exports = dorgqr;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dorg2l/lib/base.js
var require_base37 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dorg2l/lib/base.js"(exports, module) {
    "use strict";
    var dlarf = require_base31();
    var dscal = require_base7();
    function dorg2l(M, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWORK, offsetWORK) {
      var ii;
      var i;
      var j;
      var l;
      if (N <= 0) {
        return 0;
      }
      for (j = 0; j < N - K; j++) {
        for (l = 0; l < M; l++) {
          A[offsetA + l * strideA1 + j * strideA2] = 0;
        }
        A[offsetA + (M - N + j) * strideA1 + j * strideA2] = 1;
      }
      for (i = 0; i < K; i++) {
        ii = N - K + i;
        A[offsetA + (M - N + ii) * strideA1 + ii * strideA2] = 1;
        if (ii > 0) {
          dlarf("left", M - N + ii + 1, ii, A, strideA1, offsetA + ii * strideA2, TAU[offsetTAU + i * strideTAU], A, strideA1, strideA2, offsetA, WORK, strideWORK, offsetWORK);
        }
        if (M - N + ii > 0) {
          dscal(M - N + ii, -TAU[offsetTAU + i * strideTAU], A, strideA1, offsetA + ii * strideA2);
        }
        A[offsetA + (M - N + ii) * strideA1 + ii * strideA2] = 1 - TAU[offsetTAU + i * strideTAU];
        for (l = M - N + ii + 1; l < M; l++) {
          A[offsetA + l * strideA1 + ii * strideA2] = 0;
        }
      }
      return 0;
    }
    module.exports = dorg2l;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dorgql/lib/base.js
var require_base38 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dorgql/lib/base.js"(exports, module) {
    "use strict";
    var Float64Array2 = require_stdlib_array_float64();
    var dorg2l = require_base37();
    var dlarft = require_base33();
    var dlarfb = require_base35();
    var NB = 32;
    function dorgql(M, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWORK, offsetWORK) {
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
      nb = NB;
      ldwork = N;
      if (nb >= 2 && nb < K) {
        kk = Math.min(K, Math.floor((K + nb - 1) / nb) * nb);
        for (j = 0; j < N - kk; j++) {
          for (i = M - kk; i < M; i++) {
            A[offsetA + i * strideA1 + j * strideA2] = 0;
          }
        }
      } else {
        kk = 0;
      }
      dorg2l(M - kk, N - kk, K - kk, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWORK, offsetWORK);
      if (kk > 0) {
        work = new Float64Array2(ldwork * nb);
        for (i = K - kk; i < K; i += nb) {
          ib = Math.min(nb, K - i);
          if (N - K + i > 0) {
            dlarft("backward", "columnwise", M - K + i + ib, ib, A, strideA1, strideA2, offsetA + (N - K + i) * strideA2, TAU, strideTAU, offsetTAU + i * strideTAU, work, 1, ldwork, 0);
            dlarfb("left", "no-transpose", "backward", "columnwise", M - K + i + ib, N - K + i, ib, A, strideA1, strideA2, offsetA + (N - K + i) * strideA2, work, 1, ldwork, 0, A, strideA1, strideA2, offsetA, work, 1, ldwork, ib);
          }
          dorg2l(M - K + i + ib, ib, ib, A, strideA1, strideA2, offsetA + (N - K + i) * strideA2, TAU, strideTAU, offsetTAU + i * strideTAU, work, 1, 0);
          for (j = N - K + i; j < N - K + i + ib; j++) {
            for (l = M - K + i + ib; l < M; l++) {
              A[offsetA + l * strideA1 + j * strideA2] = 0;
            }
          }
        }
      }
      return 0;
    }
    module.exports = dorgql;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dorgtr/lib/base.js
var require_base39 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dorgtr/lib/base.js"(exports, module) {
    "use strict";
    var dorgqr = require_base36();
    var dorgql = require_base38();
    function dorgtr(uplo, N, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWORK, offsetWORK) {
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
          dorgql(N - 1, N - 1, N - 1, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, WORK, strideWORK, offsetWORK);
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
          dorgqr(N - 1, N - 1, N - 1, A, strideA1, strideA2, pa, TAU, strideTAU, offsetTAU, WORK, strideWORK, offsetWORK);
        }
      }
      return 0;
    }
    module.exports = dorgtr;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlacpy/lib/base.js
var require_base40 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlacpy/lib/base.js"(exports, module) {
    "use strict";
    function dlacpy(uplo, M, N, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB) {
      var da0;
      var db0;
      var i;
      var j;
      if (uplo === "upper") {
        for (j = 0; j < N; j++) {
          da0 = offsetA + j * strideA2;
          db0 = offsetB + j * strideB2;
          for (i = 0; i <= j && i < M; i++) {
            B[db0 + i * strideB1] = A[da0 + i * strideA1];
          }
        }
      } else if (uplo === "lower") {
        for (j = 0; j < N; j++) {
          da0 = offsetA + j * strideA2;
          db0 = offsetB + j * strideB2;
          for (i = j; i < M; i++) {
            B[db0 + i * strideB1] = A[da0 + i * strideA1];
          }
        }
      } else {
        for (j = 0; j < N; j++) {
          da0 = offsetA + j * strideA2;
          db0 = offsetB + j * strideB2;
          for (i = 0; i < M; i++) {
            B[db0 + i * strideB1] = A[da0 + i * strideA1];
          }
        }
      }
      return B;
    }
    module.exports = dlacpy;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlanst/lib/base.js
var require_base41 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlanst/lib/base.js"(exports, module) {
    "use strict";
    var dlassq = require_base17();
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
          out = dlassq(N - 1, e, strideE, offsetE, 0, 1);
          sum = 2 * out.sumsq;
        } else {
          sum = 1;
        }
        if (N > 1) {
          out = dlassq(N, d, strideD, offsetD, out.scl, sum);
        } else {
          out = dlassq(N, d, strideD, offsetD, 0, 1);
        }
        anorm = out.scl * Math.sqrt(out.sumsq);
      }
      return anorm;
    }
    module.exports = dlanst;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlae2/lib/base.js
var require_base42 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlae2/lib/base.js"(exports, module) {
    "use strict";
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
    module.exports = dlae2;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlaev2/lib/base.js
var require_base43 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlaev2/lib/base.js"(exports, module) {
    "use strict";
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
    module.exports = dlaev2;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlartg/lib/base.js
var require_base44 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlartg/lib/base.js"(exports, module) {
    "use strict";
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
    module.exports = dlartg;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlascl/lib/base.js
var require_base45 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlascl/lib/base.js"(exports, module) {
    "use strict";
    var dlamch = require_base16();
    function dlascl(type, kl, ku, cfrom, cto, M, N, A, strideA1, strideA2, offsetA) {
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
      if (N === 0 || M === 0) {
        return 0;
      }
      smlnum = dlamch("safe-minimum");
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
            for (i = 0; i < M; i++) {
              ai = offsetA + i * strideA1 + j * strideA2;
              A[ai] *= mul;
            }
          }
        } else if (itype === 1) {
          for (j = 0; j < N; j++) {
            for (i = j; i < M; i++) {
              ai = offsetA + i * strideA1 + j * strideA2;
              A[ai] *= mul;
            }
          }
        } else if (itype === 2) {
          for (j = 0; j < N; j++) {
            iMax = Math.min(j + 1, M);
            for (i = 0; i < iMax; i++) {
              ai = offsetA + i * strideA1 + j * strideA2;
              A[ai] *= mul;
            }
          }
        } else if (itype === 3) {
          for (j = 0; j < N; j++) {
            iMax = Math.min(j + 2, M);
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
          k4 = kl + ku + 1 + M;
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
    module.exports = dlascl;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlaset/lib/base.js
var require_base46 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlaset/lib/base.js"(exports, module) {
    "use strict";
    function dlaset(uplo, M, N, alpha, beta, A, strideA1, strideA2, offsetA) {
      var idx;
      var mn;
      var i;
      var j;
      mn = Math.min(M, N);
      if (uplo === "upper") {
        for (j = 1; j < N; j++) {
          idx = offsetA + j * strideA2;
          for (i = 0; i < Math.min(j, M); i++) {
            A[idx] = alpha;
            idx += strideA1;
          }
        }
      } else if (uplo === "lower") {
        for (j = 0; j < mn; j++) {
          idx = offsetA + (j + 1) * strideA1 + j * strideA2;
          for (i = j + 1; i < M; i++) {
            A[idx] = alpha;
            idx += strideA1;
          }
        }
      } else {
        for (j = 0; j < N; j++) {
          idx = offsetA + j * strideA2;
          for (i = 0; i < M; i++) {
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
    module.exports = dlaset;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlasr/lib/base.js
var require_base47 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlasr/lib/base.js"(exports, module) {
    "use strict";
    function dlasr(side, pivot, direct, M, N, c, strideC, offsetC, s, strideS, offsetS, A, strideA1, strideA2, offsetA) {
      var ctemp;
      var stemp;
      var temp;
      var idx1;
      var idx2;
      var i;
      var j;
      if (M === 0 || N === 0) {
        return A;
      }
      if (side === "left") {
        if (pivot === "variable") {
          if (direct === "forward") {
            for (j = 0; j < M - 1; j++) {
              ctemp = c[offsetC + j * strideC];
              stemp = s[offsetS + j * strideS];
              if (ctemp !== 1 || stemp !== 0) {
                for (i = 0; i < N; i++) {
                  idx1 = offsetA + (j + 1) * strideA1 + i * strideA2;
                  idx2 = offsetA + j * strideA1 + i * strideA2;
                  temp = A[idx1];
                  A[idx1] = ctemp * temp - stemp * A[idx2];
                  A[idx2] = stemp * temp + ctemp * A[idx2];
                }
              }
            }
          } else {
            for (j = M - 2; j >= 0; j--) {
              ctemp = c[offsetC + j * strideC];
              stemp = s[offsetS + j * strideS];
              if (ctemp !== 1 || stemp !== 0) {
                for (i = 0; i < N; i++) {
                  idx1 = offsetA + (j + 1) * strideA1 + i * strideA2;
                  idx2 = offsetA + j * strideA1 + i * strideA2;
                  temp = A[idx1];
                  A[idx1] = ctemp * temp - stemp * A[idx2];
                  A[idx2] = stemp * temp + ctemp * A[idx2];
                }
              }
            }
          }
        } else if (pivot === "top") {
          if (direct === "forward") {
            for (j = 1; j < M; j++) {
              ctemp = c[offsetC + (j - 1) * strideC];
              stemp = s[offsetS + (j - 1) * strideS];
              if (ctemp !== 1 || stemp !== 0) {
                for (i = 0; i < N; i++) {
                  idx1 = offsetA + j * strideA1 + i * strideA2;
                  idx2 = offsetA + i * strideA2;
                  temp = A[idx1];
                  A[idx1] = ctemp * temp - stemp * A[idx2];
                  A[idx2] = stemp * temp + ctemp * A[idx2];
                }
              }
            }
          } else {
            for (j = M - 1; j >= 1; j--) {
              ctemp = c[offsetC + (j - 1) * strideC];
              stemp = s[offsetS + (j - 1) * strideS];
              if (ctemp !== 1 || stemp !== 0) {
                for (i = 0; i < N; i++) {
                  idx1 = offsetA + j * strideA1 + i * strideA2;
                  idx2 = offsetA + i * strideA2;
                  temp = A[idx1];
                  A[idx1] = ctemp * temp - stemp * A[idx2];
                  A[idx2] = stemp * temp + ctemp * A[idx2];
                }
              }
            }
          }
        } else if (pivot === "bottom") {
          if (direct === "forward") {
            for (j = 0; j < M - 1; j++) {
              ctemp = c[offsetC + j * strideC];
              stemp = s[offsetS + j * strideS];
              if (ctemp !== 1 || stemp !== 0) {
                for (i = 0; i < N; i++) {
                  idx1 = offsetA + j * strideA1 + i * strideA2;
                  idx2 = offsetA + (M - 1) * strideA1 + i * strideA2;
                  temp = A[idx1];
                  A[idx1] = stemp * A[idx2] + ctemp * temp;
                  A[idx2] = ctemp * A[idx2] - stemp * temp;
                }
              }
            }
          } else {
            for (j = M - 2; j >= 0; j--) {
              ctemp = c[offsetC + j * strideC];
              stemp = s[offsetS + j * strideS];
              if (ctemp !== 1 || stemp !== 0) {
                for (i = 0; i < N; i++) {
                  idx1 = offsetA + j * strideA1 + i * strideA2;
                  idx2 = offsetA + (M - 1) * strideA1 + i * strideA2;
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
                for (i = 0; i < M; i++) {
                  idx1 = offsetA + i * strideA1 + (j + 1) * strideA2;
                  idx2 = offsetA + i * strideA1 + j * strideA2;
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
                for (i = 0; i < M; i++) {
                  idx1 = offsetA + i * strideA1 + (j + 1) * strideA2;
                  idx2 = offsetA + i * strideA1 + j * strideA2;
                  temp = A[idx1];
                  A[idx1] = ctemp * temp - stemp * A[idx2];
                  A[idx2] = stemp * temp + ctemp * A[idx2];
                }
              }
            }
          }
        } else if (pivot === "top") {
          if (direct === "forward") {
            for (j = 1; j < N; j++) {
              ctemp = c[offsetC + (j - 1) * strideC];
              stemp = s[offsetS + (j - 1) * strideS];
              if (ctemp !== 1 || stemp !== 0) {
                for (i = 0; i < M; i++) {
                  idx1 = offsetA + i * strideA1 + j * strideA2;
                  idx2 = offsetA + i * strideA1;
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
                for (i = 0; i < M; i++) {
                  idx1 = offsetA + i * strideA1 + j * strideA2;
                  idx2 = offsetA + i * strideA1;
                  temp = A[idx1];
                  A[idx1] = ctemp * temp - stemp * A[idx2];
                  A[idx2] = stemp * temp + ctemp * A[idx2];
                }
              }
            }
          }
        } else if (pivot === "bottom") {
          if (direct === "forward") {
            for (j = 0; j < N - 1; j++) {
              ctemp = c[offsetC + j * strideC];
              stemp = s[offsetS + j * strideS];
              if (ctemp !== 1 || stemp !== 0) {
                for (i = 0; i < M; i++) {
                  idx1 = offsetA + i * strideA1 + j * strideA2;
                  idx2 = offsetA + i * strideA1 + (N - 1) * strideA2;
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
                for (i = 0; i < M; i++) {
                  idx1 = offsetA + i * strideA1 + j * strideA2;
                  idx2 = offsetA + i * strideA1 + (N - 1) * strideA2;
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
    module.exports = dlasr;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlasrt/lib/base.js
var require_base48 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlasrt/lib/base.js"(exports, module) {
    "use strict";
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
    module.exports = dlasrt;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/dswap/lib/base.js
var require_base49 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/dswap/lib/base.js"(exports, module) {
    "use strict";
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
    module.exports = dswap;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dsteqr/lib/base.js
var require_base50 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dsteqr/lib/base.js"(exports, module) {
    "use strict";
    var Float64Array2 = require_stdlib_array_float64();
    var dlamch = require_base16();
    var dlanst = require_base41();
    var dlapy2 = require_base20();
    var dlae2 = require_base42();
    var dlaev2 = require_base43();
    var dlartg = require_base44();
    var dlascl = require_base45();
    var dlaset = require_base46();
    var dlasr = require_base47();
    var dlasrt = require_base48();
    var dswap = require_base49();
    var MAXIT = 30;
    function dsteqr(compz, N, d, strideD, offsetD, e, strideE, offsetE, Z, strideZ1, strideZ2, offsetZ, WORK, strideWORK, offsetWORK) {
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
      rot = new Float64Array2(3);
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
      eps = dlamch("epsilon");
      eps2 = eps * eps;
      safmin = dlamch("safe-minimum");
      safmax = 1 / safmin;
      ssfmax = Math.sqrt(safmax) / 3;
      ssfmin = Math.sqrt(safmin) / eps2;
      if (icompz === 2) {
        dlaset("Full", N, N, 0, 1, Z, strideZ1, strideZ2, offsetZ);
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
        anorm = dlanst("max", lend - l + 1, d, strideD, offsetD + l * strideD, e, strideE, offsetE + l * strideE);
        iscale = 0;
        if (anorm === 0) {
          continue;
        }
        if (anorm > ssfmax) {
          iscale = 1;
          dlascl("general", 0, 0, anorm, ssfmax, lend - l + 1, 1, d, strideD, 0, offsetD + l * strideD);
          dlascl("general", 0, 0, anorm, ssfmax, lend - l, 1, e, strideE, 0, offsetE + l * strideE);
        } else if (anorm < ssfmin) {
          iscale = 2;
          dlascl("general", 0, 0, anorm, ssfmin, lend - l + 1, 1, d, strideD, 0, offsetD + l * strideD);
          dlascl("general", 0, 0, anorm, ssfmin, lend - l, 1, e, strideE, 0, offsetE + l * strideE);
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
                obj = dlaev2(d[offsetD + l * strideD], e[offsetE + l * strideE], d[offsetD + (l + 1) * strideD]);
                WORK[offsetWORK + l * strideWORK] = obj.cs1;
                WORK[offsetWORK + (N - 1 + l) * strideWORK] = obj.sn1;
                dlasr("right", "variable", "backward", N, 2, WORK, strideWORK, offsetWORK + l * strideWORK, WORK, strideWORK, offsetWORK + (N - 1 + l) * strideWORK, Z, strideZ1, strideZ2, offsetZ + l * strideZ2);
                d[offsetD + l * strideD] = obj.rt1;
                d[offsetD + (l + 1) * strideD] = obj.rt2;
              } else {
                obj = dlae2(d[offsetD + l * strideD], e[offsetE + l * strideE], d[offsetD + (l + 1) * strideD]);
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
            r = dlapy2(g, 1);
            g = d[offsetD + m * strideD] - p + e[offsetE + l * strideE] / (g + (Math.abs(g) * (Math.sign(g) || 1) > 0 ? r : -r));
            s = 1;
            c = 1;
            p = 0;
            for (i = m - 1; i >= l; i--) {
              f = s * e[offsetE + i * strideE];
              b = c * e[offsetE + i * strideE];
              dlartg(g, f, rot);
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
                WORK[offsetWORK + i * strideWORK] = c;
                WORK[offsetWORK + (N - 1 + i) * strideWORK] = -s;
              }
            }
            if (icompz > 0) {
              mm = m - l + 1;
              dlasr("right", "variable", "backward", N, mm, WORK, strideWORK, offsetWORK + l * strideWORK, WORK, strideWORK, offsetWORK + (N - 1 + l) * strideWORK, Z, strideZ1, strideZ2, offsetZ + l * strideZ2);
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
                obj = dlaev2(d[offsetD + (l - 1) * strideD], e[offsetE + (l - 1) * strideE], d[offsetD + l * strideD]);
                WORK[offsetWORK + m * strideWORK] = obj.cs1;
                WORK[offsetWORK + (N - 1 + m) * strideWORK] = obj.sn1;
                dlasr("right", "variable", "forward", N, 2, WORK, strideWORK, offsetWORK + m * strideWORK, WORK, strideWORK, offsetWORK + (N - 1 + m) * strideWORK, Z, strideZ1, strideZ2, offsetZ + (l - 1) * strideZ2);
                d[offsetD + (l - 1) * strideD] = obj.rt1;
                d[offsetD + l * strideD] = obj.rt2;
              } else {
                obj = dlae2(d[offsetD + (l - 1) * strideD], e[offsetE + (l - 1) * strideE], d[offsetD + l * strideD]);
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
            r = dlapy2(g, 1);
            g = d[offsetD + m * strideD] - p + e[offsetE + (l - 1) * strideE] / (g + (Math.abs(g) * (Math.sign(g) || 1) > 0 ? r : -r));
            s = 1;
            c = 1;
            p = 0;
            for (i = m; i <= l - 1; i++) {
              f = s * e[offsetE + i * strideE];
              b = c * e[offsetE + i * strideE];
              dlartg(g, f, rot);
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
                WORK[offsetWORK + i * strideWORK] = c;
                WORK[offsetWORK + (N - 1 + i) * strideWORK] = s;
              }
            }
            if (icompz > 0) {
              mm = l - m + 1;
              dlasr("right", "variable", "forward", N, mm, WORK, strideWORK, offsetWORK + m * strideWORK, WORK, strideWORK, offsetWORK + (N - 1 + m) * strideWORK, Z, strideZ1, strideZ2, offsetZ + m * strideZ2);
            }
            d[offsetD + l * strideD] -= p;
            e[offsetE + (l - 1) * strideE] = g;
          }
        }
        if (iscale === 1) {
          dlascl("general", 0, 0, ssfmax, anorm, lendsv - lsv + 1, 1, d, strideD, 0, offsetD + lsv * strideD);
          dlascl("general", 0, 0, ssfmax, anorm, lendsv - lsv, 1, e, strideE, 0, offsetE + lsv * strideE);
        } else if (iscale === 2) {
          dlascl("general", 0, 0, ssfmin, anorm, lendsv - lsv + 1, 1, d, strideD, 0, offsetD + lsv * strideD);
          dlascl("general", 0, 0, ssfmin, anorm, lendsv - lsv, 1, e, strideE, 0, offsetE + lsv * strideE);
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
        dlasrt("increasing", N, d, strideD, offsetD);
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
            dswap(N, Z, strideZ1, offsetZ + i * strideZ2, Z, strideZ1, offsetZ + k * strideZ2);
          }
        }
      }
      return 0;
    }
    module.exports = dsteqr;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dsterf/lib/base.js
var require_base51 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dsterf/lib/base.js"(exports, module) {
    "use strict";
    var dlamch = require_base16();
    var dlanst = require_base41();
    var dlapy2 = require_base20();
    var dlae2 = require_base42();
    var dlascl = require_base45();
    var dlasrt = require_base48();
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
      eps = dlamch("epsilon");
      eps2 = eps * eps;
      safmin = dlamch("safe-minimum");
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
        anorm = dlanst("max", lend - l + 1, d, strideD, offsetD + l * strideD, e, strideE, offsetE + l * strideE);
        iscale = 0;
        if (anorm === 0) {
          continue;
        }
        if (anorm > ssfmax) {
          iscale = 1;
          dlascl("general", 0, 0, anorm, ssfmax, lend - l + 1, 1, d, 1, strideD, offsetD + l * strideD);
          dlascl("general", 0, 0, anorm, ssfmax, lend - l, 1, e, 1, strideE, offsetE + l * strideE);
        } else if (anorm < ssfmin) {
          iscale = 2;
          dlascl("general", 0, 0, anorm, ssfmin, lend - l + 1, 1, d, 1, strideD, offsetD + l * strideD);
          dlascl("general", 0, 0, anorm, ssfmin, lend - l, 1, e, 1, strideE, offsetE + l * strideE);
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
              rt = dlae2(d[offsetD + l * strideD], rte, d[offsetD + (l + 1) * strideD]);
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
            r = dlapy2(sigma, 1);
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
              rt = dlae2(d[offsetD + l * strideD], rte, d[offsetD + (l - 1) * strideD]);
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
            r = dlapy2(sigma, 1);
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
          dlascl("general", 0, 0, ssfmax, anorm, lendsv - lsv + 1, 1, d, 1, strideD, offsetD + lsv * strideD);
        }
        if (iscale === 2) {
          dlascl("general", 0, 0, ssfmin, anorm, lendsv - lsv + 1, 1, d, 1, strideD, offsetD + lsv * strideD);
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
      dlasrt("increasing", N, d, strideD, offsetD);
      return info;
    }
    module.exports = dsterf;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlaebz/lib/base.js
var require_base52 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlaebz/lib/base.js"(exports, module) {
    "use strict";
    var abs = Math.abs;
    var min = Math.min;
    var max = Math.max;
    function dlaebz(ijob, nitmax, N, mmax, minp, nbmin, abstol, reltol, pivmin, d, strideD, offsetD, e, strideE, offsetE, E2, strideE2, offsetE2, NVAL, strideNVAL, offsetNVAL, AB, strideAB1, strideAB2, offsetAB, c, strideC, offsetC, mout, NAB, strideNAB1, strideNAB2, offsetNAB, WORK, strideWORK, offsetWORK, IWORK, strideIWORK, offsetIWORK) {
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
            WORK[offsetWORK + ji * strideWORK] = d[offsetD] - c[offsetC + ji * strideC];
            IWORK[offsetIWORK + ji * strideIWORK] = 0;
            if (WORK[offsetWORK + ji * strideWORK] <= pivmin) {
              IWORK[offsetIWORK + ji * strideIWORK] = 1;
              WORK[offsetWORK + ji * strideWORK] = min(WORK[offsetWORK + ji * strideWORK], -pivmin);
            }
            for (j = 1; j < N; j++) {
              WORK[offsetWORK + ji * strideWORK] = d[offsetD + j * strideD] - E2[offsetE2 + (j - 1) * strideE2] / WORK[offsetWORK + ji * strideWORK] - c[offsetC + ji * strideC];
              if (WORK[offsetWORK + ji * strideWORK] <= pivmin) {
                IWORK[offsetIWORK + ji * strideIWORK] += 1;
                WORK[offsetWORK + ji * strideWORK] = min(WORK[offsetWORK + ji * strideWORK], -pivmin);
              }
            }
          }
          if (ijob <= 2) {
            klnew = kl;
            for (ji = kf; ji < kl; ji++) {
              IWORK[offsetIWORK + ji * strideIWORK] = min(NAB[offsetNAB + ji * strideNAB1 + strideNAB2], max(NAB[offsetNAB + ji * strideNAB1], IWORK[offsetIWORK + ji * strideIWORK]));
              if (IWORK[offsetIWORK + ji * strideIWORK] === NAB[offsetNAB + ji * strideNAB1 + strideNAB2]) {
                AB[offsetAB + ji * strideAB1 + strideAB2] = c[offsetC + ji * strideC];
              } else if (IWORK[offsetIWORK + ji * strideIWORK] === NAB[offsetNAB + ji * strideNAB1]) {
                AB[offsetAB + ji * strideAB1] = c[offsetC + ji * strideC];
              } else {
                klnew += 1;
                if (klnew <= mmax) {
                  AB[offsetAB + (klnew - 1) * strideAB1 + strideAB2] = AB[offsetAB + ji * strideAB1 + strideAB2];
                  NAB[offsetNAB + (klnew - 1) * strideNAB1 + strideNAB2] = NAB[offsetNAB + ji * strideNAB1 + strideNAB2];
                  AB[offsetAB + (klnew - 1) * strideAB1] = c[offsetC + ji * strideC];
                  NAB[offsetNAB + (klnew - 1) * strideNAB1] = IWORK[offsetIWORK + ji * strideIWORK];
                  AB[offsetAB + ji * strideAB1 + strideAB2] = c[offsetC + ji * strideC];
                  NAB[offsetNAB + ji * strideNAB1 + strideNAB2] = IWORK[offsetIWORK + ji * strideIWORK];
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
              if (IWORK[offsetIWORK + ji * strideIWORK] <= NVAL[offsetNVAL + ji * strideNVAL]) {
                AB[offsetAB + ji * strideAB1] = c[offsetC + ji * strideC];
                NAB[offsetNAB + ji * strideNAB1] = IWORK[offsetIWORK + ji * strideIWORK];
              }
              if (IWORK[offsetIWORK + ji * strideIWORK] >= NVAL[offsetNVAL + ji * strideNVAL]) {
                AB[offsetAB + ji * strideAB1 + strideAB2] = c[offsetC + ji * strideC];
                NAB[offsetNAB + ji * strideNAB1 + strideNAB2] = IWORK[offsetIWORK + ji * strideIWORK];
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
    module.exports = dlaebz;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dstebz/lib/base.js
var require_base53 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dstebz/lib/base.js"(exports, module) {
    "use strict";
    var Float64Array2 = require_stdlib_array_float64();
    var Int32Array2 = require_stdlib_array_int32();
    var dlaebz = require_base52();
    var dlamch = require_base16();
    var abs = Math.abs;
    var min = Math.min;
    var max = Math.max;
    var log = Math.log;
    var sqrt = Math.sqrt;
    var floor = Math.floor;
    var ZERO = 0;
    var ONE = 1;
    var TWO = 2;
    var HALF = 0.5;
    var FUDGE = 2.1;
    var RELFAC = 2;
    function dstebz(range, order, N, vl, vu, il, iu, abstol, d, strideD, offsetD, e, strideE, offsetE, M, nsplit, w, strideW, offsetW, IBLOCK, strideIBLOCK, offsetIBLOCK, ISPLIT, strideISPLIT, offsetISPLIT, WORK, strideWORK, offsetWORK, IWORK, strideIWORK, offsetIWORK) {
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
      } else if (irange === 3 && (il < 1 || il > max(1, N))) {
        info = -6;
      } else if (irange === 3 && (iu < min(N, il) || iu > N)) {
        info = -7;
      }
      if (info !== 0) {
        return info;
      }
      info = 0;
      ncnvrg = false;
      toofew = false;
      m = 0;
      M[0] = 0;
      if (N === 0) {
        return info;
      }
      if (irange === 3 && il === 1 && iu === N) {
        irange = 1;
      }
      safemn = dlamch("safe-minimum");
      ulp = dlamch("precision");
      rtoli = ulp * RELFAC;
      nb = 0;
      if (N === 1) {
        nsplit[0] = 1;
        ISPLIT[offsetISPLIT] = 1;
        if (irange === 2 && (vl >= d[offsetD] || vu < d[offsetD])) {
          M[0] = 0;
        } else {
          w[offsetW] = d[offsetD];
          IBLOCK[offsetIBLOCK] = 1;
          M[0] = 1;
        }
        return info;
      }
      nsp = 1;
      WORK[offsetWORK + (N - 1) * strideWORK] = ZERO;
      pivmin = ONE;
      for (j = 1; j < N; j++) {
        tmp1 = e[offsetE + (j - 1) * strideE] * e[offsetE + (j - 1) * strideE];
        if (abs(d[offsetD + j * strideD] * d[offsetD + (j - 1) * strideD]) * ulp * ulp + safemn > tmp1) {
          ISPLIT[offsetISPLIT + (nsp - 1) * strideISPLIT] = j;
          nsp += 1;
          WORK[offsetWORK + (j - 1) * strideWORK] = ZERO;
        } else {
          WORK[offsetWORK + (j - 1) * strideWORK] = tmp1;
          pivmin = max(pivmin, tmp1);
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
          tmp2 = sqrt(WORK[offsetWORK + j * strideWORK]);
          gu = max(gu, d[offsetD + j * strideD] + tmp1 + tmp2);
          gl = min(gl, d[offsetD + j * strideD] - tmp1 - tmp2);
          tmp1 = tmp2;
        }
        gu = max(gu, d[offsetD + (N - 1) * strideD] + tmp1);
        gl = min(gl, d[offsetD + (N - 1) * strideD] - tmp1);
        tnorm = max(abs(gl), abs(gu));
        gl = gl - FUDGE * tnorm * ulp * N - FUDGE * TWO * pivmin;
        gu = gu + FUDGE * tnorm * ulp * N + FUDGE * pivmin;
        itmax = floor((log(tnorm + pivmin) - log(pivmin)) / log(TWO)) + 2;
        if (abstol <= ZERO) {
          atoli = ulp * tnorm;
        } else {
          atoli = abstol;
        }
        abWork = new Float64Array2(4);
        nabWork = new Int32Array2(4);
        cWork = new Float64Array2(2);
        var nvalWork = new Int32Array2(2);
        wScratch = new Float64Array2(2);
        iwScratch = new Int32Array2(2);
        mout = new Int32Array2(1);
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
        iinfo = dlaebz(3, itmax, N, 2, 2, nb, atoli, rtoli, pivmin, d, strideD, offsetD, e, strideE, offsetE, WORK, strideWORK, offsetWORK, nvalWork, 1, 0, abWork, 1, 2, 0, cWork, 1, 0, mout, nabWork, 1, 2, 0, wScratch, 1, 0, iwScratch, 1, 0);
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
          M[0] = m;
          return info;
        }
      } else {
        tnorm = max(abs(d[offsetD]) + abs(e[offsetE]), abs(d[offsetD + (N - 1) * strideD]) + abs(e[offsetE + (N - 2) * strideE]));
        for (j = 1; j < N - 1; j++) {
          tnorm = max(tnorm, abs(d[offsetD + j * strideD]) + abs(e[offsetE + (j - 1) * strideE]) + abs(e[offsetE + j * strideE]));
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
      mout = new Int32Array2(1);
      idumma = new Int32Array2(1);
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
            tmp2 = abs(e[offsetE + j * strideE]);
            gu = max(gu, d[offsetD + j * strideD] + tmp1 + tmp2);
            gl = min(gl, d[offsetD + j * strideD] - tmp1 - tmp2);
            tmp1 = tmp2;
          }
          gu = max(gu, d[offsetD + (iend - 1) * strideD] + tmp1);
          gl = min(gl, d[offsetD + (iend - 1) * strideD] - tmp1);
          bnorm = max(abs(gl), abs(gu));
          gl = gl - FUDGE * bnorm * ulp * in_ - FUDGE * pivmin;
          gu = gu + FUDGE * bnorm * ulp * in_ + FUDGE * pivmin;
          if (abstol <= ZERO) {
            atoli = ulp * max(abs(gl), abs(gu));
          } else {
            atoli = abstol;
          }
          if (irange > 1) {
            if (gu < wl) {
              nwl += in_;
              nwu += in_;
              continue;
            }
            gl = max(gl, wl);
            gu = min(gu, wu);
            if (gl >= gu) {
              continue;
            }
          }
          abWork = new Float64Array2(in_ * 2);
          nabWork = new Int32Array2(in_ * 2);
          cWork = new Float64Array2(in_);
          wScratch = new Float64Array2(in_);
          iwScratch = new Int32Array2(in_);
          abWork[0] = gl;
          abWork[in_] = gu;
          iinfo = dlaebz(1, 0, in_, in_, 1, nb, atoli, rtoli, pivmin, d, strideD, offsetD + ibegin * strideD, e, strideE, offsetE + ibegin * strideE, WORK, strideWORK, offsetWORK + ibegin * strideWORK, idumma, 1, 0, abWork, 1, in_, 0, cWork, 1, 0, mout, nabWork, 1, in_, 0, wScratch, 1, 0, iwScratch, 1, 0);
          nwl += nabWork[0];
          nwu += nabWork[in_];
          iwoff = m - nabWork[0];
          im = mout[0];
          itmax = floor((log(gu - gl + pivmin) - log(pivmin)) / log(TWO)) + 2;
          iinfo = dlaebz(2, itmax, in_, in_, 1, nb, atoli, rtoli, pivmin, d, strideD, offsetD + ibegin * strideD, e, strideE, offsetE + ibegin * strideE, WORK, strideWORK, offsetWORK + ibegin * strideWORK, idumma, 1, 0, abWork, 1, in_, 0, cWork, 1, 0, mout, nabWork, 1, in_, 0, wScratch, 1, 0, iwScratch, 1, 0);
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
      M[0] = m;
      info = 0;
      if (ncnvrg) {
        info += 1;
      }
      if (toofew) {
        info += 2;
      }
      return info;
    }
    module.exports = dstebz;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlaruv/lib/base.js
var require_base54 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlaruv/lib/base.js"(exports, module) {
    "use strict";
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
    module.exports = dlaruv;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlarnv/lib/base.js
var require_base55 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlarnv/lib/base.js"(exports, module) {
    "use strict";
    var Float64Array2 = require_stdlib_array_float64();
    var dlaruv = require_base54();
    var LV = 128;
    var TWOPI = 6.283185307179586;
    function dlarnv(idist, iseed, strideISEED, offsetISEED, N, x, stride, offset) {
      var il2;
      var il;
      var iv;
      var ix;
      var u;
      var i;
      u = new Float64Array2(LV);
      for (iv = 0; iv < N; iv += LV / 2) {
        il = Math.min(LV / 2, N - iv);
        if (idist === 3) {
          il2 = 2 * il;
        } else {
          il2 = il;
        }
        dlaruv(iseed, strideISEED, offsetISEED, il2, u, 1, 0);
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
    module.exports = dlarnv;
  }
});

// ../../../../../private/tmp/blapack/lib/blas/base/idamax/lib/base.js
var require_base56 = __commonJS({
  "../../../../../private/tmp/blapack/lib/blas/base/idamax/lib/base.js"(exports, module) {
    "use strict";
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
    module.exports = idamax;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlagtf/lib/base.js
var require_base57 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlagtf/lib/base.js"(exports, module) {
    "use strict";
    var dlamch = require_base16();
    var EPS = dlamch("Epsilon");
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
      tl = Math.max(tol, EPS);
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
    module.exports = dlagtf;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dlagts/lib/base.js
var require_base58 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dlagts/lib/base.js"(exports, module) {
    "use strict";
    var dlamch = require_base16();
    var EPS = dlamch("Epsilon");
    var SFMIN = dlamch("Safe minimum");
    var BIGNUM = 1 / SFMIN;
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
          tol *= EPS;
          if (tol === 0) {
            tol = EPS;
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
              if (absak < SFMIN) {
                if (absak === 0 || Math.abs(temp) * SFMIN > absak) {
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
                if (absak < SFMIN) {
                  if (absak === 0 || Math.abs(temp) * SFMIN > absak) {
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
              if (absak < SFMIN) {
                if (absak === 0 || Math.abs(temp) * SFMIN > absak) {
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
                if (absak < SFMIN) {
                  if (absak === 0 || Math.abs(temp) * SFMIN > absak) {
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
    module.exports = dlagts;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dstein/lib/base.js
var require_base59 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dstein/lib/base.js"(exports, module) {
    "use strict";
    var Int32Array2 = require_stdlib_array_int32();
    var dlamch = require_base16();
    var dlarnv = require_base55();
    var dcopy = require_base34();
    var dscal = require_base7();
    var ddot = require_base23();
    var dnrm2 = require_base19();
    var daxpy = require_base6();
    var idamax = require_base56();
    var dlagtf = require_base57();
    var dlagts = require_base58();
    var MAXITS = 5;
    var EXTRA = 2;
    var ODM3 = 1e-3;
    var ODM1 = 0.1;
    var TEN = 10;
    var EPS = dlamch("Precision");
    function dstein(N, d, strideD, offsetD, e, strideE, offsetE, M, w, strideW, offsetW, IBLOCK, strideIBLOCK, offsetIBLOCK, ISPLIT, strideISPLIT, offsetISPLIT, Z, strideZ1, strideZ2, offsetZ, WORK, strideWORK, offsetWORK, IWORK, strideIWORK, offsetIWORK, IFAIL, strideIFAIL, offsetIFAIL) {
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
      var iinfo;
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
      for (i = 0; i < M; i++) {
        IFAIL[offsetIFAIL + i * strideIFAIL] = 0;
      }
      if (N < 0) {
        return -1;
      }
      if (M < 0 || M > N) {
        return -4;
      }
      for (j = 1; j < M; j++) {
        if (IBLOCK[offsetIBLOCK + j * strideIBLOCK] < IBLOCK[offsetIBLOCK + (j - 1) * strideIBLOCK]) {
          return -6;
        }
        if (IBLOCK[offsetIBLOCK + j * strideIBLOCK] === IBLOCK[offsetIBLOCK + (j - 1) * strideIBLOCK] && w[offsetW + j * strideW] < w[offsetW + (j - 1) * strideW]) {
          return -5;
        }
      }
      if (N === 0 || M === 0) {
        return 0;
      }
      if (N === 1) {
        Z[offsetZ] = 1;
        return 0;
      }
      iseed = new Int32Array2([1, 1, 1, 1]);
      indrv1 = offsetWORK;
      indrv2 = indrv1 + N * strideWORK;
      indrv3 = indrv2 + N * strideWORK;
      indrv4 = indrv3 + N * strideWORK;
      indrv5 = indrv4 + N * strideWORK;
      j1 = 0;
      for (nblk = 1; nblk <= IBLOCK[offsetIBLOCK + (M - 1) * strideIBLOCK]; nblk++) {
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
        for (j = j1; j < M; j++) {
          if (IBLOCK[offsetIBLOCK + j * strideIBLOCK] !== nblk) {
            j1 = j;
            break;
          }
          jblk++;
          xj = w[offsetW + j * strideW];
          if (blksiz === 1) {
            WORK[indrv1] = 1;
            _storeEigenvector(N, Z, strideZ1, strideZ2, offsetZ, WORK, strideWORK, indrv1, b1, blksiz, j);
            xjm = xj;
            if (j === M - 1) {
              j1 = M;
            }
            continue;
          }
          if (jblk > 1) {
            eps1 = Math.abs(EPS * xj);
            pertol = TEN * eps1;
            sep = xj - xjm;
            if (sep < pertol) {
              xj = xjm + pertol;
            }
          }
          its = 0;
          nrmchk = 0;
          dlarnv(2, iseed, 1, 0, blksiz, WORK, strideWORK, indrv1);
          dcopy(blksiz, d, strideD, offsetD + b1 * strideD, WORK, strideWORK, indrv4);
          dcopy(blksiz - 1, e, strideE, offsetE + b1 * strideE, WORK, strideWORK, indrv2 + strideWORK);
          dcopy(blksiz - 1, e, strideE, offsetE + b1 * strideE, WORK, strideWORK, indrv3);
          tol = 0;
          dlagtf(blksiz, WORK, strideWORK, indrv4, xj, WORK, strideWORK, indrv2 + strideWORK, WORK, strideWORK, indrv3, tol, WORK, strideWORK, indrv5, IWORK, strideIWORK, offsetIWORK);
          while (true) {
            its++;
            if (its > MAXITS) {
              info++;
              IFAIL[offsetIFAIL + (info - 1) * strideIFAIL] = j + 1;
              break;
            }
            jmax = idamax(blksiz, WORK, strideWORK, indrv1);
            scl = blksiz * onenrm * Math.max(EPS, Math.abs(WORK[indrv4 + (blksiz - 1) * strideWORK])) / Math.abs(WORK[indrv1 + jmax * strideWORK]);
            dscal(blksiz, scl, WORK, strideWORK, indrv1);
            dlagts(-1, blksiz, WORK, strideWORK, indrv4, WORK, strideWORK, indrv2 + strideWORK, WORK, strideWORK, indrv3, WORK, strideWORK, indrv5, IWORK, strideIWORK, offsetIWORK, WORK, strideWORK, indrv1, tol);
            if (jblk !== 1) {
              if (Math.abs(xj - xjm) > ortol) {
                gpind = j;
              }
              if (gpind !== j) {
                for (i = gpind; i < j; i++) {
                  ztr = -ddot(blksiz, WORK, strideWORK, indrv1, Z, strideZ1, offsetZ + b1 * strideZ1 + i * strideZ2);
                  daxpy(blksiz, ztr, Z, strideZ1, offsetZ + b1 * strideZ1 + i * strideZ2, WORK, strideWORK, indrv1);
                }
              }
            }
            jmax = idamax(blksiz, WORK, strideWORK, indrv1);
            nrm = Math.abs(WORK[indrv1 + jmax * strideWORK]);
            if (nrm < dtpcrt) {
              continue;
            }
            nrmchk++;
            if (nrmchk < EXTRA + 1) {
              continue;
            }
            break;
          }
          scl = 1 / dnrm2(blksiz, WORK, strideWORK, indrv1);
          jmax = idamax(blksiz, WORK, strideWORK, indrv1);
          if (WORK[indrv1 + jmax * strideWORK] < 0) {
            scl = -scl;
          }
          dscal(blksiz, scl, WORK, strideWORK, indrv1);
          _storeEigenvector(N, Z, strideZ1, strideZ2, offsetZ, WORK, strideWORK, indrv1, b1, blksiz, j);
          xjm = xj;
          if (j === M - 1) {
            j1 = M;
          }
        }
      }
      return info;
    }
    function _storeEigenvector(N, Z, strideZ1, strideZ2, offsetZ, WORK, strideWORK, indrv1, b1, blksiz, j) {
      var i;
      for (i = 0; i < N; i++) {
        Z[offsetZ + i * strideZ1 + j * strideZ2] = 0;
      }
      for (i = 0; i < blksiz; i++) {
        Z[offsetZ + (b1 + i) * strideZ1 + j * strideZ2] = WORK[indrv1 + i * strideWORK];
      }
    }
    module.exports = dstein;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dorm2l/lib/base.js
var require_base60 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dorm2l/lib/base.js"(exports, module) {
    "use strict";
    var dlarf = require_base31();
    function dorm2l(side, trans, M, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWORK, offsetWORK) {
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
      if (M === 0 || N === 0 || K === 0) {
        return 0;
      }
      left = side === "left";
      notran = trans === "no-transpose";
      if (left) {
        nq = M;
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
        mi = M;
      }
      for (i = i1; i !== i2; i += i3) {
        if (left) {
          mi = M - K + i + 1;
        } else {
          ni = N - K + i + 1;
        }
        idxA = offsetA + (nq - K + i) * strideA1 + i * strideA2;
        aii = A[idxA];
        A[idxA] = 1;
        dlarf(side, mi, ni, A, strideA1, offsetA + i * strideA2, TAU[offsetTAU + i * strideTAU], C, strideC1, strideC2, offsetC, WORK, strideWORK, offsetWORK);
        A[idxA] = aii;
      }
      return 0;
    }
    module.exports = dorm2l;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dormql/lib/base.js
var require_base61 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dormql/lib/base.js"(exports, module) {
    "use strict";
    var Float64Array2 = require_stdlib_array_float64();
    var dlarfb = require_base35();
    var dlarft = require_base33();
    var dorm2l = require_base60();
    var NB = 32;
    function dormql(side, trans, M, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWORK, offsetWORK) {
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
      if (M === 0 || N === 0 || K === 0) {
        return 0;
      }
      left = side === "left";
      notran = trans === "no-transpose";
      if (left) {
        nq = M;
        nw = Math.max(1, N);
      } else {
        nq = N;
        nw = Math.max(1, M);
      }
      nb = NB;
      if (nb > K) {
        nb = K;
      }
      if (nb < 2 || nb >= K) {
        return dorm2l(side, trans, M, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWORK, offsetWORK);
      }
      ldwork = nw;
      ldt = nb + 1;
      T = new Float64Array2(ldt * nb);
      if (!WORK || WORK.length < nw * nb + ldt * nb) {
        WORK = new Float64Array2(nw * nb + ldt * nb);
        offsetWORK = 0;
        strideWORK = 1;
      }
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
        mi = M;
      }
      for (i = i1; i3 > 0 ? i < i2 : i > i2; i += i3) {
        ib = Math.min(nb, K - i);
        dlarft("backward", "columnwise", nq - K + i + ib, ib, A, strideA1, strideA2, offsetA + i * strideA2, TAU, strideTAU, offsetTAU + i * strideTAU, T, 1, ldt, 0);
        if (left) {
          mi = M - K + i + ib;
        } else {
          ni = N - K + i + ib;
        }
        dlarfb(side, trans, "backward", "columnwise", mi, ni, ib, A, strideA1, strideA2, offsetA + i * strideA2, T, 1, ldt, 0, C, strideC1, strideC2, offsetC, WORK, 1, ldwork, offsetWORK);
      }
      return 0;
    }
    module.exports = dormql;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dorm2r/lib/base.js
var require_base62 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dorm2r/lib/base.js"(exports, module) {
    "use strict";
    var dlarf = require_base31();
    function dorm2r(side, trans, M, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWORK, offsetWORK) {
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
      if (M === 0 || N === 0 || K === 0) {
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
        mi = M;
        ic = 0;
      }
      for (i = i1; i !== i2; i += i3) {
        if (left) {
          mi = M - i;
          ic = i;
        } else {
          ni = N - i;
          jc = i;
        }
        idxA = offsetA + i * strideA1 + i * strideA2;
        aii = A[idxA];
        A[idxA] = 1;
        dlarf(side, mi, ni, A, strideA1, offsetA + i * strideA1 + i * strideA2, TAU[offsetTAU + i * strideTAU], C, strideC1, strideC2, offsetC + ic * strideC1 + jc * strideC2, WORK, strideWORK, offsetWORK);
        A[idxA] = aii;
      }
      return 0;
    }
    module.exports = dorm2r;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dormqr/lib/base.js
var require_base63 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dormqr/lib/base.js"(exports, module) {
    "use strict";
    var Float64Array2 = require_stdlib_array_float64();
    var dlarfb = require_base35();
    var dlarft = require_base33();
    var dorm2r = require_base62();
    var NB = 32;
    function dormqr(side, trans, M, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWORK, offsetWORK) {
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
      if (M === 0 || N === 0 || K === 0) {
        return 0;
      }
      left = side === "left";
      notran = trans === "no-transpose";
      if (left) {
        nq = M;
        nw = Math.max(1, N);
      } else {
        nq = N;
        nw = Math.max(1, M);
      }
      nb = NB;
      if (nb > K) {
        nb = K;
      }
      if (nb < 2 || nb >= K) {
        return dorm2r(side, trans, M, N, K, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWORK, offsetWORK);
      }
      ldwork = nw;
      ldt = nb + 1;
      T = new Float64Array2(ldt * nb);
      if (!WORK || WORK.length < nw * nb + ldt * nb) {
        WORK = new Float64Array2(nw * nb + ldt * nb);
        offsetWORK = 0;
        strideWORK = 1;
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
        mi = M;
        ic = 0;
      }
      for (i = i1; i3 > 0 ? i < i2 : i > i2; i += i3) {
        ib = Math.min(nb, K - i);
        dlarft("forward", "columnwise", nq - i, ib, A, strideA1, strideA2, offsetA + i * strideA1 + i * strideA2, TAU, strideTAU, offsetTAU + i * strideTAU, T, 1, ldt, 0);
        if (left) {
          mi = M - i;
          ic = i;
        } else {
          ni = N - i;
          jc = i;
        }
        dlarfb(side, trans, "forward", "columnwise", mi, ni, ib, A, strideA1, strideA2, offsetA + i * strideA1 + i * strideA2, T, 1, ldt, 0, C, strideC1, strideC2, offsetC + ic * strideC1 + jc * strideC2, WORK, 1, ldwork, offsetWORK);
      }
      return 0;
    }
    module.exports = dormqr;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dormtr/lib/base.js
var require_base64 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dormtr/lib/base.js"(exports, module) {
    "use strict";
    var dormql = require_base61();
    var dormqr = require_base63();
    function dormtr(side, uplo, trans, M, N, A, strideA1, strideA2, offsetA, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWORK, offsetWORK, lwork) {
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
        nq = M;
      } else {
        nq = N;
      }
      if (M === 0 || N === 0 || nq === 1) {
        return 0;
      }
      if (left) {
        mi = M - 1;
        ni = N;
      } else {
        mi = M;
        ni = N - 1;
      }
      if (upper) {
        dormql(side, trans, mi, ni, nq - 1, A, strideA1, strideA2, offsetA + strideA2, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC, WORK, strideWORK, offsetWORK);
      } else {
        if (left) {
          i1 = 1;
          i2 = 0;
        } else {
          i1 = 0;
          i2 = 1;
        }
        dormqr(side, trans, mi, ni, nq - 1, A, strideA1, strideA2, offsetA + strideA1, TAU, strideTAU, offsetTAU, C, strideC1, strideC2, offsetC + i1 * strideC1 + i2 * strideC2, WORK, strideWORK, offsetWORK);
      }
      return 0;
    }
    module.exports = dormtr;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dsyevx/lib/base.js
var require_base65 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dsyevx/lib/base.js"(exports, module) {
    "use strict";
    var Float64Array2 = require_stdlib_array_float64();
    var Int32Array2 = require_stdlib_array_int32();
    var dlamch = require_base16();
    var dlansy = require_base18();
    var dscal = require_base7();
    var dsytrd = require_base27();
    var dorgtr = require_base39();
    var dlacpy = require_base40();
    var dsteqr = require_base50();
    var dsterf = require_base51();
    var dcopy = require_base34();
    var dstebz = require_base53();
    var dstein = require_base59();
    var dormtr = require_base64();
    var dswap = require_base49();
    var sqrt = Math.sqrt;
    var min = Math.min;
    function dsyevx(jobz, range, uplo, N, A, strideA1, strideA2, offsetA, vl, vu, il, iu, abstol, out, w, strideW, offsetW, Z, strideZ1, strideZ2, offsetZ, WORK, strideWORK, offsetWORK, lwork, IWORK, strideIWORK, offsetIWORK, IFAIL, strideIFAIL, offsetIFAIL) {
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
      var llwork;
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
      var M;
      wantz = jobz === "compute-vectors";
      alleig = range === "all";
      valeig = range === "value";
      indeig = range === "index";
      lower = uplo === "lower";
      info = 0;
      M = 0;
      if (N === 0) {
        out.M = 0;
        return 0;
      }
      if (N === 1) {
        if (alleig || indeig) {
          M = 1;
          w[offsetW] = A[offsetA];
        } else if (valeig) {
          if (vl < A[offsetA] && vu >= A[offsetA]) {
            M = 1;
            w[offsetW] = A[offsetA];
          }
        }
        if (wantz && M === 1) {
          Z[offsetZ] = 1;
        }
        out.M = M;
        return 0;
      }
      safmin = dlamch("safe-minimum");
      eps = dlamch("epsilon");
      smlnum = safmin / eps;
      bignum = 1 / smlnum;
      rmin = sqrt(smlnum);
      rmax = min(sqrt(bignum), 1 / sqrt(sqrt(safmin)));
      iscale = 0;
      abstll = abstol;
      vll = vl;
      vuu = vu;
      anrm = dlansy("max", uplo, N, A, strideA1, strideA2, offsetA, WORK, strideWORK, offsetWORK);
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
            dscal(N - j, sigma, A, strideA1, offsetA + j * strideA1 + j * strideA2);
          }
        } else {
          for (j = 0; j < N; j++) {
            dscal(j + 1, sigma, A, strideA1, offsetA + j * strideA2);
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
      indtau = offsetWORK;
      inde = indtau + N;
      indd = inde + N;
      indwrk = indd + N;
      llwork = lwork - (indwrk - offsetWORK);
      dsytrd(uplo, N, A, strideA1, strideA2, offsetA, WORK, strideWORK, indd, WORK, strideWORK, inde, WORK, strideWORK, indtau);
      test = false;
      if (indeig) {
        if (il === 1 && iu === N) {
          test = true;
        }
      }
      if ((alleig || test) && abstol <= 0) {
        dcopy(N, WORK, strideWORK, indd, w, strideW, offsetW);
        indee = indwrk + 2 * N;
        if (!wantz) {
          dcopy(N - 1, WORK, strideWORK, inde, WORK, strideWORK, indee);
          info = dsterf(N, w, strideW, offsetW, WORK, strideWORK, indee);
        } else {
          dlacpy("all", N, N, A, strideA1, strideA2, offsetA, Z, strideZ1, strideZ2, offsetZ);
          dorgtr(uplo, N, Z, strideZ1, strideZ2, offsetZ, WORK, strideWORK, indtau, WORK, strideWORK, indwrk);
          dcopy(N - 1, WORK, strideWORK, inde, WORK, strideWORK, indee);
          info = dsteqr("update", N, w, strideW, offsetW, WORK, strideWORK, indee, Z, strideZ1, strideZ2, offsetZ, WORK, strideWORK, indwrk);
          if (info === 0) {
            for (i = 0; i < N; i++) {
              IFAIL[offsetIFAIL + i * strideIFAIL] = 0;
            }
          }
        }
        if (info === 0) {
          M = N;
        } else {
          info = 0;
          M = 0;
        }
      }
      if (M === 0 && info === 0) {
        if (wantz) {
          order = "block";
        } else {
          order = "entire";
        }
        indibl = offsetIWORK;
        indisp = indibl + N;
        indiwo = indisp + N;
        Mout = new Int32Array2(1);
        nsplit = new Int32Array2(1);
        info = dstebz(range, order, N, vll, vuu, il, iu, abstll, WORK, strideWORK, indd, WORK, strideWORK, inde, Mout, nsplit, w, strideW, offsetW, IWORK, strideIWORK, indibl, IWORK, strideIWORK, indisp, WORK, strideWORK, indwrk, IWORK, strideIWORK, indiwo);
        M = Mout[0];
        if (wantz && M > 0) {
          info = dstein(N, WORK, strideWORK, indd, WORK, strideWORK, inde, M, w, strideW, offsetW, IWORK, strideIWORK, indibl, IWORK, strideIWORK, indisp, Z, strideZ1, strideZ2, offsetZ, WORK, strideWORK, indwrk, IWORK, strideIWORK, indiwo, IFAIL, strideIFAIL, offsetIFAIL);
          indwkn = inde;
          llwrkn = lwork - (indwkn - offsetWORK);
          dormtr("left", uplo, "no-transpose", N, M, A, strideA1, strideA2, offsetA, WORK, strideWORK, indtau, Z, strideZ1, strideZ2, offsetZ, WORK, strideWORK, indwkn, llwrkn);
        }
      }
      if (iscale === 1) {
        if (info === 0) {
          imax = M;
        } else {
          imax = info - 1;
        }
        dscal(imax, 1 / sigma, w, strideW, offsetW);
      }
      if (wantz) {
        for (j = 0; j < M - 1; j++) {
          i = -1;
          tmp1 = w[offsetW + j * strideW];
          for (jj = j + 1; jj < M; jj++) {
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
            dswap(N, Z, strideZ1, offsetZ + i * strideZ2, Z, strideZ1, offsetZ + j * strideZ2);
            if (info !== 0) {
              itmp1 = IFAIL[offsetIFAIL + i * strideIFAIL];
              IFAIL[offsetIFAIL + i * strideIFAIL] = IFAIL[offsetIFAIL + j * strideIFAIL];
              IFAIL[offsetIFAIL + j * strideIFAIL] = itmp1;
            }
          }
        }
      }
      out.M = M;
      return info;
    }
    module.exports = dsyevx;
  }
});

// ../../../../../private/tmp/blapack/lib/lapack/base/dsygvx/lib/base.js
var require_base66 = __commonJS({
  "../../../../../private/tmp/blapack/lib/lapack/base/dsygvx/lib/base.js"(exports, module) {
    "use strict";
    var dpotrf = require_base5();
    var dsygst = require_base15();
    var dsyevx = require_base65();
    var dtrsm = require_base();
    var dtrmm = require_base14();
    function dsygvx(itype, jobz, range, uplo, N, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB, vl, vu, il, iu, abstol, out, w, strideW, offsetW, Z, strideZ1, strideZ2, offsetZ, WORK, strideWORK, offsetWORK, lwork, IWORK, strideIWORK, offsetIWORK, IFAIL, strideIFAIL, offsetIFAIL) {
      var wantz;
      var upper;
      var trans;
      var info;
      var M;
      wantz = jobz === "compute-vectors";
      upper = uplo === "upper";
      out.M = 0;
      if (N === 0) {
        return 0;
      }
      info = dpotrf(uplo, N, B, strideB1, strideB2, offsetB);
      if (info !== 0) {
        return N + info;
      }
      dsygst(itype, uplo, N, A, strideA1, strideA2, offsetA, B, strideB1, strideB2, offsetB);
      info = dsyevx(jobz, range, uplo, N, A, strideA1, strideA2, offsetA, vl, vu, il, iu, abstol, out, w, strideW, offsetW, Z, strideZ1, strideZ2, offsetZ, WORK, strideWORK, offsetWORK, lwork, IWORK, strideIWORK, offsetIWORK, IFAIL, strideIFAIL, offsetIFAIL);
      M = out.M;
      if (wantz) {
        if (info > 0) {
          M = info - 1;
        }
        if (M > 0) {
          if (itype === 1 || itype === 2) {
            if (upper) {
              trans = "no-transpose";
            } else {
              trans = "transpose";
            }
            dtrsm("left", uplo, trans, "non-unit", N, M, 1, B, strideB1, strideB2, offsetB, Z, strideZ1, strideZ2, offsetZ);
          } else if (itype === 3) {
            if (upper) {
              trans = "transpose";
            } else {
              trans = "no-transpose";
            }
            dtrmm("left", uplo, trans, "non-unit", N, M, 1, B, strideB1, strideB2, offsetB, Z, strideZ1, strideZ2, offsetZ);
          }
        }
      }
      return info;
    }
    module.exports = dsygvx;
  }
});

// ../../../../../private/tmp/dsygvx-entry.cjs
var require_dsygvx_entry = __commonJS({
  "../../../../../private/tmp/dsygvx-entry.cjs"(exports, module) {
    module.exports = require_base66();
  }
});
export default require_dsygvx_entry();
