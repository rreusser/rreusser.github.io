/**
 * Type definitions for LSAO compute pipeline
 */

/**
 * Level metadata for a single parent level
 */
export interface LevelInfo {
  /** Buffer size in pixels (at this level's resolution) */
  bufferSize: number;

  /** Scale factor (2^stepsUp): how many target pixels per parent pixel */
  scale: number;

  /** Coverage minimum in normalized coordinates [x, y] */
  coverageMin: [number, number];

  /** Coverage maximum in normalized coordinates [x, y] (exclusive) */
  coverageMax: [number, number];

  /** Target position within buffer in buffer pixel coordinates [x, y] */
  targetOffset: [number, number];
}

/**
 * Options for creating LSAO pipeline
 */
export interface LSAOPipelineOptions {
  /** Target tile size in pixels (default: 512) */
  tileSize?: number;

  /** Buffer pixels on each edge (default: 1) */
  tileBuffer?: number;

  /** Number of parent levels (1-4, default: 1) */
  numLevels?: number;

  /** Workgroup size (default: 128) */
  workgroupSize?: number;
}

/**
 * Result of creating LSAO pipeline
 */
export interface LSAOPipeline {
  /** Compute pipeline */
  pipeline: GPUComputePipeline;

  /** Bind group layout */
  bindGroupLayout: GPUBindGroupLayout;
}

/**
 * Parameters for LSAO uniform packing
 */
export interface LSAOUniformParams {
  /** Tile dimensions [width, height] */
  tileSize: [number, number];

  /** Sweep direction [dx, dy] */
  step: [number, number];

  /** Tile buffer size */
  buffer: number;

  /** Target pixel size in meters */
  pixelSize: number;

  /** Normalization factor (1/num_directions) */
  normalization: number;

  /** Array of level info objects (1-4 levels) */
  levels: LevelInfo[];
}

/**
 * Parameters for LSAO computation
 */
export interface LSAOComputeParams {
  /** WebGPU device */
  device: GPUDevice;

  /** LSAO compute pipeline */
  pipeline: GPUComputePipeline;

  /** Bind group layout */
  bindGroupLayout: GPUBindGroupLayout;

  /** Target tile terrain data (buffered, e.g., 514×514) */
  targetData: Float32Array;

  /** Parent buffer data (one per level) */
  parentLevels: Float32Array[];

  /** Metadata for each level */
  levelInfo: LevelInfo[];

  /** Target tile size (512) */
  tileSize: number;

  /** Target pixel size in meters */
  pixelSize: number;

  /** Workgroup size (default: 128) */
  workgroupSize?: number;

  /** Sweep directions (default: [[1,0], [-1,0], [0,1], [0,-1]]) */
  directions?: [number, number][];
}
