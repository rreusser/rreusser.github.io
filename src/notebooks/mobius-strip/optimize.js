// Limited-memory BFGS with a strong-Wolfe line search.
// Minimizes f(x) over x in R^n. The objective callback fills the gradient in
// place. No npm imports.
//
//   fun(x, g) -> number      // returns f(x), writes grad into g (length n)
//
// The line search enforces the strong Wolfe conditions (sufficient decrease
// AND curvature) via bracketing + zoom (Nocedal & Wright, Alg. 3.5/3.6).
// This is what L-BFGS needs: it keeps every curvature pair (s, y) valid, so
// the limited-memory Hessian stays effective and convergence is fast even on
// the stiff membrane-vs-bending problem. A plain Armijo backtracking search
// starves the curvature pairs and degrades to slow scaled steepest descent.
//
// The level-1 vector kernels (dot, axpy, scal, copy, nrm2) can optionally be
// powered by an injected BLAS object `opts.blas` = { ddot, daxpy, dscal,
// dnrm2, dcopy } using the blapack base-kernel signatures. In JS this is not
// faster than the inline fallback (used when no BLAS is provided); it
// demonstrates the BLAS interface.
//
// Rigid-body directions are flat (zero-gradient) subspaces of the elastic
// energy; L-BFGS handles them naturally, so no gauge fixing is required.

