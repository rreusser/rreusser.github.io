/**
 * Unified Camera Controller
 * 
 * Supports two camera modes with seamless switching:
 * - Orbit: Spherical coordinates, maintains upright orientation
 * - Arcball: Quaternion trackball, free rotation
 * 
 * All modes support:
 * - Drag: Orbit/rotate around focal point
 * - Shift+Drag / Right-drag: Pan focal point
 * - Cmd/Ctrl+Drag: Pivot (rotate around eye)
 * - Wheel: Zoom
 */

import * as quat from './quaternion.js';

/**
 * Create unified camera controller
 * 
 * @param {HTMLElement} element - Element to attach event listeners to
 * @param {Object} opts - Options
 * @param {string} [opts.mode='orbit'] - Camera mode: 'orbit' or 'arcball'
 * @param {number[]} [opts.center=[0,0,0]] - Focal point
 * @param {number} [opts.distance=10] - Distance from focal point
 * @param {number} [opts.phi=0] - Azimuthal angle (orbit mode)
 * @param {number} [opts.theta=0.3] - Polar angle (orbit mode)
 * @param {number[]} [opts.orientation=[0,0,0,1]] - Quaternion (arcball mode)
 * @param {number} [opts.fov=Math.PI/4] - Field of view
 * @param {number} [opts.near=0.1] - Near clipping plane
 * @param {number} [opts.far=1000] - Far clipping plane
 * @param {number} [opts.rotateSpeed=1.0] - Rotation sensitivity
 * @param {number} [opts.zoomSpeed=0.001] - Zoom sensitivity
 * @param {number} [opts.panSpeed=1.0] - Pan sensitivity
 * @param {number} [opts.pivotSpeed=1.0] - Pivot sensitivity
 * @param {boolean} [opts.drag=true] - Enable drag interactions
 * @param {boolean} [opts.wheel=true] - Enable wheel zoom
 * @param {boolean} [opts.touch=true] - Enable touch interactions
 * @param {boolean} [opts.deferEvents=false] - Don't attach events immediately (call attachEvents() later)
 * @param {Function} [opts.onCapture] - Callback to render frame for capture: (camera) => void
 * @param {HTMLCanvasElement|Function} [opts.canvas] - Canvas element or function returning canvas for capture
 */
