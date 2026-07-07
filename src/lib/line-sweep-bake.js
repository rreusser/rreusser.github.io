// Shared CPU tile-bake helpers for the line-sweep lighting pipeline.
//
// SHARED between notebooks (imported via the per-notebook `./lib/`
// symlink) by `line-sweep-terrain-lighting/cpu-bake-worker.js` and the
// `denali` map viewer's `bake.worker.js`. Those two files differ only
// in their Web Worker message protocol (denali plugs into a WorkerPool
// id-based protocol; line-sweep uses a plain type-tagged protocol), so
// each keeps its own thin `self.onmessage` shim and imports the actual
// per-tile computation from here. Everything below is pure — no worker
// or DOM globals — so it is equally usable off the worker.
//
// The heavy lifting is `sweepCore` (see ./line-sweep-core.js); these
// helpers just orchestrate the four passes a full tile bake needs:
// normals, LSAO (8 azimuths), soft shadow (optionally azimuth-stratified
// across the sun disk), and the RGBA8 pack.

import { sweepCore } from './line-sweep-core.js';

export const AO_DIRECTIONS = 8;
export const AO_GAMMA = 2.0;

// Per-row pxSize array. At low zoom one tile spans enough latitude that
// a single tile-centroid cos(lat) gives a visibly discontinuous seam at
// the tile boundary, so every pass that reads pxSize uses a per-row
// value instead. Horizontal and vertical pixel spacing in Web Mercator
// are equal at a given latitude (the projection is conformal), so a
// single row value covers both axes.
export function buildRowPx(eqPxSizeM, z, tileY, N) {
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

export function computeNormals(heights, N, pxSizeByRow) {
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

// `horizonPN` is optional — when omitted, sweepCore falls back to the
// bake grid W, which is correct whenever compN == PN (the line-sweep
// notebook). Denali passes it explicitly because its bake grid can be
// finer than the horizon ring.
export function computeLSAO(heights, N, pxSizeByRow, horizon, HN, lsaoFalloff, parentScale, horizonPN) {
  const ao = new Float32Array(N * N);
  for (let d = 0; d < AO_DIRECTIONS; d++) {
    const azDeg = (d * 360) / AO_DIRECTIONS;
    const result = sweepCore({
      W: N, H: N, elev: heights, azDeg, pxSizeByRow,
      mode: 'lsao',
      weight: 1 / AO_DIRECTIONS,
      horizon: HN > 0 ? horizon : null,
      HN,
      lsaoFalloff,
      parentScale,
      horizonPN,
    });
    for (let i = 0; i < N * N; i++) ao[i] += result[i];
  }
  return ao;
}

export function computeShadow(heights, N, pxSizeByRow, horizon, HN, azDeg, altDeg, sunRadiusDeg, samples, parentScale, compHMin, horizonHMax, horizonPN) {
  const shadow = new Float32Array(N * N);
  if (samples <= 1) {
    const result = sweepCore({
      W: N, H: N, elev: heights, azDeg, pxSizeByRow,
      mode: 'soft', altDeg, sunRadiusDeg, weight: 1,
      horizon: HN > 0 ? horizon : null, HN,
      parentScale, horizonPN,
      compElevMin: compHMin, horizonElevMax: horizonHMax,
    });
    for (let i = 0; i < N * N; i++) shadow[i] = result[i];
    return shadow;
  }
  // Stratified azimuth sampling across the sun disk.
  const weight = 1 / samples;
  const sigma = (2 * sunRadiusDeg) / Math.sqrt(2 * Math.PI);
  for (let s = 0; s < samples; s++) {
    const q = normInv((s + 0.5) / samples);
    const daz = q * sigma;
    const result = sweepCore({
      W: N, H: N, elev: heights, azDeg: azDeg + daz, pxSizeByRow,
      mode: 'soft', altDeg, sunRadiusDeg, weight,
      horizon: HN > 0 ? horizon : null, HN,
      parentScale, horizonPN,
      compElevMin: compHMin, horizonElevMax: horizonHMax,
    });
    for (let i = 0; i < N * N; i++) shadow[i] += result[i];
  }
  return shadow;
}

export function packRGBA(nx, ny, ao, shadow, N) {
  const packed = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const j = i * 4;
    packed[j]     = Math.round(Math.max(0, Math.min(255, (nx[i] + 1) * 127.5)));
    packed[j + 1] = Math.round(Math.max(0, Math.min(255, (ny[i] + 1) * 127.5)));
    packed[j + 2] = Math.round(Math.max(0, Math.min(255, Math.pow(Math.max(0, Math.min(1, ao[i])), AO_GAMMA) * 255)));
    packed[j + 3] = Math.round(Math.max(0, Math.min(255, Math.max(0, Math.min(1, shadow[i])) * 255)));
  }
  return packed;
}

// Peter Acklam's rational approximation to the inverse normal CDF.
export function normInv(p) {
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
