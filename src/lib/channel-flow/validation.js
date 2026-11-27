/**
 * Validation of the channel flow solver against exact solutions and
 * conservation properties. Reference values are double precision.
 */

import { createChannelFlow } from './channel-flow.js';
import { uniformFaces, tanhFaces } from '../webgpu-poisson/channel-poisson.js';

/** Build an interleaved state from functions of position for u, v and w. */
export function fillState(flow, { u, v, w }) {
  const { Nx, Ny, Nz, dx, dz, yFaces, yCenters } = flow;
  const data = new Float32Array(4 * Nx * Ny * Nz);
  for (let j = 0; j < Ny; j++)
    for (let k = 0; k < Nz; k++)
      for (let i = 0; i < Nx; i++) {
        const o = 4 * (i + Nx * (k + Nz * j));
        const xf = i * dx, xc = (i + 0.5) * dx;
        const zf = k * dz, zc = (k + 0.5) * dz;
        data[o] = u ? u(xf, yCenters[j], zc) : 0;
        data[o + 1] = v && j > 0 ? v(xc, yFaces[j], zc) : 0;
        data[o + 2] = w ? w(xc, yCenters[j], zf) : 0;
      }
  return data;
}

/** Discrete kinetic energy per unit volume, in the norm the scheme conserves. */
export function kineticEnergy(flow, state) {
  const { Nx, Ny, Nz, heights, faceSpacings, yFaces } = flow;
  let e = 0;
  for (let j = 0; j < Ny; j++) {
    let su = 0, sv = 0;
    for (let c = 0; c < Nx * Nz; c++) {
      const o = 4 * (c + Nx * Nz * j);
      su += state[o] * state[o] + state[o + 2] * state[o + 2];
      sv += state[o + 1] * state[o + 1];
    }
    e += 0.5 * (su * heights[j] + sv * faceSpacings[j]);
  }
  return e / (Nx * Nz * (yFaces[Ny] - yFaces[0]));
}

function bulkVelocity(flow, state) {
  const { Nx, Ny, Nz, heights, yFaces } = flow;
  let s = 0;
  for (let j = 0; j < Ny; j++)
    for (let c = 0; c < Nx * Nz; c++) s += state[4 * (c + Nx * Nz * j)] * heights[j];
  return s / (Nx * Nz * (yFaces[Ny] - yFaces[0]));
}

function maxSpeed(state) {
  let m = 0;
  for (let o = 0; o < state.length; o += 4)
    m = Math.max(m, Math.abs(state[o]), Math.abs(state[o + 1]), Math.abs(state[o + 2]));
  return m;
}

const TAU = 2 * Math.PI;

const smoothField = {
  u: (x, y, z) => Math.cos(x) * Math.sin(2 * z + 1) * (1 - y * y) + 0.5 * Math.sin(2 * x) * Math.cos(z),
  v: (x, y, z) => Math.sin(x + 0.5) * Math.cos(z) * (1 - y * y),
  w: (x, y, z) => Math.sin(2 * x) * Math.sin(z + 0.3) * y + 0.3 * Math.cos(x),
};

/** An arbitrary field is divergence-free after projection, and stays so. */
async function testDivergence(device, results) {
  const Nx = 32, Ny = 24, Nz = 16;
  const flow = createChannelFlow(device, {
    Nx, Ny, Nz, Lx: TAU, Lz: TAU, yFaces: tanhFaces(Ny, 1.5), nu: 0.01,
  });
  flow.setState(fillState(flow, smoothField));
  const before = await flow.statistics();
  flow.project();
  const after = await flow.statistics();
  flow.advance(0.01, 10);
  const stepped = await flow.statistics();
  const grid = `${Nx}x${Ny}x${Nz} tanh`;
  results.push({ test: 'projection: |div after| / |div before|', grid, value: after.maxDivergence / before.maxDivergence, limit: 1e-5 });
  results.push({ test: 'after 10 steps: |div| / max velocity gradient scale', grid, value: stepped.maxDivergence / stepped.maxCfl, limit: 1e-5 });
  flow.destroy();
}

/**
 * Decaying Taylor-Green vortex in the periodic x-z plane between free-slip
 * walls: an exact solution, u = sin x cos z F, w = -cos x sin z F,
 * F = exp(-2 nu t). Checks the periodic convective and viscous terms and the
 * spatial order.
 */
