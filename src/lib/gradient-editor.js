// A draggable colour-ramp editor, built for hypsometric tinting but not
// specific to it.
//
// The ramp runs vertically because that is how an elevation legend
// reads: low at the bottom, high at the top. Stops are pinned to values
// in the domain (metres, for terrain): each one has an elevation you can
// read off the axis and type into a field.
//
// The domain itself is a *window* that you move and resize, and moving
// it carries the ramp along: every stop keeps its position on screen
// while its elevation changes to match. Panning a map from a 1000-1500 m
// valley to a 1500-2000 m one is then a single drag of the window
// control, not a retyped range followed by nine stops dragged back into
// place. A window control is offered when `bounds` is given, and it is a
// two-thumb range slider over the whole plausible span of the quantity
// (for terrain, roughly the Dead Sea shore to Everest): drag a thumb to
// resize, drag the bar between them to slide, click the track outside
// the selection to jump the window there at its current width, or roll
// the wheel over it to zoom about its centre.
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
import { rangeInput } from "./range-slider.js";

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

.grd-preset-wrap { position: relative; flex: 1 1 auto; min-width: 0; }
.grd-preset-btn {
  width: 100%;
  font: inherit;
  text-align: left;
  color: var(--grd-fg);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--grd-line);
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}
.grd-preset-btn:hover { background: rgba(255, 255, 255, 0.2); }
.grd-preset-btn .sw {
  flex: 1 1 auto;
  min-width: 0;
  height: 11px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.4);
}
.grd-preset-btn .caret { flex: 0 0 auto; opacity: 0.7; }

.grd-preset-menu {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 4px);
  z-index: 3;
  max-height: 260px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: rgba(18, 18, 20, 0.97);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--grd-line);
  border-radius: 6px;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.5);
  padding: 4px;
}
.grd-preset-menu[hidden] { display: none; }
.grd-preset-group {
  padding: 5px 6px 2px;
  color: var(--grd-fg-dim);
  opacity: 0.75;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 10px;
}
.grd-preset-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--grd-fg-dim);
}
.grd-preset-row:hover { background: rgba(255, 255, 255, 0.16); color: var(--grd-fg); }
.grd-preset-row[data-active="1"] { color: var(--grd-fg); font-weight: 600; }
.grd-preset-row .sw {
  flex: 0 0 76px;
  height: 11px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.4);
}

/* The range slider ships a theme tuned for a page background. On this
   dark translucent panel its track disappears, so restate the surfaces
   it draws. These selectors carry an extra class over the component's
   own (which are .scope-xxx .thumb and the like) because it injects its
   stylesheet inside its own DOM, later in the document than this one,
   so a tie on specificity would go to the component. */
