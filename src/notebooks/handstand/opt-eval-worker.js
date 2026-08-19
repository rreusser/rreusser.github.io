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
  const { id, xs, wantFrames, ghostFrames = 90 } = data;
  const costs = [], poses = [];
  for (const x of xs) {
    const c = costFn(model, ws, prof, rom, cfg.scenario, Float64Array.from(x), {
      K: cfg.K || 6, dt: cfg.dt || 2.5e-4, weights,
    });
    costs.push(c.cost);
    if (wantFrames && c.rec?.q?.length) {
      const stride = Math.max(1, Math.round(c.rec.q.length / ghostFrames));
      const frames = [];
      for (let k = 0; k < c.rec.q.length; k += stride) frames.push(Array.from(c.rec.q[k]));
      poses.push({ frames, cost: c.cost, success: !!c.verdict?.success });
    }
  }
  self.postMessage({ id, costs, poses });
};
