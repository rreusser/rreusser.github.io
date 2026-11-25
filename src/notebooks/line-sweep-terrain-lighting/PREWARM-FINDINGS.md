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

**Reach and resolution are set by different things and one ring cannot
be both. Use two, nested.**

The INNER ring meets the comp tile and is chosen for fidelity: its
cells are what a target a pixel inside the boundary reads, so a coarse
cell here steps across the seam between two tiles' bakes. The OUTER
ring is chosen for reach, walked from the outside in, handing over to
the inner ring at that ring's outer edge, so its cells never touch the
boundary and its coarseness costs nothing there. Both deposit at cell
centres, as a single ring always did.

Measured on real terrain, 15 tiles, 22 seams, sun at 0.7 degrees, all
three configurations computed from the same resident tiles so the tile
set is identical:

| configuration | seam mean step | rows >0.25 | interior control | mean shadow |
|---|---|---|---|---|
| inner only (dz 3) | 0.0665 | 1038 | 0.0563 | 0.549 |
| outer only (dz 7) | 0.0244 | 445 | 0.0197 | 0.927 |
| **two tiers (3 + 7)** | **0.0110** | **191** | **0.0106** | **0.928** |

Two tiers is best on every axis. Its seam step is 1.04x the interior
control, i.e. a seam is indistinguishable from an ordinary
adjacent-pixel step, and its mean shadow matches the coarse ring, so
none of the reach is given up. Note why inner-only is the *worst* at
the seam despite being the finest: at 0.7 degrees it cannot see the
distant blockers at all, and neighbouring tiles disagree about what
they are missing. That is a reach failure showing up as a seam.

In the synthetic two-tile figure (`verify-ring-tiers.mjs`) the same
thing is cleaner still: a coarse ring alone steps a full 1.0 across the
seam where two tiers step 0.0, while still catching a ridge 300 px out
that the inner ring cannot see.

**The levels are selectable** (`ring dz (inner)`, `ring dz (outer)`, and
`pdz` / `fdz` in the URL hash) so each can be looked at directly rather
than argued about. "auto" on the outer ring is the occluder quadtree
answering how far the prewarm must reach; "off" runs a single ring,
which is what the artifacts looked like before.

A caveat on the data, not the sweep: box-mean decimation flattens
peaks, so a coarse ring understates distant occluders. Nothing here can
undo that. A max-pooled pyramid would preserve them and is the natural
follow-up, since what an occlusion query wants to know is whether
anything in a cell can block, not what the cell averages. The quadtree
already carries `hMax` per node.

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

## 4. Two tiers: the variant that worked and the one that did not

The architecture in section 0 is the second attempt at two tiers. The
difference is where the fine tier's data comes from.

**Reverted: a same-zoom neighbour window.** The fine tier was built at
`parentScale 1` from the tile's eight same-zoom neighbours, cropped to
128 child pixels, which makes the near field *exact*. It measured
exact, too: against a reference with an exact near field, error within
8 px of an edge fell to 0.00001 with zero pixels off by more than 0.25.

It was still the wrong trade. It put **8 same-zoom neighbour fetches in
every tile's critical path**, so a newly visible tile could not start
baking until its neighbours landed, and the neighbour union adds a
one-tile border to the view (24 tiles against 8 for a 4x2 view). Panning
got visibly slower. And the exactness bought less than it looked:
measured as a seam step at dz 7 it only went 0.366 to 0.216, because
*that* measurement shared the same coarse ring as the thing under test
and so could not see far-field error (see section 6.2).

**Landed: nested parent rings.** The fine tier is an ordinary parent
ring at dz 2 or 3, which costs 4 parent fetches at `z - dz` exactly as
the single ring always did, and those parents are shared with
neighbouring tiles. No same-zoom fetches, nothing new in the critical
path, and the numbers in section 0 are better than the exact-window
variant managed on the metric that matters.

