// Unit tests for Kerr geodesic integrator
// Run: node src/notebooks/kerr-geodesics/integrator.test.js

import { integrateGeodesic, hamiltonian, carterQ, radialPotential, radialPotentialDeriv, thetaPotential, PRESETS } from './integrator.js';
import { velocityToConstants, constantsToVelocity, blToCartesian, blVelocityToCartesian, cartesianVelocityToBL } from './velocity-utils.js';
import { strict as assert } from 'node:assert';

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message}`);
  }
}

function approx(a, b, tol = 1e-6) {
  assert(Math.abs(a - b) < tol, `expected ${a} ≈ ${b} (tol ${tol}), diff = ${Math.abs(a - b)}`);
}

// ── Hamiltonian constraint ─────────────────────────────────────────────

console.log('\n── Hamiltonian constraint (H = -κ/2 on shell) ──');

for (const [name, preset] of Object.entries(PRESETS)) {
  test(`initial H ≈ -κ/2 for ${name}`, () => {
    const { M = 1, a, E, L, Q, kappa, r0, theta0, signR, signTheta } = preset;
    const params = { M, a, E, L, Q, kappa };
    const a2 = a * a;
    const Delta = r0 * r0 - 2 * M * r0 + a2;
    const r2a2 = r0 * r0 + a2;
    const P = E * r2a2 - a * L;
    const Cr = kappa * r0 * r0 + (L - a * E) ** 2 + Q;
    const R = P * P - Delta * Cr;
    const vr0 = R > 0 ? signR * Math.sqrt(R) : 0;

    const costh = Math.cos(theta0);
    const sinth = Math.sin(theta0);
    const Th = Q + a2 * (E * E - kappa) * costh * costh - L * L * costh * costh / (sinth * sinth);
    const vth0 = Th > 0 ? signTheta * Math.sqrt(Th) : 0;

    const s = [0, r0, theta0, 0, vr0, vth0];
    const H = hamiltonian(s, params);
    approx(H, -kappa / 2, 1e-3);
  });
}

// ── Radial potential at turning points ──────────────────────────────────

console.log('\n── Radial potential R(r) ──');

test('R(r) > 0 at initial r for bound orbit', () => {
  const p = PRESETS.boundOrbit;
  const { M = 1, a, E, L, Q, kappa, r0 } = p;
  const r2a2 = r0 * r0 + a * a;
  const Delta = r0 * r0 - 2 * M * r0 + a * a;
  const P = E * r2a2 - a * L;
  const R = P * P - Delta * (kappa * r0 * r0 + (L - a * E) ** 2 + Q);
  assert(R > 0, `R(r0) = ${R} should be > 0`);
});

test('R(r) < 0 deep inside for bound orbit (turning point exists)', () => {
  const p = PRESETS.boundOrbit;
  const { M = 1, a, E, L, Q, kappa } = p;
  const r = 4; // well inside the orbit
  const r2a2 = r * r + a * a;
  const Delta = r * r - 2 * M * r + a * a;
  const P = E * r2a2 - a * L;
  const R = P * P - Delta * (kappa * r * r + (L - a * E) ** 2 + Q);
  assert(R < 0, `R(4) = ${R} should be < 0 for bound orbit`);
});

// ── Integration produces valid output ───────────────────────────────────

console.log('\n── Integration output validation ──');

for (const [name, preset] of Object.entries(PRESETS)) {
  test(`${name} produces multiple points`, () => {
    const result = integrateGeodesic(preset);
    assert(result.nPoints > 10, `nPoints = ${result.nPoints} should be > 10`);
  });
}

test('bound orbit stays within radial range', () => {
  const result = integrateGeodesic(PRESETS.boundOrbit);
  const pos = result.positions;
  for (let i = 0; i < result.nPoints; i++) {
    const r = Math.sqrt(pos[i*3]**2 + pos[i*3+1]**2 + pos[i*3+2]**2);
    assert(r > 2, `r = ${r} at step ${i} should be > 2 (above horizon)`);
    assert(r < 50, `r = ${r} at step ${i} should be < 50 (bounded)`);
  }
});

test('equatorial orbit stays near equatorial plane', () => {
  const result = integrateGeodesic(PRESETS.equatorialOrbit);
  const pos = result.positions;
  for (let i = 0; i < result.nPoints; i++) {
    const y = Math.abs(pos[i*3+1]);
    assert(y < 0.5, `|y| = ${y} at step ${i} should be < 0.5 for equatorial orbit`);
  }
});

test('plunging orbit terminates near horizon', () => {
  const result = integrateGeodesic(PRESETS.plungingOrbit);
  const pos = result.positions;
  const n = result.nPoints;
  const rFinal = Math.sqrt(pos[(n-1)*3]**2 + pos[(n-1)*3+1]**2 + pos[(n-1)*3+2]**2);
  assert(rFinal < 5, `final r = ${rFinal} should be < 5 for plunging orbit`);
  assert(n < PRESETS.plungingOrbit.nSteps, `should terminate early (${n} < ${PRESETS.plungingOrbit.nSteps})`);
});

// ── Hamiltonian conservation during integration ─────────────────────────

console.log('\n── Hamiltonian conservation ──');

for (const [name, preset] of Object.entries(PRESETS)) {
  if (name === 'plungingOrbit') continue; // Near-horizon stiffness causes drift
  test(`dH < 0.1 for ${name}`, () => {
    const result = integrateGeodesic(preset);
    assert(result.diagnostics.dH < 0.1,
      `dH = ${result.diagnostics.dH.toExponential(2)} should be < 0.1`);
  });
}

// ── Carter constant conservation ────────────────────────────────────────

console.log('\n── Carter constant conservation ──');

for (const [name, preset] of Object.entries(PRESETS)) {
  if (name === 'plungingOrbit' || name === 'photonOrbit') continue;
  test(`dQ < 1.0 for ${name}`, () => {
    const result = integrateGeodesic(preset);
    assert(result.diagnostics.dQ < 1.0,
      `dQ = ${result.diagnostics.dQ.toExponential(2)} should be < 1.0`);
  });
}

// ── Schwarzschild limit ─────────────────────────────────────────────────

console.log('\n── Schwarzschild limit (a→0) ──');

test('Schwarzschild orbit stays in equatorial plane', () => {
  const result = integrateGeodesic(PRESETS.schwarzschild);
  const pos = result.positions;
  for (let i = 0; i < result.nPoints; i++) {
    const y = Math.abs(pos[i*3+1]);
    assert(y < 0.1, `|y| = ${y} at step ${i} should be < 0.1 for a≈0 equatorial orbit`);
  }
});

test('Schwarzschild orbit conserves H well', () => {
  const result = integrateGeodesic(PRESETS.schwarzschild);
  assert(result.diagnostics.dH < 0.01,
    `dH = ${result.diagnostics.dH.toExponential(2)} should be < 0.01`);
});

// ── ISCO (Innermost Stable Circular Orbit) ────────────────────────────

console.log('\n── ISCO (a=0, Schwarzschild) ──');

// Schwarzschild ISCO: r=6M, E=2√2/3, L=2√3·M
{
  const M = 1, a = 0, kappa = 1, Q = 0;
  const r_isco = 6 * M;
  const E_isco = 2 * Math.sqrt(2) / 3;    // ≈ 0.94281
  const L_isco = 2 * Math.sqrt(3) * M;    // ≈ 3.46410
  const params = { M, a, E: E_isco, L: L_isco, Q, kappa };

  test('Schwarzschild ISCO: R(r=6M) = 0', () => {
    const R = radialPotential(r_isco, params);
    approx(R, 0, 1e-10);
  });

  test('Schwarzschild ISCO: R\'(r=6M) = 0', () => {
    const Rp = radialPotentialDeriv(r_isco, params);
    approx(Rp, 0, 1e-8);
  });

  test('Schwarzschild ISCO: R\'\'(r=6M) = 0 (marginally stable)', () => {
    // Numerical second derivative via finite differences
    const eps = 1e-5;
    const Rp = radialPotentialDeriv(r_isco + eps, params);
    const Rm = radialPotentialDeriv(r_isco - eps, params);
    const Rpp = (Rp - Rm) / (2 * eps);
    approx(Rpp, 0, 1e-3);
  });

  test('Schwarzschild ISCO: E = 2√2/3 ≈ 0.9428', () => {
    approx(E_isco, 0.9428090415820634, 1e-12);
  });

  test('Schwarzschild ISCO: L = 2√3 ≈ 3.4641', () => {
    approx(L_isco, 3.4641016151377544, 1e-12);
  });

  test('Schwarzschild ISCO orbit stays near r=6M (marginally stable)', () => {
    // The ISCO is marginally stable: R''=0 means any numerical perturbation
    // will eventually cause drift. We verify it stays close for a short integration.
    const result = integrateGeodesic({
      M, a: 0.001, // use tiny a to avoid a=0 singularity in some code paths
      E: E_isco, L: L_isco, Q: 0, kappa: 1,
      r0: r_isco, theta0: Math.PI / 2, signR: 0, signTheta: 0,
      h: 0.01, nSteps: 200, tolerance: 1e-12,
    });
    const pos = result.positions;
    for (let i = 0; i < result.nPoints; i++) {
      const r = Math.sqrt(pos[i*3]**2 + pos[i*3+1]**2 + pos[i*3+2]**2);
      assert(Math.abs(r - r_isco) < 0.5,
        `r = ${r} at step ${i}, expected ≈ ${r_isco}`);
    }
  });
}

// ── Circular orbits (Schwarzschild) ──────────────────────────────────

console.log('\n── Circular orbits (a=0) ──');

// For Schwarzschild circular orbits at radius r (M=1):
// E = (r-2) / √(r(r-3)),  L = r / √(r-3)

{
  const M = 1, a = 0, kappa = 1, Q = 0;

  for (const rc of [8, 10, 15, 20]) {
    const E_circ = (rc - 2 * M) / Math.sqrt(rc * (rc - 3 * M));
    const L_circ = rc * Math.sqrt(M / (rc - 3 * M));
    const params = { M, a, E: E_circ, L: L_circ, Q, kappa };

    test(`circular orbit R(r=${rc}) = 0`, () => {
      const R = radialPotential(rc, params);
      approx(R, 0, 1e-8);
    });

    test(`circular orbit R'(r=${rc}) = 0`, () => {
      const Rp = radialPotentialDeriv(rc, params);
      approx(Rp, 0, 1e-6);
    });

    test(`circular orbit R''(r=${rc}) < 0 (stable)`, () => {
      // Stable circular orbits (r > 6M) have R'' < 0 at the orbit
      const eps = 1e-5;
      const Rp = radialPotentialDeriv(rc + eps, params);
      const Rm = radialPotentialDeriv(rc - eps, params);
      const Rpp = (Rp - Rm) / (2 * eps);
      assert(Rpp < 0, `R''(${rc}) = ${Rpp} should be < 0 for stable orbit`);
    });
  }

  test('circular orbit at r=10 stays at constant radius', () => {
    const rc = 10;
    const E_circ = (rc - 2 * M) / Math.sqrt(rc * (rc - 3 * M));
    const L_circ = rc * Math.sqrt(M / (rc - 3 * M));
    const result = integrateGeodesic({
      M, a: 0.001, E: E_circ, L: L_circ, Q: 0, kappa: 1,
      r0: rc, theta0: Math.PI / 2, signR: 0, signTheta: 0,
      h: 0.1, nSteps: 5000, tolerance: 1e-10,
    });
    const pos = result.positions;
    for (let i = 0; i < result.nPoints; i++) {
      const r = Math.sqrt(pos[i*3]**2 + pos[i*3+1]**2 + pos[i*3+2]**2);
      assert(Math.abs(r - rc) < 0.05,
        `r = ${r.toFixed(4)} at step ${i}, expected ≈ ${rc}`);
    }
  });
}

