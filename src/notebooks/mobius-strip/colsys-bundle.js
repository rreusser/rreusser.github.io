// ../netlib-ode/src/state.ts
function makeOrder(ncomp, m, k) {
  let mstar = 0;
  let mnsum = 0;
  for (let i = 0; i < ncomp; i++) {
    mnsum += m[i] * m[i];
    mstar += m[i];
  }
  const kd = k * ncomp;
  return { k, ncomp, mstar, kd, kdm: kd + mstar, mnsum, m: m.slice() };
}
function makeEqord(ncomp, m, k) {
  const ind = [];
  const ineq = [];
  const mnd = [];
  ind[1 - 1] = 1;
  mnd[1 - 1] = m[1 - 1];
  let nd = 1;
  let neq = 0;
  let ig = (m[1 - 1] + 1) * (m[1 - 1] + k) + 1;
  if (ncomp > 1) {
    for (let j = 2; j <= ncomp; j++) {
      const mj = m[j - 1];
      if (mj === m[j - 1 - 1]) {
        neq = neq + 1;
        ineq[neq - 1] = ig;
      } else {
        nd = nd + 1;
        ind[nd - 1] = ig;
        mnd[nd - 1] = mj;
      }
      ig = ig + (mj + 1) * (mj + k);
    }
    ind[nd + 1 - 1] = ind[nd - 1] + ig;
  }
  return { ind, ineq, mnd, nd, neq };
}

