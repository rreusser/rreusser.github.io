// Range slider with transform support
// Based on @mootari/range-slider, modified to support logarithmic and custom transforms

function randomScope(prefix = 'scope-') {
  return prefix + (performance.now() + Math.random()).toString(32).replace('.', '-');
}

function cssLength(v) {
  return v == null ? null : typeof v === 'number' ? `${v}px` : `${v}`;
}

const theme_Flat = `
/* Options */
:scope {
  color: var(--theme-foreground-focus, #3b99fc);
  width: 240px;
}

:scope {
  position: relative;
  display: inline-block;
  --thumb-size: 15px;
  --thumb-radius: calc(var(--thumb-size) / 2);
  padding: var(--thumb-radius) 0;
  margin: 2px;
  vertical-align: middle;
}
:scope .range-track {
  box-sizing: border-box;
  position: relative;
  height: 7px;
  background-color: var(--theme-foreground-faintest, hsl(0, 0%, 80%));
  overflow: visible;
  border-radius: 4px;
  border: 1px solid var(--theme-foreground-fainter, hsl(0, 0%, 60%));
  padding: 0 var(--thumb-radius);
}
:scope .range-track-zone {
  box-sizing: border-box;
  position: relative;
}
:scope .range-select {
  box-sizing: border-box;
  position: relative;
  left: var(--range-min);
  width: calc(var(--range-max) - var(--range-min));
  cursor: ew-resize;
  background: currentColor;
  height: 7px;
  border: inherit;
}
/* Expands the hotspot area. */
:scope .range-select:before {
  content: "";
  position: absolute;
  width: 100%;
  height: var(--thumb-size);
  left: 0;
  top: calc(2px - var(--thumb-radius));
}
:scope .range-select:focus,
:scope .thumb:focus {
  outline: none;
}
:scope .thumb {
  box-sizing: border-box;
  position: absolute;
  width: var(--thumb-size);
  height: var(--thumb-size);

  background: var(--theme-foreground-focus, #3b99fc);
  top: -4px;
  border-radius: 100%;
  border: none;
  cursor: default;
  margin: 0;
}
:scope .thumb:hover,
:scope .range-select:hover {
  filter: brightness(1.2);
}
:scope .thumb:active,
:scope .range-select:active {
  filter: brightness(0.85);
}
:scope .thumb-min {
  left: calc(-1px - var(--thumb-radius));
}
:scope .thumb-max {
  right: calc(-1px - var(--thumb-radius));
}
:scope.range-inverted .range-track {
  background-color: currentColor;
}
:scope.range-inverted .range-select {
  background: var(--theme-foreground-faintest, hsl(0, 0%, 80%));
}
`;

