// Offline trajectory optimization, used to precompute the presets embedded
// in presets.js and to run sensitivity sweeps.
//
// Usage: node scripts/optimize.mjs <scenario> <maxGen> <seed> [outfile]
//   optional env overrides: ROM_JSON / STRENGTH_JSON (JSON object merged
//   into ROM defaults / strengthProfile options), WEIGHTS_JSON.
import { writeFileSync } from 'node:fs';
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile } from '../strength.js';
import { ROM_DEFAULTS } from '../statics.js';
import { optimizeScenario, COST_WEIGHTS, NUMERICS_DEFAULTS } from '../rollout.js';

const [scenario = 'lunge', maxGenS = '200', seedS = '7', outfile = null] = process.argv.slice(2);
const maxGen = +maxGenS, seed = +seedS;

const romOverrides = process.env.ROM_JSON ? JSON.parse(process.env.ROM_JSON) : {};
const strengthOpts = process.env.STRENGTH_JSON ? JSON.parse(process.env.STRENGTH_JSON) : {};
const weights = { ...COST_WEIGHTS, ...(process.env.WEIGHTS_JSON ? JSON.parse(process.env.WEIGHTS_JSON) : {}) };

const model = buildModel({});
const ws = createWorkspace(model);
const prof = strengthProfile(model.massKg, strengthOpts);
const rom = { ...ROM_DEFAULTS, ...romOverrides };

const optOpts = process.env.OPT_JSON ? JSON.parse(process.env.OPT_JSON) : {};

// X0_FILE: warm-start from a previous run's saved knots and duration.
if (process.env.X0_FILE) {
  const prev = JSON.parse((await import('node:fs')).readFileSync(process.env.X0_FILE, 'utf8'));
  const { encodeDecision } = await import('../rollout.js');
  optOpts.x0 = encodeDecision(prev.knots.map((k) => Float64Array.from(k)), prev.T);
}

// Parallel generation evaluation across worker threads (PARALLEL=1 to
// disable). Results are identical to serial evaluation; only wall time
// changes.
let pool = null;
if (+(process.env.PARALLEL ?? '0') !== 1) {
  const { createEvalPool } = await import('./pool.mjs');
  pool = createEvalPool({
    scenario, K: optOpts.K || 6, dt: optOpts.dt || NUMERICS_DEFAULTS.dt,
    weights, romOverrides, strengthOpts, robust: optOpts.robust, variants: optOpts.variants,
  }, process.env.PARALLEL ? +process.env.PARALLEL : undefined);
  // Round the population up to a whole number of worker-rounds. A generation
  // costs ceil(lambda / size) evaluations of wall time whatever lambda is, so
  // the candidates that fill the last partial round are free: with 8 workers,
  // lambda 14 and lambda 16 both take two rounds, and the extra two samples
  // are two more chances to find the basin. Explicit LAMBDA wins.
  const lamDefault = 4 + Math.floor(3 * Math.log(6 * (optOpts.K || 6) + 1));
  if (!optOpts.lambda) {
    optOpts.lambda = process.env.LAMBDA
      ? +process.env.LAMBDA
      : pool.size * Math.ceil(lamDefault / pool.size);
  }
  console.log(`evaluating on ${pool.size} worker threads, lambda ${optOpts.lambda}`
    + ` (${Math.ceil(optOpts.lambda / pool.size)} rounds/generation)`);
}

let lastPrint = 0;
const result = await optimizeScenario(model, ws, prof, rom, {
  scenario, maxGen, seed, weights, ...optOpts,
  objectiveBatch: pool ? pool.objectiveBatch : null,
  onGeneration: (g) => {
    if (g.gen - lastPrint >= 10) {
      lastPrint = g.gen;
      console.log(`gen ${g.gen}  best ${g.best.toFixed(3)}  sigma ${g.sigma.toFixed(4)}`);
    }
  },
});
pool?.destroy();

const out = {
  scenario, seed, maxGen,
  // The whole resolved range, not just the overrides: anatomy is part of
  // the plant, and a replay that has to guess at a limit is a replay of a
  // different body.
  rom, strength: strengthOpts, weights,
  // The whole machine, as the rollout reports it: plant, the integration a
  // replay should use, and the body it ran on. Replays MUST use all three; a
  // trajectory without them is not a result.
  config: result.plant,
  numerics: result.numerics,
  body: result.body,
  best: result.best,
  fineCost: result.finalCheck.cost,
  verdict: result.finalCheck.verdict,
  terms: result.finalCheck.terms,
  T: result.decoded.T,
  knots: result.decoded.knots.map((k) => Array.from(k)),
};
console.log(JSON.stringify({ ...out, knots: undefined }, null, 1));
if (outfile) {
  writeFileSync(outfile, JSON.stringify(out));
  console.log('wrote', outfile);
}
