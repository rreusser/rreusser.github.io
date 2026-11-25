// Gate: the parent-ring warmup must not invent horizon angle at the
// tile boundary when the terrain outside the tile SLOPES.
//
// verify-warmup-edge.mjs pins the opposite case: a wall of uniform
// height just outside the tile must cast its full shadow, with no
// half-cell shortfall. A wall is the one profile where a cell's box
// mean equals its height at every point in the cell, so that gate
// cannot see what this one tests.
//
// A ring cell carries the MEAN elevation over `parentScale` child
// pixels. Depositing that mean at the cell's NEAR edge asserts the
// cell's average height at the cell's closest point. Where terrain
// rises away from the tile, the mean is far higher than the terrain
// actually is at that closest point, and because the closest point is
// a pixel or two from the targets just inside the boundary, the
// implied horizon angle explodes: a 20 m overstatement one pixel away
// is a horizon of 80 degrees. The result is a hard, saturated shadow
// band on the shadow-cast side of every tile boundary, decaying over
// (overstatement / tan(alt)) pixels and growing with parentScale.
//
// Ground truth here is a continuous terrain function. The ring is its
// box average; the correct answer is the horizon angle the continuous
// terrain subtends. No part of the sweep is used to produce it.

import { sweepCore } from "../../lib/line-sweep-core.js";

const W = 64, H = 64;
const PN = W;
const S = 16;                     // parentScale, i.e. dz = 4
const HN = Math.floor((PN * (S + 1)) / S);
const MARGIN = (PN * S) >> 1;
const OFF = 0.5 * (1 - 1 / S);
const PX = 3.3;                   // metres per child pixel
const cxOfIndex = (i) => S * (i + OFF) - MARGIN;

// Continuous terrain outside the tile, in child-pixel coordinates.
// Flat bench against the boundary, then a steep rise, then a plateau.
// The bench is what makes the near-edge deposit wrong: the cell that
// straddles the boundary averages bench and rise together, and that
// average is nowhere near the bench's actual height.
const RISE_START = W + 8;
const RISE_END = W + 16;
const PLATEAU = 80;
function terrain(cx) {
  if (cx <= W - 0.5) return 0;                   // the comp tile itself
  if (cx <= RISE_START) return 0;                // bench
  if (cx >= RISE_END) return PLATEAU;            // plateau
  return (PLATEAU * (cx - RISE_START)) / (RISE_END - RISE_START);
}

// Exact horizon tangent at a target inside the tile, from the
// continuous terrain. Sampled finely; this is the reference.
function trueTan(cxTarget) {
  let best = 0;
  for (let cx = cxTarget + 0.25; cx <= W + 4 * S; cx += 0.25) {
    const t = terrain(cx) / ((cx - cxTarget) * PX);
    if (t > best) best = t;
  }
  return best;
}

// Ring = box mean of the continuous terrain over each cell.
const horizon = new Float32Array(HN * HN);
for (let i = 0; i < HN; i++) {
  const c = cxOfIndex(i);
  let acc = 0;
  for (let k = 0; k < S; k++) acc += terrain(c - (S - 1) / 2 + k);
  const mean = acc / S;
  for (let j = 0; j < HN; j++) horizon[j * HN + i] = mean;
}

const elev = new Float32Array(W * H);   // flat tile at 0

function run(altDeg) {
  return sweepCore({
    W, H, elev,
    azDeg: 0,                 // sun due +x, sweep marches -x
    altDeg,
    pxSizeM: PX,
    mode: "hard",
    horizon, HN,
    parentScale: S,
    compElevMin: 0,
    horizonElevMax: PLATEAU,
    horizonFloor: false,
  });
}

let failures = 0;
const report = [];

// Pick an altitude the continuous terrain does NOT reach at the
// boundary pixel, but which the near-edge deposit clears easily.
const cxEdge = W - 1;
const tTrue = trueTan(cxEdge);
const altDeg = (Math.atan(tTrue) * 180) / Math.PI + 6;   // 6 deg above the true horizon
const tanSun = Math.tan((altDeg * Math.PI) / 180);

report.push(`true horizon at boundary pixel: tan=${tTrue.toFixed(3)} (${((Math.atan(tTrue)*180)/Math.PI).toFixed(1)} deg)`);
report.push(`sun placed at ${altDeg.toFixed(1)} deg (tan=${tanSun.toFixed(3)}): every pixel should be LIT`);

const out = run(altDeg);

// Scan inward from the boundary and find how far the spurious band runs.
let band = 0;
const row = 32;
for (let d = 0; d < 32; d++) {
  const cx = W - 1 - d;
  if (trueTan(cx) > tanSun) break;          // genuinely shadowed, not our business
  if (out[row * W + cx] > 0.5) band = d + 1; else break;
}
report.push(`spurious shadow band inside the boundary: ${band} px`);

