// CPU tile bake worker.
//
// Thin message-protocol shim over the shared CPU bake helpers in
// `src/lib/line-sweep-bake.js` (imported via the `./lib` symlink). The
// per-tile computation and the underlying `sweepCore` are shared with
// the denali map viewer's bake worker, so fixes to the sweep reach both.
// Only this notebook's type-tagged message protocol is local.
//
// Produces the same (nx, ny, ao, shadow) packed RGBA as the GPU bake
// pipeline. The main thread uploads the result to a texture and
// composites with the same shader regardless of whether the bake was
// GPU or CPU.
//
// Messages:
//   main → worker: { type: "bake", z, x, y, heights, N, rawEqPxSizeM,
//                     horizon, HN, azDeg, altDeg, sunRadiusDeg, shadowSamples,
//                     lsaoFalloff, parentScale, compHMin, horizonHMax }
//   main → worker: { type: "shadow", z, x, y, heights, N, rawEqPxSizeM,
//                     horizon, HN, azDeg, altDeg, sunRadiusDeg, shadowSamples,
//                     cachedNx, cachedNy, cachedAo, parentScale,
//                     compHMin, horizonHMax }
//   worker → main: { type: "baked", z, x, y, packed (Uint8Array, transferred), N, nx, ny, ao }
//   worker → main: { type: "shadowed", z, x, y, packed (Uint8Array, transferred), N }

import {
  buildRowPx,
  computeNormals,
  computeLSAO,
  computeShadow,
  packRGBA,
} from "./lib/line-sweep-bake.js";

self.onmessage = (e) => {
  const msg = e.data;
  switch (msg.type) {
    case "bake": {
      const { z, x, y, heights, N, rawEqPxSizeM, horizon, HN,
              azDeg, altDeg, sunRadiusDeg, shadowSamples, lsaoFalloff,
              parentScale = 2, compHMin, horizonHMax } = msg;
      const rowPx = buildRowPx(rawEqPxSizeM, z, y, N);
      const { nx, ny } = computeNormals(heights, N, rowPx);
      const ao = computeLSAO(heights, N, rowPx, horizon, HN, lsaoFalloff, parentScale);
      const shadow = computeShadow(heights, N, rowPx, horizon, HN,
                                   azDeg, altDeg, sunRadiusDeg, shadowSamples, parentScale,
                                   compHMin, horizonHMax);
      const packed = packRGBA(nx, ny, ao, shadow, N);
      self.postMessage(
        { type: "baked", z, x, y, packed, N,
          nx, ny, ao },
        [packed.buffer, nx.buffer, ny.buffer, ao.buffer],
      );
      break;
    }

    case "shadow": {
      const { z, x, y, heights, N, rawEqPxSizeM, horizon, HN,
              azDeg, altDeg, sunRadiusDeg, shadowSamples,
              cachedNx, cachedNy, cachedAo,
              parentScale = 2, compHMin, horizonHMax } = msg;
      const rowPx = buildRowPx(rawEqPxSizeM, z, y, N);
      const shadow = computeShadow(heights, N, rowPx, horizon, HN,
                                   azDeg, altDeg, sunRadiusDeg, shadowSamples, parentScale,
                                   compHMin, horizonHMax);
      const packed = packRGBA(cachedNx, cachedNy, cachedAo, shadow, N);
      self.postMessage(
        { type: "shadowed", z, x, y, packed, N },
        [packed.buffer],
      );
      break;
    }
  }
};
