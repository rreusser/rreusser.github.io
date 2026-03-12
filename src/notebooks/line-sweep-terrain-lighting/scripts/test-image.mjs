#!/usr/bin/env node

// Simple test to verify image saving works
import { saveAsImage, getStats } from './save-image.js';

const tileSize = 512;
const data = new Float32Array(tileSize * tileSize);

// Create a test pattern - gradient
for (let y = 0; y < tileSize; y++) {
  for (let x = 0; x < tileSize; x++) {
    const i = y * tileSize + x;
    data[i] = (x + y) / (tileSize * 2);
  }
}

const stats = getStats(data);
console.log('Test data stats:', stats);

await saveAsImage(data, tileSize, '/tmp/test-gradient.png');
console.log('Saved test gradient to /tmp/test-gradient.png');
