/**
 * Batched 1D FFTs along lines of a 3D array stored in a flat storage buffer.
 *
 * Each workgroup owns one line: it gathers the line into workgroup memory,
 * runs every radix-2 butterfly stage there, and writes the line back once.
 * Global memory is therefore touched exactly once for reading and once for
 * writing per transform, regardless of line length, and a strided line (one
 * that is not contiguous in memory) costs no transpose pass.
 *
 * All dimensions are baked into the generated WGSL as constants, so the
 * shaders need no uniform buffers and nothing is allocated per solve.
 *
 * Three kinds of transform are generated:
 *
 *  - `r2c`: real line of length N -> half spectrum of N/2+1 complex modes,
 *    computed with a complex FFT of length N/2 (even samples in the real
 *    part, odd samples in the imaginary part, then an untangling step).
 *  - `c2c`: complex line of length N, in place, with an arbitrary stride.
 *  - `c2r`: the inverse of `r2c`.
 *
 * Forward transforms are unnormalised. The `c2r` shader multiplies by a
 * caller-supplied scale so that one constant covers the whole round trip.
 */

function isPow2(n) {
  return Number.isInteger(n) && n >= 1 && (n & (n - 1)) === 0;
}

/**
 * Table of exp(-2 pi i q / period) for q in [0, count), as interleaved f32
 * (re, im). Evaluated in double precision so that the shader never calls
 * sin/cos, whose single-precision accuracy differs between GPU vendors.
 */
export function makeTwiddles(period, count) {
  const out = new Float32Array(2 * count);
  for (let q = 0; q < count; q++) {
    const a = (-2 * Math.PI * q) / period;
    out[2 * q] = Math.cos(a);
    out[2 * q + 1] = Math.sin(a);
  }
  return out;
}

/**
 * Pick the workgroup size for an FFT of length n: as many invocations as the
 * line has elements, capped by `maxInvocations`. When the line is longer than
 * the workgroup, each invocation handles n / W elements per stage.
 */
function workgroupFor(n, maxInvocations) {
  let W = 1;
  while (W * 2 <= Math.min(n, maxInvocations)) W *= 2;
  return { W, E: n / W };
}

/**
 * WGSL for all butterfly stages of a length-n transform held in the
 * workgroup arrays `wa` / `wb`. Stage s reads one and writes the other, so a
 * single barrier per stage suffices. Returns the code and the name of the
 * array holding the result.
 *
 * `twStride` maps a butterfly index onto the twiddle table: the table holds
 * exp(-2 pi i q / period) and stage s needs exp(-+2 pi i k / m), i.e. entry
 * k * (period / m).
 */
function butterflyStages({ n, W, E, period, inverse }) {
  const L = Math.log2(n);
  let code = '';
  for (let s = 0; s < L; s++) {
    const half = 1 << s;
    const m = half * 2;
    const src = s % 2 === 0 ? 'wa' : 'wb';
    const dst = s % 2 === 0 ? 'wb' : 'wa';
    code += `
  // stage ${s}: groups of ${m}
  for (var e = 0u; e < ${E}u; e++) {
    let j = lid + e * ${W}u;
    let k = j & ${half - 1}u;
    let lo = j & ${(~half) >>> 0}u;
    let t = tw[k * ${period / m}u];
    let a = ${src}[lo];
    let b = cmul(${inverse ? 'vec2f(t.x, -t.y)' : 't'}, ${src}[lo + ${half}u]);
    ${dst}[j] = select(a + b, a - b, (j & ${half}u) != 0u);
  }
  workgroupBarrier();
`;
  }
  return { code, result: L % 2 === 0 ? 'wa' : 'wb' };
}

const COMMON = /* wgsl */ `
fn cmul(a: vec2f, b: vec2f) -> vec2f {
  return vec2f(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}
`;

function workgroupArrays(n) {
  return `
var<workgroup> wa: array<vec2f, ${n}>;
var<workgroup> wb: array<vec2f, ${n}>;
`;
}

/**
 * Real-to-complex transform along contiguous lines.
 *
 * Input:  array<f32>, line l occupies [l * N, (l + 1) * N).
 * Output: array<vec2f>, line l occupies [l * (N/2+1), (l + 1) * (N/2+1)).
 * Line index: workgroup_id.x + linesX * workgroup_id.y.
 * Twiddles: makeTwiddles(N, N/2 + 1).
 */
