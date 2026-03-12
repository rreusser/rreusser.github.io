class Ot{constructor(){this._listeners=new Map}on(e,t){let r=this._listeners.get(e);return r||(r=[],this._listeners.set(e,r)),r.push(t),this}off(e,t){const r=this._listeners.get(e);if(!r)return this;const i=r.indexOf(t);return i!==-1&&r.splice(i,1),this}once(e,t){if(t){const r=(...i)=>{this.off(e,r),t(...i)};return this.on(e,r)}return new Promise(r=>{const i=(...n)=>{this.off(e,i),r(n[0])};this.on(e,i)})}emit(e,...t){const r=this._listeners.get(e);if(!r||r.length===0)return!1;for(const i of[...r])i(...t);return!0}}const Ye=[512,256,128,64,32,16];function Yt(l,e){const t=e+4,r=(t+1)*(t+1),i=new Uint16Array(r*2);let n=0;for(let _=0;_<=t;_++)for(let f=0;f<=t;f++)i[n++]=f,i[n++]=_;const a=t*t*6,o=new Uint32Array(a);let c=0;const h=t+1;for(let _=0;_<t;_++)for(let f=0;f<t;f++){const g=_*h+f,m=g+1,p=g+h,b=p+1;o[c++]=g,o[c++]=p,o[c++]=m,o[c++]=m,o[c++]=p,o[c++]=b}const u=l.createBuffer({size:i.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});l.queue.writeBuffer(u,0,i);const d=l.createBuffer({size:o.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});return l.queue.writeBuffer(d,0,o),{vertexBuffer:u,indexBuffer:d,indexCount:a,vertexCount:r,dataResolution:e}}function Xt(l){const e=new Map;for(const t of Ye)e.set(t,Yt(l,t));return{getMesh(t){for(const r of Ye)if(r<=t)return e.get(r);return e.get(Ye[Ye.length-1])},destroy(){for(const t of e.values())t.vertexBuffer.destroy(),t.indexBuffer.destroy()}}}class Wt{constructor(){this.UNIFORM_STRIDE=256,this.MAX_TILES_PER_FRAME=256,this._depthTexture=null}async init(e){const t=await navigator.gpu.requestAdapter();this.device=await t.requestDevice(),this.format=navigator.gpu.getPreferredCanvasFormat(),this.gpuCtx=e.getContext("webgpu"),this.gpuCtx.configure({device:this.device,format:this.format,alphaMode:"opaque"});const r=this.device;this.meshPool=Xt(r),this.imagerySampler=r.createSampler({magFilter:"linear",minFilter:"linear",mipmapFilter:"nearest",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"}),this.uniformBGL=r.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform",hasDynamicOffset:!0}}]}),this.textureBGL=r.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float"}}]}),this.globalUniformBGL=r.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),this.imageryBGL=r.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{}}]}),this.globalUniformBuffer=r.createBuffer({size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.globalUniformBindGroup=r.createBindGroup({layout:this.globalUniformBGL,entries:[{binding:0,resource:{buffer:this.globalUniformBuffer}}]}),this.fallbackImageryTexture=r.createTexture({size:[1,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),r.queue.writeTexture({texture:this.fallbackImageryTexture},new Uint8Array([0,0,0,255]),{bytesPerRow:4},[1,1]),this.fallbackImageryBindGroup=r.createBindGroup({layout:this.imageryBGL,entries:[{binding:0,resource:this.fallbackImageryTexture.createView()},{binding:1,resource:this.imagerySampler}]}),this.whiteImageryTexture=r.createTexture({size:[1,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),r.queue.writeTexture({texture:this.whiteImageryTexture},new Uint8Array([255,255,255,255]),{bytesPerRow:4},[1,1]),this.whiteImageryBindGroup=r.createBindGroup({layout:this.imageryBGL,entries:[{binding:0,resource:this.whiteImageryTexture.createView()},{binding:1,resource:this.imagerySampler}]}),this.uniformBuffer=r.createBuffer({size:this.UNIFORM_STRIDE*this.MAX_TILES_PER_FRAME,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.uniformBindGroup=r.createBindGroup({layout:this.uniformBGL,entries:[{binding:0,resource:{buffer:this.uniformBuffer,size:224}}]})}get mesh(){return this.meshPool.getMesh(512)}ensureDepthTexture(e,t){this._depthTexture&&this._depthTexture.width===e&&this._depthTexture.height===t||(this._depthTexture&&this._depthTexture.destroy(),this._depthTexture=this.device.createTexture({size:[e,t],format:"depth32float",usage:GPUTextureUsage.RENDER_ATTACHMENT}))}get depthTexture(){return this._depthTexture}destroy(){this._depthTexture&&this._depthTexture.destroy(),this.meshPool.destroy(),this.uniformBuffer.destroy(),this.globalUniformBuffer.destroy(),this.fallbackImageryTexture.destroy(),this.whiteImageryTexture.destroy(),this.device.destroy()}}const Fe=`
struct GlobalUniforms {
  camera_position: vec4<f32>,   // xyz=world pos, w=camera_height_meters
  sun_direction: vec4<f32>,     // xyz=normalized sun dir (physical space), w=meters_per_unit
  rayleigh_params: vec4<f32>,   // xyz=beta_R (per meter), w=H_R (meters)
  mie_params: vec4<f32>,        // x=beta_M, y=H_M, z=g_mie, w=sun_intensity
  cam_right: vec4<f32>,         // xyz=camera right dir (physical space), w=aspect_ratio
  cam_up: vec4<f32>,            // xyz=camera up dir (physical space), w=half_fov_tan
};

// Numerically stable optical depth factor.
// Computes: integral_0^dist exp(-(h_a + t*(h_b-h_a)/dist) / H) dt / dist
// = H * (exp(-h_a/H) - exp(-h_b/H)) / (h_b - h_a)
// Both exp terms are always well-behaved (no overflow).
fn opticalDepthFactor(h_a: f32, h_b: f32, H: f32) -> f32 {
  let delta_h = h_b - h_a;
  if (abs(delta_h) > 1.0) {
    return H * (exp(-h_a / H) - exp(-h_b / H)) / delta_h;
  }
  return exp(-h_a / H);
}

// Transmittance from a point at height h toward the sun through the atmosphere.
// Uses flat-earth air mass approximation: path length ~ H / sin(sun_altitude).
fn sunTransmittance(h: f32) -> vec3<f32> {
  let sun_dir = globals.sun_direction.xyz;
  let beta_R = globals.rayleigh_params.xyz;
  let H_R = globals.rayleigh_params.w;
  let beta_M = globals.mie_params.x;
  let H_M = globals.mie_params.y;
  let sin_alt = max(sun_dir.y, 0.01);
  let tau_R = beta_R * H_R * exp(-h / H_R) / sin_alt;
  let tau_M = beta_M * H_M * exp(-h / H_M) / sin_alt;
  return exp(-(tau_R + vec3<f32>(tau_M)));
}

fn computeScattering(cam_h_m: f32, frag_h_m: f32, dist_m: f32, view_dir: vec3<f32>) -> array<vec3<f32>, 2> {
  let sun_dir = globals.sun_direction.xyz;
  let beta_R = globals.rayleigh_params.xyz;
  let H_R = globals.rayleigh_params.w;
  let beta_M = globals.mie_params.x;
  let H_M = globals.mie_params.y;
  let g = globals.mie_params.z;
  let sun_I = globals.mie_params.w;

  // Optical depth (numerically stable)
  let factor_R = opticalDepthFactor(cam_h_m, frag_h_m, H_R);
  let factor_M = opticalDepthFactor(cam_h_m, frag_h_m, H_M);
  let tau_R = beta_R * dist_m * factor_R;
  let tau_M = beta_M * dist_m * factor_M;

  // Transmittance
  let T = exp(-(tau_R + vec3<f32>(tau_M)));

  // Phase functions
  let cos_theta = dot(view_dir, sun_dir);
  let P_R = 0.0596831 * (1.0 + cos_theta * cos_theta);  // 3/(16*pi)
  let g2 = g * g;
  let denom = 1.0 + g2 - 2.0 * g * cos_theta;
  let P_M_raw = 0.0795775 * (1.0 - g2) / (denom * sqrt(denom));  // 1/(4*pi)
  let sun_vis = smoothstep(-0.02, 0.02, sun_dir.y);
  let P_M = mix(0.0795775, P_M_raw, sun_vis);

  // Inscatter using optical depth fractions
  // Each species' contribution weighted by its share of total optical depth —
  // properly handles different scale heights along the viewing path
  let tau_total = tau_R + vec3<f32>(tau_M);

  // Sun transmittance at average path height — reddens inscattered light at sunset
  let T_sun = sunTransmittance((cam_h_m + frag_h_m) * 0.5);

  let inscatter = T_sun * sun_I * (P_R * tau_R + P_M * vec3<f32>(tau_M)) / max(tau_total, vec3<f32>(1e-10));

  return array<vec3<f32>, 2>(T, inscatter);
}

// ACES filmic tonemap (Narkowicz 2015)
fn acesTonemap(x: vec3<f32>) -> vec3<f32> {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3<f32>(0.0), vec3<f32>(1.0));
}

fn linearToSrgb(c: vec3<f32>) -> vec3<f32> {
  let lo = c * 12.92;
  let hi = 1.055 * pow(c, vec3<f32>(1.0 / 2.4)) - 0.055;
  return select(hi, lo, c <= vec3<f32>(0.0031308));
}

fn finalColor(linear: vec3<f32>) -> vec4<f32> {
  return vec4<f32>(linearToSrgb(acesTonemap(linear)), 1.0);
}
`,qt=`
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
`,Nt=`
`+Fe+`

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
`;class Zt{constructor(e){const{device:t,format:r,globalUniformBGL:i}=e;this._pipeline=t.createRenderPipeline({layout:t.createPipelineLayout({bindGroupLayouts:[i]}),vertex:{module:t.createShaderModule({code:qt}),entryPoint:"vs_sky",buffers:[]},fragment:{module:t.createShaderModule({code:Nt}),entryPoint:"fs_sky",targets:[{format:r}]},primitive:{topology:"triangle-list"},depthStencil:{format:"depth32float",depthWriteEnabled:!1,depthCompare:"always"}})}draw(e,t){e.setPipeline(this._pipeline),e.setBindGroup(0,t),e.draw(3)}}const Ct=`
struct Uniforms {
  mvp: mat4x4<f32>,
  model: mat4x4<f32>,
  elevation_scale: f32,
  cell_size_meters: f32,
  vertical_exaggeration: f32,
  texel_size: f32,
  show_tile_borders: f32,
  has_imagery: f32,
  hillshade_opacity: f32,
  slope_angle_opacity: f32,
  contour_opacity: f32,
  viewport_height: f32,
  show_wireframe: f32,
  slope_aspect_mask_above: f32,
  slope_aspect_mask_near: f32,
  slope_aspect_mask_below: f32,
  slope_aspect_opacity: f32,
  treeline_lower: f32,
  treeline_upper: f32,
  grid_data_size: f32,
  terrain_uv_offset: vec2<f32>,
  terrain_uv_scale: vec2<f32>,
  terrain_cell_size: f32,
};
`,Ht=Ct+`

struct GlobalUniforms {
  camera_position: vec4<f32>,
  sun_direction: vec4<f32>,
  rayleigh_params: vec4<f32>,
  mie_params: vec4<f32>,
  cam_right: vec4<f32>,
  cam_up: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var elevationTexture: texture_2d<f32>;
@group(2) @binding(0) var<uniform> globals: GlobalUniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) world_position: vec3<f32>,
  @location(2) shade: f32,
  @location(3) elevation_m: f32,
  @location(4) slope_angle: f32,
  @location(5) slope_aspect_sin: f32,
  @location(6) slope_aspect_cos: f32,
};

fn loadElevation(coord: vec2<i32>) -> f32 {
  return textureLoad(elevationTexture, coord, 0).r;
}

@vertex
fn vs_main(@location(0) grid_pos: vec2<u32>) -> VertexOutput {
  var out: VertexOutput;

  let D = uniforms.grid_data_size;

  // Raw coords [0, D+4]. The outer ring (0 and >= D+3) is a skirt that hangs
  // below the tile edge to hide gaps between tiles at different LOD levels.
  // Inner ring (1 and D+2) are boundary vertices at tile edges.
  // Interior (2 to D+1) are texel centers.
  let raw_u = i32(grid_pos.x);
  let raw_v = i32(grid_pos.y);
  let inner_u = raw_u - 1;
  let inner_v = raw_v - 1;

  // Grid position: interior texel k at u = k - 0.5; boundaries at 0 and D
  let u = clamp(f32(inner_u) - 0.5, 0.0, D);
  let v = clamp(f32(inner_v) - 0.5, 0.0, D);

  // Terrain texel coordinates: offset local inner coords into the parent
  // elevation texture. When rendering a sub-tile of a coarser terrain tile,
  // terrain_texel_offset shifts sampling into the correct sub-region of the
  // 514x514 elevation texture. Each mesh vertex maps 1:1 onto a terrain texel.
  let terrain_texel_offset_u = i32(round(uniforms.terrain_uv_offset.x * 512.0));
  let terrain_texel_offset_v = i32(round(uniforms.terrain_uv_offset.y * 512.0));
  let t_inner_u = inner_u + terrain_texel_offset_u;
  let t_inner_v = inner_v + terrain_texel_offset_v;

  // Texel indices for elevation sampling (using terrain-space inner coords).
  // Interior: single texel. Boundary/skirt (<=0 or >=513): average two texels.
  var tex_u_a: i32 = t_inner_u;
  var tex_u_b: i32 = t_inner_u;
  if (t_inner_u <= 0) { tex_u_a = 0; tex_u_b = 1; }
  else if (t_inner_u >= 513) { tex_u_a = 512; tex_u_b = 513; }

  var tex_v_a: i32 = t_inner_v;
  var tex_v_b: i32 = t_inner_v;
  if (t_inner_v <= 0) { tex_v_a = 0; tex_v_b = 1; }
  else if (t_inner_v >= 513) { tex_v_a = 512; tex_v_b = 513; }

  // Average 1, 2, or 4 texels depending on edge/corner
  let elevation = (
    loadElevation(vec2<i32>(tex_u_a, tex_v_a)) +
    loadElevation(vec2<i32>(tex_u_b, tex_v_a)) +
    loadElevation(vec2<i32>(tex_u_a, tex_v_b)) +
    loadElevation(vec2<i32>(tex_u_b, tex_v_b))
  ) * 0.25;

  let pos = vec4<f32>(u, elevation, v, 1.0);
  out.position = uniforms.mvp * pos;
  out.uv = vec2<f32>((u + 1.0) / (D + 2.0), (v + 1.0) / (D + 2.0));
  out.world_position = (uniforms.model * pos).xyz;

  // Skirt: drop position in model space proportional to camera distance.
  // Elevation varying is also lowered so contours don't run down the skirt face.
  let Di = i32(D);
  let is_skirt = (raw_u == 0) || (raw_u >= Di + 3) || (raw_v == 0) || (raw_v >= Di + 3);
  var skirt_drop = 0.0;
  if (is_skirt) {
    let mpu = globals.sun_direction.w;
    let cam_dist = length(globals.camera_position.xyz - out.world_position);
    skirt_drop = cam_dist * mpu * 0.01;
    let skirt_pos = vec4<f32>(u, elevation - skirt_drop, v, 1.0);
    out.position = uniforms.mvp * skirt_pos;
  }

  // Hillshade: compute normal from neighbor elevations in terrain texel space.
  // At tile borders, extend the stencil so it always spans 2 texels
  // to avoid halving the gradient (which creates visible seams).
  var lu = t_inner_u - 1; var ru = t_inner_u + 1;
  if (lu < 0) { lu = 0; ru = 2; }
  else if (ru > 513) { ru = 513; lu = 511; }
  var uv_ = t_inner_v - 1; var dv = t_inner_v + 1;
  if (uv_ < 0) { uv_ = 0; dv = 2; }
  else if (dv > 513) { dv = 513; uv_ = 511; }

  let zL = loadElevation(vec2<i32>(lu, t_inner_v));
  let zR = loadElevation(vec2<i32>(ru, t_inner_v));
  let zU = loadElevation(vec2<i32>(t_inner_u, uv_));
  let zD = loadElevation(vec2<i32>(t_inner_u, dv));

  let cellSize = uniforms.terrain_cell_size;
  let dzdx = (zR - zL) / (2.0 * cellSize);
  let dzdy = (zD - zU) / (2.0 * cellSize);

  let normal = vec3<f32>(-dzdx, 1.0, -dzdy);
  let sun = globals.sun_direction.xyz;
  let sun_horizon = smoothstep(-0.02, 0.02, sun.y);
  out.shade = max(0.0, dot(normal, sun) * inverseSqrt(dot(normal, normal))) * sun_horizon;
  out.elevation_m = elevation - skirt_drop;
  let gradient_mag = sqrt(dzdx * dzdx + dzdy * dzdy);
  out.slope_angle = atan(gradient_mag) * 57.29578;

  // Slope aspect: compass bearing of the downhill direction.
  // sin/cos of atan2(-dzdx, dzdy) = -dzdx/mag, dzdy/mag — just normalize.
  let safe_mag = max(gradient_mag, 1e-10);
  out.slope_aspect_sin = -dzdx / safe_mag;
  out.slope_aspect_cos = dzdy / safe_mag;

  return out;
}
`,Vt=Ct+`
`+Fe+`

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(2) @binding(0) var<uniform> globals: GlobalUniforms;
@group(3) @binding(0) var imageryTexture: texture_2d<f32>;
@group(3) @binding(1) var imagerySampler: sampler;

fn srgbToLinear(c: vec3<f32>) -> vec3<f32> {
  return pow(c, vec3<f32>(2.2));
}

fn slopeAngleColor(deg: f32) -> vec4<f32> {
  // Gaia GPS-style discrete slope angle bands (sRGB -> linear)
  let gold   = pow(vec3<f32>(1.0, 0.78, 0.0), vec3<f32>(2.2));
  let yellow = pow(vec3<f32>(1.0, 0.55, 0.0), vec3<f32>(2.2));
  let orange = pow(vec3<f32>(1.0, 0.30, 0.0), vec3<f32>(2.2));
  let red    = pow(vec3<f32>(0.75, 0.0, 0.0), vec3<f32>(2.2));
  let purple = pow(vec3<f32>(0.4, 0.0, 0.6), vec3<f32>(2.2));
  let blue   = pow(vec3<f32>(0.0, 0.2, 0.8), vec3<f32>(2.2));
  let black  = vec3<f32>(0.0);

  // Uniform color blocks with 1 degree linear fades at boundaries
  // 26-29 green | 30-31 yellow | 32-34 orange | 35-45 red
  // 46-50 purple | 51-59 blue | 60+ black
  let t_enter  = smoothstep(24.0, 26.0, deg);
  let t_yellow = smoothstep(29.0, 30.0, deg);
  let t_orange = smoothstep(31.0, 32.0, deg);
  let t_red    = smoothstep(34.0, 35.0, deg);
  let t_purple = smoothstep(45.0, 46.0, deg);
  let t_blue   = smoothstep(50.0, 51.0, deg);
  let t_black  = smoothstep(59.0, 60.0, deg);

  var color = mix(gold, yellow, t_yellow);
  color = mix(color, orange, t_orange);
  color = mix(color, red, t_red);
  color = mix(color, purple, t_purple);
  color = mix(color, blue, t_blue);
  color = mix(color, black, t_black);
  return vec4<f32>(color, t_enter);
}

// Quadratic B-spline basis function (partition of unity with uniform knots).
// Input s is the normalized distance from the basis center in units of knot
// spacing. Support spans [-1.5, 1.5].
fn quadBSpline(s: f32) -> f32 {
  let a = abs(s);
  if (a >= 1.5) { return 0.0; }
  if (a >= 0.5) { let t = 1.5 - a; return 0.5 * t * t; }
  return 0.75 - a * a;
}

// Compute the total B-spline weight for selected slope aspect directions.
// aspect: compass bearing in radians (0=N, pi/2=E, +/-pi=S, -pi/2=W)
// mask: bitmask with bits 0-7 for N, NE, E, SE, S, SW, W, NW
// Returns 0..1 where 1 = full coverage (all 8 selected sum to exactly 1.0).
fn slopeAspectWeight(aspect: f32, mask: u32) -> f32 {
  var weight = 0.0;
  let TWO_PI = 6.2831853;
  let h = 0.7853982; // pi/4 = 45 degree knot spacing
  for (var i = 0u; i < 8u; i++) {
    if ((mask & (1u << i)) != 0u) {
      let center = f32(i) * h;
      var d = aspect - center;
      d = d - round(d / TWO_PI) * TWO_PI;
      weight += quadBSpline(d / h);
    }
  }
  return weight;
}

