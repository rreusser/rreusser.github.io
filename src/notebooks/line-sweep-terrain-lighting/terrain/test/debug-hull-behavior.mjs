/**
 * Trace hull updates during a sweep to see if horizon is being maintained correctly
 */

import { getTerrainTile } from '../data/fetch-tile-sharp.ts';
import { assembleParentTileBufferMultiLevel, getParentTilesAtLevel } from '../data/parent-tile-assembly-multi-level.ts';

async function traceSingleScanline(targetData, parentLevels, levelInfo, tileSize, pixelSize, scanlineIdx) {
  const tileBuffer = 1;
  const numLevels = parentLevels.length;
  const bufferedSize = tileSize + 2 * tileBuffer;
  const maxDeltaZ = -numLevels;
  const maxSweepSize = Math.floor(tileSize * (1 + Math.pow(2, maxDeltaZ)));
  const step = [1, 0]; // East direction

  const normalization = 0.25;

  console.log(`\nTracing scanline ${scanlineIdx} (maxSweepSize=${maxSweepSize}):`);

  // Helper functions
  const unbufferedIndex = (ij) => {
    const clamped = [
      Math.max(0, Math.min(tileSize - 1, ij[0])),
      Math.max(0, Math.min(tileSize - 1, ij[1]))
    ];
    return clamped[0] + clamped[1] * tileSize;
  };

  const bufferedIndex = (ij) => {
    const clamped = [
      Math.max(-tileBuffer, Math.min(tileSize + tileBuffer - 1, ij[0])),
      Math.max(-tileBuffer, Math.min(tileSize + tileBuffer - 1, ij[1]))
    ];
    const ijbuf = [clamped[0] + tileBuffer, clamped[1] + tileBuffer];
    return ijbuf[0] + ijbuf[1] * bufferedSize;
  };

  const sweepIndexToNormalized = (sweepIdx, scanlineIdx, step) => {
    let pixelPos = [0, 0];
    if (step[1] === 0) {
      const startX = step[0] < 0 ? maxSweepSize - 1 : 0;
      pixelPos[0] = startX + step[0] * sweepIdx;
      pixelPos[1] = scanlineIdx;
    } else {
      const startY = step[1] < 0 ? maxSweepSize - 1 : 0;
      pixelPos[0] = scanlineIdx;
      pixelPos[1] = startY + step[1] * sweepIdx;
    }

    const bufferCenter = maxSweepSize * 0.5;
    const targetHalfSize = tileSize * 0.5;
    return [
      (pixelPos[0] - bufferCenter + targetHalfSize) / tileSize,
      (pixelPos[1] - bufferCenter + targetHalfSize) / tileSize
    ];
  };

  const isInTarget = (normPos) => {
    return normPos[0] >= 0.0 && normPos[0] < 1.0 && normPos[1] >= 0.0 && normPos[1] < 1.0;
  };

  const isInLevel = (normPos, level) => {
    if (level >= numLevels) return false;
    const info = levelInfo[level];
    if (info.bufferSize === 0) return false;
    return (
      normPos[0] >= info.coverageMin[0] &&
      normPos[0] < info.coverageMax[0] &&
      normPos[1] >= info.coverageMin[1] &&
      normPos[1] < info.coverageMax[1]
    );
  };

  const normalizedToBufferCoords = (normPos, level) => {
    const info = levelInfo[level];
    const targetSizeAtLevel = tileSize / info.scale;
    return [
      info.targetOffset[0] + normPos[0] * targetSizeAtLevel,
      info.targetOffset[1] + normPos[1] * targetSizeAtLevel
    ];
  };

  const normalizedToTargetCoords = (normPos) => {
    return [Math.floor(normPos[0] * tileSize), Math.floor(normPos[1] * tileSize)];
  };

  const getPhysicalPosition = (normPos) => {
    return [normPos[0] * tileSize * pixelSize, normPos[1] * tileSize * pixelSize];
  };

  const sampleParentBilinear = (normPos, level) => {
    const info = levelInfo[level];
    const bufferCoords = normalizedToBufferCoords(normPos, level);
    const x0 = Math.floor(bufferCoords[0]);
    const y0 = Math.floor(bufferCoords[1]);
    const fx = bufferCoords[0] - x0;
    const fy = bufferCoords[1] - y0;

    const maxCoord = info.bufferSize - 1;
    const cx0 = Math.max(0, Math.min(maxCoord, x0));
    const cy0 = Math.max(0, Math.min(maxCoord, y0));
    const cx1 = Math.max(0, Math.min(maxCoord, x0 + 1));
    const cy1 = Math.max(0, Math.min(maxCoord, y0 + 1));

    const parentData = parentLevels[level];
    const v00 = parentData[cy0 * info.bufferSize + cx0];
    const v10 = parentData[cy0 * info.bufferSize + cx1];
    const v01 = parentData[cy1 * info.bufferSize + cx0];
    const v11 = parentData[cy1 * info.bufferSize + cx1];

    const v0 = v00 * (1 - fx) + v10 * fx;
    const v1 = v01 * (1 - fx) + v11 * fx;
    return v0 * (1 - fy) + v1 * fy;
  };

  const sampleElevation = (normPos) => {
    if (isInTarget(normPos)) {
      const targetCoords = normalizedToTargetCoords(normPos);
      const idx = bufferedIndex(targetCoords);
      return targetData[idx];
    }
    for (let level = 0; level < numLevels; level++) {
      if (isInLevel(normPos, level)) {
        return sampleParentBilinear(normPos, level);
      }
    }
    return 0.0;
  };

  // Initialize hull
  let initPixelPos = [0, 0];
  if (step[1] === 0) {
    const startX = step[0] < 0 ? maxSweepSize - 1 : 0;
    initPixelPos[0] = startX - step[0];
    initPixelPos[1] = scanlineIdx;
  } else {
    const startY = step[1] < 0 ? maxSweepSize - 1 : 0;
    initPixelPos[0] = scanlineIdx;
    initPixelPos[1] = startY - step[1];
  }

  const bufferCenter = maxSweepSize * 0.5;
  const targetHalfSize = tileSize * 0.5;
  const initNormPos = [
    (initPixelPos[0] - bufferCenter + targetHalfSize) / tileSize,
    (initPixelPos[1] - bufferCenter + targetHalfSize) / tileSize
  ];
  const initZ = sampleElevation(initNormPos);
  const initPhysPos = getPhysicalPosition(initNormPos);

  const hull = [];
  hull.push([initPhysPos[0], initPhysPos[1], initZ]);

  console.log(`Init: normPos=[${initNormPos[0].toFixed(3)}, ${initNormPos[1].toFixed(3)}], z=${initZ.toFixed(2)}m, hull size=1`);

  // Track key events
  const events = [];

  // Sweep
  for (let i = 0; i < maxSweepSize; i++) {
    const normPos = sweepIndexToNormalized(i, scanlineIdx, step);
    const z = sampleElevation(normPos);
    const physPos = getPhysicalPosition(normPos);
    const ijz = [physPos[0], physPos[1], z];

    const initialHullSize = hull.length;
    const initialHorizon = hull[hull.length - 1][2];

    // Calculate visibility
    const top = hull[hull.length - 1];
    let dijz = [top[0] - ijz[0], top[1] - ijz[1], top[2] - ijz[2]];
    let s0 = (dijz[2] * dijz[2]) / (dijz[0] * dijz[0] + dijz[1] * dijz[1] + dijz[2] * dijz[2]);
    s0 = dijz[2] > 0.0 ? s0 : -s0;

    // Pop hull
    let poppedCount = 0;
    while (hull.length > 1) {
      const nextTop = hull[hull.length - 2];
      dijz = [nextTop[0] - ijz[0], nextTop[1] - ijz[1], nextTop[2] - ijz[2]];
      let s1 = (dijz[2] * dijz[2]) / (dijz[0] * dijz[0] + dijz[1] * dijz[1] + dijz[2] * dijz[2]);
      s1 = dijz[2] > 0.0 ? s1 : -s1;

      if (s0 > s1) break;
      s0 = s1;
      hull.pop();
      poppedCount++;
    }

    // Compute contribution if in target
    let contribution = null;
    if (isInTarget(normPos)) {
      const horizonTop = hull[hull.length - 1];
      dijz = [horizonTop[0] - ijz[0], horizonTop[1] - ijz[1], horizonTop[2] - ijz[2]];
      const dijzNormalized = [dijz[0], dijz[1], dijz[2] / pixelSize];
      const length = Math.sqrt(
        dijzNormalized[0] * dijzNormalized[0] +
        dijzNormalized[1] * dijzNormalized[1] +
        dijzNormalized[2] * dijzNormalized[2]
      );
      contribution = normalization * Math.exp(-dijzNormalized[2] / length);
    }

    hull.push(ijz);
    const finalHorizon = hull[hull.length - 2][2];

    // Record interesting events
    if (i < 20 || (i % 100 === 0) || poppedCount > 0 || (contribution && Math.abs(contribution - normalization) > 0.001)) {
      events.push({
        i,
        normX: normPos[0].toFixed(3),
        z: z.toFixed(1),
        initialHorizon: initialHorizon.toFixed(1),
        finalHorizon: finalHorizon.toFixed(1),
        horizonDelta: (finalHorizon - initialHorizon).toFixed(1),
        poppedCount,
        hullSize: hull.length,
        contribution: contribution ? contribution.toFixed(6) : null,
        inTarget: isInTarget(normPos)
      });
    }
  }

  console.log(`\nAll events (first 30):`);
  console.log(`idx  | normX | z (m) | horizonBefore | horizonAfter | Δ | popped | hullSize | contribution | inTarget`);
  console.log('-'.repeat(120));

  for (const event of events.slice(0, 30)) {
    console.log(
      `${event.i.toString().padStart(4)} | ` +
      `${event.normX} | ` +
      `${event.z.padStart(6)} | ` +
      `${event.initialHorizon.padStart(13)} | ` +
      `${event.finalHorizon.padStart(12)} | ` +
      `${event.horizonDelta.padStart(4)} | ` +
      `${event.poppedCount.toString().padStart(6)} | ` +
      `${event.hullSize.toString().padStart(8)} | ` +
      `${(event.contribution || '-').toString().padStart(12)} | ` +
      `${event.inTarget ? 'YES' : 'NO '}`
    );
  }

  console.log(`\n... (showing first 30 events)`);
  console.log(`Total events tracked: ${events.length}`);

  const targetEvents = events.filter(e => e.inTarget);
  console.log(`\nEvents INSIDE target tile (first 40):`);
  console.log(`idx  | normX | z (m) | horizonBefore | Δz | contribution`);
  console.log('-'.repeat(70));

  for (const event of targetEvents.slice(0, 40)) {
    const deltaZ = parseFloat(event.z) - parseFloat(event.initialHorizon);
    console.log(
      `${event.i.toString().padStart(4)} | ` +
      `${event.normX} | ` +
      `${event.z.padStart(6)} | ` +
      `${event.initialHorizon.padStart(13)} | ` +
      `${deltaZ.toFixed(1).padStart(6)} | ` +
      `${event.contribution}`
    );
  }

  console.log(`\nTotal target events: ${targetEvents.length}`);
}

