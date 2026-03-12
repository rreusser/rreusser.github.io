// Merge Velocity Shader
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
