// 1-D interactive penumbra figure.
//
// Builds the full figure — SVG terrain + draggable sun handle + figcaption.
// The cell that uses this is reactive on `penumbraHover` and on a version
// counter for external height-field bumps; dragging the height field calls
// `redraw()` imperatively so the SVG element (and its pointer capture)
// survive the whole gesture.
//
// Shared state:
//   window.__penumbraElev       — Float32Array(Npen), height field
//   window.__penumbraHoverMut   — Mutable({x, y}), written by the sun-handle drag
//   window.__penumbraLastEdit   — transient drag state (column + y)

const Npen = 64;
const penPxSize = 1;
const sceneW = Npen;
const sceneH = 24;
const barH = 0.9;
const elevMaxY = sceneH - barH - 0.5;
const DEFAULT_SUN_DIAMETER_DEG = 10;
const ALPHA_MIN = (3 * Math.PI) / 180;
const ALPHA_MAX = Math.PI / 2 - 1e-3;

function ensureElev() {
  if (!window.__penumbraElev || window.__penumbraElev.length !== Npen) {
    const initial = new Float32Array(Npen);
    // 1D cone: linear taper, peak centered on one bar.
    const coneCx = 14.5;
    const coneR = 6;
    for (let i = 0; i < Npen; i++) {
      const d = Math.abs(i + 0.5 - coneCx);
      if (d < coneR) initial[i] = Math.max(initial[i], (coneR - d) * 1.8);
    }
    // Cube (flat-topped block).
    for (let i = 27; i < 35; i++) initial[i] = 6;
    // 1D hemisphere: semicircular cross-section.
    const hemiCx = 48;
    const hemiR = 7;
    for (let i = 0; i < Npen; i++) {
      const d = Math.abs(i + 0.5 - hemiCx);
      if (d < hemiR) initial[i] = Math.max(initial[i], Math.sqrt(hemiR * hemiR - d * d));
    }
    window.__penumbraElev = initial;
  }
  return window.__penumbraElev;
}

function mkEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function shadeColor(s) {
  const t = Math.max(0, Math.min(1, s));
  const v = Math.round(255 - 200 * t);
  return `rgb(${v},${v},${v})`;
}

