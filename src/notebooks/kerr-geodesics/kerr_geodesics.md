# Kerr Geodesic Integration: Implementation Reference

## Conventions

- Units: `G = c = 1` (geometrized)
- Signature: `(−, +, +, +)`
- Coordinates: Boyer–Lindquist `(t, r, θ, φ)`
- Affine parameter: `λ` (equals proper time `τ` for massive particles)
- Overdot: `ẋ ≡ dx/dλ`

---

## 1. Metric and Structural Functions

Two functions appear throughout every equation:

```
Σ(r, θ) = r² + a²cos²θ
Δ(r)    = r² − 2Mr + a²
```

The **covariant metric** `g_{μν}` (line element):

```
ds² = −(1 − 2Mr/Σ) dt²
      − (4Mar sin²θ / Σ) dt dφ
      + (Σ/Δ) dr²
      + Σ dθ²
      + (r² + a² + 2Ma²r sin²θ / Σ) sin²θ dφ²
```

The **contravariant metric** `g^{μν}` (needed for the Hamiltonian):

```
g^{tt}  = −[(r² + a²)² − a²Δ sin²θ] / (ΣΔ)
g^{tφ}  = g^{φt} = −2Mar / (ΣΔ)
g^{rr}  = Δ / Σ
g^{θθ}  = 1 / Σ
g^{φφ}  = (Δ − a² sin²θ) / (ΣΔ sin²θ)
```

All off-diagonal components not listed are zero.

**Horizon locations** (coordinate singularities, not physical):

```
r± = M ± √(M² − a²)
```

The outer horizon is at `r₊`. Geodesic integration in Boyer–Lindquist coordinates becomes ill-conditioned near `r = r₊` because `Δ → 0`.

---

## 2. Parameters and Constants of Motion

### Black Hole Parameters

| Symbol | Meaning | Constraint |
|--------|---------|------------|
| `M` | Black hole mass | `M > 0` |
| `a` | Spin parameter `J/M` | `0 ≤ a ≤ M` |

`a = 0` recovers the Schwarzschild metric. `a = M` is the extremal Kerr limit.

### Geodesic Type

| Symbol | Value | Geodesic type |
|--------|-------|---------------|
| `κ` | `1` | Timelike (massive particle) |
| `κ` | `0` | Null (photon / massless) |

### Four Constants of Motion

Every geodesic is uniquely characterized by four constants. Given initial position
`(r₀, θ₀)` and initial covariant four-momentum `(p_t, p_r, p_θ, p_φ)` at `λ = 0`:

| Constant | Formula | Physical meaning |
|----------|---------|-----------------|
| `E` | `−p_t` | Specific energy at infinity |
| `L` | `p_φ` | Specific axial angular momentum |
| `Q` | `p_θ² + cos²θ₀ [a²(κ − E²) − L²/sin²θ₀]` | Carter constant |
| `κ` | `−g_{μν} ẋᵘ ẋᵛ` | Fixed by particle type |

The Carter constant `Q` satisfies `Q ≥ 0` for all bound non-equatorial orbits. `Q = 0`
is the equatorial plane; `Q > 0` implies oscillation above and below it.

**Computing `p_μ` from initial four-velocity `uᵘ`:**

```
p_t = g_{tt} u^t + g_{tφ} u^φ  =  −(1 − 2Mr₀/Σ₀) u^t − (2Mar₀ sin²θ₀ / Σ₀) u^φ
p_r = g_{rr} u^r               =  (Σ₀/Δ₀) u^r
p_θ = g_{θθ} u^θ               =  Σ₀ u^θ
p_φ = g_{tφ} u^t + g_{φφ} u^φ =  −(2Mar₀ sin²θ₀ / Σ₀) u^t
                                   + (r₀² + a² + 2Ma²r₀ sin²θ₀/Σ₀) sin²θ₀ u^φ
```

---

## 3. The Geodesic Hamiltonian

The **super-Hamiltonian** is:

```
H = ½ g^{μν} p_μ p_ν
```

Expanded:

```
2H = g^{tt} p_t² + 2 g^{tφ} p_t p_φ + g^{rr} p_r² + g^{θθ} p_θ² + g^{φφ} p_φ²
```

This equals `−κ/2` and is conserved along every geodesic.

Substituting the explicit components and `p_t = −E`, `p_φ = L`:

