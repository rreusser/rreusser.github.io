/**
 * Debug the contribution formula to understand why results are washed out
 */

console.log('='.repeat(80));
console.log('ANALYZING OCCLUSION CONTRIBUTION FORMULA');
console.log('='.repeat(80));

const normalization = 0.25; // 1/4 directions
const pixelSize = 19.109; // meters per pixel

console.log(`\nConfiguration:`);
console.log(`  Normalization: ${normalization} (1/4 directions)`);
console.log(`  Pixel size: ${pixelSize}m`);

console.log(`\nFormula: contribution = normalization * exp(-dijzNormalized[2] / length)`);
console.log(`Where:`);
console.log(`  dijz[2] = horizonZ - currentZ`);
console.log(`  dijzNormalized[2] = dijz[2] / pixelSize`);
console.log(`  length = sqrt(dijzNormalized[0]^2 + dijzNormalized[1]^2 + dijzNormalized[2]^2)`);

console.log(`\n${'='.repeat(80)}`);
console.log('CASE 1: Horizon BELOW current point (should have NO occlusion)');
console.log('='.repeat(80));

const currentZ1 = 1694.80; // Peak elevation
const horizonZ1 = 1641.60; // Initial horizon (lower)
const dijz1 = horizonZ1 - currentZ1;
const dijzNorm1 = dijz1 / pixelSize;

console.log(`\nExample: Peak of terrain`);
console.log(`  Current elevation: ${currentZ1}m`);
console.log(`  Horizon elevation: ${horizonZ1}m`);
console.log(`  dijz[2] = ${horizonZ1} - ${currentZ1} = ${dijz1.toFixed(2)}m (NEGATIVE = horizon below)`);
console.log(`  dijzNormalized[2] = ${dijz1.toFixed(2)} / ${pixelSize} = ${dijzNorm1.toFixed(3)}`);

// Assume horizontal distance of ~1000m (sweep from normX=-0.127 to normX=0.125)
const horizontalDist1 = 0.252 * 512 * pixelSize; // ~2458m
const dijzNormalized1 = [horizontalDist1, 0, dijz1 / pixelSize];
const length1 = Math.sqrt(
  dijzNormalized1[0] * dijzNormalized1[0] +
  dijzNormalized1[1] * dijzNormalized1[1] +
  dijzNormalized1[2] * dijzNormalized1[2]
);

const contribution1 = normalization * Math.exp(-dijzNormalized1[2] / length1);

console.log(`  Horizontal distance: ${horizontalDist1.toFixed(1)}m`);
console.log(`  length = sqrt(${horizontalDist1.toFixed(1)}^2 + 0^2 + ${(dijz1/pixelSize).toFixed(1)}^2) = ${length1.toFixed(1)}`);
console.log(`  Exponent: -dijzNormalized[2] / length = -(${dijzNorm1.toFixed(3)}) / ${length1.toFixed(1)} = ${(-dijzNorm1 / length1).toFixed(6)}`);
console.log(`  exp(${(-dijzNorm1 / length1).toFixed(6)}) = ${Math.exp(-dijzNorm1 / length1).toFixed(6)}`);
console.log(`  contribution = ${normalization} * ${Math.exp(-dijzNorm1 / length1).toFixed(6)} = ${contribution1.toFixed(6)}`);
console.log(`\n  ❌ PROBLEM: contribution = ${contribution1.toFixed(6)} > ${normalization} (baseline)`);
console.log(`  This INCREASES brightness when horizon is below!`);

console.log(`\n${'='.repeat(80)}`);
console.log('CASE 2: Horizon ABOVE current point (should have STRONG occlusion)');
console.log('='.repeat(80));

const currentZ2 = 1536.80; // Valley elevation
const horizonZ2 = 1694.80; // Peak blocking view
const dijz2 = horizonZ2 - currentZ2;
const dijzNorm2 = dijz2 / pixelSize;

console.log(`\nExample: Valley with peak blocking view`);
console.log(`  Current elevation: ${currentZ2}m`);
console.log(`  Horizon elevation: ${horizonZ2}m`);
console.log(`  dijz[2] = ${horizonZ2} - ${currentZ2} = ${dijz2.toFixed(2)}m (POSITIVE = horizon above)`);
console.log(`  dijzNormalized[2] = ${dijz2.toFixed(2)} / ${pixelSize} = ${dijzNorm2.toFixed(3)}`);

const horizontalDist2 = 0.5 * 512 * pixelSize; // ~4892m
const dijzNormalized2 = [horizontalDist2, 0, dijz2 / pixelSize];
const length2 = Math.sqrt(
  dijzNormalized2[0] * dijzNormalized2[0] +
  dijzNormalized2[1] * dijzNormalized2[1] +
  dijzNormalized2[2] * dijzNormalized2[2]
);

const contribution2 = normalization * Math.exp(-dijzNormalized2[2] / length2);

