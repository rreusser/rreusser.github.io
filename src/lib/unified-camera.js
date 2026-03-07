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
  };

  // Pre-allocate matrices
  const _view = new Float32Array(16);
  const _proj = new Float32Array(16);
  const _projView = new Float32Array(16);

  let dirty = true;
  let lastAspectRatio = null;
  let eventsAttached = false;

  // Mouse/touch state
  let isDragging = false;
  let dragMode = null; // 'orbit' | 'pan' | 'pivot' | 'zoom'
  let lastX = 0, lastY = 0;
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
  const backends = {
    orbit: createOrbitBackend(state, speeds, () => dirty = true),
    arcball: createArcballBackend(state, speeds, () => dirty = true),
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
      backends[state.mode].computeMatrices(aspectRatio, _view, _proj, _projView);
      dirty = false;
    }
    return {
      view: _view,
      projection: _proj,
      projView: _projView,
      projectionView: _projView, // Alias for compatibility
      dirty: wasDirty,
    };
  }

  /**
   * Mark camera as dirty (needs update)
   */
  function taint() {
    dirty = true;
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
    dirty = true;
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
    dirty = true;
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
      dirty = true;
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

        dirty = true;
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
    dirty = true;
  }

  /**
   * Pivot view around eye position
   */
  function pivot(dx, dy, targetElement, clientX, clientY) {
    backends[state.mode].pivot(dx, dy, targetElement || element, clientX, clientY);
    dirty = true;
  }

  /**
   * Zoom (dolly in/out)
   */
  function zoom(delta) {
    const factor = 1 + delta * speeds.zoom;
    state.distance = Math.max(0.01, state.distance * factor);
    dirty = true;
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

    dirty = true;
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
    dirty = true;
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
    dirty = true;
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
    
    eventsAttached = false;
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
    
    // Compatibility properties
    get state() { return state; },
    get dirty() { return dirty; },
  };
}

/**
 * Create Orbit backend (spherical coordinates)
 */
function createOrbitBackend(state, speeds, markDirty) {
  function computeMatrices(aspectRatio, view, proj, projView) {
    const { phi, theta, distance, center, fov, near, far } = state;

    // Camera position in spherical coordinates
    const x = center[0] + distance * Math.cos(theta) * Math.cos(phi);
    const y = center[1] + distance * Math.sin(theta);
    const z = center[2] + distance * Math.cos(theta) * Math.sin(phi);

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
  function computeMatrices(aspectRatio, view, proj, projView) {
    // Get view matrix from quaternion
    const forward = quat.getForwardVector(state.orientation);
    const eye = [
      state.center[0] - forward[0] * state.distance,
      state.center[1] - forward[1] * state.distance,
      state.center[2] - forward[2] * state.distance,
    ];

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
    // Arcball rotation using virtual trackball
    const rect = element.getBoundingClientRect();
    const currNormX = (2 * (event.clientX - rect.left) / rect.width) - 1;
    const currNormY = 1 - (2 * (event.clientY - rect.top) / rect.height);

    // Project onto sphere
    const prevP = projectToSphere(event.clientX - dx - rect.left, event.clientY - dy - rect.top, rect.width, rect.height);
    const currP = projectToSphere(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);

    // Compute rotation axis and angle
    const axis = cross(prevP, currP);
    const axisLen = Math.sqrt(axis[0]*axis[0] + axis[1]*axis[1] + axis[2]*axis[2]);
    
    if (axisLen < 0.0001) return; // No rotation
    
    axis[0] /= axisLen;
    axis[1] /= axisLen;
    axis[2] /= axisLen;

    const angle = Math.asin(Math.min(1, axisLen)) * speeds.rotate;

    // Create rotation quaternion
    const rotation = quat.fromAxisAngle(axis, angle);

    // Apply rotation
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
  // Normalize to [-1, 1]
  const nx = (2 * x / width) - 1;
  const ny = 1 - (2 * y / height);

  const r = Math.sqrt(nx*nx + ny*ny);
  
  if (r <= 1.0) {
    // On sphere
    const z = Math.sqrt(1 - r*r);
    return [nx, ny, z];
  } else {
    // Outside sphere, project to edge
    const scale = 1.0 / r;
    return [nx * scale, ny * scale, 0];
  }
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
    // Orbit → Arcball: Convert spherical to quaternion
    state.orientation = quat.fromSpherical(state.phi, state.theta);
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
