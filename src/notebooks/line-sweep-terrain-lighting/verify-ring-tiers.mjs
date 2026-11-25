// Gate: the nested two-tier prewarm buys reach without giving up the
// structure that meets the tile boundary.
//
// Reach and resolution are set by different things. Reach comes from
// the shallowest sun that still casts; fidelity comes from the terrain
// against the boundary, where a cell's box mean is asserted a pixel or
// two from the targets that read it. One ring cannot be both, and the
// symptom of asking it to be is a STEP ACROSS THE SEAM between two
// tiles' bakes: both describe the same physical ground there, so any
// difference is an artifact and no ground truth is needed to see it.
//
// That is what this figure measures, deliberately. The gates that
// measured a single tile against a wall are what let two earlier
// attempts look like improvements while making real seams worse. See
// PREWARM-FINDINGS.md.
//
// The mechanism the seam test exploits: for a target in tile L just
// left of the seam, the ground just right of it is OUTSIDE L and is
// read from L's ring. For a target in tile R just right of the seam,
// that same ground is INSIDE R and is read from R's own elevation at
// full resolution. So the step across the seam is exactly
// ring-quality against exact, which is the artifact.
//
// The world is one continuous 1-D profile. Each tile builds its own
// rings from it, box-averaged at that ring's scale and offset to that
// tile, exactly as the worker does, so the per-tile disagreement
// arises on its own rather than being modelled. Terrain is constant in
// y, so every row is identical and one row is the whole answer.

import { sweepCore } from "../../lib/line-sweep-core.js";

const W = 64, H = 64;
const PN = W;
const PX = 10;                 // metres per child pixel
const S_FINE = 2;              // the ring that meets the tile
const S_COARSE = 16;           // the ring that supplies distance
const ROW = 32;

const T_LEFT = 2;
const SEAM = (T_LEFT + 1) * W; // global child pixel of the seam

// A world is a continuous profile plus the per-tile rings and
// elevation built from it. `nearRidge` puts small structure against
// the seam; `farRidge` puts a tall one out past any fine ring's reach.
// They are never both on: the near ridge's horizon would mask the far
// one and the reach check would be vacuous.
function makeWorld({ nearRidgeM = 0, farRidgeM = 0 }) {
  const BENCH_END = SEAM + 8;
  const RIDGE_TOP = SEAM + 20;
  const RIDGE_END = SEAM + 28;
  const FAR_START = SEAM + 300;
  const FAR_END = SEAM + 340;

  const terrain = (X) => {
    if (farRidgeM && X >= FAR_START && X < FAR_END) return farRidgeM;
    if (!nearRidgeM || X < SEAM) return 0;
    if (X < BENCH_END) return 0;                       // bench at the seam
    if (X < RIDGE_TOP) {
      return (nearRidgeM * (X - BENCH_END)) / (RIDGE_TOP - BENCH_END);
    }
    if (X < RIDGE_END) return nearRidgeM;
    return 0;
  };

  const trueTan = (X0) => {
    let best = 0;
    for (let X = X0 + 0.5; X <= FAR_END + 10; X += 0.5) {
      const t = terrain(X) / ((X - X0) * PX);
      if (t > best) best = t;
    }
    return best;
  };

  const ringFor = (tile, s) => {
    const HN = Math.floor((PN * (s + 1)) / s);
    const margin = (PN * s) >> 1;
    const ring = new Float32Array(HN * HN);
    for (let i = 0; i < HN; i++) {
      let acc = 0;
      for (let a = 0; a < s; a++) acc += terrain(tile * W + s * i - margin + a);
      const mean = acc / s;
      for (let j = 0; j < HN; j++) ring[j * HN + i] = mean;
    }
    return { ring, HN, margin };
  };

  const elevFor = (tile) => {
    const e = new Float32Array(W * H);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) e[j * W + i] = terrain(tile * W + i);
    }
    return e;
  };

  const configs = {
    "fine only": (tile) => {
      const f = ringFor(tile, S_FINE);
      return { horizon: f.ring, HN: f.HN, parentScale: S_FINE };
    },
    "coarse only": (tile) => {
      const c = ringFor(tile, S_COARSE);
      return { horizon: c.ring, HN: c.HN, parentScale: S_COARSE };
    },
    "two tiers": (tile) => {
      const f = ringFor(tile, S_FINE);
      const c = ringFor(tile, S_COARSE);
      return {
        horizon: f.ring, HN: f.HN, parentScale: S_FINE,
        farHorizon: c.ring, farHN: c.HN, farParentScale: S_COARSE,
        farHorizonPN: PN,
      };
    },
  };

  const elevMax = Math.max(nearRidgeM, farRidgeM, 1);
  const shadowFor = (tile, name, altDeg) => sweepCore({
    W, H, elev: elevFor(tile),
    azDeg: 0, altDeg, pxSizeM: PX, mode: "hard",
    compElevMin: 0,
    // The reach bound must cover BOTH rings: a finer ring resolves
    // peaks that averaging flattens, so its maximum is the higher of
    // the two and it is what sets how far the march runs.
    horizonElevMax: elevMax,
    horizonFloor: false,
    ...configs[tile === undefined ? name : name](tile),
  });

  return { terrain, trueTan, configs, shadowFor, elevMax };
}