async function testTaylorGreen(device, results) {
  const nu = 0.1, T = 2, dt = 0.01;
  const errors = [];
  const sizes = [16, 32, 64];
  for (const N of sizes) {
    const flow = createChannelFlow(device, {
      Nx: N, Ny: 4, Nz: N, Lx: TAU, Lz: TAU, yFaces: uniformFaces(4, 0, 1), nu, wall: 'free-slip',
    });
    flow.setState(fillState(flow, {
      u: (x, y, z) => Math.sin(x) * Math.cos(z),
      w: (x, y, z) => -Math.cos(x) * Math.sin(z),
    }));
    flow.advance(dt, Math.round(T / dt));
    const got = await flow.readState();
    const F = Math.exp(-2 * nu * T);
    const exact = fillState(flow, {
      u: (x, y, z) => Math.sin(x) * Math.cos(z) * F,
      w: (x, y, z) => -Math.cos(x) * Math.sin(z) * F,
    });
    let err = 0;
    for (let o = 0; o < got.length; o += 4)
      err = Math.max(err, Math.abs(got[o] - exact[o]), Math.abs(got[o + 1]), Math.abs(got[o + 2] - exact[o + 2]));
    errors.push(err / F);
    flow.destroy();
  }
  sizes.forEach((N, s) =>
    results.push({ test: 'Taylor-Green: relative error at t = 2', grid: `${N}x4x${N}`, value: errors[s], limit: 0.02 })
  );
  results.push({
    test: 'Taylor-Green: observed spatial order',
    grid: '32 -> 64',
    value: Math.log2(errors[1] / errors[2]),
    limit: 1.9,
    atLeast: true,
  });
}

/**
 * Inviscid flow between walls on a stretched grid. The scheme conserves
 * kinetic energy in space, so the drift is purely the time integrator's and
 * must fall as dt^3. Any indexing or weighting mistake in the convective
 * terms breaks the skew-symmetry and shows up here.
 */
async function testEnergy(device, results) {
  const Nx = 32, Ny = 24, Nz = 16, T = 1.6;
  const grid = `${Nx}x${Ny}x${Nz} tanh`;
  const drifts = [];
  let momentum = 0;
  // Large steps on purpose: at small ones the drift sinks into round-off.
  for (const dt of [0.08, 0.04]) {
    const flow = createChannelFlow(device, {
      Nx, Ny, Nz, Lx: TAU, Lz: TAU, yFaces: tanhFaces(Ny, 1.5), nu: 0,
    });
    flow.setState(fillState(flow, smoothField));
    flow.project();
    const s0 = await flow.readState();
    flow.advance(dt, Math.round(T / dt));
    const s1 = await flow.readState();
    drifts.push(Math.abs(kineticEnergy(flow, s1) - kineticEnergy(flow, s0)) / kineticEnergy(flow, s0));
    momentum = Math.abs(bulkVelocity(flow, s1) - bulkVelocity(flow, s0)) / maxSpeed(s0);
    flow.destroy();
  }
  results.push({ test: 'inviscid: relative energy drift, dt = 0.08', grid, value: drifts[0], limit: 1e-4 });
  results.push({ test: 'inviscid: relative energy drift, dt = 0.04', grid, value: drifts[1], limit: 1e-5 });
  results.push({ test: 'inviscid: order of energy drift in dt', grid, value: Math.log2(drifts[0] / drifts[1]), limit: 2.7, atLeast: true });
  results.push({ test: 'inviscid: drift of streamwise momentum', grid, value: momentum, limit: 1e-5 });
}

/** Steady solution of the discrete wall-normal momentum balance. */
function discretePoiseuille(flow, G, nu) {
  const { Ny, heights: h, faceSpacings: hf } = flow;
  // nu / h_j * ((u_{j+1} - u_j) / hf_{j+1} - (u_j - u_{j-1}) / hf_j) = -G,
  // with ghost values u_{-1} = -u_0 and u_{Ny} = -u_{Ny-1}.
  const a = new Float64Array(Ny), b = new Float64Array(Ny), c = new Float64Array(Ny), d = new Float64Array(Ny);
  for (let j = 0; j < Ny; j++) {
    const lo = nu / (h[j] * hf[j]);
    const up = nu / (h[j] * hf[j + 1]);
    a[j] = j > 0 ? lo : 0;
    c[j] = j < Ny - 1 ? up : 0;
    b[j] = -(lo + up) - (j === 0 ? lo : 0) - (j === Ny - 1 ? up : 0);
    d[j] = -G;
  }
  for (let j = 1; j < Ny; j++) {
    const m = a[j] / b[j - 1];
    b[j] -= m * c[j - 1];
    d[j] -= m * d[j - 1];
  }
  const u = new Float64Array(Ny);
  u[Ny - 1] = d[Ny - 1] / b[Ny - 1];
  for (let j = Ny - 2; j >= 0; j--) u[j] = (d[j] - c[j] * u[j + 1]) / b[j];
  return u;
}

