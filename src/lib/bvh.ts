class BVHNode {
  aabb: Float64Array;
  startIndex: number;
  endIndex: number;
  node0: BVHNode | null;
  node1: BVHNode | null;

  constructor(startIndex: number, endIndex: number, ctor: typeof Float64Array) {
    this.aabb = new ctor(6);
    this.startIndex = startIndex;
    this.endIndex = endIndex;
    this.node0 = null;
    this.node1 = null;
  }
}

const nodeStack: BVHNode[] = [];
const failed: boolean[] = [];
const extentCenters: number[] = [];
const nodesToIntersect: BVHNode[] = [];

function rayAABB(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  aabb: Float64Array
): [number, number] | null {
  let tmin: number, tmax: number;

  if (dx !== 0) {
    let t1 = (aabb[0] - ox) / dx;
    let t2 = (aabb[3] - ox) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = t1;
    tmax = t2;
  } else {
    if (ox < aabb[0] || ox > aabb[3]) return null;
    tmin = -Infinity;
    tmax = Infinity;
  }

  if (dy !== 0) {
    let t1 = (aabb[1] - oy) / dy;
    let t2 = (aabb[4] - oy) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
  } else {
    if (oy < aabb[1] || oy > aabb[4]) return null;
  }

  if (tmin! > tmax!) return null;

  if (dz !== 0) {
    let t1 = (aabb[2] - oz) / dz;
    let t2 = (aabb[5] - oz) / dz;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin!) tmin = t1;
    if (t2 < tmax!) tmax = t2;
  } else {
    if (oz < aabb[2] || oz > aabb[5]) return null;
  }

  if (tmin! > tmax! || tmax! < 0) return null;
  return [tmin!, tmax!];
}

export default class BVH {
  _aabbs: Float64Array;
  _epsilon: number;
  _maxItemsPerNode: number;
  _aabbTypeCtor: typeof Float64Array;
  _idArray: Uint32Array;
  _nodeSplitPtr: number;
  root: BVHNode;

  constructor(aabbs: Float64Array, { epsilon = 1e-6, maxItemsPerNode = 10 } = {}) {
    this._aabbs = aabbs;
    const count = this._aabbs.length / 6;

    this._epsilon = epsilon;
    this._maxItemsPerNode = maxItemsPerNode;

    this._aabbTypeCtor = Float64Array;
    const indexTypeCtor = Uint32Array;

    this._idArray = new indexTypeCtor(count);
    for (var i = 0; i < count; i++) {
      this._idArray[i] = i;
    }
    this.root = new BVHNode(0, count, this._aabbTypeCtor);
    this.computeExtents(this.root);

    this._nodeSplitPtr = 0;
    nodeStack.length = 0;
    nodeStack[0] = this.root;
    let iter = 0;
    while (this._nodeSplitPtr >= 0 && iter++ < 1e6) {
      this.splitNode(nodeStack[this._nodeSplitPtr--]);
    }
    if (iter > 1e6) {
      throw new Error(
        "Uh-oh, it seems like BVH construction ran into an infinite loop."
      );
    }
    nodeStack.length = 0;
  }

  computeExtents(node: BVHNode): void {
    const aabb = node.aabb;

    let xmin = Infinity;
    let ymin = Infinity;
    let zmin = Infinity;
    let xmax = -Infinity;
    let ymax = -Infinity;
    let zmax = -Infinity;

    for (
      let i = node.startIndex * 6, end = node.endIndex * 6;
      i < end;
      i += 6
    ) {
      xmin = Math.min(this._aabbs[i], xmin);
      ymin = Math.min(this._aabbs[i + 1], ymin);
      zmin = Math.min(this._aabbs[i + 2], zmin);
      xmax = Math.max(this._aabbs[i + 3], xmax);
      ymax = Math.max(this._aabbs[i + 4], ymax);
      zmax = Math.max(this._aabbs[i + 5], zmax);
    }

    const xcen = (xmax + xmin) * 0.5;
    const ycen = (ymax + ymin) * 0.5;
    const zcen = (zmax + zmin) * 0.5;
    const xrng =
      Math.max((xmax - xmin) * 0.5, this._epsilon) * (1.0 + this._epsilon);
    const yrng =
      Math.max((ymax - ymin) * 0.5, this._epsilon) * (1.0 + this._epsilon);
    const zrng =
      Math.max((zmax - zmin) * 0.5, this._epsilon) * (1.0 + this._epsilon);

    aabb[0] = xcen - xrng;
    aabb[1] = ycen - yrng;
    aabb[2] = zcen - zrng;
    aabb[3] = xcen + xrng;
    aabb[4] = ycen + yrng;
    aabb[5] = zcen + zrng;
  }

