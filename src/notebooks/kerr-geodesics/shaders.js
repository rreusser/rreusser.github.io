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
  let lineWidth = lineUniforms.width * (1.0 - 0.7 * t);

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

  // Fade tail (t=0 is start/bright, t=1 is end/faded)
  let alpha = 1.0 - 0.85 * t;

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
  @location(2) uv: vec2f,
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
  let y = rPlus * cth;
  let z = rho * sth * sin(phi);

  let n = normalize(vec3f(x / (rho * rho), y / (rPlus * rPlus), z / (rho * rho)));

  var out: VertexOutput;
  out.position = u.projectionView * vec4f(x, y, z, 1.0);
  out.normal = n;
  out.worldPos = vec3f(x, y, z);
  out.uv = vec2f(theta, phi);
  return out;
}

@fragment fn fs(v: VertexOutput) -> @location(0) vec4f {
  let N = normalize(v.normal);
  let V = normalize(u.eye.xyz - v.worldPos);
  let lightDir = normalize(vec3f(1.0, 2.0, 3.0));

  let NdotV = abs(dot(N, V));
  let diffuse = max(dot(N, lightDir), 0.0) * 0.4 + 0.2;
  let fresnel = pow(1.0 - NdotV, 3.0) * 0.5;

  let alpha = u.color.a;
  let color = u.color.rgb * diffuse + vec3f(fresnel);
  return vec4f(color * alpha, alpha);
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
  @location(2) uv: vec2f,
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
  let y = rErgo * cth;
  let z = rho * sth * sin(phi);

  let dth = 0.01;
  let rE2 = M + sqrt(max(M * M - a * a * cos(theta + dth) * cos(theta + dth), 0.0));
  let rho2 = sqrt(rE2 * rE2 + a * a);
  let p2 = vec3f(rho2 * sin(theta + dth) * cos(phi), rE2 * cos(theta + dth), rho2 * sin(theta + dth) * sin(phi));
  let dph = 0.01;
  let p3 = vec3f(rho * sth * cos(phi + dph), y, rho * sth * sin(phi + dph));
  let n = normalize(cross(p2 - vec3f(x, y, z), p3 - vec3f(x, y, z)));

  var out: VertexOutput;
  out.position = u.projectionView * vec4f(x, y, z, 1.0);
  out.normal = n;
  out.worldPos = vec3f(x, y, z);
  out.uv = vec2f(theta, phi);
  return out;
}

@fragment fn fs(v: VertexOutput) -> @location(0) vec4f {
  let N = normalize(v.normal);
  let V = normalize(u.eye.xyz - v.worldPos);
  let lightDir = normalize(vec3f(1.0, 2.0, 3.0));

  let NdotV = abs(dot(N, V));
  let diffuse = max(dot(N, lightDir), 0.0) * 0.3 + 0.15;
  let fresnel = pow(1.0 - NdotV, 3.0) * 0.4;

  let alpha = u.color.a;
  let color = u.color.rgb * diffuse + vec3f(fresnel);
  return vec4f(color * alpha, alpha);
}
`;

// Coordinate axes shader — draws 3 axis lines (RGB = XYZ)
export const axesShaderCode = /* wgsl */`

struct Uniforms {
  projectionView: mat4x4f,
  color: vec4f,
  axisLength: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
};

@vertex fn vs(@builtin(vertex_index) vid: u32) -> VertexOutput {
  let axisIndex = vid / 2u;
  let isEnd = vid % 2u;

  let L = u.axisLength;
  var pos = vec3f(0.0);
  var color = vec3f(0.0);

  switch (axisIndex) {
    case 0u: { pos = vec3f(L * f32(isEnd), 0.0, 0.0); color = vec3f(0.8, 0.2, 0.2); }
    case 1u: { pos = vec3f(0.0, L * f32(isEnd), 0.0); color = vec3f(0.3, 0.4, 0.9); }
    case 2u: { pos = vec3f(0.0, 0.0, L * f32(isEnd)); color = vec3f(0.2, 0.7, 0.2); }
    default: {}
  }

  var out: VertexOutput;
  out.position = u.projectionView * vec4f(pos, 1.0);
  out.color = color;
  return out;
}

