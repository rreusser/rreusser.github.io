import{d as m,_ as G}from"./index-ByB2dbry.js";m({root:document.getElementById("cell-1"),expanded:[],variables:[]},{id:1,body:(n,e)=>n`
This notebook implements a three-dimensional version of the Gray-Scott reaction diffusion simulation [as described by Karl Sims](https://www.karlsims.com/rd.html),

${e.block`
\begin{aligned}
\partial_t A &= D_A \nabla^2 A - AB^2 + f (1 - A) \\
\partial_t B &= D_B \nabla^2 B + AB^2 - (k + f)B
\end{aligned}
`}

with initial conditions ${e`A = 1`}, ${e`B = 0`}, and a small region at the center with ${e`B = 1`}.

The computation is performed entirely on the GPU using WebGPU compute shaders. Unlike the [original WebGL implementation](https://observablehq.com/@rreusser/3d-reaction-diffusion), which stored 3D data in 2D textures with complex coordinate conversion math, this version takes advantage of WebGPU's native 3D texture support.

Rendering uses instanced slices ordered back-to-front according to the view angle, using the [painter's algorithm](https://en.wikipedia.org/wiki/Painter%27s_algorithm) for transparency.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});m({root:document.getElementById("cell-2"),expanded:[],variables:[]},{id:2,body:async n=>{const{createWebGPUContext:e}=await G(()=>import("./webgpu-canvas-C7AS78hn.js"),[]).then(r=>{if(!("createWebGPUContext"in r))throw new SyntaxError("export 'createWebGPUContext' not found");return r}),{device:i,canvasFormat:a}=await e(),o={hasError:!1,errorMessage:null};return i.addEventListener("uncapturederror",r=>{o.hasError=!0,o.errorMessage=r.error?.message||String(r.error),console.error("WebGPU error:",o.errorMessage)}),n.then(()=>i.destroy()),{createWebGPUContext:e,device:i,canvasFormat:a,gpuErrorState:o}},inputs:["invalidation"],outputs:["createWebGPUContext","device","canvasFormat","gpuErrorState"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-3"),expanded:[],variables:[]},{id:3,body:(n,e)=>{const i=n.select([64,96,128,160,192,224,256],{value:128,label:"Grid size"}),a=e(i);return{gridSizeInput:i,gridSize:a}},inputs:["Inputs","view"],outputs:["gridSizeInput","gridSize"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-4"),expanded:[],variables:[]},{id:4,body:n=>{const e=[n,n,n],i=e[0]*e[1]*e[2];return{shape:e,n:i}},inputs:["gridSize"],outputs:["shape","n"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-5"),expanded:[],variables:[]},{id:5,body:(n,e,i,a)=>{const o=n.range([0,.1],{step:1e-4,value:.059,label:e`Kill rate, ${i`k`}`}),r=a(o),l=n.range([0,.1],{step:1e-4,value:.035,label:e`Feed rate, ${i`f`}`}),p=a(l),d=n.range([1,4],{step:.01,value:2,label:e`Diffusion ratio, ${i`D_A / D_B`}`}),t=a(d);return{kInput:o,k:r,fInput:l,f:p,diffusionRatioInput:d,diffusionRatio:t}},inputs:["Inputs","html","tex","view"],outputs:["kInput","k","fInput","f","diffusionRatioInput","diffusionRatio"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-6"),expanded:[],variables:[]},{id:6,body:(n,e,i,a,o)=>{const l=1/n,p=e.range([.01,.5],{step:.01,value:.15,label:i`Time step, ${a`\Delta t`}`}),d=o(p);return{DA:1,DB:l,dtInput:p,dt:d}},inputs:["diffusionRatio","Inputs","html","tex","view"],outputs:["DA","DB","dtInput","dt"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-7"),expanded:[],variables:[]},{id:7,body:(n,e)=>{const i=n.range([.01,1],{step:.01,value:1,label:"Alpha"}),a=e(i),o=n.range([.5,4],{step:.01,value:2,label:"Alpha exponent"}),r=e(o),l=n.range([1,100],{step:1,value:10,label:"Steps per frame"}),p=e(l);return{alphaInput:i,alpha:a,exponentInput:o,exponent:r,stepsPerFrameInput:l,stepsPerFrame:p}},inputs:["Inputs","view"],outputs:["alphaInput","alpha","exponentInput","exponent","stepsPerFrameInput","stepsPerFrame"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-8"),expanded:[],variables:[]},{id:8,body:(n,e)=>{const i=n.toggle({label:"Simulate",value:!0}),a=e(i),o=n.button("Restart"),r=e(o);return{simulateInput:i,simulate:a,restartInput:o,restart:r}},inputs:["Inputs","view"],outputs:["simulateInput","simulate","restartInput","restart"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-9"),expanded:[],variables:[]},{id:9,body:(n,e,i,a,o,r,l,p,d,t,s,u)=>{n(e`<div id="rd-params">
  ${i}
  ${a}
  ${o}
  ${r}
</div>`),n(e`<div id="rd-render">
  ${l}
  ${p}
  ${d}
</div>`),n(e`<div id="rd-controls">
  ${t}
  ${s}
  ${u}
</div>`)},inputs:["display","html","kInput","fInput","diffusionRatioInput","dtInput","alphaInput","exponentInput","stepsPerFrameInput","gridSizeInput","simulateInput","restartInput"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-10"),expanded:[],variables:[]},{id:10,body:async(n,e,i,a,o)=>{const{expandable:r}=await G(()=>import("./expandable-BCrxs32f.js"),[]).then(b=>{if(!("expandable"in b))throw new SyntaxError("export 'expandable' not found");return b}),l=Math.min(n,800),p=l,d=Math.min(devicePixelRatio,2),t=document.createElement("canvas");t.id="rd-canvas",t.width=l*d,t.height=p*d,t.style.width=`${l}px`,t.style.height=`${p}px`;const s=t.getContext("webgpu");s.configure({device:e,format:i,alphaMode:"premultiplied"});const u={offscreenTexture:null,depthTexture:null,postBindGroup:null,width:t.width,height:t.height},c={expanded:!1};function f(b,x,w,P){const v=Math.round(x*d),y=Math.round(w*d);v===u.width&&y===u.height||(t.width=v,t.height=y,t.style.width=`${x}px`,t.style.height=`${w}px`,s.configure({device:e,format:i,alphaMode:"premultiplied"}),u.offscreenTexture&&u.offscreenTexture.destroy(),u.depthTexture&&u.depthTexture.destroy(),u.offscreenTexture=e.createTexture({size:[v,y],format:"rgba16float",usage:a.TEXTURE_BINDING|a.RENDER_ATTACHMENT}),u.depthTexture=e.createTexture({size:[v,y],format:"depth24plus",usage:a.RENDER_ATTACHMENT}),u.width=v,u.height=y,u.dirty=!0)}const g=r(t,{width:l,height:p,onResize:f,controls:["#rd-params","#rd-render","#rd-controls"],state:c});return o(g),{expandable:r,defaultWidth:l,defaultHeight:p,dpr:d,canvas:t,gpuContext:s,screenResources:u,expandableState:c,handleResize:f,container:g}},inputs:["width","device","canvasFormat","GPUTextureUsage","display"],outputs:["expandable","defaultWidth","defaultHeight","dpr","canvas","gpuContext","screenResources","expandableState","handleResize","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-11"),expanded:[],variables:[]},{id:11,body:(n,e,i)=>{const a="rgba16float",o={size:n,format:a,dimension:"3d",usage:e.TEXTURE_BINDING|e.STORAGE_BINDING|e.COPY_DST|e.COPY_SRC},r=[i.createTexture({...o,label:"state0"}),i.createTexture({...o,label:"state1"})];return{textureFormat:a,textureDesc:o,textures:r}},inputs:["shape","GPUTextureUsage","device"],outputs:["textureFormat","textureDesc","textures"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-12"),expanded:[],variables:[]},{id:12,body:(n,e,i,a,o)=>{const l=n[0]*n[1]*8,p=n[0]*8,d=e.createBuffer({label:"staging",size:l,usage:i.COPY_DST|i.MAP_READ});function t(u){const c=u>>15&1,f=u>>10&31,g=u&1023;if(f===0){if(g===0)return c?-0:0;let b=-14,x=g/1024;for(;x<1;)x*=2,b--;return(c?-1:1)*x*Math.pow(2,b)}return f===31?g?NaN:c?-1/0:1/0:(c?-1:1)*Math.pow(2,f-15)*(1+g/1024)}async function s(u,c){const f=a[u],g=e.createCommandEncoder();g.copyTextureToBuffer({texture:f,origin:[0,0,c]},{buffer:d,bytesPerRow:p},[n[0],n[1],1]),e.queue.submit([g.finish()]),await d.mapAsync(o.READ);const b=new Uint16Array(d.getMappedRange());let x=1/0,w=-1/0,P=0,v=1/0,y=-1/0,D=0,T=0;const _=n[0]*n[1];for(let I=0;I<_;I++){const A=t(b[I*4]),E=t(b[I*4+1]);x=Math.min(x,A),w=Math.max(w,A),P+=A,v=Math.min(v,E),y=Math.max(y,E),D+=E,E>.001&&T++}return d.unmap(),{z:c,A:{min:x,max:w,avg:P/_},B:{min:v,max:y,avg:D/_,nonZeroCount:T}}}return{bytesPerPixel:8,sliceSize:l,bytesPerRow:p,stagingBuffer:d,float16ToFloat32:t,readSliceStats:s}},inputs:["shape","device","GPUBufferUsage","textures","GPUMapMode"],outputs:["bytesPerPixel","sliceSize","bytesPerRow","stagingBuffer","float16ToFloat32","readSliceStats"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-13"),expanded:[],variables:[]},{id:13,body:n=>({linearSampler:n.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"repeat",addressModeW:"repeat"})}),inputs:["device"],outputs:["linearSampler"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-14"),expanded:[],variables:[]},{id:14,body:(n,e)=>{const i=n.createBuffer({label:"simParams",size:32,usage:e.UNIFORM|e.COPY_DST}),a=n.createBuffer({label:"renderParams",size:128,usage:e.UNIFORM|e.COPY_DST});return{simParamsBuffer:i,renderParamsBuffer:a}},inputs:["device","GPUBufferUsage"],outputs:["simParamsBuffer","renderParamsBuffer"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-15"),expanded:[],variables:[]},{id:15,body:()=>({initShaderCode:`
  @group(0) @binding(0) var outputTex: texture_storage_3d<rgba16float, write>;

  struct Params {
    shape: vec3u,
    _pad: u32,
  }
  @group(0) @binding(1) var<uniform> params: Params;

  @compute @workgroup_size(4, 4, 4)
  fn main(@builtin(global_invocation_id) id: vec3u) {
    if (any(id >= params.shape)) { return; }

    let pos = vec3f(id) / vec3f(params.shape);
    let center = vec3f(0.5);
    let r = length(pos - center);

    let a = 1.0;
    let freq = 12.0;
    let ball = smoothstep(0.25, 0.2, r);
    let pattern = 0.5 + 4.0 * cos(pos.x * freq - 1.0) * cos(pos.y * freq - 2.0) * cos(pos.z * freq - 3.0);
    let b = max(0.0, min(1.0, pattern)) * ball;

    textureStore(outputTex, id, vec4f(a, b, 0.0, 1.0));
  }
`,simShaderCode:`
  @group(0) @binding(0) var inputTex: texture_3d<f32>;
  @group(0) @binding(1) var outputTex: texture_storage_3d<rgba16float, write>;

  struct SimParams {
    k: f32,
    f: f32,
    DA: f32,
    DB: f32,
    dt: f32,
    _pad0: f32,
    _pad1: f32,
    _pad2: f32,
  }
  @group(0) @binding(2) var<uniform> params: SimParams;

  @compute @workgroup_size(4, 4, 4)
  fn main(@builtin(global_invocation_id) id: vec3u) {
    let dims = textureDimensions(inputTex);
    if (any(id >= dims)) { return; }

    // Load center and neighbors using direct indices
    // Periodic boundary conditions via modulo wrapping
    let c  = textureLoad(inputTex, id, 0).xy;
    let xp = textureLoad(inputTex, vec3u((id.x + 1) % dims.x, id.y, id.z), 0).xy;
    let xm = textureLoad(inputTex, vec3u((id.x + dims.x - 1) % dims.x, id.y, id.z), 0).xy;
    let yp = textureLoad(inputTex, vec3u(id.x, (id.y + 1) % dims.y, id.z), 0).xy;
    let ym = textureLoad(inputTex, vec3u(id.x, (id.y + dims.y - 1) % dims.y, id.z), 0).xy;
    let zp = textureLoad(inputTex, vec3u(id.x, id.y, (id.z + 1) % dims.z), 0).xy;
    let zm = textureLoad(inputTex, vec3u(id.x, id.y, (id.z + dims.z - 1) % dims.z), 0).xy;

    // Discrete Laplacian (7-point stencil, grid spacing = 1)
    let laplacian = xp + xm + yp + ym + zp + zm - 6.0 * c;

    let a = c.x;
    let b = c.y;
    let ab2 = a * b * b;

    // Gray-Scott equations:
    // dA/dt = DA*∇²A - AB² + f(1-A)
    // dB/dt = DB*∇²B + AB² - (k+f)B
    let dadt = params.DA * laplacian.x - ab2 + params.f * (1.0 - a);
    let dbdt = params.DB * laplacian.y + ab2 - (params.k + params.f) * b;

    let newA = clamp(a + dadt * params.dt, 0.0, 1.0);
    let newB = clamp(b + dbdt * params.dt, 0.0, 1.0);

    textureStore(outputTex, id, vec4f(newA, newB, 0.0, 1.0));
  }
`,renderShaderCode:`
  struct RenderParams {
    viewProjection: mat4x4f,
    eye: vec3f,
    alpha: f32,
    exponent: f32,
    sliceAxis: u32,  // 0=x, 1=y, 2=z
    sliceSign: f32,  // -1 or 1
    numSlices: u32,
  }
  @group(0) @binding(0) var<uniform> params: RenderParams;
  @group(0) @binding(1) var stateTex: texture_3d<f32>;
  @group(0) @binding(2) var texSampler: sampler;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec3f,  // 3D texture coordinate
    @location(1) sliceNormal: vec3f,
  }

  @vertex
  fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
  ) -> VertexOutput {
    // Generate a quad for each slice
    // 6 vertices per quad (2 triangles)
    let quadIndex = vertexIndex % 6u;
    let quadUV = array<vec2f, 6>(
      vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
      vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0)
    );

    let uv = quadUV[quadIndex];

    // Slice depth (0 to 1) based on instance, ordered by sliceSign
    var sliceT: f32;
    if (params.sliceSign < 0.0) {
      sliceT = f32(params.numSlices - 1u - instanceIndex) / f32(params.numSlices);
    } else {
      sliceT = f32(instanceIndex) / f32(params.numSlices);
    }

    // Build 3D position based on slice axis
    var pos3d: vec3f;
    var normal: vec3f;
    if (params.sliceAxis == 0u) {
      pos3d = vec3f(sliceT, uv.x, uv.y);
      normal = vec3f(1.0, 0.0, 0.0);
    } else if (params.sliceAxis == 1u) {
      pos3d = vec3f(uv.x, sliceT, uv.y);
      normal = vec3f(0.0, 1.0, 0.0);
    } else {
      pos3d = vec3f(uv.x, uv.y, sliceT);
      normal = vec3f(0.0, 0.0, 1.0);
    }

    var output: VertexOutput;
    output.position = params.viewProjection * vec4f(pos3d, 1.0);
    output.texCoord = pos3d;
    output.sliceNormal = normal;
    return output;
  }

  @fragment
  fn fragmentMain(
    @location(0) texCoord: vec3f,
    @location(1) sliceNormal: vec3f
  ) -> @location(0) vec4f {
    let value = textureSample(stateTex, texSampler, texCoord).xy;
    let alphaBase = pow(value.y, params.exponent) * params.alpha;

    // Angle of incidence correction (divide by cosine so glancing slices contribute more)
    let viewDir = normalize(params.eye - texCoord);
    let vNdotE = abs(dot(sliceNormal, viewDir));

    // Original coloring scheme
    let c = vec3f(-1.9, -1.0, 1.5);
    let c2 = vec3f(1.4, -1.2, -2.4);
    let color = vec3f(0.05) + value.x * (1.0 - c) + value.y * (c - c2);

    return vec4f(color, min(1.0, alphaBase / vNdotE));
  }
