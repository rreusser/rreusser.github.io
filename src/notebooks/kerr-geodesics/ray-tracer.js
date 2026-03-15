// Ray-traced Kerr black hole renderer
// Creates a fragment-shader-based ray tracer that traces null geodesics
// per pixel with adaptive integration.

export function createRayTracer(device, canvasFormat, shaderCode) {
  const module = device.createShaderModule({ label: 'ray-tracer', code: shaderCode });

  const uniformBGL = device.createBindGroupLayout({
    label: 'ray-tracer-bgl',
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' },
    }],
  });

  const pipeline = device.createRenderPipeline({
    label: 'ray-tracer',
    layout: device.createPipelineLayout({ bindGroupLayouts: [uniformBGL] }),
    vertex: { module, entryPoint: 'vs' },
    fragment: {
      module,
      entryPoint: 'fs',
      targets: [{ format: canvasFormat }],
    },
    primitive: { topology: 'triangle-list' },
    multisample: { count: 1 },
  });

  // Uniform buffer: invProjView(64) + eye(16) + params(16) + resolution(16) = 112
  const uniformBuffer = device.createBuffer({
    label: 'ray-tracer-uniforms',
    size: 112,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bindGroup = device.createBindGroup({
    layout: uniformBGL,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  const _data = new Float32Array(28); // 112 bytes / 4

  // Compute ISCO radius for prograde circular orbits
  function computeISCO(M, a) {
    const am = a / M;
    const z1 = 1 + Math.cbrt(1 - am * am) * (Math.cbrt(1 + am) + Math.cbrt(1 - am));
    const z2 = Math.sqrt(3 * am * am + z1 * z1);
    return M * (3 + z2 - Math.sqrt((3 - z1) * (3 + z1 + 2 * z2)));
  }

  function render(gpuContext, params, camera, width, height) {
    const aspectRatio = width / height;
    const { projView, eye } = camera.update(aspectRatio);

    // Compute inverse projView
    const pv = new Float32Array(projView.buffer, projView.byteOffset, 16);
    const inv = invertMat4(pv);

    // invProjView (16 floats)
    _data.set(inv, 0);
    // eye (4 floats)
    _data[16] = eye[0]; _data[17] = eye[1]; _data[18] = eye[2]; _data[19] = 0;
    // params: a, M, rISCO, diskOuter
    const a = params.a || 0.9;
    const M = params.M || 1;
    _data[20] = a;
    _data[21] = M;
    _data[22] = computeISCO(M, a);
    _data[23] = params.diskOuter || 20;
    // resolution
    _data[24] = width;
    _data[25] = height;
    _data[26] = 0;
    _data[27] = 0;

    device.queue.writeBuffer(uniformBuffer, 0, _data);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: gpuContext.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    });

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();

    device.queue.submit([encoder.finish()]);
  }

  function destroy() {
    uniformBuffer.destroy();
  }

  return { render, destroy };
}

// 4x4 matrix inverse (column-major float array)
function invertMat4(m) {
  const inv = new Float32Array(16);

  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (Math.abs(det) < 1e-20) return inv;
  det = 1.0 / det;

  inv[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  inv[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  inv[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  inv[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  inv[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  inv[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  inv[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  inv[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  inv[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  inv[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  inv[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  inv[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  inv[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  inv[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  inv[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  inv[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

  return inv;
}
