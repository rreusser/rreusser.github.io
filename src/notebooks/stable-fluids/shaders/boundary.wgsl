// Boundary Enforcement Shader
// Enforces no-slip boundary condition using ghost cell mirroring.
// Ghost cells have negated velocity of their mirrored fluid cells,
// so interpolation naturally gives zero velocity at the wall surface.

struct BoundaryParams {
  resolution: vec2<u32>,
  padding0: f32,  // Unused (kept for alignment)
  wallThicknessX: f32, // Wall thickness in cells (left/right walls)
  wallThicknessY: f32, // Wall thickness in cells (top/bottom walls)
  padding1: f32,
}

@group(0) @binding(0) var<storage, read_write> velocity: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> dye: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: BoundaryParams;

@compute @workgroup_size(16, 16)
fn enforce_boundary(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  let Ni = i32(N);
  if (id.x >= N || id.y >= N) { return; }

  let ix = i32(id.x);
  let iy = i32(id.y);
  let idx = id.y * N + id.x;

  let wallX = i32(params.wallThicknessX);
  let wallY = i32(params.wallThicknessY);

  // Determine which wall regions this cell is in
  let inLeftWall = wallX > 0 && ix < wallX;
  let inRightWall = wallX > 0 && ix >= Ni - wallX;
  let inTopWall = wallY > 0 && iy < wallY;
  let inBottomWall = wallY > 0 && iy >= Ni - wallY;

  // If not in any wall, nothing to do
  if (!inLeftWall && !inRightWall && !inTopWall && !inBottomWall) {
    return;
  }

  // Compute mirrored position for ghost cell
  var mirrorX = ix;
  var mirrorY = iy;

  // Mirror across X walls
  // Wall surface is at x = wallX (left) or x = N - wallX (right)
  // Ghost cell at ix mirrors fluid cell across the wall surface
  if (inLeftWall) {
    mirrorX = 2 * wallX - 1 - ix;
  } else if (inRightWall) {
    mirrorX = 2 * (Ni - wallX) - 1 - ix;
  }

  // Mirror across Y walls
  if (inTopWall) {
    mirrorY = 2 * wallY - 1 - iy;
  } else if (inBottomWall) {
    mirrorY = 2 * (Ni - wallY) - 1 - iy;
  }

  // Clamp mirror position to fluid region (handles thick walls and corners)
  let fluidMinX = select(0, wallX, wallX > 0);
  let fluidMaxX = select(Ni - 1, Ni - wallX - 1, wallX > 0);
  let fluidMinY = select(0, wallY, wallY > 0);
  let fluidMaxY = select(Ni - 1, Ni - wallY - 1, wallY > 0);

  mirrorX = clamp(mirrorX, fluidMinX, fluidMaxX);
  mirrorY = clamp(mirrorY, fluidMinY, fluidMaxY);

  let mirrorIdx = u32(mirrorY) * N + u32(mirrorX);

  // No-slip: ghost cell velocity = negative of mirrored fluid cell
  // This ensures interpolation gives zero velocity at the wall surface
  velocity[idx] = -velocity[mirrorIdx];
}
