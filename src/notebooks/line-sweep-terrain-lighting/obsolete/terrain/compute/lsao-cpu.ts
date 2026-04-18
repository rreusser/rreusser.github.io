/**
 * CPU implementation of multi-level LSAO
 *
 * This provides a reference implementation that exactly matches the GPU shader
 * logic for debugging and validation purposes.
 */

import type { LevelInfo } from './types.js';

interface ComputeLSAOCPUParams {
  targetData: Float32Array;
  parentLevels: Float32Array[];
  levelInfo: LevelInfo[];
  tileSize: number;
  pixelSize: number;
  workgroupSize?: number;
  directions?: [number, number][];
}

/**
 * Compute multi-level LSAO for a tile on CPU
 *
 * @param {Object} params
 * @param {Float32Array} params.targetData - Target tile terrain data (buffered, e.g., 514×514)
 * @param {Float32Array[]} params.parentLevels - Parent buffer data (one per level)
 * @param {LevelInfo[]} params.levelInfo - Metadata for each level
 * @param {number} params.tileSize - Target tile size (512)
 * @param {number} params.pixelSize - Target pixel size in meters
 * @param {number} [params.workgroupSize=128] - Not used in CPU version, for API compatibility
 * @param {Array<[number, number]>} [params.directions] - Sweep directions
 * @returns {Float32Array} AO values [0,1] for each pixel
 */
