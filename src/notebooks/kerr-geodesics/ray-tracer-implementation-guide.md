# Kerr Black Hole Ray Tracing: Implementation Guide

## Overview and Method Choice

This guide implements a backwards ray tracer for a spinning (Kerr) black hole with an
accretion disk, in the style of the Interstellar rendering. The method is:

- **Carter null geodesic equations**, integrated with **RK4**
- **Boyer-Lindquist coordinates** throughout
- **Backwards tracing**: rays are cast from the camera, each ray terminates when it
  hits the disk, falls into the horizon, or escapes to infinity
- **Per-ray independence**: every pixel's ray is completely independent, making the
  method trivially parallel (fragment shader or CPU thread pool)

This is not the Antonelli force-field trick (which is Schwarzschild-only) and not the
full DNGR ray-bundle method (which additionally propagates beam cross-sections for
antialiasing). It is the middle path: physically exact null geodesics for Kerr, with
a practical rendering pipeline on top.

-----

## Conventions

- Units: `G = c = 1`
- Boyer-Lindquist coordinates: `(t, r, θ, φ)`
- Signature: `(−, +, +, +)`
- Black hole at origin, spin axis along `+z`
- `Σ = r² + a²cos²θ`,  `Δ = r² − 2Mr + a²`

-----

## 1. Scene Parameters

```
M       black hole mass (set to 1.0; all distances are in units of M)
a       spin parameter, 0 ≤ a < M  (a=0 is Schwarzschild, a→M is extremal Kerr)
r_inner inner disk radius (= r_ISCO, see Section 4)
r_outer outer disk radius (choose e.g. 12M)
r_max   escape radius beyond which ray is considered free (choose e.g. 100M)
```

-----

## 2. Camera Setup

The camera has a position `(r_cam, θ_cam, φ_cam)` in Boyer-Lindquist coordinates and
looks toward the black hole. The image plane is defined by a field-of-view angle and
a pixel grid.

### 2.1 Camera frame (FIDO / Zero Angular Momentum Observer)

At the camera location, construct an orthonormal tetrad — a local Cartesian frame
carried by a locally non-rotating observer (ZAMO). The ZAMO has angular velocity:

```
Ω_ZAMO = −g_tφ / g_φφ = 2Mar / [(r² + a²)² − a²Δ sin²θ]
```

The tetrad basis vectors in Boyer-Lindquist components are:

```
e_t̂ = (1/α, 0, 0, Ω_ZAMO/α)        (timelike, normalized)

e_r̂ = (0, √(Δ/Σ), 0, 0)

e_θ̂ = (0, 0, 1/√Σ, 0)

e_φ̂ = (0, 0, 0, 1/(√Σ sin θ · α) · something)
```

where `α = √(Δ Σ / [(r²+a²)² − a²Δ sin²θ])` is the lapse function.

**Practical shortcut**: if the camera is at a fixed circular equatorial orbit or at
a large radius (r >> M), the ZAMO frame reduces to nearly flat space. For simplicity,
many implementations place the camera far enough that the tetrad is approximately
Cartesian-spherical and the correction is small.

### 2.2 Generating initial ray momenta from a pixel direction

For each pixel `(i, j)` on the image plane of size `W × H` with field-of-view angle
`fov_y`:

```
// Pixel to normalised image-plane coordinates
u = (i + 0.5) / W − 0.5                 // horizontal, range [−0.5, 0.5]
v = (j + 0.5) / H − 0.5                 // vertical

// Local ray direction in camera frame (in units where forward = −ẑ)
aspect = W / H
tan_half = tan(fov_y / 2)
d_local = normalize([ u * aspect * tan_half,
                       v * tan_half,
                      −1.0 ])
```

Transform `d_local` from the camera's local frame into the coordinate basis to get
the initial Boyer-Lindquist coordinate components of the photon four-momentum `p^μ`.

For a camera at large `r` looking inward with inclination `i_cam` from the spin axis:

```
p^r  = −cos(pitch) * cos(yaw)    (negative = inward)
p^θ  = −sin(pitch) / r_cam
p^φ  =  sin(yaw) / (r_cam * sin θ_cam)
```