/** Forced laminar flow on a stretched grid stays put, and is near the parabola. */
async function testPoiseuille(device, results) {
  const Nx = 8, Ny = 32, Nz = 8, nu = 0.05, G = 0.1;
  const flow = createChannelFlow(device, {
    Nx, Ny, Nz, Lx: 2, Lz: 2, yFaces: tanhFaces(Ny, 1.5), nu, forcing: G,
  });
  const steady = discretePoiseuille(flow, G, nu);
  const state = new Float32Array(4 * Nx * Ny * Nz);
  for (let j = 0; j < Ny; j++)
    for (let c = 0; c < Nx * Nz; c++) state[4 * (c + Nx * Nz * j)] = steady[j];
  flow.setState(state);
  flow.advance(0.002, 100);
  const got = await flow.readState();
  let drift = 0, parabola = 0;
  const umax = G / (2 * nu);
  for (let j = 0; j < Ny; j++) {
    const y = flow.yCenters[j];
    parabola = Math.max(parabola, Math.abs(steady[j] - umax * (1 - y * y)));
    for (let c = 0; c < Nx * Nz; c++) {
      const o = 4 * (c + Nx * Nz * j);
      drift = Math.max(drift, Math.abs(got[o] - steady[j]), Math.abs(got[o + 1]), Math.abs(got[o + 2]));
    }
  }
  const grid = `${Nx}x${Ny}x${Nz} tanh`;
  results.push({ test: 'Poiseuille: drift from discrete steady state', grid, value: drift / umax, limit: 1e-5 });
  results.push({ test: 'Poiseuille: discrete steady state vs parabola', grid, value: parabola / umax, limit: 5e-3 });
  flow.destroy();
}

/**
 * Flow started from rest by a constant pressure gradient: the classical
 * series solution. Checks the time-accurate wall-normal diffusion, the
 * no-slip walls and the forcing.
 */
async function testStartup(device, results) {
  const nu = 0.5, G = 1, T = 0.5, dt = 0.002;
  const exact = (y) => {
    let u = (G / (2 * nu)) * (1 - y * y);
    for (let n = 0; n < 60; n++) {
      const m = 2 * n + 1;
      u -=
        ((16 * G * (n % 2 ? -1 : 1)) / (nu * Math.PI ** 3 * m ** 3)) *
        Math.cos((m * Math.PI * y) / 2) *
        Math.exp((-m * m * Math.PI * Math.PI * nu * T) / 4);
    }
    return u;
  };
  const errors = [];
  const sizes = [16, 32];
  for (const Ny of sizes) {
    const flow = createChannelFlow(device, {
      Nx: 4, Ny, Nz: 4, Lx: 4, Lz: 4, yFaces: uniformFaces(Ny), nu, forcing: G,
    });
    flow.setState(new Float32Array(4 * 16 * Ny));
    flow.advance(dt, Math.round(T / dt));
    const got = await flow.readState();
    let err = 0;
    for (let j = 0; j < Ny; j++) err = Math.max(err, Math.abs(got[4 * 16 * j] - exact(flow.yCenters[j])));
    errors.push(err / exact(0));
    flow.destroy();
  }
  sizes.forEach((Ny, s) =>
    results.push({ test: 'start-up from rest: relative error at t = 0.5', grid: `4x${Ny}x4`, value: errors[s], limit: 1e-2 })
  );
  results.push({
    test: 'start-up from rest: observed order in y',
    grid: '16 -> 32',
    value: Math.log2(errors[0] / errors[1]),
    limit: 1.8,
    atLeast: true,
  });
}

/** Run the whole suite. Returns rows of { test, grid, value, limit, pass }. */
export async function validateChannelFlow(device) {
  const results = [];
  await testDivergence(device, results);
  await testTaylorGreen(device, results);
  await testEnergy(device, results);
  await testPoiseuille(device, results);
  await testStartup(device, results);
  for (const r of results) {
    r.pass = Number.isFinite(r.value) && (r.atLeast ? r.value >= r.limit : r.value <= r.limit);
  }
  return results;
}
