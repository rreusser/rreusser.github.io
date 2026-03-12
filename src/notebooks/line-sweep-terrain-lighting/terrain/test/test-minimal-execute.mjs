/**
 * Minimal LSAO execution test
 */

import { createWebGPUContext } from '../data/webgpu-context-node.js';
import { createLSAOPipeline, calculateLevelInfo } from '../compute/lsao-pipeline.js';
import { computeLSAO } from '../compute/lsao-execute.js';

async function testMinimalExecute() {
  console.log('=== Minimal LSAO Execution Test ===\n');

  // Initialize WebGPU
  const { device } = await createWebGPUContext();
  console.log('✓ WebGPU context created\n');

  // Create minimal synthetic data (all zeros)
  console.log('Creating minimal data...');
  const targetData = new Float32Array(514 * 514); // All zeros
  const parent768 = new Float32Array(768 * 768);   // All zeros
  console.log('✓ Created data buffers\n');

  // Test with 1 level, 1 direction to minimize complexity
  console.log('Test: 1 level, 1 direction');
  const levelInfo = [calculateLevelInfo(-1, 512)];
  console.log('Level info:', levelInfo[0]);

  const { pipeline, bindGroupLayout } = createLSAOPipeline(device, {
    tileSize: 512,
    tileBuffer: 1,
    numLevels: 1,
    workgroupSize: 128
  });
  console.log('✓ Pipeline created');

  console.log('\nExecuting compute...');
  try {
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
      directions: [[1, 0]]  // Only one direction
    });
    console.log('✓ Compute succeeded!');
    console.log(`Output size: ${aoData.length}`);
    console.log(`Sample values: ${aoData.slice(0, 5)}`);
  } catch (err) {
    console.error('COMPUTE FAILED:', err.message);
    console.error('Stack:', err.stack);
    throw err;
  }

  console.log('\n✓ Test passed!');
}

testMinimalExecute().catch(err => {
  console.error('\nTest failed:', err);
  process.exit(1);
});
