/**
 * Download a data URI as a file
 * @param {string} uri - Data URI or blob URL
 * @param {string} filename - Name for the downloaded file
 */
function downloadURI(uri, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = uri;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Create a snapshot button configuration for use with expandable
 * @param {HTMLCanvasElement|() => HTMLCanvasElement} canvas - Canvas element or function returning canvas
 * @param {Object} [opts] - Options
 * @param {Function} [opts.onSnapshot] - Callback to trigger render before snapshot
 * @param {string} [opts.filename] - Filename for download (default: 'snapshot-{timestamp}.png')
 * @param {string} [opts.format='image/png'] - Image format
 * @param {number} [opts.quality=0.95] - Image quality for jpeg (0-1)
 * @returns {Object} Button configuration for expandable
 */
export function createSnapshotButton(canvas, opts = {}) {
  const {
    onSnapshot,
    filename,
    format = 'image/png',
    quality = 0.95
  } = opts;

  return {
    icon: '📷',
    title: 'Download snapshot',
    onClick: (content, expanded) => {
      // Get canvas (may be a function)
      const canvasEl = typeof canvas === 'function' ? canvas() : canvas;
      
      if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) {
        console.error('Snapshot: invalid canvas element');
        return;
      }

      // Trigger render if callback provided
      if (onSnapshot) {
        onSnapshot();
      }

      // Wait a frame for render to complete, then capture
      requestAnimationFrame(() => {
        try {
          const dataURL = canvasEl.toDataURL(format, quality);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const fname = filename || `snapshot-${timestamp}.png`;
          downloadURI(dataURL, fname);
        } catch (err) {
          console.error('Snapshot failed:', err);
        }
      });
    }
  };
}

/**
 * Create a snapshot button that uses camera.capture() method
 * @param {Object} camera - Camera with 'capture' method that returns Promise<base64 data URL>
 * @param {Object} [opts] - Options
 * @param {string} [opts.filename] - Filename for download (default: 'snapshot-{timestamp}.png')
 * @returns {Object} Button configuration for expandable
 */
export function createCameraSnapshotButton(camera, opts = {}) {
  const { filename } = opts;

  return {
    icon: '📷',
    title: 'Download snapshot',
    onClick: async (content, expanded) => {
      if (!camera.capture) {
        console.error('Snapshot: camera does not have a capture() method');
        return;
      }

      try {
        const dataURL = await camera.capture();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const fname = filename || `snapshot-${timestamp}.png`;
        downloadURI(dataURL, fname);
      } catch (err) {
        console.error('Snapshot failed:', err);
      }
    }
  };
}
