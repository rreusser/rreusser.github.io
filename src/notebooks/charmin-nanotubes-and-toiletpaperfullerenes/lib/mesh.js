// Mesh data structure for trivalent graphs (max 3 edges per vertex)
// Optimized for physics simulation and interactive editing

export class Mesh {
  constructor() {
    // Vertex positions: flat array [x0,y0,z0, x1,y1,z1, ...]
    this.positions = new Float32Array(0);
    this.vertexCount = 0;
    this._positionCapacity = 0;

    // Per-vertex neighbor indices: [v0_n0, v0_n1, v0_n2, v1_n0, ...]
    // -1 means no neighbor in that slot
    this.neighbors = new Int32Array(0);

    // Edge list for iteration: flat array [v0, v1, v0, v1, ...]
    this.edges = new Uint32Array(0);
    this.edgeCount = 0;
    this._edgeCapacity = 0;

    // Optional cached faces (cleared on topology change)
    this._faces = null;
  }

  // ============ Construction ============

  static fromJSON(json) {
    const mesh = new Mesh();
    const { vertices, edges } = json;

    // Reserve capacity
    mesh._ensureVertexCapacity(vertices.length);
    mesh._ensureEdgeCapacity(edges.length);

    // Add vertices
    for (const v of vertices) {
      mesh._addVertexInternal(v[0], v[1], v[2]);
    }

    // Add edges
    for (const e of edges) {
      mesh._addEdgeInternal(e[0], e[1]);
    }

    return mesh;
  }

  toJSON() {
    const vertices = [];
    for (let i = 0; i < this.vertexCount; i++) {
      const i3 = i * 3;
      vertices.push([
        this.positions[i3],
        this.positions[i3 + 1],
        this.positions[i3 + 2]
      ]);
    }

    const edges = [];
    for (let i = 0; i < this.edgeCount; i++) {
      const i2 = i * 2;
      edges.push([this.edges[i2], this.edges[i2 + 1]]);
    }

    return { vertices, edges };
  }

  clone() {
    return Mesh.fromJSON(this.toJSON());
  }

  // ============ Capacity Management ============

  _ensureVertexCapacity(count) {
    if (count <= this._positionCapacity) return;

    const newCapacity = Math.max(count, this._positionCapacity * 2, 64);

    const newPositions = new Float32Array(newCapacity * 3);
    if (this.positions.length > 0) {
      newPositions.set(this.positions);
    }
    this.positions = newPositions;

    const newNeighbors = new Int32Array(newCapacity * 3);
    newNeighbors.fill(-1);
    if (this.neighbors.length > 0) {
      newNeighbors.set(this.neighbors);
    }
    this.neighbors = newNeighbors;

    this._positionCapacity = newCapacity;
  }

  _ensureEdgeCapacity(count) {
    if (count <= this._edgeCapacity) return;

    const newCapacity = Math.max(count, this._edgeCapacity * 2, 64);

    const newEdges = new Uint32Array(newCapacity * 2);
    if (this.edges.length > 0) {
      newEdges.set(this.edges);
    }
    this.edges = newEdges;

    this._edgeCapacity = newCapacity;
  }

  // ============ Low-level Operations ============

  _addVertexInternal(x, y, z) {
    this._ensureVertexCapacity(this.vertexCount + 1);
    const idx = this.vertexCount;
    const i3 = idx * 3;
    this.positions[i3] = x;
    this.positions[i3 + 1] = y;
    this.positions[i3 + 2] = z;
    this.neighbors[i3] = -1;
    this.neighbors[i3 + 1] = -1;
    this.neighbors[i3 + 2] = -1;
    this.vertexCount++;
    return idx;
  }

  _addEdgeInternal(v0, v1) {
    // Add to edge list
    this._ensureEdgeCapacity(this.edgeCount + 1);
    const edgeIdx = this.edgeCount;
    const i2 = edgeIdx * 2;
    this.edges[i2] = v0;
    this.edges[i2 + 1] = v1;
    this.edgeCount++;

    // Update neighbor lists
    this._addNeighbor(v0, v1);
    this._addNeighbor(v1, v0);

    return edgeIdx;
  }

  _addNeighbor(vertex, neighbor) {
    const i3 = vertex * 3;
    for (let slot = 0; slot < 3; slot++) {
      if (this.neighbors[i3 + slot] === -1) {
        this.neighbors[i3 + slot] = neighbor;
        return true;
      }
    }
    throw new Error(`Vertex ${vertex} already has 3 neighbors`);
  }

  _removeNeighbor(vertex, neighbor) {
    const i3 = vertex * 3;
    for (let slot = 0; slot < 3; slot++) {
      if (this.neighbors[i3 + slot] === neighbor) {
        this.neighbors[i3 + slot] = -1;
        // Compact: shift remaining neighbors down
        this._compactNeighbors(vertex);
        return true;
      }
    }
    return false;
  }

  _compactNeighbors(vertex) {
    const i3 = vertex * 3;
    const n = [
      this.neighbors[i3],
      this.neighbors[i3 + 1],
      this.neighbors[i3 + 2]
    ].filter(x => x !== -1);

    this.neighbors[i3] = n[0] ?? -1;
    this.neighbors[i3 + 1] = n[1] ?? -1;
    this.neighbors[i3 + 2] = n[2] ?? -1;
  }

  // ============ Public Vertex Operations ============

  addVertex(x, y, z) {
    this._faces = null;
    return this._addVertexInternal(x, y, z);
  }

  getPosition(vertex, out = [0, 0, 0]) {
    const i3 = vertex * 3;
    out[0] = this.positions[i3];
    out[1] = this.positions[i3 + 1];
    out[2] = this.positions[i3 + 2];
    return out;
  }

  setPosition(vertex, x, y, z) {
    const i3 = vertex * 3;
    this.positions[i3] = x;
    this.positions[i3 + 1] = y;
    this.positions[i3 + 2] = z;
  }

  degree(vertex) {
    const i3 = vertex * 3;
    let d = 0;
    if (this.neighbors[i3] !== -1) d++;
    if (this.neighbors[i3 + 1] !== -1) d++;
    if (this.neighbors[i3 + 2] !== -1) d++;
    return d;
  }

  getNeighbors(vertex, out = []) {
    const i3 = vertex * 3;
    out.length = 0;
    if (this.neighbors[i3] !== -1) out.push(this.neighbors[i3]);
    if (this.neighbors[i3 + 1] !== -1) out.push(this.neighbors[i3 + 1]);
    if (this.neighbors[i3 + 2] !== -1) out.push(this.neighbors[i3 + 2]);
    return out;
  }

  getNeighbor(vertex, slot) {
    return this.neighbors[vertex * 3 + slot];
  }

  // Delete vertex and all incident edges
  // Returns an adjacent vertex index (adjusted for deletion) or -1
  deleteVertex(vertexIndex) {
    if (vertexIndex < 0 || vertexIndex >= this.vertexCount) return -1;
    this._faces = null;

    // Find an adjacent vertex to return
    const i3 = vertexIndex * 3;
    let adjacentVertex = this.neighbors[i3];

    // Remove all incident edges
    const neighbors = this.getNeighbors(vertexIndex);
    for (const neighbor of neighbors) {
      this._removeEdgeBetween(vertexIndex, neighbor);
    }

    // Remove vertex by swapping with last
    const lastVertex = this.vertexCount - 1;
    if (vertexIndex !== lastVertex) {
      // Copy last vertex data to this slot
      const last3 = lastVertex * 3;
      this.positions[i3] = this.positions[last3];
      this.positions[i3 + 1] = this.positions[last3 + 1];
      this.positions[i3 + 2] = this.positions[last3 + 2];
      this.neighbors[i3] = this.neighbors[last3];
      this.neighbors[i3 + 1] = this.neighbors[last3 + 1];
      this.neighbors[i3 + 2] = this.neighbors[last3 + 2];

      // Update all references to lastVertex -> vertexIndex
      this._remapVertex(lastVertex, vertexIndex);

      // Adjust adjacentVertex if it was the last one
      if (adjacentVertex === lastVertex) {
        adjacentVertex = vertexIndex;
      }
    }

    this.vertexCount--;

    // Adjust adjacentVertex if it was after the deleted vertex
    // (No longer needed with swap-delete, but handle edge case)
    if (adjacentVertex >= this.vertexCount) {
      adjacentVertex = -1;
    }

    return adjacentVertex;
  }

