// Weierstrass elliptic functions for the square (lemniscatic) lattice.
//
// Implements ℘(z), ℘′(z), and ζ(z) for the lattice with half-periods
// ω₁ = 1/2 and ω₂ = i/2 (invariants g₂ ≈ 189.07, g₃ = 0).
//
// All functions operate on complex numbers represented as [re, im] pairs.
//
// The implementation uses Jacobi theta functions. The nome q = e^(-π) ≈ 0.043
// is small enough that 5 terms of each series give double-precision accuracy.
//
// Mathematical references:
//   DLMF Chapter 23 — Weierstrass Elliptic Functions (https://dlmf.nist.gov/23)
//   Whittaker & Watson, A Course of Modern Analysis, Ch. 21–22

// --- Lattice constants ---

// Half-periods
const OMEGA1 = 0.5;

// Nome: q = exp(i π τ) where τ = ω₂/ω₁ = i, so q = exp(-π)
const Q = Math.exp(-Math.PI);

// η₁ = ζ(ω₁) = π/2 (from the Legendre relation for the square lattice)
const ETA1 = Math.PI / 2;

// g₂ = Γ(1/4)⁸ / (16π²)
// We compute Γ(1/4) ≈ 3.6256099082...
const GAMMA_QUARTER = 3.625609908221908;
const G2 = Math.pow(GAMMA_QUARTER, 8) / (16 * Math.PI * Math.PI);

// Roots of 4t³ - g₂t = 0: e₁ = √(g₂)/2, e₂ = 0, e₃ = -√(g₂)/2
const E1 = Math.sqrt(G2) / 2;

// Number of terms in theta series (q⁵² ≈ 1e-15, negligible)
const NTERMS = 5;

// Precompute q^((n+0.5)²) coefficients for θ₁, θ₁′, θ₁″
const THETA1_COEFFS = [];
for (let n = 0; n <= NTERMS; n++) {
  const sign = (n % 2 === 0) ? 1 : -1;
  const k = 2 * n + 1;
  const qpow = Math.pow(Q, (n + 0.5) * (n + 0.5));
  THETA1_COEFFS.push({ sign, k, qpow });
}

// --- Complex arithmetic ---

function csin(re, im) {
  return [Math.sin(re) * Math.cosh(im), Math.cos(re) * Math.sinh(im)];
}

function ccos(re, im) {
  return [Math.cos(re) * Math.cosh(im), -Math.sin(re) * Math.sinh(im)];
}

function cdiv(ar, ai, br, bi) {
  const d = br * br + bi * bi;
  return [(ar * br + ai * bi) / d, (ai * br - ar * bi) / d];
}

function clog_abs(ar, ai) {
  // Returns ln|z| = 0.5 * ln(|z|²)
  return 0.5 * Math.log(ar * ar + ai * ai);
}

// --- Theta functions ---

// θ₁(v, q) = 2 Σ_{n≥0} (-1)^n q^((n+½)²) sin((2n+1)v)
// θ₁′(v, q) = dθ₁/dv = 2 Σ_{n≥0} (-1)^n q^((n+½)²) (2n+1) cos((2n+1)v)
// θ₁″(v, q) = d²θ₁/dv² = -2 Σ_{n≥0} (-1)^n q^((n+½)²) (2n+1)² sin((2n+1)v)
//
// Returns { t1: [re,im], dt1: [re,im], d2t1: [re,im] }
function theta1WithDerivatives(vr, vi) {
  let t1r = 0, t1i = 0;
  let dt1r = 0, dt1i = 0;
  let d2t1r = 0, d2t1i = 0;

  for (let n = 0; n <= NTERMS; n++) {
    const { sign, k, qpow } = THETA1_COEFFS[n];
    const c = sign * 2 * qpow;

    const [sr, si] = csin(k * vr, k * vi);
    const [cr, ci] = ccos(k * vr, k * vi);

    t1r += c * sr;
    t1i += c * si;

    dt1r += c * k * cr;
    dt1i += c * k * ci;

    d2t1r += -c * k * k * sr;
    d2t1i += -c * k * k * si;
  }

  return {
    t1: [t1r, t1i],
    dt1: [dt1r, dt1i],
    d2t1: [d2t1r, d2t1i],
  };
}

// --- Weierstrass functions ---

// ℘(z) = -η₁/ω₁ - (π/(2ω₁))² [θ₁″(v)/θ₁(v) - (θ₁′(v)/θ₁(v))²]
// where v = πz/(2ω₁)
//
// ζ(z) = η₁z/ω₁ + (π/(2ω₁)) · θ₁′(v)/θ₁(v)
//
// Returns { p: [re,im], zeta: [re,im] }
export function weierstrassPZeta(zr, zi) {
  const scale = Math.PI / (2 * OMEGA1); // = π
  const vr = scale * zr;
  const vi = scale * zi;

  const { t1, dt1, d2t1 } = theta1WithDerivatives(vr, vi);

  // θ₁′/θ₁
  const [qr1, qi1] = cdiv(dt1[0], dt1[1], t1[0], t1[1]);
  // θ₁″/θ₁
  const [qr2, qi2] = cdiv(d2t1[0], d2t1[1], t1[0], t1[1]);

  // (θ₁′/θ₁)²
  const sq_r = qr1 * qr1 - qi1 * qi1;
  const sq_i = 2 * qr1 * qi1;

  const s2 = scale * scale; // π²

  // ℘ = -η₁/ω₁ - π² [θ₁″/θ₁ - (θ₁′/θ₁)²]
  const pr = -ETA1 / OMEGA1 - s2 * (qr2 - sq_r);
  const pi = -s2 * (qi2 - sq_i);

  // ζ = η₁z/ω₁ + π · θ₁′/θ₁
  const zeta_r = (ETA1 / OMEGA1) * zr + scale * qr1;
  const zeta_i = (ETA1 / OMEGA1) * zi + scale * qi1;

  return {
    p: [pr, pi],
    zeta: [zeta_r, zeta_i],
  };
}

// ℘′(z) via central finite differences
export function weierstrassPPrime(zr, zi) {
  const h = 1e-7;
  const { p: pp } = weierstrassPZeta(zr + h, zi);
  const { p: pm } = weierstrassPZeta(zr - h, zi);
  return [(pp[0] - pm[0]) / (2 * h), (pp[1] - pm[1]) / (2 * h)];
}

// Convenience: compute all three at once
export function weierstrassAll(zr, zi) {
  const { p, zeta } = weierstrassPZeta(zr, zi);
  const pprime = weierstrassPPrime(zr, zi);
  return { p, pprime, zeta };
}

// Export constants for use in Costa surface formulas
export { E1, G2, ETA1, OMEGA1 };
