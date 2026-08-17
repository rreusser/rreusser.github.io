// Fixed-step integrators over the state y = [q; qd] (length 2n), plus the
// contact-rich simulate() driver. deriv(y, out) fills out = [qd; qdd].
// Semi-implicit Euler is the default for contact-rich simulation (bounded
// energy behavior with stiff penalty contacts); RK4 serves smooth-phase
// accuracy and convergence checks; explicit Euler exists to demonstrate why
// it is not used.

import { forwardDynamics, momenta } from './dynamics.js';
import { computeContactForces, resetContacts } from './contact.js';

export function makeIntegratorWorkspace(n2) {
  return {
    k1: new Float64Array(n2), k2: new Float64Array(n2),
    k3: new Float64Array(n2), k4: new Float64Array(n2),
    tmp: new Float64Array(n2),
  };
}

export function rk4Step(deriv, y, dt, ws) {
  const n = y.length;
  const { k1, k2, k3, k4, tmp } = ws;
  deriv(y, k1);
  for (let i = 0; i < n; i++) tmp[i] = y[i] + 0.5 * dt * k1[i];
  deriv(tmp, k2);
  for (let i = 0; i < n; i++) tmp[i] = y[i] + 0.5 * dt * k2[i];
  deriv(tmp, k3);
  for (let i = 0; i < n; i++) tmp[i] = y[i] + dt * k3[i];
  deriv(tmp, k4);
  for (let i = 0; i < n; i++) {
    y[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
}

export function explicitEulerStep(deriv, y, dt, ws) {
  deriv(y, ws.k1);
  for (let i = 0; i < y.length; i++) y[i] += dt * ws.k1[i];
}

// accel(q, qd, qddOut) evaluated at the current state; velocities update
// first, then positions advance with the new velocities.
export function semiImplicitEulerStep(accel, q, qd, dt, qddScratch) {
  const n = q.length;
  accel(q, qd, qddScratch);
  for (let i = 0; i < n; i++) qd[i] += dt * qddScratch[i];
  for (let i = 0; i < n; i++) q[i] += dt * qd[i];
}

// Contact-rich forward simulation. control fills the actuated torque vector
// once per step (a ~kHz neural sample-and-hold); contacts may be null for
// free motion. Records snapshots every recordEvery steps (plus the final
// state): time, q, qd, actuated torques, contact point forces, CoM, momenta.
//
// integrator: 'si' (semi-implicit Euler; jointDamping treated implicitly,
// tolerates stiff damping at small dt) or 'rk4' (classic RK4 over the step
// with the control torque frozen, contact forces re-evaluated at each stage
// without committing friction-anchor state, and jointDamping applied
// explicitly, which requires damping small enough for RK4's stability
// region but buys 4th-order accuracy at several times the step size).
export function simulate(model, ws, {
  q0, qd0, T, dt = 2e-4,
  integrator = 'si',
  contacts = null,
  control = null,
  jointDamping = null,
  recordEvery = null,
  divergenceLimit = 1e3,
  stopWhen = null,
} = {}) {
  const nq = model.nq;
  const q = Float64Array.from(q0);
  const qd = qd0 ? Float64Array.from(qd0) : new Float64Array(nq);
  const tau = new Float64Array(nq);
  const qdd = new Float64Array(nq);
  if (contacts) resetContacts(contacts);
  const steps = Math.round(T / dt);
  const stride = recordEvery || Math.max(1, Math.round(1 / (240 * dt)));
  const rec = { t: [], q: [], qd: [], tau: [], forces: [], com: [], L: [], dt, stride };
  let diverged = false;

  const snapshot = (k) => {
    rec.t.push(k * dt);
    rec.q.push(q.slice());
    rec.qd.push(qd.slice());
    rec.tau.push(tau.slice(3));
    rec.forces.push(contacts ? {
      px: Array.from(contacts.ext.px), py: Array.from(contacts.ext.py),
      fx: Array.from(contacts.ext.fx), fy: Array.from(contacts.ext.fy),
    } : null);
    const mo = momenta(model, q, qd, ws);
    rec.com.push([mo.comX, mo.comY]);
    rec.L.push(mo.Lspin);
  };

  let stopped = false;
  const rk4 = integrator === 'rk4';
  const y = rk4 ? new Float64Array(2 * nq) : null;
  const iws = rk4 ? makeIntegratorWorkspace(2 * nq) : null;
  const dq = rk4 ? new Float64Array(nq) : null;
  const dqd = rk4 ? new Float64Array(nq) : null;
  const deriv = rk4 ? (yy, out) => {
    dq.set(yy.subarray(0, nq));
    dqd.set(yy.subarray(nq));
    const ext2 = contacts ? computeContactForces(model, ws, dq, dqd, contacts, false) : null;
    forwardDynamics(model, dq, dqd, tau, ext2, qdd, ws, jointDamping, 0);
    out.set(yy.subarray(nq), 0);
    out.set(qdd, nq);
  } : null;

  for (let k = 0; k < steps; k++) {
    const ext = contacts ? computeContactForces(model, ws, q, qd, contacts, true) : null;
    tau.fill(0);
    control?.(k * dt, q, qd, tau);
    if (k % stride === 0) {
      snapshot(k);
      if (stopWhen && stopWhen(k * dt, q, qd)) { stopped = true; break; }
    }
    if (rk4) {
      y.set(q); y.set(qd, nq);
      rk4Step(deriv, y, dt, iws);
      q.set(y.subarray(0, nq));
      qd.set(y.subarray(nq));
    } else {
      forwardDynamics(model, q, qd, tau, ext, qdd, ws, jointDamping, dt);
      for (let i = 0; i < nq; i++) qd[i] += dt * qdd[i];
      for (let i = 0; i < nq; i++) q[i] += dt * qd[i];
    }
    if (!Number.isFinite(q[0]) || Math.abs(qd[0]) > divergenceLimit || Math.abs(qd[2]) > divergenceLimit) {
      diverged = true;
      break;
    }
  }
  if (!diverged && !stopped) {
    if (contacts) computeContactForces(model, ws, q, qd, contacts);
    control?.(steps * dt, q, qd, tau);
    snapshot(steps);
  }
  return { rec, q, qd, diverged, stopped };
}
