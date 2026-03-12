// Shape projection visualization - 2D stereographic projection of shape trajectory

import { computeShapeFromPositions } from './jacobi-coords-figure.js';

// Compute rotation matrix that aligns a vector to the +Y axis
function computeAlignToYMatrix(vec) {
  const len = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
  const nx = vec[0] / len, ny = vec[1] / len, nz = vec[2] / len;

  if (Math.abs(ny - 1) < 1e-6) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  if (Math.abs(ny + 1) < 1e-6) return [1, 0, 0, 0, -1, 0, 0, 0, -1];

  const axisLen = Math.sqrt(nz * nz + nx * nx);
  const ax = nz / axisLen, az = -nx / axisLen;
  const cosA = ny;
  const oneMinusCos = 1 - cosA;
  const sinA = Math.sqrt(1 - ny * ny);

  return [
    cosA + ax * ax * oneMinusCos, ax * az * oneMinusCos, -az * sinA,
    ax * az * oneMinusCos, cosA, ax * sinA,
    az * sinA, -ax * sinA, cosA + az * az * oneMinusCos
  ];
}

function applyRotation(mat, p) {
  return [
    mat[0] * p[0] + mat[3] * p[1] + mat[6] * p[2],
    mat[1] * p[0] + mat[4] * p[1] + mat[7] * p[2],
    mat[2] * p[0] + mat[5] * p[1] + mat[8] * p[2]
  ];
}

// Compute shape vector from trajectory position data (from three-body-physics.js)
export function computeShapeFromTrajectory(position, masses, index) {
  const i = index * 9;
  const [m1, m2, m3] = masses;

  // Compute normalized Jacobi coordinates
  const r1x = (position[i] - position[i + 3]) / Math.sqrt(2);
  const r1y = (position[i + 1] - position[i + 4]) / Math.sqrt(2);
  const r2x = ((m1 * position[i] + m2 * position[i + 3]) / (m1 + m2) - position[i + 6]) * 2 / Math.sqrt(6);
  const r2y = ((m1 * position[i + 1] + m2 * position[i + 4]) / (m1 + m2) - position[i + 7]) * 2 / Math.sqrt(6);

  const r1sq = r1x * r1x + r1y * r1y;
  const r2sq = r2x * r2x + r2y * r2y;
  const denom = r1sq + r2sq;

  return [
    2 * (r1x * r2x + r1y * r2y) / denom,
    (r2sq - r1sq) / denom,
    2 * (r1x * r2y - r1y * r2x) / denom
  ];
}

// Stereographic projection from unit sphere to plane
// Projects from the point (0, 1, 0) onto the xz plane
export function stereographicProject(shape) {
  // shape = [nx, ny, nz]
  // Project: (x', z') = (nx / (1 - ny), nz / (1 - ny))
  const denom = 1 - shape[1];
  if (Math.abs(denom) < 1e-10) {
    // Point is at or near the projection pole
    return [Infinity, Infinity];
  }
  return [shape[0] / denom * 2, shape[2] / denom * 2];
}

// Compute full shape trajectory from position data
export function computeShapeTrajectory(trajectory, masses) {
  const result = [];
  for (let i = 0; i < trajectory.t.length; i++) {
    result.push(computeShapeFromTrajectory(trajectory.position, masses, i));
  }
  return result;
}

// Get the collision points on the shape sphere
export function getCollisionPoints(masses) {
  return [
    computeShapeFromPositions([[0, 0], [1, 1], [1, 1]], masses), // m1-m2 collision
    computeShapeFromPositions([[1, 1], [0, 0], [1, 1]], masses), // m2-m3 collision
    computeShapeFromPositions([[1, 1], [1, 1], [0, 0]], masses)  // m1-m3 collision
  ];
}

// Compute projected shape trajectory with rotation to align pole
// This matches the 3D visualization: one collision point at the north pole
export function computeProjectedShapeTrajectory(trajectory, masses, tArray) {
  const punctures = getCollisionPoints(masses);
  const rotationMatrix = computeAlignToYMatrix(punctures[2]); // m1-m3 at pole

  const result = [];
  const n = tArray.length;
  for (let i = 0; i < n; i++) {
    const shape = computeShapeFromTrajectory(trajectory, masses, i);
    const rotated = applyRotation(rotationMatrix, shape);
    const projected = stereographicProject(rotated);
    // Store as [x, y, t] for animation
    result.push(projected[0], projected[1], tArray[i]);
  }
  return new Float32Array(result);
}

// Get projected collision points (after rotation)
export function getProjectedCollisionPoints(masses) {
  const punctures = getCollisionPoints(masses);
  const rotationMatrix = computeAlignToYMatrix(punctures[2]);

  return punctures
    .map(p => applyRotation(rotationMatrix, p))
    .map(stereographicProject)
    .filter(p => isFinite(p[0]) && isFinite(p[1]));
}

// Compute bounds of projected trajectory for setting up axes
export function computeProjectedBounds(trajectory, masses) {
  const projectedData = computeProjectedShapeTrajectory(trajectory.position, masses, trajectory.t);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < projectedData.length; i += 3) {
    if (isFinite(projectedData[i]) && isFinite(projectedData[i + 1])) {
      minX = Math.min(minX, projectedData[i]);
      maxX = Math.max(maxX, projectedData[i]);
      minY = Math.min(minY, projectedData[i + 1]);
      maxY = Math.max(maxY, projectedData[i + 1]);
    }
  }
  // Add padding
  const pad = Math.max(maxX - minX, maxY - minY) * 0.1;
  return { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad };
}

