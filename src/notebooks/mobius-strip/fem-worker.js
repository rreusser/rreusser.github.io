import { createMobiusMesh, energyAndGradient, lumpedMassDiagonal } from './mobius-fem.js';
import { newtonCG, lbfgs, bandedNewton } from './optimize.js';
import blas1 from './blas1.bundle.js';
import { computeFlexuralModes, computeFlexuralModesDense, computeFlexuralModesArpack, buildPermutation, fdHessianBanded, buildVertexAdjacency, stencilVertexBandwidth } from './modes.js';
import dsbgvx from './dsbgvx-bundle.js';
import dsygvx from './dsygvx.bundle.js';
import dsband from './dsband-bundle.js';
import dpbsv from './dpbsv-bundle.js';

let cancelled = false;

// The live continuous solve (created by handleRelax for the L-BFGS path).
// Dragging adds an optional pin to this same solve rather than running a
// separate one, so there is a single iteration mechanism for both.
let live = null;

// Yield to the event loop (so queued messages run) without the ~4ms clamp that
// browsers apply to nested setTimeout(0). A MessageChannel callback is a
// macrotask like setTimeout but is not throttled, so a long iterative solve
// yields between batches at full speed instead of being capped to ~250 yields/s.
const _yieldChannel = new MessageChannel();
let _yieldResolve = null;
_yieldChannel.port1.onmessage = () => { const r = _yieldResolve; _yieldResolve = null; if (r) r(); };
function yieldToEventLoop() {
  return new Promise((resolve) => { _yieldResolve = resolve; _yieldChannel.port2.postMessage(0); });
}

// Fill a SIZE×SIZE grid with '#' where the actual mesh connectivity has a
// structural nonzero (K[i,j] != 0 by structure) in the corresponding block.
// The coupling stencil is each vertex with its full Laplacian 1-ring, all
// pairs (covers the membrane triangles and the quadratic bending 2-ring).
// dofPerm maps original DOF -> reordered DOF; pass null for original ordering.
function sparsityGrid(model, dofPerm, n, SIZE) {
  const { off, nbr } = buildVertexAdjacency(model);
  const grid = new Uint8Array(SIZE * SIZE);
  const inv = n / SIZE;

  function mark(va, vb) {
    for (let da = 0; da < 3; da++) {
      const a = dofPerm ? dofPerm[va * 3 + da] : va * 3 + da;
      const r = Math.min(SIZE - 1, (a / inv) | 0);
      for (let db = 0; db < 3; db++) {
        const b = dofPerm ? dofPerm[vb * 3 + db] : vb * 3 + db;
        const c = Math.min(SIZE - 1, (b / inv) | 0);
        grid[r * SIZE + c] = 1;
        grid[c * SIZE + r] = 1;
      }
    }
  }

  for (let v = 0; v < model.Nv; v++) {
    mark(v, v);
    const s0 = off[v], s1 = off[v + 1];
    for (let s = s0; s < s1; s++) {
      mark(v, nbr[s]);
      for (let t = s + 1; t < s1; t++) mark(nbr[s], nbr[t]);
    }
  }
  return grid;
}

function logSparsityDiagram(model) {
  const n = 3 * model.Nv;
  const SIZE = 30;
  const { dofPerm, bw } = buildPermutation(model);

  // Original DOF ordering bandwidth
  const bwOrig = stencilVertexBandwidth(model, null) * 3 + 2;

  const gOrig = sparsityGrid(model, null,    n, SIZE);
  const gPerm = sparsityGrid(model, dofPerm, n, SIZE);

  const cell = (n / SIZE).toFixed(0);
  const labelOrig = `Original order (bw=${bwOrig})`;
  const labelPerm = `Interleaved order (bw=${bw})`;
  const pad = SIZE - labelOrig.length;
  let out = `K sparsity — n=${n}, ${SIZE}×${SIZE} grid, ~${cell} DOFs/cell\n`;
  out += labelOrig + ' '.repeat(Math.max(1, pad + 3)) + labelPerm + '\n';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) out += gOrig[r * SIZE + c] ? '#' : '.';
    out += '   ';
    for (let c = 0; c < SIZE; c++) out += gPerm[r * SIZE + c] ? '#' : '.';
    if (r < SIZE - 1) out += '\n';
  }
  console.log(out);
}

