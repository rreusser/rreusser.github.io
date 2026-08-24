import { JOINT_ORDER } from '../control.js';
// Verification gates for penalty ground contacts and the simulate() driver.
//
// Gates E and F cover the joint servo's arrival behavior and the passive
// anatomical end-stops, both of which reach the model through simulate().
//
// Gate C used to be the demonstration that stiff penalty contacts constrain
// the step size. They no longer do -- the contact damper is folded into the
// mass matrix rather than integrated explicitly -- so it now gates what
// replaced that: a hundred-fold step stays stable and rests in the same
// place. Gate G checks the matrix that makes it work. Gate D is the end-to-end
// smoke test: the full model holds a handstand for three seconds under plain
// joint-space PD servos, with ground reaction equal to body weight.
//
// Run: node src/notebooks/handstand/test/contact.mjs
import { buildModel, handstandPose } from '../anthropometry.js';
import { createWorkspace, momenta, fk, rnea } from '../dynamics.js';
import {
  createContacts, computeContactForces, groundReaction, contactDamping,
} from '../contact.js';
import { simulate } from '../integrate.js';
import { groundHand, solveWristForCom, ROM_DEFAULTS } from '../statics.js';
import { strengthProfile } from '../strength.js';
import { createServo } from '../control.js';
import { builtinPresets } from '../presets.js';
import { techniqueRunArgs } from '../technique-file.js';
import {
  balancedHandstand, HANDSTAND_TARGET_FRAC, PLANT_DEFAULTS, LEGACY_PLANT, runScenario,
} from '../rollout.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

