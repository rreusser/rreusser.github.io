// GPU-resident friends-and-enemies dance. All state (positions, partners, RNG
// state, the highlighted dancer) lives in GPU buffers. The CPU only encodes
// commands and writes small uniform blocks when parameters change; nothing is
// ever read back.

const WORKGROUP_SIZE = 256;

const RENDER_WGSL = /* wgsl */ `
struct RenderParams {
  viewport: vec2f,     // device pixels
  scale: f32,          // device pixels per world unit
  radius: f32,         // dot radius, device pixels
  fg: vec4f,
  bg: vec4f,
  friendColor: vec4f,
  enemyColor: vec4f,
  dotAlpha: f32,
  linkAlpha: f32,
  lineWidth: f32,
  fade: f32,
}

struct Pick { minBits: u32, index: u32 }

@group(0) @binding(0) var<uniform> R: RenderParams;
@group(0) @binding(1) var<storage, read> pos: array<vec2f>;
@group(0) @binding(2) var<storage, read> partners: array<vec2u>;
@group(0) @binding(3) var<storage, read> pick: Pick;

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

// World position plus an offset in device pixels, to clip space
fn toClip(p: vec2f, offsetPx: vec2f) -> vec4f {
  return vec4f((p * R.scale + offsetPx) * 2.0 / R.viewport, 0, 1);
}

fn dot_(center: vec2f, vi: u32, radius: f32, color: vec4f) -> VOut {
  let c = CORNERS[vi] * (radius + 1.0);
  var o: VOut;
  o.position = toClip(center, c);
  o.uv = c;
  o.color = color;
  o.radius = radius;
  return o;
}

@vertex fn vsDot(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  return dot_(pos[ii], vi, R.radius, vec4f(R.fg.rgb, R.dotAlpha));
}

// Instances 0, 1, 2: friend, enemy, then the highlighted dancer on top
@vertex fn vsMarker(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  let h = pick.index;
  let p = partners[h];
  var idx = h;
  var color = R.fg;
  var extra = 3.5;
  if (ii == 0u) { idx = p.x; color = R.friendColor; extra = 2.5; }
  if (ii == 1u) { idx = p.y; color = R.enemyColor; extra = 2.5; }
  let dpr = R.lineWidth / 1.5;
  return dot_(pos[idx], vi, R.radius + extra * dpr, color);
}

@fragment fn fsDot(v: VOut) -> @location(0) vec4f {
  let a = clamp(v.radius + 0.5 - length(v.uv), 0.0, 1.0) * v.color.a;
  return vec4f(v.color.rgb * a, a);
}

// One line segment per dancer, to their friend
@vertex fn vsLink(@builtin(vertex_index) vi: u32) -> VOut {
  let i = vi / 2u;
  var p = pos[i];
  if ((vi & 1u) == 1u) { p = pos[partners[i].x]; }
  var o: VOut;
  o.position = toClip(p, vec2f(0));
  o.color = vec4f(R.fg.rgb, R.linkAlpha);
  return o;
}

// Thick segments from the highlighted dancer to their friend (0) and enemy (1)
@vertex fn vsSegment(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  let h = pick.index;
  let a = pos[h];
  let b = pos[select(partners[h].x, partners[h].y, ii == 1u)];
  let d = (b - a) * R.scale;
  let len = max(length(d), 1e-6);
  let n = vec2f(-d.y, d.x) / len * (0.5 * R.lineWidth);
  let c = CORNERS[vi];
  var o: VOut;
  o.position = toClip(select(a, b, c.y > 0.0), n * c.x);
  o.color = select(R.friendColor, R.enemyColor, ii == 1u);
  return o;
}

@fragment fn fsFlat(v: VOut) -> @location(0) vec4f {
  return vec4f(v.color.rgb * v.color.a, v.color.a);
}

// Full-screen triangle that fades the previous frame toward the background
@vertex fn vsFull(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((vi << 1u) & 2u), f32(vi & 2u));
  return vec4f(p * 2.0 - 1.0, 0, 1);
}

@fragment fn fsFade() -> @location(0) vec4f {
  return vec4f(R.bg.rgb * R.fade, R.fade);
}
`;

