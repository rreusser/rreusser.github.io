// The techniques the editor opens with.
//
// These used to be RECORDED: the winning artifact of some past search,
// checked in as a wall of JSON along with the exact plant, body, anatomy and
// integration it was produced under, and replayed on that plant forever after
// so history could not be rewritten. That rule is right for a documented
// result and wrong for a starting point, and the difference had gone unnoticed
// because for a long time the two were the same object.
//
// It stopped being harmless the moment the machine improved. A recorded plant
// pins the servo tuning too, so every fix to the controller was invisible in
// the editor -- the head went on bobbling on a preset recorded before the
// bobbling was fixed, and no amount of correct new physics could show through
// a technique that insisted on the old. Worse, the knots themselves described
// a body with a rigid trunk, so once the spine and neck were articulated the
// stored answers were not merely stale, they were answers to a different
// question, and none of them arrived.
//
// So nothing here is stored. A built-in preset is DERIVED, at load, from the
// hand-authored reference for its scenario on whatever body and anatomy it is
// asked about, and it runs on today's plant because it names none of its own.
// It cannot go stale, because there is nothing to go stale: change the model
// and the presets change with it.
//
// A preset is a technique is a saved case -- one shape, the one
// technique-file.js reads and writes, whether it was derived here, kept in the
// browser, or loaded from disk.
import { buildModel } from './anthropometry.js';
import { createWorkspace } from './dynamics.js';
import { ROM_DEFAULTS } from './statics.js';
import {
  kickReference, pressReference, tuckPressReference, naiveReference,
  balancedHandstand, SYMMETRIC_SCENARIOS, PLANT_DEFAULTS, NUMERICS_DEFAULTS, KICK_T,
} from './rollout.js';

// Scenario -> how the editor should open it. The duration is the one number
// here that is a judgement rather than a derivation: it is the tempo the
// movement is authored at, and the search is pinned to it.
export const BUILTIN_SCENARIOS = [
  // The kick-up's tempo is not a free judgement the way the presses' are: the
  // throw only arrives in a narrow band, so it comes from the same measurement
  // the reference's shape does.
  { key: 'lunge', label: 'Kick-up', T: KICK_T, K: 6 },
  { key: 'pike', label: 'Press, straight legs', T: 2.2, K: 6 },
  // 1.8 s was too fast for the shape to be held through: given the shoulder a
  // bent-leg press actually needs (2.8 Nm/kg -- see test/presets-arrive.mjs)
  // this arrives at 2.5 and falls at 1.8, and a starting point should be the
  // tempo the movement works at rather than the one it was first written at.
  { key: 'tuck', label: 'Bent-leg press', T: 2.5, K: 6 },
  { key: 'hold', label: 'Hold a handstand', T: 1.2, K: 3 },
];

function referenceFor(model, ws, scenario, K, rom) {
  if (scenario === 'lunge') return kickReference(model, ws, K, rom);
  if (scenario === 'pike') return pressReference(model, ws, K, rom);
  if (scenario === 'tuck') return tuckPressReference(model, ws, K, rom);
  return naiveReference(model, ws, scenario, K, rom);
}

// One built-in preset, in the shape technique-file.js reads.
//
// The plant is written down, and it has to be: null does NOT mean "today's
// machine" anywhere in this notebook -- resolvePlant fills a missing key with
// the behaviour that predated it, which is the right rule for reading an old
// artifact and exactly the wrong one here. A preset with no config resolves
// to the LEGACY plant: no damping ratio, no bandwidth cap, and no end-stops
// at all. So today's defaults are copied in, at load, every time. That is not
// a recording -- there is nothing here to go stale, because the copy is taken
// fresh from PLANT_DEFAULTS whenever these are built.
export function builtinPreset(model, ws, scenario, { rom = ROM_DEFAULTS, T = null, K = null } = {}) {
  const spec = BUILTIN_SCENARIOS.find((s) => s.key === scenario) || BUILTIN_SCENARIOS[0];
  const nK = K ?? spec.K;
  const { knots, target } = referenceFor(model, ws, spec.key, nK, rom);
  const end = balancedHandstand(model, ws);
  return {
    builtin: true,
    id: `builtin:${spec.key}`,
    label: spec.label,
    scenario: spec.key,
    knots: knots.map((k) => Array.from(k)),
    T: T ?? spec.T,
    knotFracs: null,
    held: Array.from({ length: nK }, (_, k) => k === nK - 1),
    timeHeld: Array.from({ length: nK }, () => true),
    symmetric: SYMMETRIC_SCENARIOS.has(spec.key),
    // Solved from the scenario, not constructed: null is how a technique says
    // "start where this skill starts", and it is what lets a start solver fix
    // itself without every preset carrying the old answer.
    q0: null,
    target: Array.from(target || end),
    rom,
    strength: null,
    // The body is the reader's, not the technique's: null lets whoever asks
    // supply their own height and mass, which is the one thing here that
    // genuinely should not be pinned.
    body: null,
    config: { ...PLANT_DEFAULTS },
    numerics: { ...NUMERICS_DEFAULTS },
    search: { seed: 7, maxGen: 120 },
    verdict: null,
    cost: null,
  };
}

export function builtinPresets(model, ws, rom = ROM_DEFAULTS) {
  const out = {};
  for (const s of BUILTIN_SCENARIOS) out[s.key] = builtinPreset(model, ws, s.key, { rom });
  return out;
}

// The same presets on the default body, for callers that do not have a model
// of their own -- the gates, mostly. Built once, at import.
const defaultModel = buildModel({});
const defaultWs = createWorkspace(defaultModel);

export const PRESET_TRAJECTORIES = builtinPresets(defaultModel, defaultWs, ROM_DEFAULTS);
