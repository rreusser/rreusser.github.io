// Planar articulated rigid-body dynamics for a floating-base kinematic tree,
// via recursive Newton-Euler (RNEA). This is the single load-bearing
// algorithm: the mass matrix is extracted from RNEA columns, the bias term is
// RNEA at zero acceleration, and forward dynamics is a dense Cholesky solve.
//
// Model contract (see anthropometry.js): parent[i] < i with parent[0] = -1;
// per-body mass, CoM (body frame), inertia about CoM; joint i >= 1 is a
// revolute joint anchored at (anchorX[i], anchorY[i]) in the parent frame.
// Generalized coordinates q = [x, y, baseAngle, q_1..q_{nb-1}] unless
// model.fixedBase, in which case q = [q_1..q_{nb-1}] and the base is pinned
// at the world origin with zero angle.
//
// External forces are world-frame point forces:
//   ext = { count, body: Int32Array, px, py, fx, fy: Float64Array }
// Gravity enters through the standard base-acceleration offset (+g on the
// base linear acceleration), so free fall corresponds to zero required force.

export function createWorkspace(model) {
  const nb = model.nb, nq = model.nq;
  return {
    th: new Float64Array(nb),   // world angle of each body
    px: new Float64Array(nb),   // world position of each body-frame origin
    py: new Float64Array(nb),
    vx: new Float64Array(nb),   // world velocity of the body-frame origin
    vy: new Float64Array(nb),
    om: new Float64Array(nb),   // world angular velocity
    ax: new Float64Array(nb),   // world acceleration of the origin
    ay: new Float64Array(nb),
    al: new Float64Array(nb),   // world angular acceleration
    rcx: new Float64Array(nb),  // R(th) * com, world offset origin -> CoM
    rcy: new Float64Array(nb),
    acx: new Float64Array(nb),  // world CoM acceleration
    acy: new Float64Array(nb),
    fX: new Float64Array(nb),   // backward-pass joint force accumulators
    fY: new Float64Array(nb),
    nZ: new Float64Array(nb),
    M: new Float64Array(nq * nq),
    Mchol: new Float64Array(nq * nq),
    bias: new Float64Array(nq),
    rhs: new Float64Array(nq),
    e: new Float64Array(nq),
    tauCol: new Float64Array(nq),
  };
}

const cross = (ax, ay, bx, by) => ax * by - ay * bx;

// Forward kinematics + velocity propagation; pass qd = null for poses only.
export function fk(model, q, qd, ws) {
  const { nb, parent, anchorX, anchorY, comX, comY } = model;
  const joff = model.fixedBase ? -1 : 2;  // q index of joint i is joff + i
  const { th, px, py, vx, vy, om, rcx, rcy } = ws;

  if (model.fixedBase) {
    th[0] = 0; px[0] = 0; py[0] = 0; vx[0] = 0; vy[0] = 0; om[0] = 0;
  } else {
    th[0] = q[2]; px[0] = q[0]; py[0] = q[1];
    vx[0] = qd ? qd[0] : 0; vy[0] = qd ? qd[1] : 0; om[0] = qd ? qd[2] : 0;
  }

  for (let i = 1; i < nb; i++) {
    const p = parent[i];
    const cp = Math.cos(th[p]), sp = Math.sin(th[p]);
    const rx = cp * anchorX[i] - sp * anchorY[i];
    const ry = sp * anchorX[i] + cp * anchorY[i];
    th[i] = th[p] + q[joff + i];
    px[i] = px[p] + rx;
    py[i] = py[p] + ry;
    om[i] = om[p] + (qd ? qd[joff + i] : 0);
    vx[i] = vx[p] - om[p] * ry;
    vy[i] = vy[p] + om[p] * rx;
  }
  for (let i = 0; i < nb; i++) {
    const c = Math.cos(th[i]), s = Math.sin(th[i]);
    rcx[i] = c * comX[i] - s * comY[i];
    rcy[i] = s * comX[i] + c * comY[i];
  }
}

