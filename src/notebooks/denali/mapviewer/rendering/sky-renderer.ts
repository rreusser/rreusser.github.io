import { skyVertexShader, skyFragmentShader } from '../shaders/sky.js';
import type { GPUContext } from './gpu-context.ts';

export class SkyRenderer {
  _pipeline: GPURenderPipeline;

  constructor(gpu: GPUContext) {
    const { device, format, globalUniformBGL } = gpu;
    this._pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [globalUniformBGL] }),
      vertex: { module: device.createShaderModule({ code: skyVertexShader }), entryPoint: 'vs_sky', buffers: [] },
      fragment: { module: device.createShaderModule({ code: skyFragmentShader }), entryPoint: 'fs_sky', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'always' },
    });
  }

  draw(pass: GPURenderPassEncoder, globalUniformBindGroup: GPUBindGroup) {
    pass.setPipeline(this._pipeline);
    pass.setBindGroup(0, globalUniformBindGroup);
    pass.draw(3);
  }
}
