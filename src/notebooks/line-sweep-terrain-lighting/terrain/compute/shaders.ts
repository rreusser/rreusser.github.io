/**
 * WGSL shaders for terrain lighting computation
 */

/**
 * Simple directional lighting shader using surface normals
 *
 * Computes surface normals from elevation data using central differences,
 * then applies a simple directional light to produce lighting values.
 *
 * The shader expects terrain data in a buffered layout:
 * - Core tile size (e.g., 512x512)
 * - Plus buffer pixels on each edge (e.g., 1 pixel)
 * - Total buffer size: (tileSize + 2*buffer)²
 *
 * Input:
 * - terrainData: Buffered elevation values (Float32Array)
 * - uniforms: Tile size and pixel scale
 *
 * Output:
 * - outputData: Lighting values [0,1] for each pixel
 */
export const LIGHTING_SHADER = /* wgsl */ `
override tileSize: u32 = 512;
override tileBuffer: u32 = 1;

struct Uniforms {
  tileSizeX: u32,
  tileSizeY: u32,
  pixelSize: f32,
  padding: f32
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> terrainData: array<f32>;
@group(0) @binding(2) var<storage, read_write> outputData: array<f32>;

// Helper to read elevation from buffered terrain data
// Coordinates are in unbuffered space [0, tileSize)
fn getElevation(x: i32, y: i32) -> f32 {
  let w = i32(tileSize + 2u * tileBuffer);
  let idx = (x + i32(tileBuffer)) + (y + i32(tileBuffer)) * w;
  return terrainData[idx];
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let x = i32(id.x);
  let y = i32(id.y);

  // Bounds check
  if (x >= i32(tileSize) || y >= i32(tileSize)) {
    return;
  }

  // Compute surface normal using central differences
  // Gradient in x direction
  let dz_dx = (getElevation(x + 1, y) - getElevation(x - 1, y)) / (2.0 * uniforms.pixelSize);

  // Gradient in y direction
  let dz_dy = (getElevation(x, y + 1) - getElevation(x, y - 1)) / (2.0 * uniforms.pixelSize);

  // Surface normal: cross product of tangent vectors
  // Tangent in x: (pixelSize, 0, dz/dx * pixelSize) ≈ (1, 0, dz/dx)
  // Tangent in y: (0, pixelSize, dz/dy * pixelSize) ≈ (0, 1, dz/dy)
  // Normal = (1,0,dz/dx) × (0,1,dz/dy) = (-dz/dx, -dz/dy, 1)
  let normal = normalize(vec3<f32>(-dz_dx, -dz_dy, 1.0));

  // Directional light from northwest, 45° elevation
  // Direction: normalize(1, 1, 1) points toward NE and up
  let lightDir = normalize(vec3<f32>(1.0, 1.0, 1.0));

  // Lambertian diffuse lighting: max(N · L, 0)
  let ndotl = max(dot(normal, lightDir), 0.0);

  // Add ambient term so dark areas aren't completely black
  let ambient = 0.2;
  let lighting = ambient + (1.0 - ambient) * ndotl;

  // Write output
  let outIdx = u32(x) + u32(y) * tileSize;
  outputData[outIdx] = lighting;
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
    label: 'Terrain lighting shader'
  });
}
