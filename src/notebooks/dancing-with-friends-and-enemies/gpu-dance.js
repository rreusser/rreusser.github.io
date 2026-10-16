// GPU-resident friends-and-enemies dance in three dimensions. All state
// (positions, partners, RNG state, the highlighted dancer) lives in GPU
// buffers. The CPU only encodes commands and writes small uniform blocks when
// something changes; nothing is ever read back.
//
// Dots are splatted additively into a float accumulation texture, which is
// order-independent and so needs no depth sorting. A full-screen pass then
// tone-maps the accumulated ink to the canvas so that dense regions keep their
// contrast instead of saturating.

const WORKGROUP_SIZE = 256;

export const COLOR_MODES = { Heading: 0, Speed: 1, Plain: 2 };

const RENDER_PARAMS = /* wgsl */ `
struct RenderParams {
  projView: mat4x4f,
  viewport: vec2f,     // device pixels
  focal: f32,          // device pixels per world unit at unit depth
  radius: f32,         // dot radius, world units
  fg: vec4f,
  bg: vec4f,
  friendColor: vec4f,
  enemyColor: vec4f,
  minRadius: f32,      // device pixels
  linkAlpha: f32,
  lineWidth: f32,      // device pixels
  keep: f32,           // fraction of accumulated ink kept from the last frame
  exposure: f32,
  colorMode: f32,
  speedScale: f32,
  isDark: f32,
}
`;

