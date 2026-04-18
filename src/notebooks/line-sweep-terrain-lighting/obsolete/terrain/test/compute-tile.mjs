#!/usr/bin/env node

/**
 * End-to-end test: Fetch terrain tile and compute lighting using WebGPU
 *
 * This demonstrates the complete pipeline:
 * 1. Fetch terrain tile from Mapbox
 * 2. Decode elevation data
 * 3. Set up WebGPU compute pipeline
 * 4. Execute lighting computation on GPU
 * 5. Save results as images
 */

import { getTerrainTile } from '../data/fetch-tile-sharp.js';
import { getTileSet } from '../tile-hierarchy.js';
import { saveAsImage, getStats } from '../data/save-image-node.js';
import { createWebGPUContext } from '../data/webgpu-context-node.js';
import { createLightingPipeline } from '../../compute/pipeline.js';
import { computeTileLighting } from '../../compute/execute.js';
import sharp from 'sharp';

// Target tile coordinates
const coords = { x: 795, y: 1594, z: 12 };

console.log('=== Hierarchical Terrain Lighting Pipeline ===\n');

// Step 1: Tile Hierarchy
console.log('1. Computing tile hierarchy...');
const tiles = getTileSet(coords);
console.log(`   Target: ${coords.z}/${coords.x}/${coords.y}`);
console.log(`   Requires ${tiles.length} tiles (1 target + ${tiles.length - 1} parents)`);
tiles.forEach(t => {
  if (t.role !== 'target') {
    console.log(`   - ${t.role}: ${t.z}/${t.x}/${t.y}`);
  }
});

// Step 2: Fetch terrain tile
console.log('\n2. Fetching terrain tile...');
const tile = await getTerrainTile(coords);
console.log(`   ✓ Fetched: ${tile.width}×${tile.height} (tileSize=${tile.tileSize}, buffer=${tile.buffer})`);

const elevStats = getStats(tile.data);
console.log(`   Elevation: ${elevStats.min.toFixed(1)}m to ${elevStats.max.toFixed(1)}m (mean: ${elevStats.mean.toFixed(1)}m)`);

// Step 3: Prepare buffered terrain data
console.log('\n3. Preparing buffered terrain data...');
const tileSize = tile.tileSize;
const buffer = 1;
const bufferedSize = tileSize + 2 * buffer;
const bufferedData = new Float32Array(bufferedSize * bufferedSize);

// Copy target tile to center with edge replication
for (let y = 0; y < tileSize; y++) {
  for (let x = 0; x < tileSize; x++) {
    const srcIdx = (y + tile.buffer) * tile.width + (x + tile.buffer);
    const dstIdx = (y + buffer) * bufferedSize + (x + buffer);
    bufferedData[dstIdx] = tile.data[srcIdx];
  }
}

// Replicate edges (TODO: use parent tile data)
for (let x = 0; x < bufferedSize; x++) {
  bufferedData[x] = bufferedData[bufferedSize + x];
  bufferedData[(bufferedSize - 1) * bufferedSize + x] = bufferedData[(bufferedSize - 2) * bufferedSize + x];
}
for (let y = 0; y < bufferedSize; y++) {
  bufferedData[y * bufferedSize] = bufferedData[y * bufferedSize + 1];
  bufferedData[y * bufferedSize + (bufferedSize - 1)] = bufferedData[y * bufferedSize + (bufferedSize - 2)];
}

console.log(`   ✓ Buffered data: ${bufferedSize}×${bufferedSize}`);

// Step 4: Initialize WebGPU
console.log('\n4. Initializing WebGPU (Node.js)...');
const { device, adapter } = await createWebGPUContext();
console.log('   ✓ WebGPU adapter acquired');
console.log('   ✓ WebGPU device created');

// Step 5: Create compute pipeline
console.log('\n5. Creating compute pipeline...');
const { pipeline, bindGroupLayout } = createLightingPipeline(device, {
  tileSize,
  tileBuffer: buffer
});
console.log('   ✓ WGSL shader compiled');
console.log('   ✓ Compute pipeline ready');

// Step 6: Execute computation
console.log('\n6. Computing lighting on GPU...');
const EARTH_CIRCUMFERENCE = 40075017;
const pixelSize = EARTH_CIRCUMFERENCE / tileSize / Math.pow(2, coords.z);

const result = await computeTileLighting({
  device,
  pipeline,
  bindGroupLayout,
  terrainData: bufferedData,
  tileSize,
  pixelSize
});

const lightStats = getStats(result);
console.log(`   ✓ Computation complete`);
console.log(`   Lighting: ${lightStats.min.toFixed(3)} to ${lightStats.max.toFixed(3)} (mean: ${lightStats.mean.toFixed(3)})`);
console.log(`   Pixel size: ${pixelSize.toFixed(3)}m`);

// Step 7: Save visualizations
console.log('\n7. Saving visualizations...');

// Save lighting result
await saveAsImage(result, tileSize, 'test/lighting-result.png');
console.log('   ✓ Saved lighting result to test/lighting-result.png');

// Save elevation heatmap for comparison
const elevationViz = new Float32Array(tileSize * tileSize);
for (let i = 0; i < elevationViz.length; i++) {
  const y = Math.floor(i / tileSize);
  const x = i % tileSize;
  const srcIdx = (y + tile.buffer) * tile.width + (x + tile.buffer);
  elevationViz[i] = (tile.data[srcIdx] - elevStats.min) / (elevStats.max - elevStats.min);
}
await saveAsImage(elevationViz, tileSize, 'test/elevation-normalized.png');
console.log('   ✓ Saved normalized elevation to test/elevation-normalized.png');

// Create side-by-side comparison
const comparison = new Uint8Array(tileSize * tileSize * 2 * 3);
for (let y = 0; y < tileSize; y++) {
  for (let x = 0; x < tileSize; x++) {
    const i = y * tileSize + x;

    // Left side: elevation (grayscale)
    const elev = Math.floor(elevationViz[i] * 255);
    const leftIdx = (y * tileSize * 2 + x) * 3;
    comparison[leftIdx] = elev;
    comparison[leftIdx + 1] = elev;
    comparison[leftIdx + 2] = elev;

    // Right side: lighting (grayscale)
    const light = Math.floor(Math.min(Math.max(result[i], 0), 1) * 255);
    const rightIdx = (y * tileSize * 2 + (x + tileSize)) * 3;
    comparison[rightIdx] = light;
    comparison[rightIdx + 1] = light;
    comparison[rightIdx + 2] = light;
  }
}

await sharp(comparison, {
  raw: {
    width: tileSize * 2,
    height: tileSize,
    channels: 3
  }
})
.png()
.toFile('test/comparison.png');
console.log('   ✓ Saved side-by-side comparison to test/comparison.png');

console.log('\n=== Pipeline Complete ===');
console.log('\nGenerated images:');
console.log('  • test/elevation-normalized.png  - Elevation data (normalized)');
console.log('  • test/lighting-result.png       - Computed lighting');
console.log('  • test/comparison.png            - Side-by-side (elevation | lighting)');
console.log('\nRun: open test/comparison.png');

// Cleanup - remove navigator reference so Node can exit
// Note: Don't call device.destroy() as it may cause crashes with webgpu package
// The device will be cleaned up when the navigator reference is removed
console.log('\nCleaning up...');
process.exit(0); // Force exit after completion
