// Verification gates for the planar floating-base dynamics core.
//
// The dynamics rest entirely on one algorithm (RNEA), so the gates check it
// against independent formulations: the energy function (mass matrix and
// gravity torques by finite differences), conservation laws (free-fall
// momenta, passive energy), and a textbook compound double pendulum derived
// separately from the Lagrangian. Gate F also demonstrates the explicit-Euler
// failure that motivates the semi-implicit/RK4 choice.
//
// Run: node src/notebooks/handstand/test/dynamics.mjs
import { buildModel, handstandPose } from '../anthropometry.js';
import {
  createWorkspace, fk, rnea, massMatrix, crbaMassMatrix, forwardDynamics, energy, momenta,
  choleskySolveInPlace,
} from '../dynamics.js';
import { makeIntegratorWorkspace, rk4Step, explicitEulerStep, semiImplicitEulerStep } from '../integrate.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5);

const model = buildModel({ heightM: 1.75, massKg: 70 });
const ws = createWorkspace(model);
const nq = model.nq;

function randomState(scaleQ = 1, scaleQd = 1) {
  const q = new Float64Array(nq), qd = new Float64Array(nq);
  q[0] = rnd(); q[1] = 1 + rnd(); q[2] = rnd() * scaleQ;
  for (let i = 3; i < nq; i++) q[i] = rnd() * 2 * scaleQ;
  for (let i = 0; i < nq; i++) qd[i] = rnd() * 2 * scaleQd;
  return { q, qd };
}

// ---------------------------------------------------------------------------
// Gate A: anthropometric sanity. Total mass is the input mass; in the stacked
// handstand pose the CoM sits at a plausible height and lands over the palm.
// ---------------------------------------------------------------------------
{
  let m = 0;
  for (let i = 0; i < model.nb; i++) m += model.mass[i];
  const q = handstandPose(model);
  q[1] = model.wristHeight;
  const mo = momenta(model, q, new Float64Array(nq), ws);
  const comOk = mo.comX > model.patch.x0 && mo.comX < model.patch.x1;
  const heightOk = mo.comY > 0.85 && mo.comY < 1.35;
  gate('A: mass budget and stacked-pose CoM',
    Math.abs(m - model.massKg) < 1e-9 && comOk && heightOk,
    `mass=${m.toFixed(6)}, com=(${mo.comX.toFixed(3)}, ${mo.comY.toFixed(3)}), patch=[${model.patch.x0.toFixed(3)}, ${model.patch.x1.toFixed(3)}]`);
}

// ---------------------------------------------------------------------------
// Gate B: mass matrix from RNEA columns matches the kinetic-energy quadratic
// form M_ij = KE(e_i + e_j) - KE(e_i) - KE(e_j), and is SPD.
// ---------------------------------------------------------------------------
{
  const { q } = randomState();
  const M = new Float64Array(nq * nq);
  massMatrix(model, q, M, ws);
  let worst = 0;
  const KE = (qd) => energy(model, q, qd, ws).kinetic;
  const ei = new Float64Array(nq), ej = new Float64Array(nq), eij = new Float64Array(nq);
  for (let i = 0; i < nq; i++) {
    for (let j = 0; j < nq; j++) {
      ei.fill(0); ej.fill(0); eij.fill(0);
      ei[i] = 1; ej[j] = 1; eij[i] += 1; eij[j] += 1;
      const Mij = KE(eij) - KE(ei) - KE(ej);
      worst = Math.max(worst, Math.abs(Mij - M[i * nq + j]));
    }
  }
  let spd = true;
  try {
    const A = M.slice();
    const b = new Float64Array(nq).fill(1);
    choleskySolveInPlace(A, b, nq);
  } catch (e) { spd = false; }
  gate('B: M matches energy quadratic form and is SPD', worst < 1e-9 && spd,
    `max |dM|=${worst.toExponential(2)}`);
}

