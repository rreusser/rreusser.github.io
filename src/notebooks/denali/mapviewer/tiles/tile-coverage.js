// Frustum culling + LOD tile selection via quadtree traversal

// Extract 6 frustum planes from a projectionView matrix (Gribb/Hartmann)
// Each plane: [a, b, c, d] where ax + by + cz + d >= 0 is inside
function extractFrustumPlanes(projView) {
  const planes = [];
  const m = projView;

  // Left:   row3 + row0
  planes.push(normalizePlane(m[3]+m[0], m[7]+m[4], m[11]+m[8], m[15]+m[12]));
  // Right:  row3 - row0
  planes.push(normalizePlane(m[3]-m[0], m[7]-m[4], m[11]-m[8], m[15]-m[12]));
  // Bottom: row3 + row1
  planes.push(normalizePlane(m[3]+m[1], m[7]+m[5], m[11]+m[9], m[15]+m[13]));
  // Top:    row3 - row1
  planes.push(normalizePlane(m[3]-m[1], m[7]-m[5], m[11]-m[9], m[15]-m[13]));
  // Near:   row3 + row2 (WebGPU: z in [0,1], so near = row2)
  planes.push(normalizePlane(m[2], m[6], m[10], m[14]));
  // Far:    row3 - row2
  planes.push(normalizePlane(m[3]-m[2], m[7]-m[6], m[11]-m[10], m[15]-m[14]));

  return planes;
}

function normalizePlane(a, b, c, d) {
  const len = Math.sqrt(a*a + b*b + c*c);
  // With reversed-z infinite far, the far plane is degenerate (zero normal).
  // Return an always-passing plane so it never culls anything.
  if (len < 1e-10) return [0, 0, 0, 1];
  return [a/len, b/len, c/len, d/len];
}

// Replace the degenerate far plane (planes[4]) with a finite far clipping
// plane for tile selection. With reversed-z infinite projection, the GPU
// frustum has no far limit, but tile traversal should not recurse into
// tiles beyond the practical horizon. The far distance is derived from
// camera altitude and viewing distance — both extracted from the frustum
// geometry itself.
function addFarPlane(planes, eyeX, eyeY, eyeZ) {
  // planes[5] is the near clip (reversed-z swaps near/far in NDC).
  // Its normal (na, nb, nc) points into the scene = camera forward.
  const [na, nb, nc, nd] = planes[5];

  // Signed distance from eye to the near clip plane
  const nearClipDist = na * eyeX + nb * eyeY + nc * eyeZ + nd;

  // The near clip distance encodes the camera-to-target distance
  // (by convention, near ≈ targetDist * 0.001). Recover an estimate.
  const estTargetDist = Math.abs(nearClipDist) * 1000;

  // Combine altitude and target distance into a characteristic scale.
  // sqrt gives horizon-like falloff: doubling altitude increases range
  // by ~1.4x, not 2x. The multiplier is deliberately generous.
  const characteristic = Math.max(Math.abs(eyeY), estTargetDist);
  const maxFar = Math.max(5 * Math.sqrt(characteristic), 0.01);

  // Far plane: normal opposite to forward, at maxFar from the eye.
  // Inside test: -forward · p + d_far >= 0, where d_far places the
  // plane at eye + maxFar * forward.
  planes[4] = [-na, -nb, -nc, na * eyeX + nb * eyeY + nc * eyeZ + maxFar];
}

// Test AABB against frustum planes.
// Returns: -1 = fully outside, 0 = intersecting, 1 = fully inside
function testAABBFrustum(planes, minX, minY, minZ, maxX, maxY, maxZ) {
  let allInside = true;
  for (let i = 0; i < 6; i++) {
    const [a, b, c, d] = planes[i];
    // Find the p-vertex (most positive corner along plane normal)
    const px = a >= 0 ? maxX : minX;
    const py = b >= 0 ? maxY : minY;
    const pz = c >= 0 ? maxZ : minZ;
    // Find the n-vertex (most negative corner along plane normal)
    const nx = a >= 0 ? minX : maxX;
    const ny = b >= 0 ? minY : maxY;
    const nz = c >= 0 ? minZ : maxZ;

    if (a*px + b*py + c*pz + d < 0) return -1; // fully outside
    if (a*nx + b*ny + c*nz + d < 0) allInside = false; // partially inside
  }
  return allInside ? 1 : 0;
}

