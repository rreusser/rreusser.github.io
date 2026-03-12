export function meshFromFunction(surfaceFn, opts = {}) {
  const res = opts.resolution === undefined ? 11 : opts.resolution;
  const nbUFaces = Array.isArray(opts.resolution) ? opts.resolution[0] : res;
  const nbVFaces = Array.isArray(opts.resolution) ? opts.resolution[1] : res;

  const uDomain = opts.uDomain === undefined ? [0, 1] : opts.uDomain;
  const vDomain = opts.vDomain === undefined ? [0, 1] : opts.vDomain;

  let nbBoundaryAdjustedUFaces = nbUFaces;
  let nbBoundaryAdjustedVFaces = nbVFaces;
  if (!opts.vPeriodic) nbBoundaryAdjustedUFaces += 1;
  if (!opts.uPeriodic) nbBoundaryAdjustedVFaces += 1;

  const positions = [];
  const cells = [];

  for (let i = 0; i < nbBoundaryAdjustedUFaces; i++) {
    const u = uDomain[0] + ((uDomain[1] - uDomain[0]) * i) / nbUFaces;
    for (let j = 0; j < nbBoundaryAdjustedVFaces; j++) {
      const v = vDomain[0] + ((vDomain[1] - vDomain[0]) * j) / nbVFaces;
      positions.push(surfaceFn(u, v));
    }
  }

  for (let i = 0; i < nbUFaces; i++) {
    let iPlusOne = i + 1;
    if (opts.vPeriodic) iPlusOne = iPlusOne % nbUFaces;
    for (let j = 0; j < nbVFaces; j++) {
      let jPlusOne = j + 1;
      if (opts.uPeriodic) jPlusOne = jPlusOne % nbVFaces;

      cells.push([
        i + nbBoundaryAdjustedUFaces * j,
        iPlusOne + nbBoundaryAdjustedUFaces * j,
        iPlusOne + nbBoundaryAdjustedUFaces * jPlusOne
      ]);

      cells.push([
        i + nbBoundaryAdjustedUFaces * j,
        iPlusOne + nbBoundaryAdjustedUFaces * jPlusOne,
        i + nbBoundaryAdjustedUFaces * jPlusOne
      ]);
    }
  }

  return { positions, cells };
}
