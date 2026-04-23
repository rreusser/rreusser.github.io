// Data-prep worker for tile-viewer.js.
//
// Handles tile fetching, terrarium decoding, and parent horizon
// assembly off the main thread. The main thread keeps all GPU work
// (bake + render) so panning/zooming existing tiles stays smooth.
//
// Protocol:
//   main → worker:  { type: "init", tileUrl, parentDZ }
//   main → worker:  { type: "fetch", z, x, y }
//   main → worker:  { type: "cancel", z, x, y }
//   worker → main:  { type: "tile", z, x, y, comp, horizon }
//   worker → main:  { type: "error", z, x, y, message }
//                    comp    = { N,  heights (Float32Array), hMin, hMax }
//                    horizon = { HN, heights (Float32Array), hMin, hMax }
//                    Both Float32Arrays are transferred (zero-copy).
//                    The horizon's (hMin, hMax) bounds the ring's
//                    actual elevations (including zero-fill from
//                    missing parents) and is paired with comp's
//                    (hMin, hMax) by the sweep to trim the warmup.
//
// `parentDZ` controls how many zoom levels up the pyramid the parent-
// horizon window is assembled from. The 2×2 block of parents at
// (z - parentDZ) covers 2^(parentDZ+1) target tiles along each dim,
// so the guaranteed symmetric extract around the target is
// 2^parentDZ + 1 target tiles wide (3 at dz=1, 5 at dz=2, 9 at dz=3)
// and HN = PN * (s+1)/s parent pixels where s = 2^parentDZ. The
// parent-pixel → child-pixel scale is `s`, i.e. one parent pixel
// covers `s` child pixels — see sweep-core.js for the matching
// bilinear-sample alignment math.

let tileUrl = "";
let parentDZ = 2;

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
  if (!res.ok) throw new Error(`tile fetch failed: ${url} (${res.status})`);
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
function parentKeys(z, x, y) {
  const parentZ = z - parentDZ;
  if (parentZ < 0) return [];
  const s = 1 << parentDZ;
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

function acquireAll(z, x, y) {
  // Acquire the tile itself + all parents.
  acquireFetch(z, x, y);
  for (const [pz, px, py] of parentKeys(z, x, y)) {
    acquireFetch(pz, px, py);
  }
}

function releaseAll(z, x, y) {
  releaseFetch(z, x, y);
  for (const [pz, px, py] of parentKeys(z, x, y)) {
    releaseFetch(pz, px, py);
  }
}

function assembleParentHorizon(z, x, y) {
  const parentZ = z - parentDZ;
  if (parentZ < 0) {
    return Promise.resolve({ HN: 0, heights: new Float32Array(0) });
  }
  const s = 1 << parentDZ;
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
      break;

    case "fetch": {
      const { z, x, y } = msg;
      const key = refKey(z, x, y);
      inFlight.add(key);
      acquireAll(z, x, y);
      Promise.all([
        cache.get(key)?.promise,
        assembleParentHorizon(z, x, y),
      ]).then(([comp, horizon]) => {
        if (!inFlight.has(key)) return; // cancelled
        inFlight.delete(key);
        // Clone heights so we can transfer without invalidating the cache.
        const compHeights = new Float32Array(comp.heights);
        const horizonHeights = new Float32Array(horizon.heights);
        self.postMessage(
          {
            type: "tile",
            z, x, y,
            comp: { N: comp.N, heights: compHeights, hMin: comp.hMin, hMax: comp.hMax },
            horizon: { HN: horizon.HN, heights: horizonHeights, hMin: horizon.hMin, hMax: horizon.hMax },
          },
          [compHeights.buffer, horizonHeights.buffer],
        );
      }).catch((err) => {
        if (!inFlight.has(key)) return; // cancelled
        inFlight.delete(key);
        self.postMessage({ type: "error", z, x, y, message: err.message });
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
