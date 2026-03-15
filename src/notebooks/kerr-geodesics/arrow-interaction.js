// Arrow interaction handler — drag the velocity arrow tip to change
// the initial four-velocity direction and magnitude.
//
// Strategy: on mousedown, project the arrow tip to screen space and
// check proximity. If hit, suppress camera events via capture-phase
// stopImmediatePropagation, and drag the tip along a screen-space plane.

export function createArrowInteraction(canvas, camera, {
  getArrowState,    // () => { origin: [x,y,z], tip: [x,y,z], visible: boolean }
  onDrag,           // (newTip: [x,y,z]) => void — called during drag with new tip position
  onDragEnd,        // () => void — called when drag ends
  hitRadius = 20,   // pixel radius for hit-testing the tip
}) {
  let dragging = false;
  let dragPlaneNormal = null; // in world space
  let dragPlaneD = 0;
  let dragOffset = [0, 0, 0]; // offset from projected point to original tip

  function project(point, projView, width, height) {
    // Multiply by projView
    const x = projView[0] * point[0] + projView[4] * point[1] + projView[8] * point[2] + projView[12];
    const y = projView[1] * point[0] + projView[5] * point[1] + projView[9] * point[2] + projView[13];
    const z = projView[2] * point[0] + projView[6] * point[1] + projView[10] * point[2] + projView[14];
    const w = projView[3] * point[0] + projView[7] * point[1] + projView[11] * point[2] + projView[15];
    if (w <= 0) return null;
    return [(x / w * 0.5 + 0.5) * width, (1 - (y / w * 0.5 + 0.5)) * height];
  }

  function unproject(sx, sy, depth, projView, width, height) {
    // Convert screen to NDC
    const ndcX = (sx / width) * 2 - 1;
    const ndcY = 1 - (sy / height) * 2;

    // Invert projView matrix
    const inv = invertMat4(projView);
    if (!inv) return null;

    // Near and far points in NDC
    const nearW = [
      inv[0] * ndcX + inv[4] * ndcY + inv[8] * (-1) + inv[12],
      inv[1] * ndcX + inv[5] * ndcY + inv[9] * (-1) + inv[13],
      inv[2] * ndcX + inv[6] * ndcY + inv[10] * (-1) + inv[14],
      inv[3] * ndcX + inv[7] * ndcY + inv[11] * (-1) + inv[15],
    ];
    const farW = [
      inv[0] * ndcX + inv[4] * ndcY + inv[8] * 1 + inv[12],
      inv[1] * ndcX + inv[5] * ndcY + inv[9] * 1 + inv[13],
      inv[2] * ndcX + inv[6] * ndcY + inv[10] * 1 + inv[14],
      inv[3] * ndcX + inv[7] * ndcY + inv[11] * 1 + inv[15],
    ];

    const near = [nearW[0] / nearW[3], nearW[1] / nearW[3], nearW[2] / nearW[3]];
    const far = [farW[0] / farW[3], farW[1] / farW[3], farW[2] / farW[3]];

    return { near, far };
  }

  function invertMat4(m) {
    const out = new Float32Array(16);
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (Math.abs(det) < 1e-15) return null;
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
  }

  function rayPlaneIntersect(near, far, planeNormal, planeD) {
    const dir = [far[0] - near[0], far[1] - near[1], far[2] - near[2]];
    const denom = planeNormal[0] * dir[0] + planeNormal[1] * dir[1] + planeNormal[2] * dir[2];
    if (Math.abs(denom) < 1e-10) return null;
    const t = -(planeNormal[0] * near[0] + planeNormal[1] * near[1] + planeNormal[2] * near[2] + planeD) / denom;
    return [near[0] + t * dir[0], near[1] + t * dir[1], near[2] + t * dir[2]];
  }

  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return [
      (e.clientX - rect.left) * (canvas.width / rect.width),
      (e.clientY - rect.top) * (canvas.height / rect.height),
    ];
  }

  function onMouseDown(e) {
    if (e.button !== 0) return;
    const state = getArrowState();
    if (!state || !state.visible) return;

    const aspectRatio = canvas.width / canvas.height;
    const { projView, eye } = camera.update(aspectRatio);

    const [sx, sy] = getMousePos(e);
    const tipScreen = project(state.tip, projView, canvas.width, canvas.height);
    if (!tipScreen) return;

    const dx = sx - tipScreen[0];
    const dy = sy - tipScreen[1];
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > hitRadius * (devicePixelRatio || 1)) return;

    // Hit! Start dragging
    dragging = true;
    e.stopImmediatePropagation();
    e.preventDefault();

    // Set up drag plane: perpendicular to view direction, passing through tip
    const viewDir = [
      state.tip[0] - eye[0],
      state.tip[1] - eye[1],
      state.tip[2] - eye[2],
    ];
    const len = Math.sqrt(viewDir[0] ** 2 + viewDir[1] ** 2 + viewDir[2] ** 2);
    dragPlaneNormal = [viewDir[0] / len, viewDir[1] / len, viewDir[2] / len];
    dragPlaneD = -(dragPlaneNormal[0] * state.tip[0] + dragPlaneNormal[1] * state.tip[1] + dragPlaneNormal[2] * state.tip[2]);

    // Record offset so the tip doesn't jump on initial click
    const ray = unproject(sx, sy, 0, projView, canvas.width, canvas.height);
    if (ray) {
      const worldPt = rayPlaneIntersect(ray.near, ray.far, dragPlaneNormal, dragPlaneD);
      if (worldPt) {
        dragOffset = [state.tip[0] - worldPt[0], state.tip[1] - worldPt[1], state.tip[2] - worldPt[2]];
      }
    }
  }

  function onMouseMove(e) {
    if (!dragging) return;
    e.stopImmediatePropagation();
    e.preventDefault();

    const aspectRatio = canvas.width / canvas.height;
    const { projView } = camera.update(aspectRatio);
    const [sx, sy] = getMousePos(e);

    const ray = unproject(sx, sy, 0, projView, canvas.width, canvas.height);
    if (!ray) return;

    const worldPt = rayPlaneIntersect(ray.near, ray.far, dragPlaneNormal, dragPlaneD);
    if (!worldPt) return;

    const newTip = [
      worldPt[0] + dragOffset[0],
      worldPt[1] + dragOffset[1],
      worldPt[2] + dragOffset[2],
    ];

    onDrag(newTip);
  }

  function onMouseUp(e) {
    if (!dragging) return;
    dragging = false;
    e.stopImmediatePropagation();
    e.preventDefault();
    if (onDragEnd) onDragEnd();
  }

  // Capture phase handlers fire before the camera's bubble-phase handlers
  canvas.addEventListener('mousedown', onMouseDown, { capture: true });
  document.addEventListener('mousemove', onMouseMove, { capture: true });
  document.addEventListener('mouseup', onMouseUp, { capture: true });

  function destroy() {
    canvas.removeEventListener('mousedown', onMouseDown, { capture: true });
    document.removeEventListener('mousemove', onMouseMove, { capture: true });
    document.removeEventListener('mouseup', onMouseUp, { capture: true });
  }

  return { destroy };
}
