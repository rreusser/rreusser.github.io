/**
 * WebGPU compute pipeline for surface normal map generation
 */

import { NORMAL_MAP_SHADER, createShaderModule } from './normal-map-shaders.js';

/**
 * Create compute pipeline for normal map generation
 *
 * @param {GPUDevice} device - WebGPU device
 * @param {Object} options - Pipeline options
 * @param {number} options.tileSize - Tile size in pixels (default: 512)
 * @param {number} options.tileBuffer - Buffer pixels on each edge (default: 1)
 * @returns {{pipeline: GPUComputePipeline, bindGroupLayout: GPUBindGroupLayout}}
 */
export function createNormalMapPipeline(device: GPUDevice, options: { tileSize?: number; tileBuffer?: number } = {}) {
  const tileSize = options.tileSize || 512;
  const tileBuffer = options.tileBuffer || 1;

  // Create shader module
  const shaderModule = createShaderModule(device, NORMAL_MAP_SHADER);

  // Create bind group layout
  // Binding 0: Uniform buffer (tile coordinates x, y, z)
  // Binding 1: Read-only storage buffer (terrain data)
  // Binding 2: Read-write storage buffer (output RGB data)
  const bindGroupLayout = device.createBindGroupLayout({
    label: 'Normal map bind group layout',
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
    label: 'Normal map pipeline layout',
    bindGroupLayouts: [bindGroupLayout]
  });

  // Create compute pipeline
  const pipeline = device.createComputePipeline({
    label: 'Normal map compute pipeline',
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
