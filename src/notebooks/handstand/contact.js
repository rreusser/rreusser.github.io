// Unilateral penalty ground contacts. Each model contact point gets a
// spring-damper normal force (clamped to be non-adhesive) and a tangential
// stick spring anchored at its touchdown location, clamped to the friction
// cone with anchor tracking on slip. Contacts are pure external forces on
// the floating-base chain, so the mechanism never changes topology: CoP
// limits and toppling emerge from the two palm points saturating.
//
// Stiffness is derived from a penetration target rather than hand-tuned:
// full body weight on the palm should sink about penetrationTarget meters.
// Damping sits near critical for an effective mass of a quarter body.

import { fk } from './dynamics.js';

export function createContacts(model, {
  mu = 1.0,
  penetrationTarget = 0.002,
  zeta = 1.0,
  kTangentialFrac = 1.0,
} = {}) {
  let mTot = 0;
  for (let i = 0; i < model.nb; i++) mTot += model.mass[i];
  const W = mTot * model.gravity;
  const kN = W / penetrationTarget / 2;      // two points typically share load
  const mEff = mTot / 4;
  const bN = 2 * zeta * Math.sqrt(kN * mEff);
  const kT = kN * kTangentialFrac;
  const bT = 2 * zeta * Math.sqrt(kT * mEff);
  const n = model.contacts.length;
  // Penetration-proportional damping coefficient, matched to bN at the
  // design penetration: kN * d * hcLambda * (-vy) equals bN * (-vy) when
  // d = penetrationTarget.
  const hcLambda = bN / (kN * penetrationTarget);
  return {
    mu, kN, bN, hcLambda, kT, bT, n,
    anchor: new Float64Array(n),
    active: new Uint8Array(n),
    ext: {
      count: n,
      body: Int32Array.from(model.contacts.map((c) => c.body)),
      px: new Float64Array(n), py: new Float64Array(n),
      fx: new Float64Array(n), fy: new Float64Array(n),
      // How hard each point resists a CHANGE of velocity, per axis: minus the
      // derivative of the contact force with respect to the point's own
      // velocity. This is the stiffest thing in the simulation and it is pure
      // damping, so an integrator that is told about it can treat it
      // implicitly and stop paying for it. See contactDamping below.
      dx: new Float64Array(n), dy: new Float64Array(n),
    },
  };
}

export function resetContacts(contacts) {
  contacts.active.fill(0);
  contacts.anchor.fill(0);
  contacts.ext.fx.fill(0);
  contacts.ext.fy.fill(0);
}

// Computes forces at the current state and returns the ext-force struct for
// forwardDynamics. Runs its own fk with velocities.
//
// commit controls whether stick-anchor state may mutate: integrators that
// evaluate forces at trial substates (RK4 stages) pass commit = false so the
// friction anchors and activation flags advance exactly once per step.
// fkCurrent: the caller has already run fk(q, qd) into this workspace. The
// simulation loop does, once per step, for everything that needs it.
export function computeContactForces(model, ws, q, qd, contacts, commit = true, fkCurrent = false) {
  if (!fkCurrent) fk(model, q, qd, ws);
  const { mu, kN, kT, bT, ext, hcLambda } = contacts;
  for (let k = 0; k < contacts.n; k++) {
    const cpt = model.contacts[k];
    const b = cpt.body;
    const c = Math.cos(ws.th[b]), s = Math.sin(ws.th[b]);
    const rx = c * cpt.x - s * cpt.y;
    const ry = s * cpt.x + c * cpt.y;
    const px = ws.px[b] + rx, py = ws.py[b] + ry;
    const vx = ws.vx[b] - ws.om[b] * ry;
    const vy = ws.vy[b] + ws.om[b] * rx;
    ext.px[k] = px; ext.py[k] = py;

    // Contact points may carry a radius: a limb resting on the floor is a
    // capsule touching it, not an axis lying in it. Points without one
    // (the palm and toes, which are the support) behave exactly as before.
    const d = (cpt.r || 0) - py;
    if (d <= 0) {
      ext.fx[k] = 0; ext.fy[k] = 0;
      ext.dx[k] = 0; ext.dy[k] = 0;
      if (commit) contacts.active[k] = 0;
      continue;
    }
    // Hunt-Crossley: the damping is proportional to penetration rather than
    // constant, so it vanishes at touchdown instead of arriving as an
    // impulse. lambda is set so the force matches the old constant-bN law at
    // the design penetration, which leaves the loaded behaviour alone.
    //
    // The constant law was the reason results moved with the timestep. bN is
    // sized for an effective mass of a quarter of the body, but it acts on
    // the hand segment, which weighs 0.85 kg -- and explicit damping on 0.85
    // kg is only stable below 2m/b = 0.49 ms. At dt = 1e-3 the palm contact
    // went unstable in the first tenth of a second of a kick-up and threw the
    // whole entry; at 5e-4 and below it was fine, which is why the published
    // runs were right but only by a factor of two.
    const hcFloor = -1 / Math.max(hcLambda, 1e-9);
    let Fn = kN * d * (1 + hcLambda * Math.max(-vy, hcFloor));
    if (Fn < 0) Fn = 0;
    // d(Fn)/d(vy) = -kN * d * hcLambda while the separation clamp is off, so
    // the point damps vertical motion at kN * d * hcLambda. Zero once the
    // clamp bites, because there the force no longer depends on velocity.
    ext.dy[k] = (Fn > 0 && -vy > hcFloor) ? kN * d * hcLambda : 0;
    let anchor = contacts.active[k] ? contacts.anchor[k] : px;
    if (commit && !contacts.active[k]) {
      contacts.active[k] = 1;
      contacts.anchor[k] = px;
    }
    let Ft = -kT * (px - anchor) - bT * vx;
    const Fmax = mu * Fn;
    // Sticking, the tangential force damps at bT. Sliding, it is pinned to the
    // friction cone and does not depend on this point's velocity at all.
    ext.dx[k] = bT;
    if (Ft > Fmax) { Ft = Fmax; ext.dx[k] = 0; if (commit) contacts.anchor[k] = px + Ft / kT; }
    else if (Ft < -Fmax) { Ft = -Fmax; ext.dx[k] = 0; if (commit) contacts.anchor[k] = px + Ft / kT; }
    ext.fx[k] = Ft; ext.fy[k] = Fn;
  }
  return ext;
}