const RENDER_WGSL = /* wgsl */ `
${RENDER_PARAMS}
struct Pick { minBits: u32, index: u32 }

@group(0) @binding(0) var<uniform> R: RenderParams;
@group(0) @binding(1) var<storage, read> pos: array<vec4f>;
@group(0) @binding(2) var<storage, read> prev: array<vec4f>;
@group(0) @binding(3) var<storage, read> partners: array<vec2u>;
@group(0) @binding(4) var<storage, read> pick: Pick;

struct VOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) radius: f32,
}

const CORNERS = array<vec2f, 6>(
  vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
  vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
);
const OFFSCREEN = vec4f(2, 2, 2, 1);

fn project(p: vec3f) -> vec4f { return R.projView * vec4f(p, 1); }

// Shift a clip-space position by an offset in device pixels
fn offsetPx(clip: vec4f, px: vec2f) -> vec4f {
  return clip + vec4f(px * 2.0 / R.viewport * clip.w, 0, 0);
}

fn oklabToLinearSrgb(lab: vec3f) -> vec3f {
  let l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  let m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  let s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  let l = l_ * l_ * l_;
  let m = m_ * m_ * m_;
  let s = s_ * s_ * s_;
  return vec3f(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

// Direction of travel: azimuth sets the hue, elevation nudges the lightness
fn headingColor(v: vec3f) -> vec3f {
  let d = v / max(length(v), 1e-12);
  let L = select(0.62, 0.78, R.isDark > 0.5) + 0.12 * d.z;
  let C = 0.15;
  return clamp(oklabToLinearSrgb(vec3f(L, C * d.x, C * d.y)), vec3f(0), vec3f(1));
}

// A compact magma-like ramp in linear sRGB
fn speedColor(t: f32) -> vec3f {
  let x = clamp(t, 0.0, 1.0);
  let c0 = vec3f(0.02, 0.01, 0.12);
  let c1 = vec3f(0.55, 0.06, 0.38);
  let c2 = vec3f(0.98, 0.40, 0.10);
  let c3 = vec3f(1.0, 0.92, 0.55);
  if (x < 0.33) { return mix(c0, c1, x / 0.33); }
  if (x < 0.66) { return mix(c1, c2, (x - 0.33) / 0.33); }
  return mix(c2, c3, (x - 0.66) / 0.34);
}

fn dancerColor(i: u32) -> vec3f {
  let v = pos[i].xyz - prev[i].xyz;
  if (R.colorMode < 0.5) { return headingColor(v); }
  if (R.colorMode < 1.5) {
    let t = length(v) * R.speedScale;
    // On a light background, run the ramp from light to dark so fast reads as ink
    return speedColor(select(0.9 - 0.8 * t, 0.15 + 0.85 * t, R.isDark > 0.5));
  }
  return pow(R.fg.rgb, vec3f(2.2));
}

fn coverage(v: VOut) -> f32 {
  return clamp(v.radius + 0.5 - length(v.uv), 0.0, 1.0);
}

// ---- Accumulation: additive ink, colors in linear space ----

@vertex fn vsDot(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  var o: VOut;
  let clip = project(pos[ii].xyz);
  if (clip.w <= 1e-3) { o.position = OFFSCREEN; return o; }
  // Perspective size, clamped to a minimum. Dots at the minimum deposit less
  // ink so that the total ink per dancer stays the same.
  let ideal = R.radius * R.focal / clip.w;
  let r = max(ideal, R.minRadius);
  let c = CORNERS[vi] * (r + 1.0);
  o.position = offsetPx(clip, c);
  o.uv = c;
  o.radius = r;
  o.color = vec4f(dancerColor(ii), (ideal * ideal) / (r * r));
  return o;
}

@fragment fn fsDot(v: VOut) -> @location(0) vec4f {
  let w = coverage(v) * v.color.a;
  return vec4f(v.color.rgb * w, w);
}

// Scales the existing accumulation by keep (blend: zero, src-alpha)
@vertex fn vsFull(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((vi << 1u) & 2u), f32(vi & 2u));
  return vec4f(p * 2.0 - 1.0, 0, 1);
}

@fragment fn fsFade() -> @location(0) vec4f {
  return vec4f(0, 0, 0, R.keep);
}

// ---- Overlay, drawn after tone mapping with premultiplied alpha ----

// Instances 0, 1, 2: friend, enemy, then the highlighted dancer on top
@vertex fn vsMarker(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  var o: VOut;
  let h = pick.index;
  let p = partners[h];
  var idx = h;
  var color = R.fg;
  var extra = 3.5;
  if (ii == 0u) { idx = p.x; color = R.friendColor; extra = 2.5; }
  if (ii == 1u) { idx = p.y; color = R.enemyColor; extra = 2.5; }
  let clip = project(pos[idx].xyz);
  if (clip.w <= 1e-3) { o.position = OFFSCREEN; return o; }
  let dpr = R.lineWidth / 1.5;
  let r = max(R.radius * R.focal / clip.w, R.minRadius) + extra * dpr;
  let c = CORNERS[vi] * (r + 1.0);
  o.position = offsetPx(clip, c);
  o.uv = c;
  o.radius = r;
  o.color = color;
  return o;
}

@fragment fn fsMarker(v: VOut) -> @location(0) vec4f {
  let a = coverage(v) * v.color.a;
  return vec4f(v.color.rgb * a, a);
}

// One line segment per dancer, to their friend
@vertex fn vsLink(@builtin(vertex_index) vi: u32) -> VOut {
  let i = vi / 2u;
  var p = pos[i].xyz;
  if ((vi & 1u) == 1u) { p = pos[partners[i].x].xyz; }
  var o: VOut;
  o.position = project(p);
  o.color = vec4f(R.fg.rgb, R.linkAlpha);
  return o;
}

// Thick segments from the highlighted dancer to their friend (0) and enemy (1)
@vertex fn vsSegment(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  var o: VOut;
  let h = pick.index;
  let a = project(pos[h].xyz);
  let b = project(pos[select(partners[h].x, partners[h].y, ii == 1u)].xyz);
  if (a.w <= 1e-3 || b.w <= 1e-3) { o.position = OFFSCREEN; return o; }
  let d = (b.xy / b.w - a.xy / a.w) * R.viewport;
  let len = max(length(d), 1e-6);
  let n = vec2f(-d.y, d.x) / len * (0.5 * R.lineWidth);
  let c = CORNERS[vi];
  o.position = offsetPx(select(a, b, c.y > 0.0), n * c.x);
  o.color = select(R.friendColor, R.enemyColor, ii == 1u);
  return o;
}

@fragment fn fsFlat(v: VOut) -> @location(0) vec4f {
  return vec4f(v.color.rgb * v.color.a, v.color.a);
}
`;

const TONEMAP_WGSL = /* wgsl */ `
${RENDER_PARAMS}
@group(0) @binding(0) var<uniform> R: RenderParams;
@group(0) @binding(1) var accum: texture_2d<f32>;

@vertex fn vsFull(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((vi << 1u) & 2u), f32(vi & 2u));
  return vec4f(p * 2.0 - 1.0, 0, 1);
}

@fragment fn fsTonemap(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let a = textureLoad(accum, vec2i(fragCoord.xy), 0);
  let density = a.a;
  // Mean color of the ink landing on this pixel
  let ink = a.rgb / max(density, 1e-6);
  let bg = pow(R.bg.rgb, vec3f(2.2));

  // Two exposure scales. The first brings sparse regions up to full color.
  // The second, sixteen times slower, keeps deepening dense clumps (darker on
  // a light background, brighter on a dark one) rather than clipping them.
  let t1 = 1.0 - exp(-R.exposure * density);
  let t2 = 1.0 - exp(-R.exposure * density / 16.0);
  var c = mix(bg, ink, t1);
  if (R.isDark > 0.5) {
    c = mix(c, mix(ink, vec3f(1), 0.6), 0.85 * t2);
  } else {
    c = mix(c, ink * 0.12, 0.85 * t2);
  }
  return vec4f(pow(max(c, vec3f(0)), vec3f(1.0 / 2.2)), 1);
}
`;

