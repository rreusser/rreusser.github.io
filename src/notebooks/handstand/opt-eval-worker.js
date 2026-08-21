// Evaluation worker for the in-page optimizer. Holds one model + strength +
// ROM configuration and scores batches of decision vectors, so a generation
// can be spread across cores instead of running on one.
//
// Scoring a candidate simulates it, and rolloutCost keeps the recording it
// made, so the thinned frames the generation view draws come back with the
// costs rather than being simulated again.
import { buildModel } from './anthropometry.js';
import { createWorkspace } from './dynamics.js';
import { strengthProfile } from './strength.js';
import { ROM_DEFAULTS } from './statics.js';
import { rolloutCost, robustRolloutCost, COST_WEIGHTS } from './rollout.js';

let model = null, ws = null, prof = null, rom = null, weights = null, costFn = null, cfg = null;

self.onmessage = ({ data }) => {
  if (data.type === 'setup') {
    cfg = data.cfg;
    model = buildModel(cfg.modelParams || {});
    ws = createWorkspace(model);
    prof = strengthProfile(model.massKg, cfg.strengthOpts || {});
    rom = { ...ROM_DEFAULTS, ...(cfg.romOverrides || {}) };
    weights = { ...COST_WEIGHTS, ...(cfg.weights || {}) };
    costFn = cfg.robust === false ? rolloutCost : robustRolloutCost;
    self.postMessage({ type: 'ready' });
    return;
  }
  const { id, xs, wantFrames, ghostFrames = 120 } = data;
  const costs = [], poses = [];
  for (const x of xs) {
    const c = costFn(model, ws, prof, rom, cfg.scenario, Float64Array.from(x), {
      K: cfg.K || 6, dt: cfg.dt || 2.5e-4, weights, q0: cfg.q0 || null, target: cfg.target || null,
      // The machine the page is showing, not this worker's idea of a default.
      plant: cfg.plant || null,
      // The phrasing and the held poses, for the same reason.
      knotFracs: cfg.knotFracs || null, locks: cfg.locks || null,
      // The pinned instants. The FREE ones need no forwarding: they ride in
      // the decision vector itself, so a longer x is all this worker needs to
      // know that phrasing is being searched.
      timeLocks: cfg.timeLocks || null,
      numerics: cfg.numerics || null, symmetric: cfg.symmetric ?? null,
    });
    costs.push(c.cost);
    if (wantFrames && c.rec?.q?.length) {
      const stride = Math.max(1, Math.round(c.rec.q.length / ghostFrames));
      const frames = [];
      for (let k = 0; k < c.rec.q.length; k += stride) frames.push(Array.from(c.rec.q[k]));
      // How long the rollout these frames came from actually ran. Without
      // it the viewer has to guess, and it guessed its own playback window --
      // so a field scored over T + 2.5 s was replayed over T + 1 s, running
      // half again too fast and spending most of the window parked in a
      // settle tail that the body beside it had not reached yet.
      poses.push({ frames, cost: c.cost, success: !!c.verdict?.success, dur: c.rec.t[c.rec.t.length - 1] });
    }
  }
  self.postMessage({ id, costs, poses });
};
