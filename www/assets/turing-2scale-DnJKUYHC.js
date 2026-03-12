import{createFFTPipelines as we,createVec4FFTPipelines as Ne,executeVec4FFT2D as W}from"./fft-Chkx7JT6.js";const Ce=`
struct InitParams {
  resolution: vec2<u32>,
  seed: u32,
  _pad: u32,
}

@group(0) @binding(0) var<storage, read_write> field: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: InitParams;

fn pcg(state: ptr<function, u32>) -> f32 {
  let s = *state;
  *state = s * 747796405u + 2891336453u;
  let word = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return f32((word >> 22u) ^ word) / 4294967295.0;
}

@compute @workgroup_size(16, 16, 1)
fn initialize(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let res = params.resolution;

  if (x >= res.x || y >= res.y) { return; }

  let idx = y * res.x + x;
  var rng_state = params.seed ^ (idx * 1664525u + 1013904223u);

  let value = (pcg(&rng_state) - 0.5) * 0.1;
  field[idx] = vec2<f32>(value, 0.0);
}
`,_e=`
struct ExtractParams {
  resolution: vec2<u32>,
  _pad0: u32,
  _pad1: u32,
}

@group(0) @binding(0) var<storage, read> field: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> output: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: ExtractParams;

@compute @workgroup_size(16, 16, 1)
fn extract(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let N = params.resolution.x;

  if (x >= N || y >= N) { return; }

  let idx = y * N + x;
  let f = field[idx].x;

  // Pack as two identical complex numbers: (f + 0i, f + 0i)
  output[idx] = vec4<f32>(f, 0.0, f, 0.0);
}
`,ze=`
struct ConvolveParams {
  resolution: vec2<u32>,
  _pad: vec2<u32>,
  radii: vec4<f32>,  // (A1, I1, A2, I2)
}

@group(0) @binding(0) var<storage, read> fhatFreq: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> output: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: ConvolveParams;

fn gaussianKernelFreq(freq: vec2<f32>, sigma: f32) -> f32 {
  let PI = 3.14159265359;
  let f2 = dot(freq, freq);
  return exp(-2.0 * PI * PI * sigma * sigma * f2);
}

// Complex multiplication: (a + bi) * (c + di) = (ac - bd) + i(ad + bc)
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

@compute @workgroup_size(16, 16, 1)
fn convolve(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let N = params.resolution.x;

  if (x >= N || y >= N) { return; }

  // Compute frequency coordinates
  var fx = f32(x) / f32(N);
  var fy = f32(y) / f32(N);
  if (fx > 0.5) { fx -= 1.0; }
  if (fy > 0.5) { fy -= 1.0; }
  let freq = vec2<f32>(fx, fy);

  let idx = y * N + x;
  let fhat = fhatFreq[idx];  // (F1_re, F1_im, F2_re, F2_im) - two copies of F

  // Compute 4 Gaussian kernels (real-valued in frequency domain)
  let k_a1 = gaussianKernelFreq(freq, params.radii.x);
  let k_i1 = gaussianKernelFreq(freq, params.radii.y);
  let k_a2 = gaussianKernelFreq(freq, params.radii.z);
  let k_i2 = gaussianKernelFreq(freq, params.radii.w);

  // Form complex kernels: K1 = k_a1 + i*k_i1, K2 = k_a2 + i*k_i2
  let K1 = vec2<f32>(k_a1, k_i1);
  let K2 = vec2<f32>(k_a2, k_i2);

  // Extract the two complex FFT results
  let F1 = vec2<f32>(fhat.x, fhat.y);
  let F2 = vec2<f32>(fhat.z, fhat.w);

  // Complex multiply: F * K
  // After IFFT, real part = activator conv, imag part = inhibitor conv
  let result1 = cmul(F1, K1);
  let result2 = cmul(F2, K2);

  output[idx] = vec4<f32>(result1.x, result1.y, result2.x, result2.y);
}
`,Te=`
struct UpdateParams {
  resolution: vec2<u32>,
  stepSize: f32,
  toneMapRange: f32,
}

@group(0) @binding(0) var<storage, read> fieldIn: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> convResult: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> fieldOut: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> scaleSelection: array<u32>;
@group(0) @binding(4) var<uniform> params: UpdateParams;

@compute @workgroup_size(16, 16, 1)
fn update(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let N = params.resolution.x;

  if (x >= N || y >= N) { return; }

  let idx = y * N + x;

  let f = fieldIn[idx].x;
  let conv = convResult[idx];

  // After IFFT: real parts = activator convolutions, imag parts = inhibitor convolutions
  // conv = (A1, I1, A2, I2) where A = activator*u, I = inhibitor*u
  let a1 = conv.x;  // Scale 1 activator (real part of first complex)
  let i1 = conv.y;  // Scale 1 inhibitor (imag part of first complex)
  let a2 = conv.z;  // Scale 2 activator (real part of second complex)
  let i2 = conv.w;  // Scale 2 inhibitor (imag part of second complex)

  // Compute variation (|activator - inhibitor|) for each scale
  let var1 = abs(a1 - i1);
  let var2 = abs(a2 - i2);

  // Select scale with minimum variation
  var selectedScale: u32;
  var delta: f32;
  if (var1 <= var2) {
    selectedScale = 0u;
    delta = sign(a1 - i1);
  } else {
    selectedScale = 1u;
    delta = sign(a2 - i2);
  }

  // Store scale selection for visualization
  scaleSelection[idx] = selectedScale;

  // Update with fixed step size
  let newValue = f + delta * params.stepSize;

  // Tonemapping with atan
  let range = params.toneMapRange;
  let mapped = atan(range * newValue) / range;

  fieldOut[idx] = vec2<f32>(mapped, 0.0);
}
`,Me=`
struct PaintParams {
  resolution: vec2<u32>,
  mouse: vec2<f32>,
  radius: f32,
  value: f32,
  _pad0: u32,
  _pad1: u32,
}

@group(0) @binding(0) var<storage, read_write> field: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: PaintParams;

@compute @workgroup_size(16, 16, 1)
fn paint(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let N = params.resolution.x;

  if (x >= N || y >= N) { return; }

  let idx = y * N + x;
  let uv = vec2<f32>(f32(x) / f32(N), f32(y) / f32(N));
  let diff = uv - params.mouse;
  let dist = length(diff);

  if (dist < params.radius) {
    let falloff = 1.0 - dist / params.radius;
    let current = field[idx].x;
    let paintVal = params.value;
    field[idx] = vec2<f32>(mix(current, paintVal, falloff * 0.5), 0.0);
  }
}
`,Ee=`
struct VisParams {
  resolution: vec2<u32>,
  showScaleTint: u32,
  _pad: u32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var<storage, read> field: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> scaleSelection: array<u32>;
@group(0) @binding(2) var<uniform> params: VisParams;

// Sample field with wrapping
fn sampleField(x: i32, y: i32, N: u32) -> f32 {
  let Nu = i32(N);
  let wx = u32(((x % Nu) + Nu) % Nu);
  let wy = u32(((y % Nu) + Nu) % Nu);
  return field[wy * N + wx].x;
}

// Sample scale selection (nearest neighbor since it's discrete)
fn sampleScale(x: i32, y: i32, N: u32) -> u32 {
  let Nu = i32(N);
  let wx = u32(((x % Nu) + Nu) % Nu);
  let wy = u32(((y % Nu) + Nu) % Nu);
  return scaleSelection[wy * N + wx];
}

@vertex
fn vertex(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0)
  );

  var output: VertexOutput;
  output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4<f32> {
  let N = params.resolution.x;
  let Nf = f32(N);

  // Compute texel coordinates (flip Y)
  let tx = input.uv.x * Nf - 0.5;
  let ty = (1.0 - input.uv.y) * Nf - 0.5;

  // Integer and fractional parts
  let x0 = i32(floor(tx));
  let y0 = i32(floor(ty));
  let fx = tx - floor(tx);
  let fy = ty - floor(ty);

  // Bilinear interpolation of field values
  let f00 = sampleField(x0, y0, N);
  let f10 = sampleField(x0 + 1, y0, N);
  let f01 = sampleField(x0, y0 + 1, N);
  let f11 = sampleField(x0 + 1, y0 + 1, N);
  let f = mix(mix(f00, f10, fx), mix(f01, f11, fx), fy);

  let gray = clamp(0.5 + 1.3 * f, 0.0, 1.0);
  var color = vec3<f32>(gray, gray, gray);

  if (params.showScaleTint == 1u) {
    // For scale tint, use nearest neighbor (round to nearest texel)
    let px = i32(round(tx));
    let py = i32(round(ty));
    let scale = sampleScale(px, py, N);

    // Scale 0 (fine): blue tint, Scale 1 (coarse): orange tint
    let blueTint = vec3<f32>(0.2, 0.4, 1.0);
    let orangeTint = vec3<f32>(1.0, 0.4, 0.2);
    let tint = select(orangeTint, blueTint, scale == 0u);
    color = mix(color, tint, 0.5);
  }

  return vec4<f32>(color, 1.0);
}
`;function Ie(e,X={}){const{width:I=256,height:$=256,activatorRadius1:j=3,inhibitorRatio1:H=2,activatorRadius2:J=20,inhibitorRatio2:Q=2,stepSize:Z=.02,toneMapRange:ee=1}=X,t=I;if(I!==$)throw new Error("Width and height must be equal");if((t&t-1)!==0)throw new Error("Grid size must be a power of 2");let te=Z,re=ee,w=j,q=H,N=J,R=Q,k=!0;const y=t*t*2*4,m=t*t*4*4,ae=t*t*4,s=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,n=[e.createBuffer({label:"Field 0",size:y,usage:s}),e.createBuffer({label:"Field 1",size:y,usage:s})],A=[e.createBuffer({label:"FFT temp 0",size:y,usage:s}),e.createBuffer({label:"FFT temp 1",size:y,usage:s})],p=e.createBuffer({label:"Vec4 FFT work",size:m,usage:s}),x=[e.createBuffer({label:"Vec4 FFT temp 0",size:m,usage:s}),e.createBuffer({label:"Vec4 FFT temp 1",size:m,usage:s})],d=e.createBuffer({label:"Conv result",size:m,usage:s}),b=e.createBuffer({label:"Scale selection",size:ae,usage:s}),P=e.createBuffer({label:"Init params",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),v=e.createBuffer({label:"Extract params",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),C=e.createBuffer({label:"Convolve params",size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),S=e.createBuffer({label:"Update params",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),U=e.createBuffer({label:"Visualize params",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),h=e.createBuffer({label:"Paint params",size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),ie=e.createShaderModule({label:"Initialize",code:Ce}),ne=e.createShaderModule({label:"Extract",code:_e}),oe=e.createShaderModule({label:"Convolve",code:ze}),ue=e.createShaderModule({label:"Update",code:Te}),le=e.createShaderModule({label:"Paint",code:Me}),L=e.createShaderModule({label:"Visualize",code:Ee});we(e,t,"f32");const V=Ne(e,t,e.limits.maxComputeWorkgroupSizeX,"f32"),_=e.createBindGroupLayout({label:"Init layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),z=e.createBindGroupLayout({label:"Extract layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),K=e.createBindGroupLayout({label:"Convolve layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),T=e.createBindGroupLayout({label:"Update layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),M=e.createBindGroupLayout({label:"Paint layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),E=e.createBindGroupLayout({label:"Visualize layout",entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),se=e.createComputePipeline({label:"Initialize pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[_]}),compute:{module:ie,entryPoint:"initialize"}}),fe=e.createComputePipeline({label:"Extract pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[z]}),compute:{module:ne,entryPoint:"extract"}}),ce=e.createComputePipeline({label:"Convolve pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[K]}),compute:{module:oe,entryPoint:"convolve"}}),pe=e.createComputePipeline({label:"Update pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[T]}),compute:{module:ue,entryPoint:"update"}}),de=e.createComputePipeline({label:"Paint pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[M]}),compute:{module:le,entryPoint:"paint"}}),be=[e.createBindGroup({label:"Init bind group 0",layout:_,entries:[{binding:0,resource:{buffer:n[0]}},{binding:1,resource:{buffer:P}}]}),e.createBindGroup({label:"Init bind group 1",layout:_,entries:[{binding:0,resource:{buffer:n[1]}},{binding:1,resource:{buffer:P}}]})],ge=[e.createBindGroup({label:"Extract bind group 0",layout:z,entries:[{binding:0,resource:{buffer:n[0]}},{binding:1,resource:{buffer:p}},{binding:2,resource:{buffer:v}}]}),e.createBindGroup({label:"Extract bind group 1",layout:z,entries:[{binding:0,resource:{buffer:n[1]}},{binding:1,resource:{buffer:p}},{binding:2,resource:{buffer:v}}]})],ye=e.createBindGroup({label:"Convolve bind group",layout:K,entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:d}},{binding:2,resource:{buffer:C}}]}),me=[e.createBindGroup({label:"Update bind group 0->1",layout:T,entries:[{binding:0,resource:{buffer:n[0]}},{binding:1,resource:{buffer:d}},{binding:2,resource:{buffer:n[1]}},{binding:3,resource:{buffer:b}},{binding:4,resource:{buffer:S}}]}),e.createBindGroup({label:"Update bind group 1->0",layout:T,entries:[{binding:0,resource:{buffer:n[1]}},{binding:1,resource:{buffer:d}},{binding:2,resource:{buffer:n[0]}},{binding:3,resource:{buffer:b}},{binding:4,resource:{buffer:S}}]})],xe=[e.createBindGroup({label:"Paint bind group 0",layout:M,entries:[{binding:0,resource:{buffer:n[0]}},{binding:1,resource:{buffer:h}}]}),e.createBindGroup({label:"Paint bind group 1",layout:M,entries:[{binding:0,resource:{buffer:n[1]}},{binding:1,resource:{buffer:h}}]})];let c=0,O=0,G=null;const l=Math.ceil(t/16);function Pe(){const a=Math.floor(Math.random()*4294967295),i=new Uint32Array([t,t,a,0]);e.queue.writeBuffer(P,0,i);const o=e.createCommandEncoder({label:"Initialize"});for(let r=0;r<2;r++){const u=o.beginComputePass({label:`Initialize ${r}`});u.setPipeline(se),u.setBindGroup(0,be[r]),u.dispatchWorkgroups(l,l,1),u.end()}e.queue.submit([o.finish()]),c=0,O=0}function ve(a,i,o,r){w=a,q=i,N=o,R=r}function Se(a){k=a}function Ue(a){G=a}function he(){if(!G)return;const a=new ArrayBuffer(32),i=new Uint32Array(a),o=new Float32Array(a);i[0]=t,i[1]=t,o[2]=G[0],o[3]=G[1],o[4]=.08,o[5]=1,e.queue.writeBuffer(h,0,a);const r=e.createCommandEncoder({label:"Paint"}),u=r.beginComputePass({label:"Paint"});u.setPipeline(de),u.setBindGroup(0,xe[c]),u.dispatchWorkgroups(l,l,1),u.end(),e.queue.submit([r.finish()])}function Ge(){he();const a=new Uint32Array([t,t,0,0]);e.queue.writeBuffer(v,0,a);const i=new Float32Array(8),o=new Uint32Array(i.buffer);o[0]=t,o[1]=t,i[4]=w,i[5]=w*q,i[6]=N,i[7]=N*R,e.queue.writeBuffer(C,0,i);const r=new Float32Array(4),u=new Uint32Array(r.buffer);u[0]=t,u[1]=t,r[2]=te,r[3]=re,e.queue.writeBuffer(S,0,r);const g=e.createCommandEncoder({label:"Extract"}),f=g.beginComputePass({label:"Extract"});f.setPipeline(fe),f.setBindGroup(0,ge[c]),f.dispatchWorkgroups(l,l,1),f.end(),e.queue.submit([g.finish()]),W({device:e,pipelines:V,input:p,output:p,temp:x,N:t,forward:!0,splitNormalization:!0});const Y=e.createCommandEncoder({label:"Convolve"}),B=Y.beginComputePass({label:"Convolve"});B.setPipeline(ce),B.setBindGroup(0,ye),B.dispatchWorkgroups(l,l,1),B.end(),e.queue.submit([Y.finish()]),W({device:e,pipelines:V,input:d,output:d,temp:x,N:t,forward:!1,splitNormalization:!0});const D=e.createCommandEncoder({label:"Update"}),F=D.beginComputePass({label:"Update"});F.setPipeline(pe),F.setBindGroup(0,me[c]),F.dispatchWorkgroups(l,l,1),F.end(),e.queue.submit([D.finish()]),c=1-c,O++}function Be(a){const i=e.createRenderPipeline({label:"Visualize pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[E]}),vertex:{module:L,entryPoint:"vertex"},fragment:{module:L,entryPoint:"fragment",targets:[{format:a}]},primitive:{topology:"triangle-list"}}),o=[e.createBindGroup({label:"Visualize bind group 0",layout:E,entries:[{binding:0,resource:{buffer:n[0]}},{binding:1,resource:{buffer:b}},{binding:2,resource:{buffer:U}}]}),e.createBindGroup({label:"Visualize bind group 1",layout:E,entries:[{binding:0,resource:{buffer:n[1]}},{binding:1,resource:{buffer:b}},{binding:2,resource:{buffer:U}}]})];return{render(r){const u=new Uint32Array([t,t,k?1:0,0]);e.queue.writeBuffer(U,0,u);const g=e.createCommandEncoder({label:"Render"}),f=g.beginRenderPass({colorAttachments:[{view:r,loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:1}}]});f.setPipeline(i),f.setBindGroup(0,o[c]),f.draw(3,1,0,0),f.end(),e.queue.submit([g.finish()])}}}function Fe(){n[0].destroy(),n[1].destroy(),A[0].destroy(),A[1].destroy(),p.destroy(),x[0].destroy(),x[1].destroy(),d.destroy(),b.destroy(),P.destroy(),v.destroy(),C.destroy(),S.destroy(),U.destroy(),h.destroy()}return{initialize:Pe,setScales:ve,setShowScaleTint:Se,setMouse:Ue,step:Ge,createRenderer:Be,destroy:Fe,get iteration(){return O},get width(){return t},get height(){return t}}}export{Ie as createTuring2Scale};
