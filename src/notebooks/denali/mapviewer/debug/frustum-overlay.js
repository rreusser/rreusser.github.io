import { invertMat4, computeFrustumCorners } from '../math/mat4.ts';

export class FrustumOverlay {
  constructor(device, format, pixelRatio, createGPULines) {
    this._device = device;
    this._pixelRatio = pixelRatio;

    const frustumVS = /* wgsl */`
@group(1) @binding(0) var<storage, read> positions: array<vec4f>;
struct FrustumUniforms { projectionView: mat4x4f, lineColor: vec4f, borderColor: vec4f, lineWidth: f32, borderWidth: f32, pixelRatio: f32, _pad: f32, };
@group(2) @binding(0) var<uniform> u: FrustumUniforms;
struct Vertex { position: vec4f, width: f32, anchor: vec3f, }
fn getVertex(index: u32) -> Vertex {
  let p = positions[index];
  let clip = u.projectionView * p;
  return Vertex(clip, u.lineWidth * u.pixelRatio, p.xyz);
}`;
    const frustumFS = /* wgsl */`
struct FrustumUniforms { projectionView: mat4x4f, lineColor: vec4f, borderColor: vec4f, lineWidth: f32, borderWidth: f32, pixelRatio: f32, _pad: f32, };
@group(2) @binding(0) var<uniform> u: FrustumUniforms;
fn getColor(lineCoord: vec2f, anchor: vec3f) -> vec4f {
  let totalWidth = u.lineWidth * u.pixelRatio;
  let borderW = u.borderWidth * u.pixelRatio;
  let sdf = length(lineCoord) * totalWidth;
  let borderEdge = totalWidth - borderW;
  let t = smoothstep(borderEdge - 1.0, borderEdge + 1.0, sdf);
  var rgb = mix(u.lineColor.rgb, u.borderColor.rgb, t);
  var alpha = mix(u.lineColor.a, u.borderColor.a, t);
  let outerAlpha = 1.0 - smoothstep(totalWidth - 1.0, totalWidth + 1.0, sdf);
  alpha *= outerAlpha;
  return vec4f(rgb, alpha);
}`;

    this._gpuLines = createGPULines(device, {
      colorTargets: {
        format,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      },
      join: 'bevel',
      cap: 'round',
      depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'greater' },
      vertexShaderBody: frustumVS,
      fragmentShaderBody: frustumFS,
    });

    this._uniformBuffer = device.createBuffer({ size: 112, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this._sharedBindGroup = device.createBindGroup({
      layout: this._gpuLines.getBindGroupLayout(2),
      entries: [{ binding: 0, resource: { buffer: this._uniformBuffer } }],
    });

    this._positionBuffer = null;
    this._dataBindGroup = null;
    this._vertexCount = 0;
    this._frozen = false;
    this._coverageProjView = null;
  }

  get isFrozen() {
    return this._frozen;
  }

  get coverageProjView() {
    return this._coverageProjView;
  }

  freeze(projectionView) {
    this._frozen = true;
    this._coverageProjView = new Float32Array(projectionView);

    const invPV = new Float32Array(16);
    invertMat4(invPV, this._coverageProjView);
    const c = computeFrustumCorners(invPV);

    const SUB = 20;
    const data = [];
    const corner = (ci) => [c[ci*3], c[ci*3+1], c[ci*3+2], 1];
    const brk = () => data.push([0,0,0,0]);
    const vert = (ci) => data.push(corner(ci));
    const edge = (a, b) => {
      brk();
      const ca = corner(a), cb = corner(b);
      for (let j = 0; j <= SUB; j++) {
        const t = j / SUB;
        data.push([ca[0]+(cb[0]-ca[0])*t, ca[1]+(cb[1]-ca[1])*t, ca[2]+(cb[2]-ca[2])*t, 1]);
      }
    };
    brk(); vert(0); vert(1); vert(2); vert(3); vert(0); // near quad
    brk(); vert(4); vert(5); vert(6); vert(7); vert(4); // far quad
    edge(0,4); edge(1,5); edge(2,6); edge(3,7);          // connecting edges
    brk();

    const pos = new Float32Array(data.length * 4);
    for (let i = 0; i < data.length; i++) {
      pos[i*4] = data[i][0]; pos[i*4+1] = data[i][1]; pos[i*4+2] = data[i][2]; pos[i*4+3] = data[i][3];
    }

    this._vertexCount = data.length;
    this._positionBuffer = this._device.createBuffer({ size: pos.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this._device.queue.writeBuffer(this._positionBuffer, 0, pos);
    this._dataBindGroup = this._device.createBindGroup({
      layout: this._gpuLines.getBindGroupLayout(1),
      entries: [{ binding: 0, resource: { buffer: this._positionBuffer } }],
    });
  }

  unfreeze() {
    this._frozen = false;
    this._coverageProjView = null;
    if (this._positionBuffer) {
      this._positionBuffer.destroy();
      this._positionBuffer = null;
    }
    this._dataBindGroup = null;
  }

  draw(pass, projectionView, canvasW, canvasH) {
    if (!this._frozen || !this._positionBuffer) return;

    const fu = new Float32Array(112 / 4);
    fu.set(projectionView, 0);
    fu[16] = 0; fu[17] = 0.5; fu[18] = 0.15; fu[19] = 1; // lineColor: darker green
    fu[20] = 1; fu[21] = 1; fu[22] = 1; fu[23] = 1;       // borderColor: white
    fu[24] = 4; fu[25] = 1.5; fu[26] = this._pixelRatio;   // lineWidth, borderWidth, pixelRatio
    this._device.queue.writeBuffer(this._uniformBuffer, 0, fu);
    this._gpuLines.draw(pass, {
      vertexCount: this._vertexCount,
      resolution: [canvasW, canvasH],
    }, [this._dataBindGroup, this._sharedBindGroup]);
  }

  destroy() {
    if (this._positionBuffer) this._positionBuffer.destroy();
    this._gpuLines.destroy();
    this._uniformBuffer.destroy();
  }
}