export function rangeInput(options = {}) {
  const {
    min = 0,
    max = 100,
    step = 'any',
    value: defaultValue = [min, max],
    color,
    width,
    theme = theme_Flat,
    transform = null,
    invert = null,
  } = options;

  // Set up transform functions
  // If transform is provided without invert, try to auto-detect common cases
  let toTransformed, fromTransformed;
  if (transform) {
    toTransformed = transform;
    if (invert) {
      fromTransformed = invert;
    } else if (transform === Math.log) {
      fromTransformed = Math.exp;
    } else if (transform === Math.sqrt) {
      fromTransformed = x => x * x;
    } else {
      throw new Error('rangeInput: transform provided without invert function');
    }
  } else {
    toTransformed = x => x;
    fromTransformed = x => x;
  }

  // Transform the min/max to get the internal linear range
  const tMin = toTransformed(min);
  const tMax = toTransformed(max);

  const controls = {};
  const scope = randomScope();
  const clamp = (a, b, v) => v < a ? a : v > b ? b : v;

  // Will be used to sanitize values while avoiding floating point issues.
  const inputEl = document.createElement('input');
  inputEl.type = 'range';
  inputEl.min = min;
  inputEl.max = max;
  inputEl.step = step;

  const dom = document.createElement('div');
  dom.className = `${scope} range-slider`;
  if (color) dom.style.color = color;
  if (width) dom.style.width = cssLength(width);

  dom.innerHTML = `
    <div class="range-track">
      <div class="range-track-zone">
        <div class="range-select" tabindex="0">
          <div class="thumb thumb-min" tabindex="0"></div>
          <div class="thumb thumb-max" tabindex="0"></div>
        </div>
      </div>
    </div>
    <style>${theme.replace(/:scope\b/g, '.' + scope)}</style>
  `;

  controls.track = dom.querySelector('.range-track');
  controls.zone = dom.querySelector('.range-track-zone');
  controls.range = dom.querySelector('.range-select');
  controls.min = dom.querySelector('.thumb-min');
  controls.max = dom.querySelector('.thumb-max');

  let value = [], changed = false;
  Object.defineProperty(dom, 'value', {
    get: () => [...value],
    set: ([a, b]) => {
      value = sanitize(a, b);
      updateRange();
    },
  });

  const sanitize = (a, b) => {
    a = isNaN(a) ? min : ((inputEl.value = a), inputEl.valueAsNumber);
    b = isNaN(b) ? max : ((inputEl.value = b), inputEl.valueAsNumber);
    return [Math.min(a, b), Math.max(a, b)];
  };

  // Convert value to position ratio (0-1) using transform
  const valueToRatio = v => (toTransformed(v) - tMin) / (tMax - tMin);

  // Convert position ratio (0-1) to value using inverse transform
  const ratioToValue = r => fromTransformed(tMin + r * (tMax - tMin));

  const updateRange = () => {
    dom.style.setProperty('--range-min', `${valueToRatio(value[0]) * 100}%`);
    dom.style.setProperty('--range-max', `${valueToRatio(value[1]) * 100}%`);
  };

  const dispatch = name => {
    dom.dispatchEvent(new Event(name, { bubbles: true }));
  };

  const setValue = (vmin, vmax) => {
    const [pmin, pmax] = value;
    value = sanitize(vmin, vmax);
    updateRange();
    // Only dispatch if values have changed.
    if (pmin === value[0] && pmax === value[1]) return;
    dispatch('input');
    changed = true;
  };

  setValue(...defaultValue);

  // Mousemove handlers - work in ratio space for proper transform support
  const handlers = new Map([
    [controls.min, (dt, ov) => {
      // Convert original values to ratios, adjust, convert back
      const r0 = valueToRatio(ov[0]);
      const r1 = valueToRatio(ov[1]);
      const newR = clamp(0, r1, r0 + dt);
      setValue(ratioToValue(newR), ov[1]);
    }],
    [controls.max, (dt, ov) => {
      const r0 = valueToRatio(ov[0]);
      const r1 = valueToRatio(ov[1]);
      const newR = clamp(r0, 1, r1 + dt);
      setValue(ov[0], ratioToValue(newR));
    }],
    [controls.range, (dt, ov) => {
      const r0 = valueToRatio(ov[0]);
      const r1 = valueToRatio(ov[1]);
      const d = r1 - r0;
      const newR0 = clamp(0, 1 - d, r0 + dt);
      setValue(ratioToValue(newR0), ratioToValue(newR0 + d));
    }],
  ]);

  // Returns client offset object.
  const pointer = e => e.touches ? e.touches[0] : e;

  let initialX, initialV, target, dragging = false;

  function handleDrag(e) {
    // Gracefully handle exit and reentry of the viewport.
    if (!e.buttons && !e.touches) {
      handleDragStop();
      return;
    }
    dragging = true;
    const w = controls.zone.getBoundingClientRect().width;
    e.preventDefault();
    // dt is now in ratio space (0-1)
    handlers.get(target)((pointer(e).clientX - initialX) / w, initialV);
  }

  function handleDragStop(e) {
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('touchmove', handleDrag);
    document.removeEventListener('mouseup', handleDragStop);
    document.removeEventListener('touchend', handleDragStop);
    if (changed) dispatch('change');
  }

  dom.ontouchstart = dom.onmousedown = e => {
    dragging = false;
    changed = false;
    if (!handlers.has(e.target)) return;
    document.addEventListener('mousemove', handleDrag, { passive: false });
    document.addEventListener('touchmove', handleDrag, { passive: false });
    document.addEventListener('mouseup', handleDragStop);
    document.addEventListener('touchend', handleDragStop);
    e.preventDefault();
    e.stopPropagation();

    target = e.target;
    initialX = pointer(e).clientX;
    initialV = value.slice();
  };

  controls.track.onclick = e => {
    if (dragging) return;
    changed = false;
    const r = controls.zone.getBoundingClientRect();
    const t = clamp(0, 1, (pointer(e).clientX - r.left) / r.width);
    const v = ratioToValue(t);
    const [vmin, vmax] = value;
    // Click moves the nearest edge, or shifts the whole range if clicking outside
    if (v < vmin) {
      const d = vmax - vmin;
      setValue(v, v + d);
    } else if (v > vmax) {
      const d = vmax - vmin;
      setValue(v - d, v);
    }
    if (changed) dispatch('change');
  };

  return dom;
}

