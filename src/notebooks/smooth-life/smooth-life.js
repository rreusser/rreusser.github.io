// SmoothLife — a continuous generalization of Conway's Game of Life, after
// Stephan Rafler, "Generalization of Conway's 'Game of Life' to a continuous
// domain — SmoothLife" (2011, arXiv:1111.1567).
//
// The state is a scalar field f(x) in [0,1] on a periodic grid. At each cell we
// measure two local averages:
//
//   m = mean of f over an inner disc of radius ri  ("cell fill")
//   n = mean of f over the surrounding annulus ri..ra  ("neighborhood fill")
//
// A smooth transition function s(n, m) then decides the target state, and the
// field relaxes toward it.
//
// The two disc averages are circular convolutions, which we evaluate with the
// FFT and analytical frequency-domain kernels — the same technique used by the
// multi-scale Turing pattern notebook. The Fourier transform of a normalized
// disc of radius R is the "jinc" function 2 J1(kR)/(kR), so no kernel textures
// are needed and the cost is independent of the radius. We pack both discs into
// one complex convolution: multiplying the field's spectrum by (Ĝ_ri + i·Ĝ_ra)
// and taking a single inverse FFT yields the ri-disc average in the real part
// and the ra-disc average in the imaginary part.
//
// Reuses ./lib/webgpu-fft. The device is injected.

import { createFFTPipelines, executeFFT2D } from './lib/webgpu-fft/fft.js';