fn contourLinearstep(edge0: f32, edge1: f32, x: f32) -> f32 {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

fn blendedContours(elevation_ft: f32, tile_uv: vec2<f32>) -> f32 {
  let D = uniforms.grid_data_size;
  let divisions = 5.0;       // 40 -> 200 -> 1000 -> 5000
  let base_spacing = 40.0;   // finest contour spacing in feet
  let min_spacing = 8.0;     // minimum pixels between contours before octave shift
  let line_width = 2.0;
  let antialias = 1.0;
  let n = 3.0;

  // All derivatives must be computed before any non-uniform control flow
  let elev_grad = length(vec2<f32>(dpdx(elevation_ft), dpdy(elevation_ft)));
  let h_feet_pp = 0.5 * (fwidth(tile_uv.x) + fwidth(tile_uv.y))
    * (D + 2.0) * uniforms.terrain_cell_size * 3.28084;

  if (elev_grad < 1e-6) { return 0.0; }

  // Unclamped continuous octave from horizontal screen density.
  // Negative values mean the screen can resolve finer than base_spacing.
  let local_octave = log2(h_feet_pp * min_spacing / base_spacing) / log2(divisions);
  let contour_spacing = base_spacing * pow(divisions, ceil(local_octave));

  var plot_var = elevation_ft / contour_spacing;
  var width_scale = contour_spacing / elev_grad;

  // Shepard tone: each octave fades in, holds, and fades out
  var contour_sum = 0.0;
  for (var i = 0; i < 3; i++) {
    let t = f32(i) + 1.0 - fract(local_octave);
    let weight = smoothstep(0.0, 1.0, t) * smoothstep(n, n - 1.0, t);

    let dist_px = (0.5 - abs(fract(plot_var) - 0.5)) * width_scale;
    contour_sum += weight * contourLinearstep(
      0.5 * (line_width + antialias),
      0.5 * (line_width - antialias),
      dist_px
    );

    width_scale *= divisions;
    plot_var /= divisions;
  }

  return contour_sum / n;
}

fn applyAtmosphere(color: vec3<f32>, world_pos: vec3<f32>) -> vec3<f32> {
  let cam_pos = globals.camera_position.xyz;
  let cam_h_m = globals.camera_position.w;
  let mpu = globals.sun_direction.w;

  let world_ray = world_pos - cam_pos;
  let frag_h_m = world_pos.y * mpu / max(uniforms.vertical_exaggeration, 1e-6);
  let phys_ray = vec3<f32>(world_ray.x * mpu, frag_h_m - cam_h_m, world_ray.z * mpu);
  let dist_m = length(phys_ray);
  if (dist_m < 0.1) { return color; }
  let view_dir = phys_ray / dist_m;

  let result = computeScattering(cam_h_m, frag_h_m, dist_m, view_dir);
  let T = result[0];
  let inscatter = result[1];

  return color * T + inscatter * (vec3<f32>(1.0) - T);
}

@fragment
fn fs_main(
  @location(0) uv: vec2<f32>,
  @location(1) world_position: vec3<f32>,
  @location(2) shade: f32,
  @location(3) elevation_m: f32,
  @location(4) slope_angle: f32,
  @location(5) slope_aspect_sin: f32,
  @location(6) slope_aspect_cos: f32,
) -> @location(0) vec4<f32> {
  let D = uniforms.grid_data_size;

  // Base color: satellite imagery or elevation-based fallback
  var base_color: vec3<f32>;
  if (uniforms.has_imagery > 0.5) {
    // Map from (D+2)-texel elevation UV to imagery UV [0,1]
    let imagery_uv = (uv * (D + 2.0) - 1.0) / D;
    let imagery = textureSampleLevel(imageryTexture, imagerySampler, imagery_uv, 0.0).rgb;
    base_color = srgbToLinear(imagery);
  } else {
    let minElev = 500.0;
    let maxElev = 6200.0;
    let normalized = clamp((elevation_m - minElev) / (maxElev - minElev), 0.0, 1.0);
    let gray = normalized * 0.15 + 0.05;
    base_color = vec3<f32>(gray, gray, gray);
  }

  // Slope angle overlay (before hillshade so shading applies to slope colors)
  let slope_opacity = uniforms.slope_angle_opacity;
  if (slope_opacity > 0.0) {
    let slope_col = slopeAngleColor(slope_angle);
    base_color = mix(base_color, slope_col.rgb, slope_col.a * slope_opacity);
  }

  // Slope aspect overlay: highlight selected compass directions within 30-45 degrees
  // Select mask based on elevation relative to treeline boundaries
  var aspect_mask = 0u;
  if (elevation_m > uniforms.treeline_upper) {
    aspect_mask = u32(uniforms.slope_aspect_mask_above);
  } else if (elevation_m > uniforms.treeline_lower) {
    aspect_mask = u32(uniforms.slope_aspect_mask_near);
  } else {
    aspect_mask = u32(uniforms.slope_aspect_mask_below);
  }
  if (aspect_mask != 0u && slope_angle > 29.0) {
    let aspect = atan2(slope_aspect_sin, slope_aspect_cos);
    let aspect_weight = slopeAspectWeight(aspect, aspect_mask);
    let aspect_fade = smoothstep(30.0, 35.0, slope_angle) * (1.0 - smoothstep(40.0, 45.0, slope_angle));
    let aspect_alpha = aspect_weight * aspect_fade * uniforms.slope_aspect_opacity;
    // Blend in sRGB (perceptual) space so the tint is equally visible
    // on both bright snow and dark rock.
    let base_srgb = pow(base_color, vec3<f32>(1.0 / 2.2));
    let blended_srgb = mix(base_srgb, vec3<f32>(0.1, 0.55, 0.05), aspect_alpha);
    base_color = pow(blended_srgb, vec3<f32>(2.2));
  }

  let lit = base_color * mix(1.0, shade, uniforms.hillshade_opacity);
  var terrain_color = clamp(lit, vec3<f32>(0.0), vec3<f32>(1.0));

  // Elevation contours (adaptive Shepard-tone blending across octaves)
  let elevation_ft = elevation_m * 3.28084;
  let contour = clamp(blendedContours(elevation_ft, uv) * 2.0, 0.0, 1.0) * uniforms.contour_opacity;
  terrain_color = mix(terrain_color, vec3<f32>(0.0), contour);

  // Apply atmospheric scattering
  var result = applyAtmosphere(terrain_color, world_position);

  // Wireframe overlay
  if (uniforms.show_wireframe > 0.5) {
    let grid_wu = uv.x * (D + 2.0) - 1.0;
    let grid_wv = uv.y * (D + 2.0) - 1.0;
    let fu = fract(grid_wu + 0.5);
    let fv = fract(grid_wv + 0.5);
    let dist_u = min(fu, 1.0 - fu);
    let dist_v = min(fv, 1.0 - fv);
    let dist_diag = abs(fu + fv - 1.0) * 0.7071;
    let dfu = fwidth(grid_wu);
    let dfv = fwidth(grid_wv);
    let dfd = fwidth(fu + fv) * 0.7071;
    let w = 0.6;
    let wire_u = 1.0 - smoothstep(dfu * (w - 0.5), dfu * (w + 0.5), dist_u);
    let wire_v = 1.0 - smoothstep(dfv * (w - 0.5), dfv * (w + 0.5), dist_v);
    let wire_d = 1.0 - smoothstep(dfd * (w - 0.5), dfd * (w + 0.5), dist_diag);
    let wire = max(max(wire_u, wire_v), wire_d);
    result = mix(result, vec3<f32>(0.0, 0.6, 0.0), wire * 0.8);
  }

  // Tile border overlay
  if (uniforms.show_tile_borders > 0.5) {
    let grid_u = uv.x * (D + 2.0) - 1.0;
    let grid_v = uv.y * (D + 2.0) - 1.0;
    let border_u = 1.5 * fwidth(grid_u);
    let border_v = 1.5 * fwidth(grid_v);
    if (grid_u < border_u || grid_u > D - border_u || grid_v < border_v || grid_v > D - border_v) {
      return vec4<f32>(1.0, 0.0, 0.0, 1.0);
    }
  }

  return finalColor(result);
}
`;function Ue(l){return(l+180)/360}function Ae(l){const e=l*Math.PI/180;return(1-Math.log(Math.tan(e)+1/Math.cos(e))/Math.PI)/2}function rt(l){const[e,t,r,i]=l.bounds;return{minZoom:l.minzoom,maxZoom:l.maxzoom,minX:Ue(e),maxX:Ue(r),minY:Ae(i),maxY:Ae(t)}}function st(l){const e=Array.isArray(l)?l[0]:l;return(t,r,i)=>e.replace("{z}",t).replace("{x}",r).replace("{y}",i)}function $t(l,e){const t=(e+.5)/(1<<l),r=2*Math.atan(Math.exp(Math.PI*(1-2*t)))-Math.PI/2;return 1/(40075016686e-3*Math.cos(r))}function ot(l,e){const t=(e+.5)/(1<<l),r=2*Math.atan(Math.exp(Math.PI*(1-2*t)))-Math.PI/2;return 40075016686e-3*Math.cos(r)/(1<<l)/512}const nt=new Float64Array(16),at=new Float64Array(16),lt=new Float64Array(16),ct=new Float64Array(16),ht=new Float64Array(16),ut=new Float64Array(16);function Bt(l,e,t,r,i,n,s){const a=1/((s||512)*(1<<e)),o=t/(1<<e),c=r/(1<<e);l[0]=a,l[1]=0,l[2]=0,l[3]=0,l[4]=0,l[5]=i*n,l[6]=0,l[7]=0,l[8]=0,l[9]=0,l[10]=a,l[11]=0,l[12]=o,l[13]=0,l[14]=c,l[15]=1}function ft(l,e,t){for(let r=0;r<4;r++)for(let i=0;i<4;i++){let n=0;for(let s=0;s<4;s++)n+=e[r+s*4]*t[s+i*4];l[r+i*4]=n}}function Qt(l,e,t,r,i,n,s,a,o){for(let c=0;c<16;c++)ct[c]=e[c],ht[c]=t[c];Bt(nt,r,i,n,s,a,o),ft(at,ct,nt),ft(lt,ht,at);for(let c=0;c<16;c++)l[c]=lt[c]}function jt(l,e,t,r,i,n,s){Bt(ut,e,t,r,i,n,s);for(let a=0;a<16;a++)l[a]=ut[a]}class Kt{constructor(e,t){this._gpu=e,this._sky=t;const{device:r,format:i,uniformBGL:n,textureBGL:s,globalUniformBGL:a,imageryBGL:o}=e;this._pipeline=r.createRenderPipeline({layout:r.createPipelineLayout({bindGroupLayouts:[n,s,a,o]}),vertex:{module:r.createShaderModule({code:Ht}),entryPoint:"vs_main",buffers:[{arrayStride:4,attributes:[{format:"uint16x2",offset:0,shaderLocation:0}]}]},fragment:{module:r.createShaderModule({code:Vt}),entryPoint:"fs_main",targets:[{format:i}]},primitive:{topology:"triangle-list",cullMode:"back",frontFace:"ccw"},depthStencil:{format:"depth32float",depthWriteEnabled:!0,depthCompare:"greater"}}),this._mvpFloat32=new Float32Array(16),this._modelFloat32=new Float32Array(16),this._uniformData=new Float32Array(56),this._globalUniformData=new Float32Array(24)}paint(e){const{canvas:t,camera:r,settings:i,renderList:n,tileManager:s,imageryTileCache:a,exaggeration:o,globalElevScale:c,lineLayers:h,circleLayers:u,textLayers:d,frustumOverlay:_,collisionManager:f,pixelRatio:g}=e,m=this._gpu,{device:p}=m,b=t.width/t.height;if(b===0||!isFinite(b))return;const{view:x,projection:v,projectionView:C}=r.update(b);let S=0;const y=[];for(const V of n){if(S>=m.MAX_TILES_PER_FRAME)break;const Te=s.getTile(V.terrainZ,V.terrainX,V.terrainY)??s.getFlatTileEntry(),_e=V.meshDataResolution,Se=ot(V.terrainZ,V.terrainY),T=ot(V.z,V.y),G=a&&a.hasImagery(V.z,V.x,V.y);Qt(this._mvpFloat32,x,v,V.z,V.x,V.y,c,o,_e),jt(this._modelFloat32,V.z,V.x,V.y,c,o,_e);const B=this._uniformData;B.set(this._mvpFloat32,0),B.set(this._modelFloat32,16),B[32]=c,B[33]=T,B[34]=o,B[35]=1/(_e+2),B[36]=i.showTileBorders?1:0,B[37]=i.showImagery?G?1:0:1,B[38]=i.hillshadeOpacity,B[39]=i.slopeAngleOpacity,B[40]=i.contourOpacity,B[41]=t.height,B[42]=i.showWireframe?1:0,B[43]=i.slopeAspectMaskAbove,B[44]=i.slopeAspectMaskNear,B[45]=i.slopeAspectMaskBelow,B[46]=i.slopeAspectOpacity,B[47]=i.treelineLower*.3048,B[48]=i.treelineUpper*.3048,B[49]=_e,B[50]=V.terrainUvOffsetU,B[51]=V.terrainUvOffsetV,B[52]=V.terrainUvScaleU,B[53]=V.terrainUvScaleV,B[54]=Se;let A;i.showImagery?G?A=a.getBindGroup(V.z,V.x,V.y):A=m.fallbackImageryBindGroup:A=m.whiteImageryBindGroup;const z=m.meshPool.getMesh(_e);p.queue.writeBuffer(m.uniformBuffer,S*m.UNIFORM_STRIDE,B.buffer,B.byteOffset,224),y.push({offset:S*m.UNIFORM_STRIDE,bindGroup:Te.bindGroup,imageryBindGroup:A,mesh:z}),S++}const{phi:w,theta:P,distance:I,center:X}=r.state,q=X[0]+I*Math.cos(P)*Math.cos(w),Y=X[1]+I*Math.sin(P),E=X[2]+I*Math.cos(P)*Math.sin(w),D=1/c,F=Y/c,Q=i.sunDirection,j=Q[0],ee=Q[1],ce=Q[2],H=i.atmosphereDensity,M=this._globalUniformData;M[0]=q,M[1]=Y,M[2]=E,M[3]=F,M[4]=j,M[5]=ee,M[6]=ce,M[7]=D,M[8]=52e-7*H,M[9]=121e-7*H,M[10]=296e-7*H,M[11]=8e3,M[12]=2e-5*H,M[13]=3e3,M[14]=.76,M[15]=20;const U=r.state.fov,L=Math.sin(w),O=-Math.cos(w),te=-Math.sin(P)*Math.cos(w),W=Math.cos(P),re=-Math.sin(P)*Math.sin(w);M[16]=L,M[17]=0,M[18]=O,M[19]=b,M[20]=te,M[21]=W,M[22]=re,M[23]=Math.tan(U/2),p.queue.writeBuffer(m.globalUniformBuffer,0,M.buffer,M.byteOffset,96),m.ensureDepthTexture(t.width,t.height);const se=p.createCommandEncoder(),ie=se.beginRenderPass({colorAttachments:[{view:m.gpuCtx.getCurrentTexture().createView(),clearValue:{r:.53,g:.66,b:.82,a:1},loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:m.depthTexture.createView(),depthClearValue:0,depthLoadOp:"clear",depthStoreOp:"store"}});this._sky.draw(ie,m.globalUniformBindGroup),ie.setPipeline(this._pipeline),ie.setBindGroup(2,m.globalUniformBindGroup);let he=null;for(const V of y)V.mesh!==he&&(he=V.mesh,ie.setVertexBuffer(0,he.vertexBuffer),ie.setIndexBuffer(he.indexBuffer,"uint32")),ie.setBindGroup(0,m.uniformBindGroup,[V.offset]),ie.setBindGroup(1,V.bindGroup),ie.setBindGroup(3,V.imageryBindGroup),ie.drawIndexed(he.indexCount);_.draw(ie,C,t.width,t.height);for(const V of h)V.visible&&V.layer.draw(ie);for(const V of u)V.visible&&V.layer.draw(ie,m.globalUniformBindGroup,!1);for(const V of d)V.visible&&V.layer.draw(ie);i.showCollisionBoxes&&f.drawDebug(ie,t.width,t.height,g,i.collisionBuffer),ie.end(),p.queue.submit([se.finish()])}}const Jt=`
struct CircleUniforms {
  projection_view: mat4x4<f32>,
  viewport_size: vec2<f32>,
  pixel_ratio: f32,
  exaggeration: f32,
  atmosphere_opacity: f32,
};

struct InstanceData {
  @location(0) world_pos: vec3<f32>,
  @location(1) radius: f32,
  @location(2) fill_color: vec4<f32>,
  @location(3) stroke_color: vec4<f32>,
  @location(4) stroke_width: f32,
  @location(5) opacity: f32,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) local_pos: vec2<f32>,
  @location(1) world_pos: vec3<f32>,
  @location(2) fill_color: vec4<f32>,
  @location(3) stroke_color: vec4<f32>,
  @location(4) radius_px: f32,
  @location(5) stroke_width_px: f32,
  @location(6) opacity: f32,
};

@group(1) @binding(0) var<uniform> circle: CircleUniforms;

// 6 vertices forming a quad: 2 triangles
const quad_positions = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0),
  vec2<f32>( 1.0, -1.0),
  vec2<f32>(-1.0,  1.0),
  vec2<f32>(-1.0,  1.0),
  vec2<f32>( 1.0, -1.0),
  vec2<f32>( 1.0,  1.0),
);

@vertex
fn vs_circle(
  @builtin(vertex_index) vertex_index: u32,
  instance: InstanceData,
) -> VertexOutput {
  var out: VertexOutput;

  let clip_center = circle.projection_view * vec4<f32>(instance.world_pos, 1.0);

  // Total size = radius + stroke_width + 1px AA margin
  let total_radius = (instance.radius + instance.stroke_width + 1.0) * circle.pixel_ratio;

  let corner = quad_positions[vertex_index];
  let offset_ndc = corner * total_radius * 2.0 / circle.viewport_size;

  out.position = vec4<f32>(
    clip_center.xy + offset_ndc * clip_center.w,
    clip_center.z,
    clip_center.w,
  );
  out.local_pos = corner * total_radius;
  out.world_pos = instance.world_pos;
  out.fill_color = instance.fill_color;
  out.stroke_color = instance.stroke_color;
  out.radius_px = instance.radius * circle.pixel_ratio;
  out.stroke_width_px = instance.stroke_width * circle.pixel_ratio;
  out.opacity = instance.opacity;

  return out;
}
`,ei=`
struct CircleUniforms {
  projection_view: mat4x4<f32>,
  viewport_size: vec2<f32>,
  pixel_ratio: f32,
  exaggeration: f32,
  atmosphere_opacity: f32,
};

`+Fe+`

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
@group(1) @binding(0) var<uniform> circle: CircleUniforms;

fn srgbToLinear(c: vec3<f32>) -> vec3<f32> {
  return pow(c, vec3<f32>(2.2));
}

fn applyAtmosphereCircle(color: vec3<f32>, world_pos: vec3<f32>) -> vec3<f32> {
  let cam_pos = globals.camera_position.xyz;
  let cam_h_m = globals.camera_position.w;
  let mpu = globals.sun_direction.w;

  let world_ray = world_pos - cam_pos;
  let frag_h_m = world_pos.y * mpu / max(circle.exaggeration, 1e-6);
  let phys_ray = vec3<f32>(world_ray.x * mpu, frag_h_m - cam_h_m, world_ray.z * mpu);
  let dist_m = length(phys_ray);
  if (dist_m < 0.1) { return color; }
  let view_dir = phys_ray / dist_m;

  let result = computeScattering(cam_h_m, frag_h_m, dist_m, view_dir);
  let T = result[0];
  let inscatter = result[1];

  return color * T + inscatter * (vec3<f32>(1.0) - T);
}

struct FragInput {
  @location(0) local_pos: vec2<f32>,
  @location(1) world_pos: vec3<f32>,
  @location(2) fill_color: vec4<f32>,
  @location(3) stroke_color: vec4<f32>,
  @location(4) radius_px: f32,
  @location(5) stroke_width_px: f32,
  @location(6) opacity: f32,
};

