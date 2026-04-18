/**
 * Analyze what the correct sweep size should be for multi-level LSAO
 */

console.log('='.repeat(80));
console.log('ANALYZING SWEEP SIZE FOR MULTI-LEVEL LSAO');
console.log('='.repeat(80));

const tileSize = 512;

console.log(`\nTarget tile size: ${tileSize}×${tileSize}`);

console.log(`\n${'='.repeat(80)}`);
console.log('CURRENT FORMULA: maxSweepSize = tileSize * (1 + 2^(-numLevels))');
console.log('='.repeat(80));

for (let numLevels = 1; numLevels <= 4; numLevels++) {
  const maxDeltaZ = -numLevels;
  const maxSweepSize = Math.floor(tileSize * (1 + Math.pow(2, maxDeltaZ)));
  const sweepExtension = maxSweepSize - tileSize;
  const normExtensionEachSide = sweepExtension / 2 / tileSize;

  console.log(`\n${numLevels} level(s):`);
  console.log(`  maxDeltaZ = ${maxDeltaZ}`);
  console.log(`  2^maxDeltaZ = 2^${maxDeltaZ} = ${Math.pow(2, maxDeltaZ)}`);
  console.log(`  maxSweepSize = ${tileSize} * (1 + ${Math.pow(2, maxDeltaZ)}) = ${maxSweepSize} pixels`);
  console.log(`  Extension beyond target: ${sweepExtension} pixels (${normExtensionEachSide.toFixed(3)} tiles on each side)`);
}

console.log(`\n${'='.repeat(80)}`);
console.log('LEVEL COVERAGE ANALYSIS');
console.log('='.repeat(80));

console.log(`\nEach level provides terrain data at a specific resolution scale:`);

for (let level = 0; level < 4; level++) {
  const deltaZ = -(level + 1);
  const scale = Math.pow(2, Math.abs(deltaZ)); // 2, 4, 8, 16
  const targetSizeAtParent = tileSize / scale; // 256, 128, 64, 32

  // Parent buffer assembly creates outputSize = tileSize * (1 + 2^deltaZ)
  const outputSize = Math.floor(tileSize * (1 + Math.pow(2, deltaZ)));
  const bufferRadius = (outputSize - targetSizeAtParent) / 2;
  const coverageInTiles = outputSize / targetSizeAtParent; // How many target tiles worth of coverage
  const extensionEachSide = bufferRadius / targetSizeAtParent; // Extension on each side in target tile units

  console.log(`\nLevel ${level} (deltaZ=${deltaZ}, scale=${scale}:1):`);
  console.log(`  Target size at this resolution: ${targetSizeAtParent}×${targetSizeAtParent} pixels`);
  console.log(`  Parent buffer size: ${outputSize}×${outputSize} pixels`);
  console.log(`  Coverage: ${coverageInTiles.toFixed(2)}× target tile (${extensionEachSide.toFixed(2)}× extension on each side)`);
  console.log(`  In normalized coords: extends from ${-extensionEachSide.toFixed(3)} to ${(1 + extensionEachSide).toFixed(3)}`);
}

console.log(`\n${'='.repeat(80)}`);
console.log('PROPOSED FIX: Use coverage of coarsest level');
console.log('='.repeat(80));

console.log(`\nIf we have multiple levels, the sweep should extend far enough to utilize`);
console.log(`the COARSEST level (widest coverage). The sweep size should be based on:`);
console.log(`  maxSweepSize = coverage of coarsest level * tileSize`);

for (let numLevels = 1; numLevels <= 4; numLevels++) {
  const coarsestLevel = numLevels - 1;
  const deltaZ = -(coarsestLevel + 1);
  const scale = Math.pow(2, Math.abs(deltaZ));
  const targetSizeAtParent = tileSize / scale;
  const outputSize = Math.floor(tileSize * (1 + Math.pow(2, deltaZ)));

  // Coverage in target tile units
  const coverageInTiles = outputSize / targetSizeAtParent;

  // Sweep size should be this coverage * tileSize
  const proposedSweepSize = Math.floor(coverageInTiles * tileSize);
  const currentSweepSize = Math.floor(tileSize * (1 + Math.pow(2, -numLevels)));

  console.log(`\n${numLevels} level(s) (coarsest = level ${coarsestLevel}, deltaZ=${deltaZ}):`);
  console.log(`  Coverage of coarsest level: ${coverageInTiles.toFixed(3)}× target tile`);
  console.log(`  Proposed sweep size: ${proposedSweepSize} pixels`);
  console.log(`  Current sweep size: ${currentSweepSize} pixels`);
  console.log(`  Difference: ${proposedSweepSize > currentSweepSize ? '+' : ''}${proposedSweepSize - currentSweepSize} pixels`);
}

console.log(`\n${'='.repeat(80)}`);
console.log('ALTERNATIVE: Fixed formula based on deepest deltaZ');
console.log('='.repeat(80));

console.log(`\nAlternative: maxSweepSize = tileSize * (1 + 2^deepestDeltaZ) where deepestDeltaZ = -(numLevels)`);
console.log(`This would make sweep size INCREASE with more levels (correct behavior).`);
console.log(`\nBut wait, that's what we already have! Let me recalculate...`);

for (let numLevels = 1; numLevels <= 4; numLevels++) {
  const deepestDeltaZ = -numLevels;

  // The current formula uses 2^(-numLevels) which is LESS than 1
  // Should it be 2^(numLevels-1) instead?
  const currentFormula = Math.floor(tileSize * (1 + Math.pow(2, deepestDeltaZ)));

  // What if we use abs(deepestDeltaZ)?
  const absFormula = Math.floor(tileSize * (1 + Math.pow(2, Math.abs(deepestDeltaZ))));

  // Or just numLevels?
  const levelFormula = Math.floor(tileSize * (1 + numLevels));

  console.log(`\n${numLevels} level(s):`);
  console.log(`  Current: tileSize * (1 + 2^${deepestDeltaZ}) = ${currentFormula} pixels`);
  console.log(`  With abs(): tileSize * (1 + 2^${Math.abs(deepestDeltaZ)}) = ${absFormula} pixels`);
  console.log(`  Linear: tileSize * (1 + ${numLevels}) = ${levelFormula} pixels`);
}

console.log(`\n${'='.repeat(80)}`);
console.log('CONCLUSION');
console.log('='.repeat(80));

console.log(`\nThe bug is in the formula:`);
console.log(`  WRONG: maxSweepSize = tileSize * (1 + 2^(-numLevels))`);
console.log(`         This DECREASES as numLevels increases!`);
console.log(`\n  CORRECT: maxSweepSize = tileSize * (1 + 2^(numLevels-1))`);
console.log(`           OR: Use coverage of coarsest level`);
console.log(`           OR: maxSweepSize = tileSize * (1 + Math.pow(2, Math.abs(deepestDeltaZ)))`);

console.log(`\nWith the abs() fix:`);
for (let numLevels = 1; numLevels <= 4; numLevels++) {
  const deepestDeltaZ = -numLevels;
  const maxSweepSize = Math.floor(tileSize * (1 + Math.pow(2, Math.abs(deepestDeltaZ))));
  const current = Math.floor(tileSize * (1 + Math.pow(2, deepestDeltaZ)));
  console.log(`  ${numLevels} level(s): ${maxSweepSize} pixels (was ${current})`);
}
