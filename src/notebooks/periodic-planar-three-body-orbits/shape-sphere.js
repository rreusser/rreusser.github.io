// Shape sphere visualization - 3D view of the shape trajectory on a unit sphere

import { computeShapeFromPositions } from './jacobi-coords-figure.js';
import { floatRgbToHex } from './initial-conditions-figure.js';

// Create an icosphere with specified subdivision level
export function createIcosphere(subdivisions = 4) {
  const t = (1 + Math.sqrt(5)) / 2;

  let positions = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
  ];

  let cells = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];

  const midpointCache = {};
  function getMidpoint(i1, i2) {
    const key = i1 < i2 ? `${i1}_${i2}` : `${i2}_${i1}`;
    if (midpointCache[key] !== undefined) return midpointCache[key];
    const p1 = positions[i1];
    const p2 = positions[i2];
    const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2];
    const len = Math.sqrt(mid[0] * mid[0] + mid[1] * mid[1] + mid[2] * mid[2]);
    mid[0] /= len; mid[1] /= len; mid[2] /= len;
    const idx = positions.length;
    positions.push(mid);
    midpointCache[key] = idx;
    return idx;
  }

  for (let i = 0; i < subdivisions; i++) {
    const newCells = [];
    for (const [a, b, c] of cells) {
      const ab = getMidpoint(a, b);
      const bc = getMidpoint(b, c);
      const ca = getMidpoint(c, a);
      newCells.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    cells = newCells;
  }

  // Normalize all positions
  positions = positions.map(p => {
    const len = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);
    return [p[0] / len, p[1] / len, p[2] / len];
  });

  return { positions, cells };
}

// Compute collision points (punctures) on the shape sphere
export function getCollisionPoints(masses) {
  // These are the three points where two bodies collide
  // They correspond to specific positions in shape space
  return [
    computeShapeFromPositions([[0, 0], [1, 1], [1, 1]], masses), // m1-m2 collision
    computeShapeFromPositions([[1, 1], [0, 0], [1, 1]], masses), // m2-m3 collision
    computeShapeFromPositions([[1, 1], [1, 1], [0, 0]], masses)  // m1-m3 collision
  ];
}

// Create a circle (equator) on the sphere
export function createEquator(divisions = 100) {
  const points = [];
  for (let i = 0; i <= divisions; i++) {
    const theta = (2 * Math.PI * i) / divisions;
    points.push([Math.cos(theta), 0, Math.sin(theta)]);
  }
  return points;
}

// Identity matrix for grid rotation (no tilt)
const identityMat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

// Create a reusable draw command for rendering a globe with lat/lon grid
export function createDrawGlobeCommand(regl) {
  return regl({
    vert: `
      precision highp float;
      uniform mat4 projectionView;
      uniform mat3 rotation;
      uniform mat3 gridRotation;
      attribute vec3 position;
      varying vec3 vPosition;
      varying vec3 vNormal;
      void main() {
        vec3 rotatedPos = rotation * position;
        vPosition = rotatedPos;
        vNormal = gridRotation * rotatedPos;
        gl_Position = projectionView * vec4(rotatedPos, 1);
      }
    `,
    frag: `#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec3 vPosition;
varying vec3 vNormal;
uniform float gridDensity;
uniform float lineAlpha;
uniform float fillAlpha;
uniform vec3 uForeground;

float gridFactor(vec2 parameter, float width, float feather) {
  float w1 = width - feather * 0.5;
  vec2 d = fwidth(parameter);
  vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
  vec2 a2 = smoothstep(d * w1, d * (w1 + feather), looped);
  return min(a2.x, a2.y);
}

void main() {
  float lat = asin(vNormal.y);
  float lon = atan(vNormal.z, vNormal.x);
  vec2 gridCoord = vec2(lat, lon) * gridDensity / 3.14159265;
  float grid = gridFactor(gridCoord, 0.5, 1.0);
  float alpha = mix(lineAlpha, fillAlpha, grid);
  gl_FragColor = vec4(uForeground, alpha);
}`,
    attributes: {
      position: regl.prop('positions')
    },
    elements: regl.prop('elements'),
    uniforms: {
      projectionView: regl.prop('projectionView'),
      rotation: (ctx, props) => props.rotation || identityMat3,
      gridRotation: (ctx, props) => props.gridRotation || identityMat3,
      gridDensity: (ctx, props) => props.gridDensity || 4,
      lineAlpha: (ctx, props) => props.lineAlpha || 0.18,
      fillAlpha: (ctx, props) => props.fillAlpha || 0.06,
      uForeground: (ctx, props) => props.foreground || [0, 0, 0]
    },
    blend: {
      enable: true,
      func: { srcRGB: 'src alpha', dstRGB: 'one minus src alpha', srcAlpha: 1, dstAlpha: 1 }
    },
    depth: { enable: true, mask: false },
    cull: { enable: true, face: 'back' }
  });
}

