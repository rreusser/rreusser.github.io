// Tile elevation decode worker.
// Receives raw RGBA pixel data, decodes to Float32 elevations,
// pads to 514x514, row-aligns for GPU upload, computes min/max bounds.

// Mapbox Terrain-RGB: tiles are 514x514 (512 + 1px border on each side)
function decodeTerrainRGB(pixels: Uint8Array | Uint8ClampedArray, width: number, height: number) {
  const elevations = new Float32Array(width * height);
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  for (let i = 0; i < width * height; i++) {
    const j = i * 4;
    const elev = -10000 + (pixels[j] * 65536 + pixels[j + 1] * 256 + pixels[j + 2]) * 0.1;
    elevations[i] = elev;
    if (elev < minElevation) minElevation = elev;
    if (elev > maxElevation) maxElevation = elev;
  }
  return { elevations, minElevation, maxElevation };
}

// Terrarium: tiles are 512x512 with no border. Decode and extrapolate to 514x514.
function decodeTerrarium(pixels: Uint8Array | Uint8ClampedArray, width: number, height: number) {
  const elevations = new Float32Array(514 * 514);
  let minElevation = Infinity;
  let maxElevation = -Infinity;

  for (let row = 0; row < 512; row++) {
    for (let col = 0; col < 512; col++) {
      const si = (row * 512 + col) * 4;
      const elev = (pixels[si] * 256 + pixels[si + 1] + pixels[si + 2] / 256) - 32768;
      elevations[(row + 1) * 514 + (col + 1)] = elev;
      if (elev < minElevation) minElevation = elev;
      if (elev > maxElevation) maxElevation = elev;
    }
  }

  // Extrapolate left column (col=0, rows 1..512)
  for (let row = 1; row <= 512; row++) {
    elevations[row * 514] = 2 * elevations[row * 514 + 1] - elevations[row * 514 + 2];
  }
  // Extrapolate right column (col=513, rows 1..512)
  for (let row = 1; row <= 512; row++) {
    elevations[row * 514 + 513] = 2 * elevations[row * 514 + 512] - elevations[row * 514 + 511];
  }
  // Extrapolate top row (row=0, all cols including corners)
  for (let col = 0; col < 514; col++) {
    elevations[col] = 2 * elevations[514 + col] - elevations[514 * 2 + col];
  }
  // Extrapolate bottom row (row=513, all cols including corners)
  for (let col = 0; col < 514; col++) {
    elevations[513 * 514 + col] = 2 * elevations[512 * 514 + col] - elevations[511 * 514 + col];
  }

  return { elevations, minElevation, maxElevation };
}

// Row-pad 514x514 Float32 elevations for GPU upload (256-byte aligned rows).
// 514 pixels * 4 bytes = 2056 bytes per row, padded to 2304 (= 256 * 9).
function padForGPU(elevations: Float32Array): Uint8Array {
  const bytesPerRow = 2304;
  const paddedData = new Uint8Array(bytesPerRow * 514);
  const srcBytes = new Uint8Array(elevations.buffer, elevations.byteOffset, elevations.byteLength);
  for (let row = 0; row < 514; row++) {
    paddedData.set(
      srcBytes.subarray(row * 514 * 4, (row + 1) * 514 * 4),
      row * bytesPerRow,
    );
  }
  return paddedData;
}

self.onmessage = (e: MessageEvent) => {
  const { type, id, pixels, width, height } = e.data;

  const { elevations, minElevation, maxElevation } = type === 'decode-terrain-rgb'
    ? decodeTerrainRGB(pixels, width, height)
    : decodeTerrarium(pixels, width, height);

  const paddedData = padForGPU(elevations);

  (self as any).postMessage(
    { id, elevations, paddedData, minElevation, maxElevation },
    [elevations.buffer, paddedData.buffer],
  );
};
