// Elastic-rod (Kirchhoff-Love) model of the Mobius band, used to build a
// physically-motivated initial shape for the thin-shell FEM relax.
//
// This is the rod theory of Mahadevan & Keller, "The shape of a Mobius band"
// (Proc. R. Soc. Lond. A 440, 1993, 149-162). The band is treated as a bent,
// twisted elastic rod whose equilibrium is a 12th-order nonlinear two-point BVP
// (the paper's system (3.2)) for
//
//   tau, t, psi, theta, phi, x, y, z,  kappa1, kappa2
//
// with kappa1, kappa2 second order. Ordered by nondecreasing order (so COLSYS'
// requirement m_1 <= ... <= m_ncomp holds) the solution component vector is
//
//   z = [tau, t, psi, theta, phi, x, y, z, kappa1, kappa1', kappa2, kappa2'].
//
// The paper exploits the band's two-fold symmetry to solve only on s in [0, pi]
// with the half-domain boundary conditions (3.3); we do the same (via the
// injected COLSYS solveBvp, with continuation in the stiffness ratio alpha from
// the exact circular solution at alpha = beta), then reconstruct the OTHER half
// s in [pi, 2pi] by integrating the same ODE forward as an initial-value problem
// from the converged state at s = pi. That IVP lands on the full-loop boundary
// conditions (2.11) to ~1e-8 (closure, psi(2pi)=2pi, theta=pi/2, phi=pi), which
// is both the correctness check and exactly the second half of the true loop.
//
// The surface is then swept from the centerline along the cross-section's wide
// principal axis (the Euler-angle yhat), scaled so the centerline arc length
// matches the FEM rest length. solveBvp is injected (from colsys-bundle.js) so
// this module stays free of the solver's internals.

// 0-based indices into the 12-component state vector z.
const TAU = 0, TT = 1, PSI = 2, THETA = 3, PHI = 4;
const X = 5, Y = 6, Z = 7, K1 = 8, K1S = 9, K2 = 10, K2S = 11;

const NCOMP = 10;
const HALF_PI = Math.PI / 2;
const TWO_PI = 2 * Math.PI;

// Right-hand sides of the paper's system (3.2): f[i] = u_i^(m_i). Shared by the
// COLSYS problem (fsub) and the IVP extension so the two halves use identical
// dynamics.
function fvec(alpha, beta, z, f) {
  const tau = z[TAU], t = z[TT], psi = z[PSI], th = z[THETA], phi = z[PHI];
  const k1 = z[K1], k1s = z[K1S], k2 = z[K2], k2s = z[K2S];
  const st = Math.sin(th), ct = Math.cos(th);
  const sf = Math.sin(phi), cf = Math.cos(phi);
  const cot = ct / st;
  const ab = alpha - beta;

  f[0] = ab * k1 * k2;                                            // tau'
  f[1] = -alpha * k1 * k1s - beta * k2 * k2s - ab * k1 * k2 * tau; // t'
  f[2] = (-k1 * cf + k2 * sf) / st;                              // psi'
  f[3] = k1 * sf + k2 * cf;                                      // theta'
  f[4] = (k1 * cf - k2 * sf) * cot + tau;                        // phi'
  f[5] = st * Math.cos(psi);                                     // x'
  f[6] = st * Math.sin(psi);                                     // y'
  f[7] = ct;                                                     // z'
  f[8] = (-(1 - beta) * (ab * k1 * k2 * k2 + tau * k2s) +
    (alpha - 1) * tau * tau * k1 + beta * tau * k2s + t * k1) / alpha; // kappa1''
  f[9] = ((1 - alpha) * (ab * k1 * k1 * k2 + tau * k1s) +
    (beta - 1) * tau * tau * k2 - alpha * tau * k1s + t * k2) / beta;  // kappa2''
}

