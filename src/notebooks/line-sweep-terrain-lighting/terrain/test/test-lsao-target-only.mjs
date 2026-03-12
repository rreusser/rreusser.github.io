/**
 * Test LSAO with target-only sweep (no parent levels)
 * This tests if the crash is related to parent buffer sampling
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
  console.log('Target-Only LSAO Test\n');

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

  // Use only 1 direction to minimize complexity
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
    directions: [[1, 0]]  // Just one direction
  });

  console.log('✓ LSAO computed');
  console.log(`  Output size: ${aoData.length}`);

  // Calculate stats
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < aoData.length; i++) {
    min = Math.min(min, aoData[i]);
    max = Math.max(max, aoData[i]);
  }

  console.log(`  Min: ${min.toFixed(4)}`);
  console.log(`  Max: ${max.toFixed(4)}`);

  console.log('\n✓ Test PASSED!');

  device.destroy();
}

test().catch(err => {
  console.error('FAILED:', err);
  console.error(err.stack);
  process.exit(1);
});
