import type { Settings } from './core/types.ts';

// Pick conservative quality defaults based on device class. Phones have
// roughly an order of magnitude less memory than desktops, and the iOS
// page-memory limit (Jetsam) kills tabs around 250-450 MB.
//
// The cache cap (maxTerrainTiles) is a soft cap — tile-coverage decides
// how many tiles are *wanted* per frame, and evict() can't drop wanted
// tiles. So we also raise the density thresholds, which reduces the
// number of tiles selected by the coverage pass in the first place.
// Halving linear density quarters the tile count, which dominates
// every other knob here.
//
// Heuristics:
//   - navigator.deviceMemory: RAM tier in GB (browsers clamp to 0.25-8)
//   - navigator.userAgent: mobile UA string
//   - maxTouchPoints + Mac UA: iPad-on-iPadOS (lies about being a Mac)
//   - hardwareConcurrency: caps worker count
export function detectQualityDefaults(): {
  qualityPreset: 'desktop' | 'mobile' | 'low-mem';
  maxTerrainTiles: number;
  maxWorkers: number;
  cacheShadingNormals: boolean;
  aggressiveMemoryReclaim: boolean;
  memoryBudgetMB: number | null;
  densityThreshold: number;
  imageryDensityThreshold: number;
  maxConcurrentFetches: number;
} {
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator);
  const ua = (nav.userAgent || '').toLowerCase();
  const isMobileUA = /android|iphone|ipad|ipod|mobile|tablet/.test(ua);
  const isAppleMobile = (nav as any).maxTouchPoints > 1 && /macintosh|iphone|ipad|ipod/.test(ua);
  const mobile = isMobileUA || isAppleMobile;
  const cores = (nav as any).hardwareConcurrency || 4;
  const ram = (nav as any).deviceMemory as number | undefined;

  if (mobile && ram != null && ram <= 2) {
    return {
      qualityPreset: 'low-mem',
      maxTerrainTiles: 20,
      maxWorkers: 1,
      cacheShadingNormals: false,
      // Off by default. Stripping elevations from off-screen-but-cached
      // tiles saves ~1 MB each (< 20 MB total at this cache size) but
      // breaks lighting re-bakes triggered by sun changes — the bake
      // worker reads elevations directly. The other knobs already
      // dominate the memory savings; only flip this on if the budget
      // still bites.
      aggressiveMemoryReclaim: false,
      memoryBudgetMB: 180,
      densityThreshold: 3.0,
      imageryDensityThreshold: 3.0,
      maxConcurrentFetches: 3,
    };
  }
  if (mobile) {
    return {
      qualityPreset: 'mobile',
      maxTerrainTiles: 30,
      maxWorkers: Math.min(2, Math.max(1, cores - 1)),
      cacheShadingNormals: false,
      aggressiveMemoryReclaim: false,
      memoryBudgetMB: 280,
      densityThreshold: 2.0,
      imageryDensityThreshold: 2.0,
      maxConcurrentFetches: 4,
    };
  }
  return {
    qualityPreset: 'desktop',
    maxTerrainTiles: 150,
    maxWorkers: Math.max(1, cores - 1),
    cacheShadingNormals: true,
    aggressiveMemoryReclaim: false,
    memoryBudgetMB: null,
    densityThreshold: 1.0,
    imageryDensityThreshold: 1.0,
    maxConcurrentFetches: 8,
  };
}

export function estimateTreeline(lat: number): number {
  const pts: [number, number][] = [
    [-60, 0], [-45, 1500], [-30, 2800], [-15, 3800],
    [0, 4000], [15, 4100], [30, 4200], [40, 3500],
    [50, 2300], [60, 1000], [65, 500], [70, 0],
  ];
  if (lat <= pts[0][0]) return pts[0][1];
  if (lat >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) {
    if (lat <= pts[i][0]) {
      const t = (lat - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
      return pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1]);
    }
  }
  return 0;
}

export function createSettings(initial: Partial<Settings> = {}): Settings {
  const auto = detectQualityDefaults();
  return new Proxy({
    verticalExaggeration: 1.0,
    densityThreshold: auto.densityThreshold,
    imageryDensityThreshold: auto.imageryDensityThreshold,
    showTileBorders: false,
    freezeCoverage: false,
    enableCollision: true,
    showCollisionBoxes: false,
    showWireframe: false,
    showImagery: true,
    showFeatures: true,
    showRoute: true,
    slopeAngleOpacity: 0,
    slopeAspectMaskAbove: 0,
    slopeAspectMaskNear: 0,
    slopeAspectMaskBelow: 0,
    slopeAspectOpacity: 0.95,
    treelineLower: 2000,
    treelineUpper: 2500,
    contourOpacity: 0.0,
    collisionBuffer: 4,
    occlusionBias: 0.03,
    atmosphereDensity: 0.35,
    hillshadeStrength: 0.77,
    sunDirection: [0.5, 0.7, 0.5] as [number, number, number],
    lightingEnabled: true,
    shadowStrength: 0.77,
    aoStrength: 0.7,
    sunRadiusDeg: 0.265,
    shadowSamples: 1,
    // Mesh terrain is rendered N zoom levels coarser than imagery — visual
    // detail comes from imagery and lighting at imagery resolution, not from
    // vertex density. The lighting bake reads child tiles at this same offset
    // below imagery so its output matches imagery scale.
    meshTerrainOffset: 1,
    qualityPreset: auto.qualityPreset,
    maxTerrainTiles: auto.maxTerrainTiles,
    maxWorkers: auto.maxWorkers,
    maxConcurrentFetches: auto.maxConcurrentFetches,
    cacheShadingNormals: auto.cacheShadingNormals,
    aggressiveMemoryReclaim: auto.aggressiveMemoryReclaim,
    memoryBudgetMB: auto.memoryBudgetMB,
    dirty: true,
    ...initial,
  } as Settings, {
    set(target: Settings, prop: string, value: any) {
      if (prop !== 'dirty' && (target as any)[prop] !== value) target.dirty = true;
      (target as any)[prop] = value;
      return true;
    }
  }) as Settings;
}

export function createAttribution(sources: { attribution?: string }[]): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'terrain-attribution';
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const s of sources) {
    if (!s.attribution) continue;
    for (const part of s.attribution.split('|')) {
      const trimmed = part.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      parts.push(trimmed);
    }
  }
  el.innerHTML = parts.join(' | ');
  return el;
}
