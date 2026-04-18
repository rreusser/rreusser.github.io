export function mountSunHandle({ canvas, get, set, crosshairs = false }) {
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

  const halo = document.createElementNS(SVG_NS, "circle");
  halo.setAttribute("r", "32");
  halo.setAttribute("fill", "#ffd866");
  halo.setAttribute("fill-opacity", "0.45");
  halo.setAttribute("pointer-events", "none");
  handle.appendChild(halo);

  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("r", "8");
  dot.setAttribute("fill", "#ffd866");
  dot.setAttribute("stroke", "#fff");
  dot.setAttribute("stroke-width", "2");
  handle.appendChild(dot);

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
    const az = Math.round(sd.az * 2) / 2;
    const alt = Math.round(sd.alt * 2) / 2;
    const cur = get();
    if (cur.az !== az || cur.alt !== alt) {
      set({ az, alt });
    }
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
    writeSun(x, y);
    e.stopPropagation();
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
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
  container.style.cssText =
    "position:relative; display:inline-block; line-height:0; overflow:hidden;";
  if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  container.appendChild(canvas);
  container.appendChild(overlay);

  return container;
}
