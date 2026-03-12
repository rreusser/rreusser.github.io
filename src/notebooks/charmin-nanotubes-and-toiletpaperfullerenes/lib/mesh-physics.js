// Physics simulation for trivalent mesh using gradient descent
// Computes energy gradients for axial, dihedral, and torsional springs

export class MeshPhysics {
  constructor(mesh) {
    this.mesh = mesh;
    this.gradient = null;

    // Physical parameters
    this.k = 1.0;           // Axial spring constant
    this.l0 = 1.0;          // Equilibrium edge length
    this.theta0 = 150;      // Equilibrium dihedral angle (degrees)
    this.kBend = 0.3;       // Bending spring constant
    this.kTorsion = 0.1;    // Torsional spring constant

    // Simulation state
    this.gamma = 0.1;       // Step size
    this.frozenVertex = -1; // Vertex to skip (e.g., being dragged)
    this.frozenVertex2 = -1; // Second frozen vertex (for edge dragging)
  }

  _ensureGradient() {
    const needed = this.mesh.vertexCount * 3;
    if (!this.gradient || this.gradient.length < needed) {
      this.gradient = new Float64Array(Math.max(needed, 256));
    }
    // Zero out
    this.gradient.fill(0, 0, this.mesh.vertexCount * 3);
  }

  // Compute and apply one iteration of gradient descent
  iterate() {
    const mesh = this.mesh;
    if (mesh.vertexCount === 0) return;

    this._ensureGradient();

    // Accumulate energy gradients
    if (this.k > 0) {
      this._computeAxialGradient();
    }
    if (this.kBend > 0) {
      this._computeDihedralGradient();
    }
    if (this.kTorsion > 0) {
      this._computeTorsionalGradient();
    }

    // Apply gradient descent step
    this._applyGradient();
  }

  // ============ Axial Spring Energy ============
  // E = k * (r - l0)^2
  // Gradient: dE/dv = k * (1 - l0/r) * (v - other)

  _computeAxialGradient() {
    const mesh = this.mesh;
    const positions = mesh.positions;
    const gradient = this.gradient;
    const k = this.k;
    const l0 = this.l0;

    for (let e = 0; e < mesh.edgeCount; e++) {
      const i2 = e * 2;
      const v0 = mesh.edges[i2];
      const v1 = mesh.edges[i2 + 1];

      const i0 = v0 * 3;
      const i1 = v1 * 3;

      const dx = positions[i0] - positions[i1];
      const dy = positions[i0 + 1] - positions[i1 + 1];
      const dz = positions[i0 + 2] - positions[i1 + 2];

      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (r < 1e-10) continue;

      const c = k * (1 - l0 / r);
      const fx = c * dx;
      const fy = c * dy;
      const fz = c * dz;

      gradient[i0] += fx;
      gradient[i0 + 1] += fy;
      gradient[i0 + 2] += fz;
      gradient[i1] -= fx;
      gradient[i1 + 1] -= fy;
      gradient[i1 + 2] -= fz;
    }
  }

  // ============ Dihedral (Bending) Energy ============
  // For angle at vertex A between edges A-B and A-C:
  // E = kBend * (cos(theta) - cos(theta0))^2

  _computeDihedralGradient() {
    const mesh = this.mesh;
    const positions = mesh.positions;
    const gradient = this.gradient;
    const kBend = this.kBend * this.l0 * this.l0;
    const cosTheta0 = Math.cos(this.theta0 * Math.PI / 180);

    // Iterate over all vertices and their angle pairs
    for (let v = 0; v < mesh.vertexCount; v++) {
      const i3 = v * 3;
      const n0 = mesh.neighbors[i3];
      const n1 = mesh.neighbors[i3 + 1];
      const n2 = mesh.neighbors[i3 + 2];

      // Process each pair of neighbors
      if (n0 !== -1 && n1 !== -1) {
        this._accumulateDihedralGradient(v, n0, n1, kBend, cosTheta0);
      }
      if (n1 !== -1 && n2 !== -1) {
        this._accumulateDihedralGradient(v, n1, n2, kBend, cosTheta0);
      }
      if (n2 !== -1 && n0 !== -1) {
        this._accumulateDihedralGradient(v, n2, n0, kBend, cosTheta0);
      }
    }
  }

