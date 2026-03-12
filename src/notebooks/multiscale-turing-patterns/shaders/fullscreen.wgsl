// Fullscreen Vertex Shader
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
