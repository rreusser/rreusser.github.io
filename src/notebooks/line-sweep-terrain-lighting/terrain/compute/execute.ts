/**
 * WebGPU compute execution for terrain lighting
 */

interface ComputeTileLightingParams {
  device: GPUDevice;
  pipeline: GPUComputePipeline;
  bindGroupLayout: GPUBindGroupLayout;
  terrainData: Float32Array;
  tileSize: number;
  pixelSize: number;
}

/**
 * Create GPU buffer for terrain data
 *
 * @param {GPUDevice} device - WebGPU device
 * @param {Float32Array} data - Terrain elevation data
 * @returns {GPUBuffer}
 */
function createTerrainBuffer(device: GPUDevice, data: Float32Array): GPUBuffer {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
    label: 'Terrain data buffer'
  });
  new Float32Array(buffer.getMappedRange()).set(data);
  buffer.unmap();
  return buffer;
}

/**
 * Create GPU buffer for uniforms
 *
 * Uniform layout:
 * - tileSizeX: u32 (offset 0)
 * - tileSizeY: u32 (offset 4)
 * - pixelSize: f32 (offset 8)
 * - padding: f32 (offset 12)
 *
 * @param {GPUDevice} device - WebGPU device
 * @param {Object} params - Uniform parameters
 * @param {number} params.tileSize - Tile size in pixels
 * @param {number} params.pixelSize - Size of one pixel in meters
 * @returns {GPUBuffer}
 */
function createUniformBuffer(device: GPUDevice, params: { tileSize: number; pixelSize: number }): GPUBuffer {
  const uniformData = new ArrayBuffer(16); // 4 * 4 bytes, aligned to 16
  const view = new DataView(uniformData);
  view.setUint32(0, params.tileSize, true); // tileSizeX
  view.setUint32(4, params.tileSize, true); // tileSizeY
  view.setFloat32(8, params.pixelSize, true); // pixelSize
  view.setFloat32(12, 0, true); // padding

  const buffer = device.createBuffer({
    size: uniformData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
    label: 'Uniform buffer'
  });
  new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(uniformData));
  buffer.unmap();
  return buffer;
}

/**
 * Create GPU buffer for output data
 *
 * @param {GPUDevice} device - WebGPU device
 * @param {number} tileSize - Tile size in pixels
 * @returns {GPUBuffer}
 */
function createOutputBuffer(device: GPUDevice, tileSize: number): GPUBuffer {
  const size = tileSize * tileSize * Float32Array.BYTES_PER_ELEMENT;
  const buffer = device.createBuffer({
    size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    label: 'Output buffer'
  });
  return buffer;
}

/**
 * Read data back from GPU buffer to CPU
 *
 * @param {GPUDevice} device - WebGPU device
 * @param {GPUBuffer} buffer - Buffer to read from
 * @param {number} size - Number of elements to read
 * @returns {Promise<Float32Array>} Result data
 */
async function readBuffer(device: GPUDevice, buffer: GPUBuffer, size: number): Promise<Float32Array> {
  const byteSize = size * size * Float32Array.BYTES_PER_ELEMENT;

  // Create staging buffer for readback
  const stagingBuffer = device.createBuffer({
    size: byteSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    label: 'Staging buffer'
  });

  // Copy GPU buffer to staging buffer
  const encoder = device.createCommandEncoder({ label: 'Readback encoder' });
  encoder.copyBufferToBuffer(buffer, 0, stagingBuffer, 0, byteSize);
  device.queue.submit([encoder.finish()]);

  // Wait for GPU work to complete
  await device.queue.onSubmittedWorkDone();

  // Map and read staging buffer
  await stagingBuffer.mapAsync(GPUMapMode.READ);
  const data = new Float32Array(stagingBuffer.getMappedRange()).slice();
  stagingBuffer.unmap();
  stagingBuffer.destroy();

  return data;
}

/**
 * Execute lighting computation for a tile
 *
 * @param {Object} params - Computation parameters
 * @param {GPUDevice} params.device - WebGPU device
 * @param {GPUComputePipeline} params.pipeline - Compute pipeline
 * @param {GPUBindGroupLayout} params.bindGroupLayout - Bind group layout
 * @param {Float32Array} params.terrainData - Buffered terrain elevation data
 * @param {number} params.tileSize - Tile size in pixels (without buffer)
 * @param {number} params.pixelSize - Size of one pixel in meters
 * @returns {Promise<Float32Array>} Computed lighting values
 */
export async function computeTileLighting({
  device,
  pipeline,
  bindGroupLayout,
  terrainData,
  tileSize,
  pixelSize
}: ComputeTileLightingParams): Promise<Float32Array> {
  // Create GPU buffers
  const terrainBuffer = createTerrainBuffer(device, terrainData);
  const uniformBuffer = createUniformBuffer(device, { tileSize, pixelSize });
  const outputBuffer = createOutputBuffer(device, tileSize);

  // Create bind group
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: terrainBuffer } },
      { binding: 2, resource: { buffer: outputBuffer } }
    ],
    label: 'Lighting bind group'
  });

  // Encode and submit compute pass
  const encoder = device.createCommandEncoder({ label: 'Lighting compute encoder' });
  const pass = encoder.beginComputePass({ label: 'Lighting compute pass' });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);

  // Dispatch workgroups (16x16 workgroup size)
  const workgroupsX = Math.ceil(tileSize / 16);
  const workgroupsY = Math.ceil(tileSize / 16);
  pass.dispatchWorkgroups(workgroupsX, workgroupsY);
  pass.end();

  device.queue.submit([encoder.finish()]);

  // Read back results
  const result = await readBuffer(device, outputBuffer, tileSize);

  // Cleanup
  terrainBuffer.destroy();
  uniformBuffer.destroy();
  outputBuffer.destroy();

  return result;
}
