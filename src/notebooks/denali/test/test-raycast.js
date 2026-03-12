// Systematic raycast pipeline tests — bottom-up from primitives to full pipeline.
//
// Run: node test/test-raycast.js

import BVH from '../mapviewer/bvh.js';
import { buildElevationQuadtree, rayIntersectQuadtree } from '../mapviewer/elevation-quadtree.js';
import { screenToRay, raycastTerrain } from '../mapviewer/ray-terrain.js';
import { invertMat4 } from '../mapviewer/math.js';
import { getElevationScale } from '../mapviewer/tile-math.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error(`  FAIL: ${msg}`);
    failed++;
  } else {
    console.log(`  pass: ${msg}`);
    passed++;
  }
}

function approx(a, b, tol = 1e-6) {
  return Math.abs(a - b) < tol;
}

function approxVec(a, b, tol = 1e-6) {
  return a.length === b.length && a.every((v, i) => approx(v, b[i], tol));
}

// ============================================================
// Level 1: Ray-AABB (tested indirectly through BVH with 1 box)
// ============================================================
console.log('\n=== Level 1: Ray-AABB via single-item BVH ===');
{
  // One AABB: unit cube [0,0,0] to [1,1,1]
  const aabbs = new Float64Array([0, 0, 0, 1, 1, 1]);
  const bvh = new BVH(aabbs, { maxItemsPerNode: 4 });

  // Ray from (0.5, 0.5, -5) toward +Z should hit
  let hits = bvh.rayIntersect(0.5, 0.5, -5, 0, 0, 1);
  assert(hits.length === 1, 'ray +Z hits unit cube');
  assert(approx(hits[0].tNear, 5, 0.01), `tNear ≈ 5 (got ${hits[0].tNear})`);

  // Ray from (0.5, 0.5, -5) toward -Z should miss
  hits = bvh.rayIntersect(0.5, 0.5, -5, 0, 0, -1);
  assert(hits.length === 0, 'ray -Z misses unit cube');

  // Ray from (5, 5, 5) toward -1,-1,-1 (normalized) should hit
  const d = 1 / Math.sqrt(3);
  hits = bvh.rayIntersect(5, 5, 5, -d, -d, -d);
  assert(hits.length === 1, 'ray from corner hits unit cube');

  // Ray completely missing (parallel above)
  hits = bvh.rayIntersect(0.5, 5, -5, 0, 0, 1);
  assert(hits.length === 0, 'ray parallel above misses');
}

// ============================================================
// Level 1b: BVH with multiple items (tests _idArray reordering)
// ============================================================
console.log('\n=== Level 1b: BVH ray with multiple items ===');
{
  // Three non-overlapping boxes spread along X axis
  // Box 0: [0,0,0]-[1,1,1], Box 1: [5,0,0]-[6,1,1], Box 2: [10,0,0]-[11,1,1]
  const aabbs = new Float64Array([
    0, 0, 0, 1, 1, 1,
    5, 0, 0, 6, 1, 1,
    10, 0, 0, 11, 1, 1,
  ]);
  const bvh = new BVH(aabbs, { maxItemsPerNode: 1 }); // force splits

  // Ray through box 0 center
  let hits = bvh.rayIntersect(0.5, 0.5, -5, 0, 0, 1);
  assert(hits.length === 1, `ray hits exactly box 0 (got ${hits.length} hits)`);
  if (hits.length >= 1) assert(hits[0].index === 0, `hit index is 0 (got ${hits[0].index})`);

  // Ray through box 1 center
  hits = bvh.rayIntersect(5.5, 0.5, -5, 0, 0, 1);
  assert(hits.length === 1, `ray hits exactly box 1 (got ${hits.length} hits)`);
  if (hits.length >= 1) assert(hits[0].index === 1, `hit index is 1 (got ${hits[0].index})`);

  // Ray through box 2 center
  hits = bvh.rayIntersect(10.5, 0.5, -5, 0, 0, 1);
  assert(hits.length === 1, `ray hits exactly box 2 (got ${hits.length} hits)`);
  if (hits.length >= 1) assert(hits[0].index === 2, `hit index is 2 (got ${hits[0].index})`);

  // Ray between boxes (misses all)
  hits = bvh.rayIntersect(3, 0.5, -5, 0, 0, 1);
  assert(hits.length === 0, 'ray between boxes misses all');

  // Ray through all three boxes along X
  hits = bvh.rayIntersect(-1, 0.5, 0.5, 1, 0, 0);
  assert(hits.length === 3, `ray along X hits all 3 (got ${hits.length})`);
  if (hits.length === 3) {
    assert(hits[0].index === 0, 'nearest is box 0');
    assert(hits[1].index === 1, 'middle is box 1');
    assert(hits[2].index === 2, 'farthest is box 2');
  }
}

