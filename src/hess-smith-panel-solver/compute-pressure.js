import computeWinding from './compute-winding.js';

// Compute pressure coefficient at each panel midpoint using tangential velocity.
// Uses the same influence coefficient formulas as the panel solver.
export function computePanelCp(geom, sol, vInfMag, alphaDegs) {
  const { x, y } = geom;
  const n = x.length - 1;
  const al = alphaDegs * Math.PI / 180;
  const gamma = sol.shape[0] > n ? sol.get(n) : 0;

  const cpValues = [];
  const midpoints = [];
  const normals = [];
  const theta = [];

  for (let i = 0; i < n; i++) {
    const ty = y[i + 1] - y[i];
    const tx = x[i + 1] - x[i];
    theta[i] = Math.atan2(ty, tx);
  }

  const winding = computeWinding(x, y);

  for (let i = 0; i < n; i++) {
    const xi = 0.5 * (x[i] + x[i + 1]);
    const yi = 0.5 * (y[i] + y[i + 1]);
    midpoints.push([xi, yi]);

    const thi = theta[i];
    const nx = -Math.sin(thi), ny = Math.cos(thi);
    normals.push([nx, ny]);

    let vt = vInfMag * Math.cos(thi - al);

    for (let j = 0; j < n; j++) {
      const sigma = sol.get(j);
      const thj = theta[j];

      const rij = Math.sqrt((xi - x[j]) ** 2 + (yi - y[j]) ** 2);
      const rij1 = Math.sqrt((xi - x[j + 1]) ** 2 + (yi - y[j + 1]) ** 2);

      let bij = Math.PI * winding;
      if (i !== j) {
        const dx1 = xi - x[j];
        const dx2 = xi - x[j + 1];
        const dy1 = yi - y[j];
        const dy2 = yi - y[j + 1];
        const det = dx1 * dy2 - dx2 * dy1;
        const dot = dx2 * dx1 + dy2 * dy1;
        bij = Math.atan2(det, dot);
      }

      const sij = Math.sin(thi - thj);
      const cij = Math.cos(thi - thj);
      const lij = Math.log(rij1 / rij);
      const c = 0.5 / Math.PI;

      vt += c * sigma * (sij * bij - cij * lij);
      vt += c * gamma * (sij * lij + cij * bij);
    }

    cpValues.push(1 - (vt / vInfMag) ** 2);
  }

  return { cpValues, midpoints, normals };
}

// Compute center of pressure from panel Cp values.
// Returns {x, y} in airfoil coordinates.
export function computeCenterOfPressure(geom, cpData, alphaDegs) {
  const { x, y } = geom;
  const n = x.length - 1;
  const al = alphaDegs * Math.PI / 180;

  const liftDirX = -Math.sin(al);
  const liftDirY = Math.cos(al);

  let totalLift = 0;
  let momentX = 0;
  let momentY = 0;

  for (let i = 0; i < n; i++) {
    const cp = cpData.cpValues[i];
    const [mx, my] = cpData.midpoints[i];
    const [nx, ny] = cpData.normals[i];

    const dx = x[i + 1] - x[i];
    const dy = y[i + 1] - y[i];
    const panelLen = Math.sqrt(dx * dx + dy * dy);

    const forceMag = -cp * panelLen;
    const forceX = forceMag * nx;
    const forceY = forceMag * ny;

    const lift = forceX * liftDirX + forceY * liftDirY;

    totalLift += lift;
    momentX += mx * lift;
    momentY += my * lift;
  }

  if (Math.abs(totalLift) < 1e-10) return { x: 0.25, y: 0 };

  return {
    x: momentX / totalLift,
    y: momentY / totalLift
  };
}