// A one-body 10 kg block with two contact feet, for isolated contact tests.
function blockModel() {
  return {
    gravity: 9.81, nb: 1, nj: 0, nq: 3, fixedBase: false,
    parent: new Int32Array([-1]),
    mass: new Float64Array([10]),
    comX: new Float64Array(1), comY: new Float64Array(1),
    inertia: new Float64Array([0.15]),
    anchorX: new Float64Array(1), anchorY: new Float64Array(1),
    contacts: [
      { body: 0, x: -0.15, y: -0.05, name: 'left' },
      { body: 0, x: 0.15, y: -0.05, name: 'right' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Gate A: a dropped block settles: ground reaction equals weight, penetration
// stays near the design target, and the block comes to rest.
// ---------------------------------------------------------------------------
{
  const m = blockModel();
  const ws = createWorkspace(m);
  const contacts = createContacts(m);
  const { q, qd, diverged } = simulate(m, ws, {
    q0: [0, 0.058, 0], T: 1.0, dt: 2e-4, contacts,
  });
  const Fn = contacts.ext.fy[0] + contacts.ext.fy[1];
  const W = 10 * m.gravity;
  const penetration = -(q[1] - 0.05);
  const vmax = Math.max(Math.abs(qd[0]), Math.abs(qd[1]), Math.abs(qd[2]));
  gate('A: dropped block settles with GRF = weight',
    !diverged && Math.abs(Fn - W) / W < 0.01 && penetration > 0 && penetration < 0.004 && vmax < 1e-3,
    `Fn=${Fn.toFixed(2)} vs W=${W.toFixed(2)}, pen=${(penetration * 1e3).toFixed(2)}mm, vmax=${vmax.toExponential(1)}`);
}

// ---------------------------------------------------------------------------
// Gate B: friction sticks below the cone and slides above it.
// ---------------------------------------------------------------------------
{
  const m = blockModel();
  const ws = createWorkspace(m);
  const W = 10 * m.gravity;
  const run = (pushFrac) => {
    const contacts = createContacts(m, { mu: 0.8 });
    const r = simulate(m, ws, {
      q0: [0, 0.0575, 0], T: 1.5, dt: 2e-4, contacts,
      control: (t, q, qd, tau) => { if (t > 0.5) tau[0] = pushFrac * 0.8 * W; },
    });
    return r.q[0];
  };
  const stickDrift = Math.abs(run(0.3));
  const slideDrift = Math.abs(run(1.5));
  gate('B: tangential stick below friction cone, slide above',
    stickDrift < 2e-3 && slideDrift > 0.05,
    `drift(0.3 muW)=${(stickDrift * 1e3).toFixed(2)}mm, drift(1.5 muW)=${(slideDrift * 100).toFixed(1)}cm`);
}

// ---------------------------------------------------------------------------
// Gate C: a coarse step no longer breaks the contact, and lands in the same
// place.
//
// This gate used to assert the opposite -- that a hundred-fold step diverged
// -- and it was right to, because the contact damper was integrated
// explicitly. It is sized against an effective mass of a quarter of the body
// and acts on a hand weighing under a kilogram, which explicitly is stable
// only below about half a millisecond, and that one term set the step size for
// the entire simulation. It is DAMPING, though, and damping is the easy thing
// to be implicit about: the step folds dt * (contact damping) into the mass
// matrix now (see contactDamping), so what used to be a stability limit costs
// nothing.
//
// So the gate says what should be true instead. A hundred-fold step is still
// too coarse to be accurate -- it is a hundred-fold step -- but it must not
// blow up, and it must settle on the same resting penetration, because the
// place a block comes to rest is set by the spring and gravity and no
// integrator gets a vote.
// ---------------------------------------------------------------------------
{
  const m = blockModel();
  const ws = createWorkspace(m);
  const tryDt = (dt) => {
    const contacts = createContacts(m);
    const r = simulate(m, ws, { q0: [0, 0.058, 0], T: 1.0, dt, contacts });
    const vmax = Math.max(Math.abs(r.qd[0]), Math.abs(r.qd[1]), Math.abs(r.qd[2]));
    return { diverged: r.diverged || !Number.isFinite(vmax) || vmax > 1, vmax, y: r.q[1] };
  };
  const fine = tryDt(2e-4);
  const coarse = tryDt(2e-2);
  gate('C: a 100x step is stable on stiff contact and rests in the same place',
    !fine.diverged && !coarse.diverged && Math.abs(coarse.y - fine.y) < 1e-4,
    `dt=2e-4 rests at ${(fine.y * 1e3).toFixed(3)}mm; dt=2e-2 `
    + `${coarse.diverged ? 'diverges' : `rests at ${(coarse.y * 1e3).toFixed(3)}mm`}`);
}

// ---------------------------------------------------------------------------
// Gates D1-D3: pose-holding on the palm patch.
//
// D1 pins real physics: the exactly stacked pose puts the CoP a hair from
// the heel of the palm, and pivoting on the heel point has no restoring
// stiffness, so perfect joint servos still topple backward. Stiffness alone
// cannot balance a heel-biased handstand; this is what motivates the wrist
// strategy (and the notebook's catch-window story).
//
// D2 pins numerics: explicit -kd*qd servo damping at kd=150, dt=2e-4
// violates the light hand segment's stability bound (dt < 2 I_hand/kd ~
// 4e-5) and the wrist chatters until the model falls, even from a balanced
// pose.
//
// D3 is the fix for both, and pins a second physical threshold found while
// tuning: servo stiffness must comfortably exceed the gravitational
// geometric stiffness W*h ~ 700 Nm/rad, or torque sag feeds back into CoM
// displacement and the body creeps over the fingertips (kp = 1500 still
// falls; kp = 3000 stands). With implicit damping, kp = 3000, and the pose
// balanced over mid-patch, the model stands 3 s with GRF = body weight.
// ---------------------------------------------------------------------------
{
  const model = buildModel({ heightM: 1.75, massKg: 70 });
  const ws = createWorkspace(model);
  const W = model.massKg * model.gravity;
  const kp = 3000, kd = 150;
  const damping = new Float64Array(model.nq);
  for (let j = 3; j < 3 + model.nj; j++) damping[j] = kd;

  const holdRun = (qRef, { implicit }) => {
    const contacts = createContacts(model);
    const r = simulate(model, ws, {
      q0: qRef, T: 3.0, dt: 2e-4, contacts,
      jointDamping: implicit ? damping : null,
      control: (t, qq, qqd, tau) => {
        for (let j = 3; j < 3 + model.nj; j++) {
          tau[j] = kp * (qRef[j] - qq[j]) - (implicit ? 0 : kd * qqd[j]);
        }
      },
    });
    const mo = momenta(model, r.q, r.qd, ws);
    const gr = groundReaction(contacts);
    return { fell: r.diverged || mo.comY < 0.9 || Math.abs(mo.comX - r.rec.com[0][0]) > 0.2, mo, gr, rec: r.rec };
  };

  const stacked = handstandPose(model);
  groundHand(model, stacked);

  const balanced = stacked.slice();
  const targetX = model.patch.x0 + 0.45 * (model.patch.x1 - model.patch.x0);
  balanced[3] = solveWristForCom(model, balanced, ws, targetX);

  const d1 = holdRun(stacked, { implicit: true });
  gate('D1: heel-biased stacked pose topples under perfect pose-holding (physics)',
    d1.fell, `comY(3s)=${d1.mo.comY.toFixed(2)}`);

  const d2 = holdRun(balanced, { implicit: false });
  gate('D2: explicit servo damping chatters the wrist and falls (demonstrated)',
    d2.fell, `comY(3s)=${d2.mo.comY.toFixed(2)}`);

  const d3 = holdRun(balanced, { implicit: true });
  const comDrift = Math.abs(d3.mo.comX - d3.rec.com[0][0]);
  gate('D3: implicit damping + mid-patch pose stands 3 s with GRF = weight',
    !d3.fell && comDrift < 0.05 && Math.abs(d3.gr.normal - W) / W < 0.02,
    `comDrift=${(comDrift * 1e3).toFixed(1)}mm, GRF=${d3.gr.normal.toFixed(0)} vs W=${W.toFixed(0)}, comY=${d3.mo.comY.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
// Gates E1-E2: arrival into the balanced pose without overshoot.
//
// The failure this pins: a shoulder pressing to vertical under load spends
// the whole press against its torque cap, and a single scalar kd is the wrong
// damping for a joint carrying 24 kg m^2 (zeta = 0.22 at kd = 60), so the
// body arrives at the balanced pose with several rad/s and rings. Worse, the
// position term commands kp/kd * e = 10 rad/s at 45 degrees of error, a speed
// the shoulder would need 535 degrees of travel to brake from: the reference
// is asking for an arrival the muscle cannot produce.
//
// E1 demonstrates the failure with the legacy constant-kd, no-braking servo.
// E2 pins the fix: inertia-scaled damping capped by the strength envelope,
// plus a position term limited to the speed the joint can still stop in the
// error that remains. Same trajectory (hold the balanced pose), same plant.

// ---------------------------------------------------------------------------
{
  const D2R = Math.PI / 180;
  const model = buildModel({ heightM: 1.75, massKg: 70 });
  const ws = createWorkspace(model);
  const prof = strengthProfile(model.massKg);
  const qBal = balancedHandstand(model, ws);
  const xTarget = model.patch.x0 + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
  const Wbody = model.massKg * model.gravity;

  // Start in a handstand whose shoulder is open by openDeg (the lean re-solved
  // so the CoM still starts over the palm target) and hold the balanced pose:
  // a press with no trajectory in it, so what is measured is the servo.
  const pressIn = (openDeg, cfg) => {
    const q0 = Float64Array.from(qBal);
    q0[4] += openDeg * D2R;
    q0[3] = solveWristForCom(model, q0, ws, xTarget);
    const knots = [];
    for (let j = 0; j < 6; j++) knots.push(Float64Array.of(qBal[3 + j], qBal[3 + j]));
    const servo = createServo(model, prof, { kp: 800, kd: 60, ws, activationTau: 0.05, ...cfg });
    const contacts = createContacts(model);
    const augment = (t, q, qd, des) => {
      const gain = Math.min(1, (contacts.ext.fy[0] + contacts.ext.fy[1]) / (0.6 * Wbody));
      if (gain <= 0) return;
      const mo = momenta(model, q, qd, ws);
      des[0] += gain * (2000 * (mo.comX - (q[0] + xTarget)) + 1500 * mo.comVx);
    };
    const out = simulate(model, ws, {
      q0, T: 5.0, dt: 2.5e-4, contacts,
      jointDamping: servo.damping, appliedTorque: servo.applied,
      control: servo.makeControl(knots, 1e-3, augment),
    });
    const rec = out.rec;
    const err = (k) => rec.q[k][4] - qBal[4];
    // Arrival is reaching the pose, not crossing it: a servo that stops
    // exactly on target never changes sign, which is the whole point.
    const inbound = Math.sign(err(0));
    let kArr = -1;
    for (let k = 1; k < rec.t.length && kArr < 0; k++) {
      if (Math.abs(err(k)) < 2 * D2R) kArr = k;
    }
    // Overshoot is travel PAST the target, so it is signed against the
    // direction the joint came from.
    let over = 0, reversals = 0, prev = 0;
    for (let k = Math.max(kArr, 0); kArr >= 0 && k < rec.t.length; k++) {
      over = Math.max(over, -inbound * err(k));
      if (Math.abs(err(k)) > 1 * D2R) {
        const s = Math.sign(err(k));
        if (prev !== 0 && s !== prev) reversals++;
        prev = s;
      }
    }
    over = Math.max(over, 0);
    const mo = momenta(model, out.q, out.qd, ws);
    const heelX = out.q[0] + model.patch.x0, tipX = out.q[0] + model.patch.x1;
    return {
      stood: mo.comY > 0.85 && !out.diverged && mo.comX > heelX && mo.comX < tipX,
      arrived: kArr >= 0, overDeg: over / D2R, reversals,
    };
  };

  const legacy = { dampingRatio: 0, brakeMargin: 0 };
  const fixed = {
    dampingRatio: PLANT_DEFAULTS.dampingRatio, brakeMargin: PLANT_DEFAULTS.brakeMargin,
    dampingSpeed: PLANT_DEFAULTS.dampingSpeed, inertiaHz: PLANT_DEFAULTS.inertiaHz,
  };
  const l30 = pressIn(30, legacy), l35 = pressIn(35, legacy);
  gate('E1: constant-kd servo rings its way into the balanced pose (demonstrated)',
    l30.overDeg > 5 && l30.reversals >= 2 && l35.overDeg > 5 && l35.reversals >= 2,
    `30deg: ${l30.overDeg.toFixed(1)}deg overshoot, ${l30.reversals} reversals; `
    + `35deg: ${l35.overDeg.toFixed(1)}deg overshoot, ${l35.reversals} reversals`);

  const f30 = pressIn(30, fixed), f35 = pressIn(35, fixed);
  gate('E2: inertia-scaled damping + brake-feasible position term arrives clean',
    f30.stood && f30.arrived && f30.overDeg < 2 && f30.reversals === 0
    && f35.stood && f35.arrived && f35.overDeg < 2 && f35.reversals === 0,
    `30deg: ${f30.overDeg.toFixed(1)}deg overshoot, ${f30.reversals} reversals; `
    + `35deg: ${f35.overDeg.toFixed(1)}deg overshoot, ${f35.reversals} reversals`);

}

// ---------------------------------------------------------------------------
// Gates F1-F2: anatomical end-stops.
//
// The failure this pins: range of motion used to be a cost term only, so a
// joint could be driven far outside its anatomy for a few hundredths of a
// cost unit. Bounding the reference knots does not fix it, because momentum
// carries a swinging limb past its limit whatever the reference says, and an
// optimizer that is only fined will happily buy a knee hyperextended forty
// degrees. F1 commands a knee straight through its 3-degree hyperextension
// limit and shows it goes there. F2 pins the stop: with passive end-stops in
// the plant, maximum voluntary torque buys about the design penetration and
// no more, because tissue is what stops a joint.
// ---------------------------------------------------------------------------
{
  const D2R = Math.PI / 180;
  const model = buildModel({ heightM: 1.75, massKg: 70 });
  const ws = createWorkspace(model);
  const prof = strengthProfile(model.massKg);
  const qBal = balancedHandstand(model, ws);
  const rom = { ...ROM_DEFAULTS };

  // Hold the handstand, but command the left knee 40 degrees into
  // hyperextension: a reference no anatomy can honour.
  // Built in the full channel order, and read back by name: the knee is not
  // the channel it used to be now that the trunk has a hinge in it.
  const QJ = Object.fromEntries(JOINT_ORDER.map((n, j) => [n, 3 + j]));
  const knots = JOINT_ORDER.map((n) => Float64Array.of(qBal[QJ[n]], qBal[QJ[n]]));
  knots[JOINT_ORDER.indexOf('kneeL')] = Float64Array.of(qBal[QJ.kneeL], 40 * D2R);

  const worstKnee = (cfg) => {
    const r = runScenario(model, ws, prof, {
      scenario: 'hold', knots, T: 1.0, settleT: 1.0, dt: 2.5e-4, rom, ...cfg,
    });
    let worst = 0;
    for (const q of r.rec.q) worst = Math.max(worst, q[QJ.kneeL] - rom.kneeHyperextDeg * D2R);
    return worst / D2R;
  };

  const free = worstKnee({ ...LEGACY_PLANT });
  gate('F1: without end-stops the servo drives the knee far past anatomy (demonstrated)',
    free > 30, `knee ${free.toFixed(1)} deg beyond its hyperextension limit`);

  const stopped = worstKnee({});
  gate('F2: end-stops hold the knee within the design penetration under full torque',
    stopped < 1.5 * PLANT_DEFAULTS.romStopDeg,
    `knee ${stopped.toFixed(1)} deg beyond its limit (stopDeg=${PLANT_DEFAULTS.romStopDeg})`);
}

// ---------------------------------------------------------------------------
// Gate G: the contact damping matrix is the derivative it claims to be.
//
// D is what lets the step be implicit about contact damping, and it is folded
// straight into the mass matrix -- so if it is not really
// -d(generalized contact force)/d(qd), the simulation is quietly integrating
// something that is not this model. Nothing else would catch that: a wrong D
// changes the transient, not the equilibrium, so the block still comes to rest
// in the right place and the handstand still stands up.
//
// Checked against finite differences at five instants of a kick-up, which is
// the case that loads the palms, slides, and lifts off.
// ---------------------------------------------------------------------------
{
  const model = buildModel({});
  const ws = createWorkspace(model);
  const nq = model.nq;
  const prof = strengthProfile(model.massKg, {});
  const P = builtinPresets(model, ws, ROM_DEFAULTS);
  const run = runScenario(model, ws, prof, techniqueRunArgs(P.lunge, model, ws));
  const contacts = createContacts(model, {});
  const zero = new Float64Array(nq);
  // rnea with no motion and no gravity is exactly the joint-space image of
  // the external forces, which is the thing D is the derivative of.
  const gen = (q, qd, out) => {
    computeContactForces(model, ws, q, qd, contacts, false);
    rnea(model, q, zero, zero, out, contacts.ext, { ws, gravity: false });
  };
  const D = new Float64Array(nq * nq);
  const f0 = new Float64Array(nq), f1 = new Float64Array(nq);
  const h = 1e-6;
  let worst = 0, scale = 0, where = '';
  for (const frac of [0.02, 0.15, 0.3, 0.5, 0.8]) {
    const k = Math.round(frac * (run.rec.q.length - 1));
    const q = Float64Array.from(run.rec.q[k]), qd = Float64Array.from(run.rec.qd[k]);
    gen(q, qd, f0);
    fk(model, q, qd, ws);
    computeContactForces(model, ws, q, qd, contacts, false, true);
    contactDamping(model, ws, contacts, D);
    for (let j = 0; j < nq; j++) {
      const save = qd[j]; qd[j] += h; gen(q, qd, f1); qd[j] = save;
      for (let i = 0; i < nq; i++) {
        const fd = (f1[i] - f0[i]) / h;
        scale = Math.max(scale, Math.abs(fd));
        const e = Math.abs(fd - D[i * nq + j]);
        if (e > worst) { worst = e; where = `t=${run.rec.t[k].toFixed(2)}s, entry (${i},${j})`; }
      }
    }
  }
  gate('G: the contact damping matrix matches finite differences',
    worst / Math.max(scale, 1e-9) < 1e-4,
    `worst |analytic - fd| = ${worst.toExponential(2)} against a largest entry of `
    + `${scale.toFixed(0)}${worst > 0 ? ` (${where})` : ''}`);
}

console.log(failures ? `\n${failures} gate(s) FAILED` : '\nAll contact gates passed');
process.exit(failures ? 1 : 0);
