// WebGPU DEM tile viewer — the notebook's closing figure.
//
// Every per-tile bake pass runs on the GPU. A `rgba8unorm` texture per
// tile holds (nx, ny, ao, shadow) just like the old CPU path, but now
// the assembly runs through the same `sweep-core` kernels the notebook
// already builds for its interactive figures:
//
//   R = (nx + 1) / 2      world-space surface normal, x
//   G = (ny + 1) / 2      y (z reconstructed in the composite shader)
//   B = ao^γ              LSAO with γ=2 post-process, folded into pack
//   A = shadow            hard shadow, re-baked on every sun change
//
// The bake splits into two phases:
//
//   * Static bake   — runs once per tile lifetime when the elevation
//                     fetch resolves. Computes normals, LSAO with γ=2,
//                     and packs the result into the tile's rgba8
//                     texture via `copyBufferToTexture`. The alpha
//                     channel is left at 0.
//
//   * Shadow re-bake — runs on every render where the sun direction
//                      has moved since last submission. Clears the
//                      shared atomic shadow buffer, runs one hard-
//                      shadow sweep per visible tile (with parent-
//                      tile prewarm assembled from 4 z-1 neighbours),
//                      then fullscreen alpha-blits the result into
//                      the tile texture's A channel. RGB is preserved
//                      via `writeMask: GPUColorWrite.ALPHA`.
//
// Parent-tile continuity: each `Tile` owns a 384×384 half-res horizon
// buffer assembled in a Web Worker from four cached z-1 fetches. The
// worker also handles terrarium decoding and fetch deduplication so the
// main thread stays free for GPU work and pointer events.
//
// Positioning math runs on the CPU in double precision. Tile world
// coordinates and the viewport centre are `number` (IEEE-754 double),
// and only the per-tile screen-space offset is cast to f32 before
// being written into the tile's uniform buffer. That keeps things
// stable at high zoom where single precision would drop mantissa bits.
//
// The viewer reuses the caller's WebGPU `device` — the notebook
// already owns one for the compute-shader figure, so there's no
// second adapter request. It configures its own canvas on that device.

import {
  FP_SCALE,
  TILE_BAKE_UNIFORM_POOL_SIZE,
  createTileBakeResources,
  deriveSweepParams,
  getAlphaBindGroupLayout,
  getComputeBindGroupLayout,
  getNormalsBindGroupLayout,
  getOrBuildAlphaBlitPipeline,
  getOrBuildComputePipeline,
  getOrBuildNormalsPipeline,
  getOrBuildPackPipeline,
  getPackBindGroupLayout,
  packUniforms,
} from "./webgpu-pipelines.js";

const TAU = Math.PI * 2;
const AO_DIRECTIONS = 8;
const EARTH_CIRCUMFERENCE_M = 40075016.686;

function latLngToWorld(lat, lng, z, tileSize) {
  const n = Math.pow(2, z) * tileSize;
  const x = ((lng + 180) / 360) * n;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (2 * TAU)) * n;
  return [x, y];
}

