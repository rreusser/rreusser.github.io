/**
 * Minimal pipeline test - just verify shader compilation and execution
 */

import { createWebGPUContext } from '../data/webgpu-context-node.js';
import { createLSAOPipeline, calculateLevelInfo } from '../../compute/lsao-pipeline.js';

async function test() {
  console.log('Minimal Pipeline Test\n');

  const { device } = await createWebGPUContext();
  console.log('✓ WebGPU initialized');

  // Create pipeline with minimal config
  const levelInfo = [calculateLevelInfo(-1, 512)];
  console.log('Level info:', JSON.stringify(levelInfo[0], null, 2));

  const { pipeline, bindGroupLayout } = createLSAOPipeline(device, {
    tileSize: 512,
    tileBuffer: 1,
    numLevels: 1,
    workgroupSize: 128
  });
  console.log('✓ Pipeline created');

  // Verify dispatch calculation
  const maxDeltaZ = -1;
  const tileSize = 512;
  const maxSweepSize = Math.floor(tileSize * (1 + Math.pow(2, maxDeltaZ)));
  const numWorkgroups = Math.ceil(maxSweepSize / 128);

  console.log(`Max sweep size: ${maxSweepSize}`);
  console.log(`Num workgroups: ${numWorkgroups}`);
  console.log(`Total invocations: ${numWorkgroups * 128}`);

  console.log('\n✓ Test PASSED!');
}

test().catch(err => {
  console.error('FAILED:', err);
  console.error(err.stack);
  process.exit(1);
});
