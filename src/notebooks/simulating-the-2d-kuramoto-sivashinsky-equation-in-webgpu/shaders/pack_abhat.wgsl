// Pack Ahat and Bhat into ABhat
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
