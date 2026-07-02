// Transparent depth-peeling renderer for the Möbius strip views.
// Used for both the intro figure (a cyclic palette running along the strip,
// transparent) and the main interactive figure (scalar coloring through an
// uploadable colormap LUT).
//
// createPeelRenderer(device, canvasFormat, {peel, composite})
//   .initMesh(model, initialPos, thickness)
//   .update(femPos, femScalar, colorMode, thickness, range?)
//   .setColormap(uint8RGBA)   // 256×1 RGBA LUT for scalar coloring
//   .render(gpuContext, params, camera, w, h, dirty)
//
// params: { opacity, specular, peelLayers }
// colorMode: 0 = cyclic palette along the strip's length, 1 = scalar via LUT
// range: optional [min, max] pinning the scalar color scale (else field min/max)

const TUBE_SEGS = 8;
const MAX_LAYERS = 6;
const SAMPLES = 4;
const CMAP_SIZE = 256;
// Uniform layout (176 bytes):
//   projection mat4(0), view mat4(64), eye vec3(128), pixelRatio f32(140),
//   opacity f32(144), specular f32(148), scalarMin f32(152), scalarMax f32(156),
//   colorMode f32(160), _pad×3 f32(164..172)
const UNIFORM_BYTES = 176;

export function createPeelRenderer(device, canvasFormat, shaderCodes) {
  const module = device.createShaderModule({ label: 'mobius-peel', code: shaderCodes.peel });
  const compModule = device.createShaderModule({ label: 'mobius-composite', code: shaderCodes.composite });

  const uniformBuffer = device.createBuffer({
    size: UNIFORM_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // The colormap LUT (scalar coloring) and its sampler live in the uniform bind
  // group alongside the uniform buffer, so every pipeline that binds group 0
  // sees them. setColormap() rewrites the texture; until then it holds a
  // grayscale ramp so scalar coloring is never an empty (black) texture.
  const colormapTexture = device.createTexture({
    size: [CMAP_SIZE, 1], format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  const colormapSampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  {
    const ramp = new Uint8Array(CMAP_SIZE * 4);
    for (let i = 0; i < CMAP_SIZE; i++) {
      const v = Math.round(255 * i / (CMAP_SIZE - 1));
      ramp[i * 4] = v; ramp[i * 4 + 1] = v; ramp[i * 4 + 2] = v; ramp[i * 4 + 3] = 255;
    }
    device.queue.writeTexture({ texture: colormapTexture }, ramp, { bytesPerRow: CMAP_SIZE * 4 }, { width: CMAP_SIZE, height: 1 });
  }

  const uniformBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
    ],
  });
  const depthBGL = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth', multisampled: true } }],
  });
  const compositeBGL = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } }],
  });

  const uniformBindGroup = device.createBindGroup({
    layout: uniformBGL,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: colormapTexture.createView() },
      { binding: 2, resource: colormapSampler },
    ],
  });

  function setColormap(rgba) {
    device.queue.writeTexture({ texture: colormapTexture }, rgba, { bytesPerRow: CMAP_SIZE * 4 }, { width: CMAP_SIZE, height: 1 });
  }

  // Surface uses 3 vertex buffers: pos, normal, aux(sv, scalar, loop)
  const vLayoutSurface = [
    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
    { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }] },
    { arrayStride: 12, attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x3' }] },
  ];
  // Tube uses 2 vertex buffers: pos, normal (no aux)
  const vLayoutTube = [
    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
    { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }] },
  ];

  const depthStencil = { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' };
  const layerTarget = [{ format: 'rgba8unorm' }];

  const wirePipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [uniformBGL] }),
    vertex: {
      module, entryPoint: 'vsWire',
      buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }],
    },
    fragment: { module, entryPoint: 'fsWire', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'line-list' },
  });

  const msaaLayerTarget = [{ format: 'rgba8unorm' }];
  const msaaDepthStencil = { ...depthStencil };
  const msaaSpec = { count: SAMPLES };

  const surfaceFirstPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [uniformBGL] }),
    vertex: { module, entryPoint: 'vs', buffers: vLayoutSurface },
    fragment: { module, entryPoint: 'fsFirst', targets: msaaLayerTarget },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: msaaDepthStencil,
    multisample: msaaSpec,
  });
  const surfacePeelPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [uniformBGL, depthBGL] }),
    vertex: { module, entryPoint: 'vs', buffers: vLayoutSurface },
    fragment: { module, entryPoint: 'fsPeel', targets: msaaLayerTarget },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: msaaDepthStencil,
    multisample: msaaSpec,
  });
  const tubeFirstPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [uniformBGL] }),
    vertex: { module, entryPoint: 'vsTube', buffers: vLayoutTube },
    fragment: { module, entryPoint: 'fsFirstTube', targets: msaaLayerTarget },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: msaaDepthStencil,
    multisample: msaaSpec,
  });
  const tubePeelPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [uniformBGL, depthBGL] }),
    vertex: { module, entryPoint: 'vsTube', buffers: vLayoutTube },
    fragment: { module, entryPoint: 'fsPeelTube', targets: msaaLayerTarget },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: msaaDepthStencil,
    multisample: msaaSpec,
  });
  const compositePipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [compositeBGL] }),
    vertex: { module: compModule, entryPoint: 'vs', buffers: [] },
    fragment: {
      module: compModule, entryPoint: 'fs',
      targets: [{
        format: canvasFormat,
        // Premultiplied alpha: layer values are already rgb*a, so srcFactor='one'
        blend: {
          color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
  });

  // Mesh state
  let nuMesh = 0, nvMesh = 0, NvMesh = 0, nTMesh = 0, trisMesh = null;
  let vtStart = null, vtList = null;
  let vNrm = null, faceN = null, vAcc = null, boundaryLoop = null, svVert = null, uVert = null;
  let scalarMin = 0, scalarMax = 1, colorModeStored = 0;

  // Surface GPU buffers (non-indexed triangle soup: top + bottom + rim)
  let surfaceCornerCount = 0;
  let surfacePosF = null, surfaceNrmF = null, surfaceAuxF = null;
  let surfacePosBuffer = null, surfaceNrmBuffer = null, surfaceAuxBuffer = null;

  // Tube GPU buffers (indexed)
  let tubeIndexCount = 0;
  let tubePosF = null, tubeNrmF = null;
  let tubePosBuffer = null, tubeNrmBuffer = null, tubeIndexBuffer = null;

  // Wireframe GPU buffers
  let wireIndexCount = 0;
  let wirePosF = null, wirePosBuffer = null, wireIndexBuffer = null;

  // Texture state
  let msaaColorTex = null;
  let peelDepthTextures = [], layerTextures = [];
  let peelBindGroups = [], compositeBindGroups = [];
  let texW = 0, texH = 0;

  function initMesh(model, initialPos, thickness) {
    nuMesh = model.nu; nvMesh = model.nv;
    NvMesh = model.Nv; nTMesh = model.nT;
    trisMesh = model.tris;

    const count = new Int32Array(NvMesh);
    for (let t = 0; t < nTMesh * 3; t++) count[trisMesh[t]]++;
    vtStart = new Int32Array(NvMesh + 1);
    for (let v = 0; v < NvMesh; v++) vtStart[v + 1] = vtStart[v] + count[v];
    vtList = new Int32Array(nTMesh * 3);
    const cursor = vtStart.slice(0, NvMesh);
    for (let t = 0; t < nTMesh; t++)
      for (let c = 0; c < 3; c++) { const v = trisMesh[t * 3 + c]; vtList[cursor[v]++] = t; }

    vNrm = new Float64Array(NvMesh * 3);
    vAcc = new Float64Array(NvMesh * 3);
    faceN = new Float64Array(nTMesh * 3);

    // Width (sv) parameter per vertex
    svVert = new Float32Array(NvMesh);
    for (let v = 0; v < NvMesh; v++) svVert[v] = model.vertexUV[v * 2 + 1];

    const nu = nuMesh, nv = nvMesh;

    // Length parameter per vertex: u = i / nu around the centerline, periodic.
    // The hero's two-tone face coloring is replaced by a cyclic palette of u, so
    // a continuous loop of color runs along the strip (palette(0) == palette(1)
    // closes it across the seam) with no jagged triangle edge and no two-sided
    // discontinuity. Vertex v = i*(nv+1) + j, so i = floor(v / (nv+1)).
    uVert = new Float32Array(NvMesh);
    for (let v = 0; v < NvMesh; v++) uVert[v] = Math.floor(v / (nv + 1)) / nu;
    boundaryLoop = new Int32Array(2 * nu);
    for (let i = 0; i < nu; i++) boundaryLoop[i] = i * (nv + 1);
    for (let i = 0; i < nu; i++) boundaryLoop[nu + i] = i * (nv + 1) + nv;

    surfaceCornerCount = 2 * nTMesh * 3 + 12 * nu;
    surfacePosF = new Float32Array(surfaceCornerCount * 3);
    surfaceNrmF = new Float32Array(surfaceCornerCount * 3);
    surfaceAuxF = new Float32Array(surfaceCornerCount * 3);
    surfacePosBuffer = device.createBuffer({
      size: surfacePosF.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    surfaceNrmBuffer = device.createBuffer({
      size: surfaceNrmF.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    surfaceAuxBuffer = device.createBuffer({
      size: surfaceAuxF.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const tubeVertCount = nu * TUBE_SEGS;
    tubeIndexCount = nu * TUBE_SEGS * 6;
    tubePosF = new Float32Array(tubeVertCount * 3);
    tubeNrmF = new Float32Array(tubeVertCount * 3);
    const tubeIdx = new Uint32Array(tubeIndexCount);
    let idx = 0;
    for (let i = 0; i < nu; i++) {
      const next = (i + 1) % nu;
      // At the seam (last ring back to first), shift by TUBE_SEGS/2 to account
      // for the Möbius half-twist accumulated by the parallel-transport frame.
      const seam = next === 0 ? TUBE_SEGS >>> 1 : 0;
      for (let s = 0; s < TUBE_SEGS; s++) {
        const sn = (s + 1) % TUBE_SEGS;
        const a = i * TUBE_SEGS + s;
        const b = next * TUBE_SEGS + ((s  + seam) % TUBE_SEGS);
        const c = next * TUBE_SEGS + ((sn + seam) % TUBE_SEGS);
        const d = i * TUBE_SEGS + sn;
        tubeIdx[idx++] = a; tubeIdx[idx++] = b; tubeIdx[idx++] = c;
        tubeIdx[idx++] = a; tubeIdx[idx++] = c; tubeIdx[idx++] = d;
      }
    }
    tubePosBuffer = device.createBuffer({
      size: tubePosF.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    tubeNrmBuffer = device.createBuffer({
      size: tubeNrmF.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    tubeIndexBuffer = device.createBuffer({
      size: tubeIdx.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(tubeIndexBuffer, 0, tubeIdx);

    // Unique undirected edges from the glued connectivity for wireframe.
    {
      const eset = new Set();
      const edges = [];
      for (let t = 0; t < nTMesh; t++) {
        const a = trisMesh[t*3], b = trisMesh[t*3+1], c = trisMesh[t*3+2];
        for (const [p, q] of [[a,b],[b,c],[c,a]]) {
          const lo = Math.min(p,q), hi = Math.max(p,q), key = lo * NvMesh + hi;
          if (!eset.has(key)) { eset.add(key); edges.push(lo, hi); }
        }
      }
      const wire = new Uint32Array(edges);
      wireIndexCount = wire.length;
      wirePosF = new Float32Array(NvMesh * 3);
      wirePosBuffer = device.createBuffer({ size: wirePosF.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      wireIndexBuffer = device.createBuffer({ size: wire.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
      device.queue.writeBuffer(wireIndexBuffer, 0, wire);
    }

    _rebuild(initialPos, null, 0, thickness);
  }

  function _rebuild(femPos, femScalar, colorMode, thickness, range) {
    const nu = nuMesh, nv = nvMesh, nT = nTMesh, Nv = NvMesh;
    const tris = trisMesh;
    const hh = thickness / 2;

    // Per-triangle face normals (unnormalized, area-weighted)
    for (let t = 0; t < nT; t++) {
      const a = tris[t * 3] * 3, b = tris[t * 3 + 1] * 3, c = tris[t * 3 + 2] * 3;
      const ux = femPos[b]-femPos[a], uy = femPos[b+1]-femPos[a+1], uz = femPos[b+2]-femPos[a+2];
      const vx = femPos[c]-femPos[a], vy = femPos[c+1]-femPos[a+1], vz = femPos[c+2]-femPos[a+2];
      faceN[t*3] = uy*vz-uz*vy; faceN[t*3+1] = uz*vx-ux*vz; faceN[t*3+2] = ux*vy-uy*vx;
    }

    // Smooth per-vertex normals. A central difference in parameter space (u,v)
    // gives a globally-consistent normal even across the non-orientable seam
    // (the u-neighbor crosses with j→nv-j at i=0 and i=nu-1), but on the
    // staggered brick lattice the dv stencil is sampled half a cell off in u on
    // alternating rows, which produces row-aligned striations. So use the
    // central-difference normal only as a per-vertex SIGN reference, and take the
    // actual smooth normal from the area-weighted average of the incident face
    // normals (exact per triangle, so stagger-agnostic), each flipped to agree
    // with that reference. This keeps the seam consistency and removes the
    // striations.
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j <= nv; j++) {
        const v = i*(nv+1)+j;
        const jFlip = nv - j;
        const iM = (i - 1 + nu) % nu, iP = (i + 1) % nu;
        const jM = (i === 0)    ? jFlip : j;
        const jP = (i === nu-1) ? jFlip : j;
        const vM = iM*(nv+1)+jM, vP = iP*(nv+1)+jP;
        const dux = femPos[vP*3]-femPos[vM*3], duy = femPos[vP*3+1]-femPos[vM*3+1], duz = femPos[vP*3+2]-femPos[vM*3+2];
        const jd = j > 0 ? j-1 : j, ju = j < nv ? j+1 : j;
        const vD = i*(nv+1)+jd, vU = i*(nv+1)+ju;
        const dvx = femPos[vU*3]-femPos[vD*3], dvy = femPos[vU*3+1]-femPos[vD*3+1], dvz = femPos[vU*3+2]-femPos[vD*3+2];
        let nx = duy*dvz-duz*dvy, ny = duz*dvx-dux*dvz, nz = dux*dvy-duy*dvx;
        const m = Math.hypot(nx, ny, nz) || 1;
        vNrm[v*3] = nx/m; vNrm[v*3+1] = ny/m; vNrm[v*3+2] = nz/m; // sign reference
      }
    }
    // Scatter sign-corrected face normals to their vertices.
    vAcc.fill(0);
    for (let t = 0; t < nT; t++) {
      const fx = faceN[t*3], fy = faceN[t*3+1], fz = faceN[t*3+2];
      for (let c = 0; c < 3; c++) {
        const v = tris[t*3+c], p = v*3;
        const s = (fx*vNrm[p] + fy*vNrm[p+1] + fz*vNrm[p+2]) < 0 ? -1 : 1;
        vAcc[p] += s*fx; vAcc[p+1] += s*fy; vAcc[p+2] += s*fz;
      }
    }
    for (let v = 0; v < Nv; v++) {
      const p = v*3;
      let nx = vAcc[p], ny = vAcc[p+1], nz = vAcc[p+2];
      const m = Math.hypot(nx, ny, nz);
      if (m > 1e-30) { vNrm[p] = nx/m; vNrm[p+1] = ny/m; vNrm[p+2] = nz/m; }
      // else keep the central-difference reference already in vNrm
    }

    // Scalar range for the colormap. An explicit `range` (from the legend, or
    // the peak deflection of an animated mode) holds the scale fixed across
    // frames; otherwise it is taken from the field's own min/max. Any symmetry
    // (e.g. a signed field centered on zero) is the caller's choice, baked into
    // the `range` it passes.
    if (femScalar && colorMode > 0) {
      if (range) {
        scalarMin = range[0];
        scalarMax = range[1] > range[0] ? range[1] : range[0] + 1e-20;
      } else {
        let lo = Infinity, hi = -Infinity;
        for (let v = 0; v < Nv; v++) {
          const sv = femScalar[v];
          if (sv < lo) lo = sv;
          if (sv > hi) hi = sv;
        }
        if (!isFinite(lo)) { lo = 0; hi = 1; }
        else if (!(hi > lo)) hi = lo + 1e-20;
        scalarMin = lo; scalarMax = hi;
      }
    } else {
      scalarMin = 0; scalarMax = 1;
    }
    colorModeStored = colorMode;

    let o3 = 0, o2 = 0;

    const NVcol = nv + 1;
    // Seam col-0 vertices are placed at -(1-seamDelta)*hh*n instead of +hh*n.
    // This keeps seam triangles non-crossing (both ends near the same offset side)
    // while breaking the exact depth coincidence with the opposite surface's
    // adjacent triangles that the strict negation would cause.
    const seamDelta = 0.01;

    for (let t = 0; t < nT; t++) {
      const v0=tris[t*3],v1=tris[t*3+1],v2=tris[t*3+2];
      const isSeam = (v0<NVcol||v1<NVcol||v2<NVcol) &&
                     (v0>=(nu-1)*NVcol||v1>=(nu-1)*NVcol||v2>=(nu-1)*NVcol);
      for (let c = 0; c < 3; c++) {
        const v = tris[t*3+c], p = v*3;
        const seamCol0 = isSeam && v < NVcol;
        const posS = seamCol0 ? -(1 - seamDelta) : 1;
        const s = seamCol0 ? -1 : 1;
        const rx = vNrm[p], ry = vNrm[p+1], rz = vNrm[p+2];
        surfacePosF[o3] = femPos[p]+hh*posS*rx; surfacePosF[o3+1] = femPos[p+1]+hh*posS*ry; surfacePosF[o3+2] = femPos[p+2]+hh*posS*rz;
        surfaceNrmF[o3] = s*rx; surfaceNrmF[o3+1] = s*ry; surfaceNrmF[o3+2] = s*rz;
        // Loop parameter for the cyclic hero palette. Seam col-0 vertices get
        // u = 1 (not 0) so seam triangles interpolate 0.98→1 the short way
        // instead of winding backward through the whole palette.
        surfaceAuxF[o2] = svVert[v]; surfaceAuxF[o2+1] = femScalar ? femScalar[v] : 0;
        surfaceAuxF[o2+2] = seamCol0 ? 1.0 : uVert[v];
        o3 += 3; o2 += 3;
      }
    }

    for (let t = 0; t < nT; t++) {
      const v0=tris[t*3],v1=tris[t*3+1],v2=tris[t*3+2];
      const isSeam = (v0<NVcol||v1<NVcol||v2<NVcol) &&
                     (v0>=(nu-1)*NVcol||v1>=(nu-1)*NVcol||v2>=(nu-1)*NVcol);
      for (let c = 0; c < 3; c++) {
        const v = tris[t*3+c], p = v*3;
        const seamCol0 = isSeam && v < NVcol;
        const posS = seamCol0 ? -(1 - seamDelta) : 1;
        const s = seamCol0 ? -1 : 1;
        const rx = vNrm[p], ry = vNrm[p+1], rz = vNrm[p+2];
        surfacePosF[o3] = femPos[p]-hh*posS*rx; surfacePosF[o3+1] = femPos[p+1]-hh*posS*ry; surfacePosF[o3+2] = femPos[p+2]-hh*posS*rz;
        surfaceNrmF[o3] = -s*rx; surfaceNrmF[o3+1] = -s*ry; surfaceNrmF[o3+2] = -s*rz;
        surfaceAuxF[o2] = svVert[v]; surfaceAuxF[o2+1] = femScalar ? femScalar[v] : 0;
        surfaceAuxF[o2+2] = seamCol0 ? 1.0 : uVert[v];
        o3 += 3; o2 += 3;
      }
    }

    // Rim quads along the single Möbius boundary
    const nBound = 2 * nu;
    for (let k = 0; k < nBound; k++) {
      const ka = boundaryLoop[k], kb = boundaryLoop[(k + 1) % nBound];
      const pa = ka*3, pb = kb*3;
      const nax = vNrm[pa], nay = vNrm[pa+1], naz = vNrm[pa+2];
      let nbx = vNrm[pb], nby = vNrm[pb+1], nbz = vNrm[pb+2];
      // At the seam junction na and nb are anti-aligned — flip nb for consistent rim.
      if (nbx*nax + nby*nay + nbz*naz < 0) { nbx=-nbx; nby=-nby; nbz=-nbz; }

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
      const svMid = (svVert[ka] + svVert[kb]) / 2;
      // Loop parameter along the rim, matching the surface palette. Unwrap kb
      // relative to ka so a quad straddling the seam interpolates the short way
      // (the cyclic palette handles the out-of-[0,1] value).
      const ua = uVert[ka];
      let ub = uVert[kb];
      if (ub - ua > 0.5) ub -= 1; else if (ua - ub > 0.5) ub += 1;

      const corners = [
        aTopX,aTopY,aTopZ, bTopX,bTopY,bTopZ, bBotX,bBotY,bBotZ,
        aTopX,aTopY,aTopZ, bBotX,bBotY,bBotZ, aBotX,aBotY,aBotZ,
      ];
      // Per-corner loop parameter: a-corners take ua, b-corners take ub.
      const cornerU = [ua, ub, ub, ua, ub, ua];
      for (let j = 0; j < 6; j++, o3 += 3, o2 += 3) {
        surfacePosF[o3] = corners[j*3]; surfacePosF[o3+1] = corners[j*3+1]; surfacePosF[o3+2] = corners[j*3+2];
        surfaceNrmF[o3] = rnx; surfaceNrmF[o3+1] = rny; surfaceNrmF[o3+2] = rnz;
        surfaceAuxF[o2] = svMid; surfaceAuxF[o2+1] = 0; surfaceAuxF[o2+2] = cornerU[j];
      }
    }

    // Centerline tube: parallel-transport frame anchored to the surface normal.
    // This avoids the sudden flip caused by the mesh's width-direction spanning the seam.
    //
    // The true centerline is at v = 0, the half-twist's fixed line. For even nv
    // that is the integer row nv/2; for odd nv it lies *between* rows j0 =
    // floor(nv/2) and j1 = ceil(nv/2). Those two rows are seam partners (j0 + j1
    // = nv, and the seam maps row j -> nv - j), so averaging them lands exactly
    // on the center and closes smoothly across the seam. Snapping to a single
    // integer row instead jumps to its partner row at the seam -> a kink.
    const j0 = Math.floor(nv / 2), j1 = Math.ceil(nv / 2);
    const centerInto = (out, ii, arr) => {
      const a = (ii * (nv + 1) + j0) * 3, b = (ii * (nv + 1) + j1) * 3;
      out[0] = 0.5 * (arr[a] + arr[b]);
      out[1] = 0.5 * (arr[a + 1] + arr[b + 1]);
      out[2] = 0.5 * (arr[a + 2] + arr[b + 2]);
    };
    const _c = [0, 0, 0], _cp = [0, 0, 0], _cn = [0, 0, 0], _cN = [0, 0, 0];
    const tubeRadius = 0.022;
    let prevNx = 0, prevNy = 0, prevNz = 0;

    for (let i = 0; i < nu; i++) {
      centerInto(_c, i, femPos);
      const cx = _c[0], cy = _c[1], cz = _c[2];

      // Tangent: central difference along centerline
      const ip = (i - 1 + nu) % nu, in_ = (i + 1) % nu;
      centerInto(_cp, ip, femPos);
      centerInto(_cn, in_, femPos);
      const tx = _cn[0]-_cp[0], ty = _cn[1]-_cp[1], tz = _cn[2]-_cp[2];
      const tl = Math.hypot(tx, ty, tz) || 1;
      const Tx=tx/tl, Ty=ty/tl, Tz=tz/tl;

      // Frame normal: smooth surface normal at centerline, orthogonalized against T
      centerInto(_cN, i, vNrm);
      let Nx = _cN[0], Ny = _cN[1], Nz = _cN[2];
      const ndt = Nx*Tx + Ny*Ty + Nz*Tz;
      Nx -= ndt*Tx; Ny -= ndt*Ty; Nz -= ndt*Tz;
      const nl = Math.hypot(Nx, Ny, Nz) || 1;
      Nx /= nl; Ny /= nl; Nz /= nl;

      // Parallel transport: keep N aligned with the previous frame to prevent inversion.
      // The TUBE_SEGS/2 seam shift in the index buffer handles the accumulated half-twist.
      if (i > 0 && Nx*prevNx + Ny*prevNy + Nz*prevNz < 0) {
        Nx = -Nx; Ny = -Ny; Nz = -Nz;
      }
      prevNx = Nx; prevNy = Ny; prevNz = Nz;

      // Binormal = T × N
      const Bx=Ty*Nz-Tz*Ny, By=Tz*Nx-Tx*Nz, Bz=Tx*Ny-Ty*Nx;

      for (let s = 0; s < TUBE_SEGS; s++) {
        const angle = (s / TUBE_SEGS) * 2 * Math.PI;
        const ca = Math.cos(angle), sa = Math.sin(angle);
        const nx = ca*Nx + sa*Bx, ny = ca*Ny + sa*By, nz = ca*Nz + sa*Bz;
        const base = (i * TUBE_SEGS + s) * 3;
        tubePosF[base]   = cx + tubeRadius*nx;
        tubePosF[base+1] = cy + tubeRadius*ny;
        tubePosF[base+2] = cz + tubeRadius*nz;
        tubeNrmF[base]   = nx; tubeNrmF[base+1] = ny; tubeNrmF[base+2] = nz;
      }
    }

    for (let i = 0; i < Nv * 3; i++) wirePosF[i] = femPos[i];

    device.queue.writeBuffer(surfacePosBuffer, 0, surfacePosF);
    device.queue.writeBuffer(surfaceNrmBuffer, 0, surfaceNrmF);
    device.queue.writeBuffer(surfaceAuxBuffer, 0, surfaceAuxF);
    device.queue.writeBuffer(tubePosBuffer, 0, tubePosF);
    device.queue.writeBuffer(tubeNrmBuffer, 0, tubeNrmF);
    device.queue.writeBuffer(wirePosBuffer, 0, wirePosF);
  }

  function update(femPos, femScalar, colorMode, thickness, range) {
    if (!trisMesh) return;
    _rebuild(femPos, femScalar, colorMode, thickness, range);
  }

  function ensureTextures(w, h) {
    if (texW === w && texH === h) return;

    if (msaaColorTex) msaaColorTex.destroy();
    for (const t of peelDepthTextures) t.destroy();
    for (const t of layerTextures) t.destroy();
    msaaColorTex = null;
    peelDepthTextures = []; layerTextures = [];
    peelBindGroups = []; compositeBindGroups = [];

    msaaColorTex = device.createTexture({
      size: [w, h], sampleCount: SAMPLES, format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    for (let i = 0; i < 2; i++) {
      peelDepthTextures.push(device.createTexture({
        size: [w, h], sampleCount: SAMPLES, format: 'depth32float',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      }));
    }
    for (let i = 0; i < MAX_LAYERS; i++) {
      layerTextures.push(device.createTexture({
        size: [w, h], format: 'rgba8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      }));
    }

    const depthBGLDerived = surfacePeelPipeline.getBindGroupLayout(1);
    for (let i = 0; i < 2; i++) {
      peelBindGroups.push(device.createBindGroup({
        layout: depthBGLDerived,
        entries: [{ binding: 0, resource: peelDepthTextures[i].createView() }],
      }));
    }

    const compBGLDerived = compositePipeline.getBindGroupLayout(0);
    for (let i = 0; i < MAX_LAYERS; i++) {
      compositeBindGroups.push(device.createBindGroup({
        layout: compBGLDerived,
        entries: [{ binding: 0, resource: layerTextures[i].createView() }],
      }));
    }

    texW = w; texH = h;
  }

  const uniformStaging = new ArrayBuffer(UNIFORM_BYTES);
  const uniformF32 = new Float32Array(uniformStaging);

  function render(gpuContext, params, camera, w, h, dirty) {
    const { view, projection, eye, dirty: camDirty } = camera.update(w / h);
    if (!camDirty && !dirty) return false;
    if (!surfacePosBuffer) return false;

    const eyeDist = Math.hypot(eye[0], eye[1], eye[2]);
    const R = 12;
    const near = Math.max(eyeDist - R, eyeDist * 0.01, 1e-3);
    const far = eyeDist + R;
    const ri = 1 / (near - far);
    projection[10] = far * ri;
    projection[14] = near * far * ri;

    uniformF32.set(projection, 0);
    uniformF32.set(view, 16);
    uniformF32[32] = eye[0]; uniformF32[33] = eye[1]; uniformF32[34] = eye[2];
    uniformF32[35] = typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1;
    uniformF32[36] = params.opacity ?? 0.82;
    uniformF32[37] = params.specular ?? 1.0;
    uniformF32[38] = scalarMin;
    uniformF32[39] = scalarMax;
    uniformF32[40] = colorModeStored;
    device.queue.writeBuffer(uniformBuffer, 0, uniformStaging);

    let colorTex;
    try { colorTex = gpuContext.getCurrentTexture(); } catch { return false; }

    const numLayers = Math.min(params.peelLayers ?? 4, MAX_LAYERS);
    // Centerline tube is decorative for the FEM surface (unlike the analytic
    // method, where it is the defining curve), so it is off unless requested.
    const drawTube = (params.showCenterline ?? false) && tubeIndexCount > 0;
    ensureTextures(w, h);

    const enc = device.createCommandEncoder();

    // Layer 0: first depth peel (front-most fragments)
    {
      const pass = enc.beginRenderPass({
        colorAttachments: [{
          view: msaaColorTex.createView(),
          resolveTarget: layerTextures[0].createView(),
          clearValue: { r:0,g:0,b:0,a:0 }, loadOp: 'clear', storeOp: 'discard',
        }],
        depthStencilAttachment: { view: peelDepthTextures[0].createView(), depthClearValue: 1.0, depthLoadOp: 'clear', depthStoreOp: 'store' },
      });
      pass.setBindGroup(0, uniformBindGroup);
      pass.setPipeline(surfaceFirstPipeline);
      pass.setVertexBuffer(0, surfacePosBuffer);
      pass.setVertexBuffer(1, surfaceNrmBuffer);
      pass.setVertexBuffer(2, surfaceAuxBuffer);
      pass.draw(surfaceCornerCount);
      if (drawTube) {
        pass.setPipeline(tubeFirstPipeline);
        pass.setVertexBuffer(0, tubePosBuffer);
        pass.setVertexBuffer(1, tubeNrmBuffer);
        pass.setIndexBuffer(tubeIndexBuffer, 'uint32');
        pass.drawIndexed(tubeIndexCount);
      }
      pass.end();
    }

    // Subsequent peel layers
    for (let layer = 1; layer < numLayers; layer++) {
      const prevD = (layer - 1) % 2, currD = layer % 2;
      const pass = enc.beginRenderPass({
        colorAttachments: [{
          view: msaaColorTex.createView(),
          resolveTarget: layerTextures[layer].createView(),
          clearValue: { r:0,g:0,b:0,a:0 }, loadOp: 'clear', storeOp: 'discard',
        }],
        depthStencilAttachment: { view: peelDepthTextures[currD].createView(), depthClearValue: 1.0, depthLoadOp: 'clear', depthStoreOp: 'store' },
      });
      pass.setBindGroup(0, uniformBindGroup);
      pass.setBindGroup(1, peelBindGroups[prevD]);
      pass.setPipeline(surfacePeelPipeline);
      pass.setVertexBuffer(0, surfacePosBuffer);
      pass.setVertexBuffer(1, surfaceNrmBuffer);
      pass.setVertexBuffer(2, surfaceAuxBuffer);
      pass.draw(surfaceCornerCount);
      if (drawTube) {
        pass.setPipeline(tubePeelPipeline);
        pass.setVertexBuffer(0, tubePosBuffer);
        pass.setVertexBuffer(1, tubeNrmBuffer);
        pass.setIndexBuffer(tubeIndexBuffer, 'uint32');
        pass.drawIndexed(tubeIndexCount);
      }
      pass.end();
    }

    // Composite layers back-to-front onto the swap chain
    for (let layer = numLayers - 1; layer >= 0; layer--) {
      const pass = enc.beginRenderPass({
        colorAttachments: [{
          view: colorTex.createView(),
          clearValue: layer === numLayers - 1 ? { r: 0, g: 0, b: 0, a: 0 } : undefined,
          loadOp: layer === numLayers - 1 ? 'clear' : 'load',
          storeOp: 'store',
        }],
      });
      pass.setPipeline(compositePipeline);
      pass.setBindGroup(0, compositeBindGroups[layer]);
      pass.draw(3);
      pass.end();
    }

    if (params.wireframe && wirePosBuffer && wireIndexBuffer) {
      const pass = enc.beginRenderPass({
        colorAttachments: [{
          view: colorTex.createView(),
          loadOp: 'load',
          storeOp: 'store',
        }],
      });
      pass.setPipeline(wirePipeline);
      pass.setBindGroup(0, uniformBindGroup);
      pass.setVertexBuffer(0, wirePosBuffer);
      pass.setIndexBuffer(wireIndexBuffer, 'uint32');
      pass.drawIndexed(wireIndexCount);
      pass.end();
    }

    device.queue.submit([enc.finish()]);
    return true;
  }

  return { initMesh, update, render, setColormap };
}
