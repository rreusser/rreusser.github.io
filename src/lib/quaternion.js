/**
 * Quaternion math utilities for 3D camera rotations
 * Quaternion representation: [x, y, z, w] where w is the scalar component
 */

/**
 * Create identity quaternion [0, 0, 0, 1]
 */
export function identity() {
  return [0, 0, 0, 1];
}

/**
 * Create quaternion from axis-angle representation
 * @param {number[]} axis - Normalized axis vector [x, y, z]
 * @param {number} angle - Rotation angle in radians
 * @returns {number[]} Quaternion [x, y, z, w]
 */
export function fromAxisAngle(axis, angle) {
  const halfAngle = angle / 2;
  const s = Math.sin(halfAngle);
  return [
    axis[0] * s,
    axis[1] * s,
    axis[2] * s,
    Math.cos(halfAngle)
  ];
}

/**
 * Create quaternion from Euler angles (phi, theta)
 * Used for converting spherical coordinates to quaternion
 * @param {number} phi - Azimuthal angle (rotation around Y)
 * @param {number} theta - Polar angle (elevation)
 * @returns {number[]} Quaternion [x, y, z, w]
 */
export function fromSpherical(phi, theta) {
  // Rotation around Y axis (phi), then around right axis (theta)
  const cy = Math.cos(phi / 2);
  const sy = Math.sin(phi / 2);
  const cp = Math.cos(theta / 2);
  const sp = Math.sin(theta / 2);

  return [
    cy * sp,
    sy * cp,
    -sy * sp,
    cy * cp
  ];
}

/**
 * Multiply two quaternions: q1 * q2
 * @param {number[]} q1 - First quaternion
 * @param {number[]} q2 - Second quaternion
 * @returns {number[]} Result quaternion
 */
export function multiply(q1, q2) {
  return [
    q1[3] * q2[0] + q1[0] * q2[3] + q1[1] * q2[2] - q1[2] * q2[1],
    q1[3] * q2[1] - q1[0] * q2[2] + q1[1] * q2[3] + q1[2] * q2[0],
    q1[3] * q2[2] + q1[0] * q2[1] - q1[1] * q2[0] + q1[2] * q2[3],
    q1[3] * q2[3] - q1[0] * q2[0] - q1[1] * q2[1] - q1[2] * q2[2]
  ];
}

/**
 * Normalize a quaternion
 * @param {number[]} q - Quaternion to normalize
 * @returns {number[]} Normalized quaternion
 */
export function normalize(q) {
  const len = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
  if (len < 0.0001) return identity();
  return [q[0]/len, q[1]/len, q[2]/len, q[3]/len];
}

/**
 * Rotate a vector by a quaternion
 * @param {number[]} v - Vector [x, y, z]
 * @param {number[]} q - Quaternion [x, y, z, w]
 * @returns {number[]} Rotated vector
 */
export function rotateVector(v, q) {
  // v' = q * v * q^-1
  // Optimized version avoiding quaternion inverse
  const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
  const vx = v[0], vy = v[1], vz = v[2];

  // t = 2 * cross(q.xyz, v)
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);

  // v' = v + q.w * t + cross(q.xyz, t)
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx)
  ];
}

/**
 * Convert quaternion to 4x4 rotation matrix (column-major)
 * @param {number[]} q - Quaternion [x, y, z, w]
 * @returns {Float32Array} 4x4 matrix
 */
export function toMatrix(q) {
  const x = q[0], y = q[1], z = q[2], w = q[3];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;

  const mat = new Float32Array(16);
  mat[0] = 1 - (yy + zz);
  mat[1] = xy + wz;
  mat[2] = xz - wy;
  mat[3] = 0;

  mat[4] = xy - wz;
  mat[5] = 1 - (xx + zz);
  mat[6] = yz + wx;
  mat[7] = 0;

  mat[8] = xz + wy;
  mat[9] = yz - wx;
  mat[10] = 1 - (xx + yy);
  mat[11] = 0;

  mat[12] = 0;
  mat[13] = 0;
  mat[14] = 0;
  mat[15] = 1;

  return mat;
}

/**
 * Get the "up" vector from a quaternion
 * @param {number[]} q - Quaternion
 * @returns {number[]} Up vector [x, y, z]
 */
export function getUpVector(q) {
  return rotateVector([0, 1, 0], q);
}

/**
 * Get the "forward" vector from a quaternion (negative Z in OpenGL convention)
 * @param {number[]} q - Quaternion
 * @returns {number[]} Forward vector [x, y, z]
 */
export function getForwardVector(q) {
  return rotateVector([0, 0, -1], q);
}

/**
 * Get the "right" vector from a quaternion
 * @param {number[]} q - Quaternion
 * @returns {number[]} Right vector [x, y, z]
 */
export function getRightVector(q) {
  return rotateVector([1, 0, 0], q);
}

/**
 * Spherical linear interpolation between two quaternions
 * @param {number[]} q1 - Start quaternion
 * @param {number[]} q2 - End quaternion
 * @param {number} t - Interpolation parameter [0, 1]
 * @returns {number[]} Interpolated quaternion
 */
export function slerp(q1, q2, t) {
  let dot = q1[0]*q2[0] + q1[1]*q2[1] + q1[2]*q2[2] + q1[3]*q2[3];

  // If negative dot, negate q2 to take shorter path
  let q2a = q2;
  if (dot < 0) {
    dot = -dot;
    q2a = [-q2[0], -q2[1], -q2[2], -q2[3]];
  }

  // If quaternions are very close, use linear interpolation
  if (dot > 0.9995) {
    const result = [
      q1[0] + t * (q2a[0] - q1[0]),
      q1[1] + t * (q2a[1] - q1[1]),
      q1[2] + t * (q2a[2] - q1[2]),
      q1[3] + t * (q2a[3] - q1[3])
    ];
    return normalize(result);
  }

  // Standard slerp
  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  const w1 = Math.sin((1 - t) * theta) / sinTheta;
  const w2 = Math.sin(t * theta) / sinTheta;

  return [
    w1 * q1[0] + w2 * q2a[0],
    w1 * q1[1] + w2 * q2a[1],
    w1 * q1[2] + w2 * q2a[2],
    w1 * q1[3] + w2 * q2a[3]
  ];
}

/**
 * Conjugate of a quaternion (inverse for unit quaternions)
 * @param {number[]} q - Quaternion
 * @returns {number[]} Conjugate quaternion
 */
export function conjugate(q) {
  return [-q[0], -q[1], -q[2], q[3]];
}
