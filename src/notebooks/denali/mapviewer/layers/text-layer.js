// Text label rendering for GeoJSON point features on terrain
// Uses webgpu-text library for MSDF-based text rendering

import { createGPUText } from '../lib/webgpu-text/webgpu-text.ts';
import { atmosphereCode } from '../shaders/atmosphere.js';

function parseColor(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return [1, 0, 0, 1];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255, 1];
}

// Custom fragment shader body that applies atmosphere scattering to text.
// msdfMedian3, msdfScreenPxRange, and msdfComposite are injected by the library.
const textFragmentShaderBody = /* wgsl */`
${atmosphereCode}

@group(2) @binding(0) var<uniform> globals: GlobalUniforms;

struct TextAtmosUniforms {
  exaggeration: f32,
  atmosphere_opacity: f32,
};
@group(2) @binding(1) var<uniform> textAtmos: TextAtmosUniforms;

fn srgbToLinear(c: vec3<f32>) -> vec3<f32> {
  return pow(c, vec3<f32>(2.2));
}

fn applyAtmosphereText(color: vec3<f32>, world_pos: vec3<f32>) -> vec3<f32> {
  let cam_pos = globals.camera_position.xyz;
  let cam_h_m = globals.camera_position.w;
  let mpu = globals.sun_direction.w;
  let exag = textAtmos.exaggeration;

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

fn getColor(uv: vec2f, color: vec4f, strokeColor: vec4f, strokeWidth: f32, msdf: vec4f, anchor: vec4f) -> vec4f {
  let base = msdfComposite(uv, color, strokeColor, strokeWidth, msdf);
  if (base.a <= 0.0) { return vec4f(0.0); }

  let linear_c = srgbToLinear(base.rgb);
  let atmos_c = applyAtmosphereText(linear_c, anchor.xyz);
  let mixed = mix(linear_c, atmos_c, textAtmos.atmosphere_opacity);
  return vec4f(linearToSrgb(acesTonemap(mixed)), base.a);
}
`;

export class TextLayer {
  constructor(config, geojsonSource, queryElevationMercator) {
    this._source = geojsonSource;
    this._queryElevation = queryElevationMercator;

    const paint = config.paint || {};
    this._textField = paint['text-field'] || 'name';
    this._fontSize = paint['text-size'] || 12;
    this._color = parseColor(paint['text-color'] || '#ffffff');
    this._strokeColor = parseColor(paint['text-halo-color'] || '#000000');
    this._strokeWidth = paint['text-halo-width'] != null ? paint['text-halo-width'] : 1.5;
    this._offset = paint['text-offset'] || [0, -10]; // default: above the circle
    this._align = paint['text-align'] || 'center';
    this._baseline = paint['text-baseline'] || 'bottom';
    this._atmosphereOpacity = paint['atmosphere-opacity'] != null ? paint['atmosphere-opacity'] : 1.0;

    this._textContext = null;
    this._spans = [];
    this._ready = false;
    this._visibleFeatures = null;
    this._fontAtlas = null;
    this._atmosphereBindGroup = null;
    this._textAtmosBuffer = null;
    this._textAtmosData = new Float32Array(4);
    this._lastScaledStrokeWidth = null;
  }

  init(device, fontAtlas, format, depthStencilFormat, globalUniformBuffer) {
    this._device = device;
    this._fontAtlas = fontAtlas;

    this._textContext = createGPUText(device, {
      fontAtlas,
      fragmentShaderBody: textFragmentShaderBody,
      colorTargets: {
        format,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      },
      depthStencil: { format: depthStencilFormat, depthWriteEnabled: false, depthCompare: 'always' },
    });

    // Create text atmosphere uniform buffer (exaggeration + atmosphere_opacity)
    this._textAtmosBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create atmosphere bind group using the auto-generated layout for group 2
    const atmosBGL = this._textContext.getBindGroupLayout(2);
    this._atmosphereBindGroup = device.createBindGroup({
      layout: atmosBGL,
      entries: [
        { binding: 0, resource: { buffer: globalUniformBuffer } },
        { binding: 1, resource: { buffer: this._textAtmosBuffer } },
      ],
    });

    // Create a span for each feature with a text field
    for (let si = 0; si < this._source.features.length; si++) {
      const f = this._source.features[si];
      const text = f.properties[this._textField];
      if (!text) continue;
      const span = this._textContext.createSpan({
        text: String(text),
        position: [0, 0, 0],
        fontSize: this._fontSize,
        color: this._color,
        strokeColor: this._strokeColor,
        strokeWidth: this._strokeWidth,
        offset: this._offset,
        align: this._align,
        baseline: this._baseline,
      });

      // Cache text metrics for collision detection
      const metrics = this._textContext.measureText(String(text), this._fontSize);
      this._spans.push({ span, feature: f, sourceIndex: si, textWidth: metrics.width, ascent: metrics.ascent, descent: metrics.descent });
    }

    this._ready = true;
  }

