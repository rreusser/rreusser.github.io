# Lighting and compositing: a specification

Status: **implemented**. The composite shader's irradiance path is this
model; `src/lib/terrain-lighting.js` is the reference it was ported
from, `verify-lighting-model.mjs` holds the 15 node gates and
`verify-lighting-parity.js` the GPU one. The legacy slope/aspect path is
untouched and still reachable; see section 8.

Numbers throughout are measured, either from the reference against a
transcription of the model it replaced, or from the real sweep, or from
the GPU. Section 1 is kept in the present tense as it was written, and
describes the model that is now gone.

Three things in this document were wrong when first written and are
corrected in place, each flagged where it sits: the AO baseline (section
1), the shoulder's form (section 3.7) and the uniform-hillside premise
(sections 3.1 and 3.2). Writing the gates is what found all three.

## 1. What is wrong now, measured

The live shader accumulates a shading `value` around 0.5 and pushes it
through a soft clip and an overlay blend:

```
value  = 0.5
value += 0.5 * (dot(N,L) - L.z) * reliefGain      relief
value += 0.57 * (aoFactor  - 1)                   AO
value += 0.57 * (directMask - 1)                  cast shadow
value += brightness                               exposure
value  = 0.5 + 0.5 * tanh(value - 0.5)
```

Three structural problems follow from that shape.

**The relief term is unbounded and the shadow term is not.** `reliefGain`
is `r/(1-r)`, which reaches 100 at the top of the slider, while shadow
can only ever subtract `0.57 * shadowStrength`, at most 0.57. So relief
wins. A 40 degree slope tilted into the sun, **fully shadowed**, at sun
altitude 25 degrees, against flat open *sunlit* ground as 1.000:

| relief | shadowed / sunlit flats |
|--------|-------------------------|
| 0.00   | 0.235x |
| 0.38   | 0.362x |
| 0.60   | 0.633x |
| 0.80   | **1.613x** |
| 1.00   | **2.000x** (clipped white) |

Swept over sun altitude 0.2 to 80 degrees, slope 0 to 80, five aspects,
three openness values and the full relief range, the worst case is
**2.000x** — a fully occluded pixel rendering at twice the brightness of
sunlit flat ground, which is the ceiling only because the composite has
clipped. This is the failure described as "fully occluded regions can
still end up fully white".

Even at the default relief of 0.38 the spread *inside* full shadow
(into-sun 0.388 against away-from-sun 0.155, a 2.5x ratio) is larger
than the step from lit to shadowed (0.5 to 0.27, 1.8x). Shadow is a
weaker signal than the relief that survives inside it.

**AO multiplies direct light.** `aoFactor` is applied to everything, so
sky occlusion darkens a sunlit slope as hard as a shadowed one. Worse,
the atan tonemap `1 - (2/pi)*atan(aoS * (1-ao))` with `aoS = c/(1-c)`
becomes a cliff as the strength knob approaches 1: at `aoStrength = 1.0`
*any* pixel with openness below 1 is driven to the floor. Flat sunlit
ground, sweeping openness:

| openness | current, aoStrength 1.0 |
|----------|-------------------------|
| 1.000 | 0.5000 |
| 0.800 | 0.1174 |
| 0.400 | 0.1174 |
| 0.135 | 0.1174 |

**Brightness is inside the accumulator, and it is spending relief to buy
exposure.** Because it shifts the soft clip's midpoint, it compresses
whatever contrast is above it. At the live view's settings (relief 0.22,
shadow 0.82, ao 0.45, sun altitude 0.4 degrees), the lit spread between a
40 degree slope facing the sun and one facing away:

| brightness | flat lit | relief spread remaining |
|------------|----------|-------------------------|
| +0.00 | 0.5000 | 0.1726 |
| +0.27 (live) | 0.7289 | 0.1243  (-28%) |
| +0.50 | 0.8553 | 0.0771  (-55%) |
| +0.80 | 0.9436 | 0.0344  (-80%) |

### One correction to the premise

The AO baseline is **not** broken at the flat end. `verify-openness-baseline.mjs`
passes, and a direct check of the real sweep confirms a flat plane reads
openness exactly 1.0 for both falloffs, at every raster size, pixel size
and elevation — so flat ground is already untouched by AO, and `e^(-sin a)`
is *not* leaving it grey. The exp floor of `e^-1` is at the *dark* end: a
fully sealed pixel bottoms out at a stored AO of `e^-2 = 0.135` rather
than 0, so the two falloffs have different usable ranges in the shading
path even though `planeEnclosure` normalises them for the openness tint.
That asymmetry is real and worth removing, but it is not the flat-ground
error. The real AO problems are the two above.

Also: `kAmbient` is read into a local in `fs_main` and never used, and
`index.html` passes `kAmbient: 0, kDirect: 0`. There is **no sky light in
the model at all**. That is the hole that forced AO onto everything —
with no ambient term, there was nothing for sky occlusion to occlude.

**And a correction to the correction.** Writing the gates found the fault
the AO-baseline instinct was actually pointing at, and it is real. The
baseline that is missing is not the *flat* plane's, it is the *tilted*
plane's. The sweep starts level and counts blockers strictly above the
ray, so a uniform hillside is **not open**: its uphill azimuths block it.
Measured through the real sweep:

| slope | openness, `e^(-sin α)` | openness, `cos²α` |
|-------|------------------------|-------------------|
|  0.0  | 1.0000 | 1.0000 |
| 14.0  | 0.8942 | 0.9851 |
| 26.6  | 0.8166 | 0.9472 |
| 45.0  | 0.7263 | 0.8542 |
| 59.5  | 0.6736 | 0.7594 |

So the current shader darkens a uniform 45 degree hillside by **117/255**
as AO strength goes from 0 to 1, purely for having a slope — and the two
falloffs disagree about by how much, which is also why switching the
radio changes the shading. `planeEnclosure()` in `tile-viewer.js` already
solves exactly this for the openness *tint*. The shading path never used
it. Gate 6 is this fault, and it was not one of the three the redesign
set out to fix.

## 2. The one idea

Stop accumulating independent darkenings. Compute an **irradiance**, and
divide by the irradiance of flat open sunlit ground.

Relief shading and cast shadow are not two effects to be combined. They
are one term, `V * max(dot(N,L), 0)`, where `V` is the fraction of the
sun disc that is visible. Lambert says how obliquely the light arrives;
shadow says whether it arrives at all. A product, so either one going to
zero kills direct light outright and no amount of relief gain can
brighten an occluded pixel.

