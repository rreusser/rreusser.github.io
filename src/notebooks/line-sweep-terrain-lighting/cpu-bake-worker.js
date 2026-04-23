// CPU tile bake worker.
//
// Produces the same (nx, ny, ao, shadow) packed RGBA as the GPU bake
// pipeline, using the existing sweepCore CPU implementation. The main
// thread uploads the result to a texture and composites with the same
// shader regardless of whether the bake was GPU or CPU.
//
// Messages:
//   main → worker: { type: "bake", z, x, y, heights, N, pxSizeM,
//                     horizon, HN, azDeg, altDeg, sunRadiusDeg, shadowSamples }
//   main → worker: { type: "shadow", z, x, y, heights, N, pxSizeM,
//                     horizon, HN, azDeg, altDeg, sunRadiusDeg, shadowSamples,
//                     cachedNx, cachedNy, cachedAo }
//   worker → main: { type: "baked", z, x, y, packed (Uint8Array, transferred) }
//   worker → main: { type: "shadowed", z, x, y, packed (Uint8Array, transferred) }

import { sweepCore } from "./sweep-core.js";

const AO_DIRECTIONS = 8;
const AO_GAMMA = 2.0;

// Build a per-row pxSize array for this tile. At low zoom one tile
// spans enough latitude that a single tile-centroid cos(lat) gives a
// visibly discontinuous seam at the tile boundary, so every pass that
// reads pxSize uses a per-row value instead. Horizontal and vertical
// pixel spacing in Web Mercator are equal at a given latitude (the
// projection is conformal), so a single row value covers both axes.
function buildRowPx(eqPxSizeM, z, tileY, N) {
  const nFull = Math.pow(2, z) * N;
  const rowPx = new Float32Array(N);
  for (let r = 0; r < N; r++) {
    const worldRow = tileY * N + r + 0.5;
    const nMerc = Math.PI * (1 - (2 * worldRow) / nFull);
    const lat = Math.atan(Math.sinh(nMerc));
    rowPx[r] = eqPxSizeM * Math.cos(lat);
  }
  return rowPx;
}

function computeNormals(heights, N, pxSizeByRow) {
  const nx = new Float32Array(N * N);
  const ny = new Float32Array(N * N);
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const cm = Math.max(col - 1, 0);
      const cp = Math.min(col + 1, N - 1);
      const rm = Math.max(row - 1, 0);
      const rp = Math.min(row + 1, N - 1);
      const pxThis = pxSizeByRow[row];
      const dCol = (cp - cm) * pxThis;
      const dRow = (rp - rm) * 0.5 * (pxSizeByRow[rm] + pxSizeByRow[rp]);
      const eW = heights[row * N + cm];
      const eE = heights[row * N + cp];
      const eN = heights[rm * N + col];
      const eS = heights[rp * N + col];
      const mx = (eW - eE) / dCol;
      const my = (eS - eN) / dRow;
      const mag = Math.sqrt(mx * mx + my * my + 1);
      const idx = row * N + col;
      nx[idx] = mx / mag;
      ny[idx] = my / mag;
    }
  }
  return { nx, ny };
}

function computeLSAO(heights, N, pxSizeByRow, horizon, HN, lsaoFalloff, parentScale) {
  const ao = new Float32Array(N * N);
  for (let d = 0; d < AO_DIRECTIONS; d++) {
    const azDeg = (d * 360) / AO_DIRECTIONS;
    const result = sweepCore({
      W: N, H: N, elev: heights, azDeg, pxSizeByRow,
      mode: "lsao",
      weight: 1 / AO_DIRECTIONS,
      horizon: HN > 0 ? horizon : null,
      HN,
      lsaoFalloff,
      parentScale,
    });
    for (let i = 0; i < N * N; i++) ao[i] += result[i];
  }
  return ao;
}

function computeShadow(heights, N, pxSizeByRow, horizon, HN, azDeg, altDeg, sunRadiusDeg, samples, parentScale) {
  const shadow = new Float32Array(N * N);
  const weight = 1 / samples;

  if (samples <= 1) {
    const result = sweepCore({
      W: N, H: N, elev: heights, azDeg, pxSizeByRow,
      mode: "soft", altDeg, sunRadiusDeg, weight: 1,
      horizon: HN > 0 ? horizon : null, HN,
      parentScale,
    });
    for (let i = 0; i < N * N; i++) shadow[i] = result[i];
  } else {
    // Stratified azimuth sampling matching the GPU soft-shadow path.
    const sigma = (2 * sunRadiusDeg) / Math.sqrt(2 * Math.PI);
    for (let s = 0; s < samples; s++) {
      const q = normInv((s + 0.5) / samples);
      const daz = q * sigma;
      const result = sweepCore({
        W: N, H: N, elev: heights, azDeg: azDeg + daz, pxSizeByRow,
        mode: "soft", altDeg, sunRadiusDeg, weight,
        horizon: HN > 0 ? horizon : null, HN,
        parentScale,
      });
      for (let i = 0; i < N * N; i++) shadow[i] += result[i];
    }
  }
  return shadow;
}

function packRGBA(nx, ny, ao, shadow, N) {
  const packed = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const j = i * 4;
    packed[j] = Math.round(Math.max(0, Math.min(255, (nx[i] + 1) * 127.5)));
    packed[j + 1] = Math.round(Math.max(0, Math.min(255, (ny[i] + 1) * 127.5)));
    packed[j + 2] = Math.round(Math.max(0, Math.min(255, Math.pow(Math.max(0, Math.min(1, ao[i])), AO_GAMMA) * 255)));
    packed[j + 3] = Math.round(Math.max(0, Math.min(255, Math.max(0, Math.min(1, shadow[i])) * 255)));
  }
  return packed;
}

// Inverse-normal CDF (Peter Acklam's rational approximation).
function normInv(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q, r;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p <= phigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}

self.onmessage = (e) => {
  const msg = e.data;
  switch (msg.type) {
    case "bake": {
      const { z, x, y, heights, N, rawEqPxSizeM, pxCorr, horizon, HN,
              azDeg, altDeg, sunRadiusDeg, shadowSamples, lsaoFalloff,
              parentScale = 2 } = msg;
      // Per-row cos(lat) drives pxSize for every pass: the raw
      // latitude-dependent version for shadow (geometry is set by
      // real elevation differences and must stay continuous across
      // tile seams) and the β-scaled version for normals and LSAO
      // (both read ∇h, which is what the tile pyramid attenuates).
      const shadowRowPx = buildRowPx(rawEqPxSizeM, z, y, N);
      const scaledRowPx = new Float32Array(N);
      for (let i = 0; i < N; i++) scaledRowPx[i] = shadowRowPx[i] * pxCorr;
      const { nx, ny } = computeNormals(heights, N, scaledRowPx);
      const ao = computeLSAO(heights, N, scaledRowPx, horizon, HN, lsaoFalloff, parentScale);
      const shadow = computeShadow(heights, N, shadowRowPx, horizon, HN,
                                   azDeg, altDeg, sunRadiusDeg, shadowSamples, parentScale);
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
              parentScale = 2 } = msg;
      const shadowRowPx = buildRowPx(rawEqPxSizeM, z, y, N);
      const shadow = computeShadow(heights, N, shadowRowPx, horizon, HN,
                                   azDeg, altDeg, sunRadiusDeg, shadowSamples, parentScale);
      const packed = packRGBA(cachedNx, cachedNy, cachedAo, shadow, N);
      self.postMessage(
        { type: "shadowed", z, x, y, packed, N },
        [packed.buffer],
      );
      break;
    }
  }
};