let failures = 0;
const report = [];
const fail = (m) => { failures++; report.push(`  FAIL: ${m}`); };
const at = (s, i) => s[ROW * W + i];
const NAMES = ["fine only", "coarse only", "two tiers"];

// ---- 1. the seam ----------------------------------------------------
//
// Small structure against the seam and no distant ridge. The sun sits
// just below the horizon that structure truly subtends, so tile R,
// reading it as its own elevation, shadows its first column. Whether
// tile L agrees depends entirely on what its ring says about the same
// ground.
report.push("1. seam step, structure against the boundary");
{
  const world = makeWorld({ nearRidgeM: 12 });
  const tTrue = world.trueTan(SEAM - 1);
  const tanSun = 0.95 * tTrue;
  const altDeg = (Math.atan(tanSun) * 180) / Math.PI;
  report.push(`   true horizon at the seam pixel tan ${tTrue.toFixed(4)}; sun tan ${tanSun.toFixed(4)} (${altDeg.toFixed(2)} deg), just below it`);

  const steps = {};
  for (const name of NAMES) {
    const L = world.shadowFor(T_LEFT, name, altDeg);
    const R = world.shadowFor(T_LEFT + 1, name, altDeg);
    const step = Math.abs(at(L, W - 1) - at(R, 0));
    const interior = Math.abs(at(L, W - 2) - at(L, W - 1));
    steps[name] = step;
    report.push(`   ${name.padEnd(12)} L edge ${at(L, W - 1).toFixed(3)}  R edge ${at(R, 0).toFixed(3)}  seam step ${step.toFixed(4)}  interior ${interior.toFixed(4)}`);
  }
  // The coarse ring has to be visibly wrong here, or the figure is not
  // exercising the defect and the rest of the check means nothing.
  if (!(steps["coarse only"] > 0.25)) {
    fail(`coarse only only steps ${steps["coarse only"].toFixed(4)}; the figure is not exercising the defect`);
  }
  // Adding reach outside the fine ring must not disturb the boundary.
  if (steps["two tiers"] > steps["fine only"] + 1e-6) {
    fail(`two tiers (${steps["two tiers"].toFixed(4)}) is worse at the seam than fine only (${steps["fine only"].toFixed(4)})`);
  }
  if (!(steps["two tiers"] < steps["coarse only"] - 1e-6)) {
    fail(`two tiers (${steps["two tiers"].toFixed(4)}) is no better than coarse only (${steps["coarse only"].toFixed(4)})`);
  }
}