self.onmessage = async ({ data }) => {
  switch (data.type) {
    case 'cancel': cancelled = true; if (live) live.active = false; break;
    case 'relax': await handleRelax(data); break;
    case 'loadShape': await handleLoadShape(data); break;
    case 'computeModes': await handleComputeModes(data); break;
    // Interactive dragging: set / move / clear a pin on the live solve.
    case 'setPin':   if (live) live.pin = { v: data.v, target: Float64Array.from(data.target) }; break;
    case 'movePin':  if (live && live.pin) { live.pin.target[0] = data.target[0]; live.pin.target[1] = data.target[1]; live.pin.target[2] = data.target[2]; } break;
    case 'clearPin': if (live) live.pin = null; break;
  }
};

// Per-solver outer-iteration budgets. L-BFGS needs many cheap iterations;
// Newton-CG needs few expensive ones; banded-Newton assembles a banded Hessian
// each iteration, so its cap is the lowest.
const SOLVER_MAX_IT = {
  'lbfgs': 6000,
  'newton-cg': 400,
  'banded-newton': 200,
};

// L-BFGS history length. The default m=10 lets a fold freeze into a sharp
// kink; m=30 avoids that and gives a clean, adequate shape.
const LBFGS_MEMORY = 30;

// Convergence tolerance (||grad||_inf). Energy plateaus by ~1e-7 (below 1e-6 the
// surface looks visibly wavy), so 1e-7 is used across all solvers.
//
// L-BFGS is the default: it is much faster and its shape is adequate here. It
// settles at a slightly higher-energy critical point than the Newton solvers
// (which reach the true smooth minimum at higher cost); Newton-CG and
// banded-Newton remain available for comparison. See test/solvers.mjs.
const GRAD_TOL = 1e-7;

