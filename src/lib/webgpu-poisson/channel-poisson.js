/**
 * Direct Poisson solver for the pressure of an incompressible channel flow
 * on a staggered grid.
 *
 *   x (streamwise): periodic, uniform, Nx cells (power of two)
 *   z (spanwise):   periodic, uniform, Nz cells (power of two)
 *   y (wall-normal): walls at both ends, Ny cells of arbitrary widths
 *
 * Pressure lives at cell centres and the operator is the divergence of the
 * staggered gradient, i.e. the standard second-order 7-point Laplacian with
 * homogeneous Neumann conditions at the walls. Fourier transforms in x and z
 * diagonalise it, leaving one real tridiagonal system in y per (kx, kz).
 * The solve is exact up to round-off.
 *
 * Memory layout (all buffers flat):
 *
 *   real fields:  index = i + Nx * (k + Nz * j)        f32
 *   spectrum:     index = kx + Mx * (kz + Nz * j)      vec2f, Mx = Nx/2 + 1
 *
 * x is contiguous and each x-z plane is one contiguous block. The y sweep of
 * the tridiagonal solve runs one thread per (kx, kz), so at every step of the
 * sweep the threads together touch exactly one contiguous plane.
 *
 * Five passes over the data:
 *
 *   0  r2c in x        rhs      -> spectrum
 *   1  c2c in z        spectrum (in place)
 *   2  tridiagonal y   spectrum (in place)
 *   3  c2c^-1 in z     spectrum (in place)
 *   4  c2r in x        spectrum -> pressure
 */

import {
  generateR2C,
  generateC2R,
  generateC2C,
  makeTwiddles,
  workgroupStorageBytes,
} from './line-fft.js';

/**
 * Coefficients of the wall-normal second difference
 *
 *   (L_y p)_j = lower_j p_{j-1} - (lower_j + upper_j) p_j + upper_j p_{j+1}
 *
 * for cell faces `yFaces` (length Ny + 1). The wall rows have lower_0 = 0 and
 * upper_{Ny-1} = 0, which is the Neumann condition.
 */
export function wallNormalCoefficients(yFaces) {
  const Ny = yFaces.length - 1;
  const lower = new Float64Array(Ny);
  const upper = new Float64Array(Ny);
  const center = (j) => 0.5 * (yFaces[j] + yFaces[j + 1]);
  for (let j = 0; j < Ny; j++) {
    const h = yFaces[j + 1] - yFaces[j];
    if (j > 0) lower[j] = 1 / (h * (center(j) - center(j - 1)));
    if (j < Ny - 1) upper[j] = 1 / (h * (center(j + 1) - center(j)));
  }
  return { lower, upper };
}

/**
 * Eigenvalue of minus the second-order periodic second difference:
 * (2 - 2 cos(2 pi k / N)) / h^2. Pass a different function as `lambdaX` /
 * `lambdaZ` to match a higher-order gradient and divergence.
 */
export function secondOrderEigenvalue(k, N, h) {
  const s = Math.sin((Math.PI * k) / N);
  return (4 * s * s) / (h * h);
}

/**
 * Reciprocal pivots of the Thomas factorisation for every (kx, kz), computed
 * in double precision. With m_j = 1 / pivot_j the solve is
 *
 *   forward:  d_j = (d_j - lower_j d_{j-1}) m_j
 *   backward: p_j = d_j - upper_j m_j p_{j+1}
 *
 * The (0, 0) mode is singular (pressure is defined up to a constant). Setting
 * m_0 = 0 there replaces its first equation by p_0 = 0, which pins the
 * constant; the discarded equation is implied by the others whenever the
 * right-hand side sums to zero.
 *
 * `lamX` (length Nx/2 + 1) and `lamZ` (length Nz) are the eigenvalues of
 * minus the second derivative in each periodic direction.
 */
export function buildPivots({ Nx, Ny, Nz, lamX, lamZ, lower, upper }) {
  const Mx = Nx / 2 + 1;
  const plane = Mx * Nz;
  const piv = new Float32Array(plane * Ny);
  for (let kz = 0; kz < Nz; kz++) {
    for (let kx = 0; kx < Mx; kx++) {
      const lam = lamX[kx] + lamZ[kz];
      const col = kx + Mx * kz;
      let cPrev = 0;
      for (let j = 0; j < Ny; j++) {
        const diag = -(lower[j] + upper[j]) - lam;
        let m;
        if (j === 0 && kx === 0 && kz === 0) {
          m = 0;
        } else {
          m = 1 / (diag - lower[j] * cPrev);
        }
        cPrev = upper[j] * m;
        piv[col + plane * j] = m;
      }
    }
  }
  return piv;
}

