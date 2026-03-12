/**
 * WebGPU compute pipeline for simplified LSAO (single tile, no parent data)
 */

import { LSAO_SIMPLE_SHADER, createShaderModule } from './lsao-simple-shaders.js';

/**
 * Create compute pipeline for simple LSAO
 *
 * @param {GPUDevice} device - WebGPU device
 * @param {Object} options - Pipeline options
 * @param {number} options.tileSize - Tile size in pixels (default: 512)
 * @param {number} options.tileBuffer - Buffer pixels on each edge (default: 1)
 * @param {number} options.workgroupSize - Workgroup size (default: 128)
 * @returns {{pipeline: GPUComputePipeline, bindGroupLayout: GPUBindGroupLayout}}
 */
export function createSimpleLSAOPipeline(device: GPUDevice, options: { tileSize?: number; tileBuffer?: number; workgroupSize?: number } = {}) {
  const tileSize = options.tileSize || 512;
  const tileBuffer = options.tileBuffer || 1;
  const workgroupSize = options.workgroupSize || 128;

  // Create shader module
  const shaderModule = createShaderModule(device, LSAO_SIMPLE_SHADER);

  // Create bind group layout
  // Binding 0: Uniform buffer (sweep params with dynamic offset)
  // Binding 1: Read-only storage buffer (terrain data)
  // Binding 2: Read-write storage buffer (output AO data)
  const bindGroupLayout = device.createBindGroupLayout({
    label: 'Simple LSAO bind group layout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform", hasDynamicOffset: true }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" }
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" }
      }
    ]
  });

  // Create pipeline layout
  const pipelineLayout = device.createPipelineLayout({
    label: 'Simple LSAO pipeline layout',
    bindGroupLayouts: [bindGroupLayout]
  });

  // Create compute pipeline
  const pipeline = device.createComputePipeline({
    label: 'Simple LSAO compute pipeline',
    layout: pipelineLayout,
    compute: {
      module: shaderModule,
      entryPoint: "main",
      constants: {
        tileSize,
        tileBuffer,
        workgroupSize
      }
    }
  });

  return { pipeline, bindGroupLayout };
}

/**
 * Pack uniform data for a single sweep direction
 *
 * @param {Object} params
 * @param {[number, number]} params.tileSize - Tile dimensions [width, height]
 * @param {[number, number]} params.step - Sweep direction [dx, dy]
 * @param {number} params.buffer - Tile buffer size
 * @param {number} params.pixelSize - Pixel size in meters
 * @param {number} params.normalization - Normalization factor (1/num_directions)
 * @returns {Uint8Array} Packed uniform data (256 bytes aligned)
 */
export function packSimpleLSAOUniforms({
  tileSize,
  step,
  buffer,
  pixelSize,
  normalization
}: {
  tileSize: [number, number];
  step: [number, number];
  buffer: number;
  pixelSize: number;
  normalization: number;
}): Uint8Array {
  // Align to 256 bytes for dynamic offset
  const uniformSize = 256;
  const bytes = new Uint8Array(uniformSize);
  const i32 = new Int32Array(bytes.buffer);
  const u32 = new Uint32Array(bytes.buffer);
  const f32 = new Float32Array(bytes.buffer);

  // struct UniformStruct layout:
  u32[0] = tileSize[0];        // tilesize.x
  u32[1] = tileSize[1];        // tilesize.y
  i32[2] = step[0];            // step.x
  i32[3] = step[1];            // step.y
  u32[4] = buffer;             // buffer
  f32[5] = pixelSize;          // pixelSize
  f32[6] = normalization;      // normalization
  f32[7] = 0;                  // padding1
  f32[8] = 0;                  // padding2
  f32[9] = 0;                  // padding3

  return bytes;
}