// Extract camera world position from a projection-view matrix.
// The eye is where clip x, y, and w are all zero — a 3x3 system
// solved via Cramer's rule. Purely derived from the matrix.
function extractEyePosition(m) {
  // A * eye = b where rows of A are the x, y, w rows of projView
  const a00 = m[0], a01 = m[4], a02 = m[8],  b0 = -m[12];
  const a10 = m[1], a11 = m[5], a12 = m[9],  b1 = -m[13];
  const a20 = m[3], a21 = m[7], a22 = m[11], b2 = -m[15];

  const det = a00*(a11*a22 - a12*a21) - a01*(a10*a22 - a12*a20) + a02*(a10*a21 - a11*a20);
  const invDet = 1 / det;

  return [
    (b0*(a11*a22 - a12*a21) - a01*(b1*a22 - a12*b2) + a02*(b1*a21 - a11*b2)) * invDet,
    (a00*(b1*a22 - a12*b2) - b0*(a10*a22 - a12*a20) + a02*(a10*b2 - b1*a20)) * invDet,
    (a00*(a11*b2 - b1*a21) - a01*(a10*b2 - b1*a20) + b0*(a10*a21 - a11*a20)) * invDet,
  ];
}

// Compute screen-space density (screen pixels per tile pixel) as the
// projected size of a texel-sized sphere. Uses Euclidean distance from the
// camera to the tile center, which is isotropic (same projected size
// regardless of viewing direction). Camera position and focal length are
// extracted from the projection-view matrix — no external parameters needed
// beyond the matrix and viewport size.
function screenDensity(m, z, x, y, screenHeight, eyeX, eyeY, eyeZ) {
  const s = 1 / (1 << z);
  const texelSize = s / 512;

  const dx = eyeX - (x + 0.5) * s;
  const dy = eyeY;
  const dz = eyeZ - (y + 0.5) * s;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 1e-10) return Infinity;

  // The focal length f = 1/tan(fov/2) is encoded in the projView matrix as
  // the norm of the second row's spatial components: M row 1 = f * V row 1,
  // and V row 1 is the camera's up vector (unit length). So f = ||M[1],M[5],M[9]||.
  // Using m[5] alone would give f*up_y, which goes to zero when looking down.
  const f = Math.sqrt(m[1] * m[1] + m[5] * m[5] + m[9] * m[9]);
  return texelSize * f * screenHeight * 0.5 / dist;
}

// Anisotropic terrain density: same as screenDensity but multiplied by a
// foreshortening factor. |eyeY|/dist is the cosine of the angle between the
// view-to-tile vector and the ground normal (0,1,0). At the horizon this
// approaches 0 (max foreshortening); looking straight down it's 1. Floored
// at 0.25 so terrain LOD never drops too aggressively.
function terrainScreenDensity(m, z, x, y, screenHeight, eyeX, eyeY, eyeZ) {
  const s = 1 / (1 << z);
  const texelSize = s / 512;

  const dx = eyeX - (x + 0.5) * s;
  const dy = eyeY;
  const dz = eyeZ - (y + 0.5) * s;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 1e-10) return Infinity;

  const foreshortening = Math.max(Math.abs(eyeY) / dist, 0.25);
  const f = Math.sqrt(m[1] * m[1] + m[5] * m[5] + m[9] * m[9]);
  return texelSize * f * screenHeight * 0.5 / dist * foreshortening;
}

// Tile AABB in world space for frustum culling. Uses per-tile elevation data
// to tighten both minY and maxY. Falls back to the conservative global maximum
// only when per-tile bounds are unavailable (tile not yet loaded).
function tileAABB(z, x, y, maxElevY, verticalExaggeration, tileManager, globalElevScale) {
  const s = 1 / (1 << z);
  let minY = 0;
  let maxY = maxElevY;
  const bounds = tileManager.getElevationBounds(z, x, y);
  if (bounds) {
    minY = bounds.minElevation * globalElevScale * verticalExaggeration;
    maxY = bounds.maxElevation * globalElevScale * verticalExaggeration;
  }
  return {
    minX: x * s,
    maxX: (x + 1) * s,
    minY,
    maxY,
    minZ: y * s,
    maxZ: (y + 1) * s,
  };
}

const MAX_ZOOM = 14;
const MIN_DATA_ZOOM = 4;
const MAX_TILES = 200;

