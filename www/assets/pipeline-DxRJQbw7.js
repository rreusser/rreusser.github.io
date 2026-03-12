import{createFFTPipelines as U}from"./fft-Chkx7JT6.js";const G=`// Initialize Shader
//
// Creates random initial conditions for multiscale Turing patterns.
// Generates uniform random noise in [-1, 1] range.

enable f16;

struct InitializeParams {
  resolution: vec2<u32>,
  seed: u32,
  padding: u32,
}

@group(0) @binding(0) var<storage, read_write> output: array<vec4<f16>>;
@group(0) @binding(1) var<uniform> params: InitializeParams;

// PCG random number generator
fn pcg(seed: u32) -> u32 {
  let state = seed * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

// Random float in [0, 1]
fn random(seed: u32) -> f32 {
  return f32(pcg(seed)) / 4294967295.0;
}

@compute @workgroup_size(16, 16, 1)
fn initialize(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;

  // Create unique seed per pixel
  let pixel_seed = params.seed + idx * 1234567u;

  // Generate random value in [0, 1] - matching original implementation
  // which sets all channels (rgb and f) to the same random value
  let f = random(pixel_seed);

  // Store as (r, g, b, f) where all are set to same random value
  // Convert f32 computation result to f16 for storage
  output[idx] = vec4<f16>(vec4<f32>(f, f, f, f));
}
`,T=`// Extract Shader
//
// Extracts the scalar field value from the solution buffer
// and packs it into a complex number format for FFT.

enable f16;

struct ExtractParams {
  resolution: vec2<u32>,
  padding: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> solution: array<vec4<f16>>;
@group(0) @binding(1) var<storage, read_write> output: array<vec2<f16>>;
@group(0) @binding(2) var<uniform> params: ExtractParams;

@compute @workgroup_size(16, 16, 1)
fn extract(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;

  // Extract the scalar field value (alpha channel)
  let f = f32(solution[idx].a);

  // Pack as complex number (real=f, imag=0)
  output[idx] = vec2<f16>(vec2<f32>(f, 0.0));
}
`,I=`// Convolve Shader
//
// Multiplies the FFT of the scalar field by analytical kernels
// (Gaussian or Circular/Bessel) to compute activator and inhibitor convolutions.
// Processes two scales at a time, outputting vec4 for each scale pair.

enable f16;

struct ConvolveParams {
  resolution: vec2<u32>,
  // Four radii: [activator1, inhibitor1, activator2, inhibitor2]
  radii: vec4<f32>,
  // Four kernel types: [type1, type1, type2, type2] (0=gaussian, 1=circular)
  types: vec4<u32>,
}

@group(0) @binding(0) var<storage, read> fhat: array<vec2<f16>>;
@group(0) @binding(1) var<storage, read_write> output: array<vec4<f16>>;
@group(0) @binding(2) var<uniform> params: ConvolveParams;

const PI: f32 = 3.14159265358979323846;
const SQRT_PI: f32 = 1.7724538509055159;

// Bessel J1 constants from stdlib
const BJ1_X1: f32 = 3.8317059702075123156e+00;
const BJ1_X2: f32 = 7.0155866698156187535e+00;
const BJ1_X11: f32 = 9.810e+02;
const BJ1_X12: f32 = -3.2527979248768438556e-04;
const BJ1_X21: f32 = 1.7960e+03;
const BJ1_X22: f32 = -3.8330184381246462950e-05;

// Gaussian kernel in frequency domain
// Matching original: exp(-2.0 * (0.25 * kr)^2) = exp(-0.125 * kr^2)
fn gaussian_kernel(kmag: f32, r: f32) -> f32 {
  let kr = kmag * r;
  let c = 0.25 * kr;
  return exp(-2.0 * c * c);
}

// Bessel J1 helper: polyS for large argument asymptotic
fn polyS(x_in: f32) -> f32 {
  var x = x_in;
  var s1: f32;
  var s2: f32;
  if (x == 0.0) {
    return 0.046875;
  }
  let ax = abs(x);
  if (ax <= 1.0) {
    s1 = 33220.913409857225 + (x * (85145.1606753357 + (x * (66178.83658127084 + (x * (18494.262873223866 + (x * (1706.375429020768 + (x * (35.26513384663603 + (x * 0.0)))))))))));
    s2 = 708712.8194102874 + (x * (1819458.0422439973 + (x * (1419460.669603721 + (x * (400294.43582266977 + (x * (37890.2297457722 + (x * (863.8367769604992 + (x * 1.0)))))))))));
  } else {
    x = 1.0 / x;
    s1 = 0.0 + (x * (35.26513384663603 + (x * (1706.375429020768 + (x * (18494.262873223866 + (x * (66178.83658127084 + (x * (85145.1606753357 + (x * 33220.913409857225)))))))))));
    s2 = 1.0 + (x * (863.8367769604992 + (x * (37890.2297457722 + (x * (400294.43582266977 + (x * (1419460.669603721 + (x * (1819458.0422439973 + (x * 708712.8194102874)))))))))));
  }
  return s1 / s2;
}

// Bessel J1 helper: polyC for large argument asymptotic
fn polyC(x_in: f32) -> f32 {
  var x = x_in;
  var s1: f32;
  var s2: f32;
  if (x == 0.0) {
    return 1.0;
  }
  let ax = abs(x);
  if (ax <= 1.0) {
    s1 = -4435757.816794128 + (x * (-9942246.505077641 + (x * (-6603373.248364939 + (x * (-1523529.3511811374 + (x * (-109824.05543459347 + (x * (-1611.6166443246102 + (x * 0.0)))))))))));
    s2 = -4435757.816794128 + (x * (-9934124.389934586 + (x * (-6585339.4797230875 + (x * (-1511809.5066341609 + (x * (-107263.8599110382 + (x * (-1455.0094401904962 + (x * 1.0)))))))))));
  } else {
    x = 1.0 / x;
    s1 = 0.0 + (x * (-1611.6166443246102 + (x * (-109824.05543459347 + (x * (-1523529.3511811374 + (x * (-6603373.248364939 + (x * (-9942246.505077641 + (x * -4435757.816794128)))))))))));
    s2 = 1.0 + (x * (-1455.0094401904962 + (x * (-107263.8599110382 + (x * (-1511809.5066341609 + (x * (-6585339.4797230875 + (x * (-9934124.389934586 + (x * -4435757.816794128)))))))))));
  }
  return s1 / s2;
}

// Bessel J1 helper: poly1 for small argument (w <= 4)
fn poly1(x_in: f32) -> f32 {
  var x = x_in;
  var s1: f32;
  var s2: f32;
  if (x == 0.0) {
    return -0.03405537391318949;
  }
  let ax = abs(x);
  if (ax <= 1.0) {
    s1 = -142585098013.66644 + (x * (6678104126.14924 + (x * (-115486967.64841276 + (x * (980629.0409895825 + (x * (-4461.579298277507 + (x * (10.650724020080236 + (x * -0.010767857011487301)))))))))));
    s2 = 4186860446082.0176 + (x * (42091902282.58013 + (x * (202283751.40097034 + (x * (591176.1449417479 + (x * (1074.227223951738 + (x * (1.0 + (x * 0.0)))))))))));
  } else {
    x = 1.0 / x;
    s1 = -0.010767857011487301 + (x * (10.650724020080236 + (x * (-4461.579298277507 + (x * (980629.0409895825 + (x * (-115486967.64841276 + (x * (6678104126.14924 + (x * -142585098013.66644)))))))))));
    s2 = 0.0 + (x * (1.0 + (x * (1074.227223951738 + (x * (591176.1449417479 + (x * (202283751.40097034 + (x * (42091902282.58013 + (x * 4186860446082.0176)))))))))));
  }
  return s1 / s2;
}

// Bessel J1 helper: poly2 for medium argument (4 < w <= 8)
fn poly2(x_in: f32) -> f32 {
  var x = x_in;
  var s1: f32;
  var s2: f32;
  if (x == 0.0) {
    return -0.010158790774176108;
  }
  let ax = abs(x);
  if (ax <= 1.0) {
    s1 = -17527881995806512.0 + (x * (1660853173129901.8 + (x * (-36658018905416.664 + (x * (355806656709.1062 + (x * (-1811393126.9860668 + (x * (5079326.614801118 + (x * (-7502.334222078161 + (x * 4.6179191852758255)))))))))))));
    s2 = 1725390588844768000.0 + (x * (17128800897135812.0 + (x * (84899346165481.42 + (x * (276227772862.44086 + (x * (648725028.9959639 + (x * (1126712.5065029138 + (x * (1388.6978985861358 + (x * 1.0)))))))))))));
  } else {
    x = 1.0 / x;
    s1 = 4.6179191852758255 + (x * (-7502.334222078161 + (x * (5079326.614801118 + (x * (-1811393126.9860668 + (x * (355806656709.1062 + (x * (-36658018905416.664 + (x * (1660853173129901.8 + (x * -17527881995806512.0)))))))))))));
    s2 = 1.0 + (x * (1388.6978985861358 + (x * (1126712.5065029138 + (x * (648725028.9959639 + (x * (276227772862.44086 + (x * (84899346165481.42 + (x * (17128800897135812.0 + (x * 1725390588844768000.0)))))))))))));
  }
  return s1 / s2;
}

// Bessel J1 implementation from stdlib
// Source: https://github.com/stdlib-js/stdlib/tree/develop/lib/node_modules/%40stdlib/math/base/special
fn bessel_j1(x: f32) -> f32 {
  let w = abs(x);
  var value: f32;

  if (w <= 4.0) {
    let y = x * x;
    let r = poly1(y);
    let f = w * (w + BJ1_X1) * ((w - (BJ1_X11 / 256.0)) - BJ1_X12);
    value = f * r;
  } else if (w <= 8.0) {
    let y = x * x;
    let r = poly2(y);
    let f = w * (w + BJ1_X2) * ((w - (BJ1_X21 / 256.0)) - BJ1_X22);
    value = f * r;
  } else {
    let y = 8.0 / w;
    let y2 = y * y;
    let rc = polyC(y2);
    let rs = polyS(y2);
    let f = 1.0 / (sqrt(w) * SQRT_PI);
    let sc = vec2<f32>(sin(w), cos(w));
    value = f * ((rc * (sc.x - sc.y)) + ((y * rs) * (sc.x + sc.y)));
  }

  if (x < 0.0) {
    value = -value;
  }
  return value;
}

// Circular (disk) kernel in frequency domain: J1(k*r) / (k*r)
// Matching original implementation
fn disk_kernel(kmag: f32, r: f32) -> f32 {
  let kr = kmag * r;
  if (kr < 1e-8) {
    return 1.0;  // Limit as kr -> 0
  }
  return bessel_j1(kr) / kr;
}

// Compute wavenumber from grid coordinates
fn wavenumber(coord: vec2<u32>, resolution: vec2<u32>) -> vec2<f32> {
  let res_f = vec2<f32>(resolution);

  // FFT frequency indices (centered at 0)
  var kx = f32(coord.x);
  var ky = f32(coord.y);
  if (kx > res_f.x * 0.5) { kx -= res_f.x; }
  if (ky > res_f.y * 0.5) { ky -= res_f.y; }

  // Scale to wavenumber (2*pi*k/N)
  return vec2<f32>(kx, ky) * 2.0 * PI / res_f;
}

@compute @workgroup_size(16, 16, 1)
fn convolve(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;

  // Compute wavenumber magnitude
  let k = wavenumber(vec2<u32>(x, y), resolution);
  let kmag = length(k);

  // Get radii for this scale pair
  let r = params.radii;

  // Compute 4 kernel values based on types
  var kernels: vec4<f32>;
  if (params.types.x == 0u) {
    kernels.x = gaussian_kernel(kmag, r.x);  // Activator 1
    kernels.y = gaussian_kernel(kmag, r.y);  // Inhibitor 1
  } else {
    kernels.x = disk_kernel(kmag, r.x);
    kernels.y = disk_kernel(kmag, r.y);
  }
  if (params.types.z == 0u) {
    kernels.z = gaussian_kernel(kmag, r.z);  // Activator 2
    kernels.w = gaussian_kernel(kmag, r.w);  // Inhibitor 2
  } else {
    kernels.z = disk_kernel(kmag, r.z);
    kernels.w = disk_kernel(kmag, r.w);
  }

  // Get complex FFT value (re, im) - convert f16 to f32 for computation
  let f = vec2<f32>(fhat[idx]);

  // Use the complex multiplication trick from the original:
  // We treat (activator + i*inhibitor) as a complex "kernel" and multiply:
  //   fhat * (act + i*inh) = (fhat_re*act - fhat_im*inh) + i*(fhat_re*inh + fhat_im*act)
  //
  // After inverse FFT, the real part gives conv(f, act) and the imag part gives conv(f, inh)!
  // This allows us to compute 4 convolutions (2 pairs) with 2 complex numbers stored in vec4.

  // Compute complex multiplications: fhat * (act1 + i*inh1) and fhat * (act2 + i*inh2)
  // kernels = (act1, inh1, act2, inh2)
  // Output packed as (re1, im1, re2, im2) - two contiguous complex numbers for vec4 FFT
  let result = vec4<f32>(
    f.x * kernels.x - f.y * kernels.y,  // Re(fhat * (act1 + i*inh1)) = re*act1 - im*inh1
    f.x * kernels.y + f.y * kernels.x,  // Im(fhat * (act1 + i*inh1)) = re*inh1 + im*act1
    f.x * kernels.z - f.y * kernels.w,  // Re(fhat * (act2 + i*inh2)) = re*act2 - im*inh2
    f.x * kernels.w + f.y * kernels.z   // Im(fhat * (act2 + i*inh2)) = re*inh2 + im*act2
  );

  output[idx] = vec4<f16>(result);
}
`,M=`// Update Shader
//
// Computes the multiscale Turing pattern update step.
// For each pixel:
// 1. Compute variation = |activator - inhibitor| for each scale (with symmetry averaging)
// 2. Select scale with minimum variation (soft or hard selection)
// 3. Step the solution based on that scale's activator/inhibitor difference
// 4. Mix color based on the selected scale

enable f16;

struct UpdateParams {
  resolution: vec2<u32>,
  numScales: u32,
  stepSize: f32,
  colorRate: f32,
  padding1: f32,
  padding2: f32,
  padding3: f32,
}

struct ScaleParams {
  weight: f32,
  amount: f32,
  symmetry: f32,
  padding: f32,
  color: vec3<f32>,
  colorPadding: f32,
}

const TWO_PI: f32 = 6.283185307179586;

@group(0) @binding(0) var<storage, read> solution_in: array<vec4<f16>>;
@group(0) @binding(1) var<storage, read> activator_inhibitor: array<vec4<f16>>;
@group(0) @binding(2) var<storage, read_write> solution_out: array<vec4<f16>>;
@group(0) @binding(3) var<uniform> params: UpdateParams;
@group(0) @binding(4) var<storage, read> scaleParams: array<ScaleParams>;

// Sample activator/inhibitor at a given UV coordinate with periodic wrapping
fn sampleAI(uv: vec2<f32>, resolution: vec2<u32>, scaleIdx: u32, pairIdx: u32) -> vec2<f32> {
  // Wrap UV coordinates periodically
  var wrappedUV = fract(uv);

  // Convert to pixel coordinates
  let px = u32(wrappedUV.x * f32(resolution.x)) % resolution.x;
  let py = u32(wrappedUV.y * f32(resolution.y)) % resolution.y;
  let sampleIdx = py * resolution.x + px;

  // Get activator and inhibitor from the convolution result (f16 -> f32)
  let ai = vec4<f32>(activator_inhibitor[scaleIdx * resolution.x * resolution.y + sampleIdx]);

  if (pairIdx == 0u) {
    return vec2<f32>(ai.x, ai.y);
  } else {
    return vec2<f32>(ai.z, ai.w);
  }
}

// Rotate a UV coordinate around the center (0.5, 0.5) by angle theta
fn rotateUV(uv: vec2<f32>, theta: f32) -> vec2<f32> {
  let centered = uv - vec2<f32>(0.5);
  let c = cos(theta);
  let s = sin(theta);
  let rotated = vec2<f32>(
    c * centered.x - s * centered.y,
    s * centered.x + c * centered.y
  );
  return rotated + vec2<f32>(0.5);
}

@compute @workgroup_size(16, 16, 1)
fn update(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;

  // Get current solution (f16 -> f32 for computation)
  let current = vec4<f32>(solution_in[idx]);
  let currentColor = current.rgb;
  let currentF = current.a;

  // Current UV coordinate (center of pixel)
  let uv = vec2<f32>(
    (f32(x) + 0.5) / f32(resolution.x),
    (f32(y) + 0.5) / f32(resolution.y)
  );

  // Process all scales and find minimum variation
  var minVariation = 1e10;
  var totalWeight = 0.0;
  var step = 0.0;
  var targetColor = vec3<f32>(0.0);

  let numScales = params.numScales;

  // For each scale, get activator and inhibitor values
  // activator_inhibitor is stored as pairs: (act1, inh1, act2, inh2)
  for (var i = 0u; i < numScales; i++) {
    let scaleIdx = i / 2u;  // Which vec4 buffer (pairs)
    let pairIdx = i % 2u;   // Which pair within the vec4

    // Get scale parameters
    let sp = scaleParams[i];
    let symmetry = u32(sp.symmetry);

    // Sample with symmetry averaging
    var aiSum = sampleAI(uv, resolution, scaleIdx, pairIdx);

    // Add rotated samples for symmetry > 1
    for (var s = 1u; s < symmetry; s++) {
      let theta = TWO_PI * f32(s) / f32(symmetry);
      let rotatedUV = rotateUV(uv, theta);
      aiSum += sampleAI(rotatedUV, resolution, scaleIdx, pairIdx);
    }

    // Average the samples
    let activator = aiSum.x / f32(symmetry);
    let inhibitor = aiSum.y / f32(symmetry);

    // Compute variation (difference between activator and inhibitor)
    let variation = abs(activator - inhibitor) / sp.weight;

    // Soft selection based on inverse variation
    let w = 1.0 / (variation + 0.001);
    totalWeight += w;

    // Compute step direction: positive if activator > inhibitor
    let direction = select(-1.0, 1.0, activator > inhibitor);
    step += w * direction * sp.amount;

    // Mix target color based on weights
    targetColor += w * sp.color;

    // Track minimum variation for hard selection (optional)
    if (variation < minVariation) {
      minVariation = variation;
    }
  }

  // Normalize weighted contributions
  step /= totalWeight;
  targetColor /= totalWeight;

  // Update scalar field using atan tone mapping to prevent divergence
  // This keeps values linear near zero but bounded at extremes
  let range = 0.1;
  let newF = atan(range * (currentF + params.stepSize * step)) / range;

  // Update color (slow mixing toward target)
  let newColor = mix(currentColor, targetColor, params.colorRate);

  // Write output (f32 -> f16)
  solution_out[idx] = vec4<f16>(vec4<f32>(newColor, newF));
}
`,B=`// Fullscreen Vertex Shader
//
// Renders a fullscreen triangle that covers the entire viewport.
// Used as the vertex stage for visualization fragment shaders.

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn fullscreen(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
  var output: VertexOutput;

  // Generate fullscreen triangle
  // Triangle vertices: (-1,-1), (3,-1), (-1,3)
  // This covers the entire NDC space [-1,1]^2
  let x = f32((vertex_index << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vertex_index & 2u) * 2.0 - 1.0;

  output.position = vec4<f32>(x, -y, 0.0, 1.0);  // Flip Y for correct orientation
  output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);  // UV in [0,1]

  return output;
}
`,V=`// Visualization Fragment Shader
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
`;async function L(e,u,c,t="f32"){const f=U(e,c,t),n=s=>t==="f32"?s.replace(/enable f16;/g,"").replace(/vec4<f16>/g,"vec4<f32>").replace(/vec2<f16>/g,"vec2<f32>").replace(/array<vec4<f16>>/g,"array<vec4<f32>>").replace(/array<vec2<f16>>/g,"array<vec2<f32>>"):s,p=e.createShaderModule({label:"Initialize shader",code:n(G)}),d=e.createShaderModule({label:"Extract shader",code:n(T)}),x=e.createShaderModule({label:"Convolve shader",code:n(I)}),v=e.createShaderModule({label:"Update shader",code:n(M)}),m=e.createShaderModule({label:"Fullscreen vertex shader",code:B}),y=e.createShaderModule({label:"Visualize shader",code:n(V)}),r=e.createBindGroupLayout({label:"Initialize bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),a=e.createBindGroupLayout({label:"Extract bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),i=e.createBindGroupLayout({label:"Convolve bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),o=e.createBindGroupLayout({label:"Update bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}}]}),l=e.createBindGroupLayout({label:"Visualize bind group layout",entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),g=e.createPipelineLayout({label:"Initialize pipeline layout",bindGroupLayouts:[r]}),b=e.createPipelineLayout({label:"Extract pipeline layout",bindGroupLayouts:[a]}),h=e.createPipelineLayout({label:"Convolve pipeline layout",bindGroupLayouts:[i]}),w=e.createPipelineLayout({label:"Update pipeline layout",bindGroupLayouts:[o]}),_=e.createPipelineLayout({label:"Visualize pipeline layout",bindGroupLayouts:[l]}),S=e.createComputePipeline({label:"Initialize pipeline",layout:g,compute:{module:p,entryPoint:"initialize"}}),k=e.createComputePipeline({label:"Extract pipeline",layout:b,compute:{module:d,entryPoint:"extract"}}),P=e.createComputePipeline({label:"Convolve pipeline",layout:h,compute:{module:x,entryPoint:"convolve"}}),C=e.createComputePipeline({label:"Update pipeline",layout:w,compute:{module:v,entryPoint:"update"}}),z=e.createRenderPipeline({label:"Visualize pipeline",layout:_,vertex:{module:m,entryPoint:"fullscreen"},fragment:{module:y,entryPoint:"visualize",targets:[{format:u}]},primitive:{topology:"triangle-list"}});return{fft:f,initialize:S,extract:k,convolve:P,update:C,visualize:z,bindGroupLayouts:{initialize:r,extract:a,convolve:i,update:o,visualize:l}}}export{L as createTuringPipelines};
