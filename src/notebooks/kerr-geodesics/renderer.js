// Renderer for Kerr geodesic visualization
// Uses webgpu-instanced-lines for geodesic curves,
// standard pipelines for horizon and ergosphere surfaces.

export function createRenderer(device, canvasFormat, createGPULines, shaders) {
  const { vertexShaderBody, fragmentShaderBody, horizonShaderCode, ergosphereShaderCode } = shaders;

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
  }

  return { setGeodesics, render, destroy };
}
