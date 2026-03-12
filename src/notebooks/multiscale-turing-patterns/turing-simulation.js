// Multi-Scale Turing Pattern Simulation
// Extracted from index.html for cleaner notebook structure

import { executeFFT2D, executeVec4FFT2D } from './lib/webgpu-fft/fft.js';

/**
 * Create the scale parameters input UI component
 */
export function createScaleParamsInput(numScales, gridSizeState, existingParams = []) {
  const container = document.createElement('div');
  container.className = 'scale-params-container symmetry-hidden';

  // Add CSS for label toggling based on expandable state
  const style = document.createElement('style');
  style.textContent = `
    .scale-params-container .label-full { display: inline; }
    .scale-params-container .label-short { display: none; }
    .expandable-expanded .scale-params-container .label-full { display: none; }
    .expandable-expanded .scale-params-container .label-short { display: inline; }
    .expandable-expanded .scale-params-container .input-activator { width: 40px !important; }
    .expandable-expanded .scale-params-container .input-inhibitor-ratio { width: 40px !important; }
    .expandable-expanded .scale-params-container .input-symmetry { width: 32px !important; }
    .scale-params-container.symmetry-hidden .symmetry-col { display: none; }
  `;
  container.appendChild(style);

  // Create table
  const table = document.createElement('table');
  table.style.cssText = 'border-collapse: collapse; width: 100%; font-size: 11px; margin: 4px 0;';

  // Header row
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr style="text-align: left;">
      <th style="padding: 2px 4px;"><span class="label-full">Activator (A)</span><span class="label-short">A</span></th>
      <th style="padding: 2px 4px;"><span class="label-full">Inh/Act (I/A)</span><span class="label-short">I/A</span></th>
      <th style="padding: 2px 4px;"><span class="label-full">Kernel (K)</span><span class="label-short">K</span></th>
      <th style="padding: 2px 4px;"><span class="label-full">Amount (Δ)</span><span class="label-short">Δ</span></th>
      <th style="padding: 2px 4px;"><span class="label-full">Weight (W)</span><span class="label-short">W</span></th>
      <th class="symmetry-col" style="padding: 2px 4px;"><span class="label-full">Symmetry (S)</span><span class="label-short">S</span></th>
      <th style="padding: 2px 4px;"></th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const rows = [];

  // HSV to RGB conversion
  function hsvToRgb(h, s, v) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const mod = i % 6;
    const r = [v, q, p, p, t, v][mod];
    const g = [t, v, v, q, p, p][mod];
    const b = [p, p, t, v, v, q][mod];
    return [r, g, b];
  }

  function randomColor() {
    return hsvToRgb(Math.random(), Math.random(), 1);
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : [0.5, 0.5, 0.5];
  }

  function rgbToHex(rgb) {
    const r = Math.round(rgb[0] * 255);
    const g = Math.round(rgb[1] * 255);
    const b = Math.round(rgb[2] * 255);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function emitUpdate() {
    container.value = rows.map(r => ({
      activatorRadius: parseFloat(r.activator.value) || 2,
      inhibitorRatio: parseFloat(r.inhibitorRatio.value) || 2,
      kernelType: r.kernel.value === 'circular' ? 1 : 0,
      amount: parseFloat(r.amount.value) || 0.05,
      weight: parseFloat(r.weight.value) || 1,
      symmetry: parseInt(r.symmetry.value) || 1,
      color: hexToRgb(r.color.value)
    }));
    container.dispatchEvent(new CustomEvent('input'));
  }

  // Generate random radius: logarithmically from 3 to gridSize/8
  function randomExpRadius(scaleIndex) {
    const minRadius = 3;
    const maxRadius = gridSizeState.N / 8;
    const t = numScales > 1 ? scaleIndex / (numScales - 1) : 0;
    const base = minRadius * Math.pow(maxRadius / minRadius, t);
    const randomFactor = 0.7 + Math.random() * 0.6;
    return Math.round(base * randomFactor);
  }

  // Generate random values for a scale
  function randomScaleValues(scaleIndex) {
    const symmetryOptions = [1, 1, 2, 3, 4, 6, 8];
    return {
      activatorRadius: randomExpRadius(scaleIndex),
      inhibitorRatio: (1.5 + Math.random() * 2.5).toFixed(1),
      kernelType: Math.random() > 0.5 ? 1 : 0,
      amount: (0.1 + 0.9 * Math.random()).toFixed(2),
      weight: (0.1 + Math.random() * 0.9).toFixed(2),
      symmetry: symmetryOptions[Math.floor(Math.random() * symmetryOptions.length)],
      color: randomColor()
    };
  }

  for (let i = 0; i < numScales; i++) {
    const existing = existingParams[i];
    const defaults = existing || randomScaleValues(i);

    const tr = document.createElement('tr');

    // Activator radius
    const activator = document.createElement('input');
    activator.type = 'number';
    activator.className = 'input-activator';
    activator.value = defaults.activatorRadius;
    activator.min = 1;
    activator.max = 200;
    activator.step = 1;
    activator.style.cssText = 'width: 50px; padding: 2px;';
    activator.oninput = emitUpdate;

    // Inhibitor/Activator ratio
    const inhibitorRatio = document.createElement('input');
    inhibitorRatio.type = 'number';
    inhibitorRatio.className = 'input-inhibitor-ratio';
    inhibitorRatio.value = defaults.inhibitorRatio;
    inhibitorRatio.min = 1;
    inhibitorRatio.max = 10;
    inhibitorRatio.step = 0.1;
    inhibitorRatio.style.cssText = 'width: 50px; padding: 2px;';
    inhibitorRatio.oninput = emitUpdate;

    // Kernel type toggle
    const kernel = document.createElement('button');
    kernel.type = 'button';
    kernel.value = (defaults.kernelType === 1) ? 'circular' : 'gaussian';
    kernel.style.cssText = `
      width: 24px; height: 22px; padding: 0; border: 1px solid #ccc;
      border-radius: 4px; background: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    `;
    const kernelDot = document.createElement('div');
    kernelDot.style.cssText = `
      width: 12px; height: 12px; border-radius: 50%; background: #333;
      filter: ${kernel.value === 'gaussian' ? 'blur(3px)' : 'none'};
      transition: filter 0.15s ease;
    `;
    kernel.appendChild(kernelDot);
    kernel._dot = kernelDot;
    kernel.title = kernel.value === 'gaussian' ? 'Gaussian (click for circular)' : 'Circular (click for gaussian)';
    kernel.onclick = () => {
      kernel.value = kernel.value === 'gaussian' ? 'circular' : 'gaussian';
      kernelDot.style.filter = kernel.value === 'gaussian' ? 'blur(3px)' : 'none';
      kernel.title = kernel.value === 'gaussian' ? 'Gaussian (click for circular)' : 'Circular (click for gaussian)';
      emitUpdate();
    };

    // Amount
    const amount = document.createElement('input');
    amount.type = 'number';
    amount.value = defaults.amount;
    amount.min = 0.001;
    amount.max = 1;
    amount.step = 0.001;
    amount.style.cssText = 'width: 55px; padding: 2px;';
    amount.oninput = emitUpdate;

    // Weight
    const weight = document.createElement('input');
    weight.type = 'number';
    weight.value = defaults.weight;
    weight.min = 0;
    weight.max = 1;
    weight.step = 0.01;
    weight.style.cssText = 'width: 50px; padding: 2px;';
    weight.oninput = emitUpdate;

    // Symmetry
    const symmetry = document.createElement('input');
    symmetry.type = 'number';
    symmetry.className = 'input-symmetry';
    symmetry.value = defaults.symmetry ?? 1;
    symmetry.min = 1;
    symmetry.max = 8;
    symmetry.step = 1;
    symmetry.style.cssText = 'width: 40px; padding: 2px;';
    symmetry.oninput = emitUpdate;

    // Color
    const color = document.createElement('input');
    color.type = 'color';
    color.value = rgbToHex(defaults.color);
    color.style.cssText = 'width: 36px; height: 22px; padding: 0; border: 1px solid #ccc;';
    color.oninput = emitUpdate;

    // Add cells
    [activator, inhibitorRatio, kernel, amount, weight, symmetry, color].forEach((input, idx) => {
      const td = document.createElement('td');
      td.style.padding = '1px 2px';
      if (idx === 5) td.className = 'symmetry-col';
      td.appendChild(input);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
    rows.push({ activator, inhibitorRatio, kernel, amount, weight, symmetry, color });
  }

  table.appendChild(tbody);
  container.appendChild(table);

  // Expose randomize method
  container.randomize = () => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const vals = randomScaleValues(i);
      row.activator.value = vals.activatorRadius;
      row.inhibitorRatio.value = vals.inhibitorRatio;
      row.kernel.value = vals.kernelType === 1 ? 'circular' : 'gaussian';
      row.kernel._dot.style.filter = vals.kernelType === 1 ? 'none' : 'blur(3px)';
      row.amount.value = vals.amount;
      row.weight.value = vals.weight;
      row.symmetry.value = vals.symmetry;
      row.color.value = rgbToHex(vals.color);
    }
    emitUpdate();
  };

  // Initialize value
  emitUpdate();

  return container;
}

