/**
 * Pipeline creation for Multiscale Turing Patterns
 *
 * Sets up all compute and render pipelines used in the simulation.
 */

import { FFTPipelines, createFFTPipelines } from './lib/webgpu-fft/fft.js';
import type { FFTPrecision } from './lib/webgpu-fft/fft.js';

// Import shaders as raw strings at build time
import initializeSource from './shaders/initialize.wgsl?raw';
import extractSource from './shaders/extract.wgsl?raw';
import convolveSource from './shaders/convolve.wgsl?raw';
import updateSource from './shaders/update.wgsl?raw';
import fullscreenSource from './shaders/fullscreen.wgsl?raw';
import visualizeSource from './shaders/visualize.wgsl?raw';

export interface TuringPipelines {
  // FFT pipelines
  fft: FFTPipelines;

  // Compute pipelines
  initialize: GPUComputePipeline;
  extract: GPUComputePipeline;
  convolve: GPUComputePipeline;
  update: GPUComputePipeline;

  // Visualization render pipeline
  visualize: GPURenderPipeline;

  // Bind group layouts
  bindGroupLayouts: {
    initialize: GPUBindGroupLayout;
    extract: GPUBindGroupLayout;
    convolve: GPUBindGroupLayout;
    update: GPUBindGroupLayout;
    visualize: GPUBindGroupLayout;
  };
}

/**
 * Create all pipelines for the Turing pattern simulation
 * @param precision Storage precision for FFT buffers: 'f16' for half-precision, 'f32' for single precision
 */
export async function createTuringPipelines(
  device: GPUDevice,
  canvasFormat: GPUTextureFormat,
  N: number,
  precision: FFTPrecision = 'f32'
): Promise<TuringPipelines> {
  // Create FFT pipelines with specified precision
  const fft = createFFTPipelines(device, N, precision);

  // Helper to adapt shader source to the specified precision
  // Shaders are written with f16 by default, replace with f32 if needed
  const adaptShader = (source: string): string => {
    if (precision === 'f32') {
      return source
        .replace(/enable f16;/g, '') // Remove f16 enable directive
        .replace(/vec4<f16>/g, 'vec4<f32>')
        .replace(/vec2<f16>/g, 'vec2<f32>')
        .replace(/array<vec4<f16>>/g, 'array<vec4<f32>>')
        .replace(/array<vec2<f16>>/g, 'array<vec2<f32>>');
    }
    return source;
  };

  // Create shader modules with precision-adapted code
  const initializeModule = device.createShaderModule({
    label: 'Initialize shader',
    code: adaptShader(initializeSource)
  });

  const extractModule = device.createShaderModule({
    label: 'Extract shader',
    code: adaptShader(extractSource)
  });

  const convolveModule = device.createShaderModule({
    label: 'Convolve shader',
    code: adaptShader(convolveSource)
  });

  const updateModule = device.createShaderModule({
    label: 'Update shader',
    code: adaptShader(updateSource)
  });

  const fullscreenModule = device.createShaderModule({
    label: 'Fullscreen vertex shader',
    code: fullscreenSource // No precision-dependent types
  });

  const visualizeModule = device.createShaderModule({
    label: 'Visualize shader',
    code: adaptShader(visualizeSource)
  });

  // ============================================================================
  // Bind Group Layouts
  // ============================================================================

  // Initialize: output buffer + params
  const initializeBindGroupLayout = device.createBindGroupLayout({
    label: 'Initialize bind group layout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage' as GPUBufferBindingType }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'uniform' as GPUBufferBindingType }
      }
    ]
  });

  // Extract: solution input + complex output + params
  const extractBindGroupLayout = device.createBindGroupLayout({
    label: 'Extract bind group layout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' as GPUBufferBindingType }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage' as GPUBufferBindingType }
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'uniform' as GPUBufferBindingType }
      }
    ]
  });

  // Convolve: fhat input + output + params
  const convolveBindGroupLayout = device.createBindGroupLayout({
    label: 'Convolve bind group layout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' as GPUBufferBindingType }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage' as GPUBufferBindingType }
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'uniform' as GPUBufferBindingType }
      }
    ]
  });

  // Update: solution_in + activator_inhibitor + solution_out + params + scaleParams
  const updateBindGroupLayout = device.createBindGroupLayout({
    label: 'Update bind group layout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' as GPUBufferBindingType }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' as GPUBufferBindingType }
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage' as GPUBufferBindingType }
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'uniform' as GPUBufferBindingType }
      },
      {
        binding: 4,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' as GPUBufferBindingType }
      }
    ]
  });

  // Visualize: solution buffer + params + viewInverse
  const visualizeBindGroupLayout = device.createBindGroupLayout({
    label: 'Visualize bind group layout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'read-only-storage' as GPUBufferBindingType }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' as GPUBufferBindingType }
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' as GPUBufferBindingType }
      }
    ]
  });

  // ============================================================================
  // Pipeline Layouts
  // ============================================================================

  const initializePipelineLayout = device.createPipelineLayout({
    label: 'Initialize pipeline layout',
    bindGroupLayouts: [initializeBindGroupLayout]
  });

  const extractPipelineLayout = device.createPipelineLayout({
    label: 'Extract pipeline layout',
    bindGroupLayouts: [extractBindGroupLayout]
  });

  const convolvePipelineLayout = device.createPipelineLayout({
    label: 'Convolve pipeline layout',
    bindGroupLayouts: [convolveBindGroupLayout]
  });

  const updatePipelineLayout = device.createPipelineLayout({
    label: 'Update pipeline layout',
    bindGroupLayouts: [updateBindGroupLayout]
  });

  const visualizePipelineLayout = device.createPipelineLayout({
    label: 'Visualize pipeline layout',
    bindGroupLayouts: [visualizeBindGroupLayout]
  });

  // ============================================================================
  // Compute Pipelines
  // ============================================================================

  const initialize = device.createComputePipeline({
    label: 'Initialize pipeline',
    layout: initializePipelineLayout,
    compute: {
      module: initializeModule,
      entryPoint: 'initialize'
    }
  });

  const extract = device.createComputePipeline({
    label: 'Extract pipeline',
    layout: extractPipelineLayout,
    compute: {
      module: extractModule,
      entryPoint: 'extract'
    }
  });

  const convolve = device.createComputePipeline({
    label: 'Convolve pipeline',
    layout: convolvePipelineLayout,
    compute: {
      module: convolveModule,
      entryPoint: 'convolve'
    }
  });

  const update = device.createComputePipeline({
    label: 'Update pipeline',
    layout: updatePipelineLayout,
    compute: {
      module: updateModule,
      entryPoint: 'update'
    }
  });

  // ============================================================================
  // Render Pipeline
  // ============================================================================

  const visualize = device.createRenderPipeline({
    label: 'Visualize pipeline',
    layout: visualizePipelineLayout,
    vertex: {
      module: fullscreenModule,
      entryPoint: 'fullscreen'
    },
    fragment: {
      module: visualizeModule,
      entryPoint: 'visualize',
      targets: [
        {
          format: canvasFormat
        }
      ]
    },
    primitive: {
      topology: 'triangle-list'
    }
  });

  return {
    fft,
    initialize,
    extract,
    convolve,
    update,
    visualize,
    bindGroupLayouts: {
      initialize: initializeBindGroupLayout,
      extract: extractBindGroupLayout,
      convolve: convolveBindGroupLayout,
      update: updateBindGroupLayout,
      visualize: visualizeBindGroupLayout
    }
  };
}
