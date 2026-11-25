// Deciding how wide the parent ring has to be, by querying a quadtree
// of elevation bounds.
//
// Nothing here touches the sweep. The prewarm stays one ring at one
// level; this only answers which level that should be.
//
// The question is easy to state badly. "Could anything at this level
// occlude the tile?" is always yes — the terrain next door occludes
// something at every level — so a test shaped that way selects the
// coarsest ring available and the shadow edges go blocky for nothing.
// The useful question is about the *difference* a wider ring would
// make: a ring of radius R already walks everything inside R, so
// widening it is worth doing only if something outside R can reach the
// tile. That makes the test a search over the terrain beyond R, and a
// quadtree of bounds answers it without looking at the terrain itself.
//
// For a node n covering some footprint, with the target tile's floor
// and ceiling (compMin, compMax) and the shallowest casting angle
// tan(a):
//
//   - entirely within R           -> the ring already walks it, skip
//   - hMax(n) - compMin <= tan(a) * dNear(n)
//                                 -> nothing in n stands high enough to
//                                    reach even the lowest ground at the
//                                    closest the node gets. Prune the
//                                    whole subtree.
//   - hMin(n) - compMax >= tan(a) * dFar(n)
//                                 -> every point in n clears the highest
//                                    ground at the furthest the node
//                                    gets, so it certainly occludes.
//                                    R is not enough; stop.
//   - otherwise                   -> the node straddles the question and
//                                    its children may not. Descend.
//
// Both prunes are exact: they compare a bound against the worst case
// the geometry allows, so a pruned subtree cannot contain a counter-
// example. Only the straddling nodes cost anything, and they are the
// ones near the shadow line, which is a curve rather than an area —
// so the walk touches a vanishing fraction of the tree.
//
// Descent stops at `minLevel`. A node still ambiguous there is treated
// as occluding, which is the safe direction: it widens the ring rather
// than silently dropping a blocker.

/**
 * Is a ring of radius `radiusM` enough?
 *
 * `getBounds(level, nx, ny)` returns `{ hMin, hMax }` for the node at
 * that level and index, or null when there is no data there (off the
 * edge of the world, or a level the pyramid does not have). It may
 * return a promise. `null` is treated as empty ground, which is sound
 * for the hMax test and is why the hMin test also requires a node.
 *
 * Returns `{ sufficient, visited }`.
 */
export async function ringIsSufficient(opts) {
  const {
    radiusM, tanMin, compMin, compMax,
    rootLevel, minLevel = 0,
    tileM, tx, ty,
    getBounds,
  } = opts;

  // A ring of no reach cannot be sufficient unless the sun is high
  // enough that nothing at all casts, which the walk will find anyway.
  if (!(tanMin > 0)) return { sufficient: false, visited: 0, reason: "sun-down" };

  let visited = 0;

  // Node (level L, index nx, ny) covers target tiles
  // [nx << L, (nx+1 << L) - 1] on each axis. Distances are measured
  // from the target tile itself, in metres.
  const span = (L) => 1 << L;
  const near = (lo, hi, t) => (t < lo ? lo - t : (t > hi ? t - hi : 0));
  const far = (lo, hi, t) => Math.max(Math.abs(t - lo), Math.abs(t - hi));

  const stack = [];
  // Root plus its eight neighbours, so the walk covers the whole plane
  // around the tile rather than just the quadrant it happens to sit in.
  const rx = tx >> rootLevel;
  const ry = ty >> rootLevel;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      stack.push([rootLevel, rx + dx, ry + dy]);
    }
  }

  while (stack.length) {
    const [L, nx, ny] = stack.pop();
    const s = span(L);
    const loX = nx * s, hiX = loX + s - 1;
    const loY = ny * s, hiY = loY + s - 1;

    const dN = Math.hypot(near(loX, hiX, tx), near(loY, hiY, ty)) * tileM;
    const dF = Math.hypot(far(loX, hiX, tx), far(loY, hiY, ty)) * tileM;

    // Already inside the ring: the march walks this ground itself.
    if (dF <= radiusM) continue;

    const b = await getBounds(L, nx, ny);
    visited++;
    if (!b) continue; // no data: nothing there to cast

    // Nothing in this node can reach the lowest ground in the tile.
    if (b.hMax - compMin <= tanMin * dN) continue;

    // The node sits wholly above the line even at its furthest and
    // against the highest ground: it certainly casts, so the ring has
    // to be wider.
    if (b.hMin - compMax >= tanMin * dF) {
      return {
        sufficient: false, visited, reason: "casts",
        detail: { L, dNearKm: dN / 1000, dFarKm: dF / 1000, hMin: b.hMin, hMax: b.hMax },
      };
    }

    if (L <= minLevel) {
      // Out of tree. Ambiguous at the finest level we have, so assume
      // it casts: widening the ring is the recoverable mistake.
      return {
        sufficient: false, visited, reason: "minlevel",
        detail: { L, dNearKm: dN / 1000, dFarKm: dF / 1000, hMin: b.hMin, hMax: b.hMax },
      };
    }

    const cl = L - 1;
    stack.push([cl, nx * 2, ny * 2]);
    stack.push([cl, nx * 2 + 1, ny * 2]);
    stack.push([cl, nx * 2, ny * 2 + 1]);
    stack.push([cl, nx * 2 + 1, ny * 2 + 1]);
  }

  return { sufficient: true, visited, reason: "ok" };
}

/**
 * The finest dz whose ring is enough. `radiusOf(dz)` gives that ring's
 * reach in metres. Walks from fine to coarse and stops at the first
 * that passes, so the answer is the sharpest ring that still sees
 * every blocker the tree knows about.
 */
export async function pickRingDZ(opts) {
  const { minDZ, maxDZ, radiusOf, ...rest } = opts;
  let visited = 0;
  const ladder = [];
  for (let dz = minDZ; dz <= maxDZ; dz++) {
    const r = await ringIsSufficient({ ...rest, radiusM: radiusOf(dz) });
    visited += r.visited;
    ladder.push({ dz, reason: r.reason, detail: r.detail });
    if (r.sufficient) return { dz, visited, provable: true, ladder };
  }
  return { dz: maxDZ, visited, provable: false, ladder };
}
