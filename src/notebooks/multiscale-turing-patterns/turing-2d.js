/**
 * Single-Scale 2D Turing Pattern Simulation in WebGPU
 *
 * A simplified implementation matching the 1D simulation dynamics:
 * - Gaussian activator/inhibitor convolution via FFT
 * - atan tonemapping to keep values bounded
 * - Grayscale visualization
 */

import { createFFTPipelines, executeFFT2D } from './lib/webgpu-fft/fft.js';

// Shader sources inline for self-contained module
const initializeShader = `
struct InitParams {
  resolution: vec2<u32>,
  seed: u32,
  _pad: u32,
}

@group(0) @binding(0) var<storage, read_write> field: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: InitParams;

// PCG random number generator
fn pcg(state: ptr<function, u32>) -> f32 {
  let s = *state;
  *state = s * 747796405u + 2891336453u;
  let word = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return f32((word >> 22u) ^ word) / 4294967295.0;
}

@compute @workgroup_size(16, 16, 1)
fn initialize(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let res = params.resolution;

  if (x >= res.x || y >= res.y) { return; }

  let idx = y * res.x + x;
  var rng_state = params.seed ^ (idx * 1664525u + 1013904223u);

  // Random value in [-0.05, 0.05] matching 1D simulation
  let value = (pcg(&rng_state) - 0.5) * 0.1;

  // Store as complex number (real part only, imaginary = 0)
  field[idx] = vec2<f32>(value, 0.0);
}
`;

const convolveShader = `
struct ConvolveParams {
  resolution: vec2<u32>,
  activatorRadius: f32,
  inhibitorRadius: f32,
}

@group(0) @binding(0) var<storage, read> fhatFreq: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> activator: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> inhibitor: array<vec2<f32>>;
@group(0) @binding(3) var<uniform> params: ConvolveParams;

// Gaussian kernel in frequency domain: exp(-2 * pi^2 * sigma^2 * f^2)
fn gaussianKernelFreq(freq: vec2<f32>, sigma: f32) -> f32 {
  let PI = 3.14159265359;
  let f2 = dot(freq, freq);
  return exp(-2.0 * PI * PI * sigma * sigma * f2);
}

@compute @workgroup_size(16, 16, 1)
fn convolve(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let N = params.resolution.x;

  if (x >= N || y >= N) { return; }

  // Compute frequency coordinates (centered FFT layout)
  var fx = f32(x) / f32(N);
  var fy = f32(y) / f32(N);
  if (fx > 0.5) { fx -= 1.0; }
  if (fy > 0.5) { fy -= 1.0; }
  let freq = vec2<f32>(fx, fy);

  let idx = y * N + x;
  let fhat = fhatFreq[idx];

  // Multiply by Gaussian kernels
  let actK = gaussianKernelFreq(freq, params.activatorRadius);
  let inhK = gaussianKernelFreq(freq, params.inhibitorRadius);

  activator[idx] = fhat * actK;
  inhibitor[idx] = fhat * inhK;
}
`;

const updateShader = `
struct UpdateParams {
  resolution: vec2<u32>,
  stepSize: f32,
  toneMapRange: f32,
}

@group(0) @binding(0) var<storage, read> fieldIn: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> activator: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> inhibitor: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> fieldOut: array<vec2<f32>>;
@group(0) @binding(4) var<uniform> params: UpdateParams;

@compute @workgroup_size(16, 16, 1)
fn update(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let N = params.resolution.x;

  if (x >= N || y >= N) { return; }

  let idx = y * N + x;

  // Get current field value (real part of complex number)
  let f = fieldIn[idx].x;

  // Get activator and inhibitor (real parts after inverse FFT)
  let a = activator[idx].x;
  let b = inhibitor[idx].x;

  // Update step: field += stepSize * (activator - inhibitor)
  let delta = (a - b) * params.stepSize;

  // Tonemapping with atan to keep values bounded (matching 1D simulation)
  let range = params.toneMapRange;
  let newValue = atan(range * (f + delta)) / range;

  // Store as complex number (imaginary = 0)
  fieldOut[idx] = vec2<f32>(newValue, 0.0);
}
`;