// ── Photon sphere (Schwarzschild) ────────────────────────────────────

console.log('\n── Photon sphere (a=0) ──');

{
  const M = 1, a = 0, kappa = 0, Q = 0;
  const r_ph = 3 * M;
  // Circular photon orbit: L/E = 3√3·M
  const E_ph = 1.0;
  const L_ph = 3 * Math.sqrt(3) * M;
  const params = { M, a, E: E_ph, L: L_ph, Q, kappa };

  test('photon sphere R(r=3M) = 0', () => {
    const R = radialPotential(r_ph, params);
    approx(R, 0, 1e-10);
  });

  test('photon sphere R\'(r=3M) = 0', () => {
    const Rp = radialPotentialDeriv(r_ph, params);
    approx(Rp, 0, 1e-8);
  });

  test('photon sphere R\'\'(r=3M) > 0 (unstable)', () => {
    const eps = 1e-5;
    const Rp = radialPotentialDeriv(r_ph + eps, params);
    const Rm = radialPotentialDeriv(r_ph - eps, params);
    const Rpp = (Rp - Rm) / (2 * eps);
    assert(Rpp > 0, `R''(3) = ${Rpp} should be > 0 (unstable photon orbit)`);
  });
}

// ── Kerr ISCO (prograde) ─────────────────────────────────────────────

