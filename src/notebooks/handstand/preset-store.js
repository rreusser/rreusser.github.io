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

const parse = (raw) => {
  try {
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? list : [];
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

export function nextId(list) {
  const n = list.reduce((m, c) => Math.max(m, +String(c.id ?? '').replace(/^p?c?/, '') || 0), 0);
  return `p${n + 1}`;
}