// ../netlib-ode/src/bspline.ts
function bspfix(rhox, vn, voff, k, ncomp, m) {
  const xrho = 1 - rhox;
  let ivn = 0;
  vn[voff + 1 - 1] = 1;
  for (let l = 1; l <= k; l++) {
    ivn = ivn + l;
    let vnp = 0;
    for (let j = 1; j <= l; j++) {
      const rep = vn[voff + (ivn - l + j) - 1];
      vn[voff + (ivn + j) - 1] = vnp + rep * rhox;
      vnp = rep * xrho;
    }
    vn[voff + (ivn + l + 1) - 1] = vnp;
  }
  const md1 = m[ncomp - 1] - 1;
  if (md1 <= 0) return;
  for (let l = 1; l <= md1; l++) {
    ivn = ivn + k + l;
    const inc = l + 2;
    let vnp = vn[voff + (ivn + 1 - k) - 1] * xrho;
    if (k < inc) return;
    for (let j = inc; j <= k; j++) {
      const rep = vn[voff + (ivn - l - k + j) - 1];
      vn[voff + (ivn + j) - 1] = vnp + rep * rhox;
      vnp = rep * xrho;
    }
    vn[voff + (ivn + k + 1) - 1] = vnp;
  }
}
function bspvar(i, x, vn, voff, xi, n, k, ncomp, m) {
  const md1 = m[ncomp - 1] - 1;
  if (md1 <= 0) return;
  let xil = xi[1 - 1];
  if (i > 1) xil = xi[i - 1 - 1];
  let xir = xi[n + 1 - 1];
  if (i < n) xir = xi[i + 2 - 1];
  const rho1 = (xi[i + 1 - 1] - x) / (xi[i + 1 - 1] - xi[i - 1]);
  const rho2 = (xi[i + 1 - 1] - x) / (xi[i + 1 - 1] - xil);
  const rho3 = (xir - x) / (xir - xi[i - 1]);
  const xrho1 = 1 - rho1;
  const xrho2 = 1 - rho2;
  const xrho3 = 1 - rho3;
  let ivn = k * (k + 1) / 2;
  for (let l = 1; l <= md1; l++) {
    ivn = ivn + k + l;
    let vnp = 0;
    for (let j = 1; j <= l; j++) {
      const rep = vn[voff + (ivn - l - k + j) - 1];
      vn[voff + (ivn + j) - 1] = vnp + rep * rho2;
      vnp = rep * xrho2;
    }
    vn[voff + (ivn + l + 1) - 1] = vnp + rho1 * vn[voff + (ivn - k + 1) - 1];
    vnp = vn[voff + (ivn - l) - 1] * xrho1;
    for (let j = 1; j <= l; j++) {
      const rep = vn[voff + (ivn + j - l) - 1];
      vn[voff + (ivn + k + j) - 1] = vnp + rep * rho3;
      vnp = rep * xrho3;
    }
    vn[voff + (ivn + k + l + 1) - 1] = vnp;
  }
}
function approx(i, x, z, vn, xi, n, aldif, k, ncomp, m, mstar, mode, dmval, modhi, precis, vnOff = 0) {
  if (mode === 1 || mode === 4) {
    if (!(x >= xi[1 - 1] - precis && x <= xi[n + 1 - 1] + precis)) {
      if (x < xi[1 - 1]) x = xi[1 - 1];
      if (x > xi[n + 1 - 1]) x = xi[n + 1 - 1];
    }
    if (i > n || i < 1) i = Math.floor((n + 1) / 2);
    const ileft = i;
    if (x < xi[ileft - 1]) {
      const iright = ileft - 1;
      for (let l = 1; l <= iright; l++) {
        i = iright + 1 - l;
        if (x >= xi[i - 1]) break;
      }
    } else {
      for (let l = ileft; l <= n; l++) {
        i = l;
        if (x < xi[l + 1 - 1]) break;
      }
    }
    if (mode === 4) return { i, x };
  }
  if (mode === 1 || mode === 2) {
    const rhox = (xi[i + 1 - 1] - x) / (xi[i + 1 - 1] - xi[i - 1]);
    bspfix(rhox, vn, vnOff, k, ncomp, m);
  }
  if (mode === 1 || mode === 2 || mode === 3) {
    bspvar(i, x, vn, vnOff, xi, n, k, ncomp, m);
  }
  for (let l = 1; l <= mstar; l++) z[l - 1] = 0;
  let indif = 0;
  let k5 = 1;
  let ivnhi = 0;
  let dnk2 = 0;
  let incomp = 0;
  if (modhi !== 0) {
    ivnhi = k * (k - 1) / 2;
    dnk2 = k / (xi[i + 1 - 1] - xi[i - 1]);
    incomp = 0;
    for (let j = 1; j <= ncomp; j++) dmval[j - 1] = 0;
  }
  for (let j = 1; j <= ncomp; j++) {
    const mj = m[j - 1];
    const nalphj = n * k + mj;
    let kmr = k + mj;
    let ivn = kmr * (kmr - 1) / 2;
    for (let nr = 1; nr <= mj; nr++) {
      const left2 = i * k + mj - kmr;
      for (let l = 1; l <= kmr; l++) {
        const leftpl = left2 + l;
        z[k5 - 1] = z[k5 - 1] + aldif[indif + leftpl - 1] * vn[vnOff + ivn + l - 1];
      }
      kmr = kmr - 1;
      ivn = ivn - kmr;
      k5 = k5 + 1;
      indif = indif + nalphj;
    }
    if (modhi === 0) continue;
    incomp = incomp + (mj - 1) * nalphj;
    const left = (i - 1) * k + mj - 1;
    for (let l = 1; l <= k; l++) {
      dmval[j - 1] = dmval[j - 1] + dnk2 * (aldif[incomp + left + l + 1 - 1] - aldif[incomp + left + l - 1]) * vn[vnOff + ivnhi + l - 1];
    }
    incomp = incomp + nalphj;
  }
  return { i, x };
}
function appdif(aldif, alpha, xi, n, k, ncomp, m, mstar) {
  const kd = k * ncomp;
  let incomp = 0;
  let k3 = 0;
  let k4 = 0;
  for (let j = 1; j <= ncomp; j++) {
    const mj = m[j - 1];
    const kmj = k - mj;
    const mjm1 = mj - 1;
    let kmr = k + mj;
    const nalphj = n * k + mj;
    let inn = incomp;
    let k1 = mstar;
    let k2 = kd;
    let k5 = inn + 1;
    for (let l = 1; l <= mj; l++) {
      aldif[k5 - 1] = alpha[k3 + l - 1];
      k5 = k5 + 1;
    }
    for (let ii = 1; ii <= n; ii++) {
      if (kmj !== 0) {
        for (let l = 1; l <= kmj; l++) {
          aldif[k5 - 1] = alpha[k1 + k4 + l - 1];
          k5 = k5 + 1;
        }
      }
      for (let l = 1; l <= mj; l++) {
        aldif[k5 - 1] = alpha[k2 + k3 + l - 1];
        k5 = k5 + 1;
      }
      k1 = k1 + kd;
      k2 = k2 + kd;
    }
    if (mjm1 !== 0) {
      for (let nr = 1; nr <= mjm1; nr++) {
        const inn1 = inn + nalphj;
        kmr = kmr - 1;
        const mjr = mj - nr;
        const kmjr = k - mjr;
        let xip1 = xi[1 - 1];
        let dnk2 = kmr / (xi[2 - 1] - xip1);
        for (let l = 1; l <= nr; l++) aldif[inn1 + l - 1] = 0;
        for (let l = nr; l <= mjm1; l++) {
          const l1 = l + 1;
          aldif[inn1 + l1 - 1] = (aldif[inn + l1 - 1] - aldif[inn + l - 1]) * dnk2;
        }
        let ibeg1 = mj;
        let ibeg2 = k + nr;
        for (let ii = 1; ii <= n; ii++) {
          const xii = xip1;
          xip1 = xi[ii + 1 - 1];
          const dnk1 = kmr / (xip1 - xii);
          if (ii < n) dnk2 = kmr / (xi[ii + 2 - 1] - xii);
          if (ii === n) dnk2 = dnk1;
          for (let l = 1; l <= kmjr; l++) {
            const l1 = ibeg1 + l;
            aldif[inn1 + l1 - 1] = (aldif[inn + l1 - 1] - aldif[inn + l1 - 1 - 1]) * dnk1;
          }
          for (let l = 1; l <= mjr; l++) {
            const l1 = ibeg2 + l;
            aldif[inn1 + l1 - 1] = (aldif[inn + l1 - 1] - aldif[inn + l1 - 1 - 1]) * dnk2;
          }
          ibeg1 = ibeg1 + k;
          ibeg2 = ibeg2 + k;
        }
        inn = inn1;
      }
    }
    k3 = k3 + mj;
    k4 = k4 + kmj;
    incomp = incomp + nalphj * mj;
  }
}
function horder(i, uhigh, xiold, aldif, k, ncomp, m, nold) {
  const dn2 = 1 / (xiold[i + 1 - 1] - xiold[i - 1]);
  let incomp = 0;
  const ar = new Float64Array(21);
  const arm1 = new Float64Array(21);
  for (let j = 1; j <= ncomp; j++) {
    const mj = m[j - 1];
    const nalphj = k * nold + mj;
    const kpmj = k + mj;
    let kmr = k + 1;
    const mjm1 = mj - 1;
    incomp = incomp + mjm1 * nalphj;
    const left = i * k + mj - kmr;
    for (let l = 1; l <= kmr; l++) {
      const leftpl = left + l;
      arm1[l + mj - 1] = aldif[incomp + leftpl - 1];
    }
    incomp = incomp + nalphj;
    const kpmj1 = kpmj - 1;
    for (let nr = mj; nr <= kpmj1; nr++) {
      kmr = kmr - 1;
      const dnk2 = dn2 * kmr;
      for (let l = 1; l <= kmr; l++) {
        ar[l + nr] = dnk2 * (arm1[l + nr] - arm1[l + nr - 1]);
      }
      for (let l = nr; l <= kpmj1; l++) {
        arm1[l + 1] = ar[l + 1];
      }
    }
    uhigh[j - 1] = ar[kpmj];
  }
}
function bspder(vn, voff, xmesh, n, x, i, basef, mode, order, eqord, hi) {
  const { k, ncomp, m } = order;
  const { ind, ineq, mnd, nd, neq } = eqord;
  if (mode <= 1) {
    let xil = xmesh[1 - 1];
    if (i > 1) xil = xmesh[i - 1 - 1];
    let xir = xmesh[n + 1 - 1];
    if (i < n) xir = xmesh[i + 2 - 1];
    hi[0] = 1 / (xmesh[i + 1 - 1] - xil);
    hi[1] = 1 / (xmesh[i + 1 - 1] - xmesh[i - 1]);
    hi[2] = 1 / (xir - xmesh[i - 1]);
  }
  const dn1 = hi[0];
  const dn2 = hi[1];
  const dn3 = hi[2];
  if (mode <= 2) {
    const rhox = (xmesh[i + 1 - 1] - x) * dn2;
    bspfix(rhox, vn, voff, k, ncomp, m);
  }
  if (mode <= 3) {
    bspvar(i, x, vn, voff, xmesh, n, k, ncomp, m);
  }
  const md = mnd[nd - 1];
  const kmd = k + md;
  const kmd1 = kmd + 1;
  const md1 = md + 1;
  const md2m2 = md * 2 - 2;
  const md2m1 = md2m2 + 1;
  let inl = kmd * 2;
  const alphd = new Float64Array(81);
  const alphdo = new Float64Array(81);
  const alphn = new Float64Array(281);
  const alphno = new Float64Array(281);
  for (let j = 1; j <= kmd; j++) {
    alphdo[j] = 0;
    alphdo[j + kmd] = 1;
  }
  let kup = kmd * md;
  for (let j = 1; j <= kup; j++) alphdo[j + inl] = 0;
  const ndm1 = nd - 1;
  const nrest = md2m2 - k;
  let inn = 0;
  if (nrest > 0 && nd !== 1) {
    inl = 2 * md2m2;
    for (let nn = 1; nn <= ndm1; nn++) {
      const mn2 = mnd[nn - 1] + 2;
      for (let j = 1; j <= md2m2; j++) {
        alphno[j + inn] = 0;
        alphno[j + inn + md2m2] = 1;
      }
      kup = md2m2 * mnd[nn - 1];
      for (let j = 1; j <= kup; j++) alphno[j + inn + inl] = 0;
      inn = inn + mn2 * md2m2;
    }
  }
  const inns = inn;
  for (let j = 1; j <= nd; j++) {
    let k1 = ind[j - 1];
    const mj = mnd[j - 1];
    const kmj = k + mj;
    const mj1 = mj + 1;
    const ivn = kmj * (kmj - 1) / 2;
    for (let l = 1; l <= kmj; l++) {
      basef[k1 - 1] = vn[voff + (ivn + l) - 1];
      for (let jj = 1; jj <= mj; jj++) basef[k1 + jj - 1] = 0;
      k1 = k1 + mj1;
    }
  }
  for (let nr = 1; nr <= md; nr++) {
    const nr1 = nr + 1;
    const mdr = md - nr;
    let k1 = ind[nd - 1] + nr;
    const kmdr = k + mdr;
    let ivn = kmdr * (kmdr - 1) / 2;
    if (mdr !== 0) {
      for (let j = 1; j <= mdr; j++) {
        const jr = j + nr;
        let jin = jr + nr1 * kmd;
        let jink = jin + k;
        for (let l = j; l <= jr; l++) {
          const jin1 = jin - kmd1;
          const jink1 = jink - kmd1;
          alphd[jin] = dn1 * (alphdo[jin] - alphdo[jin1]);
          alphd[jink] = dn3 * (alphdo[jink] - alphdo[jink1]);
          let inb = k1 + (l - 1) * md1;
          basef[inb - 1] = basef[inb - 1] + alphd[jin] * vn[voff + (ivn + j) - 1];
          inb = inb + k * md1;
          basef[inb - 1] = basef[inb - 1] + alphd[jink] * vn[voff + (ivn + j + k) - 1];
          jin = jin - kmd;
          jink = jink - kmd;
        }
      }
    }
    const mdr1 = mdr + 1;
    if (mdr1 <= k) {
      for (let j = mdr1; j <= k; j++) {
        const jr = j + nr;
        let jin = jr + nr1 * kmd;
        for (let l = j; l <= jr; l++) {
          const jin1 = jin - kmd1;
          alphd[jin] = dn2 * (alphdo[jin] - alphdo[jin1]);
          const inb = k1 + (l - 1) * md1;
          basef[inb - 1] = basef[inb - 1] + alphd[jin] * vn[voff + (ivn + j) - 1];
          jin = jin - kmd;
        }
      }
    }
    let brokeOut = false;
    if (nd !== 1) {
      inn = inns;
      for (let nn = 1; nn <= ndm1; nn++) {
        const nj = nd - nn;
        const mj = mnd[nj - 1];
        inn = inn - (mj + 2) * md2m2;
        if (nr > mj) {
          brokeOut = true;
          break;
        }
        const kmjr = k + mj - nr;
        k1 = ind[nj - 1] + nr;
        ivn = kmjr * (kmjr - 1) / 2;
        const mj1 = mj + 1;
        let jr1 = kmjr - md + 1;
        jr1 = Math.min(jr1, md - 1);
        for (let j = 1; j <= jr1; j++) {
          const jr = j + nr;
          let jin = jr + nr1 * kmd + md - mj;
          for (let l = j; l <= jr; l++) {
            const inb = k1 + (l - 1) * mj1;
            basef[inb - 1] = basef[inb - 1] + alphd[jin] * vn[voff + (ivn + j) - 1];
            jin = jin - kmd;
          }
        }
        for (let j = md; j <= kmjr; j++) {
          const jr = j + nr;
          let jin = jr + nr1 * kmd;
          for (let l = j; l <= jr; l++) {
            const inb = k1 + (l - 1) * mj1;
            basef[inb - 1] = basef[inb - 1] + alphd[jin] * vn[voff + (ivn + j) - 1];
            jin = jin - kmd;
          }
        }
        const jr2 = md2m2 - kmjr;
        if (jr2 > 0) {
          for (let jj = 1; jj <= jr2; jj++) {
            const j = jj + jr1;
            const jr = j + nr;
            let jin = jr + nr1 * md2m2 + inn;
            for (let l = j; l <= jr; l++) {
              const jin1 = jin - md2m1;
              alphn[jin] = dn2 * (alphno[jin] - alphno[jin1]);
              const inb = k1 + (l - 1) * mj1;
              basef[inb - 1] = basef[inb - 1] + alphn[jin] * vn[voff + (ivn + j) - 1];
              jin = jin - md2m2;
            }
          }
        }
      }
    }
    if (nr !== md && !brokeOut) {
      const nr2 = nr + 2;
      let inj = nr;
      for (let l = 2; l <= nr2; l++) {
        inj = inj + kmd;
        for (let j = 1; j <= kmdr; j++) alphdo[j + inj] = alphd[j + inj];
      }
      if (nd !== 1 && nrest > 0) {
        inn = 0;
        for (let nn = 1; nn <= ndm1; nn++) {
          const mn = mnd[nn - 1];
          if (mn > nr) {
            const kmnr = k + mn - nr;
            const jr1 = Math.min(kmnr - md + 1, md - 1);
            inj = nr + inn;
            inl = nr + md - mn;
            for (let l = 2; l <= nr2; l++) {
              inj = inj + md2m2;
              inl = inl + kmd;
              for (let j = 1; j <= jr1; j++) alphno[inj + j] = alphd[inl + j];
            }
            const mup = Math.min(kmnr, md2m2);
            inj = nr + inn;
            inl = nr;
            for (let l = 2; l <= nr2; l++) {
              inj = inj + md2m2;
              inl = inl + kmd;
              for (let j = md; j <= mup; j++) alphno[inj + j] = alphd[inl + j];
            }
            const jr2 = md2m2 - kmnr;
            if (jr2 > 0) {
              inj = nr + inn;
              for (let l = 2; l <= nr2; l++) {
                inj = inj + md2m2;
                for (let jj = 1; jj <= jr2; jj++) {
                  const jin = inj + jj + jr1;
                  alphno[jin] = alphn[jin];
                }
              }
            }
          }
          inn = inn + (mn + 2) * md2m2;
        }
      }
    }
  }
  for (let j = 1; j <= nd; j++) {
    let inb = ind[j - 1];
    let icons = 1;
    const mj = mnd[j - 1];
    const kmj = k + mj;
    const mj1 = mj + 1;
    for (let nr = 1; nr <= mj; nr++) {
      icons = icons * (kmj - nr);
      inb = inb + 1;
      for (let l = 1; l <= kmj; l++) {
        const lbasef = inb + (l - 1) * mj1;
        basef[lbasef - 1] = basef[lbasef - 1] * icons;
      }
    }
  }
  if (neq === 0) return;
  let jd = 1;
  for (let j = 1; j <= neq; j++) {
    const in1 = ineq[j - 1];
    while (in1 >= ind[jd + 1 - 1]) jd = jd + 1;
    const mj = mnd[jd - 1];
    const ntot = (k + mj) * (1 + mj);
    const in2 = ind[jd - 1];
    for (let l = 1; l <= ntot; l++) basef[in1 - 1 + l - 1] = basef[in2 - 1 + l - 1];
  }
}

