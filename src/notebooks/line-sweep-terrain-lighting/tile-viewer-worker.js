// Data-prep worker for tile-viewer.js.
//
// Handles tile fetching, terrarium decoding, and parent horizon
// assembly off the main thread. The main thread keeps all GPU work
// (bake + render) so panning/zooming existing tiles stays smooth.
//
// Protocol:
//   main → worker:  { type: "init", tileUrl, parentDZ, farDZ, boundsDZ }
//   main → worker:  { type: "fetch", z, x, y }
//   main → worker:  { type: "cancel", z, x, y }
//   main → worker:  { type: "ringdz", id, z, x, y, compMin, compMax,
//                     tanMin, minDZ, maxDZ, tileM, minLevel }
//   worker → main:  { type: "tile", z, x, y, comp, horizon, farHorizon }
//   worker → main:  { type: "ringdz", id, dz, provable, visited }
//   worker → main:  { type: "error", z, x, y, message, status }
//                    `status` is the HTTP status when the fetch got a
//                    response, 0 for a network-level failure. The main
//                    thread uses it to tell "this tile does not exist"
//                    from "this tile did not arrive this time".
//                    comp    = { N,  heights (Float32Array), hMin, hMax }
//                    horizon = { HN, heights (Float32Array), hMin, hMax }
//                    A second, finer prewarm ring was tried here and
//                    reverted: it put the tile's eight same-zoom
//                    neighbours in its critical path for a seam it only
//                    narrowed. See PREWARM-FINDINGS.md.
//                    farHorizon = the same shape, assembled at `farDZ`,
//                    or null for a single ring. The sweep walks it from
//                    the outside in and hands over to `horizon` at that
//                    ring's outer edge: see line-sweep-core.js. Reach
//                    and resolution are set by different things and one
//                    ring cannot be both.
//                    Every Float32Array is transferred (zero-copy).
//                    The horizon's (hMin, hMax) bounds the ring's
//                    actual elevations (including zero-fill from
//                    missing parents) and is paired with comp's
//                    (hMin, hMax) by the sweep to trim the warmup.
//                    The "ringdz" exchange answers which parent ring
//                    width is provably enough for a tile at a given
//                    sun angle, by walking the elevation quadtree the
//                    tile pyramid already is. It selects a level; it
//                    does not change how the sweep warms up. See
//                    occluder-quadtree.js.
//
// `parentDZ` controls how many zoom levels up the pyramid the parent-
// horizon window is assembled from. The 2×2 block of parents at
// (z - parentDZ) covers 2^(parentDZ+1) target tiles along each dim,
// so the guaranteed symmetric extract around the target is
// 2^parentDZ + 1 target tiles wide (3 at dz=1, 5 at dz=2, 9 at dz=3)
// and HN = PN * (s+1)/s parent pixels where s = 2^parentDZ. The
// parent-pixel → child-pixel scale is `s`, i.e. one parent pixel
// covers `s` child pixels — see line-sweep-core.js for the matching
// bilinear-sample alignment math.

import { pickRingDZ } from "./occluder-quadtree.js";

// How far up the pyramid the ring query starts. Nine levels above the
// target tile is a 512-tile square, which at z = 14 is most of a
// continent — far enough that the world-beyond-the-root never matters.
const ROOT_LEVEL = 9;

let tileUrl = "";
// The ring that meets the comp tile: fine enough that its cells do not
// step across a tile seam. Chosen for terrain fidelity, not reach.
let parentDZ = 2;
// An optional outer ring, coarser and reaching much further, walked
// before the inner one. 0 means a single ring. Chosen for reach.
let farDZ = 0;
// Zoom delta at which the occluder bound is taken. Coarse on purpose:
// one tile at z - boundsDZ covers 2^boundsDZ children each way, so a
// whole screen of comp tiles shares the same handful of parents and
// the bound costs one fetch per large area, then nothing.
let boundsDZ = 4;
// key -> max elevation, for the bound only.
const boundsCache = new Map();

function buildUrl(z, x, y) {
  return tileUrl.replace("{z}", z).replace("{x}", x).replace("{y}", y);
}

