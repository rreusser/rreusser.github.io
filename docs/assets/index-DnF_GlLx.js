import{d as C,_ as T}from"./index-ByB2dbry.js";C({root:document.getElementById("cell-3"),expanded:[],variables:[]},{id:3,body:async n=>{const{createWebGPUContext:t}=await T(()=>import("./webgpu-canvas-GARrWAyr.js"),[]).then(p=>{if(!("createWebGPUContext"in p))throw new SyntaxError("export 'createWebGPUContext' not found");return p}),{device:a,canvasFormat:i}=await t();return n.then(()=>a.destroy()),{createWebGPUContext:t,device:a,canvasFormat:i}},inputs:["invalidation"],outputs:["createWebGPUContext","device","canvasFormat"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-5"),expanded:[],variables:[]},{id:5,body:async(n,t,a,i,p,b)=>{const[{createElementStack:u},{createZoomableAxes:y},{expandable:s}]=await Promise.all([T(()=>import("./element-stack-BU40TvN2.js"),[]).then(g=>{if(!("createElementStack"in g))throw new SyntaxError("export 'createElementStack' not found");return g}),T(()=>import("./zoomable-axes-BfGyq1bg.js"),[]).then(g=>{if(!("createZoomableAxes"in g))throw new SyntaxError("export 'createZoomableAxes' not found");return g}),T(()=>import("./expandable-GAgQDSaE.js"),[]).then(g=>{if(!("expandable"in g))throw new SyntaxError("export 'expandable' not found");return g})]),d=window.devicePixelRatio||1,c=Math.min(640,n),v=480,l=u({width:c,height:v,layers:[{id:"canvas",element:({current:g,width:o,height:r})=>{const e=g||document.createElement("canvas");return e.id="lines-canvas",e.width=Math.floor(o*d),e.height=Math.floor(r*d),e.style.width=`${o}px`,e.style.height=`${r}px`,e.style.border="1px solid rgba(0,0,0,0.2)",e}},{id:"svg",element:({current:g,width:o,height:r})=>(g?t.select(g):t.create("svg")).attr("width",o).attr("height",r).style("cursor","grab").node()}]}),m=l.elements.canvas,D=m.getContext("webgpu");D.configure({device:a,format:i,alphaMode:"premultiplied"});const I={dirty:!0},B=y({d3:t,element:l.elements.svg,xScale:t.scaleLinear().domain([-1,1]).range([0,c]),yScale:t.scaleLinear().domain([-1,1]).range([v,0]),aspectRatio:1,onChange:()=>{I.dirty=!0,l.dispatchEvent(new CustomEvent("update"))}}),S=p`<figure style="margin: 0;">
  ${l.element}
  <figcaption style="margin-top:5px">Drag handles to edit vertices. Drag background to pan, scroll to zoom.</figcaption>
</figure>`;return b(s(S,{width:c,height:v,controls:".lines-controls",onResize(g,o,r){l.resize(o,r),B.updateScales(t.scaleLinear().domain([-1,1]).range([0,o]),t.scaleLinear().domain([-1,1]).range([r,0])),I.dirty=!0,l.dispatchEvent(new CustomEvent("update"))}})),{createElementStack:u,createZoomableAxes:y,expandable:s,dpr:d,canvasWidth:c,canvasHeight:v,stack:l,canvas:m,gpuContext:D,renderState:I,axes:B,figure:S}},inputs:["width","d3","device","canvasFormat","html","display"],outputs:["createElementStack","createZoomableAxes","expandable","dpr","canvasWidth","canvasHeight","stack","canvas","gpuContext","renderState","axes","figure"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-6"),expanded:[],variables:[]},{id:6,body:(n,t)=>{const a=n.range([1,100],{label:"Line width",value:70,step:.5}),i=t(a),p=n.select(["bevel","miter","round"],{label:"Join type",value:"miter"}),b=t(p),u=n.select(["round","square","butt"],{label:"Cap type",value:"round"}),y=t(u),s=n.select(["wave","zigzag","spiral"],{label:"Pattern",value:"zigzag"}),d=t(s),c=n.range([0,50],{label:"SDF stroke width",value:10,step:.5}),v=t(c),l=n.range([0,1],{label:"Alpha",value:1,step:.01}),m=t(l),D=n.toggle({label:"Line break",value:!1}),I=t(D),B=n.toggle({label:"Stripes",value:!1}),S=t(B),g=n.toggle({label:"Varying width",value:!1}),o=t(g),r=n.toggle({label:"Debug view",value:"Debug view"}),e=t(r),f=n.toggle({label:"Depth test"}),h=t(f),x=n.toggle({label:"Cull back faces"}),w=t(x);return{lineWidthInput:a,lineWidth:i,joinTypeInput:p,joinType:b,capTypeInput:u,capType:y,patternInput:s,pattern:d,sdfStrokeWidthInput:c,sdfStrokeWidth:v,alphaInput:l,alpha:m,lineBreakInput:D,lineBreak:I,stripesInput:B,stripes:S,varyingWidthInput:g,varyingWidth:o,debugViewInput:r,debugView:e,depthTestInput:f,depthTest:h,cullBackFacesInput:x,cullBackFaces:w}},inputs:["Inputs","view"],outputs:["lineWidthInput","lineWidth","joinTypeInput","joinType","capTypeInput","capType","patternInput","pattern","sdfStrokeWidthInput","sdfStrokeWidth","alphaInput","alpha","lineBreakInput","lineBreak","stripesInput","stripes","varyingWidthInput","varyingWidth","debugViewInput","debugView","depthTestInput","depthTest","cullBackFacesInput","cullBackFaces"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-7"),expanded:[],variables:[]},{id:7,body:(n,t,a)=>{const i=n.range([1,10],{label:"Miter limit",value:4,step:.1,disabled:t!=="miter"}),p=a(i);return{miterLimitInput:i,miterLimit:p}},inputs:["Inputs","joinType","view"],outputs:["miterLimitInput","miterLimit"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-8"),expanded:[],variables:[]},{id:8,body:(n,t,a)=>{const i=n.range([2,16],{label:"Round join resolution",value:8,step:1,disabled:t!=="round"}),p=a(i);return{joinResolutionInput:i,joinResolution:p}},inputs:["Inputs","joinType","view"],outputs:["joinResolutionInput","joinResolution"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-9"),expanded:[],variables:[]},{id:9,body:(n,t,a)=>{const i=n.range([2,16],{label:"Round cap resolution",value:8,step:1,disabled:t!=="round"}),p=a(i),b=n.button("Download PNG"),u=a(b);return{capResolutionInput:i,capResolution:p,downloadButtonInput:b,downloadButton:u}},inputs:["Inputs","capType","view"],outputs:["capResolutionInput","capResolution","downloadButtonInput","downloadButton"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-10"),expanded:[],variables:[]},{id:10,body:(n,t,a,i,p,b,u,y,s,d,c,v,l,m,D,I,B,S)=>{n(t`<div class="lines-controls">
  ${a}
  ${i}
  ${p}
  ${b}
  ${u}
  ${y}
  ${s}
  ${d}
  ${c}
  ${v}
  ${l}
  ${m}
  ${D}
  ${I}
  ${B}
  ${S}
</div>`)},inputs:["display","html","lineWidthInput","joinTypeInput","capTypeInput","patternInput","miterLimitInput","joinResolutionInput","capResolutionInput","sdfStrokeWidthInput","alphaInput","lineBreakInput","stripesInput","varyingWidthInput","debugViewInput","depthTestInput","cullBackFacesInput","downloadButtonInput"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-11"),expanded:[],variables:[]},{id:11,body:async(n,t,a,i,p,b)=>{const{createGPULines:u}=await T(()=>import("https://cdn.jsdelivr.net/npm/webgpu-instanced-lines/+esm"),[]).then(o=>{if(!("createGPULines"in o))throw new SyntaxError("export 'createGPULines' not found");return o});function y(o,r){let e;if(o==="zigzag"){e=[];for(let h=0;h<6;h++){const w=-.6+h/5*1.2,k=h%2===0?.2:-.2;e.push({x:w,y:k,z:0,w:1})}}else if(o==="spiral"){e=[];for(let h=0;h<80;h++){const x=h/79,w=x*Math.PI*6,k=.1+x*.6;e.push({x:k*Math.cos(w),y:k*Math.sin(w),z:0,w:1})}}else{e=[];for(let h=0;h<100;h++){const x=h/99,w=-.8+x*1.6,k=.3*Math.sin(x*Math.PI*4)+.2*Math.cos(x*Math.PI*7);e.push({x:w,y:k,z:0,w:1})}}if(r){const f=Math.floor(e.length/2);e.splice(f,0,{x:0,y:0,z:0,w:0})}return e}const s=y(n,t),d=s.length;function c(o){const r=new Float32Array(o.length*4);for(let e=0;e<o.length;e++)r[e*4+0]=o[e].x,r[e*4+1]=o[e].y,r[e*4+2]=o[e].z,r[e*4+3]=o[e].w;return r}function v(o){const r=new Float32Array(o.length);let e=0;for(let f=0;f<o.length;f++){if(o[f].w===0)e=0;else if(f>0&&o[f-1].w!==0){const h=o[f].x-o[f-1].x,x=o[f].y-o[f-1].y;e+=Math.sqrt(h*h+x*x)}r[f]=e}return r}const l=c(s),m=v(s),D=Math.max(...m),I=a.createBuffer({label:"line-positions",size:l.byteLength,usage:i.STORAGE|i.COPY_DST});a.queue.writeBuffer(I,0,l);const B=a.createBuffer({label:"line-distances",size:m.byteLength,usage:i.STORAGE|i.COPY_DST});a.queue.writeBuffer(B,0,m);const S=a.createBuffer({label:"total-distance",size:4,usage:i.UNIFORM|i.COPY_DST});a.queue.writeBuffer(S,0,new Float32Array([D]));function g(){const o=c(s),r=v(s),e=Math.max(...r);a.queue.writeBuffer(I,0,o),a.queue.writeBuffer(B,0,r),a.queue.writeBuffer(S,0,new Float32Array([e])),p.dirty=!0}return b.then(()=>{I.destroy(),B.destroy(),S.destroy()}),{createGPULines:u,generatePattern:y,points:s,numPoints:d,pointsToFloat32Array:c,computeDistances:v,positions:l,distances:m,totalDistance:D,positionBuffer:I,distanceBuffer:B,totalDistanceBuffer:S,updateBuffers:g}},inputs:["pattern","lineBreak","device","GPUBufferUsage","renderState","invalidation"],outputs:["createGPULines","generatePattern","points","numPoints","pointsToFloat32Array","computeDistances","positions","distances","totalDistance","positionBuffer","distanceBuffer","totalDistanceBuffer","updateBuffers"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-12"),expanded:[],variables:[]},{id:12,body:(n,t,a,i,p)=>{const b=n.select(t.elements.svg),u=a.map((d,c)=>({point:d,index:c})).filter(d=>d.point.w!==0),y=b.selectAll("g.vertex-handle").data(u,d=>d.index).join("g").attr("class","vertex-handle").attr("cursor","move").call(n.drag().on("start",function(){n.select(this).select("circle.visible").attr("stroke","#0066cc").attr("stroke-width",2)}).on("drag",function(d,c){c.point.x=i.xScale.invert(d.x),c.point.y=i.yScale.invert(d.y),n.select(this).attr("transform",`translate(${d.x},${d.y})`),p()}).on("end",function(){n.select(this).select("circle.visible").attr("stroke","#333").attr("stroke-width",1.5)}));y.append("circle").attr("class","hit-area").attr("r",20).attr("fill","transparent"),y.append("circle").attr("class","visible").attr("r",5).attr("fill","white").attr("stroke","#333").attr("stroke-width",1.5).attr("pointer-events","none");function s(){y.attr("transform",d=>`translate(${i.xScale(d.point.x)},${i.yScale(d.point.y)})`)}return s(),t.addEventListener("update",s),{svg:b,editablePoints:u,handleGroups:y,updateHandlePositions:s}},inputs:["d3","stack","points","axes","updateBuffers"],outputs:["svg","editablePoints","handleGroups","updateHandlePositions"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-13"),expanded:[],variables:[]},{id:13,body:(n,t,a,i,p,b,u,y,s,d,c,v,l,m,D,I,B)=>{const S=a>0,g=S||i<1||u,o=y?"depth24plus":null,r=`
  @group(1) @binding(0) var<storage, read> positions: array<vec4f>;
  @group(1) @binding(1) var<storage, read> distances: array<f32>;
  @group(1) @binding(2) var<uniform> viewMatrix: mat4x4f;
  @group(1) @binding(3) var<uniform> totalDistance: f32;
  struct DebugUniforms {
    enabled: u32,
    dpr: f32,
  }
  @group(1) @binding(4) var<uniform> debug: DebugUniforms;
  @group(1) @binding(5) var<uniform> lineWidthUniform: f32;

  struct Vertex {
    position: vec4f,
    width: f32,
    dist: f32,      // cumulative distance along line
    lineWidth: f32, // interpolated width for fragment shader
  }

  fn getVertex(index: u32) -> Vertex {
    let p = positions[index];
    let d = distances[index];
    let projected = viewMatrix * vec4f(p.xyz, 1.0);
    // Reference totalDistance to ensure it's included in bind group layout
    let normalizedDist = d / totalDistance;
    let w = ${b?"lineWidthUniform * (0.5 + 1.5 * normalizedDist)":"lineWidthUniform"};
    return Vertex(vec4f(projected.xyz, p.w * projected.w), w, d, w);
  }
`,e=t==="square"?"max(abs(lineCoord.x), abs(lineCoord.y))":"length(lineCoord.xy)",f=`
  struct DebugUniforms {
    enabled: u32,
    dpr: f32,
  }
  @group(1) @binding(4) var<uniform> debug: DebugUniforms;

  fn linearstep(a: f32, b: f32, x: f32) -> f32 {
    return clamp((x - a) / (b - a), 0.0, 1.0);
  }

  // Unit grid lines for wireframe
  fn grid(parameter: vec3f, width: f32, feather: f32) -> f32 {
    let w1 = width - feather * 0.5;
    let d = fwidth(parameter);
    let looped = 0.5 - abs(parameter % 1.0 - 0.5);
    let a3 = smoothstep(d * w1, d * (w1 + feather), looped);
    return min(min(a3.x, a3.y), a3.z);
  }

  fn getColor(lineCoord: vec2f, dist: f32, lineWidth: f32, instanceID: f32, triStripCoord: vec2f) -> vec4f {
    let strokeWidth = ${a.toFixed(1)} * debug.dpr;
    let baseAlpha = ${i.toFixed(2)};

    // Compute SDF values
    let sdf = 0.5 * lineWidth * ${e};
    let aa = select(baseAlpha, linearstep(lineWidth * 0.5, lineWidth * 0.5 - 1.0, sdf) * baseAlpha, strokeWidth > 0.0);
    let strokeMask = select(0.0, linearstep(lineWidth * 0.5 - strokeWidth - 0.5, lineWidth * 0.5 - strokeWidth + 0.5, sdf), strokeWidth > 0.0);

    // Layer 1: Base fill color (debug instance color or normal color)
    var baseColor: vec3f;
    if (debug.enabled == 1u) {
      // instanceID encodes: non-negative = segment index, negative = cap with index (-id - 1)
      let isCap = instanceID < 0.0;
      let segmentIndex = select(instanceID, -instanceID - 1.0, isCap);
      let iSegmentIndex = i32(floor(segmentIndex + 0.5));
      baseColor = select(vec3f(0.8, 0.1, 0.4), vec3f(0.1, 0.7, 1.0), iSegmentIndex % 2 == 0);
    } else {
      baseColor = vec3f(0.1, 0.7, 1.0);
    }

    // Layer 2: Apply stripes on top of base color
    let stripeFreq = 20.0;
    let stripe = step(0.5, fract(dist * stripeFreq));
    let stripeColor = baseColor * 0.4;  // Darker version of base
    var color = ${p?"mix(baseColor, stripeColor, stripe)":"baseColor"};

    // Layer 2.5: Tint caps - green for start cap (x < 0), purple for end cap (x > 0)
    // Only show in debug mode
    if (debug.enabled == 1u) {
      let green = vec3f(0.2, 0.9, 0.3);
      let purple = vec3f(0.8, 0.3, 0.9);
      let isStart = step(lineCoord.x, -0.01);  // 1 if x < -0.01
      let isEnd = step(0.01, lineCoord.x);     // 1 if x > 0.01
      color = mix(color, green, isStart * 0.5);
      color = mix(color, purple, isEnd * 0.5);
    }

    // Layer 3: Apply stroke (50% black in debug mode, dark blue in normal mode)
    color = mix(color, vec3f(0.0), strokeMask * 0.7);

    // Layer 4: Wireframe gridlines (debug only)
    if (debug.enabled == 1u) {
      let wire = grid(vec3f(triStripCoord, triStripCoord.x + triStripCoord.y), 0.5 * debug.dpr, 1.0);
      color = mix(vec3f(1.0), color, wire);
    }

    return vec4f(color, aa);
  }
`,h=g?{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}:void 0,x=d(c,{colorTargets:h?{format:v,blend:h}:{format:v},depthStencil:o?{format:o,depthWriteEnabled:!0,depthCompare:"less"}:void 0,primitive:{cullMode:s?"back":"none"},join:n,maxJoinResolution:16,maxCapResolution:16,cap:t,vertexShaderBody:r,fragmentShaderBody:f}),w=c.createBuffer({label:"view-matrix",size:64,usage:l.UNIFORM|l.COPY_DST}),k=c.createBuffer({label:"debug-uniform",size:8,usage:l.UNIFORM|l.COPY_DST}),E=c.createBuffer({label:"line-width-uniform",size:4,usage:l.UNIFORM|l.COPY_DST}),W=c.createBindGroup({layout:x.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:m}},{binding:1,resource:{buffer:D}},{binding:2,resource:{buffer:w}},{binding:3,resource:{buffer:I}},{binding:4,resource:{buffer:k}},{binding:5,resource:{buffer:E}}]});return B.then(()=>{x.destroy(),w.destroy(),E.destroy(),k.destroy()}),{useSdfMode:S,useBlend:g,depthFormat:o,vertexShaderBody:r,sdfDistFn:e,fragmentShaderBody:f,blend:h,gpuLines:x,viewMatrixBuffer:w,debugBuffer:k,lineWidthBuffer:E,dataBindGroup:W}},inputs:["joinType","capType","sdfStrokeWidth","alpha","stripes","varyingWidth","debugView","depthTest","cullBackFaces","createGPULines","device","canvasFormat","GPUBufferUsage","positionBuffer","distanceBuffer","totalDistanceBuffer","invalidation"],outputs:["useSdfMode","useBlend","depthFormat","vertexShaderBody","sdfDistFn","fragmentShaderBody","blend","gpuLines","viewMatrixBuffer","debugBuffer","lineWidthBuffer","dataBindGroup"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-14"),expanded:[],variables:[]},{id:14,body:async(n,t,a,i,p,b,u,y,s,d,c,v,l,m,D,I,B,S,g,o)=>{const{createFrameLoop:r}=await T(()=>import("./frame-loop-QkwpdSbZ.js"),[]).then(w=>{if(!("createFrameLoop"in w))throw new SyntaxError("export 'createFrameLoop' not found");return w});b.dirty=!0;let e=null,f=0,h=0;const x=r(()=>{if(b.dirty){u.queue.writeBuffer(y,0,s.view);const w=new ArrayBuffer(8);new Uint32Array(w,0,1)[0]=t?1:0,new Float32Array(w,4,1)[0]=d,u.queue.writeBuffer(c,0,w),u.queue.writeBuffer(v,0,new Float32Array([n*d])),l&&(!e||f!==m.width||h!==m.height)&&(e&&e.destroy(),e=u.createTexture({size:[m.width,m.height],format:l,usage:D.RENDER_ATTACHMENT}),f=m.width,h=m.height);const k=u.createCommandEncoder(),E={colorAttachments:[{view:I.getCurrentTexture().createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]};l&&e&&(E.depthStencilAttachment={view:e.createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"});const W=k.beginRenderPass(E);B.draw(W,{vertexCount:S,resolution:[m.width,m.height],miterLimit:a,joinResolution:i,capResolution:p},[g]),W.end(),u.queue.submit([k.finish()]),b.dirty=!1}});return o.then(()=>{x.cancel(),e&&e.destroy()}),{createFrameLoop:r,depthTexture:e,depthTextureWidth:f,depthTextureHeight:h,loop:x}},inputs:["lineWidth","debugView","miterLimit","joinResolution","capResolution","renderState","device","viewMatrixBuffer","axes","dpr","debugBuffer","lineWidthBuffer","depthFormat","canvas","GPUTextureUsage","gpuContext","gpuLines","numPoints","dataBindGroup","invalidation"],outputs:["createFrameLoop","depthTexture","depthTextureWidth","depthTextureHeight","loop"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-15"),expanded:[],variables:[]},{id:15,body:async(n,t,a,i)=>{if(n>0){let p=function(u,y){const s=document.createElement("a");s.target="_blank",s.download=y,s.href=u,document.body.appendChild(s),s.click(),document.body.removeChild(s)};t.dirty=!0,await new Promise(u=>requestAnimationFrame(u)),await a.queue.onSubmittedWorkDone();const b=i.toDataURL("image/png");p(b,"webgpu-lines-demo.png")}},inputs:["downloadButton","renderState","device","canvas"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
