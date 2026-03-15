// Ray-traced Kerr black hole renderer
// Renders to an HDR (rgba16float) texture, applies multi-level bloom via
// a downsample pyramid, then tone maps to the canvas with ACES filmic.

const BLOOM_LEVELS = 6;

// Downsample shader: 4-tap bilinear filter, with optional brightness
// threshold on the first pass (controlled by threshold uniform).
const bloomDownsampleCode = /* wgsl */`
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> threshold: f32;

struct Varyings {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn vs(@builtin(vertex_index) vid: u32) -> Varyings {
  let x = select(-1.0, 3.0, vid == 1u);
  let y = select(-1.0, 3.0, vid == 2u);
  var out: Varyings;
  out.pos = vec4f(x, y, 0.0, 1.0);
  out.uv = vec2f((x + 1.0) * 0.5, (1.0 - y) * 0.5);
  return out;
}

@fragment fn fs(in: Varyings) -> @location(0) vec4f {
  // Sample 4 points offset by half a texel for a 2x2 box filter
  let texSize = vec2f(textureDimensions(inputTex));
  let d = 0.5 / texSize;
  var color = textureSample(inputTex, samp, in.uv + vec2f(-d.x, -d.y)) * 0.25
            + textureSample(inputTex, samp, in.uv + vec2f( d.x, -d.y)) * 0.25
            + textureSample(inputTex, samp, in.uv + vec2f(-d.x,  d.y)) * 0.25
            + textureSample(inputTex, samp, in.uv + vec2f( d.x,  d.y)) * 0.25;

  // Soft brightness threshold (first pass only)
  if (threshold > 0.0) {
    let brightness = max(color.r, max(color.g, color.b));
    let contribution = clamp((brightness - threshold) / max(brightness, 0.001), 0.0, 1.0);
    color = vec4f(color.rgb * contribution, 1.0);
  }

  return vec4f(color.rgb, 1.0);
}
`;

// Tone map shader: combines HDR with bloom pyramid, applies ACES + exposure
const toneMapShaderCode = /* wgsl */`
@group(0) @binding(0) var hdrTex: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;

struct ToneMapParams {
  exposure: f32,
  bloomIntensity: f32,
  pad0: f32,
  pad1: f32,
};
@group(0) @binding(2) var<uniform> params: ToneMapParams;
@group(0) @binding(3) var bloom0: texture_2d<f32>;
@group(0) @binding(4) var bloom1: texture_2d<f32>;
@group(0) @binding(5) var bloom2: texture_2d<f32>;
@group(0) @binding(6) var bloom3: texture_2d<f32>;
@group(0) @binding(7) var bloom4: texture_2d<f32>;
@group(0) @binding(8) var bloom5: texture_2d<f32>;

struct Varyings {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn vs(@builtin(vertex_index) vid: u32) -> Varyings {
  let x = select(-1.0, 3.0, vid == 1u);
  let y = select(-1.0, 3.0, vid == 2u);
  var out: Varyings;
  out.pos = vec4f(x, y, 0.0, 1.0);
  out.uv = vec2f((x + 1.0) * 0.5, (1.0 - y) * 0.5);
  return out;
}

fn acesFilmic(x: vec3f) -> vec3f {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0));
}

@fragment fn fs(in: Varyings) -> @location(0) vec4f {
  let hdr = textureSample(hdrTex, samp, in.uv).rgb;

  // Blend all bloom pyramid levels — each successively wider
  let b0 = textureSample(bloom0, samp, in.uv).rgb;
  let b1 = textureSample(bloom1, samp, in.uv).rgb;
  let b2 = textureSample(bloom2, samp, in.uv).rgb;
  let b3 = textureSample(bloom3, samp, in.uv).rgb;
  let b4 = textureSample(bloom4, samp, in.uv).rgb;
  let b5 = textureSample(bloom5, samp, in.uv).rgb;
  let bloom = (b0 + b1 + b2 + b3 + b4 + b5) / 6.0;

  let combined = hdr + bloom * params.bloomIntensity;
  let exposed = combined * params.exposure;
  let mapped = acesFilmic(exposed);
  let gamma = pow(mapped, vec3f(1.0 / 2.2));

  return vec4f(gamma, 1.0);
}
`;

