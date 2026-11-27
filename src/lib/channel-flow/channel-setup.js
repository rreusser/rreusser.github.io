/**
 * Set-up of a pressure-driven turbulent channel in wall units: half-height
 * 1, friction velocity 1, so nu = 1 / Re_tau and the driving force is 1.
 * Time is then in units of half-height / friction velocity, and a balanced
 * flow has wall shear stress 1 on each wall.
 */

import { tanhFaces, tanhMapping } from '../webgpu-poisson/channel-poisson.js';
import { orrSommerfeldMode } from './orr-sommerfeld.js';

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

/** Options for `createChannelFlow` for a channel at friction Reynolds number `reTau`. */
export function channelOptions({ reTau = 180, Nx, Ny, Nz, Lx = Math.PI, Lz = Math.PI / 2, stretch = 2 }) {
  return {
    Nx, Ny, Nz, Lx, Lz,
    yFaces: tanhFaces(Ny, stretch),
    mapping: tanhMapping(stretch),
    nu: 1 / reTau,
    forcing: 1,
  };
}

/** Grid spacings in wall units, to judge resolution. */
export function wallUnits(flow, reTau) {
  let hmin = Infinity, hmax = 0;
  for (const h of flow.heights) {
    hmin = Math.min(hmin, h);
    hmax = Math.max(hmax, h);
  }
  return {
    dxPlus: flow.dx * reTau,
    dzPlus: flow.dz * reTau,
    dyWallPlus: hmin * reTau,
    dyCentrePlus: hmax * reTau,
    LxPlus: flow.Lx * reTau,
    LzPlus: flow.Lz * reTau,
  };
}

/**
 * A parabolic profile with bulk velocity `bulk` plus finite-amplitude
 * disturbances: streamwise vortices and a few oblique modes with random
 * phases, all vanishing at the walls. Plane Poiseuille flow is linearly
 * stable at these Reynolds numbers, so the disturbance has to be large
 * enough to trigger transition directly. Returns an interleaved state; call
 * `flow.project()` after uploading it.
 *
 * @param {number} [bulk] - bulk velocity in friction units; 15.6 is the
 *   turbulent value at Re_tau = 180
 * @param {number} [amplitude] - disturbance size as a fraction of `bulk`
 */
export function perturbedChannel(flow, { bulk = 15.6, amplitude = 0.2, seed = 1 } = {}) {
  const { Nx, Ny, Nz, Lx, Lz, dx, dz, yFaces, yCenters, xOffsetU = 0, zOffsetW = 0 } = flow;
  const rand = mulberry32(seed);
  const ax = (2 * Math.PI) / Lx;
  const az = (2 * Math.PI) / Lz;
  const A = amplitude * bulk;

  const modes = [];
  for (let kx = 0; kx <= 2; kx++)
    for (let kz = 1; kz <= 2; kz++)
      modes.push({
        kx: kx * ax,
        kz: kz * az,
        // kx = 0 modes are the streamwise vortices and carry most of the energy.
        amp: (kx === 0 ? 1 : 0.5) / kz,
        phase: [0, 1, 2, 3].map(() => 2 * Math.PI * rand()),
      });

  const envelope = (y) => (1 - y * y) ** 2;
  const dEnvelope = (y) => -4 * y * (1 - y * y);

  const u = (x, y, z) => {
    let s = 1.5 * bulk * (1 - y * y);
    for (const m of modes) {
      if (m.kx === 0) continue;
      s += A * 0.5 * m.amp * envelope(y) * Math.sin(m.kx * x + m.phase[0]) * Math.sin(m.kz * z + m.phase[1]);
    }
    return s;
  };
  // v and w from a streamfunction in the y-z plane, modulated in x.
  const v = (x, y, z) => {
    let s = 0;
    for (const m of modes)
      s += A * m.amp * envelope(y) * Math.cos(m.kx * x + m.phase[2]) * Math.cos(m.kz * z + m.phase[3]);
    return s;
  };
  const w = (x, y, z) => {
    let s = 0;
    for (const m of modes)
      s -= ((A * m.amp) / m.kz) * dEnvelope(y) * Math.cos(m.kx * x + m.phase[2]) * Math.sin(m.kz * z + m.phase[3]);
    return s;
  };

  const data = new Float32Array(4 * Nx * Ny * Nz);
  for (let j = 0; j < Ny; j++)
    for (let k = 0; k < Nz; k++)
      for (let i = 0; i < Nx; i++) {
        const o = 4 * (i + Nx * (k + Nz * j));
        const xu = (i + xOffsetU) * dx, xc = (i + 0.5) * dx;
        const zw = (k + zOffsetW) * dz, zc = (k + 0.5) * dz;
        data[o] = u(xu, yCenters[j], zc);
        data[o + 1] = j > 0 ? v(xc, yFaces[j], zc) : 0;
        data[o + 2] = w(xc, yCenters[j], zw);
      }
  return data;
}

