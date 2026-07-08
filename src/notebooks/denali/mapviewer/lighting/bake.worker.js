// Per-tile lighting bake worker.
//
// Thin message-protocol shim over the shared CPU bake helpers in
// `src/lib/line-sweep-bake.js` (imported via the `../lib` symlink). The
// actual per-tile computation — normals, LSAO, soft shadow, RGBA8 pack —
// and the underlying `sweepCore` are shared with
// line-sweep-terrain-lighting so bug fixes to the sweep reach both.
// Only the WorkerPool id-based message protocol is denali-specific and
// lives here.
//
// Two job types:
//   'lighting-bake-static' — full bake (normals + LSAO + shadow + pack).
//                            Returns { packed, nx, ny, ao } so shadow
//                            re-bakes can reuse cached normals/AO.
//   'lighting-bake-shadow' — shadow-only re-bake (sun change). Caller
//                            sends cached nx/ny/ao; worker computes new
//                            shadow and packs into a fresh RGBA8.
//
// The id passed in by WorkerPool is echoed back unchanged; everything
// else lives in the message body.

import {
  buildRowPx,
  computeNormals,
  computeLSAO,
  computeShadow,
  packRGBA,
} from '../lib/line-sweep-bake.js';

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'lighting-bake-static') {
    const {
      id, z, x, y, heights, N, eqPxSizeM,
      horizon, HN, parentScale, horizonPN,
      azDeg, altDeg, sunRadiusDeg, shadowSamples, lsaoFalloff,
      compHMin, horizonHMax,
    } = msg;
    const rowPx = buildRowPx(eqPxSizeM, z, y, N);
    const { nx, ny } = computeNormals(heights, N, rowPx);
    const ao = computeLSAO(heights, N, rowPx, horizon, HN, lsaoFalloff, parentScale, horizonPN);
    const shadow = computeShadow(heights, N, rowPx, horizon, HN,
      azDeg, altDeg, sunRadiusDeg, shadowSamples, parentScale,
      compHMin, horizonHMax, horizonPN);
    const packed = packRGBA(nx, ny, ao, shadow, N);
    const echoHorizon = horizon && horizon.length > 0;
    const transfer = [packed.buffer, nx.buffer, ny.buffer, ao.buffer];
    if (echoHorizon) transfer.push(horizon.buffer);
    self.postMessage(
      { id, packed, nx, ny, ao, horizon: echoHorizon ? horizon : null, N },
      transfer,
    );
    return;
  }
  if (msg.type === 'lighting-bake-shadow') {
    const {
      id, z, x, y, heights, N, eqPxSizeM,
      horizon, HN, parentScale, horizonPN,
      azDeg, altDeg, sunRadiusDeg, shadowSamples,
      cachedNx, cachedNy, cachedAo,
      compHMin, horizonHMax,
    } = msg;
    const rowPx = buildRowPx(eqPxSizeM, z, y, N);
    const shadow = computeShadow(heights, N, rowPx, horizon, HN,
      azDeg, altDeg, sunRadiusDeg, shadowSamples, parentScale,
      compHMin, horizonHMax, horizonPN);
    const packed = packRGBA(cachedNx, cachedNy, cachedAo, shadow, N);
    // The cached nx/ny/ao and horizon arrays were copied (not
    // transferred) by the caller, so the main thread still owns
    // its originals. We only need to ship back the new packed RGBA.
    self.postMessage({ id, packed, N }, [packed.buffer]);
    return;
  }
};
