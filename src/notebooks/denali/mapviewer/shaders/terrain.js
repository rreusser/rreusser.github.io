// WGSL shaders for terrain tile rendering

import { atmosphereCode } from './atmosphere.js';

const uniformStruct = /* wgsl */`
struct Uniforms {
  mvp: mat4x4<f32>,
  model: mat4x4<f32>,
  elevation_scale: f32,
  cell_size_meters: f32,
  vertical_exaggeration: f32,
  texel_size: f32,
  show_tile_borders: f32,
  has_imagery: f32,
  slope_angle_opacity: f32,
  contour_opacity: f32,
  viewport_height: f32,
  show_wireframe: f32,
  slope_aspect_mask_above: f32,
  slope_aspect_mask_near: f32,
  slope_aspect_mask_below: f32,
  slope_aspect_opacity: f32,
  treeline_lower: f32,
  treeline_upper: f32,
  grid_data_size: f32,
  terrain_uv_offset: vec2<f32>,
  terrain_uv_scale: vec2<f32>,
  terrain_cell_size: f32,
  lighting_enabled: f32,
  shadow_strength: f32,
  ao_strength: f32,
  hillshade_strength: f32,
};
`;

export const terrainVertexShader = uniformStruct + /* wgsl */`

struct GlobalUniforms {
  camera_position: vec4<f32>,
  sun_direction: vec4<f32>,
  rayleigh_params: vec4<f32>,
  mie_params: vec4<f32>,
  cam_right: vec4<f32>,
  cam_up: vec4<f32>,
  extra_params: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var elevationTexture: texture_2d<f32>;
@group(2) @binding(0) var<uniform> globals: GlobalUniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) world_position: vec3<f32>,
  @location(2) elevation_m: f32,
  @location(3) slope_angle: f32,
  @location(4) slope_aspect_sin: f32,
  @location(5) slope_aspect_cos: f32,
};

fn loadElevation(coord: vec2<i32>) -> f32 {
  return textureLoad(elevationTexture, coord, 0).r;
}

@vertex
fn vs_main(@location(0) grid_pos: vec2<u32>) -> VertexOutput {
  var out: VertexOutput;

  let D = uniforms.grid_data_size;

  // Raw coords [0, D+4]. The outer ring (0 and >= D+3) is a skirt that hangs
  // below the tile edge to hide gaps between tiles at different LOD levels.
  // Inner ring (1 and D+2) are boundary vertices at tile edges.
  // Interior (2 to D+1) are texel centers.
  let raw_u = i32(grid_pos.x);
  let raw_v = i32(grid_pos.y);
  let inner_u = raw_u - 1;
  let inner_v = raw_v - 1;

  // Grid position: interior texel k at u = k - 0.5; boundaries at 0 and D
  let u = clamp(f32(inner_u) - 0.5, 0.0, D);
  let v = clamp(f32(inner_v) - 0.5, 0.0, D);

  // Map mesh inner coords (0..D+1) into the terrain elevation texture's
  // inner texel coords (0..512). The mesh covers (terrain_uv_scale * 512)
  // texels of terrain in each axis; each vertex therefore advances
  // (terrain_uv_scale * 512 / D) texels. When the imagery zoom matches
  // the terrain zoom this collapses to 1 texel per vertex (the original
  // 1:1 mapping). When the mesh is finer than the terrain (heavy zoom
  // delta during cold-load fallbacks), multiple vertices land on the
  // same texel — correct, just low-resolution. The previous code added
  // inner_u directly without scaling, which caused vertices at large
  // delta to read texels far outside the imagery region, producing
  // visible spike artifacts during loading.
  let texels_per_vertex_u = uniforms.terrain_uv_scale.x * 512.0 / D;
  let texels_per_vertex_v = uniforms.terrain_uv_scale.y * 512.0 / D;
  let t_u_f = uniforms.terrain_uv_offset.x * 512.0 + f32(inner_u) * texels_per_vertex_u;
  let t_v_f = uniforms.terrain_uv_offset.y * 512.0 + f32(inner_v) * texels_per_vertex_v;
  let t_inner_u = i32(round(t_u_f));
  let t_inner_v = i32(round(t_v_f));

  // Texel indices for elevation sampling (using terrain-space inner coords).
  // Interior: single texel. Boundary/skirt (<=0 or >=513): average two texels.
  var tex_u_a: i32 = t_inner_u;
  var tex_u_b: i32 = t_inner_u;
  if (t_inner_u <= 0) { tex_u_a = 0; tex_u_b = 1; }
  else if (t_inner_u >= 513) { tex_u_a = 512; tex_u_b = 513; }

  var tex_v_a: i32 = t_inner_v;
  var tex_v_b: i32 = t_inner_v;
  if (t_inner_v <= 0) { tex_v_a = 0; tex_v_b = 1; }
  else if (t_inner_v >= 513) { tex_v_a = 512; tex_v_b = 513; }

  // Average 1, 2, or 4 texels depending on edge/corner
  let elevation = (
    loadElevation(vec2<i32>(tex_u_a, tex_v_a)) +
    loadElevation(vec2<i32>(tex_u_b, tex_v_a)) +
    loadElevation(vec2<i32>(tex_u_a, tex_v_b)) +
    loadElevation(vec2<i32>(tex_u_b, tex_v_b))
  ) * 0.25;

  let pos = vec4<f32>(u, elevation, v, 1.0);
  out.position = uniforms.mvp * pos;
  out.uv = vec2<f32>((u + 1.0) / (D + 2.0), (v + 1.0) / (D + 2.0));
  out.world_position = (uniforms.model * pos).xyz;

  // Skirt: drop position in model space proportional to camera distance.
  // Elevation varying is also lowered so contours don't run down the skirt face.
  let Di = i32(D);
  let is_skirt = (raw_u == 0) || (raw_u >= Di + 3) || (raw_v == 0) || (raw_v >= Di + 3);
  var skirt_drop = 0.0;
  if (is_skirt) {
    let mpu = globals.sun_direction.w;
    let cam_dist = length(globals.camera_position.xyz - out.world_position);
    skirt_drop = cam_dist * mpu * 0.01;
    let skirt_pos = vec4<f32>(u, elevation - skirt_drop, v, 1.0);
    out.position = uniforms.mvp * skirt_pos;
  }

  // Slope angle still derived from the elevation texture for the slope
  // overlay + contour spacing; lit hillshade now comes from the baked
  // shading texture in the fragment shader.
  var lu = t_inner_u - 1; var ru = t_inner_u + 1;
  if (lu < 0) { lu = 0; ru = 2; }
  else if (ru > 513) { ru = 513; lu = 511; }
  var uv_ = t_inner_v - 1; var dv = t_inner_v + 1;
  if (uv_ < 0) { uv_ = 0; dv = 2; }
  else if (dv > 513) { dv = 513; uv_ = 511; }

  let zL = loadElevation(vec2<i32>(lu, t_inner_v));
  let zR = loadElevation(vec2<i32>(ru, t_inner_v));
  let zU = loadElevation(vec2<i32>(t_inner_u, uv_));
  let zD = loadElevation(vec2<i32>(t_inner_u, dv));

  let cellSize = uniforms.terrain_cell_size;
  let dzdx = (zR - zL) / (2.0 * cellSize);
  let dzdy = (zD - zU) / (2.0 * cellSize);

  out.elevation_m = elevation - skirt_drop;
  let gradient_mag = sqrt(dzdx * dzdx + dzdy * dzdy);
  out.slope_angle = atan(gradient_mag) * 57.29578;

  // Slope aspect: compass bearing of the downhill direction.
  // sin/cos of atan2(-dzdx, dzdy) = -dzdx/mag, dzdy/mag — just normalize.
  let safe_mag = max(gradient_mag, 1e-10);
  out.slope_aspect_sin = -dzdx / safe_mag;
  out.slope_aspect_cos = dzdy / safe_mag;

  return out;
}
`;

