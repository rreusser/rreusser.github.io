import { CircleLayer } from './circle-layer.js';
import { TextLayer } from './text-layer.js';
import { LineLayer, parseColor } from './line-layer.js';
import { GeoJSONSource } from './geojson-source.ts';
import { loadFontAtlas } from '../lib/webgpu-text/webgpu-text.ts';

type QueryElevFn = (mx: number, my: number) => number | null;

interface LayerEntry {
  id: string;
  layer: any;
  config: any;
  visible: boolean;
  userCreated: boolean;
  _sourceRef?: any;
  sourceGeoJSON?: any;
  _segmentMidpoints?: any[];
}

// Collect subdivision midpoints for a single segment. Only inserts midpoints
// where terrain elevation data is available and positive, so segments over
// unloaded tiles or at zero elevation are left unsubdivided.
function collectSubdivisions(
  a: any, b: any, result: any[], queryElev: QueryElevFn,
  tolerance: number, maxDepth: number, depth: number,
) {
  if (depth >= maxDepth) return;
  const midMx = (a.mercatorX + b.mercatorX) / 2;
  const midMy = (a.mercatorY + b.mercatorY) / 2;
  const elevA = queryElev(a.mercatorX, a.mercatorY);
  const elevB = queryElev(b.mercatorX, b.mercatorY);
  const elevMid = queryElev(midMx, midMy);
  if (elevA == null || elevB == null || elevMid == null) return;
  if (elevA <= 0 || elevB <= 0 || elevMid <= 0) return;
  const linearElev = (elevA + elevB) / 2;
  if (Math.abs(elevMid - linearElev) > tolerance) {
    const mid = { mercatorX: midMx, mercatorY: midMy };
    collectSubdivisions(a, mid, result, queryElev, tolerance, maxDepth, depth + 1);
    result.push(mid);
    collectSubdivisions(mid, b, result, queryElev, tolerance, maxDepth, depth + 1);
  }
}

export class LayerManager {
  _lineLayers: LayerEntry[] = [];
  _circleLayers: LayerEntry[] = [];
  _textLayers: LayerEntry[] = [];

  private _queryElevation: QueryElevFn;
  private _device: GPUDevice;
  private _format: GPUTextureFormat;
  private _globalUniformBuffer: GPUBuffer;
  private _globalUniformBGL: GPUBindGroupLayout;
  private _createGPULines: any;
  private _onDirty: () => void;

  constructor(params: {
    device: GPUDevice;
    format: GPUTextureFormat;
    globalUniformBuffer: GPUBuffer;
    globalUniformBGL: GPUBindGroupLayout;
    createGPULines: any;
    queryElevation: QueryElevFn;
    onDirty: () => void;
  }) {
    this._device = params.device;
    this._format = params.format;
    this._globalUniformBuffer = params.globalUniformBuffer;
    this._globalUniformBGL = params.globalUniformBGL;
    this._createGPULines = params.createGPULines;
    this._queryElevation = params.queryElevation;
    this._onDirty = params.onDirty;
  }

  async initLayers(
    featureLayers: any[],
    geojsonSources: Record<string, any>,
    font?: { atlas: string; metadata: string },
    simplifyFn?: any,
  ) {
    const device = this._device;
    const format = this._format;
    const globalUniformBGL = this._globalUniformBGL;
    const queryElev = this._queryElevation;

    const geojsonLoads: Promise<any>[] = [];
    const loadedSources: Record<string, any> = {};

    for (const layerConfig of featureLayers) {
      const srcConfig = geojsonSources[layerConfig.source];
      if (!srcConfig) throw new Error(`Feature layer "${layerConfig.id}" references unknown source "${layerConfig.source}"`);

      if (!loadedSources[layerConfig.source]) {
        const src = new GeoJSONSource();
        loadedSources[layerConfig.source] = src;
        geojsonLoads.push(src.load(srcConfig.data, { ...srcConfig, simplifyFn }));
      }

      const collision = layerConfig.collision !== false;
      if (layerConfig.type === 'circle') {
        const circleLayer = new CircleLayer(
          layerConfig,
          loadedSources[layerConfig.source],
          (mx: number, my: number) => queryElev(mx, my),
        );
        circleLayer.init(device, globalUniformBGL, format);
        circleLayer._collision = collision;
        circleLayer._sourceId = layerConfig.source;
        this._circleLayers.push({ id: layerConfig.id, layer: circleLayer, config: layerConfig, visible: true, userCreated: false });
      } else if (layerConfig.type === 'text') {
        const textLayer = new TextLayer(
          layerConfig,
          loadedSources[layerConfig.source],
          (mx: number, my: number) => queryElev(mx, my),
        );
        textLayer._collision = collision;
        textLayer._sourceId = layerConfig.source;
        this._textLayers.push({ id: layerConfig.id, layer: textLayer, config: layerConfig, visible: true, userCreated: false });
      } else if (layerConfig.type === 'line') {
        const lineLayer = new LineLayer(
          layerConfig,
          loadedSources[layerConfig.source],
          (mx: number, my: number) => queryElev(mx, my),
        );
        lineLayer.init(device, format, this._globalUniformBuffer, this._createGPULines);
        this._lineLayers.push({ id: layerConfig.id, layer: lineLayer, config: layerConfig, visible: true, userCreated: false, _sourceRef: loadedSources[layerConfig.source] });
      }
    }
    await Promise.all(geojsonLoads);

    if (font && this._textLayers.length > 0) {
      const fontAtlas = await loadFontAtlas(device, {
        atlasUrl: font.atlas,
        metadataUrl: font.metadata,
      });
      for (const entry of this._textLayers) {
        entry.layer.init(device, fontAtlas, format, 'depth32float', this._globalUniformBuffer);
      }
    }
  }

