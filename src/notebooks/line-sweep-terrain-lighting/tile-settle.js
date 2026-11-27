// What "the map has finished" means, factored out of tile-viewer.js.
//
// The mp4 export waits on this before every single frame, so the
// predicate is not just a convenience: anything it reports as
// outstanding that nothing will ever retire does not cost one frame,
// it stalls the whole recording. A 60-second timeout per frame makes
// that look like a hang.
//
// It lives in its own module for two reasons. It needs testing
// against states that are awkward to arrange in a browser and
// impossible to arrange on demand (a tile the source has withdrawn, a
// worker that died), and it has to agree with the stale-tile pruning
// in the render loop about which tiles are still coming. Those two
// used to be written out separately, and when they disagreed the only
// possible symptom was a wait that never ended.
//
// The state is passed in as plain numbers and records rather than
// read off the viewer's closure, which is what lets
// verify-tile-settle.mjs build the awkward cases directly.

/**
 * Everything the map is still waiting on, in words. Empty means
 * settled: the canvas now shows what it would show if the user
 * stopped and waited.
 *
 * @param {Object} s
 * @param {number} s.pendingFetches - elevation fetches in the data worker
 * @param {number} s.bakeQueue - tiles queued for the GPU static bake
 * @param {number} s.cpuQueue - bakes waiting for a free CPU worker
 * @param {number} s.cpuIdle - CPU workers in the idle pool
 * @param {number} s.cpuPoolSize - CPU workers that exist
 * @param {boolean} s.sunDirty - a sun re-bake is owed
 * @param {boolean} s.hqPending - the debounced high-quality re-bake is armed
 * @param {Array} s.tiles - {ready, destroyed, unavailable, shadowPending, satPending}
 * @param {Array} s.stale - tiles kept from a previous ring or zoom, {z,x,y}
 * @param {number} s.baseZoom - the zoom the live tiles are at
 * @param {Function} s.tileAt - (key) => live tile record, or undefined
 * @returns {string[]}
 */
export function settleBlockers(s) {
  const out = [];
  if (s.pendingFetches > 0) out.push(plural(s.pendingFetches, "tile fetch", "tile fetches"));
  if (s.bakeQueue > 0) out.push(`${s.bakeQueue} queued to bake`);
  const stale = (s.stale ?? []).filter((t) =>
    staleAwaiting(t, s.baseZoom, s.tileAt ?? (() => undefined)),
  ).length;
  if (stale > 0) out.push(plural(stale, "stale tile", "stale tiles"));
  if (s.sunDirty) out.push("a sun re-bake");
  if (s.hqPending) out.push("the high-quality re-bake");
  if (s.cpuQueue > 0) out.push(`${s.cpuQueue} queued CPU bakes`);
  if (s.cpuIdle < s.cpuPoolSize) {
    out.push(`${s.cpuPoolSize - s.cpuIdle} of ${s.cpuPoolSize} CPU workers`);
  }
  let notReady = 0;
  let shadow = 0;
  let imagery = 0;
  for (const tile of s.tiles ?? []) {
    if (tile.destroyed) continue;
    // A tile the source has no data for, or one we have stopped
    // retrying, is never going to arrive. Waiting on it hangs a
    // recording forever instead of settling on the frame the user
    // would see if they stopped and waited, which is this one.
    if (tile.unavailable) continue;
    if (!tile.ready) notReady++;
    if (tile.shadowPending) shadow++;
    // A tile whose image is still in flight would be captured as
    // tinted relief, so a recording waits for it the same way it
    // waits for a bake.
    if (tile.satPending) imagery++;
  }
  if (notReady > 0) out.push(plural(notReady, "tile to bake", "tiles to bake"));
  if (shadow > 0) out.push(plural(shadow, "shadow re-bake", "shadow re-bakes"));
  if (imagery > 0) out.push(plural(imagery, "tile's imagery", "tiles' imagery"));
  return out;
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * True when a stale tile is still standing in for a tile that might
 * yet arrive, which is the only reason to wait on it.
 *
 * Note what is NOT a reason. A covering tile that does not exist is
 * off screen — the live set holds exactly the visible tiles — so
 * nothing is going to arrive for it and nothing is standing in for
 * it either. And a covering tile marked unavailable is one the source
 * has no data for; the stale tile goes on drawing in its place, which
 * is the best picture there is, and it is the final one.
 */
export function staleAwaiting(stale, baseZoom, lookup) {
  for (const key of staleCoveredBy(stale, baseZoom)) {
    const t = lookup(key);
    if (!t) continue;
    if (!t.ready && !t.unavailable) return true;
  }
  return false;
}

/**
 * True when every tile a stale tile is standing in for has arrived,
 * which is when the render loop may drop it.
 *
 * `lookup(key)` returns the live tile at "z/x/y", or undefined.
 *
 * A covering tile that is not in the live set is skipped rather than
 * waited for. The live set is the visible set, so a missing covering
 * tile means that part of the stale tile is off screen, and a zoom in
 * leaves most of its stale tiles in exactly that position: the new
 * viewport shows a quarter of the ground, so the children of the old
 * edge tiles were never created and never will be. Asking for them
 * kept those stale tiles alive for the rest of the session, which
 * both leaked their textures and left the map permanently unsettled.
 *
 * An unavailable covering tile is not ready and never will be, so the
 * stale tile is kept: it is the only terrain there is for that
 * square, which is what happens past the source's maximum zoom. It
 * stops being waited on, though — see staleAwaiting.
 */
export function staleCovered(stale, baseZoom, lookup) {
  for (const key of staleCoveredBy(stale, baseZoom)) {
    const t = lookup(key);
    if (!t) continue;
    if (!t.ready) return false;
  }
  return true;
}

/** The live tiles that would replace `stale`, by key. */
export function staleCoveredBy(stale, baseZoom) {
  const d = baseZoom - stale.z;
  const keys = [];
  if (d > 0) {
    // Zoomed in: stale is larger, so every child has to be ready.
    const factor = 1 << d;
    const x0 = stale.x * factor;
    const y0 = stale.y * factor;
    for (let ty = y0; ty < y0 + factor; ty++) {
      for (let tx = x0; tx < x0 + factor; tx++) keys.push(`${baseZoom}/${tx}/${ty}`);
    }
  } else {
    // Zoomed out, or a ring swap at the same zoom: one tile covers it.
    const factor = 1 << -d;
    keys.push(
      `${baseZoom}/${Math.floor(stale.x / factor)}/${Math.floor(stale.y / factor)}`,
    );
  }
  return keys;
}

/**
 * Whether a failed elevation fetch might still succeed.
 *
 * It belongs here because it decides whether a tile can ever arrive,
 * which is exactly what the predicate above has to know: a tile
 * marked unavailable stops being waited on, and one that is still
 * retrying is still owed.
 *
 * A 4xx normally means the tile does not exist — over ocean, or off
 * the edge of the source's coverage — and marking it unavailable is
 * the right answer. 429 is not that answer. An export refetches the
 * whole view every few seconds for minutes at a time, which is how a
 * tile source comes to say "slow down", and slow down is a request to
 * retry, not a statement that there is no such tile. 408 and 425 are
 * the same kind of reply.
 */
export function fetchRetryable(status) {
  if (status === 408 || status === 425 || status === 429) return true;
  return !(status >= 400 && status < 500);
}