(These are approximate; the exact transformation uses the inverse tetrad.)

### 2.3 Computing constants of motion from initial momenta

Once you have `p^μ_initial = (p^t, p^r, p^θ, p^φ)` at `(r₀, θ₀)`, extract the
four constants of motion for the null ray:

```
κ  = 0             (null ray — photons are massless)

E  = −p_t = −(g_tt p^t + g_tφ p^φ)
           = (1 − 2Mr₀/Σ₀) p^t − (2Mar₀ sin²θ₀ / Σ₀) p^φ     [but sign-negated]

L  = p_φ  = g_tφ p^t + g_φφ p^φ
           = −(2Mar₀ sin²θ₀ / Σ₀) p^t
             + (r₀² + a² + 2Ma²r₀ sin²θ₀/Σ₀) sin²θ₀  p^φ

p_r = g_rr p^r = (Σ₀/Δ₀) p^r

p_θ = g_θθ p^θ = Σ₀ p^θ

Q  = p_θ² + cos²θ₀ · [a²(0 − E²) − L²/sin²θ₀]
   = p_θ² − cos²θ₀ · [a²E² + L²/sin²θ₀]
   = p_θ² − cos²θ₀ · (aE·sinθ₀ − L/sinθ₀)² / sin²θ₀ · sin²θ₀  [verify sign]
```

The cleaner definition is `Q = p_θ² + cos²θ₀ (a²(κ−E²) + L²cot²θ₀)`, which for
`κ = 0` gives:

```
Q = p_θ² + cos²θ₀ (−a²E² + L²cot²θ₀)
```

**Scale invariance**: for null rays, `E` is not independently meaningful — only the
ratios `b = L/E` (impact parameter) and `q = √Q / E` (reduced Carter constant)
matter. You can freely normalise `E = 1` and work with `(b, q)` throughout. This
is the standard approach in ray tracers.

Setting `E = 1`:

```
b = L / E = L     (impact parameter, signed)
q² = Q / E²       (reduced Carter constant, must be ≥ 0)
```

-----

## 3. The Carter Equations for Null Rays

With `E = 1` and `(b, q²)` computed from initial conditions, define the radial and
polar potentials:

```
R(r) = (r² + a²  − a·b)²  −  Δ [(b − a)² + q²]

Θ(θ) = q²  +  a²cos²θ  −  b²cot²θ
      = q²  +  cos²θ (a²  −  b²/sin²θ)
```

(For `E = 1`, the general `R(r) = [E(r²+a²) − aL]² − Δ[κr² + (L−aE)² + Q]`
reduces to the above with `κ = 0`, `L = b`, `Q = q²`.)

The Carter equations in affine parameter `λ` are:

```
Σ · dr/dλ  = ±√R(r)

Σ · dθ/dλ  = ±√Θ(θ)

Σ · dφ/dλ  = −(a − b/sin²θ)  +  (a/Δ) · (r² + a² − a·b)

Σ · dt/dλ  = −a(a·sin²θ − b)  +  ((r²+a²)/Δ) · (r² + a² − a·b)
```

The `±` signs flip at each turning point (where `R = 0` or `Θ = 0`).

**The state vector for integration is:**

```
y = (r, θ, φ, t,  sign_r, sign_θ)
```

where `sign_r ∈ {+1, −1}` and `sign_θ ∈ {+1, −1}` track the current direction of
motion in each coordinate.

### 3.1 The right-hand side

Define the RHS function `F(y)` that returns `dy/dλ`:

```python
def F(r, theta, phi, t, sr, stheta, b, q2, M, a):
    sin_t  = sin(theta)
    cos_t  = cos(theta)
    Sigma  = r*r + a*a * cos_t*cos_t
    Delta  = r*r - 2*M*r + a*a

    A_r    = r*r + a*a - a*b           # factor in r-equations
    R      = A_r*A_r - Delta * ((b - a)**2 + q2)
    Theta  = q2 + cos_t*cos_t * (a*a - b*b / (sin_t*sin_t + 1e-30))

    # Guard: clamp negatives to zero before sqrt (should be ≥ 0 in valid region)
    dr_dl     = sr    * sqrt(max(R, 0.0))     / Sigma
    dtheta_dl = stheta * sqrt(max(Theta, 0.0)) / Sigma
    dphi_dl   = (-(a - b / (sin_t*sin_t + 1e-30))  +  a / Delta * A_r) / Sigma
    dt_dl     = (-a * (a * sin_t*sin_t - b)  +  (r*r + a*a) / Delta * A_r) / Sigma

    return (dr_dl, dtheta_dl, dphi_dl, dt_dl)
```

