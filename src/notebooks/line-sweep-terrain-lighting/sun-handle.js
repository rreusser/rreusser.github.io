export function mountSunHandle({
  canvas,
  get,
  set,
  crosshairs = false,
  angle,
  arrow = false,
}) {
  const sizePx = parseInt(canvas.style.width, 10) || canvas.width;

  canvas.style.border = "none";
  canvas.style.cursor = "default";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const overlay = document.createElementNS(SVG_NS, "svg");
  overlay.setAttribute("width", sizePx);
  overlay.setAttribute("height", sizePx);
  overlay.setAttribute("viewBox", "0 0 " + sizePx + " " + sizePx);
  overlay.style.cssText =
    "position:absolute; inset:0; pointer-events:none; overflow:visible;";

  const cxFig = sizePx / 2;
  const cyFig = sizePx / 2;
  const rFig = sizePx / 2 - 1;
  // Handle position uses orthographic projection (shows true 3D
  // direction). Mouse-to-altitude uses an asymptotic mapping so
  // dragging beyond the edge gives fine control near horizontal
  // instead of clipping. The handle lags behind the cursor near the
  // edge, visually communicating the slow zone.
  const K = 1.5;
  const sunToXY = (sd) => {
    const altClamped = Math.max(0, Math.min(90, sd.alt));
    const r = Math.cos((altClamped * Math.PI) / 180) * rFig;
    const a = (sd.az * Math.PI) / 180;
    return [cxFig + r * Math.cos(a), cyFig - r * Math.sin(a)];
  };
  const xyToSun = (x, y) => {
    const nx = (x - cxFig) / rFig;
    const ny = (y - cyFig) / rFig;
    const rNorm = Math.hypot(nx, ny);
    const alt = 90 / (1 + (rNorm * K) * (rNorm * K));
    let az = (Math.atan2(-ny, nx) * 180) / Math.PI;
    if (az < 0) az += 360;
    return { az, alt };
  };

  const handle = document.createElementNS(SVG_NS, "g");
  handle.setAttribute(
    "style",
    "pointer-events:auto; cursor:grab; touch-action:none;",
  );

  const hit = document.createElementNS(SVG_NS, "circle");
  hit.setAttribute("r", "32");
  hit.setAttribute("fill", "#000");
  hit.setAttribute("fill-opacity", "0");
  handle.appendChild(hit);

  // In orthographic projection of the hemisphere, a point at angular
  // distance δ from zenith lands at radius sin(δ) * rFig. So an angular
  // radius of angle/2 around the sun projects to a tangential (major)
  // half-axis of sin(angle/2) * rFig pixels. `angle` may be a number
  // (static) or an input element whose `.value` provides a live angular
  // diameter in degrees.
  const isAngleElement =
    angle &&
    typeof angle === "object" &&
    "value" in angle &&
    typeof angle.addEventListener === "function";
  const readAngle = () =>
    typeof angle === "number"
      ? angle
      : isAngleElement
        ? Number(angle.value)
        : NaN;
  // Deliberately oversized by 1.5× — the strictly correct major axis is
  // hard to perceive at small angles, so we trade physical exactness for
  // visual intuition.
  const HALO_VISUAL_BOOST = 1.5;
  const computeHaloR = () => {
    const a = readAngle();
    return Number.isFinite(a)
      ? HALO_VISUAL_BOOST * Math.sin((a * Math.PI) / 360) * rFig
      : 32;
  };
  const halo = document.createElementNS(SVG_NS, "circle");
  halo.setAttribute("r", String(computeHaloR()));
  halo.setAttribute("fill", "#ffd866");
  halo.setAttribute("fill-opacity", "0.45");
  halo.setAttribute("pointer-events", "none");
  handle.appendChild(halo);
  if (isAngleElement) {
    angle.addEventListener("input", () => {
      halo.setAttribute("r", String(computeHaloR()));
    });
  }

  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("r", "8");
  dot.setAttribute("fill", "#ffd866");
  dot.setAttribute("stroke", "#3a2600");
  dot.setAttribute("stroke-width", "1.5");
  handle.appendChild(dot);

  // Optional arrow from the sun handle inward toward the figure centre,
  // showing the light-propagation direction. Drawn beneath the handle so
  // the dot stays clickable on top. The arrow is a single polygon so
  // the dark outline traces only the external silhouette — no seam
  // between the shaft and the arrowhead.
  let arrowOutline = null;
  let arrowShape = null;
  if (arrow) {
    arrowOutline = document.createElementNS(SVG_NS, "polygon");
    arrowOutline.setAttribute("fill", "#3a2600");
    arrowOutline.setAttribute("stroke", "#3a2600");
    arrowOutline.setAttribute("stroke-width", "3");
    arrowOutline.setAttribute("stroke-linejoin", "round");
    arrowOutline.setAttribute("pointer-events", "none");
    overlay.appendChild(arrowOutline);
    arrowShape = document.createElementNS(SVG_NS, "polygon");
    arrowShape.setAttribute("fill", "#ffd866");
    arrowShape.setAttribute("pointer-events", "none");
    overlay.appendChild(arrowShape);
  }

  if (crosshairs) {
    const ch = document.createElementNS(SVG_NS, "g");
    ch.setAttribute("stroke", "rgba(255,255,255,0.15)");
    ch.setAttribute("stroke-width", "1");
    const h = document.createElementNS(SVG_NS, "line");
    h.setAttribute("x1", "0"); h.setAttribute("y1", String(cyFig));
    h.setAttribute("x2", String(sizePx)); h.setAttribute("y2", String(cyFig));
    const v = document.createElementNS(SVG_NS, "line");
    v.setAttribute("x1", String(cxFig)); v.setAttribute("y1", "0");
    v.setAttribute("x2", String(cxFig)); v.setAttribute("y2", String(sizePx));
    ch.appendChild(h);
    ch.appendChild(v);
    overlay.appendChild(ch);
  }

  overlay.appendChild(handle);

  const placeHandle = (sd) => {
    const [x, y] = sunToXY(sd);
    handle.setAttribute("transform", "translate(" + x + ", " + y + ")");
    const dx = x - cxFig;
    const dy = y - cyFig;
    const thetaDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const altClamped = Math.max(0, Math.min(90, sd.alt));
    const minorScale = Math.max(0.1, Math.sin((altClamped * Math.PI) / 180));
    halo.setAttribute(
      "transform",
      "rotate(" + thetaDeg + ") scale(" + minorScale + ", 1)",
    );
    const belowHorizon = sd.alt < 0;
    halo.style.display = belowHorizon ? "none" : "";
    dot.setAttribute("fill", belowHorizon ? "#6b86a8" : "#ffd866");

    const distToCenter = Math.hypot(dx, dy);
    if (arrowOutline && arrowShape) {
      if (!belowHorizon && distToCenter > 20) {
        const ux = -dx / distToCenter;
        const uy = -dy / distToCenter;
        const startFrac = 0.18;
        const endFrac = 0.58;
        const xTail = x + (cxFig - x) * startFrac;
        const yTail = y + (cyFig - y) * startFrac;
        const xHead = x + (cxFig - x) * endFrac;
        const yHead = y + (cyFig - y) * endFrac;
        const headSize = 10;
        const tipX = xHead + ux * headSize;
        const tipY = yHead + uy * headSize;
        const perpX = -uy, perpY = ux;
        const backX = xHead - ux * headSize * 0.2;
        const backY = yHead - uy * headSize * 0.2;
        const shaftHalf = 1.5;
        const headHalf = headSize * 0.7;
        const tailL = [xTail + perpX * shaftHalf, yTail + perpY * shaftHalf];
        const shaftL = [backX + perpX * shaftHalf, backY + perpY * shaftHalf];
        const wingL  = [backX + perpX * headHalf, backY + perpY * headHalf];
        const tip    = [tipX, tipY];
        const wingR  = [backX - perpX * headHalf, backY - perpY * headHalf];
        const shaftR = [backX - perpX * shaftHalf, backY - perpY * shaftHalf];
        const tailR  = [xTail - perpX * shaftHalf, yTail - perpY * shaftHalf];
        const points = [tailL, shaftL, wingL, tip, wingR, shaftR, tailR]
          .map((p) => p[0] + "," + p[1])
          .join(" ");
        arrowOutline.setAttribute("points", points);
        arrowShape.setAttribute("points", points);
        arrowOutline.style.display = "";
        arrowShape.style.display = "";
      } else {
        arrowOutline.style.display = "none";
        arrowShape.style.display = "none";
      }
    }
  };

  placeHandle(get());

  const tick = () => {
    placeHandle(get());
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const svgPointFromEvent = (e) => {
    const rect = overlay.getBoundingClientRect();
    const sx = sizePx / rect.width;
    const sy = sizePx / rect.height;
    return [(e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy];
  };
  const writeSun = (x, y) => {
    const sd = xyToSun(x, y);
    const cur = get();
    if (cur.az !== sd.az || cur.alt !== sd.alt) {
      set({ az: sd.az, alt: sd.alt });
    }
  };

  // Coalesce rapid pointermove events into one set() per animation
  // frame. The previous implementation rounded az/alt to 0.5° as a
  // cheap throttle, which quantised movement near the horizon (where
  // the asymptotic xyToSun mapping already compresses many mouse
  // pixels into a single degree). rAF coalescing gives continuous
  // sub-degree control while still capping the downstream recompute
  // rate to one per frame.
  let pendingPoint = null;
  let rafId = 0;
  const flush = () => {
    rafId = 0;
    if (!pendingPoint) return;
    const [x, y] = pendingPoint;
    pendingPoint = null;
    writeSun(x, y);
  };
  const queueWrite = (x, y) => {
    pendingPoint = [x, y];
    if (!rafId) rafId = requestAnimationFrame(flush);
  };

  let dragging = false;
  handle.addEventListener("pointerdown", (e) => {
    dragging = true;
    try {
      handle.setPointerCapture(e.pointerId);
    } catch (_) {}
    handle.style.cursor = "grabbing";
    e.preventDefault();
    e.stopPropagation();
  });
  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const [x, y] = svgPointFromEvent(e);
    queueWrite(x, y);
    e.stopPropagation();
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    // Flush any coalesced move so the final position lands before
    // the drag cursor changes.
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      flush();
    }
    try {
      handle.releasePointerCapture(e.pointerId);
    } catch (_) {}
    handle.style.cursor = "grab";
    e.stopPropagation();
  };
  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);

  const isDragging = () => dragging;

  const container = document.createElement("div");
  container.isDragging = isDragging;
  // touch-action:none on the outer container — setting it only on the
  // SVG <g> (handle) isn't reliably honoured by mobile browsers, so
  // without this a finger-drag scrolls the page instead of moving
  // the sun.
  container.style.cssText =
    "position:relative; display:inline-block; line-height:0; overflow:hidden; touch-action:none;";
  if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  container.appendChild(canvas);
  container.appendChild(overlay);

  return container;
}
