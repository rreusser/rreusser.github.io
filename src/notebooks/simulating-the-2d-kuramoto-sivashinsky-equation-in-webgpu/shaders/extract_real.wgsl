// Extract Real Component
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