The lesson is narrow and worth keeping: the exact window was a better
*approximation* and a worse *change*.

## 5. The selector still over-asks

The outer ring's level comes from the quadtree, and it still reports
`provable: false` at a grazing sun, meaning it fell back to the cap
rather than proving a width sufficient. That is now much less costly
than it was, since a coarse outer ring no longer touches the boundary,
but it still fetches more than it needs to and it is still the wrong
answer to the right question.

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
10. **A broken WGSL pipeline says nothing useful.** WebGPU reports only
   "Invalid ComputePipeline ... is invalid due to a previous error",
   thousands of times. `buildComputeWGSL` is exported so a probe can
   build the module directly and read `getCompilationInfo()`, which
   gives the line and the message. Two real errors surfaced that way:
   `from` is a WGSL reserved keyword, and an `i32` loop counter
   initialised from what had become an `f32`.
11. **No backticks inside the WGSL template literals.** A comment
   written as `` // `from` is reserved `` closed the template and the
   shader text was then parsed as JavaScript, which reported an
   unrelated syntax error in an importing cell.
12. **The GPU bake writes shadow only in the rebake pass.** The static
   bake does normals, AO and pack, so a freshly baked tile's alpha is
   zero until a sun change triggers `rebakeShadowGPU`, and that pass
   covers only VISIBLE tiles while the CPU one walks every tile. A
   comparison that ignores either fact reads as a total mismatch.

## 7. Current state

- `src/lib/line-sweep-core.js` takes an optional outer ring
  (`farHorizon`, `farHN`, `farParentScale`, `farHorizonPN`) and walks it
  before the inner one, handing over at the inner ring's outer edge.
  With no outer ring the behaviour is byte-identical to the single-ring
  path, which is what the other twelve gates passing unchanged
  demonstrates. The deposit is unchanged: cell centres, both tiers.
- `WARMUP_STEPS` spans the outermost ring, then the elevation trim
  usually pulls the march far closer: with a 4400 m peak and a sun at
  tan 0.05 nothing beyond 88 km can reach the tile. When the trim lands
  inside the inner ring the outer tier is not walked at all. This is
  what makes a 64-tile reach affordable.
- Inner ring: `RING_NEAR_DZ_DEFAULT = 2`, selectable 1-4. Outer ring:
  quadtree-chosen up to `RING_MAX_DZ = 7`, selectable off/3-7.
  `BOUNDS_DZ = 4` is independent of both.
- The half-cell shortfall of section 2 is still there on purpose, now
  bounded by the inner ring's cell size rather than by a cap on the
  only ring.
- **The WGSL bake path now walks both rings too**, with the outer ring
  on binding 4 (a 4-byte stub when a tile has none) and its scale and
  cell offset in the uniforms. The two ring samplers are generated from
  one JS template, as is the hull push, because WGSL cannot index a
  storage binding dynamically and hand-written near-copies drift. It
  also now reads each tile's own `parentScale` rather than the module's,
  which mattered during a ring swap.
  Verified by reading the baked texture back and diffing it against the
  CPU reference on the same tiles: identical to **1/255** on all 262144
  pixels of four tiles, which is the 8-bit alpha channel's quantization
  limit. The tile texture gained `COPY_SRC` so that diff is possible at
  all; these two paths have drifted apart more than once.
- **The LSAO branch is single-tier** and unchanged.
- `tile-viewer.js` carries a temporary `_debugTiles()` accessor.
- All 14 gates pass.

## 8. Where to go next

1. Fix the selector (section 5) so a grazing sun stops falling back to
   the cap. It is cheaper than it was but still over-fetches.
2. Consider a max-pooled pyramid for the outer ring (section 0), which
   would stop decimation understating distant peaks.
3. The LSAO branch has the same boundary problem and no fix, on both
   the CPU and GPU paths.
4. Leave the deposit alone (section 2) unless a seam measurement, not a
   wall figure, says otherwise.