// ../netlib-ode/src/consts.ts
var VN_SIZE = 66;
var CNSTS1 = [
  0.25,
  0.0625,
  0.072169,
  0.018342,
  0.019065,
  0.05819,
  54658e-7,
  5337e-6,
  0.01889,
  0.027792,
  16095e-7,
  14964e-7,
  75938e-7,
  57573e-7,
  0.018342,
  4673e-6,
  415e-6,
  1919e-6,
  1468e-6,
  6371e-6,
  461e-5,
  1342e-7,
  1138e-7,
  4889e-7,
  4177e-7,
  1374e-6,
  1654e-6,
  2863e-6
];
var CNSTS2 = [
  0.125,
  2604e-6,
  8019e-6,
  217e-7,
  7453e-8,
  5208e-7,
  9689e-11,
  3689e-10,
  31e-7,
  2451e-8,
  2691e-13,
  112e-11,
  1076e-11,
  9405e-11,
  1033e-9,
  5097e-16,
  229e-14,
  2446e-14,
  2331e-13,
  2936e-12,
  3593e-11,
  7001e-19,
  3363e-18,
  3921e-17,
  4028e-16,
  5646e-15,
  7531e-14,
  1129e-12
];
var RHO_TABLE = {
  1: [0],
  2: [-0.5773502691896257, 0.5773502691896257],
  3: [-0.7745966692414834, 0, 0.7745966692414834],
  4: [
    -0.8611363115940526,
    -0.33998104358485626,
    0.33998104358485626,
    0.8611363115940526
  ],
  5: [
    -0.906179845938664,
    -0.5384693101056831,
    0,
    0.5384693101056831,
    0.906179845938664
  ],
  6: [
    -0.932469514203152,
    -0.6612093864662645,
    -0.2386191860831969,
    0.2386191860831969,
    0.6612093864662645,
    0.932469514203152
  ],
  7: [
    -0.9491079912342758,
    -0.7415311855993945,
    -0.4058451513773972,
    0,
    0.4058451513773972,
    0.7415311855993945,
    0.9491079912342758
  ]
};
function consts(k, ncomp, m, ntol, ltol, tolin) {
  const koff = k * (k + 1) / 2;
  const mstar = m.slice(0, ncomp).reduce((a, b) => a + b, 0);
  const wgterr = new Array(mstar).fill(0);
  let iextra = 1;
  for (let j = 1; j <= ncomp; j++) {
    const lim = m[j - 1];
    for (let l = 1; l <= lim; l++) {
      wgterr[iextra - 1] = CNSTS1[koff - lim + l - 1];
      iextra = iextra + 1;
    }
  }
  const wgtmsh = new Array(ntol).fill(0);
  const jtol = new Array(ntol).fill(0);
  const root = new Array(ntol).fill(0);
  let jcomp = 1;
  let mtot = m[1 - 1];
  for (let i = 1; i <= ntol; i++) {
    const ltoli = ltol[i - 1];
    while (ltoli > mtot) {
      jcomp = jcomp + 1;
      mtot = mtot + m[jcomp - 1];
    }
    jtol[i - 1] = jcomp;
    wgtmsh[i - 1] = 10 * CNSTS2[koff + ltoli - mtot - 1] / tolin[i - 1];
    root[i - 1] = 1 / (k + mtot - ltoli + 1);
  }
  const rho = RHO_TABLE[k].slice();
  const vncol = new Float64Array(VN_SIZE * k);
  for (let j = 1; j <= k; j++) {
    const arg = 0.5 * (1 - rho[j - 1]);
    bspfix(arg, vncol, (j - 1) * VN_SIZE, k, ncomp, m);
  }
  const vnsave = new Float64Array(VN_SIZE * 5);
  const savePts = [1, 5 / 6, 2 / 3, 1 / 3, 1 / 6];
  for (let s = 0; s < 5; s++) {
    bspfix(savePts[s], vnsave, s * VN_SIZE, k, ncomp, m);
  }
  return { rho, wgterr, wgtmsh, jtol, root, vncol, vnsave };
}