Note: `t` and `φ` are not needed to evaluate the RHS (they do not appear in `R`,
`Θ`, `Σ`, or `Δ`). Their derivatives depend only on `(r, θ)`. You can therefore
integrate `(r, θ)` first and compute `(t, φ)` by accumulation, or integrate all
four simultaneously — both are correct.

-----

## 4. RK4 Integration Step

Standard fourth-order Runge-Kutta applied to `dy/dλ = F(y)`:

```python
def rk4_step(r, theta, phi, t, sr, stheta, b, q2, M, a, h):
    # k1
    dr1, dθ1, dφ1, dt1 = F(r,            theta,            phi, t, sr, stheta, b, q2, M, a)
    # k2
    dr2, dθ2, dφ2, dt2 = F(r + h/2*dr1,  theta + h/2*dθ1, phi, t, sr, stheta, b, q2, M, a)
    # k3
    dr3, dθ3, dφ3, dt3 = F(r + h/2*dr2,  theta + h/2*dθ2, phi, t, sr, stheta, b, q2, M, a)
    # k4
    dr4, dθ4, dφ4, dt4 = F(r + h*dr3,    theta + h*dθ3,   phi, t, sr, stheta, b, q2, M, a)

    r_new     = r     + h/6 * (dr1 + 2*dr2 + 2*dr3 + dr4)
    theta_new = theta + h/6 * (dθ1 + 2*dθ2 + 2*dθ3 + dθ4)
    phi_new   = phi   + h/6 * (dφ1 + 2*dφ2 + 2*dφ3 + dφ4)
    t_new     = t     + h/6 * (dt1 + 2*dt2 + 2*dt3 + dt4)

    return r_new, theta_new, phi_new, t_new
```

**Sign flipping**: after each step, check if `R(r_new) < 0` or `Θ(θ_new) < 0`. If
so, a turning point was crossed during this step. Flip the corresponding sign and
clamp `r` or `θ` to the turning-point value. For rendering, a simpler heuristic
works: flip `sign_r` whenever `dr/dλ` would carry `r` below the last turning point
estimate; similarly for `θ`.

### 4.1 Adaptive step size

For a black hole ray tracer, a simple adaptive scheme is sufficient:

```python
h = h_base * min(1.0, (r - r_horizon) / r)
```

This makes steps smaller close to the horizon where curvature is large, and larger
far away where the geodesic is nearly straight. A good base step size is `h_base = 0.1`
(in units of `M`).

-----

## 5. Termination Conditions

Check these after every step, in order:

```python
# 1. Fell into the horizon
if r <= r_horizon + epsilon:
    return COLOR_BLACK

# 2. Hit the accretion disk (r_ISCO ≤ r ≤ r_outer, equatorial plane)
# Detect equatorial crossing: theta crossed π/2 between last step and this step
if abs(theta - PI/2) < disk_half_thickness and r_ISCO <= r <= r_outer:
    return disk_color(r, phi, b, q2, M, a)

# 3. Escaped to infinity
if r >= r_max:
    return skybox_sample(ray_direction_at_escape)
```

**Disk crossing detection**: rather than checking `|θ − π/2| < ε` at each step
(which can miss a fast-moving ray), check for a sign change in `(θ_prev − π/2)` and
`(θ_curr − π/2)`. If signs differ, the ray crossed the equatorial plane this step.
Bisect to find the crossing `r`.

**ISCO radius** for the disk inner edge (prograde orbit, corotating with spin `a`):

```python
def r_ISCO(M, a):
    Z1 = 1 + (1 - a**2/M**2)**(1/3) * ((1 + a/M)**(1/3) + (1 - a/M)**(1/3))
    Z2 = sqrt(3 * a**2/M**2 + Z1**2)
    return M * (3 + Z2 - sqrt((3 - Z1) * (3 + Z1 + 2*Z2)))
```