// Inverse dynamics: tau such that the system undergoes qdd at state (q, qd)
// with the given external forces applied. opts.gravity defaults to true.
export function rnea(model, q, qd, qdd, tau, ext = null, opts = {}) {
  const { nb, parent, mass, inertia } = model;
  const g = opts.gravity === false ? 0 : model.gravity;
  const ws = opts.ws;
  const joff = model.fixedBase ? -1 : 2;
  const { th, px, py, om, ax, ay, al, rcx, rcy, acx, acy, fX, fY, nZ } = ws;

  // Same contract as crbaMassMatrix: the caller may say the workspace already
  // holds fk(q, qd). Unlike the mass matrix this reads the VELOCITY fields
  // too, so the caller's fk must have been the one that takes qd.
  if (!opts.fkCurrent) fk(model, q, qd, ws);

  if (model.fixedBase) {
    ax[0] = 0; ay[0] = g; al[0] = 0;
  } else {
    ax[0] = qdd[0]; ay[0] = qdd[1] + g; al[0] = qdd[2];
  }

  for (let i = 1; i < nb; i++) {
    const p = parent[i];
    const rx = px[i] - px[p], ry = py[i] - py[p];
    const w = om[p];
    ax[i] = ax[p] - al[p] * ry - w * w * rx;
    ay[i] = ay[p] + al[p] * rx - w * w * ry;
    al[i] = al[p] + qdd[joff + i];
  }

  for (let i = 0; i < nb; i++) {
    const w = om[i];
    acx[i] = ax[i] - al[i] * rcy[i] - w * w * rcx[i];
    acy[i] = ay[i] + al[i] * rcx[i] - w * w * rcy[i];
    fX[i] = mass[i] * acx[i];
    fY[i] = mass[i] * acy[i];
    nZ[i] = inertia[i] * al[i] + cross(rcx[i], rcy[i], fX[i], fY[i]);
  }

  if (ext) {
    for (let k = 0; k < ext.count; k++) {
      const b = ext.body[k];
      fX[b] -= ext.fx[k];
      fY[b] -= ext.fy[k];
      nZ[b] -= cross(ext.px[k] - px[b], ext.py[k] - py[b], ext.fx[k], ext.fy[k]);
    }
  }

  for (let i = nb - 1; i >= 1; i--) {
    const p = parent[i];
    tau[joff + i] = nZ[i];
    fX[p] += fX[i];
    fY[p] += fY[i];
    nZ[p] += nZ[i] + cross(px[i] - px[p], py[i] - py[p], fX[i], fY[i]);
  }
  if (!model.fixedBase) {
    tau[0] = fX[0];
    tau[1] = fY[0];
    tau[2] = nZ[0];
  }
  return tau;
}

const zeroQd = new Float64Array(16);

