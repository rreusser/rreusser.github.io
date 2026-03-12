const n=`struct Uniforms {
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
  @location(0) worldNormal: vec3f,
  @location(1) worldPos: vec3f,
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  let worldPos = uniforms.modelMatrix * vec4f(input.position, 1.0);
  let worldNormal = (uniforms.normalMatrix * vec4f(input.normal, 0.0)).xyz;

  var output: VertexOutput;
  output.position = uniforms.projViewMatrix * worldPos;
  output.worldNormal = worldNormal;
  output.worldPos = worldPos.xyz;
  return output;
}

struct FragmentOutput {
  @location(0) color: vec4f,
  @location(1) objectId: vec4u,
}

@fragment
fn fragmentMain(input: VertexOutput) -> FragmentOutput {
  let N = normalize(input.worldNormal);
  let L = normalize(uniforms.lightDir);

  // Simple diffuse + ambient
  let ambient = 0.3;
  let diffuse = max(dot(N, L), 0.0) * 0.7;
  let color = uniforms.color * (ambient + diffuse);

  var output: FragmentOutput;
  output.color = vec4f(color, 1.0);

  // Store object ID and screen position for JFA
  let screenPos = vec2u(input.position.xy);
  output.objectId = vec4u(screenPos.x + 1u, screenPos.y + 1u, uniforms.objectId, 0u);

  return output;
}
`;export{n as default};
