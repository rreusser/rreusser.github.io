export interface TerrainMesh {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
  vertexCount: number;
  dataResolution: number;
}

export interface TerrainMeshPool {
  getMesh(dataResolution: number): TerrainMesh;
  destroy(): void;
}

// Available mesh data resolutions, from finest to coarsest
const MESH_RESOLUTIONS = [512, 256, 128, 64, 32, 16];

function createMeshAtResolution(device: GPUDevice, dataResolution: number): TerrainMesh {
  const gridSize = dataResolution + 4;
  const vertCount = (gridSize + 1) * (gridSize + 1);

  // Vertex buffer: uint16x2
  const vertexData = new Uint16Array(vertCount * 2);
  let vi = 0;
  for (let row = 0; row <= gridSize; row++) {
    for (let col = 0; col <= gridSize; col++) {
      vertexData[vi++] = col;
      vertexData[vi++] = row;
    }
  }

  // Index buffer: triangle list, uint32
  const quadCount = gridSize * gridSize;
  const indexCount = quadCount * 6;
  const indexData = new Uint32Array(indexCount);
  let ii = 0;
  const stride = gridSize + 1;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const tl = row * stride + col;
      const tr = tl + 1;
      const bl = tl + stride;
      const br = bl + 1;
      // Two triangles per quad, CCW winding (when viewed from +Y)
      indexData[ii++] = tl;
      indexData[ii++] = bl;
      indexData[ii++] = tr;
      indexData[ii++] = tr;
      indexData[ii++] = bl;
      indexData[ii++] = br;
    }
  }

  const vertexBuffer = device.createBuffer({
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);

  const indexBuffer = device.createBuffer({
    size: indexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, indexData);

  return {
    vertexBuffer,
    indexBuffer,
    indexCount,
    vertexCount: vertCount,
    dataResolution,
  };
}

export function createTerrainMeshPool(device: GPUDevice): TerrainMeshPool {
  const meshes = new Map<number, TerrainMesh>();
  for (const res of MESH_RESOLUTIONS) {
    meshes.set(res, createMeshAtResolution(device, res));
  }

  return {
    getMesh(dataResolution: number): TerrainMesh {
      // Find the nearest available resolution <= requested
      for (const res of MESH_RESOLUTIONS) {
        if (res <= dataResolution) return meshes.get(res)!;
      }
      return meshes.get(MESH_RESOLUTIONS[MESH_RESOLUTIONS.length - 1])!;
    },

    destroy() {
      for (const mesh of meshes.values()) {
        mesh.vertexBuffer.destroy();
        mesh.indexBuffer.destroy();
      }
    },
  };
}
