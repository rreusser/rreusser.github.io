// Visualize shader - renders particles as point sprites with additive blending
//
// Vertex shader: reads particle position from buffer, outputs point primitive
// Fragment shader: draws soft circle with configurable brightness

struct VisParams {
  canvasWidth: u32,
  canvasHeight: u32,
  pointSize: f32,
  brightness: f32,
  numParticles: u32,
}

struct VertexInput {
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) center: vec2<f32>,  // Screen-space center for soft circle
}

@group(0) @binding(0) var<storage, read> particles: array<vec4<f32>>;
@group(0) @binding(1) var<uniform> params: VisParams;

@vertex
fn visualize_vertex(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let p = particles[input.instanceIndex];

  // Map [0,1] position to clip space [-1,1]
  let clipPos = vec2<f32>(p.x * 2.0 - 1.0, p.y * 2.0 - 1.0);

  // Screen-space center for fragment shader
  output.center = vec2<f32>(
    (clipPos.x * 0.5 + 0.5) * f32(params.canvasWidth),
    (1.0 - (clipPos.y * 0.5 + 0.5)) * f32(params.canvasHeight)
  );

  // Quad vertices for point sprite (2 triangles, 6 vertices)
  let quadVerts = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );

  let offset = quadVerts[input.vertexIndex];
  let pixelOffset = offset * params.pointSize;

  // Convert pixel offset to clip space
  let clipOffset = vec2<f32>(
    pixelOffset.x * 2.0 / f32(params.canvasWidth),
    -pixelOffset.y * 2.0 / f32(params.canvasHeight)
  );

  output.position = vec4<f32>(clipPos + clipOffset, 0.0, 1.0);

  return output;
}

@fragment
fn visualize_fragment(input: VertexOutput) -> @location(0) vec4<f32> {
  // Distance from center of point sprite
  let dist = length(input.position.xy - input.center);
  let radius = params.pointSize;

  // Soft circle falloff
  let alpha = 1.0 - smoothstep(0.0, radius, dist);

  // Normalize brightness by number of particles so total brightness is independent of particle count
  // Scale by 1000 to compensate for the sqrt normalization
  let normalizedBrightness = params.brightness * 1000.0 / sqrt(f32(params.numParticles));

  // Blue-ish color with brightness control
  let color = vec3<f32>(0.2, 0.4, 1.0) * normalizedBrightness;

  return vec4<f32>(color * alpha, alpha);
}
