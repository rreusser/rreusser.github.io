/**
 * Simple test to validate pipeline compilation
 */

import { createWebGPUContext } from '../data/webgpu-context-node.js';
import { createLSAOPipeline, calculateLevelInfo } from '../../compute/lsao-pipeline.js';

async function testPipelineCompile() {
  console.log('Testing pipeline compilation...\n');

  const { device } = await createWebGPUContext();
  console.log('✓ WebGPU context created');

  try {
    const { pipeline, bindGroupLayout } = createLSAOPipeline(device, {
      tileSize: 512,
      tileBuffer: 1,
      numLevels: 1,
      workgroupSize: 128
    });
    console.log('✓ Pipeline created successfully with 1 level');

    const levelInfo = calculateLevelInfo(-1, 512);
    console.log(`✓ Level info calculated:`, levelInfo);

    console.log('\n=== Pipeline compilation test PASSED ===');
  } catch (error) {
    console.error('Pipeline compilation FAILED:', error);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

testPipelineCompile();
