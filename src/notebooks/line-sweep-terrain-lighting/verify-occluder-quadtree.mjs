// Gate: the quadtree picks the ring width correctly and cheaply.
//
// The structure answers one question — is a ring of radius R wide
// enough that nothing outside it can cast onto this tile — and it
// answers it by bounds alone, never by looking at terrain. What is
// checked here is that the answer is the right one, that it errs the
// safe way when it errs, and that the walk is cheap.
//
// Brute force is available because the terrain is synthetic: every
// tile's true maximum is known, so the true answer is "does any tile
// outside R stand high enough to reach the lowest ground in the target
// tile". The quadtree has to agree with that, using only node bounds.
//
// What is gated:
//   1. the query agrees with brute force on every case swept;
//   2. where it cannot be exact it is conservative — it never calls a
//      ring sufficient when a blocker lies outside it;
//   3. the prunes do the work: the walk touches a small fraction of
//      the nodes a flat scan would;
//   4. the selected dz is monotone in the sun, widening as it drops;
//   5. a sun on the horizon is reported as unprovable rather than
//      silently capped.
//
//   node src/notebooks/line-sweep-terrain-lighting/verify-occluder-quadtree.mjs
//   node .../verify-occluder-quadtree.mjs --table

import { ringIsSufficient, pickRingDZ } from "./occluder-quadtree.js";
import { shadowTanMin } from "./lib/line-sweep-core.js";

const showTable = process.argv.includes("--table");

// A world of WORLD x WORLD target tiles, each with one elevation
// extreme. Tile size is z=14-ish.
const WORLD_BITS = 7;             // 128 x 128 tiles
const WORLD = 1 << WORLD_BITS;
const TILE_M = 1694;
const ROOT_LEVEL = WORLD_BITS;

function makeWorld(seed) {
  let st = seed;
  const rnd = () => (st = (st * 1664525 + 1013904223) >>> 0) / 4294967296;
  const hi = new Float32Array(WORLD * WORLD);
  const lo = new Float32Array(WORLD * WORLD);
  // A few broad massifs plus noise, so there is real structure for the
  // prunes to exploit rather than uniform hash.
  const peaks = [];
  for (let i = 0; i < 6; i++) {
    peaks.push({
      x: rnd() * WORLD, y: rnd() * WORLD,
      h: 1200 + rnd() * 3200, r: 4 + rnd() * 14,
    });
  }
  for (let y = 0; y < WORLD; y++) {
    for (let x = 0; x < WORLD; x++) {
      let h = 150 + rnd() * 350;
      for (const p of peaks) {
        const d = Math.hypot(x - p.x, y - p.y);
        h = Math.max(h, p.h * Math.exp(-(d * d) / (2 * p.r * p.r)));
      }
      hi[y * WORLD + x] = h;
      lo[y * WORLD + x] = h * (0.55 + 0.3 * rnd());
    }
  }
  return { hi, lo };
}

// The pyramid of bounds: level 0 is one target tile, level L is a
// 2^L square. Built once, exactly as a tile pyramid would give it.
function buildPyramid(w) {
  const levels = [{ n: WORLD, hi: w.hi, lo: w.lo }];
  for (let L = 1; L <= ROOT_LEVEL; L++) {
    const prev = levels[L - 1];
    const n = prev.n >> 1;
    const hi = new Float32Array(n * n);
    const lo = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let H = -Infinity, L0 = Infinity;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const i = (2 * y + dy) * prev.n + (2 * x + dx);
            if (prev.hi[i] > H) H = prev.hi[i];
            if (prev.lo[i] < L0) L0 = prev.lo[i];
          }
        }
        hi[y * n + x] = H;
        lo[y * n + x] = L0;
      }
    }
    levels.push({ n, hi, lo });
  }
  return levels;
}

