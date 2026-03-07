struct Uniforms {
  projectionView: mat4x4f,
  pointSize: f32,
  brightness: f32,
  aspectRatio: f32,
  cameraDistance: f32,
  referenceDistance: f32,
  referencePointSize: f32,
  minRedshift: f32,
  maxRedshift: f32,
  galaxyZMin: f32,
  galaxyZMax: f32,
  qsoZMin: f32,
  qsoZMax: f32,
  showGalaxies: f32,
  showQSOs: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) redshift: f32,
}

@vertex
fn vertexMain(@location(0) data: vec4<f32>) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.projectionView * vec4f(data.xyz, 1.0);
  output.redshift = data.w;
  return output;
}

fn objectColor(colorParam: f32) -> vec3f {
  if (colorParam < 0.5) {
    let t = colorParam * 2.0;
    let white = vec3f(1.0, 0.95, 0.9);
    let red = vec3f(1.0, 0.15, 0.05);
    return mix(white, red, sqrt(t));
  } else {
    let t = (colorParam - 0.5) * 2.0;
    let blue = vec3f(4.0, 7.0, 10.0);
    let red = vec3f(10.0, 4.0, 1.0);
    return mix(blue, red, sqrt(t));
  }
}

fn decodeRedshift(colorParam: f32) -> f32 {
  if (colorParam < 0.5) {
    let t = colorParam * 2.0;
    return uniforms.galaxyZMin + t * (uniforms.galaxyZMax - uniforms.galaxyZMin);
  } else {
    let t = (colorParam - 0.5) * 2.0;
    return uniforms.qsoZMin + t * (uniforms.qsoZMax - uniforms.qsoZMin);
  }
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let isGalaxy = input.redshift < 0.5;
  if (isGalaxy && uniforms.showGalaxies < 0.5) { discard; }
  if (!isGalaxy && uniforms.showQSOs < 0.5) { discard; }

  let z = decodeRedshift(input.redshift);
  if (z < uniforms.minRedshift || z > uniforms.maxRedshift) { discard; }

  let distanceScale = uniforms.referenceDistance / uniforms.cameraDistance;
  let sizeScale = uniforms.referencePointSize / uniforms.pointSize;

  let color = objectColor(input.redshift);
  let intensity = uniforms.brightness * distanceScale * sizeScale;

  return vec4f(color * intensity, intensity);
}
