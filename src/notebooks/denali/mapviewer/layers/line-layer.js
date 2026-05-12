// Line rendering for GeoJSON LineString features on terrain
// Uses webgpu-instanced-lines library for high-quality line rendering

import { atmosphereCode } from '../shaders/atmosphere.js';
import { parseColor } from './parse-color.js';
export { parseColor };

// CSS px. Total budget for the antialiased outer fade
// (0.5*AA_WIDTH on each side of the visible edge in sdf units).
const AA_WIDTH = 1.0;

// Slope range (in percent grade) for the green→red HSL ramp. Must match
// SLOPE_MAX in elevation-profile.js so the legend and the on-terrain line
// stay in sync.
const SLOPE_MAX_PCT = 35.0;

const lineVertexShaderBody = /* wgsl */`
@group(1) @binding(0) var<storage, read> positions: array<vec4f>;

struct LineUniforms {
  projectionView: mat4x4f,
  lineColor: vec4f,
  borderColor: vec4f,
  lineWidth: f32,
  borderWidth: f32,
  pixelRatio: f32,
  exaggeration: f32,
  atmosphereOpacity: f32,
  depthOffset: f32,
  slopeShadingEnabled: f32,
  _p3: f32,
};
@group(2) @binding(0) var<uniform> line: LineUniforms;

// Per-vertex varyings forwarded to the fragment shader's getColor().
// 'slope' carries the smoothed signed grade fraction (rise/run); it's
// always present but only consumed when slopeShadingEnabled > 0.5.
struct Vertex {
  position: vec4f,
  width: f32,
  anchor: vec3f,
  slope: f32,
}

fn getVertex(index: u32) -> Vertex {
  let p = positions[index];
  // p.w carries the per-vertex slope (the storage buffer is repurposed —
  // the homogeneous coordinate is always 1.0 conceptually). Project with
  // an explicit 1.0 so slope-shading layers don't degenerate.
  var clip = line.projectionView * vec4f(p.xyz, 1.0);
  clip.z += line.depthOffset * clip.w;
  // Geometric width passed to the lib (device px). Allocates space for
  // the central stroke, the halo (one halo width — see fragment), and a
  // 0.5*AA fade.
  let geomWidthDev = (line.lineWidth + line.borderWidth + 0.5 * ${AA_WIDTH.toFixed(4)}) * line.pixelRatio;
  return Vertex(clip, geomWidthDev, p.xyz, p.w);
}
`;

