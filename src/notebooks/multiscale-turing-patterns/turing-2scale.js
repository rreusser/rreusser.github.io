/**
 * Simplified Two-Scale Turing Pattern Simulation in WebGPU
 *
 * Demonstrates the core multi-scale algorithm with just two scales.
 * Uses vec4 FFT to compute all 4 convolutions (2 activator + 2 inhibitor)
 * in a single forward/inverse FFT pass.
 */

import { createFFTPipelines, executeFFT2D, createVec4FFTPipelines, executeVec4FFT2D } from './lib/webgpu-fft/fft.js';

const initializeShader = `
struct InitParams {
  resolution: vec2<u32>,
  seed: u32,
  _pad: u32,
}

@group(0) @binding(0) var<storage, read_write> field: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: InitParams;

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

  let value = (pcg(&rng_state) - 0.5) * 0.1;
  field[idx] = vec2<f32>(value, 0.0);
}
`;

// Extract field to vec4 format for vec4 FFT
// Output: (f, 0, f, 0) - duplicated field as two complex numbers
const extractShader = `
struct ExtractParams {
  resolution: vec2<u32>,
  _pad0: u32,
  _pad1: u32,
}

@group(0) @binding(0) var<storage, read> field: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> output: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: ExtractParams;

@compute @workgroup_size(16, 16, 1)
fn extract(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let N = params.resolution.x;

  if (x >= N || y >= N) { return; }

  let idx = y * N + x;
  let f = field[idx].x;

  // Pack as two identical complex numbers: (f + 0i, f + 0i)
  output[idx] = vec4<f32>(f, 0.0, f, 0.0);
}
`;

// Convolve in frequency domain with 4 Gaussian kernels using complex multiplication
// Input: FFT of (u + 0i, u + 0i) → (F, F) where F = FFT(u) is complex
// Kernels: (K_A1 + i*K_I1, K_A2 + i*K_I2) - pack activator/inhibitor as complex
// Complex mult: F * (K_A + i*K_I) = (F_re*K_A - F_im*K_I) + i*(F_re*K_I + F_im*K_A)
// After IFFT: real part = activator*u, imag part = inhibitor*u
const convolveShader = `
struct ConvolveParams {
  resolution: vec2<u32>,
  _pad: vec2<u32>,
  radii: vec4<f32>,  // (A1, I1, A2, I2)
}

@group(0) @binding(0) var<storage, read> fhatFreq: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> output: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: ConvolveParams;

fn gaussianKernelFreq(freq: vec2<f32>, sigma: f32) -> f32 {
  let PI = 3.14159265359;
  let f2 = dot(freq, freq);
  return exp(-2.0 * PI * PI * sigma * sigma * f2);
}

// Complex multiplication: (a + bi) * (c + di) = (ac - bd) + i(ad + bc)
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

@compute @workgroup_size(16, 16, 1)
fn convolve(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let N = params.resolution.x;

  if (x >= N || y >= N) { return; }

  // Compute frequency coordinates
  var fx = f32(x) / f32(N);
  var fy = f32(y) / f32(N);
  if (fx > 0.5) { fx -= 1.0; }
  if (fy > 0.5) { fy -= 1.0; }
  let freq = vec2<f32>(fx, fy);

  let idx = y * N + x;
  let fhat = fhatFreq[idx];  // (F1_re, F1_im, F2_re, F2_im) - two copies of F

  // Compute 4 Gaussian kernels (real-valued in frequency domain)
  let k_a1 = gaussianKernelFreq(freq, params.radii.x);
  let k_i1 = gaussianKernelFreq(freq, params.radii.y);
  let k_a2 = gaussianKernelFreq(freq, params.radii.z);
  let k_i2 = gaussianKernelFreq(freq, params.radii.w);

  // Form complex kernels: K1 = k_a1 + i*k_i1, K2 = k_a2 + i*k_i2
  let K1 = vec2<f32>(k_a1, k_i1);
  let K2 = vec2<f32>(k_a2, k_i2);

  // Extract the two complex FFT results
  let F1 = vec2<f32>(fhat.x, fhat.y);
  let F2 = vec2<f32>(fhat.z, fhat.w);

  // Complex multiply: F * K
  // After IFFT, real part = activator conv, imag part = inhibitor conv
  let result1 = cmul(F1, K1);
  let result2 = cmul(F2, K2);

  output[idx] = vec4<f32>(result1.x, result1.y, result2.x, result2.y);
}
`;

