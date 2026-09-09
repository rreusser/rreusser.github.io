const UNIFORM_SIZE = 176;
const SAMPLE_COUNT = 4;

/** Interleave the tube attributes into a single vertex buffer. */
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

  const tubePipeline = device.createRenderPipeline({
    label: 'ns-blowup-tube-pipeline',
    layout: pipelineLayout,
    vertex: {
      module: tubeModule,
      entryPoint: 'vs',
      buffers: [{
        arrayStride: 32,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' },
          { shaderLocation: 1, offset: 12, format: 'float32x3' },
          { shaderLocation: 2, offset: 24, format: 'float32' },
          { shaderLocation: 3, offset: 28, format: 'float32' }
        ]
      }]
    },
    fragment: { module: tubeModule, entryPoint: 'fs', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: SAMPLE_COUNT }
  });

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
      targets: [{
        format: canvasFormat,
        blend: {
          color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
        }
      }]
    },
    primitive: { topology: 'line-list' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'less' },
    multisample: { count: SAMPLE_COUNT }
  });

  let vertexBuffer = null;
  let indexBuffer = null;
  let indexCount = 0;

  let axisBuffer = null;
  let axisCount = 0;

  let colorTexture = null;
  let depthTexture = null;
  let colorView = null;
  let depthView = null;
  let texWidth = 0;
  let texHeight = 0;

  const uniformData = new ArrayBuffer(UNIFORM_SIZE);
  const f32 = new Float32Array(uniformData);

  function setGeometry(mesh) {
    if (vertexBuffer) { vertexBuffer.destroy(); vertexBuffer = null; }
    if (indexBuffer) { indexBuffer.destroy(); indexBuffer = null; }
    indexCount = 0;
    if (!mesh) return;

    const data = interleave(mesh);
    vertexBuffer = device.createBuffer({
      label: 'ns-blowup-vertices',
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vertexBuffer, 0, data);

    // Index buffers must be a multiple of 4 bytes; uint32 indices always are.
    indexBuffer = device.createBuffer({
      label: 'ns-blowup-indices',
      size: mesh.indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(indexBuffer, 0, mesh.indices);
    indexCount = mesh.indices.length;
  }

  /** A faint dashed line marking the axis of symmetry. */
  function setAxis(halfLength) {
    if (axisBuffer) { axisBuffer.destroy(); axisBuffer = null; }
    const dashes = 48;
    const data = new Float32Array(dashes * 2 * 4);
    for (let i = 0; i < dashes; i++) {
      const a = -halfLength + (2 * halfLength * i) / dashes;
      const b = a + (2 * halfLength) / dashes * 0.5;
      const fade = 1 - Math.abs((a + b) / 2) / halfLength;
      for (const [k, z] of [[0, a], [1, b]]) {
        const o = (i * 2 + k) * 4;
        data[o] = 0; data[o + 1] = 0; data[o + 2] = z;
        data[o + 3] = 0.28 * Math.max(0, fade);
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

    // Views are cached rather than recreated per frame.
    colorView = colorTexture.createView();
    depthView = depthTexture.createView();

    texWidth = w;
    texHeight = h;
  }

  function computeClipPlanes(eye) {
    const radius = 12;
    const eyeDist = Math.hypot(eye[0], eye[1], eye[2]);
    const smoothMax = (a, b, k) => 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + k * k));
    return { near: smoothMax(eyeDist - radius, 0.01, 0.5), far: eyeDist + radius };
  }

  function render(gpuContext, params, camera, w, h, force) {
    if (w === 0 || h === 0) return false;
    const { view, projection, eye, dirty: cameraDirty } = camera.update(w / h);
    if (!cameraDirty && !force && !params.animating) return false;

    ensureTextures(w, h);

    const { near, far } = computeClipPlanes(eye);
    const rangeInv = 1 / (near - far);
    projection[10] = far * rangeInv;
    projection[14] = near * far * rangeInv;

    f32.set(projection, 0);
    f32.set(view, 16);
    f32[32] = eye[0]; f32[33] = eye[1]; f32[34] = eye[2];
    f32[35] = params.time;
    f32[36] = params.background[0];
    f32[37] = params.background[1];
    f32[38] = params.background[2];
    f32[39] = params.flowRate;
    f32[40] = params.flowAmp;
    f32[41] = params.exposure;
    f32[42] = params.fogDensity;
    f32[43] = params.axisFade;
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

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

    if (indexCount > 0) {
      pass.setPipeline(tubePipeline);
      pass.setBindGroup(0, bindGroup);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.setIndexBuffer(indexBuffer, 'uint32');
      pass.drawIndexed(indexCount);
    }

    if (axisCount > 0 && params.axisFade > 0) {
      pass.setPipeline(axisPipeline);
      pass.setBindGroup(0, bindGroup);
      pass.setVertexBuffer(0, axisBuffer);
      pass.draw(axisCount);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
    return true;
  }

  function destroy() {
    if (vertexBuffer) vertexBuffer.destroy();
    if (indexBuffer) indexBuffer.destroy();
    if (axisBuffer) axisBuffer.destroy();
    if (colorTexture) colorTexture.destroy();
    if (depthTexture) depthTexture.destroy();
    uniformBuffer.destroy();
  }

  return { setGeometry, setAxis, render, destroy };
}
