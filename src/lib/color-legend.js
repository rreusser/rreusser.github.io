// Reusable ParaView-style color-scale legend.
//
// A compact vertical color bar with 1/2/5 "nice" tick marks and numeric
// labels, a small palette button that opens a colormap selector, and mouse
// interactions to pan (drag) and zoom (wheel) the data range. It is purely
// presentational and rendering-agnostic: it owns the colormap definitions and
// the [min, max] data window, and reports changes through callbacks. A consumer
// (WebGL/WebGPU/canvas/SVG) uploads the colormap via `getLUT()` and colors its
// own scalar field using the reported range.
//
//   const legend = createColorLegend({
//     min: 0, max: 1, colormap: 'turbo', label: 'Stress',
//     onRangeChange: ({min, max}) => { ... },
//     onColormapChange: (name) => { renderer.setColormap(legend.getLUT()); },
//   });
//   someAbsolutelyPositionedContainer.appendChild(legend.element);
//
// The returned `element` is `position: absolute` with no anchor set — position
// it by setting `style.right/bottom/...` on it, or wrap it yourself.

// ---------------------------------------------------------------------------
// Colormaps. Each entry samples t in [0, 1] to an [r, g, b] tuple in [0, 255].
// `diverging: true` marks maps whose neutral midpoint is meaningful (used as a
// hint by consumers that may want a symmetric range; the legend itself is
// agnostic). These same definitions feed both the on-screen bar and the LUT
// uploaded to the renderer, so the bar and the surface always agree.
// ---------------------------------------------------------------------------

// Google's Turbo, evaluated from its published polynomial fit (sRGB, [0,1]).
function turbo(t) {
  const x = Math.min(Math.max(t, 0), 1);
  const r = 0.13572138 + x * (4.61539260 + x * (-42.66032258 + x * (132.13108234 + x * (-152.94239396 + x * 59.28637943))));
  const g = 0.09140261 + x * (2.19418839 + x * (4.84296658 + x * (-14.18503333 + x * (4.27729857 + x * 2.82956604))));
  const b = 0.10667330 + x * (12.64194608 + x * (-60.58204836 + x * (110.36276771 + x * (-89.90310912 + x * 27.34824973))));
  return [clamp255(r * 255), clamp255(g * 255), clamp255(b * 255)];
}

function clamp255(v) { return Math.max(0, Math.min(255, v)); }

// Piecewise-linear interpolation through a list of [position, r, g, b] stops.
function lerpStops(stops, t) {
  const x = Math.min(Math.max(t, 0), 1);
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const a = stops[i - 1], b = stops[i];
      const f = (x - a[0]) / (b[0] - a[0] || 1);
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
    }
  }
  const last = stops[stops.length - 1];
  return [last[1], last[2], last[3]];
}

const VIRIDIS_STOPS = [
  [0.0, 68, 1, 84], [0.13, 71, 44, 122], [0.25, 59, 82, 139], [0.38, 44, 113, 142],
  [0.5, 33, 144, 140], [0.63, 39, 173, 129], [0.75, 92, 200, 99], [0.88, 170, 220, 50],
  [1.0, 253, 231, 37],
];
const PLASMA_STOPS = [
  [0.0, 13, 8, 135], [0.25, 126, 3, 168], [0.5, 204, 71, 120], [0.75, 248, 149, 64],
  [1.0, 240, 249, 33],
];
const INFERNO_STOPS = [
  [0.0, 0, 0, 4], [0.13, 31, 12, 72], [0.25, 85, 15, 109], [0.38, 136, 34, 106],
  [0.5, 186, 54, 85], [0.63, 227, 89, 51], [0.75, 249, 140, 10], [0.88, 249, 201, 50],
  [1.0, 252, 255, 164],
];
const CIVIDIS_STOPS = [
  [0.0, 0, 32, 77], [0.25, 60, 77, 108], [0.5, 124, 123, 120], [0.75, 188, 166, 90],
  [1.0, 255, 233, 69],
];
// Cool-warm diverging (matches the diverging map used elsewhere in the repo):
// blue → near-white at the midpoint → red.
const COOLWARM_STOPS = [
  [0.0, 59, 76, 192], [0.5, 242, 242, 242], [1.0, 181, 23, 41],
];

