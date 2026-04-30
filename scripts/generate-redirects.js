import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const WWW_DIR = join(ROOT_DIR, "www");

const SITE_URL = "https://rreusser.github.io";

// Old (pre-rewrite) URL paths that Google still has indexed but that now 404.
// Each entry produces a static stub at www/<from>/index.html with a meta-refresh,
// JS redirect, and rel=canonical pointing at the new URL. Google treats this as
// a soft 301 and consolidates link equity onto the canonical destination.
const redirects = [
  ["/a-series-of-unfortunate-things-i-programmed-one-time/", "/notebooks/a-series-of-unfortunate-things-i-programmed-one-time/"],
  ["/aligning-3d-scans/", "/notebooks/aligning-3d-scans/"],
  ["/boys-surface/", "/sketches/boys-surface/"],
  ["/calabi-yau/", "/sketches/calabi-yau/"],
  ["/caustics/", "/sketches/caustics/"],
  ["/continuum-gravity/", "/sketches/continuum-gravity/"],
  ["/cubic-roots/", "/sketches/cubic-roots/"],
  ["/domain-coloring-with-scaling/", "/sketches/domain-coloring-with-scaling/"],
  ["/erosion/", "/sketches/erosion/"],
  ["/fibonacci-sphere/", "/sketches/fibonacci-sphere/"],
  ["/flamms-paraboloid/", "/sketches/flamms-paraboloid/"],
  ["/gray-scott-reaction-diffusion/", "/sketches/gray-scott-reaction-diffusion/"],
  ["/ikeda/", "/sketches/ikeda/"],
  ["/iterative-closest-point/", "/sketches/iterative-closest-point/"],
  ["/joukowsky-airfoil/", "/sketches/joukowsky-airfoil/"],
  ["/karman-trefftz-airfoil/", "/sketches/karman-trefftz-airfoil/"],
  ["/kuramoto-sivashinsky/", "/sketches/kuramoto-sivashinsky/"],
  ["/lamb-wave-dispersion/", "/sketches/lamb-wave-dispersion/"],
  ["/line-integral-convolution/", "/sketches/line-integral-convolution/"],
  ["/multiscale-turing-pattern-gallery/", "/notebooks/multi-scale-turing-pattern-gallery-1/"],
  ["/multiscale-turing-pattern-gallery-2/", "/notebooks/multi-scale-turing-pattern-gallery-2/"],
  ["/multiscale-turing-patterns/", "/sketches/multiscale-turing-patterns/"],
  ["/nose-hoover-attractor/", "/sketches/nose-hoover-attractor/"],
  ["/potential-flow/", "/sketches/potential-flow/"],
  ["/projects/", "/notebooks/"],
  ["/random-polynomial-roots/", "/sketches/random-polynomial-roots/"],
  ["/rule-30/", "/sketches/rule-30/"],
  ["/schwarzschild-spacetime/", "/sketches/schwarzschild-spacetime/"],
  ["/smooth-life/", "/sketches/smooth-life/"],
  ["/spherical-harmonics/", "/sketches/spherical-harmonics/"],
  ["/things-i-learned-the-hard-way-using-react-native/", "/notebooks/things-i-learned-the-hard-way-using-react-native/"],
  ["/ueda-attractor/", "/sketches/ueda-attractor/"],
  ["/vortex-sdf/", "/sketches/vortex-sdf/"],
  ["/periodic-three-body-orbits/", "/notebooks/periodic-planar-three-body-orbits/"],
];

function htmlFor(targetUrl) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Redirecting…</title>
  <link rel="canonical" href="${targetUrl}" />
  <meta http-equiv="refresh" content="0; url=${targetUrl}" />
  <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</head>
<body>
  <p>This page has moved to <a href="${targetUrl}">${targetUrl}</a>.</p>
</body>
</html>
`;
}

async function main() {
  const seen = new Set();
  for (const [from, to] of redirects) {
    if (!from.startsWith("/") || !from.endsWith("/")) {
      throw new Error(`Redirect 'from' must start and end with /: ${from}`);
    }
    if (!to.startsWith("/") || !to.endsWith("/")) {
      throw new Error(`Redirect 'to' must start and end with /: ${to}`);
    }
    if (seen.has(from)) {
      throw new Error(`Duplicate redirect 'from': ${from}`);
    }
    seen.add(from);
    const fromDir = join(WWW_DIR, from);
    await mkdir(fromDir, { recursive: true });
    await writeFile(join(fromDir, "index.html"), htmlFor(`${SITE_URL}${to}`), "utf8");
  }
  console.log(`Generated ${redirects.length} redirect stubs in ${WWW_DIR}`);
}

main().catch((err) => {
  console.error("Error generating redirects:", err);
  process.exit(1);
});
