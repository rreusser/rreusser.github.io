/**
 * The family the whole construction is built out of, before any of it is built.
 *
 * Everything later in the notebook is copies of one kind of flow: the
 * axisymmetric field of `field.js`, an axial strain H pinching a swirl K. The
 * cascade picks one member of that family, shrinks it, and repeats. This module
 * is the family itself -- what the four numbers in the ansatz actually do to the
 * motion, explored one member at a time and at a fixed apparent size, so that
 * nothing here is confusable with the shrinking that comes afterwards.
 *
 * Two things are drawn, and they are the same object seen two ways. The
 * streamlines are the motion. The outline is the core the motion is confined
 * to: the 1/e surface of the profiles' common Gaussian envelope, rounded off
 * into the capsule the rest of the notebook abbreviates a vortex to. The Lean
 * sources cut the support out as a literal cylinder in s and z, so a rounded
 * cylinder is the honest picture of it and not a stylistic choice.
 *
 * Both go through the screen-projected line renderer at a width fixed in
 * device pixels, so the picture reads as a velocity field rather than as a
 * solid model being looked at.
 */

import { adaptiveStreamline } from './field.js';
import { colormapWGSL } from './shaders.js';

/** The member of the family every other figure in the notebook is drawn from. */
export const FAMILY_DEFAULTS = { gamma: 1.6, omega: 3.0, sigma: 0.7, zH: 1.15 };

/**
 * The swirl's axial extent, as a fraction of the strain's.
 *
 * A fifth slider for it would buy almost nothing: what z_K changes on its own is
 * whether the spin outlives the squeeze by a little at the ends of the core, and
 * that is invisible next to what the other four do. It is pinned at the ratio
 * the reference field uses so the family stays four-dimensional.
 */
export const ZK_RATIO = 0.95 / 1.15;

/**
 * The speed the colour ramp saturates at, in the same units as the field.
 *
 * Fixed rather than renormalised per member, which is the whole point: a family
 * whose colours were rescaled to their own maximum would look identical however
 * hard it was spinning. Measured rather than guessed -- the default member's
 * streamlines top out at 1.58 -- so the default sits about two thirds of the way
 * up the ramp, with room to move in both directions.
 */
export const SPEED_REF = 2.2;

/**
 * The core, as the profiles define it.
 *
 * Both profiles carry the envelope exp(-s/sigma) exp(-z^2 / 2 zH^2), and its 1/e
 * surface is exactly the ellipsoid s/sigma + z^2 / 2 zH^2 = 1 -- that is, radius
 * sqrt(2 sigma) on the equator and sqrt(2) zH at the poles. Those two numbers are
 * what the outline is drawn from, and their ratio is the only thing about a
 * member of the family that survives into the cascade.
 */
export function coreExtent({ sigma, zH }) {
  const radial = Math.sqrt(2 * sigma);
  const axial = Math.SQRT2 * zH;
  return { radial, axial, aspect: axial / radial };
}

/**
 * The fastest speed anywhere on the drawn streamlines.
 *
 * Measured off the samples rather than derived from the profiles. The analytic
 * peak is easy enough to write down -- the swirl is largest at r = sqrt(sigma)
 * and the axial speed on the axis at z = zH -- but those two maxima are in
 * different places, so any closed form for the total is either an overestimate
 * or a fiddle, and either way it disagrees with the picture. This is the number
 * the colours in the figure actually came from.
 */
export function maxSpeed(lines) {
  let peak = 0;
  for (const line of lines) for (const s of line.speeds) if (s > peak) peak = s;
  return peak;
}

/** Turns of swirl per e-folding of the stretch: the shape of a trajectory, as one number. */
export function turnsPerEfold({ gamma, omega }) {
  return omega / (2 * Math.PI * gamma);
}

/**
 * The meridian generator of the capsule, in the (radial, axial) half-plane.
 *
 * A stadium with half-width `a` and half-height `b`, matching `capsulePath` in
 * the vocabulary: the corner radius is the smaller of the two, so the shape runs
 * smoothly from a long thin pill through a sphere to a flat lens as the aspect
 * ratio crosses one, and never degenerates.
 */
