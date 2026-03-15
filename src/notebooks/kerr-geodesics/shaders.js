// Vertex shader body for webgpu-instanced-lines
// Reads geodesic positions from a storage buffer and projects them
export const vertexShaderBody = /* wgsl */`

@group(1) @binding(0) var<storage, read> geodesicPositions: array<vec4f>;
@group(1) @binding(1) var<uniform> projViewMatrix: mat4x4f;

struct LineUniforms {
  pointCount: u32,
  lineCount: u32,
  width: f32,
  _pad: f32,
};
@group(1) @binding(2) var<uniform> lineUniforms: LineUniforms;

struct Vertex {
  position: vec4f,
  width: f32,
  t: f32,
  velocity: f32,
  lineWidth: f32,
};

fn getVertex(index: u32) -> Vertex {
  let pointsPerLine = lineUniforms.pointCount + 1u;
  let lineIndex = index / pointsPerLine;
  let pointIndex = index % pointsPerLine;

  // Line break sentinel
  if (pointIndex >= lineUniforms.pointCount || lineIndex >= lineUniforms.lineCount) {
    return Vertex(vec4f(0), 0.0, 0.0, 0.0, 0.0);
  }

  let bufferIdx = lineIndex * lineUniforms.pointCount + pointIndex;
  let pos = geodesicPositions[bufferIdx].xyz;

  let projected = projViewMatrix * vec4f(pos, 1.0);
  let t = f32(pointIndex) / f32(lineUniforms.pointCount - 1u);
  let lineWidth = lineUniforms.width * (0.3 + 0.7 * t);

  // Pack line index as velocity for coloring
  let lineId = f32(lineIndex) / max(f32(lineUniforms.lineCount - 1u), 1.0);

  return Vertex(projected, lineWidth, t, lineId, lineWidth);
}
`;

// Fragment shader body for webgpu-instanced-lines
export const fragmentShaderBody = /* wgsl */`

fn hsl2rgb(h: f32, s: f32, l: f32) -> vec3f {
  let a = s * min(l, 1.0 - l);
  let k0 = (0.0 + h * 12.0) % 12.0;
  let k8 = (8.0 + h * 12.0) % 12.0;
  let k4 = (4.0 + h * 12.0) % 12.0;
  let r = l - a * max(min(min(k0 - 3.0, 9.0 - k0), 1.0), -1.0);
  let g = l - a * max(min(min(k8 - 3.0, 9.0 - k8), 1.0), -1.0);
  let b = l - a * max(min(min(k4 - 3.0, 9.0 - k4), 1.0), -1.0);
  return vec3f(r, g, b);
}

fn getColor(lineCoord: vec2f, t: f32, velocity: f32, lineWidth: f32) -> vec4f {
  let sdf = length(lineCoord) * lineWidth;

  if (abs(lineCoord.x) > 0.0 && dot(lineCoord, lineCoord) > 1.0) { discard; }

  // Color by line index (velocity stores lineId)
  let hue = velocity * 0.7 + 0.55;
  var color = hsl2rgb(hue % 1.0, 0.7, 0.6);

  // Fade old points
  let alpha = 0.15 + 0.85 * t;

  // Dark border
  let borderWidth = 3.0;
  let borderMask = smoothstep(lineWidth - borderWidth - 0.75, lineWidth - borderWidth + 0.75, sdf);
  color = mix(color, vec3f(0.0), borderMask * 0.7);

  return vec4f(color * alpha, alpha);
}
`;

