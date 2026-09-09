import { colormapWGSL } from './shaders.js';

/**
 * The cascade as an integrated velocity field.
 *
 * Tabulated streamlines are a fixed set of curves, and a fixed set of curves
 * reads as a wireframe object however it is stroked. These are trajectories:
 * parcels stepped through the velocity field on the GPU, each dragging a short
 * trail of where it has just been, each with a lifetime, fading in when it is
 * seeded and out when it expires. Nothing in the picture is a fixed shape.
 *
 * Two things follow from integrating rather than tabulating, and both are the
 * point rather than side effects.
 *
 * Every generation gets its own parcels. The old figure drew one table of
 * curves at several scales, so the copies were exact rescalings of each other
 * and the nest could only ever look self-similar and still. Independent parcels
 * in each generation break that without any dishonesty: the generations really
 * are separate pieces of fluid.
 *
 * And the generations are indexed absolutely rather than recycled. The old
 * figure held a fixed set of slots and slid a fractional offset through them,
 * which made the visible arrangement exactly periodic in the zoom -- measured,
 * identical to the last digit at zoom 0, 1, 2 and 3 -- so nothing could appear
 * to speed up no matter what was done to the rates. Here generation m sits at
 * scale Lambda^(zoom - m) forever, and zooming in genuinely arrives at deeper,
 * faster generations. The acceleration is a consequence of the arrangement
 * instead of something painted on top of it.
 */

/** Samples of history per parcel. The trail is this many segments long. */
export const TRAIL = 24;

/** Field parameters, shared by the CPU seeding and the GPU integrator. */
export const FIELD = { gamma: 1.6, omega: 3.0, sigma: 0.7, zH: 1.15, zK: 0.95 };

/** Where parcels are born, and how far out they are allowed to travel. */
export const SEED = { r0: 0.34, r1: 2.6, z: 0.95, bound: 4.8 };

/**
 * Parcel lifetime in seconds of wall time, not of the field's time. A deep
 * generation is stepped tens of times faster than a shallow one, so a lifetime
 * measured in field time would make its parcels flash in and out while the
 * outer ones lingered. What is stored is the fraction of a life used up, which
 * is also what the fade reads, and which resets to zero on respawn -- so a
 * trail that spans a respawn has a component that runs backwards, and that is
 * how the vertex shader knows to break the line there.
 */
export const LIFE = { min: 3.4, max: 6.5 };

const PLASTIC = 1.22074408460575947536;
const R3 = [1 / PLASTIC, 1 / PLASTIC ** 2, 1 / PLASTIC ** 3];
const quasi = (n, k) => (0.5 + n * R3[k]) % 1;

/** Where parcel `n` is born on its `respawn`-th life. Mirrors seedPosition in WGSL. */
export function seedPosition(n, respawn) {
  const t = n + respawn * 977;
  const r = SEED.r0 * Math.pow(SEED.r1 / SEED.r0, quasi(t, 0));
  const th = 2 * Math.PI * quasi(t, 1);
  const q = quasi(t, 2);
  const z = (q > 0.5 ? 1 : -1) * SEED.z * (0.25 + 0.75 * ((q * 7) % 1));
  return [r * Math.cos(th), r * Math.sin(th), z];
}

export function lifetimeOf(n, respawn) {
  return LIFE.min + (LIFE.max - LIFE.min) * quasi(n + respawn * 613 + 31, 1);
}

/**
 * Fill the ring buffer by stepping each parcel forward on the CPU, so the very
 * first frame already shows trails rather than a field of degenerate
 * zero-length segments, which the line renderer would have to normalize.
 */
