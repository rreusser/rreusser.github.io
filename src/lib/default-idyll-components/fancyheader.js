import React from 'react';
import regl from 'regl';
import mat4lookAt from 'gl-mat4/lookAt'
import mat4perspective from 'gl-mat4/perspective'
import mat4multiply from 'gl-mat4/multiply'
import mat4create from 'gl-mat4/create'
import mat4invert from 'gl-mat4/invert'

const bgColor = [202 / 255, 71 / 255, 71 / 255];

function ease(t) {
  t = Math.max(0, Math.min(1, t));
  t /= 0.5;
  if (t < 1) return 0.5 * t * t;
  t--;
  return -0.5 * (t * (t - 2) - 1);
}

function Sim1 (regl) {
  return regl({
    frag: `
      precision mediump float;
      varying vec2 uv;
      uniform float t;
      uniform vec3 bgColor;
      void main () {
        float r = length(uv);

        float theta = atan(uv.y, uv.x) + t * 0.2;
        float f = sin(10.0 * (t - r) - 2.0 * theta) +
                  sin(sin(0.05 * t) * 9.0 * (t - r) + 10.0 * theta);
        f *= f;
        f *= f;
        f *= smoothstep(0.0, 3.0, r);
        f *= 0.1;

        gl_FragColor = mix(
          vec4(bgColor, 1),
          vec4(1, 1, 1, 1),
          f
        );
      }
    `,
  });
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
    uniforms: Object.assign({
      heightwiseAspect: ctx => [ctx.viewportWidth / ctx.viewportHeight, 1],
      widthwiseAspect: ctx => [1, ctx.viewportHeight / ctx.viewportWidth]
    }, originUniforms),
  });

  return function (ctx, reset) {
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
  mat4lookAt(mView, [0, 1.5, -1.5], [0, 0, 0], [0, 1, 0]);

  return regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      varying vec2 uv;
      uniform vec2 aspectRatio;
      void main () {
        uv = xy;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision mediump float;
      varying vec2 uv;
      uniform float t;
      uniform vec3 bgColor;
      uniform mat4 projectionViewInverse;

      void main () {
        // This code is a mess and I have no idea why it works I did it all wrong oh no
        vec4 p1 = projectionViewInverse * vec4(uv, 0, 1);
        vec4 p2 = projectionViewInverse * vec4(uv, 1, 1);
        p1 /= p1.w;
        p2 /= p2.w;
        float s = -p1.y / (p2.y - p1.y);
        vec2 p = p1.xz + (p2.xz - p1.xz) * s;

        vec2 q = vec2(p.y * 4.25 + 4.0 * t, p.x * 4.25 * 0.5);
        float sqr = 0.5 + 0.5 * cos(2.8515 * floor(q.x / 3.1415926) + 2.11295 * floor(q.y / 3.1415926) - 2.0 * t);
        float f = sin(q.x) * sin(q.y) * sqr;
        f *= f;
        f = sin(3.0 * f);
        f *= f;
        f *= f;
        
        gl_FragColor = vec4(mix(bgColor, vec3(1), f), 1);
      }
    `,
    uniforms: {
      projectionViewInverse: ctx => {
        mat4perspective(mProjection, Math.PI / 4, ctx.viewportWidth / ctx.viewportHeight, 0.1, 20.0);
        return mat4invert([], mat4multiply(mProjectionView, mProjection, mView));
      },
    },
  });
}

function Sim4 (regl) {
  return regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      varying vec2 uv;
      uniform vec2 aspectRatio;
      void main () {
        uv = xy * aspectRatio;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision mediump float;
      varying vec2 uv;
      uniform float t;
      uniform vec3 bgColor;

      void main () {
        float r = length(uv - vec2(0.0, 0.1));
        gl_FragColor = vec4(mix(
          bgColor,
          vec3(1),
          0.8 * mix(
            0.0,
            pow(0.5 + 0.5 * sin(8.0 * (1.0 / (1e-3 + r) + 2.5 * t)), 2.0),
            smoothstep(0.2, 1.0, r)
          )
        ), 1);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      bgColor: bgColor,
      aspectRatio: ctx => [ctx.viewportWidth / ctx.viewportHeight, 1],
    },
    primitive: 'triangle',
    count: 3,
  });
}

function Sim5 (regl) {
  return regl({
    frag: `
      precision mediump float;
      varying vec2 uv;
      uniform float t;
      uniform vec3 bgColor;

      // glsl-random
      // Copyright (c) 2014, Matt DesLauriers
      // All rights reserved.
      //
      // Redistribution and use in source and binary forms, with or without modification,
      // are permitted provided that the following conditions are met:
      //
      //  * Redistributions of source code must retain the above copyright notice,
      //    this list of conditions and the following disclaimer.
      //  * Redistributions in binary form must reproduce the above copyright notice,
      //    this list of conditions and the following disclaimer in the documentation
      //    and/or other materials provided with the distribution.
      //  * Neither the name of glsl-random nor the names of its contributors
      //    may be used to endorse or promote products derived from this software
      //    without specific prior written permission.
      //
      // THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
      // "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
      // LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
      // A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
      // CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
      // EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
      // PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
      // PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
      // LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
      // NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
      // SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
      float random(vec2 co) { return fract(sin(dot(co.xy,vec2(1.9898,7.233))) * 4.5453); }

      void main () {
        vec2 uvs = uv * 2.0;
        vec2 ij = floor(uvs);
        vec2 minPoint = vec2(0);

        float minLength = 10.0;
        for (int i = -2; i <= 2; i++) {
          for (int j = -2; j <= 2; j++) {
            vec2 offsetPoint = ij + vec2(float(i), float(j));
            float xOffset = random(offsetPoint);
            float yOffset = random(offsetPoint + 10.0);
            float phase = random(offsetPoint - 10.0) * 3.14159 * 2.0;
            float theta = t - phase;
            vec2 p = offsetPoint + vec2(xOffset, yOffset) + 0.5 * vec2(cos(theta), sin(theta));
            float r = distance(uvs, p);
            if (r > minLength) continue;

            minPoint = offsetPoint;
            minLength = r;
          }
        }

        gl_FragColor = vec4(mix(
          vec3(1),
          bgColor,
          sqrt(smoothstep(1.2, 0.2, minLength))
        ), 1);
      }
    `,
  });
}

class FancyHeader extends React.Component {
  attachRegl (c) {
    const pixelRatio = window.innerWidth < 500 ? 0.5 : 0.25;
    const getSize = () => ({
      width: () => c.clientWidth * pixelRatio,
      height: () => c.clientHeight * pixelRatio
    });

    this._regl = regl({
      pixelRatio: pixelRatio,
      attributes: {antialias: false, stencil: false, alpha: false},
      container: c,
      onDone: function (err, regl) {

        const configure = regl({
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
          attributes: {xy: [-4, -4, 0, 4, 4, -4]},
          uniforms: {
            t: regl.prop('time'),
            bgColor: bgColor,
            aspectRatio: ctx => [ctx.viewportWidth / ctx.viewportHeight, 1],
          },
          depth: {enable: false},
          count: 3,
          blend: {
            enable: true,
            func: {
              srcRGB: 'constant alpha',
              srcAlpha: 1,
              dstRGB: 'one minus constant alpha',
              dstAlpha: 1
            },
            equation: {
              rgb: 'add',
              alpha: 'add'
            },
            color: (ctx, props) => [0, 0, 0, props.alpha]
          }
        });

        const sims = [
          Sim1(regl),
          Sim2(regl),
          Sim3(regl),
          Sim4(regl),
          Sim5(regl)
        ];

        let sim = Math.floor(Math.random() * sims.length);
        let lastSwitch = null;
        let prevLastSwitch = null;

        let t = 0.0;
        function next () {
          sim = (sim + 1) % sims.length;
          prevLastSwitch = lastSwitch;
          lastSwitch = t;
        }

        regl._gl.canvas.addEventListener('click', next);

        regl.frame((ctx) => {
          t = ctx.time;
          if (lastSwitch == null) lastSwitch = prevLastSwitch = -1;
          if (t - lastSwitch > 10.0) next();
          const alpha = ease(t - lastSwitch);

          if (alpha < 1.0) {
            configure({alpha: 1, time: t - prevLastSwitch}, () => {
              sims[sim](ctx);
            })
          }
          configure({alpha, time: t - lastSwitch}, () => {
            sims[(sim + 1) % sims.length](ctx);
          });
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