// ============================================================
// Level 2: Ray-triangle (tested via quadtree with flat elevation)
// ============================================================
console.log('\n=== Level 2: rayIntersectQuadtree — flat plane ===');
{
  // Build a 514×514 elevation grid with constant elevation = 100
  const elev = new Float32Array(514 * 514).fill(100);
  const qt = buildElevationQuadtree(elev);

  // Ray from above center, pointing straight down
  // Tile-local coords: X,Z ∈ [0,512], Y = elevation
  // Origin at (256, 500, 256), direction (0, -1, 0)
  let hit = rayIntersectQuadtree(qt.minElev, qt.maxElev, elev, 256, 500, 256, 0, -1, 0);
  assert(hit !== null, 'straight-down ray hits flat plane');
  if (hit) {
    const hitY = 500 + hit.t * -1;
    assert(approx(hitY, 100, 0.1), `hit Y ≈ 100 (got ${hitY})`);
    assert(approx(hit.t, 400, 0.1), `t ≈ 400 (got ${hit.t})`);
  }

  // Ray from below, pointing up — should miss (elevation is 100, ray starts at y=50 going up)
  // Actually this WILL hit since the plane is at y=100 and the ray goes from y=50 upward
  hit = rayIntersectQuadtree(qt.minElev, qt.maxElev, elev, 256, 50, 256, 0, 1, 0);
  assert(hit !== null, 'ray from below pointing up hits flat plane');
  if (hit) {
    const hitY = 50 + hit.t * 1;
    assert(approx(hitY, 100, 0.1), `hit Y ≈ 100 from below (got ${hitY})`);
  }

  // Ray from above, pointing up — should miss
  hit = rayIntersectQuadtree(qt.minElev, qt.maxElev, elev, 256, 500, 256, 0, 1, 0);
  assert(hit === null, 'ray above pointing up misses');

  // Angled ray
  // From (0, 500, 0) toward (1, -1, 1) normalized
  const len = Math.sqrt(3);
  hit = rayIntersectQuadtree(qt.minElev, qt.maxElev, elev, 0, 500, 0, 1/len, -1/len, 1/len);
  assert(hit !== null, 'angled ray hits flat plane');
  if (hit) {
    const hitY = 500 + hit.t * (-1/len);
    assert(approx(hitY, 100, 0.5), `angled hit Y ≈ 100 (got ${hitY})`);
    const hitX = 0 + hit.t * (1/len);
    assert(approx(hitX, 400, 0.5), `angled hit X ≈ 400 (got ${hitX})`);
  }
}

// ============================================================
// Level 3: rayIntersectQuadtree — sloped surface
// ============================================================
console.log('\n=== Level 3: rayIntersectQuadtree — sloped surface ===');
{
  // Elevation that increases linearly with column: elev = col
  const elev = new Float32Array(514 * 514);
  for (let r = 0; r < 514; r++) {
    for (let c = 0; c < 514; c++) {
      elev[r * 514 + c] = c; // elevation = column index (0 to 513)
    }
  }
  const qt = buildElevationQuadtree(elev);

  // Straight-down ray at col=256 should hit at y ≈ 256
  let hit = rayIntersectQuadtree(qt.minElev, qt.maxElev, elev, 256, 1000, 256, 0, -1, 0);
  assert(hit !== null, 'straight-down on sloped surface hits');
  if (hit) {
    const hitY = 1000 - hit.t;
    // At patch col=256, the elevation corners are ~256-257
    assert(approx(hitY, 257, 1.5), `sloped hit Y ≈ 257 (got ${hitY})`);
  }
}

