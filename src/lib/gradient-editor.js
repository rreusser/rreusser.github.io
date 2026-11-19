// A draggable colour-ramp editor, built for hypsometric tinting but not
// specific to it.
//
// The ramp runs vertically because that is how an elevation legend
// reads: low at the bottom, high at the top. Stops are pinned to values
// in the domain (metres, for terrain), not to normalized positions, so
// changing the domain moves the axis under the stops rather than
// dragging the stops around with it.
//
// Interaction:
//   - drag a chip to move its stop
//   - click the ramp to add a stop there, coloured by what the ramp
//     already shows at that value, so adding a stop never changes the
//     picture until you move or recolour it
//   - click a chip to select it; the swatch, the value field and the
//     delete button all act on the selection
//   - Backspace or Delete removes the selected stop (two stops minimum)
//
// Pointer handling follows the house rules for draggable figure
// handles: `touch-action: none` on the draggable surfaces,
// `setPointerCapture`, and a tracked pointerId. Without those, a touch
// drag both scrolls the page and dies mid-gesture when the scroll fires
// `pointercancel`. The rule sits on the chips and the ramp rather than
// on the panel as a whole, because those are plain HTML elements that
// honour it (the usual reason to hoist it to an outer container is an
// inner SVG, where it is not reliably honoured) and because killing
// touch scrolling across the whole panel would trap a reader who
// happens to start a swipe on it.

import { buildOklabLUT, lutToImageData, oklabToHex, sampleLUT } from "./color-ramp.js";

let _uid = 0;

const CSS = `
.grd-editor {
  --grd-fg: #f0f0f0;
  --grd-fg-dim: #b4b4b4;
  --grd-bg: rgba(22, 22, 24, 0.82);
  --grd-line: rgba(255, 255, 255, 0.22);
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
  font: 12px/1.3 var(--sans-serif, system-ui, sans-serif);
  color: var(--grd-fg);
  background: var(--grd-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--grd-line);
  border-radius: 7px;
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}
.grd-editor * { box-sizing: border-box; }
.grd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px 6px 10px;
  font-weight: 500;
  letter-spacing: 0.01em;
  border-bottom: 1px solid var(--grd-line);
  cursor: default;
}
.grd-head button {
  border: none;
  background: none;
  color: var(--grd-fg-dim);
  cursor: pointer;
  font: inherit;
  padding: 2px 5px;
  border-radius: 4px;
  line-height: 1;
}
.grd-head button:hover { background: rgba(255, 255, 255, 0.12); color: var(--grd-fg); }
.grd-body { padding: 10px; display: flex; flex-direction: column; gap: 9px; }
.grd-editor[data-collapsed="1"] .grd-body { display: none; }

/* Vertical padding so the chips for the first and last stops, which sit
   at the very ends of the ramp and are centred on it, stay inside the
   panel instead of hanging over the row below. */
.grd-strip { position: relative; display: flex; align-items: stretch; padding: 12px 0; }
.grd-rail { position: relative; flex: 0 0 74px; }
.grd-canvas {
  display: block;
  flex: 0 0 auto;
  border-radius: 3px;
  border: 1px solid var(--grd-line);
  cursor: copy;
  touch-action: none;
}
.grd-axis { position: relative; flex: 1 1 auto; margin-left: 5px; }
.grd-tick {
  position: absolute;
  left: 0;
  transform: translateY(-50%);
  white-space: nowrap;
  color: var(--grd-fg-dim);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
.grd-tick::before {
  content: "";
  position: absolute;
  left: -5px;
  top: 50%;
  width: 4px;
  border-top: 1px solid var(--grd-line);
}

.grd-chip {
  position: absolute;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 5px 2px 4px;
  border-radius: 4px;
  cursor: grab;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid transparent;
  font-variant-numeric: tabular-nums;
  color: var(--grd-fg-dim);
  white-space: nowrap;
  touch-action: none;
}
.grd-chip:hover { background: rgba(255, 255, 255, 0.16); }
.grd-chip[data-selected="1"] {
  border-color: var(--grd-fg);
  background: rgba(255, 255, 255, 0.2);
  color: var(--grd-fg);
}
.grd-chip[data-dragging="1"] { cursor: grabbing; }
.grd-chip-swatch {
  width: 13px;
  height: 13px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.45);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4);
  flex: 0 0 auto;
}
.grd-chip-arrow {
  position: absolute;
  right: -5px;
  top: 50%;
  width: 0;
  height: 0;
  transform: translateY(-50%);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 5px solid var(--grd-fg-dim);
}
.grd-chip[data-selected="1"] .grd-chip-arrow { border-left-color: var(--grd-fg); }

.grd-row { display: flex; align-items: center; gap: 6px; }
.grd-row > label { color: var(--grd-fg-dim); flex: 0 0 auto; }
.grd-editor input[type="number"] {
  width: 100%;
  min-width: 0;
  font: inherit;
  color: var(--grd-fg);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--grd-line);
  border-radius: 4px;
  padding: 2px 4px;
  font-variant-numeric: tabular-nums;
}
.grd-editor input[type="color"] {
  width: 30px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--grd-line);
  border-radius: 4px;
  background: none;
  cursor: pointer;
  flex: 0 0 auto;
}
.grd-editor input[type="range"] { width: 100%; min-width: 0; margin: 0; accent-color: #9ecbff; }
.grd-editor button.grd-btn {
  font: inherit;
  color: var(--grd-fg);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--grd-line);
  border-radius: 4px;
  padding: 2px 7px;
  cursor: pointer;
  flex: 0 0 auto;
  white-space: nowrap;
}
.grd-editor button.grd-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.2); }
.grd-editor button.grd-btn:disabled { opacity: 0.4; cursor: default; }
.grd-hint { color: var(--grd-fg-dim); opacity: 0.8; }
`;

