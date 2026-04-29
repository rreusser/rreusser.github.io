// Module worker hosting the Spectre metatile DAG, the view-driven
// walker, and tree-extension state. Receives view/palette/colorBlend
// updates from the main thread; posts back instance-buffer results
// (with the ArrayBuffer transferred). Only the *latest* pending view
// is processed: if the worker is busy when a new view arrives, the
// older one is dropped. This way the renderer always converges to the
// current view without a queue of stale walks piling up.
//
// The worker maintains its own copy of:
//   - the metatile DAG (built deterministically from constants)
//   - walkerState (currentRoot, currentRootTransform, extensionLevel)
//   - paletteState mirror, colorBlendState mirror
// The main thread keeps the renderer + GpuMesh cache. Group bucket
// keys are translated to `"subLevel:name"` strings so main can look
// up / build hexagon meshes without needing the DAG.

// ─── Spectre vertex data ────────────────────────────────────────────
const _SQ3_2 = Math.sqrt(3) / 2;
const spectreVertices = [
  [0,           0           ],
  [1,           0           ],
  [1.5,        -_SQ3_2      ],
  [1.5 + _SQ3_2, 0.5 - _SQ3_2],
  [1.5 + _SQ3_2, 1.5 - _SQ3_2],
  [2.5 + _SQ3_2, 1.5 - _SQ3_2],
  [3 + _SQ3_2,  1.5         ],
  [3,           2           ],
  [3 - _SQ3_2,  1.5         ],
  [2.5 - _SQ3_2, 1.5 + _SQ3_2],
  [1.5 - _SQ3_2, 1.5 + _SQ3_2],
  [0.5 - _SQ3_2, 1.5 + _SQ3_2],
  [-_SQ3_2,     1.5         ],
  [0,           1           ],
];
const QUAD_INDICES = [3, 5, 7, 11];
const baseQuad = QUAD_INDICES.map((i) => spectreVertices[i]);
const _spectreBoundRadius = (() => {
  let r = 0;
  for (const v of spectreVertices) {
    const d = Math.hypot(v[0], v[1]);
    if (d > r) r = d;
  }
  return r;
})();

// ─── Transform math (rotation in 30° steps + optional mirror + translate) ──
const _COS = new Float64Array(12);
const _SIN = new Float64Array(12);
for (let k = 0; k < 12; k++) {
  _COS[k] = Math.cos(k * Math.PI / 6);
  _SIN[k] = Math.sin(k * Math.PI / 6);
}
const txIdentity = { rot: 0, mirror: 0, t: [0, 0] };

function txApply(T, p) {
  const x = p[0];
  const y = T.mirror ? -p[1] : p[1];
  const c = _COS[T.rot], s = _SIN[T.rot];
  return [c * x - s * y + T.t[0], s * x + c * y + T.t[1]];
}
function txApplyLinear(T, p) {
  const x = p[0];
  const y = T.mirror ? -p[1] : p[1];
  const c = _COS[T.rot], s = _SIN[T.rot];
  return [c * x - s * y, s * x + c * y];
}
function txCompose(T1, T2) {
  const sign = T1.mirror ? -1 : 1;
  const rot = (((T1.rot + sign * T2.rot) % 12) + 12) % 12;
  const mirror = (T1.mirror ^ T2.mirror);
  const lin = txApplyLinear(T1, T2.t);
  return { rot, mirror, t: [lin[0] + T1.t[0], lin[1] + T1.t[1]] };
}
function txTranslate(t) { return { rot: 0, mirror: 0, t }; }
function txRotate(k) { return { rot: ((k % 12) + 12) % 12, mirror: 0, t: [0, 0] }; }
function txInverse(T) {
  if (T.mirror) {
    const c = _COS[T.rot], s = _SIN[T.rot];
    const tx = T.t[0], ty = -T.t[1];
    const rx = c * tx - s * ty;
    const ry = s * tx + c * ty;
    return { rot: T.rot, mirror: 1, t: [-rx, -ry] };
  } else {
    const invRot = ((-T.rot % 12) + 12) % 12;
    const ic = _COS[invRot], is = _SIN[invRot];
    const rx = ic * T.t[0] - is * T.t[1];
    const ry = is * T.t[0] + ic * T.t[1];
    return { rot: invRot, mirror: 0, t: [-rx, -ry] };
  }
}

// ─── Substitution data ──────────────────────────────────────────────
const TILE_NAMES = ["Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Phi", "Psi"];

const transformationRules = [
  [ 2, 3, 1],
  [ 0, 2, 0],
  [ 2, 3, 1],
  [ 2, 3, 1],
  [ 0, 2, 0],
  [ 2, 3, 1],
  [-4, 3, 3],
];

const superRules = {
  Gamma:  ["Pi",  "Delta", null,  "Theta", "Sigma", "Xi",  "Phi",    "Gamma"],
  Delta:  ["Xi",  "Delta", "Xi",  "Phi",   "Sigma", "Pi",  "Phi",    "Gamma"],
  Theta:  ["Psi", "Delta", "Pi",  "Phi",   "Sigma", "Pi",  "Phi",    "Gamma"],
  Lambda: ["Psi", "Delta", "Xi",  "Phi",   "Sigma", "Pi",  "Phi",    "Gamma"],
  Xi:     ["Psi", "Delta", "Pi",  "Phi",   "Sigma", "Psi", "Phi",    "Gamma"],
  Pi:     ["Psi", "Delta", "Xi",  "Phi",   "Sigma", "Psi", "Phi",    "Gamma"],
  Sigma:  ["Xi",  "Delta", "Xi",  "Phi",   "Sigma", "Pi",  "Lambda", "Gamma"],
  Phi:    ["Psi", "Delta", "Psi", "Phi",   "Sigma", "Pi",  "Phi",    "Gamma"],
  Psi:    ["Psi", "Delta", "Psi", "Phi",   "Sigma", "Psi", "Phi",    "Gamma"],
};

