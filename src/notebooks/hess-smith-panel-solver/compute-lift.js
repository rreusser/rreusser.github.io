export default function computeLift({ geometry: { x, y }, solution, vInf }) {
  let xmin = Infinity;
  let xmax = -Infinity;
  const nPanels = x.length - 1;
  const gamma = solution.shape[0] > nPanels ? solution.get(nPanels) : 0;
  let len = 0;

  for (let i = 0; i < nPanels; i++) {
    xmax = Math.max(xmax, x[i]);
    xmin = Math.min(xmin, x[i]);
  }

  const c = xmax - xmin;

  for (let i = 0; i < nPanels - 1; i++) {
    const dx = x[i + 1] - x[i];
    const dy = y[i + 1] - y[i];
    len += Math.sqrt(dx * dx + dy * dy);
  }

  return 2.0 * gamma * len / c / vInf;
}