  // Merge two vertices into one (vertex b is deleted, its edges move to a)
  // Returns the merged vertex index, or -1 if merge is not possible
  mergeVertices(a, b) {
    if (a < 0 || a >= this.vertexCount) return -1;
    if (b < 0 || b >= this.vertexCount) return -1;
    if (a === b) return a;

    const neighborsA = this.getNeighbors(a);
    const neighborsB = this.getNeighbors(b);

    // Check if they're already connected (would need to remove that edge)
    const alreadyConnected = neighborsA.includes(b);

    // Calculate resulting degree
    // If connected: degree = degA + degB - 2 (remove the connecting edge from both)
    // If not connected: degree = degA + degB
    const degA = neighborsA.length;
    const degB = neighborsB.length;
    const resultingDegree = alreadyConnected ? (degA + degB - 2) : (degA + degB);

    if (resultingDegree > 3) return -1;

    // Check for shared neighbors (other than each other) - would create duplicate edges
    const sharedNeighbors = neighborsA.filter(n => n !== b && neighborsB.includes(n));
    if (sharedNeighbors.length > 0) return -1;

    this._faces = null;

    // If connected, remove the edge between them first
    if (alreadyConnected) {
      this._removeEdgeBetween(a, b);
    }

    // Transfer B's edges to A
    const neighborsOfB = this.getNeighbors(b); // Get fresh list after potential edge removal
    for (const neighbor of neighborsOfB) {
      this._removeEdgeBetween(b, neighbor);
      this._addEdgeInternal(a, neighbor);
    }

    // Delete vertex B (now has no edges)
    const lastVertex = this.vertexCount - 1;
    let aAdjusted = a;

    if (b !== lastVertex) {
      // B gets swapped with last vertex
      const b3 = b * 3;
      const last3 = lastVertex * 3;
      this.positions[b3] = this.positions[last3];
      this.positions[b3 + 1] = this.positions[last3 + 1];
      this.positions[b3 + 2] = this.positions[last3 + 2];
      this.neighbors[b3] = this.neighbors[last3];
      this.neighbors[b3 + 1] = this.neighbors[last3 + 1];
      this.neighbors[b3 + 2] = this.neighbors[last3 + 2];
      this._remapVertex(lastVertex, b);

      // If a was the last vertex, it moved to b's slot
      if (a === lastVertex) {
        aAdjusted = b;
      }
    }

    this.vertexCount--;

    return aAdjusted;
  }

  _removeEdgeBetween(v0, v1) {
    // Find and remove edge from edge list
    for (let i = 0; i < this.edgeCount; i++) {
      const i2 = i * 2;
      const a = this.edges[i2];
      const b = this.edges[i2 + 1];
      if ((a === v0 && b === v1) || (a === v1 && b === v0)) {
        // Swap with last edge
        const lastEdge = this.edgeCount - 1;
        if (i !== lastEdge) {
          this.edges[i2] = this.edges[lastEdge * 2];
          this.edges[i2 + 1] = this.edges[lastEdge * 2 + 1];
        }
        this.edgeCount--;
        break;
      }
    }

    // Remove from neighbor lists
    this._removeNeighbor(v0, v1);
    this._removeNeighbor(v1, v0);
  }

  _remapVertex(oldIndex, newIndex) {
    // Update neighbor references
    for (let v = 0; v < this.vertexCount; v++) {
      const i3 = v * 3;
      for (let slot = 0; slot < 3; slot++) {
        if (this.neighbors[i3 + slot] === oldIndex) {
          this.neighbors[i3 + slot] = newIndex;
        }
      }
    }

    // Update edge list
    for (let i = 0; i < this.edgeCount; i++) {
      const i2 = i * 2;
      if (this.edges[i2] === oldIndex) this.edges[i2] = newIndex;
      if (this.edges[i2 + 1] === oldIndex) this.edges[i2 + 1] = newIndex;
    }
  }

  // ============ Public Edge Operations ============

  addEdge(v0, v1) {
    // Check if edge already exists
    if (this.hasEdge(v0, v1)) return -1;

    // Check degree constraint
    if (this.degree(v0) >= 3 || this.degree(v1) >= 3) return -1;

    this._faces = null;
    return this._addEdgeInternal(v0, v1);
  }

  hasEdge(v0, v1) {
    const i3 = v0 * 3;
    return (
      this.neighbors[i3] === v1 ||
      this.neighbors[i3 + 1] === v1 ||
      this.neighbors[i3 + 2] === v1
    );
  }

  getEdge(edgeIndex, out = [0, 0]) {
    const i2 = edgeIndex * 2;
    out[0] = this.edges[i2];
    out[1] = this.edges[i2 + 1];
    return out;
  }

  // Delete an edge by index, preserving both vertices
  // Returns true if edge was deleted, false if invalid index
  deleteEdge(edgeIndex) {
    if (edgeIndex < 0 || edgeIndex >= this.edgeCount) return false;
    this._faces = null;

    const i2 = edgeIndex * 2;
    const v0 = this.edges[i2];
    const v1 = this.edges[i2 + 1];

    // Remove from neighbor lists
    this._removeNeighbor(v0, v1);
    this._removeNeighbor(v1, v0);

    // Swap with last edge and decrement count
    const lastEdge = this.edgeCount - 1;
    if (edgeIndex !== lastEdge) {
      this.edges[i2] = this.edges[lastEdge * 2];
      this.edges[i2 + 1] = this.edges[lastEdge * 2 + 1];
    }
    this.edgeCount--;

    return true;
  }

  // ============ Edge Operations ============

