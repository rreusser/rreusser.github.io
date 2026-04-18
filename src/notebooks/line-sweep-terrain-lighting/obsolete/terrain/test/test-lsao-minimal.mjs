/**
 * Minimal LSAO test - just verify computation works
 */

import { createWebGPUContext } from '../data/webgpu-context-node.js';
import { createLSAOPipeline, calculateLevelInfo } from '../../compute/lsao-pipeline.js';
import { computeLSAO } from '../../compute/lsao-execute.js';

function createSyntheticTerrain(size) {
  const data = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = size / 2;
      const cy = size / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      data[y * size + x] = Math.max(0, 1000 - dist * 5);
    }
  }
  return data;
}

async function test() {
  console.log('Minimal LSAO Test\n');

  const targetData = createSyntheticTerrain(514);
  const parent768 = createSyntheticTerrain(768);

  const { device } = await createWebGPUContext();
  console.log('✓ WebGPU initialized');

  const levelInfo = [calculateLevelInfo(-1, 512)];
  const { pipeline, bindGroupLayout } = createLSAOPipeline(device, {
    tileSize: 512,
    tileBuffer: 1,
    numLevels: 1,
    workgroupSize: 128
  });
  console.log('✓ Pipeline created');

  const aoData = await computeLSAO({
    device,
    pipeline,
    bindGroupLayout,
    targetData,
    parentLevels: [parent768],
    levelInfo,
    tileSize: 512,
    pixelSize: 19.1,
    workgroupSize: 128,
    directions: [[1, 0], [-1, 0]]
  });

  console.log('✓ LSAO computed');
  console.log(`  Output size: ${aoData.length}`);
  console.log(`  Expected: ${512 * 512}`);

  // Calculate stats without spread operator (avoids stack overflow)
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (let i = 0; i < aoData.length; i++) {
    min = Math.min(min, aoData[i]);
    max = Math.max(max, aoData[i]);
    sum += aoData[i];
  }

  console.log(`  Min: ${min.toFixed(4)}`);
  console.log(`  Max: ${max.toFixed(4)}`);
  console.log(`  Mean: ${(sum / aoData.length).toFixed(4)}`);
  console.log(`  First 10 values: ${Array.from(aoData.slice(0, 10)).map(v => v.toFixed(3)).join(', ')}`);

  console.log('\n✓ Test PASSED!');

  // Clean up device
  device.destroy();
}

test().catch(err => {
  console.error('FAILED:', err);
  console.error(err.stack);
  process.exit(1);
});