.grd-window { padding: 0 2px; }
.grd-editor .grd-window .range-slider {
  width: 100%;
  margin: 2px 0 0;
  color: #9ecbff;
  --thumb-size: 13px;
}
.grd-editor .grd-window .range-track {
  background-color: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.28);
}
.grd-editor .grd-window .thumb {
  background: #9ecbff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}
/* The component centres each thumb on its edge of the selection, so the
   two of them eat one thumb-width out of the middle. A 500 m window on
   a -440 to 8848 m track is about 14 px wide, which leaves nothing at
   all to grab, and dragging the middle to slide the window is the whole
   point of the control here. Move the thumbs to flank the selection
   instead, so the bar between them stays grabbable at any width. */
.grd-editor .grd-window .thumb-min { left: calc(-1 * var(--thumb-size)); }
.grd-editor .grd-window .thumb-max { right: calc(-1 * var(--thumb-size)); }
.grd-window-ends {
  display: flex;
  justify-content: space-between;
  color: var(--grd-fg-dim);
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
  margin-top: 9px;
}
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
 * @param {[number,number]} [opts.bounds]  outer limits of the window
 *        control, e.g. [-440, 8848] for land elevation. Omit to hide it.
 * @param {number} [opts.boundsStep]       quantisation of the window control
 * @param {Array<{name:string, group?:string, stops:Array<{t:number,color:string}>}>} [opts.presets]
 *        named ramps to offer. Stop positions are normalized to [0,1] and
 *        mapped onto whatever window is current when one is picked, so
 *        choosing a preset restyles the ramp without moving the elevations
 *        it covers. An optional `group` sorts them into labelled sections,
 *        which a long list needs to stay navigable. Omit to hide the
 *        picker.
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
  bounds,
  boundsStep = 10,
  presets,
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
      setWindow(onFit());
    });
    domainRow.append(fitBtn);
  }

  // Preset picker. Applying one maps the preset's normalized stops onto
  // the current window, so it changes colours without disturbing which
  // elevations the ramp covers. Any hand edit afterwards flips the
  // picker back to "custom" so it never claims a ramp it no longer
  // describes.
  let closeMenu = () => {};
  let refreshPresetButton = () => {};

  let presetBtn = null;
  let presetMenu = null;
  let presetRow = null;
  let presetName = "";            // "" means hand-edited
  let applyingPreset = false;
  let menuSnapshot = null;        // stops to restore if the menu is dismissed

  // A CSS gradient sampled from the preset's own LUT, so the swatch is
  // built the same way the ramp is.
  const swatchCss = (p) => {
    const lut = buildOklabLUT(p.stops.map((st) => ({ value: st.t, color: st.color })),
      { size: 128, domain: [0, 1] });
    const n = 16;
    const parts = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      parts.push(`${oklabToHex(...sampleLUT(lut, [0, 1], t))} ${(t * 100).toFixed(1)}%`);
    }
    return `linear-gradient(to right, ${parts.join(", ")})`;
  };

  if (presets && presets.length > 0) {
    presetRow = document.createElement("div");
    presetRow.className = "grd-row";
    const label = document.createElement("label");
    label.textContent = "ramp";

    const wrap = document.createElement("div");
    wrap.className = "grd-preset-wrap";

    presetBtn = document.createElement("button");
    presetBtn.type = "button";
    presetBtn.className = "grd-preset-btn";
    presetBtn.title = "Pick a ramp. Hovering previews it; it only sticks when you click.";
    const btnSw = document.createElement("span");
    btnSw.className = "sw";
    const caret = document.createElement("span");
    caret.className = "caret";
    caret.textContent = "\u25BE";
    presetBtn.append(btnSw, caret);

    presetMenu = document.createElement("div");
    presetMenu.className = "grd-preset-menu";
    presetMenu.hidden = true;

    const rows = [];
    let lastGroup = null;
    for (const p of presets) {
      const g = p.group ?? "";
      if (g && g !== lastGroup) {
        const h = document.createElement("div");
        h.className = "grd-preset-group";
        h.textContent = g;
        presetMenu.appendChild(h);
        lastGroup = g;
      }
      const row = document.createElement("div");
      row.className = "grd-preset-row";
      row.dataset.name = p.name;
      const sw = document.createElement("span");
      sw.className = "sw";
      sw.style.background = swatchCss(p);
      const nm = document.createElement("span");
      nm.textContent = p.name;
      row.append(sw, nm);
      // Hovering previews without committing, the way the eclipse map's
      // palette menu does. Dismissing restores whatever was there first,
      // including a hand-edited ramp.
      row.addEventListener("mouseenter", () => applyPreset(p, { preview: true }));
      row.addEventListener("click", (e) => { e.stopPropagation(); applyPreset(p); closeMenu(true); });
      presetMenu.appendChild(row);
      rows.push(row);
    }

    const markActive = () => {
      for (const r of rows) r.dataset.active = r.dataset.name === presetName ? "1" : "0";
      const p = presets.find((q) => q.name === presetName);
      btnSw.style.background = p ? swatchCss(p) : (lut ? lutSwatchCss() : "none");
      presetBtn.title = presetName
        ? `${presetName}. Hovering previews; it only sticks when you click.`
        : "custom. Hovering previews; it only sticks when you click.";
    };
    const lutSwatchCss = () => {
      const n = 16, parts = [];
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const v = domain[0] + t * (domain[1] - domain[0]);
        parts.push(`${oklabToHex(...sampleLUT(lut, domain, v))} ${(t * 100).toFixed(1)}%`);
      }
      return `linear-gradient(to right, ${parts.join(", ")})`;
    };
    refreshPresetButton = markActive;

    const onDown = (e) => { if (!presetMenu.contains(e.target) && e.target !== presetBtn && !presetBtn.contains(e.target)) closeMenu(false); };
    const onKey = (e) => { if (e.key === "Escape") closeMenu(false); };
    const openMenu = () => {
      menuSnapshot = { stops: sortedStops().map(({ value, color }) => ({ value, color })), name: presetName };
      presetMenu.hidden = false;
      document.addEventListener("mousedown", onDown, true);
      document.addEventListener("keydown", onKey);
    };
    closeMenu = (committed) => {
      if (presetMenu.hidden) return;
      presetMenu.hidden = true;
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
      if (!committed && menuSnapshot) {
        applyingPreset = true;
        try { setStopsInternal(menuSnapshot.stops); } finally { applyingPreset = false; }
        presetName = menuSnapshot.name;
        markActive();
      }
      menuSnapshot = null;
    };
    presetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (presetMenu.hidden) openMenu(); else closeMenu(false);
    });

    wrap.append(presetBtn, presetMenu);
    presetRow.append(label, wrap);
  }

  function applyPreset(p, { preview = false } = {}) {
    const [d0, d1] = domain;
    const snap = Math.abs(d1 - d0) >= 100;
    const next = p.stops.map((st) => {
      const v = d0 + Math.min(1, Math.max(0, st.t)) * (d1 - d0);
      return { value: snap ? Math.round(v) : v, color: st.color };
    });
    applyingPreset = true;
    try {
      setStopsInternal(next);
    } finally {
      applyingPreset = false;
    }
    if (!preview) {
      presetName = p.name;
      refreshPresetButton();
    }
  }

  // Marks the ramp as hand-edited unless a preset is being applied.
  function markCustom() {
    if (applyingPreset) return;
    presetName = "";
    refreshPresetButton();
  }

  // Window control: a two-thumb slider over the full plausible span.
  let windowSlider = null;
  let windowRow = null;
  if (bounds && Number.isFinite(bounds[0]) && Number.isFinite(bounds[1]) && bounds[1] > bounds[0]) {
    windowRow = document.createElement("div");
    windowRow.className = "grd-window";
    windowSlider = rangeInput({
      min: bounds[0],
      max: bounds[1],
      step: boundsStep,
      value: [domain[0], domain[1]],
      ticks: Math.max(boundsStep, Math.round((bounds[1] - bounds[0]) / 8)),
    });
    windowSlider.title =
      "Drag a thumb to resize the window, the bar between them to slide it," +
      " click the track to jump it, or roll the wheel to zoom. The ramp" +
      " stretches to follow.";
    // While a gesture is in flight, rescale without rounding; round once
    // it settles. See the note on setWindow.
    windowSlider.addEventListener("input", () => {
      if (syncingWindow) return;
      setWindow(windowSlider.value, { snap: false });
    });
    windowSlider.addEventListener("change", () => {
      if (syncingWindow) return;
      snapStops();
      refresh();
      emit();
    });
    const ends = document.createElement("div");
    ends.className = "grd-window-ends";
    const lo = document.createElement("span");
    lo.textContent = `${bounds[0]}${unit}`;
    const hi = document.createElement("span");
    hi.textContent = `${bounds[1]}${unit}`;
    ends.append(lo, hi);
    windowRow.append(windowSlider, ends);
  }

  // Guard against the feedback loop of pushing the domain into the
  // slider and having its setter echo back as another window change.
  let syncingWindow = false;
  function syncWindowControl() {
    if (!windowSlider) return;
    const v = windowSlider.value;
    if (v[0] === domain[0] && v[1] === domain[1]) return;
    syncingWindow = true;
    try {
      windowSlider.value = [domain[0], domain[1]];
    } finally {
      syncingWindow = false;
    }
  }

  body.append(strip, stopRow, domainRow);
  if (windowRow) body.append(windowRow);
  if (presetRow) body.append(presetRow);
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

  function setStopsInternal(next) {
    stops = next.map((st, i) => ({ id: `${ns}-set${nextId++}-${i}`, value: st.value, color: st.color }));
    selectedId = stops.length > 0 ? stops[0].id : null;
    refresh();
    emit();
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
    markCustom();
    refresh();
    emit();
    return s;
  }

  /**
   * Move the window to `d`, carrying the stops with it so that each one
   * keeps the position it had on screen. A stop at the ramp's midpoint
   * stays at the midpoint and its elevation becomes the midpoint of the
   * new window; a stop that sat outside the window stays proportionally
   * outside.
   *
   * Moving the axis and leaving the elevations alone is the wrong
   * default. A ramp authored across 0 to 5200 m, windowed onto 500 m of
   * local relief, would collapse to a single flat colour, because every
   * stop but one falls outside the window.
   *
   * `snap` rounds the stops to whole units afterwards, which is only
   * wanted once a gesture is finished: rounding on every frame of a
   * drag would let the stops creep relative to one another, since each
   * frame would renormalise values that the previous frame had already
   * rounded.
   */
  function setWindow(d, { snap = true } = {}) {
    if (!d || !Number.isFinite(d[0]) || !Number.isFinite(d[1]) || d[1] <= d[0]) return false;
    const [o0, o1] = domain;
    const oSpan = o1 - o0;
    if (oSpan > 0) {
      for (const s of stops) {
        s.value = d[0] + ((s.value - o0) / oSpan) * (d[1] - d[0]);
      }
    }
    domain = [d[0], d[1]];
    if (snap) snapStops();
    syncWindowControl();
    refresh();
    emit();
    return true;
  }

  /** Round stop values to whole units on a coarse domain. */
  function snapStops() {
    if (Math.abs(domain[1] - domain[0]) < 100) return;
    for (const s of stops) s.value = Math.round(s.value);
  }

  function deleteSelected() {
    if (stops.length <= 2) return;
    const i = stops.findIndex((s) => s.id === selectedId);
    if (i < 0) return;
    stops.splice(i, 1);
    const ordered = sortedStops();
    selectedId = ordered[Math.min(i, ordered.length - 1)].id;
    markCustom();
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
      markCustom();
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
    markCustom();
    refresh();
    emit();
  });

  valueInput.addEventListener("input", () => {
    const s = selected();
    if (!s) return;
    const v = Number(valueInput.value);
    if (!Number.isFinite(v)) return;
    s.value = v;
    markCustom();
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

  // Typing a range is the same operation as dragging the window
  // control, so the ramp follows here too. One meaning for "the window
  // moved", whichever control moved it.
  const onDomainInput = () => {
    const lo = Number(minInput.value);
    const hi = Number(maxInput.value);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return;
    setWindow([lo, hi]);
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
    setStops: setStopsInternal,
    /** Apply a preset by name, mapped onto the current window. */
    applyPreset(name) {
      const p = (presets ?? []).find((q) => q.name === name);
      if (p) applyPreset(p);
    },
    /** Name of the ramp in effect, or "" when it has been hand-edited. */
    get presetName() { return presetName; },
    /**
     * Move the window, carrying the stops so each keeps its position on
     * screen. Returns false on a bad range.
     */
    setWindow,
    /**
     * Move the axis, leaving stop elevations untouched. The ramp will
     * appear to slide and clip. Rarely what you want; `setWindow` is
     * the operation every control in the UI performs.
     */
    setDomain(next) {
      if (!Number.isFinite(next[0]) || !Number.isFinite(next[1]) || next[1] <= next[0]) return;
      domain = [next[0], next[1]];
      syncWindowControl();
      refresh();
      emit();
    },
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
