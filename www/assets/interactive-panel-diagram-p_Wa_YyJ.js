const Wt=`
  struct Uniforms {
    bounds: vec4f,      // xmin, xmax, ymin, ymax
    resolution: vec2f,
    panelCount: f32,
    gamma: f32,
    vInf: f32,
    _pad: vec3f,
  }
  struct Panel {
    p1: vec2f,
    p2: vec2f,
    sigma: f32,
    _pad: f32,
  }
  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> panelData: array<Panel>;

  const pi: f32 = 3.14159265359;

  struct StreamResult {
    psi: f32,
    branchCutMask: f32,
  }

  fn computeStreamFunction(pos: vec2f) -> StreamResult {
    // Freestream contribution: psi = V_inf * y
    var psi: f32 = uniforms.vInf * pos.y;
    var branchCutMask: f32 = 0.0;
    let panelCount = u32(uniforms.panelCount);
    for (var i = 0u; i < panelCount; i++) {
      let p = panelData[i];
      let r1 = pos - p.p1;
      let r2 = pos - p.p2;
      let r1sq = dot(r1, r1);
      let r2sq = dot(r2, r2);
      if (r1sq < 0.0001 || r2sq < 0.0001) { continue; }

      let panelVec = p.p2 - p.p1;
      let panelLen = length(panelVec);
      let t = panelVec / panelLen;
      let n = vec2f(-t.y, t.x);

      let s1 = dot(r1, t);
      let s2 = dot(r2, t);
      let h = dot(r1, n);

      let r1_mag = sqrt(r1sq);
      let r2_mag = sqrt(r2sq);

      let theta1 = atan2(h, s1);
      let theta2 = atan2(h, s2);

      // Source stream function
      psi += (p.sigma / (2.0 * pi)) * (s1 * theta1 - s2 * theta2 + h * log(r1_mag / r2_mag));

      // Vortex stream function
      psi += (uniforms.gamma / (2.0 * pi)) * (h * (theta2 - theta1) + s1 * log(r1_mag) - s2 * log(r2_mag));

      // Branch cut detection
      let cutWidth = 0.01 * panelLen;
      let onCut1 = select(0.0, smoothstep(cutWidth, 0.0, abs(h)), s1 < 0.0);
      let onCut2 = select(0.0, smoothstep(cutWidth, 0.0, abs(h)), s2 < 0.0 && s1 < 0.0);
      branchCutMask = max(branchCutMask, max(onCut1, onCut2));
    }
    return StreamResult(psi, branchCutMask);
  }

  @vertex
  fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let pos = array(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
    return vec4f(pos[i], 0, 1);
  }

  @fragment
  fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / uniforms.resolution;
    let x = mix(uniforms.bounds.x, uniforms.bounds.y, uv.x);
    let y = mix(uniforms.bounds.w, uniforms.bounds.z, uv.y);

    let result = computeStreamFunction(vec2f(x, y));

    let spacing = 0.02 * pi;
    let fw = fwidth(result.psi);
    let dist = abs(fract(result.psi / spacing + 0.5) - 0.5) * spacing;
    let distPx = dist / max(fw, 0.0001);
    let lineWidthPx = 1.5;
    let contour = 1.0 - smoothstep(0.0, lineWidthPx, distPx);
    let opacity = contour * 0.7 * (1.0 - result.branchCutMask);

    return vec4f(vec3f(0.4, 0.6, 0.9), opacity);
  }
`;function Ot(C,N,p,y){const S=C-p.x1,B=N-p.y1,Y=C-p.x2,q=N-p.y2,X=S*S+B*B,D=Y*Y+q*q;if(X<1e-6||D<1e-6)return{vx:0,vy:0};const A=p.x2-p.x1,E=p.y2-p.y1,G=Math.sqrt(A*A+E*E),i=A/G,O=E/G,J=-O,c=i,d=.5*Math.log(D/X),ot=S*q-Y*B,rt=S*Y+B*q,V=Math.atan2(ot,rt),K=.5/Math.PI;return{vx:K*(p.sigma*(-d*i+V*J)+y*(V*i+d*J)),vy:K*(p.sigma*(-d*O+V*c)+y*(V*O+d*c))}}function Tt({d3:C,html:N,Inputs:p,device:y,canvasFormat:S,width:B,devicePixelRatio:Y}){const q=N`<div style="display: flex; flex-wrap: wrap; gap: 0.5em 2em; margin-bottom: 1em; font-family: var(--sans-serif); font-size: 14px;"></div>`,X=p.range([-2,2],{label:"σ₁ (center)",value:.7,step:.01,width:180}),D=p.range([-2,2],{label:"σ₂ (left)",value:.3,step:.01,width:180}),A=p.range([-2,2],{label:"σ₃ (right)",value:-.7,step:.01,width:180}),E=p.range([-2,2],{label:"γ (vortex)",value:1,step:.01,width:180}),G=p.range([0,2],{label:"V∞",value:.5,step:.01,width:180});q.append(X,D,A,E,G);const i={sigma1:X.value,sigma2:D.value,sigma3:A.value,gamma:E.value,vInf:G.value},O=Math.PI+Math.PI/6,J=-Math.PI/6,c=[{x1:-.5,y1:0,x2:.5,y2:0,sigma:i.sigma1},{x1:-.5,y1:0,x2:-.5+Math.cos(O),y2:Math.sin(O),sigma:i.sigma2},{x1:.5,y1:0,x2:.5+Math.cos(J),y2:Math.sin(J),sigma:i.sigma3}],d=document.createElement("canvas");d.id="stream-function-canvas";const ot=d.getContext("webgpu");ot.configure({device:y,format:S,alphaMode:"premultiplied"});const rt=y.createShaderModule({code:Wt}),V=y.createRenderPipeline({layout:"auto",vertex:{module:rt,entryPoint:"vs"},fragment:{module:rt,entryPoint:"fs",targets:[{format:S,blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha"}}}]},primitive:{topology:"triangle-list"}}),K=y.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),gt=y.createBuffer({size:c.length*24,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),St=y.createBindGroup({layout:V.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:K}},{binding:1,resource:{buffer:gt}}]}),F=B,R=Math.min(525,B*.675),h={top:20,right:20,bottom:30,left:20},pt=F-h.left-h.right,mt=R-h.top-h.bottom,g={xmin:-2,xmax:2,ymin:-1.2,ymax:1.2},dt=pt/mt,vt=g.xmax-g.xmin,Mt=g.ymax-g.ymin,Bt=vt/Mt,bt=(g.xmin+g.xmax)/2,$t=(g.ymin+g.ymax)/2;let f;if(dt>Bt){const n=Mt*dt;f={xmin:bt-n/2,xmax:bt+n/2,ymin:g.ymin,ymax:g.ymax}}else{const n=vt/dt;f={xmin:g.xmin,xmax:g.xmax,ymin:$t-n/2,ymax:$t+n/2}}const v=C.scaleLinear().domain([f.xmin,f.xmax]).range([0,pt]),M=C.scaleLinear().domain([f.ymin,f.ymax]).range([mt,0]);function ht(){const n=new Float32Array(c.length*6);c.forEach((a,e)=>{n[e*6+0]=a.x1,n[e*6+1]=a.y1,n[e*6+2]=a.x2,n[e*6+3]=a.y2,n[e*6+4]=a.sigma,n[e*6+5]=0}),y.queue.writeBuffer(gt,0,n)}function ft(){d.width=F*Y,d.height=R*Y,d.style.width=F+"px",d.style.height=R+"px";const n=(f.xmax-f.xmin)/pt,a=(f.ymax-f.ymin)/mt,e={xmin:f.xmin-h.left*n,xmax:f.xmax+h.right*n,ymin:f.ymin-h.bottom*a,ymax:f.ymax+h.top*a},t=new Float32Array([e.xmin,e.xmax,e.ymin,e.ymax,d.width,d.height,c.length,i.gamma,i.vInf,0,0,0,0,0,0,0]);y.queue.writeBuffer(K,0,t);const o=y.createCommandEncoder(),r=o.beginRenderPass({colorAttachments:[{view:ot.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"}]});r.setPipeline(V),r.setBindGroup(0,St),r.draw(3),r.end(),y.queue.submit([o.finish()])}function Yt(n,a){let e=i.vInf,t=0;for(const o of c){const r=Ot(n,a,o,i.gamma);e+=r.vx,t+=r.vy}return{vx:e,vy:t}}const T=C.create("svg").attr("width",F).attr("height",R).attr("viewBox",`0 0 ${F} ${R}`).style("max-width","100%").style("background","transparent").style("cursor","crosshair"),Q=T.append("g").attr("transform",`translate(${h.left},${h.top})`),xt=Q.append("g").attr("class","panel-lines"),tt=Q.append("g").attr("class","indicators"),wt=Q.append("g").attr("class","vertices"),_=Q.append("g").attr("visibility","hidden").style("pointer-events","none"),qt=_.append("line").attr("stroke","#e74c3c").attr("stroke-width",4),Xt=_.append("path").attr("fill","#e74c3c"),it=Q.append("g").attr("class","freestream-arrow").style("pointer-events","none");function Lt(){if(it.selectAll("*").remove(),i.vInf<.01)return;const n=50*Math.min(1,i.vInf),a=(R-h.top-h.bottom)/2,e=10,t=12,o=Math.max(0,Math.min(1,(i.vInf-.2)/.1));it.append("line").attr("x1",e).attr("y1",a).attr("x2",e+n-t*.5).attr("y2",a).attr("stroke","#27ae60").attr("stroke-width",4).attr("opacity",o);const r=e+n;it.append("path").attr("d",`M${r},${a} L${r-t},${a-6} L${r-t},${a+6} Z`).attr("fill","#27ae60").attr("opacity",o),it.append("text").attr("x",e+n/2).attr("y",a-12).attr("text-anchor","middle").attr("font-size","12px").attr("font-family","var(--sans-serif)").attr("fill","#27ae60").attr("opacity",o).text("V∞")}function Dt(n,a,e){const t=(a.x1+a.x2)/2,o=(a.y1+a.y2)/2,r=a.sigma;if(Math.abs(r)<.01)return;const b=n.append("g").attr("class",`source-indicator-${e}`).attr("transform",`translate(${v(t)},${M(o)})`),L=28*Math.min(1,Math.abs(r)),P=3,s=r>0,m=s?"#2ecc71":"#9b59b6",u=Math.max(0,Math.min(1,(Math.abs(r)-.2)/.1));for(let l=0;l<4;l++){const x=l/4*Math.PI*2+Math.PI/4,k=L*Math.cos(x),z=L*Math.sin(x),H=P*Math.cos(x),U=P*Math.sin(x),$=s?k:H,w=s?z:U,I=s?H:k,W=s?U:z,nt=$-($-I)*.2,ct=w-(w-W)*.2;b.append("line").attr("x1",I).attr("y1",W).attr("x2",nt).attr("y2",ct).attr("stroke",m).attr("stroke-width",4.5).attr("opacity",u);const Z=14,j=Math.atan2(w-W,$-I),et=$-Z*Math.cos(j-.45),st=w-Z*Math.sin(j-.45),lt=$-Z*Math.cos(j+.45),ut=w-Z*Math.sin(j+.45);b.append("path").attr("d",`M${$},${w} L${et},${st} L${lt},${ut} Z`).attr("fill",m).attr("opacity",u)}}function Gt(n,a,e,t){if(Math.abs(t)<.01)return;const o=(a.x1+a.x2)/2,r=(a.y1+a.y2)/2,b=a.x2-a.x1,L=a.y2-a.y1,P=Math.atan2(L,b),s=28*Math.min(1,Math.abs(t)),m=Math.PI*.8,u=.15,l=t>0?1:-1,x=Math.max(0,Math.min(1,(Math.abs(t)-.2)/.1)),k=l>0?-m:-(m-u),z=l>0?m-u:m,H=C.arc().innerRadius(s-1.5).outerRadius(s+1.5).startAngle(k).endAngle(z),U=n.append("g").attr("class",`vortex-indicator-${e}`).attr("transform",`translate(${v(o)},${M(r)}) rotate(${-P*180/Math.PI})`);U.append("path").attr("d",H()).attr("fill","#3498db").attr("opacity",x);const $=m*l,w=12,I=5,W=s*Math.sin($),nt=-s*Math.cos($),ct=$-w/s*l,Z=s*Math.sin(ct),j=-s*Math.cos(ct),et=W-Z,st=nt-j,lt=Math.sqrt(et*et+st*st),ut=et/lt,Ct=st/lt,It=-Ct,kt=ut,At=W-ut*w,Et=nt-Ct*w,Ft=At+It*I,Rt=Et+kt*I,_t=At-It*I,Ut=Et-kt*I;U.append("path").attr("d",`M${W},${nt} L${Ft},${Rt} L${_t},${Ut} Z`).attr("fill","#3498db").attr("opacity",x)}function yt(){xt.selectAll("*").remove(),c.forEach(t=>{xt.append("line").attr("x1",v(t.x1)).attr("y1",M(t.y1)).attr("x2",v(t.x2)).attr("y2",M(t.y2)).attr("stroke","#333").attr("stroke-width",4).attr("stroke-linecap","round")}),tt.selectAll("*").remove(),c.forEach((t,o)=>{Dt(tt,t,o),Gt(tt,t,o,i.gamma)}),wt.selectAll("*").remove();const n=[];c.forEach((t,o)=>{n.push({x:t.x1,y:t.y1,panel:o,endpoint:"p1"}),n.push({x:t.x2,y:t.y2,panel:o,endpoint:"p2"})});const a=[],e=new Map;n.forEach(t=>{const o=`${t.x.toFixed(6)},${t.y.toFixed(6)}`;e.has(o)?e.get(o).panels.push({panel:t.panel,endpoint:t.endpoint}):(e.set(o,{...t,panels:[{panel:t.panel,endpoint:t.endpoint}]}),a.push(e.get(o)))}),a.forEach((t,o)=>{const r=wt.append("g").attr("class","vertex-handle").attr("transform",`translate(${v(t.x)},${M(t.y)})`).style("cursor","move");r.append("circle").attr("r",15).attr("fill","transparent"),r.append("circle").attr("r",5).attr("fill","#e74c3c").attr("stroke","#fff").attr("stroke-width",2),r.call(C.drag().on("start",function(){_.attr("visibility","hidden")}).on("drag",function(b){const L=v.invert(b.x),P=M.invert(b.y);t.panels.forEach(({panel:s,endpoint:m})=>{m==="p1"?(c[s].x1=L,c[s].y1=P):(c[s].x2=L,c[s].y2=P)}),t.x=L,t.y=P,C.select(this).attr("transform",`translate(${b.x},${b.y})`),xt.selectAll("line").data(c).attr("x1",s=>v(s.x1)).attr("y1",s=>M(s.y1)).attr("x2",s=>v(s.x2)).attr("y2",s=>M(s.y2)),c.forEach((s,m)=>{const u=(s.x1+s.x2)/2,l=(s.y1+s.y2)/2,x=Math.atan2(s.y2-s.y1,s.x2-s.x1);tt.select(`.source-indicator-${m}`).attr("transform",`translate(${v(u)},${M(l)})`),tt.select(`.vortex-indicator-${m}`).attr("transform",`translate(${v(u)},${M(l)}) rotate(${-x*180/Math.PI})`)}),ht(),ft()}).on("end",function(){yt()}))})}function Pt(n,a){const e=v.invert(n-h.left),t=M.invert(a-h.top),{vx:o,vy:r}=Yt(e,t),b=Math.sqrt(o*o+r*r);if(b<.01){_.attr("visibility","hidden");return}_.attr("visibility","visible");const L=v(e),P=M(t),m=Math.min(b*360,F/4),u=Math.atan2(-r,o),l=18,x=L+m*Math.cos(u),k=P+m*Math.sin(u),z=x-l*.7*Math.cos(u),H=k-l*.7*Math.sin(u);qt.attr("x1",L).attr("y1",P).attr("x2",z).attr("y2",H);const U=x-l*Math.cos(u-.35),$=k-l*Math.sin(u-.35),w=x-l*Math.cos(u+.35),I=k-l*Math.sin(u+.35);Xt.attr("d",`M${x},${k} L${U},${$} L${w},${I} Z`)}T.on("mousemove",function(n){const[a,e]=C.pointer(n);Pt(a,e)}),T.on("mouseleave",function(){_.attr("visibility","hidden")}),T.on("touchstart touchmove",function(n){n.preventDefault();const a=n.touches[0],e=this.getBoundingClientRect();Pt(a.clientX-e.left,a.clientY-e.top)}),T.on("touchend",function(){_.attr("visibility","hidden")});function at(){c[0].sigma=i.sigma1,c[1].sigma=i.sigma2,c[2].sigma=i.sigma3,ht(),ft(),yt(),Lt()}X.addEventListener("input",()=>{i.sigma1=X.value,at()}),D.addEventListener("input",()=>{i.sigma2=D.value,at()}),A.addEventListener("input",()=>{i.sigma3=A.value,at()}),E.addEventListener("input",()=>{i.gamma=E.value,at()}),G.addEventListener("input",()=>{i.vInf=G.value,at()}),ht(),ft(),yt(),Lt(),Object.assign(d.style,{position:"absolute",top:"0",left:"0"});const Vt=N`<figure style="margin: 1.5em 0;">
    <div style="position: relative; width: ${F}px; height: ${R}px;">
      ${d}
      ${Object.assign(T.node(),{style:"position: absolute; top: 0; left: 0;"})}
    </div>
    <figcaption style="text-align: center; font-size: 14px; margin-top: 8px;">
      Drag vertices to reshape panels. Adjust sliders to change source/vortex strengths.
      Hover to see induced velocity.
    </figcaption>
  </figure>`;return{controls:q,figure:Vt}}export{Tt as createInteractivePanelDiagram};
