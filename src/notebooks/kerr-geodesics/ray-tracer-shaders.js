// Ray-traced Kerr black hole with accretion disk
// Traces null geodesics per-pixel using the Mino-time formulation
// with adaptive Cash-Karp RK4(5) integration.

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
// Geodesic equations of motion (Mino time, kappa=0)
// ============================================================

// State packed as array<f32, 6>: [t, r, theta, phi, vr, vth]

fn derivatives(s: array<f32, 6>, E: f32, L: f32, Q: f32, M: f32, a: f32) -> array<f32, 6> {
  let r = s[1];
  let theta = s[2];
  let vr = s[4];
  let vth = s[5];

  let r2 = r * r;
  let a2 = a * a;
  let r2a2 = r2 + a2;
  let Delta = r2 - 2.0 * M * r + a2;
  let P = E * r2a2 - a * L;
  let sth = sin(theta);
  let cth = cos(theta);
  let sin2 = max(sth * sth, 1e-10);

  // Radial potential derivative: dR/dr
  let Pp = 2.0 * E * r;
  let DeltaP = 2.0 * r - 2.0 * M;
  let LaE = L - a * E;
  let Cr = LaE * LaE + Q;  // kappa=0: no r² term
  let dR_dr = 2.0 * P * Pp - DeltaP * Cr;

  // Theta potential derivative: dΘ/dθ
  let dTheta = -2.0 * a2 * E * E * sth * cth + 2.0 * L * L * cth / (sin2 * sth);

  // Time and azimuthal rates
  let Tr = r2a2 * P / Delta;
  let Tth = a * (L - a * E * sin2);
  let Phir = a * P / Delta;
  let Phith = L / sin2 - a * E;

  return array<f32, 6>(Tr + Tth, vr, vth, Phir + Phith, dR_dr * 0.5, dTheta * 0.5);
}

// ============================================================
// Cash-Karp RK4(5) adaptive integrator
// ============================================================

fn addScaled(a_arr: array<f32, 6>, b_arr: array<f32, 6>, s: f32) -> array<f32, 6> {
  return array<f32, 6>(
    a_arr[0] + b_arr[0] * s,
    a_arr[1] + b_arr[1] * s,
    a_arr[2] + b_arr[2] * s,
    a_arr[3] + b_arr[3] * s,
    a_arr[4] + b_arr[4] * s,
    a_arr[5] + b_arr[5] * s,
  );
}

fn addScaled2(a_arr: array<f32, 6>, k1: array<f32, 6>, s1: f32, k2: array<f32, 6>, s2: f32) -> array<f32, 6> {
  return array<f32, 6>(
    a_arr[0] + k1[0] * s1 + k2[0] * s2,
    a_arr[1] + k1[1] * s1 + k2[1] * s2,
    a_arr[2] + k1[2] * s1 + k2[2] * s2,
    a_arr[3] + k1[3] * s1 + k2[3] * s2,
    a_arr[4] + k1[4] * s1 + k2[4] * s2,
    a_arr[5] + k1[5] * s1 + k2[5] * s2,
  );
}

