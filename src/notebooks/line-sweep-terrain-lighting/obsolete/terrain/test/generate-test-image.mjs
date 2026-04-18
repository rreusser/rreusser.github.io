#!/usr/bin/env node

// Test script to verify image saving works
import { saveAsImage, getStats } from '../data/save-image-node.js';

const tileSize = 512;
const data = new Float32Array(tileSize * tileSize);

// Create a test pattern - gradient with some interesting features
for (let y = 0; y < tileSize; y++) {
  for (let x = 0; x < tileSize; x++) {
    const i = y * tileSize + x;

    // Gradient with circular pattern
    const dx = x - tileSize / 2;
    const dy = y - tileSize / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const gradient = (x + y) / (tileSize * 2);
    const circle = Math.sin(dist / 30) * 0.5 + 0.5;

    data[i] = gradient * 0.7 + circle * 0.3;
  }
}

const stats = getStats(data);
console.log('Test data stats:', stats);

const outputPath = 'test/test-gradient.png';
await saveAsImage(data, tileSize, outputPath);
console.log(`✓ Saved test gradient to ${outputPath}`);
console.log(`  Run: open ${outputPath} (or use your image viewer)`);