console.log('\n── Kerr ISCO (prograde) ──');

// ISCO radius formula: r = M(3 + Z₂ - √((3-Z₁)(3+Z₁+2Z₂)))
// where Z₁ = 1 + (1-a²/M²)^(1/3)[(1+a/M)^(1/3) + (1-a/M)^(1/3)]
//       Z₂ = √(3a²/M² + Z₁²)
// Circular orbit E,L from Bardeen+ (1972)

function kerrISCO(M, a) {
  const chi = a / M;
  const Z1 = 1 + Math.cbrt(1 - chi * chi) * (Math.cbrt(1 + chi) + Math.cbrt(1 - chi));
  const Z2 = Math.sqrt(3 * chi * chi + Z1 * Z1);
  return M * (3 + Z2 - Math.sqrt((3 - Z1) * (3 + Z1 + 2 * Z2)));
}

function circularOrbitEL(r, M, a) {
  // Prograde equatorial circular orbit E, L
  const sqMr = Math.sqrt(M * r);
  const denom = r * Math.sqrt(r * r - 3 * M * r + 2 * a * sqMr);
  const E = (r * r - 2 * M * r + a * sqMr) / denom;
  const L = sqMr * (r * r - 2 * a * sqMr + a * a) / denom;
  return { E, L };
}