// Check if a child tile is resolved with renderable data. Non-flat tiles are
// ready immediately. Flat tiles (404/missing) are ready only when all of their
// own children are recursively ready, so the parent keeps rendering until the
// flat tile's descendants load and can be handled by the flat-tile bypass.
// Depth-limited to avoid exponential blowup on deep chains of flat tiles.
// Flat tiles at maxZoom are NOT ready — they have no geometry, so the parent
// should render its own data instead of subdividing into empty children.
function childReady(tileManager, z, x, y, maxZoom) {
  if (!tileManager.isResolved(z, x, y)) return false;
  const entry = tileManager.getTile(z, x, y);
  if (!entry) return true; // out of bounds — resolved, nothing to load
  if (!entry.isFlat) return true;
  // Flat tile at maxZoom has no children to load — parent should render.
  if (z >= maxZoom) return false;
  // Flat tile below maxZoom: consider it ready so the parent can subdivide
  // and siblings aren't blocked. Traverse will reach this tile, fire the
  // flat-tile bypass, and request its children for progressive loading.
  return true;
}

// Select tiles for rendering. Only subdivides when all 4 children are loaded,
// so the returned list contains only loaded tiles — no fallback resolution needed.
// Missing tiles are requested from tileManager for progressive loading.
export function selectTiles(projView, canvasWidth, canvasHeight, maxElevY, verticalExaggeration, densityThreshold, sourceBounds, tileManager, ensureImagery, globalElevScale) {
  const planes = extractFrustumPlanes(projView);
  const [eyeX, eyeY, eyeZ] = extractEyePosition(projView);
  addFarPlane(planes, eyeX, eyeY, eyeZ);
  const result = [];

  const minDataZoom = (sourceBounds && sourceBounds.minZoom != null) ? sourceBounds.minZoom : MIN_DATA_ZOOM;
  const maxZoom = (sourceBounds && sourceBounds.maxZoom != null) ? sourceBounds.maxZoom : MAX_ZOOM;

  function traverse(z, x, y) {
    if (result.length >= MAX_TILES) return;

    const { minX, maxX, minY, maxY, minZ, maxZ } = tileAABB(z, x, y, maxElevY, verticalExaggeration, tileManager, globalElevScale);

    // Skip tiles completely outside source data bounds
    if (sourceBounds && (maxX < sourceBounds.minX || minX > sourceBounds.maxX ||
        maxZ < sourceBounds.minY || minZ > sourceBounds.maxY)) return;

    if (testAABBFrustum(planes, minX, minY, minZ, maxX, maxY, maxZ) === -1) return;

    // Below data zoom: always recurse (no tiles exist at these levels)
    if (z < minDataZoom) {
      const cz = z + 1;
      const cx = x * 2;
      const cy = y * 2;
      traverse(cz, cx, cy);
      traverse(cz, cx + 1, cy);
      traverse(cz, cx, cy + 1);
      traverse(cz, cx + 1, cy + 1);
      return;
    }

    // At data zoom: tile must be loaded to render or subdivide
    const loaded = tileManager.hasTile(z, x, y);

    if (!loaded) {
      // If the tile previously 404'd (in failed set but evicted from cache),
      // recurse into children to find real data underneath. The failed set
      // prevents re-fetching, so this just drives traversal deeper.
      if (tileManager.isFailed(z, x, y) && z < maxZoom) {
        const cz = z + 1, cx = x * 2, cy = y * 2;
        traverse(cz, cx, cy);
        traverse(cz, cx + 1, cy);
        traverse(cz, cx, cy + 1);
        traverse(cz, cx + 1, cy + 1);
        return;
      }
      tileManager.requestTile(z, x, y);
      return;
    }

    // Flat tiles (404 / missing data) have nothing useful to render.
    // Recurse into children to find real data at higher zoom levels.
    const entry = tileManager.getTile(z, x, y);
    if (entry && entry.isFlat && z < maxZoom) {
      const cz = z + 1, cx = x * 2, cy = y * 2;
      traverse(cz, cx, cy);
      traverse(cz, cx + 1, cy);
      traverse(cz, cx, cy + 1);
      traverse(cz, cx + 1, cy + 1);
      return;
    }

    // Subdivide based on projected size of a texel-sized sphere (isotropic
    // for stable tile coverage — anisotropy only affects mesh resolution)
    const shouldSubdivide = z < maxZoom &&
      screenDensity(projView, z, x, y, canvasHeight, eyeX, eyeY, eyeZ) > densityThreshold;

    if (shouldSubdivide) {
      const cz = z + 1;
      const cx = x * 2;
      const cy = y * 2;

      // Only subdivide if all 4 children are resolved (loaded, flat, or failed).
      // Flat children are traversed and handled by the flat-tile bypass above.
      if (childReady(tileManager, cz, cx, cy, maxZoom) &&
          childReady(tileManager, cz, cx + 1, cy, maxZoom) &&
          childReady(tileManager, cz, cx, cy + 1, maxZoom) &&
          childReady(tileManager, cz, cx + 1, cy + 1, maxZoom)) {
        // Also require imagery before subdividing — parent keeps displaying until children are ready.
        // Use & (not &&) so all children get imagery requested even if the first returns false.
        if (!ensureImagery || (
            ensureImagery(cz, cx, cy) &
            ensureImagery(cz, cx + 1, cy) &
            ensureImagery(cz, cx, cy + 1) &
            ensureImagery(cz, cx + 1, cy + 1))) {
          // Track result count before/after: if subdivision produces no
          // rendered children (e.g. all frustum-culled due to conservative
          // parent AABB), fall back to rendering the parent tile.
          const before = result.length;
          traverse(cz, cx, cy);
          traverse(cz, cx + 1, cy);
          traverse(cz, cx, cy + 1);
          traverse(cz, cx + 1, cy + 1);
          if (result.length > before) return;
          // Fall through to render parent as coverage
        }
      }

      // Request missing children for progressive loading (one level only —
      // deeper descendants are discovered by traverse on subsequent frames).
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const cxx = cx + dx, cyy = cy + dy;
          if (!tileManager.hasTile(cz, cxx, cyy)) {
            tileManager.requestTile(cz, cxx, cyy);
          }
        }
      }
    }

    // Don't render flat tiles — they have no terrain geometry and would
    // appear as invisible sea-level planes, leaving visible gaps.
    if (entry && entry.isFlat) return;

    // Render this tile (it's loaded)
    result.push({ z, x, y });
  }

  // Start from tile 0/0/0
  traverse(0, 0, 0);

  return result;
}

