// JavaScript port of the ray-tracer geodesic core for debugging.
// No GPU, no noise, no disk color — just the integrator.
// Usage:
//   import { traceRay } from './ray-tracer-debug.js';
//   const result = traceRay(rayDir, eye, { a, M, hBase, maxSteps });
//   // result: { diskCrossings: [{r, phi, step}], escape: {dir, phi} | null, steps: [...] }

const PI = Math.PI;

// ── Coordinate transforms ────────────────────────────────────────────────────

function cartesianToBL(pos, a) {
  const [x, y, z] = pos;
  const R2 = x*x + y*y + z*z;
  const a2 = a*a;
  const b = R2 - a2;
  const r2 = 0.5 * (b + Math.sqrt(b*b + 4*a2*y*y));
  const r = Math.sqrt(Math.max(r2, 1e-20));
  const theta = Math.acos(Math.min(1, Math.max(-1, y / r)));
  const phi = Math.atan2(z, x);
  return [r, theta, phi];
}

// Jacobian: columns are d(x,y,z)/dr, d/dtheta, d/dphi
function blJacobian(r, theta, phi, a) {
  const rho = Math.sqrt(r*r + a*a);
  const sth = Math.sin(theta), cth = Math.cos(theta);
  const sphi = Math.sin(phi),  cphi = Math.cos(phi);
  const r_over_rho = r / rho;
  // stored column-major: col0, col1, col2  (each is [x,y,z])
  return [
    [r_over_rho*sth*cphi,  cth,  r_over_rho*sth*sphi],  // d/dr
    [rho*cth*cphi,        -r*sth, rho*cth*sphi        ],  // d/dtheta
    [-rho*sth*sphi,        0,     rho*sth*cphi         ],  // d/dphi
  ];
}

// Invert 3×3 stored as array of 3 column-vectors
function mat3Inverse(cols) {
  const [c0, c1, c2] = cols;
  const cross = (a, b) => [
    a[1]*b[2]-a[2]*b[1],
    a[2]*b[0]-a[0]*b[2],
    a[0]*b[1]-a[1]*b[0],
  ];
  const dot3 = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const r0 = cross(c1, c2);
  const r1 = cross(c2, c0);
  const r2 = cross(c0, c1);
  const invDet = 1.0 / dot3(c0, r0);
  // transpose of [r0,r1,r2] (rows) → columns
  return [
    [r0[0]*invDet, r1[0]*invDet, r2[0]*invDet],
    [r0[1]*invDet, r1[1]*invDet, r2[1]*invDet],
    [r0[2]*invDet, r1[2]*invDet, r2[2]*invDet],
  ];
}

// mat3 (cols) * vec3
function mat3MulVec(cols, v) {
  return [
    cols[0][0]*v[0] + cols[1][0]*v[1] + cols[2][0]*v[2],
    cols[0][1]*v[0] + cols[1][1]*v[1] + cols[2][1]*v[2],
    cols[0][2]*v[0] + cols[1][2]*v[1] + cols[2][2]*v[2],
  ];
}

// ── Kerr metric ──────────────────────────────────────────────────────────────

function kerrMetric(r, theta, M, a) {
  const r2 = r*r, a2 = a*a;
  const sth = Math.sin(theta), cth = Math.cos(theta);
  const sin2 = sth*sth, cos2 = cth*cth;
  const Sigma = r2 + a2*cos2;
  const Delta = r2 - 2*M*r + a2;
  const A = (r2+a2)*(r2+a2) - a2*Delta*sin2;
  return {
    gtt:     -(1 - 2*M*r/Sigma),
    gtphi:   -2*M*a*r*sin2/Sigma,
    grr:      Sigma/Delta,
    gthth:    Sigma,
    gphiphi:  A*sin2/Sigma,
    Delta, Sigma,
  };
}

// ── Conserved quantities from camera position + ray direction ────────────────