export function capsuleProfile(a, b, arcSteps = 10) {
  const r = Math.min(a, b);
  const sx = a - r, sy = b - r;
  const pts = [];
  const push = (x, y) => pts.push([x, y]);

  push(0, -b);
  if (sx > 1e-9) push(sx, -b);
  for (let i = 0; i <= arcSteps; i++) {
    const t = -Math.PI / 2 + (Math.PI / 2) * (i / arcSteps);
    push(sx + r * Math.cos(t), -sy + r * Math.sin(t));
  }
  if (sy > 1e-9) push(a, sy);
  for (let i = 0; i <= arcSteps; i++) {
    const t = (Math.PI / 2) * (i / arcSteps);
    push(sx + r * Math.cos(t), sy + r * Math.sin(t));
  }
  if (sx > 1e-9) push(sx, b);
  push(0, b);
  return pts;
}

/**
 * The capsule as a wireframe of meridians and latitude rings, in render
 * coordinates.
 *
 * A single silhouette would be the cascade's outline, but the cascade's camera
 * never moves and this one does; a silhouette drawn for one viewpoint is wrong
 * from any other. Meridians and rings are the surface itself, so they stay
 * correct however the figure is turned, and a handful of each is enough to read
 * as a surface without competing with the streamlines inside it.
 */
export function capsuleWireframe(a, b, { meridians = 4, rings = 5, segments = 48 } = {}) {
  const profile = capsuleProfile(a, b);
  const curves = [];

  for (let m = 0; m < meridians; m++) {
    const th = (Math.PI * m) / meridians;
    const c = Math.cos(th), s = Math.sin(th);
    // Each half-meridian is drawn as a full one, pole to pole and back up the
    // far side, so `meridians` curves close into `meridians` great loops.
    const pts = [];
    for (const [x, y] of profile) pts.push([x * c, y, x * s]);
    for (let i = profile.length - 1; i >= 0; i--) {
      const [x, y] = profile[i];
      pts.push([-x * c, y, -x * s]);
    }
    curves.push(pts);
  }

  for (let k = 1; k <= rings; k++) {
    const y = -b + (2 * b * k) / (rings + 1);
    // The profile's radius at this height, by linear search along the generator.
    let radius = 0;
    for (let i = 0; i + 1 < profile.length; i++) {
      const [x0, y0] = profile[i], [x1, y1] = profile[i + 1];
      if ((y0 - y) * (y1 - y) <= 0 && Math.abs(y1 - y0) > 1e-9) {
        radius = Math.max(radius, x0 + ((x1 - x0) * (y - y0)) / (y1 - y0));
      }
    }
    if (radius < 1e-6) continue;
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = (2 * Math.PI * i) / segments;
      pts.push([radius * Math.cos(t), y, radius * Math.sin(t)]);
    }
    curves.push(pts);
  }

  return curves;
}

/**
 * Streamlines through a set of seeds, integrated both ways from each.
 *
 * Forward only would start every curve abruptly on the seed ring, which reads as
 * a set of marks rather than as a field. Integrating backwards as well and
 * joining the two halves puts the seed in the middle of its own streamline,
 * where it is invisible.
 *
 * Seeds sit off the stagnation plane z = 0, where the axial velocity vanishes
 * identically and a parcel would circle in the plane forever.
 *
 * Advection time is carried through the join so it increases monotonically from
 * the upstream end of the finished curve: the backward half's clock is counted
 * down to the seed and the forward half's counted up from it. That is what the
 * parcels ride, and it is the reason both halves are integrated with the time
 * component accumulating positively.
 */
