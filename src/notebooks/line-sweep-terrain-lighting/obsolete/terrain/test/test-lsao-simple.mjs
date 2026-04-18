/**
 * Simple LSAO test with synthetic data
 *
 * Tests the shader with simple ramp data to verify basic functionality
 */

import { createWebGPUContext } from '../data/webgpu-context-node.js';
import { createLSAOPipeline } from '../../compute/lsao-pipeline.js';
import { computeLSAO } from '../../compute/lsao-execute.js';
import { saveAsImage } from '../data/save-image-node.js';

async function testSimpleLSAO() {
  console.log('=== Simple LSAO Test ===\n');

  // Create synthetic terrain data
  const tileSize = 512;
  const bufferedSize = 514;

  console.log('Creating synthetic terrain data...');

  // Target tile: simple ramp from low to high
  const targetData = new Float32Array(bufferedSize * bufferedSize);
  for (let y = 0; y < bufferedSize; y++) {
    for (let x = 0; x < bufferedSize; x++) {
      const idx = y * bufferedSize + x;
      // Create a slope from SW to NE
      targetData[idx] = (x + y) * 0.5; // Height increases diagonally
    }
  }
  console.log('  ✓ Created 514×514 target data');

  // Parent buffer: extend the ramp
  const parentSize = 768;
  const parentData = new Float32Array(parentSize * parentSize);
  for (let y = 0; y < parentSize; y++) {
    for (let x = 0; x < parentSize; x++) {
      const idx = y * parentSize + x;
      // Extend the ramp pattern
      // Target is at [256, 512) in parent space, so we scale coordinates
      const tx = (x - 256) * 2; // Convert to target space
      const ty = (y - 256) * 2;
      parentData[idx] = (tx + ty) * 0.5;
    }
  }
  console.log('  ✓ Created 768×768 parent data\n');

  // Initialize WebGPU
  console.log('Initializing WebGPU...');
  const { device } = await createWebGPUContext();
  console.log('  ✓ Context created\n');

  // Create pipeline
  console.log('Creating pipeline...');
  const { pipeline, bindGroupLayout } = createLSAOPipeline(device, {
    tileSize: 512,
    tileBuffer: 1,
    parentSize: 768,
    workgroupSize: 128
  });
  console.log('  ✓ Pipeline created\n');

  // Compute LSAO with just ONE direction first
  console.log('Computing LSAO (single direction)...');
  const pixelSize = 10.0; // Arbitrary for testing

  try {
    const aoData = await computeLSAO({
      device,
      pipeline,
      bindGroupLayout,
      targetData,
      parentData,
      tileSize: 512,
      pixelSize,
      quadrant: 'ne', // Arbitrary, all map to same offset now
      workgroupSize: 128,
      directions: [[1, 0]] // Just east direction
    });

    console.log('  ✓ Computation succeeded!');
    console.log(`  Result size: ${aoData.length}`);

    // Calculate min/max without spread operator (stack overflow issue)
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < aoData.length; i++) {
      if (aoData[i] < min) min = aoData[i];
      if (aoData[i] > max) max = aoData[i];
    }
    console.log(`  Min: ${min.toFixed(3)}`);
    console.log(`  Max: ${max.toFixed(3)}`);

    // Save result
    await saveAsImage(aoData, 512, 'test/lsao-simple.png');
    console.log('\n✓ Saved: test/lsao-simple.png');
    console.log('SUCCESS!');
  } catch (err) {
    console.error('\n❌ Computation failed:', err);
    throw err;
  }
}

testSimpleLSAO().catch(err => {
  console.error('Error:', err);
  console.error(err.stack);
  process.exit(1);
});
