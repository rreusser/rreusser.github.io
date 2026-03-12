/**
 * Test all possible deltaZ values for a given tile
 */

import { getTerrainTile } from '../data/fetch-tile-sharp.js';
import { getParentTilesAtLevel, assembleParentTileBufferMultiLevel } from '../data/parent-tile-assembly-multi-level.js';

const targetTile = { x: 795, y: 1594, z: 12 };

console.log(`Target tile: ${targetTile.z}/${targetTile.x}/${targetTile.y}\n`);

// Fetch actual target tile
console.log('Fetching actual target tile...');
const actualTarget = await getTerrainTile(targetTile);

// Extract core 512×512 region
const actualCore = new Float32Array(512 * 512);
for (let y = 0; y < 512; y++) {
  for (let x = 0; x < 512; x++) {
    const srcIdx = (y + 1) * actualTarget.width + (x + 1);
    const dstIdx = y * 512 + x;
    actualCore[dstIdx] = actualTarget.data[srcIdx];
  }
}

// Stats for actual
let actualMin = Infinity, actualMax = -Infinity, actualSum = 0;
for (let i = 0; i < actualCore.length; i++) {
  if (actualCore[i] < actualMin) actualMin = actualCore[i];
  if (actualCore[i] > actualMax) actualMax = actualCore[i];
  actualSum += actualCore[i];
}
const actualMean = actualSum / actualCore.length;

console.log('✓ Actual target stats:');
console.log(`  Min: ${actualMin.toFixed(3)}, Max: ${actualMax.toFixed(3)}, Mean: ${actualMean.toFixed(3)}\n`);

// Test all possible deltaZ values
const maxDeltaZ = Math.min(targetTile.z, 8); // Can't go below z=0
const results = [];

for (let deltaZ = -1; deltaZ >= -maxDeltaZ; deltaZ--) {
  console.log(`${'='.repeat(50)}`);
  console.log(`Testing deltaZ = ${deltaZ} (z=${targetTile.z + deltaZ})`);
  console.log('='.repeat(50));

  const scale = Math.pow(2, Math.abs(deltaZ));
  const targetSizeAtParent = 512 / scale;

  try {
    // Fetch parent tiles
    const parentTileCoords = getParentTilesAtLevel(targetTile, deltaZ);
    const parentTiles = await Promise.all(
      parentTileCoords.map(async coords => {
        const tile = await getTerrainTile(coords);
        return {
          data: tile.data,
          width: tile.width,
          height: tile.height,
          tileSize: tile.tileSize,
          role: coords.role
        };
      })
    );

    // Assemble
    const result = assembleParentTileBufferMultiLevel({
      targetTile,
      parentTiles,
      deltaZ,
      tileSize: 512
    });

    // Extract target region
    const extractedRegion = new Float32Array(targetSizeAtParent * targetSizeAtParent);
    const [tx, ty] = result.targetOffset;

    for (let y = 0; y < targetSizeAtParent; y++) {
      for (let x = 0; x < targetSizeAtParent; x++) {
        const srcIdx = (ty + y) * result.size + (tx + x);
        const dstIdx = y * targetSizeAtParent + x;
        extractedRegion[dstIdx] = result.buffer[srcIdx];
      }
    }

    // Downsample actual target to match
    const downsampledActual = new Float32Array(targetSizeAtParent * targetSizeAtParent);
    for (let y = 0; y < targetSizeAtParent; y++) {
      for (let x = 0; x < targetSizeAtParent; x++) {
        let sum = 0;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const srcX = x * scale + dx;
            const srcY = y * scale + dy;
            const srcIdx = srcY * 512 + srcX;
            sum += actualCore[srcIdx];
          }
        }
        const dstIdx = y * targetSizeAtParent + x;
        downsampledActual[dstIdx] = sum / (scale * scale);
      }
    }

    // Compare
    let sumDiff = 0, maxDiff = 0;
    for (let i = 0; i < downsampledActual.length; i++) {
      const diff = Math.abs(downsampledActual[i] - extractedRegion[i]);
      sumDiff += diff;
      if (diff > maxDiff) maxDiff = diff;
    }
    const avgDiff = sumDiff / downsampledActual.length;

    const success = avgDiff < 1.0; // 1m tolerance

    console.log(`\nResult:`);
    console.log(`  Output size: ${result.size}×${result.size}`);
    console.log(`  Target size: ${targetSizeAtParent}×${targetSizeAtParent} (scale ${scale}:1)`);
    console.log(`  Target offset: [${result.targetOffset[0]}, ${result.targetOffset[1]}]`);
    console.log(`  Average error: ${avgDiff.toFixed(3)}m`);
    console.log(`  Max error: ${maxDiff.toFixed(3)}m`);
    console.log(`  Status: ${success ? '✅ PASS' : '❌ FAIL'}\n`);

    results.push({
      deltaZ,
      scale,
      avgError: avgDiff,
      maxError: maxDiff,
      success
    });
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}\n`);
    results.push({
      deltaZ,
      scale,
      error: err.message,
      success: false
    });
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('SUMMARY');
console.log('='.repeat(50));
console.log('\n┌─────────┬────────┬─────────────┬─────────────┬────────┐');
console.log('│  deltaZ │  Scale │  Avg Error  │  Max Error  │ Status │');
console.log('├─────────┼────────┼─────────────┼─────────────┼────────┤');
for (const r of results) {
  if (r.error) {
    console.log(`│ ${String(r.deltaZ).padStart(7)} │ ${String(r.scale).padStart(6)} │   ERROR     │   ERROR     │  FAIL  │`);
  } else {
    const avgStr = r.avgError.toFixed(3) + 'm';
    const maxStr = r.maxError.toFixed(3) + 'm';
    const statusStr = r.success ? ' PASS ' : ' FAIL ';
    console.log(`│ ${String(r.deltaZ).padStart(7)} │ ${String(r.scale).padStart(6)} │ ${avgStr.padStart(11)} │ ${maxStr.padStart(11)} │ ${statusStr} │`);
  }
}
console.log('└─────────┴────────┴─────────────┴─────────────┴────────┘');

const allPass = results.every(r => r.success);
console.log(`\n${allPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);
