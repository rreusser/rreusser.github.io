const e=`
struct Uniforms {
  projection: mat4x4f,
  view: mat4x4f,
  eye: vec3f,
  pixelRatio: f32,
  time: f32,
  opacity: f32,
  cartoonEdgeWidth: f32,
  cartoonEdgeOpacity: f32,
  gridOpacity: f32,
  gridWidth: f32,
  specular: f32,
  solidPass: u32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) vPosition: vec3f,
  @location(1) vNormal: vec3f,
  @location(2) vUV: vec2f,
};

fn surfaceF(uv: vec2f) -> vec3f {
  let r2 = dot(uv, uv);
  let s = 12.0 * sqrt(r2);
  let t = u.time * 4.0;
  return vec3f(
    uv.x * 2.0,
    cos(s - t) / sqrt(1.0 + s * s),
    uv.y * 2.0
  );
}

@vertex
fn vs(@location(0) uv: vec2f) -> VertexOutput {
  var out: VertexOutput;
  let mappedUV = uv.x * vec2f(cos(uv.y), sin(uv.y));
  out.vUV = mappedUV;
  out.vPosition = surfaceF(mappedUV);

  let dx = 1e-2;
  let dpdu = surfaceF(mappedUV + vec2f(dx, 0.0)) - out.vPosition;
  let dpdv = surfaceF(mappedUV + vec2f(0.0, dx)) - out.vPosition;
  out.vNormal = normalize(cross(dpdu, dpdv));

  out.position = u.projection * u.view * vec4f(out.vPosition, 1.0);
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
  let colorFromNormal = 0.5 - normalSign * 0.5 * normal;
  let baseColor = select(vec3f(0.9, 0.2, 0.1), vec3f(0.1, 0.4, 0.8), frontFacing);
  let albedo = mix(baseColor, colorFromNormal, 0.4);

  let ambient = 0.35;
  let diffuse = 0.55 * NdotL;
  let specular = 0.5 * pow(NdotH, 48.0);
  let fresnel = 0.25 * pow(1.0 - NdotV, 3.0);

  return albedo * (ambient + diffuse) + vec3f(specular + fresnel);
}

@fragment
fn fsSolid(in: VertexOutput, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
  let normal = normalize(in.vNormal);
  let vDotN = abs(dot(normal, normalize(in.vPosition - u.eye)));
  let cartoonEdge = smoothstep(0.75, 1.25, vDotN / fwidth(vDotN) / (u.cartoonEdgeWidth * u.pixelRatio));
  let grid = gridFactor(in.vUV * 10.0, 0.5 * u.gridWidth * u.pixelRatio, 0.5);
  let combinedGrid = max(u.cartoonEdgeOpacity * (1.0 - cartoonEdge), u.gridOpacity * (1.0 - grid));

  let color = computeShading(in.vPosition, normal, frontFacing);
  let gridded = mix(color, vec3f(0.0), u.opacity * combinedGrid);
  let finalColor = mix(vec3f(1.0), gridded, u.opacity);
  return vec4f(pow(finalColor, vec3f(0.454)), 1.0);
}

@fragment
fn fsWire(in: VertexOutput, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
  let normal = normalize(in.vNormal);
  let vDotN = abs(dot(normal, normalize(in.vPosition - u.eye)));
  let cartoonEdge = smoothstep(0.75, 1.25, vDotN / fwidth(vDotN) / (u.cartoonEdgeWidth * u.pixelRatio));
  let grid = gridFactor(in.vUV * 10.0, 0.5 * u.gridWidth * u.pixelRatio, 0.5);
  let combinedGrid = max(u.cartoonEdgeOpacity * (1.0 - cartoonEdge), u.gridOpacity * (1.0 - grid));

  let a = (1.0 - u.opacity) * combinedGrid;
  if (a < 1e-3) {
    discard;
  }
  return vec4f(vec3f(1.0), a);
}
`,t=`
struct Uniforms {
  projection: mat4x4f,
  view: mat4x4f,
  eye: vec3f,
  pixelRatio: f32,
  time: f32,
  opacity: f32,
  cartoonEdgeWidth: f32,
  cartoonEdgeOpacity: f32,
  gridOpacity: f32,
  gridWidth: f32,
  specular: f32,
  solidPass: u32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) vPosition: vec3f,
  @location(1) vNormal: vec3f,
  @location(2) vUV: vec2f,
};

fn surfaceF(uv: vec2f) -> vec3f {
  let r2 = dot(uv, uv);
  let s = 12.0 * sqrt(r2);
  let t = u.time * 4.0;
  return vec3f(
    uv.x * 2.0,
    cos(s - t) / sqrt(1.0 + s * s),
    uv.y * 2.0
  );
}

@vertex
fn vs(@location(0) uv: vec2f) -> VertexOutput {
  var out: VertexOutput;
  let mappedUV = uv.x * vec2f(cos(uv.y), sin(uv.y));
  out.vUV = mappedUV;
  out.vPosition = surfaceF(mappedUV);

  let dx = 1e-2;
  let dpdu = surfaceF(mappedUV + vec2f(dx, 0.0)) - out.vPosition;
  let dpdv = surfaceF(mappedUV + vec2f(0.0, dx)) - out.vPosition;
  out.vNormal = normalize(cross(dpdu, dpdv));

  out.position = u.projection * u.view * vec4f(out.vPosition, 1.0);
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

struct OITOutput {
  @location(0) accum: vec4f,
  @location(1) revealage: f32,
};

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
  let colorFromNormal = 0.5 - normalSign * 0.5 * normal;
  let baseColor = select(vec3f(0.9, 0.2, 0.1), vec3f(0.1, 0.4, 0.8), frontFacing);
  let albedo = mix(baseColor, colorFromNormal, 0.4);

  let ambient = 0.35;
  let diffuse = 0.55 * NdotL;
  let specular = 0.5 * pow(NdotH, 48.0);
  let fresnel = 0.25 * pow(1.0 - NdotV, 3.0);

  return albedo * (ambient + diffuse) + vec3f(specular + fresnel);
}

@fragment
fn fsOIT(in: VertexOutput, @builtin(front_facing) frontFacing: bool) -> OITOutput {
  let normal = normalize(in.vNormal);
  let vDotN = abs(dot(normal, normalize(in.vPosition - u.eye)));
  let cartoonEdge = smoothstep(0.75, 1.25, vDotN / fwidth(vDotN) / (u.cartoonEdgeWidth * u.pixelRatio));
  let grid = gridFactor(in.vUV * 10.0, 0.5 * u.gridWidth * u.pixelRatio, 0.5);
  let combinedGrid = max(u.cartoonEdgeOpacity * (1.0 - cartoonEdge), u.gridOpacity * (1.0 - grid));

  var color = computeShading(in.vPosition, normal, frontFacing);
  color = pow(color, vec3f(0.454));

  color = mix(color, vec3f(0.0), combinedGrid);
  let alpha = clamp(u.opacity + (1.0 - u.opacity) * combinedGrid, 0.0, 1.0);

  let z_ndc = in.position.z;
  let oneMinusZ = 1.0 - z_ndc;
  let w = alpha * max(1e-2, 3e3 * oneMinusZ * oneMinusZ * oneMinusZ);

  var out: OITOutput;
  out.accum = vec4f(color * alpha * w, alpha * w);
  out.revealage = alpha;
  return out;
}
`,o=`
@group(0) @binding(0) var accumTex: texture_2d<f32>;
@group(0) @binding(1) var revealTex: texture_2d<f32>;

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
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
  out.uv = out.position.xy * 0.5 + 0.5;
  out.uv.y = 1.0 - out.uv.y;
  return out;
}

@fragment
fn fs(in: VSOutput) -> @location(0) vec4f {
  let coords = vec2i(in.position.xy);
  let accum = textureLoad(accumTex, coords, 0);
  let revealage = textureLoad(revealTex, coords, 0).r;

  if (accum.a < 1e-4) {
    return vec4f(0.0, 0.0, 0.0, 0.0);
  }

  let avgColor = accum.rgb / max(accum.a, 1e-4);
  let alpha = 1.0 - revealage;
  return vec4f(avgColor * alpha, alpha);
}
`,r=`
struct Uniforms {
  projection: mat4x4f,
  view: mat4x4f,
  eye: vec3f,
  pixelRatio: f32,
  time: f32,
  opacity: f32,
  cartoonEdgeWidth: f32,
  cartoonEdgeOpacity: f32,
  gridOpacity: f32,
  gridWidth: f32,
  specular: f32,
  solidPass: u32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) vPosition: vec3f,
  @location(1) vNormal: vec3f,
  @location(2) vUV: vec2f,
};

fn surfaceF(uv: vec2f) -> vec3f {
  let r2 = dot(uv, uv);
  let s = 12.0 * sqrt(r2);
  let t = u.time * 4.0;
  return vec3f(
    uv.x * 2.0,
    cos(s - t) / sqrt(1.0 + s * s),
    uv.y * 2.0
  );
}

@vertex
fn vs(@location(0) uv: vec2f) -> VertexOutput {
  var out: VertexOutput;
  let mappedUV = uv.x * vec2f(cos(uv.y), sin(uv.y));
  out.vUV = mappedUV;
  out.vPosition = surfaceF(mappedUV);

  let dx = 1e-2;
  let dpdu = surfaceF(mappedUV + vec2f(dx, 0.0)) - out.vPosition;
  let dpdv = surfaceF(mappedUV + vec2f(0.0, dx)) - out.vPosition;
  out.vNormal = normalize(cross(dpdu, dpdv));

  out.position = u.projection * u.view * vec4f(out.vPosition, 1.0);
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
  let colorFromNormal = 0.5 - normalSign * 0.5 * normal;
  let baseColor = select(vec3f(0.9, 0.2, 0.1), vec3f(0.1, 0.4, 0.8), frontFacing);
  let albedo = mix(baseColor, colorFromNormal, 0.4);

  let ambient = 0.35;
  let diffuse = 0.55 * NdotL;
  let specular = 0.5 * pow(NdotH, 48.0);
  let fresnel = 0.25 * pow(1.0 - NdotV, 3.0);

  return albedo * (ambient + diffuse) + vec3f(specular + fresnel);
}

fn computeColor(in: VertexOutput, frontFacing: bool) -> vec4f {
  let normal = normalize(in.vNormal);
  let vDotN = abs(dot(normal, normalize(in.vPosition - u.eye)));
  let cartoonEdge = smoothstep(0.75, 1.25, vDotN / fwidth(vDotN) / (u.cartoonEdgeWidth * u.pixelRatio));
  let grid = gridFactor(in.vUV * 10.0, 0.5 * u.gridWidth * u.pixelRatio, 0.5);
  let combinedGrid = max(u.cartoonEdgeOpacity * (1.0 - cartoonEdge), u.gridOpacity * (1.0 - grid));

  var surfaceColor = computeShading(in.vPosition, normal, frontFacing);
  surfaceColor = pow(surfaceColor, vec3f(0.454));

  let surfaceAlpha = u.opacity;
  let gridAlpha = combinedGrid;
  let alpha = gridAlpha + surfaceAlpha * (1.0 - gridAlpha);
  let color = select(
    vec3f(0.0),
    surfaceColor * surfaceAlpha * (1.0 - gridAlpha) / alpha,
    alpha > 1e-4
  );

  return vec4f(color, alpha);
}

@fragment
fn fsFirst(in: VertexOutput, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
  return computeColor(in, frontFacing);
}

@group(1) @binding(0) var prevDepthTex: texture_depth_2d;

@fragment
fn fsPeel(in: VertexOutput, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
  let coords = vec2i(in.position.xy);
  let prevDepth = textureLoad(prevDepthTex, coords, 0);

  if (in.position.z <= prevDepth + 1e-5) {
    discard;
  }

  return computeColor(in, frontFacing);
}
`,i=`
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
  let layer = textureLoad(layerTex, coords, 0);
  return layer;
}
`,a=`
struct Uniforms {
  projection: mat4x4f,
  view: mat4x4f,
  eye: vec3f,
  pixelRatio: f32,
  time: f32,
  opacity: f32,
  cartoonEdgeWidth: f32,
  cartoonEdgeOpacity: f32,
  gridOpacity: f32,
  gridWidth: f32,
  specular: f32,
  solidPass: u32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) vPosition: vec3f,
  @location(1) vNormal: vec3f,
  @location(2) vUV: vec2f,
};

fn surfaceF(uv: vec2f) -> vec3f {
  let r2 = dot(uv, uv);
  let s = 12.0 * sqrt(r2);
  let t = u.time * 4.0;
  return vec3f(
    uv.x * 2.0,
    cos(s - t) / sqrt(1.0 + s * s),
    uv.y * 2.0
  );
}

@vertex
fn vs(@location(0) uv: vec2f) -> VertexOutput {
  var out: VertexOutput;
  let mappedUV = uv.x * vec2f(cos(uv.y), sin(uv.y));
  out.vUV = mappedUV;
  out.vPosition = surfaceF(mappedUV);

  let dx = 1e-2;
  let dpdu = surfaceF(mappedUV + vec2f(dx, 0.0)) - out.vPosition;
  let dpdv = surfaceF(mappedUV + vec2f(0.0, dx)) - out.vPosition;
  out.vNormal = normalize(cross(dpdu, dpdv));

  out.position = u.projection * u.view * vec4f(out.vPosition, 1.0);
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
  let colorFromNormal = 0.5 - normalSign * 0.5 * normal;
  let baseColor = select(vec3f(0.9, 0.2, 0.1), vec3f(0.1, 0.4, 0.8), frontFacing);
  let albedo = mix(baseColor, colorFromNormal, 0.4);

  let ambient = 0.35;
  let diffuse = 0.55 * NdotL;
  let specular = 0.5 * pow(NdotH, 48.0);
  let fresnel = 0.25 * pow(1.0 - NdotV, 3.0);

  return albedo * (ambient + diffuse) + vec3f(specular + fresnel);
}

fn computeColor(in: VertexOutput, frontFacing: bool) -> vec4f {
  let normal = normalize(in.vNormal);
  let vDotN = abs(dot(normal, normalize(in.vPosition - u.eye)));
  let cartoonEdge = smoothstep(0.75, 1.25, vDotN / fwidth(vDotN) / (u.cartoonEdgeWidth * u.pixelRatio));
  let grid = gridFactor(in.vUV * 10.0, 0.5 * u.gridWidth * u.pixelRatio, 0.5);
  let combinedGrid = max(u.cartoonEdgeOpacity * (1.0 - cartoonEdge), u.gridOpacity * (1.0 - grid));

  var surfaceColor = computeShading(in.vPosition, normal, frontFacing);
  surfaceColor = pow(surfaceColor, vec3f(0.454));

  let surfaceAlpha = u.opacity;
  let gridAlpha = combinedGrid;
  let alpha = gridAlpha + surfaceAlpha * (1.0 - gridAlpha);
  let color = select(
    vec3f(0.0),
    surfaceColor * surfaceAlpha * (1.0 - gridAlpha) / alpha,
    alpha > 1e-4
  );

  return vec4f(color, alpha);
}

struct DualPeelOutput {
  @location(0) dualDepth: vec2f,
  @location(1) frontColor: vec4f,
  @location(2) backColor: vec4f,
};

@fragment
fn fsDualFirst(in: VertexOutput, @builtin(front_facing) frontFacing: bool) -> DualPeelOutput {
  var out: DualPeelOutput;
  out.dualDepth = vec2f(-in.position.z, in.position.z);
  out.frontColor = vec4f(0.0);
  out.backColor = vec4f(0.0);
  return out;
}

@group(1) @binding(0) var prevDualDepthTex: texture_2d<f32>;

@fragment
fn fsDualPeel(in: VertexOutput, @builtin(front_facing) frontFacing: bool) -> DualPeelOutput {
  let coords = vec2i(in.position.xy);
  let prevDD = textureLoad(prevDualDepthTex, coords, 0);
  let prevNear = -prevDD.r;
  let prevFar = prevDD.g;
  let z = in.position.z;

  // Compute color before non-uniform branching (fwidth requires uniform control flow)
  let color = computeColor(in, frontFacing);
  let premul = vec4f(color.rgb * color.a, color.a);

  var out: DualPeelOutput;
  out.dualDepth = vec2f(-1.0);
  out.frontColor = vec4f(0.0);
  out.backColor = vec4f(0.0);

  let eps = 5e-4;

  // Already peeled
  if (z < prevNear - eps || z > prevFar + eps) {
    return out;
  }

  // Near boundary: front fragment
  if (z <= prevNear + eps) {
    out.frontColor = premul;
    return out;
  }

  // Far boundary: back fragment
  if (z >= prevFar - eps) {
    out.backColor = premul;
    return out;
  }

  // Between boundaries: depth only
  out.dualDepth = vec2f(-z, z);
  return out;
}
`;export{a as dualPeelShaderCode,o as oitCompositeShaderCode,t as oitShaderCode,i as peelCompositeShaderCode,r as peelShaderCode,e as surfaceShaderCode};
