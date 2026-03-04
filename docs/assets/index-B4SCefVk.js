import{d as n,_ as w}from"./index-ByB2dbry.js";n({root:document.getElementById("cell-873"),expanded:[],variables:[]},{id:873,body:async()=>{const[{reglCanvas:t},{default:e},{observeTheme:a}]=await Promise.all([w(()=>import("./regl-canvas-4j8SAjSv.js"),[]).then(o=>{if(!("reglCanvas"in o))throw new SyntaxError("export 'reglCanvas' not found");return o}),w(()=>import("https://cdn.jsdelivr.net/npm/regl@2.1.1/+esm"),[]).then(o=>{if(!("default"in o))throw new SyntaxError("export 'default' not found");return o}),w(()=>import("./theme-CeM7UA27.js"),[]).then(o=>{if(!("observeTheme"in o))throw new SyntaxError("export 'observeTheme' not found");return o})]);return{reglCanvas:t,createREGL:e,observeTheme:a}},inputs:[],outputs:["reglCanvas","createREGL","observeTheme"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-876"),expanded:[],variables:[]},{id:876,body:(t,e)=>({regl:t.attachResize(e[0],e[1])}),inputs:["_regl","dimensions"],outputs:["regl"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-875"),expanded:[],variables:[]},{id:875,body:(t,e,a)=>({_regl:t(e(a,{extensions:["ANGLE_instanced_arrays"]}))}),inputs:["view","reglCanvas","createREGL"],outputs:["_regl"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-391"),expanded:[],variables:[]},{id:391,body:function(e){return e.button("Restart")},inputs:["Inputs"],outputs:void 0,output:"viewof$restart",assets:void 0,autodisplay:!0,autoview:!0,automutable:!1});n({root:document.getElementById("cell-31"),expanded:[],variables:[]},{id:31,body:function(e){return e.range([2,200],{step:1,transform:Math.log,label:"Buckets",value:20})},inputs:["Inputs"],outputs:void 0,output:"viewof$n",assets:void 0,autodisplay:!0,autoview:!0,automutable:!1});n({root:document.getElementById("cell-312"),expanded:[],variables:[]},{id:312,body:function(e){return e.range([1,4],{label:"Friction",value:2.2,transform:Math.log})},inputs:["Inputs"],outputs:void 0,output:"viewof$friction",assets:void 0,autodisplay:!0,autoview:!0,automutable:!1});n({root:document.getElementById("cell-52"),expanded:[],variables:[]},{id:52,body:function(e){return e.range([0,1],{label:"Fill rate",value:.62})},inputs:["Inputs"],outputs:void 0,output:"viewof$fillRate",assets:void 0,autodisplay:!0,autoview:!0,automutable:!1});n({root:document.getElementById("cell-54"),expanded:[],variables:[]},{id:54,body:function(e){return e.range([0,.2],{label:"Drain rate",value:.11,step:.001})},inputs:["Inputs"],outputs:void 0,output:"viewof$drainRate",assets:void 0,autodisplay:!0,autoview:!0,automutable:!1});n({root:document.getElementById("cell-637"),expanded:[],variables:[]},{id:637,body:function(e){return e.select(["Exponential","Constant rate"],{label:"Draining"})},inputs:["Inputs"],outputs:void 0,output:"viewof$drainType",assets:void 0,autodisplay:!0,autoview:!0,automutable:!1});n({root:document.getElementById("cell-355"),expanded:[],variables:[]},{id:355,body:function(e){return e.range([.01,2],{transform:Math.log,label:"Time step",value:.05})},inputs:["Inputs"],outputs:void 0,output:"viewof$dt",assets:void 0,autodisplay:!0,autoview:!0,automutable:!1});n({root:document.getElementById("cell-434"),expanded:[],variables:[]},{id:434,body:function(e){return e.range([.1,10],{transform:Math.log,label:"Fill scale",value:.5})},inputs:["Inputs"],outputs:void 0,output:"viewof$drawScale",assets:void 0,autodisplay:!0,autoview:!0,automutable:!1});n({root:document.getElementById("cell-878"),expanded:[],variables:[]},{id:878,body:(t,e)=>t`The function below defines the derivative function which we integrate to simulate the system. The state variables of the system are the bucket fill amounts as well as the angular position and velocity of the system. For the sake of using an off-the-shelf ODE routine, we pack these into the vector ${e`\mathbf{y}`}. The system itself is just a wheel with inertia, friction, and the moment about the axis of rotation by the buckets.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});n({root:document.getElementById("cell-26"),expanded:[],variables:[]},{id:26,body:(t,e,a,o,i,u,c)=>{function s(r,l,E){const m=l[t],v=l[t+1];let p=1,b=0;for(let d=0;d<t;d++)e?r[d]=-l[d]*a:r[d]=l[d]<0?-l[d]*a:-a,b+=l[d]*Math.sin(m+Math.PI*2*(d/t)),p+=l[d];const h=o(Math.floor(t*o(-m/(2*Math.PI),1)+.5),t);r[h]+=i,u.activeBucket=h,r[t]=v,r[t+1]=(b-v*c)/p}return{derivative:s}},inputs:["n","isExponentialDraining","drainRate","mod","fillRate","mutables","friction"],outputs:["derivative"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-877"),expanded:[],variables:[]},{id:877,body:()=>({mutables:{activeBucket:-1,step:0}}),inputs:[],outputs:["mutables"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-879"),expanded:[],variables:[]},{id:879,body:(t,e)=>{const a={bucketWallColor:[0,0,0],trajectoryColor:[.3,.5,.9,.5],centerColor:[0,0,0]},o=t(({isDark:i})=>{a.bucketWallColor=i?[.85,.85,.85]:[0,0,0],a.trajectoryColor=i?[.5,.65,.95,.55]:[.3,.5,.9,.5],a.centerColor=i?[1,1,1]:[0,0,0]});return e.then(o),{renderColors:a,stopThemeObserver:o}},inputs:["observeTheme","invalidation"],outputs:["renderColors","stopThemeObserver"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-102"),expanded:[],variables:[]},{id:102,body:(t,e,a,o,i,u,c,s,r,l,E,m,v,p,b,h,d)=>({simulationLoop:function(){const B=t.frame(()=>{let I=10;for(let f=0;f<I;f++)e(a,a,o,i/I);let y=0,g=0;const S=a[u];let _=0;for(let f=0;f<u;f++){const x=S+Math.PI*2*(f/u);y+=a[f]*Math.sin(x),g+=a[f]*Math.cos(x),_+=a[f]}y/=_,g/=_;let k=c(2*s.step,r.length);r[k]=y,r[k+1]=g,l.subdata(r),E.subdata(a),t.clear({color:[0,0,0,0]}),m({y:E,theta:a[u],drawScale:v*(u/15),activeBucket:s.activeBucket,bucketWallColor:p.bucketWallColor}),b({trajectoryScale:.9,cmHistoryBuffer:l,trajectoryColor:p.trajectoryColor,n:Math.min(s.step,r.length/2)}),h([{trajectoryScale:.9,pointSize:7,state:[y,g],color:[.3,.5,.9]},{trajectoryScale:.9,pointSize:4,state:[0,0],color:p.centerColor}]),s.step=(s.step+1)%(r.length/2)});d.then(()=>B.cancel())}()}),inputs:["regl","odeRK4","y","derivative","dt","n","mod","mutables","centerOfMassHistory","cmHistoryBuffer","yBuffer","drawBuckets","drawScale","renderColors","drawTrajectory","drawPoint","invalidation"],outputs:["simulationLoop"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-468"),expanded:[],variables:[]},{id:468,body:(t,e)=>{e.step=0},inputs:["restartTrigger","mutables"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-520"),expanded:[],variables:[]},{id:520,body:(t,e,a,o,i,u)=>({restartTrigger:function(){}()}),inputs:["restart","n","fillRate","drainRate","friction","drainType"],outputs:["restartTrigger"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-643"),expanded:[],variables:[]},{id:643,body:t=>({isExponentialDraining:t==="Exponential"}),inputs:["drainType"],outputs:["isExponentialDraining"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-141"),expanded:[],variables:[]},{id:141,body:(t,e)=>({y:function(){const o=new Float32Array(e+2);return o[e]=Math.PI*2*.5/e-.01,o[e+1]=0,o}()}),inputs:["restart","n"],outputs:["y"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-111"),expanded:[],variables:[]},{id:111,body:(t,e,a)=>({yBuffer:function(){const i=t.buffer(e);return a.then(()=>i.destroy()),i}()}),inputs:["regl","y","invalidation"],outputs:["yBuffer"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-461"),expanded:[],variables:[]},{id:461,body:t=>({centerOfMassHistory:function(){return new Float32Array(2e5)}()}),inputs:["restartTrigger"],outputs:["centerOfMassHistory"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-460"),expanded:[],variables:[]},{id:460,body:(t,e,a)=>({cmHistoryBuffer:function(){const i=t.buffer(e);return a.then(()=>i.destroy()),i}()}),inputs:["regl","centerOfMassHistory","invalidation"],outputs:["cmHistoryBuffer"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-100"),expanded:[],variables:[]},{id:100,body:(t,e)=>{const o=t({vert:`
    precision highp float;
    attribute vec2 uv;
    attribute float y, index;
    uniform float n;
    uniform float theta, activeBucketIndex;
    varying vec2 vuv;
    varying float vy, isActive;
    uniform float scale;
    #define PI 3.14159265358979

    // Use an instanced quad to render each bucket, coloring the glass
    // and water level based on the position in the quad. Not fancy, but
    // super easy.

    void main () {
      float size = clamp(4.0 / n, 0.05, 0.12);
      vy = y * scale * 0.7;
      vuv = uv * 2.0 - 1.0;
      vec2 uv0 = (uv - 0.5) * size;
      uv0.x *= (1.0 + 2.0 * uv0.y);
      float bucketTheta = index * (PI * 2.0) / n;
      vec2 pos = 0.9 * vec2(sin(bucketTheta + theta), cos(bucketTheta + theta));
      isActive = activeBucketIndex == index ? 1.0 : 0.0;
      gl_Position = vec4(pos + uv0, 0, 1);
    }`,frag:`
    precision highp float;
    varying vec2 vuv;
    varying float vy, isActive;
    uniform vec3 bucketWallColor;
    void main () {
      // This is all somewhat opaque, but here's where draw the water level
      // and glass as color of the single quad rather than separate elements.
      // RIP antialiasing.

      bool isbucket = abs(vuv.x) > 1.0 || abs(vuv.y) > 1.0;
      float level = 0.5 + 0.5 * vuv.y - vy;
      vec3 col = level < 0.0 ? vec3(0.3, 0.5, 0.9) : vec3(1);
      vec3 bucketCol = isActive > 0.0 ? vec3(0.9, 0.2, 0.2) : bucketWallColor;
      if (!isbucket && level > 0.0) discard;
      gl_FragColor = vec4(isbucket ? bucketCol : col, 1);
    }`,attributes:{uv:{buffer:[[1.06,-.06],[1.06,.94],[-.06,-.06],[-.06,.94]],divisor:0},y:{buffer:t.prop("y"),divisor:1},index:{buffer:new Array(e).fill(0).map((c,s)=>s),divisor:1}},uniforms:{n:e,theta:t.prop("theta"),scale:t.prop("drawScale"),activeBucketIndex:t.prop("activeBucket"),bucketWallColor:t.prop("bucketWallColor")},depth:{enable:!1},primitive:"triangle strip",instances:e,count:4}),i=t({vert:`
    precision highp float;
    attribute vec2 xy;
    uniform float scale;
    void main () {
      gl_Position = vec4(xy * scale, 0, 1);
      gl_PointSize = 2.0;
    }`,frag:`
    precision highp float;
    uniform vec4 trajectoryColor;
    void main () {
      gl_FragColor = trajectoryColor;
    }`,attributes:{xy:t.prop("cmHistoryBuffer")},uniforms:{scale:t.prop("trajectoryScale"),trajectoryColor:t.prop("trajectoryColor")},blend:{enable:!0,func:{srcRGB:"src alpha",dstRGB:"one minus src alpha",srcAlpha:1,dstAlpha:1},equation:{rgb:"add",alpha:"add"}},depth:{enable:!1},primitive:"line strip",count:t.prop("n")}),u=t({vert:`
    precision highp float;
    attribute float dummy;
    uniform vec2 state;
    uniform float scale;
    uniform float pointSize;
    void main () {
      gl_Position = vec4(state * scale + dummy, 0, 1);
      gl_PointSize = pointSize;
    }`,frag:`
    precision highp float;
    uniform float pointSize;
    uniform vec3 color;
    void main () {
      vec2 uv = gl_PointCoord.xy * 2.0 - 1.0;
      float p = length(uv) * pointSize;
      float alpha = smoothstep(pointSize, pointSize - 1.5, p);
      vec3 color = mix(vec3(0), color, smoothstep(pointSize - 3.0, pointSize - 5.0, p));
      gl_FragColor = vec4(color, alpha);
    }`,attributes:{dummy:[0]},uniforms:{scale:t.prop("trajectoryScale"),state:t.prop("state"),pointSize:(c,s)=>s.pointSize*c.pixelRatio,color:t.prop("color")},blend:{enable:!0,func:{srcRGB:"src alpha",dstRGB:"one minus src alpha",srcAlpha:1,dstAlpha:1},equation:{rgb:"add",alpha:"add"}},depth:{enable:!1},primitive:"points",count:1});return{EPS:.06,drawBuckets:o,drawTrajectory:i,drawPoint:u}},inputs:["regl","n"],outputs:["EPS","drawBuckets","drawTrajectory","drawPoint"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-89"),expanded:[],variables:[]},{id:89,body:t=>{const e=Math.min(t,512);return{w:e,dimensions:[e,e]}},inputs:["width"],outputs:["w","dimensions"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-38"),expanded:[],variables:[]},{id:38,body:()=>{function t(e,a){return(e%a+a)%a}return{mod:t}},inputs:[],outputs:["mod"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-872"),expanded:[],variables:[]},{id:872,body:async(t,e)=>{const{odeRK4:a}=await w(()=>import("https://api.observablehq.com/@rreusser/integration.js?v=4"),[]).then(o=>{const i={},u=t.module(o.default),c=t.module();if(!u.defines("odeRK4"))throw new SyntaxError("export 'odeRK4' not found");return c.variable(i.odeRK4=e()).import("odeRK4",u),i});return{odeRK4:a}},inputs:["__ojs_runtime","__ojs_observer"],outputs:["odeRK4"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-880"),expanded:[],variables:[]},{id:880,body:(t,e)=>t`## Mathematical Formulation

The Malkus waterwheel is governed by a system of ordinary differential equations (ODEs) that describe both the water dynamics in each bucket and the rotational motion of the wheel itself.

### State Variables

The state vector ${e`\mathbf{y}`} contains ${e`n + 2`} components,

${e.block`\mathbf{y} = \begin{bmatrix} m_0 \\ m_1 \\ \vdots \\ m_{n-1} \\ \theta \\ \omega \end{bmatrix}`}

where ${e`m_i`} is the mass (or fill amount) of the ${e`i`}-th bucket, ${e`\theta`} is the angular position of the wheel, and ${e`\omega = \dot{\theta}`} is the angular velocity.

### Bucket Dynamics

Each bucket drains proportionally to its fill amount,

${e.block`\frac{dm_i}{dt} = -k_d \cdot m_i`}

where ${e`k_d`} is the drain rate. The topmost bucket additionally receives water at a constant fill rate ${e`Q`},

${e.block`\frac{dm_{\text{top}}}{dt} = Q - k_d \cdot m_{\text{top}}`}

### Rotational Dynamics

The wheel's rotation is governed by the rotational analog of Newton's second law,

${e.block`I \frac{d\omega}{dt} = M - \nu \omega`}

where ${e`I`} is the moment of inertia, ${e`M`} is the net torque from the water-filled buckets, and ${e`\nu`} is the friction coefficient.

The moment of inertia includes both the wheel itself and the distributed mass of water,

${e.block`I = I_0 + \sum_{i=0}^{n-1} m_i`}

where ${e`I_0`} is the base inertia of the empty wheel (here taken as 1).

The torque is the sum of moments from each bucket. Since bucket ${e`i`} is located at angle ${e`\theta_i = \theta + \frac{2\pi i}{n}`}, and torque is proportional to the sine of the angle (the perpendicular component of the gravitational force),

${e.block`M = \sum_{i=0}^{n-1} m_i \sin\left(\theta + \frac{2\pi i}{n}\right)`}

### Complete System

The complete system of ODEs is:

${e.block`\begin{aligned}
\frac{dm_i}{dt} &= -k_d \cdot m_i \quad \text{for } i \neq \text{top} \\
\frac{dm_{\text{top}}}{dt} &= Q - k_d \cdot m_{\text{top}} \\
\frac{d\theta}{dt} &= \omega \\
\frac{d\omega}{dt} &= \frac{1}{I}\left(\sum_{i=0}^{n-1} m_i \sin\left(\theta + \frac{2\pi i}{n}\right) - \nu \omega\right)
\end{aligned}`}

To integrate the system, I've used an ODE solver I wrote in [@rreusser/integration](https://observablehq.com/@rreusser/integration), though any explicit ODE routine like a Runge-Kutta method (RK2 or RK4) works great.

Although the formulation is a bit ad hoc, the system exhibits chaotic behavior for certain parameter values, with the wheel reversing direction unpredictably and displaying sensitive dependence on initial conditions.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});
