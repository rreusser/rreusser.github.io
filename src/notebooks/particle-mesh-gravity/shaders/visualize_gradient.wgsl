// Visualize gradient shader - adaptive linear contouring with direction coloring
// Based on adaptive-contouring-in-fragment-shaders for magnitude (linear mode)
// PRECISION_ENABLE

alias GradientVec = vec4<FLOAT_TYPE>;

struct GradientVisParams {
  gridSize: u32,
  scale: f32,        // Opacity control
  canvasSize: f32,   // Canvas size in pixels
  pixelRatio: f32,   // Device pixel ratio
  viewMin: vec2<f32>,  // View bounds for zoom/pan
  viewMax: vec2<f32>,
}

const PI: f32 = 3.141592653589793;

// Contouring parameters
const OCTAVES: i32 = 8;
const OCTAVES_F: f32 = 8.0;
const DIVISIONS: f32 = 2.0;        // Divisions per octave (more = denser contours)
const MIN_SPACING: f32 = 2.0;      // Minimum spacing in pixels (smaller = denser)
const CONTRAST_POWER: f32 = 1.0;   // Shading contrast (higher = more contrast)
const ANTIALIAS_WIDTH: f32 = 0.5;  // Antialiasing width in pixels

@group(0) @binding(0) var<storage, read> gradient: array<GradientVec>;
@group(0) @binding(1) var<storage, read> potential: array<vec2<f32>>;  // After inverse FFT, .x is phi
@group(0) @binding(2) var<uniform> params: GradientVisParams;

// Rainbow colorscale for direction
fn rainbow(p: vec2<f32>) -> vec3<f32> {
  let theta = p.x * (2.0 * PI);
  let c = cos(theta);
  let s = sin(theta);

  let m1 = mat3x3<f32>(
    vec3<f32>(0.5230851, 0.56637411, 0.46725319),
    vec3<f32>(0.12769652, 0.14082407, 0.13691271),
    vec3<f32>(-0.25934743, -0.12121582, 0.2348705)
  );
  let m2 = mat3x3<f32>(
    vec3<f32>(0.3555664, -0.11472876, -0.01250831),
    vec3<f32>(0.15243126, -0.03668075, 0.0765231),
    vec3<f32>(-0.00192128, -0.01350681, -0.0036526)
  );

  let v1 = vec3<f32>(1.0, p.y * 2.0 - 1.0, s);
  let v2 = vec3<f32>(c, s * c, c * c - s * s);

  return m1 * v1 + m2 * v2;
}

// Contrast function for smooth shading transitions
fn contrastFunction(x: f32, power: f32) -> f32 {
  let y = 2.0 * x - 1.0;
  return 0.5 + 0.5 * pow(abs(y), power) * sign(y);
}

// Stable hypot
fn hypot2(z: vec2<f32>) -> f32 {
  let x = abs(z.x);
  let y = abs(z.y);
  let t = min(x, y);
  let m = max(x, y);
  if (m == 0.0) { return 0.0; }
  let r = t / m;
  return m * sqrt(1.0 + r * r);
}

// Linear adaptive shaded contouring (not log-magnitude)
// f: the scalar value to contour (gradient magnitude)
// screenSpaceGrad: how fast f changes per pixel
fn shadedLinearContours(f: f32, screenSpaceGrad: f32, minSpacing: f32) -> f32 {
  // Select octave based on local gradient
  let localOctave = log2(max(screenSpaceGrad * minSpacing, 1e-10)) / log2(DIVISIONS);
  let contourSpacing = pow(DIVISIONS, ceil(localOctave));

  // Plot variable: the value divided by contour spacing (linear, not log)
  var plotVar = f / contourSpacing;
  var widthScale = contourSpacing / max(screenSpaceGrad, 1e-10);

  var contourSum = 0.0;
  for (var i = 0; i < OCTAVES; i++) {
    // Weight fades in smallest octave, fades out largest
    let t = f32(i + 1) - fract(localOctave);
    let weight = smoothstep(0.0, 1.0, t) * smoothstep(OCTAVES_F, OCTAVES_F - 1.0, t);

    // Shading with antialiasing at the discontinuity
    let y = fract(plotVar);
    let shading = contrastFunction(y, CONTRAST_POWER);
    let antialias = (1.0 - y) * 0.5 * widthScale / ANTIALIAS_WIDTH;
    contourSum += weight * min(shading, antialias);

    // Rescale for next octave
    widthScale *= DIVISIONS;
    plotVar /= DIVISIONS;
  }

  return contourSum / OCTAVES_F;
}

