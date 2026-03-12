/**
 * Pipeline creation for KS equation solver
 *
 * Sets up all compute and render pipelines used in the simulation.
 */

import { FFTPipelines, createFFTPipelines } from './lib/webgpu-fft/fft.js';

// Import shaders as raw strings at build time
import initializeSource from './shaders/initialize.wgsl?raw';
import differentiateSource from './shaders/differentiate.wgsl?raw';
import extractMixedDerivativesSource from './shaders/extract_mixed_derivatives.wgsl?raw';
import computeABSource from './shaders/compute_ab.wgsl?raw';
import packABhatSource from './shaders/pack_abhat.wgsl?raw';
import computeNonlinearSource from './shaders/compute_nonlinear.wgsl?raw';
import bdfUpdateSource from './shaders/bdf_update.wgsl?raw';
import extractRealSource from './shaders/extract_real.wgsl?raw';
import fullscreenSource from './shaders/fullscreen.wgsl?raw';
import visualizeSource from './shaders/visualize.wgsl?raw';

export interface KSPipelines {
  // FFT pipelines
  fft: FFTPipelines;

  // Physics compute pipelines
  initialize: GPUComputePipeline;
  differentiate: GPUComputePipeline;
  extractMixedDerivatives: GPUComputePipeline;
  computeAB: GPUComputePipeline;
  packABhat: GPUComputePipeline;
  computeNonlinear: GPUComputePipeline;
  bdfUpdate: GPUComputePipeline;
  extractReal: GPUComputePipeline;

  // Visualization render pipeline
  visualize: GPURenderPipeline;

  // Bind group layouts
  bindGroupLayouts: {
    initialize: GPUBindGroupLayout;
    differentiate: GPUBindGroupLayout;
    extractMixedDerivatives: GPUBindGroupLayout;
    computeAB: GPUBindGroupLayout;
    packABhat: GPUBindGroupLayout;
    computeNonlinear: GPUBindGroupLayout;
    bdfUpdate: GPUBindGroupLayout;
    extractReal: GPUBindGroupLayout;
    visualize: GPUBindGroupLayout;
  };
}


/**
 * Create all pipelines for the KS equation solver
 */
