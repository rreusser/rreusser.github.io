// 2D parametric surface mesh generation
// Generates UV coordinates for a parametric surface to be evaluated in the shader

export function createMeshSurface(options = {}) {
  const {
    resolution = [30, 30],
    uDomain = [0, 1],
    vDomain = [0, 1],
    uClosed = false,
    vClosed = false,
  } = options;

  const nbUFaces = Array.isArray(resolution) ? resolution[0] : resolution;
  const nbVFaces = Array.isArray(resolution) ? resolution[1] : resolution;

  const nbBoundaryAdjustedUFaces = uClosed ? nbUFaces : nbUFaces + 1;
  const nbBoundaryAdjustedVFaces = vClosed ? nbVFaces : nbVFaces + 1;

  const nbPositions = nbBoundaryAdjustedUFaces * nbBoundaryAdjustedVFaces;
  const positions = new Float32Array(nbPositions * 2);

  // Generate UV positions
  let index = 0;
  for (let i = 0; i < nbBoundaryAdjustedUFaces; i++) {
    const u = uDomain[0] + (uDomain[1] - uDomain[0]) * i / nbUFaces;
    for (let j = 0; j < nbBoundaryAdjustedVFaces; j++) {
      const v = vDomain[0] + (vDomain[1] - vDomain[0]) * j / nbVFaces;
      positions[index++] = u;
      positions[index++] = v;
    }
  }

  // Generate triangle indices
  const nbFaces = nbUFaces * nbVFaces * 2;
  const cells = new Uint16Array(nbFaces * 3);

  let faceIndex = 0;
  for (let i = 0; i < nbUFaces; i++) {
    let iPlusOne = i + 1;
    if (uClosed) iPlusOne = iPlusOne % nbUFaces;

    for (let j = 0; j < nbVFaces; j++) {
      let jPlusOne = j + 1;
      if (vClosed) jPlusOne = jPlusOne % nbVFaces;

      // First triangle
      cells[faceIndex++] = i + nbBoundaryAdjustedUFaces * j;
      cells[faceIndex++] = iPlusOne + nbBoundaryAdjustedUFaces * j;
      cells[faceIndex++] = iPlusOne + nbBoundaryAdjustedUFaces * jPlusOne;

      // Second triangle
      cells[faceIndex++] = i + nbBoundaryAdjustedUFaces * j;
      cells[faceIndex++] = iPlusOne + nbBoundaryAdjustedUFaces * jPlusOne;
      cells[faceIndex++] = i + nbBoundaryAdjustedUFaces * jPlusOne;
    }
  }

  return {
    positions,
    cells,
    count: nbPositions,
  };
}
