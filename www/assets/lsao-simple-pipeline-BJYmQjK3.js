const f=`
override tileSize = 512u;
override tileBuffer = 1u;
override workgroupSize = 128;

struct UniformStruct {
  tilesize: vec2<u32>,
  step: vec2<i32>,
  buffer: i32,
  pixelSize: f32,
  normalization: f32,
  padding1: f32,
  padding2: f32,
  padding3: f32
}

@binding(0) @group(0) var<uniform> uniforms: UniformStruct;
@binding(1) @group(0) var<storage, read> terrainData: array<f32>;
@binding(2) @group(0) var<storage, read_write> outputData: array<f32>;

fn unbufferedIndex(ij: vec2<i32>) -> u32 {
  return (u32(ij.x) % tileSize) + u32(ij.y) * tileSize;
}

fn bufferedIndex(ij: vec2<i32>) -> u32 {
  let w = tileSize + 2u * tileBuffer;
  let ijbuf = vec2<u32>(ij + i32(tileBuffer));
  return (ijbuf.x % w) + (ijbuf.y) * w;
}

@compute @workgroup_size(workgroupSize)
fn main(@builtin(global_invocation_id) coord: vec3u) {
  // Each invocation processes one scanline
  var ij = vec2<i32>(i32(coord.x), i32(coord.x));

  // Determine starting position based on sweep direction
  if (uniforms.step.y == 0) {
    // Horizontal sweep (east or west)
    ij.x = select(0i, i32(tileSize - 1u), uniforms.step.x < 0i);
  } else if (uniforms.step.x == 0) {
    // Vertical sweep (north or south)
    ij.y = select(0i, i32(tileSize - 1u), uniforms.step.y < 0i);
  }

  // Initialize convex hull stack with point just before starting edge
  var hull: array<vec3<f32>, 64>;
  hull[0] = vec3<f32>(vec2<f32>(ij - uniforms.step), terrainData[bufferedIndex(ij - uniforms.step)]);
  var hullPtr = 0u;

  // Sweep across the scanline
  for (var i = 0u; i < tileSize; i = i + 1u) {
    let uidx = unbufferedIndex(ij);
    let bidx = bufferedIndex(ij);
    let z = terrainData[bidx];
    let ijz = vec3<f32>(vec2<f32>(ij), z);

    // Compute visibility metric for current point
    var dijz = hull[hullPtr] - ijz;
    var s0 = dijz.z * dijz.z / dot(dijz, dijz);
    s0 = select(-s0, s0, dijz.z > 0.0);

    // Pop hull points that are occluded by current point
    while(hullPtr > 0u) {
      dijz = hull[hullPtr - 1u] - ijz;
      var s1 = dijz.z * dijz.z / dot(dijz, dijz);
      s1 = select(-s1, s1, dijz.z > 0.0);

      if (s0 > s1) { break; }

      s0 = s1;
      hullPtr -= 1u;
    }

    // Compute AO contribution from horizon
    dijz = hull[hullPtr] - ijz;
    dijz = vec3(dijz.xy, dijz.z / uniforms.pixelSize);
    outputData[uidx] = outputData[uidx] + uniforms.normalization * exp(-dijz.z / length(dijz));

    // Push current point onto hull
    // Fail silently but gracefully if we overflow the stack
    hullPtr = min(hullPtr + 1u, 63u);
    hull[hullPtr] = ijz;

    ij = ij + uniforms.step;
  }
}
`;function d(e,i){return e.createShaderModule({code:i,label:"Simple LSAO shader"})}function c(e,i={}){const o=i.tileSize||512,l=i.tileBuffer||1,a=i.workgroupSize||128,s=d(e,f),t=e.createBindGroupLayout({label:"Simple LSAO bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform",hasDynamicOffset:!0}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}]}),u=e.createPipelineLayout({label:"Simple LSAO pipeline layout",bindGroupLayouts:[t]});return{pipeline:e.createComputePipeline({label:"Simple LSAO compute pipeline",layout:u,compute:{module:s,entryPoint:"main",constants:{tileSize:o,tileBuffer:l,workgroupSize:a}}}),bindGroupLayout:t}}function p({tileSize:e,step:i,buffer:o,pixelSize:l,normalization:a}){const t=new Uint8Array(256),u=new Int32Array(t.buffer),n=new Uint32Array(t.buffer),r=new Float32Array(t.buffer);return n[0]=e[0],n[1]=e[1],u[2]=i[0],u[3]=i[1],n[4]=o,r[5]=l,r[6]=a,r[7]=0,r[8]=0,r[9]=0,t}export{c as createSimpleLSAOPipeline,p as packSimpleLSAOUniforms};