/**
 * Options for `createChannelFlow` for laminar-scaled runs: half-height 1 and
 * centreline velocity 1 for the parabolic profile, so nu = 1 / Re and the
 * force that holds the parabola steady is 2 / Re. Time is in half-heights
 * per centreline velocity.
 */
export function laminarOptions({ re = 3000, Nx, Ny, Nz, Lx = 4 * Math.PI, Lz = 2 * Math.PI, stretch = 1.5 }) {
  return {
    Nx, Ny, Nz, Lx, Lz,
    yFaces: tanhFaces(Ny, stretch),
    mapping: tanhMapping(stretch),
    nu: 1 / re,
    forcing: 2 / re,
  };
}

/**
 * Body force that steers the bulk velocity to `target`, for running at
 * fixed mass flux. The bulk velocity obeys dU/dt = force - mean wall shear,
 * so this cancels the measured shear and relaxes the remaining error over
 * the time `relax`. `stats` is the result of `flow.statistics()`.
 */
export function fluxForcing(stats, target, relax = 1) {
  const shear = 0.5 * (stats.wallShear[0] + stats.wallShear[1]);
  return shear + (target - stats.bulkVelocity) / relax;
}

/**
 * Laminar parabolic flow plus one localized pair of counter-rotating
 * streamwise vortices next to the lower wall:
 *
 *   psi = eps f(y) zt exp(-xt^2 - zt^2),   v = d psi / dz,   w = -d psi / dy,
 *
 * with xt = (x - x0) / lx, zt = (z - z0) / lz and f = (1 + y)^p (1 - y)^q.
 * Between the vortices fluid moves away from the wall, lifting slow fluid
 * into the faster stream; the kinked shear layer that results is what rolls
 * up into a hairpin. Larger q pushes the disturbance towards the lower wall.
 * After Henningson, Lundbladh & Johansson (1993), who used a pair of such
 * vortex pairs. Returns an interleaved state; call `flow.project()` after
 * uploading it.
 *
 * @param {number} [amplitude] - peak wall-normal velocity, in centreline velocities
 * @param {number} [lx], [lz] - streamwise and spanwise extent, in half-heights
 */
export function localizedDisturbance(flow, opts = {}) {
  const { Nx, Ny, Nz, Lx, Lz, dx, dz, yFaces, yCenters, zOffsetW = 0 } = flow;
  const {
    amplitude = 0.15,
    lx = 0.8,
    lz = 0.35,
    x0 = 0.15 * Lx,
    z0 = 0.5 * Lz,
    p = 2,
    q = 5,
  } = opts;
  const f = (y) => (1 + y) ** p * (1 - y) ** q;
  const df = (y) => p * (1 + y) ** (p - 1) * (1 - y) ** q - q * (1 + y) ** p * (1 - y) ** (q - 1);
  const yPeak = (p - q) / (p + q);
  const eps = (amplitude * lz) / f(yPeak);
  // Nearest periodic image, so a disturbance near the edge of the box wraps.
  const wrap = (d, L) => d - L * Math.round(d / L);
  const envelope = (x, z) => {
    const xt = wrap(x - x0, Lx) / lx;
    const zt = wrap(z - z0, Lz) / lz;
    return { zt, e: Math.exp(-xt * xt - zt * zt) };
  };

  const data = new Float32Array(4 * Nx * Ny * Nz);
  for (let j = 0; j < Ny; j++)
    for (let k = 0; k < Nz; k++)
      for (let i = 0; i < Nx; i++) {
        const o = 4 * (i + Nx * (k + Nz * j));
        const xc = (i + 0.5) * dx;
        data[o] = 1 - yCenters[j] ** 2;
        if (j > 0) {
          const { zt, e } = envelope(xc, (k + 0.5) * dz);
          data[o + 1] = (eps / lz) * f(yFaces[j]) * (1 - 2 * zt * zt) * e;
        }
        const { zt, e } = envelope(xc, (k + zOffsetW) * dz);
        data[o + 2] = -eps * df(yCenters[j]) * zt * e;
      }
  return data;
}

/**
 * Laminar parabolic flow plus Orr-Sommerfeld eigenmodes, in laminar units.
 *
 * Each entry of `waves` is { mode, amplitude, phase, pair }:
 *
 *  - `mode` comes from `orrSommerfeldMode`. Its wavelengths must fit the box.
 *  - `amplitude` is the peak streamwise velocity of the wave, in centreline
 *    velocities.
 *  - `pair: true` adds the wave together with its mirror image in z, each at
 *    half the amplitude, which gives a standing pattern cos(beta z) in u and
 *    v and sin(beta z) in w with peak streamwise velocity `amplitude`.
 *  - `phase` shifts the wave in x, in radians.
 *
 * Returns an interleaved state; call `flow.project()` after uploading it.
 */
