import{d as p,_ as E}from"./index-ByB2dbry.js";p({root:document.getElementById("cell-2"),expanded:[],variables:[]},{id:2,body:async t=>{const{createWebGPUContext:e}=await E(()=>import("./webgpu-canvas-C7AS78hn.js"),[]).then(n=>{if(!("createWebGPUContext"in n))throw new SyntaxError("export 'createWebGPUContext' not found");return n}),{device:r,canvasFormat:i}=await e();return t.then(()=>r.destroy()),{createWebGPUContext:e,device:r,canvasFormat:i}},inputs:["invalidation"],outputs:["createWebGPUContext","device","canvasFormat"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});p({root:document.getElementById("cell-3"),expanded:[],variables:[]},{id:3,body:async(t,e,r,i,n,a,o)=>{const[{createElementStack:u},{expandable:l}]=await Promise.all([E(()=>import("./element-stack-BU40TvN2.js"),[]).then(h=>{if(!("createElementStack"in h))throw new SyntaxError("export 'createElementStack' not found");return h}),E(()=>import("./expandable-BCrxs32f.js"),[]).then(h=>{if(!("expandable"in h))throw new SyntaxError("export 'expandable' not found");return h})]),m=window.devicePixelRatio||1,c=Math.min(800,t),f=Math.max(400,c*.6),g=u({width:c,height:f,layers:[{id:"canvas",element:({current:h,width:y,height:C})=>{const w=h||document.createElement("canvas");return w.id="attractor-canvas",w.width=Math.floor(y*m),w.height=Math.floor(C*m),w.style.width=`${y}px`,w.style.height=`${C}px`,w}},{id:"svg",element:({current:h,width:y,height:C})=>(h?e.select(h):e.create("svg")).attr("width",y).attr("height",C).style("cursor","grab").node()}]}),s=g.elements.canvas,v=s.getContext("webgpu");v.configure({device:r,format:i,alphaMode:"premultiplied"});const b=4,x=r.createTexture({label:"msaa-color-texture",size:[s.width,s.height],format:i,sampleCount:b,usage:n.RENDER_ATTACHMENT}),B=r.createTexture({label:"depth-texture",size:[s.width,s.height],format:"depth24plus",sampleCount:b,usage:n.RENDER_ATTACHMENT}),d={dirty:!0,depthTexture:B,msaaColorTexture:x,sampleCount:b},P=a`<figure style="margin: 0;" id="main-figure">
  ${g.element}
</figure>`;return o(l(P,{width:c,height:f,controls:".attractor-controls",onResize(h,y,C){g.resize(y,C),s.width=Math.floor(y*m),s.height=Math.floor(C*m),d.msaaColorTexture.destroy(),d.msaaColorTexture=r.createTexture({label:"msaa-color-texture",size:[s.width,s.height],format:i,sampleCount:d.sampleCount,usage:n.RENDER_ATTACHMENT}),d.depthTexture.destroy(),d.depthTexture=r.createTexture({label:"depth-texture",size:[s.width,s.height],format:"depth24plus",sampleCount:d.sampleCount,usage:n.RENDER_ATTACHMENT}),d.dirty=!0,g.dispatchEvent(new CustomEvent("update"))}})),{createElementStack:u,expandable:l,dpr:m,canvasWidth:c,canvasHeight:f,stack:g,canvas:s,gpuContext:v,sampleCount:b,msaaColorTexture:x,depthTexture:B,renderState:d,figure:P}},inputs:["width","d3","device","canvasFormat","GPUTextureUsage","html","display"],outputs:["createElementStack","expandable","dpr","canvasWidth","canvasHeight","stack","canvas","gpuContext","sampleCount","msaaColorTexture","depthTexture","renderState","figure"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});p({root:document.getElementById("cell-4"),expanded:[],variables:[]},{id:4,body:(t,e,r,i)=>{const n=t`<div class="attractor-controls"></div>`;function a(d){return n.appendChild(d),e.input(d)}const o=r.button("Restart"),u=a(o),l=r.toggle({label:"Simulate",value:!0}),m=a(l),c=r.range([1,4096],{value:200,label:"Particle count",step:1}),f=a(c),g=r.range([1,1024],{label:"Track length",value:50,transform:Math.log,step:1}),s=a(g),v=r.range([.001,.1],{value:.02,label:"Time step"}),b=a(v),x=r.range([1,20],{value:6,label:"Line width",step:.5}),B=a(x);return i(n),{controlsContainer:n,ctrl:a,restartInput:o,restart:u,simulateInput:l,simulate:m,particleCountInput:c,particleCount:f,stepCountInput:g,stepCount:s,dtInput:v,dt:b,lineWidthInput:x,lineWidth:B}},inputs:["html","Generators","Inputs","display"],outputs:["controlsContainer","ctrl","restartInput","restart","simulateInput","simulate","particleCountInput","particleCount","stepCountInput","stepCount","dtInput","dt","lineWidthInput","lineWidth"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});p({root:document.getElementById("cell-5"),expanded:[],variables:[]},{id:5,body:(t,e)=>t`### The Attractor

A strange attractor is a set of states toward which a dynamical system evolves over time. The [Lorenz System](https://en.wikipedia.org/wiki/Lorenz_system) is the canonical example. The particular attractor we're simulating here is the *Bouali Attractor*, described by Safieddine Bouali in [A 3D Strange Attractor with a Distinctive Silhouette. The Butterfly Effect Revisited](https://arxiv.org/abs/1311.6128). It is defined by the system of ordinary differential equations:

${e.block`\begin{aligned}
\frac{dx}{dt} &= \alpha x(1 - y) - \beta z \\[0.5em]
\frac{dy}{dt} &= -\gamma y(1 - x^2) \\[0.5em]
\frac{dz}{dt} &= \mu x
\end{aligned}`}

with parameters ${e`\alpha = 3`}, ${e`\beta = 2.2`}, ${e`\gamma = 1`}, ${e`\mu = 1.51`}. These equations exhibit chaotic behavior; nearby trajectories diverge exponentially but remain bounded within the attractor's basin.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});p({root:document.getElementById("cell-8"),expanded:[],variables:[]},{id:8,body:(t,e)=>t`## State Layout

The state of our ordinary differential equation (ODE) is represented by the three-component vector ${e`(x, y, z)`}. We store these in a flat storage buffer as \`vec3f\` elements. The ${e`j^{th}`} time step of the ${e`i^{th}`} particle is represented by the vector:

${e.block`\mathbf{p}_j^{(i)} = (x_j^{(i)}, y_j^{(i)}, z_j^{(i)})`}

We use **particle-major ordering**: all time steps for particle 0 come first, then all time steps for particle 1, and so on. The buffer index for a given particle and step is \`particle * stepCount + step\`.

As we step the ODE, we compute one new history point for each particle track. To avoid shifting the entire history on every iteration, we treat each particle's slice as a **ring buffer**. At each time step ${e`j`}, we use the previous position, ${e`p_{j-1}^{(i)}`}, to compute the next, ${e`p_j^{(i)}`}. When we reach the end of the slice, we loop back to the start, overwriting the oldest time step with the newest.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});p({root:document.getElementById("cell-9"),expanded:[],variables:[]},{id:9,body:(t,e,r,i,n,a)=>{const o=i.createBuffer({label:"state-buffer",size:t*e*16,usage:n.STORAGE|n.COPY_DST}),u={currentStep:0,t:0};return a.then(()=>{o.destroy()}),{stateBuffer:o,simState:u}},inputs:["particleCount","stepCount","restart","device","GPUBufferUsage","invalidation"],outputs:["stateBuffer","simState"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});p({root:document.getElementById("cell-11"),expanded:[],variables:[]},{id:11,body:(t,e,r,i,n,a,o,u)=>{const l=`
@group(0) @binding(0) var<storage, read_write> state: array<vec4f>;

struct Uniforms {
  origin: vec3f,
  scale: f32,
  stepCount: u32,
  particleCount: u32,
}
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

// Quasirandom sequence: http://extremelearning.com.au/unreasonable-effectiveness-of-quasirandom-sequences/
fn quasirandom(n: f32) -> vec3f {
  let g = 1.22074408460575947536;
  return fract(0.5 + n * vec3f(1.0 / g, 1.0 / (g * g), 1.0 / (g * g * g))).zyx;
}

fn sphericalRandom(n: f32) -> vec3f {
  let rand = quasirandom(n);
  let u = rand.x * 2.0 - 1.0;
  let theta = 6.283185307179586 * rand.y;
  let r = sqrt(1.0 - u * u);
  return vec3f(r * cos(theta), r * sin(theta), u) * sqrt(rand.z);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let particle = gid.x;
  if (particle >= uniforms.particleCount) { return; }

  // Initialize all steps for this particle with the same position
  let pos = uniforms.origin + uniforms.scale * sphericalRandom(f32(particle) + 0.5);
  for (var step = 0u; step < uniforms.stepCount; step++) {
// Buffer index: particle * stepCount + step
let idx = particle * uniforms.stepCount + step;
state[idx] = vec4f(pos, 1.0);
  }
}
`,m=t.createShaderModule({label:"init-shader",code:l}),c=t.createComputePipeline({label:"init-pipeline",layout:"auto",compute:{module:m,entryPoint:"main"}}),f=t.createBuffer({label:"init-uniforms",size:32,usage:e.UNIFORM|e.COPY_DST}),g=t.createBindGroup({label:"init-bind-group",layout:c.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:r}},{binding:1,resource:{buffer:f}}]});function s(){const v=new ArrayBuffer(32),b=new Float32Array(v),x=new Uint32Array(v);b[0]=0,b[1]=1,b[2]=0,b[3]=1,x[4]=i,x[5]=n,t.queue.writeBuffer(f,0,v);const B=t.createCommandEncoder(),d=B.beginComputePass();d.setPipeline(c),d.setBindGroup(0,g),d.dispatchWorkgroups(Math.ceil(n/64)),d.end(),t.queue.submit([B.finish()]),a.currentStep=0,a.t=0,o.dirty=!0}return s(),u.then(()=>{f.destroy()}),{initShaderCode:l,initShaderModule:m,initPipeline:c,initUniformBuffer:f,initBindGroup:g,initializeState:s}},inputs:["device","GPUBufferUsage","stateBuffer","stepCount","particleCount","simState","renderState","invalidation"],outputs:["initShaderCode","initShaderModule","initPipeline","initUniformBuffer","initBindGroup","initializeState"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});p({root:document.getElementById("cell-13"),expanded:[],variables:[]},{id:13,body:()=>({attractorWGSL:`
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
`}),inputs:[],outputs:["attractorWGSL"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});p({root:document.getElementById("cell-14"),expanded:[],variables:[]},{id:14,body:(t,e,r,i,n)=>{const a=`
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

${t}

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
`,o=e.createShaderModule({label:"integrate-shader",code:a}),u=e.createComputePipeline({label:"integrate-pipeline",layout:"auto",compute:{module:o,entryPoint:"main"}}),l=e.createBuffer({label:"integrate-uniforms",size:32,usage:r.UNIFORM|r.COPY_DST}),m=e.createBindGroup({label:"integrate-bind-group",layout:u.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:i}},{binding:1,resource:{buffer:l}}]});return n.then(()=>{l.destroy()}),{integrateShaderCode:a,integrateShaderModule:o,integratePipeline:u,integrateUniformBuffer:l,integrateBindGroup:m}},inputs:["attractorWGSL","device","GPUBufferUsage","stateBuffer","invalidation"],outputs:["integrateShaderCode","integrateShaderModule","integratePipeline","integrateUniformBuffer","integrateBindGroup"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});p({root:document.getElementById("cell-17"),expanded:[],variables:[]},{id:17,body:async(t,e,r,i,n,a)=>{const{createGPULines:o}=await E(()=>import("https://cdn.jsdelivr.net/npm/webgpu-instanced-lines/+esm"),[]).then(l=>{if(!("createGPULines"in l))throw new SyntaxError("export 'createGPULines' not found");return l}),u=o(t,{colorTargets:[{format:e,blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}}],depthStencil:{format:"depth24plus",depthWriteEnabled:!0,depthCompare:"less"},multisample:{count:r.sampleCount,alphaToCoverageEnabled:!1},join:"bevel",cap:"square",vertexShaderBody:i,fragmentShaderBody:n});return a.then(()=>u.destroy()),{createGPULines:o,gpuLines:u}},inputs:["device","canvasFormat","renderState","vertexShaderBody","fragmentShaderBody","invalidation"],outputs:["createGPULines","gpuLines"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});p({root:document.getElementById("cell-18"),expanded:[],variables:[]},{id:18,body:async(t,e)=>{const{createCameraController:r}=await E(()=>import("./camera-controller-DnDb9jMf.js"),[]).then(n=>{if(!("createCameraController"in n))throw new SyntaxError("export 'createCameraController' not found");return n}),i=r(t.elements.svg,{phi:.8,theta:.3,distance:7,center:[0,2,0],fov:Math.PI/4,near:.01,far:100});return e.then(()=>i.destroy()),{createCameraController:r,camera:i}},inputs:["stack","invalidation"],outputs:["createCameraController","camera"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});p({root:document.getElementById("cell-19"),expanded:[],variables:[]},{id:19,body:()=>({vertexShaderBody:`// vertexShaderBody:

@group(1) @binding(0) var<storage, read> state: array<vec4f>;
@group(1) @binding(1) var<uniform> projViewMatrix: mat4x4f;

struct LineUniforms {
  stepOffset: u32,  // Ring buffer offset
  stepCount: u32,
  particleCount: u32,
  width: f32,
}
@group(1) @binding(2) var<uniform> lineUniforms: LineUniforms;

struct Vertex {
  position: vec4f,
  width: f32,
  t: f32,
  velocity: f32,
  lineWidth: f32,
}

// Bouali attractor derivative for velocity computation
fn attractorDerivative(pos: vec3f) -> vec3f {
  let alpha = 3.0;
  let beta = 2.2;
  let gamma = 1.0;
  let mu = 1.51;
  return vec3f(
alpha * pos.x * (1.0 - pos.y) - beta * pos.z,
-gamma * pos.y * (1.0 - pos.x * pos.x),
mu * pos.x
  );
}

fn getVertex(index: u32) -> Vertex {
  // Decode buffer index from vertex index
  let pointsPerParticle = lineUniforms.stepCount + 1u; // +1 for line break
  let particle = index / pointsPerParticle;
  let step = index % pointsPerParticle;

  // Check if this is a line break point
  if (step >= lineUniforms.stepCount) {
return Vertex(vec4f(0), 0.0, 0.0, 0.0, 0.0);
  }

  // Compute buffer index with ring buffer offset (modular arithmetic for wrap-around)
  let bufferStep = (step + lineUniforms.stepOffset) % lineUniforms.stepCount;
  let bufferIdx = particle * lineUniforms.stepCount + bufferStep;

  // Load position from state buffer
  let pos = state[bufferIdx].xyz;

  // Compute velocity from attractor derivative
  let speed = length(attractorDerivative(pos));
  let normalizedVelocity = clamp(speed / 10.0, 0.0, 1.0);

  // Progress along the track (0 = oldest, 1 = newest)
  let t = f32(step) / f32(lineUniforms.stepCount - 1u);

  // Project to clip space
  let projected = projViewMatrix * vec4f(pos, 1.0);

  // Line width tapers from thin (old) to thick (new)
  let lineWidth = lineUniforms.width * (0.3 + 0.7 * t);

  return Vertex(projected, lineWidth, t, normalizedVelocity, lineWidth);
}
`,fragmentShaderBody:`
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
`}),inputs:[],outputs:["vertexShaderBody","fragmentShaderBody"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});p({root:document.getElementById("cell-20"),expanded:[],variables:[]},{id:20,body:(t,e,r,i,n)=>{const a=t.createBuffer({label:"proj-view-matrix",size:64,usage:e.UNIFORM|e.COPY_DST}),o=t.createBuffer({label:"line-uniforms",size:16,usage:e.UNIFORM|e.COPY_DST}),u=t.createBindGroup({layout:r.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:i}},{binding:1,resource:{buffer:a}},{binding:2,resource:{buffer:o}}]});return n.then(()=>{a.destroy(),o.destroy()}),{projViewBuffer:a,lineUniformBuffer:o,lineBindGroup:u}},inputs:["device","GPUBufferUsage","gpuLines","stateBuffer","invalidation"],outputs:["projViewBuffer","lineUniformBuffer","lineBindGroup"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});p({root:document.getElementById("cell-21"),expanded:[],variables:[]},{id:21,body:(t,e,r)=>{t(e`<pre><code class="language-wgsl">${r}</code></pre>`)},inputs:["display","html","vertexShaderBody"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});p({root:document.getElementById("cell-23"),expanded:[],variables:[]},{id:23,body:async(t,e,r,i,n,a,o,u,l,m,c,f,g,s,v,b,x,B,d,P)=>{const{createFrameLoop:h}=await E(()=>import("./frame-loop-QkwpdSbZ.js"),[]).then(S=>{if(!("createFrameLoop"in S))throw new SyntaxError("export 'createFrameLoop' not found");return S}),y=new ArrayBuffer(32),C=new Float32Array(y),w=new Uint32Array(y),I=new ArrayBuffer(16),k=new Uint32Array(I),z=new Float32Array(I),A=h(()=>{const S=i.createCommandEncoder();let U=!1;if(e){const L=n.currentStep,T=(n.currentStep+1)%a;C[0]=r,C[1]=n.t,w[2]=L,w[3]=T,w[4]=a,w[5]=o,i.queue.writeBuffer(u,0,y);const _=S.beginComputePass();_.setPipeline(l),_.setBindGroup(0,m),_.dispatchWorkgroups(Math.ceil(o/64)),_.end(),n.t+=r,n.currentStep=T,c.dirty=!0,U=!0}const R=f.width/f.height,{projectionView:W,dirty:D}=g.update(R);if(c.dirty||D){i.queue.writeBuffer(s,0,W),k[0]=(n.currentStep+1)%a,k[1]=a,k[2]=o,z[3]=t*v,i.queue.writeBuffer(b,0,I);const T={vertexCount:o*(a+1),width:t*v,resolution:[f.width,f.height]};x.updateUniforms(T);const _=S.beginRenderPass({colorAttachments:[{view:c.msaaColorTexture.createView(),resolveTarget:B.getCurrentTexture().createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}],depthStencilAttachment:{view:c.depthTexture.createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}});x.draw(_,{...T,skipUniformUpdate:!0},[d]),_.end(),U=!0,e||(c.dirty=!1)}U&&i.queue.submit([S.finish()])});return P.then(()=>A.cancel()),{createFrameLoop:h,_integrateData:y,_integrateF32:C,_integrateU32:w,_lineData:I,_lineU32:k,_lineF32:z,loop:A}},inputs:["lineWidth","simulate","dt","device","simState","stepCount","particleCount","integrateUniformBuffer","integratePipeline","integrateBindGroup","renderState","canvas","camera","projViewBuffer","dpr","lineUniformBuffer","gpuLines","gpuContext","lineBindGroup","invalidation"],outputs:["createFrameLoop","_integrateData","_integrateF32","_integrateU32","_lineData","_lineU32","_lineF32","loop"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});p({root:document.getElementById("cell-24"),expanded:[],variables:[]},{id:24,body:(t,e)=>{e()},inputs:["restart","initializeState"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