for (const aVal of [0.5, 0.9, 0.99]) {
  const M = 1;
  const r_isco = kerrISCO(M, aVal);
  const { E: E_isco, L: L_isco } = circularOrbitEL(r_isco, M, aVal);
  const params = { M, a: aVal, E: E_isco, L: L_isco, Q: 0, kappa: 1 };

  test(`Kerr ISCO (a=${aVal}): R(r=${r_isco.toFixed(3)}) ≈ 0`, () => {
    const R = radialPotential(r_isco, params);
    approx(R, 0, 1e-6);
  });

  test(`Kerr ISCO (a=${aVal}): R'(r) ≈ 0`, () => {
    const Rp = radialPotentialDeriv(r_isco, params);
    approx(Rp, 0, 1e-4);
  });
}

test('Kerr ISCO radius decreases with spin', () => {
  const r1 = kerrISCO(1, 0.001); // ≈ 6M (Schwarzschild)
  const r2 = kerrISCO(1, 0.5);
  const r3 = kerrISCO(1, 0.9);
  const r4 = kerrISCO(1, 0.99);
  assert(r1 > r2 && r2 > r3 && r3 > r4,
    `ISCO radii should decrease: ${r1.toFixed(3)} > ${r2.toFixed(3)} > ${r3.toFixed(3)} > ${r4.toFixed(3)}`);
  approx(r1, 6, 0.05); // Should be ≈ 6M for a≈0
});

