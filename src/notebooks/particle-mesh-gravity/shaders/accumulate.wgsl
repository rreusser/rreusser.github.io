// Accumulate shader - deposits particle mass to grid using bilinear weights
// Uses fixed-point atomics since WebGPU lacks atomic float operations

struct AccumulateParams {
  gridSize: u32,
  numParticles: u32,
  fixedPointScale: f32,  // Scale factor for fixed-point (e.g., 2^24)
  massPerParticle: f32,  // 1.0 / numParticles for unit total mass
}

@group(0) @binding(0) var<storage, read> particles: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> densityAtomic: array<atomic<i32>>;
@group(0) @binding(2) var<uniform> params: AccumulateParams;

@compute @workgroup_size(256)
fn accumulate(@builtin(global_invocation_id) id: vec3<u32>) {
  let particleIdx = id.x;
  if (particleIdx >= params.numParticles) { return; }

  let N = params.gridSize;
  let Nf = f32(N);
  let p = particles[particleIdx];

  // Position in grid coordinates [0, N)
  let gx = p.x * Nf;
  let gy = p.y * Nf;

  // Cell indices (integer part)
  let i0 = u32(floor(gx));
  let j0 = u32(floor(gy));

  // Fractional part for bilinear weights
  let fx = gx - floor(gx);
  let fy = gy - floor(gy);

  // Bilinear weights
  let w00 = (1.0 - fx) * (1.0 - fy);
  let w10 = fx * (1.0 - fy);
  let w01 = (1.0 - fx) * fy;
  let w11 = fx * fy;

  // Convert to fixed-point
  let mass = params.massPerParticle;
  let scale = params.fixedPointScale;
  let m00 = i32(w00 * mass * scale);
  let m10 = i32(w10 * mass * scale);
  let m01 = i32(w01 * mass * scale);
  let m11 = i32(w11 * mass * scale);

  // Wrap indices for periodic boundaries
  let i1 = (i0 + 1u) % N;
  let j1 = (j0 + 1u) % N;

  // Accumulate to 4 neighboring cells
  atomicAdd(&densityAtomic[j0 * N + i0], m00);
  atomicAdd(&densityAtomic[j0 * N + i1], m10);
  atomicAdd(&densityAtomic[j1 * N + i0], m01);
  atomicAdd(&densityAtomic[j1 * N + i1], m11);
}