  // Collapse an edge by merging its two endpoints into one vertex
  // The new vertex is placed at the midpoint
  // Returns the edge index of an incident edge, or -1 if failed
  collapseEdge(edgeIndex) {
    if (edgeIndex < 0 || edgeIndex >= this.edgeCount) return -1;

    const edge = this.getEdge(edgeIndex);
    const a = edge[0];
    const b = edge[1];

    // Check if collapse would result in valid geometry
    // The merged vertex would have (degree(a) - 1) + (degree(b) - 1) neighbors
    // This must be <= 3 for a valid trivalent graph
    const degA = this.degree(a);
    const degB = this.degree(b);
    if (degA + degB - 2 > 3) return -1;

    // Also check for shared neighbors (would create duplicate edges)
    const neighborsA = this.getNeighbors(a);
    const neighborsB = this.getNeighbors(b);
    const sharedNeighbors = neighborsA.filter(n => n !== b && neighborsB.includes(n));
    if (sharedNeighbors.length > 0) return -1;

    // BEFORE any modification, find the continuation target.
    // Priority: if one endpoint has degree 2, continue through it to its other neighbor.
    // This ensures we stay on chains when collapsing.
    let continuationTarget = -1;

    // If B has degree 2, its other neighbor is the continuation
    if (degB === 2) {
      for (const n of neighborsB) {
        if (n !== a) {
          continuationTarget = n;
          break;
        }
      }
    }
    // Otherwise if A has degree 2, its other neighbor is the continuation
    if (continuationTarget < 0 && degA === 2) {
      for (const n of neighborsA) {
        if (n !== b) {
          continuationTarget = n;
          break;
        }
      }
    }

    // Secondary: look for degree-2 or degree-1 neighbors (for chain/wing following)
    let chainTarget = -1;
    let wingTarget = -1;
    for (const n of neighborsB) {
      if (n !== a) {
        if (this.degree(n) === 2 && chainTarget < 0) {
          chainTarget = n;
        } else if (this.degree(n) === 1 && wingTarget < 0) {
          wingTarget = n;
        }
      }
    }
    let chainTargetA = -1;
    let wingTargetA = -1;
    for (const n of neighborsA) {
      if (n !== b) {
        if (this.degree(n) === 2 && chainTargetA < 0) {
          chainTargetA = n;
        } else if (this.degree(n) === 1 && wingTargetA < 0) {
          wingTargetA = n;
        }
      }
    }

    this._faces = null;

    // Get the midpoint position
    const posA = this.getPosition(a);
    const posB = this.getPosition(b);
    const midX = (posA[0] + posB[0]) / 2;
    const midY = (posA[1] + posB[1]) / 2;
    const midZ = (posA[2] + posB[2]) / 2;

    // Collect all neighbors of a and b (excluding each other)
    const allNeighbors = [
      ...neighborsA.filter(n => n !== b),
      ...neighborsB.filter(n => n !== a)
    ];

    // Remove all edges from both vertices
    for (const n of neighborsA) {
      this._removeEdgeBetween(a, n);
    }
    for (const n of neighborsB) {
      this._removeEdgeBetween(b, n);
    }

    // Delete vertex b (swap with last)
    // First, handle the case where a or b might be swapped
    const lastVertex = this.vertexCount - 1;

    // Delete b first
    let aAdjusted = a;
    if (b !== lastVertex) {
      // b gets swapped with last
      // If a is the last vertex, a moves to b's position
      if (a === lastVertex) {
        aAdjusted = b;
      }
      // Copy last vertex to b's slot
      const b3 = b * 3;
      const last3 = lastVertex * 3;
      this.positions[b3] = this.positions[last3];
      this.positions[b3 + 1] = this.positions[last3 + 1];
      this.positions[b3 + 2] = this.positions[last3 + 2];
      this.neighbors[b3] = this.neighbors[last3];
      this.neighbors[b3 + 1] = this.neighbors[last3 + 1];
      this.neighbors[b3 + 2] = this.neighbors[last3 + 2];
      this._remapVertex(lastVertex, b);

      // Update allNeighbors if any was the last vertex
      for (let i = 0; i < allNeighbors.length; i++) {
        if (allNeighbors[i] === lastVertex) {
          allNeighbors[i] = b;
        }
      }
    }
    this.vertexCount--;

    // Now set the remaining vertex (aAdjusted) position to midpoint
    this.setPosition(aAdjusted, midX, midY, midZ);

    // Clear neighbor slots for aAdjusted
    const a3 = aAdjusted * 3;
    this.neighbors[a3] = -1;
    this.neighbors[a3 + 1] = -1;
    this.neighbors[a3 + 2] = -1;

    // Map targets through the vertex deletion
    // If target was the lastVertex and got remapped to b's slot, update it
    let continuationTargetMapped = continuationTarget;
    if (continuationTarget === lastVertex && b !== lastVertex) {
      continuationTargetMapped = b;
    }
    let chainTargetMapped = chainTarget;
    if (chainTarget === lastVertex && b !== lastVertex) {
      chainTargetMapped = b;
    }
    let chainTargetAMapped = chainTargetA;
    if (chainTargetA === lastVertex && b !== lastVertex) {
      chainTargetAMapped = b;
    }
    let wingTargetMapped = wingTarget;
    if (wingTarget === lastVertex && b !== lastVertex) {
      wingTargetMapped = b;
    }
    let wingTargetAMapped = wingTargetA;
    if (wingTargetA === lastVertex && b !== lastVertex) {
      wingTargetAMapped = b;
    }

    // Re-add edges to the merged vertex
    for (const n of allNeighbors) {
      if (n >= this.vertexCount) continue;  // Skip if out of bounds
      if (n === aAdjusted) continue;  // Skip self-loops
      this._addEdgeInternal(aAdjusted, n);
    }

    // Priority 1: continuation through degree-2 endpoint (stay on the chain we came from)
    if (continuationTargetMapped >= 0 && continuationTargetMapped < this.vertexCount) {
      const edgeIdx = this.findEdge(aAdjusted, continuationTargetMapped);
      if (edgeIdx >= 0) return edgeIdx;
    }

    // Priority 2: neighbor that has degree 2 (continue along a chain)
    if (chainTargetMapped >= 0 && chainTargetMapped < this.vertexCount) {
      const edgeIdx = this.findEdge(aAdjusted, chainTargetMapped);
      if (edgeIdx >= 0) return edgeIdx;
    }

    if (chainTargetAMapped >= 0 && chainTargetAMapped < this.vertexCount) {
      const edgeIdx = this.findEdge(aAdjusted, chainTargetAMapped);
      if (edgeIdx >= 0) return edgeIdx;
    }

    // Wing targets: stay on the wing edge (B's side first)
    if (wingTargetMapped >= 0 && wingTargetMapped < this.vertexCount) {
      const edgeIdx = this.findEdge(aAdjusted, wingTargetMapped);
      if (edgeIdx >= 0) return edgeIdx;
    }

    if (wingTargetAMapped >= 0 && wingTargetAMapped < this.vertexCount) {
      const edgeIdx = this.findEdge(aAdjusted, wingTargetAMapped);
      if (edgeIdx >= 0) return edgeIdx;
    }

    // Fallback: prefer interior edges (to vertices with degree > 1) over wing edges
    const validNeighbors = allNeighbors.filter(n => n < this.vertexCount && n !== aAdjusted);

    // First try to find an interior neighbor (degree > 1)
    for (const n of validNeighbors) {
      if (this.degree(n) > 1) {
        const edgeIdx = this.findEdge(aAdjusted, n);
        if (edgeIdx >= 0) return edgeIdx;
      }
    }

    // Otherwise return any edge
    if (validNeighbors.length > 0) {
      const fallbackEdge = this.findEdge(aAdjusted, validNeighbors[0]);
      return fallbackEdge >= 0 ? fallbackEdge : -1;
    }

    return -1;
  }