// ---------------------------------------------------------------------------
// Gate B2: the composite-rigid-body mass matrix (the hot-loop path) matches
// RNEA column extraction to machine precision at random states, floating
// and fixed base alike.
// ---------------------------------------------------------------------------
{
  let worst = 0;
  for (let trial = 0; trial < 10; trial++) {
    const { q } = randomState(1.5);
    const Ma = new Float64Array(nq * nq);
    const Mb = new Float64Array(nq * nq);
    massMatrix(model, q, Ma, ws);
    crbaMassMatrix(model, q, Mb, ws);
    for (let i = 0; i < nq * nq; i++) worst = Math.max(worst, Math.abs(Ma[i] - Mb[i]));
  }
  gate('B2: CRBA mass matrix matches RNEA columns', worst < 1e-9,
    `max |dM|=${worst.toExponential(2)}`);
}

// ---------------------------------------------------------------------------
// Gate C: gravity torques rnea(q, 0, 0) match central finite differences of
// the potential energy.
// ---------------------------------------------------------------------------
{
  const { q } = randomState();
  const zero = new Float64Array(nq);
  const tau = new Float64Array(nq);
  rnea(model, q, zero, zero, tau, null, { ws });
  const eps = 1e-6;
  let worst = 0;
  for (let i = 0; i < nq; i++) {
    const qp = q.slice(); qp[i] += eps;
    const qm = q.slice(); qm[i] -= eps;
    const dV = (energy(model, qp, zero, ws).potential - energy(model, qm, zero, ws).potential) / (2 * eps);
    worst = Math.max(worst, Math.abs(tau[i] - dV));
  }
  gate('C: static torques match dV/dq', worst < 1e-6, `max err=${worst.toExponential(2)}`);
}

// ---------------------------------------------------------------------------
// Gate D: forward dynamics then inverse dynamics round-trips the applied
// generalized forces, with external point forces in play.
// ---------------------------------------------------------------------------
{
  const { q, qd } = randomState();
  const tauAct = new Float64Array(nq);
  for (let i = 0; i < nq; i++) tauAct[i] = 50 * rnd();
  fk(model, q, qd, ws);
  const ext = {
    count: 2,
    body: new Int32Array([0, 4]),
    px: new Float64Array(2), py: new Float64Array(2),
    fx: new Float64Array([120 * rnd(), 120 * rnd()]),
    fy: new Float64Array([300 + 60 * rnd(), 100 * rnd()]),
  };
  ext.px[0] = ws.px[0] + 0.05; ext.py[0] = ws.py[0] - 0.03;
  ext.px[1] = ws.px[4] + 0.2; ext.py[1] = ws.py[4];
  const qdd = new Float64Array(nq);
  forwardDynamics(model, q, qd, tauAct, ext, qdd, ws);
  const tauBack = new Float64Array(nq);
  rnea(model, q, qd, qdd, tauBack, ext, { ws });
  let worst = 0;
  for (let i = 0; i < nq; i++) worst = Math.max(worst, Math.abs(tauBack[i] - tauAct[i]));
  gate('D: forward/inverse round trip with external forces', worst < 1e-8,
    `max err=${worst.toExponential(2)}`);
}

