export default function computeWindingDirection(x, y) {
  if (x.length !== y.length || x.length < 3) {
    throw new Error("Input arrays must have the same length and contain at least 3 points.");
  }
  const n = x.length;

  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    signedArea += (x[j] - x[i]) * (y[j] + y[i]);
  }

  return Math.sign(signedArea);
}
