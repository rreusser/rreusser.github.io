# Symplectic Integration of Kerr Geodesics: Implementation Reference

## 0. The Non-Separability Problem

The standard recipe for an explicit symplectic integrator (Forest–Ruth, Yoshida, leapfrog)
requires that the Hamiltonian split cleanly into two pieces, each independently integrable:

```
H = T(p) + V(q)         ← required structure for explicit splitting methods
```

The Kerr geodesic Hamiltonian does **not** satisfy this. After freezing `p_t = −E` and
`p_φ = L`, the effective Hamiltonian in the reduced phase space `(r, θ, p_r, p_θ)` is:

```
2H_eff = (Δ/Σ) p_r²  +  (1/Σ) p_θ²  +  V(r, θ)
```

The kinetic terms `(Δ/Σ) p_r²` and `(1/Σ) p_θ²` depend on the coordinates `r` and `θ`
through `Σ = r² + a²cos²θ`. Integrating the kinetic part alone produces coupled equations
in all four variables simultaneously — there is no clean drift/kick split.

**Consequence:** explicit symplectic splitting methods based on the standard `T + V`
decomposition do not apply to the Kerr Hamiltonian directly.

The method recommended here — the **4th-order Gauss–Legendre implicit Runge–Kutta
method (GL4)** — is symplectic for *any* Hamiltonian, requires no separability, and is
4th-order accurate at fixed step size. The cost is that it requires solving a nonlinear
system of equations at each step.

-----

## 1. The State Vector

All integration is performed on the reduced phase space. Since `p_t` and `p_φ` are
constants of motion, the active state vector is 4-dimensional:

```
y = (r,  θ,  p_r,  p_θ)     ∈ ℝ⁴
```

The coordinates `t(λ)` and `φ(λ)` are recovered by quadrature after each step (see
Section 5). The independent variable is the affine parameter `λ` (proper time `τ` for
massive particles).

**Hamilton's equations for the active variables**, with `E = −p_t` and `L = p_φ` frozen:

```
ṙ    = ∂H/∂p_r  =  (Δ/Σ) p_r

θ̇    = ∂H/∂p_θ  =  p_θ / Σ

ṗ_r  = −∂H/∂r   =  −½ ∂/∂r [ (Δ/Σ) p_r²  +  (1/Σ) p_θ²  +  2V(r, θ) ]

ṗ_θ  = −∂H/∂θ   =  −½ ∂/∂θ [ (Δ/Σ) p_r²  +  (1/Σ) p_θ²  +  2V(r, θ) ]
```

where `V(r, θ)` is the part of `2H` that depends only on coordinates (not on `p_r, p_θ`):

```
2V(r,θ) = g^{tt} E²  −  2 g^{tφ} E L  +  g^{φφ} L²
         = −[(r²+a²)² − a²Δsin²θ] E² / (ΣΔ)
           + 4MarEL / (ΣΔ)
           + (Δ − a²sin²θ) L² / (ΣΔ sin²θ)
```

Write the system compactly as:

```
ẏ = f(y)     where  f : ℝ⁴ → ℝ⁴
```

The function `f` is fully determined by the expressions above.

-----

## 2. The GL4 Method: Overview

The **2-stage, 4th-order Gauss–Legendre implicit Runge–Kutta method** (GL4) is a
collocation method based on Gauss–Legendre quadrature. It is symplectic for all
Hamiltonian systems (the symplecticity condition `b_i a_{ij} + b_j a_{ji} = b_i b_j`
is satisfied by the GL tableau). It is also self-adjoint (time-reversible) and A-stable.

-----

## 3. The Butcher Tableau

Define the constants:

```
α = √3 / 6
```

The GL4 Butcher tableau is:

```
       c₁  |  a₁₁      a₁₂
       c₂  |  a₂₁      a₂₂
       ─────┼──────────────────
            |  b₁       b₂
```

With exact values:

```
c₁ = 1/2 − α  =  1/2 − √3/6
c₂ = 1/2 + α  =  1/2 + √3/6

a₁₁ =  1/4               a₁₂ =  1/4 − α  =  1/4 − √3/6
a₂₁ =  1/4 + α  =  1/4 + √3/6   a₂₂ =  1/4

b₁  =  1/2
b₂  =  1/2
```

Numerical values:

