/**
 * Simplified LSAO shaders for single tile (no parent data)
 *
 * This is a simpler version of LSAO that processes a single tile without
 * requiring parent tile data for boundary initialization. Good for testing
 * and understanding the core algorithm.
 */

/**
 * Simple LSAO compute shader (single tile, no parent buffer)
 *
 * Implements line-sweep ambient occlusion in 4 cardinal directions.
 * Each GPU invocation processes one complete scanline (row or column).
 * Maintains a convex hull stack to track horizon visibility.
 */
export const LSAO_SIMPLE_SHADER = /* wgsl */ `
override tileSize = 512u;
override tileBuffer = 1u;
override workgroupSize = 128;

struct UniformStruct {
  tilesize: vec2<u32>,
  step: vec2<i32>,
  buffer: i32,
  pixelSize: f32,
  normalization: f32,
  padding1: f32,
  padding2: f32,
  padding3: f32
}

@binding(0) @group(0) var<uniform> uniforms: UniformStruct;
@binding(1) @group(0) var<storage, read> terrainData: array<f32>;
@binding(2) @group(0) var<storage, read_write> outputData: array<f32>;

fn unbufferedIndex(ij: vec2<i32>) -> u32 {
  return (u32(ij.x) % tileSize) + u32(ij.y) * tileSize;
}

fn bufferedIndex(ij: vec2<i32>) -> u32 {
  let w = tileSize + 2u * tileBuffer;
  let ijbuf = vec2<u32>(ij + i32(tileBuffer));
  return (ijbuf.x % w) + (ijbuf.y) * w;
}

@compute @workgroup_size(workgroupSize)
fn main(@builtin(global_invocation_id) coord: vec3u) {
  // Each invocation processes one scanline
  var ij = vec2<i32>(i32(coord.x), i32(coord.x));

  // Determine starting position based on sweep direction
  if (uniforms.step.y == 0) {
    // Horizontal sweep (east or west)
    ij.x = select(0i, i32(tileSize - 1u), uniforms.step.x < 0i);
  } else if (uniforms.step.x == 0) {
    // Vertical sweep (north or south)
    ij.y = select(0i, i32(tileSize - 1u), uniforms.step.y < 0i);
  }

  // Initialize convex hull stack with point just before starting edge
  var hull: array<vec3<f32>, 64>;
  hull[0] = vec3<f32>(vec2<f32>(ij - uniforms.step), terrainData[bufferedIndex(ij - uniforms.step)]);
  var hullPtr = 0u;

  // Sweep across the scanline
  for (var i = 0u; i < tileSize; i = i + 1u) {
    let uidx = unbufferedIndex(ij);
    let bidx = bufferedIndex(ij);
    let z = terrainData[bidx];
    let ijz = vec3<f32>(vec2<f32>(ij), z);

    // Compute visibility metric for current point
    var dijz = hull[hullPtr] - ijz;
    var s0 = dijz.z * dijz.z / dot(dijz, dijz);
    s0 = select(-s0, s0, dijz.z > 0.0);

    // Pop hull points that are occluded by current point
    while(hullPtr > 0u) {
      dijz = hull[hullPtr - 1u] - ijz;
      var s1 = dijz.z * dijz.z / dot(dijz, dijz);
      s1 = select(-s1, s1, dijz.z > 0.0);

      if (s0 > s1) { break; }

      s0 = s1;
      hullPtr -= 1u;
    }

    // Compute AO contribution from horizon
    dijz = hull[hullPtr] - ijz;
    dijz = vec3(dijz.xy, dijz.z / uniforms.pixelSize);
    outputData[uidx] = outputData[uidx] + uniforms.normalization * exp(-dijz.z / length(dijz));

    // Push current point onto hull
    // Fail silently but gracefully if we overflow the stack
    hullPtr = min(hullPtr + 1u, 63u);
    hull[hullPtr] = ijz;

    ij = ij + uniforms.step;
  }
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
    label: 'Simple LSAO shader'
  });
}
