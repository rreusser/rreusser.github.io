/**
 * LSAO computation execution
 *
 * Manages GPU buffers and executes LSAO compute passes with parent tile support
 */

import { packLSAOUniforms } from './lsao-pipeline.js';
import type { LSAOComputeParams } from './types.js';

/**
 * Compute multi-level LSAO for a tile
 */
export async function computeLSAO(params: LSAOComputeParams): Promise<Float32Array> {
  const {
    device,
    pipeline,
    bindGroupLayout,
    targetData,
    parentLevels,
    levelInfo,
    tileSize,
    pixelSize,
    workgroupSize = 128,
    directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  } = params;
  const tileBuffer = 1;
  const numLevels = parentLevels.length;

  if (numLevels < 1 || numLevels > 4) {
    throw new Error(`numLevels must be 1-4, got ${numLevels}`);
  }

  // Calculate dimensions
  const bufferedSize = tileSize + 2 * tileBuffer;
  const outputSize = tileSize * tileSize;

  // Validate input sizes
  if (targetData.length !== bufferedSize * bufferedSize) {
    throw new Error(`Target data size mismatch: expected ${bufferedSize}×${bufferedSize}, got ${targetData.length}`);
  }

  for (let i = 0; i < numLevels; i++) {
    const expectedSize = levelInfo[i].bufferSize * levelInfo[i].bufferSize;
    if (parentLevels[i].length !== expectedSize) {
      throw new Error(`Parent level ${i} size mismatch: expected ${expectedSize}, got ${parentLevels[i].length}`);
    }
  }

  // Create GPU buffers
  const targetBuffer = device.createBuffer({
    size: targetData.byteLength,
    label: 'Target terrain buffer',
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
  });
  new Float32Array(targetBuffer.getMappedRange()).set(targetData);
  targetBuffer.unmap();

  // Create parent buffers for each level (always create 4 buffers)
  // Unused levels get small dummy buffers
  const parentBuffers = [];
  for (let i = 0; i < 4; i++) {
    if (i < numLevels) {
      const data = parentLevels[i];
      const buffer = device.createBuffer({
        size: data.byteLength,
        label: `Parent level ${i} buffer`,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      new Float32Array(buffer.getMappedRange()).set(data);
      buffer.unmap();
      parentBuffers.push(buffer);
    } else {
      // Create dummy buffer for unused level (make it reasonably sized)
      const dummySize = 256; // Small but not minimal
      const dummyBuffer = device.createBuffer({
        size: dummySize * Float32Array.BYTES_PER_ELEMENT,
        label: `Parent level ${i} buffer (dummy)`,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      new Float32Array(dummyBuffer.getMappedRange()).fill(0);
      dummyBuffer.unmap();
      parentBuffers.push(dummyBuffer);
    }
  }

  const outputBuffer = device.createBuffer({
    size: outputSize * Float32Array.BYTES_PER_ELEMENT,
    label: 'AO output buffer',
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
  });
  new Float32Array(outputBuffer.getMappedRange()).fill(0);
  outputBuffer.unmap();

  // Create uniform buffer (one set per direction with dynamic offset)
  const uniformSizePerDirection = 256;
  const uniformBuffer = device.createBuffer({
    size: uniformSizePerDirection * directions.length,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  // Pack uniforms for each direction
  const normalization = 1.0 / directions.length;

  for (let i = 0; i < directions.length; i++) {
    const uniformData = packLSAOUniforms({
      tileSize: [tileSize, tileSize],
      step: directions[i],
      buffer: tileBuffer,
      pixelSize,
      normalization,
      levels: levelInfo
    });

    device.queue.writeBuffer(
      uniformBuffer,
      i * uniformSizePerDirection,
      uniformData as GPUAllowSharedBufferSource
    );
  }

  // Create bind group with all 4 parent buffers (including dummy buffers)
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    label: 'Multi-level LSAO bind group',
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          offset: 0,
          size: uniformSizePerDirection
        }
      },
      { binding: 1, resource: { buffer: targetBuffer } },
      { binding: 2, resource: { buffer: outputBuffer } },
      { binding: 3, resource: { buffer: parentBuffers[0] } },
      { binding: 4, resource: { buffer: parentBuffers[1] } },
      { binding: 5, resource: { buffer: parentBuffers[2] } },
      { binding: 6, resource: { buffer: parentBuffers[3] } }
    ]
  });

  // Encode compute passes
  const encoder = device.createCommandEncoder({ label: 'LSAO encoder' });

  // Clear output buffer
  encoder.clearBuffer(outputBuffer);

  // Single compute pass with all directions
  const pass = encoder.beginComputePass({ label: 'LSAO compute pass' });
  pass.setPipeline(pipeline);

  // Calculate max sweep size (must match pipeline calculation)
  const maxDeltaZ = -numLevels;
  const maxSweepSize = Math.floor(tileSize * (1 + Math.pow(2, Math.abs(maxDeltaZ))));

  // Dispatch all directions (dispatch based on maxSweepSize, not tileSize!)
  const numWorkgroups = Math.ceil(maxSweepSize / workgroupSize);
  for (let i = 0; i < directions.length; i++) {
    pass.setBindGroup(0, bindGroup, [i * uniformSizePerDirection]);
    pass.dispatchWorkgroups(numWorkgroups);
  }

  pass.end();

  // Create staging buffer for readback
  const stagingBuffer = device.createBuffer({
    size: outputSize * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    label: 'Staging buffer'
  });

  // Copy output to staging
  encoder.copyBufferToBuffer(
    outputBuffer,
    0,
    stagingBuffer,
    0,
    outputSize * Float32Array.BYTES_PER_ELEMENT
  );

  // Submit commands
  device.queue.submit([encoder.finish()]);

  // Wait for GPU to complete all work
  await device.queue.onSubmittedWorkDone();

  // Read back results
  await stagingBuffer.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(stagingBuffer.getMappedRange()).slice();
  stagingBuffer.unmap();

  // Cleanup
  targetBuffer.destroy();
  parentBuffers.forEach(b => b.destroy());
  outputBuffer.destroy();
  uniformBuffer.destroy();
  stagingBuffer.destroy();

  return result;
}
