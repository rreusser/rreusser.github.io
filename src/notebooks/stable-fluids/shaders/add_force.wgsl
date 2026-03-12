// Add Force Shader
// Applies velocity-matching force: f = (v_target - v_current) * damping
// This smoothly accelerates/decelerates fluid to match mouse velocity

struct ForceParams {
  resolution: vec2<u32>,
  position: vec2<f32>,
  targetVelocity: vec2<f32>,  // Mouse velocity in simulation units
  radius: f32,
  isActive: f32,
  damping: f32,  // How quickly to match velocity (0-1)
  padding: f32,
}

@group(0) @binding(0) var<storage, read_write> velocity: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> dye: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> params: ForceParams;

@compute @workgroup_size(16, 16)
fn add_force(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.resolution.x;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;

  // Position in [0, 1]
  let pos = vec2<f32>(f32(id.x) + 0.5, f32(id.y) + 0.5) / f32(N);

  // Distance from mouse position
  let diff = pos - params.position;
  let dist2 = dot(diff, diff);
  let radius2 = params.radius * params.radius;

  // Gaussian falloff for force
  let falloff = exp(-dist2 / (2.0 * radius2)) * params.isActive;

  // Current velocity
  var vel = velocity[idx];
  let currentVel = vec2<f32>(vel.x, vel.z);

  // Velocity-matching force: accelerate toward target velocity
  let velocityError = params.targetVelocity - currentVel;
  let force = velocityError * params.damping * falloff;

  vel.x += force.x;
  vel.z += force.y;
  velocity[idx] = vel;

  // Add dye with hard circle (not Gaussian) for sharper edges
  let dist = sqrt(dist2);
  let dyeRadius = params.radius * 0.7;  // Slightly smaller than force radius
  let inCircle = step(dist, dyeRadius) * params.isActive;

  var d = dye[idx];
  d.x += inCircle * 0.3;
  d.x = min(d.x, 1.0);
  dye[idx] = d;
}
