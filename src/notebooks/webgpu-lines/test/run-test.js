#!/usr/bin/env node
/**
 * Run a single test
 * Usage: node run-test.js <test-name> [--update]
 *
 * Example: node run-test.js miter-basic
 */

import {
  initWebGPU,
  savePNG,
  loadPNG,
  compareImages,
  generateZigzag,
  generateSpiral,
  generateStraightLine,
  generateLineBreaksW0,
  generateLineBreaksNaN,
  generateDegenerate,
  ensureDirectories
} from './test-harness.js';

import { createGPULines } from '../webgpu-lines.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');
const expectedDir = path.join(__dirname, 'expected');
const actualDir = path.join(__dirname, 'actual');
const diffDir = path.join(__dirname, 'diff');

const testArg = process.argv[2];
const updateMode = process.argv.includes('--update');

if (!testArg) {
  console.error('Usage: node run-test.js <test-name> [--update]');
  console.error('Example: node run-test.js miter-basic');
  process.exit(1);
}

// Resolve test file
const testFile = path.join(fixturesDir, `${testArg}.json`);
if (!fs.existsSync(testFile)) {
  console.error(JSON.stringify({ status: 'error', name: testArg, message: 'test not found' }));
  process.exit(1);
}

// Generate positions from pattern name
function getPatternPositions(pattern) {
  switch (pattern) {
    case 'zigzag': return generateZigzag(6);
    case 'spiral': return generateSpiral(50);
    case 'straight': return generateStraightLine(2);
    case 'line-breaks-w0': return generateLineBreaksW0();
    case 'line-breaks-nan': return generateLineBreaksNaN();
    case 'degenerate': return generateDegenerate();
    default: throw new Error(`Unknown pattern: ${pattern}`);
  }
}

// Convert positions to Float32Array buffer
function positionsToBuffer(positions, breaks, colors) {
  // Find first non-null position to determine dimensionality
  const firstValid = positions.find(p => p !== null && p[0] !== null);
  const is3D = firstValid && firstValid.length === 3;
  const hasColors = colors && colors.length > 0;
  const stride = hasColors ? 8 : 4;

  const buffer = new Float32Array(positions.length * stride);

  for (let i = 0; i < positions.length; i++) {
    const pt = positions[i];
    const isBreak = breaks && breaks[i] > 0;

    // Handle null positions (NaN breaks) or break attribute
    const isNull = pt === null || pt[0] === null || pt[1] === null;

    if (isBreak || isNull) {
      buffer[i * stride + 0] = NaN;
      buffer[i * stride + 1] = NaN;
      buffer[i * stride + 2] = 0;
      buffer[i * stride + 3] = 1;
    } else {
      buffer[i * stride + 0] = pt[0];
      buffer[i * stride + 1] = pt[1];
      buffer[i * stride + 2] = is3D ? pt[2] : 0;
      buffer[i * stride + 3] = 1;
    }

    if (hasColors) {
      const color = colors[i] || [0, 0, 0];
      buffer[i * stride + 4] = color[0];
      buffer[i * stride + 5] = color[1];
      buffer[i * stride + 6] = color[2];
      buffer[i * stride + 7] = 1;
    }
  }

  return { buffer, stride, hasColors, vertexCount: positions.length };
}

// Create vertex shader body
function createVertexShader(lineWidth, hasColors) {
  if (hasColors) {
    return /* wgsl */`
      struct VertexData {
        position: vec4f,
        color: vec4f,
      }

      @group(1) @binding(0) var<storage, read> vertexData: array<VertexData>;

      struct Vertex {
        position: vec4f,
        width: f32,
        vertexColor: vec3f,
      }

      fn getVertex(index: u32) -> Vertex {
        let v = vertexData[index];
        return Vertex(v.position, ${lineWidth.toFixed(1)}, v.color.rgb);
      }
    `;
  } else {
    return /* wgsl */`
      @group(1) @binding(0) var<storage, read> positions: array<vec4f>;

      struct Vertex {
        position: vec4f,
        width: f32,
      }

      fn getVertex(index: u32) -> Vertex {
        let p = positions[index];
        return Vertex(p, ${lineWidth.toFixed(1)});
      }
    `;
  }
}

