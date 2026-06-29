// Opaque, smooth-shaded, 4x MSAA WebGPU renderer for the deforming Mobius
// strip, with an optional wireframe and a selectable per-vertex scalar field.
//
// The surface is non-orientable, so no globally consistent unit normal exists.
// But the tangent plane (the normal LINE) is continuous everywhere, and the
// fragment shader uses sign-invariant two-sided lighting. So we:
//
//   1. compute a smooth per-vertex normal from the GLUED FEM connectivity --
//      every vertex (seam vertices included) averages its full ring of
//      incident triangles, with the ring made locally sign-consistent (a
//      vertex neighborhood is a disk, hence orientable);
//   2. emit a non-indexed triangle soup whose three corner normals are each
//      flipped to agree with that triangle's own face normal, so in-triangle
//      interpolation never cancels;
//   3. let the shader flip the normal toward the eye.
//
// The result is smooth shading all the way around, with the unavoidable
// orientation flip invisible (it only changes a sign the shading ignores).
//
//   createRenderer(device, canvasFormat, { code })
//     .initMesh(model)
//     .update(femPos, femScalar|null, colorMode)   // colorMode: 0 width, 1 scalar
//     .render(gpuContext, params, camera, w, h, dirty) -> boolean

const SAMPLES = 4;

export function createRenderer(device, canvasFormat, shaderCodes) {
  const module = device.createShaderModule({ label: 'mobius-shader', code: shaderCodes.code });

  const UNIFORM_BYTES = 144; // mat4(64) + 5*vec4(16)
  const uniformBuffer = device.createBuffer({
    size: UNIFORM_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' },
    }],
  });
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });

  const posLayout = { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] };
  const nrmLayout = { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }] };
  const auxLayout = { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x2' }] };

  const surfacePipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: { module, entryPoint: 'vsSurface', buffers: [posLayout, nrmLayout, auxLayout] },
    fragment: { module, entryPoint: 'fsSurface', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: SAMPLES },
  });
  const wirePipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: { module, entryPoint: 'vsWire', buffers: [posLayout] },
    fragment: { module, entryPoint: 'fsWire', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'line-list' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'less-equal' },
    multisample: { count: SAMPLES },
  });

  // Glued mesh state.
  let Nv = 0, nT = 0;
  let tris = null;            // Int32Array(nT*3), glued FEM connectivity
  let vtStart = null, vtList = null; // CSR vertex -> incident triangles
  let svVert = null;          // Float32Array(Nv): across-width parameter
  let vNrm = null;            // Float64Array(Nv*3): smooth per-vertex normal
  let faceN = null;           // Float64Array(nT*3): per-triangle face normal
  let nuMesh = 0, nvMesh = 0, boundaryLoop = null;

  // Non-indexed surface corner buffers (top + bottom + rim).
  let cornerCount = 0;
  let posF = null, nrmF = null, auxF = null;
  let posBuffer = null, nrmBuffer = null, auxBuffer = null;

  // Wireframe over glued FEM vertices.
  let wirePosF = null, wirePosBuffer = null, wireIndexBuffer = null, wireCount = 0;

  let colorTex = null, depthTex = null, texW = 0, texH = 0;
  let scalarMin = 0, scalarMax = 1;
  let activeColorMode = 0;

  function initMesh(model) {
    Nv = model.Nv;
    nT = model.nT;
    tris = model.tris;
    nuMesh = model.nu;
    nvMesh = model.nv;

    // CSR adjacency: vertex -> incident triangle indices.
    const count = new Int32Array(Nv);
    for (let t = 0; t < nT * 3; t++) count[tris[t]]++;
    vtStart = new Int32Array(Nv + 1);
    for (let v = 0; v < Nv; v++) vtStart[v + 1] = vtStart[v] + count[v];
    vtList = new Int32Array(nT * 3);
    const cursor = vtStart.slice(0, Nv);
    for (let t = 0; t < nT; t++)
      for (let c = 0; c < 3; c++) {
        const v = tris[t * 3 + c];
        vtList[cursor[v]++] = t;
      }

    svVert = new Float32Array(Nv);
    for (let v = 0; v < Nv; v++) svVert[v] = model.vertexUV[v * 2 + 1];

    vNrm = new Float64Array(Nv * 3);
    faceN = new Float64Array(nT * 3);

    // Single Möbius boundary loop: j=0 vertices, then j=nv vertices.
    // Seam connects vid(nu-1,0)→vid(0,nv) and vid(nu-1,nv)→vid(0,0).
    boundaryLoop = new Int32Array(2 * nuMesh);
    for (let i = 0; i < nuMesh; i++) boundaryLoop[i] = i * (nvMesh + 1);
    for (let i = 0; i < nuMesh; i++) boundaryLoop[nuMesh + i] = i * (nvMesh + 1) + nvMesh;

    // top (nT*3) + bottom (nT*3) + rim (12*nu) corners
    cornerCount = 2 * nT * 3 + 12 * nuMesh;
    posF = new Float32Array(cornerCount * 3);
    nrmF = new Float32Array(cornerCount * 3);
    auxF = new Float32Array(cornerCount * 2);

    posBuffer = device.createBuffer({ size: posF.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    nrmBuffer = device.createBuffer({ size: nrmF.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    auxBuffer = device.createBuffer({ size: auxF.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });

    // Unique undirected edges from the glued connectivity.
    const eset = new Set();
    const edges = [];
    for (let t = 0; t < nT; t++) {
      const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2];
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        const lo = Math.min(p, q), hi = Math.max(p, q), key = lo * Nv + hi;
        if (!eset.has(key)) { eset.add(key); edges.push(lo, hi); }
      }
    }
    const wire = new Uint32Array(edges);
    wireCount = wire.length;
    wirePosF = new Float32Array(Nv * 3);
    wirePosBuffer = device.createBuffer({ size: wirePosF.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    wireIndexBuffer = device.createBuffer({ size: wire.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(wireIndexBuffer, 0, wire);
  }

  // femPos: Float64|Float32 length 3*Nv. femScalar: length Nv or null.
  // thickness: physical half-thickness for extrusion (default 0.03).
  function update(femPos, femScalar, colorMode, thickness = 0.03) {
    if (!tris) return;
    const hh = thickness / 2;

    // Per-triangle face normals (unnormalized, area-weighted).
    for (let t = 0; t < nT; t++) {
      const a = tris[t * 3] * 3, b = tris[t * 3 + 1] * 3, c = tris[t * 3 + 2] * 3;
      const ux = femPos[b] - femPos[a], uy = femPos[b + 1] - femPos[a + 1], uz = femPos[b + 2] - femPos[a + 2];
      const vx = femPos[c] - femPos[a], vy = femPos[c + 1] - femPos[a + 1], vz = femPos[c + 2] - femPos[a + 2];
      faceN[t * 3] = uy * vz - uz * vy;
      faceN[t * 3 + 1] = uz * vx - ux * vz;
      faceN[t * 3 + 2] = ux * vy - uy * vx;
    }

    // Smooth per-vertex normal: average the full incident ring, each face
    // flipped to agree with the ring's first face (the neighborhood is a
    // disk, so this is consistent even for seam vertices).
    for (let v = 0; v < Nv; v++) {
      const s = vtStart[v], e = vtStart[v + 1];
      let nx = 0, ny = 0, nz = 0, rx = 0, ry = 0, rz = 0;
      for (let k = s; k < e; k++) {
        const t = vtList[k];
        let fx = faceN[t * 3], fy = faceN[t * 3 + 1], fz = faceN[t * 3 + 2];
        if (k === s) { rx = fx; ry = fy; rz = fz; }
        else if (fx * rx + fy * ry + fz * rz < 0) { fx = -fx; fy = -fy; fz = -fz; }
        nx += fx; ny += fy; nz += fz;
      }
      const m = Math.hypot(nx, ny, nz) || 1;
      vNrm[v * 3] = nx / m; vNrm[v * 3 + 1] = ny / m; vNrm[v * 3 + 2] = nz / m;
    }

    activeColorMode = (colorMode === 1 && femScalar) ? 1 : 0;
    let lo = Infinity, hi = -Infinity;
    if (activeColorMode === 1) {
      for (let v = 0; v < Nv; v++) {
        const sv = femScalar[v];
        if (sv < lo) lo = sv;
        if (sv > hi) hi = sv;
      }
      if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
      if (hi - lo < 1e-20) hi = lo + 1e-20;
      scalarMin = lo; scalarMax = hi;
    }

    // Top surface: mid-surface + hh * face-aligned normal.
    let o3 = 0, o2 = 0;
    for (let t = 0; t < nT; t++) {
      const fx = faceN[t * 3], fy = faceN[t * 3 + 1], fz = faceN[t * 3 + 2];
      for (let c = 0; c < 3; c++) {
        const v = tris[t * 3 + c], p = v * 3;
        let vnx = vNrm[p], vny = vNrm[p + 1], vnz = vNrm[p + 2];
        if (vnx * fx + vny * fy + vnz * fz < 0) { vnx = -vnx; vny = -vny; vnz = -vnz; }
        posF[o3] = femPos[p] + hh * vnx; posF[o3 + 1] = femPos[p + 1] + hh * vny; posF[o3 + 2] = femPos[p + 2] + hh * vnz;
        nrmF[o3] = vnx; nrmF[o3 + 1] = vny; nrmF[o3 + 2] = vnz;
        auxF[o2] = svVert[v]; auxF[o2 + 1] = activeColorMode === 1 ? femScalar[v] : 0;
        o3 += 3; o2 += 2;
      }
    }

    // Bottom surface: mid-surface - hh * face-aligned normal, normals negated.
    for (let t = 0; t < nT; t++) {
      const fx = faceN[t * 3], fy = faceN[t * 3 + 1], fz = faceN[t * 3 + 2];
      for (let c = 0; c < 3; c++) {
        const v = tris[t * 3 + c], p = v * 3;
        let vnx = vNrm[p], vny = vNrm[p + 1], vnz = vNrm[p + 2];
        if (vnx * fx + vny * fy + vnz * fz < 0) { vnx = -vnx; vny = -vny; vnz = -vnz; }
        posF[o3] = femPos[p] - hh * vnx; posF[o3 + 1] = femPos[p + 1] - hh * vny; posF[o3 + 2] = femPos[p + 2] - hh * vnz;
        nrmF[o3] = -vnx; nrmF[o3 + 1] = -vny; nrmF[o3 + 2] = -vnz;
        auxF[o2] = svVert[v]; auxF[o2 + 1] = activeColorMode === 1 ? femScalar[v] : 0;
        o3 += 3; o2 += 2;
      }
    }

    // Rim: quads along the single Möbius boundary loop
    const nBound = 2 * nuMesh;
    for (let k = 0; k < nBound; k++) {
      const ka = boundaryLoop[k], kb = boundaryLoop[(k + 1) % nBound];
      const pa = ka * 3, pb = kb * 3;
      const nax = vNrm[pa], nay = vNrm[pa + 1], naz = vNrm[pa + 2];
      let nbx = vNrm[pb], nby = vNrm[pb + 1], nbz = vNrm[pb + 2];
      // At the Möbius seam junction, na and nb are anti-aligned. Flip nb to
      // match na so the rim quad has consistent top/bottom (not twisted).
      if (nbx * nax + nby * nay + nbz * naz < 0) { nbx = -nbx; nby = -nby; nbz = -nbz; }
      // Rim outward normal: edge_tangent × avg_surface_normal
      const ex = femPos[pb]-femPos[pa], ey = femPos[pb+1]-femPos[pa+1], ez = femPos[pb+2]-femPos[pa+2];
      const el = Math.hypot(ex, ey, ez) || 1;
      const etx=ex/el, ety=ey/el, etz=ez/el;
      const avx=nax+nbx, avy=nay+nby, avz=naz+nbz;
      let rnx=ety*avz-etz*avy, rny=etz*avx-etx*avz, rnz=etx*avy-ety*avx;
      const rl = Math.hypot(rnx, rny, rnz) || 1;
      rnx/=rl; rny/=rl; rnz/=rl;
      const aTopX=femPos[pa]+hh*nax, aTopY=femPos[pa+1]+hh*nay, aTopZ=femPos[pa+2]+hh*naz;
      const bTopX=femPos[pb]+hh*nbx, bTopY=femPos[pb+1]+hh*nby, bTopZ=femPos[pb+2]+hh*nbz;
      const bBotX=femPos[pb]-hh*nbx, bBotY=femPos[pb+1]-hh*nby, bBotZ=femPos[pb+2]-hh*nbz;
      const aBotX=femPos[pa]-hh*nax, aBotY=femPos[pa+1]-hh*nay, aBotZ=femPos[pa+2]-hh*naz;
      const corners = [
        aTopX,aTopY,aTopZ, bTopX,bTopY,bTopZ, bBotX,bBotY,bBotZ,
        aTopX,aTopY,aTopZ, bBotX,bBotY,bBotZ, aBotX,aBotY,aBotZ,
      ];
      const svMid = (svVert[ka] + svVert[kb]) / 2;
      for (let j = 0; j < 6; j++, o3 += 3, o2 += 2) {
        posF[o3] = corners[j*3]; posF[o3+1] = corners[j*3+1]; posF[o3+2] = corners[j*3+2];
        nrmF[o3] = rnx; nrmF[o3+1] = rny; nrmF[o3+2] = rnz;
        auxF[o2] = svMid; auxF[o2+1] = 0;
      }
    }

    for (let i = 0; i < wirePosF.length; i++) wirePosF[i] = femPos[i];

    device.queue.writeBuffer(posBuffer, 0, posF);
    device.queue.writeBuffer(nrmBuffer, 0, nrmF);
    device.queue.writeBuffer(auxBuffer, 0, auxF);
    device.queue.writeBuffer(wirePosBuffer, 0, wirePosF);
  }

  function ensureTextures(w, h) {
    if (colorTex && texW === w && texH === h) return;
    if (colorTex) colorTex.destroy();
    if (depthTex) depthTex.destroy();
    colorTex = device.createTexture({
      size: [w, h], sampleCount: SAMPLES, format: canvasFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    depthTex = device.createTexture({
      size: [w, h], sampleCount: SAMPLES, format: 'depth32float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    texW = w; texH = h;
  }

  function render(gpuContext, params, camera, w, h, dirty) {
    const { projView, eye, dirty: cameraDirty } = camera.update(w / h);
    if (!cameraDirty && !dirty) return false;
    if (!posBuffer) return false;

    const buf = new ArrayBuffer(UNIFORM_BYTES);
    const f = new Float32Array(buf);
    f.set(projView, 0);
    f[16] = eye[0]; f[17] = eye[1]; f[18] = eye[2];
    const L = params.lightDir || [0.45, 0.75, 0.55];
    f[20] = L[0]; f[21] = L[1]; f[22] = L[2];
    const ca = params.colorA || [0.86, 0.40, 0.36];
    const cb = params.colorB || [0.34, 0.46, 0.86];
    f[24] = ca[0]; f[25] = ca[1]; f[26] = ca[2]; f[27] = params.ambient ?? 0.30;
    f[28] = cb[0]; f[29] = cb[1]; f[30] = cb[2]; f[31] = activeColorMode;
    f[32] = scalarMin; f[33] = scalarMax;
    device.queue.writeBuffer(uniformBuffer, 0, buf);

    let swapTex;
    try { swapTex = gpuContext.getCurrentTexture(); }
    catch (e) { return false; }

    ensureTextures(w, h);
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: colorTex.createView(),
        resolveTarget: swapTex.createView(),
        clearValue: params.background ?? { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: depthTex.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    pass.setBindGroup(0, bindGroup);
    pass.setPipeline(surfacePipeline);
    pass.setVertexBuffer(0, posBuffer);
    pass.setVertexBuffer(1, nrmBuffer);
    pass.setVertexBuffer(2, auxBuffer);
    pass.draw(cornerCount);

    if (params.wireframe) {
      pass.setPipeline(wirePipeline);
      pass.setVertexBuffer(0, wirePosBuffer);
      pass.setIndexBuffer(wireIndexBuffer, 'uint32');
      pass.drawIndexed(wireCount);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
    return true;
  }

  return { initMesh, update, render };
}