// Bessel J1 (from stdlib, as used by the Turing pattern shaders) plus the
// normalized disc kernel and the SmoothLife transition function.
const WGSL_BESSEL = /* wgsl */ `
const PI: f32 = 3.14159265358979323846;
const SQRT_PI: f32 = 1.7724538509055159;
const BJ1_X1: f32 = 3.8317059702075123156e+00;
const BJ1_X2: f32 = 7.0155866698156187535e+00;
const BJ1_X11: f32 = 9.810e+02;
const BJ1_X12: f32 = -3.2527979248768438556e-04;
const BJ1_X21: f32 = 1.7960e+03;
const BJ1_X22: f32 = -3.8330184381246462950e-05;

fn polyS(x_in: f32) -> f32 {
  var x = x_in; var s1: f32; var s2: f32;
  if (x == 0.0) { return 0.046875; }
  let ax = abs(x);
  if (ax <= 1.0) {
    s1 = 33220.913409857225 + (x * (85145.1606753357 + (x * (66178.83658127084 + (x * (18494.262873223866 + (x * (1706.375429020768 + (x * (35.26513384663603 + (x * 0.0)))))))))));
    s2 = 708712.8194102874 + (x * (1819458.0422439973 + (x * (1419460.669603721 + (x * (400294.43582266977 + (x * (37890.2297457722 + (x * (863.8367769604992 + (x * 1.0)))))))))));
  } else {
    x = 1.0 / x;
    s1 = 0.0 + (x * (35.26513384663603 + (x * (1706.375429020768 + (x * (18494.262873223866 + (x * (66178.83658127084 + (x * (85145.1606753357 + (x * 33220.913409857225)))))))))));
    s2 = 1.0 + (x * (863.8367769604992 + (x * (37890.2297457722 + (x * (400294.43582266977 + (x * (1419460.669603721 + (x * (1819458.0422439973 + (x * 708712.8194102874)))))))))));
  }
  return s1 / s2;
}
fn polyC(x_in: f32) -> f32 {
  var x = x_in; var s1: f32; var s2: f32;
  if (x == 0.0) { return 1.0; }
  let ax = abs(x);
  if (ax <= 1.0) {
    s1 = -4435757.816794128 + (x * (-9942246.505077641 + (x * (-6603373.248364939 + (x * (-1523529.3511811374 + (x * (-109824.05543459347 + (x * (-1611.6166443246102 + (x * 0.0)))))))))));
    s2 = -4435757.816794128 + (x * (-9934124.389934586 + (x * (-6585339.4797230875 + (x * (-1511809.5066341609 + (x * (-107263.8599110382 + (x * (-1455.0094401904962 + (x * 1.0)))))))))));
  } else {
    x = 1.0 / x;
    s1 = 0.0 + (x * (-1611.6166443246102 + (x * (-109824.05543459347 + (x * (-1523529.3511811374 + (x * (-6603373.248364939 + (x * (-9942246.505077641 + (x * -4435757.816794128)))))))))));
    s2 = 1.0 + (x * (-1455.0094401904962 + (x * (-107263.8599110382 + (x * (-1511809.5066341609 + (x * (-6585339.4797230875 + (x * (-9934124.389934586 + (x * -4435757.816794128)))))))))));
  }
  return s1 / s2;
}
fn poly1(x_in: f32) -> f32 {
  var x = x_in; var s1: f32; var s2: f32;
  if (x == 0.0) { return -0.03405537391318949; }
  let ax = abs(x);
  if (ax <= 1.0) {
    s1 = -142585098013.66644 + (x * (6678104126.14924 + (x * (-115486967.64841276 + (x * (980629.0409895825 + (x * (-4461.579298277507 + (x * (10.650724020080236 + (x * -0.010767857011487301)))))))))));
    s2 = 4186860446082.0176 + (x * (42091902282.58013 + (x * (202283751.40097034 + (x * (591176.1449417479 + (x * (1074.227223951738 + (x * (1.0 + (x * 0.0)))))))))));
  } else {
    x = 1.0 / x;
    s1 = -0.010767857011487301 + (x * (10.650724020080236 + (x * (-4461.579298277507 + (x * (980629.0409895825 + (x * (-115486967.64841276 + (x * (6678104126.14924 + (x * -142585098013.66644)))))))))));
    s2 = 0.0 + (x * (1.0 + (x * (1074.227223951738 + (x * (591176.1449417479 + (x * (202283751.40097034 + (x * (42091902282.58013 + (x * 4186860446082.0176)))))))))));
  }
  return s1 / s2;
}
fn poly2(x_in: f32) -> f32 {
  var x = x_in; var s1: f32; var s2: f32;
  if (x == 0.0) { return -0.010158790774176108; }
  let ax = abs(x);
  if (ax <= 1.0) {
    s1 = -17527881995806512.0 + (x * (1660853173129901.8 + (x * (-36658018905416.664 + (x * (355806656709.1062 + (x * (-1811393126.9860668 + (x * (5079326.614801118 + (x * (-7502.334222078161 + (x * 4.6179191852758255)))))))))))));
    s2 = 1725390588844768000.0 + (x * (17128800897135812.0 + (x * (84899346165481.42 + (x * (276227772862.44086 + (x * (648725028.9959639 + (x * (1126712.5065029138 + (x * (1388.6978985861358 + (x * 1.0)))))))))))));
  } else {
    x = 1.0 / x;
    s1 = 4.6179191852758255 + (x * (-7502.334222078161 + (x * (5079326.614801118 + (x * (-1811393126.9860668 + (x * (355806656709.1062 + (x * (-36658018905416.664 + (x * (1660853173129901.8 + (x * -17527881995806512.0)))))))))))));
    s2 = 1.0 + (x * (1388.6978985861358 + (x * (1126712.5065029138 + (x * (648725028.9959639 + (x * (276227772862.44086 + (x * (84899346165481.42 + (x * (17128800897135812.0 + (x * 1725390588844768000.0)))))))))))));
  }
  return s1 / s2;
}
fn bessel_j1(x: f32) -> f32 {
  let w = abs(x);
  var value: f32;
  if (w <= 4.0) {
    let y = x * x;
    let r = poly1(y);
    let f = w * (w + BJ1_X1) * ((w - (BJ1_X11 / 256.0)) - BJ1_X12);
    value = f * r;
  } else if (w <= 8.0) {
    let y = x * x;
    let r = poly2(y);
    let f = w * (w + BJ1_X2) * ((w - (BJ1_X21 / 256.0)) - BJ1_X22);
    value = f * r;
  } else {
    let y = 8.0 / w;
    let y2 = y * y;
    let rc = polyC(y2);
    let rs = polyS(y2);
    let f = 1.0 / (sqrt(w) * SQRT_PI);
    let sc = vec2<f32>(sin(w), cos(w));
    value = f * ((rc * (sc.x - sc.y)) + ((y * rs) * (sc.x + sc.y)));
  }
  if (x < 0.0) { value = -value; }
  return value;
}

// Fourier transform of a normalized disc of radius r: 2 J1(kr)/(kr), which
// equals 1 at k=0 so the convolution computes a proper average.
fn disk_avg(kmag: f32, r: f32) -> f32 {
  let kr = kmag * r;
  if (kr < 1e-6) { return 1.0; }
  return 2.0 * bessel_j1(kr) / kr;
}

fn wavenumber(coord: vec2<u32>, res: vec2<f32>) -> vec2<f32> {
  var kx = f32(coord.x);
  var ky = f32(coord.y);
  if (kx > res.x * 0.5) { kx -= res.x; }
  if (ky > res.y * 0.5) { ky -= res.y; }
  return vec2<f32>(kx, ky) * 2.0 * PI / res;
}

// SmoothLife transition ingredients.
fn sigma1(x: f32, a: f32, alpha: f32) -> f32 {
  return 1.0 / (1.0 + exp(-(x - a) * 4.0 / alpha));
}
fn sigmaAB(x: f32, a: f32, b: f32, alpha: f32) -> f32 {
  return sigma1(x, a, alpha) * (1.0 - sigma1(x, b, alpha));
}
fn sigmaM(x: f32, y: f32, m: f32, alpha: f32) -> f32 {
  let t = sigma1(m, 0.5, alpha);
  return x * (1.0 - t) + y * t;
}
`;

