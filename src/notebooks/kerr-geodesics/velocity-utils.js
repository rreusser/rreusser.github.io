// Utility functions for converting between initial spatial velocity
// and constants of motion (E, L, Q), and between Boyer-Lindquist and
// Cartesian velocity representations.

// --- Kerr metric components at (r, θ) ---

function metricComponents(r, theta, M, a) {
  const r2 = r * r;
  const a2 = a * a;
  const sth = Math.sin(theta);
  const cth = Math.cos(theta);
  const sth2 = sth * sth;
  const Sigma = r2 + a2 * cth * cth;
  const Delta = r2 - 2 * M * r + a2;
  const A = (r2 + a2) ** 2 - a2 * Delta * sth2;

  return {
    Sigma, Delta,
    g_tt: -(1 - 2 * M * r / Sigma),
    g_tphi: -2 * M * a * r * sth2 / Sigma,
    g_rr: Sigma / Delta,
    g_thth: Sigma,
    g_phiphi: A * sth2 / Sigma,
  };
}

// --- Velocity → constants of motion ---
// Given spatial velocity (u^r, u^θ, u^φ) at position (r₀, θ₀),
// solve g_μν u^μ u^ν = -κ for u^t, then compute E, L, Q.
//
// The equation g_tt (u^t)² + 2 g_tφ u^t u^φ + g_φφ (u^φ)² + g_rr (u^r)² + g_θθ (u^θ)² = -κ
// is a quadratic in u^t. We pick the future-directed root (u^t > 0).

export function velocityToConstants(r, theta, ur, utheta, uphi, M, a, kappa) {
  const g = metricComponents(r, theta, M, a);

  // Spatial part of norm
  const spatial = g.g_rr * ur * ur + g.g_thth * utheta * utheta + g.g_phiphi * uphi * uphi;

  // Quadratic: g_tt ut² + 2 g_tφ ut uφ + (spatial + κ) = 0
  const A = g.g_tt;
  const B = 2 * g.g_tphi * uphi;
  const C = spatial + kappa;

  const disc = B * B - 4 * A * C;
  if (disc < 0) return null; // no valid solution

  // Pick future-directed root: g_tt < 0 in BL coordinates outside ergo,
  // so we want the positive root
  const sqrtDisc = Math.sqrt(disc);
  const ut1 = (-B + sqrtDisc) / (2 * A);
  const ut2 = (-B - sqrtDisc) / (2 * A);
  const ut = ut1 > 0 ? ut1 : ut2;

  if (ut <= 0) return null;

  // Covariant components from u^μ
  const pt = g.g_tt * ut + g.g_tphi * uphi;
  const pphi = g.g_tphi * ut + g.g_phiphi * uphi;

  const E = -pt;
  const L = pphi;

  // Carter constant: Q = p_θ² + cos²θ (a²(κ - E²) + L²/sin²θ)
  const ptheta = g.g_thth * utheta;
  const cth = Math.cos(theta);
  const sth = Math.sin(theta);
  const Q = ptheta * ptheta + cth * cth * (a * a * (kappa - E * E) + L * L / (sth * sth));

  return { E, L, Q, ut };
}

// --- Constants of motion → velocity ---
// Given (E, L, Q, kappa) at (r₀, θ₀), recover spatial velocity (u^r, u^θ, u^φ).

export function constantsToVelocity(r, theta, E, L, Q, M, a, kappa, signR, signTheta) {
  const g = metricComponents(r, theta, M, a);
  const r2 = r * r;
  const a2 = a * a;
  const r2a2 = r2 + a2;
  const cth = Math.cos(theta);
  const sth = Math.sin(theta);

  // R(r) = P² - Δ [κr² + (L-aE)² + Q]
  const P = E * r2a2 - a * L;
  const R = P * P - g.Delta * (kappa * r2 + (L - a * E) ** 2 + Q);
  const vr = R > 0 ? signR * Math.sqrt(R) : 0;

  // Θ(θ) = Q + a²(E²-κ)cos²θ - L²cot²θ
  const Theta = Q + a2 * (E * E - kappa) * cth * cth - L * L * cth * cth / (sth * sth);
  const vth = Theta > 0 ? signTheta * Math.sqrt(Theta) : 0;

  // v_r and v_θ are Mino-time velocities (dr/dλ, dθ/dλ).
  // Proper-time velocities: u^r = v_r/Σ, u^θ = v_θ/Σ
  const ur = vr / g.Sigma;
  const utheta = vth / g.Sigma;

  // u^φ from the inverse metric: u^φ = g^{φφ}L + g^{φt}(-E)
  // Inverse metric components for Kerr:
  const SD = g.Sigma * g.Delta;
  const gup_tt = -(r2a2 * r2a2 - a2 * g.Delta * sth * sth) / SD;
  const gup_tphi = -2 * M * a * r / SD;
  const gup_phiphi = (g.Delta - a2 * sth * sth) / (SD * sth * sth);
  const uphi = gup_tphi * (-E) + gup_phiphi * L;

  return { ur, utheta, uphi, vr, vth };
}