async function main() {
  console.log('Fetching terrain tile...');
  const targetTile = { x: 795, y: 1594, z: 12 };
  const tile = await getTerrainTile(targetTile);
  const pixelSize = 40075017 / tile.tileSize / Math.pow(2, targetTile.z);

  // Set up 2 levels
  const numLevels = 2;
  const parentLevels = [];
  const levelInfo = [];

  for (let level = 0; level < numLevels; level++) {
    const deltaZ = -(level + 1);
    const parentTileCoords = getParentTilesAtLevel(targetTile, deltaZ);
    const parentTiles = await Promise.all(
      parentTileCoords.map(async (coords) => {
        const parentTile = await getTerrainTile(coords);
        return {
          data: parentTile.data,
          width: parentTile.width,
          height: parentTile.height,
          tileSize: parentTile.tileSize,
          role: coords.role
        };
      })
    );

    const assembled = assembleParentTileBufferMultiLevel({
      targetTile,
      parentTiles,
      deltaZ,
      tileSize: tile.tileSize
    });

    const targetSizeAtParent = assembled.targetSizeAtParent;
    const bufferRadius = (assembled.size - targetSizeAtParent) / 2;
    const coverageMin = [-bufferRadius / targetSizeAtParent, -bufferRadius / targetSizeAtParent];
    const coverageMax = [(targetSizeAtParent + bufferRadius) / targetSizeAtParent, (targetSizeAtParent + bufferRadius) / targetSizeAtParent];

    parentLevels.push(assembled.buffer);
    levelInfo.push({
      bufferSize: assembled.size,
      scale: assembled.scale,
      coverageMin,
      coverageMax,
      targetOffset: assembled.targetOffset
    });
  }

  const maxSweepSize = Math.floor(tile.tileSize * (1 + Math.pow(2, -numLevels)));
  const scanlineIdx = Math.floor(maxSweepSize / 2);

  await traceSingleScanline(tile.data, parentLevels, levelInfo, tile.tileSize, pixelSize, scanlineIdx);
}

main().catch(console.error);
