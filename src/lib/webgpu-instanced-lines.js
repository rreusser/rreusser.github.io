/**
 * webgpu-instanced-lines, vendored.
 *
 * This is the published module's own build output with one change, which is
 * needed for the cascade figure in the Navier-Stokes notebook and cannot be
 * worked around from outside the library: the generated fragment shader now
 * carries @builtin(position) and forwards it to getColor when the user's code
 * names a parameter `fragPosition`, the same opt-in the library already uses
 * for instanceID.
 *
 * Depth peeling needs each fragment to sample the previous layer's depth at its
 * own pixel and compare its own depth. A vertex function can pass its clip
 * position across as a varying, but that lies on the line's centre while the
 * fragment may be half a stroke width away, and the edge of a stroke is exactly
 * where peeling shows its artifacts.
 *
 * Vendored rather than imported from npm because the change is not released
 * yet. It lives on the branch claude/fragment-position in
 * rreusser/webgpu-instanced-lines; once that is published this file should be
 * deleted and the import returned to npm:webgpu-instanced-lines.
 *
 * Upstream: https://github.com/rreusser/webgpu-instanced-lines (MIT)
 */
/**
 * WebGPU GPU Lines - Instanced line rendering for WebGPU
 *
 * Based on regl-gpu-lines, adapted for WebGPU with user-controlled vertex data.
 *
 * - Each instance renders one line segment (from point B to point C)
 * - Uses 4-point windows: A (previous), B (start), C (end), D (next)
 * - Triangle strip covers: half of join at B, segment B→C, half of join at C
 * - User provides vertex function that computes position, width, and varyings
 * - Library handles join/cap geometry generation
 */
/**
 * Parse a WGSL struct definition to extract field names and types
 */
function parseStructFields(code, structName) {
    // Find struct definition
    const structRegex = structName
        ? new RegExp(`struct\\s+${structName}\\s*\\{([^}]+)\\}`, 's')
        : /struct\s+(\w+)\s*\{([^}]+)\}/s;
    const match = code.match(structRegex);
    if (!match)
        return [];
    const body = structName ? match[1] : match[2];
    const fields = [];
    // Parse fields: name: type,
    // Match field name, colon, then type (stopping at comma or end of struct)
    const fieldRegex = /(\w+)\s*:\s*([\w<>]+)\s*,?/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
        fields.push({
            name: fieldMatch[1].trim(),
            type: fieldMatch[2].trim()
        });
    }
    return fields;
}
/**
 * Find the return type of a function
 */
function findFunctionReturnType(code, functionName) {
    const regex = new RegExp(`fn\\s+${functionName}\\s*\\([^)]*\\)\\s*->\\s*(\\w+)`, 's');
    const match = code.match(regex);
    return match ? match[1] : null;
}
/**
 * Create a WebGPU lines renderer
 */
