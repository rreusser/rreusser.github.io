# Tile-boundary artifacts in the shadow bake: what we know

Working notes on the parent-ring prewarm. Written after two attempts
were measured and reverted, so the next one starts from measurements
rather than from the hypotheses.

Context: each comp tile bakes its shadow independently, from its own
elevation plus a prewarm ring of surrounding terrain assembled from
coarser pyramid tiles. The sweep walks the ring from the outside in,
pushing blockers onto a per-scanline upper convex hull, then walks the
tile itself. Tile-boundary artifacts are discontinuities in the baked
shadow across the seam between two tiles.

## 0. The conclusion, stated first

**The ring's resolution was the problem. The deposit code was not.**

Ring width used to be fixed at dz 2 (quarter resolution). A per-sun-angle
selector was added that could reach dz 7, on the argument that a coarse
ring is only chosen when shadows are long, and a blocker tens of
kilometres away is described perfectly well by a coarse sample. That
argument is true for the distant blocker and false at the tile boundary,
where the same ring describes ground one pixel away and a cell's box
mean is nowhere near what stands there.

Measured on ten real seams, same sun (3.8 deg), same tiles, varying only
the ring cap and the sweep:

| configuration | seam mean step | rows stepping >0.25 | interior control |
|---|---|---|---|
| dz 6, with the reconstruction deposit | 0.226 | 1611 / 5120 | 0.051 |
| dz 6, with the plain centre deposit | 0.168 | 1219 / 5120 | 0.060 |
| **dz 2 cap, plain centre deposit** | **0.055** | **434 / 5120** | **0.040** |

At the dz 2 cap the seam step is 1.4x an ordinary adjacent-pixel step
inside a tile, which is the regime where it stops being visible. Two
rounds of work on the deposit moved the middle row of that table and
never approached the bottom one.

`RING_MAX_DZ` in `tile-viewer.js` is therefore back to 2. The quadtree
still picks the finest ring it can prove; it just cannot reach for
resolutions whose boundary error dominates whatever extra reach buys.

## 1. What was ruled out, with evidence

**Ring positioning and assembly.** Cross-correlating each live tile's
assembled ring against its own elevation, box-averaged by
`parentScale`, gives a best offset of (0, 0) at **0.4 m RMS**, against
100 to 185 m at every neighbouring offset. Assembly is correct, and the
pyramid is to within that residual an exact box mean of its children,
which is what licenses treating a ring cell as a box mean everywhere
below.

**Rings being misaligned between neighbours.** They are not. A ring of
scale `s` places cell `k` at tile-local child pixel `s*k - margin` with
`margin = (PN*s)/2`, so two horizontally adjacent tiles' cells coincide
when `s*(k - k') = N`, i.e. `k - k' = N/s`, an integer for every `s` in
use. Adjacent tiles tile the same global lattice and read the same
parent pixels, so they agree on the ring's *values* exactly. The seam is
not a lattice problem.

**Distant blockers (Mount Adams).** Faithfully present in the ring,
3670 m at 53.9 km against a true 3743 m summit, but it needs the sun
below 1.81 deg to shadow a 1300 m valley floor. Measured at a 2.52 deg
sun: the far ring, 6.8 to 108 km, newly shadowed **zero** rows that near
terrain did not.

**Overlapping penumbrae.** Real (the soft kernel takes a single `max`
over the hull and maps it through one smoothstep, so one penumbra does
clobber another), but not this. The artifacts appear in views with none.
Parked deliberately.

## 2. The deposit question, and why it is settled against changing it

A ring cell carries the box **mean** over `parentScale` child pixels. It
is not a point, so turning it into hull entries is a reconstruction
problem with three candidate answers:

- **Mean at the cell centre** (what ships). The terrain the cell
  describes extends half a cell closer than the centre, so a shadow
  thrown from outside the tile falls short by `parentScale/2`. One pixel
  at scale 2, 2.3 px at scale 4. Real, and pinned by
  `verify-warmup-edge.mjs`, which now budgets it explicitly rather than
  calling it a bug.