// ─── DAG construction ───────────────────────────────────────────────
function buildSpectreBase() {
  const cluster = {};
  for (const label of TILE_NAMES) {
    if (label !== "Gamma") {
      cluster[label] = { kind: "leaf", label, quad: baseQuad };
    }
  }
  cluster.Gamma = {
    kind: "meta",
    name: "Gamma",
    quad: baseQuad,
    geometries: [
      { child: { kind: "leaf", label: "Gamma1", quad: baseQuad }, transform: txIdentity },
      { child: { kind: "leaf", label: "Gamma2", quad: baseQuad },
        transform: txCompose(txTranslate(spectreVertices[8]), txRotate(1)) },
    ],
  };
  return cluster;
}

function buildSupertiles(prev) {
  const quad = prev.Delta.quad;
  const transformations = [txIdentity];
  let totalRot = 0;
  let rotation = txIdentity;
  let rotatedQuad = quad;
  for (const [deltaRot, fromIdx, toIdx] of transformationRules) {
    if (deltaRot !== 0) {
      totalRot = (((totalRot + deltaRot) % 12) + 12) % 12;
      rotation = txRotate(totalRot);
      rotatedQuad = quad.map((p) => txApplyLinear(rotation, p));
    }
    const target = txApply(transformations[transformations.length - 1], quad[fromIdx]);
    const source = rotatedQuad[toIdx];
    const delta = [target[0] - source[0], target[1] - source[1]];
    transformations.push({ rot: rotation.rot, mirror: 0, t: delta });
  }
  const R = { rot: 6, mirror: 1, t: [0, 0] };
  const finalTransforms = transformations.map((T) => txCompose(R, T));
  const superQuad = [
    txApply(finalTransforms[6], quad[2]),
    txApply(finalTransforms[5], quad[1]),
    txApply(finalTransforms[3], quad[2]),
    txApply(finalTransforms[0], quad[1]),
  ];
  const next = {};
  for (const label of TILE_NAMES) {
    const subs = superRules[label];
    const geometries = [];
    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i];
      if (sub === null) continue;
      geometries.push({ child: prev[sub], transform: finalTransforms[i] });
    }
    next[label] = { kind: "meta", name: label, quad: superQuad, geometries };
  }
  return next;
}

function countLeaves(mt) {
  if (mt.kind === "leaf") return 1;
  let n = 0;
  for (const { child } of mt.geometries) n += countLeaves(child);
  return n;
}

// ─── Attach cached metrics (memoized via marker fields) ──────────────
function attachRadii(mt) {
  if (mt._localRadius != null) return mt._localRadius;
  if (mt.kind === "leaf") { mt._localRadius = _spectreBoundRadius; return _spectreBoundRadius; }
  let r = 0;
  for (const { child, transform } of mt.geometries) {
    const cr = attachRadii(child);
    const d = Math.hypot(transform.t[0], transform.t[1]);
    if (d + cr > r) r = d + cr;
  }
  mt._localRadius = r;
  return r;
}

function attachCentroidBounds(mt) {
  if (mt._cBound != null) return;
  if (mt.kind === "leaf") {
    let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
    for (const v of spectreVertices) {
      if (v[0] < mnx) mnx = v[0]; if (v[0] > mxx) mxx = v[0];
      if (v[1] < mny) mny = v[1]; if (v[1] > mxy) mxy = v[1];
    }
    const cx = (mnx + mxx) / 2, cy = (mny + mxy) / 2;
    let r = 0;
    for (const v of spectreVertices) {
      const d = Math.hypot(v[0] - cx, v[1] - cy);
      if (d > r) r = d;
    }
    mt._cCx = cx; mt._cCy = cy; mt._cBound = r;
    return;
  }
  const childCx = [], childCy = [], childCr = [];
  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
  for (const { child, transform } of mt.geometries) {
    attachCentroidBounds(child);
    let lcx = child._cCx;
    let lcy = child._cCy;
    const lcr = child._cBound;
    if (transform.mirror) lcy = -lcy;
    const cs = _COS[transform.rot], sn = _SIN[transform.rot];
    const cx = cs * lcx - sn * lcy + transform.t[0];
    const cy = sn * lcx + cs * lcy + transform.t[1];
    childCx.push(cx); childCy.push(cy); childCr.push(lcr);
    if (cx - lcr < mnx) mnx = cx - lcr;
    if (cx + lcr > mxx) mxx = cx + lcr;
    if (cy - lcr < mny) mny = cy - lcr;
    if (cy + lcr > mxy) mxy = cy + lcr;
  }
  const cx = (mnx + mxx) / 2, cy = (mny + mxy) / 2;
  let r = 0;
  for (let i = 0; i < childCx.length; i++) {
    const d = Math.hypot(childCx[i] - cx, childCy[i] - cy) + childCr[i];
    if (d > r) r = d;
  }
  mt._cCx = cx; mt._cCy = cy; mt._cBound = r;
}

function attachSubLevels(mt) {
  if (mt._subLevel != null) return mt._subLevel;
  if (mt.kind === "leaf") { mt._subLevel = 0; return 0; }
  let maxL = 0;
  for (const { child } of mt.geometries) {
    const cl = attachSubLevels(child);
    if (cl > maxL) maxL = cl;
  }
  mt._subLevel = maxL + 1;
  return maxL + 1;
}

