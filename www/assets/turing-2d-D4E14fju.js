import{createFFTPipelines as pe,executeFFT2D as T}from"./fft-Chkx7JT6.js";const de=`
struct InitParams {
  resolution: vec2<u32>,
  seed: u32,
  _pad: u32,
}

@group(0) @binding(0) var<storage, read_write> field: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: InitParams;

// PCG random number generator
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

  // Random value in [-0.05, 0.05] matching 1D simulation
  let value = (pcg(&rng_state) - 0.5) * 0.1;

  // Store as complex number (real part only, imaginary = 0)
  field[idx] = vec2<f32>(value, 0.0);
}
`,ge=`
struct ConvolveParams {
  resolution: vec2<u32>,
  activatorRadius: f32,
  inhibitorRadius: f32,
}

@group(0) @binding(0) var<storage, read> fhatFreq: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> activator: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> inhibitor: array<vec2<f32>>;
@group(0) @binding(3) var<uniform> params: ConvolveParams;

// Gaussian kernel in frequency domain: exp(-2 * pi^2 * sigma^2 * f^2)
fn gaussianKernelFreq(freq: vec2<f32>, sigma: f32) -> f32 {
  let PI = 3.14159265359;
  let f2 = dot(freq, freq);
  return exp(-2.0 * PI * PI * sigma * sigma * f2);
}

@compute @workgroup_size(16, 16, 1)
fn convolve(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let N = params.resolution.x;

  if (x >= N || y >= N) { return; }

  // Compute frequency coordinates (centered FFT layout)
  var fx = f32(x) / f32(N);
  var fy = f32(y) / f32(N);
  if (fx > 0.5) { fx -= 1.0; }
  if (fy > 0.5) { fy -= 1.0; }
  let freq = vec2<f32>(fx, fy);

  let idx = y * N + x;
  let fhat = fhatFreq[idx];

  // Multiply by Gaussian kernels
  let actK = gaussianKernelFreq(freq, params.activatorRadius);
  let inhK = gaussianKernelFreq(freq, params.inhibitorRadius);

  activator[idx] = fhat * actK;
  inhibitor[idx] = fhat * inhK;
}
`,be=`
struct UpdateParams {
  resolution: vec2<u32>,
  stepSize: f32,
  toneMapRange: f32,
}

@group(0) @binding(0) var<storage, read> fieldIn: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> activator: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> inhibitor: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> fieldOut: array<vec2<f32>>;
@group(0) @binding(4) var<uniform> params: UpdateParams;

@compute @workgroup_size(16, 16, 1)
fn update(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  let N = params.resolution.x;

  if (x >= N || y >= N) { return; }

  let idx = y * N + x;

  // Get current field value (real part of complex number)
  let f = fieldIn[idx].x;

  // Get activator and inhibitor (real parts after inverse FFT)
  let a = activator[idx].x;
  let b = inhibitor[idx].x;

  // Update step: field += stepSize * (activator - inhibitor)
  let delta = (a - b) * params.stepSize;

  // Tonemapping with atan to keep values bounded (matching 1D simulation)
  let range = params.toneMapRange;
  let newValue = atan(range * (f + delta)) / range;

  // Store as complex number (imaginary = 0)
  fieldOut[idx] = vec2<f32>(newValue, 0.0);
}
`,ce=`
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

  // Compute distance from mouse (in UV space)
  let uv = vec2<f32>(f32(x) / f32(N), f32(y) / f32(N));
  let diff = uv - params.mouse;
  let dist = length(diff);

  if (dist < params.radius) {
    // Smooth falloff
    let falloff = 1.0 - dist / params.radius;
    let current = field[idx].x;
    let paintVal = params.value;
    field[idx] = vec2<f32>(mix(current, paintVal, falloff * 0.5), 0.0);
  }
}
`,ye=`
struct VisParams {
  resolution: vec2<u32>,
  _pad0: u32,
  _pad1: u32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var<storage, read> field: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: VisParams;

// Sample field with wrapping
fn sampleField(x: i32, y: i32, N: u32) -> f32 {
  let Nu = i32(N);
  let wx = u32(((x % Nu) + Nu) % Nu);
  let wy = u32(((y % Nu) + Nu) % Nu);
  return field[wy * N + wx].x;
}

// Fullscreen triangle vertex shader
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

  // Sample 4 neighbors
  let f00 = sampleField(x0, y0, N);
  let f10 = sampleField(x0 + 1, y0, N);
  let f01 = sampleField(x0, y0 + 1, N);
  let f11 = sampleField(x0 + 1, y0 + 1, N);

  // Bilinear interpolation
  let f = mix(mix(f00, f10, fx), mix(f01, f11, fx), fy);

  // Map to grayscale: (f + 1) * 0.5, matching 1D simulation
  let gray = clamp((f + 1.0) * 0.5, 0.0, 1.0);

  return vec4<f32>(gray, gray, gray, 1.0);
}
`;function Pe(e,L={}){const{width:_=512,height:V=512,activatorRadius:A=15,inhibitorRatio:k=2,stepSize:D=.1,toneMapRange:K=.5}=L,t=_;if(_!==V)throw new Error("Width and height must be equal (square grid required for FFT)");if((t&t-1)!==0)throw new Error("Grid size must be a power of 2");let m=A,S=k,q=D,I=K;const l=t*t*2*4,f=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,o=[e.createBuffer({label:"Field 0",size:l,usage:f}),e.createBuffer({label:"Field 1",size:l,usage:f})],y=[e.createBuffer({label:"FFT temp 0",size:l,usage:f}),e.createBuffer({label:"FFT temp 1",size:l,usage:f})],F=e.createBuffer({label:"fhat freq",size:l,usage:f}),b=e.createBuffer({label:"Activator",size:l,usage:f}),c=e.createBuffer({label:"Inhibitor",size:l,usage:f}),P=e.createBuffer({label:"Init params",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),C=e.createBuffer({label:"Convolve params",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),v=e.createBuffer({label:"Update params",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),x=e.createBuffer({label:"Visualize params",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),U=e.createBuffer({label:"Paint params",size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),Y=e.createShaderModule({label:"Initialize",code:de}),W=e.createShaderModule({label:"Convolve",code:ge}),$=e.createShaderModule({label:"Update",code:be}),j=e.createShaderModule({label:"Paint",code:ce}),R=e.createShaderModule({label:"Visualize",code:ye}),N=pe(e,t,"f32"),w=e.createBindGroupLayout({label:"Init layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),E=e.createBindGroupLayout({label:"Convolve layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),z=e.createBindGroupLayout({label:"Update layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),M=e.createBindGroupLayout({label:"Visualize layout",entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),O=e.createBindGroupLayout({label:"Paint layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),H=e.createComputePipeline({label:"Initialize pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[w]}),compute:{module:Y,entryPoint:"initialize"}}),J=e.createComputePipeline({label:"Convolve pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[E]}),compute:{module:W,entryPoint:"convolve"}}),Q=e.createComputePipeline({label:"Update pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[z]}),compute:{module:$,entryPoint:"update"}}),X=e.createComputePipeline({label:"Paint pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[O]}),compute:{module:j,entryPoint:"paint"}}),Z=[e.createBindGroup({label:"Init bind group 0",layout:w,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:P}}]}),e.createBindGroup({label:"Init bind group 1",layout:w,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:P}}]})],ee=e.createBindGroup({label:"Convolve bind group",layout:E,entries:[{binding:0,resource:{buffer:F}},{binding:1,resource:{buffer:b}},{binding:2,resource:{buffer:c}},{binding:3,resource:{buffer:C}}]}),te=[e.createBindGroup({label:"Update bind group 0->1",layout:z,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:b}},{binding:2,resource:{buffer:c}},{binding:3,resource:{buffer:o[1]}},{binding:4,resource:{buffer:v}}]}),e.createBindGroup({label:"Update bind group 1->0",layout:z,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:b}},{binding:2,resource:{buffer:c}},{binding:3,resource:{buffer:o[0]}},{binding:4,resource:{buffer:v}}]})],re=[e.createBindGroup({label:"Paint bind group 0",layout:O,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:U}}]}),e.createBindGroup({label:"Paint bind group 1",layout:O,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:U}}]})];let p=0,h=0,G=null;const s=Math.ceil(t/16);function ie(){const r=Math.floor(Math.random()*4294967295),i=new Uint32Array([t,t,r,0]);e.queue.writeBuffer(P,0,i);const a=e.createCommandEncoder({label:"Initialize"});for(let u=0;u<2;u++){const n=a.beginComputePass({label:`Initialize ${u}`});n.setPipeline(H),n.setBindGroup(0,Z[u]),n.dispatchWorkgroups(s,s,1),n.end()}e.queue.submit([a.finish()]),p=0,h=0}function ae(r,i){m=r,S=i}function ne(r,i){r!==void 0&&(q=r),i!==void 0&&(I=i)}function oe(r){G=r}function ue(){if(!G)return;const r=new ArrayBuffer(32),i=new Uint32Array(r),a=new Float32Array(r);i[0]=t,i[1]=t,a[2]=G[0],a[3]=G[1],a[4]=.08,a[5]=1,e.queue.writeBuffer(U,0,r);const u=e.createCommandEncoder({label:"Paint"}),n=u.beginComputePass({label:"Paint"});n.setPipeline(X),n.setBindGroup(0,re[p]),n.dispatchWorkgroups(s,s,1),n.end(),e.queue.submit([u.finish()])}function se(){ue();const r=new Float32Array(4),i=new Uint32Array(r.buffer);i[0]=t,i[1]=t,r[2]=m,r[3]=m*S,e.queue.writeBuffer(C,0,r);const a=new Float32Array(4),u=new Uint32Array(a.buffer);u[0]=t,u[1]=t,a[2]=q,a[3]=I,e.queue.writeBuffer(v,0,a),T({device:e,pipelines:N,input:o[p],output:F,temp:y,N:t,forward:!0,splitNormalization:!0});const n=e.createCommandEncoder({label:`Step ${h}`}),d=n.beginComputePass({label:"Convolve"});d.setPipeline(J),d.setBindGroup(0,ee),d.dispatchWorkgroups(s,s,1),d.end(),e.queue.submit([n.finish()]),T({device:e,pipelines:N,input:b,output:b,temp:y,N:t,forward:!1,splitNormalization:!0}),T({device:e,pipelines:N,input:c,output:c,temp:y,N:t,forward:!1,splitNormalization:!0});const g=e.createCommandEncoder({label:"Update"}),B=g.beginComputePass({label:"Update"});B.setPipeline(Q),B.setBindGroup(0,te[p]),B.dispatchWorkgroups(s,s,1),B.end(),e.queue.submit([g.finish()]),p=1-p,h++}function le(r){const i=e.createRenderPipeline({label:"Visualize pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[M]}),vertex:{module:R,entryPoint:"vertex"},fragment:{module:R,entryPoint:"fragment",targets:[{format:r}]},primitive:{topology:"triangle-list"}}),a=[e.createBindGroup({label:"Visualize bind group 0",layout:M,entries:[{binding:0,resource:{buffer:o[0]}},{binding:1,resource:{buffer:x}}]}),e.createBindGroup({label:"Visualize bind group 1",layout:M,entries:[{binding:0,resource:{buffer:o[1]}},{binding:1,resource:{buffer:x}}]})],u=new Uint32Array([t,t,0,0]);return e.queue.writeBuffer(x,0,u),{render(n){const d=e.createCommandEncoder({label:"Render"}),g=d.beginRenderPass({colorAttachments:[{view:n,loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:1}}]});g.setPipeline(i),g.setBindGroup(0,a[p]),g.draw(3,1,0,0),g.end(),e.queue.submit([d.finish()])}}}function fe(){o[0].destroy(),o[1].destroy(),y[0].destroy(),y[1].destroy(),F.destroy(),b.destroy(),c.destroy(),P.destroy(),C.destroy(),v.destroy(),x.destroy(),U.destroy()}return{initialize:ie,setKernels:ae,setParams:ne,setMouse:oe,step:se,createRenderer:le,destroy:fe,get iteration(){return h},get width(){return t},get height(){return t},get activatorRadius(){return m},get inhibitorRatio(){return S}}}export{Pe as createTuring2D};
