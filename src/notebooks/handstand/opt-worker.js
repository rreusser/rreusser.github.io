// Web Worker: runs trajectory optimization and catch-window computation off
// the main thread, posting per-generation / per-row progress. Instantiate
// with new Worker(new URL('./opt-worker.js', import.meta.url), {type:'module'}).

import { buildModel } from './anthropometry.js';
import { createWorkspace, fk } from './dynamics.js';
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
    // Candidates of the generation being evaluated right now. Each entry is
    // the recording that scoring already made, thinned to something a canvas
    // can animate: a whole generation is about a hundred KB at this rate.
    const GHOST_FRAMES = 90;
    let genPoses = [];
    const result = await optimizeScenario(model, ws, prof, rom, {
      onCandidate: (x, c) => {
        const rec = c.rec;
        if (!rec?.q?.length) return;
        const stride = Math.max(1, Math.round(rec.q.length / GHOST_FRAMES));
        const frames = [];
        // Also the frame where the body first reaches the floor. The model
        // has contacts under the palms and toes only, so a toppled body has
        // nothing to land on and keeps going down; a viewer that plays past
        // this point shows a person hanging through the ground. Freeze there
        // instead -- it is the moment the attempt ended anyway.
        let landed = -1;
        const scratch = new Float64Array(model.nq);
        for (let k = 0; k < rec.q.length; k += stride) {
          const row = rec.q[k];
          frames.push(Array.from(row));
          if (landed >= 0) continue;
          for (let i = 0; i < model.nq; i++) scratch[i] = row[i];
          fk(model, scratch, null, ws);
          let minY = Infinity;
          for (let b = 0; b < model.nb; b++) {
            const cth = Math.cos(ws.th[b]), sth = Math.sin(ws.th[b]);
            for (const poly of model.outline[b]) {
              for (const g of poly) {
                const y = ws.py[b] + sth * g[0] + cth * g[1];
                if (y < minY) minY = y;
              }
            }
          }
          if (minY < -0.02) landed = frames.length - 1;
        }
        genPoses.push({ frames, landed, cost: c.cost, success: !!c.verdict?.success });
      },
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
          // Cheapest candidate first, so the viewer can draw the leader
          // differently from the rest of the field.
          const poses = genPoses.slice().sort((a, b) => a.cost - b.cost);
          self.postMessage({
            type: 'progress', gen: g.gen, maxGen: msg.maxGen ?? 150,
            best: g.best, sigma: g.sigma,
            T: dec.T, knots: dec.knots.map((k) => Array.from(k)),
            generation: poses,
          });
        }
        // Cleared every generation, not only the ones that get posted, or
        // a throttled post would show two generations superimposed.
        genPoses = [];
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