// ../netlib-ode/src/mesh.ts
function newmsh(mode, prob, run, work) {
  const { order, aleft, aright, ltol, ntol, consts: consts2 } = prob;
  const { k, ncomp, mstar, m } = order;
  const { rho, vnsave, wgtmsh, jtol, root } = consts2;
  const { xi, xiold, xij, aldif, slope, accum, fixpnt, nfxpnt } = work;
  const precis = run.precis;
  const nfxp1 = nfxpnt + 1;
  const dumm = new Float64Array(Math.max(ncomp, 1));
  const d1 = new Float64Array(Math.max(ncomp, 1));
  const d2 = new Float64Array(Math.max(ncomp, 1));
  const zv = new Float64Array(mstar);
  const gen320 = () => {
    let k2 = 1;
    for (let i = 1; i <= run.n; i++) {
      const h = (xi[i + 1 - 1] - xi[i - 1]) / 2;
      const xm = (xi[i + 1 - 1] + xi[i - 1]) / 2;
      for (let j = 1; j <= k; j++) {
        xij[k2 - 1] = rho[j - 1] * h + xm;
        k2 = k2 + 1;
      }
    }
    run.nalpha = run.n * k * ncomp + mstar;
  };
  if (mode === 5 || mode === 4) {
    if (mode === 5) run.mshlmt = 1;
    if (run.iguess >= 2) {
      if (run.iguess === 3) {
        run.n = Math.trunc(run.nold / 2);
        let ii = 0;
        for (let j = 1; j <= run.nold; j += 2) {
          ii = ii + 1;
          xi[ii - 1] = xiold[j - 1];
        }
      }
    }
    const np1 = run.n + 1;
    xi[1 - 1] = aleft;
    xi[np1 - 1] = aright;
    gen320();
    return mode;
  }
  if (mode === 3) {
    if (run.n < nfxp1) run.n = nfxp1;
    xi[1 - 1] = aleft;
    let ileft = 1;
    let xleft = aleft;
    const np1 = run.n + 1;
    for (let j = 1; j <= nfxp1; j++) {
      let xright = aright;
      let iright = np1;
      if (j !== nfxp1) {
        xright = fixpnt[j - 1];
        let nmin = Math.trunc((xright - aleft) / (aright - aleft) * run.n + 1.5);
        if (nmin > run.n - nfxpnt + j) nmin = run.n - nfxpnt + j;
        iright = Math.max(ileft + 1, nmin);
      }
      xi[iright - 1] = xright;
      const nregn = iright - ileft - 1;
      if (nregn !== 0) {
        const dx = (xright - xleft) / (nregn + 1);
        for (let i = 1; i <= nregn; i++) xi[ileft + i - 1] = xleft + i * dx;
      }
      ileft = iright;
      xleft = xright;
    }
    gen320();
    return mode;
  }
  let lmode = mode;
  let slphmx = 0;
  let label = mode === 2 ? 100 : 180;
  mainLoop: for (; ; ) {
    if (label === 180) {
      if (run.nold === 1 || run.nold <= 2 * nfxpnt) {
        label = 100;
        continue;
      }
      horder(1, d1, xiold, aldif, k, ncomp, m, run.nold);
      horder(2, d2, xiold, aldif, k, ncomp, m, run.nold);
      approx(1, xiold[1 - 1], zv, vnsave, xiold, run.nold, aldif, k, ncomp, m, mstar, 3, dumm, 0, precis, 0);
      accum[1 - 1] = 0;
      slope[1 - 1] = 0;
      let oneovh = 2 / (xiold[3 - 1] - xiold[1 - 1]);
      for (let j = 1; j <= ntol; j++) {
        const jj = jtol[j - 1];
        const jv = ltol[j - 1];
        slope[1 - 1] = Math.max(
          slope[1 - 1],
          Math.pow(
            Math.abs(d2[jj - 1] - d1[jj - 1]) * wgtmsh[j - 1] * oneovh / (1 + Math.abs(zv[jv - 1])),
            root[j - 1]
          )
        );
      }
      slphmx = slope[1 - 1] * (xiold[2 - 1] - xiold[1 - 1]);
      accum[2 - 1] = slphmx;
      let iflip = 1;
      for (let i = 2; i <= run.nold; i++) {
        if (iflip === -1) horder(i, d1, xiold, aldif, k, ncomp, m, run.nold);
        if (iflip === 1) horder(i, d2, xiold, aldif, k, ncomp, m, run.nold);
        approx(i, xiold[i - 1], zv, vnsave, xiold, run.nold, aldif, k, ncomp, m, mstar, 3, dumm, 0, precis, 0);
        oneovh = 2 / (xiold[i + 1 - 1] - xiold[i - 1 - 1]);
        slope[i - 1] = 0;
        for (let j = 1; j <= ntol; j++) {
          const jj = jtol[j - 1];
          const jv = ltol[j - 1];
          slope[i - 1] = Math.max(
            slope[i - 1],
            Math.pow(
              Math.abs(d2[jj - 1] - d1[jj - 1]) * wgtmsh[j - 1] * oneovh / (1 + Math.abs(zv[jv - 1])),
              root[j - 1]
            )
          );
        }
        const temp = slope[i - 1] * (xiold[i + 1 - 1] - xiold[i - 1]);
        slphmx = Math.max(slphmx, temp);
        accum[i + 1 - 1] = accum[i - 1] + temp;
        iflip = -iflip;
      }
      const avrg = accum[run.nold + 1 - 1] / run.nold;
      const degequ = avrg / Math.max(slphmx, precis);
      const naccum = Math.trunc(accum[run.nold + 1 - 1] + 1);
      if (avrg < precis || degequ >= 0.5) {
        label = 100;
        continue;
      }
      const nmx = Math.trunc(Math.max(run.nold + 1, naccum) / 2);
      const nmax2 = Math.trunc(run.nmax / 2);
      run.n = Math.min(nmax2, run.nold, nmx);
      label = 220;
      continue;
    }
    if (label === 100) {
      const n2 = 2 * run.n;
      if (n2 > run.nmax) {
        if (lmode === 2) {
          run.n = n2;
          return lmode;
        }
        run.n = Math.trunc(run.nmax / 2);
        label = 220;
        continue;
      }
      if (run.mshflg !== 0) {
        let kstore = 1;
        for (let i = 1; i <= run.nold; i++) {
          const hd6 = (xiold[i + 1 - 1] - xiold[i - 1]) / 6;
          let x = xiold[i - 1] + hd6;
          approx(i, x, work.valstr.subarray(kstore - 1), vnsave, xiold, run.nold, aldif, k, ncomp, m, mstar, 3, dumm, 0, precis, 1 * VN_SIZE);
          x = x + 4 * hd6;
          kstore = kstore + 3 * mstar;
          approx(i, x, work.valstr.subarray(kstore - 1), vnsave, xiold, run.nold, aldif, k, ncomp, m, mstar, 3, dumm, 0, precis, 4 * VN_SIZE);
          kstore = kstore + mstar;
        }
      } else {
        let kstore = 1;
        for (let i = 1; i <= run.n; i++) {
          let x = xi[i - 1];
          const hd6 = (xi[i + 1 - 1] - xi[i - 1]) / 6;
          for (let j2 = 1; j2 <= 4; j2++) {
            x = x + hd6;
            if (j2 === 3) x = x + hd6;
            approx(i, x, work.valstr.subarray(kstore - 1), vnsave, xiold, run.nold, aldif, k, ncomp, m, mstar, 3, dumm, 0, precis, j2 * VN_SIZE);
            kstore = kstore + mstar;
          }
        }
      }
      run.mshflg = 0;
      run.mshnum = 1;
      lmode = 2;
      let j = 2;
      for (let i = 1; i <= run.n; i++) {
        xi[j - 1] = (xiold[i - 1] + xiold[i + 1 - 1]) / 2;
        xi[j + 1 - 1] = xiold[i + 1 - 1];
        j = j + 2;
      }
      run.n = n2;
      break mainLoop;
    }
    if (label === 220) {
      const noldp1 = run.nold + 1;
      if (run.n < nfxp1) run.n = nfxp1;
      run.mshnum = run.mshnum + 1;
      if (run.n < run.nold) run.mshnum = run.mshlmt;
      if (run.n > Math.trunc(run.nold / 2)) run.mshalt = 1;
      if (run.n === Math.trunc(run.nold / 2)) run.mshalt = run.mshalt + 1;
      run.mshflg = 0;
      let inx = 1;
      let accl = 0;
      let lold = 2;
      xi[1 - 1] = aleft;
      xi[run.n + 1 - 1] = aright;
      for (let i = 1; i <= nfxp1; i++) {
        let accr;
        let lnew;
        let nregn;
        if (i === nfxp1) {
          accr = accum[noldp1 - 1];
          lnew = noldp1;
          nregn = run.n - inx;
        } else {
          lnew = noldp1;
          for (let jj = lold; jj <= noldp1; jj++) {
            lnew = jj;
            if (fixpnt[i - 1] <= xiold[jj - 1]) break;
          }
          accr = accum[lnew - 1] + (fixpnt[i - 1] - xiold[lnew - 1]) * slope[lnew - 1 - 1];
          nregn = Math.trunc((accr - accl) / accum[noldp1 - 1] * run.n - 0.5);
          nregn = Math.min(nregn, run.n - inx - nfxp1 + i);
          xi[inx + nregn + 1 - 1] = fixpnt[i - 1];
        }
        if (nregn !== 0) {
          let temp = accl;
          const tsum = (accr - accl) / (nregn + 1);
          for (let jj = 1; jj <= nregn; jj++) {
            inx = inx + 1;
            temp = temp + tsum;
            let lcarry = lnew;
            for (let l = lold; l <= lnew; l++) {
              lcarry = l;
              if (temp <= accum[l - 1]) break;
            }
            lold = lcarry;
            xi[inx - 1] = xiold[lold - 1 - 1] + (temp - accum[lold - 1 - 1]) / slope[lold - 1 - 1];
          }
        }
        inx = inx + 1;
        accl = accr;
        lold = lnew;
      }
      lmode = 1;
      break mainLoop;
    }
  }
  gen320();
  return lmode;
}
function errchk(imesh, prob, run, work) {
  const { order, ltol, tolin, ntol, consts: consts2 } = prob;
  const { k, ncomp, mstar, m } = order;
  const { wgterr, vnsave } = consts2;
  const { xiold, aldif, valstr } = work;
  const precis = run.precis;
  const errest = new Float64Array(mstar);
  let ifin = 1;
  if (imesh === 1) return { ifin, errest };
  const dumm = new Float64Array(Math.max(ncomp, 1));
  for (let iback = 1; iback <= run.nold; iback++) {
    const i = run.nold + 1 - iback;
    run.mshflg = 1;
    const z = new Float64Array(mstar);
    const err = new Float64Array(mstar);
    for (let j = 1; j <= 2; j++) {
      const jj = 5 - j;
      let knew = (4 * (i - 1) + 3 - j) * mstar + 1;
      let kstore = (2 * (i - 1) + 2 - j) * mstar + 1;
      const x = xiold[i - 1] + (3 - j) / 3 * (xiold[i + 1 - 1] - xiold[i - 1]);
      approx(i, x, valstr.subarray(knew - 1), vnsave, xiold, run.nold, aldif, k, ncomp, m, mstar, 3, dumm, 0, precis, (jj - 1) * VN_SIZE);
      for (let l = 1; l <= mstar; l++) {
        err[l - 1] = err[l - 1] + wgterr[l - 1] * Math.abs(valstr[knew - 1] - valstr[kstore - 1]);
        z[l - 1] = z[l - 1] + 0.5 * Math.abs(valstr[knew - 1]);
        knew = knew + 1;
        kstore = kstore + 1;
      }
    }
    if (ifin !== 0) {
      for (let j = 1; j <= ntol; j++) {
        const ltolj = ltol[j - 1];
        if (err[ltolj - 1] > tolin[j - 1] * (z[ltolj - 1] + 1)) ifin = 0;
      }
    }
    for (let l = 1; l <= mstar; l++) errest[l - 1] = Math.max(errest[l - 1], err[l - 1]);
  }
  return { ifin, errest };
}

