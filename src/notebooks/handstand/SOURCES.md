# Sources and techniques

An inventory of where every number and method in this notebook comes from, and
how far each has actually been checked.

## How much to trust this page

The citations were originally written from memory into code comments. They have
now been checked — but only through web **search**, because this machine's
egress proxy blocks every scholarly domain (`sciencedirect`, `pubmed`,
`pmc.ncbi`, `semanticscholar`, `arxiv`, `doi.org`, university PDF hosts). No
paper was opened. Nothing below rests on reading a source.

So each entry carries an evidence level:

- **✅ Confirmed** — a search returned bibliographic detail I did *not* put in
  the query (page numbers, sample sizes, study design). Hard to get by
  accident.
- **⚠️ Partly confirmed** — the work exists and is about the right thing, but
  the specific number the code takes from it was not returned.
- **❌ Contradicted** — a search returned a value that disagrees with the code.
- **❓ Unverified** — nothing usable came back, or the search only echoed my
  own query. *An echo is not a confirmation.*

Three categories run through everything: **L** a number attributed to
literature, **C** a number chosen and calibrated against the model's own
behavior, **D** a definition of what a skill *is*, which the model cannot
discover or test.

---

## 1. Citations — checked

| # | Citation | Status | What changed |
|---|---|---|---|
| L1 | de Leva, P. (1996). Adjustments to Zatsiorsky–Seluyanov's segment inertia parameters. *J. Biomech.* **29**(9), 1223–1230. doi:10.1016/0021-9290(95)00178-6 | ✅ | Volume, pages and DOI confirmed. The code cited only "29(9)" — full citation now known. |
| L4 | Yeadon, M.R., King, M.A. & Wilson, C. (2006). Modelling the maximum voluntary joint torque/angular velocity relationship in human movement. *J. Biomech.* **39**(3), 476–482. | ✅ | Exactly as cited, including pages. **But**: the study is maximal eccentric–concentric **knee extension on two subjects**, crank velocities 50–450°/s. See the caveat below. |
| L6 | Kerwin, D.G. & Trewartha, G. (2001). Strategies for maintaining a handstand in the anterior-posterior direction. *Med. Sci. Sports Exerc.* **33**(7), 1182–1188. | ✅ | Journal identified (the code named none). Inverse dynamics on 6 handstand balances, wrist/shoulder/hip torques. |
| L7 | Yeadon, M.R. & Trewartha, G. (2003). Control strategy for a hand balance. *Motor Control* **7**(4), 411–430. | ✅ | Journal, volume, pages identified. Four male gymnasts. |
| L10 | Hunt, K.H. & Crossley, F.R.E. (1975). Coefficient of restitution interpreted as damping in vibroimpact. *J. Appl. Mech.* **42**(2), 440–445. | ✅ | Full citation recovered; the code had author names only. |
| L9 | Workman, M.L. (1987). *Adaptive Proximate Time-Optimal Servomechanisms.* PhD dissertation, Stanford University (with R.L. Kosut and G.F. Franklin). | ✅ | It is a **dissertation**, not a paper. |
| L8 | Margaria, R. (1968). Positive and negative work performances and their efficiencies in human locomotion. *Int. Z. Angew. Physiol.* | ⚠️ | The work exists and is on the right subject. The efficiency values the code uses (`concentric 0.25`, `eccentric 1.2`) were **not** returned by any search. Also relevant: Margaria, *Biomechanics and Energetics of Muscular Exercise*, Clarendon Press, 1976. |
| L3 | Winter — segment lengths as fractions of stature | ⚠️ | The convention is real, but it is usually **Drillis & Contini (1966)**, reproduced *in* Winter. None of the specific fractions in `DE_LEVA.len` were returned. Attribution should probably read "Drillis & Contini (1966), as tabulated in Winter". |
| L11 | Hansen — CMA-ES tutorial | ❓ | Not chased. The implementation is independently gated (sphere to 1e-12, Rosenbrock, seed determinism), so behavior does not depend on the citation. |
| L2 | Zatsiorsky & Seluyanov | — | Provenance for L1 only; no number is taken from it. |

