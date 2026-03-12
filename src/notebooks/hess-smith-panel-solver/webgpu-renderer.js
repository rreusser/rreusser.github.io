// WebGPU renderer for Hess-Smith panel solver visualization
// Renders pressure field, streamlines, panel edges, and vertex points

import quasirandom2d from './quasirandom-2d.js';
import { createGPULines } from 'npm:webgpu-instanced-lines';
import earcut from 'npm:earcut';

const MAX_PANELS = 256;
const MAX_STREAMLINES = 5000;
const MAX_STREAMLINE_LENGTH = 40;

// Simplex noise in WGSL for visual variation
const WGSL_NOISE = `
fn mod289_3(x: vec3f) -> vec3f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn mod289_2(x: vec2f) -> vec2f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn permute(x: vec3f) -> vec3f { return mod289_3(((x*34.0)+1.0)*x); }

fn snoise(v: vec2f) -> f32 {
  let C = vec4f(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  var i = floor(v + dot(v, C.yy));
  let x0 = v - i + dot(i, C.xx);
  var i1: vec2f;
  if (x0.x > x0.y) { i1 = vec2f(1.0, 0.0); } else { i1 = vec2f(0.0, 1.0); }
  let x12 = x0.xyxy + C.xxzz - vec4f(i1, 0.0, 0.0);
  i = mod289_2(i);
  let p = permute(permute(i.y + vec3f(0.0, i1.y, 1.0)) + i.x + vec3f(0.0, i1.x, 1.0));
  var m = max(vec3f(0.5) - vec3f(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), vec3f(0.0));
  m = m*m;
  m = m*m;
  let x_ = 2.0 * fract(p * C.www) - 1.0;
  let h = abs(x_) - 0.5;
  let ox = floor(x_ + 0.5);
  let a0 = x_ - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  let g = vec3f(a0.x * x0.x + h.x * x0.y, a0.yz * vec2f(x12.x, x12.z) + h.yz * vec2f(x12.y, x12.w));
  return 130.0 * dot(m, g);
}
`;

// Common WGSL functions for velocity computation
const WGSL_VELOCITY = `
const pi: f32 = 3.14159265359;

fn computeVelocity(xy: vec2f, panelCount: u32) -> vec2f {
  var vInduced = vec2f(0.0);
  var prev = uniforms.panelData[0];
  var rPrev = xy - prev.xy;

  for (var i = 1u; i <= panelCount; i++) {
    let next = uniforms.panelData[i];
    let rNext = xy - next.xy;
    let t = normalize(next.xy - prev.xy);
    let n = vec2f(-t.y, t.x);
    let bij = atan2(rPrev.x * rNext.y - rNext.x * rPrev.y, dot(rPrev, rNext));
    let lograt = 0.5 * log(dot(rNext, rNext) / dot(rPrev, rPrev));
    let source = next.z;
    let gamma = next.w;
    vInduced += source * (-lograt * t + bij * n);
    vInduced += gamma * (bij * t + lograt * n);
    prev = next;
    rPrev = rNext;
  }

  return uniforms.vInf + (0.5 / pi) * vInduced;
}

fn computePressureCoeff(v: vec2f) -> f32 {
  let vInfMag2 = dot(uniforms.vInf, uniforms.vInf);
  return 1.0 - dot(v, v) / vInfMag2;
}
`;

// Contour shading functions
const WGSL_CONTOURS = `
fn linearstep(edge0: f32, edge1: f32, x: f32) -> f32 {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

fn contrastFunction(x: f32, power: f32) -> f32 {
  let x2 = 2.0 * x - 1.0;
  return 0.5 + 0.5 * pow(abs(x2), power) * sign(x2);
}

const octaveDivisions: f32 = 2.0;
const octaves: i32 = 8;
const fOctaves: f32 = 8.0;

fn shadedContours(f: f32, minSpacing: f32, antialiasWidth: f32, rampPower: f32, contourWidth: f32) -> vec2f {
  let screenSpaceGrad = length(vec2f(dpdx(f), dpdy(f))) / abs(f);
  let localOctave = log2(screenSpaceGrad * minSpacing) / log2(octaveDivisions);
  let contourSpacing = pow(octaveDivisions, ceil(localOctave));
  var plotVar = log2(abs(f)) / contourSpacing;
  var widthScale = contourSpacing / screenSpaceGrad;
  var contourSum: f32 = 0.0;
  var grid: f32 = 0.0;

  for (var i = 0; i < octaves; i++) {
    let t = f32(i + 1) - fract(localOctave);
    let weight = smoothstep(0.0, 1.0, t) * smoothstep(fOctaves, fOctaves - 1.0, t);
    let y = fract(plotVar);
    contourSum += weight * min(contrastFunction(y, rampPower), (1.0 - y) * 0.5 * widthScale / antialiasWidth);
    grid += weight * linearstep(
      contourWidth + antialiasWidth,
      contourWidth - antialiasWidth,
      (0.5 - abs(fract(plotVar) - 0.5)) * widthScale
    );
    widthScale *= octaveDivisions;
    plotVar /= octaveDivisions;
  }
  grid /= fOctaves;
  contourSum /= fOctaves;
  return vec2f(contourSum, grid);
}
`;

