// Update Shader
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
