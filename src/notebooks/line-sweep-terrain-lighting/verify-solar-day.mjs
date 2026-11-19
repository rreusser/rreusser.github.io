// Gate for solar-day.js, cross-checked against NOAA's solar
// calculator equations.
//
// solar-day.js solves for solar noon and midnight by Newton on the
// hour angle that solar-time.js derives from suncalc's model. The
// reference below is NOAA's independent formulation: a different
// series for the equation of time, a different obliquity correction,
// and a different sidereal-time epoch constant.
//
// The two models disagree by 8 to 31 s depending on the date, largest
// near the equinoxes and smallest at the solstices, which is suncalc's
// own equation-of-time error and not something this file can fix. What
// the gates below pin instead is that the root find is sound *within*
// the model the figure already shades with:
//
//   * the disagreement is longitude-independent — a sign or
//     convention slip in the hour angle would make it swing with
//     longitude while leaving the absolute offset looking plausible,
//     so this is the gate that would actually catch a bug;
//   * every midnight is a midnight and not a noon;
//   * consecutive midnights are one solar day apart, so the solver
//     never skips an event;
//   * noon sits midway between them.
//
// Staying on suncalc rather than switching to NOAA is deliberate: the
// shader derives its own sun position from the same solar-time.js
// quantities, so a recording that started at NOAA's midnight would
// begin half a minute off the figure's own terminator.
//
//   node src/notebooks/line-sweep-terrain-lighting/verify-solar-day.mjs

import { solarNoon, solarMidnight, solarDayBounds } from "./solar-day.js";

const RAD = Math.PI / 180;
const DAY_MS = 86400000;

// ---- NOAA reference --------------------------------------------------
// Apparent solar time, in minutes past local solar midnight, at UTC
// instant t and longitude lngDeg. Equations from NOAA's spreadsheet.
function noaaAstMinutes(utcMs, lngDeg) {
  const jd = utcMs / DAY_MS + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const meanObliq =
    23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const obliqCorr = meanObliq + 0.00256 * Math.cos(RAD * (125.04 - 1934.136 * T));
  const varY = Math.tan(RAD * obliqCorr / 2) ** 2;
  const eqTime =
    4 /
    RAD *
    (varY * Math.sin(2 * RAD * L0) -
      2 * e * Math.sin(RAD * M) +
      4 * e * varY * Math.sin(RAD * M) * Math.cos(2 * RAD * L0) -
      0.5 * varY * varY * Math.sin(4 * RAD * L0) -
      1.25 * e * e * Math.sin(2 * RAD * M));
  const utcMinutes = (utcMs / 60000) % 1440;
  return utcMinutes + eqTime + 4 * lngDeg;
}

// Newton on apparent solar time, so the reference finds its events the
// same way but from a different astronomy model.
function noaaSolve(seedMs, lngDeg, targetMinutes) {
  let t = seedMs;
  for (let i = 0; i < 20; i++) {
    const wrap = (x) => x - Math.round(x / 1440) * 1440;
    const g = wrap(noaaAstMinutes(t, lngDeg) - targetMinutes);
    const h = 60000;
    const g2 = wrap(noaaAstMinutes(t + h, lngDeg) - targetMinutes);
    let slope = wrap(g2 - g) / h;
    if (!(Math.abs(slope) > 1e-12)) slope = 1440 / DAY_MS;
    const stepMs = g / slope;
    t -= stepMs;
    if (Math.abs(stepMs) < 1) break;
  }
  return t;
}

const noaaNoon = (utcMs, lngDeg) => noaaSolve(utcMs, lngDeg, 720);
const noaaMidnight = (utcMs, lngDeg) => noaaSolve(utcMs, lngDeg, 0);

