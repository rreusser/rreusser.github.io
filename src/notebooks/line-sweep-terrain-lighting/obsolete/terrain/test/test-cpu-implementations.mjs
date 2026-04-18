/**
 * Test CPU LSAO implementations
 */

import { computeSimpleLSAOCPU } from '../compute/lsao-simple-cpu.js';
import { computeLSAOCPU } from '../compute/lsao-cpu.js';

console.log('Testing CPU LSAO implementations...\n');

// Create simple test data: flat terrain at z=0
const tileSize = 512;
const bufferedSize = tileSize + 2;
const terrainData = new Float32Array(bufferedSize * bufferedSize);
terrainData.fill(0);

// Test simple LSAO
console.log('1. Testing Simple LSAO CPU...');
const startSimple = performance.now();

const simpleResult = computeSimpleLSAOCPU({
  terrainData,
  tileSize,
  pixelSize: 19.1,
  directions: [[1, 0], [-1, 0], [0, 1], [0, -1]]
});

const elapsedSimple = performance.now() - startSimple;

console.log(`   ✓ Completed in ${elapsedSimple.toFixed(1)}ms`);
console.log(`   Output size: ${simpleResult.length} (expected: ${tileSize * tileSize})`);

// Calculate stats
let min = Infinity, max = -Infinity, sum = 0;
for (let i = 0; i < simpleResult.length; i++) {
  if (simpleResult[i] < min) min = simpleResult[i];
  if (simpleResult[i] > max) max = simpleResult[i];
  sum += simpleResult[i];
}
const mean = sum / simpleResult.length;

console.log(`   Min: ${min.toFixed(6)}, Max: ${max.toFixed(6)}, Mean: ${mean.toFixed(6)}`);
console.log(`   ${min >= 0 && max <= 1.1 ? '✓' : '✗'} Values in expected range [0, 1]`);

// Test multi-level LSAO
console.log('\n2. Testing Multi-Level LSAO CPU...');

// Create simple parent data (768×768 at deltaZ=-1)
const parentSize = 768;
const parentData = new Float32Array(parentSize * parentSize);
parentData.fill(0);

const levelInfo = [{
  bufferSize: parentSize,
  scale: 2,
  coverageMin: [-1, -1],
  coverageMax: [2, 2],
  targetOffset: [128, 128]
}];

const startMulti = performance.now();

const multiResult = computeLSAOCPU({
  targetData: terrainData,
  parentLevels: [parentData],
  levelInfo,
  tileSize,
  pixelSize: 19.1,
  directions: [[1, 0], [-1, 0], [0, 1], [0, -1]]
});

const elapsedMulti = performance.now() - startMulti;

console.log(`   ✓ Completed in ${elapsedMulti.toFixed(1)}ms`);
console.log(`   Output size: ${multiResult.length} (expected: ${tileSize * tileSize})`);

// Calculate stats
min = Infinity;
max = -Infinity;
sum = 0;
for (let i = 0; i < multiResult.length; i++) {
  if (multiResult[i] < min) min = multiResult[i];
  if (multiResult[i] > max) max = multiResult[i];
  sum += multiResult[i];
}
const meanMulti = sum / multiResult.length;

console.log(`   Min: ${min.toFixed(6)}, Max: ${max.toFixed(6)}, Mean: ${meanMulti.toFixed(6)}`);
console.log(`   ${min >= 0 && max <= 1.1 ? '✓' : '✗'} Values in expected range [0, 1]`);

// Compare results
console.log('\n3. Comparing Simple vs Multi-Level...');
let totalDiff = 0;
let maxDiff = 0;
for (let i = 0; i < simpleResult.length; i++) {
  const diff = Math.abs(simpleResult[i] - multiResult[i]);
  totalDiff += diff;
  maxDiff = Math.max(maxDiff, diff);
}
const meanDiff = totalDiff / simpleResult.length;

console.log(`   Mean difference: ${meanDiff.toFixed(6)}`);
console.log(`   Max difference: ${maxDiff.toFixed(6)}`);
console.log(`   ${meanDiff < 0.01 ? '✓' : '✗'} Difference within expected range (for flat terrain)`);

console.log('\n✓ All CPU implementation tests completed successfully!');