// ../netlib-ode/src/solveblok.ts
function factrb(w, woff, ipivot, ipoff, d, doff, nrow, ncol, last, iflag) {
  for (let i = 1; i <= nrow; i++) {
    ipivot[ipoff + i - 1] = i;
    let rowmax = 0;
    for (let j = 1; j <= ncol; j++) {
      rowmax = Math.max(rowmax, Math.abs(w[woff + (j - 1) * nrow + (i - 1)]));
    }
    if (rowmax === 0) return 0;
    d[doff + i - 1] = rowmax;
  }
  let k = 1;
  for (; ; ) {
    let ipivk = ipivot[ipoff + k - 1];
    if (k === nrow) {
      const dpk2 = d[doff + ipivk - 1];
      if (Math.abs(w[woff + (nrow - 1) * nrow + (ipivk - 1)]) + dpk2 > dpk2) {
        return iflag;
      }
      return 0;
    }
    let j = k;
    const kp1 = k + 1;
    let colmax = Math.abs(w[woff + (k - 1) * nrow + (ipivk - 1)]) / d[doff + ipivk - 1];
    for (let i = kp1; i <= nrow; i++) {
      const ipivi = ipivot[ipoff + i - 1];
      const awikdi = Math.abs(w[woff + (k - 1) * nrow + (ipivi - 1)]) / d[doff + ipivi - 1];
      if (awikdi <= colmax) continue;
      colmax = awikdi;
      j = i;
    }
    if (j !== k) {
      ipivk = ipivot[ipoff + j - 1];
      ipivot[ipoff + j - 1] = ipivot[ipoff + k - 1];
      ipivot[ipoff + k - 1] = ipivk;
      iflag = -iflag;
    }
    const dpk = d[doff + ipivk - 1];
    if (Math.abs(w[woff + (k - 1) * nrow + (ipivk - 1)]) + dpk <= dpk) return 0;
    const piv = w[woff + (k - 1) * nrow + (ipivk - 1)];
    for (let i = kp1; i <= nrow; i++) {
      const ipivi = ipivot[ipoff + i - 1];
      w[woff + (k - 1) * nrow + (ipivi - 1)] /= piv;
      const ratio = -w[woff + (k - 1) * nrow + (ipivi - 1)];
      for (let jj = kp1; jj <= ncol; jj++) {
        w[woff + (jj - 1) * nrow + (ipivi - 1)] += ratio * w[woff + (jj - 1) * nrow + (ipivk - 1)];
      }
    }
    k = kp1;
    if (k > last) return iflag;
  }
}
function shiftb(ai, aioff, ipivot, ipoff, nrowi, ncoli, last, ai1, ai1off, nrowi1, ncoli1) {
  const mmax = nrowi - last;
  const jmax = ncoli - last;
  if (mmax < 1 || jmax < 1) return;
  for (let m = 1; m <= mmax; m++) {
    const ip = ipivot[ipoff + last + m - 1];
    for (let j = 1; j <= jmax; j++) {
      ai1[ai1off + (j - 1) * nrowi1 + (m - 1)] = ai[aioff + (last + j - 1) * nrowi + (ip - 1)];
    }
  }
  if (jmax === ncoli1) return;
  for (let j = jmax + 1; j <= ncoli1; j++) {
    for (let m = 1; m <= mmax; m++) {
      ai1[ai1off + (j - 1) * nrowi1 + (m - 1)] = 0;
    }
  }
}
function fcblok(bloks, integs, nbloks, ipivot, scrtch) {
  let iflag = 1;
  let indexb = 1;
  let indexn = 1;
  let i = 1;
  for (; ; ) {
    const index = indexn;
    const nrow = integs[(i - 1) * 3 + 0];
    const ncol = integs[(i - 1) * 3 + 1];
    const last = integs[(i - 1) * 3 + 2];
    iflag = factrb(
      bloks,
      index - 1,
      ipivot,
      indexb - 1,
      scrtch,
      0,
      nrow,
      ncol,
      last,
      iflag
    );
    if (iflag === 0 || i === nbloks) return iflag;
    i = i + 1;
    indexn = nrow * ncol + index;
    shiftb(
      bloks,
      index - 1,
      ipivot,
      indexb - 1,
      nrow,
      ncol,
      last,
      bloks,
      indexn - 1,
      integs[(i - 1) * 3 + 0],
      integs[(i - 1) * 3 + 1]
    );
    indexb = indexb + nrow;
  }
}
function subfor(w, woff, ipivot, ipoff, nrow, last, b, boff, x, xoff) {
  let ip = ipivot[ipoff + 0];
  x[xoff + 0] = b[boff + ip - 1];
  if (nrow === 1) return;
  for (let k = 2; k <= nrow; k++) {
    ip = ipivot[ipoff + k - 1];
    const jmax = Math.min(k - 1, last);
    let sum = 0;
    for (let j = 1; j <= jmax; j++) {
      sum += w[woff + (j - 1) * nrow + (ip - 1)] * x[xoff + j - 1];
    }
    x[xoff + k - 1] = b[boff + ip - 1] - sum;
  }
  const nrowml = nrow - last;
  if (nrowml === 0) return;
  for (let k = last + 1; k <= nrow; k++) {
    b[boff + nrowml + k - 1] = x[xoff + k - 1];
  }
}
function subbak(w, woff, ipivot, ipoff, nrow, ncol, last, x, xoff) {
  let k = last;
  let ip = ipivot[ipoff + k - 1];
  let sum = 0;
  let skipAccum = k === ncol;
  for (; ; ) {
    if (!skipAccum) {
      for (let j = k + 1; j <= ncol; j++) {
        sum += w[woff + (j - 1) * nrow + (ip - 1)] * x[xoff + j - 1];
      }
    }
    skipAccum = false;
    x[xoff + k - 1] = (x[xoff + k - 1] - sum) / w[woff + (k - 1) * nrow + (ip - 1)];
    if (k === 1) return;
    k = k - 1;
    ip = ipivot[ipoff + k - 1];
    sum = 0;
  }
}
function sbblok(bloks, integs, nbloks, ipivot, b, x) {
  let index = 1;
  let indexb = 1;
  let indexx = 1;
  for (let i = 1; i <= nbloks; i++) {
    const nrow = integs[(i - 1) * 3 + 0];
    const last = integs[(i - 1) * 3 + 2];
    subfor(
      bloks,
      index - 1,
      ipivot,
      indexb - 1,
      nrow,
      last,
      b,
      indexb - 1,
      x,
      indexx - 1
    );
    index = nrow * integs[(i - 1) * 3 + 1] + index;
    indexb = indexb + nrow;
    indexx = indexx + last;
  }
  for (let jb = 1; jb <= nbloks; jb++) {
    const i = nbloks + 1 - jb;
    const nrow = integs[(i - 1) * 3 + 0];
    const ncol = integs[(i - 1) * 3 + 1];
    const last = integs[(i - 1) * 3 + 2];
    index = index - nrow * ncol;
    indexb = indexb - nrow;
    indexx = indexx - last;
    subbak(bloks, index - 1, ipivot, indexb - 1, nrow, ncol, last, x, indexx - 1);
  }
}