- **Mean at the cell's near edge** (tried, reverted). Fixes the
  shortfall and asserts the cell's *average* height at the cell's
  *closest* point. Where terrain rises away from the tile that average
  is far above what stands there, and the closest point is a pixel or
  two from targets just inside the boundary, so the implied horizon
  explodes. Measured implied horizon tangents of 4.5, 6.0, **17.5**, 8.5
  where truth was 1.84, 2.18, 1.97, 2.25, against a sun tangent of
  0.741. A horizon of 17.5 is 86.7 deg, so those pixels pin at full
  shadow: hard black bands.
- **Minmod-limited reconstruction between the two** (tried, reverted).
  Mean at the centre plus a slope-limited value at the near edge,
  prorated to the deposit position when clamped. Cut the black bands
  from 2 px and 8 px to 1 px and 5 px on synthetic terrain, and was
  **34% worse on real seams** (table in section 0).

So the shortfall stays, bounded by the ring cap. **Do not reintroduce
the near-edge family on the strength of `verify-warmup-edge.mjs` alone**:
a wall of uniform height is the one profile where a cell's box mean
equals its height everywhere in the cell, so that figure is structurally
incapable of seeing the error the change introduces.

One sub-finding worth keeping if the reconstruction is ever revisited:
clamping a deposit's *position* (at the tile boundary, or at a handover)
while carrying the cell's *mean* there recreates the overstatement the
reconstruction exists to remove. The slope has to prorate to the clamped
position, `frac = (cxEdge - cxP) / scale`.

## 3. The structural fact behind all of it

- **Reach** is set by the shallowest sun that still casts. At
  `tan(alt) = 0.077` a 2000 m ridge reaches 26 km.
- **Resolution** is set by the terrain immediately against the boundary,
  which wants something near the comp tile's own 3.3 m.

A ring holds roughly 500 samples per side and cannot be both. Every
attempt here has been a way of dodging that, and the cap is the current
answer: prefer resolution, accept that the far field is incomplete.
Note that the selector reports `provable: false` at the cap, which is
honest. We are knowingly using a ring that is not provably wide enough.

## 4. The two-tier attempt (reverted)

Two rings, coarse walked from outside in, handing over to a fine one at
the fine ring's outer edge.

**At dz 4 it worked.** Against a reference with an exact near field,
mean error within 8 px of an edge over four interior tiles fell from
0.0045-0.0489 to 0.0005-0.0063 with a dz-1 fine tier, and to
0.00000-0.00001 with an exact scale-1 window.

**At dz 7 it did not.** Seam step fell only from 0.366 to 0.216 (interior
control 0.043), and widening the window from 32 px to 128 px gained
almost nothing, which locates the error outside the window.

**Why.** For a target at tile A's edge, blockers beyond the window come
from A's coarse ring; for a target one pixel across the seam in B, the
same blockers are B's *own* comp data. A sees coarse where B sees exact,
over the span from the window edge to one full tile. So an exact window
has to be **one full tile wide** to match a neighbour's self-knowledge.
That is `1536^2` floats, 9.4 MB per tile.

**What it cost.** Sweep time was not the issue (93 ms against 97 ms). It
put **8 same-zoom neighbour fetches in every tile's critical path**, so a
newly visible tile could not start baking until its neighbours landed,
and the neighbour union adds a one-tile border to the view (24 tiles
against 8 for a 4x2 view). That is what made panning slow.

## 5. If the cap is ever to be raised

The cap is a blunt instrument: it gives up far-field completeness to buy
near-field fidelity, and `provable: false` says so. Raising it safely
needs the selector to stop asking for coarse rings it does not need.

The ladder for the bad view, sun 3.85 deg, `tanMin = 0.047`:

```
dz 1..5  minlevel  node at L2, 26.8 km near / 33.9 km far, hMin 1071 hMax 1803
dz 6     minlevel  node at L2, 71.2 km near / 77.7 km far, hMin 1452 hMax 4391
dz 7     ok
```

One node 27 km out blocks dz 1 through 5. It does not provably cast; it
*straddles* the test, and descent stops at `minLevel 2` where a node is
4x4 tiles, so the code assumes it casts. The criterion asks "could
anything outside R occlude the tile's lowest ground?", which goes
unbounded as the sun grazes.

The question it should ask is whether anything outside R could occlude
ground that terrain *inside* R has not already shadowed. Both sides are
computable from bounds the quadtree already holds:

- most an outside node can add:
  `max over outside nodes of (hMax(n) - compMin) / dNear(n)`
- horizon already guaranteed from inside:
  `max over inside nodes of (hMin(n) - compMax) / dFar(n)`