// ---------------------------------------------------------------------------
// Gate E: passive free fall conserves spin angular momentum about the CoM and
// accelerates the CoM at exactly -g. Exercises the branching tree.
// ---------------------------------------------------------------------------
{
  const { q, qd } = randomState(1, 1);
  const y = new Float64Array(2 * nq);
  y.set(q); y.set(qd, nq);
  const iws = makeIntegratorWorkspace(2 * nq);
  const qs = new Float64Array(nq), qds = new Float64Array(nq), qdds = new Float64Array(nq);
  const deriv = (yy, out) => {
    qs.set(yy.subarray(0, nq)); qds.set(yy.subarray(nq));
    forwardDynamics(model, qs, qds, null, null, qdds, ws);
    out.set(yy.subarray(nq), 0);
    out.set(qdds, nq);
  };
  const m0 = momenta(model, q, qd, ws);
  const T = 0.2, dt = 1e-4, steps = Math.round(T / dt);
  for (let s = 0; s < steps; s++) rk4Step(deriv, y, dt, iws);
  const m1 = momenta(model, y.subarray(0, nq), y.subarray(nq), ws);
  const dpyExpected = -m0.mass * model.gravity * T;
  const errPy = Math.abs((m1.py - m0.py) - dpyExpected);
  const errPx = Math.abs(m1.px - m0.px);
  const errL = Math.abs(m1.Lspin - m0.Lspin);
  gate('E: free-fall momentum conservation', errPx < 1e-7 && errPy < 1e-7 && errL < 1e-6,
    `|dpx|=${errPx.toExponential(2)}, |dpy-mgT|=${errPy.toExponential(2)}, |dL|=${errL.toExponential(2)}`);
}

// ---------------------------------------------------------------------------
// Gate F: passive zero-gravity energy conservation. RK4 error drops ~16x when
// dt halves (4th order), while both first-order Euler variants sit orders of
// magnitude above it at the same dt. Note: on smooth articulated dynamics
// semi-implicit Euler has NO accuracy advantage over explicit Euler (the
// Hamiltonian is non-separable); its stability advantage appears only with
// stiff contact springs and is demonstrated in test/contact.mjs.
// ---------------------------------------------------------------------------
{
  const m0g = { ...model, gravity: 0 };
  const { q, qd } = randomState(1, 2);
  const E0 = energy(m0g, q, qd, ws).total;
  const qs = new Float64Array(nq), qds = new Float64Array(nq), qdds = new Float64Array(nq);
  const deriv = (yy, out) => {
    qs.set(yy.subarray(0, nq)); qds.set(yy.subarray(nq));
    forwardDynamics(m0g, qs, qds, null, null, qdds, ws);
    out.set(yy.subarray(nq), 0);
    out.set(qdds, nq);
  };
  const run = (stepper, dt, T) => {
    const y = new Float64Array(2 * nq);
    y.set(q); y.set(qd, nq);
    const iws = makeIntegratorWorkspace(2 * nq);
    const steps = Math.round(T / dt);
    for (let s = 0; s < steps; s++) stepper(deriv, y, dt, iws);
    return Math.abs(energy(m0g, y.subarray(0, nq), y.subarray(nq), ws).total - E0) / Math.abs(E0);
  };
  const T = 5.0;
  const rk4Coarse = run(rk4Step, 2e-3, T);
  const rk4Fine = run(rk4Step, 1e-3, T);
  const order = Math.log2(rk4Coarse / rk4Fine);
  const euler = run(explicitEulerStep, 1e-3, T);
  const eulerHalf = run(explicitEulerStep, 5e-4, T);

  const accel = (qq, qqd, out) => forwardDynamics(m0g, qq, qqd, null, null, out, ws);
  const ySI = q.slice(), ydSI = qd.slice();
  for (let s = 0; s < Math.round(T / 1e-3); s++) semiImplicitEulerStep(accel, ySI, ydSI, 1e-3, qdds);
  const si = Math.abs(energy(m0g, ySI, ydSI, ws).total - E0) / Math.abs(E0);

  // If both errors sit at the roundoff floor the order estimate is noise;
  // machine-precision energy conservation at 1-2 ms steps is itself the pass.
  const atRoundoff = rk4Coarse < 1e-12 && rk4Fine < 1e-12;
  gate('F: RK4 4th-order energy convergence (or roundoff floor)',
    (atRoundoff || order > 3.5) && rk4Fine < 1e-9,
    `order~${order.toFixed(2)}, err(2ms)=${rk4Coarse.toExponential(2)}, err(1ms)=${rk4Fine.toExponential(2)}`);
  const eulerOrder = Math.log2(euler / eulerHalf);
  gate('F: both Euler variants are first-order and far above RK4 on smooth dynamics',
    euler > 1e3 * rk4Fine && si > 1e3 * rk4Fine && eulerOrder > 0.7 && eulerOrder < 1.5,
    `euler=${euler.toExponential(2)} (order~${eulerOrder.toFixed(2)}), semi-implicit=${si.toExponential(2)}, rk4=${rk4Fine.toExponential(2)}`);
}

