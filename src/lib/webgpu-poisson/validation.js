/**
 * Validation and timing for the channel Poisson solver. Everything on the
 * CPU side is double precision, so the reported errors are those of the
 * single-precision GPU solve.
 */

import { createChannelPoisson, uniformFaces, tanhFaces } from './channel-poisson.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function readBuffer(device, buffer, byteLength) {
  const staging = device.createBuffer({
    size: byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(buffer, 0, staging, 0, byteLength);
  device.queue.submit([encoder.finish()]);
  await staging.mapAsync(GPUMapMode.READ);
  const out = new Float32Array(staging.getMappedRange().slice(0));
  staging.unmap();
  staging.destroy();
  return out;
}

async function gpuSolve(device, solver, rhs, which) {
  device.queue.writeBuffer(solver.rhs, 0, Float32Array.from(rhs));
  const encoder = device.createCommandEncoder();
  solver.solve(encoder, which);
  device.queue.submit([encoder.finish()]);
  return readBuffer(device, solver.pressure, solver.Nx * solver.Ny * solver.Nz * 4);
}

/** The discrete operator the solver inverts, applied in double precision. */
export function applyLaplacian(solver, p) {
  const { Nx, Ny, Nz, Lx, Lz, lower, upper } = solver;
  const ix2 = (Nx / Lx) ** 2;
  const iz2 = (Nz / Lz) ** 2;
  const out = new Float64Array(p.length);
  const plane = Nx * Nz;
  for (let j = 0; j < Ny; j++) {
    for (let k = 0; k < Nz; k++) {
      const kp = (k + 1) % Nz;
      const km = (k + Nz - 1) % Nz;
      for (let i = 0; i < Nx; i++) {
        const ip = (i + 1) % Nx;
        const im = (i + Nx - 1) % Nx;
        const c = i + Nx * k + plane * j;
        let v =
          ix2 * (p[ip + Nx * k + plane * j] - 2 * p[c] + p[im + Nx * k + plane * j]) +
          iz2 * (p[i + Nx * kp + plane * j] - 2 * p[c] + p[i + Nx * km + plane * j]);
        if (j > 0) v += lower[j] * (p[c - plane] - p[c]);
        if (j < Ny - 1) v += upper[j] * (p[c + plane] - p[c]);
        out[c] = v;
      }
    }
  }
  return out;
}

function maxAbs(a) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
  return m;
}

function mean(a) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s / a.length;
}

/** Max difference between two fields after removing each one's mean. */
function maxDiffUpToConstant(a, b) {
  const ma = mean(a);
  const mb = mean(b);
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - ma - (b[i] - mb)));
  return m;
}

/** Stages 0 and 1 against a direct O(N^2) Fourier sum, on a small grid. */
async function testTransforms(device, results) {
  const Nx = 32, Ny = 3, Nz = 16;
  const solver = createChannelPoisson(device, {
    Nx, Ny, Nz, Lx: 1, Lz: 1, yFaces: uniformFaces(Ny),
  });
  const Mx = solver.Mx;
  const rand = mulberry32(1);
  const f = Float64Array.from({ length: Nx * Ny * Nz }, () => rand() - 0.5);
  const f32 = Float32Array.from(f);

  device.queue.writeBuffer(solver.rhs, 0, f32);
  let encoder = device.createCommandEncoder();
  solver.solve(encoder, [0]);
  device.queue.submit([encoder.finish()]);
  const sx = await readBuffer(device, solver.spectrum, Mx * Nz * Ny * 8);

  let errX = 0;
  for (let j = 0; j < Ny; j++)
    for (let k = 0; k < Nz; k++)
      for (let kx = 0; kx < Mx; kx++) {
        let re = 0, im = 0;
        for (let i = 0; i < Nx; i++) {
          const a = (-2 * Math.PI * kx * i) / Nx;
          const v = f32[i + Nx * (k + Nz * j)];
          re += v * Math.cos(a);
          im += v * Math.sin(a);
        }
        const o = 2 * (kx + Mx * (k + Nz * j));
        errX = Math.max(errX, Math.hypot(sx[o] - re, sx[o + 1] - im));
      }
  results.push({ test: 'r2c in x vs direct sum', grid: `${Nx}x${Ny}x${Nz}`, value: errX, limit: 2e-5 });

  encoder = device.createCommandEncoder();
  solver.solve(encoder, [0, 1]);
  device.queue.submit([encoder.finish()]);
  const sxz = await readBuffer(device, solver.spectrum, Mx * Nz * Ny * 8);
  let errXZ = 0;
  for (let j = 0; j < Ny; j++)
    for (let kz = 0; kz < Nz; kz++)
      for (let kx = 0; kx < Mx; kx++) {
        let re = 0, im = 0;
        for (let k = 0; k < Nz; k++)
          for (let i = 0; i < Nx; i++) {
            const a = -2 * Math.PI * ((kx * i) / Nx + (kz * k) / Nz);
            const v = f32[i + Nx * (k + Nz * j)];
            re += v * Math.cos(a);
            im += v * Math.sin(a);
          }
        const o = 2 * (kx + Mx * (kz + Nz * j));
        errXZ = Math.max(errXZ, Math.hypot(sxz[o] - re, sxz[o + 1] - im));
      }
  results.push({ test: 'r2c x + c2c z vs direct sum', grid: `${Nx}x${Ny}x${Nz}`, value: errXZ, limit: 1e-4 });

  const back = await gpuSolve(device, solver, f, [0, 1, 3, 4]);
  let errRT = 0;
  for (let i = 0; i < f.length; i++) errRT = Math.max(errRT, Math.abs(back[i] - f32[i]));
  results.push({ test: 'transform round trip', grid: `${Nx}x${Ny}x${Nz}`, value: errRT, limit: 2e-6 });
  solver.destroy();
}

