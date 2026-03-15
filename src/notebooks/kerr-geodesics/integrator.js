// Kerr geodesic integrator using the first-order Mino-time equations
// recast as a smooth second-order system with adaptive Cash-Karp RK4(5).
//
// Mino time λ: dτ/dλ = Σ, decoupling r and θ motions.
// State: [t, r, θ, φ, v_r, v_θ] where v_r = dr/dλ, v_θ = dθ/dλ.
// The "velocities" v_r and v_θ smoothly pass through zero at turning
// points — no sign tracking needed.
//
// Equations of motion:
//   dr/dλ = v_r
//   dv_r/dλ = R'(r)/2
//   dθ/dλ = v_θ
//   dv_θ/dλ = Θ'(θ)/2
//   dt/dλ = T_r(r) + T_θ(θ)
//   dφ/dλ = Φ_r(r) + Φ_θ(θ)
//
// R(r) = P² - Δ·[κr² + (L-aE)² + Q],  P = E(r²+a²) - aL
// Θ(θ) = Q + a²(E²-κ)cos²θ - L²cot²θ

// --- Potentials and their derivatives ---

export function radialPotential(r, params) {
  const { M, a, E, L, Q, kappa } = params;
  const r2 = r * r;
  const a2 = a * a;
  const r2a2 = r2 + a2;
  const Delta = r2 - 2 * M * r + a2;
  const P = E * r2a2 - a * L;
  const Cr = kappa * r2 + (L - a * E) ** 2 + Q;
  return P * P - Delta * Cr;
}

export function radialPotentialDeriv(r, params) {
  const { M, a, E, L, Q, kappa } = params;
  const r2 = r * r;
  const a2 = a * a;
  const r2a2 = r2 + a2;
  const Delta = r2 - 2 * M * r + a2;
  const P = E * r2a2 - a * L;
  const Pp = 2 * r * E;          // dP/dr
  const DeltaP = 2 * r - 2 * M;  // dΔ/dr
  const Cr = kappa * r2 + (L - a * E) ** 2 + Q;
  const CrP = 2 * kappa * r;     // dC_r/dr
  return 2 * P * Pp - DeltaP * Cr - Delta * CrP;
}

export function thetaPotential(theta, params) {
  const { a, E, L, Q, kappa } = params;
  const cth = Math.cos(theta);
  const sth = Math.sin(theta);
  return Q + a * a * (E * E - kappa) * cth * cth - L * L * cth * cth / (sth * sth);
}

function thetaPotentialDeriv(theta, params) {
  const { a, E, L, kappa } = params;
  const cth = Math.cos(theta);
  const sth = Math.sin(theta);
  // dΘ/dθ = -2a²(E²-κ)sinθcosθ + 2L²cosθ/sin³θ
  return -2 * a * a * (E * E - kappa) * sth * cth + 2 * L * L * cth / (sth * sth * sth);
}

// --- Equations of motion ---

function kerrDerivatives(s, params) {
  const { M, a, E, L } = params;
  const t = s[0], r = s[1], theta = s[2], phi = s[3], vr = s[4], vth = s[5];

  const r2 = r * r;
  const a2 = a * a;
  const r2a2 = r2 + a2;
  const Delta = r2 - 2 * M * r + a2;
  const P = E * r2a2 - a * L;
  const sth = Math.sin(theta);
  const sth2 = sth * sth;

  // Position rates
  const drdt = vr;
  const dthetadt = vth;

  // Velocity rates (smooth through turning points)
  const dvrdt = radialPotentialDeriv(r, params) / 2;
  const dvthdt = thetaPotentialDeriv(theta, params) / 2;

  // Coordinate time and azimuthal angle
  const Tr = r2a2 * P / Delta;
  const Tth = a * (L - a * E * sth2);
  const dtdt = Tr + Tth;

  const Phir = a * P / Delta;
  const Phith = L / sth2 - a * E;
  const dphidt = Phir + Phith;

  return [dtdt, drdt, dthetadt, dphidt, dvrdt, dvthdt];
}

// --- Cash-Karp RK4(5) adaptive integrator ---
// Returns { y, err } where err is the max relative error estimate.

const CK_A = [0, 1 / 5, 3 / 10, 3 / 5, 1, 7 / 8];
const CK_B = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [3 / 10, -9 / 10, 6 / 5],
  [-11 / 54, 5 / 2, -70 / 27, 35 / 27],
  [1631 / 55296, 175 / 512, 575 / 13824, 44275 / 110592, 253 / 4096],
];
// 5th-order weights
const CK_C5 = [37 / 378, 0, 250 / 621, 125 / 594, 0, 512 / 1771];
// 4th-order weights
const CK_C4 = [2825 / 27648, 0, 18575 / 48384, 13525 / 55296, 277 / 14336, 1 / 4];