export function familyStreamlines(field, { radial, axial }, { rings = 4, perRing = 8, tol = 1e-5, maxTurn = 0.14 } = {}) {
  const scale = Math.max(radial, axial);
  // Cut each curve where it has left the neighbourhood of the core. Tight
  // enough that most of what is drawn is inside the outline, loose enough that
  // curves visibly leave through the ends rather than stopping on the surface,
  // which is what the strain is doing to the fluid and is worth seeing.
  const clipR = 1.45 * radial, clipZ = 1.6 * axial;
  const opts = {
    tol, maxTurn,
    hInit: 0.04 * scale,
    hMin: 0.002 * scale,
    hMax: 0.22 * scale,
    // The integrator stops just outside the clip rather than far outside it.
    // Every step past the clip is thrown away, and this is rebuilt on every
    // frame of a slider drag, so it is most of the cost of the drag.
    maxLength: 7 * scale,
    bound: 1.75 * scale,
    maxSteps: 600
  };

  /** How many leading samples are inside the drawn region. */
  const clip = (line) => {
    let n = 0;
    while (n < line.count) {
      const k = n * 3;
      const r = Math.hypot(line.points[k], line.points[k + 1]);
      if (r > clipR || Math.abs(line.points[k + 2]) > clipZ) break;
      n++;
    }
    return n;
  };

  const lines = [];
  for (let i = 0; i < rings; i++) {
    const f = rings === 1 ? 0 : i / (rings - 1);
    const r = radial * (0.22 + 1.05 * f);
    for (let j = 0; j < perRing; j++) {
      const theta = (2 * Math.PI * j) / perRing + i * 0.61;
      const sign = (i + j) % 2 ? 1 : -1;
      const z = sign * axial * 0.42 * (0.3 + 0.7 * ((j * 0.37 + i * 0.19) % 1));
      const seed = [r * Math.cos(theta), r * Math.sin(theta), z];

      const back = adaptiveStreamline(field, seed, { ...opts, direction: -1 });
      const fwd = adaptiveStreamline(field, seed, { ...opts, direction: 1 });
      const nb = clip(back), nf = clip(fwd);
      if (nb + nf < 6) continue;

      const points = [], speeds = [], times = [];
      const tSeed = nb ? back.times[nb - 1] : 0;
      for (let n = nb - 1; n >= 0; n--) {
        points.push(back.points[n * 3], back.points[n * 3 + 1], back.points[n * 3 + 2]);
        speeds.push(back.speeds[n]);
        times.push(tSeed - back.times[n]);
      }
      // From one, not zero: the forward half's first sample is the seed, which
      // the backward half has already contributed. Emitting it twice would put a
      // zero-length segment in the middle of every curve.
      for (let n = nb ? 1 : 0; n < nf; n++) {
        points.push(fwd.points[n * 3], fwd.points[n * 3 + 1], fwd.points[n * 3 + 2]);
        speeds.push(fwd.speeds[n]);
        times.push(tSeed + fwd.times[n]);
      }
      if (speeds.length > 2) lines.push({ points, speeds, times, count: speeds.length });
    }
  }
  return lines;
}

/** Plastic number, for a low-discrepancy seeding. */
const PLASTIC = 1.22074408460575947536;
const R3 = [1 / PLASTIC, 1 / PLASTIC ** 2, 1 / PLASTIC ** 3];
const quasi = (n, k) => (0.5 + n * R3[k]) % 1;

const smooth01 = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Samples of history each parcel drags behind it. */
export const PARCEL_TRAIL = 12;

/**
 * A swarm of parcels, integrated.
 *
 * These are not markers walking along the tabulated streamlines. Each one is a
 * point of fluid with a position, an age and a lifetime, stepped through the
 * velocity field by the same Runge-Kutta the streamlines are drawn with, and
 * dragging a short ring buffer of where it has just been. It agrees with the
 * streamlines because the field is steady and they are solutions of the same
 * equation, not because it was told to follow one -- and when a slider moves
 * the field out from under it, it does what fluid does rather than snapping to
 * a curve that has been recomputed.
 *
 * The trail spans a fixed number of frames, so its length on the page is the
 * distance the parcel has just covered: long where the fluid is quick and a dot
 * where it dawdles.
 */
export function createParcelSwarm(capacity) {
  return {
    capacity,
    /** How many of them the reader has asked for. The rest are not touched. */
    active: 0,
    pos: new Float64Array(capacity * 3),
    age: new Float64Array(capacity),
    life: new Float64Array(capacity),
    respawn: new Int32Array(capacity),
    /** Ring buffer of x, y, z, speed, particle-major. */
    trail: new Float64Array(capacity * PARCEL_TRAIL * 4),
    /** Samples committed since this parcel was last born, capped at the trail. */
    filled: new Int32Array(capacity),
    head: 0
  };
}