// Mass matrix via the composite rigid body algorithm, in world coordinates
// at the current configuration: one leaves-to-root pass accumulates each
// subtree's composite mass, CoM, and inertia, and then
//   M[j][k] = IC_j + mC_j (cC_j - p_k) . (cC_j - p_j)
// for revolute joints j, k with k an ancestor of j (the dot product falls
// out of cross(u, perp(w)) = u . w in the plane). Base rows follow from the
// whole-body composite. Verified against RNEA column extraction by gate;
// this is ~6x cheaper and dominates the simulation hot loop.
// fkCurrent says the caller has ALREADY run fk on this exact q into this exact
// workspace, so the kinematics in it are this pose's. Only the position fields
// are read here, so a caller that ran fk WITH velocities qualifies too.
//
// This is not a micro-optimisation: fk was 29% of a rollout, and four fifths
// of that was recomputing the same pose. forwardDynamics below calls rnea and
// then this, back to back, on one q -- so half of those four calls were the
// same trigonometry twice in a row.
export function crbaMassMatrix(model, q, M, ws, fkCurrent = false) {
  const { nb, parent, mass, inertia } = model;
  if (!fkCurrent) fk(model, q, null, ws);
  const { px, py, rcx, rcy } = ws;
  const mC = ws.mC || (ws.mC = new Float64Array(nb));
  const cx = ws.cCx || (ws.cCx = new Float64Array(nb));
  const cy = ws.cCy || (ws.cCy = new Float64Array(nb));
  const IC = ws.IC || (ws.IC = new Float64Array(nb));

  for (let i = 0; i < nb; i++) {
    mC[i] = mass[i];
    cx[i] = px[i] + rcx[i];
    cy[i] = py[i] + rcy[i];
    IC[i] = inertia[i];
  }
  // Accumulate children into parents (parent[i] < i guarantees order).
  for (let i = nb - 1; i >= 1; i--) {
    const p = parent[i];
    const m = mC[p] + mC[i];
    const x = (mC[p] * cx[p] + mC[i] * cx[i]) / m;
    const y = (mC[p] * cy[p] + mC[i] * cy[i]) / m;
    const dp2 = (cx[p] - x) ** 2 + (cy[p] - y) ** 2;
    const di2 = (cx[i] - x) ** 2 + (cy[i] - y) ** 2;
    IC[p] = IC[p] + mC[p] * dp2 + IC[i] + mC[i] * di2;
    mC[p] = m; cx[p] = x; cy[p] = y;
  }

  const nq = model.nq;
  M.fill(0);
  const fb = !model.fixedBase;
  const joff = fb ? 2 : -1;

  if (fb) {
    // Base translations and rotation about the base origin.
    const dx = cx[0] - px[0], dy = cy[0] - py[0];
    M[0 * nq + 0] = mC[0];
    M[1 * nq + 1] = mC[0];
    M[2 * nq + 2] = IC[0] + mC[0] * (dx * dx + dy * dy);
    M[0 * nq + 2] = M[2 * nq + 0] = -mC[0] * dy;
    M[1 * nq + 2] = M[2 * nq + 1] = mC[0] * dx;
  }

  for (let i = 1; i < nb; i++) {
    const j = joff + i;
    const djx = cx[i] - px[i], djy = cy[i] - py[i];
    if (fb) {
      M[0 * nq + j] = M[j * nq + 0] = -mC[i] * djy;
      M[1 * nq + j] = M[j * nq + 1] = mC[i] * djx;
      M[2 * nq + j] = M[j * nq + 2] =
        IC[i] + mC[i] * ((cx[i] - px[0]) * djx + (cy[i] - py[0]) * djy);
    }
    // Ancestors of body i (including itself).
    for (let a = i; a >= 1; a = parent[a]) {
      const k = joff + a;
      const v = IC[i] + mC[i] * ((cx[i] - px[a]) * djx + (cy[i] - py[a]) * djy);
      M[j * nq + k] = v;
      M[k * nq + j] = v;
    }
  }
  return M;
}

// Mass matrix by RNEA column extraction (no gravity, no velocity, no ext).
export function massMatrix(model, q, M, ws) {
  const nq = model.nq;
  const { e, tauCol } = ws;
  for (let j = 0; j < nq; j++) {
    e.fill(0); e[j] = 1;
    rnea(model, q, zeroQd, e, tauCol, null, { gravity: false, ws });
    for (let i = 0; i < nq; i++) M[i * nq + j] = tauCol[i];
  }
  // Symmetrize away roundoff.
  for (let i = 0; i < nq; i++) {
    for (let j = i + 1; j < nq; j++) {
      const v = 0.5 * (M[i * nq + j] + M[j * nq + i]);
      M[i * nq + j] = v; M[j * nq + i] = v;
    }
  }
  return M;
}

// In-place Cholesky solve of A x = b for symmetric positive-definite A.
// A is overwritten with its factor, b with the solution.
export function choleskySolveInPlace(A, b, n) {
  for (let j = 0; j < n; j++) {
    let d = A[j * n + j];
    for (let k = 0; k < j; k++) d -= A[j * n + k] * A[j * n + k];
    if (d <= 0) throw new Error(`cholesky: non-SPD at pivot ${j} (${d})`);
    const Ljj = Math.sqrt(d);
    A[j * n + j] = Ljj;
    for (let i = j + 1; i < n; i++) {
      let s = A[i * n + j];
      for (let k = 0; k < j; k++) s -= A[i * n + k] * A[j * n + k];
      A[i * n + j] = s / Ljj;
    }
  }
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= A[i * n + k] * b[k];
    b[i] = s / A[i * n + i];
  }
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let k = i + 1; k < n; k++) s -= A[k * n + i] * b[k];
    b[i] = s / A[i * n + i];
  }
  return b;
}

