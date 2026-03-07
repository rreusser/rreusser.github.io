// Fragment shader body for webgpu-instanced-lines
// This code is injected into the line renderer's fragment shader

// Rainbow color palette from webgpu-instanced-lines lorenz example
fn rainbow(p: vec2f) -> vec3f {
  let theta = p.x * 6.283185;
  let c = cos(theta);
  let s = sin(theta);
  let m1 = mat3x3f(
    0.5230851,  0.56637411, 0.46725319,
    0.12769652, 0.14082407, 0.13691271,
   -0.25934743,-0.12121582, 0.2348705
  );
  let m2 = mat3x3f(
    0.3555664, -0.11472876,-0.01250831,
    0.15243126,-0.03668075, 0.0765231,
   -0.00192128,-0.01350681,-0.0036526
  );
  return m1 * vec3f(1.0, p.y * 2.0 - 1.0, s) +
         m2 * vec3f(c, s * c, c * c - s * s);
}

fn getColor(lineCoord: vec2f, t: f32, velocity: f32, lineWidth: f32) -> vec4f {
  let sdf = length(lineCoord) * lineWidth;
  let isCap = abs(lineCoord.x) > 0.0;

  // Rainbow color based on velocity, with saturation from track progress
  var color = rainbow(vec2f(velocity, t));

  if (isCap && dot(lineCoord, lineCoord) > 1.0) { discard; }

  // Dark border effect
  let borderWidth = 4.0;
  let borderMask = smoothstep(lineWidth - borderWidth - 0.75, lineWidth - borderWidth + 0.75, sdf);
  color = mix(color, vec3f(0.0), borderMask * 0.8);

  return vec4f(color, 1.0);
}
