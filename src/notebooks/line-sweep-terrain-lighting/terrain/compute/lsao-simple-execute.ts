/**
 * Simple LSAO computation execution (single tile, no parent data)
 */

import { packSimpleLSAOUniforms } from './lsao-simple-pipeline.js';

interface ComputeSimpleLSAOParams {
  device: GPUDevice;
  pipeline: GPUComputePipeline;
  bindGroupLayout: GPUBindGroupLayout;
  terrainData: Float32Array;
  tileSize: number;
  pixelSize: number;
  workgroupSize?: number;
  directions?: [number, number][];
}

/**
 * Compute LSAO for a single tile (no parent buffer)
 *
 * @param {Object} params
 * @param {GPUDevice} params.device - WebGPU device
 * @param {GPUComputePipeline} params.pipeline - LSAO compute pipeline
 * @param {GPUBindGroupLayout} params.bindGroupLayout - Bind group layout
 * @param {Float32Array} params.terrainData - Buffered terrain data (514×514)
 * @param {number} params.tileSize - Tile size (512)
 * @param {number} params.pixelSize - Pixel size in meters
 * @param {number} [params.workgroupSize=128] - Workgroup size
 * @param {Array<[number, number]>} [params.directions] - Sweep directions
 * @returns {Promise<Float32Array>} AO values [0,1] for each pixel
 */
export async function computeSimpleLSAO({
  device,
  pipeline,
  bindGroupLayout,
  terrainData,
  tileSize,
  pixelSize,
  workgroupSize = 128,
  directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]
}: ComputeSimpleLSAOParams): Promise<Float32Array> {
  const tileBuffer = 1;
  const bufferedSize = tileSize + 2 * tileBuffer;
  const outputSize = tileSize * tileSize;

  // Validate input size
  if (terrainData.length !== bufferedSize * bufferedSize) {
    throw new Error(
      `Terrain data size mismatch: expected ${bufferedSize}×${bufferedSize}, got ${terrainData.length}`
    );
  }

  // Create GPU buffers
  const terrainBuffer = device.createBuffer({
    size: terrainData.byteLength,
    label: 'Terrain buffer',
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
  });
  new Float32Array(terrainBuffer.getMappedRange()).set(terrainData);
  terrainBuffer.unmap();

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
    const uniformData = packSimpleLSAOUniforms({
      tileSize: [tileSize, tileSize],
      step: directions[i],
      buffer: tileBuffer,
      pixelSize,
      normalization
    });

    device.queue.writeBuffer(
      uniformBuffer,
      i * uniformSizePerDirection,
      uniformData as GPUAllowSharedBufferSource
    );
  }

  // Create bind group
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    label: 'Simple LSAO bind group',
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          offset: 0,
          size: uniformSizePerDirection
        }
      },
      { binding: 1, resource: { buffer: terrainBuffer } },
      { binding: 2, resource: { buffer: outputBuffer } }
    ]
  });

  // Encode compute passes
  const encoder = device.createCommandEncoder({ label: 'Simple LSAO encoder' });

  // Clear output buffer
  encoder.clearBuffer(outputBuffer);

  // Single compute pass with all directions
  const pass = encoder.beginComputePass({ label: 'Simple LSAO compute pass' });
  pass.setPipeline(pipeline);

  // Dispatch all directions
  const numWorkgroups = Math.ceil(tileSize / workgroupSize);
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

  // Read back results
  await stagingBuffer.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(stagingBuffer.getMappedRange()).slice();
  stagingBuffer.unmap();

  // Cleanup
  terrainBuffer.destroy();
  outputBuffer.destroy();
  uniformBuffer.destroy();
  stagingBuffer.destroy();

  return result;
}