const world = makeWorld(4242);
const pyr = buildPyramid(world);
let nodeReads = 0;
const getBounds = (L, nx, ny) => {
  if (L < 0 || L > ROOT_LEVEL) return null;
  const lv = pyr[L];
  if (nx < 0 || ny < 0 || nx >= lv.n || ny >= lv.n) return null;
  nodeReads++;
  return { hMin: lv.lo[ny * lv.n + nx], hMax: lv.hi[ny * lv.n + nx] };
};

// Brute force: scan every target tile outside the radius.
function bruteSufficient(radiusM, tanMin, compMin, tx, ty) {
  for (let y = 0; y < WORLD; y++) {
    for (let x = 0; x < WORLD; x++) {
      const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
      const dF = Math.hypot(dx, dy) * TILE_M;
      if (dF <= radiusM) continue;            // inside the ring
      const dN = dF;                          // a tile is a point here
      if (world.hi[y * WORLD + x] - compMin > tanMin * dN) return false;
    }
  }
  return true;
}

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "FAIL  "}${name}${detail ? `  ${detail}` : ""}`);
};

const TARGETS = [[64, 64], [20, 100], [120, 8], [5, 5]];
const ALTS = [0.5, 1, 2, 3, 5, 8, 15, 30];
const RADII = [1, 2, 4, 8, 16, 32, 64].map((t) => t * TILE_M);

// ---- 1 and 2. agreement with brute force ----------------------------

console.log("\n1. the query agrees with a full scan");
{
  let disagree = 0, unsafe = 0, cases = 0, worstAt = "";
  for (const [tx, ty] of TARGETS) {
    const compMin = world.lo[ty * WORLD + tx];
    const compMax = world.hi[ty * WORLD + tx];
    for (const altDeg of ALTS) {
      const tanMin = Math.tan((altDeg * Math.PI) / 180);
      for (const radiusM of RADII) {
        const q = await ringIsSufficient({
          radiusM, tanMin, compMin, compMax,
          rootLevel: ROOT_LEVEL, minLevel: 0,
          tileM: TILE_M, tx, ty, getBounds,
        });
        const b = bruteSufficient(radiusM, tanMin, compMin, tx, ty);
        cases++;
        if (q.sufficient !== b) {
          disagree++;
          // Calling a ring sufficient when it is not is the dangerous
          // direction; the other way only costs sharpness.
          if (q.sufficient && !b) { unsafe++; worstAt = `tile ${tx},${ty} alt ${altDeg} r ${(radiusM/1000).toFixed(1)}km`; }
        }
      }
    }
  }
  check("never calls a ring sufficient when a blocker lies outside it",
    unsafe === 0, `${unsafe} unsafe of ${cases} cases${worstAt ? ` (${worstAt})` : ""}`);
  check("and agrees with the full scan on all of them",
    disagree === 0, `${disagree} disagreements of ${cases}`);
}

// ---- 3. the prunes do the work --------------------------------------

console.log("\n3. the walk touches a small fraction of the tree");
{
  let worst = 0, at = "";
  for (const [tx, ty] of TARGETS) {
    const compMin = world.lo[ty * WORLD + tx];
    const compMax = world.hi[ty * WORLD + tx];
    for (const altDeg of ALTS) {
      const tanMin = Math.tan((altDeg * Math.PI) / 180);
      const q = await ringIsSufficient({
        radiusM: 4 * TILE_M, tanMin, compMin, compMax,
        rootLevel: ROOT_LEVEL, minLevel: 0,
        tileM: TILE_M, tx, ty, getBounds,
      });
      const frac = q.visited / (WORLD * WORLD);
      if (frac > worst) { worst = frac; at = `tile ${tx},${ty} at ${altDeg} deg`; }
    }
  }
  check("fewer nodes than a tenth of a flat scan, worst case",
    worst < 0.1, `worst ${(worst * 100).toFixed(2)}% of ${WORLD * WORLD} tiles (${at})`);
}

// ---- 4. monotone in the sun -----------------------------------------

console.log("\n4. the ring only widens as the sun drops");
{
  const [tx, ty] = [64, 64];
  const compMin = world.lo[ty * WORLD + tx];
  const compMax = world.hi[ty * WORLD + tx];
  const radiusOf = (dz) => TILE_M * Math.pow(2, dz - 1);
  const picks = [];
  for (const altDeg of [30, 15, 8, 5, 3, 2, 1, 0.5]) {
    const r = await pickRingDZ({
      minDZ: 1, maxDZ: 7, radiusOf,
      tanMin: Math.tan((altDeg * Math.PI) / 180),
      compMin, compMax, rootLevel: ROOT_LEVEL, minLevel: 0,
      tileM: TILE_M, tx, ty, getBounds,
    });
    picks.push({ altDeg, ...r });
  }
  let bad = null;
  for (let i = 1; i < picks.length; i++) {
    if (picks[i].dz < picks[i - 1].dz) {
      bad = `${picks[i - 1].altDeg} deg -> dz${picks[i - 1].dz}, ` +
            `${picks[i].altDeg} deg -> dz${picks[i].dz}`;
    }
  }
  check("never narrows as the altitude falls", bad === null,
    bad || picks.map((p) => `${p.altDeg}:dz${p.dz}`).join("  "));
  if (showTable) {
    console.log("\n  alt    dz   provable   nodes read");
    for (const p of picks) {
      console.log(`  ${String(p.altDeg).padStart(4)}   ${p.dz}   ` +
        `${String(p.provable).padEnd(8)}   ${p.visited}`);
    }
  }
}

// ---- 5. the horizon is reported, not hidden -------------------------

console.log("\n5. a sun on the horizon comes back unprovable");
{
  const [tx, ty] = [64, 64];
  const compMin = world.lo[ty * WORLD + tx];
  const compMax = world.hi[ty * WORLD + tx];
  const r = await pickRingDZ({
    minDZ: 1, maxDZ: 7, radiusOf: (dz) => TILE_M * Math.pow(2, dz - 1),
    tanMin: Math.tan((-0.2 * Math.PI) / 180),
    compMin, compMax, rootLevel: ROOT_LEVEL, minLevel: 0,
    tileM: TILE_M, tx, ty, getBounds,
  });
  check("flagged as not provable rather than passed off as a choice",
    r.provable === false && r.dz === 7, `dz${r.dz}, provable ${r.provable}`);
}

// ---- 6. the sun's disc, not just its centre -------------------------

console.log("\n6. the penumbra bottom sets the angle, not the disc centre");
{
  // The viewer queries with shadowTanMin, the same angle the sweep
  // trims its march at, so the width the ring is given and the
  // distance the march walks into it are answers to one question. A
  // wider disc casts further, so it can only ever ask for more ring.
  const [tx, ty] = [64, 64];
  const compMin = world.lo[ty * WORLD + tx];
  const compMax = world.hi[ty * WORLD + tx];
  const radiusOf = (dz) => TILE_M * Math.pow(2, dz - 1);
  const ask = async (altDeg, sunR) => (await pickRingDZ({
    minDZ: 1, maxDZ: 7, radiusOf,
    tanMin: shadowTanMin(altDeg, sunR),
    compMin, compMax, rootLevel: ROOT_LEVEL, minLevel: 0,
    tileM: TILE_M, tx, ty, getBounds,
  })).dz;
  let bad = null;
  for (const altDeg of [1.5, 3, 5, 10, 20]) {
    const point = await ask(altDeg, 0);
    const disc = await ask(altDeg, 0.46);
    if (disc < point) bad = `${altDeg} deg: disc dz${disc} < point dz${point}`;
  }
  check("a wider disc never selects a sharper ring", bad === null,
    bad || "held at every altitude swept");
}

console.log(failures === 0
  ? "\nAll occluder-quadtree gates pass.\n"
  : `\n${failures} gate(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
