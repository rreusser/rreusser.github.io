export const peelShaderCode = /* wgsl */`
struct Uniforms {
  projection: mat4x4f,
  view: mat4x4f,
  eye: vec3f,
  pixelRatio: f32,
  opacity: f32,
  cartoonEdgeWidth: f32,
  cartoonEdgeOpacity: f32,
  gridOpacity: f32,
  gridWidth: f32,
  specular: f32,
  clipRadius: f32,
  domainColor: f32,
  uvClipRadius: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) vPosition: vec3f,
  @location(1) vNormal: vec3f,
  @location(2) vUV: vec2f,
};

@vertex
fn vs(
  @location(0) pos: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
) -> VertexOutput {
  var out: VertexOutput;
  out.vPosition = pos;
  out.vNormal = normal;
  out.vUV = uv;
  out.position = u.projection * u.view * vec4f(pos, 1.0);
  return out;
}

fn glslMod(x: f32, y: f32) -> f32 {
  return x - y * floor(x / y);
}

fn gridFactor(parameter: vec2f, width: f32, feather: f32) -> f32 {
  let w1 = width - feather * 0.5;
  let d = fwidth(parameter);
  let looped = 0.5 - abs(vec2f(glslMod(parameter.x, 1.0), glslMod(parameter.y, 1.0)) - 0.5);
  let a2 = smoothstep(d * w1, d * (w1 + feather), looped);
  return min(a2.x, a2.y);
}

fn gridlineFunction(uv: vec2f) -> vec2f {
  return uv * 10.0;
}

fn computeShading(pos: vec3f, normal: vec3f, frontFacing: bool) -> vec3f {
  let V = normalize(u.eye - pos);
  let N = select(-normal, normal, dot(normal, V) > 0.0);
  let lightViewDir = vec3f(1.0, 2.0, 0.5);
  let L = normalize(vec3f(
    dot(u.view[0].xyz, lightViewDir),
    dot(u.view[1].xyz, lightViewDir),
    dot(u.view[2].xyz, lightViewDir)
  ));
  let H = normalize(L + V);

  let NdotL = max(dot(N, L), 0.0);
  let NdotV = max(dot(N, V), 0.0);
  let NdotH = max(dot(N, H), 0.0);

  let normalSign = select(-1.0, 1.0, frontFacing);
  let colorFromNormal = 0.5 + normalSign * 0.5 * normal;
  let baseColor = select(vec3f(0.9, 0.2, 0.1), vec3f(0.1, 0.4, 0.8), frontFacing);
  let albedo = mix(baseColor, colorFromNormal, 0.4);

  let ambient = 0.35;
  let diffuse = 0.55 * NdotL;
  let spec = u.specular * 0.5 * pow(NdotH, 48.0);
  let fresnel = 0.25 * pow(1.0 - NdotV, 3.0);

  return albedo * (ambient + diffuse) + vec3f(spec + fresnel);
}

// Domain coloring: soft checkerboard in (u,v) torus coordinates.
// Color A (warm sand) and color B (slate blue), with gentle lighting.
fn computeDomainColor(in: VertexOutput, frontFacing: bool) -> vec3f {
  // Two muted checkerboard colors
  // Four colors cycling (r+c) % 4, matching the SVG diagram
  // Pre-gamma values targeting: #d4a84b, #3379a6, #7db87d, #b56b9a
  var palette = array<vec3f, 4>(
    vec3f(0.65, 0.42, 0.05), // amber
    vec3f(0.04, 0.21, 0.43), // teal-blue
    vec3f(0.21, 0.49, 0.21), // sage green
    vec3f(0.44, 0.14, 0.34), // mauve
  );

  let uScaled = in.vUV.x * 4.0;
  let vScaled = (1.0 - in.vUV.y) * 4.0;
  let ci = u32(floor(uScaled)) % 4u;
  let ri = u32(floor(vScaled)) % 4u;
  let baseColor = palette[(ri + ci) % 4u];

  // Soft diffuse shading so depth is readable
  let V = normalize(u.eye - in.vPosition);
  let normal = normalize(in.vNormal);
  let N = select(-normal, normal, dot(normal, V) > 0.0);
  let lightViewDir = vec3f(1.0, 2.0, 0.5);
  let L = normalize(vec3f(
    dot(u.view[0].xyz, lightViewDir),
    dot(u.view[1].xyz, lightViewDir),
    dot(u.view[2].xyz, lightViewDir)
  ));
  let NdotL = max(dot(N, L), 0.0);
  let NdotV = max(dot(N, V), 0.0);
  let H = normalize(L + V);
  let NdotH = max(dot(N, H), 0.0);
  let spec = 0.25 * pow(NdotH, 32.0);
  let fresnel = 0.1 * pow(1.0 - NdotV, 3.0);
  return baseColor * (0.4 + 0.6 * NdotL) + vec3f(spec + fresnel);
}

fn shouldClip(uv: vec2f) -> bool {
  return length(uv - vec2f(0.5, 0.5)) > u.uvClipRadius;
}

fn clipAlpha(pos: vec3f) -> f32 {
  let fadeWidth = 0.07;
  let r = length(pos);
  return smoothstep(u.clipRadius, u.clipRadius * (1.0 - fadeWidth), r);
}

fn computeColor(in: VertexOutput, frontFacing: bool) -> vec4f {
  let normal = normalize(in.vNormal);
  let vDotN = abs(dot(normal, normalize(in.vPosition - u.eye)));
  let cartoonEdge = smoothstep(0.75, 1.25, vDotN / fwidth(vDotN) / (u.cartoonEdgeWidth * u.pixelRatio));
  let combinedGrid = u.cartoonEdgeOpacity * (1.0 - cartoonEdge);

  var surfaceColor: vec3f;
  if (u.domainColor > 0.5) {
    surfaceColor = computeDomainColor(in, frontFacing);
  } else {
    let grid = gridFactor(gridlineFunction(in.vUV), 0.5 * u.gridWidth * u.pixelRatio, 0.5);
    let gridLine = max(combinedGrid, u.gridOpacity * (1.0 - grid)) * u.opacity;
    surfaceColor = computeShading(in.vPosition, normal, frontFacing);
    surfaceColor = pow(surfaceColor, vec3f(0.454));

    let surfaceAlpha = u.opacity;
    let alpha = gridLine + surfaceAlpha * (1.0 - gridLine);
    let color = select(
      vec3f(0.0),
      surfaceColor * surfaceAlpha * (1.0 - gridLine) / alpha,
      alpha > 1e-4
    );
    return vec4f(color, alpha);
  }

  surfaceColor = pow(surfaceColor, vec3f(0.454));
  let edgeAlpha = combinedGrid * u.opacity;
  let surfaceAlpha = u.opacity;
  let alpha = edgeAlpha + surfaceAlpha * (1.0 - edgeAlpha);
  let color = select(
    vec3f(0.0),
    surfaceColor * surfaceAlpha * (1.0 - edgeAlpha) / alpha,
    alpha > 1e-4
  );
  return vec4f(color, alpha);
}

@fragment
fn fsFirst(in: VertexOutput, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
  if (shouldClip(in.vUV)) { discard; }
  let fade = clipAlpha(in.vPosition);
  if (fade < 0.001) { discard; }
  let result = computeColor(in, frontFacing);
  return vec4f(result.rgb, result.a * fade);
}

@group(1) @binding(0) var prevDepthTex: texture_depth_2d;

@fragment
fn fsPeel(in: VertexOutput, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
  let result = computeColor(in, frontFacing);

  let coords = vec2i(in.position.xy);
  let prevDepth = textureLoad(prevDepthTex, coords, 0);
  if (in.position.z <= prevDepth + 1e-5) { discard; }
  if (shouldClip(in.vUV)) { discard; }
  let fade = clipAlpha(in.vPosition);
  if (fade < 0.001) { discard; }

  return vec4f(result.rgb, result.a * fade);
}
`;

export const compositeShaderCode = /* wgsl */`
@group(0) @binding(0) var layerTex: texture_2d<f32>;

struct VSOutput {
  @builtin(position) position: vec4f,
};

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> VSOutput {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  var out: VSOutput;
  out.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  return out;
}

@fragment
fn fs(in: VSOutput) -> @location(0) vec4f {
  let coords = vec2i(in.position.xy);
  return textureLoad(layerTex, coords, 0);
}
`;