export function createUnifiedCamera(element, opts = {}) {
  const state = {
    mode: opts.mode || 'orbit',
    center: opts.center ? [...opts.center] : [0, 0, 0],
    distance: opts.distance !== undefined ? opts.distance : 10,
    fov: opts.fov !== undefined ? opts.fov : Math.PI / 4,
    near: opts.near !== undefined ? opts.near : 0.1,
    far: opts.far !== undefined ? opts.far : 1000,
    
    // Orbit mode state
    phi: opts.phi !== undefined ? opts.phi : 0,
    theta: opts.theta !== undefined ? opts.theta : 0.3,
    
    // Arcball mode state
    orientation: opts.orientation ? [...opts.orientation] : [0, 0, 0, 1],
  };

  const speeds = {
    rotate: opts.rotateSpeed !== undefined ? opts.rotateSpeed : 1.0,
    zoom: opts.zoomSpeed !== undefined ? opts.zoomSpeed : 0.001,
    pan: opts.panSpeed !== undefined ? opts.panSpeed : 1.0,
    pivot: opts.pivotSpeed !== undefined ? opts.pivotSpeed : 1.0,
  };

  const config = {
    drag: opts.drag !== undefined ? opts.drag : true,
    wheel: opts.wheel !== undefined ? opts.wheel : true,
    touch: opts.touch !== undefined ? opts.touch : true,
    renderContinuously: opts.renderContinuously !== undefined ? opts.renderContinuously : false,
    observeResize: opts.observeResize !== undefined ? opts.observeResize : true,
  };

  const onCaptureCallback = opts.onCapture;
  const canvasGetter = opts.canvas;

  // Event listeners
  const listeners = {
    render: [],
    capture: [],  // Fired when capture is requested
  };
  
  // One-time event listeners
  const onceListeners = {
    render: [],
    capture: [],
  };

  // Pre-allocate matrices
  const _view = new Float32Array(16);
  const _proj = new Float32Array(16);
  const _projView = new Float32Array(16);
  const _eye = new Float32Array(3);

  let dirty = true;
  let lastAspectRatio = null;
  let eventsAttached = false;

  // Mouse/touch state
  let isDragging = false;
  let dragMode = null; // 'orbit' | 'pan' | 'pivot' | 'zoom'
  let lastX = 0, lastY = 0;

  // ResizeObserver for canvas size tracking
  let resizeObserver = null;
  let dragStartX = 0, dragStartY = 0;
  
  // For arcball
  let prevNormX = 0, prevNormY = 0;

  // For zoom-drag: store the target point at drag start
  let zoomTargetPoint = null;

  // Touch state
  let lastTouchDist = 0;
  let lastTouchCenterX = 0;
  let lastTouchCenterY = 0;

  // Mode-specific backends
  const markDirty = () => {
    dirty = true;
    emitRender();
  };
  
  const backends = {
    orbit: createOrbitBackend(state, speeds, markDirty),
    arcball: createArcballBackend(state, speeds, markDirty),
  };

  /**
   * Update matrices and return camera state
   */
  function update(aspectRatio) {
    // Check if aspect ratio changed
    if (lastAspectRatio !== aspectRatio) {
      dirty = true;
      lastAspectRatio = aspectRatio;
    }

    const wasDirty = dirty;
    if (dirty) {
      backends[state.mode].computeMatrices(aspectRatio, _view, _proj, _projView, _eye);
      dirty = false;
    }
    return {
      view: _view,
      projection: _proj,
      projView: _projView,
      projectionView: _projView, // Alias for compatibility
      eye: _eye,
      dirty: wasDirty,
    };
  }

  /**
   * Mark camera as dirty (needs update)
   */
  function taint() {
    dirty = true;
    emitRender();
  }

  /**
   * Event emitter methods
   */
  function on(event, callback) {
    if (listeners[event]) {
      listeners[event].push(callback);
    }
  }

  function once(event, callback) {
    if (!onceListeners[event]) return;
    
    // If no callback, return a promise
    if (!callback) {
      return new Promise(resolve => {
        onceListeners[event].push(resolve);
      });
    }
    
    // Otherwise, add callback to listeners
    onceListeners[event].push(callback);
  }

  function off(event, callback) {
    if (listeners[event]) {
      const index = listeners[event].indexOf(callback);
      if (index > -1) {
        listeners[event].splice(index, 1);
      }
    }
  }

  function emitRender() {
    if (config.renderContinuously) return; // Don't emit if rendering continuously
    
    // Call regular listeners
    listeners.render.forEach(cb => cb());
    
    // Call and clear one-time listeners
    const once = onceListeners.render.slice();
    onceListeners.render = [];
    once.forEach(cb => cb());
  }

  function triggerRepaint() {
    markDirty();
  }

  /**
   * Determine drag mode from event modifiers
   */
  function getDragMode(event) {
    if (event.altKey) return 'zoom';
    if (event.metaKey || event.ctrlKey) return 'pivot';
    if (event.shiftKey || event.button === 2) return 'pan';
    return 'orbit';
  }

  /**
   * Mouse down handler
   */
  function onMouseDown(event) {
    // Don't capture if target is an interactive element
    if (['INPUT', 'BUTTON', 'SELECT'].includes(event.target.tagName)) {
      return;
    }

    dragMode = getDragMode(event);
    isDragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    dragStartX = event.clientX;
    dragStartY = event.clientY;

    // For arcball, store normalized coordinates
    if (state.mode === 'arcball' && dragMode === 'orbit') {
      const rect = element.getBoundingClientRect();
      prevNormX = (2 * (event.clientX - rect.left) / rect.width) - 1;
      prevNormY = 1 - (2 * (event.clientY - rect.top) / rect.height);
    }

    // For zoom drag, compute and store the target point at drag start
    if (dragMode === 'zoom') {
      zoomTargetPoint = computeZoomTargetPoint(event.clientX, event.clientY, element);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    event.preventDefault();
  }

  /**
   * Mouse move handler
   */
  function onMouseMove(event) {
    if (!isDragging) return;

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;

    if (dragMode === 'orbit') {
      backends[state.mode].rotate(dx, dy, element, event);
    } else if (dragMode === 'pan') {
      pan(dx, dy, element);
    } else if (dragMode === 'pivot') {
      pivot(dx, dy, element, event.clientX, event.clientY);
    } else if (dragMode === 'zoom') {
      // Zoom about the initial drag position (stored target point)
      // Negate dy to flip direction: drag down = zoom in (negative delta)
      // Multiply by 3 to make it faster
      zoomAboutPoint(-dy * 3, zoomTargetPoint);
    }

    lastX = event.clientX;
    lastY = event.clientY;
    markDirty();
    event.preventDefault();
  }

  /**
   * Mouse up handler
   */
  function onMouseUp(event) {
    isDragging = false;
    dragMode = null;
    zoomTargetPoint = null; // Clear zoom target
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  /**
   * Mouse wheel handler - zoom about cursor position
   */
  function onWheel(event) {
    const delta = event.deltaY;
    zoomAboutCursor(delta, event.clientX, event.clientY, element);
    markDirty();
    event.preventDefault();
  }

  /**
   * Context menu handler (prevent right-click menu)
   */
  function onContextMenu(event) {
    event.preventDefault();
  }

  /**
   * Touch start handler
   */
  function onTouchStart(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
      // Single finger - rotate
      isDragging = true;
      dragMode = 'orbit';
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;
    } else if (event.touches.length === 2) {
      // Two fingers - prepare for pinch zoom and pan
      const dx = event.touches[1].clientX - event.touches[0].clientX;
      const dy = event.touches[1].clientY - event.touches[0].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenterX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      lastTouchCenterY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
    }
  }

  /**
   * Touch move handler
   */
  function onTouchMove(event) {
    event.preventDefault();

    if (event.touches.length === 1 && isDragging && dragMode === 'orbit') {
      // Single finger rotate
      const dx = event.touches[0].clientX - lastX;
      const dy = event.touches[0].clientY - lastY;
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;

      backends[state.mode].rotate(dx, dy, element, event.touches[0]);
      markDirty();
    } else if (event.touches.length === 2) {
      // Two finger pinch zoom + pan
      const dx = event.touches[1].clientX - event.touches[0].clientX;
      const dy = event.touches[1].clientY - event.touches[0].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

      if (lastTouchDist > 0) {
        // Pinch zoom
        const scale = lastTouchDist / dist;
        const zoomDelta = (scale - 1) / speeds.zoom;
        zoom(zoomDelta);

        // Two-finger pan
        const rect = element.getBoundingClientRect();
        const panDx = centerX - lastTouchCenterX;
        const panDy = centerY - lastTouchCenterY;
        pan(panDx, panDy, element);

        markDirty();
      }
      lastTouchDist = dist;
      lastTouchCenterX = centerX;
      lastTouchCenterY = centerY;
    }
  }

  /**
   * Touch end handler
   */
  function onTouchEnd(event) {
    isDragging = false;
    dragMode = null;
    lastTouchDist = 0;
  }

  /**
   * Pan focal point in view plane
   */
  function pan(dx, dy, targetElement) {
    backends[state.mode].pan(dx, dy, targetElement);
    markDirty();
  }

  /**
   * Pivot view around eye position
   */
  function pivot(dx, dy, targetElement, clientX, clientY) {
    backends[state.mode].pivot(dx, dy, targetElement || element, clientX, clientY);
    markDirty();
  }

  /**
   * Zoom (dolly in/out)
   */
  function zoom(delta) {
    const factor = 1 + delta * speeds.zoom;
    state.distance = Math.max(0.01, state.distance * factor);
    markDirty();
  }

  /**
   * Compute the 3D target point for zoom operations
   * Returns the point in 3D space along the ray through the cursor
   */
  function computeZoomTargetPoint(clientX, clientY, targetElement) {
    const rect = targetElement.getBoundingClientRect();
    
    // Normalize cursor position to [-1, 1] in viewport
    const nx = (2 * (clientX - rect.left) / rect.width) - 1;
    const ny = 1 - (2 * (clientY - rect.top) / rect.height);

    // Get camera vectors
    let eye, right, up, forward;
    
    if (state.mode === 'orbit') {
      // Compute camera position and vectors from spherical coords
      const eyeX = state.center[0] + state.distance * Math.cos(state.theta) * Math.cos(state.phi);
      const eyeY = state.center[1] + state.distance * Math.sin(state.theta);
      const eyeZ = state.center[2] + state.distance * Math.cos(state.theta) * Math.sin(state.phi);
      eye = [eyeX, eyeY, eyeZ];

      // Forward (normalized)
      let fwdX = state.center[0] - eyeX, fwdY = state.center[1] - eyeY, fwdZ = state.center[2] - eyeZ;
      const fwdLen = Math.sqrt(fwdX*fwdX + fwdY*fwdY + fwdZ*fwdZ);
      forward = [fwdX / fwdLen, fwdY / fwdLen, fwdZ / fwdLen];

      // Right
      let rightX = fwdY * 0 - fwdZ * 1;
      let rightY = fwdZ * 0 - fwdX * 0;
      let rightZ = fwdX * 1 - fwdY * 0;
      const rLen = Math.sqrt(rightX*rightX + rightY*rightY + rightZ*rightZ);
      right = [rightX / rLen, rightY / rLen, rightZ / rLen];

      // Up
      up = [
        right[1] * forward[2] - right[2] * forward[1],
        right[2] * forward[0] - right[0] * forward[2],
        right[0] * forward[1] - right[1] * forward[0],
      ];
    } else {
      // Arcball mode - get vectors from quaternion
      forward = quat.getForwardVector(state.orientation);
      eye = [
        state.center[0] - forward[0] * state.distance,
        state.center[1] - forward[1] * state.distance,
        state.center[2] - forward[2] * state.distance,
      ];
      right = quat.getRightVector(state.orientation);
      up = quat.getUpVector(state.orientation);
    }

    // Compute ray direction through cursor in view space
    const aspectRatio = rect.width / rect.height;
    const tanHalfFov = Math.tan(state.fov / 2);
    
    // Ray direction in view space
    const rayDir = [
      forward[0] + right[0] * nx * aspectRatio * tanHalfFov + up[0] * ny * tanHalfFov,
      forward[1] + right[1] * nx * aspectRatio * tanHalfFov + up[1] * ny * tanHalfFov,
      forward[2] + right[2] * nx * aspectRatio * tanHalfFov + up[2] * ny * tanHalfFov,
    ];
    
    // Normalize ray direction
    const rayLen = Math.sqrt(rayDir[0]*rayDir[0] + rayDir[1]*rayDir[1] + rayDir[2]*rayDir[2]);
    rayDir[0] /= rayLen;
    rayDir[1] /= rayLen;
    rayDir[2] /= rayLen;

    // Return point on ray at current focal distance and the ray direction
    return {
      point: [
        eye[0] + rayDir[0] * state.distance,
        eye[1] + rayDir[1] * state.distance,
        eye[2] + rayDir[2] * state.distance,
      ],
      rayDir: rayDir,
      eye: eye,
      forward: forward,
    };
  }

  /**
   * Zoom about a fixed 3D point (computed at drag start)
   */
  function zoomAboutPoint(delta, targetData) {
    if (!targetData) return;

    const { point: targetPoint, rayDir, forward } = targetData;

    // Apply zoom
    const factor = 1 + delta * speeds.zoom;
    const newDistance = Math.max(0.01, state.distance * factor);

    // Move eye along ray to new distance from target point
    const newEye = [
      targetPoint[0] - rayDir[0] * newDistance,
      targetPoint[1] - rayDir[1] * newDistance,
      targetPoint[2] - rayDir[2] * newDistance,
    ];

    // Update center (new center is newEye + forward * newDistance)
    state.center[0] = newEye[0] + forward[0] * newDistance;
    state.center[1] = newEye[1] + forward[1] * newDistance;
    state.center[2] = newEye[2] + forward[2] * newDistance;
    state.distance = newDistance;

    markDirty();
  }

  /**
   * Zoom about cursor position
   * Moves eye along view direction while keeping point under cursor fixed
   */
  function zoomAboutCursor(delta, clientX, clientY, targetElement) {
    const targetData = computeZoomTargetPoint(clientX, clientY, targetElement);
    zoomAboutPoint(delta, targetData);
  }



  /**
   * Switch camera mode
   */
  function setMode(newMode) {
    if (newMode === state.mode) return;
    if (!backends[newMode]) {
      console.warn(`Unknown camera mode: ${newMode}`);
      return;
    }

    // Convert state from current mode to new mode
    convertState(state, state.mode, newMode);
    state.mode = newMode;
    markDirty();
  }

  /**
   * Get current camera mode
   */
  function getMode() {
    return state.mode;
  }

  /**
   * Get camera state
   */
  function getState() {
    return { ...state };
  }

  /**
   * Set camera state
   */
  function setState(newState) {
    Object.assign(state, newState);
    markDirty();
  }

  /**
   * Attach event listeners
   */
  function attachEvents() {
    if (eventsAttached) return;
    
    if (config.drag) {
      element.addEventListener('mousedown', onMouseDown);
      element.addEventListener('contextmenu', onContextMenu);
    }
    if (config.wheel) {
      element.addEventListener('wheel', onWheel, { passive: false });
    }
    if (config.touch) {
      element.addEventListener('touchstart', onTouchStart, { passive: false });
      element.addEventListener('touchmove', onTouchMove, { passive: false });
      element.addEventListener('touchend', onTouchEnd);
    }
    
    eventsAttached = true;
  }

  /**
   * Detach event listeners
   */
  function destroy() {
    if (config.drag) {
      element.removeEventListener('mousedown', onMouseDown);
      element.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    if (config.wheel) {
      element.removeEventListener('wheel', onWheel);
    }
    if (config.touch) {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    
    eventsAttached = false;
  }

  /**
   * Capture canvas content as base64 data URL
   * Emits 'capture' event - listeners should render and ensure work is complete
   * @param {Object} [opts] - Capture options
   * @param {string} [opts.format='image/png'] - Image format
   * @param {number} [opts.quality=0.95] - Image quality (0-1)
   * @returns {Promise<string>} Promise resolving to base64 data URL
   */
  async function capture(opts = {}) {
    const { format = 'image/png', quality = 0.95 } = opts;
    
    // Get canvas
    const canvasEl = typeof canvasGetter === 'function' ? canvasGetter() : canvasGetter;
    
    if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) {
      throw new Error('Camera capture: no canvas configured or invalid canvas element');
    }

    // Emit capture event - listeners should render and wait for completion
    const capturePromises = [];
    listeners.capture.forEach(cb => {
      const result = cb();
      if (result && typeof result.then === 'function') {
        capturePromises.push(result);
      }
    });
    onceListeners.capture.forEach(cb => {
      const result = cb();
      if (result && typeof result.then === 'function') {
        capturePromises.push(result);
      }
    });
    onceListeners.capture = [];

    // Wait for all capture handlers to complete
    if (capturePromises.length > 0) {
      await Promise.all(capturePromises);
    }

    // Now capture the canvas
    return canvasEl.toDataURL(format, quality);
  }

  // Set up ResizeObserver for canvas if it's a canvas element
  if (config.observeResize && element instanceof HTMLCanvasElement) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect;
        const newWidth = Math.floor(rect.width * devicePixelRatio);
        const newHeight = Math.floor(rect.height * devicePixelRatio);
        
        // Only update if size is valid and changed
        if (newWidth > 0 && newHeight > 0 && (newWidth !== element.width || newHeight !== element.height)) {
          element.width = newWidth;
          element.height = newHeight;
          markDirty();
          emitRender();
        }
      }
    });
    resizeObserver.observe(element);
  }

  // Attach events unless deferred
  if (!opts.deferEvents) {
    attachEvents();
  }

  return {
    update,
    setMode,
    getMode,
    getState,
    setState,
    taint,
    pan,
    pivot,
    zoom,
    zoomAboutCursor,
    attachEvents,
    destroy,
    on,
    once,
    off,
    triggerRepaint,
    capture,
    
    // Compatibility properties
    get state() { return state; },
    get dirty() { return dirty; },
  };
}