-----

## 6. Disk Color: Doppler Beaming and Gravitational Redshift

When a ray hits the disk at position `(r_hit, φ_hit)`, compute the color accounting
for relativistic effects. This is what gives the characteristic bright/dim asymmetry
of the Interstellar disk.

### 6.1 Gas orbital velocity

The disk gas orbits the black hole at the Keplerian angular velocity in Kerr:

```
Ω = dφ/dt = √M / (r^{3/2} + a√M)     (prograde equatorial orbit)
```

The gas four-velocity components at radius `r` in the equatorial plane (`θ = π/2`,
`Σ = r²`, `Δ = r² − 2Mr + a²`):

```
u^t = 1 / √(−g_tt − 2 g_tφ Ω − g_φφ Ω²)

u^φ = Ω · u^t

u^r = 0,  u^θ = 0
```

where the metric components at `θ = π/2` are:

```
g_tt  = −(1 − 2M/r)
g_tφ  = 2Ma/r
g_φφ  = r² + a² + 2Ma²/r
```

### 6.2 Photon energy at emission vs. reception

The energy of a photon as measured by an observer with four-velocity `u^μ` is:

```
E_obs = −g_μν p^μ u^ν
```

For the emitting gas at the disk hit point (with `p^μ` the photon four-momentum at
that point, and `u^μ_emit` the gas four-velocity above), the ratio of received to
emitted frequency is:

```
g_factor = E_obs_camera / E_emit_gas
         = (−g_μν p^μ u^ν_cam) / (−g_μν p^μ u^ν_gas)
```

For a distant static camera, `u^μ_cam ≈ (1, 0, 0, 0)`, so `E_obs_camera = −p_t = E = 1`
(by our normalisation). The emitted energy is:

```
E_emit = −g_tt p^t u^t_gas  −  g_tφ (p^t u^φ_gas + p^φ u^t_gas)  −  g_φφ p^φ u^φ_gas
```

where `p^t` and `p^φ` at the disk crossing point are recovered from the constants of
motion:

```
p^t  =  (1/Σ) · [−a(a sin²θ − b) + (r²+a²)/Δ · (r²+a² − a·b)]   (= dt/dλ · Σ)
p^φ  =  (1/Σ) · [−(a − b/sin²θ) + a/Δ · (r²+a² − a·b)]           (= dφ/dλ · Σ)
```

at `θ = π/2`, `Σ = r²`.

Then:

```
g_factor = 1 / E_emit         (since E_obs = 1 by normalisation)
```

### 6.3 Applying the frequency shift

The observed frequency is `ν_obs = g_factor · ν_emit`.

The full relativistic beaming causes both a **color shift** and a **brightness
change**. The observed specific intensity scales as:

```
I_obs(ν_obs) = g_factor⁴ · I_emit(ν_emit)
```

The `g⁴` factor combines:

- `g` from the frequency shift (photon energy)
- `g` from the rate of photon arrival (time dilation)
- `g²` from relativistic aberration (solid angle compression)

### 6.4 Disk temperature and blackbody color

The disk temperature as a function of radius follows the standard thin-disk profile
(Shakura-Sunyaev):

```
T(r) = T_max · (r_ISCO / r)^{3/4} · √(1 − √(r_ISCO / r))
```

`T_max` is a free parameter controlling the overall color. For a visually appealing
result matching Interstellar's warm tones, set `T_max ≈ 7000 K` (cooler than physical
reality, which peaks in X-rays for stellar-mass black holes).

Approximate the blackbody color in RGB using Planck's law integrated against the
CIE color matching functions. A fast approximation (Kang, Moon 2002) gives sRGB
from temperature in Kelvin:

```
if 1000 ≤ T ≤ 6600:
    R = 1.0
    G = 0.390 * log(T) − 0.631
    B = max(0, 1.292 * log(T − 1900) − 1.533)
else:  # T > 6600
    R = 329.7 * (T − 60)^{−0.133}  / 255
    G = 288.1 * T^{−0.0755}         / 255
    B = 1.0
```

