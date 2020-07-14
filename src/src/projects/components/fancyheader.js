import React from 'react';
import regl from 'regl';
import mat4lookAt from 'gl-mat4/lookAt'
import mat4perspective from 'gl-mat4/perspective'
import mat4multiply from 'gl-mat4/multiply'
import mat4create from 'gl-mat4/create'
import mat4invert from 'gl-mat4/invert'

const bgColor = [202 / 255, 71 / 255, 71 / 255];

function Sim1 (regl) {
  const draw = regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      varying vec2 uv;
      uniform vec2 aspectRatio;
      void main () {
        uv = (xy) * aspectRatio;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision mediump float;
      varying vec2 uv;
      uniform float t;
      uniform vec3 bgColor;
      void main () {
        float r = length(uv);

        float theta = atan(uv.y, uv.x) + t * 0.2;
        float f = sin(10.0 * (t - r) - 2.0 * theta) + sin(10.0 * (t - r) + 20.0 * theta);
        f *= f;
        f *= f;
        f *= smoothstep(0.0, 5.0, r);
        f *= 0.2;

        gl_FragColor = mix(
          vec4(bgColor, 1),
          vec4(1, 1, 1, 1),
          f
        );
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      t: regl.context('time'),
      bgColor: bgColor,
      aspectRatio: ctx => [ctx.viewportWidth / ctx.viewportHeight, 1],
    },
    depth: {enable: false},
    count: 3
  });

  return function () {
    draw();
  };
}

function Sim2 (regl) {
  var nOrigins = 9;
  var originUniforms = {};
  var x0 = [];
  var t0 = [];
  function randomizeOrigin (i, t, ar) {
    var y = Math.random() * 2 - 1;
    x0[i] = [(Math.random() * 2 - 1) * ar, Math.sign(y) * Math.sqrt(Math.abs(y))];
    t0[i] = t;
  }

  for (var i = 0; i < nOrigins; i++) {
    randomizeOrigin(i, 1 + Math.sqrt(i * 5), 1);
    (function (ii) {
      originUniforms['origin[' + ii + ']'] = () => x0[ii];
      originUniforms['t0[' + ii + ']'] = () => t0[ii];
    })(i);
  }

  const draw = regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      varying vec2 uv;
      uniform vec2 heightwiseAspect;
      void main () {
        uv = (xy) * heightwiseAspect;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision mediump float;
      varying vec2 uv;
      uniform float t;
      uniform vec3 bgColor;
      uniform vec2 origin[${nOrigins}];
      uniform float t0[${nOrigins}];
      void main () {
        float v = 2.0;
        float k = 10.0;
        float w = v * k;
        float wt = w * t;
        float totalMag = 0.0;

        float r, kwt, mag, falloff, phase, roll;

        for (int i = 0; i < ${nOrigins}; i++) {
          r = length(uv - origin[i]);
          phase = k * r - w * (t - t0[i]);
          roll = smoothstep(0.0, -2.0, phase) * smoothstep(-80.0, -30.0, phase) * exp(-(-phase - 5.0) / 80.0);
          mag = sin(phase) * roll;

          totalMag += mag;
        }

        totalMag *= totalMag;

        gl_FragColor = mix(
          vec4(1, 1, 1, 1),
          vec4(bgColor, 1),
          smoothstep(6.0, 0.3, totalMag)
        );
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: Object.assign({
      t: regl.context('time'),
      bgColor: bgColor,
      heightwiseAspect: ctx => [ctx.viewportWidth / ctx.viewportHeight, 1],
      widthwiseAspect: ctx => [1, ctx.viewportHeight / ctx.viewportWidth]
    }, originUniforms),
    depth: {enable: false},
    count: 3
  });

  return function (ctx) {
    for (i = 0; i < nOrigins; i++) {
      var t = originUniforms['t0[' + i + ']']();
      var standoff = 6.0;
      if (ctx.time > 3.0 && ctx.time > t + standoff) {
        randomizeOrigin(i, ctx.time + standoff * Math.random(), ctx.framebufferWidth / ctx.framebufferHeight); }
    }
    draw();
  }
}

function Sim3 (regl) {
  const mView = mat4create();
  const mProjection = mat4create();
  const mProjectionView = mat4create();
  mat4lookAt(mView, [0, 1, -2.0], [0, 0, 0], [0, 1, 0]);

  const draw = regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      varying vec2 uv;
      uniform vec2 aspectRatio;
      void main () {
        uv = xy * aspectRatio * aspectRatio;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision mediump float;
      varying vec2 uv;
      uniform float t;
      uniform vec3 bgColor;
      uniform mat4 projectionView;

      void main () {
        // This code is a mess and I have no idea why it works I did it all wrong oh no
        vec4 p1 = projectionView * vec4(uv, 0, 1);
        vec4 p2 = projectionView * vec4(uv, 1, 0);
        vec4 p = p1 - p2 * p1.z / p2.z;
        p / p.w;

        vec2 q = vec2(p.y * 1.25 - 4.0 * t, p.x * 1.25 * 0.5);
        float sqr = 0.5 + 0.5 * cos(2.8515 * floor(q.x / 3.1415926) + 2.11295 * floor(q.y / 3.1415926) - 2.0 * t);
        float f = sin(q.x) * sin(q.y) * sqr;
        f *= f;
        f = sin(3.0 * f);
        f *= f;
        f *= f;
        
        gl_FragColor = vec4(mix(bgColor, vec3(1), f), 1);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      projectionView: ctx => {
        mat4perspective(mProjection, Math.PI / 4, ctx.viewportWidth / ctx.viewportHeight, 0.1, 20.0);
        return mat4multiply(mProjectionView, mProjection, mView);
      },
      t: regl.prop('time'),
      bgColor: bgColor,
      aspectRatio: ctx => [ctx.viewportWidth / ctx.viewportHeight, 1],
    },
    primitive: 'triangle',
    count: 3,
  });

  return function (ctx) {
    draw(ctx);
  };
}

class FancyHeader extends React.Component {
  attachRegl (c) {
    const pixelRatio = 0.25;
    const getSize = () => ({
      width: () => c.clientWidth * pixelRatio,
      height: () => c.clientHeight * pixelRatio
    });

    this._regl = regl({
      pixelRatio: pixelRatio,
      attributes: {antialias: false, stencil: false, alpha: false},
      container: c,
      onDone: function (err, regl) {

        const sims = [
          Sim1(regl),
          Sim2(regl),
          Sim3(regl)
        ];

        let sim = Math.floor(Math.random() * sims.length);
        let lastSwitch = 0.0;

        regl.frame((ctx) => {
          if (ctx.time - lastSwitch > 10.0) {
            sim = (sim + 1) % sims.length;
            lastSwitch = ctx.time;
          }
          sims[sim](Object.assign(ctx, {time: ctx.time - lastSwitch}));
        });

        window.addEventListener('resize', function () {
          var size = getSize();
          regl._gl.canvas.width = size.width();
          regl._gl.canvas.height = size.height();
        }, false);

      }
    });
  }

  componentWillUnmount () {
    if (this._regl) {
      this._regl.destroy();
      this._regl = null;
    }
  }

  render () {
    return <div className="article-header">
      <div className="article-header__feature-container" ref={c => this.attachRegl(c)}></div>
      <div className="article-header__content">
        <h1 className="hed">{this.props.title}</h1>
      </div>
    </div>
  }
}

export default FancyHeader;