```
2H = −[(r²+a²)² − a²Δsin²θ] E² / (ΣΔ)
     + 4MarEL / (ΣΔ)
     + (Δ/Σ) p_r²
     + (1/Σ) p_θ²
     + (Δ − a²sin²θ) L² / (ΣΔ sin²θ)
```

---

## 4. Hamilton's Equations (Hamiltonian Approach to Integration)

The equations of motion are:

```
ẋᵅ = +∂H/∂pᵅ
ṗᵅ = −∂H/∂xᵅ
```

**Explicitly for each coordinate:**

```
ṫ  = −g^{tt} E − g^{tφ} L
   = [(r²+a²)² − a²Δsin²θ] E / (ΣΔ)  −  2MarL / (ΣΔ)

φ̇  = −g^{tφ} E + g^{φφ} L
   = 2MarE / (ΣΔ)  +  (Δ − a²sin²θ) L / (ΣΔ sin²θ)

ṙ  = g^{rr} p_r = (Δ/Σ) p_r

θ̇  = g^{θθ} p_θ = p_θ / Σ
```

```
ṗ_t = 0     →  p_t = −E = const
ṗ_φ = 0     →  p_φ = +L = const

ṗ_r = −∂H/∂r    (evaluate numerically from g^{μν} and its r-derivative)
ṗ_θ = −∂H/∂θ    (evaluate numerically from g^{μν} and its θ-derivative)
```

**State vector for integration** (8-dimensional, with 2 trivially constant):

```
y = (t, r, θ, φ, p_r, p_θ)     [p_t and p_φ are constants, not integrated]
```

**Derivatives of the Hamiltonian** required for `ṗ_r` and `ṗ_θ` can be computed by
differentiating the explicit `2H` expression above with respect to `r` and `θ`.
Alternatively — and more robustly — compute `H(r + ε, θ, p_r, p_θ)` and
`H(r, θ + ε, p_r, p_θ)` numerically with finite differences.

**Suitable integrators:** The Hamiltonian system is ideal for symplectic integrators
(leapfrog / Störmer–Verlet, symplectic partitioned Runge–Kutta). These preserve the
symplectic structure and prevent secular drift in `H` over long integrations.

---

## 5. The Carter Equations (Separated First-Order System)

Carter's separation of the Hamilton–Jacobi equation produces four first-order ODEs
in which the `r` and `θ` motions are governed by independent potential functions.

### Radial and Polar Potentials

```
R(r) = [E(r² + a²) − aL]²  −  Δ [κr² + (L − aE)² + Q]
```

```
Θ(θ) = Q  −  cos²θ · [a²κ − (L/sinθ)² + a²E²·... ]
```

A clean equivalent form of `Θ`:

```
Θ(θ) = Q + a²(E² − κ) cos²θ − L² cot²θ
```

Both `R(r) ≥ 0` and `Θ(θ) ≥ 0` are required for physical motion. The **turning points**
in `r` occur where `R(r) = 0`, and in `θ` where `Θ(θ) = 0`.

### The Four Carter Equations (in affine parameter `λ`)

```
Σ · dr/dλ  = ±√R(r)
Σ · dθ/dλ  = ±√Θ(θ)
Σ · dφ/dλ  = −(aE − L/sin²θ)  +  (a/Δ) [E(r² + a²) − aL]
Σ · dt/dλ  = −a(aE sin²θ − L)  +  [(r²+a²)/Δ] [E(r² + a²) − aL]
```

The `±` signs are chosen independently for `r` and `θ` and **flip at each turning point**.

---

## 6. Mino Time (Fully Decoupled System)

Define Mino time `σ` by:

```
dσ = dλ / Σ(r, θ)     ↔     dλ = Σ dσ
```

The Carter equations in Mino time become:

```
dr/dσ  = ±√R(r)
dθ/dσ  = ±√Θ(θ)
dφ/dσ  = −(aE − L/sin²θ)  +  (a/Δ) [E(r² + a²) − aL]
dt/dσ  = −a(aE sin²θ − L)  +  [(r²+a²)/Δ] [E(r² + a²) − aL]
```

The `r` and `θ` equations are now **fully decoupled**: `r(σ)` depends only on `r`, and
`θ(σ)` depends only on `θ`. The `t` and `φ` equations are quadratures once `r(σ)` and
`θ(σ)` are known.

**Recovering affine parameter / proper time:** Integrate simultaneously:

