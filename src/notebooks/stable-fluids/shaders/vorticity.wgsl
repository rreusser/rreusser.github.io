// Vorticity Confinement Shader
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
