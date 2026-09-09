// Geometry reaches the GPU already in render coordinates, with +y as the axis
// of symmetry. The uniform block is shared by both pipelines; offsets follow
// WGSL's alignment rules (mat4x4f and vec3f both align to 16), giving a struct
// of 176 bytes that the renderer writes by float index.
const UNIFORMS = /* wgsl */`
struct Uniforms {
  projection: mat4x4f,
  view: mat4x4f,
  eye: vec3f,
  isDark: f32,
  background: vec3f,
  flowRate: f32,
  flowAmp: f32,
  exposure: f32,
  time: f32,
  _pad0: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
`;

export const colormapWGSL = /* wgsl */`
// A six-stop ramp from deep teal through cyan and blue into warm amber. Slow
// outer fluid reads cool, the fast core reads hot, and the arrow families pick
// fixed points on the same ramp so the whole figure stays one palette.
fn colormap(t: f32) -> vec3f {
  let c0 = vec3f(0.102, 0.451, 0.541);
  let c1 = vec3f(0.180, 0.800, 0.867);
  let c2 = vec3f(0.235, 0.522, 0.902);
  let c3 = vec3f(0.510, 0.451, 0.784);
  let c4 = vec3f(0.898, 0.612, 0.341);
  let c5 = vec3f(0.980, 0.812, 0.569);

  let x = clamp(t, 0.0, 1.0) * 5.0;
  var c = mix(c0, c1, smoothstep(0.0, 1.0, x));
  c = mix(c, c2, smoothstep(1.0, 2.0, x));
  c = mix(c, c3, smoothstep(2.0, 3.0, x));
  c = mix(c, c4, smoothstep(3.0, 4.0, x));
  c = mix(c, c5, smoothstep(4.0, 5.0, x));
  return c;
}
`;