// Identity — selectTiles already only returns loaded tiles
export function resolveRenderList(tiles) {
  return tiles;
}

// Mesh resolution pool — must match the resolutions in mesh.ts
const MESH_RESOLUTIONS = [512, 256, 128, 64, 32, 16];

function nearestMeshResolution(ideal) {
  for (const res of MESH_RESOLUTIONS) {
    if (res <= ideal) return res;
  }
  return MESH_RESOLUTIONS[MESH_RESOLUTIONS.length - 1];
}

// Find the best available terrain tile covering an imagery tile at (iz, ix, iy).
// Walks from the imagery zoom (capped at maxTerrainZoom) down to minDataZoom,
// returning the highest-zoom loaded non-flat tile.
function findBestTerrain(iz, ix, iy, maxTerrainZoom, minDataZoom, tileManager) {
  const startZ = Math.min(iz, maxTerrainZoom);
  let bestFlat = null;
  for (let tz = startZ; tz >= minDataZoom; tz--) {
    const d = iz - tz;
    const tx = ix >> d;
    const ty = iy >> d;
    if (!tileManager.hasTile(tz, tx, ty)) continue;
    const entry = tileManager.getTile(tz, tx, ty);
    if (!entry) continue;
    if (entry.isFlat) {
      if (!bestFlat) bestFlat = { tz, tx, ty };
      continue;
    }
    return { tz, tx, ty };
  }
  return bestFlat;
}

function makeRenderTile(z, x, y, terrain) {
  const d = z - terrain.tz;
  const scale = 1 << d;
  return {
    z, x, y,
    terrainZ: terrain.tz,
    terrainX: terrain.tx,
    terrainY: terrain.ty,
    terrainUvOffsetU: d > 0 ? (x & (scale - 1)) / scale : 0,
    terrainUvOffsetV: d > 0 ? (y & (scale - 1)) / scale : 0,
    terrainUvScaleU: 1 / scale,
    terrainUvScaleV: 1 / scale,
    meshDataResolution: nearestMeshResolution(512 >> d),
  };
}