const paintShader = `
struct PaintParams {
  resolution: vec2<u32>,
  mouse: vec2<f32>,
  radius: f32,
  value: f32,
  _pad0: u32,
  _pad1: u32,
}

@group(0) @binding(0) var<storage, read_write> field: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: PaintParams;

@compute @workgroup_size(16, 16, 1)
fn paint(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let N = params.resolution.x;

  if (x >= N || y >= N) { return; }

  let idx = y * N + x;

  // Compute distance from mouse (in UV space)
  let uv = vec2<f32>(f32(x) / f32(N), f32(y) / f32(N));
  let diff = uv - params.mouse;
  let dist = length(diff);

  if (dist < params.radius) {
    // Smooth falloff
    let falloff = 1.0 - dist / params.radius;
    let current = field[idx].x;
    let paintVal = params.value;
    field[idx] = vec2<f32>(mix(current, paintVal, falloff * 0.5), 0.0);
  }
}
`;

const visualizeShader = `
struct VisParams {
  resolution: vec2<u32>,
  _pad0: u32,
  _pad1: u32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var<storage, read> field: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: VisParams;

// Sample field with wrapping
fn sampleField(x: i32, y: i32, N: u32) -> f32 {
  let Nu = i32(N);
  let wx = u32(((x % Nu) + Nu) % Nu);
  let wy = u32(((y % Nu) + Nu) % Nu);
  return field[wy * N + wx].x;
}

// Fullscreen triangle vertex shader
@vertex
fn vertex(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0)
  );

  var output: VertexOutput;
  output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4<f32> {
  let N = params.resolution.x;
  let Nf = f32(N);

  // Compute texel coordinates (flip Y)
  let tx = input.uv.x * Nf - 0.5;
  let ty = (1.0 - input.uv.y) * Nf - 0.5;

  // Integer and fractional parts
  let x0 = i32(floor(tx));
  let y0 = i32(floor(ty));
  let fx = tx - floor(tx);
  let fy = ty - floor(ty);

  // Sample 4 neighbors
  let f00 = sampleField(x0, y0, N);
  let f10 = sampleField(x0 + 1, y0, N);
  let f01 = sampleField(x0, y0 + 1, N);
  let f11 = sampleField(x0 + 1, y0 + 1, N);

  // Bilinear interpolation
  let f = mix(mix(f00, f10, fx), mix(f01, f11, fx), fy);

  // Map to grayscale: (f + 1) * 0.5, matching 1D simulation
  let gray = clamp((f + 1.0) * 0.5, 0.0, 1.0);

  return vec4<f32>(gray, gray, gray, 1.0);
}
`;

/**
 * Create a 2D single-scale Turing pattern simulation
 *
 * @param {GPUDevice} device - WebGPU device
 * @param {Object} options - Configuration options
 * @param {number} options.width - Simulation width (must be power of 2)
 * @param {number} options.height - Simulation height (must equal width for now)
 * @param {number} options.activatorRadius - Radius of activator kernel (default: 15)
 * @param {number} options.inhibitorRatio - Ratio of inhibitor to activator radius (default: 2)
 * @param {number} options.stepSize - Step size per iteration (default: 0.1)
 * @param {number} options.toneMapRange - Range for atan tonemapping (default: 0.5)
 * @returns {Object} Simulation controller
 */