  splitNode(node: BVHNode): void {
    let j: number, ptr: number, ptr2: number, endPtr: number, tmp: number;
    const startIndex = node.startIndex;
    const endIndex = node.endIndex;

    const elementCount = endIndex - startIndex;
    if (elementCount <= this._maxItemsPerNode || elementCount === 0) {
      return;
    }
    const aabbs = this._aabbs;
    const ids = this._idArray;

    extentCenters[0] = node.aabb[0] + node.aabb[3];
    extentCenters[1] = node.aabb[1] + node.aabb[4];
    extentCenters[2] = node.aabb[2] + node.aabb[5];

    let leftCnt0 = 0, leftCnt1 = 0, leftCnt2 = 0;
    let rightCnt0 = 0, rightCnt1 = 0, rightCnt2 = 0;

    for (
      ptr = startIndex * 6, endPtr = endIndex * 6;
      ptr < endPtr;
      ptr += 6
    ) {
      if (aabbs[ptr] + aabbs[ptr + 3] < extentCenters[0]) { leftCnt0++; } else { rightCnt0++; }
      if (aabbs[ptr + 1] + aabbs[ptr + 4] < extentCenters[1]) { leftCnt1++; } else { rightCnt1++; }
      if (aabbs[ptr + 2] + aabbs[ptr + 5] < extentCenters[2]) { leftCnt2++; } else { rightCnt2++; }
    }

    failed[0] = leftCnt0 === 0 || rightCnt0 === 0;
    failed[1] = leftCnt1 === 0 || rightCnt1 === 0;
    failed[2] = leftCnt2 === 0 || rightCnt2 === 0;
    if (failed[0] && failed[1] && failed[2]) return;

    const extentsLength0 = node.aabb[3] - node.aabb[0];
    const extentsLength1 = node.aabb[4] - node.aabb[1];
    const extentsLength2 = node.aabb[5] - node.aabb[2];

    let splitDim: number;
    if (extentsLength0 >= extentsLength1 && extentsLength0 >= extentsLength2) {
      splitDim = 0;
    } else if (extentsLength1 >= extentsLength2) {
      splitDim = 1;
    } else {
      splitDim = 2;
    }
    if (failed[splitDim]) {
      if (splitDim === 0) splitDim = extentsLength1 >= extentsLength2 ? 1 : 2;
      else if (splitDim === 1) splitDim = extentsLength0 >= extentsLength2 ? 0 : 2;
      else splitDim = extentsLength0 >= extentsLength1 ? 0 : 1;
      if (failed[splitDim]) {
        splitDim = 3 - splitDim - (splitDim === 0 ? 1 : splitDim === 2 ? 1 : 0);
        for (let d = 0; d < 3; d++) { if (!failed[d]) { splitDim = d; break; } }
      }
    }

    let bboxPtr: number, idPtr: number, bboxPtr2: number, idPtr2: number;
    let lmin0 = Infinity, lmin1 = Infinity, lmin2 = Infinity;
    let lmax0 = -Infinity, lmax1 = -Infinity, lmax2 = -Infinity;
    let rmin0 = Infinity, rmin1 = Infinity, rmin2 = Infinity;
    let rmax0 = -Infinity, rmax1 = -Infinity, rmax2 = -Infinity;
    const extentCenter = extentCenters[splitDim];
    for (
      bboxPtr = startIndex * 6,
        bboxPtr2 = (endIndex - 1) * 6,
        idPtr = startIndex,
        idPtr2 = endIndex - 1;
      bboxPtr <= bboxPtr2;
      bboxPtr += 6, idPtr++
    ) {
      if (
        aabbs[bboxPtr + splitDim] + aabbs[bboxPtr + splitDim + 3] >=
        extentCenter
      ) {
        tmp = ids[idPtr];
        ids[idPtr] = ids[idPtr2];
        ids[idPtr2] = tmp;

        tmp = aabbs[bboxPtr];
        rmin0 = Math.min(rmin0, tmp);
        aabbs[bboxPtr] = aabbs[bboxPtr2];
        aabbs[bboxPtr2] = tmp;

        tmp = aabbs[bboxPtr + 1];
        rmin1 = Math.min(rmin1, tmp);
        aabbs[bboxPtr + 1] = aabbs[bboxPtr2 + 1];
        aabbs[bboxPtr2 + 1] = tmp;

        tmp = aabbs[bboxPtr + 2];
        rmin2 = Math.min(rmin2, tmp);
        aabbs[bboxPtr + 2] = aabbs[bboxPtr2 + 2];
        aabbs[bboxPtr2 + 2] = tmp;

        tmp = aabbs[bboxPtr + 3];
        rmax0 = Math.max(rmax0, tmp);
        aabbs[bboxPtr + 3] = aabbs[bboxPtr2 + 3];
        aabbs[bboxPtr2 + 3] = tmp;

        tmp = aabbs[bboxPtr + 4];
        rmax1 = Math.max(rmax1, tmp);
        aabbs[bboxPtr + 4] = aabbs[bboxPtr2 + 4];
        aabbs[bboxPtr2 + 4] = tmp;

        tmp = aabbs[bboxPtr + 5];
        rmax2 = Math.max(rmax2, tmp);
        aabbs[bboxPtr + 5] = aabbs[bboxPtr2 + 5];
        aabbs[bboxPtr2 + 5] = tmp;

        idPtr--;
        idPtr2--;
        bboxPtr -= 6;
        bboxPtr2 -= 6;
      } else {
        lmin0 = Math.min(lmin0, aabbs[bboxPtr]);
        lmin1 = Math.min(lmin1, aabbs[bboxPtr + 1]);
        lmin2 = Math.min(lmin2, aabbs[bboxPtr + 2]);
        lmax0 = Math.max(lmax0, aabbs[bboxPtr + 3]);
        lmax1 = Math.max(lmax1, aabbs[bboxPtr + 4]);
        lmax2 = Math.max(lmax2, aabbs[bboxPtr + 5]);
      }
    }

    node.startIndex = node.endIndex = -1;
    const node0 = (node.node0 = new BVHNode(
      startIndex,
      idPtr,
      this._aabbTypeCtor
    ));
    const node1 = (node.node1 = new BVHNode(
      idPtr,
      endIndex,
      this._aabbTypeCtor
    ));

    let cen0: number, cen1: number, cen2: number, rng0: number, rng1: number, rng2: number;
    const eps = this._epsilon;
    cen0 = (lmax0 + lmin0) * 0.5;
    cen1 = (lmax1 + lmin1) * 0.5;
    cen2 = (lmax2 + lmin2) * 0.5;
    rng0 = Math.max((lmax0 - lmin0) * 0.5, eps) * (1.0 + eps);
    rng1 = Math.max((lmax1 - lmin1) * 0.5, eps) * (1.0 + eps);
    rng2 = Math.max((lmax2 - lmin2) * 0.5, eps) * (1.0 + eps);

    node0.aabb[0] = cen0 - rng0;
    node0.aabb[1] = cen1 - rng1;
    node0.aabb[2] = cen2 - rng2;
    node0.aabb[3] = cen0 + rng0;
    node0.aabb[4] = cen1 + rng1;
    node0.aabb[5] = cen2 + rng2;

    cen0 = (rmax0 + rmin0) * 0.5;
    cen1 = (rmax1 + rmin1) * 0.5;
    cen2 = (rmax2 + rmin2) * 0.5;
    rng0 = Math.max((rmax0 - rmin0) * 0.5, eps) * (1.0 + eps);
    rng1 = Math.max((rmax1 - rmin1) * 0.5, eps) * (1.0 + eps);
    rng2 = Math.max((rmax2 - rmin2) * 0.5, eps) * (1.0 + eps);

    node1.aabb[0] = cen0 - rng0;
    node1.aabb[1] = cen1 - rng1;
    node1.aabb[2] = cen2 - rng2;
    node1.aabb[3] = cen0 + rng0;
    node1.aabb[4] = cen1 + rng1;
    node1.aabb[5] = cen2 + rng2;

    if (idPtr - startIndex > this._maxItemsPerNode) {
      nodeStack[++this._nodeSplitPtr] = node.node0;
    }

    if (endIndex - idPtr > this._maxItemsPerNode) {
      nodeStack[++this._nodeSplitPtr] = node.node1;
    }
  }