@fragment
fn visualize_gradient(@location(0) rawUv: vec2<f32>) -> @location(0) vec4<f32> {
  // Transform UV by view bounds (for zoom/pan), then wrap to [0,1] for periodic tiling
  let uv = fract(params.viewMin + rawUv * (params.viewMax - params.viewMin));

  let N = params.gridSize;
  let Nf = f32(N);

  // Grid coordinates (shifted by 0.5 to sample at cell centers)
  let gx = uv.x * Nf - 0.5;
  let gy = uv.y * Nf - 0.5;

  // Cell indices for bilinear interpolation
  let i0 = u32(floor(gx) + Nf) % N;
  let j0 = u32(floor(gy) + Nf) % N;
  let i1 = (i0 + 1u) % N;
  let j1 = (j0 + 1u) % N;

  let fx = fract(gx);
  let fy = fract(gy);

  // Sample 4 corners (real parts: .x for gx, .z for gy)
  let g00 = vec4<f32>(gradient[j0 * N + i0]);
  let g10 = vec4<f32>(gradient[j0 * N + i1]);
  let g01 = vec4<f32>(gradient[j1 * N + i0]);
  let g11 = vec4<f32>(gradient[j1 * N + i1]);

  // Bilinear interpolation of gradient
  let gradX = (1.0 - fx) * (1.0 - fy) * g00.x
            + fx * (1.0 - fy) * g10.x
            + (1.0 - fx) * fy * g01.x
            + fx * fy * g11.x;

  let gradY = (1.0 - fx) * (1.0 - fy) * g00.z
            + fx * (1.0 - fy) * g10.z
            + (1.0 - fx) * fy * g01.z
            + fx * fy * g11.z;

  // Gradient magnitude and direction
  let mag = hypot2(vec2<f32>(gradX, gradY));
  let arg = atan2(gradY, gradX);

  // Estimate Hessian from bilinear samples (derivative of gradient in grid space)
  // Cell spacing is 1/N in domain units, so multiply difference by N to get domain derivative
  let dgx_dx = ((1.0 - fy) * (g10.x - g00.x) + fy * (g11.x - g01.x)) * Nf;
  let dgx_dy = ((1.0 - fx) * (g01.x - g00.x) + fx * (g11.x - g10.x)) * Nf;
  let dgy_dx = ((1.0 - fy) * (g10.z - g00.z) + fy * (g11.z - g01.z)) * Nf;
  let dgy_dy = ((1.0 - fx) * (g01.z - g00.z) + fx * (g11.z - g10.z)) * Nf;

  // Derivative of magnitude in domain space: d|g|/dx = (gx * dgx/dx + gy * dgy/dx) / |g|
  let magRecip = 1.0 / max(mag, 1e-20);
  let dMag_dx = (gradX * dgx_dx + gradY * dgy_dx) * magRecip;
  let dMag_dy = (gradX * dgx_dy + gradY * dgy_dy) * magRecip;

  // Convert from domain space to screen space (per pixel)
  // Visible domain spans (viewMax - viewMin) and maps to canvasSize pixels
  let viewScale = params.viewMax - params.viewMin;
  let domainToScreen = viewScale / params.canvasSize;
  let screenSpaceGrad = hypot2(vec2<f32>(dMag_dx, dMag_dy) * domainToScreen);

  // Compute shaded contours of the magnitude (linear mode)
  // The adaptive algorithm selects octaves based on screenSpaceGrad, handling any scale
  let minSpacing = MIN_SPACING * params.pixelRatio;
  let shading = shadedLinearContours(mag, screenSpaceGrad, minSpacing);

  // Direction mapped to hue [0, 1]
  let hue = arg / (2.0 * PI) + 0.5;

  // Color: rainbow hue based on direction, brightness based on magnitude shading
  var color = rainbow(vec2<f32>(hue - 0.25, 0.2 + 0.8 * shading));

  // Sample potential with bilinear interpolation
  let phi00 = potential[j0 * N + i0].x;
  let phi10 = potential[j0 * N + i1].x;
  let phi01 = potential[j1 * N + i0].x;
  let phi11 = potential[j1 * N + i1].x;
  let phi = (1.0 - fx) * (1.0 - fy) * phi00
          + fx * (1.0 - fy) * phi10
          + (1.0 - fx) * fy * phi01
          + fx * fy * phi11;

  // Fade to black for high potential regions (far from mass concentrations)
  // Since DC component is zeroed, potential has zero mean: half positive, half negative
  // Positive = high potential = far from mass = fade to black
  let fadeFactor = smoothstep(1.0, -0.5, phi);  // Fade where phi > 0
  color *= fadeFactor;

  // Apply opacity from scale parameter
  return vec4<f32>(color, params.scale);
}