`,postShaderCode:`
  @group(0) @binding(0) var inputTex: texture_2d<f32>;
  @group(0) @binding(1) var texSampler: sampler;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    let positions = array<vec2f, 3>(
      vec2f(-1.0, -1.0),
      vec2f(3.0, -1.0),
      vec2f(-1.0, 3.0)
    );
    let pos = positions[vertexIndex];
    var output: VertexOutput;
    output.position = vec4f(pos, 0.0, 1.0);
    output.uv = pos * 0.5 + 0.5;
    return output;
  }

  @fragment
  fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
    let sample = textureSample(inputTex, texSampler, uv);
    let a = sample.a;
    let inverted = clamp(1.0 - sample.rgb, vec3f(0.0), vec3f(1.0));
    let gamma = 1.0 / 2.2;
    let finalColor = pow(inverted, vec3f(gamma));
    return vec4f(finalColor * a, a);
  }
`}),inputs:[],outputs:["initShaderCode","simShaderCode","renderShaderCode","postShaderCode"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-16"),expanded:[],variables:[]},{id:16,body:(n,e,i,a,o,r)=>{const l=n.createShaderModule({code:e}),p=n.createComputePipeline({label:"init",layout:"auto",compute:{module:l,entryPoint:"main"}}),d=n.createShaderModule({code:i}),t=n.createComputePipeline({label:"simulate",layout:"auto",compute:{module:d,entryPoint:"main"}}),s=n.createShaderModule({code:a}),u=n.createRenderPipeline({label:"render",layout:"auto",vertex:{module:s,entryPoint:"vertexMain"},fragment:{module:s,entryPoint:"fragmentMain",targets:[{format:"rgba16float",blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}}]},primitive:{topology:"triangle-list"},depthStencil:void 0}),c=n.createShaderModule({code:o}),f=n.createRenderPipeline({label:"post",layout:"auto",vertex:{module:c,entryPoint:"vertexMain"},fragment:{module:c,entryPoint:"fragmentMain",targets:[{format:r}]},primitive:{topology:"triangle-list"}});return{initShaderModule:l,initPipeline:p,simShaderModule:d,simPipeline:t,renderShaderModule:s,renderPipeline:u,postShaderModule:c,postPipeline:f}},inputs:["device","initShaderCode","simShaderCode","renderShaderCode","postShaderCode","canvasFormat"],outputs:["initShaderModule","initPipeline","simShaderModule","simPipeline","renderShaderModule","renderPipeline","postShaderModule","postPipeline"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-17"),expanded:[],variables:[]},{id:17,body:(n,e,i,a)=>(n.offscreenTexture=e.createTexture({size:[i.width,i.height],format:"rgba16float",usage:a.TEXTURE_BINDING|a.RENDER_ATTACHMENT}),n.depthTexture=e.createTexture({size:[i.width,i.height],format:"depth24plus",usage:a.RENDER_ATTACHMENT}),{screenResourcesReady:!0}),inputs:["screenResources","device","canvas","GPUTextureUsage"],outputs:["screenResourcesReady"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-18"),expanded:[],variables:[]},{id:18,body:(n,e,i,a,o,r,l,p,d,t,s,u,c)=>{const f=e.createBuffer({size:16,usage:i.UNIFORM|i.COPY_DST});e.queue.writeBuffer(f,0,new Uint32Array([...a,0]));const g=e.createBindGroup({layout:o.getBindGroupLayout(0),entries:[{binding:0,resource:r[0].createView()},{binding:1,resource:{buffer:f}}]}),b=[e.createBindGroup({layout:l.getBindGroupLayout(0),entries:[{binding:0,resource:r[0].createView()},{binding:1,resource:r[1].createView()},{binding:2,resource:{buffer:p}}]}),e.createBindGroup({layout:l.getBindGroupLayout(0),entries:[{binding:0,resource:r[1].createView()},{binding:1,resource:r[0].createView()},{binding:2,resource:{buffer:p}}]})],x=[e.createBindGroup({layout:d.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:r[0].createView()},{binding:2,resource:s}]}),e.createBindGroup({layout:d.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:r[1].createView()},{binding:2,resource:s}]})];return u.postBindGroup=e.createBindGroup({layout:c.getBindGroupLayout(0),entries:[{binding:0,resource:u.offscreenTexture.createView()},{binding:1,resource:s}]}),{initParamsBuffer:f,initBindGroup:g,simBindGroups:b,renderBindGroups:x}},inputs:["screenResourcesReady","device","GPUBufferUsage","shape","initPipeline","textures","simPipeline","simParamsBuffer","renderPipeline","renderParamsBuffer","linearSampler","screenResources","postPipeline"],outputs:["initParamsBuffer","initBindGroup","simBindGroups","renderBindGroups"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-19"),expanded:[],variables:[]},{id:19,body:async n=>{const{mat4:e,vec3:i}=await G(()=>import("https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/+esm"),[]).then(t=>{if(!("mat4"in t))throw new SyntaxError("export 'mat4' not found");if(!("vec3"in t))throw new SyntaxError("export 'vec3' not found");return t}),a={phi:.4,theta:0,distance:1.25,center:[.5,.5,.5],dirty:!0};let o=!1,r=[0,0];n.addEventListener("mousedown",t=>{o=!0,r=[t.clientX,t.clientY]}),window.addEventListener("mouseup",()=>{o=!1}),n.addEventListener("mousemove",t=>{if(!o)return;const s=t.clientX-r[0],u=t.clientY-r[1];r=[t.clientX,t.clientY],a.theta-=s*.01,a.phi-=u*.01,a.phi=Math.max(-Math.PI/2+.1,Math.min(Math.PI/2-.1,a.phi)),a.dirty=!0}),n.addEventListener("wheel",t=>{t.preventDefault(),a.distance*=Math.exp(t.deltaY*.001),a.distance=Math.max(.5,Math.min(5,a.distance)),a.dirty=!0});function l(){const t=a.distance,s=a.phi,u=a.theta;return[a.center[0]+t*Math.cos(s)*Math.sin(u),a.center[1]+t*Math.sin(s),a.center[2]+t*Math.cos(s)*Math.cos(u)]}function p(t){const s=l(),u=e.create(),c=e.create(),f=e.create();return e.lookAt(u,s,a.center,[0,1,0]),e.perspective(c,Math.PI/4,t,.001,10),e.multiply(f,c,u),{viewProjection:f,eye:s}}function d(t){const s=a.center,u=Math.abs(t[0]-s[0]),c=Math.abs(t[1]-s[1]),f=Math.abs(t[2]-s[2]);return u>c&&u>f?{axis:0,sign:Math.sign(t[0]-s[0])}:c>f?{axis:1,sign:Math.sign(t[1]-s[1])}:{axis:2,sign:Math.sign(t[2]-s[2])}}return{mat4:e,vec3:i,cameraState:a,isDragging:o,lastMouse:r,getCameraEye:l,getViewProjectionMatrix:p,getSliceAxis:d}},inputs:["canvas"],outputs:["mat4","vec3","cameraState","isDragging","lastMouse","getCameraEye","getViewProjectionMatrix","getSliceAxis"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-20"),expanded:[],variables:[]},{id:20,body:()=>({simState:{currentBuffer:0,initialized:!1,dirty:!0}}),inputs:[],outputs:["simState"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-21"),expanded:[],variables:[]},{id:21,body:async(n,e,i,a,o,r)=>{async function l(){const p=e.createCommandEncoder(),d=p.beginComputePass();d.setPipeline(i),d.setBindGroup(0,a);const t=Math.ceil(o[0]/4);d.dispatchWorkgroups(t,t,t),d.end(),e.queue.submit([p.finish()]),await e.queue.onSubmittedWorkDone(),r.currentBuffer=0,r.initialized=!0,r.dirty=!0}return await l(),{initializeSimulation:l}},inputs:["restart","device","initPipeline","initBindGroup","shape","simState"],outputs:["initializeSimulation"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-22"),expanded:[],variables:[]},{id:22,body:async(n,e,i,a,o,r,l,p,d,t,s,u,c,f,g,b,x,w,P,v,y,D,T,_,I,A,E,k,j)=>{const{createFrameLoop:O}=await G(()=>import("./frame-loop-QkwpdSbZ.js"),[]).then(h=>{if(!("createFrameLoop"in h))throw new SyntaxError("export 'createFrameLoop' not found");return h});let z=t.width,V=t.height;function $(){const h=new Float32Array([r,l,s,u,d,0,0,0]);c.queue.writeBuffer(f,0,h)}function q(){$();const h=c.createCommandEncoder(),M=h.beginComputePass();M.setPipeline(g),M.setBindGroup(0,b[x.currentBuffer]);const B=Math.ceil(w[0]/4);M.dispatchWorkgroups(B,B,B),M.end(),c.queue.submit([h.finish()]),x.currentBuffer=1-x.currentBuffer}function W(){const h=P.width/P.height,{viewProjection:M,eye:B}=v(h),{axis:U,sign:X}=y(B),Y=w[U],F=new ArrayBuffer(128),S=new Float32Array(F),H=new Uint32Array(F);S.set(M,0),S[16]=B[0],S[17]=B[1],S[18]=B[2],S[19]=a,S[20]=o,H[21]=U,S[22]=X,H[23]=Y,c.queue.writeBuffer(D,0,F),(t.width!==z||t.height!==V)&&(t.postBindGroup=c.createBindGroup({layout:T.getBindGroupLayout(0),entries:[{binding:0,resource:t.offscreenTexture.createView()},{binding:1,resource:_}]}),z=t.width,V=t.height);const N=c.createCommandEncoder(),C=N.beginRenderPass({colorAttachments:[{view:t.offscreenTexture.createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]});C.setPipeline(I),C.setBindGroup(0,A[x.currentBuffer]),C.draw(6,Y),C.end();const R=N.beginRenderPass({colorAttachments:[{view:E.getCurrentTexture().createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]});R.setPipeline(T),R.setBindGroup(0,t.postBindGroup),R.draw(3),R.end(),c.queue.submit([N.finish()])}const L=O(()=>{if(k.hasError){console.error("Stopping due to WebGPU error:",k.errorMessage),L.cancel();return}if(t.dirty&&(t.dirty=!1),e)for(let h=0;h<i;h++)q();W()});return j.then(()=>L.cancel()),{createFrameLoop:O,lastScreenWidth:z,lastScreenHeight:V,updateSimParams:$,step:q,render:W,loop:L}},inputs:["initializeSimulation","simulate","stepsPerFrame","alpha","exponent","k","f","diffusionRatio","dt","screenResources","DA","DB","device","simParamsBuffer","simPipeline","simBindGroups","simState","shape","canvas","getViewProjectionMatrix","getSliceAxis","renderParamsBuffer","postPipeline","linearSampler","renderPipeline","renderBindGroups","gpuContext","gpuErrorState","invalidation"],outputs:["createFrameLoop","lastScreenWidth","lastScreenHeight","updateSimParams","step","render","loop"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