// Compute decimal places from step (e.g., 0.001 -> 3, 0.1 -> 1)
function precisionFromStep(step) {
  if (!step || step >= 1) return 0;
  const str = step.toString();
  const decimalIndex = str.indexOf('.');
  return decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;
}

export function interval(range = [], options = {}) {
  const [min = 0, max = 1] = range;
  const step = options.step ?? 0.001;
  const precision = options.precision ?? precisionFromStep(step);
  let invertState = false;
  const defaultFormat = (val) => {
    const [start, end] = val.range;
    if (val.invert) {
      return `(-∞, ${start.toFixed(precision)}] ∪ [${end.toFixed(precision)}, ∞)`;
    }
    return `[${start.toFixed(precision)}, ${end.toFixed(precision)}]`;
  };
  const {
    label = null,
    value = [min, max],
    format = defaultFormat,
    color,
    width = 360,
    theme,
    transform = null,
    invert = null,
    invertible = false,
    __ns__ = randomScope(),
  } = options;

  const css = `
#${__ns__} {
  font: 13px/1.2 var(--sans-serif);
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  max-width: 100%;
  width: auto;
}
@media only screen and (min-width: 30em) {
  #${__ns__} {
    flex-wrap: nowrap;
    width: ${cssLength(width)};
  }
}
#${__ns__} .label {
  width: 120px;
  padding: 5px 0 4px 0;
  margin-right: 6.5px;
  flex-shrink: 0;
}
#${__ns__} .form {
  display: block;
  width: 100%;
}
#${__ns__} .range-slider {
  width: 100%;
}
#${__ns__} .range-footer {
  display: flex;
  align-items: center;
  margin-top: 2px;
  margin-bottom: 8px;
}
#${__ns__} .range-output {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
#${__ns__} .invert-label {
  display: flex;
  align-items: center;
  white-space: nowrap;
  margin-right: 1em;
  cursor: pointer;
}
#${__ns__} .invert-label input {
  margin: 0 3px 0 0;
}
  `;

  const $range = rangeInput({
    min,
    max,
    value: [value[0], value[1]],
    step,
    color,
    width: "100%",
    theme,
    transform,
    invert,
  });

  const $output = document.createElement('output');

  const $view = document.createElement('div');
  $view.id = __ns__;

  if (label != null) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'label';
    labelDiv.textContent = label;
    $view.appendChild(labelDiv);
  }

  const formDiv = document.createElement('div');
  formDiv.className = 'form';

  const rangeDiv = document.createElement('div');
  rangeDiv.className = 'range';
  rangeDiv.appendChild($range);

  formDiv.appendChild(rangeDiv);

  const footerDiv = document.createElement('div');
  footerDiv.className = 'range-footer';

  let $checkbox = null;
  if (invertible) {
    const invertLabel = document.createElement('label');
    invertLabel.className = 'invert-label';
    $checkbox = document.createElement('input');
    $checkbox.type = 'checkbox';
    invertLabel.appendChild($checkbox);
    invertLabel.appendChild(document.createTextNode('Invert'));
    footerDiv.appendChild(invertLabel);
  }

  const outputDiv = document.createElement('div');
  outputDiv.className = 'range-output';
  outputDiv.appendChild($output);
  footerDiv.appendChild(outputDiv);

  formDiv.appendChild(footerDiv);
  $view.appendChild(formDiv);

  const style = document.createElement('style');
  style.textContent = css;
  $view.appendChild(style);

  const update = () => {
    const content = format({ range: [$range.value[0], $range.value[1]], invert: invertState });
    if (typeof content === 'string') {
      $output.value = content;
    } else {
      while ($output.lastChild) $output.lastChild.remove();
      $output.appendChild(content);
    }
  };

  $range.oninput = update;

  if ($checkbox) {
    $checkbox.addEventListener('input', () => {
      invertState = $checkbox.checked;
      $range.classList.toggle('range-inverted', invertState);
      update();
      $view.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  update();

  return Object.defineProperty($view, 'value', {
    get: () => ({ range: $range.value, invert: invertState }),
    set: (v) => {
      $range.value = v.range;
      invertState = !!v.invert;
      if ($checkbox) {
        $checkbox.checked = invertState;
        $range.classList.toggle('range-inverted', invertState);
      }
      update();
    },
  });
}