const WGSL_CONVOLVE = /* wgsl */ `
struct ConvolveParams {
  res: vec2<u32>,
  ri: f32,
  ra: f32,
};
@group(0) @binding(0) var<storage, read_write> fhat: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> P: ConvolveParams;
` + WGSL_BESSEL + /* wgsl */ `
@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  if (x >= P.res.x || y >= P.res.y) { return; }
  let idx = y * P.res.x + x;

  let k = wavenumber(vec2<u32>(x, y), vec2<f32>(P.res));
  let kmag = length(k);
  let gri = disk_avg(kmag, P.ri);
  let gra = disk_avg(kmag, P.ra);

  // Multiply spectrum by the complex kernel (Ĝ_ri + i·Ĝ_ra). After the inverse
  // FFT the real part is the ri-disc average and the imag part the ra-disc one.
  let f = fhat[idx];
  fhat[idx] = vec2<f32>(
    f.x * gri - f.y * gra,
    f.x * gra + f.y * gri
  );
}
`;

const WGSL_UPDATE = /* wgsl */ `
struct UpdateParams {
  N: u32,
  ri: f32,
  ra: f32,
  alphaN: f32,
  alphaM: f32,
  dt: f32,
  b1: f32,
  b2: f32,
  d1: f32,
  d2: f32,
  mode: u32,
  pad: u32,
};
@group(0) @binding(0) var<storage, read> conv: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> field: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> P: UpdateParams;
` + WGSL_BESSEL + /* wgsl */ `
@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  if (x >= P.N || y >= P.N) { return; }
  let idx = y * P.N + x;

  let c = conv[idx];
  let m = c.x;              // average over inner disc (radius ri)
  let discRa = c.y;         // average over outer disc (radius ra)
  let ri2 = P.ri * P.ri;
  let ra2 = P.ra * P.ra;
  let n = (ra2 * discRa - ri2 * m) / max(ra2 - ri2, 1e-6);  // annulus average

  let s = sigmaAB(
    n,
    sigmaM(P.b1, P.d1, m, P.alphaM),
    sigmaM(P.b2, P.d2, m, P.alphaM),
    P.alphaN
  );

  let prev = field[idx].x;
  var next: f32;
  if (P.mode == 0u) {
    next = prev + P.dt * (s - prev);        // relax toward target (default)
  } else if (P.mode == 1u) {
    next = prev + P.dt * (2.0 * s - 1.0);   // Rafler increment form
  } else {
    next = s;                                // discrete snap
  }
  field[idx] = vec2<f32>(clamp(next, 0.0, 1.0), 0.0);
}
`;

