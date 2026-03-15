// GL4 (4th-order Gauss-Legendre implicit Runge-Kutta) symplectic integrator
// for Kerr geodesics in Boyer-Lindquist coordinates.
//
// State vector: y = (r, theta, p_r, p_theta)
// Constants of motion: E, L (frozen); Q computed for diagnostics
// Independent variable: affine parameter lambda

const ALPHA = Math.sqrt(3) / 6;

// Butcher tableau
const A11 = 0.25;
const A12 = 0.25 - ALPHA;
const A21 = 0.25 + ALPHA;
const A22 = 0.25;
const B1 = 0.5;
const B2 = 0.5;

// Kerr metric helper functions
function sigma(r, theta, a) {
  const costh = Math.cos(theta);
  return r * r + a * a * costh * costh;
}

function delta(r, M, a) {
  return r * r - 2 * M * r + a * a;
}

// Potential V(r, theta) — the coordinate-only part of 2H
// 2V = g^{tt} E^2 - 2 g^{tphi} E L + g^{phiphi} L^2
function twoV(r, theta, params) {
  const { M, a, E, L } = params;
  const sth = Math.sin(theta);
  const sth2 = sth * sth;
  const S = sigma(r, theta, a);
  const D = delta(r, M, a);
  const SD = S * D;
  const r2a2 = r * r + a * a;

  // g^{tt} = -[(r^2+a^2)^2 - a^2 Delta sin^2 theta] / (Sigma Delta)
  const gtt = -(r2a2 * r2a2 - a * a * D * sth2) / SD;
  // g^{tphi} = -2Mar / (Sigma Delta)
  const gtphi = -2 * M * a * r / SD;
  // g^{phiphi} = (Delta - a^2 sin^2 theta) / (Sigma Delta sin^2 theta)
  const gphiphi = (D - a * a * sth2) / (SD * sth2);

  return gtt * E * E - 2 * gtphi * E * L + gphiphi * L * L;
}

// Right-hand side f(y) of Hamilton's equations
// y = [r, theta, p_r, p_theta]
function rhs(y, params) {
  const [r, theta, pr, pth] = y;
  const { M, a } = params;

  const S = sigma(r, theta, a);
  const D = delta(r, M, a);
  const S2 = S * S;

  // Derivatives of Sigma and Delta
  const Sr = 2 * r;
  const costh = Math.cos(theta);
  const sinth = Math.sin(theta);
  const Sth = -2 * a * a * sinth * costh;
  const Dr = 2 * r - 2 * M;

  // Position derivatives
  const rdot = (D / S) * pr;
  const thdot = pth / S;

  // Momentum derivatives: dp_r = -dH/dr, dp_theta = -dH/dtheta
  // Use finite differences for dV/dr and dV/dtheta
  const eps = 1e-7;
  const dVdr = (twoV(r + eps, theta, params) - twoV(r - eps, theta, params)) / (2 * eps);
  const dVdth = (twoV(r, theta + eps, params) - twoV(r, theta - eps, params)) / (2 * eps);

  // dp_r = (Dr*S - D*Sr)/(2*S^2) * pr^2 + Sr/(2*S^2) * pth^2 - dV/dr
  const dpdt_r = (Dr * S - D * Sr) / (2 * S2) * pr * pr
    + Sr / (2 * S2) * pth * pth
    - dVdr;

  // dp_theta = D*Sth/(2*S^2) * pr^2 + Sth/(2*S^2) * pth^2 - dV/dtheta
  const dpdt_th = D * Sth / (2 * S2) * pr * pr
    + Sth / (2 * S2) * pth * pth
    - dVdth;

  return [rdot, thdot, dpdt_r, dpdt_th];
}

// Coordinate velocities for t and phi (for quadrature)
function coordinateVelocities(r, theta, params) {
  const { M, a, E, L } = params;
  const S = sigma(r, theta, a);
  const D = delta(r, M, a);
  const SD = S * D;
  const sth2 = Math.sin(theta) ** 2;
  const r2a2 = r * r + a * a;

  const tdot = (r2a2 * r2a2 - a * a * D * sth2) * E / SD - 2 * M * a * r * L / SD;
  const phidot = 2 * M * a * r * E / SD + (D - a * a * sth2) * L / (SD * sth2);

  return [tdot, phidot];
}

// Compute Hamiltonian for conservation check
function hamiltonian(y, params) {
  const [r, theta, pr, pth] = y;
  const { a, M } = params;
  const S = sigma(r, theta, a);
  const D = delta(r, M, a);
  return 0.5 * ((D / S) * pr * pr + pth * pth / S + twoV(r, theta, params));
}

// Compute Carter constant Q for conservation check
function carterQ(y, params) {
  const [r, theta, pr, pth] = y;
  const { a, E, L, kappa } = params;
  const costh = Math.cos(theta);
  const sinth = Math.sin(theta);
  return pth * pth + costh * costh * (a * a * (kappa - E * E) - L * L / (sinth * sinth));
}