// Per-metatile colour log-scale: how many factors of `_INFLATION`
// the cell's bounding radius is bigger than a single leaf's. Used
// in place of the integer `_subLevel` for the colour-blend kernel
// — _subLevel is structural (Γ at sub-level 1 is the mystic two-
// leaf meta), but Γ's actual visual scale is ~0.43, not 1, because
// two overlapping leaves only marginally exceed one leaf's radius.
// Float-indexed kernel evaluation places Γ closer to its true
// visual scale, so the blend doesn't artificially treat it as a
// full level above its leaf neighbours.
// Inflation factor matches `_INFLATION` defined later in the walker
// section. Hardcoded here because attachColorLogScale runs at
// module-init time, before that const is bound.
const _LOG_INFLATION = Math.log(2.5);
function attachColorLogScale(mt) {
  if (mt._colorLogScale != null) return;
  mt._colorLogScale = Math.log(mt._localRadius / _spectreBoundRadius) / _LOG_INFLATION;
  if (mt.kind === "meta") {
    for (const { child } of mt.geometries) attachColorLogScale(child);
  }
}

// ─── Initial DAG and walker state ───────────────────────────────────
const BASE_DEPTH = 4;
const baseCluster = (() => {
  let c = buildSpectreBase();
  for (let i = 0; i < BASE_DEPTH; i++) c = buildSupertiles(c);
  return c;
})();
const rootMeta = baseCluster.Delta;
attachRadii(rootMeta);
attachSubLevels(rootMeta);
attachCentroidBounds(rootMeta);
attachColorLogScale(rootMeta);

const walkerState = {
  currentRoot: baseCluster.Delta,
  currentRootTransform: txIdentity,
  currentBaseRecord: baseCluster,
  extensionLevel: 0,
};

// rootBounds for the main thread's initial fit. Computed by walking
// every leaf in the unextended root cluster and unioning leaf-position
// bounding boxes (padded by _spectreBoundRadius in the leaf's local
// frame, which is rotation-invariant).
const rootBounds = (() => {
  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
  const STK = BASE_DEPTH + 4;
  const stRot = new Uint8Array(STK);
  const stMir = new Uint8Array(STK);
  const stTx = new Float64Array(STK);
  const stTy = new Float64Array(STK);
  function recurse(mt, d) {
    if (mt.kind === "leaf") {
      const tx = stTx[d], ty = stTy[d];
      const m = _spectreBoundRadius;
      if (tx - m < mnx) mnx = tx - m;
      if (tx + m > mxx) mxx = tx + m;
      if (ty - m < mny) mny = ty - m;
      if (ty + m > mxy) mxy = ty + m;
      return;
    }
    const pRot = stRot[d], pMir = stMir[d];
    const pTx = stTx[d], pTy = stTy[d];
    const pc = _COS[pRot], ps = _SIN[pRot];
    const d1 = d + 1;
    for (const { child, transform: T2 } of mt.geometries) {
      let cx = T2.t[0], cy = T2.t[1];
      if (pMir) cy = -cy;
      stTx[d1] = pc * cx - ps * cy + pTx;
      stTy[d1] = ps * cx + pc * cy + pTy;
      const rDiff = pMir ? -T2.rot : T2.rot;
      stRot[d1] = (pRot + rDiff + 12) % 12;
      stMir[d1] = (pMir ^ T2.mirror);
      recurse(child, d1);
    }
  }
  stRot[0] = 0; stMir[0] = 0; stTx[0] = 0; stTy[0] = 0;
  recurse(rootMeta, 0);
  return { minX: mnx, minY: mny, maxX: mxx, maxY: mxy };
})();

// ─── Tree extension ────────────────────────────────────────────────
const _PARENT_OPTIONS = (() => {
  const out = {};
  for (const t of TILE_NAMES) out[t] = [];
  for (const parent of TILE_NAMES) {
    const subs = superRules[parent];
    for (let slot = 0; slot < subs.length; slot++) {
      const c = subs[slot];
      if (c !== null) out[c].push([parent, slot]);
    }
  }
  return out;
})();

function extendRootUpward() {
  const nextRecord = buildSupertiles(walkerState.currentBaseRecord);
  const root = walkerState.currentRoot;
  if (root.kind !== 'meta') throw new Error('root must be a meta tile');
  const currentType = root.name;
  const opts = _PARENT_OPTIONS[currentType];
  const [parentType, slot] = opts[walkerState.extensionLevel % opts.length];
  const newRoot = nextRecord[parentType];
  attachRadii(newRoot);
  attachSubLevels(newRoot);
  attachCentroidBounds(newRoot);
  attachColorLogScale(newRoot);
  const subs = superRules[parentType];
  let geomIdx = 0;
  for (let s = 0; s < slot; s++) if (subs[s] !== null) geomIdx++;
  const slot1Transform = newRoot.geometries[geomIdx].transform;
  walkerState.currentRootTransform = txCompose(
    walkerState.currentRootTransform,
    txInverse(slot1Transform),
  );
  walkerState.currentRoot = newRoot;
  walkerState.currentBaseRecord = nextRecord;
  walkerState.extensionLevel += 1;
}

