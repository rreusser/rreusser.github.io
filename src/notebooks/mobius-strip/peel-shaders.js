// Depth-peeling shaders for the Möbius strip transparent views.
// Surface: two-sided Blinn-Phong with specular + Fresnel, premultiplied alpha.
// Supports fixed light-blue (colorMode=0), turbo scalar (1), or diverging scalar (2).
// Centerline tube: dark matte with specular highlight.
// Composite: back-to-front premultiplied alpha blend of peeled layers.

export const peelShaderCode = /* wgsl */`
struct Uniforms {
  projection : mat4x4<f32>,   // 0
  view       : mat4x4<f32>,   // 64
  eye        : vec3<f32>,     // 128  (vec3 size=12, align=16)
  pixelRatio : f32,           // 140
  opacity    : f32,           // 144
  specular   : f32,           // 148
  scalarMin  : f32,           // 152
  scalarMax  : f32,           // 156
  colorMode  : f32,           // 160  0=fixed blue, 1=turbo, 2=diverging
  _pad0      : f32,           // 164
  _pad1      : f32,           // 168
  _pad2      : f32,           // 172
};                             // Total: 176 bytes (multiple of 16)
@group(0) @binding(0) var<uniform> u : Uniforms;
@group(1) @binding(0) var prevDepth : texture_depth_multisampled_2d;

struct VSOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) world     : vec3<f32>,
  @location(1) normal    : vec3<f32>,
  @location(2) sv        : f32,
  @location(3) scalar    : f32,
};

// Surface vertex shader — has aux: x=sv (width parameter), y=scalar
@vertex
fn vs(
  @location(0) pos    : vec3<f32>,
  @location(1) normal : vec3<f32>,
  @location(2) aux    : vec2<f32>,
) -> VSOut {
  var o : VSOut;
  o.world  = pos;
  o.normal = normal;
  o.sv     = aux.x;
  o.scalar = aux.y;
  o.pos    = u.projection * u.view * vec4<f32>(pos, 1.0);
  return o;
}

// Tube vertex shader — no aux attribute
@vertex
fn vsTube(
  @location(0) pos    : vec3<f32>,
  @location(1) normal : vec3<f32>,
) -> VSOut {
  var o : VSOut;
  o.world  = pos;
  o.normal = normal;
  o.sv     = 0.0;
  o.scalar = 0.0;
  o.pos    = u.projection * u.view * vec4<f32>(pos, 1.0);
  return o;
}

fn lightDir() -> vec3<f32> {
  let ld = vec3<f32>(1.0, 2.0, 0.5);
  return normalize(vec3<f32>(
    dot(u.view[0].xyz, ld),
    dot(u.view[1].xyz, ld),
    dot(u.view[2].xyz, ld),
  ));
}

fn turbo(t : f32) -> vec3<f32> {
  let x = clamp(t, 0.0, 1.0);
  let r = 0.13572138 + x*(4.61539260 + x*(-42.66032258 + x*(132.13108234 + x*(-152.94239396 + x*59.28637943))));
  let g = 0.09140261 + x*(2.19418839 + x*( 4.84296658 + x*(-14.18503333 + x*(  4.27729857 + x* 2.82956604))));
  let b = 0.10667330 + x*(12.64194608 + x*(-60.58204836 + x*(110.36276771 + x*(-89.90310912 + x*27.34824973))));
  return clamp(vec3<f32>(r, g, b), vec3<f32>(0.0), vec3<f32>(1.0));
}

// Coolwarm diverging map for signed fields (e.g. Gaussian curvature): blue for
// negative, near-white at zero (t = 0.5), red for positive.
fn diverging(t : f32) -> vec3<f32> {
  let x = clamp(t, 0.0, 1.0);
  let lo  = vec3<f32>(0.23, 0.30, 0.75);
  let mid = vec3<f32>(0.95, 0.95, 0.95);
  let hi  = vec3<f32>(0.71, 0.09, 0.16);
  if (x < 0.5) { return mix(lo, mid, x * 2.0); }
  return mix(mid, hi, (x - 0.5) * 2.0);
}

fn shadeSurface(world : vec3<f32>, rawNormal : vec3<f32>, sv : f32, sc : f32) -> vec4<f32> {
  let V = normalize(u.eye - world);
  let N = select(-normalize(rawNormal), normalize(rawNormal), dot(rawNormal, V) > 0.0);
  let L = lightDir();
  let H = normalize(L + V);
  let NdotL = max(dot(N, L), 0.0);
  let NdotV = max(dot(N, V), 0.0);
  let NdotH = max(dot(N, H), 0.0);

  var base : vec3<f32>;
  if (u.colorMode > 1.5) {
    // Diverging scalar colormap (signed field; scalarMin/Max are symmetric so
    // zero maps to the neutral midpoint).
    let denom = max(u.scalarMax - u.scalarMin, 1e-20);
    base = diverging(clamp((sc - u.scalarMin) / denom, 0.0, 1.0));
  } else if (u.colorMode > 0.5) {
    // Turbo scalar colormap
    let denom = max(u.scalarMax - u.scalarMin, 1e-20);
    base = turbo(clamp((sc - u.scalarMin) / denom, 0.0, 1.0));
  } else {
    // Width gradient: cerulean → marine, two-sided independent of orientation.
    // Following the single Möbius edge once around shows the colour swap.
    base = mix(vec3<f32>(0.54, 0.72, 1.00), vec3<f32>(0.26, 0.50, 0.90), clamp(sv, 0.0, 1.0));
  }

  let ambient  = 0.28;
  let diffuse  = 0.58 * NdotL;
  let spec     = u.specular * 0.55 * pow(NdotH, 48.0);
  let fresnel  = 0.22 * pow(1.0 - NdotV, 3.0);

  let rgb = base * (ambient + diffuse) + vec3<f32>(spec + fresnel);
  let a = u.opacity;
  // Premultiplied alpha output
  return vec4<f32>(pow(clamp(rgb, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(0.454)) * a, a);
}

fn shadeTube(world : vec3<f32>, rawNormal : vec3<f32>) -> vec4<f32> {
  let V = normalize(u.eye - world);
  let N = select(-normalize(rawNormal), normalize(rawNormal), dot(rawNormal, V) > 0.0);
  let L = lightDir();
  let H = normalize(L + V);
  let NdotL = max(dot(N, L), 0.0);
  let NdotH = max(dot(N, H), 0.0);

  let base = vec3<f32>(0.10, 0.07, 0.05);
  let spec = 0.65 * pow(NdotH, 80.0);
  let rgb  = base * (0.25 + 0.75 * NdotL) + vec3<f32>(spec);
  // Tube is fully opaque; premultiplied with a=1
  return vec4<f32>(pow(clamp(rgb, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(0.454)), 1.0);
}

@fragment fn fsFirst(in : VSOut) -> @location(0) vec4<f32> {
  return shadeSurface(in.world, in.normal, in.sv, in.scalar);
}
@fragment fn fsPeel(in : VSOut, @builtin(sample_index) si : u32) -> @location(0) vec4<f32> {
  let prev = textureLoad(prevDepth, vec2<i32>(in.pos.xy), i32(si));
  if (in.pos.z <= prev + 1e-6) { discard; }
  return shadeSurface(in.world, in.normal, in.sv, in.scalar);
}
@fragment fn fsFirstTube(in : VSOut) -> @location(0) vec4<f32> {
  return shadeTube(in.world, in.normal);
}
@fragment fn fsPeelTube(in : VSOut, @builtin(sample_index) si : u32) -> @location(0) vec4<f32> {
  let prev = textureLoad(prevDepth, vec2<i32>(in.pos.xy), i32(si));
  if (in.pos.z <= prev + 1e-6) { discard; }
  return shadeTube(in.world, in.normal);
}

@vertex fn vsWire(@location(0) pos : vec3<f32>) -> @builtin(position) vec4<f32> {
  return u.projection * u.view * vec4<f32>(pos, 1.0);
}
@fragment fn fsWire() -> @location(0) vec4<f32> {
  return vec4<f32>(0.08, 0.09, 0.12, 1.0);
}
`;

export const compositeShaderCode = /* wgsl */`
@group(0) @binding(0) var layerTex : texture_2d<f32>;

struct VSOut { @builtin(position) pos : vec4<f32> };

@vertex
fn vs(@builtin(vertex_index) i : u32) -> VSOut {
  var corners = array<vec2<f32>,3>(vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
  var o : VSOut;
  o.pos = vec4<f32>(corners[i], 0.0, 1.0);
  return o;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4<f32> {
  return textureLoad(layerTex, vec2<i32>(in.pos.xy), 0);
}
`;
