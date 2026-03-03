const e=`
const PI: f32 = 3.141592653589;

struct Uniforms {
  projection: mat4x4f,
  view: mat4x4f,
  eye: vec3f,
  pixelRatio: f32,
  t: f32,
  q: f32,
  Qinv: f32,
  xi: f32,
  eta: f32,
  alpha: f32,
  beta: f32,
  lambda: f32,
  omega: f32,
  n: f32,
  scale: f32,
  translation: f32,
  rotation: f32,
  stereo: f32,
  posClip: f32,
  negClip: f32,
  fatEdge: f32,
  strips: f32,
  shittyEversion: f32,
  section: f32,
  opacity: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) vPosition: vec3f,
  @location(1) vNormal: vec3f,
  @location(2) vUV: vec2f,
};

fn safepow(x: f32, n: f32) -> f32 {
  return pow(abs(x), n);
}

fn sqr(x: f32) -> f32 {
  return x * x;
}

fn intpow(x: f32, n: f32) -> f32 {
  let isEven = fract(n * 0.5) < 0.25;
  return pow(abs(x), n) * select(sign(x), 1.0, isEven);
}

fn f(uv: vec2f) -> vec3f {
  let theta = clamp(uv.x, -PI * 0.5 + 1e-5, PI * 0.5 - 1e-5);
  let phi = uv.y;
  let cphi = cos(phi);
  let sphi = sin(phi);
  let sth = sin(theta);
  let cosnth = intpow(cos(theta), u.n);
  let h = u.omega * sth / cosnth;

  let p = 1.0 - abs(u.q * u.t);
  let kappa = mix(0.0, 0.5 * (u.n - 1.0) / u.n, u.stereo);

  var x: f32;
  var y: f32;
  var z: f32;
  let eq4 = abs(u.t) < u.Qinv - 1e-5;
  if (eq4) {
    x = u.t * cphi + p * sin((u.n - 1.0) * phi) - h * sphi;
    y = u.t * sphi + p * cos((u.n - 1.0) * phi) + h * cphi;
    z = h * sin(u.n * phi) - (u.t / u.n) * cos(u.n * phi) - u.q * u.t * h;
  } else {
    x = (u.t * (1.0 - u.lambda + u.lambda * cosnth) * cphi - u.lambda * u.omega * sth * sphi) / cosnth;
    y = (u.t * (1.0 - u.lambda + u.lambda * cosnth) * sphi + u.lambda * u.omega * sth * cphi) / cosnth;
    z = u.lambda * (u.omega * sth * (sin(u.n * phi) - u.q * u.t) / cosnth - (u.t / u.n) * cos(u.n * phi)) - (1.0 - u.lambda) * pow(u.eta, 1.0 + kappa) * u.t * pow(abs(u.t), 2.0 * kappa) * sth / sqr(cosnth);
  }

  let xiex2y2 = u.xi + u.eta * (x * x + y * y);
  let xp = x / safepow(xiex2y2, kappa);
  let yp = y / safepow(xiex2y2, kappa);
  let zp = z / mix(1.0, xiex2y2, u.stereo);

  let gamma = mix(1.0, 2.0 * sqrt(u.alpha * u.beta), u.stereo);
  let bxpyp = u.beta * (xp * xp + yp * yp);
  let egz = exp(gamma * zp);
  let xpp = xp * mix(1.0, egz / (u.alpha + bxpyp), u.stereo);
  let ypp = yp * mix(1.0, egz / (u.alpha + bxpyp), u.stereo);
  let zpp = mix(zp, (u.alpha - bxpyp) / (u.alpha + bxpyp) * egz / gamma - (u.alpha - u.beta) / (u.alpha + u.beta) / gamma, u.stereo);

  // Swizzle xzy and negate y, apply scale and translation
  var pos = vec3f(xpp, zpp, -ypp) * u.scale + vec3f(0.0, u.translation, 0.0);

  // Rotation around Y axis
  let cr = cos(u.rotation);
  let sr = sin(u.rotation);
  let rotated = mat2x2f(cr, sr, -sr, cr) * pos.xz;
  pos = vec3f(rotated.x, pos.y, rotated.y);

  // Shitty eversion effect
  pos.y = pos.y * mix(1.0, -1.0, 1.2 * u.shittyEversion * abs(uv.x));
  return pos;
}

@vertex
fn vs(@location(0) uv: vec2f) -> VertexOutput {
  var out: VertexOutput;
  let clipScale = select(u.negClip, u.posClip, uv.x > 0.0);
  out.vUV = uv * vec2f(clipScale, 1.0);
  out.vPosition = f(out.vUV);

  let dx = 2e-2;
  let dpdu = f(out.vUV + vec2f(dx, 0.0)) - out.vPosition;
  let dpdv = f(out.vUV + vec2f(0.0, dx)) - out.vPosition;
  out.vNormal = normalize(cross(dpdu, dpdv));

  out.position = u.projection * u.view * vec4f(out.vPosition, 1.0);
  return out;
}

// Grid helper functions

fn gridFactor2(parameter: vec2f, width: f32, feather: f32) -> f32 {
  let w1 = width - feather * 0.5;
  let d = fwidth(parameter);
  let looped = 0.5 - abs(fract(parameter) - 0.5);
  let a2 = smoothstep(d * w1, d * (w1 + feather), looped);
  return min(a2.x, a2.y);
}

fn gridFactor1(parameter: f32, width: f32, feather: f32) -> f32 {
  let w1 = width - feather * 0.5;
  let d = fwidth(parameter);
  let looped = 0.5 - abs(fract(parameter) - 0.5);
  return smoothstep(d * w1, d * (w1 + feather), looped);
}

fn computeShading(pos: vec3f, normal: vec3f, frontFacing: bool) -> vec3f {
  let V = normalize(u.eye - pos);
  let N = select(-normal, normal, dot(normal, V) > 0.0);
  let lightViewDir = vec3f(1.0, 2.0, 0.5);
  let L = normalize(vec3f(
    dot(u.view[0].xyz, lightViewDir),
    dot(u.view[1].xyz, lightViewDir),
    dot(u.view[2].xyz, lightViewDir)
  ));
  let H = normalize(L + V);

  let NdotL = max(dot(N, L), 0.0);
  let NdotV = max(dot(N, V), 0.0);
  let NdotH = max(dot(N, H), 0.0);

  let normalSign = select(-1.0, 1.0, frontFacing);
  let colorFromNormal = 0.5 - normalSign * 0.5 * normal;
  let baseColor = select(vec3f(1.0, 0.12, 0.0), vec3f(0.0, 0.35, 0.95), frontFacing);
  let albedo = mix(baseColor, colorFromNormal, 0.4);

  let ambient = 0.35;
  let diffuse = 0.55 * NdotL;
  let specular = 0.5 * pow(NdotH, 48.0);
  let fresnel = 0.25 * pow(1.0 - NdotV, 3.0);

  return albedo * (ambient + diffuse) + vec3f(specular + fresnel);
}

fn computeColor(in: VertexOutput, frontFacing: bool) -> vec4f {
  let normal = normalize(in.vNormal);
  let vDotN = abs(dot(normal, normalize(in.vPosition - u.eye)));
  let vDotNGrad = fwidth(vDotN);
  let cartoonEdge = smoothstep(0.75, 1.25, vDotN / vDotNGrad / 1.5 / u.pixelRatio);

  let gridParam = in.vUV * vec2f(2.0, 1.0) * 8.0 / PI;
  let grid = gridFactor2(gridParam, 0.45 * u.pixelRatio, 1.0);

  let fatGridParam = (in.vUV.x * 0.638 + u.negClip) / (u.posClip + u.negClip);
  var fatGrid = gridFactor1(fatGridParam, 7.0 * u.pixelRatio, 1.0);
  if (abs(in.vUV.x) < 0.7) {
    fatGrid = 1.0;
  }
  fatGrid = mix(1.0, fatGrid, u.fatEdge);

  let bad = smoothstep(0.8, 1.0, u.shittyEversion);
  let nearEquator = select(0.0, 1.0, abs(in.vPosition.y) < 0.1);

  var surfaceColor = computeShading(in.vPosition, normal, frontFacing);

  // Apply shittyEversion tinting
  surfaceColor = mix(surfaceColor, vec3f(1.0, 0.0, 0.0) * (surfaceColor.r * 0.3 + surfaceColor.g * 0.6 + surfaceColor.b * 0.1 + 0.35), 0.55 * bad * nearEquator);

  surfaceColor = pow(surfaceColor, vec3f(0.454));

  // Cartoon silhouette outline: 1.0 at silhouette edges, 0.0 in interior
  let cartoonOutline = 1.0 - cartoonEdge;

  // Grid overlay: darken where grid lines are (suppressed at silhouette edges)
  let gridAlpha = (1.0 - grid) * cartoonEdge * 0.15;

  // Combined: dark lines at silhouette edges and at grid lines
  let lineAlpha = max(cartoonOutline, gridAlpha);
  surfaceColor = mix(surfaceColor, vec3f(0.0), lineAlpha);

  // Fat edge coloring
  let fatColor = select(vec3f(0.4, 0.2, 1.0), vec3f(1.0, 0.1, 0.2), in.vUV.x > 0.0);
  surfaceColor = mix(fatColor, surfaceColor, fatGrid);

  let surfaceAlpha = u.opacity;
  let alpha = lineAlpha + surfaceAlpha * (1.0 - lineAlpha);
  let color = surfaceColor;

  return vec4f(color, alpha);
}

@fragment
fn fsFirst(in: VertexOutput, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
  // Section clipping
  if (fract(in.vUV.y / PI * floor(1.0 / u.section)) > u.section) {
    discard;
  }

  // Strip clipping
  if (u.strips > 0.0 && fract(in.vUV.y * (0.5 / PI) * u.strips) > 0.25) {
    discard;
  }

  return computeColor(in, frontFacing);
}

@group(1) @binding(0) var prevDepthTex: texture_depth_2d;

@fragment
fn fsPeel(in: VertexOutput, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
  // Compute color before non-uniform branching (fwidth requires uniform control flow)
  let color = computeColor(in, frontFacing);

  // Section clipping
  if (fract(in.vUV.y / PI * floor(1.0 / u.section)) > u.section) {
    discard;
  }

  // Strip clipping
  if (u.strips > 0.0 && fract(in.vUV.y * (0.5 / PI) * u.strips) > 0.25) {
    discard;
  }

  let coords = vec2i(in.position.xy);
  let prevDepth = textureLoad(prevDepthTex, coords, 0);

  if (in.position.z <= prevDepth + 1e-6) {
    discard;
  }

  return color;
}
`,t=`
@group(0) @binding(0) var layerTex: texture_2d<f32>;

struct VSOutput {
  @builtin(position) position: vec4f,
};

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> VSOutput {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  var out: VSOutput;
  out.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  return out;
}

@fragment
fn fs(in: VSOutput) -> @location(0) vec4f {
  let coords = vec2i(in.position.xy);
  let layer = textureLoad(layerTex, coords, 0);
  return layer;
}
`;export{t as peelCompositeShaderCode,e as peelShaderCode};
