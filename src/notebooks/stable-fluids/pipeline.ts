/**
 * Pipeline creation for Stable Fluids solver
 */

import { FFTPipelines, createFFTPipelines } from './lib/webgpu-fft/fft.js';

// Import shaders
import addForceSource from './shaders/add_force.wgsl?raw';
import advectSource from './shaders/advect.wgsl?raw';
import advectScalarSource from './shaders/advect_scalar.wgsl?raw';
import splitVelocitySource from './shaders/split_velocity.wgsl?raw';
import projectFFTSource from './shaders/project_fft.wgsl?raw';
import mergeVelocitySource from './shaders/merge_velocity.wgsl?raw';
import fullscreenSource from './shaders/fullscreen.wgsl?raw';
import visualizeSource from './shaders/visualize.wgsl?raw';
import vorticitySource from './shaders/vorticity.wgsl?raw';
import applyVorticitySource from './shaders/apply_vorticity.wgsl?raw';
import boundarySource from './shaders/boundary.wgsl?raw';
import buoyancySource from './shaders/buoyancy.wgsl?raw';

export interface FluidPipelines {
  fft: FFTPipelines;

  addForce: GPUComputePipeline;
  advectVelocity: GPUComputePipeline;
  advectScalar: GPUComputePipeline;
  splitVelocity: GPUComputePipeline;
  projectFFT: GPUComputePipeline;
  mergeVelocity: GPUComputePipeline;
  computeVorticity: GPUComputePipeline;
  applyVorticity: GPUComputePipeline;
  enforceBoundary: GPUComputePipeline;
  applyBuoyancy: GPUComputePipeline;
  visualize: GPURenderPipeline;

  bindGroupLayouts: {
    addForce: GPUBindGroupLayout;
    advect: GPUBindGroupLayout;
    advectScalar: GPUBindGroupLayout;
    splitVelocity: GPUBindGroupLayout;
    projectFFT: GPUBindGroupLayout;
    mergeVelocity: GPUBindGroupLayout;
    computeVorticity: GPUBindGroupLayout;
    applyVorticity: GPUBindGroupLayout;
    enforceBoundary: GPUBindGroupLayout;
    applyBuoyancy: GPUBindGroupLayout;
    visualize: GPUBindGroupLayout;
  };
}

