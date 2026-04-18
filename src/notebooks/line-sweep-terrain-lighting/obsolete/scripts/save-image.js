// Image saving utilities for Node.js
import { writeFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

/**
 * Save Float32Array as grayscale PNG image
 *
 * @param {Float32Array} data - Lighting values [0,1]
 * @param {number} size - Image size (width and height)
 * @param {string} filename - Output filename
 * @returns {Promise<void>}
 */
export async function saveAsImage(data, size, filename) {
  // Create JSDOM for canvas
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const canvas = dom.window.document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Convert Float32Array [0,1] to Uint8ClampedArray [0,255]
  const imageData = ctx.createImageData(size, size);
  const pixels = imageData.data;

  for (let i = 0; i < data.length; i++) {
    const value = Math.floor(Math.min(Math.max(data[i], 0), 1) * 255);
    pixels[i * 4] = value;     // R
    pixels[i * 4 + 1] = value; // G
    pixels[i * 4 + 2] = value; // B
    pixels[i * 4 + 3] = 255;   // A
  }

  ctx.putImageData(imageData, 0, 0);

  // Convert canvas to PNG buffer
  const buffer = canvas.toBuffer('image/png');
  await writeFile(filename, buffer);
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
export function getPixel(data, x, y, width) {
  return data[y * width + x];
}

/**
 * Get basic statistics about the data
 *
 * @param {Float32Array} data - Image data
 * @returns {{min: number, max: number, mean: number}}
 */
export function getStats(data) {
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
