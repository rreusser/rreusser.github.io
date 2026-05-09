// Shared CSS-color parser for layer paint properties. Returns [r, g, b, a]
// in the 0..1 range. Accepts:
//   #RGB, #RGBA, #RRGGBB, #RRGGBBAA
//   rgb(r, g, b), rgba(r, g, b, a)   — r/g/b are 0..255 ints, a is 0..1
// Anything unrecognized falls back to opaque red so the failure is visible.

export function parseColor(input) {
  if (Array.isArray(input)) {
    return input.length === 4 ? input : [input[0], input[1], input[2], 1];
  }
  if (typeof input !== 'string') return [1, 0, 0, 1];
  const s = input.trim();

  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) {
      const r = parseInt(h[0] + h[0], 16) / 255;
      const g = parseInt(h[1] + h[1], 16) / 255;
      const b = parseInt(h[2] + h[2], 16) / 255;
      const a = h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1;
      return [r, g, b, a];
    }
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16) / 255;
      const g = parseInt(h.slice(2, 4), 16) / 255;
      const b = parseInt(h.slice(4, 6), 16) / 255;
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return [r, g, b, a];
    }
  }

  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(s);
  if (m) {
    return [
      parseFloat(m[1]) / 255,
      parseFloat(m[2]) / 255,
      parseFloat(m[3]) / 255,
      m[4] != null ? parseFloat(m[4]) : 1,
    ];
  }

  return [1, 0, 0, 1];
}