// ../netlib-ode/src/lsyslv.ts
function bldblk(x, ll, i, qoff, nrow, nc, z, df, alpho, ialpho, izeta, mode, prob, run, work, cb) {
  const { order, eqord, nonlin, consts: consts2 } = prob;
  const { k, ncomp, mstar, kd, kdm, m } = order;
  const { iter, n } = run;
  const { a, xi, vn, hi } = work;
  const vncol = consts2.vncol;
  const basef = new Float64Array(620);
  const dg = new Float64Array(40);
  const nk = mode === 2 ? nc + ncomp - 1 : nc;
  for (let j = nc; j <= nk; j++) {
    for (let l = 1; l <= kdm; l++) a[qoff + (l - 1) * nrow + (j - 1)] = 0;
  }
  if (mode === 1) {
    bspder(vn, 0, xi, n, x, i, basef, 2, order, eqord, hi);
    cb.dgsub(izeta, z, dg);
    if (!(iter >= 1 || nonlin === 0)) {
      let value = 0;
      for (let j = 1; j <= mstar; j++) value += dg[j - 1] * z[j - 1];
      alpho[ialpho - 1] = value;
    }
    let iq = 0;
    let iqm = mstar;
    let idg = 0;
    let ibasef = 0;
    const id = nc;
    for (let jcomp = 1; jcomp <= ncomp; jcomp++) {
      const mj = m[jcomp - 1];
      const mj1 = mj + 1;
      const kmj = k - mj;
      for (let l = 1; l <= mj; l++) {
        for (let j = 1; j <= mj; j++) {
          a[qoff + (iq + l - 1) * nrow + (id - 1)] += dg[idg + j - 1] * basef[ibasef + j - 1];
        }
        ibasef += mj1;
      }
      if (kmj > 0) {
        for (let l = 1; l <= kmj; l++) {
          for (let j = 1; j <= mj; j++) {
            a[qoff + (iqm + l - 1) * nrow + (id - 1)] += dg[idg + j - 1] * basef[ibasef + j - 1];
          }
          ibasef += mj1;
        }
      }
      for (let l = 1; l <= mj; l++) {
        for (let j = 1; j <= mj; j++) {
          a[qoff + (iq + kd + l - 1) * nrow + (id - 1)] += dg[idg + j - 1] * basef[ibasef + j - 1];
        }
        ibasef += mj1;
      }
      idg += mj;
      iq += mj;
      iqm += kmj;
    }
    return ialpho;
  }
  bspder(vncol, (ll - 1) * VN_SIZE, xi, n, x, i, basef, 3, order, eqord, hi);
  cb.dfsub(x, z, df);
  for (let jj = 1; jj <= ncomp; jj++) {
    if (!(iter >= 1 || nonlin === 0)) {
      ialpho += 1;
      let value = 0;
      for (let j = 1; j <= mstar; j++) value += df[(j - 1) * ncomp + (jj - 1)] * z[j - 1];
      alpho[ialpho - 1] -= value;
    }
    const id = jj + nc - 1;
    let iq = 0;
    let iqm = mstar;
    let idf = 0;
    let ibasef = 0;
    for (let jcomp = 1; jcomp <= ncomp; jcomp++) {
      const mj = m[jcomp - 1];
      const mj1 = mj + 1;
      const kmj = k - mj;
      for (let l = 1; l <= mj; l++) {
        if (jcomp === jj) {
          a[qoff + (iq + l - 1) * nrow + (id - 1)] = basef[ibasef + mj1 - 1];
        }
        for (let j = 1; j <= mj; j++) {
          a[qoff + (iq + l - 1) * nrow + (id - 1)] -= df[(idf + j - 1) * ncomp + (jj - 1)] * basef[ibasef + j - 1];
        }
        ibasef += mj1;
      }
      if (kmj > 0) {
        for (let l = 1; l <= kmj; l++) {
          if (jcomp === jj) {
            a[qoff + (iqm + l - 1) * nrow + (id - 1)] = basef[ibasef + mj1 - 1];
          }
          for (let j = 1; j <= mj; j++) {
            a[qoff + (iqm + l - 1) * nrow + (id - 1)] -= df[(idf + j - 1) * ncomp + (jj - 1)] * basef[ibasef + j - 1];
          }
          ibasef += mj1;
        }
      }
      for (let l = 1; l <= mj; l++) {
        if (jcomp === jj) {
          a[qoff + (iq + kd + l - 1) * nrow + (id - 1)] = basef[ibasef + mj1 - 1];
        }
        for (let j = 1; j <= mj; j++) {
          a[qoff + (iq + kd + l - 1) * nrow + (id - 1)] -= df[(idf + j - 1) * ncomp + (jj - 1)] * basef[ibasef + j - 1];
        }
        ibasef += mj1;
      }
      idf += mj;
      iq += mj;
      iqm += kmj;
    }
  }
  return ialpho;
}
function lsyslv(mode, alpha, alpho, prob, run, work, cb) {
  const { order, zeta, aright, consts: consts2 } = prob;
  const { k, ncomp, mstar, kd, kdm, m } = order;
  const { iter, iguess, precis, n, nold, nalpha } = run;
  const { xi, xiold, xij, aldif, rhs, a, ipiv, integs, vn, hi } = work;
  const vncol = consts2.vncol;
  const m1 = mode + 1;
  const z = new Float64Array(Math.max(mstar, 1));
  const f = new Float64Array(Math.max(ncomp, 1));
  const df = new Float64Array(Math.max(ncomp * mstar, 1));
  const dmval = new Float64Array(Math.max(ncomp, 1));
  const dummy = new Float64Array(Math.max(ncomp, 1));
  let iflag = 1;
  let rnorm = 0;
  if (mode === 3) {
    sbblok(a, integs, n, ipiv, rhs, alpha);
    return { iflag, rnorm };
  }
  if (mode === 0) {
    for (let ix = 1; ix <= mstar; ix++) z[ix - 1] = 0;
  }
  let irhs = 0;
  let ia = 1;
  let izeta = 1;
  let lside = 0;
  let ialpho = 0;
  if (!(iter >= 1 || mode === 2)) {
    for (let i = 1; i <= n; i++) {
      integs[(i - 1) * 3 + 1] = kdm;
      let nrow;
      if (i < n) {
        integs[(i - 1) * 3 + 2] = kd;
        for (; ; ) {
          if (lside === mstar) break;
          if (zeta[lside + 1 - 1] >= xi[i + 1 - 1]) break;
          lside = lside + 1;
        }
        nrow = kd + lside;
      } else {
        integs[(i - 1) * 3 + 2] = kdm;
        lside = mstar;
        nrow = kd + lside;
      }
      integs[(i - 1) * 3 + 0] = nrow;
    }
  }
  for (let i = 1; i <= n; i++) {
    let xil = xi[1 - 1];
    if (i > 1) xil = xi[i - 1 - 1];
    let xir = xi[n + 1 - 1];
    if (i < n) xir = xi[i + 2 - 1];
    hi[0] = 1 / (xi[i + 1 - 1] - xil);
    hi[1] = 1 / (xi[i + 1 - 1] - xi[i - 1]);
    hi[2] = 1 / (xir - xi[i - 1]);
    const nrow = integs[(i - 1) * 3 + 0];
    let ii = i;
    const icolc = (i - 1) * k;
    let id = irhs + izeta - 1;
    let blockDone = false;
    for (let ll = 1; ll <= k && !blockDone; ll++) {
      let xx = xij[icolc + ll - 1];
      let label = 100;
      stateMachine: for (; ; ) {
        if (label === 100) {
          if (izeta > mstar || zeta[izeta - 1] >= xx) {
            label = 160;
            continue;
          }
          label = 110;
          continue;
        }
        if (label === 110) {
          id = id + 1;
          ialpho = ialpho + 1;
          if (mode !== 0) {
            if (iguess === 1) {
              cb.solutn(zeta[izeta - 1], z, dmval);
            } else {
              const r = approx(ii, zeta[izeta - 1], z, vn, xiold, nold, aldif, k, ncomp, m, mstar, 1, dummy, 0, precis);
              ii = r.i;
            }
          }
          if (mode !== 2) {
            const g = cb.gsub(izeta, z);
            rhs[id - 1] = -g;
            rnorm = rnorm + g * g;
          }
          if (mode !== 1) {
            ialpho = bldblk(zeta[izeta - 1], ll, i, ia - 1, nrow, id - irhs, z, df, alpho, ialpho, izeta, 1, prob, run, work, cb);
          }
          izeta = izeta + 1;
          if (izeta > mstar && zeta[mstar - 1] >= Math.min(xx, aright)) {
            blockDone = true;
            break stateMachine;
          }
          if (xx > xi[n + 1 - 1]) {
            label = 260;
            continue;
          }
          label = 100;
          continue;
        }
        if (label === 160) {
          if (iguess === 1) {
            cb.solutn(xx, z, dmval);
            label = mode === 1 ? 190 : 250;
            continue;
          }
          if (m1 === 1) label = 210;
          else if (m1 === 2) label = 170;
          else label = 230;
          continue;
        }
        if (label === 170) {
          if (iter < 1) {
            const r = approx(ii, xx, z, vn, xiold, nold, aldif, k, ncomp, m, mstar, 1, dmval, 1, precis);
            ii = r.i;
          } else {
            approx(i, xx, z, vncol, xiold, nold, aldif, k, ncomp, m, mstar, 3, dmval, 1, precis, (ll - 1) * VN_SIZE);
          }
          label = 190;
          continue;
        }
        if (label === 190) {
          cb.fsub(xx, z, f);
          for (let j = 1; j <= ncomp; j++) {
            id = id + 1;
            const value = dmval[j - 1] - f[j - 1];
            rhs[id - 1] = -value;
            rnorm = rnorm + value * value;
            if (iter < 1) {
              ialpho = ialpho + 1;
              alpho[ialpho - 1] = dmval[j - 1];
            }
          }
          label = 260;
          continue;
        }
        if (label === 210) {
          cb.fsub(xx, z, f);
          for (let j = 1; j <= ncomp; j++) {
            id = id + 1;
            rhs[id - 1] = f[j - 1];
          }
          id = id - ncomp;
          label = 250;
          continue;
        }
        if (label === 230) {
          if (iter < 1) {
            const r = approx(ii, xx, z, vn, xiold, nold, aldif, k, ncomp, m, mstar, 1, dummy, 0, precis);
            ii = r.i;
          } else {
            approx(i, xx, z, vncol, xiold, nold, aldif, k, ncomp, m, mstar, 3, dummy, 0, precis, (ll - 1) * VN_SIZE);
          }
          label = 250;
          continue;
        }
        if (label === 250) {
          ialpho = bldblk(xx, ll, i, ia - 1, nrow, id - irhs + 1, z, df, alpho, ialpho, izeta, 2, prob, run, work, cb);
          id = id + ncomp;
          label = 260;
          continue;
        }
        if (ll < k) break stateMachine;
        if (i < n || izeta > mstar) {
          blockDone = true;
          break stateMachine;
        }
        xx = xi[n + 1 - 1] + 1;
        label = 110;
      }
    }
    irhs = irhs + nrow;
    ia = ia + nrow * kdm;
  }
  if (mode === 1) {
    rnorm = Math.sqrt(rnorm / nalpha);
    return { iflag, rnorm };
  }
  iflag = fcblok(a, integs, n, ipiv, alpha);
  if (iflag === 0) return { iflag, rnorm };
  sbblok(a, integs, n, ipiv, rhs, alpha);
  if (iter >= 1 || mode !== 2) return { iflag, rnorm };
  ialpho = 0;
  irhs = 0;
  let isto = 0;
  for (let i = 1; i <= n; i++) {
    const nrow = integs[(i - 1) * 3 + 0];
    irhs = irhs + isto;
    const istart = isto + 1;
    isto = nrow - kd;
    for (let j = istart; j <= nrow; j++) {
      irhs = irhs + 1;
      ialpho = ialpho + 1;
      rhs[irhs - 1] = rhs[irhs - 1] + alpho[ialpho - 1];
    }
  }
  sbblok(a, integs, n, ipiv, rhs, alpho);
  for (let i = 1; i <= nalpha; i++) alpho[i - 1] = alpho[i - 1] - alpha[i - 1];
  return { iflag, rnorm };
}