// Create fragment shader body based on shader config
function createFragmentShader(shader, lineWidth, hasColors) {
  switch (shader.type) {
    case 'solid': {
      const [r, g, b] = shader.color || [0, 0, 0];
      const alpha = shader.alpha ?? 0.5;
      return /* wgsl */`
        fn getColor(lineCoord: vec2f) -> vec4f {
          return vec4f(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, ${alpha.toFixed(3)});
        }
      `;
    }

    case 'sdf': {
      const isMiter = shader.sdfType === 'miter';
      const sdfExpr = isMiter
        ? 'max(abs(lineCoord.x), abs(lineCoord.y))'
        : 'length(lineCoord)';
      return /* wgsl */`
        fn linearstep(a: f32, b: f32, x: f32) -> f32 {
          return clamp((x - a) / (b - a), 0.0, 1.0);
        }

        fn getColor(lineCoord: vec2f) -> vec4f {
          let width = ${lineWidth.toFixed(1)};
          let sdf = 0.5 * width * ${sdfExpr};
          let aa = linearstep(width * 0.5, width * 0.5 - 1.0, sdf);
          let border = linearstep(width * 0.5 - 4.5, width * 0.5 - 3.5, sdf);
          let alpha = aa * mix(0.2, 1.0, border);
          return vec4f(0.0, 0.0, 0.0, alpha);
        }
      `;
    }

    case 'vertex-color': {
      if (!hasColors) {
        throw new Error('vertex-color shader requires colors in test data');
      }
      return /* wgsl */`
        fn getColor(lineCoord: vec2f, vertexColor: vec3f) -> vec4f {
          return vec4f(vertexColor, 1.0);
        }
      `;
    }

    case 'custom': {
      return shader.wgsl;
    }

    default:
      throw new Error(`Unknown shader type: ${shader.type}`);
  }
}