// ============================================================
// Level 4: screenToRay — identity-ish projection
// ============================================================
console.log('\n=== Level 4: screenToRay ===');
{
  // Build a simple projView: perspective looking down -Z
  // We'll build view and projection manually, multiply, then invert
  const fov = Math.PI / 4;
  const near = 0.1, far = 100;
  const aspect = 1;

  // View: camera at (0, 0, 5) looking at origin (along -Z)
  // view matrix = lookAt(eye=[0,0,5], center=[0,0,0], up=[0,1,0])
  const view = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, -5, 1
  ]);

  // WebGPU projection (z maps to [0,1])
  const f = 1 / Math.tan(fov / 2);
  const rangeInv = 1 / (near - far);
  const proj = new Float32Array([
    f/aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, far*rangeInv, -1,
    0, 0, near*far*rangeInv, 0
  ]);

  // projView = proj * view
  const projView = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += proj[i + k*4] * view[k + j*4];
      }
      projView[i + j*4] = sum;
    }
  }

  const invPV = new Float32Array(16);
  invertMat4(invPV, projView);

  // Center of screen (NDC 0,0) should give ray along -Z from eye
  const center = screenToRay(0, 0, invPV);
  assert(approx(center.direction[0], 0, 0.01), `center ray dX ≈ 0 (got ${center.direction[0]})`);
  assert(approx(center.direction[1], 0, 0.01), `center ray dY ≈ 0 (got ${center.direction[1]})`);
  assert(center.direction[2] < -0.9, `center ray dZ < -0.9 (got ${center.direction[2]})`);
  // Origin is at near plane (z = 5 - near = 4.9), not the eye
  assert(approx(center.origin[2], 5 - near, 0.01), `center ray origin Z ≈ ${5-near} (got ${center.origin[2]})`);

  // Right edge of screen (NDC 1, 0) should give ray with positive X component
  const right = screenToRay(1, 0, invPV);
  assert(right.direction[0] > 0.1, `right-edge ray dX > 0 (got ${right.direction[0]})`);

  // Top of screen (NDC 0, 1) should give ray with positive Y component
  const top = screenToRay(0, 1, invPV);
  assert(top.direction[1] > 0.1, `top-edge ray dY > 0 (got ${top.direction[1]})`);
}

// ============================================================
// Level 5: raycastTerrain — full pipeline with mock tile data
// ============================================================
console.log('\n=== Level 5: raycastTerrain — full pipeline ===');
{
  // Create a single tile at z=0, x=0, y=0 (covers [0,1] x [0,1] in world space)
  // Flat elevation = 100 meters
  const elevation = 100;
  const elev = new Float32Array(514 * 514).fill(elevation);
  const qt = buildElevationQuadtree(elev);

  const tileZ = 0, tileX = 0, tileY = 0;
  const elevScale = getElevationScale(tileZ, tileY);
  const vertExag = 1.0;

  // World-space Y of the terrain surface:
  const worldY = elevation * elevScale * vertExag;
  console.log(`  info: tile (0,0,0) elevScale=${elevScale.toExponential(4)}, worldY=${worldY.toExponential(4)}`);

  // BVH with one tile AABB
  const aabbs = new Float64Array([
    0, 0, 0,          // xmin, ymin, zmin
    1, worldY * 1.1, 1  // xmax, ymax, zmax (pad ymax a bit)
  ]);
  const bvh = new BVH(aabbs, { maxItemsPerNode: 4 });

  // Mock tile cache
  const mockTileCache = {
    ensureQuadtree(z, x, y) {
      if (z === tileZ && x === tileX && y === tileY) {
        return { quadtree: { minElev: qt.minElev, maxElev: qt.maxElev }, elevations: elev };
      }
      return null;
    }
  };

  const tileList = [{ z: tileZ, x: tileX, y: tileY }];

  // Ray straight down from above center of tile
  const origin = new Float64Array([0.5, worldY + 0.1, 0.5]);
  const direction = new Float64Array([0, -1, 0]);

  const hit = raycastTerrain({
    origin, direction, bvh,
    tileCache: mockTileCache,
    tileList,
    verticalExaggeration: vertExag,
  });

  assert(hit !== null, 'straight-down ray hits flat tile');
  if (hit) {
    assert(approx(hit.worldPos[0], 0.5, 0.01), `hit X ≈ 0.5 (got ${hit.worldPos[0]})`);
    assert(approx(hit.worldPos[2], 0.5, 0.01), `hit Z ≈ 0.5 (got ${hit.worldPos[2]})`);
    assert(approx(hit.worldPos[1], worldY, worldY * 0.01),
      `hit Y ≈ ${worldY.toExponential(4)} (got ${hit.worldPos[1].toExponential(4)})`);
    assert(approx(hit.t, 0.1, 0.01), `t ≈ 0.1 (got ${hit.t})`);
  }

  // Now test with the ray NOT going through the tile (miss)
  const missOrigin = new Float64Array([0.5, worldY + 0.1, 0.5]);
  const missDir = new Float64Array([0, 1, 0]); // pointing up
  const miss = raycastTerrain({
    origin: missOrigin, direction: missDir, bvh,
    tileCache: mockTileCache,
    tileList,
    verticalExaggeration: vertExag,
  });
  assert(miss === null, 'upward ray misses');
}

