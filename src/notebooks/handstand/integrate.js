// Fixed-step integrators over the state y = [q; qd] (length 2n), plus the
// contact-rich simulate() driver. deriv(y, out) fills out = [qd; qdd].
// Semi-implicit Euler is the default for contact-rich simulation (bounded
// energy behavior with stiff penalty contacts); RK4 serves smooth-phase
// accuracy and convergence checks; explicit Euler exists to demonstrate why
// it is not used.

import { forwardDynamics, momenta, fk } from './dynamics.js';
import { computeContactForces, resetContacts, contactDamping } from './contact.js';
import { applyJointStops, createPassiveJoints, applyPassiveJoints } from './joint-stops.js';

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
// appliedTorque: a live array the control writes its PHYSICAL joint torques
// into (servo.applied), snapshotted as rec.tauApplied. The commanded tau
// carries the implicit-damping bookkeeping term and is not by itself the
// torque the muscles produced; with per-joint, pose-dependent damping it can
// no longer be unwound after the fact, so the servo reports it directly.
//
// integrator: 'si' (semi-implicit Euler; jointDamping treated implicitly,
// tolerates stiff damping at small dt) or 'rk4' (classic RK4 over the step
// with the control torque frozen, contact forces re-evaluated at each stage
// without committing friction-anchor state, and jointDamping applied
// explicitly, which requires damping small enough for RK4's stability
// region but buys 4th-order accuracy at several times the step size).
// The step size, in ONE place. Every default that used to say a number said a
// DIFFERENT number -- simulate 2e-4, rolloutCost 5e-4, runScenario 2e-4 -- and
// a scorer and a replay picking different ones is precisely the failure this
// notebook keeps having to hunt down. rollout.js's NUMERICS_DEFAULTS reads
// this; nothing else states it.
//
// Why it is what it is: see NUMERICS_DEFAULTS. In short, the step used to be
// set by an explicit contact damper and is now set by accuracy.
export const DEFAULT_DT = 5e-4;

export function simulate(model, ws, {
  q0, qd0, T, dt = DEFAULT_DT,
  integrator = 'si',
  contacts = null,
  control = null,
  jointDamping = null,
  appliedTorque = null,
  jointStops = null,
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
  if (appliedTorque) rec.tauApplied = [];
  if (jointStops) rec.tauStop = [];
  let diverged = false;

  const snapshot = (k) => {
    rec.t.push(k * dt);
    rec.q.push(q.slice());
    rec.qd.push(qd.slice());
    rec.tau.push(tau.slice(3));
    if (appliedTorque) rec.tauApplied.push(appliedTorque.slice());
    if (jointStops) rec.tauStop.push(jointStops.torque.slice());
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
  // tau stays the control's own command; the end-stop torques are plant
  // forces and are summed into tauTot, so rec.tau keeps one meaning under
  // both integrators and rec.tauStop carries the ligament share separately.
  // The body's own passive joints -- the ball of each foot. Built here, from
  // the model, so that a caller driving simulate() directly gets a toe with a
  // stiffness rather than a floppy segment. See createPassiveJoints.
  const passive = createPassiveJoints(model, ws, { qNominal: q });
  // The damping the integrator folds into the mass matrix: the caller's, plus
  // the passive joints'. Neither can be integrated explicitly at these steps.
  //
  // Combined FRESH every step, never once at the top. The servo's damping is
  // not a constant -- it is scaled off the mass matrix and capped by the
  // strength envelope, so it is rewritten in place on every control call, and
  // `jointDamping` is a live view of it. Copying it once and adding to the copy
  // froze the servo's damping at its t = 0 value, which stabilises nothing and
  // sent the whole body into a divergent wobble about the wrist within twenty
  // steps -- with a stiffness of 15 Nm/rad on the toes just as surely as 140,
  // which is what said it was never about the toes.
  const dampBuf = (passive && jointDamping) ? new Float64Array(nq) : null;
  const dampNow = () => {
    if (!passive) return jointDamping;
    if (!jointDamping) return passive.damping;
    dampBuf.set(jointDamping);
    for (let i = 0; i < nq; i++) dampBuf[i] += passive.damping[i];
    return dampBuf;
  };
  const tauTot = (jointStops || passive) ? new Float64Array(nq) : null;
  // The contacts' generalized damping, rebuilt each step from the forces just
  // computed and folded into the mass matrix rather than being integrated
  // explicitly. It is what used to set the step size; see contact.js.
  const cDamp = contacts ? new Float64Array(nq * nq) : null;
  const withStops = (qq, qqd) => {
    if (!jointStops && !passive) return tau;
    tauTot.set(tau);
    if (jointStops) applyJointStops(jointStops, qq, qqd, tauTot);
    if (passive) applyPassiveJoints(passive, qq, tauTot);
    return tauTot;
  };
  const deriv = rk4 ? (yy, out) => {
    dq.set(yy.subarray(0, nq));
    dqd.set(yy.subarray(nq));
    const ext2 = contacts ? computeContactForces(model, ws, dq, dqd, contacts, false) : null;
    forwardDynamics(model, dq, dqd, withStops(dq, dqd), ext2, qdd, ws, dampNow(), 0);
    out.set(yy.subarray(nq), 0);
    out.set(qdd, nq);
  } : null;

  for (let k = 0; k < steps; k++) {
    // ONE forward-kinematics pass per step, here, and everything below is told
    // it has been done. It was being run four times on the same pose -- once
    // for the contacts, once inside the servo's gravity term, and twice more
    // inside forwardDynamics (rnea, then the mass matrix) -- which was 29% of
    // a rollout spent computing the same sines and cosines over and over.
    // The servo now keeps its own workspace, so nothing in between disturbs
    // this; see control.js. Contacts and rnea both read the VELOCITY fields,
    // so this is the fk that takes qd.
    fk(model, q, qd, ws);
    const ext = contacts ? computeContactForces(model, ws, q, qd, contacts, true, true) : null;
    tau.fill(0);
    control?.(k * dt, q, qd, tau);
    const tauUse = withStops(q, qd);
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
      if (cDamp) contactDamping(model, ws, contacts, cDamp);
      forwardDynamics(model, q, qd, tauUse, ext, qdd, ws, dampNow(), dt, true, cDamp);
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
    withStops(q, qd);
    snapshot(steps);
  }
  return { rec, q, qd, diverged, stopped };
}
