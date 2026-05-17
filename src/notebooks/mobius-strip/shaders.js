// WGSL for the Mobius strip viewer.
//
// The renderer feeds an orientable "cut" mesh (one seam column duplicated)
// so smooth per-vertex normals exist and interpolate cleanly. The fragment
// shader still flips the normal toward the eye (two-sided lighting), which
// hides the sign flip across the cut and keeps the non-orientable surface
// seamless. Color is either a width gradient or a turbo color map of a
// per-vertex scalar field (von Mises stress, bending energy, mode amplitude).

export const shaderCode = /* wgsl */ `
struct U {
  projView : mat4x4<f32>,
  eye      : vec4<f32>,   // xyz = eye position
  lightDir : vec4<f32>,   // xyz = key light direction
  colA     : vec4<f32>,   // rgb = edge-A color, w = ambient
  colB     : vec4<f32>,   // rgb = edge-B color, w = colorMode (0 width, 1 scalar)
  rng      : vec4<f32>,   // x = scalarMin, y = scalarMax
};
@group(0) @binding(0) var<uniform> u : U;

fn turbo(tt : f32) -> vec3<f32> {
  let x = clamp(tt, 0.0, 1.0);
  let r = 0.13572138 + x*(4.61539260 + x*(-42.66032258 + x*(132.13108234 + x*(-152.94239396 + x*59.28637943))));
  let g = 0.09140261 + x*(2.19418839 + x*( 4.84296658 + x*(-14.18503333 + x*(  4.27729857 + x* 2.82956604))));
  let b = 0.10667330 + x*(12.64194608 + x*(-60.58204836 + x*(110.36276771 + x*(-89.90310912 + x*27.34824973))));
  return clamp(vec3<f32>(r, g, b), vec3<f32>(0.0), vec3<f32>(1.0));
}

struct VSOut {
  @builtin(position) pos    : vec4<f32>,
  @location(0)       world  : vec3<f32>,
  @location(1)       normal : vec3<f32>,
  @location(2)       sv     : f32,
  @location(3)       scalar : f32,
};

@vertex
fn vsSurface(
  @location(0) p : vec3<f32>,
  @location(1) n : vec3<f32>,
  @location(2) aux : vec2<f32>,   // x = sv (across width), y = scalar
) -> VSOut {
  var o : VSOut;
  o.pos    = u.projView * vec4<f32>(p, 1.0);
  o.world  = p;
  o.normal = n;
  o.sv     = aux.x;
  o.scalar = aux.y;
  return o;
}

@fragment
fn fsSurface(i : VSOut) -> @location(0) vec4<f32> {
  var n = normalize(i.normal);
  let viewDir = normalize(u.eye.xyz - i.world);
  if (dot(n, viewDir) < 0.0) { n = -n; }            // two-sided

  let l = normalize(u.lightDir.xyz);
  let diff = max(dot(n, l), 0.0);
  let fill = max(dot(n, normalize(vec3<f32>(-l.x, -0.2, -l.z))), 0.0) * 0.25;
  let hh = normalize(l + viewDir);
  let spec = pow(max(dot(n, hh), 0.0), 36.0) * 0.30;
  let rim = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0) * 0.22;

  var base : vec3<f32>;
  if (u.colB.w < 0.5) {
    base = mix(u.colA.rgb, u.colB.rgb, clamp(i.sv, 0.0, 1.0));
  } else {
    let denom = max(u.rng.y - u.rng.x, 1e-20);
    base = turbo((i.scalar - u.rng.x) / denom);
  }
  let amb = u.colA.w;
  var col = base * (amb + (1.0 - amb) * (diff + fill)) + vec3<f32>(spec + rim);
  col = pow(clamp(col, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(1.0 / 2.2));
  return vec4<f32>(col, 1.0);
}

@vertex
fn vsWire(@location(0) p : vec3<f32>) -> @builtin(position) vec4<f32> {
  return u.projView * vec4<f32>(p, 1.0);
}

@fragment
fn fsWire() -> @location(0) vec4<f32> {
  return vec4<f32>(0.05, 0.06, 0.09, 1.0);
}
`;
