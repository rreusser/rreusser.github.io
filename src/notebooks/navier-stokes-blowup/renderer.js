const UNIFORM_SIZE = 192;
const SAMPLE_COUNT = 4;
const MAX_INSTANCES = 64;
const INSTANCE_FLOATS = 8;

/** Interleave the vertex attributes into a single buffer. */
function interleave(mesh) {
  const n = mesh.vertexCount;
  const data = new Float32Array(n * 8);
  for (let i = 0; i < n; i++) {
    const o = i * 8;
    data[o] = mesh.positions[i * 3];
    data[o + 1] = mesh.positions[i * 3 + 1];
    data[o + 2] = mesh.positions[i * 3 + 2];
    data[o + 3] = mesh.normals[i * 3];
    data[o + 4] = mesh.normals[i * 3 + 1];
    data[o + 5] = mesh.normals[i * 3 + 2];
    data[o + 6] = mesh.scalars[i];
    data[o + 7] = mesh.phases[i];
  }
  return data;
}

/**
 * A layered renderer.
 *
 * Geometry is registered once per named layer and then drawn with a list of
 * instances per frame, each carrying its own placement, opacity and stretch.
 * Layers whose opacity has reached zero are skipped, which is what lets the
 * walkthrough fade parts of the figure in and out without paying for them.
 */
