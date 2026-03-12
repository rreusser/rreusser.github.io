import{d as b}from"./index-ByB2dbry.js";b({root:document.getElementById("cell-2"),expanded:[],variables:[]},{id:2,body:(e,a)=>e`Imagine wanting to combinatorially reassign the pixels of one image to match another image subject so some cost metric. An exhaustive solution like the [Hungarian Algorithm](https://en.wikipedia.org/wiki/Hungarian_algorithm) has ${a`\mathcal{O}(n^3)`} complexity, making it both relatively pointless as a style transfer algorithm *and* very expensive.
`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});b({root:document.getElementById("cell-5"),expanded:[],variables:[]},{id:5,body:(e,a,n,r,o)=>{const l=e,i=e,p={top:20,right:20,bottom:30,left:20},y=l-p.left-p.right,d=i-p.top-p.bottom,x=a.create("svg").attr("width",l).attr("height",i).attr("viewBox",[0,0,l,i]).style("max-width","100%").style("height","auto").style("display","block").style("margin","0 auto"),c=x.append("g").attr("transform",`translate(${p.left},${p.top})`),u=a.scaleLinear().domain([-1.5,1.5]).range([0,y]),s=a.scaleLinear().domain([-1.5,1.5]).range([d,0]),w=24,g="#4682b4",j="#e07028",v="#999";function I(h,f,q,B){const C=[];for(let U=0;U<B;U++){const D=Math.random()*Math.PI*2,A=q*Math.sqrt(Math.random());C.push({x:h+A*Math.cos(D),y:f+A*Math.sin(D)})}return C}const k=I(0,0,.5,w),P=I(-.9,0,.4,w);let M=P.map(h=>({...h}));c.append("line").attr("class","projection-line").attr("stroke",v).attr("stroke-width",1).attr("stroke-dasharray","4,4").style("opacity",0);const L=c.append("g").attr("class","projections"),Z=c.selectAll(".target").data(k).join("circle").attr("class","target").attr("cx",h=>u(h.x)).attr("cy",h=>s(h.y)).attr("r",6).attr("fill",j).attr("opacity",.7),$=c.selectAll(".source").data(M).join("circle").attr("class","source").attr("cx",h=>u(h.x)).attr("cy",h=>s(h.y)).attr("r",6).attr("fill",g);let E=!1,S=0;async function R(h){return new Promise(f=>setTimeout(f,h))}function N(h,f){return h.x*f.x+h.y*f.y}function tt(h){const f=Math.sqrt(h.x*h.x+h.y*h.y);return{x:h.x/f,y:h.y/f}}async function W(){if(E)return;S++;const h=.5+S*.17,f=t=>t/h,q=Math.random()*Math.PI*2,B={x:Math.cos(q),y:Math.sin(q)},C={x:-B.y,y:B.x},U=-1,D=2.5,A=c.select(".projection-line");if(A.attr("x1",u(-B.x*D+C.x*U)).attr("y1",s(-B.y*D+C.y*U)).attr("x2",u(B.x*D+C.x*U)).attr("y2",s(B.y*D+C.y*U)).transition().duration(f(300)).style("opacity",1),await R(f(400)),E)return;const z=M.map((t,m)=>({index:m,value:N(t,B),point:t})),O=k.map((t,m)=>({index:m,value:N(t,B),point:t})),Y=.06;function K(t,m,H,X){const Q=N(t,m);return{x:Q*m.x+C.x*(H+X),y:Q*m.y+C.y*(H+X)}}const T=M.map(t=>K(t,B,U,Y)),F=k.map(t=>K(t,B,U,-Y));if(L.selectAll(".src-proj-line").data(M).join("line").attr("class","src-proj-line").attr("x1",t=>u(t.x)).attr("y1",t=>s(t.y)).attr("x2",(t,m)=>u(T[m].x)).attr("y2",(t,m)=>s(T[m].y)).attr("stroke",g).attr("stroke-width",1).attr("opacity",0).transition().duration(f(300)).attr("opacity",.3),L.selectAll(".tgt-proj-line").data(k).join("line").attr("class","tgt-proj-line").attr("x1",t=>u(t.x)).attr("y1",t=>s(t.y)).attr("x2",(t,m)=>u(F[m].x)).attr("y2",(t,m)=>s(F[m].y)).attr("stroke",j).attr("stroke-width",1).attr("opacity",0).transition().duration(f(300)).attr("opacity",.3),L.selectAll(".src-proj").data(T).join("circle").attr("class","src-proj").attr("cx",t=>u(t.x)).attr("cy",t=>s(t.y)).attr("r",4).attr("fill",g).attr("opacity",0).transition().duration(f(300)).attr("opacity",.8),L.selectAll(".tgt-proj").data(F).join("circle").attr("class","tgt-proj").attr("cx",t=>u(t.x)).attr("cy",t=>s(t.y)).attr("r",4).attr("fill",j).attr("opacity",0).transition().duration(f(300)).attr("opacity",.8),await R(f(600)),E)return;z.sort((t,m)=>t.value-m.value),O.sort((t,m)=>t.value-m.value);const G=z.map((t,m)=>({srcIdx:t.index,tgtIdx:O[m].index,srcProj:T[t.index],tgtProj:F[O[m].index]}));L.selectAll(".rank-line").data(G).join("line").attr("class","rank-line").attr("x1",t=>u(t.srcProj.x)).attr("y1",t=>s(t.srcProj.y)).attr("x2",t=>u(t.tgtProj.x)).attr("y2",t=>s(t.tgtProj.y)).attr("stroke","#666").attr("stroke-width",1.5).attr("opacity",0).transition().duration(f(300)).attr("opacity",.5);const V=.3,_=M.map(t=>({...t}));for(let t=0;t<z.length;t++){const m=_[z[t].index],H=O[t].value-z[t].value;m.x+=B.x*H*V,m.y+=B.y*H*V}if(await R(f(500)),E)return;M=_;const J=M.map(t=>K(t,B,U,Y));$.data(M).transition().duration(f(500)).attr("cx",t=>u(t.x)).attr("cy",t=>s(t.y)),L.selectAll(".src-proj-line").data(M).transition().duration(f(500)).attr("x1",t=>u(t.x)).attr("y1",t=>s(t.y)).attr("x2",(t,m)=>u(J[m].x)).attr("y2",(t,m)=>s(J[m].y)),L.selectAll(".src-proj").data(J).transition().duration(f(500)).attr("cx",t=>u(t.x)).attr("cy",t=>s(t.y));const et=G.map(t=>({...t,srcProj:J[t.srcIdx]}));L.selectAll(".rank-line").data(et).transition().duration(f(500)).attr("x1",t=>u(t.srcProj.x)).attr("y1",t=>s(t.srcProj.y)),await R(f(600)),!E&&(A.transition().duration(f(200)).style("opacity",0),L.selectAll("*").transition().duration(f(200)).attr("opacity",0).remove(),await R(f(400)),!E&&S<40?requestAnimationFrame(W):E||setTimeout(()=>{E||(S=0,M=P.map(t=>({...t})),$.data(M).transition().duration(500).attr("cx",t=>u(t.x)).attr("cy",t=>s(t.y)),setTimeout(()=>{E||requestAnimationFrame(W)},600))},3e3))}return requestAnimationFrame(W),n.then(()=>{E=!0}),r(o`<figure id="sot-demo-figure">
  ${x.node()}
  <figcaption>
    Blue points (source) move toward orange points (target) via sliced optimal transport.
  </figcaption>
</figure>`),{demoWidth:l,demoHeight:i,margin:p,innerWidth:y,innerHeight:d,svg:x,g:c,xScale:u,yScale:s,nPoints:w,sourceColor:g,targetColor:j,projectionLineColor:v,generateCluster:I,targetPoints:k,initialSourcePoints:P,sourcePoints:M,projectionG:L,targetCircles:Z,sourceCircles:$,cancelled:E,iteration:S,sleep:R,project:N,normalize:tt,animateStep:W}},inputs:["width","d3","invalidation","display","html"],outputs:["demoWidth","demoHeight","margin","innerWidth","innerHeight","svg","g","xScale","yScale","nPoints","sourceColor","targetColor","projectionLineColor","generateCluster","targetPoints","initialSourcePoints","sourcePoints","projectionG","targetCircles","sourceCircles","cancelled","iteration","sleep","project","normalize","animateStep"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-6"),expanded:[],variables:[]},{id:6,body:(e,a,n)=>{const r=e(a.select(Object.keys(n),{label:"Source",value:"ellingwood"})),o=e(a.select(Object.keys(n),{label:"Target",value:"webb"})),l=e(a.range([1,4],{value:2,label:"Downsample",step:.25})),i=e(a.range([1,32],{label:"Batch size",value:8,step:1})),p=e(a.range([1,1024],{label:"Max iterations",value:100,transform:Math.log,step:1})),y=e(a.range([.05,1],{label:"Tolerance",transform:Math.log,value:.3})),d=e(a.range([0,1],{label:"Interpolate",value:1})),x=e(a.button("Restart"));return{sourceFile:r,targetFile:o,downsample:l,batchSize:i,maxIterations:p,tolerance:y,interpolate:d,restart:x}},inputs:["view","Inputs","FILES"],outputs:["sourceFile","targetFile","downsample","batchSize","maxIterations","tolerance","interpolate","restart"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-7"),expanded:[],variables:[]},{id:7,body:(e,a,n,r,o,l,i,p)=>{const y=e`<figure class="image-figure">
  <style>
    .image-figure {
      --extra: min(60px, max(0px, calc((100vw - 100%) / 2 - 8px)));
      max-width: min(840px, calc(100vw - 16px));
      width: calc(100% + var(--extra) * 2);
      margin-left: calc(var(--extra) * -1);
      margin-right: calc(var(--extra) * -1);
    }
    .image-figure .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .image-figure .column {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .image-figure .label {
      text-align: center;
      font-weight: 500;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .image-figure .histogram {
      margin-top: 8px;
    }
    @media (max-width: 600px) {
      .image-figure {
        width: 100%;
        margin-left: 0;
        margin-right: 0;
      }
      .image-figure .grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }
  </style>
  <div class="grid"></div>
</figure>`,d=y.querySelector(".grid"),x=["Source","Result","Target"],c=[a,n,r],u=window.innerWidth<=600,s=u?Math.min(480,window.innerWidth-32):280,w=u?120:200;return c.forEach((g,j)=>{const v=document.createElement("div");v.className="column";const I=document.createElement("div");I.className="label",I.textContent=x[j],v.appendChild(I);const k=o(g,...l);k.style.width="100%",k.style.height="auto",v.appendChild(k);const P=document.createElement("div");P.className="histogram";const M=i(g,{w:s,h:w});M.style.width="100%",P.appendChild(M),v.appendChild(P),d.appendChild(v)}),p(y),{figure:y,grid:d,labels:x,datasets:c,isMobile:u,histWidth:s,histHeight:w}},inputs:["html","srcData","interpolated","targetData","drawImage","shape","plotHistogram","display"],outputs:["figure","grid","labels","datasets","isMobile","histWidth","histHeight"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-8"),expanded:[],variables:[]},{id:8,body:(e,a,n,r,o,l,i)=>{a(n`<figure>${r.plot({height:150,width:Math.min(o,400),y:{grid:!0,type:"log"},x:{grid:!0},marks:[r.lineY(l.history,{x:"iteration",y:"delta"}),r.ruleY([i],{strokeDasharray:"4,4",stroke:"rgb(200 0 0)"})]})}</figure>`)},inputs:["result","display","html","Plot","width","state","tolerance"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-9"),expanded:[],variables:[]},{id:9,body:(e,a)=>({smoothHistogram:e(a.checkbox(["Smooth histograms"],{value:["Smooth histograms"]}))}),inputs:["view","Inputs"],outputs:["smoothHistogram"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-10"),expanded:[],variables:[]},{id:10,body:()=>({state:{history:[]}}),inputs:[],outputs:["state"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-11"),expanded:[],variables:[]},{id:11,body:(e,a,n)=>{const r=e.src.length,o=new Uint8ClampedArray(r);for(let i=0;i<r;i++)o[i]=a[i]+(e.src[i]-a[i])*n;return{N:r,out:o,interpolated:o}},inputs:["result","srcData","interpolate"],outputs:["N","out","interpolated"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-12"),expanded:[],variables:[]},{id:12,body:(e,a,n,r,o,l,i,p,y)=>(a.history=[],{result:n.observe(x=>{let c=!1;const u=r(o.slice(),l,{maxIterations:i,batchSize:p,tolerance:y,state:a});async function s(){if(c)return;const{value:w,done:g}=await u.next();c||(w&&x(w),!g&&!c&&requestAnimationFrame(s))}return s(),()=>{c=!0}})}),inputs:["restart","state","Generators","slicedOptimalTransport","srcData","targetData","maxIterations","batchSize","tolerance"],outputs:["result"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-13"),expanded:[],variables:[]},{id:13,body:e=>{const a=`
  function sort(values, indices, left, right) {
    let tmp;
    if (left >= right) return;
    const pivot = values[(left + right) >> 1];
    let i = left - 1;
    let j = right + 1;
    while (true) {
      do i++;
      while (values[i] < pivot);
      do j--;
      while (values[j] > pivot);
      if (i >= j) break;
      tmp = values[i];
      values[i] = values[j];
      values[j] = tmp;
      tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    sort(values, indices, left, j);
    sort(values, indices, j + 1, right);
  }

  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function vec3normalize(out, a) {
    const x = a[0], y = a[1], z = a[2];
    let len = x * x + y * y + z * z;
    if (len > 0) len = 1 / Math.sqrt(len);
    out[0] = a[0] * len;
    out[1] = a[1] * len;
    out[2] = a[2] * len;
    return out;
  }

  self.onmessage = function(e) {
    const { id, src, tgt, N } = e.data;
    const index = new Uint32Array(N);
    const srcProjection = new Float32Array(N);
    const tgtProjection = new Float32Array(N);
    const adjustment = new Float32Array(N * 3);

    const [v0, v1, v2] = vec3normalize([], [randn(), randn(), randn()]);

    for (let i = 0, i4 = 0; i < N; i++, i4 += 4) {
      index[i] = i;
      srcProjection[i] = v0 * src[i4] + v1 * src[i4 + 1] + v2 * src[i4 + 2];
      tgtProjection[i] = v0 * tgt[i4] + v1 * tgt[i4 + 1] + v2 * tgt[i4 + 2];
    }

    sort(srcProjection, index, 0, N - 1);
    tgtProjection.sort();

    for (let j = 0; j < N; j++) {
      const projectedDiff = tgtProjection[j] - srcProjection[j];
      const i3 = index[j] * 3;
      adjustment[i3 + 0] = v0 * projectedDiff;
      adjustment[i3 + 1] = v1 * projectedDiff;
      adjustment[i3 + 2] = v2 * projectedDiff;
    }

    self.postMessage({ id, adjustment }, [adjustment.buffer]);
  };
`,n=new Blob([a],{type:"application/javascript"}),r=URL.createObjectURL(n),o=navigator.hardwareConcurrency||4,l=new Map;let i=0;const p=Array.from({length:o},()=>{const d=new Worker(r);return d.onmessage=x=>{const{id:c,adjustment:u}=x.data,s=l.get(c);s&&(l.delete(c),s(u))},d});function y(d,x,c,u){const s=i++,w=p[d%p.length];return new Promise(g=>{l.set(s,g),w.postMessage({id:s,src:x,tgt:c,N:u})})}return e.then(()=>{p.forEach(d=>d.terminate()),URL.revokeObjectURL(r),l.clear()}),{workerCode:a,workerBlob:n,workerUrl:r,numWorkers:o,pendingJobs:l,nextJobId:i,workerPool:p,runWorkerJob:y}},inputs:["invalidation"],outputs:["workerCode","workerBlob","workerUrl","numWorkers","pendingJobs","nextJobId","workerPool","runWorkerJob"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-15"),expanded:[],variables:[]},{id:15,body:e=>{async function*a(n,r,{maxIterations:o=100,batchSize:l=4,tolerance:i=1,state:p}={}){if(n.length!==r.length)throw new Error("Source size must equal target size");p.history=[];const y=n.length>>2,d=new Float32Array(n),x=new Float32Array(r);let c=1/0,u=0;for(;c>i&&++u<=o;){const w=await e(d,x,y,l);c=0;for(let j=0,v=0;v<y*4;j+=3,v+=4){const I=w[j]/l,k=w[j+1]/l,P=w[j+2]/l;d[v]+=I,d[v+1]+=k,d[v+2]+=P,c+=I*I+k*k+P*P}c=Math.sqrt(c/y),p.history=p.history.concat([{iteration:u,delta:c}]);const g=new Uint8ClampedArray(d.length);for(let j=0;j<d.length;j++)g[j]=d[j];yield{delta:c,src:g}}const s=new Uint8ClampedArray(d.length);for(let w=0;w<d.length;w++)s[w]=d[w];return{delta:c,src:s}}return{slicedOptimalTransport:a}},inputs:["runBatchParallel"],outputs:["slicedOptimalTransport"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-16"),expanded:[],variables:[]},{id:16,body:e=>{async function a(n,r,o,l){const i=[];for(let d=0;d<l;d++)i.push(e(d,n,r,o));const p=await Promise.all(i),y=new Float32Array(o*3);for(const d of p)for(let x=0;x<y.length;x++)y[x]+=d[x];return y}return{runBatchParallel:a}},inputs:["runWorkerJob"],outputs:["runBatchParallel"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-17"),expanded:[],variables:[]},{id:17,body:(e,a)=>({shape:[e.width/a|0,e.height/a|0]}),inputs:["src","downsample"],outputs:["shape"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-18"),expanded:[],variables:[]},{id:18,body:e=>{function a(n,r,o,l=2){const i=document.createElement("canvas");i.style.width=`${r*e/l}px`,i.style.height=`${o*e/l}px`,i.width=r,i.height=o,i.style.display="inline-block";const p=i.getContext("2d"),y=p.getImageData(0,0,r,o);return y.data.set(n),p.putImageData(y,0,0),i}return{drawImage:a}},inputs:["downsample"],outputs:["drawImage"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-19"),expanded:[],variables:[]},{id:19,body:()=>{function e(a,n,r){const o=document.createElement("canvas");o.width=n,o.height=r;const l=o.getContext("2d");return l.drawImage(a,0,0,n,r),l.getImageData(0,0,o.width,o.height).data}return{getPixels:e}},inputs:[],outputs:["getPixels"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-20"),expanded:[],variables:[]},{id:20,body:e=>({FILES:{ellingwood:e(new URL("/notebooks/assets/ellingwood-BY6AMUUr.jpg",import.meta.url).href),gravity:e(new URL("/notebooks/assets/gravity-DxsNUaAg.jpg",import.meta.url).href),m61:e(new URL("/notebooks/assets/m61-CMx116bK.jpg",import.meta.url).href),webb:e(new URL("/notebooks/assets/webb-B-bgMLfR.jpg",import.meta.url).href),yosemite:e(new URL("/notebooks/assets/yosemite-Bf4zccGA.jpg",import.meta.url).href),yosemite2:e(new URL("/notebooks/assets/yosemite2-CoeK441w.jpg",import.meta.url).href),yosemite3:e(new URL("/notebooks/assets/yosemite3-A5rk0zjS.jpg",import.meta.url).href),yosemite4:e(new URL("/notebooks/assets/yosemite4-CctwNKjh.jpg",import.meta.url).href),topographic:e(new URL("/notebooks/assets/topographic-BDjeFbTg.jpg",import.meta.url).href),bigcat:e(new URL("/notebooks/assets/bigcat-B7hKXyi2.jpg",import.meta.url).href),hokitika:e(new URL("/notebooks/assets/hokitika-DAx14Vh-.jpg",import.meta.url).href),"arthur's pass":e(new URL("/notebooks/assets/arthurs-pass-DjEsq2aL.jpg",import.meta.url).href),rainier:e(new URL("/notebooks/assets/rainier-DyCVLo8B.jpg",import.meta.url).href),shelf:e(new URL("/notebooks/assets/shelf-CvUf6jR_.jpg",import.meta.url).href),cranes:e(new URL("/notebooks/assets/cranes-B99uinfj.jpg",import.meta.url).href),"smith rock":e(new URL("/notebooks/assets/smith-rock-Klxbi4bk.jpg",import.meta.url).href),dog:e(new URL("/notebooks/assets/dog-B0PBrh4h.jpg",import.meta.url).href),"ansel adams":e(new URL("/notebooks/assets/ansel-adams-DU9iz5cO.jpg",import.meta.url).href)}}),inputs:["FileAttachment"],outputs:["FILES"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-21"),expanded:[],variables:[]},{id:21,body:async(e,a,n)=>({src:await e(await a[n].blob())}),inputs:["createImageBitmap","FILES","sourceFile"],outputs:["src"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-22"),expanded:[],variables:[]},{id:22,body:async(e,a,n)=>({target:await e(await a[n].blob())}),inputs:["createImageBitmap","FILES","targetFile"],outputs:["target"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-23"),expanded:[],variables:[]},{id:23,body:(e,a,n)=>({srcData:e(a,a.width/n,a.height/n)}),inputs:["getPixels","src","downsample"],outputs:["srcData"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-24"),expanded:[],variables:[]},{id:24,body:(e,a,n,r)=>({targetData:e(a,n.width/r,n.height/r)}),inputs:["getPixels","target","src","downsample"],outputs:["targetData"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-25"),expanded:[],variables:[]},{id:25,body:()=>{function e(a){const n=a.slice(),r=a.length;for(let o=0;o<r;o++)n[o]=.25*(a[Math.max(0,o-1)]+a[Math.min(r-1,o+1)])+.5*a[o];for(let o=0;o<r;o++)a[o]=.25*(n[Math.max(0,o-1)]+n[Math.min(r-1,o+1)])+.5*n[o];return a}return{smooth:e}},inputs:[],outputs:["smooth"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-26"),expanded:[],variables:[]},{id:26,body:(e,a,n,r,o)=>{function l(i,{w:p=Math.max(320,Math.min(e.width/devicePixelRatio,a/3)),h:y=200}={}){function d(g){const j=g.length;let v=new Uint16Array(256),I=new Uint16Array(256),k=new Uint16Array(256);for(let P=0;P<j;P+=4)v[g[P]]++,I[g[P+1]]++,k[g[P+2]]++;return~n.indexOf("Smooth histograms")&&(v=r(v),I=r(I),k=r(k)),{r:v,g:I,b:k}}const{r:x,g:c,b:u}=d(i),s=[];for(let g=0;g<256;g++)s[g]={level:g,r:x[g],g:c[g],b:u[g]};const w=o.plot({height:y,width:p,y:{grid:!0},x:{grid:!0},marks:[o.areaY(s,{x:"level",y:"r",stroke:"rgb(255 0 0/100%)",fill:"rgb(200 0 0/20%)"}),o.areaY(s,{x:"level",y:"g",stroke:"rgb(0 150 0/100%)",fill:"rgb(0 150 0/20%)"}),o.areaY(s,{x:"level",y:"b",stroke:"rgb(0 0 255/100%)",fill:"rgb(0 0 255/15%)"})]});return w.style.display="inline-block",w}return{plotHistogram:l}},inputs:["src","width","smoothHistogram","smooth","Plot"],outputs:["plotHistogram"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-27"),expanded:[],variables:[]},{id:27,body:()=>{function e(a,n){const r=n[0],o=n[1],l=n[2];let i=r*r+o*o+l*l;return i>0&&(i=1/Math.sqrt(i)),a[0]=n[0]*i,a[1]=n[1]*i,a[2]=n[2]*i,a}return{vec3normalize:e}},inputs:[],outputs:["vec3normalize"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-28"),expanded:[],variables:[]},{id:28,body:()=>{function e(){let a=0,n=0;for(;a===0;)a=Math.random();for(;n===0;)n=Math.random();return Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*n)}return{randn:e}},inputs:[],outputs:["randn"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