// Ground reaction summary: total normal force and center of pressure over
// the hand contacts (indices handIdx, default the first two points).
export function groundReaction(contacts, handIdx = [0, 1]) {
  let Fn = 0, FnX = 0, Ftan = 0;
  for (const k of handIdx) {
    Fn += contacts.ext.fy[k];
    FnX += contacts.ext.fy[k] * contacts.ext.px[k];
    Ftan += contacts.ext.fx[k];
  }
  return { normal: Fn, tangential: Ftan, copX: Fn > 1e-9 ? FnX / Fn : NaN };
}

// The generalized damping the contacts impose: D = sum over points of
// J^T B J, where J maps joint rates to that point's world velocity and B is
// the per-axis damping recorded above.
//
// Why this exists. The contact damper is sized against an effective mass of a
// quarter of the body but acts on the hand, which weighs under a kilogram, so
// explicitly it is stable only below about half a millisecond -- and measured
// on a kick-up it is what sets the step size for the whole simulation:
// soften it and the largest usable step goes from 1e-3 to 4e-3, change
// nothing else and it does not move. Damping is the easy thing to be implicit
// about, so forwardDynamics adds dt * D to the mass matrix and the same
// physics costs a fraction of the steps.
//
// D is symmetric positive semi-definite by construction (J^T B J with B
// diagonal and non-negative), so M + dt * D is still symmetric positive
// definite and the Cholesky factorization downstream is still valid.
//
// Call after computeContactForces, which fills ext.dx/dy and leaves the
// workspace holding this pose's kinematics.
export function contactDamping(model, ws, contacts, D) {
  const nq = model.nq;
  D.fill(0);
  if (model.fixedBase) return D;      // no base columns to write into
  const { ext } = contacts;
  const { parent } = model;
  const col = new Float64Array(2 * nq);
  for (let k = 0; k < contacts.n; k++) {
    const bx = ext.dx[k], by = ext.dy[k];
    if (bx <= 0 && by <= 0) continue;
    const px = ext.px[k], py = ext.py[k];
    col.fill(0);
    // The floating base: two translations and a rotation about body 0.
    col[0] = 1;                                   // d vx / d qd[0]
    col[nq + 1] = 1;                              // d vy / d qd[1]
    col[2] = -(py - ws.py[0]);
    col[nq + 2] = px - ws.px[0];
    // Every joint between the root and this point's body turns the point
    // about its own anchor.
    for (let i = model.contacts[k].body; i > 0; i = parent[i]) {
      col[2 + i] = -(py - ws.py[i]);
      col[nq + 2 + i] = px - ws.px[i];
    }
    for (let i = 0; i < nq; i++) {
      const jxi = col[i], jyi = col[nq + i];
      if (jxi === 0 && jyi === 0) continue;
      for (let j = 0; j < nq; j++) {
        D[i * nq + j] += bx * jxi * col[j] + by * jyi * col[nq + j];
      }
    }
  }
  return D;
}