// Rotation matrices
function rotateX(angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
}

function rotateY(angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
}

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ];
}

function multiply4(a, b) {
  const result = new Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[j * 4 + i] =
        a[0 * 4 + i] * b[j * 4 + 0] +
        a[1 * 4 + i] * b[j * 4 + 1] +
        a[2 * 4 + i] * b[j * 4 + 2] +
        a[3 * 4 + i] * b[j * 4 + 3];
    }
  }
  return result;
}

// Create the shape sphere visualization using regl
export function createShapeSphere(regl, opts = {}) {
  const icosphere = createIcosphere(4);

  // Create regl resources
  const spherePositions = regl.buffer(icosphere.positions.flat());
  const sphereElements = regl.elements(icosphere.cells.flat());
  const equatorPositions = regl.buffer(createEquator().flat());

  // Camera state
  let theta = opts.theta || 0.7;
  let phi = opts.phi || 0.3;
  let distance = opts.distance || 3.5;
  let dirty = true;

  // Theme colors
  let background = opts.background || [1, 1, 1];
  let foreground = opts.foreground || [0, 0, 0];

  // Arrow mesh data - defines the shape of the arrow (tail + head)
  // Components: x=perpendicular offset, y=along-line interpolation, z=arrowhead length offset, w=arrowhead width offset
  const arrowMesh = new Float32Array([
    // First triangle of tail
    -1, 0, 0, 0,
     1, 0, 0, 0,
     1, 1, -1, 0,
    // Second triangle of tail
    -1, 0, 0, 0,
     1, 1, -1, 0,
    -1, 1, -1, 0,
    // Arrowhead triangle
     0, 1, -1, -1,
     0, 1, -1,  1,
     0, 1,  0,  0
  ]);

  // Draw arrows command (instanced)
  const drawArrows = regl({
    vert: `
      precision highp float;
      uniform mat4 uProjectionView;
      uniform float uTailWidth, uAspect;
      uniform vec2 uArrowheadShape;
      attribute vec3 aPoint, aNextPoint;
      attribute vec4 aArrow;

      void main() {
        vec4 p = uProjectionView * vec4(aPoint, 1);
        vec4 pn = uProjectionView * vec4(aNextPoint, 1);
        gl_Position = mix(p, pn, aArrow.y);
        vec2 unitVector = normalize((pn.xy / pn.w - p.xy / p.w) * vec2(uAspect, 1));
        vec2 perpUnitVector = vec2(-unitVector.y, unitVector.x);
        gl_Position.xy += (
            perpUnitVector * (aArrow.x * uTailWidth + aArrow.w * uArrowheadShape.y) +
            unitVector * aArrow.z * uArrowheadShape.x
          ) / vec2(uAspect, 1) * gl_Position.w;
      }
    `,
    frag: `
      precision highp float;
      uniform vec4 uColor;
      void main() {
        gl_FragColor = uColor;
      }
    `,
    attributes: {
      aPoint: {
        buffer: regl.prop('positions'),
        stride: 12,
        offset: regl.prop('offset'),
        divisor: 1
      },
      aNextPoint: {
        buffer: regl.prop('positions'),
        stride: 12,
        offset: (ctx, props) => (props.offset || 0) + 12,
        divisor: 1
      },
      aArrow: arrowMesh
    },
    uniforms: {
      uProjectionView: regl.prop('projectionView'),
      uTailWidth: (ctx, props) => (props.tailWidth || 2.5) / ctx.viewportHeight * ctx.pixelRatio,
      uArrowheadShape: (ctx, props) => [
        (props.arrowheadLength || 12) / ctx.viewportHeight * ctx.pixelRatio * 2.0,
        (props.arrowheadWidth || 9) / ctx.viewportHeight * ctx.pixelRatio
      ],
      uAspect: ctx => ctx.viewportWidth / ctx.viewportHeight,
      uColor: regl.prop('color')
    },
    primitive: 'triangles',
    instances: (ctx, props) => (props.count || 2) - 1,
    count: 9,
    depth: { enable: true }
  });

  // Use shared globe drawing command
  const drawGlobe = createDrawGlobeCommand(regl);

  // Draw lines command
  const drawLines = regl({
    vert: `
      precision highp float;
      uniform mat4 projection, view;
      attribute vec3 position;
      void main() {
        gl_Position = projection * view * vec4(position, 1);
      }
    `,
    frag: `
      precision highp float;
      uniform vec4 color;
      void main() {
        gl_FragColor = color;
      }
    `,
    attributes: {
      position: regl.prop('positions')
    },
    uniforms: {
      projection: regl.prop('projection'),
      view: regl.prop('view'),
      color: regl.prop('color')
    },
    primitive: 'line strip',
    count: regl.prop('count'),
    depth: { enable: true }
  });

  // Draw points command
  const drawPoints = regl({
    vert: `
      precision highp float;
      uniform mat4 projection, view;
      uniform float pointSize, pixelRatio;
      attribute vec3 position;
      attribute vec4 color;
      varying vec4 vColor;
      void main() {
        vColor = color;
        gl_Position = projection * view * vec4(position, 1);
        gl_PointSize = pointSize * pixelRatio;
      }
    `,
    frag: `
      precision highp float;
      uniform vec3 uBackground;
      varying vec4 vColor;
      void main() {
        float r = length(gl_PointCoord * 2.0 - 1.0);
        if (r > 1.0) discard;
        vec3 c = r > 0.7 ? uBackground : vColor.rgb;
        gl_FragColor = vec4(c, vColor.a);
      }
    `,
    attributes: {
      position: regl.prop('positions'),
      color: regl.prop('colors')
    },
    uniforms: {
      projection: regl.prop('projection'),
      view: regl.prop('view'),
      pointSize: regl.prop('pointSize'),
      pixelRatio: regl.context('pixelRatio'),
      uBackground: regl.prop('background')
    },
    primitive: 'points',
    count: regl.prop('count'),
    depth: { enable: true }
  });

  // Shape position buffer (for arrow/current position)
  const shapePositionBuffer = regl.buffer(new Float32Array(6));
  const punctureBuffer = regl.buffer(new Float32Array(9));
  const punctureColors = regl.buffer(new Float32Array(12));

  // Projection line buffer (from origin to equator projection)
  const projectionLineBuffer = regl.buffer(new Float32Array(6));

  // Elevation arc buffer
  const arcDivisions = 50;
  const elevationArcBuffer = regl.buffer(new Float32Array((arcDivisions + 1) * 3));

  return {
    theta, phi, distance,
    dirty,

    setTheme(bg, fg) {
      background = bg;
      foreground = fg;
      dirty = true;
    },

    setShape(shapeVec) {
      // Shape vector to sphere: (nx, ny, nz) -> (ny, nz, nx) to match original orientation
      const p = [shapeVec[1], shapeVec[2], shapeVec[0]];
      shapePositionBuffer.subdata([0, 0, 0, ...p]);

      // Compute projection onto equator (xz plane, y=0)
      const projLen = Math.hypot(p[0], p[2]);
      if (projLen > 1e-6) {
        const projNorm = [p[0] / projLen, 0, p[2] / projLen];
        projectionLineBuffer.subdata([0, 0, 0, ...projNorm]);

        // Compute elevation arc from equator projection to shape position
        const elevation = Math.atan2(p[1], projLen);
        const arcData = new Float32Array((arcDivisions + 1) * 3);
        for (let i = 0; i <= arcDivisions; i++) {
          const angle = (elevation * i) / arcDivisions;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          // Point on arc: projNorm * cos(angle) + [0,1,0] * sin(angle)
          arcData[i * 3 + 0] = projNorm[0] * cosA;
          arcData[i * 3 + 1] = sinA;
          arcData[i * 3 + 2] = projNorm[2] * cosA;
        }
        elevationArcBuffer.subdata(arcData);
      }

      dirty = true;
    },

    setPunctures(masses) {
      const pts = getCollisionPoints(masses);
      // Transform to match sphere orientation
      punctureBuffer.subdata(pts.flatMap(p => [p[1], p[2], p[0]]));
      punctureColors.subdata([
        0.2, 0.9, 0.1, 1,  // Green (m1-m2)
        0.9, 0.1, 0.2, 1,  // Red (m2-m3)
        0.1, 0.2, 0.9, 1   // Blue (m1-m3)
      ]);
      dirty = true;
    },

    rotate(dTheta, dPhi) {
      theta += dTheta;
      phi = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, phi + dPhi));
      dirty = true;
    },

    taint() {
      dirty = true;
    },

    render(width, height) {
      if (!dirty) return;
      dirty = false;

      const aspect = width / height;
      const projection = perspective(Math.PI / 4, aspect, 0.1, 100);

      // Camera position
      const cx = distance * Math.cos(phi) * Math.sin(theta);
      const cy = distance * Math.sin(phi);
      const cz = distance * Math.cos(phi) * Math.cos(theta);

      // Simple lookAt
      const view = multiply4(
        rotateX(-phi),
        rotateY(-theta)
      );
      view[12] = 0;
      view[13] = 0;
      view[14] = -distance;

      const projectionView = multiply4(projection, view);
      const uniforms = { projection, view };

      regl.clear({ color: [0, 0, 0, 0], depth: 1 });

      const lineColor = [...foreground, 0.6];

      // Draw sphere
      drawGlobe({
        projectionView,
        positions: { buffer: spherePositions, stride: 12 },
        elements: sphereElements,
        foreground
      });

      // Draw equator
      drawLines({
        ...uniforms,
        positions: equatorPositions,
        count: 101,
        color: lineColor
      });

      // Draw projection line (from origin to equator projection)
      drawLines({
        ...uniforms,
        positions: projectionLineBuffer,
        count: 2,
        color: lineColor
      });

      // Draw elevation arc
      drawLines({
        ...uniforms,
        positions: elevationArcBuffer,
        count: arcDivisions + 1,
        color: lineColor
      });

      // Draw shape arrow with proper arrowhead
      drawArrows({
        projectionView,
        positions: shapePositionBuffer,
        offset: 0,
        count: 2,
        color: [0.18, 0.63, 0.83, 1],
        tailWidth: 2.5,
        arrowheadLength: 12,
        arrowheadWidth: 9
      });

      // Draw puncture points
      drawPoints({
        ...uniforms,
        positions: punctureBuffer,
        colors: punctureColors,
        count: 3,
        pointSize: 12,
        background
      });
    },

    destroy() {
      spherePositions.destroy();
      sphereElements.destroy();
      equatorPositions.destroy();
      shapePositionBuffer.destroy();
      punctureBuffer.destroy();
      punctureColors.destroy();
      projectionLineBuffer.destroy();
      elevationArcBuffer.destroy();
    }
  };
}