export function computeRayParams(rayDir, eye, a, M) {
  const bl = cartesianToBL(eye, a);
  const [r0, theta0, phi0] = bl;

  const J    = blJacobian(r0, theta0, phi0, a);
  const Jinv = mat3Inverse(J);
  const blVel = mat3MulVec(Jinv, rayDir);  // [u^r, u^theta, u^phi]

  const g = kerrMetric(r0, theta0, M, a);

  const spatial = g.grr*blVel[0]*blVel[0] + g.gthth*blVel[1]*blVel[1] + g.gphiphi*blVel[2]*blVel[2];
  const A_coeff = g.gtt;
  const B_coeff = 2*g.gtphi*blVel[2];
  const C_coeff = spatial;
  const disc = B_coeff*B_coeff - 4*A_coeff*C_coeff;
  if (disc < 0) return null;

  const sqrtDisc = Math.sqrt(disc);
  const ut1 = (-B_coeff + sqrtDisc) / (2*A_coeff);
  const ut2 = (-B_coeff - sqrtDisc) / (2*A_coeff);
  const ut  = ut1 > 0 ? ut1 : ut2;
  if (ut <= 0) return null;

  const pt   = g.gtt*ut    + g.gtphi*blVel[2];
  const pphi = g.gtphi*ut  + g.gphiphi*blVel[2];
  const rawE = -pt;
  const rawL =  pphi;

  const E = 1.0;
  const L = rawL / rawE;

  const sth0 = Math.sin(theta0), cth0 = Math.cos(theta0);
  const sin2_0 = Math.max(sth0*sth0, 1e-10);
  const ptheta = g.gthth * blVel[1];
  const rawQ = ptheta*ptheta + cth0*cth0*(L*L*rawE*rawE/sin2_0 - a*a*rawE*rawE);
  const Q = rawQ / (rawE*rawE);

  const r2  = r0*r0, a2 = a*a;
  const P   = E*(r2+a2) - a*L;
  const LaE = L - a*E;
  const R_val = P*P - g.Delta*(LaE*LaE + Q);
  const vr  = Math.sign(blVel[0]) * Math.sqrt(Math.max(R_val, 0));

  const Theta_val = Q + a2*cth0*cth0 - L*L*cth0*cth0/sin2_0;
  const vth = Math.sign(blVel[1]) * Math.sqrt(Math.max(Theta_val, 0));

  return { E, L, Q, vr, vth, r0, theta0, phi0 };
}

// ── Geodesic derivatives ─────────────────────────────────────────────────────

function geodesicDerivs(r, vr, theta, vth, L, Q, M, a) {
  const r2 = r*r, a2 = a*a;
  const cth = Math.cos(theta), sth = Math.sin(theta);
  const Sigma = r2 + a2*cth*cth;
  const Delta = r2 - 2*M*r + a2;
  const invSigma = 1/Sigma;

  const P = r2 + a2 - a*L;
  const C = (L-a)*(L-a) + Q;
  const dR_dr = 4*r*P - (2*r - 2*M)*C;

  const sin2 = Math.max(sth*sth, 1e-6);
  const sin3 = sin2 * Math.max(Math.abs(sth), 1e-6);
  const dTh_dth = -2*a2*sth*cth + 2*L*L*cth/sin3;

  const sin2_clamped = Math.max(sth*sth, 1e-4);
  const dphi = a*P / Math.max(Math.abs(Delta), 1e-8) + L/sin2_clamped - a;

  return {
    dr:   vr  * invSigma,
    dvr:  0.5 * dR_dr * invSigma,
    dth:  vth * invSigma,
    dvth: 0.5 * dTh_dth * invSigma,
    dphi: dphi * invSigma,
  };
}

// ── RK4 step ─────────────────────────────────────────────────────────────────

function rk4Step(s, h, L, Q, M, a) {
  const k1 = geodesicDerivs(s.r, s.vr, s.theta, s.vth, L, Q, M, a);
  const k2 = geodesicDerivs(s.r+h*0.5*k1.dr, s.vr+h*0.5*k1.dvr, s.theta+h*0.5*k1.dth, s.vth+h*0.5*k1.dvth, L, Q, M, a);
  const k3 = geodesicDerivs(s.r+h*0.5*k2.dr, s.vr+h*0.5*k2.dvr, s.theta+h*0.5*k2.dth, s.vth+h*0.5*k2.dvth, L, Q, M, a);
  const k4 = geodesicDerivs(s.r+h*k3.dr,     s.vr+h*k3.dvr,     s.theta+h*k3.dth,     s.vth+h*k3.dvth,     L, Q, M, a);
  return {
    r:     s.r     + h/6*(k1.dr   + 2*k2.dr   + 2*k3.dr   + k4.dr),
    vr:    s.vr    + h/6*(k1.dvr  + 2*k2.dvr  + 2*k3.dvr  + k4.dvr),
    theta: s.theta + h/6*(k1.dth  + 2*k2.dth  + 2*k3.dth  + k4.dth),
    vth:   s.vth   + h/6*(k1.dvth + 2*k2.dvth + 2*k3.dvth + k4.dvth),
    phi:   s.phi   + h/6*(k1.dphi + 2*k2.dphi + 2*k3.dphi + k4.dphi),
  };
}

