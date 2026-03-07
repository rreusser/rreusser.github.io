const ge=new WeakMap;function ke(t){let l=ge.get(t);if(l&&l.vertexCount===t.vertexCount&&l.edgeCount===t.edgeCount)return l;const x=t.extractFaces();let P=0;for(const u of x)u.length>=3&&(P+=u.length-2);const y=new Uint32Array(P*3),p=new Float32Array(P*3);let L=0;for(const u of x){if(u.length<3)continue;const G=u.length,M=u[0];for(let b=1;b<G-1;b++){const v=L*3;y[v]=M,y[v+1]=u[b],y[v+2]=u[b+1],p[v]=p[v+1]=p[v+2]=G,L++}}return l={vertexCount:t.vertexCount,edgeCount:t.edgeCount,triangleCount:P,triangleVertexIndices:y,triangleEdgeCounts:p},ge.set(t,l),l}function Q(t,l,x,P,y){if(l&&l.size>=x)return{buf:l};l&&l.destroy();const p=Math.max(x*2,64);return{buf:t.createBuffer({label:y,size:p,usage:P})}}const h=`
struct Uniforms {
  projectionView : mat4x4f,
  eye            : vec3f,
  _pad0          : f32,
  aspect         : f32,
  pixelRatio     : f32,
  lineWidth      : f32,
  borderWidth    : f32,
  pointSize      : f32,
  opacity        : f32,
  viewportH      : f32,
  faceShading    : f32,
};
@group(0) @binding(0) var<uniform> u : Uniforms;
`,K=`
@group(1) @binding(0) var prevDepthTex : texture_depth_2d;

fn peelDiscard(fragPos: vec4f) {
  let prev = textureLoad(prevDepthTex, vec2i(fragPos.xy), 0);
  if (fragPos.z <= prev + 1e-5) { discard; }
}
`,Ye=`
fn faceColor(edges: f32) -> vec3f {
  if (edges < 3.5) { return vec3f(1.0, 0.65, 0.25); }
  if (edges < 4.5) { return vec3f(1.0, 0.70, 0.45); }
  if (edges < 5.5) { return vec3f(0.45, 0.75, 1.0); }
  if (edges < 6.5) { return vec3f(1.0, 0.75, 0.35); }
  if (edges < 7.5) { return vec3f(1.0, 0.50, 0.55); }
  return vec3f(0.75, 0.60, 1.0);
}
`;function qe(t,l,x){const p="rgba8unorm",L="depth32float",u=t.createBindGroupLayout({label:"uniform-bgl",entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),G=t.createBindGroupLayout({label:"prev-depth-bgl",entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"depth"}}]}),M=t.createBindGroupLayout({label:"layer-bgl",entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}}]}),b=t.createPipelineLayout({bindGroupLayouts:[u]}),v=t.createPipelineLayout({bindGroupLayouts:[u,G]}),D=t.createBuffer({label:"uniforms",size:128,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),H=t.createBindGroup({label:"uniform-bg",layout:u,entries:[{binding:0,resource:{buffer:D}}]}),$={depthWriteEnabled:!0,depthCompare:"less",format:L},me=[{arrayStride:28,attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"},{shaderLocation:2,offset:24,format:"float32"}]}],he=t.createShaderModule({label:"face-vs",code:`
    ${h}
    struct VOut {
      @builtin(position) pos      : vec4f,
      @location(0)       edgeCount: f32,
      @location(1)       vNormal  : vec3f,
      @location(2)       vPosition: vec3f,
    };
    @vertex fn main(
      @location(0) position : vec3f,
      @location(1) normal   : vec3f,
      @location(2) edgeCount: f32,
    ) -> VOut {
      var o: VOut;
      o.pos       = u.projectionView * vec4f(position, 1.0);
      o.edgeCount = edgeCount;
      o.vNormal   = normal;
      o.vPosition = position;
      return o;
    }
  `}),J=`
    ${Ye}

    fn toLinear(c: vec3f) -> vec3f { return pow(c, vec3f(2.2)); }
    fn toSRGB(c: vec3f)   -> vec3f { return pow(c, vec3f(1.0 / 2.2)); }

    fn faceFragment(edgeCount: f32, vNormal: vec3f, vPosition: vec3f) -> vec4f {
      let baseColor = faceColor(edgeCount);

      if (u.faceShading < 0.5) {
        // Flat unlit — pre-multiplied alpha
        return vec4f(baseColor * u.opacity, u.opacity);
      }

      // Blinn-Phong + Fresnel rim, mirroring the original REGL renderer
      let linBase = toLinear(baseColor);
      let N = normalize(vNormal);
      let V = normalize(u.eye - vPosition);
      // Key light slightly above and to the right of the camera
      let L = normalize(u.eye + vec3f(5.0, 8.0, 2.0) - vPosition);
      let H = normalize(L + V);

      let NdotL = abs(dot(N, L));
      let NdotV = abs(dot(N, V));
      let NdotH = abs(dot(N, H));

      let ambient  = 0.4;
      let diffuse  = 0.5 * NdotL;
      let specular = 0.6 * pow(NdotH, 64.0);

      let fresnel1 = pow(1.0 - NdotV, 2.0);
      let fresnel2 = pow(1.0 - NdotV, 4.0);
      let fresnel3 = pow(1.0 - NdotV, 8.0);

      let glowColor = mix(linBase, vec3f(1.0), 0.5);
      let rimColor  = vec3f(1.0, 0.95, 0.9);

      var color = linBase * (ambient + diffuse);
      color += glowColor * fresnel1 * 0.35;
      color += rimColor  * fresnel2 * 0.5;
      color += vec3f(1.0) * fresnel3 * 0.4;
      color += vec3f(1.0) * specular;
      color = toSRGB(clamp(color, vec3f(0.0), vec3f(1.0)));

      return vec4f(color * u.opacity, u.opacity);  // pre-multiplied alpha
    }
  `,xe=t.createShaderModule({label:"face-first-fs",code:`
    ${h}
    ${J}
    @fragment fn main(
      @location(0) edgeCount: f32,
      @location(1) vNormal  : vec3f,
      @location(2) vPosition: vec3f,
    ) -> @location(0) vec4f {
      return faceFragment(edgeCount, vNormal, vPosition);
    }
  `}),be=t.createShaderModule({label:"face-peel-fs",code:`
    ${h}
    ${K}
    ${J}
    @fragment fn main(
      @builtin(position) pos      : vec4f,
      @location(0)       edgeCount: f32,
      @location(1)       vNormal  : vec3f,
      @location(2)       vPosition: vec3f,
    ) -> @location(0) vec4f {
      peelDiscard(pos);
      return faceFragment(edgeCount, vNormal, vPosition);
    }
  `});function ee(i,s,r){return t.createRenderPipeline({label:i,layout:s,vertex:{module:he,entryPoint:"main",buffers:me},fragment:{module:r,entryPoint:"main",targets:[{format:p}]},primitive:{topology:"triangle-list",cullMode:"none"},depthStencil:{...$,depthBias:1,depthBiasSlopeScale:1}})}const Pe=ee("face-first",b,xe),ye=ee("face-peel",v,be),Se=t.createShaderModule({label:"edge-vs",code:`
    ${h}
    const QUAD = array<vec2f,6>(
      vec2f(-1,-1), vec2f(1,-1), vec2f(1,1),
      vec2f(-1,-1), vec2f(1,1),  vec2f(-1,1)
    );
    const FEATHER : f32 = 1.5;  // extra px beyond stroke for smooth falloff
    struct VOut {
      @builtin(position) pos    : vec4f,
      @location(0)       vPixDist: f32,  // signed pixel distance from edge centerline
      @location(1)       vSel   : f32,
      @location(2)       vHover : f32,
    };
    @vertex fn main(
      @builtin(vertex_index) vi      : u32,
      @location(0) p0        : vec3f,
      @location(1) p1        : vec3f,
      @location(2) edgeIndex : f32,
      @location(3) selIndex  : f32,
      @location(4) hovIndex  : f32,
    ) -> VOut {
      let corner = QUAD[vi];
      let clip0 = u.projectionView * vec4f(p0, 1.0);
      let clip1 = u.projectionView * vec4f(p1, 1.0);
      let ndc0  = clip0.xy / clip0.w;
      let ndc1  = clip1.xy / clip1.w;
      let alpha = (corner.x + 1.0) * 0.5;
      let clip  = mix(clip0, clip1, alpha);
      let screen0 = ndc0 * vec2f(u.aspect, 1.0);
      let screen1 = ndc1 * vec2f(u.aspect, 1.0);
      let dir    = normalize(screen1 - screen0);
      let nor    = vec2f(-dir.y, dir.x);
      // expand quad by FEATHER pixels beyond the visible stroke
      let halfW  = (u.lineWidth + u.borderWidth + FEATHER) / u.viewportH;
      let ndcNor = nor * vec2f(1.0 / u.aspect, 1.0);
      var out: VOut;
      out.pos      = vec4f(clip.xy + ndcNor * corner.y * halfW * clip.w, clip.zw);
      // interpolate actual pixel distance (positive outward from centerline)
      out.vPixDist = corner.y * (u.lineWidth + u.borderWidth + FEATHER);
      out.vSel     = select(0.0, 1.0, edgeIndex == selIndex);
      out.vHover   = select(0.0, 1.0, edgeIndex == hovIndex);
      return out;
    }
  `}),te=`
    const FEATHER : f32 = 1.5;
    fn edgeFragment(vPixDist: f32, vSel: f32, vHover: f32) -> vec4f {
      let d = abs(vPixDist);
      let strokeR = u.lineWidth + u.borderWidth;

      // Smooth outer falloff over the feather region
      let alpha = 1.0 - smoothstep(strokeR - 0.5, strokeR + FEATHER, d);

      // Smooth core/border transition
      let borderT = smoothstep(u.lineWidth - 0.5, u.lineWidth + 0.5, d);

      let baseColor   = vec3f(0.30, 0.30, 0.30);
      let borderColor = vec3f(1.0,  1.0,  1.0);
      let selColor    = vec3f(1.0,  0.0,  0.0);
      let hovColor    = vec3f(0.0,  0.55, 0.0);
      let isHighlit   = max(vSel, vHover);
      var color = mix(baseColor, borderColor, borderT);
      color = mix(color, mix(hovColor, selColor, vSel), isHighlit);
      return vec4f(color * alpha, alpha);  // pre-multiplied alpha
    }
  `,Ce=t.createShaderModule({label:"edge-first-fs",code:`
    ${h}
    ${te}
    @fragment fn main(
      @location(0) vPixDist: f32, @location(1) vSel: f32, @location(2) vHover: f32,
    ) -> @location(0) vec4f { return edgeFragment(vPixDist, vSel, vHover); }
  `}),Be=t.createShaderModule({label:"edge-peel-fs",code:`
    ${h}
    ${K}
    ${te}
    @fragment fn main(
      @builtin(position) pos: vec4f,
      @location(0) vPixDist: f32, @location(1) vSel: f32, @location(2) vHover: f32,
    ) -> @location(0) vec4f {
      peelDiscard(pos);
      return edgeFragment(vPixDist, vSel, vHover);
    }
  `}),we=[{arrayStride:36,stepMode:"instance",attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"},{shaderLocation:2,offset:24,format:"float32"},{shaderLocation:3,offset:28,format:"float32"},{shaderLocation:4,offset:32,format:"float32"}]}];function oe(i,s,r){return t.createRenderPipeline({label:i,layout:s,vertex:{module:Se,entryPoint:"main",buffers:we},fragment:{module:r,entryPoint:"main",targets:[{format:p}]},primitive:{topology:"triangle-list"},depthStencil:$})}const Ee=oe("edge-first",b,Ce),Ve=oe("edge-peel",v,Be),re=new Float32Array(x.positions.flat()),z=new Uint16Array(x.cells.flat()),Fe=z.length,W=t.createBuffer({label:"ico-positions",size:re.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(W,0,re);const X=t.createBuffer({label:"ico-indices",size:z.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(X,0,z);const Te=t.createShaderModule({label:"vert-vs",code:`
    ${h}
    struct VOut {
      @builtin(position) pos   : vec4f,
      @location(0)       vSel  : f32,
      @location(1)       vHover: f32,
    };
    @vertex fn main(
      @location(0) icoPos   : vec3f,
      @location(1) center   : vec3f,
      @location(2) vertIndex: f32,
      @location(3) selIndex : f32,
      @location(4) hovIndex : f32,
    ) -> VOut {
      let clip0 = u.projectionView * vec4f(center, 1.0);
      let scale = clip0.w * u.pointSize * 2.0 / u.viewportH;
      let world = center + icoPos * scale;
      var out: VOut;
      out.pos    = u.projectionView * vec4f(world, 1.0);
      out.vSel   = select(0.0, 1.0, vertIndex == selIndex);
      out.vHover = select(0.0, 1.0, vertIndex == hovIndex);
      return out;
    }
  `}),ne=`
    fn vertFragment(vSel: f32, vHover: f32) -> vec4f {
      let baseColor = vec3f(0.14, 0.37, 0.69);
      let hovColor  = vec3f(0.0,  0.55, 0.0);
      let selColor  = vec3f(1.0,  0.0,  0.0);
      let color = mix(baseColor, mix(hovColor, selColor, vSel), max(vSel, vHover));
      return vec4f(color, 1.0);  // opaque
    }
  `,Le=t.createShaderModule({label:"vert-first-fs",code:`
    ${h}
    ${ne}
    @fragment fn main(@location(0) vSel: f32, @location(1) vHover: f32) -> @location(0) vec4f {
      return vertFragment(vSel, vHover);
    }
  `}),Ge=t.createShaderModule({label:"vert-peel-fs",code:`
    ${h}
    ${K}
    ${ne}
    @fragment fn main(
      @builtin(position) pos: vec4f,
      @location(0) vSel: f32, @location(1) vHover: f32,
    ) -> @location(0) vec4f {
      peelDiscard(pos);
      return vertFragment(vSel, vHover);
    }
  `}),Re=[{arrayStride:12,stepMode:"vertex",attributes:[{shaderLocation:0,offset:0,format:"float32x3"}]},{arrayStride:24,stepMode:"instance",attributes:[{shaderLocation:1,offset:0,format:"float32x3"},{shaderLocation:2,offset:12,format:"float32"},{shaderLocation:3,offset:16,format:"float32"},{shaderLocation:4,offset:20,format:"float32"}]}];function ie(i,s,r){return t.createRenderPipeline({label:i,layout:s,vertex:{module:Te,entryPoint:"main",buffers:Re},fragment:{module:r,entryPoint:"main",targets:[{format:p}]},primitive:{topology:"triangle-list",cullMode:"back"},depthStencil:$})}const Ue=ie("vert-first",b,Le),Ie=ie("vert-peel",v,Ge),ae=t.createShaderModule({label:"composite",code:`
    @group(0) @binding(0) var layerTex: texture_2d<f32>;
    struct VSOut { @builtin(position) pos: vec4f };
    @vertex fn vs(@builtin(vertex_index) vi: u32) -> VSOut {
      var pos = array<vec2f,3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
      return VSOut(vec4f(pos[vi], 0.0, 1.0));
    }
    @fragment fn fs(@builtin(position) fragPos: vec4f) -> @location(0) vec4f {
      return textureLoad(layerTex, vec2i(fragPos.xy), 0);
    }
  `}),_e=t.createRenderPipeline({label:"composite",layout:t.createPipelineLayout({bindGroupLayouts:[M]}),vertex:{module:ae,entryPoint:"vs",buffers:[]},fragment:{module:ae,entryPoint:"fs",targets:[{format:l,blend:{color:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}}]},primitive:{topology:"triangle-list"}});let B=[],w=[],k=[],Y=[],le=0,ce=0;function Ae(i,s){if(!(le===i&&ce===s)){for(const r of B)r.destroy();for(const r of w)r.destroy();B=[],w=[],k=[],Y=[];for(let r=0;r<2;r++){const g=t.createTexture({label:`peel-depth-${r}`,size:[i,s],format:L,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});B.push(g),k.push(t.createBindGroup({label:`prev-depth-bg-${r}`,layout:G,entries:[{binding:0,resource:g.createView()}]}))}for(let r=0;r<4;r++){const g=t.createTexture({label:`layer-${r}`,size:[i,s],format:p,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});w.push(g),Y.push(t.createBindGroup({label:`layer-bg-${r}`,layout:M,entries:[{binding:0,resource:g.createView()}]}))}le=i,ce=s}}let E=null,V=null,F=null;function Oe(i){const{context:s,projectionView:r,eye:g=[0,0,20],mesh:m,pointSize:Me=3,edgeWidth:q=2,showFaces:se=!0,faceOpacity:De=.3,faceShading:fe=!1,selectedVertexIndex:He=-1,hoverVertexIndex:$e=-1,selectedEdgeIndex:ze=-1,hoverEdgeIndex:We=-1,background:j=[1,1,1]}=i;if(!s||!r||!m)return;const ue=s.canvas,de=ue.width,Z=ue.height,Xe=de/Z;Ae(de,Z);{const e=new Float32Array(32);e.set(r,0),e[16]=g[0],e[17]=g[1],e[18]=g[2],e[20]=Xe,e[21]=window.devicePixelRatio??1,e[22]=q,e[23]=Math.max(q*.5,1.5),e[24]=Me,e[25]=De,e[26]=Z,e[27]=fe?1:0,t.queue.writeBuffer(D,0,e)}const R=m.vertexCount,U=m.edgeCount;let I=0;if(se){const e=ke(m);I=e.triangleCount*3;const f=7,{buf:n}=Q(t,E,I*f*4,GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST,"face-vtx");E=n;const o=new Float32Array(I*f),{triangleVertexIndices:d,triangleEdgeCounts:c,triangleCount:A}=e,S=m.positions,a=fe?m.computeVertexNormals():null;for(let O=0;O<A;O++)for(let N=0;N<3;N++){const T=d[O*3+N],C=(O*3+N)*f;o[C]=S[T*3],o[C+1]=S[T*3+1],o[C+2]=S[T*3+2],o[C+3]=a?a[T*3]:0,o[C+4]=a?a[T*3+1]:0,o[C+5]=a?a[T*3+2]:1,o[C+6]=c[O*3+N]}t.queue.writeBuffer(E,0,o)}{const{buf:f}=Q(t,V,U*9*4,GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST,"edge-inst");V=f;const n=new Float32Array(U*9),o=m.positions,d=m.edges;for(let c=0;c<U;c++){const A=d[c*2],S=d[c*2+1],a=c*9;n[a]=o[A*3],n[a+1]=o[A*3+1],n[a+2]=o[A*3+2],n[a+3]=o[S*3],n[a+4]=o[S*3+1],n[a+5]=o[S*3+2],n[a+6]=c,n[a+7]=ze,n[a+8]=We}t.queue.writeBuffer(V,0,n)}{const{buf:f}=Q(t,F,R*6*4,GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST,"vert-inst");F=f;const n=new Float32Array(R*6),o=m.positions;for(let d=0;d<R;d++){const c=d*6;n[c]=o[d*3],n[c+1]=o[d*3+1],n[c+2]=o[d*3+2],n[c+3]=d,n[c+4]=He,n[c+5]=$e}t.queue.writeBuffer(F,0,n)}const _=t.createCommandEncoder(),pe=s.getCurrentTexture().createView();function ve(e){se&&I>0&&(e.setPipeline(e._facePipeline),e.setBindGroup(0,H),e.setVertexBuffer(0,E),e.draw(I)),q>0&&U>0&&(e.setPipeline(e._edgePipeline),e.setBindGroup(0,H),e.setVertexBuffer(0,V),e.draw(6,U)),R>0&&(e.setPipeline(e._vertPipeline),e.setBindGroup(0,H),e.setVertexBuffer(0,W),e.setVertexBuffer(1,F),e.setIndexBuffer(X,"uint16"),e.drawIndexed(Fe,R))}{const e=_.beginRenderPass({colorAttachments:[{view:w[0].createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:B[0].createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}});e._facePipeline=Pe,e._edgePipeline=Ee,e._vertPipeline=Ue,ve(e),e.end()}for(let e=1;e<4;e++){const f=(e-1)%2,n=e%2,o=_.beginRenderPass({colorAttachments:[{view:w[e].createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:B[n].createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}});o._facePipeline=ye,o._edgePipeline=Ve,o._vertPipeline=Ie,o.setBindGroup(1,k[f]),ve(o),o.end()}_.beginRenderPass({colorAttachments:[{view:pe,loadOp:"clear",storeOp:"store",clearValue:{r:j[0],g:j[1],b:j[2],a:1}}]}).end();for(let e=3;e>=0;e--){const f=_.beginRenderPass({colorAttachments:[{view:pe,loadOp:"load",storeOp:"store"}]});f.setPipeline(_e),f.setBindGroup(0,Y[e]),f.draw(3),f.end()}t.queue.submit([_.finish()])}function Ne(){D.destroy(),W.destroy(),X.destroy(),E&&E.destroy(),V&&V.destroy(),F&&F.destroy();for(const i of B)i.destroy();for(const i of w)i.destroy()}return{render:Oe,destroy:Ne}}export{qe as createMeshRenderer};
