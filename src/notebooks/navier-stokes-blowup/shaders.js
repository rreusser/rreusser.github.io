// Geometry reaches the GPU already in render coordinates, with +y as the axis
// of symmetry. The uniform block is shared by both pipelines; offsets follow
// WGSL's alignment rules (mat4x4f and vec3f both align to 16), giving a struct
// of 192 bytes that the renderer writes by float index.
const UNIFORMS = /* wgsl */`
struct Uniforms {
  projection: mat4x4f,
  view: mat4x4f,
  eye: vec3f,
  time: f32,
  background: vec3f,
  flowRate: f32,
  flowAmp: f32,
  exposure: f32,
  fogDensity: f32,
  fogStart: f32,
  isDark: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
`;

const SHARED = /* wgsl */`
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

export const tubeShaderCode = UNIFORMS + SHARED + /* wgsl */`
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) vPosition: vec3f,
  @location(1) vNormal: vec3f,
  @location(2) vScalar: f32,
  @location(3) vPhase: f32,
  @location(4) vOpacity: f32,
  @location(5) vRate: f32,
};

/**
 * Two instance records per draw.
 *
 * instA = (scale, twist, opacity, pulse rate) places one generation of the
 * cascade: generation m sits at scale Lambda^-m, centred at offset * Lambda^-m
 * along the axis, so the chain maps onto itself when m shifts by one and
 * sweeping m continuously is a seamless zoom.
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
  @location(5) instB: vec4f
) -> VertexOutput {
  let sy = instB.x;
  let sr = instB.y;

  // Anisotropic stretch about the axis. Normals transform by the inverse
  // transpose, which for a diagonal scale is the reciprocal on each axis.
  let stretched = vec3f(position.x * sr, position.y * sy, position.z * sr);
  let nStretched = normalize(vec3f(normal.x / sr, normal.y / sy, normal.z / sr));

  // Offset first, then twist, so the twist doubles as an azimuth for repeated
  // pieces. A y-axis rotation fixes the y offset either way.
  let placed = stretched + vec3f(instB.w, instB.z, 0.0);

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
  out.vRate = instA.w;
  return out;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
  let N = normalize(in.vNormal);
  let V = normalize(u.eye - in.vPosition);

  // Flip the normal toward the viewer so the inside of a tube is never black.
  let Nf = select(-N, N, dot(N, V) > 0.0);

  var base = colormap(in.vScalar);
  // On a light ground the top of the ramp washes out, so deepen it.
  base = mix(base * 0.72, base, u.isDark);

  // A pulse travelling along the streamline or arrow. Phase is elapsed
  // advection time for tubes and tail-to-tip position for arrows, so in both
  // cases a pulse moving in phase reads as motion in the flow direction. Both
  // smoothstep edges ascend: WGSL leaves it undefined when low >= high.
  let pulse = fract(in.vPhase * u.flowRate - u.time * in.vRate);
  let band = smoothstep(0.55, 0.9, pulse) * (1.0 - smoothstep(0.9, 1.0, pulse));
  base = base * (1.0 + u.flowAmp * band);

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

  // Depth fade separates the layers of the tangle.
  let dist = length(u.eye - in.vPosition);
  let fog = 1.0 - exp(-u.fogDensity * max(dist - u.fogStart, 0.0));
  color = mix(color, u.background, clamp(fog, 0.0, 1.0));

  return vec4f(color * in.vOpacity, in.vOpacity);
}
`;

export const axisShaderCode = UNIFORMS + /* wgsl */`
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) vAlpha: f32,
};

@vertex
fn vs(@location(0) position: vec3f, @location(1) alpha: f32) -> VertexOutput {
  var out: VertexOutput;
  out.position = u.projection * u.view * vec4f(position, 1.0);
  out.vAlpha = alpha;
  return out;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
  let tint = mix(vec3f(0.28, 0.32, 0.38), vec3f(0.72, 0.76, 0.82), u.isDark);
  let a = in.vAlpha;
  return vec4f(tint * a, a);
}
`;
