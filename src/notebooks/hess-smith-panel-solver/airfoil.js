import intersectLines from './intersect-lines.js';

// NACA 4-digit airfoil formulas
// Reference: https://en.wikipedia.org/wiki/NACA_airfoil

// Thickness distribution (half-thickness at x)
function thickness(x, c, t) {
  const xn = x / c;
  return (t / 0.2) * c * (
    0.2969 * Math.sqrt(xn) -
    0.1260 * xn -
    0.3516 * xn * xn +
    0.2843 * xn * xn * xn -
    0.1015 * xn * xn * xn * xn
  );
}

// Mean camber line
function camber(x, c, m, p) {
  const xn = x / c;
  if (xn < p) {
    return m * c * (2 * p * xn - xn * xn) / (p * p);
  } else {
    return m * c * ((1 - 2 * p) + 2 * p * xn - xn * xn) / ((1 - p) * (1 - p));
  }
}

// Camber line slope
function camberSlope(x, c, m, p) {
  const xn = x / c;
  if (xn < p) {
    return 2 * m * (p - xn) / (p * p);
  } else {
    return 2 * m * (p - xn) / ((1 - p) * (1 - p));
  }
}

// Upper surface coordinates
function upperSurface(x, c, m, p, t) {
  const yc = camber(x, c, m, p);
  const yt = thickness(x, c, t);
  const dyc = camberSlope(x, c, m, p);
  const theta = Math.atan(dyc);
  return {
    x: x - yt * Math.sin(theta),
    y: yc + yt * Math.cos(theta)
  };
}

// Lower surface coordinates
function lowerSurface(x, c, m, p, t) {
  const yc = camber(x, c, m, p);
  const yt = thickness(x, c, t);
  const dyc = camberSlope(x, c, m, p);
  const theta = Math.atan(dyc);
  return {
    x: x + yt * Math.sin(theta),
    y: yc - yt * Math.cos(theta)
  };
}

export default function meshAirfoil({ count = 20, m = 0.04, p = 0.4, t = 0.12, c = 1, closeEnd = false, clustering = true } = {}) {
  const x = [];
  const y = [];

  // Clustering function for leading edge refinement
  const mapping = clustering ? s => (2 * s ** 2 / (s ** 3 + 1)) : s => s;

  for (let i = 0; i < count + 1; i++) {
    const isUpper = i >= count / 2;
    const tUnscaled = isUpper ? (2 * i / count) : 2 * (1 - i / count);
    const s = mapping(Math.abs(1 - tUnscaled));
    const xCoord = s * c;

    const surface = isUpper
      ? upperSurface(xCoord, c, m, p, t)
      : lowerSurface(xCoord, c, m, p, t);

    x.push(surface.x);
    y.push(surface.y);
  }

  if (closeEnd) {
    const n = count;
    const [xe, ye] = intersectLines(
      x[0], y[0],
      x[1], y[1],
      x[n], y[n],
      x[n - 1], y[n - 1],
    );

    x.unshift(xe);
    y.unshift(ye);
    x.push(xe);
    y.push(ye);
  }

  return { x, y };
}
