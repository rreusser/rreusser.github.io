const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/camera-buttons-DDlihTrZ.js","assets/expandable-GAgQDSaE.js"])))=>i.map(i=>d[i]);
import{d as c,_ as G}from"./index-ByB2dbry.js";c({root:document.getElementById("cell-1"),expanded:[],variables:[]},{id:1,body:(t,e)=>t`
This notebook implements a three-dimensional version of the Gray-Scott reaction diffusion simulation [as described by Karl Sims](https://www.karlsims.com/rd.html),

${e.block`
\begin{aligned}
\partial_t A &= D_A \nabla^2 A - AB^2 + f (1 - A) \\
\partial_t B &= D_B \nabla^2 B + AB^2 - (k + f)B
\end{aligned}
`}

with initial conditions ${e`A = 1`}, ${e`B = 0`}, and a small region at the center with ${e`B = 1`}.

The computation is performed entirely on the GPU using WebGPU compute shaders. Unlike the [original WebGL implementation](https://observablehq.com/@rreusser/3d-reaction-diffusion), which stored 3D data in 2D textures with complex coordinate conversion math, this version takes advantage of WebGPU's native 3D texture support.

Rendering uses instanced slices ordered back-to-front according to the view angle, using the [painter's algorithm](https://en.wikipedia.org/wiki/Painter%27s_algorithm) for transparency.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});c({root:document.getElementById("cell-2"),expanded:[],variables:[]},{id:2,body:async t=>{const{createWebGPUContext:e}=await G(()=>import("./webgpu-canvas-GARrWAyr.js"),[]).then(i=>{if(!("createWebGPUContext"in i))throw new SyntaxError("export 'createWebGPUContext' not found");return i}),{device:n,canvasFormat:a}=await e(),o={hasError:!1,errorMessage:null};return n.addEventListener("uncapturederror",i=>{o.hasError=!0,o.errorMessage=i.error?.message||String(i.error),console.error("WebGPU error:",o.errorMessage)}),t.then(()=>n.destroy()),{createWebGPUContext:e,device:n,canvasFormat:a,gpuErrorState:o}},inputs:["invalidation"],outputs:["createWebGPUContext","device","canvasFormat","gpuErrorState"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-3"),expanded:[],variables:[]},{id:3,body:(t,e)=>{const n=t.select([64,96,128,160,192,224,256],{value:128,label:"Grid size"}),a=e(n);return{gridSizeInput:n,gridSize:a}},inputs:["Inputs","view"],outputs:["gridSizeInput","gridSize"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-4"),expanded:[],variables:[]},{id:4,body:t=>{const e=[t,t,t],n=e[0]*e[1]*e[2];return{shape:e,n}},inputs:["gridSize"],outputs:["shape","n"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-5"),expanded:[],variables:[]},{id:5,body:(t,e,n,a)=>{const o=t.range([0,.1],{step:1e-4,value:.059,label:e`Kill rate, ${n`k`}`}),i=a(o),s=t.range([0,.1],{step:1e-4,value:.035,label:e`Feed rate, ${n`f`}`}),p=a(s),d=t.range([1,4],{step:.01,value:2,label:e`Diffusion ratio, ${n`D_A / D_B`}`}),u=a(d);return{kInput:o,k:i,fInput:s,f:p,diffusionRatioInput:d,diffusionRatio:u}},inputs:["Inputs","html","tex","view"],outputs:["kInput","k","fInput","f","diffusionRatioInput","diffusionRatio"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-6"),expanded:[],variables:[]},{id:6,body:(t,e,n,a,o)=>{const s=1/t,p=e.range([.01,.5],{step:.01,value:.15,label:n`Time step, ${a`\Delta t`}`}),d=o(p);return{DA:1,DB:s,dtInput:p,dt:d}},inputs:["diffusionRatio","Inputs","html","tex","view"],outputs:["DA","DB","dtInput","dt"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-7"),expanded:[],variables:[]},{id:7,body:(t,e)=>{const n=t.range([.01,1],{step:.01,value:1,label:"Alpha"}),a=e(n),o=t.range([.5,4],{step:.01,value:2,label:"Alpha exponent"}),i=e(o),s=t.range([1,100],{step:1,value:10,label:"Steps per frame"}),p=e(s);return{alphaInput:n,alpha:a,exponentInput:o,exponent:i,stepsPerFrameInput:s,stepsPerFrame:p}},inputs:["Inputs","view"],outputs:["alphaInput","alpha","exponentInput","exponent","stepsPerFrameInput","stepsPerFrame"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-8"),expanded:[],variables:[]},{id:8,body:(t,e)=>{const n=t.toggle({label:"Simulate",value:!0}),a=e(n),o=t.button("Restart"),i=e(o);return{simulateInput:n,simulate:a,restartInput:o,restart:i}},inputs:["Inputs","view"],outputs:["simulateInput","simulate","restartInput","restart"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-9"),expanded:[],variables:[]},{id:9,body:(t,e,n,a,o,i,s,p,d,u,m,f)=>{t(e`<div id="rd-params">
  ${n}
  ${a}
  ${o}
  ${i}
</div>`),t(e`<div id="rd-render">
  ${s}
  ${p}
  ${d}
</div>`),t(e`<div id="rd-controls">
  ${u}
  ${m}
  ${f}
</div>`)},inputs:["display","html","kInput","fInput","diffusionRatioInput","dtInput","alphaInput","exponentInput","stepsPerFrameInput","gridSizeInput","simulateInput","restartInput"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-10"),expanded:[],variables:[]},{id:10,body:async(t,e,n,a,o,i)=>{const[{expandable:s},{createUnifiedCamera:p},{cameraButtons:d}]=await Promise.all([G(()=>import("./expandable-GAgQDSaE.js"),[]).then(b=>{if(!("expandable"in b))throw new SyntaxError("export 'expandable' not found");return b}),G(()=>import("./unified-camera-DmSDZRbL.js"),[]).then(b=>{if(!("createUnifiedCamera"in b))throw new SyntaxError("export 'createUnifiedCamera' not found");return b}),G(()=>import("./camera-buttons-DDlihTrZ.js"),__vite__mapDeps([0,1])).then(b=>{if(!("cameraButtons"in b))throw new SyntaxError("export 'cameraButtons' not found");return b})]),u=Math.min(t,800),m=u,f=Math.min(devicePixelRatio,2),r=document.createElement("canvas");r.id="rd-canvas",r.width=u*f,r.height=m*f,r.style.width=`${u}px`,r.style.height=`${m}px`;const x=r.getContext("webgpu");x.configure({device:e,format:n,alphaMode:"premultiplied"});const l={offscreenTexture:null,depthTexture:null,postBindGroup:null,width:r.width,height:r.height},h={expanded:!1},g=p(r,{mode:"orbit",center:[.5,.5,.5],distance:1.25,phi:0,theta:.4,near:.001,far:10,renderContinuously:!1});function S(b,A,I,C){const v=Math.round(A*f),B=Math.round(I*f);v===l.width&&B===l.height||(r.width=v,r.height=B,r.style.width=`${A}px`,r.style.height=`${I}px`,x.configure({device:e,format:n,alphaMode:"premultiplied"}),l.offscreenTexture&&l.offscreenTexture.destroy(),l.depthTexture&&l.depthTexture.destroy(),l.offscreenTexture=e.createTexture({size:[v,B],format:"rgba16float",usage:a.TEXTURE_BINDING|a.RENDER_ATTACHMENT}),l.depthTexture=e.createTexture({size:[v,B],format:"depth24plus",usage:a.RENDER_ATTACHMENT}),l.width=v,l.height=B,l.dirty=!0)}const P=o`<div id="rd-container" style="width: 100%; height: 100%;">${r}</div>`,w=s(P,{width:u,height:m,onResize:S,controls:["#rd-params","#rd-render","#rd-controls"],state:h,buttons:d({camera:g,canvas:r,filename:"reaction-diffusion-3d.png",getContainer:()=>P})});return i(w),{expandable:s,createUnifiedCamera:p,cameraButtons:d,defaultWidth:u,defaultHeight:m,dpr:f,canvas:r,gpuContext:x,screenResources:l,expandableState:h,camera:g,handleResize:S,canvasContainer:P,container:w}},inputs:["width","device","canvasFormat","GPUTextureUsage","html","display"],outputs:["expandable","createUnifiedCamera","cameraButtons","defaultWidth","defaultHeight","dpr","canvas","gpuContext","screenResources","expandableState","camera","handleResize","canvasContainer","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-11"),expanded:[],variables:[]},{id:11,body:(t,e,n)=>{const a="rgba16float",o={size:t,format:a,dimension:"3d",usage:e.TEXTURE_BINDING|e.STORAGE_BINDING|e.COPY_DST|e.COPY_SRC},i=[n.createTexture({...o,label:"state0"}),n.createTexture({...o,label:"state1"})];return{textureFormat:a,textureDesc:o,textures:i}},inputs:["shape","GPUTextureUsage","device"],outputs:["textureFormat","textureDesc","textures"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-12"),expanded:[],variables:[]},{id:12,body:(t,e,n,a,o)=>{const s=t[0]*t[1]*8,p=t[0]*8,d=e.createBuffer({label:"staging",size:s,usage:n.COPY_DST|n.MAP_READ});function u(f){const r=f>>15&1,x=f>>10&31,l=f&1023;if(x===0){if(l===0)return r?-0:0;let h=-14,g=l/1024;for(;g<1;)g*=2,h--;return(r?-1:1)*g*Math.pow(2,h)}return x===31?l?NaN:r?-1/0:1/0:(r?-1:1)*Math.pow(2,x-15)*(1+l/1024)}async function m(f,r){const x=a[f],l=e.createCommandEncoder();l.copyTextureToBuffer({texture:x,origin:[0,0,r]},{buffer:d,bytesPerRow:p},[t[0],t[1],1]),e.queue.submit([l.finish()]),await d.mapAsync(o.READ);const h=new Uint16Array(d.getMappedRange());let g=1/0,S=-1/0,P=0,w=1/0,b=-1/0,A=0,I=0;const C=t[0]*t[1];for(let v=0;v<C;v++){const B=u(h[v*4]),M=u(h[v*4+1]);g=Math.min(g,B),S=Math.max(S,B),P+=B,w=Math.min(w,M),b=Math.max(b,M),A+=M,M>.001&&I++}return d.unmap(),{z:r,A:{min:g,max:S,avg:P/C},B:{min:w,max:b,avg:A/C,nonZeroCount:I}}}return{bytesPerPixel:8,sliceSize:s,bytesPerRow:p,stagingBuffer:d,float16ToFloat32:u,readSliceStats:m}},inputs:["shape","device","GPUBufferUsage","textures","GPUMapMode"],outputs:["bytesPerPixel","sliceSize","bytesPerRow","stagingBuffer","float16ToFloat32","readSliceStats"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-13"),expanded:[],variables:[]},{id:13,body:t=>({linearSampler:t.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"repeat",addressModeW:"repeat"})}),inputs:["device"],outputs:["linearSampler"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-14"),expanded:[],variables:[]},{id:14,body:(t,e)=>{const n=t.createBuffer({label:"simParams",size:32,usage:e.UNIFORM|e.COPY_DST}),a=t.createBuffer({label:"renderParams",size:192,usage:e.UNIFORM|e.COPY_DST});return{simParamsBuffer:n,renderParamsBuffer:a}},inputs:["device","GPUBufferUsage"],outputs:["simParamsBuffer","renderParamsBuffer"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-15"),expanded:[],variables:[]},{id:15,body:()=>({initShaderCode:`
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
    projection: mat4x4f,
    view: mat4x4f,
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
    output.position = params.projection * params.view * vec4f(pos3d, 1.0);
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
    output.uv = vec2f(pos.x * 0.5 + 0.5, 0.5 - pos.y * 0.5);
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
`}),inputs:[],outputs:["initShaderCode","simShaderCode","renderShaderCode","postShaderCode"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-16"),expanded:[],variables:[]},{id:16,body:(t,e,n,a,o,i)=>{const s=t.createShaderModule({code:e}),p=t.createComputePipeline({label:"init",layout:"auto",compute:{module:s,entryPoint:"main"}}),d=t.createShaderModule({code:n}),u=t.createComputePipeline({label:"simulate",layout:"auto",compute:{module:d,entryPoint:"main"}}),m=t.createShaderModule({code:a}),f=t.createRenderPipeline({label:"render",layout:"auto",vertex:{module:m,entryPoint:"vertexMain"},fragment:{module:m,entryPoint:"fragmentMain",targets:[{format:"rgba16float",blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}}]},primitive:{topology:"triangle-list"},depthStencil:void 0}),r=t.createShaderModule({code:o}),x=t.createRenderPipeline({label:"post",layout:"auto",vertex:{module:r,entryPoint:"vertexMain"},fragment:{module:r,entryPoint:"fragmentMain",targets:[{format:i}]},primitive:{topology:"triangle-list"}});return{initShaderModule:s,initPipeline:p,simShaderModule:d,simPipeline:u,renderShaderModule:m,renderPipeline:f,postShaderModule:r,postPipeline:x}},inputs:["device","initShaderCode","simShaderCode","renderShaderCode","postShaderCode","canvasFormat"],outputs:["initShaderModule","initPipeline","simShaderModule","simPipeline","renderShaderModule","renderPipeline","postShaderModule","postPipeline"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-17"),expanded:[],variables:[]},{id:17,body:(t,e,n,a)=>(t.offscreenTexture=e.createTexture({size:[n.width,n.height],format:"rgba16float",usage:a.TEXTURE_BINDING|a.RENDER_ATTACHMENT}),t.depthTexture=e.createTexture({size:[n.width,n.height],format:"depth24plus",usage:a.RENDER_ATTACHMENT}),{screenResourcesReady:!0}),inputs:["screenResources","device","canvas","GPUTextureUsage"],outputs:["screenResourcesReady"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-18"),expanded:[],variables:[]},{id:18,body:(t,e,n,a,o,i,s,p,d,u,m,f,r)=>{const x=e.createBuffer({size:16,usage:n.UNIFORM|n.COPY_DST});e.queue.writeBuffer(x,0,new Uint32Array([...a,0]));const l=e.createBindGroup({layout:o.getBindGroupLayout(0),entries:[{binding:0,resource:i[0].createView()},{binding:1,resource:{buffer:x}}]}),h=[e.createBindGroup({layout:s.getBindGroupLayout(0),entries:[{binding:0,resource:i[0].createView()},{binding:1,resource:i[1].createView()},{binding:2,resource:{buffer:p}}]}),e.createBindGroup({layout:s.getBindGroupLayout(0),entries:[{binding:0,resource:i[1].createView()},{binding:1,resource:i[0].createView()},{binding:2,resource:{buffer:p}}]})],g=[e.createBindGroup({layout:d.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:u}},{binding:1,resource:i[0].createView()},{binding:2,resource:m}]}),e.createBindGroup({layout:d.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:u}},{binding:1,resource:i[1].createView()},{binding:2,resource:m}]})];return f.postBindGroup=e.createBindGroup({layout:r.getBindGroupLayout(0),entries:[{binding:0,resource:f.offscreenTexture.createView()},{binding:1,resource:m}]}),{initParamsBuffer:x,initBindGroup:l,simBindGroups:h,renderBindGroups:g}},inputs:["screenResourcesReady","device","GPUBufferUsage","shape","initPipeline","textures","simPipeline","simParamsBuffer","renderPipeline","renderParamsBuffer","linearSampler","screenResources","postPipeline"],outputs:["initParamsBuffer","initBindGroup","simBindGroups","renderBindGroups"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-19"),expanded:[],variables:[]},{id:19,body:()=>{function t(e,n){const a=Math.abs(e[0]-n[0]),o=Math.abs(e[1]-n[1]),i=Math.abs(e[2]-n[2]);return a>o&&a>i?{axis:0,sign:Math.sign(e[0]-n[0])}:o>i?{axis:1,sign:Math.sign(e[1]-n[1])}:{axis:2,sign:Math.sign(e[2]-n[2])}}return{getSliceAxis:t}},inputs:[],outputs:["getSliceAxis"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-20"),expanded:[],variables:[]},{id:20,body:()=>({simState:{currentBuffer:0,initialized:!1,dirty:!0}}),inputs:[],outputs:["simState"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-21"),expanded:[],variables:[]},{id:21,body:async(t,e,n,a,o,i)=>{async function s(){const p=e.createCommandEncoder(),d=p.beginComputePass();d.setPipeline(n),d.setBindGroup(0,a);const u=Math.ceil(o[0]/4);d.dispatchWorkgroups(u,u,u),d.end(),e.queue.submit([p.finish()]),await e.queue.onSubmittedWorkDone(),i.currentBuffer=0,i.initialized=!0,i.dirty=!0}return await s(),{initializeSimulation:s}},inputs:["restart","device","initPipeline","initBindGroup","shape","simState"],outputs:["initializeSimulation"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});c({root:document.getElementById("cell-22"),expanded:[],variables:[]},{id:22,body:async(t,e,n,a,o,i,s,p,d,u,m,f,r,x,l,h,g,S,P,w,b,A,I,C,v,B,M,k,j)=>{const{createFrameLoop:$}=await G(()=>import("./frame-loop-QkwpdSbZ.js"),[]).then(y=>{if(!("createFrameLoop"in y))throw new SyntaxError("export 'createFrameLoop' not found");return y});let V=u.width,L=u.height;function q(){const y=new Float32Array([i,s,m,f,d,0,0,0]);r.queue.writeBuffer(x,0,y)}function W(){q();const y=r.createCommandEncoder(),T=y.beginComputePass();T.setPipeline(l),T.setBindGroup(0,h[g.currentBuffer]);const E=Math.ceil(S[0]/4);T.dispatchWorkgroups(E,E,E),T.end(),r.queue.submit([y.finish()]),g.currentBuffer=1-g.currentBuffer}function D(){const y=P.width/P.height,T=w.update(y),E=T.eye,X=T.projection,K=T.view,Z=w.state.center,{axis:U,sign:J}=b(E,Z),H=S[U],N=new ArrayBuffer(192),_=new Float32Array(N),Y=new Uint32Array(N);_.set(X,0),_.set(K,16),_[32]=E[0],_[33]=E[1],_[34]=E[2],_[35]=a,_[36]=o,Y[37]=U,_[38]=J,Y[39]=H,r.queue.writeBuffer(A,0,N),(u.width!==V||u.height!==L)&&(u.postBindGroup=r.createBindGroup({layout:I.getBindGroupLayout(0),entries:[{binding:0,resource:u.offscreenTexture.createView()},{binding:1,resource:C}]}),V=u.width,L=u.height);const O=r.createCommandEncoder(),z=O.beginRenderPass({colorAttachments:[{view:u.offscreenTexture.createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]});z.setPipeline(v),z.setBindGroup(0,B[g.currentBuffer]),z.draw(6,H),z.end();const F=O.beginRenderPass({colorAttachments:[{view:M.getCurrentTexture().createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]});F.setPipeline(I),F.setBindGroup(0,u.postBindGroup),F.draw(3),F.end(),r.queue.submit([O.finish()])}w.on("render",D);let R=null;return e?R=$(()=>{if(k.hasError){console.error("Stopping due to WebGPU error:",k.errorMessage),R.cancel();return}for(let y=0;y<n;y++)W();D()}):D(),j.then(()=>{w.off("render",D),R&&R.cancel()}),{createFrameLoop:$,lastScreenWidth:V,lastScreenHeight:L,updateSimParams:q,step:W,render:D,loop:R}},inputs:["initializeSimulation","simulate","stepsPerFrame","alpha","exponent","k","f","diffusionRatio","dt","screenResources","DA","DB","device","simParamsBuffer","simPipeline","simBindGroups","simState","shape","canvas","camera","getSliceAxis","renderParamsBuffer","postPipeline","linearSampler","renderPipeline","renderBindGroups","gpuContext","gpuErrorState","invalidation"],outputs:["createFrameLoop","lastScreenWidth","lastScreenHeight","updateSimParams","step","render","loop"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