// Horizon surface shader — renders the event horizon as an oblate spheroid
export const horizonShaderCode = /* wgsl */`

struct Uniforms {
  projectionView: mat4x4f,
  eye: vec4f,
  color: vec4f,
  horizonParams: vec4f,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) worldPos: vec3f,
};

@vertex fn vs(@builtin(vertex_index) vid: u32) -> VertexOutput {
  let latDivs = 32u;
  let lonDivs = 64u;

  let quadIndex = vid / 6u;
  let vertInQuad = vid % 6u;

  let latIndex = quadIndex / lonDivs;
  let lonIndex = quadIndex % lonDivs;

  var latI: u32;
  var lonI: u32;
  switch (vertInQuad) {
    case 0u: { latI = latIndex; lonI = lonIndex; }
    case 1u: { latI = latIndex + 1u; lonI = lonIndex; }
    case 2u: { latI = latIndex; lonI = lonIndex + 1u; }
    case 3u: { latI = latIndex; lonI = lonIndex + 1u; }
    case 4u: { latI = latIndex + 1u; lonI = lonIndex; }
    case 5u: { latI = latIndex + 1u; lonI = lonIndex + 1u; }
    default: { latI = 0u; lonI = 0u; }
  }

  let theta = f32(latI) / f32(latDivs) * 3.14159265;
  let phi = f32(lonI) / f32(lonDivs) * 6.28318531;

  let rPlus = u.horizonParams.x;
  let a = u.horizonParams.y;

  let sth = sin(theta);
  let cth = cos(theta);
  let rho = sqrt(rPlus * rPlus + a * a);

  let x = rho * sth * cos(phi);
  let y = rho * sth * sin(phi);
  let z = rPlus * cth;

  let n = normalize(vec3f(x / (rho * rho), y / (rho * rho), z / (rPlus * rPlus)));

  var out: VertexOutput;
  out.position = u.projectionView * vec4f(x, y, z, 1.0);
  out.normal = n;
  out.worldPos = vec3f(x, y, z);
  return out;
}

@fragment fn fs(v: VertexOutput) -> @location(0) vec4f {
  let N = normalize(v.normal);
  let V = normalize(u.eye.xyz - v.worldPos);
  let lightDir = normalize(vec3f(1.0, 2.0, 3.0));

  let diffuse = max(dot(N, lightDir), 0.0) * 0.4 + 0.15;
  let fresnel = pow(1.0 - abs(dot(N, V)), 3.0) * 0.35;

  let color = u.color.rgb * diffuse + vec3f(fresnel);
  return vec4f(color, u.color.a);
}
`;

// Ergosphere shader — renders the static limit surface
export const ergosphereShaderCode = /* wgsl */`

struct Uniforms {
  projectionView: mat4x4f,
  eye: vec4f,
  color: vec4f,
  horizonParams: vec4f,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) worldPos: vec3f,
};

@vertex fn vs(@builtin(vertex_index) vid: u32) -> VertexOutput {
  let latDivs = 48u;
  let lonDivs = 96u;

  let quadIndex = vid / 6u;
  let vertInQuad = vid % 6u;

  let latIndex = quadIndex / lonDivs;
  let lonIndex = quadIndex % lonDivs;

  var latI: u32;
  var lonI: u32;
  switch (vertInQuad) {
    case 0u: { latI = latIndex; lonI = lonIndex; }
    case 1u: { latI = latIndex + 1u; lonI = lonIndex; }
    case 2u: { latI = latIndex; lonI = lonIndex + 1u; }
    case 3u: { latI = latIndex; lonI = lonIndex + 1u; }
    case 4u: { latI = latIndex + 1u; lonI = lonIndex; }
    case 5u: { latI = latIndex + 1u; lonI = lonIndex + 1u; }
    default: { latI = 0u; lonI = 0u; }
  }

  let theta = f32(latI) / f32(latDivs) * 3.14159265;
  let phi = f32(lonI) / f32(lonDivs) * 6.28318531;

  let M = u.horizonParams.x;
  let a = u.horizonParams.y;

  let sth = sin(theta);
  let cth = cos(theta);
  let rErgo = M + sqrt(max(M * M - a * a * cth * cth, 0.0));
  let rho = sqrt(rErgo * rErgo + a * a);

  let x = rho * sth * cos(phi);
  let y = rho * sth * sin(phi);
  let z = rErgo * cth;

  let dth = 0.01;
  let rE2 = M + sqrt(max(M * M - a * a * cos(theta + dth) * cos(theta + dth), 0.0));
  let rho2 = sqrt(rE2 * rE2 + a * a);
  let p2 = vec3f(rho2 * sin(theta + dth) * cos(phi), rho2 * sin(theta + dth) * sin(phi), rE2 * cos(theta + dth));
  let dph = 0.01;
  let p3 = vec3f(rho * sth * cos(phi + dph), rho * sth * sin(phi + dph), z);
  let n = normalize(cross(p2 - vec3f(x, y, z), p3 - vec3f(x, y, z)));

  var out: VertexOutput;
  out.position = u.projectionView * vec4f(x, y, z, 1.0);
  out.normal = n;
  out.worldPos = vec3f(x, y, z);
  return out;
}

@fragment fn fs(v: VertexOutput) -> @location(0) vec4f {
  let N = normalize(v.normal);
  let V = normalize(u.eye.xyz - v.worldPos);
  let lightDir = normalize(vec3f(1.0, 2.0, 3.0));

  let diffuse = max(dot(N, lightDir), 0.0) * 0.3 + 0.1;
  let fresnel = pow(1.0 - abs(dot(N, V)), 3.0) * 0.25;

  let color = u.color.rgb * diffuse + vec3f(fresnel);
  return vec4f(color * u.color.a, u.color.a);
}
`;