  test(bboxIntersectionTest: (aabb: Float64Array) => boolean, leafTest: (index: number) => void): void {
    nodesToIntersect.length = 0;
    var nodesToIntersectPtr = 0;
    nodesToIntersect[0] = this.root;

    while (nodesToIntersectPtr >= 0) {
      var node = nodesToIntersect[nodesToIntersectPtr--];
      if (bboxIntersectionTest(node.aabb)) {
        if (node.node0) nodesToIntersect[++nodesToIntersectPtr] = node.node0;
        if (node.node1) nodesToIntersect[++nodesToIntersectPtr] = node.node1;

        for (var i = node.startIndex; i < node.endIndex; i++) {
          leafTest(this._idArray[i]);
        }
      }
    }
    nodesToIntersect.length = 0;
  }

  rayIntersect(
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number
  ): { index: number; tNear: number }[] {
    const results: { index: number; tNear: number }[] = [];
    const stack: BVHNode[] = [];
    let sp = 0;
    stack[sp++] = this.root;

    while (sp > 0) {
      const node = stack[--sp];

      const hit = rayAABB(ox, oy, oz, dx, dy, dz, node.aabb);
      if (!hit) continue;

      if (node.node0) stack[sp++] = node.node0;
      if (node.node1) stack[sp++] = node.node1;

      for (let i = node.startIndex; i < node.endIndex; i++) {
        const leafIdx = this._idArray[i];
        const base = i * 6;
        const leafAABB = new Float64Array([
          this._aabbs[base], this._aabbs[base + 1], this._aabbs[base + 2],
          this._aabbs[base + 3], this._aabbs[base + 4], this._aabbs[base + 5],
        ]);
        const leafHit = rayAABB(ox, oy, oz, dx, dy, dz, leafAABB);
        if (leafHit) {
          results.push({ index: leafIdx, tNear: Math.max(leafHit[0], 0) });
        }
      }
    }

    results.sort((a, b) => a.tNear - b.tNear);
    return results;
  }

