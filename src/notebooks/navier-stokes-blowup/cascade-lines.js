import { colormapWGSL } from './shaders.js';

/**
 * The cascade drawn as screen-projected lines rather than tubes.
 *
 * A tube has a radius in the world, so zooming into the cascade magnifies the
 * strokes along with everything else and the picture reads as a solid model
 * being approached. A velocity field has no thickness; the line is a mark on
 * the page standing for a curve, and its weight should be a property of the
 * page. So the width here is in device pixels, identical in every generation,
 * and the only thing the zoom changes is where the curves go.
 *
 * That also fixes the cascade's worst legibility problem for free. Generation m
 * is drawn at scale Lambda^-m, so a tube of fixed world radius fell below a
 * pixel by the third generation and the deep packets aliased into mush.
 */

/**
 * Flatten tabulated streamlines into one buffer the vertex function can index.
 *
 * Lines vary in length, so rather than padding them to a common stride each is
 * followed by a sentinel sample. The library reads a position with w = 0 as a
 * line break, skips that instance and turns the neighbouring joins into caps,
 * so one draw call covers every line and every generation.
 *
 * Points arrive in field coordinates, where the axis of symmetry is z; the same
 * swap `toYUp` applies to meshes is applied here.
 */
export function packStreamlines(lines, [lo, hi]) {
  const span = hi - lo || 1;
  let count = 0;
  for (const line of lines) count += line.count + 1;

  // xyz is the position, w the normalized speed. A negative w marks the break.
  const samples = new Float32Array(count * 4);
  const phases = new Float32Array(count);

  let n = 0;
  for (const line of lines) {
    for (let i = 0; i < line.count; i++) {
      samples[n * 4] = line.points[i * 3];
      samples[n * 4 + 1] = line.points[i * 3 + 2];
      samples[n * 4 + 2] = -line.points[i * 3 + 1];
      samples[n * 4 + 3] = Math.min(1, Math.max(0, (line.speeds[i] - lo) / span));
      phases[n] = line.times[i];
      n++;
    }
    samples[n * 4 + 3] = -1;
    n++;
  }
  return { samples, phases, count };
}

/** Byte size of the shared view block. */
export const VIEW_SIZE = 112;

const VIEW_BLOCK = /* wgsl */`
struct ViewUniforms {
  projView: mat4x4f,
  background: vec3f,
  width: f32,
  flowRate: f32,
  flowAmp: f32,
  isDark: f32,
  exposure: f32,
  samplesPerGen: u32,
  genCount: u32,
  _pad0: vec2f,
};

@group(1) @binding(2) var<uniform> view: ViewUniforms;
`;

export const lineVertexBody = VIEW_BLOCK + /* wgsl */`
@group(1) @binding(0) var<storage, read> samples: array<vec4f>;
@group(1) @binding(1) var<storage, read> phases: array<f32>;

/** One drawn copy of the packet: its scale about the blowup point, its azimuth,
 *  how far it has faded in or out, and where its pulses have got to. */
struct Generation {
  scale: f32,
  twist: f32,
  opacity: f32,
  pulse: f32,
};
@group(1) @binding(3) var<storage, read> gens: array<Generation>;

struct Vertex {
  position: vec4f,
  width: f32,
  scalar: f32,
  pulse: f32,
  opacity: f32,
};

fn getVertex(index: u32) -> Vertex {
  let per = view.samplesPerGen;
  let g = index / per;
  let s = index % per;

  // A zero w is the library's line break, which is also what an out-of-range
  // generation and a faded-out one should produce.
  if (g >= view.genCount) { return Vertex(vec4f(0.0), 0.0, 0.0, 0.0, 0.0); }
  let gen = gens[g];
  if (gen.opacity <= 0.004) { return Vertex(vec4f(0.0), 0.0, 0.0, 0.0, 0.0); }

  let smp = samples[s];
  if (smp.w < 0.0) { return Vertex(vec4f(0.0), 0.0, 0.0, 0.0, 0.0); }

  let c = cos(gen.twist);
  let sn = sin(gen.twist);
  let p = smp.xyz;
  let world = gen.scale * vec3f(p.x * c + p.z * sn, p.y, -p.x * sn + p.z * c);

  // The pulse argument is assembled here, linear along the curve, so the
  // fragment only has to take its fractional part. Interpolating it between
  // samples is exact because it is linear in the baked advection time.
  return Vertex(
    view.projView * vec4f(world, 1.0),
    view.width,
    smp.w,
    phases[s] * view.flowRate - gen.pulse,
    gen.opacity
  );
}
`;

export const lineFragmentBody = VIEW_BLOCK + colormapWGSL + /* wgsl */`
fn getColor(lineCoord: vec2f, scalar: f32, pulse: f32, opacity: f32) -> vec4f {
  // Round the caps off. Elsewhere lineCoord.x is zero and nothing is discarded.
  if (abs(lineCoord.x) > 0.0 && dot(lineCoord, lineCoord) > 1.0) { discard; }

  var base = colormap(scalar);
  base = mix(base * 0.72, base, view.isDark);

  // The travelling brightness pulse, from the same advection-time phase the
  // tubes used.
  let f = fract(pulse);
  let band = smoothstep(0.55, 0.9, f) * (1.0 - smoothstep(0.9, 1.0, f));
  base = base * (1.0 + view.flowAmp * band);

  // Darken toward the edges so a stroke reads as a filament rather than a flat
  // ribbon. This is the only shading there is: a line carries no normal, and
  // lighting it would put back the solid-object look the lines are here to
  // avoid.
  let r = abs(lineCoord.y);
  base = base * (1.0 - 0.5 * r * r) * view.exposure;

  // Opaque, with the generation fade done as a mix toward the background rather
  // than through alpha. Against the background the two are identical, and this
  // way the depth test alone resolves every overlap: no sorting, no peeling,
  // and multisampling is free to do the edges.
  return vec4f(mix(view.background, base, opacity), 1.0);
}
`;