export async function createFluidPipelines(
  device: GPUDevice,
  canvasFormat: GPUTextureFormat,
  N: number
): Promise<FluidPipelines> {
  const fft = createFFTPipelines(device, N);

  // Create shader modules
  const addForceModule = device.createShaderModule({
    label: 'Add force shader',
    code: addForceSource
  });

  const advectModule = device.createShaderModule({
    label: 'Advect shader',
    code: advectSource
  });

  const advectScalarModule = device.createShaderModule({
    label: 'Advect scalar shader',
    code: advectScalarSource
  });

  const splitVelocityModule = device.createShaderModule({
    label: 'Split velocity shader',
    code: splitVelocitySource
  });

  const projectFFTModule = device.createShaderModule({
    label: 'Project FFT shader',
    code: projectFFTSource
  });

  const mergeVelocityModule = device.createShaderModule({
    label: 'Merge velocity shader',
    code: mergeVelocitySource
  });

  const fullscreenModule = device.createShaderModule({
    label: 'Fullscreen vertex shader',
    code: fullscreenSource
  });

  const visualizeModule = device.createShaderModule({
    label: 'Visualize shader',
    code: visualizeSource
  });

  const vorticityModule = device.createShaderModule({
    label: 'Vorticity shader',
    code: vorticitySource
  });

  const applyVorticityModule = device.createShaderModule({
    label: 'Apply vorticity shader',
    code: applyVorticitySource
  });

  const boundaryModule = device.createShaderModule({
    label: 'Boundary shader',
    code: boundarySource
  });

  const buoyancyModule = device.createShaderModule({
    label: 'Buoyancy shader',
    code: buoyancySource
  });

  // Bind group layouts

  // Add force: velocity (rw) + dye (rw) + params
  const addForceBindGroupLayout = device.createBindGroupLayout({
    label: 'Add force bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Advect velocity: velocityField (r) + input (r) + output (rw) + params
  const advectBindGroupLayout = device.createBindGroupLayout({
    label: 'Advect bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Advect scalar: velocity (r) + input (r) + output (rw) + params
  const advectScalarBindGroupLayout = device.createBindGroupLayout({
    label: 'Advect scalar bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Split velocity: velocity (r) + u (rw) + v (rw) + params
  const splitVelocityBindGroupLayout = device.createBindGroupLayout({
    label: 'Split velocity bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Project FFT: uHat (rw) + vHat (rw) + params
  const projectFFTBindGroupLayout = device.createBindGroupLayout({
    label: 'Project FFT bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Merge velocity: u (r) + v (r) + velocity (rw) + params
  const mergeVelocityBindGroupLayout = device.createBindGroupLayout({
    label: 'Merge velocity bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Visualize: velocity (r) + dye (r) + params
  const visualizeBindGroupLayout = device.createBindGroupLayout({
    label: 'Visualize bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Compute vorticity: velocity (r) + vorticity (rw) + params
  const computeVorticityBindGroupLayout = device.createBindGroupLayout({
    label: 'Compute vorticity bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Apply vorticity: velocity (rw) + vorticity (r) + params
  const applyVorticityBindGroupLayout = device.createBindGroupLayout({
    label: 'Apply vorticity bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Enforce boundary: velocity (rw) + dye (rw) + params
  const enforceBoundaryBindGroupLayout = device.createBindGroupLayout({
    label: 'Enforce boundary bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Apply buoyancy: velocity (rw) + dye (r) + params
  const applyBuoyancyBindGroupLayout = device.createBindGroupLayout({
    label: 'Apply buoyancy bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
    ]
  });

  // Pipeline layouts
  const addForcePipelineLayout = device.createPipelineLayout({
    label: 'Add force pipeline layout',
    bindGroupLayouts: [addForceBindGroupLayout]
  });

  const advectPipelineLayout = device.createPipelineLayout({
    label: 'Advect pipeline layout',
    bindGroupLayouts: [advectBindGroupLayout]
  });

  const advectScalarPipelineLayout = device.createPipelineLayout({
    label: 'Advect scalar pipeline layout',
    bindGroupLayouts: [advectScalarBindGroupLayout]
  });

  const splitVelocityPipelineLayout = device.createPipelineLayout({
    label: 'Split velocity pipeline layout',
    bindGroupLayouts: [splitVelocityBindGroupLayout]
  });

  const projectFFTPipelineLayout = device.createPipelineLayout({
    label: 'Project FFT pipeline layout',
    bindGroupLayouts: [projectFFTBindGroupLayout]
  });

  const mergeVelocityPipelineLayout = device.createPipelineLayout({
    label: 'Merge velocity pipeline layout',
    bindGroupLayouts: [mergeVelocityBindGroupLayout]
  });

  const visualizePipelineLayout = device.createPipelineLayout({
    label: 'Visualize pipeline layout',
    bindGroupLayouts: [visualizeBindGroupLayout]
  });

  const computeVorticityPipelineLayout = device.createPipelineLayout({
    label: 'Compute vorticity pipeline layout',
    bindGroupLayouts: [computeVorticityBindGroupLayout]
  });

  const applyVorticityPipelineLayout = device.createPipelineLayout({
    label: 'Apply vorticity pipeline layout',
    bindGroupLayouts: [applyVorticityBindGroupLayout]
  });

  const enforceBoundaryPipelineLayout = device.createPipelineLayout({
    label: 'Enforce boundary pipeline layout',
    bindGroupLayouts: [enforceBoundaryBindGroupLayout]
  });

  const applyBuoyancyPipelineLayout = device.createPipelineLayout({
    label: 'Apply buoyancy pipeline layout',
    bindGroupLayouts: [applyBuoyancyBindGroupLayout]
  });

  // Compute pipelines
  const addForce = device.createComputePipeline({
    label: 'Add force pipeline',
    layout: addForcePipelineLayout,
    compute: { module: addForceModule, entryPoint: 'add_force' }
  });

  const advectVelocity = device.createComputePipeline({
    label: 'Advect velocity pipeline',
    layout: advectPipelineLayout,
    compute: { module: advectModule, entryPoint: 'advect_velocity' }
  });

  const advectScalar = device.createComputePipeline({
    label: 'Advect scalar pipeline',
    layout: advectScalarPipelineLayout,
    compute: { module: advectScalarModule, entryPoint: 'advect_scalar' }
  });

  const splitVelocity = device.createComputePipeline({
    label: 'Split velocity pipeline',
    layout: splitVelocityPipelineLayout,
    compute: { module: splitVelocityModule, entryPoint: 'split_velocity' }
  });

  const projectFFT = device.createComputePipeline({
    label: 'Project FFT pipeline',
    layout: projectFFTPipelineLayout,
    compute: { module: projectFFTModule, entryPoint: 'project_fft' }
  });

  const mergeVelocity = device.createComputePipeline({
    label: 'Merge velocity pipeline',
    layout: mergeVelocityPipelineLayout,
    compute: { module: mergeVelocityModule, entryPoint: 'merge_velocity' }
  });

  const computeVorticity = device.createComputePipeline({
    label: 'Compute vorticity pipeline',
    layout: computeVorticityPipelineLayout,
    compute: { module: vorticityModule, entryPoint: 'compute_vorticity' }
  });

  const applyVorticity = device.createComputePipeline({
    label: 'Apply vorticity pipeline',
    layout: applyVorticityPipelineLayout,
    compute: { module: applyVorticityModule, entryPoint: 'apply_vorticity' }
  });

  const enforceBoundary = device.createComputePipeline({
    label: 'Enforce boundary pipeline',
    layout: enforceBoundaryPipelineLayout,
    compute: { module: boundaryModule, entryPoint: 'enforce_boundary' }
  });

  const applyBuoyancy = device.createComputePipeline({
    label: 'Apply buoyancy pipeline',
    layout: applyBuoyancyPipelineLayout,
    compute: { module: buoyancyModule, entryPoint: 'apply_buoyancy' }
  });

  // Render pipeline
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
      targets: [{ format: canvasFormat }]
    },
    primitive: { topology: 'triangle-list' }
  });

  return {
    fft,
    addForce,
    advectVelocity,
    advectScalar,
    splitVelocity,
    projectFFT,
    mergeVelocity,
    computeVorticity,
    applyVorticity,
    enforceBoundary,
    applyBuoyancy,
    visualize,
    bindGroupLayouts: {
      addForce: addForceBindGroupLayout,
      advect: advectBindGroupLayout,
      advectScalar: advectScalarBindGroupLayout,
      splitVelocity: splitVelocityBindGroupLayout,
      projectFFT: projectFFTBindGroupLayout,
      mergeVelocity: mergeVelocityBindGroupLayout,
      computeVorticity: computeVorticityBindGroupLayout,
      applyVorticity: applyVorticityBindGroupLayout,
      enforceBoundary: enforceBoundaryBindGroupLayout,
      applyBuoyancy: applyBuoyancyBindGroupLayout,
      visualize: visualizeBindGroupLayout
    }
  };
}
