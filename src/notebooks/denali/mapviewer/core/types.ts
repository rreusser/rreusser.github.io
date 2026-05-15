export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export interface MercatorBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SourceConfig {
  type: 'terrain' | 'raster' | 'geojson';
  tiles?: string[];
  data?: string;
  encoding?: string;
  minzoom?: number;
  maxzoom?: number;
  bounds?: [number, number, number, number];
  attribution?: string;
  simplify?: number;
}

export interface LayerConfig {
  id: string;
  type: 'line' | 'circle' | 'text';
  source: string;
  collision?: boolean;
  paint?: Record<string, any>;
}

export interface LayerEntry {
  id: string;
  type: 'line' | 'circle' | 'text';
  visible: boolean;
  userCreated: boolean;
  paint: Record<string, any>;
}

export interface RaycastResult {
  worldPos: [number, number, number];
  t: number;
  tile: TileCoord;
}

export interface CameraState {
  center: [number, number, number];
  distance: number;
  phi: number;
  theta: number;
}

export interface Settings {
  verticalExaggeration: number;
  densityThreshold: number;
  imageryDensityThreshold: number;
  showTileBorders: boolean;
  freezeCoverage: boolean;
  enableCollision: boolean;
  showCollisionBoxes: boolean;
  showWireframe: boolean;
  showImagery: boolean;
  showFeatures: boolean;
  showRoute: boolean;
  slopeAngleOpacity: number;
  slopeAspectMaskAbove: number;
  slopeAspectMaskNear: number;
  slopeAspectMaskBelow: number;
  slopeAspectOpacity: number;
  treelineLower: number;
  treelineUpper: number;
  contourOpacity: number;
  collisionBuffer: number;
  occlusionBias: number;
  atmosphereDensity: number;
  hillshadeStrength: number;
  sunDirection: [number, number, number];
  lightingEnabled: boolean;
  shadowStrength: number;
  aoStrength: number;
  sunRadiusDeg: number;
  shadowSamples: number;
  // LSAO falloff: 'cos2' = Lambertian cos²α visibility, 'exp' = Naaji's exp(−sin α).
  lsaoFalloff: 'cos2' | 'exp';
  meshTerrainOffset: number;
  // Memory / quality knobs. Defaults are auto-detected from device class.
  // qualityPreset is informational; the individual knobs below are what
  // the engine reads at runtime.
  qualityPreset: 'desktop' | 'mobile' | 'low-mem';
  maxTerrainTiles: number;
  maxWorkers: number;
  maxConcurrentFetches: number;
  cacheShadingNormals: boolean;
  aggressiveMemoryReclaim: boolean;
  memoryBudgetMB: number | null;
  dirty: boolean;
}

export interface MapOptions {
  sources?: Record<string, SourceConfig>;
  base?: LayerConfig[];
  features?: LayerConfig[];
  camera?: Record<string, any>;
  location?: { lat: number; lon: number };
  settings?: Record<string, any>;
  pixelRatio?: number;
  font?: { atlas: string; metadata: string };
  createGPULines?: any;
  simplifyFn?: any;
}