The aesthetic requirement — that unlit ground still shows relief, because
indirect light is biased toward the sun — is then not a fudge bolted onto
that product. It is a property of the **second** light: the sky has a
circumsolar peak, so sky illumination is itself sun-directional. That
makes shadowed relief physically motivated and, critically, **bounded by
the sky term's magnitude**, which is the whole fix.

The aim is not to forbid a shadowed slope from out-reading the flats.
That is legitimate aesthetic detail, and at a grazing sun it is also
true — the flats are dim then. The aim is a hard ceiling well short of
full illumination, so that no slider combination can take an occluded
pixel to white. Section 6 states where that ceiling lands.

## 3. The model

### 3.0 Shading normal

Relief strength becomes vertical exaggeration of the shading normal,
not an additive gain:

```
N = normalize(vec3(nxy * reliefExag, nz))
```

Bounded by construction: `dot(N,L) <= 1` whatever the exaggeration. Flat
ground stays flat (`nxy = 0`), so the flat-ground identity is untouched
at any setting.

### 3.1 Visibility

```
V  = (1 - shadowStrength * shadow) * H(L.z)     sun-disc visibility
Om = 1 - aoStrength * (1 - openness)            sky visibility
H(z) = smoothstep(-0.0045, 0.0045, z)           geometric horizon gate
```

`H` is a gate on the *sun*, not on the pixel: below the geometric horizon
there is no sun disc anywhere, whatever a steep slope's own orientation
says. Without it a slope tilted past vertical keeps a positive `dot(N,L)`
after sunset.

`openness` is the bake's AO, renormalised twice. First so both falloffs
span the same range (undo `aoGamma`, then map `[floorRaw, 1] -> [0, 1]`,
reusing the constants `enclosureOf` already has). Then **relative to what
this surface's own plane would read**, which is the fault above:

```
Om = 1 - aoStrength * (1 - clamp(openness / planeOpenness(N.z, falloff), 0, 1.1))
```

`planeOpenness` is `1 - planeEnclosure()` from `tile-viewer.js`, the fit
that already serves the tint. After the division a uniform plane of any
steepness reads 1 — measured 1.000 to 1.008 under `cos²α` and 0.998 to
1.031 under `e^(-sin α)` up to 45 degrees — so the tilt is counted once,
by the sky term's geometry, and not again by the measurement.

The 1.1 cap is deliberate and is not convexity headroom. The sweep counts
only blockers strictly above a level ray, so nothing can read as more
open than level and convexity is not recoverable from it; the headroom is
the exp fit's drift, which reaches 1.07 on a measured 59.5 degree
hillside. Claiming more would be inventing a signal the measurement
cannot support.

### 3.2 Irradiance

```
cosS = max(dot(N, L), 0)

csV  = leak + (1 - leak) * V
skyA = (1 - beta) * (1 + N.z)/2  +  beta * csV * cosS

E    = kSun * V * cosS  +  kSky * skyA * Om
```

Three things are doing work here.

`(1 + N.z)/2` is the cosine-weighted fraction of a uniform hemisphere a
tilted plane sees. It is exact, and it is the tilt dependence the sky
term currently lacks entirely.

It is also only half of what makes AO a pure sky factor. This term and
the measurement in `Om` would **both** carry the slope, because the
sweep's level-horizon openness already falls on a uniform hillside — so
`Om` has to be divided by the plane's own prediction first, as section
3.1 sets out. With both pieces in place the tilt is counted exactly once
and AO carries only the occlusion the terrain actually causes.

`beta` is the circumsolar fraction of sky radiance: the share of sky
light that arrives from near the sun rather than from the whole dome.
This is the term that keeps relief alive in shadow.

`csV` is the part worth dwelling on. **The occluder that hides the sun
hides most of the circumsolar sky with it.** A ridge blocking the disc
also blocks the bright 20-odd degrees around it. So `beta`'s share is
gated by the same visibility `V`, less a `leak` for the glow's angular
width. Without this gate a shadowed slope facing a grazing sun reads
*brighter* than sunlit flats — I measured 1.345x at a 0.4 degree sun
before adding it, which is the original complaint reappearing in a new
model. With `leak = 0.25` the same case is 0.967x.

### 3.3 Reference and exposure

```
Lz    = max(L.z, 0)
Eref  = kSun * H * Lz  +  kSky * ((1-beta) + beta * (leak + (1-leak)*H) * Lz)
R     = E / (Eref^eta  *  ErefHigh^(1-eta))
```

`Eref` is flat, open, unshadowed ground under the *same* sun. At
`eta = 1` the division is exact and flat open sunlit ground has
`R = 1.000000000000` at every sun altitude — verified to twelve
decimals. That single property is what the overlay blend, the
`k = v/v0` division and the 0.35 floor are all separately trying to
achieve, and it comes out of a plain multiply here.

`eta` is the exposure control, and it is the real decision in this design
(section 5).

### 3.4 Tone

```
k  = ceilStops * ln2
R' = exp(k * tanh(contrast * ln(R) / k))
```

Odd in stops, so `R = 1` maps to exactly 1 — the identity survives the
tone curve. Strictly increasing, so no two distinct irradiances collapse.
Bounded by `+/- ceilStops`, so highlights roll off instead of clipping
and shadows keep detail instead of crushing. `contrast` is a gain in
stops. This replaces `tanh(value - 0.5)` and does the same job without
the midpoint being a place exposure has to be spent.

### 3.5 Daylight

```
D = nightFloor + (1 - nightFloor) * smoothstep(-0.105, 0.035, L.z)
```

One monotone function of sun altitude, multiplying the finished relative
composite. This is the *only* carrier of day into night, replacing
`nightMask`, `nightShadow`, `nightDepth`, `fixedHS`, `timeHS` and
`horizonShadow`. Because `R` is normalised it carries no altitude trend
of its own, so the terminator cannot run backwards by construction
rather than by the `max(0.57*shadowStrength, 0.5*reliefGain)` balancing
act the current code performs.

### 3.6 Albedo and application

```
albedo = mid-grey
albedo = mix(albedo, ramp(hSample),  tint)
albedo = mix(albedo, satOklab,       satWeight)

L_out  = albedo.L * R'^w * D          w per layer, see section 5
```

