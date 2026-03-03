/**
 * Reads a CSS custom property and returns its value as an [r, g, b] float tuple.
 * Uses a throwaway element to let the browser resolve the color to rgb().
 */
function readCssColor(varName, fallback = '#000000') {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
  const el = document.createElement('div');
  el.style.cssText = `position:absolute;top:-9999px;width:0;height:0;background:${raw};pointer-events:none`;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).backgroundColor;
  el.remove();
  const m = computed.match(/[\d.]+/g) ?? ['0', '0', '0'];
  // color(srgb r g b) uses [0,1] values; rgb(r, g, b) uses [0,255]
  const scale = computed.startsWith('color(') ? 1 : 1 / 255;
  return [+m[0] * scale, +m[1] * scale, +m[2] * scale];
}

/**
 * Observable-compatible theme observer. Pass directly to Generators.observe():
 *
 *   const theme = Generators.observe(observeTheme);
 *
 * Yields { background, foreground, isDark } whenever the theme changes.
 * background and foreground are [r, g, b] float tuples in [0, 1].
 */
export function observeTheme(notify) {
  function update() {
    const background = readCssColor('--theme-background', '#ffffff');
    const foreground = readCssColor('--theme-foreground', '#1b1e23');
    const luminance = background[0] * 0.299 + background[1] * 0.587 + background[2] * 0.114;
    const isDark = luminance < 0.5;
    notify({ background, foreground, isDark });
  }

  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-dark', 'data-light']
  });
  update();

  return () => observer.disconnect();
}
