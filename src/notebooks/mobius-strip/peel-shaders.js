// Depth-peeling shaders for the Möbius strip transparent views.
// Surface: two-sided Blinn-Phong with specular + Fresnel, premultiplied alpha.
// Coloring is either a cyclic palette running along the strip's length
// (colorMode=0, used by the hero figure: one continuous, looping color
// transition with no seam or face discontinuity) or a scalar field sampled
// through an uploadable colormap LUT (colorMode=1). The LUT lets the legend's
// colormap selector drive the surface colors without baking a palette in.
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
  colorMode  : f32,           // 160  0=cyclic palette, 1=scalar LUT
  _pad0      : f32,           // 164
  _pad1      : f32,           // 168
  _pad2      : f32,           // 172
};                             // Total: 176 bytes (multiple of 16)
@group(0) @binding(0) var<uniform> u : Uniforms;
@group(0) @binding(1) var cmapTex : texture_2d<f32>;
@group(0) @binding(2) var cmapSamp : sampler;
@group(1) @binding(0) var prevDepth : texture_depth_multisampled_2d;

struct VSOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) world     : vec3<f32>,
  @location(1) normal    : vec3<f32>,
  @location(2) scalar    : f32,
  @location(3) arc       : f32,
};

// Surface vertex shader — aux: x=sv (width parameter, unused here), y=scalar,
// z=arc parameter (length around the strip, 0..1, drives the cyclic palette).
@vertex
fn vs(
  @location(0) pos    : vec3<f32>,
  @location(1) normal : vec3<f32>,
  @location(2) aux    : vec3<f32>,
) -> VSOut {
  var o : VSOut;
  o.world  = pos;
  o.normal = normal;
  o.scalar = aux.y;
  o.arc   = aux.z;
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
  o.scalar = 0.0;
  o.arc   = 0.0;
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

// Smooth cyclic palette (Inigo Quilez cosine form). Period 1 in t, so the
// color arc closes seamlessly around the strip. Softened from a full-saturation
// rainbow for a more pleasant look.
fn cyclicPalette(t : f32) -> vec3<f32> {
  let a = vec3<f32>(0.55, 0.55, 0.55);
  let b = vec3<f32>(0.42, 0.42, 0.42);
  let d = vec3<f32>(0.00, 0.33, 0.67);
  return a + b * cos(6.28318530718 * (t + d));
}

fn shadeSurface(world : vec3<f32>, rawNormal : vec3<f32>, sc : f32, arc : f32) -> vec4<f32> {
  let V = normalize(u.eye - world);
  let N = select(-normalize(rawNormal), normalize(rawNormal), dot(rawNormal, V) > 0.0);
  let L = lightDir();
  let H = normalize(L + V);
  let NdotL = max(dot(N, L), 0.0);
  let NdotV = max(dot(N, V), 0.0);
  let NdotH = max(dot(N, H), 0.0);

  var base : vec3<f32>;
  if (u.colorMode > 0.5) {
    // Scalar field through the uploaded colormap LUT.
    let denom = max(u.scalarMax - u.scalarMin, 1e-20);
    let t = clamp((sc - u.scalarMin) / denom, 0.0, 1.0);
    base = textureSampleLevel(cmapTex, cmapSamp, vec2<f32>(t, 0.5), 0.0).rgb;
  } else {
    // Cyclic palette along the strip's length: one continuous, looping color
    // transition. palette(0) == palette(1) closes it across the seam.
    base = cyclicPalette(arc);
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
  return shadeSurface(in.world, in.normal, in.scalar, in.arc);
}
@fragment fn fsPeel(in : VSOut, @builtin(sample_index) si : u32) -> @location(0) vec4<f32> {
  let prev = textureLoad(prevDepth, vec2<i32>(in.pos.xy), i32(si));
  if (in.pos.z <= prev + 1e-6) { discard; }
  return shadeSurface(in.world, in.normal, in.scalar, in.arc);
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