export const tubeShaderCode = UNIFORMS + colormapWGSL + /* wgsl */`
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) vPosition: vec3f,
  @location(1) vNormal: vec3f,
  @location(2) vScalar: f32,
  @location(3) vPhase: f32,
  @location(4) vOpacity: f32,
  @location(5) vPulse: f32,
  @location(6) vPulseAmp: f32,
};

/**
 * Two instance records per draw.
 *
 * instA = (scale, twist, opacity, pulse phase) places one generation of the
 * cascade. Generation m is drawn at scale Lambda^-m about a shared centre, so
 * the family maps onto itself when m shifts by one and sweeping m continuously
 * is a seamless zoom about the middle of the picture.
 *
 * The phase is accumulated by the caller rather than derived from a clock times
 * a rate. A rate that varies with scroll, multiplied by an absolute time that
 * has grown to hundreds of seconds, slews the pulses by whole cycles for a
 * fractional change in rate.
 *
 * instB = (stretchY, stretchR, offsetY, offsetR) is the volume-preserving
 * stretch of the walkthrough, pulling a tube to stretchY along the axis while
 * squeezing it to stretchR across, plus a placement offset applied before the
 * twist so that one piece of geometry can be repeated around the axis. Carrying
 * the stretch per instance rather than as a uniform lets the core deform while
 * the arrows representing the straining flow keep their proportions.
 */
@vertex
fn vs(
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) scalar: f32,
  @location(3) phase: f32,
  @location(4) instA: vec4f,
  @location(5) instB: vec4f,
  @location(6) instC: vec4f
) -> VertexOutput {
  let sy = instB.x;
  let sr = instB.y;

  // instC.z stretches a piece along its own z before anything else, which for
  // the swarm's dashes is the direction they travel. A parcel moving twice as
  // fast leaves twice the streak in the same exposure, so the length carries the
  // speed and the thickness stays put. Everything else passes 1.
  let ez = instC.z;

  // Anisotropic stretch about the axis. Normals transform by the inverse
  // transpose, which for a diagonal scale is the reciprocal on each axis.
  var stretched = vec3f(position.x * sr, position.y * sy, position.z * sr * ez);
  var nStretched = normalize(vec3f(normal.x / sr, normal.y / sy, normal.z / (sr * ez)));

  // A slow writhe along the core. Vorticity in a real flow is never a straight
  // line, and stretching pulls a tube straight, so the amplitude rides on the
  // radial contraction: the line visibly relaxes as it thins. Two incommensurate
  // wavenumbers per axis keep it from reading as a coil, and the spatial
  // frequencies are low enough that the surface normals are barely affected.
  let writhe = instC.y * sr;
  if (writhe > 0.0) {
    let h = stretched.y;
    stretched.x += writhe * (sin(0.62 * h + 0.62 * u.time) + 0.55 * sin(1.13 * h - 0.44 * u.time));
    stretched.z += writhe * (cos(0.71 * h - 0.50 * u.time) + 0.55 * cos(0.94 * h + 0.55 * u.time));
  }

  // Offset first, then twist, so the twist doubles as an azimuth for repeated
  // pieces. A y-axis rotation fixes the y offset either way.
  var placed = stretched + vec3f(instB.w, instB.z, 0.0);

  // instC.w bends a piece around the axis at its own orbital radius instead of
  // placing it as a straight chord. A parcel's dash lies along the direction it
  // travels, which is an arc, and once the dash is stretched by its speed a
  // chord leaves the circle entirely: the swarm grows straight spikes that
  // visibly do not follow the tube they are orbiting. Wrapping the local z into
  // an angle keeps every dash on its own streamline however long it gets.
  let R = instB.w;
  if (instC.w > 0.0 && R > 1e-4) {
    let ang = stretched.z / R;
    let ca2 = cos(ang);
    let sa2 = sin(ang);
    let rad = R + stretched.x;
    placed = vec3f(rad * ca2, stretched.y + instB.z, rad * sa2);
    // The bend rotates the local frame about y by the same angle.
    nStretched = vec3f(
      nStretched.x * ca2 - nStretched.z * sa2,
      nStretched.y,
      nStretched.x * sa2 + nStretched.z * ca2
    );
  }

  let a = instA.y;
  let ca = cos(a);
  let sa = sin(a);
  let pr = vec3f(placed.x * ca + placed.z * sa, placed.y, -placed.x * sa + placed.z * ca);
  let nr = vec3f(nStretched.x * ca + nStretched.z * sa, nStretched.y, -nStretched.x * sa + nStretched.z * ca);

  let world = instA.x * pr;

  var out: VertexOutput;
  out.position = u.projection * u.view * vec4f(world, 1.0);
  out.vPosition = world;
  out.vNormal = nr;
  out.vScalar = scalar;
  out.vPhase = phase;
  out.vOpacity = instA.z;
  out.vPulse = instA.w;
  // instC.x is the pulse amplitude. A material marker carried by the flow gets
  // zero: its own motion already shows the velocity, and a highlight running
  // along it as well would claim a second, different one.
  out.vPulseAmp = instC.x;
  return out;
}

fn shade(in: VertexOutput) -> vec4f {
  let N = normalize(in.vNormal);
  let V = normalize(u.eye - in.vPosition);

  // Flip the normal toward the viewer so the inside of a tube is never black.
  let Nf = select(-N, N, dot(N, V) > 0.0);

  var base = colormap(in.vScalar);
  // On a light ground the top of the ramp washes out, so deepen it.
  base = mix(base * 0.72, base, u.isDark);

  // A pulse travelling along the streamline or arrow. The vertex phase is
  // elapsed advection time for tubes and tail-to-tip position for arrows, so in
  // both cases a pulse moving through it reads as motion in the flow direction.
  // Both smoothstep edges ascend: WGSL leaves it undefined when low >= high.
  let pulse = fract(in.vPhase * u.flowRate - in.vPulse);
  let band = smoothstep(0.55, 0.9, pulse) * (1.0 - smoothstep(0.9, 1.0, pulse));
  base = base * (1.0 + u.flowAmp * in.vPulseAmp * band);

  let key = normalize(vec3f(0.45, 0.6, 0.75));
  let fill = normalize(vec3f(-0.6, 0.35, -0.3));

  let diffuse = 0.62 * max(dot(Nf, key), 0.0) + 0.22 * max(dot(Nf, fill), 0.0);
  let ambient = mix(0.42, 0.26, u.isDark);

  let H = normalize(key + V);
  let spec = 0.35 * pow(max(dot(Nf, H), 0.0), 34.0);

  // Rim light picks the tubes out of a dark background where they overlap. It
  // does the opposite on a light one, so it is dialled back there.
  let rim = mix(0.08, 0.35, u.isDark) * pow(1.0 - max(dot(Nf, V), 0.0), 2.6);

  var color = (base * (ambient + diffuse) + vec3f(spec) + base * rim) * u.exposure;

  // Premultiplied, so the peel layers composite with one / one-minus-src-alpha.
  return vec4f(color * in.vOpacity, in.vOpacity);
}

@fragment
fn fsFirst(in: VertexOutput) -> @location(0) vec4f {
  return shade(in);
}

@group(1) @binding(0) var prevDepthTex: texture_depth_2d;

/**
 * One peel deeper. Anything at or in front of the depth captured by the
 * previous pass is discarded, so this pass captures the next surface back.
 */
@fragment
fn fsPeel(in: VertexOutput) -> @location(0) vec4f {
  let coords = vec2i(i32(in.position.x), i32(in.position.y));
  let prevDepth = textureLoad(prevDepthTex, coords, 0);
  if (in.position.z <= prevDepth + 1e-6) {
    discard;
  }
  return shade(in);
}
`;

export const compositeShaderCode = /* wgsl */`
@group(0) @binding(0) var layerTex: texture_2d<f32>;

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  // One oversized triangle covering the viewport.
  var p = array(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[i], 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) position: vec4f) -> @location(0) vec4f {
  return textureLoad(layerTex, vec2i(i32(position.x), i32(position.y)), 0);
}
`;
