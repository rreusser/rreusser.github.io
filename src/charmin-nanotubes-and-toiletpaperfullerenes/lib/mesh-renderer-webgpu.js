// WebGPU mesh renderer for trivalent graphs
// All geometry (faces, edges, vertices) goes through the depth-peel pipeline
// so that opaque edges/vertices correctly occlude transparent faces at all depths.
//
// Algorithm:
//   Layer 0 — "first pass": all geometry, standard depth test + write
//   Layer N — "peel pass" : all geometry, discard z <= prevDepth (expose next layer)
//   Composite: blend layers back-to-front onto canvas

// ─── Topology cache ──────────────────────────────────────────────────────────

const meshTopologyCache = new WeakMap();

function getOrUpdateTopologyCache(mesh) {
  let cache = meshTopologyCache.get(mesh);
  if (cache && cache.vertexCount === mesh.vertexCount && cache.edgeCount === mesh.edgeCount) {
    return cache;
  }
  const faces = mesh.extractFaces();
  let totalTriangles = 0;
  for (const face of faces) {
    if (face.length >= 3) totalTriangles += face.length - 2;
  }
  const triangleVertexIndices = new Uint32Array(totalTriangles * 3);
  const triangleEdgeCounts    = new Float32Array(totalTriangles * 3);
  let triIdx = 0;
  for (const face of faces) {
    if (face.length < 3) continue;
    const n = face.length, v0 = face[0];
    for (let i = 1; i < n - 1; i++) {
      const base = triIdx * 3;
      triangleVertexIndices[base]     = v0;
      triangleVertexIndices[base + 1] = face[i];
      triangleVertexIndices[base + 2] = face[i + 1];
      triangleEdgeCounts[base] = triangleEdgeCounts[base+1] = triangleEdgeCounts[base+2] = n;
      triIdx++;
    }
  }
  cache = { vertexCount: mesh.vertexCount, edgeCount: mesh.edgeCount,
            triangleCount: totalTriangles, triangleVertexIndices, triangleEdgeCounts };
  meshTopologyCache.set(mesh, cache);
  return cache;
}

// ─── Buffer helper ────────────────────────────────────────────────────────────

function ensureBuffer(device, old, neededBytes, usage, label) {
  if (old && old.size >= neededBytes) return { buf: old };
  if (old) old.destroy();
  const size = Math.max(neededBytes * 2, 64);
  return { buf: device.createBuffer({ label, size, usage }) };
}

// ─── WGSL snippets ────────────────────────────────────────────────────────────

const UNIFORMS_WGSL = /* wgsl */`
struct Uniforms {
  projectionView : mat4x4f,
  eye            : vec3f,
  _pad0          : f32,
  aspect         : f32,
  pixelRatio     : f32,
  lineWidth      : f32,
  borderWidth    : f32,
  pointSize      : f32,
  opacity        : f32,
  viewportH      : f32,
  faceShading    : f32,
};
@group(0) @binding(0) var<uniform> u : Uniforms;
`;

// Peel test used by the peel-pass variant of every pipeline.
// group(1) binding(0) is the previous layer's depth texture.
const PEEL_TEST_WGSL = /* wgsl */`
@group(1) @binding(0) var prevDepthTex : texture_depth_2d;

fn peelDiscard(fragPos: vec4f) {
  let prev = textureLoad(prevDepthTex, vec2i(fragPos.xy), 0);
  if (fragPos.z <= prev + 1e-5) { discard; }
}
`;

const FACE_COLOR_WGSL = /* wgsl */`
fn faceColor(edges: f32) -> vec3f {
  if (edges < 3.5) { return vec3f(1.0, 0.65, 0.25); }
  if (edges < 4.5) { return vec3f(1.0, 0.70, 0.45); }
  if (edges < 5.5) { return vec3f(0.45, 0.75, 1.0); }
  if (edges < 6.5) { return vec3f(1.0, 0.75, 0.35); }
  if (edges < 7.5) { return vec3f(1.0, 0.50, 0.55); }
  return vec3f(0.75, 0.60, 1.0);
}
`;

