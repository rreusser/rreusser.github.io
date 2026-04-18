/**
 * Debug horizon behavior with simplified single-scanline test
 */

import { getTerrainTile } from '../data/fetch-tile-sharp.ts';
import { assembleParentTileBufferMultiLevel, getParentTilesAtLevel } from '../data/parent-tile-assembly-multi-level.ts';

// Simplified LSAO for single scanline with detailed logging
async function main() {
  console.log('Fetching terrain tile...');
  const targetTile = { x: 795, y: 1594, z: 12 };
  const tile = await getTerrainTile(targetTile);

  const tileSize = tile.tileSize;
  const pixelSize = 40075017 / tileSize / Math.pow(2, targetTile.z);

  console.log(`\nTile: ${tile.width}×${tile.height}, tileSize=${tileSize}`);
  console.log(`Pixel size: ${pixelSize.toFixed(3)}m`);

  // Get target elevation stats
  let targetMin = Infinity, targetMax = -Infinity, targetSum = 0;
  for (let i = 0; i < tile.data.length; i++) {
    targetMin = Math.min(targetMin, tile.data[i]);
    targetMax = Math.max(targetMax, tile.data[i]);
    targetSum += tile.data[i];
  }
  console.log(`Target elevation: ${targetMin.toFixed(2)}m to ${targetMax.toFixed(2)}m, mean: ${(targetSum / tile.data.length).toFixed(2)}m`);

  // Test case 1: Single level (deltaZ=-1)
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: SINGLE LEVEL (deltaZ=-1)');
  console.log('='.repeat(80));

  await testSingleLevel(tile, targetTile, -1, tileSize, pixelSize);

  // Test case 2: Two levels (deltaZ=-1 and deltaZ=-2)
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: TWO LEVELS (deltaZ=-1, deltaZ=-2)');
  console.log('='.repeat(80));

  await testTwoLevels(tile, targetTile, tileSize, pixelSize);
}

