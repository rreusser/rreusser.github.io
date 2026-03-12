// Interactive mesh editor with vertex manipulation
// Handles mouse/keyboard/touch input for vertex manipulation
// Camera control is delegated to orbit-camera-controller

import { mat4, vec3 } from 'npm:gl-matrix@3.4.3';

export class MeshInteractions {
  constructor(element, mesh, controller, opts = {}) {
    this.element = element;
    this.mesh = mesh;
    this.controller = controller;
    this.camera = controller.camera;
    this.projectionView = controller.projectionView;

    // Selection state (vertex and edge selection are mutually exclusive)
    this.selectedVertexIndex = -1;
    this.hoverVertexIndex = -1;
    this.activeVertexIndex = -1;
    this.selectedEdgeIndex = -1;
    this.hoverEdgeIndex = -1;
    this.activeEdgeIndex = -1;  // Edge being dragged

    // Drag state
    this.isDragging = false;
    this.dragMode = null; // 'vertex' only - camera handled by controller
    this.initialMousePos = [0, 0];
    this.currentMousePos = [0, 0];
    this.previousMousePos = [0, 0];
    this.deadZoneRadius = 5;
    this.exitedDeadZone = false;

    // Touch state
    this.touchStartedOnVertex = false;
    this.touchVertexIndex = -1;

    // Background click tracking (for camera rotation vs click detection)
    this.backgroundClickStart = null;  // [x, y] of mousedown on empty space
    this.backgroundExitedDeadZone = false;

    // Track if selection was made in mousedown (to skip re-evaluation in onClick)
    this.selectionHandledInMouseDown = false;

    // Candidate edge for connection
    this.candidateEdge = null;

    // Dirty flag for rendering
    this.dirty = true;

    // Callbacks
    this.onChange = opts.onChange || (() => {});

    // Bind event handlers
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    // Setup
    this._setup();
  }

  _setup() {
    const el = this.element;
    el.tabIndex = 1;
    el.style.outline = 'none';
    // Cursor managed via CSS classes (see index.html #mesh-canvas style)

    el.addEventListener('mousedown', this._onMouseDown);
    el.addEventListener('mousemove', this._onMouseMove);
    el.addEventListener('click', this._onClick);
    el.addEventListener('keydown', this._onKeyDown);
    el.addEventListener('keyup', this._onKeyUp);
    el.addEventListener('touchstart', this._onTouchStart, { passive: false });
    el.addEventListener('touchmove', this._onTouchMove, { passive: false });
    el.addEventListener('touchend', this._onTouchEnd);
  }

  destroy() {
    const el = this.element;
    el.removeEventListener('mousedown', this._onMouseDown);
    el.removeEventListener('mousemove', this._onMouseMove);
    el.removeEventListener('click', this._onClick);
    el.removeEventListener('keydown', this._onKeyDown);
    el.removeEventListener('keyup', this._onKeyUp);
    el.removeEventListener('touchstart', this._onTouchStart);
    el.removeEventListener('touchmove', this._onTouchMove);
    el.removeEventListener('touchend', this._onTouchEnd);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
  }

  _getMousePos(event, out = [0, 0]) {
    const rect = this.element.getBoundingClientRect();
    out[0] = event.clientX - rect.left;
    out[1] = event.clientY - rect.top;
    return out;
  }

  _insideDeadZone() {
    const dx = this.currentMousePos[0] - this.initialMousePos[0];
    const dy = this.currentMousePos[1] - this.initialMousePos[1];
    return Math.sqrt(dx * dx + dy * dy) < this.deadZoneRadius;
  }

  // ============ Picking ============