A multiply, in Oklab lightness, with chroma riding the factor exactly as
`shadeOklab` already does. The multiply is legitimate here *because* `R`
is relative: `R = 1` leaves a satellite pixel bit-for-bit untouched, so
the property the overlay blend exists for is preserved while the operator
becomes the physical one. The overlay blend, `SHADE_TO_VALUE`,
`DESAT_AT_NEUTRAL` and `blendOverlay` all go away.

### 3.7 Soft max, soft min, and where compression happens

The model above still contains hard operations, and two of them matter.

**`max(dot(N,L), 0)` is a kink, and the sun is a disc.** The notebook
already has a `sunRadiusDeg` control running from 0.25 to 15 degrees, and
it already drives the shadow penumbra in the bake — but the Lambert
terminator is razor sharp regardless. At a 15 degree sun that is
inconsistent: soft shadows with a hard terminator. Soften it by the same
radius, with a compactly supported C1 smooth max:

```
g(u) = 0              u <= -1
     = (1+u)^2 / 4    -1 < u < 1          s = sin(sunRadiusDeg)
     = u              u >= 1

cosS = s * g(dot(N,L) / s)
```

Value and slope match at both joins, so it is C1 everywhere. The
compactness is the point. A softplus, `(x + sqrt(x^2+s^2))/2`, is the
obvious smooth max and is **wrong here**: it has infinite support, so at
a 15 degree sun it lights a slope tilted 35 degrees away from the
terminator at 0.048, where the disc is wholly below that surface's own
horizon and the answer must be exactly zero. The compact form gives zero
there and differs from the hard max only inside the penumbra band:

| dot(N,L) | hard | compact | softplus |
|----------|------|---------|----------|
| -0.600 | 0.00000 | 0.00000 | 0.02672 |
| -0.260 | 0.00000 | 0.00000 | 0.05343 |
|  0.000 | 0.00000 | 0.06470 | 0.12941 |
|  0.260 | 0.26000 | 0.26000 | 0.31343 |

At the default 0.46 degree radius the compact form differs from the hard
max by at most 2e-3 over the whole range, so nothing changes until the
sun is deliberately enlarged. The same `smax` serves the circumsolar
term's `cosS` and the `max(L.z, 0)` in `Eref`, so the reference kinks in
the same place the terms do and the identity survives.

**The albedo multiply can overshoot, and `clamp(L,0,1)` is a cliff.**
The tone curve bounds `R'` by `2^ceilStops`, which is 3.03 at the
suggested default, but `albedo.L * R'` is then up to 3.03 and the only
thing stopping it is a clamp. Swept over 13122 configurations the current
composite **reaches exactly 1.0 in 7599 of them** — flat white with no
structure in it, which is the hard clipping to avoid. Replace it with a
shoulder that has a knee:

```
k      = min(max(kneeMin, albedo.L), KNEE_MAX)       KNEE_MAX = 0.9
L_out  = L                                   L <= k
       = 1 - (1-k) * exp(-(L - k)/(1 - k))   L >  k
```

Identity below the knee, slope 1 on both sides of it, strictly increasing
and strictly below 1 over the whole reachable range.

Both the exponential form and the 0.9 cap are forced by floating point,
and the first draft of this section got them wrong. An asymptote of
exactly 1 is *reached* in float as soon as its argument saturates, and a
shoulder that returns exactly 1.0 **is** a clip. With `tanh` and a knee
of 0.995 every lightness above 1.085 came back as exactly 1.0, so the
shoulder was the very thing it was introduced to remove — caught by gate
12, which failed on the proposed model until this was fixed. `exp` decays
rather than saturating, and capping the knee at 0.9 keeps the argument
under 22 across the reachable range, where `exp` is still comfortably
representable.

Tying the knee to the albedo rather than fixing it is what preserves the
identity for bright ground: a fixed `kneeMin = 0.8` would compress a snow
pixel at `L = 0.9` even at `R' = 1`.

The cap has a cost, and it is the one place the identity is not exact. An
albedo above 0.9 is compressed a little even on neutral ground: the
brightest entry of this figure's ramp (`L = 0.93`) by **1.0/255**, and a
theoretical pure white by 9/255, rendering at 0.963. Gate 2 measures
this rather than tolerating it. Real albedos sit well below pure white,
so the trade is worth making, but it is a trade.

**So there are exactly two compressors, each with one job**, and nothing
else in the pipeline clips:

1. `tanh` in stops on `R`, symmetric, identity at 1, bounded by
   `ceilStops`. Compresses the *lighting* range, and is what lets every
   term upstream overshoot freely.
2. the shoulder on the finished lightness, identity below the knee,
   asymptotic to 1. Guarantees the albedo multiply and the grade cannot
   clip.

Chroma is already handled this way: `oklabToSrgbClipped` bisects chroma
at constant lightness and hue rather than clamping channels, which is a
soft min on saturation. That stays.

A toe near black is deliberately *not* added. The stops-space `tanh` is
already symmetric, so it lifts shadows by the same `ceilStops` it
compresses highlights by, and a second toe on top would flatten the
deepest shadow detail the low-sun work exists to preserve.

### 3.8 Grade

```
L' = L^(2^-brightness)
L' = pivot * (L'/pivot)^contrastPost
C' = saturation * C * L'/L
```

Brightness, contrast and saturation, applied to the finished pixel in
Oklab and nothing upstream knowing they exist — which is what was asked
for. `gradeSrgb` already does brightness and saturation correctly; this
adds the contrast knob the model never had and moves brightness out of
the accumulator. All three fix the endpoints and cannot clip.

## 4. On denali's min()

Denali computes `direct_brightness = min(hillshade_brightness, shadow_brightness)`,
justified as "the sun can only fail to light a point one way at a time".
The instinct is right and is the same insight as "two sides of the same
coin": hillshade and cast shadow are the same light, so they must not
stack.

But `min` of brightnesses is a max of darknesses, and the correct
composition of two visibility factors on one light source is a
**product**. `min` has a kink along the whole surface where the two
darkenings cross, which is a visible crease wherever a terminator runs
near a shadow edge; it has no notion of a second light source, so AO has
to multiply everything, which is the same defect as here; and it cannot
express "shadowed but still faintly sun-directional" at all, because
`min` saturates — which is exactly the aesthetic control this notebook
needs and denali does not have. `V * cosS` for the direct term plus a
circumsolar sky term is the smooth generalisation: it agrees with the
`min` at both ends and is differentiable in between.

