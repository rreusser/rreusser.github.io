// Convert density shader - converts atomic i32 to vec2<f32> complex (always f32)

struct ConvertParams {
  gridSize: u32,
  fixedPointScale: f32,  // Scale factor used in accumulation
}

@group(0) @binding(0) var<storage, read> densityAtomic: array<i32>;  // Non-atomic read
@group(0) @binding(1) var<storage, read_write> density: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: ConvertParams;

@compute @workgroup_size(16, 16)
fn convert_density(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.gridSize;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;

  // Convert fixed-point to float and write as complex number (real, imag=0)
  let rawValue = densityAtomic[idx];
  let floatValue = f32(rawValue) / params.fixedPointScale;

  density[idx] = vec2<f32>(floatValue, 0.0);
}
