// Ray-traced Kerr black hole with accretion disk
// Traces null geodesics per-pixel using first-order Carter equations
// in Mino time with RK4 integration and deterministic step sizing.

export const rayTracerShaderCode = /* wgsl */`

struct Uniforms {
  invProjView: mat4x4f,
  eye: vec4f,
  params: vec4f,       // a, M, rISCO, diskOuter
  resolution: vec4f,   // width, height, maxSteps, tolerance
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
// Camera ray → conserved quantities
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
  let rawQ = ptheta * ptheta + cth * cth * (p.L * p.L * rawE * rawE / (sth * sth) - a * a * rawE * rawE);
  p.Q = rawQ / (rawE * rawE);

  // Mino-time velocities from potentials
  let r2 = p.r0 * p.r0;
  let a2 = a * a;
  let P = p.E * (r2 + a2) - a * p.L;
  let LaE = p.L - a * p.E;
  let R_val = P * P - g.Delta * (LaE * LaE + p.Q);
  p.vr = sign(blVel.x) * sqrt(max(R_val, 0.0));

  let Theta_val = p.Q + a2 * p.E * p.E * cth * cth - p.L * p.L * cth * cth / max(sth * sth, 1e-10);
  p.vth = sign(blVel.y) * sqrt(max(Theta_val, 0.0));

  p.valid = true;
  return p;
}

// ============================================================
// Decoupled 1D integrators (Mino time, κ=0, E=1)
// ============================================================
// In Mino time, dr/dλ = ±√R(r) depends ONLY on r (trig-free),
// and dθ/dλ = ±√Θ(θ) depends ONLY on θ (polynomial-free).
// φ is accumulated separately via midpoint rule.

// Radial potential R(r) — pure polynomial, zero trig
fn radialR(r: f32, L: f32, Q: f32, M: f32, a: f32) -> f32 {
  let r2 = r * r;
  let a2 = a * a;
  let Delta = r2 - 2.0 * M * r + a2;
  let P = r2 + a2 - a * L;
  let LaE = L - a;
  return P * P - Delta * (LaE * LaE + Q);
}

// Polar potential Θ(θ) — no polynomial, only trig
fn polarTheta(theta: f32, L: f32, Q: f32, a: f32) -> f32 {
  let sth = sin(theta);
  let cth = cos(theta);
  let sin2 = max(sth * sth, 1e-10);
  return Q + a * a * cth * cth - L * L * cth * cth / sin2;
}

// ============================================================
// Independent 1D RK4 for r (completely trig-free)
// ============================================================

fn radialRK4(r: f32, sr: f32, h: f32, L: f32, Q: f32, M: f32, a: f32) -> f32 {
  let k1 = sr * sqrt(max(radialR(r, L, Q, M, a), 0.0));
  let k2 = sr * sqrt(max(radialR(r + h * 0.5 * k1, L, Q, M, a), 0.0));
  let k3 = sr * sqrt(max(radialR(r + h * 0.5 * k2, L, Q, M, a), 0.0));
  let k4 = sr * sqrt(max(radialR(r + h * k3, L, Q, M, a), 0.0));
  return r + h / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
}

// ============================================================
// Independent 1D RK4 for θ (no radial polynomial needed)
// ============================================================

fn polarRK4(theta: f32, stheta: f32, h: f32, L: f32, Q: f32, a: f32) -> f32 {
  let k1 = stheta * sqrt(max(polarTheta(theta, L, Q, a), 0.0));
  let k2 = stheta * sqrt(max(polarTheta(theta + h * 0.5 * k1, L, Q, a), 0.0));
  let k3 = stheta * sqrt(max(polarTheta(theta + h * 0.5 * k2, L, Q, a), 0.0));
  let k4 = stheta * sqrt(max(polarTheta(theta + h * k3, L, Q, a), 0.0));
  return theta + h / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
}

// ============================================================
// φ rate in Mino time (depends on both r and θ)
// ============================================================

fn phiRate(r: f32, theta: f32, L: f32, M: f32, a: f32) -> f32 {
  let r2 = r * r;
  let a2 = a * a;
  let Delta = r2 - 2.0 * M * r + a2;
  let P = r2 + a2 - a * L;
  let sth = sin(theta);
  let sin2 = max(sth * sth, 1e-10);
  return a * P / max(Delta, 1e-8) + L / sin2 - a;
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

  // Smooth fade at inner edge (ISCO) and outer edge
  let innerFade = smoothstep(rISCO * 0.95, rISCO * 1.1, r);
  let outerFade = smoothstep(rOuter, rOuter * 0.7, r);
  let fade = innerFade * outerFade;

  // Blackbody-ish color mapping
  let t = clamp(intensity, 0.0, 3.0);
  let col = vec3f(
    clamp(t * 1.5, 0.0, 1.0),
    clamp(t * t * 0.4, 0.0, 1.0),
    clamp(t * t * t * 0.15, 0.0, 1.0),
  );

  return vec4f(col * clamp(intensity, 0.0, 5.0) * fade, fade);
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
  let uv = vec2f(phi * 80.0, theta * 80.0);
  let cell = floor(uv);
  let h = hash21(cell);
  if (h > 0.97) {
    let brightness = pow((h - 0.97) * 33.0, 2.0) * 0.3;
    // Star position within cell
    let starPos = hash22(cell + vec2f(7.0, 13.0));
    let d = length(uv - cell - starPos);
    // Scale intensity by a sharp Gaussian, width set by pixel footprint
    let radius = max(pixelSize * 80.0, 0.04);
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
  let rEscape = length(u.eye.xyz) * 3.0;
  let a2 = a * a;
  let L = rp.L;
  let Q = rp.Q;

  var r = rp.r0;
  var theta = rp.theta0;
  var phi = rp.phi0;
  var sr = select(1.0, -1.0, rp.vr < 0.0);
  var stheta = select(1.0, -1.0, rp.vth < 0.0);

  var color = vec3f(0.0);
  var accumulated: f32 = 0.0;

  let maxSteps = u32(u.resolution.z);
  for (var step = 0u; step < maxSteps; step++) {
    let prevTheta = theta;
    let prevR = r;

    // Deterministic step size: smaller near horizon
    let h = 0.5 * clamp((r - rHorizon) / r, 0.02, 1.0);

    // Independent 1D RK4 for r (trig-free) and θ (polynomial-free)
    let rNew = radialRK4(r, sr, h, L, Q, M, a);
    let thetaNew = polarRK4(theta, stheta, h, L, Q, a);

    // Accumulate φ via midpoint rule (2nd-order, only needs 1 evaluation)
    phi += h * phiRate(0.5 * (r + rNew), 0.5 * (theta + thetaNew), L, M, a);

    r = rNew;
    theta = thetaNew;

    // Clamp theta away from poles
    theta = clamp(theta, 0.02, 3.12159);

    // Sign-flip detection via potentials (inlined, no redundant computation)
    let R_val = radialR(r, L, Q, M, a);
    if (R_val < 0.0) {
      sr = -sr;
      r = max(r, rHorizon * 1.01);
    }

    let Th_val = polarTheta(theta, L, Q, a);
    if (Th_val < 0.0) {
      stheta = -stheta;
    }

    // Check horizon
    if (r < rHorizon * 1.01) {
      break;
    }

    // Check escape
    if (r > rEscape) {
      let bl_sth = sin(theta);
      let rho = sqrt(r * r + a2);
      let escapeDir = normalize(vec3f(
        rho * bl_sth * cos(phi),
        r * cos(theta),
        rho * bl_sth * sin(phi),
      ));
      color += starfield(escapeDir, pixelSize) * (1.0 - accumulated);
      break;
    }

    // Check disk crossing (theta crosses π/2)
    let pi2 = 1.5707963;
    if ((prevTheta - pi2) * (theta - pi2) < 0.0 && accumulated < 0.99) {
      let frac = (pi2 - prevTheta) / (theta - prevTheta);
      let crossR = prevR + frac * (r - prevR);

      let dc = diskColor(crossR, phi, rp.E, L, M, a);
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

  var color = traceRay(rayDir, pixelSize);

  // Tone mapping (simple Reinhard)
  color = vec4f(color.rgb / (1.0 + color.rgb), 1.0);

  // Gamma correction
  color = vec4f(pow(color.rgb, vec3f(1.0 / 2.2)), 1.0);

  return color;
}
`;
