// Web Worker: runs trajectory optimization and catch-window computation off
// the main thread, posting per-generation / per-row progress. Instantiate
// with new Worker(new URL('./opt-worker.js', import.meta.url), {type:'module'}).

import { buildModel } from './anthropometry.js';
import { createWorkspace } from './dynamics.js';
import { strengthProfile } from './strength.js';
import { ROM_DEFAULTS } from './statics.js';
import {
  techniqueFromJSON, techniqueSearchArgs, techniqueModelParams, techniqueStrengthOpts,
} from './technique-file.js';
import {
  optimizeScenario, catchWindow, COST_WEIGHTS, decodeDecision, plantFor,
  balancedHandstand, symmetrizeKnots, SYMMETRIC_SCENARIOS, NUMERICS_DEFAULTS, applyLocks,
  applyTimeLocks,
} from './rollout.js';

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
    // The setup handshake has to be inside the fallback too, not only the
    // construction. A nested worker that constructs and then fails to start
    // rejected out of an async message handler, which surfaces on the page as
    // an error event with no message at all and no search running -- the
    // worst of both, an unreadable failure AND a fatal one.
    await Promise.all(workers.map((w) => new Promise((resolve, reject) => {
      const onMsg = (e) => { if (e.data?.type === 'ready') { w.removeEventListener('message', onMsg); resolve(); } };
      w.addEventListener('message', onMsg);
      w.addEventListener('error', (ev) => reject(new Error(
        `nested eval worker failed: ${ev.message || 'no message'} (${ev.filename || '?'}:${ev.lineno ?? '?'})`)),
      { once: true });
      w.postMessage({ type: 'setup', cfg });
    })));
  } catch (err) {
    for (const w of workers) w.terminate();
    self.postMessage({ type: 'pool-failed', message: String(err?.message || err) });
    return null;
  }
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

// The same, from a technique. The optimize path uses this; catchWindow still
// takes loose parameters because it is not searching a technique at all.
function setupFor(rec) {
  const model = buildModel(techniqueModelParams(rec));
  const ws = createWorkspace(model);
  const prof = strengthProfile(model.massKg, techniqueStrengthOpts(rec));
  return { model, ws, prof };
}

// Everything below runs inside an async message handler, so a throw becomes
// an unhandled rejection rather than an exception -- which reaches the page
// as an error event whose message is undefined. Report failures as data
// instead, with the stack, so the page can say what went wrong.
self.addEventListener('unhandledrejection', (ev) => {
  self.postMessage({
    type: 'failed',
    message: String(ev.reason?.message || ev.reason || 'unhandled rejection'),
    stack: String(ev.reason?.stack || ''),
  });
});

self.onmessage = async (e) => {
  try {
    await handle(e.data);
  } catch (err) {
    self.postMessage({ type: 'failed', message: String(err?.message || err), stack: String(err?.stack || '') });
  }
};