  _accumulateDihedralGradient(ia, ib, ic, kBend, cosTheta0) {
    const positions = this.mesh.positions;
    const gradient = this.gradient;

    const a = ia * 3;
    const b = ib * 3;
    const c = ic * 3;

    // Vectors from a to b and a to c
    const abx = positions[b] - positions[a];
    const aby = positions[b + 1] - positions[a + 1];
    const abz = positions[b + 2] - positions[a + 2];
    const acx = positions[c] - positions[a];
    const acy = positions[c + 1] - positions[a + 1];
    const acz = positions[c + 2] - positions[a + 2];

    const ab = Math.sqrt(abx * abx + aby * aby + abz * abz);
    const ac = Math.sqrt(acx * acx + acy * acy + acz * acz);

    if (ab < 1e-10 || ac < 1e-10) return;

    const ab_ac = abx * acx + aby * acy + abz * acz;
    const cosTheta = ab_ac / (ab * ac);
    const f = (kBend * 2 * (cosTheta - cosTheta0)) / (ab * ac);
    const r = ab / ac;

    // Gradient w.r.t. vertex b
    let fb_x = f * (acx - (cosTheta / r) * abx);
    let fb_y = f * (acy - (cosTheta / r) * aby);
    let fb_z = f * (acz - (cosTheta / r) * abz);

    // Gradient w.r.t. vertex c
    let fc_x = f * (abx - cosTheta * r * acx);
    let fc_y = f * (aby - cosTheta * r * acy);
    let fc_z = f * (abz - cosTheta * r * acz);

    // Accumulate (vertex a gets negative sum)
    gradient[a] -= fb_x + fc_x;
    gradient[a + 1] -= fb_y + fc_y;
    gradient[a + 2] -= fb_z + fc_z;
    gradient[b] += fb_x;
    gradient[b + 1] += fb_y;
    gradient[b + 2] += fb_z;
    gradient[c] += fc_x;
    gradient[c + 1] += fc_y;
    gradient[c + 2] += fc_z;
  }

  // ============ Torsional Energy ============
  // For 6 vertices a,b,c,d,e,f around edge a-b:
  // E = -((alpha x beta) . (alpha x gamma))^2
  // where alpha = (b-a)/|b-a|, beta = (d-c)/|d-c|, gamma = (f-e)/|f-e|

  _computeTorsionalGradient() {
    const mesh = this.mesh;

    for (let e = 0; e < mesh.edgeCount; e++) {
      const config = mesh.getTorsionVertices(e);
      if (!config) continue;

      this._accumulateTorsionalGradient(config);
    }
  }

