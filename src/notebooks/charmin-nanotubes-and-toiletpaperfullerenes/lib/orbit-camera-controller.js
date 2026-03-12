// Orbit camera controller for interactive 3D views
// Uses quaternion-based rotation via OrbitCamera
//
// Features:
// - Drag to rotate
// - Shift+drag or right-click drag to pan
// - Scroll wheel to zoom (with point-under-cursor stabilization)
// - Touch support: single finger rotate, two finger pinch zoom + pan
//
// Note: Matrix math is inlined to avoid npm: import dependencies
// which don't work in lib/ modules (only in notebook cells).

/**
 * Create an orbit camera controller with quaternion rotation
 *
 * @param {HTMLElement} element - Element to attach mouse/touch listeners to
 * @param {Object} camera - OrbitCamera instance
 * @param {Object} opts - Options
 * @param {number} [opts.fov=Math.PI/4] - Field of view in radians
 * @param {number} [opts.near=0.1] - Near clipping plane
 * @param {number} [opts.far=1000] - Far clipping plane
 * @param {number} [opts.rotateSpeed=1] - Rotation sensitivity
 * @param {number} [opts.zoomSpeed=0.001] - Zoom sensitivity
 * @param {number} [opts.panSpeed=1] - Pan sensitivity
 * @param {boolean} [opts.deferEvents=false] - If true, don't attach events until attachEvents() is called
 * @returns {Object} Controller with update method and state
 */
