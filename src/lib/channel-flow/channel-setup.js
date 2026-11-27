/**
 * Set-up of a pressure-driven turbulent channel in wall units: half-height
 * 1, friction velocity 1, so nu = 1 / Re_tau and the driving force is 1.
 * Time is then in units of half-height / friction velocity, and a balanced
 * flow has wall shear stress 1 on each wall.
 */

import { tanhFaces } from '../webgpu-poisson/channel-poisson.js';

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
  const { Nx, Ny, Nz, Lx, Lz, dx, dz, yFaces, yCenters } = flow;
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
        const xf = i * dx, xc = (i + 0.5) * dx;
        const zf = k * dz, zc = (k + 0.5) * dz;
        data[o] = u(xf, yCenters[j], zc);
        data[o + 1] = j > 0 ? v(xc, yFaces[j], zc) : 0;
        data[o + 2] = w(xc, yCenters[j], zf);
      }
  return data;
}
