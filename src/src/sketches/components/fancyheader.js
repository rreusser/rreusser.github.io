import React from 'react';
import regl from 'regl';

class FancyHeader extends React.Component {
  attachRegl (c) {
    const pixelRatio = 0.25;
    const bgColor = [202 / 255, 71 / 255, 71 / 255];
    const getSize = () => ({
      width: () => c.clientWidth * pixelRatio,
      height: () => c.clientHeight * pixelRatio
    });

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

    this._regl = regl({
      pixelRatio: pixelRatio,
      attributes: {antialias: false, stencil: false, alpha: false},
      container: c,
      onDone: function (err, regl) {
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
          viewport: getSize(),
          depth: {enable: false},
          count: 3
        });

        regl.frame(({time, framebufferWidth, framebufferHeight}) => {
          for (i = 0; i < nOrigins; i++) {
            var t = originUniforms['t0[' + i + ']']();
            var standoff = 6.0;
            if (time > 3.0 && time > t + standoff) {
              randomizeOrigin(i, time + standoff * Math.random(), framebufferWidth / framebufferHeight); }
          }

          regl.clear({color: bgColor});
          draw();
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
