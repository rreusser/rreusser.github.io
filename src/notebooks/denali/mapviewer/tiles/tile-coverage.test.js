// Unit tests for frustum-AABB intersection
// Run: node src/denali/mapviewer/tiles/tile-coverage.test.js

import { extractFrustumPlanes, addFarPlane, testAABBFrustum, extractEyePosition } from './tile-coverage.js';
import { strict as assert } from 'node:assert';

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message}`);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

// Multiply two column-major 4x4 matrices: result = a * b
function mul4(a, b) {
  const out = new Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

function normalize3(v) {
  const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
  return [v[0]/len, v[1]/len, v[2]/len];
}

function cross(a, b) {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}

function sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }

// LookAt view matrix (column-major). Camera at `eye` looking toward `target`.
function lookAt(eye, target, up) {
  const f = normalize3(sub(target, eye)); // forward (into screen = -z)
  const s = normalize3(cross(f, up));     // right
  const u = cross(s, f);                  // up
  return [
    s[0], u[0], -f[0], 0,
    s[1], u[1], -f[1], 0,
    s[2], u[2], -f[2], 0,
    -dot(s, eye), -dot(u, eye), dot(f, eye), 1,
  ];
}

// Reversed-z infinite far perspective projection (WebGPU clip z ∈ [0,1]).
// z_ndc = near / z_eye, so near maps to z_ndc=1 and ∞ maps to z_ndc=0.
function perspectiveRevZInf(fovY, aspect, near) {
  const f = 1 / Math.tan(fovY / 2);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, 0, -1,
    0, 0, near, 0,
  ];
}

// Build projView matrix for a given camera configuration.
function buildProjView(eye, target, up, fovY, aspect, near) {
  const view = lookAt(eye, target, up);
  const proj = perspectiveRevZInf(fovY, aspect, near);
  return mul4(proj, view);
}

// Build projView and extract planes (no far plane replacement).
function buildFrustum(eye, target, up, fovY, aspect, near) {
  return extractFrustumPlanes(buildProjView(eye, target, up, fovY, aspect, near));
}

// Build projView, extract planes, and add the far plane heuristic.
function buildFrustumWithFar(eye, target, up, fovY, aspect, near) {
  const projView = buildProjView(eye, target, up, fovY, aspect, near);
  const planes = extractFrustumPlanes(projView);
  const [eyeX, eyeY, eyeZ] = extractEyePosition(projView);
  addFarPlane(planes, eyeX, eyeY, eyeZ);
  return { planes, eye: [eyeX, eyeY, eyeZ] };
}

// ── Test 1: Box frustum with hand-crafted planes ─────────────────────────
console.log('\n── Hand-crafted box frustum ──');
{
  const planes = [
    [1,  0, 0, 1],   // left:   x >= -1
    [-1, 0, 0, 1],   // right:  x <= 1
    [0,  1, 0, 1],   // bottom: y >= -1
    [0, -1, 0, 1],   // top:    y <= 1
    [0, 0, -1, -1],  // near:   z <= -1
    [0, 0,  1, 10],  // far:    z >= -10
  ];

  test('AABB fully inside box', () => {
    const r = testAABBFrustum(planes, -0.5, -0.5, -5, 0.5, 0.5, -2);
    assert.equal(r, 1, `expected 1 (inside), got ${r}`);
  });

  test('AABB outside left', () => {
    const r = testAABBFrustum(planes, -5, -0.5, -5, -2, 0.5, -2);
    assert.equal(r, -1, `expected -1 (outside), got ${r}`);
  });

  test('AABB outside right', () => {
    const r = testAABBFrustum(planes, 2, -0.5, -5, 5, 0.5, -2);
    assert.equal(r, -1, `expected -1 (outside), got ${r}`);
  });

  test('AABB behind camera (z > 0)', () => {
    const r = testAABBFrustum(planes, -0.5, -0.5, 1, 0.5, 0.5, 5);
    assert.equal(r, -1, `expected -1 (outside), got ${r}`);
  });

  test('AABB beyond far plane', () => {
    const r = testAABBFrustum(planes, -0.5, -0.5, -20, 0.5, 0.5, -15);
    assert.equal(r, -1, `expected -1 (outside), got ${r}`);
  });

  test('AABB straddling near plane', () => {
    const r = testAABBFrustum(planes, -0.5, -0.5, -3, 0.5, 0.5, 0);
    assert.equal(r, 0, `expected 0 (intersecting), got ${r}`);
  });

  test('AABB larger than frustum, containing it', () => {
    const r = testAABBFrustum(planes, -10, -10, -20, 10, 10, 0);
    assert.equal(r, 0, `expected 0 (intersecting), got ${r}`);
  });

  test('Large AABB behind camera, spanning x/y — correctly culled by near plane', () => {
    const r = testAABBFrustum(planes, -100, -100, 1, 100, 100, 100);
    assert.equal(r, -1, `expected -1 (outside), got ${r}`);
  });
}

// ── Test 2: Perspective frustum from matrix (no far heuristic) ───────────
console.log('\n── Perspective frustum (reversed-z, infinite far, no far plane) ──');
{
  const planes = buildFrustum([0,0,0], [0,0,-1], [0,1,0], Math.PI/2, 1, 0.1);

  test('Small AABB directly in front of camera', () => {
    const r = testAABBFrustum(planes, -0.5, -0.5, -5, 0.5, 0.5, -2);
    assert.notEqual(r, -1, `should not be culled, got ${r}`);
  });

  test('Small AABB behind camera', () => {
    const r = testAABBFrustum(planes, -0.1, -0.1, 2, 0.1, 0.1, 3);
    assert.equal(r, -1, `expected -1 (outside), got ${r}`);
  });

  test('Small AABB to the right, outside frustum', () => {
    const r = testAABBFrustum(planes, 6, -0.5, -6, 7, 0.5, -5);
    assert.equal(r, -1, `expected -1 (outside), got ${r}`);
  });

  test('Small AABB at frustum edge, partially inside', () => {
    const r = testAABBFrustum(planes, 4, -0.5, -6, 6, 0.5, -5);
    assert.equal(r, 0, `expected 0 (intersecting), got ${r}`);
  });
}

// ── Test 3: Terrain viewer WITHOUT far plane (documenting the problem) ───
console.log('\n── Terrain viewer: large tile behind camera (no far plane) ──');
{
  const eye = [0.565, 0.005, 0.358];
  const target = [0.56, 0.0, 0.35];
  const up = [0, 1, 0];
  const planes = buildFrustum(eye, target, up, Math.PI/4, 1.5, 0.00001);

  test('Tile 1/0/0: 6-plane false positive (no far plane)', () => {
    const r = testAABBFrustum(planes, 0, 0, 0, 0.5, 0.00015, 0.5);
    if (r !== -1) {
      console.log(`        → 6-plane test returns ${r} — large tile passes without far plane`);
    }
  });

  test('Small tile directly in view (no far plane)', () => {
    const r = testAABBFrustum(planes, 0.5625, 0, 0.34, 0.625, 0.001, 0.375);
    assert.notEqual(r, -1, `tile in view should not be culled, got ${r}`);
  });
}

// ── Test 4: Terrain viewer WITH far plane heuristic ──────────────────────
console.log('\n── Terrain viewer: with far plane heuristic ──');
{
  const eye = [0.565, 0.005, 0.358];
  const target = [0.56, 0.0, 0.35];
  const up = [0, 1, 0];
  const { planes, eye: extractedEye } = buildFrustumWithFar(eye, target, up, Math.PI/4, 1.5, 0.00001);

  test('addFarPlane replaces degenerate plane[4] with real plane', () => {
    const [a, b, c, d] = planes[4];
    const normalLen = Math.sqrt(a*a + b*b + c*c);
    assert.ok(normalLen > 0.9, `far plane should have unit normal, got length ${normalLen}`);
  });

  test('Far plane maxFar is reasonable', () => {
    // Recover maxFar: the far plane is -forward at distance maxFar from eye.
    // planes[5] normal = forward = (na, nb, nc). planes[4] = (-na, -nb, -nc, d_far).
    // d_far = dot(forward, eye) + maxFar
    const [na, nb, nc] = planes[5];
    const d_far = planes[4][3];
    const maxFar = d_far - (na * extractedEye[0] + nb * extractedEye[1] + nc * extractedEye[2]);
    console.log(`        maxFar = ${maxFar.toFixed(4)}, eyeY = ${extractedEye[1].toFixed(6)}`);
    assert.ok(maxFar > 0.01, `maxFar should be positive and meaningful, got ${maxFar}`);
    assert.ok(maxFar < 2.0, `maxFar should not be absurdly large, got ${maxFar}`);
  });

  test('Small tile directly in view (with far plane)', () => {
    const r = testAABBFrustum(planes, 0.5625, 0, 0.34, 0.625, 0.001, 0.375);
    assert.notEqual(r, -1, `tile in view should not be culled, got ${r}`);
  });

  test('Tile containing camera (with far plane)', () => {
    const r = testAABBFrustum(planes, 0.5, 0, 0.25, 0.625, 0.01, 0.5);
    assert.notEqual(r, -1, `tile containing camera should not be culled, got ${r}`);
  });

  test('Small tile far behind camera (with far plane)', () => {
    const r = testAABBFrustum(planes, 0.1, 0, 0.1, 0.15, 0.001, 0.15);
    assert.equal(r, -1, `expected -1 (outside), got ${r}`);
  });

  test('Distant tile across the world (with far plane)', () => {
    // A tile on the other side of the world — should be culled by far plane
    const r = testAABBFrustum(planes, 0, 0, 0, 0.1, 0.001, 0.1);
    assert.equal(r, -1, `distant tile should be culled, got ${r}`);
  });
}

// ── Test 5: Frustum passes through small tile (must not be culled) ───────
console.log('\n── Frustum passing through small tile (with far plane) ──');
{
  const eye = [0, 0, 0];
  const target = [0, 0, -1];
  const up = [0, 1, 0];
  const { planes } = buildFrustumWithFar(eye, target, up, Math.PI/2, 1, 0.1);

  test('Small tile on optical axis — frustum passes through it', () => {
    const r = testAABBFrustum(planes, -0.1, -0.1, -10, 0.1, 0.1, -9);
    assert.notEqual(r, -1, `small tile on optical axis should not be culled, got ${r}`);
  });

  test('Small tile off-axis but inside frustum', () => {
    const r = testAABBFrustum(planes, 2, -0.5, -6, 3, 0.5, -5);
    assert.notEqual(r, -1, `off-axis tile inside frustum should not be culled, got ${r}`);
  });
}

// ── Test 6: Far plane at various altitudes ───────────────────────────────
console.log('\n── Far plane scaling with altitude ──');
{
  function getFarDist(eyeY) {
    const eye = [0.5, eyeY, 0.5];
    const target = [0.5, 0, 0.5];
    const up = [0, 0, -1]; // looking straight down, use -Z as up
    const { planes, eye: e } = buildFrustumWithFar(eye, target, up, Math.PI/4, 1, eyeY * 0.001);
    const [na, nb, nc] = planes[5];
    const d_far = planes[4][3];
    return d_far - (na * e[0] + nb * e[1] + nc * e[2]);
  }

  test('Higher altitude → larger maxFar', () => {
    const low = getFarDist(0.001);
    const mid = getFarDist(0.01);
    const high = getFarDist(0.1);
    console.log(`        low (0.001) = ${low.toFixed(4)}, mid (0.01) = ${mid.toFixed(4)}, high (0.1) = ${high.toFixed(4)}`);
    assert.ok(mid > low, `mid altitude should see farther than low: ${mid} > ${low}`);
    assert.ok(high > mid, `high altitude should see farther than mid: ${high} > ${mid}`);
  });

  test('Very low altitude still has minimum floor', () => {
    const veryLow = getFarDist(0.00001);
    console.log(`        very low (0.00001) = ${veryLow.toFixed(4)}`);
    assert.ok(veryLow >= 0.01, `minimum floor should apply: ${veryLow} >= 0.01`);
  });
}

// ── Test 7: Reversed-z plane extraction sanity ───────────────────────────
console.log('\n── Reversed-z plane extraction sanity ──');
{
  const planes = buildFrustum([0,0,0], [0,0,-1], [0,1,0], Math.PI/3, 1, 0.01);

  test('Degenerate plane (near) should be [0,0,0,positive]', () => {
    const [a, b, c, d] = planes[4];
    const normalLen = Math.sqrt(a*a + b*b + c*c);
    assert.ok(normalLen < 0.01 || d > 0, `degenerate near plane should always pass: [${a},${b},${c},${d}]`);
  });

  test('Far plane (actually near clip) should have z < 0 normal', () => {
    const [a, b, c, d] = planes[5];
    assert.ok(c < -0.5, `near clip plane should have negative z normal: [${a},${b},${c},${d}]`);
  });
}

// ── Summary ──────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
