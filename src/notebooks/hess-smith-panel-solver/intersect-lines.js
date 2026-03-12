export default function intersectLines(x1, y1, x2, y2, x3, y3, x4, y4) {
  const det = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  return [
    ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / det,
    ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / det
  ];
}
