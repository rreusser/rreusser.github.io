// Ray-traced Kerr black hole with accretion disk
// Traces null geodesics per-pixel using second-order Carter equations
// in affine parameter. State is (r, vr, θ, vθ, φ) where vr and vθ are
// Mino-time velocities (±√R, ±√Θ). Dividing by Σ converts to affine
// time, bounding velocities at large r without explicit velocity scaling.
// Velocities pass smoothly through zero at turning points — no sign
// tracking needed. This avoids the stalling issue where first-order
// sign-tracking with √max(Θ,0) freezes the integrator at θ turning points.

export const rayTracerShaderCode = /* wgsl */`

const PI: f32 = 3.14159265358979323846;


struct Uniforms {
  invProjView: mat4x4f,
  eye: vec4f,
  params: vec4f,       // a, M, rISCO, diskOuter
  resolution: vec4f,   // width, height, maxSteps, stepSize
  flags: vec4f,        // showStars, renderScale, diskTime, debugDisk
  flags2: vec4f,       // doppler, unused, unused, unused
};

@group(0) @binding(0) var<uniform> u: Uniforms;

// ============================================================
// Coordinate transforms
// ============================================================

fn cartesianToBL(pos: vec3f, a: f32) -> vec3f {
  let R2 = dot(pos, pos);
  let a2 = a * a;
  let y = pos.y;
  let b = R2 - a2;
  let r2 = 0.5 * (b + sqrt(b * b + 4.0 * a2 * y * y));
  let r = sqrt(max(r2, 1e-20));
  let theta = acos(clamp(y / r, -1.0, 1.0));
  let phi = atan2(pos.z, pos.x);
  return vec3f(r, theta, phi);
}

fn blJacobian(r: f32, theta: f32, phi: f32, a: f32) -> mat3x3f {
  let rho = sqrt(r * r + a * a);
  let sth = sin(theta);
  let cth = cos(theta);
  let sphi = sin(phi);
  let cphi = cos(phi);
  let r_over_rho = r / rho;

  // Columns: d/dr, d/dtheta, d/dphi
  return mat3x3f(
    vec3f(r_over_rho * sth * cphi, cth, r_over_rho * sth * sphi),
    vec3f(rho * cth * cphi, -r * sth, rho * cth * sphi),
    vec3f(-rho * sth * sphi, 0.0, rho * sth * cphi),
  );
}

fn mat3Inverse(m: mat3x3f) -> mat3x3f {
  let c0 = m[0]; let c1 = m[1]; let c2 = m[2];
  let r0 = cross(c1, c2);
  let r1 = cross(c2, c0);
  let r2 = cross(c0, c1);
  let invDet = 1.0 / dot(c0, r0);
  return transpose(mat3x3f(r0 * invDet, r1 * invDet, r2 * invDet));
}

// ============================================================
// Kerr metric
// ============================================================

struct Metric {
  gtt: f32,
  gtphi: f32,
  grr: f32,
  gthth: f32,
  gphiphi: f32,
  Delta: f32,
  Sigma: f32,
};

fn kerrMetric(r: f32, theta: f32, M: f32, a: f32) -> Metric {
  let r2 = r * r;
  let a2 = a * a;
  let sth = sin(theta);
  let cth = cos(theta);
  let sin2 = sth * sth;
  let cos2 = cth * cth;
  let Sigma = r2 + a2 * cos2;
  let Delta = r2 - 2.0 * M * r + a2;
  let A = (r2 + a2) * (r2 + a2) - a2 * Delta * sin2;

  var m: Metric;
  m.gtt = -(1.0 - 2.0 * M * r / Sigma);
  m.gtphi = -2.0 * M * a * r * sin2 / Sigma;
  m.grr = Sigma / Delta;
  m.gthth = Sigma;
  m.gphiphi = A * sin2 / Sigma;
  m.Delta = Delta;
  m.Sigma = Sigma;
  return m;
}

// ============================================================
// Camera ray → conserved quantities and initial velocities
// ============================================================

struct RayParams {
  E: f32,
  L: f32,
  Q: f32,
  vr: f32,
  vth: f32,
  r0: f32,
  theta0: f32,
  phi0: f32,
  valid: bool,
};

fn computeRayParams(rayDir: vec3f, a: f32, M: f32) -> RayParams {
  var p: RayParams;
  p.valid = false;

  // Camera position in BL
  let bl = cartesianToBL(u.eye.xyz, a);
  p.r0 = bl.x;
  p.theta0 = bl.y;
  p.phi0 = bl.z;

  // Convert Cartesian ray direction to BL spatial velocity
  let J = blJacobian(p.r0, p.theta0, p.phi0, a);
  let Jinv = mat3Inverse(J);
  let blVel = Jinv * rayDir;  // (u^r, u^theta, u^phi) direction

  // Metric at camera position
  let g = kerrMetric(p.r0, p.theta0, M, a);

  // Null condition: g_tt ut² + 2 g_tphi ut uphi + spatial = 0
  let spatial = g.grr * blVel.x * blVel.x + g.gthth * blVel.y * blVel.y + g.gphiphi * blVel.z * blVel.z;
  let A_coeff = g.gtt;
  let B_coeff = 2.0 * g.gtphi * blVel.z;
  let C_coeff = spatial;

  let disc = B_coeff * B_coeff - 4.0 * A_coeff * C_coeff;
  if (disc < 0.0) { return p; }

  let sqrtDisc = sqrt(disc);
  let ut1 = (-B_coeff + sqrtDisc) / (2.0 * A_coeff);
  let ut2 = (-B_coeff - sqrtDisc) / (2.0 * A_coeff);
  let ut = select(ut2, ut1, ut1 > 0.0);
  if (ut <= 0.0) { return p; }

  // Conserved quantities
  let pt = g.gtt * ut + g.gtphi * blVel.z;
  let pphi = g.gtphi * ut + g.gphiphi * blVel.z;
  let rawE = -pt;
  let rawL = pphi;

  // Normalize so E = 1
  p.E = 1.0;
  p.L = rawL / rawE;
  let ptheta = g.gthth * blVel.y;
  let cth = cos(p.theta0);
  let sth = sin(p.theta0);
  let sin2 = max(sth * sth, 1e-10);
  let rawQ = ptheta * ptheta + cth * cth * (p.L * p.L * rawE * rawE / sin2 - a * a * rawE * rawE);
  p.Q = rawQ / (rawE * rawE);

  // Mino-time velocities from potentials
  let r2 = p.r0 * p.r0;
  let a2 = a * a;
  let P = p.E * (r2 + a2) - a * p.L;
  let LaE = p.L - a * p.E;
  let R_val = P * P - g.Delta * (LaE * LaE + p.Q);
  p.vr = sign(blVel.x) * sqrt(max(R_val, 0.0));

  let Theta_val = p.Q + a2 * cth * cth - p.L * p.L * cth * cth / sin2;
  p.vth = sign(blVel.y) * sqrt(max(Theta_val, 0.0));

  p.valid = true;
  return p;
}

// ============================================================
// Second-order equations in affine parameter (κ=0, E=1)
// ============================================================
// State: (r, vr, θ, vθ, φ) where vr = ±√R, vθ = ±√Θ (Mino-time velocities).
// Dividing by Σ converts to affine parameter, bounding all rates at large r.
// The 2nd-order accelerations R'(r)/2 and Θ'(θ)/2 push velocities smoothly
// through zero at turning points.

struct Derivs {
  dr: f32,
  dvr: f32,
  dth: f32,
  dvth: f32,
  dphi: f32,
};

fn geodesicDerivs(r: f32, vr: f32, theta: f32, vth: f32, L: f32, Q: f32, M: f32, a: f32) -> Derivs {
  let r2 = r * r;
  let a2 = a * a;
  let cth = cos(theta);
  let sth = sin(theta);
  let Sigma = r2 + a2 * cth * cth;
  let Delta = r2 - 2.0 * M * r + a2;
  let invSigma = 1.0 / Sigma;

  // Radial: dvr/dλ = R'(r)/(2Σ)
  // R(r) = P² - ΔC, P = r²+a²-aL, C = (L-a)²+Q
  let P = r2 + a2 - a * L;
  let C = (L - a) * (L - a) + Q;
  let dR_dr = 4.0 * r * P - (2.0 * r - 2.0 * M) * C;

  // Polar: dvθ/dλ = Θ'(θ)/(2Σ)
  // Θ(θ) = Q + a²cos²θ - L²cos²θ/sin²θ
  // dΘ/dθ = -2a²sinθcosθ + 2L²cosθ/sin³θ
  // Near the pole sin θ → 0 so clamp sin² and sin³ to avoid blowup in the
  // L²cosθ/sin³θ term. The Θ potential itself → Q at the pole (bounded),
  // so the clamped value just smooths the transition over a tiny solid angle.
  let sin2 = max(sth * sth, 1e-6);
  let sin3 = sin2 * max(abs(sth), 1e-6);
  let dTh_dth = -2.0 * a2 * sth * cth + 2.0 * L * L * cth / sin3;

  // Azimuthal: dφ/dλ = (aP/Δ + L/sin²θ - a) / Σ
  // L/sin²θ is singular at the poles. Near the pole, sin θ ≈ ρ (cylindrical
  // radius / r), so L/sin²θ ≈ Lφ r²/ρ² which diverges as ρ→0. Clamp it to
  // the physical limit: |L/sin²θ| ≤ |L|/sin²θ_min where sin²θ_min = 1e-4
  // (i.e. θ within ~0.01 rad of the pole). Beyond that the BL coordinate is
  // singular and we must not let it drive φ.
  let sin2_clamped = max(sin2, 1e-4);
  let Lsin2 = L / sin2_clamped;
  let dphi = a * P / max(abs(Delta), 1e-8) + Lsin2 - a;

  var d: Derivs;
  d.dr = vr * invSigma;
  d.dvr = 0.5 * dR_dr * invSigma;
  d.dth = vth * invSigma;
  d.dvth = 0.5 * dTh_dth * invSigma;
  d.dphi = dphi * invSigma;
  return d;
}

// ============================================================
// RK4 step for 5D state (r, vr, θ, vθ, φ)
// ============================================================

struct GeoState {
  r: f32,
  vr: f32,
  theta: f32,
  vth: f32,
  phi: f32,
};

fn rk4Step(s: GeoState, h: f32, L: f32, Q: f32, M: f32, a: f32) -> GeoState {
  let k1 = geodesicDerivs(s.r, s.vr, s.theta, s.vth, L, Q, M, a);
  let k2 = geodesicDerivs(
    s.r     + h * 0.5 * k1.dr,
    s.vr    + h * 0.5 * k1.dvr,
    s.theta + h * 0.5 * k1.dth,
    s.vth   + h * 0.5 * k1.dvth,
    L, Q, M, a
  );
  let k3 = geodesicDerivs(
    s.r     + h * 0.5 * k2.dr,
    s.vr    + h * 0.5 * k2.dvr,
    s.theta + h * 0.5 * k2.dth,
    s.vth   + h * 0.5 * k2.dvth,
    L, Q, M, a
  );
  let k4 = geodesicDerivs(
    s.r     + h * k3.dr,
    s.vr    + h * k3.dvr,
    s.theta + h * k3.dth,
    s.vth   + h * k3.dvth,
    L, Q, M, a
  );

  var out: GeoState;
  out.r     = s.r     + h / 6.0 * (k1.dr   + 2.0 * k2.dr   + 2.0 * k3.dr   + k4.dr);
  out.vr    = s.vr    + h / 6.0 * (k1.dvr  + 2.0 * k2.dvr  + 2.0 * k3.dvr  + k4.dvr);
  out.theta = s.theta + h / 6.0 * (k1.dth  + 2.0 * k2.dth  + 2.0 * k3.dth  + k4.dth);
  out.vth   = s.vth   + h / 6.0 * (k1.dvth + 2.0 * k2.dvth + 2.0 * k3.dvth + k4.dvth);
  out.phi   = s.phi   + h / 6.0 * (k1.dphi + 2.0 * k2.dphi + 2.0 * k3.dphi + k4.dphi);
  return out;
}

// ============================================================
// Noise for turbulent disk structure
// ============================================================

fn hash11(p: f32) -> f32 {
  return fract(sin(p * 127.1) * 43758.5453);
}

fn valueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i + vec2f(0.0, 0.0)), hash21(i + vec2f(1.0, 0.0)), u.x),
    mix(hash21(i + vec2f(0.0, 1.0)), hash21(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

fn fbm(p: vec2f) -> f32 {
  var val = 0.0;
  var amp = 0.5;
  var pos = p;
  for (var i = 0; i < 5; i++) {
    val += amp * valueNoise(pos);
    pos *= 2.1;
    amp *= 0.5;
  }
  return val;
}

// fbm that tiles in x with period xPeriod (must be a positive integer for
// clean tiling). Each octave wraps its x coordinate at the corresponding
// scaled period so every frequency is seamless.
// fbm that tiles in x with integer period xPeriod.
// Uses lacunarity 2.0 (not 2.1) so all octave periods are xPeriod * 2^k —
// integers throughout — and valueNoise tiles cleanly at every octave.
fn fbmTileX(p: vec2f, xPeriod: f32) -> f32 {
  var val = 0.0;
  var amp = 0.5;
  var pos = p;
  var period = xPeriod;
  for (var i = 0; i < 5; i++) {
    let px = pos.x - period * floor(pos.x / period);
    val += amp * valueNoise(vec2f(px, pos.y));
    pos    *= 2.0;
    period *= 2.0;
    amp    *= 0.5;
  }
  return val;
}

// ============================================================
// Accretion disk
// ============================================================

// diskColorAt: disk color for a given phi offset (used for animation crossfade).
// phiOffset is subtracted from phi before noise sampling — animates the pattern.
fn diskColorAt(r: f32, phi: f32, phiOffset: f32, E: f32, L: f32, M: f32, a: f32) -> vec4f {
  let rISCO = u.params.z;
  let rOuter = u.params.w;

  if (r < rISCO * 0.99 || r > rOuter) { return vec4f(0.0); }

  // Subtract phiOffset to rotate the noise pattern (simulates disk rotation).
  // Use sin/cos so the result is periodic regardless of accumulated phi.
  let sPhi = sin(phi - phiOffset);
  let cPhi = cos(phi - phiOffset);

  // DEBUG mode: unique hue per phi sector + alternating radial rings.
  // Any integration error shows as a wrong-colored region.
  if (u.flags.w > 0.5) {
    let phiNorm = (atan2(sPhi, cPhi) + PI) / (2.0 * PI);  // [0,1)
    let sector  = floor(phiNorm * 12.0);
    let value   = select(0.55, 1.0, fract(r) < 0.5);
    let h6      = sector / 2.0;
    let c       = value;
    let x       = value * (1.0 - abs(h6 % 2.0 - 1.0));
    var rgb: vec3f;
    if      (h6 < 1.0) { rgb = vec3f(c, x, 0.0); }
    else if (h6 < 2.0) { rgb = vec3f(x, c, 0.0); }
    else if (h6 < 3.0) { rgb = vec3f(0.0, c, x); }
    else if (h6 < 4.0) { rgb = vec3f(0.0, x, c); }
    else if (h6 < 5.0) { rgb = vec3f(x, 0.0, c); }
    else               { rgb = vec3f(c, 0.0, x); }
    return vec4f(rgb, 1.0);
  }

  // Real disk: spatially varying density using sines/cosines in phi and r.
  // sPhi = sin(phi), cPhi = cos(phi) — periodic by construction, no seam.
  // Combine multiple harmonics for turbulent structure.
  let logR = log(r);

  // Two fbm samples with seams at opposite azimuths, blended to hide both.
  // Sample A: seam at φ=0 and φ=π  (uses atan2, branch cut at ±π)
  // Sample B: seam rotated 90°     (uses atan2(sPhi+cPhi...) — shift φ by π/2,
  //   i.e. replace (s,c) with (c,-s) so atan2(c,-s) = π/2 - φ, branch cut at φ=±π/2)
  // Blend weight: wA = sin²φ  (zero at φ=0,π where A's seam is)
  //               wB = cos²φ  (zero at φ=±π/2 where B's seam is)
  // Since wA + wB = 1 this is a perfect partition-of-unity blend.
  let phiA = atan2(sPhi, cPhi);          // [-π, π], seam at ±π
  let phiB = atan2(cPhi, -sPhi);         // = π/2 - φ, seam at φ = ±π/2

  let noiseA = vec2f(phiA * 3.5, logR * 8.0);
  let noiseB = vec2f(phiB * 3.5, logR * 8.0);

  let turbA = fbm(noiseA + vec2f(3.7, 1.2));
  let wispsA = fbm(noiseA * 2.5 + vec2f(17.3, 5.1));
  let detailA = fbm(noiseA * 6.0 + vec2f(5.9, 8.3));

  let turbB = fbm(noiseB + vec2f(3.7, 1.2));
  let wispsB = fbm(noiseB * 2.5 + vec2f(17.3, 5.1));
  let detailB = fbm(noiseB * 6.0 + vec2f(5.9, 8.3));

  let wA = sPhi * sPhi;
  let wB = cPhi * cPhi;

  let turbulence = (wA * turbA   + wB * turbB);
  let wisps      = (wA * wispsA  + wB * wispsB);
  let detail     = (wA * detailA + wB * detailB);

  let bands   = 0.5 + 0.5 * sin(logR * 12.0 + turbulence * 2.5);
  let density = pow((0.1 + 0.7 * turbulence + 0.35 * wisps * wisps + 0.15 * detail) * (0.7 + 0.3 * bands), 1.4);

  // Redshift factor
  let sqrtM = sqrt(M);
  let r15   = r * sqrt(r);
  let Omega = -(sqrtM / (r15 + a * sqrtM));
  let denom = 1.0 - 3.0 * M / r + 2.0 * a * sqrtM / r15;
  let ut_em = select(10.0, 1.0 / sqrt(denom), denom > 0.01);
  // When Doppler is disabled, set g=1 (no beaming, symmetric disk)
  let g = select(1.0, 1.0 / (ut_em * (1.0 - Omega * L / E)), u.flags2.x > 0.5);

  let innerFade = smoothstep(rISCO * 0.95, rISCO * 1.1, r);
  // Outer fade starts at half the disk radius for a long, gradual taper
  let outerFade = smoothstep(rOuter, rOuter * 0.5, r);
  let fade      = innerFade * outerFade;

  let temp = pow(rISCO / r, 0.75);
  let T    = temp * clamp(abs(g), 0.3, 3.0);
  let col  = vec3f(
    min(T * 2.0, 1.0 + T * 0.3),
    T * 0.7 + T * T * 0.5,
    T * 0.3 + T * T * 0.5,
  );
  let brightness = temp * g * g * g * density;
  return vec4f(col * brightness * 4.0 * fade, fade);
}

// Two-layer crossfading disk with differential rotation.
// Each layer rotates each radius at its own Keplerian rate Omega(r) = r^{-3/2},
// producing realistic inward-winding shear. Two time offsets are kept half a
// crossfade period apart; when one layer has wound up and is fading out, the
// other resets invisibly and fades in.
fn diskColor(r: f32, phi: f32, E: f32, L: f32, M: f32, a: f32) -> vec4f {
  let diskTime = u.flags.z;
  if (diskTime == 0.0) {
    return diskColorAt(r, phi, 0.0, E, L, M, a);
  }

  // Keplerian angular velocity at this radius
  let r15 = r * sqrt(r);
  let sqrtM = sqrt(M);
  let OmegaR = sqrtM / r15;  // prograde Keplerian, always positive

  // Scale diskTime to angular units: multiply so the ISCO (~r=6) completes
  // a full rotation in a few seconds at speed=1. Omega at r=6 ≈ 0.068, so
  // a scale of 10 gives ~0.68 rad/s there — roughly one orbit per 9 seconds.
  let t = diskTime * 10.0;

  // Crossfade period T in those scaled units. One full rotation at r=6 is
  // 2π/0.068 ≈ 92 scaled units, so T=60 gives a reset roughly every orbit.
  let T = 60.0;
  let t0 = t % T;
  let t1 = (t + T * 0.5) % T;

  // Per-radius angular offset for each layer
  let offset0 = OmegaR * t0;
  let offset1 = OmegaR * t1;

  // Raised cosine crossfade: w0 = (1 - cos(2π·t0/T)) / 2, which is 0 at t0=0,
  // peaks at 1 at t0=T/2, and returns to 0 at t0=T. w1 is the exact complement,
  // so the two layers share time equally and transitions are evenly spaced.
  let w0 = 0.5 * (1.0 - cos(2.0 * PI * t0 / T));
  let w1 = 1.0 - w0;

  let c0 = diskColorAt(r, phi, offset0, E, L, M, a);
  let c1 = diskColorAt(r, phi, offset1, E, L, M, a);
  return c0 * w0 + c1 * w1;
}

// ============================================================
// Background
// ============================================================

fn hash21(p: vec2f) -> f32 {
  let h = dot(p, vec2f(127.1, 311.7));
  return fract(sin(h) * 43758.5453123);
}

fn hash22(p: vec2f) -> vec2f {
  return vec2f(
    fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453123),
    fract(sin(dot(p, vec2f(269.5, 183.3))) * 43758.5453123),
  );
}

fn starfield(dir: vec3f, pixelSize: f32) -> vec3f {
  let theta = acos(clamp(dir.y, -1.0, 1.0));
  let phi = atan2(dir.z, dir.x);
  let gridScale = 80.0;
  let uv = vec2f(phi * gridScale, theta * gridScale);
  let cell = floor(uv);
  let h = hash21(cell);
  if (h > 0.97) {
    let brightness = pow((h - 0.97) * 33.0, 1.5) * 0.8;
    // Star position within cell
    let starPos = hash22(cell + vec2f(7.0, 13.0));
    let d = length(uv - cell - starPos);
    // Scale intensity by a sharp Gaussian, width set by pixel footprint.
    // Multiply pixelSize by renderScale (flags.y) so stars stay point-like
    // at reduced resolution preview — pixelSize is proportional to 1/renderHeight,
    // so it blows up at low res; renderScale corrects it back to canvas-pixel units.
    let minRadius = gridScale * 2.0 / max(u.resolution.x, u.resolution.y);
    let radius = max(pixelSize * gridScale * u.flags.y, minRadius);
    let atten = exp(-0.5 * d * d / (radius * radius));
    // Slight color variation
    let temp = hash21(cell + vec2f(42.0, 17.0));
    let col = mix(vec3f(0.8, 0.85, 1.0), vec3f(1.0, 0.9, 0.7), temp);
    return col * brightness * atten;
  }
  return vec3f(0.0);
}

// ============================================================
// Main ray tracer
// ============================================================

fn traceRay(rayDir: vec3f, pixelSize: f32) -> vec4f {
  let a = u.params.x;
  let M = u.params.y;

  let rp = computeRayParams(rayDir, a, M);
  if (!rp.valid) { return vec4f(0.0, 0.0, 0.0, 1.0); }

  let rHorizon = M + sqrt(max(M * M - a * a, 0.0));
  // rEscape must exceed the camera radius so rays that start outside the
  // nominal escape sphere but point inward still get traced. Add a margin
  // relative to the camera distance (rp.r0) so zooming out never clips.
  let rEscape = max(rp.r0 * 1.1, max(rHorizon * 20.0, 50.0));
  let a2 = a * a;
  let L = rp.L;
  let Q = rp.Q;

  var s: GeoState;
  s.r = rp.r0;
  s.vr = rp.vr;
  s.theta = rp.theta0;
  s.vth = rp.vth;
  s.phi = rp.phi0;

  var color = vec3f(0.0);
  var accumulated: f32 = 0.0;
  var crossedPole: bool = false;

  let hBase = u.resolution.w;
  // resolution.z is max Mino time; derive step count so step size is a pure
  // quality knob that doesn't affect how far rays travel.
  let maxTime = u.resolution.z;
  let maxSteps = u32(ceil(maxTime / hBase));
  for (var step = 0u; step < maxSteps; step++) {
    let prevTheta = s.theta;
    let prevR = s.r;

    let horizonFactor = clamp((s.r - rHorizon) / s.r, 0.02, 1.0);
    let distanceFactor = max(1.0, s.r / 10.0);
    var h = hBase * horizonFactor * distanceFactor;
    // Limit step size near the poles. dθ/dλ = vθ/Σ, so the affine distance
    // to move θ by Δθ is Δθ·Σ/|vθ|. Require each step moves θ by at most
    // 10% of its current distance to the pole, keeping sub-steps well away
    // from the L/sin²θ singularity. Floor h at hBase*1e-4 to prevent freezing
    // when θ is exactly zero (which would give poleStep=0).
    // Limit step size near the poles. Two constraints:
    // 1. Don't move theta by more than 10% of its distance to the nearest pole.
    // 2. Don't move theta by more than theta itself (prevents sub-steps crossing zero).
    // Use max(poleDist, theta) so the limit near the turning point (vth~0) is
    // governed by the angular distance, not the near-zero velocity.
    // Floor at hBase*1e-4 to avoid h=0 when theta=0 exactly.
    // Limit step size near poles on two criteria:
    // 1. theta step: don't move more than 10% of poleDist per step.
    // 2. phi step: limit dphi from the L/sin²θ term to 0.1 rad per step.
    //    dphi ≈ L/sin²θ / Σ * h, so h ≤ 0.1 * Σ * sin²θ / |L|.
    // Floor at hBase*1e-4 to prevent h=0 when theta=0 exactly.
    let Sigma_cur = s.r * s.r + a2 * cos(s.theta) * cos(s.theta);
    let poleDist = min(s.theta, PI - s.theta);
    let thetaStep = 0.1 * poleDist * Sigma_cur / max(abs(s.vth), 1e-6);
    let sin2_cur = sin(s.theta) * sin(s.theta);
    let phiStep = 0.1 * Sigma_cur * sin2_cur / max(abs(L), 1e-6);
    h = max(min(h, min(thetaStep, phiStep)), hBase * 1e-4);

    s = rk4Step(s, h, L, Q, M, a);

    // φ correction on polar crossing: when the integrator lets θ overshoot
    // outside [0, π] the ray has crossed the pole. Reflect θ back and shift
    // φ by π so the Cartesian direction is continuous.
    // crossedPole gates the disk hit in *this step only* to avoid a spurious
    // disk sample at the wrong phi; it is cleared immediately after.
    crossedPole = false;
    if (s.theta < 0.0) {
      s.theta = -s.theta;
      s.vth = -s.vth;
      s.phi += PI;
      crossedPole = true;
    } else if (s.theta > PI) {
      s.theta = 2.0 * PI - s.theta;
      s.vth = -s.vth;
      s.phi += PI;
      crossedPole = true;
    }

    if (s.r < rHorizon * 1.01) {
      break;
    }

    if (s.r > rEscape && s.vr > 0.0) {
      let bl_sth = sin(s.theta);
      let rho = sqrt(s.r * s.r + a2);
      let escapeDir = normalize(vec3f(
        rho * bl_sth * cos(s.phi),
        s.r * cos(s.theta),
        rho * bl_sth * sin(s.phi),
      ));
      if (u.flags.x > 0.5) {
        color += starfield(escapeDir, pixelSize) * (1.0 - accumulated);
      }
      break;
    }

    // Check disk crossing (theta crosses π/2).
    // Skip disk hits after a pole crossing: those rays land on the far side
    // of the disk and produce a bright streak artifact along the pole axis.
    let pi2 = PI * 0.5;
    if (!crossedPole && (prevTheta - pi2) * (s.theta - pi2) < 0.0 && accumulated < 0.99) {
      let frac = (pi2 - prevTheta) / (s.theta - prevTheta);
      let crossR = prevR + frac * (s.r - prevR);
      let dc = diskColor(crossR, s.phi, rp.E, L, M, a);
      if (dc.a > 0.0) {
        let opacity = min(dc.a, 1.0 - accumulated);
        color += dc.rgb * opacity;
        accumulated += opacity;
      }
    }
  }

  return vec4f(color, 1.0);
}

// ============================================================
// Vertex/Fragment shaders
// ============================================================

@vertex fn vs(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4f {
  let x = select(-1.0, 3.0, vid == 1u);
  let y = select(-1.0, 3.0, vid == 2u);
  return vec4f(x, y, 0.0, 1.0);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let pixel = pos.xy;
  let res = u.resolution.xy;

  // Pixel → NDC
  let ndc = vec2f(
    (pixel.x + 0.5) / res.x * 2.0 - 1.0,
    -((pixel.y + 0.5) / res.y * 2.0 - 1.0),
  );

  // Unproject to world ray
  let clipNear = vec4f(ndc, 0.0, 1.0);
  let clipFar = vec4f(ndc, 1.0, 1.0);
  let wNear = u.invProjView * clipNear;
  let wFar = u.invProjView * clipFar;
  let near = wNear.xyz / wNear.w;
  let far = wFar.xyz / wFar.w;
  let rayDir = normalize(far - near);

  // Approximate angular pixel footprint using screen-space derivatives
  let dRdx = dpdx(rayDir);
  let dRdy = dpdy(rayDir);
  let pixelSize = max(length(dRdx), length(dRdy));

  let color = traceRay(rayDir, pixelSize);

  // Output linear HDR — tone mapping is applied in a separate pass
  return color;
}
`;