## 5. The decisions that are yours

**Exposure `eta`.** The central trade. At `eta = 1` flat ground renders at
1.0 at every sun altitude: maximum readability, and the terminator is
carried entirely by `D`. At `eta = 0` the map darkens as the sun sets,
physically. Flat ground through an afternoon:

| sun alt | eta 1.0 | eta 0.85 | eta 0.7 | eta 0.5 | eta 0.0 |
|---------|---------|----------|---------|---------|---------|
| 60 | 1.0000 | 0.9814 | 0.9631 | 0.9393 | 0.8827 |
| 15 | 1.0000 | 0.8547 | 0.7350 | 0.6122 | 0.4401 |
|  2 | 1.0000 | 0.7581 | 0.5937 | 0.4646 | 0.3543 |

The surprise is that `eta = 1` is not the best choice even for relief.
Into/away contrast on a 30 degree pair:

| sun alt | eta 1.0 | eta 0.7 | eta 0.0 |
|---------|---------|---------|---------|
| 30 | 4.113x | 3.625x | 2.541x |
|  8 | 4.283x | 4.047x | 1.938x |
|  2 | 3.372x | 4.014x | 1.750x |
| 0.4 | 2.954x | 3.920x | 1.701x |

At `eta = 1` low-sun relief *falls* (4.28x to 2.95x), because full
normalisation inflates `R` into the tone curve's shoulder where it gets
compressed. `eta = 0.7` holds 3.6x-4.0x across the whole range. **I
recommend `eta = 0.7` as the default**, exposed as a slider: more uniform
relief, a sunset that actually darkens, and it is the better of the two
on both axes at low sun. This matters for the view you are on, at 0.4
degrees.

**Imagery double-lighting `w`.** Satellite imagery arrives already lit, so
applying `R'` at full strength shades it twice. Three options: treat it
as albedo and accept it (`w = 1`); apply `R'^w` with `w` under 1 per
layer, one knob, cheap, recommended at `w ~ 0.6`; or de-light by dividing
out a model of the capture illumination, which needs a capture sun angle
we do not have and amplifies noise in the image's own shadows. Note that
`w` is per-layer and therefore sits *inside* lighting, before the layer
mix — it is not a grade knob, and the "grade last" rule is about
brightness/contrast/saturation, not about this.

**Circumsolar leak `leak`.** This is the knob for how much relief
survives in shadow, and it is bounded at both ends by the sky budget
rather than by a clamp. Swept over sun altitude 0.1 to 89 degrees, all
slopes and aspects, relief exaggeration 1 to 6, at full shadow and the
most favourable openness:

| leak | max shadowed / sunlit flats | L on a white albedo |
|------|------------------------------|---------------------|
| 0.25 | 1.086x | 0.564 |
| 1.00 | 1.474x | 0.758 |

So the knob buys up to 1.47x of the flats at a low sun — the aesthetic
detail — while a fully shadowed pixel never passes 0.758 of full
illumination even with the circumsolar glow entirely ungated. `leak = 0.25` is physically
about right for the angular width of the glow; `0.4` to `0.6` is the
range to reach for if shadowed relief should read harder.

**Coloured light.** Once `E` is a real irradiance, making `kSun` and
`kSky` RGB gets warm direct light, blue shadows and alpenglow for almost
nothing, and the blue sky in shadow handles desaturation physically
instead of through the `0.2 + 0.8*sqrt(value)` factor. I would include
the plumbing with a strength of 0 so it changes nothing until asked.

**Dropping the slope/aspect mode.** The maplibre hillshade path is the one
that "can only ever darken", and several gates exist to work around that.
Under this model it is redundant. Removing it is a user-visible control
change, so it is your call; I would keep the `reliefMode >= 1.5` debug
passthrough either way.

**Suggested defaults**, from the sweeps: `skyFrac 0.22`, `beta 0.45`,
`leak 0.25`, `contrast 1.0`, `ceilStops 1.6`, `nightFloor 0.06`,
`eta 0.7`.

## 6. Consequences

What the model guarantees, measured over the same sweep that produces
2.000x today (altitude 0.2 to 80 degrees, nine slopes, five aspects, the
full relief range, at full shadow):

- **A fully shadowed pixel cannot approach full illumination.** Worst
  lightness on a white albedo is **0.564** at the suggested defaults and
  **0.758** with `leak` pushed all the way to 1, against a current worst
  case of clipped white. The bound is structural: with `V = 0` the direct
  term vanishes identically, so `E <= kSky`, and no gain anywhere
  downstream can manufacture light that is not in the budget.
- Shadowed slopes *may* exceed the flats, by up to 1.09x at the defaults
  and 1.47x at `leak = 1`, which is the aesthetic headroom and is
  concentrated at a low sun where the flats are genuinely dim.
- Shadowed relief still reads: into/away inside full shadow is 1.02x at a
  60 degree sun rising to 1.11x at 0.4 degrees, and the depth of the
  shadow itself runs 0.375x of sunlit flats at a high sun to 0.97x at a
  grazing one, where there is almost no direct light left to lose.
- Brightness is non-increasing in shadow fraction everywhere.
- Below the geometric horizon, no pixel brightens as the sun sets — at
  every `eta`, every slope, aspect, openness, shadow and relief setting.
- AO now bites where sky light is the budget. A sunlit flat pixel at full
  AO strength spans 1.000 to 0.706 as openness falls, against 0.500 to
  0.117 now, while a shadowed one is already down at 0.464 and moves
  only to 0.407 — almost all of its light was sky to begin with.
- Nothing clips: over 13122 configurations no sample reaches 0 or 1, and
  the shoulder is strictly increasing and strictly below 1 across the
  whole reachable range.
- A uniform hillside of any steepness is untouched by AO strength to
  within 1.0/255, and the two falloffs agree to within 1.0/255.

What will look different, and needs re-tuning rather than fixing:

- **Every default moves.** The composite is a different function; the
  current slider values are calibrated against the accumulator.
- **AO gets subtler.** It can only modulate the sky's share, roughly 22%
  of the budget at high sun. That is correct and is what well-formed AO
  looks like, but anyone who liked heavy AO will need `aoStrength` past
  what reads as equivalent today.