// ── Main trace ───────────────────────────────────────────────────────────────
// Returns { diskCrossings, escaped, steps } where:
//   diskCrossings: array of { step, r, phi, theta } at each θ=π/2 crossing
//   escaped: { step, phi, theta } if ray left the domain, else null
//   steps: full array of { r, theta, phi, vr, vth } if opts.recordSteps

export function traceRay(rayDir, eye, opts = {}) {
  const {
    a       = 0.9,
    M       = 1.0,
    hBase   = 0.5,
    maxSteps = 2000,
    recordSteps = false,
  } = opts;

  const rp = computeRayParams(rayDir, eye, a, M);
  if (!rp) return { error: 'invalid ray params', diskCrossings: [], escaped: null };

  const rHorizon = M + Math.sqrt(Math.max(M*M - a*a, 0));
  const rEscape  = Math.max(rp.r0*1.1, Math.max(rHorizon*20, 50));
  const { L, Q, E } = rp;

  let s = { r: rp.r0, vr: rp.vr, theta: rp.theta0, vth: rp.vth, phi: rp.phi0 };

  const diskCrossings = [];
  const steps = recordSteps ? [] : null;
  let escaped = null;

  for (let step = 0; step < maxSteps; step++) {
    const prevTheta = s.theta;
    const prevR     = s.r;
    const prevPhi   = s.phi;

    const horizonFactor = Math.min(1, Math.max(0.02, (s.r - rHorizon) / s.r));
    const distanceFactor = Math.max(1, s.r / 10);
    let h = hBase * horizonFactor * distanceFactor;
    // Limit step near poles: prevent RK4 sub-steps from reaching sin³θ < clamp floor
    const Sigma_cur = s.r*s.r + a*a*Math.cos(s.theta)*Math.cos(s.theta);
    const poleDist = Math.min(s.theta, PI - s.theta);
    const thetaStep = 0.1 * poleDist * Sigma_cur / Math.max(Math.abs(s.vth), 1e-6);
    const sin2_cur = Math.sin(s.theta) ** 2;
    const phiStep = 0.1 * Sigma_cur * sin2_cur / Math.max(Math.abs(L), 1e-6);
    h = Math.max(Math.min(h, Math.min(thetaStep, phiStep)), hBase * 1e-4);

    s = rk4Step(s, h, L, Q, M, a);

    // Pole crossing: reflect theta, shift phi
    let crossedPole = false;
    if (s.theta < 0) {
      s.theta = -s.theta;
      s.vth = -s.vth;
      s.phi += PI;
      crossedPole = true;
    } else if (s.theta > PI) {
      s.theta = 2*PI - s.theta;
      s.vth = -s.vth;
      s.phi += PI;
      crossedPole = true;
    }

    if (recordSteps) steps.push({ step, r: s.r, theta: s.theta, phi: s.phi, vr: s.vr, vth: s.vth, crossedPole, h });

    if (s.r < rHorizon * 1.01) break;

    if (s.r > rEscape && s.vr > 0) {
      escaped = { step, r: s.r, theta: s.theta, phi: s.phi };
      break;
    }

    // Disk crossing: theta crosses π/2
    const pi2 = PI * 0.5;
    if (!crossedPole && (prevTheta - pi2) * (s.theta - pi2) < 0) {
      const frac  = (pi2 - prevTheta) / (s.theta - prevTheta);
      const crossR   = prevR   + frac * (s.r - prevR);
      const crossPhi = prevPhi + frac * (s.phi - prevPhi);
      diskCrossings.push({ step, r: crossR, phi: crossPhi, thetaBefore: prevTheta, thetaAfter: s.theta });
    }
  }

  return { diskCrossings, escaped, steps, rp };
}