// Stereographic projection from shape sphere onto a plane
// Projects from north pole (0, 1, 0) onto the y = -1 plane
export function stereographicProject(shape) {
  // shape = [x, y, z] on unit sphere
  // Project from pole (0, 1, 0) onto plane y = -1
  const denom = 1 - shape[1];
  if (Math.abs(denom) < 1e-10) return [Infinity, -1, Infinity];
  return [shape[0] / denom * 2, -1, shape[2] / denom * 2];
}

// Compute rotation matrix that aligns a vector to the +Y axis
function computeAlignToYMatrix(vec) {
  // Normalize input vector
  const len = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
  const nx = vec[0] / len, ny = vec[1] / len, nz = vec[2] / len;

  // If already aligned with Y, return identity
  if (Math.abs(ny - 1) < 1e-6) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  if (Math.abs(ny + 1) < 1e-6) return [1, 0, 0, 0, -1, 0, 0, 0, -1]; // flip

  // Axis of rotation: cross product of vec with Y axis (0, 1, 0)
  // (nx, ny, nz) x (0, 1, 0) = (nz, 0, -nx)
  const axisLen = Math.sqrt(nz * nz + nx * nx);
  const ax = nz / axisLen, az = -nx / axisLen;

  // Angle of rotation
  const cosA = ny;
  const sinA = Math.sqrt(1 - ny * ny);

  // Rodrigues' rotation formula: R = I + sin(a)*K + (1-cos(a))*K^2
  // where K is skew-symmetric matrix of axis (ax, 0, az)
  // K = [[0, -az, 0], [az, 0, -ax], [0, ax, 0]]
  const oneMinusCos = 1 - cosA;

  return [
    cosA + ax * ax * oneMinusCos, ax * az * oneMinusCos, -az * sinA,
    ax * az * oneMinusCos, cosA + oneMinusCos * 0, ax * sinA,
    az * sinA, -ax * sinA, cosA + az * az * oneMinusCos
  ];
}

