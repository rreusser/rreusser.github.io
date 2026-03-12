# LSAO Integration Plan: Parent Tile Horizon Initialization

**Goal:** Adapt the existing LSAO shader to use parent tile data for horizon initialization

## Current State

**Existing LSAO (`src/line-sweep-ambient-occlusion-with-webgpu/`):**
- ✅ Working line-sweep algorithm on single tile
- ✅ 4 cardinal direction sweeps (E, W, N, S)
- ✅ Convex hull tracking with 64-element stack
- ✅ ~20x faster than CPU version
- ❌ Starts each scanline at tile edge (no off-tile context)
- ❌ Only uses 1px buffer for edge sampling

**New Infrastructure (`src/line-sweep-terrain-lighting/terrain/`):**
- ✅ Parent tile fetching and assembly
- ✅ 768×768 parent buffer at z-1 resolution
- ✅ Covers 3×3 block of z tiles
- ✅ All quadrant cases handled correctly

## Integration Architecture

### Coordinate Systems

1. **Target Tile Space** (512×512)
   - Coordinates: `(tx, ty)` where `0 ≤ tx, ty < 512`
   - Resolution: z (target zoom level)

2. **Parent Buffer Space** (768×768)
   - Coordinates: `(px, py)` where `0 ≤ px, py < 768`
   - Resolution: z-1 (one zoom level coarser)
   - Target tile occupies 256×256 region within this space

3. **Mapping:**
   - Target tile center in parent space: depends on quadrant
   - **NW quadrant:** target region = `px ∈ [256, 512), py ∈ [256, 512)`
   - **NE quadrant:** target region = `px ∈ [256, 512), py ∈ [0, 256)`
   - **SW quadrant:** target region = `px ∈ [0, 256), py ∈ [256, 512)`
   - **SE quadrant:** target region = `px ∈ [0, 256), py ∈ [0, 256)`

### Sweep Phases

Each scanline sweep has **two phases**:

#### Phase 1: Parent Buffer Horizon Building
- **Where:** Outside target tile region
- **Sample from:** Parent buffer (768×768)
- **Action:** Build convex hull, NO AO computation (off-tile)
- **Purpose:** Initialize horizon with surrounding terrain

#### Phase 2: Target Tile Computation
- **Where:** Inside target tile region (256-wide in parent space)
- **Sample from:** Target tile (514×514 with buffer)
- **Action:** Continue hull updates AND compute AO
- **Output:** AO values for target tile pixels

### Example: Eastward Sweep (→) in NE Quadrant

```
Parent buffer x-axis: 0 ─────────→ 767
                           256   511
                            │     │
Phase 1: x ∈ [0, 256)      │     │  Build hull (parent data)
Phase 2: x ∈ [256, 512)    └─────┘  Compute AO (target data)
Phase 3: x ∈ [512, 768)             Continue hull (parent data)
                                    [AO not computed, off-tile]
```

**Implementation:**
- March x from 0 to 767 in parent space
- When x < 256: sample parent buffer, hull only
- When 256 ≤ x < 512: sample target tile, hull + AO
- When x ≥ 512: sample parent buffer, hull only (for correctness)

## Shader Changes

### New Binding Layout

```wgsl
@binding(0) @group(0) var<uniform> uniforms: UniformStruct;
@binding(1) @group(0) var<storage, read> terrainData: array<f32>;      // Target 514×514
@binding(2) @group(0) var<storage, read_write> outputData: array<f32>; // Target 512×512
@binding(3) @group(0) var<storage, read> parentData: array<f32>;       // Parent 768×768 (NEW)
```

### New Uniforms

```wgsl
struct UniformStruct {
  tilesize: vec2<u32>,        // Target tile size (512, 512)
  step: vec2<i32>,            // Sweep direction
  buffer: i32,                // Target tile buffer (1)
  pixelSize: f32,             // Target pixel size in meters
  normalization: f32,         // 1 / num_directions

  // NEW: Parent buffer info
  parentSize: u32,            // 768
  targetOffsetInParent: vec2<i32>,  // Depends on quadrant
}
```

### Sampling Strategy

