@group(0) @binding(0) var<storage, read_write> state: array<vec4f>;

struct Uniforms {
  dt: f32,
  t: f32,
  srcStep: u32,
  dstStep: u32,
  stepCount: u32,
  particleCount: u32,
}
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

// Bouali attractor derivative
fn derivative(x: f32, y: f32, z: f32, t: f32) -> vec3f {
  let alpha = 3.0;
  let beta = 2.20;
  let gamma = 1.0;
  let mu = 1.510;
  return vec3f(
    alpha * x * (1.0 - y) - beta * z,
    -gamma * y * (1.0 - x * x),
    mu * x
  );
}

fn deriv(p: vec3f, t: f32) -> vec3f {
  return derivative(p.x, p.y, p.z, t);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let particle = gid.x;
  if (particle >= uniforms.particleCount) { return; }

  // Read current state from source step
  let srcIdx = particle * uniforms.stepCount + uniforms.srcStep;
  let p = state[srcIdx].xyz;

  // RK4 integration
  let dt = uniforms.dt;
  let t = uniforms.t;
  let k1 = deriv(p, t);
  let k2 = deriv(p + 0.5 * dt * k1, t + 0.5 * dt);
  let k3 = deriv(p + 0.5 * dt * k2, t + 0.5 * dt);
  let k4 = deriv(p + dt * k3, t + dt);

  var newP = p + (dt / 6.0) * (k1 + k4 + 2.0 * (k2 + k3));

  // If particle diverges, reset near origin
  if (dot(newP, newP) > 1e6) {
    newP = newP * 0.0001;
  }

  // Write to destination step
  let dstIdx = particle * uniforms.stepCount + uniforms.dstStep;
  state[dstIdx] = vec4f(newP, 1.0);
}