// Analytic Jacobian df(i,j) = d f_i / d z_j (column-major, leading dim NCOMP),
// for COLSYS' damped Newton.
function dfvec(alpha, beta, z, df) {
  df.fill(0);
  const set = (i, j, v) => { df[j * NCOMP + i] = v; };
  const tau = z[TAU], t = z[TT], psi = z[PSI], th = z[THETA], phi = z[PHI];
  const k1 = z[K1], k1s = z[K1S], k2 = z[K2], k2s = z[K2S];
  const st = Math.sin(th), ct = Math.cos(th);
  const sf = Math.sin(phi), cf = Math.cos(phi);
  const cot = ct / st;
  const ab = alpha - beta;

  set(0, K1, ab * k2); set(0, K2, ab * k1);
  set(1, TAU, -ab * k1 * k2); set(1, K1, -alpha * k1s - ab * k2 * tau);
  set(1, K1S, -alpha * k1); set(1, K2, -beta * k2s - ab * k1 * tau); set(1, K2S, -beta * k2);
  set(2, THETA, ((k1 * cf - k2 * sf) * ct) / (st * st)); set(2, PHI, (k1 * sf + k2 * cf) / st);
  set(2, K1, -cf / st); set(2, K2, sf / st);
  set(3, PHI, k1 * cf - k2 * sf); set(3, K1, sf); set(3, K2, cf);
  set(4, TAU, 1); set(4, THETA, -(k1 * cf - k2 * sf) / (st * st));
  set(4, PHI, (-k1 * sf - k2 * cf) * cot); set(4, K1, cf * cot); set(4, K2, -sf * cot);
  set(5, PSI, -st * Math.sin(psi)); set(5, THETA, ct * Math.cos(psi));
  set(6, PSI, st * Math.cos(psi)); set(6, THETA, ct * Math.sin(psi));
  set(7, THETA, -st);
  set(8, TAU, ((2 * beta - 1) * k2s + 2 * (alpha - 1) * tau * k1) / alpha);
  set(8, TT, k1 / alpha);
  set(8, K1, (-(1 - beta) * ab * k2 * k2 + (alpha - 1) * tau * tau + t) / alpha);
  set(8, K2, (-2 * (1 - beta) * ab * k1 * k2) / alpha);
  set(8, K2S, ((2 * beta - 1) * tau) / alpha);
  set(9, TAU, ((1 - 2 * alpha) * k1s + 2 * (beta - 1) * tau * k2) / beta);
  set(9, TT, k2 / beta);
  set(9, K1, (2 * (1 - alpha) * ab * k1 * k2) / beta);
  set(9, K1S, ((1 - 2 * alpha) * tau) / beta);
  set(9, K2, ((1 - alpha) * ab * k1 * k1 + (beta - 1) * tau * tau + t) / beta);
}

