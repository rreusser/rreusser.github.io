// Lazy loader for the h264-mp4-encoder UMD bundle. Used by notebooks
// that record offline animations (e.g. zooming-aperiodic-monotile,
// denali). The bundle registers itself as `window.HME` and ships its
// own wasm; we don't bundle through Vite because the wasm pathing is
// awkward and the CDN copy is what the original notebooks use.
//
// Usage:
//   const HME = await loadH264Encoder();
//   const enc = await HME.createH264MP4Encoder();
//   enc.width = 1920; enc.height = 1080; enc.frameRate = 30;
//   enc.quantizationParameter = 22;
//   enc.initialize();
//   for (...) enc.addFrameRgba(uint8);
//   enc.finalize();
//   const bytes = enc.FS.readFile(enc.outputFilename);
//   enc.delete();

const CDN_URL = 'https://unpkg.com/h264-mp4-encoder/embuild/dist/h264-mp4-encoder.web.js';

let _loadPromise = null;

export function loadH264Encoder() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = new Promise((resolve, reject) => {
    if (window.HME) {
      resolve(window.HME);
      return;
    }
    const s = document.createElement('script');
    s.src = CDN_URL;
    s.onload = () => {
      if (window.HME) resolve(window.HME);
      else reject(new Error('h264-mp4-encoder loaded but window.HME not set'));
    };
    s.onerror = () => reject(new Error('failed to load h264-mp4-encoder from CDN'));
    document.head.appendChild(s);
  });
  return _loadPromise;
}
