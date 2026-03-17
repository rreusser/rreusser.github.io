export function createRenderer(device, canvasFormat, shaderCodes) {
  const MAX_PEEL_LAYERS = 8;

  const peelModule = device.createShaderModule({ label: 'costa-peel-shader', code: shaderCodes.peel });
  const compositeModule = device.createShaderModule({ label: 'costa-composite-shader', code: shaderCodes.composite });

  // Uniform buffer: 12 uniforms = 48 floats for matrices + 12 scalar floats = 240 bytes
  // Rounded up: mat4x4f(16) + mat4x4f(16) + vec3f(3) + f32(1) + 8 scalars = 44 floats = 176 bytes
  // Actual: 2*mat4(128) + vec3f+pad(16) + 8*f32(32) = 176
  const UNIFORM_SIZE = 192; // 48 floats = 192 bytes (padded to 16-byte alignment)

  const uniformBuffer = device.createBuffer({
    size: UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformBindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' }
    }]
  });

  const uniformBindGroup = device.createBindGroup({
    layout: uniformBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
  });

  const peelDepthBindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      texture: { sampleType: 'depth' }
    }]
  });

  const compositeBindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      texture: { sampleType: 'float' }
    }]
  });

  const surfacePipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [uniformBindGroupLayout]
  });

  const peelPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [uniformBindGroupLayout, peelDepthBindGroupLayout]
  });

  const compositePipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [compositeBindGroupLayout]
  });

  // Vertex layout: position(vec3f) + normal(vec3f) + uv(vec2f) = 32 bytes
  const vertexBufferLayout = [{
    arrayStride: 32,
    attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
      { shaderLocation: 1, offset: 12, format: 'float32x3' }, // normal
      { shaderLocation: 2, offset: 24, format: 'float32x2' }, // uv
    ]
  }];

  const peelFirstPipeline = device.createRenderPipeline({
    layout: surfacePipelineLayout,
    vertex: { module: peelModule, entryPoint: 'vs', buffers: vertexBufferLayout },
    fragment: { module: peelModule, entryPoint: 'fsFirst', targets: [{ format: 'rgba8unorm' }] },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' }
  });

  const peelPeelPipeline = device.createRenderPipeline({
    layout: peelPipelineLayout,
    vertex: { module: peelModule, entryPoint: 'vs', buffers: vertexBufferLayout },
    fragment: { module: peelModule, entryPoint: 'fsPeel', targets: [{ format: 'rgba8unorm' }] },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' }
  });

  const compositePipeline = device.createRenderPipeline({
    layout: compositePipelineLayout,
    vertex: { module: compositeModule, entryPoint: 'vs', buffers: [] },
    fragment: {
      module: compositeModule,
      entryPoint: 'fs',
      targets: [{
        format: canvasFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
        }
      }]
    },
    primitive: { topology: 'triangle-list' }
  });

  let vertexBuffer = null;
  let indexBuffer = null;
  let indexCount = 0;

  let peelDepthTextures = [];
  let layerTextures = [];
  let peelBindGroups = [];
  let compositeBindGroups = [];
  let texWidth = 0;
  let texHeight = 0;

  function initMesh(mesh) {
    vertexBuffer = device.createBuffer({
      size: mesh.vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, mesh.vertexData);

    indexCount = mesh.indexCount;
    indexBuffer = device.createBuffer({
      size: mesh.indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indexBuffer, 0, mesh.indexData);
  }

  function ensureTextures(w, h) {
    if (texWidth === w && texHeight === h) return;

    for (const t of peelDepthTextures) t.destroy();
    for (const t of layerTextures) t.destroy();
    peelDepthTextures = [];
    layerTextures = [];
    peelBindGroups = [];
    compositeBindGroups = [];

    for (let i = 0; i < 2; i++) {
      peelDepthTextures.push(device.createTexture({
        size: [w, h],
        format: 'depth32float',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      }));
    }

    for (let i = 0; i < MAX_PEEL_LAYERS; i++) {
      layerTextures.push(device.createTexture({
        size: [w, h],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      }));
    }

    const peelDepthBGL = peelPeelPipeline.getBindGroupLayout(1);
    for (let i = 0; i < 2; i++) {
      peelBindGroups.push(device.createBindGroup({
        layout: peelDepthBGL,
        entries: [{ binding: 0, resource: peelDepthTextures[i].createView() }]
      }));
    }

    const compositeBGL = compositePipeline.getBindGroupLayout(0);
    for (let i = 0; i < MAX_PEEL_LAYERS; i++) {
      compositeBindGroups.push(device.createBindGroup({
        layout: compositeBGL,
        entries: [{ binding: 0, resource: layerTextures[i].createView() }]
      }));
    }

    texWidth = w;
    texHeight = h;
  }

  function computeClipPlanes(eye) {
    const boundingSphereRadius = 15;
    const eyeDist = Math.sqrt(eye[0] * eye[0] + eye[1] * eye[1] + eye[2] * eye[2]);
    const smoothMax = (a, b, k) => 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + k * k));
    const near = smoothMax(eyeDist - boundingSphereRadius, 0.01, 0.5);
    const far = eyeDist + boundingSphereRadius;
    return { near, far };
  }

  function render(gpuContext, params, camera, w, h, dirty) {
    const aspectRatio = w / h;
    const { view, projection, eye, dirty: cameraDirty } = camera.update(aspectRatio);
    if (!cameraDirty && !dirty) return false;

    const { near, far } = computeClipPlanes(eye);
    const rangeInv = 1 / (near - far);
    projection[10] = far * rangeInv;
    projection[14] = near * far * rangeInv;

    const uniformData = new ArrayBuffer(UNIFORM_SIZE);
    const f32 = new Float32Array(uniformData);
    f32.set(projection, 0);       // 0-15
    f32.set(view, 16);            // 16-31
    f32[32] = eye[0];             // 32
    f32[33] = eye[1];             // 33
    f32[34] = eye[2];             // 34
    f32[35] = devicePixelRatio;   // 35
    f32[36] = params.opacity;     // 36
    f32[37] = params.cartoonEdgeWidth;   // 37
    f32[38] = params.cartoonEdgeOpacity; // 38
    f32[39] = params.gridOpacity;        // 39
    f32[40] = params.gridWidth;          // 40
    f32[41] = params.specular;           // 41
    f32[42] = params.clipRadius;         // 42
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    let colorTexture;
    try {
      colorTexture = gpuContext.getCurrentTexture();
    } catch (e) {
      return false;
    }

    ensureTextures(w, h);

    const numLayers = params.peelLayers;
    const encoder = device.createCommandEncoder();

    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: layerTextures[0].createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
        depthStencilAttachment: {
          view: peelDepthTextures[0].createView(),
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        }
      });
      pass.setPipeline(peelFirstPipeline);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.setIndexBuffer(indexBuffer, 'uint32');
      pass.setBindGroup(0, uniformBindGroup);
      pass.drawIndexed(indexCount);
      pass.end();
    }

    for (let layer = 1; layer < numLayers; layer++) {
      const prevDepthIdx = (layer - 1) % 2;
      const currDepthIdx = layer % 2;

      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: layerTextures[layer].createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
        depthStencilAttachment: {
          view: peelDepthTextures[currDepthIdx].createView(),
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        }
      });
      pass.setPipeline(peelPeelPipeline);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.setIndexBuffer(indexBuffer, 'uint32');
      pass.setBindGroup(0, uniformBindGroup);
      pass.setBindGroup(1, peelBindGroups[prevDepthIdx]);
      pass.drawIndexed(indexCount);
      pass.end();
    }

    for (let layer = numLayers - 1; layer >= 0; layer--) {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: colorTexture.createView(),
          clearValue: layer === numLayers - 1 ? { r: 0, g: 0, b: 0, a: 0 } : undefined,
          loadOp: layer === numLayers - 1 ? 'clear' : 'load',
          storeOp: 'store',
        }]
      });
      pass.setPipeline(compositePipeline);
      pass.setBindGroup(0, compositeBindGroups[layer]);
      pass.draw(3);
      pass.end();
    }

    device.queue.submit([encoder.finish()]);
    return true;
  }

  return { initMesh, render };
}
