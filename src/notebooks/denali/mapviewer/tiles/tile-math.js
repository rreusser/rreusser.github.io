// Mercator projection

export function lonToMercatorX(lon) {
  return (lon + 180) / 360;
}

export function latToMercatorY(lat) {
  const latRad = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
}

export function mercatorXToLon(mx) {
  return mx * 360 - 180;
}

export function mercatorYToLat(my) {
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * my))) * 180 / Math.PI;
}

export function tilesetToMercatorBounds(tileset) {
  const [minLon, minLat, maxLon, maxLat] = tileset.bounds;
  return {
    minZoom: tileset.minzoom,
    maxZoom: tileset.maxzoom,
    minX: lonToMercatorX(minLon),
    maxX: lonToMercatorX(maxLon),
    minY: latToMercatorY(maxLat),
    maxY: latToMercatorY(minLat),
  };
}

// Tile URL templates

export function tileUrlFromTemplate(tiles) {
  const template = Array.isArray(tiles) ? tiles[0] : tiles;
  return (z, x, y) => template.replace('{z}', z).replace('{x}', x).replace('{y}', y);
}

// Tile elevation and cell size

export function getElevationScale(tileZ, tileY) {
  const yCenter = (tileY + 0.5) / (1 << tileZ);
  const phi = 2 * Math.atan(Math.exp(Math.PI * (1 - 2 * yCenter))) - Math.PI / 2;
  return 1 / (40_075_016.686 * Math.cos(phi));
}

export function getCellSizeMeters(tileZ, tileY) {
  const yCenter = (tileY + 0.5) / (1 << tileZ);
  const phi = 2 * Math.atan(Math.exp(Math.PI * (1 - 2 * yCenter))) - Math.PI / 2;
  return (40_075_016.686 * Math.cos(phi)) / (1 << tileZ) / 512;
}

// Float64 tile MVP computation (eliminates jitter at high zoom)

const _m = new Float64Array(16);
const _mv = new Float64Array(16);
const _mvp = new Float64Array(16);
const _view64 = new Float64Array(16);
const _proj64 = new Float64Array(16);
const _model64 = new Float64Array(16);

function modelMatrix(out, z, x, y, elevationScale, verticalExaggeration, dataResolution) {
  const s = 1 / ((dataResolution || 512) * (1 << z));
  const tx = x / (1 << z);
  const ty = y / (1 << z);
  out[0] = s;   out[1] = 0;  out[2] = 0;   out[3] = 0;
  out[4] = 0;   out[5] = elevationScale * verticalExaggeration; out[6] = 0;   out[7] = 0;
  out[8] = 0;   out[9] = 0;  out[10] = s;  out[11] = 0;
  out[12] = tx;  out[13] = 0; out[14] = ty; out[15] = 1;
}

function mul64(out, a, b) {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[i + k * 4] * b[k + j * 4];
      }
      out[i + j * 4] = sum;
    }
  }
}

export function computeTileMVP(out32, view, proj, z, x, y, elevationScale, verticalExaggeration, dataResolution) {
  for (let i = 0; i < 16; i++) {
    _view64[i] = view[i];
    _proj64[i] = proj[i];
  }
  modelMatrix(_m, z, x, y, elevationScale, verticalExaggeration, dataResolution);
  mul64(_mv, _view64, _m);
  mul64(_mvp, _proj64, _mv);
  for (let i = 0; i < 16; i++) {
    out32[i] = _mvp[i];
  }
}

export function computeTileModel(out32, z, x, y, elevationScale, verticalExaggeration, dataResolution) {
  modelMatrix(_model64, z, x, y, elevationScale, verticalExaggeration, dataResolution);
  for (let i = 0; i < 16; i++) {
    out32[i] = _model64[i];
  }
}

// Imagery tile mapping

export function computeImageryMapping(tz, tx, ty, sz, sx, sy) {
  const relativeScale = Math.pow(2, tz - sz);
  return {
    offsetU: sx * relativeScale - tx,
    offsetV: sy * relativeScale - ty,
    scaleU: relativeScale,
    scaleV: relativeScale,
  };
}

export function getImageryZoom(terrainZoom, deltaZoom, maxImageryZoom) {
  return Math.min(terrainZoom + deltaZoom, maxImageryZoom);
}

export function getRequiredImageryTiles(tz, tx, ty, imageryZoom) {
  const dz = imageryZoom - tz;
  if (dz <= 0) {
    const shift = tz - imageryZoom;
    return [{ z: imageryZoom, x: tx >> shift, y: ty >> shift }];
  }
  const count = 1 << dz;
  const baseX = tx << dz;
  const baseY = ty << dz;
  const tiles = [];
  for (let dy = 0; dy < count; dy++) {
    for (let dx = 0; dx < count; dx++) {
      tiles.push({ z: imageryZoom, x: baseX + dx, y: baseY + dy });
    }
  }
  return tiles;
}
