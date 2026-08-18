// Web Worker: runs trajectory optimization and catch-window computation off
// the main thread, posting per-generation / per-row progress. Instantiate
// with new Worker(new URL('./opt-worker.js', import.meta.url), {type:'module'}).

import { buildModel } from './anthropometry.js';
import { createWorkspace } from './dynamics.js';
import { strengthProfile } from './strength.js';
import { ROM_DEFAULTS } from './statics.js';
import { optimizeScenario, catchWindow, COST_WEIGHTS, decodeDecision } from './rollout.js';

function setup(msg) {
  const model = buildModel(msg.modelParams || {});
  const ws = createWorkspace(model);
  const prof = strengthProfile(model.massKg, msg.strengthOpts || {});
  const rom = { ...ROM_DEFAULTS, ...(msg.romOverrides || {}) };
  return { model, ws, prof, rom };
}

self.onmessage = async (e) => {
  const msg = e.data;
  if (msg.type === 'optimize') {
    const { model, ws, prof, rom } = setup(msg);
    const result = await optimizeScenario(model, ws, prof, rom, {
      scenario: msg.scenario,
      seed: msg.seed ?? 7,
      maxGen: msg.maxGen ?? 150,
      K: msg.K ?? 6,
      // A warm start is a refinement: sampling at the from-scratch sigma
      // throws the first generations far away from a technique that already
      // works, which reads as the search getting worse before it gets better.
      ...(msg.sigma0 ? { sigma0: msg.sigma0 } : {}),
      dt: msg.dt ?? 2.5e-4,
      ...(msg.scenario === 'pike' ? { tLo: 1.5, tHi: 3.5, t0: 2.2 } : {}),
      x0: msg.x0 ? Float64Array.from(msg.x0) : null,
      weights: { ...COST_WEIGHTS, ...(msg.weights || {}) },
      onGeneration: (g) => {
        if (g.gen % 2 === 0 || g.gen === (msg.maxGen ?? 150) - 1) {
          const dec = decodeDecision(g.bestX, msg.K ?? 6);
          self.postMessage({
            type: 'progress', gen: g.gen, maxGen: msg.maxGen ?? 150,
            best: g.best, sigma: g.sigma,
            T: dec.T, knots: dec.knots.map((k) => Array.from(k)),
          });
        }
      },
    });
    self.postMessage({
      type: 'done', task: 'optimize',
      best: result.best, T: result.decoded.T,
      knots: result.decoded.knots.map((k) => Array.from(k)),
      verdict: result.finalCheck.verdict, terms: result.finalCheck.terms,
      fineCost: result.finalCheck.cost,
    });
  } else if (msg.type === 'catchWindow') {
    const { model, ws, prof } = setup(msg);
    const grid = catchWindow(model, ws, prof, {
      ...(msg.gridOpts || {}),
      onRow: (i, n) => self.postMessage({ type: 'progress', row: i, rows: n }),
    });
    self.postMessage({
      type: 'done', task: 'catchWindow',
      thetasDeg: grid.thetasDeg, omegas: grid.omegas,
      success: Array.from(grid.success), nTheta: grid.nTheta, nOmega: grid.nOmega,
    });
  }
};
