// Ray-traced Kerr black hole with accretion disk
// Traces null geodesics per-pixel using second-order Carter equations
// in affine parameter. State is (r, vr, θ, vθ, φ) where vr and vθ are
// Mino-time velocities (±√R, ±√Θ). Dividing by Σ converts to affine
// time, bounding velocities at large r without explicit velocity scaling.
// Velocities pass smoothly through zero at turning points — no sign
// tracking needed. This avoids the stalling issue where first-order
// sign-tracking with √max(Θ,0) freezes the integrator at θ turning points.

export const rayTracerShaderCode = /* wgsl */`

struct Uniforms {
  invProjView: mat4x4f,
  eye: vec4f,
  params: vec4f,       // a, M, rISCO, diskOuter
  resolution: vec4f,   // width, height, maxSteps, stepSize
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
  // Clamp θ away from poles for derivative evaluation — the L/sin²θ and
  // L²cosθ/sin³θ terms diverge, corrupting RK4 substeps even when the
  // post-step guard would catch the final result.
  let safe_theta = clamp(theta, 0.02, 3.12159);
  let cth = cos(safe_theta);
  let sth = sin(safe_theta);
  let sin2 = sth * sth;
  let sin3 = sin2 * sth;
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
  let dTh_dth = -2.0 * a2 * sth * cth + 2.0 * L * L * cth / sin3;

  // Azimuthal: dφ/dλ = (aP/Δ + L/sin²θ - a) / Σ
  let dphi = a * P / max(abs(Delta), 1e-8) + L / sin2 - a;

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

// ============================================================
// Accretion disk
// ============================================================

fn diskColor(r: f32, phi: f32, E: f32, L: f32, M: f32, a: f32) -> vec4f {
  let rISCO = u.params.z;
  let rOuter = u.params.w;

  if (r < rISCO * 0.99 || r > rOuter) { return vec4f(0.0); }

  // Temperature profile: T ∝ r^(-3/4), intensity ∝ T^4 ∝ r^(-3)
  let temp = pow(rISCO / r, 0.75);

  // Doppler factor for prograde circular orbit
  let sqrtM = sqrt(M);
  let r15 = r * sqrt(r);
  let Omega = sqrtM / (r15 + a * sqrtM);
  let denom = 1.0 - 3.0 * M / r + 2.0 * a * sqrtM / r15;
  let ut_em = select(10.0, 1.0 / sqrt(denom), denom > 0.01);
  let g = 1.0 / (ut_em * (1.0 - Omega * L / E));

  // Beamed intensity
  let intensity = temp * g * g * g;

  // Turbulent wispy structure via FBM noise
  // Use log(r) for radial coordinate to get even detail across the disk
  let noiseCoord = vec2f(phi * 3.0, log(r) * 8.0);
  let turbulence = fbm(noiseCoord + vec2f(3.7, 1.2));
  // A second layer at different scale for fine wisps
  let wisps = fbm(noiseCoord * 2.5 + vec2f(17.3, 5.1));
  // Combine: base density modulated by turbulence
  let density = 0.4 + 0.6 * turbulence + 0.3 * wisps * wisps;

  // Smooth fade at inner edge (ISCO) and outer edge
  let innerFade = smoothstep(rISCO * 0.95, rISCO * 1.1, r);
  let outerFade = smoothstep(rOuter, rOuter * 0.7, r);
  let fade = innerFade * outerFade;

  // Brightness: g^3 beaming × temperature × density
  let brightness = intensity * density;

  // Color hue from Doppler-shifted temperature (not from beamed intensity,
  // which would make beaming ~g^6 instead of the correct ~g^3).
  let T = temp * clamp(abs(g), 0.3, 3.0);
  let col = vec3f(
    min(T * 2.5, 1.0 + T * 0.3),                    // red saturates first
    T * 0.5 + T * T * 0.4,                           // green follows for warm white
    T * 0.15 + T * T * 0.3,                          // blue rises for white at high T
  );

  // HDR output — no clamping, let the tone mapper handle it
  return vec4f(col * brightness * 4.0 * fade, fade);
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
    // Minimum radius is ~1 screen pixel in grid-space units, so stars
    // stay point-like regardless of figure size.
    let minRadius = gridScale * 2.0 / max(u.resolution.x, u.resolution.y);
    let radius = max(pixelSize * gridScale, minRadius);
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
  let rEscape = max(rHorizon * 20.0, 50.0);
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

  let hBase = u.resolution.w;
  let maxSteps = u32(u.resolution.z);
  for (var step = 0u; step < maxSteps; step++) {
    let prevTheta = s.theta;
    let prevR = s.r;

    // Adaptive step size: smaller near horizon, full size far away.
    // Dividing by Σ in the derivatives already bounds velocities.
    let h = hBase * clamp((s.r - rHorizon) / s.r, 0.02, 1.0);

    // RK4 step for (r, vr, θ, vθ, φ)
    s = rk4Step(s, h, L, Q, M, a);

    // Polar crossing: when θ overshoots a pole, reflect it and shift φ by π
    // so the ray emerges on the opposite side — matching the straight-through
    // Cartesian trajectory rather than bouncing back on the same side.
    // The threshold (0.02 rad ≈ 1.1°) must be wide enough that the RK4
    // substep evaluations never sample the divergent 1/sin³θ regime.
    if (s.theta < 0.02) {
      s.theta = 0.02;
      s.vth = abs(s.vth);
      s.phi += 3.14159265;
    } else if (s.theta > 3.12159) {
      s.theta = 3.12159;
      s.vth = -abs(s.vth);
      s.phi += 3.14159265;
    }

    // Check horizon
    if (s.r < rHorizon * 1.01) {
      break;
    }

    // Escape: far from hole and moving outward — will never return
    if (s.r > rEscape && s.vr > 0.0) {
      let bl_sth = sin(s.theta);
      let rho = sqrt(s.r * s.r + a2);
      let escapeDir = normalize(vec3f(
        rho * bl_sth * cos(s.phi),
        s.r * cos(s.theta),
        rho * bl_sth * sin(s.phi),
      ));
      color += starfield(escapeDir, pixelSize) * (1.0 - accumulated);
      break;
    }

    // Check disk crossing (theta crosses π/2)
    let pi2 = 1.5707963;
    if ((prevTheta - pi2) * (s.theta - pi2) < 0.0 && accumulated < 0.99) {
      let frac = (pi2 - prevTheta) / (s.theta - prevTheta);
      let crossR = prevR + frac * (s.r - prevR);

      let dc = diskColor(crossR, s.phi, rp.E, L, M, a);
      if (dc.a > 0.0) {
        let opacity = min(dc.a, 1.0 - accumulated);
        color += dc.rgb * opacity;
        accumulated += opacity * 0.7;
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
