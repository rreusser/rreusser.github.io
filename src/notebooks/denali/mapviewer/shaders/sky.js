// WGSL shaders for sky dome rendering

import { atmosphereCode } from './atmosphere.js';

export const skyVertexShader = /* wgsl */`
struct SkyOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) clip_pos: vec2<f32>,
};

@vertex
fn vs_sky(@builtin(vertex_index) vid: u32) -> SkyOutput {
  // Fullscreen triangle covering [-1,1] clip space
  let x = f32(i32(vid & 1u)) * 4.0 - 1.0;
  let y = f32(i32(vid >> 1u)) * 4.0 - 1.0;
  var out: SkyOutput;
  out.position = vec4<f32>(x, y, 0.0, 1.0);
  out.clip_pos = vec2<f32>(x, y);
  return out;
}
`;

export const skyFragmentShader = /* wgsl */`
` + atmosphereCode + /* wgsl */`

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;

@fragment
fn fs_sky(@location(0) clip_pos: vec2<f32>) -> @location(0) vec4<f32> {
  // Reconstruct view direction in physical space from camera basis
  let right = globals.cam_right.xyz;
  let aspect = globals.cam_right.w;
  let up = globals.cam_up.xyz;
  let half_fov_tan = globals.cam_up.w;
  let fwd = cross(up, right);

  let ray_x = clip_pos.x * half_fov_tan * aspect;
  let ray_y = clip_pos.y * half_fov_tan;
  let view_dir = normalize(ray_x * right + ray_y * up + fwd);

  let cam_h_m = globals.camera_position.w;

  // Compute sky ray distance — cap at 500km, clip at ground for downward rays
  var dist_m = 500000.0;
  if (view_dir.y < -0.001 && cam_h_m > 0.0) {
    dist_m = min(dist_m, cam_h_m / max(-view_dir.y, 0.001));
  }
  let frag_h_m = max(0.0, cam_h_m + dist_m * view_dir.y);

  // Atmosphere parameters
  let sun_dir = globals.sun_direction.xyz;
  let beta_R = globals.rayleigh_params.xyz;
  let H_R = globals.rayleigh_params.w;
  let beta_M = globals.mie_params.x;
  let H_M = globals.mie_params.y;
  let g = globals.mie_params.z;
  let sun_I = globals.mie_params.w;

  // Phase functions
  let cos_theta = dot(view_dir, sun_dir);
  let P_R = 0.0596831 * (1.0 + cos_theta * cos_theta);
  let g2 = g * g;
  let phase_denom = 1.0 + g2 - 2.0 * g * cos_theta;
  let P_M_iso = 0.0795775 * (1.0 - g2) / (phase_denom * sqrt(phase_denom));
  // When the sun is below the horizon, suppress the directional Mie peak
  // (the ground occludes the sun) but keep isotropic Mie scattering for haze.
  // Blend from full directional P_M to isotropic (g=0 → P_M = 0.0795775)
  let sun_vis = smoothstep(-0.02, 0.02, sun_dir.y);
  let P_M = mix(0.0795775, P_M_iso, sun_vis);

  // Numerical single-scattering integration along view ray.
  // Quadratic step distribution (t^2) concentrates samples near the camera
  // where Mie density is highest (H_M = 1200m), while still covering the
  // full ray for Rayleigh (H_R = 8000m).
  const STEPS = 16u;
  var tau_accum = vec3<f32>(0.0);
  var inscatter = vec3<f32>(0.0);

  for (var i = 0u; i < STEPS; i++) {
    let t0 = f32(i) / f32(STEPS);
    let t1 = f32(i + 1u) / f32(STEPS);
    // Quadratic mapping: s = t^2 biases samples toward camera
    let s0 = t0 * t0;
    let s1 = t1 * t1;
    let ds = (s1 - s0) * dist_m;
    let s_mid = (s0 + s1) * 0.5;
    let h = cam_h_m + (frag_h_m - cam_h_m) * s_mid;

    let local_beta_R = beta_R * exp(-h / H_R);
    let local_beta_M = beta_M * exp(-h / H_M);

    // Transmittance from camera to this sample
    let T_cam = exp(-tau_accum);

    // Transmittance from sun to this sample (reddens light at sunset)
    let T_sun = sunTransmittance(h);

    // Inscattered light: sun * T_sun * phase * scattering_coeff * T_cam
    inscatter += sun_I * T_sun * (P_R * local_beta_R + P_M * vec3<f32>(local_beta_M)) * T_cam * ds;

    // Accumulate optical depth for next step
    tau_accum += (local_beta_R + vec3<f32>(local_beta_M)) * ds;
  }

  // Sun disk: angular radius = 0.2665° = 0.00465 rad, cos(0.00465) ≈ 0.9999892
  let cos_sun = dot(view_dir, sun_dir);
  let sun_circle = smoothstep(0.9999792, 0.9999892, cos_sun) * step(0.0, view_dir.y);
  inscatter = mix(inscatter, vec3<f32>(10.0), sun_circle);

  return finalColor(inscatter);
}
`;