/**
 * Create the Turing pattern simulation
 */
export function createTuringSimulation(config) {
  const {
    device,
    canvasFormat,
    ctx,
    canvas,
    pipelines,
    N,
    numScales,
    bytesPerFloat,
    referenceN,
    solution,
    fhat,
    fhatFreq,
    fftTemp,
    vec4FftWork,
    vec4FftTemp,
    vec4FftPipelines,
    activatorInhibitor,
    extractParamsBuffer,
    convolveParamsBuffer,
    updateParamsBuffer,
    scaleParamsBuffer,
    visualizeParamsBuffer,
    viewInverseBuffer,
    simState,
    symmetryState,
    statusEl,
    memoryInfo,
    axes
  } = config;

  const workgroups = Math.ceil(N / 16);

  // Write initial extract params
  const extractParams = new Uint32Array([N, N, 0, 0]);
  device.queue.writeBuffer(extractParamsBuffer, 0, extractParams);

  // Create visualize bind groups
  const visualizeBindGroups = [
    device.createBindGroup({
      label: 'Visualize bind group 0',
      layout: pipelines.bindGroupLayouts.visualize,
      entries: [
        { binding: 0, resource: { buffer: solution[0] } },
        { binding: 1, resource: { buffer: visualizeParamsBuffer } },
        { binding: 2, resource: { buffer: viewInverseBuffer } }
      ]
    }),
    device.createBindGroup({
      label: 'Visualize bind group 1',
      layout: pipelines.bindGroupLayouts.visualize,
      entries: [
        { binding: 0, resource: { buffer: solution[1] } },
        { binding: 1, resource: { buffer: visualizeParamsBuffer } },
        { binding: 2, resource: { buffer: viewInverseBuffer } }
      ]
    })
  ];

  // Create update bind groups
  const updateBindGroups = [
    device.createBindGroup({
      label: 'Update bind group 0->1',
      layout: pipelines.bindGroupLayouts.update,
      entries: [
        { binding: 0, resource: { buffer: solution[0] } },
        { binding: 1, resource: { buffer: activatorInhibitor } },
        { binding: 2, resource: { buffer: solution[1] } },
        { binding: 3, resource: { buffer: updateParamsBuffer } },
        { binding: 4, resource: { buffer: scaleParamsBuffer } }
      ]
    }),
    device.createBindGroup({
      label: 'Update bind group 1->0',
      layout: pipelines.bindGroupLayouts.update,
      entries: [
        { binding: 0, resource: { buffer: solution[1] } },
        { binding: 1, resource: { buffer: activatorInhibitor } },
        { binding: 2, resource: { buffer: solution[0] } },
        { binding: 3, resource: { buffer: updateParamsBuffer } },
        { binding: 4, resource: { buffer: scaleParamsBuffer } }
      ]
    })
  ];

  // Current parameters (updated each frame)
  // Initialize from config if provided
  let currentParams = {
    scaleParams: config.scaleParams || [],
    stepSize: config.stepSize ?? 0.2,
    colorRate: config.colorRate ?? 0.02,
    stepsPerFrame: config.stepsPerFrame ?? 1,
    simulate: config.simulate ?? true,
    contrast: config.contrast ?? 0.4,
    brightness: config.brightness ?? -1,
    gamma: config.gamma ?? 1.0,
    colorStrength: config.colorStrength ?? 1.0,
    invert: config.invert ?? false
  };

  function updateParams() {
    const { scaleParams, stepSize, colorRate, contrast, brightness, gamma, colorStrength, invert } = currentParams;

    // Scale params
    const scaleData = new Float32Array(numScales * 8);
    for (let i = 0; i < numScales; i++) {
      const s = scaleParams[i];
      const offset = i * 8;
      scaleData[offset + 0] = s.weight;
      scaleData[offset + 1] = s.amount;
      scaleData[offset + 2] = symmetryState.enabled ? s.symmetry : 1;
      scaleData[offset + 3] = 0.0;
      scaleData[offset + 4] = s.color[0];
      scaleData[offset + 5] = s.color[1];
      scaleData[offset + 6] = s.color[2];
      scaleData[offset + 7] = 0.0;
    }
    device.queue.writeBuffer(scaleParamsBuffer, 0, scaleData);

    // Update params
    const updateData = new Float32Array(8);
    const updateDataU32 = new Uint32Array(updateData.buffer);
    updateDataU32[0] = N;
    updateDataU32[1] = N;
    updateDataU32[2] = numScales;
    updateData[3] = stepSize;
    updateData[4] = colorRate;
    device.queue.writeBuffer(updateParamsBuffer, 0, updateData);

    // Visualize params
    const visData = new Float32Array(10);
    const visDataU32 = new Uint32Array(visData.buffer);
    visDataU32[0] = N;
    visDataU32[1] = N;
    visData[2] = contrast;
    visData[3] = brightness;
    visData[4] = colorStrength;
    visData[5] = gamma;
    visDataU32[6] = invert ? 1 : 0;
    visData[7] = N / referenceN;
    visData[8] = referenceN;
    visData[9] = referenceN;
    device.queue.writeBuffer(visualizeParamsBuffer, 0, visData);

    // View matrix
    device.queue.writeBuffer(viewInverseBuffer, 0, axes.viewInverse);
  }

  function simulationStep() {
    const { scaleParams } = currentParams;
    const encoder = device.createCommandEncoder({ label: `Simulation step ${simState.iteration}` });

    // 1. Extract scalar field from current solution
    const extractBG = device.createBindGroup({
      layout: pipelines.bindGroupLayouts.extract,
      entries: [
        { binding: 0, resource: { buffer: solution[simState.solutionIndex] } },
        { binding: 1, resource: { buffer: fhat } },
        { binding: 2, resource: { buffer: extractParamsBuffer } }
      ]
    });

    const extractPass = encoder.beginComputePass({ label: 'Extract pass' });
    extractPass.setPipeline(pipelines.extract);
    extractPass.setBindGroup(0, extractBG);
    extractPass.dispatchWorkgroups(workgroups, workgroups, 1);
    extractPass.end();

    device.queue.submit([encoder.finish()]);

    // 2. FFT forward
    executeFFT2D({
      device,
      pipelines: pipelines.fft,
      input: fhat,
      output: fhatFreq,
      temp: fftTemp,
      N,
      forward: true,
      splitNormalization: true
    });

    // 3. Convolve with kernels for each scale pair
    const numScalePairs = Math.ceil(numScales / 2);
    for (let pairIdx = 0; pairIdx < numScalePairs; pairIdx++) {
      const scaleIdx1 = pairIdx * 2;
      const scaleIdx2 = Math.min(pairIdx * 2 + 1, numScales - 1);

      const s1 = scaleParams[scaleIdx1];
      const s2 = scaleParams[scaleIdx2];

      const convParams = new Float32Array(12);
      const convParamsU32 = new Uint32Array(convParams.buffer);
      convParamsU32[0] = N;
      convParamsU32[1] = N;
      convParams[4] = s1.activatorRadius;
      convParams[5] = s1.activatorRadius * s1.inhibitorRatio;
      convParams[6] = s2.activatorRadius;
      convParams[7] = s2.activatorRadius * s2.inhibitorRatio;
      convParamsU32[8] = s1.kernelType;
      convParamsU32[9] = s1.kernelType;
      convParamsU32[10] = s2.kernelType;
      convParamsU32[11] = s2.kernelType;
      device.queue.writeBuffer(convolveParamsBuffer, 0, convParams);

      const aiPairSize = N * N * 4 * bytesPerFloat;
      const aiOffset = pairIdx * aiPairSize;

      const convEncoder = device.createCommandEncoder({ label: `Convolve pair ${pairIdx}` });
      const convBG = device.createBindGroup({
        layout: pipelines.bindGroupLayouts.convolve,
        entries: [
          { binding: 0, resource: { buffer: fhatFreq } },
          { binding: 1, resource: { buffer: activatorInhibitor, offset: aiOffset, size: aiPairSize } },
          { binding: 2, resource: { buffer: convolveParamsBuffer } }
        ]
      });

      const convPass = convEncoder.beginComputePass({ label: `Convolve pass ${pairIdx}` });
      convPass.setPipeline(pipelines.convolve);
      convPass.setBindGroup(0, convBG);
      convPass.dispatchWorkgroups(workgroups, workgroups, 1);
      convPass.end();

      device.queue.submit([convEncoder.finish()]);

      // Copy convolution result to vec4 work buffer
      const copyToWorkEncoder = device.createCommandEncoder({ label: `Copy to vec4 work ${pairIdx}` });
      copyToWorkEncoder.copyBufferToBuffer(activatorInhibitor, aiOffset, vec4FftWork, 0, aiPairSize);
      device.queue.submit([copyToWorkEncoder.finish()]);

      // Single vec4 inverse FFT
      executeVec4FFT2D({
        device,
        pipelines: vec4FftPipelines,
        input: vec4FftWork,
        output: vec4FftWork,
        temp: vec4FftTemp,
        N,
        forward: false,
        splitNormalization: true
      });

      // Copy result back to activatorInhibitor
      const copyFromWorkEncoder = device.createCommandEncoder({ label: `Copy from vec4 work ${pairIdx}` });
      copyFromWorkEncoder.copyBufferToBuffer(vec4FftWork, 0, activatorInhibitor, aiOffset, aiPairSize);
      device.queue.submit([copyFromWorkEncoder.finish()]);
    }

    // 4. Update solution
    const updateEncoder = device.createCommandEncoder({ label: `Update ${simState.iteration}` });
    const updatePass = updateEncoder.beginComputePass({ label: 'Update pass' });
    updatePass.setPipeline(pipelines.update);
    updatePass.setBindGroup(0, updateBindGroups[simState.solutionIndex]);
    updatePass.dispatchWorkgroups(workgroups, workgroups, 1);
    updatePass.end();

    device.queue.submit([updateEncoder.finish()]);

    // Swap buffers
    simState.solutionIndex = 1 - simState.solutionIndex;
    simState.iteration++;
  }

  function render() {
    const renderEncoder = device.createCommandEncoder({ label: 'Render' });
    const renderPass = renderEncoder.beginRenderPass({
      colorAttachments: [{
        view: ctx.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 }
      }]
    });
    renderPass.setPipeline(pipelines.visualize);
    renderPass.setBindGroup(0, visualizeBindGroups[simState.solutionIndex]);
    renderPass.draw(3, 1, 0, 0);
    renderPass.end();

    device.queue.submit([renderEncoder.finish()]);
  }

  async function downloadPNG() {
    const { contrast, brightness, gamma, colorStrength, invert } = currentParams;
    const width = N;
    const height = N;
    const bytesPerRow = Math.ceil(width * 4 / 256) * 256;

    const renderTexture = device.createTexture({
      size: [width, height],
      format: canvasFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
    });

    const stagingBuffer = device.createBuffer({
      size: bytesPerRow * height,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });

    // Update params for full resolution render
    const visData = new Float32Array(10);
    const visDataU32 = new Uint32Array(visData.buffer);
    visDataU32[0] = width;
    visDataU32[1] = height;
    visData[2] = contrast;
    visData[3] = brightness;
    visData[4] = colorStrength;
    visData[5] = gamma;
    visDataU32[6] = invert ? 1 : 0;
    visData[7] = 1;
    visData[8] = width;
    visData[9] = height;
    device.queue.writeBuffer(visualizeParamsBuffer, 0, visData);

    // View matrix for full image
    const fullViewMatrix = new Float32Array([
      width / 2, 0, 0, 0,
      0, height / 2, 0, 0,
      0, 0, 1, 0,
      width / 2, height / 2, 0, 1
    ]);
    device.queue.writeBuffer(viewInverseBuffer, 0, fullViewMatrix);

    // Render to texture
    const renderEncoder = device.createCommandEncoder({ label: 'Download render' });
    const renderPass = renderEncoder.beginRenderPass({
      colorAttachments: [{
        view: renderTexture.createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 }
      }]
    });
    renderPass.setPipeline(pipelines.visualize);
    renderPass.setBindGroup(0, visualizeBindGroups[simState.solutionIndex]);
    renderPass.draw(3, 1, 0, 0);
    renderPass.end();

    renderEncoder.copyTextureToBuffer(
      { texture: renderTexture },
      { buffer: stagingBuffer, bytesPerRow },
      [width, height]
    );

    device.queue.submit([renderEncoder.finish()]);

    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const data = new Uint8Array(stagingBuffer.getMappedRange());

    const downloadCanvas = document.createElement('canvas');
    downloadCanvas.width = width;
    downloadCanvas.height = height;
    const ctx2d = downloadCanvas.getContext('2d');
    const imageData = ctx2d.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = y * bytesPerRow + x * 4;
        const dstIdx = (y * width + x) * 4;
        if (canvasFormat === 'bgra8unorm') {
          imageData.data[dstIdx + 0] = data[srcIdx + 2];
          imageData.data[dstIdx + 1] = data[srcIdx + 1];
          imageData.data[dstIdx + 2] = data[srcIdx + 0];
          imageData.data[dstIdx + 3] = 255;
        } else {
          imageData.data[dstIdx + 0] = data[srcIdx + 0];
          imageData.data[dstIdx + 1] = data[srcIdx + 1];
          imageData.data[dstIdx + 2] = data[srcIdx + 2];
          imageData.data[dstIdx + 3] = 255;
        }
      }
    }

    ctx2d.putImageData(imageData, 0, 0);

    stagingBuffer.unmap();
    stagingBuffer.destroy();
    renderTexture.destroy();

    // Restore view matrix
    device.queue.writeBuffer(viewInverseBuffer, 0, axes.viewInverse);
    simState.dirty = true;

    // Trigger download
    const link = document.createElement('a');
    link.download = `turing-pattern-${N}x${N}-${Date.now()}.png`;
    link.href = downloadCanvas.toDataURL('image/png');
    link.click();
  }

  let animationId = null;
  let isVisible = true;

  // Track canvas visibility
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0].isIntersecting;
      if (isVisible && animationId === null) {
        animationId = requestAnimationFrame(animate);
      }
    },
    { threshold: 0 }
  );
  visibilityObserver.observe(canvas);

  function animate() {
    if (!isVisible) {
      animationId = null;
      return;
    }

    updateParams();

    if (currentParams.simulate) {
      for (let i = 0; i < currentParams.stepsPerFrame; i++) {
        simulationStep();
      }
      simState.dirty = true;
    }

    if (simState.dirty) {
      render();
      simState.dirty = false;
    }

    statusEl.textContent = `Grid: ${N}×${N} | Scales: ${numScales} | ${memoryInfo.precision} | Memory: ${memoryInfo.formatted} | Iteration: ${simState.iteration}`;

    animationId = requestAnimationFrame(animate);
  }

  // Start animation
  animate();

  return {
    setParams(params) {
      Object.assign(currentParams, params);
      simState.dirty = true;
    },
    downloadPNG,
    dispose() {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
      visibilityObserver.disconnect();
    }
  };
}
