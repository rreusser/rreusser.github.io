/*
function gcd(a, b) {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function scanlineCount([w, h], [dx, dy]) {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx === 0) return h - 1;
  if (ady === 0) return w - 1;
  return (w - 1) * ady + (h - 1) * adx;
}

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function scanline(
  out,
  elevation,
  [w, h],
  [dx, dy],
  normalization,
  pixelSize,
  shadowFeather,
  lightSlope = Math.PI / 4
) {
  let i, j, z, horizon, d, l, l2, shift, t, f;
  let s0, s1, idx0, idx1, a, b, di, dj, de;

  if (dx === 0 && dy === 0) return out;

  const EPSILON = 1e-8;

  const flipX = dx < 0;
  const flipY = dy < 0;
  dx = Math.abs(dx);
  dy = Math.abs(dy);
  const g = gcd(dx, dy);
  dx /= g;
  dy /= g;
  const transpose = dy > dx;

  const count = scanlineCount([w, h], [dx, dy]);
  if (!Number.isFinite(count)) throw new Error("Invalid count");

  // Compute the slope of the line, transposed so that it's always
  // less than 45 degrees
  const rise = transpose ? dx : dy;
  const run = transpose ? dy : dx;
  const slope = rise / run;

  // Compute the direction of interpolation
  const iInterpDelta = transpose ? (flipX ? -1 : 1) : 0;
  const jInterpDelta = transpose ? 0 : flipY ? -1 : 1;

  // Ndarray strides (mostly unused; I transposed inside the loop
  // rather than via strides, but this would be more efficient)
  const stride0 = 1;
  const stride1 = w;
  const limit0 = w - 1;
  const limit1 = h - 1;

  const iStack = new Float32Array(1024);
  const jStack = new Float32Array(1024);
  const eStack = new Float32Array(1024);
  let ptr;

  for (let scan = 0; scan <= count; scan++) {
    ptr = -1;

    shift = -Math.floor((transpose ? h : w) * slope) + scan + EPSILON;
    let iter =
      rise === 0 ? 0 : Math.max(0, -Math.floor(EPSILON + shift / slope));

    let c = 0;
    while (++c) {
      a = iter;
      b = shift + slope * a;

      i = (transpose ? b : a) | 0;
      j = (transpose ? a : b) | 0;
      if (i > w - 1 || j > h - 1 || i < 0 || j < 0) break;

      if (flipX) i = w - 1 - i;
      if (flipY) j = h - 1 - j;

      const ip = i + iInterpDelta;
      const jp = j + jInterpDelta;
      idx0 = i * stride0 + j * stride1;
      idx1 =
        Math.min(limit0, Math.max(0, ip)) * stride0 +
        Math.min(limit1, Math.max(0, jp)) * stride1;

      t = b - (b | 0);
      z = elevation[idx0] * (1 - t) + elevation[idx1] * t;
      let iInterp = i * (1 - t) + ip * t;
      let jInterp = j * (1 - t) + jp * t;

      if (c === 1) {
        iStack[ptr] = iInterp;
        jStack[ptr] = jInterp;
        eStack[ptr] = z;
        ptr++;
      }

      let di = iStack[ptr] - iInterp;
      let dj = jStack[ptr] - jInterp;
      let de = eStack[ptr] - z;
      s0 = de * de;
      s0 /= di * di + dj * dj + s0;
      s0 = de > 0 ? s0 : -s0;

      while (ptr > 0) {
        di = iStack[ptr - 1] - iInterp;
        dj = jStack[ptr - 1] - jInterp;
        de = eStack[ptr - 1] - z;
        s1 = de * de;
        let l2 = di * di + dj * dj;
        s1 /= l2 + s1;
        s1 = de > 0 ? s1 : -s1;

        if (s0 > s1) break;

        s0 = s1;
        ptr--;
      }

      di = (iStack[ptr] - iInterp) * pixelSize;
      dj = (jStack[ptr] - jInterp) * pixelSize;
      de = eStack[ptr] - z;
      l = de / Math.sqrt(di * di + dj * dj);
      if (shadowFeather > 0) {
        f = smoothstep(l - shadowFeather, l + shadowFeather, lightSlope);
      } else {
        f = l < lightSlope ? 1 : 0;
      }

      // Split the contribution between two pixels. If the pixel gets
      // (1 - t) contribution from this scanline, it will get exactly
      // t contribution from the next.
      out[idx0] += (1 - t) * normalization * f; // * falloff);
      out[idx1] += t * normalization * f;
      //out[idx0] += normalization * f; // * falloff);

      ptr++;
      iStack[ptr] = iInterp;
      jStack[ptr] = jInterp;
      eStack[ptr] = z;

      iter++;
    }
  }
}

*/