// --- Cartesian → Boyer-Lindquist position ---
// Inverts the oblate spheroidal transform (y-up convention).
// x = ρ sinθ cosφ, y = r cosθ, z = ρ sinθ sinφ, ρ = √(r² + a²)

export function cartesianToBL(x, y, z, a) {
  const R2 = x * x + y * y + z * z;
  const a2 = a * a;
  // Solve r⁴ - (R² - a²)r² - a²y² = 0  (quadratic in u = r²)
  const b = R2 - a2;
  const disc = b * b + 4 * a2 * y * y;
  const u = (b + Math.sqrt(disc)) / 2;
  const r = Math.sqrt(Math.max(0, u));
  const theta = r > 1e-12 ? Math.acos(Math.max(-1, Math.min(1, y / r))) : Math.PI / 2;
  const phi = Math.atan2(z, x);
  return { r, theta, phi };
}

// --- Boyer-Lindquist ↔ Cartesian position ---

export function blToCartesian(r, theta, phi, a) {
  const sth = Math.sin(theta);
  const rho = Math.sqrt(r * r + a * a);
  return [rho * sth * Math.cos(phi), r * Math.cos(theta), rho * sth * Math.sin(phi)];
}

// --- Jacobian ∂(x,y,z)/∂(r,θ,φ) ---
// Maps velocity in BL (u^r, u^θ, u^φ) → Cartesian (dx/dt, dy/dt, dz/dt)

export function blToCartesianJacobian(r, theta, phi, a) {
  const sth = Math.sin(theta);
  const cth = Math.cos(theta);
  const cphi = Math.cos(phi);
  const sphi = Math.sin(phi);
  const a2 = a * a;
  const rho = Math.sqrt(r * r + a2);
  const drho_dr = r / rho;

  // x = ρ sinθ cosφ
  const dx_dr = drho_dr * sth * cphi;
  const dx_dth = rho * cth * cphi;
  const dx_dphi = -rho * sth * sphi;

  // y = r cosθ  (spin axis)
  const dy_dr = cth;
  const dy_dth = -r * sth;
  const dy_dphi = 0;

  // z = ρ sinθ sinφ
  const dz_dr = drho_dr * sth * sphi;
  const dz_dth = rho * cth * sphi;
  const dz_dphi = rho * sth * cphi;

  return [
    [dx_dr, dx_dth, dx_dphi],
    [dy_dr, dy_dth, dy_dphi],
    [dz_dr, dz_dth, dz_dphi],
  ];
}

// --- Transform BL velocity to Cartesian ---

export function blVelocityToCartesian(r, theta, phi, a, ur, utheta, uphi) {
  const J = blToCartesianJacobian(r, theta, phi, a);
  return [
    J[0][0] * ur + J[0][1] * utheta + J[0][2] * uphi,
    J[1][0] * ur + J[1][1] * utheta + J[1][2] * uphi,
    J[2][0] * ur + J[2][1] * utheta + J[2][2] * uphi,
  ];
}

// --- Transform Cartesian velocity to BL ---
// Inverts the 3x3 Jacobian

export function cartesianVelocityToBL(r, theta, phi, a, vx, vy, vz) {
  const J = blToCartesianJacobian(r, theta, phi, a);

  // 3x3 matrix inversion
  const [a11, a12, a13] = J[0];
  const [a21, a22, a23] = J[1];
  const [a31, a32, a33] = J[2];

  const det = a11 * (a22 * a33 - a23 * a32)
            - a12 * (a21 * a33 - a23 * a31)
            + a13 * (a21 * a32 - a22 * a31);

  const invDet = 1 / det;

  const ur = invDet * ((a22 * a33 - a23 * a32) * vx + (a13 * a32 - a12 * a33) * vy + (a12 * a23 - a13 * a22) * vz);
  const uth = invDet * ((a23 * a31 - a21 * a33) * vx + (a11 * a33 - a13 * a31) * vy + (a13 * a21 - a11 * a23) * vz);
  const uph = invDet * ((a21 * a32 - a22 * a31) * vx + (a12 * a31 - a11 * a32) * vy + (a11 * a22 - a12 * a21) * vz);

  return { ur, utheta: uth, uphi: uph };
}