/**
 * Create Orbit backend (spherical coordinates)
 */
function createOrbitBackend(state, speeds, markDirty) {
  function computeMatrices(aspectRatio, view, proj, projView, eye) {
    const { phi, theta, distance, center, fov, near, far } = state;

    // Camera position in spherical coordinates
    const x = center[0] + distance * Math.cos(theta) * Math.cos(phi);
    const y = center[1] + distance * Math.sin(theta);
    const z = center[2] + distance * Math.cos(theta) * Math.sin(phi);
    
    // Store eye position
    eye[0] = x;
    eye[1] = y;
    eye[2] = z;

    // View matrix (lookAt)
    let fwdX = center[0] - x, fwdY = center[1] - y, fwdZ = center[2] - z;
    const fwdLen = Math.sqrt(fwdX*fwdX + fwdY*fwdY + fwdZ*fwdZ);
    fwdX /= fwdLen; fwdY /= fwdLen; fwdZ /= fwdLen;

    // right = forward × up (up = [0,1,0])
    let rightX = fwdY * 0 - fwdZ * 1;
    let rightY = fwdZ * 0 - fwdX * 0;
    let rightZ = fwdX * 1 - fwdY * 0;
    const rLen = Math.sqrt(rightX*rightX + rightY*rightY + rightZ*rightZ);
    if (rLen > 0.0001) {
      rightX /= rLen; rightY /= rLen; rightZ /= rLen;
    }

    // newUp = right × forward
    const upX = rightY * fwdZ - rightZ * fwdY;
    const upY = rightZ * fwdX - rightX * fwdZ;
    const upZ = rightX * fwdY - rightY * fwdX;

    // View matrix
    view[0] = rightX; view[1] = upX; view[2] = -fwdX; view[3] = 0;
    view[4] = rightY; view[5] = upY; view[6] = -fwdY; view[7] = 0;
    view[8] = rightZ; view[9] = upZ; view[10] = -fwdZ; view[11] = 0;
    view[12] = -(rightX*x + rightY*y + rightZ*z);
    view[13] = -(upX*x + upY*y + upZ*z);
    view[14] = -(-fwdX*x + -fwdY*y + -fwdZ*z);
    view[15] = 1;

    // Projection matrix (perspective) - WebGPU NDC: x,y ∈ [-1,1], z ∈ [0,1]
    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1 / (near - far);
    proj[0] = f / aspectRatio; proj[1] = 0; proj[2] = 0; proj[3] = 0;
    proj[4] = 0; proj[5] = f; proj[6] = 0; proj[7] = 0;
    proj[8] = 0; proj[9] = 0; proj[10] = far * rangeInv; proj[11] = -1;
    proj[12] = 0; proj[13] = 0; proj[14] = near * far * rangeInv; proj[15] = 0;

    // Multiply proj * view
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += proj[i + k * 4] * view[k + j * 4];
        }
        projView[i + j * 4] = sum;
      }
    }
  }

  function rotate(dx, dy) {
    state.phi += dx * speeds.rotate * 0.01;
    state.theta = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, 
      state.theta + dy * speeds.rotate * 0.01));
    markDirty();
  }

  function pan(dx, dy, element) {
    // Get current eye position
    const eyeX = state.center[0] + state.distance * Math.cos(state.theta) * Math.cos(state.phi);
    const eyeY = state.center[1] + state.distance * Math.sin(state.theta);
    const eyeZ = state.center[2] + state.distance * Math.cos(state.theta) * Math.sin(state.phi);

    // Get view direction and up vector
    let fwdX = state.center[0] - eyeX;
    let fwdY = state.center[1] - eyeY;
    let fwdZ = state.center[2] - eyeZ;
    const fwdLen = Math.sqrt(fwdX*fwdX + fwdY*fwdY + fwdZ*fwdZ);
    fwdX /= fwdLen; fwdY /= fwdLen; fwdZ /= fwdLen;

    // Right vector
    let rightX = fwdY * 0 - fwdZ * 1;
    let rightY = fwdZ * 0 - fwdX * 0;
    let rightZ = fwdX * 1 - fwdY * 0;
    const rLen = Math.sqrt(rightX*rightX + rightY*rightY + rightZ*rightZ);
    rightX /= rLen; rightY /= rLen; rightZ /= rLen;

    // Up vector
    const upX = rightY * fwdZ - rightZ * fwdY;
    const upY = rightZ * fwdX - rightX * fwdZ;
    const upZ = rightX * fwdY - rightY * fwdX;

    // Pan in view plane
    const rect = element.getBoundingClientRect();
    const panScale = speeds.pan * state.distance / rect.height;
    
    // Pan direction: positive dx moves right, positive dy moves down
    // We want to move the center opposite to mouse movement
    state.center[0] += (rightX * -dx + upX * dy) * panScale;
    state.center[1] += (rightY * -dx + upY * dy) * panScale;
    state.center[2] += (rightZ * -dx + upZ * dy) * panScale;
    markDirty();
  }

  function pivot(dx, dy, element, clientX, clientY) {
    // Get current eye position
    const eyeX = state.center[0] + state.distance * Math.cos(state.theta) * Math.cos(state.phi);
    const eyeY = state.center[1] + state.distance * Math.sin(state.theta);
    const eyeZ = state.center[2] + state.distance * Math.cos(state.theta) * Math.sin(state.phi);

    // Compute perspective-corrected angular scale
    // At screen center, angular scale is simply fov / height
    // At screen edges, we need to account for perspective foreshortening
    const rect = element.getBoundingClientRect();
    
    // Normalize cursor position to [-1, 1]
    const nx = (2 * (clientX - rect.left) / rect.width) - 1;
    const ny = 1 - (2 * (clientY - rect.top) / rect.height);
    
    const aspectRatio = rect.width / rect.height;
    const tanHalfFov = Math.tan(state.fov / 2);
    
    // In perspective projection, angular velocity = linear velocity / distance from principal axis
    // For horizontal: at screen position nx, the view ray has angle atan(nx * aspectRatio * tanHalfFov)
    // Derivative: d(angle)/d(nx) = aspectRatio * tanHalfFov / (1 + (nx * aspectRatio * tanHalfFov)^2)
    const txHalfFov = nx * aspectRatio * tanHalfFov;
    const tyHalfFov = ny * tanHalfFov;
    
    // Angular scale = how much angle changes per normalized screen unit
    // Then convert from normalized units to pixels
    const angularScaleX = (aspectRatio * tanHalfFov / (1 + txHalfFov * txHalfFov)) * 2 / rect.width;
    const angularScaleY = (tanHalfFov / (1 + tyHalfFov * tyHalfFov)) * 2 / rect.height;

    // Update spherical angles (negated to match natural rotation direction)
    state.phi -= dx * angularScaleX * speeds.pivot;
    state.theta = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01,
      state.theta - dy * angularScaleY * speeds.pivot));

    // Recompute center to keep eye fixed
    state.center[0] = eyeX - state.distance * Math.cos(state.theta) * Math.cos(state.phi);
    state.center[1] = eyeY - state.distance * Math.sin(state.theta);
    state.center[2] = eyeZ - state.distance * Math.cos(state.theta) * Math.sin(state.phi);
    markDirty();
  }

  return { computeMatrices, rotate, pan, pivot };
}

