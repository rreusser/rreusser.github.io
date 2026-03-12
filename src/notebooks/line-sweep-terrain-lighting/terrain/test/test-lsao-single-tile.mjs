/**
 * Test single-tile LSAO (no parent data)
 *
 * Demonstrates the basic LSAO algorithm without parent tile complexity:
 * 1. Fetch a single terrain tile
 * 2. Run simplified LSAO compute shader
 * 3. Save results
 */

import { getTerrainTile } from '../data/fetch-tile-sharp.js';
import { createWebGPUContext } from '../data/webgpu-context-node.js';
import { createSimpleLSAOPipeline } from '../../compute/lsao-simple-pipeline.js';
import { computeSimpleLSAO } from '../../compute/lsao-simple-execute.js';
import { saveAsImage, getStats } from '../data/save-image-node.js';

async function testSingleTileLSAO() {
  console.log('=== Single-Tile LSAO (No Parent Data) ===\n');

  // Test tile (Mount Shasta area)
  const targetTile = { x: 795, y: 1594, z: 12 };
  console.log(`Target tile: z=${targetTile.z}, x=${targetTile.x}, y=${targetTile.y}\n`);

  // Step 1: Fetch target tile
  console.log('Step 1: Fetching target tile...');
  const tile = await getTerrainTile(targetTile);
  console.log(`  ✓ Fetched tile (${tile.width}×${tile.height})\n`);

  // Step 2: Initialize WebGPU
  console.log('Step 2: Initializing WebGPU...');
  const { device } = await createWebGPUContext();
  console.log(`  ✓ WebGPU context created\n`);

  // Step 3: Create LSAO pipeline
  console.log('Step 3: Creating simple LSAO pipeline...');
  const { pipeline, bindGroupLayout } = createSimpleLSAOPipeline(device, {
    tileSize: 512,
    tileBuffer: 1,
    workgroupSize: 128
  });
  console.log(`  ✓ Pipeline created\n`);

  // Step 4: Compute LSAO
  console.log('Step 4: Computing LSAO...');
  const EARTH_CIRCUMFERENCE = 40075017;
  const pixelSize = EARTH_CIRCUMFERENCE / 512 / Math.pow(2, targetTile.z);
  console.log(`  Pixel size: ${pixelSize.toFixed(2)}m`);
  console.log(`  Directions: 4 cardinal (E, W, N, S)`);

  const startTime = performance.now();

  const aoData = await computeSimpleLSAO({
    device,
    pipeline,
    bindGroupLayout,
    terrainData: tile.data,
    tileSize: 512,
    pixelSize,
    workgroupSize: 128,
    directions: [[1, 0], [-1, 0], [0, 1], [0, -1]]
  });

  const elapsed = performance.now() - startTime;
  console.log(`  ✓ Computation complete in ${elapsed.toFixed(1)}ms\n`);

  // Step 5: Analyze results
  console.log('Step 5: Analyzing results...');
  const stats = getStats(aoData);
  console.log(`  AO range: ${stats.min.toFixed(3)} to ${stats.max.toFixed(3)}`);
  console.log(`  Mean: ${stats.mean.toFixed(3)}\n`);

  // Step 6: Save outputs
  console.log('Step 6: Saving outputs...');

  try {
    // Normalize AO data to [0, 1] range
    console.log('  Normalizing AO data...');
    const aoNormalized = new Float32Array(aoData.length);
    for (let i = 0; i < aoData.length; i++) {
      aoNormalized[i] = (aoData[i] - stats.min) / (stats.max - stats.min);
    }

    // Save AO result
    console.log('  Saving AO result...');
    await saveAsImage(aoNormalized, 512, 'test/lsao-single-tile-ao.png');
    console.log(`  ✓ Saved: test/lsao-single-tile-ao.png`);
  } catch (err) {
    console.error('  ✗ Failed to save AO:', err.message);
    console.error(err.stack);
  }

  try {
    // Save elevation for comparison
    console.log('  Normalizing and saving elevation...');
    const elevNormalized = new Float32Array(512 * 512);
    const elevStats = getStats(tile.data);
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const srcIdx = (y + 1) * tile.width + (x + 1);
        const dstIdx = y * 512 + x;
        elevNormalized[dstIdx] = (tile.data[srcIdx] - elevStats.min) / (elevStats.max - elevStats.min);
      }
    }
    await saveAsImage(elevNormalized, 512, 'test/lsao-single-tile-elevation.png');
    console.log(`  ✓ Saved: test/lsao-single-tile-elevation.png`);

    // Create combined visualization (AO × elevation)
    console.log('  Creating combined visualization...');
    const combined = new Float32Array(512 * 512);
    for (let i = 0; i < combined.length; i++) {
      combined[i] = aoData[i] * elevNormalized[i];
    }
    await saveAsImage(combined, 512, 'test/lsao-single-tile-combined.png');
    console.log(`  ✓ Saved: test/lsao-single-tile-combined.png`);
  } catch (err) {
    console.error('  ✗ Failed to save elevation/combined:', err.message);
  }

  console.log('\n=== Success! ===');
  console.log('View results:');
  console.log('  open test/lsao-single-tile-ao.png         # Pure AO');
  console.log('  open test/lsao-single-tile-elevation.png  # Elevation');
  console.log('  open test/lsao-single-tile-combined.png   # AO × Elevation');
  console.log('\nNote: This single-tile version uses edge replication.');
  console.log('Boundary artifacts may be visible at tile edges.');
  console.log('For better results, use the full LSAO with parent tiles (test/test-lsao.mjs).');
}

testSingleTileLSAO().catch(err => {
  console.error('Error:', err);
  console.error(err.stack);
  process.exit(1);
});
