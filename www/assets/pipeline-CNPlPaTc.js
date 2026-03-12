import{createFFTPipelines as N}from"./fft-Chkx7JT6.js";const R=`// Initialize Shader
//
// Creates initial conditions for the Kuramoto-Sivashinsky equation.
// Default: f(x,y) = sin(n*(x+y)) + sin(n*x) + sin(n*y)

struct InitializeParams {
  resolution: vec2<u32>,
  n: f32,  // Number of periods in initial condition
}

@group(0) @binding(0) var<storage, read_write> output: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: InitializeParams;

@compute @workgroup_size(16, 16, 1)
fn initialize(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;

  // Compute UV coordinates in [0, 1] range
  let uv = vec2<f32>(f32(x), f32(y)) / vec2<f32>(resolution);

  // Map to [0, 2π] domain
  let PI = 3.14159265359;
  let xy = uv * 2.0 * PI;

  // Compute initial condition: f(x,y) = sin(n*(x+y)) + sin(n*x) + sin(n*y)
  let n = params.n;
  let f = sin(n * (xy.x + xy.y)) + sin(n * xy.x) + sin(n * xy.y);

  // Store as complex number (real part only, imaginary = 0)
  output[idx] = vec2<f32>(f, 0.0);
}
`,q=`// Differentiation in Frequency Domain
//
// Computes spatial derivatives via multiplication by i·k in frequency domain:
// - ∂V/∂x = IFFT(i·kx·Vhat)
// - ∂V/∂y = IFFT(i·ky·Vhat)
//
// Output format: vec4<f32> = (Vhat.xy, dVhatdx.xy + i*dVhatdy.xy)
// This allows inverse FFT to recover both V and (Vx, Vy) in one transform.

// Complex multiplication
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x
  );
}

// Wavenumber calculation
fn wavenumber(coord: vec2<u32>, resolution: vec2<u32>, dx: vec2<f32>) -> vec2<f32> {
  let half_res = vec2<f32>(f32(resolution.x) / 2.0, f32(resolution.y) / 2.0);
  let coord_f = vec2<f32>(f32(coord.x), f32(coord.y));

  var k = coord_f;
  if (coord_f.x >= half_res.x) {
    k.x = coord_f.x - f32(resolution.x);
  }
  if (coord_f.y >= half_res.y) {
    k.y = coord_f.y - f32(resolution.y);
  }

  return k * (2.0 * 3.14159265359 / (vec2<f32>(resolution) * dx));
}

struct DifferentiateParams {
  resolution: vec2<u32>,
  dx: vec2<f32>,
}

@group(0) @binding(0) var<storage, read> Vhat: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> output: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: DifferentiateParams;

@compute @workgroup_size(16, 16, 1)
fn differentiate(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;
  let Vhat_val = Vhat[idx];

  // Compute wavenumber
  let k = wavenumber(vec2<u32>(x, y), resolution, params.dx);

  // i = (0, 1)
  let I = vec2<f32>(0.0, 1.0);

  // x-derivative: i·kx·Vhat
  let dVhatdx = cmul(vec2<f32>(0.0, k.x), Vhat_val);

  // y-derivative: i·ky·Vhat
  let dVhatdy = cmul(vec2<f32>(0.0, k.y), Vhat_val);

  // Mix derivatives as (i·kx·Vhat) + i·(i·ky·Vhat)
  // This allows us to separate them after inverse FFT as real and imaginary parts
  let mixed_derivatives = dVhatdx + cmul(I, dVhatdy);

  // Output: (Vhat.x, Vhat.y, mixed.x, mixed.y)
  output[idx] = vec4<f32>(Vhat_val, mixed_derivatives);
}
`,K=`// Extract Mixed Derivatives from Vec4 to Vec2
//
// Extracts the mixed derivative channels (z, w) from the vec4 differentiate output
// to a vec2 buffer for inverse FFT.
//
// Input: vec4<f32> = (Vhat.x, Vhat.y, mixed.x, mixed.y)
// Output: vec2<f32> = (mixed.x, mixed.y)
//
// After inverse FFT of the output, real part = Vx, imag part = Vy

struct ExtractParams {
  resolution: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> input: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> output: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: ExtractParams;

@compute @workgroup_size(16, 16, 1)
fn extract_mixed_derivatives(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;
  let data = input[idx];

  // Extract channels z, w (the mixed derivatives)
  output[idx] = vec2<f32>(data.z, data.w);
}
`,W=`// Compute A and B from Spatial Derivatives
//
// Computes the nonlinear squared gradient terms:
// - A = -0.5 * (dV/dx)^2
// - B = -0.5 * (dV/dy)^2
//
// Input: VxVy (vec2<f32>) where after inverse FFT:
//   - .x = Vx (x-derivative in spatial domain)
//   - .y = Vy (y-derivative in spatial domain)
//
// Output: A and B as separate vec2 buffers (complex, with zero imaginary part)
//   - A[idx] = vec2(-0.5 * Vx^2, 0)
//   - B[idx] = vec2(-0.5 * Vy^2, 0)

struct ComputeABParams {
  resolution: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> VxVy: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> A: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> B: array<vec2<f32>>;
@group(0) @binding(3) var<uniform> params: ComputeABParams;

@compute @workgroup_size(16, 16, 1)
fn compute_ab(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;
  let data = VxVy[idx];

  // After inverse FFT of mixed derivatives:
  // - real part (data.x) = Vx = dV/dx
  // - imag part (data.y) = Vy = dV/dy
  let Vx = data.x;
  let Vy = data.y;

  // Compute squared terms
  let A_real = -0.5 * Vx * Vx;
  let B_real = -0.5 * Vy * Vy;

  // Output as complex numbers with zero imaginary part
  A[idx] = vec2<f32>(A_real, 0.0);
  B[idx] = vec2<f32>(B_real, 0.0);
}
`,j=`// Pack Ahat and Bhat into ABhat
//
// Combines two vec2 (complex) buffers into one vec4 buffer for the BDF update.
//
// Input:
//   - Ahat: vec2<f32> = (Ahat.real, Ahat.imag)
//   - Bhat: vec2<f32> = (Bhat.real, Bhat.imag)
//
// Output:
//   - ABhat: vec4<f32> = (Ahat.real, Ahat.imag, Bhat.real, Bhat.imag)

struct PackParams {
  resolution: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> Ahat: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> Bhat: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> ABhat: array<vec4<f32>>;
@group(0) @binding(3) var<uniform> params: PackParams;

@compute @workgroup_size(16, 16, 1)
fn pack_abhat(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;
  let a = Ahat[idx];
  let b = Bhat[idx];

  // Pack: (Ahat.real, Ahat.imag, Bhat.real, Bhat.imag)
  ABhat[idx] = vec4<f32>(a.x, a.y, b.x, b.y);
}
`,H=`// Compute Nonlinear Terms
//
// Computes the nonlinear squared gradient terms:
// - A = -0.5 * (∂V/∂x)²
// - B = -0.5 * (∂V/∂y)²
//
// Input: V_VxVy (vec4<f32>) = (V.x, V.y, Vx, Vy) from inverse FFT of derivatives
// Output: AB (vec4<f32>) = (A.real, A.imag=0, B.real, B.imag=0)
//
// These will be FFT'd to get Ahat and Bhat for the BDF update.

struct ComputeNonlinearParams {
  resolution: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> V_VxVy: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> AB: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: ComputeNonlinearParams;

@compute @workgroup_size(16, 16, 1)
fn compute_nonlinear(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;
  let data = V_VxVy[idx];

  // Extract spatial derivatives (from channels z,w)
  let Vx = data.z;
  let Vy = data.w;

  // Compute squared terms (Equation F.9 from Kalogirou)
  // A = -F(0.5 * (∂V/∂x)²)  (pre-FFT, so just compute the spatial term)
  // B = -F(0.5 * (∂V/∂y)²)
  let A_real = -0.5 * Vx * Vx;
  let B_real = -0.5 * Vy * Vy;

  // Output as (A.real, 0, B.real, 0) for FFT
  // Swizzle to (A.real, B.real, 0, 0) -> then reorder to (A.r, A.i, B.r, B.i) = (A.r, B.r, 0, 0) in xzyw order
  AB[idx] = vec4<f32>(A_real, 0.0, B_real, 0.0);
}
`,Y=`// BDF2 Time Integration in Frequency Domain
//
// Implements second-order Backward Differentiation Formula (BDF2) update
// for the Kuramoto-Sivashinsky equation in frequency domain.
//
// From Kalogirou thesis, Equation (F.8):
//
// Vhat^{n+2} = (1/ξ) * [
//   (2 + 2c·dt) * Vhat^{n+1} - (0.5 + c·dt) * Vhat^n
//   + 2dt * (Ahat^{n+1} + (ν2/ν1) * Bhat^{n+1})
//   - dt * (Ahat^n + (ν2/ν1) * Bhat^n)
// ]
//
// where:
//   ξ = 1.5 + c·dt - dt·(k1² + (ν2/ν1)·k2²) + ν1·dt·(k1² + (ν2/ν1)·k2²)²
//   c = 1 + 1/ν1

// Complex multiplication
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x
  );
}

// Wavenumber calculation
fn wavenumber(coord: vec2<u32>, resolution: vec2<u32>, dx: vec2<f32>) -> vec2<f32> {
  let half_res = vec2<f32>(f32(resolution.x) / 2.0, f32(resolution.y) / 2.0);
  let coord_f = vec2<f32>(f32(coord.x), f32(coord.y));

  var k = coord_f;
  if (coord_f.x >= half_res.x) {
    k.x = coord_f.x - f32(resolution.x);
  }
  if (coord_f.y >= half_res.y) {
    k.y = coord_f.y - f32(resolution.y);
  }

  return k * (2.0 * 3.14159265359 / (vec2<f32>(resolution) * dx));
}

struct BDFParams {
  resolution: vec2<u32>,
  dx: vec2<f32>,
  dt: f32,
  nu: vec2<f32>,  // (ν1, ν2)
}

@group(0) @binding(0) var<storage, read> Vhat0: array<vec2<f32>>;  // Vhat^n
@group(0) @binding(1) var<storage, read> Vhat1: array<vec2<f32>>;  // Vhat^{n+1}
@group(0) @binding(2) var<storage, read> ABhat0: array<vec4<f32>>;  // (Ahat^n, Bhat^n)
@group(0) @binding(3) var<storage, read> ABhat1: array<vec4<f32>>;  // (Ahat^{n+1}, Bhat^{n+1})
@group(0) @binding(4) var<storage, read_write> Vhat2: array<vec2<f32>>;  // Vhat^{n+2} (output)
@group(0) @binding(5) var<uniform> params: BDFParams;

@compute @workgroup_size(16, 16, 1)
fn bdf_update(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;

  // Read current state
  let Vhat_n = Vhat0[idx];
  let Vhat_n1 = Vhat1[idx];
  let ABhat_n = ABhat0[idx];
  let ABhat_n1 = ABhat1[idx];

  // Extract A and B (stored as vec4 = (A.real, A.imag, B.real, B.imag))
  let Ahat_n = ABhat_n.xy;
  let Bhat_n = ABhat_n.zw;
  let Ahat_n1 = ABhat_n1.xy;
  let Bhat_n1 = ABhat_n1.zw;

  // Compute wavenumber
  let k = wavenumber(vec2<u32>(x, y), resolution, params.dx);
  let k1 = k.x;
  let k2 = k.y;

  // BDF parameters (Equation F.7)
  let nu1 = params.nu.x;
  let nu2 = params.nu.y;
  let c = 1.0 + 1.0 / nu1;
  let dt = params.dt;
  let cdt = c * dt;
  let nu21 = nu2 / nu1;
  let nu12 = nu1 / nu2;

  // Equation (F.10) - denominator ξ (always real for even-order derivatives)
  let k1k2_2 = k1 * k1 + nu21 * k2 * k2;
  let xi = 1.5 + cdt - dt * k1k2_2 + dt * nu1 * k1k2_2 * k1k2_2;

  // Equation (F.8) - BDF2 update
  var Vhat_n2 = (
    (2.0 + 2.0 * cdt) * Vhat_n1
    - (0.5 + cdt) * Vhat_n
    + dt * (2.0 * (Ahat_n1 + nu21 * Bhat_n1) - (Ahat_n + nu21 * Bhat_n))
  ) / xi;

  // Zero out DC component (k=0) since all terms are derivatives
  if (x == 0u && y == 0u) {
    Vhat_n2 = vec2<f32>(0.0, 0.0);
  }

  // Write result
  Vhat2[idx] = Vhat_n2;
}
`,Z=`// Extract Real Component
//
// Workaround for energy leakage into imaginary component when using
// complex FFT on real-valued functions. Extracts only the real part.
//
// This may be eliminated if we implement proper Hermitian symmetry enforcement.

struct ExtractRealParams {
  resolution: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> input: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> output: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: ExtractRealParams;

@compute @workgroup_size(16, 16, 1)
fn extract_real(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;
  let value = input[idx];

  // Keep only real component, zero out imaginary
  output[idx] = vec2<f32>(value.x, 0.0);
}
`,J=`// Fullscreen Vertex Shader
//
// Renders a fullscreen triangle that covers the entire viewport.
// Used as the vertex stage for visualization fragment shaders.

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn fullscreen(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
  var output: VertexOutput;

  // Generate fullscreen triangle
  // Triangle vertices: (-1,-1), (3,-1), (-1,3)
  // This covers the entire NDC space [-1,1]²
  let x = f32((vertex_index << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vertex_index & 2u) * 2.0 - 1.0;

  output.position = vec4<f32>(x, -y, 0.0, 1.0);  // Flip Y for correct orientation
  output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);  // UV in [0,1]

  return output;
}
`,Q=`// Visualization Fragment Shader
//
// Renders the spatial domain solution with color mapping.
// - Bilinear interpolation for smooth display at any resolution
// - Clamps values to [range.x, range.y]
// - Maps through smooth ramp function
// - Applies colorscale lookup
// - Supports zoom/pan via viewInverse matrix with periodic wrapping

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

struct VisualizeParams {
  resolution: vec2<u32>,
  contrast: f32,     // multiplier for colorscale mapping
  invert: u32,       // 0 or 1
  domainSize: vec2<f32>, // Lx, Ly for normalizing data coords to UV
}

@group(0) @binding(0) var<storage, read> V: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: VisualizeParams;
@group(0) @binding(2) var colorscale_texture: texture_2d<f32>;
@group(0) @binding(3) var colorscale_sampler: sampler;
@group(0) @binding(4) var<uniform> viewInverse: mat4x4<f32>;

// Smooth ramp function
fn ramp(x: f32) -> f32 {
  let PI = 3.14159265359;
  return 0.5 + atan(PI * (x - 0.5)) / PI;
}

// Sample V buffer with periodic wrapping
fn sampleV(x: i32, y: i32, res: vec2<u32>) -> f32 {
  // Wrap coordinates periodically
  var wx = x % i32(res.x);
  var wy = y % i32(res.y);
  if (wx < 0) { wx += i32(res.x); }
  if (wy < 0) { wy += i32(res.y); }
  let idx = u32(wy) * res.x + u32(wx);
  return V[idx].x;
}

@fragment
fn visualize(input: VertexOutput) -> @location(0) vec4<f32> {
  let resolution = params.resolution;
  let res_f = vec2<f32>(resolution);

  // Transform UV through viewInverse for zoom/pan
  // UV [0,1] -> clip space [-1,1] -> data space [0,Lx]×[0,Ly] via viewInverse -> UV [0,1]
  let clip = vec4<f32>(input.uv * 2.0 - 1.0, 0.0, 1.0);
  let data = viewInverse * clip;

  // Normalize data coordinates to UV [0,1] by dividing by domain size
  let uv_transformed = data.xy / params.domainSize;

  // Convert to pixel coordinates (centered on pixels)
  // UV 0 maps to pixel center 0.5, UV 1 maps to pixel center (N-0.5)
  let pixel_coord = uv_transformed * res_f - vec2<f32>(0.5);

  // Get integer pixel coordinates for the 4 surrounding pixels
  let x0 = i32(floor(pixel_coord.x));
  let y0 = i32(floor(pixel_coord.y));
  let x1 = x0 + 1;
  let y1 = y0 + 1;

  // Get fractional part for interpolation
  let fx = fract(pixel_coord.x);
  let fy = fract(pixel_coord.y);

  // Sample 4 neighboring pixels
  let v00 = sampleV(x0, y0, resolution);
  let v10 = sampleV(x1, y0, resolution);
  let v01 = sampleV(x0, y1, resolution);
  let v11 = sampleV(x1, y1, resolution);

  // Bilinear interpolation
  let value = mix(mix(v00, v10, fx), mix(v01, v11, fx), fy);

  // Clamp to range
  var f = 0.5 + 0.07 * value * params.contrast; //(value - range.x) / (range.y - range.x);

  // Invert if requested
  if (params.invert != 0u) {
    f = 1.0 - f;
  }

  // Apply smooth ramp
  f = ramp(f);

  // Clamp f to [0,1] for texture sampling
  f = clamp(f, 0.0, 1.0);

  // Sample colorscale (1D texture, use v=0.5)
  let color = textureSample(colorscale_texture, colorscale_sampler, vec2<f32>(f, 0.5));

  return vec4<f32>(color.rgb, 1.0);
}
`;async function $(e,d,p){const c=N(e,p),f=e.createShaderModule({label:"Initialize shader",code:R}),y=e.createShaderModule({label:"Differentiate shader",code:q}),x=e.createShaderModule({label:"Extract mixed derivatives shader",code:K}),m=e.createShaderModule({label:"Compute AB shader",code:W}),v=e.createShaderModule({label:"Pack ABhat shader",code:j}),g=e.createShaderModule({label:"Compute nonlinear shader",code:H}),b=e.createShaderModule({label:"BDF update shader",code:Y}),h=e.createShaderModule({label:"Extract real shader",code:Z}),_=e.createShaderModule({label:"Fullscreen vertex shader",code:J}),P=e.createShaderModule({label:"Visualize shader",code:Q}),n=e.createBindGroupLayout({label:"Initialize bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),t=e.createBindGroupLayout({label:"Differentiate bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),a=e.createBindGroupLayout({label:"Extract mixed derivatives bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),i=e.createBindGroupLayout({label:"Compute AB bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),r=e.createBindGroupLayout({label:"Pack ABhat bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),o=e.createBindGroupLayout({label:"Compute nonlinear bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),l=e.createBindGroupLayout({label:"BDF update bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),u=e.createBindGroupLayout({label:"Extract real bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),s=e.createBindGroupLayout({label:"Visualize bind group layout",entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),V=e.createPipelineLayout({label:"Initialize pipeline layout",bindGroupLayouts:[n]}),B=e.createPipelineLayout({label:"Differentiate pipeline layout",bindGroupLayouts:[t]}),S=e.createPipelineLayout({label:"Extract mixed derivatives pipeline layout",bindGroupLayouts:[a]}),A=e.createPipelineLayout({label:"Compute AB pipeline layout",bindGroupLayouts:[i]}),U=e.createPipelineLayout({label:"Pack ABhat pipeline layout",bindGroupLayouts:[r]}),k=e.createPipelineLayout({label:"Compute nonlinear pipeline layout",bindGroupLayouts:[o]}),C=e.createPipelineLayout({label:"BDF update pipeline layout",bindGroupLayouts:[l]}),G=e.createPipelineLayout({label:"Extract real pipeline layout",bindGroupLayouts:[u]}),w=e.createPipelineLayout({label:"Visualize pipeline layout",bindGroupLayouts:[s]}),M=e.createComputePipeline({label:"Initialize pipeline",layout:V,compute:{module:f,entryPoint:"initialize"}}),F=e.createComputePipeline({label:"Differentiate pipeline",layout:B,compute:{module:y,entryPoint:"differentiate"}}),z=e.createComputePipeline({label:"Extract mixed derivatives pipeline",layout:S,compute:{module:x,entryPoint:"extract_mixed_derivatives"}}),E=e.createComputePipeline({label:"Compute AB pipeline",layout:A,compute:{module:m,entryPoint:"compute_ab"}}),T=e.createComputePipeline({label:"Pack ABhat pipeline",layout:U,compute:{module:v,entryPoint:"pack_abhat"}}),L=e.createComputePipeline({label:"Compute nonlinear pipeline",layout:k,compute:{module:g,entryPoint:"compute_nonlinear"}}),O=e.createComputePipeline({label:"BDF update pipeline",layout:C,compute:{module:b,entryPoint:"bdf_update"}}),D=e.createComputePipeline({label:"Extract real pipeline",layout:G,compute:{module:h,entryPoint:"extract_real"}}),I=e.createRenderPipeline({label:"Visualize pipeline",layout:w,vertex:{module:_,entryPoint:"fullscreen"},fragment:{module:P,entryPoint:"visualize",targets:[{format:d}]},primitive:{topology:"triangle-list"}});return{fft:c,initialize:M,differentiate:F,extractMixedDerivatives:z,computeAB:E,packABhat:T,computeNonlinear:L,bdfUpdate:O,extractReal:D,visualize:I,bindGroupLayouts:{initialize:n,differentiate:t,extractMixedDerivatives:a,computeAB:i,packABhat:r,computeNonlinear:o,bdfUpdate:l,extractReal:u,visualize:s}}}export{$ as createKSPipelines};