// The compute shader is passed in from the notebook so it can be shown there.
// It must define entry points init, reshuffleAll, advance, pickReset, pickMin and
// pickSelect against the compute bind group layout below.
export function createGPUDance(device, canvasFormat, { computeWGSL }) {
  const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
  const pickBuffer = device.createBuffer({ label: 'pick', size: 8, usage: storage });

  const uniform = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  const simData = new ArrayBuffer(48);
  const simF32 = new Float32Array(simData);
  const simU32 = new Uint32Array(simData);
  const simBuffer = device.createBuffer({ label: 'sim-params', size: simData.byteLength, usage: uniform });
  const renderData = new Float32Array(24);
  const lastSim = new Uint32Array(simData.byteLength / 4);
  const lastRender = new Uint32Array(renderData.length);

  // Uniforms are rewritten only when a value actually changes, so a steady
  // frame sends nothing at all to the GPU besides the command buffer
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
  const renderBuffer = device.createBuffer({ label: 'render-params', size: renderData.byteLength, usage: uniform });

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
  // Per-dancer buffers grow with the number of dancers. Their contents are
  // discarded on growth, which is fine since a new count always re-initializes.
  let capacity = 0;
  let posBuffers = [], partnerBuffer = null, rngBuffer = null;
  let computeGroups = [], renderGroups = [];

  function allocate(count) {
    if (count <= capacity) return;
    capacity = 2 ** Math.ceil(Math.log2(Math.max(count, 1024)));
    for (const b of [...posBuffers, partnerBuffer, rngBuffer]) b?.destroy();
    posBuffers = [0, 1].map((k) => device.createBuffer({ label: `positions-${k}`, size: 8 * capacity, usage: storage }));
    partnerBuffer = device.createBuffer({ label: 'partners', size: 8 * capacity, usage: storage });
    rngBuffer = device.createBuffer({ label: 'rng-state', size: 4 * capacity, usage: storage });
    computeGroups = makeComputeGroups();
    renderGroups = makeRenderGroups();
  }

  // computeGroups[k] reads positions k and writes positions 1 - k
  const makeComputeGroups = () => [0, 1].map((k) => device.createBindGroup({
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

  // ---- Render ----
  const V = GPUShaderStage.VERTEX, F = GPUShaderStage.FRAGMENT;
  const renderLayout = device.createBindGroupLayout({
    label: 'dance-render',
    entries: [
      { binding: 0, visibility: V | F, buffer: { type: 'uniform' } },
      { binding: 1, visibility: V, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: V, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: V, buffer: { type: 'read-only-storage' } },
    ],
  });
  const renderModule = device.createShaderModule({ label: 'dance-render', code: RENDER_WGSL });
  const renderPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [renderLayout] });
  const blend = {
    color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  };
  const makeRender = (vs, fs, topology = 'triangle-list') => device.createRenderPipeline({
    label: `dance-${vs}`,
    layout: renderPipelineLayout,
    vertex: { module: renderModule, entryPoint: vs },
    fragment: { module: renderModule, entryPoint: fs, targets: [{ format: canvasFormat, blend }] },
    primitive: { topology },
  });
  const drawDots = makeRender('vsDot', 'fsDot');
  const drawMarkers = makeRender('vsMarker', 'fsDot');
  const drawLinks = makeRender('vsLink', 'fsFlat', 'line-list');
  const drawSegments = makeRender('vsSegment', 'fsFlat');
  const drawFade = makeRender('vsFull', 'fsFade');
  const makeRenderGroups = () => [0, 1].map((k) => device.createBindGroup({
    label: `dance-render-${k}`,
    layout: renderLayout,
    entries: [
      { binding: 0, resource: { buffer: renderBuffer } },
      { binding: 1, resource: { buffer: posBuffers[k] } },
      { binding: 2, resource: { buffer: partnerBuffer } },
      { binding: 3, resource: { buffer: pickBuffer } },
    ],
  }));

  // ---- State tracked on the CPU (never read back from the GPU) ----
  let current = 0;          // which position buffer holds the latest step
  let n = 0;
  let pending = { init: true, reshuffle: false, pick: null };
  let target = null;        // offscreen texture that accumulates trails
  let cleared = false;
  let lastSeed = 0;
  let lastPick = [0, 0];

  function writeSim(params, seed = 0, pickPoint = [0, 0]) {
    simF32[0] = params.attract;
    simF32[1] = params.repel;
    simF32[2] = params.contract;
    simF32[3] = params.eps;
    simF32[4] = params.reshuffleRate / 1000; // per dancer per step
    simU32[5] = n;
    simU32[6] = seed;
    simF32[8] = pickPoint[0];
    simF32[9] = pickPoint[1];
    writeIfChanged(simBuffer, simData, lastSim);
  }

  function ensureTarget(width, height) {
    if (target && target.width === width && target.height === height) return;
    target?.destroy();
    target = device.createTexture({
      label: 'dance-trails',
      size: [width, height],
      format: canvasFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    cleared = false;
  }

  return {
    setCount(count) {
      n = Math.max(1, Math.round(count));
      allocate(n);
      pending.init = true;
    },
    restart() { pending.init = true; },
    reshuffleAll() { pending.reshuffle = true; },
    pickAt(x, y) { pending.pick = [x, y]; },

    // Advance by `steps` and draw into the canvas context. One submit per frame.
    frame(context, params, view, steps) {
      const { width, height, scale, radius, dotAlpha, colors } = view;
      ensureTarget(width, height);
      const groups = Math.ceil(n / WORKGROUP_SIZE);

      // A uniform write applies to the whole submit, so a frame that needs a
      // new seed or a pick point writes them alongside the parameters. The
      // seed and pick point are left in place afterward to avoid a rewrite.
      if (pending.init) lastSeed = (Math.random() * 2 ** 32) >>> 0;
      if (pending.pick) lastPick = pending.pick;
      writeSim(params, lastSeed, lastPick);

      const encoder = device.createCommandEncoder({ label: 'dance-frame' });
      const pass = encoder.beginComputePass({ label: 'dance-compute' });
      if (pending.init) {
        pass.setPipeline(pipelines.init);
        pass.setBindGroup(0, computeGroups[current]);
        pass.dispatchWorkgroups(groups);
        current = 1 - current;
        cleared = false;
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

      const fg = colors.fg, bg = colors.bg;
      renderData.set([
        width, height, scale, radius,
        ...fg, 1,
        ...bg, 1,
        ...colors.friend, 1,
        ...colors.enemy, 1,
        dotAlpha, Math.min(0.4, 3 / Math.sqrt(n)), 1.5 * view.pixelRatio, 1 - params.trails,
      ]);
      writeIfChanged(renderBuffer, renderData, lastRender);

      const trails = params.trails > 0 && cleared;
      const rp = encoder.beginRenderPass({
        label: 'dance-render',
        colorAttachments: [{
          view: target.createView(),
          loadOp: trails ? 'load' : 'clear',
          clearValue: { r: bg[0], g: bg[1], b: bg[2], a: 1 },
          storeOp: 'store',
        }],
      });
      cleared = true;
      rp.setBindGroup(0, renderGroups[current]);
      if (trails) {
        rp.setPipeline(drawFade);
        rp.draw(3);
      }
      if (params.showLinks) {
        rp.setPipeline(drawLinks);
        rp.draw(2 * n);
      }
      rp.setPipeline(drawDots);
      rp.draw(6, n);
      if (params.showHighlight) {
        rp.setPipeline(drawSegments);
        rp.draw(6, 2);
        rp.setPipeline(drawMarkers);
        rp.draw(6, 3);
      }
      rp.end();

      encoder.copyTextureToTexture(
        { texture: target },
        { texture: context.getCurrentTexture() },
        [width, height],
      );
      device.queue.submit([encoder.finish()]);
    },

    destroy() {
      for (const b of [...posBuffers, partnerBuffer, rngBuffer, pickBuffer, simBuffer, renderBuffer]) b?.destroy();
      target?.destroy();
    },
  };
}
