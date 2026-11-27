/**
 * Static figures and small computations for the explanatory text.
 * The diagrams are SVG strings. Each takes the colours to draw with, so the
 * notebook can pass the ones that suit the current theme.
 */

const DEFAULTS = { ink: 'currentColor', accent: 'steelblue', accent2: 'tomato' };

const arrowDefs = (id, colour) => `
  <marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 1 L 10 5 L 0 9 z" fill="${colour}" />
  </marker>`;

/** Side view of the channel: walls, laminar profile, axes and the periodic ends. */
export function channelDiagram(colours = {}) {
  const { ink, accent: ACCENT } = { ...DEFAULTS, ...colours };
  const x0 = 70, x1 = 590, yTop = 50, yBot = 210, yMid = 130;
  const hatch = (y, dir) => {
    let s = '';
    for (let x = x0; x <= x1 - 8; x += 13) s += `<line x1="${x}" y1="${y}" x2="${x + 8}" y2="${y + 8 * dir}" />`;
    return s;
  };
  // Parabolic profile u = 1 - y^2 drawn from a base line.
  const base = 150, scale = 120;
  let curve = '', arrows = '';
  for (let n = 0; n <= 40; n++) {
    const y = -1 + n / 20;
    curve += `${n ? 'L' : 'M'} ${(base + scale * (1 - y * y)).toFixed(1)} ${(yMid - 80 * y).toFixed(1)} `;
  }
  for (let n = 1; n < 8; n++) {
    const y = -1 + n / 4;
    arrows += `<line x1="${base}" y1="${yMid - 80 * y}" x2="${(base + scale * (1 - y * y) - 2).toFixed(1)}" y2="${yMid - 80 * y}" marker-end="url(#ch-arrow-accent)" />`;
  }
  return `
<svg viewBox="0 0 670 260" width="100%" style="max-width: 670px; font: 13px sans-serif" role="img"
     aria-label="Side view of the channel with the laminar velocity profile">
  <defs>${arrowDefs('ch-arrow', ink)}${arrowDefs('ch-arrow-accent', ACCENT)}</defs>
  <g stroke="${ink}" fill="none" stroke-width="1.5">
    <line x1="${x0}" y1="${yTop}" x2="${x1}" y2="${yTop}" />
    <line x1="${x0}" y1="${yBot}" x2="${x1}" y2="${yBot}" />
    <g stroke-width="1" opacity="0.6">${hatch(yTop, -1)}${hatch(yBot, 1)}</g>
    <g stroke-dasharray="5 4" stroke-width="1" opacity="0.7">
      <line x1="${x0}" y1="${yTop}" x2="${x0}" y2="${yBot}" />
      <line x1="${x1}" y1="${yTop}" x2="${x1}" y2="${yBot}" />
      <line x1="${base}" y1="${yTop}" x2="${base}" y2="${yBot}" opacity="0.6" />
    </g>
    <line x1="430" y1="${yMid}" x2="490" y2="${yMid}" stroke-width="1.2" marker-end="url(#ch-arrow)" />
    <line x1="430" y1="${yMid}" x2="430" y2="${yMid - 55}" stroke-width="1.2" marker-end="url(#ch-arrow)" />
  </g>
  <g stroke="${ACCENT}" fill="none" stroke-width="1.5">
    <path d="${curve}" stroke-width="2" />
    ${arrows}
  </g>
  <g fill="${ink}">
    <text x="496" y="${yMid + 4}">x</text>
    <text x="426" y="${yMid - 62}" text-anchor="middle">y</text>
    <circle cx="430" cy="${yMid}" r="2.5" />
    <text x="422" y="${yMid + 16}" text-anchor="end">z (out of the page)</text>
    <text x="${x1 + 6}" y="${yTop + 4}">y = 1</text>
    <text x="${x1 + 6}" y="${yBot + 4}">y = −1</text>
    <text x="${(x0 + x1) / 2}" y="${yTop - 22}" text-anchor="middle">no-slip wall</text>
    <text x="${(x0 + x1) / 2}" y="${yBot + 32}" text-anchor="middle">no-slip wall</text>
    <text x="${x0 - 8}" y="${yMid}" text-anchor="middle" transform="rotate(-90 ${x0 - 8} ${yMid})">periodic</text>
    <text x="${x1 - 8}" y="${yMid}" text-anchor="middle" transform="rotate(-90 ${x1 - 8} ${yMid})">periodic</text>
    <text x="${base + scale + 10}" y="${yMid - 12}" fill="${ACCENT}">U = 1 − y²</text>
  </g>
</svg>`;
}

/**
 * One cell of the staggered grid in the x-y plane, with the control volume
 * of a streamwise velocity shaded.
 */