export function seedParticles(field, count) {
  const state = new Float32Array(count * TRAIL * 4);
  const meta = new Float32Array(count * 4);
  const v = [0, 0, 0];
  const k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0], tmp = [0, 0, 0];
  const h = 0.05;

  for (let n = 0; n < count; n++) {
    const life = lifetimeOf(n, 0);
    const p = seedPosition(n, 0);
    // Stagger the starting age so the swarm does not expire all at once.
    let age = quasi(n * 3 + 7, 0);
    for (let s = 0; s < TRAIL; s++) {
      const o = (n * TRAIL + s) * 4;
      state[o] = p[0]; state[o + 1] = p[1]; state[o + 2] = p[2]; state[o + 3] = age;
      field(p[0], p[1], p[2], k1);
      for (let j = 0; j < 3; j++) tmp[j] = p[j] + (h / 2) * k1[j];
      field(tmp[0], tmp[1], tmp[2], k2);
      for (let j = 0; j < 3; j++) tmp[j] = p[j] + (h / 2) * k2[j];
      field(tmp[0], tmp[1], tmp[2], k3);
      for (let j = 0; j < 3; j++) tmp[j] = p[j] + h * k3[j];
      field(tmp[0], tmp[1], tmp[2], k4);
      for (let j = 0; j < 3; j++) p[j] += (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
      age += h / (life * 6);
    }
    meta[n * 4] = life;
    meta[n * 4 + 1] = 0;
    void v;
  }
  return { state, meta };
}

/**
 * The velocity field, written once and shared by the integrator and the vertex
 * shader, with the profile constants pasted in from the same object the CPU
 * seeding uses so the two cannot drift apart.
 *
 * This is the curl of the vector potential transcribed in field.js, so it is
 * divergence free by construction rather than by cancellation.
 */
function fieldWGSL({ gamma, omega, sigma, zH, zK }) {
  return /* wgsl */`
fn velocity(p: vec3f) -> vec3f {
  let s = (p.x * p.x + p.y * p.y) * 0.5;
  let es = exp(-s / ${sigma});
  let gH = exp(-(p.z * p.z) / (2.0 * ${zH} * ${zH}));
  let gK = exp(-(p.z * p.z) / (2.0 * ${zK} * ${zK}));
  let H = ${gamma} * p.z * es * gH;
  let Hs = -H / ${sigma};
  let Hz = ${gamma} * es * gH * (1.0 - (p.z * p.z) / (${zH} * ${zH}));
  let Ks = -${omega} * es * gK;
  return vec3f(
    p.y * Ks - (p.x * 0.5) * Hz,
    -(p.y * 0.5) * Hz - p.x * Ks,
    H + s * Hs
  );
}
`;
}

const SEEDING = /* wgsl */`
fn quasi(n: f32) -> vec3f {
  let g = 1.22074408460575947536;
  return fract(vec3f(0.5) + n * vec3f(1.0 / g, 1.0 / (g * g), 1.0 / (g * g * g)));
}

fn seedPosition(n: u32, respawn: f32) -> vec3f {
  let t = f32(n) + respawn * 977.0;
  let q = quasi(t);
  let r = ${SEED.r0} * pow(${SEED.r1} / ${SEED.r0}, q.x);
  let th = 6.283185307179586 * q.y;
  let sgn = select(-1.0, 1.0, q.z > 0.5);
  let z = sgn * ${SEED.z} * (0.25 + 0.75 * fract(q.z * 7.0));
  return vec3f(r * cos(th), r * sin(th), z);
}

fn lifetimeOf(n: u32, respawn: f32) -> f32 {
  let q = quasi(f32(n) + respawn * 613.0 + 31.0);
  return ${LIFE.min} + ${LIFE.max - LIFE.min} * q.y;
}
`;