// The compute shader is passed in from the notebook so it can be shown there.
// It must define entry points init, reshuffleAll, advance, pickReset, pickMin
// and pickSelect against the compute bind group layout below.
export function createGPUDance(device, canvasFormat, { computeWGSL, accumFormat = 'rgba16float' }) {
  const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
  const pickBuffer = device.createBuffer({ label: 'pick', size: 8, usage: storage });

  const uniform = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  // attract, repel, contract, eps | reshuffleProb, n, seed, - | pick.xy, aspect, - | pickMatrix
  const simData = new ArrayBuffer(112);
  const simF32 = new Float32Array(simData);
  const simU32 = new Uint32Array(simData);
  const simBuffer = device.createBuffer({ label: 'sim-params', size: simData.byteLength, usage: uniform });
  const renderData = new Float32Array(44);
  const renderBuffer = device.createBuffer({ label: 'render-params', size: renderData.byteLength, usage: uniform });
  const lastSim = new Uint32Array(simData.byteLength / 4);
  const lastRender = new Uint32Array(renderData.length);

  // Uniforms are rewritten only when a value actually changes, so a frame
  // with a still camera and untouched controls sends nothing to the GPU
  // besides the command buffer
  function writeIfChanged(buffer, data, last) {
    const bits = new Uint32Array(data.buffer ?? data);
    let changed = false;
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] !== last[i]) { changed = true; break; }
    }
    if (!changed) return;
    last.set(bits);
    device.queue.writeBuffer(buffer, 0, data);
  }

  // ---- Compute ----
  const C = GPUShaderStage.COMPUTE;
  const computeLayout = device.createBindGroupLayout({
    label: 'dance-compute',
    entries: [
      { binding: 0, visibility: C, buffer: { type: 'uniform' } },
      { binding: 1, visibility: C, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: C, buffer: { type: 'storage' } },
      { binding: 3, visibility: C, buffer: { type: 'storage' } },
      { binding: 4, visibility: C, buffer: { type: 'storage' } },
      { binding: 5, visibility: C, buffer: { type: 'storage' } },
    ],
  });
  const computeModule = device.createShaderModule({ label: 'dance-compute', code: computeWGSL });
  const computePipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [computeLayout] });
  const pipelines = {};
  for (const entryPoint of ['init', 'reshuffleAll', 'advance', 'pickReset', 'pickMin', 'pickSelect']) {
    pipelines[entryPoint] = device.createComputePipeline({
      label: `dance-${entryPoint}`,
      layout: computePipelineLayout,
      compute: { module: computeModule, entryPoint },
    });
  }

  // ---- Render ----
  const V = GPUShaderStage.VERTEX, F = GPUShaderStage.FRAGMENT;
  const renderLayout = device.createBindGroupLayout({
    label: 'dance-render',
    entries: [
      { binding: 0, visibility: V | F, buffer: { type: 'uniform' } },
      { binding: 1, visibility: V, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: V, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: V, buffer: { type: 'read-only-storage' } },
      { binding: 4, visibility: V, buffer: { type: 'read-only-storage' } },
    ],
  });
  const renderModule = device.createShaderModule({ label: 'dance-render', code: RENDER_WGSL });
  const renderPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [renderLayout] });
  const blendOf = (srcFactor, dstFactor) => ({
    color: { srcFactor, dstFactor, operation: 'add' },
    alpha: { srcFactor, dstFactor, operation: 'add' },
  });
  const makeRender = (vs, fs, format, blend, topology = 'triangle-list') => device.createRenderPipeline({
    label: `dance-${vs}-${fs}`,
    layout: renderPipelineLayout,
    vertex: { module: renderModule, entryPoint: vs },
    fragment: { module: renderModule, entryPoint: fs, targets: [{ format, blend }] },
    primitive: { topology },
  });
  const over = blendOf('one', 'one-minus-src-alpha');
  const drawDots = makeRender('vsDot', 'fsDot', accumFormat, blendOf('one', 'one'));
  const drawFade = makeRender('vsFull', 'fsFade', accumFormat, blendOf('zero', 'src-alpha'));
  const drawMarkers = makeRender('vsMarker', 'fsMarker', canvasFormat, over);
  const drawLinks = makeRender('vsLink', 'fsFlat', canvasFormat, over, 'line-list');
  const drawSegments = makeRender('vsSegment', 'fsFlat', canvasFormat, over);

  const tonemapLayout = device.createBindGroupLayout({
    label: 'dance-tonemap',
    entries: [
      { binding: 0, visibility: F, buffer: { type: 'uniform' } },
      { binding: 1, visibility: F, texture: { sampleType: 'unfilterable-float' } },
    ],
  });
  const tonemapModule = device.createShaderModule({ label: 'dance-tonemap', code: TONEMAP_WGSL });
  const drawTonemap = device.createRenderPipeline({
    label: 'dance-tonemap',
    layout: device.createPipelineLayout({ bindGroupLayouts: [tonemapLayout] }),
    vertex: { module: tonemapModule, entryPoint: 'vsFull' },
    fragment: { module: tonemapModule, entryPoint: 'fsTonemap', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'triangle-list' },
  });

  // ---- Per-dancer buffers, which grow with the number of dancers. Their
  // contents are discarded on growth, which is fine since a new count always
  // re-initializes. ----
  let capacity = 0;
  let posBuffers = [], partnerBuffer = null, rngBuffer = null;
  let computeGroups = [], renderGroups = [];

  function allocate(count) {
    if (count <= capacity) return;
    capacity = 2 ** Math.ceil(Math.log2(Math.max(count, 1024)));
    for (const b of [...posBuffers, partnerBuffer, rngBuffer]) b?.destroy();
    posBuffers = [0, 1].map((k) => device.createBuffer({ label: `positions-${k}`, size: 16 * capacity, usage: storage }));
    partnerBuffer = device.createBuffer({ label: 'partners', size: 8 * capacity, usage: storage });
    rngBuffer = device.createBuffer({ label: 'rng-state', size: 4 * capacity, usage: storage });
    // computeGroups[k] reads positions k and writes positions 1 - k
    computeGroups = [0, 1].map((k) => device.createBindGroup({
      label: `dance-compute-${k}`,
      layout: computeLayout,
      entries: [
        { binding: 0, resource: { buffer: simBuffer } },
        { binding: 1, resource: { buffer: posBuffers[k] } },
        { binding: 2, resource: { buffer: posBuffers[1 - k] } },
        { binding: 3, resource: { buffer: partnerBuffer } },
        { binding: 4, resource: { buffer: rngBuffer } },
        { binding: 5, resource: { buffer: pickBuffer } },
      ],
    }));
    // renderGroups[k] draws positions k. The other buffer holds the previous
    // step, which gives each dancer's velocity for free.
    renderGroups = [0, 1].map((k) => device.createBindGroup({
      label: `dance-render-${k}`,
      layout: renderLayout,
      entries: [
        { binding: 0, resource: { buffer: renderBuffer } },
        { binding: 1, resource: { buffer: posBuffers[k] } },
        { binding: 2, resource: { buffer: posBuffers[1 - k] } },
        { binding: 3, resource: { buffer: partnerBuffer } },
        { binding: 4, resource: { buffer: pickBuffer } },
      ],
    }));
  }

  let accum = null, tonemapGroup = null;
  let hasHistory = false;   // whether the accumulation holds a previous frame
  function ensureAccum(width, height) {
    if (accum && accum.width === width && accum.height === height) return;
    accum?.destroy();
    accum = device.createTexture({
      label: 'dance-accumulation',
      size: [width, height],
      format: accumFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    tonemapGroup = device.createBindGroup({
      label: 'dance-tonemap',
      layout: tonemapLayout,
      entries: [
        { binding: 0, resource: { buffer: renderBuffer } },
        { binding: 1, resource: accum.createView() },
      ],
    });
    hasHistory = false;
  }

  // ---- State tracked on the CPU (never read back from the GPU) ----
  let current = 0;          // which position buffer holds the latest step
  let n = 0;
  let pending = { init: true, reshuffle: false, pick: null };
  let seed = 0;
  let pick = { x: 0, y: 0, aspect: 1, matrix: new Float32Array(16) };

  function writeSim(params) {
    simF32[0] = params.attract;
    simF32[1] = params.repel;
    simF32[2] = params.contract;
    simF32[3] = params.eps;
    simF32[4] = params.reshuffleRate / 1000; // per dancer per step
    simU32[5] = n;
    simU32[6] = seed;
    simF32[8] = pick.x;
    simF32[9] = pick.y;
    simF32[10] = pick.aspect;
    simF32.set(pick.matrix, 12);
    writeIfChanged(simBuffer, simData, lastSim);
  }

  return {
    setCount(count) {
      n = Math.max(1, Math.round(count));
      allocate(n);
      pending.init = true;
    },
    restart() { pending.init = true; },
    reshuffleAll() { pending.reshuffle = true; },
    // Select the dancer nearest a point in normalized device coordinates,
    // as seen through the given projection-view matrix
    pickAt(x, y, aspect, matrix) {
      pending.pick = { x, y, aspect, matrix: new Float32Array(matrix) };
    },

    // Advance by `steps` and draw into the canvas context. One submit per frame.
    frame(context, params, view, steps) {
      const { width, height, colors } = view;
      ensureAccum(width, height);
      const groups = Math.ceil(n / WORKGROUP_SIZE);

      // A uniform write applies to the whole submit, so a frame that needs a
      // new seed or a pick writes them alongside the parameters. They're left
      // in place afterward so later frames don't rewrite the block.
      if (pending.init) seed = (Math.random() * 2 ** 32) >>> 0;
      if (pending.pick) pick = pending.pick;
      writeSim(params);

      const encoder = device.createCommandEncoder({ label: 'dance-frame' });
      const pass = encoder.beginComputePass({ label: 'dance-compute' });
      if (pending.init) {
        pass.setPipeline(pipelines.init);
        pass.setBindGroup(0, computeGroups[current]);
        pass.dispatchWorkgroups(groups);
        current = 1 - current;
        hasHistory = false;
        // One step so the previous-position buffer, and thus velocity, is valid
        steps = Math.max(steps, 1);
      } else if (pending.reshuffle) {
        pass.setPipeline(pipelines.reshuffleAll);
        pass.setBindGroup(0, computeGroups[current]);
        pass.dispatchWorkgroups(groups);
      }
      if (steps > 0) pass.setPipeline(pipelines.advance);
      for (let k = 0; k < steps; k++) {
        pass.setBindGroup(0, computeGroups[current]);
        pass.dispatchWorkgroups(groups);
        current = 1 - current;
      }
      if (pending.pick) {
        pass.setBindGroup(0, computeGroups[current]);
        pass.setPipeline(pipelines.pickReset);
        pass.dispatchWorkgroups(1);
        pass.setPipeline(pipelines.pickMin);
        pass.dispatchWorkgroups(groups);
        pass.setPipeline(pipelines.pickSelect);
        pass.dispatchWorkgroups(groups);
      }
      pass.end();
      pending = { init: false, reshuffle: false, pick: null };

      const keep = params.trails;
      // With trails, the steady-state accumulation is 1 / (1 - keep) frames
      // deep, so exposure is scaled down to match
      const exposure = view.exposure * (1 - keep);
      renderData.set(view.projView, 0);
      renderData.set([
        width, height, view.focal, view.radius,
        ...colors.fg, 1,
        ...colors.bg, 1,
        ...colors.friend, 1,
        ...colors.enemy, 1,
        view.minRadius, Math.min(0.4, 3 / Math.sqrt(n)), 1.5 * view.pixelRatio, keep,
        exposure, view.colorMode, 1 / (params.attract + params.repel), colors.isDark ? 1 : 0,
      ], 16);
      writeIfChanged(renderBuffer, renderData, lastRender);

      const trails = keep > 0 && hasHistory;
      hasHistory = true;
      const ap = encoder.beginRenderPass({
        label: 'dance-accumulate',
        colorAttachments: [{
          view: accum.createView(),
          loadOp: trails ? 'load' : 'clear',
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          storeOp: 'store',
        }],
      });
      ap.setBindGroup(0, renderGroups[current]);
      if (trails) {
        ap.setPipeline(drawFade);
        ap.draw(3);
      }
      ap.setPipeline(drawDots);
      ap.draw(6, n);
      ap.end();

      const rp = encoder.beginRenderPass({
        label: 'dance-tonemap',
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          storeOp: 'store',
        }],
      });
      rp.setPipeline(drawTonemap);
      rp.setBindGroup(0, tonemapGroup);
      rp.draw(3);
      rp.setBindGroup(0, renderGroups[current]);
      if (params.showLinks) {
        rp.setPipeline(drawLinks);
        rp.draw(2 * n);
      }
      if (params.showHighlight) {
        rp.setPipeline(drawSegments);
        rp.draw(6, 2);
        rp.setPipeline(drawMarkers);
        rp.draw(6, 3);
      }
      rp.end();
      device.queue.submit([encoder.finish()]);
    },

    destroy() {
      for (const b of [...posBuffers, partnerBuffer, rngBuffer, pickBuffer, simBuffer, renderBuffer]) b?.destroy();
      accum?.destroy();
    },
  };
}
