require('regl')({
  pixelRatio: Math.min(window.devicePixelRatio, 2.0),
  onDone: require('fail-nicely')(function run (regl) {
    var camera = require('./camera-2d')(regl, {
      xmin: -window.innerWidth * 0.75,
      xmax: window.innerWidth * 0.75,
      ymin: -window.innerHeight * 0.75,
      ymax: window.innerHeight * 0.75
    });
    
    var drawMoire = regl({
      vert: `
        precision highp float;
        uniform mat4 viewInv;
        attribute vec2 xy;
        varying vec2 uv;
        void main () {
          vec2 xyView = (viewInv * vec4(xy, 0, 1)).xy;
          uv = xyView;
          gl_Position = vec4(xy, 0, 1);
        }`,
      frag: `
        precision highp float;
        varying vec2 uv;
        uniform vec2 x0, x1, x2;
        uniform float time;
        void main () {
          vec2 dx0 = uv - x0;
          vec2 dx1 = uv - x1;
          vec2 dx2 = uv - x2;
          float th0 = atan(dx0.y, dx0.x);
          float th1 = atan(dx1.y, dx1.x);
          float th2 = atan(dx2.y, dx2.x);
          float r0 = length(dx0);
          float r1 = length(dx1);
          float r2 = length(dx2);
          gl_FragColor = vec4(vec3(
              cos(r0 * (1.0 + 0.005 * sin(th0 * 2.0 + time * 2.0 + r0 / 300.0))) * vec3(1.0, 0.3, 0.2)
            + cos(r1 * (1.0 + 0.005 * sin(th1 * 3.0 + time * 2.0 + r1 / 200.0))) * vec3(0.2, 1.0, 0.3)
            + cos(r2 * (1.0 + 0.005 * sin(th2 * 8.0 - time * 2.0 + r2 / 200.0))) * vec3(0.3, 0.2, 1.0)
            ), 1.0);
        }`,
      attributes: {xy: [-4, -4, 0, 4, 4, -4]},
      uniforms: {
        res: ctx => [ctx.framebufferWidth, ctx.framebufferHeight],
        x0: (ctx, props) => [30 * Math.cos(ctx.time) + props.x * 0.2, 5 * Math.sin(ctx.time) + props.y * 0.2],
        x1: (ctx, props) => [5 * Math.cos(ctx.time * 1) - props.x * 0.2, 30 * Math.sin(ctx.time * 1) - props.y * 0.2],
        x2: ctx => [5 * Math.cos(ctx.time * 0.15), 30 * Math.sin(ctx.time * 0.15)],
        time: regl.context('time'),
      },
      depth: {enable: false},
      count: 3
    });

    var dt = 0.03;
    var px = py = vx = vy = ax = ay = 0;
    function onmove (event) {
      var mousex = (2 * event.clientX - window.innerWidth) * 2;
      var mousey = (-2 * event.clientY + window.innerHeight) * 2;
      console.log(event);
      ax += (mousex - px) * 2.0;
      ay += (mousey - py) * 2.0;
    }

    window.addEventListener('mousemove', onmove, false);
    window.addEventListener('resize', camera.resize);
    window.addEventListener('touchstart', function () {
      vx += (Math.random() - 0.5) * 2000.0;
      vy += (Math.random() - 0.5) * 2000.0;
    });

    regl.frame(({tick}) => {
      ax += -px;
      ay += -py;
      vx += dt * ax;
      vy += dt * ay;
      vx *= 0.99;
      vy *= 0.99;
      px += dt * vx;
      py += dt * vy;
      ax = 0;
      ay = 0;

      camera.draw(function () {
        drawMoire({x: px, y: py});
      });
    });
  })
});