export function createRenderer(device, canvasFormat, shaderCodes) {
  const tubeModule = device.createShaderModule({ label: 'ns-blowup-tubes', code: shaderCodes.tube });
  const axisModule = device.createShaderModule({ label: 'ns-blowup-axis', code: shaderCodes.axis });

  const uniformBuffer = device.createBuffer({
    label: 'ns-blowup-uniforms',
    size: UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' }
    }]
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
  });

  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });

  const vertexBuffers = [
    {
      arrayStride: 32,
      attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },
        { shaderLocation: 1, offset: 12, format: 'float32x3' },
        { shaderLocation: 2, offset: 24, format: 'float32' },
        { shaderLocation: 3, offset: 28, format: 'float32' }
      ]
    },
    {
      arrayStride: INSTANCE_FLOATS * 4,
      stepMode: 'instance',
      attributes: [
        { shaderLocation: 4, offset: 0, format: 'float32x4' },
        { shaderLocation: 5, offset: 16, format: 'float32x4' }
      ]
    }
  ];

  // The shader emits premultiplied alpha, so a fully opaque layer comes out the
  // same through either pipeline. Opaque layers write depth; translucent ones do
  // not, which avoids having to sort them against each other.
  const premultiplied = {
    color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
  };

  function makeTubePipeline(blend) {
    return device.createRenderPipeline({
      label: blend ? 'ns-blowup-blend' : 'ns-blowup-opaque',
      layout: pipelineLayout,
      vertex: { module: tubeModule, entryPoint: 'vs', buffers: vertexBuffers },
      fragment: {
        module: tubeModule,
        entryPoint: 'fs',
        targets: [{ format: canvasFormat, blend: blend ? premultiplied : undefined }]
      },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: !blend, depthCompare: 'less' },
      multisample: { count: SAMPLE_COUNT }
    });
  }

  const opaquePipeline = makeTubePipeline(false);
  const blendPipeline = makeTubePipeline(true);

  const axisPipeline = device.createRenderPipeline({
    label: 'ns-blowup-axis-pipeline',
    layout: pipelineLayout,
    vertex: {
      module: axisModule,
      entryPoint: 'vs',
      buffers: [{
        arrayStride: 16,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' },
          { shaderLocation: 1, offset: 12, format: 'float32' }
        ]
      }]
    },
    fragment: {
      module: axisModule,
      entryPoint: 'fs',
      targets: [{ format: canvasFormat, blend: premultiplied }]
    },
    primitive: { topology: 'line-list' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'less' },
    multisample: { count: SAMPLE_COUNT }
  });

  const layers = new Map();
  let axisBuffer = null;
  let axisCount = 0;

  const instanceData = new Float32Array(MAX_INSTANCES * INSTANCE_FLOATS);
  const instanceBuffer = device.createBuffer({
    label: 'ns-blowup-instances',
    size: instanceData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });

  let colorTexture = null;
  let depthTexture = null;
  let colorView = null;
  let depthView = null;
  let texWidth = 0;
  let texHeight = 0;

  const uniformData = new ArrayBuffer(UNIFORM_SIZE);
  const f32 = new Float32Array(uniformData);

  /** Register (or replace) a named layer's geometry. Pass null to drop it. */
  function setLayer(id, mesh) {
    const existing = layers.get(id);
    if (existing) {
      existing.vertexBuffer.destroy();
      existing.indexBuffer.destroy();
      layers.delete(id);
    }
    if (!mesh || !mesh.indices || mesh.indices.length === 0) return;

    const data = interleave(mesh);
    const vertexBuffer = device.createBuffer({
      label: `ns-blowup-${id}-vertices`,
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vertexBuffer, 0, data);

    // Uint32 indices are always a multiple of 4 bytes, as WebGPU requires.
    const indexBuffer = device.createBuffer({
      label: `ns-blowup-${id}-indices`,
      size: mesh.indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(indexBuffer, 0, mesh.indices);

    layers.set(id, { vertexBuffer, indexBuffer, indexCount: mesh.indices.length });
  }

  const hasLayer = (id) => layers.has(id);

  /**
   * A faint dashed line along the axis of symmetry, which every generation
   * shares. It is left unscaled because the axis is the one scale-invariant
   * part of the picture.
   */
  function setAxis(y0, y1) {
    if (axisBuffer) { axisBuffer.destroy(); axisBuffer = null; }
    const dashes = 64;
    const data = new Float32Array(dashes * 2 * 4);
    for (let i = 0; i < dashes; i++) {
      const a = y0 + ((y1 - y0) * i) / dashes;
      const b = a + ((y1 - y0) / dashes) * 0.5;
      const fade = 1 - Math.max(0, (a - y0) / (y1 - y0));
      for (const [k, y] of [[0, a], [1, b]]) {
        const o = (i * 2 + k) * 4;
        data[o] = 0; data[o + 1] = y; data[o + 2] = 0;
        data[o + 3] = Math.max(0, fade);
      }
    }
    axisBuffer = device.createBuffer({
      label: 'ns-blowup-axis',
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(axisBuffer, 0, data);
    axisCount = dashes * 2;
  }

  function ensureTextures(w, h) {
    if (texWidth === w && texHeight === h) return;
    if (colorTexture) colorTexture.destroy();
    if (depthTexture) depthTexture.destroy();

    colorTexture = device.createTexture({
      label: 'ns-blowup-msaa-color',
      size: [w, h],
      format: canvasFormat,
      sampleCount: SAMPLE_COUNT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    depthTexture = device.createTexture({
      label: 'ns-blowup-msaa-depth',
      size: [w, h],
      format: 'depth24plus',
      sampleCount: SAMPLE_COUNT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    colorView = colorTexture.createView();
    depthView = depthTexture.createView();
    texWidth = w;
    texHeight = h;
  }

  function computeClipPlanes(eye, radius) {
    const eyeDist = Math.hypot(eye[0], eye[1], eye[2]);
    const smoothMax = (a, b, k) => 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + k * k));
    return { near: smoothMax(eyeDist - radius, 0.02, 0.5), far: eyeDist + radius };
  }

  /**
   * @param params.layers  [{ id, instances: [{scale,twist,opacity,rate,stretchY,stretchR,offset}] }]
   */
  function render(gpuContext, params, camera, w, h) {
    if (w === 0 || h === 0) return false;
    const { view, projection, eye } = camera.update(w / h);

    ensureTextures(w, h);

    const { near, far } = computeClipPlanes(eye, params.sceneRadius ?? 12);
    const rangeInv = 1 / (near - far);
    projection[10] = far * rangeInv;
    projection[14] = near * far * rangeInv;

    f32.set(projection, 0);
    f32.set(view, 16);
    f32[32] = eye[0]; f32[33] = eye[1]; f32[34] = eye[2];
    f32[35] = params.time ?? 0;
    f32[36] = params.background[0];
    f32[37] = params.background[1];
    f32[38] = params.background[2];
    f32[39] = params.flowRate ?? 1.2;
    f32[40] = params.flowAmp ?? 0.55;
    f32[41] = params.exposure ?? 1.05;
    f32[42] = params.fogDensity ?? 0.05;
    f32[43] = params.fogStart ?? 6;
    f32[44] = params.isDark ? 1 : 0;
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    // Pack every layer's instances into one buffer, then draw each layer from
    // its own slice of it.
    const draws = [];
    let slot = 0;
    for (const layer of params.layers) {
      const geometry = layers.get(layer.id);
      if (!geometry) continue;
      const visible = (layer.instances ?? []).filter((it) => (it.opacity ?? 1) > 0.004);
      if (visible.length === 0 || slot + visible.length > MAX_INSTANCES) continue;

      const first = slot;
      for (const it of visible) {
        const o = slot * INSTANCE_FLOATS;
        instanceData[o] = it.scale ?? 1;
        instanceData[o + 1] = it.twist ?? 0;
        instanceData[o + 2] = it.opacity ?? 1;
        instanceData[o + 3] = it.rate ?? 1;
        instanceData[o + 4] = it.stretchY ?? 1;
        instanceData[o + 5] = it.stretchR ?? 1;
        instanceData[o + 6] = it.offset ?? 0;
        instanceData[o + 7] = 0;
        slot++;
      }
      draws.push({
        geometry,
        first,
        count: visible.length,
        opaque: visible.every((it) => (it.opacity ?? 1) >= 0.995)
      });
    }
    if (slot > 0) device.queue.writeBuffer(instanceBuffer, 0, instanceData, 0, slot * INSTANCE_FLOATS);

    const bg = params.background;
    const encoder = device.createCommandEncoder({ label: 'ns-blowup-frame' });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: colorView,
        resolveTarget: gpuContext.getCurrentTexture().createView(),
        clearValue: { r: bg[0], g: bg[1], b: bg[2], a: 1 },
        loadOp: 'clear',
        storeOp: 'store'
      }],
      depthStencilAttachment: {
        view: depthView,
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store'
      }
    });

    pass.setBindGroup(0, bindGroup);

    // Opaque first, so translucent geometry depth-tests against it.
    for (const pipeline of [opaquePipeline, blendPipeline]) {
      const wantOpaque = pipeline === opaquePipeline;
      let bound = false;
      for (const d of draws) {
        if (d.opaque !== wantOpaque) continue;
        if (!bound) { pass.setPipeline(pipeline); bound = true; }
        pass.setVertexBuffer(0, d.geometry.vertexBuffer);
        pass.setVertexBuffer(1, instanceBuffer, d.first * INSTANCE_FLOATS * 4);
        pass.setIndexBuffer(d.geometry.indexBuffer, 'uint32');
        pass.drawIndexed(d.geometry.indexCount, d.count);
      }
    }

    if (axisCount > 0 && (params.axisOpacity ?? 0) > 0.004) {
      pass.setPipeline(axisPipeline);
      pass.setVertexBuffer(0, axisBuffer);
      pass.draw(axisCount);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
    return true;
  }

  function destroy() {
    for (const layer of layers.values()) {
      layer.vertexBuffer.destroy();
      layer.indexBuffer.destroy();
    }
    layers.clear();
    if (axisBuffer) axisBuffer.destroy();
    instanceBuffer.destroy();
    if (colorTexture) colorTexture.destroy();
    if (depthTexture) depthTexture.destroy();
    uniformBuffer.destroy();
  }

  return { setLayer, hasLayer, setAxis, render, destroy };
}
