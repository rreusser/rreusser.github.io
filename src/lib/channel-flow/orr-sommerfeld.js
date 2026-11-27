/**
 * Linear stability of plane Poiseuille flow, U = 1 - y^2 on [-1, 1].
 *
 * A disturbance proportional to exp(i (alpha x + beta z - alpha c t)) has a
 * wall-normal velocity that satisfies the Orr-Sommerfeld equation,
 *
 *   [(U - c)(D^2 - k^2) - U''] v - (D^2 - k^2)^2 v / (i alpha Re) = 0,
 *
 * with v = Dv = 0 on the walls and k^2 = alpha^2 + beta^2. The wave grows
 * when the imaginary part of c is positive. For an oblique wave the
 * wall-normal vorticity follows from the Squire equation forced by v, and
 * the other two velocity components from continuity.
 *
 * Discretisation: Chebyshev collocation, with the clamped boundary
 * conditions built into the fourth-derivative matrix by writing
 * v = (1 - y^2) q (Trefethen, Spectral Methods in MATLAB, program 40). The
 * generalised eigenproblem is reduced to a standard one and solved with a
 * complex QR iteration; the wanted eigenfunction then comes from inverse
 * iteration. Everything is double precision on the CPU.
 */

// ---------------------------------------------------------------------------
// Real dense helpers (row-major Float64Array, n x n)
// ---------------------------------------------------------------------------

function matmul(a, b, n) {
  const c = new Float64Array(n * n);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < n; k++) {
      const aik = a[i * n + k];
      if (aik === 0) continue;
      for (let j = 0; j < n; j++) c[i * n + j] += aik * b[k * n + j];
    }
  return c;
}

/** Solve B X = R in place for several right-hand-side matrices, B real n x n. */
function solveReal(B, rhs, n) {
  const a = Float64Array.from(B);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r * n + col]) > Math.abs(a[piv * n + col])) piv = r;
    if (piv !== col) {
      for (let j = 0; j < n; j++) {
        const t = a[col * n + j]; a[col * n + j] = a[piv * n + j]; a[piv * n + j] = t;
        for (const m of rhs) { const s = m[col * n + j]; m[col * n + j] = m[piv * n + j]; m[piv * n + j] = s; }
      }
    }
    const d = a[col * n + col];
    for (let r = col + 1; r < n; r++) {
      const f = a[r * n + col] / d;
      if (f === 0) continue;
      for (let j = col; j < n; j++) a[r * n + j] -= f * a[col * n + j];
      for (const m of rhs) for (let j = 0; j < n; j++) m[r * n + j] -= f * m[col * n + j];
    }
  }
  for (const m of rhs)
    for (let r = n - 1; r >= 0; r--)
      for (let j = 0; j < n; j++) {
        let s = m[r * n + j];
        for (let k = r + 1; k < n; k++) s -= a[r * n + k] * m[k * n + j];
        m[r * n + j] = s / a[r * n + r];
      }
}

// ---------------------------------------------------------------------------
// Complex dense helpers (separate real and imaginary row-major arrays)
// ---------------------------------------------------------------------------

/**
 * LU factorisation with partial pivoting of a complex matrix, returning a
 * function that solves for one right-hand side.
 */