  // Extend from a vertex by adding a new vertex connected to it
  // Only works if vertex has degree < 3
  // Returns the edge index of the new edge, or -1 if can't extend
  extendVertex(vertexIndex) {
    if (vertexIndex < 0 || vertexIndex >= this.vertexCount) return -1;

    const deg = this.degree(vertexIndex);
    if (deg >= 3) return -1;  // No room for another edge

    this._faces = null;

    const pos = this.getPosition(vertexIndex);
    const neighbors = this.getNeighbors(vertexIndex);

    let newX, newY, newZ;

    if (deg === 0) {
      // Isolated vertex: extend in arbitrary direction
      newX = pos[0] + 1;
      newY = pos[1];
      newZ = pos[2];
    } else if (deg === 1) {
      // Degree 1: extend opposite to the single neighbor
      const posNeighbor = this.getPosition(neighbors[0]);
      const dx = pos[0] - posNeighbor[0];
      const dy = pos[1] - posNeighbor[1];
      const dz = pos[2] - posNeighbor[2];
      newX = pos[0] + dx;
      newY = pos[1] + dy;
      newZ = pos[2] + dz;
    } else {
      // Degree 2: extend outward (opposite to average of neighbor directions)
      let avgDx = 0, avgDy = 0, avgDz = 0;
      for (const n of neighbors) {
        const posN = this.getPosition(n);
        avgDx += posN[0] - pos[0];
        avgDy += posN[1] - pos[1];
        avgDz += posN[2] - pos[2];
      }
      const len = Math.sqrt(avgDx * avgDx + avgDy * avgDy + avgDz * avgDz);
      if (len > 0.0001) {
        avgDx /= len;
        avgDy /= len;
        avgDz /= len;
      }
      // Use average edge length
      let avgLen = 0;
      for (const n of neighbors) {
        const posN = this.getPosition(n);
        const dx = posN[0] - pos[0];
        const dy = posN[1] - pos[1];
        const dz = posN[2] - pos[2];
        avgLen += Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
      avgLen /= neighbors.length;

      newX = pos[0] - avgDx * avgLen;
      newY = pos[1] - avgDy * avgLen;
      newZ = pos[2] - avgDz * avgLen;
    }

    // Add new vertex and edge
    const newVertex = this._addVertexInternal(newX, newY, newZ);
    const newEdgeIdx = this._addEdgeInternal(vertexIndex, newVertex);

    return newEdgeIdx;
  }

  // Extend an edge by adding a new vertex at an endpoint with degree < 3
  // Prefers degree-1 endpoints, but also works for degree-2
  // Returns the edge index of the new edge, or -1 if can't extend
  extendEdge(edgeIndex) {
    if (edgeIndex < 0 || edgeIndex >= this.edgeCount) return -1;

    const edge = this.getEdge(edgeIndex);
    const a = edge[0];
    const b = edge[1];
    const degA = this.degree(a);
    const degB = this.degree(b);

    // Find an extendable endpoint (degree < 3), preferring degree 1
    let extendVertex, otherVertex;
    if (degA === 1) {
      extendVertex = a;
      otherVertex = b;
    } else if (degB === 1) {
      extendVertex = b;
      otherVertex = a;
    } else if (degA === 2) {
      extendVertex = a;
      otherVertex = b;
    } else if (degB === 2) {
      extendVertex = b;
      otherVertex = a;
    } else {
      // Both endpoints are degree 3, can't extend
      return -1;
    }

    this._faces = null;

    const posExtend = this.getPosition(extendVertex);
    const neighbors = this.getNeighbors(extendVertex);
    const deg = this.degree(extendVertex);

    let newX, newY, newZ;

    if (deg === 1) {
      // Degree 1: extend in the same direction as the edge
      const posOther = this.getPosition(otherVertex);
      const dx = posExtend[0] - posOther[0];
      const dy = posExtend[1] - posOther[1];
      const dz = posExtend[2] - posOther[2];
      newX = posExtend[0] + dx;
      newY = posExtend[1] + dy;
      newZ = posExtend[2] + dz;
    } else {
      // Degree 2: extend outward (opposite to the average of neighbor directions)
      let avgDx = 0, avgDy = 0, avgDz = 0;
      for (const n of neighbors) {
        const posN = this.getPosition(n);
        avgDx += posN[0] - posExtend[0];
        avgDy += posN[1] - posExtend[1];
        avgDz += posN[2] - posExtend[2];
      }
      // Normalize and invert
      const len = Math.sqrt(avgDx * avgDx + avgDy * avgDy + avgDz * avgDz);
      if (len > 0.0001) {
        avgDx /= len;
        avgDy /= len;
        avgDz /= len;
      }
      // Use average edge length for extension distance
      let avgLen = 0;
      for (const n of neighbors) {
        const posN = this.getPosition(n);
        const dx = posN[0] - posExtend[0];
        const dy = posN[1] - posExtend[1];
        const dz = posN[2] - posExtend[2];
        avgLen += Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
      avgLen /= neighbors.length;

      newX = posExtend[0] - avgDx * avgLen;
      newY = posExtend[1] - avgDy * avgLen;
      newZ = posExtend[2] - avgDz * avgLen;
    }

    // Add new vertex and edge
    const newVertex = this._addVertexInternal(newX, newY, newZ);
    const newEdgeIdx = this._addEdgeInternal(extendVertex, newVertex);

    return newEdgeIdx;
  }

  // Split an edge by inserting a new vertex at its midpoint
  // Returns the edge index of the first new edge (from original vertex a to new vertex)
  splitEdge(edgeIndex) {
    if (edgeIndex < 0 || edgeIndex >= this.edgeCount) return -1;

    const edge = this.getEdge(edgeIndex);
    const a = edge[0];
    const b = edge[1];

    this._faces = null;

    // Get midpoint position
    const posA = this.getPosition(a);
    const posB = this.getPosition(b);
    const midX = (posA[0] + posB[0]) / 2;
    const midY = (posA[1] + posB[1]) / 2;
    const midZ = (posA[2] + posB[2]) / 2;

    // Create new vertex at midpoint
    const newVertex = this._addVertexInternal(midX, midY, midZ);

    // Remove old edge
    this._removeEdgeBetween(a, b);

    // Add two new edges
    const newEdgeIdx = this._addEdgeInternal(a, newVertex);
    this._addEdgeInternal(newVertex, b);

    return newEdgeIdx;
  }

  // Add a face of given size (3-8) on one side of an edge
  // If endpoints have degree 3, follows existing edges; otherwise creates new vertices
  // Returns true if successful
  addFaceOnEdge(edgeIndex, faceSize, normalHint = null) {
    if (edgeIndex < 0 || edgeIndex >= this.edgeCount) return false;
    if (faceSize < 3 || faceSize > 8) return false;

    const edge = this.getEdge(edgeIndex);
    const a = edge[0];
    const b = edge[1];

    const posA = this.getPosition(a);
    const posB = this.getPosition(b);

    // Edge vector and length
    const edgeVec = [posB[0] - posA[0], posB[1] - posA[1], posB[2] - posA[2]];
    const edgeLen = Math.sqrt(edgeVec[0] ** 2 + edgeVec[1] ** 2 + edgeVec[2] ** 2);
    if (edgeLen < 0.0001) return false;

    // Normalize edge vector
    const edgeDir = [edgeVec[0] / edgeLen, edgeVec[1] / edgeLen, edgeVec[2] / edgeLen];

    // Determine the normal direction for the polygon plane
    let normal = normalHint || this._inferFaceNormal(a, b, edgeDir);

    // Compute the "outward" direction perpendicular to the edge within the polygon plane
    const outward = [
      edgeDir[1] * normal[2] - edgeDir[2] * normal[1],
      edgeDir[2] * normal[0] - edgeDir[0] * normal[2],
      edgeDir[0] * normal[1] - edgeDir[1] * normal[0]
    ];

    // For a regular n-gon with edge length L
    const n = faceSize;
    const angleStep = (2 * Math.PI) / n;
    const apothem = edgeLen / (2 * Math.tan(Math.PI / n));
    const circumradius = edgeLen / (2 * Math.sin(Math.PI / n));

    // Edge midpoint and polygon center
    const midpoint = [(posA[0] + posB[0]) / 2, (posA[1] + posB[1]) / 2, (posA[2] + posB[2]) / 2];
    const center = [
      midpoint[0] + outward[0] * apothem,
      midpoint[1] + outward[1] * apothem,
      midpoint[2] + outward[2] * apothem
    ];

    // Calculate starting angle from center to a
    const toA = [posA[0] - center[0], posA[1] - center[1], posA[2] - center[2]];
    const aOutward = toA[0] * outward[0] + toA[1] * outward[1] + toA[2] * outward[2];
    const aEdge = toA[0] * edgeDir[0] + toA[1] * edgeDir[1] + toA[2] * edgeDir[2];
    const startAngle = Math.atan2(aEdge, aOutward);

    // Generate target positions for all polygon vertices
    const polyPositions = [];
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      polyPositions.push([
        center[0] + circumradius * (Math.cos(angle) * outward[0] + Math.sin(angle) * edgeDir[0]),
        center[1] + circumradius * (Math.cos(angle) * outward[1] + Math.sin(angle) * edgeDir[1]),
        center[2] + circumradius * (Math.cos(angle) * outward[2] + Math.sin(angle) * edgeDir[2])
      ]);
    }

    // PHASE 1: Bidirectional planning
    // Trace from A forward and from B backward, then fill the gap
    const plan = { vertices: new Array(n), newVertexPositions: [], edgesToAdd: [] };
    plan.vertices[0] = a;
    plan.vertices[n - 1] = b;

    // Helper: find next vertex going outward from current (returns -1 if none)
    const findOutwardNeighbor = (current, prev) => {
      if (this.degree(current) < 3) return -1;  // Can create new vertex instead

      const neighbors = this.getNeighbors(current);
      const posCurr = this.getPosition(current);
      let best = -1;
      let bestOutward = -Infinity;

      for (const neighbor of neighbors) {
        if (neighbor === prev) continue;

        // Skip edges that share a face with previous edge
        const sharesFace = prev >= 0 && this.getNeighbors(prev).includes(neighbor);
        if (sharesFace) continue;

        const posN = this.getPosition(neighbor);
        const vOut = [posN[0] - posCurr[0], posN[1] - posCurr[1], posN[2] - posCurr[2]];
        const outwardComp = vOut[0] * outward[0] + vOut[1] * outward[1] + vOut[2] * outward[2];

        if (outwardComp > 0 && outwardComp > bestOutward) {
          bestOutward = outwardComp;
          best = neighbor;
        }
      }
      return best;
    };

    // Trace forward from A (positions 1, 2, 3, ...)
    let forwardPath = [a];
    let current = a;
    let prev = b;
    while (forwardPath.length < n - 1) {
      const next = findOutwardNeighbor(current, prev);
      if (next < 0) break;  // Can't continue with existing edges
      forwardPath.push(next);
      prev = current;
      current = next;
    }

    // Trace backward from B (positions n-2, n-3, ...)
    let backwardPath = [b];
    current = b;
    prev = a;
    while (backwardPath.length < n - 1) {
      const next = findOutwardNeighbor(current, prev);
      if (next < 0) break;
      backwardPath.push(next);
      prev = current;
      current = next;
    }

    // Check if paths meet or overlap
    const forwardSet = new Set(forwardPath);
    let meetPoint = -1;
    for (const v of backwardPath) {
      if (forwardSet.has(v) && v !== a && v !== b) {
        meetPoint = v;
        break;
      }
    }

    // Build the final vertex list
    // Forward path fills from position 0, backward path fills from position n-1
    const forwardEnd = forwardPath.length - 1;  // Last index filled by forward
    const backwardEnd = n - backwardPath.length;  // First index filled by backward

    // Fill forward path
    for (let i = 0; i < forwardPath.length && i < n; i++) {
      plan.vertices[i] = forwardPath[i];
    }

    // Fill backward path (in reverse)
    for (let i = 0; i < backwardPath.length && (n - 1 - i) >= 0; i++) {
      const pos = n - 1 - i;
      if (plan.vertices[pos] === undefined || plan.vertices[pos] === backwardPath[i]) {
        plan.vertices[pos] = backwardPath[i];
      }
    }

    // Fill the gap with new vertices
    const gapStart = forwardPath.length;
    const gapEnd = n - backwardPath.length;

    for (let i = gapStart; i <= gapEnd && i < n - 1; i++) {
      if (plan.vertices[i] === undefined) {
        const newIdx = -(plan.newVertexPositions.length + 1);
        plan.newVertexPositions.push(polyPositions[i]);
        plan.vertices[i] = newIdx;
      }
    }

    // Build edges list - track planned degrees to avoid exceeding 3
    const plannedDegrees = {};  // Track additional edges being added to existing vertices

    for (let i = 0; i < n - 1; i++) {
      const v1 = plan.vertices[i];
      const v2 = plan.vertices[i + 1];

      const v1Real = v1 >= 0;
      const v2Real = v2 >= 0;

      if (v1Real && v2Real) {
        // Both existing - check if already connected
        if (!this.getNeighbors(v1).includes(v2)) {
          // Need to add edge - check if possible (including planned edges)
          const v1TotalDeg = this.degree(v1) + (plannedDegrees[v1] || 0);
          const v2TotalDeg = this.degree(v2) + (plannedDegrees[v2] || 0);

          if (v1TotalDeg >= 3 || v2TotalDeg >= 3) {
            return false;  // Can't add edge - would exceed degree 3
          }

          plan.edgesToAdd.push([v1, v2]);
          plannedDegrees[v1] = (plannedDegrees[v1] || 0) + 1;
          plannedDegrees[v2] = (plannedDegrees[v2] || 0) + 1;
        }
      } else {
        // At least one new vertex - will need edge
        // Still track degrees for existing vertices
        if (v1Real) {
          const v1TotalDeg = this.degree(v1) + (plannedDegrees[v1] || 0);
          if (v1TotalDeg >= 3) return false;
          plannedDegrees[v1] = (plannedDegrees[v1] || 0) + 1;
        }
        if (v2Real) {
          const v2TotalDeg = this.degree(v2) + (plannedDegrees[v2] || 0);
          if (v2TotalDeg >= 3) return false;
          plannedDegrees[v2] = (plannedDegrees[v2] || 0) + 1;
        }
        plan.edgesToAdd.push([v1, v2]);
      }
    }

    // Close the polygon (edge from last to first is the original edge, already exists)

    // PHASE 2: Execute the plan
    this._faces = null;

    // Create new vertices and build mapping from negative indices to real indices
    const vertexMap = {};
    for (let i = 0; i < plan.newVertexPositions.length; i++) {
      const pos = plan.newVertexPositions[i];
      const newIdx = this._addVertexInternal(pos[0], pos[1], pos[2]);
      vertexMap[-(i + 1)] = newIdx;
    }

    // Update plan.vertices with real indices
    for (let i = 0; i < n; i++) {
      if (plan.vertices[i] < 0) {
        plan.vertices[i] = vertexMap[plan.vertices[i]];
      }
    }

    // Add edges
    for (const [v1, v2] of plan.edgesToAdd) {
      const realV1 = v1 < 0 ? vertexMap[v1] : v1;
      const realV2 = v2 < 0 ? vertexMap[v2] : v2;
      this._addEdgeInternal(realV1, realV2);
    }

    return true;
  }

  // Infer a normal direction for a new face based on existing geometry
  // Key insight: if a face already exists on one side of the edge, build on the opposite side
  _inferFaceNormal(a, b, edgeDir) {
    const posA = this.getPosition(a);
    const posB = this.getPosition(b);

    // Find neighbors of a and b (excluding each other)
    const neighborsA = this.getNeighbors(a).filter(n => n !== b);
    const neighborsB = this.getNeighbors(b).filter(n => n !== a);

    // Check for shared neighbors - these indicate existing faces containing edge a-b
    const sharedNeighbors = neighborsA.filter(n => neighborsB.includes(n));

    const midpoint = [
      (posA[0] + posB[0]) / 2,
      (posA[1] + posB[1]) / 2,
      (posA[2] + posB[2]) / 2
    ];

    // If there's a shared neighbor, there's already a face on that side
    // We want to build on the OPPOSITE side
    if (sharedNeighbors.length > 0) {
      const c = sharedNeighbors[0];
      const posC = this.getPosition(c);

      // Compute normal of existing face a-b-c
      const ab = [posB[0] - posA[0], posB[1] - posA[1], posB[2] - posA[2]];
      const ac = [posC[0] - posA[0], posC[1] - posA[1], posC[2] - posA[2]];
      const faceNormal = [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0]
      ];
      const len = Math.sqrt(faceNormal[0] ** 2 + faceNormal[1] ** 2 + faceNormal[2] ** 2);
      if (len > 0.0001) {
        // Return OPPOSITE normal (build on other side)
        return [-faceNormal[0] / len, -faceNormal[1] / len, -faceNormal[2] / len];
      }
    }

    // No shared neighbor found - use neighbor positions to infer a reasonable plane
    const neighborPositions = [];
    for (const n of neighborsA) {
      neighborPositions.push(this.getPosition(n));
    }
    for (const n of neighborsB) {
      neighborPositions.push(this.getPosition(n));
    }

    if (neighborPositions.length > 0) {
      // Average the cross products of (neighbor - edgeMidpoint) with edgeDir

      let avgNormal = [0, 0, 0];
      for (const nPos of neighborPositions) {
        const toN = [nPos[0] - midpoint[0], nPos[1] - midpoint[1], nPos[2] - midpoint[2]];
        const cross = [
          edgeDir[1] * toN[2] - edgeDir[2] * toN[1],
          edgeDir[2] * toN[0] - edgeDir[0] * toN[2],
          edgeDir[0] * toN[1] - edgeDir[1] * toN[0]
        ];
        avgNormal[0] += cross[0];
        avgNormal[1] += cross[1];
        avgNormal[2] += cross[2];
      }

      const len = Math.sqrt(avgNormal[0] ** 2 + avgNormal[1] ** 2 + avgNormal[2] ** 2);
      if (len > 0.0001) {
        return [avgNormal[0] / len, avgNormal[1] / len, avgNormal[2] / len];
      }
    }

    // Fallback: use a default normal perpendicular to edge
    // Pick the axis most perpendicular to edgeDir
    const absX = Math.abs(edgeDir[0]);
    const absY = Math.abs(edgeDir[1]);
    const absZ = Math.abs(edgeDir[2]);

    let perpAxis;
    if (absX <= absY && absX <= absZ) {
      perpAxis = [1, 0, 0];
    } else if (absY <= absZ) {
      perpAxis = [0, 1, 0];
    } else {
      perpAxis = [0, 0, 1];
    }

    // Cross product to get normal
    const normal = [
      edgeDir[1] * perpAxis[2] - edgeDir[2] * perpAxis[1],
      edgeDir[2] * perpAxis[0] - edgeDir[0] * perpAxis[2],
      edgeDir[0] * perpAxis[1] - edgeDir[1] * perpAxis[0]
    ];
    const len = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
    return [normal[0] / len, normal[1] / len, normal[2] / len];
  }

