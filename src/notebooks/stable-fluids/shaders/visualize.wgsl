// Visualization Shader
// Renders dye field with velocity magnitude overlay

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

struct VisParams {
  resolution: vec2<u32>,
  scale: f32,
  padding: f32,  // Unused (kept for alignment)
  wallThicknessX: f32,
  wallThicknessY: f32,
}

@group(0) @binding(0) var<storage, read> velocity: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> dye: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: VisParams;

fn sampleDye(x: i32, y: i32, N: u32) -> f32 {
  var wx = x % i32(N);
  var wy = y % i32(N);
  if (wx < 0) { wx += i32(N); }
  if (wy < 0) { wy += i32(N); }
  return dye[u32(wy) * N + u32(wx)].x;
}

fn sampleVelocity(x: i32, y: i32, N: u32) -> vec2<f32> {
  var wx = x % i32(N);
  var wy = y % i32(N);
  if (wx < 0) { wx += i32(N); }
  if (wy < 0) { wy += i32(N); }
  let v = velocity[u32(wy) * N + u32(wx)];
  return vec2<f32>(v.x, v.z);
}

@fragment
fn visualize(input: VertexOutput) -> @location(0) vec4<f32> {
  let N = params.resolution.x;
  let Nf = f32(N);

  // UV to physical position (0 to N), then to grid coordinates
  // Cell (i,j) is at physical position (i+0.5, j+0.5)
  let physPos = input.uv * Nf;
  let gridCoord = physPos - vec2<f32>(0.5);

  let x0 = i32(floor(gridCoord.x));
  let y0 = i32(floor(gridCoord.y));
  let x1 = x0 + 1;
  let y1 = y0 + 1;

  let fx = fract(gridCoord.x);
  let fy = fract(gridCoord.y);

  // Sample dye with bilinear interpolation
  let d00 = sampleDye(x0, y0, N);
  let d10 = sampleDye(x1, y0, N);
  let d01 = sampleDye(x0, y1, N);
  let d11 = sampleDye(x1, y1, N);
  let dyeVal = mix(mix(d00, d10, fx), mix(d01, d11, fx), fy);

  // Wall thickness in normalized coords
  let wallSizeX = params.wallThicknessX / Nf;
  let wallSizeY = params.wallThicknessY / Nf;

  // Check if in boundary region
  var inBoundary = false;

  // Left/right walls
  if (params.wallThicknessX > 0.0) {
    if (input.uv.x < wallSizeX || input.uv.x > 1.0 - wallSizeX) {
      inBoundary = true;
    }
  }

  // Top/bottom walls
  if (params.wallThicknessY > 0.0) {
    if (input.uv.y < wallSizeY || input.uv.y > 1.0 - wallSizeY) {
      inBoundary = true;
    }
  }

  // Dark smoke on white background
  let baseColor = vec3<f32>(1.0, 1.0, 0.98);  // Slightly warm white
  let smokeColor = vec3<f32>(0.1, 0.08, 0.05);  // Dark brown-gray smoke
  let boundaryColor = vec3<f32>(0.3, 0.25, 0.2);  // Brown boundary

  var color = mix(baseColor, smokeColor, dyeVal);
  if (inBoundary) {
    color = boundaryColor;
  }

  return vec4<f32>(color, 1.0);
}