// Update field based on scale selection
// After IFFT of F*(K_A + i*K_I): real part = activator*u, imag part = inhibitor*u
const updateShader = `
struct UpdateParams {
  resolution: vec2<u32>,
  stepSize: f32,
  toneMapRange: f32,
}

@group(0) @binding(0) var<storage, read> fieldIn: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> convResult: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> fieldOut: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> scaleSelection: array<u32>;
@group(0) @binding(4) var<uniform> params: UpdateParams;

@compute @workgroup_size(16, 16, 1)
fn update(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let N = params.resolution.x;

  if (x >= N || y >= N) { return; }

  let idx = y * N + x;

  let f = fieldIn[idx].x;
  let conv = convResult[idx];

  // After IFFT: real parts = activator convolutions, imag parts = inhibitor convolutions
  // conv = (A1, I1, A2, I2) where A = activator*u, I = inhibitor*u
  let a1 = conv.x;  // Scale 1 activator (real part of first complex)
  let i1 = conv.y;  // Scale 1 inhibitor (imag part of first complex)
  let a2 = conv.z;  // Scale 2 activator (real part of second complex)
  let i2 = conv.w;  // Scale 2 inhibitor (imag part of second complex)

  // Compute variation (|activator - inhibitor|) for each scale
  let var1 = abs(a1 - i1);
  let var2 = abs(a2 - i2);

  // Select scale with minimum variation
  var selectedScale: u32;
  var delta: f32;
  if (var1 <= var2) {
    selectedScale = 0u;
    delta = sign(a1 - i1);
  } else {
    selectedScale = 1u;
    delta = sign(a2 - i2);
  }

  // Store scale selection for visualization
  scaleSelection[idx] = selectedScale;

  // Update with fixed step size
  let newValue = f + delta * params.stepSize;

  // Tonemapping with atan
  let range = params.toneMapRange;
  let mapped = atan(range * newValue) / range;

  fieldOut[idx] = vec2<f32>(mapped, 0.0);
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
  let uv = vec2<f32>(f32(x) / f32(N), f32(y) / f32(N));
  let diff = uv - params.mouse;
  let dist = length(diff);

  if (dist < params.radius) {
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
  showScaleTint: u32,
  _pad: u32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var<storage, read> field: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> scaleSelection: array<u32>;
@group(0) @binding(2) var<uniform> params: VisParams;

// Sample field with wrapping
fn sampleField(x: i32, y: i32, N: u32) -> f32 {
  let Nu = i32(N);
  let wx = u32(((x % Nu) + Nu) % Nu);
  let wy = u32(((y % Nu) + Nu) % Nu);
  return field[wy * N + wx].x;
}

// Sample scale selection (nearest neighbor since it's discrete)
fn sampleScale(x: i32, y: i32, N: u32) -> u32 {
  let Nu = i32(N);
  let wx = u32(((x % Nu) + Nu) % Nu);
  let wy = u32(((y % Nu) + Nu) % Nu);
  return scaleSelection[wy * N + wx];
}

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

  // Bilinear interpolation of field values
  let f00 = sampleField(x0, y0, N);
  let f10 = sampleField(x0 + 1, y0, N);
  let f01 = sampleField(x0, y0 + 1, N);
  let f11 = sampleField(x0 + 1, y0 + 1, N);
  let f = mix(mix(f00, f10, fx), mix(f01, f11, fx), fy);

  let gray = clamp(0.5 + 1.3 * f, 0.0, 1.0);
  var color = vec3<f32>(gray, gray, gray);

  if (params.showScaleTint == 1u) {
    // For scale tint, use nearest neighbor (round to nearest texel)
    let px = i32(round(tx));
    let py = i32(round(ty));
    let scale = sampleScale(px, py, N);

    // Scale 0 (fine): blue tint, Scale 1 (coarse): orange tint
    let blueTint = vec3<f32>(0.2, 0.4, 1.0);
    let orangeTint = vec3<f32>(1.0, 0.4, 0.2);
    let tint = select(orangeTint, blueTint, scale == 0u);
    color = mix(color, tint, 0.5);
  }

  return vec4<f32>(color, 1.0);
}
`;

