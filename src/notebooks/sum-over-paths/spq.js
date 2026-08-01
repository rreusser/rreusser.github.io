// Math for the sum-over-paths (Feynman "quantum stopwatch") notebook.
//
// One device runs through everything: a unit "arrow" (phasor) e^{iφ} that
// rotates as a particle explores a path, by an angle equal to the classical
// action along that path in units of ħ. Amplitudes are these arrows added
// tip-to-tail; probability is the squared length of the resultant.
//
// Units: ħ = 1 unless a mass/length scale is passed explicitly.

// --- complex arrows ---
export const cadd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
export const cmul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
export const cscale = (a, s) => ({ re: a.re * s, im: a.im * s });
export const arrow = (phi, len = 1) => ({ re: len * Math.cos(phi), im: len * Math.sin(phi) });
export const cabs = (a) => Math.hypot(a.re, a.im);
export const cabs2 = (a) => a.re * a.re + a.im * a.im;
export const carg = (a) => Math.atan2(a.im, a.re);

// --- classical action ---
// Discretized worldline nodes [{t, x}] for a particle of mass m in a uniform
// field g (e.g. gravity): S = Σ [ ½ m (Δx/Δt)² − m g x_mid ] Δt.
export function actionUniformField(nodes, m, g) {
  let S = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    const dt = nodes[i + 1].t - nodes[i].t;
    if (dt <= 0) continue;
    const v = (nodes[i + 1].x - nodes[i].x) / dt;
    const xMid = 0.5 * (nodes[i].x + nodes[i + 1].x);
    S += (0.5 * m * v * v - m * g * xMid) * dt;
  }
  return S;
}

// Classical worldline for a uniform field between fixed endpoints (least action).
// x(t) = xa + v0 (t-ta) - ½ g (t-ta)²  with v0 fixed by hitting (xb,tb).
export function classicalUniformField(xa, ta, xb, tb, g) {
  const T = tb - ta;
  const v0 = (xb - xa) / T + 0.5 * g * T;
  return (t) => xa + v0 * (t - ta) - 0.5 * g * (t - ta) * (t - ta);
}

// Free-particle action for a two-segment worldline A→(tm,xm)→B (PE = 0).
export function actionFree2(xa, ta, xm, tm, xb, tb, m) {
  const v1 = (xm - xa) / (tm - ta);
  const v2 = (xb - xm) / (tb - tm);
  return 0.5 * m * v1 * v1 * (tm - ta) + 0.5 * m * v2 * v2 * (tb - tm);
}

// Free-particle propagator (ħ = 1):
//   K(Δx, T) = sqrt(m/(2π T)) · e^{-iπ/4} · e^{ i m Δx² / (2T) }.
// This is exactly Eq. (8) of Taylor et al. with h = 2πħ.
export function freePropagator(dx, T, m = 1) {
  const amp = Math.sqrt(m / (2 * Math.PI * T));
  const phase = (m * dx * dx) / (2 * T) - Math.PI / 4;
  return { re: amp * Math.cos(phase), im: amp * Math.sin(phase) };
}

// Propagate a discrete wavefunction (array of {re,im} on a uniform x grid of
// spacing dx) forward by time T using the free propagator — literally the
// tip-to-tail sum of arrows the paper describes.
export function propagateFree(psi0, xs, dx, T, m = 1) {
  const N = xs.length;
  const out = new Array(N);
  for (let b = 0; b < N; b++) {
    let re = 0, im = 0;
    const xb = xs[b];
    for (let a = 0; a < N; a++) {
      const K = freePropagator(xb - xs[a], T, m);
      const p = psi0[a];
      re += K.re * p.re - K.im * p.im;
      im += K.re * p.im + K.im * p.re;
    }
    out[b] = { re: re * dx, im: im * dx };
  }
  return out;
}

// Same result on a uniform grid, but the propagator depends only on the
// separation (b−a), so the kernel is precomputed once per call: O(N) stopwatch
// evaluations instead of O(N²). Fast enough to run every animation frame.
export function propagateFreeUniform(psi0, dx, T, m = 1) {
  const N = psi0.length;
  const K = new Array(2 * N - 1);
  for (let d = -(N - 1); d <= N - 1; d++) K[d + N - 1] = freePropagator(d * dx, T, m);
  const out = new Array(N);
  for (let b = 0; b < N; b++) {
    let re = 0, im = 0;
    for (let a = 0; a < N; a++) {
      const k = K[b - a + N - 1];
      const p = psi0[a];
      re += k.re * p.re - k.im * p.im;
      im += k.re * p.im + k.im * p.re;
    }
    out[b] = { re: re * dx, im: im * dx };
  }
  return out;
}

// --- harmonic oscillator (for stationary states) ---
// Normalized oscillator eigenfunction ψ_n(x) (real), stable recurrence.
export function psiN(n, x) {
  let p0 = Math.PI ** -0.25 * Math.exp(-x * x / 2);
  if (n === 0) return p0;
  let p1 = Math.SQRT2 * x * p0;
  for (let k = 2; k <= n; k++) {
    const pk = Math.sqrt(2 / k) * x * p1 - Math.sqrt((k - 1) / k) * p0;
    p0 = p1;
    p1 = pk;
  }
  return p1;
}

// Oscillator energy E_n = n + ½ (ħ = ω = 1).
export const energyN = (n) => n + 0.5;