export function createTuring2D(device, options = {}) {
  const {
    width = 512,
    height = 512,
    activatorRadius = 15,
    inhibitorRatio = 2,
    stepSize = 0.1,
    toneMapRange = 0.5,
  } = options;

  // Validate dimensions
  const N = width;
  if (width !== height) {
    throw new Error('Width and height must be equal (square grid required for FFT)');
  }
  if ((N & (N - 1)) !== 0) {
    throw new Error('Grid size must be a power of 2');
  }

  // Current parameters (can be updated)
  let currentActivatorRadius = activatorRadius;
  let currentInhibitorRatio = inhibitorRatio;
  let currentStepSize = stepSize;
  let currentToneMapRange = toneMapRange;

  // Buffer size: N×N complex numbers (vec2<f32>)
  const bufferSize = N * N * 2 * 4; // 2 floats × 4 bytes
  const bufferUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;

  // Create buffers
  const field = [
    device.createBuffer({ label: 'Field 0', size: bufferSize, usage: bufferUsage }),
    device.createBuffer({ label: 'Field 1', size: bufferSize, usage: bufferUsage }),
  ];
  const fftTemp = [
    device.createBuffer({ label: 'FFT temp 0', size: bufferSize, usage: bufferUsage }),
    device.createBuffer({ label: 'FFT temp 1', size: bufferSize, usage: bufferUsage }),
  ];
  const fhatFreq = device.createBuffer({ label: 'fhat freq', size: bufferSize, usage: bufferUsage });
  const activatorBuf = device.createBuffer({ label: 'Activator', size: bufferSize, usage: bufferUsage });
  const inhibitorBuf = device.createBuffer({ label: 'Inhibitor', size: bufferSize, usage: bufferUsage });

  // Uniform buffers
  const initParamsBuffer = device.createBuffer({
    label: 'Init params',
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const convolveParamsBuffer = device.createBuffer({
    label: 'Convolve params',
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const updateParamsBuffer = device.createBuffer({
    label: 'Update params',
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const visParamsBuffer = device.createBuffer({
    label: 'Visualize params',
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const paintParamsBuffer = device.createBuffer({
    label: 'Paint params',
    size: 32, // 2 u32 + 2 f32 + 2 f32 + 2 u32 padding = 32 bytes
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Create shader modules
  const initModule = device.createShaderModule({ label: 'Initialize', code: initializeShader });
  const convolveModule = device.createShaderModule({ label: 'Convolve', code: convolveShader });
  const updateModule = device.createShaderModule({ label: 'Update', code: updateShader });
  const paintModule = device.createShaderModule({ label: 'Paint', code: paintShader });
  const visualizeModule = device.createShaderModule({ label: 'Visualize', code: visualizeShader });

  // Create FFT pipelines
  const fftPipelines = createFFTPipelines(device, N, 'f32');

  // Create bind group layouts
  const initLayout = device.createBindGroupLayout({
    label: 'Init layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });

  const convolveLayout = device.createBindGroupLayout({
    label: 'Convolve layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });

  const updateLayout = device.createBindGroupLayout({
    label: 'Update layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });

  const visLayout = device.createBindGroupLayout({
    label: 'Visualize layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ],
  });

  const paintLayout = device.createBindGroupLayout({
    label: 'Paint layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });

  // Create pipelines
  const initPipeline = device.createComputePipeline({
    label: 'Initialize pipeline',
    layout: device.createPipelineLayout({ bindGroupLayouts: [initLayout] }),
    compute: { module: initModule, entryPoint: 'initialize' },
  });

  const convolvePipeline = device.createComputePipeline({
    label: 'Convolve pipeline',
    layout: device.createPipelineLayout({ bindGroupLayouts: [convolveLayout] }),
    compute: { module: convolveModule, entryPoint: 'convolve' },
  });

  const updatePipeline = device.createComputePipeline({
    label: 'Update pipeline',
    layout: device.createPipelineLayout({ bindGroupLayouts: [updateLayout] }),
    compute: { module: updateModule, entryPoint: 'update' },
  });

  const paintPipeline = device.createComputePipeline({
    label: 'Paint pipeline',
    layout: device.createPipelineLayout({ bindGroupLayouts: [paintLayout] }),
    compute: { module: paintModule, entryPoint: 'paint' },
  });

  // Create bind groups
  const initBindGroups = [
    device.createBindGroup({
      label: 'Init bind group 0',
      layout: initLayout,
      entries: [
        { binding: 0, resource: { buffer: field[0] } },
        { binding: 1, resource: { buffer: initParamsBuffer } },
      ],
    }),
    device.createBindGroup({
      label: 'Init bind group 1',
      layout: initLayout,
      entries: [
        { binding: 0, resource: { buffer: field[1] } },
        { binding: 1, resource: { buffer: initParamsBuffer } },
      ],
    }),
  ];

  const convolveBindGroup = device.createBindGroup({
    label: 'Convolve bind group',
    layout: convolveLayout,
    entries: [
      { binding: 0, resource: { buffer: fhatFreq } },
      { binding: 1, resource: { buffer: activatorBuf } },
      { binding: 2, resource: { buffer: inhibitorBuf } },
      { binding: 3, resource: { buffer: convolveParamsBuffer } },
    ],
  });

  const updateBindGroups = [
    device.createBindGroup({
      label: 'Update bind group 0->1',
      layout: updateLayout,
      entries: [
        { binding: 0, resource: { buffer: field[0] } },
        { binding: 1, resource: { buffer: activatorBuf } },
        { binding: 2, resource: { buffer: inhibitorBuf } },
        { binding: 3, resource: { buffer: field[1] } },
        { binding: 4, resource: { buffer: updateParamsBuffer } },
      ],
    }),
    device.createBindGroup({
      label: 'Update bind group 1->0',
      layout: updateLayout,
      entries: [
        { binding: 0, resource: { buffer: field[1] } },
        { binding: 1, resource: { buffer: activatorBuf } },
        { binding: 2, resource: { buffer: inhibitorBuf } },
        { binding: 3, resource: { buffer: field[0] } },
        { binding: 4, resource: { buffer: updateParamsBuffer } },
      ],
    }),
  ];

  // Paint bind groups (for both field buffers)
  const paintBindGroups = [
    device.createBindGroup({
      label: 'Paint bind group 0',
      layout: paintLayout,
      entries: [
        { binding: 0, resource: { buffer: field[0] } },
        { binding: 1, resource: { buffer: paintParamsBuffer } },
      ],
    }),
    device.createBindGroup({
      label: 'Paint bind group 1',
      layout: paintLayout,
      entries: [
        { binding: 0, resource: { buffer: field[1] } },
        { binding: 1, resource: { buffer: paintParamsBuffer } },
      ],
    }),
  ];

  // State
  let fieldIndex = 0;
  let iteration = 0;
  let mouseUV = null; // [x, y] in UV coordinates or null

  // Workgroup dispatch size
  const workgroups = Math.ceil(N / 16);

  /**
   * Initialize the field with random noise
   */
  function initialize() {
    const seed = Math.floor(Math.random() * 0xFFFFFFFF);
    const params = new Uint32Array([N, N, seed, 0]);
    device.queue.writeBuffer(initParamsBuffer, 0, params);

    const encoder = device.createCommandEncoder({ label: 'Initialize' });

    // Initialize both buffers
    for (let i = 0; i < 2; i++) {
      const pass = encoder.beginComputePass({ label: `Initialize ${i}` });
      pass.setPipeline(initPipeline);
      pass.setBindGroup(0, initBindGroups[i]);
      pass.dispatchWorkgroups(workgroups, workgroups, 1);
      pass.end();
    }

    device.queue.submit([encoder.finish()]);

    fieldIndex = 0;
    iteration = 0;
  }

  /**
   * Update kernel parameters
   */
  function setKernels(newActivatorRadius, newInhibitorRatio) {
    currentActivatorRadius = newActivatorRadius;
    currentInhibitorRatio = newInhibitorRatio;
  }

  /**
   * Set step size and tonemap range
   */
  function setParams(newStepSize, newToneMapRange) {
    if (newStepSize !== undefined) currentStepSize = newStepSize;
    if (newToneMapRange !== undefined) currentToneMapRange = newToneMapRange;
  }

  /**
   * Set mouse position for painting
   * @param {[number, number] | null} uv - UV coordinates [0,1] or null to stop painting
   */
  function setMouse(uv) {
    mouseUV = uv;
  }

  /**
   * Apply paint at current mouse position
   */
  function applyPaint() {
    if (!mouseUV) return;

    // Write paint params: resolution (2 u32), mouse (2 f32), radius (f32), value (f32), padding (2 u32)
    const paintParams = new ArrayBuffer(32);
    const paintParamsU32 = new Uint32Array(paintParams);
    const paintParamsF32 = new Float32Array(paintParams);
    paintParamsU32[0] = N;
    paintParamsU32[1] = N;
    paintParamsF32[2] = mouseUV[0];
    paintParamsF32[3] = mouseUV[1];
    paintParamsF32[4] = 0.08; // radius in UV space
    paintParamsF32[5] = 1.0;  // paint value (white)
    device.queue.writeBuffer(paintParamsBuffer, 0, paintParams);

    const encoder = device.createCommandEncoder({ label: 'Paint' });
    const pass = encoder.beginComputePass({ label: 'Paint' });
    pass.setPipeline(paintPipeline);
    pass.setBindGroup(0, paintBindGroups[fieldIndex]);
    pass.dispatchWorkgroups(workgroups, workgroups, 1);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  /**
   * Perform one simulation step
   */
  function step() {
    // Apply paint if mouse is active
    applyPaint();
    // Update convolve params
    const convolveParams = new Float32Array(4);
    const convolveParamsU32 = new Uint32Array(convolveParams.buffer);
    convolveParamsU32[0] = N;
    convolveParamsU32[1] = N;
    convolveParams[2] = currentActivatorRadius;
    convolveParams[3] = currentActivatorRadius * currentInhibitorRatio;
    device.queue.writeBuffer(convolveParamsBuffer, 0, convolveParams);

    // Update params
    const updateParams = new Float32Array(4);
    const updateParamsU32 = new Uint32Array(updateParams.buffer);
    updateParamsU32[0] = N;
    updateParamsU32[1] = N;
    updateParams[2] = currentStepSize;
    updateParams[3] = currentToneMapRange;
    device.queue.writeBuffer(updateParamsBuffer, 0, updateParams);

    // 1. Forward FFT of current field
    executeFFT2D({
      device,
      pipelines: fftPipelines,
      input: field[fieldIndex],
      output: fhatFreq,
      temp: fftTemp,
      N,
      forward: true,
      splitNormalization: true,
    });

    // 2. Multiply by kernels in frequency domain
    const encoder = device.createCommandEncoder({ label: `Step ${iteration}` });

    const convolvePass = encoder.beginComputePass({ label: 'Convolve' });
    convolvePass.setPipeline(convolvePipeline);
    convolvePass.setBindGroup(0, convolveBindGroup);
    convolvePass.dispatchWorkgroups(workgroups, workgroups, 1);
    convolvePass.end();

    device.queue.submit([encoder.finish()]);

    // 3. Inverse FFT of activator
    executeFFT2D({
      device,
      pipelines: fftPipelines,
      input: activatorBuf,
      output: activatorBuf,
      temp: fftTemp,
      N,
      forward: false,
      splitNormalization: true,
    });

    // 4. Inverse FFT of inhibitor
    executeFFT2D({
      device,
      pipelines: fftPipelines,
      input: inhibitorBuf,
      output: inhibitorBuf,
      temp: fftTemp,
      N,
      forward: false,
      splitNormalization: true,
    });

    // 5. Update field
    const updateEncoder = device.createCommandEncoder({ label: 'Update' });
    const updatePass = updateEncoder.beginComputePass({ label: 'Update' });
    updatePass.setPipeline(updatePipeline);
    updatePass.setBindGroup(0, updateBindGroups[fieldIndex]);
    updatePass.dispatchWorkgroups(workgroups, workgroups, 1);
    updatePass.end();
    device.queue.submit([updateEncoder.finish()]);

    // Swap buffers
    fieldIndex = 1 - fieldIndex;
    iteration++;
  }

  /**
   * Create a render pipeline and bind groups for visualization
   * Call this once with your canvas format, then use render() each frame
   */
  function createRenderer(canvasFormat) {
    const visPipeline = device.createRenderPipeline({
      label: 'Visualize pipeline',
      layout: device.createPipelineLayout({ bindGroupLayouts: [visLayout] }),
      vertex: { module: visualizeModule, entryPoint: 'vertex' },
      fragment: {
        module: visualizeModule,
        entryPoint: 'fragment',
        targets: [{ format: canvasFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });

    const visBindGroups = [
      device.createBindGroup({
        label: 'Visualize bind group 0',
        layout: visLayout,
        entries: [
          { binding: 0, resource: { buffer: field[0] } },
          { binding: 1, resource: { buffer: visParamsBuffer } },
        ],
      }),
      device.createBindGroup({
        label: 'Visualize bind group 1',
        layout: visLayout,
        entries: [
          { binding: 0, resource: { buffer: field[1] } },
          { binding: 1, resource: { buffer: visParamsBuffer } },
        ],
      }),
    ];

    // Write vis params
    const visParams = new Uint32Array([N, N, 0, 0]);
    device.queue.writeBuffer(visParamsBuffer, 0, visParams);

    return {
      /**
       * Render to the given texture view
       */
      render(view) {
        const encoder = device.createCommandEncoder({ label: 'Render' });
        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            view,
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
          }],
        });
        pass.setPipeline(visPipeline);
        pass.setBindGroup(0, visBindGroups[fieldIndex]);
        pass.draw(3, 1, 0, 0);
        pass.end();
        device.queue.submit([encoder.finish()]);
      },
    };
  }

  /**
   * Clean up GPU resources
   */
  function destroy() {
    field[0].destroy();
    field[1].destroy();
    fftTemp[0].destroy();
    fftTemp[1].destroy();
    fhatFreq.destroy();
    activatorBuf.destroy();
    inhibitorBuf.destroy();
    initParamsBuffer.destroy();
    convolveParamsBuffer.destroy();
    updateParamsBuffer.destroy();
    visParamsBuffer.destroy();
    paintParamsBuffer.destroy();
  }

  return {
    initialize,
    setKernels,
    setParams,
    setMouse,
    step,
    createRenderer,
    destroy,
    get iteration() { return iteration; },
    get width() { return N; },
    get height() { return N; },
    get activatorRadius() { return currentActivatorRadius; },
    get inhibitorRatio() { return currentInhibitorRatio; },
  };
}
