import{createFFTPipelines as j,createVec4FFTPipelines as B}from"./fft-Chkx7JT6.js";const H=`// Clear grid shader - zeros the atomic density accumulator

struct ClearParams {
  gridSize: u32,
}

@group(0) @binding(0) var<storage, read_write> densityAtomic: array<atomic<i32>>;
@group(0) @binding(1) var<uniform> params: ClearParams;

@compute @workgroup_size(16, 16)
fn clear_grid(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.gridSize;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;
  atomicStore(&densityAtomic[idx], 0);
}
`,R=`// Accumulate shader - deposits particle mass to grid using bilinear weights
// Uses fixed-point atomics since WebGPU lacks atomic float operations

struct AccumulateParams {
  gridSize: u32,
  numParticles: u32,
  fixedPointScale: f32,  // Scale factor for fixed-point (e.g., 2^24)
  massPerParticle: f32,  // 1.0 / numParticles for unit total mass
}

@group(0) @binding(0) var<storage, read> particles: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> densityAtomic: array<atomic<i32>>;
@group(0) @binding(2) var<uniform> params: AccumulateParams;

@compute @workgroup_size(256)
fn accumulate(@builtin(global_invocation_id) id: vec3<u32>) {
  let particleIdx = id.x;
  if (particleIdx >= params.numParticles) { return; }

  let N = params.gridSize;
  let Nf = f32(N);
  let p = particles[particleIdx];

  // Position in grid coordinates [0, N)
  let gx = p.x * Nf;
  let gy = p.y * Nf;

  // Cell indices (integer part)
  let i0 = u32(floor(gx));
  let j0 = u32(floor(gy));

  // Fractional part for bilinear weights
  let fx = gx - floor(gx);
  let fy = gy - floor(gy);

  // Bilinear weights
  let w00 = (1.0 - fx) * (1.0 - fy);
  let w10 = fx * (1.0 - fy);
  let w01 = (1.0 - fx) * fy;
  let w11 = fx * fy;

  // Convert to fixed-point
  let mass = params.massPerParticle;
  let scale = params.fixedPointScale;
  let m00 = i32(w00 * mass * scale);
  let m10 = i32(w10 * mass * scale);
  let m01 = i32(w01 * mass * scale);
  let m11 = i32(w11 * mass * scale);

  // Wrap indices for periodic boundaries
  let i1 = (i0 + 1u) % N;
  let j1 = (j0 + 1u) % N;

  // Accumulate to 4 neighboring cells
  atomicAdd(&densityAtomic[j0 * N + i0], m00);
  atomicAdd(&densityAtomic[j0 * N + i1], m10);
  atomicAdd(&densityAtomic[j1 * N + i0], m01);
  atomicAdd(&densityAtomic[j1 * N + i1], m11);
}
`,Y=`// Convert density shader - converts atomic i32 to vec2<f32> complex (always f32)

struct ConvertParams {
  gridSize: u32,
  fixedPointScale: f32,  // Scale factor used in accumulation
}

@group(0) @binding(0) var<storage, read> densityAtomic: array<i32>;  // Non-atomic read
@group(0) @binding(1) var<storage, read_write> density: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: ConvertParams;

@compute @workgroup_size(16, 16)
fn convert_density(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.gridSize;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;

  // Convert fixed-point to float and write as complex number (real, imag=0)
  let rawValue = densityAtomic[idx];
  let floatValue = f32(rawValue) / params.fixedPointScale;

  density[idx] = vec2<f32>(floatValue, 0.0);
}
`,W=`// Poisson solve shader - solves Poisson equation and computes gradient in frequency domain
// PRECISION_ENABLE
//
// Input: densityHat (FFT of mass per cell) - always f32 to avoid underflow
// Output: gradientHat (FFT of gradient) - packed as (dphi/dx, phi, dphi/dy, 0)
//
// Physics:
//   nabla^2 phi = 4*pi*rho  (Poisson for gravity with G=1)
//   In Fourier: -|k|^2 * phi_hat = 4*pi * rho_hat
//   So: phi_hat = -4*pi * rho_hat / |k|^2
//
//   IMPORTANT: densityHat contains FFT of mass per cell, not mass density.
//   Physical density = mass_per_cell * N^2 (cell area = 1/N^2)
//   So we multiply by N^2 to get correct physical units.
//
//   Gradient: d/dx -> multiply by i*kx in Fourier

alias GradientVec = vec4<FLOAT_TYPE>;

struct PoissonParams {
  gridSize: u32,
}

const PI: f32 = 3.14159265359;

@group(0) @binding(0) var<storage, read> densityHat: array<vec2<f32>>;  // Always f32
@group(0) @binding(1) var<storage, read_write> gradientHat: array<GradientVec>;
@group(0) @binding(2) var<storage, read_write> potentialHat: array<vec2<f32>>;  // Reuses density buffer
@group(0) @binding(3) var<uniform> params: PoissonParams;

@compute @workgroup_size(16, 16)
fn poisson_solve(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.gridSize;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;
  let Nf = f32(N);

  // Compute wavenumber
  // FFT layout: 0, 1, ..., N/2-1, -N/2, -N/2+1, ..., -1
  var kx = f32(id.x);
  var ky = f32(id.y);
  if (kx >= Nf * 0.5) { kx -= Nf; }
  if (ky >= Nf * 0.5) { ky -= Nf; }

  // Scale by 2*pi (domain is [0,1]^2)
  kx *= 2.0 * PI;
  ky *= 2.0 * PI;

  let k2 = kx * kx + ky * ky;

  // Convert from mass per cell to physical density by multiplying by N^2
  // (cell area = 1/N^2, so density = mass / area = mass * N^2)
  let rhoHat = densityHat[idx] * Nf * Nf;

  if (k2 > 1e-8) {
    // phi_hat = -4*pi * rho_hat / |k|^2
    let phiHat = -4.0 * PI * rhoHat / k2;

    // Store potential in frequency domain (for later inverse FFT)
    potentialHat[idx] = phiHat;

    // Gradient: d/dx -> i*kx multiplication
    // For complex z = (re, im), multiply by i*k:
    // i*k * z = i*k * (re + i*im) = -k*im + i*k*re = (-k*im, k*re)
    let dphidx = vec2<f32>(-kx * phiHat.y, kx * phiHat.x);
    let dphidy = vec2<f32>(-ky * phiHat.y, ky * phiHat.x);

    // Pack as: (dphi/dx_re, dphi/dx_im, dphi/dy_re, dphi/dy_im)
    // After inverse FFT, we'll have (dphi/dx, ~0, dphi/dy, ~0)
    gradientHat[idx] = GradientVec(
      FLOAT_TYPE(dphidx.x), FLOAT_TYPE(dphidx.y),
      FLOAT_TYPE(dphidy.x), FLOAT_TYPE(dphidy.y)
    );
  } else {
    // Zero DC component (sets mean potential to zero)
    potentialHat[idx] = vec2<f32>(0.0, 0.0);
    gradientHat[idx] = GradientVec(
      FLOAT_TYPE(0.0), FLOAT_TYPE(0.0),
      FLOAT_TYPE(0.0), FLOAT_TYPE(0.0)
    );
  }
}
`,q=`// Integrate shader - Velocity Verlet (Kick-Drift-Kick) integration
// PRECISION_ENABLE
//
// Particles: vec4(x, y, vx, vy)
// Gradient: vec4(dphi/dx_re, dphi/dx_im, dphi/dy_re, dphi/dy_im)
//           After inverse FFT, imaginary parts are ~0, so we use .x and .z
//
// The force is F = -grad(phi), and acceleration a = F (unit mass per particle)
// Verlet KDK: v(n+1/2) = v(n) + a(n)*dt/2
//             x(n+1) = x(n) + v(n+1/2)*dt
//             v(n+1) = v(n+1/2) + a(n+1)*dt/2
//
// For simplicity, we compute the full step in one pass using midpoint method:
// This is equivalent to second-order accurate integration

alias GradientVec = vec4<FLOAT_TYPE>;

struct IntegrateParams {
  gridSize: u32,
  numParticles: u32,
  dt: f32,
  _padding: f32,  // Unused, kept for buffer alignment
}

@group(0) @binding(0) var<storage, read_write> particles: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> gradient: array<GradientVec>;
@group(0) @binding(2) var<uniform> params: IntegrateParams;

// Bilinear interpolation of gradient field
fn sampleGradient(pos: vec2<f32>) -> vec2<f32> {
  let N = params.gridSize;
  let Nf = f32(N);

  // Position in grid coordinates
  let gx = pos.x * Nf;
  let gy = pos.y * Nf;

  // Cell indices
  let i0 = u32(floor(gx)) % N;
  let j0 = u32(floor(gy)) % N;
  let i1 = (i0 + 1u) % N;
  let j1 = (j0 + 1u) % N;

  // Fractional part
  let fx = fract(gx);
  let fy = fract(gy);

  // Sample the 4 corners (using real parts: .x for dphi/dx, .z for dphi/dy)
  let g00 = vec4<f32>(gradient[j0 * N + i0]);
  let g10 = vec4<f32>(gradient[j0 * N + i1]);
  let g01 = vec4<f32>(gradient[j1 * N + i0]);
  let g11 = vec4<f32>(gradient[j1 * N + i1]);

  // Bilinear interpolation
  let gx_interp = (1.0 - fx) * (1.0 - fy) * g00.x
                + fx * (1.0 - fy) * g10.x
                + (1.0 - fx) * fy * g01.x
                + fx * fy * g11.x;

  let gy_interp = (1.0 - fx) * (1.0 - fy) * g00.z
                + fx * (1.0 - fy) * g10.z
                + (1.0 - fx) * fy * g01.z
                + fx * fy * g11.z;

  return vec2<f32>(gx_interp, gy_interp);
}

@compute @workgroup_size(256)
fn integrate(@builtin(global_invocation_id) id: vec3<u32>) {
  let particleIdx = id.x;
  if (particleIdx >= params.numParticles) { return; }

  var p = particles[particleIdx];
  let pos = vec2<f32>(p.x, p.y);
  let vel = vec2<f32>(p.z, p.w);

  // Get acceleration at current position
  // Force = -grad(phi), acceleration = force (unit mass per particle)
  // Gradient is now in physical units after N^2 correction in Poisson solve
  let gradPhi = sampleGradient(pos);
  let acc = -gradPhi;

  // Midpoint integration (2nd order):
  // Predict position at half-step
  let velHalf = vel + acc * params.dt * 0.5;
  var posHalf = pos + velHalf * params.dt * 0.5;
  posHalf = fract(posHalf);  // Periodic wrap

  // Get acceleration at midpoint
  let gradPhiMid = sampleGradient(posHalf);
  let accMid = -gradPhiMid;

  // Full step using midpoint acceleration
  let newVel = vel + accMid * params.dt;
  var newPos = pos + newVel * params.dt;
  newPos = fract(newPos);  // Periodic wrap

  particles[particleIdx] = vec4<f32>(newPos, newVel);
}
`,X=`// Visualize shader - renders particles as point sprites with additive blending
//
// Vertex shader: reads particle position from buffer, outputs point primitive
// Fragment shader: draws soft circle with configurable brightness

struct VisParams {
  canvasWidth: u32,
  canvasHeight: u32,
  pointSize: f32,
  brightness: f32,
  numParticles: u32,
}

struct VertexInput {
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) center: vec2<f32>,  // Screen-space center for soft circle
}

@group(0) @binding(0) var<storage, read> particles: array<vec4<f32>>;
@group(0) @binding(1) var<uniform> params: VisParams;

@vertex
fn visualize_vertex(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let p = particles[input.instanceIndex];

  // Map [0,1] position to clip space [-1,1]
  let clipPos = vec2<f32>(p.x * 2.0 - 1.0, p.y * 2.0 - 1.0);

  // Screen-space center for fragment shader
  output.center = vec2<f32>(
    (clipPos.x * 0.5 + 0.5) * f32(params.canvasWidth),
    (1.0 - (clipPos.y * 0.5 + 0.5)) * f32(params.canvasHeight)
  );

  // Quad vertices for point sprite (2 triangles, 6 vertices)
  let quadVerts = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );

  let offset = quadVerts[input.vertexIndex];
  let pixelOffset = offset * params.pointSize;

  // Convert pixel offset to clip space
  let clipOffset = vec2<f32>(
    pixelOffset.x * 2.0 / f32(params.canvasWidth),
    -pixelOffset.y * 2.0 / f32(params.canvasHeight)
  );

  output.position = vec4<f32>(clipPos + clipOffset, 0.0, 1.0);

  return output;
}

@fragment
fn visualize_fragment(input: VertexOutput) -> @location(0) vec4<f32> {
  // Distance from center of point sprite
  let dist = length(input.position.xy - input.center);
  let radius = params.pointSize;

  // Soft circle falloff
  let alpha = 1.0 - smoothstep(0.0, radius, dist);

  // Normalize brightness by number of particles so total brightness is independent of particle count
  // Scale by 1000 to compensate for the sqrt normalization
  let normalizedBrightness = params.brightness * 1000.0 / sqrt(f32(params.numParticles));

  // Blue-ish color with brightness control
  let color = vec3<f32>(0.2, 0.4, 1.0) * normalizedBrightness;

  return vec4<f32>(color * alpha, alpha);
}
`,K=`// Fullscreen vertex shader for density visualization

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn fullscreen(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  // Generate fullscreen triangle
  let x = f32((vertexIndex << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vertexIndex & 2u) * 2.0 - 1.0;

  output.position = vec4<f32>(x, -y, 0.0, 1.0);
  output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);

  return output;
}
`,Q=`// Visualize density shader - renders density field with bilinear interpolation
// Density is always f32 to avoid underflow issues

struct DensityVisParams {
  gridSize: u32,
  scale: f32,
  viewMin: vec2<f32>,
  viewMax: vec2<f32>,
}

@group(0) @binding(0) var<storage, read> density: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: DensityVisParams;

@fragment
fn visualize_density(@location(0) rawUv: vec2<f32>) -> @location(0) vec4<f32> {
  // Transform UV by view bounds (for zoom/pan), then wrap to [0,1] for periodic tiling
  let uv = fract(params.viewMin + rawUv * (params.viewMax - params.viewMin));

  let N = params.gridSize;
  let Nf = f32(N);

  // Grid coordinates (shifted by 0.5 to sample at cell centers)
  let gx = uv.x * Nf - 0.5;
  let gy = uv.y * Nf - 0.5;

  // Cell indices for bilinear interpolation (add Nf to handle negative values near 0)
  let i0 = u32(floor(gx) + Nf) % N;
  let j0 = u32(floor(gy) + Nf) % N;
  let i1 = (i0 + 1u) % N;
  let j1 = (j0 + 1u) % N;

  // Fractional part
  let fx = fract(gx);
  let fy = fract(gy);

  // Sample 4 corners
  let d00 = density[j0 * N + i0].x;
  let d10 = density[j0 * N + i1].x;
  let d01 = density[j1 * N + i0].x;
  let d11 = density[j1 * N + i1].x;

  // Bilinear interpolation
  let rho = mix(mix(d00, d10, fx), mix(d01, d11, fx), fy);

  // Background color #1B1714
  let bgColor = vec3<f32>(0.106, 0.090, 0.078);

  // Log scaling for dynamic range, then per-component 1-exp(-x) tone mapping
  let baseColor = vec3<f32>(0.2, 0.4, 1.0);
  let scaledDensity = rho * params.scale * 50.0 * Nf * Nf;
  let logDensity = log(1.0 + scaledDensity);
  let light = vec3<f32>(1.0) - exp(-baseColor * logDensity * 2.0);

  // Add light on top of background
  let color = bgColor + light;

  return vec4<f32>(color, 1.0);
}
`,Z=`// Visualize gradient shader - adaptive linear contouring with direction coloring
// Based on adaptive-contouring-in-fragment-shaders for magnitude (linear mode)
// PRECISION_ENABLE

alias GradientVec = vec4<FLOAT_TYPE>;

struct GradientVisParams {
  gridSize: u32,
  scale: f32,        // Opacity control
  canvasSize: f32,   // Canvas size in pixels
  pixelRatio: f32,   // Device pixel ratio
  viewMin: vec2<f32>,  // View bounds for zoom/pan
  viewMax: vec2<f32>,
}

const PI: f32 = 3.141592653589793;

// Contouring parameters
const OCTAVES: i32 = 8;
const OCTAVES_F: f32 = 8.0;
const DIVISIONS: f32 = 2.0;        // Divisions per octave (more = denser contours)
const MIN_SPACING: f32 = 2.0;      // Minimum spacing in pixels (smaller = denser)
const CONTRAST_POWER: f32 = 1.0;   // Shading contrast (higher = more contrast)
const ANTIALIAS_WIDTH: f32 = 0.5;  // Antialiasing width in pixels

@group(0) @binding(0) var<storage, read> gradient: array<GradientVec>;
@group(0) @binding(1) var<storage, read> potential: array<vec2<f32>>;  // After inverse FFT, .x is phi
@group(0) @binding(2) var<uniform> params: GradientVisParams;

// Rainbow colorscale for direction
fn rainbow(p: vec2<f32>) -> vec3<f32> {
  let theta = p.x * (2.0 * PI);
  let c = cos(theta);
  let s = sin(theta);

  let m1 = mat3x3<f32>(
    vec3<f32>(0.5230851, 0.56637411, 0.46725319),
    vec3<f32>(0.12769652, 0.14082407, 0.13691271),
    vec3<f32>(-0.25934743, -0.12121582, 0.2348705)
  );
  let m2 = mat3x3<f32>(
    vec3<f32>(0.3555664, -0.11472876, -0.01250831),
    vec3<f32>(0.15243126, -0.03668075, 0.0765231),
    vec3<f32>(-0.00192128, -0.01350681, -0.0036526)
  );

  let v1 = vec3<f32>(1.0, p.y * 2.0 - 1.0, s);
  let v2 = vec3<f32>(c, s * c, c * c - s * s);

  return m1 * v1 + m2 * v2;
}

// Contrast function for smooth shading transitions
fn contrastFunction(x: f32, power: f32) -> f32 {
  let y = 2.0 * x - 1.0;
  return 0.5 + 0.5 * pow(abs(y), power) * sign(y);
}

// Stable hypot
fn hypot2(z: vec2<f32>) -> f32 {
  let x = abs(z.x);
  let y = abs(z.y);
  let t = min(x, y);
  let m = max(x, y);
  if (m == 0.0) { return 0.0; }
  let r = t / m;
  return m * sqrt(1.0 + r * r);
}

// Linear adaptive shaded contouring (not log-magnitude)
// f: the scalar value to contour (gradient magnitude)
// screenSpaceGrad: how fast f changes per pixel
fn shadedLinearContours(f: f32, screenSpaceGrad: f32, minSpacing: f32) -> f32 {
  // Select octave based on local gradient
  let localOctave = log2(max(screenSpaceGrad * minSpacing, 1e-10)) / log2(DIVISIONS);
  let contourSpacing = pow(DIVISIONS, ceil(localOctave));

  // Plot variable: the value divided by contour spacing (linear, not log)
  var plotVar = f / contourSpacing;
  var widthScale = contourSpacing / max(screenSpaceGrad, 1e-10);

  var contourSum = 0.0;
  for (var i = 0; i < OCTAVES; i++) {
    // Weight fades in smallest octave, fades out largest
    let t = f32(i + 1) - fract(localOctave);
    let weight = smoothstep(0.0, 1.0, t) * smoothstep(OCTAVES_F, OCTAVES_F - 1.0, t);

    // Shading with antialiasing at the discontinuity
    let y = fract(plotVar);
    let shading = contrastFunction(y, CONTRAST_POWER);
    let antialias = (1.0 - y) * 0.5 * widthScale / ANTIALIAS_WIDTH;
    contourSum += weight * min(shading, antialias);

    // Rescale for next octave
    widthScale *= DIVISIONS;
    plotVar /= DIVISIONS;
  }

  return contourSum / OCTAVES_F;
}

@fragment
fn visualize_gradient(@location(0) rawUv: vec2<f32>) -> @location(0) vec4<f32> {
  // Transform UV by view bounds (for zoom/pan), then wrap to [0,1] for periodic tiling
  let uv = fract(params.viewMin + rawUv * (params.viewMax - params.viewMin));

  let N = params.gridSize;
  let Nf = f32(N);

  // Grid coordinates (shifted by 0.5 to sample at cell centers)
  let gx = uv.x * Nf - 0.5;
  let gy = uv.y * Nf - 0.5;

  // Cell indices for bilinear interpolation
  let i0 = u32(floor(gx) + Nf) % N;
  let j0 = u32(floor(gy) + Nf) % N;
  let i1 = (i0 + 1u) % N;
  let j1 = (j0 + 1u) % N;

  let fx = fract(gx);
  let fy = fract(gy);

  // Sample 4 corners (real parts: .x for gx, .z for gy)
  let g00 = vec4<f32>(gradient[j0 * N + i0]);
  let g10 = vec4<f32>(gradient[j0 * N + i1]);
  let g01 = vec4<f32>(gradient[j1 * N + i0]);
  let g11 = vec4<f32>(gradient[j1 * N + i1]);

  // Bilinear interpolation of gradient
  let gradX = (1.0 - fx) * (1.0 - fy) * g00.x
            + fx * (1.0 - fy) * g10.x
            + (1.0 - fx) * fy * g01.x
            + fx * fy * g11.x;

  let gradY = (1.0 - fx) * (1.0 - fy) * g00.z
            + fx * (1.0 - fy) * g10.z
            + (1.0 - fx) * fy * g01.z
            + fx * fy * g11.z;

  // Gradient magnitude and direction
  let mag = hypot2(vec2<f32>(gradX, gradY));
  let arg = atan2(gradY, gradX);

  // Estimate Hessian from bilinear samples (derivative of gradient in grid space)
  // Cell spacing is 1/N in domain units, so multiply difference by N to get domain derivative
  let dgx_dx = ((1.0 - fy) * (g10.x - g00.x) + fy * (g11.x - g01.x)) * Nf;
  let dgx_dy = ((1.0 - fx) * (g01.x - g00.x) + fx * (g11.x - g10.x)) * Nf;
  let dgy_dx = ((1.0 - fy) * (g10.z - g00.z) + fy * (g11.z - g01.z)) * Nf;
  let dgy_dy = ((1.0 - fx) * (g01.z - g00.z) + fx * (g11.z - g10.z)) * Nf;

  // Derivative of magnitude in domain space: d|g|/dx = (gx * dgx/dx + gy * dgy/dx) / |g|
  let magRecip = 1.0 / max(mag, 1e-20);
  let dMag_dx = (gradX * dgx_dx + gradY * dgy_dx) * magRecip;
  let dMag_dy = (gradX * dgx_dy + gradY * dgy_dy) * magRecip;

  // Convert from domain space to screen space (per pixel)
  // Visible domain spans (viewMax - viewMin) and maps to canvasSize pixels
  let viewScale = params.viewMax - params.viewMin;
  let domainToScreen = viewScale / params.canvasSize;
  let screenSpaceGrad = hypot2(vec2<f32>(dMag_dx, dMag_dy) * domainToScreen);

  // Compute shaded contours of the magnitude (linear mode)
  // The adaptive algorithm selects octaves based on screenSpaceGrad, handling any scale
  let minSpacing = MIN_SPACING * params.pixelRatio;
  let shading = shadedLinearContours(mag, screenSpaceGrad, minSpacing);

  // Direction mapped to hue [0, 1]
  let hue = arg / (2.0 * PI) + 0.5;

  // Color: rainbow hue based on direction, brightness based on magnitude shading
  var color = rainbow(vec2<f32>(hue - 0.25, 0.2 + 0.8 * shading));

  // Sample potential with bilinear interpolation
  let phi00 = potential[j0 * N + i0].x;
  let phi10 = potential[j0 * N + i1].x;
  let phi01 = potential[j1 * N + i0].x;
  let phi11 = potential[j1 * N + i1].x;
  let phi = (1.0 - fx) * (1.0 - fy) * phi00
          + fx * (1.0 - fy) * phi10
          + (1.0 - fx) * fy * phi01
          + fx * fy * phi11;

  // Fade to black for high potential regions (far from mass concentrations)
  // Since DC component is zeroed, potential has zero mean: half positive, half negative
  // Positive = high potential = far from mass = fade to black
  let fadeFactor = smoothstep(1.0, -0.5, phi);  // Fade where phi > 0
  color *= fadeFactor;

  // Apply opacity from scale parameter
  return vec4<f32>(color, params.scale);
}
`;function r(e,n){const t=n==="f16"?"f16":"f32",i=n==="f16"?`enable f16;
`:"";return e.replace("// PRECISION_ENABLE",i).replace(/FLOAT_TYPE/g,t)}async function $(e,n,t,i="f32"){const v=j(e,t,i),x=B(e,t,e.limits.maxComputeWorkgroupSizeX,i),h=e.createShaderModule({label:"Clear grid shader",code:H}),b=e.createShaderModule({label:"Accumulate shader",code:R}),P=e.createShaderModule({label:"Convert density shader",code:Y}),S=e.createShaderModule({label:"Poisson solve shader",code:r(W,i)}),N=e.createShaderModule({label:"Integrate shader",code:r(q,i)}),o=e.createShaderModule({label:"Visualize shader",code:X}),a=e.createShaderModule({label:"Fullscreen shader",code:K}),l=e.createShaderModule({label:"Visualize density shader",code:Q}),z=e.createShaderModule({label:"Visualize gradient shader",code:r(Z,i)}),s=e.createBindGroupLayout({label:"Clear grid bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),d=e.createBindGroupLayout({label:"Accumulate bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),c=e.createBindGroupLayout({label:"Convert density bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),p=e.createBindGroupLayout({label:"Poisson solve bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),u=e.createBindGroupLayout({label:"Integrate bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),f=e.createBindGroupLayout({label:"Visualize bind group layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),g=e.createBindGroupLayout({label:"Visualize density bind group layout",entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),y=e.createBindGroupLayout({label:"Visualize gradient bind group layout",entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),G=e.createPipelineLayout({label:"Clear grid pipeline layout",bindGroupLayouts:[s]}),_=e.createPipelineLayout({label:"Accumulate pipeline layout",bindGroupLayouts:[d]}),w=e.createPipelineLayout({label:"Convert density pipeline layout",bindGroupLayouts:[c]}),T=e.createPipelineLayout({label:"Poisson solve pipeline layout",bindGroupLayouts:[p]}),V=e.createPipelineLayout({label:"Integrate pipeline layout",bindGroupLayouts:[u]}),C=e.createPipelineLayout({label:"Visualize pipeline layout",bindGroupLayouts:[f]}),m=e.createPipelineLayout({label:"Visualize density pipeline layout",bindGroupLayouts:[g]}),F=e.createPipelineLayout({label:"Visualize gradient pipeline layout",bindGroupLayouts:[y]}),A=e.createComputePipeline({label:"Clear grid pipeline",layout:G,compute:{module:h,entryPoint:"clear_grid"}}),M=e.createComputePipeline({label:"Accumulate pipeline",layout:_,compute:{module:b,entryPoint:"accumulate"}}),I=e.createComputePipeline({label:"Convert density pipeline",layout:w,compute:{module:P,entryPoint:"convert_density"}}),O=e.createComputePipeline({label:"Poisson solve pipeline",layout:T,compute:{module:S,entryPoint:"poisson_solve"}}),L=e.createComputePipeline({label:"Integrate pipeline",layout:V,compute:{module:N,entryPoint:"integrate"}}),E=e.createRenderPipeline({label:"Visualize pipeline",layout:C,vertex:{module:o,entryPoint:"visualize_vertex"},fragment:{module:o,entryPoint:"visualize_fragment",targets:[{format:n,blend:{color:{srcFactor:"one",dstFactor:"one",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one",operation:"add"}}}]},primitive:{topology:"triangle-list"}}),k=e.createRenderPipeline({label:"Visualize density pipeline",layout:m,vertex:{module:a,entryPoint:"fullscreen"},fragment:{module:l,entryPoint:"visualize_density",targets:[{format:n}]},primitive:{topology:"triangle-list"}}),U=e.createRenderPipeline({label:"Visualize density additive pipeline",layout:m,vertex:{module:a,entryPoint:"fullscreen"},fragment:{module:l,entryPoint:"visualize_density",targets:[{format:n,blend:{color:{srcFactor:"one",dstFactor:"one",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one",operation:"add"}}}]},primitive:{topology:"triangle-list"}}),D=e.createRenderPipeline({label:"Visualize gradient pipeline",layout:F,vertex:{module:a,entryPoint:"fullscreen"},fragment:{module:z,entryPoint:"visualize_gradient",targets:[{format:n,blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}}]},primitive:{topology:"triangle-list"}});return{fft:v,fftVec4:x,clearGrid:A,accumulate:M,convertDensity:I,poissonSolve:O,integrate:L,visualize:E,visualizeDensity:k,visualizeDensityAdditive:U,visualizeGradient:D,bindGroupLayouts:{clearGrid:s,accumulate:d,convertDensity:c,poissonSolve:p,integrate:u,visualize:f,visualizeDensity:g,visualizeGradient:y}}}export{$ as createGravityPipelines};
