// Ray-terrain intersection orchestration layer.
// Connects the 3D BVH (tile-level) with per-tile elevation quadtrees.

import { invertMat4 } from '../math/mat4.ts';
import { getElevationScale } from '../tiles/tile-math.js';
import { rayIntersectQuadtree } from './elevation-quadtree.ts';

/**
 * Unproject a screen point (NDC) to a world-space ray.
 *
 * @param {number} ndcX - normalized device X in [-1, 1]
 * @param {number} ndcY - normalized device Y in [-1, 1]
 * @param {Float32Array} invProjView - inverse of projectionView matrix
 * @returns {{ origin: Float64Array, direction: Float64Array }}
 */
export function screenToRay(ndcX, ndcY, invProjView) {
  const m = invProjView;

  // Reversed-z: NDC z=1 is near, z=0 is far (infinite).
  // Use z=0.5 instead of z=0 to avoid the degenerate w=0 point at infinity.
  function unproject(nx, ny, nz) {
    const x = m[0]*nx + m[4]*ny + m[8]*nz + m[12];
    const y = m[1]*nx + m[5]*ny + m[9]*nz + m[13];
    const z = m[2]*nx + m[6]*ny + m[10]*nz + m[14];
    const w = m[3]*nx + m[7]*ny + m[11]*nz + m[15];
    return [x/w, y/w, z/w];
  }

  const near = unproject(ndcX, ndcY, 1);
  const mid = unproject(ndcX, ndcY, 0.5);

  const origin = new Float64Array(near);
  const dx = mid[0] - near[0];
  const dy = mid[1] - near[1];
  const dz = mid[2] - near[2];
  const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
  const direction = new Float64Array([dx/len, dy/len, dz/len]);

  return { origin, direction };
}

/**
 * Raycast against loaded terrain tiles.
 *
 * @param {Object} params
 * @param {Float64Array} params.origin - ray origin in world space
 * @param {Float64Array} params.direction - ray direction in world space (unit)
 * @param {BVH} params.bvh - 3D BVH over tile AABBs
 * @param {TileManager} params.tileCache - tile manager with .cache
 * @param {Array} params.tileList - array of { z, x, y } tiles in the BVH (same order as BVH indices)
 * @param {number} params.verticalExaggeration
 * @returns {{ worldPos: [number, number, number], t: number, tile: { z, x, y } } | null}
 */
export function raycastTerrain({ origin, direction, bvh, tileCache, tileList, verticalExaggeration }) {
  const ox = origin[0], oy = origin[1], oz = origin[2];
  const dx = direction[0], dy = direction[1], dz = direction[2];

  // Get candidate tiles from BVH, sorted nearest-first
  const candidates = bvh.rayIntersect(ox, oy, oz, dx, dy, dz);
  if (candidates.length === 0) return null;

  // Collect all hits — don't early-terminate, because the BVH may contain
  // overlapping tiles at different zoom levels (coarse + fine). We need all
  // hits to prefer the fine tile's intersection over the coarse tile's.
  const hits = [];

  for (let i = 0; i < candidates.length; i++) {
    const { index } = candidates[i];

    const tile = tileList[index];
    if (!tile) continue;

    const entry = tileCache.ensureQuadtree(tile.z, tile.x, tile.y);
    if (!entry) continue;

    const { quadtree, elevations } = entry;
    const elevScale = getElevationScale(tile.z, tile.y);
    const vertExag = verticalExaggeration;
    const scale = elevScale * vertExag;
    const tileScale = 512 * (1 << tile.z);

    const tileOriginX = tile.x / (1 << tile.z);
    const tileOriginZ = tile.y / (1 << tile.z);

    const localOx = (ox - tileOriginX) * tileScale;
    const localOy = oy / scale;
    const localOz = (oz - tileOriginZ) * tileScale;

    const localDx = dx * tileScale;
    const localDy = dy / scale;
    const localDz = dz * tileScale;

    const hit = rayIntersectQuadtree(
      quadtree.minElev, quadtree.maxElev, elevations,
      localOx, localOy, localOz,
      localDx, localDy, localDz
    );

    if (!hit) continue;

    const localHitX = localOx + localDx * hit.t;
    const localHitY = localOy + localDy * hit.t;
    const localHitZ = localOz + localDz * hit.t;

    const worldHitX = localHitX / tileScale + tileOriginX;
    const worldHitY = localHitY * scale;
    const worldHitZ = localHitZ / tileScale + tileOriginZ;

    let worldT;
    const absDx = Math.abs(dx), absDy = Math.abs(dy), absDz = Math.abs(dz);
    if (absDx >= absDy && absDx >= absDz) {
      worldT = (worldHitX - ox) / dx;
    } else if (absDy >= absDz) {
      worldT = (worldHitY - oy) / dy;
    } else {
      worldT = (worldHitZ - oz) / dz;
    }

    if (worldT > 0) {
      hits.push({ worldPos: [worldHitX, worldHitY, worldHitZ], t: worldT, tile });
    }
  }

  if (hits.length === 0) return null;

  // Among overlapping tiles (ancestor-descendant pairs), prefer the descendant's
  // hit. A hit is "dominated" if another hit comes from a more detailed tile
  // covering the same area.
  let bestT = Infinity;
  let bestResult = null;
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    let dominated = false;
    for (let j = 0; j < hits.length; j++) {
      if (i === j) continue;
      const other = hits[j];
      if (other.tile.z > h.tile.z) {
        const d = other.tile.z - h.tile.z;
        if ((other.tile.x >> d) === h.tile.x && (other.tile.y >> d) === h.tile.y) {
          dominated = true;
          break;
        }
      }
    }
    if (!dominated && h.t < bestT) {
      bestT = h.t;
      bestResult = h;
    }
  }

  if (!bestResult) return null;
  return { worldPos: bestResult.worldPos, t: bestResult.t, tile: bestResult.tile };
}
