/**
 * WebGPU compute pipeline creation for terrain lighting
 */

import { LIGHTING_SHADER, createShaderModule } from './shaders.js';

/**
 * Create compute pipeline for terrain lighting
 *
 * Sets up the complete compute pipeline including:
 * - Shader module compilation
 * - Bind group layout (uniforms, input/output buffers)
 * - Pipeline layout and compilation
 *
 * @param {GPUDevice} device - WebGPU device
 * @param {Object} options - Pipeline options
 * @param {number} options.tileSize - Tile size in pixels (default: 512)
 * @param {number} options.tileBuffer - Buffer pixels on each edge (default: 1)
 * @returns {{pipeline: GPUComputePipeline, bindGroupLayout: GPUBindGroupLayout}}
 */
export function createLightingPipeline(device: GPUDevice, options: { tileSize?: number; tileBuffer?: number } = {}) {
  const tileSize = options.tileSize || 512;
  const tileBuffer = options.tileBuffer || 1;

  // Create shader module
  const shaderModule = createShaderModule(device, LIGHTING_SHADER);

  // Create bind group layout
  // Binding 0: Uniform buffer (tile size, pixel size)
  // Binding 1: Read-only storage buffer (terrain data)
  // Binding 2: Read-write storage buffer (output data)
  const bindGroupLayout = device.createBindGroupLayout({
    label: 'Lighting bind group layout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" }
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
    label: 'Lighting pipeline layout',
    bindGroupLayouts: [bindGroupLayout]
  });

  // Create compute pipeline
  const pipeline = device.createComputePipeline({
    label: 'Lighting compute pipeline',
    layout: pipelineLayout,
    compute: {
      module: shaderModule,
      entryPoint: "main",
      constants: {
        tileSize,
        tileBuffer
      }
    }
  });

  return { pipeline, bindGroupLayout };
}