// Half-domain COLSYS problem (paper (3.2) + boundary conditions (3.3) on [0, pi]).
function mobiusProblem(alpha, beta) {
  // 12 BCs: 6 at s = 0, 6 at s = pi (the symmetry conditions kappa1(pi)=0,
  // kappa2'(pi)=0 break the rotational degeneracy that makes the full-loop
  // problem singular at the circle).
  const bc = [
    [X, 0], [Y, 0], [Z, 0], [PSI, 0], [THETA, HALF_PI], [PHI, 0],
    [X, 0], [Z, 0], [PSI, Math.PI], [PHI, HALF_PI], [K1, 0], [K2S, 0],
  ];
  return {
    ncomp: NCOMP,
    m: [1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
    aleft: 0,
    aright: Math.PI,
    zeta: [0, 0, 0, 0, 0, 0, Math.PI, Math.PI, Math.PI, Math.PI, Math.PI, Math.PI],
    ltol: [X + 1, Y + 1, Z + 1],   // tolerances on the coordinates x, y, z
    tol: [1e-4, 1e-4, 1e-4],
    nonlinear: true,
    fsub: (_s, z, f) => fvec(alpha, beta, z, f),
    dfsub: (_s, z, df) => dfvec(alpha, beta, z, df),
    gsub: (i, z) => z[bc[i - 1][0]] - bc[i - 1][1],
    dgsub: (i, _z, dg) => { dg.fill(0); dg[bc[i - 1][0]] = 1; },
  };
}

// Exact circular solution (4.1), valid at alpha = beta over the full range; the
// continuation's first initial guess. A planar unit circle, centre (0,1,0).
function analyticGuess(s, z, dmval) {
  const h = s / 2;
  z[TAU] = 0.5; z[TT] = 0; z[PSI] = s; z[THETA] = HALF_PI; z[PHI] = h;
  z[X] = Math.sin(s); z[Y] = 1 - Math.cos(s); z[Z] = 0;
  z[K1] = -Math.cos(h); z[K1S] = 0.5 * Math.sin(h);
  z[K2] = Math.sin(h); z[K2S] = 0.5 * Math.cos(h);
  dmval[0] = 0; dmval[1] = 0; dmval[2] = 1; dmval[3] = 0; dmval[4] = 0.5;
  dmval[5] = Math.cos(s); dmval[6] = Math.sin(s); dmval[7] = 0;
  dmval[8] = 0.25 * Math.cos(h); dmval[9] = -0.25 * Math.sin(h);
}

// Full 12-dim first-order state derivative dz/ds for the IVP extension. The
// first eight components are f directly; the curvature pairs unfold as
// kappa' = (stored kappa'),  kappa'' = f.
function stateDeriv(alpha, beta, z, dz, fScratch) {
  fvec(alpha, beta, z, fScratch);
  dz[0] = fScratch[0]; dz[1] = fScratch[1]; dz[2] = fScratch[2]; dz[3] = fScratch[3];
  dz[4] = fScratch[4]; dz[5] = fScratch[5]; dz[6] = fScratch[6]; dz[7] = fScratch[7];
  dz[8] = z[K1S]; dz[9] = fScratch[8];   // kappa1' , kappa1''
  dz[10] = z[K2S]; dz[11] = fScratch[9]; // kappa2' , kappa2''
}

// Classic RK4 over [s0, s1] in N steps, writing each visited state into `out`
// at indices [0..N] (so out has (N+1)*12 entries) along with the sample abscissae.
function integrateStates(alpha, beta, z0, s0, s1, N, outZ, outS) {
  const z = Float64Array.from(z0);
  const h = (s1 - s0) / N;
  const k1 = new Float64Array(12), k2 = new Float64Array(12);
  const k3 = new Float64Array(12), k4 = new Float64Array(12);
  const tmp = new Float64Array(12), f = new Float64Array(10);
  let s = s0;
  outS[0] = s; outZ.set(z, 0);
  for (let n = 0; n < N; n++) {
    stateDeriv(alpha, beta, z, k1, f);
    for (let i = 0; i < 12; i++) tmp[i] = z[i] + 0.5 * h * k1[i];
    stateDeriv(alpha, beta, tmp, k2, f);
    for (let i = 0; i < 12; i++) tmp[i] = z[i] + 0.5 * h * k2[i];
    stateDeriv(alpha, beta, tmp, k3, f);
    for (let i = 0; i < 12; i++) tmp[i] = z[i] + h * k3[i];
    stateDeriv(alpha, beta, tmp, k4, f);
    for (let i = 0; i < 12; i++) z[i] += (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    s += h;
    outS[n + 1] = s;
    outZ.set(z, (n + 1) * 12);
  }
}

// Tangent (zhat) and the wide cross-section principal axis (yhat) of the rod
// frame, from the Euler angles (paper (2.8)). yhat is the band's width
// direction: at alpha = beta it is in-plane at s = 0 and flips sign at s = 2pi
// (the single half-twist), matching the FEM seam's j -> nv-j identification.
function frameAxes(z, zhat, yhat) {
  const psi = z[PSI], th = z[THETA], phi = z[PHI];
  const sp = Math.sin(psi), cp = Math.cos(psi);
  const st = Math.sin(th), ct = Math.cos(th);
  const sf = Math.sin(phi), cf = Math.cos(phi);
  // zhat = tangent = (sin th cos psi, sin th sin psi, cos th)
  zhat[0] = st * cp; zhat[1] = st * sp; zhat[2] = ct;
  // yhat = (-Spsi Cphi - Cpsi Sphi Ctheta, Cpsi Cphi - Spsi Sphi Ctheta, Stheta Sphi)
  yhat[0] = -sp * cf - cp * sf * ct;
  yhat[1] = cp * cf - sp * sf * ct;
  yhat[2] = st * sf;
}

// Solve the rod BVP and return a dense, uniformly-sampled state table over
// s in [0, 2pi] together with helpers. The table makes the per-vertex frame
// lookup a cheap interpolation instead of an ODE solve per vertex.
//
//   beta     : torsional/bending ratio. The thin-strip limit is (1+nu)/2
//              (0.5 at nu=0 and 0.75 at nu=0.5, the paper's two cases).
//   alphaMax : stiffness ratio to continue to. The shape is converged to the
//              asymptotic (narrow-band) limit by alpha ~ 50 (paper figure 4).
//   samples  : table resolution per half (>= a few hundred is ample).
//
// Returns { sampleState(s, out12), maxConverged, n } where sampleState fills a
// 12-vector by linear interpolation in the table.
export function solveRodStates(solveBvp, { beta = 0.5, alphaMax = 50, samples = 1000 } = {}) {
  // Continuation in alpha from the exact circle at alpha = beta. Each solution
  // seeds the next; steps coarsen as alpha grows, as in the paper.
  const alphas = [];
  for (const a of [beta, 0.6, 0.7, 0.8, 0.9, 1, 1.5, 2, 3, 5, 10, 20, 50, 100, 200]) {
    if (a <= alphaMax + 1e-9 && (alphas.length === 0 || a > alphas[alphas.length - 1])) alphas.push(a);
  }
  if (alphas[alphas.length - 1] < alphaMax) alphas.push(alphaMax);

  let guess = analyticGuess;
  let sol = null;
  let usedAlpha = beta;
  for (const alpha of alphas) {
    sol = solveBvp({ ...mobiusProblem(alpha, beta), solutn: guess, n: 10, maxSubintervals: 200 });
    usedAlpha = alpha;
    guess = (s, z, dmval) => {
      const r = sol.evaluateWithDerivatives(s);
      z.set(r.z); dmval.set(r.dmval);
    };
  }

  // Build the dense table. First half s in [0, pi] from the converged BVP
  // solution; second half s in [pi, 2pi] by integrating the ODE forward from
  // the state at s = pi (the true other half by the two-fold symmetry).
  const half = samples;            // intervals per half
  const total = 2 * half;          // intervals over [0, 2pi]
  const tableZ = new Float64Array((total + 1) * 12);
  const tmp12 = new Float64Array(12);

  for (let i = 0; i <= half; i++) {
    const s = (Math.PI * i) / half;
    const r = sol.evaluate(s);
    tableZ.set(r, i * 12);
  }
  const zpi = sol.evaluate(Math.PI);
  // Integrate [pi, 2pi] with `half` steps, landing exactly on the table nodes.
  const ivpZ = new Float64Array((half + 1) * 12);
  const ivpS = new Float64Array(half + 1);
  integrateStates(usedAlpha, beta, zpi, Math.PI, TWO_PI, half, ivpZ, ivpS);
  for (let i = 1; i <= half; i++) tableZ.set(ivpZ.subarray(i * 12, i * 12 + 12), (half + i) * 12);

  const ds = TWO_PI / total;
  const sampleState = (s, out) => {
    let u = s % TWO_PI; if (u < 0) u += TWO_PI;
    const fi = u / ds;
    let i0 = Math.floor(fi);
    let frac = fi - i0;
    if (i0 >= total) { i0 = total - 1; frac = 1; }
    const a = i0 * 12, b = (i0 + 1) * 12;
    for (let k = 0; k < 12; k++) out[k] = tableZ[a + k] + frac * (tableZ[b + k] - tableZ[a + k]);
    return out;
  };

  // Closure / boundary-condition residual at s = 2pi, the correctness check.
  const z2 = ivpZ.subarray(half * 12, half * 12 + 12);
  const closure = Math.hypot(z2[X] - tableZ[X], z2[Y] - tableZ[Y], z2[Z] - tableZ[Z]);

  return { sampleState, tmp12, alpha: usedAlpha, beta, n: sol.n, closure };
}

// Build an FEM initial embedding from the elastic-rod solution: positions for
// every unique vertex of a createMobiusMesh, laid out by the same vid(i, j).
//
//   model : the createMobiusMesh model (provides nu, nv, length, width, vid, Nv).
//   opts  : { poisson } sets beta = (1+nu)/2; { alphaMax, samples } are passed
//           through to solveRodStates.
//
// The centerline (unit-scale, arc length 2pi) is scaled by length/(2pi) so its
// arc length matches the FEM rest length, then the strip is swept +-width/2
// along the rod's wide principal axis yhat. The result is centered at the
// origin. Returns { X, info } with info = { alpha, beta, closure, n }.
export function rodEmbedding(solveBvp, model, { poisson = 0, alphaMax = 50, samples = 1000 } = {}) {
  const { nu, nv, length, width, du, vid, Nv } = model;
  const beta = 0.5 * (1 + poisson);
  const rod = solveRodStates(solveBvp, { beta, alphaMax, samples });

  const scale = length / TWO_PI;
  // Note: the module constants X, Y, Z (= 5, 6, 7) index the state vector; the
  // output positions live in `pos` to avoid shadowing them.
  const pos = new Float64Array(Nv * 3);
  const z = rod.tmp12;
  const zhat = new Float64Array(3), yhat = new Float64Array(3);

  // The around-loop arc-length carries the rest grid's brick row stagger
  // (u = i*du + (j&1)*du/2), so the rod embedding matches the staggered rest
  // lattice with ~no membrane strain anywhere (the stagger is bounded and lines
  // up across the seam).
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j <= nv; j++) {
      const s = ((i * du + (j & 1) * 0.5 * du) / length) * TWO_PI;
      rod.sampleState(s, z);
      frameAxes(z, zhat, yhat);
      const yl = Math.hypot(yhat[0], yhat[1], yhat[2]) || 1; // renormalize yhat
      const vrel = (j / nv - 0.5) * width;
      const id = vid(i, j) * 3;
      pos[id] = scale * z[X] + (vrel * yhat[0]) / yl;
      pos[id + 1] = scale * z[Y] + (vrel * yhat[1]) / yl;
      pos[id + 2] = scale * z[Z] + (vrel * yhat[2]) / yl;
    }
  }

  // Center at the origin (the elastic energy is translation-invariant; this
  // just matches the analytic embedding's framing for the viewer).
  let mx = 0, my = 0, mz = 0;
  for (let v = 0; v < Nv; v++) { mx += pos[v * 3]; my += pos[v * 3 + 1]; mz += pos[v * 3 + 2]; }
  mx /= Nv; my /= Nv; mz /= Nv;
  for (let v = 0; v < Nv; v++) { pos[v * 3] -= mx; pos[v * 3 + 1] -= my; pos[v * 3 + 2] -= mz; }

  return { X: pos, info: { alpha: rod.alpha, beta, closure: rod.closure, n: rod.n } };
}
