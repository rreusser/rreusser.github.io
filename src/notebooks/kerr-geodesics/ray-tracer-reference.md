# Kerr Black Hole Ray Tracing: Implementation Reference

## Overview

This document describes the ray tracer implemented in `ray-tracer-shaders.js`. The
method is a **backwards ray tracer** for a spinning (Kerr) black hole with an
accretion disk:

- **Carter null geodesic equations** in **second-order Mino-time form**, integrated
  with **decoupled RK4**
- **Boyer-Lindquist coordinates** throughout
- **Backwards tracing**: rays cast from camera; each terminates when it hits the
  disk, falls into the horizon, or escapes to infinity
- **Per-ray independence**: every pixel's ray is independent (fragment shader)

This is not the Antonelli force-field trick (Schwarzschild-only) and not the full
DNGR ray-bundle method (which additionally propagates beam cross-sections). It is
the middle path: physically exact null geodesics for Kerr, with a practical GPU
rendering pipeline.

-----

## Conventions

- Units: `G = c = 1`
- Boyer-Lindquist coordinates: `(t, r, θ, φ)`
- Signature: `(−, +, +, +)`
- **Spin axis along +y** in Cartesian coordinates (i.e. `y = r cos θ`)
- `Σ = r² + a²cos²θ`,  `Δ = r² − 2Mr + a²`

-----

## 1. Scene Parameters

```
M       black hole mass (= 1.0; all distances in units of M)
a       spin parameter, 0 ≤ a < M
r_ISCO  inner disk radius (prograde ISCO, computed from a)
r_outer outer disk radius (default 20M)
r_esc   escape radius (= 3 × camera distance)
```

-----

## 2. Camera Setup

The implementation uses the camera's **inverse projection-view matrix** rather than
constructing a ZAMO tetrad. For each pixel:

1. Map pixel to NDC coordinates
2. Unproject near and far clip points through `invProjView` to get world-space
   ray origin and direction
3. Convert the Cartesian ray direction to Boyer-Lindquist velocity components
   via the Jacobian of the BL-to-Cartesian coordinate map

### 2.1 Cartesian ↔ Boyer-Lindquist

With oblate spheroidal coordinates (`ρ² = r² + a²`):

```
x = ρ sin θ cos φ
y = r cos θ              ← spin axis
z = ρ sin θ sin φ
```

The inverse (Cartesian → BL):

```
R² = x² + y² + z²
b  = R² − a²
r² = ½(b + √(b² + 4a²y²))
θ  = arccos(y / r)
φ  = atan2(z, x)
```

### 2.2 Computing conserved quantities from a camera ray

Given a Cartesian ray direction `d`, compute BL spatial velocity via:

```
(u^r, u^θ, u^φ) = J⁻¹ · d
```

where `J` is the Jacobian `∂(x,y,z)/∂(r,θ,φ)`. Then solve the null condition for
`u^t`:

```
g_tt (u^t)² + 2 g_tφ u^t u^φ + g_rr (u^r)² + g_θθ (u^θ)² + g_φφ (u^φ)² = 0
```

This is a quadratic in `u^t`; take the positive root. From the full four-velocity,
extract the conserved quantities and normalise to `E = 1`:

```
E = −p_t = −(g_tt u^t + g_tφ u^φ)
L = p_φ  = g_tφ u^t + g_φφ u^φ
Q = p_θ² + cos²θ (L²/sin²θ − a²E²)

b = L/E     (impact parameter)
q² = Q/E²   (reduced Carter constant)
```

-----

## 3. The Decoupled Second-Order System

### Key idea: Mino time + second-order form

The standard Carter equations use first-order form with sign tracking:

```
Σ dr/dλ = ±√R,    Σ dθ/dλ = ±√Θ
```

where signs must be flipped at turning points. This implementation instead uses:

1. **Mino time** (λ_Mino where dτ/dλ = Σ), which removes the Σ factor and fully
   decouples radial from polar motion
2. **Second-order form** with velocity variables `v_r = dr/dλ`, `v_θ = dθ/dλ`,
   so velocities pass smoothly through zero at turning points

The equations become (with E = 1, κ = 0):

```
dr/dλ  = v_r
dv_r/dλ = ½ R'(r)

dθ/dλ  = v_θ
dv_θ/dλ = ½ Θ'(θ)
```

where:

```
R(r) = P² − Δ·C,   P = r² + a² − aL,   C = (L−a)² + Q,   Δ = r² − 2Mr + a²
Θ(θ) = Q + a²cos²θ − L²cos²θ/sin²θ

R'(r) = 4rP − (2r − 2M)C         (pure polynomial in r — trig-free)
Θ'(θ) = −2a²sinθcosθ + 2L²cosθ/sin³θ   (pure trig — polynomial-free)
```

The radial system depends only on `r` (no trig functions). The polar system depends
only on `θ` (no polynomial in r). They are integrated **independently** as two
separate 2D RK4 systems.

### φ accumulation

The azimuthal angle depends on both `r` and `θ`:

```
dφ/dλ = a·P/Δ + L/sin²θ − a
```

This is accumulated via the midpoint rule using the average of pre- and post-step
values of `r` and `θ`.

### State vector

```
state = (r, θ, φ, v_r, v_θ)
```

No `t` is tracked (not needed for rendering). No sign variables — the second-order
form handles turning points automatically.

-----

## 4. RK4 Integration

Standard fourth-order Runge-Kutta applied independently to each 2D system:

```
// Radial (trig-free):
(r, vr)     ← radialRK4(r, vr, h, L, Q, M, a)

// Polar (polynomial-free):
(θ, vθ)     ← polarRK4(θ, vθ, h, L, Q, a)

// Azimuthal (midpoint rule):
φ += h · phiRate(r_mid, θ_mid, L, M, a)
```