export function integrateShaderCode(params = FIELD) {
  return fieldWGSL(params) + SEEDING + /* wgsl */`
struct Sim {
  dt: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
  srcStep: u32,
  dstStep: u32,
  perGen: u32,
  genCount: u32,
};

@group(0) @binding(0) var<storage, read_write> state: array<vec4f>;
@group(0) @binding(1) var<storage, read_write> parcels: array<vec4f>;
@group(0) @binding(2) var<uniform> sim: Sim;

/**
 * How fast each generation's own clock runs, in units of the rescaled time the
 * parcels are integrated in. Supplied per generation from the ledger rather
 * than assumed geometric: tau_n falls by about 0.42 a step, but the floor in
 * nu(n) makes it jump back up every few generations, so a constant ratio would
 * be a guess where an exact number is available.
 */
@group(0) @binding(3) var<storage, read> rates: array<f32>;

fn step4(p: vec3f, h: f32) -> vec3f {
  let k1 = velocity(p);
  let k2 = velocity(p + 0.5 * h * k1);
  let k3 = velocity(p + 0.5 * h * k2);
  let k4 = velocity(p + h * k3);
  return p + (h / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let n = gid.x;
  let total = sim.perGen * sim.genCount;
  if (n >= total) { return; }

  let g = n / sim.perGen;

  // Generation g turns over once every tau_g, so its own clock runs at 1/tau_g.
  // The caller divides through by the active generation's rate, which is what
  // makes this the rescaled time of the self-similar frame: the generation being
  // watched turns at a fixed pace on screen, and its neighbours are faster and
  // slower than it by exactly the ratio of their slot lengths.
  let dtField = sim.dt * rates[g];

  var p = state[n * ${TRAIL}u + sim.srcStep].xyz;
  var age = state[n * ${TRAIL}u + sim.srcStep].w;
  let pmPrev = parcels[n];
  var pm = pmPrev;

  // Substep so a deep generation, which may be stepping tens of times faster
  // than a shallow one, does not integrate itself off the manifold.
  let sub = clamp(ceil(dtField / 0.08), 1.0, 8.0);
  let h = dtField / sub;
  var i = 0.0;
  loop {
    if (i >= sub) { break; }
    p = step4(p, h);
    i = i + 1.0;
  }
  // Age in wall time, so every generation's parcels live the same few seconds
  // however fast the field is being stepped underneath them.
  age = age + sim.dt / max(pmPrev.x, 0.5);

  // Retire a parcel that has run its life or left the region, and seed the
  // replacement somewhere new. The trail is not cleared: its old samples keep
  // their own ages, so the vertex shader can both break the line where the age
  // jumps backwards and go on fading the abandoned tail out on its own.
  let escaped = dot(p, p) > ${SEED.bound * SEED.bound} || any(p != p);
  if (age > 1.0 || escaped) {
    pm.y = pm.y + 1.0;
    pm.x = lifetimeOf(n, pm.y);
    p = seedPosition(n, pm.y);
    age = 0.0;
    parcels[n] = pm;
  }

  state[n * ${TRAIL}u + sim.dstStep] = vec4f(p, age);
}
`;
}

/** Byte size of the shared view block. */
export const VIEW_SIZE = 128;

const VIEW_BLOCK = /* wgsl */`
struct ViewUniforms {
  projView: mat4x4f,
  background: vec3f,
  width: f32,
  isDark: f32,
  exposure: f32,
  speedLo: f32,
  speedHi: f32,
  genOffset: u32,
  perGen: u32,
  stepOffset: u32,
  drawGens: u32,
  backboneSamples: u32,
  backboneWidth: f32,
  flowRate: f32,
  flowAmp: f32,
};

@group(1) @binding(2) var<uniform> view: ViewUniforms;
`;

/**
 * Flatten a handful of tabulated streamlines into one buffer.
 *
 * These are the backbone: a few long curves, the same in every generation,
 * which is exactly what makes them worth drawing. The trails show that the
 * field is alive but each one only ever sees its own small piece of it; the
 * backbone carries the shape that does not depend on scale, and seeing the same
 * curve at four sizes at once is the self-similarity stated visually.
 *
 * Lines vary in length, so each is followed by a sentinel sample with a
 * negative speed, which the vertex function turns into a line break.
 */
export function packStreamlines(lines, [lo, hi]) {
  const span = hi - lo || 1;
  let count = 0;
  for (const line of lines) count += line.count + 1;
  const samples = new Float32Array(count * 4);
  const phases = new Float32Array(count);
  let n = 0;
  for (const line of lines) {
    for (let i = 0; i < line.count; i++) {
      samples[n * 4] = line.points[i * 3];
      samples[n * 4 + 1] = line.points[i * 3 + 1];
      samples[n * 4 + 2] = line.points[i * 3 + 2];
      samples[n * 4 + 3] = Math.min(1, Math.max(0, (line.speeds[i] - lo) / span));
      phases[n] = line.times[i];
      n++;
    }
    samples[n * 4 + 3] = -1;
    n++;
  }
  return { samples, phases, count };
}