// ---------------------------------------------------------------------------
// Gate G: fixed-base compound double pendulum matches an independently
// derived textbook Lagrangian formulation integrated side by side.
// ---------------------------------------------------------------------------
{
  const L1 = 1.0, L2 = 0.7, m1 = 1.0, m2 = 2.0, g = 9.81;
  const d1 = 0.5 * L1, d2 = 0.35 * L2;
  const I1 = m1 * L1 * L1 / 12, I2 = m2 * L2 * L2 / 12;
  const dp = {
    gravity: g, nb: 3, nj: 2, nq: 2, fixedBase: true,
    parent: new Int32Array([-1, 0, 1]),
    mass: new Float64Array([0, m1, m2]),
    comX: new Float64Array([0, d1, d2]),
    comY: new Float64Array(3),
    inertia: new Float64Array([0, I1, I2]),
    anchorX: new Float64Array([0, 0, L1]),
    anchorY: new Float64Array(3),
  };
  const dws = createWorkspace(dp);

  // Textbook EOM in absolute angles th1, th2 measured CCW from +x.
  const A11 = I1 + m1 * d1 * d1 + m2 * L1 * L1;
  const A22 = I2 + m2 * d2 * d2;
  const C = m2 * L1 * d2;
  const refDeriv = (y, out) => {
    const [t1, t2, w1, w2] = y;
    const M12 = C * Math.cos(t1 - t2);
    const r1 = -C * Math.sin(t1 - t2) * w2 * w2 - (m1 * d1 + m2 * L1) * g * Math.cos(t1);
    const r2 = C * Math.sin(t1 - t2) * w1 * w1 - m2 * g * d2 * Math.cos(t2);
    const det = A11 * A22 - M12 * M12;
    out[0] = w1; out[1] = w2;
    out[2] = (A22 * r1 - M12 * r2) / det;
    out[3] = (A11 * r2 - M12 * r1) / det;
  };

  const q = new Float64Array([0.9, -0.4]);       // relative angles
  const qd = new Float64Array([0.3, -1.1]);
  const yRef = new Float64Array([q[0], q[0] + q[1], qd[0], qd[0] + qd[1]]);

  const y = new Float64Array(4);
  y.set(q); y.set(qd, 2);
  const qs = new Float64Array(2), qds = new Float64Array(2), qdds = new Float64Array(2);
  const deriv = (yy, out) => {
    qs.set(yy.subarray(0, 2)); qds.set(yy.subarray(2));
    forwardDynamics(dp, qs, qds, null, null, qdds, dws);
    out.set(yy.subarray(2), 0);
    out.set(qdds, 2);
  };
  const iws = makeIntegratorWorkspace(4);
  const dt = 1e-4, T = 2.0, steps = Math.round(T / dt);
  let worst = 0;
  for (let s = 0; s < steps; s++) {
    rk4Step(deriv, y, dt, iws);
    rk4Step(refDeriv, yRef, dt, iws);
    const th1 = y[0], th2 = y[0] + y[1];
    worst = Math.max(worst, Math.abs(th1 - yRef[0]), Math.abs(th2 - yRef[1]));
  }
  gate('G: double pendulum matches textbook Lagrangian over 2s', worst < 1e-6,
    `max angle err=${worst.toExponential(2)} rad`);
}

console.log(failures ? `\n${failures} gate(s) FAILED` : '\nAll dynamics gates passed');
process.exit(failures ? 1 : 0);