  // ============ Stone-Wales Transformation ============

  // Perform a Stone-Wales transformation on an edge
  // Both endpoints must have degree 3
  // Returns the new edge index of the transformed edge, or -1 if failed
  stoneWales(edgeIndex) {
    if (edgeIndex < 0 || edgeIndex >= this.edgeCount) return -1;

    const edge = this.getEdge(edgeIndex);
    const a = edge[0];
    const b = edge[1];

    // Both endpoints must have degree 3
    if (this.degree(a) !== 3 || this.degree(b) !== 3) return -1;

    // Get other neighbors (not the edge endpoints themselves)
    const neighborsA = this.getNeighbors(a).filter(n => n !== b);
    const neighborsB = this.getNeighbors(b).filter(n => n !== a);

    if (neighborsA.length !== 2 || neighborsB.length !== 2) return -1;

    const c = neighborsA[0];
    const d = neighborsA[1];
    const e = neighborsB[0];
    const f = neighborsB[1];

    // Get positions
    const pa = this.getPosition(a);
    const pb = this.getPosition(b);
    const pc = this.getPosition(c);
    const pd = this.getPosition(d);
    const pe = this.getPosition(e);
    const pf = this.getPosition(f);

    // Determine which wings are on the same "side" of the a-b edge.
    // 1. Cross ab with ca to get normal n (perpendicular to H plane)
    // 2. Cross n with ab to get in-plane vector pointing toward c
    // 3. Dot be and bf with this to find which is on same side as c

    const ab = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]];
    const ca = [pa[0] - pc[0], pa[1] - pc[1], pa[2] - pc[2]];

    // n = ab × ca (normal to H plane)
    const n = [
      ab[1] * ca[2] - ab[2] * ca[1],
      ab[2] * ca[0] - ab[0] * ca[2],
      ab[0] * ca[1] - ab[1] * ca[0]
    ];

    // inPlane = n × ab (in-plane direction toward c)
    const inPlane = [
      n[1] * ab[2] - n[2] * ab[1],
      n[2] * ab[0] - n[0] * ab[2],
      n[0] * ab[1] - n[1] * ab[0]
    ];

    // Wings from b
    const be = [pe[0] - pb[0], pe[1] - pb[1], pe[2] - pb[2]];
    const bf = [pf[0] - pb[0], pf[1] - pb[1], pf[2] - pb[2]];

    // Dot products tell which of e/f is on same side as c
    const dotE = be[0] * inPlane[0] + be[1] * inPlane[1] + be[2] * inPlane[2];
    const dotF = bf[0] * inPlane[0] + bf[1] * inPlane[1] + bf[2] * inPlane[2];

    // Swap the same-side pair
    let swapC, swapE;
    if (dotE > dotF) {
      // e is on same side as c → swap (c, e)
      swapC = c;
      swapE = e;
    } else {
      // f is on same side as c → swap (c, f)
      swapC = c;
      swapE = f;
    }

    // Perform the swap:
    // - Remove A-swapC and B-swapE
    // - Add A-swapE and B-swapC
    this._removeEdgeBetween(a, swapC);
    this._removeEdgeBetween(b, swapE);
    this._addEdgeInternal(a, swapE);
    this._addEdgeInternal(b, swapC);

    this._faces = null;

    // Find and return the new index of edge A-B
    return this.findEdge(a, b);
  }

  // Find the index of an edge between two vertices, or -1 if not found
  findEdge(v0, v1) {
    for (let i = 0; i < this.edgeCount; i++) {
      const i2 = i * 2;
      const a = this.edges[i2];
      const b = this.edges[i2 + 1];
      if ((a === v0 && b === v1) || (a === v1 && b === v0)) {
        return i;
      }
    }
    return -1;
  }

  // ============ Editing Operations ============

  // Collapse a degree-2 vertex, connecting its two neighbors
  // Returns the index of one of the formerly-adjacent vertices
  collapseVertex(vertexIndex) {
    if (this.degree(vertexIndex) !== 2) return vertexIndex;
    this._faces = null;

    const n0 = this.neighbors[vertexIndex * 3];
    const n1 = this.neighbors[vertexIndex * 3 + 1];

    // Remove the vertex (this removes its edges)
    this.deleteVertex(vertexIndex);

    // Adjust neighbor indices if they were after the deleted vertex
    // With swap-delete, we need to check if they got remapped
    let adj0 = n0;
    let adj1 = n1;

    // If the deleted vertex was swapped with the last one,
    // and n0 or n1 was the last vertex, it's now at vertexIndex
    const wasLast = this.vertexCount; // vertexCount was decremented
    if (n0 === wasLast) adj0 = vertexIndex < wasLast ? vertexIndex : n0;
    if (n1 === wasLast) adj1 = vertexIndex < wasLast ? vertexIndex : n1;

    // But wait - we need to reconsider. After deleteVertex:
    // - vertexCount is now one less
    // - If vertexIndex wasn't the last, lastVertex's data moved to vertexIndex
    // So if n0 or n1 was lastVertex (== this.vertexCount after deletion),
    // it's now at vertexIndex
    if (n0 === this.vertexCount && vertexIndex < this.vertexCount) adj0 = vertexIndex;
    if (n1 === this.vertexCount && vertexIndex < this.vertexCount) adj1 = vertexIndex;

    // Connect the two neighbors
    if (adj0 >= 0 && adj1 >= 0 && adj0 < this.vertexCount && adj1 < this.vertexCount) {
      this.addEdge(adj0, adj1);
    }

    return adj0 >= 0 && adj0 < this.vertexCount ? adj0 : -1;
  }

  // Split a degree-2 vertex by inserting a new vertex on one of its edges
  // Returns the index of the new vertex
  splitVertex(vertexIndex) {
    if (this.degree(vertexIndex) !== 2) return vertexIndex;
    this._faces = null;

    const neighbor = this.neighbors[vertexIndex * 3];
    const pos = this.getPosition(vertexIndex);
    const neighborPos = this.getPosition(neighbor);

    // New vertex at midpoint
    const newVertex = this.addVertex(
      0.5 * (pos[0] + neighborPos[0]),
      0.5 * (pos[1] + neighborPos[1]),
      0.5 * (pos[2] + neighborPos[2])
    );

    // Remove old edge and add two new ones
    this._removeEdgeBetween(vertexIndex, neighbor);
    this._addEdgeInternal(vertexIndex, newVertex);
    this._addEdgeInternal(newVertex, neighbor);

    return newVertex;
  }

  // Explode a vertex: disconnect all but the first edge
  // Each disconnected edge gets its own copy of the vertex
  explodeVertex(vertexIndex) {
    const neighbors = this.getNeighbors(vertexIndex);
    if (neighbors.length <= 1) return vertexIndex;
    this._faces = null;

    const pos = this.getPosition(vertexIndex);

    // Keep first neighbor connected, disconnect others
    for (let i = 1; i < neighbors.length; i++) {
      const neighbor = neighbors[i];

      // Create new vertex at same position
      const newVertex = this.addVertex(pos[0], pos[1], pos[2]);

      // Remove edge to neighbor
      this._removeEdgeBetween(vertexIndex, neighbor);

      // Add edge from new vertex to neighbor
      this._addEdgeInternal(newVertex, neighbor);
    }

    return vertexIndex;
  }

  // ============ Geometry ============

  computeCentroid(out = [0, 0, 0]) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;

    for (let i = 0; i < this.vertexCount; i++) {
      const i3 = i * 3;
      out[0] += this.positions[i3];
      out[1] += this.positions[i3 + 1];
      out[2] += this.positions[i3 + 2];
    }

    if (this.vertexCount > 0) {
      out[0] /= this.vertexCount;
      out[1] /= this.vertexCount;
      out[2] /= this.vertexCount;
    }

    return out;
  }

  translate(dx, dy, dz) {
    for (let i = 0; i < this.vertexCount; i++) {
      const i3 = i * 3;
      this.positions[i3] += dx;
      this.positions[i3 + 1] += dy;
      this.positions[i3 + 2] += dz;
    }
  }

  center() {
    const c = this.computeCentroid();
    this.translate(-c[0], -c[1], -c[2]);
  }

  // ============ Face Extraction ============

  // Find all cycles up to maxLen using DFS
  // Pure graph traversal - no geometry, no rotation system
  _findAllCycles(maxLen = 8) {
    const cycles = new Set();
    const mesh = this;

    // Canonical key for deduplication (rotation/reflection invariant)
    function canonicalKey(cycle) {
      const minVal = Math.min(...cycle);
      const minIdx = cycle.indexOf(minVal);
      const rotated = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
      const reversed = [rotated[0], ...rotated.slice(1).reverse()];
      const k1 = rotated.join(',');
      const k2 = reversed.join(',');
      return k1 < k2 ? k1 : k2;
    }

    // DFS from each vertex to find cycles
    for (let start = 0; start < this.vertexCount; start++) {
      function dfs(curr, path, visited) {
        if (path.length > maxLen) return;

        for (const next of mesh.getNeighbors(curr)) {
          if (next === start && path.length >= 3) {
            // Found a cycle back to start
            cycles.add(canonicalKey(path));
          } else if (next > start && !visited.has(next)) {
            // Only explore vertices > start to avoid finding same cycle multiple times
            visited.add(next);
            path.push(next);
            dfs(next, path, visited);
            path.pop();
            visited.delete(next);
          }
        }
      }

      dfs(start, [start], new Set([start]));
    }

    return [...cycles].map(k => k.split(',').map(Number));
  }

  // Extract faces: find cycles and select subset where each edge appears in exactly 2 faces
  // Uses greedy selection, preferring shorter cycles
  extractAllFaces(maxLen = 8) {
    const allCycles = this._findAllCycles(maxLen);

    // Sort by length (prefer shorter cycles)
    allCycles.sort((a, b) => a.length - b.length);

    // Greedily select cycles: each edge can appear in at most 2 faces
    const edgeCounts = new Map();
    const selectedFaces = [];

    for (const cycle of allCycles) {
      // Check if adding this cycle would exceed 2 for any edge
      let canAdd = true;
      const cycleEdges = [];

      for (let i = 0; i < cycle.length; i++) {
        const a = cycle[i], b = cycle[(i + 1) % cycle.length];
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        cycleEdges.push(key);
        if ((edgeCounts.get(key) || 0) >= 2) {
          canAdd = false;
          break;
        }
      }

      if (canAdd) {
        selectedFaces.push(cycle);
        for (const key of cycleEdges) {
          edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
        }
      }
    }

    return selectedFaces;
  }

  // Extract faces (cached)
  extractFaces() {
    if (this._faces !== null) return this._faces;
    this._faces = this.extractAllFaces(8);
    return this._faces;
  }

  // Compute signed area of a face polygon using 3D cross product
  // Returns positive for faces with normal pointing "outward" (away from centroid)
  _computeSignedArea(face) {
    if (face.length < 3) return 0;

    // Compute face centroid
    let cx = 0, cy = 0, cz = 0;
    for (const v of face) {
      const p = v * 3;
      cx += this.positions[p];
      cy += this.positions[p + 1];
      cz += this.positions[p + 2];
    }
    cx /= face.length;
    cy /= face.length;
    cz /= face.length;

    // Compute face normal using Newell's method (robust for non-planar polygons)
    let nx = 0, ny = 0, nz = 0;
    const n = face.length;

    for (let i = 0; i < n; i++) {
      const v0 = face[i];
      const v1 = face[(i + 1) % n];
      const p0 = v0 * 3;
      const p1 = v1 * 3;

      const x0 = this.positions[p0], y0 = this.positions[p0 + 1], z0 = this.positions[p0 + 2];
      const x1 = this.positions[p1], y1 = this.positions[p1 + 1], z1 = this.positions[p1 + 2];

      nx += (y0 - y1) * (z0 + z1);
      ny += (z0 - z1) * (x0 + x1);
      nz += (x0 - x1) * (y0 + y1);
    }

    // Compute mesh centroid for reference
    let mcx = 0, mcy = 0, mcz = 0;
    for (let i = 0; i < this.vertexCount; i++) {
      const p = i * 3;
      mcx += this.positions[p];
      mcy += this.positions[p + 1];
      mcz += this.positions[p + 2];
    }
    mcx /= this.vertexCount;
    mcy /= this.vertexCount;
    mcz /= this.vertexCount;

    // Vector from mesh centroid to face centroid
    const dx = cx - mcx;
    const dy = cy - mcy;
    const dz = cz - mcz;

    // Dot product: positive if face normal points away from mesh center
    const dot = nx * dx + ny * dy + nz * dz;

    // Return magnitude with sign based on orientation
    const area = Math.sqrt(nx * nx + ny * ny + nz * nz) * 0.5;
    return dot >= 0 ? area : -area;
  }


  // ============ Normal Computation ============

  // Compute consistent face normals using flood fill to ensure uniform winding
  // Returns an array of normals (one per face, same order as extractFaces())
  // Each normal is [nx, ny, nz] pointing "outward" from the mesh
  computeFaceNormals() {
    const faces = this.extractFaces();
    if (faces.length === 0) return [];

    // Compute raw normals for each face using Newell's method
    const normals = [];
    for (const face of faces) {
      normals.push(this._computeFaceNormal(face));
    }

    // Build face adjacency (which faces share edges)
    const edgeToFaces = new Map();
    for (let fi = 0; fi < faces.length; fi++) {
      const face = faces[fi];
      for (let i = 0; i < face.length; i++) {
        const a = face[i];
        const b = face[(i + 1) % face.length];
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        if (!edgeToFaces.has(key)) {
          edgeToFaces.set(key, []);
        }
        edgeToFaces.get(key).push({ faceIndex: fi, v1: a, v2: b });
      }
    }

    // Flood fill to make normals consistent
    const visited = new Array(faces.length).fill(false);
    const flipped = new Array(faces.length).fill(false);
    const queue = [0];
    visited[0] = true;

    while (queue.length > 0) {
      const fi = queue.shift();
      const face = faces[fi];

      // Check all adjacent faces
      for (let i = 0; i < face.length; i++) {
        const a = face[i];
        const b = face[(i + 1) % face.length];
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        const adjacent = edgeToFaces.get(key) || [];

        for (const adj of adjacent) {
          if (adj.faceIndex === fi) continue;
          if (visited[adj.faceIndex]) continue;

          visited[adj.faceIndex] = true;
          queue.push(adj.faceIndex);

          // Check winding consistency
          // If both faces traverse the shared edge in the same direction,
          // they have opposite winding and one should be flipped
          const thisEdgeOrder = (a === face[i] && b === face[(i + 1) % face.length]);
          const adjFace = faces[adj.faceIndex];
          const adjEdgeOrder = (adj.v1 === a && adj.v2 === b);

          // If edge directions match, normals should point opposite ways
          // (consistent winding means edges go opposite directions on shared edge)
          if (thisEdgeOrder === adjEdgeOrder) {
            // Same edge direction -> flip adjacent normal
            if (flipped[fi]) {
              // If current face was flipped, adjacent should not be
              flipped[adj.faceIndex] = false;
            } else {
              flipped[adj.faceIndex] = true;
            }
          } else {
            // Opposite edge direction -> same normal direction
            flipped[adj.faceIndex] = flipped[fi];
          }
        }
      }
    }

    // Apply flips
    for (let i = 0; i < normals.length; i++) {
      if (flipped[i]) {
        normals[i][0] = -normals[i][0];
        normals[i][1] = -normals[i][1];
        normals[i][2] = -normals[i][2];
      }
    }

    // Orient normals outward (away from mesh centroid)
    const centroid = this.computeCentroid();
    let outwardCount = 0;
    let inwardCount = 0;

    for (let fi = 0; fi < faces.length; fi++) {
      const face = faces[fi];
      // Compute face centroid
      let fx = 0, fy = 0, fz = 0;
      for (const v of face) {
        const p = v * 3;
        fx += this.positions[p];
        fy += this.positions[p + 1];
        fz += this.positions[p + 2];
      }
      fx /= face.length;
      fy /= face.length;
      fz /= face.length;

      // Vector from mesh centroid to face centroid
      const dx = fx - centroid[0];
      const dy = fy - centroid[1];
      const dz = fz - centroid[2];

      // Dot with normal
      const dot = normals[fi][0] * dx + normals[fi][1] * dy + normals[fi][2] * dz;
      if (dot > 0) outwardCount++;
      else inwardCount++;
    }

    // If majority point inward, flip all
    if (inwardCount > outwardCount) {
      for (const n of normals) {
        n[0] = -n[0];
        n[1] = -n[1];
        n[2] = -n[2];
      }
    }

    return normals;
  }

  // Compute the normal of a single face using Newell's method
  _computeFaceNormal(face) {
    let nx = 0, ny = 0, nz = 0;
    const n = face.length;

    for (let i = 0; i < n; i++) {
      const v0 = face[i];
      const v1 = face[(i + 1) % n];
      const p0 = v0 * 3;
      const p1 = v1 * 3;

      const x0 = this.positions[p0], y0 = this.positions[p0 + 1], z0 = this.positions[p0 + 2];
      const x1 = this.positions[p1], y1 = this.positions[p1 + 1], z1 = this.positions[p1 + 2];

      nx += (y0 - y1) * (z0 + z1);
      ny += (z0 - z1) * (x0 + x1);
      nz += (x0 - x1) * (y0 + y1);
    }

    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0.0001) {
      return [nx / len, ny / len, nz / len];
    }
    return [0, 1, 0]; // Fallback
  }

  // Compute per-vertex normals by averaging adjacent face normals
  // Returns Float32Array with 3 components per vertex
  computeVertexNormals() {
    const faces = this.extractFaces();
    const faceNormals = this.computeFaceNormals();
    const vertexNormals = new Float32Array(this.vertexCount * 3);

    // Accumulate face normals to vertices
    for (let fi = 0; fi < faces.length; fi++) {
      const face = faces[fi];
      const fn = faceNormals[fi];
      for (const v of face) {
        const i3 = v * 3;
        vertexNormals[i3] += fn[0];
        vertexNormals[i3 + 1] += fn[1];
        vertexNormals[i3 + 2] += fn[2];
      }
    }

    // Normalize
    for (let v = 0; v < this.vertexCount; v++) {
      const i3 = v * 3;
      const nx = vertexNormals[i3];
      const ny = vertexNormals[i3 + 1];
      const nz = vertexNormals[i3 + 2];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 0.0001) {
        vertexNormals[i3] = nx / len;
        vertexNormals[i3 + 1] = ny / len;
        vertexNormals[i3 + 2] = nz / len;
      }
    }

    return vertexNormals;
  }

  // ============ Iteration Helpers for Physics ============

  // Iterate over edges: callback(v0, v1, edgeIndex)
  forEachEdge(callback) {
    for (let i = 0; i < this.edgeCount; i++) {
      const i2 = i * 2;
      callback(this.edges[i2], this.edges[i2 + 1], i);
    }
  }

  // Iterate over vertex pairs sharing a vertex (for dihedral angles)
  // callback(center, neighbor1, neighbor2)
  forEachAngle(callback) {
    for (let v = 0; v < this.vertexCount; v++) {
      const i3 = v * 3;
      const n0 = this.neighbors[i3];
      const n1 = this.neighbors[i3 + 1];
      const n2 = this.neighbors[i3 + 2];

      if (n0 !== -1 && n1 !== -1) callback(v, n0, n1);
      if (n1 !== -1 && n2 !== -1) callback(v, n1, n2);
      if (n2 !== -1 && n0 !== -1) callback(v, n2, n0);
    }
  }

  // Get the 6-vertex torsion configuration around an edge
  // Returns null if either endpoint has degree < 3
  getTorsionVertices(edgeIndex) {
    const i2 = edgeIndex * 2;
    const a = this.edges[i2];
    const b = this.edges[i2 + 1];

    if (this.degree(a) < 3 || this.degree(b) < 3) return null;

    // Get the two other neighbors of a (not b)
    const neighborsA = this.getNeighbors(a).filter(n => n !== b);
    // Get the two other neighbors of b (not a)
    const neighborsB = this.getNeighbors(b).filter(n => n !== a);

    if (neighborsA.length !== 2 || neighborsB.length !== 2) return null;

    return {
      a, b,
      c: neighborsA[0],
      d: neighborsA[1],
      e: neighborsB[0],
      f: neighborsB[1]
    };
  }
}

export default Mesh;
