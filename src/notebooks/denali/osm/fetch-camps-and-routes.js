#!/usr/bin/env node

// Fetch mountaineering camps + alpine path segments around Denali from
// OpenStreetMap via the Overpass API. Bounding box matches fetch-peaks.js.
//
// Output:
//   camps.geojson           — Points (camp_site / alpine_hut), filtered
//                             to backcountry=yes so we get the climbing
//                             camps (Basecamp, Camp 1..4) without the
//                             dozens of car campgrounds in Denali NP.
//                             Way-typed camps are reduced to centroids.
//   climbing-routes.geojson — LineStrings (highway=path with an alpine
//                             sac_scale tag). The West Buttress segments
//                             aren't grouped as a relation in OSM, so we
//                             filter by tag/bbox.

const BBOX = [62.2, -152.9, 64.0, -148.8]; // south, west, north, east

// Routes that aren't on the West Buttress (e.g. trails near Mt Eielson up
// north) get filtered out by proximity to the summit. The West Buttress
// chain extends ~12 km from Basecamp to summit; 25 km of slack is enough
// to keep all of it without picking up unrelated alpine ways elsewhere.
const SUMMIT = { lat: 63.0692, lon: -151.0070 };
const ROUTE_RADIUS_KM = 25;

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sa = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

const query = `
[out:json][timeout:60];
(
  node["tourism"~"^(camp_site|alpine_hut|wilderness_hut)$"]["backcountry"="yes"](${BBOX.join(",")});
  way["tourism"~"^(camp_site|alpine_hut|wilderness_hut)$"]["backcountry"="yes"](${BBOX.join(",")});
  way["highway"="path"]["sac_scale"~"^(alpine_hiking|demanding_alpine_hiking|difficult_alpine_hiking|demanding_mountain_hiking)$"](${BBOX.join(",")});
);
out body;
>;
out skel qt;
`;

async function main() {
  const url = "https://overpass-api.de/api/interpreter";
  const body = `data=${encodeURIComponent(query)}`;

  console.error("Querying Overpass API...");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // Overpass returns 406 to fetch's default UA. Identify ourselves.
      "User-Agent": "denali-notebook/1.0 (https://github.com/rreusser/notebooks)",
    },
    body,
  });

  if (!res.ok) throw new Error(`Overpass API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  console.error(`Got ${data.elements.length} elements`);

  // Index nodes (both standalone and skeleton) so we can resolve way geometry.
  const nodes = new Map();
  for (const el of data.elements) {
    if (el.type === "node") nodes.set(el.id, [el.lon, el.lat]);
  }

  const camps = [];
  const routes = [];

  for (const el of data.elements) {
    if (!el.tags) continue;

    if (el.type === "node") {
      const km = haversineKm(SUMMIT, { lon: el.lon, lat: el.lat });
      if (km > ROUTE_RADIUS_KM) continue;
      camps.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [el.lon, el.lat] },
        properties: { ...el.tags, osm_id: el.id, osm_type: "node" },
      });
      continue;
    }

    if (el.type !== "way") continue;

    const coords = el.nodes.map((n) => nodes.get(n)).filter(Boolean);
    if (coords.length === 0) continue;

    const isCamp =
      el.tags.tourism === "camp_site" ||
      el.tags.tourism === "alpine_hut" ||
      el.tags.tourism === "wilderness_hut";

    if (isCamp) {
      // Reduce way-typed camps to their centroid. Way camps on Denali
      // are small named boundary polygons (~50m), so a single label
      // point is more useful on the map than the polygon outline.
      const closed = el.nodes.length > 1 && el.nodes[0] === el.nodes[el.nodes.length - 1];
      const n = closed ? coords.length - 1 : coords.length;
      let sx = 0, sy = 0;
      for (let i = 0; i < n; i++) { sx += coords[i][0]; sy += coords[i][1]; }
      const cx = sx / n, cy = sy / n;
      const km = haversineKm(SUMMIT, { lon: cx, lat: cy });
      if (km > ROUTE_RADIUS_KM) continue;
      camps.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [cx, cy] },
        properties: { ...el.tags, osm_id: el.id, osm_type: "way" },
      });
    } else {
      // Use the way's midpoint to test proximity to the summit; ways that
      // straddle the summit have a midpoint near it, ones on other massifs
      // don't.
      const mid = coords[Math.floor(coords.length / 2)];
      const km = haversineKm(SUMMIT, { lon: mid[0], lat: mid[1] });
      if (km > ROUTE_RADIUS_KM) continue;
      routes.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: { ...el.tags, osm_id: el.id, osm_type: "way" },
      });
    }
  }

  const fs = await import("node:fs");
  const here = (name) => new URL(name, import.meta.url).pathname;

  fs.writeFileSync(
    here("camps.geojson"),
    JSON.stringify({ type: "FeatureCollection", features: camps }, null, 2) + "\n",
  );
  console.error(`Wrote ${camps.length} camps`);

  fs.writeFileSync(
    here("climbing-routes.geojson"),
    JSON.stringify({ type: "FeatureCollection", features: routes }, null, 2) + "\n",
  );
  console.error(`Wrote ${routes.length} route segments`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
