export const tubeShaderCode = /* wgsl */`
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
  axisFade: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) vPosition: vec3f,
  @location(1) vNormal: vec3f,
  @location(2) vScalar: f32,
  @location(3) vPhase: f32,
};

@vertex
fn vs(
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) scalar: f32,
  @location(3) phase: f32
) -> VertexOutput {
  var out: VertexOutput;
  out.position = u.projection * u.view * vec4f(position, 1.0);
  out.vPosition = position;
  out.vNormal = normal;
  out.vScalar = scalar;
  out.vPhase = phase;
  return out;
}

// A six-stop ramp running from deep teal through cyan and blue into warm amber.
// Slow outer fluid reads cool, the fast swirling core reads hot.
fn colormap(t: f32) -> vec3f {
  let c0 = vec3f(0.043, 0.220, 0.263);
  let c1 = vec3f(0.129, 0.690, 0.769);
  let c2 = vec3f(0.184, 0.435, 0.816);
  let c3 = vec3f(0.365, 0.396, 0.722);
  let c4 = vec3f(0.788, 0.545, 0.322);
  let c5 = vec3f(0.965, 0.729, 0.451);

  let x = clamp(t, 0.0, 1.0) * 5.0;
  var c = mix(c0, c1, smoothstep(0.0, 1.0, x));
  c = mix(c, c2, smoothstep(1.0, 2.0, x));
  c = mix(c, c3, smoothstep(2.0, 3.0, x));
  c = mix(c, c4, smoothstep(3.0, 4.0, x));
  c = mix(c, c5, smoothstep(4.0, 5.0, x));
  return c;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
  let N = normalize(in.vNormal);
  let V = normalize(u.eye - in.vPosition);

  // Flip the normal toward the viewer so the interior of a tube is never black.
  let Nf = select(-N, N, dot(N, V) > 0.0);

  var base = colormap(in.vScalar);

  // A pulse travelling along the streamline at the local advection speed. The
  // phase attribute is elapsed advection time, so pulses move with the fluid.
  // Both edges ascend: WGSL leaves smoothstep undefined when low >= high, so the
  // trailing edge is built as 1 - smoothstep rather than a descending one.
  let pulse = fract(in.vPhase * u.flowRate - u.time);
  let band = smoothstep(0.55, 0.9, pulse) * (1.0 - smoothstep(0.9, 1.0, pulse));
  base = base * (1.0 + u.flowAmp * band);

  let key = normalize(vec3f(0.45, 0.75, 0.6));
  let fill = normalize(vec3f(-0.6, -0.3, 0.35));

  let diffuse = 0.62 * max(dot(Nf, key), 0.0) + 0.22 * max(dot(Nf, fill), 0.0);
  let ambient = 0.26;

  let H = normalize(key + V);
  let spec = 0.35 * pow(max(dot(Nf, H), 0.0), 34.0);

  // Rim light picks the tubes out of a dark background where they overlap.
  let rim = 0.35 * pow(1.0 - max(dot(Nf, V), 0.0), 2.6);

  var color = base * (ambient + diffuse) + vec3f(spec) + base * rim;
  color = color * u.exposure;

  // Depth fade toward the background separates the layers of the tangle.
  let dist = length(u.eye - in.vPosition);
  let fog = 1.0 - exp(-u.fogDensity * max(dist - 4.0, 0.0));
  color = mix(color, u.background, clamp(fog, 0.0, 1.0));

  return vec4f(color, 1.0);
}
`;

export const axisShaderCode = /* wgsl */`
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
  axisFade: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

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
  let a = in.vAlpha * u.axisFade;
  return vec4f(vec3f(0.72, 0.76, 0.82) * a, a);
}
`;
