// WGSL shader for debug/frustum line rendering

export const coloredLineShader = /* wgsl */`
struct ColoredLineUniforms {
  resolution: vec2<f32>,
};

@group(0) @binding(0) var<uniform> u: ColoredLineUniforms;

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) color: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@vertex
fn vs_colored_line(input: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.position = vec4<f32>(
    input.position.x / u.resolution.x * 2.0 - 1.0,
    1.0 - input.position.y / u.resolution.y * 2.0,
    0.0,
    1.0
  );
  out.color = input.color;
  return out;
}

@fragment
fn fs_colored_line(input: VertexOutput) -> @location(0) vec4<f32> {
  return input.color;
}
`;

export const frustumLineShader = /* wgsl */`
struct FrustumUniforms {
  proj_view: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> frustum_u: FrustumUniforms;

@vertex
fn vs_frustum(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
  return frustum_u.proj_view * vec4<f32>(position, 1.0);
}

@fragment
fn fs_frustum() -> @location(0) vec4<f32> {
  return vec4<f32>(0.0, 1.0, 0.0, 1.0);
}
`;