If the second exceeds the first, the outside node cannot matter. No new
fetches, no change to the sweep. **But note this only lets the ring stay
fine when it is provably safe; it does not make a coarse ring usable.**
If the selector still wants dz 5+ at some sun angle, the boundary error
returns and the cap is what saves us.

## 6. Measurement lessons, which cost more than the code

1. **For a seam, measure the seam.** The step across a shared boundary,
   against an interior control of adjacent pixels within a tile, needs
   no ground truth and is the actual complaint. Both earlier rounds used
   reference-based metrics that were harder to build and answered a
   narrower question. This metric is what finally separated the ring cap
   from the deposit code.
2. **A reference that shares a component is blind to that component.**
   The "exact, zero error" result in round two shared the same coarse
   ring as the thing under test, so it could not see far-field error. It
   was a true statement about the near field and was read as a stronger
   one. Always name the shared component when quoting such a number.
3. **Check that a comparison harness is testing the code you think.**
   A run that was reported as "HEAD passes this gate" had rewritten the
   import `"../../lib/line-sweep-core.js"`, while that gate actually
   imports through the `./lib/` symlink. The rewrite silently did
   nothing and the gate ran against the current code. Grep the import
   you are overriding, and sanity-check that the result *differs* from
   the unmodified run.
4. **Watch for confounds when synthesizing inputs.** A test of "would a
   finer ring help" built scale-2 and scale-4 rings from resident tiles,
   but a ring's reach is tied to its scale by the margin convention, so
   those rings saw 1 and 2 tiles against the live ring's 32. It compared
   fine-but-short-sighted against coarse-but-far-sighted and was
   worthless. The clean version varies only the cap and lets the worker
   assemble real rings.
5. **WebGPU canvas readback via `drawImage` returns all zeros.** Do not
   measure artifacts from screen pixels; re-run `computeShadow` in the
   runtime off `tile._heights` / `_horizon`.
6. **At `parentScale 1` a 3x3 stitch of comp tiles IS a valid ring**,
   because cell centres land on child pixel centres. Cheap exact
   reference from resident tiles.
7. **Gate budgets calibrated to your own output hide regressions.**
   `verify-warmup-slope.mjs` had budgets of 1 px and 5 px because that
   was what the reconstruction scored. The centre deposit scores 0. The
   budgets are now 0, so the near-edge family cannot return unnoticed.
8. **Confirm a gate fails on the broken code before trusting it.** Two
   checks in the (now deleted) two-tier gate proved nothing: one gave
   the two rings different terrains, so the coarse ring was legitimately
   reporting a blocker the reference ignored; another put the sun below
   the true horizon, so every row was genuinely shadowed and the band
   measured zero trivially.
9. **`debugRingState().bake`** exposes per-tile sun angles, so a probe
   can reproduce a tile's own sweep instead of guessing from the hash.

## 7. Current state

- `src/lib/line-sweep-core.js` is the committed sweep plus two exported
  helpers, `shadowTanMin` and `shadowReachM`, which `tile-viewer.js`,
  `webgpu-pipelines.js` and `verify-occluder-quadtree.mjs` import. The
  sweep body itself is unmodified. `line-sweep-bake.js` and
  `cpu-bake-worker.js` are byte-identical to the committed versions.
- `RING_MAX_DZ = 2`; `BOUNDS_DZ = 4` is now independent of it.
- The quadtree selector (`occluder-quadtree.js`, never committed) still
  runs and is still worth keeping: within dz 1-2 it picks the finer ring
  when it can prove it.
- **The WGSL bake path never received any of the deposit work**, which
  no longer matters since the deposit work is reverted, but it does
  still read module-level `parentScale` rather than per-tile, so a GPU
  bake can mismatch during a ring swap.
- `tile-viewer.js` carries a temporary `_debugTiles()` accessor.
- All 13 gates pass.

## 8. Suggested order for the next attempt

1. Re-measure the seam metric (section 6.1) as the first step, before
   changing anything, so there is a baseline at the current cap. It is
   0.055 against an interior 0.040 at a 3.8 deg sun as of these notes.
2. If boundary quality is wanted beyond that, the lever is the selector
   (section 5), not the deposit (section 2) and not a second ring
   (section 4).
3. Leave the deposit alone unless a seam measurement, not a wall figure,
   says otherwise.
