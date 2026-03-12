// Gray-Scott 2D reaction-diffusion simulation
// regl and reglCanvas must be passed in (npm imports not allowed in local modules)

export function createGrayScott2D(regl, { width: w, height: h }) {
  const pingpong = [0, 1].map(() => regl.framebuffer({
    color: regl.texture({
      width: w,
      height: h,
      type: 'float',
      format: 'rgba',
      wrapS: 'repeat',
      wrapT: 'repeat',
      min: 'nearest',
      mag: 'nearest'
    }),
    depthStencil: false
  }));

  const quad = [-4, -4, 4, -4, 0, 4];
  const aspect = w / h;

  const init = regl({
    frag: `
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
    `,
    vert: `
      precision highp float;
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = 0.5 * (position + 1.0);
        gl_Position = vec4(position, 0, 1);
      }
    `,
    uniforms: { aspect },
    depth: { enable: false },
    attributes: { position: quad },
    framebuffer: regl.prop('dest'),
    count: 3
  });

  const update = regl({
    frag: `
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
    `,
    vert: `
      precision highp float;
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = 0.5 * (position + 1.0);
        gl_Position = vec4(position, 0, 1);
      }
    `,
    depth: { enable: false },
    attributes: { position: quad },
    uniforms: {
      source: regl.prop('source'),
      delta: ({ framebufferWidth: w, framebufferHeight: h }) => [1.0 / w, 1.0 / h],
      f: () => state.f,
      k: () => state.k,
      Du: 0.2097,
      Dv: 0.105,
      dt: 1.0
    },
    framebuffer: regl.prop('destination'),
    count: 3
  });

  const draw = regl({
    frag: `
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
    `,
    vert: `
      precision highp float;
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = 0.5 * (position + 1.0);
        gl_Position = vec4(position, 0, 1);
      }
    `,
    depth: { enable: false },
    attributes: { position: quad },
    uniforms: { source: regl.prop('source') },
    count: 3
  });

  const paint = regl({
    frag: `
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
    `,
    vert: `
      precision highp float;
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = 0.5 * (position + 1.0);
        gl_Position = vec4(position, 0, 1);
      }
    `,
    depth: { enable: false },
    attributes: { position: quad },
    uniforms: {
      source: regl.prop('source'),
      mouse: regl.prop('mouse'),
      radius: 0.06,
      aspect
    },
    framebuffer: regl.prop('destination'),
    count: 3
  });

  const state = { i: 0, mouse: null, f: 0.055, k: 0.062 };

  function restart() {
    init({ dest: pingpong[0] });
    init({ dest: pingpong[1] });
    state.i = 0;
  }

  function step() {
    const source = pingpong[state.i % 2];
    const destination = pingpong[(state.i + 1) % 2];
    state.i++;

    if (state.mouse) {
      paint({ source, destination, mouse: state.mouse });
      update({ source: destination, destination: source });
      state.i++;
    } else {
      update({ source, destination });
    }
  }

  function render() {
    draw({ source: pingpong[state.i % 2] });
  }

  function setMouse(uv) {
    state.mouse = uv;
  }

  function setParams(f, k) {
    state.f = f;
    state.k = k;
  }

  return { restart, step, render, setMouse, setParams, state };
}
