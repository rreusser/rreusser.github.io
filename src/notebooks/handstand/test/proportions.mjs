// Gates for the leg-length / leg-mass re-proportioning.
//
// Run: node src/notebooks/handstand/test/proportions.mjs
import { buildModel, proportionedTable, SEGMENT_TABLES, legMassShare } from '../anthropometry.js';
import { balanceMetrics, pressMetric } from '../proportions.js';
import { createWorkspace } from '../dynamics.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const sum = (a) => a.reduce((s, x) => s + x, 0);

for (const sex of ['male', 'female']) {
  gate(`${sex}: defaults return the table itself`, proportionedTable(sex) === SEGMENT_TABLES[sex]);
  gate(`${sex}: the table's own leg fraction snaps to the table`,
    proportionedTable(sex, { legFrac: 0.53 }) === SEGMENT_TABLES[sex]);
  const a = buildModel({ sex }), b = buildModel({ sex, legFrac: 0.53, legMassScale: 1 });
  gate(`${sex}: default model unchanged`, Array.from(a.mass).every((m, i) => m === b.mass[i])
    && Array.from(a.inertia).every((m, i) => m === b.inertia[i]));
  for (const [legFrac, legMassScale] of [[0.48, 1], [0.56, 1], [0.53, 0.75], [0.5, 1.3]]) {
    const m = buildModel({ sex, legFrac, legMassScale, massKg: 70 });
    const tag = `${sex} leg ${legFrac} x${legMassScale}`;
    // To the table body's total, which for the female table is 0.9999 of
    // body mass: de Leva's published fractions are rounded.
    gate(`${tag}: total mass unchanged`, Math.abs(sum(Array.from(m.mass)) - sum(Array.from(a.mass))) < 1e-9);
    gate(`${tag}: stature preserved`, Math.abs(m.reachM - a.reachM) < 1e-12, `${m.reachM.toFixed(4)} vs ${a.reachM.toFixed(4)}`);
    const hip = m.segLen[5] + m.segLen[6] + m.footGeom.ankleH;
    gate(`${tag}: hip height is legFrac of stature`, Math.abs(hip / m.heightM - legFrac) < 1e-12);
  }
  // Longer legs at the same density carry more of the mass; heavier legs too.
  const s = (p) => legMassShare(proportionedTable(sex, p));
  gate(`${sex}: leg share rises with leg length`, s({ legFrac: 0.50 }) < s({}) && s({}) < s({ legFrac: 0.56 }));
  gate(`${sex}: leg share rises with leg mass`, s({ legMassScale: 0.8 }) < s({}) && s({}) < s({ legMassScale: 1.2 }));
}

// The two findings the page states, as gates, so a change that overturns
// them fails here rather than leaving the prose wrong.
{
  const metric = (p) => { const m = buildModel(p); const ws = createWorkspace(m); return { ...balanceMetrics(m, ws), press: pressMetric(m, ws).nmPerKg }; };
  const base = metric({});
  for (const p of [{ legFrac: 0.47 }, { legFrac: 0.57 }, { legMassScale: 0.7 }, { legMassScale: 1.4 }]) {
    const m = metric(p);
    const dv = 100 * (m.vMax / base.vMax - 1);
    gate(`balance barely moves for ${JSON.stringify(p)}`, Math.abs(dv) < 2.5, `${dv.toFixed(2)}%`);
  }
  const short = metric({ legFrac: 0.50 }), light = metric({ legMassScale: 0.7 });
  gate('three points shorter legs take ~a quarter off the press', Math.abs(short.press / base.press - 0.74) < 0.05,
    `${(100 * (short.press / base.press - 1)).toFixed(1)}%`);
  gate('30% lighter legs take ~a quarter off the press', Math.abs(light.press / base.press - 0.76) < 0.05,
    `${(100 * (light.press / base.press - 1)).toFixed(1)}%`);
}

console.log(failures ? `\n${failures} FAILED` : '\nALL GATES PASS');
process.exit(failures ? 1 : 0);
