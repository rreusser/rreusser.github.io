// Three-body physics calculations

export function planarThreeBodyDerivative(yp, y, t, masses) {
  const [m0, m1, m2] = masses;

  // First derivative of position is just velocity
  yp[0] = y[2]; yp[1] = y[3];
  yp[4] = y[6]; yp[5] = y[7];
  yp[8] = y[10]; yp[9] = y[11];

  // Attraction between 0-1
  let dx = y[4] - y[0];
  let dy = y[5] - y[1];
  let r3 = Math.pow(dx * dx + dy * dy, 1.5);
  dx /= r3; dy /= r3;
  yp[2] = dx * m1;
  yp[3] = dy * m1;
  yp[6] = -dx * m0;
  yp[7] = -dy * m0;

  // Attraction between 0-2
  dx = y[8] - y[0];
  dy = y[9] - y[1];
  r3 = Math.pow(dx * dx + dy * dy, 1.5);
  dx /= r3; dy /= r3;
  yp[2] += dx * m2;
  yp[3] += dy * m2;
  yp[10] = -dx * m0;
  yp[11] = -dy * m0;

  // Attraction between 1-2
  dx = y[8] - y[4];
  dy = y[9] - y[5];
  r3 = Math.pow(dx * dx + dy * dy, 1.5);
  dx /= r3; dy /= r3;
  yp[6] += dx * m2;
  yp[7] += dy * m2;
  yp[10] -= dx * m1;
  yp[11] -= dy * m1;
}

// Compute Jacobi coordinates and shape vector for classification
export function computeShape(y, masses, idx) {
  const [m1, m2, m3] = masses;
  const i = idx * 9;

  // Compute Jacobi coordinates
  const r1x = (y[i] - y[i + 3]) / Math.sqrt(2);
  const r1y = (y[i + 1] - y[i + 4]) / Math.sqrt(2);
  const r2x = ((m1 * y[i] + m2 * y[i + 3]) / (m1 + m2) - y[i + 6]) * 2 / Math.sqrt(6);
  const r2y = ((m1 * y[i + 1] + m2 * y[i + 4]) / (m1 + m2) - y[i + 7]) * 2 / Math.sqrt(6);

  const r1sq = r1x * r1x + r1y * r1y;
  const r2sq = r2x * r2x + r2y * r2y;
  const denom = r1sq + r2sq;

  return [
    2 * (r1x * r2x + r1y * r2y) / denom,
    (r2sq - r1sq) / denom,
    2 * (r1x * r2y - r1y * r2x) / denom
  ];
}

// Compute free group word from shape trajectory
export function computeFreeGroupWord(shapeTrajectory) {
  function middleBodyIndexFromShape(x, y) {
    const theta = Math.atan2(x, y);
    return Math.floor(((theta / (2 * Math.PI) + 1) % 1) * 3);
  }

  const lsyz = [1];
  let zPrev = 0;

  for (let i = 0; i < shapeTrajectory.length; i += 3) {
    const z = shapeTrajectory[i + 2];
    if (zPrev * z < 0) {
      lsyz.push(middleBodyIndexFromShape(shapeTrajectory[i], shapeTrajectory[i + 1]));
    }
    zPrev = z;
  }

  if (lsyz[lsyz.length - 1] !== 2) lsyz.push(2);

  const oddI = [[null, 'F', 'FA'], ['B', null, 'A'], ['EB', 'E', null]];
  const evenI = [[null, 'D', 'DG'], ['H', null, 'G'], ['CH', 'C', null]];
  const circles = [];

  for (let i = 0; i < lsyz.length - 1; i++) {
    circles.push((i % 2 === 0 ? evenI : oddI)[lsyz[i]][lsyz[i + 1]]);
  }

  const c = circles.join('');
  const groupLookup = { AC: 'b', GE: 'B', BD: 'a', HF: 'A' };
  const freeGroup = [];

  for (let i = 0; i < c.length; i += 2) {
    freeGroup.push(groupLookup[c.substr(i, 2)]);
  }

  return freeGroup.join('');
}

// Integrate trajectory for one period
export function integrateTrajectory(ode45, initialConditions) {
  const config = {
    tolerance: initialConditions.tolerance || 1e-9,
    tLimit: initialConditions.period
  };
  const state = { t: 0, y: initialConditions.y0.slice() };
  const result = { position: [], t: [] };

  function storeStep(t, y) {
    result.t.push(t);
    // Store (x, y, t) for each body - time in z dimension for animation
    result.position.push(y[0], y[1], t, y[4], y[5], t, y[8], y[9], t);
  }

  storeStep(state.t, state.y);

  let step = 0;
  const masses = initialConditions.m;
  const derivative = (yp, y, t) => planarThreeBodyDerivative(yp, y, t, masses);

  while (step++ < 1e6 && !state.limitReached) {
    ode45(state, derivative, config);
    storeStep(state.t, state.y);
  }

  return result;
}

// Parse initial conditions from data
export function parseInitialConditions(conditions, orbit, colors) {
  if (!conditions) return null;

  const p = conditions.x;
  const v = conditions.v;
  const m = conditions.m || [1, 1, 1];

  let cName = orbit;
  if (/i\.c\./.test(cName)) {
    cName = cName.replace(/ i\.c\./, '^{i.c.}').replace(/.([0-9]+)/, '_{$1}');
  } else if (/^F/.test(cName)) {
    cName = cName.replace(/^F([0-9]+)/, 'F_{$1}');
  }

  const totalMass = m.reduce((a, b) => a + b, 0);
  const pointSize = m.map(x => Math.pow((x / totalMass) * 3, 0.5));

  return {
    name: cName,
    y0: [p[0][0], p[0][1], v[0][0], v[0][1],
         p[1][0], p[1][1], v[1][0], v[1][1],
         p[2][0], p[2][1], v[2][0], v[2][1]],
    tolerance: conditions.tolerance || 1e-9,
    period: conditions.T,
    m,
    pointSize,
    colors
  };
}

// Decode URL hash parameters
export function decodeHash(hash) {
  const parts = {};
  hash.replace(/^#/, '').split('&').forEach(part => {
    const [key, value] = part.split('=');
    if (key) parts[key] = decodeURIComponent(value || '');
  });
  return parts;
}
