/**
 * CPU implementation of simple LSAO (single tile, no parent data)
 *
 * This provides a reference implementation that exactly matches the GPU shader
 * logic for debugging and validation purposes.
 */

interface ComputeSimpleLSAOCPUParams {
  terrainData: Float32Array;
  tileSize: number;
  pixelSize: number;
  directions?: [number, number][];
}

/**
 * Compute LSAO for a single tile on CPU (no parent buffer)
 *
 * @param {Object} params
 * @param {Float32Array} params.terrainData - Buffered terrain data (514×514)
 * @param {number} params.tileSize - Tile size (512)
 * @param {number} params.pixelSize - Pixel size in meters
 * @param {Array<[number, number]>} [params.directions] - Sweep directions
 * @returns {Float32Array} AO values [0,1] for each pixel
 */
export function computeSimpleLSAOCPU({
  terrainData,
  tileSize,
  pixelSize,
  directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]
}: ComputeSimpleLSAOCPUParams): Float32Array {
  const tileBuffer = 1;
  const bufferedSize = tileSize + 2 * tileBuffer;
  const outputSize = tileSize * tileSize;

  // Validate input size
  if (terrainData.length !== bufferedSize * bufferedSize) {
    throw new Error(
      `Terrain data size mismatch: expected ${bufferedSize}×${bufferedSize}, got ${terrainData.length}`
    );
  }

  // Initialize output buffer
  const outputData = new Float32Array(outputSize);
  outputData.fill(0);

  const normalization = 1.0 / directions.length;

  // Helper: Get index in unbuffered output (512×512)
  const unbufferedIndex = (ij: [number, number]): number => {
    return (ij[0] % tileSize) + ij[1] * tileSize;
  };

  // Helper: Get index in buffered input (514×514)
  const bufferedIndex = (ij: [number, number]): number => {
    const ijbuf = [ij[0] + tileBuffer, ij[1] + tileBuffer];
    return (ijbuf[0] % bufferedSize) + ijbuf[1] * bufferedSize;
  };

  // Process each direction
  for (const step of directions) {
    // Each scanline processes one row or column
    for (let scanlineIdx = 0; scanlineIdx < tileSize; scanlineIdx++) {
      // Determine starting position based on sweep direction
      let ij: [number, number] = [scanlineIdx, scanlineIdx];

      if (step[1] === 0) {
        // Horizontal sweep (east or west)
        ij[0] = step[0] < 0 ? tileSize - 1 : 0;
      } else if (step[0] === 0) {
        // Vertical sweep (north or south)
        ij[1] = step[1] < 0 ? tileSize - 1 : 0;
      }

      // Initialize convex hull stack with point just before starting edge
      const hull: Array<[number, number, number]> = [];
      const ijInit: [number, number] = [ij[0] - step[0], ij[1] - step[1]];
      const zInit = terrainData[bufferedIndex(ijInit)];
      hull.push([ijInit[0], ijInit[1], zInit]);

      // Sweep across the scanline
      for (let i = 0; i < tileSize; i++) {
        const uidx = unbufferedIndex(ij);
        const bidx = bufferedIndex(ij);
        const z = terrainData[bidx];

        // Compute visibility metric for current point
        const ijz: [number, number, number] = [ij[0], ij[1], z];
        const top = hull[hull.length - 1];
        let dijz = [top[0] - ijz[0], top[1] - ijz[1], top[2] - ijz[2]];
        let s0 = (dijz[2] * dijz[2]) / (dijz[0] * dijz[0] + dijz[1] * dijz[1] + dijz[2] * dijz[2]);
        s0 = dijz[2] > 0.0 ? s0 : -s0;

        // Pop hull points that are occluded by current point
        while (hull.length > 1) {
          const nextTop = hull[hull.length - 2];
          dijz = [nextTop[0] - ijz[0], nextTop[1] - ijz[1], nextTop[2] - ijz[2]];
          let s1 = (dijz[2] * dijz[2]) / (dijz[0] * dijz[0] + dijz[1] * dijz[1] + dijz[2] * dijz[2]);
          s1 = dijz[2] > 0.0 ? s1 : -s1;

          if (s0 > s1) {
            break;
          }

          s0 = s1;
          hull.pop();
        }

        // Compute AO contribution from horizon
        const horizonTop = hull[hull.length - 1];
        dijz = [horizonTop[0] - ijz[0], horizonTop[1] - ijz[1], horizonTop[2] - ijz[2]];
        const dijzNormalized = [dijz[0], dijz[1], dijz[2] / pixelSize];
        const length = Math.sqrt(
          dijzNormalized[0] * dijzNormalized[0] +
          dijzNormalized[1] * dijzNormalized[1] +
          dijzNormalized[2] * dijzNormalized[2]
        );
        const contribution = normalization * Math.exp(-dijzNormalized[2] / length);
        outputData[uidx] += contribution;

        // Push current point onto hull
        hull.push(ijz);

        // Advance to next pixel
        ij = [ij[0] + step[0], ij[1] + step[1]];
      }
    }
  }

  return outputData;
}
