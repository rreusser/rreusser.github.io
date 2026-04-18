#!/usr/bin/env node

/**
 * Simplified end-to-end test focusing on WebGPU computation
 */

import { getTerrainTile } from '../data/fetch-tile-sharp.js';
import { saveAsImage } from '../data/save-image-node.js';
import { createWebGPUContext } from '../data/webgpu-context-node.js';
import { createLightingPipeline } from '../../compute/pipeline.js';
import { computeTileLighting } from '../../compute/execute.js';

const coords = { x: 795, y: 1594, z: 12 };

console.log('Fetching tile...');
const tile = await getTerrainTile(coords);
console.log(`✓ Fetched ${tile.tileSize}×${tile.tileSize}`);

// Prepare buffered data
const tileSize = tile.tileSize;
const buffer = 1;
const bufferedSize = tileSize + 2 * buffer;
const bufferedData = new Float32Array(bufferedSize * bufferedSize);

for (let y = 0; y < tileSize; y++) {
  for (let x = 0; x < tileSize; x++) {
    const srcIdx = (y + tile.buffer) * tile.width + (x + tile.buffer);
    const dstIdx = (y + buffer) * bufferedSize + (x + buffer);
    bufferedData[dstIdx] = tile.data[srcIdx];
  }
}

// Edge replication
for (let x = 0; x < bufferedSize; x++) {
  bufferedData[x] = bufferedData[bufferedSize + x];
  bufferedData[(bufferedSize - 1) * bufferedSize + x] = bufferedData[(bufferedSize - 2) * bufferedSize + x];
}
for (let y = 0; y < bufferedSize; y++) {
  bufferedData[y * bufferedSize] = bufferedData[y * bufferedSize + 1];
  bufferedData[y * bufferedSize + (bufferedSize - 1)] = bufferedData[y * bufferedSize + (bufferedSize - 2)];
}

console.log('Initializing WebGPU...');
const { device } = await createWebGPUContext();
console.log('✓ WebGPU ready');

console.log('Creating pipeline...');
const { pipeline, bindGroupLayout } = createLightingPipeline(device, { tileSize, tileBuffer: buffer });
console.log('✓ Pipeline created');

console.log('Computing lighting...');
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

// Compute stats manually to avoid crashes
let min = Infinity, max = -Infinity, sum = 0;
for (let i = 0; i < result.length; i++) {
  const v = result[i];
  if (v < min) min = v;
  if (v > max) max = v;
  sum += v;
}

console.log(`✓ Computed: ${min.toFixed(3)} to ${max.toFixed(3)} (mean: ${(sum / result.length).toFixed(3)})`);

console.log('Saving result...');
try {
  await saveAsImage(result, tileSize, 'test/lighting.png');
  console.log('✓ Saved to test/lighting.png');
} catch (err) {
  console.error('Save failed:', err.message);
}

console.log('Done!');
process.exit(0);
