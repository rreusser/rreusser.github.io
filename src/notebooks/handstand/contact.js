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
  return {
    mu, kN, bN, kT, bT, n,
    anchor: new Float64Array(n),
    active: new Uint8Array(n),
    ext: {
      count: n,
      body: Int32Array.from(model.contacts.map((c) => c.body)),
      px: new Float64Array(n), py: new Float64Array(n),
      fx: new Float64Array(n), fy: new Float64Array(n),
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
export function computeContactForces(model, ws, q, qd, contacts, commit = true) {
  fk(model, q, qd, ws);
  const { mu, kN, bN, kT, bT, ext } = contacts;
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
      if (commit) contacts.active[k] = 0;
      continue;
    }
    let Fn = kN * d - bN * vy;
    if (Fn < 0) Fn = 0;
    let anchor = contacts.active[k] ? contacts.anchor[k] : px;
    if (commit && !contacts.active[k]) {
      contacts.active[k] = 1;
      contacts.anchor[k] = px;
    }
    let Ft = -kT * (px - anchor) - bT * vx;
    const Fmax = mu * Fn;
    if (Ft > Fmax) { Ft = Fmax; if (commit) contacts.anchor[k] = px + Ft / kT; }
    else if (Ft < -Fmax) { Ft = -Fmax; if (commit) contacts.anchor[k] = px + Ft / kT; }
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
