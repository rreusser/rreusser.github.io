function j(i="scope-"){return i+(performance.now()+Math.random()).toString(32).replace(".","-")}function A(i){return i==null?null:typeof i=="number"?`${i}px`:`${i}`}const B=`
/* Options */
:scope {
  color: var(--theme-foreground-focus, #3b99fc);
  width: 240px;
}

:scope {
  position: relative;
  display: inline-block;
  --thumb-size: 15px;
  --thumb-radius: calc(var(--thumb-size) / 2);
  padding: var(--thumb-radius) 0;
  margin: 2px;
  vertical-align: middle;
}
:scope .range-track {
  box-sizing: border-box;
  position: relative;
  height: 7px;
  background-color: var(--theme-foreground-faintest, hsl(0, 0%, 80%));
  overflow: visible;
  border-radius: 4px;
  border: 1px solid var(--theme-foreground-fainter, hsl(0, 0%, 60%));
  padding: 0 var(--thumb-radius);
}
:scope .range-track-zone {
  box-sizing: border-box;
  position: relative;
}
:scope .range-select {
  box-sizing: border-box;
  position: relative;
  left: var(--range-min);
  width: calc(var(--range-max) - var(--range-min));
  cursor: ew-resize;
  background: currentColor;
  height: 7px;
  border: inherit;
}
/* Expands the hotspot area. */
:scope .range-select:before {
  content: "";
  position: absolute;
  width: 100%;
  height: var(--thumb-size);
  left: 0;
  top: calc(2px - var(--thumb-radius));
}
:scope .range-select:focus,
:scope .thumb:focus {
  outline: none;
}
:scope .thumb {
  box-sizing: border-box;
  position: absolute;
  width: var(--thumb-size);
  height: var(--thumb-size);

  background: var(--theme-foreground-focus, #3b99fc);
  top: -4px;
  border-radius: 100%;
  border: none;
  cursor: default;
  margin: 0;
}
:scope .thumb:hover,
:scope .range-select:hover {
  filter: brightness(1.2);
}
:scope .thumb:active,
:scope .range-select:active {
  filter: brightness(0.85);
}
:scope .thumb-min {
  left: calc(-1px - var(--thumb-radius));
}
:scope .thumb-max {
  right: calc(-1px - var(--thumb-radius));
}
:scope.range-inverted .range-track {
  background-color: currentColor;
}
:scope.range-inverted .range-select {
  background: var(--theme-foreground-faintest, hsl(0, 0%, 80%));
}
`;function H(i={}){const{min:m=0,max:h=100,step:q="any",value:T=[m,h],color:y,width:g,theme:O=B,transform:E=null,invert:S=null}=i;let $,k;if(E)if($=E,S)k=S;else if(E===Math.log)k=Math.exp;else if(E===Math.sqrt)k=e=>e*e;else throw new Error("rangeInput: transform provided without invert function");else $=e=>e,k=e=>e;const z=$(m),P=$(h),c={},_=j(),L=(e,t,s)=>s<e?e:s>t?t:s,r=document.createElement("input");r.type="range",r.min=m,r.max=h,r.step=q;const a=document.createElement("div");a.className=`${_} range-slider`,y&&(a.style.color=y),g&&(a.style.width=A(g)),a.innerHTML=`
    <div class="range-track">
      <div class="range-track-zone">
        <div class="range-select" tabindex="0">
          <div class="thumb thumb-min" tabindex="0"></div>
          <div class="thumb thumb-max" tabindex="0"></div>
        </div>
      </div>
    </div>
    <style>${O.replace(/:scope\b/g,"."+_)}</style>
  `,c.track=a.querySelector(".range-track"),c.zone=a.querySelector(".range-track-zone"),c.range=a.querySelector(".range-select"),c.min=a.querySelector(".thumb-min"),c.max=a.querySelector(".thumb-max");let o=[],p=!1;Object.defineProperty(a,"value",{get:()=>[...o],set:([e,t])=>{o=b(e,t),C()}});const b=(e,t)=>(e=isNaN(e)?m:(r.value=e,r.valueAsNumber),t=isNaN(t)?h:(r.value=t,r.valueAsNumber),[Math.min(e,t),Math.max(e,t)]),l=e=>($(e)-z)/(P-z),x=e=>k(z+e*(P-z)),C=()=>{a.style.setProperty("--range-min",`${l(o[0])*100}%`),a.style.setProperty("--range-max",`${l(o[1])*100}%`)},d=e=>{a.dispatchEvent(new Event(e,{bubbles:!0}))},v=(e,t)=>{const[s,u]=o;o=b(e,t),C(),!(s===o[0]&&u===o[1])&&(d("input"),p=!0)};v(...T);const M=new Map([[c.min,(e,t)=>{const s=l(t[0]),u=l(t[1]),f=L(0,u,s+e);v(x(f),t[1])}],[c.max,(e,t)=>{const s=l(t[0]),u=l(t[1]),f=L(s,1,u+e);v(t[0],x(f))}],[c.range,(e,t)=>{const s=l(t[0]),f=l(t[1])-s,N=L(0,1-f,s+e);v(x(N),x(N+f))}]]),w=e=>e.touches?e.touches[0]:e;let n,D,F,V=!1;function I(e){if(!e.buttons&&!e.touches){R();return}V=!0;const t=c.zone.getBoundingClientRect().width;e.preventDefault(),M.get(F)((w(e).clientX-n)/t,D)}function R(e){document.removeEventListener("mousemove",I),document.removeEventListener("touchmove",I),document.removeEventListener("mouseup",R),document.removeEventListener("touchend",R),p&&d("change")}return a.ontouchstart=a.onmousedown=e=>{V=!1,p=!1,M.has(e.target)&&(document.addEventListener("mousemove",I,{passive:!1}),document.addEventListener("touchmove",I,{passive:!1}),document.addEventListener("mouseup",R),document.addEventListener("touchend",R),e.preventDefault(),e.stopPropagation(),F=e.target,n=w(e).clientX,D=o.slice())},c.track.onclick=e=>{if(V)return;p=!1;const t=c.zone.getBoundingClientRect(),s=L(0,1,(w(e).clientX-t.left)/t.width),u=x(s),[f,N]=o;if(u<f){const X=N-f;v(u,u+X)}else if(u>N){const X=N-f;v(u-X,u)}p&&d("change")},a}function G(i){if(!i||i>=1)return 0;const m=i.toString(),h=m.indexOf(".");return h===-1?0:m.length-h-1}function J(i=[],m={}){const[h=0,q=1]=i,T=m.step??.001,y=m.precision??G(T);let g=!1;const O=n=>{const[D,F]=n.range;return n.invert?`(-∞, ${D.toFixed(y)}] ∪ [${F.toFixed(y)}, ∞)`:`[${D.toFixed(y)}, ${F.toFixed(y)}]`},{label:E=null,value:S=[h,q],format:$=O,color:k,width:z=360,theme:P,transform:c=null,invert:_=null,invertible:L=!1,__ns__:r=j()}=m,a=`
#${r} {
  font: 13px/1.2 var(--sans-serif);
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  max-width: 100%;
  width: auto;
}
@media only screen and (min-width: 30em) {
  #${r} {
    flex-wrap: nowrap;
    width: ${A(z)};
  }
}
#${r} .label {
  width: 120px;
  padding: 5px 0 4px 0;
  margin-right: 6.5px;
  flex-shrink: 0;
}
#${r} .form {
  display: block;
  width: 100%;
}
#${r} .range-slider {
  width: 100%;
}
#${r} .range-footer {
  display: flex;
  align-items: center;
  margin-top: 2px;
  margin-bottom: 8px;
}
#${r} .range-output {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
#${r} .invert-label {
  display: flex;
  align-items: center;
  white-space: nowrap;
  margin-right: 1em;
  cursor: pointer;
}
#${r} .invert-label input {
  margin: 0 3px 0 0;
}
  `,o=H({min:h,max:q,value:[S[0],S[1]],step:T,color:k,width:"100%",theme:P,transform:c,invert:_}),p=document.createElement("output"),b=document.createElement("div");if(b.id=r,E!=null){const n=document.createElement("div");n.className="label",n.textContent=E,b.appendChild(n)}const l=document.createElement("div");l.className="form";const x=document.createElement("div");x.className="range",x.appendChild(o),l.appendChild(x);const C=document.createElement("div");C.className="range-footer";let d=null;if(L){const n=document.createElement("label");n.className="invert-label",d=document.createElement("input"),d.type="checkbox",n.appendChild(d),n.appendChild(document.createTextNode("Invert")),C.appendChild(n)}const v=document.createElement("div");v.className="range-output",v.appendChild(p),C.appendChild(v),l.appendChild(C),b.appendChild(l);const M=document.createElement("style");M.textContent=a,b.appendChild(M);const w=()=>{const n=$({range:[o.value[0],o.value[1]],invert:g});if(typeof n=="string")p.value=n;else{for(;p.lastChild;)p.lastChild.remove();p.appendChild(n)}};return o.oninput=w,d&&d.addEventListener("input",()=>{g=d.checked,o.classList.toggle("range-inverted",g),w(),b.dispatchEvent(new Event("input",{bubbles:!0}))}),w(),Object.defineProperty(b,"value",{get:()=>({range:o.value,invert:g}),set:n=>{o.value=n.range,g=!!n.invert,d&&(d.checked=g,o.classList.toggle("range-inverted",g)),w()}})}export{J as interval,H as rangeInput};
