// Integrate shader - Velocity Verlet (Kick-Drift-Kick) integration
// PRECISION_ENABLE
//
// Particles: vec4(x, y, vx, vy)
// Gradient: vec4(dphi/dx_re, dphi/dx_im, dphi/dy_re, dphi/dy_im)
//           After inverse FFT, imaginary parts are ~0, so we use .x and .z
//
// The force is F = -grad(phi), and acceleration a = F (unit mass per particle)
// Verlet KDK: v(n+1/2) = v(n) + a(n)*dt/2
//             x(n+1) = x(n) + v(n+1/2)*dt
//             v(n+1) = v(n+1/2) + a(n+1)*dt/2
//
// For simplicity, we compute the full step in one pass using midpoint method:
// This is equivalent to second-order accurate integration

alias GradientVec = vec4<FLOAT_TYPE>;

struct IntegrateParams {
  gridSize: u32,
  numParticles: u32,
  dt: f32,
  _padding: f32,  // Unused, kept for buffer alignment
}

@group(0) @binding(0) var<storage, read_write> particles: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> gradient: array<GradientVec>;
@group(0) @binding(2) var<uniform> params: IntegrateParams;

// Bilinear interpolation of gradient field
fn sampleGradient(pos: vec2<f32>) -> vec2<f32> {
  let N = params.gridSize;
  let Nf = f32(N);

  // Position in grid coordinates
  let gx = pos.x * Nf;
  let gy = pos.y * Nf;

  // Cell indices
  let i0 = u32(floor(gx)) % N;
  let j0 = u32(floor(gy)) % N;
  let i1 = (i0 + 1u) % N;
  let j1 = (j0 + 1u) % N;

  // Fractional part
  let fx = fract(gx);
  let fy = fract(gy);

  // Sample the 4 corners (using real parts: .x for dphi/dx, .z for dphi/dy)
  let g00 = vec4<f32>(gradient[j0 * N + i0]);
  let g10 = vec4<f32>(gradient[j0 * N + i1]);
  let g01 = vec4<f32>(gradient[j1 * N + i0]);
  let g11 = vec4<f32>(gradient[j1 * N + i1]);

  // Bilinear interpolation
  let gx_interp = (1.0 - fx) * (1.0 - fy) * g00.x
                + fx * (1.0 - fy) * g10.x
                + (1.0 - fx) * fy * g01.x
                + fx * fy * g11.x;

  let gy_interp = (1.0 - fx) * (1.0 - fy) * g00.z
                + fx * (1.0 - fy) * g10.z
                + (1.0 - fx) * fy * g01.z
                + fx * fy * g11.z;

  return vec2<f32>(gx_interp, gy_interp);
}

@compute @workgroup_size(256)
fn integrate(@builtin(global_invocation_id) id: vec3<u32>) {
  let particleIdx = id.x;
  if (particleIdx >= params.numParticles) { return; }

  var p = particles[particleIdx];
  let pos = vec2<f32>(p.x, p.y);
  let vel = vec2<f32>(p.z, p.w);

  // Get acceleration at current position
  // Force = -grad(phi), acceleration = force (unit mass per particle)
  // Gradient is now in physical units after N^2 correction in Poisson solve
  let gradPhi = sampleGradient(pos);
  let acc = -gradPhi;

  // Midpoint integration (2nd order):
  // Predict position at half-step
  let velHalf = vel + acc * params.dt * 0.5;
  var posHalf = pos + velHalf * params.dt * 0.5;
  posHalf = fract(posHalf);  // Periodic wrap

  // Get acceleration at midpoint
  let gradPhiMid = sampleGradient(posHalf);
  let accMid = -gradPhiMid;

  // Full step using midpoint acceleration
  let newVel = vel + accMid * params.dt;
  var newPos = pos + newVel * params.dt;
  newPos = fract(newPos);  // Periodic wrap

  particles[particleIdx] = vec4<f32>(newPos, newVel);
}
