# Sources and techniques

An inventory of where every number and method in this notebook comes from, and
how far each has actually been checked.

**Read this first.** No literature was consulted while any of this was built.
Every citation below was written from memory into a code comment and has never
been opened, checked against the paper, or confirmed to exist in the form
stated. Page and volume numbers, parameter ranges, and attributions are all
unverified. They are recorded here as *claims to check*, not as a bibliography.

What *is* verified is the internal machinery: the dynamics, the contact model,
the integrator, the search, and every registered trajectory are exercised by
gates in `test/`, and those gates run on every change. The distinction that
matters throughout is between:

- **L** — a number attributed to the literature (unverified),
- **C** — a number I chose and calibrated against the model's own behavior,
- **D** — a definition: a modelling choice about what a skill *is*, which the
  model cannot discover and does not test.

---

## 1. Attributed to literature — all unverified

| # | Source as cited in code | What it backs | Where | To check |
|---|---|---|---|---|
| L1 | de Leva (1996), "Adjustments to Zatsiorsky–Seluyanov's segment inertia parameters", *J. Biomech* 29(9) | Segment mass fractions, CoM positions, radii of gyration; male and female tables | `anthropometry.js:8`, `DE_LEVA`, `DE_LEVA_FEMALE` | Every number in both tables. Confirm the female values are from the same paper and the same normalization (CoM from the proximal end, k as a fraction of segment length). |
| L2 | Zatsiorsky & Seluyanov | The underlying gamma-ray dataset L1 adjusts | `anthropometry.js:8` | Cited only as provenance for L1; no number is taken from it directly. |
| L3 | Winter, "standard proportions" | Segment **lengths** as fractions of stature | `anthropometry.js:13`, `len:` fields | Which edition, and whether these fractions are Winter's or Drillis–Contini's (they are often conflated). The female table deliberately reuses the male lengths — a modelling choice (see D3), not a source claim. |
| L4 | Yeadon, King & Wilson (2006), *J. Biomech* 39:476–482 | The whole torque–velocity model: four-parameter tetanic function × three-parameter differential activation | `strength.js:2,34`; gates in `test/strength.mjs` | The functional forms and eq. (4); that the paper is 2006 and those page numbers. The *form* is gated (`test/strength.mjs` checks the landmarks), but the gates were written from the same memory as the model — they check self-consistency, not fidelity. |
| L5 | Yeadon–King–Wilson knee-extensor fits | Velocity/activation parameter ranges: `wmax` 13.4–26.8 rad/s, `wc` ~0.3–4× wmax, `amin` 0.66–0.72, `w1` ~0, `m` ~0.3 | `strength.js:70` | These ranges specifically. Note the model applies knee-extensor fits to the **wrist and shoulder** as well, which is an extrapolation the paper does not make. |
| L6 | Kerwin & Trewartha (2001) | The wrist's balance-moment range, from which `wrist.t0Vol = 0.85 Nm/kg` is taken "with headroom" | `strength.js:68` | The paper, the range, and how much "headroom" was added. This number sets the balance authority of the whole model. |
| L7 | Yeadon & Trewartha (2003) | The wrist strategy: that balance in a handstand is maintained mostly at the wrist | `control.js:196` | The paper. An earlier draft of the prose claimed motion capture finds gymnasts using it "more than three quarters of the time" — that figure is **not** in the code and should not be reintroduced without the source. |
| L8 | Margaria | Metabolic efficiency: concentric work costs 1/0.25, eccentric 1/1.2 per joule | `rollout.js:543`, `WORK_EFFICIENCY` | Which Margaria work, and whether 0.25 / 1.2 are his numbers or a common rounding of them. |
| L9 | Workman (1987) | Proximate time-optimal servo: cap the commanded speed at what the joint can still brake in the remaining error | `control.js:85` | The reference and that "proximate time-optimal" is the right name for the law implemented. |
| L10 | Hunt & Crossley | Penetration-proportional contact damping, replacing constant damping | `contact.js:82` | Standard and almost certainly right in substance; the year and citation are missing entirely. |
| L11 | Hansen, CMA-ES tutorial | The (μ/μ_w, λ) CMA-ES implementation | `cma-es.js:1` | Which tutorial/edition. The implementation *is* independently gated (`test/rollout.mjs` gate D: sphere to 1e-12, Rosenbrock, seed determinism), so this one is safe in behavior even if the citation is loose. |

