import{d as m,_ as w}from"./index-ByB2dbry.js";m({root:document.getElementById("cell-530"),expanded:[],variables:[]},{id:530,body:async function(t,e){return t`<figure style="text-align: center;">
<img width="350" src="${await e(new URL("/notebooks/assets/compound-pendulum-diagram-1-nV_8qU.svg",import.meta.url).href).url()}" alt="Compound double pendulum diagram">
<figcaption>A compound double pendulum with mass distributed along the length of each arm.</figcaption>
</figure>`},inputs:["html","FileAttachment"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});m({root:document.getElementById("cell-526"),expanded:[],variables:[]},{id:526,body:t=>t("1392357775666159618"),inputs:["tweet"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-610"),expanded:[],variables:[]},{id:610,body:(t,e,a)=>{t==="half float"&&e(a`<p style="color:#a00">Warning! This simulation is using half-float precision and as a result won't be accurate. Try a device which supports the floating point WebGL textures for better results.</p>`)},inputs:["colorType","display","html"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-289"),expanded:[],variables:[]},{id:289,body:(t,e,a,i,n,o,u,d,c,h,_,s,r,l)=>{const f=t`<figure>
  ${e.element}
  <figcaption>Hover to view pendulum. Scroll to zoom, drag to pan.</figcaption>
</figure>`;return a(i(f,{width:Math.min(n,640),height:Math.min(n,640),toggleOffset:[-25,-42],controls:".pendulum-controls",onResize(g,y,v){e.resize(y,v),o.updateScales(e.elements.plot.scale("x"),e.elements.plot.scale("y"));const p=u(o.xDomain,o.yDomain,y,v);d.x[0]=p.x[0],d.x[1]=p.x[1],d.y[0]=p.y[0],d.y[1]=p.y[1],c(y,v),h.poll(),_[0].use(()=>s(()=>{r({...l,debugCheckerboard:!1})})),h.dirty=!0}})),{figure:f}},inputs:["html","stack","display","expandable","width","axes","computeTextureDomain","textureDomain","resizeFBOs","regl","y","blit","initialize","params"],outputs:["figure"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-914"),expanded:[],variables:[]},{id:914,body:(t,e,a,i)=>{const n=t`<div class="pendulum-controls"></div>`;function o(v){return n.appendChild(v),e.input(v)}const u=o(a.range([.1,1],{label:"Mass 1 (m₁)",value:1,step:.01,transform:Math.log})),d=o(a.range([.1,1],{label:"Mass 2 (m₂)",value:1,step:.01,transform:Math.log})),c=o(a.range([.1,1],{label:"Length 1 (l₁)",value:1,step:.01,transform:Math.log})),h=o(a.range([.1,1],{label:"Length 2 (l₂)",value:1,step:.01,transform:Math.log})),_=o(a.range([-2,2],{label:"Initial angular velocity of arm 1",value:0})),s=o(a.range([-2,2],{label:"Initial angular velocity of arm 2",value:0})),r=o(a.range([.001,.1],{label:"Time step",value:.03,transform:Math.log})),l=o(a.radio(["Simple","Compound"],{label:"Pendulum type",value:"Compound"})),f=o(a.checkbox(["Simulate","Show pendulum at point under mouse"],{value:["Simulate","Show pendulum at point under mouse"]})),g=o(a.button("Reset View")),y=o(a.button("Restart"));return i(n),{controlsContainer:n,ctrl:o,m1:u,m2:d,l1:c,l2:h,omega0_0:_,omega0_1:s,dt:r,pendulumType:l,simulate:f,resetView:g,restart:y}},inputs:["html","Generators","Inputs","display"],outputs:["controlsContainer","ctrl","m1","m2","l1","l2","omega0_0","omega0_1","dt","pendulumType","simulate","resetView","restart"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-915"),expanded:[],variables:[]},{id:915,body:()=>({params:{omega0_0:0,omega0_1:0,pendulumType:"Compound",m1:1,m2:1,l1:1,l2:1}}),inputs:[],outputs:["params"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-916"),expanded:[],variables:[]},{id:916,body:(t,e,a,i,n,o,u,d)=>{t.omega0_0=e,t.omega0_1=a,t.pendulumType=i,t.m1=n,t.m2=o,t.l1=u,t.l2=d},inputs:["params","omega0_0","omega0_1","pendulumType","m1","m2","l1","l2"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-919"),expanded:[],variables:[]},{id:919,body:t=>{function e(a,i,n=[-Math.PI,Math.PI],o=[-Math.PI,Math.PI]){return t.plot({width:a,height:i,marginTop:20,marginRight:20,marginLeft:50,marginBottom:40,style:{backgroundColor:"transparent",maxWidth:"none",position:"absolute"},x:{domain:n,tickSpacing:80,label:"θ₁",labelAnchor:"center"},y:{domain:o,tickSpacing:80,label:"θ₂",labelAnchor:"center"},marks:[]})}return{createPlot:e}},inputs:["Plot"],outputs:["createPlot"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-920"),expanded:[],variables:[]},{id:920,body:(t,e,a,i,n)=>({stack:t({layers:[{id:"regl",element:e(a,{optionalExtensions:["OES_texture_half_float","OES_texture_float","OES_texture_float_linear","OES_texture_half_float_linear","ANGLE_instanced_arrays"],attributes:{antialias:!0,depthStencil:!1,preserveDrawingBuffer:!0}})},{id:"plot",element:({width:u,height:d})=>i(u,d)},{id:"svg",element:({current:u,width:d,height:c})=>(u?n.select(u):n.create("svg")).attr("width",d).attr("height",c).style("position","absolute").node()}]})}),inputs:["createElementStack","reglElement","createREGL","createPlot","d3"],outputs:["stack"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-5"),expanded:[],variables:[]},{id:5,body:t=>({regl:t.elements.regl.value}),inputs:["stack"],outputs:["regl"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-921"),expanded:[],variables:[]},{id:921,body:(t,e,a,i,n,o,u,d,c,h,_)=>{let s=null;const r={x:[-Math.PI,Math.PI],y:[-Math.PI,Math.PI]},l={top:20,right:10,bottom:40,left:50};function f(p,b,x,E){const I=x-l.left-l.right,C=E-l.top-l.bottom,P=(p[1]-p[0])/I,T=(b[1]-b[0])/C;return{x:[p[0]-l.left*P,p[1]+l.right*P],y:[b[0]-l.bottom*T,b[1]+l.top*T]}}function g(){const p=f(v.xDomain,v.yDomain,t.width,t.height);e.x[0]=p.x[0],e.x[1]=p.x[1],e.y[0]=p.y[0],e.y[1]=p.y[1],a(t.width,t.height),i.poll(),n[0].use(()=>o(()=>{u({...d,debugCheckerboard:!1})})),i.dirty=!0}function y(){const p=f(r.x,r.y,t.width,t.height);e.x[0]=p.x[0],e.x[1]=p.x[1],e.y[0]=p.y[0],e.y[1]=p.y[1],v.reset()}const v=c({d3:h,element:t.elements.svg,xScale:t.elements.plot.scale("x"),yScale:t.elements.plot.scale("y"),aspectRatio:1,scaleExtent:[.1,1e3],onChange:({xDomain:p,yDomain:b})=>{i.dirty=!0;const x=_(t.width,t.height,p,b);t.elements.plot.replaceWith(x),t.elements.plot=x,t.dispatchEvent(new CustomEvent("update")),clearTimeout(s),s=setTimeout(g,300)}});return{reinitTimeout:s,baselineDomain:r,margins:l,computeTextureDomain:f,reinitialize:g,resetToBaseline:y,axes:v}},inputs:["stack","textureDomain","resizeFBOs","regl","y","blit","initialize","params","createZoomableAxes","d3","createPlot"],outputs:["reinitTimeout","baselineDomain","margins","computeTextureDomain","reinitialize","resetToBaseline","axes"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-922"),expanded:[],variables:[]},{id:922,body:(t,e)=>{t>0&&e()},inputs:["resetView","resetToBaseline"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-158"),expanded:[],variables:[]},{id:158,body:(t,e,a,i,n,o,u,d,c,h,_,s,r,l,f,g,y,v)=>{const p=c(h.xDomain,h.yDomain,_.width,_.height);return s.x[0]=p.x[0],s.x[1]=p.x[1],s.y[0]=p.y[0],s.y[1]=p.y[1],r(_.width,_.height),l.poll(),f[0].use(()=>g(()=>{y({...v,debugCheckerboard:!1})})),{extended:p,initialized:!0}},inputs:["restart","pendulumType","omega0_0","omega0_1","m1","m2","l1","l2","computeTextureDomain","axes","stack","textureDomain","resizeFBOs","regl","y","blit","initialize","params"],outputs:["extended","initialized"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-54"),expanded:[],variables:[]},{id:54,body:(t,e,a,i,n,o,u,d,c,h,_,s,r,l,f,g,y)=>{const p=~u.indexOf("Simulate"),b=~u.indexOf("Show pendulum at point under mouse"),x=d==="Compound";c.dirty=!0;const E=c.frame(()=>{h(()=>{(c.dirty||p)&&c.clear({color:[0,0,0,0]}),p&&_([{dt:s,src:r[0],dst:r[1],isCompound:x,m1:a,m2:i,l1:n,l2:o},{dt:s,src:r[1],dst:r[0],isCompound:x,m1:a,m2:i,l1:n,l2:o}]),(c.dirty||p)&&(l(),b&&f.active&&g({state:r[0],l1:n,l2:o,isCompound:x}),c.dirty=!1)})});return y.then(()=>E.cancel()),{DEBUG_CHECKERBOARD:!1,run:p,showPen:b,isCompound:x,frame:E}},inputs:["initialized","restart","m1","m2","l1","l2","simulate","pendulumType","regl","blit","update","dt","y","drawMap","mouseHover","drawPendulum","invalidation"],outputs:["DEBUG_CHECKERBOARD","run","showPen","isCompound","frame"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-78"),expanded:[],variables:[]},{id:78,body:(t,e)=>({colorType:t(e,"float")?"float":t(e,"half float")?"half float":"uint8"}),inputs:["canWriteToFBOOfType","regl"],outputs:["colorType"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-923"),expanded:[],variables:[]},{id:923,body:()=>({textureDomain:{x:[-Math.PI,Math.PI],y:[-Math.PI,Math.PI]}}),inputs:[],outputs:["textureDomain"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-58"),expanded:[],variables:[]},{id:58,body:(t,e,a,i,n)=>{const o=Math.round(t.width*e),u=Math.round(t.height*e),d=a==="float"&&i.hasExtension("OES_texture_float_linear")||a==="half float"&&i.hasExtension("OES_texture_half_float_linear")||a==="uint8",c="nearest",h=function(){const s=[0,1].map(()=>i.framebuffer({color:i.texture({width:o,height:u,type:a,wrap:"clamp",min:c,mag:c}),depth:!1,stencil:!1}));return n.then(()=>s.forEach(r=>r.destroy())),s}();function _(s,r){const l=Math.round(s*e),f=Math.round(r*e);(h[0].width!==l||h[0].height!==f)&&(h[0].resize(l,f),h[1].resize(l,f))}return{initialWidth:o,initialHeight:u,supportsLinearFilter:d,filterMode:c,y:h,resizeFBOs:_}},inputs:["stack","pixelRatio","colorType","regl","invalidation"],outputs:["initialWidth","initialHeight","supportsLinearFilter","filterMode","y","resizeFBOs"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-113"),expanded:[],variables:[]},{id:113,body:t=>({blit:t({vert:`
    precision mediump float;
    attribute vec2 xy;
    void main () {
      gl_Position = vec4(xy, 0, 1);
    }`,attributes:{xy:[-4,-4,4,-4,0,4]},uniforms:{resolution:a=>[a.framebufferWidth,a.framebufferHeight]},count:3,depth:{enable:!1}})}),inputs:["regl"],outputs:["blit"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-151"),expanded:[],variables:[]},{id:151,body:(t,e)=>({initialize:t({frag:`
    precision highp float;
    uniform vec2 resolution, omega0;
    uniform vec4 texDomain; // xMin, xMax, yMin, yMax - the domain this texture represents
    uniform bool isCompound;
    uniform float m1, m2, l1, l2;
    uniform bool debugCheckerboard;
    #define PI ${Math.PI}
    void main () {
      // DEBUG: Output checkerboard pattern to verify texture sizing
      // Each checker is 8x8 texture pixels - should appear as perfect squares if 1:1
      if (debugCheckerboard) {
        float checker = mod(floor(gl_FragCoord.x / 8.0) + floor(gl_FragCoord.y / 8.0), 2.0);
        gl_FragColor = vec4(vec3(checker), 1.0);
        return;
      }

      // UV position in texture [0, 1]
      vec2 uv = gl_FragCoord.xy / resolution;

      // Map UV to world coordinates (theta values) based on textureDomain
      vec2 theta = vec2(
        mix(texDomain.x, texDomain.y, uv.x),
        mix(texDomain.z, texDomain.w, uv.y)
      );

      vec2 velocity;
      if (isCompound) {
        // Convert angular velocities to generalized momenta for compound pendulum
        // Mass matrix from Lagrangian: p = M*theta_dot
        float cosTheta12 = cos(theta.x - theta.y);
        float m11 = ((m1 / 3.0) + m2) * l1 * l1;
        float m22 = (m2 / 3.0) * l2 * l2;
        float m12 = 0.5 * m2 * l1 * l2 * cosTheta12;
        velocity = vec2(
          m11 * omega0.x + m12 * omega0.y,
          m12 * omega0.x + m22 * omega0.y
        );
      } else {
        // For simple pendulum, also use generalized momenta
        // Mass matrix: p = M*theta_dot
        float cosTheta12 = cos(theta.x - theta.y);
        float m11 = (m1 + m2) * l1 * l1;
        float m22 = m2 * l2 * l2;
        float m12 = m2 * l1 * l2 * cosTheta12;
        velocity = vec2(
          m11 * omega0.x + m12 * omega0.y,
          m12 * omega0.x + m22 * omega0.y
        );
      }

      // Store normalized: map [-PI, PI] to [0, 1]
      gl_FragColor = (vec4(theta, velocity) + PI) / (2.0 * PI);
    }`,uniforms:{resolution:i=>[i.framebufferWidth,i.framebufferHeight],omega0:(i,n)=>[n.omega0_0,n.omega0_1],texDomain:()=>[e.x[0],e.x[1],e.y[0],e.y[1]],isCompound:(i,n)=>n.pendulumType==="Compound",debugCheckerboard:t.prop("debugCheckerboard"),m1:t.prop("m1"),m2:t.prop("m2"),l1:t.prop("l1"),l2:t.prop("l2")}})}),inputs:["regl","textureDomain"],outputs:["initialize"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-176"),expanded:[],variables:[]},{id:176,body:t=>({update:t({frag:`
    precision highp float;
    uniform sampler2D y;
    uniform vec2 resolution;
    uniform float dt;
    uniform bool isCompound;
    uniform float m1, m2, l1, l2;
    #define PI ${Math.PI}
    #define g 1.0

    // Compound double pendulum (distributed mass)
    // State: (θ₁, θ₂, p_θ₁, p_θ₂) where p_θ are generalized momenta
    vec4 derivativeCompound (vec4 state) {
      vec2 theta = state.xy;
      vec2 pTheta = state.zw;
      float cosTheta12 = cos(theta.x - theta.y);

      // Mass matrix from Lagrangian formulation
      float m11 = ((m1 / 3.0) + m2) * l1 * l1;
      float m22 = (m2 / 3.0) * l2 * l2;
      float m12 = 0.5 * m2 * l1 * l2 * cosTheta12;

      // Invert mass matrix to get θ̇ from p (where p = M*θ̇)
      float det = m11 * m22 - m12 * m12;
      vec2 thetaDot = vec2(
        (m22 * pTheta.x - m12 * pTheta.y) / det,
        (m11 * pTheta.y - m12 * pTheta.x) / det
      );

      float thetaDot12sinTheta12 = thetaDot.x * thetaDot.y * sin(theta.x - theta.y);
      vec2 pThetaDot = vec2(
        -0.5 * m2 * l1 * l2 * thetaDot12sinTheta12 - 0.5 * (m1 + 2.0 * m2) * g * l1 * sin(theta.x),
         0.5 * m2 * l1 * l2 * thetaDot12sinTheta12 - 0.5 * m2 * g * l2 * sin(theta.y)
      );
      return vec4(thetaDot, pThetaDot);
    }

    // Simple double pendulum (point masses)
    // State: (θ₁, θ₂, p_θ₁, p_θ₂) where p_θ are generalized momenta
    vec4 derivativeSimple (vec4 state) {
      vec2 theta = state.xy;
      vec2 pTheta = state.zw;
      float cosTheta12 = cos(theta.x - theta.y);

      // Mass matrix for simple pendulum
      float m11 = (m1 + m2) * l1 * l1;
      float m22 = m2 * l2 * l2;
      float m12 = m2 * l1 * l2 * cosTheta12;

      // Invert mass matrix to get θ̇ from p
      float det = m11 * m22 - m12 * m12;
      vec2 thetaDot = vec2(
        (m22 * pTheta.x - m12 * pTheta.y) / det,
        (m11 * pTheta.y - m12 * pTheta.x) / det
      );

      // Momentum time derivatives
      float thetaDot12sinTheta12 = thetaDot.x * thetaDot.y * sin(theta.x - theta.y);
      vec2 pThetaDot = vec2(
        -m2 * l1 * l2 * thetaDot12sinTheta12 - (m1 + m2) * g * l1 * sin(theta.x),
         m2 * l1 * l2 * thetaDot12sinTheta12 - m2 * g * l2 * sin(theta.y)
      );

      return vec4(thetaDot, pThetaDot);
    }

    vec4 derivative (vec4 state) {
      if (isCompound) {
        return derivativeCompound(state);
      } else {
        return derivativeSimple(state);
      }
    }

    void main () {
      // Read the state (theta1, theta2, velocity1, velocity2) from the rgba texture
      vec4 yn = texture2D(y, gl_FragCoord.xy / resolution);

      // Convert from [0, 1] to [-PI, PI]:
      yn = yn * (2.0 * PI) - PI;

      // RK4 integration
      vec4 k1 = dt * derivative(yn);
      vec4 k2 = dt * derivative(yn + 0.5 * k1);
      vec4 k3 = dt * derivative(yn + 0.5 * k2);
      vec4 k4 = dt * derivative(yn + k3);
      yn += (k1 + k4 + 2.0 * (k2 + k3)) / 6.0;

      // Convert back from [-PI, PI] to [0, 1]:
      yn = (yn + PI) / (2.0 * PI);

      // Loop angles if they exceed the range
      yn.xy = fract(yn.xy);

      // Output the state to the four color channels
      gl_FragColor = yn;
    }`,framebuffer:t.prop("dst"),uniforms:{y:t.prop("src"),resolution:a=>[a.framebufferWidth,a.framebufferHeight],dt:t.prop("dt"),isCompound:t.prop("isCompound"),m1:t.prop("m1"),m2:t.prop("m2"),l1:t.prop("l1"),l2:t.prop("l2")}})}),inputs:["regl"],outputs:["update"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-95"),expanded:[],variables:[]},{id:95,body:(t,e,a,i,n)=>({drawMap:t({frag:`
    precision highp float;
    uniform sampler2D colorscale, y;
    uniform vec4 axesViewport; // x, y, width, height in pixels
    uniform vec4 viewDomain;   // current view: xMin, xMax, yMin, yMax
    uniform vec4 texDomain;    // texture domain: xMin, xMax, yMin, yMax
    uniform bool debugPassthrough;
    #define PI ${Math.PI}
    #define TWOPI ${2*Math.PI}

    vec3 colormap(vec2 uv) {
      uv *= TWOPI;
      return pow(0.5 + 0.5 * vec3(sin(uv.x) * vec2(-cos(uv.y), sin(uv.y)), -cos(uv.x)), vec3(0.75));
    }

    void main () {
      // Map from viewport pixel to normalized position [0,1] within viewport
      vec2 viewportUV = (gl_FragCoord.xy - axesViewport.xy) / axesViewport.zw;

      // Ephemeral transform: map viewportUV to textureUV
      // textureUV = offset + viewportUV * scale
      vec2 viewSize = vec2(viewDomain.y - viewDomain.x, viewDomain.w - viewDomain.z);
      vec2 texSize = vec2(texDomain.y - texDomain.x, texDomain.w - texDomain.z);
      vec2 scale = viewSize / texSize;
      vec2 offset = vec2(viewDomain.x - texDomain.x, viewDomain.z - texDomain.z) / texSize;
      vec2 uv = offset + viewportUV * scale;

      // Check if UV is outside texture bounds - show solid color
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); // Transparent for out of bounds (page background shows through)
        return;
      }

      // Sample the state at this pixel
      vec4 state = texture2D(y, uv);

      // DEBUG: Pass through raw texture value for checkerboard testing
      if (debugPassthrough) {
        gl_FragColor = vec4(state.rgb, 1.0);
        return;
      }

      // Color it by the projection of the 4D state to 2D (theta1, theta2):
      gl_FragColor = vec4(colormap(state.xy), 1);
    }`,uniforms:{y:()=>e[0],axesViewport:u=>{const d=a(i)(u);return[d.x,d.y,d.width,d.height]},viewDomain:()=>[i.xDomain[0],i.xDomain[1],i.yDomain[0],i.yDomain[1]],texDomain:()=>[n.x[0],n.x[1],n.y[0],n.y[1]],debugPassthrough:!1},scissor:{enable:!0,box:a(i)},viewport:a(i)})}),inputs:["regl","y","reglAxesViewport","axes","textureDomain"],outputs:["drawMap"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-886"),expanded:[],variables:[]},{id:886,body:(t,e,a,i,n)=>{const o=t(e,{vert:`
    precision highp float;

    #pragma lines: attribute float index;
    #pragma lines: position = getPosition(index);
    #pragma lines: width = getWidth();

    uniform sampler2D state;
    uniform vec2 hover;
    uniform float l1, l2, width;

    #define PI ${Math.PI}

    vec4 getPosition(float idx) {
      // Sample state from texture
      vec2 theta = texture2D(state, hover).xy * (2.0 * PI) - PI;

      // Compute pendulum positions
      vec2 v1 = l1 * vec2(sin(theta.x), -cos(theta.x));
      vec2 v2 = l2 * vec2(sin(theta.y), -cos(theta.y));

      vec2 p0 = vec2(0);
      vec2 p1 = v1;
      vec2 p2 = p1 + v2;

      // Select position based on index
      vec2 pos = idx < 0.5 ? p0 : (idx < 1.5 ? p1 : p2);

      // Scale to fit in clip space
      return vec4(pos * 0.45, 0, 1);
    }

    float getWidth() { return width; }
  `,frag:`
    precision lowp float;
    uniform vec3 color;
    void main () {
      gl_FragColor = vec4(color, 1);
    }
  `,uniforms:{state:e.prop("state"),hover:()=>a.pt,l1:e.prop("l1"),l2:e.prop("l2"),width:(s,r)=>s.pixelRatio*r.width,color:e.prop("color")},depth:{enable:!1},scissor:{enable:!0,box:i(n)},viewport:s=>{const r=i(n)(s),l=Math.min(r.width,r.height);return{x:r.x+(r.width-l)/2,y:r.y+(r.height-l)/2,width:l,height:l}}}),u=e({vert:`
    precision highp float;
    attribute float pointIndex;
    uniform sampler2D state;
    uniform vec2 hover;
    uniform float l1, l2, pointSize;
    varying float vPointSize;

    #define PI ${Math.PI}

    void main() {
      vec2 theta = texture2D(state, hover).xy * (2.0 * PI) - PI;

      vec2 v1 = l1 * vec2(sin(theta.x), -cos(theta.x));
      vec2 v2 = l2 * vec2(sin(theta.y), -cos(theta.y));

      vec2 p0 = vec2(0);
      vec2 p1 = v1;
      vec2 p2 = p1 + v2;

      vec2 pos = pointIndex < 0.5 ? p0 : (pointIndex < 1.5 ? p1 : p2);

      gl_Position = vec4(pos * 0.45, 0, 1);
      gl_PointSize = pointSize;
      vPointSize = pointSize;
    }
  `,frag:`
    precision highp float;
    uniform vec3 fillColor;
    uniform vec3 strokeColor;
    uniform float strokeWidthPx;
    varying float vPointSize;

    void main() {
      // Distance from center in pixels
      float distPx = length(gl_PointCoord - 0.5) * vPointSize;
      float radius = vPointSize * 0.5;

      // Smooth edges with 1px anti-aliasing
      float outerEdge = smoothstep(radius, radius - 1.0, distPx);
      float innerEdge = smoothstep(radius - strokeWidthPx, radius - strokeWidthPx - 1.0, distPx);

      // Blend stroke (outside) and fill (inside)
      vec3 color = mix(strokeColor, fillColor, innerEdge);
      gl_FragColor = vec4(color, outerEdge);
    }
  `,attributes:{pointIndex:[0,1,2]},uniforms:{state:e.prop("state"),hover:()=>a.pt,l1:e.prop("l1"),l2:e.prop("l2"),pointSize:(s,r)=>s.pixelRatio*r.pointSize,fillColor:e.prop("fillColor"),strokeColor:e.prop("strokeColor"),strokeWidthPx:(s,r)=>s.pixelRatio*r.strokeWidthPx},primitive:"points",count:3,depth:{enable:!1},blend:{enable:!0,func:{srcRGB:"src alpha",srcAlpha:1,dstRGB:"one minus src alpha",dstAlpha:1},equation:{rgb:"add",alpha:"add"},color:[0,0,0,0]},scissor:{enable:!0,box:i(n)},viewport:s=>{const r=i(n)(s),l=Math.min(r.width,r.height);return{x:r.x+(r.width-l)/2,y:r.y+(r.height-l)/2,width:l,height:l}}}),d=e.buffer([0,1,2]),c=e.buffer([[0,1,2],[2,1,0]]),h={join:"round",cap:"round",vertexCount:3,vertexAttributes:{index:d},endpointCount:2,endpointAttributes:{index:c}};function _(s){const{state:r,l1:l,l2:f,isCompound:g}=s;g?(o({...h,state:r,l1:l,l2:f,width:14,color:[.75,.22,.17]}),u({state:r,l1:l,l2:f,pointSize:12,fillColor:[.4,.4,.4],strokeColor:[.25,.25,.25],strokeWidthPx:1.5})):(o({...h,state:r,l1:l,l2:f,width:3,color:[.35,.35,.35]}),u({state:r,l1:l,l2:f,pointSize:18,fillColor:[.91,.3,.24],strokeColor:[.6,.15,.1],strokeWidthPx:1.5}))}return{drawPendulumLine:o,drawPendulumPoints:u,lineVertexBuffer:d,lineEndpointBuffer:c,lineData:h,drawPendulum:_}},inputs:["reglLines","regl","mouseHover","reglAxesViewport","axes"],outputs:["drawPendulumLine","drawPendulumPoints","lineVertexBuffer","lineEndpointBuffer","lineData","drawPendulum"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-889"),expanded:[],variables:[]},{id:889,body:(t,e,a,i)=>{const n={pt:[0,0],active:!1,dragging:!1},o=t.elements.svg;function u(s){const r=o.getBoundingClientRect(),l=(s.clientX-r.left)/r.width,f=1-(s.clientY-r.top)/r.height;n.pt[0]=l,n.pt[1]=f,e.dirty=!0}function d(){n.active=!0,e.dirty=!0}function c(){n.active=!1,e.dirty=!0}function h(){n.dragging=!0,o.classList.remove("crosshair-cursor")}function _(){n.dragging=!1,a.includes("Show pendulum at point under mouse")&&o.classList.add("crosshair-cursor")}return o.addEventListener("pointermove",u,!1),o.addEventListener("pointerenter",d,!1),o.addEventListener("pointerleave",c,!1),o.addEventListener("pointerdown",h,!1),window.addEventListener("pointerup",_,!1),i.then(()=>{o.removeEventListener("pointermove",u),o.removeEventListener("pointerenter",d),o.removeEventListener("pointerleave",c),o.removeEventListener("pointerdown",h),window.removeEventListener("pointerup",_)}),{mouseHover:n,canvas:o,onPointerMove:u,onPointerEnter:d,onPointerLeave:c,onPointerDown:h,onPointerUp:_}},inputs:["stack","regl","simulate","invalidation"],outputs:["mouseHover","canvas","onPointerMove","onPointerEnter","onPointerLeave","onPointerDown","onPointerUp"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-925"),expanded:[],variables:[]},{id:925,body:(t,e)=>{const a=t.elements.svg;return e.includes("Show pendulum at point under mouse")?a.classList.add("crosshair-cursor"):a.classList.remove("crosshair-cursor"),{svgEl:a}},inputs:["stack","simulate"],outputs:["svgEl"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-901"),expanded:[],variables:[]},{id:901,body:async()=>(await w(()=>import("./twttr-CwAUCjW_.js"),[]),{twttr:window.twttr}),inputs:[],outputs:["twttr"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-903"),expanded:[],variables:[]},{id:903,body:t=>{function e(a,i){const n=document.createElement("DIV");return Promise.resolve().then(()=>t.widgets.createTweet(a,n,i)),n}return{tweet:e}},inputs:["twttr"],outputs:["tweet"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-49"),expanded:[],variables:[]},{id:49,body:()=>({pixelRatio:window.devicePixelRatio}),inputs:[],outputs:["pixelRatio"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-890"),expanded:[],variables:[]},{id:890,body:async()=>{const[{default:t},{default:e},{createElementStack:a},{reglElement:i,reglAxesViewport:n},{createZoomableAxes:o},{expandable:u}]=await Promise.all([w(()=>import("https://cdn.jsdelivr.net/npm/regl@2.1.1/+esm"),[]).then(d=>{if(!("default"in d))throw new SyntaxError("export 'default' not found");return d}),w(()=>import("https://cdn.jsdelivr.net/npm/regl-gpu-lines@2.4.1/+esm"),[]).then(d=>{if(!("default"in d))throw new SyntaxError("export 'default' not found");return d}),w(()=>import("./element-stack-BU40TvN2.js"),[]).then(d=>{if(!("createElementStack"in d))throw new SyntaxError("export 'createElementStack' not found");return d}),w(()=>import("./regl-canvas-4j8SAjSv.js"),[]).then(d=>{if(!("reglElement"in d))throw new SyntaxError("export 'reglElement' not found");if(!("reglAxesViewport"in d))throw new SyntaxError("export 'reglAxesViewport' not found");return d}),w(()=>import("./zoomable-axes-BfGyq1bg.js"),[]).then(d=>{if(!("createZoomableAxes"in d))throw new SyntaxError("export 'createZoomableAxes' not found");return d}),w(()=>import("./expandable-GAgQDSaE.js"),[]).then(d=>{if(!("expandable"in d))throw new SyntaxError("export 'expandable' not found");return d})]);return{createREGL:t,reglLines:e,createElementStack:a,reglElement:i,reglAxesViewport:n,createZoomableAxes:o,expandable:u}},inputs:[],outputs:["createREGL","reglLines","createElementStack","reglElement","reglAxesViewport","createZoomableAxes","expandable"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-485"),expanded:[],variables:[]},{id:485,body:async(t,e)=>{const{canWriteToFBOOfType:a}=await w(()=>import("https://api.observablehq.com/@rreusser/regl-tools.js?v=4"),[]).then(i=>{const n={},o=t.module(i.default),u=t.module();if(!o.defines("canWriteToFBOOfType"))throw new SyntaxError("export 'canWriteToFBOOfType' not found");return u.variable(n.canWriteToFBOOfType=e()).import("canWriteToFBOOfType",o),n});return{canWriteToFBOOfType:a}},inputs:["__ojs_runtime","__ojs_observer"],outputs:["canWriteToFBOOfType"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-635"),expanded:[],variables:[]},{id:635,body:async(t,e)=>{const{rangeSlider:a}=await w(()=>import("https://api.observablehq.com/@mootari/range-slider.js?v=4"),[]).then(i=>{const n={},o=t.module(i.default),u=t.module();if(!o.defines("rangeSlider"))throw new SyntaxError("export 'rangeSlider' not found");return u.variable(n.rangeSlider=e()).import("rangeSlider",o),n});return{rangeSlider:a}},inputs:["__ojs_runtime","__ojs_observer"],outputs:["rangeSlider"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-791"),expanded:[],variables:[]},{id:791,body:()=>{function t(e,a,i){return e+i*(a-e)}return{lerp:t}},inputs:[],outputs:["lerp"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});m({root:document.getElementById("cell-908"),expanded:[],variables:[]},{id:908,body:async function(t,e){return t`<figure style="text-align: center;">
<img width="350" src="${await e(new URL("/notebooks/assets/simple-pendulum-diagram-D0VLgnsg.svg",import.meta.url).href).url()}" alt="Simple double pendulum diagram">
</figure>`},inputs:["html","FileAttachment"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});m({root:document.getElementById("cell-909"),expanded:[],variables:[]},{id:909,body:(t,e)=>t`Consider a double pendulum with point masses ${e`m_1`} and ${e`m_2`} at distances ${e`l_1`} and ${e`l_2`} from their respective pivots, with angles ${e`\theta_1`} and ${e`\theta_2`} measured from vertical (downward).

#### Coordinates

The position of mass 1:

${e.block`\begin{aligned}
x_1 &= l_1 \sin \theta_1 \\
y_1 &= -l_1 \cos \theta_1
\end{aligned}`}

The position of mass 2:

${e.block`\begin{aligned}
x_2 &= l_1 \sin \theta_1 + l_2 \sin \theta_2 \\
y_2 &= -l_1 \cos \theta_1 - l_2 \cos \theta_2
\end{aligned}`}

#### Kinetic Energy

Taking time derivatives:

${e.block`\begin{aligned}
\dot{x}_1 &= l_1 \dot{\theta}_1 \cos \theta_1 \\
\dot{y}_1 &= l_1 \dot{\theta}_1 \sin \theta_1 \\
\dot{x}_2 &= l_1 \dot{\theta}_1 \cos \theta_1 + l_2 \dot{\theta}_2 \cos \theta_2 \\
\dot{y}_2 &= l_1 \dot{\theta}_1 \sin \theta_1 + l_2 \dot{\theta}_2 \sin \theta_2
\end{aligned}`}

The kinetic energy is:

${e.block`\begin{aligned}
T &= \frac{1}{2} m_1 (\dot{x}_1^2 + \dot{y}_1^2) + \frac{1}{2} m_2 (\dot{x}_2^2 + \dot{y}_2^2) \\
&= \frac{1}{2} m_1 l_1^2 \dot{\theta}_1^2 + \frac{1}{2} m_2 \left[ l_1^2 \dot{\theta}_1^2 + l_2^2 \dot{\theta}_2^2 + 2 l_1 l_2 \dot{\theta}_1 \dot{\theta}_2 \cos(\theta_1 - \theta_2) \right]
\end{aligned}`}

#### Potential Energy

${e.block`V = -m_1 g l_1 \cos \theta_1 - m_2 g (l_1 \cos \theta_1 + l_2 \cos \theta_2)`}

#### Lagrangian

${e.block`L = T - V`}

#### Euler-Lagrange Equations

The Euler-Lagrange equations ${e`\frac{d}{dt}\frac{\partial L}{\partial \dot{\theta}_i} - \frac{\partial L}{\partial \theta_i} = 0`} yield (after simplification):

${e.block`\begin{aligned}
(m_1 + m_2) l_1^2 \ddot{\theta}_1 + m_2 l_1 l_2 \ddot{\theta}_2 \cos(\theta_1 - \theta_2) &= -m_2 l_1 l_2 \dot{\theta}_2^2 \sin(\theta_1 - \theta_2) - (m_1 + m_2) g l_1 \sin \theta_1 \\
m_2 l_2^2 \ddot{\theta}_2 + m_2 l_1 l_2 \ddot{\theta}_1 \cos(\theta_1 - \theta_2) &= m_2 l_1 l_2 \dot{\theta}_1^2 \sin(\theta_1 - \theta_2) - m_2 g l_2 \sin \theta_2
\end{aligned}`}

#### Generalized Momenta

The generalized momenta are:

${e.block`\begin{aligned}
p_{\theta_1} &= \frac{\partial L}{\partial \dot{\theta}_1} = (m_1 + m_2) l_1^2 \dot{\theta}_1 + m_2 l_1 l_2 \dot{\theta}_2 \cos(\theta_1 - \theta_2) \\
p_{\theta_2} &= \frac{\partial L}{\partial \dot{\theta}_2} = m_2 l_2^2 \dot{\theta}_2 + m_2 l_1 l_2 \dot{\theta}_1 \cos(\theta_1 - \theta_2)
\end{aligned}`}

In matrix form ${e`\mathbf{p} = M(\theta) \dot{\boldsymbol{\theta}}`} where:

${e.block`M = \begin{pmatrix}
(m_1 + m_2) l_1^2 & m_2 l_1 l_2 \cos(\theta_1 - \theta_2) \\
m_2 l_1 l_2 \cos(\theta_1 - \theta_2) & m_2 l_2^2
\end{pmatrix}`}

Inverting to get ${e`\dot{\boldsymbol{\theta}} = M^{-1} \mathbf{p}`} and computing ${e`\dot{\mathbf{p}} = \frac{\partial L}{\partial \boldsymbol{\theta}}`}:

${e.block`\begin{aligned}
\dot{p}_{\theta_1} &= -m_2 l_1 l_2 \dot{\theta}_1 \dot{\theta}_2 \sin(\theta_1 - \theta_2) - (m_1 + m_2) g l_1 \sin\theta_1 \\
\dot{p}_{\theta_2} &= m_2 l_1 l_2 \dot{\theta}_1 \dot{\theta}_2 \sin(\theta_1 - \theta_2) - m_2 g l_2 \sin\theta_2
\end{aligned}`}

As a first-order system with state ${e`\mathbf{y} = (\theta_1, \theta_2, p_{\theta_1}, p_{\theta_2})^T`}:

${e.block`\frac{d\mathbf{y}}{dt} = \begin{pmatrix}
\dot{\theta}_1(\theta_1, \theta_2, p_{\theta_1}, p_{\theta_2}) \\
\dot{\theta}_2(\theta_1, \theta_2, p_{\theta_1}, p_{\theta_2}) \\
\dot{p}_{\theta_1}(\theta_1, \theta_2, p_{\theta_1}, p_{\theta_2}) \\
\dot{p}_{\theta_2}(\theta_1, \theta_2, p_{\theta_1}, p_{\theta_2})
\end{pmatrix}`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});m({root:document.getElementById("cell-911"),expanded:[],variables:[]},{id:911,body:async function(t,e){return t`<figure style="text-align: center;">
<img width="350" src="${await e(new URL("/notebooks/assets/compound-pendulum-diagram-1-nV_8qU.svg",import.meta.url).href).url()}" alt="Compound double pendulum diagram">
</figure>`},inputs:["html","FileAttachment"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});m({root:document.getElementById("cell-912"),expanded:[],variables:[]},{id:912,body:(t,e)=>t`For a compound pendulum, the mass is distributed along each arm. Consider uniform rods of lengths ${e`l_1`} and ${e`l_2`} with masses ${e`m_1`} and ${e`m_2`}, and moments of inertia ${e`I_1 = \frac{1}{3}m_1 l_1^2`} and ${e`I_2 = \frac{1}{3}m_2 l_2^2`} about their pivot points.

#### Center of Mass Positions

The centers of mass are located at the midpoints:

${e.block`\begin{aligned}
x_{c1} &= \frac{l_1}{2} \sin \theta_1, \quad y_{c1} = -\frac{l_1}{2} \cos \theta_1 \\
x_{c2} &= l_1 \sin \theta_1 + \frac{l_2}{2} \sin \theta_2, \quad y_{c2} = -l_1 \cos \theta_1 - \frac{l_2}{2} \cos \theta_2
\end{aligned}`}

#### Kinetic Energy

The kinetic energy includes both translational and rotational components:

${e.block`T = \frac{1}{2} I_1 \dot{\theta}_1^2 + \frac{1}{2} m_1 (\dot{x}_{c1}^2 + \dot{y}_{c1}^2) + \frac{1}{2} I_2 \dot{\theta}_2^2 + \frac{1}{2} m_2 (\dot{x}_{c2}^2 + \dot{y}_{c2}^2)`}

For a uniform rod rotating about its end, ${e`I_1 = \frac{1}{3}m_1 l_1^2`} and ${e`I_2 = \frac{1}{3}m_2 l_2^2`}. The translational kinetic energies are:

${e.block`\begin{aligned}
\frac{1}{2} m_1 (\dot{x}_{c1}^2 + \dot{y}_{c1}^2) &= \frac{1}{2} m_1 \frac{l_1^2}{4} \dot{\theta}_1^2 \\
\frac{1}{2} m_2 (\dot{x}_{c2}^2 + \dot{y}_{c2}^2) &= \frac{1}{2} m_2 \left[ l_1^2 \dot{\theta}_1^2 + \frac{l_2^2}{4} \dot{\theta}_2^2 + l_1 l_2 \dot{\theta}_1 \dot{\theta}_2 \cos(\theta_1 - \theta_2) \right]
\end{aligned}`}

Thus:

${e.block`T = \frac{1}{6} m_1 l_1^2 \dot{\theta}_1^2 + \frac{1}{2} m_2 l_1^2 \dot{\theta}_1^2 + \frac{1}{6} m_2 l_2^2 \dot{\theta}_2^2 + \frac{1}{2} m_2 l_1 l_2 \dot{\theta}_1 \dot{\theta}_2 \cos(\theta_1 - \theta_2)`}

#### Potential Energy

${e.block`V = -m_1 g \frac{l_1}{2} \cos \theta_1 - m_2 g \left( l_1 \cos \theta_1 + \frac{l_2}{2} \cos \theta_2 \right)`}

#### Generalized Momenta

The generalized momenta are:

${e.block`\begin{aligned}
p_{\theta_1} &= \frac{\partial L}{\partial \dot{\theta}_1} = \left(\frac{m_1}{3} + m_2\right) l_1^2 \dot{\theta}_1 + \frac{m_2}{2} l_1 l_2 \dot{\theta}_2 \cos(\theta_1 - \theta_2) \\
p_{\theta_2} &= \frac{\partial L}{\partial \dot{\theta}_2} = \frac{m_2}{3} l_2^2 \dot{\theta}_2 + \frac{m_2}{2} l_1 l_2 \dot{\theta}_1 \cos(\theta_1 - \theta_2)
\end{aligned}`}

In matrix form ${e`\mathbf{p} = M(\theta) \dot{\boldsymbol{\theta}}`} where:

${e.block`M = \begin{pmatrix}
\left(\frac{m_1}{3} + m_2\right) l_1^2 & \frac{m_2}{2} l_1 l_2 \cos(\theta_1 - \theta_2) \\
\frac{m_2}{2} l_1 l_2 \cos(\theta_1 - \theta_2) & \frac{m_2}{3} l_2^2
\end{pmatrix}`}

Inverting to get ${e`\dot{\boldsymbol{\theta}} = M^{-1} \mathbf{p}`} and computing ${e`\dot{\mathbf{p}} = \frac{\partial L}{\partial \boldsymbol{\theta}}`}:

${e.block`\begin{aligned}
\dot{p}_{\theta_1} &= -\frac{m_2}{2} l_1 l_2 \dot{\theta}_1 \dot{\theta}_2 \sin(\theta_1 - \theta_2) - \left(\frac{m_1}{2} + m_2\right) g l_1 \sin\theta_1 \\
\dot{p}_{\theta_2} &= \frac{m_2}{2} l_1 l_2 \dot{\theta}_1 \dot{\theta}_2 \sin(\theta_1 - \theta_2) - \frac{m_2}{2} g l_2 \sin\theta_2
\end{aligned}`}

As a first-order system with state ${e`\mathbf{y} = (\theta_1, \theta_2, p_{\theta_1}, p_{\theta_2})^T`}:

${e.block`\frac{d\mathbf{y}}{dt} = \begin{pmatrix}
\dot{\theta}_1(\theta_1, \theta_2, p_{\theta_1}, p_{\theta_2}) \\
\dot{\theta}_2(\theta_1, \theta_2, p_{\theta_1}, p_{\theta_2}) \\
\dot{p}_{\theta_1}(\theta_1, \theta_2, p_{\theta_1}, p_{\theta_2}) \\
\dot{p}_{\theta_2}(\theta_1, \theta_2, p_{\theta_1}, p_{\theta_2})
\end{pmatrix}`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});