function tridiagonalShader({ Mx, Ny, Nz, workgroupX }) {
  const plane = Mx * Nz;
  return /* wgsl */ `
// Thomas algorithm in y, one thread per (kx, kz)
@group(0) @binding(0) var<storage, read_write> data: array<vec2f>;
@group(0) @binding(1) var<storage, read> piv: array<f32>;
@group(0) @binding(2) var<storage, read> coef: array<vec2f>; // (lower_j, upper_j)

@compute @workgroup_size(${workgroupX})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= ${Mx}u) { return; }
  let col = gid.x + ${Mx}u * gid.y;

  var d = data[col] * piv[col];
  data[col] = d;
  for (var j = 1u; j < ${Ny}u; j++) {
    let idx = col + ${plane}u * j;
    d = (data[idx] - coef[j].x * d) * piv[idx];
    data[idx] = d;
  }
  for (var j = ${Ny - 1}u; j > 0u; ) {
    j--;
    let idx = col + ${plane}u * j;
    d = data[idx] - coef[j].y * piv[idx] * d;
    data[idx] = d;
  }
}
`;
}

/**
 * @param {GPUDevice} device
 * @param {Object} opts
 * @param {number} opts.Nx, opts.Ny, opts.Nz - cell counts
 * @param {number} opts.Lx, opts.Lz - periodic domain lengths
 * @param {ArrayLike<number>} opts.yFaces - Ny + 1 increasing face positions
 * @param {GPUBuffer} [opts.rhs] - f32 right-hand side; created if omitted
 * @param {GPUBuffer} [opts.pressure] - f32 solution; created if omitted. May
 *   be the same buffer as `rhs`.
 * @param {(k: number) => number} [opts.lambdaX], [opts.lambdaZ] - eigenvalues
 *   of minus the discrete second derivative; second order by default
 * @param {number} [opts.maxInvocations] - cap on FFT workgroup size (tuning)
 * @param {number} [opts.tridiagonalWorkgroup] - threads per workgroup in the
 *   y sweep (tuning)
 */
export function createChannelPoisson(device, opts) {
  const { Nx, Ny, Nz, Lx, Lz, yFaces } = opts;
  if (yFaces.length !== Ny + 1) throw new Error(`yFaces must have Ny + 1 = ${Ny + 1} entries`);
  if (Ny < 2) throw new Error('Ny must be at least 2');

  const limits = device.limits;
  const maxInvocations = Math.min(
    opts.maxInvocations ?? 256,
    limits.maxComputeInvocationsPerWorkgroup,
    limits.maxComputeWorkgroupSizeX
  );
  const storageNeeded = workgroupStorageBytes(Math.max(Nx / 2, Nz));
  if (storageNeeded > limits.maxComputeWorkgroupStorageSize) {
    throw new Error(
      `Nx = ${Nx}, Nz = ${Nz} needs ${storageNeeded} bytes of workgroup storage; ` +
        `the device allows ${limits.maxComputeWorkgroupStorageSize}`
    );
  }

  const Mx = Nx / 2 + 1;
  const plane = Mx * Nz;
  const realBytes = Nx * Ny * Nz * 4;
  const spectrumBytes = plane * Ny * 8;
  if (Math.max(realBytes, spectrumBytes) > limits.maxStorageBufferBindingSize) {
    throw new Error(
      `Grid needs a ${Math.max(realBytes, spectrumBytes)} byte storage binding; ` +
        `the device allows ${limits.maxStorageBufferBindingSize}. Request a larger ` +
        `maxStorageBufferBindingSize when creating the device.`
    );
  }
  if (Math.max(Mx, Nz, Ny) > limits.maxComputeWorkgroupsPerDimension) {
    throw new Error('Grid exceeds maxComputeWorkgroupsPerDimension');
  }

  const dx = Lx / Nx;
  const dz = Lz / Nz;
  const lamXfn = opts.lambdaX ?? ((k) => secondOrderEigenvalue(k, Nx, dx));
  const lamZfn = opts.lambdaZ ?? ((k) => secondOrderEigenvalue(k, Nz, dz));
  const lamX = Float64Array.from({ length: Mx }, (_, k) => lamXfn(k));
  const lamZ = Float64Array.from({ length: Nz }, (_, k) => lamZfn(k));
  const { lower, upper } = wallNormalCoefficients(yFaces);

  const owned = [];
  const makeBuffer = (label, size, usage, data) => {
    const buffer = device.createBuffer({ label, size, usage });
    if (data) device.queue.writeBuffer(buffer, 0, data);
    owned.push(buffer);
    return buffer;
  };
  const FIELD = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;

  const rhs = opts.rhs ?? makeBuffer('poisson rhs', realBytes, FIELD);
  const pressure = opts.pressure ?? makeBuffer('poisson pressure', realBytes, FIELD);
  const spectrum = makeBuffer('poisson spectrum', spectrumBytes, FIELD);

  const twX = makeBuffer(
    'poisson twiddles x',
    (Nx / 2 + 1) * 8,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    makeTwiddles(Nx, Nx / 2 + 1)
  );
  const twZ = makeBuffer(
    'poisson twiddles z',
    Math.max(Nz / 2, 1) * 8,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    makeTwiddles(Nz, Math.max(Nz / 2, 1))
  );
  const piv = makeBuffer(
    'poisson pivots',
    plane * Ny * 4,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    buildPivots({ Nx, Ny, Nz, lamX, lamZ, lower, upper })
  );
  const coefData = new Float32Array(2 * Ny);
  for (let j = 0; j < Ny; j++) {
    coefData[2 * j] = lower[j];
    coefData[2 * j + 1] = upper[j];
  }
  const coef = makeBuffer(
    'poisson y coefficients',
    coefData.byteLength,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    coefData
  );

  const tridiagonalWorkgroup = Math.min(opts.tridiagonalWorkgroup ?? 64, maxInvocations);

  // The unscaled round trip gains Nx/2 from the half-length x transform and
  // Nz from the z transform.
  const scale = 1 / ((Nx / 2) * Nz);

  const stage = (label, code, buffers, dispatch) => {
    const module = device.createShaderModule({ label, code });
    const pipeline = device.createComputePipeline({
      label,
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    });
    const bindGroup = device.createBindGroup({
      label,
      layout: pipeline.getBindGroupLayout(0),
      entries: buffers.map((buffer, binding) => ({ binding, resource: { buffer } })),
    });
    return { label, pipeline, bindGroup, dispatch };
  };

  const zArgs = { N: Nz, stride: Mx, lineStrideY: plane, maxInvocations };
  const stages = [
    stage(
      'poisson: r2c x',
      generateR2C({ N: Nx, linesX: Nz, maxInvocations }).code,
      [rhs, spectrum, twX],
      [Nz, Ny]
    ),
    stage(
      'poisson: c2c z',
      generateC2C({ ...zArgs, inverse: false }).code,
      [spectrum, twZ],
      [Mx, Ny]
    ),
    stage(
      'poisson: tridiagonal y',
      tridiagonalShader({ Mx, Ny, Nz, workgroupX: tridiagonalWorkgroup }),
      [spectrum, piv, coef],
      [Math.ceil(Mx / tridiagonalWorkgroup), Nz]
    ),
    stage(
      'poisson: c2c z inverse',
      generateC2C({ ...zArgs, inverse: true }).code,
      [spectrum, twZ],
      [Mx, Ny]
    ),
    stage(
      'poisson: c2r x',
      generateC2R({ N: Nx, linesX: Nz, scale, maxInvocations }).code,
      [spectrum, pressure, twX],
      [Nz, Ny]
    ),
  ];

  const runStage = (pass, s) => {
    pass.setPipeline(s.pipeline);
    pass.setBindGroup(0, s.bindGroup);
    pass.dispatchWorkgroups(s.dispatch[0], s.dispatch[1]);
  };

  return {
    Nx,
    Ny,
    Nz,
    Mx,
    Lx,
    Lz,
    yFaces: Float64Array.from(yFaces),
    lower,
    upper,
    lamX,
    lamZ,
    rhs,
    pressure,
    spectrum,
    stages,
    runStage,
    /**
     * Encode the full solve as one compute pass. `which` selects a subset of
     * stages, which is only useful for testing the transforms.
     */
    solve(encoder, which = [0, 1, 2, 3, 4]) {
      const pass = encoder.beginComputePass({ label: 'poisson solve' });
      for (const i of which) runStage(pass, stages[i]);
      pass.end();
    },
    /** Bytes of GPU memory held by buffers this solver created. */
    get bytes() {
      return owned.reduce((sum, b) => sum + b.size, 0);
    },
    destroy() {
      for (const b of owned) b.destroy();
    },
  };
}

