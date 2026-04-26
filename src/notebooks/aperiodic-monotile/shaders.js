// WGSL shader sources for the aperiodic-monotile notebook. Kept here so
// the main index.html cell stays focused on pipeline wiring rather than
// shader text.
//
// `fillShaderCode` and `outlineShaderCode` are full standalone shader
// modules (vertex + fragment) for the per-instance spectre fill and
// edge-outline passes. They share the same 16-byte instance layout:
//   @location(1) iWorld   vec2f      tile translation in world units
//   @location(2) iCosSin  vec2f      snorm16x2-decoded (cos θ, sin θ)
//   @location(3) iColMir  vec4f      unorm8x4-decoded; .rgb fill color,
//                                     .w mirror flag (0/1 → ±1 inside vs)
//
// `lineVertexShaderBody` and `lineFragmentShaderBody` are *bodies* — they
// get spliced into the webgpu-instanced-lines wrapper, which provides
// the surrounding boilerplate (uniforms struct, @vertex entrypoint, …).
// See https://github.com/rreusser/webgpu-instanced-lines/blob/main/examples/closed-loop.ts
// for the closed-loop modular-index technique used here.

export const fillShaderCode = /* wgsl */`
struct View { scale: vec2f, offset: vec2f };
@group(0) @binding(0) var<uniform> view: View;

struct VsIn {
  @location(0) pos: vec2f,
  @location(1) iWorld: vec2f,
  @location(2) iCosSin: vec2f,
  @location(3) iColMir: vec4f,
};
struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) color: vec3f,
};

@vertex fn vs(in: VsIn) -> VsOut {
  let mirror = 1.0 - 2.0 * in.iColMir.w;
  let m = vec2f(in.pos.x, in.pos.y * mirror);
  let cs = in.iCosSin;
  let r = vec2f(cs.x * m.x - cs.y * m.y, cs.y * m.x + cs.x * m.y);
  let world = r + in.iWorld;
  var out: VsOut;
  out.pos = vec4f(world * view.scale + view.offset, 0.0, 1.0);
  out.color = in.iColMir.rgb;
  return out;
}
@fragment fn fs(in: VsOut) -> @location(0) vec4f {
  return vec4f(in.color, 1.0);
}
`;

export const outlineShaderCode = /* wgsl */`
struct View { scale: vec2f, offset: vec2f, outlineStrength: f32 };
@group(0) @binding(0) var<uniform> view: View;

struct VsIn {
  @location(0) pos: vec2f,
  @location(1) iWorld: vec2f,
  @location(2) iCosSin: vec2f,
  @location(3) iColMir: vec4f,
};
struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) color: vec3f,
};

@vertex fn vs(in: VsIn) -> VsOut {
  let mirror = 1.0 - 2.0 * in.iColMir.w;
  let m = vec2f(in.pos.x, in.pos.y * mirror);
  let cs = in.iCosSin;
  let r = vec2f(cs.x * m.x - cs.y * m.y, cs.y * m.x + cs.x * m.y);
  let world = r + in.iWorld;
  let edge = vec3f(0.0, 0.0, 0.0);
  var out: VsOut;
  out.pos = vec4f(world * view.scale + view.offset, 0.0, 1.0);
  out.color = mix(in.iColMir.rgb, edge, view.outlineStrength);
  return out;
}
@fragment fn fs(in: VsOut) -> @location(0) vec4f {
  return vec4f(in.color, 1.0);
}
`;