// Create the 2D projected shape visualization using regl with axes object
export function createShapeProjection2D(regl, trajectory, masses, axes, reglAxesViewport, opts = {}, createDrawLinesFactory = null) {
  const projectedData = computeProjectedShapeTrajectory(trajectory.position, masses, trajectory.t);
  const collisionPoints = getProjectedCollisionPoints(masses);
  const vertexCount = trajectory.t.length;
  const tPeriod = trajectory.t[trajectory.t.length - 1];

  // Create buffers
  const trajectoryBuffer = regl.buffer(projectedData);
  const punctureBuffer = regl.buffer(new Float32Array(collisionPoints.flat()));
  const punctureColors = regl.buffer(new Float32Array([
    0.2, 0.9, 0.1, 1,  // Green (m1-m2)
    0.9, 0.1, 0.2, 1   // Red (m2-m3)
  ]));

  // Drawing parameters
  const color = opts.color || [0.18, 0.63, 0.83];
  const speed = opts.speed || 1;
  let dirty = true;

  // Thick line drawing using regl-gpu-lines
  let drawThickLines = null;
  if (createDrawLinesFactory) {
    drawThickLines = createDrawLinesFactory(regl, {
      vert: `
        precision highp float;
        #pragma lines: attribute vec3 position;
        #pragma lines: position = getPosition(position);
        #pragma lines: width = getWidth();
        uniform mat4 view;
        uniform float timeScale, timeShift, lineWidth;
        vec4 getPosition(vec3 p) {
          return view * vec4(p.xy, (p.z * timeScale - timeShift) * 2.0 - 1.0, 1);
        }
        float getWidth() { return lineWidth; }
      `,
      frag: `
        precision highp float;
        uniform vec4 color;
        void main() { gl_FragColor = color; }
      `,
      uniforms: {
        view: () => axes.view,
        color: regl.prop('color'),
        timeScale: regl.prop('timeScale'),
        timeShift: regl.prop('timeShift'),
        lineWidth: (ctx, props) => (props.lineWidth || 2) * ctx.pixelRatio
      },
      depth: { enable: true },
      viewport: reglAxesViewport(axes),
      scissor: { enable: true, box: reglAxesViewport(axes) }
    });
  }

  // Thin line fallback
  const drawThinLines = regl({
    vert: `
      precision highp float;
      uniform mat4 view;
      uniform float timeScale, timeShift;
      attribute vec3 position;
      void main() {
        gl_Position = view * vec4(position.xy, (position.z * timeScale - timeShift) * 2.0 - 1.0, 1);
      }
    `,
    frag: `
      precision highp float;
      uniform vec4 color;
      void main() { gl_FragColor = color; }
    `,
    attributes: { position: trajectoryBuffer },
    uniforms: {
      view: () => axes.view,
      color: regl.prop('color'),
      timeScale: regl.prop('timeScale'),
      timeShift: regl.prop('timeShift')
    },
    primitive: 'line strip',
    count: vertexCount,
    depth: { enable: true },
    viewport: reglAxesViewport(axes),
    scissor: { enable: true, box: reglAxesViewport(axes) }
  });

  // Draw points command
  const drawPoints = regl({
    vert: `
      precision highp float;
      uniform mat4 view;
      uniform float pointSize, pixelRatio;
      attribute vec2 position;
      attribute vec4 color;
      varying vec4 vColor;
      void main() {
        vColor = color;
        gl_Position = view * vec4(position, 0, 1);
        gl_PointSize = pointSize * pixelRatio;
      }
    `,
    frag: `
      precision highp float;
      varying vec4 vColor;
      void main() {
        float r = length(gl_PointCoord * 2.0 - 1.0);
        if (r > 1.0) discard;
        vec3 c = r > 0.7 ? vec3(1) : vColor.rgb;
        gl_FragColor = vec4(c, vColor.a);
      }
    `,
    attributes: {
      position: { buffer: punctureBuffer, stride: 8 },
      color: punctureColors
    },
    uniforms: {
      view: () => axes.view,
      pointSize: regl.prop('pointSize'),
      pixelRatio: regl.context('pixelRatio')
    },
    primitive: 'points',
    count: collisionPoints.length,
    depth: { enable: false },
    viewport: reglAxesViewport(axes),
    scissor: { enable: true, box: reglAxesViewport(axes) }
  });

  return {
    get dirty() { return dirty; },
    taint() { dirty = true; },

    render(time = 0) {
      const ts = time * speed;
      const baseTimeShift = ((ts % (tPeriod * 2)) / tPeriod) - 1;
      const timeScale = 1 / tPeriod;

      regl.clear({ color: [0, 0, 0, 0], depth: 1 });

      // Draw trajectory twice with offset for continuous animation
      const timeShifts = [baseTimeShift, baseTimeShift - 2];

      for (const timeShift of timeShifts) {
        if (drawThickLines) {
          drawThickLines({
            vertexCount,
            vertexAttributes: {
              position: { buffer: trajectoryBuffer, stride: 12, offset: 0 }
            },
            color: [...color, 1],
            timeScale,
            timeShift,
            lineWidth: 1.7
          });
        } else {
          drawThinLines({ color: [...color, 1], timeScale, timeShift });
        }
      }

      // Draw puncture points
      drawPoints({ pointSize: 12 });

      dirty = true;
    },

    destroy() {
      trajectoryBuffer.destroy();
      punctureBuffer.destroy();
      punctureColors.destroy();
    }
  };
}