/**
 * Create Arcball backend (quaternion trackball)
 */
function createArcballBackend(state, speeds, markDirty) {
  function computeMatrices(aspectRatio, view, proj, projView, eye) {
    // Get view matrix from quaternion
    const forward = quat.getForwardVector(state.orientation);
    
    // Compute and store eye position
    eye[0] = state.center[0] - forward[0] * state.distance;
    eye[1] = state.center[1] - forward[1] * state.distance;
    eye[2] = state.center[2] - forward[2] * state.distance;

    const right = quat.getRightVector(state.orientation);
    const up = quat.getUpVector(state.orientation);

    // Build view matrix
    view[0] = right[0]; view[1] = up[0]; view[2] = -forward[0]; view[3] = 0;
    view[4] = right[1]; view[5] = up[1]; view[6] = -forward[1]; view[7] = 0;
    view[8] = right[2]; view[9] = up[2]; view[10] = -forward[2]; view[11] = 0;
    view[12] = -(right[0]*eye[0] + right[1]*eye[1] + right[2]*eye[2]);
    view[13] = -(up[0]*eye[0] + up[1]*eye[1] + up[2]*eye[2]);
    view[14] = -(-forward[0]*eye[0] + -forward[1]*eye[1] + -forward[2]*eye[2]);
    view[15] = 1;

    // Projection matrix - WebGPU NDC: x,y ∈ [-1,1], z ∈ [0,1]
    const f = 1.0 / Math.tan(state.fov / 2);
    const rangeInv = 1 / (state.near - state.far);
    proj[0] = f / aspectRatio; proj[1] = 0; proj[2] = 0; proj[3] = 0;
    proj[4] = 0; proj[5] = f; proj[6] = 0; proj[7] = 0;
    proj[8] = 0; proj[9] = 0; proj[10] = state.far * rangeInv; proj[11] = -1;
    proj[12] = 0; proj[13] = 0; proj[14] = state.near * state.far * rangeInv; proj[15] = 0;

    // Multiply proj * view
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += proj[i + k * 4] * view[k + j * 4];
        }
        projView[i + j * 4] = sum;
      }
    }
  }

  function rotate(dx, dy, element, event) {
    // Arcball rotation - based on Ken Shoemake's algorithm
    const rect = element.getBoundingClientRect();

    // Project mouse positions onto virtual sphere
    // projectToSphere uses a right-handed system (X-right, Y-up, Z-out-of-screen)
    const va = projectToSphere(event.clientX - dx - rect.left, event.clientY - dy - rect.top, rect.width, rect.height);
    const vb = projectToSphere(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);

    // Compute rotation axis (perpendicular to the plane containing va and vb)
    // cross(va, vb) gives an axis such that rotating the camera orientation by
    // a positive angle orbits the camera in the direction opposite to the drag,
    // making the model appear to follow the mouse.
    const axis = cross(va, vb);
    const axisLen = Math.sqrt(axis[0]*axis[0] + axis[1]*axis[1] + axis[2]*axis[2]);
    
    if (axisLen < 0.0001) return; // No rotation needed
    
    // Normalize the axis
    const axisNorm = [axis[0] / axisLen, axis[1] / axisLen, axis[2] / axisLen];

    // Compute rotation angle
    const angle = Math.acos(Math.min(1.0, va[0]*vb[0] + va[1]*vb[1] + va[2]*vb[2])) * speeds.rotate;

    // The axis from the arcball is in the virtual sphere's coordinate system
    // (X-right, Y-up, Z-out-of-screen). We need to transform it to world space
    // so that pre-multiplying the camera orientation (q_new = q_rot * q_old)
    // produces rotation where the model follows the mouse.
    //
    // The screen-to-world mapping that achieves this is:
    //   screen X  →  -right
    //   screen Y  →  -up
    //   screen Z  →  +forward
    // All three axes are negated relative to the naive camera basis mapping.
    // This is because pre-multiplying the camera quaternion (q_new = q_rot * q_old)
    // rotates the camera's own basis vectors, and we need the model to follow
    // the mouse rather than the camera.
    const right = quat.getRightVector(state.orientation);
    const up = quat.getUpVector(state.orientation);
    const forward = quat.getForwardVector(state.orientation);
    
    const worldAxis = [
      -right[0] * axisNorm[0] - up[0] * axisNorm[1] + forward[0] * axisNorm[2],
      -right[1] * axisNorm[0] - up[1] * axisNorm[1] + forward[1] * axisNorm[2],
      -right[2] * axisNorm[0] - up[2] * axisNorm[1] + forward[2] * axisNorm[2]
    ];

    // Create rotation quaternion and apply: q_new = q_rotation * q_old
    // Pre-multiplication applies the rotation in world space, which is correct
    // since we already transformed the axis to world space.
    const rotation = quat.fromAxisAngle(worldAxis, angle);
    state.orientation = quat.normalize(quat.multiply(rotation, state.orientation));
    markDirty();
  }

  function pan(dx, dy, element) {
    const right = quat.getRightVector(state.orientation);
    const up = quat.getUpVector(state.orientation);

    const rect = element.getBoundingClientRect();
    const panScale = speeds.pan * state.distance / rect.height;

    // Pan direction: positive dx moves right, positive dy moves down
    // We want to move the center opposite to mouse movement
    state.center[0] += (right[0] * -dx + up[0] * dy) * panScale;
    state.center[1] += (right[1] * -dx + up[1] * dy) * panScale;
    state.center[2] += (right[2] * -dx + up[2] * dy) * panScale;
    markDirty();
  }

  function pivot(dx, dy, element, event) {
    // Get current eye position
    const forward = quat.getForwardVector(state.orientation);
    const eye = [
      state.center[0] - forward[0] * state.distance,
      state.center[1] - forward[1] * state.distance,
      state.center[2] - forward[2] * state.distance,
    ];

    // Perspective-corrected pivot scaling for 1:1 mouse tracking across entire viewport
    const rect = element.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Normalized device coordinates [-1, 1]
    const ndcX = (2 * mouseX / rect.width) - 1;
    const ndcY = 1 - (2 * mouseY / rect.height);
    
    const tanHalfFov = Math.tan(state.fov / 2);
    const aspectRatio = rect.width / rect.height;
    
    // Perspective correction factor: derivative of atan projection
    // angularScale = (tanHalfFov / (1 + (n * tanHalfFov)^2)) * 2 / screenSize
    const nxTanFov = ndcX * tanHalfFov * aspectRatio;
    const nyTanFov = ndcY * tanHalfFov;
    const correctionX = tanHalfFov * aspectRatio / (1 + nxTanFov * nxTanFov);
    const correctionY = tanHalfFov / (1 + nyTanFov * nyTanFov);
    
    const angularScaleX = (2 * correctionX / rect.width);
    const angularScaleY = (2 * correctionY / rect.height);

    // Create rotation from mouse delta (negated to match natural rotation)
    const right = quat.getRightVector(state.orientation);
    const up = quat.getUpVector(state.orientation);

    const rotX = quat.fromAxisAngle(up, -dx * angularScaleX * speeds.pivot);
    const rotY = quat.fromAxisAngle(right, -dy * angularScaleY * speeds.pivot);
    const rotation = quat.multiply(rotX, rotY);

    // Apply rotation
    state.orientation = quat.normalize(quat.multiply(rotation, state.orientation));

    // Recompute center to keep eye fixed
    const newForward = quat.getForwardVector(state.orientation);
    state.center[0] = eye[0] + newForward[0] * state.distance;
    state.center[1] = eye[1] + newForward[1] * state.distance;
    state.center[2] = eye[2] + newForward[2] * state.distance;
    markDirty();
  }

  return { computeMatrices, rotate, pan, pivot };
}