  traversePreorder(visitor: (node: BVHNode) => boolean | void): void {
    const stack: BVHNode[] = [];
    let cur: BVHNode | null = this.root;
    while (stack.length || cur) {
      while (cur) {
        const descend = visitor(cur) !== false;
        if (descend && cur.node1) stack.push(cur.node1);
        cur = descend ? cur.node0 : null;
      }
      if (stack.length) cur = stack.pop()!;
    }
  }

  traverseInorder(visitor: (node: BVHNode) => void): void {
    const stack: BVHNode[] = [];
    let cur: BVHNode | null = this.root;
    while (cur || stack.length) {
      while (cur) {
        stack.push(cur);
        cur = cur.node0;
      }
      cur = stack[stack.length - 1];
      stack.pop();
      visitor(cur);
      cur = cur.node1;
    }
  }

  traversePostorder(visitor: (node: BVHNode) => void): void {
    const stack: BVHNode[] = [this.root];
    let prev: BVHNode | null = null;
    while (stack.length) {
      const cur = stack[stack.length - 1];
      if (!prev || prev.node0 === cur || prev.node1 === cur) {
        if (cur.node0) stack.push(cur.node0);
        else if (cur.node1) stack.push(cur.node1);
        else {
          stack.pop();
          visitor(cur);
        }
      } else if (cur.node0 === prev) {
        if (cur.node1) {
          stack.push(cur.node1);
        } else {
          stack.pop();
          visitor(cur);
        }
      } else if (cur.node1 === prev) {
        stack.pop();
        visitor(cur);
      }
      prev = cur;
    }
  }
}
