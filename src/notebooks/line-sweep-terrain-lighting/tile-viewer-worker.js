// Data-prep worker for tile-viewer.js.
//
// Handles tile fetching, terrarium decoding, and parent horizon
// assembly off the main thread. The main thread keeps all GPU work
// (bake + render) so panning/zooming existing tiles stays smooth.
//
// Protocol:
//   main → worker:  { type: "init", tileUrl }
//   main → worker:  { type: "fetch", z, x, y }
//   main → worker:  { type: "cancel", z, x, y }
//   worker → main:  { type: "tile", z, x, y, comp, horizon }
//   worker → main:  { type: "error", z, x, y, message }
//                    comp = { N, heights (Float32Array), hMin, hMax }
//                    horizon = { HN, heights (Float32Array) }
//                    Both Float32Arrays are transferred (zero-copy).

let tileUrl = "";

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
function parentKeys(z, x, y) {
  const parentZ = z - 1;
  if (parentZ < 0) return [];
  const qx = Math.floor((x - 1) / 2);
  const qy = Math.floor((y - 1) / 2);
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
  const parentZ = z - 1;
  if (parentZ < 0) {
    return Promise.resolve({ HN: 0, heights: new Float32Array(0) });
  }
  const qx = Math.floor((x - 1) / 2);
  const qy = Math.floor((y - 1) / 2);
  const nParent = 1 << parentZ;
  const fetchOrNull = (px, py) =>
    px < 0 || px >= nParent || py < 0 || py >= nParent
      ? Promise.resolve(null)
      : acquireFetch(px, py, parentZ).catch(() => null);

  // Note: acquireFetch was already called in acquireAll, so this
  // just gets the existing promise (refs already incremented).
  // We use the cache entries directly here.
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
    const HN = Math.floor((3 * PN) / 2);
    const compTileXInBlock = (x - 2 * qx) * (PN / 2);
    const compTileYInBlock = (y - 2 * qy) * (PN / 2);
    const startX = compTileXInBlock - PN / 2;
    const startY = compTileYInBlock - PN / 2;
    const heights = new Float32Array(HN * HN);
    for (let j = 0; j < HN; j++) {
      const srcRow = (startY + j) * BN + startX;
      const dstRow = j * HN;
      for (let i = 0; i < HN; i++) heights[dstRow + i] = block[srcRow + i];
    }
    return { HN, heights };
  });
}

// Track in-flight fetch requests so we can cancel them.
const inFlight = new Set(); // "z/x/y"

self.onmessage = (e) => {
  const msg = e.data;
  switch (msg.type) {
    case "init":
      tileUrl = msg.tileUrl;
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
            horizon: { HN: horizon.HN, heights: horizonHeights },
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
