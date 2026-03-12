import { createMeshSurface } from './mesh-surface.js';

const PI = Math.PI;
const FUDGE = 1.0 - 1e-4;
const MAX_PEEL_LAYERS = 8;
const UNIFORM_BUFFER_SIZE = 240;

export function createRenderer(device, canvasFormat, shaderCodes, resolution = 200) {
  const peelModule = device.createShaderModule({ label: 'peel-shader', code: shaderCodes.peel });
  const compositeModule = device.createShaderModule({ label: 'peel-composite-shader', code: shaderCodes.peelComposite });

  const uniformBuffer = device.createBuffer({
    size: UNIFORM_BUFFER_SIZE,
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
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } }]
  });

  const firstPipelineLayout = device.createPipelineLayout({
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

  const peelFirstPipeline = device.createRenderPipeline({
    layout: firstPipelineLayout,
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

  // Peel texture state
  let peelDepthTextures = [];
  let layerTextures = [];
  let peelBindGroups = [];
  let peelCompositeBindGroups = [];
  let peelTexWidth = 0;
  let peelTexHeight = 0;

  // Create mesh
  const mesh = createMeshSurface({
    resolution: [resolution, resolution],
    uDomain: [-PI * 0.5 * FUDGE, PI * 0.5 * FUDGE],
    vDomain: [-PI * (1 + 0.05 / resolution), PI * (1 + 0.05 / resolution)],
  });

  // Upload mesh data
  vertexBuffer = device.createBuffer({
    size: mesh.positions.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, mesh.positions);

  const indexData = new Uint32Array(mesh.cells);
  indexCount = indexData.length;
  indexBuffer = device.createBuffer({
    size: indexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, indexData);

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

    const compositeBGL = peelCompositePipeline.getBindGroupLayout(0);
    for (let i = 0; i < MAX_PEEL_LAYERS; i++) {
      peelCompositeBindGroups.push(device.createBindGroup({
        layout: compositeBGL,
        entries: [{ binding: 0, resource: layerTextures[i].createView() }]
      }));
    }

    peelTexWidth = w;
    peelTexHeight = h;
  }

  function writeUniforms(projection, view, eye, params) {
    const uniformData = new ArrayBuffer(UNIFORM_BUFFER_SIZE);
    const f32 = new Float32Array(uniformData);

    // Copy projection and patch for WebGPU [0,1] depth range
    f32.set(projection, 0);
    const near = params.near;
    const far = params.far;
    const rangeInv = 1 / (near - far);
    f32[10] = far * rangeInv;
    f32[14] = near * far * rangeInv;

    f32.set(view, 16);
    f32[32] = eye[0];
    f32[33] = eye[1];
    f32[34] = eye[2];
    f32[35] = params.pixelRatio;
    f32[36] = params.t;
    f32[37] = params.q;
    f32[38] = params.Qinv;
    f32[39] = params.xi;
    f32[40] = params.eta;
    f32[41] = params.alpha;
    f32[42] = params.beta;
    f32[43] = params.lambda;
    f32[44] = params.omega;
    f32[45] = params.n;
    f32[46] = params.scale;
    f32[47] = params.translation;
    f32[48] = params.rotation;
    f32[49] = params.stereo;
    f32[50] = params.posClip;
    f32[51] = params.negClip;
    f32[52] = params.fatEdge;
    f32[53] = params.strips;
    f32[54] = params.shittyEversion;
    f32[55] = params.section;
    f32[56] = params.opacity !== undefined ? params.opacity : 0.85;

    device.queue.writeBuffer(uniformBuffer, 0, uniformData);
  }

  function renderDepthPeeling(encoder, colorTexture, w, h, numLayers) {
    ensurePeelTextures(w, h);

    numLayers = Math.min(numLayers, MAX_PEEL_LAYERS);

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

    // Composite back-to-front
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

  function render(gpuContext, params, camera, w, h) {
    const aspectRatio = w / h;
    const { view, projection, dirty: cameraDirty } = camera.update(aspectRatio);

    const { phi, theta, distance, center } = camera.state;
    const eye = [
      center[0] + distance * Math.cos(theta) * Math.cos(phi),
      center[1] + distance * Math.sin(theta),
      center[2] + distance * Math.cos(theta) * Math.sin(phi)
    ];

    // Compute tight clip planes from camera distance and a conservative bounding sphere
    const boundingSphereRadius = 4.0;
    const eyeDist = Math.sqrt(eye[0] * eye[0] + eye[1] * eye[1] + eye[2] * eye[2]);
    const smoothMax = (a, b, k) => 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + k * k));
    params = { ...params,
      near: smoothMax(eyeDist - boundingSphereRadius, 0.01, 0.5),
      far: eyeDist + boundingSphereRadius
    };

    writeUniforms(projection, view, eye, params);

    let colorTexture;
    try {
      colorTexture = gpuContext.getCurrentTexture();
    } catch (e) {
      return false;
    }

    const encoder = device.createCommandEncoder();
    const peelLayers = params.peelLayers !== undefined ? params.peelLayers : 4;
    renderDepthPeeling(encoder, colorTexture, w, h, peelLayers);
    device.queue.submit([encoder.finish()]);
    return true;
  }

  return { render };
}