/** Round trip on a grid large enough that invocations loop over elements. */
async function testLongLines(device, results) {
  const Nx = 1024, Ny = 2, Nz = 512;
  const solver = createChannelPoisson(device, {
    Nx, Ny, Nz, Lx: 1, Lz: 1, yFaces: uniformFaces(Ny),
  });
  const rand = mulberry32(2);
  const f = Float32Array.from({ length: Nx * Ny * Nz }, () => rand() - 0.5);
  const back = await gpuSolve(device, solver, f, [0, 1, 3, 4]);
  let err = 0;
  for (let i = 0; i < f.length; i++) err = Math.max(err, Math.abs(back[i] - f[i]));
  results.push({ test: 'round trip, lines longer than a workgroup', grid: `${Nx}x${Ny}x${Nz}`, value: err, limit: 5e-6 });
  solver.destroy();
}

/**
 * Solve L p = L p_exact for a random p_exact. The right-hand side is formed
 * in double precision, so the error is the solver's alone.
 */
async function testRandom(device, results, { Nx, Ny, Nz, yFaces, name, smooth = false }) {
  const solver = createChannelPoisson(device, {
    Nx, Ny, Nz, Lx: 4 * Math.PI, Lz: 2 * Math.PI, yFaces,
  });
  const grid = `${Nx}x${Ny}x${Nz} ${name}`;
  const rand = mulberry32(3);
  const exact = Float64Array.from({ length: Nx * Ny * Nz }, () => rand() - 0.5);
  if (smooth) {
    // Lowest modes only: the worst-conditioned part of the spectrum, where
    // the right-hand side is smallest relative to the solution.
    for (let j = 0; j < Ny; j++)
      for (let k = 0; k < Nz; k++)
        for (let i = 0; i < Nx; i++) {
          const y = 0.5 * (yFaces[j] + yFaces[j + 1]);
          exact[i + Nx * (k + Nz * j)] =
            Math.cos((2 * Math.PI * (i + 0.5)) / Nx) * Math.cos((Math.PI * (y + 1)) / 2) +
            0.5 * Math.sin((2 * Math.PI * (k + 0.5)) / Nz) * Math.cos(Math.PI * (y + 1));
        }
  }
  const kind = smooth ? 'smooth field' : 'random field';
  const rhs = applyLaplacian(solver, exact);
  const p = await gpuSolve(device, solver, rhs);

  results.push({
    test: `${kind}: |p - p_exact| / |p_exact|`,
    grid,
    value: maxDiffUpToConstant(p, exact) / maxAbs(exact),
    limit: 1e-3,
  });

  // Residual against the right-hand side the GPU actually received.
  const rhs32 = Float32Array.from(rhs);
  const Lp = applyLaplacian(solver, p);
  let res = 0;
  for (let i = 0; i < Lp.length; i++) res = Math.max(res, Math.abs(Lp[i] - rhs32[i]));
  results.push({
    test: `${kind}: |L p - f| / |f|`,
    grid,
    value: res / maxAbs(rhs32),
    limit: smooth ? 2e-2 : 1e-3,
  });
  solver.destroy();
}

