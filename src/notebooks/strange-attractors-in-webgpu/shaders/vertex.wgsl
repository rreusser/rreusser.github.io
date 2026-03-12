// Vertex shader body for webgpu-instanced-lines
// This code is injected into the line renderer's vertex shader

@group(1) @binding(0) var<storage, read> state: array<vec4f>;
@group(1) @binding(1) var<uniform> projViewMatrix: mat4x4f;

struct LineUniforms {
  stepOffset: u32,  // Ring buffer offset
  stepCount: u32,
  particleCount: u32,
  width: f32,
}
@group(1) @binding(2) var<uniform> lineUniforms: LineUniforms;

struct Vertex {
  position: vec4f,
  width: f32,
  t: f32,
  velocity: f32,
  lineWidth: f32,
}

// Bouali attractor derivative for velocity computation
fn attractorDerivative(pos: vec3f) -> vec3f {
  let alpha = 3.0;
  let beta = 2.2;
  let gamma = 1.0;
  let mu = 1.51;
  return vec3f(
    alpha * pos.x * (1.0 - pos.y) - beta * pos.z,
    -gamma * pos.y * (1.0 - pos.x * pos.x),
    mu * pos.x
  );
}

fn getVertex(index: u32) -> Vertex {
  // Decode buffer index from vertex index
  let pointsPerParticle = lineUniforms.stepCount + 1u; // +1 for line break
  let particle = index / pointsPerParticle;
  let step = index % pointsPerParticle;

  // Check if this is a line break point
  if (step >= lineUniforms.stepCount) {
    return Vertex(vec4f(0), 0.0, 0.0, 0.0, 0.0);
  }

  // Compute buffer index with ring buffer offset (modular arithmetic for wrap-around)
  let bufferStep = (step + lineUniforms.stepOffset) % lineUniforms.stepCount;
  let bufferIdx = particle * lineUniforms.stepCount + bufferStep;

  // Load position from state buffer
  let pos = state[bufferIdx].xyz;

  // Compute velocity from attractor derivative
  let speed = length(attractorDerivative(pos));
  let normalizedVelocity = clamp(speed / 10.0, 0.0, 1.0);

  // Progress along the track (0 = oldest, 1 = newest)
  let t = f32(step) / f32(lineUniforms.stepCount - 1u);

  // Project to clip space
  let projected = projViewMatrix * vec4f(pos, 1.0);

  // Line width tapers from thin (old) to thick (new)
  let lineWidth = lineUniforms.width * (0.3 + 0.7 * t);

  return Vertex(projected, lineWidth, t, normalizedVelocity, lineWidth);
}