function maybeExtend(view) {
  let safety = 64;
  while (safety-- > 0) {
    const root = walkerState.currentRoot;
    const T = walkerState.currentRootTransform;
    const lcx = root._cCx;
    const lcy = root._cCy;
    const localY = T.mirror ? -lcy : lcy;
    const c = _COS[T.rot], s = _SIN[T.rot];
    const cwx = c * lcx - s * localY + T.t[0];
    const cwy = s * lcx + c * localY + T.t[1];
    const cBound = root._cBound;
    const halfW = view.pixelWidth / (2 * view.pixelScale);
    const halfH = view.pixelHeight / (2 * view.pixelScale);
    const padW = (view.cullPadPx ?? 0) / view.pixelScale;
    const dx = Math.abs(view.centerX - cwx) + halfW + padW;
    const dy = Math.abs(view.centerY - cwy) + halfH + padW;
    const distToCorner = Math.hypot(dx, dy);
    // Threshold of 0.3 × cBound: requires the viewport corners to
    // sit well inside the cluster's CENTROID-bounded circle, with
    // generous safety margin against the cluster's worst-direction
    // FILLED extent (~0.6–0.7 × cBound for a Spectre supertile).
    // Each iteration extends the root upward; the cluster's cBound
    // grows by ~_INFLATION × (≈2.5×) per extension, and each
    // extension is O(1), so a tighter threshold just means one or
    // two more extensions for a typical view — well worth it to
    // eliminate the "blank wedge" on the side of the viewport when
    // the user pans away from the cluster's centroid.
    if (distToCorner <= 0.3 * cBound) return;
    extendRootUpward();
  }
}

