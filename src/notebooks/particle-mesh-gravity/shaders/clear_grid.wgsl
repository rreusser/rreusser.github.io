// Clear grid shader - zeros the atomic density accumulator

struct ClearParams {
  gridSize: u32,
}

@group(0) @binding(0) var<storage, read_write> densityAtomic: array<atomic<i32>>;
@group(0) @binding(1) var<uniform> params: ClearParams;

@compute @workgroup_size(16, 16)
fn clear_grid(@builtin(global_invocation_id) id: vec3<u32>) {
  let N = params.gridSize;
  if (id.x >= N || id.y >= N) { return; }

  let idx = id.y * N + id.x;
  atomicStore(&densityAtomic[idx], 0);
}
