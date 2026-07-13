// Times peel-renderer's per-frame CPU geometry rebuild with a stub GPU device
// (render-path health check; see the Fix A plan's "measured baselines").
//
//   node docs/plans/harness/rebuild-timing.mjs
globalThis.GPUBufferUsage = { VERTEX: 1, COPY_DST: 2, INDEX: 4, UNIFORM: 8 };
globalThis.GPUShaderStage = { VERTEX: 1, FRAGMENT: 2 };
globalThis.GPUTextureUsage = { RENDER_ATTACHMENT: 1, TEXTURE_BINDING: 2 };
const stub = () => ({ getBindGroupLayout: () => ({}), createView: () => ({}), destroy() {} });
const device = {
  createShaderModule: stub, createBuffer: stub, createBindGroupLayout: stub,
  createBindGroup: stub, createPipelineLayout: stub, createRenderPipeline: stub,
  createTexture: stub, createSampler: stub,
  queue: { writeBuffer() {}, writeTexture() {} },
};

import { createPeelRenderer } from '../../../src/notebooks/mobius-strip/peel-renderer.js';
import { peelShaderCode, compositeShaderCode } from '../../../src/notebooks/mobius-strip/peel-shaders.js';
import { createMobiusMesh, initialEmbedding, bendingStress } from '../../../src/notebooks/mobius-strip/mobius-fem.js';

for (const [nu, nv] of [[64, 10], [128, 32]]) {
  const model = createMobiusMesh({ length: 2 * Math.PI, width: 1, nu, nv });
  const X = new Float32Array(initialEmbedding(model));
  const field = bendingStress(model, X, { E: 1, poisson: 0.35, thickness: 0.03 });
  const r = createPeelRenderer(device, 'bgra8unorm', { peel: peelShaderCode, composite: compositeShaderCode });
  r.initMesh(model, X, 0.03);
  for (let i = 0; i < 10; i++) r.update(X, field, 1, 0.03);
  const REP = 50;
  const t0 = performance.now();
  for (let i = 0; i < REP; i++) r.update(X, field, 1, 0.03);
  console.log(`_rebuild at ${nu}x${model.nv} (nT=${model.nT}): ${((performance.now() - t0) / REP).toFixed(2)} ms/frame (CPU only)`);
}