function rkck45Step(s, h, params) {
  const n = s.length;
  const k = new Array(6);

  k[0] = kerrDerivatives(s, params);

  for (let stage = 1; stage < 6; stage++) {
    const stmp = new Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < stage; j++) sum += CK_B[stage][j] * k[j][i];
      stmp[i] = s[i] + h * sum;
    }
    k[stage] = kerrDerivatives(stmp, params);
  }

  // 5th-order solution (used as the result)
  const y5 = new Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < 6; j++) sum += CK_C5[j] * k[j][i];
    y5[i] = s[i] + h * sum;
  }

  // Error estimate: |y5 - y4|
  let errMax = 0;
  for (let i = 0; i < n; i++) {
    let diff = 0;
    for (let j = 0; j < 6; j++) diff += (CK_C5[j] - CK_C4[j]) * k[j][i];
    const scale = Math.max(Math.abs(s[i]), Math.abs(y5[i]), 1e-10);
    errMax = Math.max(errMax, Math.abs(h * diff) / scale);
  }

  return { y: y5, err: errMax };
}

function adaptiveStep(s, h, params, tol) {
  const SAFETY = 0.9;
  const HMIN = 1e-12;
  const HMAX = 2.0;
  const GROW = 5.0;
  const SHRINK = 0.1;

  let attempt = 0;
  while (attempt++ < 50) {
    const { y, err } = rkck45Step(s, h, params);
    const ratio = tol / Math.max(err, 1e-30);

    if (err <= tol || Math.abs(h) <= HMIN) {
      // Accept step; compute next h
      const hNext = (ratio > 1)
        ? Math.min(h * Math.min(SAFETY * Math.pow(ratio, 0.2), GROW), HMAX)
        : h * Math.max(SAFETY * Math.pow(ratio, 0.25), SHRINK);
      return { y, hNext: Math.max(Math.abs(hNext), HMIN) * Math.sign(h) };
    }

    // Reject step; shrink h
    h = h * Math.max(SAFETY * Math.pow(ratio, 0.25), SHRINK);
    if (Math.abs(h) < HMIN) h = HMIN * Math.sign(h);
  }

  // Fallback: accept whatever we have
  const { y } = rkck45Step(s, h, params);
  return { y, hNext: h };
}

// --- Conservation diagnostics ---

export function hamiltonian(s, params) {
  const { M, a, E, L, kappa } = params;
  const r = s[1], theta = s[2];
  const vr = s[4], vth = s[5];
  const r2 = r * r;
  const a2 = a * a;
  const sth = Math.sin(theta);
  const cth = Math.cos(theta);
  const Sigma = r2 + a2 * cth * cth;
  const Delta = r2 - 2 * M * r + a2;

  // Recover canonical momenta from Mino-time velocities:
  // dr/dλ = v_r = ±√R,  dr/dτ = v_r/Σ,  p_r = (Σ/Δ)·dr/dτ = v_r/Δ
  // dθ/dλ = v_θ = ±√Θ,  dθ/dτ = v_θ/Σ,  p_θ = Σ·dθ/dτ = v_θ
  const pr = vr / Delta;
  const pth = vth;

  const pt = -E, pphi = L;

  const sth2 = sth * sth;
  const r2a2 = r2 + a2;
  const SD = Sigma * Delta;

  const gtt = -(r2a2 * r2a2 - a2 * Delta * sth2) / SD;
  const gtphi = -2 * M * a * r / SD;
  const grr = Delta / Sigma;
  const gthth = 1 / Sigma;
  const gphiphi = (Delta - a2 * sth2) / (SD * sth2);

  return 0.5 * (gtt * pt * pt + 2 * gtphi * pt * pphi + grr * pr * pr + gthth * pth * pth + gphiphi * pphi * pphi);
}

export function carterQ(s, params) {
  const { a, E, L, kappa } = params;
  const theta = s[2], vth = s[5];
  const pth = vth;
  const costh = Math.cos(theta);
  const sinth = Math.sin(theta);
  // Θ = Q + a²(E²-κ)cos²θ - L²cot²θ, and vth² = Θ, so:
  // Q = vth² - a²(E²-κ)cos²θ + L²cot²θ
  return pth * pth - costh * costh * (a * a * (E * E - kappa) - L * L / (sinth * sinth));
}

// Convert Boyer-Lindquist to Cartesian
function blToCartesian(r, theta, phi, a) {
  const sth = Math.sin(theta);
  const rho = Math.sqrt(r * r + a * a);
  return [rho * sth * Math.cos(phi), r * Math.cos(theta), rho * sth * Math.sin(phi)];
}

// --- Main integration function ---

