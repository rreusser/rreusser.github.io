#!/usr/bin/env node

// Fetch a real terrain tile and visualize it
import { getTerrainTile } from '../data/fetch-tile-sharp.js';
import { saveAsImage, getStats } from '../data/save-image-node.js';
import { getTileSet } from '../tile-hierarchy.js';
import sharp from 'sharp';

const coords = { x: 795, y: 1594, z: 12 };

console.log(`Fetching terrain tile ${coords.z}/${coords.x}/${coords.y}...`);

const tile = await getTerrainTile(coords);
console.log(`✓ Fetched tile: ${tile.width}×${tile.height} (tileSize=${tile.tileSize}, buffer=${tile.buffer})`);

const stats = getStats(tile.data);
console.log(`  Elevation range: ${stats.min.toFixed(1)}m to ${stats.max.toFixed(1)}m`);
console.log(`  Mean elevation: ${stats.mean.toFixed(1)}m`);

// Create elevation heatmap (similar to notebook visualization)
const pixels = new Uint8Array(tile.tileSize * tile.tileSize * 3);

for (let y = 0; y < tile.tileSize; y++) {
  for (let x = 0; x < tile.tileSize; x++) {
    const srcIdx = (y + tile.buffer) * tile.width + (x + tile.buffer);
    const dstIdx = (y * tile.tileSize + x) * 3;

    const normalized = (tile.data[srcIdx] - stats.min) / (stats.max - stats.min);

    // Terrain color scheme (blue=low, green=mid, red=high)
    pixels[dstIdx] = Math.floor(normalized * 180 + 75);     // R
    pixels[dstIdx + 1] = Math.floor(normalized * 140 + 80); // G
    pixels[dstIdx + 2] = Math.floor((1 - normalized) * 120 + 60); // B
  }
}

await sharp(pixels, {
  raw: {
    width: tile.tileSize,
    height: tile.tileSize,
    channels: 3
  }
})
.png()
.toFile('test/elevation-heatmap.png');

console.log('\n✓ Saved elevation heatmap to test/elevation-heatmap.png');

// Also save as grayscale for simpler visualization
const grayscale = new Float32Array(tile.tileSize * tile.tileSize);
for (let y = 0; y < tile.tileSize; y++) {
  for (let x = 0; x < tile.tileSize; x++) {
    const srcIdx = (y + tile.buffer) * tile.width + (x + tile.buffer);
    const dstIdx = y * tile.tileSize + x;
    const normalized = (tile.data[srcIdx] - stats.min) / (stats.max - stats.min);
    grayscale[dstIdx] = normalized;
  }
}

await saveAsImage(grayscale, tile.tileSize, 'test/elevation-grayscale.png');
console.log('✓ Saved grayscale elevation to test/elevation-grayscale.png');

// Show tile hierarchy
console.log('\nTile hierarchy:');
const tiles = getTileSet(coords);
tiles.forEach(t => {
  console.log(`  ${t.role.padEnd(15)} ${t.z}/${t.x}/${t.y}`);
});

console.log('\nRun: open test/elevation-heatmap.png');
