import type { Settings } from './core/types.ts';

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
  return new Proxy({
    verticalExaggeration: 1.0,
    densityThreshold: 1.0,
    imageryDensityThreshold: 1.0,
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
    contourOpacity: 0.5,
    collisionBuffer: 4,
    occlusionBias: 0.03,
    atmosphereDensity: 0.35,
    hillshadeOpacity: 0.95,
    sunDirection: [0.5, 0.7, 0.5] as [number, number, number],
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
  el.innerHTML = sources
    .filter(s => s.attribution)
    .map(s => s.attribution)
    .join(' | ');
  return el;
}
