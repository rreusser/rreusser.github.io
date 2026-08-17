// worker_threads evaluation worker for parallel CMA-ES: holds one model +
// strength + ROM configuration and evaluates batches of decision vectors.
import { parentPort, workerData } from 'node:worker_threads';
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile } from '../strength.js';
import { ROM_DEFAULTS } from '../statics.js';
import { rolloutCost, robustRolloutCost, COST_WEIGHTS } from '../rollout.js';

const cfg = workerData;
const model = buildModel(cfg.modelParams || {});
const ws = createWorkspace(model);
const prof = strengthProfile(model.massKg, cfg.strengthOpts || {});
const rom = { ...ROM_DEFAULTS, ...(cfg.romOverrides || {}) };
const weights = { ...COST_WEIGHTS, ...(cfg.weights || {}) };
const costFn = cfg.robust === false ? rolloutCost : robustRolloutCost;

parentPort.on('message', ({ id, xs }) => {
  const costs = xs.map((x) =>
    costFn(model, ws, prof, rom, cfg.scenario, Float64Array.from(x), {
      K: cfg.K || 6, dt: cfg.dt || 2.5e-4, weights,
    }).cost);
  parentPort.postMessage({ id, costs });
});