// Apply 3x3 rotation matrix to a 3D point
function applyRotation(mat, p) {
  return [
    mat[0] * p[0] + mat[3] * p[1] + mat[6] * p[2],
    mat[1] * p[0] + mat[4] * p[1] + mat[7] * p[2],
    mat[2] * p[0] + mat[5] * p[1] + mat[8] * p[2]
  ];
}

// Create orbit trajectory shape sphere visualization
export function createOrbitShapeSphere(regl, shapeTrajectory, masses, opts = {}, createDrawLinesFactory = null) {
  const icosphere = createIcosphere(4);

  // Compute puncture points - one will be placed at north pole for projection
  const punctures = getCollisionPoints(masses);

  // Find which puncture to place at north pole - use m1-m3 collision (index 2)
  // This is the standard choice for stereographic projection
  const poleIndex = 2; // m1-m3 collision at north pole
  const rotationMatrix = computeAlignToYMatrix(punctures[poleIndex]);

  // Transform shape trajectory: apply rotation to align puncture to north pole
  const sphereTrajectory = new Float32Array(shapeTrajectory.length);
  const projectedTrajectory = new Float32Array(shapeTrajectory.length);

  for (let i = 0; i < shapeTrajectory.length; i += 3) {
    const shape = [shapeTrajectory[i], shapeTrajectory[i + 1], shapeTrajectory[i + 2]];
    const rotated = applyRotation(rotationMatrix, shape);

    sphereTrajectory[i] = rotated[0];
    sphereTrajectory[i + 1] = rotated[1];
    sphereTrajectory[i + 2] = rotated[2];

    // Stereographic projection from north pole
    const proj = stereographicProject(rotated);
    projectedTrajectory[i] = proj[0];
    projectedTrajectory[i + 1] = proj[1];
    projectedTrajectory[i + 2] = proj[2];
  }

  // Transform puncture points with the same rotation
  const rotatedPunctures = punctures.map(p => applyRotation(rotationMatrix, p));

  // Puncture data: 3 on sphere + 2 projected (the third is at north pole, projects to infinity)
  const punctureData = new Float32Array(5 * 3);
  const punctureColors = new Float32Array(5 * 4);

  for (let i = 0; i < 3; i++) {
    punctureData[i * 3] = rotatedPunctures[i][0];
    punctureData[i * 3 + 1] = rotatedPunctures[i][1];
    punctureData[i * 3 + 2] = rotatedPunctures[i][2];
  }

  // Project the two non-pole punctures
  const proj0 = stereographicProject(rotatedPunctures[0]);
  const proj1 = stereographicProject(rotatedPunctures[1]);
  punctureData[9] = proj0[0]; punctureData[10] = proj0[1]; punctureData[11] = proj0[2];
  punctureData[12] = proj1[0]; punctureData[13] = proj1[1]; punctureData[14] = proj1[2];

  // Colors: green, red, blue for sphere; green, red for projected
  punctureColors.set([0.2, 0.9, 0.1, 1, 0.9, 0.1, 0.2, 1, 0.1, 0.2, 0.9, 1, 0.2, 0.9, 0.1, 1, 0.9, 0.1, 0.2, 1]);

  // Reference line from projected punctures through pole
  const referenceLineData = new Float32Array([
    proj1[0], proj1[1], proj1[2],
    0, 1, 0,
    proj0[0], proj0[1], proj0[2]
  ]);

  // Rotate equator to match the coordinate system rotation
  const rotatedEquator = createEquator(200).map(p => applyRotation(rotationMatrix, p));

  // Create buffers (sphere positions stay unrotated - rotation applied in shader)
  const spherePositions = regl.buffer(icosphere.positions.flat());
  const sphereElements = regl.elements(icosphere.cells.flat());
  const trajectoryBuffer = regl.buffer(sphereTrajectory);
  const projectedBuffer = regl.buffer(projectedTrajectory);
  const equatorBuffer = regl.buffer(rotatedEquator.flat());
  const punctureBuffer = regl.buffer(punctureData);
  const punctureColorsBuffer = regl.buffer(punctureColors);
  const referenceLineBuffer = regl.buffer(referenceLineData);

  // Camera state
  let theta = opts.theta || 0.7;
  let phi = opts.phi || 0.1;
  let distance = opts.distance || 5;
  let dirty = true;

  // Theme colors
  let background = opts.background || [1, 1, 1];
  let foreground = opts.foreground || [0, 0, 0];

  // Display rotation to tip the grid - rotate 90° around X so equator appears vertical
  const displayTilt = [
    1, 0, 0,
    0, 0, 1,
    0, -1, 0
  ];

  // Use shared globe drawing command
  const drawGlobe = createDrawGlobeCommand(regl);

  // Simple line drawing for thin lines (equator, reference)
  const drawThinLines = regl({
    vert: `
      precision highp float;
      uniform mat4 projectionView;
      attribute vec3 position;
      void main() { gl_Position = projectionView * vec4(position, 1); }
    `,
    frag: `
      precision highp float;
      uniform vec4 color;
      void main() { gl_FragColor = color; }
    `,
    attributes: { position: regl.prop('positions') },
    uniforms: { projectionView: regl.prop('projectionView'), color: regl.prop('color') },
    primitive: 'line strip',
    count: regl.prop('count'),
    depth: { enable: true }
  });

  // Thick line drawing using regl-gpu-lines (if available)
  let drawThickLines = null;

  if (createDrawLinesFactory) {
    drawThickLines = createDrawLinesFactory(regl, {
      vert: `
        precision highp float;
        #pragma lines: attribute vec3 position;
        #pragma lines: position = getPosition(position);
        #pragma lines: width = getWidth();
        uniform mat4 projectionView;
        uniform float lineWidth;
        vec4 getPosition(vec3 p) { return projectionView * vec4(p, 1); }
        float getWidth() { return lineWidth; }
      `,
      frag: `
        precision highp float;
        uniform vec4 color;
        void main() { gl_FragColor = color; }
      `,
      uniforms: {
        projectionView: regl.prop('projectionView'),
        color: regl.prop('color'),
        lineWidth: (ctx, props) => (props.lineWidth || 2) * ctx.pixelRatio
      },
      depth: { enable: true }
    });
  }

  const drawPoints = regl({
    vert: `
      precision highp float;
      uniform mat4 projectionView;
      uniform float pointSize, pixelRatio;
      attribute vec3 position;
      attribute vec4 color;
      varying vec4 vColor;
      void main() {
        vColor = color;
        gl_Position = projectionView * vec4(position, 1);
        gl_PointSize = pointSize * pixelRatio;
      }
    `,
    frag: `
      precision highp float;
      uniform vec3 uBackground;
      varying vec4 vColor;
      void main() {
        float r = length(gl_PointCoord * 2.0 - 1.0);
        if (r > 1.0) discard;
        vec3 c = r > 0.7 ? uBackground : vColor.rgb;
        gl_FragColor = vec4(c, vColor.a);
      }
    `,
    attributes: {
      position: regl.prop('positions'),
      color: regl.prop('colors')
    },
    uniforms: {
      projectionView: regl.prop('projectionView'),
      pointSize: regl.prop('pointSize'),
      pixelRatio: regl.context('pixelRatio'),
      uBackground: regl.prop('background')
    },
    primitive: 'points',
    count: regl.prop('count'),
    depth: { enable: true }
  });

  const trajectoryCount = shapeTrajectory.length / 3;

  return {
    get theta() { return theta; },
    get phi() { return phi; },
    get dirty() { return dirty; },

    rotate(dTheta, dPhi) {
      theta += dTheta;
      phi = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, phi + dPhi));
      dirty = true;
    },

    taint() { dirty = true; },

    setTheme(bg, fg) {
      background = bg;
      foreground = fg;
      dirty = true;
    },

    render(width, height) {
      if (!dirty) return;
      dirty = false;

      const aspect = width / height;
      const projection = perspective(Math.PI / 5, aspect, 0.1, 100);
      const view = multiply4(rotateX(-phi), rotateY(-theta));
      view[12] = 0; view[13] = 0.15; view[14] = -distance;
      const projectionView = multiply4(projection, view);

      regl.clear({ color: [0, 0, 0, 0], depth: 1 });

      const lineColor = [...foreground, 0.6];
      // Mix 20% toward foreground at full opacity to avoid accumulation with dense overlapping lines
      const dimColor = [
        foreground[0] * 0.2 + background[0] * 0.8,
        foreground[1] * 0.2 + background[1] * 0.8,
        foreground[2] * 0.2 + background[2] * 0.8,
        1.0
      ];

      // Draw sphere with rotation applied for correct grid orientation
      drawGlobe({
        projectionView,
        positions: { buffer: spherePositions, stride: 12 },
        elements: sphereElements,
        rotation: rotationMatrix,
        gridRotation: displayTilt,
        gridDensity: 4,
        foreground
      });

      // Draw equator
      drawThinLines({ projectionView, positions: equatorBuffer, count: 201, color: lineColor });

      // Draw trajectory on sphere (use thick lines if available)
      if (drawThickLines) {
        drawThickLines({
          projectionView,
          vertexCount: trajectoryCount,
          vertexAttributes: {
            position: { buffer: trajectoryBuffer, stride: 12, offset: 0 }
          },
          color: [0.18, 0.63, 0.83, 1],
          lineWidth: 1.7
        });
      } else {
        drawThinLines({ projectionView, positions: trajectoryBuffer, count: trajectoryCount, color: [0.18, 0.63, 0.83, 1] });
      }

      // Draw projected trajectory (use thick lines if available)
      if (drawThickLines) {
        drawThickLines({
          projectionView,
          vertexCount: trajectoryCount,
          vertexAttributes: {
            position: { buffer: projectedBuffer, stride: 12, offset: 0 }
          },
          color: dimColor,
          lineWidth: 1.7
        });
      } else {
        drawThinLines({ projectionView, positions: projectedBuffer, count: trajectoryCount, color: dimColor });
      }

      // Draw reference line
      drawThinLines({ projectionView, positions: referenceLineBuffer, count: 3, color: dimColor });

      // Draw puncture points
      drawPoints({ projectionView, positions: punctureBuffer, colors: punctureColorsBuffer, count: 5, pointSize: 12, background });
    },

    destroy() {
      spherePositions.destroy();
      sphereElements.destroy();
      trajectoryBuffer.destroy();
      projectedBuffer.destroy();
      equatorBuffer.destroy();
      punctureBuffer.destroy();
      punctureColorsBuffer.destroy();
      referenceLineBuffer.destroy();
    }
  };
}