// One continuous solve with an optional pin -- the single iteration mechanism
// for both relaxing to equilibrium and interactive dragging. The same loop runs
// whether or not a vertex is pinned, and in every solver mode.
//
// It batches toward a snapshot of the current pin. While the pin is steady the
// batch converges; when the pin changes (grab / move / release) it restarts
// from the current shape; when it converges with NO pin it reports the
// equilibrium once and then idles, staying alive so a later grab just adds a pin
// to the same solve.
//
// The free (unpinned) equilibrium uses the selected solver. The pinned drag
// phase always uses L-BFGS.
//
// The pin is a HARD constraint, not a soft spring: the dragged vertex is placed
// exactly on the target and its three DOFs are frozen (their gradient zeroed),
// and the rest of the strip relaxes around it. This matters for three reasons:
//   * The vertex position is set directly, so it always tracks the cursor even
//     if the surrounding relaxation makes little progress -- the interaction no
//     longer depends on the optimizer converging.
//   * A stiff pin spring was badly conditioned and made L-BFGS crawl (~20x more
//     iterations, appearing stalled at a relative minimum); the hard pin is as
//     well conditioned as the free elastic problem.
//   * Freezing one vertex removes the rigid translation, so no (dense) centroid
//     penalty is needed. (Unpinned, translation is removed by centering the
//     streamed shape instead, so the free relax still reaches the true tol.)
async function runLive(L) {
  const { model, params, n, nVerts, gen, banded } = L;
  const elastic = (x, g) => energyAndGradient(model, x, params, g).energy;
  const pinnedFun = (x, g) => {
    const e = energyAndGradient(model, x, params, g).energy;
    const b = L.pinSnap.v * 3;
    g[b] = 0; g[b + 1] = 0; g[b + 2] = 0; // freeze the pinned vertex's DOFs
    return e;
  };
  const pinSteady = (snap) => {
    const cur = L.pin;
    if (!snap && !cur) return true;
    if (!snap || !cur) return false;
    return snap.v === cur.v && snap.target[0] === cur.target[0] && snap.target[1] === cur.target[1] && snap.target[2] === cur.target[2];
  };

  while (L.active && !cancelled) {
    L.pinSnap = L.pin ? { v: L.pin.v, target: Float64Array.from(L.pin.target) } : null;
    const pinned = !!L.pinSnap;
    // Paused: a freshly loaded initial shape (an elastic-rod / analytic guess)
    // is held, not iterated, so it stays exactly as shown until the user drags
    // a vertex or asks for a relax. A drag (pin) clears the pause and relaxes
    // around the pin; an explicit relax supersedes this solve entirely.
    if (L.paused && !pinned) {
      await new Promise(r => setTimeout(r, 16));
      continue;
    }
    if (pinned) L.paused = false;
    if (pinned) {
      // Place the frozen vertex exactly on the target; the batch holds it there.
      const b = L.pinSnap.v * 3;
      L.x[b] = L.pinSnap.target[0]; L.x[b + 1] = L.pinSnap.target[1]; L.x[b + 2] = L.pinSnap.target[2];
    }
    const fun = pinned ? pinnedFun : elastic;
    const useSolver = pinned ? 'lbfgs' : L.solver; // the drag phase is always L-BFGS

    // Time each solve batch from its own start, so "Equilibrium reached in N ms"
    // reports this relax's duration, not the age of the live solve (which may
    // have been created at page load or held idle through a long drag).
    L.t0 = performance.now();

    const onProgress = async ({ x: xi, iter, f, gInf, perm: isPerm }) => {
      L.lastIter = iter;
      const liveX = new Float32Array(n);
      if (isPerm && banded) {
        for (let i = 0; i < n; i++) { liveX[banded.invDofPerm[i]] = xi[i]; L.x[banded.invDofPerm[i]] = xi[i]; }
      } else {
        for (let i = 0; i < n; i++) { liveX[i] = xi[i]; L.x[i] = xi[i]; }
      }
      // The mesh is never recentered; it relaxes in place (the elastic energy is
      // translation-invariant, so the solve does not drift it). The viewer eases
      // its camera toward the mesh centroid instead.
      self.postMessage({ type: 'relaxProgress', gen, iter, f, gInf, maxIt: 2000, liveX: liveX.buffer }, [liveX.buffer]);
      // Non-clamped yield so queued pin/cancel messages run between batches.
      await yieldToEventLoop();
      if (!L.active || cancelled) throw 'stop';
      if (!pinSteady(L.pinSnap)) throw 'restart';
    };

    let converged = false;
    try {
      let res;
      // minIterations: 1 so a relax always makes real progress, even when the
      // shape already (nearly) satisfies the previous solver's tolerance -- e.g.
      // switching from L-BFGS to Newton-CG and re-relaxing genuinely iterates.
      if (useSolver === 'banded-newton') {
        res = await bandedNewton(fun, L.x, {
          maxIterations: SOLVER_MAX_IT['banded-newton'], gradTol: GRAD_TOL, minIterations: 1, yieldEvery: 1, onProgress,
          banded: { bw: banded.bw, dofPerm: banded.dofPerm, invDofPerm: banded.invDofPerm, fdHessianBanded, dpbsv },
        });
      } else if (useSolver === 'newton-cg') {
        res = await newtonCG(fun, L.x, {
          maxIterations: SOLVER_MAX_IT['newton-cg'], gradTol: GRAD_TOL, minIterations: 1, blas: blas1, yieldEvery: 1, onProgress,
        });
      } else {
        // L-BFGS settles along a long, soft bending valley where ||g||_inf drops
        // into tolerance long before the shape stops moving. Drive it by an energy
        // plateau instead (stop only once the energy stops decreasing), with a
        // very tight gradient fast-path, so it keeps relaxing until it is truly done.
        res = await lbfgs(fun, L.x, {
          maxIterations: 50000, gradTol: 1e-9, ftol: 1e-9, ftolWindow: 100, minIterations: 1,
          blas: blas1, m: LBFGS_MEMORY, yieldEvery: 10, onProgress,
        });
      }
      for (let i = 0; i < n; i++) L.x[i] = res.x[i]; // all solvers return original DOF order
      converged = true;
    } catch (e) {
      if (e === 'stop') break;
      // 'restart': the pin changed; re-loop with the new snapshot.
    }

    if (converged) {
      // Report "equilibrium reached" only with no pin (a true, free equilibrium).
      // A pinned solve can also converge -- e.g. at the grab, where the target is
      // still on the vertex -- but that is a constrained shape mid-drag.
      if (!L.pinSnap) {
        const g = new Float64Array(n);
        const e = energyAndGradient(model, L.x, params, g);
        let gInf = 0; for (const gg of g) gInf = Math.max(gInf, Math.abs(gg));
        const out = Float64Array.from(L.x);
        const ms = Math.round(performance.now() - L.t0);
        self.postMessage({
          type: 'relaxDone', gen, ms, X: out.buffer,
          converged: true, iterations: L.lastIter, gInf, solverUsed: L.solver,
          energy: e.energy, membrane: e.membrane, bending: e.bending,
          Nv: nVerts, nu: model.nu, nv: model.nv,
        }, [out.buffer]);
      }
      // Idle until the pin changes (grab / move / release) or we are cancelled,
      // staying alive so a later grab just adds a pin to this same solve.
      while (L.active && !cancelled && pinSteady(L.pinSnap)) {
        await new Promise(r => setTimeout(r, 16));
      }
    }
  }
}

