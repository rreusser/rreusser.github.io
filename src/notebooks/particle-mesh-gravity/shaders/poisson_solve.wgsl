// Poisson solve shader - solves Poisson equation and computes gradient in frequency domain
// PRECISION_ENABLE
//
// Input: densityHat (FFT of mass per cell) - always f32 to avoid underflow
// Output: gradientHat (FFT of gradient) - packed as (dphi/dx, phi, dphi/dy, 0)
//
// Physics:
//   nabla^2 phi = 4*pi*rho  (Poisson for gravity with G=1)
//   In Fourier: -|k|^2 * phi_hat = 4*pi * rho_hat
//   So: phi_hat = -4*pi * rho_hat / |k|^2
//
//   IMPORTANT: densityHat contains FFT of mass per cell, not mass density.
//   Physical density = mass_per_cell * N^2 (cell area = 1/N^2)
//   So we multiply by N^2 to get correct physical units.
//
//   Gradient: d/dx -> multiply by i*kx in Fourier

alias GradientVec = vec4<FLOAT_TYPE>;

struct PoissonParams {
  gridSize: u32,
}

const PI: f32 = 3.14159265359;

@group(0) @binding(0) var<storage, read> densityHat: array<vec2<f32>>;  // Always f32
@group(0) @binding(1) var<storage, read_write> gradientHat: array<GradientVec>;
@group(0) @binding(2) var<storage, read_write> potentialHat: array<vec2<f32>>;  // Reuses density buffer
@group(0) @binding(3) var<uniform> params: PoissonParams;

@compute @workgroup_size(16, 16)
fn poisson_solve(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.gridSize;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;
  let Nf = f32(N);

  // Compute wavenumber
  // FFT layout: 0, 1, ..., N/2-1, -N/2, -N/2+1, ..., -1
  var kx = f32(id.x);
  var ky = f32(id.y);
  if (kx >= Nf * 0.5) { kx -= Nf; }
  if (ky >= Nf * 0.5) { ky -= Nf; }

  // Scale by 2*pi (domain is [0,1]^2)
  kx *= 2.0 * PI;
  ky *= 2.0 * PI;

  let k2 = kx * kx + ky * ky;

  // Convert from mass per cell to physical density by multiplying by N^2
  // (cell area = 1/N^2, so density = mass / area = mass * N^2)
  let rhoHat = densityHat[idx] * Nf * Nf;

  if (k2 > 1e-8) {
    // phi_hat = -4*pi * rho_hat / |k|^2
    let phiHat = -4.0 * PI * rhoHat / k2;

    // Store potential in frequency domain (for later inverse FFT)
    potentialHat[idx] = phiHat;

    // Gradient: d/dx -> i*kx multiplication
    // For complex z = (re, im), multiply by i*k:
    // i*k * z = i*k * (re + i*im) = -k*im + i*k*re = (-k*im, k*re)
    let dphidx = vec2<f32>(-kx * phiHat.y, kx * phiHat.x);
    let dphidy = vec2<f32>(-ky * phiHat.y, ky * phiHat.x);

    // Pack as: (dphi/dx_re, dphi/dx_im, dphi/dy_re, dphi/dy_im)
    // After inverse FFT, we'll have (dphi/dx, ~0, dphi/dy, ~0)
    gradientHat[idx] = GradientVec(
      FLOAT_TYPE(dphidx.x), FLOAT_TYPE(dphidx.y),
      FLOAT_TYPE(dphidy.x), FLOAT_TYPE(dphidy.y)
    );
  } else {
    // Zero DC component (sets mean potential to zero)
    potentialHat[idx] = vec2<f32>(0.0, 0.0);
    gradientHat[idx] = GradientVec(
      FLOAT_TYPE(0.0), FLOAT_TYPE(0.0),
      FLOAT_TYPE(0.0), FLOAT_TYPE(0.0)
    );
  }
}
