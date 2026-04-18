/**
 * WebGPU compute pipeline for LSAO with parent tile support
 */

import { LSAO_SHADER, createShaderModule } from './lsao-shaders.js';
import type { LSAOPipeline, LSAOPipelineOptions } from './types.js';

/**
 * Create compute pipeline for multi-level LSAO
 *
 * Sets up the complete compute pipeline including:
 * - Shader module compilation
 * - Bind group layout (uniforms, target/parent buffers, output)
 * - Pipeline layout and compilation
 */
export function createLSAOPipeline(
  device: GPUDevice,
  options: LSAOPipelineOptions = {}
): LSAOPipeline {
  const tileSize = options.tileSize || 512;
  const tileBuffer = options.tileBuffer || 1;
  const numLevels = options.numLevels || 1;
  const workgroupSize = options.workgroupSize || 128;

  if (numLevels < 1 || numLevels > 4) {
    throw new Error(`numLevels must be 1-4, got ${numLevels}`);
  }

  // Calculate max sweep size from outermost level
  // For N levels: bufferSize = floor(tileSize * (1 + 2^N))
  const maxDeltaZ = -numLevels;
  const maxSweepSize = Math.floor(tileSize * (1 + Math.pow(2, Math.abs(maxDeltaZ))));

  // Create shader module
  const shaderModule = createShaderModule(device, LSAO_SHADER);

  // Create bind group layout with all 4 parent buffer bindings
  // (Shader always declares all 4, so we always need all 4 bindings)
  // Binding 0: Uniform buffer (dynamic offset)
  // Binding 1: Target terrain (514×514)
  // Binding 2: Output AO (512×512)
  // Binding 3-6: Parent level buffers (always 4 bindings, unused ones get dummy buffers)
  const entries: GPUBindGroupLayoutEntry[] = [
    {
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "uniform" as GPUBufferBindingType, hasDynamicOffset: true }
    },
    {
      binding: 1,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "read-only-storage" as GPUBufferBindingType }
    },
    {
      binding: 2,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "storage" as GPUBufferBindingType }
    },
    {
      binding: 3,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "read-only-storage" as GPUBufferBindingType }
    },
    {
      binding: 4,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "read-only-storage" as GPUBufferBindingType }
    },
    {
      binding: 5,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "read-only-storage" as GPUBufferBindingType }
    },
    {
      binding: 6,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "read-only-storage" as GPUBufferBindingType }
    }
  ];

  const bindGroupLayout = device.createBindGroupLayout({
    label: 'Multi-level LSAO bind group layout',
    entries
  });

  // Create pipeline layout
  const pipelineLayout = device.createPipelineLayout({
    label: 'Multi-level LSAO pipeline layout',
    bindGroupLayouts: [bindGroupLayout]
  });

  // Create compute pipeline
  const pipeline = device.createComputePipeline({
    label: 'Multi-level LSAO compute pipeline',
    layout: pipelineLayout,
    compute: {
      module: shaderModule,
      entryPoint: "main",
      constants: {
        tileSize,
        tileBuffer,
        maxSweepSize,
        numLevels,
        workgroupSize
      }
    }
  });

  return { pipeline, bindGroupLayout };
}

/**
 * Pack uniform data for a single sweep direction (multi-level)
 */
export function packLSAOUniforms(params: import('./types.js').LSAOUniformParams): Uint8Array {
  const { tileSize, step, buffer, pixelSize, normalization, levels } = params;
  // Align to 256 bytes for dynamic offset
  const uniformSize = 256;
  const bytes = new Uint8Array(uniformSize);
  const i32 = new Int32Array(bytes.buffer);
  const u32 = new Uint32Array(bytes.buffer);
  const f32 = new Float32Array(bytes.buffer);

  // Base uniforms (first 40 bytes)
  u32[0] = tileSize[0];           // offset 0: tilesize.x
  u32[1] = tileSize[1];           // offset 4: tilesize.y
  i32[2] = step[0];               // offset 8: step.x
  i32[3] = step[1];               // offset 12: step.y
  u32[4] = buffer;                // offset 16: buffer
  f32[5] = pixelSize;             // offset 20: pixelSize
  f32[6] = normalization;         // offset 24: normalization
  u32[7] = levels.length;         // offset 28: numLevels
  f32[8] = 0;                     // offset 32: padding1
  f32[9] = 0;                     // offset 36: padding2
  f32[10] = 0;                    // offset 40: padding to align to 48
  f32[11] = 0;                    // offset 44: padding to align to 48

  // Per-level metadata (starting at byte offset 48, index 12)
  // @align(16) means levels array starts at offset 48 (multiple of 16)
  // Each level: 32 bytes (8 floats)
  let offset = 12;
  for (let i = 0; i < 4; i++) {
    if (i < levels.length) {
      const level = levels[i];

      // Validate level data
      if (!level.targetOffset || level.targetOffset.length !== 2) {
        throw new Error(`Level ${i} missing or invalid targetOffset: ${JSON.stringify(level)}`);
      }

      u32[offset++] = level.bufferSize;
      f32[offset++] = level.scale;
      f32[offset++] = level.coverageMin[0];
      f32[offset++] = level.coverageMin[1];
      f32[offset++] = level.coverageMax[0];
      f32[offset++] = level.coverageMax[1];
      f32[offset++] = level.targetOffset[0];
      f32[offset++] = level.targetOffset[1];
    } else {
      // Mark unused level with bufferSize = 0
      u32[offset++] = 0;
      offset += 7; // Skip rest
    }
  }

  return bytes;
}