const WGSL_INIT = /* wgsl */ `
struct InitParams {
  N: u32,
  seed: u32,
  fill: f32,
  scale: f32,
};
@group(0) @binding(0) var<storage, read_write> field: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> P: InitParams;

fn hashU(a: u32) -> u32 {
  var x = a;
  x = x ^ (x >> 16u);
  x = x * 0x7feb352du;
  x = x ^ (x >> 15u);
  x = x * 0x846ca68bu;
  x = x ^ (x >> 16u);
  return x;
}
fn hash2(ix: i32, iy: i32, seed: u32) -> f32 {
  let h = hashU(u32(ix) * 374761393u + u32(iy) * 668265263u + seed);
  return f32(h & 0x00ffffffu) / f32(0x01000000u);
}
fn smootherstep(t: f32) -> f32 {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
fn valueNoise(p: vec2<f32>, period: i32, seed: u32) -> f32 {
  let pi = vec2<i32>(i32(floor(p.x)), i32(floor(p.y)));
  let pf = fract(p);
  let ix0 = ((pi.x % period) + period) % period;
  let iy0 = ((pi.y % period) + period) % period;
  let ix1 = (ix0 + 1) % period;
  let iy1 = (iy0 + 1) % period;
  let a = hash2(ix0, iy0, seed);
  let b = hash2(ix1, iy0, seed);
  let c = hash2(ix0, iy1, seed);
  let d = hash2(ix1, iy1, seed);
  let ux = smootherstep(pf.x);
  let uy = smootherstep(pf.y);
  return mix(mix(a, b, ux), mix(c, d, ux), uy);
}

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let N = i32(P.N);
  let x = i32(gid.x);
  let y = i32(gid.y);
  if (x >= N || y >= N) { return; }

  let period = max(2, i32(round(f32(N) / max(P.scale, 1.0))));
  let p = vec2<f32>(f32(x), f32(y)) / max(P.scale, 1.0);
  var v = valueNoise(p, period, P.seed) * 0.65
        + valueNoise(p * 2.0, period * 2, P.seed ^ 0x9e3779b9u) * 0.35;
  let thresh = 1.0 - P.fill;
  let state = smoothstep(thresh - 0.08, thresh + 0.08, v);
  field[u32(y) * P.N + u32(x)] = vec2<f32>(state, 0.0);
}
`;

const WGSL_PAINT = /* wgsl */ `
struct PaintParams {
  cx: f32,
  cy: f32,
  radius: f32,
  amount: f32,
  N: u32,
  hardness: f32,
  pad0: f32,
  pad1: f32,
};
@group(0) @binding(0) var<storage, read_write> field: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> P: PaintParams;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let N = i32(P.N);
  let x = i32(gid.x);
  let y = i32(gid.y);
  if (x >= N || y >= N) { return; }
  let idx = u32(y) * P.N + u32(x);

  let prev = field[idx].x;
  var dx = f32(x) - P.cx;
  var dy = f32(y) - P.cy;
  let fn2 = f32(N);
  dx = dx - fn2 * round(dx / fn2);
  dy = dy - fn2 * round(dy / fn2);
  let dist = sqrt(dx * dx + dy * dy);
  let falloff = 1.0 - smoothstep(P.radius * P.hardness, P.radius, dist);
  let next = clamp(prev + P.amount * falloff, 0.0, 1.0);
  field[idx] = vec2<f32>(next, 0.0);
}
`;

