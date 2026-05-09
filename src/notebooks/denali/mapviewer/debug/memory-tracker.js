// Memory accounting and live display.
//
// Query-based, not push-based: snapshot() walks the live caches and
// sums per-category byte counts. No allocation hooks to drift out of
// sync. Subsystems can opt in by exposing their own snapshot() that
// returns { gpu: {...}, cpu: {...}, counts: {...} }; the tracker
// merges those into the report.

const KB = 1024;
const MB = 1024 * 1024;

const QUADTREE_NODES = 349525; // matches LEVELS=10 in elevation-quadtree.ts

function fmtBytes(b) {
  if (b >= MB) return (b / MB).toFixed(1) + ' MB';
  if (b >= KB) return (b / KB).toFixed(1) + ' KB';
  return b + ' B';
}

function meshPoolBytes() {
  // Mirrors createMeshAtResolution in tiles/mesh.ts. One mesh per
  // resolution in [512, 256, 128, 64, 32, 16].
  let total = 0;
  for (const D of [512, 256, 128, 64, 32, 16]) {
    const gridSize = D + 4;
    const vertCount = (gridSize + 1) * (gridSize + 1);
    const indexCount = gridSize * gridSize * 6;
    total += vertCount * 4 + indexCount * 4;
  }
  return total;
}

const MESH_POOL_BYTES = meshPoolBytes();

export class MemoryTracker {
  constructor({ gpu, tileManager, imageryTileCache, lightingManager = null, getRenderList = null } = {}) {
    this.gpu = gpu;
    this.tileManager = tileManager;
    this.imageryTileCache = imageryTileCache;
    this.lightingManager = lightingManager;
    this.getRenderList = getRenderList;
    this.peakGpu = 0;
    this.peakCpu = 0;
  }

  setLightingManager(lm) {
    this.lightingManager = lm;
  }

  snapshot() {
    const gpu = {};
    const cpu = {};
    const counts = {};

    let terrainTextureBytes = 0;
    let terrainElevBytes = 0;
    let quadtreeBytes = 0;
    let nonFlatTiles = 0;
    let flatTiles = 0;
    let quadtreeCount = 0;
    const cachedZoomHistogram = {};
    for (const [key, entry] of this.tileManager.cache) {
      const z = parseInt(key.split('/')[0], 10);
      cachedZoomHistogram[z] = (cachedZoomHistogram[z] || 0) + 1;
      if (entry.isFlat) {
        flatTiles++;
        continue;
      }
      nonFlatTiles++;
      terrainTextureBytes += 514 * 514 * 4;
      if (entry.elevations) terrainElevBytes += entry.elevations.byteLength;
      if (entry.quadtree) {
        quadtreeBytes += QUADTREE_NODES * 4 * 2;
        quadtreeCount++;
      }
    }
    gpu['Terrain elev tex'] = terrainTextureBytes;
    cpu['Terrain elev arr'] = terrainElevBytes;
    cpu['Elev quadtrees'] = quadtreeBytes;
    cpu['AABB cache'] = this.tileManager.aabbCache.size * 24;
    counts.terrainTiles = nonFlatTiles;
    counts.flatTiles = flatTiles;
    counts.quadtrees = quadtreeCount;
    counts.cacheLimit = 150;
    counts.wantedKeys = this.tileManager.wantedKeys.size;
    counts.pendingFetches = this.tileManager.pending.size;
    counts.failedTiles = this.tileManager.failed.size;
    counts.cachedZoomHistogram = cachedZoomHistogram;
    if (this.getRenderList) {
      const rl = this.getRenderList();
      counts.renderList = rl.length;
      const zh = {};
      const uniqTerrain = new Set();
      for (const t of rl) {
        zh[t.terrainZ] = (zh[t.terrainZ] || 0) + 1;
        uniqTerrain.add(`${t.terrainZ}/${t.terrainX}/${t.terrainY}`);
      }
      counts.renderListZoomHistogram = zh;
      counts.uniqueRenderedTerrainTiles = uniqTerrain.size;
    }

    let imageryGpuBytes = 0;
    let imageryCanvasBytes = 0;
    let imageryTileCount = 0;
    for (const entry of this.imageryTileCache.entries.values()) {
      imageryGpuBytes += 512 * 512 * 4;
      if (entry.canvas) imageryCanvasBytes += 512 * 512 * 4;
      imageryTileCount++;
    }
    gpu['Imagery tex'] = imageryGpuBytes;
    cpu['Imagery canvases'] = imageryCanvasBytes;
    counts.imageryTiles = imageryTileCount;

    // ImageBitmaps held by ImageryManager. Browsers typically allocate
    // these in shared memory (GPU-accessible), so charge to GPU. If
    // dimensions aren't readable we approximate at 512x512.
    let satBitmapBytes = 0;
    let satBitmapCount = 0;
    for (const layer of this.imageryTileCache.layers) {
      for (const bitmap of layer.imageryManager.fetched.values()) {
        const w = bitmap.width || 512;
        const h = bitmap.height || 512;
        satBitmapBytes += w * h * 4;
        satBitmapCount++;
      }
    }
    gpu['Sat bitmaps'] = satBitmapBytes;
    counts.satBitmaps = satBitmapCount;

    gpu['Mesh pool'] = MESH_POOL_BYTES;

    if (this.gpu._depthTexture) {
      const dt = this.gpu._depthTexture;
      gpu['Depth tex'] = dt.width * dt.height * 4;
    }

    gpu['Per-tile uniforms'] = this.gpu.UNIFORM_STRIDE * this.gpu.MAX_TILES_PER_FRAME;

    if (this.lightingManager && typeof this.lightingManager.snapshot === 'function') {
      const lm = this.lightingManager.snapshot();
      if (lm.gpu) for (const [k, v] of Object.entries(lm.gpu)) gpu[k] = v;
      if (lm.cpu) for (const [k, v] of Object.entries(lm.cpu)) cpu[k] = v;
      if (lm.counts) for (const [k, v] of Object.entries(lm.counts)) counts[k] = v;
    }

    let gpuTotal = 0;
    for (const v of Object.values(gpu)) gpuTotal += v;
    let cpuTotal = 0;
    for (const v of Object.values(cpu)) cpuTotal += v;

    if (gpuTotal > this.peakGpu) this.peakGpu = gpuTotal;
    if (cpuTotal > this.peakCpu) this.peakCpu = cpuTotal;

    return {
      gpu,
      cpu,
      counts,
      totals: { gpu: gpuTotal, cpu: cpuTotal },
      peaks: { gpu: this.peakGpu, cpu: this.peakCpu },
    };
  }

