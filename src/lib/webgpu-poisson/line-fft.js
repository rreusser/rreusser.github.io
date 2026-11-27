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
 * Where a complex field lives inside a storage buffer declared as
 * array<vec2f>. A buffer may interleave several fields per site: field
 * `offset` of `stride` fields per site is at element offset + stride * site.
 * The default is a buffer holding one field.
 */
const ONE_FIELD = { stride: 1, offset: 0 };
const element = (field, site) =>
  field.stride === 1 && field.offset === 0 ? site : `${field.offset}u + ${field.stride}u * (${site})`;

/**
 * Real-to-complex transform along contiguous lines.
 *
 * Input:  by default array<f32>, line l occupying [l * N, (l + 1) * N).
 * Output: array<vec2f> field, line l occupying sites [l * (N/2+1), ...).
 * Line index: workgroup_id.x + linesX * workgroup_id.y.
 * Twiddles: makeTwiddles(N, N/2 + 1).
 *
 * `source` replaces the input by an arbitrary expression, which lets a
 * product or a difference be formed as it is loaded instead of in a pass of
 * its own. It is { declarations, value }: WGSL declaring whatever bindings
 * the expression reads (binding 0 and any from 3 up; 1 and 2 are the output
 * and the twiddles), and an expression for the sample at position `i` along
 * the line, on line (`a`, `b`) = workgroup_id.xy, all u32.
 *
 * @param {Object} [opts.dst] - { stride, offset } of the output field
 */
export function generateR2C({ N, linesX, maxInvocations = 256, source = null, dst = ONE_FIELD }) {
  if (!isPow2(N) || N < 4) throw new Error(`r2c length must be a power of two >= 4, got ${N}`);
  const H = N / 2;
  const M = H + 1;
  const L = Math.log2(H);
  const { W, E } = workgroupFor(H, maxInvocations);
  const stages = butterflyStages({ n: H, W, E, period: N, inverse: false });
  const declarations = source
    ? source.declarations
    : '@group(0) @binding(0) var<storage, read> src: array<f32>;';
  const value = source ? source.value : `src[(a + ${linesX}u * b) * ${N}u + i]`;
  return {
    workgroupSize: W,
    code: /* wgsl */ `
// r2c, N = ${N} (complex FFT of length ${H}), ${W} invocations x ${E} elements
${COMMON}
${declarations}
@group(0) @binding(1) var<storage, read_write> dst: array<vec2f>;
@group(0) @binding(2) var<storage, read> tw: array<vec2f>;
${workgroupArrays(H)}
fn load(i: u32, a: u32, b: u32) -> f32 {
  return ${value};
}

@compute @workgroup_size(${W})
fn main(@builtin(local_invocation_index) lid: u32, @builtin(workgroup_id) wid: vec3u) {
  let line = wid.x + ${linesX}u * wid.y;
  let outBase = line * ${M}u;

  // Pack even samples into the real part and odd samples into the imaginary
  // part, in bit-reversed order.
  for (var e = 0u; e < ${E}u; e++) {
    let j = lid + e * ${W}u;
    let r = ${L === 0 ? '0u' : `reverseBits(j) >> ${32 - L}u`};
    wa[j] = vec2f(load(2u * r, wid.x, wid.y), load(2u * r + 1u, wid.x, wid.y));
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
    dst[${element(dst, 'outBase + k')}] = 0.5 * (z + zc + vec2f(d.y, -d.x));
    if (k == 0u) {
      dst[${element(dst, `outBase + ${H}u`)}] = vec2f(z.x - z.y, 0.0);
    }
  }
}
`,
  };
}

/**
 * Complex-to-real inverse of `generateR2C`. Output is multiplied by `scale`
 * (the unscaled round trip r2c -> c2r gains a factor N/2).
 *
 * @param {Object} [opts.src] - { stride, offset } of the input field
 * @param {Object} [opts.dst] - { stride, offset } of the output inside an
 *   array<f32>, so one component of an interleaved real field can be written
 * @param {number} [opts.keptModes] - modes at and above this index are taken
 *   as zero without being read, for spectra truncated to remove aliasing
 */