// Budget is ZERO at every ring resolution, which is what the
// cell-centre deposit actually achieves on this terrain.
//
// History, because the budgets here were once wrong. A deposit that
// placed the cell MEAN at the cell's NEAR EDGE was tried, to stop
// shadows falling half a cell short; it produced 2 px and 8 px bands
// here. A minmod-limited reconstruction (mean at the centre plus a
// prorated value at the near edge) cut those to 1 px and 5 px, and the
// budgets in this file were set to those numbers, which made a
// regression look like a pass. Measured on real seams, that
// reconstruction was 34% WORSE than the plain centre deposit
// (0.168 -> 0.226 mean step over ten seams at a 3.8 deg sun), so it
// was reverted. The centre deposit scores 0 px here and wins there.
//
// So: any non-zero band means the near-edge family has been
// reintroduced. See PREWARM-FINDINGS.md.
const BAND_BUDGET = { 2: 0, 4: 0, 8: 0, 16: 0, 32: 0 };
if (band > BAND_BUDGET[S]) {
  failures++;
  report.push(`  FAIL: band ${band} px exceeds the ${BAND_BUDGET[S]} px budget at parentScale ${S}`);
}

// No pixel may be SATURATED by the warmup where the continuous terrain
// leaves it lit. A reconstruction error shades a pixel partially; a
// relocated mean asserts a near-vertical horizon and pins it at 1.
let saturated = 0;
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (trueTan(c) <= tanSun && out[r * W + c] >= 0.999) saturated++;
}
report.push(`fully-saturated false shadow pixels: ${saturated} / ${W * H}`);
if (saturated > W) {   // one boundary column's worth is the residual above
  failures++;
  report.push(`  FAIL: the warmup is pinning lit pixels at full shadow`);
}

// The band is a function of parentScale: the deposit is displaced by
// half a cell, so the overstatement is (local slope x halfCell) and
// the band it casts is that over tan(alt). At parentScale 2 it is
// invisible; it is the move off dz=1 that makes it a hard edge.
report.push("");
report.push("band vs parentScale (same continuous terrain, same sun):");
for (const sc of [2, 4, 8, 16, 32]) {
  const hn = Math.floor((PN * (sc + 1)) / sc);
  const mg = (PN * sc) >> 1;
  const of = 0.5 * (1 - 1 / sc);
  const cxi = (i) => sc * (i + of) - mg;
  const ring = new Float32Array(hn * hn);
  for (let i = 0; i < hn; i++) {
    const c = cxi(i);
    let acc = 0;
    for (let k = 0; k < sc; k++) acc += terrain(c - (sc - 1) / 2 + k);
    const mean = acc / sc;
    for (let j = 0; j < hn; j++) ring[j * hn + i] = mean;
  }
  const o = sweepCore({
    W, H, elev, azDeg: 0, altDeg, pxSizeM: PX, mode: "hard",
    horizon: ring, HN: hn, parentScale: sc,
    compElevMin: 0, horizonElevMax: PLATEAU, horizonFloor: false,
  });
  let b = 0;
  for (let d = 0; d < 48; d++) {
    const cx = W - 1 - d;
    if (trueTan(cx) > tanSun) break;
    if (o[row * W + cx] > 0.5) b = d + 1; else break;
  }
  const budget = BAND_BUDGET[sc];
  const mark = b <= budget ? "ok  " : "FAIL";
  if (b > budget) failures++;
  report.push(`  ${mark} parentScale ${String(sc).padStart(2)} (dz ${Math.log2(sc)}): band ${b} px, budget ${budget} px`);
}
report.push("");

// Control: a WALL outside the tile (uniform height) must still cast.
// This is the case verify-warmup-edge.mjs pins; it must keep working.
const wallH = 60;
const wallRing = new Float32Array(HN * HN);
for (let i = 0; i < HN; i++) {
  const c = cxOfIndex(i);
  const v = c > W - 0.5 ? wallH : 0;
  for (let j = 0; j < HN; j++) wallRing[j * HN + i] = v;
}
const wallAlt = 20;                                   // tan ~0.364
const wallOut = sweepCore({
  W, H, elev, azDeg: 0, altDeg: wallAlt, pxSizeM: PX, mode: "hard",
  horizon: wallRing, HN, parentScale: S,
  compElevMin: 0, horizonElevMax: wallH, horizonFloor: false,
});
// Wall stands at cx = W - 0.5; a target at cx is shadowed while
// wallH / ((W - 0.5 - cx) * PX) > tan(alt).
const reach = wallH / Math.tan((wallAlt * Math.PI) / 180) / PX;
const expectEdge = Math.floor(W - 0.5 - 1);
let wallOk = wallOut[row * W + expectEdge] > 0.5;
report.push(`wall control: reach ${reach.toFixed(1)} px, boundary pixel shadowed = ${wallOk}`);
if (!wallOk) { failures++; report.push("  FAIL: wall control regressed"); }

console.log(report.join("\n"));
console.log(failures === 0 ? "\nPASS" : `\nFAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
