// WebGPU DEM tile viewer — the notebook's closing figure.
//
// Every per-tile bake pass runs on the GPU. A `rgba8unorm` texture per
// tile holds (nx, ny, ao, shadow) just like the old CPU path, but now
// the assembly runs through the same `line-sweep-core` kernels the notebook
// already builds for its interactive figures:
//
//   R = (nx + 1) / 2      world-space surface normal, x
//   G = (ny + 1) / 2      y (z reconstructed in the composite shader)
//   B = ao^γ              LSAO with γ=2 post-process, folded into pack
//   A = shadow            hard shadow, re-baked on every sun change
//
// The bake splits into two phases:
//
//   * Static bake   — runs once per tile lifetime when the elevation
//                     fetch resolves. Computes normals, LSAO with γ=2,
//                     and packs the result into the tile's rgba8
//                     texture via `copyBufferToTexture`. The alpha
//                     channel is left at 0.
//
//   * Shadow re-bake — runs on every render where the sun direction
//                      has moved since last submission. Clears the
//                      shared atomic shadow buffer, runs one hard-
//                      shadow sweep per visible tile (with parent-
//                      tile prewarm assembled from 4 (z − parentDZ)
//                      parents),
//                      then fullscreen alpha-blits the result into
//                      the tile texture's A channel. RGB is preserved
//                      via `writeMask: GPUColorWrite.ALPHA`.
//
// Parent-tile continuity: each `Tile` owns a horizon buffer assembled
// in a Web Worker from four cached (z − parentDZ) fetches covering the
// symmetric (2^parentDZ + 1)-tile neighbourhood around the comp tile.
// With parentDZ = 2 (default) that's a 320×320 quarter-res buffer
// covering 5×5 comp tiles; parentDZ = 1 is the original 384×384 half-
// res / 3×3 behavior. The worker also handles terrarium decoding and
// fetch deduplication so the main thread stays free for GPU work and
// pointer events.
//
// Positioning math runs on the CPU in double precision. Tile world
// coordinates and the viewport centre are `number` (IEEE-754 double),
// and only the per-tile screen-space offset is cast to f32 before
// being written into the tile's uniform buffer. That keeps things
// stable at high zoom where single precision would drop mantissa bits.
//
// The viewer reuses the caller's WebGPU `device` — the notebook
// already owns one for the compute-shader figure, so there's no
// second adapter request. It configures its own canvas on that device.

import {
  FP_SCALE,
  TILE_BAKE_UNIFORM_POOL_SIZE,
  createTileBakeResources,
  deriveSweepParams,
  getAlphaBindGroupLayout,
  getComputeBindGroupLayout,
  getNormalsBindGroupLayout,
  getOrBuildAlphaBlitPipeline,
  getOrBuildComputePipeline,
  getOrBuildNormalsPipeline,
  getOrBuildPackPipeline,
  getPackBindGroupLayout,
  packUniforms,
} from "./webgpu-pipelines.js";
import { sunAnglesAt } from "./solar-time.js";

const TAU = Math.PI * 2;
const AO_DIRECTIONS = 8;
const EARTH_CIRCUMFERENCE_M = 40075016.686;

function latLngToWorld(lat, lng, z, tileSize) {
  const n = Math.pow(2, z) * tileSize;
  const x = ((lng + 180) / 360) * n;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (2 * TAU)) * n;
  return [x, y];
}

