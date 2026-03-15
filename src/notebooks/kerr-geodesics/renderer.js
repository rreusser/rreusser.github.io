// Renderer for Kerr geodesic visualization
// Uses depth peeling for order-independent transparency of surfaces,
// with depth-interleaved compositing against geodesic lines.

export function createRenderer(device, canvasFormat, createGPULines, shaders) {
  const { vertexShaderBody, fragmentShaderBody, horizonShaderCode, ergosphereShaderCode, axesShaderCode, arrowShaderCode, compositeShaderCode } = shaders;

  const PEEL_LAYERS = 3;
  const depthFormat = 'depth32float';

  // --- Line renderer (no MSAA — lines have SDF-based antialiasing) ---
  const gpuLines = createGPULines(device, {
    colorTargets: [{
      format: canvasFormat,
      blend: {
        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
      }
    }],
    depthStencil: { format: depthFormat, depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: 1 },
    join: 'bevel',
    cap: 'none',
    vertexShaderBody,
    fragmentShaderBody,
  });

  // --- Peel depth bind group layout (used by surfaces at group 1) ---
  const peelDepthBGL = device.createBindGroupLayout({
    label: 'peel-depth-bgl',
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      texture: { sampleType: 'depth', viewDimension: '2d', multisampled: false }
    }]
  });

  // --- Surface pipelines (with peel depth at group 1) ---
  function createSurfacePipeline(shaderCode, label) {
    const module = device.createShaderModule({ label, code: shaderCode });
    const uniformBGL = device.createBindGroupLayout({
      label: `${label}-bgl`,
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }]
    });
    const pipeline = device.createRenderPipeline({
      label,
      layout: device.createPipelineLayout({ bindGroupLayouts: [uniformBGL, peelDepthBGL] }),
      vertex: { module, entryPoint: 'vs' },
      fragment: {
        module, entryPoint: 'fs',
        targets: [{
          format: canvasFormat,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
          }
        }]
      },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: { format: depthFormat, depthWriteEnabled: true, depthCompare: 'less' },
      multisample: { count: 1 },
    });
    return { pipeline, bindGroupLayout: uniformBGL };
  }

  const horizon = createSurfacePipeline(horizonShaderCode, 'horizon');
  const ergosphere = createSurfacePipeline(ergosphereShaderCode, 'ergosphere');

  const horizonUniformBuffer = device.createBuffer({ label: 'horizon-uniforms', size: 112, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const ergosphereUniformBuffer = device.createBuffer({ label: 'ergosphere-uniforms', size: 112, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const horizonBindGroup = device.createBindGroup({
    layout: horizon.bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: horizonUniformBuffer } }]
  });
  const ergosphereBindGroup = device.createBindGroup({
    layout: ergosphere.bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: ergosphereUniformBuffer } }]
  });

  // --- Axes pipeline ---
  const axesModule = device.createShaderModule({ label: 'axes', code: axesShaderCode });
  const axesBGL = device.createBindGroupLayout({
    label: 'axes-bgl',
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }]
  });
  const axesPipeline = device.createRenderPipeline({
    label: 'axes',
    layout: device.createPipelineLayout({ bindGroupLayouts: [axesBGL] }),
    vertex: { module: axesModule, entryPoint: 'vs' },
    fragment: {
      module: axesModule, entryPoint: 'fs',
      targets: [{
        format: canvasFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
        }
      }]
    },
    primitive: { topology: 'line-list' },
    depthStencil: { format: depthFormat, depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: 1 },
  });
  const axesUniformBuffer = device.createBuffer({ label: 'axes-uniforms', size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const axesBindGroup = device.createBindGroup({
    layout: axesBGL,
    entries: [{ binding: 0, resource: { buffer: axesUniformBuffer } }]
  });
  const _axesData = new Float32Array(24);

  // --- Arrow pipeline ---
  const arrowModule = device.createShaderModule({ label: 'arrow', code: arrowShaderCode });
  const arrowBGL = device.createBindGroupLayout({
    label: 'arrow-bgl',
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }]
  });
  const arrowPipeline = device.createRenderPipeline({
    label: 'arrow',
    layout: device.createPipelineLayout({ bindGroupLayouts: [arrowBGL] }),
    vertex: { module: arrowModule, entryPoint: 'vs' },
    fragment: {
      module: arrowModule, entryPoint: 'fs',
      targets: [{
        format: canvasFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
        }
      }]
    },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: depthFormat, depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: 1 },
  });
  const arrowUniformBuffer = device.createBuffer({ label: 'arrow-uniforms', size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const arrowBindGroup = device.createBindGroup({
    layout: arrowBGL,
    entries: [{ binding: 0, resource: { buffer: arrowUniformBuffer } }]
  });
  const _arrowData = new Float32Array(32);
  const ARROW_SHAFT_SEGS = 12;
  const ARROW_SHAFT_VERTS = ARROW_SHAFT_SEGS * 6;
  const ARROW_HEAD_VERTS = ARROW_SHAFT_SEGS * 3;
  const ARROW_TOTAL_VERTS = ARROW_SHAFT_VERTS + ARROW_HEAD_VERTS;

  let arrowOrigin = null;
  let arrowDir = null;
  let arrowLength = 0;
  let arrowVisible = true;

  // --- Compositing pipeline (depth-interleaved) ---
  const compositeModule = device.createShaderModule({ label: 'composite', code: compositeShaderCode });
  const compositeBGL = device.createBindGroupLayout({
    label: 'composite-bgl',
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth', viewDimension: '2d' } },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth', viewDimension: '2d' } },
      { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth', viewDimension: '2d' } },
      { binding: 6, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d' } },
      { binding: 7, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth', viewDimension: '2d' } },
    ]
  });
  const compositePipeline = device.createRenderPipeline({
    label: 'composite',
    layout: device.createPipelineLayout({ bindGroupLayouts: [compositeBGL] }),
    vertex: { module: compositeModule, entryPoint: 'vs' },
    fragment: {
      module: compositeModule, entryPoint: 'fs',
      targets: [{ format: canvasFormat }]
    },
    primitive: { topology: 'triangle-list' },
    multisample: { count: 1 },
  });

  // Line uniform buffers
  const projViewBuffer = device.createBuffer({ label: 'line-proj-view', size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const lineUniformBuffer = device.createBuffer({ label: 'line-uniforms', size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  // --- Dynamic textures ---
  // 4 peel depth textures: [init=0, pass0_out, pass1_out, pass2_out]
  let peelDepthTextures = [null, null, null, null];
  let peelDepthBindGroups = [null, null, null]; // for reading [0], [1], [2]
  let peelLayerTextures = [];  // 3 color textures
  let lineColorTexture = null;
  let lineDepthTexture = null;
  let compositeBindGroup = null;
  let currentWidth = 0;
  let currentHeight = 0;

  // Geodesic data
  const MAX_POINTS = 20001;
  const MAX_LINES = 4;
  const positionBuffer = device.createBuffer({
    label: 'geodesic-positions',
    size: MAX_LINES * MAX_POINTS * 4 * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const lineBindGroup = device.createBindGroup({
    layout: gpuLines.getBindGroupLayout(1),
    entries: [
      { binding: 0, resource: { buffer: positionBuffer } },
      { binding: 1, resource: { buffer: projViewBuffer } },
      { binding: 2, resource: { buffer: lineUniformBuffer } },
    ]
  });
  let totalVertexCount = 0;
  let lineCount = 0;
  let pointsPerLine = 0;

  function ensureTextures(width, height) {
    if (width === currentWidth && height === currentHeight) return;
    currentWidth = width;
    currentHeight = height;

    // Destroy old
    for (const t of peelDepthTextures) if (t) t.destroy();
    for (const t of peelLayerTextures) if (t) t.destroy();
    if (lineColorTexture) lineColorTexture.destroy();
    if (lineDepthTexture) lineDepthTexture.destroy();

    // 4 peel depth textures (no ping-pong — keep each pass's depth for compositing)
    for (let i = 0; i < 4; i++) {
      peelDepthTextures[i] = device.createTexture({
        label: `peel-depth-${i}`,
        size: [width, height],
        format: depthFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
    }

    // 3 peel layer color textures
    peelLayerTextures = [];
    for (let i = 0; i < PEEL_LAYERS; i++) {
      peelLayerTextures.push(device.createTexture({
        label: `peel-layer-${i}`,
        size: [width, height],
        format: canvasFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      }));
    }

    // Line offscreen textures
    lineColorTexture = device.createTexture({
      label: 'line-color',
      size: [width, height],
      format: canvasFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    lineDepthTexture = device.createTexture({
      label: 'line-depth',
      size: [width, height],
      format: depthFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    // Peel depth bind groups (for reading in shader peel test)
    for (let i = 0; i < 3; i++) {
      peelDepthBindGroups[i] = device.createBindGroup({
        layout: peelDepthBGL,
        entries: [{ binding: 0, resource: peelDepthTextures[i].createView() }]
      });
    }

    // Composite bind group: 3 layer colors + 3 surface depths + line color + line depth
    compositeBindGroup = device.createBindGroup({
      layout: compositeBGL,
      entries: [
        { binding: 0, resource: peelLayerTextures[0].createView() },
        { binding: 1, resource: peelLayerTextures[1].createView() },
        { binding: 2, resource: peelLayerTextures[2].createView() },
        { binding: 3, resource: peelDepthTextures[1].createView() },  // pass 0 output depth
        { binding: 4, resource: peelDepthTextures[2].createView() },  // pass 1 output depth
        { binding: 5, resource: peelDepthTextures[3].createView() },  // pass 2 output depth
        { binding: 6, resource: lineColorTexture.createView() },
        { binding: 7, resource: lineDepthTexture.createView() },
      ]
    });
  }

  function setGeodesics(geodesics) {
    pointsPerLine = 0;
    for (const g of geodesics) {
      pointsPerLine = Math.max(pointsPerLine, g.length / 3);
    }
    lineCount = geodesics.length;

    const data = new Float32Array(lineCount * pointsPerLine * 4);
    for (let i = 0; i < lineCount; i++) {
      const g = geodesics[i];
      const nPts = g.length / 3;
      for (let j = 0; j < pointsPerLine; j++) {
        const srcIdx = Math.min(j, nPts - 1);
        const dstIdx = (i * pointsPerLine + j) * 4;
        data[dstIdx] = g[srcIdx * 3];
        data[dstIdx + 1] = g[srcIdx * 3 + 1];
        data[dstIdx + 2] = g[srcIdx * 3 + 2];
        data[dstIdx + 3] = 1.0;
      }
    }

    device.queue.writeBuffer(positionBuffer, 0, data);
    totalVertexCount = lineCount * (pointsPerLine + 1);
  }

  const _lineData = new ArrayBuffer(16);
  const _lineU32 = new Uint32Array(_lineData);
  const _lineF32 = new Float32Array(_lineData);
  const _surfaceData = new Float32Array(28);

  function render(gpuContext, params, camera, width, height) {
    ensureTextures(width, height);

    const aspectRatio = width / height;
    const { projView, eye } = camera.update(aspectRatio);

    const encoder = device.createCommandEncoder();

    function writeSurfaceUniforms(buffer, color, horizonParamsArr) {
      _surfaceData.set(new Float32Array(projView.buffer, projView.byteOffset, 16), 0);
      _surfaceData[16] = eye[0]; _surfaceData[17] = eye[1]; _surfaceData[18] = eye[2]; _surfaceData[19] = 1.0;
      _surfaceData[20] = color[0]; _surfaceData[21] = color[1]; _surfaceData[22] = color[2]; _surfaceData[23] = color[3];
      _surfaceData[24] = horizonParamsArr[0]; _surfaceData[25] = horizonParamsArr[1]; _surfaceData[26] = 0; _surfaceData[27] = 0;
      device.queue.writeBuffer(buffer, 0, _surfaceData);
    }

    const rPlus = params.M + Math.sqrt(params.M * params.M - params.a * params.a);

    if (params.showHorizon) {
      const hc = params.surfaceColor || [0.5, 0.5, 0.5];
      writeSurfaceUniforms(horizonUniformBuffer, [hc[0], hc[1], hc[2], params.surfaceOpacity * 2.5], [rPlus, params.a]);
    }
    if (params.showErgosphere) {
      const ec = params.surfaceColor || [0.5, 0.5, 0.5];
      writeSurfaceUniforms(ergosphereUniformBuffer, [ec[0], ec[1], ec[2], params.surfaceOpacity * 1.5], [params.M, params.a]);
    }

    // ============================================================
    // PHASE 1: Depth peel surfaces (3 passes)
    // peelDepthTextures: [init=0] → pass reads [i], writes depth to [i+1]
    // ============================================================
    // Clear peelDepthTextures[0] to 0.0 (initial: all fragments pass peel test)
    {
      const clearPass = encoder.beginRenderPass({
        colorAttachments: [],
        depthStencilAttachment: {
          view: peelDepthTextures[0].createView(),
          depthClearValue: 0.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        }
      });
      clearPass.end();
    }

    for (let layer = 0; layer < PEEL_LAYERS; layer++) {
      const peelPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: peelLayerTextures[layer].createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
        }],
        depthStencilAttachment: {
          view: peelDepthTextures[layer + 1].createView(),
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        }
      });

      if (params.showHorizon) {
        peelPass.setPipeline(horizon.pipeline);
        peelPass.setBindGroup(0, horizonBindGroup);
        peelPass.setBindGroup(1, peelDepthBindGroups[layer]);
        peelPass.draw(32 * 64 * 6);
      }

      if (params.showErgosphere) {
        peelPass.setPipeline(ergosphere.pipeline);
        peelPass.setBindGroup(0, ergosphereBindGroup);
        peelPass.setBindGroup(1, peelDepthBindGroups[layer]);
        peelPass.draw(48 * 96 * 6);
      }

      peelPass.end();
    }

    // ============================================================
    // PHASE 2: Render lines + axes to offscreen texture
    // ============================================================
    const linePass = encoder.beginRenderPass({
      colorAttachments: [{
        view: lineColorTexture.createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
      }],
      depthStencilAttachment: {
        view: lineDepthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      }
    });

    if (params.showAxes !== false) {
      _axesData.set(new Float32Array(projView.buffer, projView.byteOffset, 16), 0);
      _axesData[16] = 0.5; _axesData[17] = 0.5; _axesData[18] = 0.5; _axesData[19] = 0.6;
      _axesData[20] = 25;
      device.queue.writeBuffer(axesUniformBuffer, 0, _axesData);
      linePass.setPipeline(axesPipeline);
      linePass.setBindGroup(0, axesBindGroup);
      linePass.draw(6);
    }

    if (totalVertexCount > 0) {
      device.queue.writeBuffer(projViewBuffer, 0, projView);

      _lineU32[0] = pointsPerLine;
      _lineU32[1] = lineCount;
      _lineF32[2] = params.lineWidth * (devicePixelRatio || 1);
      _lineF32[3] = params.isDark ? 1.0 : 0.0;
      device.queue.writeBuffer(lineUniformBuffer, 0, _lineData);

      const dpr = devicePixelRatio || 1;
      const lineDrawProps = {
        vertexCount: totalVertexCount,
        width: params.lineWidth * dpr,
        resolution: [width, height],
      };
      gpuLines.updateUniforms(lineDrawProps);
      gpuLines.draw(linePass, { ...lineDrawProps, skipUniformUpdate: true }, [lineBindGroup]);
    }

    linePass.end();

    // ============================================================
    // PHASE 3: Composite — sort surface layers + lines by depth
    // ============================================================
    const canvasView = gpuContext.getCurrentTexture().createView();

    const compositePass = encoder.beginRenderPass({
      colorAttachments: [{
        view: canvasView,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
      }]
    });
    compositePass.setPipeline(compositePipeline);
    compositePass.setBindGroup(0, compositeBindGroup);
    compositePass.draw(3);
    compositePass.end();

    // ============================================================
    // PHASE 4: Arrow on top (separate pass, depth cleared)
    // ============================================================
    if (arrowVisible && arrowOrigin && arrowDir && arrowLength > 0.01) {
      // Scale arrow geometry to maintain consistent screen size
      const dx = arrowOrigin[0] - eye[0], dy = arrowOrigin[1] - eye[1], dz = arrowOrigin[2] - eye[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const s = dist / 35; // normalized to reference distance
      _arrowData.set(new Float32Array(projView.buffer, projView.byteOffset, 16), 0);
      _arrowData[16] = arrowOrigin[0]; _arrowData[17] = arrowOrigin[1]; _arrowData[18] = arrowOrigin[2]; _arrowData[19] = 0;
      _arrowData[20] = arrowDir[0]; _arrowData[21] = arrowDir[1]; _arrowData[22] = arrowDir[2]; _arrowData[23] = arrowLength;
      _arrowData[24] = 1.0; _arrowData[25] = 0.5; _arrowData[26] = 0.1; _arrowData[27] = 1.0;
      _arrowData[28] = 0.12 * s; _arrowData[29] = 0.3 * s; _arrowData[30] = 0.15; _arrowData[31] = 0;
      device.queue.writeBuffer(arrowUniformBuffer, 0, _arrowData);

      const arrowPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: canvasView,
          loadOp: 'load',
          storeOp: 'store',
        }],
        depthStencilAttachment: {
          view: lineDepthTexture.createView(),
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        }
      });
      arrowPass.setPipeline(arrowPipeline);
      arrowPass.setBindGroup(0, arrowBindGroup);
      arrowPass.draw(ARROW_TOTAL_VERTS);
      arrowPass.end();
    }

    device.queue.submit([encoder.finish()]);
  }

  function destroy() {
    gpuLines.destroy();
    positionBuffer.destroy();
    for (const t of peelDepthTextures) if (t) t.destroy();
    for (const t of peelLayerTextures) if (t) t.destroy();
    if (lineColorTexture) lineColorTexture.destroy();
    if (lineDepthTexture) lineDepthTexture.destroy();
    horizonUniformBuffer.destroy();
    ergosphereUniformBuffer.destroy();
    projViewBuffer.destroy();
    lineUniformBuffer.destroy();
    axesUniformBuffer.destroy();
    arrowUniformBuffer.destroy();
  }

  function setArrow(origin, direction, visible = true) {
    arrowOrigin = origin;
    arrowDir = direction;
    arrowLength = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2);
    arrowVisible = visible;
  }

  function getArrowVertexCount() {
    return ARROW_TOTAL_VERTS;
  }

  return { setGeodesics, setArrow, getArrowVertexCount, render, destroy };
}
