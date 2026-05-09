// Assemble the parent-tile horizon buffer used by the line-sweep bake's
// prewarm pass.
//
// The bake operates on a comp grid of `COMP_N × COMP_N` per tile. The
// prewarm walks shadow-casting rays in from off-tile neighbors, sampling
// elevations from a `HN × HN` horizon buffer that covers a (s+1)-tile
// window at parent resolution (s = 2^PARENT_DZ child tiles per parent
// tile). See line-sweep-terrain-lighting/tile-viewer-worker.js and
// webgpu-pipelines.js for the original derivation.
//
// We assemble the horizon from currently-cached terrain tiles at
// `z - PARENT_DZ`. Missing parents are zero-filled (the bake completes
// with seams at those edges and gets re-baked when the parent loads).

import { downsampleInner } from './downsample.js';

export const COMP_N = 256;          // bake grid resolution
export const PARENT_DZ = 2;         // parent zoom delta
export const PARENT_SCALE = 1 << PARENT_DZ;  // child tiles per parent dim
export const PN = 256;              // parent pixels per dim (matches COMP_N)
export const HN = (PN * (PARENT_SCALE + 1)) / PARENT_SCALE;  // 320

// Returns the parent tile coords needed to assemble the horizon for
// the given child tile, with off-map keys filtered out. Lighting can
// use this to ask the tile manager to fetch missing parents at low
// priority.
export function getRequiredParents(z, x, y) {
  const parentZ = z - PARENT_DZ;
  if (parentZ < 0) return [];
  const s = PARENT_SCALE;
  const qx = Math.floor((x - s / 2) / s);
  const qy = Math.floor((y - s / 2) / s);
  const nParent = 1 << parentZ;
  const keys = [];
  for (const dy of [0, 1]) {
    for (const dx of [0, 1]) {
      const px = qx + dx;
      const py = qy + dy;
      if (px >= 0 && px < nParent && py >= 0 && py < nParent) {
        keys.push({ z: parentZ, x: px, y: py });
      }
    }
  }
  return keys;
}

// Assemble the horizon buffer. Returns { heights, hMin, hMax,
// missingParents } where heights is HN×HN Float32. Missing parents are
// zero-filled and reported so the caller can schedule re-bake. Returns
// null if parentZ < 0 (caller should bake without prewarm).
export function assembleHorizon(z, x, y, tileManager) {
  const parentZ = z - PARENT_DZ;
  if (parentZ < 0) return null;
  const s = PARENT_SCALE;
  const qx = Math.floor((x - s / 2) / s);
  const qy = Math.floor((y - s / 2) / s);
  const nParent = 1 << parentZ;

  const getParentDownsampled = (px, py) => {
    if (px < 0 || px >= nParent || py < 0 || py >= nParent) {
      return { data: null, missing: false }; // off-map — zero-fill, don't track
    }
    const entry = tileManager.getTile(parentZ, px, py);
    if (!entry || entry.isFlat || !entry.elevations) {
      return { data: null, missing: true };
    }
    return { data: downsampleInner(entry.elevations, 514, PN), missing: false };
  };

  const corners = [
    { dx: 0, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
  ].map(({ dx, dy }) => {
    const px = qx + dx, py = qy + dy;
    const { data, missing } = getParentDownsampled(px, py);
    return { dx, dy, px, py, data, missing };
  });

  // Place quadrants into a 2*PN block (512×512 with PN=256).
  const BN = 2 * PN;
  const block = new Float32Array(BN * BN);
  for (const { dx, dy, data } of corners) {
    if (!data) continue; // zero-fill
    const ox = dx * PN, oy = dy * PN;
    for (let j = 0; j < PN; j++) {
      block.set(data.subarray(j * PN, (j + 1) * PN), (oy + j) * BN + ox);
    }
  }

  // Extract the HN×HN window centered on the target child tile.
  const compTileXInBlock = (x - s * qx) * (PN / s);
  const compTileYInBlock = (y - s * qy) * (PN / s);
  const startX = compTileXInBlock - PN / 2;
  const startY = compTileYInBlock - PN / 2;
  const heights = new Float32Array(HN * HN);
  let hMin = Infinity, hMax = -Infinity;
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

  const missingParents = new Set();
  for (const { px, py, missing } of corners) {
    if (missing) missingParents.add(`${parentZ}/${px}/${py}`);
  }

  return { heights, hMin, hMax, missingParents };
}