// Colorscale sampling
const WGSL_COLORSCALE = `
fn sampleColorscale(t: f32) -> vec3f {
  let idx = clamp(t, 0.0, 1.0) * 255.0;
  let i0 = u32(floor(idx));
  let i1 = min(i0 + 1u, 255u);
  let frac = fract(idx);
  let c0 = uniforms.colorscale[i0];
  let c1 = uniforms.colorscale[i1];
  return mix(c0.rgb, c1.rgb, frac);
}
`;

function createFieldShader(panelCount) {
  return `
struct Uniforms {
  viewInverse: mat4x4f,
  vInf: vec2f,
  contourOpacity: f32,
  shadingOpacity: f32,
  panelCount: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
  panelData: array<vec4f, ${panelCount + 1}>,
  colorscale: array<vec4f, 256>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) xy: vec2f,
};

@vertex
fn vertex(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  let x = f32((vertexIndex << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vertexIndex & 2u) * 2.0 - 1.0;

  var output: VertexOutput;
  let dataCoord = uniforms.viewInverse * vec4f(x, y, 0.0, 1.0);
  output.xy = dataCoord.xy;
  output.position = vec4f(x, y, 0.0, 1.0);
  return output;
}

${WGSL_VELOCITY}
${WGSL_CONTOURS}
${WGSL_COLORSCALE}

@fragment
fn fragment(@location(0) xy: vec2f) -> @location(0) vec4f {
  let v = computeVelocity(xy, uniforms.panelCount);
  let cp = computePressureCoeff(v);

  // Map pressure coefficient to colorscale
  let colorT = exp((cp - 1.0) * 0.7);
  var color = sampleColorscale(colorT);

  // Apply contour shading
  if (uniforms.shadingOpacity > 1e-4 || uniforms.contourOpacity > 1e-4) {
    let contours = shadedContours(1.0 - cp, 8.0, 1.0, 3.0, 1.0);
    color *= 1.0 + uniforms.shadingOpacity * (contours.x - 0.5);
    color = mix(color, vec3f(0.0), contours.y * uniforms.contourOpacity);
  }

  return vec4f(color, 1.0);
}
`;
}

function createStreamlineShader(panelCount, streamlineLength) {
  return `
struct Uniforms {
  view: mat4x4f,
  viewInverse: mat4x4f,
  vInf: vec2f,
  resolution: vec2f,
  lineWidth: f32,
  dt: f32,
  noise: f32,
  byPressure: f32,
  panelCount: u32,
  streamlineLength: u32,
  opacity: f32,
  _pad0: u32,
  panelData: array<vec4f, ${panelCount + 1}>,
  colorscale: array<vec4f, 256>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) seed: vec3f,
  @location(1) lineCoord: vec2f,
};

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) opacity: f32,
  @location(2) y: f32,
};

${WGSL_VELOCITY}
${WGSL_COLORSCALE}

@vertex
fn vertex(input: VertexInput, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  var xy = (uniforms.viewInverse * vec4f(input.seed.xy, 0.0, 1.0)).xy;
  let tScale = vec2f(1.0 / f32(uniforms.streamlineLength - 1u), -0.5);
  let s = input.lineCoord.x * tScale.x + tScale.y;

  // Integrate streamline
  var v: vec2f;
  for (var j = 0u; j < uniforms.streamlineLength; j++) {
    v = computeVelocity(xy, uniforms.panelCount);
    xy += s * uniforms.dt * normalize(v) * 0.3;
  }

  let cp = computePressureCoeff(v);
  let colorT = exp((cp - 1.0) * 0.7);
  let pressureColor = sampleColorscale(colorT) * (1.0 - uniforms.noise * (input.seed.z - 0.5) * 2.0);
  let baseColor = vec3f(1.0 - input.seed.z * uniforms.noise);

  var output: VertexOutput;
  output.color = mix(baseColor, pressureColor, uniforms.byPressure);
  output.y = input.lineCoord.y;

  let spVel = uniforms.view * vec4f(v, 0.0, 0.0);
  output.position = uniforms.view * vec4f(xy, 0.0, 1.0);
  output.position = vec4f(
    output.position.xy + normalize(vec2f(-spVel.y, spVel.x) / uniforms.resolution) / uniforms.resolution * input.lineCoord.y * uniforms.lineWidth,
    output.position.zw
  );
  output.opacity = exp(-s * s * 10.0);

  return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4f {
  let alpha = input.opacity * (1.0 - input.y * input.y) * uniforms.opacity;
  return vec4f(input.color * alpha, alpha);
}
`;
}

