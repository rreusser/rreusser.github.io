/**
 * Shared camera button configurations for expandable containers.
 *
 * Returns an array of button configs compatible with the expandable() API.
 * Includes a camera mode toggle (orbit/arcball) and a snapshot download button.
 *
 * @param {Object} opts
 * @param {Object} opts.camera - Unified camera instance (from createUnifiedCamera)
 * @param {HTMLCanvasElement} opts.canvas - Canvas element to capture for snapshots
 * @param {string} [opts.filename='snapshot.png'] - Download filename for snapshots
 * @param {Function} [opts.getContainer] - Returns the expandable container element (for icon updates)
 * @returns {Array<Object>} Button configs for expandable()
 */

import { ICON_ORBIT, ICON_ARCBALL, ICON_CAMERA } from './expandable.js';

export function cameraButtons({ camera, canvas, filename = 'snapshot.png', getContainer }) {
  return [
    {
      icon: camera.getMode() === 'orbit' ? ICON_ORBIT : ICON_ARCBALL,
      title: 'Toggle camera mode (orbit/arcball)',
      onClick: () => {
        const currentMode = camera.getMode();
        const newMode = currentMode === 'orbit' ? 'arcball' : 'orbit';
        camera.setMode(newMode);
        camera.triggerRepaint();
        const container = getContainer && getContainer();
        if (container) {
          const btn = container.querySelector('[title="Toggle camera mode (orbit/arcball)"]');
          if (btn) btn.innerHTML = newMode === 'orbit' ? ICON_ORBIT : ICON_ARCBALL;
        }
      }
    },
    {
      icon: ICON_CAMERA,
      title: 'Download snapshot',
      onClick: async () => {
        const rendered = camera.once('render');
        camera.triggerRepaint();
        await rendered;

        const dataUrl = canvas.toDataURL();
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
      }
    }
  ];
}
