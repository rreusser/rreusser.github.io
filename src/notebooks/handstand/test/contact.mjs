// Verification gates for penalty ground contacts and the simulate() driver.
//
// Gate C is the promised demonstration that stiff penalty contacts constrain
// the step size: the default dt integrates a settling drop cleanly while a
// coarse dt visibly diverges on the same problem. Gate D is the end-to-end
// smoke test: the full model holds a handstand for three seconds under plain
// joint-space PD servos, with ground reaction equal to body weight.
//
// Run: node src/notebooks/handstand/test/contact.mjs
import { buildModel, handstandPose } from '../anthropometry.js';
import { createWorkspace, momenta } from '../dynamics.js';
import { createContacts, computeContactForces, groundReaction } from '../contact.js';
import { simulate } from '../integrate.js';
import { groundHand, solveWristForCom } from '../statics.js';

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
// Gate C: the demonstrated failure. The same drop diverges (or fails to
// settle) at a coarse step, while the default dt handles it.
// ---------------------------------------------------------------------------
{
  const m = blockModel();
  const ws = createWorkspace(m);
  const tryDt = (dt) => {
    const contacts = createContacts(m);
    const r = simulate(m, ws, { q0: [0, 0.058, 0], T: 1.0, dt, contacts });
    const vmax = Math.max(Math.abs(r.qd[0]), Math.abs(r.qd[1]), Math.abs(r.qd[2]));
    return { diverged: r.diverged || !Number.isFinite(vmax) || vmax > 1, vmax };
  };
  const fine = tryDt(2e-4);
  const coarse = tryDt(2e-2);
  gate('C: coarse dt fails on stiff contact, default dt succeeds',
    !fine.diverged && coarse.diverged,
    `dt=2e-4 vmax=${fine.vmax.toExponential(1)}; dt=2e-2 ${coarse.diverged ? 'diverges' : `vmax=${coarse.vmax.toExponential(1)}`}`);
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
  for (let j = 3; j < 9; j++) damping[j] = kd;

  const holdRun = (qRef, { implicit }) => {
    const contacts = createContacts(model);
    const r = simulate(model, ws, {
      q0: qRef, T: 3.0, dt: 2e-4, contacts,
      jointDamping: implicit ? damping : null,
      control: (t, qq, qqd, tau) => {
        for (let j = 3; j < 9; j++) {
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

console.log(failures ? `\n${failures} gate(s) FAILED` : '\nAll contact gates passed');
process.exit(failures ? 1 : 0);
