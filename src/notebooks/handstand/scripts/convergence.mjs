// Integrator/timestep trade study: how coarse can the step get before the
// simulation stops converging, per integrator family? Families differ in
// damping stiffness (semi-implicit tolerates stiff damping; RK4 pairs with
// soft damping and per-step frozen control), so convergence is judged
// against a fine reference WITHIN each family. Reports terminal-state error
// and wall time per simulated second.
//
// Findings (2026-08): the small step is NOT an integrator-order problem.
// (1) The binding stiffness is the servo damping kd=150 acting on the
//     0.85 kg hand (lambda ~ 5e4/s). That damping is dynamically necessary:
//     with kd=8 or kd=30 the HOLD ITSELF FALLS even at dt=5e-5, so softening
//     it to fit RK4's stability region changes the physics, not the cost.
//     Semi-implicit Euler treats it implicitly for free.
// (2) At dt=2.5e-4 a simulated second costs ~20 ms, so full optimizations
//     take minutes; the step count is not the bottleneck.
// (3) The kick-up is dynamically sensitive near marginal catches, so
//     pointwise trajectory convergence is unattainable at ANY practical
//     step; robustness comes from re-verifying optima at a second dt and
//     rejecting solutions whose cost does not transfer.
//
// Usage: node scripts/convergence.mjs
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile } from '../strength.js';
import { runScenario, naiveReference } from '../rollout.js';

const model = buildModel({});
const ws = createWorkspace(model);
const prof = strengthProfile(model.massKg);

// dampingRatio: 0 pins the scalar kd each family was chosen for. This study
// is about integrator families at a fixed damping (RK4 in particular needs a
// small explicit kd to stay inside its stability region), so it must not
// inherit the inertia-scaled servo damping.
const FAMILIES = [
  { name: 'si  kd=150 zeta=1.0 ', integrator: 'si', kd: 150, contactZeta: 1.0, dampingRatio: 0, dts: [5e-5, 1e-4, 2.5e-4, 5e-4, 1e-3] },
  { name: 'rk4 kd=8   zeta=0.35', integrator: 'rk4', kd: 8, contactZeta: 0.35, dampingRatio: 0, dts: [1e-4, 2.5e-4, 5e-4, 1e-3, 2e-3] },
];
const SCENARIOS = [
  { scenario: 'hold', T: 1.0, settleT: 1.0 },
  { scenario: 'lunge', T: 1.2, settleT: 1.5 },
];

for (const sc of SCENARIOS) {
  console.log(`\n=== ${sc.scenario} ===`);
  for (const fam of FAMILIES) {
    let ref = null;
    for (const dt of fam.dts) {
      const t0 = Date.now();
      const r = runScenario(model, ws, prof, {
        ...sc, dt, integrator: fam.integrator, kd: fam.kd, contactZeta: fam.contactZeta,
        dampingRatio: fam.dampingRatio,
      });
      const wall = (Date.now() - t0) / 1000 / (sc.T + sc.settleT);
      const state = [...r.q.slice(0, 9), ...r.qd.slice(0, 9)];
      let err = NaN;
      if (ref) {
        err = 0;
        for (let i = 0; i < state.length; i++) err = Math.max(err, Math.abs(state[i] - ref[i]));
      } else {
        ref = state;
      }
      console.log(`${fam.name} dt=${dt.toExponential(1)}  ${r.diverged ? 'DIVERGED' : `errInf=${Number.isNaN(err) ? 'ref     ' : err.toExponential(2)}`}  wall=${(wall * 1000).toFixed(0)}ms/simس`);
    }
  }
}