/**
 * Project a random staggered velocity field and measure what divergence is
 * left. This is the quantity the flow solver cares about.
 *
 * u lives on x faces, w on z faces, v on y faces (zero on both walls).
 */
async function testProjection(device, results, { Nx, Ny, Nz, yFaces, name }) {
  const Lx = 4 * Math.PI, Lz = 2 * Math.PI;
  const solver = createChannelPoisson(device, { Nx, Ny, Nz, Lx, Lz, yFaces });
  const dx = Lx / Nx, dz = Lz / Nz;
  const plane = Nx * Nz;
  const n = plane * Ny;
  const rand = mulberry32(4);
  const u = Float32Array.from({ length: n }, () => rand() - 0.5);
  const w = Float32Array.from({ length: n }, () => rand() - 0.5);
  // v[j] is the face below cell j; an extra plane holds the top wall.
  const v = new Float32Array(n + plane);
  for (let i = plane; i < n; i++) v[i] = rand() - 0.5;

  const divergence = (u, v, w) => {
    const out = new Float64Array(n);
    for (let j = 0; j < Ny; j++) {
      const h = yFaces[j + 1] - yFaces[j];
      for (let k = 0; k < Nz; k++)
        for (let i = 0; i < Nx; i++) {
          const c = i + Nx * k + plane * j;
          out[c] =
            (u[((i + 1) % Nx) + Nx * k + plane * j] - u[c]) / dx +
            (w[i + Nx * ((k + 1) % Nz) + plane * j] - w[c]) / dz +
            (v[c + plane] - v[c]) / h;
        }
    }
    return out;
  };

  const div0 = divergence(u, v, w);
  const p = await gpuSolve(device, solver, div0);

  // Subtract the gradient in single precision, as the GPU would.
  const u1 = new Float32Array(n), w1 = new Float32Array(n), v1 = new Float32Array(n + plane);
  const yc = (j) => 0.5 * (yFaces[j] + yFaces[j + 1]);
  for (let j = 0; j < Ny; j++)
    for (let k = 0; k < Nz; k++)
      for (let i = 0; i < Nx; i++) {
        const c = i + Nx * k + plane * j;
        u1[c] = u[c] - Math.fround((p[c] - p[((i + Nx - 1) % Nx) + Nx * k + plane * j]) / dx);
        w1[c] = w[c] - Math.fround((p[c] - p[i + Nx * ((k + Nz - 1) % Nz) + plane * j]) / dz);
        if (j > 0) v1[c] = v[c] - Math.fround((p[c] - p[c - plane]) / (yc(j) - yc(j - 1)));
      }
  const div1 = divergence(u1, v1, w1);

  results.push({
    test: 'projection: |div after| / |div before|',
    grid: `${Nx}x${Ny}x${Nz} ${name}`,
    value: maxAbs(div1) / maxAbs(div0),
    limit: 1e-4,
  });
  solver.destroy();
}

/**
 * Smooth manufactured solution with the continuous Laplacian as right-hand
 * side: the error is the truncation error and should fall as h^2.
 */
async function testConvergence(device, results) {
  const Lx = 2, Lz = 1;
  const errors = [];
  const sizes = [16, 32, 64];
  for (const N of sizes) {
    const solver = createChannelPoisson(device, {
      Nx: N, Ny: N, Nz: N, Lx, Lz, yFaces: uniformFaces(N, 0, 1),
    });
    const ax = (2 * Math.PI) / Lx, ay = Math.PI, az = (4 * Math.PI) / Lz;
    const exact = new Float64Array(N * N * N);
    const rhs = new Float64Array(N * N * N);
    for (let j = 0; j < N; j++)
      for (let k = 0; k < N; k++)
        for (let i = 0; i < N; i++) {
          const x = ((i + 0.5) * Lx) / N, y = (j + 0.5) / N, z = ((k + 0.5) * Lz) / N;
          const val = Math.cos(ax * x) * Math.cos(ay * y) * Math.cos(az * z);
          exact[i + N * (k + N * j)] = val;
          rhs[i + N * (k + N * j)] = -(ax * ax + ay * ay + az * az) * val;
        }
    const p = await gpuSolve(device, solver, rhs);
    errors.push(maxDiffUpToConstant(p, exact));
    solver.destroy();
  }
  for (let s = 0; s < sizes.length; s++) {
    results.push({
      test: 'manufactured solution: max error',
      grid: `${sizes[s]}^3 uniform`,
      value: errors[s],
      limit: 0.05,
    });
  }
  const order = Math.log2(errors[errors.length - 2] / errors[errors.length - 1]);
  results.push({
    test: 'manufactured solution: observed order',
    grid: `${sizes[sizes.length - 2]}^3 -> ${sizes[sizes.length - 1]}^3`,
    value: order,
    limit: 1.9,
    atLeast: true,
  });
}