// ------------------------------------------------------------------
// Fetch cache with reference counting and AbortController support.
//
// Each unique z/x/y key maps to { promise, controller, refs }.
// `refs` counts how many in-flight tile requests depend on this
// image (either as their own tile or as a parent). When refs drops
// to 0 the fetch is aborted and removed from the cache.
// ------------------------------------------------------------------
const cache = new Map(); // key -> { promise, controller, refs }

function refKey(z, x, y) {
  return `${z}/${x}/${y}`;
}

function acquireFetch(z, x, y) {
  const key = refKey(z, x, y);
  let entry = cache.get(key);
  if (entry) {
    entry.refs++;
    return entry.promise;
  }
  const controller = new AbortController();
  const promise = fetchTerrarium(buildUrl(z, x, y), controller.signal);
  // On failure, remove from cache so a retry can start fresh.
  promise.catch(() => cache.delete(key));
  entry = { promise, controller, refs: 1 };
  cache.set(key, entry);
  return promise;
}

function releaseFetch(z, x, y) {
  const key = refKey(z, x, y);
  const entry = cache.get(key);
  if (!entry) return;
  entry.refs--;
  if (entry.refs <= 0) {
    entry.controller.abort();
    cache.delete(key);
  }
}

async function fetchTerrarium(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const err = new Error(`tile fetch failed: ${url} (${res.status})`);
    err.status = res.status;
    throw err;
  }
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const N = bitmap.width;
  const c = new OffscreenCanvas(N, N);
  const ctx = c.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const bytes = ctx.getImageData(0, 0, N, N).data;
  const heights = new Float32Array(N * N);
  let hMin = Infinity;
  let hMax = -Infinity;
  for (let i = 0; i < N * N; i++) {
    const r = bytes[i * 4];
    const g = bytes[i * 4 + 1];
    const b = bytes[i * 4 + 2];
    const h = r * 256 + g + b / 256 - 32768;
    heights[i] = h;
    if (h < hMin) hMin = h;
    if (h > hMax) hMax = h;
  }
  return { N, heights, hMin, hMax };
}

// ------------------------------------------------------------------
// Parent horizon assembly
// ------------------------------------------------------------------

// Returns the set of parent tile keys needed for a given tile.
// `qx = floor((x - s/2) / s)` places the target tile in the middle half
// of the 2×2 parent block (slots [s/2, 3s/2-1]), keeping at least s/2
// child tiles of margin on whichever side is "short" — that's the
// worst-case symmetric window of s+1 child tiles around the target.
function parentKeys(z, x, y, dz) {
  const parentZ = z - dz;
  if (parentZ < 0) return [];
  const s = 1 << dz;
  const qx = Math.floor((x - s / 2) / s);
  const qy = Math.floor((y - s / 2) / s);
  const nParent = 1 << parentZ;
  const keys = [];
  for (const [px, py] of [[qx, qy], [qx + 1, qy], [qx, qy + 1], [qx + 1, qy + 1]]) {
    if (px >= 0 && px < nParent && py >= 0 && py < nParent) {
      keys.push([parentZ, px, py]);
    }
  }
  return keys;
}

// Every parent tile either ring needs, deduped. At farDZ 0 (or equal
// to parentDZ) this is just the inner ring's parents.
function allRingKeys(z, x, y) {
  const seen = new Set();
  const keys = [];
  const levels = farDZ > 0 && farDZ !== parentDZ ? [parentDZ, farDZ] : [parentDZ];
  for (const dz of levels) {
    for (const k of parentKeys(z, x, y, dz)) {
      const id = k.join("/");
      if (seen.has(id)) continue;
      seen.add(id);
      keys.push(k);
    }
  }
  return keys;
}

function acquireAll(z, x, y) {
  // Acquire the tile itself + all parents either ring needs.
  acquireFetch(z, x, y);
  for (const [pz, px, py] of allRingKeys(z, x, y)) {
    acquireFetch(pz, px, py);
  }
}

function releaseAll(z, x, y) {
  releaseFetch(z, x, y);
  for (const [pz, px, py] of allRingKeys(z, x, y)) {
    releaseFetch(pz, px, py);
  }
}

