# Sources, and what rests on them

Every number in this model is one of three things: taken from a published
source, derived from one, or chosen. This file separates them, because the
third category decides most of what you see on screen and a plain citation
list hides it.

Each entry says what the source supplies, where it enters the code, and what
was changed or approximated on the way in.

---

## Published sources

### de Leva (1996)
*Adjustments to Zatsiorsky–Seluyanov's segment inertia parameters.*
Journal of Biomechanics 29(9), 1223–1230.

Segment mass fractions, longitudinal centre-of-mass positions (as a fraction
of segment length from the proximal end), and sagittal radii of gyration.
Male and female tables both present; `sex` selects between them.

- `anthropometry.js` — `DE_LEVA`, `DE_LEVA_FEMALE`, `SEGMENT_TABLES`
- Every mass, CoM and inertia in the model, scaled by stature and body mass.

**What was done to it.** de Leva gives a *trunk* as one segment; the model
splits it into chest + pelvis + head/neck so the spine and neck can hinge,
preserving whole-trunk mass and CoM exactly — the chest fraction is solved as
`a = (1 + c) - 2*com` rather than guessed, which is why the stacked-handstand
CoM is unchanged to the millimetre by the split. Radii of gyration for the two
trunk pieces are rod approximations (`k = 1/sqrt(12)`), not de Leva values.

### Winter
*Biomechanics and Motor Control of Human Movement.*

Segment **lengths** as fractions of stature — de Leva supplies inertia,
Winter supplies geometry.

- `anthropometry.js` — the `len` fields of the segment tables

### Yeadon, King & Wilson (2006)
*Modelling the maximum voluntary joint torque/angular velocity relationship in
human movement.* Journal of Biomechanics 39, 476–482.

The torque–velocity–activation envelope: a four-parameter tetanic
torque/velocity function (two rectangular hyperbolas, Hill in the concentric
phase) times a three-parameter differential activation function, so voluntary
activation is depressed at eccentric velocities.

- `strength.js` — `tetanicTorque`, `activation`, `maxVoluntaryTorque`,
  `voluntaryToTetanic`
- `control.js` — the cap the servo's applied torque is a fraction of

This caps every joint torque at every timestep. Shape constants
`HUXLEY_K = 4.3`, `ECC_PLATEAU = 1.5`. The velocity/activation parameters
(`wmax` 13.4–26.8 rad/s, `wc` ≈ 0.3–4× `wmax`, `amin` 0.66–0.72, `w1` ≈ 0,
`m` ≈ 0.3) are their **knee-extensor** fits, applied to every joint.

### Kerwin & Trewartha (2001)
*Strategies for maintaining a handstand in the anterior-posterior direction.*
Medicine & Science in Sports & Exercise 33(7).

The range of wrist balance moments a handstand actually uses; sets the wrist
strength default with headroom.

- `strength.js` — `STRENGTH_DEFAULTS.wrist`

### Yeadon & Trewartha (2003)
*Control strategy for a hand balance.* Motor Control 7(4).

The wrist strategy: balance is held by modulating wrist torque, moving the
centre of pressure within the hand patch. Implemented literally as PD on
horizontal CoM position and velocity, added to the wrist channel and still
clamped to the strength envelope, scaled by how much load the palms carry so
there is no authority while airborne.

- `control.js` — `createBalanceControl`; the `augment` closure in
  `rollout.js:runScenario`

### Workman (1987)
*Proximate time-optimal control.*

The braking cap on commanded velocity, `v ≤ √(2·α·a_brake·|e|)`, reducing to
plain PD inside the region where braking is not binding.

- `control.js` — the `brakeMargin` term in `createServo`

### Hansen — *The CMA Evolution Strategy: A Tutorial*

The (μ/μ_w, λ) covariance-matrix-adaptation evolution strategy. Implemented
from the tutorial rather than taken as a dependency, so it can be made
deterministic under a seed.

- `cma-es.js`

---

## Standard methods, implemented from the definitions

| Method | Where | Note |
|---|---|---|
| Recursive Newton–Euler (RNEA) | `dynamics.js` | The load-bearing routine |
| Composite Rigid Body (CRBA) | `dynamics.js` | Mass matrix; agreement with RNEA is gated |
| Semi-implicit Euler / RK4 | `integrate.js` | `si` is the default; RK4 gated at 4th order |
| Penalty contacts | `contact.js` | One-sided, non-adhesive; stiffness from a penetration target |
| Catmull–Rom splines | `control.js` | Knots are points **on** the curve, which is why refitting is a least-squares projection, not a resampling |

---

## Chosen, not sourced

None of the following comes from a paper. Each is a judgement, documented
where it lives.

**Range of motion** (`statics.js` — `ROM_DEFAULTS`): the wrist, shoulder,
hip, knee, spine and neck limits are plausible adult values chosen to bound
the search, not measurements. The hamstring coupling (0.6° of hip
range bought per degree of knee flexion) is a modelling device. The spine and
neck limits are the least-supported numbers in the file — which is why back
flexion is a slider: it is a property of a person, not a constant.

**Joint strengths other than the wrist** (`strength.js`): shoulder, hip,
knee, spine and neck are order-of-magnitude from typical adult dynamometry,
then tuned for a documented reason. Two worth knowing: the
shoulder at 1.6 Nm/kg describes someone who can hold a handstand but not a
planche — at 2.0 the optimizer stopped kicking up and started pressing out of
a planche instead. The neck is deliberately the weakest joint on the body, so
the search cannot steer by flinging the head.

**The plant** (`rollout.js` — `PLANT_DEFAULTS`): `kp`, `kd`, damping ratio,
loop-bandwidth cap, activation lag, contact and end-stop parameters. Chosen by
measuring *this model*, not from literature — the damping ratio and bandwidth
cap come from a step-response sweep measuring overshoot and sign-crossings per
joint. These are sliders now.

**Geometry approximations** (`anthropometry.js`, self-flagged):
- Both arms merged into one segment and both hands into one, by symmetry —
  there is no elbow, so every entry is a straight-arm entry.
- Feet folded into the shanks: no ankle articulation, an "accepted v1
  simplification". A kick-up therefore cannot push off the ball of the foot.
- Straddle as a sagittal projection: mass unchanged, gyration radius scaled by
  the projected length.
- The hand patch geometry.
- One spine hinge stands in for the whole lumbar column.
- The female table keeps male/Winter segment *lengths*, so switching sex
  changes inertia and shape but not proportions.

**Everything in `silhouette.js`** is drawing proportions. Nothing in that file
feeds the dynamics.

---

## Stale text to fix

The notebook prose in `index.html` still describes the pre-articulation body:
"Seven rigid segments", "six joints", and "Thirty-seven numbers. Six joints,
six knots apiece". The model is nine segments and eight joints, so a six-pose
technique is 49 numbers, not 37.

---

## Scope of this file

Written against `main` (nine bodies: hand, arm, chest, pelvis, two thighs, two
shanks, head+neck; eight joints). A branch exists with a further-articulated
body — elbows, ankles and toes — which adds de Leva's forearm/upper-arm and
foot entries and Winter's ankle landmarks to the list above. If that lands,
this file needs those two entries extended.
