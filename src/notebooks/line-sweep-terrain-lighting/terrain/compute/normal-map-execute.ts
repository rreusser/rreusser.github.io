/**
 * Normal map computation execution
 */

interface ComputeNormalMapParams {
  device: GPUDevice;
  pipeline: GPUComputePipeline;
  bindGroupLayout: GPUBindGroupLayout;
  terrainData: Float32Array;
  tileX: number;
  tileY: number;
  tileZ: number;
  tileSize?: number;
}

/**
 * Compute surface normals for a terrain tile
 *
 * @param {Object} params
 * @param {GPUDevice} params.device - WebGPU device
 * @param {GPUComputePipeline} params.pipeline - Normal map compute pipeline
 * @param {GPUBindGroupLayout} params.bindGroupLayout - Bind group layout
 * @param {Float32Array} params.terrainData - Buffered terrain data
 * @param {number} params.tileX - Tile X coordinate
 * @param {number} params.tileY - Tile Y coordinate
 * @param {number} params.tileZ - Tile Z (zoom) level
 * @param {number} params.tileSize - Tile size (default: 512)
 * @returns {Promise<Float32Array>} RGB normal map data (vec3 per pixel)
 */
export async function computeNormalMap({
  device,
  pipeline,
  bindGroupLayout,
  terrainData,
  tileX,
  tileY,
  tileZ,
  tileSize = 512
}: ComputeNormalMapParams): Promise<Float32Array> {
  const tileBuffer = 1;
  const bufferedSize = tileSize + 2 * tileBuffer;

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

  // Create uniform buffer with tile coordinates
  const uniformData = new Uint32Array([tileX, tileY, tileZ, 0]);
  const uniformBuffer = device.createBuffer({
    size: uniformData.byteLength,
    label: 'Normal map uniforms',
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
  });
  new Uint32Array(uniformBuffer.getMappedRange()).set(uniformData);
  uniformBuffer.unmap();

  // Create output buffer (vec3<f32> per pixel with 16-byte alignment)
  // Each vec3 occupies 16 bytes (4 floats) due to alignment requirements
  const outputSize = tileSize * tileSize * 4 * Float32Array.BYTES_PER_ELEMENT;
  const outputBuffer = device.createBuffer({
    size: outputSize,
    label: 'Normal map output',
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });

  // Create bind group
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    label: 'Normal map bind group',
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: terrainBuffer } },
      { binding: 2, resource: { buffer: outputBuffer } }
    ]
  });

  // Encode compute pass
  const encoder = device.createCommandEncoder({ label: 'Normal map encoder' });
  const pass = encoder.beginComputePass({ label: 'Normal map compute pass' });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);

  // Dispatch workgroups (16×16 workgroup size)
  const workgroupsX = Math.ceil(tileSize / 16);
  const workgroupsY = Math.ceil(tileSize / 16);
  pass.dispatchWorkgroups(workgroupsX, workgroupsY);
  pass.end();

  // Create staging buffer for readback
  const stagingBuffer = device.createBuffer({
    size: outputSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    label: 'Normal map staging buffer'
  });

  // Copy output to staging
  encoder.copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, outputSize);

  // Submit commands
  device.queue.submit([encoder.finish()]);

  // Read back results
  await stagingBuffer.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(stagingBuffer.getMappedRange()).slice();
  stagingBuffer.unmap();

  // Cleanup
  terrainBuffer.destroy();
  uniformBuffer.destroy();
  outputBuffer.destroy();
  stagingBuffer.destroy();

  return result;
}