@fragment
fn fs_circle(in: FragInput) -> @location(0) vec4<f32> {
  let dist = length(in.local_pos);
  let outer_radius = in.radius_px + in.stroke_width_px;

  // Antialiased outer edge
  let outer_alpha = 1.0 - smoothstep(outer_radius - 0.5, outer_radius + 0.5, dist);
  if (outer_alpha < 0.001) {
    discard;
  }

  // Fill/stroke boundary
  let stroke_mix = smoothstep(in.radius_px - 0.5, in.radius_px + 0.5, dist);
  let color = mix(in.fill_color, in.stroke_color, stroke_mix);

  // Apply atmosphere scattering + tonemap
  let linear_color = srgbToLinear(color.rgb);
  let atmos_color = applyAtmosphereCircle(linear_color, in.world_pos);
  let mixed = mix(linear_color, atmos_color, circle.atmosphere_opacity);

  return vec4<f32>(linearToSrgb(acesTonemap(mixed)), color.a * outer_alpha * in.opacity);
}
`,He=1e4,je=14,Ve=je*4;function dt(l){const e=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(l);return e?[parseInt(e[1],16)/255,parseInt(e[2],16)/255,parseInt(e[3],16)/255,1]:[1,0,0,1]}class ti{constructor(e,t,r){this._source=t,this._queryElevation=r;const i=e.paint||{};this._radius=i["circle-radius"]||4,this._fillColor=dt(i["circle-color"]||"#ff3333"),this._strokeColor=dt(i["circle-stroke-color"]||"#ffffff"),this._strokeWidth=i["circle-stroke-width"]||0,this._opacity=i["circle-opacity"]!=null?i["circle-opacity"]:1,this._atmosphereOpacity=i["atmosphere-opacity"]!=null?i["atmosphere-opacity"]:1,this._pipelineDepthTest=null,this._pipelineNoDepthTest=null,this._instanceBuffer=null,this._instanceData=null,this._uniformBuffer=null,this._uniformBindGroup=null,this._visibleCount=0,this._visibleFeatures=null}init(e,t,r){this._device=e;const i=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]});this._uniformBuffer=e.createBuffer({size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this._uniformBindGroup=e.createBindGroup({layout:i,entries:[{binding:0,resource:{buffer:this._uniformBuffer}}]}),this._instanceData=new Float32Array(He*je),this._instanceBuffer=e.createBuffer({size:He*Ve,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});const n=e.createShaderModule({code:Jt}),s=e.createShaderModule({code:ei}),a=e.createPipelineLayout({bindGroupLayouts:[t,i]}),o={module:n,entryPoint:"vs_circle",buffers:[{arrayStride:Ve,stepMode:"instance",attributes:[{format:"float32x3",offset:0,shaderLocation:0},{format:"float32",offset:12,shaderLocation:1},{format:"float32x4",offset:16,shaderLocation:2},{format:"float32x4",offset:32,shaderLocation:3},{format:"float32",offset:48,shaderLocation:4},{format:"float32",offset:52,shaderLocation:5}]}]},c={module:s,entryPoint:"fs_circle",targets:[{format:r,blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}}]};this._pipelineDepthTest=e.createRenderPipeline({layout:a,vertex:o,fragment:c,primitive:{topology:"triangle-list"},depthStencil:{format:"depth32float",depthWriteEnabled:!1,depthCompare:"greater"}}),this._pipelineNoDepthTest=e.createRenderPipeline({layout:a,vertex:o,fragment:c,primitive:{topology:"triangle-list"},depthStencil:{format:"depth32float",depthWriteEnabled:!1,depthCompare:"always"}})}prepare(e,t,r,i,n,s){const a=this._source.features,o=this._instanceData;let c=0;for(let u=0;u<a.length&&c<He;u++){const d=a[u],_=this._queryElevation(d.mercatorX,d.mercatorY);if(_==null||_<=0||this._visibleFeatures&&!this._visibleFeatures.has(u))continue;const f=d.mercatorX,g=_*s*n,m=d.mercatorY,p=e[0]*f+e[4]*g+e[8]*m+e[12],b=e[1]*f+e[5]*g+e[9]*m+e[13],x=e[3]*f+e[7]*g+e[11]*m+e[15];if(x<=0)continue;const v=p/x,C=b/x,S=.2;if(v<-1-S||v>1+S||C<-1-S||C>1+S)continue;const y=c*je;o[y]=f,o[y+1]=g,o[y+2]=m,o[y+3]=this._radius,o[y+4]=this._fillColor[0],o[y+5]=this._fillColor[1],o[y+6]=this._fillColor[2],o[y+7]=this._fillColor[3],o[y+8]=this._strokeColor[0],o[y+9]=this._strokeColor[1],o[y+10]=this._strokeColor[2],o[y+11]=this._strokeColor[3],o[y+12]=this._strokeWidth,o[y+13]=this._opacity,c++}this._visibleCount=c,c>0&&this._device.queue.writeBuffer(this._instanceBuffer,0,o.buffer,0,c*Ve);const h=new Float32Array(24);h.set(e,0),h[16]=t,h[17]=r,h[18]=i,h[19]=n,h[20]=this._atmosphereOpacity,this._device.queue.writeBuffer(this._uniformBuffer,0,h)}draw(e,t,r=!0){this._visibleCount!==0&&(e.setPipeline(r?this._pipelineDepthTest:this._pipelineNoDepthTest),e.setBindGroup(0,t),e.setBindGroup(1,this._uniformBindGroup),e.setVertexBuffer(0,this._instanceBuffer),e.draw(6,this._visibleCount))}getCollisionItems(e,t,r,i,n,s){const a=this._source.features,o=t/i,c=r/i,h=this._radius+this._strokeWidth,u=[];for(let d=0;d<a.length;d++){const _=a[d],f=this._queryElevation(_.mercatorX,_.mercatorY);if(f==null||f<=0)continue;const g=_.mercatorX,m=f*s*n,p=_.mercatorY,b=e[0]*g+e[4]*m+e[8]*p+e[12],x=e[1]*g+e[5]*m+e[9]*p+e[13],v=e[2]*g+e[6]*m+e[10]*p+e[14],C=e[3]*g+e[7]*m+e[11]*p+e[15];if(C<=0)continue;const S=b/C,y=x/C;S<-1.2||S>1.2||y<-1.2||y>1.2||u.push({layerIndex:-1,featureIndex:d,sourceFeatureIndex:d,screenX:(S*.5+.5)*o,screenY:(.5-y*.5)*c,halfW:h,halfH:h,depth:v/C,clipW:C})}return u}setVisibleFeatures(e){this._visibleFeatures=e}}const Xe=96,Be=Xe/4;function ii(l,e){const{fontAtlas:t,vertexTransform:r=ri,vertexProjection:i=si,fragmentShaderBody:n=ni,colorTargets:s,depthStencil:a,multisample:o,initialCapacity:c=1024}=e,h=Array.isArray(s)?s:[s];let u=[],d=0,_=!1,f=0,g=c,m=l.createBuffer({label:"gpu-text-characters",size:g*Xe,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),p=new Float32Array(g*Be);const b=l.createBuffer({label:"gpu-text-uniforms",size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),x=l.createSampler({label:"gpu-text-sampler",magFilter:"linear",minFilter:"linear",mipmapFilter:"linear"}),v=ai(r,i),C=li(n),S=l.createShaderModule({label:"gpu-text-vertex",code:v}),y=l.createShaderModule({label:"gpu-text-fragment",code:C}),w=l.createRenderPipeline({label:"gpu-text",layout:"auto",vertex:{module:S,entryPoint:"vertexMain"},fragment:{module:y,entryPoint:"fragmentMain",targets:h},primitive:{topology:"triangle-strip",stripIndexFormat:void 0,cullMode:"none"},depthStencil:a,multisample:o}),P=l.createBindGroup({layout:w.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:b}}]});let I=X();function X(){return l.createBindGroup({layout:w.getBindGroupLayout(1),entries:[{binding:0,resource:x},{binding:1,resource:t.textureView},{binding:2,resource:{buffer:m}}]})}let q=-1,Y=-1,E=!1;function D(M){let U=0;for(const L of M)t.glyphs.has(L)&&L!==" "&&L!=="	"&&L!==`
`&&U++;return U}function F(M){if(M<=g)return;let U=g;for(;U<M;)U*=2;const L=l.createBuffer({label:"gpu-text-characters",size:U*Xe,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),O=new Float32Array(U*Be);O.set(p),f>0&&l.queue.writeBuffer(L,0,O,0,f*Be),m.destroy(),m=L,p=O,g=U,I=X()}function Q(M,U){let L=0,O=0,te=0;for(const W of M){if(W===" "){const he=t.glyphs.get(" ");L+=he?he.xAdvance*U:t.fontSize*.3*U;continue}if(W==="	"){const he=t.glyphs.get(" "),V=he?he.xAdvance:t.fontSize*.3;L+=V*4*U;continue}if(W===`
`)continue;const re=t.glyphs.get(W);if(!re)continue;L+=re.xAdvance*U;const se=-re.yOffset*U,ie=re.height*U-se;O=Math.max(O,se),te=Math.max(te,ie)}return{width:L,ascent:O,descent:te}}function j(M){const{text:U,anchor:L,offset:O,fontSize:te,color:W,strokeColor:re,strokeWidth:se,bufferOffset:ie,align:he,baseline:V}=M,Te=te/t.fontSize,_e=t.width,Se=t.height,T=Q(U,1);let G=0;he==="center"?G=-T.width/2:he==="right"&&(G=-T.width);let B=0;V==="top"?B=T.ascent:V==="middle"?B=(T.ascent-T.descent)/2:V==="bottom"&&(B=-T.descent);let A=G,z=B,k=0;for(const $ of U){if($===" "){const J=t.glyphs.get(" ");J?A+=J.xAdvance:A+=t.fontSize*.3;continue}if($==="	"){const J=t.glyphs.get(" "),ae=J?J.xAdvance:t.fontSize*.3;A+=ae*4;continue}if($===`
`)continue;const Z=t.glyphs.get($);if(!Z)continue;const R=(ie+k)*Be;p[R+0]=Z.x/_e,p[R+1]=Z.y/Se,p[R+2]=(Z.x+Z.width)/_e,p[R+3]=(Z.y+Z.height)/Se,p[R+4]=W[0],p[R+5]=W[1],p[R+6]=W[2],p[R+7]=W[3],p[R+8]=L[0],p[R+9]=L[1],p[R+10]=L[2],p[R+11]=L[3],p[R+12]=re[0],p[R+13]=re[1],p[R+14]=re[2],p[R+15]=re[3],p[R+16]=A+Z.xOffset,p[R+17]=z+Z.yOffset,p[R+18]=O[0],p[R+19]=O[1],p[R+20]=Z.width,p[R+21]=Z.height,p[R+22]=Te,p[R+23]=se,A+=Z.xAdvance,k++}const N=ie*Xe,K=ie*Be;l.queue.writeBuffer(m,N,p,K,M.characterCount*Be),M.dirty=!1}function ee(){if(!_)return;const M=u.filter(L=>!L.destroyed);let U=0;for(const L of M)L.bufferOffset!==U&&(L.bufferOffset=U,L.dirty=!0),U+=L.characterCount;f=U,u=M;for(const L of u)L.dirty&&j(L);_=!1}function ce(M){return M.length===2?[M[0],M[1],0,1]:M.length===3?[M[0],M[1],M[2],1]:[M[0],M[1],M[2],M[3]]}function H(){for(const M of u)!M.destroyed&&M.dirty&&j(M)}return{createSpan(M){const U=D(M.text);F(f+U);const L={id:d++,text:M.text,anchor:ce(M.position),offset:M.offset??[0,0],fontSize:M.fontSize??t.fontSize,color:M.color?[...M.color]:[1,1,1,1],strokeColor:M.strokeColor?[...M.strokeColor]:[0,0,0,0],strokeWidth:M.strokeWidth??0,align:M.align??"left",baseline:M.baseline??"baseline",bufferOffset:f,characterCount:U,destroyed:!1,dirty:!0};return u.push(L),f+=U,{setText(O){if(L.destroyed)return;const te=D(O);te!==L.characterCount?(L.destroyed=!0,_=!0,ee(),F(f+te),L.destroyed=!1,L.text=O,L.characterCount=te,L.bufferOffset=f,L.dirty=!0,u.push(L),f+=te):(L.text=O,L.dirty=!0)},setPosition(O){L.destroyed||(L.anchor=ce(O),L.dirty=!0)},setOffset(O){L.destroyed||(L.offset=[...O],L.dirty=!0)},setFontSize(O){L.destroyed||(L.fontSize=O,L.dirty=!0)},setColor(O){L.destroyed||(L.color=[...O],L.dirty=!0)},setStrokeColor(O){L.destroyed||(L.strokeColor=[...O],L.dirty=!0)},setStrokeWidth(O){L.destroyed||(L.strokeWidth=O,L.dirty=!0)},setAlign(O){L.destroyed||(L.align=O,L.dirty=!0)},setBaseline(O){L.destroyed||(L.baseline=O,L.dirty=!0)},getText(){return L.text},getCharacterCount(){return L.characterCount},destroy(){L.destroyed||(L.destroyed=!0,_=!0)},isDestroyed(){return L.destroyed}}},getBindGroupLayout(M){return w.getBindGroupLayout(M)},measureText(M,U){const L=(U??t.fontSize)/t.fontSize;return Q(M,L)},updateUniforms(M){const{resolution:U,viewMatrix:L}=M;if(!E||U[0]!==q||U[1]!==Y||L!==void 0){const te=new ArrayBuffer(96),W=new Float32Array(te);W[0]=U[0],W[1]=U[1],W[2]=1,W[3]=t.fieldRange??4,W[4]=t.width,W[5]=t.height,W[6]=0,W[7]=0,L?W.set(L,8):(W[8]=1,W[9]=0,W[10]=0,W[11]=0,W[12]=0,W[13]=1,W[14]=0,W[15]=0,W[16]=0,W[17]=0,W[18]=1,W[19]=0,W[20]=0,W[21]=0,W[22]=0,W[23]=1),l.queue.writeBuffer(b,0,te),q=U[0],Y=U[1],E=!0}},draw(M,U,L=[]){if(_&&ee(),H(),U.skipUniformUpdate||this.updateUniforms(U),f!==0){M.setPipeline(w),M.setBindGroup(0,P),M.setBindGroup(1,I);for(let O=0;O<L.length;O++)M.setBindGroup(O+2,L[O]);M.draw(4,f)}},getTotalCharacterCount(){return f},destroy(){m.destroy(),b.destroy()}}}const ri=`
fn getVertex(position: vec4f) -> vec4f {
  return uniforms.viewMatrix * position;
}
`,si=`
fn projectVertex(position: vec3f, uv: vec2f, color: vec4f) -> vec4f {
  // Convert screen pixels to clip space (NDC with Y flipped)
  let x = position.x / uniforms.resolution.x * 2.0 - 1.0;
  let y = 1.0 - position.y / uniforms.resolution.y * 2.0;
  return vec4f(x, y, position.z, 1.0);
}
`,oi=`
// Median of three values - core of MSDF technique.
// The median preserves sharp corners that single-channel SDF would round off.
fn msdfMedian3(r: f32, g: f32, b: f32) -> f32 {
  return max(min(r, g), min(max(r, g), b));
}

// Compute screen pixel range - how many screen pixels the SDF field range spans.
// This is the proper way to determine antialiasing width for SDF rendering.
fn msdfScreenPxRange(uv: vec2f) -> f32 {
  let unitRange = uniforms.fieldRange / uniforms.atlasSize;
  let screenTexSize = 1.0 / fwidth(uv);
  return max(0.5 * dot(unitRange, screenTexSize), 1.0);
}

// Full MSDF composite: fill + optional stroke, with antialiasing.
// Returns premultiplied-alpha RGBA.
fn msdfComposite(uv: vec2f, color: vec4f, strokeColor: vec4f, strokeWidth: f32, msdf: vec4f) -> vec4f {
  let sd = msdfMedian3(msdf.r, msdf.g, msdf.b);
  let pxRange = msdfScreenPxRange(uv);
  let screenDist = pxRange * (sd - 0.5);
  let fillAlpha = clamp(screenDist + 0.5, 0.0, 1.0);

  let hasStroke = strokeWidth > 0.0 && strokeColor.a > 0.0;
  if (!hasStroke) {
    return vec4f(color.rgb, color.a * fillAlpha);
  }

  let strokeOuterDist = screenDist + strokeWidth;
  let strokeAlpha = clamp(strokeOuterDist + 0.5, 0.0, 1.0);
  let finalAlpha = fillAlpha * color.a + strokeAlpha * strokeColor.a * (1.0 - fillAlpha * color.a);

  if (finalAlpha <= 0.0) {
    return vec4f(0.0);
  }

  let finalRgb = (color.rgb * color.a * fillAlpha + strokeColor.rgb * strokeColor.a * strokeAlpha * (1.0 - fillAlpha * color.a)) / finalAlpha;
  return vec4f(finalRgb, finalAlpha);
}
`,ni=`
fn getColor(uv: vec2f, color: vec4f, strokeColor: vec4f, strokeWidth: f32, msdf: vec4f, anchor: vec4f) -> vec4f {
  return msdfComposite(uv, color, strokeColor, strokeWidth, msdf);
}
`;function ai(l,e){return`
//------------------------------------------------------------------------------
// GPU Text Vertex Shader
//------------------------------------------------------------------------------
//
// Pipeline:
// 1. getVertex(anchor) -> clip space position
// 2. Perspective division -> NDC
// 3. NDC -> screen pixels
// 4. Text shaping (add local glyph position)
// 5. Add screen offset
// 6. projectVertex() -> final clip space position
//
//------------------------------------------------------------------------------

struct Uniforms {
  resolution: vec2f,
  fontScale: f32,      // Global font scale factor (typically 1.0)
  fieldRange: f32,     // SDF field range in atlas pixels
  atlasSize: vec2f,    // Atlas texture dimensions
  _pad: vec2f,
  viewMatrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Character instance data - ordered for proper WGSL alignment
// All spatial values (localPosition, size) are in BASE coordinates (at atlas fontSize).
// The shader applies fontSize ratio to compute final screen positions.
struct CharacterInstance {
  uvRect: vec4f,         // [u0, v0, u1, v1] - offset 0
  color: vec4f,          // RGBA - offset 16
  anchor: vec4f,         // Span anchor position (homogeneous) - offset 32
  strokeColor: vec4f,    // Stroke outline RGBA - offset 48
  localPosition: vec2f,  // Glyph position relative to anchor, BASE coords - offset 64
  offset: vec2f,         // Screen-space offset (post-scale) - offset 72
  size: vec2f,           // Glyph size in BASE pixels - offset 80
  scale: f32,            // fontSize / atlasFontSize ratio - offset 88
  strokeWidth: f32,      // Stroke outline width in pixels - offset 92
}
// Total: 96 bytes

@group(1) @binding(2) var<storage, read> characters: array<CharacterInstance>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) strokeColor: vec4f,
  @location(3) strokeWidth: f32,
  @location(4) anchor: vec4f,
}

// User-defined or default vertex transform (anchor -> clip space)
${l}

// User-defined or default vertex projection (screen pixels -> clip space)
${e}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var output: VertexOutput;

  let char = characters[instanceIndex];

  // Quad corners: 0=TL, 1=TR, 2=BL, 3=BR (triangle strip order)
  let corners = array<vec2f, 4>(
    vec2f(0.0, 0.0),  // Top-left
    vec2f(1.0, 0.0),  // Top-right
    vec2f(0.0, 1.0),  // Bottom-left
    vec2f(1.0, 1.0),  // Bottom-right
  );
  let corner = corners[vertexIndex];

  // 1. Transform anchor position (user-defined, e.g., MVP multiplication)
  let clipPos = getVertex(char.anchor);

  // 2. Perspective division: clip space -> NDC
  let ndc = clipPos.xyz / clipPos.w;

  // 3. NDC -> screen pixels
  let screenAnchor = vec2f(
    (ndc.x * 0.5 + 0.5) * uniforms.resolution.x,
    (0.5 - ndc.y * 0.5) * uniforms.resolution.y  // Y flipped for screen coords
  );

  // 4. Text shaping: compute glyph vertex position relative to anchor
  // Apply fontScale for resolution-relative sizing
  let effectiveScale = char.scale * uniforms.fontScale;
  let quadSize = char.size * effectiveScale;
  let glyphOffset = char.localPosition * effectiveScale + corner * quadSize;

  // 5. Add screen-space offset and compute final screen position
  let screenPos = screenAnchor + char.offset + glyphOffset;

  // 6. Interpolate UVs
  let uv = mix(char.uvRect.xy, char.uvRect.zw, corner);

  // 7. Apply post-projection (user-defined transformation to clip space)
  output.position = projectVertex(vec3f(screenPos, ndc.z), uv, char.color);
  output.uv = uv;
  output.color = char.color;
  output.strokeColor = char.strokeColor;
  output.strokeWidth = char.strokeWidth;
  output.anchor = char.anchor;

  return output;
}
`}function li(l){return`
//------------------------------------------------------------------------------
// GPU Text Fragment Shader
//------------------------------------------------------------------------------

struct Uniforms {
  resolution: vec2f,
  fontScale: f32,
  fieldRange: f32,
  atlasSize: vec2f,
  _pad: vec2f,
  viewMatrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var fontSampler: sampler;
@group(1) @binding(1) var fontAtlas: texture_2d<f32>;

struct FragmentInput {
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) strokeColor: vec4f,
  @location(3) strokeWidth: f32,
  @location(4) anchor: vec4f,
}

// MSDF utility functions (always available)
${oi}

// User-defined or default fragment shader body
${l}

@fragment
fn fragmentMain(input: FragmentInput) -> @location(0) vec4f {
  let msdf = textureSample(fontAtlas, fontSampler, input.uv);
  return getColor(input.uv, input.color, input.strokeColor, input.strokeWidth, msdf, input.anchor);
}
`}async function ci(l,e){const{atlasUrl:t,metadataUrl:r}=e,[i,n]=await Promise.all([fetch(r),fetch(t)]);if(!i.ok)throw new Error(`Failed to load atlas metadata: ${i.statusText}`);if(!n.ok)throw new Error(`Failed to load atlas image: ${n.statusText}`);const s=await i.json(),a=await n.blob(),o=await createImageBitmap(a),c=l.createTexture({label:"font-atlas-msdf",size:[s.width,s.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});l.queue.copyExternalImageToTexture({source:o},{texture:c},[s.width,s.height]);const h=document.createElement("canvas");h.width=s.width,h.height=s.height,h.getContext("2d").drawImage(o,0,0);const d=new Map;for(const _ of s.glyphs)d.set(_.char,{char:_.char,x:_.x,y:_.y,width:_.width,height:_.height,xOffset:_.xOffset,yOffset:_.yOffset,xAdvance:_.xAdvance});return{texture:c,textureView:c.createView(),width:s.width,height:s.height,lineHeight:s.lineHeight,fontSize:s.fontSize,fieldRange:s.fieldRange??4,glyphs:d,debugCanvas:h}}function _t(l){const e=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(l);return e?[parseInt(e[1],16)/255,parseInt(e[2],16)/255,parseInt(e[3],16)/255,1]:[1,0,0,1]}const hi=`
${Fe}

@group(2) @binding(0) var<uniform> globals: GlobalUniforms;

struct TextAtmosUniforms {
  exaggeration: f32,
  atmosphere_opacity: f32,
};
@group(2) @binding(1) var<uniform> textAtmos: TextAtmosUniforms;

fn srgbToLinear(c: vec3<f32>) -> vec3<f32> {
  return pow(c, vec3<f32>(2.2));
}

fn applyAtmosphereText(color: vec3<f32>, world_pos: vec3<f32>) -> vec3<f32> {
  let cam_pos = globals.camera_position.xyz;
  let cam_h_m = globals.camera_position.w;
  let mpu = globals.sun_direction.w;
  let exag = textAtmos.exaggeration;

  let world_ray = world_pos - cam_pos;
  let frag_h_m = world_pos.y * mpu / max(exag, 1e-6);
  let phys_ray = vec3<f32>(world_ray.x * mpu, frag_h_m - cam_h_m, world_ray.z * mpu);
  let dist_m = length(phys_ray);
  if (dist_m < 0.1) { return color; }
  let view_dir = phys_ray / dist_m;

  let result = computeScattering(cam_h_m, frag_h_m, dist_m, view_dir);
  let T = result[0];
  let inscatter = result[1];

  return color * T + inscatter * (vec3<f32>(1.0) - T);
}

fn getColor(uv: vec2f, color: vec4f, strokeColor: vec4f, strokeWidth: f32, msdf: vec4f, anchor: vec4f) -> vec4f {
  let base = msdfComposite(uv, color, strokeColor, strokeWidth, msdf);
  if (base.a <= 0.0) { return vec4f(0.0); }

  let linear_c = srgbToLinear(base.rgb);
  let atmos_c = applyAtmosphereText(linear_c, anchor.xyz);
  let mixed = mix(linear_c, atmos_c, textAtmos.atmosphere_opacity);
  return vec4f(linearToSrgb(acesTonemap(mixed)), base.a);
}
`;class ui{constructor(e,t,r){this._source=t,this._queryElevation=r;const i=e.paint||{};this._textField=i["text-field"]||"name",this._fontSize=i["text-size"]||12,this._color=_t(i["text-color"]||"#ffffff"),this._strokeColor=_t(i["text-halo-color"]||"#000000"),this._strokeWidth=i["text-halo-width"]!=null?i["text-halo-width"]:1.5,this._offset=i["text-offset"]||[0,-10],this._align=i["text-align"]||"center",this._baseline=i["text-baseline"]||"bottom",this._atmosphereOpacity=i["atmosphere-opacity"]!=null?i["atmosphere-opacity"]:1,this._textContext=null,this._spans=[],this._ready=!1,this._visibleFeatures=null,this._fontAtlas=null,this._atmosphereBindGroup=null,this._textAtmosBuffer=null,this._textAtmosData=new Float32Array(4),this._lastScaledStrokeWidth=null}init(e,t,r,i,n){this._device=e,this._fontAtlas=t,this._textContext=ii(e,{fontAtlas:t,fragmentShaderBody:hi,colorTargets:{format:r,blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}},depthStencil:{format:i,depthWriteEnabled:!1,depthCompare:"always"}}),this._textAtmosBuffer=e.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const s=this._textContext.getBindGroupLayout(2);this._atmosphereBindGroup=e.createBindGroup({layout:s,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:this._textAtmosBuffer}}]});for(let a=0;a<this._source.features.length;a++){const o=this._source.features[a],c=o.properties[this._textField];if(!c)continue;const h=this._textContext.createSpan({text:String(c),position:[0,0,0],fontSize:this._fontSize,color:this._color,strokeColor:this._strokeColor,strokeWidth:this._strokeWidth,offset:this._offset,align:this._align,baseline:this._baseline}),u=this._textContext.measureText(String(c),this._fontSize);this._spans.push({span:h,feature:o,sourceIndex:a,textWidth:u.width,ascent:u.ascent,descent:u.descent})}this._ready=!0}prepare(e,t,r,i,n,s){if(!this._ready)return;const a=this._strokeWidth*i;if(a!==this._lastScaledStrokeWidth){this._lastScaledStrokeWidth=a;for(const{span:u}of this._spans)u.setStrokeWidth(a)}for(let u=0;u<this._spans.length;u++){const{span:d,feature:_}=this._spans[u];if(this._visibleFeatures&&!this._visibleFeatures.has(u)){d.setPosition([0,0,0,0]);continue}const f=_,g=this._queryElevation(f.mercatorX,f.mercatorY);if(g==null||g<=0){d.setPosition([0,0,0,0]);continue}const m=f.mercatorX,p=g*s*n,b=f.mercatorY;if(e[3]*m+e[7]*p+e[11]*b+e[15]<=0){d.setPosition([0,0,0,0]);continue}d.setPosition([m,p,b,1])}const o=t/i,c=r/i;this._textContext.updateUniforms({resolution:[o,c],viewMatrix:e});const h=this._textAtmosData;h[0]=n,h[1]=this._atmosphereOpacity,this._device.queue.writeBuffer(this._textAtmosBuffer,0,h)}draw(e){this._ready&&this._textContext.getTotalCharacterCount()!==0&&this._textContext.draw(e,{resolution:[1,1],skipUniformUpdate:!0},[this._atmosphereBindGroup])}getCollisionItems(e,t,r,i,n,s){if(!this._ready)return[];const a=t/i,o=r/i,c=[];for(let h=0;h<this._spans.length;h++){const{feature:u,sourceIndex:d,textWidth:_,ascent:f,descent:g}=this._spans[h],m=u,p=this._queryElevation(m.mercatorX,m.mercatorY);if(p==null||p<=0)continue;const b=m.mercatorX,x=p*s*n,v=m.mercatorY,C=e[0]*b+e[4]*x+e[8]*v+e[12],S=e[1]*b+e[5]*x+e[9]*v+e[13],y=e[2]*b+e[6]*x+e[10]*v+e[14],w=e[3]*b+e[7]*x+e[11]*v+e[15];if(w<=0)continue;const P=C/w,I=S/w;if(P<-1.2||P>1.2||I<-1.2||I>1.2)continue;let X=(P*.5+.5)*a+this._offset[0],q=(.5-I*.5)*o+this._offset[1];const Y=_/2,E=(f+g)/2;this._align==="left"?X+=Y:this._align==="right"&&(X-=Y),this._baseline==="top"?q+=E:this._baseline==="bottom"&&(q-=E),c.push({layerIndex:-1,featureIndex:h,sourceFeatureIndex:d,screenX:X,screenY:q,halfW:Y,halfH:E,depth:y/w,clipW:w})}return c}setVisibleFeatures(e){this._visibleFeatures=e}destroy(){this._textContext&&this._textContext.destroy(),this._textAtmosBuffer&&this._textAtmosBuffer.destroy()}}function We(l){const e=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(l);return e?[parseInt(e[1],16)/255,parseInt(e[2],16)/255,parseInt(e[3],16)/255,1]:[1,0,0,1]}const fi=`
@group(1) @binding(0) var<storage, read> positions: array<vec4f>;