export function computeLSAOCPU({
  targetData,
  parentLevels,
  levelInfo,
  tileSize,
  pixelSize,
  workgroupSize = 128,
  directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]
}: ComputeLSAOCPUParams): Float32Array {
  const tileBuffer = 1;
  const numLevels = parentLevels.length;

  if (numLevels < 1 || numLevels > 4) {
    throw new Error(`numLevels must be 1-4, got ${numLevels}`);
  }

  // Calculate dimensions
  const bufferedSize = tileSize + 2 * tileBuffer;
  const outputSize = tileSize * tileSize;

  // Validate input sizes
  if (targetData.length !== bufferedSize * bufferedSize) {
    throw new Error(
      `Target data size mismatch: expected ${bufferedSize}×${bufferedSize}, got ${targetData.length}`
    );
  }

  for (let i = 0; i < numLevels; i++) {
    const expectedSize = levelInfo[i].bufferSize * levelInfo[i].bufferSize;
    if (parentLevels[i].length !== expectedSize) {
      throw new Error(
        `Parent level ${i} size mismatch: expected ${expectedSize}, got ${parentLevels[i].length}`
      );
    }
  }

  // Initialize output buffer
  const outputData = new Float32Array(outputSize);
  outputData.fill(0);

  const normalization = 1.0 / directions.length;
  const maxDeltaZ = -numLevels;
  const maxSweepSize = Math.floor(tileSize * (1 + Math.pow(2, Math.abs(maxDeltaZ))));

  // Helper: Get index in target tile (unbuffered, 512×512)
  const unbufferedIndex = (ij: [number, number]): number => {
    const clamped = [
      Math.max(0, Math.min(tileSize - 1, ij[0])),
      Math.max(0, Math.min(tileSize - 1, ij[1]))
    ];
    return clamped[0] + clamped[1] * tileSize;
  };

  // Helper: Get index in target tile (buffered, 514×514)
  const bufferedIndex = (ij: [number, number]): number => {
    const clamped = [
      Math.max(-tileBuffer, Math.min(tileSize + tileBuffer - 1, ij[0])),
      Math.max(-tileBuffer, Math.min(tileSize + tileBuffer - 1, ij[1]))
    ];
    const ijbuf = [clamped[0] + tileBuffer, clamped[1] + tileBuffer];
    return ijbuf[0] + ijbuf[1] * bufferedSize;
  };

  // Helper: Convert sweep index to normalized coordinates
  const sweepIndexToNormalized = (sweepIdx: number, scanlineIdx: number, step: [number, number]): [number, number] => {
    let pixelPos: [number, number] = [0, 0];

    if (step[1] === 0) {
      // Horizontal sweep (E or W)
      const startX = step[0] < 0 ? maxSweepSize - 1 : 0;
      pixelPos[0] = startX + step[0] * sweepIdx;
      pixelPos[1] = scanlineIdx;
    } else {
      // Vertical sweep (N or S)
      const startY = step[1] < 0 ? maxSweepSize - 1 : 0;
      pixelPos[0] = scanlineIdx;
      pixelPos[1] = startY + step[1] * sweepIdx;
    }

    // Convert to normalized coordinates
    const bufferCenter = maxSweepSize * 0.5;
    const targetHalfSize = tileSize * 0.5;

    return [
      (pixelPos[0] - bufferCenter + targetHalfSize) / tileSize,
      (pixelPos[1] - bufferCenter + targetHalfSize) / tileSize
    ];
  };

  // Helper: Check if normalized position is within target tile
  const isInTarget = (normPos: [number, number]): boolean => {
    return normPos[0] >= 0.0 && normPos[0] < 1.0 && normPos[1] >= 0.0 && normPos[1] < 1.0;
  };

  // Helper: Check if normalized position is within a level's coverage
  const isInLevel = (normPos: [number, number], level: number): boolean => {
    if (level >= numLevels) return false;
    const info = levelInfo[level];
    if (info.bufferSize === 0) return false;
    return (
      normPos[0] >= info.coverageMin[0] &&
      normPos[0] < info.coverageMax[0] &&
      normPos[1] >= info.coverageMin[1] &&
      normPos[1] < info.coverageMax[1]
    );
  };

  // Helper: Convert normalized position to buffer coordinates for a level
  const normalizedToBufferCoords = (normPos: [number, number], level: number): [number, number] => {
    const info = levelInfo[level];
    const targetSizeAtLevel = tileSize / info.scale;
    return [
      info.targetOffset[0] + normPos[0] * targetSizeAtLevel,
      info.targetOffset[1] + normPos[1] * targetSizeAtLevel
    ];
  };

  // Helper: Convert normalized position to target buffer coordinates
  const normalizedToTargetCoords = (normPos: [number, number]): [number, number] => {
    return [Math.floor(normPos[0] * tileSize), Math.floor(normPos[1] * tileSize)];
  };

  // Helper: Get physical position for distance calculations
  const getPhysicalPosition = (normPos: [number, number]): [number, number] => {
    return [normPos[0] * tileSize * pixelSize, normPos[1] * tileSize * pixelSize];
  };

  // Helper: Sample from parent level with bilinear interpolation
  const sampleParentBilinear = (normPos: [number, number], level: number): number => {
    const info = levelInfo[level];
    const bufferCoords = normalizedToBufferCoords(normPos, level);

    // Get integer and fractional parts
    const x0 = Math.floor(bufferCoords[0]);
    const y0 = Math.floor(bufferCoords[1]);
    const fx = bufferCoords[0] - x0;
    const fy = bufferCoords[1] - y0;

    // Clamp coordinates to buffer bounds
    const maxCoord = info.bufferSize - 1;
    const cx0 = Math.max(0, Math.min(maxCoord, x0));
    const cy0 = Math.max(0, Math.min(maxCoord, y0));
    const cx1 = Math.max(0, Math.min(maxCoord, x0 + 1));
    const cy1 = Math.max(0, Math.min(maxCoord, y0 + 1));

    // Sample 4 corners
    const parentData = parentLevels[level];
    const v00 = parentData[cy0 * info.bufferSize + cx0];
    const v10 = parentData[cy0 * info.bufferSize + cx1];
    const v01 = parentData[cy1 * info.bufferSize + cx0];
    const v11 = parentData[cy1 * info.bufferSize + cx1];

    // Bilinear interpolation
    const v0 = v00 * (1 - fx) + v10 * fx;
    const v1 = v01 * (1 - fx) + v11 * fx;
    return v0 * (1 - fy) + v1 * fy;
  };

  // Helper: Sample elevation with priority: target > level 0 > level 1 > level 2 > level 3
  const sampleElevation = (normPos: [number, number]): number => {
    // Check target first (highest priority)
    if (isInTarget(normPos)) {
      const targetCoords = normalizedToTargetCoords(normPos);
      const idx = bufferedIndex(targetCoords);
      return targetData[idx];
    }

    // Check parent levels in order (finest to coarsest)
    for (let level = 0; level < numLevels; level++) {
      if (isInLevel(normPos, level)) {
        return sampleParentBilinear(normPos, level);
      }
    }

    // Should never reach here if coverage is correct
    return 0.0;
  };

  // Process each direction
  for (const step of directions) {
    // Each scanline processes one row or column
    for (let scanlineIdx = 0; scanlineIdx < maxSweepSize; scanlineIdx++) {
      // Initialize hull with point before sweep range (equivalent to sweepIdx=-1)
      let initPixelPos: [number, number] = [0, 0];
      if (step[1] === 0) {
        // Horizontal sweep
        const startX = step[0] < 0 ? maxSweepSize - 1 : 0;
        initPixelPos[0] = startX - step[0];
        initPixelPos[1] = scanlineIdx;
      } else {
        // Vertical sweep
        const startY = step[1] < 0 ? maxSweepSize - 1 : 0;
        initPixelPos[0] = scanlineIdx;
        initPixelPos[1] = startY - step[1];
      }

      const bufferCenter = maxSweepSize * 0.5;
      const targetHalfSize = tileSize * 0.5;
      const initNormPos: [number, number] = [
        (initPixelPos[0] - bufferCenter + targetHalfSize) / tileSize,
        (initPixelPos[1] - bufferCenter + targetHalfSize) / tileSize
      ];
      const initZ = sampleElevation(initNormPos);
      const initPhysPos = getPhysicalPosition(initNormPos);

      const hull: Array<[number, number, number]> = [];
      hull.push([initPhysPos[0], initPhysPos[1], initZ]);

      // Sweep through all positions
      for (let i = 0; i < maxSweepSize; i++) {
        const normPos = sweepIndexToNormalized(i, scanlineIdx, step);

        // Sample elevation at current position
        const z = sampleElevation(normPos);
        const physPos = getPhysicalPosition(normPos);
        const ijz: [number, number, number] = [physPos[0], physPos[1], z];

        // Calculate visibility metric for current point
        const top = hull[hull.length - 1];
        let dijz = [top[0] - ijz[0], top[1] - ijz[1], top[2] - ijz[2]];
        let s0 = (dijz[2] * dijz[2]) / (dijz[0] * dijz[0] + dijz[1] * dijz[1] + dijz[2] * dijz[2]);
        s0 = dijz[2] > 0.0 ? s0 : -s0;

        // Pop hull points that are occluded by current point
        while (hull.length > 1) {
          const nextTop = hull[hull.length - 2];
          dijz = [nextTop[0] - ijz[0], nextTop[1] - ijz[1], nextTop[2] - ijz[2]];
          let s1 = (dijz[2] * dijz[2]) / (dijz[0] * dijz[0] + dijz[1] * dijz[1] + dijz[2] * dijz[2]);
          s1 = dijz[2] > 0.0 ? s1 : -s1;

          if (s0 > s1) {
            break;
          }

          s0 = s1;
          hull.pop();
        }

        // Compute AO contribution only if inside target tile
        if (isInTarget(normPos)) {
          const targetCoords = normalizedToTargetCoords(normPos);
          const uidx = unbufferedIndex(targetCoords);

          // Calculate occlusion contribution from horizon
          const horizonTop = hull[hull.length - 1];
          dijz = [horizonTop[0] - ijz[0], horizonTop[1] - ijz[1], horizonTop[2] - ijz[2]];
          const dijzNormalized = [dijz[0], dijz[1], dijz[2] / pixelSize];
          const length = Math.sqrt(
            dijzNormalized[0] * dijzNormalized[0] +
            dijzNormalized[1] * dijzNormalized[1] +
            dijzNormalized[2] * dijzNormalized[2]
          );
          const contribution = normalization * Math.exp(-dijzNormalized[2] / length);
          outputData[uidx] += contribution;
        }

        // Push current point onto hull
        hull.push(ijz);
      }
    }
  }

  return outputData;
}