// Solve 8x8 linear system J * delta = -F using direct elimination
// J = I_8 - h * [[a11*Jf1, a12*Jf2], [a21*Jf1, a22*Jf2]]
// F = [F1, F2] (each 4-vector)
function solveNewtonSystem(Y1, Y2, yn, h, F1, F2, params) {
  // Compute Jacobian of f at Y1 and Y2 via finite differences
  const Jf1 = jacobianF(Y1, params);
  const Jf2 = jacobianF(Y2, params);

  // Assemble 8x8 matrix
  const J = new Float64Array(64);
  for (let i = 0; i < 8; i++) J[i * 8 + i] = 1.0; // identity

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      // Top-left: -h * a11 * Jf1
      J[i * 8 + j] -= h * A11 * Jf1[i * 4 + j];
      // Top-right: -h * a12 * Jf2
      J[i * 8 + (j + 4)] -= h * A12 * Jf2[i * 4 + j];
      // Bottom-left: -h * a21 * Jf1
      J[(i + 4) * 8 + j] -= h * A21 * Jf1[i * 4 + j];
      // Bottom-right: -h * a22 * Jf2
      J[(i + 4) * 8 + (j + 4)] -= h * A22 * Jf2[i * 4 + j];
    }
  }

  // RHS = -F
  const rhs = new Float64Array(8);
  for (let i = 0; i < 4; i++) {
    rhs[i] = -F1[i];
    rhs[i + 4] = -F2[i];
  }

  // Gaussian elimination with partial pivoting
  gaussianElimination(J, rhs, 8);

  return [
    [rhs[0], rhs[1], rhs[2], rhs[3]],
    [rhs[4], rhs[5], rhs[6], rhs[7]]
  ];
}

function jacobianF(Y, params) {
  const eps = 1e-7;
  const f0 = rhs(Y, params);
  const J = new Float64Array(16);

  for (let j = 0; j < 4; j++) {
    const Yp = [...Y];
    const Ym = [...Y];
    Yp[j] += eps;
    Ym[j] -= eps;
    const fp = rhs(Yp, params);
    const fm = rhs(Ym, params);
    for (let i = 0; i < 4; i++) {
      J[i * 4 + j] = (fp[i] - fm[i]) / (2 * eps);
    }
  }
  return J;
}

function gaussianElimination(A, b, n) {
  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxVal = Math.abs(A[col * n + col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(A[row * n + col]);
      if (val > maxVal) { maxVal = val; maxRow = row; }
    }
    if (maxRow !== col) {
      for (let j = col; j < n; j++) {
        const tmp = A[col * n + j];
        A[col * n + j] = A[maxRow * n + j];
        A[maxRow * n + j] = tmp;
      }
      const tmp = b[col]; b[col] = b[maxRow]; b[maxRow] = tmp;
    }

    const pivot = A[col * n + col];
    for (let row = col + 1; row < n; row++) {
      const factor = A[row * n + col] / pivot;
      for (let j = col + 1; j < n; j++) {
        A[row * n + j] -= factor * A[col * n + j];
      }
      b[row] -= factor * b[col];
      A[row * n + col] = 0;
    }
  }

  // Back substitution
  for (let row = n - 1; row >= 0; row--) {
    for (let j = row + 1; j < n; j++) {
      b[row] -= A[row * n + j] * b[j];
    }
    b[row] /= A[row * n + row];
  }
}

// One GL4 step
function gl4Step(yn, t, phi, h, params) {
  let Y1 = [...yn];
  let Y2 = [...yn];
  let k1, k2;

  const EPS_NEWTON = 1e-12;
  const MAX_ITER = 20;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    k1 = rhs(Y1, params);
    k2 = rhs(Y2, params);

    // Residuals
    const F1 = new Array(4);
    const F2 = new Array(4);
    for (let i = 0; i < 4; i++) {
      F1[i] = Y1[i] - yn[i] - h * (A11 * k1[i] + A12 * k2[i]);
      F2[i] = Y2[i] - yn[i] - h * (A21 * k1[i] + A22 * k2[i]);
    }

    const maxF = Math.max(
      Math.sqrt(F1[0] ** 2 + F1[1] ** 2 + F1[2] ** 2 + F1[3] ** 2),
      Math.sqrt(F2[0] ** 2 + F2[1] ** 2 + F2[2] ** 2 + F2[3] ** 2)
    );
    if (maxF < EPS_NEWTON) break;

    const [dY1, dY2] = solveNewtonSystem(Y1, Y2, yn, h, F1, F2, params);
    for (let i = 0; i < 4; i++) {
      Y1[i] += dY1[i];
      Y2[i] += dY2[i];
    }
  }

  // State update
  k1 = rhs(Y1, params);
  k2 = rhs(Y2, params);
  const ynew = new Array(4);
  for (let i = 0; i < 4; i++) {
    ynew[i] = yn[i] + h * (B1 * k1[i] + B2 * k2[i]);
  }

  // Coordinate quadrature for t and phi
  const [tdot1, phidot1] = coordinateVelocities(Y1[0], Y1[1], params);
  const [tdot2, phidot2] = coordinateVelocities(Y2[0], Y2[1], params);
  const tNew = t + h * (B1 * tdot1 + B2 * tdot2);
  const phiNew = phi + h * (B1 * phidot1 + B2 * phidot2);

  return { y: ynew, t: tNew, phi: phiNew };
}

