const dotShaderCode = /* wgsl */`
struct DotUniforms {
  projection: mat4x4f,
  view: mat4x4f,
  worldPos: vec3f,
  radius: f32,       // fill radius in pixels
  pixelRatio: f32,
  screenWidth: f32,
  screenHeight: f32,
  visible: f32,      // 0 = hidden, 1 = visible
};

@group(0) @binding(0) var<uniform> u: DotUniforms;
@group(1) @binding(0) var prevDepthTex: texture_depth_2d;

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) offset: vec2f, // pixel offset from center, in pixels
};

@vertex
fn vs(@builtin(vertex_index) i: u32) -> VSOut {
  var out: VSOut;
  if (u.visible < 0.5) {
    out.position = vec4f(1e9, 1e9, 1e9, 1.0);
    out.offset = vec2f(0.0);
    return out;
  }

  let clip = u.projection * u.view * vec4f(u.worldPos, 1.0);
  let ndc = clip.xy / clip.w;

  // Quad big enough for fill + stroke (expand by strokeWidth px)
  let strokeWidth = 2.0;
  let r = (u.radius + strokeWidth) * u.pixelRatio;

  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f( 1.0, -1.0), vec2f(1.0,  1.0), vec2f(-1.0, 1.0)
  );
  let c = corners[i];
  let offsetNDC = vec2f(c.x * 2.0 * r / u.screenWidth, c.y * 2.0 * r / u.screenHeight);

  out.position = vec4f(ndc + offsetNDC, clip.z / clip.w, 1.0);
  out.offset = c * r;
  return out;
}

fn dotColor(in: VSOut) -> vec4f {
  let dist = length(in.offset);
  let pr = u.pixelRatio;
  let fillR  = u.radius * pr;
  let strokeW = 2.0 * pr;
  let outerR = fillR + strokeW;

  if (dist > outerR) { discard; }

  // Stroke ring: dark, full opacity
  let strokeAlpha = smoothstep(outerR, outerR - pr, dist) * (1.0 - smoothstep(fillR, fillR - pr, dist));
  // Fill: white, antialiased
  let fillAlpha = smoothstep(fillR, fillR - pr, dist);

  let color = mix(vec3f(0.08), vec3f(1.0), fillAlpha / max(fillAlpha + strokeAlpha, 0.001));
  let alpha = fillAlpha + strokeAlpha;
  return vec4f(color * alpha, alpha);
}

@fragment
fn fsFirst(in: VSOut) -> @location(0) vec4f {
  return dotColor(in);
}

@fragment
fn fsPeel(in: VSOut) -> @location(0) vec4f {
  let prevDepth = textureLoad(prevDepthTex, vec2i(in.position.xy), 0);
  if (in.position.z <= prevDepth + 1e-5) { discard; }
  return dotColor(in);
}
`;

export function createRenderer(device, canvasFormat, shaderCodes) {
  const MAX_PEEL_LAYERS = 8;

  const peelModule = device.createShaderModule({ label: 'costa-peel-shader', code: shaderCodes.peel });
  const compositeModule = device.createShaderModule({ label: 'costa-composite-shader', code: shaderCodes.composite });
  const dotModule = device.createShaderModule({ label: 'costa-dot-shader', code: dotShaderCode });

  // Uniform buffer: 2*mat4(128) + vec3f+pad(16) + 8*f32(32) = 176, padded to 192
  const UNIFORM_SIZE = 192;

  // Dot uniform buffer: 2*mat4(128) + vec3f+f32(16) + 4*f32(16) = 160 bytes
  const DOT_UNIFORM_SIZE = 160;

  const uniformBuffer = device.createBuffer({
    size: UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const dotUniformBuffer = device.createBuffer({
    size: DOT_UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const dotUniformBGL = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }]
  });
  const dotDepthBGL = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth' } }]
  });
  const dotBindGroup = device.createBindGroup({
    layout: dotUniformBGL,
    entries: [{ binding: 0, resource: { buffer: dotUniformBuffer } }]
  });

  const dotBlendTarget = { format: 'rgba8unorm', blend: {
    color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one',       dstFactor: 'one-minus-src-alpha', operation: 'add' },
  }};
  const dotDepthStencil = { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'less' };

  const dotFirstPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [dotUniformBGL] }),
    vertex: { module: dotModule, entryPoint: 'vs', buffers: [] },
    fragment: { module: dotModule, entryPoint: 'fsFirst', targets: [dotBlendTarget] },
    primitive: { topology: 'triangle-list' },
    depthStencil: dotDepthStencil,
  });

  const dotPeelPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [dotUniformBGL, dotDepthBGL] }),
    vertex: { module: dotModule, entryPoint: 'vs', buffers: [] },
    fragment: { module: dotModule, entryPoint: 'fsPeel', targets: [dotBlendTarget] },
    primitive: { topology: 'triangle-list' },
    depthStencil: dotDepthStencil,
  });

  // Dot depth bind groups (one per peelDepthTexture, created after ensureTextures)
  let dotDepthBindGroups = [];

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

  // Pre-allocate uniform staging buffers to avoid per-frame GC pressure
  const uniformData = new ArrayBuffer(UNIFORM_SIZE);
  const uniformF32 = new Float32Array(uniformData);
  const dotData = new ArrayBuffer(DOT_UNIFORM_SIZE);
  const dotF32 = new Float32Array(dotData);

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
    dotDepthBindGroups = [];

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
      dotDepthBindGroups.push(device.createBindGroup({
        layout: dotDepthBGL,
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

    uniformF32.set(projection, 0);       // 0-15
    uniformF32.set(view, 16);            // 16-31
    uniformF32[32] = eye[0];
    uniformF32[33] = eye[1];
    uniformF32[34] = eye[2];
    uniformF32[35] = devicePixelRatio;
    uniformF32[36] = params.opacity;
    uniformF32[37] = params.cartoonEdgeWidth;
    uniformF32[38] = params.cartoonEdgeOpacity;
    uniformF32[39] = params.gridOpacity;
    uniformF32[40] = params.gridWidth;
    uniformF32[41] = params.specular;
    uniformF32[42] = params.clipRadius;
    uniformF32[43] = params.domainColor;
    uniformF32[44] = params.uvClipRadius;
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    let colorTexture;
    try {
      colorTexture = gpuContext.getCurrentTexture();
    } catch (e) {
      return false;
    }

    // Upload dot uniforms
    const hp = params.hoverPoint;
    const dotActive = hp && isFinite(hp[0]) && isFinite(hp[1]) && isFinite(hp[2]) ? 1 : 0;
    dotF32.set(projection, 0);
    dotF32.set(view, 16);
    dotF32[32] = dotActive ? hp[0] : 0;
    dotF32[33] = dotActive ? hp[1] : 0;
    dotF32[34] = dotActive ? hp[2] : 0;
    dotF32[35] = 7.0;            // fill radius in pixels
    dotF32[36] = devicePixelRatio;
    dotF32[37] = w;
    dotF32[38] = h;
    dotF32[39] = dotActive;
    device.queue.writeBuffer(dotUniformBuffer, 0, dotData);

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
      // Dot in first layer
      pass.setPipeline(dotFirstPipeline);
      pass.setBindGroup(0, dotBindGroup);
      pass.draw(6);
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
      // Dot in each peel layer
      pass.setPipeline(dotPeelPipeline);
      pass.setBindGroup(0, dotBindGroup);
      pass.setBindGroup(1, dotDepthBindGroups[prevDepthIdx]);
      pass.draw(6);
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
