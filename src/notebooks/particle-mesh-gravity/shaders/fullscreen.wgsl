// Fullscreen vertex shader for density visualization

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn fullscreen(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  // Generate fullscreen triangle
  let x = f32((vertexIndex << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vertexIndex & 2u) * 2.0 - 1.0;

  output.position = vec4<f32>(x, -y, 0.0, 1.0);
  output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);

  return output;
}
