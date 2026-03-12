// Simple 1D FFT using the Cooley-Tukey algorithm
export function fft(real, imag, inverse = false) {
  const n = real.length;
  const levels = Math.log2(n);

  // Bit-reversal permutation
  for (let i = 0; i < n; i++) {
    let j = 0;
    for (let k = 0; k < levels; k++) {
      j = (j << 1) | ((i >> k) & 1);
    }
    if (j > i) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // Cooley-Tukey FFT
  const dir = inverse ? 1 : -1;
  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angle = dir * 2 * Math.PI / size;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);

    for (let i = 0; i < n; i += size) {
      let curReal = 1, curImag = 0;
      for (let j = 0; j < halfSize; j++) {
        const evenIdx = i + j;
        const oddIdx = i + j + halfSize;

        const tReal = curReal * real[oddIdx] - curImag * imag[oddIdx];
        const tImag = curReal * imag[oddIdx] + curImag * real[oddIdx];

        real[oddIdx] = real[evenIdx] - tReal;
        imag[oddIdx] = imag[evenIdx] - tImag;
        real[evenIdx] = real[evenIdx] + tReal;
        imag[evenIdx] = imag[evenIdx] + tImag;

        const newReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = newReal;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      real[i] /= n;
      imag[i] /= n;
    }
  }
}

// Create Gaussian kernel in frequency domain
export function gaussianKernelFreq(n, sigma) {
  const kernel = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const freq = i < n / 2 ? i / n : (i - n) / n;
    kernel[i] = Math.exp(-2 * Math.PI * Math.PI * sigma * sigma * freq * freq);
  }
  return kernel;
}

// Convolve using FFT
export function convolveFFT(data, kernelFreq, tempReal, tempImag) {
  const n = data.length;

  // Copy to temp arrays
  for (let i = 0; i < n; i++) {
    tempReal[i] = data[i];
    tempImag[i] = 0;
  }

  // Forward FFT
  fft(tempReal, tempImag, false);

  // Multiply by kernel (kernel is real and symmetric)
  for (let i = 0; i < n; i++) {
    tempReal[i] *= kernelFreq[i];
    tempImag[i] *= kernelFreq[i];
  }

  // Inverse FFT
  fft(tempReal, tempImag, true);

  // Copy result back
  for (let i = 0; i < n; i++) {
    data[i] = tempReal[i];
  }
}
