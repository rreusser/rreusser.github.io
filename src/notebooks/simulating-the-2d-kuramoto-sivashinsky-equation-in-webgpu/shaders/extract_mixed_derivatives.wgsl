// Extract Mixed Derivatives from Vec4 to Vec2
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