export function createPenumbraFigure({ html, sunAccessor, angleEl, width }) {
  const elev = ensureElev();

  const penDispW = Math.min(960, width ?? 960);
  const penDispH = Math.round((penDispW * sceneH) / sceneW);
  const SW_THIN = sceneW / penDispW;
  const SW_MED = 2 * SW_THIN;

  const svg = html`<svg
    width=${penDispW}
    height=${penDispH}
    viewBox="0 0 ${sceneW} ${sceneH}"
    preserveAspectRatio="xMidYMid meet"
    style="background:#e8e6e3; display:block; border:1px solid #ccc; cursor:crosshair; touch-action:none;"
  >
    <g transform="translate(0, ${sceneH}) scale(1, -1)"></g>
  </svg>`;
  const gRoot = svg.querySelector("g");

  // Sun handle — a small draggable dot constrained to an arc at a
  // fixed radius from the top-center of the scene. The invisible hit
  // circle is sized in screen pixels (not scene units) for consistent
  // touch targets.
  const handleArcR = sceneH * 0.25;
  const handleG = mkEl("g", { style: "pointer-events:auto; cursor:grab; touch-action:none;" });
  const pxToScene = sceneW / penDispW;
  const haloCircle = mkEl("circle", { r: String(24 * pxToScene), fill: "rgba(70,130,220,0.18)", stroke: "none" });
  const hitCircle = mkEl("circle", { r: String(28 * pxToScene), fill: "#000", "fill-opacity": "0" });
  const dotCircle = mkEl("circle", { r: String(8 * pxToScene), fill: "#4682dc", stroke: "#fff", "stroke-width": String(3 * pxToScene) });
  handleG.appendChild(haloCircle);
  handleG.appendChild(hitCircle);
  handleG.appendChild(dotCircle);

  function redraw() {
    // Derive sun direction from the handle position. The handle is
    // constrained to an arc centered at the top-center of the scene.
    // The angle from top-center to the handle gives the light direction.
    const sv = sunAccessor.get();
    const hx = sv.x;
    const hy = sv.y;
    const dx = hx - sceneW / 2;
    const dy = sceneH - Math.max(0, Math.min(sceneH - 0.5, hy));
    const mag = Math.hypot(dx, dy) || 1;
    // Sun direction is from handle toward top-center (opposite of light travel).
    let Lnx = -dx / mag;
    let Lny = dy / mag;
    let alpha = Math.asin(Math.max(-1, Math.min(1, Lny)));
    if (alpha < ALPHA_MIN) alpha = ALPHA_MIN;
    if (alpha > ALPHA_MAX) alpha = ALPHA_MAX;
    const sunSide = Lnx >= 0 ? 1 : -1;
    Lnx = sunSide * Math.cos(alpha);
    Lny = Math.sin(alpha);

    // Position handle on the arc from the clamped angle.
    const handleX = sceneW / 2 - sunSide * Math.cos(alpha) * handleArcR;
    const handleY = sceneH - Math.sin(alpha) * handleArcR;

    // Per-column shadow fraction. Read the sun diameter from the slider.
    const sunDiamDeg = angleEl ? Number(angleEl.value) : DEFAULT_SUN_DIAMETER_DEG;
    const delta = (sunDiamDeg / 2 * Math.PI) / 180;
    const twoDelta = 2 * delta;
    const shadow = new Float32Array(Npen);
    const effective = new Set();
    for (let cx = 0; cx < Npen; cx++) {
      const hCur = elev[cx];
      const xCur = (cx + 0.5) * penPxSize;
      let tanSky = -Infinity;
      let winnerCol = -1;
      for (let cxp = 0; cxp < Npen; cxp++) {
        if (cxp === cx) continue;
        const hP = elev[cxp];
        if (hP <= 0) continue;
        const dh = hP - hCur;
        if (dh <= 0) continue;
        const xP = (cxp + 0.5) * penPxSize;
        const dxRaw = (xP - xCur) * sunSide;
        if (dxRaw <= 1e-9) continue;
        const t = dh / dxRaw;
        if (t > tanSky) {
          tanSky = t;
          winnerCol = cxp;
        }
      }
      if (tanSky === -Infinity) {
        shadow[cx] = 0;
      } else {
        const theta = Math.atan(tanSky);
        const f = (theta - (alpha - delta)) / twoDelta;
        shadow[cx] = f < 0 ? 0 : f > 1 ? 1 : f;
        if (winnerCol >= 0 && shadow[cx] > 1e-3) {
          effective.add(winnerCol);
        }
      }
    }

    // Penumbra-boundary rays from effective blockers.
    const lineData = [];
    for (const col of effective) {
      const Cx = (col + 0.5) * penPxSize;
      const Cy = elev[col];
      const lines = [];
      for (const phi of [-delta, +delta]) {
        const cp = Math.cos(phi);
        const sp = Math.sin(phi);
        const bx = Lnx * cp - Lny * sp;
        const by = Lnx * sp + Lny * cp;
        if (by <= 1e-6) continue;
        const t = Cy / by;
        const endX = Cx - t * bx;
        lines.push({ x1: Cx, y1: Cy, x2: endX, y2: 0 });
      }
      lineData.push({ lines });
    }

    // Rebuild SVG contents (keeping gRoot + handleG persistent).
    while (gRoot.firstChild) gRoot.removeChild(gRoot.firstChild);

    // Ground line.
    gRoot.appendChild(
      mkEl("line", {
        x1: 0, y1: 0, x2: sceneW, y2: 0,
        stroke: "#aaa", "stroke-width": SW_MED,
      }),
    );

    // Shadow-fraction colored strips.
    for (let i = 0; i < Npen; i++) {
      gRoot.appendChild(
        mkEl("rect", {
          x: i, y: elev[i] - barH / 2, width: 1, height: barH,
          fill: shadeColor(shadow[i]), stroke: "none",
        }),
      );
    }

    // Terrain bars.
    for (let i = 0; i < Npen; i++) {
      if (elev[i] <= 0) continue;
      gRoot.appendChild(
        mkEl("rect", {
          x: i, y: 0, width: 1, height: elev[i],
          fill: "#bbb", stroke: "#999", "stroke-width": SW_THIN,
        }),
      );
    }

    // Penumbra boundary rays.
    for (const ld of lineData) {
      for (const ln of ld.lines) {
        gRoot.appendChild(
          mkEl("line", {
            x1: ln.x1, y1: ln.y1, x2: ln.x2, y2: ln.y2,
            stroke: "#ffb347", "stroke-width": SW_THIN, "stroke-linecap": "round",
          }),
        );
      }
    }

    // Direction-of-light arrows across the top of the scene.
    const numArrows = 5;
    const arrowLen = 2.2;
    const arrowHead = 0.6;
    const headAngle = (150 * Math.PI) / 180;
    const tailY = sceneH - 1.5;
    const sx_ = -Lnx;
    const sy_ = -Lny;
    const ch = Math.cos(headAngle);
    const sh = Math.sin(headAngle);
    const a1x = sx_ * ch - sy_ * sh;
    const a1y = sx_ * sh + sy_ * ch;
    const a2x = sx_ * ch + sy_ * sh;
    const a2y = -sx_ * sh + sy_ * ch;
    for (let k = 0; k < numArrows; k++) {
      const tx = sceneW * ((k + 0.5) / numArrows);
      const ty = tailY;
      const ex = tx + sx_ * arrowLen;
      const ey = ty + sy_ * arrowLen;
      const arrowStroke = {
        stroke: "#c88a2e", "stroke-width": SW_MED, "stroke-linecap": "round",
      };
      gRoot.appendChild(mkEl("line", { x1: tx, y1: ty, x2: ex, y2: ey, ...arrowStroke }));
      gRoot.appendChild(mkEl("line", {
        x1: ex, y1: ey, x2: ex + a1x * arrowHead, y2: ey + a1y * arrowHead, ...arrowStroke,
      }));
      gRoot.appendChild(mkEl("line", {
        x1: ex, y1: ey, x2: ex + a2x * arrowHead, y2: ey + a2y * arrowHead, ...arrowStroke,
      }));
    }

    // Position the sun handle on the arc and re-append on top.
    handleG.setAttribute("transform", `translate(${handleX}, ${handleY})`);
    gRoot.appendChild(handleG);
  }

  // Coordinate helpers.
  function eventToScene(e) {
    const rect = svg.getBoundingClientRect();
    const sc = Math.min(rect.width / sceneW, rect.height / sceneH);
    const padX = (rect.width - sc * sceneW) / 2;
    const padY = (rect.height - sc * sceneH) / 2;
    const x = (e.clientX - rect.left - padX) / sc;
    const yTop = (e.clientY - rect.top - padY) / sc;
    return { x, y: sceneH - yTop };
  }

  function editHeightAt(e) {
    const { x, y } = eventToScene(e);
    const clampedY = Math.max(0, Math.min(elevMaxY, y));
    const col = Math.floor(x);
    if (col < 0 || col >= Npen) {
      window.__penumbraLastEdit = null;
      return;
    }
    const last = window.__penumbraLastEdit;
    if (last) {
      const dCol = col - last.col;
      const dY = clampedY - last.y;
      const n = Math.abs(dCol);
      if (n > 0) {
        for (let k = 1; k <= n; k++) {
          const t = k / n;
          const c = last.col + Math.round(dCol * t);
          const h = last.y + dY * t;
          if (c >= 0 && c < Npen) elev[c] = h;
        }
      } else {
        elev[col] = clampedY;
      }
    } else {
      elev[col] = clampedY;
    }
    window.__penumbraLastEdit = { col, y: clampedY };
    redraw();
  }

  function moveSunTo(e) {
    const { x, y } = eventToScene(e);
    const clampedY = Math.max(0.5, Math.min(sceneH - 0.5, y));
    sunAccessor.set({ x, y: clampedY });
    redraw();
  }

  // --- Sun handle drag ---
  // Pointer capture is set on the svg element (not the <g>) because
  // SVG group elements don't reliably support setPointerCapture.
  // The pointermove/up listeners on svg check `draggingSun` to route
  // events to the sun handler instead of the terrain editor.
  let draggingSun = false;
  handleG.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    draggingSun = true;
    try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    handleG.style.cursor = "grabbing";
    e.preventDefault();
    e.stopPropagation();
  });
  svg.addEventListener("pointermove", (e) => {
    if (!draggingSun) return;
    moveSunTo(e);
    e.stopPropagation();
  });
  const endSunDrag = (e) => {
    if (!draggingSun) return;
    draggingSun = false;
    try { svg.releasePointerCapture(e.pointerId); } catch (_) {}
    handleG.style.cursor = "grab";
  };
  svg.addEventListener("pointerup", endSunDrag);
  svg.addEventListener("pointercancel", endSunDrag);

  // --- Terrain editing ---
  // Check composedPath to avoid editing terrain when clicking the handle.
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || draggingSun) return;
    if (e.composedPath().includes(handleG)) return;
    e.preventDefault();
    try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    window.__penumbraLastEdit = null;
    editHeightAt(e);
  });
  svg.addEventListener("pointermove", (e) => {
    if (e.buttons & 1 && !draggingSun) {
      editHeightAt(e);
    }
  });
  svg.addEventListener("pointerup", (e) => {
    if (!draggingSun) {
      try { svg.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    window.__penumbraLastEdit = null;
  });
  svg.addEventListener("pointercancel", () => {
    window.__penumbraLastEdit = null;
  });

  if (angleEl) angleEl.addEventListener("input", () => redraw());

  redraw();

  return html`<figure style="margin-top:18px;">
    ${svg}
    <figcaption>1-D side view of terrain on flat ground lit by a directional sun at infinity. Drag the blue handle to aim the light direction; use the slider to adjust the sun's angular diameter. Click and drag the terrain to reshape it. Boundary rays show the sun-disk tangent angles; gray strips show the shadow fraction at each column.</figcaption>
  </figure>`;
}