  getLayers() {
    const result: any[] = [];
    for (const e of this._lineLayers) {
      result.push({
        id: e.id, type: 'line', visible: e.visible, userCreated: e.userCreated,
        paint: {
          'line-color': e.layer._lineColor,
          'line-border-color': e.layer._borderColor,
          'line-width': e.layer._lineWidth,
          'line-border-width': e.layer._borderWidth,
        },
      });
    }
    for (const e of this._circleLayers) {
      result.push({
        id: e.id, type: 'circle', visible: e.visible, userCreated: e.userCreated,
        paint: {
          'circle-color': e.layer._fillColor,
          'circle-stroke-color': e.layer._strokeColor,
          'circle-radius': e.layer._radius,
          'circle-stroke-width': e.layer._strokeWidth,
        },
      });
    }
    for (const e of this._textLayers) {
      result.push({
        id: e.id, type: 'text', visible: e.visible, userCreated: e.userCreated,
        paint: {
          'text-color': e.layer._color,
          'text-halo-color': e.layer._strokeColor,
          'text-halo-width': e.layer._strokeWidth,
        },
      });
    }
    return result;
  }

  getLayer(id: string) {
    return this.getLayers().find(l => l.id === id) || null;
  }

  async addLineLayer(id: string, geojson: any, paint: any = {}) {
    const src = new GeoJSONSource();
    await src.load(geojson);
    const config = { id, type: 'line', paint };
    const layer = new LineLayer(config, src, (mx: number, my: number) => this._queryElevation(mx, my));
    layer.init(this._device, this._format, this._globalUniformBuffer, this._createGPULines);
    const entry: LayerEntry = { id, layer, config, visible: true, userCreated: true, _sourceRef: src, sourceGeoJSON: geojson };
    this._lineLayers.push(entry);
    this._onDirty();
    return entry;
  }

  removeLayer(id: string) {
    for (const arr of [this._lineLayers, this._circleLayers, this._textLayers]) {
      const idx = arr.findIndex(e => e.id === id);
      if (idx === -1) continue;
      if (arr[idx].layer.destroy) arr[idx].layer.destroy();
      arr.splice(idx, 1);
      this._onDirty();
      return;
    }
  }

  removeLineLayer(id: string) {
    this.removeLayer(id);
  }

  setLayerVisibility(id: string, visible: boolean) {
    for (const arr of [this._lineLayers, this._circleLayers, this._textLayers]) {
      const entry = arr.find(e => e.id === id);
      if (entry) {
        entry.visible = visible;
        this._onDirty();
        return;
      }
    }
  }

  setLineLayerColor(id: string, hex: string) {
    const entry = this._lineLayers.find(e => e.id === id);
    if (!entry) return;
    entry.layer._lineColor = parseColor(hex);
    this._onDirty();
  }

  setLayerPaint(id: string, property: string, value: any) {
    const color = typeof value === 'string' ? parseColor(value) : null;
    for (const entry of this._lineLayers) {
      if (entry.id !== id) continue;
      const l = entry.layer;
      if (property === 'line-color') l._lineColor = color;
      else if (property === 'line-border-color') l._borderColor = color;
      else if (property === 'line-width') l._lineWidth = value;
      else if (property === 'line-border-width') l._borderWidth = value;
      this._onDirty();
      return;
    }
    for (const entry of this._circleLayers) {
      if (entry.id !== id) continue;
      const l = entry.layer;
      if (property === 'circle-color') l._fillColor = color;
      else if (property === 'circle-stroke-color') l._strokeColor = color;
      else if (property === 'circle-radius') l._radius = value;
      else if (property === 'circle-stroke-width') l._strokeWidth = value;
      this._onDirty();
      return;
    }
    for (const entry of this._textLayers) {
      if (entry.id !== id) continue;
      const l = entry.layer;
      if (property === 'text-color') {
        l._color = color;
        if (l._spans) for (const { span } of l._spans) span.setColor(color);
      } else if (property === 'text-halo-color') {
        l._strokeColor = color;
        if (l._spans) for (const { span } of l._spans) span.setStrokeColor(color);
      } else if (property === 'text-halo-width') {
        l._strokeWidth = value;
        l._lastScaledStrokeWidth = null;
      }
      this._onDirty();
      return;
    }
  }