// Forward dynamics: qdd = M(q)^-1 (tauAct - bias(q, qd, ext)).
// tauAct may be null (fully passive). Base rows of tauAct are typically zero.
//
// Optional viscous joint damping: a per-coordinate force -damping[i] * qd.
// With dt > 0 the damping is treated implicitly, evaluated at the END of the
// step, i.e. solving (M + dt D) qdd = tau - bias - D qd; stiff servo damping
// on light segments (the hand) is unconditionally stable this way under
// semi-implicit Euler. With dt = 0 the damping is applied explicitly (for
// integrators like RK4 that provide their own accuracy, paired with damping
// coefficients small enough for their stability region).
// dampMatrix, when given with dt > 0, is a generalized damping matrix folded
// into the mass matrix the same way the diagonal `damping` vector is -- the
// linearly-implicit step (M + dt D) qdd = f, which is stable for a damping
// rate the explicit form could not touch. Its force is expected to be in `ext`
// already (unlike `damping`, whose force this function applies itself), so
// only the matrix is added here and the right-hand side is left alone.
export function forwardDynamics(model, q, qd, tauAct, ext, qdd, ws, damping = null, dt = 0,
  fkCurrent = false, dampMatrix = null) {
  const nq = model.nq;
  qdd.fill(0);
  rnea(model, q, qd, qdd, ws.bias, ext, { ws, fkCurrent });
  // rnea has just run fk on this q into this ws, so the mass matrix does not
  // need to run it again.
  crbaMassMatrix(model, q, ws.M, ws, true);
  ws.Mchol.set(ws.M);
  for (let i = 0; i < nq; i++) ws.rhs[i] = (tauAct ? tauAct[i] : 0) - ws.bias[i];
  if (damping) {
    for (let i = 0; i < nq; i++) {
      if (dt > 0) ws.Mchol[i * nq + i] += dt * damping[i];
      ws.rhs[i] -= damping[i] * qd[i];
    }
  }
  if (dampMatrix && dt > 0) {
    for (let i = 0; i < nq * nq; i++) ws.Mchol[i] += dt * dampMatrix[i];
  }
  choleskySolveInPlace(ws.Mchol, ws.rhs, nq);
  qdd.set(ws.rhs);
  return qdd;
}

export function energy(model, q, qd, ws) {
  fk(model, q, qd, ws);
  const { nb, mass, inertia } = model;
  const { vx, vy, om, rcx, rcy, py } = ws;
  let kinetic = 0, potential = 0;
  for (let i = 0; i < nb; i++) {
    const vcx = vx[i] - om[i] * rcy[i];
    const vcy = vy[i] + om[i] * rcx[i];
    kinetic += 0.5 * mass[i] * (vcx * vcx + vcy * vcy) + 0.5 * inertia[i] * om[i] * om[i];
    potential += mass[i] * model.gravity * (py[i] + rcy[i]);
  }
  return { kinetic, potential, total: kinetic + potential };
}

// Total CoM, CoM velocity, linear momentum, and spin angular momentum about
// the instantaneous CoM (the quantity conserved in free fall).
export function momenta(model, q, qd, ws) {
  fk(model, q, qd, ws);
  const { nb, mass, inertia } = model;
  const { px, py, vx, vy, om, rcx, rcy } = ws;
  let m = 0, X = 0, Y = 0, Px = 0, Py = 0;
  for (let i = 0; i < nb; i++) {
    const xc = px[i] + rcx[i], yc = py[i] + rcy[i];
    const vcx = vx[i] - om[i] * rcy[i], vcy = vy[i] + om[i] * rcx[i];
    m += mass[i];
    X += mass[i] * xc; Y += mass[i] * yc;
    Px += mass[i] * vcx; Py += mass[i] * vcy;
  }
  X /= m; Y /= m;
  const Vx = Px / m, Vy = Py / m;
  let L = 0;
  for (let i = 0; i < nb; i++) {
    const xc = px[i] + rcx[i], yc = py[i] + rcy[i];
    const vcx = vx[i] - om[i] * rcy[i], vcy = vy[i] + om[i] * rcx[i];
    L += inertia[i] * om[i] + mass[i] * cross(xc - X, yc - Y, vcx - Vx, vcy - Vy);
  }
  return { mass: m, comX: X, comY: Y, comVx: Vx, comVy: Vy, px: Px, py: Py, Lspin: L };
}