async function run() {
  ensureDirectories();

  const config = JSON.parse(fs.readFileSync(testFile, 'utf8'));
  const { canvas, lineWidth, options, shader } = config;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Get positions
  let positions, vertexCount, hasColors;
  if (config.pattern) {
    const posBuffer = getPatternPositions(config.pattern);
    positions = posBuffer;
    vertexCount = posBuffer.length / 4;
    hasColors = false;
  } else {
    const data = positionsToBuffer(config.positions, config.breaks, config.colors);
    positions = data.buffer;
    vertexCount = data.vertexCount;
    hasColors = data.hasColors;
  }

  // Initialize WebGPU
  const { device, format } = await initWebGPU();

  // Create render target
  const texture = device.createTexture({
    size: { width: canvasWidth, height: canvasHeight },
    format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
  });

  // Create depth texture if needed
  let depthTexture = null;
  if (config.depth) {
    depthTexture = device.createTexture({
      size: { width: canvasWidth, height: canvasHeight },
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
  }

  const bytesPerRow = Math.ceil(canvasWidth * 4 / 256) * 256;
  const readbackBuffer = device.createBuffer({
    size: bytesPerRow * canvasHeight,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });

  // Build GPU lines options
  const gpuOptions = {
    format,
    join: options.join || 'miter',
    cap: options.cap || 'square',
    miterLimit: options.miterLimit,
    joinResolution: options.joinResolution || 8,
    capResolution: options.capResolution || 8,
    vertexShaderBody: createVertexShader(lineWidth, hasColors),
    fragmentShaderBody: createFragmentShader(shader, lineWidth, hasColors)
  };

  if (config.depth) {
    gpuOptions.depthFormat = 'depth24plus';
  }

  // Add blending
  const needsBlend = shader.type === 'sdf' ||
    (shader.type === 'solid' && (shader.alpha || 0.5) < 1.0) ||
    config.blend;

  if (needsBlend) {
    gpuOptions.blend = config.blend || {
      color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }
    };
  }

  // Create GPU lines renderer
  const gpuLines = createGPULines(device, gpuOptions);

  // Create data buffer
  const dataBuffer = device.createBuffer({
    size: positions.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(dataBuffer, 0, positions);

  // Create bind group
  const dataBindGroup = device.createBindGroup({
    layout: gpuLines.getBindGroupLayout(1),
    entries: [
      { binding: 0, resource: { buffer: dataBuffer } }
    ]
  });

  // Render
  const encoder = device.createCommandEncoder();

  const passDescriptor = {
    colorAttachments: [{
      view: texture.createView(),
      loadOp: 'clear',
      storeOp: 'store',
      clearValue: { r: 1, g: 1, b: 1, a: 1 }
    }]
  };

  if (config.depth && depthTexture) {
    passDescriptor.depthStencilAttachment = {
      view: depthTexture.createView(),
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
      depthClearValue: 1.0
    };
  }

  const pass = encoder.beginRenderPass(passDescriptor);

  gpuLines.draw(pass, {
    vertexCount,
    width: lineWidth,
    resolution: [canvasWidth, canvasHeight]
  }, [dataBindGroup]);
  pass.end();

  encoder.copyTextureToBuffer(
    { texture },
    { buffer: readbackBuffer, bytesPerRow },
    { width: canvasWidth, height: canvasHeight }
  );

  device.queue.submit([encoder.finish()]);

  // Read pixels
  await readbackBuffer.mapAsync(GPUMapMode.READ);
  const rawData = new Uint8Array(readbackBuffer.getMappedRange());
  const pixels = new Uint8Array(canvasWidth * canvasHeight * 4);
  for (let row = 0; row < canvasHeight; row++) {
    const srcOffset = row * bytesPerRow;
    const dstOffset = row * canvasWidth * 4;
    pixels.set(rawData.subarray(srcOffset, srcOffset + canvasWidth * 4), dstOffset);
  }
  readbackBuffer.unmap();

  // Save actual
  const actualPath = path.join(actualDir, `${testArg}.png`);
  savePNG(actualPath, pixels, canvasWidth, canvasHeight);

  // Expected path
  const expectedPath = path.join(expectedDir, `${testArg}.png`);

  if (updateMode) {
    savePNG(expectedPath, pixels, canvasWidth, canvasHeight);
    console.log(JSON.stringify({ status: 'updated', name: testArg }));
  } else if (!fs.existsSync(expectedPath)) {
    console.log(JSON.stringify({ status: 'missing', name: testArg }));
  } else {
    const expected = loadPNG(expectedPath);

    if (expected.width !== canvasWidth || expected.height !== canvasHeight) {
      console.log(JSON.stringify({
        status: 'skip',
        name: testArg,
        message: `dimension mismatch: expected ${expected.width}x${expected.height}, got ${canvasWidth}x${canvasHeight}`
      }));
    } else {
      const threshold = config.threshold || 0.1;
      const result = compareImages(pixels, expected.pixels, canvasWidth, canvasHeight, threshold);

      // Save diff
      const diffPath = path.join(diffDir, `${testArg}.png`);
      savePNG(diffPath, result.diffImage, canvasWidth, canvasHeight);

      if (result.match || result.diffPercent < 0.1) {
        console.log(JSON.stringify({
          status: 'pass',
          name: testArg,
          diffPercent: result.diffPercent
        }));
      } else {
        console.log(JSON.stringify({
          status: 'fail',
          name: testArg,
          diffPixels: result.diffPixels,
          diffPercent: result.diffPercent
        }));
        process.exit(1);
      }
    }
  }

  // Cleanup
  await device.queue.onSubmittedWorkDone();
  texture.destroy();
  if (depthTexture) depthTexture.destroy();
  readbackBuffer.destroy();
  dataBuffer.destroy();
  gpuLines.destroy();
  device.destroy();
}

run().catch(err => {
  console.log(JSON.stringify({ status: 'error', name: testArg, message: err.message }));
  process.exit(1);
});