export function generateC2R({ N, linesX, scale, maxInvocations = 256, src = ONE_FIELD, dst = ONE_FIELD, keptModes = null }) {
  if (!isPow2(N) || N < 4) throw new Error(`c2r length must be a power of two >= 4, got ${N}`);
  const H = N / 2;
  const M = H + 1;
  const L = Math.log2(H);
  const { W, E } = workgroupFor(H, maxInvocations);
  const stages = butterflyStages({ n: H, W, E, period: N, inverse: true });
  const kept = keptModes ?? M;
  return {
    workgroupSize: W,
    code: /* wgsl */ `
// c2r, N = ${N} (complex FFT of length ${H}), ${W} invocations x ${E} elements
${COMMON}
@group(0) @binding(0) var<storage, read> src: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> dst: array<f32>;
@group(0) @binding(2) var<storage, read> tw: array<vec2f>;
${workgroupArrays(H)}
fn mode(base: u32, k: u32) -> vec2f {
  if (k >= ${kept}u) { return vec2f(0.0); }
  return src[${element(src, 'base + k')}];
}

@compute @workgroup_size(${W})
fn main(@builtin(local_invocation_index) lid: u32, @builtin(workgroup_id) wid: vec3u) {
  let line = wid.x + ${linesX}u * wid.y;
  let inBase = line * ${M}u;
  let outBase = line * ${N}u;

  // Tangle: Z[k] = (X[k] + conj(X[H-k])) / 2 + i conj(w^k) (X[k] - conj(X[H-k])) / 2
  for (var e = 0u; e < ${E}u; e++) {
    let j = lid + e * ${W}u;
    let k = ${L === 0 ? '0u' : `reverseBits(j) >> ${32 - L}u`};
    let x = mode(inBase, k);
    let xr = mode(inBase, ${H}u - k);
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
    dst[${element(dst, 'outBase + 2u * n')}] = z.x;
    dst[${element(dst, 'outBase + 2u * n + 1u')}] = z.y;
  }
}
`,
  };
}

/**
 * Complex transform along strided lines.
 *
 * Sample n of line (a, b) = (workgroup_id.x, workgroup_id.y) is at site
 * a + lineStrideY * b + stride * n. Twiddles: makeTwiddles(N, N/2).
 *
 * By default the transform is in place on binding 0. Every sample of a line
 * is read into workgroup memory before any is written back, and lines are
 * disjoint, so that is safe. With `dst` given, the result goes to a second
 * buffer on binding 2 instead and the input is left alone.
 *
 * @param {Object} [opts.src] - { stride, offset } of the input field
 * @param {Object} [opts.dst] - { stride, offset } of a separate output field
 */
export function generateC2C({ N, stride, lineStrideY, inverse, maxInvocations = 256, src = ONE_FIELD, dst = null }) {
  if (!isPow2(N) || N < 2) throw new Error(`c2c length must be a power of two >= 2, got ${N}`);
  const L = Math.log2(N);
  const { W, E } = workgroupFor(N, maxInvocations);
  const stages = butterflyStages({ n: N, W, E, period: N, inverse });
  const out = dst ?? src;
  return {
    workgroupSize: W,
    code: /* wgsl */ `
// c2c ${inverse ? 'inverse' : 'forward'}, N = ${N}, stride ${stride}, ${W} invocations x ${E} elements
${COMMON}
@group(0) @binding(0) var<storage, ${dst ? 'read' : 'read_write'}> data: array<vec2f>;
@group(0) @binding(1) var<storage, read> tw: array<vec2f>;
${dst ? '@group(0) @binding(2) var<storage, read_write> result: array<vec2f>;' : ''}
${workgroupArrays(N)}
@compute @workgroup_size(${W})
fn main(@builtin(local_invocation_index) lid: u32, @builtin(workgroup_id) wid: vec3u) {
  let base = wid.x + ${lineStrideY}u * wid.y;
  for (var e = 0u; e < ${E}u; e++) {
    let j = lid + e * ${W}u;
    wa[j] = data[${element(src, `base + ${stride}u * (reverseBits(j) >> ${32 - L}u)`)}];
  }
  workgroupBarrier();
${stages.code}
  for (var e = 0u; e < ${E}u; e++) {
    let j = lid + e * ${W}u;
    ${dst ? 'result' : 'data'}[${element(out, `base + ${stride}u * j`)}] = ${stages.result}[j];
  }
}
`,
  };
}

/** Bytes of workgroup storage a length-n transform needs (two vec2f arrays). */
export function workgroupStorageBytes(n) {
  return 2 * n * 8;
}
