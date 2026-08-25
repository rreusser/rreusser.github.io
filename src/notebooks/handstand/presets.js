// The techniques the editor opens with.
//
// A preset is a technique is a saved case -- one shape, the one
// technique-file.js reads and writes, whether it is recorded in
// builtin-techniques.js, kept in the browser, or loaded from disk. This file
// is only the door onto the first of those; see that file for why they are
// recordings again rather than derivations.
//
// Nothing here takes a model, a body or an anatomy any more, and that is the
// whole point of the change: a recorded technique carries its own. Asking for
// "the press on YOUR body" is a question a derived preset answered and a
// recorded one refuses, because the body is what the technique is about.
import { BUILTIN_TECHNIQUES } from './builtin-techniques.js';

// What the picker lists. Read off the techniques rather than written down a
// second time, so a technique added to the recording appears in the list and
// one removed disappears from it, with nothing to keep in step by hand.
export const BUILTIN_SCENARIOS = BUILTIN_TECHNIQUES.map((t) => ({
  key: t.key,
  label: t.label,
  // The skill it is an instance of. Two of these are kick-ups, which is
  // exactly why the key cannot be the scenario: the list is techniques, not
  // scenarios, and it always was -- the two only looked like one thing while
  // there happened to be one technique per skill.
  scenario: t.scenario,
  T: t.T,
  K: t.knots[0].length,
}));

// A deep copy, because a preset is handed to an editor that will mutate it.
// Structured cloning a plain record is enough here: everything in it is
// numbers, strings, booleans and arrays of those.
const clone = (t) => JSON.parse(JSON.stringify(t));

// One built-in, in the shape technique-file.js reads. Unknown keys fall back
// to the first, which is what the picker does with a stale selection.
export function builtinPreset(key) {
  const t = BUILTIN_TECHNIQUES.find((x) => x.key === key) || BUILTIN_TECHNIQUES[0];
  return { ...clone(t), builtin: true, id: `builtin:${t.key}` };
}

export function builtinPresets() {
  const out = {};
  for (const t of BUILTIN_TECHNIQUES) out[t.key] = builtinPreset(t.key);
  return out;
}

// The same set, for callers that want it once. A fresh copy per call is the
// safe default above; this is the convenience, and it is frozen so a caller
// that mutates it is told rather than quietly corrupting everyone else's.
export const PRESET_TRAJECTORIES = builtinPresets();
