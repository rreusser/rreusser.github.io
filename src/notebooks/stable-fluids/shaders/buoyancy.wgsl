// Buoyancy Shader
// Applies upward force proportional to dye concentration (simulating hot air rising)

struct BuoyancyParams {
  resolution: vec2<u32>,
  strength: f32,  // Buoyancy strength
  dt: f32,
}

@group(0) @binding(0) var<storage, read_write> velocity: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> dye: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: BuoyancyParams;

@compute @workgroup_size(16, 16)
fn apply_buoyancy(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;

  // Get dye concentration
  let dyeVal = dye[idx].x;

  // Apply upward force proportional to dye
  // Positive Y is up in our coordinate system after the flip
  var vel = velocity[idx];
  vel.z += params.strength * dyeVal * params.dt;
  velocity[idx] = vel;
}