// Bounds of one quadtree node, as the ring query wants them.
//
// A node at level L over the target tile grid is exactly the tile at
// zoom z - L: the pyramid already is the quadtree, so there is nothing
// to build. Bounds come off the decode, which scans every pixel
// anyway, and are cached per tile so a query that revisits a node
// costs nothing.
function nodeBoundsFor(z) {
  return (L, nx, ny) => {
    const bz = z - L;
    if (bz < 0) return null;
    const n = 1 << bz;
    if (nx < 0 || ny < 0 || nx >= n || ny >= n) return null;
    const key = `n${bz}/${nx}/${ny}`;
    const hit = boundsCache.get(key);
    if (hit !== undefined) return hit;
    acquireFetch(bz, nx, ny);
    return (cache.get(refKey(bz, nx, ny))?.promise || Promise.resolve(null))
      .catch(() => null)
      .then((t) => {
        releaseFetch(bz, nx, ny);
        const v = t ? { hMin: t.hMin, hMax: t.hMax } : null;
        boundsCache.set(key, v);
        return v;
      });
  };
}

function assembleParentHorizon(z, x, y, dz) {
  const parentZ = z - dz;
  if (parentZ < 0) {
    return Promise.resolve({ HN: 0, heights: new Float32Array(0) });
  }
  const s = 1 << dz;
  const qx = Math.floor((x - s / 2) / s);
  const qy = Math.floor((y - s / 2) / s);
  const nParent = 1 << parentZ;

  // acquireFetch was already called by acquireAll above, so we just
  // pull the existing promises out of the cache rather than bumping
  // the refcount again. Missing parents (off-map) resolve to null
  // and get zero-filled at assembly time.
  const getParent = (px, py) =>
    px < 0 || px >= nParent || py < 0 || py >= nParent
      ? Promise.resolve(null)
      : (cache.get(refKey(parentZ, px, py))?.promise || Promise.resolve(null)).catch(() => null);

  return Promise.all([
    getParent(qx, qy),
    getParent(qx + 1, qy),
    getParent(qx, qy + 1),
    getParent(qx + 1, qy + 1),
  ]).then(([p00, p10, p01, p11]) => {
    const ref = p00 || p10 || p01 || p11;
    const PN = ref ? ref.N : 512;
    const BN = 2 * PN;
    const zeroTile = new Float32Array(PN * PN);
    const block = new Float32Array(BN * BN);
    const place = (p, bx, by) => {
      const ox = bx * PN;
      const oy = by * PN;
      const h = p ? p.heights : zeroTile;
      for (let j = 0; j < PN; j++) {
        const src = j * PN;
        const dst = (oy + j) * BN + ox;
        block.set(h.subarray(src, src + PN), dst);
      }
    };
    place(p00, 0, 0);
    place(p10, 1, 0);
    place(p01, 0, 1);
    place(p11, 1, 1);

    // One parent tile covers `s` child tiles along each dim, so a
    // child tile is `PN / s` parent pixels wide. The target tile
    // always sits at slot `x - s*qx ∈ [s/2, 3s/2 - 1]` in the
    // `0..2s-1` block, and we extract a symmetric `(s+1)` child-tile
    // window around it. Window start is `PN/2` parent pixels
    // (= s/2 child tiles) before the target's left edge, which is
    // always inside the block (even at the most eccentric target
    // position).
    const HN = Math.floor((PN * (s + 1)) / s);
    const compTileXInBlock = (x - s * qx) * (PN / s);
    const compTileYInBlock = (y - s * qy) * (PN / s);
    const startX = compTileXInBlock - PN / 2;
    const startY = compTileYInBlock - PN / 2;
    const heights = new Float32Array(HN * HN);
    // Track the min/max over the *extracted* window (not the block
    // or the full parents) — these feed sweepCore's warmup-range
    // trim, so the bound needs to match exactly what the warmup
    // sees. Zero-fill from missing parents participates, which is
    // correct: a zeroed-out ocean quadrant is a legitimately low
    // "blocker" and the trim bound should include it.
    let hMin = Infinity;
    let hMax = -Infinity;
    for (let j = 0; j < HN; j++) {
      const srcRow = (startY + j) * BN + startX;
      const dstRow = j * HN;
      for (let i = 0; i < HN; i++) {
        const v = block[srcRow + i];
        heights[dstRow + i] = v;
        if (v < hMin) hMin = v;
        if (v > hMax) hMax = v;
      }
    }
    if (!isFinite(hMin)) { hMin = 0; hMax = 0; }
    return { HN, heights, hMin, hMax };
  });
}