  _getClosestVertex(x, y) {
    const mesh = this.mesh;
    if (!mesh) return { index: -1, distance: Infinity };

    const projectionView = this.projectionView;
    const width = this.element.offsetWidth;
    const height = this.element.offsetHeight;

    const projected = vec3.create();
    let minIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < mesh.vertexCount; i++) {
      const pos = mesh.getPosition(i);
      vec3.transformMat4(projected, pos, projectionView);

      // Skip if behind camera
      if (projected[2] < -1 || projected[2] > 1) continue;

      // Convert to screen coordinates
      const sx = (0.5 + 0.5 * projected[0]) * width;
      const sy = (0.5 - 0.5 * projected[1]) * height;

      const dx = x - sx;
      const dy = y - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDistance) {
        minDistance = dist;
        minIndex = i;
      }
    }

    return { index: minIndex, distance: minDistance };
  }

  _getClosestEdge(x, y) {
    const mesh = this.mesh;
    if (!mesh) return { index: -1, distance: Infinity };

    const projectionView = this.projectionView;
    const width = this.element.offsetWidth;
    const height = this.element.offsetHeight;

    const projected0 = vec3.create();
    const projected1 = vec3.create();
    let minIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < mesh.edgeCount; i++) {
      const edge = mesh.getEdge(i);
      const pos0 = mesh.getPosition(edge[0]);
      const pos1 = mesh.getPosition(edge[1]);

      vec3.transformMat4(projected0, pos0, projectionView);
      vec3.transformMat4(projected1, pos1, projectionView);

      // Skip if either endpoint is outside the view frustum (behind camera or past far plane)
      if (projected0[2] < -1 || projected0[2] > 1 ||
          projected1[2] < -1 || projected1[2] > 1) continue;

      // Convert to screen coordinates
      const sx0 = (0.5 + 0.5 * projected0[0]) * width;
      const sy0 = (0.5 - 0.5 * projected0[1]) * height;
      const sx1 = (0.5 + 0.5 * projected1[0]) * width;
      const sy1 = (0.5 - 0.5 * projected1[1]) * height;

      // Distance from point to line segment
      const dist = this._pointToSegmentDistance(x, y, sx0, sy0, sx1, sy1);

      if (dist < minDistance) {
        minDistance = dist;
        minIndex = i;
      }
    }

    return { index: minIndex, distance: minDistance };
  }

  // Compute distance from point (px, py) to line segment (x0, y0) - (x1, y1)
  _pointToSegmentDistance(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq < 0.0001) {
      // Degenerate segment (endpoints very close)
      return Math.sqrt((px - x0) * (px - x0) + (py - y0) * (py - y0));
    }

    // Parameter t for projection onto line
    let t = ((px - x0) * dx + (py - y0) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t)); // Clamp to segment

    // Closest point on segment
    const closestX = x0 + t * dx;
    const closestY = y0 + t * dy;

    return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
  }

  // Get selection target (vertex first, then edge)
  // Vertex threshold is smaller to make it easier to select edges near vertices
  _getSelectionTarget(x, y, vertexThreshold = 18, edgeThreshold = 12) {
    const closestVertex = this._getClosestVertex(x, y);
    const closestEdge = this._getClosestEdge(x, y);

    const vertexInRange = closestVertex.index >= 0 && closestVertex.distance < vertexThreshold;
    const edgeInRange = closestEdge.index >= 0 && closestEdge.distance < edgeThreshold;

    // Vertex always wins if very close (within tight threshold)
    const vertexPriorityThreshold = 10;
    if (closestVertex.index >= 0 && closestVertex.distance < vertexPriorityThreshold) {
      return { type: 'vertex', index: closestVertex.index, distance: closestVertex.distance };
    }

    if (vertexInRange && edgeInRange) {
      // Both in range - pick the closer one (edge wins ties)
      if (closestEdge.distance <= closestVertex.distance) {
        return { type: 'edge', index: closestEdge.index, distance: closestEdge.distance };
      } else {
        return { type: 'vertex', index: closestVertex.index, distance: closestVertex.distance };
      }
    } else if (vertexInRange) {
      return { type: 'vertex', index: closestVertex.index, distance: closestVertex.distance };
    } else if (edgeInRange) {
      return { type: 'edge', index: closestEdge.index, distance: closestEdge.distance };
    }

    return { type: 'none', index: -1, distance: Infinity };
  }

  // ============ Mouse Events ============

  _onMouseDown(event) {
    this._getMousePos(event, this.initialMousePos);
    this.currentMousePos[0] = this.initialMousePos[0];
    this.currentMousePos[1] = this.initialMousePos[1];
    this.previousMousePos[0] = this.initialMousePos[0];
    this.previousMousePos[1] = this.initialMousePos[1];
    this.exitedDeadZone = false;

    // Check for vertex or edge under cursor
    const target = this._getSelectionTarget(this.initialMousePos[0], this.initialMousePos[1]);

    if (target.type === 'vertex') {
      // Clicked on a vertex - prevent camera controller from handling
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Ensure canvas has focus for keyboard events
      this.element.focus();

      // Clear edge selection (mutually exclusive)
      this.selectedEdgeIndex = -1;

      if (this.selectedVertexIndex >= 0 && this.selectedVertexIndex !== target.index) {
        // Potential edge creation
        this.candidateEdge = [this.selectedVertexIndex, target.index];
      }
      this.activeVertexIndex = target.index;
      this.selectedVertexIndex = target.index;
      this.dragMode = 'vertex';
      this.element.classList.remove('cursor-pointer', 'cursor-grabbing');
      this.element.classList.add('cursor-move');
      this.selectionHandledInMouseDown = true;

      this.isDragging = true;
      this.dirty = true;

      // Listen for mouse up/move on window
      window.addEventListener('mousemove', this._onMouseMove);
      window.addEventListener('mouseup', this._onMouseUp);
    } else if (target.type === 'edge') {
      // Clicked on an edge - prevent camera controller from handling
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Ensure canvas has focus for keyboard events
      this.element.focus();

      // Clear vertex selection (mutually exclusive)
      this.selectedVertexIndex = -1;
      this.activeVertexIndex = -1;
      this.candidateEdge = null;

      this.selectedEdgeIndex = target.index;
      this.activeEdgeIndex = target.index;  // Track active edge for physics exclusion
      this.dragMode = 'edge';
      this.element.classList.remove('cursor-pointer', 'cursor-grabbing');
      this.element.classList.add('cursor-move');
      this.selectionHandledInMouseDown = true;

      this.isDragging = true;
      this.dirty = true;

      // Listen for mouse up/move on window
      window.addEventListener('mousemove', this._onMouseMove);
      window.addEventListener('mouseup', this._onMouseUp);
    } else {
      // Clicked on empty space - track for background drag detection
      this.backgroundClickStart = [this.initialMousePos[0], this.initialMousePos[1]];
      this.backgroundExitedDeadZone = false;
      this.selectionHandledInMouseDown = false;
      window.addEventListener('mousemove', this._onMouseMove);
      window.addEventListener('mouseup', this._onMouseUp);
    }
    // Camera control is handled by orbit-camera-controller
  }

  _onMouseMove(event) {
    this.previousMousePos[0] = this.currentMousePos[0];
    this.previousMousePos[1] = this.currentMousePos[1];
    this._getMousePos(event, this.currentMousePos);

    // Track background drag (camera rotation) - check if exited dead zone
    // Must be done before the isDragging check since background clicks don't set isDragging
    if (this.backgroundClickStart && !this.backgroundExitedDeadZone) {
      const dx = this.currentMousePos[0] - this.backgroundClickStart[0];
      const dy = this.currentMousePos[1] - this.backgroundClickStart[1];
      if (Math.sqrt(dx * dx + dy * dy) >= this.deadZoneRadius) {
        this.backgroundExitedDeadZone = true;
        // Set grabbing cursor for camera rotation
        this.element.classList.remove('cursor-move', 'cursor-pointer');
        this.element.classList.add('cursor-grabbing');
      }
    }

    if (!this.isDragging) {
      // Skip hover detection during camera rotation (background drag)
      if (this.backgroundClickStart) {
        return;
      }

      // Passive hover - check vertex first, then edge
      const target = this._getSelectionTarget(this.currentMousePos[0], this.currentMousePos[1], 20, 12);

      let newVertexHover = -1;
      let newEdgeHover = -1;

      if (target.type === 'vertex') {
        newVertexHover = target.index;
      } else if (target.type === 'edge') {
        newEdgeHover = target.index;
      }

      if (newVertexHover !== this.hoverVertexIndex || newEdgeHover !== this.hoverEdgeIndex) {
        this.hoverVertexIndex = newVertexHover;
        this.hoverEdgeIndex = newEdgeHover;
        // Update cursor via CSS classes
        this.element.classList.remove('cursor-move', 'cursor-pointer', 'cursor-grabbing');
        if (newVertexHover >= 0) {
          this.element.classList.add('cursor-move');
        } else if (newEdgeHover >= 0) {
          this.element.classList.add('cursor-pointer');
        }
        // Default 'grab' cursor comes from CSS rule, no class needed
        this.dirty = true;
      }
      return;
    }

    // Check dead zone
    if (!this.exitedDeadZone && !this._insideDeadZone()) {
      this.exitedDeadZone = true;
    }

    if (this.dragMode === 'vertex' && this.exitedDeadZone) {
      this._dragVertex();
    } else if (this.dragMode === 'edge' && this.exitedDeadZone) {
      this._dragEdge();
    }
    // Camera rotation/pan handled by orbit-camera-controller
  }

  _onMouseUp(event) {
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);

    // Clean up background click tracking (but preserve exitedDeadZone for _onClick)
    // Will be reset in _onClick or next mousedown

    if (!this.isDragging) return;

    this._getMousePos(event, this.currentMousePos);

    if (!this.exitedDeadZone && this._insideDeadZone()) {
      // Click without drag
      const target = this._getSelectionTarget(this.currentMousePos[0], this.currentMousePos[1], 20, 12);

      if (this.dragMode === 'vertex') {
        // Started click on a vertex
        if (target.type === 'vertex') {
          // Clicked on existing vertex - maybe create edge or merge
          if (this.candidateEdge) {
            if (event.shiftKey) {
              // Shift+click: merge vertices instead of creating edge
              const merged = this.mesh.mergeVertices(this.candidateEdge[0], this.candidateEdge[1]);
              if (merged >= 0) {
                this.selectedVertexIndex = merged;
                this.selectedEdgeIndex = -1;
              }
            } else {
              // Normal click: create edge
              this.mesh.addEdge(this.candidateEdge[0], this.candidateEdge[1]);
              this.selectedVertexIndex = target.index;
              this.selectedEdgeIndex = -1;
            }
          } else {
            this.selectedVertexIndex = target.index;
            this.selectedEdgeIndex = -1;
          }
        } else if (this.selectedVertexIndex >= 0) {
          // Clicked in empty space while vertex was selected - spawn new vertex
          this._spawnVertex();
        }
      }
      // Edge clicks are already handled in mousedown, no additional action needed
    }

    this.isDragging = false;
    this.dragMode = null;
    this.activeVertexIndex = -1;
    this.activeEdgeIndex = -1;
    this.candidateEdge = null;
    // Update cursor based on current hover state
    this.element.classList.remove('cursor-move', 'cursor-pointer', 'cursor-grabbing');
    if (this.hoverVertexIndex >= 0) {
      this.element.classList.add('cursor-move');
    } else if (this.hoverEdgeIndex >= 0) {
      this.element.classList.add('cursor-pointer');
    }
    // Default 'grab' comes from CSS
    this.dirty = true;

    this.onChange();
  }

  _onClick(event) {
    // If we dragged the camera (background drag), don't process as a click
    const wasCameraDrag = this.backgroundExitedDeadZone;

    // Check if selection was already handled in mousedown
    const selectionAlreadyHandled = this.selectionHandledInMouseDown;

    // Reset tracking flags
    this.backgroundClickStart = null;
    this.backgroundExitedDeadZone = false;
    this.selectionHandledInMouseDown = false;

    if (wasCameraDrag) {
      // This was a camera rotation drag, not a click - don't change selection
      return;
    }

    // If selection was already handled in mousedown, don't re-evaluate
    if (selectionAlreadyHandled) {
      return;
    }

    // Handle clicks on empty space (vertex/edge clicks are handled in mousedown)
    const clickPos = this._getMousePos(event);
    const target = this._getSelectionTarget(clickPos[0], clickPos[1], 20, 12);

    if (target.type === 'vertex') {
      // Clicked on a vertex
      this.selectedVertexIndex = target.index;
      this.selectedEdgeIndex = -1;
      this.element.focus();
      this.dirty = true;
    } else if (target.type === 'edge') {
      // Clicked on an edge
      this.selectedEdgeIndex = target.index;
      this.selectedVertexIndex = -1;
      this.element.focus();
      this.dirty = true;
    } else if (this.selectedVertexIndex >= 0) {
      // Clicked in empty space with a vertex selected
      if (this.mesh.degree(this.selectedVertexIndex) < 3) {
        // Spawn new vertex if selected vertex has room
        this.currentMousePos[0] = clickPos[0];
        this.currentMousePos[1] = clickPos[1];
        this._spawnVertex();
        this.element.focus();
      } else {
        // Can't spawn - deselect instead (don't preventDefault, allow focus change)
        this.selectedVertexIndex = -1;
        this.selectedEdgeIndex = -1;
        this.dirty = true;
      }
    } else if (this.selectedEdgeIndex >= 0) {
      // Clicked in empty space with an edge selected - deselect
      this.selectedEdgeIndex = -1;
      this.dirty = true;
    }
    // If nothing selected and clicked in empty space, do nothing special
    // (allow natural focus/blur behavior)

    this.onChange();
  }

  // Wheel is handled by orbit-camera-controller

  // ============ Touch Events ============

  _getTouchPos(touch, out = [0, 0]) {
    const rect = this.element.getBoundingClientRect();
    out[0] = touch.clientX - rect.left;
    out[1] = touch.clientY - rect.top;
    return out;
  }

  _onTouchStart(event) {
    if (event.touches.length !== 1) {
      // Multi-touch is handled by camera controller
      this.touchStartedOnVertex = false;
      this.touchVertexIndex = -1;
      return;
    }

    const touchPos = this._getTouchPos(event.touches[0]);
    const closest = this._getClosestVertex(touchPos[0], touchPos[1]);

    if (closest.index >= 0 && closest.distance < 35) {
      // Touch on a vertex - prevent camera from handling
      event.stopImmediatePropagation();
      event.preventDefault();

      this.touchStartedOnVertex = true;
      this.touchVertexIndex = closest.index;
      this.initialMousePos[0] = touchPos[0];
      this.initialMousePos[1] = touchPos[1];
      this.currentMousePos[0] = touchPos[0];
      this.currentMousePos[1] = touchPos[1];
      this.exitedDeadZone = false;

      if (this.selectedVertexIndex >= 0 && this.selectedVertexIndex !== closest.index) {
        this.candidateEdge = [this.selectedVertexIndex, closest.index];
      }
      this.activeVertexIndex = closest.index;
      this.selectedVertexIndex = closest.index;
      this.isDragging = true;
      this.dragMode = 'vertex';
      this.dirty = true;
    } else {
      // Let camera controller handle rotation
      this.touchStartedOnVertex = false;
      this.touchVertexIndex = -1;
      // Track for background drag detection (tap on empty space vs rotation)
      this.backgroundClickStart = [touchPos[0], touchPos[1]];
      this.backgroundExitedDeadZone = false;
    }
  }

  _onTouchMove(event) {
    // Track background touch drag (camera rotation) before early return
    if (event.touches.length === 1 && this.backgroundClickStart && !this.backgroundExitedDeadZone) {
      const touchPos = this._getTouchPos(event.touches[0]);
      const dx = touchPos[0] - this.backgroundClickStart[0];
      const dy = touchPos[1] - this.backgroundClickStart[1];
      if (Math.sqrt(dx * dx + dy * dy) >= this.deadZoneRadius) {
        this.backgroundExitedDeadZone = true;
      }
    }

    if (!this.touchStartedOnVertex || event.touches.length !== 1) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const touchPos = this._getTouchPos(event.touches[0]);
    this.previousMousePos[0] = this.currentMousePos[0];
    this.previousMousePos[1] = this.currentMousePos[1];
    this.currentMousePos[0] = touchPos[0];
    this.currentMousePos[1] = touchPos[1];

    if (!this.exitedDeadZone && !this._insideDeadZone()) {
      this.exitedDeadZone = true;
    }

    if (this.exitedDeadZone && this.activeVertexIndex >= 0) {
      this._dragVertex();
    }
  }

  _onTouchEnd(event) {
    if (!this.touchStartedOnVertex) {
      // Background touch ended - the synthetic click event will check backgroundExitedDeadZone
      // Don't reset here; let _onClick handle it
      return;
    }

    if (event.touches.length === 0) {
      // All fingers lifted
      if (!this.exitedDeadZone && this._insideDeadZone()) {
        // Tap without drag
        const closest = this._getClosestVertex(this.currentMousePos[0], this.currentMousePos[1]);

        if (closest.index >= 0 && closest.distance < 35) {
          // Tapped on existing vertex - maybe create edge
          if (this.candidateEdge) {
            this.mesh.addEdge(this.candidateEdge[0], this.candidateEdge[1]);
          }
          this.selectedVertexIndex = closest.index;
        }
      }

      this.touchStartedOnVertex = false;
      this.touchVertexIndex = -1;
      this.isDragging = false;
      this.dragMode = null;
      this.activeVertexIndex = -1;
      this.candidateEdge = null;
      this.dirty = true;
      this.onChange();
    }
  }

  // ============ Keyboard Events ============

  _onKeyDown(event) {
    // Prevent default browser actions for keys we handle
    switch (event.code) {
      case 'Space':
      case 'Backspace':
        event.preventDefault();
        event.stopPropagation();
        break;
    }
  }

  _onKeyUp(event) {
    switch (event.code) {
      case 'Backspace':
        if (this.selectedVertexIndex >= 0) {
          const newIdx = this.mesh.deleteVertex(this.selectedVertexIndex);
          this.selectedVertexIndex = newIdx;
          this.hoverVertexIndex = -1;
          this.hoverEdgeIndex = -1;
          this.activeVertexIndex = -1;
          this.dirty = true;
          event.preventDefault();
          event.stopPropagation();
        } else if (this.selectedEdgeIndex >= 0) {
          // Delete selected edge (preserves vertices)
          this.mesh.deleteEdge(this.selectedEdgeIndex);
          this.selectedEdgeIndex = -1;
          this.hoverEdgeIndex = -1;
          this.hoverVertexIndex = -1;
          this.dirty = true;
          event.preventDefault();
          event.stopPropagation();
        }
        break;

      case 'Space':
        this.selectedVertexIndex = -1;
        this.selectedEdgeIndex = -1;
        this.activeVertexIndex = -1;
        this.dirty = true;
        event.preventDefault();
        event.stopPropagation();
        break;


      case 'KeyE':
        if (this.selectedVertexIndex >= 0) {
          const newIdx = this.mesh.explodeVertex(this.selectedVertexIndex);
          this.selectedVertexIndex = newIdx;
          this.hoverVertexIndex = -1;
          this.activeVertexIndex = -1;
          this.dirty = true;
          event.preventDefault();
          event.stopPropagation();
        }
        break;

      case 'KeyH':
        // Stone-Wales transformation on selected edge
        if (this.selectedEdgeIndex >= 0) {
          const newEdgeIndex = this.mesh.stoneWales(this.selectedEdgeIndex);
          if (newEdgeIndex >= 0) {
            // Update selection to the new edge index (the A-B edge may have moved)
            this.selectedEdgeIndex = newEdgeIndex;
            this.hoverEdgeIndex = -1;
            this.hoverVertexIndex = -1;
          }
          this.dirty = true;
          event.preventDefault();
          event.stopPropagation();
        }
        break;

      case 'KeyA':
        // Aim camera at selected vertex, edge midpoint, or centroid
        if (this.selectedVertexIndex >= 0) {
          const pos = this.mesh.getPosition(this.selectedVertexIndex);
          vec3.copy(this.camera.center, pos);
        } else if (this.selectedEdgeIndex >= 0) {
          const edge = this.mesh.getEdge(this.selectedEdgeIndex);
          const p0 = this.mesh.getPosition(edge[0]);
          const p1 = this.mesh.getPosition(edge[1]);
          this.camera.center[0] = (p0[0] + p1[0]) / 2;
          this.camera.center[1] = (p0[1] + p1[1]) / 2;
          this.camera.center[2] = (p0[2] + p1[2]) / 2;
        } else {
          const centroid = this.mesh.computeCentroid();
          vec3.copy(this.camera.center, centroid);
        }
        this.camera.taint?.();
        this.dirty = true;
        event.preventDefault();
        event.stopPropagation();
        break;
    }

    // Handle 's' key (extend degree-1, split degree-2, or split edge)
    if (event.key === 's') {
      if (this.selectedVertexIndex >= 0) {
        const degree = this.mesh.degree(this.selectedVertexIndex);
        if (degree === 1) {
          // Extend degree-1 vertex with a new dangling vertex
          const newEdgeIdx = this.mesh.extendVertex(this.selectedVertexIndex);
          if (newEdgeIdx >= 0) {
            const edge = this.mesh.getEdge(newEdgeIdx);
            const newVertex = this.mesh.degree(edge[0]) === 1 ? edge[0] : edge[1];
            this.selectedVertexIndex = newVertex;
            this.selectedEdgeIndex = -1;
            this.hoverEdgeIndex = -1;
            this.hoverVertexIndex = -1;
            this.dirty = true;
          }
        } else if (degree === 2) {
          // Split degree-2 vertex into two degree-2 vertices
          const newVertexIdx = this.mesh.splitVertex(this.selectedVertexIndex);
          if (newVertexIdx !== this.selectedVertexIndex) {
            this.selectedVertexIndex = newVertexIdx;
            this.selectedEdgeIndex = -1;
            this.hoverEdgeIndex = -1;
            this.hoverVertexIndex = -1;
            this.dirty = true;
          }
        }
        event.preventDefault();
        event.stopPropagation();
      } else if (this.selectedEdgeIndex >= 0) {
        // Split selected edge
        const newEdgeIdx = this.mesh.splitEdge(this.selectedEdgeIndex);
        if (newEdgeIdx >= 0) {
          this.selectedEdgeIndex = newEdgeIdx;
          this.selectedVertexIndex = -1;
          this.hoverEdgeIndex = -1;
          this.hoverVertexIndex = -1;
          this.dirty = true;
        }
        event.preventDefault();
        event.stopPropagation();
      }
    }

    // Handle 'v' key (extend vertex with dangling edge)
    if (event.key === 'v') {
      if (this.selectedVertexIndex >= 0) {
        // Extend from selected vertex if it has room (degree < 3)
        const newEdgeIdx = this.mesh.extendVertex(this.selectedVertexIndex);
        if (newEdgeIdx >= 0) {
          // Select the new vertex (the degree-1 endpoint of the new edge)
          const edge = this.mesh.getEdge(newEdgeIdx);
          const newVertex = this.mesh.degree(edge[0]) === 1 ? edge[0] : edge[1];
          this.selectedVertexIndex = newVertex;
          this.selectedEdgeIndex = -1;
          this.hoverEdgeIndex = -1;
          this.hoverVertexIndex = -1;
          this.dirty = true;
        }
        event.preventDefault();
        event.stopPropagation();
      }
    }

    // Handle 'c' key (collapse edge or vertex)
    if (event.key === 'c') {
      if (this.selectedEdgeIndex >= 0) {
        // Collapse selected edge
        const newEdgeIdx = this.mesh.collapseEdge(this.selectedEdgeIndex);
        this.selectedEdgeIndex = newEdgeIdx;
        this.selectedVertexIndex = -1;
        this.hoverEdgeIndex = -1;
        this.hoverVertexIndex = -1;
        this.dirty = true;
        event.preventDefault();
        event.stopPropagation();
      } else if (this.selectedVertexIndex >= 0) {
        const degree = this.mesh.degree(this.selectedVertexIndex);
        if (degree === 1) {
          // Delete dangling vertex and select the adjacent vertex
          const adjacentVertex = this.mesh.deleteVertex(this.selectedVertexIndex);
          this.selectedVertexIndex = adjacentVertex;
          this.hoverVertexIndex = -1;
          this.activeVertexIndex = -1;
          this.dirty = true;
          event.preventDefault();
          event.stopPropagation();
        } else if (degree === 2) {
          // Collapse degree-2 vertex
          const newIdx = this.mesh.collapseVertex(this.selectedVertexIndex);
          this.selectedVertexIndex = newIdx;
          this.hoverVertexIndex = -1;
          this.activeVertexIndex = -1;
          this.dirty = true;
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }

    // Handle number keys 3-8 (add face on selected edge)
    if (this.selectedEdgeIndex >= 0) {
      const num = parseInt(event.key, 10);
      if (num >= 3 && num <= 8) {
        const success = this.mesh.addFaceOnEdge(this.selectedEdgeIndex, num);
        if (success) {
          this.dirty = true;
        }
        event.preventDefault();
        event.stopPropagation();
      }
    }

    this.onChange();
  }

  // ============ Actions ============

  _dragVertex() {
    const width = this.element.offsetWidth;
    const height = this.element.offsetHeight;
    const projectionView = this.projectionView;

    // Get current position in clip space
    const pos = this.mesh.getPosition(this.activeVertexIndex);
    const projected = vec3.create();
    vec3.transformMat4(projected, pos, projectionView);

    // Update x,y based on mouse position
    projected[0] = (2.0 * this.currentMousePos[0]) / width - 1.0;
    projected[1] = 1.0 - (2.0 * this.currentMousePos[1]) / height;

    // Unproject back to world space
    const invProjView = mat4.create();
    mat4.invert(invProjView, projectionView);

    const newPos = vec3.create();
    vec3.transformMat4(newPos, projected, invProjView);

    this.mesh.setPosition(this.activeVertexIndex, newPos[0], newPos[1], newPos[2]);
    this.dirty = true;
  }

  _dragEdge() {
    if (this.selectedEdgeIndex < 0) return;

    const width = this.element.offsetWidth;
    const height = this.element.offsetHeight;
    const projectionView = this.projectionView;

    // Get the two vertices of the edge
    const edge = this.mesh.getEdge(this.selectedEdgeIndex);
    const pos0 = this.mesh.getPosition(edge[0]);
    const pos1 = this.mesh.getPosition(edge[1]);

    // Compute the midpoint (used as reference for the drag)
    const midpoint = vec3.fromValues(
      (pos0[0] + pos1[0]) / 2,
      (pos0[1] + pos1[1]) / 2,
      (pos0[2] + pos1[2]) / 2
    );

    // Project midpoint to get current screen position and depth
    const projectedMid = vec3.create();
    vec3.transformMat4(projectedMid, midpoint, projectionView);

    // Compute screen delta from previous to current mouse position
    const prevClipX = (2.0 * this.previousMousePos[0]) / width - 1.0;
    const prevClipY = 1.0 - (2.0 * this.previousMousePos[1]) / height;
    const currClipX = (2.0 * this.currentMousePos[0]) / width - 1.0;
    const currClipY = 1.0 - (2.0 * this.currentMousePos[1]) / height;

    const deltaClipX = currClipX - prevClipX;
    const deltaClipY = currClipY - prevClipY;

    // Unproject both endpoints with the delta applied
    const invProjView = mat4.create();
    mat4.invert(invProjView, projectionView);

    // Move both vertices by the same screen-space delta
    for (const vertexIdx of [edge[0], edge[1]]) {
      const pos = this.mesh.getPosition(vertexIdx);
      const projected = vec3.create();
      vec3.transformMat4(projected, pos, projectionView);

      // Apply delta in clip space
      projected[0] += deltaClipX;
      projected[1] += deltaClipY;

      // Unproject back
      const newPos = vec3.create();
      vec3.transformMat4(newPos, projected, invProjView);

      this.mesh.setPosition(vertexIdx, newPos[0], newPos[1], newPos[2]);
    }

    this.dirty = true;
  }

  _spawnVertex() {
    // Only spawn if selected vertex has room for another edge
    if (this.mesh.degree(this.selectedVertexIndex) >= 3) return;

    const width = this.element.offsetWidth;
    const height = this.element.offsetHeight;
    const projectionView = this.projectionView;

    // Get selected vertex position in clip space (for z depth)
    const pos = this.mesh.getPosition(this.selectedVertexIndex);
    const projected = vec3.create();
    vec3.transformMat4(projected, pos, projectionView);

    // New vertex at mouse position with same depth
    projected[0] = (2.0 * this.currentMousePos[0]) / width - 1.0;
    projected[1] = 1.0 - (2.0 * this.currentMousePos[1]) / height;

    const invProjView = mat4.create();
    mat4.invert(invProjView, projectionView);

    const newPos = vec3.create();
    vec3.transformMat4(newPos, projected, invProjView);

    const newIdx = this.mesh.addVertex(newPos[0], newPos[1], newPos[2]);
    this.mesh.addEdge(this.selectedVertexIndex, newIdx);
    this.selectedVertexIndex = newIdx;
    this.dirty = true;
  }
}

export default MeshInteractions;