// ─── Find-distant-match (DAG-driven view search) ───────────────────
// Mulberry32-style seeded RNG. Used to randomly descend into the DAG
// looking for a leaf whose K-suffix matches the source — a stable
// seed (derived from the source coords) keeps results reproducible
// across button presses on the same view.
function _makeSeededRng(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _findLeafNear(targetX, targetY) {
  let mt = walkerState.currentRoot;
  let tx = walkerState.currentRootTransform;
  if (mt.kind !== 'meta') return null;
  const path = [];
  const types = [mt.name];
  const rots = [tx.rot];
  const mirs = [tx.mirror];
  while (mt.kind === 'meta') {
    let bestI = -1, bestD = Infinity;
    for (let i = 0; i < mt.geometries.length; i++) {
      const geom = mt.geometries[i];
      const child = geom.child;
      const childTx = txCompose(tx, geom.transform);
      const cx = child._cCx ?? 0;
      const cy = child._cCy ?? 0;
      const wc = txApply(childTx, [cx, cy]);
      const d = Math.hypot(wc[0] - targetX, wc[1] - targetY);
      if (d < bestD) { bestD = d; bestI = i; }
    }
    if (bestI < 0) break;
    path.push(bestI);
    const geom = mt.geometries[bestI];
    tx = txCompose(tx, geom.transform);
    mt = geom.child;
    if (mt.kind === 'meta') {
      types.push(mt.name);
      rots.push(tx.rot);
      mirs.push(tx.mirror);
    }
  }
  const lcx = mt._cCx ?? 0;
  const lcy = mt._cCy ?? 0;
  const wc = txApply(tx, [lcx, lcy]);
  return { path, types, rots, mirs, leafCx: wc[0], leafCy: wc[1] };
}

function _findMatchingLeaf(args) {
  const root = walkerState.currentRoot;
  const rootTransform = walkerState.currentRootTransform;
  if (root.kind !== 'meta') return null;
  const rootSubLevel = root._subLevel;
  const stepsToParent = rootSubLevel - args.parentSubLevel;
  if (stepsToParent < 0) return null;
  const seed = ((Math.floor(args.sourceX) ^ Math.floor(args.sourceY)) >>> 0) || 1;
  const rng = _makeSeededRng(seed);
  // 1M default. The random search succeeds at probability roughly
  // (1 / 8^stepsToParent) × suffix/rotation match fraction, so when
  // stepsToParent ≥ 5 a few hundred-thousand attempts are usually
  // enough; deeper searches need more headroom. Worst-case 1M
  // attempts is ~50 ms on the worker — short enough that a UI block
  // is acceptable for an explicit user click.
  const max = args.maxAttempts ?? 1000000;
  for (let attempt = 0; attempt < max; attempt++) {
    let mt = root;
    let tx = rootTransform;
    let ok = true;
    for (let d = 0; d < stepsToParent; d++) {
      if (mt.kind !== 'meta') { ok = false; break; }
      const i = Math.floor(rng() * mt.geometries.length);
      const geom = mt.geometries[i];
      tx = txCompose(tx, geom.transform);
      mt = geom.child;
    }
    if (!ok || mt.kind !== 'meta' || mt.name !== args.parentType) continue;
    if (tx.rot !== args.parentRot || tx.mirror !== args.parentMir) continue;
    let suffOk = true;
    for (const i of args.suffix) {
      if (mt.kind !== 'meta' || i >= mt.geometries.length) { suffOk = false; break; }
      const geom = mt.geometries[i];
      tx = txCompose(tx, geom.transform);
      mt = geom.child;
    }
    if (!suffOk || mt.kind !== 'leaf') continue;
    const lcx = mt._cCx ?? 0;
    const lcy = mt._cCy ?? 0;
    const c = txApply(tx, [lcx, lcy]);
    const dx = c[0] - args.sourceX, dy = c[1] - args.sourceY;
    if (Math.hypot(dx, dy) < args.minDistance) continue;
    return { centerX: c[0], centerY: c[1], attempts: attempt + 1 };
  }
  return null;
}

// ─── Color state (mirrored from main thread) ────────────────────────
const paletteState = {
  rgb: {},
};
function colorForLevelType(_level, label) {
  return paletteState.rgb[label]
      ?? paletteState.rgb[_typeForLabel(label)]
      ?? [0.5, 0.5, 0.5];
}
function _typeForLabel(label) {
  if (label === "Gamma1" || label === "Gamma2") return "Gamma";
  return label;
}
const colorBlendState = { sigma: 4.0, offset: 0.0 };

// ─── Walker ─────────────────────────────────────────────────────────
const AGG_PX = 25;
const _LOOSE_RADIUS_FACTOR = 1.55;
const _INFLATION = 2.5;
const _LEVEL0_PIXEL_SCALE = AGG_PX / (2 * _spectreBoundRadius);
function viewLevelFor(pixelScale) {
  if (pixelScale <= 0) return 0;
  return -Math.log(pixelScale / _LEVEL0_PIXEL_SCALE) / Math.log(_INFLATION);
}

function _newBucket(key, initCap) {
  const capacity = Math.max(16, initCap);
  const data = new ArrayBuffer(capacity * 16);
  return {
    key,
    data,
    f32: new Float32Array(data),
    i16: new Int16Array(data),
    u8: new Uint8Array(data),
    count: 0,
    capacity,
  };
}

function _growBucket(b, needed) {
  if (needed <= b.capacity) return;
  const newCap = Math.max(needed, b.capacity * 2);
  const newData = new ArrayBuffer(newCap * 16);
  new Uint8Array(newData).set(b.u8.subarray(0, b.count * 16));
  b.data = newData;
  b.f32 = new Float32Array(newData);
  b.i16 = new Int16Array(newData);
  b.u8 = new Uint8Array(newData);
  b.capacity = newCap;
}

function makeWalker(initialLeafCap) {
  const STK = 64;
  const stRot = new Uint8Array(STK);
  const stMir = new Uint8Array(STK);
  const stTx = new Float64Array(STK);
  const stTy = new Float64Array(STK);
  const stColR = new Float64Array(STK);
  const stColG = new Float64Array(STK);
  const stColB = new Float64Array(STK);
  // Float colour log-scales pushed onto the ancestor stack. Replaces
  // the old integer subLevel stack (`stSubL`) for kernel evaluation
  // — Γ at sub-level 1 is at colour log-scale ~0.43, not 1.
  const stColLogScale = new Float64Array(STK);
  let ancDepth = 0;
  let vMnX = -Infinity, vMxX = Infinity, vMnY = -Infinity, vMxY = Infinity;
  let pixelScale = 1;
  let aggPixelScale = 1;
  let viewLevel = 0;
  // Pre-walk-computed thresholds in `r`-space (mt._localRadius units).
  // We compare `r` directly against these instead of computing
  // `pixelExtent = 2 * r * aggPixelScale` per cell — saves a
  // multiply on the hottest line in the walker.
  let aggThreshR = Infinity, upperFadeR = Infinity, lowerFadeR = Infinity;
  let aggThreshHysteresis = Infinity; // = upperFadeR - aggThreshR, precomputed
  let lowerFadeHysteresis = Infinity; // = aggThreshR - lowerFadeR
  // Per-walk colour-kernel parameters: Gaussian centred on
  // `viewLevel + colorBlendState.offset` in log-scale space, with
  // stddev = colorBlendState.sigma. weight(L) = exp((L − kCenter)² *
  // _negInvTwoSigSq). Set in walk() before each recurse pass.
  let _kCenter = 0;
  let _negInvTwoSigSq = -1 / 32;  // = -1/(2σ²) for σ = 4
  const pathStack = new Uint8Array(STK);
  const buckets = new Map();
  buckets.set(null, _newBucket(null, initialLeafCap));
  // Last-bucket cache. `emit` is the hottest function and Map.get is
  // ~3x slower than a single identity check; consecutive emits are
  // overwhelmingly to the same bucket (same metatile via DAG sharing,
  // or the leaf bucket repeating across siblings), so this saves a
  // Map lookup on the vast majority of calls.
  let _lastBucket = buckets.get(null);
  let _lastBucketKey = null;

  function emit(bucketKey, cellCol, d, cellColorLogScale, alpha) {
    if (alpha <= 0) return;
    let b;
    if (bucketKey === _lastBucketKey) {
      b = _lastBucket;
    } else {
      b = buckets.get(bucketKey);
      if (!b) { b = _newBucket(bucketKey, 64); buckets.set(bucketKey, b); }
      _lastBucketKey = bucketKey;
      _lastBucket = b;
    }
    if (b.count >= b.capacity) _growBucket(b, b.count + 1);
    const i = b.count;
    const off = i * 16;
    b.f32[i * 4 + 0] = stTx[d];
    b.f32[i * 4 + 1] = stTy[d];
    // _COS/_SIN are exact 30°-multiple values in [-1, 1], so c*32767
    // is in [-32767, 32767] with no overflow risk — drop the clamps.
    // Math.round handles the negative-half rounding correctly.
    const rot = stRot[d];
    b.i16[i * 8 + 4] = Math.round(_COS[rot] * 32767);
    b.i16[i * 8 + 5] = Math.round(_SIN[rot] * 32767);

    // Multi-level Gaussian blend over ABSOLUTE colour log-scales.
    // Each cell emits with weight exp((Lcell − kCenter)² *
    // negInvTwoSigSq), and each ancestor at log-scale Lanc
    // contributes with the same kernel evaluated at Lanc. Both the
    // cell's and the ancestors' log-scales are mt._colorLogScale —
    // the cluster's true visual size relative to a leaf, not its
    // structural _subLevel. So Γ at log-scale ~0.43 sits between
    // its leaf neighbours (log-scale 0) and its parents (log-scale
    // 1), instead of being lumped with the latter.
    //
    // The kernel centre is `viewLevel + offset`, anchored to
    // pixelScale only — so changing the agg-px threshold (which
    // moves WHICH cells emit, not which log-scales exist) has no
    // effect on the rendered colour at any world position.
    let dl = cellColorLogScale - _kCenter;
    let w = Math.exp(dl * dl * _negInvTwoSigSq);
    let total = w, R = w * cellCol[0], G = w * cellCol[1], B = w * cellCol[2];
    for (let k = 0; k < ancDepth; k++) {
      dl = stColLogScale[k] - _kCenter;
      w = Math.exp(dl * dl * _negInvTwoSigSq);
      total += w;
      R += w * stColR[k]; G += w * stColG[k]; B += w * stColB[k];
    }
    const inv = 1 / total;
    const normR = R * inv, normG = G * inv, normB = B * inv;

    // Color quantisation: clamp in case rounding pushes values
    // slightly past [0, 1].
    const a127 = Math.round(alpha * 127);
    let qR = (normR * 255 + 0.5) | 0; if (qR < 0) qR = 0; else if (qR > 255) qR = 255;
    let qG = (normG * 255 + 0.5) | 0; if (qG < 0) qG = 0; else if (qG > 255) qG = 255;
    let qB = (normB * 255 + 0.5) | 0; if (qB < 0) qB = 0; else if (qB > 255) qB = 255;
    b.u8[off + 12] = qR;
    b.u8[off + 13] = qG;
    b.u8[off + 14] = qB;
    b.u8[off + 15] = (stMir[d] ? 128 : 0) | (a127 < 0 ? 0 : a127 > 127 ? 127 : a127);
    b.count = i + 1;
  }

  function recurse(mt, d, alphaIn, allowFadeOut) {
    if (alphaIn <= 0) return;
    const r = mt._localRadius;
    const cx = stTx[d], cy = stTy[d];
    if (cx + r < vMnX || cx - r > vMxX || cy + r < vMnY || cy - r > vMxY) return;
    if (mt.kind === "leaf") {
      const leafCol = colorForLevelType(0, mt.label);
      // Leaves are by construction at colour log-scale 0
      // (_localRadius == _spectreBoundRadius).
      emit(null, leafCol, d, 0, alphaIn);
      return;
    }

    const myCls = mt._colorLogScale;
    const myCol = colorForLevelType(mt._subLevel, mt.name);

    // Branch on `r` thresholds (precomputed once per walk) instead of
    // recomputing pixelExtent per cell. Three regimes:
    //   r < lowerFadeR : full aggregate, no children.
    //   r < aggThreshR : full aggregate + fading-out children.
    //   r < upperFadeR : fading-in parent + full-alpha children.
    //   r ≥ upperFadeR : no parent, full-alpha children only.
    if (r < aggThreshR) {
      // Full aggregate emit.
      emit(mt, myCol, d, myCls, alphaIn);
      // Below lowerFadeR: no children at all.
      if (r < lowerFadeR || !allowFadeOut) return;
      // Fade-out children band.
      const u = (r - lowerFadeR) / lowerFadeHysteresis;
      const childAlpha = alphaIn * (u * u * (3 - 2 * u));
      stColR[ancDepth] = myCol[0];
      stColG[ancDepth] = myCol[1];
      stColB[ancDepth] = myCol[2];
      stColLogScale[ancDepth] = myCls;
      ancDepth++;
      _recurseChildren(mt, d, childAlpha, false);
      ancDepth--;
      return;
    }

    if (r < upperFadeR) {
      // Fading-in parent + full-alpha children.
      const u = (upperFadeR - r) / aggThreshHysteresis;
      const parentFactor = u * u * (3 - 2 * u);
      emit(mt, myCol, d, myCls, alphaIn * parentFactor);
    }

    // Full-detail children.
    stColR[ancDepth] = myCol[0];
    stColG[ancDepth] = myCol[1];
    stColB[ancDepth] = myCol[2];
    stColLogScale[ancDepth] = myCls;
    ancDepth++;
    _recurseChildren(mt, d, alphaIn, allowFadeOut);
    ancDepth--;
  }

  function _recurseChildren(mt, d, childAlpha, childAllowFadeOut) {
    const pRot = stRot[d], pMir = stMir[d];
    const pTx = stTx[d], pTy = stTy[d];
    const pc = _COS[pRot], ps = _SIN[pRot];
    const d1 = d + 1;
    const geoms = mt.geometries;
    const n = geoms.length;
    for (let gi = 0; gi < n; gi++) {
      const g = geoms[gi];
      const T2 = g.transform;
      let ccx = T2.t[0], ccy = T2.t[1];
      if (pMir) ccy = -ccy;
      stTx[d1] = pc * ccx - ps * ccy + pTx;
      stTy[d1] = ps * ccx + pc * ccy + pTy;
      const rDiff = pMir ? -T2.rot : T2.rot;
      stRot[d1] = (pRot + rDiff + 12) % 12;
      stMir[d1] = (pMir ^ T2.mirror);
      pathStack[d1] = gi;
      recurse(g.child, d1, childAlpha, childAllowFadeOut);
    }
  }

  return function walk(rootMetaArg, rootTransform, view) {
    const halfW = view.pixelWidth / (2 * view.pixelScale);
    const halfH = view.pixelHeight / (2 * view.pixelScale);
    const m = _spectreBoundRadius;
    const padPx = view.cullPadPx ?? 0;
    const padWorld = padPx / view.pixelScale;
    vMnX = -halfW - m - padWorld;
    vMxX = halfW + m + padWorld;
    vMnY = -halfH - m - padWorld;
    vMxY = halfH + m + padWorld;
    pixelScale = view.pixelScale;
    aggPixelScale = view.aggPixelScale ?? view.pixelScale;
    viewLevel = viewLevelFor(aggPixelScale);
    // Per-view aggregation threshold (px). Defaults to AGG_PX; main
    // sends a smaller value for high-quality renders or a larger
    // value for fast preview.
    const aggPx = view.aggPx ?? AGG_PX;
    // Precompute per-walk r-thresholds so recurse() can compare
    // mt._localRadius directly without recomputing pixelExtent.
    const aggThresh = aggPx * _LOOSE_RADIUS_FACTOR;
    const upperFadeBound = aggThresh * 1.5;
    const lowerFadeBound = aggThresh / 3;
    const inv2agg = 1 / (2 * aggPixelScale);
    aggThreshR  = aggThresh      * inv2agg;
    upperFadeR  = upperFadeBound * inv2agg;
    lowerFadeR  = lowerFadeBound * inv2agg;
    aggThreshHysteresis = upperFadeR - aggThreshR;
    lowerFadeHysteresis = aggThreshR - lowerFadeR;
    const _sigma = colorBlendState.sigma;
    // Kernel parameters captured into closure-level vars so emit()
    // can evaluate exp(dl² * negInvTwoSigSq) inline without per-call
    // closure access to colorBlendState. Centre is anchored to
    // viewLevel + offset; sigma sets the kernel width in log-scale
    // space. Eliminating the integer-indexed weightTable lets the
    // cell and ancestor log-scales be float-valued (Γ at ~0.43,
    // etc.).
    _kCenter = viewLevel + colorBlendState.offset;
    _negInvTwoSigSq = -1 / (2 * _sigma * _sigma);
    ancDepth = 0;
    _lastBucketKey = -1; // sentinel: no bucket cached for this walk
    _lastBucket = null;

    for (const b of buckets.values()) b.count = 0;

    stRot[0] = rootTransform.rot;
    stMir[0] = rootTransform.mirror;
    stTx[0] = rootTransform.t[0] - view.centerX;
    stTy[0] = rootTransform.t[1] - view.centerY;
    recurse(rootMetaArg, 0, 1.0, true);

    let totalCount = 0;
    for (const b of buckets.values()) totalCount += b.count;
    // Fresh ArrayBuffer per walk so the result can be transferred to
    // main without invalidating worker-internal state.
    const outData = new ArrayBuffer(Math.max(1, totalCount) * 16);
    const outU8 = new Uint8Array(outData);
    const groups = [];
    let off = 0;
    const aggBuckets = [];
    for (const b of buckets.values()) {
      if (b.key === null) continue;
      if (b.count === 0) continue;
      aggBuckets.push(b);
    }
    aggBuckets.sort((a, b) => (b.key._subLevel ?? 0) - (a.key._subLevel ?? 0));
    for (const b of aggBuckets) {
      outU8.set(b.u8.subarray(0, b.count * 16), off * 16);
      groups.push({ bucket: b, instanceOffset: off, instanceCount: b.count });
      off += b.count;
    }
    const leafBucket = buckets.get(null);
    if (leafBucket.count > 0) {
      outU8.set(leafBucket.u8.subarray(0, leafBucket.count * 16), off * 16);
      groups.push({ bucket: leafBucket, instanceOffset: off, instanceCount: leafBucket.count });
      off += leafBucket.count;
    }
    return { data: outData, totalCount, groups };
  };
}

const walker = makeWalker(countLeaves(rootMeta));

// ─── Message protocol ──────────────────────────────────────────────
//
// Concurrency model. The worker is single-threaded, so at most one
// walk runs at a time. Each `view` message just replaces `pendingView`
// — it does NOT immediately walk. A pending walk is scheduled via
// setTimeout(0); meanwhile additional view messages can arrive and
// overwrite `pendingView`. When the scheduled processNext finally
// runs, it picks up the LATEST view and discards intermediate ones.
// So walks happen at roughly (walk_time)⁻¹ per second, regardless of
// how many view updates main fires; a flurry of pan events between
// walks coalesces into one re-walk on the most recent view.
//
let pendingView = null;
let scheduled = false;
let lastView = null;
let paletteDirty = false;
let colorBlendDirty = false;

function schedule() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(processNext, 0);
}