// ../netlib-ode/src/contrl.ts
function contrl(prob, run, work, cb) {
  const { order, nonlin, tolin, ntol } = prob;
  const { k, ncomp, mstar, mnsum, m } = order;
  const { alpha, dalpha, ealpha, aldif, a, xi, xiold } = work;
  const relmin = 1e-3;
  const rstart = 0.01;
  const lmtfrz = 4;
  let check = 0;
  for (let i = 1; i <= ntol; i++) check = Math.max(tolin[i - 1], check);
  const falpha = run.nalpha;
  let imesh = 1;
  let icon = nonlin === 0 ? 1 : 0;
  let lconv = 0;
  let iflag = 1;
  let relax = 1;
  let rnorm = 0;
  let rnold = 0;
  let anscl = 0;
  let anorm = 0;
  let anfix = 0;
  let ipred = 0;
  let rlxold = 0;
  let ifrz = 0;
  let naldif = 0;
  const copyMeshForward = () => {
    const np1 = run.n + 1;
    for (let i = 1; i <= np1; i++) xiold[i - 1] = xi[i - 1];
    run.nold = run.n;
  };
  let label = 20;
  for (; ; ) {
    if (label === 20) {
      run.iter = 0;
      naldif = run.n * k * mstar + mnsum;
      if (nonlin > 0) {
        label = 60;
        continue;
      }
      iflag = lsyslv(0, alpha, ealpha, prob, run, work, cb).iflag;
      if (iflag === 0) return iflag;
      copyMeshForward();
      appdif(aldif, alpha, xi, run.n, k, ncomp, m, mstar);
      label = 450;
      continue;
    }
    if (label === 60) {
      relax = 1;
      if (run.icare === 1 || run.icare === -1) relax = rstart;
      if (icon === 0) {
        label = 140;
        continue;
      }
      run.ifreez = 0;
      rnorm = lsyslv(1, dalpha, alpha, prob, run, work, cb).rnorm;
      label = 70;
      continue;
    }
    if (label === 70) {
      rnold = rnorm;
      const r = lsyslv(2 + run.ifreez, dalpha, alpha, prob, run, work, cb);
      iflag = r.iflag;
      rnorm = r.rnorm;
      if (iflag === 0) return iflag;
      if (run.ifreez === 1) {
        label = 90;
        continue;
      }
      run.iter = run.iter + 1;
      ifrz = 0;
      copyMeshForward();
      label = 90;
      continue;
    }
    if (label === 90) {
      for (let i = 1; i <= run.nalpha; i++) alpha[i - 1] = alpha[i - 1] + dalpha[i - 1];
      appdif(aldif, alpha, xi, run.n, k, ncomp, m, mstar);
      rnorm = lsyslv(1, dalpha, alpha, prob, run, work, cb).rnorm;
      if (rnorm < run.precis) {
        label = 405;
        continue;
      }
      if (rnorm <= rnold) {
        label = 120;
        continue;
      }
      icon = 0;
      relax = rstart;
      for (let i = 1; i <= run.nalpha; i++) alpha[i - 1] = alpha[i - 1] - dalpha[i - 1];
      appdif(aldif, alpha, xi, run.n, k, ncomp, m, mstar);
      run.iter = 0;
      label = 140;
      continue;
    }
    if (label === 120) {
      if (run.ifreez === 1) {
        label = 130;
        continue;
      }
      run.ifreez = 1;
      label = 70;
      continue;
    }
    if (label === 130) {
      ifrz = ifrz + 1;
      if (ifrz >= lmtfrz) run.ifreez = 0;
      if (rnold < 4 * rnorm) run.ifreez = 0;
      label = 300;
      continue;
    }
    if (label === 140) {
      rnorm = lsyslv(1, dalpha, alpha, prob, run, work, cb).rnorm;
      label = 150;
      continue;
    }
    if (label === 150) {
      rnold = rnorm;
      if (run.iter >= run.limit) {
        label = 420;
        continue;
      }
      iflag = lsyslv(2, dalpha, alpha, prob, run, work, cb).iflag;
      if (iflag === 0) return iflag;
      if (run.iter > 0) {
        label = 170;
        continue;
      }
      if (run.iguess === 1) run.iguess = 0;
      copyMeshForward();
      label = 190;
      continue;
    }
    if (label === 170) {
      let andif = 0;
      for (let i = 1; i <= run.nalpha; i++) {
        andif += (ealpha[i - 1] - dalpha[i - 1]) ** 2 / (alpha[i - 1] * alpha[i - 1] + run.precis);
      }
      relax = relax * anscl / Math.max(Math.sqrt(andif / falpha), run.precis);
      if (relax > 1) relax = 1;
      label = 190;
      continue;
    }
    if (label === 190) {
      rlxold = relax;
      ipred = 1;
      run.iter = run.iter + 1;
      for (let i = 1; i <= run.nalpha; i++) {
        alpha[i - 1] = alpha[i - 1] + relax * dalpha[i - 1];
      }
      label = 210;
      continue;
    }
    if (label === 210) {
      appdif(aldif, alpha, xi, run.n, k, ncomp, m, mstar);
      rnorm = lsyslv(1, dalpha, alpha, prob, run, work, cb).rnorm;
      lsyslv(3, ealpha, alpha, prob, run, work, cb);
      anorm = 0;
      anfix = 0;
      anscl = 0;
      for (let i = 1; i <= run.nalpha; i++) {
        anscl += dalpha[i - 1] * dalpha[i - 1] / (alpha[i - 1] * alpha[i - 1] + run.precis);
        let scale = alpha[i - 1] - relax * dalpha[i - 1];
        scale = 1 / (scale * scale + run.precis);
        anorm += dalpha[i - 1] * dalpha[i - 1] * scale;
        anfix += ealpha[i - 1] * ealpha[i - 1] * scale;
      }
      anorm = Math.sqrt(anorm / falpha);
      anfix = Math.sqrt(anfix / falpha);
      anscl = Math.sqrt(anscl / falpha);
      if (anfix < run.precis || rnorm < run.precis) {
        label = 405;
        continue;
      }
      if (anfix > anorm) {
        label = 250;
        continue;
      }
      if (anfix <= check) {
        label = 290;
        continue;
      }
      if (ipred !== 1) {
        label = 150;
        continue;
      }
      label = 250;
      continue;
    }
    if (label === 250) {
      if (run.iter >= run.limit) {
        label = 420;
        continue;
      }
      ipred = 0;
      const arg = (anfix / anorm - 1) / relax + 1;
      if (arg < 0) {
        label = 150;
        continue;
      }
      if (arg <= 0.25 * relax + 0.125 * relax ** 2) {
        label = 260;
        continue;
      }
      const factor = -1 + Math.sqrt(1 + 8 * arg);
      if (Math.abs(factor - 1) < 0.1 * factor) {
        label = 150;
        continue;
      }
      relax = relax / factor;
      label = 270;
      continue;
    }
    if (label === 260) {
      if (relax >= 0.9) {
        label = 150;
        continue;
      }
      relax = 1;
      label = 270;
      continue;
    }
    if (label === 270) {
      if (relax < relmin) {
        label = 430;
        continue;
      }
      for (let i = 1; i <= run.nalpha; i++) {
        alpha[i - 1] = alpha[i - 1] + (relax - rlxold) * dalpha[i - 1];
      }
      rlxold = relax;
      label = 210;
      continue;
    }
    if (label === 290) {
      appdif(a, ealpha, xi, run.n, k, ncomp, m, mstar);
      label = 310;
      continue;
    }
    if (label === 300) {
      appdif(ealpha, dalpha, xi, run.n, k, ncomp, m, mstar);
      label = 310;
      continue;
    }
    if (label === 310) {
      let inn = 0;
      let jcol = 0;
      let jinit = 1;
      let converged = true;
      outer: for (let i = 1; i <= ntol; i++) {
        const jend = prob.consts.jtol[i - 1] - 1;
        if (jend >= jinit) {
          for (let j = jinit; j <= jend; j++) {
            const mj = m[j - 1];
            const nalphj2 = run.n * k + mj;
            jcol = jcol + mj;
            inn = inn + mj * nalphj2;
          }
        }
        jinit = jend + 1;
        const nalphj = run.n * k + m[jinit - 1];
        let inn1 = inn;
        let jcol1 = jcol + 1;
        while (jcol1 !== prob.ltol[i - 1]) {
          inn1 = inn1 + nalphj;
          jcol1 = jcol1 + 1;
        }
        const iinit = jcol1 - jcol;
        for (let ii = iinit; ii <= nalphj; ii++) {
          const inx = inn1 + ii;
          const ref = tolin[i - 1] * (Math.abs(aldif[inx - 1]) + 1);
          const val = icon === 1 ? Math.abs(ealpha[inx - 1]) : Math.abs(a[inx - 1]);
          if (val > ref) {
            converged = false;
            break outer;
          }
        }
      }
      if (!converged) {
        label = 410;
        continue;
      }
      if (icon === 1) {
        label = 450;
        continue;
      }
      for (let i = 1; i <= naldif; i++) aldif[i - 1] = aldif[i - 1] + a[i - 1];
      for (let i = 1; i <= run.nalpha; i++) alpha[i - 1] = alpha[i - 1] + ealpha[i - 1];
      label = 405;
      continue;
    }
    if (label === 405) {
      icon = 1;
      if (run.icare === -1) run.icare = 0;
      label = 450;
      continue;
    }
    if (label === 410) {
      label = icon === 0 ? 150 : 70;
      continue;
    }
    if (label === 420 || label === 430) {
      iflag = -2;
      lconv = lconv + 1;
      if (run.icare === 2 && lconv > 1) return iflag;
      if (run.icare === 0) run.icare = -1;
      label = 460;
      continue;
    }
    if (label === 450) {
      const ifin = errchk(imesh, prob, run, work).ifin;
      if (!(imesh === 1 || ifin === 0 && run.icare !== 2)) {
        return 1;
      }
      label = 460;
      continue;
    }
    if (label === 460) {
      imesh = 1;
      if (icon === 0 || run.mshnum >= run.mshlmt || run.mshalt >= run.mshlmt) imesh = 2;
      if (run.mshalt >= run.mshlmt && run.mshnum < run.mshlmt) run.mshalt = 1;
      imesh = newmsh(imesh, prob, run, work);
      if (run.n > run.nmax) {
        run.n = Math.trunc(run.n / 2);
        return -1;
      }
      if (icon === 0) imesh = 1;
      if (run.icare === 1) icon = 0;
      label = 20;
      continue;
    }
    return iflag;
  }
}