/**
 * Create a simplified two-scale Turing pattern simulation
 */
export function createTuring2Scale(device, options = {}) {
  const {
    width = 256,
    height = 256,
    activatorRadius1 = 3,
    inhibitorRatio1 = 2,
    activatorRadius2 = 20,
    inhibitorRatio2 = 2,
    stepSize = 0.02,
    toneMapRange = 1.0,
  } = options;

  const N = width;
  if (width !== height) {
    throw new Error('Width and height must be equal');
  }
  if ((N & (N - 1)) !== 0) {
    throw new Error('Grid size must be a power of 2');
  }

  // Parameters (can be updated)
  let currentStepSize = stepSize;
  let currentToneMapRange = toneMapRange;
  let currentActivatorRadius1 = activatorRadius1;
  let currentInhibitorRatio1 = inhibitorRatio1;
  let currentActivatorRadius2 = activatorRadius2;
  let currentInhibitorRatio2 = inhibitorRatio2;
  let showScaleTint = true;

  // Buffer sizes
  const vec2Size = N * N * 2 * 4;  // vec2<f32>
  const vec4Size = N * N * 4 * 4;  // vec4<f32>
  const u32Size = N * N * 4;       // u32
  const bufferUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;

  // Create buffers
  const field = [
    device.createBuffer({ label: 'Field 0', size: vec2Size, usage: bufferUsage }),
    device.createBuffer({ label: 'Field 1', size: vec2Size, usage: bufferUsage }),
  ];
  const fftTemp = [
    device.createBuffer({ label: 'FFT temp 0', size: vec2Size, usage: bufferUsage }),
    device.createBuffer({ label: 'FFT temp 1', size: vec2Size, usage: bufferUsage }),
  ];
  const vec4FftWork = device.createBuffer({ label: 'Vec4 FFT work', size: vec4Size, usage: bufferUsage });
  const vec4FftTemp = [
    device.createBuffer({ label: 'Vec4 FFT temp 0', size: vec4Size, usage: bufferUsage }),
    device.createBuffer({ label: 'Vec4 FFT temp 1', size: vec4Size, usage: bufferUsage }),
  ];
  const convResult = device.createBuffer({ label: 'Conv result', size: vec4Size, usage: bufferUsage });
  const scaleSelection = device.createBuffer({ label: 'Scale selection', size: u32Size, usage: bufferUsage });

  // Uniform buffers
  const initParamsBuffer = device.createBuffer({
    label: 'Init params',
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const extractParamsBuffer = device.createBuffer({
    label: 'Extract params',
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const convolveParamsBuffer = device.createBuffer({
    label: 'Convolve params',
    size: 32,
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
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Create shader modules
  const initModule = device.createShaderModule({ label: 'Initialize', code: initializeShader });
  const extractModule = device.createShaderModule({ label: 'Extract', code: extractShader });
  const convolveModule = device.createShaderModule({ label: 'Convolve', code: convolveShader });
  const updateModule = device.createShaderModule({ label: 'Update', code: updateShader });
  const paintModule = device.createShaderModule({ label: 'Paint', code: paintShader });
  const visualizeModule = device.createShaderModule({ label: 'Visualize', code: visualizeShader });

  // Create FFT pipelines
  const fftPipelines = createFFTPipelines(device, N, 'f32');
  const vec4FftPipelines = createVec4FFTPipelines(device, N, device.limits.maxComputeWorkgroupSizeX, 'f32');

  // Create bind group layouts
  const initLayout = device.createBindGroupLayout({
    label: 'Init layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });

  const extractLayout = device.createBindGroupLayout({
    label: 'Extract layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });

  const convolveLayout = device.createBindGroupLayout({
    label: 'Convolve layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });

  const updateLayout = device.createBindGroupLayout({
    label: 'Update layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });

  const paintLayout = device.createBindGroupLayout({
    label: 'Paint layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });

  const visLayout = device.createBindGroupLayout({
    label: 'Visualize layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ],
  });

  // Create pipelines
  const initPipeline = device.createComputePipeline({
    label: 'Initialize pipeline',
    layout: device.createPipelineLayout({ bindGroupLayouts: [initLayout] }),
    compute: { module: initModule, entryPoint: 'initialize' },
  });

  const extractPipeline = device.createComputePipeline({
    label: 'Extract pipeline',
    layout: device.createPipelineLayout({ bindGroupLayouts: [extractLayout] }),
    compute: { module: extractModule, entryPoint: 'extract' },
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

  const extractBindGroups = [
    device.createBindGroup({
      label: 'Extract bind group 0',
      layout: extractLayout,
      entries: [
        { binding: 0, resource: { buffer: field[0] } },
        { binding: 1, resource: { buffer: vec4FftWork } },
        { binding: 2, resource: { buffer: extractParamsBuffer } },
      ],
    }),
    device.createBindGroup({
      label: 'Extract bind group 1',
      layout: extractLayout,
      entries: [
        { binding: 0, resource: { buffer: field[1] } },
        { binding: 1, resource: { buffer: vec4FftWork } },
        { binding: 2, resource: { buffer: extractParamsBuffer } },
      ],
    }),
  ];

  const convolveBindGroup = device.createBindGroup({
    label: 'Convolve bind group',
    layout: convolveLayout,
    entries: [
      { binding: 0, resource: { buffer: vec4FftWork } },
      { binding: 1, resource: { buffer: convResult } },
      { binding: 2, resource: { buffer: convolveParamsBuffer } },
    ],
  });

  const updateBindGroups = [
    device.createBindGroup({
      label: 'Update bind group 0->1',
      layout: updateLayout,
      entries: [
        { binding: 0, resource: { buffer: field[0] } },
        { binding: 1, resource: { buffer: convResult } },
        { binding: 2, resource: { buffer: field[1] } },
        { binding: 3, resource: { buffer: scaleSelection } },
        { binding: 4, resource: { buffer: updateParamsBuffer } },
      ],
    }),
    device.createBindGroup({
      label: 'Update bind group 1->0',
      layout: updateLayout,
      entries: [
        { binding: 0, resource: { buffer: field[1] } },
        { binding: 1, resource: { buffer: convResult } },
        { binding: 2, resource: { buffer: field[0] } },
        { binding: 3, resource: { buffer: scaleSelection } },
        { binding: 4, resource: { buffer: updateParamsBuffer } },
      ],
    }),
  ];

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
  let mouseUV = null;

  const workgroups = Math.ceil(N / 16);

  function initialize() {
    const seed = Math.floor(Math.random() * 0xFFFFFFFF);
    const params = new Uint32Array([N, N, seed, 0]);
    device.queue.writeBuffer(initParamsBuffer, 0, params);

    const encoder = device.createCommandEncoder({ label: 'Initialize' });

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

  function setScales(a1, r1, a2, r2) {
    currentActivatorRadius1 = a1;
    currentInhibitorRatio1 = r1;
    currentActivatorRadius2 = a2;
    currentInhibitorRatio2 = r2;
  }

  function setShowScaleTint(show) {
    showScaleTint = show;
  }

  function setMouse(uv) {
    mouseUV = uv;
  }

  function applyPaint() {
    if (!mouseUV) return;

    const paintParams = new ArrayBuffer(32);
    const paintParamsU32 = new Uint32Array(paintParams);
    const paintParamsF32 = new Float32Array(paintParams);
    paintParamsU32[0] = N;
    paintParamsU32[1] = N;
    paintParamsF32[2] = mouseUV[0];
    paintParamsF32[3] = mouseUV[1];
    paintParamsF32[4] = 0.08;
    paintParamsF32[5] = 1.0;
    device.queue.writeBuffer(paintParamsBuffer, 0, paintParams);

    const encoder = device.createCommandEncoder({ label: 'Paint' });
    const pass = encoder.beginComputePass({ label: 'Paint' });
    pass.setPipeline(paintPipeline);
    pass.setBindGroup(0, paintBindGroups[fieldIndex]);
    pass.dispatchWorkgroups(workgroups, workgroups, 1);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  function step() {
    applyPaint();

    // Write extract params
    const extractParams = new Uint32Array([N, N, 0, 0]);
    device.queue.writeBuffer(extractParamsBuffer, 0, extractParams);

    // Write convolve params: resolution + radii
    const convolveParams = new Float32Array(8);
    const convolveParamsU32 = new Uint32Array(convolveParams.buffer);
    convolveParamsU32[0] = N;
    convolveParamsU32[1] = N;
    convolveParams[4] = currentActivatorRadius1;
    convolveParams[5] = currentActivatorRadius1 * currentInhibitorRatio1;
    convolveParams[6] = currentActivatorRadius2;
    convolveParams[7] = currentActivatorRadius2 * currentInhibitorRatio2;
    device.queue.writeBuffer(convolveParamsBuffer, 0, convolveParams);

    // Write update params
    const updateParams = new Float32Array(4);
    const updateParamsU32 = new Uint32Array(updateParams.buffer);
    updateParamsU32[0] = N;
    updateParamsU32[1] = N;
    updateParams[2] = currentStepSize;
    updateParams[3] = currentToneMapRange;
    device.queue.writeBuffer(updateParamsBuffer, 0, updateParams);

    // 1. Extract field to vec4 format
    const extractEncoder = device.createCommandEncoder({ label: 'Extract' });
    const extractPass = extractEncoder.beginComputePass({ label: 'Extract' });
    extractPass.setPipeline(extractPipeline);
    extractPass.setBindGroup(0, extractBindGroups[fieldIndex]);
    extractPass.dispatchWorkgroups(workgroups, workgroups, 1);
    extractPass.end();
    device.queue.submit([extractEncoder.finish()]);

    // 2. Forward vec4 FFT
    executeVec4FFT2D({
      device,
      pipelines: vec4FftPipelines,
      input: vec4FftWork,
      output: vec4FftWork,
      temp: vec4FftTemp,
      N,
      forward: true,
      splitNormalization: true,
    });

    // 3. Convolve with 4 Gaussian kernels
    const convolveEncoder = device.createCommandEncoder({ label: 'Convolve' });
    const convolvePass = convolveEncoder.beginComputePass({ label: 'Convolve' });
    convolvePass.setPipeline(convolvePipeline);
    convolvePass.setBindGroup(0, convolveBindGroup);
    convolvePass.dispatchWorkgroups(workgroups, workgroups, 1);
    convolvePass.end();
    device.queue.submit([convolveEncoder.finish()]);

    // 4. Inverse vec4 FFT
    executeVec4FFT2D({
      device,
      pipelines: vec4FftPipelines,
      input: convResult,
      output: convResult,
      temp: vec4FftTemp,
      N,
      forward: false,
      splitNormalization: true,
    });

    // 5. Update field with scale selection
    const updateEncoder = device.createCommandEncoder({ label: 'Update' });
    const updatePass = updateEncoder.beginComputePass({ label: 'Update' });
    updatePass.setPipeline(updatePipeline);
    updatePass.setBindGroup(0, updateBindGroups[fieldIndex]);
    updatePass.dispatchWorkgroups(workgroups, workgroups, 1);
    updatePass.end();
    device.queue.submit([updateEncoder.finish()]);

    fieldIndex = 1 - fieldIndex;
    iteration++;
  }

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
          { binding: 1, resource: { buffer: scaleSelection } },
          { binding: 2, resource: { buffer: visParamsBuffer } },
        ],
      }),
      device.createBindGroup({
        label: 'Visualize bind group 1',
        layout: visLayout,
        entries: [
          { binding: 0, resource: { buffer: field[1] } },
          { binding: 1, resource: { buffer: scaleSelection } },
          { binding: 2, resource: { buffer: visParamsBuffer } },
        ],
      }),
    ];

    return {
      render(view) {
        const visParams = new Uint32Array([N, N, showScaleTint ? 1 : 0, 0]);
        device.queue.writeBuffer(visParamsBuffer, 0, visParams);

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

  function destroy() {
    field[0].destroy();
    field[1].destroy();
    fftTemp[0].destroy();
    fftTemp[1].destroy();
    vec4FftWork.destroy();
    vec4FftTemp[0].destroy();
    vec4FftTemp[1].destroy();
    convResult.destroy();
    scaleSelection.destroy();
    initParamsBuffer.destroy();
    extractParamsBuffer.destroy();
    convolveParamsBuffer.destroy();
    updateParamsBuffer.destroy();
    visParamsBuffer.destroy();
    paintParamsBuffer.destroy();
  }

  return {
    initialize,
    setScales,
    setShowScaleTint,
    setMouse,
    step,
    createRenderer,
    destroy,
    get iteration() { return iteration; },
    get width() { return N; },
    get height() { return N; },
  };
}