// Imagery-driven tile selection. Subdivides to imagery resolution (beyond
// terrain zoom when imagery is higher-res). Each returned RenderTile carries
// a terrain tile reference with UV offset/scale for elevation sampling.
export function selectImageryTiles(projView, canvasWidth, canvasHeight, maxElevY, verticalExaggeration, densityThreshold, sourceBounds, tileManager, maxTerrainZoom, maxImageryZoom, ensureImagery, globalElevScale, imageryDensityThreshold) {
  const planes = extractFrustumPlanes(projView);
  const [eyeX, eyeY, eyeZ] = extractEyePosition(projView);
  addFarPlane(planes, eyeX, eyeY, eyeZ);
  const result = [];

  const minDataZoom = (sourceBounds && sourceBounds.minZoom != null) ? sourceBounds.minZoom : MIN_DATA_ZOOM;
  const maxZoom = Math.max(maxTerrainZoom, maxImageryZoom);
  const imgThreshold = imageryDensityThreshold != null ? imageryDensityThreshold : densityThreshold;

  function traverse(z, x, y) {
    if (result.length >= MAX_TILES) return;

    const { minX, maxX, minY, maxY, minZ, maxZ } = tileAABB(z, x, y, maxElevY, verticalExaggeration, tileManager, globalElevScale);

    // Skip tiles completely outside source data bounds
    if (sourceBounds && (maxX < sourceBounds.minX || minX > sourceBounds.maxX ||
        maxZ < sourceBounds.minY || minZ > sourceBounds.maxY)) return;

    if (testAABBFrustum(planes, minX, minY, minZ, maxX, maxY, maxZ) === -1) return;

    // Below data zoom: always recurse (no tiles exist at these levels)
    if (z < minDataZoom) {
      const cz = z + 1, cx = x * 2, cy = y * 2;
      traverse(cz, cx, cy);
      traverse(cz, cx + 1, cy);
      traverse(cz, cx, cy + 1);
      traverse(cz, cx + 1, cy + 1);
      return;
    }

    // --- Terrain tile handling (at/below terrain zoom) ---
    // Track whether terrain at this tile is flat/missing so we avoid
    // cascading child requests for areas with no terrain data.
    let terrainIsFlat = false;
    if (z <= maxTerrainZoom) {
      const loaded = tileManager.hasTile(z, x, y);

      if (!loaded) {
        // Failed tiles (404): fall through to render imagery on flat terrain.
        // Don't recurse into children — cascading 404s flood the network.
        if (!tileManager.isFailed(z, x, y)) {
          tileManager.requestTile(z, x, y);
          return;
        }
        terrainIsFlat = true;
      } else {
        const entry = tileManager.getTile(z, x, y);
        if (entry && entry.isFlat) terrainIsFlat = true;
      }

      // Flat/failed terrain: fall through to render imagery on flat terrain
      // via findBestTerrain's flat fallback. No recursion into children.
    }

    // --- Subdivision decision (imagery threshold drives tile coverage) ---
    const tileDensity = screenDensity(projView, z, x, y, canvasHeight, eyeX, eyeY, eyeZ);
    const shouldSubdivide = z < maxZoom && tileDensity > imgThreshold;

    if (shouldSubdivide) {
      const cz = z + 1, cx = x * 2, cy = y * 2;

      let canSubdivide;
      if (z < maxTerrainZoom && !terrainIsFlat) {
        // Below terrain zoom with real terrain: require terrain children resolved
        canSubdivide = (
          childReady(tileManager, cz, cx, cy, maxTerrainZoom) &&
          childReady(tileManager, cz, cx + 1, cy, maxTerrainZoom) &&
          childReady(tileManager, cz, cx, cy + 1, maxTerrainZoom) &&
          childReady(tileManager, cz, cx + 1, cy + 1, maxTerrainZoom)
        );
        if (canSubdivide && ensureImagery) {
          // Use & (not &&) so all children get imagery requested
          canSubdivide = !!(
            ensureImagery(cz, cx, cy) &
            ensureImagery(cz, cx + 1, cy) &
            ensureImagery(cz, cx, cy + 1) &
            ensureImagery(cz, cx + 1, cy + 1)
          );
        }
      } else {
        // At/above terrain zoom, or flat terrain: only need imagery for children
        canSubdivide = !ensureImagery || !!(
          ensureImagery(cz, cx, cy) &
          ensureImagery(cz, cx + 1, cy) &
          ensureImagery(cz, cx, cy + 1) &
          ensureImagery(cz, cx + 1, cy + 1)
        );
      }

      if (canSubdivide) {
        const before = result.length;
        traverse(cz, cx, cy);
        traverse(cz, cx + 1, cy);
        traverse(cz, cx, cy + 1);
        traverse(cz, cx + 1, cy + 1);
        if (result.length > before) return;
        // Fall through to render parent as coverage
      }

      // Request missing terrain children for progressive loading.
      // Skip when terrain is flat — children are likely to also 404.
      if (z < maxTerrainZoom && !terrainIsFlat) {
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const cxx = cx + dx, cyy = cy + dy;
            if (!tileManager.hasTile(cz, cxx, cyy)) {
              tileManager.requestTile(cz, cxx, cyy);
            }
          }
        }
      }
    }

    // --- Create RenderTile ---
    // Compute per-tile effective terrain zoom from anisotropic terrain density.
    // Uses terrainScreenDensity (which accounts for foreshortening) so that
    // horizon tiles get coarser terrain while nearby tiles stay detailed.
    const tileTerrainDensity = terrainScreenDensity(projView, z, x, y, canvasHeight, eyeX, eyeY, eyeZ);
    let effectiveMaxTerrain = maxTerrainZoom;
    if (tileTerrainDensity < densityThreshold && tileTerrainDensity > 0) {
      const zoomReduction = Math.ceil(Math.log2(densityThreshold / tileTerrainDensity));
      effectiveMaxTerrain = Math.max(minDataZoom, z - zoomReduction);
    }
    effectiveMaxTerrain = Math.min(effectiveMaxTerrain, maxTerrainZoom);

    const terrain = findBestTerrain(z, x, y, effectiveMaxTerrain, minDataZoom, tileManager);
    if (!terrain) {
      // No terrain available — request at the terrain zoom and skip
      const tz = Math.min(z, effectiveMaxTerrain);
      const d = z - tz;
      tileManager.requestTile(tz, x >> d, y >> d);
      return;
    }

    result.push(makeRenderTile(z, x, y, terrain));
  }

  traverse(0, 0, 0);
  return result;
}

