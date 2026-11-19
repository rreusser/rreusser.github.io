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