const LIFE = { min: 2.6, max: 5.4 };

/** Put parcel `i` somewhere new, and forget where it has been. */
function bear(swarm, i, core) {
  const t = i + swarm.respawn[i] * 977;
  // Uniform in radius rather than in area. Uniform in area is the honest
  // seeding of a disc and it puts most of the swarm in the outer ring, where
  // this flow is slowest and there is least to see.
  const r = core.radial * (0.06 + 1.22 * quasi(t, 0));
  const th = 2 * Math.PI * quasi(t, 1);
  const q = quasi(t, 2);
  swarm.pos[i * 3] = r * Math.cos(th);
  swarm.pos[i * 3 + 1] = r * Math.sin(th);
  swarm.pos[i * 3 + 2] = core.axial * 1.15 * (2 * q - 1);
  swarm.age[i] = 0;
  swarm.life[i] = LIFE.min + (LIFE.max - LIFE.min) * quasi(t + 31, 1);
  swarm.filled[i] = 0;
}

/**
 * Step every parcel forward by `dt` seconds of the reader's time.
 *
 * `rate` is one global factor on everyone's clock -- watching in slow motion,
 * not moving anything at a speed of its own. Substepping is by how far a parcel
 * would travel: the core of a fast member is stepped several times per frame
 * while the outer fluid of a slow one is stepped once, so the cost goes where
 * the motion is.
 */