console.log(`  Horizontal distance: ${horizontalDist2.toFixed(1)}m`);
console.log(`  length = sqrt(${horizontalDist2.toFixed(1)}^2 + 0^2 + ${(dijz2/pixelSize).toFixed(1)}^2) = ${length2.toFixed(1)}`);
console.log(`  Exponent: -dijzNormalized[2] / length = -(${dijzNorm2.toFixed(3)}) / ${length2.toFixed(1)} = ${(-dijzNorm2 / length2).toFixed(6)}`);
console.log(`  exp(${(-dijzNorm2 / length2).toFixed(6)}) = ${Math.exp(-dijzNorm2 / length2).toFixed(6)}`);
console.log(`  contribution = ${normalization} * ${Math.exp(-dijzNorm2 / length2).toFixed(6)} = ${contribution2.toFixed(6)}`);
console.log(`\n  ✓ CORRECT: contribution = ${contribution2.toFixed(6)} < ${normalization} (baseline)`);
console.log(`  This DECREASES brightness when horizon is above.`);

console.log(`\n${'='.repeat(80)}`);
console.log('DIAGNOSIS');
console.log('='.repeat(80));

console.log(`\nThe formula has the CORRECT behavior when:`);
console.log(`  - Horizon ABOVE current point (dijz > 0): contribution < normalization ✓`);
console.log(`  - Horizon BELOW current point (dijz < 0): contribution > normalization ✗`);

console.log(`\nThe PROBLEM:`);
console.log(`  When sweeping from west to east, we initialize the horizon from parent data`);
console.log(`  at the START of the sweep (west side). If the terrain rises as we sweep east,`);
console.log(`  the horizon stays LOW (at the initial elevation), causing:`);
console.log(`    - Most pixels have horizon BELOW them (dijz < 0)`);
console.log(`    - Formula gives contribution > normalization`);
console.log(`    - Result: Everything is TOO BRIGHT (washed out)`);

console.log(`\nPossible causes:`);
console.log(`  1. Hull algorithm isn't updating horizon correctly`);
console.log(`  2. Initialization is using wrong elevation from parent data`);
console.log(`  3. Multi-level sweep is too SHORT to accumulate proper horizon`);

console.log(`\nLet's check if the formula should be different...`);
console.log(`\nAlternative formula 1: contribution = normalization * exp(+dijzNormalized[2] / length)`);
console.log(`  (flip sign in exponent)`);

const alt1_contrib1 = normalization * Math.exp(dijzNorm1 / length1);
const alt1_contrib2 = normalization * Math.exp(dijzNorm2 / length2);

console.log(`  Case 1 (horizon below): ${alt1_contrib1.toFixed(6)} ${alt1_contrib1 < normalization ? '✓' : '✗'}`);
console.log(`  Case 2 (horizon above): ${alt1_contrib2.toFixed(6)} ${alt1_contrib2 > normalization ? '✗' : '✓'}`);
console.log(`  Result: ✗ This INVERTS the behavior (wrong)`);

console.log(`\nAlternative formula 2: contribution = normalization * (1 - exp(-abs(dijzNormalized[2]) / length))`);

const alt2_contrib1 = normalization * (1 - Math.exp(-Math.abs(dijzNorm1) / length1));
const alt2_contrib2 = normalization * (1 - Math.exp(-Math.abs(dijzNorm2) / length2));

console.log(`  Case 1 (horizon below): ${alt2_contrib1.toFixed(6)} ${alt2_contrib1 < normalization ? '✓' : '✗'}`);
console.log(`  Case 2 (horizon above): ${alt2_contrib2.toFixed(6)} ${alt2_contrib2 < normalization ? '✓' : '✗'}`);
console.log(`  Result: ✗ Always decreases (doesn't distinguish up from down)`);

console.log(`\nAlternative formula 3: contribution = normalization * exp(-max(0, dijzNormalized[2]) / length)`);
console.log(`  (clamp negative values to 0)`);

const alt3_contrib1 = normalization * Math.exp(-Math.max(0, dijzNorm1) / length1);
const alt3_contrib2 = normalization * Math.exp(-Math.max(0, dijzNorm2) / length2);

console.log(`  Case 1 (horizon below): ${alt3_contrib1.toFixed(6)} ${Math.abs(alt3_contrib1 - normalization) < 0.001 ? '✓' : '✗'} (should be ${normalization})`);
console.log(`  Case 2 (horizon above): ${alt3_contrib2.toFixed(6)} ${alt3_contrib2 < normalization ? '✓' : '✗'}`);
console.log(`  Result: ✓ This seems correct!`);

console.log(`\n${'='.repeat(80)}`);
console.log('CONCLUSION');
console.log('='.repeat(80));

console.log(`\nThe current formula allows contributions > normalization when horizon is below.`);
console.log(`This is mathematically valid (it means NEGATIVE occlusion = extra brightness).`);
console.log(`\nBUT: If the horizon initialization is wrong (too low), then MOST pixels will`);
console.log(`have negative occlusion, causing the washed-out appearance.`);

console.log(`\nNext step: Check if horizon is being properly updated during the sweep.`);
console.log(`The hull should contain the VISIBLE horizon, which should rise with the terrain.`);
