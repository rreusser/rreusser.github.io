struct Uniforms {
  projViewMatrix: mat4x4f,
  modelMatrix: mat4x4f,
  normalMatrix: mat4x4f,
  color: vec3f,
  objectId: u32,
  lightDir: vec3f,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  let worldPos = uniforms.modelMatrix * vec4f(input.position, 1.0);
  output.position = uniforms.projViewMatrix * worldPos;
  output.normal = (uniforms.normalMatrix * vec4f(input.normal, 0.0)).xyz;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let N = normalize(input.normal);
  let L = normalize(uniforms.lightDir);
  let diffuse = max(dot(N, L), 0.0) * 0.7 + 0.3;
  return vec4f(uniforms.color * diffuse, 1.0);
}