export const terrainFragmentShader = uniformStruct + `
` + atmosphereCode + /* wgsl */`

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(1) var shadingTexture: texture_2d<f32>;
@group(1) @binding(2) var shadingSampler: sampler;
@group(2) @binding(0) var<uniform> globals: GlobalUniforms;
@group(3) @binding(0) var imageryTexture: texture_2d<f32>;
@group(3) @binding(1) var imagerySampler: sampler;

fn srgbToLinear(c: vec3<f32>) -> vec3<f32> {
  return pow(c, vec3<f32>(2.2));
}

fn slopeAngleColor(deg: f32) -> vec4<f32> {
  // Gaia GPS-style discrete slope angle bands (sRGB -> linear)
  let gold   = pow(vec3<f32>(1.0, 0.78, 0.0), vec3<f32>(2.2));
  let yellow = pow(vec3<f32>(1.0, 0.55, 0.0), vec3<f32>(2.2));
  let orange = pow(vec3<f32>(1.0, 0.30, 0.0), vec3<f32>(2.2));
  let red    = pow(vec3<f32>(0.75, 0.0, 0.0), vec3<f32>(2.2));
  let purple = pow(vec3<f32>(0.4, 0.0, 0.6), vec3<f32>(2.2));
  let blue   = pow(vec3<f32>(0.0, 0.2, 0.8), vec3<f32>(2.2));
  let black  = vec3<f32>(0.0);

  // Uniform color blocks with 1 degree linear fades at boundaries
  // 26-29 green | 30-31 yellow | 32-34 orange | 35-45 red
  // 46-50 purple | 51-59 blue | 60+ black
  let t_enter  = smoothstep(24.0, 26.0, deg);
  let t_yellow = smoothstep(29.0, 30.0, deg);
  let t_orange = smoothstep(31.0, 32.0, deg);
  let t_red    = smoothstep(34.0, 35.0, deg);
  let t_purple = smoothstep(45.0, 46.0, deg);
  let t_blue   = smoothstep(50.0, 51.0, deg);
  let t_black  = smoothstep(59.0, 60.0, deg);

  var color = mix(gold, yellow, t_yellow);
  color = mix(color, orange, t_orange);
  color = mix(color, red, t_red);
  color = mix(color, purple, t_purple);
  color = mix(color, blue, t_blue);
  color = mix(color, black, t_black);
  return vec4<f32>(color, t_enter);
}

// Quadratic B-spline basis function (partition of unity with uniform knots).
// Input s is the normalized distance from the basis center in units of knot
// spacing. Support spans [-1.5, 1.5].
fn quadBSpline(s: f32) -> f32 {
  let a = abs(s);
  if (a >= 1.5) { return 0.0; }
  if (a >= 0.5) { let t = 1.5 - a; return 0.5 * t * t; }
  return 0.75 - a * a;
}

// Compute the total B-spline weight for selected slope aspect directions.
// aspect: compass bearing in radians (0=N, pi/2=E, +/-pi=S, -pi/2=W)
// mask: bitmask with bits 0-7 for N, NE, E, SE, S, SW, W, NW
// Returns 0..1 where 1 = full coverage (all 8 selected sum to exactly 1.0).
fn slopeAspectWeight(aspect: f32, mask: u32) -> f32 {
  var weight = 0.0;
  let TWO_PI = 6.2831853;
  let h = 0.7853982; // pi/4 = 45 degree knot spacing
  for (var i = 0u; i < 8u; i++) {
    if ((mask & (1u << i)) != 0u) {
      let center = f32(i) * h;
      var d = aspect - center;
      d = d - round(d / TWO_PI) * TWO_PI;
      weight += quadBSpline(d / h);
    }
  }
  return weight;
}

fn contourLinearstep(edge0: f32, edge1: f32, x: f32) -> f32 {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

// Returns (line_alpha, halo_alpha): the line itself at line_width, and a
// wider halo at halo_width. Both share the same per-octave Shepard
// weighting so they fade in/out together as zoom crosses a level.
fn blendedContours(elevation_ft: f32, tile_uv: vec2<f32>) -> vec2<f32> {
  let D = uniforms.grid_data_size;
  let divisions = 5.0;       // 40 -> 200 -> 1000 -> 5000
  let base_spacing = 40.0;   // finest contour spacing in feet
  let min_spacing = 8.0;     // minimum pixels between contours before octave shift
  let line_width = 2.0;
  let halo_width = line_width * 2.0;  // 200% of the line, drawn underneath
  let antialias = 1.0;
  // Halo gets a softer edge so it doesn't read as a second hard stroke
  // — its outer falloff spans more pixels than the line's, while the
  // inner edge is still tied to the same line_width so the two
  // transitions stay aligned.
  let halo_antialias = 2.0;
  let n = 3.0;

  // All derivatives must be computed before any non-uniform control flow
  let elev_grad = length(vec2<f32>(dpdx(elevation_ft), dpdy(elevation_ft)));
  let h_feet_pp = 0.5 * (fwidth(tile_uv.x) + fwidth(tile_uv.y))
    * (D + 2.0) * uniforms.terrain_cell_size * 3.28084;

  if (elev_grad < 1e-6) { return vec2<f32>(0.0, 0.0); }

  // Unclamped continuous octave from horizontal screen density.
  // Negative values mean the screen can resolve finer than base_spacing.
  let local_octave = log2(h_feet_pp * min_spacing / base_spacing) / log2(divisions);
  let contour_spacing = base_spacing * pow(divisions, ceil(local_octave));

  var plot_var = elevation_ft / contour_spacing;
  var width_scale = contour_spacing / elev_grad;

  // Shepard tone: each octave fades in, holds, and fades out
  var line_sum = 0.0;
  var halo_sum = 0.0;
  for (var i = 0; i < 3; i++) {
    let t = f32(i) + 1.0 - fract(local_octave);
    let weight = smoothstep(0.0, 1.0, t) * smoothstep(n, n - 1.0, t);

    let dist_px = (0.5 - abs(fract(plot_var) - 0.5)) * width_scale;
    line_sum += weight * contourLinearstep(
      0.5 * (line_width + antialias),
      0.5 * (line_width - antialias),
      dist_px
    );
    halo_sum += weight * contourLinearstep(
      0.5 * (halo_width + halo_antialias),
      0.5 * (halo_width - halo_antialias),
      dist_px
    );

    width_scale *= divisions;
    plot_var /= divisions;
  }

  return vec2<f32>(line_sum, halo_sum) / n;
}

fn applyAtmosphere(color: vec3<f32>, world_pos: vec3<f32>) -> vec3<f32> {
  let cam_pos = globals.camera_position.xyz;
  let cam_h_m = globals.camera_position.w;
  let mpu = globals.sun_direction.w;

  let world_ray = world_pos - cam_pos;
  let frag_h_m = world_pos.y * mpu / max(uniforms.vertical_exaggeration, 1e-6);
  let phys_ray = vec3<f32>(world_ray.x * mpu, frag_h_m - cam_h_m, world_ray.z * mpu);
  let dist_m = length(phys_ray);
  if (dist_m < 0.1) { return color; }
  let view_dir = phys_ray / dist_m;

  let result = computeScattering(cam_h_m, frag_h_m, dist_m, view_dir);
  let T = result[0];
  let inscatter = result[1];

  return color * T + inscatter * (vec3<f32>(1.0) - T);
}

@fragment
fn fs_main(
  @location(0) uv: vec2<f32>,
  @location(1) world_position: vec3<f32>,
  @location(2) elevation_m: f32,
  @location(3) slope_angle: f32,
  @location(4) slope_aspect_sin: f32,
  @location(5) slope_aspect_cos: f32,
) -> @location(0) vec4<f32> {
  let D = uniforms.grid_data_size;

  // Base color: satellite imagery or elevation-based fallback
  var base_color: vec3<f32>;
  if (uniforms.has_imagery > 0.5) {
    // Map from (D+2)-texel elevation UV to imagery UV [0,1]
    let imagery_uv = (uv * (D + 2.0) - 1.0) / D;
    let imagery = textureSampleLevel(imageryTexture, imagerySampler, imagery_uv, 0.0).rgb;
    base_color = srgbToLinear(imagery);
  } else {
    let minElev = 500.0;
    let maxElev = 6200.0;
    let normalized = clamp((elevation_m - minElev) / (maxElev - minElev), 0.0, 1.0);
    let gray = normalized * 0.15 + 0.05;
    base_color = vec3<f32>(gray, gray, gray);
  }

  // Slope angle overlay (before hillshade so shading applies to slope colors)
  let slope_opacity = uniforms.slope_angle_opacity;
  if (slope_opacity > 0.0) {
    let slope_col = slopeAngleColor(slope_angle);
    base_color = mix(base_color, slope_col.rgb, slope_col.a * slope_opacity);
  }

  // Slope aspect overlay: highlight selected compass directions within 30-45 degrees
  // Select mask based on elevation relative to treeline boundaries
  var aspect_mask = 0u;
  if (elevation_m > uniforms.treeline_upper) {
    aspect_mask = u32(uniforms.slope_aspect_mask_above);
  } else if (elevation_m > uniforms.treeline_lower) {
    aspect_mask = u32(uniforms.slope_aspect_mask_near);
  } else {
    aspect_mask = u32(uniforms.slope_aspect_mask_below);
  }
  if (aspect_mask != 0u && slope_angle > 29.0) {
    let aspect = atan2(slope_aspect_sin, slope_aspect_cos);
    let aspect_weight = slopeAspectWeight(aspect, aspect_mask);
    let aspect_fade = smoothstep(30.0, 35.0, slope_angle) * (1.0 - smoothstep(40.0, 45.0, slope_angle));
    let aspect_alpha = aspect_weight * aspect_fade * uniforms.slope_aspect_opacity;
    // Blend in sRGB (perceptual) space so the tint is equally visible
    // on both bright snow and dark rock.
    let base_srgb = pow(base_color, vec3<f32>(1.0 / 2.2));
    let blended_srgb = mix(base_srgb, vec3<f32>(0.1, 0.55, 0.05), aspect_alpha);
    base_color = pow(blended_srgb, vec3<f32>(2.2));
  }

  // Sample the baked shading (rgba8: nx, ny, ao, shadow). The shading
  // texture lives in terrain-tile space, so transform the imagery uv
  // (which is in mesh space, padded by the 1-texel skirt) the same way
  // the imagery branch above does. Then re-project via terrain_uv_*
  // for sub-tile rendering when the terrain tile is a parent of the
  // current imagery tile.
  let mesh_inner_uv = (uv * (D + 2.0) - 1.0) / D;
  let shading_uv = uniforms.terrain_uv_offset + mesh_inner_uv * uniforms.terrain_uv_scale;
  let shading = textureSampleLevel(shadingTexture, shadingSampler, shading_uv, 0.0);
  let nx = shading.r * 2.0 - 1.0;
  let ny = shading.g * 2.0 - 1.0;
  let ao = shading.b;
  let cast_shadow = shading.a;
  let nz = sqrt(max(0.0, 1.0 - nx * nx - ny * ny));
  // The bake stores nx = -df/dx (east-gradient surface tangent) and
  // ny = +df/dz (south-gradient). The world-up normal is (-df/dx, 1,
  // -df/dz) normalized, so the south component must be -ny.
  let baked_normal = vec3<f32>(nx, nz, -ny);
  let sun = globals.sun_direction.xyz;
  let sun_horizon = smoothstep(-0.02, 0.02, sun.y);
  // Gate lambertian by cast shadow as well as the geometric horizon: a
  // sun that's above the geometric horizon but still blocked by local
  // terrain isn't actually lighting the surface, so it shouldn't
  // produce a hillshade brighten either. Without this gate the
  // geometric-horizon ramp lifts sun-facing slopes from 0.27 to ~0.28
  // (capped by shadow_brightness) before the real terrain sunrise
  // lifts cast_shadow, producing a faint "double sunrise" — a momentary
  // first burst at geometric horizon, then the real second sunrise
  // when the sun clears the local skyline.
  let ndotl = max(0.0, dot(baked_normal, sun)) * sun_horizon * (1.0 - cast_shadow);
  // Subtractive lighting model. Baseline is the imagery / base color at
  // full brightness; each effect *darkens* the surface independently.
  //
  //   hillshade_strength → modulates lambert (1 - ndotl) darkening.
  //   shadow_strength    → modulates cast-shadow darkening.
  //   ao_strength        → modulates AO darkening (atan tonemap).
  //
  // Hillshade and cast shadow both come from the sun and combine via a
  // min() of brightnesses (= max of darknesses): a backside in cast
  // shadow is no darker than just being a backside, since the sun can
  // only fail to light a point one way at a time. AO multiplies on top
  // because the sky is a separate light source — its occlusion darkens
  // both lit and unlit areas.
  // lighting_enabled is the master toggle.
  let hillshade_brightness = mix(1.0, ndotl, clamp(uniforms.hillshade_strength, 0.0, 1.0));
  let shadow_brightness = 1.0 - clamp(cast_shadow * uniforms.shadow_strength, 0.0, 1.0);
  let direct_brightness = min(hillshade_brightness, shadow_brightness);
  // sqrt-warp the strength slider so the linear range gives more bite
  // at low/mid settings — the underlying atan tonemap is steep near 1.
  let aoC = clamp(sqrt(max(uniforms.ao_strength, 0.0)), 0.0, 0.999999);
  let aoS = aoC / (1.0 - aoC);
  let aoShade = clamp(1.0 - ao, 0.0, 1.0);
  let ao_factor = 1.0 - (2.0 / 3.14159265358979) * atan(aoS * aoShade);
  let lit_factor = direct_brightness * ao_factor;
  let lit = base_color * mix(1.0, lit_factor, uniforms.lighting_enabled);
  var terrain_color = clamp(lit, vec3<f32>(0.0), vec3<f32>(1.0));

  // Elevation contours (adaptive Shepard-tone blending across octaves).
  // Single fragment-shader pass, applied AFTER lighting so shadows
  // don't darken the contours. A moderate white halo at 200% line
  // width mixes in first, then the full-opacity black line on top:
  // on dark shadow backgrounds the halo lifts the local pixels to a
  // mid-gray that the black line contrasts against, while on bright
  // snow the halo is barely perceptible. Both are modulated by the
  // contour_opacity slider.
  let elevation_ft = elevation_m * 3.28084;
  let contour_pair = clamp(blendedContours(elevation_ft, uv) * 2.0, vec2<f32>(0.0), vec2<f32>(1.0));
  let halo_alpha = contour_pair.y * 0.05 * uniforms.contour_opacity;
  let line_alpha = contour_pair.x * uniforms.contour_opacity;
  terrain_color = mix(terrain_color, vec3<f32>(1.0), halo_alpha);
  terrain_color = mix(terrain_color, vec3<f32>(0.0), line_alpha);

  // Apply atmospheric scattering
  var result = applyAtmosphere(terrain_color, world_position);

  // Wireframe overlay
  if (uniforms.show_wireframe > 0.5) {
    let grid_wu = uv.x * (D + 2.0) - 1.0;
    let grid_wv = uv.y * (D + 2.0) - 1.0;
    let fu = fract(grid_wu + 0.5);
    let fv = fract(grid_wv + 0.5);
    let dist_u = min(fu, 1.0 - fu);
    let dist_v = min(fv, 1.0 - fv);
    let dist_diag = abs(fu + fv - 1.0) * 0.7071;
    let dfu = fwidth(grid_wu);
    let dfv = fwidth(grid_wv);
    let dfd = fwidth(fu + fv) * 0.7071;
    let w = 0.6;
    let wire_u = 1.0 - smoothstep(dfu * (w - 0.5), dfu * (w + 0.5), dist_u);
    let wire_v = 1.0 - smoothstep(dfv * (w - 0.5), dfv * (w + 0.5), dist_v);
    let wire_d = 1.0 - smoothstep(dfd * (w - 0.5), dfd * (w + 0.5), dist_diag);
    let wire = max(max(wire_u, wire_v), wire_d);
    result = mix(result, vec3<f32>(0.0, 0.6, 0.0), wire * 0.8);
  }

  // Tile border overlay
  if (uniforms.show_tile_borders > 0.5) {
    let grid_u = uv.x * (D + 2.0) - 1.0;
    let grid_v = uv.y * (D + 2.0) - 1.0;
    let border_u = 1.5 * fwidth(grid_u);
    let border_v = 1.5 * fwidth(grid_v);
    if (grid_u < border_u || grid_u > D - border_u || grid_v < border_v || grid_v > D - border_v) {
      return vec4<f32>(1.0, 0.0, 0.0, 1.0);
    }
  }

  return finalColor(result);
}
`;