function worldToLatLng(x, y, z, tileSize) {
  const n = Math.pow(2, z) * tileSize;
  const lng = (x / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return [lat, lng];
}

function parseHash() {
  const h = location.hash.replace(/^#/, "");
  const parts = h.split("/");
  if (parts.length >= 3) {
    const z = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    const lng = parseFloat(parts[2]);
    if (isFinite(z) && isFinite(lat) && isFinite(lng)) return { zoom: z, lat, lng };
  }
  return null;
}

function tileLatCentre(z, y, N) {
  const n = Math.pow(2, z) * N;
  const worldY = y * N + N / 2;
  const nMerc = Math.PI * (1 - (2 * worldY) / n);
  return Math.atan(Math.sinh(nMerc));
}

function tilePxSizeM(z, y, N) {
  const lat = tileLatCentre(z, y, N);
  return (EARTH_CIRCUMFERENCE_M * Math.cos(lat)) / (Math.pow(2, z) * N);
}

const SHADER = /* wgsl */ `
struct Global {
  viewportPx: vec4<f32>,   // xy = viewport size, z = shadingMode (0=lambertian,1=relief), w = reliefStrength
  sunDir: vec4<f32>,       // xyz = world-space sun direction, w = unused
  params: vec4<f32>,       // x=kAmbient, y=kDirect, z=aoStrength, w=shadowStrength
};

@group(0) @binding(0) var<uniform> g: Global;

struct TileData {
  originSize: vec4<f32>,   // xy = tile top-left in screen px, zw = tile size in screen px
};

@group(1) @binding(0) var<uniform> t: TileData;
@group(1) @binding(1) var tileTex: texture_2d<f32>;
@group(1) @binding(2) var tileSampler: sampler;

struct VsOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VsOut {
  var corners = array<vec2<f32>, 6>(
    vec2<f32>(0.0, 0.0),
    vec2<f32>(1.0, 0.0),
    vec2<f32>(0.0, 1.0),
    vec2<f32>(0.0, 1.0),
    vec2<f32>(1.0, 0.0),
    vec2<f32>(1.0, 1.0),
  );
  let c = corners[idx];
  let origin = t.originSize.xy;
  let sizePx = t.originSize.zw;
  let px = origin + c * sizePx;
  let ndcX = (px.x / g.viewportPx.x) * 2.0 - 1.0;
  let ndcY = 1.0 - (px.y / g.viewportPx.y) * 2.0;
  var out: VsOut;
  out.pos = vec4<f32>(ndcX, ndcY, 0.0, 1.0);
  out.uv = c;
  return out;
}

fn linearToSrgb(x: f32) -> f32 {
  let c = clamp(x, 0.0, 1.0);
  if (c <= 0.0031308) { return 12.92 * c; }
  return 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

@fragment
fn fs_main(in: VsOut) -> @location(0) vec4<f32> {
  let s = textureSample(tileTex, tileSampler, in.uv);
  let nxy = s.rg * 2.0 - vec2<f32>(1.0, 1.0);
  let nz = sqrt(max(0.0, 1.0 - dot(nxy, nxy)));
  let N = vec3<f32>(nxy.x, nxy.y, nz);
  let ao = s.b;
  let shadow = s.a;

  let aoContrast = g.params.z;
  let shadowStrength = g.params.w;
  let shadowMask = 1.0 - shadowStrength * shadow;

  // AO tonemap in sRGB space — matching the LSAO section's atan
  // contrast curve. Applied after sRGB conversion for better
  // perceptual dynamic range.
  // ao was stored as rawAo^2; use directly.
  let aoLin = ao;
  let aoC = clamp(aoContrast, 0.0, 0.999999);
  let aoS = aoC / (1.0 - aoC);
  let aoShade = 1.0 - aoLin;
  let aoFactor = 1.0 - (2.0 / 3.14159265) * atan(aoS * aoShade);

  let reliefMode = g.viewportPx.z;
  let reliefStr = g.viewportPx.w;
  let kAmbient = g.params.x;
  let kDirect = g.params.y;

  let lambExag = kDirect * 1.33;
  let lambNxy = nxy * lambExag;
  let lambLen = length(vec3<f32>(lambNxy, nz));
  let lambN = vec3<f32>(lambNxy, nz) / lambLen;
  let diffuse = max(0.0, dot(lambN, g.sunDir.xyz));
  let lambertian = diffuse * shadowMask;

  // Relief shading adapted from maplibre's standard hillshade.
  let slopeMag = length(nxy);
  let sunHL = length(g.sunDir.xy);
  let zFactor = 0.625 * sqrt(sunHL);
  let slopeAngle = atan(zFactor * slopeMag / max(nz, 0.001));
  let scaledSlope = min(slopeAngle * reliefStr * 2.0, 1.5);
  let aspectAlign = select(0.0, dot(nxy, g.sunDir.xy) / (slopeMag * sunHL), slopeMag > 0.001 && sunHL > 0.001);
  let shadeDir = 0.5 + 0.5 * aspectAlign;
  let reliefDark = sin(scaledSlope) * (1.0 - shadeDir);
  let reliefSrgb = pow(1.0 - reliefDark * 0.85, 2.5) * shadowMask;

  // Debug mode: show the raw bake texture, darkened by shadow.
  // A channel encodes shadow as 1=shadowed, 0=lit, so invert it.
  if (reliefMode >= 1.5) {
    return vec4<f32>(s.rgb * (1.0 - 0.5 * s.a), 1.0);
  }

  // Composite in sRGB: convert base shading to sRGB, then multiply
  // by aoFactor in perceptual space. No linearToSrgb at the end.
  let baseSrgb = mix(linearToSrgb(lambertian), reliefSrgb, reliefMode);
  let v = clamp(baseSrgb * aoFactor, 0.0, 1.0);
  return vec4<f32>(v, v, v, 1.0);
}
`;

export function createTileViewer(opts) {
  const {
    container,
    device,
    format,
    tileUrl,
    tileSize = 256,
    minZoom = 6,
    maxZoom = 14,
    zoom: initialZoom = 11,
    center: initialCenter = [0, 0],
  } = opts;

  container.style.position = container.style.position || "relative";
  container.style.overflow = "hidden";
  container.style.touchAction = "none";
  container.style.cursor = "grab";
  container.style.userSelect = "none";
  container.style.background = container.style.background || "#151515";

  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.display = "block";
  container.appendChild(canvas);

  const gpuCtx = canvas.getContext("webgpu");
  gpuCtx.configure({ device, format, alphaMode: "premultiplied" });

  // ------------------------------------------------------------------
  // Data-prep worker: handles tile fetching, terrarium decoding, and
  // parent horizon assembly off the main thread.
  // ------------------------------------------------------------------
  const worker = new Worker(
    new URL("./tile-viewer-worker.js", import.meta.url),
    { type: "module" },
  );
  worker.postMessage({ type: "init", tileUrl });

  // ------------------------------------------------------------------
  // CPU bake worker pool: parallel CPU-side tile baking as an
  // alternative to the GPU compute path.
  // ------------------------------------------------------------------
  const cpuPoolSize = Math.min(navigator.hardwareConcurrency || 4, 8);
  const cpuWorkers = [];
  for (let i = 0; i < cpuPoolSize; i++) {
    cpuWorkers.push(new Worker(new URL("./cpu-bake-worker.js", import.meta.url), { type: "module" }));
  }
  const cpuIdle = [...cpuWorkers];
  const cpuQueue = []; // pending {tile, msg, resolve} items

  function cpuDispatch(tile, msg) {
    return new Promise((resolve) => {
      const item = { tile, msg, resolve };
      if (cpuIdle.length > 0) {
        cpuSend(cpuIdle.pop(), item);
      } else {
        cpuQueue.push(item);
      }
    });
  }
  function cpuSend(worker, item) {
    worker.onmessage = (e) => {
      cpuIdle.push(worker);
      item.resolve(e.data);
      if (cpuQueue.length > 0) cpuSend(cpuIdle.pop(), cpuQueue.shift());
    };
    worker.postMessage(item.msg, getTransferables(item.msg));
  }
  function getTransferables(msg) {
    const list = [];
    if (msg.heights?.buffer) list.push(msg.heights.buffer);
    if (msg.horizon?.buffer) list.push(msg.horizon.buffer);
    if (msg.cachedNx?.buffer) list.push(msg.cachedNx.buffer);
    if (msg.cachedNy?.buffer) list.push(msg.cachedNy.buffer);
    if (msg.cachedAo?.buffer) list.push(msg.cachedAo.buffer);
    return list;
  }

  const pendingTiles = new Map(); // "z/x/y" -> { resolve, reject }

  worker.onmessage = (e) => {
    const msg = e.data;
    const key = `${msg.z}/${msg.x}/${msg.y}`;
    const pending = pendingTiles.get(key);
    if (!pending) return;
    pendingTiles.delete(key);
    if (msg.type === "tile") {
      pending.resolve({ comp: msg.comp, horizon: msg.horizon });
    } else if (msg.type === "error") {
      pending.reject(new Error(msg.message));
    }
  };

  const shaderModule = device.createShaderModule({
    code: SHADER,
    label: "tile-viewer",
  });

  const globalBindGroupLayout = device.createBindGroupLayout({
    label: "tile-viewer global",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });
  const tileBindGroupLayout = device.createBindGroupLayout({
    label: "tile-viewer tile",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: "float" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: { type: "filtering" },
      },
    ],
  });
  const pipeline = device.createRenderPipeline({
    label: "tile-viewer pipeline",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [globalBindGroupLayout, tileBindGroupLayout],
    }),
    vertex: { module: shaderModule, entryPoint: "vs_main" },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

  // Global uniform buffer (48 bytes: three vec4s).
  const globalBuffer = device.createBuffer({
    size: 48,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: "tile-viewer global uniforms",
  });
  const globalBindGroup = device.createBindGroup({
    layout: globalBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: globalBuffer } }],
  });
  const globalData = new Float32Array(12);

  // ------------------------------------------------------------------
  // GPU tile-bake resources.
  //
  // The raster size per tile (`bakeN`) is not knowable at viewer-
  // construction time — Mapterhorn serves 512×512 tiles while the
  // notebook passes `tileSize: 256` as the *mercator* tile size for
  // positioning, and the two can differ. So we lazily allocate the
  // shared working buffers on the first fetch, then reuse them for
  // every subsequent tile. All tiles in a single viewer instance are
  // required to share the same raster size (a reasonable assumption
  // for a single tile provider).
  // ------------------------------------------------------------------
  let bakeRes = null;
  let bakeN = 0;
  function ensureBakeResources(N) {
    if (bakeRes !== null) {
      if (N !== bakeN) {
        throw new Error(
          `tile-viewer: raster size changed mid-session (was ${bakeN}, got ${N})`,
        );
      }
      return;
    }
    bakeN = N;
    bakeRes = createTileBakeResources(device, { N });

    const packBuf = new ArrayBuffer(16);
    new Uint32Array(packBuf, 0, 1)[0] = N;
    const packF32 = new Float32Array(packBuf, 4, 3);
    packF32[0] = FP_SCALE;
    packF32[1] = 2.0; // aoGamma
    packF32[2] = 0;
    device.queue.writeBuffer(bakeRes.packUniform, 0, packBuf);

    const alphaBuf = new ArrayBuffer(16);
    new Uint32Array(alphaBuf, 0, 1)[0] = N;
    const alphaF32 = new Float32Array(alphaBuf, 4, 3);
    alphaF32[0] = FP_SCALE;
    alphaF32[1] = 0;
    alphaF32[2] = 0;
    device.queue.writeBuffer(bakeRes.alphaUniform, 0, alphaBuf);
  }

  // Double-precision viewport + lighting state. Zoom is continuous;
  // `baseZoom` is the integer zoom level whose tiles we actually fetch
  // (rounded to nearest), and `scale` applies the fractional part as a
  // display-only magnification so mid-zoom gestures don't trigger
  // re-fetches. `centerWorldX/Y` is expressed in `baseZoom` world
  // pixels — it gets rescaled whenever `baseZoom` changes.
  const hashState = parseHash();
  let zoom = hashState ? hashState.zoom : initialZoom;
  let baseZoom = Math.round(zoom);
  const initLat = hashState ? hashState.lat : initialCenter[0];
  const initLng = hashState ? hashState.lng : initialCenter[1];
  let [centerWorldX, centerWorldY] = latLngToWorld(
    initLat,
    initLng,
    baseZoom,
    tileSize,
  );
  let viewportW = 1;
  let viewportH = 1;
  let needsRender = true;
  let sunDirty = true;
  let hashTimer = 0;
  function scheduleHashFlush() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      const [cLat, cLng] = worldToLatLng(centerWorldX, centerWorldY, baseZoom, tileSize);
      const prec = Math.max(0, Math.ceil(zoom) + 1);
      const fmt = (v, p) => v.toFixed(p).replace(/\.?0+$/, "");
      const newHash = `#${fmt(zoom, 2)}/${fmt(cLat, prec)}/${fmt(cLng, prec)}`;
      if (location.hash !== newHash) {
        history.replaceState(null, "", newHash);
      }
    }, 300);
  }

  const displayScale = () => Math.pow(2, zoom - baseZoom);

  const lighting = {
    sunX: 0,
    sunY: 0,
    sunZ: 1,
    kAmbient: 0.3,
    kDirect: 0.7,
    aoStrength: 1,
    shadowStrength: 1,
    // Shadow re-bake controls. `sunRadiusDeg` drives the soft-shadow
    // altitude smoothstep; `shadowSamples` is the number of stratified
    // azimuth offsets averaged per pixel. 1 sample + radius > 0 gives
    // a softened hard-edge shadow; raising the sample count smooths
    // the azimuth direction of the penumbra.
    sunRadiusDeg: 2.5,
    shadowSamples: 6,
    sunInteracting: false,
    shadingMode: 0,
    reliefStrength: 1,
    bakeMode: "cpu",
  };

  // Inverse-normal CDF (Peter Acklam's rational approximation). Used
  // to stratify the azimuth offsets of the N shadow samples across a
  // Gaussian matched to the altitude smoothstep — same construction
  // as the notebook's `#soft-shadow-compute` driver.
  const normInv = (p) => {
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const plow = 0.02425;
    const phigh = 1 - plow;
    let q, r;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
    if (p <= phigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  };

  const tiles = new Map(); // "z/x/y" -> Tile
  const staleTiles = []; // Tiles from previous zoom levels, kept until children are ready
  const bakeQueue = []; // Tiles awaiting static bake, processed one per frame

  class Tile {
    constructor(z, x, y) {
      this.z = z;
      this.x = x;
      this.y = y;
      this.ready = false;
      this.destroyed = false;
      this.tileData = new Float32Array(4);
      this.uniformBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: `tile ${z}/${x}/${y} uniforms`,
      });
      this.texture = null;
      this.elevBuffer = null;
      this.horizonBuffer = null;
      this.HN = 0;
      this.bindGroup = null;
      this._heights = null;    // kept for CPU shadow rebake
      this._horizon = null;
      this._horizonHN = 0;
      this._pxSizeM = 0;
      this._cpuNx = null;      // cached normals+AO from CPU bake
      this._cpuNy = null;
      this._cpuAo = null;
      this._shadowPending = false;
      this._populate();
    }

    async _populate() {
      try {
        const key = `${this.z}/${this.x}/${this.y}`;
        const data = await new Promise((resolve, reject) => {
          pendingTiles.set(key, { resolve, reject });
          worker.postMessage({ type: "fetch", z: this.z, x: this.x, y: this.y });
        });
        if (this.destroyed) return;

        const { comp, horizon } = data;
        const compN = comp.N;
        const HN = horizon.HN;
        this.HN = HN;
        ensureBakeResources(compN);

        this.texture = device.createTexture({
          size: [compN, compN, 1],
          format: "rgba8unorm",
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
          label: `tile ${this.z}/${this.x}/${this.y} packed`,
        });
        this.elevBuffer = device.createBuffer({
          size: compN * compN * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          label: `tile ${this.z}/${this.x}/${this.y} elev`,
        });
        this.horizonBuffer = device.createBuffer({
          size: HN * HN * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          label: `tile ${this.z}/${this.x}/${this.y} horizon`,
        });
        this.bindGroup = device.createBindGroup({
          layout: tileBindGroupLayout,
          entries: [
            { binding: 0, resource: { buffer: this.uniformBuffer } },
            { binding: 1, resource: this.texture.createView() },
            { binding: 2, resource: sampler },
          ],
        });

        this._compN = compN;

        if (lighting.bakeMode === "cpu") {
          // ---- CPU bake path ----
          const pxSizeM = tilePxSizeM(this.z, this.y, compN);
          // Store copies for later shadow rebakes (originals will be
          // transferred to the worker and neutered).
          this._heights = new Float32Array(comp.heights);
          this._horizon = new Float32Array(horizon.heights);
          this._horizonHN = HN;
          this._pxSizeM = pxSizeM;

          const sunZc = Math.max(-1, Math.min(1, lighting.sunZ));
          const altDeg = (Math.asin(sunZc) * 180) / Math.PI;
          const azDeg = (Math.atan2(lighting.sunY, lighting.sunX) * 180) / Math.PI;

          const result = await cpuDispatch(this, {
            type: "bake",
            z: this.z,
            x: this.x,
            y: this.y,
            heights: new Float32Array(comp.heights),
            N: compN,
            pxSizeM,
            horizon: new Float32Array(horizon.heights),
            HN,
            azDeg,
            altDeg,
            sunRadiusDeg: Math.max(0, lighting.sunRadiusDeg || 0),
            shadowSamples: Math.max(1, Math.round(lighting.shadowSamples || 1)),
          });
          if (this.destroyed) {
            this.texture?.destroy();
            this.elevBuffer?.destroy();
            this.horizonBuffer?.destroy();
            return;
          }

          // Store returned normals+AO for shadow rebakes.
          this._cpuNx = result.nx;
          this._cpuNy = result.ny;
          this._cpuAo = result.ao;

          // Upload packed RGBA to the tile texture.
          device.queue.writeTexture(
            { texture: this.texture },
            result.packed,
            { bytesPerRow: compN * 4 },
            { width: compN, height: compN },
          );

          this.ready = true;
          needsRender = true;
        } else {
          // ---- GPU bake path (original) ----
          device.queue.writeBuffer(this.elevBuffer, 0, comp.heights);
          device.queue.writeBuffer(this.horizonBuffer, 0, horizon.heights);

          // Queue for baking — processed one per frame to avoid
          // saturating the GPU and blocking the display render pass.
          bakeQueue.push(this);
          needsRender = true;

          if (this.destroyed) {
            this.texture.destroy();
            this.elevBuffer.destroy();
            this.horizonBuffer.destroy();
            return;
          }
          // Tile data is uploaded but not yet baked — the bake queue
          // will process it on a subsequent frame.
        }
      } catch (err) {
        console.error("tile populate error", err);
      }
    }

    destroy() {
      this.destroyed = true;
      try {
        this.texture?.destroy();
      } catch (_) {}
      try {
        this.elevBuffer?.destroy();
      } catch (_) {}
      try {
        this.horizonBuffer?.destroy();
      } catch (_) {}
      try {
        this.uniformBuffer.destroy();
      } catch (_) {}
    }
  }

  // ------------------------------------------------------------------
  // Static bake: one encoder per tile.
  //
  //   normals → LSAO × 8 → pack → copyBufferToTexture
  //
  // Leaves the tile texture's alpha channel at 0. Shadow is added by
  // the first shadow re-bake in `rebakeShadowAllVisible`, which is
  // triggered automatically because `_populate` sets `sunDirty = true`
  // once the tile is ready.
  // ------------------------------------------------------------------
  function runStaticBake(tile, compN) {
    const pxSizeM = tilePxSizeM(tile.z, tile.y, compN);

    // Small normals uniform: { N: u32, pxSizeM: f32, pad, pad }
    const normalsBuf = new ArrayBuffer(16);
    new Uint32Array(normalsBuf, 0, 1)[0] = compN;
    new Float32Array(normalsBuf, 4, 1)[0] = pxSizeM;
    device.queue.writeBuffer(bakeRes.normalsUniform, 0, normalsBuf);

    // Pre-compute + write 8 LSAO sweep uniforms into the pool. Unlike
    // the single-tile notebook LSAO figure, the tile viewer runs the
    // LSAO sweep *with* parent-tile prewarm so that AO is continuous
    // across tile boundaries. The cost is a small within-tile gradient
    // on the sun-facing edges of each sweep direction (parent blockers
    // stay on the hull and contribute cos²α out to ~16 pixels before
    // interior samples prune them), but averaged over 8 directions and
    // viewed in a multi-tile context this is far less visible than the
    // hard AO seams you get without the prewarm.
    const lsaoSweeps = new Array(AO_DIRECTIONS);
    for (let d = 0; d < AO_DIRECTIONS; d++) {
      const azDeg = (d * 360) / AO_DIRECTIONS;
      const sweep = deriveSweepParams({
        W: compN,
        H: compN,
        azDeg,
        pxSizeM,
        mode: "lsao",
        weight: 1 / AO_DIRECTIONS,
        horizonN: tile.HN,
      });
      lsaoSweeps[d] = sweep;
      device.queue.writeBuffer(
        bakeRes.uniformPool[d],
        0,
        packUniforms(sweep),
      );
    }

    const encoder = device.createCommandEncoder({
      label: `static bake ${tile.z}/${tile.x}/${tile.y}`,
    });
    encoder.clearBuffer(bakeRes.workingAo);
    encoder.clearBuffer(bakeRes.workingShadow);

    // Normals pass.
    {
      const pipe = getOrBuildNormalsPipeline(device);
      const bg = device.createBindGroup({
        layout: getNormalsBindGroupLayout(device),
        entries: [
          { binding: 0, resource: { buffer: bakeRes.normalsUniform } },
          { binding: 1, resource: { buffer: tile.elevBuffer } },
          { binding: 2, resource: { buffer: bakeRes.workingNx } },
          { binding: 3, resource: { buffer: bakeRes.workingNy } },
        ],
      });
      const pass = encoder.beginComputePass({ label: "normals" });
      pass.setPipeline(pipe);
      pass.setBindGroup(0, bg);
      const wg = Math.ceil(compN / 8);
      pass.dispatchWorkgroups(wg, wg);
      pass.end();
    }

    // LSAO accumulation — 8 sweeps each adding (1 − sin²α)·weight into
    // the shared atomic `workingAo` buffer, pre-warmed from the tile's
    // parent-horizon buffer for cross-tile continuity.
    {
      const pipe = getOrBuildComputePipeline({
        device,
        mode: "lsao",
        prewarm: true,
      });
      const bgl = getComputeBindGroupLayout(device);
      for (let d = 0; d < AO_DIRECTIONS; d++) {
        const bg = device.createBindGroup({
          layout: bgl,
          entries: [
            { binding: 0, resource: { buffer: bakeRes.uniformPool[d] } },
            { binding: 1, resource: { buffer: tile.elevBuffer } },
            { binding: 2, resource: { buffer: bakeRes.workingAo } },
            { binding: 3, resource: { buffer: tile.horizonBuffer } },
          ],
        });
        const pass = encoder.beginComputePass({ label: `lsao ${d}` });
        pass.setPipeline(pipe);
        pass.setBindGroup(0, bg);
        const s = lsaoSweeps[d];
        const numRays = s.bMax - s.bMin + 1;
        pass.dispatchWorkgroups(Math.ceil(numRays / 64));
        pass.end();
      }
    }

    // Pack: read workingNx/Ny/Ao/Shadow, write rgba8 u32 into
    // workingPacked. Shadow is still zero here, so alpha=0 out of the
    // pack — the first shadow re-bake will fill it in.
    {
      const pipe = getOrBuildPackPipeline(device);
      const bg = device.createBindGroup({
        layout: getPackBindGroupLayout(device),
        entries: [
          { binding: 0, resource: { buffer: bakeRes.packUniform } },
          { binding: 1, resource: { buffer: bakeRes.workingNx } },
          { binding: 2, resource: { buffer: bakeRes.workingNy } },
          { binding: 3, resource: { buffer: bakeRes.workingAo } },
          { binding: 4, resource: { buffer: bakeRes.workingShadow } },
          { binding: 5, resource: { buffer: bakeRes.workingPacked } },
        ],
      });
      const pass = encoder.beginComputePass({ label: "pack" });
      pass.setPipeline(pipe);
      pass.setBindGroup(0, bg);
      const wg = Math.ceil(compN / 8);
      pass.dispatchWorkgroups(wg, wg);
      pass.end();
    }

    encoder.copyBufferToTexture(
      { buffer: bakeRes.workingPacked, bytesPerRow: compN * 4, rowsPerImage: compN },
      { texture: tile.texture },
      { width: compN, height: compN, depthOrArrayLayers: 1 },
    );

    device.queue.submit([encoder.finish()]);
  }

  // ------------------------------------------------------------------
  // Shadow re-bake: one encoder per tile, N soft-shadow compute passes
  // into the shared `workingShadow` buffer, then an alpha-blit pass
  // that writes the result into the tile texture's alpha channel.
  //
  // Each of the N samples is a full sweep at a stratified azimuth
  // offset drawn from a Gaussian whose standard deviation is matched
  // to the altitude smoothstep (same construction as the single-tile
  // soft-shadow notebook figure). The `sunRadiusDeg` lighting field
  // drives the altitude half-width; `shadowSamples` controls how
  // many offsets we average. At `shadowSamples = 1` the shadow is
  // still softened in the altitude direction by the smoothstep, just
  // with no azimuth jitter.
  //
  // Encoder-per-tile so each tile can reuse the uniform pool slots
  // 0..N−1 without worrying about cross-tile aliasing (uniform writes
  // for the next submit can safely overwrite slots whose dispatches
  // have already been queued for execution by the previous submit).
  // ------------------------------------------------------------------
  function rebakeShadowAllVisible() {
    if (bakeRes === null) return;
    const visible = [];
    for (const tile of tiles.values()) {
      if (tile.ready && !tile.destroyed) visible.push(tile);
    }
    if (visible.length === 0) return;

    const sunZc = Math.max(-1, Math.min(1, lighting.sunZ));
    const altDeg = (Math.asin(sunZc) * 180) / Math.PI;
    const azDeg =
      (Math.atan2(lighting.sunY, lighting.sunX) * 180) / Math.PI;
    const sunRadiusDeg = Math.max(0, lighting.sunRadiusDeg || 0);
    const N = lighting.sunInteracting ? 1 : Math.max(
      1,
      Math.min(TILE_BAKE_UNIFORM_POOL_SIZE, Math.round(lighting.shadowSamples || 1)),
    );

    // Variance-match to the altitude smoothstep (slope 3/2 at the
    // midpoint equated to the Gaussian CDF's 1/(σ√(2π))). Over a total
    // span of 3·sunR, the equivalent standard deviation in degrees is
    // σ = 2·sunR / √(2π). At sunR = 0 the offsets collapse to 0.
    const sigma = (2 * sunRadiusDeg) / Math.sqrt(2 * Math.PI);

    const computePipe = getOrBuildComputePipeline({
      device,
      mode: "soft",
      prewarm: true,
    });
    const alphaPipe = getOrBuildAlphaBlitPipeline(device);
    const computeBgl = getComputeBindGroupLayout(device);
    const alphaBgl = getAlphaBindGroupLayout(device);

    const weight = 1 / N;

    for (let tIdx = 0; tIdx < visible.length; tIdx++) {
      const tile = visible[tIdx];
      const pxSizeM = tilePxSizeM(tile.z, tile.y, bakeN);

      // Pre-compute all N sweeps for this tile and pack their
      // uniforms into the first N pool slots. writeBuffer is queued
      // before the encoder's submit, so all N values are in place
      // when the dispatches run.
      const sweeps = new Array(N);
      for (let s = 0; s < N; s++) {
        const q = N === 1 ? 0 : normInv((s + 0.5) / N);
        const daz = q * sigma;
        const sweep = deriveSweepParams({
          W: bakeN,
          H: bakeN,
          azDeg: azDeg + daz,
          pxSizeM,
          mode: "soft",
          altDeg,
          sunRadiusDeg,
          weight,
          horizonN: tile.HN,
        });
        sweeps[s] = sweep;
        device.queue.writeBuffer(
          bakeRes.uniformPool[s],
          0,
          packUniforms(sweep),
        );
      }

      const encoder = device.createCommandEncoder({
        label: `shadow rebake ${tile.z}/${tile.x}/${tile.y}`,
      });
      encoder.clearBuffer(bakeRes.workingShadow);

      for (let s = 0; s < N; s++) {
        const bg = device.createBindGroup({
          layout: computeBgl,
          entries: [
            { binding: 0, resource: { buffer: bakeRes.uniformPool[s] } },
            { binding: 1, resource: { buffer: tile.elevBuffer } },
            { binding: 2, resource: { buffer: bakeRes.workingShadow } },
            { binding: 3, resource: { buffer: tile.horizonBuffer } },
          ],
        });
        const pass = encoder.beginComputePass({
          label: `reshadow ${tIdx} sample ${s}`,
        });
        pass.setPipeline(computePipe);
        pass.setBindGroup(0, bg);
        const sw = sweeps[s];
        const numRays = sw.bMax - sw.bMin + 1;
        pass.dispatchWorkgroups(Math.ceil(numRays / 64));
        pass.end();
      }

      {
        const bg = device.createBindGroup({
          layout: alphaBgl,
          entries: [
            { binding: 0, resource: { buffer: bakeRes.alphaUniform } },
            { binding: 1, resource: { buffer: bakeRes.workingShadow } },
          ],
        });
        const pass = encoder.beginRenderPass({
          label: `reshadow ${tIdx} alpha`,
          colorAttachments: [
            {
              view: tile.texture.createView(),
              loadOp: "load",
              storeOp: "store",
            },
          ],
        });
        pass.setPipeline(alphaPipe);
        pass.setBindGroup(0, bg);
        pass.draw(3);
        pass.end();
      }

      device.queue.submit([encoder.finish()]);
    }
  }

  // ------------------------------------------------------------------
  // CPU shadow re-bake: sends shadow-only messages to the worker pool
  // for each visible tile that has cached CPU bake data.
  // ------------------------------------------------------------------
  function rebakeShadowCPU() {
    const sunZc = Math.max(-1, Math.min(1, lighting.sunZ));
    const altDeg = (Math.asin(sunZc) * 180) / Math.PI;
    const azDeg = (Math.atan2(lighting.sunY, lighting.sunX) * 180) / Math.PI;
    const sunRadiusDeg = Math.max(0, lighting.sunRadiusDeg || 0);
    const shadowSamples = lighting.sunInteracting ? 1 : Math.max(1, Math.round(lighting.shadowSamples || 1));

    for (const tile of tiles.values()) {
      if (!tile.ready || tile.destroyed || !tile._cpuNx) continue;
      if (tile._shadowPending) continue;
      tile._shadowPending = true;
      const compN = tile._compN;
      cpuDispatch(tile, {
        type: "shadow",
        z: tile.z,
        x: tile.x,
        y: tile.y,
        heights: new Float32Array(tile._heights),
        N: compN,
        pxSizeM: tile._pxSizeM,
        horizon: new Float32Array(tile._horizon),
        HN: tile._horizonHN,
        azDeg,
        altDeg,
        sunRadiusDeg,
        shadowSamples,
        cachedNx: new Float32Array(tile._cpuNx),
        cachedNy: new Float32Array(tile._cpuNy),
        cachedAo: new Float32Array(tile._cpuAo),
      }).then((result) => {
        tile._shadowPending = false;
        if (tile.destroyed) return;
        device.queue.writeTexture(
          { texture: tile.texture },
          result.packed,
          { bytesPerRow: compN * 4 },
          { width: compN, height: compN },
        );
        needsRender = true;
        // If the sun moved while this was in flight, re-dispatch.
        if (sunDirty) {
          sunDirty = false;
          rebakeShadowCPU();
        }
      });
    }
  }

  function updateTiles() {
    const scale = displayScale();
    // Viewport → baseZoom world coordinates. At display scale > 1 one
    // baseZoom pixel covers more than one screen pixel, so the visible
    // range contracts accordingly.
    const topLeftX = centerWorldX - viewportW / 2 / scale;
    const topLeftY = centerWorldY - viewportH / 2 / scale;
    const bottomRightX = centerWorldX + viewportW / 2 / scale;
    const bottomRightY = centerWorldY + viewportH / 2 / scale;

    const minX = Math.floor(topLeftX / tileSize);
    const maxX = Math.floor(bottomRightX / tileSize);
    const minY = Math.floor(topLeftY / tileSize);
    const maxY = Math.floor(bottomRightY / tileSize);
    const nAtZoom = Math.pow(2, baseZoom);

    const needed = new Set();
    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        if (tx < 0 || tx >= nAtZoom || ty < 0 || ty >= nAtZoom) continue;
        const key = `${baseZoom}/${tx}/${ty}`;
        needed.add(key);
        if (!tiles.has(key)) tiles.set(key, new Tile(baseZoom, tx, ty));
      }
    }
    for (const [key, tile] of tiles) {
      if (!needed.has(key)) {
        tile.destroy();
        tiles.delete(key);
      }
    }
  }

  // Zoom to `newZoom` while keeping the given screen pixel anchored
  // on the same geographic point. If `newZoom` crosses a half-integer
  // boundary the base zoom flips and all tiles are rebuilt; otherwise
  // we're just rescaling existing tiles.
  function zoomTo(newZoom, anchorPx) {
    const clamped = Math.max(minZoom, Math.min(maxZoom, newZoom));
    if (clamped === zoom) return;

    const oldScale = displayScale();
    const ax = anchorPx ? anchorPx.x : viewportW / 2;
    const ay = anchorPx ? anchorPx.y : viewportH / 2;
    // Geographic position under the anchor, in current baseZoom pixels.
    const cursorWorldX = centerWorldX + (ax - viewportW / 2) / oldScale;
    const cursorWorldY = centerWorldY + (ay - viewportH / 2) / oldScale;

    const newBaseZoom = Math.round(clamped);
    const baseShift = Math.pow(2, newBaseZoom - baseZoom);
    // Rescale the geographic position into the new base zoom's pixels.
    const newCursorWorldX = cursorWorldX * baseShift;
    const newCursorWorldY = cursorWorldY * baseShift;
    const newScale = Math.pow(2, clamped - newBaseZoom);
    const newCenterWorldX = newCursorWorldX - (ax - viewportW / 2) / newScale;
    const newCenterWorldY = newCursorWorldY - (ay - viewportH / 2) / newScale;

    if (newBaseZoom !== baseZoom) {
      // Base zoom flipped — move existing tiles to the stale set
      // so they remain visible until children at the new zoom load.
      for (const tile of tiles.values()) {
        if (tile.ready) staleTiles.push(tile);
        else tile.destroy();
      }
      tiles.clear();
      baseZoom = newBaseZoom;
    }
    centerWorldX = newCenterWorldX;
    centerWorldY = newCenterWorldY;
    zoom = clamped;
    needsRender = true;
    updateTiles();
  }

  function updateCanvasSize() {
    const rect = container.getBoundingClientRect();
    viewportW = Math.max(1, Math.round(rect.width));
    viewportH = Math.max(1, Math.round(rect.height));
    canvas.style.width = viewportW + "px";
    canvas.style.height = viewportH + "px";
    canvas.width = viewportW;
    canvas.height = viewportH;
    needsRender = true;
    updateTiles();
  }

  function render() {
    if (!needsRender && bakeQueue.length === 0 && staleTiles.length === 0) {
      requestAnimationFrame(render);
      return;
    }
    needsRender = false;

    // Global uniform packing:
    //   f32[0..1]  = viewportPx.xy
    //   f32[4..6]  = sunDir.xyz
    //   f32[8..11] = params (kAmbient, kDirect, aoStrength, shadowStrength)
    globalData[0] = viewportW;
    globalData[1] = viewportH;
    globalData[2] = lighting.shadingMode;
    globalData[3] = lighting.reliefStrength;
    globalData[4] = lighting.sunX;
    globalData[5] = lighting.sunY;
    globalData[6] = lighting.sunZ;
    globalData[8] = lighting.kAmbient;
    globalData[9] = lighting.kDirect;
    globalData[10] = lighting.aoStrength;
    globalData[11] = lighting.shadowStrength;
    device.queue.writeBuffer(globalBuffer, 0, globalData);

    // Per-tile uniform updates — screen-space origin is a small f32
    // delta from a double-precision world coord, so high zoom stays
    // numerically stable. At fractional zoom `scale` magnifies the
    // rendered tile size; at scale = 1 we're at the tile's native
    // zoom level.
    const scale = displayScale();
    const displaySize = tileSize * scale;
    for (const tile of tiles.values()) {
      if (!tile.ready) continue;
      const worldX = tile.x * tileSize;
      const worldY = tile.y * tileSize;
      const screenX = (worldX - centerWorldX) * scale + viewportW / 2;
      const screenY = (worldY - centerWorldY) * scale + viewportH / 2;
      tile.tileData[0] = screenX;
      tile.tileData[1] = screenY;
      tile.tileData[2] = displaySize;
      tile.tileData[3] = displaySize;
      device.queue.writeBuffer(tile.uniformBuffer, 0, tile.tileData);
    }

    // Render first — compositing pre-baked tiles is trivially cheap
    // and must not be blocked by bake/shadow compute work.
    if (sunDirty) {
      if (lighting.bakeMode === "cpu") {
        rebakeShadowCPU();
      } else {
        rebakeShadowAllVisible();
      }
      sunDirty = false;
    }

    // Position and draw stale tiles (from previous zoom levels) behind
    // active tiles so the display isn't blank during zoom transitions.
    for (const stale of staleTiles) {
      if (!stale.ready || !stale.bindGroup) continue;
      const d = baseZoom - stale.z;
      const staleScale = Math.pow(2, d);
      const worldX = stale.x * tileSize * staleScale;
      const worldY = stale.y * tileSize * staleScale;
      const sz = tileSize * staleScale * scale;
      const sx = (worldX - centerWorldX) * scale + viewportW / 2;
      const sy = (worldY - centerWorldY) * scale + viewportH / 2;
      stale.tileData[0] = sx;
      stale.tileData[1] = sy;
      stale.tileData[2] = sz;
      stale.tileData[3] = sz;
      device.queue.writeBuffer(stale.uniformBuffer, 0, stale.tileData);
    }

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: gpuCtx.getCurrentTexture().createView(),
          clearValue: { r: 0.08, g: 0.08, b: 0.08, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, globalBindGroup);
    // Draw stale tiles first (background).
    for (const stale of staleTiles) {
      if (!stale.ready || !stale.bindGroup) continue;
      pass.setBindGroup(1, stale.bindGroup);
      pass.draw(6);
    }
    // Draw active tiles on top — they cover stale tiles as they load.
    for (const tile of tiles.values()) {
      if (!tile.ready || !tile.bindGroup) continue;
      pass.setBindGroup(1, tile.bindGroup);
      pass.draw(6);
    }
    pass.end();
    device.queue.submit([encoder.finish()]);

    // Prune stale tiles that are fully covered by ready active tiles.
    for (let i = staleTiles.length - 1; i >= 0; i--) {
      const stale = staleTiles[i];
      const d = baseZoom - stale.z;
      let covered = true;
      if (d > 0) {
        // Zoomed in: stale is larger, check all child tiles.
        const factor = 1 << d;
        const x0 = stale.x * factor;
        const y0 = stale.y * factor;
        for (let ty = y0; ty < y0 + factor && covered; ty++) {
          for (let tx = x0; tx < x0 + factor && covered; tx++) {
            const t = tiles.get(`${baseZoom}/${tx}/${ty}`);
            if (!t || !t.ready) covered = false;
          }
        }
      } else {
        // Zoomed out: stale is smaller, check parent tile.
        const factor = 1 << -d;
        const px = Math.floor(stale.x / factor);
        const py = Math.floor(stale.y / factor);
        const t = tiles.get(`${baseZoom}/${px}/${py}`);
        if (!t || !t.ready) covered = false;
      }
      if (covered) {
        stale.destroy();
        staleTiles.splice(i, 1);
      }
    }

    // Process one queued tile bake per frame to avoid GPU saturation.
    if (lighting.bakeMode === "gpu" && bakeQueue.length > 0) {
      const tile = bakeQueue.shift();
      if (!tile.destroyed && tile._compN) {
        runStaticBake(tile, tile._compN);
        tile.ready = true;
        sunDirty = true;
        needsRender = true;
      }
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  const resizeObserver = new ResizeObserver(updateCanvasSize);
  resizeObserver.observe(container);
  updateCanvasSize();

  // Pointer-drag panning. Screen-pixel deltas are converted into
  // baseZoom world pixels via the current display scale so the drag
  // feels 1:1 with the cursor regardless of fractional zoom.
  let dragging = false;
  let dragMoved = false;
  let lastX = 0;
  let lastY = 0;
  container.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    dragging = true;
    dragMoved = false;
    lastX = e.clientX;
    lastY = e.clientY;
    container.style.cursor = "grabbing";
    try {
      container.setPointerCapture(e.pointerId);
    } catch (_) {}
    e.preventDefault();
  });
  container.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (dx !== 0 || dy !== 0) dragMoved = true;
    lastX = e.clientX;
    lastY = e.clientY;
    const scale = displayScale();
    centerWorldX -= dx / scale;
    centerWorldY -= dy / scale;
    needsRender = true;
    updateTiles();
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    container.style.cursor = "grab";
    try {
      container.releasePointerCapture(e.pointerId);
    } catch (_) {}
    scheduleHashFlush();
  };
  container.addEventListener("pointerup", endDrag);
  container.addEventListener("pointercancel", endDrag);

  // Smooth wheel zoom, anchored on the cursor. deltaY translates into
  // a continuous zoom-per-pixel ramp so a single notch is a small
  // fractional step, not a whole zoom level.
  container.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const ZOOM_PER_PIXEL = 1 / 220;
      const dz = -e.deltaY * ZOOM_PER_PIXEL;
      const rect = container.getBoundingClientRect();
      zoomTo(zoom + dz, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      scheduleHashFlush();
    },
    { passive: false },
  );

  // Double-click to zoom in, anchored on the cursor. Skipped if the
  // click was actually the end of a pan gesture.
  container.addEventListener("dblclick", (e) => {
    if (dragMoved) return;
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const anchor = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    // Shift-double-click zooms out as a companion gesture.
    const dz = e.shiftKey ? -1 : 1;
    zoomTo(zoom + dz, anchor);
    scheduleHashFlush();
  });

  // Keyboard: `=` / `+` zoom in, `-` / `_` zoom out. tabindex is set
  // so the container can receive focus; clicks focus it automatically.
  if (!container.hasAttribute("tabindex")) {
    container.setAttribute("tabindex", "0");
  }
  container.addEventListener("keydown", (e) => {
    if (e.key === "=" || e.key === "+") {
      e.preventDefault();
      zoomTo(zoom + 1, null);
      scheduleHashFlush();
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomTo(zoom - 1, null);
      scheduleHashFlush();
    }
  });
  container.addEventListener("pointerdown", () => container.focus());

  let hqTimer = 0;
  function scheduleHQRebake() {
    clearTimeout(hqTimer);
    hqTimer = setTimeout(() => {
      sunDirty = true;
      needsRender = true;
    }, 150);
  }

  return {
    setLighting(state) {
      const prevX = lighting.sunX;
      const prevY = lighting.sunY;
      const prevZ = lighting.sunZ;
      const prevR = lighting.sunRadiusDeg;
      const prevS = lighting.shadowSamples;
      const prevMode = lighting.bakeMode;
      const wasInteracting = lighting.sunInteracting;
      Object.assign(lighting, state);
      if (
        prevX !== lighting.sunX ||
        prevY !== lighting.sunY ||
        prevZ !== lighting.sunZ ||
        prevR !== lighting.sunRadiusDeg ||
        prevS !== lighting.shadowSamples
      ) {
        sunDirty = true;
      }
      if (wasInteracting && !lighting.sunInteracting) {
        scheduleHQRebake();
      }
      if (prevMode !== lighting.bakeMode) {
        for (const tile of tiles.values()) tile.destroy();
        tiles.clear();
        for (const s of staleTiles) s.destroy();
        staleTiles.length = 0;
        updateTiles();
      }
      needsRender = true;
    },
    destroy() {
      worker.terminate();
      for (const w of cpuWorkers) w.terminate();
      resizeObserver.disconnect();
      for (const tile of tiles.values()) tile.destroy();
      tiles.clear();
      try {
        globalBuffer.destroy();
      } catch (_) {}
    },
  };
}