// Diagnostic: full info for a single tile
export function debugTile(z, x, y, projView, canvasHeight, maxElevY, verticalExaggeration, densityThreshold, tileManager, globalElevScale) {
  const planes = extractFrustumPlanes(projView);
  const [eyeX, eyeY, eyeZ] = extractEyePosition(projView);
  addFarPlane(planes, eyeX, eyeY, eyeZ);
  const bb = tileAABB(z, x, y, maxElevY, verticalExaggeration, tileManager, globalElevScale);
  const elevBounds = tileManager.getElevationBounds(z, x, y);

  const planeNames = ['left', 'right', 'bottom', 'top', 'far', 'near'];
  const frustum = [];
  let culled = false;
  for (let i = 0; i < 6; i++) {
    const [a, b, c, d] = planes[i];
    const px = a >= 0 ? bb.maxX : bb.minX;
    const py = b >= 0 ? bb.maxY : bb.minY;
    const pz = c >= 0 ? bb.maxZ : bb.minZ;
    const pDist = a * px + b * py + c * pz + d;
    frustum.push({ plane: planeNames[i], pVertex: [px, py, pz], dist: pDist, culled: pDist < 0 });
    if (pDist < 0) culled = true;
  }

  const density = screenDensity(projView, z, x, y, canvasHeight, eyeX, eyeY, eyeZ);
  const maxZoom = 14;
  const shouldSubdivide = z < maxZoom && density > densityThreshold;

  const children = [];
  if (shouldSubdivide) {
    const cz = z + 1, cx = x * 2, cy = y * 2;
    for (const [cxx, cyy] of [[cx, cy], [cx + 1, cy], [cx, cy + 1], [cx + 1, cy + 1]]) {
      const cbb = tileAABB(cz, cxx, cyy, maxElevY, verticalExaggeration, tileManager, globalElevScale);
      const cElev = tileManager.getElevationBounds(cz, cxx, cyy);
      const cFrustum = testAABBFrustum(planes, cbb.minX, cbb.minY, cbb.minZ, cbb.maxX, cbb.maxY, cbb.maxZ);
      children.push({
        tile: `${cz}/${cxx}/${cyy}`,
        bb: cbb,
        elevBounds: cElev,
        frustum: cFrustum === -1 ? 'outside' : cFrustum === 1 ? 'inside' : 'intersect',
        hasTile: tileManager.hasTile(cz, cxx, cyy),
        isResolved: tileManager.isResolved(cz, cxx, cyy),
      });
    }
  }

  return {
    tile: `${z}/${x}/${y}`,
    bb,
    elevBounds,
    globalElevScale,
    frustum,
    culled,
    density,
    shouldSubdivide,
    hasTile: tileManager.hasTile(z, x, y),
    isResolved: tileManager.isResolved(z, x, y),
    children,
  };
}