export function createOrbitCameraController(element, camera, opts = {}) {
  const fov = opts.fov || Math.PI / 4;
  const near = opts.near || 0.1;
  const far = opts.far || 1000;
  const rotateSpeed = opts.rotateSpeed || 1;
  const zoomSpeed = opts.zoomSpeed || 0.001;
  const panSpeed = opts.panSpeed || 1;
  const deferEvents = opts.deferEvents || false;

  // Pre-allocate matrices
  const _view = new Float32Array(16);
  const _proj = new Float32Array(16);
  const _projView = new Float32Array(16);

  let dirty = true;

  // Mouse state
  let isDragging = false;
  let dragMode = null; // 'rotate' or 'pan'
  let lastX = 0, lastY = 0;
  // For rotation, track normalized positions
  let prevNormX = 0, prevNormY = 0;
  // Dead zone for distinguishing clicks from drags
  let initialX = 0, initialY = 0;
  let exitedDeadZone = false;
  const deadZoneRadius = 5;

  // Touch state
  let lastTouchDist = 0;
  let lastTouchCenterX = 0;
  let lastTouchCenterY = 0;
  let touchDragMode = null; // 'rotate' or 'pinch'

  function computeProjection(aspectRatio) {
    // Perspective projection matrix
    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1 / (near - far);
    _proj[0] = f / aspectRatio; _proj[1] = 0; _proj[2] = 0; _proj[3] = 0;
    _proj[4] = 0; _proj[5] = f; _proj[6] = 0; _proj[7] = 0;
    _proj[8] = 0; _proj[9] = 0; _proj[10] = (near + far) * rangeInv; _proj[11] = -1;
    _proj[12] = 0; _proj[13] = 0; _proj[14] = near * far * rangeInv * 2; _proj[15] = 0;
  }

  function computeMatrices(aspectRatio) {
    // Get view matrix from OrbitCamera
    camera.view(_view);

    // Compute projection
    computeProjection(aspectRatio);

    // Multiply proj * view
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += _proj[i + k * 4] * _view[k + j * 4];
        }
        _projView[i + j * 4] = sum;
      }
    }
  }

  function onMouseDown(event) {
    // Don't capture if target is an interactive element
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.tagName === 'SELECT') {
      return;
    }

    // Don't preventDefault here - allow clicks to focus/blur elements naturally
    // We'll preventDefault in onMouseMove once we know it's a drag
    initialX = event.clientX;
    initialY = event.clientY;
    lastX = event.clientX;
    lastY = event.clientY;
    exitedDeadZone = false;

    const rect = element.getBoundingClientRect();
    // Normalize both by height for consistent rotation speed regardless of aspect ratio
    prevNormX = (event.clientX - rect.left - rect.width / 2) / rect.height;
    prevNormY = (event.clientY - rect.top - rect.height / 2) / rect.height;

    dragMode = (event.shiftKey || event.button === 2) ? 'pan' : 'rotate';
    isDragging = true;
    // Cursor managed by mesh-interactions

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(event) {
    if (!isDragging) return;

    // Check dead zone
    if (!exitedDeadZone) {
      const distX = event.clientX - initialX;
      const distY = event.clientY - initialY;
      if (Math.sqrt(distX * distX + distY * distY) < deadZoneRadius) {
        return; // Still in dead zone, don't rotate yet
      }
      exitedDeadZone = true;
      // Now we know it's a drag, prevent text selection etc.
      event.preventDefault();
    }

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;

    if (dragMode === 'rotate') {
      const rect = element.getBoundingClientRect();
      // Normalize both by height for consistent rotation speed regardless of aspect ratio
      const normX = (event.clientX - rect.left - rect.width / 2) / rect.height;
      const normY = (event.clientY - rect.top - rect.height / 2) / rect.height;

      camera.rotate(
        [-prevNormX * rotateSpeed, -prevNormY * rotateSpeed],
        [-normX * rotateSpeed, -normY * rotateSpeed]
      );

      prevNormX = normX;
      prevNormY = normY;
    } else if (dragMode === 'pan') {
      const rect = element.getBoundingClientRect();
      camera.pan([dx / rect.height * panSpeed, dy / rect.height * panSpeed]);
    }

    dirty = true;
  }

  function onMouseUp() {
    isDragging = false;
    dragMode = null;
    // Cursor managed by mesh-interactions
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  function onWheel(event) {
    event.preventDefault();

    // Get mouse position relative to element center, normalized by height
    const rect = element.getBoundingClientRect();
    const mx = (event.clientX - rect.left - rect.width / 2) / rect.height;
    const my = (event.clientY - rect.top - rect.height / 2) / rect.height;

    // Calculate zoom
    const oldDistance = camera.distance;
    camera.zoom(event.deltaY * zoomSpeed * 30); // Scale to match OrbitCamera's zoom
    const actualZoomFactor = camera.distance / oldDistance;

    // Pan to keep point under mouse stationary
    const panAmount = 1 - actualZoomFactor;
    camera.pan([-mx * panAmount * panSpeed, -my * panAmount * panSpeed]);

    dirty = true;
  }

  function onTouchStart(event) {
    // Don't prevent default for single touch - allow vertex interaction to handle it
    if (event.touches.length === 1) {
      touchDragMode = 'rotate';
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;
      const rect = element.getBoundingClientRect();
      // Normalize both by height for consistent rotation speed regardless of aspect ratio
      prevNormX = (event.touches[0].clientX - rect.left - rect.width / 2) / rect.height;
      prevNormY = (event.touches[0].clientY - rect.top - rect.height / 2) / rect.height;
    } else if (event.touches.length === 2) {
      event.preventDefault();
      touchDragMode = 'pinch';
      const dx = event.touches[1].clientX - event.touches[0].clientX;
      const dy = event.touches[1].clientY - event.touches[0].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenterX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      lastTouchCenterY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
    }
  }

  function onTouchMove(event) {
    if (event.touches.length === 1 && touchDragMode === 'rotate') {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      // Normalize both by height for consistent rotation speed regardless of aspect ratio
      const normX = (event.touches[0].clientX - rect.left - rect.width / 2) / rect.height;
      const normY = (event.touches[0].clientY - rect.top - rect.height / 2) / rect.height;

      camera.rotate(
        [-prevNormX * rotateSpeed, -prevNormY * rotateSpeed],
        [-normX * rotateSpeed, -normY * rotateSpeed]
      );

      prevNormX = normX;
      prevNormY = normY;
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;
      dirty = true;
    } else if (event.touches.length === 2 && touchDragMode === 'pinch') {
      event.preventDefault();

      // Calculate distance for pinch zoom
      const dx = event.touches[1].clientX - event.touches[0].clientX;
      const dy = event.touches[1].clientY - event.touches[0].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Calculate center for pan
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

      if (lastTouchDist > 0) {
        // Pinch zoom - use ratio for more natural feel
        const scale = lastTouchDist / dist;
        const zoomDelta = (scale - 1) * 30;
        camera.zoom(zoomDelta);

        // Two-finger pan
        const rect = element.getBoundingClientRect();
        const panDx = (centerX - lastTouchCenterX) / rect.height * panSpeed;
        const panDy = (centerY - lastTouchCenterY) / rect.height * panSpeed;
        camera.pan([panDx, panDy]);

        dirty = true;
      }
      lastTouchDist = dist;
      lastTouchCenterX = centerX;
      lastTouchCenterY = centerY;
    }
  }

  function onTouchEnd(event) {
    if (event.touches.length === 0) {
      touchDragMode = null;
      lastTouchDist = 0;
    } else if (event.touches.length === 1) {
      // Transitioned from 2 fingers to 1
      touchDragMode = 'rotate';
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;
      const rect = element.getBoundingClientRect();
      // Normalize both by height for consistent rotation speed regardless of aspect ratio
      prevNormX = (event.touches[0].clientX - rect.left - rect.width / 2) / rect.height;
      prevNormY = (event.touches[0].clientY - rect.top - rect.height / 2) / rect.height;
      lastTouchDist = 0;
    }
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  let eventsAttached = false;

  function attachEvents() {
    if (eventsAttached) return;
    eventsAttached = true;
    // Cursor managed by mesh-interactions
    element.addEventListener('mousedown', onMouseDown);
    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('touchstart', onTouchStart, { passive: false });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd);
    element.addEventListener('contextmenu', onContextMenu);
  }

  // Setup - attach events immediately unless deferred
  if (!deferEvents) {
    attachEvents();
  }

  function destroy() {
    element.removeEventListener('mousedown', onMouseDown);
    element.removeEventListener('wheel', onWheel);
    element.removeEventListener('touchstart', onTouchStart);
    element.removeEventListener('touchmove', onTouchMove);
    element.removeEventListener('touchend', onTouchEnd);
    element.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  return {
    attachEvents,
    camera,
    projectionView: _projView,

    get dirty() {
      return dirty;
    },

    taint() {
      dirty = true;
    },

    /**
     * Update matrices for current frame
     * @param {number} aspectRatio - Canvas width / height
     * @returns {Object} Object with view, projection, projectionView matrices and dirty flag
     */
    update(aspectRatio) {
      computeMatrices(aspectRatio);

      const wasDirty = dirty;
      dirty = false;

      return {
        view: _view,
        projection: _proj,
        projectionView: _projView,
        dirty: wasDirty
      };
    },

    destroy
  };
}

export default createOrbitCameraController;