// ---- 2. reach -------------------------------------------------------
//
// A tall ridge 300 px past the seam and nothing near it. The fine ring
// reaches (PN*S_FINE)/2 = 64 px and cannot see it; the whole point of
// the coarse tier is that the nested march can.
report.push("");
report.push("2. the distant ridge still casts");
{
  const world = makeWorld({ farRidgeM: 600 });
  const tTrue = world.trueTan(SEAM - 1);
  const tanSun = 0.8 * tTrue;
  const altDeg = (Math.atan(tanSun) * 180) / Math.PI;
  report.push(`   ridge horizon at the seam pixel tan ${tTrue.toFixed(4)}; sun tan ${tanSun.toFixed(4)} (${altDeg.toFixed(2)} deg), below it`);

  const lit = {};
  for (const name of NAMES) {
    const L = world.shadowFor(T_LEFT, name, altDeg);
    lit[name] = at(L, W - 1);
    report.push(`   ${name.padEnd(12)} shadow at the seam pixel ${lit[name].toFixed(3)}`);
  }
  if (!(lit["fine only"] < 0.5)) {
    fail("fine only already sees the distant ridge; the figure is not exercising reach");
  }
  if (!(lit["coarse only"] > 0.5)) {
    fail("coarse only misses the distant ridge; the figure's geometry is wrong");
  }
  if (!(lit["two tiers"] > 0.5)) {
    fail(`two tiers misses the distant ridge (shadow ${lit["two tiers"].toFixed(3)})`);
  }
}

// ---- 3. the reach bound must cover BOTH rings -----------------------
//
// `horizonElevMax` is what sets how far the march runs. The outer ring
// is the one that knows about the distant peak; an inner ring at dz 2
// spans two tiles, so its own maximum is some nearby rise and a bound
// taken from it stops the march long before anything that could
// actually reach the tile.
//
// This is not hypothetical. Passing the inner ring's own hMax from the
// viewer's fresh-bake path made a newly fetched tile lose every distant
// shadow while a shadow rebake of the same tile kept them, so dragging
// the sun and panning the camera disagreed. Decimation makes it worse
// in the other direction too: the finer ring resolves peaks the coarse
// one flattens, so neither ring's maximum alone is the bound.
report.push("");
report.push("3. the reach bound must be taken over both rings");
{
  const world = makeWorld({ farRidgeM: 600 });
  const tTrue = world.trueTan(SEAM - 1);
  const tanSun = 0.8 * tTrue;
  const altDeg = (Math.atan(tanSun) * 180) / Math.PI;

  // The inner ring sees only flat ground out to its own reach, so its
  // maximum is 0 and a bound from it collapses the march entirely.
  const innerOnlyBound = 0;
  const bothRingsBound = 600;
  const shade = (elevMax) => {
    const out = sweepCore({
      W, H, elev: (() => {
        const e = new Float32Array(W * H);
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) e[j * W + i] = 0;
        return e;
      })(),
      azDeg: 0, altDeg, pxSizeM: PX, mode: "hard",
      compElevMin: 0, horizonElevMax: elevMax, horizonFloor: false,
      ...world.configs["two tiers"](T_LEFT),
    });
    return at(out, W - 1);
  };
  const withInner = shade(innerOnlyBound);
  const withBoth = shade(bothRingsBound);
  report.push(`   bound from the inner ring alone (${innerOnlyBound} m): shadow ${withInner.toFixed(3)}`);
  report.push(`   bound over both rings (${bothRingsBound} m):           shadow ${withBoth.toFixed(3)}`);
  if (!(withBoth > 0.5)) {
    fail("the correct bound still misses the ridge; the figure is wrong");
  }
  if (!(withInner < 0.5)) {
    fail("the inner-ring-only bound does not lose the ridge, so this check cannot catch the regression");
  }
}

// ---- 4. the march trim ----------------------------------------------
//
// A coarse ring reaching 512 px is only affordable because the
// elevation bound usually keeps the march far shorter. With the sun
// high enough that nothing can reach the tile, the walk must collapse
// and the tile must come out fully lit.
report.push("");
report.push("4. the elevation trim still shortens the march");
{
  const world = makeWorld({ farRidgeM: 600 });
  const out = world.shadowFor(T_LEFT, "two tiers", 60);
  let worst = 0;
  for (let i = 0; i < W * H; i++) if (out[i] > worst) worst = out[i];
  report.push(`   sun 60 deg: worst shadow anywhere on the tile ${worst.toFixed(3)}`);
  if (worst > 0.001) fail(`a 60 deg sun leaves shadow on the tile (${worst.toFixed(3)})`);
}

console.log(report.join("\n"));
console.log(failures === 0 ? "\nPASS" : `\nFAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
