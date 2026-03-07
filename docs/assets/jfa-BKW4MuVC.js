const e=`@group(0) @binding(0) var srcTexture: texture_2d<u32>;
@group(0) @binding(1) var dstTexture: texture_storage_2d<rgba32uint, write>;

struct Uniforms {
  resolution: vec2f,
  stepSize: f32,
  _padding: f32,
}
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let coord = vec2i(gid.xy);
  let resolution = vec2i(uniforms.resolution);

  if (coord.x >= resolution.x || coord.y >= resolution.y) { return; }

  let stepSize = i32(uniforms.stepSize);
  let invRes = 1.0 / max(uniforms.resolution.x, uniforms.resolution.y);

  var bestSeed = vec4u(0u);
  var bestDist = 1e10;

  for (var i = -1; i <= 1; i++) {
    for (var j = -1; j <= 1; j++) {
      let sampleCoord = coord + vec2i(i, j) * stepSize;

      if (sampleCoord.x < 0 || sampleCoord.x >= resolution.x ||
          sampleCoord.y < 0 || sampleCoord.y >= resolution.y) {
        continue;
      }

      let seed = textureLoad(srcTexture, sampleCoord, 0);

      if (seed.x == 0u && seed.y == 0u) { continue; }

      let seedPos = vec2f(f32(seed.x - 1u), f32(seed.y - 1u));
      let currentPos = vec2f(gid.xy);

      let dxy = (seedPos - currentPos) * invRes;
      let dist = dot(dxy, dxy);

      if (dist < bestDist) {
        bestDist = dist;
        bestSeed = seed;
      }
    }
  }

  textureStore(dstTexture, coord, bestSeed);
}
`;export{e as default};
