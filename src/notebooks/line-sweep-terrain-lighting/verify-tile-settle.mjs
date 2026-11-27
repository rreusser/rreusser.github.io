// Gate: the map must always reach a settled state, and must say what
// it is waiting for when it does not.
//
// The mp4 export waits on `settleBlockers` being empty before every
// frame. So a clause that nothing can ever retire does not cost one
// frame — it stalls the recording, and after 60 seconds reports a
// timeout that names nothing. Every case here is a state the figure
// can actually be in, driven through the same prune-then-test loop
// the render loop runs, and asked the only question that matters:
// does it settle?
//
// Each case says what the code that shipped before did with it.
//
//   node verify-tile-settle.mjs

import { readFileSync } from "node:fs";
import {
  settleBlockers,
  staleCovered,
  staleAwaiting,
  staleCoveredBy,
  fetchRetryable,
} from "./tile-settle.js";

const results = [];
function check(name, expect, got, detail) {
  const ok = JSON.stringify(expect) === JSON.stringify(got);
  results.push({ name, ok, expect, got, detail });
}

// ---- the render loop's bookkeeping, in miniature --------------------
// `tiles` is the live set, keyed as the viewer keys it; `stale` is what
// a zoom or a ring swap left behind. settle() runs the loop: prune the
// stale tiles that have been replaced, then ask what is outstanding,
// until nothing changes.
function settle({ tiles, stale, baseZoom, ...rest }) {
  const map = new Map(tiles.map((t) => [t.key, t]));
  const lookup = (k) => map.get(k);
  let live = [...stale];
  for (let pass = 0; pass < 50; pass++) {
    const before = live.length;
    live = live.filter((s) => !staleCovered(s, baseZoom, lookup));
    const blockers = settleBlockers({
      pendingFetches: 0,
      bakeQueue: 0,
      cpuQueue: 0,
      cpuIdle: 8,
      cpuPoolSize: 8,
      sunDirty: false,
      hqPending: false,
      ...rest,
      tiles: [...map.values()],
      stale: live,
      baseZoom,
      tileAt: lookup,
    });
    if (blockers.length === 0) return { settled: true, kept: live, blockers };
    if (live.length === before) return { settled: false, kept: live, blockers };
  }
  return { settled: false, kept: live, blockers: ["loop did not converge"] };
}

const tile = (key, o = {}) => ({
  key,
  ready: true,
  destroyed: false,
  unavailable: false,
  shadowPending: false,
  satPending: false,
  ...o,
});

// ---- 1. zooming in --------------------------------------------------
// The commonest way to wedge the figure, and the reason a recording
// fails right after you frame the shot. Zooming in flips the base
// zoom: every ready tile moves to the stale set, and the new viewport
// shows a quarter of the ground, so only some stale tiles have any
// child in view at all. The others are waiting on tiles that were
// never created and never will be, because they are off screen.
//
// BEFORE: the covering test asked for every child, in view or not, so
// those stale tiles were never pruned, the stale count never reached
// zero, and nothing settled for the rest of the session.
{
  const stale = [
    { z: 10, x: 100, y: 200 },
    { z: 10, x: 101, y: 200 }, // off screen after the zoom
    { z: 10, x: 100, y: 201 }, // off screen after the zoom
  ];
  // The new viewport covers only the children of 10/100/200.
  const tiles = [
    tile("11/200/400"), tile("11/201/400"),
    tile("11/200/401"), tile("11/201/401"),
  ];
  const out = settle({ tiles, stale, baseZoom: 11 });
  check("1a a zoom-in settles", true, out.settled, out.blockers.join("; "));
  check("1b and drops every stale tile", 0, out.kept.length);
}

// ---- 2. zoomed past what the source has ----------------------------
// At the source's maximum zoom the children come back 4xx and are
// marked unavailable. The stale parent is the only terrain there is,
// so it has to keep drawing — but it is not pending work, and waiting
// on it is waiting forever.
//
// BEFORE: unavailable counts as not ready, so the parent was never
// pruned and the stale count held the wait open indefinitely. The
// per-tile clauses already skipped unavailable tiles, which is the
// disagreement this gate exists to catch.
{
  const stale = [{ z: 14, x: 100, y: 200 }];
  const tiles = [
    tile("15/200/400", { ready: false, unavailable: true }),
    tile("15/201/400", { ready: false, unavailable: true }),
    tile("15/200/401", { ready: false, unavailable: true }),
    tile("15/201/401", { ready: false, unavailable: true }),
  ];
  const out = settle({ tiles, stale, baseZoom: 15 });
  check("2a an unavailable child still settles", true, out.settled,
        out.blockers.join("; "));
  check("2b and the stale tile keeps drawing", 1, out.kept.length);
}

// ---- 3. a ring swap ------------------------------------------------
// The sun sweeping through a recorded day re-picks the prewarm ring,
// which reloads every tile at the same zoom. The replacement has the
// same key, so this one must settle the moment it is ready — and must
// NOT settle before.
{
  const stale = [{ z: 12, x: 50, y: 60 }];
  const waiting = settle({
    tiles: [tile("12/50/60", { ready: false })],
    stale,
    baseZoom: 12,
  });
  check("3a a ring swap waits for the replacement", false, waiting.settled);
  check("3b and says so", true,
        /stale tile/.test(waiting.blockers.join("; ")),
        waiting.blockers.join("; "));
  const done = settle({ tiles: [tile("12/50/60")], stale, baseZoom: 12 });
  check("3c then settles once it lands", true, done.settled);
  check("3d dropping the stale tile", 0, done.kept.length);
}