/**
 * Depth peeling. The previous layer's depth is sampled at this fragment's own
 * pixel, so anything at or in front of it is discarded and the pass captures
 * the next surface back.
 *
 * The fragment's own position is what makes this possible, and it is why the
 * line module is vendored: the published build hands getColor only lineCoord
 * and the user's varyings. A vertex function can pass its clip position across,
 * but that lies on the line's centre while the fragment may be half a stroke
 * width away -- and the edge of a stroke is exactly where peeling shows its
 * artifacts.
 *
 * Layer zero binds a depth texture cleared to zero, against which nothing is
 * ever in front, so one shader serves every layer.
 */
const PEEL = /* wgsl */`
@group(2) @binding(0) var prevDepth: texture_depth_2d;

fn peeled(fragPosition: vec4f) -> bool {
  let d = textureLoad(prevDepth, vec2i(fragPosition.xy), 0);
  return fragPosition.z <= d + 1e-7;
}
`;

const GENERATION_STRUCT = /* wgsl */`
/** One drawn generation: its scale about the blowup point, its azimuth, how far
 *  it has faded into the visible window, and where its pulses have got to. */
struct Generation {
  scale: f32,
  twist: f32,
  opacity: f32,
  pulse: f32,
};
@group(1) @binding(3) var<storage, read> gens: array<Generation>;
`;

/** The few long tabulated curves, drawn once per visible generation. */
export const backboneVertexBody = VIEW_BLOCK + GENERATION_STRUCT + /* wgsl */`
@group(1) @binding(0) var<storage, read> samples: array<vec4f>;
@group(1) @binding(1) var<storage, read> phases: array<f32>;

struct Vertex {
  position: vec4f,
  width: f32,
  scalar: f32,
  pulse: f32,
  opacity: f32,
};

fn getVertex(index: u32) -> Vertex {
  let slot = index / view.backboneSamples;
  if (slot >= view.drawGens) { return Vertex(vec4f(0.0), 0.0, 0.0, 0.0, 0.0); }
  let gen = gens[slot];
  if (gen.opacity <= 0.004) { return Vertex(vec4f(0.0), 0.0, 0.0, 0.0, 0.0); }

  let smp = samples[index % view.backboneSamples];
  if (smp.w < 0.0) { return Vertex(vec4f(0.0), 0.0, 0.0, 0.0, 0.0); }

  let p = smp.xyz;
  let up = vec3f(p.x, p.z, -p.y);
  let c = cos(gen.twist);
  let sn = sin(gen.twist);
  let world = gen.scale * vec3f(up.x * c + up.z * sn, up.y, -up.x * sn + up.z * c);

  return Vertex(
    view.projView * vec4f(world, 1.0),
    view.backboneWidth,
    smp.w,
    phases[index % view.backboneSamples] * view.flowRate - gen.pulse,
    gen.opacity
  );
}
`;

export const backboneFragmentBody = VIEW_BLOCK + colormapWGSL + PEEL + /* wgsl */`
fn getColor(lineCoord: vec2f, scalar: f32, pulse: f32, opacity: f32, fragPosition: vec4f) -> vec4f {
  if (abs(lineCoord.x) > 0.0 && dot(lineCoord, lineCoord) > 1.0) { discard; }
  if (peeled(fragPosition)) { discard; }
  var base = colormap(scalar);
  base = mix(base * 0.72, base, view.isDark);
  let f = fract(pulse);
  let band = smoothstep(0.55, 0.9, f) * (1.0 - smoothstep(0.9, 1.0, f));
  base = base * (1.0 + view.flowAmp * band);
  let r = abs(lineCoord.y);
  base = base * (1.0 - 0.5 * r * r) * view.exposure;
  // Premultiplied, so the peel layers composite with one / one-minus-src-alpha.
  // Real transparency: fading toward the background instead only darkens a
  // stroke, so a faded line reads as a dark line crossing a bright one rather
  // than as something on its way out.
  if (opacity < 0.004) { discard; }
  return vec4f(base * opacity, opacity);
}
`;