@fragment fn fs(v: VertexOutput) -> @location(0) vec4f {
  let alpha = u.color.a;
  return vec4f(v.color * alpha, alpha);
}
`;

// Arrow shader — renders a 3D velocity arrow (shaft + cone head)
// Uses vertex_index to procedurally generate geometry.
export const arrowShaderCode = /* wgsl */`

struct Uniforms {
  projectionView: mat4x4f,
  origin: vec4f,        // arrow base position (xyz, w unused)
  direction: vec4f,     // arrow direction vector (xyz, length in w)
  color: vec4f,         // rgba
  params: vec4f,        // shaftRadius, headRadius, headFraction, unused
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) @interpolate(flat) isHead: f32,
};

@vertex fn vs(@builtin(vertex_index) vid: u32) -> VertexOutput {
  let dir = u.direction.xyz;
  let length = u.direction.w;

  // Build local frame from direction
  let forward = normalize(dir);
  var up = vec3f(0.0, 0.0, 1.0);
  if (abs(dot(forward, up)) > 0.99) { up = vec3f(1.0, 0.0, 0.0); }
  let right = normalize(cross(forward, up));
  let localUp = cross(right, forward);

  let shaftR = u.params.x;
  let headR = u.params.y;
  let headFrac = u.params.z;
  let shaftLen = length * (1.0 - headFrac);
  let headLen = length * headFrac;

  let nSeg = 12u;
  let shaftQuads = nSeg;
  let shaftVerts = shaftQuads * 6u;  // 2 triangles per quad
  let headVerts = nSeg * 3u;         // 1 triangle per segment

  var pos = vec3f(0.0);
  var normal = vec3f(0.0);
  var isHead: f32 = 0.0;

  if (vid < shaftVerts) {
    // Shaft cylinder
    let quadIdx = vid / 6u;
    let vertInQuad = vid % 6u;

    var segI: u32; var ringI: u32;
    switch (vertInQuad) {
      case 0u: { segI = quadIdx; ringI = 0u; }
      case 1u: { segI = quadIdx; ringI = 1u; }
      case 2u: { segI = (quadIdx + 1u) % nSeg; ringI = 0u; }
      case 3u: { segI = (quadIdx + 1u) % nSeg; ringI = 0u; }
      case 4u: { segI = quadIdx; ringI = 1u; }
      case 5u: { segI = (quadIdx + 1u) % nSeg; ringI = 1u; }
      default: { segI = 0u; ringI = 0u; }
    }

    let angle = f32(segI) / f32(nSeg) * 6.28318531;
    let c = cos(angle); let s = sin(angle);
    let radial = right * c + localUp * s;
    let t = f32(ringI);

    pos = u.origin.xyz + forward * (t * shaftLen) + radial * shaftR;
    normal = radial;
  } else if (vid < shaftVerts + headVerts) {
    // Cone head
    let headVid = vid - shaftVerts;
    let triIdx = headVid / 3u;
    let vertInTri = headVid % 3u;

    let angle0 = f32(triIdx) / f32(nSeg) * 6.28318531;
    let angle1 = f32(triIdx + 1u) / f32(nSeg) * 6.28318531;

    let baseCenter = u.origin.xyz + forward * shaftLen;
    let tip = baseCenter + forward * headLen;

    if (vertInTri == 0u) {
      pos = tip;
      normal = forward;
    } else if (vertInTri == 1u) {
      let c = cos(angle0); let s = sin(angle0);
      let radial = right * c + localUp * s;
      pos = baseCenter + radial * headR;
      normal = normalize(radial * headLen + forward * headR);
    } else {
      let c = cos(angle1); let s = sin(angle1);
      let radial = right * c + localUp * s;
      pos = baseCenter + radial * headR;
      normal = normalize(radial * headLen + forward * headR);
    }
    isHead = 1.0;
  }

  var out: VertexOutput;
  out.position = u.projectionView * vec4f(pos, 1.0);
  out.normal = normal;
  out.isHead = isHead;
  return out;
}

@fragment fn fs(v: VertexOutput) -> @location(0) vec4f {
  let N = normalize(v.normal);
  let lightDir = normalize(vec3f(1.0, 2.0, 3.0));
  let diffuse = max(dot(N, lightDir), 0.0) * 0.5 + 0.3;
  let color = u.color.rgb * diffuse;
  return vec4f(color * u.color.a, u.color.a);
}
`;