// ---- 4. the tile-level clauses -------------------------------------
// A frame captured mid-bake would show the wrong shadows, and one
// captured mid-imagery would show tinted relief instead of the photo.
{
  const base = { stale: [], baseZoom: 12 };
  check("4a a tile still baking blocks", false,
        settle({ ...base, tiles: [tile("12/1/1", { ready: false })] }).settled);
  check("4b a shadow re-bake blocks", false,
        settle({ ...base, tiles: [tile("12/1/1", { shadowPending: true })] }).settled);
  check("4c imagery in flight blocks", false,
        settle({ ...base, tiles: [tile("12/1/1", { satPending: true })] }).settled);
  check("4d an unavailable tile does not", true,
        settle({ ...base, tiles: [tile("12/1/1", { ready: false, unavailable: true })] }).settled);
  check("4e nor does a destroyed one", true,
        settle({ ...base, tiles: [tile("12/1/1", { ready: false, destroyed: true })] }).settled);
}

// ---- 5. a worker that died -----------------------------------------
// A CPU bake worker that throws never posts back, so it never returns
// to the idle pool. That is unrecoverable by itself; what this checks
// is that the report names it, instead of timing out with nothing to
// say. Same for the fetch and bake queues.
{
  const one = (rest) =>
    settleBlockers({
      pendingFetches: 0, bakeQueue: 0, cpuQueue: 0,
      cpuIdle: 8, cpuPoolSize: 8, sunDirty: false, hqPending: false,
      tiles: [], stale: [], baseZoom: 12, tileAt: () => undefined,
      ...rest,
    });
  check("5a a lost worker is named", ["1 of 8 CPU workers"], one({ cpuIdle: 7 }));
  check("5b so are pending fetches", ["3 tile fetches"], one({ pendingFetches: 3 }));
  check("5c and one fetch reads as one", ["1 tile fetch"], one({ pendingFetches: 1 }));
  check("5d and the sun re-bake", ["a sun re-bake"], one({ sunDirty: true }));
  check("5e and the bake queue", ["2 queued to bake"], one({ bakeQueue: 2 }));
  check("5f nothing outstanding is empty", [], one({}));
}

// ---- 6. the covering keys ------------------------------------------
{
  check("6a a zoom-in names four children",
        ["11/200/400", "11/201/400", "11/200/401", "11/201/401"],
        staleCoveredBy({ z: 10, x: 100, y: 200 }, 11));
  check("6b a same-zoom swap names the same tile",
        ["12/50/60"], staleCoveredBy({ z: 12, x: 50, y: 60 }, 12));
  check("6c a zoom-out names the parent",
        ["11/50/60"], staleCoveredBy({ z: 12, x: 100, y: 121 }, 11));
}

// ---- 7. pruning and waiting are separate questions -----------------
// The two predicates must disagree in exactly one direction: a stale
// tile may be kept without being waited on (case 2), but one that is
// still waited on must never be pruned.
{
  const lookup = (k) =>
    ({
      "12/1/1": tile("12/1/1", { ready: false }),
      "12/2/2": tile("12/2/2", { ready: false, unavailable: true }),
      "12/3/3": tile("12/3/3"),
    })[k];
  const s = (x) => ({ z: 12, x, y: x });
  check("7a in flight: kept and waited on", [false, true],
        [staleCovered(s(1), 12, lookup), staleAwaiting(s(1), 12, lookup)]);
  check("7b unavailable: kept, not waited on", [false, false],
        [staleCovered(s(2), 12, lookup), staleAwaiting(s(2), 12, lookup)]);
  check("7c replaced: pruned, not waited on", [true, false],
        [staleCovered(s(3), 12, lookup), staleAwaiting(s(3), 12, lookup)]);
  check("7d off screen: pruned, not waited on", [true, false],
        [staleCovered(s(9), 12, lookup), staleAwaiting(s(9), 12, lookup)]);
}

// ---- 8. which failures are final -----------------------------------
// A tile marked unavailable stops being waited on, so the decision to
// mark it is the decision to stop waiting. A recording refetches the
// whole view every few seconds for minutes, so it is the thing most
// likely to be rate limited — and a 429 treated as "no such tile"
// punched a permanent hole in the map and, before the fix above,
// hung every later frame on the stale tile under it.
{
  const m = Object.fromEntries(
    [0, 403, 404, 408, 410, 425, 429, 500, 503].map((s) => [s, fetchRetryable(s)]),
  );
  check("8a a 404 is final", false, m[404]);
  check("8b so is a 403", false, m[403]);
  check("8c and a 410", false, m[410]);
  check("8d a 429 is not", true, m[429]);
  check("8e nor is a 408 or 425", [true, true], [m[408], m[425]]);
  check("8f a 5xx is retried", [true, true], [m[500], m[503]]);
  check("8g and so is a network failure", true, m[0]);
}

// ---- 9. the bake queue has to be drained ---------------------------
// A text check, because it is about the render loop rather than a
// predicate. The GPU bake queue blocks settling, and for a while only
// the GPU branch drained it: queue a tile, switch the bake mode to
// CPU, and the queue held a destroyed tile forever while every frame
// waited on it.
{
  const src = readFileSync("./tile-viewer.js", "utf8");
  check("9a the drain is not gated on the bake mode", false,
        /bakeMode === "gpu" && bakeQueue\.length/.test(src));
  check("9b and a bake-mode switch empties it", true,
        /bakeQueue\.length = 0/.test(src));
}

// ---- report --------------------------------------------------------
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(
    `${r.ok ? "PASS" : "FAIL"}  ${r.name}` +
      (r.ok ? "" : `\n        expected ${JSON.stringify(r.expect)}, got ${JSON.stringify(r.got)}`) +
      (r.detail && !r.ok ? `\n        ${r.detail}` : ""),
  );
}
console.log(`\n${results.length - failed}/${results.length} checks pass`);
process.exit(failed ? 1 : 0);
