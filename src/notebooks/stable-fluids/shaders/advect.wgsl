// Advection Shader (Semi-Lagrangian)
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
