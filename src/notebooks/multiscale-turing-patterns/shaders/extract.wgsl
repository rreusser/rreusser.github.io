// Extract Shader
//
// Extracts the scalar field value from the solution buffer
// and packs it into a complex number format for FFT.

enable f16;

struct ExtractParams {
  resolution: vec2<u32>,
  padding: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> solution: array<vec4<f16>>;
@group(0) @binding(1) var<storage, read_write> output: array<vec2<f16>>;
@group(0) @binding(2) var<uniform> params: ExtractParams;

@compute @workgroup_size(16, 16, 1)
fn extract(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;

  // Extract the scalar field value (alpha channel)
  let f = f32(solution[idx].a);

  // Pack as complex number (real=f, imag=0)
  output[idx] = vec2<f16>(vec2<f32>(f, 0.0));
}