export async function lbfgs(fun, x0, opts = {}) {
  const {
    maxIterations = 2000,
    m = 10,                 // history length
    gradTol = 1e-7,         // stop when ||g||_inf < gradTol
    maxStep = Infinity,     // cap on step length (||alpha*dir|| <= maxStep)
    c1 = 1e-4,              // Armijo sufficient-decrease constant
    c2 = 0.9,               // strong-Wolfe curvature constant
    maxLineSearch = 30,     // evaluations per line search
    onIterate = null,       // (iter, f, gnorm) => void
    onProgress = null,      // async ({iter,f,gInf,maxIterations,x}) => void
    yieldEvery = 25,        // call onProgress every N iterations
    blas = null,            // optional { ddot, daxpy, dscal, dnrm2, dcopy }
  } = opts;

  const n = x0.length;

  // Level-1 BLAS, injected or inline. Vectors are contiguous (stride 1,
  // offset 0). vdot=x.y, vnrm2=||x||, vaxpy: y += a x, vscal: x *= a,
  // vcopy: y = x.
  const vdot = blas
    ? (a, b) => blas.ddot(a.length, a, 1, 0, b, 1, 0)
    : (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  const vnrm2 = blas
    ? (a) => blas.dnrm2(a.length, a, 1, 0)
    : (a) => Math.sqrt(vdot(a, a));
  const vaxpy = blas
    ? (al, x, y) => blas.daxpy(x.length, al, x, 1, 0, y, 1, 0)
    : (al, x, y) => { for (let i = 0; i < x.length; i++) y[i] += al * x[i]; };
  const vscal = blas
    ? (al, x) => blas.dscal(x.length, al, x, 1, 0)
    : (al, x) => { for (let i = 0; i < x.length; i++) x[i] *= al; };
  const vcopy = blas
    ? (x, y) => blas.dcopy(x.length, x, 1, 0, y, 1, 0)
    : (x, y) => { y.set(x); };

  const x = x0.slice();
  let g = new Float64Array(n);
  let f = fun(x, g);

  const sList = []; // s_k = x_{k+1} - x_k
  const yList = []; // y_k = g_{k+1} - g_k
  const rho = [];

  const q = new Float64Array(n);
  const dir = new Float64Array(n);
  const xNew = new Float64Array(n);
  const gNew = new Float64Array(n);
  const alpha = new Float64Array(m);

  const energyHistory = [f];
  let iter = 0;
  let converged = false;

  function infNorm(a) {
    let mx = 0;
    for (let i = 0; i < a.length; i++) mx = Math.max(mx, Math.abs(a[i]));
    return mx;
  }

  // phi(a) = f(x + a dir); phi'(a) = grad f(x + a dir) . dir. Evaluating also
  // leaves xNew/gNew set to that step, so the accepted step needs no re-eval.
  let phiF = 0, phiD = 0;
  function phi(a) {
    vcopy(x, xNew);
    vaxpy(a, dir, xNew); // xNew = x + a dir
    phiF = fun(xNew, gNew);
    phiD = vdot(gNew, dir);
  }

  // Strong-Wolfe line search. Returns the accepted step length, or <= 0 on
  // failure. dir must be a descent direction (d0 < 0).
  function lineSearch(f0, d0, aMax) {
    const wolfe = (a) =>
      phiF <= f0 + c1 * a * d0 && Math.abs(phiD) <= c2 * (-d0);

    // zoom between aLo (lower phi, satisfies sufficient decrease) and aHi.
    function zoom(aLo, fLo, aHi) {
      for (let k = 0; k < maxLineSearch; k++) {
        const aj = 0.5 * (aLo + aHi); // robust bisection
        phi(aj);
        if (phiF > f0 + c1 * aj * d0 || phiF >= fLo) {
          aHi = aj;
        } else {
          if (Math.abs(phiD) <= c2 * (-d0)) return aj;       // strong Wolfe
          if (phiD * (aHi - aLo) >= 0) aHi = aLo;
          aLo = aj; fLo = phiF;
        }
        if (Math.abs(aHi - aLo) < 1e-12) return aj;
      }
      return aLo > 0 ? aLo : -1;
    }

    let aPrev = 0, fPrev = f0;
    let a = Math.min(1, aMax);
    for (let i = 0; i < maxLineSearch; i++) {
      phi(a);
      if (phiF > f0 + c1 * a * d0 || (i > 0 && phiF >= fPrev)) {
        return zoom(aPrev, fPrev, a);
      }
      if (Math.abs(phiD) <= c2 * (-d0)) return a;             // strong Wolfe
      if (phiD >= 0) return zoom(a, phiF, aPrev);
      aPrev = a; fPrev = phiF;
      if (a >= aMax) return a; // best effort at the cap
      a = Math.min(2 * a, aMax);
    }
    return a;
  }

  for (iter = 0; iter < maxIterations; iter++) {
    const gInf = infNorm(g);
    if (onIterate) onIterate(iter, f, gInf);
    if (onProgress && iter % yieldEvery === 0) {
      await onProgress({ iter, f, gInf, maxIterations, x });
    }
    if (gInf < gradTol) { converged = true; break; }

    // Two-loop recursion for the search direction r = -H g.
    vcopy(g, q);
    const k = sList.length;
    for (let i = k - 1; i >= 0; i--) {
      alpha[i] = rho[i] * vdot(sList[i], q);
      vaxpy(-alpha[i], yList[i], q); // q += -alpha * y
    }
    let gamma = 1;
    if (k > 0) {
      const s = sList[k - 1], y = yList[k - 1];
      const yy = vdot(y, y);
      if (yy > 1e-300) gamma = vdot(s, y) / yy;
    }
    vcopy(q, dir);
    vscal(gamma, dir);
    for (let i = 0; i < k; i++) {
      const beta = rho[i] * vdot(yList[i], dir);
      vaxpy(alpha[i] - beta, sList[i], dir); // dir += (alpha - beta) * s
    }
    vscal(-1, dir); // descent direction

    let gd = vdot(g, dir);
    if (!(gd < 0)) { // not a descent direction: steepest descent
      vcopy(g, dir);
      vscal(-1, dir);
      gd = -vdot(g, g);
    }

    const dnorm = vnrm2(dir);
    const aMax = Number.isFinite(maxStep) && dnorm > 0
      ? Math.min(1e8, maxStep / dnorm) : 1e8;

    const aStar = lineSearch(f, gd, aMax);
    if (!(aStar > 0) || !Number.isFinite(phiF)) {
      // Line search failed: drop history and retry with steepest descent.
      if (sList.length > 0) {
        sList.length = 0; yList.length = 0; rho.length = 0;
        continue;
      }
      break;
    }
    // xNew / gNew already hold the accepted step (last phi() evaluation).

    // Curvature pair (skip if not positive curvature).
    const s = new Float64Array(n);
    const y = new Float64Array(n);
    vcopy(xNew, s); vaxpy(-1, x, s);  // s = xNew - x
    vcopy(gNew, y); vaxpy(-1, g, y);  // y = gNew - g
    const sy = vdot(s, y);
    if (sy > 1e-12 * vnrm2(s) * vnrm2(y)) {
      sList.push(s); yList.push(y); rho.push(1 / sy);
      if (sList.length > m) { sList.shift(); yList.shift(); rho.shift(); }
    }

    vcopy(xNew, x);
    vcopy(gNew, g);
    f = phiF;
    energyHistory.push(f);
  }

  return { x, f, g, iterations: iter, converged, energyHistory };
}

// Truncated Newton with conjugate-gradient inner solves (Newton-CG).
// L-BFGS uses only gradients and converges very slowly on the thin-shell
// energy (a long, curved, soft valley from the near-inextensible bending
// modes set against the much stiffer membrane). Newton-CG uses curvature via
// Hessian-vector products formed by central finite differences of the
// analytic gradient (two gradient evaluations each, no assembled Hessian),
// with an inexact-Newton forcing sequence for near-superlinear convergence
// and a negative-curvature safeguard for the rigid-body null space and any
// nonconvexity. It reaches the same equilibrium in tens of outer iterations
// instead of thousands.
//
// Same signature/return shape as lbfgs; reuses the injected BLAS kernels.
export async function newtonCG(fun, x0, opts = {}) {
  const {
    maxIterations = 200,    // outer Newton iterations
    gradTol = 1e-7,
    maxStep = Infinity,
    c1 = 1e-4,
    backtrack = 0.5,
    maxLineSearch = 30,
    maxCG = 250,            // inner CG iterations cap
    onIterate = null,
    onProgress = null,
    yieldEvery = 1,         // outer iterations are few; yield each
    blas = null,
  } = opts;

  const n = x0.length;
  const vdot = blas
    ? (a, b) => blas.ddot(a.length, a, 1, 0, b, 1, 0)
    : (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  const vnrm2 = blas
    ? (a) => blas.dnrm2(a.length, a, 1, 0)
    : (a) => Math.sqrt(vdot(a, a));
  const vaxpy = blas
    ? (al, a, b) => blas.daxpy(a.length, al, a, 1, 0, b, 1, 0)
    : (al, a, b) => { for (let i = 0; i < a.length; i++) b[i] += al * a[i]; };
  const vscal = blas
    ? (al, a) => blas.dscal(a.length, al, a, 1, 0)
    : (al, a) => { for (let i = 0; i < a.length; i++) a[i] *= al; };
  const vcopy = blas
    ? (a, b) => blas.dcopy(a.length, a, 1, 0, b, 1, 0)
    : (a, b) => { b.set(a); };
  const infNorm = (a) => {
    let mx = 0;
    for (let i = 0; i < a.length; i++) mx = Math.max(mx, Math.abs(a[i]));
    return mx;
  };

  const x = x0.slice();
  let g = new Float64Array(n);
  let f = fun(x, g);
  const energyHistory = [f];

  const gp = new Float64Array(n);
  const gm = new Float64Array(n);
  const xp = new Float64Array(n);
  const Hp = new Float64Array(n);   // H * p
  const r = new Float64Array(n);    // CG residual
  const p = new Float64Array(n);    // CG direction
  const d = new Float64Array(n);    // Newton step (CG iterate)
  const xTrial = new Float64Array(n);
  const gTrial = new Float64Array(n);

  // Hessian-vector product via central differences of the analytic gradient.
  function hessVec(v, out) {
    const vn = vnrm2(v);
    if (vn < 1e-300) { out.fill(0); return; }
    const eps = 1e-6 * (1 + vnrm2(x)) / vn;
    vcopy(x, xp); vaxpy(eps, v, xp); fun(xp, gp);
    vcopy(x, xp); vaxpy(-eps, v, xp); fun(xp, gm);
    const inv = 1 / (2 * eps);
    for (let i = 0; i < n; i++) out[i] = (gp[i] - gm[i]) * inv;
  }

  let iter = 0;
  let converged = false;
  for (iter = 0; iter < maxIterations; iter++) {
    const gInf = infNorm(g);
    if (onIterate) onIterate(iter, f, gInf);
    if (onProgress && iter % yieldEvery === 0) {
      await onProgress({ iter, f, gInf, maxIterations, x });
    }
    if (gInf < gradTol) { converged = true; break; }

    // Inexact-Newton CG solve of H d = -g. Forcing: ||r|| <= eta ||g||,
    // eta = min(0.5, sqrt(||g||)) for near-superlinear convergence.
    const gNorm = vnrm2(g);
    const eta = Math.min(0.5, Math.sqrt(gNorm));
    const tol = eta * gNorm;
    d.fill(0);
    vcopy(g, r); vscal(-1, r);  // r = -g
    vcopy(r, p);
    let rr = vdot(r, r);
    let cg = 0;
    for (cg = 0; cg < maxCG; cg++) {
      if (Math.sqrt(rr) <= tol) break;
      hessVec(p, Hp);
      const pHp = vdot(p, Hp);
      if (pHp <= 1e-12 * vdot(p, p)) {
        // Non-positive curvature (rigid null space / nonconvexity): take the
        // step so far, or steepest descent on the very first inner step.
        if (cg === 0) { vcopy(g, d); vscal(-1, d); }
        break;
      }
      const a = rr / pHp;
      vaxpy(a, p, d);          // d += a p
      vaxpy(-a, Hp, r);        // r -= a H p
      const rrNew = vdot(r, r);
      const beta = rrNew / rr;
      vscal(beta, p); vaxpy(1, r, p); // p = r + beta p
      rr = rrNew;
    }

    // Ensure descent; fall back to steepest descent if CG produced none.
    let gd = vdot(g, d);
    if (!(gd < 0)) { vcopy(g, d); vscal(-1, d); gd = -vdot(g, g); }

    // Backtracking line search (Newton step is well-scaled; full step first).
    const dn = vnrm2(d);
    let t = (Number.isFinite(maxStep) && dn > 0)
      ? Math.min(1, maxStep / dn) : 1;
    let fT = f, ok = false;
    for (let ls = 0; ls < maxLineSearch; ls++) {
      vcopy(x, xTrial); vaxpy(t, d, xTrial);
      fT = fun(xTrial, gTrial);
      if (Number.isFinite(fT) && fT <= f + c1 * t * gd) { ok = true; break; }
      t *= backtrack;
    }
    if (!ok) break; // cannot make progress

    vcopy(xTrial, x);
    vcopy(gTrial, g);
    f = fT;
    energyHistory.push(f);
  }

  return { x, f, g, iterations: iter, converged, energyHistory };
}