  prepare(projectionView, canvasW, canvasH, pixelRatio, exaggeration, globalElevScale) {
    if (!this._ready) return;

    // Scale stroke width by pixel ratio for consistent CSS-pixel appearance
    const scaledStrokeWidth = this._strokeWidth * pixelRatio;
    if (scaledStrokeWidth !== this._lastScaledStrokeWidth) {
      this._lastScaledStrokeWidth = scaledStrokeWidth;
      for (const { span } of this._spans) {
        span.setStrokeWidth(scaledStrokeWidth);
      }
    }

    // Update span positions with world coordinates
    // The vertex shader applies projectionView via viewMatrix
    for (let i = 0; i < this._spans.length; i++) {
      const { span, feature } = this._spans[i];
      if (this._visibleFeatures && !this._visibleFeatures.has(i)) {
        span.setPosition([0, 0, 0, 0]);
        continue;
      }
      const f = feature;
      const elev = this._queryElevation(f.mercatorX, f.mercatorY);
      if (elev == null || elev <= 0) {
        span.setPosition([0, 0, 0, 0]);
        continue;
      }

      const wx = f.mercatorX;
      const wy = elev * globalElevScale * exaggeration;
      const wz = f.mercatorY;

      // Frustum cull using clip-space projection
      const cw = projectionView[3] * wx + projectionView[7] * wy + projectionView[11] * wz + projectionView[15];
      if (cw <= 0) {
        span.setPosition([0, 0, 0, 0]);
        continue;
      }

      // Set world position — the shader's getVertex applies viewMatrix (= projectionView)
      // The anchor varying passes world pos to the fragment shader for atmosphere
      span.setPosition([wx, wy, wz, 1]);
    }

    // Resolution in CSS pixels (fontSize operates in these units)
    const cssW = canvasW / pixelRatio;
    const cssH = canvasH / pixelRatio;

    this._textContext.updateUniforms({
      resolution: [cssW, cssH],
      viewMatrix: projectionView,
    });

    // Update text atmosphere uniforms
    const d = this._textAtmosData;
    d[0] = exaggeration;
    d[1] = this._atmosphereOpacity;
    this._device.queue.writeBuffer(this._textAtmosBuffer, 0, d);
  }

  draw(pass) {
    if (!this._ready) return;
    if (this._textContext.getTotalCharacterCount() === 0) return;
    this._textContext.draw(pass, {
      resolution: [1, 1],
      skipUniformUpdate: true,
    }, [this._atmosphereBindGroup]);
  }

  getCollisionItems(projectionView, canvasW, canvasH, pixelRatio, exaggeration, globalElevScale) {
    if (!this._ready) return [];
    const cssW = canvasW / pixelRatio;
    const cssH = canvasH / pixelRatio;
    const items = [];

    for (let i = 0; i < this._spans.length; i++) {
      const { feature, sourceIndex, textWidth, ascent, descent } = this._spans[i];
      const f = feature;
      const elev = this._queryElevation(f.mercatorX, f.mercatorY);
      if (elev == null || elev <= 0) continue;

      const wx = f.mercatorX;
      const wy = elev * globalElevScale * exaggeration;
      const wz = f.mercatorY;

      const cx = projectionView[0] * wx + projectionView[4] * wy + projectionView[8] * wz + projectionView[12];
      const cy = projectionView[1] * wx + projectionView[5] * wy + projectionView[9] * wz + projectionView[13];
      const cz = projectionView[2] * wx + projectionView[6] * wy + projectionView[10] * wz + projectionView[14];
      const cw = projectionView[3] * wx + projectionView[7] * wy + projectionView[11] * wz + projectionView[15];

      if (cw <= 0) continue;
      const ndcX = cx / cw;
      const ndcY = cy / cw;
      if (ndcX < -1.2 || ndcX > 1.2 || ndcY < -1.2 || ndcY > 1.2) continue;

      let screenX = (ndcX * 0.5 + 0.5) * cssW + this._offset[0];
      let screenY = (0.5 - ndcY * 0.5) * cssH + this._offset[1];

      const halfW = textWidth / 2;
      const halfH = (ascent + descent) / 2;

      // Adjust center based on alignment
      if (this._align === 'left') screenX += halfW;
      else if (this._align === 'right') screenX -= halfW;

      // Adjust center based on baseline
      if (this._baseline === 'top') screenY += halfH;
      else if (this._baseline === 'bottom') screenY -= halfH;

      items.push({
        layerIndex: -1, // set by caller
        featureIndex: i,
        sourceFeatureIndex: sourceIndex,
        screenX,
        screenY,
        halfW,
        halfH,
        depth: cz / cw,
        clipW: cw,
      });
    }
    return items;
  }

  setVisibleFeatures(visibleSet) {
    this._visibleFeatures = visibleSet;
  }

  destroy() {
    if (this._textContext) this._textContext.destroy();
    if (this._textAtmosBuffer) this._textAtmosBuffer.destroy();
  }
}