// Diagnostic: full traversal log showing every decision
export function debugSelectTiles(projView, canvasWidth, canvasHeight, maxElevY, verticalExaggeration, densityThreshold, sourceBounds, tileManager, globalElevScale) {
  const planes = extractFrustumPlanes(projView);
  const [eyeX, eyeY, eyeZ] = extractEyePosition(projView);
  addFarPlane(planes, eyeX, eyeY, eyeZ);
  const log = [];
  const rendered = [];

  const minDataZoom = (sourceBounds && sourceBounds.minZoom != null) ? sourceBounds.minZoom : MIN_DATA_ZOOM;
  const maxZoom = (sourceBounds && sourceBounds.maxZoom != null) ? sourceBounds.maxZoom : MAX_ZOOM;

  function traverse(z, x, y) {
    if (rendered.length >= MAX_TILES) return 0;

    const bb = tileAABB(z, x, y, maxElevY, verticalExaggeration, tileManager, globalElevScale);
    const { minX, maxX, minY, maxY, minZ, maxZ } = bb;

    if (sourceBounds && (maxX < sourceBounds.minX || minX > sourceBounds.maxX ||
        maxZ < sourceBounds.minY || minZ > sourceBounds.maxY)) {
      log.push({ z, x, y, action: 'bounds-cull' });
      return 0;
    }

    if (testAABBFrustum(planes, minX, minY, minZ, maxX, maxY, maxZ) === -1) {
      log.push({ z, x, y, action: 'frustum-cull', bb });
      return 0;
    }

    if (z < minDataZoom) {
      log.push({ z, x, y, action: 'recurse-below-data-zoom' });
      const cz = z + 1, cx = x * 2, cy = y * 2;
      traverse(cz, cx, cy); traverse(cz, cx + 1, cy);
      traverse(cz, cx, cy + 1); traverse(cz, cx + 1, cy + 1);
      return 0;
    }

    const loaded = tileManager.hasTile(z, x, y);
    if (!loaded) {
      log.push({ z, x, y, action: 'not-loaded' });
      return 0;
    }

    const density = screenDensity(projView, z, x, y, canvasHeight, eyeX, eyeY, eyeZ);
    const shouldSubdivide = z < maxZoom && density > densityThreshold;

    if (shouldSubdivide) {
      const cz = z + 1, cx = x * 2, cy = y * 2;
      const allReady = childReady(tileManager, cz, cx, cy, maxZoom) &&
        childReady(tileManager, cz, cx + 1, cy, maxZoom) &&
        childReady(tileManager, cz, cx, cy + 1, maxZoom) &&
        childReady(tileManager, cz, cx + 1, cy + 1, maxZoom);

      if (allReady) {
        log.push({ z, x, y, action: 'subdivide', density, bb });
        traverse(cz, cx, cy); traverse(cz, cx + 1, cy);
        traverse(cz, cx, cy + 1); traverse(cz, cx + 1, cy + 1);
        return rendered.length;
      } else {
        log.push({ z, x, y, action: 'render(children-not-resolved)', density, bb });
      }
    } else {
      log.push({ z, x, y, action: 'render', density, bb });
    }

    const entry = tileManager.getTile(z, x, y);
    if (entry && entry.isFlat) {
      log.push({ z, x, y, action: 'skip-flat' });
      return 0;
    }

    rendered.push({ z, x, y });
    return 1;
  }

  traverse(0, 0, 0);

  return {
    rendered,
    holes: log.filter(e => e.action.startsWith('HOLE')),
    log,
    eye: [eyeX, eyeY, eyeZ],
    planes: planes.map((p, i) => ({ name: ['left','right','bottom','top','far','near'][i], abcd: p })),
  };
}

// Exposed for debugging
export { extractFrustumPlanes, addFarPlane, testAABBFrustum, tileAABB, screenDensity, terrainScreenDensity, extractEyePosition };
