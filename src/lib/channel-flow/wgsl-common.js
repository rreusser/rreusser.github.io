/**
 * WGSL shared by every shader that reads the physical-space state of a
 * channel flow: grid constants and an accessor with periodic wrap and
 * mirrored ghost cells beyond the walls.
 */

/** WGSL grid constants and the stage parameter struct, shared by every shader that reads the state. */
export function gridHeaderWGSL({ Nx, Ny, Nz, dx, dz, wallSign }) {
  return /* wgsl */ `
const NX = ${Nx}u;
const NY = ${Ny}u;
const NZ = ${Nz}u;
const IDX = ${(1 / dx).toExponential(9)};
const IDZ = ${(1 / dz).toExponential(9)};
const WALL = ${wallSign.toFixed(1)};

struct Params {
  a: f32,          // dt * gamma
  b: f32,          // dt * zeta
  nu: f32,
  fx: f32,
  invAlphaDt: f32, // 1 / (dt * (gamma + zeta))
  pad0: f32,
  pad1: f32,
  pad2: f32,
}

// Per-row mesh data: (1 / h_j, 1 / (yc_j - yc_{j-1}), 1 / (yc_{j+1} - yc_j),
// h_{j-1} / (h_{j-1} + h_j)). Beyond a wall the centre spacing is that of the
// mirrored cell.
`;
}

/**
 * WGSL accessor for the velocity buffer `name` with periodic wrap in x and z
 * and mirrored ghost cells beyond the walls. The ghost tangential velocity is
 * WALL times the interior one (-1: no slip, +1: free slip), and the ghost
 * wall-normal velocity is zero, which is also the value on the top wall.
 */
export function stateAccessorWGSL(name) {
  return /* wgsl */ `
fn at(i: i32, j: i32, k: i32) -> vec4f {
  let ii = u32(i + i32(NX)) & (NX - 1u);
  let kk = u32(k + i32(NZ)) & (NZ - 1u);
  let jj = u32(clamp(j, 0, i32(NY) - 1));
  var q = ${name}[ii + NX * (kk + NZ * jj)];
  if (j < 0 || j >= i32(NY)) {
    q = vec4f(WALL * q.x, 0.0, WALL * q.z, q.w);
  }
  return q;
}
`;
}