(These are rough fits; a more accurate approach precomputes a 1D lookup table from
a proper blackbody integration.)

The final disk pixel color is:

```
T_obs   = T(r_hit) * g_factor             // blueshifted/redshifted temperature
color   = blackbody_to_RGB(T_obs)
brightness = g_factor^4 * base_brightness(r_hit)
pixel_color = color * brightness
```

-----

## 7. Skybox Sample at Escape

When a ray escapes (`r > r_max`), the ray's direction in Boyer-Lindquist coordinates
at the escape point must be converted to a Cartesian direction for sampling an
environment map (starfield texture, HDRI, etc.).

Convert the final `(r, θ, φ)` position and the ray's current `(dr, dθ, dφ)` velocity
components to a Cartesian unit vector:

```python
def BL_to_cartesian_direction(r, theta, phi, dr, dtheta, dphi):
    # Cartesian components of the position
    x = r * sin(theta) * cos(phi)
    y = r * sin(theta) * sin(phi)
    z = r * cos(theta)

    # Jacobian of (x,y,z) w.r.t. (r, θ, φ):
    dx = (sin(theta)*cos(phi)*dr + r*cos(theta)*cos(phi)*dtheta
           - r*sin(theta)*sin(phi)*dphi)
    dy = (sin(theta)*sin(phi)*dr + r*cos(theta)*sin(phi)*dtheta
           + r*sin(theta)*cos(phi)*dphi)
    dz = (cos(theta)*dr - r*sin(theta)*dtheta)

    return normalize([dx, dy, dz])
```

Sample the environment map at this direction to get the background star/galaxy color.

-----

## 8. Full Per-Pixel Algorithm

```python
def trace_pixel(i, j, camera, M, a, disk_params, max_steps=1000):
    # Step 1: Generate ray
    b, q2, r, theta, phi, t, sr, stheta = camera_ray(i, j, camera, M, a)

    h = 0.5   # initial step size

    for step in range(max_steps):
        # Adaptive step
        r_hor  = M + sqrt(M*M - a*a)
        h_step = h * min(1.0, (r - r_hor) / max(r, 1e-6))
        h_step = max(h_step, 0.01)

        # Save previous theta for disk crossing detection
        theta_prev = theta

        # RK4 step
        r, theta, phi, t = rk4_step(r, theta, phi, t, sr, stheta, b, q2, M, a, h_step)

        # Check and flip signs at turning points
        R_val = compute_R(r, b, q2, M, a)
        T_val = compute_Theta(theta, b, q2, a)
        if R_val < 0:
            sr     = −sr
            r      = max(r, r_hor + 1e-4)
        if T_val < 0:
            stheta = −stheta
            theta  = clip(theta, PI/2 − PI/4, PI/2 + PI/4)  // rough clamp

        # Termination: horizon
        if r <= r_hor + 1e-4:
            return (0, 0, 0)

        # Termination: disk crossing
        r_isco = compute_ISCO(M, a)
        if (theta_prev − PI/2) * (theta − PI/2) < 0:   # sign change = crossing
            if disk_params.r_inner <= r <= disk_params.r_outer:
                return disk_color(r, phi, b, q2, M, a, disk_params)

        # Termination: escape
        if r >= 100.0 * M:
            d = BL_to_cartesian_direction(r, theta, phi,
                    sr*sqrt(max(R_val,0)) / (r*r),    # approx dr/dλ
                    stheta*sqrt(max(T_val,0)) / (r*r), # approx dθ/dλ
                    compute_dphi(r, theta, b, q2, M, a))
            return skybox_sample(d)

    # Max steps reached: treat as escaped
    return (0.01, 0.01, 0.02)   # dark blue fallback
```

-----

## 9. Physical Effects Summary