export async function createKSPipelines(
  device: GPUDevice,
  canvasFormat: GPUTextureFormat,
  N: number
): Promise<KSPipelines> {
  // Create FFT pipelines
  const fft = createFFTPipelines(device, N);

  // Create shader modules
  const initializeModule = device.createShaderModule({
    label: 'Initialize shader',
    code: initializeSource
  });

  const differentiateModule = device.createShaderModule({
    label: 'Differentiate shader',
    code: differentiateSource
  });

  const extractMixedDerivativesModule = device.createShaderModule({
    label: 'Extract mixed derivatives shader',
    code: extractMixedDerivativesSource
  });

  const computeABModule = device.createShaderModule({
    label: 'Compute AB shader',
    code: computeABSource
  });

  const packABhatModule = device.createShaderModule({
    label: 'Pack ABhat shader',
    code: packABhatSource
  });

  const computeNonlinearModule = device.createShaderModule({
    label: 'Compute nonlinear shader',
    code: computeNonlinearSource
  });

  const bdfUpdateModule = device.createShaderModule({
    label: 'BDF update shader',
    code: bdfUpdateSource
  });

  const extractRealModule = device.createShaderModule({
    label: 'Extract real shader',
    code: extractRealSource
  });

  const fullscreenModule = device.createShaderModule({
    label: 'Fullscreen vertex shader',
    code: fullscreenSource
  });

  const visualizeModule = device.createShaderModule({
    label: 'Visualize shader',
    code: visualizeSource
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

  // Differentiate: Vhat input + vec4 output + params
  const differentiateBindGroupLayout = device.createBindGroupLayout({
    label: 'Differentiate bind group layout',
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

  // Extract mixed derivatives: vec4 input + vec2 output + params
  const extractMixedDerivativesBindGroupLayout = device.createBindGroupLayout({
    label: 'Extract mixed derivatives bind group layout',
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

  // Compute AB: VxVy input + A output + B output + params
  const computeABBindGroupLayout = device.createBindGroupLayout({
    label: 'Compute AB bind group layout',
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
        buffer: { type: 'storage' as GPUBufferBindingType }
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'uniform' as GPUBufferBindingType }
      }
    ]
  });

  // Pack ABhat: Ahat input + Bhat input + ABhat output + params
  const packABhatBindGroupLayout = device.createBindGroupLayout({
    label: 'Pack ABhat bind group layout',
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
      }
    ]
  });

  // Compute nonlinear: V_VxVy input + AB output + params
  const computeNonlinearBindGroupLayout = device.createBindGroupLayout({
    label: 'Compute nonlinear bind group layout',
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

  // BDF update: 4 input buffers + 1 output buffer + params
  const bdfUpdateBindGroupLayout = device.createBindGroupLayout({
    label: 'BDF update bind group layout',
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
        buffer: { type: 'read-only-storage' as GPUBufferBindingType }
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' as GPUBufferBindingType }
      },
      {
        binding: 4,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage' as GPUBufferBindingType }
      },
      {
        binding: 5,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'uniform' as GPUBufferBindingType }
      }
    ]
  });

  // Extract real: input + output + params
  const extractRealBindGroupLayout = device.createBindGroupLayout({
    label: 'Extract real bind group layout',
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

  // Visualize: V buffer + params + colorscale texture + sampler + viewInverse
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
        texture: { sampleType: 'float' as GPUTextureSampleType }
      },
      {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: { type: 'filtering' as GPUSamplerBindingType }
      },
      {
        binding: 4,
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

  const differentiatePipelineLayout = device.createPipelineLayout({
    label: 'Differentiate pipeline layout',
    bindGroupLayouts: [differentiateBindGroupLayout]
  });

  const extractMixedDerivativesPipelineLayout = device.createPipelineLayout({
    label: 'Extract mixed derivatives pipeline layout',
    bindGroupLayouts: [extractMixedDerivativesBindGroupLayout]
  });

  const computeABPipelineLayout = device.createPipelineLayout({
    label: 'Compute AB pipeline layout',
    bindGroupLayouts: [computeABBindGroupLayout]
  });

  const packABhatPipelineLayout = device.createPipelineLayout({
    label: 'Pack ABhat pipeline layout',
    bindGroupLayouts: [packABhatBindGroupLayout]
  });

  const computeNonlinearPipelineLayout = device.createPipelineLayout({
    label: 'Compute nonlinear pipeline layout',
    bindGroupLayouts: [computeNonlinearBindGroupLayout]
  });

  const bdfUpdatePipelineLayout = device.createPipelineLayout({
    label: 'BDF update pipeline layout',
    bindGroupLayouts: [bdfUpdateBindGroupLayout]
  });

  const extractRealPipelineLayout = device.createPipelineLayout({
    label: 'Extract real pipeline layout',
    bindGroupLayouts: [extractRealBindGroupLayout]
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

  const differentiate = device.createComputePipeline({
    label: 'Differentiate pipeline',
    layout: differentiatePipelineLayout,
    compute: {
      module: differentiateModule,
      entryPoint: 'differentiate'
    }
  });

  const extractMixedDerivatives = device.createComputePipeline({
    label: 'Extract mixed derivatives pipeline',
    layout: extractMixedDerivativesPipelineLayout,
    compute: {
      module: extractMixedDerivativesModule,
      entryPoint: 'extract_mixed_derivatives'
    }
  });

  const computeAB = device.createComputePipeline({
    label: 'Compute AB pipeline',
    layout: computeABPipelineLayout,
    compute: {
      module: computeABModule,
      entryPoint: 'compute_ab'
    }
  });

  const packABhat = device.createComputePipeline({
    label: 'Pack ABhat pipeline',
    layout: packABhatPipelineLayout,
    compute: {
      module: packABhatModule,
      entryPoint: 'pack_abhat'
    }
  });

  const computeNonlinear = device.createComputePipeline({
    label: 'Compute nonlinear pipeline',
    layout: computeNonlinearPipelineLayout,
    compute: {
      module: computeNonlinearModule,
      entryPoint: 'compute_nonlinear'
    }
  });

  const bdfUpdate = device.createComputePipeline({
    label: 'BDF update pipeline',
    layout: bdfUpdatePipelineLayout,
    compute: {
      module: bdfUpdateModule,
      entryPoint: 'bdf_update'
    }
  });

  const extractReal = device.createComputePipeline({
    label: 'Extract real pipeline',
    layout: extractRealPipelineLayout,
    compute: {
      module: extractRealModule,
      entryPoint: 'extract_real'
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
    differentiate,
    extractMixedDerivatives,
    computeAB,
    packABhat,
    computeNonlinear,
    bdfUpdate,
    extractReal,
    visualize,
    bindGroupLayouts: {
      initialize: initializeBindGroupLayout,
      differentiate: differentiateBindGroupLayout,
      extractMixedDerivatives: extractMixedDerivativesBindGroupLayout,
      computeAB: computeABBindGroupLayout,
      packABhat: packABhatBindGroupLayout,
      computeNonlinear: computeNonlinearBindGroupLayout,
      bdfUpdate: bdfUpdateBindGroupLayout,
      extractReal: extractRealBindGroupLayout,
      visualize: visualizeBindGroupLayout
    }
  };
}
