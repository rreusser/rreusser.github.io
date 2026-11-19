// Gates for hash-params.js and the viewer's half of the hash.
//
//   node src/notebooks/line-sweep-terrain-lighting/verify-hash-params.mjs
//
// The notebook keeps its settings after the map position in the hash,
// `#<zoom>/<lat>/<lng>?key=value&...`. Three things have to hold:
//
//   1. Round trip. Whatever the controls hold encodes and decodes back
//      to the same values, and re-encoding the decoded state gives the
//      same string (so the poll that writes the hash settles instead of
//      rewriting it forever).
//   2. Defaults stay out. An untouched notebook adds nothing.
//   3. Garbage is harmless. Malformed, out-of-range or unknown params
//      are dropped key by key; decode never throws and never lets a bad
//      value through to a control.
//
// Plus the seam with the viewer: its parser must ignore the query, and
// the map-position predicate `expandable` relies on must still match a
// position that carries settings.

import {
  splitHash, joinHash, encodeParams, decodeParams,
  num, oneOf, isoDate, clockMinutes, timeZone, range, rampStops,
} from "./hash-params.js";
import { isLocationHash } from "./tile-viewer.js";

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures++;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A schema shaped like the notebook's, with its real defaults.
const defaultStops = [
  { value: 918, color: "#6a7f66" },
  { value: 1002, color: "#c8aa92" },
  { value: 1174, color: "#eab69a" },
  { value: 1329, color: "#b9826a" },
  { value: 1436, color: "#ffd5c7" },
];
const schema = {
  mode: { codec: oneOf({ cpu: "cpu", gpu: "gpu", debug: "debug" }), default: "cpu" },
  falloff: { codec: oneOf({ cos2: "cos²α", exp: "e^(−sin α)" }), default: "e^(−sin α)" },
  ao: { codec: num(0, 1, 0.01), default: 0.3 },
  relief: { codec: num(0, 1, 0.01), default: 0.38 },
  sundiam: { codec: num(0.5, 30, 0.01), default: 0.92 },
  samples: { codec: num(1, 16, 1), default: 6 },
  sat: { codec: num(0, 1, 0.01), default: 0 },
  sun: { codec: oneOf({ fixed: "fixed", time: "time" }), default: "fixed" },
  date: { codec: isoDate, default: undefined },
  time: { codec: clockMinutes, default: undefined },
  tz: { codec: timeZone, default: "America/Denver" },
  az: { codec: num(0, 360, 0.5), default: 288.5 },
  alt: { codec: num(-90, 90, 0.5), default: 30 },
  rdom: { codec: range(1), default: [810, 1520] },
  ramp: { codec: rampStops, default: defaultStops },
  fps: { codec: oneOf({ 24: 24, 30: 30, 60: 60 }), default: 30 },
  span: { codec: oneOf({ dawn: "dawn", midnight: "midnight", noon: "noon" }), default: "noon" },
};
const defaults = Object.fromEntries(Object.entries(schema).map(([k, v]) => [k, v.default]));

// ---- 1. round trip ---------------------------------------------------

const configs = [
  { name: "a typical edit", state: { ...defaults, ao: 0.55, sat: 0.8, fps: 60 } },
  {
    name: "time mode with a calendar instant",
    state: {
      ...defaults, sun: "time", date: "2026-03-20", time: 17 * 60 + 30,
      tz: "America/Los_Angeles", az: undefined, alt: undefined,
    },
  },
  {
    name: "every key off its default",
    state: {
      mode: "gpu", falloff: "cos²α", ao: 1, relief: 0, sundiam: 12.34, samples: 16,
      sat: 0.01, sun: "fixed", date: undefined, time: undefined, tz: "UTC",
      az: 0, alt: -12.5, rdom: [-1000, 8848],
      ramp: [{ value: -200, color: "#000000" }, { value: 4000, color: "#ffffff" }],
      fps: 24, span: "dawn",
    },
  },
  {
    name: "a nine-stop preset ramp",
    state: {
      ...defaults,
      ramp: Array.from({ length: 9 }, (_, i) => ({
        value: 810 + i * 88, color: `#${(i * 28).toString(16).padStart(2, "0")}a0c0`,
      })),
    },
  },
];

for (const { name, state } of configs) {
  const q = encodeParams(state, schema);
  const back = { ...defaults, ...decodeParams(q, schema) };
  const expect = Object.fromEntries(
    Object.entries(state).map(([k, v]) => [k, v === undefined ? defaults[k] : v]),
  );
  const mismatched = Object.keys(schema).filter(
    (k) => !(expect[k] === undefined && back[k] === undefined) &&
      !(expect[k] !== undefined && schema[k].codec.equal(back[k], expect[k])),
  );
  check(`round trip: ${name}`, mismatched.length === 0,
    mismatched.length ? `differs on ${mismatched.join(", ")}` : `${q.length} chars`);
  const again = encodeParams(back, schema);
  check(`stable re-encode: ${name}`, again === q, again === q ? "" : `${q}  ->  ${again}`);
}