const lineFragmentShaderBody = /* wgsl */`
${atmosphereCode}

@group(2) @binding(0) var<uniform> line: LineUniforms;
@group(2) @binding(1) var<uniform> globals: GlobalUniforms;

struct LineUniforms {
  projectionView: mat4x4f,
  lineColor: vec4f,
  borderColor: vec4f,
  lineWidth: f32,
  borderWidth: f32,
  pixelRatio: f32,
  exaggeration: f32,
  atmosphereOpacity: f32,
  _p1: f32,
  slopeShadingEnabled: f32,
  _p3: f32,
};

fn srgbToLinear(c: vec3<f32>) -> vec3<f32> {
  return pow(c, vec3<f32>(2.2));
}

// HSL → sRGB. Mirrors CSS hsl() so it matches the elevation-profile legend.
fn hslToRgb(h: f32, s: f32, l: f32) -> vec3f {
  let c = (1.0 - abs(2.0 * l - 1.0)) * s;
  let hp = h / 60.0;
  let hpMod2 = hp - 2.0 * floor(hp * 0.5);
  let x = c * (1.0 - abs(hpMod2 - 1.0));
  var rgb1: vec3f = vec3f(0.0);
  if (hp < 1.0)      { rgb1 = vec3f(c, x, 0.0); }
  else if (hp < 2.0) { rgb1 = vec3f(x, c, 0.0); }
  else if (hp < 3.0) { rgb1 = vec3f(0.0, c, x); }
  else if (hp < 4.0) { rgb1 = vec3f(0.0, x, c); }
  else if (hp < 5.0) { rgb1 = vec3f(x, 0.0, c); }
  else               { rgb1 = vec3f(c, 0.0, x); }
  return rgb1 + vec3f(l - 0.5 * c);
}

// Smoothed signed grade fraction → sRGB. Same hue/lightness curve as
// elevation-profile.js slopeColor() so the legend and the on-terrain line
// agree exactly.
fn slopeToColor(slope: f32) -> vec3f {
  let t = clamp(abs(slope) * 100.0 / ${SLOPE_MAX_PCT.toFixed(1)}, 0.0, 1.0);
  let hue = 120.0 * (1.0 - t);
  let lightness = 0.50 - 0.12 * t;
  return hslToRgb(hue, 0.78, lightness);
}

fn applyAtmosphereLine(color: vec3<f32>, world_pos: vec3<f32>) -> vec3<f32> {
  let cam_pos = globals.camera_position.xyz;
  let cam_h_m = globals.camera_position.w;
  let mpu = globals.sun_direction.w;
  let exag = line.exaggeration;

  let world_ray = world_pos - cam_pos;
  let frag_h_m = world_pos.y * mpu / max(exag, 1e-6);
  let phys_ray = vec3<f32>(world_ray.x * mpu, frag_h_m - cam_h_m, world_ray.z * mpu);
  let dist_m = length(phys_ray);
  if (dist_m < 0.1) { return color; }
  let view_dir = phys_ray / dist_m;

  let result = computeScattering(cam_h_m, frag_h_m, dist_m, view_dir);
  let T = result[0];
  let inscatter = result[1];

  return color * T + inscatter * (vec3<f32>(1.0) - T);
}

fn getColor(lineCoord: vec2f, anchor: vec3f, slope: f32) -> vec4f {
  let aaDev = ${AA_WIDTH.toFixed(4)} * line.pixelRatio;
  let halfAa = 0.5 * aaDev;
  let lineDev = line.lineWidth * line.pixelRatio;
  let borderDev = line.borderWidth * line.pixelRatio;
  let geomWidthDev = lineDev + borderDev + halfAa;

  // sdf is in the same scale as geomWidthDev: 0 at center, geomWidthDev at edge.
  let sdf = length(lineCoord) * geomWidthDev;

  // Stroke → halo color transition centered on the stroke/halo boundary.
  let t = smoothstep(lineDev - halfAa, lineDev + halfAa, sdf);

  // The stroke is either the layer's uniform line color or a slope-derived
  // ramp; the halo always uses the configured border color so the line
  // stays legible against bright/dark terrain regardless of shading mode.
  var lineRgb = line.lineColor.rgb;
  if (line.slopeShadingEnabled > 0.5) {
    lineRgb = slopeToColor(slope);
  }
  let lineLinear = srgbToLinear(lineRgb);
  let borderLinear = srgbToLinear(line.borderColor.rgb);
  var linear = mix(lineLinear, borderLinear, t);
  var alpha = mix(line.lineColor.a, line.borderColor.a, t);

  // Outer AA fade across the 0.5*AA region added to geomWidthDev.
  let outerAlpha = 1.0 - smoothstep(geomWidthDev - aaDev, geomWidthDev, sdf);
  alpha *= outerAlpha;

  if (alpha <= 0.0) {
    return vec4f(0.0);
  }

  // Apply atmosphere scattering in linear space, then convert back to sRGB.
  // No ACES tonemap — line colors are LDR UI elements, not HDR scene content.
  let atmos = applyAtmosphereLine(linear, anchor);
  let final_linear = mix(linear, atmos, line.atmosphereOpacity);
  return vec4f(linearToSrgb(final_linear), alpha);
}
`;

// LineUniforms: mat4(64) + vec4(16) + vec4(16) + 8*f32(32) = 128 bytes
const LINE_UNIFORM_SIZE = 128;