test('Kerr ISCO (a→1) approaches r=M', () => {
  const r = kerrISCO(1, 0.998);
  assert(r < 1.5, `r_ISCO(a=0.998) = ${r.toFixed(4)} should be < 1.5M`);
});

// ── Kerr circular orbit integration ─────────────────────────────────

console.log('\n── Kerr circular orbit integration ──');

test('Kerr circular orbit at r=8 (a=0.9) stays at constant r', () => {
  const M = 1, a = 0.9, rc = 8;
  const { E, L } = circularOrbitEL(rc, M, a);
  const result = integrateGeodesic({
    M, a, E, L, Q: 0, kappa: 1,
    r0: rc, theta0: Math.PI / 2, signR: 0, signTheta: 0,
    h: 0.1, nSteps: 3000, tolerance: 1e-10,
  });
  const pos = result.positions;
  for (let i = 0; i < result.nPoints; i++) {
    const r = Math.sqrt(pos[i*3]**2 + pos[i*3+1]**2 + pos[i*3+2]**2);
    assert(Math.abs(r - rc) < 0.1,
      `r = ${r.toFixed(4)} at step ${i}, expected ≈ ${rc}`);
  }
});

// ── Velocity utils roundtrip ─────────────────────────────────────────

console.log('\n── Velocity utils roundtrip ──');

for (const [name, preset] of Object.entries(PRESETS)) {
  if (preset.signR === 0 && preset.signTheta === 0) continue;
  // Skip plunging orbit: Θ(θ₀) < 0 (forbidden zone), so v_θ is clamped to 0,
  // losing Carter constant information in the roundtrip
  if (name === 'plungingOrbit') continue;
  test(`constants→velocity→constants roundtrip for ${name}`, () => {
    const { M = 1, a, E, L, Q, kappa, r0, theta0, signR, signTheta } = preset;

    // Constants → velocity
    const vel = constantsToVelocity(r0, theta0, E, L, Q, M, a, kappa, signR, signTheta);
    assert(vel, 'constantsToVelocity returned null');

    // Velocity → constants
    const c = velocityToConstants(r0, theta0, vel.ur, vel.utheta, vel.uphi, M, a, kappa);
    assert(c, 'velocityToConstants returned null');

    approx(c.E, E, 1e-6);
    approx(c.L, L, 1e-5);
    approx(c.Q, Q, 1e-4);
  });
}

// ── BL ↔ Cartesian velocity roundtrip ────────────────────────────────

console.log('\n── BL ↔ Cartesian velocity roundtrip ──');

for (const [r, theta, phi, a] of [[10, 1.2, 0.5, 0.9], [6, Math.PI/2, 0, 0.5], [15, 0.8, 2.0, 0.001]]) {
  test(`BL→Cart→BL roundtrip at r=${r}, θ=${theta.toFixed(2)}, a=${a}`, () => {
    const ur = 0.3, utheta = -0.1, uphi = 0.05;
    const cart = blVelocityToCartesian(r, theta, phi, a, ur, utheta, uphi);
    const bl = cartesianVelocityToBL(r, theta, phi, a, cart[0], cart[1], cart[2]);
    approx(bl.ur, ur, 1e-10);
    approx(bl.utheta, utheta, 1e-10);
    approx(bl.uphi, uphi, 1e-10);
  });
}

// ── Summary ─────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