function createGPULines(device, options) {
    const { vertexShaderBody, fragmentShaderBody, colorTargets, depthStencil, multisample, primitive, vertexFunction = 'getVertex', positionField = 'position', widthField = 'width', join = 'miter', maxJoinResolution = 8, miterLimit: defaultMiterLimit = 4, cap = 'square', maxCapResolution = 8, clampIndices = true, } = options;
    // Normalize colorTargets to array
    const targets = Array.isArray(colorTargets) ? colorTargets : [colorTargets];
    // Warn if user overrides library-expected primitive settings, but respect their choice
    if (primitive?.topology !== undefined && primitive.topology !== 'triangle-strip') {
        console.warn(`gpu-lines: primitive.topology is "${primitive.topology}". ` +
            `This library is designed for 'triangle-strip' and may not render correctly.`);
    }
    if (primitive?.stripIndexFormat !== undefined) {
        console.warn(`gpu-lines: primitive.stripIndexFormat is set but this library does not use indexed drawing.`);
    }
    // Parse user's vertex struct to find varyings
    const returnType = findFunctionReturnType(vertexShaderBody, vertexFunction);
    if (!returnType) {
        throw new Error(`Could not find vertex function '${vertexFunction}' in vertexShaderBody`);
    }
    const structFields = parseStructFields(vertexShaderBody, returnType);
    if (structFields.length === 0) {
        throw new Error(`Could not parse struct '${returnType}' in vertexShaderBody`);
    }
    // Identify position, width, and varying fields
    const positionIdx = structFields.findIndex(f => f.name === positionField);
    if (positionIdx === -1) {
        throw new Error(`Position field '${positionField}' not found in struct '${returnType}'`);
    }
    const widthIdx = structFields.findIndex(f => f.name === widthField);
    if (widthIdx === -1) {
        throw new Error(`Width field '${widthField}' not found in struct '${returnType}'. The vertex struct must include a width field.`);
    }
    // Everything else is a varying
    const varyings = structFields.filter((_, i) => i !== positionIdx && i !== widthIdx);
    const isRound = join === 'round';
    const isBevel = join === 'bevel';
    const effectiveMiterLimit = isBevel ? 0 : defaultMiterLimit;
    const insertCaps = cap !== 'butt';
    // Compute effective max resolutions based on cap type
    let effectiveMaxCapResolution;
    if (cap === 'butt') {
        effectiveMaxCapResolution = 1;
    }
    else if (cap === 'square') {
        effectiveMaxCapResolution = 3;
    }
    else {
        effectiveMaxCapResolution = maxCapResolution;
    }
    // Use MAX resolutions for vertex count calculation and as draw-time defaults
    const maxJoinRes2 = isRound ? maxJoinResolution * 2 : 2;
    const maxCapRes2 = effectiveMaxCapResolution * 2;
    const capScale = cap === 'square' ? [2, 2 / Math.sqrt(3)] : [1, 1];
    const maxRes = Math.max(maxCapRes2, maxJoinRes2);
    const vertCnt = maxRes + 3;
    const vertexCountPerInstance = vertCnt * 2;
    // Generate shader code
    const vertexShader = createVertexShader({
        userCode: vertexShaderBody,
        vertexFunction,
        positionField,
        widthField,
        varyings,
        clampIndices,
    });
    const fragmentShader = createFragmentShader({
        userCode: fragmentShaderBody,
        varyings,
    });
    // Create shader modules
    const vertexModule = device.createShaderModule({
        label: 'gpu-lines-vertex',
        code: vertexShader
    });
    const fragmentModule = device.createShaderModule({
        label: 'gpu-lines-fragment',
        code: fragmentShader
    });
    // Use 'auto' layout so user's bind groups are inferred from shader
    const pipelineDescriptor = {
        label: 'gpu-lines',
        layout: 'auto',
        vertex: {
            module: vertexModule,
            entryPoint: 'vertexMain',
        },
        fragment: {
            module: fragmentModule,
            entryPoint: 'fragmentMain',
            targets,
        },
        primitive: {
            topology: primitive?.topology ?? 'triangle-strip',
            stripIndexFormat: primitive?.stripIndexFormat,
            cullMode: primitive?.cullMode ?? 'none',
            frontFace: primitive?.frontFace ?? 'ccw',
            unclippedDepth: primitive?.unclippedDepth ?? false,
        },
    };
    // Add depth/stencil state if provided (user has full control)
    if (depthStencil) {
        pipelineDescriptor.depthStencil = depthStencil;
    }
    // Add multisample state if provided
    if (multisample) {
        pipelineDescriptor.multisample = multisample;
    }
    const pipeline = device.createRenderPipeline(pipelineDescriptor);
    // Uniform buffer layout (40 bytes):
    // resolution(8) + vertCnt2(8) + miterLimit(4) + isRound(4) + pointCount(4) + insertCaps(4) + capScale(8)
    const uniformBuffer = device.createBuffer({
        label: 'gpu-lines-uniforms',
        size: 40,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    // Create uniform bind group using pipeline's inferred layout
    const uniformBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
    });
    // Pre-allocate uniform data buffer and cache last values to avoid redundant writes
    const _uniformData = new ArrayBuffer(40);
    const _f32 = new Float32Array(_uniformData);
    const _u32 = new Uint32Array(_uniformData);
    // Initialize values with max resolutions as defaults (can be overridden at draw-time)
    // Using max values means it "just works" without requiring runtime parameters
    _f32[2] = maxCapRes2;
    _f32[3] = maxJoinRes2;
    _f32[4] = effectiveMiterLimit * effectiveMiterLimit;
    _u32[5] = isRound ? 1 : 0;
    _u32[7] = insertCaps ? 1 : 0;
    _f32[8] = capScale[0];
    _f32[9] = capScale[1];
    // Track last dynamic values to detect changes
    let _lastPointCount = -1;
    let _lastResX = -1;
    let _lastResY = -1;
    let _lastCapRes2 = maxCapRes2;
    let _lastJoinRes2 = maxJoinRes2;
    let _lastMiterLimit2 = effectiveMiterLimit * effectiveMiterLimit;
    let _uniformsWritten = false;
    return {
        getBindGroupLayout(index) {
            return pipeline.getBindGroupLayout(index);
        },
        updateUniforms(props) {
            const { vertexCount: pointCount, resolution } = props;
            // Compute effective resolution values (default to max, allow override up to max)
            let capRes2 = maxCapRes2;
            if (cap === 'round' && props.capResolution !== undefined) {
                const clampedCapRes = Math.min(props.capResolution, maxCapResolution);
                if (props.capResolution > maxCapResolution) {
                    console.warn(`capResolution ${props.capResolution} exceeds maxCapResolution ${maxCapResolution}, clamping to ${maxCapResolution}`);
                }
                capRes2 = clampedCapRes * 2;
            }
            let joinRes2 = maxJoinRes2;
            if (isRound && props.joinResolution !== undefined) {
                const clampedJoinRes = Math.min(props.joinResolution, maxJoinResolution);
                if (props.joinResolution > maxJoinResolution) {
                    console.warn(`joinResolution ${props.joinResolution} exceeds maxJoinResolution ${maxJoinResolution}, clamping to ${maxJoinResolution}`);
                }
                joinRes2 = clampedJoinRes * 2;
            }
            // Compute effective miter limit (isBevel forces it to 0)
            let miterLimit2 = _lastMiterLimit2;
            if (!isBevel && props.miterLimit !== undefined) {
                miterLimit2 = props.miterLimit * props.miterLimit;
            }
            // Only write if values changed
            const needsUpdate = !_uniformsWritten ||
                pointCount !== _lastPointCount ||
                resolution[0] !== _lastResX ||
                resolution[1] !== _lastResY ||
                capRes2 !== _lastCapRes2 ||
                joinRes2 !== _lastJoinRes2 ||
                miterLimit2 !== _lastMiterLimit2;
            if (needsUpdate) {
                _f32[0] = resolution[0];
                _f32[1] = resolution[1];
                _f32[2] = capRes2;
                _f32[3] = joinRes2;
                _f32[4] = miterLimit2;
                _u32[6] = pointCount;
                device.queue.writeBuffer(uniformBuffer, 0, _uniformData);
                _lastPointCount = pointCount;
                _lastResX = resolution[0];
                _lastResY = resolution[1];
                _lastCapRes2 = capRes2;
                _lastJoinRes2 = joinRes2;
                _lastMiterLimit2 = miterLimit2;
                _uniformsWritten = true;
            }
        },
        draw(pass, props, bindGroups = []) {
            const { vertexCount: pointCount, skipUniformUpdate } = props;
            // Update uniforms if not skipped (for backwards compatibility)
            if (!skipUniformUpdate) {
                this.updateUniforms(props);
            }
            const instanceCount = Math.max(0, pointCount - 1);
            if (instanceCount > 0) {
                pass.setPipeline(pipeline);
                pass.setBindGroup(0, uniformBindGroup);
                // Set user's bind groups (1, 2, ...)
                for (let i = 0; i < bindGroups.length; i++) {
                    pass.setBindGroup(i + 1, bindGroups[i]);
                }
                pass.draw(vertexCountPerInstance, instanceCount);
            }
        },
        destroy() {
            uniformBuffer.destroy();
        }
    };
}
/**
 * Create the vertex shader
 */
