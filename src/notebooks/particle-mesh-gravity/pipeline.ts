/**
 * Pipeline creation for Particle-Mesh Gravity simulation
 */

import { FFTPipelines, createFFTPipelines, Vec4FFTPipelines, createVec4FFTPipelines } from './lib/webgpu-fft/fft.js';
import type { FFTPrecision } from './lib/webgpu-fft/fft.js';

// Import shaders
import clearGridSource from './shaders/clear_grid.wgsl?raw';
import accumulateSource from './shaders/accumulate.wgsl?raw';
import convertDensitySource from './shaders/convert_density.wgsl?raw';
import poissonSolveSource from './shaders/poisson_solve.wgsl?raw';
import integrateSource from './shaders/integrate.wgsl?raw';
import visualizeSource from './shaders/visualize.wgsl?raw';
import fullscreenSource from './shaders/fullscreen.wgsl?raw';
import visualizeDensitySource from './shaders/visualize_density.wgsl?raw';
import visualizeGradientSource from './shaders/visualize_gradient.wgsl?raw';

// Inject precision into shader source
function injectPrecision(source: string, precision: FFTPrecision): string {
  const floatType = precision === 'f16' ? 'f16' : 'f32';
  const enableDirective = precision === 'f16' ? 'enable f16;\n' : '';

  return source
    .replace('// PRECISION_ENABLE', enableDirective)
    .replace(/FLOAT_TYPE/g, floatType);
}

export interface GravityPipelines {
  fft: FFTPipelines;
  fftVec4: Vec4FFTPipelines;

  clearGrid: GPUComputePipeline;
  accumulate: GPUComputePipeline;
  convertDensity: GPUComputePipeline;
  poissonSolve: GPUComputePipeline;
  integrate: GPUComputePipeline;
  visualize: GPURenderPipeline;
  visualizeDensity: GPURenderPipeline;
  visualizeDensityAdditive: GPURenderPipeline;
  visualizeGradient: GPURenderPipeline;

  bindGroupLayouts: {
    clearGrid: GPUBindGroupLayout;
    accumulate: GPUBindGroupLayout;
    convertDensity: GPUBindGroupLayout;
    poissonSolve: GPUBindGroupLayout;
    integrate: GPUBindGroupLayout;
    visualize: GPUBindGroupLayout;
    visualizeDensity: GPUBindGroupLayout;
    visualizeGradient: GPUBindGroupLayout;
  };
}