async function testSingleLevel(tile, targetTile, deltaZ, tileSize, pixelSize) {
  const parentTileCoords = getParentTilesAtLevel(targetTile, deltaZ);
  console.log(`Fetching ${parentTileCoords.length} parent tiles at deltaZ=${deltaZ}...`);

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
    tileSize
  });

  console.log(`Assembled: ${assembled.size}×${assembled.size}, scale=${assembled.scale}`);

  // Get parent elevation stats
  let parentMin = Infinity, parentMax = -Infinity, parentSum = 0;
  for (let i = 0; i < assembled.buffer.length; i++) {
    parentMin = Math.min(parentMin, assembled.buffer[i]);
    parentMax = Math.max(parentMax, assembled.buffer[i]);
    parentSum += assembled.buffer[i];
  }
  console.log(`Parent elevation: ${parentMin.toFixed(2)}m to ${parentMax.toFixed(2)}m, mean: ${(parentSum / assembled.buffer.length).toFixed(2)}m`);

  // Simulate a horizontal east-sweep through the middle scanline
  const maxSweepSize = Math.floor(tileSize * (1 + Math.pow(2, deltaZ)));
  const scanlineIdx = Math.floor(maxSweepSize / 2); // Middle scanline
  const step = [1, 0]; // East direction

  console.log(`\nSweep configuration:`);
  console.log(`  maxSweepSize: ${maxSweepSize}`);
  console.log(`  scanlineIdx: ${scanlineIdx}`);
  console.log(`  direction: East [1, 0]`);

  // Sample elevations along the sweep
  console.log(`\nSampling elevations along sweep:`);
  console.log(`sweepIdx | normX | normY | source | elevation (m)`);
  console.log('-'.repeat(70));

  const targetSizeAtParent = assembled.targetSizeAtParent;
  const targetOffset = assembled.targetOffset;

  for (let i = 0; i < maxSweepSize; i += Math.floor(maxSweepSize / 20)) {
    // Convert sweep position to normalized coordinates
    const startX = 0;
    const pixelX = startX + step[0] * i;
    const pixelY = scanlineIdx;

    const bufferCenter = maxSweepSize * 0.5;
    const targetHalfSize = tileSize * 0.5;
    const normX = (pixelX - bufferCenter + targetHalfSize) / tileSize;
    const normY = (pixelY - bufferCenter + targetHalfSize) / tileSize;

    // Determine source and sample elevation
    let source, z;
    const tileBuffer = 1;
    const bufferedSize = tileSize + 2 * tileBuffer;

    if (normX >= 0.0 && normX < 1.0 && normY >= 0.0 && normY < 1.0) {
      // In target
      const targetX = Math.floor(normX * tileSize);
      const targetY = Math.floor(normY * tileSize);
      const clampedX = Math.max(-tileBuffer, Math.min(tileSize + tileBuffer - 1, targetX));
      const clampedY = Math.max(-tileBuffer, Math.min(tileSize + tileBuffer - 1, targetY));
      const idx = (clampedY + tileBuffer) * bufferedSize + (clampedX + tileBuffer);
      z = tile.data[idx];
      source = 'TARGET';
    } else {
      // In parent level 0
      const bufferX = targetOffset[0] + normX * targetSizeAtParent;
      const bufferY = targetOffset[1] + normY * targetSizeAtParent;
      const x0 = Math.floor(bufferX);
      const y0 = Math.floor(bufferY);
      const fx = bufferX - x0;
      const fy = bufferY - y0;

      const maxCoord = assembled.size - 1;
      const cx0 = Math.max(0, Math.min(maxCoord, x0));
      const cy0 = Math.max(0, Math.min(maxCoord, y0));
      const cx1 = Math.max(0, Math.min(maxCoord, x0 + 1));
      const cy1 = Math.max(0, Math.min(maxCoord, y0 + 1));

      const v00 = assembled.buffer[cy0 * assembled.size + cx0];
      const v10 = assembled.buffer[cy0 * assembled.size + cx1];
      const v01 = assembled.buffer[cy1 * assembled.size + cx0];
      const v11 = assembled.buffer[cy1 * assembled.size + cx1];

      const v0 = v00 * (1 - fx) + v10 * fx;
      const v1 = v01 * (1 - fx) + v11 * fx;
      z = v0 * (1 - fy) + v1 * fy;
      source = 'PARENT0';
    }

    console.log(`${i.toString().padStart(8)} | ${normX.toFixed(3)} | ${normY.toFixed(3)} | ${source.padEnd(7)} | ${z.toFixed(2)}`);
  }

  // Check horizon initialization
  console.log(`\nHorizon initialization (sweepIdx=-1):`);
  const initPixelX = -1;
  const initPixelY = scanlineIdx;
  const bufferCenter = maxSweepSize * 0.5;
  const targetHalfSize = tileSize * 0.5;
  const initNormX = (initPixelX - bufferCenter + targetHalfSize) / tileSize;
  const initNormY = (initPixelY - bufferCenter + targetHalfSize) / tileSize;

  console.log(`  Pixel position: [${initPixelX}, ${initPixelY}]`);
  console.log(`  Normalized position: [${initNormX.toFixed(3)}, ${initNormY.toFixed(3)}]`);

  // Sample at init position
  const bufferX = targetOffset[0] + initNormX * targetSizeAtParent;
  const bufferY = targetOffset[1] + initNormY * targetSizeAtParent;
  console.log(`  Buffer position: [${bufferX.toFixed(1)}, ${bufferY.toFixed(1)}]`);

  const x0 = Math.floor(bufferX);
  const y0 = Math.floor(bufferY);
  const fx = bufferX - x0;
  const fy = bufferY - y0;

  const maxCoord = assembled.size - 1;
  const cx0 = Math.max(0, Math.min(maxCoord, x0));
  const cy0 = Math.max(0, Math.min(maxCoord, y0));
  const cx1 = Math.max(0, Math.min(maxCoord, x0 + 1));
  const cy1 = Math.max(0, Math.min(maxCoord, y0 + 1));

  console.log(`  Clamped buffer coords: [${cx0}, ${cy0}] to [${cx1}, ${cy1}]`);

  const v00 = assembled.buffer[cy0 * assembled.size + cx0];
  const v10 = assembled.buffer[cy0 * assembled.size + cx1];
  const v01 = assembled.buffer[cy1 * assembled.size + cx0];
  const v11 = assembled.buffer[cy1 * assembled.size + cx1];

  console.log(`  Corner elevations: v00=${v00.toFixed(2)}m, v10=${v10.toFixed(2)}m, v01=${v01.toFixed(2)}m, v11=${v11.toFixed(2)}m`);

  const v0 = v00 * (1 - fx) + v10 * fx;
  const v1 = v01 * (1 - fx) + v11 * fx;
  const initZ = v0 * (1 - fy) + v1 * fy;

  console.log(`  Interpolated elevation: ${initZ.toFixed(2)}m`);
  console.log(`  This becomes the initial horizon height`);
}

