import{createFFTPipelines as q}from"./fft-Chkx7JT6.js";const Z=`// Add Force Shader
// Applies velocity-matching force: f = (v_target - v_current) * damping
// This smoothly accelerates/decelerates fluid to match mouse velocity

struct ForceParams {
  resolution: vec2<u32>,
  position: vec2<f32>,
  targetVelocity: vec2<f32>,  // Mouse velocity in simulation units
  radius: f32,
  isActive: f32,
  damping: f32,  // How quickly to match velocity (0-1)
  padding: f32,
}

@group(0) @binding(0) var<storage, read_write> velocity: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> dye: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: ForceParams;

@compute @workgroup_size(16, 16)
fn add_force(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;

  // Position in [0, 1]
  let pos = vec2<f32>(f32(id.x) + 0.5, f32(id.y) + 0.5) / f32(N);

  // Distance from mouse position
  let diff = pos - params.position;
  let dist2 = dot(diff, diff);
  let radius2 = params.radius * params.radius;

  // Gaussian falloff for force
  let falloff = exp(-dist2 / (2.0 * radius2)) * params.isActive;

  // Current velocity
  var vel = velocity[idx];
  let currentVel = vec2<f32>(vel.x, vel.z);

  // Velocity-matching force: accelerate toward target velocity
  let velocityError = params.targetVelocity - currentVel;
  let force = velocityError * params.damping * falloff;

  vel.x += force.x;
  vel.z += force.y;
  velocity[idx] = vel;

  // Add dye with hard circle (not Gaussian) for sharper edges
  let dist = sqrt(dist2);
  let dyeRadius = params.radius * 0.7;  // Slightly smaller than force radius
  let inCircle = step(dist, dyeRadius) * params.isActive;

  var d = dye[idx];
  d.x += inCircle * 0.3;
  d.x = min(d.x, 1.0);
  dye[idx] = d;
}
`,J=`// Advection Shader (Semi-Lagrangian)
// Advects velocity field by tracing particles backward
// Uses monotone cubic interpolation (Fedkiw et al., "Visual Simulation of Smoke")

struct SimParams {
  resolution: vec2<u32>,
  dt: f32,
  viscosity: f32,
  dyeDecay: f32,
  wallThicknessX: f32,
  wallThicknessY: f32,
  useLinearInterp: u32,  // 0 = monotonic cubic, 1 = linear
}

@group(0) @binding(0) var<storage, read> velocityField: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> input: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> output: array<vec4<f32>>;
@group(0) @binding(3) var<uniform> params: SimParams;

// Wrap index with periodic boundary
fn wrapIndex(i: i32, N: i32) -> u32 {
  var idx = i % N;
  if (idx < 0) { idx += N; }
  return u32(idx);
}

// Clamp index to domain boundaries (allows sampling ghost cells in wall regions)
fn clampIndex(i: i32, N: i32) -> u32 {
  return u32(clamp(i, 0, N - 1));
}

// Get index handling boundary conditions
fn getIndex(i: i32, N: i32, wallThickness: f32) -> u32 {
  if (wallThickness > 0.0) {
    // With ghost cells, clamp to domain bounds (not fluid bounds)
    return clampIndex(i, N);
  } else {
    return wrapIndex(i, N);
  }
}

// Sample input at integer grid position
fn sampleAt(ix: i32, iy: i32, N: i32, wallX: f32, wallY: f32) -> vec4<f32> {
  let x = getIndex(ix, N, wallX);
  let y = getIndex(iy, N, wallY);
  return input[y * u32(N) + x];
}

// Sample velocity field at integer grid position (for RK2 midpoint)
fn sampleVelAt(ix: i32, iy: i32, N: i32, wallX: f32, wallY: f32) -> vec4<f32> {
  let x = getIndex(ix, N, wallX);
  let y = getIndex(iy, N, wallY);
  return velocityField[y * u32(N) + x];
}

// Monotone cubic Hermite interpolation for a single component
// Interpolates between f[1] and f[2] with t in [0,1]
// f[0], f[1], f[2], f[3] are the four sample values
fn monotoneCubic1D(f0: f32, f1: f32, f2: f32, f3: f32, t: f32) -> f32 {
  // Central difference slopes at f1 and f2
  var d1 = (f2 - f0) * 0.5;
  var d2 = (f3 - f1) * 0.5;

  // Delta between f1 and f2
  let delta = f2 - f1;

  // Monotonicity constraint: set slopes to zero if they differ in sign from delta
  // or if delta is zero (flat region)
  if (abs(delta) < 1e-10) {
    d1 = 0.0;
    d2 = 0.0;
  } else {
    if (sign(d1) != sign(delta)) { d1 = 0.0; }
    if (sign(d2) != sign(delta)) { d2 = 0.0; }
  }

  // Hermite basis coefficients
  // f(t) = a3*t^3 + a2*t^2 + a1*t + a0
  let a0 = f1;
  let a1 = d1;
  let a2 = 3.0 * delta - 2.0 * d1 - d2;
  let a3 = d1 + d2 - 2.0 * delta;

  return a0 + t * (a1 + t * (a2 + t * a3));
}

// Monotone cubic interpolation for vec4
fn monotoneCubic1D_vec4(f0: vec4<f32>, f1: vec4<f32>, f2: vec4<f32>, f3: vec4<f32>, t: f32) -> vec4<f32> {
  return vec4<f32>(
    monotoneCubic1D(f0.x, f1.x, f2.x, f3.x, t),
    monotoneCubic1D(f0.y, f1.y, f2.y, f3.y, t),
    monotoneCubic1D(f0.z, f1.z, f2.z, f3.z, t),
    monotoneCubic1D(f0.w, f1.w, f2.w, f3.w, t)
  );
}

// Bilinear interpolation for vec4
fn bilinear_vec4(f00: vec4<f32>, f10: vec4<f32>, f01: vec4<f32>, f11: vec4<f32>, fx: f32, fy: f32) -> vec4<f32> {
  let top = mix(f00, f10, fx);
  let bottom = mix(f01, f11, fx);
  return mix(top, bottom, fy);
}

// Sample velocity field with bilinear interpolation (for RK2 midpoint)
fn sampleVelocityLinear(pos: vec2<f32>, N: u32, wallX: f32, wallY: f32) -> vec4<f32> {
  let Nf = f32(N);
  let Ni = i32(N);

  var p = pos - vec2<f32>(0.5);

  if (wallX > 0.0) {
    p.x = clamp(p.x, 0.0, Nf - 1.0);
  } else {
    p.x = p.x - floor(p.x / Nf) * Nf;
  }

  if (wallY > 0.0) {
    p.y = clamp(p.y, 0.0, Nf - 1.0);
  } else {
    p.y = p.y - floor(p.y / Nf) * Nf;
  }

  let x0 = i32(floor(p.x));
  let y0 = i32(floor(p.y));
  let fx = fract(p.x);
  let fy = fract(p.y);

  let f00 = sampleVelAt(x0, y0, Ni, wallX, wallY);
  let f10 = sampleVelAt(x0 + 1, y0, Ni, wallX, wallY);
  let f01 = sampleVelAt(x0, y0 + 1, Ni, wallX, wallY);
  let f11 = sampleVelAt(x0 + 1, y0 + 1, Ni, wallX, wallY);

  return bilinear_vec4(f00, f10, f01, f11, fx, fy);
}

// Sample input field with bilinear interpolation
fn sampleInputLinear(pos: vec2<f32>, N: u32, wallX: f32, wallY: f32) -> vec4<f32> {
  let Nf = f32(N);
  let Ni = i32(N);

  // Convert physical position to grid coordinates
  var p = pos - vec2<f32>(0.5);

  // Handle X boundary
  if (wallX > 0.0) {
    p.x = clamp(p.x, 0.0, Nf - 1.0);
  } else {
    p.x = p.x - floor(p.x / Nf) * Nf;
  }

  // Handle Y boundary
  if (wallY > 0.0) {
    p.y = clamp(p.y, 0.0, Nf - 1.0);
  } else {
    p.y = p.y - floor(p.y / Nf) * Nf;
  }

  let x0 = i32(floor(p.x));
  let y0 = i32(floor(p.y));
  let fx = fract(p.x);
  let fy = fract(p.y);

  let f00 = sampleAt(x0, y0, Ni, wallX, wallY);
  let f10 = sampleAt(x0 + 1, y0, Ni, wallX, wallY);
  let f01 = sampleAt(x0, y0 + 1, Ni, wallX, wallY);
  let f11 = sampleAt(x0 + 1, y0 + 1, Ni, wallX, wallY);

  return bilinear_vec4(f00, f10, f01, f11, fx, fy);
}

// Sample input field with monotone cubic interpolation (separable)
// Handles separate X/Y wall boundaries
// With ghost cell mirroring, we allow sampling into wall regions (but not beyond domain)
fn sampleInputCubic(pos: vec2<f32>, N: u32, wallX: f32, wallY: f32) -> vec4<f32> {
  let Nf = f32(N);
  let Ni = i32(N);

  // Convert physical position to grid coordinates
  var p = pos - vec2<f32>(0.5);

  // Handle X boundary
  if (wallX > 0.0) {
    // With ghost cells, allow sampling into wall but clamp to domain bounds
    // Leave 0.5 cell margin to ensure cubic stencil stays in bounds
    p.x = clamp(p.x, 0.5, Nf - 1.5);
  } else {
    // Periodic wrap
    p.x = p.x - floor(p.x / Nf) * Nf;
  }

  // Handle Y boundary
  if (wallY > 0.0) {
    // With ghost cells, allow sampling into wall but clamp to domain bounds
    p.y = clamp(p.y, 0.5, Nf - 1.5);
  } else {
    // Periodic wrap
    p.y = p.y - floor(p.y / Nf) * Nf;
  }

  // Integer coordinates (p is between [x0, x0+1] and [y0, y0+1])
  let x0 = i32(floor(p.x));
  let y0 = i32(floor(p.y));

  // Fractional parts
  let fx = fract(p.x);
  let fy = fract(p.y);

  // Sample 4x4 grid of values for bicubic interpolation
  // First, interpolate along x for each of the 4 rows
  var col: array<vec4<f32>, 4>;
  for (var j = 0; j < 4; j++) {
    let yj = y0 - 1 + j;
    let f0 = sampleAt(x0 - 1, yj, Ni, wallX, wallY);
    let f1 = sampleAt(x0, yj, Ni, wallX, wallY);
    let f2 = sampleAt(x0 + 1, yj, Ni, wallX, wallY);
    let f3 = sampleAt(x0 + 2, yj, Ni, wallX, wallY);
    col[j] = monotoneCubic1D_vec4(f0, f1, f2, f3, fx);
  }

  // Then interpolate along y
  return monotoneCubic1D_vec4(col[0], col[1], col[2], col[3], fy);
}

@compute @workgroup_size(16, 16)
fn advect_velocity(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;
  let Nf = f32(N);
  let wallX = params.wallThicknessX;
  let wallY = params.wallThicknessY;

  // Current position (cell-centered)
  let pos = vec2<f32>(f32(id.x) + 0.5, f32(id.y) + 0.5);

  // Get velocity at current position
  let vel = velocityField[idx];

  // RK2 (midpoint method) backtrace
  // Step 1: Half step to midpoint
  let midPos = pos - vec2<f32>(vel.x, vel.z) * Nf * params.dt * 0.5;

  // Step 2: Sample velocity at midpoint
  let midVel = sampleVelocityLinear(midPos, N, wallX, wallY);

  // Step 3: Full step using midpoint velocity
  let backPos = pos - vec2<f32>(midVel.x, midVel.z) * Nf * params.dt;

  // Sample input at backtraced position using selected interpolation method
  if (params.useLinearInterp == 1u) {
    output[idx] = sampleInputLinear(backPos, N, wallX, wallY);
  } else {
    output[idx] = sampleInputCubic(backPos, N, wallX, wallY);
  }
}
`,Q=`// Advect Scalar Shader
// Advects a scalar field (dye) using the velocity field
// Uses monotone cubic interpolation (Fedkiw et al., "Visual Simulation of Smoke")

struct SimParams {
  resolution: vec2<u32>,
  dt: f32,
  viscosity: f32,
  dyeDecay: f32,
  wallThicknessX: f32,
  wallThicknessY: f32,
  useLinearInterp: u32,  // 0 = monotonic cubic, 1 = linear
}

@group(0) @binding(0) var<storage, read> velocity: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> input: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> output: array<vec2<f32>>;
@group(0) @binding(3) var<uniform> params: SimParams;

// Wrap index with periodic boundary
fn wrapIndex(i: i32, N: i32) -> u32 {
  var idx = i % N;
  if (idx < 0) { idx += N; }
  return u32(idx);
}

// Clamp index to domain boundaries (allows sampling from wall regions)
fn clampIndex(i: i32, N: i32) -> u32 {
  return u32(clamp(i, 0, N - 1));
}

// Get index handling boundary conditions
fn getIndex(i: i32, N: i32, wallThickness: f32) -> u32 {
  if (wallThickness > 0.0) {
    // With walls, clamp to domain bounds (not fluid bounds)
    return clampIndex(i, N);
  } else {
    return wrapIndex(i, N);
  }
}

// Sample input at integer grid position
fn sampleAt(ix: i32, iy: i32, N: i32, wallX: f32, wallY: f32) -> vec2<f32> {
  let x = getIndex(ix, N, wallX);
  let y = getIndex(iy, N, wallY);
  return input[y * u32(N) + x];
}

// Sample velocity field at integer grid position (for RK2 midpoint)
fn sampleVelAt(ix: i32, iy: i32, N: i32, wallX: f32, wallY: f32) -> vec4<f32> {
  let x = getIndex(ix, N, wallX);
  let y = getIndex(iy, N, wallY);
  return velocity[y * u32(N) + x];
}

// Monotone cubic Hermite interpolation for a single component
// Interpolates between f[1] and f[2] with t in [0,1]
// f[0], f[1], f[2], f[3] are the four sample values
fn monotoneCubic1D(f0: f32, f1: f32, f2: f32, f3: f32, t: f32) -> f32 {
  // Central difference slopes at f1 and f2
  var d1 = (f2 - f0) * 0.5;
  var d2 = (f3 - f1) * 0.5;

  // Delta between f1 and f2
  let delta = f2 - f1;

  // Monotonicity constraint: set slopes to zero if they differ in sign from delta
  // or if delta is zero (flat region)
  if (abs(delta) < 1e-10) {
    d1 = 0.0;
    d2 = 0.0;
  } else {
    if (sign(d1) != sign(delta)) { d1 = 0.0; }
    if (sign(d2) != sign(delta)) { d2 = 0.0; }
  }

  // Hermite basis coefficients
  // f(t) = a3*t^3 + a2*t^2 + a1*t + a0
  let a0 = f1;
  let a1 = d1;
  let a2 = 3.0 * delta - 2.0 * d1 - d2;
  let a3 = d1 + d2 - 2.0 * delta;

  return a0 + t * (a1 + t * (a2 + t * a3));
}

// Monotone cubic interpolation for vec2
fn monotoneCubic1D_vec2(f0: vec2<f32>, f1: vec2<f32>, f2: vec2<f32>, f3: vec2<f32>, t: f32) -> vec2<f32> {
  return vec2<f32>(
    monotoneCubic1D(f0.x, f1.x, f2.x, f3.x, t),
    monotoneCubic1D(f0.y, f1.y, f2.y, f3.y, t)
  );
}

// Bilinear interpolation for vec2
fn bilinear_vec2(f00: vec2<f32>, f10: vec2<f32>, f01: vec2<f32>, f11: vec2<f32>, fx: f32, fy: f32) -> vec2<f32> {
  let top = mix(f00, f10, fx);
  let bottom = mix(f01, f11, fx);
  return mix(top, bottom, fy);
}

// Bilinear interpolation for vec4
fn bilinear_vec4(f00: vec4<f32>, f10: vec4<f32>, f01: vec4<f32>, f11: vec4<f32>, fx: f32, fy: f32) -> vec4<f32> {
  let top = mix(f00, f10, fx);
  let bottom = mix(f01, f11, fx);
  return mix(top, bottom, fy);
}

// Sample velocity field with bilinear interpolation (for RK2 midpoint)
fn sampleVelocityLinear(pos: vec2<f32>, N: u32, wallX: f32, wallY: f32) -> vec4<f32> {
  let Nf = f32(N);
  let Ni = i32(N);

  var p = pos - vec2<f32>(0.5);

  if (wallX > 0.0) {
    p.x = clamp(p.x, 0.0, Nf - 1.0);
  } else {
    p.x = p.x - floor(p.x / Nf) * Nf;
  }

  if (wallY > 0.0) {
    p.y = clamp(p.y, 0.0, Nf - 1.0);
  } else {
    p.y = p.y - floor(p.y / Nf) * Nf;
  }

  let x0 = i32(floor(p.x));
  let y0 = i32(floor(p.y));
  let fx = fract(p.x);
  let fy = fract(p.y);

  let f00 = sampleVelAt(x0, y0, Ni, wallX, wallY);
  let f10 = sampleVelAt(x0 + 1, y0, Ni, wallX, wallY);
  let f01 = sampleVelAt(x0, y0 + 1, Ni, wallX, wallY);
  let f11 = sampleVelAt(x0 + 1, y0 + 1, Ni, wallX, wallY);

  return bilinear_vec4(f00, f10, f01, f11, fx, fy);
}

// Sample scalar field with bilinear interpolation
fn sampleScalarLinear(pos: vec2<f32>, N: u32, wallX: f32, wallY: f32) -> vec2<f32> {
  let Nf = f32(N);
  let Ni = i32(N);

  // Convert physical position to grid coordinates
  var p = pos - vec2<f32>(0.5);

  // Handle X boundary
  if (wallX > 0.0) {
    p.x = clamp(p.x, 0.0, Nf - 1.0);
  } else {
    p.x = p.x - floor(p.x / Nf) * Nf;
  }

  // Handle Y boundary
  if (wallY > 0.0) {
    p.y = clamp(p.y, 0.0, Nf - 1.0);
  } else {
    p.y = p.y - floor(p.y / Nf) * Nf;
  }

  let x0 = i32(floor(p.x));
  let y0 = i32(floor(p.y));
  let fx = fract(p.x);
  let fy = fract(p.y);

  let f00 = sampleAt(x0, y0, Ni, wallX, wallY);
  let f10 = sampleAt(x0 + 1, y0, Ni, wallX, wallY);
  let f01 = sampleAt(x0, y0 + 1, Ni, wallX, wallY);
  let f11 = sampleAt(x0 + 1, y0 + 1, Ni, wallX, wallY);

  return bilinear_vec2(f00, f10, f01, f11, fx, fy);
}

// Sample scalar field with monotone cubic interpolation (separable)
// Handles separate X/Y wall boundaries
// With ghost cells, we allow sampling into wall regions (but not beyond domain)
fn sampleScalarCubic(pos: vec2<f32>, N: u32, wallX: f32, wallY: f32) -> vec2<f32> {
  let Nf = f32(N);
  let Ni = i32(N);

  // Convert physical position to grid coordinates
  var p = pos - vec2<f32>(0.5);

  // Handle X boundary
  if (wallX > 0.0) {
    // With ghost cells, allow sampling into wall but clamp to domain bounds
    // Leave 0.5 cell margin to ensure cubic stencil stays in bounds
    p.x = clamp(p.x, 0.5, Nf - 1.5);
  } else {
    // Periodic wrap
    p.x = p.x - floor(p.x / Nf) * Nf;
  }

  // Handle Y boundary
  if (wallY > 0.0) {
    // With ghost cells, allow sampling into wall but clamp to domain bounds
    p.y = clamp(p.y, 0.5, Nf - 1.5);
  } else {
    // Periodic wrap
    p.y = p.y - floor(p.y / Nf) * Nf;
  }

  // Integer coordinates (p is between [x0, x0+1] and [y0, y0+1])
  let x0 = i32(floor(p.x));
  let y0 = i32(floor(p.y));

  // Fractional parts
  let fx = fract(p.x);
  let fy = fract(p.y);

  // Sample 4x4 grid of values for bicubic interpolation
  // First, interpolate along x for each of the 4 rows
  var col: array<vec2<f32>, 4>;
  for (var j = 0; j < 4; j++) {
    let yj = y0 - 1 + j;
    let f0 = sampleAt(x0 - 1, yj, Ni, wallX, wallY);
    let f1 = sampleAt(x0, yj, Ni, wallX, wallY);
    let f2 = sampleAt(x0 + 1, yj, Ni, wallX, wallY);
    let f3 = sampleAt(x0 + 2, yj, Ni, wallX, wallY);
    col[j] = monotoneCubic1D_vec2(f0, f1, f2, f3, fx);
  }

  // Then interpolate along y
  return monotoneCubic1D_vec2(col[0], col[1], col[2], col[3], fy);
}

@compute @workgroup_size(16, 16)
fn advect_scalar(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;
  let Nf = f32(N);
  let wallX = params.wallThicknessX;
  let wallY = params.wallThicknessY;

  let pos = vec2<f32>(f32(id.x) + 0.5, f32(id.y) + 0.5);

  // Get velocity at current position
  let vel = velocity[idx];

  // RK2 (midpoint method) backtrace
  // Step 1: Half step to midpoint
  let midPos = pos - vec2<f32>(vel.x, vel.z) * Nf * params.dt * 0.5;

  // Step 2: Sample velocity at midpoint
  let midVel = sampleVelocityLinear(midPos, N, wallX, wallY);

  // Step 3: Full step using midpoint velocity
  let backPos = pos - vec2<f32>(midVel.x, midVel.z) * Nf * params.dt;

  // Sample using selected interpolation method and apply decay
  var result: vec2<f32>;
  if (params.useLinearInterp == 1u) {
    result = sampleScalarLinear(backPos, N, wallX, wallY);
  } else {
    result = sampleScalarCubic(backPos, N, wallX, wallY);
  }
  result *= params.dyeDecay;

  output[idx] = result;
}
`,$=`// Split Velocity Shader
// Splits vec4 velocity (u_re, u_im, v_re, v_im) into separate u and v buffers for FFT

struct Params {
  resolution: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> velocity: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> u: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> v: array<vec2<f32>>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(16, 16)
fn split_velocity(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;
  let vel = velocity[idx];

  // Split into separate complex buffers
  // velocity = (u_re, u_im, v_re, v_im)
  u[idx] = vec2<f32>(vel.x, vel.y);
  v[idx] = vec2<f32>(vel.z, vel.w);
}
`,nn=`// Project FFT Shader
// Projects velocity to be divergence-free in frequency domain
// Also applies viscous diffusion
//
// The projection removes the component of velocity parallel to wavenumber k:
//   u_perp = u - k * (k . u) / |k|^2
//
// Diffusion is applied as multiplication by exp(-nu * |k|^2 * dt)

struct SimParams {
  resolution: vec2<u32>,
  dt: f32,
  viscosity: f32,
  dyeDecay: f32,
}

@group(0) @binding(0) var<storage, read_write> uHat: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> vHat: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: SimParams;

@compute @workgroup_size(16, 16)
fn project_fft(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;
  let Nf = f32(N);

  // Compute wavenumber
  // For standard FFT layout: 0, 1, ..., N/2-1, -N/2, -N/2+1, ..., -1
  var kx = f32(id.x);
  var ky = f32(id.y);
  if (kx >= Nf * 0.5) { kx -= Nf; }
  if (ky >= Nf * 0.5) { ky -= Nf; }

  // Scale wavenumber by 2*pi/L where L=1
  let PI = 3.14159265359;
  kx *= 2.0 * PI;
  ky *= 2.0 * PI;

  let k2 = kx * kx + ky * ky;

  // Load velocity
  var u = uHat[idx];
  var v = vHat[idx];

  // Skip DC component (k=0)
  if (k2 > 0.0001) {
    // Project: remove component parallel to k
    // u_new = u - k * (k . u) / |k|^2
    // For complex: do this separately for real and imaginary parts

    // k . u (complex dot product treating k as real)
    let kdotu_re = kx * u.x + ky * v.x;
    let kdotu_im = kx * u.y + ky * v.y;

    // Subtract projection
    u.x -= kx * kdotu_re / k2;
    u.y -= kx * kdotu_im / k2;
    v.x -= ky * kdotu_re / k2;
    v.y -= ky * kdotu_im / k2;

    // Apply viscous diffusion using implicit method: divide by (1 + nu * k^2 * dt)
    // This matches Stam's paper and is unconditionally stable
    let diffusion = 1.0 / (1.0 + params.viscosity * k2 * params.dt);
    u *= diffusion;
    v *= diffusion;
  } else {
    // Zero out DC component (mean flow)
    u = vec2<f32>(0.0);
    v = vec2<f32>(0.0);
  }

  uHat[idx] = u;
  vHat[idx] = v;
}
`,en=`// Merge Velocity Shader
// Merges separate u and v buffers back into vec4 velocity

struct Params {
  resolution: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> u: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> v: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> velocity: array<vec4<f32>>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(16, 16)
fn merge_velocity(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;

  let uVal = u[idx];
  let vVal = v[idx];

  // Merge back: take real parts (imaginary should be ~0 after inverse FFT of real data)
  // Store as (u_re, 0, v_re, 0)
  velocity[idx] = vec4<f32>(uVal.x, 0.0, vVal.x, 0.0);
}
`,tn=`// Fullscreen Vertex Shader

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn fullscreen(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
  var output: VertexOutput;

  // Generate fullscreen triangle
  let x = f32((vertex_index << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vertex_index & 2u) * 2.0 - 1.0;

  output.position = vec4<f32>(x, -y, 0.0, 1.0);
  output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);

  return output;
}
`,ln=`// Visualization Shader
// Renders dye field with velocity magnitude overlay

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

struct VisParams {
  resolution: vec2<u32>,
  scale: f32,
  padding: f32,  // Unused (kept for alignment)
  wallThicknessX: f32,
  wallThicknessY: f32,
}

@group(0) @binding(0) var<storage, read> velocity: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> dye: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: VisParams;

fn sampleDye(x: i32, y: i32, N: u32) -> f32 {
  var wx = x % i32(N);
  var wy = y % i32(N);
  if (wx < 0) { wx += i32(N); }
  if (wy < 0) { wy += i32(N); }
  return dye[u32(wy) * N + u32(wx)].x;
}

fn sampleVelocity(x: i32, y: i32, N: u32) -> vec2<f32> {
  var wx = x % i32(N);
  var wy = y % i32(N);
  if (wx < 0) { wx += i32(N); }
  if (wy < 0) { wy += i32(N); }
  let v = velocity[u32(wy) * N + u32(wx)];
  return vec2<f32>(v.x, v.z);
}

@fragment
fn visualize(input: VertexOutput) -> @location(0) vec4<f32> {
  let N = params.resolution.x;
  let Nf = f32(N);

  // UV to physical position (0 to N), then to grid coordinates
  // Cell (i,j) is at physical position (i+0.5, j+0.5)
  let physPos = input.uv * Nf;
  let gridCoord = physPos - vec2<f32>(0.5);

  let x0 = i32(floor(gridCoord.x));
  let y0 = i32(floor(gridCoord.y));
  let x1 = x0 + 1;
  let y1 = y0 + 1;

  let fx = fract(gridCoord.x);
  let fy = fract(gridCoord.y);

  // Sample dye with bilinear interpolation
  let d00 = sampleDye(x0, y0, N);
  let d10 = sampleDye(x1, y0, N);
  let d01 = sampleDye(x0, y1, N);
  let d11 = sampleDye(x1, y1, N);
  let dyeVal = mix(mix(d00, d10, fx), mix(d01, d11, fx), fy);

  // Wall thickness in normalized coords
  let wallSizeX = params.wallThicknessX / Nf;
  let wallSizeY = params.wallThicknessY / Nf;

  // Check if in boundary region
  var inBoundary = false;

  // Left/right walls
  if (params.wallThicknessX > 0.0) {
    if (input.uv.x < wallSizeX || input.uv.x > 1.0 - wallSizeX) {
      inBoundary = true;
    }
  }

  // Top/bottom walls
  if (params.wallThicknessY > 0.0) {
    if (input.uv.y < wallSizeY || input.uv.y > 1.0 - wallSizeY) {
      inBoundary = true;
    }
  }

  // Dark smoke on white background
  let baseColor = vec3<f32>(1.0, 1.0, 0.98);  // Slightly warm white
  let smokeColor = vec3<f32>(0.1, 0.08, 0.05);  // Dark brown-gray smoke
  let boundaryColor = vec3<f32>(0.3, 0.25, 0.2);  // Brown boundary

  var color = mix(baseColor, smokeColor, dyeVal);
  if (inBoundary) {
    color = boundaryColor;
  }

  return vec4<f32>(color, 1.0);
}
`,an=`// Vorticity Confinement Shader
// Computes vorticity (curl) and applies confinement force to preserve swirling motion

struct SimParams {
  resolution: vec2<u32>,
  dt: f32,
  viscosity: f32,
  dyeDecay: f32,
}

struct VorticityParams {
  resolution: vec2<u32>,
  epsilon: f32,  // Confinement strength
  padding: f32,
}

@group(0) @binding(0) var<storage, read> velocity: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> vorticity: array<f32>;
@group(0) @binding(2) var<uniform> params: VorticityParams;

// Sample velocity with wrapping
fn sampleVel(x: i32, y: i32, N: u32) -> vec2<f32> {
  var wx = x % i32(N);
  var wy = y % i32(N);
  if (wx < 0) { wx += i32(N); }
  if (wy < 0) { wy += i32(N); }
  let v = velocity[u32(wy) * N + u32(wx)];
  return vec2<f32>(v.x, v.z);
}

// Compute vorticity (curl of velocity in 2D)
// omega = dv/dx - du/dy
@compute @workgroup_size(16, 16)
fn compute_vorticity(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;
  let x = i32(id.x);
  let y = i32(id.y);

  // Central differences for curl
  let vL = sampleVel(x - 1, y, N);
  let vR = sampleVel(x + 1, y, N);
  let vB = sampleVel(x, y - 1, N);
  let vT = sampleVel(x, y + 1, N);

  // omega = dv/dx - du/dy
  let dvdx = (vR.y - vL.y) * 0.5;
  let dudy = (vT.x - vB.x) * 0.5;
  let omega = dvdx - dudy;

  vorticity[idx] = omega;
}
`,on=`// Apply Vorticity Confinement Force
// Adds force in direction perpendicular to vorticity gradient to amplify vortices

struct VorticityParams {
  resolution: vec2<u32>,
  epsilon: f32,  // Confinement strength
  dt: f32,
}

@group(0) @binding(0) var<storage, read_write> velocity: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> vorticity: array<f32>;
@group(0) @binding(2) var<uniform> params: VorticityParams;

// Sample vorticity with wrapping
fn sampleOmega(x: i32, y: i32, N: u32) -> f32 {
  var wx = x % i32(N);
  var wy = y % i32(N);
  if (wx < 0) { wx += i32(N); }
  if (wy < 0) { wy += i32(N); }
  return vorticity[u32(wy) * N + u32(wx)];
}

@compute @workgroup_size(16, 16)
fn apply_vorticity(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;
  let x = i32(id.x);
  let y = i32(id.y);

  // Sample vorticity at neighbors
  let omegaC = sampleOmega(x, y, N);
  let omegaL = sampleOmega(x - 1, y, N);
  let omegaR = sampleOmega(x + 1, y, N);
  let omegaB = sampleOmega(x, y - 1, N);
  let omegaT = sampleOmega(x, y + 1, N);

  // Gradient of |omega|
  let gradX = (abs(omegaR) - abs(omegaL)) * 0.5;
  let gradY = (abs(omegaT) - abs(omegaB)) * 0.5;

  // Normalize gradient
  let gradLen = length(vec2<f32>(gradX, gradY)) + 1e-5;
  let Nx = gradX / gradLen;
  let Ny = gradY / gradLen;

  // Confinement force: f = epsilon * (N x omega)
  // In 2D: N x omega = (Ny * omega, -Nx * omega)
  let fx = params.epsilon * Ny * omegaC;
  let fy = -params.epsilon * Nx * omegaC;

  // Apply force
  var vel = velocity[idx];
  vel.x += fx * params.dt;
  vel.z += fy * params.dt;
  velocity[idx] = vel;
}
`,rn=`// Boundary Enforcement Shader
// Enforces no-slip boundary condition using ghost cell mirroring.
// Ghost cells have negated velocity of their mirrored fluid cells,
// so interpolation naturally gives zero velocity at the wall surface.

struct BoundaryParams {
  resolution: vec2<u32>,
  padding0: f32,  // Unused (kept for alignment)
  wallThicknessX: f32, // Wall thickness in cells (left/right walls)
  wallThicknessY: f32, // Wall thickness in cells (top/bottom walls)
  padding1: f32,
}

@group(0) @binding(0) var<storage, read_write> velocity: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> dye: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: BoundaryParams;

@compute @workgroup_size(16, 16)
fn enforce_boundary(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  let Ni = i32(N);
  if (id.x >= N || id.y >= N) { return; }

  let ix = i32(id.x);
  let iy = i32(id.y);
  let idx = id.y * N + id.x;

  let wallX = i32(params.wallThicknessX);
  let wallY = i32(params.wallThicknessY);

  // Determine which wall regions this cell is in
  let inLeftWall = wallX > 0 && ix < wallX;
  let inRightWall = wallX > 0 && ix >= Ni - wallX;
  let inTopWall = wallY > 0 && iy < wallY;
  let inBottomWall = wallY > 0 && iy >= Ni - wallY;

  // If not in any wall, nothing to do
  if (!inLeftWall && !inRightWall && !inTopWall && !inBottomWall) {
    return;
  }

  // Compute mirrored position for ghost cell
  var mirrorX = ix;
  var mirrorY = iy;

  // Mirror across X walls
  // Wall surface is at x = wallX (left) or x = N - wallX (right)
  // Ghost cell at ix mirrors fluid cell across the wall surface
  if (inLeftWall) {
    mirrorX = 2 * wallX - 1 - ix;
  } else if (inRightWall) {
    mirrorX = 2 * (Ni - wallX) - 1 - ix;
  }

  // Mirror across Y walls
  if (inTopWall) {
    mirrorY = 2 * wallY - 1 - iy;
  } else if (inBottomWall) {
    mirrorY = 2 * (Ni - wallY) - 1 - iy;
  }

  // Clamp mirror position to fluid region (handles thick walls and corners)
  let fluidMinX = select(0, wallX, wallX > 0);
  let fluidMaxX = select(Ni - 1, Ni - wallX - 1, wallX > 0);
  let fluidMinY = select(0, wallY, wallY > 0);
  let fluidMaxY = select(Ni - 1, Ni - wallY - 1, wallY > 0);

  mirrorX = clamp(mirrorX, fluidMinX, fluidMaxX);
  mirrorY = clamp(mirrorY, fluidMinY, fluidMaxY);

  let mirrorIdx = u32(mirrorY) * N + u32(mirrorX);

  // No-slip: ghost cell velocity = negative of mirrored fluid cell
  // This ensures interpolation gives zero velocity at the wall surface
  velocity[idx] = -velocity[mirrorIdx];
}
`,fn=`// Buoyancy Shader
// Applies upward force proportional to dye concentration (simulating hot air rising)

struct BuoyancyParams {
  resolution: vec2<u32>,
  strength: f32,  // Buoyancy strength
  dt: f32,
}

@group(0) @binding(0) var<storage, read_write> velocity: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> dye: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: BuoyancyParams;

@compute @workgroup_size(16, 16)
fn apply_buoyancy(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;

  // Get dye concentration
  let dyeVal = dye[idx].x;

  // Apply upward force proportional to dye
  // Positive Y is up in our coordinate system after the flip
  var vel = velocity[idx];
  vel.z += params.strength * dyeVal * params.dt;
  velocity[idx] = vel;
}
`;async function cn(n,d,u){const y=q(n,u),m=n.createShaderModule({label:"Add force shader",code:Z}),v=n.createShaderModule({label:"Advect shader",code:J}),g=n.createShaderModule({label:"Advect scalar shader",code:Q}),b=n.createShaderModule({label:"Split velocity shader",code:$}),x=n.createShaderModule({label:"Project FFT shader",code:nn}),w=n.createShaderModule({label:"Merge velocity shader",code:en}),N=n.createShaderModule({label:"Fullscreen vertex shader",code:tn}),h=n.createShaderModule({label:"Visualize shader",code:ln}),S=n.createShaderModule({label:"Vorticity shader",code:an}),P=n.createShaderModule({label:"Apply vorticity shader",code:on}),k=n.createShaderModule({label:"Boundary shader",code:rn}),C=n.createShaderModule({label:"Buoyancy shader",code:fn}),e=n.createBindGroupLayout({label:"Add force bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),i=n.createBindGroupLayout({label:"Advect bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),t=n.createBindGroupLayout({label:"Advect scalar bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),l=n.createBindGroupLayout({label:"Split velocity bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),a=n.createBindGroupLayout({label:"Project FFT bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),o=n.createBindGroupLayout({label:"Merge velocity bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),r=n.createBindGroupLayout({label:"Visualize bind group layout",entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),f=n.createBindGroupLayout({label:"Compute vorticity bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),s=n.createBindGroupLayout({label:"Apply vorticity bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),c=n.createBindGroupLayout({label:"Enforce boundary bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),p=n.createBindGroupLayout({label:"Apply buoyancy bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),_=n.createPipelineLayout({label:"Add force pipeline layout",bindGroupLayouts:[e]}),X=n.createPipelineLayout({label:"Advect pipeline layout",bindGroupLayouts:[i]}),Y=n.createPipelineLayout({label:"Advect scalar pipeline layout",bindGroupLayouts:[t]}),T=n.createPipelineLayout({label:"Split velocity pipeline layout",bindGroupLayouts:[l]}),V=n.createPipelineLayout({label:"Project FFT pipeline layout",bindGroupLayouts:[a]}),G=n.createPipelineLayout({label:"Merge velocity pipeline layout",bindGroupLayouts:[o]}),L=n.createPipelineLayout({label:"Visualize pipeline layout",bindGroupLayouts:[r]}),M=n.createPipelineLayout({label:"Compute vorticity pipeline layout",bindGroupLayouts:[f]}),U=n.createPipelineLayout({label:"Apply vorticity pipeline layout",bindGroupLayouts:[s]}),A=n.createPipelineLayout({label:"Enforce boundary pipeline layout",bindGroupLayouts:[c]}),F=n.createPipelineLayout({label:"Apply buoyancy pipeline layout",bindGroupLayouts:[p]}),B=n.createComputePipeline({label:"Add force pipeline",layout:_,compute:{module:m,entryPoint:"add_force"}}),z=n.createComputePipeline({label:"Advect velocity pipeline",layout:X,compute:{module:v,entryPoint:"advect_velocity"}}),O=n.createComputePipeline({label:"Advect scalar pipeline",layout:Y,compute:{module:g,entryPoint:"advect_scalar"}}),E=n.createComputePipeline({label:"Split velocity pipeline",layout:T,compute:{module:b,entryPoint:"split_velocity"}}),j=n.createComputePipeline({label:"Project FFT pipeline",layout:V,compute:{module:x,entryPoint:"project_fft"}}),I=n.createComputePipeline({label:"Merge velocity pipeline",layout:G,compute:{module:w,entryPoint:"merge_velocity"}}),D=n.createComputePipeline({label:"Compute vorticity pipeline",layout:M,compute:{module:S,entryPoint:"compute_vorticity"}}),W=n.createComputePipeline({label:"Apply vorticity pipeline",layout:U,compute:{module:P,entryPoint:"apply_vorticity"}}),H=n.createComputePipeline({label:"Enforce boundary pipeline",layout:A,compute:{module:k,entryPoint:"enforce_boundary"}}),R=n.createComputePipeline({label:"Apply buoyancy pipeline",layout:F,compute:{module:C,entryPoint:"apply_buoyancy"}}),K=n.createRenderPipeline({label:"Visualize pipeline",layout:L,vertex:{module:N,entryPoint:"fullscreen"},fragment:{module:h,entryPoint:"visualize",targets:[{format:d}]},primitive:{topology:"triangle-list"}});return{fft:y,addForce:B,advectVelocity:z,advectScalar:O,splitVelocity:E,projectFFT:j,mergeVelocity:I,computeVorticity:D,applyVorticity:W,enforceBoundary:H,applyBuoyancy:R,visualize:K,bindGroupLayouts:{addForce:e,advect:i,advectScalar:t,splitVelocity:l,projectFFT:a,mergeVelocity:o,computeVorticity:f,applyVorticity:s,enforceBoundary:c,applyBuoyancy:p,visualize:r}}}export{cn as createFluidPipelines};
