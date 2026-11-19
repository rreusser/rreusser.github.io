// Notebook state in the URL hash.
//
// The tile viewer already owns `#<zoom>/<lat>/<lng>`. Everything else
// the reader configures (lighting controls, sun mode and instant, the
// elevation ramp, the recorder's settings) rides after it as
// pseudo-query-params:
//
//   #13.06/46.1844/-122.174?ao=0.5&sun=time&date=2026-03-20&time=17:30
//
// Only values that differ from their defaults are written, so an
// untouched notebook still has a short hash. Parsing is lenient: an
// unknown key, a malformed value or an out-of-range number is dropped
// and the control keeps its default, never an exception.
//
// Everything here is pure (no DOM, no `location`), so the codec can be
// exercised from node by `verify-hash-params.mjs`.

/** Split a hash into the viewer's path and the query that follows it. */
export function splitHash(hash) {
  const h = String(hash ?? "").replace(/^#/, "");
  const i = h.indexOf("?");
  return i < 0 ? { path: h, query: "" } : { path: h.slice(0, i), query: h.slice(i + 1) };
}

/** Inverse of `splitHash`. */
export function joinHash(path, query) {
  return `#${path}${query ? `?${query}` : ""}`;
}

// ---- value codecs ----------------------------------------------------
//
// Each codec turns a control value into a short token and back. `parse`
// returns `undefined` for anything it does not accept; that is the
// "drop it, keep the default" signal.

const decimalsOf = (step) => {
  const s = String(step);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
};
const trimZeros = (s) => (s.includes(".") ? s.replace(/\.?0+$/, "") : s);

/**
 * A number on a slider, clamped to its range and rounded to as many
 * decimal places as `step` has (so 0.01 keeps two, 1 keeps none).
 */
export function num(min, max, step) {
  const dec = decimalsOf(step);
  const snap = (v) => Math.min(max, Math.max(min, Number(v.toFixed(dec))));
  return {
    format: (v) => trimZeros(snap(Number(v)).toFixed(dec)),
    parse: (s) => {
      if (!/^-?\d*\.?\d+(e-?\d+)?$/i.test(s)) return undefined;
      const v = Number(s);
      return Number.isFinite(v) ? snap(v) : undefined;
    },
    equal: (a, b) => snap(Number(a)) === snap(Number(b)),
  };
}

/**
 * One of a fixed set of values. `tokens` maps the short token written to
 * the hash onto the control's own value, which may be something like
 * "e^(−sin α)" that has no business in a URL.
 */
export function oneOf(tokens) {
  const entries = Object.entries(tokens);
  return {
    format: (v) => {
      const hit = entries.find(([, val]) => val === v);
      return hit ? hit[0] : undefined;
    },
    parse: (s) => (Object.prototype.hasOwnProperty.call(tokens, s) ? tokens[s] : undefined),
    equal: (a, b) => a === b,
  };
}

/** A calendar date, YYYY-MM-DD, that actually exists. */
export const isoDate = {
  format: (v) => v,
  parse: (s) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
    const d = new Date(`${s}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : undefined;
  },
  equal: (a, b) => a === b,
};

/** Minutes past midnight, written as H:MM. */
export const clockMinutes = {
  format: (v) => {
    const m = Math.round(Number(v));
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  },
  parse: (s) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (!m) return undefined;
    const h = Number(m[1]);
    const mm = Number(m[2]);
    return h < 24 && mm < 60 ? h * 60 + mm : undefined;
  },
  equal: (a, b) => Math.round(a) === Math.round(b),
};

/** An IANA time zone name the runtime knows, e.g. America/Los_Angeles. */
export const timeZone = {
  format: (v) => v,
  parse: (s) => {
    if (!/^[A-Za-z][A-Za-z0-9_+\-/]*$/.test(s)) return undefined;
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: s });
      return s;
    } catch (_) {
      return undefined;
    }
  },
  equal: (a, b) => a === b,
};

/** A pair of numbers, `a,b`, each on `step`, with a < b. */
export function range(step) {
  const n = num(-Infinity, Infinity, step);
  return {
    format: ([a, b]) => `${n.format(a)},${n.format(b)}`,
    parse: (s) => {
      const parts = s.split(",");
      if (parts.length !== 2) return undefined;
      const a = n.parse(parts[0]);
      const b = n.parse(parts[1]);
      return a !== undefined && b !== undefined && a < b ? [a, b] : undefined;
    },
    equal: (x, y) => n.equal(x[0], y[0]) && n.equal(x[1], y[1]),
  };
}

/**
 * Ramp stops, `value:rrggbb` joined by commas, values in metres. At
 * least two stops; colours are six hex digits, lower-cased on the way
 * out. Order is not significant to the editor, which sorts its stops.
 */
export const rampStops = {
  format: (stops) =>
    stops
      .map((s) => `${Math.round(s.value)}:${String(s.color).replace(/^#/, "").toLowerCase()}`)
      .join(","),
  parse: (s) => {
    const parts = s.split(",");
    if (parts.length < 2 || parts.length > 64) return undefined;
    const out = [];
    for (const p of parts) {
      const m = /^(-?\d+(?:\.\d+)?):([0-9a-fA-F]{6})$/.exec(p);
      if (!m) return undefined;
      out.push({ value: Number(m[1]), color: `#${m[2].toLowerCase()}` });
    }
    return out;
  },
  equal: (a, b) =>
    a.length === b.length &&
    a.every(
      (s, i) =>
        Math.round(s.value) === Math.round(b[i].value) &&
        String(s.color).toLowerCase() === String(b[i].color).toLowerCase(),
    ),
};

// ---- whole-state encode / decode -------------------------------------

// Escape only what would break the "key=value&..." structure or is not
// plain ASCII. `encodeURIComponent` on everything would turn the ":"
// in a time and the "," in a ramp into %3A and %2C, which a fragment
// does not need and which makes a shared link much harder to read.
const escapeToken = (s) =>
  String(s).replace(/[%&=#?+\s]|[^\x21-\x7e]/gu, (c) => encodeURIComponent(c));

/**
 * Encode `state` against `schema` ({ key: { codec, default } }) into a
 * query string. Keys are written in schema order, and only when the
 * value differs from the default; `undefined` or `null` values are
 * skipped. A key whose `default` is `undefined` is always written when
 * present, for values (like a date) with no meaningful default.
 */
export function encodeParams(state, schema) {
  const out = [];
  for (const [key, { codec, default: def }] of Object.entries(schema)) {
    const v = state[key];
    if (v === undefined || v === null) continue;
    if (def !== undefined && codec.equal(v, def)) continue;
    const token = codec.format(v);
    if (token === undefined || token === "") continue;
    out.push(`${key}=${escapeToken(token)}`);
  }
  return out.join("&");
}

/**
 * Decode a query string against `schema`. Returns only the keys that
 * were present and parsed cleanly; everything else is the caller's
 * default. Never throws.
 */
export function decodeParams(query, schema) {
  const out = {};
  for (const pair of String(query ?? "").split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const key = pair.slice(0, eq);
    if (!Object.prototype.hasOwnProperty.call(schema, key)) continue;
    let raw;
    try {
      raw = decodeURIComponent(pair.slice(eq + 1));
    } catch (_) {
      continue;
    }
    const v = schema[key].codec.parse(raw);
    if (v !== undefined) out[key] = v;
  }
  return out;
}