export function trailVertexBody(params = FIELD) {
  return VIEW_BLOCK + GENERATION_STRUCT + fieldWGSL(params) + /* wgsl */`
@group(1) @binding(0) var<storage, read> state: array<vec4f>;

struct Vertex {
  position: vec4f,
  width: f32,
  scalar: f32,
  along: f32,
  opacity: f32,
};

fn broken() -> Vertex { return Vertex(vec4f(0.0), 0.0, 0.0, 0.0, 0.0); }

fn getVertex(index: u32) -> Vertex {
  // One extra vertex per parcel, which is always a break, so a single draw
  // covers every parcel in every drawn generation.
  let perParcel = ${TRAIL}u + 1u;
  let perGenVerts = view.perGen * perParcel;

  let slot = index / perGenVerts;
  if (slot >= view.drawGens) { return broken(); }
  let gen = gens[slot];
  if (gen.opacity <= 0.004) { return broken(); }

  let rem = index % perGenVerts;
  let parcel = (view.genOffset + slot) * view.perGen + rem / perParcel;
  let st = rem % perParcel;
  if (st >= ${TRAIL}u) { return broken(); }

  // Oldest sample first, so the trail runs from tail to head.
  let base = parcel * ${TRAIL}u;
  let here = state[base + (st + view.stepOffset) % ${TRAIL}u];

  // A parcel that respawned mid-trail has an age that jumps backwards. Break
  // the line there rather than drawing a segment across the whole domain.
  if (st > 0u) {
    let prev = state[base + (st - 1u + view.stepOffset) % ${TRAIL}u];
    if (here.w < prev.w) { return broken(); }
  }

  // Fade the whole parcel by the fraction of its life used up at the head, so
  // the tail fades out with it rather than lingering after the head has gone.
  let head = state[base + (${TRAIL}u - 1u + view.stepOffset) % ${TRAIL}u];
  let fade = smoothstep(0.0, 0.09, head.w) * (1.0 - smoothstep(0.82, 1.0, head.w));
  let along = f32(st) / f32(${TRAIL}u - 1u);

  // Field coordinates put the axis of symmetry on z; the render frame puts it
  // on y, the same swap the meshes get.
  let p = here.xyz;
  let up = vec3f(p.x, p.z, -p.y);
  let c = cos(gen.twist);
  let sn = sin(gen.twist);
  let world = gen.scale * vec3f(up.x * c + up.z * sn, up.y, -up.x * sn + up.z * c);

  let speed = length(velocity(p));
  let scalar = clamp((speed - view.speedLo) / max(view.speedHi - view.speedLo, 1e-6), 0.0, 1.0);

  // Width in device pixels, tapering toward the tail. Constant across
  // generations: a stroke is a mark on the page, so the zoom moves the parcels
  // without thickening their trails.
  return Vertex(
    view.projView * vec4f(world, 1.0),
    view.width * (0.35 + 0.65 * along),
    scalar,
    along,
    gen.opacity * fade
  );
}
`;
}

export const trailFragmentBody = VIEW_BLOCK + colormapWGSL + PEEL + /* wgsl */`
fn getColor(lineCoord: vec2f, scalar: f32, along: f32, opacity: f32, fragPosition: vec4f) -> vec4f {
  // Round the caps. Elsewhere lineCoord.x is zero and nothing is discarded.
  if (abs(lineCoord.x) > 0.0 && dot(lineCoord, lineCoord) > 1.0) { discard; }
  if (peeled(fragPosition)) { discard; }

  var base = colormap(scalar);
  base = mix(base * 0.72, base, view.isDark);

  // Darken across the width so a stroke reads as a filament rather than a flat
  // ribbon. This is the only shading: a line carries no normal, and lighting it
  // would put back the solid-object look these are here to avoid.
  let r = abs(lineCoord.y);
  base = base * (1.0 - 0.5 * r * r) * view.exposure;

  // The head is opaque and the tail fades out. As alpha, not as a mix toward
  // the background: a trail that dims toward the background turns dark rather
  // than turning transparent, and crossing trails then read as dark scratches.
  let weight = clamp(opacity * (0.10 + 0.90 * clamp(along, 0.0, 1.0)), 0.0, 1.0);
  // A gap that still shaded would hold a peel layer open, and there are only
  // three or four of those.
  if (weight < 0.004) { discard; }
  return vec4f(base * weight, weight);
}
`;