|Effect                    |Where applied            |Formula                               |
|--------------------------|-------------------------|--------------------------------------|
|Gravitational lensing     |Geodesic integration     |Carter equations                      |
|Frame dragging            |Geodesic integration     |`a ≠ 0` in `R`, `Θ`                   |
|Doppler beaming           |Disk color               |`g_factor = 1 / E_emit`               |
|Gravitational redshift    |Disk color               |Included in `g_factor`                |
|Relativistic brightness   |Disk color               |`I_obs = g⁴ · I_emit`                 |
|Accretion disk temperature|Disk color               |`T ∝ r^{−3/4}`                        |
|Photon ring               |Emergent from integration|Rays near photon orbit wind many times|

-----

## 10. Implementation Notes

### Coordinate singularity near θ = 0, π (poles)

The `b²/sin²θ` term in `Θ` diverges at the poles. In practice, restrict the disk
to `θ = π/2` and initialise cameras away from the polar axis. The `1/(sinθ)²` term
can be guarded with `max(sin²θ, ε)` for `ε ≈ 10⁻¹⁰`.

### Boyer-Lindquist coordinate singularity at Δ = 0 (horizon)

All terms `1/Δ` in the equations diverge at `r = r_+`. The adaptive step size
`h ∝ (r − r_+)` keeps the integrator away from this, but a ray aimed directly at
the horizon will slow exponentially. In practice, terminate at `r = r_+ + ε` for
some small `ε` (e.g. `0.01 M`) rather than integrating to `Δ = 0`.

### GPU parallelisation (fragment shader layout)

Each pixel maps to one shader invocation. The state `(r, θ, φ, t, sr, stheta, b, q2)`
fits in a handful of registers. The integration loop runs entirely within the shader
with no inter-thread communication. The main challenge is loop iteration count — GPU
shaders have historically had issues with long loops. Pass `max_steps` as a uniform
and set it to the minimum that produces good images (typically 300–600 steps for a
non-edge ray; edge rays near the photon sphere need more).

### Step size and accuracy

With RK4 and `h_base = 0.5 M`:

- Far-field rays (`r > 20M`) are accurate to well within a pixel for typical resolutions
- Near-field rays (`r < 5M`) require `h_base` reduced to `~0.05 M`
- The photon ring region (`r ≈ r_photon`) requires very small steps; these rays also
  take the most iterations and produce the thin bright ring just outside the shadow

The photon sphere radius for Kerr is approximately `r_photon ≈ 2M (1 + cos(2/3 arccos(±a/M)))`,
with the prograde and retrograde values bounding the range.

### Validation

A correct Kerr ray tracer should reproduce:

1. **Schwarzschild limit** (`a = 0`): circular shadow of radius `≈ 5.2 M`, symmetric ring
1. **Kerr shadow**: the shadow acquires a D-shaped asymmetry — the side rotating
   toward the observer is slightly trimmed; the retrograde side bulges
1. **Disk asymmetry**: with the camera above the equatorial plane and the disk
   rotating left-to-right, the approaching (left) side is brighter and bluer than
   the receding (right) side — matching the Interstellar render
1. **Einstein ring**: looking nearly through the black hole produces a thin ring;
   for high resolution, higher-order rings appear just inside the shadow edge

-----

## 11. Quick Reference: Key Formulas

```
Σ = r² + a²cos²θ
Δ = r² − 2Mr + a²

r_+ = M + √(M² − a²)             (outer horizon)
r_ISCO: see Section 5 formula    (inner disk edge)

// Null ray constants (E normalised to 1):
b = L                             (impact parameter)
q² = Q                            (Carter constant, must be ≥ 0)

// Potentials:
R(r)  = (r² + a² − ab)²  −  Δ [(b−a)² + q²]
Θ(θ)  = q² + cos²θ (a² − b²/sin²θ)

// Carter equations (divide RHS by Σ for dX/dλ):
Σ dr/dλ  = ±√R(r)
Σ dθ/dλ  = ±√Θ(θ)
Σ dφ/dλ  = −(a − b/sin²θ) + (a/Δ)(r² + a² − ab)
Σ dt/dλ  = −a(a sin²θ − b) + ((r²+a²)/Δ)(r² + a² − ab)

// Gas orbital velocity:
Ω = √M / (r^{3/2} + a√M)

// Frequency ratio:
g = ν_obs / ν_emit = 1 / E_emit  (see Section 6.2)

// Brightness scaling:
I_obs = g⁴ · I_emit
```