  resetPeaks() {
    this.peakGpu = 0;
    this.peakCpu = 0;
  }
}

export function createMemoryWidget(tracker, { intervalMs = 1000, startCollapsed = true } = {}) {
  const el = document.createElement('div');
  el.className = 'memory-widget';

  const header = document.createElement('div');
  header.className = 'memory-widget-header';
  const headerSummary = document.createElement('span');
  headerSummary.className = 'memory-widget-summary';
  const chevron = document.createElement('span');
  chevron.className = 'memory-widget-chevron';
  header.appendChild(chevron);
  header.appendChild(headerSummary);

  const body = document.createElement('pre');
  body.className = 'memory-widget-body';

  el.appendChild(header);
  el.appendChild(body);

  let collapsed = startCollapsed;
  function applyCollapsed() {
    el.classList.toggle('collapsed', collapsed);
    chevron.textContent = collapsed ? '▶' : '▼';
    body.style.display = collapsed ? 'none' : 'block';
  }
  applyCollapsed();
  header.addEventListener('click', () => {
    collapsed = !collapsed;
    applyCollapsed();
  });

  function row(label, bytes, indent = 0) {
    return `${' '.repeat(indent)}${label.padEnd(18 - indent)}${fmtBytes(bytes).padStart(10)}`;
  }

  function fmtHistogram(h) {
    if (!h) return '';
    const zooms = Object.keys(h).map(Number).sort((a, b) => a - b);
    return zooms.map(z => `z${z}:${h[z]}`).join(' ');
  }

  function render() {
    const snap = tracker.snapshot();
    headerSummary.textContent = `mem  GPU ${fmtBytes(snap.totals.gpu)}  CPU ${fmtBytes(snap.totals.cpu)}`;
    if (collapsed) return; // skip body work while hidden

    const lines = [];
    lines.push(`GPU       ${fmtBytes(snap.totals.gpu).padStart(10)}   peak ${fmtBytes(snap.peaks.gpu)}`);
    const gpuKeys = Object.keys(snap.gpu).filter(k => snap.gpu[k] > 0).sort((a, b) => snap.gpu[b] - snap.gpu[a]);
    for (const k of gpuKeys) lines.push(row(k, snap.gpu[k], 2));
    lines.push('');
    lines.push(`CPU       ${fmtBytes(snap.totals.cpu).padStart(10)}   peak ${fmtBytes(snap.peaks.cpu)}`);
    const cpuKeys = Object.keys(snap.cpu).filter(k => snap.cpu[k] > 0).sort((a, b) => snap.cpu[b] - snap.cpu[a]);
    for (const k of cpuKeys) lines.push(row(k, snap.cpu[k], 2));
    lines.push('');
    const c = snap.counts;
    lines.push(`tiles cached ${c.terrainTiles}+${c.flatTiles}flat  cap ${c.cacheLimit}  qt ${c.quadtrees}`);
    lines.push(`  by zoom: ${fmtHistogram(c.cachedZoomHistogram)}`);
    if (c.renderList !== undefined) {
      lines.push(`render list ${c.renderList} (${c.uniqueRenderedTerrainTiles} unique terrain)`);
      lines.push(`  by zoom: ${fmtHistogram(c.renderListZoomHistogram)}`);
    }
    lines.push(`wanted ${c.wantedKeys}  pending ${c.pendingFetches}  failed ${c.failedTiles}`);
    lines.push(`imagery cached ${c.imageryTiles}  sat bitmaps ${c.satBitmaps}`);
    if (c.shadingTiles !== undefined) lines.push(`shading ${c.shadingTiles}`);
    body.textContent = lines.join('\n');
  }

  render();
  const interval = setInterval(render, intervalMs);
  el.destroy = () => clearInterval(interval);
  return el;
}
