#!/usr/bin/env node

// Fetch named mountain peaks from OpenStreetMap via the Overpass API
// Bounding box: [-152.9, 62.2, -148.8, 64.0] (west, south, east, north)

const BBOX = [62.2, -152.9, 64.0, -148.8]; // Overpass format: south, west, north, east

const query = `
[out:json][timeout:60];
(
  node["natural"="peak"]["name"](${BBOX.join(",")});
  node["natural"="volcano"]["name"](${BBOX.join(",")});
);
out body;
`;

async function main() {
  const url = "https://overpass-api.de/api/interpreter";
  const body = `data=${encodeURIComponent(query)}`;

  console.error("Querying Overpass API...");
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body,
  });

  if (!res.ok) {
    throw new Error(`Overpass API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  console.error(`Got ${data.elements.length} features`);

  // Convert to GeoJSON
  const geojson = {
    type: "FeatureCollection",
    features: data.elements.map((el) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [el.lon, el.lat],
      },
      properties: {
        ...el.tags,
        osm_id: el.id,
      },
    })),
  };

  const outPath = new URL("peaks.geojson", import.meta.url).pathname;
  const fs = await import("node:fs");
  fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2) + "\n");
  console.error(`Wrote ${geojson.features.length} features to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