export function wavePerturbedPoiseuille(flow, waves) {
  const { Nx, Ny, Nz, Lx, Lz, dx, dz, yFaces, yCenters, xOffsetU = 0, zOffsetW = 0 } = flow;
  for (const { mode } of waves) {
    const nx = (mode.alpha * Lx) / (2 * Math.PI);
    const nz = (mode.beta * Lz) / (2 * Math.PI);
    if (Math.abs(nx - Math.round(nx)) > 1e-6 || Math.abs(nz - Math.round(nz)) > 1e-6) {
      throw new Error(`Wave (alpha, beta) = (${mode.alpha}, ${mode.beta}) does not fit the box`);
    }
  }
  // Mode shapes on the rows where each component lives.
  const rows = waves.map(({ mode }) => ({
    centre: Array.from(yCenters, (y) => mode.sample(y)),
    face: Array.from({ length: Ny }, (_, j) => mode.sample(yFaces[j])),
  }));

  const data = new Float32Array(4 * Nx * Ny * Nz);
  for (let j = 0; j < Ny; j++)
    for (let k = 0; k < Nz; k++)
      for (let i = 0; i < Nx; i++) {
        const o = 4 * (i + Nx * (k + Nz * j));
        const xf = (i + xOffsetU) * dx, xc = (i + 0.5) * dx;
        const zf = (k + zOffsetW) * dz, zc = (k + 0.5) * dz;
        let u = 1 - yCenters[j] ** 2, v = 0, w = 0;
        waves.forEach(({ mode, amplitude, phase = 0, pair = false }, n) => {
          const { alpha, beta } = mode;
          const c = rows[n].centre[j], f = rows[n].face[j];
          // Real part of q exp(i theta)
          const real = (q, theta) => q[0] * Math.cos(theta) - q[1] * Math.sin(theta);
          const imag = (q, theta) => q[0] * Math.sin(theta) + q[1] * Math.cos(theta);
          if (pair) {
            u += amplitude * Math.cos(beta * zc) * real(c.u, alpha * xf + phase);
            v += amplitude * Math.cos(beta * zc) * real(f.v, alpha * xc + phase);
            w -= amplitude * Math.sin(beta * zf) * imag(c.w, alpha * xc + phase);
          } else {
            u += amplitude * real(c.u, alpha * xf + beta * zc + phase);
            v += amplitude * real(f.v, alpha * xc + beta * zc + phase);
            w += amplitude * real(c.w, alpha * xc + beta * zf + phase);
          }
        });
        data[o] = u;
        data[o + 1] = j > 0 ? v : 0;
        data[o + 2] = w;
      }
  return data;
}

/**
 * Options for a K-type (Klebanoff) transition run: laminar units, with a box
 * exactly one wavelength of the waves long and wide. The defaults are those
 * of the classic channel simulations of this route (Gilbert & Kleiser 1990).
 */
export function kTypeOptions({ re = 5000, alpha = 1.12, beta = 2.1, Nx, Ny, Nz, stretch = 1.5 }) {
  return laminarOptions({
    re, Nx, Ny, Nz, stretch,
    Lx: (2 * Math.PI) / alpha,
    Lz: (2 * Math.PI) / beta,
  });
}

/**
 * Initial condition for K-type transition: the parabolic profile, a
 * two-dimensional Tollmien-Schlichting wave of finite amplitude, and a weak
 * pair of oblique waves with the same streamwise wavenumber. The plane wave
 * barely grows or decays on its own, but it makes the flow unstable to the
 * oblique pair, whose growth bends the spanwise vortex lines of the wave
 * into Lambda-shaped vortices at fixed spanwise positions.
 *
 * @param {number} [amplitude2d], [amplitude3d] - peak streamwise velocity of
 *   the plane wave and of the oblique pair, in centreline velocities
 * @param {number} [phase] - streamwise phase of the oblique pair relative to
 *   the plane wave, in radians
 * @returns {{ state: Float32Array, plane, oblique }} the interleaved state
 *   and the two eigenmodes
 */
export function kTypeDisturbance(flow, opts = {}) {
  const {
    re = 5000, alpha = 1.12, beta = 2.1,
    amplitude2d = 0.03, amplitude3d = 0.001, phase = 0, N = 96,
  } = opts;
  const plane = orrSommerfeldMode({ re, alpha, N });
  const oblique = orrSommerfeldMode({ re, alpha, beta, N });
  const state = wavePerturbedPoiseuille(flow, [
    { mode: plane, amplitude: amplitude2d },
    { mode: oblique, amplitude: amplitude3d, pair: true, phase },
  ]);
  return { state, plane, oblique };
}