// ============================================================
// Level 6: raycastTerrain — realistic tile coordinates
// ============================================================
console.log('\n=== Level 6: raycastTerrain — realistic zoom-10 tile ===');
{
  // Simulate a tile at zoom 10 in the middle of the map
  const tileZ = 10, tileX = 512, tileY = 512;
  const elevation = 3000; // 3000m peak
  const elev = new Float32Array(514 * 514).fill(elevation);
  const qt = buildElevationQuadtree(elev);

  const elevScale = getElevationScale(tileZ, tileY);
  const vertExag = 1.0;
  const worldY = elevation * elevScale * vertExag;
  const s = 1 / (1 << tileZ); // tile size in world space

  console.log(`  info: tile (${tileZ},${tileX},${tileY}) s=${s.toExponential(4)}, elevScale=${elevScale.toExponential(4)}, worldY=${worldY.toExponential(4)}`);

  // Tile AABB in world space
  const xmin = tileX * s;
  const zmin = tileY * s;
  const aabbs = new Float64Array([
    xmin, 0, zmin,
    xmin + s, worldY * 1.1, zmin + s
  ]);
  const bvh = new BVH(aabbs, { maxItemsPerNode: 4 });

  const mockTileCache = {
    ensureQuadtree(z, x, y) {
      if (z === tileZ && x === tileX && y === tileY) {
        return { quadtree: { minElev: qt.minElev, maxElev: qt.maxElev }, elevations: elev };
      }
      return null;
    }
  };
  const tileList = [{ z: tileZ, x: tileX, y: tileY }];

  // Ray from above tile center, straight down
  const cx = xmin + s / 2;
  const cz = zmin + s / 2;
  const origin = new Float64Array([cx, worldY + 0.001, cz]);
  const direction = new Float64Array([0, -1, 0]);

  const hit = raycastTerrain({
    origin, direction, bvh,
    tileCache: mockTileCache,
    tileList,
    verticalExaggeration: vertExag,
  });

  assert(hit !== null, 'straight-down on zoom-10 tile hits');
  if (hit) {
    const yErr = Math.abs(hit.worldPos[1] - worldY);
    const xErr = Math.abs(hit.worldPos[0] - cx);
    const zErr = Math.abs(hit.worldPos[2] - cz);
    assert(xErr < s * 0.01, `hit X error < 1% tile size (err=${xErr.toExponential(3)})`);
    assert(zErr < s * 0.01, `hit Z error < 1% tile size (err=${zErr.toExponential(3)})`);
    assert(yErr < worldY * 0.01, `hit Y error < 1% (err=${yErr.toExponential(3)}, expected=${worldY.toExponential(4)})`);
    console.log(`  info: worldPos = [${hit.worldPos.map(v => v.toExponential(6)).join(', ')}]`);
  }

  // Angled ray from nearby — start height must be proportional to tile size
  // so the ray hits within the tile's x-range
  const startHeight = s * 0.1; // 10% of tile width above surface
  const angOrigin = new Float64Array([cx - s * 0.3, worldY + startHeight, cz]);
  const angDir = new Float64Array([1, -0.5, 0]);
  const angLen = Math.sqrt(1 + 0.25);
  angDir[0] /= angLen; angDir[1] /= angLen;

  const angHit = raycastTerrain({
    origin: angOrigin, direction: angDir, bvh,
    tileCache: mockTileCache,
    tileList,
    verticalExaggeration: vertExag,
  });

  assert(angHit !== null, 'angled ray on zoom-10 tile hits');
  if (angHit) {
    const yErr = Math.abs(angHit.worldPos[1] - worldY);
    assert(yErr < worldY * 0.05, `angled hit Y within 5% (err=${yErr.toExponential(3)})`);
    console.log(`  info: angled worldPos = [${angHit.worldPos.map(v => v.toExponential(6)).join(', ')}]`);
  }
}