/**
 * Run the whole suite. Returns rows of { test, grid, value, limit, pass }.
 * Nx, Ny, Nz set the grid of the solve and projection tests.
 */
export async function validateChannelPoisson(device, { Nx = 64, Ny = 48, Nz = 32 } = {}) {
  const results = [];
  await testTransforms(device, results);
  await testLongLines(device, results);
  for (const g of [
    { yFaces: uniformFaces(Ny), name: 'uniform' },
    { yFaces: tanhFaces(Ny, 2), name: 'tanh' },
  ]) {
    await testRandom(device, results, { Nx, Ny, Nz, ...g });
    await testRandom(device, results, { Nx, Ny, Nz, ...g, smooth: true });
    await testProjection(device, results, { Nx, Ny, Nz, ...g });
  }
  await testConvergence(device, results);
  for (const r of results) {
    r.pass = Number.isFinite(r.value) && (r.atLeast ? r.value >= r.limit : r.value <= r.limit);
  }
  return results;
}

/**
 * Time each stage of the solve. Uses GPU timestamp queries when the device
 * has the `timestamp-query` feature, otherwise wall-clock time for the whole
 * solve. Returns { stages: [{ label, ms }], totalMs, method, cells, bytes }.
 */
export async function benchmarkChannelPoisson(device, opts, { iterations = 20, warmup = 3 } = {}) {
  const solver = createChannelPoisson(device, opts);
  const { Nx, Ny, Nz } = solver;
  const rand = mulberry32(5);
  device.queue.writeBuffer(
    solver.rhs,
    0,
    Float32Array.from({ length: Nx * Ny * Nz }, () => rand() - 0.5)
  );
  const nStages = solver.stages.length;
  const summary = { cells: Nx * Ny * Nz, bytes: solver.bytes };

  for (let i = 0; i < warmup; i++) {
    const encoder = device.createCommandEncoder();
    solver.solve(encoder);
    device.queue.submit([encoder.finish()]);
  }
  await device.queue.onSubmittedWorkDone();

  if (!device.features.has('timestamp-query')) {
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      const encoder = device.createCommandEncoder();
      solver.solve(encoder);
      device.queue.submit([encoder.finish()]);
    }
    await device.queue.onSubmittedWorkDone();
    const totalMs = (performance.now() - t0) / iterations;
    solver.destroy();
    return { ...summary, method: 'wall clock', totalMs, stages: [] };
  }

  const querySet = device.createQuerySet({ type: 'timestamp', count: 2 * nStages });
  const resolve = device.createBuffer({
    size: 16 * nStages,
    usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
  });
  const staging = device.createBuffer({
    size: 16 * nStages,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const sums = new Array(nStages).fill(0);
  for (let it = 0; it < iterations; it++) {
    const encoder = device.createCommandEncoder();
    solver.stages.forEach((s, i) => {
      const pass = encoder.beginComputePass({
        timestampWrites: {
          querySet,
          beginningOfPassWriteIndex: 2 * i,
          endOfPassWriteIndex: 2 * i + 1,
        },
      });
      solver.runStage(pass, s);
      pass.end();
    });
    encoder.resolveQuerySet(querySet, 0, 2 * nStages, resolve, 0);
    encoder.copyBufferToBuffer(resolve, 0, staging, 0, 16 * nStages);
    device.queue.submit([encoder.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const t = new BigUint64Array(staging.getMappedRange());
    for (let i = 0; i < nStages; i++) sums[i] += Number(t[2 * i + 1] - t[2 * i]) / 1e6;
    staging.unmap();
  }
  const stages = solver.stages.map((s, i) => ({ label: s.label, ms: sums[i] / iterations }));
  querySet.destroy();
  resolve.destroy();
  staging.destroy();
  solver.destroy();
  return {
    ...summary,
    method: 'timestamp query',
    totalMs: stages.reduce((a, s) => a + s.ms, 0),
    stages,
  };
}