function complexSolver(Ar, Ai, n) {
  const ar = Float64Array.from(Ar), ai = Float64Array.from(Ai);
  const perm = Int32Array.from({ length: n }, (_, i) => i);
  for (let col = 0; col < n; col++) {
    let piv = col, best = -1;
    for (let r = col; r < n; r++) {
      const m = Math.hypot(ar[r * n + col], ai[r * n + col]);
      if (m > best) { best = m; piv = r; }
    }
    if (piv !== col) {
      for (let j = 0; j < n; j++) {
        let t = ar[col * n + j]; ar[col * n + j] = ar[piv * n + j]; ar[piv * n + j] = t;
        t = ai[col * n + j]; ai[col * n + j] = ai[piv * n + j]; ai[piv * n + j] = t;
      }
      const t = perm[col]; perm[col] = perm[piv]; perm[piv] = t;
    }
    const dr = ar[col * n + col], di = ai[col * n + col];
    const dd = dr * dr + di * di;
    for (let r = col + 1; r < n; r++) {
      const xr = ar[r * n + col], xi = ai[r * n + col];
      const fr = (xr * dr + xi * di) / dd, fi = (xi * dr - xr * di) / dd;
      ar[r * n + col] = fr; ai[r * n + col] = fi;
      for (let j = col + 1; j < n; j++) {
        const br = ar[col * n + j], bi = ai[col * n + j];
        ar[r * n + j] -= fr * br - fi * bi;
        ai[r * n + j] -= fr * bi + fi * br;
      }
    }
  }
  return (br, bi) => {
    const xr = new Float64Array(n), xi = new Float64Array(n);
    for (let i = 0; i < n; i++) { xr[i] = br[perm[i]]; xi[i] = bi[perm[i]]; }
    for (let i = 0; i < n; i++)
      for (let k = 0; k < i; k++) {
        const lr = ar[i * n + k], li = ai[i * n + k];
        xr[i] -= lr * xr[k] - li * xi[k];
        xi[i] -= lr * xi[k] + li * xr[k];
      }
    for (let i = n - 1; i >= 0; i--) {
      let sr = xr[i], si = xi[i];
      for (let k = i + 1; k < n; k++) {
        const ur = ar[i * n + k], ui = ai[i * n + k];
        sr -= ur * xr[k] - ui * xi[k];
        si -= ur * xi[k] + ui * xr[k];
      }
      const dr = ar[i * n + i], di = ai[i * n + i], dd = dr * dr + di * di;
      xr[i] = (sr * dr + si * di) / dd;
      xi[i] = (si * dr - sr * di) / dd;
    }
    return [xr, xi];
  };
}

/**
 * Unitary rotation that maps (a, b) to (r, 0). Returns c and s (complex) with
 *   row_k'   = conj(c) row_k + conj(s) row_k1
 *   row_k1'  = -s row_k + c row_k1
 */
function givens(ar, ai, br, bi) {
  const r = Math.hypot(ar, ai, br, bi);
  if (r === 0) return [1, 0, 0, 0];
  return [ar / r, ai / r, br / r, bi / r];
}

function rotateRows(Hr, Hi, n, k, k1, g, j0, j1) {
  const [cr, ci, sr, si] = g;
  for (let j = j0; j <= j1; j++) {
    const ar = Hr[k * n + j], ai = Hi[k * n + j], br = Hr[k1 * n + j], bi = Hi[k1 * n + j];
    Hr[k * n + j] = cr * ar + ci * ai + sr * br + si * bi;
    Hi[k * n + j] = cr * ai - ci * ar + sr * bi - si * br;
    Hr[k1 * n + j] = -(sr * ar - si * ai) + (cr * br - ci * bi);
    Hi[k1 * n + j] = -(sr * ai + si * ar) + (cr * bi + ci * br);
  }
}

// Multiply by the conjugate transpose of the rotation on the right:
//   col_k' = c col_k + s col_k1,   col_k1' = -conj(s) col_k + conj(c) col_k1
function rotateCols(Hr, Hi, n, k, k1, g, i0, i1) {
  const [cr, ci, sr, si] = g;
  for (let i = i0; i <= i1; i++) {
    const ar = Hr[i * n + k], ai = Hi[i * n + k], br = Hr[i * n + k1], bi = Hi[i * n + k1];
    Hr[i * n + k] = ar * cr - ai * ci + br * sr - bi * si;
    Hi[i * n + k] = ar * ci + ai * cr + br * si + bi * sr;
    Hr[i * n + k1] = -(ar * sr + ai * si) + (br * cr + bi * ci);
    Hi[i * n + k1] = -(ai * sr - ar * si) + (bi * cr - br * ci);
  }
}

function complexSqrt(re, im) {
  const m = Math.hypot(re, im);
  const sr = Math.sqrt(Math.max(0, 0.5 * (m + re)));
  const si = Math.sqrt(Math.max(0, 0.5 * (m - re)));
  return [sr, im < 0 ? -si : si];
}

