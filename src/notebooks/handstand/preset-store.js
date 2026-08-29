// Presets kept in this browser.
//
// A preset, a technique and a "saved case" were three names for one thing:
// the object technique-file.js reads and writes. They had three pieces of
// user interface between them -- a scenario picker at the top, a technique
// picker in the panel bound to it, and a separate saved-cases list with its
// own Open button -- and which one you reached for decided whether the
// scenario switched with the thing you opened. So there is one word now, one
// list, and one shape, and the only thing that distinguishes a built-in from
// something you kept is that a built-in is derived rather than remembered.
//
// Storage is localStorage, which can be absent, full, or switched off
// entirely; every entry point here returns rather than throws, because a
// browser with storage disabled should cost you the list, not the notebook.

export const STORE_KEY = 'handstand.presets.v1';
// What the list was called when it was "cases". Read once, on the first read
// after this shipped, so nothing anyone kept is lost to a rename.
const LEGACY_KEY = 'handstand.cases.v1';

// Two entries under one id is a list that cannot be addressed: `find` returns
// the first, `findIndex` writes the first, and the second is reachable by
// neither. A list already in that state -- written before nextId checked --
// is repaired on the way in rather than left to misbehave, and repaired by
// RENUMBERING rather than by dropping: the duplicate is somebody's preset.
const dedupe = (list) => {
  // Every id in the list, up front: a replacement has to avoid the ones still
  // to come as well as the ones already passed, or repairing a duplicate just
  // moves the collision further down.
  const taken = new Set(list.map((c) => String(c.id ?? '')).filter(Boolean));
  const seen = new Set();
  let n = 0;
  for (const c of list) {
    const id = String(c.id ?? '');
    if (id && !seen.has(id)) { seen.add(id); continue; }
    do { n++; } while (taken.has(`p${n}`));
    c.id = `p${n}`;
    taken.add(c.id);
    seen.add(c.id);
  }
  return list;
};

const parse = (raw) => {
  try {
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? dedupe(list) : [];
  } catch { return []; }
};

export function readPresets() {
  try {
    const own = localStorage.getItem(STORE_KEY);
    if (own !== null) return parse(own);
    // First read after the rename: adopt whatever was kept under the old key
    // and write it back under the new one, so this happens once.
    const old = parse(localStorage.getItem(LEGACY_KEY));
    if (old.length) { try { localStorage.setItem(STORE_KEY, JSON.stringify(old)); } catch { /* full */ } }
    return old;
  } catch (err) {
    console.warn('saved presets unreadable:', err);
    return [];
  }
}

// Returns null on success, or a sentence saying what went wrong. Quota is the
// interesting case and deserves its own words: "no room" is actionable,
// "QuotaExceededError" is not.
export function writePresets(list) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
    return null;
  } catch (err) {
    return err?.name === 'QuotaExceededError'
      ? 'no room left in this browser for another preset'
      : String(err?.message || err);
  }
}

// An id nothing in the list is already using.
//
// The counter alone was not enough. It reads the number off the end of each
// id, and anything it cannot read a number out of counts as zero -- so a list
// whose ids do not match the pattern it expects (a legacy entry, something
// hand-edited in storage, anything a future format writes) hands back `p1`
// while a `p1` is sitting right there. Two entries with one id is the worst
// shape this list can be in: `find` returns the first, `findIndex` writes the
// first, and the second is reachable by neither -- so keeping a preset would
// appear to add one AND overwrite another. The check costs nothing.
export function nextId(list) {
  const used = new Set(list.map((c) => String(c.id ?? '')));
  const n = list.reduce((m, c) => Math.max(m, +String(c.id ?? '').replace(/^p?c?/, '') || 0), 0);
  let i = n + 1;
  while (used.has(`p${i}`)) i++;
  return `p${i}`;
}

// ---------------------------------------------------------------------------
// Drafts: a technique you have edited but not kept.
//
// A built-in is DERIVED rather than remembered, which is the right rule for
// where a technique comes from and a disastrous one for what happens to your
// work. Open the kick-up, hold a pose, unpin an instant, drag a knot, switch
// to the press to compare, switch back -- and every one of those edits was
// gone, because the built-in was rebuilt from its reference and the editor had
// nowhere to have put them. Nothing warned, and nothing said it had happened.
//
// So an edited technique is a document with unsaved changes, and switching
// away from one parks it here under the id of the preset it was opened from.
// Coming back to that preset reads the draft instead of re-deriving. Keep is
// still what makes a technique durable and nameable; this is only what stops
// the editor throwing away things you can see on the screen.
//
// Same storage, same failure rules as the list above: a browser with storage
// off costs you the drafts, not the notebook.
export const DRAFT_KEY = 'handstand.drafts.v1';

export function readDrafts() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const obj = JSON.parse(raw || '{}');
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  } catch (err) {
    console.warn('drafts unreadable:', err);
    return {};
  }
}

// Null on success, a sentence on failure -- and unlike the preset list, a
// draft that will not fit is not worth telling anyone about in the moment it
// happens, because nobody asked for it to be written. The caller logs it.
export function writeDrafts(drafts) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
    return null;
  } catch (err) {
    return err?.name === 'QuotaExceededError'
      ? 'no room left in this browser for a draft'
      : String(err?.message || err);
  }
}
