const g = 1.32471795724474602596;
const a1 = 1.0 / g;
const a2 = 1.0 / (g * g);

export default function quasirandom2d(out, n) {
  out[0] = (0.5 + a1 * n) % 1;
  out[1] = (0.5 + a2 * n) % 1;
  return out;
}
