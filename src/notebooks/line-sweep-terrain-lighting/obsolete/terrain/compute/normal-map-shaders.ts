/**
 * Surface normal computation with Web Mercator (EPSG:3857) physical scaling
 *
 * Computes physically-correct surface normals that account for the distortion
 * inherent in the Web Mercator projection. The mercator scale factor varies
 * with latitude, affecting the physical distance per pixel.
 */

/**
 * Normal map compute shader
 *
 * Outputs:
 * - Red channel: ny component (0.5 + 0.5 * ny)
 * - Blue channel: nx component (0.5 - 0.5 * nx)
 * - Green channel: Reserved for ambient occlusion
 *
 * The normal vector (nx, ny, nz) is computed from elevation gradients,
 * properly scaled for Web Mercator distortion.
 */
export const NORMAL_MAP_SHADER = /* wgsl */ `
override tileSize: u32 = 512;
override tileBuffer: u32 = 1;

struct Uniforms {
  tileX: u32,
  tileY: u32,
  tileZ: u32,
  padding: u32
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> terrainData: array<f32>;
@group(0) @binding(2) var<storage, read_write> outputData: array<vec3<f32>>;

const PI: f32 = 3.14159265359;
const A: f32 = 6378137.0;  // Earth radius
const MAXEXTENT: f32 = 20037508.342789244;

// Get elevation from buffered terrain data
fn getElevation(x: i32, y: i32) -> f32 {
  let w = i32(tileSize + 2u * tileBuffer);
  let idx = (x + i32(tileBuffer)) + (y + i32(tileBuffer)) * w;
  return terrainData[idx];
}

// Compute mercator scale factor for a given tile row
// This accounts for the latitude-dependent distortion in Web Mercator
fn getMercatorScaleFactor(tileY: u32, row: u32, tileZ: u32) -> f32 {
  let dim = f32(1u << tileZ);  // 2^z
  let mercatorY = (f32(tileY) + (f32(row) + 0.5) / f32(tileSize)) / dim;

  // Convert from mercator Y to latitude and compute scale factor
  // mercatorY is in [0, 1], need to convert to [-1, 1] for the calculation
  let mercatorYNorm = mercatorY * 2.0 - 1.0;
  let lat = 2.0 * atan(exp(PI * mercatorYNorm)) - 0.5 * PI;

  return 1.0 / cos(lat);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let x = i32(id.x);
  let y = i32(id.y);

  // Bounds check
  if (x >= i32(tileSize) || y >= i32(tileSize)) {
    return;
  }

  // Compute mercator scale factor for this row
  let mercatorScaleFactor = getMercatorScaleFactor(uniforms.tileY, u32(y), uniforms.tileZ);

  // Physical distance per pixel (dx = dy in this calculation)
  let dx = (MAXEXTENT * 2.0) / (mercatorScaleFactor * f32(tileSize) * f32(1u << uniforms.tileZ));

  // Sample adjacent elevations with bounds clamping
  let xm = max(x - 1, 0);
  let xp = min(x + 1, i32(tileSize) - 1);
  let ym = max(y - 1, 0);
  let yp = min(y + 1, i32(tileSize) - 1);

  let eE = getElevation(xp, y);  // East
  let eW = getElevation(xm, y);  // West
  let eN = getElevation(x, yp);  // North
  let eS = getElevation(x, ym);  // South

  // Compute surface normal via cross product
  // This is the gradient computation, properly scaled for mercator distortion
  var nx = (eW - eE) / (f32(xp - xm) * dx);
  var ny = (eS - eN) / (f32(yp - ym) * dx);
  var nz = 1.0;

  // Normalize
  let nmag = sqrt(nx * nx + ny * ny + nz * nz);
  nx /= nmag;
  ny /= nmag;
  nz /= nmag;

  // Encode normal components
  // Red channel: fy = 0.5 + 0.5 * ny
  // Blue channel: fx = 0.5 - 0.5 * nx
  // Green channel: reserved for AO (set to 0 for now)
  let fx = 0.5 - 0.5 * nx;
  let fy = 0.5 + 0.5 * ny;

  let outIdx = u32(x) + u32(y) * tileSize;
  outputData[outIdx] = vec3<f32>(fy, 0.0, fx);  // R=fy, G=0, B=fx
}
`;

/**
 * Create shader module from WGSL code
 *
 * @param {GPUDevice} device - WebGPU device
 * @param {string} code - WGSL shader code
 * @returns {GPUShaderModule}
 */
export function createShaderModule(device: GPUDevice, code: string): GPUShaderModule {
  return device.createShaderModule({
    code,
    label: 'Normal map shader'
  });
}