/**
 * Eigenvalues of a general complex matrix: reduction to Hessenberg form by
 * rotations, then shifted QR with deflation. The inputs are overwritten.
 * Returns [re, im] arrays.
 */
function complexEigenvalues(Hr, Hi, n) {
  for (let j = 0; j < n - 2; j++)
    for (let i = n - 1; i >= j + 2; i--) {
      if (Hr[i * n + j] === 0 && Hi[i * n + j] === 0) continue;
      const g = givens(Hr[(i - 1) * n + j], Hi[(i - 1) * n + j], Hr[i * n + j], Hi[i * n + j]);
      rotateRows(Hr, Hi, n, i - 1, i, g, j, n - 1);
      rotateCols(Hr, Hi, n, i - 1, i, g, 0, n - 1);
      Hr[i * n + j] = 0; Hi[i * n + j] = 0;
    }

  const er = new Float64Array(n), ei = new Float64Array(n);
  const EPS = 2.3e-16;
  let hi = n - 1, iter = 0, total = 0;
  const rot = new Array(n);
  while (hi >= 0) {
    if (total++ > 60 * n) throw new Error('QR iteration did not converge');
    let l = hi;
    while (l > 0) {
      const sub = Math.abs(Hr[l * n + l - 1]) + Math.abs(Hi[l * n + l - 1]);
      const diag = Math.abs(Hr[l * n + l]) + Math.abs(Hi[l * n + l]) +
        Math.abs(Hr[(l - 1) * n + l - 1]) + Math.abs(Hi[(l - 1) * n + l - 1]);
      if (sub <= EPS * diag) { Hr[l * n + l - 1] = 0; Hi[l * n + l - 1] = 0; break; }
      l--;
    }
    if (l === hi) {
      er[hi] = Hr[hi * n + hi]; ei[hi] = Hi[hi * n + hi];
      hi--; iter = 0;
      continue;
    }
    // Wilkinson shift: the eigenvalue of the trailing 2 x 2 block nearer its
    // last entry. An occasional arbitrary shift breaks rare stagnation.
    const p = hi - 1;
    const ar = Hr[p * n + p], ai = Hi[p * n + p], br = Hr[p * n + hi], bi = Hi[p * n + hi];
    const cr = Hr[hi * n + p], ci = Hi[hi * n + p], dr = Hr[hi * n + hi], di = Hi[hi * n + hi];
    let mr, mi;
    if (++iter % 11 === 0) {
      mr = dr + Math.abs(cr) + Math.abs(ci); mi = di;
    } else {
      const hr = 0.5 * (ar - dr), him = 0.5 * (ai - di);
      const [qr, qi] = complexSqrt(hr * hr - him * him + br * cr - bi * ci, 2 * hr * him + br * ci + bi * cr);
      // d + h -+ sqrt(...): take the root nearer d, i.e. the smaller |h -+ q|.
      const plus = Math.hypot(hr + qr, him + qi), minus = Math.hypot(hr - qr, him - qi);
      if (plus < minus) { mr = dr + hr + qr; mi = di + him + qi; } else { mr = dr + hr - qr; mi = di + him - qi; }
    }
    for (let k = l; k <= hi; k++) { Hr[k * n + k] -= mr; Hi[k * n + k] -= mi; }
    for (let k = l; k < hi; k++) {
      const g = givens(Hr[k * n + k], Hi[k * n + k], Hr[(k + 1) * n + k], Hi[(k + 1) * n + k]);
      rotateRows(Hr, Hi, n, k, k + 1, g, k, hi);
      rot[k] = g;
    }
    for (let k = l; k < hi; k++) rotateCols(Hr, Hi, n, k, k + 1, rot[k], l, Math.min(k + 2, hi));
    for (let k = l; k <= hi; k++) { Hr[k * n + k] += mr; Hi[k * n + k] += mi; }
  }
  return [er, ei];
}