### Discrepancies found in the de Leva tables — ❌ needs resolving

A search returned male values that disagree with two numbers in
`anthropometry.js`:

| Segment | Quantity | Code | Search returned |
|---|---|---|---|
| trunk | CoM from proximal end | **0.4486** | **0.5138** |
| shank | CoM from proximal end | **0.4459** | **0.4395** |
| trunk | mass fraction | 0.4346 | 0.4346 ✅ |
| thigh | mass fraction | 0.1416 | 0.1416 ✅ |
| shank | mass fraction | 0.0433 | 0.0433 ✅ |
| thigh | CoM | 0.4095 | 0.4095 ✅ |

The mass fractions match exactly, which is reassuring about the table's
provenance and makes the two CoM disagreements more pointed rather than less.
The likely explanation for the trunk is that de Leva reports the trunk both
whole and split into upper/mid/lower with different endpoint definitions, so
the two numbers may be answers to different questions — but that has to be
checked against the paper, not guessed. **The trunk is 43% of body mass and
the longest segment in the model; a 6.5-point shift in its CoM moves the
whole-body CoM and every balance result on the page.**

The **female** table (`DE_LEVA_FEMALE`) could not be verified at all. The
search appeared to confirm it but was visibly paraphrasing my own query back
at me, which is worth nothing.

### Caveats that survive even where the citation is confirmed

- **L4/L5 — extrapolation.** Yeadon–King–Wilson fit **knee extensors on two
  subjects**. `strength.js` applies the same velocity and activation
  parameters to the wrist, shoulder, hip and knee alike. That is an
  extrapolation the paper does not license and should be stated as an
  assumption wherever the strength model is described.
- **L6/L7 — the wrist strategy is not the whole story.** Kerwin & Trewartha
  report that *all* calculated joint torques contributed to CoM movement, with
  wrist torque dominant *in a number of trials*. Yeadon & Trewartha's
  hypothesis is a wrist strategy **with synergistic shoulder and hip torques
  preserving a fixed body configuration**. The model's balance controller acts
  at the wrist only. This is the same objection raised during development —
  "you're actuating more than only your hands" — and the literature is on that
  side.
- **L7 — no feedback delay.** Yeadon & Trewartha estimate a feedback time
  delay of **160–240 ms**, consistent with long-latency reflexes. The model's
  balance controller is instantaneous: `kCom`/`dCom` act on the current CoM
  position and velocity with no delay at all. That omission makes balancing
  easier than it is.
- An earlier draft of the prose claimed motion capture finds gymnasts using
  the wrist strategy "more than three quarters of the time". **No source was
  found for that figure.** It is not in the code and should not return.

---

## 2. Range of motion — checked against clinical norms

The ROM defaults carried no attribution at all. Searching AAOS normative
values gives, for comparison:

| Quantity | `ROM_DEFAULTS` | Clinical norm (AAOS / goniometry) | Verdict |
|---|---|---|---|
| Wrist extension, max | **135°** | ~70°, sources give 70–90° | ❌ **far outside any norm** |
| Knee flexion, max | 145° | ~135°, some sources 140° | ⚠️ generous |
| Hip flexion, knee flexed | 140° | 120° | ⚠️ generous |
| Hip flexion, knee straight | 85° | SLR 68–80°; popliteal angle 80–90° | ✅ top of range, defensible |
| Hamstring coupling | **0.6 °/°** | implied ~**0.44 °/°** (120° − 80° over ~90° of knee flexion) | ❌ ~35% high |

Two of these matter a great deal:

**The wrist.** The model's *balanced handstand* already sits at **92.6° of
wrist extension** — past the AAOS normal of ~70° before anything moves. The
slider then runs to 135°, which has no anatomical basis I can find. Loading
and a fixed hand do permit more extension than an open-chain goniometer
measurement, so the norm is not directly comparable, but a factor of nearly
two needs justifying rather than asserting. The wrist is also the joint that
binds first in the press corridor, so this number sets the shape of the
notebook's main figure. Note `statics.js` already contains a comment saying
"88 degrees is already past the normal range (70–80 is typical)" — that
comment and the 135° default contradict each other.