// ============================================================
// Level 7: Full roundtrip — project world point to screen, then
// recover it via screenToRay + raycastTerrain
// ============================================================
console.log('\n=== Level 7: Full roundtrip (project → unproject → raycast) ===');
{
  // Use camera parameters similar to actual app
  const camState = {
    center: [0.5, 0.00005, 0.5],
    distance: 0.001,
    phi: -1.65,
    theta: 0.22,
    fov: Math.PI / 4,
    near: 0.00001,
    far: 2.0,
  };

  // Replicate camera controller's computeMatrices
  const { phi, theta, distance, center, fov, near, far } = camState;
  const eyeX = center[0] + distance * Math.cos(theta) * Math.cos(phi);
  const eyeY = center[1] + distance * Math.sin(theta);
  const eyeZ = center[2] + distance * Math.cos(theta) * Math.sin(phi);

  let fwdX = center[0] - eyeX, fwdY = center[1] - eyeY, fwdZ = center[2] - eyeZ;
  const fwdLen = Math.sqrt(fwdX*fwdX + fwdY*fwdY + fwdZ*fwdZ);
  fwdX /= fwdLen; fwdY /= fwdLen; fwdZ /= fwdLen;

  let rightX = fwdY * 0 - fwdZ * 1;
  let rightY = fwdZ * 0 - fwdX * 0;
  let rightZ = fwdX * 1 - fwdY * 0;
  const rLen = Math.sqrt(rightX*rightX + rightY*rightY + rightZ*rightZ);
  rightX /= rLen; rightY /= rLen; rightZ /= rLen;

  const upX = rightY * fwdZ - rightZ * fwdY;
  const upY = rightZ * fwdX - rightX * fwdZ;
  const upZ = rightX * fwdY - rightY * fwdX;

  const view = new Float32Array(16);
  view[0] = rightX; view[1] = upX; view[2] = -fwdX; view[3] = 0;
  view[4] = rightY; view[5] = upY; view[6] = -fwdY; view[7] = 0;
  view[8] = rightZ; view[9] = upZ; view[10] = -fwdZ; view[11] = 0;
  view[12] = -(rightX*eyeX + rightY*eyeY + rightZ*eyeZ);
  view[13] = -(upX*eyeX + upY*eyeY + upZ*eyeZ);
  view[14] = (fwdX*eyeX + fwdY*eyeY + fwdZ*eyeZ);
  view[15] = 1;

  const aspect = 16 / 9;
  const f = 1 / Math.tan(fov / 2);
  const rangeInv = 1 / (near - far);
  const proj = new Float32Array(16);
  proj[0] = f/aspect; proj[5] = f;
  proj[10] = far*rangeInv; proj[11] = -1;
  proj[14] = near*far*rangeInv;

  const projView = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += proj[i + k*4] * view[k + j*4];
      projView[i + j*4] = sum;
    }

  // Set up tile at zoom 10 near center (0.5, 0.5)
  const tileZ = 10, tileX = 512, tileY = 512;
  const elevation = 2000; // 2000m
  const elev = new Float32Array(514 * 514).fill(elevation);
  const qt = buildElevationQuadtree(elev);
  const elevScale = getElevationScale(tileZ, tileY);
  const vertExag = 1.0;
  const worldY = elevation * elevScale * vertExag;
  const s = 1 / (1 << tileZ);

  console.log(`  info: eye=[${eyeX.toExponential(4)}, ${eyeY.toExponential(4)}, ${eyeZ.toExponential(4)}]`);
  console.log(`  info: tile worldY=${worldY.toExponential(4)}, tileSize=${s.toExponential(4)}`);

  // World point on the tile surface (center of tile)
  const worldPt = [tileX * s + s/2, worldY, tileY * s + s/2];
  console.log(`  info: target worldPt=[${worldPt.map(v => v.toExponential(6)).join(', ')}]`);

  // Project worldPt to NDC
  function projectToNDC(pt) {
    const x = projView[0]*pt[0] + projView[4]*pt[1] + projView[8]*pt[2] + projView[12];
    const y = projView[1]*pt[0] + projView[5]*pt[1] + projView[9]*pt[2] + projView[13];
    const z = projView[2]*pt[0] + projView[6]*pt[1] + projView[10]*pt[2] + projView[14];
    const w = projView[3]*pt[0] + projView[7]*pt[1] + projView[11]*pt[2] + projView[15];
    return [x/w, y/w, z/w];
  }

  const ndc = projectToNDC(worldPt);
  console.log(`  info: NDC=[${ndc.map(v => v.toFixed(4)).join(', ')}]`);
  assert(ndc[2] >= 0 && ndc[2] <= 1, `point is within clip (ndcZ=${ndc[2].toFixed(4)})`);

  // Simulate clientX/clientY for a 1920×1080 viewport
  const canvasW = 1920, canvasH = 1080;
  const clientX = (ndc[0] + 1) / 2 * canvasW;
  const clientY = (1 - ndc[1]) / 2 * canvasH;
  console.log(`  info: screen=(${clientX.toFixed(1)}, ${clientY.toFixed(1)})`);

  // Now do what _hitTest does: NDC from clientX/clientY, screenToRay, raycastTerrain
  // (simulating rect = {left:0, top:0, width:canvasW, height:canvasH})
  const ndcX = (clientX / canvasW) * 2 - 1;
  const ndcY = 1 - (clientY / canvasH) * 2;
  assert(approx(ndcX, ndc[0], 0.001), `NDC roundtrip X (${ndcX.toFixed(4)} vs ${ndc[0].toFixed(4)})`);
  assert(approx(ndcY, ndc[1], 0.001), `NDC roundtrip Y (${ndcY.toFixed(4)} vs ${ndc[1].toFixed(4)})`);

  const invPV = new Float32Array(16);
  invertMat4(invPV, projView);
  const { origin, direction } = screenToRay(ndcX, ndcY, invPV);
  console.log(`  info: ray origin=[${Array.from(origin).map(v => v.toExponential(4)).join(', ')}]`);
  console.log(`  info: ray dir=[${Array.from(direction).map(v => v.toFixed(4)).join(', ')}]`);

  // Verify ray passes through the target point
  // Point on ray: origin + t*direction = worldPt → solve for t
  const bestAxis = [0,1,2].reduce((a, b) => Math.abs(direction[a]) > Math.abs(direction[b]) ? a : b);
  const tExpected = (worldPt[bestAxis] - origin[bestAxis]) / direction[bestAxis];
  const rayPt = [
    origin[0] + tExpected * direction[0],
    origin[1] + tExpected * direction[1],
    origin[2] + tExpected * direction[2],
  ];
  console.log(`  info: ray at t=${tExpected.toExponential(4)}: [${rayPt.map(v => v.toExponential(6)).join(', ')}]`);
  assert(approxVec(rayPt, worldPt, s * 0.01), 'ray passes through target world point');

  // Now raycast against the tile
  const xmin = tileX * s;
  const zmin = tileY * s;
  const aabbs = new Float64Array([xmin, 0, zmin, xmin + s, worldY * 1.1, zmin + s]);
  const bvh = new BVH(aabbs, { maxItemsPerNode: 4 });

  const mockTileCache = {
    ensureQuadtree(z, x, y) {
      if (z === tileZ && x === tileX && y === tileY)
        return { quadtree: { minElev: qt.minElev, maxElev: qt.maxElev }, elevations: elev };
      return null;
    }
  };

  const hit = raycastTerrain({
    origin, direction, bvh,
    tileCache: mockTileCache,
    tileList: [{ z: tileZ, x: tileX, y: tileY }],
    verticalExaggeration: vertExag,
  });

  assert(hit !== null, 'roundtrip raycast hits');
  if (hit) {
    const xErr = Math.abs(hit.worldPos[0] - worldPt[0]);
    const yErr = Math.abs(hit.worldPos[1] - worldPt[1]);
    const zErr = Math.abs(hit.worldPos[2] - worldPt[2]);
    console.log(`  info: hit worldPos=[${hit.worldPos.map(v => v.toExponential(6)).join(', ')}]`);
    console.log(`  info: errors: x=${xErr.toExponential(3)}, y=${yErr.toExponential(3)}, z=${zErr.toExponential(3)}`);
    assert(xErr < s * 0.01, `roundtrip X error < 1% tile (err=${xErr.toExponential(3)})`);
    assert(zErr < s * 0.01, `roundtrip Z error < 1% tile (err=${zErr.toExponential(3)})`);
    assert(yErr < worldY * 0.02, `roundtrip Y error < 2% (err=${yErr.toExponential(3)})`);
  }
}

// ============================================================
// Summary
// ============================================================
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