- **Relief saturates.** Exaggeration cannot push `dot(N,L)` past 1, so
  the top of the relief slider will feel less violent. That is the fix,
  not a regression.
- Above the geometric horizon, a steep slope can brighten as the sun
  sets — a 50 to 80 degree slope passes its own terminator. This is real
  geometry, present at `eta = 0` too, and must be allowed, so the
  monotonicity gate has to be stated below the horizon only. Stating it
  globally is what would be wrong.

## 7. The gates

Written, and in `verify-lighting-model.mjs`. They run against **both**
models in `src/lib/terrain-lighting.js`: `CURRENT`, which transcribes the
overlay branch of `fs_main` as it stands, and `PROPOSED`, which
implements this design. Every gate declares an expected status for each,
and the run fails if either model departs from it.

That two-sided form is the point. A gate that merely fails on today's
code has not shown it can tell the two apart, and a gate that only passes
on the new model has not shown there was anything to fix. It also catches
the reverse error: three of these gates were mis-specified when first
written, and the suite said so rather than quietly agreeing with me.

```
node src/notebooks/line-sweep-terrain-lighting/verify-lighting-model.mjs
node .../verify-lighting-model.mjs --table
```

**The nine faults** — expected to fail on the current shader:

| # | gate | current | proposed |
|---|------|---------|----------|
| 1 | a fully shadowed pixel never approaches full illumination | 1.0000 (clipped white) | 0.8247 worst, 0.578 at the defaults |
| 4 | AO cannot darken a sunlit pixel by more than the sky's own share | removes 39.0% where the sky is 23.4% | 25.5% where the sky is 26.9% |
| 5 | switching the AO falloff does not change the shading | 4.1/255 | 1.0/255 |
| 6 | a uniform hillside is untouched by AO strength | 116.9/255 | 1.0/255 |
| 10 | the lighting is independent of brightness, contrast and saturation | ratio moves 17.5% | 0.00% |
| 11 | brightness does not spend relief contrast | falls to 12.9% | 74.0% |
| 12 | nothing clips: lightness never reaches 0 or 1 | 7599 samples reach 1.0 | none, over 13122 |
| 13 | the direct term is C1 at the terminator and zero past it | slope jump 1.000 | 1.3e-5 |
| 14 | one sun radius drives both penumbras | Lambert penumbra 0 at every radius | scales with the radius |

**The five preserved properties** — the current shader has these and the
port must not lose them:

| # | gate | note |
|---|------|------|
| 2 | flat open sunlit ground is exactly the albedo (`eta = 1`) | exact below the knee; 1.0/255 up to `L = 0.93` |
| 3 | at any `eta`, flat open ground is one exposure factor | the property imagery needs, and it survives `eta < 1` |
| 7 | more shadow is never brighter | |
| 8 | below the geometric horizon, no pixel brightens as the sun sets | the regression the `nightDepth` balancing act exists to prevent |
| 9 | a lit pixel stays brighter than a shadowed one down to a 0.2 degree sun | what `verify-low-sun-illumination.mjs` protects |

Gates 5 and 6 drive the **real sweep** rather than positing an openness,
because the assumption that a uniform slope reads as open is precisely
what was wrong. Both also use a mid-grey albedo: at `albedo.L = 1` the
current composite clips to exactly 1.0 at every slope, and that clip hid
the difference each gate was looking for until it was changed.

**Gate 13 — GPU equals the reference to 1/255 — is done**, in
`verify-lighting-parity.js`. It needs a device, so it runs in the page
rather than under node:

```js
const { verifyLightingParity } =
  await import("/notebooks/line-sweep-terrain-lighting/verify-lighting-parity.js");
await verifyLightingParity();
```

It appends a compute entry point to the figure's **own** `SHADER` string
and calls the same `irradianceL` the fragment entry calls, so it checks
the shader rather than a transcription of it — which is why the model is
a WGSL function instead of being inlined in `fs_main`. Inputs go in as a
flat buffer, ten floats per sample, so both sides read identical bits,
and every parameter is set off its default so a uniform packed into the
wrong slot shows up instead of hiding at a value that happens to match.

Result over 38880 samples spanning sun altitude -2 to 80 degrees, nine
slopes, six aspects, five openness values, four shadow fractions and
three albedos: **max difference 3.6e-7, or 0.00009/255**, mean 4.3e-8,
zero samples over 1/255, zero WebGPU errors. That is f32 against f64
rounding, which is to say exact.

### What writing them changed

Three gates were mis-specified, and one model fault was found:

- **Gate 6 was filed as a preserved property.** It is a fault, and a
  ninth one: the missing tilted-plane baseline, section 1.
- **Gate 12 failed on the proposed model**, because the `tanh` shoulder
  saturated to exactly 1.0 in float and so *was* a clip. Fixed by the
  exponential form in section 3.7.
- **Gate 4's bound was a constant.** The sky's share is not: 23% of a
  sunlit flat pixel at a 60 degree sun, 51% at 10 degrees. The bound is
  now computed per altitude from the irradiance model, and that is what
  exposes the current AO as wrong in *kind* — `aoFactor` is a plain
  multiplier with no altitude dependence at all, so at a high sun it
  removes more than the entire sky budget.
- **Gate 11's threshold was unreachable.** Any monotone remap of
  lightness moves a spread; a gamma on `L` costs 26% of it at the far end
  of the slider, against the current shader's 87%.

## 8. What the port changed

**Removed:** `blendOverlay`, `overlayComposite`, `SHADE_TO_VALUE`,
`DESAT_AT_NEUTRAL`, the `value` accumulator, `nightDepth` and
`directMask` — 91 lines of dead shader, plus the old branch body.

**Kept, and why.** Dropping the slope/aspect model was listed in section
5 as a decision rather than a consequence, and it has not been taken. So
`nightMask`, `nightShadow`, `fixedHS`, `timeHS`, `horizonShadow`, the
`v0` division with its 0.35 floor, the `aoFactor` atan tonemap and
`shadeOklab` are all still live: that path needs every one of them. It
stays reachable from the shading radio, now labelled "irradiance" against
"legacy relief", so the two can be compared on screen. The radio's stored
values are unchanged, so existing links keep working.

`kAmbient` and `kDirect` are still in the uniform struct, still passed as
0 by the figure, and still read by nothing. They are dead and can go
whenever the legacy path does.

