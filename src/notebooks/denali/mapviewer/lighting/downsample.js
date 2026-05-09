// 2:1 (or arbitrary integer-ratio) box-filter downsample of the inner
// region of a padded elevation tile.
//
// Our terrain tiles are stored as paddedSize×paddedSize Float32 arrays
// with a 1-pixel skirt on each side (paddedSize = 514, inner 512×512
// covers the tile's geographic bounds). The bake operates at compN
// (default 256), so we 2x2-average the inner region down to compN.

export function downsampleInner(elevPadded, paddedSize, outSize) {
  const innerSize = paddedSize - 2;
  const ratio = innerSize / outSize;
  if (ratio !== Math.floor(ratio) || ratio < 1) {
    throw new Error(`downsampleInner: innerSize ${innerSize} not an integer multiple of outSize ${outSize}`);
  }
  const r = ratio | 0;
  const out = new Float32Array(outSize * outSize);
  const stride = paddedSize;
  const invSamples = 1 / (r * r);
  for (let row = 0; row < outSize; row++) {
    const srcRowStart = row * r + 1; // +1 to skip the top skirt
    for (let col = 0; col < outSize; col++) {
      const srcColStart = col * r + 1; // +1 to skip the left skirt
      let sum = 0;
      for (let dr = 0; dr < r; dr++) {
        const rowOff = (srcRowStart + dr) * stride + srcColStart;
        for (let dc = 0; dc < r; dc++) {
          sum += elevPadded[rowOff + dc];
        }
      }
      out[row * outSize + col] = sum * invSamples;
    }
  }
  return out;
}
