// Project FFT Shader
// Projects velocity to be divergence-free in frequency domain
// Also applies viscous diffusion
//
// The projection removes the component of velocity parallel to wavenumber k:
//   u_perp = u - k * (k . u) / |k|^2
//
// Diffusion is applied as multiplication by exp(-nu * |k|^2 * dt)

struct SimParams {
  resolution: vec2<u32>,
  dt: f32,
  viscosity: f32,
  dyeDecay: f32,
}

@group(0) @binding(0) var<storage, read_write> uHat: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> vHat: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: SimParams;

@compute @workgroup_size(16, 16)
fn project_fft(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;
  let Nf = f32(N);

  // Compute wavenumber
  // For standard FFT layout: 0, 1, ..., N/2-1, -N/2, -N/2+1, ..., -1
  var kx = f32(id.x);
  var ky = f32(id.y);
  if (kx >= Nf * 0.5) { kx -= Nf; }
  if (ky >= Nf * 0.5) { ky -= Nf; }

  // Scale wavenumber by 2*pi/L where L=1
  let PI = 3.14159265359;
  kx *= 2.0 * PI;
  ky *= 2.0 * PI;

  let k2 = kx * kx + ky * ky;

  // Load velocity
  var u = uHat[idx];
  var v = vHat[idx];

  // Skip DC component (k=0)
  if (k2 > 0.0001) {
    // Project: remove component parallel to k
    // u_new = u - k * (k . u) / |k|^2
    // For complex: do this separately for real and imaginary parts

    // k . u (complex dot product treating k as real)
    let kdotu_re = kx * u.x + ky * v.x;
    let kdotu_im = kx * u.y + ky * v.y;

    // Subtract projection
    u.x -= kx * kdotu_re / k2;
    u.y -= kx * kdotu_im / k2;
    v.x -= ky * kdotu_re / k2;
    v.y -= ky * kdotu_im / k2;

    // Apply viscous diffusion using implicit method: divide by (1 + nu * k^2 * dt)
    // This matches Stam's paper and is unconditionally stable
    let diffusion = 1.0 / (1.0 + params.viscosity * k2 * params.dt);
    u *= diffusion;
    v *= diffusion;
  } else {
    // Zero out DC component (mean flow)
    u = vec2<f32>(0.0);
    v = vec2<f32>(0.0);
  }

  uHat[idx] = u;
  vHat[idx] = v;
}