// ---------------------------------------------------------------------------
// Chebyshev collocation
// ---------------------------------------------------------------------------

/** Chebyshev points x_j = cos(pi j / N) and the (N+1) x (N+1) differentiation matrix. */
export function chebyshev(N) {
  const n = N + 1;
  const x = Float64Array.from({ length: n }, (_, j) => Math.cos((Math.PI * j) / N));
  const c = Float64Array.from({ length: n }, (_, j) => (j === 0 || j === N ? 2 : 1) * (j % 2 ? -1 : 1));
  const D = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      D[i * n + j] = c[i] / c[j] / (x[i] - x[j]);
      sum += D[i * n + j];
    }
    D[i * n + i] = -sum;
  }
  return { x, D };
}

/** Barycentric interpolation of values on Chebyshev points to the point y. */
function interpolate(x, f, y) {
  const N = x.length - 1;
  let num = 0, den = 0;
  for (let j = 0; j <= N; j++) {
    const d = y - x[j];
    if (d === 0) return f[j];
    const w = ((j % 2 ? -1 : 1) * (j === 0 || j === N ? 0.5 : 1)) / d;
    num += w * f[j];
    den += w;
  }
  return num / den;
}

function operators({ re, alpha, beta, N }) {
  const { x, D } = chebyshev(N);
  const n1 = N + 1, n = N - 1;
  const D2 = matmul(D, D, n1), D3 = matmul(D2, D, n1), D4 = matmul(D2, D2, n1);
  const k2 = alpha * alpha + beta * beta;
  const Ar = new Float64Array(n * n), Ai = new Float64Array(n * n);
  const B = new Float64Array(n * n), D2i = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    const xi = x[i + 1], U = 1 - xi * xi;
    for (let j = 0; j < n; j++) {
      const xj = x[j + 1], I = i === j ? 1 : 0;
      const d2 = D2[(i + 1) * n1 + j + 1];
      const d4 = ((1 - xi * xi) * D4[(i + 1) * n1 + j + 1] - 8 * xi * D3[(i + 1) * n1 + j + 1] - 12 * d2) / (1 - xj * xj);
      D2i[i * n + j] = d2;
      B[i * n + j] = d2 - k2 * I;
      // d/dt (D^2 - k^2) v = [(D^2 - k^2)^2 / Re - i alpha U (D^2 - k^2) + i alpha U''] v
      Ar[i * n + j] = (d4 - 2 * k2 * d2 + k2 * k2 * I) / re;
      Ai[i * n + j] = -2 * alpha * I - alpha * U * (d2 - k2 * I);
    }
  }
  return { x, D, n, n1, k2, Ar, Ai, B, D2i };
}

/**
 * All eigenvalues of the Orr-Sommerfeld problem, as phase speeds c, sorted
 * from least to most stable. Eigenvalues far outside the physical range,
 * which the discretisation resolves poorly, are dropped.
 *
 * @returns {{ re: number, im: number }[]}
 */
export function orrSommerfeldSpectrum({ re, alpha, beta = 0, N = 96 }) {
  const op = operators({ re, alpha, beta, N });
  const Mr = Float64Array.from(op.Ar), Mi = Float64Array.from(op.Ai);
  solveReal(op.B, [Mr, Mi], op.n);
  const [lr, li] = complexEigenvalues(Mr, Mi, op.n);
  // lambda = -i alpha c
  const out = [];
  for (let k = 0; k < op.n; k++) {
    const c = { re: -li[k] / alpha, im: lr[k] / alpha };
    if (c.re > -0.5 && c.re < 1.5 && c.im > -1.5 && c.im < 1) out.push(c);
  }
  return out.sort((a, b) => b.im - a.im);
}