  _accumulateTorsionalGradient(config) {
    const { a, b, c, d, e, f } = config;
    const positions = this.mesh.positions;
    const gradient = this.gradient;
    const kTorsion = this.kTorsion * this.l0 * this.l0;

    const ia = a * 3, ib = b * 3, ic = c * 3;
    const id = d * 3, ie = e * 3, iff = f * 3;

    // Get positions
    const pa = [positions[ia], positions[ia + 1], positions[ia + 2]];
    const pb = [positions[ib], positions[ib + 1], positions[ib + 2]];
    const pc = [positions[ic], positions[ic + 1], positions[ic + 2]];
    const pd = [positions[id], positions[id + 1], positions[id + 2]];
    const pe = [positions[ie], positions[ie + 1], positions[ie + 2]];
    const pf = [positions[iff], positions[iff + 1], positions[iff + 2]];

    // Compute unit vectors
    const alpha = this._unitVector(pa, pb);
    const beta = this._unitVector(pc, pd);
    const gamma = this._unitVector(pe, pf);

    if (!alpha || !beta || !gamma) return;

    const rab = alpha.len;
    const rcd = beta.len;
    const ref = gamma.len;

    // Dot products
    const bg = this._dot(beta.v, gamma.v);
    const ag = this._dot(alpha.v, gamma.v);
    const ab = this._dot(alpha.v, beta.v);

    const E0 = (bg - ab * ag) * kTorsion;

    // Gradient w.r.t. alpha direction (vertices a and b)
    const da = [
      alpha.v[0] * (-2.0 * ab * ag) + beta.v[0] * ag + gamma.v[0] * ab,
      alpha.v[1] * (-2.0 * ab * ag) + beta.v[1] * ag + gamma.v[1] * ab,
      alpha.v[2] * (-2.0 * ab * ag) + beta.v[2] * ag + gamma.v[2] * ab
    ];
    this._scaleVec(da, (-2 * E0) / rab);

    // Gradient w.r.t. beta direction (vertices c and d)
    const dc = [
      beta.v[0] * (bg - ag * ab) - gamma.v[0] + alpha.v[0] * ag,
      beta.v[1] * (bg - ag * ab) - gamma.v[1] + alpha.v[1] * ag,
      beta.v[2] * (bg - ag * ab) - gamma.v[2] + alpha.v[2] * ag
    ];
    this._scaleVec(dc, (-2 * E0) / rcd);

    // Gradient w.r.t. gamma direction (vertices e and f)
    const de = [
      gamma.v[0] * (bg - ab * ag) - beta.v[0] + alpha.v[0] * ab,
      gamma.v[1] * (bg - ab * ag) - beta.v[1] + alpha.v[1] * ab,
      gamma.v[2] * (bg - ab * ag) - beta.v[2] + alpha.v[2] * ab
    ];
    this._scaleVec(de, (-2 * E0) / ref);

    // Accumulate gradients
    gradient[ia] += da[0];
    gradient[ia + 1] += da[1];
    gradient[ia + 2] += da[2];
    gradient[ib] -= da[0];
    gradient[ib + 1] -= da[1];
    gradient[ib + 2] -= da[2];

    gradient[ic] += dc[0];
    gradient[ic + 1] += dc[1];
    gradient[ic + 2] += dc[2];
    gradient[id] -= dc[0];
    gradient[id + 1] -= dc[1];
    gradient[id + 2] -= dc[2];

    gradient[ie] += de[0];
    gradient[ie + 1] += de[1];
    gradient[ie + 2] += de[2];
    gradient[iff] -= de[0];
    gradient[iff + 1] -= de[1];
    gradient[iff + 2] -= de[2];
  }

  _unitVector(from, to) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-10) return null;
    return {
      v: [dx / len, dy / len, dz / len],
      len
    };
  }

  _dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  _scaleVec(v, s) {
    v[0] *= s;
    v[1] *= s;
    v[2] *= s;
  }

  // ============ Apply Gradient ============

  _applyGradient() {
    const mesh = this.mesh;
    const positions = mesh.positions;
    const gradient = this.gradient;
    const gamma = this.gamma;

    for (let v = 0; v < mesh.vertexCount; v++) {
      if (v === this.frozenVertex || v === this.frozenVertex2) continue;

      const i3 = v * 3;
      positions[i3] -= gradient[i3] * gamma;
      positions[i3 + 1] -= gradient[i3 + 1] * gamma;
      positions[i3 + 2] -= gradient[i3 + 2] * gamma;
    }
  }

  // ============ Strain Computation (for coloring) ============

  computeEdgeStrain(edgeIndex) {
    const mesh = this.mesh;
    const i2 = edgeIndex * 2;
    const v0 = mesh.edges[i2];
    const v1 = mesh.edges[i2 + 1];

    const i0 = v0 * 3;
    const i1 = v1 * 3;
    const positions = mesh.positions;

    const dx = positions[i0] - positions[i1];
    const dy = positions[i0 + 1] - positions[i1 + 1];
    const dz = positions[i0 + 2] - positions[i1 + 2];

    const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return (r / this.l0) - 1.0;
  }
}

export default MeshPhysics;