struct LineUniforms {
  projectionView: mat4x4f,
  lineColor: vec4f,
  borderColor: vec4f,
  lineWidth: f32,
  borderWidth: f32,
  pixelRatio: f32,
  exaggeration: f32,
  atmosphereOpacity: f32,
  depthOffset: f32,
  _p2: f32, _p3: f32,
};
@group(2) @binding(0) var<uniform> line: LineUniforms;

struct Vertex {
  position: vec4f,
  width: f32,
  anchor: vec3f,
}

fn getVertex(index: u32) -> Vertex {
  let p = positions[index];
  var clip = line.projectionView * p;
  // Reversed-z depth bias: add a fraction of clip.w so the NDC offset is
  // constant (distance-independent), lifting lines above terrain at all
  // zoom levels without floating visibly at close range.
  clip.z += line.depthOffset * clip.w;
  return Vertex(clip, line.lineWidth * line.pixelRatio, p.xyz);
}
`,di=`
${Fe}

@group(2) @binding(0) var<uniform> line: LineUniforms;
@group(2) @binding(1) var<uniform> globals: GlobalUniforms;

struct LineUniforms {
  projectionView: mat4x4f,
  lineColor: vec4f,
  borderColor: vec4f,
  lineWidth: f32,
  borderWidth: f32,
  pixelRatio: f32,
  exaggeration: f32,
  atmosphereOpacity: f32,
  _p1: f32, _p2: f32, _p3: f32,
};

fn srgbToLinear(c: vec3<f32>) -> vec3<f32> {
  return pow(c, vec3<f32>(2.2));
}

fn applyAtmosphereLine(color: vec3<f32>, world_pos: vec3<f32>) -> vec3<f32> {
  let cam_pos = globals.camera_position.xyz;
  let cam_h_m = globals.camera_position.w;
  let mpu = globals.sun_direction.w;
  let exag = line.exaggeration;

  let world_ray = world_pos - cam_pos;
  let frag_h_m = world_pos.y * mpu / max(exag, 1e-6);
  let phys_ray = vec3<f32>(world_ray.x * mpu, frag_h_m - cam_h_m, world_ray.z * mpu);
  let dist_m = length(phys_ray);
  if (dist_m < 0.1) { return color; }
  let view_dir = phys_ray / dist_m;

  let result = computeScattering(cam_h_m, frag_h_m, dist_m, view_dir);
  let T = result[0];
  let inscatter = result[1];

  return color * T + inscatter * (vec3<f32>(1.0) - T);
}

