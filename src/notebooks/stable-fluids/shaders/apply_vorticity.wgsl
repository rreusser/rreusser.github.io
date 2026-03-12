// Apply Vorticity Confinement Force
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
