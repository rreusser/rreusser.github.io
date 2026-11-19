// Apparent-solar-day bounds: the instants of local solar midnight that
// bracket a given time at a given longitude.
//
// "Local solar" here means apparent solar time, the real sun rather
// than a timezone's mean-time fiction. Midnight is the instant the
// sun's hour angle reaches π at the observer's meridian. That is the
// right span for a day-cycle animation: solar noon lands exactly in
// the middle of the clip, and both ends sit at the darkest point, so a
// full-day recording loops.
//
// Both ends get solved rather than assuming they are 86400 s apart.
// The equation of time shifts by up to about 30 s per day, so a real
// solar day runs that much long or short, and spread over a few
// hundred frames the error is a visible fraction of a frame.

import { solarTimeQuantities } from "./solar-time.js";

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
const DAY_MS = 86400000;

function wrapPi(x) {
  return x - Math.floor((x + Math.PI) / TWO_PI) * TWO_PI;
}

// Hour angle at longitude lngRad: 0 at apparent noon, ±π at midnight.
function hourAngle(utcMs, lngRad) {
  const { gmstMinusRA } = solarTimeQuantities(utcMs);
  return wrapPi(gmstMinusRA + lngRad);
}

// Newton on the hour angle. It is monotone in t apart from the 2π jump
// wrapPi puts between consecutive events, so an iteration seeded
// within half a day of the event it wants converges to that one and no
// other. The derivative comes from a 60 s difference rather than from
// the mean-solar-day constant, which keeps sidereal rates out of this
// file entirely.
function solveHourAngle(seedMs, lngRad, targetRad) {
  let t = seedMs;
  for (let i = 0; i < 12; i++) {
    const g = wrapPi(hourAngle(t, lngRad) - targetRad);
    const h = 60000;
    const g2 = wrapPi(hourAngle(t + h, lngRad) - targetRad);
    let slope = wrapPi(g2 - g) / h;
    if (!(Math.abs(slope) > 1e-12)) slope = TWO_PI / DAY_MS;
    const step = g / slope;
    t -= step;
    // Sub-second is far below what the underlying position model is
    // good for; stop rather than chase float noise.
    if (Math.abs(step) < 1) break;
  }
  return t;
}

/** Apparent solar noon nearest `utcMs` at longitude `lngDeg`. */
export function solarNoon(utcMs, lngDeg) {
  return solveHourAngle(utcMs, lngDeg * DEG, 0);
}

/** Apparent solar midnight nearest `utcMs` at longitude `lngDeg`. */
export function solarMidnight(utcMs, lngDeg) {
  return solveHourAngle(utcMs, lngDeg * DEG, Math.PI);
}

/**
 * The apparent solar day containing `utcMs` at longitude `lngDeg`, as
 * { start, noon, end, lengthMs } in epoch milliseconds, where start
 * and end are consecutive solar midnights.
 *
 * Anchored on the solar noon nearest `utcMs` and then solved half a
 * day either side, which returns the day that *contains* utcMs rather
 * than whichever midnight happens to sit closer. Exactly at midnight
 * the two neighbouring days are equally close and this picks one.
 */
export function solarDayBounds(utcMs, lngDeg) {
  const noon = solarNoon(utcMs, lngDeg);
  const start = solarMidnight(noon - DAY_MS / 2, lngDeg);
  const end = solarMidnight(noon + DAY_MS / 2, lngDeg);
  return { start, noon, end, lengthMs: end - start };
}

/**
 * The instants a day-cycle animation should walk, as
 * { t0, t1, lengthMs, day }. `anchor` picks which event it starts and
 * ends on:
 *
 *   "midnight"  the solar day itself, midnight round to midnight
 *   "noon"      solar noon round to the next solar noon
 *
 * Both are exactly one solar day long, so either one loops. What
 * differs is where the seam falls, and that matters because
 * consecutive solar days are not quite identical — the sun's
 * declination drifts by up to about 0.4 degrees per day near the
 * equinoxes, so the closing frame's sun sits a little off the opening
 * frame's.
 *
 * At midnight that discrepancy is invisible: every pixel is already
 * at the night floor, so there is nothing for it to disagree about.
 * At noon it turns into a shadow-length step of order a percent,
 * against the brightest and most detailed frame in the clip. Noon
 * pays that to open on a frame worth looking at, which is what a
 * poster frame and a single unlooped play both want; midnight hides
 * the seam but opens and closes on a static dark image.
 */
export function solarDaySpan(utcMs, lngDeg, anchor = "noon") {
  const day = solarDayBounds(utcMs, lngDeg);
  if (anchor === "noon") {
    // Seeding one mean day out lands within half a minute of the true
    // next noon, well inside the basin of the root we want.
    const next = solarNoon(day.noon + DAY_MS, lngDeg);
    return { t0: day.noon, t1: next, lengthMs: next - day.noon, day };
  }
  return { t0: day.start, t1: day.end, lengthMs: day.lengthMs, day };
}