fn getColor(lineCoord: vec2f, anchor: vec3f) -> vec4f {
  let totalWidth = line.lineWidth * line.pixelRatio;
  let borderW = line.borderWidth * line.pixelRatio;

  // SDF: distance from line center in pixels
  let sdf = length(lineCoord) * totalWidth;

  // Border edge at (totalWidth - borderWidth) from center
  let borderEdge = totalWidth - borderW;
  let t = smoothstep(borderEdge - 1.0, borderEdge + 1.0, sdf);

  // Convert sRGB input colors to linear, blend in linear space
  let lineLinear = srgbToLinear(line.lineColor.rgb);
  let borderLinear = srgbToLinear(line.borderColor.rgb);
  var linear = mix(lineLinear, borderLinear, t);
  var alpha = mix(line.lineColor.a, line.borderColor.a, t);

  // Anti-alias outer edge
  let outerAlpha = 1.0 - smoothstep(totalWidth - 1.0, totalWidth + 1.0, sdf);
  alpha *= outerAlpha;

  if (alpha <= 0.0) {
    return vec4f(0.0);
  }

  // Apply atmosphere scattering in linear space, then convert back to sRGB.
  // No ACES tonemap — line colors are LDR UI elements, not HDR scene content.
  let atmos = applyAtmosphereLine(linear, anchor);
  let final_linear = mix(linear, atmos, line.atmosphereOpacity);
  return vec4f(linearToSrgb(final_linear), alpha);
}
`,pt=128;class mt{constructor(e,t,r){this._source=t,this._queryElevation=r;const i=e.paint||{};this._lineColor=We(i["line-color"]||"#ff8800"),this._borderColor=We(i["line-border-color"]||"#331100"),this._lineWidth=i["line-width"]||3,this._borderWidth=i["line-border-width"]||0,this._atmosphereOpacity=i["atmosphere-opacity"]!=null?i["atmosphere-opacity"]:1,this._gpuLines=null,this._positionBuffer=null,this._uniformBuffer=null,this._sharedBindGroup=null,this._polylines=[],this._positionData=null,this._cachedElevations=null,this._elevationsDirty=!0,this._lastExaggeration=-1,this._positionsDirty=!0,this._device=null}init(e,t,r,i){this._device=e,this._globalUniformBuffer=r,this._depthOffset=1e-5,this._gpuLines=i(e,{colorTargets:{format:t,blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}},join:"bevel",cap:"square",depthStencil:{format:"depth32float",depthWriteEnabled:!1,depthCompare:"greater"},vertexShaderBody:fi,fragmentShaderBody:di})}_ensureBuffers(){if(this._positionBuffer)return;const e=this._source.lineFeatures;if(e.length===0)return;const t=this._device,r=16;let i=0;for(const s of e)i=Math.ceil(i/r)*r,i+=s.coordinates.length;if(i===0)return;this._positionBuffer=t.createBuffer({size:i*16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this._positionData=new Float32Array(i*4),this._cachedElevations=new Float32Array(i);let n=0;for(const s of e){n=Math.ceil(n/r)*r;const a=s.coordinates.length,o=t.createBindGroup({layout:this._gpuLines.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:this._positionBuffer,offset:n*16,size:a*16}}]});this._polylines.push({offset:n,count:a,feature:s,dataBindGroup:o}),n+=a}this._uniformBuffer=t.createBuffer({size:pt,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this._sharedBindGroup=t.createBindGroup({layout:this._gpuLines.getBindGroupLayout(2),entries:[{binding:0,resource:{buffer:this._uniformBuffer}},{binding:1,resource:{buffer:this._globalUniformBuffer}}]})}invalidateElevations(){this._elevationsDirty=!0}prepare(e,t,r,i,n,s){if(!this._gpuLines||(this._ensureBuffers(),this._polylines.length===0))return;if(this._elevationCarryover){for(const o of this._polylines)for(let c=0;c<o.count;c++){const h=o.feature.coordinates[c],u=this._elevationCarryover.get(h.mercatorX+","+h.mercatorY);u>0&&(this._cachedElevations[o.offset+c]=u)}this._elevationCarryover=null,this._positionsDirty=!0}if(this._elevationsDirty){const o=this._cachedElevations;for(const c of this._polylines)for(let h=0;h<c.count;h++){const u=c.feature.coordinates[h],d=this._queryElevation(u.mercatorX,u.mercatorY);d!=null&&d>0&&o[c.offset+h]!==d&&(o[c.offset+h]=d,this._positionsDirty=!0)}this._elevationsDirty=!1}if(this._positionsDirty||n!==this._lastExaggeration||s!==this._lastGlobalElevScale){const o=this._positionData,c=this._cachedElevations;for(const h of this._polylines)for(let u=0;u<h.count;u++){const d=h.feature.coordinates[u],_=c[h.offset+u],f=(h.offset+u)*4;_==null||_<=0?(o[f]=d.mercatorX,o[f+1]=0,o[f+2]=d.mercatorY,o[f+3]=1):(o[f]=d.mercatorX,o[f+1]=(_+3)*s*n,o[f+2]=d.mercatorY,o[f+3]=1)}this._device.queue.writeBuffer(this._positionBuffer,0,o),this._lastExaggeration=n,this._lastGlobalElevScale=s,this._positionsDirty=!1}const a=new Float32Array(pt/4);a.set(e,0),a[16]=this._lineColor[0],a[17]=this._lineColor[1],a[18]=this._lineColor[2],a[19]=this._lineColor[3],a[20]=this._borderColor[0],a[21]=this._borderColor[1],a[22]=this._borderColor[2],a[23]=this._borderColor[3],a[24]=this._lineWidth,a[25]=this._borderWidth,a[26]=i,a[27]=n,a[28]=this._atmosphereOpacity,a[29]=this._depthOffset,this._device.queue.writeBuffer(this._uniformBuffer,0,a),this._canvasW=t,this._canvasH=r}draw(e){if(!(!this._gpuLines||this._polylines.length===0))for(const t of this._polylines)this._gpuLines.draw(e,{vertexCount:t.count,resolution:[this._canvasW,this._canvasH]},[t.dataBindGroup,this._sharedBindGroup])}replaceSource(e,t){this._positionBuffer&&this._positionBuffer.destroy(),this._uniformBuffer&&this._uniformBuffer.destroy(),this._source=e,this._positionBuffer=null,this._uniformBuffer=null,this._sharedBindGroup=null,this._polylines=[],this._positionData=null,this._cachedElevations=null,this._elevationCarryover=t||null,this._elevationsDirty=!0,this._positionsDirty=!0}destroy(){this._gpuLines&&this._gpuLines.destroy(),this._positionBuffer&&this._positionBuffer.destroy(),this._uniformBuffer&&this._uniformBuffer.destroy()}}class gt{constructor(){this.features=[],this.lineFeatures=[]}async load(e,t={}){let r;typeof e=="string"?r=await(await fetch(e)).json():r=e;const i=t.simplify,n=t.simplifyFn;this.features=[],this.lineFeatures=[];for(const s of r.features)if(s.geometry){if(s.geometry.type==="Point"){const[a,o]=s.geometry.coordinates;this.features.push({mercatorX:Ue(a),mercatorY:Ae(o),lon:a,lat:o,properties:s.properties||{}})}else if(s.geometry.type==="LineString"||s.geometry.type==="MultiLineString"){const a=s.geometry.type==="MultiLineString"?s.geometry.coordinates:[s.geometry.coordinates];let o=[];for(const h of a)for(const u of h){const d=o[o.length-1];d&&d[0]===u[0]&&d[1]===u[1]||o.push(u)}if(i!=null&&n){const h=o.map(([d,_,f])=>({x:d,y:_,elev:f||0}));o=n(h,i,!0).map(d=>[d.x,d.y,d.elev])}const c=o.map(([h,u,d])=>({mercatorX:Ue(h),mercatorY:Ae(u),elevation:d||0,lon:h,lat:u}));this.lineFeatures.push({coordinates:c,properties:s.properties||{}})}}return this}}function Ke(l,e,t,r,i,n,s){if(s>=n)return;const a=(l.mercatorX+e.mercatorX)/2,o=(l.mercatorY+e.mercatorY)/2,c=r(l.mercatorX,l.mercatorY),h=r(e.mercatorX,e.mercatorY),u=r(a,o);if(c==null||h==null||u==null||c<=0||h<=0||u<=0)return;const d=(c+h)/2;if(Math.abs(u-d)>i){const _={mercatorX:a,mercatorY:o};Ke(l,_,t,r,i,n,s+1),t.push(_),Ke(_,e,t,r,i,n,s+1)}}class _i{constructor(e){this._lineLayers=[],this._circleLayers=[],this._textLayers=[],this._device=e.device,this._format=e.format,this._globalUniformBuffer=e.globalUniformBuffer,this._globalUniformBGL=e.globalUniformBGL,this._createGPULines=e.createGPULines,this._queryElevation=e.queryElevation,this._onDirty=e.onDirty}async initLayers(e,t,r,i){const n=this._device,s=this._format,a=this._globalUniformBGL,o=this._queryElevation,c=[],h={};for(const u of e){const d=t[u.source];if(!d)throw new Error(`Feature layer "${u.id}" references unknown source "${u.source}"`);if(!h[u.source]){const f=new gt;h[u.source]=f,c.push(f.load(d.data,{...d,simplifyFn:i}))}const _=u.collision!==!1;if(u.type==="circle"){const f=new ti(u,h[u.source],(g,m)=>o(g,m));f.init(n,a,s),f._collision=_,f._sourceId=u.source,this._circleLayers.push({id:u.id,layer:f,config:u,visible:!0,userCreated:!1})}else if(u.type==="text"){const f=new ui(u,h[u.source],(g,m)=>o(g,m));f._collision=_,f._sourceId=u.source,this._textLayers.push({id:u.id,layer:f,config:u,visible:!0,userCreated:!1})}else if(u.type==="line"){const f=new mt(u,h[u.source],(g,m)=>o(g,m));f.init(n,s,this._globalUniformBuffer,this._createGPULines),this._lineLayers.push({id:u.id,layer:f,config:u,visible:!0,userCreated:!1,_sourceRef:h[u.source]})}}if(await Promise.all(c),r&&this._textLayers.length>0){const u=await ci(n,{atlasUrl:r.atlas,metadataUrl:r.metadata});for(const d of this._textLayers)d.layer.init(n,u,s,"depth32float",this._globalUniformBuffer)}}getLayers(){const e=[];for(const t of this._lineLayers)e.push({id:t.id,type:"line",visible:t.visible,userCreated:t.userCreated,paint:{"line-color":t.layer._lineColor,"line-border-color":t.layer._borderColor,"line-width":t.layer._lineWidth,"line-border-width":t.layer._borderWidth}});for(const t of this._circleLayers)e.push({id:t.id,type:"circle",visible:t.visible,userCreated:t.userCreated,paint:{"circle-color":t.layer._fillColor,"circle-stroke-color":t.layer._strokeColor,"circle-radius":t.layer._radius,"circle-stroke-width":t.layer._strokeWidth}});for(const t of this._textLayers)e.push({id:t.id,type:"text",visible:t.visible,userCreated:t.userCreated,paint:{"text-color":t.layer._color,"text-halo-color":t.layer._strokeColor,"text-halo-width":t.layer._strokeWidth}});return e}getLayer(e){return this.getLayers().find(t=>t.id===e)||null}async addLineLayer(e,t,r={}){const i=new gt;await i.load(t);const n={id:e,type:"line",paint:r},s=new mt(n,i,(o,c)=>this._queryElevation(o,c));s.init(this._device,this._format,this._globalUniformBuffer,this._createGPULines);const a={id:e,layer:s,config:n,visible:!0,userCreated:!0,_sourceRef:i,sourceGeoJSON:t};return this._lineLayers.push(a),this._onDirty(),a}removeLayer(e){for(const t of[this._lineLayers,this._circleLayers,this._textLayers]){const r=t.findIndex(i=>i.id===e);if(r!==-1){t[r].layer.destroy&&t[r].layer.destroy(),t.splice(r,1),this._onDirty();return}}}removeLineLayer(e){this.removeLayer(e)}setLayerVisibility(e,t){for(const r of[this._lineLayers,this._circleLayers,this._textLayers]){const i=r.find(n=>n.id===e);if(i){i.visible=t,this._onDirty();return}}}setLineLayerColor(e,t){const r=this._lineLayers.find(i=>i.id===e);r&&(r.layer._lineColor=We(t),this._onDirty())}setLayerPaint(e,t,r){const i=typeof r=="string"?We(r):null;for(const n of this._lineLayers){if(n.id!==e)continue;const s=n.layer;t==="line-color"?s._lineColor=i:t==="line-border-color"?s._borderColor=i:t==="line-width"?s._lineWidth=r:t==="line-border-width"&&(s._borderWidth=r),this._onDirty();return}for(const n of this._circleLayers){if(n.id!==e)continue;const s=n.layer;t==="circle-color"?s._fillColor=i:t==="circle-stroke-color"?s._strokeColor=i:t==="circle-radius"?s._radius=r:t==="circle-stroke-width"&&(s._strokeWidth=r),this._onDirty();return}for(const n of this._textLayers){if(n.id!==e)continue;const s=n.layer;if(t==="text-color"){if(s._color=i,s._spans)for(const{span:a}of s._spans)a.setColor(i)}else if(t==="text-halo-color"){if(s._strokeColor=i,s._spans)for(const{span:a}of s._spans)a.setStrokeColor(i)}else t==="text-halo-width"&&(s._strokeWidth=r,s._lastScaledStrokeWidth=null);this._onDirty();return}}buildCollisionLayers(){const e=[];for(const t of this._circleLayers)t.visible&&e.push({layer:t.layer,collision:t.layer._collision,sourceId:t.layer._sourceId});for(const t of this._textLayers)t.visible&&e.push({layer:t.layer,collision:t.layer._collision,sourceId:t.layer._sourceId});return e}refineLineLayers(){const e=this._queryElevation;for(const t of this._lineLayers){if(!t._sourceRef)continue;const r=t._sourceRef.lineFeatures;if(!r||r.length===0)continue;t._segmentMidpoints||(t._segmentMidpoints=r.map(s=>new Array(Math.max(0,s.coordinates.length-1)).fill(null).map(()=>[])));let i=!1;const n=[];for(let s=0;s<r.length;s++){const a=r[s],o=a.coordinates,c=t._segmentMidpoints[s];for(let u=0;u<o.length-1;u++){const d=[];if(Ke(o[u],o[u+1],d,e,1,8,0),!(d.length<c[u].length)){if(d.length>c[u].length)c[u]=d,i=!0;else if(d.length>0){let _=!1;for(let f=0;f<d.length;f++)if(d[f].mercatorX!==c[u][f].mercatorX||d[f].mercatorY!==c[u][f].mercatorY){_=!0;break}_&&(c[u]=d,i=!0)}}}const h=[o[0]];for(let u=0;u<o.length-1;u++){for(const d of c[u])h.push(d);h.push(o[u+1])}n.push({coordinates:h,properties:a.properties})}if(i){const s=t.layer,a=new Map;if(s._cachedElevations&&s._polylines)for(const o of s._polylines)for(let c=0;c<o.count;c++){const h=o.feature.coordinates[c],u=s._cachedElevations[o.offset+c];u>0&&a.set(h.mercatorX+","+h.mercatorY,u)}s.replaceSource({lineFeatures:n,features:[]},a)}}}invalidateLineElevations(){for(const e of this._lineLayers)e.layer.invalidateElevations()}getLayerElevationProfile(e){const t=this._lineLayers.find(i=>i.id===e);if(!t)return null;const r=t.layer;return!r._polylines||r._polylines.length===0?null:r._polylines.map(i=>{const n=[],s=[];for(let a=0;a<i.count;a++){const o=i.feature.coordinates[a];n.push({mercatorX:o.mercatorX,mercatorY:o.mercatorY}),s.push(r._cachedElevations[i.offset+a])}return{coords:n,elevations:s}})}getLayerGeoJSON(e){const t=this._lineLayers.find(r=>r.id===e);return t?t.sourceGeoJSON?t.sourceGeoJSON:t._sourceRef?{type:"FeatureCollection",features:t._sourceRef.lineFeatures.map(r=>({type:"Feature",geometry:{type:"LineString",coordinates:r.coordinates.map(i=>[i.lon,i.lat,i.elevation||0])},properties:r.properties||{}}))}:null:null}prepareLayers(e,t,r,i,n,s){for(const a of this._circleLayers)a.visible&&a.layer.prepare(e,t,r,i,n,s);for(const a of this._textLayers)a.visible&&a.layer.prepare(e,t,r,i,n,s);for(const a of this._lineLayers)a.visible&&a.layer.prepare(e,t,r,i,n,s)}destroyAll(){for(const e of this._lineLayers)e.layer.destroy();for(const e of this._circleLayers)e.layer.destroy&&e.layer.destroy();for(const e of this._textLayers)e.layer.destroy&&e.layer.destroy()}}function De(l,e){const[t,r,i,n,s,a,o,c,h,u,d,_,f,g,m,p]=e,b=t*a-r*s,x=t*o-i*s,v=t*c-n*s,C=r*o-i*a,S=r*c-n*a,y=i*c-n*o,w=h*g-u*f,P=h*m-d*f,I=h*p-_*f,X=u*m-d*g,q=u*p-_*g,Y=d*p-_*m;let E=b*Y-x*q+v*X+C*I-S*P+y*w;return Math.abs(E)<1e-10?!1:(E=1/E,l[0]=(a*Y-o*q+c*X)*E,l[1]=(-r*Y+i*q-n*X)*E,l[2]=(g*y-m*S+p*C)*E,l[3]=(-u*y+d*S-_*C)*E,l[4]=(-s*Y+o*I-c*P)*E,l[5]=(t*Y-i*I+n*P)*E,l[6]=(-f*y+m*v-p*x)*E,l[7]=(h*y-d*v+_*x)*E,l[8]=(s*q-a*I+c*w)*E,l[9]=(-t*q+r*I-n*w)*E,l[10]=(f*S-g*v+p*b)*E,l[11]=(-h*S+u*v-_*b)*E,l[12]=(-s*X+a*P-o*w)*E,l[13]=(t*X-r*P+i*w)*E,l[14]=(-f*C+g*x-m*b)*E,l[15]=(h*C-u*x+d*b)*E,!0)}function pi(l){function e(s,a,o){const c=l[0]*s+l[4]*a+l[8]*o+l[12],h=l[1]*s+l[5]*a+l[9]*o+l[13],u=l[2]*s+l[6]*a+l[10]*o+l[14],d=l[3]*s+l[7]*a+l[11]*o+l[15];return[c/d,h/d,u/d]}const t=1,r=1e-5,i=new Float32Array(24),n=[[-1,-1],[1,-1],[1,1],[-1,1]];for(let s=0;s<4;s++){const[a,o]=n[s],c=e(a,o,t),h=e(a,o,r);i[s*3]=c[0],i[s*3+1]=c[1],i[s*3+2]=c[2],i[(s+4)*3]=h[0],i[(s+4)*3+1]=h[1],i[(s+4)*3+2]=h[2]}return i}function mi(l,e={}){const t=new Proxy({center:e.center?[...e.center]:[0,0,0],distance:e.distance||10,phi:e.phi||0,theta:e.theta||.3,fov:e.fov||Math.PI/4},{set(T,G,B){return T[G]=B,u=!0,!0}}),r=e.rotateSpeed||.01,i=e.zoomSpeed||.001,n=e.panSpeed||1,s=1e-6,a=new Float64Array(16),o=new Float64Array(16),c=new Float64Array(16),h=new Float64Array(16);let u=!0,d=1,_=!1,f=null,g=0,m=0,p=null,b=null,x=null,v=0,C=0;function S(T,G){const B=l.getBoundingClientRect(),A=(T-B.left)/B.width*2-1,z=1-(G-B.top)/B.height*2;De(h,c);const k=h;function N(Z,R,J){const ae=k[0]*Z+k[4]*R+k[8]*J+k[12],oe=k[1]*Z+k[5]*R+k[9]*J+k[13],le=k[2]*Z+k[6]*R+k[10]*J+k[14],ne=k[3]*Z+k[7]*R+k[11]*J+k[15];return[ae/ne,oe/ne,le/ne]}const K=N(A,z,1),$=N(A,z,.5);return{origin:K,direction:[$[0]-K[0],$[1]-K[1],$[2]-K[2]]}}function y(T,G){if(Math.abs(T.direction[1])<1e-10)return null;const B=(G-T.origin[1])/T.direction[1];return B<0?null:[T.origin[0]+B*T.direction[0],G,T.origin[2]+B*T.direction[2]]}let w=null,P=null;function I(T,G){X();const B=l.parentElement;if(!B)return;const A=B.getBoundingClientRect();getComputedStyle(B).position==="static"&&(B.style.position="relative");const k=document.createElement("div"),N=22,K={position:"absolute",left:"0",top:"0",width:N+"px",height:N+"px",borderRadius:"50%",boxSizing:"border-box",pointerEvents:"none"};Object.assign(k.style,{position:"absolute",left:T-A.left-N/2+"px",top:G-A.top-N/2+"px",width:N+"px",height:N+"px",pointerEvents:"none",transform:"scale(0.5)",opacity:"0",transition:"transform 0.15s ease-out, opacity 0.15s ease-out"});const $=document.createElement("div");Object.assign($.style,{...K,border:"4px solid rgba(255,255,255,0.6)"});const Z=document.createElement("div");Object.assign(Z.style,{...K,border:"2.25px solid rgba(0,0,0,0.5)"}),k.appendChild($),k.appendChild(Z),B.appendChild(k),k.offsetWidth,k.style.transform="scale(1)",k.style.opacity="1",P=k}function X(){if(!P)return;const T=P;P=null,T.style.transform="scale(1.5)",T.style.opacity="0",T.addEventListener("transitionend",()=>T.remove(),{once:!0})}function q(T,G){const{phi:B,theta:A,distance:z,center:k}=t,N=B+T,K=Math.max(-Math.PI/2+.01,Math.min(Math.PI/2-.01,A+G)),$=K-A;if(!w){t.phi=N,t.theta=K;return}const Z=k[0]+z*Math.cos(A)*Math.cos(B),R=k[1]+z*Math.sin(A),J=k[2]+z*Math.cos(A)*Math.sin(B);let ae=Z-w[0],oe=R-w[1],le=J-w[2];const ne=Math.cos(T),fe=Math.sin(T),pe=ae*ne-le*fe,me=oe,ge=ae*fe+le*ne,ve=-Math.sin(N),xe=Math.cos(N),ye=Math.cos($),we=Math.sin($),Ie=1-ye,Ce=-xe*me,At=xe*pe-ve*ge,It=ve*me,it=ve*pe+xe*ge,kt=pe*ye+Ce*we+ve*it*Ie,Dt=me*ye+At*we,Rt=ge*ye+It*we+xe*it*Ie,Gt=w[0]+kt,Ft=w[1]+Dt,zt=w[2]+Rt;t.phi=N,t.theta=K,t.center[0]=Gt-z*Math.cos(K)*Math.cos(N),t.center[1]=Ft-z*Math.sin(K),t.center[2]=zt-z*Math.cos(K)*Math.sin(N)}let Y=0,E=0,D=0,F=0,Q=0,j=0;function ee(T){const{phi:G,theta:B,distance:A,center:z,fov:k}=t,N=z[0]+A*Math.cos(B)*Math.cos(G),K=z[1]+A*Math.sin(B),$=z[2]+A*Math.cos(B)*Math.sin(G);let Z=z[0]-N,R=z[1]-K,J=z[2]-$;const ae=Math.sqrt(Z*Z+R*R+J*J);Z/=ae,R/=ae,J/=ae;let oe=R*0-J*1,le=J*0-Z*0,ne=Z*1-R*0;const fe=Math.sqrt(oe*oe+le*le+ne*ne);fe>1e-4&&(oe/=fe,le/=fe,ne/=fe);const pe=le*J-ne*R,me=ne*Z-oe*J,ge=oe*R-le*Z;a[0]=oe,a[1]=pe,a[2]=-Z,a[3]=0,a[4]=le,a[5]=me,a[6]=-R,a[7]=0,a[8]=ne,a[9]=ge,a[10]=-J,a[11]=0,a[12]=-(oe*N+le*K+ne*$),a[13]=-(pe*N+me*K+ge*$),a[14]=Z*N+R*K+J*$,a[15]=1;const ve=1/Math.tan(k/2),xe=Math.max(A*.001,1e-10);o[0]=ve/T,o[1]=0,o[2]=0,o[3]=0,o[4]=0,o[5]=ve,o[6]=0,o[7]=0,o[8]=0,o[9]=0,o[10]=0,o[11]=-1,o[12]=0,o[13]=0,o[14]=xe,o[15]=0;for(let ye=0;ye<4;ye++)for(let we=0;we<4;we++){let Ie=0;for(let Ce=0;Ce<4;Ce++)Ie+=o[ye+Ce*4]*a[Ce+we*4];c[ye+we*4]=Ie}}function ce(T,G){const{phi:B,theta:A,distance:z}=t,k=Math.sin(B),N=-Math.cos(B),K=-Math.sin(A)*Math.cos(B),$=Math.cos(A),Z=-Math.sin(A)*Math.sin(B),R=z*n;t.center[0]-=T*k*R,t.center[0]+=G*K*R,t.center[1]+=G*$*R,t.center[2]-=T*N*R,t.center[2]+=G*Z*R}function H(T,G){if(b=null,ee(d),p){const z=p(T,G);if(Array.isArray(z)&&z.length===3){b={point:[...z],altitude:z[1]};return}}const B=S(T,G),A=y(B,t.center[1]);A&&(b={point:A,altitude:t.center[1]})}function M(T,G){if(!b)return;ee(d);const B=S(T,G),A=y(B,b.altitude);A&&(t.center[0]+=b.point[0]-A[0],t.center[2]+=b.point[2]-A[2])}function U(T,G){x=null,ee(d);let B=null;if(p){const $=p(T,G);Array.isArray($)&&$.length===3&&(B=$)}if(!B){const $=S(T,G);B=y($,t.center[1])}if(!B)return;const{phi:A,theta:z}=t,k=-Math.cos(z)*Math.cos(A),N=-Math.sin(z),K=-Math.cos(z)*Math.sin(A);x={point:[...B],normal:[k,N,K]}}function L(T,G){if(!x)return;ee(d);const B=S(T,G),{point:A,normal:z}=x,k=z[0]*B.direction[0]+z[1]*B.direction[1]+z[2]*B.direction[2];if(Math.abs(k)<1e-10)return;const N=z[0]*A[0]+z[1]*A[1]+z[2]*A[2],K=z[0]*B.origin[0]+z[1]*B.origin[1]+z[2]*B.origin[2],$=(N-K)/k;if($<0)return;const Z=B.origin[0]+$*B.direction[0],R=B.origin[1]+$*B.direction[1],J=B.origin[2]+$*B.direction[2];t.center[0]+=A[0]-Z,t.center[1]+=A[1]-R,t.center[2]+=A[2]-J}function O(T){if(T.preventDefault(),g=T.clientX,m=T.clientY,f=T.shiftKey?"pan":T.button===2||T.button===1?"rotate":T.ctrlKey?"pivot":T.metaKey?"rotate":T.altKey?"zoom":"grab",f==="rotate"){if(p){const G=p(T.clientX,T.clientY);w=Array.isArray(G)&&G.length===3?G:null}I(T.clientX,T.clientY)}if(f==="grab"&&H(T.clientX,T.clientY),f==="pan"&&U(T.clientX,T.clientY),f==="zoom"){if(p){const B=p(T.clientX,T.clientY);if(Array.isArray(B)&&B.length===3){const{phi:A,theta:z,distance:k,center:N}=t,K=N[0]+k*Math.cos(z)*Math.cos(A),$=N[1]+k*Math.sin(z),Z=N[2]+k*Math.cos(z)*Math.sin(A),R=B[0]-K,J=B[1]-$,ae=B[2]-Z,oe=Math.sqrt(R*R+J*J+ae*ae),le=Math.cos(z)*Math.cos(A),ne=Math.sin(z),fe=Math.cos(z)*Math.sin(A);t.center[0]+=(k-oe)*le,t.center[1]+=(k-oe)*ne,t.center[2]+=(k-oe)*fe,t.distance=oe}}const G=l.getBoundingClientRect();v=(T.clientX-G.left-G.width/2)/G.height,C=(T.clientY-G.top-G.height/2)/G.height,I(T.clientX,T.clientY)}_=!0,l.style.cursor="grabbing",window.addEventListener("mousemove",te),window.addEventListener("mouseup",W)}function te(T){if(!_)return;const G=T.clientX-g,B=T.clientY-m;if(g=T.clientX,m=T.clientY,f==="grab")M(T.clientX,T.clientY);else if(f==="rotate")q(G*r,B*r);else if(f==="pivot"){const{phi:A,theta:z,distance:k,center:N,fov:K}=t,$=K/l.getBoundingClientRect().height,Z=N[0]+k*Math.cos(z)*Math.cos(A),R=N[1]+k*Math.sin(z),J=N[2]+k*Math.cos(z)*Math.sin(A);t.phi-=G*$,t.theta=Math.max(-Math.PI/2+.01,Math.min(Math.PI/2-.01,t.theta-B*$)),t.center[0]=Z-k*Math.cos(t.theta)*Math.cos(t.phi),t.center[1]=R-k*Math.sin(t.theta),t.center[2]=J-k*Math.cos(t.theta)*Math.sin(t.phi)}else if(f==="zoom"){const A=Math.exp(-B*.005),z=t.distance;t.distance=Math.max(s,z*A);const N=(1/(t.distance/z)-1)*2*Math.tan(t.fov/2);ce(-v*N,-C*N)}else f==="pan"&&L(T.clientX,T.clientY);u=!0}function W(){_=!1,f=null,b=null,w=null,x=null,X(),l.style.cursor="grab",window.removeEventListener("mousemove",te),window.removeEventListener("mouseup",W)}let re=!1,se=null;function ie(T){if(T.preventDefault(),!re&&p){const $=p(T.clientX,T.clientY);if(Array.isArray($)&&$.length===3){const{phi:Z,theta:R,distance:J,center:ae}=t,oe=ae[0]+J*Math.cos(R)*Math.cos(Z),le=ae[1]+J*Math.sin(R),ne=ae[2]+J*Math.cos(R)*Math.sin(Z),fe=$[0]-oe,pe=$[1]-le,me=$[2]-ne,ge=Math.sqrt(fe*fe+pe*pe+me*me),ve=Math.cos(R)*Math.cos(Z),xe=Math.sin(R),ye=Math.cos(R)*Math.sin(Z);t.center[0]+=(J-ge)*ve,t.center[1]+=(J-ge)*xe,t.center[2]+=(J-ge)*ye,t.distance=ge}re=!0}clearTimeout(se),se=setTimeout(()=>{re=!1},200);const G=l.getBoundingClientRect(),B=(T.clientX-G.left-G.width/2)/G.height,A=(T.clientY-G.top-G.height/2)/G.height,z=1+T.deltaY*i,k=t.distance;t.distance=Math.max(s,k*z);const K=(1/(t.distance/k)-1)*2*Math.tan(t.fov/2);ce(-B*K,-A*K),u=!0}function he(T){if(T.preventDefault(),T.touches.length===1)_=!0,f="grab",g=T.touches[0].clientX,m=T.touches[0].clientY,H(g,m);else if(T.touches.length===2){const G=T.touches[1].clientX-T.touches[0].clientX,B=T.touches[1].clientY-T.touches[0].clientY;if(Y=Math.sqrt(G*G+B*B),E=(T.touches[0].clientX+T.touches[1].clientX)/2,D=(T.touches[0].clientY+T.touches[1].clientY)/2,F=Math.atan2(B,G),p){ee(d);const z=p(E,D);if(w=Array.isArray(z)&&z.length===3?z:null,w){const{phi:k,theta:N,distance:K,center:$}=t,Z=$[0]+K*Math.cos(N)*Math.cos(k),R=$[1]+K*Math.sin(N),J=$[2]+K*Math.cos(N)*Math.sin(k),ae=w[0]-Z,oe=w[1]-R,le=w[2]-J,ne=Math.sqrt(ae*ae+oe*oe+le*le),fe=Math.cos(N)*Math.cos(k),pe=Math.sin(N),me=Math.cos(N)*Math.sin(k);t.center[0]+=(K-ne)*fe,t.center[1]+=(K-ne)*pe,t.center[2]+=(K-ne)*me,t.distance=ne}}I(E,D);const A=l.getBoundingClientRect();Q=(E-A.left-A.width/2)/A.height,j=(D-A.top-A.height/2)/A.height}}function V(T){if(T.preventDefault(),T.touches.length===1&&_)g=T.touches[0].clientX,m=T.touches[0].clientY,f==="grab"&&M(g,m),u=!0;else if(T.touches.length===2){const G=T.touches[1].clientX-T.touches[0].clientX,B=T.touches[1].clientY-T.touches[0].clientY,A=Math.sqrt(G*G+B*B),z=(T.touches[0].clientX+T.touches[1].clientX)/2,k=(T.touches[0].clientY+T.touches[1].clientY)/2;if(Y>0){const N=Y/A,K=t.distance;t.distance*=N,t.distance=Math.max(s,t.distance);const Z=(1/(t.distance/K)-1)*2*Math.tan(t.fov/2);ce(-Q*Z,-j*Z);const R=Math.atan2(B,G),J=R-F,ae=l.getBoundingClientRect(),oe=(k-D)/ae.height;q(-J,oe*2),u=!0,F=R}Y=A,E=z,D=k}}function Te(){_=!1,f=null,b=null,w=null,X(),Y=0,F=0}function _e(T){T.preventDefault()}l.style.cursor="grab",l.addEventListener("mousedown",O),l.addEventListener("wheel",ie,{passive:!1}),l.addEventListener("touchstart",he,{passive:!1}),l.addEventListener("touchmove",V,{passive:!1}),l.addEventListener("touchend",Te),l.addEventListener("contextmenu",_e);function Se(){l.removeEventListener("mousedown",O),l.removeEventListener("wheel",ie),l.removeEventListener("touchstart",he),l.removeEventListener("touchmove",V),l.removeEventListener("touchend",Te),l.removeEventListener("contextmenu",_e),window.removeEventListener("mousemove",te),window.removeEventListener("mouseup",W)}return{state:t,get dirty(){return u},set rotateStartCallback(T){p=T},taint(){u=!0},update(T){d=T,ee(T);const G=u;return u=!1,{view:a,projection:o,projectionView:c,dirty:G}},destroy:Se}}function qe(l){const e=[],t=l;return e.push(Le(t[3]+t[0],t[7]+t[4],t[11]+t[8],t[15]+t[12])),e.push(Le(t[3]-t[0],t[7]-t[4],t[11]-t[8],t[15]-t[12])),e.push(Le(t[3]+t[1],t[7]+t[5],t[11]+t[9],t[15]+t[13])),e.push(Le(t[3]-t[1],t[7]-t[5],t[11]-t[9],t[15]-t[13])),e.push(Le(t[2],t[6],t[10],t[14])),e.push(Le(t[3]-t[2],t[7]-t[6],t[11]-t[10],t[15]-t[14])),e}function Le(l,e,t,r){const i=Math.sqrt(l*l+e*e+t*t);return i<1e-10?[0,0,0,1]:[l/i,e/i,t/i,r/i]}function Ne(l,e,t,r){const[i,n,s,a]=l[5],o=i*e+n*t+s*r+a,c=Math.abs(o)*1e3,h=Math.max(Math.abs(t),c),u=Math.max(5*Math.sqrt(h),.01);l[4]=[-i,-n,-s,i*e+n*t+s*r+u]}function Ze(l,e,t,r,i,n,s){let a=!0;for(let o=0;o<6;o++){const[c,h,u,d]=l[o],_=c>=0?i:e,f=h>=0?n:t,g=u>=0?s:r,m=c>=0?e:i,p=h>=0?t:n,b=u>=0?r:s;if(c*_+h*f+u*g+d<0)return-1;c*m+h*p+u*b+d<0&&(a=!1)}return a?1:0}function ze(l){const e=l[0],t=l[4],r=l[8],i=-l[12],n=l[1],s=l[5],a=l[9],o=-l[13],c=l[3],h=l[7],u=l[11],d=-l[15],f=1/(e*(s*u-a*h)-t*(n*u-a*c)+r*(n*h-s*c));return[(i*(s*u-a*h)-t*(o*u-a*d)+r*(o*h-s*d))*f,(e*(o*u-a*d)-i*(n*u-a*c)+r*(n*d-o*c))*f,(e*(s*d-o*h)-t*(n*d-o*c)+i*(n*h-s*c))*f]}function Oe(l,e,t,r,i,n,s,a){const o=1/(1<<e),c=o/512,h=n-(t+.5)*o,u=s,d=a-(r+.5)*o,_=Math.sqrt(h*h+u*u+d*d);if(_<1e-10)return 1/0;const f=Math.sqrt(l[1]*l[1]+l[5]*l[5]+l[9]*l[9]);return c*f*i*.5/_}function Lt(l,e,t,r,i,n,s,a){const o=1/(1<<e),c=o/512,h=n-(t+.5)*o,u=s,d=a-(r+.5)*o,_=Math.sqrt(h*h+u*u+d*d);if(_<1e-10)return 1/0;const f=Math.max(Math.abs(s)/_,.25),g=Math.sqrt(l[1]*l[1]+l[5]*l[5]+l[9]*l[9]);return c*g*i*.5/_*f}function Re(l,e,t,r,i,n,s){const a=1/(1<<l);let o=0,c=r;const h=n.getElevationBounds(l,e,t);return h&&(o=h.minElevation*s*i,c=h.maxElevation*s*i),{minX:e*a,maxX:(e+1)*a,minY:o,maxY:c,minZ:t*a,maxZ:(t+1)*a}}const Et=14,et=4,tt=200;function de(l,e,t,r,i){if(!l.isResolved(e,t,r))return!1;const n=l.getTile(e,t,r);return!n||!n.isFlat?!0:!(e>=i)}function gi(l,e,t,r,i,n,s,a,o,c){const h=qe(l),[u,d,_]=ze(l);Ne(h,u,d,_);const f=[],g=s&&s.minZoom!=null?s.minZoom:et,m=s&&s.maxZoom!=null?s.maxZoom:Et;function p(b,x,v){if(f.length>=tt)return;const{minX:C,maxX:S,minY:y,maxY:w,minZ:P,maxZ:I}=Re(b,x,v,r,i,a,c);if(s&&(S<s.minX||C>s.maxX||I<s.minY||P>s.maxY)||Ze(h,C,y,P,S,w,I)===-1)return;if(b<g){const E=b+1,D=x*2,F=v*2;p(E,D,F),p(E,D+1,F),p(E,D,F+1),p(E,D+1,F+1);return}if(!a.hasTile(b,x,v)){if(a.isFailed(b,x,v)&&b<m){const E=b+1,D=x*2,F=v*2;p(E,D,F),p(E,D+1,F),p(E,D,F+1),p(E,D+1,F+1);return}a.requestTile(b,x,v);return}const q=a.getTile(b,x,v);if(q&&q.isFlat&&b<m){const E=b+1,D=x*2,F=v*2;p(E,D,F),p(E,D+1,F),p(E,D,F+1),p(E,D+1,F+1);return}if(b<m&&Oe(l,b,x,v,t,u,d,_)>n){const E=b+1,D=x*2,F=v*2;if(de(a,E,D,F,m)&&de(a,E,D+1,F,m)&&de(a,E,D,F+1,m)&&de(a,E,D+1,F+1,m)){const Q=f.length;if(p(E,D,F),p(E,D+1,F),p(E,D,F+1),p(E,D+1,F+1),f.length>Q)return}for(let Q=0;Q<2;Q++)for(let j=0;j<2;j++){const ee=D+j,ce=F+Q;a.hasTile(E,ee,ce)||a.requestTile(E,ee,ce)}}q&&q.isFlat||f.push({z:b,x,y:v})}return p(0,0,0),f}const $e=[512,256,128,64,32,16];function yi(l){for(const e of $e)if(e<=l)return e;return $e[$e.length-1]}function vi(l,e,t,r,i,n){const s=Math.min(l,r);let a=null;for(let o=s;o>=i;o--){const c=l-o,h=e>>c,u=t>>c;if(!n.hasTile(o,h,u))continue;const d=n.getTile(o,h,u);if(d){if(d.isFlat){a||(a={tz:o,tx:h,ty:u});continue}return{tz:o,tx:h,ty:u}}}return a}function bi(l,e,t,r){const i=l-r.tz,n=1<<i;return{z:l,x:e,y:t,terrainZ:r.tz,terrainX:r.tx,terrainY:r.ty,terrainUvOffsetU:i>0?(e&n-1)/n:0,terrainUvOffsetV:i>0?(t&n-1)/n:0,terrainUvScaleU:1/n,terrainUvScaleV:1/n,meshDataResolution:yi(512>>i)}}function xi(l,e,t,r,i,n,s,a,o,c,h,u,d){const _=qe(l),[f,g,m]=ze(l);Ne(_,f,g,m);const p=[],b=s&&s.minZoom!=null?s.minZoom:et,x=Math.max(o,c),v=d??n;function C(S,y,w){if(p.length>=tt)return;const{minX:P,maxX:I,minY:X,maxY:q,minZ:Y,maxZ:E}=Re(S,y,w,r,i,a,u);if(s&&(I<s.minX||P>s.maxX||E<s.minY||Y>s.maxY)||Ze(_,P,X,Y,I,q,E)===-1)return;if(S<b){const H=S+1,M=y*2,U=w*2;C(H,M,U),C(H,M+1,U),C(H,M,U+1),C(H,M+1,U+1);return}let D=!1;if(S<=o)if(a.hasTile(S,y,w)){const M=a.getTile(S,y,w);M&&M.isFlat&&(D=!0)}else{if(!a.isFailed(S,y,w)){a.requestTile(S,y,w);return}D=!0}const F=Oe(l,S,y,w,t,f,g,m);if(S<x&&F>v){const H=S+1,M=y*2,U=w*2;let L;if(S<o&&!D?(L=de(a,H,M,U,o)&&de(a,H,M+1,U,o)&&de(a,H,M,U+1,o)&&de(a,H,M+1,U+1,o),L&&h&&(L=!!(h(H,M,U)&h(H,M+1,U)&h(H,M,U+1)&h(H,M+1,U+1)))):L=!h||!!(h(H,M,U)&h(H,M+1,U)&h(H,M,U+1)&h(H,M+1,U+1)),L){const O=p.length;if(C(H,M,U),C(H,M+1,U),C(H,M,U+1),C(H,M+1,U+1),p.length>O)return}if(S<o&&!D)for(let O=0;O<2;O++)for(let te=0;te<2;te++){const W=M+te,re=U+O;a.hasTile(H,W,re)||a.requestTile(H,W,re)}}const j=Lt(l,S,y,w,t,f,g,m);let ee=o;if(j<n&&j>0){const H=Math.ceil(Math.log2(n/j));ee=Math.max(b,S-H)}ee=Math.min(ee,o);const ce=vi(S,y,w,ee,b,a);if(!ce){const H=Math.min(S,ee),M=S-H;a.requestTile(H,y>>M,w>>M);return}p.push(bi(S,y,w,ce))}return C(0,0,0),p}function wi(l,e,t,r,i,n,s,a,o,c){const h=qe(r),[u,d,_]=ze(r);Ne(h,u,d,_);const f=Re(l,e,t,n,s,o,c),g=o.getElevationBounds(l,e,t),m=["left","right","bottom","top","far","near"],p=[];let b=!1;for(let y=0;y<6;y++){const[w,P,I,X]=h[y],q=w>=0?f.maxX:f.minX,Y=P>=0?f.maxY:f.minY,E=I>=0?f.maxZ:f.minZ,D=w*q+P*Y+I*E+X;p.push({plane:m[y],pVertex:[q,Y,E],dist:D,culled:D<0}),D<0&&(b=!0)}const x=Oe(r,l,e,t,i,u,d,_),C=l<14&&x>a,S=[];if(C){const y=l+1,w=e*2,P=t*2;for(const[I,X]of[[w,P],[w+1,P],[w,P+1],[w+1,P+1]]){const q=Re(y,I,X,n,s,o,c),Y=o.getElevationBounds(y,I,X),E=Ze(h,q.minX,q.minY,q.minZ,q.maxX,q.maxY,q.maxZ);S.push({tile:`${y}/${I}/${X}`,bb:q,elevBounds:Y,frustum:E===-1?"outside":E===1?"inside":"intersect",hasTile:o.hasTile(y,I,X),isResolved:o.isResolved(y,I,X)})}}return{tile:`${l}/${e}/${t}`,bb:f,elevBounds:g,globalElevScale:c,frustum:p,culled:b,density:x,shouldSubdivide:C,hasTile:o.hasTile(l,e,t),isResolved:o.isResolved(l,e,t),children:S}}function Mi(l,e,t,r,i,n,s,a,o){const c=qe(l),[h,u,d]=ze(l);Ne(c,h,u,d);const _=[],f=[],g=s&&s.minZoom!=null?s.minZoom:et,m=s&&s.maxZoom!=null?s.maxZoom:Et;function p(b,x,v){if(f.length>=tt)return 0;const C=Re(b,x,v,r,i,a,o),{minX:S,maxX:y,minY:w,maxY:P,minZ:I,maxZ:X}=C;if(s&&(y<s.minX||S>s.maxX||X<s.minY||I>s.maxY))return _.push({z:b,x,y:v,action:"bounds-cull"}),0;if(Ze(c,S,w,I,y,P,X)===-1)return _.push({z:b,x,y:v,action:"frustum-cull",bb:C}),0;if(b<g){_.push({z:b,x,y:v,action:"recurse-below-data-zoom"});const F=b+1,Q=x*2,j=v*2;return p(F,Q,j),p(F,Q+1,j),p(F,Q,j+1),p(F,Q+1,j+1),0}if(!a.hasTile(b,x,v))return _.push({z:b,x,y:v,action:"not-loaded"}),0;const Y=Oe(l,b,x,v,t,h,u,d);if(b<m&&Y>n){const F=b+1,Q=x*2,j=v*2;if(de(a,F,Q,j,m)&&de(a,F,Q+1,j,m)&&de(a,F,Q,j+1,m)&&de(a,F,Q+1,j+1,m))return _.push({z:b,x,y:v,action:"subdivide",density:Y,bb:C}),p(F,Q,j),p(F,Q+1,j),p(F,Q,j+1),p(F,Q+1,j+1),f.length;_.push({z:b,x,y:v,action:"render(children-not-resolved)",density:Y,bb:C})}else _.push({z:b,x,y:v,action:"render",density:Y,bb:C});const D=a.getTile(b,x,v);return D&&D.isFlat?(_.push({z:b,x,y:v,action:"skip-flat"}),0):(f.push({z:b,x,y:v}),1)}return p(0,0,0),{rendered:f,holes:_.filter(b=>b.action.startsWith("HOLE")),log:_,eye:[h,u,d],planes:c.map((b,x)=>({name:["left","right","bottom","top","far","near"][x],abcd:b}))}}const Ge=10,yt=349525,ke=new Uint32Array(Ge);{let l=1;for(let e=0;e<Ge;e++)ke[e]=(l-1)/3,l*=4}function Ti(l){const e=new Float32Array(yt),t=new Float32Array(yt),r=Ge-1,i=ke[r],n=512,s=514;for(let a=0;a<n;a++)for(let o=0;o<n;o++){const c=a+1,h=o+1,u=l[c*s+h],d=l[c*s+h+1],_=l[(c+1)*s+h],f=l[(c+1)*s+h+1],g=i+a*n+o;e[g]=Math.min(u,d,_,f),t[g]=Math.max(u,d,_,f)}for(let a=r-1;a>=0;a--){const o=ke[a],c=ke[a+1],h=1<<a,u=1<<a+1;for(let d=0;d<h;d++)for(let _=0;_<h;_++){const f=o+d*h+_,g=d*2,m=_*2,p=c+g*u+m,b=p+1,x=c+(g+1)*u+m,v=x+1;e[f]=Math.min(e[p],e[b],e[x],e[v]),t[f]=Math.max(t[p],t[b],t[x],t[v])}}return{minElev:e,maxElev:t}}function Si(l,e,t,r,i,n,s,a,o,c,h,u){let d,_;if(r!==0){let f=(s-l)/r,g=(c-l)/r;if(f>g){const m=f;f=g,g=m}d=f,_=g}else{if(l<s||l>c)return null;d=-1/0,_=1/0}if(i!==0){let f=(a-e)/i,g=(h-e)/i;if(f>g){const m=f;f=g,g=m}f>d&&(d=f),g<_&&(_=g)}else if(e<a||e>h)return null;if(d>_)return null;if(n!==0){let f=(o-t)/n,g=(u-t)/n;if(f>g){const m=f;f=g,g=m}f>d&&(d=f),g<_&&(_=g)}else if(t<o||t>u)return null;return d>_||_<0?null:[d,_]}function vt(l,e,t,r,i,n,s,a,o,c,h,u,d,_,f){const g=c-s,m=h-a,p=u-o,b=d-s,x=_-a,v=f-o,C=i*v-n*x,S=n*b-r*v,y=r*x-i*b,w=g*C+m*S+p*y;if(w<1e-10)return-1;const P=1/w,I=l-s,X=e-a,q=t-o,Y=(I*C+X*S+q*y)*P;if(Y<0||Y>1)return-1;const E=X*p-q*m,D=q*g-I*p,F=I*m-X*g,Q=(r*E+i*D+n*F)*P;if(Q<0||Y+Q>1)return-1;const j=(b*E+x*D+v*F)*P;return j>0?j:-1}function Ci(l,e,t,r,i,n,s,a,o){let c=1/0,h=-1,u=-1;const d=new Int32Array(Ge*4*3);let _=0;d[_++]=0,d[_++]=0,d[_++]=0;const f=514;for(;_>0;){const g=d[--_],m=d[--_],p=d[--_],b=ke[p],x=1<<p,v=b+m*x+g,C=512>>>p,S=g*C,y=S+C,w=m*C,P=w+C,I=l[v],X=e[v],q=Si(r,i,n,s,a,o,S,I,w,y,X,P);if(q&&!(q[0]>=c))if(p===Ge-1){const Y=m+1,E=g+1,D=t[Y*f+E],F=t[Y*f+E+1],Q=t[(Y+1)*f+E],j=t[(Y+1)*f+E+1];let ee=vt(r,i,n,s,a,o,g,D,m,g,Q,m+1,g+1,F,m);ee>0&&ee<c&&(c=ee,h=m,u=g),ee=vt(r,i,n,s,a,o,g+1,F,m,g,Q,m+1,g+1,j,m+1),ee>0&&ee<c&&(c=ee,h=m,u=g)}else{const Y=p+1,E=m*2,D=g*2;d[_++]=Y,d[_++]=E,d[_++]=D,d[_++]=Y,d[_++]=E,d[_++]=D+1,d[_++]=Y,d[_++]=E+1,d[_++]=D,d[_++]=Y,d[_++]=E+1,d[_++]=D+1}}return c===1/0?null:{t:c,patchRow:h,patchCol:u}}const Bi=150,Li=8,Ei=new OffscreenCanvas(514,514),bt=Ei.getContext("2d",{willReadFrequently:!0}),Pi=new OffscreenCanvas(512,512),xt=Pi.getContext("2d",{willReadFrequently:!0});function Ui(l){bt.drawImage(l,0,0);const{data:e}=bt.getImageData(0,0,514,514),t=new Float32Array(514*514);let r=1/0,i=-1/0;for(let n=0;n<514*514;n++){const s=n*4,a=-1e4+(e[s]*65536+e[s+1]*256+e[s+2])*.1;t[n]=a,a<r&&(r=a),a>i&&(i=a)}return{elevations:t,minElevation:r,maxElevation:i}}function Ai(l){xt.drawImage(l,0,0);const{data:e}=xt.getImageData(0,0,512,512),t=new Float32Array(514*514);let r=1/0,i=-1/0;for(let n=0;n<512;n++)for(let s=0;s<512;s++){const a=(n*512+s)*4,o=e[a]*256+e[a+1]+e[a+2]/256-32768;t[(n+1)*514+(s+1)]=o,o<r&&(r=o),o>i&&(i=o)}for(let n=1;n<=512;n++)t[n*514]=2*t[n*514+1]-t[n*514+2];for(let n=1;n<=512;n++)t[n*514+513]=2*t[n*514+512]-t[n*514+511];for(let n=0;n<514;n++)t[n]=2*t[514+n]-t[514*2+n];for(let n=0;n<514;n++)t[513*514+n]=2*t[512*514+n]-t[511*514+n];return{elevations:t,minElevation:r,maxElevation:i}}class Ii{constructor(e,{tileUrl:t,encoding:r="terrain-rgb",workerPool:i=null}={}){this.device=e,this.tileUrl=t||((n,s,a)=>`tiles/${n}/${s}/${a}.webp`),this._encoding=r,this._decode=r==="terrarium"?Ai:Ui,this._workerPool=i,this.cache=new Map,this.pending=new Map,this.failed=new Set,this.activeRequests=0,this.requestQueue=[],this.bindGroupLayout=null,this.onTileResolved=null,this.wantedKeys=new Set,this.bounds=null,this.aabbCache=new Map}getElevationBounds(e,t,r){let i=e,n=t,s=r;for(;i>=0;){const a=this.aabbCache.get(this._key(i,n,s));if(a)return a;i--,n>>=1,s>>=1}return null}setBounds(e){this.bounds=e}setBindGroupLayout(e){this.bindGroupLayout=e,this._flatTileTexture=null,this._flatTileBindGroup=null,this._flatTileElevations=null}_ensureFlatTile(){if(this._flatTileTexture)return;this._flatTileElevations=new Float32Array(514*514),this._flatTileTexture=this.device.createTexture({size:[514,514],format:"r32float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});const e=2304;this.device.queue.writeTexture({texture:this._flatTileTexture},new Uint8Array(e*514),{bytesPerRow:e},[514,514]),this._flatTileBindGroup=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:this._flatTileTexture.createView()}]})}_cacheFlatTile(e){this._ensureFlatTile(),this.cache.set(e,{texture:this._flatTileTexture,bindGroup:this._flatTileBindGroup,elevations:this._flatTileElevations,quadtree:null,minElevation:0,maxElevation:0,lastUsed:performance.now(),isFlat:!0})}_key(e,t,r){return`${e}/${t}/${r}`}hasTile(e,t,r){const i=this._key(e,t,r);this.wantedKeys.add(i);const n=this.cache.get(i);return n?(n.lastUsed=performance.now(),!0):!1}isResolved(e,t,r){const i=this._key(e,t,r);return this.wantedKeys.add(i),this.cache.has(i)||this.failed.has(i)}isFailed(e,t,r){return this.failed.has(this._key(e,t,r))}getTile(e,t,r){const i=this._key(e,t,r),n=this.cache.get(i);return n?(n.lastUsed=performance.now(),n):null}requestTile(e,t,r){const i=this._key(e,t,r);if(this.wantedKeys.add(i),!(this.cache.has(i)||this.pending.has(i)||this.failed.has(i))){if(this.bounds&&this._isOutOfBounds(e,t,r)){this.failed.add(i);return}this.requestQueue.push({z:e,x:t,y:r,key:i}),this._processQueue()}}_isOutOfBounds(e,t,r){const i=this.bounds;if(e<i.minZoom||e>i.maxZoom)return!0;const n=1/(1<<e),s=t*n,a=(t+1)*n,o=r*n,c=(r+1)*n;return a<i.minX||s>i.maxX||c<i.minY||o>i.maxY}_processQueue(){for(;this.activeRequests<Li&&this.requestQueue.length>0;){const{z:e,x:t,y:r,key:i}=this.requestQueue.shift();if(this.cache.has(i)||this.pending.has(i)||this.failed.has(i))continue;this.activeRequests++;const n=new AbortController;this.pending.set(i,n),this._loadTile(e,t,r,i,n.signal).finally(()=>{this.pending.delete(i),this.activeRequests--,this._processQueue()})}}async _loadTile(e,t,r,i,n){try{const s=this.tileUrl(e,t,r),a=await fetch(s,{signal:n});if(!a.ok){this.failed.add(i),this._cacheFlatTile(i),this.onTileResolved&&this.onTileResolved(e,t,r);return}const o=await a.blob(),c=await createImageBitmap(o,{colorSpaceConversion:"none"});let h,u,d,_;if(this._workerPool){const p=c.width,b=c.height,v=new OffscreenCanvas(p,b).getContext("2d");v.drawImage(c,0,0);const C=v.getImageData(0,0,p,b);c.close();const S=await this._workerPool.submit("decode-"+this._encoding,{pixels:C.data,width:p,height:b},{priority:e,transfer:[C.data.buffer],signal:n});h=S.elevations,u=S.minElevation,d=S.maxElevation,_=S.paddedData}else{({elevations:h,minElevation:u,maxElevation:d}=this._decode(c)),c.close();const p=2304;_=new Uint8Array(p*514);const b=new Uint8Array(h.buffer);for(let x=0;x<514;x++)_.set(b.subarray(x*514*4,(x+1)*514*4),x*p)}if(this.aabbCache.set(i,{minElevation:u,maxElevation:d}),n.aborted)return;const f=2304,g=this.device.createTexture({size:[514,514],format:"r32float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});this.device.queue.writeTexture({texture:g},_,{bytesPerRow:f},[514,514]);const m=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:g.createView()}]});this.cache.set(i,{texture:g,bindGroup:m,elevations:h,quadtree:null,minElevation:u,maxElevation:d,lastUsed:performance.now()}),this.onTileResolved&&this.onTileResolved(e,t,r)}catch(s){if(s.name==="AbortError")return;this.failed.add(i),this._cacheFlatTile(i),this.onTileResolved&&this.onTileResolved(e,t,r)}}getFlatTileEntry(){return this._ensureFlatTile(),{texture:this._flatTileTexture,bindGroup:this._flatTileBindGroup,elevations:this._flatTileElevations,quadtree:null,minElevation:0,maxElevation:0,lastUsed:performance.now(),isFlat:!0}}ensureQuadtree(e,t,r){const i=this.cache.get(this._key(e,t,r));return i?(i.quadtree||(i.quadtree=Ti(i.elevations)),i):null}stripQuadtrees(){for(const[e,t]of this.cache)!this.wantedKeys.has(e)&&t.quadtree&&(t.quadtree=null)}cancelStale(){for(const[e,t]of this.pending)this.wantedKeys.has(e)||t.abort()}evict(){let e=0;for(const t of this.cache.values())t.isFlat||e++;for(;e>Bi;){let t=null,r=1/0;for(const[n,s]of this.cache)this.wantedKeys.has(n)||s.isFlat||s.lastUsed<r&&(r=s.lastUsed,t=n);if(!t)break;this.cache.get(t).texture.destroy(),this.cache.delete(t),e--}}beginFrame(){this.requestQueue=[],this.wantedKeys=new Set}}const ki=8;class Di{constructor({tileUrl:e}={}){this.tileUrl=e||((t,r,i)=>`sentinel_tiles/${t}/${r}/${i}.webp`),this.fetched=new Map,this.pending=new Map,this.abortControllers=new Map,this.failed=new Set,this.consumers=new Map,this.terrainToSat=new Map,this.activeRequests=0,this.requestQueue=[],this.onTileLoaded=null,this.bounds=null}setBounds(e){this.bounds=e}_key(e,t,r){return`${e}/${t}/${r}`}getBitmap(e,t,r){return this.fetched.get(this._key(e,t,r))||null}isFailed(e,t,r){return this.failed.has(this._key(e,t,r))}requestTile(e,t,r,i){const n=this._key(e,t,r);let s=this.consumers.get(n);s||(s=new Set,this.consumers.set(n,s)),s.add(i);let a=this.terrainToSat.get(i);if(a||(a=new Set,this.terrainToSat.set(i,a)),a.add(n),!(this.fetched.has(n)||this.failed.has(n)||this.pending.has(n))){if(this.bounds&&this._isOutOfBounds(e,t,r)){this.failed.add(n);return}this.requestQueue.push({z:e,x:t,y:r,key:n}),this._processQueue()}}_isOutOfBounds(e,t,r){const i=this.bounds;if(e<i.minZoom||e>i.maxZoom)return!0;const n=1/(1<<e),s=t*n,a=(t+1)*n,o=r*n,c=(r+1)*n;return a<i.minX||s>i.maxX||c<i.minY||o>i.maxY}getConsumers(e,t,r){return this.consumers.get(this._key(e,t,r))||null}removeConsumer(e){const t=this.terrainToSat.get(e);if(t){for(const r of t){const i=this.consumers.get(r);if(i&&(i.delete(e),i.size===0)){this.consumers.delete(r);const n=this.abortControllers.get(r);n&&(n.abort(),this.abortControllers.delete(r));const s=this.fetched.get(r);s&&(s.close(),this.fetched.delete(r))}}this.terrainToSat.delete(e)}}beginFrame(){this.requestQueue=[]}_processQueue(){for(;this.activeRequests<ki&&this.requestQueue.length>0;){const{z:e,x:t,y:r,key:i}=this.requestQueue.shift();if(this.fetched.has(i)||this.pending.has(i)||this.failed.has(i))continue;const n=this.consumers.get(i);if(!n||n.size===0)continue;this.activeRequests++;const s=new AbortController;this.abortControllers.set(i,s);const a=this._loadTile(e,t,r,i,s.signal);this.pending.set(i,a),a.finally(()=>{this.pending.delete(i),this.abortControllers.delete(i),this.activeRequests--,this._processQueue()})}}async _loadTile(e,t,r,i,n){try{const s=this.tileUrl(e,t,r),a=await fetch(s,{signal:n});if(!a.ok){this.failed.add(i);return}const o=await a.blob(),c=await createImageBitmap(o);this.fetched.set(i,c),this.onTileLoaded&&this.onTileLoaded(e,t,r)}catch(s){if(s.name==="AbortError")return;this.failed.add(i)}}}const ue=512;class Ri{constructor(e,t,r,i){this.device=e,this.layers=t,this.bindGroupLayout=r,this.sampler=i,this.entries=new Map,this.onUpdate=null;for(const n of t)n.imageryManager.onTileLoaded=(s,a,o)=>this._onSatelliteTileLoaded(n,s,a,o)}_key(e,t,r){return`${e}/${t}/${r}`}overlapsAnyLayer(e,t,r){const i=1/(1<<e),n=t*i,s=(t+1)*i,a=r*i,o=(r+1)*i;for(const c of this.layers){const h=c.imageryManager.bounds;if(!h||s>=h.minX&&n<=h.maxX&&o>=h.minY&&a<=h.maxY)return!0}return!1}ensureImageryTile(e,t,r){const i=this._key(e,t,r),n=this.entries.get(i);if(n){n.lastUsed=performance.now();return}const s=this.device.createTexture({size:[ue,ue],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),a=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:s.createView()},{binding:1,resource:this.sampler}]}),o=this.layers.map(h=>{const u=Math.min(e,h.maxzoom),d=e-u,_=t>>d,f=r>>d;return{satZ:u,satX:_,satY:f,d,imageryManager:h.imageryManager}}),c={texture:s,bindGroup:a,layerData:o,iz:e,ix:t,iy:r,canvas:null,ctx:null,hasContent:!1,lastUsed:performance.now()};this.entries.set(i,c);for(const h of o)h.imageryManager.requestTile(h.satZ,h.satX,h.satY,i);this._recomposite(c)}hasImagery(e,t,r){const i=this.entries.get(this._key(e,t,r));return i?i.hasContent:!1}getBindGroup(e,t,r){const i=this.entries.get(this._key(e,t,r));return i?i.bindGroup:null}_onSatelliteTileLoaded(e,t,r,i){const n=e.imageryManager.getConsumers(t,r,i);if(n){for(const s of n){const a=this.entries.get(s);a&&this._recomposite(a)}this.onUpdate&&this.onUpdate()}}_recomposite(e){const{iz:t,ix:r,iy:i}=e,n=this.layers.length===1,s=e.layerData[0];if(n&&s.d===0){const c=s.imageryManager.getBitmap(s.satZ,s.satX,s.satY);if(c&&c.width===ue&&c.height===ue){this.device.queue.copyExternalImageToTexture({source:c},{texture:e.texture},[ue,ue]),e.hasContent=!0;return}}e.canvas||(e.canvas=new OffscreenCanvas(ue,ue),e.ctx=e.canvas.getContext("2d"));const{ctx:a}=e;a.clearRect(0,0,ue,ue);let o=!1;for(let c=0;c<this.layers.length;c++){const h=this.layers[c],u=e.layerData[c];a.globalCompositeOperation=h.blend||"source-over",a.globalAlpha=h.opacity!=null?h.opacity:1,this._drawBitmapOrAncestor(a,u.imageryManager,u.satZ,u.satX,u.satY,t,r,i)&&(o=!0)}a.globalCompositeOperation="source-over",a.globalAlpha=1,o&&(this._upload(e),e.hasContent=!0)}_drawBitmapOrAncestor(e,t,r,i,n,s,a,o){const c=t.bounds?t.bounds.minZoom:0;for(let h=r;h>=c;h--){const u=r-h,d=i>>u,_=n>>u,f=t.getBitmap(h,d,_);if(!f)continue;const g=s-h;if(g===0)e.drawImage(f,0,0,ue,ue);else{const m=1<<g,p=a&m-1,b=o&m-1,x=f.width/m,v=f.height/m;e.drawImage(f,p*x,b*v,x,v,0,0,ue,ue)}return!0}return!1}_upload(e){this.device.queue.copyExternalImageToTexture({source:e.canvas},{texture:e.texture},[ue,ue])}gc(e){for(const[t,r]of this.entries)if(!(e&&e.has(t))){r.texture.destroy();for(const i of r.layerData)i.imageryManager.removeConsumer(t);this.entries.delete(t)}}}class Qe{constructor(e,t,r){this.aabb=new r(6),this.startIndex=e,this.endIndex=t,this.node0=null,this.node1=null}}const Ee=[],be=[],Me=[],Pe=[];function wt(l,e,t,r,i,n,s){let a,o;if(r!==0){let c=(s[0]-l)/r,h=(s[3]-l)/r;if(c>h){const u=c;c=h,h=u}a=c,o=h}else{if(l<s[0]||l>s[3])return null;a=-1/0,o=1/0}if(i!==0){let c=(s[1]-e)/i,h=(s[4]-e)/i;if(c>h){const u=c;c=h,h=u}c>a&&(a=c),h<o&&(o=h)}else if(e<s[1]||e>s[4])return null;if(a>o)return null;if(n!==0){let c=(s[2]-t)/n,h=(s[5]-t)/n;if(c>h){const u=c;c=h,h=u}c>a&&(a=c),h<o&&(o=h)}else if(t<s[2]||t>s[5])return null;return a>o||o<0?null:[a,o]}class Gi{constructor(e,{epsilon:t=1e-6,maxItemsPerNode:r=10}={}){this._aabbs=e;const i=this._aabbs.length/6;this._epsilon=t,this._maxItemsPerNode=r,this._aabbTypeCtor=Float64Array;const n=Uint32Array;this._idArray=new n(i);for(var s=0;s<i;s++)this._idArray[s]=s;this.root=new Qe(0,i,this._aabbTypeCtor),this.computeExtents(this.root),this._nodeSplitPtr=0,Ee.length=0,Ee[0]=this.root;let a=0;for(;this._nodeSplitPtr>=0&&a++<1e6;)this.splitNode(Ee[this._nodeSplitPtr--]);if(a>1e6)throw new Error("Uh-oh, it seems like BVH construction ran into an infinite loop.");Ee.length=0}computeExtents(e){const t=e.aabb;let r=1/0,i=1/0,n=1/0,s=-1/0,a=-1/0,o=-1/0;for(let g=e.startIndex*6,m=e.endIndex*6;g<m;g+=6)r=Math.min(this._aabbs[g],r),i=Math.min(this._aabbs[g+1],i),n=Math.min(this._aabbs[g+2],n),s=Math.max(this._aabbs[g+3],s),a=Math.max(this._aabbs[g+4],a),o=Math.max(this._aabbs[g+5],o);const c=(s+r)*.5,h=(a+i)*.5,u=(o+n)*.5,d=Math.max((s-r)*.5,this._epsilon)*(1+this._epsilon),_=Math.max((a-i)*.5,this._epsilon)*(1+this._epsilon),f=Math.max((o-n)*.5,this._epsilon)*(1+this._epsilon);t[0]=c-d,t[1]=h-_,t[2]=u-f,t[3]=c+d,t[4]=h+_,t[5]=u+f}splitNode(e){let t,r,i;const n=e.startIndex,s=e.endIndex,a=s-n;if(a<=this._maxItemsPerNode||a===0)return;const o=this._aabbs,c=this._idArray;Me[0]=e.aabb[0]+e.aabb[3],Me[1]=e.aabb[1]+e.aabb[4],Me[2]=e.aabb[2]+e.aabb[5];let h=0,u=0,d=0,_=0,f=0,g=0;for(t=n*6,r=s*6;t<r;t+=6)o[t]+o[t+3]<Me[0]?h++:_++,o[t+1]+o[t+4]<Me[1]?u++:f++,o[t+2]+o[t+5]<Me[2]?d++:g++;if(be[0]=h===0||_===0,be[1]=u===0||f===0,be[2]=d===0||g===0,be[0]&&be[1]&&be[2])return;const m=e.aabb[3]-e.aabb[0],p=e.aabb[4]-e.aabb[1],b=e.aabb[5]-e.aabb[2];let x;if(m>=p&&m>=b?x=0:p>=b?x=1:x=2,be[x]&&(x===0?x=p>=b?1:2:x===1?x=m>=b?0:2:x=m>=p?0:1,be[x])){x=3-x-(x===0||x===2?1:0);for(let ie=0;ie<3;ie++)if(!be[ie]){x=ie;break}}let v,C,S,y,w=1/0,P=1/0,I=1/0,X=-1/0,q=-1/0,Y=-1/0,E=1/0,D=1/0,F=1/0,Q=-1/0,j=-1/0,ee=-1/0;const ce=Me[x];for(v=n*6,S=(s-1)*6,C=n,y=s-1;v<=S;v+=6,C++)o[v+x]+o[v+x+3]>=ce?(i=c[C],c[C]=c[y],c[y]=i,i=o[v],E=Math.min(E,i),o[v]=o[S],o[S]=i,i=o[v+1],D=Math.min(D,i),o[v+1]=o[S+1],o[S+1]=i,i=o[v+2],F=Math.min(F,i),o[v+2]=o[S+2],o[S+2]=i,i=o[v+3],Q=Math.max(Q,i),o[v+3]=o[S+3],o[S+3]=i,i=o[v+4],j=Math.max(j,i),o[v+4]=o[S+4],o[S+4]=i,i=o[v+5],ee=Math.max(ee,i),o[v+5]=o[S+5],o[S+5]=i,C--,y--,v-=6,S-=6):(w=Math.min(w,o[v]),P=Math.min(P,o[v+1]),I=Math.min(I,o[v+2]),X=Math.max(X,o[v+3]),q=Math.max(q,o[v+4]),Y=Math.max(Y,o[v+5]));e.startIndex=e.endIndex=-1;const H=e.node0=new Qe(n,C,this._aabbTypeCtor),M=e.node1=new Qe(C,s,this._aabbTypeCtor);let U,L,O,te,W,re;const se=this._epsilon;U=(X+w)*.5,L=(q+P)*.5,O=(Y+I)*.5,te=Math.max((X-w)*.5,se)*(1+se),W=Math.max((q-P)*.5,se)*(1+se),re=Math.max((Y-I)*.5,se)*(1+se),H.aabb[0]=U-te,H.aabb[1]=L-W,H.aabb[2]=O-re,H.aabb[3]=U+te,H.aabb[4]=L+W,H.aabb[5]=O+re,U=(Q+E)*.5,L=(j+D)*.5,O=(ee+F)*.5,te=Math.max((Q-E)*.5,se)*(1+se),W=Math.max((j-D)*.5,se)*(1+se),re=Math.max((ee-F)*.5,se)*(1+se),M.aabb[0]=U-te,M.aabb[1]=L-W,M.aabb[2]=O-re,M.aabb[3]=U+te,M.aabb[4]=L+W,M.aabb[5]=O+re,C-n>this._maxItemsPerNode&&(Ee[++this._nodeSplitPtr]=e.node0),s-C>this._maxItemsPerNode&&(Ee[++this._nodeSplitPtr]=e.node1)}test(e,t){Pe.length=0;var r=0;for(Pe[0]=this.root;r>=0;){var i=Pe[r--];if(e(i.aabb)){i.node0&&(Pe[++r]=i.node0),i.node1&&(Pe[++r]=i.node1);for(var n=i.startIndex;n<i.endIndex;n++)t(this._idArray[n])}}Pe.length=0}rayIntersect(e,t,r,i,n,s){const a=[],o=[];let c=0;for(o[c++]=this.root;c>0;){const h=o[--c];if(wt(e,t,r,i,n,s,h.aabb)){h.node0&&(o[c++]=h.node0),h.node1&&(o[c++]=h.node1);for(let d=h.startIndex;d<h.endIndex;d++){const _=this._idArray[d],f=d*6,g=new Float64Array([this._aabbs[f],this._aabbs[f+1],this._aabbs[f+2],this._aabbs[f+3],this._aabbs[f+4],this._aabbs[f+5]]),m=wt(e,t,r,i,n,s,g);m&&a.push({index:_,tNear:Math.max(m[0],0)})}}}return a.sort((h,u)=>h.tNear-u.tNear),a}traversePreorder(e){const t=[];let r=this.root;for(;t.length||r;){for(;r;){const i=e(r)!==!1;i&&r.node1&&t.push(r.node1),r=i?r.node0:null}t.length&&(r=t.pop())}}traverseInorder(e){const t=[];let r=this.root;for(;r||t.length;){for(;r;)t.push(r),r=r.node0;r=t[t.length-1],t.pop(),e(r),r=r.node1}}traversePostorder(e){const t=[this.root];let r=null;for(;t.length;){const i=t[t.length-1];!r||r.node0===i||r.node1===i?i.node0?t.push(i.node0):i.node1?t.push(i.node1):(t.pop(),e(i)):i.node0===r?i.node1?t.push(i.node1):(t.pop(),e(i)):i.node1===r&&(t.pop(),e(i)),r=i}}}function Je(l,e,t){const r=t;function i(_,f,g){const m=r[0]*_+r[4]*f+r[8]*g+r[12],p=r[1]*_+r[5]*f+r[9]*g+r[13],b=r[2]*_+r[6]*f+r[10]*g+r[14],x=r[3]*_+r[7]*f+r[11]*g+r[15];return[m/x,p/x,b/x]}const n=i(l,e,1),s=i(l,e,.5),a=new Float64Array(n),o=s[0]-n[0],c=s[1]-n[1],h=s[2]-n[2],u=Math.sqrt(o*o+c*c+h*h),d=new Float64Array([o/u,c/u,h/u]);return{origin:a,direction:d}}function Pt({origin:l,direction:e,bvh:t,tileCache:r,tileList:i,verticalExaggeration:n}){const s=l[0],a=l[1],o=l[2],c=e[0],h=e[1],u=e[2],d=t.rayIntersect(s,a,o,c,h,u);if(d.length===0)return null;const _=[];for(let m=0;m<d.length;m++){const{index:p}=d[m],b=i[p];if(!b)continue;const x=r.ensureQuadtree(b.z,b.x,b.y);if(!x)continue;const{quadtree:v,elevations:C}=x,w=$t(b.z,b.y)*n,P=512*(1<<b.z),I=b.x/(1<<b.z),X=b.y/(1<<b.z),q=(s-I)*P,Y=a/w,E=(o-X)*P,D=c*P,F=h/w,Q=u*P,j=Ci(v.minElev,v.maxElev,C,q,Y,E,D,F,Q);if(!j)continue;const ee=q+D*j.t,ce=Y+F*j.t,H=E+Q*j.t,M=ee/P+I,U=ce*w,L=H/P+X;let O;const te=Math.abs(c),W=Math.abs(h),re=Math.abs(u);te>=W&&te>=re?O=(M-s)/c:W>=re?O=(U-a)/h:O=(L-o)/u,O>0&&_.push({worldPos:[M,U,L],t:O,tile:b})}if(_.length===0)return null;let f=1/0,g=null;for(let m=0;m<_.length;m++){const p=_[m];let b=!1;for(let x=0;x<_.length;x++){if(m===x)continue;const v=_[x];if(v.tile.z>p.tile.z){const C=v.tile.z-p.tile.z;if(v.tile.x>>C===p.tile.x&&v.tile.y>>C===p.tile.y){b=!0;break}}}!b&&p.t<f&&(f=p.t,g=p)}return g?{worldPos:g.worldPos,t:g.t,tile:g.tile}:null}function Fi(l){const e=[[-60,0],[-45,1500],[-30,2800],[-15,3800],[0,4e3],[15,4100],[30,4200],[40,3500],[50,2300],[60,1e3],[65,500],[70,0]];if(l<=e[0][0])return e[0][1];if(l>=e[e.length-1][0])return e[e.length-1][1];for(let t=1;t<e.length;t++)if(l<=e[t][0]){const r=(l-e[t-1][0])/(e[t][0]-e[t-1][0]);return e[t-1][1]+r*(e[t][1]-e[t-1][1])}return 0}function zi(l={}){return new Proxy({verticalExaggeration:1,densityThreshold:1,imageryDensityThreshold:1,showTileBorders:!1,freezeCoverage:!1,enableCollision:!0,showCollisionBoxes:!1,showWireframe:!1,showImagery:!0,showFeatures:!0,showRoute:!0,slopeAngleOpacity:0,slopeAspectMaskAbove:0,slopeAspectMaskNear:0,slopeAspectMaskBelow:0,slopeAspectOpacity:.95,treelineLower:2e3,treelineUpper:2500,contourOpacity:.5,collisionBuffer:4,occlusionBias:.03,atmosphereDensity:.35,hillshadeOpacity:.95,sunDirection:[.5,.7,.5],dirty:!0,...l},{set(e,t,r){return t!=="dirty"&&e[t]!==r&&(e.dirty=!0),e[t]=r,!0}})}function Oi(l){const e=document.createElement("div");return e.className="terrain-attribution",e.innerHTML=l.filter(t=>t.attribution).map(t=>t.attribution).join(" | "),e}function Yi(l){return l*360-180}function Xi(l){return Math.atan(Math.sinh(Math.PI*(1-2*l)))*180/Math.PI}function Wi(l){return(Math.atan2(-Math.cos(l),Math.sin(l))*180/Math.PI%360+360)%360}function qi(l){const e=l*Math.PI/180;return Math.atan2(Math.cos(e),-Math.sin(e))}function Ni(l){const{center:e,distance:t,phi:r,theta:i}=l,n=Yi(e[0]),s=Xi(e[2]),a=Wi(r),o=i*180/Math.PI;return`#${n.toFixed(5)}/${s.toFixed(5)}/${a.toFixed(1)}/${o.toFixed(1)}/${t.toPrecision(6)}/${e[1].toPrecision(6)}`}function Zi(l){if(!l||l.length<2)return null;const e=l.slice(1).split("/").map(Number);if(e.length<5||e.some(isNaN))return null;const[t,r,i,n,s,a]=e;return!isFinite(t)||!isFinite(r)||!isFinite(i)||!isFinite(n)||!isFinite(s)||s<=0?null:{center:[Ue(t),isFinite(a)?a:0,Ae(r)],distance:s,phi:qi(i),theta:n*Math.PI/180}}class Hi{constructor(e,t,r,i){this._device=e,this._pixelRatio=r;const n=`
@group(1) @binding(0) var<storage, read> positions: array<vec4f>;
struct FrustumUniforms { projectionView: mat4x4f, lineColor: vec4f, borderColor: vec4f, lineWidth: f32, borderWidth: f32, pixelRatio: f32, _pad: f32, };
@group(2) @binding(0) var<uniform> u: FrustumUniforms;
struct Vertex { position: vec4f, width: f32, anchor: vec3f, }
fn getVertex(index: u32) -> Vertex {
  let p = positions[index];
  let clip = u.projectionView * p;
  return Vertex(clip, u.lineWidth * u.pixelRatio, p.xyz);
}`,s=`
struct FrustumUniforms { projectionView: mat4x4f, lineColor: vec4f, borderColor: vec4f, lineWidth: f32, borderWidth: f32, pixelRatio: f32, _pad: f32, };
@group(2) @binding(0) var<uniform> u: FrustumUniforms;
fn getColor(lineCoord: vec2f, anchor: vec3f) -> vec4f {
  let totalWidth = u.lineWidth * u.pixelRatio;
  let borderW = u.borderWidth * u.pixelRatio;
  let sdf = length(lineCoord) * totalWidth;
  let borderEdge = totalWidth - borderW;
  let t = smoothstep(borderEdge - 1.0, borderEdge + 1.0, sdf);
  var rgb = mix(u.lineColor.rgb, u.borderColor.rgb, t);
  var alpha = mix(u.lineColor.a, u.borderColor.a, t);
  let outerAlpha = 1.0 - smoothstep(totalWidth - 1.0, totalWidth + 1.0, sdf);
  alpha *= outerAlpha;
  return vec4f(rgb, alpha);
}`;this._gpuLines=i(e,{colorTargets:{format:t,blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}},join:"bevel",cap:"round",depthStencil:{format:"depth32float",depthWriteEnabled:!1,depthCompare:"greater"},vertexShaderBody:n,fragmentShaderBody:s}),this._uniformBuffer=e.createBuffer({size:112,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this._sharedBindGroup=e.createBindGroup({layout:this._gpuLines.getBindGroupLayout(2),entries:[{binding:0,resource:{buffer:this._uniformBuffer}}]}),this._positionBuffer=null,this._dataBindGroup=null,this._vertexCount=0,this._frozen=!1,this._coverageProjView=null}get isFrozen(){return this._frozen}get coverageProjView(){return this._coverageProjView}freeze(e){this._frozen=!0,this._coverageProjView=new Float32Array(e);const t=new Float32Array(16);De(t,this._coverageProjView);const r=pi(t),i=20,n=[],s=u=>[r[u*3],r[u*3+1],r[u*3+2],1],a=()=>n.push([0,0,0,0]),o=u=>n.push(s(u)),c=(u,d)=>{a();const _=s(u),f=s(d);for(let g=0;g<=i;g++){const m=g/i;n.push([_[0]+(f[0]-_[0])*m,_[1]+(f[1]-_[1])*m,_[2]+(f[2]-_[2])*m,1])}};a(),o(0),o(1),o(2),o(3),o(0),a(),o(4),o(5),o(6),o(7),o(4),c(0,4),c(1,5),c(2,6),c(3,7),a();const h=new Float32Array(n.length*4);for(let u=0;u<n.length;u++)h[u*4]=n[u][0],h[u*4+1]=n[u][1],h[u*4+2]=n[u][2],h[u*4+3]=n[u][3];this._vertexCount=n.length,this._positionBuffer=this._device.createBuffer({size:h.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(this._positionBuffer,0,h),this._dataBindGroup=this._device.createBindGroup({layout:this._gpuLines.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:this._positionBuffer}}]})}unfreeze(){this._frozen=!1,this._coverageProjView=null,this._positionBuffer&&(this._positionBuffer.destroy(),this._positionBuffer=null),this._dataBindGroup=null}draw(e,t,r,i){if(!this._frozen||!this._positionBuffer)return;const n=new Float32Array(112/4);n.set(t,0),n[16]=0,n[17]=.5,n[18]=.15,n[19]=1,n[20]=1,n[21]=1,n[22]=1,n[23]=1,n[24]=4,n[25]=1.5,n[26]=this._pixelRatio,this._device.queue.writeBuffer(this._uniformBuffer,0,n),this._gpuLines.draw(e,{vertexCount:this._vertexCount,resolution:[r,i]},[this._dataBindGroup,this._sharedBindGroup])}destroy(){this._positionBuffer&&this._positionBuffer.destroy(),this._gpuLines.destroy(),this._uniformBuffer.destroy()}}function Vi(l,e=0,t=1/0,r=1/0){l.sort((s,a)=>a.depth-s.depth);const i=[],n=new Map;for(const s of l){const a=s.screenX-s.halfW-e,o=s.screenX+s.halfW+e,c=s.screenY-s.halfH-e,h=s.screenY+s.halfH+e;let u=a<0||o>t||c<0||h>r;if(!u)for(let d=0;d<i.length;d++){const _=i[d];if(a<_.maxX&&o>_.minX&&c<_.maxY&&h>_.minY){u=!0;break}}if(u){s.visible=!1;let d=n.get(s.layerIndex);d||(d=new Set,n.set(s.layerIndex,d)),d.add(s.featureIndex)}else s.visible=!0,i.push({minX:s.screenX-s.halfW,maxX:s.screenX+s.halfW,minY:s.screenY-s.halfH,maxY:s.screenY+s.halfH})}return{items:l,hiddenByLayer:n}}const $i=`
struct ColoredLineUniforms {
  resolution: vec2<f32>,
};