  buildCollisionLayers() {
    const layers: any[] = [];
    for (const entry of this._circleLayers) {
      if (!entry.visible) continue;
      layers.push({ layer: entry.layer, collision: entry.layer._collision, sourceId: entry.layer._sourceId });
    }
    for (const entry of this._textLayers) {
      if (!entry.visible) continue;
      layers.push({ layer: entry.layer, collision: entry.layer._collision, sourceId: entry.layer._sourceId });
    }
    return layers;
  }

  refineLineLayers() {
    const queryElev = this._queryElevation;
    for (const entry of this._lineLayers) {
      if (!entry._sourceRef) continue;
      const originalFeatures = entry._sourceRef.lineFeatures;
      if (!originalFeatures || originalFeatures.length === 0) continue;

      if (!entry._segmentMidpoints) {
        entry._segmentMidpoints = originalFeatures.map((f: any) =>
          new Array(Math.max(0, f.coordinates.length - 1)).fill(null).map(() => [])
        );
      }

      let changed = false;
      const refinedFeatures: any[] = [];

      for (let fi = 0; fi < originalFeatures.length; fi++) {
        const feature = originalFeatures[fi];
        const coords = feature.coordinates;
        const segMids = entry._segmentMidpoints![fi];

        for (let si = 0; si < coords.length - 1; si++) {
          const newMids: any[] = [];
          collectSubdivisions(coords[si], coords[si + 1], newMids, queryElev, 1.0, 8, 0);
          if (newMids.length < segMids[si].length) continue;
          if (newMids.length > segMids[si].length) {
            segMids[si] = newMids;
            changed = true;
          } else if (newMids.length > 0) {
            let differs = false;
            for (let mi = 0; mi < newMids.length; mi++) {
              if (newMids[mi].mercatorX !== segMids[si][mi].mercatorX ||
                  newMids[mi].mercatorY !== segMids[si][mi].mercatorY) {
                differs = true;
                break;
              }
            }
            if (differs) {
              segMids[si] = newMids;
              changed = true;
            }
          }
        }

        const refined = [coords[0]];
        for (let si = 0; si < coords.length - 1; si++) {
          for (const mid of segMids[si]) {
            refined.push(mid);
          }
          refined.push(coords[si + 1]);
        }
        refinedFeatures.push({ coordinates: refined, properties: feature.properties });
      }

      if (changed) {
        const layer = entry.layer;
        const elevCarryover = new Map();
        if (layer._cachedElevations && layer._polylines) {
          for (const polyline of layer._polylines) {
            for (let i = 0; i < polyline.count; i++) {
              const c = polyline.feature.coordinates[i];
              const elev = layer._cachedElevations[polyline.offset + i];
              if (elev > 0) {
                elevCarryover.set(c.mercatorX + ',' + c.mercatorY, elev);
              }
            }
          }
        }
        layer.replaceSource({ lineFeatures: refinedFeatures, features: [] }, elevCarryover);
      }
    }
  }

  invalidateLineElevations() {
    for (const entry of this._lineLayers) entry.layer.invalidateElevations();
  }

  getLayerElevationProfile(id: string) {
    const entry = this._lineLayers.find(e => e.id === id);
    if (!entry) return null;
    const layer = entry.layer;
    if (!layer._polylines || layer._polylines.length === 0) return null;
    return layer._polylines.map((polyline: any) => {
      const coords: any[] = [];
      const elevations: number[] = [];
      for (let i = 0; i < polyline.count; i++) {
        const c = polyline.feature.coordinates[i];
        coords.push({ mercatorX: c.mercatorX, mercatorY: c.mercatorY });
        elevations.push(layer._cachedElevations[polyline.offset + i]);
      }
      return { coords, elevations };
    });
  }

  getLayerGeoJSON(id: string) {
    const entry = this._lineLayers.find(e => e.id === id);
    if (!entry) return null;
    if (entry.sourceGeoJSON) return entry.sourceGeoJSON;
    if (!entry._sourceRef) return null;
    return {
      type: 'FeatureCollection',
      features: entry._sourceRef.lineFeatures.map((f: any) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: f.coordinates.map((c: any) => [c.lon, c.lat, c.elevation || 0]),
        },
        properties: f.properties || {},
      })),
    };
  }

  prepareLayers(projectionView: any, canvasW: number, canvasH: number, pixelRatio: number, exaggeration: number, globalElevScale: number) {
    for (const entry of this._circleLayers) {
      if (entry.visible) entry.layer.prepare(projectionView, canvasW, canvasH, pixelRatio, exaggeration, globalElevScale);
    }
    for (const entry of this._textLayers) {
      if (entry.visible) entry.layer.prepare(projectionView, canvasW, canvasH, pixelRatio, exaggeration, globalElevScale);
    }
    for (const entry of this._lineLayers) {
      if (entry.visible) entry.layer.prepare(projectionView, canvasW, canvasH, pixelRatio, exaggeration, globalElevScale);
    }
  }

  destroyAll() {
    for (const entry of this._lineLayers) entry.layer.destroy();
    for (const entry of this._circleLayers) if (entry.layer.destroy) entry.layer.destroy();
    for (const entry of this._textLayers) if (entry.layer.destroy) entry.layer.destroy();
  }
}
