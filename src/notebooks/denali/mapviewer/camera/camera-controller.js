// Camera controller for interactive 3D views
// Adapted from rreusser/notebooks — modified for WebGPU z-clip [0,1]

import { invertMat4 } from '../math/mat4.ts';

export function createCameraController(element, opts = {}) {
  const state = new Proxy({
    center: opts.center ? [...opts.center] : [0, 0, 0],
    distance: opts.distance || 10,
    phi: opts.phi || 0,
    theta: opts.theta || 0.3,
    fov: opts.fov || Math.PI / 4,
  }, {
    set(target, prop, value) {
      target[prop] = value;
      dirty = true;
      return true;
    }
  });

  const rotateSpeed = opts.rotateSpeed || 0.01;
  const zoomSpeed = opts.zoomSpeed || 0.001;
  const panSpeed = opts.panSpeed || 1;
  const MIN_DISTANCE = 1e-6;

  const _view = new Float64Array(16);
  const _proj = new Float64Array(16);
  const _projView = new Float64Array(16);
  const _invProjView = new Float64Array(16);

  let dirty = true;
  let lastAspect = 1;

  let isDragging = false;
  let dragMode = null;
  let lastX = 0, lastY = 0;
  let rotateStartCallback = null;
  let grabAnchor = null; // { point: [x,y,z], altitude: number }
  let screenPanAnchor = null; // { point: [x,y,z], normal: [nx,ny,nz] }
  let zoomDragMx = 0, zoomDragMy = 0; // normalized cursor offset for drag-zoom

  function recenterOrbit(newCenter) {
    const { phi, theta, distance, center } = state;
    const eyeX = center[0] + distance * Math.cos(theta) * Math.cos(phi);
    const eyeY = center[1] + distance * Math.sin(theta);
    const eyeZ = center[2] + distance * Math.cos(theta) * Math.sin(phi);

    const vx = eyeX - newCenter[0];
    const vy = eyeY - newCenter[1];
    const vz = eyeZ - newCenter[2];
    const newDist = Math.sqrt(vx*vx + vy*vy + vz*vz);
    if (newDist < 1e-10) return;

    state.center[0] = newCenter[0];
    state.center[1] = newCenter[1];
    state.center[2] = newCenter[2];
    state.distance = newDist;
    state.theta = Math.asin(Math.max(-1, Math.min(1, vy / newDist)));
    const ct = Math.cos(state.theta);
    state.phi = ct > 1e-10 ? Math.atan2(vz, vx) : state.phi;
  }

  // Unproject screen point to world-space ray using current _projView
  function screenRay(clientX, clientY) {
    const rect = element.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = 1 - ((clientY - rect.top) / rect.height) * 2;
    invertMat4(_invProjView, _projView);
    const m = _invProjView;
    function unp(nx, ny, nz) {
      const x = m[0]*nx + m[4]*ny + m[8]*nz + m[12];
      const y = m[1]*nx + m[5]*ny + m[9]*nz + m[13];
      const z = m[2]*nx + m[6]*ny + m[10]*nz + m[14];
      const w = m[3]*nx + m[7]*ny + m[11]*nz + m[15];
      return [x/w, y/w, z/w];
    }
    // Reversed-z: NDC z=1 is near, z=0 is far (infinite).
    // Use z=0.5 instead of z=0 to avoid the degenerate w=0 point at infinity.
    const near = unp(ndcX, ndcY, 1);
    const mid = unp(ndcX, ndcY, 0.5);
    return {
      origin: near,
      direction: [mid[0] - near[0], mid[1] - near[1], mid[2] - near[2]]
    };
  }

  // Intersect ray with horizontal plane y = h
  function rayPlaneY(ray, h) {
    if (Math.abs(ray.direction[1]) < 1e-10) return null;
    const t = (h - ray.origin[1]) / ray.direction[1];
    if (t < 0) return null;
    return [ray.origin[0] + t * ray.direction[0], h, ray.origin[2] + t * ray.direction[2]];
  }

  let rotatePivot = null; // terrain point to orbit around (set on rotate start)
  let pivotRing = null;

  function showPivotRing(clientX, clientY) {
    removePivotRing();
    const parent = element.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const prevPos = getComputedStyle(parent).position;
    if (prevPos === 'static') parent.style.position = 'relative';
    const container = document.createElement('div');
    const size = 22;
    const shared = {
      position: 'absolute',
      left: '0', top: '0',
      width: size + 'px',
      height: size + 'px',
      borderRadius: '50%',
      boxSizing: 'border-box',
      pointerEvents: 'none',
    };
    Object.assign(container.style, {
      position: 'absolute',
      left: (clientX - parentRect.left - size / 2) + 'px',
      top: (clientY - parentRect.top - size / 2) + 'px',
      width: size + 'px',
      height: size + 'px',
      pointerEvents: 'none',
      transform: 'scale(0.5)',
      opacity: '0',
      transition: 'transform 0.15s ease-out, opacity 0.15s ease-out',
    });
    const outer = document.createElement('div');
    Object.assign(outer.style, { ...shared, border: '4px solid rgba(255,255,255,0.6)' });
    const inner = document.createElement('div');
    Object.assign(inner.style, { ...shared, border: '2.25px solid rgba(0,0,0,0.5)' });
    container.appendChild(outer);
    container.appendChild(inner);
    parent.appendChild(container);
    container.offsetWidth;
    container.style.transform = 'scale(1)';
    container.style.opacity = '1';
    pivotRing = container;
  }

  function removePivotRing() {
    if (!pivotRing) return;
    const ring = pivotRing;
    pivotRing = null;
    ring.style.transform = 'scale(1.5)';
    ring.style.opacity = '0';
    ring.addEventListener('transitionend', () => ring.remove(), { once: true });
  }

  // Rotate the camera by dphi (azimuth) and dtheta (elevation) around rotatePivot.
  // If no pivot is set, falls back to orbiting around state.center as usual.
  function applyPivotRotation(dphi, dtheta) {
    const { phi, theta, distance, center } = state;
    const newPhi = phi + dphi;
    const newTheta = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, theta + dtheta));
    const actualDtheta = newTheta - theta;

    if (!rotatePivot) {
      state.phi = newPhi;
      state.theta = newTheta;
      return;
    }

    // Current eye position
    const eyeX = center[0] + distance * Math.cos(theta) * Math.cos(phi);
    const eyeY = center[1] + distance * Math.sin(theta);
    const eyeZ = center[2] + distance * Math.cos(theta) * Math.sin(phi);

    // Vector from pivot to eye
    let vx = eyeX - rotatePivot[0];
    let vy = eyeY - rotatePivot[1];
    let vz = eyeZ - rotatePivot[2];

    // Step 1: Rotate around Y axis by dphi
    const cosDp = Math.cos(dphi), sinDp = Math.sin(dphi);
    const vx1 = vx * cosDp - vz * sinDp;
    const vy1 = vy;
    const vz1 = vx * sinDp + vz * cosDp;

    // Step 2: Rotate around the right axis by actualDtheta (Rodrigues' formula)
    // Right axis at newPhi: k = [-sin(newPhi), 0, cos(newPhi)]
    const kx = -Math.sin(newPhi), kz = Math.cos(newPhi);
    const cosDt = Math.cos(actualDtheta), sinDt = Math.sin(actualDtheta);
    const oneMinusCos = 1 - cosDt;
    // k cross v1 (ky = 0)
    const crossX = -kz * vy1;
    const crossY = kz * vx1 - kx * vz1;
    const crossZ = kx * vy1;
    // k dot v1
    const dot = kx * vx1 + kz * vz1;

    const vx2 = vx1 * cosDt + crossX * sinDt + kx * dot * oneMinusCos;
    const vy2 = vy1 * cosDt + crossY * sinDt;
    const vz2 = vz1 * cosDt + crossZ * sinDt + kz * dot * oneMinusCos;

    // New eye = pivot + rotated vector
    const newEyeX = rotatePivot[0] + vx2;
    const newEyeY = rotatePivot[1] + vy2;
    const newEyeZ = rotatePivot[2] + vz2;

    // Update angles
    state.phi = newPhi;
    state.theta = newTheta;

    // Derive center from new eye: center = eye - dist * D(newPhi, newTheta)
    state.center[0] = newEyeX - distance * Math.cos(newTheta) * Math.cos(newPhi);
    state.center[1] = newEyeY - distance * Math.sin(newTheta);
    state.center[2] = newEyeZ - distance * Math.cos(newTheta) * Math.sin(newPhi);
  }

  let lastTouchDist = 0;
  let lastTouchCenterX = 0;
  let lastTouchCenterY = 0;
  let lastTouchAngle = 0;
  let touchZoomMx = 0, touchZoomMy = 0;

  function computeMatrices(aspectRatio) {
    const { phi, theta, distance, center, fov } = state;

    const x = center[0] + distance * Math.cos(theta) * Math.cos(phi);
    const y = center[1] + distance * Math.sin(theta);
    const z = center[2] + distance * Math.cos(theta) * Math.sin(phi);

    let fwdX = center[0] - x, fwdY = center[1] - y, fwdZ = center[2] - z;
    const fwdLen = Math.sqrt(fwdX*fwdX + fwdY*fwdY + fwdZ*fwdZ);
    fwdX /= fwdLen; fwdY /= fwdLen; fwdZ /= fwdLen;

    let rightX = fwdY * 0 - fwdZ * 1;
    let rightY = fwdZ * 0 - fwdX * 0;
    let rightZ = fwdX * 1 - fwdY * 0;
    const rLen = Math.sqrt(rightX*rightX + rightY*rightY + rightZ*rightZ);
    if (rLen > 0.0001) {
      rightX /= rLen; rightY /= rLen; rightZ /= rLen;
    }

    const upX = rightY * fwdZ - rightZ * fwdY;
    const upY = rightZ * fwdX - rightX * fwdZ;
    const upZ = rightX * fwdY - rightY * fwdX;

    _view[0] = rightX; _view[1] = upX; _view[2] = -fwdX; _view[3] = 0;
    _view[4] = rightY; _view[5] = upY; _view[6] = -fwdY; _view[7] = 0;
    _view[8] = rightZ; _view[9] = upZ; _view[10] = -fwdZ; _view[11] = 0;
    _view[12] = -(rightX*x + rightY*y + rightZ*z);
    _view[13] = -(upX*x + upY*y + upZ*z);
    _view[14] = (fwdX*x + fwdY*y + fwdZ*z);
    _view[15] = 1;

    // Reversed-z infinite far projection (WebGPU z in [0,1]).
    // NDC z = near / clip.w, mapping near plane to 1 and infinity to 0.
    // Combined with depth32float, this gives excellent precision at all depths.
    const f = 1.0 / Math.tan(fov / 2);
    const projNear = Math.max(distance * 0.001, 1e-10);
    _proj[0] = f / aspectRatio; _proj[1] = 0; _proj[2] = 0; _proj[3] = 0;
    _proj[4] = 0; _proj[5] = f; _proj[6] = 0; _proj[7] = 0;
    _proj[8] = 0; _proj[9] = 0; _proj[10] = 0; _proj[11] = -1;
    _proj[12] = 0; _proj[13] = 0; _proj[14] = projNear; _proj[15] = 0;

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += _proj[i + k*4] * _view[k + j*4];
        }
        _projView[i + j*4] = sum;
      }
    }
  }

  function pan(dx, dy) {
    const { phi, theta, distance } = state;

    const rightX = Math.sin(phi);
    const rightZ = -Math.cos(phi);

    const upX = -Math.sin(theta) * Math.cos(phi);
    const upY = Math.cos(theta);
    const upZ = -Math.sin(theta) * Math.sin(phi);

    const scale = distance * panSpeed;
    state.center[0] -= dx * rightX * scale;
    state.center[0] += dy * upX * scale;
    state.center[1] += dy * upY * scale;
    state.center[2] -= dx * rightZ * scale;
    state.center[2] += dy * upZ * scale;
  }

  function initGrab(clientX, clientY) {
    grabAnchor = null;
    computeMatrices(lastAspect);
    if (rotateStartCallback) {
      const result = rotateStartCallback(clientX, clientY);
      if (Array.isArray(result) && result.length === 3) {
        grabAnchor = { point: [...result], altitude: result[1] };
        return;
      }
    }
    // Fallback: intersect with y = center.y
    const ray = screenRay(clientX, clientY);
    const hit = rayPlaneY(ray, state.center[1]);
    if (hit) grabAnchor = { point: hit, altitude: state.center[1] };
  }

  function moveGrab(clientX, clientY) {
    if (!grabAnchor) return;
    computeMatrices(lastAspect);
    const ray = screenRay(clientX, clientY);
    const hit = rayPlaneY(ray, grabAnchor.altitude);
    if (hit) {
      state.center[0] += grabAnchor.point[0] - hit[0];
      state.center[2] += grabAnchor.point[2] - hit[2];
    }
  }

  function initScreenPan(clientX, clientY) {
    screenPanAnchor = null;
    computeMatrices(lastAspect);
    let point = null;
    if (rotateStartCallback) {
      const result = rotateStartCallback(clientX, clientY);
      if (Array.isArray(result) && result.length === 3) point = result;
    }
    if (!point) {
      const ray = screenRay(clientX, clientY);
      point = rayPlaneY(ray, state.center[1]);
    }
    if (!point) return;
    const { phi, theta } = state;
    const nx = -Math.cos(theta) * Math.cos(phi);
    const ny = -Math.sin(theta);
    const nz = -Math.cos(theta) * Math.sin(phi);
    screenPanAnchor = { point: [...point], normal: [nx, ny, nz] };
  }

  function moveScreenPan(clientX, clientY) {
    if (!screenPanAnchor) return;
    computeMatrices(lastAspect);
    const ray = screenRay(clientX, clientY);
    const { point, normal } = screenPanAnchor;
    const denom = normal[0] * ray.direction[0] + normal[1] * ray.direction[1] + normal[2] * ray.direction[2];
    if (Math.abs(denom) < 1e-10) return;
    const nDotP = normal[0] * point[0] + normal[1] * point[1] + normal[2] * point[2];
    const nDotO = normal[0] * ray.origin[0] + normal[1] * ray.origin[1] + normal[2] * ray.origin[2];
    const t = (nDotP - nDotO) / denom;
    if (t < 0) return;
    const hitX = ray.origin[0] + t * ray.direction[0];
    const hitY = ray.origin[1] + t * ray.direction[1];
    const hitZ = ray.origin[2] + t * ray.direction[2];
    state.center[0] += point[0] - hitX;
    state.center[1] += point[1] - hitY;
    state.center[2] += point[2] - hitZ;
  }

  function onMouseDown(event) {
    event.preventDefault();
    lastX = event.clientX;
    lastY = event.clientY;
    dragMode = event.shiftKey ? 'pan'
      : (event.button === 2 || event.button === 1) ? 'rotate'
      : event.ctrlKey ? 'pivot'
      : event.metaKey ? 'rotate'
      : event.altKey ? 'zoom'
      : 'grab';
    if (dragMode === 'rotate') {
      if (rotateStartCallback) {
        const result = rotateStartCallback(event.clientX, event.clientY);
        rotatePivot = (Array.isArray(result) && result.length === 3) ? result : null;
      }
      showPivotRing(event.clientX, event.clientY);
    }
    if (dragMode === 'grab') initGrab(event.clientX, event.clientY);
    if (dragMode === 'pan') initScreenPan(event.clientX, event.clientY);
    if (dragMode === 'zoom') {
      // Slide orbit center to match terrain distance (same as wheel zoom start)
      if (rotateStartCallback) {
        const result = rotateStartCallback(event.clientX, event.clientY);
        if (Array.isArray(result) && result.length === 3) {
          const { phi, theta, distance, center } = state;
          const eyeX = center[0] + distance * Math.cos(theta) * Math.cos(phi);
          const eyeY = center[1] + distance * Math.sin(theta);
          const eyeZ = center[2] + distance * Math.cos(theta) * Math.sin(phi);
          const hx = result[0] - eyeX, hy = result[1] - eyeY, hz = result[2] - eyeZ;
          const terrainDist = Math.sqrt(hx * hx + hy * hy + hz * hz);
          const dirX = Math.cos(theta) * Math.cos(phi);
          const dirY = Math.sin(theta);
          const dirZ = Math.cos(theta) * Math.sin(phi);
          state.center[0] += (distance - terrainDist) * dirX;
          state.center[1] += (distance - terrainDist) * dirY;
          state.center[2] += (distance - terrainDist) * dirZ;
          state.distance = terrainDist;
        }
      }
      const rect = element.getBoundingClientRect();
      zoomDragMx = (event.clientX - rect.left - rect.width / 2) / rect.height;
      zoomDragMy = (event.clientY - rect.top - rect.height / 2) / rect.height;
      showPivotRing(event.clientX, event.clientY);
    }
    isDragging = true;
    element.style.cursor = 'grabbing';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(event) {
    if (!isDragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;

    if (dragMode === 'grab') {
      moveGrab(event.clientX, event.clientY);
    } else if (dragMode === 'rotate') {
      applyPivotRotation(dx * rotateSpeed, dy * rotateSpeed);
    } else if (dragMode === 'pivot') {
      // Keep eye fixed, turn the look direction
      // Speed: dragging full viewport height = FOV rotation (1:1 with scene)
      const { phi, theta, distance, center, fov } = state;
      const pivotSpeed = fov / element.getBoundingClientRect().height;
      const eyeX = center[0] + distance * Math.cos(theta) * Math.cos(phi);
      const eyeY = center[1] + distance * Math.sin(theta);
      const eyeZ = center[2] + distance * Math.cos(theta) * Math.sin(phi);

      state.phi -= dx * pivotSpeed;
      state.theta = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, state.theta - dy * pivotSpeed));

      state.center[0] = eyeX - distance * Math.cos(state.theta) * Math.cos(state.phi);
      state.center[1] = eyeY - distance * Math.sin(state.theta);
      state.center[2] = eyeZ - distance * Math.cos(state.theta) * Math.sin(state.phi);
    } else if (dragMode === 'zoom') {
      const zoomFactor = Math.exp(-dy * 0.005);
      const oldDistance = state.distance;
      state.distance = Math.max(MIN_DISTANCE, oldDistance * zoomFactor);
      const actualZoomFactor = state.distance / oldDistance;
      const panAmount = (1 / actualZoomFactor - 1) * 2 * Math.tan(state.fov / 2);
      pan(-zoomDragMx * panAmount, -zoomDragMy * panAmount);
    } else if (dragMode === 'pan') {
      moveScreenPan(event.clientX, event.clientY);
    }
    dirty = true;
  }

  function onMouseUp() {
    isDragging = false;
    dragMode = null;
    grabAnchor = null;
    rotatePivot = null;
    screenPanAnchor = null;
    removePivotRing();
    element.style.cursor = 'grab';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  let zoomActive = false;
  let zoomTimer = null;

  function onWheel(event) {
    event.preventDefault();

    // At zoom start, slide orbit center along the look ray so state.distance
    // matches the actual camera-to-terrain distance. This has no visual effect
    // (eye position and look direction are unchanged) but makes the subsequent
    // multiplicative zoom proportional to terrain distance under the cursor.
    if (!zoomActive && rotateStartCallback) {
      const result = rotateStartCallback(event.clientX, event.clientY);
      if (Array.isArray(result) && result.length === 3) {
        const { phi, theta, distance, center } = state;
        const eyeX = center[0] + distance * Math.cos(theta) * Math.cos(phi);
        const eyeY = center[1] + distance * Math.sin(theta);
        const eyeZ = center[2] + distance * Math.cos(theta) * Math.sin(phi);
        const hx = result[0] - eyeX;
        const hy = result[1] - eyeY;
        const hz = result[2] - eyeZ;
        const terrainDist = Math.sqrt(hx * hx + hy * hy + hz * hz);

        // Move center along the existing look ray (eye→center direction)
        const dirX = Math.cos(theta) * Math.cos(phi);
        const dirY = Math.sin(theta);
        const dirZ = Math.cos(theta) * Math.sin(phi);
        state.center[0] += (distance - terrainDist) * dirX;
        state.center[1] += (distance - terrainDist) * dirY;
        state.center[2] += (distance - terrainDist) * dirZ;
        state.distance = terrainDist;
      }
      zoomActive = true;
    }

    clearTimeout(zoomTimer);
    zoomTimer = setTimeout(() => { zoomActive = false; }, 200);

    const rect = element.getBoundingClientRect();
    const mx = (event.clientX - rect.left - rect.width / 2) / rect.height;
    const my = (event.clientY - rect.top - rect.height / 2) / rect.height;

    const zoomFactor = 1 + event.deltaY * zoomSpeed;
    const oldDistance = state.distance;
    state.distance = Math.max(MIN_DISTANCE, oldDistance * zoomFactor);
    const actualZoomFactor = state.distance / oldDistance;

    const panAmount = (1 / actualZoomFactor - 1) * 2 * Math.tan(state.fov / 2);
    pan(-mx * panAmount, -my * panAmount);
    dirty = true;
  }

  function onTouchStart(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
      isDragging = true;
      dragMode = 'grab';
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;
      initGrab(lastX, lastY);
    } else if (event.touches.length === 2) {
      const dx = event.touches[1].clientX - event.touches[0].clientX;
      const dy = event.touches[1].clientY - event.touches[0].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenterX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      lastTouchCenterY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      lastTouchAngle = Math.atan2(dy, dx);

      // Set pivot to terrain under touch midpoint and recenter orbit distance
      if (rotateStartCallback) {
        computeMatrices(lastAspect);
        const result = rotateStartCallback(lastTouchCenterX, lastTouchCenterY);
        rotatePivot = (Array.isArray(result) && result.length === 3) ? result : null;
        if (rotatePivot) {
          const { phi, theta, distance, center } = state;
          const eyeX = center[0] + distance * Math.cos(theta) * Math.cos(phi);
          const eyeY = center[1] + distance * Math.sin(theta);
          const eyeZ = center[2] + distance * Math.cos(theta) * Math.sin(phi);
          const hx = rotatePivot[0] - eyeX, hy = rotatePivot[1] - eyeY, hz = rotatePivot[2] - eyeZ;
          const terrainDist = Math.sqrt(hx * hx + hy * hy + hz * hz);
          const dirX = Math.cos(theta) * Math.cos(phi);
          const dirY = Math.sin(theta);
          const dirZ = Math.cos(theta) * Math.sin(phi);
          state.center[0] += (distance - terrainDist) * dirX;
          state.center[1] += (distance - terrainDist) * dirY;
          state.center[2] += (distance - terrainDist) * dirZ;
          state.distance = terrainDist;
        }
      }
      showPivotRing(lastTouchCenterX, lastTouchCenterY);

      // Store normalized midpoint offset for zoom-toward-midpoint pan correction
      const rect = element.getBoundingClientRect();
      touchZoomMx = (lastTouchCenterX - rect.left - rect.width / 2) / rect.height;
      touchZoomMy = (lastTouchCenterY - rect.top - rect.height / 2) / rect.height;
    }
  }

  function onTouchMove(event) {
    event.preventDefault();
    if (event.touches.length === 1 && isDragging) {
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;
      if (dragMode === 'grab') {
        moveGrab(lastX, lastY);
      }
      dirty = true;
    } else if (event.touches.length === 2) {
      const dx = event.touches[1].clientX - event.touches[0].clientX;
      const dy = event.touches[1].clientY - event.touches[0].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

      if (lastTouchDist > 0) {
        // Pinch-to-zoom with pan correction toward midpoint
        const scale = lastTouchDist / dist;
        const oldDistance = state.distance;
        state.distance *= scale;
        state.distance = Math.max(MIN_DISTANCE, state.distance);
        const actualZoomFactor = state.distance / oldDistance;
        const panAmount = (1 / actualZoomFactor - 1) * 2 * Math.tan(state.fov / 2);
        pan(-touchZoomMx * panAmount, -touchZoomMy * panAmount);

        // Two-finger twist → orbit (phi rotation)
        // Vertical center-point drag → tilt (theta)
        const angle = Math.atan2(dy, dx);
        const angleDelta = angle - lastTouchAngle;
        const rect = element.getBoundingClientRect();
        const tiltDelta = (centerY - lastTouchCenterY) / rect.height;
        applyPivotRotation(-angleDelta, tiltDelta * 2);

        dirty = true;
        lastTouchAngle = angle;
      }
      lastTouchDist = dist;
      lastTouchCenterX = centerX;
      lastTouchCenterY = centerY;
    }
  }

  function onTouchEnd() {
    isDragging = false;
    dragMode = null;
    grabAnchor = null;
    rotatePivot = null;
    removePivotRing();
    lastTouchDist = 0;
    lastTouchAngle = 0;
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  element.style.cursor = 'grab';
  element.addEventListener('mousedown', onMouseDown);
  element.addEventListener('wheel', onWheel, { passive: false });
  element.addEventListener('touchstart', onTouchStart, { passive: false });
  element.addEventListener('touchmove', onTouchMove, { passive: false });
  element.addEventListener('touchend', onTouchEnd);
  element.addEventListener('contextmenu', onContextMenu);

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
    state,
    get dirty() { return dirty; },
    set rotateStartCallback(fn) { rotateStartCallback = fn; },
    taint() { dirty = true; },
    update(aspectRatio) {
      lastAspect = aspectRatio;
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

export default createCameraController;
