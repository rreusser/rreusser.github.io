// Differentiation in Frequency Domain
//
// Computes spatial derivatives via multiplication by i·k in frequency domain:
// - ∂V/∂x = IFFT(i·kx·Vhat)
// - ∂V/∂y = IFFT(i·ky·Vhat)
//
// Output format: vec4<f32> = (Vhat.xy, dVhatdx.xy + i*dVhatdy.xy)
// This allows inverse FFT to recover both V and (Vx, Vy) in one transform.

// Complex multiplication
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x
  );
}

// Wavenumber calculation
fn wavenumber(coord: vec2<u32>, resolution: vec2<u32>, dx: vec2<f32>) -> vec2<f32> {
  let half_res = vec2<f32>(f32(resolution.x) / 2.0, f32(resolution.y) / 2.0);
  let coord_f = vec2<f32>(f32(coord.x), f32(coord.y));

  var k = coord_f;
  if (coord_f.x >= half_res.x) {
    k.x = coord_f.x - f32(resolution.x);
  }
  if (coord_f.y >= half_res.y) {
    k.y = coord_f.y - f32(resolution.y);
  }

  return k * (2.0 * 3.14159265359 / (vec2<f32>(resolution) * dx));
}

struct DifferentiateParams {
  resolution: vec2<u32>,
  dx: vec2<f32>,
}

@group(0) @binding(0) var<storage, read> Vhat: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> output: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: DifferentiateParams;

@compute @workgroup_size(16, 16, 1)
fn differentiate(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;
  let Vhat_val = Vhat[idx];

  // Compute wavenumber
  let k = wavenumber(vec2<u32>(x, y), resolution, params.dx);

  // i = (0, 1)
  let I = vec2<f32>(0.0, 1.0);

  // x-derivative: i·kx·Vhat
  let dVhatdx = cmul(vec2<f32>(0.0, k.x), Vhat_val);

  // y-derivative: i·ky·Vhat
  let dVhatdy = cmul(vec2<f32>(0.0, k.y), Vhat_val);

  // Mix derivatives as (i·kx·Vhat) + i·(i·ky·Vhat)
  // This allows us to separate them after inverse FFT as real and imaginary parts
  let mixed_derivatives = dVhatdx + cmul(I, dVhatdy);

  // Output: (Vhat.x, Vhat.y, mixed.x, mixed.y)
  output[idx] = vec4<f32>(Vhat_val, mixed_derivatives);
}