function processNext() {
  scheduled = false;
  if (!pendingView) return;
  const view = pendingView;
  pendingView = null;
  lastView = view;
  // Always walk (and always post a result). A "skip identical view"
  // optimisation here would silently drop walks that the pool path
  // is awaiting on a specific seq — e.g., consecutive video sub-frames
  // that clamp to the same trajectory point. Walks are cheap (a few
  // ms at hexagon-aggregate detail), and `awaitWorkerResultForSeq`
  // requires every dispatched view to elicit a matching result.
  paletteDirty = false;
  colorBlendDirty = false;
  doWalk(view);
  if (pendingView) schedule();
}

let _walkCount = 0;
function doWalk(view) {
  _walkCount++;
  if (_walkCount <= 3 || _walkCount % 100 === 0) {
    // eslint-disable-next-line no-console
    console.log('[worker] doWalk #', _walkCount, 'seq=', view.seq, 'ext=', walkerState.extensionLevel);
  }
  try {
    maybeExtend(view);
    const result = walker(walkerState.currentRoot, walkerState.currentRootTransform, view);
    return _postWalkResult(result, view);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[worker] doWalk threw', err);
    throw err;
  }
}

function _postWalkResult(result, view) {
  // Translate per-bucket MetaTile keys to (subLevel, name) string keys
  // and embed centroid + radius so main can build hexagon meshes
  // without needing the DAG.
  const outGroups = result.groups.map((g) => {
    if (g.bucket.key === null) {
      return {
        key: null,
        instanceOffset: g.instanceOffset,
        instanceCount: g.instanceCount,
      };
    }
    const mt = g.bucket.key;
    return {
      key: mt._subLevel + ':' + mt.name,
      cCx: mt._cCx,
      cCy: mt._cCy,
      cBound: mt._cBound,
      instanceOffset: g.instanceOffset,
      instanceCount: g.instanceCount,
    };
  });
  // Snapshot of hidden tree-state fields that drift with extension.
  // Main displays these; useful for diagnosing why coloring,
  // find-distant-match or precision behave differently after a long
  // zoom session.
  const root = walkerState.currentRoot;
  const T = walkerState.currentRootTransform;
  postMessage({
    type: 'result',
    data: result.data,
    totalCount: result.totalCount,
    groups: outGroups,
    instanceCenterX: view.centerX,
    instanceCenterY: view.centerY,
    pixelScale: view.pixelScale,
    extensionLevel: walkerState.extensionLevel,
    rootName: root.name,
    rootSubLevel: root._subLevel,
    rootCBound: root._cBound,
    rootTxRot: T.rot,
    rootTxMirror: T.mirror,
    rootTxTx: T.t[0],
    rootTxTy: T.t[1],
    viewSeq: view.seq ?? 0,
  }, [result.data]);
}

