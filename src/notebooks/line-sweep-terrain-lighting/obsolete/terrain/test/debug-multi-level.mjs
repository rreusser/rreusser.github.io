/**
 * Debug multi-level LSAO with extensive logging
 */

import { getTerrainTile } from '../data/fetch-tile-sharp.ts';
import { assembleParentTileBufferMultiLevel, getParentTilesAtLevel } from '../data/parent-tile-assembly-multi-level.ts';

// Helper to create debug version of LSAO with logging
function computeLSAOCPUDebug({
  targetData,
  parentLevels,
  levelInfo,
  tileSize,
  pixelSize,
  directions = [[1, 0], [-1, 0], [0, 1], [0, -1]],
  debugScanline = null, // Set to scanline index to debug specific scanline
  debugDirection = 0 // Which direction to debug (0-3)
}) {
  const tileBuffer = 1;
  const numLevels = parentLevels.length;
  const bufferedSize = tileSize + 2 * tileBuffer;
  const outputSize = tileSize * tileSize;

  console.log('\n=== LSAO Debug Configuration ===');
  console.log(`Tile size: ${tileSize}`);
  console.log(`Pixel size: ${pixelSize}m`);
  console.log(`Number of levels: ${numLevels}`);
  console.log(`Target data size: ${bufferedSize}×${bufferedSize}`);

  for (let i = 0; i < numLevels; i++) {
    const info = levelInfo[i];
    console.log(`Level ${i}: buffer=${info.bufferSize}×${info.bufferSize}, scale=${info.scale}, coverage=[${info.coverageMin}] to [${info.coverageMax}]`);
  }

  const outputData = new Float32Array(outputSize);
  outputData.fill(0);

  const normalization = 1.0 / directions.length;
  const maxDeltaZ = -numLevels;
  const maxSweepSize = Math.floor(tileSize * (1 + Math.pow(2, maxDeltaZ)));

  console.log(`Max sweep size: ${maxSweepSize}`);
  console.log(`Normalization factor: ${normalization}`);

  // Helper: Get index in target tile (unbuffered)
  const unbufferedIndex = (ij) => {
    const clamped = [
      Math.max(0, Math.min(tileSize - 1, ij[0])),
      Math.max(0, Math.min(tileSize - 1, ij[1]))
    ];
    return clamped[0] + clamped[1] * tileSize;
  };

  // Helper: Get index in target tile (buffered)
  const bufferedIndex = (ij) => {
    const clamped = [
      Math.max(-tileBuffer, Math.min(tileSize + tileBuffer - 1, ij[0])),
      Math.max(-tileBuffer, Math.min(tileSize + tileBuffer - 1, ij[1]))
    ];
    const ijbuf = [clamped[0] + tileBuffer, clamped[1] + tileBuffer];
    return ijbuf[0] + ijbuf[1] * bufferedSize;
  };

  // Helper: Convert sweep index to normalized coordinates
  const sweepIndexToNormalized = (sweepIdx, scanlineIdx, step) => {
    let pixelPos = [0, 0];

    if (step[1] === 0) {
      const startX = step[0] < 0 ? maxSweepSize - 1 : 0;
      pixelPos[0] = startX + step[0] * sweepIdx;
      pixelPos[1] = scanlineIdx;
    } else {
      const startY = step[1] < 0 ? maxSweepSize - 1 : 0;
      pixelPos[0] = scanlineIdx;
      pixelPos[1] = startY + step[1] * sweepIdx;
    }

    const bufferCenter = maxSweepSize * 0.5;
    const targetHalfSize = tileSize * 0.5;

    return [
      (pixelPos[0] - bufferCenter + targetHalfSize) / tileSize,
      (pixelPos[1] - bufferCenter + targetHalfSize) / tileSize
    ];
  };

  const isInTarget = (normPos) => {
    return normPos[0] >= 0.0 && normPos[0] < 1.0 && normPos[1] >= 0.0 && normPos[1] < 1.0;
  };

  const isInLevel = (normPos, level) => {
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

  const normalizedToBufferCoords = (normPos, level) => {
    const info = levelInfo[level];
    const targetSizeAtLevel = tileSize / info.scale;
    return [
      info.targetOffset[0] + normPos[0] * targetSizeAtLevel,
      info.targetOffset[1] + normPos[1] * targetSizeAtLevel
    ];
  };

  const normalizedToTargetCoords = (normPos) => {
    return [Math.floor(normPos[0] * tileSize), Math.floor(normPos[1] * tileSize)];
  };

  const getPhysicalPosition = (normPos) => {
    return [normPos[0] * tileSize * pixelSize, normPos[1] * tileSize * pixelSize];
  };

  const sampleParentBilinear = (normPos, level) => {
    const info = levelInfo[level];
    const bufferCoords = normalizedToBufferCoords(normPos, level);

    const x0 = Math.floor(bufferCoords[0]);
    const y0 = Math.floor(bufferCoords[1]);
    const fx = bufferCoords[0] - x0;
    const fy = bufferCoords[1] - y0;

    const maxCoord = info.bufferSize - 1;
    const cx0 = Math.max(0, Math.min(maxCoord, x0));
    const cy0 = Math.max(0, Math.min(maxCoord, y0));
    const cx1 = Math.max(0, Math.min(maxCoord, x0 + 1));
    const cy1 = Math.max(0, Math.min(maxCoord, y0 + 1));

    const parentData = parentLevels[level];
    const v00 = parentData[cy0 * info.bufferSize + cx0];
    const v10 = parentData[cy0 * info.bufferSize + cx1];
    const v01 = parentData[cy1 * info.bufferSize + cx0];
    const v11 = parentData[cy1 * info.bufferSize + cx1];

    const v0 = v00 * (1 - fx) + v10 * fx;
    const v1 = v01 * (1 - fx) + v11 * fx;
    return v0 * (1 - fy) + v1 * fy;
  };

  const sampleElevation = (normPos, debug = false) => {
    // Check target first
    if (isInTarget(normPos)) {
      const targetCoords = normalizedToTargetCoords(normPos);
      const idx = bufferedIndex(targetCoords);
      const z = targetData[idx];
      if (debug) console.log(`  Sample @ norm[${normPos[0].toFixed(3)}, ${normPos[1].toFixed(3)}] -> TARGET z=${z.toFixed(2)}m`);
      return z;
    }

    // Check parent levels
    for (let level = 0; level < numLevels; level++) {
      if (isInLevel(normPos, level)) {
        const z = sampleParentBilinear(normPos, level);
        if (debug) console.log(`  Sample @ norm[${normPos[0].toFixed(3)}, ${normPos[1].toFixed(3)}] -> LEVEL${level} z=${z.toFixed(2)}m`);
        return z;
      }
    }

    if (debug) console.log(`  Sample @ norm[${normPos[0].toFixed(3)}, ${normPos[1].toFixed(3)}] -> OUT OF COVERAGE, defaulting to 0`);
    return 0.0;
  };

  // Get target elevation stats
  let targetMin = Infinity, targetMax = -Infinity, targetSum = 0;
  for (let i = 0; i < targetData.length; i++) {
    targetMin = Math.min(targetMin, targetData[i]);
    targetMax = Math.max(targetMax, targetData[i]);
    targetSum += targetData[i];
  }
  console.log(`Target elevation range: ${targetMin.toFixed(2)}m to ${targetMax.toFixed(2)}m, mean: ${(targetSum / targetData.length).toFixed(2)}m`);

  // Get parent elevation stats
  for (let level = 0; level < numLevels; level++) {
    let min = Infinity, max = -Infinity, sum = 0;
    const data = parentLevels[level];
    for (let i = 0; i < data.length; i++) {
      min = Math.min(min, data[i]);
      max = Math.max(max, data[i]);
      sum += data[i];
    }
    console.log(`Level ${level} elevation range: ${min.toFixed(2)}m to ${max.toFixed(2)}m, mean: ${(sum / data.length).toFixed(2)}m`);
  }

  // Process each direction
  for (let dirIdx = 0; dirIdx < directions.length; dirIdx++) {
    const step = directions[dirIdx];
    const shouldDebugDir = dirIdx === debugDirection;

    if (shouldDebugDir) {
      console.log(`\n=== Processing direction ${dirIdx}: step=[${step[0]}, ${step[1]}] ===`);
    }

    for (let scanlineIdx = 0; scanlineIdx < maxSweepSize; scanlineIdx++) {
      const shouldDebug = shouldDebugDir && (debugScanline === null || scanlineIdx === debugScanline);

      if (shouldDebug) {
        console.log(`\n--- Scanline ${scanlineIdx} ---`);
      }

      // Initialize hull
      let initPixelPos = [0, 0];
      if (step[1] === 0) {
        const startX = step[0] < 0 ? maxSweepSize - 1 : 0;
        initPixelPos[0] = startX - step[0];
        initPixelPos[1] = scanlineIdx;
      } else {
        const startY = step[1] < 0 ? maxSweepSize - 1 : 0;
        initPixelPos[0] = scanlineIdx;
        initPixelPos[1] = startY - step[1];
      }

      const bufferCenter = maxSweepSize * 0.5;
      const targetHalfSize = tileSize * 0.5;
      const initNormPos = [
        (initPixelPos[0] - bufferCenter + targetHalfSize) / tileSize,
        (initPixelPos[1] - bufferCenter + targetHalfSize) / tileSize
      ];
      const initZ = sampleElevation(initNormPos, shouldDebug);
      const initPhysPos = getPhysicalPosition(initNormPos);

      const hull = [];
      hull.push([initPhysPos[0], initPhysPos[1], initZ]);

      if (shouldDebug) {
        console.log(`Init hull: pos=[${initPhysPos[0].toFixed(1)}, ${initPhysPos[1].toFixed(1)}], z=${initZ.toFixed(2)}m`);
      }

      // Track contributions for this scanline
      let scanlineContributions = [];

      // Sweep
      for (let i = 0; i < maxSweepSize; i++) {
        const normPos = sweepIndexToNormalized(i, scanlineIdx, step);
        const z = sampleElevation(normPos, shouldDebug && i < 5);
        const physPos = getPhysicalPosition(normPos);
        const ijz = [physPos[0], physPos[1], z];

        // Calculate visibility
        const top = hull[hull.length - 1];
        let dijz = [top[0] - ijz[0], top[1] - ijz[1], top[2] - ijz[2]];
        let s0 = (dijz[2] * dijz[2]) / (dijz[0] * dijz[0] + dijz[1] * dijz[1] + dijz[2] * dijz[2]);
        s0 = dijz[2] > 0.0 ? s0 : -s0;

        // Pop hull
        while (hull.length > 1) {
          const nextTop = hull[hull.length - 2];
          dijz = [nextTop[0] - ijz[0], nextTop[1] - ijz[1], nextTop[2] - ijz[2]];
          let s1 = (dijz[2] * dijz[2]) / (dijz[0] * dijz[0] + dijz[1] * dijz[1] + dijz[2] * dijz[2]);
          s1 = dijz[2] > 0.0 ? s1 : -s1;

          if (s0 > s1) break;
          s0 = s1;
          hull.pop();
        }

        // Compute AO if in target
        if (isInTarget(normPos)) {
          const targetCoords = normalizedToTargetCoords(normPos);
          const uidx = unbufferedIndex(targetCoords);

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

          if (shouldDebug && scanlineContributions.length < 10) {
            scanlineContributions.push({
              sweepIdx: i,
              z: z.toFixed(2),
              horizonZ: horizonTop[2].toFixed(2),
              dz: dijz[2].toFixed(2),
              contribution: contribution.toFixed(6)
            });
          }
        }

        hull.push(ijz);
      }

      if (shouldDebug && scanlineContributions.length > 0) {
        console.log('\nFirst 10 contributions:');
        console.log('sweepIdx | z (m) | horizonZ (m) | dz (m) | contribution');
        scanlineContributions.forEach(c => {
          console.log(`${c.sweepIdx.toString().padStart(8)} | ${c.z.padStart(5)} | ${c.horizonZ.padStart(12)} | ${c.dz.padStart(6)} | ${c.contribution}`);
        });
      }
    }
  }

  return outputData;
}

// Main test
async function main() {
  console.log('Fetching terrain tile...');
  const targetTile = { x: 795, y: 1594, z: 12 };

  const tile = await getTerrainTile(targetTile);
  console.log(`Fetched tile: ${tile.width}×${tile.height}, tileSize=${tile.tileSize}`);

  // Test with 2 levels
  const numLevels = 2;
  console.log(`\nSetting up ${numLevels} parent levels...`);

  const parentLevels = [];
  const levelInfo = [];

  for (let level = 0; level < numLevels; level++) {
    const deltaZ = -(level + 1);
    console.log(`\nLevel ${level}: deltaZ=${deltaZ}`);

    const parentTileCoords = getParentTilesAtLevel(targetTile, deltaZ);
    console.log(`  Fetching ${parentTileCoords.length} parent tiles...`);

    const parentTiles = await Promise.all(
      parentTileCoords.map(async (coords) => {
        const parentTile = await getTerrainTile(coords);
        return {
          data: parentTile.data,
          width: parentTile.width,
          height: parentTile.height,
          tileSize: parentTile.tileSize,
          role: coords.role
        };
      })
    );

    const assembled = assembleParentTileBufferMultiLevel({
      targetTile,
      parentTiles,
      deltaZ,
      tileSize: tile.tileSize
    });

    console.log(`  Assembled: ${assembled.size}×${assembled.size}, targetOffset=[${assembled.targetOffset[0]}, ${assembled.targetOffset[1]}], scale=${assembled.scale}`);

    // Calculate coverage bounds in normalized coordinates
    // The buffer covers a region centered on the target
    // Target is at [0, 1) x [0, 1) in normalized coords
    // Buffer extends beyond target by (bufferSize - targetSize) / 2 on each side
    const targetSizeAtParent = assembled.targetSizeAtParent;
    const bufferRadius = (assembled.size - targetSizeAtParent) / 2;
    const coverageMin = [-bufferRadius / targetSizeAtParent, -bufferRadius / targetSizeAtParent];
    const coverageMax = [(targetSizeAtParent + bufferRadius) / targetSizeAtParent, (targetSizeAtParent + bufferRadius) / targetSizeAtParent];

    console.log(`  Coverage in normalized coords: [${coverageMin[0].toFixed(3)}, ${coverageMin[1].toFixed(3)}] to [${coverageMax[0].toFixed(3)}, ${coverageMax[1].toFixed(3)}]`);

    parentLevels.push(assembled.buffer);
    levelInfo.push({
      bufferSize: assembled.size,
      scale: assembled.scale,
      coverageMin,
      coverageMax,
      targetOffset: assembled.targetOffset
    });
  }

  // Compute with debug logging for middle scanline, direction 0 (east)
  const pixelSize = 40075017 / tile.tileSize / Math.pow(2, targetTile.z);

  console.log('\n' + '='.repeat(80));
  console.log('COMPUTING LSAO WITH DEBUG LOGGING');
  console.log('='.repeat(80));

  const result = computeLSAOCPUDebug({
    targetData: tile.data,
    parentLevels,
    levelInfo,
    tileSize: tile.tileSize,
    pixelSize,
    debugScanline: Math.floor(Math.floor(tile.tileSize * (1 + Math.pow(2, -numLevels))) / 2), // Middle scanline
    debugDirection: 0 // East direction
  });

  // Output statistics
  let min = Infinity, max = -Infinity, sum = 0;
  for (let i = 0; i < result.length; i++) {
    min = Math.min(min, result[i]);
    max = Math.max(max, result[i]);
    sum += result[i];
  }
  const mean = sum / result.length;

  console.log('\n' + '='.repeat(80));
  console.log('FINAL RESULTS');
  console.log('='.repeat(80));
  console.log(`Output range: ${min.toFixed(6)} to ${max.toFixed(6)}`);
  console.log(`Output mean: ${mean.toFixed(6)}`);
  console.log(`Expected range: [0, 1]`);
  console.log(`Status: ${min >= 0 && max <= 1.1 ? '✓ PASS' : '✗ FAIL - out of range!'}`);
}

main().catch(console.error);
