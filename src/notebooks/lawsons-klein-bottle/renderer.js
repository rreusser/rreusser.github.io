export function createRenderer(device, canvasFormat, shaderCodes) {
  const MAX_PEEL_LAYERS = 8;

  const peelModule = device.createShaderModule({ label: 'klein-peel-shader', code: shaderCodes.peel });
  const compositeModule = device.createShaderModule({ label: 'klein-composite-shader', code: shaderCodes.composite });

  // Uniform buffer: 208 bytes (struct size rounded to 16-byte alignment)
  const uniformBuffer = device.createBuffer({
    size: 208,
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

  // Depth texture bind group layout for peel passes
  const peelDepthBindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      texture: { sampleType: 'depth' }
    }]
  });

  // Composite bind group layout
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

  const vertexBufferLayout = [{
    arrayStride: 8,
    attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }]
  }];

  // First peel pass: standard depth test
  const peelFirstPipeline = device.createRenderPipeline({
    layout: surfacePipelineLayout,
    vertex: { module: peelModule, entryPoint: 'vs', buffers: vertexBufferLayout },
    fragment: { module: peelModule, entryPoint: 'fsFirst', targets: [{ format: 'rgba8unorm' }] },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' }
  });

  // Subsequent peel passes: discard fragments at or in front of previous depth
  const peelPeelPipeline = device.createRenderPipeline({
    layout: peelPipelineLayout,
    vertex: { module: peelModule, entryPoint: 'vs', buffers: vertexBufferLayout },
    fragment: { module: peelModule, entryPoint: 'fsPeel', targets: [{ format: 'rgba8unorm' }] },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' }
  });

  // Composite pass: alpha blend each layer back-to-front
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

  // Mesh state
  let vertexBuffer = null;
  let indexBuffer = null;
  let indexCount = 0;

  // Texture state
  let peelDepthTextures = [];
  let layerTextures = [];
  let peelBindGroups = [];
  let compositeBindGroups = [];
  let texWidth = 0;
  let texHeight = 0;

  function initMesh(mesh) {
    const uvData = new Float32Array(mesh.positions.flat());
    vertexBuffer = device.createBuffer({
      size: uvData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, uvData);

    const indexData = new Uint32Array(mesh.cells.flat());
    indexCount = indexData.length;
    indexBuffer = device.createBuffer({
      size: indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indexBuffer, 0, indexData);
  }

  function ensureTextures(w, h) {
    if (texWidth === w && texHeight === h) return;

    for (const t of peelDepthTextures) t.destroy();
    for (const t of layerTextures) t.destroy();
    peelDepthTextures = [];
    layerTextures = [];
    peelBindGroups = [];
    compositeBindGroups = [];

    // Two ping-pong depth textures
    for (let i = 0; i < 2; i++) {
      peelDepthTextures.push(device.createTexture({
        size: [w, h],
        format: 'depth32float',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      }));
    }

    // One color texture per layer
    for (let i = 0; i < MAX_PEEL_LAYERS; i++) {
      layerTextures.push(device.createTexture({
        size: [w, h],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      }));
    }

    // Bind groups for reading previous depth during peel passes
    const peelDepthBGL = peelPeelPipeline.getBindGroupLayout(1);
    for (let i = 0; i < 2; i++) {
      peelBindGroups.push(device.createBindGroup({
        layout: peelDepthBGL,
        entries: [{ binding: 0, resource: peelDepthTextures[i].createView() }]
      }));
    }

    // Bind groups for compositing each layer
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
    const boundingSphereRadius = 10;
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
    // Patch projection for WebGPU [0,1] depth range
    const rangeInv = 1 / (near - far);
    projection[10] = far * rangeInv;
    projection[14] = near * far * rangeInv;

    // Write uniforms
    const uniformData = new ArrayBuffer(208);
    const f32 = new Float32Array(uniformData);
    f32.set(projection, 0);
    f32.set(view, 16);
    f32[32] = eye[0];
    f32[33] = eye[1];
    f32[34] = eye[2];
    f32[35] = devicePixelRatio;
    f32[36] = params.tau;
    f32[37] = params.rotationPhi;
    f32[38] = params.opacity;
    f32[39] = params.cartoonEdgeWidth;
    f32[40] = params.cartoonEdgeOpacity;
    f32[41] = params.gridOpacity;
    f32[42] = params.gridWidth;
    f32[43] = params.specular;
    f32[44] = params.uClipMin;
    f32[45] = params.uClipMax;
    f32[46] = params.vClipMin;
    f32[47] = params.vClipMax;
    f32[48] = params.invertClipU;
    f32[49] = params.invertClipV;
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

    // Layer 0: first pass with standard depth test
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

    // Peel passes: each reads previous depth, captures next layer
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

    // Composite passes: back to front
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