### Attributions that are missing entirely

- **Wrist range of motion.** `wristExtMaxDeg: 135`, and the comment at
  `statics.js:32` that "70–80 is typical" for wrist extension. No source.
- **Hip, knee, shoulder ROM.** `hipFlexStraightKneeMaxDeg: 85`,
  `hipFlexAbsMaxDeg: 140`, `kneeFlexMaxDeg: 145`, `hipExtMaxDeg: 20`,
  `shoulderCloseMaxDeg: 110`, `kneeHyperextDeg: 3`. No source.
- **The hamstring coupling**, `hamstringCouplingPerDeg: 0.6` — that every
  degree of knee flexion buys 0.6° of hip flexion. This drives the entire
  bent-leg argument and has no source at all.
- **Shoulder, hip and knee strength**, described only as "typical adult
  dynamometry": `shoulder 1.6`, `hip 2.2`, `knee 2.6` Nm/kg.
- **Activation time constant** `activationTau: 0.05` s, described in the prose
  as "near fifty milliseconds".
- **Friction** `mu = 1.0`.

---

## 2. Chosen and calibrated against the model — not from literature

These are honest tuning parameters. Each is defended in a code comment by what
went wrong without it, which is the only evidence any of them has.

| # | Parameter | Value | Basis |
|---|---|---|---|
| C1 | `HANDSTAND_TARGET_FRAC` | 0.35 | Where in the palm patch the CoM is aimed. Chosen; not measured. |
| C2 | `penetrationTarget` | 2 mm | Contact stiffness is derived from it: full body weight sinks 2 mm. |
| C3 | `contactZeta` | 1.0 | Damping near critical for an effective mass of a quarter body. |
| C4 | `SATURATION_KNEE` | 0.8 | Where "working hard" becomes "living at the cap". Set after the optimizer discovered a planche because maximal effort was nearly free. |
| C5 | `SMOOTH_ACCEL_SCALE` | 60 rad/s² | Calibrated so a purposeful kick sits near 1 and flailing sits far above. |
| C6 | `SETTLE_QD_SCALE`, `DRIVE_RATE_SCALE`, `SETTLE_DRIVE_RATE_SCALE` | 0.4, 6, 4 | Arrival-quality normalizations. |
| C7 | `romStopDeg`, `romStopZeta` | 5°, 0.7 | End-stop stiffness: a joint pushed by its own max voluntary torque sinks ~5° past the limit. |
| C8 | Servo gains `kp/kd/kCom/dCom` | 800 / 60 / 2000 / 1500 | Tuned. The comment explains why impedance is deliberately low. |
| C9 | All `COST_WEIGHTS` | — | Every weight is a judgement. Several were changed *because of what the optimizer did with them*, which is documented in the comments and is the most interesting material in the file. |
| C10 | `ARRIVAL_FOOT_SPEED` | 2.0 m/s | Set from the model's own other entries: the kick-up arrives at 1.78 m/s and the press at 1.74, so both fall under it and pay nothing. |
| C11 | `TUCK_LOAD_FRAC`, `TUCK_KNEE_DEG` | 0.35, 90° | Where the bent-leg press starts. Chosen so the start is a compact squat with real load on the feet; 40° was tried and put the feet 0.75 m back, from which no hop can reach the stack. |

---

## 3. Definitions — modelling choices, not findings

The most important category to be explicit about in any write-up, because the
model does not discover these and cannot test them. They are assertions about
what a skill *is*, and every result downstream is conditional on them.