export function generateR2C({ N, linesX, maxInvocations = 256 }) {
  if (!isPow2(N) || N < 4) throw new Error(`r2c length must be a power of two >= 4, got ${N}`);
  const H = N / 2;
  const M = H + 1;
  const L = Math.log2(H);
  const { W, E } = workgroupFor(H, maxInvocations);
  const stages = butterflyStages({ n: H, W, E, period: N, inverse: false });
  return {
    workgroupSize: W,
    code: /* wgsl */ `
// r2c, N = ${N} (complex FFT of length ${H}), ${W} invocations x ${E} elements
${COMMON}
@group(0) @binding(0) var<storage, read> src: array<f32>;
@group(0) @binding(1) var<storage, read_write> dst: array<vec2f>;
@group(0) @binding(2) var<storage, read> tw: array<vec2f>;
${workgroupArrays(H)}
@compute @workgroup_size(${W})
fn main(@builtin(local_invocation_index) lid: u32, @builtin(workgroup_id) wid: vec3u) {
  let line = wid.x + ${linesX}u * wid.y;
  let inBase = line * ${N}u;
  let outBase = line * ${M}u;

  // Pack even samples into the real part and odd samples into the imaginary
  // part, in bit-reversed order.
  for (var e = 0u; e < ${E}u; e++) {
    let j = lid + e * ${W}u;
    let r = ${L === 0 ? '0u' : `reverseBits(j) >> ${32 - L}u`};
    wa[j] = vec2f(src[inBase + 2u * r], src[inBase + 2u * r + 1u]);
  }
  workgroupBarrier();
${stages.code}
  // Untangle: X[k] = (Z[k] + conj(Z[H-k])) / 2 - i w^k (Z[k] - conj(Z[H-k])) / 2
  for (var e = 0u; e < ${E}u; e++) {
    let k = lid + e * ${W}u;
    let z = ${stages.result}[k];
    let zr = ${stages.result}[(${H}u - k) & ${H - 1}u];
    let zc = vec2f(zr.x, -zr.y);
    let d = cmul(tw[k], z - zc);
    dst[outBase + k] = 0.5 * (z + zc + vec2f(d.y, -d.x));
    if (k == 0u) {
      dst[outBase + ${H}u] = vec2f(z.x - z.y, 0.0);
    }
  }
}
`,
  };
}

/**
 * Complex-to-real inverse of `generateR2C`. Output is multiplied by `scale`
 * (the unscaled round trip r2c -> c2r gains a factor N/2).
 */
export function generateC2R({ N, linesX, scale, maxInvocations = 256 }) {
  if (!isPow2(N) || N < 4) throw new Error(`c2r length must be a power of two >= 4, got ${N}`);
  const H = N / 2;
  const M = H + 1;
  const L = Math.log2(H);
  const { W, E } = workgroupFor(H, maxInvocations);
  const stages = butterflyStages({ n: H, W, E, period: N, inverse: true });
  return {
    workgroupSize: W,
    code: /* wgsl */ `
// c2r, N = ${N} (complex FFT of length ${H}), ${W} invocations x ${E} elements
${COMMON}
@group(0) @binding(0) var<storage, read> src: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> dst: array<f32>;
@group(0) @binding(2) var<storage, read> tw: array<vec2f>;
${workgroupArrays(H)}
@compute @workgroup_size(${W})
fn main(@builtin(local_invocation_index) lid: u32, @builtin(workgroup_id) wid: vec3u) {
  let line = wid.x + ${linesX}u * wid.y;
  let inBase = line * ${M}u;
  let outBase = line * ${N}u;

  // Tangle: Z[k] = (X[k] + conj(X[H-k])) / 2 + i conj(w^k) (X[k] - conj(X[H-k])) / 2
  for (var e = 0u; e < ${E}u; e++) {
    let j = lid + e * ${W}u;
    let k = ${L === 0 ? '0u' : `reverseBits(j) >> ${32 - L}u`};
    let x = src[inBase + k];
    let xr = src[inBase + ${H}u - k];
    let xc = vec2f(xr.x, -xr.y);
    let t = tw[k];
    let d = cmul(vec2f(t.x, -t.y), x - xc);
    wa[j] = 0.5 * (x + xc + vec2f(-d.y, d.x));
  }
  workgroupBarrier();
${stages.code}
  for (var e = 0u; e < ${E}u; e++) {
    let n = lid + e * ${W}u;
    let z = ${stages.result}[n] * ${scale.toExponential(9)};
    dst[outBase + 2u * n] = z.x;
    dst[outBase + 2u * n + 1u] = z.y;
  }
}
`,
  };
}

/**
 * In-place complex transform along strided lines.
 *
 * Element n of line (a, b) = (workgroup_id.x, workgroup_id.y) lives at
 * a + lineStrideY * b + stride * n. Twiddles: makeTwiddles(N, N/2).
 *
 * Every element of a line is read into workgroup memory before any is
 * written back, and lines are disjoint, so operating in place is safe.
 */
export function generateC2C({ N, stride, lineStrideY, inverse, maxInvocations = 256 }) {
  if (!isPow2(N) || N < 2) throw new Error(`c2c length must be a power of two >= 2, got ${N}`);
  const L = Math.log2(N);
  const { W, E } = workgroupFor(N, maxInvocations);
  const stages = butterflyStages({ n: N, W, E, period: N, inverse });
  return {
    workgroupSize: W,
    code: /* wgsl */ `
// c2c ${inverse ? 'inverse' : 'forward'}, N = ${N}, stride ${stride}, ${W} invocations x ${E} elements
${COMMON}
@group(0) @binding(0) var<storage, read_write> data: array<vec2f>;
@group(0) @binding(1) var<storage, read> tw: array<vec2f>;
${workgroupArrays(N)}
@compute @workgroup_size(${W})
fn main(@builtin(local_invocation_index) lid: u32, @builtin(workgroup_id) wid: vec3u) {
  let base = wid.x + ${lineStrideY}u * wid.y;
  for (var e = 0u; e < ${E}u; e++) {
    let j = lid + e * ${W}u;
    wa[j] = data[base + ${stride}u * (reverseBits(j) >> ${32 - L}u)];
  }
  workgroupBarrier();
${stages.code}
  for (var e = 0u; e < ${E}u; e++) {
    let j = lid + e * ${W}u;
    data[base + ${stride}u * j] = ${stages.result}[j];
  }
}
`,
  };
}

/** Bytes of workgroup storage a length-n transform needs (two vec2f arrays). */
export function workgroupStorageBytes(n) {
  return 2 * n * 8;
}
