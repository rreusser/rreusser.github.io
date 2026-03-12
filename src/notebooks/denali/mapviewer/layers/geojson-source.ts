import { lonToMercatorX, latToMercatorY } from '../tiles/tile-math.js';

export interface PointFeature {
  mercatorX: number;
  mercatorY: number;
  lon: number;
  lat: number;
  properties: Record<string, any>;
}

export interface LineCoordinate {
  mercatorX: number;
  mercatorY: number;
  elevation: number;
  lon: number;
  lat: number;
}

export interface LineFeature {
  coordinates: LineCoordinate[];
  properties: Record<string, any>;
}

interface SimplifyPoint {
  x: number;
  y: number;
  elev: number;
}

interface LoadOptions {
  simplify?: number;
  simplifyFn?: (pts: SimplifyPoint[], tolerance: number, highQuality: boolean) => SimplifyPoint[];
}

export class GeoJSONSource {
  features: PointFeature[];
  lineFeatures: LineFeature[];

  constructor() {
    this.features = [];
    this.lineFeatures = [];
  }

  async load(urlOrData: string | any, options: LoadOptions = {}): Promise<this> {
    let geojson: any;
    if (typeof urlOrData === 'string') {
      const res = await fetch(urlOrData);
      geojson = await res.json();
    } else {
      geojson = urlOrData;
    }

    const simplifyTolerance = options.simplify;
    const simplifyFn = options.simplifyFn;

    this.features = [];
    this.lineFeatures = [];
    for (const feature of geojson.features) {
      if (!feature.geometry) continue;
      if (feature.geometry.type === 'Point') {
        const [lon, lat] = feature.geometry.coordinates;
        this.features.push({
          mercatorX: lonToMercatorX(lon),
          mercatorY: latToMercatorY(lat),
          lon,
          lat,
          properties: feature.properties || {},
        });
      } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
        const rings: number[][] = feature.geometry.type === 'MultiLineString'
          ? feature.geometry.coordinates
          : [feature.geometry.coordinates];

        let rawCoords: number[][] = [];
        for (const ring of rings) {
          for (const pt of ring) {
            const prev = rawCoords[rawCoords.length - 1];
            if (prev && prev[0] === pt[0] && prev[1] === pt[1]) continue;
            rawCoords.push(pt);
          }
        }

        if (simplifyTolerance != null && simplifyFn) {
          const pts = rawCoords.map(([lon, lat, elev]) => ({ x: lon, y: lat, elev: elev || 0 }));
          const simplified = simplifyFn(pts, simplifyTolerance, true);
          rawCoords = simplified.map(p => [p.x, p.y, p.elev]);
        }

        const coords: LineCoordinate[] = rawCoords.map(([lon, lat, elev]) => ({
          mercatorX: lonToMercatorX(lon),
          mercatorY: latToMercatorY(lat),
          elevation: elev || 0,
          lon,
          lat,
        }));
        this.lineFeatures.push({ coordinates: coords, properties: feature.properties || {} });
      }
    }

    return this;
  }
}