async function handleRelax({ gen, params, length, width, nu, nv, X0Buf, solver = 'lbfgs' }) {
  cancelled = false;
  if (live) live.active = false; // a new solve supersedes any running live solve
  const t0 = performance.now();
  try {
    const model = createMobiusMesh({ length, width, nu, nv });
    const X0 = new Float64Array(X0Buf);
    // Banded-Newton solves in permuted DOF order; build the permutation once.
    let banded = null;
    if (solver === 'banded-newton') {
      const p = buildPermutation(model);
      banded = { bw: p.bw, dofPerm: p.dofPerm, invDofPerm: p.invDofPerm };
    }
    live = {
      model, params, x: X0.slice(), pin: null, active: true, gen,
      n: X0.length, nVerts: model.Nv, t0, lastIter: 0, solver, banded,
    };
    await runLive(live);
  } catch (err) {
    if (err.message === 'cancelled') {
      self.postMessage({ type: 'relaxCancelled', gen });
    } else {
      self.postMessage({ type: 'error', gen, message: String(err), stack: err.stack });
    }
  }
}

// Seed the live solve with a shape WITHOUT iterating it. The strip holds this
// shape (an initial guess shown on the main thread) until the user drags a
// vertex or asks for a relax, keeping the worker's copy of the shape in sync
// with what is displayed. Supersedes any running solve.
async function handleLoadShape({ gen, params, length, width, nu, nv, X0Buf, solver = 'lbfgs' }) {
  cancelled = false;
  if (live) live.active = false;
  try {
    const model = createMobiusMesh({ length, width, nu, nv });
    const X0 = new Float64Array(X0Buf);
    let banded = null;
    if (solver === 'banded-newton') {
      const p = buildPermutation(model);
      banded = { bw: p.bw, dofPerm: p.dofPerm, invDofPerm: p.invDofPerm };
    }
    live = {
      model, params, x: X0.slice(), pin: null, active: true, gen,
      n: X0.length, nVerts: model.Nv, t0: performance.now(), lastIter: 0, solver, banded,
      paused: true,
    };
    await runLive(live);
  } catch (err) {
    self.postMessage({ type: 'error', gen, message: String(err), stack: err.stack });
  }
}

async function handleComputeModes({ gen, modelParams, XBuf, opts }) {
  cancelled = false;
  try {
    const { length, width, nu, nv, params, solver } = modelParams;
    const model = createMobiusMesh({ length, width, nu, nv });
    logSparsityDiagram(model);
    const X = new Float64Array(XBuf);
    const massDiag = lumpedMassDiagonal(model, params);
    const gradFn = (x, g) => { energyAndGradient(model, x, params, g); };

    const onProgress = async (prog) => {
      self.postMessage({ type: 'modesProgress', gen, ...prog });
      await new Promise(r => setTimeout(r, 0));
      if (cancelled) throw new Error('cancelled');
    };

    const t0 = performance.now();
    let result;
    if (solver === 'dense') {
      result = await computeFlexuralModesDense(model, X, massDiag, gradFn, dsygvx, { ...opts, onProgress });
    } else if (solver === 'dsbgvx') {
      result = await computeFlexuralModes(model, X, massDiag, gradFn, dsbgvx, { ...opts, onProgress });
    } else {
      // Default banded path: ARPACK shift-invert (dsband).
      result = await computeFlexuralModesArpack(model, X, massDiag, gradFn, dsband, { ...opts, onProgress });
    }
    const ms = Math.round(performance.now() - t0);

    const serializedModes = result.modes.map(m => ({ lambda: m.lambda, omega: m.omega, shape: m.shape.buffer }));
    const transfers = serializedModes.map(m => m.shape);

    self.postMessage({
      type: 'modesDone', gen, ms,
      eigenvalues: Array.from(result.eigenvalues),
      frequencies: Array.from(result.frequencies),
      modes: serializedModes,
      rigidCount: result.rigidCount,
      bw: result.bw,
    }, transfers);
  } catch (err) {
    if (err.message === 'cancelled') {
      self.postMessage({ type: 'modesCancelled', gen });
    } else {
      self.postMessage({ type: 'error', gen, message: String(err), stack: err.stack });
    }
  }
}