export class LineLayer {
  constructor(config, geojsonSource, queryElevationMercator) {
    this._source = geojsonSource;
    this._queryElevation = queryElevationMercator;

    const paint = config.paint || {};
    this._lineColor = parseColor(paint['line-color'] || '#ff8800');
    this._borderColor = parseColor(paint['line-border-color'] || '#331100');
    this._lineWidth = paint['line-width'] || 3;
    this._borderWidth = paint['line-border-width'] || 0;
    this._atmosphereOpacity = paint['atmosphere-opacity'] != null ? paint['atmosphere-opacity'] : 1.0;
    this._slopeShading = !!paint['line-slope-shading'];

    this._gpuLines = null;
    this._positionBuffer = null;
    this._uniformBuffer = null;
    this._sharedBindGroup = null;
    this._polylines = [];
    this._positionData = null;
    this._cachedElevations = null; // raw elevation in meters per vertex
    this._cachedSlopes = null;     // smoothed signed grade fraction per vertex
    this._elevationsDirty = true;
    this._lastExaggeration = -1;
    this._positionsDirty = true;
    this._device = null;
  }

  init(device, format, globalUniformBuffer, createGPULines) {
    this._device = device;
    this._globalUniformBuffer = globalUniformBuffer;

    // Reversed-z depth bias: multiplied by clip.w in the shader, giving a
    // constant NDC-z offset that lifts lines above terrain uniformly.
    // With reversed-z infinite far, NDC z = near/distance ≈ 0.001, so this
    // must be small to avoid defeating terrain occlusion.
    this._depthOffset = 1e-5;

    this._gpuLines = createGPULines(device, {
      colorTargets: {
        format,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      },
      join: 'bevel',
      cap: 'square',
      depthStencil: {
        format: 'depth32float',
        depthWriteEnabled: false,
        depthCompare: 'greater',
      },
      vertexShaderBody: lineVertexShaderBody,
      fragmentShaderBody: lineFragmentShaderBody,
    });
  }

