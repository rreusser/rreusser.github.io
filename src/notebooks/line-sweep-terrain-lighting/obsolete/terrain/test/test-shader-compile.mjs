/**
 * Test shader compilation
 */

import { createWebGPUContext } from '../data/webgpu-context-node.js';
import { createLSAOPipeline } from '../compute/lsao-pipeline.js';

async function testShaderCompile() {
  console.log('Testing shader compilation...\n');

  // Initialize WebGPU
  const { device } = await createWebGPUContext();
  console.log('✓ WebGPU context created');

  // Test 1: Single level
  console.log('\nTest 1: Creating pipeline with 1 level...');
  try {
    const { pipeline: p1 } = createLSAOPipeline(device, {
      tileSize: 512,
      tileBuffer: 1,
      numLevels: 1,
      workgroupSize: 128
    });
    console.log('✓ 1-level pipeline created successfully');
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error('Stack:', err.stack);
    throw err;
  }

  // Test 2: Two levels
  console.log('\nTest 2: Creating pipeline with 2 levels...');
  try {
    const { pipeline: p2 } = createLSAOPipeline(device, {
      tileSize: 512,
      tileBuffer: 1,
      numLevels: 2,
      workgroupSize: 128
    });
    console.log('✓ 2-level pipeline created successfully');
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error('Stack:', err.stack);
    throw err;
  }

  console.log('\n✓ All shader compilation tests passed!');
}

testShaderCompile().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