// ─── Metatile-outline (instanced lines) shader bodies ─────────────────
// Storage layout: 4 vec4f per quad — only the unique corner points,
// packed as (worldX, worldY, paletteIdx, widthPx). paletteIdx is an
// integer-valued f32 in [0, 11] indexing the 6-level Tableau palette
// (slots 0..5 finest→coarsest for normal outlines, slots 6..11 same
// ordering for mystic Γ outlines, with each mystic colour an OKLCH-
// derived lighter+hue-shifted variant of its normal pair). widthPx is
// the logical-pixel line width.
//
// Each quad is drawn as a closed loop using 7 indices per quad in the
// index space:
//   0..3 → corners p0, p1, p2, p3
//   4    → wrap to p0 (so the closure segment p3→p0 actually draws)
//   5    → extra wrap to p1 (so the join at the wrap point sees a
//          valid outgoing tangent and produces a smooth interior bevel
//          instead of an end-cap; the resulting duplicate p0→p1
//          segment is geometrically identical to the original and
//          paints over it without visible artefact)
//   6    → break sentinel (separates this quad's loop from the next)
export const lineVertexShaderBody = /* wgsl */`
@group(1) @binding(0) var<storage, read> linePoints: array<vec4f>;
struct LineUniforms {
  viewScale: vec2f,
  viewOffset: vec2f,
  dpr: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,
}
@group(1) @binding(1) var<uniform> lineU: LineUniforms;

struct Vertex {
  position: vec4f,
  width: f32,
  level: f32,
  widthPx: f32,
}

fn _breakVertex() -> Vertex {
  return Vertex(vec4f(0.0, 0.0, 0.0, 0.0), 0.0, 0.0, 0.0);
}

fn getVertex(index: i32) -> Vertex {
  let pCount = i32(uniforms.pointCount);
  if (index < 0 || index >= pCount) {
    return _breakVertex();
  }
  let loopIdx = index / 7;
  let localIdx = index - loopIdx * 7;
  if (localIdx == 6) {
    return _breakVertex();
  }
  let pIdx = u32(loopIdx * 4 + (localIdx % 4));
  let p = linePoints[pIdx];
  let world = p.xy;
  let clip = world * lineU.viewScale + lineU.viewOffset;
  let widthPx = p.w * lineU.dpr;
  return Vertex(
    vec4f(clip, 0.0, 1.0),
    widthPx,
    p.z,
    widthPx,
  );
}
`;

// 12-slot palette: 6 base colours (muted/subdued, OKLCH L=0.60
// C=0.075) for normal outlines, finest→coarsest, with hues spaced
// 60° apart (255° blue, 315° mauve, 25° terracotta, 85° olive, 145°
// sage, 205° teal) so successive levels rotate clearly through the
// wheel. The matching 6 mystic colours sit at the same hues but
// lighter and a touch more saturated (L=0.78, C=0.11) so each
// mystic Γ reads as a brighter highlight of its host level rather
// than a foreign accent.
// Border: pixelsFromEdge = (1 - |lineCoord.y|) × widthPx/2 in screen
// pixels; smoothstep(0, 1, …) gives a one-fragment AA falloff from
// the dark border at the edge to the slot colour at the centre.
export const lineFragmentShaderBody = /* wgsl */`
fn getColor(lineCoord: vec2f, paletteIdx: f32, widthPx: f32) -> vec4f {
  var palette = array<vec3f, 12>(
    vec3f(0.382407, 0.511405, 0.677137), //  0 base   h=255° #6282ad blue
    vec3f(0.569732, 0.449672, 0.624686), //  1 base   h=315° #91739f mauve
    vec3f(0.661262, 0.433471, 0.413636), //  2 base   h=25°  #a96f69 terracotta
    vec3f(0.583668, 0.489677, 0.290021), //  3 base   h=85°  #957d4a olive
    vec3f(0.390643, 0.550393, 0.393525), //  4 base   h=145° #648c64 sage
    vec3f(0.259559, 0.553860, 0.586249), //  5 base   h=205° #428d95 teal
    vec3f(0.532360, 0.731363, 0.986384), //  6 mystic h=255° #88bafc sky
    vec3f(0.823689, 0.634699, 0.909483), //  7 mystic h=315° #d2a2e8 lavender
    vec3f(0.964252, 0.608467, 0.579091), //  8 mystic h=25°  #f69b94 salmon
    vec3f(0.845689, 0.697529, 0.376245), //  9 mystic h=85°  #d8b260 gold
    vec3f(0.540324, 0.793068, 0.546524), // 10 mystic h=145° #8aca8b mint
    vec3f(0.308778, 0.798117, 0.849839), // 11 mystic h=205° #4fccd9 cyan
  );
  let i = clamp(i32(paletteIdx), 0, 11);
  let centerColor = palette[i];
  let borderColor = vec3f(0.08, 0.08, 0.10);
  let pixelsFromEdge = (1.0 - abs(lineCoord.y)) * widthPx * 0.5;
  let t = 1.0 - smoothstep(0.0, 1.0, pixelsFromEdge);
  return vec4f(mix(centerColor, borderColor, t), 1.0);
}
`;