// ../netlib-ode/src/colsys.ts
var ColsysInputError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ColsysInputError";
  }
};
var ColsysSingularError = class extends Error {
  constructor(message = "the collocation matrix is singular") {
    super(message);
    this.name = "ColsysSingularError";
  }
};
var ColsysNoConvergenceError = class extends Error {
  constructor(message = "the nonlinear iteration did not converge") {
    super(message);
    this.name = "ColsysNoConvergenceError";
  }
};
var ColsysStorageError = class extends Error {
  constructor(message = "the expected number of subintervals exceeds maxSubintervals") {
    super(message);
    this.name = "ColsysStorageError";
  }
};
function machinePrecis() {
  let precis = 1;
  for (; ; ) {
    precis = precis / 2;
    if (precis + 1 <= 1) break;
  }
  return precis * 100;
}
function solveBvp(problem) {
  const { ncomp, m, aleft, aright, zeta, ltol, tol } = problem;
  const nonlin = problem.nonlinear ? 1 : 0;
  if (ncomp < 1 || ncomp > 20) {
    throw new ColsysInputError(`ncomp must be in 1..20, got ${ncomp}`);
  }
  if (m.length !== ncomp) {
    throw new ColsysInputError(`m must have length ncomp=${ncomp}`);
  }
  if (m[0] < 1 || m[ncomp - 1] > 4) {
    throw new ColsysInputError("orders must satisfy 1 <= m(1) and m(ncomp) <= 4");
  }
  for (let i = 2; i <= ncomp; i++) {
    if (m[i - 1 - 1] > m[i - 1]) {
      throw new ColsysInputError("orders m must be nondecreasing");
    }
  }
  let mstar = 0;
  let mnsum = 0;
  for (let i = 0; i < ncomp; i++) {
    mnsum += m[i] * m[i];
    mstar += m[i];
  }
  if (mstar > 40) throw new ColsysInputError("mstar = sum(m) must be <= 40");
  if (zeta.length !== mstar) {
    throw new ColsysInputError(`zeta must have length mstar=${mstar}`);
  }
  const ntol = ltol.length;
  if (ntol < 1 || ntol > mstar) {
    throw new ColsysInputError(`ntol must be in 1..${mstar}`);
  }
  if (tol.length !== ntol) throw new ColsysInputError("tol and ltol length mismatch");
  let k = problem.k ?? 0;
  if (k === 0) k = Math.max(m[ncomp - 1] + 1, 5 - m[ncomp - 1]);
  if (k < 0 || k > 7) throw new ColsysInputError(`k must be in 1..7, got ${k}`);
  let n = problem.n ?? 5;
  if (n < 0) throw new ColsysInputError("n must be >= 0");
  if (n === 0) n = 5;
  const fixpntArr = problem.fixpnt ?? [];
  const nfxpnt = fixpntArr.length;
  const nmax = problem.maxSubintervals ?? 100;
  const order = makeOrder(ncomp, m, k);
  const eqord = makeEqord(ncomp, m, k);
  const c = consts(k, ncomp, m, ntol, ltol, tol);
  const kd = k * ncomp;
  const kdm = kd + mstar;
  let nrec = 0;
  for (let i = 1; i <= mstar; i++) if (zeta[i - 1] >= aright) nrec++;
  if (nmax < n) throw new ColsysStorageError("maxSubintervals is smaller than n");
  if (nmax < nfxpnt + 1) {
    throw new ColsysStorageError("maxSubintervals is too small for the fixed points");
  }
  const work = {
    xi: new Float64Array(nmax + 1),
    xiold: new Float64Array(nmax + 1),
    xij: new Float64Array(k * nmax),
    alpha: new Float64Array(nmax * kd + mstar),
    dalpha: new Float64Array(nmax * kd + mstar),
    ealpha: new Float64Array(nmax * k * mstar + mnsum),
    aldif: new Float64Array(nmax * k * mstar + mnsum),
    rhs: new Float64Array(nmax * (kdm - nrec) + nrec),
    a: new Float64Array(kdm * (nmax * (kdm - nrec) + nrec)),
    ipiv: new Int32Array(nmax * kdm),
    integs: new Int32Array(3 * nmax),
    vn: new Float64Array(66),
    hi: new Float64Array(3),
    slope: new Float64Array(nmax + 1),
    accum: new Float64Array(nmax + 1),
    valstr: new Float64Array(4 * mstar * nmax),
    fixpnt: new Float64Array(fixpntArr),
    nfxpnt
  };
  const prob = {
    order,
    eqord,
    zeta: new Float64Array(zeta),
    aleft,
    aright,
    nonlin,
    consts: c,
    ltol: ltol.slice(),
    tolin: tol.slice(),
    ntol
  };
  const run = {
    n,
    nold: n,
    nmax,
    nalpha: n * kd + mstar,
    mshflg: 0,
    mshnum: 1,
    mshlmt: 3,
    mshalt: 1,
    precis: machinePrecis(),
    iter: 0,
    limit: 40,
    icare: 0,
    iprint: 1,
    iguess: 0,
    ifreez: 0
  };
  run.iguess = problem.solutn ? 1 : 0;
  const cb = {
    fsub: problem.fsub,
    dfsub: problem.dfsub,
    gsub: problem.gsub,
    dgsub: problem.dgsub,
    solutn: problem.solutn ?? (() => {
      throw new ColsysInputError("solutn called but no initial guess was provided");
    })
  };
  newmsh(3, prob, run, work);
  const np1 = run.n + 1;
  for (let i = 1; i <= np1; i++) work.xiold[i - 1] = work.xi[i - 1];
  run.nold = run.n;
  if (nonlin > 0 && run.iguess !== 1) {
    work.alpha.fill(0);
    appdif(work.aldif, work.alpha, work.xi, run.n, k, ncomp, m, mstar);
  }
  const iflag = contrl(prob, run, work, cb);
  if (iflag === 0) throw new ColsysSingularError();
  if (iflag === -2) throw new ColsysNoConvergenceError();
  if (iflag === -1) throw new ColsysStorageError();
  const nFinal = run.n;
  const mesh = work.xi.slice(0, nFinal + 1);
  const aldif = work.aldif;
  const xi = work.xi;
  const precis = run.precis;
  const evalVn = new Float64Array(66);
  const dmval = new Float64Array(ncomp);
  return {
    evaluate(x) {
      const z = new Float64Array(mstar);
      approx(1, x, z, evalVn, xi, nFinal, aldif, k, ncomp, m, mstar, 1, dmval, 0, precis);
      return z;
    },
    evaluateWithDerivatives(x) {
      const z = new Float64Array(mstar);
      const dm = new Float64Array(ncomp);
      approx(1, x, z, evalVn, xi, nFinal, aldif, k, ncomp, m, mstar, 1, dm, 1, precis);
      return { z, dmval: dm };
    },
    mesh,
    n: nFinal,
    k,
    ncomp,
    mstar,
    m: m.slice()
  };
}
export {
  ColsysInputError,
  ColsysNoConvergenceError,
  ColsysSingularError,
  ColsysStorageError,
  VN_SIZE,
  appdif,
  approx,
  bspder,
  bspfix,
  bspvar,
  consts,
  factrb,
  fcblok,
  horder,
  lsyslv,
  makeEqord,
  makeOrder,
  sbblok,
  shiftb,
  solveBvp,
  subbak,
  subfor
};