```wgsl
// Determine which buffer to sample based on position in parent space
fn sampleElevation(posInParent: vec2<i32>) -> f32 {
  let targetMin = uniforms.targetOffsetInParent;
  let targetMax = targetMin + vec2<i32>(i32(tileSize), i32(tileSize));

  // Check if position is within target tile region
  if (all(posInParent >= targetMin) && all(posInParent < targetMax)) {
    // Sample from target tile
    let posInTarget = posInParent - targetMin;
    return terrainData[bufferedIndex(posInTarget)];
  } else {
    // Sample from parent buffer
    return parentData[posInParent.y * 768 + posInParent.x];
  }
}
```

### Modified Main Loop

```wgsl
@compute @workgroup_size(workgroupSize)
fn main(@builtin(global_invocation_id) coord: vec3u) {
  // Start position in parent buffer space
  var posInParent = vec2<i32>(...);  // Edge of 768×768 based on direction

  var hull: array<vec3<f32>, 64>;
  var hullPtr = 0u;

  // Initialize hull with point just outside parent buffer
  hull[0] = vec3<f32>(...);

  // March through ENTIRE parent buffer (768 pixels at parent res)
  // This covers ~1536 target pixels worth of distance
  let numSteps = 768u;

  for (var i = 0u; i < numSteps; i++) {
    let z = sampleElevation(posInParent);
    let ijz = vec3<f32>(vec2<f32>(posInParent), z);

    // Update hull (same as before)
    // ...

    // Only compute AO if inside target tile region
    let targetMin = uniforms.targetOffsetInParent;
    let targetMax = targetMin + vec2<i32>(i32(tileSize), i32(tileSize));

    if (all(posInParent >= targetMin) && all(posInParent < targetMax)) {
      let posInTarget = posInParent - targetMin;
      let uidx = unbufferedIndex(posInTarget);

      // Compute and accumulate AO contribution
      outputData[uidx] += ...;
    }

    posInParent += uniforms.step;
  }
}
```

## Implementation Steps

### 1. Create New Shader Module
- Copy existing LSAO shader from `line-sweep-ambient-occlusion-with-webgpu`
- Add parent buffer binding
- Add coordinate mapping logic
- Split sampling between target and parent buffers

### 2. Update Pipeline
- Add 4th binding for parent buffer
- Update uniform structure
- Calculate `targetOffsetInParent` based on quadrant

### 3. Update Execution
- Fetch and assemble parent buffer (already done ✓)
- Create parent buffer GPU buffer
- Calculate target offset in parent space
- Dispatch compute passes

### 4. Testing
- Verify horizon initialization with synthetic data
- Compare with/without parent data
- Check all quadrant cases
- Validate AO quality at tile boundaries

## Open Questions

1. **Pixel size mismatch:** Parent is 2× coarser. How to handle elevation gradients?
   - Option A: Sample parent as-is (simpler, may have discontinuity)
   - Option B: Interpolate parent data (smoother, more complex)
   - **Recommendation:** Start with Option A, it should be fine for distant terrain

2. **Hull size:** Current 64-element limit. Is this enough for 768-pixel sweeps?
   - Existing: 512 pixels, 64 stack
   - New: 768 pixels through parent → may need more hull elements
   - **Recommendation:** Increase to 128 or 256 if overflow occurs

3. **Distance metric:** When mixing parent and target data, distances are in different spaces
   - Parent: z-1 resolution, coarser pixels
   - Target: z resolution, finer pixels
   - **Recommendation:** Scale parent positions by 2× to match target resolution

## Success Criteria

- [ ] Seamless AO at tile boundaries (no visible seams)
- [ ] Proper shadowing from off-tile terrain
- [ ] Performance < 1ms per tile (currently ~0.5ms for 4 directions)
- [ ] Works for all quadrant cases
- [ ] Visual quality matches or exceeds single-tile LSAO

## Timeline

1. **Phase 1:** Shader adaptation (2-3 hours)
2. **Phase 2:** Integration with terrain pipeline (1 hour)
3. **Phase 3:** Testing and debugging (2-3 hours)
4. **Phase 4:** Performance optimization (as needed)

**Total estimated:** 5-7 hours of development