**Added:** three uniform vec4s — `light` (skyFrac, beta, leak, eta),
`tone` (ceilStops, nightFloor, kneeMin, sunRadiusDeg) and `shape`
(reliefExag, contrastPost, pivot, toneContrast) — taking the global
uniform buffer from 128 to 176 bytes, and seven controls with hash
params: `exp`, `skyf`, `skyb`, `glow`, `lcon`, `con`, `imgl`.

`sunRadiusDeg` is **not** new: it is the radius the bake already used for
the shadow penumbra, now also driving the Lambert terminator, so one
control widens both. That is gate 14, and it is the whole reason the
terminator softening is tied to a physical quantity rather than a
separate smoothing knob.

**Still open:** deleting the legacy path would remove roughly another 150
lines and let `verify-overlay-shading.mjs` and `verify-night-shading.mjs`
go with it. That is a separate change and wants saying out loud rather
than folding into this one. The `eta` default of 0.7 is a recommendation
from the sweeps, not a confirmed choice.

## 9. The control audit

The port left eleven shading controls, and they did not survive contact
with a user: relief strength appeared to do nothing, and several knobs
clearly overlapped. This section is the measurement that sorted them
out, because "feels redundant" and "is redundant" are different claims
and only one of them can be checked.

The method: perturb each control across its range and record the change
it makes to each of 192 representative pixels. That gives every control
an effect **vector**. Two controls that reshape the picture the same way
have parallel vectors.

### The metric was wrong the first time

Mean-centring those vectors over *all* pixels made any two controls that
act only on shadowed pixels look identical, because they share a support.
A level shift and a structural change inside the shade are not the same
control. Fixed by splitting each effect into a **level** part (how far it
moves its pixels on average) and a **structure** part (what it does to
the differences between them), and comparing structure only, on the
pixels both controls touch.

That correction mattered. Under the bad metric, shadow depth and relief
in shade scored 0.913 and looked interchangeable; under the good one they
are 0.873 with sharply different character — shadow depth is mostly level
(|level| 0.279, structure/level ratio 0.71) and relief in shade is almost
pure structure (ratio 1.06). They are not the same control, and the first
plan to drop one of them was wrong.

### What came out

Genuinely redundant, structural |cos| above 0.95:

| pair | \|cos\| | resolution |
|------|---------|------------|
| light contrast / grade contrast | 0.981 | kept the post-process one; section 3.8 says why that is where contrast belongs |
| sky light / sky sun-bias | 0.976, opposed | kept sky light, pinned `beta = 0.45` |

Pinning `beta` fixed a second fault on its own: `leak` scales the
circumsolar glow, so at `beta = 0` the relief-in-shade control went
completely dead, with nothing on screen to say why.

### Authority, measured on a real frame

Per-pixel |delta| across each parameter's range, in 255ths, over 65536
pixels of the live view. These are driven through `setLighting` rather
than through the sliders, so the pinned parameters can be swept too.

| parameter | control | p95 | max | % pixels moved |
|-----------|---------|-----|-----|----------------|
| `eta` | exposure | 226 | 237 | 59% |
| `shadowStrength` | shadow depth | 200 | 222 | 29% |
| `sunRadiusDeg` | sun diameter | 118 | 229 | 44% |
| `reliefExag` | terrain exaggeration | 115 | 142 | 79% |
| `contrastPost` | contrast | 110 | 144 | 100% |
| `toneContrast` | (removed) | 94 | 143 | 100% |
| `skyFrac` | sky light | 72 | 180 | 99% |
| `beta` | (removed) | 42 | 94 | 98% |
| `aoStrength` | AO strength | 28 | 73 | 67% |
| `leak` | relief in shade | 10 | 35 | 24% |

### The settling bug, which cost two wrong conclusions

An earlier version of this table was measured by stepping each slider
and sampling after two animation frames. That is not enough: the figure
needs a few frames plus a few hundred milliseconds to converge,
especially where a change triggers a re-bake or waits on a texture. Every
number came out too low, and three of them badly so.

It read **satellite** as moving 0% of pixels, when it moves 99% with
p95 202. It read **AO strength** as p95 1 / max 9 on 8% of pixels, when
it is p95 28 / max 73 on 67%. And it read **relief in shade** as max 4.7
on 1.1% of pixels, when it is p95 10 / max 35 on 24%.

Two conclusions in this document were drawn from those bad numbers and
are wrong:

- **AO strength was called the one marginal control.** It is not
  marginal. It is the fourth weakest of ten, with real reach across two
  thirds of the frame.
- **Relief in shade was removed for having no authority.** That was a
  measurement artifact. It is back. 10/255 at p95 across a quarter of
  the frame is a visible control, and it is the knob for the one effect
  this whole redesign was asked to provide -- relief surviving inside a
  cast shadow.

The lesson is narrow and worth keeping: **an authority measurement taken
from a live GPU figure must settle before it is read**, and a control
that measures as doing nothing should be suspected of a timing bug
before it is deleted. The model-level sweeps in
`verify-lighting-model.mjs` have no such hazard, which is why the
*redundancy* findings below were unaffected -- they were measured
against the reference implementation, not the frame.

### What was removed, and why it stands

Both removals were for **redundancy**, measured against the reference
model and so free of the settling hazard:

- **sky sun-bias** (`beta`): structural |cos| 0.976 against sky light,
  opposed, so one undid the other. Pinned at 0.45. It had authority
  (p95 42) -- that was never the question.
- **light contrast** (`toneContrast`): structural |cos| 0.981 against
  grade contrast. The same control twice; the post-process one is the
  one that belongs to the viewer rather than to the physics. Pinned at 1.

And one relabel, which was the user's original complaint: **relief
strength** became **terrain exaggeration, x1 to x6**. Section 1's figure
-- that it moves lit shading spread only from 0.7882 to 0.8049 -- is
true and was the wrong measurement. It does not amplify relief, it
*rearranges* which slopes are bright, which is what exaggeration is for,
and that reaches p95 115/255 across 79% of the frame. What was broken
was the label: a 0..1 track called "relief strength" promises that zero
means no relief, and zero is x1, the true normal, with full physical
Lambert shading intact.

### Where it landed

Eleven shading controls down to nine: sun diameter, terrain
exaggeration, shadow depth, AO strength, sky light, relief in shade,
exposure, contrast, saturation, plus brightness and imagery relight.
`beta`, `ceilStops` and `toneContrast` are pinned in `tile-viewer.js`
with the measurement that retired each one; all three remain parameters
of the reference model in `src/lib/terrain-lighting.js`, so the gates
still sweep them.