export const COLORMAPS = [
  { name: 'turbo', label: 'Turbo', diverging: false, fn: turbo },
  { name: 'viridis', label: 'Viridis', diverging: false, fn: (t) => lerpStops(VIRIDIS_STOPS, t) },
  { name: 'inferno', label: 'Inferno', diverging: false, fn: (t) => lerpStops(INFERNO_STOPS, t) },
  { name: 'plasma', label: 'Plasma', diverging: false, fn: (t) => lerpStops(PLASMA_STOPS, t) },
  { name: 'cividis', label: 'Cividis', diverging: false, fn: (t) => lerpStops(CIVIDIS_STOPS, t) },
  { name: 'coolwarm', label: 'Cool–warm', diverging: true, fn: (t) => lerpStops(COOLWARM_STOPS, t) },
  { name: 'gray', label: 'Grayscale', diverging: false, fn: (t) => { const v = 30 + 205 * Math.min(Math.max(t, 0), 1); return [v, v, v]; } },
];

// ---------------------------------------------------------------------------
// Nice tick generation (1/2/5 × 10ⁿ) and label formatting.
// ---------------------------------------------------------------------------

function niceStep(rough) {
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const f = rough / pow;
  const nice = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return nice * pow;
}

function niceTicks(min, max, target = 5) {
  const span = max - min;
  if (!(span > 0) || !isFinite(span)) return [min];
  const step = niceStep(span / Math.max(1, target));
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  // Guard against fp drift producing a runaway loop.
  for (let v = start, i = 0; v <= max + step * 1e-6 && i < 1000; v += step, i++) {
    ticks.push(Math.abs(v) < step * 1e-6 ? 0 : v);
  }
  return ticks;
}

function defaultFormat(v, span) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  // Use exponential notation outside a comfortable fixed-point band.
  if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(1).replace('e+', 'e').replace('e-0', 'e-').replace('e+0', 'e');
  // Choose decimals from the magnitude of the tick spacing, not the value.
  const decimals = Math.max(0, Math.min(6, Math.ceil(-Math.log10(span || a)) + 1));
  return v.toFixed(decimals).replace(/\.?0+$/, '');
}

// ---------------------------------------------------------------------------
// Legend component.
// ---------------------------------------------------------------------------

const NS = 'http://www.w3.org/2000/svg';