export function advanceParcels(swarm, field, core, dt, { rate = 1.4, active } = {}) {
  const { pos, trail } = swarm;
  const scale = Math.max(core.radial, core.axial);
  const boundR = 1.55 * core.radial, boundZ = 1.7 * core.axial;
  const maxTravel = 0.05 * scale;

  const count = Math.min(swarm.capacity, Math.max(0, active ?? swarm.active));
  // Parcels the reader has just asked for are born where the core is now, not
  // where it was when the figure loaded.
  for (let i = swarm.active; i < count; i++) bear(swarm, i, core);
  swarm.active = count;
  if (!count) return;

  const k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0], tmp = [0, 0, 0];
  const h = dt * rate;
  const slot = (swarm.head + 1) % PARCEL_TRAIL;

  for (let i = 0; i < count; i++) {
    let x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];

    field(x, y, z, k1);
    const speed = Math.hypot(k1[0], k1[1], k1[2]);

    const sub = Math.min(8, Math.max(1, Math.ceil((h * speed) / maxTravel)));
    const hs = h / sub;
    for (let n = 0; n < sub; n++) {
      // k1 is already the velocity here on the first substep; recomputing it on
      // the later ones is what the substepping is for.
      if (n) field(x, y, z, k1);
      tmp[0] = x + 0.5 * hs * k1[0]; tmp[1] = y + 0.5 * hs * k1[1]; tmp[2] = z + 0.5 * hs * k1[2];
      field(tmp[0], tmp[1], tmp[2], k2);
      tmp[0] = x + 0.5 * hs * k2[0]; tmp[1] = y + 0.5 * hs * k2[1]; tmp[2] = z + 0.5 * hs * k2[2];
      field(tmp[0], tmp[1], tmp[2], k3);
      tmp[0] = x + hs * k3[0]; tmp[1] = y + hs * k3[1]; tmp[2] = z + hs * k3[2];
      field(tmp[0], tmp[1], tmp[2], k4);
      x += (hs / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      y += (hs / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      z += (hs / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    }

    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    swarm.age[i] += dt;

    // Retire a parcel that has run its life, left the neighbourhood of the
    // core, or been left stranded outside it by a slider moving the core out
    // from under it. The trail is forgotten with it rather than being broken,
    // so nothing has to be drawn across the jump.
    const escaped = Math.hypot(x, y) > boundR || Math.abs(z) > boundZ ||
      !Number.isFinite(x + y + z);
    if (swarm.age[i] > swarm.life[i] || escaped) {
      swarm.respawn[i]++;
      bear(swarm, i, core);
      x = pos[i * 3]; y = pos[i * 3 + 1]; z = pos[i * 3 + 2];
    }

    const k = (i * PARCEL_TRAIL + slot) * 4;
    trail[k] = x; trail[k + 1] = y; trail[k + 2] = z; trail[k + 3] = speed;
    if (swarm.filled[i] < PARCEL_TRAIL) swarm.filled[i]++;
  }

  swarm.head = slot;
}

/**
 * Flatten the swarm into the renderer's buffer, two vec4 per vertex.
 *
 * The first carries position and speed, the second the parcel's fade and the
 * taper of its stroke -- a second varying, which is why parcels have a vertex
 * function of their own rather than sharing the streamlines'. A negative speed
 * in the first is the break between parcels.
 */
export function packParcels(target, swarm) {
  const { active: count, trail, filled, head } = swarm;
  const capacity = target.length / 8;
  let n = 0;

  for (let i = 0; i < count; i++) {
    const v = filled[i];
    if (v < 2) continue;
    if (n + v + 1 > capacity) break;

    // Born and retired gently, so recycling never shows as a pop.
    const f = swarm.age[i] / swarm.life[i];
    const fade = smooth01(f / 0.09) * (1 - smooth01((f - 0.8) / 0.2));
    if (fade < 0.01) continue;

    for (let j = 0; j < v; j++) {
      // Oldest first: the ring's head is the parcel's present.
      const s = (head - (v - 1) + j + 2 * PARCEL_TRAIL) % PARCEL_TRAIL;
      const k = (i * PARCEL_TRAIL + s) * 4;
      const along = v > 1 ? j / (v - 1) : 1;
      const o = n * 8;
      target[o] = trail[k];
      target[o + 1] = trail[k + 2];
      target[o + 2] = -trail[k + 1];
      target[o + 3] = Math.min(1, trail[k + 3] / SPEED_REF);
      target[o + 4] = fade;
      target[o + 5] = 0.34 + 0.66 * along;
      n++;
    }
    target[n * 8 + 3] = -1;
    n++;
  }
  return n;
}


/**
 * Flatten curves into the renderer's buffer.
 *
 * One vec4 per sample: position in render coordinates -- the field's axis of
 * symmetry is z and the render frame's is y, the same swap the meshes get -- and
 * a scalar in w. A negative w is the break between one curve and the next, which
 * the vertex function turns into a zero-width vertex and the line renderer takes
 * as an instruction to lift the pen.
 */
export function packCurves(target, curves, offset = 0) {
  let n = offset;
  const capacity = target.length / 4;
  for (const curve of curves) {
    if (n + curve.length + 1 > capacity) break;
    for (let i = 0; i < curve.length; i++) {
      const [x, y, z] = curve[i];
      target[n * 4] = x;
      target[n * 4 + 1] = y;
      target[n * 4 + 2] = z;
      target[n * 4 + 3] = 0;
      n++;
    }
    target[n * 4 + 3] = -1;
    n++;
  }
  return n;
}

/** The same, for curves that arrive as flat point/speed arrays. */
export function packStreamlines(target, lines, offset = 0) {
  let n = offset;
  const capacity = target.length / 4;
  for (const line of lines) {
    if (n + line.count + 1 > capacity) break;
    for (let i = 0; i < line.count; i++) {
      const k = i * 3;
      target[n * 4] = line.points[k];
      target[n * 4 + 1] = line.points[k + 2];
      target[n * 4 + 2] = -line.points[k + 1];
      target[n * 4 + 3] = Math.min(1, line.speeds[i] / SPEED_REF);
      n++;
    }
    target[n * 4 + 3] = -1;
    n++;
  }
  return n;
}

/** Byte size of the shared view block. */
export const FAMILY_VIEW_SIZE = 112;

const VIEW_BLOCK = /* wgsl */`
struct FamilyView {
  projView: mat4x4f,
  background: vec3f,
  streamWidth: f32,
  parcelWidth: f32,
  capsuleWidth: f32,
  isDark: f32,
  streamGain: f32,
  parcelGain: f32,
  capsuleAlpha: f32,
};

@group(1) @binding(1) var<uniform> view: FamilyView;
`;

/**
 * @param widthField which of the three widths this entity is stroked at, so all
 *        of them share one vertex function and one uniform block.
 */
export function familyVertexBody(widthField) {
  return VIEW_BLOCK + /* wgsl */`
@group(1) @binding(0) var<storage, read> samples: array<vec4f>;

struct Vertex {
  position: vec4f,
  width: f32,
  scalar: f32,
};

fn getVertex(index: u32) -> Vertex {
  let smp = samples[index];
  if (smp.w < 0.0) { return Vertex(vec4f(0.0), 0.0, 0.0); }
  return Vertex(view.projView * vec4f(smp.xyz, 1.0), view.${widthField}, smp.w);
}
`;
}

/**
 * Streamlines and parcels, which differ only in how far they are held off the
 * background.
 *
 * With parcels running, the streamlines they run along are faded back rather
 * than darkened: a curve that is meant to recede has to move toward the paper,
 * not toward black, or it turns into a different and louder mark on a light
 * page. Which is why the background is in the uniform block at all.
 *
 * @param gainField how much of the full colour this entity keeps.
 */
export function familyLineFragment(gainField) {
  return VIEW_BLOCK + colormapWGSL + /* wgsl */`
fn getColor(lineCoord: vec2f, scalar: f32) -> vec4f {
  if (abs(lineCoord.x) > 0.0 && dot(lineCoord, lineCoord) > 1.0) { discard; }

  // Speed, on the ramp the whole notebook uses for it, and on a scale that does
  // not move with the parameters -- so turning the swirl up makes the picture
  // hotter rather than making it look the same.
  var c = colormap(scalar);
  c = mix(c * 0.66, c, view.isDark);

  // Darken across the width, so a stroke reads as a filament rather than a flat
  // ribbon. A line carries no normal, so this is the only shading available.
  let r = abs(lineCoord.y);
  c = c * (1.0 - 0.35 * r * r);

  return vec4f(mix(view.background, c, view.${gainField}), 1.0);
}
`;
}

/**
 * The parcels' own vertex function.
 *
 * Two vec4 per vertex rather than one, because a parcel needs a second varying
 * the streamlines do not: how far through its life it is. The stroke tapers
 * toward the tail out of the same record.
 */
export const parcelVertexBody = VIEW_BLOCK + /* wgsl */`
@group(1) @binding(0) var<storage, read> samples: array<vec4f>;

struct Vertex {
  position: vec4f,
  width: f32,
  scalar: f32,
  fade: f32,
};

fn getVertex(index: u32) -> Vertex {
  let a = samples[index * 2u];
  if (a.w < 0.0) { return Vertex(vec4f(0.0), 0.0, 0.0, 0.0); }
  let b = samples[index * 2u + 1u];
  return Vertex(view.projView * vec4f(a.xyz, 1.0), view.parcelWidth * b.y, a.w, b.x);
}
`;

export const familyParcelFragment = VIEW_BLOCK + colormapWGSL + /* wgsl */`
fn getColor(lineCoord: vec2f, scalar: f32, fade: f32) -> vec4f {
  if (abs(lineCoord.x) > 0.0 && dot(lineCoord, lineCoord) > 1.0) { discard; }

  var c = colormap(scalar);
  c = mix(c * 0.66, c, view.isDark);
  let r = abs(lineCoord.y);
  c = c * (1.0 - 0.35 * r * r);

  // Faded toward the page as the parcel is born and again as it is retired, so
  // recycling never shows as a pop.
  return vec4f(mix(view.background, c, view.parcelGain * clamp(fade, 0.0, 1.0)), 1.0);
}
`;

export const familyCapsuleFragment = VIEW_BLOCK + /* wgsl */`
fn getColor(lineCoord: vec2f, scalar: f32) -> vec4f {
  if (abs(lineCoord.x) > 0.0 && dot(lineCoord, lineCoord) > 1.0) { discard; }

  // The size colour, the same one every outline in the notebook is drawn in.
  var c = vec3f(0.129, 0.690, 0.769);
  c = mix(c * 0.72, c, view.isDark);

  // Premultiplied. The wireframe is drawn after everything else with the depth
  // test on and depth writes off, so whatever is in front of it has already
  // removed it and what is left only has to read as a surface.
  let a = view.capsuleAlpha;
  return vec4f(c * a, a);
}
`;