// ─── Main factory ─────────────────────────────────────────────────────────────

export function createMeshRenderer(device, canvasFormat, icosphere) {

  const UNIFORM_SIZE   = 128;  // see UNIFORMS_WGSL (padded to 16-byte multiple)
  const MAX_PEEL_LAYERS = 4;
  const LAYER_FORMAT    = 'rgba8unorm';
  const DEPTH_FORMAT    = 'depth32float';

  // ── Bind group layouts ─────────────────────────────────────────────────────

  const uniformBGL = device.createBindGroupLayout({
    label: 'uniform-bgl',
    entries: [{ binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: 'uniform' } }],
  });

  const prevDepthBGL = device.createBindGroupLayout({
    label: 'prev-depth-bgl',
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT,
                texture: { sampleType: 'depth' } }],
  });

  const layerBGL = device.createBindGroupLayout({
    label: 'layer-bgl',
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT,
                texture: { sampleType: 'float' } }],
  });

  const firstLayout = device.createPipelineLayout({ bindGroupLayouts: [uniformBGL] });
  const peelLayout  = device.createPipelineLayout({ bindGroupLayouts: [uniformBGL, prevDepthBGL] });

  // ── Uniform buffer ─────────────────────────────────────────────────────────

  const uniformBuffer = device.createBuffer({
    label: 'uniforms', size: UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const uniformBG = device.createBindGroup({
    label: 'uniform-bg', layout: uniformBGL,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  // ── Depth stencil state shared by peel pipelines ───────────────────────────

  const peelDS = { depthWriteEnabled: true, depthCompare: 'less', format: DEPTH_FORMAT };

  // ── Face pipelines ─────────────────────────────────────────────────────────

  // Buffer layout: [ px py pz  nx ny nz  edgeCount ]  — 7 floats = 28 bytes per vertex
  const faceVtxBuffers = [{
    arrayStride: 28,
    attributes: [
      { shaderLocation: 0, offset: 0,  format: 'float32x3' },  // position
      { shaderLocation: 1, offset: 12, format: 'float32x3' },  // normal
      { shaderLocation: 2, offset: 24, format: 'float32'   },  // edgeCount
    ],
  }];

  const faceVSModule = device.createShaderModule({ label: 'face-vs', code: /* wgsl */`
    ${UNIFORMS_WGSL}
    struct VOut {
      @builtin(position) pos      : vec4f,
      @location(0)       edgeCount: f32,
      @location(1)       vNormal  : vec3f,
      @location(2)       vPosition: vec3f,
    };
    @vertex fn main(
      @location(0) position : vec3f,
      @location(1) normal   : vec3f,
      @location(2) edgeCount: f32,
    ) -> VOut {
      var o: VOut;
      o.pos       = u.projectionView * vec4f(position, 1.0);
      o.edgeCount = edgeCount;
      o.vNormal   = normal;
      o.vPosition = position;
      return o;
    }
  `});

  // Fragment shader body for faces (shared between first and peel variants)
  const faceFSBody = /* wgsl */`
    ${FACE_COLOR_WGSL}

    fn toLinear(c: vec3f) -> vec3f { return pow(c, vec3f(2.2)); }
    fn toSRGB(c: vec3f)   -> vec3f { return pow(c, vec3f(1.0 / 2.2)); }

    fn faceFragment(edgeCount: f32, vNormal: vec3f, vPosition: vec3f) -> vec4f {
      let baseColor = faceColor(edgeCount);

      if (u.faceShading < 0.5) {
        // Flat unlit — pre-multiplied alpha
        return vec4f(baseColor * u.opacity, u.opacity);
      }

      // Blinn-Phong + Fresnel rim, mirroring the original REGL renderer
      let linBase = toLinear(baseColor);
      let N = normalize(vNormal);
      let V = normalize(u.eye - vPosition);
      // Key light slightly above and to the right of the camera
      let L = normalize(u.eye + vec3f(5.0, 8.0, 2.0) - vPosition);
      let H = normalize(L + V);

      let NdotL = abs(dot(N, L));
      let NdotV = abs(dot(N, V));
      let NdotH = abs(dot(N, H));

      let ambient  = 0.4;
      let diffuse  = 0.5 * NdotL;
      let specular = 0.6 * pow(NdotH, 64.0);

      let fresnel1 = pow(1.0 - NdotV, 2.0);
      let fresnel2 = pow(1.0 - NdotV, 4.0);
      let fresnel3 = pow(1.0 - NdotV, 8.0);

      let glowColor = mix(linBase, vec3f(1.0), 0.5);
      let rimColor  = vec3f(1.0, 0.95, 0.9);

      var color = linBase * (ambient + diffuse);
      color += glowColor * fresnel1 * 0.35;
      color += rimColor  * fresnel2 * 0.5;
      color += vec3f(1.0) * fresnel3 * 0.4;
      color += vec3f(1.0) * specular;
      color = toSRGB(clamp(color, vec3f(0.0), vec3f(1.0)));

      return vec4f(color * u.opacity, u.opacity);  // pre-multiplied alpha
    }
  `;

  const faceFirstFS = device.createShaderModule({ label: 'face-first-fs', code: /* wgsl */`
    ${UNIFORMS_WGSL}
    ${faceFSBody}
    @fragment fn main(
      @location(0) edgeCount: f32,
      @location(1) vNormal  : vec3f,
      @location(2) vPosition: vec3f,
    ) -> @location(0) vec4f {
      return faceFragment(edgeCount, vNormal, vPosition);
    }
  `});

  const facePeelFS = device.createShaderModule({ label: 'face-peel-fs', code: /* wgsl */`
    ${UNIFORMS_WGSL}
    ${PEEL_TEST_WGSL}
    ${faceFSBody}
    @fragment fn main(
      @builtin(position) pos      : vec4f,
      @location(0)       edgeCount: f32,
      @location(1)       vNormal  : vec3f,
      @location(2)       vPosition: vec3f,
    ) -> @location(0) vec4f {
      peelDiscard(pos);
      return faceFragment(edgeCount, vNormal, vPosition);
    }
  `});

  function makeFacePipeline(label, layout, fsModule) {
    return device.createRenderPipeline({
      label, layout,
      vertex:   { module: faceVSModule, entryPoint: 'main', buffers: faceVtxBuffers },
      fragment: { module: fsModule, entryPoint: 'main', targets: [{ format: LAYER_FORMAT }] },
      primitive:    { topology: 'triangle-list', cullMode: 'none' },
      // Push faces slightly back so edges/vertices render on top without z-fighting
      depthStencil: { ...peelDS, depthBias: 1, depthBiasSlopeScale: 1.0 },
    });
  }

  const faceFirstPipeline = makeFacePipeline('face-first', firstLayout, faceFirstFS);
  const facePeelPipeline  = makeFacePipeline('face-peel',  peelLayout,  facePeelFS);

  // ── Edge pipelines ─────────────────────────────────────────────────────────

  const edgeVSModule = device.createShaderModule({ label: 'edge-vs', code: /* wgsl */`
    ${UNIFORMS_WGSL}
    const QUAD = array<vec2f,6>(
      vec2f(-1,-1), vec2f(1,-1), vec2f(1,1),
      vec2f(-1,-1), vec2f(1,1),  vec2f(-1,1)
    );
    const FEATHER : f32 = 1.5;  // extra px beyond stroke for smooth falloff
    struct VOut {
      @builtin(position) pos    : vec4f,
      @location(0)       vPixDist: f32,  // signed pixel distance from edge centerline
      @location(1)       vSel   : f32,
      @location(2)       vHover : f32,
    };
    @vertex fn main(
      @builtin(vertex_index) vi      : u32,
      @location(0) p0        : vec3f,
      @location(1) p1        : vec3f,
      @location(2) edgeIndex : f32,
      @location(3) selIndex  : f32,
      @location(4) hovIndex  : f32,
    ) -> VOut {
      let corner = QUAD[vi];
      let clip0 = u.projectionView * vec4f(p0, 1.0);
      let clip1 = u.projectionView * vec4f(p1, 1.0);
      let ndc0  = clip0.xy / clip0.w;
      let ndc1  = clip1.xy / clip1.w;
      let alpha = (corner.x + 1.0) * 0.5;
      let clip  = mix(clip0, clip1, alpha);
      let screen0 = ndc0 * vec2f(u.aspect, 1.0);
      let screen1 = ndc1 * vec2f(u.aspect, 1.0);
      let dir    = normalize(screen1 - screen0);
      let nor    = vec2f(-dir.y, dir.x);
      // expand quad by FEATHER pixels beyond the visible stroke
      let halfW  = (u.lineWidth + u.borderWidth + FEATHER) / u.viewportH;
      let ndcNor = nor * vec2f(1.0 / u.aspect, 1.0);
      var out: VOut;
      out.pos      = vec4f(clip.xy + ndcNor * corner.y * halfW * clip.w, clip.zw);
      // interpolate actual pixel distance (positive outward from centerline)
      out.vPixDist = corner.y * (u.lineWidth + u.borderWidth + FEATHER);
      out.vSel     = select(0.0, 1.0, edgeIndex == selIndex);
      out.vHover   = select(0.0, 1.0, edgeIndex == hovIndex);
      return out;
    }
  `});

  // Fragment body for edges (shared between first and peel)
  const edgeFSBody = /* wgsl */`
    const FEATHER : f32 = 1.5;
    fn edgeFragment(vPixDist: f32, vSel: f32, vHover: f32) -> vec4f {
      let d = abs(vPixDist);
      let strokeR = u.lineWidth + u.borderWidth;

      // Smooth outer falloff over the feather region
      let alpha = 1.0 - smoothstep(strokeR - 0.5, strokeR + FEATHER, d);

      // Smooth core/border transition
      let borderT = smoothstep(u.lineWidth - 0.5, u.lineWidth + 0.5, d);

      let baseColor   = vec3f(0.30, 0.30, 0.30);
      let borderColor = vec3f(1.0,  1.0,  1.0);
      let selColor    = vec3f(1.0,  0.0,  0.0);
      let hovColor    = vec3f(0.0,  0.55, 0.0);
      let isHighlit   = max(vSel, vHover);
      var color = mix(baseColor, borderColor, borderT);
      color = mix(color, mix(hovColor, selColor, vSel), isHighlit);
      return vec4f(color * alpha, alpha);  // pre-multiplied alpha
    }
  `;

  const edgeFirstFS = device.createShaderModule({ label: 'edge-first-fs', code: /* wgsl */`
    ${UNIFORMS_WGSL}
    ${edgeFSBody}
    @fragment fn main(
      @location(0) vPixDist: f32, @location(1) vSel: f32, @location(2) vHover: f32,
    ) -> @location(0) vec4f { return edgeFragment(vPixDist, vSel, vHover); }
  `});

  const edgePeelFS = device.createShaderModule({ label: 'edge-peel-fs', code: /* wgsl */`
    ${UNIFORMS_WGSL}
    ${PEEL_TEST_WGSL}
    ${edgeFSBody}
    @fragment fn main(
      @builtin(position) pos: vec4f,
      @location(0) vPixDist: f32, @location(1) vSel: f32, @location(2) vHover: f32,
    ) -> @location(0) vec4f {
      peelDiscard(pos);
      return edgeFragment(vPixDist, vSel, vHover);
    }
  `});

  const edgeInstanceBuffers = [{
    arrayStride: 36, stepMode: 'instance',
    attributes: [
      { shaderLocation: 0, offset: 0,  format: 'float32x3' },
      { shaderLocation: 1, offset: 12, format: 'float32x3' },
      { shaderLocation: 2, offset: 24, format: 'float32'   },
      { shaderLocation: 3, offset: 28, format: 'float32'   },
      { shaderLocation: 4, offset: 32, format: 'float32'   },
    ],
  }];

  function makeEdgePipeline(label, layout, fsModule) {
    return device.createRenderPipeline({
      label, layout,
      vertex:   { module: edgeVSModule, entryPoint: 'main', buffers: edgeInstanceBuffers },
      fragment: { module: fsModule, entryPoint: 'main', targets: [{ format: LAYER_FORMAT }] },
      primitive:    { topology: 'triangle-list' },
      depthStencil: peelDS,
    });
  }

  const edgeFirstPipeline = makeEdgePipeline('edge-first', firstLayout, edgeFirstFS);
  const edgePeelPipeline  = makeEdgePipeline('edge-peel',  peelLayout,  edgePeelFS);

  // ── Vertex (icosphere) pipelines ───────────────────────────────────────────

  const icoPositions = new Float32Array(icosphere.positions.flat());
  const icoCells     = new Uint16Array(icosphere.cells.flat());
  const icoVertCount = icoCells.length;

  const icoPosBuf = device.createBuffer({
    label: 'ico-positions', size: icoPositions.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(icoPosBuf, 0, icoPositions);

  const icoIdxBuf = device.createBuffer({
    label: 'ico-indices', size: icoCells.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(icoIdxBuf, 0, icoCells);

  const vertVSModule = device.createShaderModule({ label: 'vert-vs', code: /* wgsl */`
    ${UNIFORMS_WGSL}
    struct VOut {
      @builtin(position) pos   : vec4f,
      @location(0)       vSel  : f32,
      @location(1)       vHover: f32,
    };
    @vertex fn main(
      @location(0) icoPos   : vec3f,
      @location(1) center   : vec3f,
      @location(2) vertIndex: f32,
      @location(3) selIndex : f32,
      @location(4) hovIndex : f32,
    ) -> VOut {
      let clip0 = u.projectionView * vec4f(center, 1.0);
      let scale = clip0.w * u.pointSize * 2.0 / u.viewportH;
      let world = center + icoPos * scale;
      var out: VOut;
      out.pos    = u.projectionView * vec4f(world, 1.0);
      out.vSel   = select(0.0, 1.0, vertIndex == selIndex);
      out.vHover = select(0.0, 1.0, vertIndex == hovIndex);
      return out;
    }
  `});

  const vertFSBody = /* wgsl */`
    fn vertFragment(vSel: f32, vHover: f32) -> vec4f {
      let baseColor = vec3f(0.14, 0.37, 0.69);
      let hovColor  = vec3f(0.0,  0.55, 0.0);
      let selColor  = vec3f(1.0,  0.0,  0.0);
      let color = mix(baseColor, mix(hovColor, selColor, vSel), max(vSel, vHover));
      return vec4f(color, 1.0);  // opaque
    }
  `;

  const vertFirstFS = device.createShaderModule({ label: 'vert-first-fs', code: /* wgsl */`
    ${UNIFORMS_WGSL}
    ${vertFSBody}
    @fragment fn main(@location(0) vSel: f32, @location(1) vHover: f32) -> @location(0) vec4f {
      return vertFragment(vSel, vHover);
    }
  `});

  const vertPeelFS = device.createShaderModule({ label: 'vert-peel-fs', code: /* wgsl */`
    ${UNIFORMS_WGSL}
    ${PEEL_TEST_WGSL}
    ${vertFSBody}
    @fragment fn main(
      @builtin(position) pos: vec4f,
      @location(0) vSel: f32, @location(1) vHover: f32,
    ) -> @location(0) vec4f {
      peelDiscard(pos);
      return vertFragment(vSel, vHover);
    }
  `});

  const vertInstanceBuffers = [
    { arrayStride: 12, stepMode: 'vertex',
      attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
    { arrayStride: 24, stepMode: 'instance',
      attributes: [
        { shaderLocation: 1, offset: 0,  format: 'float32x3' },
        { shaderLocation: 2, offset: 12, format: 'float32'   },
        { shaderLocation: 3, offset: 16, format: 'float32'   },
        { shaderLocation: 4, offset: 20, format: 'float32'   },
      ] },
  ];

  function makeVertPipeline(label, layout, fsModule) {
    return device.createRenderPipeline({
      label, layout,
      vertex:   { module: vertVSModule, entryPoint: 'main', buffers: vertInstanceBuffers },
      fragment: { module: fsModule, entryPoint: 'main', targets: [{ format: LAYER_FORMAT }] },
      primitive:    { topology: 'triangle-list', cullMode: 'back' },
      depthStencil: peelDS,
    });
  }

  const vertFirstPipeline = makeVertPipeline('vert-first', firstLayout, vertFirstFS);
  const vertPeelPipeline  = makeVertPipeline('vert-peel',  peelLayout,  vertPeelFS);

  // ── Composite pipeline ─────────────────────────────────────────────────────
  // Blends one layer (pre-multiplied RGBA) over whatever is already in the canvas.

  const compositeModule = device.createShaderModule({ label: 'composite', code: /* wgsl */`
    @group(0) @binding(0) var layerTex: texture_2d<f32>;
    struct VSOut { @builtin(position) pos: vec4f };
    @vertex fn vs(@builtin(vertex_index) vi: u32) -> VSOut {
      var pos = array<vec2f,3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
      return VSOut(vec4f(pos[vi], 0.0, 1.0));
    }
    @fragment fn fs(@builtin(position) fragPos: vec4f) -> @location(0) vec4f {
      return textureLoad(layerTex, vec2i(fragPos.xy), 0);
    }
  `});

  const compositePipeline = device.createRenderPipeline({
    label: 'composite',
    layout: device.createPipelineLayout({ bindGroupLayouts: [layerBGL] }),
    vertex:   { module: compositeModule, entryPoint: 'vs', buffers: [] },
    fragment: { module: compositeModule, entryPoint: 'fs',
                targets: [{ format: canvasFormat,
                  blend: {
                    color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                  } }] },
    primitive: { topology: 'triangle-list' },
  });

  // ── GPU texture resources (resized on demand) ──────────────────────────────

  let peelDepthTextures = [];  // [depth32float × 2] ping-pong
  let layerTextures     = [];  // [rgba8unorm × MAX_PEEL_LAYERS]
  let prevDepthBGs      = [];  // bind group per ping-pong slot
  let layerBGs          = [];  // bind group per layer
  let texW = 0, texH = 0;

  function ensureTextures(W, H) {
    if (texW === W && texH === H) return;
    for (const t of peelDepthTextures) t.destroy();
    for (const t of layerTextures)     t.destroy();
    peelDepthTextures = []; layerTextures = [];
    prevDepthBGs = []; layerBGs = [];

    for (let i = 0; i < 2; i++) {
      const t = device.createTexture({
        label: `peel-depth-${i}`, size: [W, H], format: DEPTH_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      peelDepthTextures.push(t);
      prevDepthBGs.push(device.createBindGroup({
        label: `prev-depth-bg-${i}`, layout: prevDepthBGL,
        entries: [{ binding: 0, resource: t.createView() }],
      }));
    }

    for (let i = 0; i < MAX_PEEL_LAYERS; i++) {
      const t = device.createTexture({
        label: `layer-${i}`, size: [W, H], format: LAYER_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      layerTextures.push(t);
      layerBGs.push(device.createBindGroup({
        label: `layer-bg-${i}`, layout: layerBGL,
        entries: [{ binding: 0, resource: t.createView() }],
      }));
    }

    texW = W; texH = H;
  }

  // ── Mutable geometry buffers ───────────────────────────────────────────────

  let faceVtxBuf  = null;
  let edgeInstBuf = null;
  let vertInstBuf = null;

  // ── Render ─────────────────────────────────────────────────────────────────

  function render(opts) {
    const {
      context,
      projectionView,
      eye             = [0, 0, 20],
      mesh,
      pointSize       = 3,
      edgeWidth       = 2,
      showFaces       = true,
      faceOpacity     = 0.3,
      faceShading     = false,
      selectedVertexIndex = -1,
      hoverVertexIndex    = -1,
      selectedEdgeIndex   = -1,
      hoverEdgeIndex      = -1,
      background      = [1, 1, 1],
    } = opts;

    if (!context || !projectionView || !mesh) return;

    const canvas = context.canvas;
    const W = canvas.width, H = canvas.height;
    const aspect = W / H;

    ensureTextures(W, H);

    // Uniforms
    {
      const d = new Float32Array(UNIFORM_SIZE / 4);
      d.set(projectionView, 0);
      d[16] = eye[0]; d[17] = eye[1]; d[18] = eye[2];
      d[20] = aspect;
      d[21] = window.devicePixelRatio ?? 1;
      d[22] = edgeWidth;
      d[23] = Math.max(edgeWidth * 0.5, 1.5);
      d[24] = pointSize;
      d[25] = faceOpacity;
      d[26] = H;
      d[27] = faceShading ? 1.0 : 0.0;
      device.queue.writeBuffer(uniformBuffer, 0, d);
    }

    const vc = mesh.vertexCount;
    const ec = mesh.edgeCount;

    // Face geometry  [ px py pz  nx ny nz  edgeCount ]  stride=7
    let faceVertCount = 0;
    if (showFaces) {
      const cache = getOrUpdateTopologyCache(mesh);
      faceVertCount = cache.triangleCount * 3;
      const stride = 7;
      const { buf } = ensureBuffer(device, faceVtxBuf, faceVertCount * stride * 4,
        GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, 'face-vtx');
      faceVtxBuf = buf;
      const faceData = new Float32Array(faceVertCount * stride);
      const { triangleVertexIndices: idx, triangleEdgeCounts: ec2, triangleCount } = cache;
      const pos = mesh.positions;
      const nor = faceShading ? mesh.computeVertexNormals() : null;
      for (let t = 0; t < triangleCount; t++) {
        for (let c = 0; c < 3; c++) {
          const vi = idx[t * 3 + c], base = (t * 3 + c) * stride;
          faceData[base]   = pos[vi*3];   faceData[base+1] = pos[vi*3+1]; faceData[base+2] = pos[vi*3+2];
          faceData[base+3] = nor ? nor[vi*3]   : 0;
          faceData[base+4] = nor ? nor[vi*3+1] : 0;
          faceData[base+5] = nor ? nor[vi*3+2] : 1;
          faceData[base+6] = ec2[t*3+c];
        }
      }
      device.queue.writeBuffer(faceVtxBuf, 0, faceData);
    }

    // Edge instance buffer
    {
      const stride = 9;
      const { buf } = ensureBuffer(device, edgeInstBuf, ec * stride * 4,
        GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, 'edge-inst');
      edgeInstBuf = buf;
      const d = new Float32Array(ec * stride);
      const pos = mesh.positions, edges = mesh.edges;
      for (let i = 0; i < ec; i++) {
        const v0 = edges[i*2], v1 = edges[i*2+1], base = i * stride;
        d[base]   = pos[v0*3]; d[base+1] = pos[v0*3+1]; d[base+2] = pos[v0*3+2];
        d[base+3] = pos[v1*3]; d[base+4] = pos[v1*3+1]; d[base+5] = pos[v1*3+2];
        d[base+6] = i; d[base+7] = selectedEdgeIndex; d[base+8] = hoverEdgeIndex;
      }
      device.queue.writeBuffer(edgeInstBuf, 0, d);
    }

    // Vertex instance buffer
    {
      const stride = 6;
      const { buf } = ensureBuffer(device, vertInstBuf, vc * stride * 4,
        GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, 'vert-inst');
      vertInstBuf = buf;
      const d = new Float32Array(vc * stride);
      const pos = mesh.positions;
      for (let i = 0; i < vc; i++) {
        const base = i * stride;
        d[base]   = pos[i*3]; d[base+1] = pos[i*3+1]; d[base+2] = pos[i*3+2];
        d[base+3] = i; d[base+4] = selectedVertexIndex; d[base+5] = hoverVertexIndex;
      }
      device.queue.writeBuffer(vertInstBuf, 0, d);
    }

    const enc      = device.createCommandEncoder();
    const swapView = context.getCurrentTexture().createView();

    // Helper: draw all geometry into a render pass
    function drawAll(pass) {
      if (showFaces && faceVertCount > 0) {
        pass.setPipeline(pass._facePipeline);
        pass.setBindGroup(0, uniformBG);
        pass.setVertexBuffer(0, faceVtxBuf);
        pass.draw(faceVertCount);
      }
      if (edgeWidth > 0 && ec > 0) {
        pass.setPipeline(pass._edgePipeline);
        pass.setBindGroup(0, uniformBG);
        pass.setVertexBuffer(0, edgeInstBuf);
        pass.draw(6, ec);
      }
      if (vc > 0) {
        pass.setPipeline(pass._vertPipeline);
        pass.setBindGroup(0, uniformBG);
        pass.setVertexBuffer(0, icoPosBuf);
        pass.setVertexBuffer(1, vertInstBuf);
        pass.setIndexBuffer(icoIdxBuf, 'uint16');
        pass.drawIndexed(icoVertCount, vc);
      }
    }

    // ── Layer 0: first pass ───────────────────────────────────────────────────
    {
      const pass = enc.beginRenderPass({
        colorAttachments: [{
          view: layerTextures[0].createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store',
        }],
        depthStencilAttachment: {
          view: peelDepthTextures[0].createView(),
          depthClearValue: 1.0, depthLoadOp: 'clear', depthStoreOp: 'store',
        },
      });
      pass._facePipeline = faceFirstPipeline;
      pass._edgePipeline = edgeFirstPipeline;
      pass._vertPipeline = vertFirstPipeline;
      drawAll(pass);
      pass.end();
    }

    // ── Layers 1‥N−1: peel passes ─────────────────────────────────────────────
    for (let layer = 1; layer < MAX_PEEL_LAYERS; layer++) {
      const prevIdx = (layer - 1) % 2;
      const currIdx =  layer      % 2;
      const pass = enc.beginRenderPass({
        colorAttachments: [{
          view: layerTextures[layer].createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store',
        }],
        depthStencilAttachment: {
          view: peelDepthTextures[currIdx].createView(),
          depthClearValue: 1.0, depthLoadOp: 'clear', depthStoreOp: 'store',
        },
      });
      pass._facePipeline = facePeelPipeline;
      pass._edgePipeline = edgePeelPipeline;
      pass._vertPipeline = vertPeelPipeline;
      pass.setBindGroup(1, prevDepthBGs[prevIdx]);
      drawAll(pass);
      pass.end();
    }

    // ── Composite: clear canvas, blend layers back-to-front ───────────────────
    {
      const pass = enc.beginRenderPass({
        colorAttachments: [{
          view: swapView, loadOp: 'clear', storeOp: 'store',
          clearValue: { r: background[0], g: background[1], b: background[2], a: 1.0 },
        }],
      });
      pass.end();
    }

    for (let layer = MAX_PEEL_LAYERS - 1; layer >= 0; layer--) {
      const pass = enc.beginRenderPass({
        colorAttachments: [{ view: swapView, loadOp: 'load', storeOp: 'store' }],
      });
      pass.setPipeline(compositePipeline);
      pass.setBindGroup(0, layerBGs[layer]);
      pass.draw(3);
      pass.end();
    }

    device.queue.submit([enc.finish()]);
  }

  function destroy() {
    uniformBuffer.destroy();
    icoPosBuf.destroy();
    icoIdxBuf.destroy();
    if (faceVtxBuf)  faceVtxBuf.destroy();
    if (edgeInstBuf) edgeInstBuf.destroy();
    if (vertInstBuf) vertInstBuf.destroy();
    for (const t of peelDepthTextures) t.destroy();
    for (const t of layerTextures)     t.destroy();
  }

  return { render, destroy };
}
