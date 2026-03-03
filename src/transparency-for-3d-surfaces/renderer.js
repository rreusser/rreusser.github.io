export function createRenderer(device, canvasFormat, shaderCodes) {
  const MSAA_SAMPLES = 4;
  const MAX_PEEL_LAYERS = 8;

  // Shader modules
  const surfaceModule = device.createShaderModule({ label: 'surface-shader', code: shaderCodes.surface });
  const oitModule = device.createShaderModule({ label: 'oit-shader', code: shaderCodes.oit });
  const oitCompositeModule = device.createShaderModule({ label: 'oit-composite-shader', code: shaderCodes.oitComposite });
  const peelModule = device.createShaderModule({ label: 'peel-shader', code: shaderCodes.peel });
  const peelCompositeModule = device.createShaderModule({ label: 'peel-composite-shader', code: shaderCodes.peelComposite });
  const dualPeelModule = device.createShaderModule({ label: 'dual-peel-shader', code: shaderCodes.dualPeel });

  // Uniform buffer (192 bytes)
  const uniformBuffer = device.createBuffer({
    size: 192,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Shared uniform bind group layout
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

  // Pipeline layouts
  const surfacePipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [uniformBindGroupLayout]
  });

  const peelDepthBindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      texture: { sampleType: 'depth' }
    }]
  });

  const peelPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [uniformBindGroupLayout, peelDepthBindGroupLayout]
  });

  const dualPeelDepthBindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      texture: { sampleType: 'float' }
    }]
  });

  const dualPeelPeelPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [uniformBindGroupLayout, dualPeelDepthBindGroupLayout]
  });

  const oitCompositeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    ]
  });
  const oitCompositePipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [oitCompositeBindGroupLayout]
  });

  const peelCompositeBindGroupLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } }]
  });
  const peelCompositePipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [peelCompositeBindGroupLayout]
  });

  const vertexBufferLayout = [{
    arrayStride: 8,
    attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }]
  }];

  // Fake transparency pipelines
  const solidPipeline = device.createRenderPipeline({
    layout: surfacePipelineLayout,
    vertex: { module: surfaceModule, entryPoint: 'vs', buffers: vertexBufferLayout },
    fragment: {
      module: surfaceModule,
      entryPoint: 'fsSolid',
      targets: [{ format: canvasFormat }]
    },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: MSAA_SAMPLES }
  });

  const wirePipeline = device.createRenderPipeline({
    layout: surfacePipelineLayout,
    vertex: { module: surfaceModule, entryPoint: 'vs', buffers: vertexBufferLayout },
    fragment: {
      module: surfaceModule,
      entryPoint: 'fsWire',
      targets: [{
        format: canvasFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
        }
      }]
    },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' },
    multisample: { count: MSAA_SAMPLES }
  });

  // OIT pipelines
  const oitPipeline = device.createRenderPipeline({
    layout: surfacePipelineLayout,
    vertex: { module: oitModule, entryPoint: 'vs', buffers: vertexBufferLayout },
    fragment: {
      module: oitModule,
      entryPoint: 'fsOIT',
      targets: [
        {
          format: 'rgba16float',
          blend: {
            color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }
          }
        },
        {
          format: 'r8unorm',
          blend: {
            color: { srcFactor: 'zero', dstFactor: 'one-minus-src', operation: 'add' },
            alpha: { srcFactor: 'zero', dstFactor: 'one-minus-src', operation: 'add' }
          }
        }
      ]
    },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'less' },
    multisample: { count: MSAA_SAMPLES }
  });

  const oitCompositePipeline = device.createRenderPipeline({
    layout: oitCompositePipelineLayout,
    vertex: { module: oitCompositeModule, entryPoint: 'vs', buffers: [] },
    fragment: { module: oitCompositeModule, entryPoint: 'fs', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'triangle-list' }
  });

  // Depth peeling pipelines
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

  const peelCompositePipeline = device.createRenderPipeline({
    layout: peelCompositePipelineLayout,
    vertex: { module: peelCompositeModule, entryPoint: 'vs', buffers: [] },
    fragment: {
      module: peelCompositeModule,
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

  // Dual depth peeling pipelines
  const maxBlend = {
    color: { srcFactor: 'one', dstFactor: 'one', operation: 'max' },
    alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'max' }
  };

  const dualPeelTargets = [
    { format: 'rg16float', blend: maxBlend },
    { format: 'rgba8unorm', blend: maxBlend },
    { format: 'rgba8unorm', blend: maxBlend }
  ];

  const dualPeelFirstPipeline = device.createRenderPipeline({
    layout: surfacePipelineLayout,
    vertex: { module: dualPeelModule, entryPoint: 'vs', buffers: vertexBufferLayout },
    fragment: { module: dualPeelModule, entryPoint: 'fsDualFirst', targets: dualPeelTargets },
    primitive: { topology: 'triangle-list', cullMode: 'none' }
  });

  const dualPeelPeelPipeline = device.createRenderPipeline({
    layout: dualPeelPeelPipelineLayout,
    vertex: { module: dualPeelModule, entryPoint: 'vs', buffers: vertexBufferLayout },
    fragment: { module: dualPeelModule, entryPoint: 'fsDualPeel', targets: dualPeelTargets },
    primitive: { topology: 'triangle-list', cullMode: 'none' }
  });

  const dualPeelCompositePipeline = device.createRenderPipeline({
    layout: peelCompositePipelineLayout,
    vertex: { module: peelCompositeModule, entryPoint: 'vs', buffers: [] },
    fragment: {
      module: peelCompositeModule,
      entryPoint: 'fs',
      targets: [{
        format: canvasFormat,
        blend: {
          color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
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
  let depthTexture = null;
  let msaaColorTexture = null;

  let oitDepthTexture = null;
  let accumTexture = null;
  let revealTexture = null;
  let msaaAccumTexture = null;
  let msaaRevealTexture = null;
  let oitCompositeBindGroup = null;
  let oitTexWidth = 0;
  let oitTexHeight = 0;

  let peelDepthTextures = [];
  let layerTextures = [];
  let peelBindGroups = [];
  let peelCompositeBindGroups = [];
  let peelTexWidth = 0;
  let peelTexHeight = 0;

  let dualPeelDepthTextures = [];
  let dualFrontLayerTextures = [];
  let dualBackLayerTextures = [];
  let dualPeelBindGroups = [];
  let dualPeelFrontCompositeBindGroups = [];
  let dualPeelBackCompositeBindGroups = [];
  let dualPeelTexWidth = 0;
  let dualPeelTexHeight = 0;

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

  // Texture ensure functions
  function ensureDepthTexture(w, h) {
    if (depthTexture && depthTexture.width === w && depthTexture.height === h) return;
    if (depthTexture) depthTexture.destroy();
    if (msaaColorTexture) msaaColorTexture.destroy();
    depthTexture = device.createTexture({
      size: [w, h],
      format: 'depth24plus',
      sampleCount: MSAA_SAMPLES,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    msaaColorTexture = device.createTexture({
      size: [w, h],
      format: canvasFormat,
      sampleCount: MSAA_SAMPLES,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  function ensureOITTextures(w, h) {
    if (oitTexWidth === w && oitTexHeight === h) return;

    if (oitDepthTexture) oitDepthTexture.destroy();
    if (accumTexture) accumTexture.destroy();
    if (revealTexture) revealTexture.destroy();
    if (msaaAccumTexture) msaaAccumTexture.destroy();
    if (msaaRevealTexture) msaaRevealTexture.destroy();

    oitDepthTexture = device.createTexture({
      size: [w, h],
      format: 'depth24plus',
      sampleCount: MSAA_SAMPLES,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    accumTexture = device.createTexture({
      size: [w, h],
      format: 'rgba16float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    revealTexture = device.createTexture({
      size: [w, h],
      format: 'r8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    msaaAccumTexture = device.createTexture({
      size: [w, h],
      format: 'rgba16float',
      sampleCount: MSAA_SAMPLES,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    msaaRevealTexture = device.createTexture({
      size: [w, h],
      format: 'r8unorm',
      sampleCount: MSAA_SAMPLES,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    oitCompositeBindGroup = device.createBindGroup({
      layout: oitCompositePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: accumTexture.createView() },
        { binding: 1, resource: revealTexture.createView() },
      ]
    });

    oitTexWidth = w;
    oitTexHeight = h;
  }

  function ensurePeelTextures(w, h) {
    if (peelTexWidth === w && peelTexHeight === h) return;

    for (const t of peelDepthTextures) t.destroy();
    for (const t of layerTextures) t.destroy();
    peelDepthTextures = [];
    layerTextures = [];
    peelBindGroups = [];
    peelCompositeBindGroups = [];

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

    const peelCompositeBGL = peelCompositePipeline.getBindGroupLayout(0);
    for (let i = 0; i < MAX_PEEL_LAYERS; i++) {
      peelCompositeBindGroups.push(device.createBindGroup({
        layout: peelCompositeBGL,
        entries: [{ binding: 0, resource: layerTextures[i].createView() }]
      }));
    }

    peelTexWidth = w;
    peelTexHeight = h;
  }

  function ensureDualPeelTextures(w, h) {
    if (dualPeelTexWidth === w && dualPeelTexHeight === h) return;

    for (const t of dualPeelDepthTextures) t.destroy();
    for (const t of dualFrontLayerTextures) t.destroy();
    for (const t of dualBackLayerTextures) t.destroy();
    dualPeelDepthTextures = [];
    dualFrontLayerTextures = [];
    dualBackLayerTextures = [];
    dualPeelBindGroups = [];
    dualPeelFrontCompositeBindGroups = [];
    dualPeelBackCompositeBindGroups = [];

    for (let i = 0; i < 2; i++) {
      dualPeelDepthTextures.push(device.createTexture({
        size: [w, h],
        format: 'rg16float',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      }));
    }

    for (let i = 0; i <= MAX_PEEL_LAYERS; i++) {
      dualFrontLayerTextures.push(device.createTexture({
        size: [w, h],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      }));
      dualBackLayerTextures.push(device.createTexture({
        size: [w, h],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      }));
    }

    const dualPeelDepthBGL = dualPeelPeelPipeline.getBindGroupLayout(1);
    for (let i = 0; i < 2; i++) {
      dualPeelBindGroups.push(device.createBindGroup({
        layout: dualPeelDepthBGL,
        entries: [{ binding: 0, resource: dualPeelDepthTextures[i].createView() }]
      }));
    }

    const compositeBGL = dualPeelCompositePipeline.getBindGroupLayout(0);
    for (let i = 0; i <= MAX_PEEL_LAYERS; i++) {
      dualPeelFrontCompositeBindGroups.push(device.createBindGroup({
        layout: compositeBGL,
        entries: [{ binding: 0, resource: dualFrontLayerTextures[i].createView() }]
      }));
      dualPeelBackCompositeBindGroups.push(device.createBindGroup({
        layout: compositeBGL,
        entries: [{ binding: 0, resource: dualBackLayerTextures[i].createView() }]
      }));
    }

    dualPeelTexWidth = w;
    dualPeelTexHeight = h;
  }

  // Helpers
  function computeClipPlanes(camera) {
    const boundingSphereRadius = Math.sqrt(10);
    const { phi, theta, distance, center } = camera.state;
    const eye = [
      center[0] + distance * Math.cos(theta) * Math.cos(phi),
      center[1] + distance * Math.sin(theta),
      center[2] + distance * Math.cos(theta) * Math.sin(phi)
    ];
    const eyeDist = Math.sqrt(eye[0] * eye[0] + eye[1] * eye[1] + eye[2] * eye[2]);
    const smoothMax = (a, b, k) => 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + k * k));
    const near = smoothMax(eyeDist - boundingSphereRadius, 0.01, 0.5);
    const far = eyeDist + boundingSphereRadius;
    return { eye, near, far };
  }

  function writeUniforms(projection, view, eye, p, timestamp, startTime) {
    const uniformData = new ArrayBuffer(192);
    const f32 = new Float32Array(uniformData);
    const u32 = new Uint32Array(uniformData);
    f32.set(projection, 0);
    f32.set(view, 16);
    f32[32] = eye[0];
    f32[33] = eye[1];
    f32[34] = eye[2];
    f32[35] = devicePixelRatio;
    f32[36] = p.animate ? (timestamp - startTime) / 1000 : 0;
    f32[37] = p.opacity;
    f32[38] = p.cartoonEdgeWidth;
    f32[39] = p.cartoonEdgeOpacity;
    f32[40] = p.gridOpacity;
    f32[41] = p.gridWidth;
    f32[42] = 0;
    u32[43] = 0;
    const bg = p.bgColor || [1, 1, 1];
    f32[44] = bg[0];
    f32[45] = bg[1];
    f32[46] = bg[2];
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);
  }

  // Per-method render functions
  function renderFakeTransparency(encoder, colorTexture, w, h, p) {
    ensureDepthTexture(w, h);

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: msaaColorTexture.createView(),
        resolveTarget: colorTexture.createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'discard',
      }],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'discard',
      }
    });

    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.setIndexBuffer(indexBuffer, 'uint32');
    renderPass.setBindGroup(0, uniformBindGroup);

    if (p.passes.includes('Solid surface pass')) {
      renderPass.setPipeline(solidPipeline);
      renderPass.drawIndexed(indexCount);
    }
    if (p.passes.includes('Fake transparency pass')) {
      renderPass.setPipeline(wirePipeline);
      renderPass.drawIndexed(indexCount);
    }

    renderPass.end();
  }

  function renderOIT(encoder, colorTexture, w, h) {
    ensureOITTextures(w, h);

    const oitPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: msaaAccumTexture.createView(),
          resolveTarget: accumTexture.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'discard',
        },
        {
          view: msaaRevealTexture.createView(),
          resolveTarget: revealTexture.createView(),
          clearValue: { r: 1, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'discard',
        }
      ],
      depthStencilAttachment: {
        view: oitDepthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'discard',
      }
    });

    oitPass.setPipeline(oitPipeline);
    oitPass.setVertexBuffer(0, vertexBuffer);
    oitPass.setIndexBuffer(indexBuffer, 'uint32');
    oitPass.setBindGroup(0, uniformBindGroup);
    oitPass.drawIndexed(indexCount);
    oitPass.end();

    const compositePass = encoder.beginRenderPass({
      colorAttachments: [{
        view: colorTexture.createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store',
      }]
    });

    compositePass.setPipeline(oitCompositePipeline);
    compositePass.setBindGroup(0, oitCompositeBindGroup);
    compositePass.draw(3);
    compositePass.end();
  }

  function renderDepthPeeling(encoder, colorTexture, w, h, p) {
    ensurePeelTextures(w, h);

    const numLayers = p.peelLayers;

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

    // Peel passes
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

    // Composite passes (back to front)
    for (let layer = numLayers - 1; layer >= 0; layer--) {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: colorTexture.createView(),
          clearValue: layer === numLayers - 1 ? { r: 0, g: 0, b: 0, a: 0 } : undefined,
          loadOp: layer === numLayers - 1 ? 'clear' : 'load',
          storeOp: 'store',
        }]
      });
      pass.setPipeline(peelCompositePipeline);
      pass.setBindGroup(0, peelCompositeBindGroups[layer]);
      pass.draw(3);
      pass.end();
    }
  }

  function renderDualDepthPeeling(encoder, colorTexture, w, h, p) {
    ensureDualPeelTextures(w, h);

    const numPasses = p.peelLayers;

    // Pass 0: all fragments participate
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: dualPeelDepthTextures[0].createView(),
            clearValue: { r: -1, g: -1, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          },
          {
            view: dualFrontLayerTextures[0].createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          },
          {
            view: dualBackLayerTextures[0].createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          }
        ]
      });
      pass.setPipeline(dualPeelFirstPipeline);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.setIndexBuffer(indexBuffer, 'uint32');
      pass.setBindGroup(0, uniformBindGroup);
      pass.drawIndexed(indexCount);
      pass.end();
    }

    // Peel passes: read previous dual depth, peel inward
    for (let i = 1; i <= numPasses; i++) {
      const prevIdx = (i - 1) % 2;
      const currIdx = i % 2;

      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: dualPeelDepthTextures[currIdx].createView(),
            clearValue: { r: -1, g: -1, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          },
          {
            view: dualFrontLayerTextures[i].createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          },
          {
            view: dualBackLayerTextures[i].createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          }
        ]
      });
      pass.setPipeline(dualPeelPeelPipeline);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.setIndexBuffer(indexBuffer, 'uint32');
      pass.setBindGroup(0, uniformBindGroup);
      pass.setBindGroup(1, dualPeelBindGroups[prevIdx]);
      pass.drawIndexed(indexCount);
      pass.end();
    }

    // Composite back-to-front: back[1..N], then front[N..1]
    const compositeOrder = [];
    for (let i = 1; i <= numPasses; i++) {
      compositeOrder.push(dualPeelBackCompositeBindGroups[i]);
    }
    for (let i = numPasses; i >= 1; i--) {
      compositeOrder.push(dualPeelFrontCompositeBindGroups[i]);
    }

    for (let j = 0; j < compositeOrder.length; j++) {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: colorTexture.createView(),
          clearValue: j === 0 ? { r: 0, g: 0, b: 0, a: 0 } : undefined,
          loadOp: j === 0 ? 'clear' : 'load',
          storeOp: 'store',
        }]
      });
      pass.setPipeline(dualPeelCompositePipeline);
      pass.setBindGroup(0, compositeOrder[j]);
      pass.draw(3);
      pass.end();
    }
  }

  // Main render function
  function render(gpuContext, params, camera, w, h, timestamp, startTime, dirty) {
    const aspectRatio = w / h;
    const { view, projection, dirty: cameraDirty } = camera.update(aspectRatio);
    if (!cameraDirty && !dirty && !params.animate) return false;

    const { eye, near, far } = computeClipPlanes(camera);
    const rangeInv = 1 / (near - far);
    projection[10] = far * rangeInv;
    projection[14] = near * far * rangeInv;

    writeUniforms(projection, view, eye, params, timestamp, startTime);

    let colorTexture;
    try {
      colorTexture = gpuContext.getCurrentTexture();
    } catch (e) {
      return false;
    }

    const encoder = device.createCommandEncoder();

    if (params.method === 'Fake transparency') {
      renderFakeTransparency(encoder, colorTexture, w, h, params);
    } else if (params.method === 'Weighted blended OIT') {
      renderOIT(encoder, colorTexture, w, h);
    } else if (params.method === 'Depth peeling') {
      renderDepthPeeling(encoder, colorTexture, w, h, params);
    } else if (params.method === 'Dual depth peeling') {
      renderDualDepthPeeling(encoder, colorTexture, w, h, params);
    }

    device.queue.submit([encoder.finish()]);
    return true;
  }

  return { MSAA_SAMPLES, MAX_PEEL_LAYERS, initMesh, render };
}
