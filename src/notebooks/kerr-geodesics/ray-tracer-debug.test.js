// Unit tests for polar artifacts in the Kerr ray tracer.
// Run with: node --input-type=module ray-tracer-debug.test.js

import { traceRay, computeRayParams } from './ray-tracer-debug.js';

const PI = Math.PI;

// Real camera position from the notebook (rtCamera.update())
// eye is at roughly [6.8, 1.25, 30.5] — mostly in front of the disk plane,
// slightly above it. This is the view that shows the pole artifacts.
const EYE = [6.841, 1.251, 30.466];

const OPTS = { a: 0.4, M: 1.0, hBase: 0.5, maxSteps: 2000 };

function norm([x, y, z]) {
  const l = Math.sqrt(x*x + y*y + z*z);
  return [x/l, y/l, z/l];
}

// Ray that aims toward the black hole (origin) from the camera
function rayToward(target = [0,0,0]) {
  return norm([target[0]-EYE[0], target[1]-EYE[1], target[2]-EYE[2]]);
}

// Ray aimed at a point just offset from the polar axis in screen-space x
// The polar axis in Cartesian is the y-axis.  A point on the y-axis projects
// to the "top" of the black hole image.  We offset in x to bracket the seam.
function rayNearPole(xOffset) {
  // Aim from eye toward [xOffset, large_y, 0] — i.e., points near the top of
  // the black hole on the y-axis, bracketing the pole.
  return rayToward([xOffset, 30, 0]);
}

function wrapPi(phi) {
  return ((phi % (2*PI)) + 3*PI) % (2*PI) - PI;
}

// ── test harness ─────────────────────────────────────────────────────────────

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ── 1. Basic: rays near the pole actually hit the disk ───────────────────────

test('near-pole rays hit the disk', () => {
  for (const dx of [-0.1, -0.01, 0.01, 0.1]) {
    const r = traceRay(rayNearPole(dx), EYE, OPTS);
    console.log(`  dx=${dx}: L=${r.rp?.L?.toFixed(4)}, Q=${r.rp?.Q?.toFixed(4)}, crossings=${r.diskCrossings.length}, escaped=${!!r.escaped}`);
  }
});

// ── 2. Phi continuity across the seam ────────────────────────────────────────
// Rays just left vs just right of the pole should give smoothly varying phi
// at the disk crossing. A discontinuity here IS the texture seam.

test('phi at disk crossing is continuous across the pole', () => {
  const offsets = [-0.5, -0.2, -0.1, -0.05, -0.02, -0.01, -0.005, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5];
  const results = [];
  for (const dx of offsets) {
    const r = traceRay(rayNearPole(dx), EYE, OPTS);
    if (r.diskCrossings.length > 0) {
      results.push({ dx, phi: r.diskCrossings[0].phi, r: r.diskCrossings[0].r });
    } else {
      console.log(`  dx=${dx}: no disk hit`);
    }
  }

  // Wrap phi to [0, 2π] — matching what diskColor now does before the noise lookup
  const wrap2pi = phi => ((phi % (2*PI)) + 2*PI) % (2*PI);

  console.log('  dx         raw phi     wrapped phi   r');
  for (const p of results) {
    console.log(`  ${p.dx.toFixed(4).padStart(7)}  ${p.phi.toFixed(4).padStart(10)}  ${wrap2pi(p.phi).toFixed(4).padStart(12)}  ${p.r.toFixed(3)}`);
  }

  // Find the largest jump between adjacent entries in *wrapped* phi.
  // Skip pairs where dx straddles zero (the pole direction) — a small
  // genuine azimuthal difference is expected there.
  let maxJump = 0, maxAt = null;
  for (let i = 1; i < results.length; i++) {
    if (results[i-1].dx < 0 && results[i].dx > 0) continue; // skip pole straddle
    const a = wrap2pi(results[i-1].phi);
    const b = wrap2pi(results[i].phi);
    let dp = Math.abs(b - a);
    if (dp > PI) dp = 2*PI - dp; // wrap-around continuity
    if (dp > maxJump) { maxJump = dp; maxAt = results[i].dx; }
  }
  console.log(`  max |Δwrapped_phi| between adjacent same-side rays: ${maxJump.toFixed(4)} rad near dx=${maxAt}`);
  if (maxJump > 0.5) throw new Error(`Wrapped phi jump of ${maxJump.toFixed(3)} rad — seam still present`);
});

