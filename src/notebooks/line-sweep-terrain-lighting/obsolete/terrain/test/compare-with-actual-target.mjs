/**
 * Compare extracted target regions with the actual target tile
 * This helps identify coordinate mapping errors
 */

import { getTerrainTile } from '../data/fetch-tile-sharp.js';
import { getParentTilesAtLevel, assembleParentTileBufferMultiLevel } from '../data/parent-tile-assembly-multi-level.js';
import { saveAsImage } from '../data/save-image-node.js';
import sharp from 'sharp';

const targetTile = { x: 795, y: 1594, z: 12 };

console.log(`Target tile: ${targetTile.z}/${targetTile.x}/${targetTile.y}\n`);

// Fetch the actual target tile
console.log('Fetching actual target tile (ground truth)...');
const actualTarget = await getTerrainTile(targetTile);
console.log(`✓ Actual target: ${actualTarget.width}×${actualTarget.height} (tileSize: ${actualTarget.tileSize})\n`);

// Extract core 512×512 region (without buffer)
const actualCore = new Float32Array(512 * 512);
for (let y = 0; y < 512; y++) {
  for (let x = 0; x < 512; x++) {
    const srcIdx = (y + 1) * actualTarget.width + (x + 1); // Skip 1-pixel buffer
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

console.log('Actual target tile stats (512×512):');
console.log(`  Min: ${actualMin.toFixed(3)}`);
console.log(`  Max: ${actualMax.toFixed(3)}`);
console.log(`  Mean: ${actualMean.toFixed(3)}`);

// Save actual target
const actualNormalized = new Float32Array(actualCore.length);
for (let i = 0; i < actualCore.length; i++) {
  actualNormalized[i] = (actualCore[i] - actualMin) / (actualMax - actualMin);
}
await saveAsImage(actualNormalized, 512, 'test/actual-target-512.png');
console.log('✓ Saved: test/actual-target-512.png\n');

// Test each deltaZ
for (const deltaZ of [-1, -2]) {
  console.log(`${'='.repeat(60)}`);
  console.log(`Testing deltaZ = ${deltaZ}`);
  console.log('='.repeat(60));

  const scale = Math.pow(2, Math.abs(deltaZ));
  const targetSizeAtParent = 512 / scale;

  console.log(`\nAt deltaZ=${deltaZ}:`);
  console.log(`  Scale: ${scale}:1`);
  console.log(`  Target size at parent resolution: ${targetSizeAtParent}×${targetSizeAtParent}`);

  // Fetch parent tiles
  const parentTileCoords = getParentTilesAtLevel(targetTile, deltaZ);
  console.log(`\nFetching ${parentTileCoords.length} parent tiles...`);
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

  // Extract target region from assembly
  const extractedRegion = new Float32Array(targetSizeAtParent * targetSizeAtParent);
  const [tx, ty] = result.targetOffset;

  for (let y = 0; y < targetSizeAtParent; y++) {
    for (let x = 0; x < targetSizeAtParent; x++) {
      const srcIdx = (ty + y) * result.size + (tx + x);
      const dstIdx = y * targetSizeAtParent + x;
      extractedRegion[dstIdx] = result.buffer[srcIdx];
    }
  }

  // Stats for extracted
  let extractedMin = Infinity, extractedMax = -Infinity, extractedSum = 0;
  for (let i = 0; i < extractedRegion.length; i++) {
    if (extractedRegion[i] < extractedMin) extractedMin = extractedRegion[i];
    if (extractedRegion[i] > extractedMax) extractedMax = extractedRegion[i];
    extractedSum += extractedRegion[i];
  }
  const extractedMean = extractedSum / extractedRegion.length;

  console.log(`\nExtracted region stats (${targetSizeAtParent}×${targetSizeAtParent}):`);
  console.log(`  Min: ${extractedMin.toFixed(3)}`);
  console.log(`  Max: ${extractedMax.toFixed(3)}`);
  console.log(`  Mean: ${extractedMean.toFixed(3)}`);

  // Downsample actual target to match parent resolution for comparison
  console.log(`\nDownsampling actual target (512×512) → (${targetSizeAtParent}×${targetSizeAtParent})...`);
  const downsampledActual = new Float32Array(targetSizeAtParent * targetSizeAtParent);

  for (let y = 0; y < targetSizeAtParent; y++) {
    for (let x = 0; x < targetSizeAtParent; x++) {
      // Average the scale×scale block from actual
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

  // Stats for downsampled actual
  let dsMin = Infinity, dsMax = -Infinity, dsSum = 0;
  for (let i = 0; i < downsampledActual.length; i++) {
    if (downsampledActual[i] < dsMin) dsMin = downsampledActual[i];
    if (downsampledActual[i] > dsMax) dsMax = downsampledActual[i];
    dsSum += downsampledActual[i];
  }
  const dsMean = dsSum / downsampledActual.length;

  console.log(`\nDownsampled actual stats (${targetSizeAtParent}×${targetSizeAtParent}):`);
  console.log(`  Min: ${dsMin.toFixed(3)}`);
  console.log(`  Max: ${dsMax.toFixed(3)}`);
  console.log(`  Mean: ${dsMean.toFixed(3)}`);

  // Compare
  let sumDiff = 0, maxDiff = 0, numDifferent = 0;
  const tolerance = 1.0; // 1m tolerance (allow for resampling differences)

  for (let i = 0; i < downsampledActual.length; i++) {
    const diff = Math.abs(downsampledActual[i] - extractedRegion[i]);
    sumDiff += diff;
    if (diff > maxDiff) maxDiff = diff;
    if (diff > tolerance) numDifferent++;
  }

  const avgDiff = sumDiff / downsampledActual.length;

  console.log(`\nComparison (extracted vs downsampled actual):`);
  console.log(`  Average difference: ${avgDiff.toFixed(3)}m`);
  console.log(`  Max difference: ${maxDiff.toFixed(3)}m`);
  console.log(`  Pixels different (>${tolerance}m): ${numDifferent} (${(numDifferent / downsampledActual.length * 100).toFixed(2)}%)`);

  if (avgDiff < tolerance) {
    console.log(`  ✅ MATCH! Extracted region matches actual target.`);
  } else {
    console.log(`  ❌ MISMATCH! Extracted region differs from actual target.`);
  }

  // Save side-by-side comparison
  const compWidth = targetSizeAtParent * 2 + 20; // Gap between images
  const compHeight = targetSizeAtParent;
  const compData = new Uint8Array(compWidth * compHeight * 4);

  // Left: downsampled actual (normalized)
  for (let y = 0; y < targetSizeAtParent; y++) {
    for (let x = 0; x < targetSizeAtParent; x++) {
      const idx = y * targetSizeAtParent + x;
      const normalized = (downsampledActual[idx] - actualMin) / (actualMax - actualMin);
      const value = Math.floor(normalized * 255);
      const compIdx = (y * compWidth + x) * 4;
      compData[compIdx] = value;
      compData[compIdx + 1] = value;
      compData[compIdx + 2] = value;
      compData[compIdx + 3] = 255;
    }
  }

  // Gap (white)
  for (let y = 0; y < compHeight; y++) {
    for (let x = targetSizeAtParent; x < targetSizeAtParent + 20; x++) {
      const compIdx = (y * compWidth + x) * 4;
      compData[compIdx] = 255;
      compData[compIdx + 1] = 255;
      compData[compIdx + 2] = 255;
      compData[compIdx + 3] = 255;
    }
  }

  // Right: extracted (normalized)
  for (let y = 0; y < targetSizeAtParent; y++) {
    for (let x = 0; x < targetSizeAtParent; x++) {
      const idx = y * targetSizeAtParent + x;
      const normalized = (extractedRegion[idx] - actualMin) / (actualMax - actualMin);
      const value = Math.floor(normalized * 255);
      const compIdx = (y * compWidth + (targetSizeAtParent + 20 + x)) * 4;
      compData[compIdx] = value;
      compData[compIdx + 1] = value;
      compData[compIdx + 2] = value;
      compData[compIdx + 3] = 255;
    }
  }

  await sharp(Buffer.from(compData.buffer), {
    raw: { width: compWidth, height: compHeight, channels: 4 }
  })
    .png()
    .toFile(`test/comparison-deltaZ${deltaZ}.png`);

  console.log(`✓ Saved comparison: test/comparison-deltaZ${deltaZ}.png`);
  console.log(`  (Left: actual target downsampled | Right: extracted from parent assembly)\n`);
}

console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log('\nThe comparison images show:');
console.log('  - LEFT: What the target region SHOULD look like (actual tile, downsampled)');
console.log('  - RIGHT: What we actually extracted from parent tile assembly');
console.log('\nIf they differ, there is a coordinate mapping bug in the assembly or extraction logic.');