@group(0) @binding(0) var<uniform> u: ColoredLineUniforms;

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) color: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@vertex
fn vs_colored_line(input: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.position = vec4<f32>(
    input.position.x / u.resolution.x * 2.0 - 1.0,
    1.0 - input.position.y / u.resolution.y * 2.0,
    0.0,
    1.0
  );
  out.color = input.color;
  return out;
}

@fragment
fn fs_colored_line(input: VertexOutput) -> @location(0) vec4<f32> {
  return input.color;
}
`,Mt=1e4,Qi=8,Tt=6,St=1e3;class ji{constructor(e,t){this._device=e,this._lastCollisionTime=0,this._collisionStale=!1,this._collisionScheduled=!1,this._collisionTimer=null,this._debugItems=null;const r=e.createShaderModule({code:$i}),i=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:"uniform"}}]});this._uniformBuffer=e.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this._uniformBindGroup=e.createBindGroup({layout:i,entries:[{binding:0,resource:{buffer:this._uniformBuffer}}]}),this._vertexBuffer=e.createBuffer({size:Mt*Qi*Tt*4,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),this._linePipeline=e.createRenderPipeline({layout:e.createPipelineLayout({bindGroupLayouts:[i]}),vertex:{module:r,entryPoint:"vs_colored_line",buffers:[{arrayStride:Tt*4,attributes:[{format:"float32x2",offset:0,shaderLocation:0},{format:"float32x4",offset:8,shaderLocation:1}]}]},fragment:{module:r,entryPoint:"fs_colored_line",targets:[{format:t,blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}}]},primitive:{topology:"line-list"},depthStencil:{format:"depth32float",depthWriteEnabled:!1,depthCompare:"always"}}),this._invProjView=new Float32Array(16)}markStale(){this._debugItems||(this._collisionStale=!0)}update({enabled:e,layers:t,projectionView:r,canvasW:i,canvasH:n,pixelRatio:s,exaggeration:a,collisionBuffer:o,occlusionBias:c,bvh:h,tileManager:u,bvhTileList:d,globalElevScale:_}){const f=performance.now();if(!e){if(this._debugItems){this._debugItems=null,this._collisionScheduled&&(clearTimeout(this._collisionTimer),this._collisionScheduled=!1,this._collisionTimer=null);for(const{layer:m}of t)m.setVisibleFeatures(null)}return!1}const g=f-this._lastCollisionTime;return g>=St||this._collisionStale?(this._doCollision(t,r,i,n,s,a,o,c,h,u,d,_),this._lastCollisionTime=f,this._collisionStale=!1,this._collisionScheduled&&(clearTimeout(this._collisionTimer),this._collisionScheduled=!1,this._collisionTimer=null),!0):(this._collisionScheduled||(this._collisionScheduled=!0,this._collisionTimer=setTimeout(()=>{this._collisionScheduled=!1,this._collisionTimer=null,this._wakeCallback?.()},St-g)),!1)}set onWake(e){this._wakeCallback=e}_doCollision(e,t,r,i,n,s,a,o,c,h,u,d){const _=[];let f=0;for(const{layer:v,collision:C,sourceId:S}of e){if(C){const y=v.getCollisionItems(t,r,i,n,s,d);for(const w of y)w.layerIndex=f,w.sourceId=S;_.push(...y)}f++}const g=r/n,m=i/n;if(c&&_.length>0){De(this._invProjView,t);const v=t;for(const C of _){const S=C.screenX/g*2-1,y=1-C.screenY/m*2,w=Je(S,y,this._invProjView),P=Pt({origin:w.origin,direction:w.direction,bvh:c,tileCache:h,tileList:u,verticalExaggeration:s});if(P){const[I,X,q]=P.worldPos;v[3]*I+v[7]*X+v[11]*q+v[15]<C.clipW*(1-o)&&(C.occluded=!0)}}}const p=[];for(const v of _)v.occluded||p.push(v);Vi(p,a,g,m);const b=new Map;for(const v of _)if(v.occluded||!v.visible){let C=b.get(v.sourceId);C||(C=new Set,b.set(v.sourceId,C)),C.add(v.sourceFeatureIndex)}const x=new Map;for(const v of _){const C=b.get(v.sourceId);if(C&&C.has(v.sourceFeatureIndex))v.occluded||(v.visible=!1);else{let S=x.get(v.layerIndex);S||(S=new Set,x.set(v.layerIndex,S)),S.add(v.featureIndex)}}this._debugItems=_,f=0;for(const{layer:v,collision:C}of e)v.setVisibleFeatures(C?x.get(f)||new Set:null),f++}drawDebug(e,t,r,i,n){if(!this._debugItems||this._debugItems.length===0)return;const s=this._debugItems,a=Math.min(s.length,Mt),o=new Float32Array(a*8*6),c=n;for(let _=0;_<a;_++){const f=s[_],g=f.screenX-f.halfW-c,m=f.screenX+f.halfW+c,p=f.screenY-f.halfH-c,b=f.screenY+f.halfH+c,x=f.occluded?.2:f.visible?0:1,v=f.occluded?.4:f.visible?1:0,C=f.occluded?1:0,S=.8,y=_*8*6;o[y]=g,o[y+1]=p,o[y+2]=x,o[y+3]=v,o[y+4]=C,o[y+5]=S,o[y+6]=m,o[y+7]=p,o[y+8]=x,o[y+9]=v,o[y+10]=C,o[y+11]=S,o[y+12]=m,o[y+13]=p,o[y+14]=x,o[y+15]=v,o[y+16]=C,o[y+17]=S,o[y+18]=m,o[y+19]=b,o[y+20]=x,o[y+21]=v,o[y+22]=C,o[y+23]=S,o[y+24]=m,o[y+25]=b,o[y+26]=x,o[y+27]=v,o[y+28]=C,o[y+29]=S,o[y+30]=g,o[y+31]=b,o[y+32]=x,o[y+33]=v,o[y+34]=C,o[y+35]=S,o[y+36]=g,o[y+37]=b,o[y+38]=x,o[y+39]=v,o[y+40]=C,o[y+41]=S,o[y+42]=g,o[y+43]=p,o[y+44]=x,o[y+45]=v,o[y+46]=C,o[y+47]=S}const h=t/i,u=r/i,d=new Float32Array([h,u,0,0]);this._device.queue.writeBuffer(this._uniformBuffer,0,d),this._device.queue.writeBuffer(this._vertexBuffer,0,o.buffer,0,a*8*6*4),e.setPipeline(this._linePipeline),e.setBindGroup(0,this._uniformBindGroup),e.setVertexBuffer(0,this._vertexBuffer),e.draw(a*8)}clear(e){this._debugItems=null,this._collisionScheduled&&(clearTimeout(this._collisionTimer),this._collisionScheduled=!1,this._collisionTimer=null);for(const{layer:t}of e)t.setVisibleFeatures(null)}destroy(){this._collisionTimer&&clearTimeout(this._collisionTimer),this._uniformBuffer.destroy(),this._vertexBuffer.destroy()}}class Ki{constructor(e,t){this._heap=[],this._pending=new Map,this._nextId=0;const r=t??Math.max(1,(navigator.hardwareConcurrency||4)-1);this._workers=[],this._available=[];for(let i=0;i<r;i++){const n=e();n.onmessage=s=>this._onMessage(n,s),this._workers.push(n),this._available.push(n)}}submit(e,t,r){return new Promise((i,n)=>{const{priority:s=0,transfer:a,signal:o}=r||{};if(o?.aborted){n(new DOMException("Aborted","AbortError"));return}const h={id:this._nextId++,type:e,data:t,priority:s,transfer:a,resolve:i,reject:n,cancelled:!1};o&&o.addEventListener("abort",()=>{h.cancelled||(h.cancelled=!0,h.reject(new DOMException("Aborted","AbortError")))},{once:!0}),this._heapPush(h),this._dispatch()})}_dispatch(){for(;this._available.length>0&&this._heap.length>0;){const e=this._heapPop();if(e.cancelled)continue;const t=this._available.pop();this._pending.set(e.id,e),t.postMessage({type:e.type,id:e.id,...e.data},e.transfer||[])}}_onMessage(e,t){const{id:r,...i}=t.data,n=this._pending.get(r);this._pending.delete(r),this._available.push(e),n&&!n.cancelled&&n.resolve(i),this._dispatch()}_heapPush(e){this._heap.push(e),this._siftUp(this._heap.length-1)}_heapPop(){if(this._heap.length===0)return;const e=this._heap[0],t=this._heap.pop();return this._heap.length>0&&(this._heap[0]=t,this._siftDown(0)),e}_siftUp(e){for(;e>0;){const t=e-1>>1;if(this._heap[e].priority<=this._heap[t].priority)break;[this._heap[e],this._heap[t]]=[this._heap[t],this._heap[e]],e=t}}_siftDown(e){const t=this._heap.length;for(;;){let r=e;const i=2*e+1,n=2*e+2;if(i<t&&this._heap[i].priority>this._heap[r].priority&&(r=i),n<t&&this._heap[n].priority>this._heap[r].priority&&(r=n),r===e)break;[this._heap[e],this._heap[r]]=[this._heap[r],this._heap[e]],e=r}}destroy(){for(const e of this._workers)e.terminate();for(const e of this._heap)e.cancelled||(e.cancelled=!0,e.reject(new Error("WorkerPool destroyed")));for(const[,e]of this._pending)e.cancelled||(e.cancelled=!0,e.reject(new Error("WorkerPool destroyed")));this._heap=[],this._pending.clear(),this._available=[],this._workers=[]}}class Ut extends Ot{static async create(e,t={}){const r=new Ut;return await r._init(e,t),r}get location(){return this._location}get bearing(){return 90-this.camera.state.phi*180/Math.PI}set bearing(e){this.camera.state.phi=(90-e)*Math.PI/180,this.triggerRedraw()}get pitch(){return this.camera.state.theta*180/Math.PI}get fov(){return this.camera.state.fov*180/Math.PI}set fov(e){this.camera.state.fov=e*Math.PI/180,this.triggerRedraw()}triggerRedraw(){this.camera.taint()}repaint(){this.paint(),this.emit("render")}captureFrame(e="image/png"){return new Promise(t=>{this.once("render",()=>{t(this.canvas.toDataURL(e))}),this.repaint()})}getLayers(){return this._layerManager.getLayers()}getLayer(e){return this._layerManager.getLayer(e)}async addLineLayer(e,t,r={}){const i=await this._layerManager.addLineLayer(e,t,r);return this._refinementDirty=!0,i}removeLayer(e){this._layerManager.removeLayer(e)}removeLineLayer(e){this._layerManager.removeLineLayer(e)}setLayerVisibility(e,t){this._layerManager.setLayerVisibility(e,t)}setLineLayerColor(e,t){this._layerManager.setLineLayerColor(e,t)}setLayerPaint(e,t,r){this._layerManager.setLayerPaint(e,t,r)}getLayerElevationProfile(e){return this._layerManager.getLayerElevationProfile(e)}getLayerGeoJSON(e){return this._layerManager.getLayerGeoJSON(e)}async _init(e,t){const{sources:r={},base:i=[],features:n=[],camera:s={},settings:a,createGPULines:o}=t;let c=null;const h={},u={},d=[];for(const[y,w]of Object.entries(r))if(d.push(w),w.type==="terrain"){if(c)throw new Error("Only one terrain source is allowed");c=w}else w.type==="raster"?h[y]=w:w.type==="geojson"&&(u[y]=w);if(!c)throw new Error("A terrain source is required");this._pixelRatio=t.pixelRatio||(typeof devicePixelRatio<"u"?devicePixelRatio:1),this._baseLayerConfigs=i,this._featureLayerConfigs=n,this._geojsonSources=u,this._rasterSources=h,this.canvas=e,this._terrainBounds=rt(c),this._maxTerrainZoom=c.maxzoom||14;const[_,f,g,m]=c.bounds;this._location=t.location||{lat:(f+m)/2,lon:(_+g)/2},this.attribution=Oi(d.filter(y=>y.attribution));const p=Math.round(Fi(this._location.lat)*3.28084);this.settings=zi({treelineLower:Math.max(0,p-500),treelineUpper:p+500,...a}),this._gpu=new Wt,await this._gpu.init(e),this._device=this._gpu.device,this._format=this._gpu.format,this._createGPULines=o,this._sky=new Zt(this._gpu),this._renderer=new Kt(this._gpu,this._sky);const b=Zi(window.location.hash);this.camera=mi(e,{center:[.0804792012701582,.0002040588543435183,.27264551318459634],distance:.0008177139017526437,phi:2.1624270549994598,theta:.16047571910010502,fov:Math.PI/4,rotateSpeed:.005,zoomSpeed:8e-4,panSpeed:1,...s,...b}),this._hashUpdateTimer=null;const x=this._device,v=this._format,C=this._gpu;this._frustumOverlay=new Hi(x,v,this._pixelRatio,o),this._collisionManager=new ji(x,v),this._collisionManager.onWake=()=>{this._renderDirty=!0},this._workerPool=new Ki(()=>new Worker(new URL("/notebooks/assets/tile-decode.worker-BxOMx4hc.js",import.meta.url),{type:"module"})),this._tileManager=new Ii(x,{tileUrl:st(c.tiles),encoding:c.encoding||"terrain-rgb",workerPool:this._workerPool}),this._tileManager.setBindGroupLayout(C.textureBGL),this._tileManager.setBounds(this._terrainBounds);const S=[];for(const y of i){const w=h[y.source];if(!w)throw new Error(`Base layer "${y.id}" references unknown source "${y.source}"`);const P=rt(w),I=new Di({tileUrl:st(w.tiles)});I.setBounds(P),S.push({imageryManager:I,blend:y.blend||"source-over",opacity:y.opacity!=null?y.opacity:1,minzoom:w.minzoom,maxzoom:w.maxzoom})}this._minImageryZoom=S.length>0?Math.min(...S.map(y=>y.minzoom)):1/0,this._maxImageryZoom=S.length>0?Math.max(...S.map(y=>y.maxzoom)):0,this._imageryTileCache=new Ri(x,S,C.imageryBGL,C.imagerySampler),this._coverageDirty=!0,this._renderDirty=!0,this._cachedRenderList=[],this._MAX_ELEV_Y=.001,this._currentExaggeration=this.settings.verticalExaggeration,this._currentDensityThreshold=this.settings.densityThreshold,this._currentImageryDensityThreshold=this.settings.imageryDensityThreshold,this._currentFreezeCoverage=!1,this._refinementDirty=!1,this._lastRefinementTime=0,this._bvh=null,this._bvhTileList=[],this._lastProjView=new Float64Array(16),this._invProjView=new Float64Array(16),this.camera.rotateStartCallback=(y,w)=>this._hitTest(y,w),this._needsCanvasResize=!0,this._resizeObserver=new ResizeObserver(()=>{this._needsCanvasResize=!0,this._renderDirty=!0,this._coverageDirty=!0,this.camera.taint()}),this._resizeObserver.observe(e),this._layerManager=new _i({device:x,format:v,globalUniformBuffer:C.globalUniformBuffer,globalUniformBGL:C.globalUniformBGL,createGPULines:o,queryElevation:(y,w)=>this.queryElevationMercator(y,w),onDirty:()=>{this._renderDirty=!0}}),await this._layerManager.initLayers(n,u,t.font,t.simplifyFn),this._tileManager.onTileResolved=()=>{this._coverageDirty=!0,this._renderDirty=!0,this._refinementDirty=!0,this._collisionManager.markStale(),this._layerManager.invalidateLineElevations()},this._imageryTileCache.onUpdate=()=>{this._coverageDirty=!0,this._renderDirty=!0},this._running=!0,this._boundFrame=this._frame.bind(this),requestAnimationFrame(this._boundFrame)}_hitTest(e,t){const r=this.raycast(e,t);if(r)return r.worldPos;const i=this.canvas.getBoundingClientRect(),n=(e-i.left)/i.width*2-1,s=1-(t-i.top)/i.height*2;De(this._invProjView,this._lastProjView);const{origin:a,direction:o}=Je(n,s,this._invProjView);if(Math.abs(o[1])>1e-10){const c=-a[1]/o[1];if(c>0)return[a[0]+c*o[0],0,a[2]+c*o[2]]}return null}paint(){this._renderer.paint({canvas:this.canvas,camera:this.camera,settings:this.settings,renderList:this._cachedRenderList,tileManager:this._tileManager,imageryTileCache:this._imageryTileCache,exaggeration:this._currentExaggeration,globalElevScale:this._globalElevScale,lineLayers:this._layerManager._lineLayers,circleLayers:this._layerManager._circleLayers,textLayers:this._layerManager._textLayers,frustumOverlay:this._frustumOverlay,collisionManager:this._collisionManager,pixelRatio:this._pixelRatio})}_frame(){if(!this._running)return;requestAnimationFrame(this._boundFrame);const{canvas:e,camera:t,settings:r}=this;if(this._currentExaggeration!==r.verticalExaggeration&&(this._currentExaggeration=r.verticalExaggeration,t.taint()),this._currentDensityThreshold!==r.densityThreshold&&(this._currentDensityThreshold=r.densityThreshold,this._coverageDirty=!0),this._currentImageryDensityThreshold!==r.imageryDensityThreshold&&(this._currentImageryDensityThreshold=r.imageryDensityThreshold,this._coverageDirty=!0),r.freezeCoverage!==this._currentFreezeCoverage&&(this._currentFreezeCoverage=r.freezeCoverage,this._currentFreezeCoverage||(this._frustumOverlay.unfreeze(),this._coverageDirty=!0),t.taint(),this._renderDirty=!0),r.dirty&&(this._renderDirty=!0,r.dirty=!1),this._refinementDirty){const p=performance.now();p-this._lastRefinementTime>1e3&&(this._layerManager.refineLineLayers(),this._lastRefinementTime=p,this._refinementDirty=!1,this._renderDirty=!0,this.emit("elevationrefine"))}if(!this._coverageDirty&&!this._renderDirty&&!t.dirty)return;if(this._needsCanvasResize){const p=this._pixelRatio,b=Math.floor(e.clientWidth*p),x=Math.floor(e.clientHeight*p);(e.width!==b||e.height!==x)&&(e.width=b,e.height=x),this._needsCanvasResize=!1}const i=e.width/e.height,{view:n,projection:s,projectionView:a,dirty:o}=t.update(i);this._lastProjView.set(a);const{center:c,distance:h,theta:u,phi:d}=t.state,_=c[2]+h*Math.cos(u)*Math.sin(d),f=2*Math.atan(Math.exp(Math.PI*(1-2*_)))-Math.PI/2;this._globalElevScale=1/(40075016686e-3*Math.cos(f)),this._currentFreezeCoverage&&!this._frustumOverlay.isFrozen&&this._frustumOverlay.freeze(a);const g=this._frustumOverlay.coverageProjView||a;if(o&&(this._coverageDirty=!0,this._renderDirty=!0,this.emit("move"),clearTimeout(this._hashUpdateTimer),this._hashUpdateTimer=setTimeout(()=>{history.replaceState(null,"",Ni(t.state)),this.emit("moveend")},300)),this._coverageDirty){const p=this._MAX_ELEV_Y*this._currentExaggeration;this._tileManager.beginFrame();const b=this._imageryTileCache.layers.length>0,x=this._minImageryZoom,v=this._imageryTileCache,C=new Set;this._cachedRenderList=xi(g,e.width,e.height,p,this._currentExaggeration,r.densityThreshold,this._terrainBounds,this._tileManager,this._maxTerrainZoom,this._maxImageryZoom,b?(w,P,I)=>{if(w<x||!v.overlapsAnyLayer(w,P,I))return!0;const X=`${w}/${P}/${I}`;return C.add(X),v.ensureImageryTile(w,P,I),v.hasImagery(w,P,I)}:null,this._globalElevScale,r.imageryDensityThreshold);for(const w of this._cachedRenderList)this._tileManager.wantedKeys.add(`${w.terrainZ}/${w.terrainX}/${w.terrainY}`);const S=g;this._cachedRenderList.sort((w,P)=>{const I=S[3]*((w.x+.5)/(1<<w.z))+S[11]*((w.y+.5)/(1<<w.z))+S[15],X=S[3]*((P.x+.5)/(1<<P.z))+S[11]*((P.y+.5)/(1<<P.z))+S[15];return I-X}),this._tileManager.cancelStale(),this._tileManager.evict(),this._tileManager.stripQuadtrees();const y=new Set(C);for(const w of this._cachedRenderList)y.add(`${w.z}/${w.x}/${w.y}`);this._imageryTileCache.gc(y),this._rebuildBVH(),this._coverageDirty=!1,this._renderDirty=!0}if(!this._renderDirty)return;this._renderDirty=!1;const m=this._layerManager.buildCollisionLayers();this._collisionManager.update({enabled:r.enableCollision,layers:m,projectionView:a,canvasW:e.width,canvasH:e.height,pixelRatio:this._pixelRatio,exaggeration:this._currentExaggeration,collisionBuffer:r.collisionBuffer,occlusionBias:r.occlusionBias,bvh:this._bvh,tileManager:this._tileManager,bvhTileList:this._bvhTileList,globalElevScale:this._globalElevScale})&&(this._renderDirty=!0),this._layerManager.prepareLayers(a,e.width,e.height,this._pixelRatio,this._currentExaggeration,this._globalElevScale),this.emit("elevationrefine"),this.paint(),this.emit("render")}_rebuildBVH(){const e=this._cachedRenderList;if(e.length===0){this._bvh=null,this._bvhTileList=[];return}const t=new Map;for(const s of e){const a=`${s.terrainZ}/${s.terrainX}/${s.terrainY}`;if(!t.has(a)){const o=this._tileManager.getTile(s.terrainZ,s.terrainX,s.terrainY);if(o&&o.isFlat)continue;t.set(a,{z:s.terrainZ,x:s.terrainX,y:s.terrainY})}}const r=Array.from(t.values()),i=new Float64Array(r.length*6),n=new Array(r.length);for(let s=0;s<r.length;s++){const{z:a,x:o,y:c}=r[s];n[s]=r[s];const h=1/(1<<a),u=this._tileManager.getElevationBounds(a,o,c),d=s*6;i[d]=o*h,i[d+1]=u?u.minElevation*this._globalElevScale*this._currentExaggeration:0,i[d+2]=c*h,i[d+3]=(o+1)*h,i[d+4]=u?u.maxElevation*this._globalElevScale*this._currentExaggeration:this._MAX_ELEV_Y*this._currentExaggeration,i[d+5]=(c+1)*h}this._bvh=new Gi(i,{maxItemsPerNode:4}),this._bvhTileList=n}raycast(e,t){if(!this._bvh)return null;const r=this.canvas.getBoundingClientRect(),i=(e-r.left)/r.width*2-1,n=1-(t-r.top)/r.height*2;De(this._invProjView,this._lastProjView);const{origin:s,direction:a}=Je(i,n,this._invProjView);return Pt({origin:s,direction:a,bvh:this._bvh,tileCache:this._tileManager,tileList:this._bvhTileList,verticalExaggeration:this._currentExaggeration})}queryElevation(e,t){const r=Ue(e),i=Ae(t);return this.queryElevationMercator(r,i)}queryElevationMercator(e,t){let r=-1,i=-1,n=-1;for(const P of this._cachedRenderList){const I=1/(1<<P.z);e>=P.x*I&&e<(P.x+1)*I&&t>=P.y*I&&t<(P.y+1)*I&&P.terrainZ>r&&(r=P.terrainZ,i=P.terrainX,n=P.terrainY)}if(r<0)return null;const s=this._tileManager.getTile(r,i,n);if(!s||!s.elevations)return null;const a=1/(1<<r),o=(e-i*a)/a,c=(t-n*a)/a,h=o*512+1,u=c*512+1,d=Math.floor(h),_=Math.floor(u),f=h-d,g=u-_,m=514,p=Math.min(d,513),b=Math.min(d+1,513),x=Math.min(_,513),v=Math.min(_+1,513),C=s.elevations[x*m+p],S=s.elevations[x*m+b],y=s.elevations[v*m+p],w=s.elevations[v*m+b];return C*(1-f)*(1-g)+S*f*(1-g)+y*(1-f)*g+w*f*g}_debugParams(){const{canvas:e,camera:t,settings:r}=this,i=e.width/e.height,{projectionView:n}=t.update(i),s=this._MAX_ELEV_Y*this._currentExaggeration;return{projectionView:n,canvasW:e.width,canvasH:e.height,maxElevY:s,vertExag:this._currentExaggeration,densityThreshold:r.densityThreshold,sourceBounds:this._terrainBounds,tileManager:this._tileManager,globalElevScale:this._globalElevScale}}debugTile(e,t,r){const i=this._debugParams();return wi(e,t,r,i.projectionView,i.canvasH,i.maxElevY,i.vertExag,i.densityThreshold,i.tileManager,i.globalElevScale)}debugSelectTiles(){const e=this._debugParams();return Mi(e.projectionView,e.canvasW,e.canvasH,e.maxElevY,e.vertExag,e.densityThreshold,e.sourceBounds,e.tileManager,e.globalElevScale)}debugTileCoverage(){const e=this._debugParams(),t=this.camera.state,r=gi(e.projectionView,e.canvasW,e.canvasH,e.maxElevY,e.vertExag,e.densityThreshold,e.sourceBounds,e.tileManager,null,e.globalElevScale),[i,n,s]=ze(e.projectionView);return{camera:{center:[...t.center],distance:t.distance,phi:t.phi,theta:t.theta,thetaDeg:t.theta*180/Math.PI,fov:t.fov},canvas:{width:e.canvasW,height:e.canvasH},densityThreshold:e.densityThreshold,tiles:r.map(a=>({z:a.z,x:a.x,y:a.y,density:Oe(e.projectionView,a.z,a.x,a.y,e.canvasH,i,n,s),terrainDensity:Lt(e.projectionView,a.z,a.x,a.y,e.canvasH,i,n,s)})),projectionView:Array.from(e.projectionView)}}destroy(){this._running=!1,clearTimeout(this._hashUpdateTimer),this._collisionManager.destroy(),this._frustumOverlay.destroy(),this._resizeObserver.disconnect(),this.camera.destroy(),this._layerManager.destroyAll(),this._workerPool.destroy(),this._gpu.destroy()}}export{Ut as TerrainMap};