The panel is five collapsible sections, ordered the way the picture is
built: **color** (the albedo), **light** (what falls on it), **bake and
model** (how both are computed), **tone and grade** (the post-process on
the finished pixel), and **animation**. No rule above the first. The sun
handle and the ramp editor move into the light and color sections
whenever the controls panel is up, rather than being hoisted in beside
the sections as bare siblings.

Light is the section that opens by default, not color, so the panel
opens on the controls that get touched most rather than on the one that
happens to be first.

## 10. Naming, and the defaults

A control is only as good as the thing a reader thinks it does. This pass
went through all of them.

### Renamed

| was | now | why |
|-----|-----|-----|
| exposure | **sunset dimming** (inverted) | the parameter is eta, the exponent on the flat-ground reference. It is not exposure in any photographic sense. 0 now holds the flats at one brightness however low the sun gets; 1 lets the map darken with it |
| AO strength | **sky occlusion** | "AO" explained neither what it does nor why it is subtle. It occludes sky light, so its reach is bounded by how much sky light there is, and the name now says so |
| AO falloff | **occlusion falloff** | pairs with the above |
| mode | **bake mode** | it sat between "shading" and "sun mode" naming nothing |
| tint structure | **concavity tint** | "structure" named nothing in particular; concavity is what the openness residual measures |
| structure contrast | **concavity contrast** | as above |
| relief strength | **terrain exaggeration, x1-x6** | section 9 |

`imagery relight` moved from the tone section to colour, beside
`satellite`: it does nothing while satellite opacity is 0, which is the
default, so on its own it read as a dead control.

The light section is ordered as the shade is built -- shadow depth
(whether the sun is blocked), sky light (what fills in behind it), sky
occlusion (what the terrain takes back), relief in shade (how
directional what is left is). Sky occlusion had been sitting between the
first two, splitting the shadow control from the three sky controls it
feeds.

**Left alone deliberately:** `terrain exaggeration` slightly
over-promises, since nothing about the elevation data, the ramp or the
contours changes -- only the shading normal. `slope exaggeration` would
be exact. It stays because vertical exaggeration of hillshading is the
cartographic convention, and a second rename of the same control costs
more than the precision buys.

### Two defaults made physical

`shadow depth` was 0.47 and `sky occlusion` was 0.3. Both were
compensating for faults in the model that is now gone: 0.47 said a fully
shadowed pixel still received half the direct beam, which is not a
statement about shadows so much as an admission that full shadow was too
black before there was sky light to fill it, and 0.3 applied under a
third of the occlusion the bake measured because the old model applied
it to direct sunlight as well. Both are now 1.

On the live view that takes the midtones from p50 78 to p50 38, with no
clipping at either end.

### What that broke, and the fix

The two models read `params.z` and `params.w` on different scales. The
irradiance path takes them as linear strengths, where 1 means "apply
what was measured". The legacy slope/aspect path takes `params.z`
through an atan tonemap with a pole at 1, and multiplies `params.w` into
a chain of darkenings. At the new defaults the legacy path collapsed:
**52% of the frame clipped to pure black**.

Both legacy uses are now scaled by that path's own former defaults --
`aoContrast * 0.3` and `shadowStrength * 0.47` -- so the slider's top
end reproduces exactly where that path used to sit, and one control
stays meaningful in both models.

That leaves the legacy path clipping 16% black at this view, and it is
worth being clear that this is not a regression. Swept down to shadow
depth 0, with cast shadows entirely off, it still clips **9.1%**; at a
high sun it clips 5.6%. The clipping is inherent to multiplying
darkenings together, which is the defect section 2 set out to remove.
The irradiance path clips **0%** on the same view at the same settings.

## 11. The ramp editor in the panel

The gradient editor carried its own title, "Elevation tint", which
duplicated the slider immediately above it, and its own collapse header,
which was a second collapse control nested inside the colour section's.
It is styled as a floating glass card -- translucent, blurred, bordered,
shadowed -- which is right over the map and reads as a foreign dark box
wedged between two slider rows in the panel.

Both placements are wanted, so the editor now has two presentations.
Over the map it is unchanged. In the panel the card chrome is flattened
to nothing, the body padding is dropped so it left-aligns with the
slider rows, and its header is hidden: the section already names it and
already collapses it. Its title is now "Elevation ramp", which is what
it edits -- the slider above is how much of that ramp is mixed in.

Hiding the header means nothing can expand a collapsed ramp, so panel
mode forces it expanded, guarded on the current state.

### What that cost, and the general lesson

Placement is driven by a `MutationObserver`, and the first two versions
of it **wedged the browser tab**.

The first spun forever. `setCollapsed` assigns
`headToggle.textContent`, which replaces a text node *even when the text
is unchanged*; that is a childList mutation; the observer was watching
`document.body` with `subtree: true`, so it saw its own handler's write
and called the handler again.

The second guarded that write and disconnected around the handler, which
removed the loop but not the cost: re-arming a whole-document
observation on every text node any live figure on the page replaced,
dozens of times a second, was enough on its own to peg the main thread.

Neither was necessary, and the fix is to watch the right thing:

- `.expandable-controls-panel` is a **direct child of `document.body`**,
  so `childList` *without* `subtree` catches it appearing and going
  away, and nothing else on the page reaches that list.
- A second observer on the panel element itself, with
  `attributeFilter: ["style", "class"]`, catches it being shown or
  hidden, which is an attribute change rather than a child one.
- The handler only ever writes inside the panel or inside the figure,
  and neither observer watches those, so there is no feedback path at
  all rather than one that has been suppressed.

Verified: panel up puts the ramp in colour and the sun handle in light
with the card chrome flattened; hiding the panel returns both to the map
with the glass card and its header back; restoring it round-trips
exactly; and a second of idle takes a second, meaning the main thread is
free.


## 12. Control naming, second pass

- **sky light → ambient light.** What it sets is the share of the
  irradiance budget arriving from the sky rather than straight from the
  sun, which is what makes an open shadow deep or shallow.
- **sunset dimming moved into the light section**, beside the sun
  controls it responds to. It acts on the irradiance, upstream of the
  albedo, where brightness, contrast and saturation are all downstream;
  grouping it with the grade implied the wrong thing. That leaves "tone
  and grade" as exactly the three post-process knobs.
