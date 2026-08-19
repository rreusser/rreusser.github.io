// Filmstrip of a run: replay a stored trajectory and draw it as a row of
// poses, so a technique can be looked at without a browser. Left and right
// legs are drawn in different colours, because the thing that is hardest to
// see in an animation and impossible to see in a cost number is a movement
// that has quietly stopped being symmetric.
//
// Usage:
//   node scripts/filmstrip.mjs runs/021-bent-leg-press-hop.json [out.svg]
//     --frames N     poses to draw (default 12)
//     --through T    seconds to cover (default the entry duration T)
//     --rows N       wrap into N rows (default 1)
//
// Writes SVG. Rasterize with any browser if a PNG is wanted.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModel } from '../anthropometry.js';
import { createWorkspace, fk, momenta } from '../dynamics.js';
import { strengthProfile } from '../strength.js';
import { runScenario, resolveConfig, resolveRom } from '../rollout.js';

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : dflt;
};
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(positional[0] || join(here, '..', 'runs', '021-bent-leg-press-hop.json'));
const out = resolve(positional[1] || file.replace(/\.json$/, '.filmstrip.svg'));
const nFrames = +flag('frames', 12);
const nRows = +flag('rows', 1);

const run = JSON.parse(readFileSync(file, 'utf8'));
const model = buildModel({});
const ws = createWorkspace(model);
const prof = strengthProfile(model.massKg,
  run.strength ? { overrides: run.strength.overrides || run.strength } : {});
const through = +flag('through', run.T);

const rec = runScenario(model, ws, prof, {
  scenario: run.scenario,
  knots: run.knots.map((k) => Float64Array.from(k)),
  T: run.T,
  settleT: 2.5,
  dt: 2e-4,
  rom: resolveRom(run.rom),
  ...resolveConfig(run.config),
}).rec;

// Body -> the segment ends worth drawing: every child joint (a child's origin
// IS the joint on this body) plus this body's own contact points, which is
// what carries the hand patch and the toes.
const ends = Array.from({ length: model.nb }, () => []);
for (let i = 0; i < model.nb; i++) {
  const p = model.parent[i];
  if (p >= 0) ends[p].push({ body: i, local: null });
}
for (const c of model.contacts) ends[c.body].push({ body: c.body, local: c });

const LEG_L = [3, 4], LEG_R = [5, 6];
const colourOf = (body) => (LEG_L.includes(body) ? '#c2543d' : LEG_R.includes(body) ? '#3d7fc2' : '#4a5568');

// One pose, sampled at time t, as a list of world-space line segments.
function poseAt(t) {
  let i = 0;
  while (i < rec.t.length - 1 && rec.t[i] < t) i++;
  const q = rec.q[i];
  fk(model, q, null, ws);
  const mo = momenta(model, q, new Float64Array(model.nq), ws);
  const segs = [];
  const pt = (body, local) => {
    const c = Math.cos(ws.th[body]), s = Math.sin(ws.th[body]);
    return local
      ? [ws.px[body] + c * local.x - s * local.y, ws.py[body] + s * local.x + c * local.y]
      : [ws.px[body], ws.py[body]];
  };
  for (let b = 0; b < model.nb; b++) {
    const from = pt(b, null);
    for (const e of ends[b]) {
      const to = e.local ? pt(b, e.local) : pt(e.body, null);
      segs.push({ from, to, colour: colourOf(e.local ? b : e.body) });
    }
  }
  const f = rec.forces[i];
  const load = { hands: f.fy[0] + f.fy[1], feet: (f.fy[2] || 0) + (f.fy[3] || 0) };
  return { segs, com: [mo.comX, mo.comY], t: rec.t[i], load, x0: q[0] };
}

const frames = Array.from({ length: nFrames }, (_, k) => poseAt(through * k / (nFrames - 1)));

// One shared world window so the poses are comparable frame to frame, sized
// from every frame at once and anchored on the hand.
let wx0 = Infinity, wx1 = -Infinity, wy1 = -Infinity;
for (const fr of frames) {
  for (const s of fr.segs) {
    for (const p of [s.from, s.to]) {
      wx0 = Math.min(wx0, p[0] - fr.x0);
      wx1 = Math.max(wx1, p[0] - fr.x0);
      wy1 = Math.max(wy1, p[1]);
    }
  }
}
const PAD = 0.08;
wx0 -= PAD; wx1 += PAD; wy1 += PAD;
const wy0 = -0.05;

const CELL_W = 190;
const scale = CELL_W / (wx1 - wx0);
const CELL_H = Math.round((wy1 - wy0) * scale) + 26;
const perRow = Math.ceil(nFrames / nRows);
const W = CELL_W * perRow;
const H = CELL_H * nRows;

let mTot = 0;
for (let i = 0; i < model.nb; i++) mTot += model.mass[i];
const BW = mTot * model.gravity;

const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" `
  + `viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif">`);
svg.push(`<rect width="${W}" height="${H}" fill="#fff"/>`);
frames.forEach((fr, k) => {
  const col = k % perRow, row = Math.floor(k / perRow);
  const ox = col * CELL_W, oy = row * CELL_H;
  const X = (x) => ox + (x - fr.x0 - wx0) * scale;
  const Y = (y) => oy + CELL_H - 26 - (y - wy0) * scale;
  svg.push(`<g>`);
  svg.push(`<line x1="${ox}" y1="${oy + CELL_H - 26}" x2="${ox + CELL_W}" y2="${oy + CELL_H - 26}" `
    + `stroke="#c9ced6" stroke-width="1.5"/>`);
  for (const s of fr.segs) {
    svg.push(`<line x1="${X(s.from[0]).toFixed(1)}" y1="${Y(s.from[1]).toFixed(1)}" `
      + `x2="${X(s.to[0]).toFixed(1)}" y2="${Y(s.to[1]).toFixed(1)}" `
      + `stroke="${s.colour}" stroke-width="3" stroke-linecap="round"/>`);
  }
  svg.push(`<circle cx="${X(fr.com[0]).toFixed(1)}" cy="${Y(fr.com[1]).toFixed(1)}" r="4" fill="#e8912a"/>`);
  const label = `${fr.t.toFixed(2)}s  hands ${(fr.load.hands / BW * 100).toFixed(0)}%`
    + (fr.load.feet > 0.02 * BW ? `  feet ${(fr.load.feet / BW * 100).toFixed(0)}%` : '');
  svg.push(`<text x="${ox + 6}" y="${oy + CELL_H - 8}" font-size="11" fill="#4a5568">${label}</text>`);
  svg.push(`</g>`);
});
svg.push(`<text x="6" y="14" font-size="12" fill="#4a5568">`
  + `${file.split('/').pop()} — red left leg, blue right leg, orange centre of mass</text>`);
svg.push('</svg>');

writeFileSync(out, svg.join('\n'));
console.log(`wrote ${out}  (${nFrames} frames over ${through.toFixed(2)} s)`);
