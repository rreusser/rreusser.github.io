/**
 * Test Multi-Level LSAO with synthetic data
 *
 * Uses simple synthetic elevation data to test the pipeline without
 * relying on tile fetching which may be causing crashes.
 */

import { createWebGPUContext } from '../data/webgpu-context-node.js';
import { createLSAOPipeline, calculateLevelInfo } from '../compute/lsao-pipeline.js';
import { computeLSAO } from '../compute/lsao-execute.js';
import { saveAsImage } from '../data/save-image-node.js';

function createSyntheticTerrain(size, pattern = 'slope') {
  const data = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;

      if (pattern === 'slope') {
        // Simple diagonal slope
        data[idx] = (x + y) * 10;
      } else if (pattern === 'cone') {
        // Cone/pyramid shape
        const cx = size / 2;
        const cy = size / 2;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        data[idx] = Math.max(0, 1000 - dist * 5);
      }
    }
  }

  return data;
}

async function testSyntheticLSAO() {
  console.log('=== Synthetic Multi-Level LSAO Test ===\n');

  // Create synthetic terrain data
  console.log('Creating synthetic terrain...');
  const targetData = createSyntheticTerrain(514, 'cone'); // Buffered 512+2
  const parent768 = createSyntheticTerrain(768, 'cone');
  const parent640 = createSyntheticTerrain(640, 'cone');
  console.log('✓ Created synthetic terrain\n');

  // Initialize WebGPU
  console.log('Initializing WebGPU...');
  const { device } = await createWebGPUContext();
  console.log('✓ WebGPU context created\n');

  // Test 1: Single level
  console.log('TEST 1: Single-level LSAO');
  console.log('='.repeat(40));

  // For synthetic data, we create centered buffers, so targetOffset is calculated by default
  const levelInfo1 = [calculateLevelInfo(-1, 512)];
  console.log('Level -1 info:', levelInfo1[0]);

  const { pipeline: pipeline1, bindGroupLayout: bindGroupLayout1 } = createLSAOPipeline(device, {
    tileSize: 512,
    tileBuffer: 1,
    numLevels: 1,
    workgroupSize: 128
  });
  console.log('✓ Created pipeline with 1 level');

  const aoData1 = await computeLSAO({
    device,
    pipeline: pipeline1,
    bindGroupLayout: bindGroupLayout1,
    targetData,
    parentLevels: [parent768],
    levelInfo: levelInfo1,
    tileSize: 512,
    pixelSize: 19.1,
    workgroupSize: 128,
    directions: [[1, 0], [-1, 0], [0, 1], [0, -1]]
  });
  console.log('✓ Computed LSAO');

  await saveAsImage(aoData1, 512, 'test/lsao-synthetic-1level.png');
  console.log('✓ Saved to test/lsao-synthetic-1level.png\n');

  // Test 2: Two levels
  console.log('TEST 2: Two-level LSAO');
  console.log('='.repeat(40));

  const levelInfo2 = [
    calculateLevelInfo(-1, 512),
    calculateLevelInfo(-2, 512)
  ];
  console.log('Level -1 info:', levelInfo2[0]);
  console.log('Level -2 info:', levelInfo2[1]);

  const { pipeline: pipeline2, bindGroupLayout: bindGroupLayout2 } = createLSAOPipeline(device, {
    tileSize: 512,
    tileBuffer: 1,
    numLevels: 2,
    workgroupSize: 128
  });
  console.log('✓ Created pipeline with 2 levels');

  let aoData2;
  try {
    aoData2 = await computeLSAO({
      device,
      pipeline: pipeline2,
      bindGroupLayout: bindGroupLayout2,
      targetData,
      parentLevels: [parent768, parent640],
      levelInfo: levelInfo2,
      tileSize: 512,
      pixelSize: 19.1,
      workgroupSize: 128,
      directions: [[1, 0], [-1, 0], [0, 1], [0, -1]]
    });
    console.log('✓ Computed LSAO');
  } catch (err) {
    console.error('COMPUTE ERROR:', err.message);
    console.error('Stack:', err.stack);
    throw err;
  }

  await saveAsImage(aoData2, 512, 'test/lsao-synthetic-2level.png');
  console.log('✓ Saved to test/lsao-synthetic-2level.png\n');

  console.log('='.repeat(40));
  console.log('All synthetic tests PASSED!');
  console.log('='.repeat(40));
}

testSyntheticLSAO().catch(err => {
  console.error('Test failed:', err);
  console.error('\nStack:', err.stack);
  process.exit(1);
});