```
α   ≈  0.28867513459481287
c₁  ≈  0.21132486540518713
c₂  ≈  0.78867513459481287

a₁₁ =  0.25               a₁₂ ≈ −0.038675134594812866
a₂₁ ≈  0.538675134594813  a₂₂ =  0.25

b₁  =  0.5
b₂  =  0.5
```

-----

## 4. One Integration Step

Given state `yₙ` at parameter `λₙ`, advance by step `h` to `yₙ₊₁` at `λₙ + h`.

### 4.1 Stage Equations

Compute two internal stage vectors `k₁, k₂ ∈ ℝ⁴` satisfying the coupled nonlinear
system:

```
k₁ = f( yₙ + h (a₁₁ k₁ + a₁₂ k₂) )
k₂ = f( yₙ + h (a₂₁ k₁ + a₂₂ k₂) )
```

Define the stage evaluation points:

```
Y₁ = yₙ + h (a₁₁ k₁ + a₁₂ k₂)       ← approximates y at λₙ + c₁ h
Y₂ = yₙ + h (a₂₁ k₁ + a₂₂ k₂)       ← approximates y at λₙ + c₂ h
```

so the stage equations are:

```
k₁ = f(Y₁)
k₂ = f(Y₂)
```

This is a system of `2 × 4 = 8` coupled nonlinear scalar equations in the 8 unknowns
`(k₁, k₂)`, or equivalently in `(Y₁, Y₂)`.

### 4.2 State Update

Once `k₁` and `k₂` are found:

```
yₙ₊₁ = yₙ + h (b₁ k₁ + b₂ k₂)
      = yₙ + (h/2) (k₁ + k₂)
```

-----

## 5. Solving the Stage Equations: Newton's Method

The stage equations form a root-finding problem. Define the residual vector
`F : ℝ⁸ → ℝ⁸` over the unknowns `z = (Y₁, Y₂)`:

```
F(z) = | Y₁ − yₙ − h (a₁₁ f(Y₁) + a₁₂ f(Y₂)) |  =  0
       | Y₂ − yₙ − h (a₂₁ f(Y₁) + a₂₂ f(Y₂)) |
```

Apply Newton iteration: starting from initial guess `z⁰`, iterate:

```
J(zᵐ) · δzᵐ = −F(zᵐ)
zᵐ⁺¹ = zᵐ + δzᵐ
```

until `‖F(zᵐ)‖ < ε` (typically `ε ≈ 10⁻¹²` in double precision).

### 5.1 The Jacobian

The Jacobian `J ∈ ℝ⁸ˣ⁸` of `F` with respect to `z = (Y₁, Y₂)` is:

```
J = I₈  −  h · | a₁₁ J_f(Y₁)    a₁₂ J_f(Y₂) |
               | a₂₁ J_f(Y₁)    a₂₂ J_f(Y₂) |
```

where `J_f(Y) ∈ ℝ⁴ˣ⁴` is the Jacobian of `f` at state `Y`.

**Practical approach for `J_f`:** Use numerical finite differences:

```
[J_f(Y)]_ij ≈ ( f_i(Y + ε eⱼ) − f_i(Y − ε eⱼ) ) / (2ε)
```

with `ε ≈ 10⁻⁷`.

### 5.2 Initial Guess for Newton Iteration

**Option C (previous step extrapolation):** After the first step, use the converged
`(Y₁, Y₂)` from the previous step as the initial guess for the current step. With smooth
geodesics this converges in 2–3 Newton iterations.

### 5.3 Convergence Criterion

Terminate when:

```
max( ‖Y₁ᵐ⁺¹ − Y₁ᵐ‖ , ‖Y₂ᵐ⁺¹ − Y₂ᵐ‖ ) < ε_Newton
```

Typical: `ε_Newton = 10⁻¹²`.

-----

## 6. Updating t and φ

After each step from `λₙ` to `λₙ₊₁ = λₙ + h`, update the coordinates `t` and `φ` using
the same GL4 quadrature rule:

```
tₙ₊₁  =  tₙ   +  h (b₁ ṫ(Y₁) + b₂ ṫ(Y₂))
φₙ₊₁  =  φₙ   +  h (b₁ φ̇(Y₁) + b₂ φ̇(Y₂))
```

where the velocities at stage points are:

