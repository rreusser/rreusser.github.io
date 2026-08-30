# What was measured, and what it ruled out

`REFERENCES.md` says where the numbers come from. This says what was learned
by running the model — mostly **negative results**, because those are the
expensive ones. A wrong idea that has already been measured and discarded will
otherwise be rediscovered by whoever looks next, at full price.

Each entry is a number someone can re-measure. Where a later change has moved
past a finding, it says so.

---

## The servo

**A servo faster than its own actuator rings, and no amount of stiffness or
softness fixes it.** Torque is commanded through a 50 ms first-order
activation lag. Damping (`kd`) was scaled by the inertia each joint drives;
stiffness (`kp`) was not, so loop bandwidth `sqrt(kp/I)` ran from 3 rad/s at
the wrist to 69 at the neck — 3.4 lags per oscillation. A 20° neck step, by
overshoot and sign-crossings:

| | overshoot | crossings |
|---|---|---|
| uncapped, ζ=1 | 10.63° | 19 |
| capped, ζ=1 | 2.80° | 1 |
| uncapped, ζ=2 | 3.53° | 3 |
| **capped, ζ=2** | **0.00°** | **0** |

**Neither mechanism alone is sufficient, and they are not redundant.** Capping
bandwidth limits how much phase the lag contributes; damping suppresses what
is left.

**Raising damping beats tightening the cap, which is the opposite of how it
sounds.** The cap is on `kp`, so it is also a cap on authority. At ζ=2 the
pair tracks a fast kick-up at 1.39° rms; the ringing tuning gives 2.41°, and a
cap tight enough to quiet the neck on its own gives 4.07°. Damping the
resonance costs nothing on the command path; slowing the loop costs
everything.

**The cap must be re-derived when the damping changes.** It was first set at
ωτ = 1.0 from a sweep run at ζ = 1, then ζ was raised to 2 in the same commit
without redoing the sweep. That throttled exactly the joints you kick with:

| ωτ | knee kp | knee tracking (kick-up) | knee settle |
|---|---|---|---|
| 1.0 | 142 (18%) | 8.95° rms | 0.66 s |
| **2.0** | **568 (71%)** | **2.52°** | **0.33 s** |
| uncapped | 800 | 1.79° | neck rings 3.5°, 3 crossings |

The ring reappears at ωτ = 2.75. The margin holds across 10–30° steps and on a
1.55 m / 48 kg body as well as the default. **Crossings are the wrong
criterion near the boundary** — the counter picks up sub-tenth-degree wiggle on
small steps; overshoot is monotone in the cap and is what the value was chosen
on.

---

## The kick-up: what is *not* the problem

Someone will look at a kick-up that does not arrive and start tuning. These
were each measured and are each dead ends.

**Not the servo.** The hip is torque-saturated at 100% for roughly half of a
hard swing in *every* configuration tried — uncapped, capped, ζ=1, ζ=2, no
brake margin, kp tripled. Peak hip rate lands at 317–377 °/s regardless.

**Not the trunk hinge.** The spine never saturates (peak utilisation 0.83),
bends 3°, and pinning it near-rigid changes the final CoM height by 0.001 m.
It is not absorbing the leg drive.

**Not the lunge start pose being wrong.** It is identical on the
pre-articulation body: same angles, same CoM, same 22% of body weight on the
feet, CoM 7 cm from the palm centre.

**Not tempo.** Sweeping T from 0.6 to 2.4 s does not help; below 1.9 s it
collapses outright.

**Not the legs being weaker after articulation.** The hand-authored
`kickReference` reaches CoM height **0.588 m on the seven-body model and 0.592
m on the nine-body one** — it has never kicked up, on either. A handstand needs
about 1.01 m. What changed was what the editor *opens on*, not the body.

The live constraint at the time of measurement was that the lunge start
carries only 22% of body weight on the feet, so there is little to push
against and the hips must lift the body by torque alone.

> **Superseded.** The later ankle work addresses this directly: a foot folded
> into the shank cannot push off, so the entry had to be bought entirely with
> the hip. Expect these numbers to change once there is an ankle.

---

## Presets

**A recorded preset pins the machine it was recorded on, and that hides every
later fix.** A preset carrying its own plant replays on that plant forever, so
a controller improvement is invisible in the editor until the preset is
re-recorded. This is why presets were made *derived* rather than recorded.

**`resolvePlant(null)` does not mean "today's defaults".** It returns
`LEGACY_PLANT` — no damping ratio, no bandwidth cap, and `romStopDeg: 0`,
i.e. **no end-stops at all**. That is the correct rule for reading an old
artifact and exactly wrong for a starting point. A derived preset must copy
today's defaults in explicitly.

**Derived presets do not arrive.** They are hand-authored references, and the
notebook's own thesis is that naive references fail. Closing that gap needs a
search.

> **Superseded.** The later work reintroduces recorded presets and guards them
> with `test/presets-arrive.mjs`, which replays every one on every build and
> insists it still arrives. That is a better answer than either extreme: the
> recording is allowed to be data again *because* a gate catches it going
> stale.

---

## Plumbing

**Playing a technique back and searching it are one problem, and hand-keeping
two argument lists cannot work.** There were three copies — the page's replay,
the `postMessage`, and the worker's unpacking of it. They drifted repeatedly:
a start the search solved for itself, an ending it pinned, a plant it
substituted, a phrasing it ignored. Each was patched individually and a
console warning was added to catch the next one; that warning was an admission
that the shapes could disagree. Everything is now derived from the technique
by `technique-file.js`, and `agreement.mjs` gate D asserts it.

**One concrete bug this deleted:** the worker overrode the page's tempo for the
pike scenario (`tLo: 1.5, tHi: 3.5`), which only ever worked because the
page's own values were spread afterwards.

---

## A recurring bug class worth naming

Joint and body **indices written as numbers** rather than looked up by name.
When the trunk gained a hinge, every such site silently pointed at a different
joint. Found in one sweep: end-stops sized from the wrong joint's strength
(and none at all on the last two joints), the stance hip written into the left
knee, an 8-channel pose filled through a 6-long scratch array (NaN'd head and
leg), an effort grid strided by 6 while drawing 8 rows, `adopt()` refusing
every search result, and the file reader refusing every saved file.

Several **gates had the same fault and passed anyway**, measuring a hip where
they said knee. A gate that indexes by number is not a check on code that
indexes by number.

---

## Open

- `test/landscape.mjs` fails on a derived-preset world: it sweeps around a
  technique that *arrives*, and a hand-authored reference does not. It needs an
  optimized base.
- The notebook prose in `index.html` still describes the seven-segment,
  six-joint body.
