// Image saving utilities for Node.js using pngjs (pure JavaScript)
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

/**
 * Save Float32Array as grayscale PNG image
 *
 * @param {Float32Array} data - Lighting values [0,1]
 * @param {number} size - Image size (width and height)
 * @param {string} filename - Output filename
 * @returns {Promise<void>}
 */
export async function saveAsImage(data: Float32Array, size: number, filename: string): Promise<void> {
  // Create PNG - pngjs always uses RGBA internally
  const png = new PNG({
    width: size,
    height: size,
    colorType: 0, // Grayscale output
    bitDepth: 8
  });

  // Convert Float32Array [0,1] to RGBA pixels (grayscale = R=G=B)
  // pngjs buffer is always RGBA (4 bytes per pixel) regardless of colorType
  for (let i = 0; i < data.length; i++) {
    const value = Math.floor(Math.min(Math.max(data[i], 0), 1) * 255);
    const idx = i * 4;
    png.data[idx] = value;      // R
    png.data[idx + 1] = value;  // G
    png.data[idx + 2] = value;  // B
    png.data[idx + 3] = 255;    // A (fully opaque)
  }

  // Encode and save
  const buffer = PNG.sync.write(png);
  writeFileSync(filename, buffer);
}

/**
 * Get pixel value at coordinates for testing
 *
 * @param {Float32Array} data - Image data
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Image width
 * @returns {number} Pixel value
 */
export function getPixel(data: Float32Array, x: number, y: number, width: number): number {
  return data[y * width + x];
}

/**
 * Get basic statistics about the data
 *
 * @param {Float32Array} data - Image data
 * @returns {{min: number, max: number, mean: number}}
 */
export function getStats(data: Float32Array): { min: number; max: number; mean: number } {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    if (val < min) min = val;
    if (val > max) max = val;
    sum += val;
  }

  return {
    min,
    max,
    mean: sum / data.length
  };
}