**The hamstring coupling.** `hamstringCouplingPerDeg: 0.6` is the mechanism
the entire bent-leg argument rests on. Deriving it from the AAOS numbers
instead gives ≈0.44. At 90° of knee flexion the model allows a 139° hip fold;
at 0.44 it would allow 125°. The bent-leg press start would be visibly less
folded and the inverted tuck less compact, which would change the headline
result. This is the single number I would check first.

---

## 3. Still carrying no attribution

- Shoulder, hip and knee strength — `1.6 / 2.2 / 2.6` Nm/kg, described only as
  "typical adult dynamometry". ❓
- `wrist.t0Vol = 0.85` Nm/kg — attributed to L6 "with headroom", but the
  balance-moment range and the size of the headroom were not confirmed. ⚠️
- `activationTau = 0.05` s. ❓
- `mu = 1.0` friction. ❓
- `shoulderCloseMaxDeg 110`, `hipExtMaxDeg 20`, `kneeHyperextDeg 3`. ❓

---

## 4. Chosen and calibrated — not from literature (C)

Honest tuning parameters. Each is defended in a code comment by what went
wrong without it, which is the only evidence any of them has.

| # | Parameter | Value | Basis |
|---|---|---|---|
| C1 | `HANDSTAND_TARGET_FRAC` | 0.35 | Where in the palm patch the CoM is aimed. |
| C2 | `penetrationTarget` | 2 mm | Contact stiffness derives from it. |
| C3 | `contactZeta` | 1.0 | Near critical for an effective mass of a quarter body. |
| C4 | `SATURATION_KNEE` | 0.8 | Set after the optimizer found a planche because maximal effort was nearly free. |
| C5 | `SMOOTH_ACCEL_SCALE` | 60 rad/s² | A purposeful kick sits near 1; flailing far above. |
| C6 | `SETTLE_QD_SCALE`, `DRIVE_RATE_SCALE`, `SETTLE_DRIVE_RATE_SCALE` | 0.4, 6, 4 | Arrival-quality normalizations. |
| C7 | `romStopDeg`, `romStopZeta` | 5°, 0.7 | A joint pushed by its own max voluntary torque sinks ~5° past its limit. |
| C8 | Servo gains | 800 / 60 / 2000 / 1500 | Tuned; impedance deliberately low. |
| C9 | All `COST_WEIGHTS` | — | Every weight is a judgement, several changed because of what the optimizer did with them. |
| C10 | `ARRIVAL_FOOT_SPEED` | 2.0 m/s | From the model's own entries: the kick-up arrives at 1.78 m/s, the press at 1.74. |
| C11 | `TUCK_LOAD_FRAC`, `TUCK_KNEE_DEG` | 0.35, 90° | 40° of knee put the feet 0.75 m back, from which no hop reaches the stack. |

---

## 5. Definitions — modelling choices, not findings (D)

The model cannot discover or test these. Every result downstream is
conditional on them.

| # | Definition | Where |
|---|---|---|
| D1 | **Arrival**: CoM over the palm, body within 12° rms of the balanced configuration, feet under 5% of body weight, CoM under 0.05 m/s. | `runScenario` verdict |
| D2 | **Falling**: any contact but hands and feet carrying >20 N ends the attempt. Added after a generation face-planted onto the head and scored as though it had not fallen. | `rollout.js` |
| D3 | **Sex** is modelled as mass distribution only; the female table keeps male segment lengths so two bodies of a stature are comparable. | `anthropometry.js` |
| D4 | **Symmetric skills**: press and bent-leg press mirror left leg onto right; the kick-up does not. | `SYMMETRIC_SCENARIOS` |
| D5 | **Foot contact is a prefix**: once a toe rises 5 cm it has left the floor, and later load on it is charged. | `TOE_CLEAR_M` |
| D6 | **A bent-leg press passes through a fully inverted tuck** — stacked over the palm, knees bent, feet off the floor. Load-bearing for the whole bent-leg section: without it the search always chose a tucked planche, the same shape with the hips behind the hands, at 132 Nm instead of 23. | `TUCK_PHASE` |
| D7 | **A handstand is arrived at, not thrown into.** | `ARRIVAL_FOOT_SPEED` |

