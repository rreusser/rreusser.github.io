import{computeShapeFromPositions as S}from"./jacobi-coords-figure-gQ4ZzRwA.js";import"./initial-conditions-figure-Chk-rZxK.js";function w(t){const o=Math.sqrt(t[0]*t[0]+t[1]*t[1]+t[2]*t[2]),n=t[0]/o,i=t[1]/o,c=t[2]/o;if(Math.abs(i-1)<1e-6)return[1,0,0,0,1,0,0,0,1];if(Math.abs(i+1)<1e-6)return[1,0,0,0,-1,0,0,0,-1];const s=Math.sqrt(c*c+n*n),a=c/s,e=-n/s,r=i,f=1-r,l=Math.sqrt(1-i*i);return[r+a*a*f,a*e*f,-e*l,a*e*f,r,a*l,e*l,-a*l,r+e*e*f]}function x(t,o){return[t[0]*o[0]+t[3]*o[1]+t[6]*o[2],t[1]*o[0]+t[4]*o[1]+t[7]*o[2],t[2]*o[0]+t[5]*o[1]+t[8]*o[2]]}function C(t,o,n){const i=n*9,[c,s,a]=o,e=(t[i]-t[i+3])/Math.sqrt(2),r=(t[i+1]-t[i+4])/Math.sqrt(2),f=((c*t[i]+s*t[i+3])/(c+s)-t[i+6])*2/Math.sqrt(6),l=((c*t[i+1]+s*t[i+4])/(c+s)-t[i+7])*2/Math.sqrt(6),u=e*e+r*r,h=f*f+l*l,p=u+h;return[2*(e*f+r*l)/p,(h-u)/p,2*(e*l-r*f)/p]}function F(t){const o=1-t[1];return Math.abs(o)<1e-10?[1/0,1/0]:[t[0]/o*2,t[2]/o*2]}function X(t,o){const n=[];for(let i=0;i<t.t.length;i++)n.push(C(t.position,o,i));return n}function z(t){return[S([[0,0],[1,1],[1,1]],t),S([[1,1],[0,0],[1,1]],t),S([[1,1],[1,1],[0,0]],t)]}function q(t,o,n){const i=z(o),c=w(i[2]),s=[],a=n.length;for(let e=0;e<a;e++){const r=C(t,o,e),f=x(c,r),l=F(f);s.push(l[0],l[1],n[e])}return new Float32Array(s)}function I(t){const o=z(t),n=w(o[2]);return o.map(i=>x(n,i)).map(F).filter(i=>isFinite(i[0])&&isFinite(i[1]))}function B(t,o){const n=q(t.position,o,t.t);let i=1/0,c=-1/0,s=1/0,a=-1/0;for(let r=0;r<n.length;r+=3)isFinite(n[r])&&isFinite(n[r+1])&&(i=Math.min(i,n[r]),c=Math.max(c,n[r]),s=Math.min(s,n[r+1]),a=Math.max(a,n[r+1]));const e=Math.max(c-i,a-s)*.1;return{minX:i-e,maxX:c+e,minY:s-e,maxY:a+e}}function D(t,o,n,i,c,s={},a=null){const e=q(o.position,n,o.t),r=I(n),f=o.t.length,l=o.t[o.t.length-1],u=t.buffer(e),h=t.buffer(new Float32Array(r.flat())),p=t.buffer(new Float32Array([.2,.9,.1,1,.9,.1,.2,1])),b=s.color||[.18,.63,.83],T=s.speed||1;let m=!0,d=null;a&&(d=a(t,{vert:`
        precision highp float;
        #pragma lines: attribute vec3 position;
        #pragma lines: position = getPosition(position);
        #pragma lines: width = getWidth();
        uniform mat4 view;
        uniform float timeScale, timeShift, lineWidth;
        vec4 getPosition(vec3 p) {
          return view * vec4(p.xy, (p.z * timeScale - timeShift) * 2.0 - 1.0, 1);
        }
        float getWidth() { return lineWidth; }
      `,frag:`
        precision highp float;
        uniform vec4 color;
        void main() { gl_FragColor = color; }
      `,uniforms:{view:()=>i.view,color:t.prop("color"),timeScale:t.prop("timeScale"),timeShift:t.prop("timeShift"),lineWidth:(v,g)=>(g.lineWidth||2)*v.pixelRatio},depth:{enable:!0},viewport:c(i),scissor:{enable:!0,box:c(i)}}));const W=t({vert:`
      precision highp float;
      uniform mat4 view;
      uniform float timeScale, timeShift;
      attribute vec3 position;
      void main() {
        gl_Position = view * vec4(position.xy, (position.z * timeScale - timeShift) * 2.0 - 1.0, 1);
      }
    `,frag:`
      precision highp float;
      uniform vec4 color;
      void main() { gl_FragColor = color; }
    `,attributes:{position:u},uniforms:{view:()=>i.view,color:t.prop("color"),timeScale:t.prop("timeScale"),timeShift:t.prop("timeShift")},primitive:"line strip",count:f,depth:{enable:!0},viewport:c(i),scissor:{enable:!0,box:c(i)}}),_=t({vert:`
      precision highp float;
      uniform mat4 view;
      uniform float pointSize, pixelRatio;
      attribute vec2 position;
      attribute vec4 color;
      varying vec4 vColor;
      void main() {
        vColor = color;
        gl_Position = view * vec4(position, 0, 1);
        gl_PointSize = pointSize * pixelRatio;
      }
    `,frag:`
      precision highp float;
      varying vec4 vColor;
      void main() {
        float r = length(gl_PointCoord * 2.0 - 1.0);
        if (r > 1.0) discard;
        vec3 c = r > 0.7 ? vec3(1) : vColor.rgb;
        gl_FragColor = vec4(c, vColor.a);
      }
    `,attributes:{position:{buffer:h,stride:8},color:p},uniforms:{view:()=>i.view,pointSize:t.prop("pointSize"),pixelRatio:t.context("pixelRatio")},primitive:"points",count:r.length,depth:{enable:!1},viewport:c(i),scissor:{enable:!0,box:c(i)}});return{get dirty(){return m},taint(){m=!0},render(v=0){const y=v*T%(l*2)/l-1,M=1/l;t.clear({color:[0,0,0,0],depth:1});const j=[y,y-2];for(const P of j)d?d({vertexCount:f,vertexAttributes:{position:{buffer:u,stride:12,offset:0}},color:[...b,1],timeScale:M,timeShift:P,lineWidth:1.7}):W({color:[...b,1],timeScale:M,timeShift:P});_({pointSize:12}),m=!0},destroy(){u.destroy(),h.destroy(),p.destroy()}}}export{B as computeProjectedBounds,q as computeProjectedShapeTrajectory,C as computeShapeFromTrajectory,X as computeShapeTrajectory,D as createShapeProjection2D,z as getCollisionPoints,I as getProjectedCollisionPoints,F as stereographicProject};