export function staggeredCellDiagram(colours = {}) {
  const { ink, accent: ACCENT, accent2: ACCENT2 } = { ...DEFAULTS, ...colours };
  const L = 200, R = 400, T = 50, B = 250, cx = 300, cy = 150;
  const a = 34; // arrow half-length
  return `
<svg viewBox="0 0 640 300" width="100%" style="max-width: 640px; font: 13px sans-serif" role="img"
     aria-label="A cell of the staggered grid showing where pressure and velocity components are stored">
  <defs>${arrowDefs('sg-arrow-u', ACCENT)}${arrowDefs('sg-arrow-v', ACCENT2)}</defs>
  <rect x="${L - 100}" y="${T}" width="200" height="${B - T}" fill="${ACCENT}" opacity="0.12" />
  <g stroke="${ink}" fill="none">
    <rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" stroke-width="1.5" />
    <g stroke-width="1" opacity="0.45">
      <line x1="${L - 150}" y1="${T}" x2="${R + 150}" y2="${T}" />
      <line x1="${L - 150}" y1="${B}" x2="${R + 150}" y2="${B}" />
      <line x1="${L}" y1="${T - 30}" x2="${L}" y2="${B + 30}" />
      <line x1="${R}" y1="${T - 30}" x2="${R}" y2="${B + 30}" />
    </g>
    <rect x="${L - 100}" y="${T}" width="200" height="${B - T}" stroke="${ACCENT}" stroke-dasharray="5 4" />
  </g>
  <g stroke="${ACCENT}" stroke-width="2.5">
    <line x1="${L - a}" y1="${cy}" x2="${L + a}" y2="${cy}" marker-end="url(#sg-arrow-u)" />
    <line x1="${R - a}" y1="${cy}" x2="${R + a}" y2="${cy}" marker-end="url(#sg-arrow-u)" />
  </g>
  <g stroke="${ACCENT2}" stroke-width="2.5">
    <line x1="${cx}" y1="${B + a}" x2="${cx}" y2="${B - a}" marker-end="url(#sg-arrow-v)" />
    <line x1="${cx}" y1="${T + a}" x2="${cx}" y2="${T - a}" marker-end="url(#sg-arrow-v)" />
  </g>
  <circle cx="${cx}" cy="${cy}" r="5" fill="${ink}" />
  <g fill="${ink}">
    <text x="${cx + 10}" y="${cy + 5}">p(i, j)</text>
    <text x="${L - a - 6}" y="${cy - 10}" text-anchor="end" fill="${ACCENT}">u(i, j)</text>
    <text x="${R + a + 10}" y="${cy + 5}" fill="${ACCENT}">u(i+1, j)</text>
    <text x="${cx + 10}" y="${B + a - 2}" fill="${ACCENT2}">v(i, j)</text>
    <text x="${cx + 10}" y="${T - a + 12}" fill="${ACCENT2}">v(i, j+1)</text>
    <text x="${L - 100}" y="${B + 18}" fill="${ACCENT}" font-size="12">control volume of u(i, j)</text>
    <text x="${R + 60}" y="${B + 22}" font-size="12" opacity="0.8">x →</text>
    <text x="${L - 140}" y="${T + 20}" font-size="12" opacity="0.8">y ↑</text>
  </g>
</svg>`;
}

/**
 * Boundary of the region of absolute stability of the s-stage, order-s
 * explicit Runge-Kutta method (s <= 4), whose amplification factor is the
 * truncated exponential R(z) = sum z^k / k!. The boundary is the set of z
 * with |R(z)| = 1; it is traced by solving R(z) = exp(i theta) with Newton's
 * method while theta runs through s full turns.
 *
 * @returns {{ re: number, im: number }[]}
 */
export function rungeKuttaStabilityBoundary(s, pointsPerTurn = 400) {
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const div = (a, b) => {
    const d = b[0] * b[0] + b[1] * b[1];
    return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
  };
  // Truncated exponential of degree n by Horner's rule.
  const R = (z, n) => {
    let r = [1, 0];
    for (let k = n; k >= 1; k--) {
      r = mul(r, [z[0] / k, z[1] / k]);
      r[0] += 1;
    }
    return r;
  };
  const out = [];
  let z = [0, 0];
  for (let n = 0; n <= s * pointsPerTurn; n++) {
    const theta = (2 * Math.PI * n) / pointsPerTurn;
    for (let it = 0; it < 6; it++) {
      const f = R(z, s);
      f[0] -= Math.cos(theta);
      f[1] -= Math.sin(theta);
      const step = div(f, R(z, s - 1));
      z = [z[0] - step[0], z[1] - step[1]];
    }
    out.push({ re: z[0], im: z[1] });
  }
  return out;
}