function createVertexShader({ userCode, vertexFunction, positionField, widthField, varyings, clampIndices, }) {
    // Generate varying declarations for VertexOutput
    const varyingOutputDecls = varyings.map((v, i) => `  @location(${i + 1}) ${v.name}: ${v.type},`).join('\n');
    // Library debug varyings come after user varyings
    const debugVaryingStartLoc = varyings.length + 1;
    // Generate varying interpolation code
    const varyingInterpolation = varyings.map(v => `  let ${v.name} = mix(vertexB.${v.name}, vertexC.${v.name}, clamp(useC, 0.0, 1.0));`).join('\n');
    // Generate output assignment for varyings
    const varyingOutputAssign = varyings.map(v => `  output.${v.name} = ${v.name};`).join('\n');
    return /* wgsl */ `
//------------------------------------------------------------------------------
// GPU Lines Vertex Shader
//------------------------------------------------------------------------------
//
// This shader implements instanced line rendering with high-quality joins and caps.
// Each instance renders one line segment from point B to point C, along with half
// of the join at each end. The geometry is generated as a triangle strip.
//
// - 4-point window: A (previous), B (start), C (end), D (next)
// - Each instance covers: half of join at B + segment B→C + half of join at C
// - The triangle strip is divided into two halves that "mirror" each other
// - User provides a vertex function to compute position, width, and varyings
//
// Geometry layout:
// The triangle strip alternates between "outer" points (on the line boundary)
// and "inner" points (at the center of the join fan). For joins, vertices are
// arranged as a fan that smoothly transitions between incoming and outgoing
// segment directions.
//
//------------------------------------------------------------------------------

// Library uniforms
struct Uniforms {
  // Viewport resolution in pixels (width, height)
  resolution: vec2f,
  // Vertex count per half: (cap resolution * 2, join resolution * 2)
  // Controls the tessellation level for round caps and round joins
  vertCnt2: vec2f,
  // Squared miter limit - when miter length² exceeds this, use bevel join instead
  miterLimit: f32,
  // Whether to use round joins (1) or miter/bevel joins (0)
  isRound: u32,
  // Total number of points in the line
  pointCount: u32,
  // Whether to insert end caps (1) or leave line ends open (0)
  insertCaps: u32,
  // Scale factor for square caps: stretches the round cap geometry into a square
  capScale: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Vertex output - passed to fragment shader for rendering
struct VertexOutput {
  // Clip-space position
  @builtin(position) position: vec4f,
  // Line coordinate for SDF-based rendering:
  //   x: signed distance into cap (-1 to 0 for start caps, 0 to +1 for end caps, 0 for segments/joins)
  //   y: signed distance from line center (-1 at edge, 0 at center, 1 at opposite edge)
  // Note: The sign of x indicates which cap (start vs end), sign of y indicates which side of the line
  @location(0) lineCoord: vec2f,
${varyingOutputDecls}
  // Debug varyings for visualization and debugging:
  // instanceID: Segment index (negative for cap vertices to distinguish them)
  @location(${debugVaryingStartLoc}) instanceID: f32,
  // triStripCoord: Position within triangle strip (x: pair index, y: top=1/bottom=0)
  @location(${debugVaryingStartLoc + 1}) triStripCoord: vec2f,
}

// User-provided code (bindings, structs, vertex function)
${userCode}

// Check if a position represents a line break (NaN or w=0 signals invalid point)
fn invalid(p: vec4f) -> bool {
  return p.w == 0.0 || p.x != p.x;  // p.x != p.x is a NaN check
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,    // Which vertex within the triangle strip (0 to vertexCount-1)
  @builtin(instance_index) instanceIndex: u32  // Which line segment we're drawing
) -> VertexOutput {
  var output: VertexOutput;

  let pi = 3.141592653589793;
  let tol = 1e-4;  // Tolerance for collinearity detection
  let N = i32(uniforms.pointCount);  // Total points in the polyline

  //----------------------------------------------------------------------------
  // Compute indices for the 4-point window: A → B → C → D
  //----------------------------------------------------------------------------
  // Instance i draws the segment from point i to point i+1 (B to C).
  // We also need the previous point A (for the incoming join) and
  // the next point D (for the outgoing join).
  //
  //    A -----> B =======> C -----> D
  //           (start)   (end)
  //           segment being drawn
  //
  let A_idx = i32(instanceIndex) - 1;   // Previous point (for incoming tangent)
  let B_idx = i32(instanceIndex);       // Start of segment
  let C_idx = i32(instanceIndex) + 1;   // End of segment
  let D_idx = i32(instanceIndex) + 2;   // Next point (for outgoing tangent)

  //----------------------------------------------------------------------------
  // Fetch vertex data for all four points in the window
  //----------------------------------------------------------------------------
  // Call user's vertex function for each point in the window.
${clampIndices ? `  // Clamp out-of-bounds indices so we can still read valid data (we'll mark them invalid below).
  let vertexA = ${vertexFunction}(u32(clamp(A_idx, 0, N - 1)));
  let vertexB = ${vertexFunction}(u32(B_idx));
  let vertexC = ${vertexFunction}(u32(C_idx));
  let vertexD = ${vertexFunction}(u32(clamp(D_idx, 0, N - 1)));` : `  // Pass raw indices (may be negative or >= N) - user handles wrapping/validation.
  let vertexA = ${vertexFunction}(A_idx);
  let vertexB = ${vertexFunction}(B_idx);
  let vertexC = ${vertexFunction}(C_idx);
  let vertexD = ${vertexFunction}(D_idx);`}

  // Extract positions from user vertex data
  var pA = vertexA.${positionField};
  var pB = vertexB.${positionField};
  var pC = vertexC.${positionField};
  var pD = vertexD.${positionField};

  //----------------------------------------------------------------------------
  // Determine which points are invalid (out of bounds or explicitly marked)
  //----------------------------------------------------------------------------
  // A point is invalid if it's outside the polyline bounds or if the user
  // marked it invalid (w=0 or NaN). Invalid endpoints A or D indicate line
  // ends where caps should be drawn instead of joins.
${clampIndices ? `  // With clampIndices, out-of-bounds indices trigger automatic end caps.
  let aOutOfBounds = A_idx < 0;
  let dOutOfBounds = D_idx >= N;` : `  // Without clampIndices, user handles bounds - only check for invalid positions.
  let aOutOfBounds = false;
  let dOutOfBounds = false;`}
  var aInvalid = aOutOfBounds || invalid(pA);
  var dInvalid = dOutOfBounds || invalid(pD);
  let bInvalid = invalid(pB);
  let cInvalid = invalid(pC);

  // Initialize output with sensible default
  var lineCoord = vec2f(0.0);
  output.position = pB;  // Default to segment start for early returns

  // Skip degenerate segments - if either endpoint is invalid, there's no segment to draw
  if (bInvalid || cInvalid) {
    output.lineCoord = lineCoord;
    return output;
  }

  //----------------------------------------------------------------------------
  // Compute vertex allocation for this instance's triangle strip
  //----------------------------------------------------------------------------
  // Each half of the triangle strip (B-side and C-side) needs vertices for:
  //   - The join/cap geometry fan (resolution varies based on cap vs join)
  //   - 3 extra vertices: one miter point + one segment vertex pair + connection
  //
  // The total vertex count = vB + vC where each half is (resolution + 3).
  let capRes = uniforms.vertCnt2.x;   // 2 × cap resolution (for round caps)
  let joinRes = uniforms.vertCnt2.y;  // 2 × join resolution (for round joins)

  // Choose cap resolution for line ends, join resolution for interior points
  let resB = select(joinRes, capRes, aInvalid && uniforms.insertCaps == 1u);
  let resC = select(joinRes, capRes, dInvalid && uniforms.insertCaps == 1u);
  let vB = resB + 3.0;   // Vertices for B-side (start) half
  let vC = resC + 3.0;   // Vertices for C-side (end) half
  let vTotal = vB + vC;  // Total vertices in this instance's triangle strip

  //----------------------------------------------------------------------------
  // Determine which half of the strip we're computing
  //----------------------------------------------------------------------------
  // The triangle strip is split into two halves that "mirror" each other:
  //   - First half (vertices 0 to vB-1): processes B-side join/cap + half segment
  //   - Second half (vertices vB to end): processes C-side join/cap + half segment
  //
  // When mirror is true, we swap B↔C and A↔D to reuse the same geometry logic.
  let index = f32(vertexIndex);
  let mirror = index >= vB;

  // Save the perspective w-component for the appropriate endpoint
  // (will be used to restore perspective-correct position at the end)
  let pw = select(pB.w, pC.w, mirror);

  //----------------------------------------------------------------------------
  // Convert from NDC to screen-pixel coordinates
  //----------------------------------------------------------------------------
  // All line width calculations happen in pixel space for consistent appearance.
  // We multiply xy by resolution to get pixel coordinates, then divide by w
  // for perspective correction. The z is preserved for depth testing.
  //
  // For invalid endpoints, use the w from the valid neighbor to avoid div-by-zero.
  let wA = select(pA.w, pB.w, aInvalid);
  let wD = select(pD.w, pC.w, dInvalid);
  pA = vec4f(vec3f(pA.xy * uniforms.resolution, pA.z) / wA, 1.0);
  pB = vec4f(vec3f(pB.xy * uniforms.resolution, pB.z) / pB.w, 1.0);
  pC = vec4f(vec3f(pC.xy * uniforms.resolution, pC.z) / pC.w, 1.0);
  pD = vec4f(vec3f(pD.xy * uniforms.resolution, pD.z) / wD, 1.0);

  // Depth culling: skip segments entirely outside the view frustum
  if (max(abs(pB.z), abs(pC.z)) > 1.0) {
    output.lineCoord = lineCoord;
    return output;
  }

  // Compute cap status before mirror swap (for debug varyings - used later)
  let isStartCap = aInvalid && uniforms.insertCaps == 1u;
  let isEndCap = dInvalid && uniforms.insertCaps == 1u;

  //----------------------------------------------------------------------------
  // Mirror swap: reverse perspective for second half of triangle strip
  //----------------------------------------------------------------------------
  // We reuse the same geometry computation for both halves
  // of the triangle strip by swapping the point labels. When mirrored:
  //   - B becomes C, C becomes B (swap segment endpoints)
  //   - A becomes D, D becomes A (swap the neighboring points)
  //   - aInvalid/dInvalid swap accordingly
  // After swapping, we always compute geometry relative to "B" (the near end).
  if (mirror) {
    let tmp = pC; pC = pB; pB = tmp;
    let tmp2 = pD; pD = pA; pA = tmp2;
    let tmpInv = dInvalid; dInvalid = aInvalid; aInvalid = tmpInv;
  }

  //----------------------------------------------------------------------------
  // Handle end caps vs interior joins
  //----------------------------------------------------------------------------
  // After mirroring, if A is invalid, we're at a line end. There are two options:
  //   - Insert cap: reflect A to the opposite side of B (pA = pC) to create
  //     a 180° turn, which naturally produces a semicircular cap
  //   - No cap (butt end): extrapolate A beyond B (pA = 2B - C) to create
  //     a straight continuation, resulting in a flat end
  //
  // Similarly for D if invalid (though D typically just needs extrapolation
  // for join calculations).
  let isCap = aInvalid && uniforms.insertCaps == 1u;

  if (aInvalid) {
    if (uniforms.insertCaps == 1u) {
      // Cap: mirror A across B to produce 180° turn geometry
      pA = pC;
    } else {
      // Butt end: extrapolate A beyond B for flat termination
      pA = 2.0 * pB - pC;
    }
  }
  if (dInvalid) {
    // Always extrapolate D - we only draw half the join at C, so we just
    // need a reasonable tangent direction
    pD = 2.0 * pC - pB;
  }

  //----------------------------------------------------------------------------
  // Compute tangent and normal vectors for all segments
  //----------------------------------------------------------------------------
  // tXY = unit tangent vector from point X to point Y
  // nXY = unit normal vector (90° CCW rotation of tangent)
  // lXY = length of segment XY in pixels
  //
  //         nAB ↑         nBC ↑         nCD ↑
  //              \\             \\             \\
  //    A ------> B ==========> C ------> D
  //         tAB           tBC          tCD
  //
  var tBC = pC.xy - pB.xy;
  let lBC = length(tBC);
  if (lBC > 0.0) { tBC = tBC / lBC; }
  let nBC = vec2f(-tBC.y, tBC.x);  // 90° CCW rotation

  var tAB = pB.xy - pA.xy;
  let lAB = length(tAB);
  if (lAB > 0.0) { tAB = tAB / lAB; }
  let nAB = vec2f(-tAB.y, tAB.x);

  var tCD = pD.xy - pC.xy;
  let lCD = length(tCD);
  if (lCD > 0.0) { tCD = tCD / lCD; }

  // Compute the turning angle at B (between incoming and outgoing tangents)
  // cosB = cos(π - turning_angle) = -cos(turning_angle)
  // Clamped to [-1, 1] for numerical safety when taking arccos later
  let cosB = clamp(dot(tAB, tBC), -1.0, 1.0);

  //----------------------------------------------------------------------------
  // Determine the turn direction at vertex B
  //----------------------------------------------------------------------------
  // dirB indicates which side of the line the outer join should be on:
  //   +1 = outer join is on the left (CCW turn from A→B to B→C)
  //   -1 = outer join is on the right (CW turn)
  //
  // We compute this as -dot(tBC, nAB), which is the cross product (in 2D).
  // This gives us sin(angle) between the tangent vectors.
  //
  // Edge cases:
  //   - Collinear segments: dirB ≈ 0, use mirrorSign for consistent winding
  //   - Hairpin turn (180°): collinear but pointing opposite directions
  //
  let mirrorSign = select(1.0, -1.0, mirror);  // -1 for mirrored half, +1 otherwise
  var dirB = -dot(tBC, nAB);  // Cross product: positive if CCW turn
  let bCollinear = abs(dirB) < tol;  // Nearly straight - handle specially
  let bIsHairpin = bCollinear && cosB < 0.0;  // 180° turn (antiparallel tangents)
  // For collinear segments, use mirrorSign to ensure consistent winding
  dirB = select(sign(dirB), -mirrorSign, bCollinear);

  //----------------------------------------------------------------------------
  // Compute the miter vector at B
  //----------------------------------------------------------------------------
  // The miter vector bisects the angle between the incoming and outgoing normals,
  // pointing toward the OUTSIDE of the turn (where join geometry fills the gap).
  //
  //              A                      nAB always points "left" of segment
  //              |                      nBC always points "left" of segment
  //         nAB ←|                      miter = average, flipped by dirB to
  //              |   ↖ miter                   point toward outside of turn
  //              B---------→ C
  //                   ↑
  //                  nBC
  //
  // For hairpin turns (180°), use -tBC as miter (perpendicular to the "fold")
  var miter = select(0.5 * (nAB + nBC) * dirB, -tBC, bIsHairpin);

  //----------------------------------------------------------------------------
  // Compute the join vertex index within the triangle strip
  //----------------------------------------------------------------------------
  // The triangle strip is a fan that sweeps from one side of the join to the other.
  // We need to map the raw vertex index to a "join index" i that counts from 0.
  //
  // For the mirrored half, we count backwards from the end of the strip.
  // Then we apply several adjustments:
  //   1. Shift unused vertices to negative (they become degenerate triangles)
  //   2. Adjust for turn direction (maintains consistent winding)
  //   3. Offset mirrored vertices to connect properly at the midpoint
  //
  var i = select(index, vTotal - index, mirror);  // Reverse for mirrored half
  let res = select(resB, resC, mirror);  // Resolution for this half
  i = i - max(0.0, select(resB, resC, mirror) - res);  // Shift unused vertices negative
  i = i + select(0.0, -1.0, dirB < 0.0);  // Adjust for turn direction
  i = i - select(0.0, 1.0, mirror);  // Connect halves at midpoint
  i = max(0.0, i);  // Clamp to 0 - excess vertices become degenerate triangles

  //----------------------------------------------------------------------------
  // Initialize basis vectors for vertex positioning
  //----------------------------------------------------------------------------
  // The vertex position is computed as: position = B + width * (xBasis, yBasis) · xy
  // where xy is a 2D coordinate in the local join coordinate system:
  //   x = position along tangent (for miter extension)
  //   y = position along normal (for line width)
  //
  // Default basis: x along segment tangent, y along normal (pointing outward based on dirB)
  var xBasis = tBC;
  var yBasis = nBC * dirB;
  var xy = vec2f(0.0);  // Will be computed below based on vertex type

  // lineCoord.y tracks signed distance from center: ±1 at edges, 0 at center
  lineCoord.y = dirB * mirrorSign;

  // Get line width from the appropriate vertex (B for first half, C for mirrored half)
  let width = select(vertexB.${widthField}, vertexC.${widthField}, mirror);
  let roundOrCap = uniforms.isRound == 1u || isCap;

  //----------------------------------------------------------------------------
  // Generate join/cap geometry based on vertex index
  //----------------------------------------------------------------------------
  // The triangle strip alternates between "outer" vertices (on the line boundary)
  // and "center" vertices (at the join center). The pattern is:
  //
  //   outer[0] -- outer[2] -- outer[4] -- ... (even indices)
  //        \\    /    \\    /    \\    /
  //     center[1] - center[3] - center[5] ... (odd indices)
  //
  // Special vertex: i == res + 1 is the interior miter point (for sharp inner corners)
  //
  if (i == res + 1.0) {
    //--------------------------------------------------------------------------
    // Interior miter point: the sharp inner corner of the join
    //--------------------------------------------------------------------------
    // This vertex sits on the inner side of the join, where the two line edges
    // would intersect if extended. It completes the triangle fan.
    //
    // The miter extension is: m = sin(angle) / (1 + cos(angle)) = tan(angle/2)
    // We clamp it to avoid extending beyond the adjacent segment lengths.
    let m = select((tAB.x * tBC.y - tAB.y * tBC.x) / (1.0 + cosB), 0.0, cosB <= -0.9999);
    xy = vec2f(min(abs(m), min(lBC, lAB) / width), -1.0);
    lineCoord.y = -lineCoord.y;  // Flip sign for inner side
  } else {
    //--------------------------------------------------------------------------
    // Join/cap fan geometry
    //--------------------------------------------------------------------------
    // For joins and caps, we switch to a miter-aligned coordinate system:
    //   yBasis = normalized miter direction (outward)
    //   xBasis = perpendicular to miter (along the join "fold")
    //
    let m2 = dot(miter, miter);  // Squared miter length
    let lm = sqrt(m2);
    if (lm > 0.0) {
      yBasis = miter / lm;
      xBasis = dirB * vec2f(yBasis.y, -yBasis.x);
    }

    // Determine if we should use bevel (miter too long) or miter join
    // isBevel is true when 1 > miterLimit * m²  (m² inversely related to miter length)
    let isBevel = 1.0 > uniforms.miterLimit * m2;

    if (i % 2.0 == 0.0) {
      //------------------------------------------------------------------------
      // Even vertices: outer edge of the line/join
      //------------------------------------------------------------------------
      if (roundOrCap || i != 0.0) {
        //----------------------------------------------------------------------
        // Round join/cap: compute point on the arc
        //----------------------------------------------------------------------
        // Sweep from one side of the join to the other along an arc.
        // t goes from 0 to 1 as we traverse the join.
        // theta is the angle around the arc (0 = one edge, π = opposite edge)
        //
        // For caps: sweep full 180° (capMult = 2)
        // For joins: sweep the turning angle (capMult = 1)
        let t = clamp(i, 0.0, res) / res;
        let capMult = select(1.0, 2.0, isCap);
        let theta = -0.5 * (acos(cosB) * t - pi) * capMult;
        xy = vec2f(cos(theta), sin(theta));

        if (isCap) {
          // For square caps, scale the round geometry to form a square
          // (but leave the y=0 point unaffected to maintain connection)
          if (xy.y > 0.001) {
            xy = xy * uniforms.capScale;
          }
          // For caps, lineCoord encodes position within the cap for SDF rendering
          // lineCoord.x sign indicates cap direction:
          //   Start cap (negative-facing): -1 at tip to 0 at body
          //   End cap (positive-facing): 0 at body to +1 at tip
          let prevLineCoordY = lineCoord.y;
          lineCoord.x = select(-xy.y, xy.y, mirror);
          lineCoord.y = xy.x * prevLineCoordY;
        }
      } else {
        //----------------------------------------------------------------------
        // Miter join: first vertex (i=0) uses miter extension
        //----------------------------------------------------------------------
        // For sharp joins, extend to the miter point instead of using an arc.
        // The miter length is 1/m² (in normalized coordinates).
        // If bevel mode: just use 1 (no extension, creates bevel cut)
        yBasis = select(miter, vec2f(0.0), bIsHairpin);
        xy.y = select(1.0 / m2, 1.0, isBevel);
      }
    } else {
      //------------------------------------------------------------------------
      // Odd vertices: center of the join fan
      //------------------------------------------------------------------------
      // These vertices are at the center of the line (on the neutral axis)
      lineCoord.y = 0.0;

      // For bevel joins, offset the center vertex slightly inward to make
      // the bevel SDF work correctly (creates a flat cut appearance)
      if (isBevel && !roundOrCap) {
        xy.y = -1.0 + sqrt((1.0 + cosB) * 0.5);
      }
    }
  }

  //----------------------------------------------------------------------------
  // Compute final vertex position
  //----------------------------------------------------------------------------
  // Transform from local join coordinates (xy) to pixel offset (dP) using basis
  // dP = xBasis * xy.x + yBasis * xy.y
  let dP = mat2x2f(xBasis, yBasis) * xy;

  // Compute how far along the segment this vertex projects (for varying interpolation)
  // dx is the signed projection of dP onto the tangent direction
  let dx = dot(dP, tBC) * mirrorSign;

  // Note: lineCoord.x stays at 0 for segments/joins (initialized at start)
  // For caps, lineCoord.x was set in the cap geometry block above

  // Apply the position offset and convert back to NDC
  var pos = pB;
  pos.x = pos.x + width * dP.x;  // Add width-scaled offset in pixels
  pos.y = pos.y + width * dP.y;
  pos.x = pos.x / uniforms.resolution.x;  // Convert back to NDC
  pos.y = pos.y / uniforms.resolution.y;
  pos = pos * pw;  // Restore perspective (multiply by saved w)

  //----------------------------------------------------------------------------
  // Interpolate varyings between B and C
  //----------------------------------------------------------------------------
  // useC is the interpolation factor: 0 = use B's values, 1 = use C's values
  // For the mirrored half, we start at C (useC = 1) and subtract the offset
  // The dx term accounts for join geometry extending beyond the segment
  let useC = select(0.0, 1.0, mirror) + dx * (width / lBC);

  // Interpolate user varyings
${varyingInterpolation}

  //----------------------------------------------------------------------------
  // Populate output structure
  //----------------------------------------------------------------------------
  output.position = pos;
  output.lineCoord = lineCoord;
${varyingOutputAssign}

  // Debug varyings for visualization and wireframe rendering
  // instanceID: segment index, or negative (-index - 1) for cap vertices
  // This encoding preserves alternation while indicating cap status
  // Note: isStartCap and isEndCap were computed before the mirror swap
  output.instanceID = select(f32(instanceIndex), -f32(instanceIndex) - 1.0, isStartCap || isEndCap);

  // triStripCoord: encodes position within the triangle strip
  //   x: which pair of vertices (0, 1, 2, ...)
  //   y: top (1) or bottom (0) of the strip
  // Useful for wireframe rendering and debugging strip connectivity
  output.triStripCoord = vec2f(floor(f32(vertexIndex) * 0.5), f32(vertexIndex % 2u));

  return output;
}
`;
}
/**
 * Create the fragment shader
 */