/**
 * Calculate target tile offset in parent buffer space based on quadrant
 *
 * The target tile (512×512 at z) occupies 256×256 in parent space (z-1).
 * Position depends on which quadrant the target is in within its parent.
 *
 * Analysis of assembly layout:
 * - 4 parent tiles assembled into 1024×1024
 * - Target is in one quadrant of parent-base (256×256 region at parent res)
 * - Extraction takes 768×768 from 1024×1024
 * - Target position in 768×768 depends on extraction offset and target quadrant
 */
export function getTargetOffsetInParent(quadrant: 'nw' | 'ne' | 'sw' | 'se'): [number, number] {
  // Grid layout and extraction logic (see parent-tile-assembly-multi-level.js):
  //
  // NW quadrant: parent-base at (512, 512) in assembly, extraction (256, 256)
  //   → target in NW of parent-base: (512+0, 512+0) to (512+256, 512+256) in assembly
  //   → after extraction: (512-256, 512-256) to (768-256, 768-256) = (256, 256) to (512, 512)
  //
  // NE quadrant: parent-base at (0, 512) in assembly, extraction (0, 256)
  //   → target in NE of parent-base: (0+256, 512+0) to (0+512, 512+256) in assembly
  //   → after extraction: (256-0, 512-256) to (512-0, 768-256) = (256, 256) to (512, 512)
  //
  // SW quadrant: parent-base at (512, 0) in assembly, extraction (256, 0)
  //   → target in SW of parent-base: (512+0, 0+256) to (512+256, 0+512) in assembly
  //   → after extraction: (512-256, 256-0) to (768-256, 512-0) = (256, 256) to (512, 512)
  //
  // SE quadrant: parent-base at (0, 0) in assembly, extraction (0, 0)
  //   → target in SE of parent-base: (0+256, 0+256) to (0+512, 0+512) in assembly
  //   → after extraction: (256-0, 256-0) to (512-0, 512-0) = (256, 256) to (512, 512)

  // All quadrants result in target at (256, 256) to (512, 512) in the 768×768 buffer!
  // This is because the extraction is specifically designed to center the target.
  return [256, 256];
}

/**
 * Calculate metadata for a parent level
 */
export function calculateLevelInfo(
  deltaZ: number,
  tileSize: number = 512,
  targetOffset: [number, number] | null = null
): import('./types.js').LevelInfo {
  if (deltaZ >= 0) {
    throw new Error(`deltaZ must be negative, got ${deltaZ}`);
  }

  const stepsUp = Math.abs(deltaZ);
  const scale = Math.pow(2, stepsUp);
  const bufferSize = Math.floor(tileSize * (1 + Math.pow(2, deltaZ)));

  // Default: target is centered in buffer
  // Target size at this level's resolution
  const targetSizeAtLevel = tileSize / scale;
  const defaultOffset: [number, number] = [(bufferSize - targetSizeAtLevel) / 2, (bufferSize - targetSizeAtLevel) / 2];
  const actualOffset: [number, number] = targetOffset || defaultOffset;

  // Coverage in normalized space based on actual buffer size and target position
  // Normalized coordinates: 1.0 = tileSize pixels at target resolution
  // Buffer extends beyond target - calculate actual coverage
  const leftMargin = actualOffset[0] * scale / tileSize;  // Convert to normalized units
  const topMargin = actualOffset[1] * scale / tileSize;
  const rightMargin = (bufferSize - actualOffset[0] - targetSizeAtLevel) * scale / tileSize;
  const bottomMargin = (bufferSize - actualOffset[1] - targetSizeAtLevel) * scale / tileSize;

  return {
    bufferSize,
    scale,
    coverageMin: [-leftMargin, -topMargin],
    coverageMax: [1 + rightMargin, 1 + bottomMargin],
    targetOffset: actualOffset  // Position of target within buffer (in buffer pixel coordinates)
  };
}
