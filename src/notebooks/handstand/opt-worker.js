// Web Worker: runs trajectory optimization and catch-window computation off
// the main thread, posting per-generation / per-row progress. Instantiate
// with new Worker(new URL('./opt-worker.js', import.meta.url), {type:'module'}).

import { buildModel } from './anthropometry.js';
import { createWorkspace } from './dynamics.js';
import { strengthProfile } from './strength.js';
import { ROM_DEFAULTS } from './statics.js';
import { optimizeScenario, catchWindow, COST_WEIGHTS, decodeDecision } from './rollout.js';

// A pool of nested evaluation workers, so a generation is spread across
// cores. The page previously ran the whole search in this one worker, which
// pegged a single core and left the rest idle. Nested workers are not
// universally available; if constructing them throws, the caller falls back
// to evaluating serially here, which is exactly the old behaviour.
async function createPool(cfg, size) {
  const workers = [];
  try {
    for (let i = 0; i < size; i++) {
      workers.push(new Worker(new URL('./opt-eval-worker.js', import.meta.url), { type: 'module' }));
    }
  } catch (err) {
    for (const w of workers) w.terminate();
    return null;
  }
  await Promise.all(workers.map((w) => new Promise((resolve, reject) => {
    const onMsg = (e) => { if (e.data?.type === 'ready') { w.removeEventListener('message', onMsg); resolve(); } };
    w.addEventListener('message', onMsg);
    w.addEventListener('error', reject, { once: true });
    w.postMessage({ type: 'setup', cfg });
  })));
  let nextId = 0;
  const send = (w, xs, wantFrames) => new Promise((resolve, reject) => {
    const id = nextId++;
    const onMsg = (e) => {
      if (e.data?.id !== id) return;
      w.removeEventListener('message', onMsg);
      resolve(e.data);
    };
    w.addEventListener('message', onMsg);
    w.addEventListener('error', reject, { once: true });
    w.postMessage({ id, xs: xs.map((x) => Array.from(x)), wantFrames });
  });
  return {
    size: workers.length,
    lastPoses: [],
    async objectiveBatch(xs) {
      const chunks = Array.from({ length: workers.length }, () => []);
      const owners = xs.map((x, i) => { chunks[i % workers.length].push(x); return i % workers.length; });
      const results = await Promise.all(chunks.map((c, w) => (c.length ? send(workers[w], c, true) : { costs: [], poses: [] })));
      const cursors = new Array(workers.length).fill(0);
      const costs = [], poses = [];
      for (const w of owners) {
        const k = cursors[w]++;
        costs.push(results[w].costs[k]);
        if (results[w].poses?.[k]) poses.push(results[w].poses[k]);
      }
      this.lastPoses = poses;
      return costs;
    },
    destroy() { for (const w of workers) w.terminate(); },
  };
}

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
    // Candidates of the generation being evaluated right now, as the
    // recordings scoring already made, thinned to something a canvas can
    // animate. They arrive from the pool when there is one and from the
    // onCandidate hook when there is not.
    const GHOST_FRAMES = 90;
    let genPoses = [];
    const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    const pool = await createPool({
      scenario: msg.scenario, K: msg.K ?? 6, dt: msg.dt ?? 2.5e-4,
      weights: msg.weights, modelParams: msg.modelParams,
      strengthOpts: msg.strengthOpts, romOverrides: msg.romOverrides,
    }, Math.max(1, Math.min(12, cores - 1)));
    self.postMessage({ type: 'pool', size: pool ? pool.size : 1 });
    const result = await optimizeScenario(model, ws, prof, rom, {
      objectiveBatch: pool ? (xs) => pool.objectiveBatch(xs) : null,
      onCandidate: pool ? null : (x, c) => {
        const rec = c.rec;
        if (!rec?.q?.length) return;
        const stride = Math.max(1, Math.round(rec.q.length / GHOST_FRAMES));
        const frames = [];
        for (let k = 0; k < rec.q.length; k += stride) frames.push(Array.from(rec.q[k]));
        genPoses.push({ frames, cost: c.cost, success: !!c.verdict?.success });
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
      // Duration ceiling from the page. Work and smoothness both fall as a
      // movement slows, so with a high ceiling the search always chooses the
      // slowest version available -- which is also the one where the shoulder
      // has to supply everything and nothing is carried by momentum.
      ...(msg.tHi ? { tHi: msg.tHi, t0: Math.min(msg.tHi * 0.9, 2.2) } : {}),
      x0: msg.x0 ? Float64Array.from(msg.x0) : null,
      weights: { ...COST_WEIGHTS, ...(msg.weights || {}) },
      onGeneration: (g) => {
        if (g.gen % 2 === 0 || g.gen === (msg.maxGen ?? 150) - 1) {
          const dec = decodeDecision(g.bestX, msg.K ?? 6);
          // Cheapest candidate first, so the viewer can draw the leader
          // differently from the rest of the field.
          const poses = (pool ? pool.lastPoses : genPoses).slice().sort((a, b) => a.cost - b.cost);
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
    pool?.destroy();
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