const WGSL_RENDER = /* wgsl */ `
struct RenderParams {
  N: u32,
  colormap: u32,
  gamma: f32,
  aspect: f32,   // canvas width / height
  cx: f32,       // view center in field-normalized coords
  cy: f32,
  zoom: f32,     // 1 = one field copy fits the shorter canvas dimension
  pad: f32,
};
@group(0) @binding(0) var<storage, read> field: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> P: RenderParams;

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0),
  );
  var out: VSOut;
  let xy = p[vi];
  out.pos = vec4<f32>(xy, 0.0, 1.0);
  out.uv = vec2<f32>((xy.x + 1.0) * 0.5, (1.0 - xy.y) * 0.5);
  return out;
}

fn wrapI(i: i32, n: i32) -> i32 { return (i % n + n) % n; }
fn at(ix: i32, iy: i32, N: i32) -> f32 {
  return field[u32(wrapI(iy, N)) * u32(N) + u32(wrapI(ix, N))].x;
}
fn sampleBilinear(uv: vec2<f32>, N: i32) -> f32 {
  let p = uv * f32(N) - vec2<f32>(0.5);
  let i0 = vec2<i32>(i32(floor(p.x)), i32(floor(p.y)));
  let f = fract(p);
  let a = at(i0.x, i0.y, N);
  let b = at(i0.x + 1, i0.y, N);
  let c = at(i0.x, i0.y + 1, N);
  let d = at(i0.x + 1, i0.y + 1, N);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

fn magma(t: f32) -> vec3<f32> {
  // Íñigo Quílez polynomial fit to matplotlib's magma.
  let c0 = vec3<f32>(-0.002136485, -0.000749655, -0.005386128);
  let c1 = vec3<f32>(0.251660541, 0.677523244, 2.494026599);
  let c2 = vec3<f32>(8.353717279, -3.577719515, 0.314467903);
  let c3 = vec3<f32>(-27.66873309, 14.26473078, -13.64921319);
  let c4 = vec3<f32>(52.17613981, -27.94360607, 12.94416944);
  let c5 = vec3<f32>(-50.76852536, 29.04658282, 4.234152994);
  let c6 = vec3<f32>(18.65570507, -11.48977352, -5.601961509);
  return clamp(c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6))))), vec3<f32>(0.0), vec3<f32>(1.0));
}
fn viridis(t: f32) -> vec3<f32> {
  let c0 = vec3<f32>(0.274, 0.004, 0.329);
  let c1 = vec3<f32>(0.105, 1.404, 1.384);
  let c2 = vec3<f32>(-0.330, 0.215, 0.095);
  let c3 = vec3<f32>(-4.634, -5.799, -19.33);
  let c4 = vec3<f32>(6.228, 14.18, 56.69);
  let c5 = vec3<f32>(4.776, -13.74, -65.35);
  let c6 = vec3<f32>(-5.435, 4.646, 26.31);
  return clamp(c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6))))), vec3<f32>(0.0), vec3<f32>(1.0));
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4<f32> {
  let N = i32(P.N);
  // Map screen uv to field coords, keeping field cells square regardless of the
  // canvas aspect ratio. The periodic field tiles into any leftover space.
  let fuv = vec2<f32>(
    P.cx + (in.uv.x - 0.5) * (P.aspect / P.zoom),
    P.cy + (in.uv.y - 0.5) / P.zoom
  );
  var v = clamp(sampleBilinear(fuv, N), 0.0, 1.0);
  v = pow(v, P.gamma);
  var col: vec3<f32>;
  if (P.colormap == 0u) {
    col = vec3<f32>(v);
  } else if (P.colormap == 1u) {
    col = magma(v);
  } else if (P.colormap == 2u) {
    col = viridis(v);
  } else {
    col = mix(vec3<f32>(0.02, 0.05, 0.12), vec3<f32>(0.6, 0.95, 1.0), v);
    col = mix(col, vec3<f32>(1.0), v * v * 0.6);
  }
  return vec4<f32>(col, 1.0);
}
`;