### 4.1 Adaptive step size

The step size adapts to both proximity to the horizon and current velocity:

```
vel = max(|v_r|, |v_θ|, 1)
h   = h_base · clamp((r − r_+) / r, 0.02, 1.0) / vel
```

The `1/vel` factor is essential in Mino time: at large `r`, the Mino-time radial
velocity `v_r ~ r²` grows quadratically, so without velocity scaling the integrator
would massively overshoot. Base step size `h_base = 0.1` (full quality) or `0.4`
(interaction preview).

-----

## 5. Termination Conditions

Checked after every step, in order:

### Horizon

```
if r < r_+ · 1.01:  → black
```

### Escape

```
if r > 3 · r_camera:  → sample starfield at escape direction
```

The escape direction is computed from the BL position `(r, θ, φ)` converted to
Cartesian and normalised:

```
escapeDir = normalize(ρ sinθ cosφ,  r cosθ,  ρ sinθ sinφ)
```

### Disk crossing

Detect equatorial plane crossing via sign change in `(θ_prev − π/2)(θ − π/2)`.
Linearly interpolate to find crossing radius:

```
frac = (π/2 − θ_prev) / (θ − θ_prev)
r_cross = r_prev + frac · (r − r_prev)
```

If `r_ISCO ≤ r_cross ≤ r_outer`, shade as disk. Rays may cross the disk multiple
times (producing higher-order images); accumulated opacity is tracked.

-----

## 6. Disk Color: Doppler Beaming

### 6.1 Keplerian orbital velocity

Disk gas orbits at the prograde Keplerian angular velocity:

```
Ω = √M / (r^(3/2) + a√M)
```

The emitter's time component of four-velocity:

```
u^t_emit = 1 / √(1 − 3M/r + 2a√M / r^(3/2))
```

### 6.2 Frequency ratio (g-factor)

For a distant observer with `E_obs = E = 1`:

```
g = E_obs / E_emit = 1 / (u^t_emit · (1 − Ω·L/E))
```

This single factor encodes both gravitational redshift (from the metric) and Doppler
shift (from the orbital velocity). It produces the characteristic bright/dim asymmetry
where the approaching side of the disk is beamed brighter.

### 6.3 Intensity and color

The temperature profile follows the standard thin-disk scaling:

```
T(r) ∝ (r_ISCO / r)^(3/4)
```

The observed specific intensity (monochromatic) scales as `g³`:

```
intensity = T(r) · g³
```

(The `g³` corresponds to the Lorentz-invariant `I_ν/ν³`; the fourth power `g⁴` gives
the bolometric intensity. Since we apply a fixed color ramp rather than integrating
a blackbody spectrum, `g³` is the appropriate choice.)

Color is mapped via a simple polynomial ramp approximating warm blackbody tones:

```
R = clamp(t · 1.5, 0, 1)
G = clamp(t² · 0.4, 0, 1)
B = clamp(t³ · 0.15, 0, 1)
```

where `t = clamp(intensity, 0, 3)`. Edges are faded with smoothstep at the ISCO and
outer radius.

-----

## 7. Starfield Background

Escaped rays sample a procedural starfield. The escape direction is mapped to a grid
in `(φ, θ)` space (scaled by 80 for cell density). Each cell has a ~3% chance of
containing a star. Star brightness and color vary by hash; attenuation follows a
Gaussian with width set by the angular pixel footprint (from `dpdx`/`dpdy`).

-----

## 8. Post-Processing

The raw HDR color is tone-mapped with Reinhard (`c / (1 + c)`) and gamma-corrected
(`c^(1/2.2)`).

-----

## 9. GPU Architecture

- Each pixel maps to one fragment shader invocation
- State `(r, θ, φ, v_r, v_θ)` plus constants `(L, Q)` fits in registers
- Integration loop runs entirely within the shader; no inter-thread communication
- Max steps (2000 full / 600 preview) passed as uniform
- During interaction, renders at ¼ resolution and blits with bilinear upscaling

-----

## 10. Coordinate Singularities

### Poles (θ = 0, π)

The `L²/sin²θ` terms in `Θ(θ)`, `Θ'(θ)`, and `dφ/dλ` diverge at the poles.
Guarded with `max(sin²θ, 10⁻⁴)` and theta clamped to `[0.05, 3.09]`.

### Horizon (Δ = 0)

Terms containing `1/Δ` diverge at `r = r_+`. The adaptive step size `h ∝ (r − r+)/r`
keeps the integrator away; rays are terminated at `r < 1.01 · r_+`.

-----

## 11. Quick Reference

```
Σ = r² + a²cos²θ
Δ = r² − 2Mr + a²
r_+ = M + √(M² − a²)

// Null ray constants (E = 1):
b = L,  q² = Q

// Potentials:
R(r)  = (r² + a² − ab)² − Δ[(b−a)² + q²]
Θ(θ)  = q² + cos²θ(a² − b²/sin²θ)

// Derivatives (second-order form):
R'(r)  = 4rP − (2r − 2M)C     where P = r²+a²−aL, C = (L−a)²+Q
Θ'(θ)  = −2a²sinθcosθ + 2L²cosθ/sin³θ

// φ rate:
dφ/dλ = a·P/Δ + L/sin²θ − a

// Keplerian orbit:
Ω = √M / (r^(3/2) + a√M)
u^t = 1/√(1 − 3M/r + 2a√M/r^(3/2))

// Frequency ratio:
g = 1 / (u^t · (1 − Ω·b))

// Intensity:
I_obs = T(r) · g³,   T(r) = (r_ISCO/r)^(3/4)
```
