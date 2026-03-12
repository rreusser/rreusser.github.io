/**
 * Verify that the sweep size fix resolves the washout issue
 */

import { getTerrainTile } from '../data/fetch-tile-sharp.ts';
import { assembleParentTileBufferMultiLevel, getParentTilesAtLevel } from '../data/parent-tile-assembly-multi-level.ts';
import { computeLSAOCPU } from '../compute/lsao-cpu.ts';
import { computeSimpleLSAOCPU } from '../compute/lsao-simple-cpu.ts';

async function main() {
  console.log('='.repeat(80));
  console.log('VERIFYING SWEEP SIZE FIX');
  console.log('='.repeat(80));

  const targetTile = { x: 795, y: 1594, z: 12 };
  const tile = await getTerrainTile(targetTile);
  const pixelSize = 40075017 / tile.tileSize / Math.pow(2, targetTile.z);

  console.log(`\nTarget tile: ${targetTile.z}/${targetTile.x}/${targetTile.y}`);
  console.log(`Tile size: ${tile.tileSize}×${tile.tileSize}`);
  console.log(`Pixel size: ${pixelSize.toFixed(3)}m`);

  // Compute simple LSAO (baseline, 1 level)
  console.log('\n' + '-'.repeat(80));
  console.log('SIMPLE LSAO (1 level, baseline)');
  console.log('-'.repeat(80));

  const simpleStart = performance.now();
  const simpleResult = computeSimpleLSAOCPU({
    terrainData: tile.data,
    tileSize: tile.tileSize,
    pixelSize,
    directions: [[1, 0], [-1, 0], [0, 1], [0, -1]]
  });
  const simpleTime = performance.now() - simpleStart;

  let min = Infinity, max = -Infinity, sum = 0;
  for (let i = 0; i < simpleResult.length; i++) {
    min = Math.min(min, simpleResult[i]);
    max = Math.max(max, simpleResult[i]);
    sum += simpleResult[i];
  }
  const simpleMean = sum / simpleResult.length;

  console.log(`Time: ${simpleTime.toFixed(1)}ms`);
  console.log(`Range: ${min.toFixed(6)} to ${max.toFixed(6)}`);
  console.log(`Mean: ${simpleMean.toFixed(6)}`);
  console.log(`Variation: ${(max - min).toFixed(6)}`);

  // Compute multi-level LSAO (2 levels)
  console.log('\n' + '-'.repeat(80));
  console.log('MULTI-LEVEL LSAO (2 levels)');
  console.log('-'.repeat(80));

  const numLevels = 2;
  const parentLevels = [];
  const levelInfo = [];

  for (let level = 0; level < numLevels; level++) {
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
      tileSize: tile.tileSize
    });

    const targetSizeAtParent = assembled.targetSizeAtParent;
    const bufferRadius = (assembled.size - targetSizeAtParent) / 2;
    const coverageMin = [-bufferRadius / targetSizeAtParent, -bufferRadius / targetSizeAtParent];
    const coverageMax = [(targetSizeAtParent + bufferRadius) / targetSizeAtParent, (targetSizeAtParent + bufferRadius) / targetSizeAtParent];

    parentLevels.push(assembled.buffer);
    levelInfo.push({
      bufferSize: assembled.size,
      scale: assembled.scale,
      coverageMin,
      coverageMax,
      targetOffset: assembled.targetOffset
    });

    console.log(`Level ${level} (deltaZ=${deltaZ}): ${assembled.size}×${assembled.size}, coverage=${coverageMin[0].toFixed(1)} to ${coverageMax[0].toFixed(1)}`);
  }

  const multiStart = performance.now();
  const multiResult = computeLSAOCPU({
    targetData: tile.data,
    parentLevels,
    levelInfo,
    tileSize: tile.tileSize,
    pixelSize,
    directions: [[1, 0], [-1, 0], [0, 1], [0, -1]]
  });
  const multiTime = performance.now() - multiStart;

  min = Infinity;
  max = -Infinity;
  sum = 0;
  for (let i = 0; i < multiResult.length; i++) {
    min = Math.min(min, multiResult[i]);
    max = Math.max(max, multiResult[i]);
    sum += multiResult[i];
  }
  const multiMean = sum / multiResult.length;

  console.log(`Time: ${multiTime.toFixed(1)}ms`);
  console.log(`Range: ${min.toFixed(6)} to ${max.toFixed(6)}`);
  console.log(`Mean: ${multiMean.toFixed(6)}`);
  console.log(`Variation: ${(max - min).toFixed(6)}`);

  // Compare
  console.log('\n' + '='.repeat(80));
  console.log('COMPARISON');
  console.log('='.repeat(80));

  let totalDiff = 0, maxDiff = 0;
  for (let i = 0; i < simpleResult.length; i++) {
    const diff = Math.abs(simpleResult[i] - multiResult[i]);
    totalDiff += diff;
    maxDiff = Math.max(maxDiff, diff);
  }
  const meanDiff = totalDiff / simpleResult.length;

  console.log(`\nSimple (1 level):`);
  console.log(`  Mean: ${simpleMean.toFixed(6)}, Variation: ${(max - min).toFixed(6)}`);

  console.log(`\nMulti-level (2 levels):`);
  console.log(`  Mean: ${multiMean.toFixed(6)}, Variation: ${(max - min).toFixed(6)}`);

  console.log(`\nDifference:`);
  console.log(`  Mean difference: ${meanDiff.toFixed(6)}`);
  console.log(`  Max difference: ${maxDiff.toFixed(6)}`);

  console.log(`\nExpected behavior:`);
  console.log(`  - Both should have similar variation (not washed out)`);
  console.log(`  - Multi-level should NOT have mean close to 1.0`);
  console.log(`  - Multi-level should show terrain features (variation > 0.1)`);

  console.log(`\nResult: ${min < 0.95 && max - min > 0.1 ? '✓ FIXED!' : '✗ Still broken'}`);

  // Calculate variation metric
  let variance = 0;
  for (let i = 0; i < multiResult.length; i++) {
    const diff = multiResult[i] - multiMean;
    variance += diff * diff;
  }
  const stddev = Math.sqrt(variance / multiResult.length);

  console.log(`\nStandard deviation of multi-level result: ${stddev.toFixed(6)}`);
  console.log(`Expected: > 0.05 for good terrain variation`);
  console.log(`Status: ${stddev > 0.05 ? '✓ Good variation' : '✗ Too uniform'}`);
}

main().catch(console.error);