  _ensureBuffers() {
    if (this._positionBuffer) return; // already built
    const lineFeatures = this._source.lineFeatures;
    if (lineFeatures.length === 0) return;

    const device = this._device;
    // Storage buffer bind group offsets must be 256-byte aligned (16 vec4f)
    const ALIGN = 16;
    let totalVerts = 0;
    for (const lf of lineFeatures) {
      totalVerts = Math.ceil(totalVerts / ALIGN) * ALIGN;
      totalVerts += lf.coordinates.length;
    }
    if (totalVerts === 0) return;

    // Create shared position storage buffer
    this._positionBuffer = device.createBuffer({
      size: totalVerts * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this._positionData = new Float32Array(totalVerts * 4);
    this._cachedElevations = new Float32Array(totalVerts); // raw meters
    this._cachedSlopes = new Float32Array(totalVerts);     // grade fraction

    // Create per-polyline bind groups (group 1) with 256-byte aligned offsets
    let offset = 0;
    for (const lf of lineFeatures) {
      offset = Math.ceil(offset / ALIGN) * ALIGN;
      const count = lf.coordinates.length;
      const dataBindGroup = device.createBindGroup({
        layout: this._gpuLines.getBindGroupLayout(1),
        entries: [{
          binding: 0,
          resource: { buffer: this._positionBuffer, offset: offset * 16, size: count * 16 },
        }],
      });
      this._polylines.push({ offset, count, feature: lf, dataBindGroup });
      offset += count;
    }

    // Create line uniform buffer
    this._uniformBuffer = device.createBuffer({
      size: LINE_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create shared bind group (group 2) — line uniforms + global uniforms
    this._sharedBindGroup = device.createBindGroup({
      layout: this._gpuLines.getBindGroupLayout(2),
      entries: [
        { binding: 0, resource: { buffer: this._uniformBuffer } },
        { binding: 1, resource: { buffer: this._globalUniformBuffer } },
      ],
    });
  }

  invalidateElevations() {
    this._elevationsDirty = true;
  }

  // Recompute per-vertex slope (signed grade fraction) for every polyline,
  // using a length-weighted average rise/run over a ~150m window. Matches
  // the elevation-profile smoothing so the on-terrain coloring and the
  // profile read the same numbers. Called only when slope shading is on
  // and elevation data has changed.
  _recomputeSlopes() {
    if (!this._cachedSlopes) return;
    const elevs = this._cachedElevations;
    const slopes = this._cachedSlopes;
    const HALF_WINDOW = 75; // meters
    const EARTH_RADIUS_M = 6371000;
    const TO_RAD = Math.PI / 180;

    for (const polyline of this._polylines) {
      const coords = polyline.feature.coordinates;
      const off = polyline.offset;
      const n = polyline.count;
      if (n < 2) {
        for (let i = 0; i < n; i++) slopes[off + i] = 0;
        continue;
      }

      // Cumulative haversine distance along this polyline. Mercator coords
      // are converted to lon/lat first so the slope is computed against
      // true horizontal ground distance rather than Mercator-distorted units.
      const cumDist = new Float64Array(n);
      for (let i = 1; i < n; i++) {
        const a = coords[i - 1], b = coords[i];
        const lon1 = a.mercatorX * 360 - 180;
        const lon2 = b.mercatorX * 360 - 180;
        const lat1 = Math.atan(Math.sinh(Math.PI * (1 - 2 * a.mercatorY))) * 180 / Math.PI;
        const lat2 = Math.atan(Math.sinh(Math.PI * (1 - 2 * b.mercatorY))) * 180 / Math.PI;
        const dLat = (lat2 - lat1) * TO_RAD;
        const dLon = (lon2 - lon1) * TO_RAD;
        const s2 = Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1 * TO_RAD) * Math.cos(lat2 * TO_RAD) * Math.sin(dLon / 2) ** 2;
        cumDist[i] = cumDist[i - 1] + 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s2));
      }

      const rises = new Float64Array(n - 1);
      const runs = new Float64Array(n - 1);
      const midDist = new Float64Array(n - 1);
      for (let i = 0; i < n - 1; i++) {
        const e1 = elevs[off + i];
        const e2 = elevs[off + i + 1];
        const run = cumDist[i + 1] - cumDist[i];
        runs[i] = run;
        midDist[i] = (cumDist[i] + cumDist[i + 1]) * 0.5;
        rises[i] = (run > 0 && e1 > 0 && e2 > 0) ? (e2 - e1) : NaN;
      }

      const segS = new Float64Array(n - 1);
      for (let i = 0; i < n - 1; i++) {
        if (isNaN(rises[i])) { segS[i] = NaN; continue; }
        let rise = 0, run = 0;
        for (let j = i; j < n - 1; j++) {
          if (midDist[j] - midDist[i] > HALF_WINDOW) break;
          if (!isNaN(rises[j])) { rise += rises[j]; run += runs[j]; }
        }
        for (let j = i - 1; j >= 0; j--) {
          if (midDist[i] - midDist[j] > HALF_WINDOW) break;
          if (!isNaN(rises[j])) { rise += rises[j]; run += runs[j]; }
        }
        segS[i] = run > 0 ? rise / run : NaN;
      }

      for (let i = 0; i < n; i++) {
        const a = i > 0 ? segS[i - 1] : NaN;
        const b = i < n - 1 ? segS[i] : NaN;
        let s;
        if (isNaN(a) && isNaN(b)) s = 0;
        else if (isNaN(a)) s = b;
        else if (isNaN(b)) s = a;
        else s = (a + b) * 0.5;
        slopes[off + i] = s;
      }
    }
  }

  setSlopeShading(enabled) {
    const next = !!enabled;
    if (this._slopeShading === next) return;
    this._slopeShading = next;
    this._positionsDirty = true;
  }

  prepare(projectionView, canvasW, canvasH, pixelRatio, exaggeration, globalElevScale) {
    if (!this._gpuLines) return;
    this._ensureBuffers();
    if (this._polylines.length === 0) return;

    // Apply carried-over elevations from a previous source replacement
    if (this._elevationCarryover) {
      for (const polyline of this._polylines) {
        for (let i = 0; i < polyline.count; i++) {
          const c = polyline.feature.coordinates[i];
          const elev = this._elevationCarryover.get(c.mercatorX + ',' + c.mercatorY);
          if (elev > 0) this._cachedElevations[polyline.offset + i] = elev;
        }
      }
      this._elevationCarryover = null;
      this._positionsDirty = true;
    }

    // Requery elevations only when tile coverage changes.
    // Only update a vertex's cached elevation when the new query returns a
    // valid result, so async tile loads never reset good values to zero.
    if (this._elevationsDirty) {
      const elevs = this._cachedElevations;
      for (const polyline of this._polylines) {
        for (let i = 0; i < polyline.count; i++) {
          const coord = polyline.feature.coordinates[i];
          const newElev = this._queryElevation(coord.mercatorX, coord.mercatorY);
          if (newElev != null && newElev > 0) {
            if (elevs[polyline.offset + i] !== newElev) {
              elevs[polyline.offset + i] = newElev;
              this._positionsDirty = true;
            }
          }
        }
      }
      this._elevationsDirty = false;
    }

    // Rebuild world positions when elevations, exaggeration, or global scale change
    if (this._positionsDirty || exaggeration !== this._lastExaggeration || globalElevScale !== this._lastGlobalElevScale) {
      if (this._slopeShading) this._recomputeSlopes();
      const data = this._positionData;
      const elevs = this._cachedElevations;
      const slopes = this._cachedSlopes;
      const slopeShading = this._slopeShading;
      for (const polyline of this._polylines) {
        for (let i = 0; i < polyline.count; i++) {
          const coord = polyline.feature.coordinates[i];
          const elev = elevs[polyline.offset + i];
          const slope = slopeShading ? slopes[polyline.offset + i] : 0;
          const idx = (polyline.offset + i) * 4;

          if (elev == null || elev <= 0) {
            data[idx] = coord.mercatorX;
            data[idx + 1] = 0;
            data[idx + 2] = coord.mercatorY;
            data[idx + 3] = slope;
          } else {
            data[idx] = coord.mercatorX;
            data[idx + 1] = (elev + 3) * globalElevScale * exaggeration;
            data[idx + 2] = coord.mercatorY;
            data[idx + 3] = slope;
          }
        }
      }
      this._device.queue.writeBuffer(this._positionBuffer, 0, data);
      this._lastExaggeration = exaggeration;
      this._lastGlobalElevScale = globalElevScale;
      this._positionsDirty = false;
    }

    // Write line uniforms
    const uniforms = new Float32Array(LINE_UNIFORM_SIZE / 4);
    uniforms.set(projectionView, 0);                       // 0-15: projectionView
    uniforms[16] = this._lineColor[0];                     // lineColor
    uniforms[17] = this._lineColor[1];
    uniforms[18] = this._lineColor[2];
    uniforms[19] = this._lineColor[3];
    uniforms[20] = this._borderColor[0];                   // borderColor
    uniforms[21] = this._borderColor[1];
    uniforms[22] = this._borderColor[2];
    uniforms[23] = this._borderColor[3];
    uniforms[24] = this._lineWidth;                        // lineWidth
    uniforms[25] = this._borderWidth;                      // borderWidth
    uniforms[26] = pixelRatio;                             // pixelRatio
    uniforms[27] = exaggeration;                           // exaggeration
    uniforms[28] = this._atmosphereOpacity;                // atmosphereOpacity
    uniforms[29] = this._depthOffset;                      // depthOffset
    uniforms[30] = this._slopeShading ? 1 : 0;             // slopeShadingEnabled
    this._device.queue.writeBuffer(this._uniformBuffer, 0, uniforms);

    this._canvasW = canvasW;
    this._canvasH = canvasH;
  }

  draw(pass) {
    if (!this._gpuLines || this._polylines.length === 0) return;

    for (const polyline of this._polylines) {
      this._gpuLines.draw(pass, {
        vertexCount: polyline.count,
        resolution: [this._canvasW, this._canvasH],
      }, [polyline.dataBindGroup, this._sharedBindGroup]);
    }
  }

  replaceSource(newSource, elevationCarryover) {
    if (this._positionBuffer) this._positionBuffer.destroy();
    if (this._uniformBuffer) this._uniformBuffer.destroy();
    this._source = newSource;
    this._positionBuffer = null;
    this._uniformBuffer = null;
    this._sharedBindGroup = null;
    this._polylines = [];
    this._positionData = null;
    this._cachedElevations = null;
    this._cachedSlopes = null;
    this._elevationCarryover = elevationCarryover || null;
    this._elevationsDirty = true;
    this._positionsDirty = true;
  }

  destroy() {
    if (this._gpuLines) this._gpuLines.destroy();
    if (this._positionBuffer) this._positionBuffer.destroy();
    if (this._uniformBuffer) this._uniformBuffer.destroy();
  }
}