export function integrateGeodesic(config) {
  const {
    M = 1, a = 0.9, E = 0.95, L = 3.0, Q = 2.0, kappa = 1,
    r0 = 10, theta0 = Math.PI / 2, signR = -1, signTheta = 1,
    h: h0 = 0.1, nSteps = 8000, tolerance = 1e-8,
  } = config;

  const params = { M, a, E, L, Q, kappa };
  const rPlus = M + Math.sqrt(M * M - a * a);

  // Initial velocities from potentials
  const R0 = radialPotential(r0, params);
  const Th0 = thetaPotential(theta0, params);
  const vr0 = R0 > 0 ? signR * Math.sqrt(R0) : 0;
  const vth0 = Th0 > 0 ? signTheta * Math.sqrt(Th0) : 0;

  // State: [t, r, θ, φ, v_r, v_θ]
  const s = [0, r0, theta0, 0, vr0, vth0];
  const H0 = hamiltonian(s, params);
  const Q0 = carterQ(s, params);

  const positions = new Float32Array((nSteps + 1) * 3);
  const [x0, y0, z0] = blToCartesian(s[1], s[2], s[3], a);
  positions[0] = x0; positions[1] = y0; positions[2] = z0;

  let h = h0;
  let actualSteps = nSteps;

  for (let i = 0; i < nSteps; i++) {
    const prevTheta = s[2];
    const { y, hNext } = adaptiveStep(s, h, params, tolerance);
    for (let j = 0; j < 6; j++) s[j] = y[j];
    h = hNext;

    // φ correction on polar crossing: when θ crosses 0 or π the correct
    // Cartesian continuation requires φ → φ+π. θ and v_θ are handled
    // naturally by the second-order integrator (θ goes slightly past the
    // pole and comes back via Θ'/2), but φ doesn't see the crossing.
    if (Math.cos(prevTheta) * Math.cos(s[2]) < 0) s[3] += Math.PI;

    // Terminate near horizon, at large radius, or on any NaN/Inf
    if (s[1] < rPlus * 1.01 || s[1] > 200
      || !isFinite(s[0]) || !isFinite(s[1]) || !isFinite(s[2])
      || !isFinite(s[3]) || !isFinite(s[4]) || !isFinite(s[5])) {
      actualSteps = i + 1;
      if (isFinite(s[1]) && s[1] > 0) {
        const [xf, yf, zf] = blToCartesian(s[1], s[2], s[3], a);
        positions[(i + 1) * 3] = xf; positions[(i + 1) * 3 + 1] = yf; positions[(i + 1) * 3 + 2] = zf;
      }
      break;
    }

    const [xi, yi, zi] = blToCartesian(s[1], s[2], s[3], a);
    positions[(i + 1) * 3] = xi; positions[(i + 1) * 3 + 1] = yi; positions[(i + 1) * 3 + 2] = zi;
  }

  const Hf = hamiltonian(s, params);
  const Qf = carterQ(s, params);

  return {
    positions: positions.subarray(0, (actualSteps + 1) * 3),
    nPoints: actualSteps + 1,
    diagnostics: {
      H: Hf, expectedH: -kappa / 2,
      Q: Qf, expectedQ: Q,
      dH: Math.abs(Hf - H0),
      dQ: Math.abs(Qf - Q0),
    }
  };
}

export const PRESETS = {
  boundOrbit: {
    label: 'Bound orbit',
    M: 1, a: 0.9, E: 0.95, L: 3.0, Q: 2.0, kappa: 1,
    r0: 10, theta0: Math.PI / 2.5, signR: -1, signTheta: 1,
    h: 0.1, nSteps: 8000,
  },
  equatorialOrbit: {
    label: 'Equatorial orbit',
    M: 1, a: 0.9, E: 0.96, L: 3.2, Q: 0, kappa: 1,
    r0: 12, theta0: Math.PI / 2, signR: -1, signTheta: 0,
    h: 0.1, nSteps: 10000,
  },
  plungingOrbit: {
    label: 'Plunging orbit',
    M: 1, a: 0.5, E: 1.0, L: 1.5, Q: 0.5, kappa: 1,
    r0: 15, theta0: Math.PI / 3, signR: -1, signTheta: 1,
    h: 0.1, nSteps: 4000,
  },
  photonOrbit: {
    label: 'Photon scattering',
    M: 1, a: 0.99, E: 1.0, L: 2.0, Q: 8.0, kappa: 0,
    r0: 20, theta0: Math.PI / 3, signR: -1, signTheta: 1,
    h: 0.05, nSteps: 8000,
  },
  schwarzschild: {
    label: 'Schwarzschild (a=0)',
    M: 1, a: 0.001, E: 0.97, L: 4.0, Q: 0, kappa: 1,
    r0: 15, theta0: Math.PI / 2, signR: -1, signTheta: 0,
    h: 0.1, nSteps: 10000,
  },
  sphericalOrbit: {
    label: 'Near-extreme Kerr',
    M: 1, a: 0.99, E: 0.95, L: 2.5, Q: 3.0, kappa: 1,
    r0: 8, theta0: Math.PI / 2.5, signR: -1, signTheta: 1,
    h: 0.1, nSteps: 10000,
  },
};