```
dλ/dσ = Σ(r(σ), θ(σ)) = r(σ)² + a² cos²θ(σ)
```

---

## 7. Integration Procedure

### Step 1: Specify Initial Conditions

Provide:
- Black hole parameters: `M`, `a`
- Geodesic type: `κ`
- Initial position: `r₀`, `θ₀`, `φ₀`, `t₀`
- Initial four-velocity or four-momentum: `uᵘ` or `pᵘ`

### Step 2: Compute Constants of Motion

```
E = −p_t = −(g_{tt} u^t + g_{tφ} u^φ)
L =  p_φ  =  (g_{tφ} u^t + g_{φφ} u^φ)
p_r₀ = (Σ₀/Δ₀) u^r
p_θ₀ = Σ₀ u^θ
Q = p_θ₀² + cos²θ₀ · [a²(κ − E²) − L²/sin²θ₀]
```

Verify: `−g_{μν} u^μ u^ν = κ` (normalization check).

### Step 3: Determine Initial Signs

For `dr/dσ = ±√R` and `dθ/dσ = ±√Θ`, the initial signs are:

```
sign_r = sign(u^r) = sign(p_r₀)
sign_θ = sign(u^θ) = sign(p_θ₀)
```

### Step 4: Integrate

**Option A — Hamiltonian with symplectic integrator:**

Integrate `y = (t, r, θ, φ, p_r, p_θ)` using Hamilton's equations. Standard ODE
integrators work but a symplectic scheme is strongly preferred.

**Option B — Carter equations in Mino time:**

Integrate `y = (t, r, θ, φ)` plus `λ` using the Mino-time equations. Flip `sign_r`
when `R(r) ≈ 0` with `sign_r` heading inward; flip `sign_θ` when `Θ(θ) ≈ 0`.
A robust detection method: flip when `R` (or `Θ`) changes sign between steps.

### Step 5: Monitor Conservation

At every step recompute and check:

```
E_check = [(r²+a²)² − a²Δsin²θ] ṫ / Σ − 2Mar sin²θ φ̇ / Σ     (should equal E)
L_check = −2Mar sin²θ ṫ / Σ + (r²+a²+2Ma²r sin²θ/Σ) sin²θ φ̇   (should equal L)
κ_check = −g_{μν} ẋᵘ ẋᵛ                                          (should equal κ)
H_check = ½ g^{μν} p_μ p_ν                                        (should equal −κ/2)
```

`Q` can also be recomputed from `p_θ` and used as an independent check.

---

## 8. Special Cases and Degenerate Configurations

| Condition | Consequence |
|-----------|------------|
| `a = 0` | Schwarzschild limit; all orbits are planar, `Q = L²cos²i` (orbit inclination `i`) |
| `Q = 0` | Equatorial orbit (`θ = π/2` throughout); `dθ/dλ = 0` identically |
| `θ₀ = π/2`, `u^θ = 0` | Equatorial initial conditions; use equatorial sub-system |
| `L = aE sin²θ` | Zero axial angular momentum; orbit passes through poles |
| `Δ = 0` (`r = r₊`) | Horizon; BL coordinates singular; switch to Kerr–Schild if needed |
| `Σ = 0` | Ring singularity at `r = 0`, `θ = π/2`; physical singularity |
| `E² < κ` and `Q > 0` | Bound orbit; `r` oscillates between two turning points |
| `E² ≥ κ` | Unbound or marginally bound orbit |

---

## 9. Quick Reference: All Symbols

| Symbol | Definition |
|--------|-----------|
| `M` | Black hole mass |
| `a` | Spin parameter `J/M` |
| `Σ` | `r² + a²cos²θ` |
| `Δ` | `r² − 2Mr + a²` |
| `κ` | Geodesic type: 1 (massive), 0 (null) |
| `λ` | Affine parameter (= proper time `τ` when `κ = 1`) |
| `σ` | Mino time, `dσ = dλ/Σ` |
| `E` | Conserved specific energy, `E = −p_t` |
| `L` | Conserved axial angular momentum, `L = p_φ` |
| `Q` | Carter constant |
| `R(r)` | Radial potential `[E(r²+a²) − aL]² − Δ[κr² + (L−aE)² + Q]` |
| `Θ(θ)` | Polar potential `Q + a²(E²−κ)cos²θ − L²cot²θ` |
| `r±` | Horizon radii `M ± √(M²−a²)` |
