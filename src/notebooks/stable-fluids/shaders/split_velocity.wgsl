// Split Velocity Shader
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
