// Initialize Shader
//
// Creates initial conditions for the Kuramoto-Sivashinsky equation.
// Default: f(x,y) = sin(n*(x+y)) + sin(n*x) + sin(n*y)

struct InitializeParams {
  resolution: vec2<u32>,
  n: f32,  // Number of periods in initial condition
}

@group(0) @binding(0) var<storage, read_write> output: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: InitializeParams;

@compute @workgroup_size(16, 16, 1)
fn initialize(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;

  // Compute UV coordinates in [0, 1] range
  let uv = vec2<f32>(f32(x), f32(y)) / vec2<f32>(resolution);

  // Map to [0, 2π] domain
  let PI = 3.14159265359;
  let xy = uv * 2.0 * PI;

  // Compute initial condition: f(x,y) = sin(n*(x+y)) + sin(n*x) + sin(n*y)
  let n = params.n;
  let f = sin(n * (xy.x + xy.y)) + sin(n * xy.x) + sin(n * xy.y);

  // Store as complex number (real part only, imaginary = 0)
  output[idx] = vec2<f32>(f, 0.0);
}
