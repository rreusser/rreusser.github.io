// Initialize Shader
//
// Creates random initial conditions for multiscale Turing patterns.
// Generates uniform random noise in [-1, 1] range.

enable f16;

struct InitializeParams {
  resolution: vec2<u32>,
  seed: u32,
  padding: u32,
}

@group(0) @binding(0) var<storage, read_write> output: array<vec4<f16>>;
@group(0) @binding(1) var<uniform> params: InitializeParams;

// PCG random number generator
fn pcg(seed: u32) -> u32 {
  let state = seed * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

// Random float in [0, 1]
fn random(seed: u32) -> f32 {
  return f32(pcg(seed)) / 4294967295.0;
}

@compute @workgroup_size(16, 16, 1)
fn initialize(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;

  // Create unique seed per pixel
  let pixel_seed = params.seed + idx * 1234567u;

  // Generate random value in [0, 1] - matching original implementation
  // which sets all channels (rgb and f) to the same random value
  let f = random(pixel_seed);

  // Store as (r, g, b, f) where all are set to same random value
  // Convert f32 computation result to f16 for storage
  output[idx] = vec4<f16>(vec4<f32>(f, f, f, f));
}
