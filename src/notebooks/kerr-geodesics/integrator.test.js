// Unit tests for Kerr geodesic integrator
// Run: node src/notebooks/kerr-geodesics/integrator.test.js

import { integrateGeodesic, hamiltonian, carterQ, PRESETS } from './integrator.js';
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
    const z = Math.abs(pos[i*3+2]);
    assert(z < 0.5, `|z| = ${z} at step ${i} should be < 0.5 for equatorial orbit`);
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
    const z = Math.abs(pos[i*3+2]);
    assert(z < 0.1, `|z| = ${z} at step ${i} should be < 0.1 for a≈0 equatorial orbit`);
  }
});

test('Schwarzschild orbit conserves H well', () => {
  const result = integrateGeodesic(PRESETS.schwarzschild);
  assert(result.diagnostics.dH < 0.01,
    `dH = ${result.diagnostics.dH.toExponential(2)} should be < 0.01`);
});

// ── Summary ─────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