function worldToLatLng(x, y, z, tileSize) {
  const n = Math.pow(2, z) * tileSize;
  const lng = (x / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return [lat, lng];
}

function parseHash(hash = location.hash) {
  const h = String(hash).replace(/^#/, "");
  const parts = h.split("/");
  if (parts.length >= 3) {
    const z = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    const lng = parseFloat(parts[2]);
    if (isFinite(z) && isFinite(lat) && isFinite(lng)) return { zoom: z, lat, lng };
  }
  return null;
}

/**
 * True for a hash this viewer wrote, i.e. "#<zoom>/<lat>/<lng>".
 *
 * The viewer and `expandable` both want the URL hash: the viewer stores
 * the map position there, while expandable uses it to say which figure
 * is open. Once the viewer has written a position, the hash no longer
 * names the figure, so a reload would land on a collapsed map pointing
 * at a location you cannot see. Handing this to expandable's
 * `hashMatch` lets it treat a map position as "this figure is open"
 * too.
 */
export function isLocationHash(hash) {
  // `?? ""` rather than letting parseHash's default fire: this is a
  // predicate on its argument, and falling through to the live
  // location.hash would make it answer a different question (and throw
  // outside a browser).
  return parseHash(hash ?? "") !== null;
}

function tileCenterLatLngRad(z, x, y) {
  const n = Math.pow(2, z);
  const lngRad = ((x + 0.5) / n) * TAU - Math.PI;
  const nMerc = Math.PI * (1 - (2 * (y + 0.5)) / n);
  const latRad = Math.atan(Math.sinh(nMerc));
  return [latRad, lngRad];
}

function tileLatCentre(z, y, N) {
  const n = Math.pow(2, z) * N;
  const worldY = y * N + N / 2;
  const nMerc = Math.PI * (1 - (2 * worldY) / n);
  return Math.atan(Math.sinh(nMerc));
}

function tilePxSizeM(z, y, N) {
  const lat = tileLatCentre(z, y, N);
  return (EARTH_CIRCUMFERENCE_M * Math.cos(lat)) / (Math.pow(2, z) * N);
}

// Latitude-independent pixel size for LSAO — removes cos(lat) so
// occlusion strength doesn't vary with latitude or jump at tile borders.
function tilePxSizeMRef(z, N) {
  return EARTH_CIRCUMFERENCE_M / (Math.pow(2, z) * N);
}

const SHADER = /* wgsl */ `
struct Global {
  viewportPx: vec4<f32>,   // xy = viewport size, z = shadingMode (0=lambertian,1=relief), w = reliefStrength
  sunDir: vec4<f32>,       // xyz = world-space sun direction, w unused
  params: vec4<f32>,       // x=kAmbient, y=kDirect, z=aoStrength, w=shadowStrength
  solar: vec4<f32>,        // x=sinDec, y=cosDec, z=gmstMinusRA (rad), w=useTime (0 or 1)
  hypso: vec4<f32>,        // x=rampMin (m), y=1/rampSpan, z=tintStrength, w=opennessTint
  ao: vec4<f32>,           // x=floorRaw, y=1 when the falloff is exp, z=contrast exponent, w unused
  imagery: vec4<f32>,      // x=satellite opacity, yzw unused
};

@group(0) @binding(0) var<uniform> g: Global;

// Hypsometric ramp, sampled uniformly across [rampMin, rampMin + span]
// and stored as Oklab (L, a, b, 1). Oklab rather than sRGB because the
// only conversion the shader needs is Oklab to sRGB, and because the
// blend between adjacent entries then happens in the same space the
// ramp was authored in.
@group(0) @binding(1) var<storage, read> ramp: array<vec4<f32>>;

struct TileData {
  originSize: vec4<f32>,   // xy = tile top-left in screen px, zw = tile size in screen px
  tileZXY: vec4<f32>,      // x=z (integer), y=tileX, z=tileY, w=raster size N
};

@group(1) @binding(0) var<uniform> t: TileData;
@group(1) @binding(1) var tileTex: texture_2d<f32>;
@group(1) @binding(2) var tileSampler: sampler;
// The same N x N elevation grid the bake passes read, bound read-only.
// Hypsometric tinting needs elevation at display time, and this buffer
// already exists per tile for the shadow re-bake, so the tint costs no
// extra memory: in CPU bake mode it was simply going unwritten.
@group(1) @binding(3) var<storage, read> elev: array<f32>;
// Satellite imagery for this tile, same z/x/y as the elevation tile.
// Bound to a 1x1 fully transparent placeholder whenever the tile has
// no imagery — either because imagery is switched off (in which case
// nothing was fetched and no per-tile texture exists) or because the
// fetch has not landed yet. The composite weights the layer by
// opacity * alpha, so the placeholder contributes exactly nothing
// and a tile fades in on its own as its image arrives.
@group(1) @binding(4) var satTex: texture_2d<f32>;

struct VsOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VsOut {
  var corners = array<vec2<f32>, 6>(
    vec2<f32>(0.0, 0.0),
    vec2<f32>(1.0, 0.0),
    vec2<f32>(0.0, 1.0),
    vec2<f32>(0.0, 1.0),
    vec2<f32>(1.0, 0.0),
    vec2<f32>(1.0, 1.0),
  );
  let c = corners[idx];
  let origin = t.originSize.xy;
  let sizePx = t.originSize.zw;
  let px = origin + c * sizePx;
  let ndcX = (px.x / g.viewportPx.x) * 2.0 - 1.0;
  let ndcY = 1.0 - (px.y / g.viewportPx.y) * 2.0;
  var out: VsOut;
  out.pos = vec4<f32>(ndcX, ndcY, 0.0, 1.0);
  out.uv = c;
  return out;
}

fn linearToSrgb(x: f32) -> f32 {
  let c = clamp(x, 0.0, 1.0);
  if (c <= 0.0031308) { return 12.92 * c; }
  return 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

// ---------------------------------------------------------------------
// Hypsometric tint
// ---------------------------------------------------------------------

// Bilinear fetch from the tile's elevation grid, matching the
// half-texel convention and clamp-to-edge behaviour of the hardware
// sampler used on the packed normal/AO/shadow texture, so the tint
// lines up with the shading rather than sliding half a pixel against
// it.
fn elevAt(ix: i32, iy: i32, n: i32) -> f32 {
  let cx = clamp(ix, 0, n - 1);
  let cy = clamp(iy, 0, n - 1);
  return elev[u32(cy * n + cx)];
}

fn sampleElev(uv: vec2<f32>, n: i32) -> f32 {
  let p = uv * f32(n) - vec2<f32>(0.5, 0.5);
  let b = floor(p);
  let f = p - b;
  let i0 = vec2<i32>(b);
  let h00 = elevAt(i0.x, i0.y, n);
  let h10 = elevAt(i0.x + 1, i0.y, n);
  let h01 = elevAt(i0.x, i0.y + 1, n);
  let h11 = elevAt(i0.x + 1, i0.y + 1, n);
  return mix(mix(h00, h10, f.x), mix(h01, h11, f.x), f.y);
}

// Concavity, read from the LSAO term already in the bake's blue
// channel, used to nudge where the ramp is sampled. Elevation alone
// flattens a view whose relief is small next to the ramp window: every
// feature maps to nearly the same colour and a canyon reads as one
// wash. Pulling hollows down the ramp brings the landforms back.
//
// This is a one-directional effect and that is inherent, not a
// shortcut. The sweep carries an infinite horizon: it starts level and
// only counts blockers strictly above the ray, so nothing can ever read
// as more open than level. Feed a spherical cap through an unclamped
// march and it does come out above 1 (1.005 for a 3 km radius, 1.015
// for 1 km), but the bake floors all of that to exactly 1, the same as
// flat ground. So convexity is not recoverable here, and the channel
// measures concavity and nothing else. That is also a defensible place
// to stop physically, since ground reflects little light compared with
// sky.
//
// What the baseline must not be is a constant. A pixel on a uniform
// hillside is partly occluded by its own slope, so against a constant
// it reads as concave and gets dragged down the ramp for having no
// shape at all. The right reference is the value the AO function
// returns for the shape with no curvature: an infinite plane of that
// pixel's own slope. The bake already stores the normal, so this costs
// one polynomial and samples no neighbouring texel.
//
//   cos²α has an exact closed form. Averaging 1 - sin²α over azimuth
//   with the plane's horizon tan α = max(0, tanθ·cos φ) gives
//   <sin²α> = (1 - cos θ)/2, so the raw sweep value is (1 + nz)/2 and
//   the enclosure is (1 - nz)/2. Matches the integral to 5e-7.
//
//   e^(−sin α) has no elementary form, so it is a least-squares fit in
//   sin θ, which is exactly |nxy|. Enclosure rises linearly in sin θ
//   near flat rather than in (1 - nz), and fitting the wrong variable
//   costs an order of magnitude: max error 0.023 over the full 0-90°
//   range and under 0.005 across 0-60°, where terrain lives.
//
// Both forms vanish at zero slope, so flat ground is neutral by
// construction rather than by calibration, and a planar hillside of any
// steepness stays near neutral too. Only ground more enclosed than its
// own slope predicts moves, and it moves down.
// Scale fitted to real terrain rather than to a synthetic field. Over
// 314k pixels of the tiles this map opens on, the raw residual runs
// p01 -0.402, p05 -0.285, min -0.671. The previous 0.6 was fitted to a
// synthetic field roughly 1.5x wider and left half the range unused:
// it clipped 0.01% of real pixels where 0.45 clips 0.38%.
const AO_REL_SCALE: f32 = 0.45;
const AO_PLANE_A: f32 = 0.404038;
const AO_PLANE_B: f32 = 0.499984;
const AO_PLANE_C: f32 = -1.285729;
const AO_PLANE_D: f32 = 0.859000;

fn enclosureOf(ao: f32, floorRaw: f32) -> f32 {
  let raw = sqrt(max(ao, 0.0));                                  // undo aoGamma = 2
  return clamp((1.0 - raw) / max(1.0 - floorRaw, 1e-6), 0.0, 1.0);
}

// Enclosure of an infinite plane with this normal. isExp selects the
// falloff the bake was run with; the two do not share a range, so
// without this the AO falloff radio would recalibrate the tint.
fn planeEnclosure(sinTheta: f32, nz: f32, isExp: f32) -> f32 {
  let s = clamp(sinTheta, 0.0, 1.0);
  let encCos2 = 0.5 * (1.0 - clamp(nz, 0.0, 1.0));
  let encExp = s * (AO_PLANE_A + s * (AO_PLANE_B + s * (AO_PLANE_C + s * AO_PLANE_D)));
  return clamp(mix(encCos2, encExp, isExp), 0.0, 1.0);
}

// The normal is packed into bytes, so a flat surface encodes as 128,
// i.e. |nxy| = 0.0055 rather than 0. At contrast 1 that bias is worth
// 0.19% of the ramp window, under one LUT entry, and rounds away. The
// contrast exponent expands small values hardest, though, and takes it
// to 3.5%, which is visible and would break the flat-ground guarantee.
// Subtracting the bias restores it exactly and is continuous, unlike a
// threshold. Slopes under about 0.3 degrees are below what the packed
// normal can resolve anyway, so nothing real is lost.
const AO_SLOPE_EPS: f32 = 0.008;

fn opennessOffset(ao: f32, floorRaw: f32, sinTheta: f32, nz: f32, isExp: f32, contrast: f32) -> f32 {
  let s = max(0.0, sinTheta - AO_SLOPE_EPS);
  let nzAdj = sqrt(max(0.0, 1.0 - s * s));
  let encHere = enclosureOf(ao, floorRaw);
  let encPlane = planeEnclosure(s, nzAdj, isExp);
  // Negative where the ground is more enclosed than its own slope
  // predicts. Positive values are possible but small, since the clamped
  // horizon leaves little headroom above a plane.
  let t = clamp((encPlane - encHere) / AO_REL_SCALE, -1.0, 1.0);
  // Contrast. On real terrain the residual bunches up near zero, so an
  // exponent below 1 pulls the crowded middle apart: measured over
  // 225k pixels, the interquartile spread goes from 0.161 at p = 1 to
  // 0.198 at p = 0.7 and 0.206 at p = 0.5, a 23-28% gain in the
  // separation between one landform and the next.
  //
  // It is odd in t, so zero stays zero and flat ground and uniform
  // hillsides keep their guarantees whatever the exponent. It does
  // drag the mean, because the distribution is still lopsided toward
  // enclosure: -0.178 at p = 1 against -0.277 at p = 0.7, which is
  // about 3% of the ramp window at a strength of 0.6. That is the
  // price, and it is why the control only reaches down to p = 0.5.
  //
  // Applying the exponent to the two enclosures *before* subtracting
  // them would avoid relying on oddness, but it buys almost nothing:
  // the same measurement moves the spread from 0.161 only to 0.165.
  //
  // The other cost is that expanding small values also expands the
  // residual a *uniform* hillside shows, which comes mostly from the
  // bake sampling only 8 azimuths so a plane's openness depends a
  // little on its aspect. Max |offset| on a uniform slope:
  //
  //     slope  angle    c=0     c=0.5     c=1
  //      0.30    17°   0.021    0.064    0.143
  //      1.00    45°   0.049    0.119    0.222
  //      1.70    60°   0.098    0.194    0.313
  //
  // At the default strength that is 1.5% of the ramp window on a 45°
  // hillside at c = 0.5. Harmless at the default, but at c = 1 on very
  // smooth steep ground it can show as faint aspect-dependent banding.
  return sign(t) * pow(abs(t), max(contrast, 0.05));
}

// Elevation to Oklab, linearly blending the two bracketing ramp
// entries. Outside the ramp's domain this clamps to the end entries.
fn rampAt(h: f32) -> vec3<f32> {
  let n = i32(arrayLength(&ramp));
  let t = clamp((h - g.hypso.x) * g.hypso.y, 0.0, 1.0) * f32(n - 1);
  let i0 = i32(floor(t));
  let i1 = min(i0 + 1, n - 1);
  let f = t - floor(t);
  return mix(ramp[u32(i0)].xyz, ramp[u32(i1)].xyz, f);
}

// Oklab to linear sRGB, from the matrices in Björn Ottosson's
// reference implementation (https://bottosson.github.io/posts/oklab/).
fn oklabToLinearSrgb(lab: vec3<f32>) -> vec3<f32> {
  let l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  let m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  let s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  let l = l_ * l_ * l_;
  let m = m_ * m_ * m_;
  let s = s_ * s_ * s_;
  return vec3<f32>(
     4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  );
}

// Gamma-encoded sRGB to Oklab, inverting the pair above. Used to
// bring satellite imagery into the same space the ramp colours live
// in, so the one shading routine applies to both.
fn srgbToLinear(x: f32) -> f32 {
  let c = clamp(x, 0.0, 1.0);
  if (c <= 0.04045) { return c / 12.92; }
  return pow((c + 0.055) / 1.055, 2.4);
}

fn srgbToOklab(srgb: vec3<f32>) -> vec3<f32> {
  let c = vec3<f32>(srgbToLinear(srgb.r), srgbToLinear(srgb.g), srgbToLinear(srgb.b));
  let l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  let m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  let s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  let l_ = pow(max(l, 0.0), 1.0 / 3.0);
  let m_ = pow(max(m, 0.0), 1.0 / 3.0);
  let s_ = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3<f32>(
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  );
}

fn inGamut(c: vec3<f32>) -> bool {
  return all(c >= vec3<f32>(-1e-4)) && all(c <= vec3<f32>(1.0001));
}

// Oklab to gamma-encoded sRGB, holding lightness and hue fixed and
// backing chroma off until the colour fits in the gamut. Clamping the
// channels instead would both shift hue and flatten any structure in
// the clipped channel, which on a shaded map shows up as patches of
// terrain that lose their relief. Bisection is safe because a chroma
// scale of zero is a neutral grey, always in gamut.
fn oklabToSrgbClipped(lab: vec3<f32>) -> vec3<f32> {
  let L = clamp(lab.x, 0.0, 1.0);
  var rgb = oklabToLinearSrgb(vec3<f32>(L, lab.y, lab.z));
  if (!inGamut(rgb)) {
    var lo = 0.0;
    var hi = 1.0;
    for (var i = 0; i < 12; i = i + 1) {
      let mid = 0.5 * (lo + hi);
      if (inGamut(oklabToLinearSrgb(vec3<f32>(L, lab.y * mid, lab.z * mid)))) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    rgb = oklabToLinearSrgb(vec3<f32>(L, lab.y * lo, lab.z * lo));
  }
  let c = clamp(rgb, vec3<f32>(0.0), vec3<f32>(1.0));
  return vec3<f32>(linearToSrgb(c.r), linearToSrgb(c.g), linearToSrgb(c.b));
}

// Shade an Oklab albedo by the composite's relative brightness factor
// and return gamma-encoded sRGB. Chroma scales with lightness rather
// than being held fixed: holding it fixed makes deep shade read as an
// unnaturally saturated version of the same hue, and pushes colours
// out of gamut exactly where the clipper has least room to work.
fn shadeOklab(lab: vec3<f32>, k: f32) -> vec3<f32> {
  let L2 = clamp(lab.x * k, 0.0, 1.0);
  let cs = select(0.0, L2 / max(lab.x, 1e-4), lab.x > 0.0);
  return oklabToSrgbClipped(vec3<f32>(L2, lab.y * cs, lab.z * cs));
}

// Invert web-mercator: (uv in tile, plus integer tile z/x/y) → lat/lng
// in radians. Uses WGSL's built-in sinh; the Gudermannian form
// atan(sinh(x)) gives the standard mercator-to-latitude map.
const PI_F: f32 = 3.14159265358979323846;
const TWO_PI_F: f32 = 6.28318530717958647693;
const THREE_HALF_PI_F: f32 = 4.71238898038468985769;

fn pixelToLatLngRad(uv: vec2<f32>, tileZ: f32, tileX: f32, tileY: f32) -> vec2<f32> {
  let n = exp2(tileZ);
  let lngRad = ((tileX + uv.x) / n) * TWO_PI_F - PI_F;
  let nMerc = PI_F * (1.0 - 2.0 * (tileY + uv.y) / n);
  let latRad = atan(sinh(nMerc));
  return vec2<f32>(latRad, lngRad);
}

// World-frame sun direction derived from the time-only quantities in
// g.solar and the per-pixel (lat, lng). Returns (x, y, z) in the same
// convention as g.sunDir — 0 = east (+x), +y = north, +z = up — so
// the caller can drop it into the existing shading code unchanged.
// Returned vector has unit length even when the sun is below the
// horizon (altitude < 0); callers gate with the terminator fade.
fn perPixelSunDir(uv: vec2<f32>) -> vec3<f32> {
  let ll = pixelToLatLngRad(uv, t.tileZXY.x, t.tileZXY.y, t.tileZXY.z);
  let phi = ll.x;
  let lam = ll.y;
  let sinPhi = sin(phi);
  let cosPhi = cos(phi);
  let H = g.solar.z + lam;
  let sinH = sin(H);
  let cosH = cos(H);
  let sinDec = g.solar.x;
  let cosDec = max(g.solar.y, 1e-6);
  let sinAlt = sinPhi * sinDec + cosPhi * cosDec * cosH;
  let cosAlt = sqrt(max(0.0, 1.0 - sinAlt * sinAlt));
  // suncalc convention: 0 = south, clockwise.
  let azS = atan2(sinH, cosH * sinPhi - (sinDec / cosDec) * cosPhi);
  // Rotate to notebook convention: 0 = east, counter-clockwise.
  let azN = THREE_HALF_PI_F - azS;
  return vec3<f32>(cosAlt * cos(azN), cosAlt * sin(azN), sinAlt);
}

@fragment
fn fs_main(in: VsOut) -> @location(0) vec4<f32> {
  let s = textureSample(tileTex, tileSampler, in.uv);
  let nxy = s.rg * 2.0 - vec2<f32>(1.0, 1.0);
  let nz = sqrt(max(0.0, 1.0 - dot(nxy, nxy)));
  let N = vec3<f32>(nxy.x, nxy.y, nz);
  let ao = s.b;
  let shadow = s.a;

  // Pick between the uniform (handle-driven) sun direction and a
  // per-pixel direction derived from time + lat/lng. In time mode we
  // also multiply the whole composite by a civil-twilight smoothstep
  // so the terminator sweeps darkness across relief shading too —
  // otherwise aspect shading would keep drawing ridges into the night.
  // The night side is semantically a cast shadow (no direct sun), so
  // its darkening rides the same shadowStrength slider — in fact the
  // nightMask is computed with the same 1 − strength·occlusion form
  // as shadowMask further down.
  let useTime = g.solar.w;
  let sunPP = perPixelSunDir(in.uv);
  let sunDir = mix(g.sunDir.xyz, sunPP, useTime);
  let twilight = smoothstep(-0.105, 0.035, sunPP.z); // ≈ (−6°, +2°)

  let aoContrast = g.params.z;
  let shadowStrength = g.params.w;

  let nightShadow = mix(0.0, 1.0 - twilight, useTime);
  let nightMask = 1.0 - shadowStrength * nightShadow;
  // Shadow-vs-altitude blend. In fixed mode, fade to "fully
  // shadowed" as the handle approaches the horizon — a grace note
  // so the view doesn't snap to black at dip.
  //
  // In time mode, fade to "fully shadowed" as well. Fading to *no*
  // shadow instead, which is what this did originally, lit the night
  // side back up: past the terminator a shadowed pixel lost its cast
  // shadow while the aspect relief faded out from under it too, so
  // terrain that had been darkening all afternoon turned round and
  // brightened once the sun was down — on a 45 degree slope facing
  // away from the sun, by a factor of nearly three. Fading to fully
  // shadowed makes the terminator a one-way ramp into the dark, and
  // it is also the physically sensible limit: no sun anywhere means
  // every pixel is in shadow. nightMask then stacks on top, so the
  // night floor sits below a daytime cast shadow, which is right —
  // a shadow at noon is still lit by the sky, and midnight is not.
  // See verify-night-shading.mjs for the swept terminator.
  let fixedHS = mix(1.0, shadow, saturate(g.sunDir.z / 0.035));
  let timeHS = mix(1.0, shadow, twilight);
  let horizonShadow = mix(fixedHS, timeHS, useTime);
  let shadowMask = 1.0 - shadowStrength * horizonShadow;

  // AO tonemap in sRGB space — matching the LSAO section's atan
  // contrast curve. Applied after sRGB conversion for better
  // perceptual dynamic range.
  // ao was stored as rawAo^2; use directly.
  let aoLin = ao;
  let aoC = clamp(aoContrast, 0.0, 0.999999);
  let aoS = aoC / (1.0 - aoC);
  let aoShade = clamp(1.0 - aoLin, 0.0, 1.0);
  let aoFactor = 1.0 - (2.0 / 3.14159265) * atan(aoS * aoShade);

  let reliefMode = g.viewportPx.z;
  let reliefStr = g.viewportPx.w;
  let kAmbient = g.params.x;
  let kDirect = g.params.y;

  let lambExag = kDirect * 1.33;
  let lambNxy = nxy * lambExag;
  let lambLen = length(vec3<f32>(lambNxy, nz));
  let lambN = vec3<f32>(lambNxy, nz) / lambLen;
  let diffuse = max(0.0, dot(lambN, sunDir));
  let lambertian = diffuse * shadowMask;

  // Relief shading adapted from maplibre's standard hillshade.
  // In time mode, reliefDark fades to zero per-pixel as the local
  // sun crosses the horizon, so the aspect cross-hatch disappears
  // on the night side and only LSAO (via aoFactor) textures the
  // terrain there.
  let slopeMag = length(nxy);
  let sunHL = length(sunDir.xy);
  let zFactor = 0.625 * sqrt(sunHL);
  let slopeAngle = atan(zFactor * slopeMag / max(nz, 0.001));
  let scaledSlope = min(slopeAngle * reliefStr * 2.0, 1.5);
  let aspectAlign = select(0.0, dot(nxy, sunDir.xy) / (slopeMag * sunHL), slopeMag > 0.001 && sunHL > 0.001);
  let shadeDir = 0.5 + 0.5 * aspectAlign;
  let reliefFade = mix(1.0, twilight, useTime);
  let reliefDark = sin(scaledSlope) * (1.0 - shadeDir) * reliefFade;
  let reliefSrgb = pow(1.0 - reliefDark * 0.85, 2.5) * shadowMask;

  // Debug mode: show the raw bake texture, darkened by shadow.
  // A channel encodes shadow as 1=shadowed, 0=lit, so invert it.
  if (reliefMode >= 1.5) {
    return vec4<f32>(s.rgb * (1.0 - 0.5 * s.a), 1.0);
  }

  // Composite in sRGB: convert base shading to sRGB, then multiply
  // by aoFactor in perceptual space. No linearToSrgb at the end.
  // nightMask is 1 outside time mode; inside time mode it's a civil-
  // twilight smoothstep on the per-pixel altitude, so the terminator
  // darkens both lambertian and relief together.
  let baseSrgb = mix(linearToSrgb(lambertian), reliefSrgb, reliefMode);
  let v = clamp(baseSrgb * aoFactor * nightMask, 0.0, 1.0);

  let tint = g.hypso.z;
  // Sampled unconditionally. The binding always carries a texture, so
  // there is nothing to guard against, and keeping the fetch out of a
  // branch keeps it in uniform control flow. Weighting by the sampled
  // alpha is what makes a tile with no image yet cost nothing: the
  // placeholder is transparent, so its weight is zero.
  let sat = textureSample(satTex, tileSampler, in.uv);
  let satWeight = clamp(g.imagery.x, 0.0, 1.0) * sat.a;
  if (tint <= 0.0 && satWeight <= 0.0) {
    return vec4<f32>(v, v, v, 1.0);
  }

  // Shading is applied as a *relative* brightness, not as a multiply.
  // v0 is what flat, unoccluded, unshadowed ground would render at
  // under the same sun, so k = v / v0 is 1 on the flats and departs
  // from 1 only where the terrain actually does something. That keeps
  // the ramp colour intact where there is no relief to show; a plain
  // multiply would instead drag the whole map toward black by
  // whatever the average shading happens to be, which is the usual
  // reason tinted relief comes out muddy.
  //
  // The 0.35 floor stops a low sun in lambertian mode from dividing
  // by something near zero and blowing the tint out to white.
  let flatLamb = linearToSrgb(clamp(sunDir.z, 0.0, 1.0));
  let v0 = max(mix(flatLamb, 1.0, reliefMode), 0.35);
  let k = clamp(v / v0, 0.0, 2.0);

  // Layers, painted bottom up over the shaded white base: the
  // hypsometric ramp by tint, then satellite imagery by its own
  // opacity. Both are albedos, and both go through the same shading
  // factor before they are mixed in, so imagery picks up the relief,
  // the shadows and the terminator exactly as the ramp does, and the
  // two can be blended in any proportion.
  var layered = vec3<f32>(v, v, v);

  if (tint > 0.0) {
    // Sample the ramp at the pixel's elevation, shifted by openness. The
    // shift is expressed as a fraction of the ramp window rather than in
    // metres, so it keeps its visual weight when the window is resized.
    // At full strength it reaches half the window either way, which is
    // enough for openness alone to traverse the whole ramp.
    let h = sampleElev(in.uv, i32(t.tileZXY.w));
    let rampSpan = 1.0 / max(g.hypso.y, 1e-9);
    let hSample = h + g.hypso.w * opennessOffset(ao, g.ao.x, slopeMag, nz, g.ao.y, g.ao.z) * 0.5 * rampSpan;
    layered = mix(layered, shadeOklab(rampAt(hSample), k), tint);
  }

  if (satWeight > 0.0) {
    layered = mix(layered, shadeOklab(srgbToOklab(sat.rgb), k), satWeight);
  }

  return vec4<f32>(layered, 1.0);
}
`;

export function createTileViewer(opts) {
  const {
    container,
    device,
    format,
    tileUrl,
    tileSize = 256,
    minZoom = 6,
    maxZoom = 14,
    zoom: initialZoom = 11,
    center: initialCenter = [0, 0],
    // Optional satellite-imagery source, same {z}/{x}/{y} template
    // form as `tileUrl` and fetched on the same tile grid, so one
    // image lands per elevation tile at whatever size the source
    // serves. Nothing here is touched — no fetch, no texture, no
    // decode — until `satOpacity` is raised above zero, and it is all
    // released again when it goes back to zero. `imageryAttribution`
    // is HTML shown in a corner chip for as long as imagery is
    // visible; most sources require the credit.
    imageryUrl = null,
    imageryAttribution = "",
    // Parent-horizon zoom delta. At `parentDZ = dz` a 2×2 block of
    // (z - dz) parents guarantees a (2^dz + 1)×(2^dz + 1) target-tile
    // symmetric window around the comp tile at (1/2^dz) parent
    // resolution. `dz = 2` gives 5×5 coverage at quarter-res; `dz = 1`
    // is the original 3×3-tile / half-res behavior.
    //
    // Default `null` selects dz = 2 wherever the pyramid allows it
    // (dz = 1 right above minZoom). dz is deliberately capped at 2: the
    // seam error at a tile's sun-facing edges is dominated by how well
    // the ring resolves blockers just across the boundary, and that
    // error grows roughly linearly with 2^dz — at dz ≥ 3 the near
    // field degrades so much that the ring is barely better than no
    // prewarm at all within a parent texel of the seam. The price of
    // the cap is warmup reach: the ring spans W·2^dz/2 child pixels
    // (~5 km at z = 14), so very long low-sun shadows from terrain
    // beyond that are truncated. Extending reach without wrecking the
    // near field would take a second, coarser far-field ring, not a
    // bigger dz. Pass a number to override.
    parentDZ = null,
  } = opts;

  container.style.position = container.style.position || "relative";
  container.style.overflow = "hidden";
  container.style.touchAction = "none";
  container.style.cursor = "grab";
  container.style.userSelect = "none";
  container.style.background = container.style.background || "#ffffff";

  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.display = "block";
  container.appendChild(canvas);

  // Size chip: a small pill in the corner reporting the exact pixel
  // size a recording will come out as. It flashes on every resize so
  // the user can pick a recording resolution just by sizing the
  // window, WYSIWYG, and the animation panel pins it while open.
  // The figure's backing store is device pixels, so on a 2x display
  // the chip reads twice the figure's CSS size; that is the honest
  // number, since a capture reads the backing store.
  const evenDown = (v) => Math.max(2, v - (v % 2));
  const sizeChip = document.createElement("div");
  sizeChip.style.cssText =
    // Above the sun handle and ramp editor, which both sit at 500. It
    // is pointer-events:none, so sitting on top costs them nothing.
    "position:absolute; right:8px; bottom:8px; z-index:600;" +
    " pointer-events:none;" +
    " font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;" +
    " font-variant-numeric:tabular-nums;" +
    " padding:2px 6px; border-radius:4px;" +
    " background:rgba(0,0,0,0.55); color:#fff;" +
    " opacity:0; transition:opacity 180ms ease;";
  container.appendChild(sizeChip);
  let sizeChipTimer = 0;
  let sizeChipPinned = false;
  let sizedOnce = false;

  function updateSizeChip(flash) {
    sizeChip.textContent = `${evenDown(viewportW)} \u00d7 ${evenDown(viewportH)}`;
    if (sizeChipPinned) {
      clearTimeout(sizeChipTimer);
      sizeChip.style.opacity = "1";
      return;
    }
    if (!flash) return;
    sizeChip.style.opacity = "1";
    clearTimeout(sizeChipTimer);
    sizeChipTimer = setTimeout(() => {
      sizeChip.style.opacity = "0";
    }, 1600);
  }

  // Imagery credit. Hidden until the satellite layer is actually
  // visible, since that is the only time the credit is owed. Top-left
  // is the one free corner of this figure — the sun handle has the
  // top-right, the ramp editor the bottom-left and the size chip the
  // bottom-right. It is not captured by `captureFrame` (that reads the
  // WebGPU swap chain, not the DOM), so a recording carries no chip
  // burned into it.
  let attributionChip = null;
  if (imageryUrl && imageryAttribution) {
    attributionChip = document.createElement("div");
    attributionChip.style.cssText =
      "position:absolute; left:8px; top:8px; z-index:600;" +
      " font:10px/1.4 ui-sans-serif,system-ui,sans-serif;" +
      " padding:2px 6px; border-radius:4px;" +
      " background:rgba(255,255,255,0.72); color:#333;" +
      " display:none;";
    attributionChip.innerHTML = imageryAttribution;
    for (const a of attributionChip.querySelectorAll("a")) {
      a.style.color = "#0366d6";
    }
    container.appendChild(attributionChip);
  }

  const gpuCtx = canvas.getContext("webgpu");
  gpuCtx.configure({
    device,
    format,
    alphaMode: "premultiplied",
    // COPY_SRC lets captureFrame() copy the swap-chain texture into a
    // readback buffer inside the *same* command buffer as the render
    // pass. That sidesteps the race lib/webgpu-snapshot.js documents:
    // once the browser presents the frame the canvas reads back blank,
    // so toDataURL() only works synchronously after submit.
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });

  // ------------------------------------------------------------------
  // Data-prep worker: handles tile fetching, terrarium decoding, and
  // parent horizon assembly off the main thread.
  // ------------------------------------------------------------------
  const worker = new Worker(
    new URL("./tile-viewer-worker.js", import.meta.url),
    { type: "module" },
  );

  // Auto parentDZ: always 2 when the pyramid has a level there, 1 just
  // above minZoom. Never more — a coarser ring resolves the blockers
  // immediately across the tile seam so poorly that the sun-facing
  // seam line gets *worse* with every extra level (see the constructor
  // opt comment for the reach trade-off this accepts).
  function pickAutoParentDZ(z) {
    return Math.max(1, Math.min(2, z - minZoom));
  }
  let currentParentDZ = -1;
  let parentScale = 1;
  function recomputeParentDZ() {
    const newDZ = parentDZ != null
      ? Math.max(1, parentDZ | 0)
      : pickAutoParentDZ(baseZoom);
    if (newDZ === currentParentDZ) return false;
    currentParentDZ = newDZ;
    parentScale = 1 << newDZ;
    worker.postMessage({ type: "init", tileUrl, parentDZ: newDZ });
    return true;
  }

  // ------------------------------------------------------------------
  // CPU bake worker pool: parallel CPU-side tile baking as an
  // alternative to the GPU compute path.
  // ------------------------------------------------------------------
  const cpuPoolSize = Math.min(navigator.hardwareConcurrency || 4, 8);
  const cpuWorkers = [];
  for (let i = 0; i < cpuPoolSize; i++) {
    cpuWorkers.push(new Worker(new URL("./cpu-bake-worker.js", import.meta.url), { type: "module" }));
  }
  const cpuIdle = [...cpuWorkers];
  const cpuQueue = []; // pending {tile, msg, resolve} items

  function cpuDispatch(tile, msg) {
    return new Promise((resolve) => {
      if (tile.destroyed) { resolve(null); return; }
      const item = { tile, msg, resolve };
      if (cpuIdle.length > 0) {
        cpuSend(cpuIdle.pop(), item);
      } else {
        cpuQueue.push(item);
      }
    });
  }
  function cpuSend(worker, item) {
    const t0 = performance.now();
    worker.onmessage = (e) => {
      const ms = (performance.now() - t0).toFixed(0);
      const t = item.tile;
      const dest = t.destroyed ? " (destroyed)" : "";
      console.log(`[tile] ${item.msg.type} ${t.z}/${t.x}/${t.y} done in ${ms}ms${dest}, queue=${cpuQueue.length}`);
      cpuIdle.push(worker);
      item.resolve(e.data);
      // Drain destroyed tiles from the front of the queue before
      // dispatching the next item — avoids wasting a worker on a
      // tile that has already been panned off screen.
      let skipped = 0;
      while (cpuQueue.length > 0 && cpuQueue[0].tile.destroyed) {
        cpuQueue.shift();
        skipped++;
      }
      if (skipped > 0) console.log(`[tile] skipped ${skipped} destroyed tiles from queue`);
      if (cpuQueue.length > 0) cpuSend(cpuIdle.pop(), cpuQueue.shift());
    };
    worker.postMessage(item.msg, getTransferables(item.msg));
  }
  function getTransferables(msg) {
    const list = [];
    if (msg.heights?.buffer) list.push(msg.heights.buffer);
    if (msg.horizon?.buffer) list.push(msg.horizon.buffer);
    if (msg.cachedNx?.buffer) list.push(msg.cachedNx.buffer);
    if (msg.cachedNy?.buffer) list.push(msg.cachedNy.buffer);
    if (msg.cachedAo?.buffer) list.push(msg.cachedAo.buffer);
    return list;
  }

  const pendingTiles = new Map(); // "z/x/y" -> { resolve, reject }

  worker.onmessage = (e) => {
    const msg = e.data;
    const key = `${msg.z}/${msg.x}/${msg.y}`;
    const pending = pendingTiles.get(key);
    if (!pending) return;
    pendingTiles.delete(key);
    if (msg.type === "tile") {
      pending.resolve({ comp: msg.comp, horizon: msg.horizon });
    } else if (msg.type === "error") {
      pending.reject(new Error(msg.message));
    }
  };

  const shaderModule = device.createShaderModule({
    code: SHADER,
    label: "tile-viewer",
  });

  const globalBindGroupLayout = device.createBindGroupLayout({
    label: "tile-viewer global",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "read-only-storage" },
      },
    ],
  });
  const tileBindGroupLayout = device.createBindGroupLayout({
    label: "tile-viewer tile",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: "float" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: { type: "filtering" },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 4,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: "float" },
      },
    ],
  });
  const pipeline = device.createRenderPipeline({
    label: "tile-viewer pipeline",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [globalBindGroupLayout, tileBindGroupLayout],
    }),
    vertex: { module: shaderModule, entryPoint: "vs_main" },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

  // Stand-in for a tile's satellite texture. One texel, all zeroes, so
  // it is fully transparent and the composite's `opacity * alpha`
  // weight comes out zero. Every tile binds this until it has an image
  // of its own, which is what lets the imagery layer be allocated per
  // tile and on demand rather than up front: the bind group layout is
  // satisfied either way. 256 bytes of VRAM, shared by every tile.
  const emptySatTexture = device.createTexture({
    size: [1, 1, 1],
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    label: "tile-viewer empty imagery",
  });
  device.queue.writeTexture(
    { texture: emptySatTexture },
    new Uint8Array([0, 0, 0, 0]),
    { bytesPerRow: 4 },
    { width: 1, height: 1 },
  );
  const emptySatView = emptySatTexture.createView();

  // Global uniform buffer (112 bytes: seven vec4s — viewport, sunDir,
  // params, solar, hypso, ao, imagery).
  const globalBuffer = device.createBuffer({
    size: 112,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: "tile-viewer global uniforms",
  });

  // Hypsometric ramp LUT: Oklab (L, a, b, 1) per entry. Starts as a
  // neutral mid-grey so the buffer is never read uninitialised; the
  // first setRamp replaces it. Tinting is off until setRamp is called
  // with a non-zero strength, so what is in here before then is only
  // ever a safety net.
  const RAMP_SIZE = 512;
  const rampBuffer = device.createBuffer({
    size: RAMP_SIZE * 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    label: "tile-viewer hypsometric ramp",
  });
  {
    const init = new Float32Array(RAMP_SIZE * 4);
    for (let i = 0; i < RAMP_SIZE; i++) {
      init[i * 4] = 0.75;
      init[i * 4 + 3] = 1;
    }
    device.queue.writeBuffer(rampBuffer, 0, init);
  }

  const globalBindGroup = device.createBindGroup({
    layout: globalBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: globalBuffer } },
      { binding: 1, resource: { buffer: rampBuffer } },
    ],
  });
  const globalData = new Float32Array(28);

  // ------------------------------------------------------------------
  // GPU tile-bake resources.
  //
  // The raster size per tile (`bakeN`) is not knowable at viewer-
  // construction time — Mapterhorn serves 512×512 tiles while the
  // notebook passes `tileSize: 256` as the *mercator* tile size for
  // positioning, and the two can differ. So we lazily allocate the
  // shared working buffers on the first fetch, then reuse them for
  // every subsequent tile. All tiles in a single viewer instance are
  // required to share the same raster size (a reasonable assumption
  // for a single tile provider).
  // ------------------------------------------------------------------
  let bakeRes = null;
  let bakeN = 0;
  function ensureBakeResources(N) {
    if (bakeRes !== null) {
      if (N !== bakeN) {
        throw new Error(
          `tile-viewer: raster size changed mid-session (was ${bakeN}, got ${N})`,
        );
      }
      return;
    }
    bakeN = N;
    bakeRes = createTileBakeResources(device, { N });

    const packBuf = new ArrayBuffer(16);
    new Uint32Array(packBuf, 0, 1)[0] = N;
    const packF32 = new Float32Array(packBuf, 4, 3);
    packF32[0] = FP_SCALE;
    packF32[1] = 2.0; // aoGamma
    packF32[2] = 0;
    device.queue.writeBuffer(bakeRes.packUniform, 0, packBuf);

    const alphaBuf = new ArrayBuffer(16);
    new Uint32Array(alphaBuf, 0, 1)[0] = N;
    const alphaF32 = new Float32Array(alphaBuf, 4, 3);
    alphaF32[0] = FP_SCALE;
    alphaF32[1] = 0;
    alphaF32[2] = 0;
    device.queue.writeBuffer(bakeRes.alphaUniform, 0, alphaBuf);
  }

  // Double-precision viewport + lighting state. Zoom is continuous;
  // `baseZoom` is the integer zoom level whose tiles we actually fetch
  // (rounded to nearest), and `scale` applies the fractional part as a
  // display-only magnification so mid-zoom gestures don't trigger
  // re-fetches. `centerWorldX/Y` is expressed in `baseZoom` world
  // pixels — it gets rescaled whenever `baseZoom` changes.
  const hashState = parseHash();
  let zoom = hashState ? hashState.zoom : initialZoom;
  let baseZoom = Math.round(zoom);
  recomputeParentDZ();
  const initLat = hashState ? hashState.lat : initialCenter[0];
  const initLng = hashState ? hashState.lng : initialCenter[1];
  let [centerWorldX, centerWorldY] = latLngToWorld(
    initLat,
    initLng,
    baseZoom,
    tileSize,
  );
  let viewportW = 1;
  let viewportH = 1;
  let needsRender = true;
  // Resolve the sun direction for a tile's shadow bake. In fixed mode
  // every tile gets the handle-driven global direction; in time mode
  // each tile resolves its own direction from its geographic centre,
  // so shadows are stable under panning (newly revealed tiles still
  // bake with their own centre angles). altDeg is clamped at a small
  // positive floor so tiles on the far side of the terminator don't
  // try to sweep at negative altitudes — those tiles' shadows are
  // faded out in the composite anyway.
  function tileSunAngles(tile) {
    if (lighting.useTime && lighting.solar) {
      const [lat, lng] = tileCenterLatLngRad(tile.z, tile.x, tile.y);
      const a = sunAnglesAt(lighting.solar, lat, lng);
      return { azDeg: a.azDeg, altDeg: Math.max(0.5, a.altDeg) };
    }
    const sunZc = Math.max(-1, Math.min(1, lighting.sunZ));
    const altDeg = (Math.asin(sunZc) * 180) / Math.PI;
    const azDeg = (Math.atan2(lighting.sunY, lighting.sunX) * 180) / Math.PI;
    return { azDeg, altDeg };
  }

  let sunDirty = true;
  let sunGeneration = 0;
  let hqPending = false;

  // Sun altitude at the view centre, in degrees, for the night-side
  // re-bake skip. Only meaningful in time mode.
  function centerSunAltDeg() {
    if (!lighting.useTime || !lighting.solar) return 90;
    const [lat, lng] = worldToLatLng(centerWorldX, centerWorldY, baseZoom, tileSize);
    return sunAnglesAt(lighting.solar, (lat * Math.PI) / 180, (lng * Math.PI) / 180).altDeg;
  }
  let hashTimer = 0;
  function scheduleHashFlush() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      const [cLat, cLng] = worldToLatLng(centerWorldX, centerWorldY, baseZoom, tileSize);
      const prec = Math.max(0, Math.ceil(zoom) + 1);
      const fmt = (v, p) => v.toFixed(p).replace(/\.?0+$/, "");
      const newHash = `#${fmt(zoom, 2)}/${fmt(cLat, prec)}/${fmt(cLng, prec)}`;
      if (location.hash !== newHash) {
        history.replaceState(null, "", newHash);
      }
    }, 300);
  }

  const displayScale = () => Math.pow(2, zoom - baseZoom);

  // Backing-store resolution. The figure is laid out in CSS pixels but
  // the canvas is sized in device pixels, so a 2x display actually
  // resolves the 512-texel terrain raster and the merged satellite
  // block instead of handing three quarters of them to the compositor
  // to throw away. Capped at 2: past that the fragment cost keeps
  // growing and there is nothing left for the eye to pick up.
  const MAX_PIXEL_RATIO = 2;
  const resolvePixelRatio = () =>
    Math.max(1, Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1));
  let pixelRatio = resolvePixelRatio();

  // World (baseZoom tile pixels) to canvas device pixels. This is the
  // space `viewportW`/`viewportH`, the `viewportPx` uniform and every
  // tile rectangle live in. Pointer events arrive in CSS pixels and are
  // converted at the handler boundary, so nothing in between has to
  // know the pixel ratio.
  const screenScale = () => displayScale() * pixelRatio;

  const lighting = {
    sunX: 0,
    sunY: 0,
    sunZ: 1,
    kAmbient: 0.3,
    kDirect: 0.7,
    aoStrength: 1,
    shadowStrength: 1,
    // Shadow re-bake controls. `sunRadiusDeg` drives the soft-shadow
    // altitude smoothstep; `shadowSamples` is the number of stratified
    // azimuth offsets averaged per pixel. 1 sample + radius > 0 gives
    // a softened hard-edge shadow; raising the sample count smooths
    // the azimuth direction of the penumbra.
    sunRadiusDeg: 2.5,
    shadowSamples: 6,
    sunInteracting: false,
    shadingMode: 0,
    reliefStrength: 1,
    bakeMode: "cpu",
    lsaoFalloff: "exp",
    // Per-pixel sun-position mode (time-driven). When useTime is
    // truthy and solar is set, the composite shader derives sunDir
    // per fragment from the tile's geographic coordinates plus the
    // CPU-precomputed (sinDec, cosDec, gmstMinusRA) in `solar`. The
    // shadow sweep still consumes the scalar sunX/Y/Z above — those
    // represent the sun direction at the view centre.
    useTime: false,
    solar: { sinDec: 0, cosDec: 1, gmstMinusRA: 0 },
    // Hypsometric tint. `tintStrength` of 0 leaves the composite
    // exactly as it was before tinting existed (a grey shaded relief);
    // 1 is the full elevation ramp. `rampMin`/`rampMax` are the
    // elevations in metres that the ramp LUT spans.
    tintStrength: 0,
    rampMin: 0,
    rampMax: 5200,
    // Openness tint: how far the LSAO term is allowed to shift where
    // the ramp is sampled, as a fraction of half the ramp window.
    opennessTint: 0,
    // How hard to pull apart the crowded middle of that signal, 0 to 1.
    opennessContrast: 0,
    // Satellite imagery, mixed over the tint. Exactly zero means the
    // layer does not exist: no tile has an image, none is in flight,
    // and no imagery texture is allocated. The first non-zero value
    // starts the fetches, and going back to zero frees them again.
    satOpacity: 0,
  };

  const clampSatOpacity = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
  // Imagery is live only when the viewer was given a source and the
  // opacity is above zero. Every fetch and every texture allocation is
  // gated on this, so with the slider at zero the layer costs nothing
  // beyond the shared 1×1 placeholder.
  const imageryLive = () =>
    !!imageryUrl && clampSatOpacity(lighting.satOpacity) > 0;
  const imageryTileUrl = (z, x, y) =>
    imageryUrl.replace("{z}", z).replace("{x}", x).replace("{y}", y);

  // Inverse-normal CDF (Peter Acklam's rational approximation). Used
  // to stratify the azimuth offsets of the N shadow samples across a
  // Gaussian matched to the altitude smoothstep — same construction
  // as the notebook's `#soft-shadow-compute` driver.
  const normInv = (p) => {
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const plow = 0.02425;
    const phigh = 1 - plow;
    let q, r;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
    if (p <= phigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  };

  const tiles = new Map(); // "z/x/y" -> Tile
  const staleTiles = []; // Tiles from previous zoom levels, kept until children are ready
  const bakeQueue = []; // Tiles awaiting static bake, processed one per frame

  class Tile {
    constructor(z, x, y) {
      this.z = z;
      this.x = x;
      this.y = y;
      this.ready = false;
      this.destroyed = false;
      this.tileData = new Float32Array(8);
      this.tileData[4] = z;
      this.tileData[5] = x;
      this.tileData[6] = y;
      this.uniformBuffer = device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: `tile ${z}/${x}/${y} uniforms`,
      });
      this.texture = null;
      this.elevBuffer = null;
      this.horizonBuffer = null;
      this.HN = 0;
      this.bindGroup = null;
      this._heights = null;    // kept for CPU shadow rebake
      this._horizon = null;
      this._horizonHN = 0;
      this._rawEqPxSizeM = 0;
      this._compHMin = 0;      // elevation bounds for warmup trim
      this._compHMax = 0;
      this._horizonHMin = 0;
      this._horizonHMax = 0;
      this._cpuNx = null;      // cached normals+AO from CPU bake
      this._cpuNy = null;
      this._cpuAo = null;
      this._shadowPending = false;
      this.satTexture = null;  // satellite imagery, allocated on demand
      this._satAbort = null;
      this._satPending = false;
      this._populate();
      // Imagery is independent of the elevation fetch, so it starts
      // right away rather than waiting for the bake. Whichever lands
      // first, `_rebuildBindGroup` picks up both.
      this.ensureImagery();
    }

    // Rebuild the display bind group from whatever this tile currently
    // has. Called when the elevation fetch resolves and again whenever
    // the imagery texture appears or is released.
    _rebuildBindGroup() {
      if (!this.texture || !this.elevBuffer) return;
      this.bindGroup = device.createBindGroup({
        layout: tileBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
          { binding: 1, resource: this.texture.createView() },
          { binding: 2, resource: sampler },
          { binding: 3, resource: { buffer: this.elevBuffer } },
          {
            binding: 4,
            resource: this.satTexture ? this.satTexture.createView() : emptySatView,
          },
        ],
      });
    }

    // Fetch this tile's satellite image, if imagery is live and we
    // don't already have one in hand or in flight. A no-op otherwise —
    // which is the whole point: with the opacity at zero this returns
    // before touching the network or the GPU.
    ensureImagery() {
      if (!imageryLive()) return;
      if (this.destroyed || this.satTexture || this._satPending) return;
      const controller = new AbortController();
      this._satAbort = controller;
      this._satPending = true;
      const done = () => {
        this._satPending = false;
        if (this._satAbort === controller) this._satAbort = null;
      };
      fetch(imageryTileUrl(this.z, this.x, this.y), { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`imagery fetch failed (${res.status})`);
          return res.blob();
        })
        // Decoding a blob this way keeps the JPEG off the main thread;
        // only the upload below runs here.
        .then((blob) => createImageBitmap(blob))
        .then((bitmap) => {
          // The opacity may have gone back to zero, or the tile may
          // have scrolled off, while this was in flight. Either way the
          // image is dropped rather than uploaded, so a quick toggle
          // leaves nothing allocated behind it.
          if (this.destroyed || controller.signal.aborted || !imageryLive()) {
            bitmap.close();
            done();
            return;
          }
          this.satTexture = device.createTexture({
            size: [bitmap.width, bitmap.height, 1],
            format: "rgba8unorm",
            // RENDER_ATTACHMENT is not optional even though nothing
            // ever renders into this texture: it is what
            // copyExternalImageToTexture requires of its destination,
            // and without it the upload is silently dropped and the
            // tile keeps showing the transparent placeholder.
            usage:
              GPUTextureUsage.TEXTURE_BINDING |
              GPUTextureUsage.COPY_DST |
              GPUTextureUsage.RENDER_ATTACHMENT,
            label: `tile ${this.z}/${this.x}/${this.y} imagery`,
          });
          device.queue.copyExternalImageToTexture(
            { source: bitmap },
            { texture: this.satTexture },
            [bitmap.width, bitmap.height],
          );
          bitmap.close();
          this._rebuildBindGroup();
          done();
          needsRender = true;
        })
        .catch((err) => {
          done();
          if (controller.signal.aborted) return;
          // A missing or failed image is not fatal: the tile keeps the
          // transparent placeholder and renders as tinted relief.
          console.warn(`tile-viewer imagery ${this.z}/${this.x}/${this.y}:`, err.message);
        });
    }

    // Release this tile's imagery and cancel any fetch for it. Used
    // when the opacity returns to zero, and on destroy.
    dropImagery() {
      this._satAbort?.abort();
      this._satAbort = null;
      this._satPending = false;
      if (this.satTexture) {
        try {
          this.satTexture.destroy();
        } catch (_) {}
        this.satTexture = null;
        this._rebuildBindGroup();
      }
    }

    async _populate() {
      try {
        const key = `${this.z}/${this.x}/${this.y}`;
        const data = await new Promise((resolve, reject) => {
          pendingTiles.set(key, { resolve, reject });
          worker.postMessage({ type: "fetch", z: this.z, x: this.x, y: this.y });
        });
        if (this.destroyed) return;

        const { comp, horizon } = data;
        const compN = comp.N;
        const HN = horizon.HN;
        this.HN = HN;
        ensureBakeResources(compN);

        this.texture = device.createTexture({
          size: [compN, compN, 1],
          format: "rgba8unorm",
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
          label: `tile ${this.z}/${this.x}/${this.y} packed`,
        });
        this.elevBuffer = device.createBuffer({
          size: compN * compN * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          label: `tile ${this.z}/${this.x}/${this.y} elev`,
        });
        this.horizonBuffer = device.createBuffer({
          size: HN * HN * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          label: `tile ${this.z}/${this.x}/${this.y} horizon`,
        });
        this._rebuildBindGroup();

        this._compN = compN;
        // The display shader reads the elevation grid for hypsometric
        // tinting, so it has to be on the GPU in both bake modes. The
        // GPU path below used to be the only writer; in CPU mode the
        // buffer was allocated and left empty.
        device.queue.writeBuffer(this.elevBuffer, 0, comp.heights);
        this.tileData[7] = compN;

        // Elevation bounds feed the shadow-rebake warmup trim in
        // deriveSweepParams. Needed regardless of bake mode — if they
        // stay at their constructor default of 0, dh = 0 makes the trim
        // collapse warmupSteps to 0 and the parent-tile prewarm is
        // effectively skipped, producing shadow seams between tiles.
        this._compHMin = comp.hMin;
        this._compHMax = comp.hMax;
        this._horizonHMin = horizon.hMin ?? 0;
        this._horizonHMax = horizon.hMax ?? 0;

        if (lighting.bakeMode === "cpu") {
          // ---- CPU bake path ----
          // Every pass now works off a per-row pxSize built from the
          // equatorial (latitude-independent) pxSize times cos(lat)
          // per pixel row. The worker handles the build; the main
          // thread just supplies the raw equatorial value.
          const rawEqPxSizeM = tilePxSizeMRef(this.z, compN);
          // Store copies for later shadow rebakes. Rebakes rebuild
          // the per-row pxSize from the same raw equatorial value.
          this._heights = new Float32Array(comp.heights);
          this._horizon = new Float32Array(horizon.heights);
          this._horizonHN = HN;
          this._rawEqPxSizeM = rawEqPxSizeM;

          const { azDeg, altDeg } = tileSunAngles(this);

          const result = await cpuDispatch(this, {
            type: "bake",
            z: this.z,
            x: this.x,
            y: this.y,
            heights: new Float32Array(comp.heights),
            N: compN,
            rawEqPxSizeM,
            horizon: new Float32Array(horizon.heights),
            HN,
            azDeg,
            altDeg,
            sunRadiusDeg: Math.max(0, lighting.sunRadiusDeg || 0),
            shadowSamples: Math.max(1, Math.round(lighting.shadowSamples || 1)),
            lsaoFalloff: lighting.lsaoFalloff,
            parentScale,
            compHMin: comp.hMin,
            horizonHMax: horizon.hMax ?? 0,
          });
          if (!result || this.destroyed) {
            this.texture?.destroy();
            this.elevBuffer?.destroy();
            this.horizonBuffer?.destroy();
            return;
          }

          // Store returned normals+AO for shadow rebakes.
          this._cpuNx = result.nx;
          this._cpuNy = result.ny;
          this._cpuAo = result.ao;

          // Upload packed RGBA to the tile texture.
          device.queue.writeTexture(
            { texture: this.texture },
            result.packed,
            { bytesPerRow: compN * 4 },
            { width: compN, height: compN },
          );

          this.ready = true;
          needsRender = true;
        } else {
          // ---- GPU bake path (original) ----
          // elevBuffer is already uploaded above, for both bake modes.
          device.queue.writeBuffer(this.horizonBuffer, 0, horizon.heights);

          // Queue for baking — processed one per frame to avoid
          // saturating the GPU and blocking the display render pass.
          bakeQueue.push(this);
          needsRender = true;

          if (this.destroyed) {
            this.texture.destroy();
            this.elevBuffer.destroy();
            this.horizonBuffer.destroy();
            return;
          }
          // Tile data is uploaded but not yet baked — the bake queue
          // will process it on a subsequent frame.
        }
      } catch (err) {
        console.error("tile populate error", err);
      }
    }

    destroy() {
      this.destroyed = true;
      this.dropImagery();
      // Cancel any in-flight fetch in the data-prep worker.
      const key = `${this.z}/${this.x}/${this.y}`;
      if (pendingTiles.has(key)) {
        pendingTiles.delete(key);
        worker.postMessage({ type: "cancel", z: this.z, x: this.x, y: this.y });
      }
      try {
        this.texture?.destroy();
      } catch (_) {}
      try {
        this.elevBuffer?.destroy();
      } catch (_) {}
      try {
        this.horizonBuffer?.destroy();
      } catch (_) {}
      try {
        this.uniformBuffer.destroy();
      } catch (_) {}
    }
  }

  // ------------------------------------------------------------------
  // Static bake: one encoder per tile.
  //
  //   normals → LSAO × 8 → pack → copyBufferToTexture
  //
  // Leaves the tile texture's alpha channel at 0. Shadow is added by
  // the first shadow re-bake in `rebakeShadowAllVisible`, which is
  // triggered automatically because `_populate` sets `sunDirty = true`
  // once the tile is ready.
  // ------------------------------------------------------------------
  function runStaticBake(tile, compN) {
    // Normals and LSAO both operate in Mercator mode: the shader
    // derives per-row cos(lat) from (tileY, z) and multiplies the
    // equatorial pxSize for each pixel's own latitude. Keeps slopes
    // and horizon angles continuous across tile seams.
    const eqPxSizeM = tilePxSizeMRef(tile.z, compN);

    // Normals uniform: { N: u32, tileY: u32, z: u32, eqPxSizeM: f32 }
    const normalsBuf = new ArrayBuffer(16);
    const normalsU32 = new Uint32Array(normalsBuf);
    const normalsF32 = new Float32Array(normalsBuf);
    normalsU32[0] = compN;
    normalsU32[1] = tile.y;
    normalsU32[2] = tile.z;
    normalsF32[3] = eqPxSizeM;
    device.queue.writeBuffer(bakeRes.normalsUniform, 0, normalsBuf);

    // Pre-compute + write 8 LSAO sweep uniforms into the pool. Unlike
    // the single-tile notebook LSAO figure, the tile viewer runs the
    // LSAO sweep *with* parent-tile prewarm so that AO is continuous
    // across tile boundaries. The cost is a small within-tile gradient
    // on the sun-facing edges of each sweep direction (parent blockers
    // stay on the hull and contribute cos²α out to ~16 pixels before
    // interior samples prune them), but averaged over 8 directions and
    // viewed in a multi-tile context this is far less visible than the
    // hard AO seams you get without the prewarm.
    const lsaoSweeps = new Array(AO_DIRECTIONS);
    for (let d = 0; d < AO_DIRECTIONS; d++) {
      const azDeg = (d * 360) / AO_DIRECTIONS;
      const sweep = deriveSweepParams({
        W: compN,
        H: compN,
        azDeg,
        eqPxSizeM,
        tileY: tile.y,
        z: tile.z,
        mode: "lsao",
        weight: 1 / AO_DIRECTIONS,
        horizonN: tile.HN,
        parentScale,
      });
      lsaoSweeps[d] = sweep;
      device.queue.writeBuffer(
        bakeRes.uniformPool[d],
        0,
        packUniforms(sweep),
      );
    }

    const encoder = device.createCommandEncoder({
      label: `static bake ${tile.z}/${tile.x}/${tile.y}`,
    });
    encoder.clearBuffer(bakeRes.workingAo);
    encoder.clearBuffer(bakeRes.workingShadow);

    // Normals pass.
    {
      const pipe = getOrBuildNormalsPipeline(device);
      const bg = device.createBindGroup({
        layout: getNormalsBindGroupLayout(device),
        entries: [
          { binding: 0, resource: { buffer: bakeRes.normalsUniform } },
          { binding: 1, resource: { buffer: tile.elevBuffer } },
          { binding: 2, resource: { buffer: bakeRes.workingNx } },
          { binding: 3, resource: { buffer: bakeRes.workingNy } },
        ],
      });
      const pass = encoder.beginComputePass({ label: "normals" });
      pass.setPipeline(pipe);
      pass.setBindGroup(0, bg);
      const wg = Math.ceil(compN / 8);
      pass.dispatchWorkgroups(wg, wg);
      pass.end();
    }

    // LSAO accumulation — 8 sweeps each adding (1 − sin²α)·weight into
    // the shared atomic `workingAo` buffer, pre-warmed from the tile's
    // parent-horizon buffer for cross-tile continuity.
    {
      const pipe = getOrBuildComputePipeline({
        device,
        mode: "lsao",
        prewarm: true,
        lsaoFalloff: lighting.lsaoFalloff,
      });
      const bgl = getComputeBindGroupLayout(device);
      for (let d = 0; d < AO_DIRECTIONS; d++) {
        const bg = device.createBindGroup({
          layout: bgl,
          entries: [
            { binding: 0, resource: { buffer: bakeRes.uniformPool[d] } },
            { binding: 1, resource: { buffer: tile.elevBuffer } },
            { binding: 2, resource: { buffer: bakeRes.workingAo } },
            { binding: 3, resource: { buffer: tile.horizonBuffer } },
          ],
        });
        const pass = encoder.beginComputePass({ label: `lsao ${d}` });
        pass.setPipeline(pipe);
        pass.setBindGroup(0, bg);
        const s = lsaoSweeps[d];
        const numRays = s.bMax - s.bMin + 1;
        pass.dispatchWorkgroups(Math.ceil(numRays / 64));
        pass.end();
      }
    }

    // Pack: read workingNx/Ny/Ao/Shadow, write rgba8 u32 into
    // workingPacked. Shadow is still zero here, so alpha=0 out of the
    // pack — the first shadow re-bake will fill it in.
    {
      const pipe = getOrBuildPackPipeline(device);
      const bg = device.createBindGroup({
        layout: getPackBindGroupLayout(device),
        entries: [
          { binding: 0, resource: { buffer: bakeRes.packUniform } },
          { binding: 1, resource: { buffer: bakeRes.workingNx } },
          { binding: 2, resource: { buffer: bakeRes.workingNy } },
          { binding: 3, resource: { buffer: bakeRes.workingAo } },
          { binding: 4, resource: { buffer: bakeRes.workingShadow } },
          { binding: 5, resource: { buffer: bakeRes.workingPacked } },
        ],
      });
      const pass = encoder.beginComputePass({ label: "pack" });
      pass.setPipeline(pipe);
      pass.setBindGroup(0, bg);
      const wg = Math.ceil(compN / 8);
      pass.dispatchWorkgroups(wg, wg);
      pass.end();
    }

    encoder.copyBufferToTexture(
      { buffer: bakeRes.workingPacked, bytesPerRow: compN * 4, rowsPerImage: compN },
      { texture: tile.texture },
      { width: compN, height: compN, depthOrArrayLayers: 1 },
    );

    device.queue.submit([encoder.finish()]);
  }

  // ------------------------------------------------------------------
  // Shadow re-bake: one encoder per tile, N soft-shadow compute passes
  // into the shared `workingShadow` buffer, then an alpha-blit pass
  // that writes the result into the tile texture's alpha channel.
  //
  // Each of the N samples is a full sweep at a stratified azimuth
  // offset drawn from a Gaussian whose standard deviation is matched
  // to the altitude smoothstep (same construction as the single-tile
  // soft-shadow notebook figure). The `sunRadiusDeg` lighting field
  // drives the altitude half-width; `shadowSamples` controls how
  // many offsets we average. At `shadowSamples = 1` the shadow is
  // still softened in the altitude direction by the smoothstep, just
  // with no azimuth jitter.
  //
  // Encoder-per-tile so each tile can reuse the uniform pool slots
  // 0..N−1 without worrying about cross-tile aliasing (uniform writes
  // for the next submit can safely overwrite slots whose dispatches
  // have already been queued for execution by the previous submit).
  // ------------------------------------------------------------------
  function rebakeShadowAllVisible() {
    if (bakeRes === null) return;
    const visible = [];
    for (const tile of tiles.values()) {
      if (tile.ready && !tile.destroyed) visible.push(tile);
    }
    if (visible.length === 0) return;

    const sunRadiusDeg = Math.max(0, lighting.sunRadiusDeg || 0);
    const N = lighting.sunInteracting ? 1 : Math.max(
      1,
      Math.min(TILE_BAKE_UNIFORM_POOL_SIZE, Math.round(lighting.shadowSamples || 1)),
    );

    // Variance-match to the altitude smoothstep (slope 3/2 at the
    // midpoint equated to the Gaussian CDF's 1/(σ√(2π))). Over a total
    // span of 3·sunR, the equivalent standard deviation in degrees is
    // σ = 2·sunR / √(2π). At sunR = 0 the offsets collapse to 0.
    const sigma = (2 * sunRadiusDeg) / Math.sqrt(2 * Math.PI);

    const computePipe = getOrBuildComputePipeline({
      device,
      mode: "soft",
      prewarm: true,
    });
    const alphaPipe = getOrBuildAlphaBlitPipeline(device);
    const computeBgl = getComputeBindGroupLayout(device);
    const alphaBgl = getAlphaBindGroupLayout(device);

    const weight = 1 / N;

    for (let tIdx = 0; tIdx < visible.length; tIdx++) {
      const tile = visible[tIdx];
      // Shadow sweep runs in Mercator mode with the raw (uncompensated)
      // equatorial pxSize so shadow geometry tracks real elevation
      // differences, while per-row cos(lat) keeps sweep steps
      // continuous across tile seams.
      const rawEqPxSizeM = tilePxSizeMRef(tile.z, bakeN);
      const { azDeg, altDeg } = tileSunAngles(tile);

      // Pre-compute all N sweeps for this tile and pack their
      // uniforms into the first N pool slots. writeBuffer is queued
      // before the encoder's submit, so all N values are in place
      // when the dispatches run.
      const sweeps = new Array(N);
      for (let s = 0; s < N; s++) {
        const q = N === 1 ? 0 : normInv((s + 0.5) / N);
        const daz = q * sigma;
        const sweep = deriveSweepParams({
          W: bakeN,
          H: bakeN,
          azDeg: azDeg + daz,
          eqPxSizeM: rawEqPxSizeM,
          tileY: tile.y,
          z: tile.z,
          mode: "soft",
          altDeg,
          sunRadiusDeg,
          weight,
          horizonN: tile.HN,
          parentScale,
          compElevMin: tile._compHMin,
          horizonElevMax: tile._horizonHMax,
        });
        sweeps[s] = sweep;
        device.queue.writeBuffer(
          bakeRes.uniformPool[s],
          0,
          packUniforms(sweep),
        );
      }

      const encoder = device.createCommandEncoder({
        label: `shadow rebake ${tile.z}/${tile.x}/${tile.y}`,
      });
      encoder.clearBuffer(bakeRes.workingShadow);

      for (let s = 0; s < N; s++) {
        const bg = device.createBindGroup({
          layout: computeBgl,
          entries: [
            { binding: 0, resource: { buffer: bakeRes.uniformPool[s] } },
            { binding: 1, resource: { buffer: tile.elevBuffer } },
            { binding: 2, resource: { buffer: bakeRes.workingShadow } },
            { binding: 3, resource: { buffer: tile.horizonBuffer } },
          ],
        });
        const pass = encoder.beginComputePass({
          label: `reshadow ${tIdx} sample ${s}`,
        });
        pass.setPipeline(computePipe);
        pass.setBindGroup(0, bg);
        const sw = sweeps[s];
        const numRays = sw.bMax - sw.bMin + 1;
        pass.dispatchWorkgroups(Math.ceil(numRays / 64));
        pass.end();
      }

      {
        const bg = device.createBindGroup({
          layout: alphaBgl,
          entries: [
            { binding: 0, resource: { buffer: bakeRes.alphaUniform } },
            { binding: 1, resource: { buffer: bakeRes.workingShadow } },
          ],
        });
        const pass = encoder.beginRenderPass({
          label: `reshadow ${tIdx} alpha`,
          colorAttachments: [
            {
              view: tile.texture.createView(),
              loadOp: "load",
              storeOp: "store",
            },
          ],
        });
        pass.setPipeline(alphaPipe);
        pass.setBindGroup(0, bg);
        pass.draw(3);
        pass.end();
      }

      device.queue.submit([encoder.finish()]);
    }
  }

  // ------------------------------------------------------------------
  // CPU shadow re-bake: sends shadow-only messages to the worker pool
  // for each visible tile that has cached CPU bake data.
  // ------------------------------------------------------------------
  function rebakeShadowCPU() {
    const sunRadiusDeg = Math.max(0, lighting.sunRadiusDeg || 0);
    const shadowSamples = lighting.sunInteracting ? 1 : Math.max(1, Math.round(lighting.shadowSamples || 1));
    const gen = sunGeneration;

    for (const tile of tiles.values()) {
      if (!tile.ready || tile.destroyed || !tile._cpuNx) continue;
      if (tile._shadowPending) continue;
      tile._shadowPending = true;
      const compN = tile._compN;
      const { azDeg, altDeg } = tileSunAngles(tile);
      cpuDispatch(tile, {
        type: "shadow",
        z: tile.z,
        x: tile.x,
        y: tile.y,
        heights: new Float32Array(tile._heights),
        N: compN,
        rawEqPxSizeM: tile._rawEqPxSizeM,
        horizon: new Float32Array(tile._horizon),
        HN: tile._horizonHN,
        azDeg,
        altDeg,
        sunRadiusDeg,
        shadowSamples,
        cachedNx: new Float32Array(tile._cpuNx),
        cachedNy: new Float32Array(tile._cpuNy),
        cachedAo: new Float32Array(tile._cpuAo),
        parentScale,
        compHMin: tile._compHMin,
        horizonHMax: tile._horizonHMax,
      }).then((result) => {
        tile._shadowPending = false;
        if (!result || tile.destroyed) return;
        device.queue.writeTexture(
          { texture: tile.texture },
          result.packed,
          { bytesPerRow: compN * 4 },
          { width: compN, height: compN },
        );
        needsRender = true;
        // If the sun moved while this tile was in flight, re-dispatch.
        if (gen !== sunGeneration) {
          rebakeShadowCPU();
        }
      });
    }
  }

  function updateTiles() {
    const scale = screenScale();
    // Viewport → baseZoom world coordinates. At display scale > 1 one
    // baseZoom pixel covers more than one screen pixel, so the visible
    // range contracts accordingly.
    const topLeftX = centerWorldX - viewportW / 2 / scale;
    const topLeftY = centerWorldY - viewportH / 2 / scale;
    const bottomRightX = centerWorldX + viewportW / 2 / scale;
    const bottomRightY = centerWorldY + viewportH / 2 / scale;

    const minX = Math.floor(topLeftX / tileSize);
    const maxX = Math.floor(bottomRightX / tileSize);
    const minY = Math.floor(topLeftY / tileSize);
    const maxY = Math.floor(bottomRightY / tileSize);
    const nAtZoom = Math.pow(2, baseZoom);

    const needed = new Set();
    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        if (tx < 0 || tx >= nAtZoom || ty < 0 || ty >= nAtZoom) continue;
        const key = `${baseZoom}/${tx}/${ty}`;
        needed.add(key);
        if (!tiles.has(key)) tiles.set(key, new Tile(baseZoom, tx, ty));
      }
    }
    for (const [key, tile] of tiles) {
      if (!needed.has(key)) {
        tile.destroy();
        tiles.delete(key);
      }
    }
  }

  // Zoom to `newZoom` while keeping the given screen pixel anchored
  // on the same geographic point. If `newZoom` crosses a half-integer
  // boundary the base zoom flips and all tiles are rebuilt; otherwise
  // we're just rescaling existing tiles.
  function zoomTo(newZoom, anchorPx) {
    const clamped = Math.max(minZoom, Math.min(maxZoom, newZoom));
    if (clamped === zoom) return;

    const oldScale = screenScale();
    const ax = anchorPx ? anchorPx.x : viewportW / 2;
    const ay = anchorPx ? anchorPx.y : viewportH / 2;
    // Geographic position under the anchor, in current baseZoom pixels.
    const cursorWorldX = centerWorldX + (ax - viewportW / 2) / oldScale;
    const cursorWorldY = centerWorldY + (ay - viewportH / 2) / oldScale;

    const newBaseZoom = Math.round(clamped);
    const baseShift = Math.pow(2, newBaseZoom - baseZoom);
    // Rescale the geographic position into the new base zoom's pixels.
    const newCursorWorldX = cursorWorldX * baseShift;
    const newCursorWorldY = cursorWorldY * baseShift;
    const newScale = Math.pow(2, clamped - newBaseZoom) * pixelRatio;
    const newCenterWorldX = newCursorWorldX - (ax - viewportW / 2) / newScale;
    const newCenterWorldY = newCursorWorldY - (ay - viewportH / 2) / newScale;

    if (newBaseZoom !== baseZoom) {
      // Base zoom flipped — move existing tiles to the stale set
      // so they remain visible until children at the new zoom load.
      for (const tile of tiles.values()) {
        if (tile.ready) staleTiles.push(tile);
        else tile.destroy();
      }
      tiles.clear();
      baseZoom = newBaseZoom;
      // Auto-parentDZ tracks baseZoom; re-pick after the flip. Stale
      // tiles keep their old-parentScale horizon buffer for visual
      // continuity (they're display-only, not re-baked).
      recomputeParentDZ();
    }
    centerWorldX = newCenterWorldX;
    centerWorldY = newCenterWorldY;
    zoom = clamped;
    needsRender = true;
    updateTiles();
  }

  function updateCanvasSize() {
    const rect = container.getBoundingClientRect();
    const prevW = viewportW;
    const prevH = viewportH;
    pixelRatio = resolvePixelRatio();
    // Two sizes, deliberately apart: CSS pixels place the canvas in the
    // page, device pixels size its backing store.
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    viewportW = Math.max(1, Math.round(cssW * pixelRatio));
    viewportH = Math.max(1, Math.round(cssH * pixelRatio));
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = viewportW;
    canvas.height = viewportH;
    // Flash the size chip on every real change after the first layout
    // pass — the initial sizing isn't a user action worth announcing.
    const changed = viewportW !== prevW || viewportH !== prevH;
    updateSizeChip(changed && sizedOnce);
    sizedOnce = true;
    needsRender = true;
    updateTiles();
  }

  // ------------------------------------------------------------------
  // Frame capture.
  //
  // captureFrame() parks a request here; the next render() copies the
  // swap-chain texture into `captureBuffer` in the same command buffer
  // as the draw, and finishCapture() maps it once the GPU is done. The
  // buffer is reused across frames so a long recording doesn't churn
  // allocations.
  // ------------------------------------------------------------------
  let capture = null;
  let captureBuffer = null;
  let captureBufferSize = 0;

  async function finishCapture(req) {
    const { w, h, bytesPerRow, buffer, resolve, reject } = req;
    const total = bytesPerRow * h;
    try {
      await buffer.mapAsync(GPUMapMode.READ, 0, total);
      const padded = new Uint8Array(buffer.getMappedRange(0, total));
      const rowBytes = w * 4;
      const out = new Uint8Array(rowBytes * h);
      // getPreferredCanvasFormat() is bgra8unorm on most platforms
      // (macOS included) and the h264 encoder wants RGBA, so unpack
      // the 256-byte-aligned rows and swap R/B on the way out. Alpha
      // is forced opaque: the canvas is premultiplied and the clear
      // value is opaque white, but the encoder has no use for it.
      const swap = format.startsWith("bgra");
      for (let y = 0; y < h; y++) {
        const src = y * bytesPerRow;
        const dst = y * rowBytes;
        if (swap) {
          for (let i = 0; i < rowBytes; i += 4) {
            out[dst + i] = padded[src + i + 2];
            out[dst + i + 1] = padded[src + i + 1];
            out[dst + i + 2] = padded[src + i];
            out[dst + i + 3] = 255;
          }
        } else {
          out.set(padded.subarray(src, src + rowBytes), dst);
          for (let i = 3; i < rowBytes; i += 4) out[dst + i] = 255;
        }
      }
      buffer.unmap();
      resolve({ data: out, width: w, height: h });
    } catch (err) {
      try { buffer.unmap(); } catch (_) {}
      reject(err);
    }
  }

  function requestCapture() {
    if (capture) {
      return Promise.reject(
        new Error("captureFrame: a capture is already in flight"),
      );
    }
    // h264 macroblocks come in pairs, so crop to even dimensions
    // rather than scaling — a one-pixel crop is invisible and keeps
    // the recording pixel-exact with what is on screen.
    const w = evenDown(viewportW);
    const h = evenDown(viewportH);
    const bytesPerRow = Math.ceil((w * 4) / 256) * 256;
    const size = bytesPerRow * h;
    if (captureBufferSize < size) {
      try { captureBuffer?.destroy(); } catch (_) {}
      captureBuffer = device.createBuffer({
        size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        label: "frame readback",
      });
      captureBufferSize = size;
    }
    needsRender = true;
    return new Promise((resolve, reject) => {
      capture = { w, h, bytesPerRow, buffer: captureBuffer, resolve, reject };
    });
  }

  // Everything that has to quiesce before a captured frame is the
  // frame the user would see if they stopped and waited: tile fetches,
  // the static bake queue, the stale-tile crossfade, the shadow
  // re-bake (async in CPU mode, via the worker pool), and the debounced
  // HQ re-bake timer.
  function isSettled() {
    if (pendingTiles.size > 0) return false;
    if (bakeQueue.length > 0) return false;
    if (staleTiles.length > 0) return false;
    if (sunDirty || hqPending) return false;
    if (cpuQueue.length > 0) return false;
    if (cpuIdle.length < cpuPoolSize) return false;
    for (const tile of tiles.values()) {
      if (tile.destroyed) continue;
      if (!tile.ready) return false;
      if (tile._shadowPending) return false;
      // A tile whose image is still in flight would be captured as
      // tinted relief, so a recording waits for it the same way it
      // waits for a bake.
      if (tile._satPending) return false;
    }
    return true;
  }

  function render() {
    if (
      !needsRender &&
      !capture &&
      bakeQueue.length === 0 &&
      staleTiles.length === 0
    ) {
      requestAnimationFrame(render);
      return;
    }
    needsRender = false;

    // Global uniform packing:
    //   f32[0..3]   = viewportPx (w,h,shadingMode,reliefStrength)
    //   f32[4..7]   = sunDir.xyz, unused
    //   f32[8..11]  = params (kAmbient, kDirect, aoStrength, shadowStrength)
    //   f32[12..15] = solar (sinDec, cosDec, gmstMinusRA, useTime)
    //   f32[16..19] = hypso (rampMin, 1/rampSpan, tintStrength, opennessTint)
    //   f32[20..23] = ao (floorRaw, 1 when the falloff is exp, contrast exponent, unused)
    //   f32[24..27] = imagery (satellite opacity, unused x3)
    globalData[0] = viewportW;
    globalData[1] = viewportH;
    globalData[2] = lighting.shadingMode;
    globalData[3] = lighting.reliefStrength;
    globalData[4] = lighting.sunX;
    globalData[5] = lighting.sunY;
    globalData[6] = lighting.sunZ;
    globalData[7] = 0;
    globalData[8] = lighting.kAmbient;
    globalData[9] = lighting.kDirect;
    globalData[10] = lighting.aoStrength;
    globalData[11] = lighting.shadowStrength;
    globalData[12] = lighting.solar.sinDec;
    globalData[13] = lighting.solar.cosDec;
    globalData[14] = lighting.solar.gmstMinusRA;
    globalData[15] = lighting.useTime ? 1 : 0;
    globalData[16] = lighting.rampMin;
    globalData[17] = 1 / (lighting.rampMax - lighting.rampMin || 1);
    globalData[18] = lighting.tintStrength;
    globalData[19] = lighting.opennessTint;
    // Floor of the raw LSAO term, before the bake's aoGamma: e^-1 for
    // Naaji's exp(-sin a), 0 for the Lambertian cos2 a. Normalising by
    // it keeps the openness tint calibrated across both falloffs.
    globalData[20] = lighting.lsaoFalloff === "exp" ? Math.exp(-1) : 0;
    globalData[21] = lighting.lsaoFalloff === "exp" ? 1 : 0;
    // Contrast exponent. The control is 0 (no reshaping) to 1 (the most
    // the measurements support), mapped to p = 2^-c so 0 -> 1 and
    // 1 -> 0.5. Never 0, which would make pow(0, p) = 1 and break the
    // flat-ground guarantee.
    globalData[22] = Math.pow(2, -lighting.opennessContrast);
    globalData[23] = 0;
    globalData[24] = imageryUrl ? clampSatOpacity(lighting.satOpacity) : 0;
    globalData[25] = 0;
    globalData[26] = 0;
    globalData[27] = 0;
    device.queue.writeBuffer(globalBuffer, 0, globalData);

    // Per-tile uniform updates — screen-space origin is a small f32
    // delta from a double-precision world coord, so high zoom stays
    // numerically stable. At fractional zoom `scale` magnifies the
    // rendered tile size; at displayScale = 1 we're at the tile's
    // native zoom level, drawn at `pixelRatio` device pixels per
    // tile pixel.
    const scale = screenScale();
    const displaySize = tileSize * scale;
    for (const tile of tiles.values()) {
      if (!tile.ready) continue;
      const worldX = tile.x * tileSize;
      const worldY = tile.y * tileSize;
      const screenX = (worldX - centerWorldX) * scale + viewportW / 2;
      const screenY = (worldY - centerWorldY) * scale + viewportH / 2;
      tile.tileData[0] = screenX;
      tile.tileData[1] = screenY;
      tile.tileData[2] = displaySize;
      tile.tileData[3] = displaySize;
      device.queue.writeBuffer(tile.uniformBuffer, 0, tile.tileData);
    }

    // Render first — compositing pre-baked tiles is trivially cheap
    // and must not be blocked by bake/shadow compute work.
    if (sunDirty) {
      // Night-side skip. In time mode the composite feeds the baked
      // shadow through timeHS = mix(1, shadow, twilight), and
      // twilight = smoothstep(-0.105, 0.035, sin(alt)) is exactly
      // zero below about -6 degrees. At that point timeHS is the
      // constant 1 whatever the bake says, so the baked value has no
      // influence on a single pixel and re-baking it is wasted work.
      // (Before the terminator fix the weight reached zero from the
      // other side, mixing toward "no shadow" instead of "fully
      // shadowed"; the skip was valid then for the same reason, that
      // the baked value is not consulted.) -12 degrees leaves a wide
      // margin for the altitude spread across a viewport (under 0.05
      // degrees at these zooms) and hands roughly a third of a
      // 24-hour recording back for free. Debug mode draws the raw
      // bake texture, shadow channel and all, so it never takes the
      // shortcut.
      const nightSkip =
        lighting.useTime &&
        lighting.shadingMode !== 2 &&
        centerSunAltDeg() < -12;
      if (!nightSkip) {
        if (lighting.bakeMode === "cpu") {
          rebakeShadowCPU();
        } else {
          rebakeShadowAllVisible();
        }
      }
      sunDirty = false;
    }

    // Position and draw stale tiles (from previous zoom levels) behind
    // active tiles so the display isn't blank during zoom transitions.
    for (const stale of staleTiles) {
      if (!stale.ready || !stale.bindGroup) continue;
      const d = baseZoom - stale.z;
      const staleScale = Math.pow(2, d);
      const worldX = stale.x * tileSize * staleScale;
      const worldY = stale.y * tileSize * staleScale;
      const sz = tileSize * staleScale * scale;
      const sx = (worldX - centerWorldX) * scale + viewportW / 2;
      const sy = (worldY - centerWorldY) * scale + viewportH / 2;
      stale.tileData[0] = sx;
      stale.tileData[1] = sy;
      stale.tileData[2] = sz;
      stale.tileData[3] = sz;
      device.queue.writeBuffer(stale.uniformBuffer, 0, stale.tileData);
    }

    const encoder = device.createCommandEncoder();
    const currentTexture = gpuCtx.getCurrentTexture();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: currentTexture.createView(),
          clearValue: { r: 1, g: 1, b: 1, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, globalBindGroup);
    // Draw stale tiles first (background).
    for (const stale of staleTiles) {
      if (!stale.ready || !stale.bindGroup) continue;
      pass.setBindGroup(1, stale.bindGroup);
      pass.draw(6);
    }
    // Draw active tiles on top — they cover stale tiles as they load.
    for (const tile of tiles.values()) {
      if (!tile.ready || !tile.bindGroup) continue;
      pass.setBindGroup(1, tile.bindGroup);
      pass.draw(6);
    }
    pass.end();
    if (
      capture &&
      (capture.w !== evenDown(currentTexture.width) ||
        capture.h !== evenDown(currentTexture.height))
    ) {
      // The window was resized between requesting this frame and
      // drawing it. Copying anyway would either fail GPU validation or
      // silently hand back a differently-framed crop, and an
      // unresolved promise would hang the recording, so reject and let
      // the recorder report it.
      const stale = capture;
      capture = null;
      stale.reject(
        new Error("captureFrame: canvas resized mid-capture"),
      );
    }
    if (capture) {
      encoder.copyTextureToBuffer(
        { texture: currentTexture, origin: { x: 0, y: 0, z: 0 } },
        {
          buffer: capture.buffer,
          bytesPerRow: capture.bytesPerRow,
          rowsPerImage: capture.h,
        },
        { width: capture.w, height: capture.h, depthOrArrayLayers: 1 },
      );
    }
    device.queue.submit([encoder.finish()]);
    if (capture) {
      const req = capture;
      capture = null;
      finishCapture(req);
    }

    // Prune stale tiles that are fully covered by ready active tiles.
    for (let i = staleTiles.length - 1; i >= 0; i--) {
      const stale = staleTiles[i];
      const d = baseZoom - stale.z;
      let covered = true;
      if (d > 0) {
        // Zoomed in: stale is larger, check all child tiles.
        const factor = 1 << d;
        const x0 = stale.x * factor;
        const y0 = stale.y * factor;
        for (let ty = y0; ty < y0 + factor && covered; ty++) {
          for (let tx = x0; tx < x0 + factor && covered; tx++) {
            const t = tiles.get(`${baseZoom}/${tx}/${ty}`);
            if (!t || !t.ready) covered = false;
          }
        }
      } else {
        // Zoomed out: stale is smaller, check parent tile.
        const factor = 1 << -d;
        const px = Math.floor(stale.x / factor);
        const py = Math.floor(stale.y / factor);
        const t = tiles.get(`${baseZoom}/${px}/${py}`);
        if (!t || !t.ready) covered = false;
      }
      if (covered) {
        stale.destroy();
        staleTiles.splice(i, 1);
      }
    }

    // Process one queued tile bake per frame to avoid GPU saturation.
    if (lighting.bakeMode === "gpu" && bakeQueue.length > 0) {
      const tile = bakeQueue.shift();
      if (!tile.destroyed && tile._compN) {
        runStaticBake(tile, tile._compN);
        tile.ready = true;
        sunDirty = true; sunGeneration++;
        needsRender = true;
      }
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  const resizeObserver = new ResizeObserver(updateCanvasSize);
  resizeObserver.observe(container);
  updateCanvasSize();

  // A ResizeObserver never fires when only the pixel ratio changes:
  // drag the window from a 2x display to a 1x one and the CSS box is
  // identical while the backing store is now twice what it needs to
  // be (and the other way round leaves a soft canvas with no way back
  // but a resize). matchMedia on the ratio catches it. The query
  // matches one exact value, so it has to be rebuilt after each change.
  let dprQuery = null;
  let dprDisposed = false;
  function onPixelRatioChange() {
    updateCanvasSize();
    watchPixelRatio();
  }
  function watchPixelRatio() {
    if (dprDisposed) return;
    dprQuery?.removeEventListener("change", onPixelRatioChange);
    dprQuery = window.matchMedia(
      `(resolution: ${window.devicePixelRatio || 1}dppx)`,
    );
    dprQuery.addEventListener("change", onPixelRatioChange);
  }
  watchPixelRatio();

  // Pointer-drag panning + pinch-zoom. Pointer events carry CSS pixels;
  // `pixelRatio` lifts them into the canvas device-pixel space, and the
  // current screen scale converts from there into baseZoom world pixels,
  // so the gesture feels 1:1 with the cursor/finger regardless of
  // fractional zoom or display density. Two-finger pinch applies
  // incremental pan + zoom per frame: pan by midpoint delta, then zoom
  // by distance ratio anchored at the new midpoint. pinchMid/pinchDist are nulled whenever the pointer
  // set changes so the next move re-seeds cleanly without a jump.
  // Client coordinates (CSS pixels, page-relative) to a zoom anchor in
  // canvas device pixels. Pan and pinch convert their own deltas the
  // same way, by multiplying through by `pixelRatio` before dividing
  // by the screen scale.
  const anchorFromClient = (clientX, clientY) => {
    const rect = container.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * pixelRatio,
      y: (clientY - rect.top) * pixelRatio,
    };
  };

  const activePointers = new Map();
  let dragging = false;
  let dragMoved = false;
  let lastX = 0;
  let lastY = 0;
  let pinchMid = null;
  let pinchDist = 0;

  function pinchState() {
    const it = activePointers.values();
    const a = it.next().value;
    const b = it.next().value;
    return {
      x: (a.x + b.x) * 0.5,
      y: (a.y + b.y) * 0.5,
      dist: Math.hypot(a.x - b.x, a.y - b.y),
    };
  }

  container.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      container.setPointerCapture(e.pointerId);
    } catch (_) {}
    e.preventDefault();
    if (activePointers.size === 1) {
      dragging = true;
      dragMoved = false;
      lastX = e.clientX;
      lastY = e.clientY;
      container.style.cursor = "grabbing";
    } else {
      pinchMid = null;
      pinchDist = 0;
      dragMoved = true;
    }
  });
  container.addEventListener("pointermove", (e) => {
    const p = activePointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;

    if (activePointers.size >= 2) {
      const curr = pinchState();
      if (pinchMid === null) {
        pinchMid = { x: curr.x, y: curr.y };
        pinchDist = curr.dist;
        return;
      }
      const scale = screenScale();
      centerWorldX -= ((curr.x - pinchMid.x) * pixelRatio) / scale;
      centerWorldY -= ((curr.y - pinchMid.y) * pixelRatio) / scale;
      if (pinchDist > 0 && curr.dist > 0) {
        const dz = Math.log2(curr.dist / pinchDist);
        if (Math.abs(dz) > 1e-6) {
          zoomTo(zoom + dz, anchorFromClient(curr.x, curr.y));
        }
      }
      pinchMid = { x: curr.x, y: curr.y };
      pinchDist = curr.dist;
      dragMoved = true;
      needsRender = true;
      updateTiles();
    } else if (activePointers.size === 1 && dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (dx !== 0 || dy !== 0) dragMoved = true;
      lastX = e.clientX;
      lastY = e.clientY;
      const scale = screenScale();
      centerWorldX -= (dx * pixelRatio) / scale;
      centerWorldY -= (dy * pixelRatio) / scale;
      needsRender = true;
      updateTiles();
    }
  });
  const endDrag = (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.delete(e.pointerId);
    try {
      container.releasePointerCapture(e.pointerId);
    } catch (_) {}
    if (activePointers.size === 1) {
      // Fall back to single-finger pan; re-seed from the remaining
      // pointer so lifting one finger doesn't jump the view.
      const remaining = activePointers.values().next().value;
      lastX = remaining.x;
      lastY = remaining.y;
      dragging = true;
      pinchMid = null;
      pinchDist = 0;
    } else if (activePointers.size === 0) {
      dragging = false;
      pinchMid = null;
      pinchDist = 0;
      container.style.cursor = "grab";
      scheduleHashFlush();
    } else {
      pinchMid = null;
      pinchDist = 0;
    }
  };
  container.addEventListener("pointerup", endDrag);
  container.addEventListener("pointercancel", endDrag);

  // Smooth wheel zoom, anchored on the cursor. deltaY translates into
  // a continuous zoom-per-pixel ramp so a single notch is a small
  // fractional step, not a whole zoom level.
  container.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const ZOOM_PER_PIXEL = 1 / 220;
      const dz = -e.deltaY * ZOOM_PER_PIXEL;
      zoomTo(zoom + dz, anchorFromClient(e.clientX, e.clientY));
      scheduleHashFlush();
    },
    { passive: false },
  );

  // Double-click to zoom in, anchored on the cursor. Skipped if the
  // click was actually the end of a pan gesture.
  container.addEventListener("dblclick", (e) => {
    if (dragMoved) return;
    e.preventDefault();
    const anchor = anchorFromClient(e.clientX, e.clientY);
    // Shift-double-click zooms out as a companion gesture.
    const dz = e.shiftKey ? -1 : 1;
    zoomTo(zoom + dz, anchor);
    scheduleHashFlush();
  });

  // Keyboard: `=` / `+` zoom in, `-` / `_` zoom out. tabindex is set
  // so the container can receive focus; clicks focus it automatically.
  if (!container.hasAttribute("tabindex")) {
    container.setAttribute("tabindex", "0");
  }
  container.addEventListener("keydown", (e) => {
    if (e.key === "=" || e.key === "+") {
      e.preventDefault();
      zoomTo(zoom + 1, null);
      scheduleHashFlush();
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomTo(zoom - 1, null);
      scheduleHashFlush();
    }
  });
  container.addEventListener("pointerdown", () => container.focus());

  let hqTimer = 0;
  function scheduleHQRebake() {
    clearTimeout(hqTimer);
    hqPending = true;
    hqTimer = setTimeout(() => {
      hqPending = false;
      sunDirty = true; sunGeneration++;
      needsRender = true;
    }, 150);
  }

  return {
    setLighting(state) {
      const prevX = lighting.sunX;
      const prevY = lighting.sunY;
      const prevZ = lighting.sunZ;
      const prevR = lighting.sunRadiusDeg;
      const prevS = lighting.shadowSamples;
      const prevMode = lighting.bakeMode;
      const prevFalloff = lighting.lsaoFalloff;
      const prevUseTime = lighting.useTime;
      const prevSolar = lighting.solar;
      const wasInteracting = lighting.sunInteracting;
      const prevSatLive = imageryLive();
      Object.assign(lighting, state);

      // Crossing zero either way flips the imagery layer into or out of
      // existence. Above zero the opacity is just a uniform, so sliding
      // it around costs nothing and nothing is refetched.
      const satLive = imageryLive();
      if (satLive !== prevSatLive) {
        for (const tile of tiles.values()) {
          if (satLive) tile.ensureImagery();
          else tile.dropImagery();
        }
        for (const stale of staleTiles) {
          if (satLive) stale.ensureImagery();
          else stale.dropImagery();
        }
        if (attributionChip) {
          attributionChip.style.display = satLive ? "block" : "none";
        }
      }

      const solarChanged =
        lighting.useTime &&
        (!prevSolar ||
          !lighting.solar ||
          prevSolar.sinDec !== lighting.solar.sinDec ||
          prevSolar.cosDec !== lighting.solar.cosDec ||
          prevSolar.gmstMinusRA !== lighting.solar.gmstMinusRA);
      // In time mode each tile's shadow sweep resolves its own
      // direction from its centre, so pan-driven sunX/Y/Z changes
      // shouldn't invalidate the bake. Only fixed mode responds to
      // the scalar sun direction.
      const fixedSunChanged =
        !lighting.useTime &&
        (prevX !== lighting.sunX ||
          prevY !== lighting.sunY ||
          prevZ !== lighting.sunZ);
      if (
        fixedSunChanged ||
        prevR !== lighting.sunRadiusDeg ||
        prevS !== lighting.shadowSamples ||
        prevUseTime !== lighting.useTime ||
        solarChanged
      ) {
        sunDirty = true; sunGeneration++;
      }
      if (wasInteracting && !lighting.sunInteracting) {
        scheduleHQRebake();
      }
      if (
        prevMode !== lighting.bakeMode ||
        prevFalloff !== lighting.lsaoFalloff
      ) {
        for (const tile of tiles.values()) tile.destroy();
        tiles.clear();
        for (const s of staleTiles) s.destroy();
        staleTiles.length = 0;
        updateTiles();
      }
      needsRender = true;
    },
    getCenter() {
      return worldToLatLng(centerWorldX, centerWorldY, baseZoom, tileSize);
    },

    /**
     * Upload a hypsometric ramp. `lut` is a Float32Array of
     * RAMP_SIZE * 4 Oklab (L, a, b, 1) entries sampled uniformly
     * across [domain[0], domain[1]] in metres, which is exactly what
     * `buildOklabLUT` from lib/color-ramp.js produces. Shorter LUTs are
     * accepted and padded by repeating the last entry, so the caller is
     * free to pick its own resolution.
     */
    setRamp(lut, domain) {
      if (!lut || lut.length < 4) return;
      const have = Math.min(RAMP_SIZE, lut.length / 4) | 0;
      const data = new Float32Array(RAMP_SIZE * 4);
      data.set(lut.subarray(0, have * 4));
      for (let i = have; i < RAMP_SIZE; i++) {
        data.copyWithin(i * 4, (have - 1) * 4, have * 4);
      }
      device.queue.writeBuffer(rampBuffer, 0, data);
      if (domain) {
        lighting.rampMin = domain[0];
        lighting.rampMax = domain[1];
      }
      needsRender = true;
    },

    /**
     * Elevation range over the tiles currently loaded, as
     * [min, max] in metres, or null when nothing is loaded yet. These
     * are whole-tile bounds that the fetch already computed, so the
     * range can reach a little past what is strictly on screen.
     */
    getElevationRange() {
      let lo = Infinity;
      let hi = -Infinity;
      for (const tile of tiles.values()) {
        if (!tile.ready || tile.destroyed) continue;
        if (tile._compHMin < lo) lo = tile._compHMin;
        if (tile._compHMax > hi) hi = tile._compHMax;
      }
      return Number.isFinite(lo) && Number.isFinite(hi) && hi > lo ? [lo, hi] : null;
    },
    /**
     * Pixel size a captured frame will have: the live canvas cropped
     * to even dimensions. This is what the size chip reports. Device
     * pixels, not CSS pixels, so on a 2x display a recording comes out
     * at twice the figure's on-screen size.
     */
    getFrameSize() {
      return [evenDown(viewportW), evenDown(viewportH)];
    },

    /** Keep the size chip visible (the animation panel does this). */
    setSizeChipPinned(pinned) {
      sizeChipPinned = !!pinned;
      if (sizeChipPinned) {
        updateSizeChip(true);
      } else {
        clearTimeout(sizeChipTimer);
        sizeChip.style.opacity = "0";
      }
    },

    /**
     * Enable or disable pan/zoom. A recording freezes the view: the
     * solar day is anchored to the centre longitude at the moment it
     * starts, and a mid-recording pan would both re-frame the shot and
     * invalidate that anchor.
     */
    setInteractive(enabled) {
      container.style.pointerEvents = enabled ? "" : "none";
      container.style.cursor = enabled ? "grab" : "default";
    },

    /** True when nothing is in flight and the canvas is final. */
    isSettled,

    /**
     * Resolve once `isSettled()` holds. Polls on rAF because most of
     * what we wait for is retired by the render loop itself.
     */
    awaitSettled({ timeoutMs = 60000 } = {}) {
      const t0 = performance.now();
      return new Promise((resolve, reject) => {
        const poll = () => {
          if (isSettled()) {
            resolve();
            return;
          }
          if (performance.now() - t0 > timeoutMs) {
            reject(new Error("awaitSettled: timed out"));
            return;
          }
          requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
      });
    },

    /**
     * Render one frame and read it back as RGBA bytes. Resolves with
     * { data, width, height }. One capture at a time.
     */
    captureFrame() {
      return requestCapture();
    },

    destroy() {
      worker.terminate();
      for (const w of cpuWorkers) w.terminate();
      resizeObserver.disconnect();
      dprDisposed = true;
      dprQuery?.removeEventListener("change", onPixelRatioChange);
      for (const tile of tiles.values()) tile.destroy();
      tiles.clear();
      try {
        globalBuffer.destroy();
      } catch (_) {}
      try {
        rampBuffer.destroy();
      } catch (_) {}
      try {
        emptySatTexture.destroy();
      } catch (_) {}
      try {
        captureBuffer?.destroy();
      } catch (_) {}
    },
  };
}