```
ṫ(Y)  = [(r²+a²)² − a²Δsin²θ] E / (ΣΔ)  −  2MarL / (ΣΔ)

φ̇(Y)  = 2MarE / (ΣΔ)  +  (Δ − a²sin²θ) L / (ΣΔ sin²θ)
```

-----

## 7. Full Step Algorithm

```
Input:  yₙ = (r, θ, p_r, p_θ),  tₙ,  φₙ,  h,  E,  L,  κ,  M,  a
Output: yₙ₊₁, tₙ₊₁, φₙ₊₁

1. Set initial guess: Y₁ ← yₙ,  Y₂ ← yₙ

2. Newton loop (max 20 iterations):
   a. Evaluate:  k₁ ← f(Y₁),  k₂ ← f(Y₂)
   b. Compute residuals:
        F₁ ← Y₁ − yₙ − h (a₁₁ k₁ + a₁₂ k₂)
        F₂ ← Y₂ − yₙ − h (a₂₁ k₁ + a₂₂ k₂)
   c. Check convergence: if max(‖F₁‖, ‖F₂‖) < ε_Newton, break
   d. Compute Jacobian: J_f at Y₁ and Y₂  (analytic or finite difference)
   e. Assemble 8×8 system:
        J = I₈ − h · block([[a₁₁ J_f(Y₁), a₁₂ J_f(Y₂)],
                             [a₂₁ J_f(Y₁), a₂₂ J_f(Y₂)]])
   f. Solve: J · [δY₁; δY₂] = −[F₁; F₂]
   g. Update: Y₁ ← Y₁ + δY₁,  Y₂ ← Y₂ + δY₂

3. State update:
        yₙ₊₁ ← yₙ + (h/2)(k₁ + k₂)

4. Coordinate update:
        tₙ₊₁ ← tₙ + (h/2)(ṫ(Y₁) + ṫ(Y₂))
        φₙ₊₁ ← φₙ + (h/2)(φ̇(Y₁) + φ̇(Y₂))
```

-----

## 8. Conservation Checks

|Quantity|Expression                         |Expected value                          |
|--------|-----------------------------------|----------------------------------------|
|`H`     |`½ g^{μν} pμ pν`                   |`−κ/2`                                  |
|`E`     |`−pt`                              |constant (exact by construction)        |
|`L`     |`pφ`                               |constant (exact by construction)        |
|`Q`     |`pθ² + cos²θ [a²(κ−E²) − L²/sin²θ]`|constant (drifts with integration error)|

GL4 exactly conserves a *modified* Hamiltonian `H̃` that is `O(h⁴)` close to `H`. The
true `H` therefore oscillates but does not drift. `Q` is not automatically conserved
by GL4; its drift is a useful independent measure of accumulated error.

-----

## 9. Summary of Required Analytic Inputs

### f: the right-hand side of Hamilton's equations

```
Σ = r² + a² cos²θ
Δ = r² − 2Mr + a²

f₁ = ṙ     = (Δ/Σ) p_r

f₂ = θ̇     = p_θ / Σ

f₃ = ṗ_r   = −∂H/∂r
             = (Δ_r Σ − Δ Σ_r)/(2Σ²) p_r²
               + Σ_r/(2Σ²) p_θ²
               − ∂V/∂r

f₄ = ṗ_θ   = −∂H/∂θ
             = Δ Σ_θ/(2Σ²) p_r²
               + Σ_θ/(2Σ²) p_θ²
               − ∂V/∂θ
```

where:

```
Σ_r = 2r
Σ_θ = −2a² sinθ cosθ
Δ_r = 2r − 2M
```

### ṫ and φ̇: for coordinate quadrature

```
ṫ   = [(r²+a²)² − a²Δsin²θ] E / (ΣΔ)  −  2MarL / (ΣΔ)

φ̇   = 2MarE / (ΣΔ)  +  (Δ − a²sin²θ) L / (ΣΔ sin²θ)
```

### H: for conservation monitoring

```
2H = (Δ/Σ) p_r²  +  (1/Σ) p_θ²  +  2V(r, θ)
```

-----

## 10. Quick Reference: GL4 Constants

```
α   = √3 / 6

c₁  = 1/2 − α
c₂  = 1/2 + α

a₁₁ = 1/4           a₁₂ = 1/4 − α
a₂₁ = 1/4 + α       a₂₂ = 1/4

b₁  = 1/2
b₂  = 1/2
```