/**
 * Project screen coordinates onto virtual trackball sphere
 */
function projectToSphere(x, y, width, height) {
  // Normalize to [-1, 1], with Y inverted so that the virtual sphere
  // uses a right-handed coordinate system (X-right, Y-up, Z-out-of-screen)
  const scale = 2.5;
  const nx = ((2 * x / width) - 1) * scale;
  const ny = (1 - (2 * y / height)) * scale;

  // Smooth trackball surface using inverse stereographic-like projection.
  // Near the center (r ≈ 0), this behaves like a sphere: z ≈ 1 - r²/2.
  // Far from center (r → ∞), z decays as 1/r, smoothly transitioning from
  // tilt rotation to twist rotation with no hard boundary or derivative
  // discontinuity. The scale factor above makes the virtual sphere smaller
  // relative to the viewport, increasing rotation speed.
  const r2 = nx * nx + ny * ny;
  const s = 1 / Math.sqrt(1 + r2 * 0.5);
  const len = Math.sqrt(r2 * s * s + s * s);
  return [nx * s / len, ny * s / len, s / len];
}

/**
 * Cross product
 */
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * Convert state between camera modes
 */
function convertState(state, fromMode, toMode) {
  if (fromMode === 'orbit' && toMode === 'arcball') {
    // Orbit → Arcball: Build quaternion from orbit camera's orientation
    const { phi, theta, distance, center } = state;
    
    // VALIDATION: Compute orbit camera's eye position and basis vectors
    const orbitEye = [
      center[0] + distance * Math.cos(theta) * Math.cos(phi),
      center[1] + distance * Math.sin(theta),
      center[2] + distance * Math.cos(theta) * Math.sin(phi)
    ];
    
    // Orbit forward direction (from eye to center, normalized)
    let orbitFwd = [
      center[0] - orbitEye[0],
      center[1] - orbitEye[1],
      center[2] - orbitEye[2]
    ];
    const flen = Math.sqrt(orbitFwd[0]**2 + orbitFwd[1]**2 + orbitFwd[2]**2);
    orbitFwd[0] /= flen; orbitFwd[1] /= flen; orbitFwd[2] /= flen;
    
    // Orbit right = forward × [0,1,0]
    let orbitRight = [
      orbitFwd[1] * 0 - orbitFwd[2] * 1,
      orbitFwd[2] * 0 - orbitFwd[0] * 0,
      orbitFwd[0] * 1 - orbitFwd[1] * 0
    ];
    const rlen = Math.sqrt(orbitRight[0]**2 + orbitRight[1]**2 + orbitRight[2]**2);
    if (rlen > 0.0001) {
      orbitRight[0] /= rlen; orbitRight[1] /= rlen; orbitRight[2] /= rlen;
    }
    
    // Orbit up = right × forward
    const orbitUp = [
      orbitRight[1] * orbitFwd[2] - orbitRight[2] * orbitFwd[1],
      orbitRight[2] * orbitFwd[0] - orbitRight[0] * orbitFwd[2],
      orbitRight[0] * orbitFwd[1] - orbitRight[1] * orbitFwd[0]
    ];
    
    // Build quaternion from rotation matrix
    state.orientation = quat.fromRotationMatrix(orbitRight, orbitUp, orbitFwd);
  } else if (fromMode === 'arcball' && toMode === 'orbit') {
    // Arcball → Orbit: Convert quaternion to spherical
    // Get camera position from quaternion
    const forward = quat.getForwardVector(state.orientation);
    const eye = [
      state.center[0] - forward[0] * state.distance,
      state.center[1] - forward[1] * state.distance,
      state.center[2] - forward[2] * state.distance,
    ];

    // Compute spherical angles from eye position relative to center
    const delta = [
      eye[0] - state.center[0],
      eye[1] - state.center[1],
      eye[2] - state.center[2],
    ];

    // phi is azimuthal angle in XZ plane
    state.phi = Math.atan2(delta[2], delta[0]);
    
    // theta is elevation angle
    const r = Math.sqrt(delta[0]*delta[0] + delta[2]*delta[2]);
    state.theta = Math.atan2(delta[1], r);

    // Check if we need to flip to upright orientation
    const up = quat.getUpVector(state.orientation);
    if (up[1] < 0) {
      // Camera is upside down, flip it instantly
      state.theta = Math.PI - state.theta;
      state.phi += Math.PI;
    }
  }
}

export default createUnifiedCamera;
