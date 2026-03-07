struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = (pos[vertexIndex] + 1.0) * 0.5;
  return output;
}

@group(0) @binding(0) var colorTexture: texture_2d<f32>;
@group(0) @binding(1) var jfaTexture: texture_2d<u32>;
@group(0) @binding(2) var objectIdTexture: texture_2d<u32>;

struct Uniforms {
  resolution: vec2f,
  outlineWidth: f32,
  hovering: f32,
  mousePos: vec2f,
  _padding: vec2f,
}
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let pixelCoord = vec2i(input.uv * uniforms.resolution);
  let flippedCoord = vec2i(pixelCoord.x, i32(uniforms.resolution.y) - 1 - pixelCoord.y);

  // Sample textures
  let color = textureLoad(colorTexture, flippedCoord, 0);
  let jfaData = textureLoad(jfaTexture, flippedCoord, 0);
  let objectData = textureLoad(objectIdTexture, flippedCoord, 0);

  // Get hovered object ID by sampling JFA texture at mouse position (after expansion)
  // Only select object if mouse is within outline width of that object
  let mouseCoord = vec2i(i32(uniforms.mousePos.x), i32(uniforms.mousePos.y));
  let mouseJfaData = textureLoad(jfaTexture, mouseCoord, 0);
  let mouseObjectData = textureLoad(objectIdTexture, mouseCoord, 0);

  // Check distance from mouse to nearest seed
  var mouseDist = 1e10;
  if (mouseJfaData.x > 0u || mouseJfaData.y > 0u) {
    let mouseSeedPos = vec2f(f32(mouseJfaData.x - 1u), f32(mouseJfaData.y - 1u));
    let mousePos = vec2f(mouseCoord);
    mouseDist = distance(mouseSeedPos, mousePos);
  }

  // Only hover if: directly on object OR within outline width of object
  let mouseOnObject = (mouseObjectData.x > 0u || mouseObjectData.y > 0u);
  let mouseNearObject = mouseDist < uniforms.outlineWidth;
  let hoveredObjectId = select(0u, mouseJfaData.z, uniforms.hovering > 0.5 && (mouseOnObject || mouseNearObject));

  // Get distance to nearest seed
  var dist = 0.0;
  if (jfaData.x > 0u || jfaData.y > 0u) {
    let seedPos = vec2f(f32(jfaData.x - 1u), f32(jfaData.y - 1u));
    let currentPos = vec2f(flippedCoord);
    dist = distance(seedPos, currentPos);
  }

  // Get object IDs
  let currentObjectId = objectData.z;
  let nearestObjectId = jfaData.z;

  // Determine if this is an outline pixel:
  // We're on an outline if we're close to a boundary between different objects
  let isBackground = (objectData.x == 0u && objectData.y == 0u);
  let nearDifferentObject = (currentObjectId != nearestObjectId) && (jfaData.x > 0u || jfaData.y > 0u);

  // Hard cutoff for outline
  let inOutline = nearDifferentObject && dist < uniforms.outlineWidth;

  // Check if this pixel belongs to or is near the hovered object (respecting outline width)
  let isHoveredObject = (currentObjectId == hoveredObjectId) && (hoveredObjectId > 0u);
  let isNearHoveredObject = (nearestObjectId == hoveredObjectId) && (hoveredObjectId > 0u) && (dist < uniforms.outlineWidth);

  // Outline color based on the nearest object
  var outlineColor = vec3f(0.0);
  if (nearestObjectId == 1u) {
    outlineColor = vec3f(0.4, 0.7, 1.0); // Blue outline for knot 1
  } else if (nearestObjectId == 2u) {
    outlineColor = vec3f(1.0, 0.6, 0.3); // Orange outline for knot 2
  }

  // Highlight color for hover (lighter version of the object's color)
  var hoverOutlineColor = vec3f(0.7, 0.85, 1.0); // Light blue default
  if (hoveredObjectId == 1u) {
    hoverOutlineColor = vec3f(0.7, 0.85, 1.0); // Light blue for knot 1
  } else if (hoveredObjectId == 2u) {
    hoverOutlineColor = vec3f(1.0, 0.8, 0.6); // Light orange for knot 2
  }

  // Sawtooth ramp based on distance (creates repeating bands)
  let bandWidth = 32.0; // pixels per band
  let ramp = fract(dist / bandWidth);
  let bandShade = 0.9 + 0.1 * ramp; // gentle variation from 0.85 to 1.0

  // Apply outline with hard cutoff
  var finalColor = color.rgb;
  if (isBackground) {
    if (inOutline) {
      // Use hover color if this outline belongs to hovered object
      let baseOutline = select(outlineColor, hoverOutlineColor, isNearHoveredObject);
      finalColor = baseOutline * bandShade;
    } else {
      return vec4f(0.0, 0.0, 0.0, 0.0); // transparent background
    }
  } else {
    // Darken edges where objects meet
    if (inOutline) {
      finalColor = finalColor * 0.5 * bandShade;
    }
  }

  // Highlight hovered object with a lighter tint of its own color
  if (isHoveredObject) {
    finalColor = mix(finalColor, hoverOutlineColor, 0.3) * 1.15;
  }

  return vec4f(finalColor, 1.0);
}
