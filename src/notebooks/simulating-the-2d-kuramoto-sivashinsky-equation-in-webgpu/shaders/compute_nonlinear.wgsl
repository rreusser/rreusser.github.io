// Compute Nonlinear Terms
//
// Computes the nonlinear squared gradient terms:
// - A = -0.5 * (∂V/∂x)²
// - B = -0.5 * (∂V/∂y)²
//
// Input: V_VxVy (vec4<f32>) = (V.x, V.y, Vx, Vy) from inverse FFT of derivatives
// Output: AB (vec4<f32>) = (A.real, A.imag=0, B.real, B.imag=0)
//
// These will be FFT'd to get Ahat and Bhat for the BDF update.

struct ComputeNonlinearParams {
  resolution: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> V_VxVy: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> AB: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: ComputeNonlinearParams;

@compute @workgroup_size(16, 16, 1)
fn compute_nonlinear(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;
  let data = V_VxVy[idx];

  // Extract spatial derivatives (from channels z,w)
  let Vx = data.z;
  let Vy = data.w;

  // Compute squared terms (Equation F.9 from Kalogirou)
  // A = -F(0.5 * (∂V/∂x)²)  (pre-FFT, so just compute the spatial term)
  // B = -F(0.5 * (∂V/∂y)²)
  let A_real = -0.5 * Vx * Vx;
  let B_real = -0.5 * Vy * Vy;

  // Output as (A.real, 0, B.real, 0) for FFT
  // Swizzle to (A.real, B.real, 0, 0) -> then reorder to (A.r, A.i, B.r, B.i) = (A.r, B.r, 0, 0) in xzyw order
  AB[idx] = vec4<f32>(A_real, 0.0, B_real, 0.0);
}