export function createColorLegend({
  min = 0,
  max = 1,
  colormap = 'turbo',
  colormaps = COLORMAPS,
  label = '',
  barWidth = 16,
  barHeight = 132,
  ticks = 5,
  format,
  draggable = true,
  zoomable = true,
  showSelector = true,
  onRangeChange = () => {},
  onColormapChange = () => {},
  onReset = () => {},
} = {}) {
  const maps = colormaps;
  const findMap = (name) => maps.find((m) => m.name === name) || maps[0];
  let current = findMap(colormap);
  let lo = min, hi = max;
  const fmt = format || ((v) => defaultFormat(v, (hi - lo) || Math.abs(v) || 1));

  const FG = 'var(--theme-foreground, #1b1e23)';
  const BG = 'var(--theme-background, #fff)';

  // Root: no panel box — the bar and labels float directly over the figure so
  // the legend stays unobtrusive. Labels carry a text halo (drawn below) for
  // legibility over whatever the figure shows.
  const element = document.createElement('div');
  element.className = 'color-legend';
  element.style.cssText = [
    'position:absolute',
    'display:inline-flex', 'flex-direction:column', 'gap:3px',
    // Padding both enlarges the interaction area (the bar alone is narrow) and
    // gives the hover affordance room; box-sizing keeps the anchor offset exact.
    'padding:5px', 'box-sizing:border-box', 'border-radius:7px',
    'transition:background 0.12s ease-out, box-shadow 0.12s ease-out',
    `font:11px/1.25 var(--sans-serif, system-ui, sans-serif)`,
    `color:${FG}`,
    'user-select:none', '-webkit-user-select:none',
    'pointer-events:auto',
    draggable || zoomable ? 'cursor:grab' : 'cursor:default',
  ].join(';');

  // Halo so text stays readable over any figure background.
  const HALO = `text-shadow:0 0 3px ${BG},0 0 2px ${BG},0 0 1px ${BG}`;

  // Header: just the palette button, right-aligned. The title is vertical (set
  // up below) so its length never changes the widget width.
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;height:14px';

  let paletteBtn = null;
  if (showSelector) {
    paletteBtn = document.createElement('button');
    paletteBtn.type = 'button';
    paletteBtn.title = 'Choose color scale';
    paletteBtn.style.cssText = [
      'flex:0 0 auto', 'display:flex', 'align-items:center', 'justify-content:center',
      'width:18px', 'height:14px', 'padding:0', 'cursor:pointer',
      'border:none', 'border-radius:4px', 'background:transparent', `color:${FG}`,
      `filter:drop-shadow(0 0 1px ${BG}) drop-shadow(0 0 1px ${BG})`,
    ].join(';');
    paletteBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><circle cx="5.5" cy="6" r="0.6" fill="currentColor" stroke="none"/><circle cx="8" cy="5" r="0.6" fill="currentColor" stroke="none"/><circle cx="10.5" cy="6.5" r="0.6" fill="currentColor" stroke="none"/><circle cx="10" cy="9.5" r="0.6" fill="currentColor" stroke="none"/></svg>`;
    paletteBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePopup(); });
    header.appendChild(paletteBtn);
  }
  element.appendChild(header);

  // Body: vertical title + color bar (canvas) + ticks SVG --------------------
  const body = document.createElement('div');
  body.style.cssText = 'display:flex;align-items:stretch;gap:0';

  // Vertical title to the left of the bar (ParaView style): a long label runs
  // up the bar's height instead of widening the widget. Reads bottom-to-top.
  const TITLE_W = 15;
  const title = document.createElement('div');
  title.textContent = label;
  title.title = label;
  title.style.cssText = [
    `width:${TITLE_W}px`, `height:${barHeight}px`, 'flex:0 0 auto',
    'writing-mode:vertical-rl', 'transform:rotate(180deg)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'white-space:nowrap', 'overflow:hidden',
    `font-weight:600`, `color:${FG}`, HALO,
  ].join(';');
  body.appendChild(title);

  // Canvas bar (not a CSS gradient): the LUT is written texel-exact so there is
  // no gradient-edge rounding (which produced a stray wrapped pixel at the end).
  const bar = document.createElement('canvas');
  bar.style.cssText = [
    `width:${barWidth}px`, `height:${barHeight}px`, 'flex:0 0 auto',
    'display:block', 'border-radius:2px',
    'box-shadow:0 0 0 1px rgba(0,0,0,0.25)',
    draggable ? 'cursor:grab' : 'cursor:default',
  ].join(';');
  const barCtx = bar.getContext('2d');

  const svg = document.createElementNS(NS, 'svg');
  const SVG_W = 48;
  svg.setAttribute('width', String(SVG_W));
  svg.setAttribute('height', String(barHeight));
  svg.style.cssText = 'overflow:visible;flex:0 0 auto;margin-left:3px';

  body.appendChild(bar);
  body.appendChild(svg);
  element.appendChild(body);

  // Pin the widget width to its fixed parts (vertical title + bar + labels), so
  // a long label can never widen it and shove the right-anchored legend toward
  // the figure center — the title just runs further up the bar instead. Wide
  // tick labels overflow harmlessly (overflow is visible). box-sizing is
  // border-box, so width includes the 5px padding on each side.
  const SVG_MARGIN = 3;
  element.style.width = `${TITLE_W + barWidth + SVG_MARGIN + SVG_W + 10}px`;

  // Colormap selector popup ---------------------------------------------------
  let popup = null;
  function buildPopup() {
    popup = document.createElement('div');
    popup.style.cssText = [
      'position:absolute', 'top:0', 'right:calc(100% + 6px)',
      'display:flex', 'flex-direction:column', 'gap:3px',
      'padding:6px', 'border-radius:6px',
      'border:1px solid rgba(127,127,127,0.3)',
      `background:color-mix(in srgb, ${BG} 92%, transparent)`,
      'box-shadow:0 4px 16px rgba(0,0,0,0.2)', 'z-index:10',
    ].join(';');
    for (const m of maps) {
      const row = document.createElement('button');
      row.type = 'button';
      row.style.cssText = [
        'display:flex', 'align-items:center', 'gap:7px',
        'padding:3px 5px', 'cursor:pointer', 'white-space:nowrap',
        'border:1px solid transparent', 'border-radius:4px',
        'background:transparent', `color:${FG}`,
        'font:11px/1.2 var(--sans-serif, system-ui, sans-serif)',
      ].join(';');
      const sw = document.createElement('canvas');
      sw.style.cssText = 'width:44px;height:11px;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,0.25);display:block;flex:0 0 auto';
      paintColormap(sw.getContext('2d'), sw, m.fn, 44, 11, false);
      const nm = document.createElement('span');
      nm.textContent = m.label;
      row.appendChild(sw); row.appendChild(nm);
      row.addEventListener('mouseenter', () => { row.style.background = 'rgba(127,127,127,0.14)'; });
      row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        applyColormap(m.name);
        closePopup();
        onColormapChange(m.name);
      });
      popup.appendChild(row);
    }
    element.appendChild(popup);
  }
  function togglePopup() { popup ? closePopup() : openPopup(); }
  function openPopup() {
    buildPopup();
    // Defer the document listeners so the press that opened the popup doesn't
    // immediately close it. Listen for both mouse and touch dismissals.
    setTimeout(() => {
      document.addEventListener('mousedown', onDocDown);
      document.addEventListener('touchstart', onDocDown);
    }, 0);
  }
  function closePopup() {
    if (popup) { popup.remove(); popup = null; }
    document.removeEventListener('mousedown', onDocDown);
    document.removeEventListener('touchstart', onDocDown);
  }
  // Ignore clicks inside the popup or on the palette button (its inner <svg>
  // would otherwise read as "outside" and close the popup before the button's
  // click handler could toggle it).
  function onDocDown(e) {
    if (!popup) return;
    if (popup.contains(e.target)) return;
    if (paletteBtn && paletteBtn.contains(e.target)) return;
    closePopup();
  }

  // Rendering -----------------------------------------------------------------
  // Fill a canvas from the colormap, one device-pixel line per sample, so colors
  // are texel-exact (a CSS gradient rounds its end stops, leaving a stray wrapped
  // pixel). `vertical` runs max→min top→bottom (ParaView convention); otherwise
  // min→max left→right.
  function paintColormap(ctx, canvas, fn, cssW, cssH, vertical) {
    const dpr = (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1);
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    if (vertical) {
      for (let py = 0; py < h; py++) {
        const t = 1 - py / (h - 1 || 1);
        const [r, g, b] = fn(t);
        ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        ctx.fillRect(0, py, w, 1);
      }
    } else {
      for (let px = 0; px < w; px++) {
        const t = px / (w - 1 || 1);
        const [r, g, b] = fn(t);
        ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        ctx.fillRect(px, 0, 1, h);
      }
    }
  }

  function drawBar() { paintColormap(barCtx, bar, current.fn, barWidth, barHeight, true); }

  function applyColormap(name) {
    const m = findMap(name);
    if (m === current) return;
    current = m;
    drawBar();
  }

  function drawTicks() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const span = hi - lo;
    if (!(span > 0)) return;
    const tickVals = niceTicks(lo, hi, ticks);
    for (const v of tickVals) {
      const y = barHeight * (1 - (v - lo) / span);
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', '0'); line.setAttribute('x2', '4');
      line.setAttribute('y1', String(y)); line.setAttribute('y2', String(y));
      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('opacity', '0.7');
      svg.appendChild(line);
      const text = document.createElementNS(NS, 'text');
      text.setAttribute('x', '7');
      text.setAttribute('y', String(y));
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', 'currentColor');
      // Halo: stroke the glyphs with the page background, painted under the fill,
      // so labels stay legible over the figure without a panel behind them.
      // Set via style (SVG presentation attributes don't resolve CSS var()).
      text.style.stroke = BG;
      text.style.strokeWidth = '2.5px';
      text.style.paintOrder = 'stroke';
      text.style.strokeLinejoin = 'round';
      text.textContent = fmt(v);
      svg.appendChild(text);
    }
  }

  function render() { drawBar(); drawTicks(); }

  // Interaction ---------------------------------------------------------------
  // The whole widget (bar, ticks, labels) is the hit area — the bar alone is too
  // narrow. Pixel positions map through the bar's vertical extent regardless of
  // where in the widget the cursor is.
  const overControls = (e) =>
    (paletteBtn && paletteBtn.contains(e.target)) || (popup && popup.contains(e.target));
  function barY(clientY) {
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(barHeight, clientY - rect.top));
  }

  // Hover affordance: a faint background appears when the widget is interactive
  // and the pointer is over it (or a drag is in progress), making the (otherwise
  // chromeless) hit area discoverable.
  let dragging = false;
  const setHover = (on) => {
    if (on) {
      element.style.background = `color-mix(in srgb, ${BG} 60%, transparent)`;
      element.style.boxShadow = '0 1px 8px rgba(0,0,0,0.12)';
    } else if (!dragging) {
      element.style.background = '';
      element.style.boxShadow = '';
    }
  };
  if (draggable || zoomable) {
    element.addEventListener('mouseenter', () => setHover(true));
    element.addEventListener('mouseleave', () => setHover(false));
  }

  if (draggable) {
    let startY = 0, startLo = 0, startHi = 0;
    const onMove = (e) => {
      if (!dragging) return;
      const span = startHi - startLo;
      // Drag so the value under the cursor follows the cursor (grab-the-strip).
      const d = ((e.clientY - startY) / barHeight) * span;
      lo = startLo + d; hi = startHi + d;
      drawTicks();
      onRangeChange({ min: lo, max: hi });
      e.preventDefault();
    };
    const onUp = () => {
      dragging = false;
      element.style.cursor = 'grab';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setHover(false);
    };
    element.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || overControls(e)) return;
      dragging = true; startY = e.clientY; startLo = lo; startHi = hi;
      element.style.cursor = 'grabbing';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      e.preventDefault();
    });
  }

  if (zoomable) {
    element.addEventListener('wheel', (e) => {
      if (overControls(e)) return;
      const yPx = barY(e.clientY);
      const pivot = valueAt(yPx);
      const fracTop = yPx / barHeight;           // 0 at top (hi), 1 at bottom (lo)
      const factor = Math.exp(e.deltaY * 0.0015); // wheel down (deltaY>0) → zoom out
      let span = (hi - lo) * factor;
      // Clamp the span to a sane dynamic range so it can't collapse or explode.
      const ref = Math.abs(pivot) || 1;
      span = Math.max(ref * 1e-9, Math.min(ref * 1e12, span));
      hi = pivot + fracTop * span;
      lo = hi - span;
      drawTicks();
      onRangeChange({ min: lo, max: hi });
      e.preventDefault(); e.stopPropagation();
    }, { passive: false });
  }

  // Double-click rescales to the data range (the consumer re-fits via onReset).
  element.addEventListener('dblclick', (e) => {
    if (overControls(e)) return;
    e.preventDefault();
    onReset();
  });

  // Touch: one finger pans, two fingers pinch-zoom about their midpoint, and a
  // double-tap rescales (dblclick doesn't fire reliably from touch). touch-action
  // none keeps the browser from scrolling/zooming the page over the widget.
  if (draggable || zoomable) {
    element.style.touchAction = 'none';
    let gesture = null;          // { mode, ... baseline captured at gesture start }
    let lastTapAt = 0, tapMoved = false, tapStartY = 0;

    const initGesture = (touches) => {
      const rect = bar.getBoundingClientRect();
      if (touches.length === 1 && draggable) {
        gesture = { mode: 'pan', startY: touches[0].clientY, lo0: lo, hi0: hi };
      } else if (touches.length >= 2 && zoomable) {
        const a = touches[0], b = touches[1];
        const dist0 = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1;
        const fracTop = Math.max(0, Math.min(1, ((a.clientY + b.clientY) / 2 - rect.top) / barHeight));
        const span0 = hi - lo;
        gesture = { mode: 'pinch', dist0, span0, pivot: hi - fracTop * span0 };
      } else {
        gesture = null;
      }
    };

    element.addEventListener('touchstart', (e) => {
      if (overControls(e)) return;
      if (e.touches.length === 1) { tapMoved = false; tapStartY = e.touches[0].clientY; }
      dragging = true; setHover(true);
      initGesture(e.touches);
      e.preventDefault();
    }, { passive: false });

    element.addEventListener('touchmove', (e) => {
      if (!gesture) return;
      const rect = bar.getBoundingClientRect();
      if (gesture.mode === 'pan' && e.touches.length === 1) {
        const t = e.touches[0];
        if (Math.abs(t.clientY - tapStartY) > 6) tapMoved = true;
        const d = ((t.clientY - gesture.startY) / barHeight) * (gesture.hi0 - gesture.lo0);
        lo = gesture.lo0 + d; hi = gesture.hi0 + d;
      } else if (gesture.mode === 'pinch' && e.touches.length >= 2) {
        const a = e.touches[0], b = e.touches[1];
        const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1;
        let span = gesture.span0 * (gesture.dist0 / dist); // spread apart → zoom in
        const ref = Math.abs(gesture.pivot) || 1;
        span = Math.max(ref * 1e-9, Math.min(ref * 1e12, span));
        const fracTop = Math.max(0, Math.min(1, ((a.clientY + b.clientY) / 2 - rect.top) / barHeight));
        hi = gesture.pivot + fracTop * span; lo = hi - span;
      } else {
        return;
      }
      drawTicks();
      onRangeChange({ min: lo, max: hi });
      e.preventDefault();
    }, { passive: false });

    const onTouchEnd = (e) => {
      if (e.touches.length > 0) { initGesture(e.touches); return; } // a finger lifted; continue
      // All fingers up. A quick, still single-finger tap counts toward a
      // double-tap → rescale.
      if (gesture && gesture.mode === 'pan' && !tapMoved) {
        const now = (typeof performance !== 'undefined' ? performance.now() : 0);
        if (now - lastTapAt < 300) { onReset(); lastTapAt = 0; }
        else lastTapAt = now;
      }
      gesture = null; dragging = false; setHover(false);
    };
    element.addEventListener('touchend', onTouchEnd);
    element.addEventListener('touchcancel', onTouchEnd);
  }

  // Map a pixel y within the bar to a data value (top = hi, bottom = lo).
  function valueAt(yPx) { return hi - (yPx / barHeight) * (hi - lo); }

  render();

  // Public API ----------------------------------------------------------------
  return {
    element,
    // Programmatic range update (e.g. when the consumer auto-fits to data).
    setRange(newMin, newMax) {
      if (newMin === lo && newMax === hi) return;
      lo = newMin; hi = newMax;
      drawTicks();
    },
    getRange() { return { min: lo, max: hi }; },
    setColormap(name) {
      applyColormap(name);
      if (popup) closePopup();
    },
    getColormap() { return current.name; },
    isDiverging() { return !!current.diverging; },
    getColormapFn() { return current.fn; },
    setLabel(text) { title.textContent = text; title.title = text; },
    // RGBA Uint8 LUT (length n*4) for GPU upload. Alpha is fully opaque.
    getLUT(n = 256) {
      const out = new Uint8Array(n * 4);
      for (let i = 0; i < n; i++) {
        const [r, g, b] = current.fn(i / (n - 1));
        out[i * 4] = r | 0; out[i * 4 + 1] = g | 0; out[i * 4 + 2] = b | 0; out[i * 4 + 3] = 255;
      }
      return out;
    },
    destroy() {
      closePopup();
      element.remove();
    },
  };
}