---

## 6. Techniques — implemented and gated

Independent of any citation, verified by `test/*.mjs` on every change:

- **RNEA inverse dynamics** against finite differences of the energy function;
  free-fall momentum conservation; a textbook double pendulum. — `test/dynamics.mjs`
- **CRBA mass matrix** against RNEA column extraction. — `test/dynamics.mjs`
- **Penalty contacts** with friction anchors and Hunt–Crossley damping. — `test/contact.mjs`
- **Torque–velocity envelope** landmarks — but note these gates were written
  from the same memory as the model, so they check self-consistency, not
  fidelity to L4. — `test/strength.mjs`
- **Statics**: balanced-pose solve, CoP within the palm patch, press corridor. — `test/statics.mjs`
- **CMA-ES**: sphere to 1e-12, Rosenbrock, seed determinism; small-budget
  optimization never regresses. — `test/rollout.mjs`
- **Start poses**: the press start stands balanced over the palm, the
  bent-leg press start stands on its feet, at every hamstring length. — `test/rollout.mjs`
- **Artifact registry**: every run replays to its recorded verdict under its
  own recorded plant, anatomy, integration and body; every plant setting is
  accounted for; canonical runs hold their verdict from dt 1e-4 to 1e-3. — `test/artifacts.mjs`

---

## 7. What to do next, in order

1. **Open de Leva (1996)** and settle the trunk and shank CoM values, and the
   whole female table. Everything on the page moves with the trunk.
2. **Justify or lower the wrist extension limit.** 135° against a ~70° norm,
   with the balanced handstand itself at 92.6°, is the largest single gap
   between this model and a clinical reference.
3. **Check the hamstring coupling.** 0.6 °/° versus ≈0.44 implied by the AAOS
   figures, on the number the bent-leg argument rests on.
4. **State the Yeadon–King–Wilson extrapolation** explicitly wherever the
   strength model is described: knee-extensor fits from two subjects, applied
   to every joint.
5. **Decide what to do about the missing feedback delay.** 160–240 ms is
   measured; the model uses none.
6. **Find the Margaria efficiency numbers** or replace them with values from a
   source that can be cited.
7. **Attribute the length fractions** properly — most likely Drillis & Contini
   (1966) as tabulated in Winter.

### Sources consulted for this page

- [de Leva 1996, citation and DOI](https://www.scirp.org/reference/referencespapers?referenceid=2041515)
- [Yeadon, King & Wilson 2006](https://pubmed.ncbi.nlm.nih.gov/16389087/) · [Loughborough repository record](https://repository.lboro.ac.uk/articles/journal_contribution/Modelling_the_maximum_voluntary_joint_torque_angular_velocity_relationship_in_human_movement/9617573)
- [Kerwin & Trewartha 2001, MSSE](https://journals.lww.com/acsm-msse/fulltext/2001/07000/strategies_for_maintaining_a_handstand_in_the.16.aspx)
- [Yeadon & Trewartha 2003, Motor Control](https://pubmed.ncbi.nlm.nih.gov/14999137/) · [Loughborough repository record](https://repository.lboro.ac.uk/articles/journal_contribution/Control_strategy_for_a_hand_balance/9630269)
- [Hunt & Crossley 1975, ASME J. Appl. Mech.](https://asmedigitalcollection.asme.org/appliedmechanics/article/42/2/440/387758/Coefficient-of-Restitution-Interpreted-as-Damping)
- [Margaria, efficiency of muscular exercise](https://www.germanjournalsportsmedicine.com/archive/archive-2017/heft-9/the-efficiency-of-muscular-exercise/)
- [Drillis & Contini proportions as tabulated in Winter](https://www1.udel.edu/biology/rosewc/kaap686/notes/anthropometry.html)
- [AAOS normal range-of-motion values](https://goniometer.io/range-of-motion) · [wrist ROM](https://goniometer.io/wrist-range-of-motion) · [knee ROM](https://goniometer.io/knee-range-of-motion)
- [Hip flexion goniometry and the two-joint hamstring limit](https://www.physio-pedia.com/Goniometry:_Hip_Flexion)
