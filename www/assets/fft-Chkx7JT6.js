function A(e,r="f32"){if(e==null||!Number.isInteger(e)||e<2||(e&e-1)!==0)throw new Error(`N must be a power of 2 integer >= 2, got ${e}`);const u=Math.log2(e),n=r==="f16"?"vec2<f16>":"vec2<f32>",o=r==="f16"?`enable f16;
`:"",a=r==="f16"?"vec2<f32>":"",i=r==="f16"?"vec2<f16>":"";return`
// Generated FFT Shader for N=${e}
// Cooley-Tukey Radix-2 DIT FFT with bit-reversal permutation
// Storage: ${r}, Computation: f32

${o}
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x
  );
}

struct FFTParams {
  N: u32,
  num_rows: u32,
  forward: u32,
  split_norm: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${n}>;
@group(0) @binding(1) var<storage, read_write> output: array<${n}>;
@group(0) @binding(2) var<uniform> params: FFTParams;

var<workgroup> buffer_a: array<vec2<f32>, ${e}>;
var<workgroup> buffer_b: array<vec2<f32>, ${e}>;

// Bit-reverse for ${u} bits
fn bitrev(x: u32) -> u32 {
  var v = x;
  var result = 0u;
  for (var i = 0u; i < ${u}u; i++) {
    result = (result << 1u) | (v & 1u);
    v = v >> 1u;
  }
  return result;
}

@compute @workgroup_size(${e}, 1, 1)
fn fft_horizontal(@builtin(local_invocation_id) local_id: vec3<u32>,
                  @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  let row = workgroup_id.x;
  let j = local_id.x;
  let N = ${e}u;

  if (row >= params.num_rows) {
    return;
  }

  let is_forward = params.forward != 0u;
  let sign = select(1.0, -1.0, is_forward);
  let PI = 3.14159265358979;

  // Load with bit-reversal into buffer_a
  let input_idx = row * N + bitrev(j);
  buffer_a[j] = ${a}(input[input_idx]);
  workgroupBarrier();

  // ${u} stages of butterflies using ping-pong buffers
  for (var s = 0u; s < ${u}u; s++) {
    let m = 1u << (s + 1u);       // butterfly group size
    let half_m = 1u << s;         // half of group size

    let group = j / m;            // which group am I in
    let idx_in_group = j % m;     // position within group
    let is_first_half = idx_in_group < half_m;
    let k = select(idx_in_group - half_m, idx_in_group, is_first_half);
    let base = group * m + k;

    // Twiddle factor: exp(sign * 2πi * k / m)
    let angle = sign * 2.0 * PI * f32(k) / f32(m);
    let w = vec2<f32>(cos(angle), sin(angle));

    // Read from source buffer
    var a: vec2<f32>;
    var b: vec2<f32>;
    if ((s & 1u) == 0u) {
      a = buffer_a[base];
      b = cmul(w, buffer_a[base + half_m]);
    } else {
      a = buffer_b[base];
      b = cmul(w, buffer_b[base + half_m]);
    }

    // Compute butterfly result
    let result = select(a - b, a + b, is_first_half);

    workgroupBarrier();

    // Write to destination buffer
    if ((s & 1u) == 0u) {
      buffer_b[j] = result;
    } else {
      buffer_a[j] = result;
    }

    workgroupBarrier();
  }

  // Get result from correct buffer (depends on whether log2N is odd or even)
  // After log2N stages, result is in buffer_a if last stage (log2N-1) is odd
  // Last stage is odd when log2N is even
  var result = select(buffer_b[j], buffer_a[j], ${u%2===0?"true":"false"});

  // Normalization
  if (params.split_norm != 0u) {
    result = result / sqrt(f32(N));
  } else if (!is_forward) {
    result = result / f32(N);
  }

  // Write output
  let output_idx = row * N + j;
  output[output_idx] = ${i}(result);
}

@compute @workgroup_size(${e}, 1, 1)
fn fft_vertical(@builtin(local_invocation_id) local_id: vec3<u32>,
                @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  let row = workgroup_id.x;
  let j = local_id.x;
  let N = ${e}u;

  if (row >= params.num_rows) {
    return;
  }

  let is_forward = params.forward != 0u;
  let sign = select(1.0, -1.0, is_forward);
  let PI = 3.14159265358979;

  // Load with bit-reversal
  let input_idx = row * N + bitrev(j);
  buffer_a[j] = ${a}(input[input_idx]);
  workgroupBarrier();

  for (var s = 0u; s < ${u}u; s++) {
    let m = 1u << (s + 1u);
    let half_m = 1u << s;
    let group = j / m;
    let idx_in_group = j % m;
    let is_first_half = idx_in_group < half_m;
    let k = select(idx_in_group - half_m, idx_in_group, is_first_half);
    let base = group * m + k;

    let angle = sign * 2.0 * PI * f32(k) / f32(m);
    let w = vec2<f32>(cos(angle), sin(angle));

    var a: vec2<f32>;
    var b: vec2<f32>;
    if ((s & 1u) == 0u) {
      a = buffer_a[base];
      b = cmul(w, buffer_a[base + half_m]);
    } else {
      a = buffer_b[base];
      b = cmul(w, buffer_b[base + half_m]);
    }

    let result = select(a - b, a + b, is_first_half);

    workgroupBarrier();

    if ((s & 1u) == 0u) {
      buffer_b[j] = result;
    } else {
      buffer_a[j] = result;
    }

    workgroupBarrier();
  }

  // After log2N stages, result is in buffer_a if last stage (log2N-1) is odd
  // Last stage is odd when log2N is even
  var result = select(buffer_b[j], buffer_a[j], ${u%2===0?"true":"false"});

  if (params.split_norm != 0u) {
    result = result / sqrt(f32(N));
  } else if (!is_forward) {
    result = result / f32(N);
  }

  // Write output
  let output_idx = row * N + j;
  output[output_idx] = ${i}(result);
}
`}function Y(e,r="f32"){if(e==null||!Number.isInteger(e)||e<2||(e&e-1)!==0)throw new Error(`N must be a power of 2 integer >= 2, got ${e}`);const u=Math.log2(e),n=r==="f16"?"vec4<f16>":"vec4<f32>",o=r==="f16"?`enable f16;
`:"",a=r==="f16"?"vec4<f32>":"",i=r==="f16"?"vec4<f16>":"";return`
// Generated Vec4 FFT Shader for N=${e}
// Processes two complex numbers per element: (re1, im1, re2, im2)
// Cooley-Tukey Radix-2 DIT FFT with bit-reversal permutation
// Storage: ${r}, Computation: f32

${o}
// Complex multiply for two packed complex numbers
// a = (a1.re, a1.im, a2.re, a2.im), b = (b1.re, b1.im, b2.re, b2.im)
// Returns (a1*b1, a2*b2) in same packed format
fn cmul4(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(
    a.x * b.x - a.y * b.y,  // re1 = a1.re * b1.re - a1.im * b1.im
    a.x * b.y + a.y * b.x,  // im1 = a1.re * b1.im + a1.im * b1.re
    a.z * b.z - a.w * b.w,  // re2 = a2.re * b2.re - a2.im * b2.im
    a.z * b.w + a.w * b.z   // im2 = a2.re * b2.im + a2.im * b2.re
  );
}

struct FFTParams {
  N: u32,
  num_rows: u32,
  forward: u32,
  split_norm: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${n}>;
@group(0) @binding(1) var<storage, read_write> output: array<${n}>;
@group(0) @binding(2) var<uniform> params: FFTParams;

var<workgroup> buffer_a: array<vec4<f32>, ${e}>;
var<workgroup> buffer_b: array<vec4<f32>, ${e}>;

// Bit-reverse for ${u} bits
fn bitrev(x: u32) -> u32 {
  var v = x;
  var result = 0u;
  for (var i = 0u; i < ${u}u; i++) {
    result = (result << 1u) | (v & 1u);
    v = v >> 1u;
  }
  return result;
}

@compute @workgroup_size(${e}, 1, 1)
fn fft_horizontal(@builtin(local_invocation_id) local_id: vec3<u32>,
                  @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  let row = workgroup_id.x;
  let j = local_id.x;
  let N = ${e}u;

  if (row >= params.num_rows) {
    return;
  }

  let is_forward = params.forward != 0u;
  let sign = select(1.0, -1.0, is_forward);
  let PI = 3.14159265358979;

  // Load with bit-reversal into buffer_a
  let input_idx = row * N + bitrev(j);
  buffer_a[j] = ${a}(input[input_idx]);
  workgroupBarrier();

  // ${u} stages of butterflies using ping-pong buffers
  for (var s = 0u; s < ${u}u; s++) {
    let m = 1u << (s + 1u);       // butterfly group size
    let half_m = 1u << s;         // half of group size

    let group = j / m;            // which group am I in
    let idx_in_group = j % m;     // position within group
    let is_first_half = idx_in_group < half_m;
    let k = select(idx_in_group - half_m, idx_in_group, is_first_half);
    let base = group * m + k;

    // Twiddle factor: exp(sign * 2πi * k / m)
    // Same twiddle for both complex pairs
    let angle = sign * 2.0 * PI * f32(k) / f32(m);
    let c = cos(angle);
    let s_val = sin(angle);
    // Pack twiddle as (c, s, c, s) for both complex numbers
    let w = vec4<f32>(c, s_val, c, s_val);

    // Read from source buffer
    var a: vec4<f32>;
    var b: vec4<f32>;
    if ((s & 1u) == 0u) {
      a = buffer_a[base];
      b = cmul4(w, buffer_a[base + half_m]);
    } else {
      a = buffer_b[base];
      b = cmul4(w, buffer_b[base + half_m]);
    }

    // Compute butterfly result for both complex pairs
    let result = select(a - b, a + b, is_first_half);

    workgroupBarrier();

    // Write to destination buffer
    if ((s & 1u) == 0u) {
      buffer_b[j] = result;
    } else {
      buffer_a[j] = result;
    }

    workgroupBarrier();
  }

  // Get result from correct buffer (depends on whether log2N is odd or even)
  var result = select(buffer_b[j], buffer_a[j], ${u%2===0?"true":"false"});

  // Normalization
  if (params.split_norm != 0u) {
    result = result / sqrt(f32(N));
  } else if (!is_forward) {
    result = result / f32(N);
  }

  // Write output
  let output_idx = row * N + j;
  output[output_idx] = ${i}(result);
}

@compute @workgroup_size(${e}, 1, 1)
fn fft_vertical(@builtin(local_invocation_id) local_id: vec3<u32>,
                @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  let row = workgroup_id.x;
  let j = local_id.x;
  let N = ${e}u;

  if (row >= params.num_rows) {
    return;
  }

  let is_forward = params.forward != 0u;
  let sign = select(1.0, -1.0, is_forward);
  let PI = 3.14159265358979;

  // Load with bit-reversal
  let input_idx = row * N + bitrev(j);
  buffer_a[j] = ${a}(input[input_idx]);
  workgroupBarrier();

  for (var s = 0u; s < ${u}u; s++) {
    let m = 1u << (s + 1u);
    let half_m = 1u << s;
    let group = j / m;
    let idx_in_group = j % m;
    let is_first_half = idx_in_group < half_m;
    let k = select(idx_in_group - half_m, idx_in_group, is_first_half);
    let base = group * m + k;

    let angle = sign * 2.0 * PI * f32(k) / f32(m);
    let c = cos(angle);
    let s_val = sin(angle);
    let w = vec4<f32>(c, s_val, c, s_val);

    var a: vec4<f32>;
    var b: vec4<f32>;
    if ((s & 1u) == 0u) {
      a = buffer_a[base];
      b = cmul4(w, buffer_a[base + half_m]);
    } else {
      a = buffer_b[base];
      b = cmul4(w, buffer_b[base + half_m]);
    }

    let result = select(a - b, a + b, is_first_half);

    workgroupBarrier();

    if ((s & 1u) == 0u) {
      buffer_b[j] = result;
    } else {
      buffer_a[j] = result;
    }

    workgroupBarrier();
  }

  var result = select(buffer_b[j], buffer_a[j], ${u%2===0?"true":"false"});

  if (params.split_norm != 0u) {
    result = result / sqrt(f32(N));
  } else if (!is_forward) {
    result = result / f32(N);
  }

  // Write output
  let output_idx = row * N + j;
  output[output_idx] = ${i}(result);
}
`}function Z(e="f32"){const r=e==="f16"?"vec4<f16>":"vec4<f32>";return`
// Matrix transpose shader for vec4 data
// Uses 16x16 tiles for coalesced memory access
// Storage: ${e}, Computation: f32

${e==="f16"?`enable f16;
`:""}
struct TransposeParams {
  N: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${r}>;
@group(0) @binding(1) var<storage, read_write> output: array<${r}>;
@group(0) @binding(2) var<uniform> params: TransposeParams;

var<workgroup> tile: array<array<vec4<f32>, 17>, 16>;  // 17 to avoid bank conflicts

@compute @workgroup_size(16, 16, 1)
fn transpose(@builtin(local_invocation_id) local_id: vec3<u32>,
             @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  let N = params.N;
  let tile_x = workgroup_id.x * 16u;
  let tile_y = workgroup_id.y * 16u;

  let x = tile_x + local_id.x;
  let y = tile_y + local_id.y;

  // Load tile (coalesced read)
  if (x < N && y < N) {
    tile[local_id.y][local_id.x] = ${e==="f16"?"vec4<f32>":""}(input[y * N + x]);
  }

  workgroupBarrier();

  // Write transposed (coalesced write)
  let out_x = tile_y + local_id.x;
  let out_y = tile_x + local_id.y;

  if (out_x < N && out_y < N) {
    output[out_y * N + out_x] = ${e==="f16"?"vec4<f16>":""}(tile[local_id.x][local_id.y]);
  }
}
`}function J(e="f32"){const r=e==="f16"?"vec2<f16>":"vec2<f32>";return`
// Matrix transpose shader
// Uses 16x16 tiles for coalesced memory access
// Storage: ${e}, Computation: f32

${e==="f16"?`enable f16;
`:""}
struct TransposeParams {
  N: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${r}>;
@group(0) @binding(1) var<storage, read_write> output: array<${r}>;
@group(0) @binding(2) var<uniform> params: TransposeParams;

var<workgroup> tile: array<array<vec2<f32>, 17>, 16>;  // 17 to avoid bank conflicts

@compute @workgroup_size(16, 16, 1)
fn transpose(@builtin(local_invocation_id) local_id: vec3<u32>,
             @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  let N = params.N;
  let tile_x = workgroup_id.x * 16u;
  let tile_y = workgroup_id.y * 16u;

  let x = tile_x + local_id.x;
  let y = tile_y + local_id.y;

  // Load tile (coalesced read)
  if (x < N && y < N) {
    tile[local_id.y][local_id.x] = ${e==="f16"?"vec2<f32>":""}(input[y * N + x]);
  }

  workgroupBarrier();

  // Write transposed (coalesced write)
  let out_x = tile_y + local_id.x;
  let out_y = tile_x + local_id.y;

  if (out_x < N && out_y < N) {
    output[out_y * N + out_x] = ${e==="f16"?"vec2<f16>":""}(tile[local_id.x][local_id.y]);
  }
}
`}function F(e){return{storageType:e==="f16"?"vec2<f16>":"vec2<f32>",enableF16:e==="f16"?`enable f16;
`:"",loadConvert:e==="f16"?"vec2<f32>":"",storeConvert:e==="f16"?"vec2<f16>":""}}function ee(e,r,u,n="f32"){const{storageType:o,enableF16:a}=F(n);return`
// Unscramble shader for N=${e} = ${r}×${u}
// Maps from four-step output order to natural frequency order
// Input position (r % R) * C + (r / R) -> Output position r
// Storage: ${n}

${a}
struct UnscrambleParams {
  C: u32,           // Sub-row size
  R: u32,           // Number of sub-rows per original row
  N: u32,           // Elements per original row
  num_original_rows: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${o}>;
@group(0) @binding(1) var<storage, read_write> output: array<${o}>;
@group(0) @binding(2) var<uniform> params: UnscrambleParams;

@compute @workgroup_size(256, 1, 1)
fn unscramble(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let k = global_id.x;  // Natural frequency index within row
  let row = global_id.y;  // Original row index

  let C = params.C;
  let R = params.R;
  let N = params.N;

  if (k >= N || row >= params.num_original_rows) {
    return;
  }

  // Four-step output: frequency k is at position (k % R) * C + (k / R)
  let scrambled_pos = (k % R) * C + (k / R);

  let input_idx = row * N + scrambled_pos;
  let output_idx = row * N + k;

  output[output_idx] = input[input_idx];
}
`}function re(e,r,u,n="f32"){const{storageType:o,enableF16:a}=F(n);return`
// Scramble shader for N=${e} = ${r}×${u}
// Maps from natural order to four-step input order (inverse of unscramble)
// Input position r -> Output position (r % R) * C + (r / R)
// Storage: ${n}

${a}
struct ScrambleParams {
  C: u32,
  R: u32,
  N: u32,
  num_original_rows: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${o}>;
@group(0) @binding(1) var<storage, read_write> output: array<${o}>;
@group(0) @binding(2) var<uniform> params: ScrambleParams;

@compute @workgroup_size(256, 1, 1)
fn scramble(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let k = global_id.x;  // Natural frequency index within row
  let row = global_id.y;  // Original row index

  let C = params.C;
  let R = params.R;
  let N = params.N;

  if (k >= N || row >= params.num_original_rows) {
    return;
  }

  // Map to four-step order: natural k -> position (k % R) * C + (k / R)
  let scrambled_pos = (k % R) * C + (k / R);

  let input_idx = row * N + k;
  let output_idx = row * N + scrambled_pos;

  output[output_idx] = input[input_idx];
}
`}function ae(e,r,u="f32"){if(e<2||(e&e-1)!==0)throw new Error(`C must be a power of 2 >= 2, got ${e}`);const n=Math.log2(e),o=r*e,{storageType:a,enableF16:i,loadConvert:s,storeConvert:c}=F(u);return`
// Sub-row FFT shader for C=${e}-point FFTs
// Handles 2D grid with N=${o} = ${r}×${e} elements per original row
// Each workgroup processes one sub-row
// Storage: ${u}

${i}
struct SubRowFFTParams {
  C: u32,           // Sub-row size (FFT size)
  R: u32,           // Number of sub-rows per original row
  N: u32,           // Total elements per original row (R * C)
  num_sub_rows: u32, // Total sub-rows to process (M * R for M original rows)
  forward: u32,
  split_norm: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${a}>;
@group(0) @binding(1) var<storage, read_write> output: array<${a}>;
@group(0) @binding(2) var<uniform> params: SubRowFFTParams;

fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x
  );
}

fn bitrev(x: u32) -> u32 {
  var v = x;
  var result = 0u;
  for (var i = 0u; i < ${n}u; i++) {
    result = (result << 1u) | (v & 1u);
    v = v >> 1u;
  }
  return result;
}

var<workgroup> buffer_a: array<vec2<f32>, ${e}>;
var<workgroup> buffer_b: array<vec2<f32>, ${e}>;

@compute @workgroup_size(${e}, 1, 1)
fn sub_row_fft(@builtin(local_invocation_id) local_id: vec3<u32>,
               @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  // 2D dispatch: x = sub-row within original row, y = original row
  let sub_row_index = workgroup_id.x;
  let original_row = workgroup_id.y;
  let sub_row = original_row * params.R + sub_row_index;  // Global sub-row index
  let j = local_id.x;            // Position within sub-row
  let C = ${e}u;
  let R = params.R;
  let N = params.N;

  if (sub_row >= params.num_sub_rows) {
    return;
  }
  let base_offset = original_row * N + sub_row_index * C;

  let is_forward = params.forward != 0u;
  let sign = select(1.0, -1.0, is_forward);
  let PI = 3.14159265358979;

  // Load with bit-reversal
  let input_idx = base_offset + bitrev(j);
  buffer_a[j] = ${s}(input[input_idx]);
  workgroupBarrier();

  // ${n} stages of butterflies
  for (var s = 0u; s < ${n}u; s++) {
    let m = 1u << (s + 1u);
    let half_m = 1u << s;

    let group = j / m;
    let idx_in_group = j % m;
    let is_first_half = idx_in_group < half_m;
    let k = select(idx_in_group - half_m, idx_in_group, is_first_half);
    let base = group * m + k;

    let angle = sign * 2.0 * PI * f32(k) / f32(m);
    let w = vec2<f32>(cos(angle), sin(angle));

    var a: vec2<f32>;
    var b: vec2<f32>;
    if ((s & 1u) == 0u) {
      a = buffer_a[base];
      b = cmul(w, buffer_a[base + half_m]);
    } else {
      a = buffer_b[base];
      b = cmul(w, buffer_b[base + half_m]);
    }

    let result = select(a - b, a + b, is_first_half);

    workgroupBarrier();

    if ((s & 1u) == 0u) {
      buffer_b[j] = result;
    } else {
      buffer_a[j] = result;
    }

    workgroupBarrier();
  }

  // Get result from correct buffer
  var result = select(buffer_b[j], buffer_a[j], ${n%2===0?"true":"false"});

  // Normalization (only sqrt(C) since this is one dimension of a 2D FFT)
  if (params.split_norm != 0u) {
    result = result / sqrt(f32(C));
  } else if (!is_forward) {
    result = result / f32(C);
  }

  // Write output at same offset structure
  let output_idx = base_offset + j;
  output[output_idx] = ${c}(result);
}
`}function oe(e,r,u,n="f32"){const{storageType:o,enableF16:a,loadConvert:i,storeConvert:s}=F(n);return`
// Twiddle factor multiplication for hierarchical FFT
// For each original row, multiplies element at sub-row r, position c by W_N^(r*c)
// Storage: ${n}

${a}
struct TwiddleParams {
  C: u32,           // Sub-row size
  R: u32,           // Number of sub-rows per original row
  N: u32,           // Total elements per original row
  num_original_rows: u32,
  forward: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${o}>;
@group(0) @binding(1) var<storage, read_write> output: array<${o}>;
@group(0) @binding(2) var<uniform> params: TwiddleParams;

fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x
  );
}

@compute @workgroup_size(16, 16, 1)
fn twiddle_multiply(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let c = global_id.x;  // column within sub-row (0 to C-1)
  let combined = global_id.y;  // combined index: original_row * R + r

  let C = params.C;
  let R = params.R;
  let N = params.N;

  let original_row = combined / R;
  let r = combined % R;  // sub-row index within original row

  if (c >= C || original_row >= params.num_original_rows) {
    return;
  }

  // Linear index in memory
  let idx = original_row * N + r * C + c;
  let val = ${i}(input[idx]);

  // Twiddle factor: W_N^(r*c)
  let sign = select(1.0, -1.0, params.forward != 0u);
  let PI = 3.14159265358979;
  let angle = sign * 2.0 * PI * f32(r) * f32(c) / f32(N);
  let w = vec2<f32>(cos(angle), sin(angle));

  output[idx] = ${s}(cmul(val, w));
}
`}function te(e,r,u="f32"){if(e<2||(e&e-1)!==0)throw new Error(`R must be a power of 2, got ${e}`);const n=Math.log2(e);if(e<=8)return ue(e,r,u);const{storageType:o,enableF16:a,loadConvert:i,storeConvert:s}=F(u);return`
// Column FFT shader for hierarchical FFT
// For each original row, does R=${e}-point FFTs on C=${r} columns
// Elements at positions c, c+C, c+2C, ..., c+(R-1)*C form one column
// Storage: ${u}

${a}
struct ColumnFFTParams {
  C: u32,           // Stride between column elements
  R: u32,           // FFT size
  N: u32,           // Elements per original row
  num_original_rows: u32,
  forward: u32,
  split_norm: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${o}>;
@group(0) @binding(1) var<storage, read_write> output: array<${o}>;
@group(0) @binding(2) var<uniform> params: ColumnFFTParams;

fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x
  );
}

fn bitrev(x: u32) -> u32 {
  var v = x;
  var result = 0u;
  for (var i = 0u; i < ${n}u; i++) {
    result = (result << 1u) | (v & 1u);
    v = v >> 1u;
  }
  return result;
}

var<workgroup> buffer_a: array<vec2<f32>, ${e}>;
var<workgroup> buffer_b: array<vec2<f32>, ${e}>;

@compute @workgroup_size(${e}, 1, 1)
fn column_fft(@builtin(local_invocation_id) local_id: vec3<u32>,
              @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  // 2D dispatch: workgroup_id.x = column, workgroup_id.y = original_row
  let col = workgroup_id.x;
  let original_row = workgroup_id.y;
  let j = local_id.x;  // position within column (0 to R-1)

  let C = params.C;
  let R = ${e}u;
  let N = params.N;

  if (original_row >= params.num_original_rows) {
    return;
  }

  let base_offset = original_row * N;

  let is_forward = params.forward != 0u;
  let sign = select(1.0, -1.0, is_forward);
  let PI = 3.14159265358979;

  // Load with bit-reversal - column elements are at stride C
  let input_idx = base_offset + bitrev(j) * C + col;
  buffer_a[j] = ${i}(input[input_idx]);
  workgroupBarrier();

  // ${n} stages of butterflies
  for (var s = 0u; s < ${n}u; s++) {
    let m = 1u << (s + 1u);
    let half_m = 1u << s;

    let group = j / m;
    let idx_in_group = j % m;
    let is_first_half = idx_in_group < half_m;
    let k = select(idx_in_group - half_m, idx_in_group, is_first_half);
    let base = group * m + k;

    let angle = sign * 2.0 * PI * f32(k) / f32(m);
    let w = vec2<f32>(cos(angle), sin(angle));

    var a: vec2<f32>;
    var b: vec2<f32>;
    if ((s & 1u) == 0u) {
      a = buffer_a[base];
      b = cmul(w, buffer_a[base + half_m]);
    } else {
      a = buffer_b[base];
      b = cmul(w, buffer_b[base + half_m]);
    }

    let result = select(a - b, a + b, is_first_half);

    workgroupBarrier();

    if ((s & 1u) == 0u) {
      buffer_b[j] = result;
    } else {
      buffer_a[j] = result;
    }

    workgroupBarrier();
  }

  // Get result from correct buffer
  var result = select(buffer_b[j], buffer_a[j], ${n%2===0?"true":"false"});

  // Normalization
  if (params.split_norm != 0u) {
    result = result / sqrt(f32(R));
  } else if (!is_forward) {
    result = result / f32(R);
  }

  // Write output - column elements are at stride C
  let output_idx = base_offset + j * C + col;
  output[output_idx] = ${s}(result);
}
`}function ue(e,r,u){const{storageType:n,enableF16:o,loadConvert:a,storeConvert:i}=F(u);if(e===2)return`
// Optimized 2-point column FFT for hierarchical FFT
// Storage: ${u}

${o}
struct ColumnFFTParams {
  C: u32,
  R: u32,
  N: u32,
  num_original_rows: u32,
  forward: u32,
  split_norm: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${n}>;
@group(0) @binding(1) var<storage, read_write> output: array<${n}>;
@group(0) @binding(2) var<uniform> params: ColumnFFTParams;

@compute @workgroup_size(256, 1, 1)
fn column_fft(@builtin(global_invocation_id) global_id: vec3<u32>) {
  // global_id.x = original_row * C + column
  let combined = global_id.x;
  let original_row = combined / params.C;
  let col = combined % params.C;

  if (original_row >= params.num_original_rows) {
    return;
  }

  let base = original_row * params.N + col;
  let x0 = ${a}(input[base]);
  let x1 = ${a}(input[base + params.C]);

  var X0 = x0 + x1;
  var X1 = x0 - x1;

  if (params.split_norm != 0u) {
    let norm = 1.0 / sqrt(2.0);
    X0 = X0 * norm;
    X1 = X1 * norm;
  } else if (params.forward == 0u) {
    X0 = X0 * 0.5;
    X1 = X1 * 0.5;
  }

  output[base] = ${i}(X0);
  output[base + params.C] = ${i}(X1);
}
`;if(e===4)return`
// Optimized 4-point column FFT for hierarchical FFT
// Storage: ${u}

${o}
struct ColumnFFTParams {
  C: u32,
  R: u32,
  N: u32,
  num_original_rows: u32,
  forward: u32,
  split_norm: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${n}>;
@group(0) @binding(1) var<storage, read_write> output: array<${n}>;
@group(0) @binding(2) var<uniform> params: ColumnFFTParams;

fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

@compute @workgroup_size(256, 1, 1)
fn column_fft(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let combined = global_id.x;
  let original_row = combined / params.C;
  let col = combined % params.C;

  if (original_row >= params.num_original_rows) {
    return;
  }

  let C = params.C;
  let base = original_row * params.N + col;

  let x0 = ${a}(input[base]);
  let x1 = ${a}(input[base + C]);
  let x2 = ${a}(input[base + 2u * C]);
  let x3 = ${a}(input[base + 3u * C]);

  let sign = select(1.0, -1.0, params.forward != 0u);
  let W1 = vec2<f32>(0.0, sign);  // ±i

  // Radix-4 butterfly
  let a0 = x0 + x2;
  let a1 = x0 - x2;
  let a2 = x1 + x3;
  let a3 = x1 - x3;

  var X0 = a0 + a2;
  var X1 = a1 + cmul(W1, a3);
  var X2 = a0 - a2;
  var X3 = a1 - cmul(W1, a3);

  if (params.split_norm != 0u) {
    let norm = 0.5;
    X0 = X0 * norm;
    X1 = X1 * norm;
    X2 = X2 * norm;
    X3 = X3 * norm;
  } else if (params.forward == 0u) {
    let norm = 0.25;
    X0 = X0 * norm;
    X1 = X1 * norm;
    X2 = X2 * norm;
    X3 = X3 * norm;
  }

  output[base] = ${i}(X0);
  output[base + C] = ${i}(X1);
  output[base + 2u * C] = ${i}(X2);
  output[base + 3u * C] = ${i}(X3);
}
`;if(e===8)return`
// Optimized 8-point column FFT for hierarchical FFT (radix-2, 3 stages)
// Storage: ${u}

${o}
struct ColumnFFTParams {
  C: u32,
  R: u32,
  N: u32,
  num_original_rows: u32,
  forward: u32,
  split_norm: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${n}>;
@group(0) @binding(1) var<storage, read_write> output: array<${n}>;
@group(0) @binding(2) var<uniform> params: ColumnFFTParams;

fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

@compute @workgroup_size(256, 1, 1)
fn column_fft(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let combined = global_id.x;
  let original_row = combined / params.C;
  let col = combined % params.C;

  if (original_row >= params.num_original_rows) {
    return;
  }

  let C = params.C;
  let base = original_row * params.N + col;

  // Load in bit-reversed order: 0,4,2,6,1,5,3,7
  let x0 = ${a}(input[base]);
  let x1 = ${a}(input[base + 4u * C]);
  let x2 = ${a}(input[base + 2u * C]);
  let x3 = ${a}(input[base + 6u * C]);
  let x4 = ${a}(input[base + C]);
  let x5 = ${a}(input[base + 5u * C]);
  let x6 = ${a}(input[base + 3u * C]);
  let x7 = ${a}(input[base + 7u * C]);

  let sign = select(1.0, -1.0, params.forward != 0u);
  let PI = 3.14159265358979;

  // Twiddle factors
  let W8_1 = vec2<f32>(cos(sign * PI / 4.0), sin(sign * PI / 4.0));  // W_8^1
  let W8_2 = vec2<f32>(0.0, sign);  // W_8^2 = ±i
  let W8_3 = vec2<f32>(cos(sign * 3.0 * PI / 4.0), sin(sign * 3.0 * PI / 4.0));  // W_8^3

  // Stage 1: 4 butterflies of size 2
  let a0 = x0 + x1;
  let a1 = x0 - x1;
  let a2 = x2 + x3;
  let a3 = x2 - x3;
  let a4 = x4 + x5;
  let a5 = x4 - x5;
  let a6 = x6 + x7;
  let a7 = x6 - x7;

  // Stage 2: 2 butterflies of size 4
  let b0 = a0 + a2;
  let b1 = a1 + cmul(W8_2, a3);
  let b2 = a0 - a2;
  let b3 = a1 - cmul(W8_2, a3);
  let b4 = a4 + a6;
  let b5 = a5 + cmul(W8_2, a7);
  let b6 = a4 - a6;
  let b7 = a5 - cmul(W8_2, a7);

  // Stage 3: 1 butterfly of size 8 with twiddles
  var X0 = b0 + b4;
  var X1 = b1 + cmul(W8_1, b5);
  var X2 = b2 + cmul(W8_2, b6);
  var X3 = b3 + cmul(W8_3, b7);
  var X4 = b0 - b4;
  var X5 = b1 - cmul(W8_1, b5);
  var X6 = b2 - cmul(W8_2, b6);
  var X7 = b3 - cmul(W8_3, b7);

  // Normalization
  if (params.split_norm != 0u) {
    let norm = 0.35355339059;  // 1/sqrt(8)
    X0 = X0 * norm;
    X1 = X1 * norm;
    X2 = X2 * norm;
    X3 = X3 * norm;
    X4 = X4 * norm;
    X5 = X5 * norm;
    X6 = X6 * norm;
    X7 = X7 * norm;
  } else if (params.forward == 0u) {
    let norm = 0.125;  // 1/8
    X0 = X0 * norm;
    X1 = X1 * norm;
    X2 = X2 * norm;
    X3 = X3 * norm;
    X4 = X4 * norm;
    X5 = X5 * norm;
    X6 = X6 * norm;
    X7 = X7 * norm;
  }

  output[base] = ${i}(X0);
  output[base + C] = ${i}(X1);
  output[base + 2u * C] = ${i}(X2);
  output[base + 3u * C] = ${i}(X3);
  output[base + 4u * C] = ${i}(X4);
  output[base + 5u * C] = ${i}(X5);
  output[base + 6u * C] = ${i}(X6);
  output[base + 7u * C] = ${i}(X7);
}
`;throw new Error(`Unsupported small R: ${e}`)}function y(e){return{storageType:e==="f16"?"vec4<f16>":"vec4<f32>",enableF16:e==="f16"?`enable f16;
`:"",loadConvert:e==="f16"?"vec4<f32>":"",storeConvert:e==="f16"?"vec4<f16>":""}}function ie(e,r,u,n="f32"){const{storageType:o,enableF16:a}=y(n);return`
// Vec4 Unscramble shader for N=${e} = ${r}×${u}
// Storage: ${n}

${a}
struct UnscrambleParams {
  C: u32,
  R: u32,
  N: u32,
  num_original_rows: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${o}>;
@group(0) @binding(1) var<storage, read_write> output: array<${o}>;
@group(0) @binding(2) var<uniform> params: UnscrambleParams;

@compute @workgroup_size(256, 1, 1)
fn unscramble(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let k = global_id.x;
  let row = global_id.y;

  let C = params.C;
  let R = params.R;
  let N = params.N;

  if (k >= N || row >= params.num_original_rows) {
    return;
  }

  let scrambled_pos = (k % R) * C + (k / R);
  let input_idx = row * N + scrambled_pos;
  let output_idx = row * N + k;

  output[output_idx] = input[input_idx];
}
`}function ne(e,r,u,n="f32"){const{storageType:o,enableF16:a}=y(n);return`
// Vec4 Scramble shader for N=${e} = ${r}×${u}
// Storage: ${n}

${a}
struct ScrambleParams {
  C: u32,
  R: u32,
  N: u32,
  num_original_rows: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${o}>;
@group(0) @binding(1) var<storage, read_write> output: array<${o}>;
@group(0) @binding(2) var<uniform> params: ScrambleParams;

@compute @workgroup_size(256, 1, 1)
fn scramble(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let k = global_id.x;
  let row = global_id.y;

  let C = params.C;
  let R = params.R;
  let N = params.N;

  if (k >= N || row >= params.num_original_rows) {
    return;
  }

  let scrambled_pos = (k % R) * C + (k / R);
  let input_idx = row * N + k;
  let output_idx = row * N + scrambled_pos;

  output[output_idx] = input[input_idx];
}
`}function se(e,r,u,n="f32"){const{storageType:o,enableF16:a,loadConvert:i,storeConvert:s}=y(n),c=Math.log2(u);return`
// Vec4 Sub-row FFT shader: ${u}-point FFT for N=${e} = ${r}×${u}
// Processes two complex numbers per element
// Storage: ${n}

${a}
fn cmul4(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x,
    a.z * b.z - a.w * b.w,
    a.z * b.w + a.w * b.z
  );
}

struct SubRowFFTParams {
  C: u32,           // Sub-row size (FFT size)
  R: u32,           // Number of sub-rows per original row
  N: u32,           // Total elements per original row (R * C)
  num_sub_rows: u32, // Total sub-rows to process (M * R for M original rows)
  forward: u32,
  split_norm: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${o}>;
@group(0) @binding(1) var<storage, read_write> output: array<${o}>;
@group(0) @binding(2) var<uniform> params: SubRowFFTParams;

var<workgroup> buffer_a: array<vec4<f32>, ${u}>;
var<workgroup> buffer_b: array<vec4<f32>, ${u}>;

fn bitrev(x: u32) -> u32 {
  var v = x;
  var result = 0u;
  for (var i = 0u; i < ${c}u; i++) {
    result = (result << 1u) | (v & 1u);
    v = v >> 1u;
  }
  return result;
}

@compute @workgroup_size(${u}, 1, 1)
fn sub_row_fft(@builtin(local_invocation_id) local_id: vec3<u32>,
               @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  // 2D dispatch: x = sub-row within original row, y = original row
  let sub_row_index = workgroup_id.x;
  let original_row = workgroup_id.y;
  let sub_row = original_row * params.R + sub_row_index;  // Global sub-row index
  let j = local_id.x;            // Position within sub-row
  let C = ${u}u;
  let R = params.R;
  let N = params.N;

  if (sub_row >= params.num_sub_rows) {
    return;
  }
  let base_offset = original_row * N + sub_row_index * C;

  let is_forward = params.forward != 0u;
  let sign = select(1.0, -1.0, is_forward);
  let PI = 3.14159265358979;

  // Load with bit-reversal
  let input_idx = base_offset + bitrev(j);
  buffer_a[j] = ${i}(input[input_idx]);
  workgroupBarrier();

  // ${c} stages of butterflies
  for (var s = 0u; s < ${c}u; s++) {
    let m = 1u << (s + 1u);
    let half_m = 1u << s;

    let group = j / m;
    let idx_in_group = j % m;
    let is_first_half = idx_in_group < half_m;
    let k = select(idx_in_group - half_m, idx_in_group, is_first_half);
    let base = group * m + k;

    let angle = sign * 2.0 * PI * f32(k) / f32(m);
    let cv = cos(angle);
    let sv = sin(angle);
    let w = vec4<f32>(cv, sv, cv, sv);

    var a: vec4<f32>;
    var b: vec4<f32>;
    if ((s & 1u) == 0u) {
      a = buffer_a[base];
      b = cmul4(w, buffer_a[base + half_m]);
    } else {
      a = buffer_b[base];
      b = cmul4(w, buffer_b[base + half_m]);
    }

    let result = select(a - b, a + b, is_first_half);

    workgroupBarrier();

    if ((s & 1u) == 0u) {
      buffer_b[j] = result;
    } else {
      buffer_a[j] = result;
    }

    workgroupBarrier();
  }

  // Get result from correct buffer
  var result = select(buffer_b[j], buffer_a[j], ${c%2===0?"true":"false"});

  // Normalization (only sqrt(C) since this is one dimension of a 2D FFT)
  if (params.split_norm != 0u) {
    result = result / sqrt(f32(C));
  } else if (!is_forward) {
    result = result / f32(C);
  }

  // Write output at same offset structure
  let output_idx = base_offset + j;
  output[output_idx] = ${s}(result);
}
`}function le(e,r,u,n="f32"){const{storageType:o,enableF16:a,loadConvert:i,storeConvert:s}=y(n);return`
// Vec4 Twiddle multiply shader for N=${e} = ${r}×${u}
// Storage: ${n}

${a}
fn cmul4(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x,
    a.z * b.z - a.w * b.w,
    a.z * b.w + a.w * b.z
  );
}

struct TwiddleParams {
  C: u32,
  R: u32,
  N: u32,
  num_original_rows: u32,
  forward: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${o}>;
@group(0) @binding(1) var<storage, read_write> output: array<${o}>;
@group(0) @binding(2) var<uniform> params: TwiddleParams;

@compute @workgroup_size(16, 16, 1)
fn twiddle_multiply(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let c = global_id.x;  // column within sub-row (0 to C-1)
  let combined = global_id.y;  // combined index: original_row * R + r

  let C = params.C;
  let R = params.R;
  let N = params.N;

  let original_row = combined / R;
  let r = combined % R;  // sub-row index within original row

  if (c >= C || original_row >= params.num_original_rows) {
    return;
  }

  // Linear index in memory
  let idx = original_row * N + r * C + c;
  let val = ${i}(input[idx]);

  // Twiddle factor: W_N^(r*c)
  let sign = select(1.0, -1.0, params.forward != 0u);
  let PI = 3.14159265358979;
  let angle = sign * 2.0 * PI * f32(r) * f32(c) / f32(N);
  let cv = cos(angle);
  let sv = sin(angle);
  let w = vec4<f32>(cv, sv, cv, sv);

  output[idx] = ${s}(cmul4(val, w));
}
`}function be(e,r,u,n="f32"){const{storageType:o,enableF16:a,loadConvert:i,storeConvert:s}=y(n),c=Math.log2(r);return r===2?fe(e,r,u,n):r===4?pe(e,r,u,n):r===8?ce(e,r,u,n):r===16?de(e,r,u,n):`
// Vec4 Column FFT shader: ${r}-point FFT for N=${e} = ${r}×${u}
// Storage: ${n}

${a}
fn cmul4(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x,
    a.z * b.z - a.w * b.w,
    a.z * b.w + a.w * b.z
  );
}

struct ColumnFFTParams {
  C: u32,
  R: u32,
  N: u32,
  num_original_rows: u32,
  forward: u32,
  split_norm: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${o}>;
@group(0) @binding(1) var<storage, read_write> output: array<${o}>;
@group(0) @binding(2) var<uniform> params: ColumnFFTParams;

var<workgroup> buffer_a: array<vec4<f32>, ${r}>;
var<workgroup> buffer_b: array<vec4<f32>, ${r}>;

fn bitrev(x: u32) -> u32 {
  var v = x;
  var result = 0u;
  for (var i = 0u; i < ${c}u; i++) {
    result = (result << 1u) | (v & 1u);
    v = v >> 1u;
  }
  return result;
}

@compute @workgroup_size(${r}, 1, 1)
fn column_fft(@builtin(local_invocation_id) local_id: vec3<u32>,
              @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  // 2D dispatch: workgroup_id.x = column, workgroup_id.y = original_row
  let col = workgroup_id.x;
  let original_row = workgroup_id.y;

  let j = local_id.x;
  let C = params.C;
  let R = ${r}u;

  if (col >= C || original_row >= params.num_original_rows) {
    return;
  }

  let is_forward = params.forward != 0u;
  let sign = select(1.0, -1.0, is_forward);
  let PI = 3.14159265358979;

  let base_idx = original_row * params.N;
  let input_idx = base_idx + bitrev(j) * C + col;
  buffer_a[j] = ${i}(input[input_idx]);
  workgroupBarrier();

  for (var s = 0u; s < ${c}u; s++) {
    let m = 1u << (s + 1u);
    let half_m = 1u << s;
    let group = j / m;
    let idx_in_group = j % m;
    let is_first_half = idx_in_group < half_m;
    let k = select(idx_in_group - half_m, idx_in_group, is_first_half);
    let base = group * m + k;

    let angle = sign * 2.0 * PI * f32(k) / f32(m);
    let cv = cos(angle);
    let sv = sin(angle);
    let w = vec4<f32>(cv, sv, cv, sv);

    var a: vec4<f32>;
    var b: vec4<f32>;
    if ((s & 1u) == 0u) {
      a = buffer_a[base];
      b = cmul4(w, buffer_a[base + half_m]);
    } else {
      a = buffer_b[base];
      b = cmul4(w, buffer_b[base + half_m]);
    }

    let result = select(a - b, a + b, is_first_half);

    workgroupBarrier();

    if ((s & 1u) == 0u) {
      buffer_b[j] = result;
    } else {
      buffer_a[j] = result;
    }

    workgroupBarrier();
  }

  var result = select(buffer_b[j], buffer_a[j], ${c%2===0?"true":"false"});

  if (params.split_norm != 0u) {
    result = result / sqrt(f32(R));
  } else if (!is_forward) {
    result = result / f32(R);
  }

  let output_idx = base_idx + j * C + col;
  output[output_idx] = ${s}(result);
}
`}function fe(e,r,u,n){const{storageType:o,enableF16:a,loadConvert:i,storeConvert:s}=y(n);return`
// Vec4 Column FFT shader: 2-point for N=${e} = ${r}×${u}
${a}
struct ColumnFFTParams {
  C: u32,
  R: u32,
  N: u32,
  num_original_rows: u32,
  forward: u32,
  split_norm: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${o}>;
@group(0) @binding(1) var<storage, read_write> output: array<${o}>;
@group(0) @binding(2) var<uniform> params: ColumnFFTParams;

@compute @workgroup_size(256, 1, 1)
fn column_fft(@builtin(global_invocation_id) global_id: vec3<u32>) {
  // global_id.x = original_row * C + column (1D dispatch pattern matching vec2)
  let combined = global_id.x;
  let original_row = combined / params.C;
  let col = combined % params.C;

  if (original_row >= params.num_original_rows) {
    return;
  }

  let base_idx = original_row * params.N + col;
  let x0 = ${i}(input[base_idx]);
  let x1 = ${i}(input[base_idx + params.C]);

  var X0 = x0 + x1;
  var X1 = x0 - x1;

  let norm = select(
    select(1.0, 0.5, params.forward == 0u),
    0.70710678118,
    params.split_norm != 0u
  );
  X0 = X0 * norm;
  X1 = X1 * norm;

  output[base_idx] = ${s}(X0);
  output[base_idx + params.C] = ${s}(X1);
}
`}function pe(e,r,u,n){const{storageType:o,enableF16:a,loadConvert:i,storeConvert:s}=y(n);return`
// Vec4 Column FFT shader: 4-point for N=${e} = ${r}×${u}
${a}
fn cmul4(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x,
    a.z * b.z - a.w * b.w,
    a.z * b.w + a.w * b.z
  );
}

struct ColumnFFTParams {
  C: u32,
  R: u32,
  N: u32,
  num_original_rows: u32,
  forward: u32,
  split_norm: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${o}>;
@group(0) @binding(1) var<storage, read_write> output: array<${o}>;
@group(0) @binding(2) var<uniform> params: ColumnFFTParams;

@compute @workgroup_size(256, 1, 1)
fn column_fft(@builtin(global_invocation_id) global_id: vec3<u32>) {
  // global_id.x = original_row * C + column (1D dispatch pattern matching vec2)
  let combined = global_id.x;
  let original_row = combined / params.C;
  let col = combined % params.C;

  if (original_row >= params.num_original_rows) {
    return;
  }

  let sign = select(1.0, -1.0, params.forward != 0u);
  let base_idx = original_row * params.N + col;

  let x0 = ${i}(input[base_idx]);
  let x1 = ${i}(input[base_idx + params.C]);
  let x2 = ${i}(input[base_idx + 2u * params.C]);
  let x3 = ${i}(input[base_idx + 3u * params.C]);

  // W_4^1 = ±i (packed for vec4)
  let W1 = vec4<f32>(0.0, sign, 0.0, sign);

  let a0 = x0 + x2;
  let a1 = x0 - x2;
  let a2 = x1 + x3;
  let a3 = x1 - x3;

  var X0 = a0 + a2;
  var X1 = a1 + cmul4(W1, a3);
  var X2 = a0 - a2;
  var X3 = a1 - cmul4(W1, a3);

  let norm = select(
    select(1.0, 0.25, params.forward == 0u),
    0.5,
    params.split_norm != 0u
  );
  X0 = X0 * norm;
  X1 = X1 * norm;
  X2 = X2 * norm;
  X3 = X3 * norm;

  output[base_idx] = ${s}(X0);
  output[base_idx + params.C] = ${s}(X1);
  output[base_idx + 2u * params.C] = ${s}(X2);
  output[base_idx + 3u * params.C] = ${s}(X3);
}
`}function ce(e,r,u,n){const{storageType:o,enableF16:a,loadConvert:i,storeConvert:s}=y(n);return`
// Vec4 Column FFT shader: 8-point for N=${e} = ${r}×${u}
${a}
const PI: f32 = 3.14159265358979;

fn cmul4(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x,
    a.z * b.z - a.w * b.w,
    a.z * b.w + a.w * b.z
  );
}

struct ColumnFFTParams {
  C: u32,
  R: u32,
  N: u32,
  num_original_rows: u32,
  forward: u32,
  split_norm: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${o}>;
@group(0) @binding(1) var<storage, read_write> output: array<${o}>;
@group(0) @binding(2) var<uniform> params: ColumnFFTParams;

@compute @workgroup_size(256, 1, 1)
fn column_fft(@builtin(global_invocation_id) global_id: vec3<u32>) {
  // 1D dispatch pattern matching vec2 version: combined = original_row * C + col
  let combined = global_id.x;
  let original_row = combined / params.C;
  let col = combined % params.C;

  if (original_row >= params.num_original_rows) {
    return;
  }

  let sign = select(1.0, -1.0, params.forward != 0u);
  let base_idx = original_row * params.N + col;
  let C = params.C;

  // Load in bit-reversed order: 0,4,2,6,1,5,3,7
  let x0 = ${i}(input[base_idx]);
  let x1 = ${i}(input[base_idx + 4u * C]);
  let x2 = ${i}(input[base_idx + 2u * C]);
  let x3 = ${i}(input[base_idx + 6u * C]);
  let x4 = ${i}(input[base_idx + C]);
  let x5 = ${i}(input[base_idx + 5u * C]);
  let x6 = ${i}(input[base_idx + 3u * C]);
  let x7 = ${i}(input[base_idx + 7u * C]);

  // Twiddle factors (packed for vec4)
  let c1 = cos(sign * PI / 4.0);
  let s1 = sin(sign * PI / 4.0);
  let c3 = cos(sign * 3.0 * PI / 4.0);
  let s3 = sin(sign * 3.0 * PI / 4.0);
  let W8_1 = vec4<f32>(c1, s1, c1, s1);
  let W8_2 = vec4<f32>(0.0, sign, 0.0, sign);
  let W8_3 = vec4<f32>(c3, s3, c3, s3);

  let a0 = x0 + x1;
  let a1 = x0 - x1;
  let a2 = x2 + x3;
  let a3 = x2 - x3;
  let a4 = x4 + x5;
  let a5 = x4 - x5;
  let a6 = x6 + x7;
  let a7 = x6 - x7;

  let b0 = a0 + a2;
  let b1 = a1 + cmul4(W8_2, a3);
  let b2 = a0 - a2;
  let b3 = a1 - cmul4(W8_2, a3);
  let b4 = a4 + a6;
  let b5 = a5 + cmul4(W8_2, a7);
  let b6 = a4 - a6;
  let b7 = a5 - cmul4(W8_2, a7);

  var X0 = b0 + b4;
  var X1 = b1 + cmul4(W8_1, b5);
  var X2 = b2 + cmul4(W8_2, b6);
  var X3 = b3 + cmul4(W8_3, b7);
  var X4 = b0 - b4;
  var X5 = b1 - cmul4(W8_1, b5);
  var X6 = b2 - cmul4(W8_2, b6);
  var X7 = b3 - cmul4(W8_3, b7);

  let norm = select(
    select(1.0, 0.125, params.forward == 0u),
    0.35355339059,
    params.split_norm != 0u
  );
  X0 = X0 * norm;
  X1 = X1 * norm;
  X2 = X2 * norm;
  X3 = X3 * norm;
  X4 = X4 * norm;
  X5 = X5 * norm;
  X6 = X6 * norm;
  X7 = X7 * norm;

  output[base_idx] = ${s}(X0);
  output[base_idx + C] = ${s}(X1);
  output[base_idx + 2u * C] = ${s}(X2);
  output[base_idx + 3u * C] = ${s}(X3);
  output[base_idx + 4u * C] = ${s}(X4);
  output[base_idx + 5u * C] = ${s}(X5);
  output[base_idx + 6u * C] = ${s}(X6);
  output[base_idx + 7u * C] = ${s}(X7);
}
`}function de(e,r,u,n){const{storageType:o,enableF16:a,loadConvert:i,storeConvert:s}=y(n);return`
// Vec4 Column FFT shader: 16-point for N=${e} = ${r}×${u}
${a}
const PI: f32 = 3.14159265358979;

fn cmul4(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x,
    a.z * b.z - a.w * b.w,
    a.z * b.w + a.w * b.z
  );
}

struct ColumnFFTParams {
  C: u32,
  R: u32,
  N: u32,
  num_original_rows: u32,
  forward: u32,
  split_norm: u32,
}

@group(0) @binding(0) var<storage, read> input: array<${o}>;
@group(0) @binding(1) var<storage, read_write> output: array<${o}>;
@group(0) @binding(2) var<uniform> params: ColumnFFTParams;

var<workgroup> buffer_a: array<vec4<f32>, 16>;
var<workgroup> buffer_b: array<vec4<f32>, 16>;

@compute @workgroup_size(16, 1, 1)
fn column_fft(@builtin(local_invocation_id) local_id: vec3<u32>,
              @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  let col = workgroup_id.x;
  let original_row = workgroup_id.y;
  let j = local_id.x;
  let C = params.C;

  if (col >= C || original_row >= params.num_original_rows) {
    return;
  }

  let is_forward = params.forward != 0u;
  let sign = select(1.0, -1.0, is_forward);
  let base_idx = original_row * params.N;

  // Bit-reverse for 4 bits
  var v = j;
  var rev = 0u;
  rev = (rev << 1u) | (v & 1u); v = v >> 1u;
  rev = (rev << 1u) | (v & 1u); v = v >> 1u;
  rev = (rev << 1u) | (v & 1u); v = v >> 1u;
  rev = (rev << 1u) | (v & 1u);

  let input_idx = base_idx + rev * C + col;
  buffer_a[j] = ${i}(input[input_idx]);
  workgroupBarrier();

  // 4 stages of butterflies
  for (var s = 0u; s < 4u; s++) {
    let m = 1u << (s + 1u);
    let half_m = 1u << s;
    let group = j / m;
    let idx_in_group = j % m;
    let is_first_half = idx_in_group < half_m;
    let k = select(idx_in_group - half_m, idx_in_group, is_first_half);
    let base = group * m + k;

    let angle = sign * 2.0 * PI * f32(k) / f32(m);
    let cv = cos(angle);
    let sv = sin(angle);
    let w = vec4<f32>(cv, sv, cv, sv);

    var a: vec4<f32>;
    var b: vec4<f32>;
    if ((s & 1u) == 0u) {
      a = buffer_a[base];
      b = cmul4(w, buffer_a[base + half_m]);
    } else {
      a = buffer_b[base];
      b = cmul4(w, buffer_b[base + half_m]);
    }

    let result = select(a - b, a + b, is_first_half);

    workgroupBarrier();

    if ((s & 1u) == 0u) {
      buffer_b[j] = result;
    } else {
      buffer_a[j] = result;
    }

    workgroupBarrier();
  }

  // After 4 stages (even), result is in buffer_a
  var result = buffer_a[j];

  let norm = select(
    select(1.0, 0.0625, params.forward == 0u),
    0.25,
    params.split_norm != 0u
  );
  result = result * norm;

  let output_idx = base_idx + j * C + col;
  output[output_idx] = ${s}(result);
}
`}function K(e,r){let u=1;for(;u*2<=r&&u*2<=e;)u*=2;const n=e/u;if(!Number.isInteger(n)||(n&n-1)!==0)throw new Error(`Cannot factor N=${e} with maxSize=${r}: R=${n} is not a power of 2`);return{R:n,C:u}}function ge(e,r,u=e.limits.maxComputeWorkgroupSizeX,n="f32"){const o=r>u,a=J(n),i=e.createShaderModule({label:"Transpose",code:a}),s=e.createBindGroupLayout({label:"Transpose bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),c=e.createPipelineLayout({bindGroupLayouts:[s]}),g=e.createComputePipeline({label:"Transpose pipeline",layout:c,compute:{module:i,entryPoint:"transpose"}});if(!o){const D=A(r,n),q=e.createShaderModule({label:`Simple FFT N=${r}`,code:D}),$=e.createBindGroupLayout({label:"Simple FFT bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),H=e.createPipelineLayout({bindGroupLayouts:[$]});return{subRowFFT:null,twiddle:null,columnFFT:null,unscramble:null,scramble:null,simpleFFT:e.createComputePipeline({label:`Simple FFT pipeline N=${r}`,layout:H,compute:{module:q,entryPoint:"fft_horizontal"}}),transpose:g,bindGroupLayouts:{subRowFFT:null,twiddle:null,columnFFT:null,unscramble:null,scramble:null,simpleFFT:$,transpose:s},N:r,R:1,C:r,isLarge:!1}}const{R:p,C:b}=K(r,u);console.log(`Large FFT: N=${r} = ${p}×${b}, maxWorkgroup=${u}, precision=${n}`);const l=ae(b,p,n),_=oe(r,p,b,n),w=te(p,b,n),d=ee(r,p,b,n),f=re(r,p,b,n),t=A(b,n),m=e.createShaderModule({label:`Sub-row FFT C=${b}`,code:l}),G=e.createShaderModule({label:`Twiddle N=${r}`,code:_}),S=e.createShaderModule({label:`Column FFT R=${p}`,code:w}),k=e.createShaderModule({label:`Unscramble N=${r}`,code:d}),U=e.createShaderModule({label:`Scramble N=${r}`,code:f}),B=e.createShaderModule({label:`Simple FFT C=${b}`,code:t}),v=e.createBindGroupLayout({label:"Sub-row FFT bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),x=e.createBindGroupLayout({label:"Twiddle bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),P=e.createBindGroupLayout({label:"Column FFT bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),T=e.createBindGroupLayout({label:"Simple FFT bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),C=e.createBindGroupLayout({label:"Unscramble bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),h=e.createBindGroupLayout({label:"Scramble bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),L=e.createPipelineLayout({bindGroupLayouts:[v]}),M=e.createPipelineLayout({bindGroupLayouts:[x]}),X=e.createPipelineLayout({bindGroupLayouts:[P]}),z=e.createPipelineLayout({bindGroupLayouts:[T]}),R=e.createPipelineLayout({bindGroupLayouts:[C]}),j=e.createPipelineLayout({bindGroupLayouts:[h]}),O=e.createComputePipeline({label:`Sub-row FFT pipeline C=${b}`,layout:L,compute:{module:m,entryPoint:"sub_row_fft"}}),W=e.createComputePipeline({label:`Twiddle pipeline N=${r}`,layout:M,compute:{module:G,entryPoint:"twiddle_multiply"}}),V=e.createComputePipeline({label:`Column FFT pipeline R=${p}`,layout:X,compute:{module:S,entryPoint:"column_fft"}}),E=e.createComputePipeline({label:`Simple FFT pipeline C=${b}`,layout:z,compute:{module:B,entryPoint:"fft_horizontal"}}),I=e.createComputePipeline({label:`Unscramble pipeline N=${r}`,layout:R,compute:{module:k,entryPoint:"unscramble"}}),N=e.createComputePipeline({label:`Scramble pipeline N=${r}`,layout:j,compute:{module:U,entryPoint:"scramble"}});return{subRowFFT:O,twiddle:W,columnFFT:V,unscramble:I,scramble:N,simpleFFT:E,transpose:g,bindGroupLayouts:{subRowFFT:v,twiddle:x,columnFFT:P,unscramble:C,scramble:h,simpleFFT:T,transpose:s},N:r,R:p,C:b,isLarge:o}}function me(e){const{device:r,pipelines:u,input:n,output:o,temp:a,N:i,forward:s,splitNormalization:c}=e,{R:g,C:p,isLarge:b}=u,l=r.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});if(r.queue.writeBuffer(l,0,new Uint32Array([i])),!b){_e(r,u,n,o,a,i,s,c,l);return}we(r,u,n,o,a,i,g,p,s,c,l)}function _e(e,r,u,n,o,a,i,s,c){const g=e.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(g,0,new Uint32Array([a,a,i?1:0,s?1:0]));const p=e.createCommandEncoder({label:"Simple 2D FFT"});{const b=e.createBindGroup({layout:r.bindGroupLayouts.simpleFFT,entries:[{binding:0,resource:{buffer:u}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:g}}]}),l=p.beginComputePass({label:"Horizontal FFT"});l.setPipeline(r.simpleFFT),l.setBindGroup(0,b),l.dispatchWorkgroups(a,1,1),l.end()}{const b=e.createBindGroup({layout:r.bindGroupLayouts.transpose,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:o[1]}},{binding:2,resource:{buffer:c}}]}),l=p.beginComputePass({label:"Transpose 1"});l.setPipeline(r.transpose),l.setBindGroup(0,b),l.dispatchWorkgroups(Math.ceil(a/16),Math.ceil(a/16),1),l.end()}{const b=e.createBindGroup({layout:r.bindGroupLayouts.simpleFFT,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:g}}]}),l=p.beginComputePass({label:"Vertical FFT"});l.setPipeline(r.simpleFFT),l.setBindGroup(0,b),l.dispatchWorkgroups(a,1,1),l.end()}{const b=e.createBindGroup({layout:r.bindGroupLayouts.transpose,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:n}},{binding:2,resource:{buffer:c}}]}),l=p.beginComputePass({label:"Transpose 2"});l.setPipeline(r.transpose),l.setBindGroup(0,b),l.dispatchWorkgroups(Math.ceil(a/16),Math.ceil(a/16),1),l.end()}e.queue.submit([p.finish()])}function we(e,r,u,n,o,a,i,s,c,g,p){const b=e.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(b,0,new Uint32Array([s,i,a,a*i,c?1:0,g?1:0]));const l=e.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(l,0,new Uint32Array([s,i,a,a,c?1:0]));const _=e.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(_,0,new Uint32Array([s,i,a,a,c?1:0,g?1:0]));const w=e.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(w,0,new Uint32Array([s,i,a,a]));const d=e.createCommandEncoder({label:"Hierarchical 2D FFT"});{const f=e.createBindGroup({layout:r.bindGroupLayouts.columnFFT,entries:[{binding:0,resource:{buffer:u}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:_}}]}),t=d.beginComputePass({label:"H Column FFT"});t.setPipeline(r.columnFFT),t.setBindGroup(0,f),i<=8?t.dispatchWorkgroups(Math.ceil(a*s/256),1,1):t.dispatchWorkgroups(s,a,1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.twiddle,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:o[1]}},{binding:2,resource:{buffer:l}}]}),t=d.beginComputePass({label:"H Twiddle"});t.setPipeline(r.twiddle),t.setBindGroup(0,f),t.dispatchWorkgroups(Math.ceil(s/16),Math.ceil(a*i/16),1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.subRowFFT,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:b}}]}),t=d.beginComputePass({label:"H Sub-row FFT"});t.setPipeline(r.subRowFFT),t.setBindGroup(0,f),t.dispatchWorkgroups(i,a,1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.unscramble,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:o[1]}},{binding:2,resource:{buffer:w}}]}),t=d.beginComputePass({label:"H Unscramble"});t.setPipeline(r.unscramble),t.setBindGroup(0,f),t.dispatchWorkgroups(Math.ceil(a/256),a,1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.transpose,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:p}}]}),t=d.beginComputePass({label:"Transpose 1"});t.setPipeline(r.transpose),t.setBindGroup(0,f),t.dispatchWorkgroups(Math.ceil(a/16),Math.ceil(a/16),1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.columnFFT,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:o[1]}},{binding:2,resource:{buffer:_}}]}),t=d.beginComputePass({label:"V Column FFT"});t.setPipeline(r.columnFFT),t.setBindGroup(0,f),i<=8?t.dispatchWorkgroups(Math.ceil(a*s/256),1,1):t.dispatchWorkgroups(s,a,1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.twiddle,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:l}}]}),t=d.beginComputePass({label:"V Twiddle"});t.setPipeline(r.twiddle),t.setBindGroup(0,f),t.dispatchWorkgroups(Math.ceil(s/16),Math.ceil(a*i/16),1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.subRowFFT,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:o[1]}},{binding:2,resource:{buffer:b}}]}),t=d.beginComputePass({label:"V Sub-row FFT"});t.setPipeline(r.subRowFFT),t.setBindGroup(0,f),t.dispatchWorkgroups(i,a,1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.unscramble,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:w}}]}),t=d.beginComputePass({label:"V Unscramble"});t.setPipeline(r.unscramble),t.setBindGroup(0,f),t.dispatchWorkgroups(Math.ceil(a/256),a,1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.transpose,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:n}},{binding:2,resource:{buffer:p}}]}),t=d.beginComputePass({label:"Transpose 2"});t.setPipeline(r.transpose),t.setBindGroup(0,f),t.dispatchWorkgroups(Math.ceil(a/16),Math.ceil(a/16),1),t.end()}e.queue.submit([d.finish()])}function ve(e,r,u=e.limits.maxComputeWorkgroupSizeX,n="f32"){const o=r>u,a=Z(n),i=e.createShaderModule({label:"Vec4 Transpose",code:a}),s=e.createBindGroupLayout({label:"Vec4 Transpose bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),c=e.createPipelineLayout({bindGroupLayouts:[s]}),g=e.createComputePipeline({label:"Vec4 Transpose pipeline",layout:c,compute:{module:i,entryPoint:"transpose"}});if(!o){const D=Y(r,n),q=e.createShaderModule({label:`Vec4 Simple FFT N=${r}`,code:D}),$=e.createBindGroupLayout({label:"Vec4 Simple FFT bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),H=e.createPipelineLayout({bindGroupLayouts:[$]});return{subRowFFT:null,twiddle:null,columnFFT:null,unscramble:null,scramble:null,simpleFFT:e.createComputePipeline({label:`Vec4 Simple FFT pipeline N=${r}`,layout:H,compute:{module:q,entryPoint:"fft_horizontal"}}),transpose:g,bindGroupLayouts:{subRowFFT:null,twiddle:null,columnFFT:null,unscramble:null,scramble:null,simpleFFT:$,transpose:s},N:r,R:1,C:r,isLarge:!1}}const{R:p,C:b}=K(r,u),l=se(r,p,b,n),_=le(r,p,b,n),w=be(r,p,b,n),d=ie(r,p,b,n),f=ne(r,p,b,n),t=Y(b,n),m=e.createShaderModule({label:`Vec4 Sub-row FFT C=${b}`,code:l}),G=e.createShaderModule({label:`Vec4 Twiddle N=${r}`,code:_}),S=e.createShaderModule({label:`Vec4 Column FFT R=${p}`,code:w}),k=e.createShaderModule({label:`Vec4 Unscramble N=${r}`,code:d}),U=e.createShaderModule({label:`Vec4 Scramble N=${r}`,code:f}),B=e.createShaderModule({label:`Vec4 Simple FFT C=${b}`,code:t}),v=e.createBindGroupLayout({label:"Vec4 Sub-row FFT bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),x=e.createBindGroupLayout({label:"Vec4 Twiddle bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),P=e.createBindGroupLayout({label:"Vec4 Column FFT bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),T=e.createBindGroupLayout({label:"Vec4 Simple FFT bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),C=e.createBindGroupLayout({label:"Vec4 Unscramble bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),h=e.createBindGroupLayout({label:"Vec4 Scramble bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),L=e.createPipelineLayout({bindGroupLayouts:[v]}),M=e.createPipelineLayout({bindGroupLayouts:[x]}),X=e.createPipelineLayout({bindGroupLayouts:[P]}),z=e.createPipelineLayout({bindGroupLayouts:[T]}),R=e.createPipelineLayout({bindGroupLayouts:[C]}),j=e.createPipelineLayout({bindGroupLayouts:[h]}),O=e.createComputePipeline({label:`Vec4 Sub-row FFT pipeline C=${b}`,layout:L,compute:{module:m,entryPoint:"sub_row_fft"}}),W=e.createComputePipeline({label:`Vec4 Twiddle pipeline N=${r}`,layout:M,compute:{module:G,entryPoint:"twiddle_multiply"}}),V=e.createComputePipeline({label:`Vec4 Column FFT pipeline R=${p}`,layout:X,compute:{module:S,entryPoint:"column_fft"}}),E=e.createComputePipeline({label:`Vec4 Simple FFT pipeline C=${b}`,layout:z,compute:{module:B,entryPoint:"fft_horizontal"}}),I=e.createComputePipeline({label:`Vec4 Unscramble pipeline N=${r}`,layout:R,compute:{module:k,entryPoint:"unscramble"}}),N=e.createComputePipeline({label:`Vec4 Scramble pipeline N=${r}`,layout:j,compute:{module:U,entryPoint:"scramble"}});return{subRowFFT:O,twiddle:W,columnFFT:V,unscramble:I,scramble:N,simpleFFT:E,transpose:g,bindGroupLayouts:{subRowFFT:v,twiddle:x,columnFFT:P,unscramble:C,scramble:h,simpleFFT:T,transpose:s},N:r,R:p,C:b,isLarge:o}}function xe(e){const{device:r,pipelines:u,input:n,output:o,temp:a,N:i,forward:s,splitNormalization:c}=e,{R:g,C:p,isLarge:b}=u,l=r.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});if(r.queue.writeBuffer(l,0,new Uint32Array([i])),!b){ye(r,u,n,o,a,i,s,c,l);return}Fe(r,u,n,o,a,i,g,p,s,c,l)}function ye(e,r,u,n,o,a,i,s,c){const g=e.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(g,0,new Uint32Array([a,a,i?1:0,s?1:0]));const p=e.createCommandEncoder({label:"Vec4 Simple 2D FFT"});{const b=e.createBindGroup({layout:r.bindGroupLayouts.simpleFFT,entries:[{binding:0,resource:{buffer:u}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:g}}]}),l=p.beginComputePass({label:"Vec4 Horizontal FFT"});l.setPipeline(r.simpleFFT),l.setBindGroup(0,b),l.dispatchWorkgroups(a,1,1),l.end()}{const b=e.createBindGroup({layout:r.bindGroupLayouts.transpose,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:o[1]}},{binding:2,resource:{buffer:c}}]}),l=p.beginComputePass({label:"Vec4 Transpose 1"});l.setPipeline(r.transpose),l.setBindGroup(0,b),l.dispatchWorkgroups(Math.ceil(a/16),Math.ceil(a/16),1),l.end()}{const b=e.createBindGroup({layout:r.bindGroupLayouts.simpleFFT,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:g}}]}),l=p.beginComputePass({label:"Vec4 Vertical FFT"});l.setPipeline(r.simpleFFT),l.setBindGroup(0,b),l.dispatchWorkgroups(a,1,1),l.end()}{const b=e.createBindGroup({layout:r.bindGroupLayouts.transpose,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:n}},{binding:2,resource:{buffer:c}}]}),l=p.beginComputePass({label:"Vec4 Transpose 2"});l.setPipeline(r.transpose),l.setBindGroup(0,b),l.dispatchWorkgroups(Math.ceil(a/16),Math.ceil(a/16),1),l.end()}e.queue.submit([p.finish()])}function Fe(e,r,u,n,o,a,i,s,c,g,p){const b=e.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(b,0,new Uint32Array([s,i,a,a*i,c?1:0,g?1:0]));const l=e.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(l,0,new Uint32Array([s,i,a,a,c?1:0]));const _=e.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(_,0,new Uint32Array([s,i,a,a,c?1:0,g?1:0]));const w=e.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(w,0,new Uint32Array([s,i,a,a]));const d=e.createCommandEncoder({label:"Vec4 Hierarchical 2D FFT"});{const f=e.createBindGroup({layout:r.bindGroupLayouts.columnFFT,entries:[{binding:0,resource:{buffer:u}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:_}}]}),t=d.beginComputePass({label:"Vec4 H Column FFT"});t.setPipeline(r.columnFFT),t.setBindGroup(0,f),i<=8?t.dispatchWorkgroups(Math.ceil(a*s/256),1,1):t.dispatchWorkgroups(s,a,1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.twiddle,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:o[1]}},{binding:2,resource:{buffer:l}}]}),t=d.beginComputePass({label:"Vec4 H Twiddle"});t.setPipeline(r.twiddle),t.setBindGroup(0,f),t.dispatchWorkgroups(Math.ceil(s/16),Math.ceil(a*i/16),1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.subRowFFT,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:b}}]}),t=d.beginComputePass({label:"Vec4 H Sub-row FFT"});t.setPipeline(r.subRowFFT),t.setBindGroup(0,f),t.dispatchWorkgroups(i,a,1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.unscramble,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:o[1]}},{binding:2,resource:{buffer:w}}]}),t=d.beginComputePass({label:"Vec4 H Unscramble"});t.setPipeline(r.unscramble),t.setBindGroup(0,f),t.dispatchWorkgroups(Math.ceil(a/256),a,1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.transpose,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:p}}]}),t=d.beginComputePass({label:"Vec4 Transpose 1"});t.setPipeline(r.transpose),t.setBindGroup(0,f),t.dispatchWorkgroups(Math.ceil(a/16),Math.ceil(a/16),1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.columnFFT,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:o[1]}},{binding:2,resource:{buffer:_}}]}),t=d.beginComputePass({label:"Vec4 V Column FFT"});t.setPipeline(r.columnFFT),t.setBindGroup(0,f),i<=8?t.dispatchWorkgroups(Math.ceil(a*s/256),1,1):t.dispatchWorkgroups(s,a,1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.twiddle,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:l}}]}),t=d.beginComputePass({label:"Vec4 V Twiddle"});t.setPipeline(r.twiddle),t.setBindGroup(0,f),t.dispatchWorkgroups(Math.ceil(s/16),Math.ceil(a*i/16),1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.subRowFFT,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:o[1]}},{binding:2,resource:{buffer:b}}]}),t=d.beginComputePass({label:"Vec4 V Sub-row FFT"});t.setPipeline(r.subRowFFT),t.setBindGroup(0,f),t.dispatchWorkgroups(i,a,1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.unscramble,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:o[0]}},{binding:2,resource:{buffer:w}}]}),t=d.beginComputePass({label:"Vec4 V Unscramble"});t.setPipeline(r.unscramble),t.setBindGroup(0,f),t.dispatchWorkgroups(Math.ceil(a/256),a,1),t.end()}{const f=e.createBindGroup({layout:r.bindGroupLayouts.transpose,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:n}},{binding:2,resource:{buffer:p}}]}),t=d.beginComputePass({label:"Vec4 Transpose 2"});t.setPipeline(r.transpose),t.setBindGroup(0,f),t.dispatchWorkgroups(Math.ceil(a/16),Math.ceil(a/16),1),t.end()}e.queue.submit([d.finish()])}function Pe(e,r,u="f32"){if(r<2||(r&r-1)!==0)throw new Error(`N must be a power of 2, got ${r}`);const n=e.limits.maxComputeWorkgroupSizeX;if(r>n){const f=ge(e,r,n,u);return{fftHorizontal:null,fftVertical:null,transpose:f.transpose,bindGroupLayouts:{fft:null,transpose:f.bindGroupLayouts.transpose},N:r,largePipelines:f,isLarge:!0}}const a=A(r,u),i=J(u),s=e.createShaderModule({label:`FFT Cooley-Tukey shader N=${r}`,code:a}),c=e.createShaderModule({label:"Transpose shader",code:i}),g=e.createBindGroupLayout({label:"FFT bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),p=e.createBindGroupLayout({label:"Transpose bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),b=e.createPipelineLayout({label:"FFT pipeline layout",bindGroupLayouts:[g]}),l=e.createPipelineLayout({label:"Transpose pipeline layout",bindGroupLayouts:[p]}),_=e.createComputePipeline({label:`FFT horizontal pipeline N=${r}`,layout:b,compute:{module:s,entryPoint:"fft_horizontal"}}),w=e.createComputePipeline({label:`FFT vertical pipeline N=${r}`,layout:b,compute:{module:s,entryPoint:"fft_vertical"}}),d=e.createComputePipeline({label:"Transpose pipeline",layout:l,compute:{module:c,entryPoint:"transpose"}});return{fftHorizontal:_,fftVertical:w,transpose:d,bindGroupLayouts:{fft:g,transpose:p},N:r,largePipelines:null,isLarge:!1}}function Te(e){const{device:r,pipelines:u,input:n,output:o,temp:a,N:i,forward:s,splitNormalization:c}=e;if(i!==u.N)throw new Error(`N=${i} doesn't match pipeline N=${u.N}`);if(u.isLarge&&u.largePipelines){me({device:r,pipelines:u.largePipelines,input:n,output:o,temp:a,N:i,forward:s,splitNormalization:c});return}if(!u.fftHorizontal||!u.fftVertical||!u.bindGroupLayouts.fft)throw new Error("Simple FFT pipelines not available");const g=r.createBuffer({label:"FFT params uniform",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),p=new Uint32Array([i,i,s?1:0,c?1:0]);r.queue.writeBuffer(g,0,p);const b=r.createBuffer({label:"Transpose params uniform",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),l=new Uint32Array([i]);r.queue.writeBuffer(b,0,l);const _=r.createBindGroup({label:"FFT horizontal bind group",layout:u.bindGroupLayouts.fft,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:a[0]}},{binding:2,resource:{buffer:g}}]}),w=r.createBindGroup({label:"Transpose 1 bind group",layout:u.bindGroupLayouts.transpose,entries:[{binding:0,resource:{buffer:a[0]}},{binding:1,resource:{buffer:a[1]}},{binding:2,resource:{buffer:b}}]}),d=r.createBindGroup({label:"FFT vertical bind group",layout:u.bindGroupLayouts.fft,entries:[{binding:0,resource:{buffer:a[1]}},{binding:1,resource:{buffer:a[0]}},{binding:2,resource:{buffer:g}}]}),f=r.createBindGroup({label:"Transpose 2 bind group",layout:u.bindGroupLayouts.transpose,entries:[{binding:0,resource:{buffer:a[0]}},{binding:1,resource:{buffer:o}},{binding:2,resource:{buffer:b}}]}),t=r.createCommandEncoder({label:"FFT 2D command encoder"});{const m=t.beginComputePass({label:"FFT horizontal pass"});m.setPipeline(u.fftHorizontal),m.setBindGroup(0,_),m.dispatchWorkgroups(i,1,1),m.end()}{const m=t.beginComputePass({label:"Transpose 1 pass"});m.setPipeline(u.transpose),m.setBindGroup(0,w),m.dispatchWorkgroups(Math.ceil(i/16),Math.ceil(i/16),1),m.end()}{const m=t.beginComputePass({label:"FFT vertical pass"});m.setPipeline(u.fftVertical),m.setBindGroup(0,d),m.dispatchWorkgroups(i,1,1),m.end()}{const m=t.beginComputePass({label:"Transpose 2 pass"});m.setPipeline(u.transpose),m.setBindGroup(0,f),m.dispatchWorkgroups(Math.ceil(i/16),Math.ceil(i/16),1),m.end()}r.queue.submit([t.finish()])}export{Pe as createFFTPipelines,ve as createVec4FFTPipelines,Te as executeFFT2D,xe as executeVec4FFT2D};