let _cssInstalled = false;
function installCSS() {
  if (_cssInstalled) return;
  _cssInstalled = true;
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
}

// "Nice" axis step: 1, 2, 5 times a power of ten, chosen so the axis
// carries roughly `target` labels.
function niceStep(span, target) {
  const raw = span / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))));
  const n = raw / mag;
  const mult = n <= 1.5 ? 1 : n <= 3 ? 2 : n <= 7 ? 5 : 10;
  return mult * mag;
}

/**
 * @param {object} opts
 * @param {Array<{value:number,color:string}>} opts.stops  initial stops
 * @param {[number,number]} opts.domain                    axis range
 * @param {number} [opts.height]                           ramp height in px
 * @param {number} [opts.lutSize]                          LUT entries
 * @param {string} [opts.title]
 * @param {string} [opts.unit]                             axis label suffix
 * @param {boolean} [opts.collapsed]
 * @param {(state) => void} [opts.onChange]  called with { stops, domain, lut }
 *        on every edit, and once on construction
 * @param {() => [number,number] | null} [opts.onFit]  supplies a domain for
 *        the "fit" button; omit the option to hide the button
 */
export function createGradientEditor({
  stops: initialStops,
  domain: initialDomain,
  height = 260,
  lutSize = 512,
  title = "Colour ramp",
  unit = "",
  collapsed = false,
  onChange,
  onFit,
} = {}) {
  installCSS();
  const ns = `grd${++_uid}`;

  let stops = (initialStops ?? []).map((s, i) => ({
    id: `${ns}-${i}`,
    value: s.value,
    color: s.color,
  }));
  let nextId = stops.length;
  let domain = [...(initialDomain ?? [0, 1])];
  let selectedId = stops.length > 0 ? stops[0].id : null;
  let lut = null;

  // ---- DOM ---------------------------------------------------------

  const root = document.createElement("div");
  root.className = "grd-editor";
  root.dataset.collapsed = collapsed ? "1" : "0";

  const head = document.createElement("div");
  head.className = "grd-head";
  const headTitle = document.createElement("span");
  headTitle.textContent = title;
  const headToggle = document.createElement("button");
  headToggle.type = "button";
  headToggle.textContent = collapsed ? "▸" : "▾";
  headToggle.title = collapsed ? "Expand" : "Collapse";
  head.append(headTitle, headToggle);

  const body = document.createElement("div");
  body.className = "grd-body";

  const strip = document.createElement("div");
  strip.className = "grd-strip";

  const rail = document.createElement("div");
  rail.className = "grd-rail";

  const canvas = document.createElement("canvas");
  canvas.className = "grd-canvas";
  const DPR = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  const RAMP_W = 34;
  canvas.style.width = `${RAMP_W}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(RAMP_W * DPR);
  canvas.height = Math.round(height * DPR);
  canvas.title = "Click to add a stop";
  const ctx = canvas.getContext("2d");

  const axis = document.createElement("div");
  axis.className = "grd-axis";

  strip.append(rail, canvas, axis);

  // Selected-stop row.
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.title = "Stop colour";
  const valueInput = document.createElement("input");
  valueInput.type = "number";
  valueInput.step = "1";
  valueInput.title = "Stop elevation";
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "grd-btn";
  addBtn.textContent = "+";
  addBtn.title = "Add a stop halfway to the next one";
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "grd-btn";
  delBtn.textContent = "−";
  delBtn.title = "Delete the selected stop";

  const stopRow = document.createElement("div");
  stopRow.className = "grd-row";
  const stopLabel = document.createElement("label");
  stopLabel.textContent = "stop";
  stopRow.append(stopLabel, colorInput, valueInput, addBtn, delBtn);

  // Domain row.
  const minInput = document.createElement("input");
  minInput.type = "number";
  minInput.step = "any";
  minInput.title = "Bottom of the axis";
  const maxInput = document.createElement("input");
  maxInput.type = "number";
  maxInput.step = "any";
  maxInput.title = "Top of the axis";
  const domainRow = document.createElement("div");
  domainRow.className = "grd-row";
  const domainLabel = document.createElement("label");
  domainLabel.textContent = "range";
  domainRow.append(domainLabel, minInput, maxInput);
  if (onFit) {
    const fitBtn = document.createElement("button");
    fitBtn.type = "button";
    fitBtn.className = "grd-btn";
    fitBtn.textContent = "fit";
    fitBtn.title = "Fit the axis to what is on screen";
    fitBtn.addEventListener("click", () => {
      fitTo(onFit());
    });
    domainRow.append(fitBtn);
  }

  const hint = document.createElement("div");
  hint.className = "grd-hint";
  hint.textContent = "Click the ramp to add a stop; drag a chip to move it.";

  body.append(strip, stopRow, domainRow, hint);
  root.append(head, body);

  // ---- geometry ----------------------------------------------------

  // Value <-> pixel offset from the top of the ramp. The ramp's full
  // height spans the domain, with the domain minimum at the bottom.
  const valueToY = (v) => {
    const [d0, d1] = domain;
    const t = (v - d0) / (d1 - d0 || 1);
    return (1 - Math.max(0, Math.min(1, t))) * height;
  };
  const yToValue = (y) => {
    const [d0, d1] = domain;
    const t = 1 - Math.max(0, Math.min(1, y / height));
    return d0 + t * (d1 - d0);
  };

  const fmt = (v) => {
    const span = Math.abs(domain[1] - domain[0]);
    const decimals = span >= 100 ? 0 : span >= 10 ? 1 : span >= 1 ? 2 : 3;
    return v.toFixed(decimals);
  };

  const sortedStops = () => [...stops].sort((p, q) => p.value - q.value);
  const selected = () => stops.find((s) => s.id === selectedId) ?? null;

  // ---- rendering ---------------------------------------------------

  const chipEls = new Map(); // id -> element

  function drawRamp() {
    lut = buildOklabLUT(stops, { size: lutSize, domain });
    const img = lutToImageData(lut, canvas.width, canvas.height, { vertical: true });
    ctx.putImageData(img, 0, 0);
  }

  function drawAxis() {
    axis.textContent = "";
    const [d0, d1] = domain;
    const span = d1 - d0;
    if (!(span > 0)) return;
    const step = niceStep(span, Math.max(2, Math.round(height / 46)));
    const first = Math.ceil(d0 / step) * step;
    for (let v = first; v <= d1 + 1e-9; v += step) {
      const el = document.createElement("div");
      el.className = "grd-tick";
      el.style.top = `${valueToY(v)}px`;
      // Rounding guards against the accumulated error of repeated adds
      // showing up as 1499.9999999 on the axis.
      el.textContent = `${Math.round(v / step) * step}${unit}`;
      axis.appendChild(el);
    }
  }

  function drawChips() {
    const live = new Set();
    for (const s of stops) {
      live.add(s.id);
      let el = chipEls.get(s.id);
      if (!el) {
        el = document.createElement("div");
        el.className = "grd-chip";
        const sw = document.createElement("span");
        sw.className = "grd-chip-swatch";
        const lab = document.createElement("span");
        lab.className = "grd-chip-label";
        const arrow = document.createElement("span");
        arrow.className = "grd-chip-arrow";
        el.append(sw, lab, arrow);
        attachChipDrag(el, s.id);
        rail.appendChild(el);
        chipEls.set(s.id, el);
      }
      el.style.top = `${valueToY(s.value)}px`;
      el.dataset.selected = s.id === selectedId ? "1" : "0";
      el.querySelector(".grd-chip-swatch").style.background = s.color;
      el.querySelector(".grd-chip-label").textContent = fmt(s.value);
    }
    for (const [id, el] of chipEls) {
      if (!live.has(id)) {
        el.remove();
        chipEls.delete(id);
      }
    }
  }

  function syncInputs() {
    const s = selected();
    colorInput.disabled = !s;
    valueInput.disabled = !s;
    delBtn.disabled = !s || stops.length <= 2;
    if (s) {
      if (colorInput.value !== s.color) colorInput.value = s.color;
      if (document.activeElement !== valueInput) valueInput.value = String(s.value);
    } else {
      valueInput.value = "";
    }
    if (document.activeElement !== minInput) minInput.value = String(domain[0]);
    if (document.activeElement !== maxInput) maxInput.value = String(domain[1]);
  }

  function refresh() {
    drawRamp();
    drawAxis();
    drawChips();
    syncInputs();
  }

  function emit() {
    onChange?.({ stops: sortedStops().map(({ value, color }) => ({ value, color })), domain: [...domain], lut });
  }

  // ---- editing -----------------------------------------------------

  function addStopAt(value) {
    // Colour it with whatever the ramp already shows there, so adding a
    // stop barely disturbs the picture until it is moved or recoloured.
    // Not exactly a no-op: inserting a knot changes the monotone-cubic
    // slopes on either side of it. Measured at under 0.005 in Oklab for
    // the default terrain ramp, which is well below the roughly 0.02
    // that is just noticeable.
    const [L, a, b] = sampleLUT(lut, domain, value);
    const s = { id: `${ns}-${nextId++}`, value, color: oklabToHex(L, a, b) };
    stops.push(s);
    selectedId = s.id;
    refresh();
    emit();
    return s;
  }

  /**
   * Move the axis to `d` and carry the stops with it, rescaling them so
   * the ramp still spans the full range.
   *
   * Moving the axis alone is the wrong thing here. A ramp authored
   * across 0 to 5200 m, fitted to 500 m of local relief, would collapse
   * to a single flat colour: every stop but one lands outside the
   * window. Typing into the range fields does move the axis alone,
   * which is the pure reading of "stops are pinned to elevations"; this
   * button is the one that refits the ramp itself.
   */
  function fitTo(d) {
    if (!d || !Number.isFinite(d[0]) || !Number.isFinite(d[1]) || d[1] <= d[0]) return false;
    const vals = stops.map((s) => s.value);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    if (hi > lo) {
      const snap = Math.abs(d[1] - d[0]) >= 100;
      for (const s of stops) {
        const v = d[0] + ((s.value - lo) / (hi - lo)) * (d[1] - d[0]);
        s.value = snap ? Math.round(v) : v;
      }
    }
    domain = [d[0], d[1]];
    refresh();
    emit();
    return true;
  }

  function deleteSelected() {
    if (stops.length <= 2) return;
    const i = stops.findIndex((s) => s.id === selectedId);
    if (i < 0) return;
    stops.splice(i, 1);
    const ordered = sortedStops();
    selectedId = ordered[Math.min(i, ordered.length - 1)].id;
    refresh();
    emit();
  }

  function attachChipDrag(el, id) {
    let pointerId = null;
    let grabOffset = 0;
    el.addEventListener("pointerdown", (e) => {
      if (pointerId !== null) return;
      pointerId = e.pointerId;
      el.setPointerCapture(pointerId);
      el.dataset.dragging = "1";
      selectedId = id;
      const s = stops.find((t) => t.id === id);
      const railTop = rail.getBoundingClientRect().top;
      grabOffset = s ? e.clientY - railTop - valueToY(s.value) : 0;
      refresh();
      e.preventDefault();
      e.stopPropagation();
    });
    el.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pointerId) return;
      const s = stops.find((t) => t.id === id);
      if (!s) return;
      const railTop = rail.getBoundingClientRect().top;
      s.value = yToValue(e.clientY - railTop - grabOffset);
      const span = Math.abs(domain[1] - domain[0]);
      // Snap to whole units on a metre-scale domain; the stop list is
      // nicer to read and the LUT cannot resolve sub-metre anyway.
      if (span >= 100) s.value = Math.round(s.value);
      refresh();
      emit();
      e.preventDefault();
    });
    const end = (e) => {
      if (e.pointerId !== pointerId) return;
      try { el.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;
      delete el.dataset.dragging;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  canvas.addEventListener("pointerdown", (e) => {
    const rect = canvas.getBoundingClientRect();
    let v = yToValue(e.clientY - rect.top);
    if (Math.abs(domain[1] - domain[0]) >= 100) v = Math.round(v);
    addStopAt(v);
    e.preventDefault();
  });

  colorInput.addEventListener("input", () => {
    const s = selected();
    if (!s) return;
    s.color = colorInput.value;
    refresh();
    emit();
  });

  valueInput.addEventListener("input", () => {
    const s = selected();
    if (!s) return;
    const v = Number(valueInput.value);
    if (!Number.isFinite(v)) return;
    s.value = v;
    refresh();
    emit();
  });

  addBtn.addEventListener("click", () => {
    // Insert halfway between the selection and the next stop above it,
    // or below it if the selection is already the top stop.
    const ordered = sortedStops();
    const i = ordered.findIndex((s) => s.id === selectedId);
    let v;
    if (i < 0) v = (domain[0] + domain[1]) / 2;
    else if (i < ordered.length - 1) v = (ordered[i].value + ordered[i + 1].value) / 2;
    else if (i > 0) v = (ordered[i - 1].value + ordered[i].value) / 2;
    else v = (domain[0] + domain[1]) / 2;
    if (Math.abs(domain[1] - domain[0]) >= 100) v = Math.round(v);
    addStopAt(v);
  });

  delBtn.addEventListener("click", deleteSelected);

  const onDomainInput = () => {
    const lo = Number(minInput.value);
    const hi = Number(maxInput.value);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return;
    domain = [lo, hi];
    refresh();
    emit();
  };
  minInput.addEventListener("input", onDomainInput);
  maxInput.addEventListener("input", onDomainInput);

  root.addEventListener("keydown", (e) => {
    if (e.target === valueInput || e.target === minInput || e.target === maxInput) return;
    if (e.key === "Backspace" || e.key === "Delete") {
      deleteSelected();
      e.preventDefault();
    }
  });

  headToggle.addEventListener("click", () => {
    const next = root.dataset.collapsed === "1" ? "0" : "1";
    root.dataset.collapsed = next;
    headToggle.textContent = next === "1" ? "▸" : "▾";
    headToggle.title = next === "1" ? "Expand" : "Collapse";
  });

  // Keep wheel and drag gestures on the editor from reaching a map
  // underneath it.
  for (const type of ["wheel", "pointerdown", "dblclick"]) {
    root.addEventListener(type, (e) => e.stopPropagation(), { passive: type === "wheel" ? false : undefined });
  }

  refresh();
  emit();

  return {
    element: root,
    get lut() { return lut; },
    getStops: () => sortedStops().map(({ value, color }) => ({ value, color })),
    getDomain: () => [...domain],
    setStops(next) {
      stops = next.map((s, i) => ({ id: `${ns}-set${nextId++}-${i}`, value: s.value, color: s.color }));
      selectedId = stops.length > 0 ? stops[0].id : null;
      refresh();
      emit();
    },
    /** Move the axis, leaving the stops where they are. */
    setDomain(next) {
      if (!Number.isFinite(next[0]) || !Number.isFinite(next[1]) || next[1] <= next[0]) return;
      domain = [next[0], next[1]];
      refresh();
      emit();
    },
    /** Move the axis and rescale the stops to span it. Returns false on a bad range. */
    fitTo,
    setCollapsed(v) {
      root.dataset.collapsed = v ? "1" : "0";
      headToggle.textContent = v ? "▸" : "▾";
    },
    destroy() {
      root.remove();
      chipEls.clear();
    },
  };
}