function createAirfoilShader() {
  return `
struct Uniforms {
  view: mat4x4f,
  color: vec4f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
};

@vertex
fn vertex(@location(0) xy: vec2f) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.view * vec4f(xy, 0.0, 1.0);
  return output;
}

@fragment
fn fragment() -> @location(0) vec4f {
  return uniforms.color;
}
`;
}

function createPressureDistShader() {
  return `
struct Uniforms {
  view: mat4x4f,
  color: vec4f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
};

@vertex
fn vertex(@location(0) xy: vec2f) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.view * vec4f(xy, 0.0, 1.0);
  return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4f {
  return uniforms.color;
}
`;
}

function createPointShader() {
  return `
struct Uniforms {
  view: mat4x4f,
  color: vec4f,
  pointSize: f32,
  _pad0: f32,
  resolution: vec2f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> positions: array<vec2f>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vertex(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  // Quad vertices: 0=(-1,-1), 1=(1,-1), 2=(-1,1), 3=(1,1)
  let x = f32((vertexIndex & 1u) * 2u) - 1.0;
  let y = f32((vertexIndex >> 1u) * 2u) - 1.0;

  let pos = positions[instanceIndex];
  let clipPos = uniforms.view * vec4f(pos, 0.0, 1.0);

  var output: VertexOutput;
  output.uv = vec2f(x, y);
  // Offset in normalized device coordinates
  let offset = vec2f(x, y) * uniforms.pointSize / uniforms.resolution;
  output.position = vec4f(clipPos.xy + offset, clipPos.zw);
  return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4f {
  let dist = length(input.uv);
  // Antialiased circle
  let aa = 1.0 - smoothstep(0.7, 1.0, dist);
  if (aa < 0.01) { discard; }
  return vec4f(uniforms.color.rgb * aa, uniforms.color.a * aa);
}
`;
}

