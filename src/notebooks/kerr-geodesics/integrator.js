// Explicit symplectic integrator for Kerr geodesics using the Mino-time
// transformation and 5-way Hamiltonian split (Wu, Wang, Sun & Liu 2021).
//
// Time transformation: dλ/dw = Σ, giving K = 2ΣH which splits into
// 5 sub-Hamiltonians each with closed-form analytical flows.
//
// Composition: Yoshida 4th-order triple jump of 2nd-order Strang splitting.
//
// Phase space: full 8D (t, r, θ, φ, p_t, p_r, p_θ, p_φ) with p_t, p_φ conserved.

// Yoshida 4th-order coefficients
const CBRT2 = Math.cbrt(2);
const C1 = 1 / (2 - CBRT2);
const C2 = -CBRT2 / (2 - CBRT2);

// State: [t, r, theta, phi, p_r, p_theta]
// Constants: p_t = -E, p_phi = L (stored in params)

// --- Sub-Hamiltonian flows ---

// K1 = a²p_r² + p_θ² (double drift)
// dr/dw = 2a²p_r, dθ/dw = 2p_θ
function flowK1(s, h, params) {
  const a2 = params.a * params.a;
  s[1] += 2 * a2 * s[4] * h; // r
  s[2] += 2 * s[5] * h;       // theta
}

// K2 = r²p_r² (exponential flow)
// r(h) = r₀·exp(2·r₀·p_r₀·h), p_r(h) = p_r₀·exp(-2·r₀·p_r₀·h)
function flowK2(s, h, params) {
  const rpr = s[1] * s[4];
  const e = Math.exp(2 * rpr * h);
  s[1] *= e;
  s[4] /= e;
}

// K3 = -2Mrp_r² (rational flow)
// p_r(h) = p_r₀/(1 - 2M·p_r₀·h), r(h) = r₀·(1 - 2M·p_r₀·h)²
function flowK3(s, h, params) {
  const denom = 1 - 2 * params.M * s[4] * h;
  s[1] *= denom * denom;
  s[4] /= denom;
}

// K4 = -W²/Δ where W = (r²+a²)p_t + a·p_φ
// r unchanged, p_r kicked, t and φ advanced
function flowK4(s, h, params) {
  const { M, a, pt, pphi } = params;
  const r = s[1];
  const r2 = r * r;
  const a2 = a * a;
  const r2a2 = r2 + a2;
  const Delta = r2 - 2 * M * r + a2;
  const W = r2a2 * pt + a * pphi;

  // dp_r = +h · d(W²/Δ)/dr
  // d(W²/Δ)/dr = [2W·W'·Δ - W²·Δ']/Δ²
  // W' = 2r·p_t, Δ' = 2r - 2M
  const Wp = 2 * r * pt;
  const Dp = 2 * r - 2 * M;
  s[4] += h * (2 * W * Wp * Delta - W * W * Dp) / (Delta * Delta);

  // dt/dw = -2W(r²+a²)/Δ, dφ/dw = -2Wa/Δ
  const WoverD = W / Delta;
  s[0] += h * (-2 * r2a2 * WoverD);
  s[3] += h * (-2 * a * WoverD);
}

// K5 = a²p_t²sin²θ + p_φ²/sin²θ
// θ unchanged, p_θ kicked, t and φ advanced
function flowK5(s, h, params) {
  const { a, pt, pphi } = params;
  const theta = s[2];
  const sth = Math.sin(theta);
  const cth = Math.cos(theta);
  const sth2 = sth * sth;
  const a2 = a * a;

  // dp_θ = -h · dK5/dθ
  // dK5/dθ = 2a²p_t²sinθcosθ - 2p_φ²cosθ/sin³θ
  const dK5dth = 2 * a2 * pt * pt * sth * cth - 2 * pphi * pphi * cth / (sth2 * sth);
  s[5] -= h * dK5dth;

  // dt/dw = 2a²p_t·sin²θ, dφ/dw = 2p_φ/sin²θ
  s[0] += h * 2 * a2 * pt * sth2;
  s[3] += h * 2 * pphi / sth2;
}

// --- Strang splitting (2nd order) ---
function strang(s, h, params) {
  const h2 = h * 0.5;
  flowK1(s, h2, params);
  flowK2(s, h2, params);
  flowK3(s, h2, params);
  flowK4(s, h2, params);
  flowK5(s, h, params);
  flowK4(s, h2, params);
  flowK3(s, h2, params);
  flowK2(s, h2, params);
  flowK1(s, h2, params);
}

// --- Yoshida 4th-order triple jump ---
function yoshida4(s, h, params) {
  strang(s, C1 * h, params);
  strang(s, C2 * h, params);
  strang(s, C1 * h, params);
}

