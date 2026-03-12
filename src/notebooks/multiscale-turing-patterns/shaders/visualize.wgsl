// Visualization Fragment Shader
//
// Renders the multiscale Turing pattern with color from the solution buffer.
// Supports zoom/pan via viewInverse matrix with periodic wrapping.

enable f16;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

struct VisualizeParams {
  resolution: vec2<u32>,
  contrast: f32,
  brightness: f32,
  colorStrength: f32,
  gamma: f32,
  invert: u32,
  domainScale: f32,  // N / referenceN - tiles the pattern to show larger domain at higher res
  domainSize: vec2<f32>,
}

@group(0) @binding(0) var<storage, read> solution: array<vec4<f16>>;
@group(0) @binding(1) var<uniform> params: VisualizeParams;
@group(0) @binding(2) var<uniform> viewInverse: mat4x4<f32>;

// Sample solution buffer with periodic wrapping using bilinear interpolation
fn sampleSolution(coord: vec2<f32>, res: vec2<u32>) -> vec4<f32> {
  let res_f = vec2<f32>(res);

  // Get integer pixel coordinates for the 4 surrounding pixels
  let x0 = i32(floor(coord.x));
  let y0 = i32(floor(coord.y));
  let x1 = x0 + 1;
  let y1 = y0 + 1;

  // Get fractional part for interpolation
  let fx = fract(coord.x);
  let fy = fract(coord.y);

  // Wrap coordinates periodically
  var wx0 = x0 % i32(res.x);
  var wy0 = y0 % i32(res.y);
  var wx1 = x1 % i32(res.x);
  var wy1 = y1 % i32(res.y);
  if (wx0 < 0) { wx0 += i32(res.x); }
  if (wy0 < 0) { wy0 += i32(res.y); }
  if (wx1 < 0) { wx1 += i32(res.x); }
  if (wy1 < 0) { wy1 += i32(res.y); }

  // Sample 4 neighboring pixels (f16 -> f32)
  let v00 = vec4<f32>(solution[u32(wy0) * res.x + u32(wx0)]);
  let v10 = vec4<f32>(solution[u32(wy0) * res.x + u32(wx1)]);
  let v01 = vec4<f32>(solution[u32(wy1) * res.x + u32(wx0)]);
  let v11 = vec4<f32>(solution[u32(wy1) * res.x + u32(wx1)]);

  // Bilinear interpolation
  return mix(mix(v00, v10, fx), mix(v01, v11, fx), fy);
}

@fragment
fn visualize(input: VertexOutput) -> @location(0) vec4<f32> {
  let resolution = params.resolution;
  let res_f = vec2<f32>(resolution);

  // Transform UV through viewInverse for zoom/pan
  let clip = vec4<f32>(input.uv * 2.0 - 1.0, 0.0, 1.0);
  let data = viewInverse * clip;

  // Normalize data coordinates to UV [0,1] by dividing by domain size
  let uv_transformed = data.xy / params.domainSize;

  // Convert to pixel coordinates (centered on pixels)
  // Divide by domainScale so larger grids show the pattern at the same visual size
  let pixel_coord = uv_transformed * res_f / params.domainScale - vec2<f32>(0.5);

  // Sample solution with bilinear interpolation
  let sample = sampleSolution(pixel_coord, resolution);

  // Get color from rgb and value from alpha
  let color = sample.rgb;
  var f = sample.a;

  // Invert raw field value if requested (before any processing)
  if (params.invert != 0u) {
    f = -f;
  }

  // Convert contrast param (0-1) to a multiplier (0 to infinity)
  // At 0: factor=0 (flat gray), at 0.5: factor=1 (unity), at 1: factor=infinity
  let contrast_factor = params.contrast / max(1.0 - params.contrast, 0.001);

  // Apply contrast to the raw field value (centered around 0)
  // Then add brightness offset before tone mapping
  let contrasted = f * contrast_factor + params.brightness;

  // Tone map using atan: smoothly maps (-∞, +∞) to (0, 1)
  // This gives nice gradual transitions in highlights and shadows
  let PI = 3.14159265359;
  var value = 0.5 + atan(contrasted) / PI;

  // Apply gamma correction (artistic control)
  value = pow(value, 1.0 / params.gamma);

  // Blend between grayscale and color based on colorStrength
  // Extremes (dark/bright) fade to grayscale, mid-tones show full color

  // Grayscale base (could use a colormap like "bone", but plain grayscale works)
  let grayscale = vec3<f32>(value);

  // Colored version: color scaled by brightness
  let colored_base = value * color;

  // Blend weight: 0 at midpoint (f=0.5), 1 at extremes (f=0 or f=1)
  // This makes mid-tones show color, extremes fade to grayscale
  let blend_weight = (value - 0.5) * (value - 0.5) * 4.0;

  // Mix between colored (at midtones) and grayscale (at extremes)
  let colored = mix(colored_base, grayscale, blend_weight);

  let finalColor = mix(grayscale, colored, params.colorStrength);

  return vec4<f32>(finalColor, 1.0);
}
