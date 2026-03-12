// Convolve Shader
//
// Multiplies the FFT of the scalar field by analytical kernels
// (Gaussian or Circular/Bessel) to compute activator and inhibitor convolutions.
// Processes two scales at a time, outputting vec4 for each scale pair.

enable f16;

struct ConvolveParams {
  resolution: vec2<u32>,
  // Four radii: [activator1, inhibitor1, activator2, inhibitor2]
  radii: vec4<f32>,
  // Four kernel types: [type1, type1, type2, type2] (0=gaussian, 1=circular)
  types: vec4<u32>,
}

@group(0) @binding(0) var<storage, read> fhat: array<vec2<f16>>;
@group(0) @binding(1) var<storage, read_write> output: array<vec4<f16>>;
@group(0) @binding(2) var<uniform> params: ConvolveParams;

const PI: f32 = 3.14159265358979323846;
const SQRT_PI: f32 = 1.7724538509055159;

// Bessel J1 constants from stdlib
const BJ1_X1: f32 = 3.8317059702075123156e+00;
const BJ1_X2: f32 = 7.0155866698156187535e+00;
const BJ1_X11: f32 = 9.810e+02;
const BJ1_X12: f32 = -3.2527979248768438556e-04;
const BJ1_X21: f32 = 1.7960e+03;
const BJ1_X22: f32 = -3.8330184381246462950e-05;

// Gaussian kernel in frequency domain
// Matching original: exp(-2.0 * (0.25 * kr)^2) = exp(-0.125 * kr^2)
fn gaussian_kernel(kmag: f32, r: f32) -> f32 {
  let kr = kmag * r;
  let c = 0.25 * kr;
  return exp(-2.0 * c * c);
}

// Bessel J1 helper: polyS for large argument asymptotic
fn polyS(x_in: f32) -> f32 {
  var x = x_in;
  var s1: f32;
  var s2: f32;
  if (x == 0.0) {
    return 0.046875;
  }
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

// Bessel J1 helper: polyC for large argument asymptotic
fn polyC(x_in: f32) -> f32 {
  var x = x_in;
  var s1: f32;
  var s2: f32;
  if (x == 0.0) {
    return 1.0;
  }
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

// Bessel J1 helper: poly1 for small argument (w <= 4)
fn poly1(x_in: f32) -> f32 {
  var x = x_in;
  var s1: f32;
  var s2: f32;
  if (x == 0.0) {
    return -0.03405537391318949;
  }
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

// Bessel J1 helper: poly2 for medium argument (4 < w <= 8)
fn poly2(x_in: f32) -> f32 {
  var x = x_in;
  var s1: f32;
  var s2: f32;
  if (x == 0.0) {
    return -0.010158790774176108;
  }
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

// Bessel J1 implementation from stdlib
// Source: https://github.com/stdlib-js/stdlib/tree/develop/lib/node_modules/%40stdlib/math/base/special
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

  if (x < 0.0) {
    value = -value;
  }
  return value;
}

// Circular (disk) kernel in frequency domain: J1(k*r) / (k*r)
// Matching original implementation
fn disk_kernel(kmag: f32, r: f32) -> f32 {
  let kr = kmag * r;
  if (kr < 1e-8) {
    return 1.0;  // Limit as kr -> 0
  }
  return bessel_j1(kr) / kr;
}

// Compute wavenumber from grid coordinates
fn wavenumber(coord: vec2<u32>, resolution: vec2<u32>) -> vec2<f32> {
  let res_f = vec2<f32>(resolution);

  // FFT frequency indices (centered at 0)
  var kx = f32(coord.x);
  var ky = f32(coord.y);
  if (kx > res_f.x * 0.5) { kx -= res_f.x; }
  if (ky > res_f.y * 0.5) { ky -= res_f.y; }

  // Scale to wavenumber (2*pi*k/N)
  return vec2<f32>(kx, ky) * 2.0 * PI / res_f;
}

@compute @workgroup_size(16, 16, 1)
fn convolve(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let resolution = params.resolution;

  if (x >= resolution.x || y >= resolution.y) {
    return;
  }

  let idx = y * resolution.x + x;

  // Compute wavenumber magnitude
  let k = wavenumber(vec2<u32>(x, y), resolution);
  let kmag = length(k);

  // Get radii for this scale pair
  let r = params.radii;

  // Compute 4 kernel values based on types
  var kernels: vec4<f32>;
  if (params.types.x == 0u) {
    kernels.x = gaussian_kernel(kmag, r.x);  // Activator 1
    kernels.y = gaussian_kernel(kmag, r.y);  // Inhibitor 1
  } else {
    kernels.x = disk_kernel(kmag, r.x);
    kernels.y = disk_kernel(kmag, r.y);
  }
  if (params.types.z == 0u) {
    kernels.z = gaussian_kernel(kmag, r.z);  // Activator 2
    kernels.w = gaussian_kernel(kmag, r.w);  // Inhibitor 2
  } else {
    kernels.z = disk_kernel(kmag, r.z);
    kernels.w = disk_kernel(kmag, r.w);
  }

  // Get complex FFT value (re, im) - convert f16 to f32 for computation
  let f = vec2<f32>(fhat[idx]);

  // Use the complex multiplication trick from the original:
  // We treat (activator + i*inhibitor) as a complex "kernel" and multiply:
  //   fhat * (act + i*inh) = (fhat_re*act - fhat_im*inh) + i*(fhat_re*inh + fhat_im*act)
  //
  // After inverse FFT, the real part gives conv(f, act) and the imag part gives conv(f, inh)!
  // This allows us to compute 4 convolutions (2 pairs) with 2 complex numbers stored in vec4.

  // Compute complex multiplications: fhat * (act1 + i*inh1) and fhat * (act2 + i*inh2)
  // kernels = (act1, inh1, act2, inh2)
  // Output packed as (re1, im1, re2, im2) - two contiguous complex numbers for vec4 FFT
  let result = vec4<f32>(
    f.x * kernels.x - f.y * kernels.y,  // Re(fhat * (act1 + i*inh1)) = re*act1 - im*inh1
    f.x * kernels.y + f.y * kernels.x,  // Im(fhat * (act1 + i*inh1)) = re*inh1 + im*act1
    f.x * kernels.z - f.y * kernels.w,  // Re(fhat * (act2 + i*inh2)) = re*act2 - im*inh2
    f.x * kernels.w + f.y * kernels.z   // Im(fhat * (act2 + i*inh2)) = re*inh2 + im*act2
  );

  output[idx] = vec4<f16>(result);
}