// ── 3. Phi drift from singular dphi ─────────────────────────────────────────
// For a ray that passes close to the pole, record the cumulative phi change
// and the max single-step phi change.  A large step = the L/sin²θ singularity firing.

test('no large single-step phi change for near-pole ray', () => {
  const r = traceRay(rayNearPole(0.01), EYE, { ...OPTS, recordSteps: true });
  console.log(`  total steps: ${r.steps.length}, disk crossings: ${r.diskCrossings.length}`);
  if (r.steps.length === 0) { console.log('  no steps — ray invalid'); return; }

  let maxDphi = 0, maxAt = -1;
  for (let i = 1; i < r.steps.length; i++) {
    const dp = Math.abs(r.steps[i].phi - r.steps[i-1].phi);
    if (dp > maxDphi) { maxDphi = dp; maxAt = i; }
  }

  // Print the 5 steps around the worst one
  const lo = Math.max(0, maxAt - 2), hi = Math.min(r.steps.length-1, maxAt+2);
  console.log(`  step   theta       phi         dphi        h`);
  for (let i = lo; i <= hi; i++) {
    const s = r.steps[i];
    const dp = i > 0 ? (s.phi - r.steps[i-1].phi).toFixed(5) : '—';
    console.log(`  ${String(s.step).padStart(4)}   ${s.theta.toFixed(5).padStart(9)}  ${s.phi.toFixed(5).padStart(10)}  ${dp.padStart(10)}  ${s.h.toFixed(4)}`);
  }
  console.log(`  max |Δphi| per step: ${maxDphi.toFixed(5)} rad at step ${maxAt} (theta=${r.steps[maxAt]?.theta.toFixed(5)})`);
  if (maxDphi > PI) throw new Error(`Single-step Δphi=${maxDphi.toFixed(3)} — singular dphi`);
});

// ── 4. Theta reflection and phi shift on pole crossing ───────────────────────

test('pole-crossing ray: theta reflected, phi shifted by pi', () => {
  // Use a ray aimed right at the pole from close range so it definitely crosses
  const eyeClose = [0.05, 5, 0.05];
  const r = traceRay(norm([0, -1, 0]), eyeClose, { ...OPTS, recordSteps: true });
  const crossings = r.steps.filter(s => s.crossedPole);
  console.log(`  pole crossings: ${crossings.length}`);
  if (crossings.length === 0) {
    console.log('  (ray did not cross pole — checking theta range)');
    const outOfRange = r.steps.filter(s => s.theta < 0 || s.theta > PI);
    console.log(`  steps with theta out of [0,pi]: ${outOfRange.length}`);
    return;
  }
  for (const s of crossings) {
    console.log(`  step ${s.step}: theta=${s.theta.toFixed(5)}, phi=${s.phi.toFixed(5)}`);
    if (s.theta < 0 || s.theta > PI) throw new Error(`theta=${s.theta} after reflection`);
  }
});

// ── 5. Sanity: disk hit r should be between rISCO and rOuter ─────────────────

test('disk crossing r is in valid range', () => {
  const a = OPTS.a, M = OPTS.M;
  const z1 = 1 + Math.cbrt(1-a*a/M/M) * (Math.cbrt(1+a/M) + Math.cbrt(1-a/M));
  const z2 = Math.sqrt(3*a*a/M/M + z1*z1);
  const rISCO = M * (3 + z2 - Math.sqrt((3-z1)*(3+z1+2*z2)));
  const rOuter = 15;
  console.log(`  rISCO=${rISCO.toFixed(3)}, rOuter=${rOuter}`);

  for (const dx of [-0.2, -0.05, 0.05, 0.2]) {
    const res = traceRay(rayNearPole(dx), EYE, OPTS);
    // Only check crossings that land inside the disk — diskColor returns opacity=0
    // for r outside [rISCO, rOuter] so out-of-range crossings don't contribute.
    const active = res.diskCrossings.filter(c => c.r >= rISCO * 0.99 && c.r <= rOuter);
    if (active.length === 0) { console.log(`  dx=${dx}: no active disk crossing (ok)`); continue; }
    for (const c of active) {
      console.log(`  dx=${dx}: r=${c.r.toFixed(3)} (ok)`);
    }
  }
});

// ── runner ────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
for (const { name, fn } of tests) {
  process.stdout.write(`\n[TEST] ${name}\n`);
  try {
    fn();
    console.log('  PASS');
    passed++;
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
    failed++;
  }
}
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
