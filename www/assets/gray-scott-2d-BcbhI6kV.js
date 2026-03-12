function D(e,{width:a,height:n}){const r=[0,1].map(()=>e.framebuffer({color:e.texture({width:a,height:n,type:"float",format:"rgba",wrapS:"repeat",wrapT:"repeat",min:"nearest",mag:"nearest"}),depthStencil:!1})),u=[-4,-4,4,-4,0,4],s=a/n,c=e({frag:`
      precision highp float;
      varying vec2 uv;
      uniform float aspect;
      void main() {
        float u = 1.0;
        float v = 0.0;
        vec2 p = uv - 0.5;
        p.x *= aspect;
        if (length(p) < 0.1) { u = 0.5; v = 0.25; }
        gl_FragColor = vec4(u, v, 0.0, 1.0);
      }
    `,vert:`
      precision highp float;
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = 0.5 * (position + 1.0);
        gl_Position = vec4(position, 0, 1);
      }
    `,uniforms:{aspect:s},depth:{enable:!1},attributes:{position:u},framebuffer:e.prop("dest"),count:3}),v=e({frag:`
      precision highp float;
      varying vec2 uv;
      uniform sampler2D source;
      uniform vec2 delta;
      uniform float f, k, Du, Dv, dt;

      void main() {
        vec4 c = texture2D(source, uv);
        float u = c.r;
        float v = c.g;

        // 5-point stencil Laplacian
        float Lu = texture2D(source, uv + vec2(delta.x, 0.0)).r
                 + texture2D(source, uv - vec2(delta.x, 0.0)).r
                 + texture2D(source, uv + vec2(0.0, delta.y)).r
                 + texture2D(source, uv - vec2(0.0, delta.y)).r
                 - 4.0 * u;
        float Lv = texture2D(source, uv + vec2(delta.x, 0.0)).g
                 + texture2D(source, uv - vec2(delta.x, 0.0)).g
                 + texture2D(source, uv + vec2(0.0, delta.y)).g
                 + texture2D(source, uv - vec2(0.0, delta.y)).g
                 - 4.0 * v;

        // Gray-Scott reaction-diffusion
        float uvv = u * v * v;
        float du = Du * Lu - uvv + f * (1.0 - u);
        float dv = Dv * Lv + uvv - (f + k) * v;

        gl_FragColor = vec4(u + dt * du, v + dt * dv, 0.0, 1.0);
      }
    `,vert:`
      precision highp float;
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = 0.5 * (position + 1.0);
        gl_Position = vec4(position, 0, 1);
      }
    `,depth:{enable:!1},attributes:{position:u},uniforms:{source:e.prop("source"),delta:({framebufferWidth:o,framebufferHeight:i})=>[1/o,1/i],f:()=>t.f,k:()=>t.k,Du:.2097,Dv:.105,dt:1},framebuffer:e.prop("destination"),count:3}),f=e({frag:`
      precision highp float;
      varying vec2 uv;
      uniform sampler2D source;
      void main() {
        float v = texture2D(source, uv).g;
        float contrast = 8.0;
        float centered = (v - 0.2) * contrast;
        float mapped = 0.5 - atan(centered * 2.0) / 3.14159 + 0.1;
        gl_FragColor = vec4(vec3(mapped), 1.0);
      }
    `,vert:`
      precision highp float;
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = 0.5 * (position + 1.0);
        gl_Position = vec4(position, 0, 1);
      }
    `,depth:{enable:!1},attributes:{position:u},uniforms:{source:e.prop("source")},count:3}),p=e({frag:`
      precision highp float;
      varying vec2 uv;
      uniform sampler2D source;
      uniform vec2 mouse;
      uniform float radius;
      uniform float aspect;
      void main() {
        vec4 c = texture2D(source, uv);
        vec2 diff = uv - mouse;
        diff.x *= aspect;
        float d = length(diff);
        if (d < radius) {
          c.r = 0.5;
          c.g = 0.25;
        }
        gl_FragColor = c;
      }
    `,vert:`
      precision highp float;
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = 0.5 * (position + 1.0);
        gl_Position = vec4(position, 0, 1);
      }
    `,depth:{enable:!1},attributes:{position:u},uniforms:{source:e.prop("source"),mouse:e.prop("mouse"),radius:.06,aspect:s},framebuffer:e.prop("destination"),count:3}),t={i:0,mouse:null,f:.055,k:.062};function d(){c({dest:r[0]}),c({dest:r[1]}),t.i=0}function l(){const o=r[t.i%2],i=r[(t.i+1)%2];t.i++,t.mouse?(p({source:o,destination:i,mouse:t.mouse}),v({source:i,destination:o}),t.i++):v({source:o,destination:i})}function m(){f({source:r[t.i%2]})}function g(o){t.mouse=o}function h(o,i){t.f=o,t.k=i}return{restart:d,step:l,render:m,setMouse:g,setParams:h,state:t}}export{D as createGrayScott2D};