export async function createRayTracer(device, canvasFormat, shaderCode) {
  const module = device.createShaderModule({ label: 'ray-tracer', code: shaderCode });

  const compilationInfo = await module.getCompilationInfo();
  const errors = compilationInfo.messages.filter(m => m.type === 'error');
  if (errors.length > 0) {
    const details = errors.map(m => {
      const loc = m.lineNum ? ` (line ${m.lineNum}:${m.linePos})` : '';
      return `${m.message}${loc}`;
    }).join('\n');
    throw new Error(`Ray tracer shader compilation failed:\n${details}`);
  }
  for (const m of compilationInfo.messages) {
    if (m.type === 'warning') {
      console.warn(`[ray-tracer shader] warning: ${m.message} (line ${m.lineNum}:${m.linePos})`);
    }
  }

  const hdrFormat = 'rgba16float';

  // ============================================================
  // Ray tracer pipeline (renders to HDR texture)
  // ============================================================

  const uniformBGL = device.createBindGroupLayout({
    label: 'ray-tracer-bgl',
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' },
    }],
  });

  const pipeline = device.createRenderPipeline({
    label: 'ray-tracer',
    layout: device.createPipelineLayout({ bindGroupLayouts: [uniformBGL] }),
    vertex: { module, entryPoint: 'vs' },
    fragment: {
      module,
      entryPoint: 'fs',
      targets: [{ format: hdrFormat }],
    },
    primitive: { topology: 'triangle-list' },
    multisample: { count: 1 },
  });

  const uniformBuffer = device.createBuffer({
    label: 'ray-tracer-uniforms',
    size: 112,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const rtBindGroup = device.createBindGroup({
    layout: uniformBGL,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  // ============================================================
  // Bloom downsample pipeline
  // ============================================================

  const bloomDownModule = device.createShaderModule({ label: 'bloom-downsample', code: bloomDownsampleCode });

  const bloomDownBGL = device.createBindGroupLayout({
    label: 'bloom-down-bgl',
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ],
  });

  const bloomDownPipeline = device.createRenderPipeline({
    label: 'bloom-downsample',
    layout: device.createPipelineLayout({ bindGroupLayouts: [bloomDownBGL] }),
    vertex: { module: bloomDownModule, entryPoint: 'vs' },
    fragment: {
      module: bloomDownModule,
      entryPoint: 'fs',
      targets: [{ format: hdrFormat }],
    },
    primitive: { topology: 'triangle-list' },
  });

  const bloomSampler = device.createSampler({
    label: 'bloom-sampler',
    magFilter: 'linear',
    minFilter: 'linear',
  });

  // Pre-create two threshold uniform buffers: one with threshold, one without
  const thresholdOnBuffer = device.createBuffer({
    label: 'threshold-on',
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(thresholdOnBuffer, 0, new Float32Array([1.0, 0, 0, 0]));

  const thresholdOffBuffer = device.createBuffer({
    label: 'threshold-off',
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(thresholdOffBuffer, 0, new Float32Array([0.0, 0, 0, 0]));

  // ============================================================
  // Tone map pipeline (HDR + bloom → canvas)
  // ============================================================

  const toneMapModule = device.createShaderModule({ label: 'tone-map', code: toneMapShaderCode });

  const toneMapBGLEntries = [
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
  ];
  for (let i = 0; i < BLOOM_LEVELS; i++) {
    toneMapBGLEntries.push({
      binding: 3 + i,
      visibility: GPUShaderStage.FRAGMENT,
      texture: { sampleType: 'float' },
    });
  }

  const toneMapBGL = device.createBindGroupLayout({
    label: 'tone-map-bgl',
    entries: toneMapBGLEntries,
  });

  const toneMapPipeline = device.createRenderPipeline({
    label: 'tone-map',
    layout: device.createPipelineLayout({ bindGroupLayouts: [toneMapBGL] }),
    vertex: { module: toneMapModule, entryPoint: 'vs' },
    fragment: {
      module: toneMapModule,
      entryPoint: 'fs',
      targets: [{ format: canvasFormat }],
    },
    primitive: { topology: 'triangle-list' },
  });

  const toneMapBuffer = device.createBuffer({
    label: 'tone-map-uniform',
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const _toneMapData = new Float32Array(4);

  // ============================================================
  // Cached textures
  // ============================================================

  let hdrTex = null;
  let hdrView = null;
  let hdrW = 0, hdrH = 0;

  let bloomTextures = [];
  let bloomViews = [];
  let bloomW = 0, bloomH = 0;

  function ensureHDRTexture(w, h) {
    if (hdrW === w && hdrH === h && hdrTex) return;
    if (hdrTex) hdrTex.destroy();
    hdrTex = device.createTexture({
      label: 'ray-tracer-hdr',
      size: [w, h],
      format: hdrFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    hdrView = hdrTex.createView();
    hdrW = w;
    hdrH = h;
  }

  function ensureBloomTextures(w, h) {
    if (bloomW === w && bloomH === h && bloomTextures.length === BLOOM_LEVELS) return;
    for (const t of bloomTextures) t.destroy();
    bloomTextures = [];
    bloomViews = [];

    let bw = w, bh = h;
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      bw = Math.max(1, Math.floor(bw / 2));
      bh = Math.max(1, Math.floor(bh / 2));
      const tex = device.createTexture({
        label: `bloom-${i}`,
        size: [bw, bh],
        format: hdrFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      bloomTextures.push(tex);
      bloomViews.push(tex.createView());
    }
    bloomW = w;
    bloomH = h;
  }

  const _data = new Float32Array(28);

  function computeISCO(M, a) {
    const am = a / M;
    const z1 = 1 + Math.cbrt(1 - am * am) * (Math.cbrt(1 + am) + Math.cbrt(1 - am));
    const z2 = Math.sqrt(3 * am * am + z1 * z1);
    return M * (3 + z2 - Math.sqrt((3 - z1) * (3 + z1 + 2 * z2)));
  }

  function render(gpuContext, params, camera, canvasWidth, canvasHeight) {
    const renderWidth = params.renderWidth || canvasWidth;
    const renderHeight = params.renderHeight || canvasHeight;

    const aspectRatio = canvasWidth / canvasHeight;
    const { projView, eye } = camera.update(aspectRatio);

    const pv = new Float32Array(projView.buffer, projView.byteOffset, 16);
    const inv = invertMat4(pv);

    _data.set(inv, 0);
    _data[16] = eye[0]; _data[17] = eye[1]; _data[18] = eye[2]; _data[19] = 0;
    const a = params.a || 0.9;
    const M = params.M || 1;
    _data[20] = a;
    _data[21] = M;
    _data[22] = computeISCO(M, a);
    _data[23] = params.diskOuter || 20;
    _data[24] = renderWidth;
    _data[25] = renderHeight;
    _data[26] = params.maxSteps || 2000;
    _data[27] = params.stepSize || 0.1;
    device.queue.writeBuffer(uniformBuffer, 0, _data);

    _toneMapData[0] = params.exposure || 1.0;
    _toneMapData[1] = params.bloomIntensity ?? 0.5;
    device.queue.writeBuffer(toneMapBuffer, 0, _toneMapData);

    ensureHDRTexture(renderWidth, renderHeight);
    ensureBloomTextures(renderWidth, renderHeight);

    const encoder = device.createCommandEncoder();

    // Pass 1: Ray trace → HDR
    const rtPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: hdrView,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    });
    rtPass.setPipeline(pipeline);
    rtPass.setBindGroup(0, rtBindGroup);
    rtPass.draw(3);
    rtPass.end();

    // Pass 2: Bloom downsample chain
    const bloomIntensity = params.bloomIntensity ?? 0.5;
    if (bloomIntensity > 0) {
      for (let i = 0; i < BLOOM_LEVELS; i++) {
        const inputView = i === 0 ? hdrView : bloomViews[i - 1];
        const bg = device.createBindGroup({
          layout: bloomDownBGL,
          entries: [
            { binding: 0, resource: inputView },
            { binding: 1, resource: bloomSampler },
            { binding: 2, resource: { buffer: i === 0 ? thresholdOnBuffer : thresholdOffBuffer } },
          ],
        });

        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            view: bloomViews[i],
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
          }],
        });
        pass.setPipeline(bloomDownPipeline);
        pass.setBindGroup(0, bg);
        pass.draw(3);
        pass.end();
      }
    }

    // Pass 3: Tone map (HDR + bloom) → canvas
    const toneMapEntries = [
      { binding: 0, resource: hdrView },
      { binding: 1, resource: bloomSampler },
      { binding: 2, resource: { buffer: toneMapBuffer } },
    ];
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      toneMapEntries.push({ binding: 3 + i, resource: bloomViews[i] });
    }
    const toneMapBG = device.createBindGroup({
      layout: toneMapBGL,
      entries: toneMapEntries,
    });

    const toneMapPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: gpuContext.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    });
    toneMapPass.setPipeline(toneMapPipeline);
    toneMapPass.setBindGroup(0, toneMapBG);
    toneMapPass.draw(3);
    toneMapPass.end();

    device.queue.submit([encoder.finish()]);
  }

  function destroy() {
    uniformBuffer.destroy();
    toneMapBuffer.destroy();
    thresholdOnBuffer.destroy();
    thresholdOffBuffer.destroy();
    if (hdrTex) hdrTex.destroy();
    for (const t of bloomTextures) t.destroy();
  }

  return { render, destroy };
}

// 4x4 matrix inverse (column-major float array)
function invertMat4(m) {
  const inv = new Float32Array(16);

  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (Math.abs(det) < 1e-20) return inv;
  det = 1.0 / det;

  inv[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  inv[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  inv[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  inv[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  inv[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  inv[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  inv[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  inv[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  inv[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  inv[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  inv[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  inv[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  inv[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  inv[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  inv[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  inv[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

  return inv;
}