| # | Definition | Where |
|---|---|---|
| D1 | **Arrival.** A technique has arrived when the CoM is over the palm, the body is within 12° rms of the balanced configuration, the feet carry <5% of body weight, and the CoM is moving under 0.05 m/s. | `rollout.js`, `runScenario` verdict |
| D2 | **Falling.** Any contact other than hands and feet carrying >20 N ends the attempt. Added after a whole generation face-planted onto the head and scored as though it had not fallen. | `rollout.js` |
| D3 | **Sex differences** are modelled as mass distribution only; the female table deliberately keeps male segment lengths so two bodies of the same stature are comparable. | `anthropometry.js:47` |
| D4 | **Symmetric skills.** A press and a bent-leg press mirror the left leg onto the right; the kick-up does not. Without this the search produced a bent-leg press with one leg straight and the other folded 90°. | `rollout.js`, `SYMMETRIC_SCENARIOS` |
| D5 | **Foot contact is a prefix.** Once a toe rises 5 cm it has left the floor and any later load on it is charged. | `rollout.js`, `TOE_CLEAR_M` |
| D6 | **A bent-leg press passes through a fully inverted tuck** — stacked over the palm, knees still bent, feet off the floor. This is the load-bearing definition of the whole bent-leg section: without it the search always chose a tucked planche instead, which is the same shape with the hips behind the hands and costs 132 Nm rather than 23. | `rollout.js`, `TUCK_PHASE` |
| D7 | **A handstand is arrived at, not thrown into** (C10 above is its threshold). | `rollout.js`, `ARRIVAL_FOOT_SPEED` |

---

## 4. Techniques — implemented and gated

Independent of any citation, these are verified by `test/*.mjs`, which run on
every change:

- **Recursive Newton–Euler inverse dynamics**, checked against finite
  differences of the energy function; free-fall momentum conservation; a
  textbook double pendulum. — `test/dynamics.mjs`
- **Composite rigid-body mass matrix**, verified against RNEA column
  extraction. — `test/dynamics.mjs`
- **Penalty contacts** with friction anchors and Hunt–Crossley damping;
  settling behavior gated. — `test/contact.mjs`
- **Torque–velocity envelope** landmarks. — `test/strength.mjs`
- **Statics**: balanced-pose solve, CoP within the palm patch, the press
  corridor. — `test/statics.mjs`
- **CMA-ES**: sphere to 1e-12, Rosenbrock, seed determinism; the small-budget
  optimization never regresses. — `test/rollout.mjs`
- **Start poses**: the press start stands balanced over the palm and the
  bent-leg press start stands on its feet, at every hamstring length (gates J
  and K, added after a widened wrist bound silently turned the flexible pike
  start into a seated collapse). — `test/rollout.mjs`
- **The artifact registry**: every registered run replays to its recorded
  verdict under its own recorded plant, anatomy, integration and body; every
  plant setting is accounted for; the canonical runs hold their verdict from
  dt 1e-4 to 1e-3. — `test/artifacts.mjs`

---

## 5. Suggested order of work

1. **L6 (Kerwin & Trewartha) and the hamstring coupling.** The wrist rating
   sets the model's entire balance authority, and the 0.6°/° coupling is the
   mechanism the bent-leg argument rests on. Neither is checkable from inside
   the model.
2. **L4/L5 (Yeadon–King–Wilson).** The forms are gated, but applying
   knee-extensor velocity fits to the wrist and shoulder needs stating
   explicitly as an approximation whether or not a better source exists.
3. **L1/L3 (de Leva, Winter).** Highest confidence, most mechanical to verify,
   and the female table deserves a direct check against the published values.
4. **The uncited ROM numbers.** They set the walls of the press corridor,
   which is the notebook's main figure.
5. **L7 (wrist strategy).** Needed if the prose is going to claim the model's
   balance mechanism is the one people actually use.