// --- Hamiltonian for conservation check ---
function hamiltonian(s, params) {
  const { M, a, pt, pphi, kappa } = params;
  const r = s[1], theta = s[2];
  const pr = s[4], pth = s[5];
  const r2 = r * r;
  const a2 = a * a;
  const sth = Math.sin(theta);
  const cth = Math.cos(theta);
  const Sigma = r2 + a2 * cth * cth;
  const Delta = r2 - 2 * M * r + a2;
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

// Carter constant Q
function carterQ(s, params) {
  const { a, pt, pphi, kappa } = params;
  const E = -pt, L = pphi;
  const theta = s[2], pth = s[5];
  const costh = Math.cos(theta);
  const sinth = Math.sin(theta);
  return pth * pth + costh * costh * (a * a * (kappa - E * E) - L * L / (sinth * sinth));
}

// Compute initial momenta from constants of motion (E, L, Q)
function initialState(r0, theta0, params, signR, signTheta) {
  const { M, a, kappa } = params;
  const E = -params.pt, L = params.pphi;
  const Delta = r0 * r0 - 2 * M * r0 + a * a;
  const r2a2 = r0 * r0 + a * a;

  // R(r) = [E(r²+a²) - aL]² - Δ[κr² + (L-aE)² + Q]
  const R = (E * r2a2 - a * L) ** 2 - Delta * (kappa * r0 * r0 + (L - a * E) ** 2 + params.Q);
  const pr = R > 0 ? signR * Math.sqrt(R) / Delta : 0;

  // Θ(θ) = Q + a²(E²-κ)cos²θ - L²cot²θ
  const costh = Math.cos(theta0);
  const sinth = Math.sin(theta0);
  const Th = params.Q + a * a * (E * E - kappa) * costh * costh - L * L * costh * costh / (sinth * sinth);
  const pth = Th > 0 ? signTheta * Math.sqrt(Th) : 0;

  // State: [t, r, theta, phi, p_r, p_theta]
  return [0, r0, theta0, 0, pr, pth];
}

// Convert Boyer-Lindquist to Cartesian
function blToCartesian(r, theta, phi, a) {
  const sth = Math.sin(theta);
  const rho = Math.sqrt(r * r + a * a);
  return [rho * sth * Math.cos(phi), rho * sth * Math.sin(phi), r * Math.cos(theta)];
}

// Main integration function
export function integrateGeodesic(config) {
  const {
    M = 1, a = 0.9, E = 0.95, L = 3.0, Q = 2.0, kappa = 1,
    r0 = 10, theta0 = Math.PI / 2, signR = -1, signTheta = 1,
    h = 0.5, nSteps = 4000,
  } = config;

  const params = { M, a, pt: -E, pphi: L, Q, kappa };
  const rPlus = M + Math.sqrt(M * M - a * a);

  const s = initialState(r0, theta0, params, signR, signTheta);
  const H0 = hamiltonian(s, params);
  const Q0 = carterQ(s, params);

  const positions = new Float32Array((nSteps + 1) * 3);
  const [x0, y0, z0] = blToCartesian(s[1], s[2], s[3], a);
  positions[0] = x0; positions[1] = y0; positions[2] = z0;

  let actualSteps = nSteps;
  for (let i = 0; i < nSteps; i++) {
    yoshida4(s, h, params);

    // Clamp theta to avoid polar singularities
    if (s[2] < 0.01) s[2] = 0.01;
    if (s[2] > Math.PI - 0.01) s[2] = Math.PI - 0.01;

    // Terminate near horizon
    if (s[1] < rPlus * 1.01 || !isFinite(s[1]) || !isFinite(s[4])) {
      actualSteps = i + 1;
      if (isFinite(s[1])) {
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
    h: 0.5, nSteps: 4000,
  },
  equatorialOrbit: {
    label: 'Equatorial orbit',
    M: 1, a: 0.9, E: 0.96, L: 3.2, Q: 0, kappa: 1,
    r0: 12, theta0: Math.PI / 2, signR: -1, signTheta: 0,
    h: 0.3, nSteps: 6000,
  },
  plungingOrbit: {
    label: 'Plunging orbit',
    M: 1, a: 0.5, E: 1.0, L: 1.5, Q: 0.5, kappa: 1,
    r0: 15, theta0: Math.PI / 3, signR: -1, signTheta: 1,
    h: 0.3, nSteps: 3000,
  },
  photonOrbit: {
    label: 'Photon orbit',
    M: 1, a: 0.99, E: 1.0, L: 2.0, Q: 8.0, kappa: 0,
    r0: 6, theta0: Math.PI / 3, signR: -1, signTheta: 1,
    h: 0.2, nSteps: 5000,
  },
  schwarzschild: {
    label: 'Schwarzschild (a=0)',
    M: 1, a: 0.001, E: 0.97, L: 4.0, Q: 0, kappa: 1,
    r0: 15, theta0: Math.PI / 2, signR: -1, signTheta: 0,
    h: 0.5, nSteps: 5000,
  },
  sphericalOrbit: {
    label: 'Spherical orbit',
    M: 1, a: 0.9, E: 0.92, L: 2.5, Q: 5.0, kappa: 1,
    r0: 8, theta0: Math.PI / 4, signR: 1, signTheta: -1,
    h: 0.3, nSteps: 6000,
  },
};