fn rkck45(
  state: array<f32, 6>,
  h: f32,
  E: f32, L: f32, Q: f32, M: f32, a: f32,
  tol: f32,
) -> array<f32, 8> {
  // Returns [y0..y5, hNext, accepted]
  let k1 = derivatives(state, E, L, Q, M, a);

  // Stage 2
  let s2 = addScaled(state, k1, h * 0.2);
  let k2 = derivatives(s2, E, L, Q, M, a);

  // Stage 3
  let s3 = array<f32, 6>(
    state[0] + h * (k1[0] * 0.075 + k2[0] * 0.225),
    state[1] + h * (k1[1] * 0.075 + k2[1] * 0.225),
    state[2] + h * (k1[2] * 0.075 + k2[2] * 0.225),
    state[3] + h * (k1[3] * 0.075 + k2[3] * 0.225),
    state[4] + h * (k1[4] * 0.075 + k2[4] * 0.225),
    state[5] + h * (k1[5] * 0.075 + k2[5] * 0.225),
  );
  let k3 = derivatives(s3, E, L, Q, M, a);

  // Stage 4
  let s4 = array<f32, 6>(
    state[0] + h * (k1[0] * 0.3 - k2[0] * 0.9 + k3[0] * 1.2),
    state[1] + h * (k1[1] * 0.3 - k2[1] * 0.9 + k3[1] * 1.2),
    state[2] + h * (k1[2] * 0.3 - k2[2] * 0.9 + k3[2] * 1.2),
    state[3] + h * (k1[3] * 0.3 - k2[3] * 0.9 + k3[3] * 1.2),
    state[4] + h * (k1[4] * 0.3 - k2[4] * 0.9 + k3[4] * 1.2),
    state[5] + h * (k1[5] * 0.3 - k2[5] * 0.9 + k3[5] * 1.2),
  );
  let k4 = derivatives(s4, E, L, Q, M, a);

  // Stage 5
  let s5 = array<f32, 6>(
    state[0] + h * (k1[0] * (-11.0/54.0) + k2[0] * (5.0/2.0) + k3[0] * (-70.0/27.0) + k4[0] * (35.0/27.0)),
    state[1] + h * (k1[1] * (-11.0/54.0) + k2[1] * (5.0/2.0) + k3[1] * (-70.0/27.0) + k4[1] * (35.0/27.0)),
    state[2] + h * (k1[2] * (-11.0/54.0) + k2[2] * (5.0/2.0) + k3[2] * (-70.0/27.0) + k4[2] * (35.0/27.0)),
    state[3] + h * (k1[3] * (-11.0/54.0) + k2[3] * (5.0/2.0) + k3[3] * (-70.0/27.0) + k4[3] * (35.0/27.0)),
    state[4] + h * (k1[4] * (-11.0/54.0) + k2[4] * (5.0/2.0) + k3[4] * (-70.0/27.0) + k4[4] * (35.0/27.0)),
    state[5] + h * (k1[5] * (-11.0/54.0) + k2[5] * (5.0/2.0) + k3[5] * (-70.0/27.0) + k4[5] * (35.0/27.0)),
  );
  let k5 = derivatives(s5, E, L, Q, M, a);

  // Stage 6
  let s6 = array<f32, 6>(
    state[0] + h * (k1[0] * (1631.0/55296.0) + k2[0] * (175.0/512.0) + k3[0] * (575.0/13824.0) + k4[0] * (44275.0/110592.0) + k5[0] * (253.0/4096.0)),
    state[1] + h * (k1[1] * (1631.0/55296.0) + k2[1] * (175.0/512.0) + k3[1] * (575.0/13824.0) + k4[1] * (44275.0/110592.0) + k5[1] * (253.0/4096.0)),
    state[2] + h * (k1[2] * (1631.0/55296.0) + k2[2] * (175.0/512.0) + k3[2] * (575.0/13824.0) + k4[2] * (44275.0/110592.0) + k5[2] * (253.0/4096.0)),
    state[3] + h * (k1[3] * (1631.0/55296.0) + k2[3] * (175.0/512.0) + k3[3] * (575.0/13824.0) + k4[3] * (44275.0/110592.0) + k5[3] * (253.0/4096.0)),
    state[4] + h * (k1[4] * (1631.0/55296.0) + k2[4] * (175.0/512.0) + k3[4] * (575.0/13824.0) + k4[4] * (44275.0/110592.0) + k5[4] * (253.0/4096.0)),
    state[5] + h * (k1[5] * (1631.0/55296.0) + k2[5] * (175.0/512.0) + k3[5] * (575.0/13824.0) + k4[5] * (44275.0/110592.0) + k5[5] * (253.0/4096.0)),
  );
  let k6 = derivatives(s6, E, L, Q, M, a);

  // 5th-order solution
  let c5 = array<f32, 6>(37.0/378.0, 0.0, 250.0/621.0, 125.0/594.0, 0.0, 512.0/1771.0);
  var y5: array<f32, 6>;
  for (var i = 0u; i < 6u; i++) {
    y5[i] = state[i] + h * (c5[0]*k1[i] + c5[2]*k3[i] + c5[3]*k4[i] + c5[5]*k6[i]);
  }

  // Error estimate (5th - 4th order)
  let dc = array<f32, 6>(
    37.0/378.0 - 2825.0/27648.0,
    0.0,
    250.0/621.0 - 18575.0/48384.0,
    125.0/594.0 - 13525.0/55296.0,
    -277.0/14336.0,
    512.0/1771.0 - 0.25,
  );
  var errMax: f32 = 0.0;
  for (var i = 0u; i < 6u; i++) {
    let diff = h * (dc[0]*k1[i] + dc[2]*k3[i] + dc[3]*k4[i] + dc[4]*k5[i] + dc[5]*k6[i]);
    let scale = max(abs(state[i]), max(abs(y5[i]), 1e-10));
    errMax = max(errMax, abs(diff) / scale);
  }

  // Adaptive step control
  let ratio = tol / max(errMax, 1e-30);
  var hNext: f32;
  var accepted: f32 = 0.0;

  if (errMax <= tol || abs(h) <= 1e-10) {
    accepted = 1.0;
    if (ratio > 1.0) {
      hNext = min(h * min(0.9 * pow(ratio, 0.2), 5.0), 5.0);
    } else {
      hNext = h * max(0.9 * pow(ratio, 0.25), 0.1);
    }
    hNext = max(abs(hNext), 1e-10) * sign(h);
  } else {
    hNext = h * max(0.9 * pow(ratio, 0.25), 0.1);
    hNext = max(abs(hNext), 1e-10) * sign(h);
  }

  if (accepted > 0.5) {
    return array<f32, 8>(y5[0], y5[1], y5[2], y5[3], y5[4], y5[5], hNext, 1.0);
  }
  return array<f32, 8>(state[0], state[1], state[2], state[3], state[4], state[5], hNext, 0.0);
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

fn starfield(dir: vec3f) -> vec3f {
  let theta = acos(clamp(dir.y, -1.0, 1.0));
  let phi = atan2(dir.z, dir.x);
  let uv = vec2f(phi * 80.0, theta * 80.0);
  let cell = floor(uv);
  let h = hash21(cell);
  if (h > 0.97) {
    let brightness = pow((h - 0.97) * 33.0, 2.0) * 0.3;
    // Slight color variation
    let temp = hash21(cell + vec2f(42.0, 17.0));
    let col = mix(vec3f(0.8, 0.85, 1.0), vec3f(1.0, 0.9, 0.7), temp);
    return col * brightness;
  }
  return vec3f(0.0);
}

// ============================================================
// Main ray tracer
// ============================================================

fn traceRay(rayDir: vec3f) -> vec4f {
  let a = u.params.x;
  let M = u.params.y;

  let rp = computeRayParams(rayDir, a, M);
  if (!rp.valid) { return vec4f(0.0, 0.0, 0.0, 1.0); }

  let rHorizon = M + sqrt(max(M * M - a * a, 0.0));
  let rEscape = length(u.eye.xyz) * 3.0;

  var state = array<f32, 6>(0.0, rp.r0, rp.theta0, rp.phi0, rp.vr, rp.vth);
  var h: f32 = 0.5;
  let tol = u.resolution.w;

  var color = vec3f(0.0);
  var accumulated: f32 = 0.0;

  let maxSteps = u32(u.resolution.z);
  for (var step = 0u; step < maxSteps; step++) {
    let prevTheta = state[2];
    let prevR = state[1];

    // Try adaptive step (with retry on rejection)
    var result: array<f32, 8>;
    var accepted = false;
    for (var attempt = 0u; attempt < 8u; attempt++) {
      result = rkck45(state, h, rp.E, rp.L, rp.Q, M, a, tol);
      if (result[7] > 0.5) {
        accepted = true;
        h = result[6];
        break;
      }
      h = result[6];
    }
    if (!accepted) {
      // Force accept
      let forced = rkck45(state, h, rp.E, rp.L, rp.Q, M, a, 1.0);
      result = forced;
      h = forced[6];
    }

    state = array<f32, 6>(result[0], result[1], result[2], result[3], result[4], result[5]);

    // Clamp theta away from poles
    state[2] = clamp(state[2], 0.02, 3.12159);

    let r = state[1];
    let theta = state[2];

    // Check horizon
    if (r < rHorizon * 1.01) {
      break;
    }

    // Check escape
    if (r > rEscape) {
      // Ray escaped — add starfield
      let bl_phi = state[3];
      let bl_sth = sin(theta);
      let rho = sqrt(r * r + a * a);
      let escapeDir = normalize(vec3f(
        rho * bl_sth * cos(bl_phi),
        r * cos(theta),
        rho * bl_sth * sin(bl_phi),
      ));
      color += starfield(escapeDir) * (1.0 - accumulated);
      break;
    }

    // Check disk crossing (theta crosses pi/2)
    let pi2 = 1.5707963;
    if ((prevTheta - pi2) * (theta - pi2) < 0.0 && accumulated < 0.99) {
      // Interpolate to find crossing point
      let frac = (pi2 - prevTheta) / (theta - prevTheta);
      let crossR = prevR + frac * (r - prevR);
      let crossPhi = state[3];

      let dc = diskColor(crossR, crossPhi, rp.E, rp.L, M, a);
      if (dc.a > 0.0) {
        // Semi-transparent accumulation for multiple crossings
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

  var color = traceRay(rayDir);

  // Tone mapping (simple Reinhard)
  color = vec4f(color.rgb / (1.0 + color.rgb), 1.0);

  // Gamma correction
  color = vec4f(pow(color.rgb, vec3f(1.0 / 2.2)), 1.0);

  return color;
}
`;