self.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'view') {
    pendingView = m.view;
    schedule();
  } else if (m.type === 'palette') {
    paletteState.rgb = m.rgb;
    paletteDirty = true;
    if (lastView && !pendingView) pendingView = lastView;
    schedule();
  } else if (m.type === 'colorBlend') {
    colorBlendState.sigma = m.sigma;
    colorBlendState.offset = m.offset;
    colorBlendDirty = true;
    if (lastView && !pendingView) pendingView = lastView;
    schedule();
  } else if (m.type === 'reset') {
    // Discard accumulated extension state and snap walkerState back
    // to the freshly-built baseCluster. Useful when the user wants
    // to clear the side-effects of a long interactive session:
    // accumulated extensions affect the multi-level Gaussian colour
    // blend (more ancestors → different colour averages), the
    // find-distant-match path (different rootSubLevel changes which
    // K-suffix levels are reachable), and at extreme depth, fp
    // precision in the world transforms.
    walkerState.currentRoot = baseCluster.Delta;
    walkerState.currentRootTransform = txIdentity;
    walkerState.currentBaseRecord = baseCluster;
    walkerState.extensionLevel = 0;
    postMessage({
      type: 'resetDone',
      ackId: m.ackId,
      rootBounds,
      extensionLevel: walkerState.extensionLevel,
    });
  } else if (m.type === 'extendToLevel') {
    // Bring this worker's tree to a specific extensionLevel by
    // calling extendRootUpward sequentially. Used by the
    // worker-pool-based video export to put every pool worker into
    // the same DAG state before parallel walks begin — without this,
    // workers that handle deeper-zoom frames first would extend in a
    // different order than workers that didn't, and their cluster
    // shapes around the visible content would diverge.
    while (walkerState.extensionLevel < (m.level | 0)) {
      extendRootUpward();
    }
    postMessage({
      type: 'extendDone',
      ackId: m.ackId,
      extensionLevel: walkerState.extensionLevel,
    });
  } else if (m.type === 'extendForView') {
    // Run maybeExtend until the cluster covers the supplied view,
    // then report the achieved level. Main calls this once on a
    // single pool worker (with the trajectory's most zoomed-out
    // view) and broadcasts the result via extendToLevel to every
    // other pool worker. After the broadcast all workers share the
    // same DAG state.
    maybeExtend(m.view);
    postMessage({
      type: 'extendDone',
      ackId: m.ackId,
      extensionLevel: walkerState.extensionLevel,
    });
  } else if (m.type === 'findDistantMatch') {
    // Find a far-away view whose local Spectre pattern matches the
    // source view's. Two leaves with the same K-suffix (last K
    // geometry indices in their substitution paths, same metatype
    // at level K) sit inside identically-substituted level-K
    // supertiles, so their local environments are byte-identical
    // out to ~2.45^K world units.
    //
    // Headroom: the random search hits when stepsToParent is small
    // (few branch levels above level-K). If the live cluster is
    // only just barely deep enough (D == K, stepsToParent = 0),
    // there's no actual search space — we'd just keep finding the
    // source itself. Force-extend the root until D ≥ K + δ before
    // searching, where δ = 3 gives 8^3 = 512 candidate branches —
    // enough that 1M random attempts have a strong success rate.
    const TARGET_DELTA = 3;
    let sourceLeaf = _findLeafNear(m.sourceX, m.sourceY);
    if (sourceLeaf) {
      let safety = 16;
      while (sourceLeaf.path.length < m.K + TARGET_DELTA && safety-- > 0) {
        extendRootUpward();
        sourceLeaf = _findLeafNear(m.sourceX, m.sourceY);
        if (!sourceLeaf) break;
      }
    }
    let result = null;
    if (sourceLeaf) {
      const D = sourceLeaf.path.length;
      if (D >= m.K) {
        const suffix = sourceLeaf.path.slice(D - m.K);
        const idx = D - m.K;
        const root = walkerState.currentRoot;
        const rootSubLevel = root._subLevel;
        const parentSubLevel = rootSubLevel - idx;
        result = _findMatchingLeaf({
          sourceX: m.sourceX, sourceY: m.sourceY,
          parentType: sourceLeaf.types[idx],
          parentRot:  sourceLeaf.rots[idx],
          parentMir:  sourceLeaf.mirs[idx],
          parentSubLevel,
          suffix,
          minDistance: m.minDistance,
        });
      }
    }
    postMessage({
      type: 'findDistantMatchDone',
      ackId: m.ackId,
      sourceLeaf, // null if findLeafNear failed
      result,     // null if findMatchingLeaf failed (or path was shorter than K)
    });
  }
};

// Handshake: tell main the rootBounds (for initial fit) and the
// starting extensionLevel. Main will follow with a `palette` and
// `colorBlend` message before its first `view`.
postMessage({
  type: 'init',
  rootBounds,
  extensionLevel: walkerState.extensionLevel,
});