// Track in-flight fetch requests so we can cancel them.
const inFlight = new Set(); // "z/x/y"

self.onmessage = (e) => {
  const msg = e.data;
  switch (msg.type) {
    case "init":
      tileUrl = msg.tileUrl;
      if (Number.isFinite(msg.parentDZ) && msg.parentDZ >= 1) {
        parentDZ = msg.parentDZ | 0;
      }
      if (Number.isFinite(msg.farDZ) && msg.farDZ >= 0) {
        farDZ = msg.farDZ | 0;
      }
      if (Number.isFinite(msg.boundsDZ) && msg.boundsDZ >= 1) {
        boundsDZ = msg.boundsDZ | 0;
      }
      break;

    case "fetch": {
      const { z, x, y } = msg;
      const key = refKey(z, x, y);
      inFlight.add(key);
      acquireAll(z, x, y);
      const wantFar = farDZ > 0 && farDZ !== parentDZ;
      Promise.all([
        cache.get(key)?.promise,
        assembleParentHorizon(z, x, y, parentDZ),
        wantFar ? assembleParentHorizon(z, x, y, farDZ) : null,
      ]).then(([comp, horizon, farHorizon]) => {
        if (!inFlight.has(key)) return; // cancelled
        inFlight.delete(key);
        // Clone heights so we can transfer without invalidating the cache.
        const compHeights = new Float32Array(comp.heights);
        const horizonHeights = new Float32Array(horizon.heights);
        const transfer = [compHeights.buffer, horizonHeights.buffer];
        let farOut = null;
        if (farHorizon && farHorizon.HN > 0) {
          const farHeights = new Float32Array(farHorizon.heights);
          transfer.push(farHeights.buffer);
          farOut = {
            HN: farHorizon.HN, heights: farHeights,
            hMin: farHorizon.hMin, hMax: farHorizon.hMax,
            parentDZ: farDZ,
          };
        }
        self.postMessage(
          {
            type: "tile",
            z, x, y,
            comp: { N: comp.N, heights: compHeights, hMin: comp.hMin, hMax: comp.hMax },
            horizon: { HN: horizon.HN, heights: horizonHeights, hMin: horizon.hMin, hMax: horizon.hMax },
            farHorizon: farOut,
          },
          transfer,
        );
      }).catch((err) => {
        if (!inFlight.has(key)) return; // cancelled
        inFlight.delete(key);
        self.postMessage({
          type: "error", z, x, y,
          message: err.message,
          status: err.status | 0,
        });
      });
      break;
    }

    case "ringdz": {
      // Which ring width is provably enough for this tile at this sun.
      // Pure selection: nothing here changes how the sweep warms up,
      // only which single level it warms up from.
      const { id, z, x, y, compMin, compMax, tanMin, minDZ, maxDZ, tileM, minLevel } = msg;
      pickRingDZ({
        minDZ, maxDZ,
        radiusOf: (dz) => tileM * Math.pow(2, dz - 1),
        tanMin, compMin, compMax,
        rootLevel: Math.min(ROOT_LEVEL, z),
        minLevel: minLevel ?? 0,
        tileM, tx: x, ty: y,
        getBounds: nodeBoundsFor(z),
      }).then((r) => {
        self.postMessage({ type: "ringdz", id, dz: r.dz, provable: r.provable, visited: r.visited, ladder: r.ladder });
      }).catch(() => {
        // No answer is not a crash: the caller keeps what it has.
        self.postMessage({ type: "ringdz", id, dz: null });
      });
      break;
    }

    case "cancel": {
      const { z, x, y } = msg;
      const key = refKey(z, x, y);
      if (inFlight.has(key)) {
        inFlight.delete(key);
        releaseAll(z, x, y);
      }
      break;
    }
  }
};
