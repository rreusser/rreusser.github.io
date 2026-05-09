#!/usr/bin/env node

// Process the raw OSM `climbing-routes.geojson` into 5 ordered, oriented
// segments along the West Buttress: Basecamp -> 1 -> 2 -> 3 -> 4 -> Summit.
//
// The raw data has six ways with arbitrary direction; this script reverses
// where needed, joins the two-way Camp-1->Camp-2 and Camp-2->Camp-4 stretches,
// and splits the Camp-2->Camp-4 polyline at the point closest to Camp 3.
// Distances are euclidean in lon/lat — accurate enough at this scale.

import fs from 'node:fs';

const here = (name) => new URL(name, import.meta.url).pathname;

const camps = JSON.parse(fs.readFileSync(here('camps.geojson'), 'utf8'));
const routes = JSON.parse(fs.readFileSync(here('climbing-routes.geojson'), 'utf8'));

const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

function orient(way, expectedStart, expectedEnd) {
  const c = way.geometry.coordinates;
  const dFwd = dist2(c[0], expectedStart) + dist2(c[c.length - 1], expectedEnd);
  const dRev = dist2(c[c.length - 1], expectedStart) + dist2(c[0], expectedEnd);
  return dRev < dFwd ? c.slice().reverse() : c.slice();
}

function joinLines(...lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const start = i === 0 ? 0 : 1; // skip duplicate junction vertex
    for (let k = start; k < lines[i].length; k++) out.push(lines[i][k]);
  }
  return out;
}

function closestProjection(coords, target) {
  let best = { i: 0, t: 0, dist: Infinity, point: coords[0] };
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i], b = coords[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    let t = 0;
    if (len2 > 0) t = ((target[0] - a[0]) * dx + (target[1] - a[1]) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const point = [a[0] + t * dx, a[1] + t * dy];
    const d = Math.hypot(point[0] - target[0], point[1] - target[1]);
    if (d < best.dist) best = { i, t, dist: d, point };
  }
  return best;
}

function splitAt(coords, projection) {
  const { i, t, point } = projection;
  const first = coords.slice(0, i + 1);
  const second = [];
  if (t <= 0) {
    // Cut exactly at vertex i+0; nothing extra to add to first
    for (let k = i; k < coords.length; k++) second.push(coords[k]);
  } else if (t >= 1) {
    // Cut exactly at vertex i+1
    first.push(coords[i + 1]);
    for (let k = i + 1; k < coords.length; k++) second.push(coords[k]);
  } else {
    first.push(point);
    second.push(point);
    for (let k = i + 1; k < coords.length; k++) second.push(coords[k]);
  }
  return [first, second];
}

const campByName = Object.fromEntries(
  camps.features.map((f) => [f.properties.name, f.geometry.coordinates]),
);
const BASECAMP = campByName['Basecamp'];
const C1 = campByName['Camp 1'];
const C2 = campByName['Camp 2'];
const C3 = campByName['Camp 3'];
const C4 = campByName['Camp 4'];

// Summit isn't tagged as a camp; the Camp-4->Summit way ends ~50m short of
// the actual summit, which is close enough for orientation.
const SUMMIT = [-151.0070, 63.0692];

const wayById = Object.fromEntries(
  routes.features.map((f) => [f.properties.osm_id, f]),
);

// Junction shared by 503183806 and 503182744 (south of Camp 1's saddle).
const J12 = [-151.1826037, 63.0572003];
// Junction shared by 503181057 and 503180513 (west of Camp 3).
const J24 = [-151.1066115, 63.0676016];

const seg1 = orient(wayById[1133167907], BASECAMP, C1);

const w_c1_j   = orient(wayById[503183806], C1, J12);
const w_j_c2   = orient(wayById[503182744], J12, C2);
const seg2 = joinLines(w_c1_j, w_j_c2);

const w_c2_j   = orient(wayById[503181057], C2, J24);
const w_j_c4   = orient(wayById[503180513], J24, C4);
const seg24    = joinLines(w_c2_j, w_j_c4);
const split    = closestProjection(seg24, C3);
const [seg3, seg4] = splitAt(seg24, split);

const seg5 = orient(wayById[503179913], C4, SUMMIT);

const segments = [
  { from: 'Basecamp', to: 'Camp 1',  osm_ids: [1133167907],          coords: seg1 },
  { from: 'Camp 1',   to: 'Camp 2',  osm_ids: [503183806, 503182744], coords: seg2 },
  { from: 'Camp 2',   to: 'Camp 3',  osm_ids: [503181057, 503180513], coords: seg3 },
  { from: 'Camp 3',   to: 'Camp 4',  osm_ids: [503180513],            coords: seg4 },
  { from: 'Camp 4',   to: 'Summit',  osm_ids: [503179913],            coords: seg5 },
];

const out = {
  type: 'FeatureCollection',
  features: segments.map((s, i) => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: s.coords },
    properties: {
      segment: i + 1,
      from: s.from,
      to: s.to,
      osm_ids: s.osm_ids,
    },
  })),
};

fs.writeFileSync(here('route-segments.geojson'), JSON.stringify(out, null, 2) + '\n');

console.error(`Wrote ${segments.length} segments to route-segments.geojson`);
for (const s of segments) {
  console.error(`  ${s.from.padEnd(8)} -> ${s.to.padEnd(8)}  ${String(s.coords.length).padStart(3)} pts`);
}
console.error(`\nCamp 3 split: closest point on seg2->seg4 polyline is`);
console.error(`  ${split.point.map((v) => v.toFixed(6)).join(', ')}  (dist ${split.dist.toFixed(6)} deg)`);
