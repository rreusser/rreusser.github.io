// Sensitivity sweep: re-optimize a scenario across a range of one factor and
// record success metrics. This is the notebook's instrument for separating
// real constraints from folklore: a flat metric curve is a demonstrated
// negative, a steep one is a real constraint.
//
// Usage: node scripts/sweep.mjs <factor> <scenario> <outfile> [maxGen] [seed]
//   factor in: shoulderRom | wristRom | hamstring | wristStrength |
//              shoulderStrength
//
// Each optimization warm-starts from the embedded preset trajectory for the
// scenario (when available) so a modest generation budget refines rather
// than rediscovers. Deterministic under the seed.
import { writeFileSync } from 'node:fs';
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile } from '../strength.js';
import { ROM_DEFAULTS } from '../statics.js';
import {
  optimizeScenario, rolloutCost, robustRolloutCost, encodeDecision, COST_WEIGHTS, JOINT_KEYS,
} from '../rollout.js';
import { PRESET_TRAJECTORIES } from '../presets.js';

const FACTORS = {
  shoulderRom: {
    label: 'Shoulder flexion limit (deg)',
    values: [150, 160, 170, 180],
    apply: (v) => ({ rom: { shoulderFlexMaxDeg: v } }),
  },
  wristRom: {
    label: 'Wrist dorsiflexion limit (deg)',
    values: [60, 70, 80, 92],
    apply: (v) => ({ rom: { wristDorsiMaxDeg: v } }),
  },
  hamstring: {
    label: 'Hip flexion with straight knees (deg)',
    values: [70, 85, 100, 125],
    apply: (v) => ({ rom: { hipFlexStraightKneeMaxDeg: v } }),
  },
  wristStrength: {
    label: 'Wrist strength (x default)',
    values: [0.5, 0.75, 1.0, 1.5],
    apply: (v) => ({ strength: { overrides: { wrist: { t0Vol: 1.0 * v } } } }),
  },
  shoulderStrength: {
    label: 'Shoulder strength (x default)',
    values: [0.5, 0.75, 1.0, 1.5],
    apply: (v) => ({ strength: { overrides: { shoulder: { t0Vol: 2.0 * v } } } }),
  },
};

// BASE_STRENGTH_JSON: strength overrides applied at every sweep point (the
// factor's own strength override wins on conflict). Used to sweep press
// flexibility factors on a strong-shouldered body, since with default
// shoulders the shoulder is the binding constraint and every other press
// curve would be flat for the wrong reason.
const baseStrength = process.env.BASE_STRENGTH_JSON ? JSON.parse(process.env.BASE_STRENGTH_JSON) : null;

const [factorName, scenario = 'lunge', outfile = null, maxGenS = '250', seedS = '17'] = process.argv.slice(2);
const factor = FACTORS[factorName];
if (!factor) {
  console.error(`unknown factor ${factorName}; options: ${Object.keys(FACTORS).join(', ')}`);
  process.exit(1);
}
const maxGen = +maxGenS, seed = +seedS;

const weights = scenario === 'pike'
  ? { ...COST_WEIGHTS, quasiStatic: 4, effort: 0.15 }
  : { ...COST_WEIGHTS };
const optExtra = scenario === 'pike'
  ? { tLo: 1.5, tHi: 3.5, t0: 2.2, lambda: 24, dt: 2.5e-4 }
  : { lambda: 24, dt: 2.5e-4 };

const preset = PRESET_TRAJECTORIES[scenario];
const x0 = preset
  ? encodeDecision(preset.knots.map((k) => Float64Array.from(k)),
    Math.min(Math.max(preset.T, optExtra.tLo ?? 0.6), optExtra.tHi ?? 3.0))
  : null;
// Warm starts refine in a small neighborhood; CMA-ES with a wide initial
// step can wander off a delicate optimum and not find its way back within
// the budget.
if (x0) optExtra.sigma0 = 0.1;

const { createEvalPool } = await import('./pool.mjs');

const results = [];
for (const value of factor.values) {
  const cfg = factor.apply(value);
  const strengthOpts = {
    overrides: {
      ...(baseStrength?.overrides || {}),
      ...(cfg.strength?.overrides || {}),
    },
  };
  const model = buildModel({});
  const ws = createWorkspace(model);
  const prof = strengthProfile(model.massKg, strengthOpts);
  const rom = { ...ROM_DEFAULTS, ...(cfg.rom || {}) };
  const pool = createEvalPool({
    scenario, K: 6, dt: optExtra.dt, weights,
    romOverrides: cfg.rom || {}, strengthOpts,
  }, process.env.PARALLEL ? +process.env.PARALLEL : 4);
  const t0 = Date.now();
  const opt = await optimizeScenario(model, ws, prof, rom, {
    scenario, seed, maxGen, weights, x0, ...optExtra,
    objectiveBatch: pool.objectiveBatch,
  });
  pool.destroy();
  // The warm start is itself a candidate: never report a sweep point worse
  // than the trajectory we started from. (CMA-ES samples around x0 but
  // never evaluates it exactly.)
  let refinedWorse = false;
  if (x0) {
    const x0Robust = robustRolloutCost(model, ws, prof, rom, scenario, x0,
      { K: 6, dt: optExtra.dt, weights });
    if (x0Robust.cost < opt.best) {
      refinedWorse = true;
      opt.best = x0Robust.cost;
      opt.bestX = x0;
      opt.finalCheck = rolloutCost(model, ws, prof, rom, scenario, x0,
        { K: 6, dt: 2e-4, weights });
      opt.decoded = { T: x0[x0.length - 1] };
    }
  }
  const check = opt.finalCheck;
  const row = {
    factor: factorName, label: factor.label, value, scenario,
    seed, maxGen,
    cost: check.cost,
    coarseCost: opt.best,
    // A best-at-coarse-dt trajectory that scores much worse at fine dt was
    // exploiting integration artifacts; report it as not reaching.
    dtMismatch: check.cost > 3 * opt.best + 5,
    success: check.verdict.success,
    upright: check.verdict.upright && !(check.cost > 3 * opt.best + 5),
    refinedWorse,
    T: opt.decoded.T,
    terms: check.terms,
    peakUtil: Object.fromEntries(JOINT_KEYS.map((k, j) => [k, check.peakUtil[j]])),
    seconds: (Date.now() - t0) / 1000,
  };
  results.push(row);
  console.log(`${factorName}=${value} ${scenario}: cost ${check.cost.toFixed(2)}, `
    + `success ${row.success}, upright ${row.upright}, T ${row.T.toFixed(2)}, ${row.seconds.toFixed(0)}s`);
}

if (outfile) {
  writeFileSync(outfile, JSON.stringify({
    factor: factorName, label: factor.label, scenario, baseStrength, results,
  }));
  console.log('wrote', outfile);
}