function createFragmentShader({ userCode, varyings }) {
    // Generate varying declarations for FragmentInput
    const varyingInputDecls = varyings.map((v, i) => `  @location(${i + 1}) ${v.name}: ${v.type},`).join('\n');
    // Library debug varyings come after user varyings
    const debugVaryingStartLoc = varyings.length + 1;
    // Generate varying arguments for getColor call
    const varyingArgs = varyings.map(v => `input.${v.name}`).join(', ');
    const getColorArgs = varyingArgs ? `, ${varyingArgs}` : '';
    // Detect if user's getColor expects debug varyings by checking for instanceID in the code
    const wantsDebugVaryings = /\binstanceID\b/.test(userCode);
    const debugArgs = wantsDebugVaryings ? ', input.instanceID, input.triStripCoord' : '';
    // Same opt-in for the fragment's own framebuffer position. Passed last, so
    // adding it does not disturb an existing getColor signature. Techniques that
    // compare a fragment against another buffer at the same pixel -- depth
    // peeling and the rest of order-independent transparency, soft particles,
    // screen-space dithering -- need it and cannot reconstruct it: the position a
    // vertex function can hand across is on the line's centre, and the fragment
    // may be up to half a stroke width away from it, which is exactly where those
    // techniques show their artifacts.
    const wantsFragPosition = /\bfragPosition\b/.test(userCode);
    const fragPositionArg = wantsFragPosition ? ', input.fragPosition' : '';
    return /* wgsl */ `
//------------------------------------------------------------------------------
// GPU Lines Fragment Shader
//------------------------------------------------------------------------------
//
// The fragment shader receives interpolated line coordinates and user varyings,
// then calls the user-provided getColor() function to compute the final color.
//
// Inputs:
//   lineCoord.x: for caps, signed distance into cap (-1 to 0 for start caps, 0 to +1 for end caps); 0 for segments/joins
//   lineCoord.y: signed distance from line center (-1 to 1, edges at ±1)
//
// A getColor that names a parameter fragPosition additionally receives the
// fragment's builtin position, passed last, after any debug varyings.
//
// These coordinates can be used to implement:
//   - Anti-aliasing using SDF (signed distance field)
//   - Round vs square cap appearance
//   - Dashed lines (using lineCoord.x for cap position)
//
//------------------------------------------------------------------------------

// Library uniforms (shared with vertex shader)
struct Uniforms {
  resolution: vec2f,
  vertCnt2: vec2f,
  miterLimit: f32,
  isRound: u32,
  pointCount: u32,
  insertCaps: u32,
  capScale: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct FragmentInput {
  // Framebuffer position of this fragment: xy in pixels, z the depth written.
  @builtin(position) fragPosition: vec4f,
  // Line coordinate for SDF-based effects
  @location(0) lineCoord: vec2f,
${varyingInputDecls}
  // Debug: segment index (negative for caps)
  @location(${debugVaryingStartLoc}) instanceID: f32,
  // Debug: position in triangle strip (for wireframe)
  @location(${debugVaryingStartLoc + 1}) triStripCoord: vec2f,
}

${userCode}

@fragment
fn fragmentMain(input: FragmentInput) -> @location(0) vec4f {
  return getColor(input.lineCoord${getColorArgs}${debugArgs}${fragPositionArg});
}
`;
}

export { createGPULines };
//# sourceMappingURL=webgpu-instanced-lines.esm.js.map