/** Uniform faces on [y0, y1]. */
export function uniformFaces(Ny, y0 = -1, y1 = 1) {
  return Float64Array.from({ length: Ny + 1 }, (_, j) => y0 + ((y1 - y0) * j) / Ny);
}

/**
 * Faces clustered towards both walls of [-1, 1] with a hyperbolic tangent.
 * `beta` controls the clustering; beta -> 0 recovers a uniform grid.
 */
export function tanhFaces(Ny, beta = 2) {
  const t = Math.tanh(beta);
  return Float64Array.from({ length: Ny + 1 }, (_, j) => Math.tanh(beta * ((2 * j) / Ny - 1)) / t);
}

/**
 * The same clustering as `tanhFaces` as a smooth mapping from xi in [0, 1]
 * to y in [-1, 1], with its derivative, for schemes that difference in xi.
 */
export function tanhMapping(beta = 2) {
  const t = Math.tanh(beta);
  return {
    y: (xi) => Math.tanh(beta * (2 * xi - 1)) / t,
    dy: (xi) => (2 * beta) / (t * Math.cosh(beta * (2 * xi - 1)) ** 2),
  };
}

/** Uniform mapping from xi in [0, 1] to [y0, y1]. */
export function uniformMapping(y0 = -1, y1 = 1) {
  return { y: (xi) => y0 + (y1 - y0) * xi, dy: () => y1 - y0 };
}

/** Faces and mapping together, to spread into a solver's options. */
export function tanhGrid(Ny, beta = 2) {
  return { yFaces: tanhFaces(Ny, beta), mapping: tanhMapping(beta) };
}

export function uniformGrid(Ny, y0 = -1, y1 = 1) {
  return { yFaces: uniformFaces(Ny, y0, y1), mapping: uniformMapping(y0, y1) };
}
