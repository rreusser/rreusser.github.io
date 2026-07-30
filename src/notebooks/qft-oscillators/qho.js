// Quantum harmonic oscillator math for the "QFT from oscillators" notebook.
//
// Units: ħ = m = ω = 1. The dimensionless quadratures x (position) and
// p (momentum) satisfy [x, p] = i, and the vacuum state has variance 1/2 in
// each. The Wigner function uses the convention
//
//   W(x, p) = (1/π) ∫ ψ*(x+y) ψ(x−y) e^{2 i p y} dy,   with  ∬ W dx dp = 1,
//
// so the vacuum is W(x,p) = (1/π) e^{−(x²+p²)} and every W(0,0) is ±1/π.
// All closed forms below were checked against direct numerical integration of
// that defining integral to ~1e-16.

// Normalized oscillator eigenfunction ψ_n(x) (real), via the stable upward
// recurrence for Hermite functions. Avoids the overflow of raw Hermite
// polynomials, so it is accurate to large n.
export function psiN(n, x) {
  let p0 = Math.PI ** -0.25 * Math.exp(-x * x / 2); // ψ_0
  if (n === 0) return p0;
  let p1 = Math.SQRT2 * x * p0; // ψ_1
  for (let k = 2; k <= n; k++) {
    const pk = Math.sqrt(2 / k) * x * p1 - Math.sqrt((k - 1) / k) * p0;
    p0 = p1;
    p1 = pk;
  }
  return p1;
}

// Laguerre polynomial L_n(y).
export function laguerre(n, y) {
  let l0 = 1;
  let l1 = 1 - y;
  if (n === 0) return 1;
  if (n === 1) return l1;
  for (let k = 2; k <= n; k++) {
    const lk = ((2 * k - 1 - y) * l1 - (k - 1) * l0) / k;
    l0 = l1;
    l1 = lk;
  }
  return l1;
}

// Wigner function of the number (Fock) state |n⟩. Rotationally symmetric rings
// with sign-alternating central value (−1)^n / π.
export function wignerNumber(n, x, p) {
  const r2 = x * x + p * p;
  const sign = n % 2 === 0 ? 1 : -1;
  return (sign / Math.PI) * Math.exp(-r2) * laguerre(n, 2 * r2);
}

// Wigner of a coherent state: a rigid vacuum blob displaced to (x0, p0).
export function wignerCoherent(x, p, x0, p0) {
  const dx = x - x0;
  const dp = p - p0;
  return Math.exp(-(dx * dx + dp * dp)) / Math.PI;
}

// Wigner of the even cat (|α⟩ + |−α⟩)/√N, with lobes at ±(x0, p0) and
// a2 = |α|². Two Gaussian lobes plus an oscillating interference term at the
// origin whose fringes are the signature of quantum coherence.
export function wignerCat(x, p, x0, p0, a2) {
  const N = 2 * (1 + Math.exp(-2 * a2));
  const g1 = Math.exp(-((x - x0) ** 2 + (p - p0) ** 2));
  const g2 = Math.exp(-((x + x0) ** 2 + (p + p0) ** 2));
  const interf = 2 * Math.exp(-(x * x + p * p)) * Math.cos(2 * (x0 * p - p0 * x));
  return (g1 + g2 + interf) / (Math.PI * N);
}

// Coherent-state wavefunction ψ(x) = π^{-1/4} e^{i p0 x} e^{-(x-x0)²/2}, {re, im}.
export function coherentPsi(x, x0, p0) {
  const g = Math.PI ** -0.25 * Math.exp(-((x - x0) ** 2) / 2);
  return { re: g * Math.cos(p0 * x), im: g * Math.sin(p0 * x) };
}

// Even-cat wavefunction with lobes at ±(x0, p0), {re, im}.
export function catPsi(x, x0, p0, a2) {
  const N = Math.sqrt(2 * (1 + Math.exp(-2 * a2)));
  const A = coherentPsi(x, x0, p0);
  const B = coherentPsi(x, -x0, -p0);
  return { re: (A.re + B.re) / N, im: (A.im + B.im) / N };
}

// Poisson occupation P_m = e^{−n̄} n̄^m / m! (the photon-number distribution of
// a coherent state). Computed in log space for stability.
export function poisson(m, nbar) {
  if (nbar <= 0) return m === 0 ? 1 : 0;
  let logFact = 0;
  for (let k = 2; k <= m; k++) logFact += Math.log(k);
  return Math.exp(-nbar + m * Math.log(nbar) - logFact);
}

// Even-cat occupation over Fock states: only even m are populated.
export function catOccupation(m, a2) {
  if (m % 2 !== 0) return 0;
  const N = 2 * (1 + Math.exp(-2 * a2));
  // |c_m|² = |1+(-1)^m|² · e^{-a2} a2^m / m!  / N = 4 · Poisson(m) / N for even m
  return (4 * poisson(m, a2)) / N;
}
