import { hsl2rgb01 } from "./sweep.js";
import { createFrameLoop } from "./lib/frame-loop.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// Interactive animated traversal visualization. Each frame advances the
// canonical sweep by a few pixel deposits along the primary axis; once a
// ray (strided row) completes, the next ray begins. After the full grid
// fills, the figure pauses briefly and restarts. The deposit scheme —
// nearest-neighbor or (1−f, f) linear — is chosen by the `weighted`
// accessor and the animation restarts whenever that changes.
export function createTraversalFigure({
  width,
  gridW = 64,
  gridH = 36,
  angle,
  weighted,
  showRayStarts = true,
  stepsPerFrame = 3,
  pauseMs = 1500,
}) {
  const cwPx = Math.min(640, width);
  const chPx = Math.round((cwPx * gridH) / gridW);

  const canvas = document.createElement("canvas");
  canvas.width = gridW;
  canvas.height = gridH;
  canvas.style.cssText = `width:${cwPx}px; height:${chPx}px; image-rendering:pixelated; display:block;`;

  const overlaySvg = document.createElementNS(SVG_NS, "svg");
  overlaySvg.setAttribute("width", cwPx);
  overlaySvg.setAttribute("height", chPx);
  overlaySvg.setAttribute("viewBox", `0 0 ${gridW} ${gridH}`);
  overlaySvg.style.cssText =
    "position:absolute; left:0; top:0; pointer-events:none; overflow:visible;";

  const vbScale = gridW / cwPx;
  const handleR = Math.min(gridW, gridH) * 0.4;
  const handleG = document.createElementNS(SVG_NS, "g");
  handleG.setAttribute(
    "style",
    "pointer-events:auto; cursor:grab; touch-action:none;",
  );
  const haloC = document.createElementNS(SVG_NS, "circle");
  haloC.setAttribute("r", String(24 * vbScale));
  haloC.setAttribute("fill", "rgba(26,107,240,0.22)");
  handleG.appendChild(haloC);
  const hitC = document.createElementNS(SVG_NS, "circle");
  hitC.setAttribute("r", String(28 * vbScale));
  hitC.setAttribute("fill", "#000");
  hitC.setAttribute("fill-opacity", "0");
  handleG.appendChild(hitC);
  const dotC = document.createElementNS(SVG_NS, "circle");
  dotC.setAttribute("r", String(8 * vbScale));
  dotC.setAttribute("fill", "#1a6bf0");
  dotC.setAttribute("stroke", "#fff");
  dotC.setAttribute("stroke-width", String(3 * vbScale));
  handleG.appendChild(dotC);
  overlaySvg.appendChild(handleG);

  function placeHandle(deg) {
    const rad = (deg * Math.PI) / 180;
    const hx = gridW / 2 - handleR * Math.cos(rad);
    const hy = gridH / 2 + handleR * Math.sin(rad);
    handleG.setAttribute("transform", `translate(${hx}, ${hy})`);
  }

  let dragging = false;
  function angleFromEvent(e) {
    const rect = overlaySvg.getBoundingClientRect();
    const sx = gridW / rect.width;
    const sy = gridH / rect.height;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top) * sy;
    let deg = (Math.atan2(my - gridH / 2, -(mx - gridW / 2)) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return Math.round(deg * 2) / 2;
  }
  handleG.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    try { handleG.setPointerCapture(e.pointerId); } catch (_) {}
    handleG.style.cursor = "grabbing";
    e.preventDefault();
    e.stopPropagation();
  });
  handleG.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const stepped = angleFromEvent(e);
    if (angle.get() !== stepped) angle.set(stepped);
    e.stopPropagation();
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    try { handleG.releasePointerCapture(e.pointerId); } catch (_) {}
    handleG.style.cursor = "grab";
    e.stopPropagation();
  };
  handleG.addEventListener("pointerup", endDrag);
  handleG.addEventListener("pointercancel", endDrag);

  const container = document.createElement("div");
  // touch-action:none on the outer HTML container so a finger-drag
  // moves the handle instead of scrolling the page. Setting it only
  // on the inner SVG <g> isn't reliably honoured by mobile browsers;
  // the sun-handle figure solves this the same way.
  container.style.cssText =
    "position:relative; display:inline-block; touch-action:none;";
  container.appendChild(canvas);
  container.appendChild(overlaySvg);

  const figure = document.createElement("figure");
  figure.appendChild(container);
  const figcaption = document.createElement("figcaption");
  figcaption.innerHTML = `Drag the blue handle to sweep through all 360°. Pixels fill in along
          each ray (primary axis), then the sweep advances to the next ray
          (strided axis); blue dots mark each ray's starting pixel. Toggle the
          deposit scheme to compare nearest-neighbor (all weight on one row,
          visible banding) with <code>(1−f, f)</code> linear interpolation
          (even fill).`;
  figure.appendChild(figcaption);

  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(gridW, gridH);
  const px = img.data;

  const rAcc = new Float32Array(gridW * gridH);
  const gAcc = new Float32Array(gridW * gridH);
  const bAcc = new Float32Array(gridW * gridH);
  const wAcc = new Float32Array(gridW * gridH);
  const startMask = new Uint8Array(gridW * gridH);
  const seedR = new Uint8Array(gridW * gridH);
  const seedG = new Uint8Array(gridW * gridH);
  const seedB = new Uint8Array(gridW * gridH);

  function clearBuffers() {
    rAcc.fill(0); gAcc.fill(0); bAcc.fill(0); wAcc.fill(0);
    startMask.fill(0);
    px.fill(0);
  }

  function paintPixel(idx) {
    const j = idx * 4;
    if (showRayStarts && startMask[idx]) {
      px[j] = seedR[idx]; px[j + 1] = seedG[idx]; px[j + 2] = seedB[idx];
      px[j + 3] = 255;
      return;
    }
    const w = wAcc[idx];
    if (w <= 0) {
      px[j] = 0; px[j + 1] = 0; px[j + 2] = 0; px[j + 3] = 0;
      return;
    }
    const inv = 1 / w;
    px[j] = Math.max(0, Math.min(255, rAcc[idx] * inv * 255));
    px[j + 1] = Math.max(0, Math.min(255, gAcc[idx] * inv * 255));
    px[j + 2] = Math.max(0, Math.min(255, bAcc[idx] * inv * 255));
    px[j + 3] = Math.max(0, Math.min(255, w * 255));
  }

  function buildTraversal(angleDeg) {
    const theta = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(theta);
    const dy = -Math.sin(theta);
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const swap = ady > adx;
    const flipX = dx < 0;
    const flipY = dy < 0;
    const viewW = swap ? gridH : gridW;
    const viewH = swap ? gridW : gridH;
    const ndx = swap ? ady : adx;
    const ndy = swap ? adx : ady;
    let m = ndx === 0 ? 0 : ndy / ndx;
    if (m < 1e-12) m = 0;
    else if (m > 1 - 1e-12) m = 1;
    const bMin = -Math.ceil(m * (viewW - 1));
    const bMax = viewH - 1;
    const toOriginal = (cx, cy) => {
      let ox = swap ? cy : cx;
      let oy = swap ? cx : cy;
      if (flipX) ox = gridW - 1 - ox;
      if (flipY) oy = gridH - 1 - oy;
      return oy * gridW + ox;
    };
    const oxC = Math.floor(gridW / 2);
    const oyC = Math.floor(gridH / 2);
    const oxP = flipX ? gridW - 1 - oxC : oxC;
    const oyP = flipY ? gridH - 1 - oyC : oyC;
    const cxC = swap ? oyP : oxP;
    const cyC = swap ? oxP : oyP;
    const bCenter = Math.round(cyC - m * cxC);

    const rays = [];
    let rayIdx = 0;
    for (let b = bMax; b >= bMin; b--) {
      const isCenter = b === bCenter;
      const hue = (rayIdx * 47) % 360;
      const color = isCenter ? [1, 0, 0] : hsl2rgb01(hue, 0.45, 0.72);
      const seedColor = isCenter ? [0.55, 0, 0] : hsl2rgb01(hue, 0.9, 0.4);
      const steps = [];
      for (let cx = 0; cx < viewW; cx++) {
        const y = b + m * cx;
        const yi = Math.floor(y);
        const f = y - yi;
        const yj = yi + 1;
        const loIn = yi >= 0 && yi < viewH;
        const hiIn = yj >= 0 && yj < viewH;
        if (!loIn && !hiIn) continue;
        steps.push({
          f,
          iLo: loIn ? toOriginal(cx, yi) : -1,
          iHi: hiIn ? toOriginal(cx, yj) : -1,
        });
      }
      if (steps.length === 0) continue;
      rays.push({ color, seedColor, isCenter, steps });
      rayIdx++;
    }
    return rays;
  }

  let rays = [];
  let currentAngle = NaN;
  let currentWeighted = null;
  let rayIdx = 0;
  let stepIdx = 0;
  let pauseUntil = 0;

  // Deposit one step's weight/colour contribution into the accumulators.
  // Seed-point marking is handled up front in markAllRaySeeds so the
  // animation doesn't need to track a "have we started this ray yet"
  // flag per frame.
  function depositStep(ray, step) {
    const [rr, gg, bb] = ray.color;
    if (currentWeighted) {
      if (step.iLo >= 0) {
        const w = 1 - step.f;
        wAcc[step.iLo] += w;
        rAcc[step.iLo] += w * rr;
        gAcc[step.iLo] += w * gg;
        bAcc[step.iLo] += w * bb;
      }
      if (step.iHi >= 0) {
        const w = step.f;
        wAcc[step.iHi] += w;
        rAcc[step.iHi] += w * rr;
        gAcc[step.iHi] += w * gg;
        bAcc[step.iHi] += w * bb;
      }
    } else if (step.iLo >= 0) {
      wAcc[step.iLo] += 1;
      rAcc[step.iLo] += rr;
      gAcc[step.iLo] += gg;
      bAcc[step.iLo] += bb;
    }
    if (step.iLo >= 0) paintPixel(step.iLo);
    if (step.iHi >= 0) paintPixel(step.iHi);
  }

  // Stamp a ray's seed-colour start marker on the first step where a
  // deposit is actually possible. Strided rays (those entering from
  // the bottom/side edge) can begin with several `iLo = -1` steps in
  // nearest-neighbor mode, so we scan forward until a target row is in
  // view; otherwise those rays would show no seed point at all until
  // the animation reaches them.
  function markRaySeed(ray) {
    const [sr0, sg0, sb0] = ray.seedColor;
    const sr = Math.max(0, Math.min(255, sr0 * 255));
    const sg = Math.max(0, Math.min(255, sg0 * 255));
    const sb = Math.max(0, Math.min(255, sb0 * 255));
    for (const step of ray.steps) {
      const wLo = currentWeighted ? 1 - step.f : 1;
      const wHi = currentWeighted ? step.f : 0;
      let marked = false;
      if (step.iLo >= 0 && wLo > 1e-9) {
        startMask[step.iLo] = 1;
        seedR[step.iLo] = sr; seedG[step.iLo] = sg; seedB[step.iLo] = sb;
        paintPixel(step.iLo);
        marked = true;
      }
      if (step.iHi >= 0 && wHi > 1e-9) {
        startMask[step.iHi] = 1;
        seedR[step.iHi] = sr; seedG[step.iHi] = sg; seedB[step.iHi] = sb;
        paintPixel(step.iHi);
        marked = true;
      }
      if (marked) return;
    }
  }

  // Deposit every step of a ray in one shot. Used to commit the centre
  // ray immediately so the user sees the rasterised red line during a
  // drag instead of waiting for the animation to sweep past it.
  function rasterizeRay(ray) {
    for (const step of ray.steps) depositStep(ray, step);
  }

  function resetAnimation(deg, w) {
    currentAngle = deg;
    currentWeighted = w;
    rays = buildTraversal(deg);
    rayIdx = 0;
    stepIdx = 0;
    pauseUntil = 0;
    clearBuffers();
    // Show every ray's seed point at full opacity up front so the user
    // sees the full set of sweep origins the moment the handle moves,
    // not just the ones the animation has swept past so far.
    for (const ray of rays) markRaySeed(ray);
    // Rasterise the centre ray immediately and flag it so the animation
    // loop doesn't deposit into it again (which would double-weight
    // those pixels in the weighted-interpolation mode).
    const centerRay = rays.find((r) => r.isCenter);
    if (centerRay) {
      rasterizeRay(centerRay);
      centerRay.skipped = true;
    }
    ctx.putImageData(img, 0, 0);
    placeHandle(deg);
  }

  function advanceOne() {
    while (
      rayIdx < rays.length &&
      (rays[rayIdx].skipped || stepIdx >= rays[rayIdx].steps.length)
    ) {
      rayIdx++;
      stepIdx = 0;
    }
    if (rayIdx >= rays.length) return false;
    const ray = rays[rayIdx];
    depositStep(ray, ray.steps[stepIdx]);
    stepIdx++;
    return true;
  }

  let isVisible = true;
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) isVisible = entry.isIntersecting;
    },
    { threshold: 0 },
  );
  visibilityObserver.observe(figure);

  const loop = createFrameLoop((t) => {
    if (!isVisible) return;

    const deg = angle.get();
    const w = weighted.get();
    if (deg !== currentAngle || w !== currentWeighted) {
      resetAnimation(deg, w);
    }

    if (pauseUntil > 0) {
      if (t >= pauseUntil) resetAnimation(currentAngle, currentWeighted);
      return;
    }

    let dirty = false;
    for (let s = 0; s < stepsPerFrame; s++) {
      if (!advanceOne()) {
        pauseUntil = t + pauseMs;
        break;
      }
      dirty = true;
    }
    if (dirty) ctx.putImageData(img, 0, 0);
  });

  return {
    figure,
    canvas,
    cancel() { loop.cancel(); visibilityObserver.disconnect(); },
  };
}