export function createRenderer(device, canvasFormat) {
  let fieldPipeline = null;
  let fieldBindGroup = null;
  let fieldUniformBuffer = null;
  let cachedFieldPanelCount = -1;

  let streamlinePipeline = null;
  let streamlineBindGroup = null;
  let streamlineUniformBuffer = null;
  let streamlineSeedBuffer = null;
  let streamlineCoordBuffer = null;
  let cachedStreamlinePanelCount = -1;
  let cachedStreamlineLength = -1;

  let airfoilPipeline = null;
  let airfoilBindGroup = null;
  let airfoilUniformBuffer = null;
  let airfoilVertexBuffer = null;
  let airfoilIndexBuffer = null;
  let cachedAirfoilVertexCount = -1;
  let cachedAirfoilIndexCount = -1;

  // Panel edge rendering using webgpu-instanced-lines
  let gpuLines = null;
  let edgePositionBuffer = null;
  let edgeViewMatrixBuffer = null;
  let edgeUniformBuffer = null;  // color + lineWidth + dpr
  let edgeDataBindGroup = null;
  let cachedEdgeVertexCount = -1;

  // Vertex point rendering
  let pointPipeline = null;
  let pointBindGroup = null;
  let pointUniformBuffer = null;
  let pointPositionBuffer = null;
  let cachedPointCount = -1;

  // Pressure distribution rendering
  let pressureDistPipeline = null;
  let pressureDistBindGroup = null;
  let pressureDistUniformBuffer = null;
  let pressureDistVertexBuffer = null;
  let cachedPressureDistVertexCount = -1;

  // Initialize streamline seed buffer
  const seeds = new Float32Array(3 * MAX_STREAMLINES);
  const pt = [0, 0];
  for (let i = 0; i < seeds.length; i += 3) {
    quasirandom2d(pt, i / 3);
    seeds[i] = (pt[0] * 2 - 1) * 1.05 + Math.random() * 0.05;
    seeds[i + 1] = (pt[1] * 2 - 1) * 1.05 + Math.random() * 0.05;
    seeds[i + 2] = Math.random();
  }
  streamlineSeedBuffer = device.createBuffer({
    label: 'streamline-seeds',
    size: seeds.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(streamlineSeedBuffer, 0, seeds);

  // Initialize streamline coordinate buffer
  const lineCoords = new Float32Array(MAX_STREAMLINE_LENGTH * 4);
  for (let i = 0; i < MAX_STREAMLINE_LENGTH; i++) {
    lineCoords[i * 4 + 0] = i;
    lineCoords[i * 4 + 1] = -1;
    lineCoords[i * 4 + 2] = i;
    lineCoords[i * 4 + 3] = 1;
  }
  streamlineCoordBuffer = device.createBuffer({
    label: 'streamline-coords',
    size: lineCoords.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(streamlineCoordBuffer, 0, lineCoords);

  function ensureFieldPipeline(panelCount) {
    if (panelCount === cachedFieldPanelCount && fieldPipeline) return;
    cachedFieldPanelCount = panelCount;

    const shaderCode = createFieldShader(panelCount);
    const shaderModule = device.createShaderModule({
      label: 'field-shader',
      code: shaderCode,
    });

    // Uniform buffer size: 96 bytes header + panelData + colorscale
    const uniformSize = 96 + (panelCount + 1) * 16 + 256 * 16;

    fieldUniformBuffer = device.createBuffer({
      label: 'field-uniforms',
      size: uniformSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = device.createBindGroupLayout({
      label: 'field-bind-group-layout',
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });

    fieldBindGroup = device.createBindGroup({
      label: 'field-bind-group',
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: fieldUniformBuffer },
      }],
    });

    fieldPipeline = device.createRenderPipeline({
      label: 'field-pipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vertex',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragment',
        targets: [{ format: canvasFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  function ensureStreamlinePipeline(panelCount, streamlineLength) {
    if (panelCount === cachedStreamlinePanelCount &&
        streamlineLength === cachedStreamlineLength &&
        streamlinePipeline) return;
    cachedStreamlinePanelCount = panelCount;
    cachedStreamlineLength = streamlineLength;

    const shaderCode = createStreamlineShader(panelCount, streamlineLength);
    const shaderModule = device.createShaderModule({
      label: 'streamline-shader',
      code: shaderCode,
    });

    // Uniform buffer size: 2 * mat4 (128) + vec2 (8) + vec2 (8) + 4 floats (16) + 4 u32 (16) + panelData + colorscale
    const uniformSize = Math.ceil((176 + (panelCount + 1) * 16 + 256 * 16) / 16) * 16;

    streamlineUniformBuffer = device.createBuffer({
      label: 'streamline-uniforms',
      size: uniformSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = device.createBindGroupLayout({
      label: 'streamline-bind-group-layout',
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });

    streamlineBindGroup = device.createBindGroup({
      label: 'streamline-bind-group',
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: streamlineUniformBuffer },
      }],
    });

    streamlinePipeline = device.createRenderPipeline({
      label: 'streamline-pipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vertex',
        buffers: [
          {
            arrayStride: 12,
            stepMode: 'instance',
            attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
          },
          {
            arrayStride: 8,
            stepMode: 'vertex',
            attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x2' }],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragment',
        targets: [{
          format: canvasFormat,
          blend: {
            color: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
      primitive: { topology: 'triangle-strip' },
    });
  }

  function ensureAirfoilPipeline() {
    if (airfoilPipeline) return;

    const shaderModule = device.createShaderModule({
      label: 'airfoil-shader',
      code: createAirfoilShader(),
    });

    airfoilUniformBuffer = device.createBuffer({
      label: 'airfoil-uniforms',
      size: 80, // mat4 (64) + vec4 (16)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = device.createBindGroupLayout({
      label: 'airfoil-bind-group-layout',
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });

    airfoilBindGroup = device.createBindGroup({
      label: 'airfoil-bind-group',
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: airfoilUniformBuffer },
      }],
    });

    airfoilPipeline = device.createRenderPipeline({
      label: 'airfoil-pipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vertex',
        buffers: [{
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
        }],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragment',
        targets: [{
          format: canvasFormat,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  function updateAirfoilBuffers(vertices, indices) {
    const vertexCount = vertices.length / 2;
    const indexCount = indices.length;

    if (vertexCount !== cachedAirfoilVertexCount) {
      if (airfoilVertexBuffer) airfoilVertexBuffer.destroy();
      airfoilVertexBuffer = device.createBuffer({
        label: 'airfoil-vertices',
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      cachedAirfoilVertexCount = vertexCount;
    }
    device.queue.writeBuffer(airfoilVertexBuffer, 0, vertices);

    if (indexCount !== cachedAirfoilIndexCount) {
      if (airfoilIndexBuffer) airfoilIndexBuffer.destroy();
      // Buffer size must be a multiple of 4 bytes; use Uint32 for indices
      airfoilIndexBuffer = device.createBuffer({
        label: 'airfoil-indices',
        size: indexCount * 4,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      });
      cachedAirfoilIndexCount = indexCount;
    }
    // Convert to Uint32 for proper alignment
    const indices32 = new Uint32Array(indices);
    device.queue.writeBuffer(airfoilIndexBuffer, 0, indices32);
  }

  function ensureGPULines() {
    if (gpuLines) return;

    // Vertex shader body for panel edges
    const vertexShaderBody = /* wgsl */`
      @group(1) @binding(0) var<storage, read> positions: array<vec4f>;
      @group(1) @binding(1) var<uniform> viewMatrix: mat4x4f;
      @group(1) @binding(2) var<uniform> edgeUniforms: vec4f;  // xyz=color, w=lineWidth

      struct Vertex {
        position: vec4f,
        width: f32,
        lineWidth: f32,
      }

      fn getVertex(index: u32) -> Vertex {
        let p = positions[index];
        let projected = viewMatrix * vec4f(p.xyz, 1.0);
        let lw = edgeUniforms.w;
        return Vertex(vec4f(projected.xyz, p.w * projected.w), lw, lw);
      }
    `;

    // Fragment shader body for panel edges with proper antialiasing
    // lineCoord.y ranges from -1 to 1 across the line width
    const fragmentShaderBody = /* wgsl */`
      @group(1) @binding(2) var<uniform> edgeUniforms: vec4f;  // xyz=color, w unused (lineWidth comes from arg)

      fn getColor(lineCoord: vec2f, lineWidth: f32, instanceID: f32, triStripCoord: vec2f) -> vec4f {
        let color = edgeUniforms.xyz;

        // lineCoord.y is -1 to 1 across the line width
        let distFromCenter = abs(lineCoord.y);

        // Fade over 1 device pixel: 2/lineWidth in normalized coords
        let fadeWidth = 2.0 / max(lineWidth, 1.0);

        // Smoothstep antialiasing at edges
        let alpha = 1.0 - smoothstep(1.0 - fadeWidth, 1.0, distFromCenter);

        return vec4f(color * alpha, alpha);
      }
    `;

    gpuLines = createGPULines(device, {
      colorTargets: {
        format: canvasFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
        }
      },
      join: 'round',
      cap: 'round',
      maxJoinResolution: 8,
      maxCapResolution: 8,
      vertexShaderBody,
      fragmentShaderBody,
    });

    // Create buffers for edge rendering
    edgeViewMatrixBuffer = device.createBuffer({
      label: 'edge-view-matrix',
      size: 64, // mat4x4f
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // edgeUniforms: vec4f (rgb=color, w=lineWidth) = 16 bytes
    edgeUniformBuffer = device.createBuffer({
      label: 'edge-uniforms',
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
  }

  function updateEdgeBuffers(geometry) {
    const n = geometry.x.length;

    if (n !== cachedEdgeVertexCount) {
      if (edgePositionBuffer) edgePositionBuffer.destroy();
      edgePositionBuffer = device.createBuffer({
        label: 'edge-positions',
        size: n * 16, // vec4f per vertex
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      });
      cachedEdgeVertexCount = n;

      // Recreate bind group with new buffer
      if (gpuLines && edgeViewMatrixBuffer) {
        edgeDataBindGroup = device.createBindGroup({
          layout: gpuLines.getBindGroupLayout(1),
          entries: [
            { binding: 0, resource: { buffer: edgePositionBuffer } },
            { binding: 1, resource: { buffer: edgeViewMatrixBuffer } },
            { binding: 2, resource: { buffer: edgeUniformBuffer } }
          ]
        });
      }
    }

    // Pack positions as vec4f (x, y, z=0, w=1)
    const positions = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      positions[i * 4 + 0] = geometry.x[i];
      positions[i * 4 + 1] = geometry.y[i];
      positions[i * 4 + 2] = 0;
      positions[i * 4 + 3] = 1; // w=1 means visible
    }
    device.queue.writeBuffer(edgePositionBuffer, 0, positions);
  }

  function ensurePointPipeline() {
    if (pointPipeline) return;

    const shaderModule = device.createShaderModule({
      label: 'point-shader',
      code: createPointShader(),
    });

    pointUniformBuffer = device.createBuffer({
      label: 'point-uniforms',
      size: 112, // mat4 (64) + vec4 (16) + f32 + pad + vec2f + pad = 112 (16-byte aligned)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Point position buffer will be created when needed
  }

  function updatePointBuffers(geometry) {
    const n = geometry.x.length;

    if (n !== cachedPointCount) {
      if (pointPositionBuffer) pointPositionBuffer.destroy();
      pointPositionBuffer = device.createBuffer({
        label: 'point-positions',
        size: n * 8, // vec2f per vertex
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      cachedPointCount = n;

      // Recreate bind group
      const bindGroupLayout = device.createBindGroupLayout({
        label: 'point-bind-group-layout',
        entries: [
          { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
          { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        ],
      });

      pointBindGroup = device.createBindGroup({
        label: 'point-bind-group',
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: pointUniformBuffer } },
          { binding: 1, resource: { buffer: pointPositionBuffer } },
        ],
      });

      if (!pointPipeline) {
        const shaderModule = device.createShaderModule({
          label: 'point-shader',
          code: createPointShader(),
        });

        pointPipeline = device.createRenderPipeline({
          label: 'point-pipeline',
          layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
          vertex: {
            module: shaderModule,
            entryPoint: 'vertex',
          },
          fragment: {
            module: shaderModule,
            entryPoint: 'fragment',
            targets: [{
              format: canvasFormat,
              blend: {
                color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              },
            }],
          },
          primitive: { topology: 'triangle-strip' },
        });
      }
    }

    // Pack positions
    const positions = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      positions[i * 2] = geometry.x[i];
      positions[i * 2 + 1] = geometry.y[i];
    }
    device.queue.writeBuffer(pointPositionBuffer, 0, positions);
  }

  return {
    drawField(pass, params) {
      const {
        viewInverse, vInf, panelData, panelCount, colorscale,
        contourOpacity = 0.1, shadingOpacity = 0.15
      } = params;

      ensureFieldPipeline(panelCount);

      // Uniform struct layout (byte offsets):
      // viewInverse: mat4x4f - 64 bytes at offset 0
      // vInf: vec2f - 8 bytes at offset 64
      // contourOpacity: f32 - 4 bytes at offset 72
      // shadingOpacity: f32 - 4 bytes at offset 76
      // panelCount: u32 - 4 bytes at offset 80
      // _pad0,1,2: 12 bytes at offset 84 (padding to 16-byte alignment)
      // panelData: array<vec4f, N+1> at offset 96
      // colorscale: array<vec4f, 256> at offset 96 + (N+1)*16

      const panelDataBytes = (panelCount + 1) * 16;
      const colorscaleBytes = 256 * 16;
      const uniformSize = 96 + panelDataBytes + colorscaleBytes;

      const data = new ArrayBuffer(uniformSize);
      const floatView = new Float32Array(data);
      const uintView = new Uint32Array(data);

      floatView.set(viewInverse, 0);
      floatView[16] = vInf[0];
      floatView[17] = vInf[1];
      floatView[18] = contourOpacity;
      floatView[19] = shadingOpacity;
      uintView[20] = panelCount;
      // Padding at indices 21, 22, 23

      // Panel data starts at byte 96 = float index 24
      const panelOffset = 24;
      floatView.set(panelData, panelOffset);

      // Colorscale starts after panel data
      const colorscaleOffset = panelOffset + (panelCount + 1) * 4;
      floatView.set(colorscale, colorscaleOffset);

      device.queue.writeBuffer(fieldUniformBuffer, 0, data);

      pass.setPipeline(fieldPipeline);
      pass.setBindGroup(0, fieldBindGroup);
      pass.draw(3);
    },

    drawStreamlines(pass, params) {
      const {
        view, viewInverse, vInf, resolution, panelData, panelCount, colorscale,
        lineWidth = 2, dt = 0.1, noise = 0.2, byPressure = 0,
        streamlineCount = 500, streamlineLength = 20, opacity = 1.0
      } = params;

      if (streamlineCount === 0) return;

      ensureStreamlinePipeline(panelCount, streamlineLength);

      // Pack uniforms
      const uniformSize = Math.ceil((176 + (panelCount + 1) * 16 + 256 * 16) / 16) * 16;
      const data = new ArrayBuffer(uniformSize);
      const floatView = new Float32Array(data);
      const uintView = new Uint32Array(data);

      floatView.set(view, 0);
      floatView.set(viewInverse, 16);
      floatView[32] = vInf[0];
      floatView[33] = vInf[1];
      floatView[34] = resolution[0];
      floatView[35] = resolution[1];
      floatView[36] = lineWidth;
      floatView[37] = dt;
      floatView[38] = noise;
      floatView[39] = byPressure;
      uintView[40] = panelCount;
      uintView[41] = streamlineLength;
      floatView[42] = opacity;
      // _pad0 at index 43

      // Panel data starts at offset 44 (176 bytes, 16-aligned)
      const panelOffset = 44;
      floatView.set(panelData, panelOffset);

      // Colorscale starts after panel data
      const colorscaleOffset = panelOffset + (panelCount + 1) * 4;
      floatView.set(colorscale, colorscaleOffset);

      device.queue.writeBuffer(streamlineUniformBuffer, 0, data);

      pass.setPipeline(streamlinePipeline);
      pass.setBindGroup(0, streamlineBindGroup);
      pass.setVertexBuffer(0, streamlineSeedBuffer);
      pass.setVertexBuffer(1, streamlineCoordBuffer);
      pass.draw(streamlineLength * 2, streamlineCount);
    },

    drawAirfoil(pass, params) {
      const { view, color, vertices, indices } = params;

      ensureAirfoilPipeline();
      updateAirfoilBuffers(vertices, indices);

      // Pack uniforms
      const data = new ArrayBuffer(80);
      const floatView = new Float32Array(data);
      floatView.set(view, 0);
      floatView[16] = color[0];
      floatView[17] = color[1];
      floatView[18] = color[2];
      floatView[19] = color[3];

      device.queue.writeBuffer(airfoilUniformBuffer, 0, data);

      pass.setPipeline(airfoilPipeline);
      pass.setBindGroup(0, airfoilBindGroup);
      pass.setVertexBuffer(0, airfoilVertexBuffer);
      pass.setIndexBuffer(airfoilIndexBuffer, 'uint32');
      pass.drawIndexed(indices.length);
    },

    drawPanelEdges(pass, params) {
      const { view, geometry, color, lineWidth = 2, resolution } = params;

      ensureGPULines();
      updateEdgeBuffers(geometry);

      // Update view matrix
      device.queue.writeBuffer(edgeViewMatrixBuffer, 0, view);

      // Update edge uniforms: vec4f (xyz=color, w=lineWidth for vertex shader)
      const uniforms = new Float32Array(4);
      uniforms[0] = color[0];
      uniforms[1] = color[1];
      uniforms[2] = color[2];
      uniforms[3] = lineWidth;
      device.queue.writeBuffer(edgeUniformBuffer, 0, uniforms);

      // Draw the panel edges
      gpuLines.draw(pass, {
        vertexCount: geometry.x.length,
        resolution: resolution,
        joinResolution: 4,
        capResolution: 4
      }, [edgeDataBindGroup]);
    },

    drawVertexPoints(pass, params) {
      const { view, geometry, color, pointSize, resolution } = params;

      ensurePointPipeline();
      updatePointBuffers(geometry);

      // Pack uniforms with proper WGSL alignment:
      // mat4 (64) + vec4 (16) + f32 (4) + pad (4) + vec2f (8) + pad (16) = 112
      const data = new ArrayBuffer(112);
      const floatView = new Float32Array(data);
      floatView.set(view, 0);          // 0-63
      floatView[16] = color[0];        // 64
      floatView[17] = color[1];        // 68
      floatView[18] = color[2];        // 72
      floatView[19] = color[3];        // 76
      floatView[20] = pointSize;       // 80
      // floatView[21] is padding      // 84
      floatView[22] = resolution[0];   // 88
      floatView[23] = resolution[1];   // 92
      // Rest is padding to 112

      device.queue.writeBuffer(pointUniformBuffer, 0, data);

      pass.setPipeline(pointPipeline);
      pass.setBindGroup(0, pointBindGroup);
      pass.draw(4, geometry.x.length); // 4 vertices per quad, one instance per point
    },

    drawPressureDist(pass, params) {
      const { view, geometry, cpData, scale = 0.05, cpOffset = 1.0, color = [0.2, 0.5, 1.0, 0.5] } = params;

      if (!cpData || cpData.cpValues.length === 0) return;

      const n = cpData.cpValues.length; // number of panels

      // Generate continuous pressure distribution polygon
      // Connect midpoint offsets to create a smooth outline

      // Offset formula: (cpOffset + cp) * scale
      // - cpOffset shifts everything so all values are positive (visible outside airfoil)
      // - Adding cp means higher pressure (positive Cp) = larger offset
      // - This shows pressure as "inward force": larger pressure = larger force pushing inward
      // - Visualized as extending outward from surface, with magnitude representing inward force

      // First, compute offset points at each midpoint
      const offsets = [];
      for (let i = 0; i < n; i++) {
        const cp = cpData.cpValues[i];
        const [mx, my] = cpData.midpoints[i];
        const [nx, ny] = cpData.normals[i];
        // Clamp offset to >= 0 so negative pressure doesn't flip through the airfoil
        const offset = Math.max(0, (cpOffset + cp) * scale);
        offsets.push([mx + nx * offset, my + ny * offset]);
      }

      // Create triangles connecting consecutive midpoints to their offsets
      // This forms quads between adjacent panels
      // Note: We don't close the loop at the trailing edge because panels 0 and n-1
      // are on opposite surfaces with normals pointing in opposite directions
      const triangles = [];

      for (let i = 0; i < n - 1; i++) {
        const [mx, my] = cpData.midpoints[i];
        const [ox, oy] = offsets[i];
        const [mx1, my1] = cpData.midpoints[i + 1];
        const [ox1, oy1] = offsets[i + 1];

        // Quad from midpoint i to midpoint i+1 to offset i+1 to offset i
        // Triangle 1: midpoint i -> midpoint i+1 -> offset i
        triangles.push(mx, my, mx1, my1, ox, oy);
        // Triangle 2: midpoint i+1 -> offset i+1 -> offset i
        triangles.push(mx1, my1, ox1, oy1, ox, oy);
      }

      const vertexData = new Float32Array(triangles);
      const vertexCount = triangles.length / 2;

      // Update or create vertex buffer
      const bufferSize = vertexData.byteLength;
      if (vertexCount !== cachedPressureDistVertexCount || !pressureDistVertexBuffer) {
        if (pressureDistVertexBuffer) pressureDistVertexBuffer.destroy();
        pressureDistVertexBuffer = device.createBuffer({
          label: 'pressure-dist-vertices',
          size: Math.max(bufferSize, 64), // minimum size
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        cachedPressureDistVertexCount = vertexCount;
      }
      device.queue.writeBuffer(pressureDistVertexBuffer, 0, vertexData);

      // Ensure pipeline exists
      if (!pressureDistPipeline) {
        const shaderModule = device.createShaderModule({
          label: 'pressure-dist-shader',
          code: createPressureDistShader(),
        });

        pressureDistUniformBuffer = device.createBuffer({
          label: 'pressure-dist-uniforms',
          size: 80, // mat4 (64) + vec4 (16)
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const bindGroupLayout = device.createBindGroupLayout({
          label: 'pressure-dist-bind-group-layout',
          entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
          }],
        });

        pressureDistBindGroup = device.createBindGroup({
          label: 'pressure-dist-bind-group',
          layout: bindGroupLayout,
          entries: [{
            binding: 0,
            resource: { buffer: pressureDistUniformBuffer },
          }],
        });

        pressureDistPipeline = device.createRenderPipeline({
          label: 'pressure-dist-pipeline',
          layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
          }),
          vertex: {
            module: shaderModule,
            entryPoint: 'vertex',
            buffers: [{
              arrayStride: 8, // 2 floats: x, y
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x2' },
              ],
            }],
          },
          fragment: {
            module: shaderModule,
            entryPoint: 'fragment',
            targets: [{
              format: canvasFormat,
              blend: {
                color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              },
            }],
          },
          primitive: { topology: 'triangle-list' },
        });
      }

      // Pack uniforms
      const uniformData = new ArrayBuffer(80);
      const floatView = new Float32Array(uniformData);
      floatView.set(view, 0);
      floatView[16] = color[0];
      floatView[17] = color[1];
      floatView[18] = color[2];
      floatView[19] = color[3];

      device.queue.writeBuffer(pressureDistUniformBuffer, 0, uniformData);

      pass.setPipeline(pressureDistPipeline);
      pass.setBindGroup(0, pressureDistBindGroup);
      pass.setVertexBuffer(0, pressureDistVertexBuffer);
      pass.draw(vertexCount);
    },

    destroy() {
      if (fieldUniformBuffer) fieldUniformBuffer.destroy();
      if (streamlineUniformBuffer) streamlineUniformBuffer.destroy();
      if (streamlineSeedBuffer) streamlineSeedBuffer.destroy();
      if (streamlineCoordBuffer) streamlineCoordBuffer.destroy();
      if (airfoilUniformBuffer) airfoilUniformBuffer.destroy();
      if (airfoilVertexBuffer) airfoilVertexBuffer.destroy();
      if (airfoilIndexBuffer) airfoilIndexBuffer.destroy();
      if (gpuLines) gpuLines.destroy();
      if (edgePositionBuffer) edgePositionBuffer.destroy();
      if (edgeViewMatrixBuffer) edgeViewMatrixBuffer.destroy();
      if (edgeUniformBuffer) edgeUniformBuffer.destroy();
      if (pointPipeline) pointPipeline = null;
      if (pointUniformBuffer) pointUniformBuffer.destroy();
      if (pointPositionBuffer) pointPositionBuffer.destroy();
      if (pressureDistPipeline) pressureDistPipeline = null;
      if (pressureDistUniformBuffer) pressureDistUniformBuffer.destroy();
      if (pressureDistVertexBuffer) pressureDistVertexBuffer.destroy();
    }
  };
}

// Helper to quantize a D3 colorscale to a Float32Array
export function quantizeColorscale(interpolator, n = 256) {
  const data = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const color = interpolator(t);

    let r, g, b;

    // Try to parse rgb(...) format
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      r = parseInt(rgbMatch[1]) / 255;
      g = parseInt(rgbMatch[2]) / 255;
      b = parseInt(rgbMatch[3]) / 255;
    } else if (color.startsWith('#')) {
      // Parse hex format
      const hex = color.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16) / 255;
        g = parseInt(hex[1] + hex[1], 16) / 255;
        b = parseInt(hex[2] + hex[2], 16) / 255;
      } else {
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
      }
    } else {
      // Fallback
      r = g = b = 0;
    }

    data[i * 4 + 0] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 1;
  }
  return data;
}

// Helper to prepare panel data for GPU
export function preparePanelData(geometry, solution) {
  const { x, y } = geometry;
  const n = x.length - 1;
  const kutta = solution.shape[0] > n;
  const data = new Float32Array((n + 1) * 4);

  for (let i = 0; i < n + 1; i++) {
    data[4 * i] = x[i];
    data[4 * i + 1] = y[i];
  }
  for (let i = 0; i < n; i++) {
    data[4 * (i + 1) + 2] = solution.get(i);
    data[4 * (i + 1) + 3] = kutta ? solution.get(n) : 0;
  }

  return data;
}

// Multiply two 4x4 column-major matrices
export function mat4mul(a, b) {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] +
                       a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
    }
  }
  return out;
}

// Build a 4x4 column-major rotation matrix for angle theta around point (cx, cy)
export function makeRotation(theta, cx, cy) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const tx = cx * (1 - c) + cy * s;
  const ty = cy * (1 - c) - cx * s;
  return new Float32Array([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    tx, ty, 0, 1
  ]);
}

// Helper to triangulate airfoil for solid fill
export function triangulateAirfoil(geometry) {
  const { x, y } = geometry;
  const n = x.length;

  // Create flat vertex array for earcut [x0, y0, x1, y1, ...]
  const flatVertices = new Array(n * 2);
  for (let i = 0; i < n; i++) {
    flatVertices[i * 2] = x[i];
    flatVertices[i * 2 + 1] = y[i];
  }

  // Use earcut for proper polygon triangulation (handles concave shapes)
  const indices = earcut(flatVertices);

  return {
    vertices: new Float32Array(flatVertices),
    indices: new Uint16Array(indices)
  };
}
