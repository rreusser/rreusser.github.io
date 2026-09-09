const UNIFORM_SIZE = 176;
const MAX_INSTANCES = 64;
const INSTANCE_FLOATS = 12;
const MAX_PEEL_LAYERS = 5;

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
 * A layered renderer with order-independent transparency by depth peeling.
 *
 * Geometry is registered once per named layer and drawn with a list of
 * instances, each carrying its own placement, opacity and stretch. Fades are
 * the whole vocabulary of the walkthrough, so transparency has to be correct
 * regardless of draw order: sorting layers by hand fails as soon as two of them
 * interleave in depth, and switching a layer between depth-writing and not as
 * its opacity crosses a threshold makes everything it was hiding pop.
 *
 * So each frame peels a fixed number of surfaces front to back, each pass
 * discarding anything at or in front of the previous pass's depth, then
 * composites them back to front. The cost is the geometry drawn once per layer,
 * and no multisampling, since the peel passes have to read their depth buffer
 * back. Supersampling through the canvas backing store covers the second.
 */
export function createRenderer(device, canvasFormat, shaderCodes) {
  const tubeModule = device.createShaderModule({ label: 'ns-blowup-tubes', code: shaderCodes.tube });
  const compositeModule = device.createShaderModule({
    label: 'ns-blowup-composite',
    code: shaderCodes.composite
  });

  const uniformBuffer = device.createBuffer({
    label: 'ns-blowup-uniforms',
    size: UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const uniformLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' }
    }]
  });

  const uniformBindGroup = device.createBindGroup({
    layout: uniformLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
  });

  const depthReadLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth' } }]
  });

  const layerReadLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } }]
  });

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
        { shaderLocation: 5, offset: 16, format: 'float32x4' },
        { shaderLocation: 6, offset: 32, format: 'float32x4' }
      ]
    }
  ];

  const premultiplied = {
    color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
  };

  function makePeelPipeline(entryPoint, layouts) {
    return device.createRenderPipeline({
      label: `ns-blowup-${entryPoint}`,
      layout: device.createPipelineLayout({ bindGroupLayouts: layouts }),
      vertex: { module: tubeModule, entryPoint: 'vs', buffers: vertexBuffers },
      // Each peel layer holds exactly one surface, so it needs no blending.
      fragment: { module: tubeModule, entryPoint, targets: [{ format: 'rgba8unorm' }] },
      // Back faces are culled: a closed surface drawn double-sided peels its own
      // interior as a separate layer, which wastes a layer and reads as banding.
      primitive: { topology: 'triangle-list', cullMode: 'back' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' }
    });
  }

  const firstPipeline = makePeelPipeline('fsFirst', [uniformLayout]);
  const peelPipeline = makePeelPipeline('fsPeel', [uniformLayout, depthReadLayout]);

  const compositePipeline = device.createRenderPipeline({
    label: 'ns-blowup-composite',
    layout: device.createPipelineLayout({ bindGroupLayouts: [layerReadLayout] }),
    vertex: { module: compositeModule, entryPoint: 'vs' },
    fragment: {
      module: compositeModule,
      entryPoint: 'fs',
      targets: [{ format: canvasFormat, blend: premultiplied }]
    },
    primitive: { topology: 'triangle-list' }
  });

  const layers = new Map();

  const instanceData = new Float32Array(MAX_INSTANCES * INSTANCE_FLOATS);
  const instanceBuffer = device.createBuffer({
    label: 'ns-blowup-instances',
    size: instanceData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });

  let layerTextures = [];
  let depthTextures = [];
  let depthBindGroups = [];
  let layerBindGroups = [];
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

  function releaseTextures() {
    for (const t of layerTextures) t.destroy();
    for (const t of depthTextures) t.destroy();
    layerTextures = [];
    depthTextures = [];
    depthBindGroups = [];
    layerBindGroups = [];
  }

  function ensureTextures(w, h) {
    if (texWidth === w && texHeight === h) return;
    releaseTextures();

    // Two depth buffers, ping-ponged: one being written, one being read.
    for (let i = 0; i < 2; i++) {
      depthTextures.push(device.createTexture({
        label: `ns-blowup-peel-depth-${i}`,
        size: [w, h],
        format: 'depth32float',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
      }));
    }
    for (let i = 0; i < MAX_PEEL_LAYERS; i++) {
      layerTextures.push(device.createTexture({
        label: `ns-blowup-peel-layer-${i}`,
        size: [w, h],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
      }));
    }
    for (let i = 0; i < 2; i++) {
      depthBindGroups.push(device.createBindGroup({
        layout: depthReadLayout,
        entries: [{ binding: 0, resource: depthTextures[i].createView() }]
      }));
    }
    for (let i = 0; i < MAX_PEEL_LAYERS; i++) {
      layerBindGroups.push(device.createBindGroup({
        layout: layerReadLayout,
        entries: [{ binding: 0, resource: layerTextures[i].createView() }]
      }));
    }

    texWidth = w;
    texHeight = h;
  }

  /**
   * Clip planes tight around the scene.
   *
   * The distance is taken from the camera's own orbit radius, i.e. from the
   * point it is looking at, not from the world origin. Measuring from the origin
   * while the camera orbits something else pushes the near plane toward zero,
   * and a near/far ratio like 0.3/35 leaves almost no depth precision where the
   * geometry actually is. Peeling compares depths directly, so it is especially
   * sensitive to that.
   */
  function computeClipPlanes(camera, radius) {
    const distance = camera.getState().distance;
    const smoothMax = (a, b, k) => 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + k * k));
    return { near: smoothMax(distance - radius, 0.1, 0.25), far: distance + radius };
  }

  /** Pack every layer's instances into one buffer and note where each starts. */
  function packInstances(layerList) {
    const draws = [];
    let slot = 0;
    for (const layer of layerList) {
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
        instanceData[o + 3] = it.phase ?? 0;
        instanceData[o + 4] = it.stretchY ?? 1;
        instanceData[o + 5] = it.stretchR ?? 1;
        instanceData[o + 6] = it.offsetY ?? 0;
        instanceData[o + 7] = it.offsetR ?? 0;
        instanceData[o + 8] = it.pulseAmp ?? 0;
        instanceData[o + 9] = 0;
        instanceData[o + 10] = 0;
        instanceData[o + 11] = 0;
        slot++;
      }
      draws.push({ geometry, first, count: visible.length });
    }
    if (slot > 0) device.queue.writeBuffer(instanceBuffer, 0, instanceData, 0, slot * INSTANCE_FLOATS);
    return draws;
  }

  function drawAll(pass, draws) {
    for (const d of draws) {
      pass.setVertexBuffer(0, d.geometry.vertexBuffer);
      pass.setVertexBuffer(1, instanceBuffer, d.first * INSTANCE_FLOATS * 4);
      pass.setIndexBuffer(d.geometry.indexBuffer, 'uint32');
      pass.drawIndexed(d.geometry.indexCount, d.count);
    }
  }

  /**
   * @param params.layers      [{ id, instances: [...] }]; order does not matter,
   *                            since peeling resolves depth per pixel
   * @param params.peelLayers  surfaces resolved per pixel, 1..MAX_PEEL_LAYERS
   */
  function render(gpuContext, params, camera, w, h) {
    if (w === 0 || h === 0) return false;

    let target;
    try {
      target = gpuContext.getCurrentTexture();
    } catch (e) {
      return false;
    }

    const { view, projection, eye } = camera.update(w / h);
    ensureTextures(w, h);

    const { near, far } = computeClipPlanes(camera, params.sceneRadius ?? 12);
    const rangeInv = 1 / (near - far);
    projection[10] = far * rangeInv;
    projection[14] = near * far * rangeInv;

    f32.set(projection, 0);
    f32.set(view, 16);
    f32[32] = eye[0]; f32[33] = eye[1]; f32[34] = eye[2];
    f32[35] = params.isDark ? 1 : 0;
    f32[36] = params.background[0];
    f32[37] = params.background[1];
    f32[38] = params.background[2];
    f32[39] = params.flowRate ?? 1.2;
    f32[40] = params.flowAmp ?? 0.55;
    f32[41] = params.exposure ?? 1.05;
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const draws = packInstances(params.layers);
    const peels = Math.max(1, Math.min(MAX_PEEL_LAYERS, params.peelLayers ?? 4));
    const encoder = device.createCommandEncoder({ label: 'ns-blowup-frame' });

    for (let layer = 0; layer < peels; layer++) {
      const pass = encoder.beginRenderPass({
        label: `peel-${layer}`,
        colorAttachments: [{
          view: layerTextures[layer].createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store'
        }],
        depthStencilAttachment: {
          view: depthTextures[layer % 2].createView(),
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store'
        }
      });
      pass.setPipeline(layer === 0 ? firstPipeline : peelPipeline);
      pass.setBindGroup(0, uniformBindGroup);
      if (layer > 0) pass.setBindGroup(1, depthBindGroups[(layer - 1) % 2]);
      drawAll(pass, draws);
      pass.end();
    }

    // Composite back to front over the background.
    const bg = params.background;
    for (let layer = peels - 1; layer >= 0; layer--) {
      const last = layer === peels - 1;
      const pass = encoder.beginRenderPass({
        label: `composite-${layer}`,
        colorAttachments: [{
          view: target.createView(),
          clearValue: last ? { r: bg[0], g: bg[1], b: bg[2], a: 1 } : undefined,
          loadOp: last ? 'clear' : 'load',
          storeOp: 'store'
        }]
      });
      pass.setPipeline(compositePipeline);
      pass.setBindGroup(0, layerBindGroups[layer]);
      pass.draw(3);
      pass.end();
    }

    device.queue.submit([encoder.finish()]);
    return true;
  }

  function destroy() {
    for (const layer of layers.values()) {
      layer.vertexBuffer.destroy();
      layer.indexBuffer.destroy();
    }
    layers.clear();
    releaseTextures();
    instanceBuffer.destroy();
    uniformBuffer.destroy();
  }

  return { setLayer, render, destroy };
}