/**
 * One eigenmode with all velocity components.
 *
 * By default this is the Tollmien-Schlichting wave: the least stable mode
 * with phase speed below 0.6, which keeps clear of the centre modes near
 * c = 1 and the damped family near c = 2/3.
 *
 * The mode is normalised so that the largest streamwise velocity magnitude
 * across the channel is one and the wall-normal velocity at the centreline
 * is real and positive (for a mode whose v is odd, at the point where |v| is
 * largest instead).
 *
 * @param {Object} opts
 * @param {number} opts.re, opts.alpha
 * @param {number} [opts.beta]
 * @param {number} [opts.N] - Chebyshev degree
 * @param {(c: {re: number, im: number}) => boolean} [opts.select] - which
 *   eigenvalues are eligible; the least stable eligible one is used
 * @returns {{ c, growthRate, frequency, residual, even, y, sample(y) }}
 *   `sample(y)` returns { u, v, w } as [re, im] pairs at height y.
 */
export function orrSommerfeldMode({ re, alpha, beta = 0, N = 96, select = (c) => c.re < 0.6 }) {
  const spectrum = orrSommerfeldSpectrum({ re, alpha, beta, N });
  const c = spectrum.find(select);
  if (!c) throw new Error('No eigenvalue matches the selection');
  const op = operators({ re, alpha, beta, N });
  const { x, D, n, n1, k2, Ar, Ai, B, D2i } = op;

  // Inverse iteration on (A - lambda B) v = B b, lambda = -i alpha c, with
  // the shift nudged off the eigenvalue so the matrix stays invertible.
  const lr = alpha * c.im * (1 + 1e-7) + 1e-10, li = -alpha * c.re * (1 + 1e-7);
  const Sr = new Float64Array(n * n), Si = new Float64Array(n * n);
  for (let q = 0; q < n * n; q++) {
    Sr[q] = Ar[q] - lr * B[q];
    Si[q] = Ai[q] - li * B[q];
  }
  const solve = complexSolver(Sr, Si, n);
  let vr = Float64Array.from({ length: n }, (_, i) => 1 + 0.3 * Math.sin(1.7 * i));
  let vi = new Float64Array(n);
  const applyB = (ar, ai) => {
    const br = new Float64Array(n), bi = new Float64Array(n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        br[i] += B[i * n + j] * ar[j];
        bi[i] += B[i * n + j] * ai[j];
      }
    return [br, bi];
  };
  for (let it = 0; it < 4; it++) {
    [vr, vi] = solve(...applyB(vr, vi));
    let norm = 0;
    for (let i = 0; i < n; i++) norm = Math.max(norm, Math.hypot(vr[i], vi[i]));
    for (let i = 0; i < n; i++) { vr[i] /= norm; vi[i] /= norm; }
  }

  // Residual of A v = lambda B v with the unshifted eigenvalue.
  const l0r = alpha * c.im, l0i = -alpha * c.re;
  const [bvr, bvi] = applyB(vr, vi);
  let residual = 0, scale = 0;
  for (let i = 0; i < n; i++) {
    let sr = 0, si = 0;
    for (let j = 0; j < n; j++) {
      sr += Ar[i * n + j] * vr[j] - Ai[i * n + j] * vi[j];
      si += Ar[i * n + j] * vi[j] + Ai[i * n + j] * vr[j];
    }
    const tr = l0r * bvr[i] - l0i * bvi[i], ti = l0r * bvi[i] + l0i * bvr[i];
    residual = Math.max(residual, Math.hypot(sr - tr, si - ti));
    scale = Math.max(scale, Math.hypot(tr, ti));
  }
  residual /= scale;

  // Full-length v with the wall values, and its derivative.
  const full = (ir, ii) => {
    const fr = new Float64Array(n1), fi = new Float64Array(n1);
    fr.set(ir, 1); fi.set(ii, 1);
    return [fr, fi];
  };
  const derivative = (fr, fi) => {
    const dr = new Float64Array(n1), di = new Float64Array(n1);
    for (let i = 0; i < n1; i++)
      for (let j = 0; j < n1; j++) {
        dr[i] += D[i * n1 + j] * fr[j];
        di[i] += D[i * n1 + j] * fi[j];
      }
    return [dr, di];
  };
  let [Vr, Vi] = full(vr, vi);
  let [dVr, dVi] = derivative(Vr, Vi);

  // Squire equation for the wall-normal vorticity eta, zero on the walls:
  //   [i alpha (U - c) - (D^2 - k^2) / Re] eta = -i beta U' v
  let Er = new Float64Array(n1), Ei = new Float64Array(n1);
  if (beta !== 0) {
    const Qr = new Float64Array(n * n), Qi = new Float64Array(n * n);
    const rr = new Float64Array(n), ri = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const y = x[i + 1], U = 1 - y * y, dU = -2 * y;
      for (let j = 0; j < n; j++) Qr[i * n + j] = -(D2i[i * n + j] - (i === j ? k2 : 0)) / re;
      // i alpha (U - c) = i alpha (U - c.re) + alpha c.im
      Qr[i * n + i] += alpha * c.im;
      Qi[i * n + i] += alpha * (U - c.re);
      // -i beta U' v
      rr[i] = beta * dU * vi[i];
      ri[i] = -beta * dU * vr[i];
    }
    const [er, ei] = complexSolver(Qr, Qi, n)(rr, ri);
    [Er, Ei] = full(er, ei);
  }

  // u = i (alpha Dv - beta eta) / k^2,  w = i (beta Dv + alpha eta) / k^2
  let Ur = new Float64Array(n1), Ui = new Float64Array(n1), Wr = new Float64Array(n1), Wi = new Float64Array(n1);
  for (let i = 0; i < n1; i++) {
    const ar = alpha * dVr[i] - beta * Er[i], ai = alpha * dVi[i] - beta * Ei[i];
    const br = beta * dVr[i] + alpha * Er[i], bi = beta * dVi[i] + alpha * Ei[i];
    Ur[i] = -ai / k2; Ui[i] = ar / k2;
    Wr[i] = -bi / k2; Wi[i] = br / k2;
  }

  // Symmetry of v about the centreline (x is symmetric: x[N - j] = -x[j]).
  let evenErr = 0, oddErr = 0;
  for (let j = 0; j <= N; j++) {
    evenErr = Math.max(evenErr, Math.hypot(Vr[j] - Vr[N - j], Vi[j] - Vi[N - j]));
    oddErr = Math.max(oddErr, Math.hypot(Vr[j] + Vr[N - j], Vi[j] + Vi[N - j]));
  }
  const even = evenErr < oddErr;

  // Normalise: phase from v at the centre (or at its peak if v is odd),
  // amplitude from the peak of |u|.
  let pr, pi;
  if (even) {
    pr = interpolate(x, Vr, 0); pi = interpolate(x, Vi, 0);
  } else {
    let best = 0;
    for (let j = 0; j <= N; j++) if (Math.hypot(Vr[j], Vi[j]) > Math.hypot(Vr[best], Vi[best])) best = j;
    pr = Vr[best]; pi = Vi[best];
  }
  let umax = 0;
  for (let j = 0; j <= N; j++) umax = Math.max(umax, Math.hypot(Ur[j], Ui[j]));
  const pm = Math.hypot(pr, pi);
  // Multiply everything by conj(p) / (|p| umax).
  const fr = pr / (pm * umax), fi = -pi / (pm * umax);
  const scaleBy = (ar, ai) => {
    for (let j = 0; j <= N; j++) {
      const r = ar[j] * fr - ai[j] * fi, im = ar[j] * fi + ai[j] * fr;
      ar[j] = r; ai[j] = im;
    }
  };
  scaleBy(Vr, Vi); scaleBy(Ur, Ui); scaleBy(Wr, Wi);

  return {
    re, alpha, beta,
    c,
    /** Growth rate of the amplitude; the energy grows twice as fast. */
    growthRate: alpha * c.im,
    frequency: alpha * c.re,
    residual,
    even,
    y: x,
    u: [Ur, Ui], v: [Vr, Vi], w: [Wr, Wi],
    sample(y) {
      return {
        u: [interpolate(x, Ur, y), interpolate(x, Ui, y)],
        v: [interpolate(x, Vr, y), interpolate(x, Vi, y)],
        w: [interpolate(x, Wr, y), interpolate(x, Wi, y)],
      };
    },
  };
}
