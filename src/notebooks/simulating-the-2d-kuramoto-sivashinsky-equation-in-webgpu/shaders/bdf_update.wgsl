// BDF2 Time Integration in Frequency Domain
//
// Implements second-order Backward Differentiation Formula (BDF2) update
// for the Kuramoto-Sivashinsky equation in frequency domain.
//
// From Kalogirou thesis, Equation (F.8):
//
// Vhat^{n+2} = (1/ξ) * [
//   (2 + 2c·dt) * Vhat^{n+1} - (0.5 + c·dt) * Vhat^n
//   + 2dt * (Ahat^{n+1} + (ν2/ν1) * Bhat^{n+1})
//   - dt * (Ahat^n + (ν2/ν1) * Bhat^n)
// ]
//
// where:
//   ξ = 1.5 + c·dt - dt·(k1² + (ν2/ν1)·k2²) + ν1·dt·(k1² + (ν2/ν1)·k2²)²
//   c = 1 + 1/ν1

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

struct BDFParams {
  resolution: vec2<u32>,
  dx: vec2<f32>,
  dt: f32,
  nu: vec2<f32>,  // (ν1, ν2)
}

@group(0) @binding(0) var<storage, read> Vhat0: array<vec2<f32>>;  // Vhat^n
@group(0) @binding(1) var<storage, read> Vhat1: array<vec2<f32>>;  // Vhat^{n+1}
@group(0) @binding(2) var<storage, read> ABhat0: array<vec4<f32>>;  // (Ahat^n, Bhat^n)
@group(0) @binding(3) var<storage, read> ABhat1: array<vec4<f32>>;  // (Ahat^{n+1}, Bhat^{n+1})
@group(0) @binding(4) var<storage, read_write> Vhat2: array<vec2<f32>>;  // Vhat^{n+2} (output)
@group(0) @binding(5) var<uniform> params: BDFParams;

@compute @workgroup_size(16, 16, 1)
fn bdf_update(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;

  // Read current state
  let Vhat_n = Vhat0[idx];
  let Vhat_n1 = Vhat1[idx];
  let ABhat_n = ABhat0[idx];
  let ABhat_n1 = ABhat1[idx];

  // Extract A and B (stored as vec4 = (A.real, A.imag, B.real, B.imag))
  let Ahat_n = ABhat_n.xy;
  let Bhat_n = ABhat_n.zw;
  let Ahat_n1 = ABhat_n1.xy;
  let Bhat_n1 = ABhat_n1.zw;

  // Compute wavenumber
  let k = wavenumber(vec2<u32>(x, y), resolution, params.dx);
  let k1 = k.x;
  let k2 = k.y;

  // BDF parameters (Equation F.7)
  let nu1 = params.nu.x;
  let nu2 = params.nu.y;
  let c = 1.0 + 1.0 / nu1;
  let dt = params.dt;
  let cdt = c * dt;
  let nu21 = nu2 / nu1;
  let nu12 = nu1 / nu2;

  // Equation (F.10) - denominator ξ (always real for even-order derivatives)
  let k1k2_2 = k1 * k1 + nu21 * k2 * k2;
  let xi = 1.5 + cdt - dt * k1k2_2 + dt * nu1 * k1k2_2 * k1k2_2;

  // Equation (F.8) - BDF2 update
  var Vhat_n2 = (
    (2.0 + 2.0 * cdt) * Vhat_n1
    - (0.5 + cdt) * Vhat_n
    + dt * (2.0 * (Ahat_n1 + nu21 * Bhat_n1) - (Ahat_n + nu21 * Bhat_n))
  ) / xi;

  // Zero out DC component (k=0) since all terms are derivatives
  if (x == 0u && y == 0u) {
    Vhat_n2 = vec2<f32>(0.0, 0.0);
  }

  // Write result
  Vhat2[idx] = Vhat_n2;
}