// ---- gates -----------------------------------------------------------
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${name}${detail ? "  " + detail : ""}`);
}

const dates = [
  "2026-01-15", "2026-02-11", "2026-03-20", "2026-05-01",
  "2026-06-21", "2026-08-07", "2026-09-23", "2026-11-03",
  "2026-11-19", "2026-12-22",
];
// The notebook's own view, plus a spread of longitudes including the
// antimeridian, where the hour-angle wrap is most likely to bite.
const places = [
  { name: "Canyonlands", lat: 38.237, lng: -109.822 },
  { name: "Greenwich", lat: 51.48, lng: 0 },
  { name: "Kathmandu", lat: 27.7, lng: 85.3 },
  { name: "Suva", lat: -18.1, lng: 178.4 },
  { name: "Apia", lat: -13.8, lng: -171.8 },
  { name: "Tromso", lat: 69.65, lng: 18.96 },
];

console.log("\nsolar noon / midnight vs NOAA (model difference, 60 s bound)");
let worstNoon = 0;
let worstMid = 0;
for (const d of dates) {
  for (const p of places) {
    const anchor = Date.parse(`${d}T12:00:00Z`) - p.lng * 4 * 60000;
    const dn = Math.abs(solarNoon(anchor, p.lng) - noaaNoon(anchor, p.lng));
    worstNoon = Math.max(worstNoon, dn);
    const midSeed = solarNoon(anchor, p.lng) + DAY_MS / 2;
    const dm = Math.abs(
      solarMidnight(midSeed, p.lng) - noaaMidnight(midSeed, p.lng),
    );
    worstMid = Math.max(worstMid, dm);
  }
}
check("solar noon within model error", worstNoon < 60000, `worst ${(worstNoon / 1000).toFixed(1)} s`);
check("solar midnight within model error", worstMid < 60000, `worst ${(worstMid / 1000).toFixed(1)} s`);

// The gate with teeth. Hold the date fixed and sweep longitude right
// across the antimeridian: the offset between the two models is a
// function of date alone, so anything that moves with longitude is a
// convention error in the hour angle, not a model difference.
console.log("\ndisagreement is longitude-independent (tolerance 2 s)");
let worstSpread = 0;
for (const d of dates) {
  for (const lngs of [[-180, -90, 0, 90, 179.9]]) {
    const diffs = lngs.map((lng) => {
      const anchor = Date.parse(`${d}T12:00:00Z`) - lng * 4 * 60000;
      return solarNoon(anchor, lng) - noaaNoon(anchor, lng);
    });
    worstSpread = Math.max(worstSpread, Math.max(...diffs) - Math.min(...diffs));
  }
}
check("offset flat in longitude", worstSpread < 2000, `worst spread ${(worstSpread / 1000).toFixed(2)} s`);

// Apparent solar time is close enough to linear over one day that
// noon lands midway between its bracketing midnights. A solver that
// grabbed the wrong root on one end would show up here as a gross
// asymmetry rather than the second or two of equation-of-time
// curvature.
console.log("\nnoon sits midway between its midnights (tolerance 5 s)");
let worstSkew = 0;
for (const d of dates) {
  for (const p of places) {
    const anchor = Date.parse(`${d}T12:00:00Z`) - p.lng * 4 * 60000;
    const { start, noon, end } = solarDayBounds(anchor, p.lng);
    worstSkew = Math.max(worstSkew, Math.abs((noon - start) - (end - noon)));
  }
}
check("midpoint symmetry", worstSkew < 5000, `worst skew ${(worstSkew / 1000).toFixed(2)} s`);

console.log("\nday bounds bracket the anchor, at every hour of the day");
let bracketFails = 0;
let worstLen = 0;
for (const d of dates) {
  for (const p of places) {
    for (let hour = 0; hour < 24; hour++) {
      const anchor = Date.parse(`${d}T${String(hour).padStart(2, "0")}:30:00Z`);
      const { start, end, lengthMs } = solarDayBounds(anchor, p.lng);
      if (!(start <= anchor && anchor <= end)) {
        bracketFails++;
        if (bracketFails < 4) {
          console.log(
            `        ${p.name} ${d} ${hour}:30Z outside ` +
              `[${new Date(start).toISOString()}, ${new Date(end).toISOString()}]`,
          );
        }
      }
      worstLen = Math.max(worstLen, Math.abs(lengthMs - DAY_MS));
    }
  }
}
check("anchor inside its day", bracketFails === 0, `${bracketFails} misses of ${dates.length * places.length * 24}`);
// A real solar day runs long or short by up to about 30 s as the
// equation of time changes; anything far outside that means the solver
// has skipped to the wrong midnight.
check("day length within 40 s of 24 h", worstLen < 40000, `worst ${(worstLen / 1000).toFixed(1)} s off`);

console.log("\nmidnights really are midnights (AST ~ 0 by the NOAA model)");
let worstAst = 0;
for (const d of dates) {
  for (const p of places) {
    const anchor = Date.parse(`${d}T12:00:00Z`) - p.lng * 4 * 60000;
    const { start, end } = solarDayBounds(anchor, p.lng);
    for (const t of [start, end]) {
      const ast = noaaAstMinutes(t, p.lng);
      const off = Math.abs(ast - Math.round(ast / 1440) * 1440);
      worstAst = Math.max(worstAst, off);
    }
  }
}
// A midnight mistaken for a noon would land 720 minutes out, so this
// stays a meaningful gate even at the model's own tolerance.
check("AST at both ends ~ 0", worstAst * 60 < 60, `worst ${(worstAst * 60).toFixed(1)} s`);

console.log("\nequation-of-time spot checks at Greenwich (published values)");
// Early November is the equation of time's largest positive excursion
// (sun ahead of the clock, so solar noon is early); mid-February is
// the deepest negative one.
for (const [date, expectMin] of [["2026-11-03", -16.4], ["2026-02-11", 14.2]]) {
  const dayStart = Date.parse(`${date}T00:00:00Z`);
  const noon = solarNoon(dayStart + DAY_MS / 2, 0);
  const offsetMin = (noon - (dayStart + 720 * 60000)) / 60000;
  check(
    `${date} solar noon offset`,
    Math.abs(offsetMin - expectMin) < 0.5,
    `${offsetMin > 0 ? "+" : ""}${offsetMin.toFixed(1)} min vs ${expectMin} expected`,
  );
}

console.log(
  failures === 0 ? "\nall solar-day gates passed\n" : `\n${failures} GATE(S) FAILED\n`,
);
process.exit(failures === 0 ? 0 : 1);