- **imagery relight → imagery shading.** "Relight" is VFX jargon for an
  operation nobody outside it has met.
- **The ramp editor moved to the bottom of the colour section**, so the
  sliders read as one block instead of being split in two by a widget.
- **"colour" → "color"** in the section label. The shared gradient
  editor in `src/lib/` still says "Colour ramp" and "Stop colour"
  internally; those are other notebooks' strings too and were left
  alone.

### Satellite imagery is an albedo

The `imagery shading` control is gone, and with it the whole relighting
term. The premise is now stated rather than compensated for: **the
satellite imagery is the intrinsic diffuse colour of the ground**, like
the mid-grey and the hypsometric ramp before it, and one lighting
applies to all three.

That is an assumption, not a fact. The imagery really does carry the
light of the day it was taken, so where the capture sun and the drawn
sun disagree the result is shaded slightly twice. Measured at the time,
with elevation tint at 0 and satellite at 1, taking the shading from
none to full cost the dark end 29 levels and the midtones 62, which is
the size of what is being accepted.

It is worth accepting because the alternative was a control nobody could
name. Neither end of it was right -- at 1 the photo is double-shaded, at
0 a ridge casting a long shadow leaves the imagery untouched -- so it
asked the reader to pick a point on a scale between two wrong answers,
with no principle for choosing. Declaring the premise removes the
question instead of parameterising it, and the model gets simpler for
it: one albedo stack, one light, no layer with an exception of its own.

What this costs, concretely: imagery captured at a high sun and drawn at
a low one keeps its own midday shading underneath the long shadows being
computed over it. If that ever matters, the fix is to de-light the
imagery against an estimate of its capture illumination, not to fade the
lighting that is being applied now.

## 13. Sky occlusion, and a diagnosis that was wrong

The control read as very weak. The first diagnosis of why was wrong, and
the way it was wrong is worth recording.

### The mistake

Reading `tile._cpuAo` from a baked tile and pushing it through
`opennessOf()` applies the bake's gamma correction **twice**. `_cpuAo`
holds the RAW openness; `packRGBA` is what applies `aoGamma = 2` when it
writes the texture, and `opennessOf` exists to undo that gamma on the
way back out. Feeding it the pre-gamma array takes an extra square root
of a number below 1, which pushes every value up.

The damage, side by side over the same 37k pixels:

| | openness p50 | ratio to own plane p50 | % more occluded than its plane |
|---|---|---|---|
| with the double gamma | 0.847 | 1.064 | 6% |
| correct | **0.709** | **0.894** | **80%** |

So the conclusion drawn from it -- that the median pixel reads as more
open than its own tangent plane, that only 6% of the map carries real
occlusion, and that the plane-relative normalisation had squeezed the
signal to nothing -- was an artifact. Four fifths of the map is more
occluded than its plane, and the term always had signal. The shader was
never wrong; only the offline analysis of it was.

### What the control actually needed

Not a fix, then, but a range. At strength 1 the measured occlusion
removes 11% of the sky term at the median and 24% at the 10th
percentile, and since sky light is a minority of the budget under a high
sun, that lands as a handful of 255ths. Real, but subtle -- which is
what "very weak" was reporting.

So the slider now carries the range directly, `[0, 2.5]` with 1 still
meaning "apply what the bake measured". Above 1 is exaggeration, in the
same idiom as terrain exaggeration, and it is visible as such:

| | p50 | p95 | max |
|---|-----|-----|-----|
| strength 1 against off | 10 | 26 | 55 |
| strength 2.5 against off | 25 | 55 | 74 |

An intermediate version hid a 2.22x multiplier inside the model instead,
chosen to match the concavity tint's `AO_REL_SCALE`. That was the wrong
shape even before its justification collapsed: it buried an aesthetic
decision in the physics where the slider could have carried it in the
open.

### What survived

The **one-sided** residual, `max(0, 1 - omRel)`, stays. The part above 1
is not signal -- the sweep starts level and counts only blockers
strictly above the ray, so nothing can read as more open than level and
convexity is not recoverable; the headroom is the exp baseline's
polynomial drift. Ignoring it also makes a uniform plane of any
steepness exactly neutral rather than nearly so, which strengthens
gate 6.

And gate 4 now sweeps strength to 2.5 rather than stopping at 1, because
the ceiling is the thing that has to hold under exaggeration: `Om` floors
at 0 and multiplies only the sky term, so no setting of the slider can
remove more light than the sky supplies.

## 14. The tone curve was the shadow floor

Shadows could not be made dark, and the cause was not the lighting.

`tone()` used one symmetric reach, `ceilStops = 1.6`, which clamps the
relative irradiance to `[2^-1.6, 2^1.6]` = `[0.330, 3.03]`. The physics
was already producing what was asked for: an open shadow under a high
sun with ambient at its minimum has **R = 0.036**. The curve lifted that
to 0.330, a factor of ten, and no control downstream could reach past
it, because the floor was in the curve rather than in any term feeding
it.

The other end was never used. Measured on real terrain R tops out at
**1.55**, so 1.6 stops of headroom above neutral did nothing at all
while bright ramp albedo multiplied by R > 1 ran into the output
shoulder instead.

So the reach is now set separately on each side: `highlightStops` 0.6
and `shadowStops` 3.5. Both branches still have value 1 and the same
slope at R = 1, so the curve is C1 there and the flat-ground identity is
untouched.

Measured on the live figure at a 30 degree sun, sweeping only the curve:

| | p05 | p50 | p95 |
|---|-----|-----|-----|
| symmetric 1.6, ambient 0.22 | 7.0 | 36.3 | 83.3 |
| asymmetric, ambient 0.22 | **4.3** | 36.0 | 81.7 |
| symmetric 1.6, ambient 0.05 | 6.7 | 40.0 | 91.3 |
| asymmetric, ambient 0.05 | **3.3** | 39.7 | 87.7 |

The midtones barely move, which is right: `tanh` is nearly linear near
neutral, so the stop counts only act in the tails. That is the whole
point of changing them rather than the contrast.

## 15. Terrain exaggeration removed

It multiplied the shading normal's horizontal component before the
lighting, so sun-facing slopes were driven further above flat ground
than the terrain warranted, feeding the highlight end. It is gone and
the shading normal is used as measured. `shape.x`, which carried the
exaggeration factor, now carries `shadowStops`.
