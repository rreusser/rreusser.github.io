// 1D Turing pattern simulation using FFT convolution
import { fft, gaussianKernelFreq, convolveFFT } from './fft.js';

export function createTuring1D(N) {
  const field = new Float64Array(N);
  const tempReal = new Float64Array(N);
  const tempImag = new Float64Array(N);
  const activator = new Float64Array(N);
  const inhibitor = new Float64Array(N);

  let actKernel = null;
  let inhKernel = null;
  let mouseX = null; // x position in [0, 1] or null

  function initialize() {
    for (let i = 0; i < N; i++) {
      field[i] = (Math.random() - 0.5) * 0.1;
    }
  }

  function setKernels(activatorRadius, inhibitorRatio) {
    actKernel = gaussianKernelFreq(N, activatorRadius);
    inhKernel = gaussianKernelFreq(N, activatorRadius * inhibitorRatio);
  }

  function setMouse(x) {
    mouseX = x; // x in [0, 1] or null
  }

  function applyPaint() {
    if (mouseX === null) return;

    const centerIdx = Math.floor(mouseX * N);
    const radius = Math.floor(N * 0.03); // 3% of width

    for (let i = -radius; i <= radius; i++) {
      let idx = (centerIdx + i + N) % N; // wrap around
      const dist = Math.abs(i) / radius;
      const falloff = 1 - dist;
      field[idx] = field[idx] * (1 - falloff * 0.5) + 1.0 * falloff * 0.5;
    }
  }

  function step(stepSize, toneMapRange) {
    if (!actKernel || !inhKernel) return;

    // Apply paint if mouse is active
    applyPaint();

    // Compute activator convolution
    activator.set(field);
    convolveFFT(activator, actKernel, tempReal, tempImag);

    // Compute inhibitor convolution
    inhibitor.set(field);
    convolveFFT(inhibitor, inhKernel, tempReal, tempImag);

    // Update field with tone mapping
    for (let i = 0; i < N; i++) {
      const a = activator[i];
      const b = inhibitor[i];
      const delta = (a - b) * stepSize;
      field[i] = Math.atan(toneMapRange * (field[i] + delta)) / toneMapRange;
    }
  }

  function render(ctx, canvasWidth, canvasHeight) {
    const imageData = ctx.createImageData(canvasWidth, canvasHeight);
    const data = imageData.data;

    for (let x = 0; x < canvasWidth; x++) {
      const val = Math.max(0, Math.min(1, (field[x] + 1) * 0.5));
      const gray = Math.floor(val * 255);

      for (let y = 0; y < canvasHeight; y++) {
        const idx = (y * canvasWidth + x) * 4;
        data[idx + 0] = gray;
        data[idx + 1] = gray;
        data[idx + 2] = gray;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  return {
    field,
    activator,
    inhibitor,
    initialize,
    setKernels,
    setMouse,
    step,
    render,
    N
  };
}
