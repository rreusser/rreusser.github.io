// Gate for the sun altitude near and below the horizon.
//
// Two separate floors used to pin the altitude the shadow sweep ran
// at, so the terrain stopped responding to the sun well before the sun
// stopped moving:
//
//   1. tile-viewer's `tileSunAngles` raised any tile-centre altitude
//      below 0.5 degrees to 0.5, so every tile past the terminator
//      baked the same shadow.
//   2. The soft-shadow penumbra window in sweepCore and
//      deriveSweepParams was centred on `max(altDeg, 1.5 * sunRadius)`,
//      which is 0.69 degrees at the figure's default sun diameter and
//      22.5 degrees at the slider's maximum.
//
// Below the floor the bake is frozen: shadows stop growing, and in a
// recorded solar day the terrain stops changing while the sun keeps
// setting.
//
// Two things are measured, because no single one covers the range.
// Cast shadow length discriminates while the shadow still fits on the
// tile; below that everything downsun is dark whatever the altitude,
// and what is left to measure is the penumbra on open ground. The
// window spans [alt - 1.5r, alt + 1.5r], so flat ground passes through
// it as the disc sets: lit with the disc up, half shadowed with it
// half set, fully shadowed once it is down. That is the behaviour the
// floor replaced with a plateau, and the composite's low-angle fade is
// what covers the ring-truncation seams at these angles.
//
//   node src/notebooks/line-sweep-terrain-lighting/verify-low-sun.mjs
//   node .../verify-low-sun.mjs --legacy     (floor on: the plateau)

import { sweepCore } from "../../lib/line-sweep-core.js";

const legacy = process.argv.includes("--legacy");

const N = 96;
const PX = 30;         // metres per pixel, so the tile spans 2.9 km
const RIDGE_X = 72;    // ridge near the downsun edge, shadow falls west
const RIDGE_H = 20;    // low enough that its shadow fits on the tile

// Flat ground with one north-south ridge. The sun is in the east, so
// the ridge shadows the ground west of it and that shadow lengthens as
// the sun drops. Ground east of the ridge has nothing upsun of it at
// all, so it is lit until the sun's own disc sets.
const elev = new Float32Array(N * N);
for (let y = 0; y < N; y++) elev[y * N + RIDGE_X] = RIDGE_H;

const SUN_RADIUS_DEG = 0.46; // the figure's default 0.92 degree disc

function sweep(altDeg) {
  return sweepCore({
    W: N, H: N, elev,
    azDeg: 0,
    pxSizeM: PX,
    mode: "soft",
    altDeg,
    sunRadiusDeg: SUN_RADIUS_DEG,
    weight: 1,
    horizonFloor: legacy,
  });
}

// Shadow cast by the ridge, in pixels: how far west of it the middle
// row stays dark. Saturates at RIDGE_X once the shadow runs off the
// tile.
function shadowLengthPx(out) {
  const row = Math.floor(N / 2) * N;
  let n = 0;
  for (let x = RIDGE_X - 1; x >= 0; x--) {
    if (out[row + x] < 0.5) break;
    n++;
  }
  return n;
}

// Mean shadow over open ground east of the ridge: nothing blocks it,
// so this is the sun's own disc crossing the horizon and nothing else.
//
// The last column is left out. The sweep reads a target's horizon off
// the pixels upsun of it, and the upsun edge column has none at all,
// so it reports no horizon and stays lit however far the sun drops.
// On a real tile the parent ring supplies those samples; on a bare
// test grid there is nothing there to supply them.
function openGroundShadow(out) {
  let sum = 0;
  let n = 0;
  for (let y = 0; y < N; y++) {
    for (let x = RIDGE_X + 2; x < N - 1; x++) {
      sum += Math.min(1, Math.max(0, out[y * N + x]));
      n++;
    }
  }
  return sum / n;
}

const ALTS = [8, 4, 2, 1, 0.69, 0.5, 0.25, 0, -0.25, -0.5, -0.69, -1, -2];

console.log(legacy
  ? "floor ON (legacy): penumbra centred on max(alt, 1.5*sunRadius)"
  : "floor OFF: penumbra centred on the true altitude");
console.log("");
console.log("  alt (deg)   shadow (px)   open ground");
const rows = ALTS.map((a) => {
  const out = sweep(a);
  const finite = out.every((v) => Number.isFinite(v));
  return { a, len: shadowLengthPx(out), open: openGroundShadow(out), finite };
});
for (const r of rows) {
  console.log(
    `  ${r.a.toFixed(2).padStart(8)}   ${String(r.len).padStart(11)}   ${r.open.toFixed(6)}`,
  );
}
console.log("");

let failures = 0;
const fail = (msg) => { console.log(`FAIL  ${msg}`); failures++; };
const pass = (msg) => console.log(`ok    ${msg}`);

// 1. Nothing is NaN anywhere in the range, below the horizon included.
if (rows.some((r) => !r.finite)) fail("sweep produced NaN");
else pass("sweep is finite at every altitude, below the horizon included");

// 2. Shadow only ever grows as the sun drops, on both measures.
let monotone = true;
for (let i = 1; i < rows.length; i++) {
  if (rows[i].len < rows[i - 1].len) monotone = false;
  if (rows[i].open < rows[i - 1].open - 1e-9) monotone = false;
}
if (!monotone) fail("shadow is not monotone in falling altitude");
else pass("shadow grows monotonically as the sun drops");

// 3. The sweep keeps responding below the floor. Once the cast shadow
//    has run off the tile, open ground is what still has to move.
//
//    Only down to where the disc finishes setting: past -1.5r there is
//    no sun left anywhere, every measure is saturated, and staying put
//    is the answer rather than a plateau.
const HALF_WIDTH = 1.5 * SUN_RADIUS_DEG;
const below = rows.filter((r) => r.a <= 0.69 && r.a >= -HALF_WIDTH);
let frozen = 0;
for (let i = 1; i < below.length; i++) {
  const d = Math.abs(below[i].open - below[i - 1].open)
    + Math.abs(below[i].len - below[i - 1].len);
  if (d < 1e-6) frozen++;
}
if (frozen > 0) {
  fail(`${frozen} of ${below.length - 1} steps below 0.69 deg are frozen (the altitude floor)`);
} else {
  pass("every step below 0.69 deg changes the shadow");
}

// 4. Half the disc down, half the light gone on open ground.
const atHorizon = rows.find((r) => r.a === 0).open;
if (Math.abs(atHorizon - 0.5) > 0.05) {
  fail(`disc half set leaves open ground at ${atHorizon.toFixed(3)} shadowed, expected ~0.5`);
} else {
  pass("disc half set shadows open ground halfway");
}

// 5. Disc fully down, open ground fully shadowed: no direct sun to lose.
const fullyDown = rows.find((r) => r.a === -1).open;
if (fullyDown < 0.999) {
  fail(`sun a degree down leaves ${((1 - fullyDown) * 100).toFixed(1)}% of open ground lit`);
} else {
  pass("sun below the horizon shadows open ground everywhere");
}

console.log("");
console.log(failures === 0 ? "PASS" : `FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
