import{computeShapeFromPositions as $}from"./jacobi-coords-figure-gQ4ZzRwA.js";import"./initial-conditions-figure-Chk-rZxK.js";function J(t=4){const o=(1+Math.sqrt(5))/2;let e=[[-1,o,0],[1,o,0],[-1,-o,0],[1,-o,0],[0,-1,o],[0,1,o],[0,-1,-o],[0,1,-o],[o,0,-1],[o,0,1],[-o,0,-1],[-o,0,1]],i=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];const p={};function v(n,s){const h=n<s?`${n}_${s}`:`${s}_${n}`;if(p[h]!==void 0)return p[h];const u=e[n],l=e[s],c=[(u[0]+l[0])/2,(u[1]+l[1])/2,(u[2]+l[2])/2],a=Math.sqrt(c[0]*c[0]+c[1]*c[1]+c[2]*c[2]);c[0]/=a,c[1]/=a,c[2]/=a;const w=e.length;return e.push(c),p[h]=w,w}for(let n=0;n<t;n++){const s=[];for(const[h,u,l]of i){const c=v(h,u),a=v(u,l),w=v(l,h);s.push([h,c,w],[u,a,c],[l,w,a],[c,a,w])}i=s}return e=e.map(n=>{const s=Math.sqrt(n[0]*n[0]+n[1]*n[1]+n[2]*n[2]);return[n[0]/s,n[1]/s,n[2]/s]}),{positions:e,cells:i}}function O(t){return[$([[0,0],[1,1],[1,1]],t),$([[1,1],[0,0],[1,1]],t),$([[1,1],[1,1],[0,0]],t)]}function U(t=100){const o=[];for(let e=0;e<=t;e++){const i=2*Math.PI*e/t;o.push([Math.cos(i),0,Math.sin(i)])}return o}const X=[1,0,0,0,1,0,0,0,1];function K(t){return t({vert:`
      precision highp float;
      uniform mat4 projectionView;
      uniform mat3 rotation;
      uniform mat3 gridRotation;
      attribute vec3 position;
      varying vec3 vPosition;
      varying vec3 vNormal;
      void main() {
        vec3 rotatedPos = rotation * position;
        vPosition = rotatedPos;
        vNormal = gridRotation * rotatedPos;
        gl_Position = projectionView * vec4(rotatedPos, 1);
      }
    `,frag:`#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec3 vPosition;
varying vec3 vNormal;
uniform float gridDensity;
uniform float lineAlpha;
uniform float fillAlpha;
uniform vec3 uForeground;

float gridFactor(vec2 parameter, float width, float feather) {
  float w1 = width - feather * 0.5;
  vec2 d = fwidth(parameter);
  vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
  vec2 a2 = smoothstep(d * w1, d * (w1 + feather), looped);
  return min(a2.x, a2.y);
}

void main() {
  float lat = asin(vNormal.y);
  float lon = atan(vNormal.z, vNormal.x);
  vec2 gridCoord = vec2(lat, lon) * gridDensity / 3.14159265;
  float grid = gridFactor(gridCoord, 0.5, 1.0);
  float alpha = mix(lineAlpha, fillAlpha, grid);
  gl_FragColor = vec4(uForeground, alpha);
}`,attributes:{position:t.prop("positions")},elements:t.prop("elements"),uniforms:{projectionView:t.prop("projectionView"),rotation:(o,e)=>e.rotation||X,gridRotation:(o,e)=>e.gridRotation||X,gridDensity:(o,e)=>e.gridDensity||4,lineAlpha:(o,e)=>e.lineAlpha||.18,fillAlpha:(o,e)=>e.fillAlpha||.06,uForeground:(o,e)=>e.foreground||[0,0,0]},blend:{enable:!0,func:{srcRGB:"src alpha",dstRGB:"one minus src alpha",srcAlpha:1,dstAlpha:1}},depth:{enable:!0,mask:!1},cull:{enable:!0,face:"back"}})}function Q(t){const o=Math.cos(t),e=Math.sin(t);return[1,0,0,0,0,o,-e,0,0,e,o,0,0,0,0,1]}function Z(t){const o=Math.cos(t),e=Math.sin(t);return[o,0,e,0,0,1,0,0,-e,0,o,0,0,0,0,1]}function tt(t,o,e,i){const p=1/Math.tan(t/2),v=1/(e-i);return[p/o,0,0,0,0,p,0,0,0,0,(i+e)*v,-1,0,0,2*i*e*v,0]}function N(t,o){const e=new Array(16);for(let i=0;i<4;i++)for(let p=0;p<4;p++)e[p*4+i]=t[0+i]*o[p*4+0]+t[4+i]*o[p*4+1]+t[8+i]*o[p*4+2]+t[12+i]*o[p*4+3];return e}function nt(t,o={}){const e=J(4),i=t.buffer(e.positions.flat()),p=t.elements(e.cells.flat()),v=t.buffer(U().flat());let n=o.theta||.7,s=o.phi||.3,h=o.distance||3.5,u=!0,l=o.background||[1,1,1],c=o.foreground||[0,0,0];const a=new Float32Array([-1,0,0,0,1,0,0,0,1,1,-1,0,-1,0,0,0,1,1,-1,0,-1,1,-1,0,0,1,-1,-1,0,1,-1,1,0,1,0,0]),w=t({vert:`
      precision highp float;
      uniform mat4 uProjectionView;
      uniform float uTailWidth, uAspect;
      uniform vec2 uArrowheadShape;
      attribute vec3 aPoint, aNextPoint;
      attribute vec4 aArrow;

      void main() {
        vec4 p = uProjectionView * vec4(aPoint, 1);
        vec4 pn = uProjectionView * vec4(aNextPoint, 1);
        gl_Position = mix(p, pn, aArrow.y);
        vec2 unitVector = normalize((pn.xy / pn.w - p.xy / p.w) * vec2(uAspect, 1));
        vec2 perpUnitVector = vec2(-unitVector.y, unitVector.x);
        gl_Position.xy += (
            perpUnitVector * (aArrow.x * uTailWidth + aArrow.w * uArrowheadShape.y) +
            unitVector * aArrow.z * uArrowheadShape.x
          ) / vec2(uAspect, 1) * gl_Position.w;
      }
    `,frag:`
      precision highp float;
      uniform vec4 uColor;
      void main() {
        gl_FragColor = uColor;
      }
    `,attributes:{aPoint:{buffer:t.prop("positions"),stride:12,offset:t.prop("offset"),divisor:1},aNextPoint:{buffer:t.prop("positions"),stride:12,offset:(d,f)=>(f.offset||0)+12,divisor:1},aArrow:a},uniforms:{uProjectionView:t.prop("projectionView"),uTailWidth:(d,f)=>(f.tailWidth||2.5)/d.viewportHeight*d.pixelRatio,uArrowheadShape:(d,f)=>[(f.arrowheadLength||12)/d.viewportHeight*d.pixelRatio*2,(f.arrowheadWidth||9)/d.viewportHeight*d.pixelRatio],uAspect:d=>d.viewportWidth/d.viewportHeight,uColor:t.prop("color")},primitive:"triangles",instances:(d,f)=>(f.count||2)-1,count:9,depth:{enable:!0}}),A=K(t),b=t({vert:`
      precision highp float;
      uniform mat4 projection, view;
      attribute vec3 position;
      void main() {
        gl_Position = projection * view * vec4(position, 1);
      }
    `,frag:`
      precision highp float;
      uniform vec4 color;
      void main() {
        gl_FragColor = color;
      }
    `,attributes:{position:t.prop("positions")},uniforms:{projection:t.prop("projection"),view:t.prop("view"),color:t.prop("color")},primitive:"line strip",count:t.prop("count"),depth:{enable:!0}}),y=t({vert:`
      precision highp float;
      uniform mat4 projection, view;
      uniform float pointSize, pixelRatio;
      attribute vec3 position;
      attribute vec4 color;
      varying vec4 vColor;
      void main() {
        vColor = color;
        gl_Position = projection * view * vec4(position, 1);
        gl_PointSize = pointSize * pixelRatio;
      }
    `,frag:`
      precision highp float;
      uniform vec3 uBackground;
      varying vec4 vColor;
      void main() {
        float r = length(gl_PointCoord * 2.0 - 1.0);
        if (r > 1.0) discard;
        vec3 c = r > 0.7 ? uBackground : vColor.rgb;
        gl_FragColor = vec4(c, vColor.a);
      }
    `,attributes:{position:t.prop("positions"),color:t.prop("colors")},uniforms:{projection:t.prop("projection"),view:t.prop("view"),pointSize:t.prop("pointSize"),pixelRatio:t.context("pixelRatio"),uBackground:t.prop("background")},primitive:"points",count:t.prop("count"),depth:{enable:!0}}),V=t.buffer(new Float32Array(6)),M=t.buffer(new Float32Array(9)),S=t.buffer(new Float32Array(12)),g=t.buffer(new Float32Array(6)),j=50,k=t.buffer(new Float32Array((j+1)*3));return{theta:n,phi:s,distance:h,dirty:u,setTheme(d,f){l=d,c=f,u=!0},setShape(d){const f=[d[1],d[2],d[0]];V.subdata([0,0,0,...f]);const x=Math.hypot(f[0],f[2]);if(x>1e-6){const F=[f[0]/x,0,f[2]/x];g.subdata([0,0,0,...F]);const P=Math.atan2(f[1],x),_=new Float32Array((j+1)*3);for(let m=0;m<=j;m++){const C=P*m/j,R=Math.cos(C),G=Math.sin(C);_[m*3+0]=F[0]*R,_[m*3+1]=G,_[m*3+2]=F[2]*R}k.subdata(_)}u=!0},setPunctures(d){const f=O(d);M.subdata(f.flatMap(x=>[x[1],x[2],x[0]])),S.subdata([.2,.9,.1,1,.9,.1,.2,1,.1,.2,.9,1]),u=!0},rotate(d,f){n+=d,s=Math.max(-Math.PI/2+.01,Math.min(Math.PI/2-.01,s+f)),u=!0},taint(){u=!0},render(d,f){if(!u)return;u=!1;const x=d/f,F=tt(Math.PI/4,x,.1,100),P=N(Q(-s),Z(-n));P[12]=0,P[13]=0,P[14]=-h;const _=N(F,P),m={projection:F,view:P};t.clear({color:[0,0,0,0],depth:1});const C=[...c,.6];A({projectionView:_,positions:{buffer:i,stride:12},elements:p,foreground:c}),b({...m,positions:v,count:101,color:C}),b({...m,positions:g,count:2,color:C}),b({...m,positions:k,count:j+1,color:C}),w({projectionView:_,positions:V,offset:0,count:2,color:[.18,.63,.83,1],tailWidth:2.5,arrowheadLength:12,arrowheadWidth:9}),y({...m,positions:M,colors:S,count:3,pointSize:12,background:l})},destroy(){i.destroy(),p.destroy(),v.destroy(),V.destroy(),M.destroy(),S.destroy(),g.destroy(),k.destroy()}}}function H(t){const o=1-t[1];return Math.abs(o)<1e-10?[1/0,-1,1/0]:[t[0]/o*2,-1,t[2]/o*2]}function rt(t){const o=Math.sqrt(t[0]*t[0]+t[1]*t[1]+t[2]*t[2]),e=t[0]/o,i=t[1]/o,p=t[2]/o;if(Math.abs(i-1)<1e-6)return[1,0,0,0,1,0,0,0,1];if(Math.abs(i+1)<1e-6)return[1,0,0,0,-1,0,0,0,-1];const v=Math.sqrt(p*p+e*e),n=p/v,s=-e/v,h=i,u=Math.sqrt(1-i*i),l=1-h;return[h+n*n*l,n*s*l,-s*u,n*s*l,h+l*0,n*u,s*u,-n*u,h+s*s*l]}function T(t,o){return[t[0]*o[0]+t[3]*o[1]+t[6]*o[2],t[1]*o[0]+t[4]*o[1]+t[7]*o[2],t[2]*o[0]+t[5]*o[1]+t[8]*o[2]]}function ct(t,o,e,i={},p=null){const v=J(4),n=O(e),h=rt(n[2]),u=new Float32Array(o.length),l=new Float32Array(o.length);for(let r=0;r<o.length;r+=3){const W=[o[r],o[r+1],o[r+2]],B=T(h,W);u[r]=B[0],u[r+1]=B[1],u[r+2]=B[2];const L=H(B);l[r]=L[0],l[r+1]=L[1],l[r+2]=L[2]}const c=n.map(r=>T(h,r)),a=new Float32Array(15),w=new Float32Array(20);for(let r=0;r<3;r++)a[r*3]=c[r][0],a[r*3+1]=c[r][1],a[r*3+2]=c[r][2];const A=H(c[0]),b=H(c[1]);a[9]=A[0],a[10]=A[1],a[11]=A[2],a[12]=b[0],a[13]=b[1],a[14]=b[2],w.set([.2,.9,.1,1,.9,.1,.2,1,.1,.2,.9,1,.2,.9,.1,1,.9,.1,.2,1]);const y=new Float32Array([b[0],b[1],b[2],0,1,0,A[0],A[1],A[2]]),V=U(200).map(r=>T(h,r)),M=t.buffer(v.positions.flat()),S=t.elements(v.cells.flat()),g=t.buffer(u),j=t.buffer(l),k=t.buffer(V.flat()),d=t.buffer(a),f=t.buffer(w),x=t.buffer(y);let F=i.theta||.7,P=i.phi||.1,_=i.distance||5,m=!0,C=i.background||[1,1,1],R=i.foreground||[0,0,0];const G=[1,0,0,0,0,1,0,-1,0],ot=K(t),I=t({vert:`
      precision highp float;
      uniform mat4 projectionView;
      attribute vec3 position;
      void main() { gl_Position = projectionView * vec4(position, 1); }
    `,frag:`
      precision highp float;
      uniform vec4 color;
      void main() { gl_FragColor = color; }
    `,attributes:{position:t.prop("positions")},uniforms:{projectionView:t.prop("projectionView"),color:t.prop("color")},primitive:"line strip",count:t.prop("count"),depth:{enable:!0}});let E=null;p&&(E=p(t,{vert:`
        precision highp float;
        #pragma lines: attribute vec3 position;
        #pragma lines: position = getPosition(position);
        #pragma lines: width = getWidth();
        uniform mat4 projectionView;
        uniform float lineWidth;
        vec4 getPosition(vec3 p) { return projectionView * vec4(p, 1); }
        float getWidth() { return lineWidth; }
      `,frag:`
        precision highp float;
        uniform vec4 color;
        void main() { gl_FragColor = color; }
      `,uniforms:{projectionView:t.prop("projectionView"),color:t.prop("color"),lineWidth:(r,W)=>(W.lineWidth||2)*r.pixelRatio},depth:{enable:!0}}));const et=t({vert:`
      precision highp float;
      uniform mat4 projectionView;
      uniform float pointSize, pixelRatio;
      attribute vec3 position;
      attribute vec4 color;
      varying vec4 vColor;
      void main() {
        vColor = color;
        gl_Position = projectionView * vec4(position, 1);
        gl_PointSize = pointSize * pixelRatio;
      }
    `,frag:`
      precision highp float;
      uniform vec3 uBackground;
      varying vec4 vColor;
      void main() {
        float r = length(gl_PointCoord * 2.0 - 1.0);
        if (r > 1.0) discard;
        vec3 c = r > 0.7 ? uBackground : vColor.rgb;
        gl_FragColor = vec4(c, vColor.a);
      }
    `,attributes:{position:t.prop("positions"),color:t.prop("colors")},uniforms:{projectionView:t.prop("projectionView"),pointSize:t.prop("pointSize"),pixelRatio:t.context("pixelRatio"),uBackground:t.prop("background")},primitive:"points",count:t.prop("count"),depth:{enable:!0}}),D=o.length/3;return{get theta(){return F},get phi(){return P},get dirty(){return m},rotate(r,W){F+=r,P=Math.max(-Math.PI/2+.01,Math.min(Math.PI/2-.01,P+W)),m=!0},taint(){m=!0},setTheme(r,W){C=r,R=W,m=!0},render(r,W){if(!m)return;m=!1;const B=r/W,L=tt(Math.PI/5,B,.1,100),q=N(Q(-P),Z(-F));q[12]=0,q[13]=.15,q[14]=-_;const z=N(L,q);t.clear({color:[0,0,0,0],depth:1});const it=[...R,.6],Y=[R[0]*.2+C[0]*.8,R[1]*.2+C[1]*.8,R[2]*.2+C[2]*.8,1];ot({projectionView:z,positions:{buffer:M,stride:12},elements:S,rotation:h,gridRotation:G,gridDensity:4,foreground:R}),I({projectionView:z,positions:k,count:201,color:it}),E?E({projectionView:z,vertexCount:D,vertexAttributes:{position:{buffer:g,stride:12,offset:0}},color:[.18,.63,.83,1],lineWidth:1.7}):I({projectionView:z,positions:g,count:D,color:[.18,.63,.83,1]}),E?E({projectionView:z,vertexCount:D,vertexAttributes:{position:{buffer:j,stride:12,offset:0}},color:Y,lineWidth:1.7}):I({projectionView:z,positions:j,count:D,color:Y}),I({projectionView:z,positions:x,count:3,color:Y}),et({projectionView:z,positions:d,colors:f,count:5,pointSize:12,background:C})},destroy(){M.destroy(),S.destroy(),g.destroy(),j.destroy(),k.destroy(),d.destroy(),f.destroy(),x.destroy()}}}function pt(t,o,e,i,p={}){const v=document.createElement("div");v.style.display="flex",v.style.flexWrap="wrap",v.style.gap="20px",v.style.alignItems="flex-start";const{createJacobiCoordsFigure:n}=p.jacobiFigure,s=n(t,e,i,{width:Math.min(p.width||400,400),height:Math.min((p.width||400)*.7,280)}),h=document.createElement("figure");h.style.margin="0",h.appendChild(s.node);const u=document.createElement("figcaption");u.textContent="Jacobi coordinates. Drag the masses to see the effect in shape space.",h.appendChild(u),v.appendChild(h);const l=Math.min(p.width||400,400),c=Math.floor(l*.7),a=document.createElement("canvas");a.width=l*devicePixelRatio,a.height=c*devicePixelRatio,a.style.width=`${l}px`,a.style.height=`${c}px`;const w=document.createElement("figure");w.style.margin="0",w.appendChild(a);const A=document.createElement("figcaption");A.textContent="Shape sphere with collision points marked.",w.appendChild(A),v.appendChild(w);const b=o({canvas:a,attributes:{antialias:!0}}),y=nt(b,{theta:.7,phi:.3});y.setPunctures(e.m),y.setShape(s.getShape()),y.render(l,c),s.addEventListener("input",()=>{y.setShape(s.getShape()),y.render(l,c)});let V=!1,M=0,S=0;return a.addEventListener("mousedown",g=>{V=!0,M=g.clientX,S=g.clientY,a.style.cursor="grabbing"}),window.addEventListener("mousemove",g=>{if(!V)return;const j=g.clientX-M,k=g.clientY-S;y.rotate(j*.01,k*.01),y.render(l,c),M=g.clientX,S=g.clientY}),window.addEventListener("mouseup",()=>{V=!1,a.style.cursor="grab"}),a.style.cursor="grab",{element:v,jacobiFigure:s,shapeSphere:y,destroy(){y.destroy(),b.destroy()}}}export{K as createDrawGlobeCommand,U as createEquator,J as createIcosphere,pt as createLinkedJacobiShapeSphere,ct as createOrbitShapeSphere,nt as createShapeSphere,O as getCollisionPoints,H as stereographicProject};