// Values are rounded to the control's step on the way out, and the
// rounded value is what comes back.
{
  const q = encodeParams({ ...defaults, ao: 0.123456 }, schema);
  const back = decodeParams(q, schema);
  check("numbers round to the control's step", q === "ao=0.12" && back.ao === 0.12, q);
}

// Separators inside a value stay readable; only structural and
// non-ASCII characters are escaped.
{
  const q = encodeParams({ ...defaults, sun: "time", time: 17 * 60 + 30, rdom: [810, 1600] }, schema);
  check("':' and ',' are left as they are", q.includes("time=17:30") && q.includes("rdom=810,1600"), q);
  const back = decodeParams(q, schema);
  check("...and still decode", back.time === 1050 && same(back.rdom, [810, 1600]));
}

// The ugly enum values never reach the URL.
{
  const q = encodeParams({ ...defaults, falloff: "cos²α" }, schema);
  check("enum tokens are URL-plain", q === "falloff=cos2", q);
}

// ---- 2. defaults stay out --------------------------------------------

check("an untouched notebook writes nothing", encodeParams(defaults, schema) === "");
check(
  "a value equal to its default after rounding writes nothing",
  encodeParams({ ...defaults, ao: 0.3000001 }, schema) === "",
);

// ---- 3. garbage is harmless ------------------------------------------

const garbage = [
  "", "&&&", "=", "=x", "ao", "ao=", "ao=abc", "ao=NaN", "ao=Infinity", "ao=1e999",
  "ao=%", "ao=%E0%A4%A", "unknown=1", "__proto__=1", "constructor=1", "toString=x",
  "mode=CPU", "mode=gpu%00", "falloff=e^(−sin α)", "date=2026-02-30", "date=26-3-20",
  "time=24:00", "time=7:5", "time=-1:00", "tz=Not/AZone", "tz=../../etc", "tz=",
  "rdom=1520,810", "rdom=1,2,3", "rdom=a,b", "ramp=1:fff", "ramp=1:ffffff",
  "ramp=1:ffffff,2:gggggg", `ramp=${Array.from({ length: 70 }, (_, i) => `${i}:000000`).join(",")}`,
  "fps=25", "span=dusk", "sun=Time",
];
for (const g of garbage) {
  let out;
  let threw = false;
  try {
    out = decodeParams(g, schema);
  } catch (_) {
    threw = true;
  }
  check(`garbage dropped: ${JSON.stringify(g).slice(0, 48)}`, !threw && same(out, {}),
    threw ? "threw" : same(out, {}) ? "" : JSON.stringify(out));
}

// Out-of-range numbers clamp rather than reaching the slider unchecked.
{
  const out = decodeParams("ao=7&alt=-200&samples=0", schema);
  check("out-of-range numbers clamp to the control's range",
    out.ao === 1 && out.alt === -90 && out.samples === 1, JSON.stringify(out));
}

// One bad key does not cost its neighbours.
{
  const out = decodeParams("ao=0.5&tz=Not/AZone&sat=0.25&date=2026-02-30&fps=60", schema);
  check("good keys survive bad neighbours",
    same(out, { ao: 0.5, sat: 0.25, fps: 60 }), JSON.stringify(out));
}

// ---- the seam with the viewer ----------------------------------------

check("splitHash: path only", same(splitHash("#13.06/46.18/-122.17"), { path: "13.06/46.18/-122.17", query: "" }));
check("splitHash: path and query", same(splitHash("#13/1/2?ao=0.5&fps=60"), { path: "13/1/2", query: "ao=0.5&fps=60" }));
check("splitHash: empty", same(splitHash(""), { path: "", query: "" }));
check("joinHash drops an empty query", joinHash("13/1/2", "") === "#13/1/2");
check("joinHash inverts splitHash", joinHash(...Object.values(splitHash("#13/1/2?ao=0.5"))) === "#13/1/2?ao=0.5");
check("a map position with settings is still a map position", isLocationHash("#13.06/46.18/-122.17?ao=0.5&sun=time"));
check("a map position without settings is still a map position", isLocationHash("#13.06/46.18/-122.17"));
check("a figure id is not a map position, settings or not",
  !isLocationHash("#tile-viewer") && !isLocationHash("#tile-viewer?ao=0.5"));

console.log(failures === 0 ? "\nall hash-params gates passed" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