async function handle(msg) {
  if (msg.type === 'optimize') {
    // The technique IS the problem statement. Everything below is derived
    // from it by technique-file.js -- the same derivations the page uses to
    // replay it -- so the search and the playback cannot be handed different
    // problems. Unpacking a hand-written field list here was the third copy
    // of that list, and the copies drifted.
    const rec = techniqueFromJSON(msg.technique);
    const sa = techniqueSearchArgs(rec);
    const { model, ws, prof } = setupFor(rec);
    const rom = sa.rom;
    // Candidates of the generation being evaluated right now, as the
    // recordings scoring already made, thinned to something a canvas can
    // animate. They arrive from the pool when there is one and from the
    // onCandidate hook when there is not.
    const GHOST_FRAMES = 120;
    let genPoses = [];
    const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    // The pool scores candidates for THIS technique, so it is configured from
    // the same derivation rather than from a parallel set of message fields.
    const pool = await createPool({
      scenario: sa.scenario, K: sa.K, dt: msg.dt ?? 2.5e-4,
      weights: msg.weights,
      modelParams: techniqueModelParams(rec),
      strengthOpts: techniqueStrengthOpts(rec),
      romOverrides: rom,
      q0: sa.q0, target: sa.target, plant: sa.plant,
      knotFracs: sa.knotFracs, locks: sa.locks,
      timeLocks: sa.timeLocks,
      numerics: sa.numerics, symmetric: sa.symmetric,
    }, Math.max(1, Math.min(12, cores - 1)));
    self.postMessage({ type: 'pool', size: pool ? pool.size : 1 });
    const result = await optimizeScenario(model, ws, prof, rom, {
      ...sa,
      objectiveBatch: pool ? (xs) => pool.objectiveBatch(xs) : null,
      onCandidate: pool ? null : (x, c) => {
        const r = c.rec;
        if (!r?.q?.length) return;
        const stride = Math.max(1, Math.round(r.q.length / GHOST_FRAMES));
        const frames = [];
        for (let k = 0; k < r.q.length; k += stride) frames.push(Array.from(r.q[k]));
        genPoses.push({ frames, cost: c.cost, success: !!c.verdict?.success, dur: r.t[r.t.length - 1] });
      },
      // A warm start is a refinement: sampling at the from-scratch sigma
      // throws the first generations far away from a technique that already
      // works, which reads as the search getting worse before it gets better.
      ...(msg.sigma0 ? { sigma0: msg.sigma0 } : {}),
      dt: msg.dt ?? 2.5e-4,
      weights: { ...COST_WEIGHTS, ...(msg.weights || {}) },
      onGeneration: (g) => {
        if (g.gen % 2 === 0 || g.gen === sa.maxGen - 1) {
          // The incumbent has to be finished the same way a completed run's
          // knots are, or stopping the search hands back something the search
          // was never scoring: an unpinned final knot the settle phase then
          // has to fight, and, for a symmetric skill, whatever the untouched
          // right-leg parameters happen to say. Stop, save, and it fell over.
          const dec = decodeDecision(g.bestX, sa.K);
          if (sa.symmetric ?? SYMMETRIC_SCENARIOS.has(sa.scenario)) symmetrizeKnots(dec.knots);
          applyLocks(dec.knots, sa.locks);
          if (dec.fracs) applyTimeLocks(dec.fracs, sa.timeLocks);
          const qBal = sa.target ? Float64Array.from(sa.target) : balancedHandstand(model, ws);
          for (let j = 0; j < dec.knots.length; j++) dec.knots[j][dec.knots[j].length - 1] = qBal[3 + j];
          // Cheapest candidate first, so the viewer can draw the leader
          // differently from the rest of the field.
          const poses = (pool ? pool.lastPoses : genPoses).slice().sort((a2, b2) => a2.cost - b2.cost);
          self.postMessage({
            type: 'progress', gen: g.gen, maxGen: sa.maxGen,
            best: g.best, sigma: g.sigma,
            T: dec.T, knots: dec.knots.map((k) => Array.from(k)),
            knotFracs: dec.fracs ? Array.from(dec.fracs) : null,
            // The machine the search is running on, so a run that is stopped
            // rather than finished is still replayable on the one that
            // produced it.
            plant: plantFor(sa.plant),
            numerics: { ...NUMERICS_DEFAULTS, ...sa.numerics },
            body: {
              heightM: model.heightM, massKg: model.massKg,
              straddleDeg: model.straddleDeg, sex: model.sex,
            },
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
      knotFracs: result.decoded.fracs ? Array.from(result.decoded.fracs) : null,
      verdict: result.finalCheck.verdict, terms: result.finalCheck.terms,
      fineCost: result.finalCheck.cost,
      // The machine the search ran on, so a result adopted into playback or
      // saved as a starting point is replayed on the one that produced it.
      plant: result.plant,
      numerics: result.numerics,
      body: result.body,
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
}
