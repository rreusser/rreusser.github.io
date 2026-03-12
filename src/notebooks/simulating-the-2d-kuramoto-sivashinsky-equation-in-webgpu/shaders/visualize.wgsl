// Visualization Fragment Shader
//
// Renders the spatial domain solution with color mapping.
// - Bilinear interpolation for smooth display at any resolution
// - Clamps values to [range.x, range.y]
// - Maps through smooth ramp function
// - Applies colorscale lookup
// - Supports zoom/pan via viewInverse matrix with periodic wrapping

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

struct VisualizeParams {
  resolution: vec2<u32>,
  contrast: f32,     // multiplier for colorscale mapping
  invert: u32,       // 0 or 1
  domainSize: vec2<f32>, // Lx, Ly for normalizing data coords to UV
}

@group(0) @binding(0) var<storage, read> V: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: VisualizeParams;
@group(0) @binding(2) var colorscale_texture: texture_2d<f32>;
@group(0) @binding(3) var colorscale_sampler: sampler;
@group(0) @binding(4) var<uniform> viewInverse: mat4x4<f32>;

// Smooth ramp function
fn ramp(x: f32) -> f32 {
  let PI = 3.14159265359;
  return 0.5 + atan(PI * (x - 0.5)) / PI;
}

// Sample V buffer with periodic wrapping
fn sampleV(x: i32, y: i32, res: vec2<u32>) -> f32 {
  // Wrap coordinates periodically
  var wx = x % i32(res.x);
  var wy = y % i32(res.y);
  if (wx < 0) { wx += i32(res.x); }
  if (wy < 0) { wy += i32(res.y); }
  let idx = u32(wy) * res.x + u32(wx);
  return V[idx].x;
}

@fragment
fn visualize(input: VertexOutput) -> @location(0) vec4<f32> {
  let resolution = params.resolution;
  let res_f = vec2<f32>(resolution);

  // Transform UV through viewInverse for zoom/pan
  // UV [0,1] -> clip space [-1,1] -> data space [0,Lx]×[0,Ly] via viewInverse -> UV [0,1]
  let clip = vec4<f32>(input.uv * 2.0 - 1.0, 0.0, 1.0);
  let data = viewInverse * clip;

  // Normalize data coordinates to UV [0,1] by dividing by domain size
  let uv_transformed = data.xy / params.domainSize;

  // Convert to pixel coordinates (centered on pixels)
  // UV 0 maps to pixel center 0.5, UV 1 maps to pixel center (N-0.5)
  let pixel_coord = uv_transformed * res_f - vec2<f32>(0.5);

  // Get integer pixel coordinates for the 4 surrounding pixels
  let x0 = i32(floor(pixel_coord.x));
  let y0 = i32(floor(pixel_coord.y));
  let x1 = x0 + 1;
  let y1 = y0 + 1;

  // Get fractional part for interpolation
  let fx = fract(pixel_coord.x);
  let fy = fract(pixel_coord.y);

  // Sample 4 neighboring pixels
  let v00 = sampleV(x0, y0, resolution);
  let v10 = sampleV(x1, y0, resolution);
  let v01 = sampleV(x0, y1, resolution);
  let v11 = sampleV(x1, y1, resolution);

  // Bilinear interpolation
  let value = mix(mix(v00, v10, fx), mix(v01, v11, fx), fy);

  // Clamp to range
  var f = 0.5 + 0.07 * value * params.contrast; //(value - range.x) / (range.y - range.x);

  // Invert if requested
  if (params.invert != 0u) {
    f = 1.0 - f;
  }

  // Apply smooth ramp
  f = ramp(f);

  // Clamp f to [0,1] for texture sampling
  f = clamp(f, 0.0, 1.0);

  // Sample colorscale (1D texture, use v=0.5)
  let color = textureSample(colorscale_texture, colorscale_sampler, vec2<f32>(f, 0.5));

  return vec4<f32>(color.rgb, 1.0);
}