// Create the linked Jacobi + Shape Sphere visualization
export function createLinkedJacobiShapeSphere(d3, regl, initialConditions, drawingParams, opts = {}) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexWrap = 'wrap';
  container.style.gap = '20px';
  container.style.alignItems = 'flex-start';

  // Import and create Jacobi figure
  const { createJacobiCoordsFigure } = opts.jacobiFigure;
  const jacobiFigure = createJacobiCoordsFigure(d3, initialConditions, drawingParams, {
    width: Math.min(opts.width || 400, 400),
    height: Math.min((opts.width || 400) * 0.7, 280)
  });

  const jacobiWrapper = document.createElement('figure');
  jacobiWrapper.style.margin = '0';
  jacobiWrapper.appendChild(jacobiFigure.node);
  const jacobiCaption = document.createElement('figcaption');
  jacobiCaption.textContent = 'Jacobi coordinates. Drag the masses to see the effect in shape space.';
  jacobiWrapper.appendChild(jacobiCaption);
  container.appendChild(jacobiWrapper);

  // Create canvas for shape sphere
  const sphereSize = Math.min(opts.width || 400, 400);
  const sphereHeight = Math.floor(sphereSize * 0.7);
  const canvas = document.createElement('canvas');
  canvas.width = sphereSize * devicePixelRatio;
  canvas.height = sphereHeight * devicePixelRatio;
  canvas.style.width = `${sphereSize}px`;
  canvas.style.height = `${sphereHeight}px`;

  const sphereWrapper = document.createElement('figure');
  sphereWrapper.style.margin = '0';
  sphereWrapper.appendChild(canvas);
  const sphereCaption = document.createElement('figcaption');
  sphereCaption.textContent = 'Shape sphere with collision points marked.';
  sphereWrapper.appendChild(sphereCaption);
  container.appendChild(sphereWrapper);

  // Create regl context for shape sphere
  const sphereRegl = regl({ canvas, attributes: { antialias: true } });
  const shapeSphere = createShapeSphere(sphereRegl, { theta: 0.7, phi: 0.3 });

  // Initialize punctures and shape
  shapeSphere.setPunctures(initialConditions.m);
  shapeSphere.setShape(jacobiFigure.getShape());
  shapeSphere.render(sphereSize, sphereHeight);

  // Link: when Jacobi figure changes, update shape sphere
  jacobiFigure.addEventListener('input', () => {
    shapeSphere.setShape(jacobiFigure.getShape());
    shapeSphere.render(sphereSize, sphereHeight);
  });

  // Drag to rotate shape sphere
  let isDragging = false;
  let lastX = 0, lastY = 0;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    shapeSphere.rotate(dx * 0.01, dy * 0.01);
    shapeSphere.render(sphereSize, sphereHeight);
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  canvas.style.cursor = 'grab';

  return {
    element: container,
    jacobiFigure,
    shapeSphere,
    destroy() {
      shapeSphere.destroy();
      sphereRegl.destroy();
    }
  };
}