async function testTwoLevels(tile, targetTile, tileSize, pixelSize) {
  // Fetch both levels
  const levels = [];

  for (let level = 0; level < 2; level++) {
    const deltaZ = -(level + 1);
    const parentTileCoords = getParentTilesAtLevel(targetTile, deltaZ);

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
      tileSize
    });

    levels.push({
      deltaZ,
      assembled,
      targetSizeAtParent: assembled.targetSizeAtParent
    });

    console.log(`Level ${level} (deltaZ=${deltaZ}): ${assembled.size}×${assembled.size}, scale=${assembled.scale}`);
  }

  // Now trace through the same sweep with TWO levels
  const maxSweepSize = Math.floor(tileSize * (1 + Math.pow(2, -2))); // Two levels
  const scanlineIdx = Math.floor(maxSweepSize / 2);
  const step = [1, 0];

  console.log(`\nSweep configuration (2 levels):`);
  console.log(`  maxSweepSize: ${maxSweepSize}`);
  console.log(`  scanlineIdx: ${scanlineIdx}`);

  console.log(`\nSampling elevations along sweep (with priority: target > level0 > level1):`);
  console.log(`sweepIdx | normX | normY | source | elevation (m)`);
  console.log('-'.repeat(70));

  const tileBuffer = 1;
  const bufferedSize = tileSize + 2 * tileBuffer;

  for (let i = 0; i < maxSweepSize; i += Math.floor(maxSweepSize / 20)) {
    const startX = 0;
    const pixelX = startX + step[0] * i;
    const pixelY = scanlineIdx;

    const bufferCenter = maxSweepSize * 0.5;
    const targetHalfSize = tileSize * 0.5;
    const normX = (pixelX - bufferCenter + targetHalfSize) / tileSize;
    const normY = (pixelY - bufferCenter + targetHalfSize) / tileSize;

    let source, z;

    // Check target first
    if (normX >= 0.0 && normX < 1.0 && normY >= 0.0 && normY < 1.0) {
      const targetX = Math.floor(normX * tileSize);
      const targetY = Math.floor(normY * tileSize);
      const clampedX = Math.max(-tileBuffer, Math.min(tileSize + tileBuffer - 1, targetX));
      const clampedY = Math.max(-tileBuffer, Math.min(tileSize + tileBuffer - 1, targetY));
      const idx = (clampedY + tileBuffer) * bufferedSize + (clampedX + tileBuffer);
      z = tile.data[idx];
      source = 'TARGET';
    } else {
      // Check level 0 coverage
      const level0 = levels[0];
      const targetSizeAtLevel0 = level0.targetSizeAtParent;
      const bufferRadius0 = (level0.assembled.size - targetSizeAtLevel0) / 2;
      const coverageMin0 = -bufferRadius0 / targetSizeAtLevel0;
      const coverageMax0 = (targetSizeAtLevel0 + bufferRadius0) / targetSizeAtLevel0;

      if (normX >= coverageMin0 && normX < coverageMax0 && normY >= coverageMin0 && normY < coverageMax0) {
        // Sample from level 0
        const bufferX = level0.assembled.targetOffset[0] + normX * targetSizeAtLevel0;
        const bufferY = level0.assembled.targetOffset[1] + normY * targetSizeAtLevel0;
        z = bilinearSample(level0.assembled.buffer, level0.assembled.size, bufferX, bufferY);
        source = 'PARENT0';
      } else {
        // Sample from level 1
        const level1 = levels[1];
        const targetSizeAtLevel1 = level1.targetSizeAtParent;
        const bufferX = level1.assembled.targetOffset[0] + normX * targetSizeAtLevel1;
        const bufferY = level1.assembled.targetOffset[1] + normY * targetSizeAtLevel1;
        z = bilinearSample(level1.assembled.buffer, level1.assembled.size, bufferX, bufferY);
        source = 'PARENT1';
      }
    }

    console.log(`${i.toString().padStart(8)} | ${normX.toFixed(3)} | ${normY.toFixed(3)} | ${source.padEnd(7)} | ${z.toFixed(2)}`);
  }

  // Check differences in initialization between 1-level and 2-level
  console.log(`\nComparing horizon initialization:`);

  const initPixelX = -1;
  const initPixelY = scanlineIdx;
  const bufferCenter = maxSweepSize * 0.5;
  const targetHalfSize = tileSize * 0.5;
  const initNormX = (initPixelX - bufferCenter + targetHalfSize) / tileSize;
  const initNormY = (initPixelY - bufferCenter + targetHalfSize) / tileSize;

  console.log(`  Normalized position: [${initNormX.toFixed(3)}, ${initNormY.toFixed(3)}]`);

  // Sample from level 1
  const level1 = levels[1];
  const targetSizeAtLevel1 = level1.targetSizeAtParent;
  const bufferX1 = level1.assembled.targetOffset[0] + initNormX * targetSizeAtLevel1;
  const bufferY1 = level1.assembled.targetOffset[1] + initNormY * targetSizeAtLevel1;
  const initZ1 = bilinearSample(level1.assembled.buffer, level1.assembled.size, bufferX1, bufferY1);

  console.log(`  With 2 levels: elevation = ${initZ1.toFixed(2)}m (from PARENT1)`);

  // Compare with what 1-level would give
  const level0 = levels[0];
  const targetSizeAtLevel0 = level0.targetSizeAtParent;
  const bufferX0 = level0.assembled.targetOffset[0] + initNormX * targetSizeAtLevel0;
  const bufferY0 = level0.assembled.targetOffset[1] + initNormY * targetSizeAtLevel0;
  const initZ0 = bilinearSample(level0.assembled.buffer, level0.assembled.size, bufferX0, bufferY0);

  console.log(`  With 1 level:  elevation = ${initZ0.toFixed(2)}m (from PARENT0)`);
  console.log(`  Difference: ${(initZ1 - initZ0).toFixed(2)}m`);
}

function bilinearSample(buffer, bufferSize, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;

  const maxCoord = bufferSize - 1;
  const cx0 = Math.max(0, Math.min(maxCoord, x0));
  const cy0 = Math.max(0, Math.min(maxCoord, y0));
  const cx1 = Math.max(0, Math.min(maxCoord, x0 + 1));
  const cy1 = Math.max(0, Math.min(maxCoord, y0 + 1));

  const v00 = buffer[cy0 * bufferSize + cx0];
  const v10 = buffer[cy0 * bufferSize + cx1];
  const v01 = buffer[cy1 * bufferSize + cx0];
  const v11 = buffer[cy1 * bufferSize + cx1];

  const v0 = v00 * (1 - fx) + v10 * fx;
  const v1 = v01 * (1 - fx) + v11 * fx;
  return v0 * (1 - fy) + v1 * fy;
}

main().catch(console.error);