// Compute initial conditions from orbital parameters
// r0: initial radius
// theta0: initial polar angle (pi/2 = equatorial)
// E, L, Q: constants of motion
// kappa: 1 for massive, 0 for null
// signR: +1 or -1 for initial radial direction
// signTheta: +1 or -1 for initial polar direction
function initialConditions(r0, theta0, params, signR = 1, signTheta = 1) {
  const { M, a, E, L, Q, kappa } = params;
  const S = sigma(r0, theta0, a);
  const D = delta(r0, M, a);

  // From Carter equations: Sigma^2 (dr/dlambda)^2 = R(r)
  // p_r = (Sigma/Delta) dr/dlambda, so p_r^2 = R(r) / Delta^2
  // R(r) = [E(r^2+a^2) - aL]^2 - Delta [kappa r^2 + (L-aE)^2 + Q]
  const r2a2 = r0 * r0 + a * a;
  const R = (E * r2a2 - a * L) ** 2 - D * (kappa * r0 * r0 + (L - a * E) ** 2 + Q);

  // Theta potential: Theta(theta) = Q + a^2(E^2-kappa)cos^2(theta) - L^2 cot^2(theta)
  const costh = Math.cos(theta0);
  const sinth = Math.sin(theta0);
  const Th = Q + a * a * (E * E - kappa) * costh * costh - L * L * (costh * costh) / (sinth * sinth);

  // p_r = sign_r * sqrt(R) / Delta  (from Sigma * dr/dlambda = +/- sqrt(R), p_r = Sigma/Delta * dr/dlambda)
  // Actually: p_r = (Sigma/Delta) * rdot, and Sigma*rdot = +/- sqrt(R)
  // So p_r = +/- sqrt(R) / Delta
  const pr = R > 0 ? signR * Math.sqrt(R) / D : 0;

  // p_theta = +/- sqrt(Theta)
  const pth = Th > 0 ? signTheta * Math.sqrt(Th) : 0;

  return [r0, theta0, pr, pth];
}

// Integrate a geodesic for N steps, returning positions in Boyer-Lindquist coords
// Returns array of {r, theta, phi, t} plus diagnostics
export function integrateGeodesic(config) {
  const {
    M = 1,
    a = 0.9,
    E = 0.95,
    L = 2.0,
    Q = 1.0,
    kappa = 1,
    r0 = 10,
    theta0 = Math.PI / 2,
    signR = -1,
    signTheta = 1,
    h = 0.5,
    nSteps = 2000,
  } = config;

  const params = { M, a, E, L, Q, kappa };
  const rPlus = M + Math.sqrt(M * M - a * a);

  let y = initialConditions(r0, theta0, params, signR, signTheta);
  let t = 0;
  let phi = 0;

  // Store positions as flat array [x, y, z, ...]
  const positions = new Float32Array((nSteps + 1) * 3);

  // Convert BL to Cartesian
  function blToCartesian(r, theta, ph) {
    const sth = Math.sin(theta);
    const rho = Math.sqrt(r * r + a * a);
    return [
      rho * sth * Math.cos(ph),
      rho * sth * Math.sin(ph),
      r * Math.cos(theta)
    ];
  }

  const [x0, y0, z0] = blToCartesian(y[0], y[1], phi);
  positions[0] = x0;
  positions[1] = y0;
  positions[2] = z0;

  let actualSteps = nSteps;
  for (let i = 0; i < nSteps; i++) {
    const result = gl4Step(y, t, phi, h, params);
    y = result.y;
    t = result.t;
    phi = result.phi;

    // Terminate if too close to horizon
    if (y[0] < rPlus * 1.01) {
      actualSteps = i + 1;
      const [xf, yf, zf] = blToCartesian(y[0], y[1], phi);
      positions[(i + 1) * 3] = xf;
      positions[(i + 1) * 3 + 1] = yf;
      positions[(i + 1) * 3 + 2] = zf;
      break;
    }

    // Clamp theta to avoid singularities at poles
    if (y[1] < 0.01) y[1] = 0.01;
    if (y[1] > Math.PI - 0.01) y[1] = Math.PI - 0.01;

    const [xi, yi, zi] = blToCartesian(y[0], y[1], phi);
    positions[(i + 1) * 3] = xi;
    positions[(i + 1) * 3 + 1] = yi;
    positions[(i + 1) * 3 + 2] = zi;
  }

  // Conservation diagnostics
  const H = hamiltonian(y, params);
  const Qcheck = carterQ(y, params);

  return {
    positions: positions.subarray(0, (actualSteps + 1) * 3),
    nPoints: actualSteps + 1,
    diagnostics: {
      H,
      expectedH: -kappa / 2,
      Q: Qcheck,
      expectedQ: Q,
    }
  };
}

// Preset orbit configurations that produce interesting geodesics
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
    M: 1, a: 0, E: 0.97, L: 4.0, Q: 0, kappa: 1,
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