export async function createGravityPipelines(
  device: GPUDevice,
  canvasFormat: GPUTextureFormat,
  N: number,
  precision: FFTPrecision = 'f32'
): Promise<GravityPipelines> {
  // Create FFT pipelines for vec2 (density) and vec4 (gradient)
  const fft = createFFTPipelines(device, N, precision);
  const fftVec4 = createVec4FFTPipelines(device, N, device.limits.maxComputeWorkgroupSizeX, precision);

  // Create shader modules
  const clearGridModule = device.createShaderModule({
    label: 'Clear grid shader',
    code: clearGridSource
  });

  const accumulateModule = device.createShaderModule({
    label: 'Accumulate shader',
    code: accumulateSource
  });

  const convertDensityModule = device.createShaderModule({
    label: 'Convert density shader',
    code: convertDensitySource  // Always f32 to avoid underflow
  });

  const poissonSolveModule = device.createShaderModule({
    label: 'Poisson solve shader',
    code: injectPrecision(poissonSolveSource, precision)
  });

  const integrateModule = device.createShaderModule({
    label: 'Integrate shader',
    code: injectPrecision(integrateSource, precision)
  });

  const visualizeModule = device.createShaderModule({
    label: 'Visualize shader',
    code: visualizeSource
  });

  const fullscreenModule = device.createShaderModule({
    label: 'Fullscreen shader',
    code: fullscreenSource
  });

  const visualizeDensityModule = device.createShaderModule({
    label: 'Visualize density shader',
    code: visualizeDensitySource  // Always f32 to match density buffer
  });

  const visualizeGradientModule = device.createShaderModule({
    label: 'Visualize gradient shader',
    code: injectPrecision(visualizeGradientSource, precision)
  });

  // Bind group layouts

  // Clear grid: densityAtomic (rw) + params
  const clearGridBindGroupLayout = device.createBindGroupLayout({
    label: 'Clear grid bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Accumulate: particles (r) + densityAtomic (rw) + params
  const accumulateBindGroupLayout = device.createBindGroupLayout({
    label: 'Accumulate bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Convert density: densityAtomic (r) + density (rw) + params
  const convertDensityBindGroupLayout = device.createBindGroupLayout({
    label: 'Convert density bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Poisson solve: densityHat (r) + gradientHat (rw) + potentialHat (rw) + params
  const poissonSolveBindGroupLayout = device.createBindGroupLayout({
    label: 'Poisson solve bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Integrate: particles (rw) + gradient (r) + params
  const integrateBindGroupLayout = device.createBindGroupLayout({
    label: 'Integrate bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Visualize: particles (r) + params
  const visualizeBindGroupLayout = device.createBindGroupLayout({
    label: 'Visualize bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Visualize density: density (r) + params
  const visualizeDensityBindGroupLayout = device.createBindGroupLayout({
    label: 'Visualize density bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Visualize gradient: gradient (r) + potential (r) + params
  const visualizeGradientBindGroupLayout = device.createBindGroupLayout({
    label: 'Visualize gradient bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Pipeline layouts
  const clearGridPipelineLayout = device.createPipelineLayout({
    label: 'Clear grid pipeline layout',
    bindGroupLayouts: [clearGridBindGroupLayout]
  });

  const accumulatePipelineLayout = device.createPipelineLayout({
    label: 'Accumulate pipeline layout',
    bindGroupLayouts: [accumulateBindGroupLayout]
  });

  const convertDensityPipelineLayout = device.createPipelineLayout({
    label: 'Convert density pipeline layout',
    bindGroupLayouts: [convertDensityBindGroupLayout]
  });

  const poissonSolvePipelineLayout = device.createPipelineLayout({
    label: 'Poisson solve pipeline layout',
    bindGroupLayouts: [poissonSolveBindGroupLayout]
  });

  const integratePipelineLayout = device.createPipelineLayout({
    label: 'Integrate pipeline layout',
    bindGroupLayouts: [integrateBindGroupLayout]
  });

  const visualizePipelineLayout = device.createPipelineLayout({
    label: 'Visualize pipeline layout',
    bindGroupLayouts: [visualizeBindGroupLayout]
  });

  const visualizeDensityPipelineLayout = device.createPipelineLayout({
    label: 'Visualize density pipeline layout',
    bindGroupLayouts: [visualizeDensityBindGroupLayout]
  });

  const visualizeGradientPipelineLayout = device.createPipelineLayout({
    label: 'Visualize gradient pipeline layout',
    bindGroupLayouts: [visualizeGradientBindGroupLayout]
  });

  // Compute pipelines
  const clearGrid = device.createComputePipeline({
    label: 'Clear grid pipeline',
    layout: clearGridPipelineLayout,
    compute: { module: clearGridModule, entryPoint: 'clear_grid' }
  });

  const accumulate = device.createComputePipeline({
    label: 'Accumulate pipeline',
    layout: accumulatePipelineLayout,
    compute: { module: accumulateModule, entryPoint: 'accumulate' }
  });

  const convertDensity = device.createComputePipeline({
    label: 'Convert density pipeline',
    layout: convertDensityPipelineLayout,
    compute: { module: convertDensityModule, entryPoint: 'convert_density' }
  });

  const poissonSolve = device.createComputePipeline({
    label: 'Poisson solve pipeline',
    layout: poissonSolvePipelineLayout,
    compute: { module: poissonSolveModule, entryPoint: 'poisson_solve' }
  });

  const integrate = device.createComputePipeline({
    label: 'Integrate pipeline',
    layout: integratePipelineLayout,
    compute: { module: integrateModule, entryPoint: 'integrate' }
  });

  // Render pipelines
  const visualize = device.createRenderPipeline({
    label: 'Visualize pipeline',
    layout: visualizePipelineLayout,
    vertex: {
      module: visualizeModule,
      entryPoint: 'visualize_vertex'
    },
    fragment: {
      module: visualizeModule,
      entryPoint: 'visualize_fragment',
      targets: [{
        format: canvasFormat,
        blend: {
          color: {
            srcFactor: 'one',
            dstFactor: 'one',
            operation: 'add'
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one',
            operation: 'add'
          }
        }
      }]
    },
    primitive: { topology: 'triangle-list' }
  });

  const visualizeDensity = device.createRenderPipeline({
    label: 'Visualize density pipeline',
    layout: visualizeDensityPipelineLayout,
    vertex: {
      module: fullscreenModule,
      entryPoint: 'fullscreen'
    },
    fragment: {
      module: visualizeDensityModule,
      entryPoint: 'visualize_density',
      targets: [{ format: canvasFormat }]
    },
    primitive: { topology: 'triangle-list' }
  });

  // Additive blended version for overlaying on gradient
  const visualizeDensityAdditive = device.createRenderPipeline({
    label: 'Visualize density additive pipeline',
    layout: visualizeDensityPipelineLayout,
    vertex: {
      module: fullscreenModule,
      entryPoint: 'fullscreen'
    },
    fragment: {
      module: visualizeDensityModule,
      entryPoint: 'visualize_density',
      targets: [{
        format: canvasFormat,
        blend: {
          color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }
        }
      }]
    },
    primitive: { topology: 'triangle-list' }
  });

  const visualizeGradient = device.createRenderPipeline({
    label: 'Visualize gradient pipeline',
    layout: visualizeGradientPipelineLayout,
    vertex: {
      module: fullscreenModule,
      entryPoint: 'fullscreen'
    },
    fragment: {
      module: visualizeGradientModule,
      entryPoint: 'visualize_gradient',
      targets: [{
        format: canvasFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
        }
      }]
    },
    primitive: { topology: 'triangle-list' }
  });

  return {
    fft,
    fftVec4,
    clearGrid,
    accumulate,
    convertDensity,
    poissonSolve,
    integrate,
    visualize,
    visualizeDensity,
    visualizeDensityAdditive,
    visualizeGradient,
    bindGroupLayouts: {
      clearGrid: clearGridBindGroupLayout,
      accumulate: accumulateBindGroupLayout,
      convertDensity: convertDensityBindGroupLayout,
      poissonSolve: poissonSolveBindGroupLayout,
      integrate: integrateBindGroupLayout,
      visualize: visualizeBindGroupLayout,
      visualizeDensity: visualizeDensityBindGroupLayout,
      visualizeGradient: visualizeGradientBindGroupLayout
    }
  };
}