export function createSmoothLife(device, options = {}) {
  const N = options.N ?? 512;
  if ((N & (N - 1)) !== 0) throw new Error(`SmoothLife grid size must be a power of 2, got ${N}`);

  const params = {
    ra: options.ra ?? 12.0,
    innerRatio: options.innerRatio ?? 3.0,
    alphaN: options.alphaN ?? 0.028,
    alphaM: options.alphaM ?? 0.147,
    dt: options.dt ?? 0.115,
    b1: options.b1 ?? 0.269,
    b2: options.b2 ?? 0.340,
    d1: options.d1 ?? 0.523,
    d2: options.d2 ?? 0.746,
    mode: options.mode ?? 0,
    fill: options.fill ?? 0.5,
    colormap: options.colormap ?? 1,
    gamma: options.gamma ?? 1.0,
    // View transform (for aspect-correct display + zoom/pan).
    aspect: options.aspect ?? 1.0,
    cx: options.cx ?? 0.5,
    cy: options.cy ?? 0.5,
    zoom: options.zoom ?? 1.0,
  };

  // Complex (vec2<f32>) buffers, N×N.
  const complexSize = N * N * 2 * 4;
  const bufUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
  const mkBuf = (label) => device.createBuffer({ label, size: complexSize, usage: bufUsage });
  const field = mkBuf('sl-field');
  const fhat = mkBuf('sl-fhat');
  const conv = mkBuf('sl-conv');
  const temp = [mkBuf('sl-temp0'), mkBuf('sl-temp1')];

  const fftPipelines = createFFTPipelines(device, N, 'f32');

  // --- Bind group layouts ---
  const convLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const updateLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const fieldOnlyLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const renderLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ],
  });

  // --- Uniform buffers ---
  const convBuffer = device.createBuffer({ label: 'sl-conv-params', size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const updateBuffer = device.createBuffer({ label: 'sl-update-params', size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const initBuffer = device.createBuffer({ label: 'sl-init-params', size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const paintBuffer = device.createBuffer({ label: 'sl-paint-params', size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const renderBuffer = device.createBuffer({ label: 'sl-render-params', size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  // --- Pipelines ---
  const convPipeline = device.createComputePipeline({
    label: 'sl-convolve',
    layout: device.createPipelineLayout({ bindGroupLayouts: [convLayout] }),
    compute: { module: device.createShaderModule({ label: 'sl-convolve', code: WGSL_CONVOLVE }), entryPoint: 'main' },
  });
  const updatePipeline = device.createComputePipeline({
    label: 'sl-update',
    layout: device.createPipelineLayout({ bindGroupLayouts: [updateLayout] }),
    compute: { module: device.createShaderModule({ label: 'sl-update', code: WGSL_UPDATE }), entryPoint: 'main' },
  });
  const initPipeline = device.createComputePipeline({
    label: 'sl-init',
    layout: device.createPipelineLayout({ bindGroupLayouts: [fieldOnlyLayout] }),
    compute: { module: device.createShaderModule({ label: 'sl-init', code: WGSL_INIT }), entryPoint: 'main' },
  });
  const paintPipeline = device.createComputePipeline({
    label: 'sl-paint',
    layout: device.createPipelineLayout({ bindGroupLayouts: [fieldOnlyLayout] }),
    compute: { module: device.createShaderModule({ label: 'sl-paint', code: WGSL_PAINT }), entryPoint: 'main' },
  });
  const renderModule = device.createShaderModule({ label: 'sl-render', code: WGSL_RENDER });

  // --- Bind groups ---
  const convBindGroup = device.createBindGroup({
    layout: convLayout,
    entries: [
      { binding: 0, resource: { buffer: fhat } },
      { binding: 1, resource: { buffer: convBuffer } },
    ],
  });
  const updateBindGroup = device.createBindGroup({
    layout: updateLayout,
    entries: [
      { binding: 0, resource: { buffer: conv } },
      { binding: 1, resource: { buffer: field } },
      { binding: 2, resource: { buffer: updateBuffer } },
    ],
  });
  const initBindGroup = device.createBindGroup({
    layout: fieldOnlyLayout,
    entries: [
      { binding: 0, resource: { buffer: field } },
      { binding: 1, resource: { buffer: initBuffer } },
    ],
  });
  const paintBindGroup = device.createBindGroup({
    layout: fieldOnlyLayout,
    entries: [
      { binding: 0, resource: { buffer: field } },
      { binding: 1, resource: { buffer: paintBuffer } },
    ],
  });
  const renderBindGroup = device.createBindGroup({
    layout: renderLayout,
    entries: [
      { binding: 0, resource: { buffer: field } },
      { binding: 1, resource: { buffer: renderBuffer } },
    ],
  });

  const dispatch = Math.ceil(N / 16);

  function ri() { return params.ra / params.innerRatio; }

  function writeConvUniforms() {
    const buf = new ArrayBuffer(16);
    const u = new Uint32Array(buf);
    const f = new Float32Array(buf);
    u[0] = N; u[1] = N;
    f[2] = ri();
    f[3] = params.ra;
    device.queue.writeBuffer(convBuffer, 0, buf);
  }
  function writeUpdateUniforms() {
    const buf = new ArrayBuffer(48);
    const u = new Uint32Array(buf);
    const f = new Float32Array(buf);
    u[0] = N;
    f[1] = ri();
    f[2] = params.ra;
    f[3] = params.alphaN;
    f[4] = params.alphaM;
    f[5] = params.dt;
    f[6] = params.b1;
    f[7] = params.b2;
    f[8] = params.d1;
    f[9] = params.d2;
    u[10] = params.mode >>> 0;
    device.queue.writeBuffer(updateBuffer, 0, buf);
  }
  function writeRenderUniforms() {
    const buf = new ArrayBuffer(32);
    const u = new Uint32Array(buf);
    const f = new Float32Array(buf);
    u[0] = N;
    u[1] = params.colormap >>> 0;
    f[2] = params.gamma;
    f[3] = params.aspect;
    f[4] = params.cx;
    f[5] = params.cy;
    f[6] = params.zoom;
    device.queue.writeBuffer(renderBuffer, 0, buf);
  }

  writeConvUniforms();
  writeUpdateUniforms();
  writeRenderUniforms();

  function initialize(opts = {}) {
    const seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const fill = opts.fill ?? params.fill;
    const scale = opts.scale ?? Math.max(3, params.ra * 1.2);
    const buf = new ArrayBuffer(16);
    const u = new Uint32Array(buf);
    const f = new Float32Array(buf);
    u[0] = N; u[1] = seed;
    f[2] = fill; f[3] = scale;
    device.queue.writeBuffer(initBuffer, 0, buf);

    const encoder = device.createCommandEncoder({ label: 'sl-init' });
    const pass = encoder.beginComputePass();
    pass.setPipeline(initPipeline);
    pass.setBindGroup(0, initBindGroup);
    pass.dispatchWorkgroups(dispatch, dispatch, 1);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  function step(count = 1) {
    writeConvUniforms();
    writeUpdateUniforms();
    for (let i = 0; i < count; i++) {
      // Forward FFT of the field (real part holds f).
      executeFFT2D({ device, pipelines: fftPipelines, input: field, output: fhat, temp, N, forward: true, splitNormalization: true });

      // Multiply spectrum by the packed disc kernels (in place).
      {
        const encoder = device.createCommandEncoder({ label: 'sl-convolve' });
        const pass = encoder.beginComputePass();
        pass.setPipeline(convPipeline);
        pass.setBindGroup(0, convBindGroup);
        pass.dispatchWorkgroups(dispatch, dispatch, 1);
        pass.end();
        device.queue.submit([encoder.finish()]);
      }

      // Inverse FFT: real part -> ri-disc average, imag part -> ra-disc average.
      executeFFT2D({ device, pipelines: fftPipelines, input: fhat, output: conv, temp, N, forward: false, splitNormalization: true });

      // Apply the transition rule and step the field.
      {
        const encoder = device.createCommandEncoder({ label: 'sl-update' });
        const pass = encoder.beginComputePass();
        pass.setPipeline(updatePipeline);
        pass.setBindGroup(0, updateBindGroup);
        pass.dispatchWorkgroups(dispatch, dispatch, 1);
        pass.end();
        device.queue.submit([encoder.finish()]);
      }
    }
  }

  function paint(cx, cy, radius, amount, opts = {}) {
    const buf = new ArrayBuffer(32);
    const u = new Uint32Array(buf);
    const f = new Float32Array(buf);
    f[0] = cx; f[1] = cy; f[2] = radius; f[3] = amount;
    u[4] = N;
    f[5] = opts.hardness ?? 0.5;
    device.queue.writeBuffer(paintBuffer, 0, buf);

    const encoder = device.createCommandEncoder({ label: 'sl-paint' });
    const pass = encoder.beginComputePass();
    pass.setPipeline(paintPipeline);
    pass.setBindGroup(0, paintBindGroup);
    pass.dispatchWorkgroups(dispatch, dispatch, 1);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  let renderPipeline = null;
  function render(textureView) {
    writeRenderUniforms();
    const encoder = device.createCommandEncoder({ label: 'sl-render' });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view: textureView, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
    });
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, renderBindGroup);
    pass.draw(3, 1, 0, 0);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  function createRenderer(canvasFormat) {
    renderPipeline = device.createRenderPipeline({
      label: 'sl-render',
      layout: device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
      vertex: { module: renderModule, entryPoint: 'vs' },
      fragment: { module: renderModule, entryPoint: 'fs', targets: [{ format: canvasFormat }] },
      primitive: { topology: 'triangle-list' },
    });
    return { render };
  }

  function setParams(patch) {
    Object.assign(params, patch);
  }

  function destroy() {
    for (const b of [field, fhat, conv, temp[0], temp[1], convBuffer, updateBuffer, initBuffer, paintBuffer, renderBuffer]) b.destroy();
  }

  return { N, params, initialize, step, paint, render, createRenderer, setParams, destroy };
}
