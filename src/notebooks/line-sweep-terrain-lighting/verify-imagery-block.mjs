// Gate for the imagery block merge.
//
// The viewer fetches satellite imagery on the elevation tile grid. A
// single 256x256 image per tile is half the terrain raster's 512, so
// it is magnified in the composite; the merge instead takes the 2x2
// block one level deeper and copies each image into its own quadrant
// of one 512x512 texture, matching the raster exactly.
//
// That is only worth four requests while the source still has detail
// to give. Sentinel-2's true-colour bands are 10 m, so below about
// 10 m per pixel the s2cloudless pyramid is upsampling its own coarser
// levels. Measured against a bilinear 2x upsample of the level above,
// per level, at the notebook's centre:
//
//   z13  15.0 m/px   26.1 dB   real detail
//   z14   7.5 m/px   31.7 dB   real detail
//   z15   3.8 m/px   45.2 dB   nothing new
//   z16   1.9 m/px   44.8 dB   nothing new
//
// NYC breaks at the same level; near Denali, where the Mercator cosine
// makes z13 already 8.6 m, it breaks a level earlier. The fixtures
// below are those measurements. `imageryBlockSplit` has to agree with
// them: merge where the source still resolves something, and fall back
// to the single image where it does not.
//
//   node src/notebooks/line-sweep-terrain-lighting/verify-imagery-block.mjs
//   node .../verify-imagery-block.mjs --legacy   (merge off: one image per tile)

import { imageryBlockSplit } from "./tile-viewer.js";

const legacy = process.argv.includes("--legacy");

const TILE_PX = 256;        // the source's own tile size
const NATIVE_RES_M = legacy ? 0 : 10;  // Sentinel-2 true-colour bands
const RASTER_PX = 512;      // the terrain raster per tile
const EARTH_CIRCUMFERENCE_M = 40075016.685578488;

const tileRow = (lat, z) => {
  const r = lat * Math.PI / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z),
  );
};

// Ground resolution of one texel, for a tile of N texels at row y.
const resM = (z, y, N) => {
  const n = Math.pow(2, z) * N;
  const merc = Math.PI * (1 - (2 * (y * N + N / 2)) / n);
  return (EARTH_CIRCUMFERENCE_M * Math.cos(Math.atan(Math.sinh(merc)))) / n;
};

// Deepest zoom at which the source still has detail the tile's own
// level does not resolve, measured per site. Split is expected at and
// below this zoom, and not above it.
const SITES = [
  { name: "notebook centre", lat: 38.2371, lastSplitZ: 13 },
  { name: "new york",        lat: 40.7100, lastSplitZ: 13 },
  { name: "alps",            lat: 46.5500, lastSplitZ: 13 },
  { name: "denali",          lat: 63.0700, lastSplitZ: 12 },
];

const ZOOMS = [10, 11, 12, 13, 14, 15, 16];

console.log(
  legacy
    ? "merge OFF (legacy): one image per tile at every zoom"
    : `merge ON: 2x2 block while the source's level is coarser than ${NATIVE_RES_M} m`,
);
console.log("");

const rows = [];
for (const site of SITES) {
  console.log(`  ${site.name} (lat ${site.lat.toFixed(2)})`);
  console.log("     z   source m/px   merged m/px   images/tile   split");
  for (const z of ZOOMS) {
    const y = tileRow(site.lat, z);
    const split = imageryBlockSplit(z, y, TILE_PX, NATIVE_RES_M);
    const srcRes = resM(z, y, TILE_PX);
    const mergedRes = resM(z, y, TILE_PX * 2);
    rows.push({ site, z, y, split, srcRes, mergedRes });
    console.log(
      `  ${String(z).padStart(4)}   ${srcRes.toFixed(2).padStart(11)}   ` +
      `${mergedRes.toFixed(2).padStart(11)}   ${String(split ? 4 : 1).padStart(11)}   ` +
      `${split ? "yes" : "no"}`,
    );
  }
  console.log("");
}

let failures = 0;
const fail = (m) => { console.log(`FAIL  ${m}`); failures++; };
const pass = (m) => console.log(`ok    ${m}`);

// 1. The merge is taken exactly where the measurements say the source
//    still carries detail, and nowhere else.
const wrong = rows.filter((r) => r.split !== (r.z <= r.site.lastSplitZ));
if (wrong.length) {
  for (const r of wrong) {
    console.log(
      `      ${r.site.name} z${r.z}: split=${r.split}, expected ${r.z <= r.site.lastSplitZ}`,
    );
  }
  fail(`${wrong.length} of ${rows.length} levels disagree with the measured detail ceiling`);
} else {
  pass("the merge is taken exactly where the source still has detail");
}

// 2. Where it is taken, the merged texture matches the terrain raster:
//    2 x 256 texels over the same extent, to the metre.
const mismatched = rows.filter(
  (r) => r.split && Math.abs(r.mergedRes - resM(r.z, r.y, RASTER_PX)) > 1e-9,
);
if (mismatched.length) {
  fail(`${mismatched.length} merged tiles do not land on the terrain raster`);
} else {
  pass("merged imagery resolves the terrain raster one for one");
}

// 3. Where it is not taken, the block it would have fetched is finer
//    than the source resolves, so the three extra requests really
//    would buy nothing. (Vacuous under --legacy, which is the point:
//    nothing splits, so check 1 is what discriminates.)
const wasteful = rows.filter((r) => !r.split && r.srcRes > NATIVE_RES_M && NATIVE_RES_M > 0);
if (wasteful.length) {
  fail(`${wasteful.length} levels skip the merge while the source is still coarse`);
} else {
  pass("every skipped merge is one the source could not have filled");
}

// 4. One flip per site, downward: never split at a deep zoom and not
//    at a shallow one, which would re-fetch imagery on the way out.
let monotone = true;
for (const site of SITES) {
  const seq = rows.filter((r) => r.site === site).map((r) => r.split);
  for (let i = 1; i < seq.length; i++) if (!seq[i - 1] && seq[i]) monotone = false;
}
if (!monotone) fail("the merge decision is not monotone in zoom");
else pass("the merge turns off once, on the way in, and stays off");

console.log("");
console.log(failures === 0 ? "PASS" : `FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
