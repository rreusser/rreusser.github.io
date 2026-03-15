// Renderer for Kerr geodesic visualization
// Uses webgpu-instanced-lines for geodesic curves,
// standard pipelines for horizon and ergosphere surfaces.

export function createRenderer(device, canvasFormat, createGPULines, shaders) {
  const { vertexShaderBody, fragmentShaderBody, horizonShaderCode, ergosphereShaderCode, axesShaderCode, arrowShaderCode } = shaders;

  const sampleCount = 4;

  // --- Line renderer ---
  const gpuLines = createGPULines(device, {
    colorTargets: [{
      format: canvasFormat,
      blend: {
        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
      }
    }],
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'less' },
    multisample: { count: sampleCount },
    join: 'bevel',
    cap: 'round',
    vertexShaderBody,
    fragmentShaderBody,
  });

  // --- Surface pipelines ---
  function createSurfacePipeline(shaderCode, label) {
    const module = device.createShaderModule({ label, code: shaderCode });
    const bindGroupLayout = device.createBindGroupLayout({
      label: `${label}-bgl`,
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }]
    });
    const pipeline = device.createRenderPipeline({
      label,
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
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
      depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
      multisample: { count: sampleCount },
    });
    return { pipeline, bindGroupLayout };
  }

  const horizon = createSurfacePipeline(horizonShaderCode, 'horizon');
  const ergosphere = createSurfacePipeline(ergosphereShaderCode, 'ergosphere');

  // Uniform buffers for surfaces (projView 64 + eye 16 + color 16 + params 16 = 112 bytes)
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
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'less' },
    multisample: { count: sampleCount },
  });
  // Axes uniforms: projView 64 + color 16 + axisLength 16 = 96 bytes
  const axesUniformBuffer = device.createBuffer({ label: 'axes-uniforms', size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const axesBindGroup = device.createBindGroup({
    layout: axesBGL,
    entries: [{ binding: 0, resource: { buffer: axesUniformBuffer } }]
  });
  const _axesData = new Float32Array(24); // 96 / 4

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
    depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: sampleCount },
  });
  // Arrow uniforms: projView 64 + origin 16 + direction 16 + color 16 + params 16 = 128 bytes
  const arrowUniformBuffer = device.createBuffer({ label: 'arrow-uniforms', size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const arrowBindGroup = device.createBindGroup({
    layout: arrowBGL,
    entries: [{ binding: 0, resource: { buffer: arrowUniformBuffer } }]
  });
  const _arrowData = new Float32Array(32); // 128 / 4
  const ARROW_SHAFT_SEGS = 12;
  const ARROW_SHAFT_VERTS = ARROW_SHAFT_SEGS * 6;
  const ARROW_HEAD_VERTS = ARROW_SHAFT_SEGS * 3;
  const ARROW_TOTAL_VERTS = ARROW_SHAFT_VERTS + ARROW_HEAD_VERTS;

  // Arrow state
  let arrowOrigin = null;   // [x, y, z]
  let arrowDir = null;      // [dx, dy, dz]
  let arrowLength = 0;
  let arrowVisible = true;

  // Line uniform buffers
  const projViewBuffer = device.createBuffer({ label: 'line-proj-view', size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const lineUniformBuffer = device.createBuffer({ label: 'line-uniforms', size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  // Textures (created on first render / resize)
  let msaaTexture = null;
  let depthTexture = null;
  let currentWidth = 0;
  let currentHeight = 0;

  // Geodesic data
  let positionBuffer = null;
  let lineBindGroup = null;
  let totalVertexCount = 0;
  let lineCount = 0;
  let pointsPerLine = 0;

  function ensureTextures(width, height) {
    if (width === currentWidth && height === currentHeight) return;
    currentWidth = width;
    currentHeight = height;

    if (msaaTexture) msaaTexture.destroy();
    if (depthTexture) depthTexture.destroy();

    msaaTexture = device.createTexture({
      size: [width, height],
      format: canvasFormat,
      sampleCount,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    depthTexture = device.createTexture({
      size: [width, height],
      format: 'depth24plus',
      sampleCount,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  // Upload geodesic positions. geodesics is an array of Float32Array (each [x,y,z,...])
  function setGeodesics(geodesics) {
    if (positionBuffer) positionBuffer.destroy();

    // Find max points per geodesic
    pointsPerLine = 0;
    for (const g of geodesics) {
      pointsPerLine = Math.max(pointsPerLine, g.length / 3);
    }
    lineCount = geodesics.length;

    // Pack into vec4f buffer (x, y, z, 1.0) with uniform stride
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

    positionBuffer = device.createBuffer({
      label: 'geodesic-positions',
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(positionBuffer, 0, data);

    lineBindGroup = device.createBindGroup({
      layout: gpuLines.getBindGroupLayout(1),
      entries: [
        { binding: 0, resource: { buffer: positionBuffer } },
        { binding: 1, resource: { buffer: projViewBuffer } },
        { binding: 2, resource: { buffer: lineUniformBuffer } },
      ]
    });

    totalVertexCount = lineCount * (pointsPerLine + 1); // +1 for line breaks
  }

  const _lineData = new ArrayBuffer(16);
  const _lineU32 = new Uint32Array(_lineData);
  const _lineF32 = new Float32Array(_lineData);

  const _surfaceData = new Float32Array(28); // 112 / 4

  function render(gpuContext, params, camera, width, height) {
    ensureTextures(width, height);

    const aspectRatio = width / height;
    const { projView, eye } = camera.update(aspectRatio);

    const encoder = device.createCommandEncoder();

    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: msaaTexture.createView(),
        resolveTarget: gpuContext.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
      }],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      }
    });

    // Write surface uniforms
    function writeSurfaceUniforms(buffer, color, horizonParamsArr) {
      // projView: mat4x4f (16 floats)
      _surfaceData.set(new Float32Array(projView.buffer, projView.byteOffset, 16), 0);
      // eye: vec4f
      _surfaceData[16] = eye[0]; _surfaceData[17] = eye[1]; _surfaceData[18] = eye[2]; _surfaceData[19] = 1.0;
      // color: vec4f
      _surfaceData[20] = color[0]; _surfaceData[21] = color[1]; _surfaceData[22] = color[2]; _surfaceData[23] = color[3];
      // horizonParams: vec4f
      _surfaceData[24] = horizonParamsArr[0]; _surfaceData[25] = horizonParamsArr[1]; _surfaceData[26] = 0; _surfaceData[27] = 0;
      device.queue.writeBuffer(buffer, 0, _surfaceData);
    }

    const rPlus = params.M + Math.sqrt(params.M * params.M - params.a * params.a);

    // Draw ergosphere (translucent)
    if (params.showErgosphere) {
      const ec = params.surfaceColor || [0.5, 0.5, 0.5];
      writeSurfaceUniforms(ergosphereUniformBuffer, [ec[0], ec[1], ec[2], params.surfaceOpacity * 0.4], [params.M, params.a]);
      pass.setPipeline(ergosphere.pipeline);
      pass.setBindGroup(0, ergosphereBindGroup);
      pass.draw(48 * 96 * 6);
    }

    // Draw horizon
    if (params.showHorizon) {
      const hc = params.surfaceColor || [0.5, 0.5, 0.5];
      writeSurfaceUniforms(horizonUniformBuffer, [hc[0], hc[1], hc[2], params.surfaceOpacity], [rPlus, params.a]);
      pass.setPipeline(horizon.pipeline);
      pass.setBindGroup(0, horizonBindGroup);
      pass.draw(32 * 64 * 6);
    }

    // Draw axes
    if (params.showAxes !== false) {
      _axesData.set(new Float32Array(projView.buffer, projView.byteOffset, 16), 0);
      const axisAlpha = params.surfaceOpacity * 0.8;
      const ac = params.surfaceColor || [0.5, 0.5, 0.5];
      _axesData[16] = ac[0]; _axesData[17] = ac[1]; _axesData[18] = ac[2]; _axesData[19] = axisAlpha;
      _axesData[20] = 25; // axis length
      device.queue.writeBuffer(axesUniformBuffer, 0, _axesData);
      pass.setPipeline(axesPipeline);
      pass.setBindGroup(0, axesBindGroup);
      pass.draw(6);
    }

    // Draw velocity arrow
    if (arrowVisible && arrowOrigin && arrowDir && arrowLength > 0.01) {
      _arrowData.set(new Float32Array(projView.buffer, projView.byteOffset, 16), 0);
      _arrowData[16] = arrowOrigin[0]; _arrowData[17] = arrowOrigin[1]; _arrowData[18] = arrowOrigin[2]; _arrowData[19] = 0;
      _arrowData[20] = arrowDir[0]; _arrowData[21] = arrowDir[1]; _arrowData[22] = arrowDir[2]; _arrowData[23] = arrowLength;
      // color: bright orange
      _arrowData[24] = 1.0; _arrowData[25] = 0.5; _arrowData[26] = 0.1; _arrowData[27] = 1.0;
      // params: shaftRadius, headRadius, headFraction
      _arrowData[28] = 0.12; _arrowData[29] = 0.3; _arrowData[30] = 0.25; _arrowData[31] = 0;
      device.queue.writeBuffer(arrowUniformBuffer, 0, _arrowData);
      pass.setPipeline(arrowPipeline);
      pass.setBindGroup(0, arrowBindGroup);
      pass.draw(ARROW_TOTAL_VERTS);
    }

    // Draw geodesic lines
    if (lineBindGroup && totalVertexCount > 0) {
      device.queue.writeBuffer(projViewBuffer, 0, projView);

      _lineU32[0] = pointsPerLine;
      _lineU32[1] = lineCount;
      _lineF32[2] = params.lineWidth * (devicePixelRatio || 1);
      _lineF32[3] = 0;
      device.queue.writeBuffer(lineUniformBuffer, 0, _lineData);

      const dpr = devicePixelRatio || 1;
      const lineDrawProps = {
        vertexCount: totalVertexCount,
        width: params.lineWidth * dpr,
        resolution: [width, height],
      };
      gpuLines.updateUniforms(lineDrawProps);
      gpuLines.draw(pass, { ...lineDrawProps, skipUniformUpdate: true }, [lineBindGroup]);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  function destroy() {
    gpuLines.destroy();
    if (positionBuffer) positionBuffer.destroy();
    if (msaaTexture) msaaTexture.destroy();
    if (depthTexture) depthTexture.destroy();
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
