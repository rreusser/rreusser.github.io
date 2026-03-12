// Compute A and B from Spatial Derivatives
//
// Computes the nonlinear squared gradient terms:
// - A = -0.5 * (dV/dx)^2
// - B = -0.5 * (dV/dy)^2
//
// Input: VxVy (vec2<f32>) where after inverse FFT:
//   - .x = Vx (x-derivative in spatial domain)
//   - .y = Vy (y-derivative in spatial domain)
//
// Output: A and B as separate vec2 buffers (complex, with zero imaginary part)
//   - A[idx] = vec2(-0.5 * Vx^2, 0)
//   - B[idx] = vec2(-0.5 * Vy^2, 0)

struct ComputeABParams {
  resolution: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> VxVy: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> A: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> B: array<vec2<f32>>;
@group(0) @binding(3) var<uniform> params: ComputeABParams;

@compute @workgroup_size(16, 16, 1)
fn compute_ab(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;
  let data = VxVy[idx];

  // After inverse FFT of mixed derivatives:
  // - real part (data.x) = Vx = dV/dx
  // - imag part (data.y) = Vy = dV/dy
  let Vx = data.x;
  let Vy = data.y;

  // Compute squared terms
  let A_real = -0.5 * Vx * Vx;
  let B_real = -0.5 * Vy * Vy;

  // Output as complex numbers with zero imaginary part
  A[idx] = vec2<f32>(A_real, 0.0);
  B[idx] = vec2<f32>(B_real, 0.0);
}
