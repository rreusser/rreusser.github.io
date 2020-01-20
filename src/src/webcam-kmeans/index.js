'use strict';

var createCamera = require('./regl-turntable-camera');
var createInteractions = require('./interactions');
var createTextureLookupTable = require('./texture-lookup-table');
var failNicely = require('fail-nicely');
var getWebcam = require('./get-webcam');
var Controls = require('controls-state');
var GUI = require('controls-gui');

// Force https when deployed since http doesn't allow video (localhost is fine)
if (window.location.host === "rreusser.github.io" && window.location.protocol !== 'https:') {
  window.location = 'https://rreusser.github.io/webcam-kmeans/';
}

var yuv2rgb = `
  vec3 fromColorspace (vec3 yuv, float uvScale) {
    // Careful. I fudged the colorspace to get things geometrically nice.
    yuv.x += 0.5 / uvScale;
    yuv.yz -= 0.5;
    yuv.x *= uvScale;
    return vec3(
      yuv.x + yuv.z * 1.4,
      yuv.x + yuv.y * -0.343 + yuv.z * -0.711,
      yuv.x + yuv.y * 1.765
    );
  }
`;

var rgb2yuv = `
  vec3 toColorspace (vec3 rgb, float uvScale) {
    // Careful. I fudged the colorspace to get things geometrically nice.
    return vec3 (
      (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / uvScale - 0.5 / uvScale,
      (rgb.r * -0.169 + rgb.g * -0.331 + rgb.b * 0.5) + 0.5,
      (rgb.r * 0.5 + rgb.g * -0.419 + rgb.b * -0.081) + 0.5
    );
  }
`;

var toNoop = `
  vec3 toColorspace (vec3 rgb, float uvScale) {
    rgb.x -= 0.5;
    return rgb;
  }
`;

var fromNoop = `
  vec3 fromColorspace (vec3 rgb, float uvScale) {
    rgb.x += 0.5;
    return rgb;
  }
`;

var container = document.createElement('div');
container.id = 'container';
container.style.width = '640px';
container.style.height = '540px';
document.body.appendChild(container);

require('insert-css')(`
@import url('https://fonts.googleapis.com/css?family=Fira+Sans+Condensed');

.sketch-nav {
  right: auto !important;
  left: 0 !important;
}

body, html {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: rgba(20, 20, 20, 1);
}
`);

require('regl')({
  pixelRatio: Math.min(window.devicePixelRatio, 1.5, 2),
  extensions: [
    'ANGLE_instanced_arrays',
    'OES_texture_float',
  ],
  attributes: {
    antialias: false,
    stencil: false,
    alpha: false,
  },
  onDone: failNicely(regl => getWebcam(failNicely(video => run(regl, video))))
});

function run (regl, video) {
  var width = regl._gl.canvas.width;
  var height = regl._gl.canvas.height;
  var videoWidth = 640;
  var videoHeight = 480;

  var state = GUI(Controls({
    hi: Controls.Raw(h => h('p', {style: 'max-width: 270px'},
      'K-means in WebGL using ', h('a', {href: 'https://en.wikipedia.org/wiki/Lloyd%27s_algorithm'}, "Lloyd's Algorithm"), '.'
    )),
    k: Controls.Slider(5, {min: 2, max: 20, label: 'k'}).onChange(props => resize(state.k, state.colorSpace)),
    colorSpace: Controls.Select('YUV', {options: ['YUV', 'RGB'], label: 'Color space'}).onChange(props => resize(state.k, state.colorSpace)),
    uvScale: Controls.Slider(0.5, {min: 0.01, max: 2.0, step: 0.01, label: 'Y scale'}),
    labelOpacity: Controls.Slider(0.4, {min: 0.0, max: 1.0, step: 0.01, label: 'Label opacity'}),
    fullPageVideo: Controls.Checkbox(false, {label: 'Full size video'}),
  }), {
    containerCSS: "position:absolute; top:0; right:8px; min-width:300px; max-width:100%",
    theme: {fontFamily: "'Fira Sans Condensed', sans-serif"}
  });

  function targetState (state) {
    return {
      fullPageVideo: state.fullPageVideo ? 1 : 0,
      labelOpacity: state.labelOpacity,
    };
  }

  var easedState = targetState(state);

  function easeState (easedState, state, dt) {
    var decay = Math.exp(-dt / 0.15);
    if (!easedState) easedState = targetState(state);
    easedState.fullPageVideo = easedState.fullPageVideo * decay + state.fullPageVideo * (1.0 - decay);
    easedState.labelOpacity = easedState.labelOpacity * decay + state.labelOpacity * (1.0 - decay);
  }

  var camera = createCamera(regl, {
    center: [0, 0.5, 0.5],
    distance: 1.5,
    phi: 0.3,
    theta: 0.3
  });
  createInteractions(camera);

  var videoTexture = regl.texture({
    data: video,
    flipY: true,
    width: videoWidth,
    height: videoHeight,
  });

  var createMeans = function (k) {
    return new Array(k).fill(0).map((d, i) => [Math.random(), Math.random(), Math.random()]);
  }

  var accumulatorTextures = new Array(2).fill(0).map(() => regl.texture({
    type: 'float',
    format: 'rgba',
    width: state.k,
    height: 1
  }));

  var accumulatorFbos = accumulatorTextures.map(texture => regl.framebuffer({color: texture}));

  function resize (newK) {
    var oldK = means.length;
    if (newK < means.length) {
      means.length = newK;
    } else if (newK > means.length) {
      for (var i = oldK; i < newK; i++) {
        means[i] = [Math.random(), Math.random(), Math.random()];
      }
    }
  
    for (var i = 0; i < accumulatorTextures.length; i++) {
      accumulatorTextures[i] = accumulatorTextures[i]({
        type: 'float',
        format: 'rgba',
        width: newK,
        height: 1
      });
      accumulatorFbos[i] = accumulatorFbos[i]({color: accumulatorTextures[i]});
    }

    meansData = new Float32Array(newK * 4);
    meansBuffer = meansBuffer(meansData);
  }

  var createMeansProps = function (k) {
    var result = {};
    for (var i = 0; i < k; i++) {
      result['mean'+i] = regl.prop('means['+i+']');
    }
    return result;
  }

  var means = createMeans(state.k);
  var lookup = createTextureLookupTable(videoWidth, videoHeight);
  var aabb = regl.buffer([-0.5, 0, 0, 0.5, 1, 1]);

  function reseedDegenerateMeans (data) {
    var k = data.length / 4;

    /*
    var tmpMeans = [];
    for (var i = 0, i4 = 0; i < k; i++, i4 += 4) {
      tmpMeans[i] = [
        data[i4],
        data[i4 + 1],
        data[i4 + 2],
        data[i4 + 3]
      ];
    }
    tmpMeans.sort(function (a, b) {
      return b[3] - a[3];
    });

    for (var i = 0, i4 = 0; i < k; i++, i4 += 4) {
      data[i4] = tmpMeans[i][0];
      data[i4 + 1] = tmpMeans[i][1];
      data[i4 + 2] = tmpMeans[i][2];
      data[i4 + 3] = tmpMeans[i][3];
    }
    */

    var lastValid = -1;
    var allValid = false;
    while (!allValid) {
      allValid = true;
      for (var i = 0, i4 = 0; i < k; i++, i4 += 4) {
        if (data[i4 + 3]) {
          lastValid = i;

          data[i4    ] /= data[i4 + 3];
          data[i4 + 1] /= data[i4 + 3];
          data[i4 + 2] /= data[i4 + 3];
          data[i4 + 3] = 1;

        } else {
          allValid = false;
          if (lastValid >= 0) {
            var j4 = lastValid * 4;
            data[i4    ] = data[j4    ] + (Math.random() - 0.5) * 0.001;
            data[i4 + 1] = data[j4 + 1] + (Math.random() - 0.5) * 0.001;
            data[i4 + 2] = data[j4 + 2] + (Math.random() - 0.5) * 0.001;
            data[i4 + 3] = 1;
          }
        }
      }
    }
  }

  var clipViewport = regl({
    viewport: {y: 100},
    scissor: {enable: true, box: {y: 100}},
  });

  var drawAabbs = require('./draw-aabbs')(regl);

  var rgbShaderCache = {};
  var yuvShaderCache = {};
  function getShaders (newK, colorSpace) {
    var cache = colorSpace === 'YUV' ? yuvShaderCache : rgbShaderCache;
    if (cache[newK]) return cache[newK];
    
    cache[newK] = {
      drawToScreen: regl({
        vert: `
          precision highp float;
          attribute vec2 aUV;
          uniform sampler2D src;//, uColorscale;
          uniform mat4 uProjectionView;
          uniform float uvScale, uLabel, uPointSize;
          uniform vec2 uAspect;
          uniform float uDisplayVideo;
          varying vec3 vRGB, vMeanRGB;
          ${new Array(newK).fill(0).map((d, k) => `uniform vec3 mean${k};`).join('\n')}

          ${colorSpace === 'YUV' ? rgb2yuv : toNoop}
          ${colorSpace === 'YUV' ? yuv2rgb : fromNoop}

          float len (vec3 a, vec3 b) {
            vec3 dx = a - b;
            return dot(dx, dx);
          }

          void main () {
            vRGB = texture2D(src, aUV).xyz;
            vec3 yuv = toColorspace(vRGB, uvScale);

            vec3 meanYUV = vec3(0);
            float minLength = 10000.0;
            float minIndex = -1.0;
            float l;

            ${new Array(newK).fill(0).map((d, k) => `
              if ((l = len(yuv, mean${k})) < minLength) {
                meanYUV = mean${k};
                minLength = l;
                minIndex = ${k}.0;
              }
            `).join('')}

            vMeanRGB = fromColorspace(meanYUV, uvScale);

            vRGB = mix(vRGB, vMeanRGB, uLabel);

            gl_Position = mix(
              uProjectionView * vec4(yuv, 1),
              vec4(
                (vec2(-1, 1) * (aUV * 2.0 - 1.0)) * uAspect,
                0.99, 1
              ),
              uDisplayVideo
            );
            gl_PointSize = uPointSize;
          }
        `,
        frag: `
          precision highp float;
          varying vec3 vRGB;
          void main () {
            gl_FragColor = vec4(vRGB, 1);
          }
        `,
        attributes: {
          aUV: regl.buffer(lookup)
        },
        blend: {
          enable: false,
          func: {srcRGB: 'src alpha', srcAlpha: 1, dstRGB: 1, dstAlpha: 1},
          equation: {rgb: 'add', alpha: 'add'}
        },
        uniforms: Object.assign({
          uAspect: (ctx) => {
            var videoAR = videoWidth / videoHeight;
            var pageAR = window.innerWidth / (window.innerHeight - 100)
            if (videoAR > pageAR) {
              return [1, pageAR / videoAR];
            } else {
              return [videoAR / pageAR, 1];
            }

          },
          uPointSize: ctx => 2.0 * ctx.pixelRatio,
          src: regl.prop('video'),
          uDisplayVideo: regl.prop('fullPageVideo'),
          uvScale: () => 1 / state.uvScale,
          uLabel: () => easedState.labelOpacity,
        }, createMeansProps(newK)),
        primitive: 'points',
        depth: {enable: true},
        count: videoWidth * videoHeight,
      }),

      accumulate: regl({
        vert: `
          precision highp float;
          attribute vec2 aUV;
          uniform sampler2D src;
          ${new Array(newK).fill(0).map((d, k) => `uniform vec3 mean${k};`).join('\n')}
          varying vec3 vYUV;
          uniform float uvScale;
          const float k = ${newK}.0;

          ${colorSpace === 'YUV' ? rgb2yuv : toNoop}

          float len (vec3 a, vec3 b) {
            vec3 dx = a - b;
            return dot(dx, dx);
          }

          void main () {
            vYUV = toColorspace(texture2D(src, aUV).xyz, uvScale);

            float minLength = 10000.0;
            float minIndex = -1.0;
            float l;
            ${new Array(newK).fill(0).map((d, k) => `
              if ((l = len(vYUV, mean${k})) < minLength) { minLength = l; minIndex = ${k}.0; }
            `).join('')}

            gl_Position = vec4((minIndex + 0.5) / k * 2.0 - 1.0, 0.0, 0.0, 1.0);
            gl_PointSize = 1.0;
          }
        `,
        frag: `
          precision highp float;
          varying vec3 vYUV;
          void main () {
            gl_FragColor = vec4(vYUV, 1);
          }
        `,
        blend: {
          enable: true,
          func: {srcRGB: 1, srcAlpha: 1, dstRGB: 1, dstAlpha: 1},
          equation: {rgb: 'add', alpha: 'add'}
        },
        attributes: {
          aUV: regl.buffer(lookup)
        },
        uniforms: Object.assign({
          src: regl.prop('video'),
          uvScale: () => 1 / state.uvScale,
        }, createMeansProps(newK)),
        primitive: 'points',
        framebuffer: accumulatorFbos[0],
        depth: {enable: false},
        count: videoWidth * videoHeight,
      }),

      drawMeansToScreen: regl({
        vert: `
          precision highp float;
          attribute vec4 aColor;
          uniform float uvScale, uPointSize;
          varying vec3 vRGB;
          uniform mat4 uProjectionView;

          ${colorSpace === 'YUV' ? yuv2rgb : fromNoop}

          void main () {
            vec3 yuv = aColor.xyz;
            vRGB = fromColorspace(yuv, uvScale);
            gl_Position = uProjectionView * vec4(yuv, 1);
            gl_PointSize = uPointSize;
          }
        `,
        frag: `
          precision highp float;
          varying vec3 vRGB;
          void main () {
            vec2 dx = gl_PointCoord.xy - 0.5;
            float r = dot(dx, dx) * 4.0;
            gl_FragColor = vec4(mix(
              vRGB,
              vec3(1, 0, 0),
              smoothstep(0.3, 1.0, r)
            ), smoothstep(1.0, 0.7, r));
          }
        `,
        attributes: {
          aColor: regl.prop('buffer'),
        },
        blend: {
          enable: true,
          func: {
            srcRGB: 'src alpha',
            srcAlpha: 1,
            dstRGB: 'one minus src alpha',
            dstAlpha: 1,
          },
          equation: {
            rgb: 'add',
            alpha: 'add',
          }
        },
        uniforms: {
          uPointSize: ctx => 15.0 * ctx.pixelRatio,
          uDisplayVideo: regl.prop('fullPageVideo'),
          uvScale: () => 1 / state.uvScale,
        },
        primitive: 'points',
        depth: {enable: false},
        count: newK,
      }),
      debugMeans: regl({
        vert: `
          precision highp float;
          attribute vec2 xy;
          attribute float kIndex;
          attribute vec4 mean;
          uniform float k;
          uniform float uvScale;
          varying vec3 vRGB;

          ${colorSpace === 'YUV' ? yuv2rgb : fromNoop}

          void main () {
            vRGB = fromColorspace(mean.rgb, uvScale);
            vec2 uv = xy;
            uv.x += kIndex;;
            uv.x /= k;
            uv = uv * 2.0 - 1.0;
            gl_Position = vec4(uv, 0, 1);
          }
        `,
        frag: `
          precision highp float;
          varying vec3 vRGB;
          void main () {
            gl_FragColor = vec4(vRGB, 1);
          }
        `,
        attributes: {
          xy: [0, 0, 1, 0, 0, 1, 1, 1],
          kIndex: {
            buffer: new Uint8Array(new Array(newK).fill(0).map((d, i) => i)),
            divisor: 1,
          },
          mean: {
            buffer: regl.prop('means'),
            divisor: 1,
          },
        },
        uniforms: {
          uvScale: () => 1 / state.uvScale,
          k: newK,
        },
        primitive: 'triangle strip',
        depth: {enable: false},
        instances: newK,
        count: 4,
        viewport: {height: 100},
        scissor: {enable: true, box: {height: 100}},
      }),
      drawVideo: regl({
        vert: `
          precision highp float;
          attribute vec2 aUV;
          varying vec2 vUV;
          uniform vec2 uAspect;
          uniform vec2 uShift;
          uniform float uScale;
          void main () {
            vUV = aUV ;
            gl_Position = vec4((aUV + uShift) * uAspect * uScale - vec2(1, -1), 0, 1);
          }
        `,
        frag: `
          precision highp float;
          varying vec2 vUV;
          uniform sampler2D src;
          uniform float uvScale, uLabel;
          uniform float uOpacity;

          ${new Array(newK).fill(0).map((d, k) => `uniform vec3 mean${k};`).join('\n')}

          ${colorSpace === 'YUV' ? rgb2yuv : toNoop}
          ${colorSpace === 'YUV' ? yuv2rgb : fromNoop}

          float len (vec3 a, vec3 b) {
            vec3 dx = a - b;
            return dot(dx, dx);
          }

          void main () {
            vec3 rgb = texture2D(src, vec2(1.0 - vUV.x, vUV.y)).xyz;
            vec3 yuv = toColorspace(rgb, uvScale);

            float minLength = 10000.0;
            float minIndex = -1.0;
            vec3 meanYUV = vec3(0);
            float l;

            ${new Array(newK).fill(0).map((d, k) => `
              if ((l = len(yuv, mean${k})) < minLength) {
                meanYUV = mean${k};
                minLength = l;
                minIndex = ${k}.0;
              }
            `).join('')}

            vec3 meanRGB = fromColorspace(meanYUV, uvScale);

            rgb = mix(rgb, meanRGB, uLabel);

            gl_FragColor = vec4(rgb, uOpacity);
          }
        `,
        attributes: {
          aUV: [1, 0, 1, 1, 0, 0, 0, 1]
        },
        blend: {
          enable: true,
          func: {
            srcRGB: 'src alpha',
            srcAlpha: 1,
            dstRGB: 'one minus src alpha',
            dstAlpha: 1,
          },
          equation: {
            rgb: 'add',
            alpha: 'add',
          }
        },
        uniforms: Object.assign({
          uShift: regl.prop('shift'),
          uAspect: (ctx, props) => [window.innerHeight / window.innerWidth, videoHeight / videoWidth],
          src: regl.prop('src'),
          uPointSize: ctx => 2.0 * ctx.pixelRatio,
          uOpacity: (ctx, props) => 1 - props.fullPageVideo,
          uvScale: () => 1 / state.uvScale,
          uLabel: regl.prop('labelOpacity'),
          uScale: regl.prop('scale'),
        }, createMeansProps(newK)),
        primitive: 'triangle strip',
        depth: {enable: false},
        count: 4
      })
    };
    return cache[newK];
  }
  
  var meansData = new Float32Array(state.k * 4);
  var meansBuffer = regl.buffer(meansData);
  var previousTime = -1 / 60;
  var loop = regl.frame(({tick, time}) => {
    try {
      //if (tick % 8 !== 1) return;
      var k = means.length;
      var shaders = getShaders(k, state.colorSpace);
      var dt = time - previousTime
      easeState(easedState, state, dt);

      videoTexture.subimage(video);

      accumulatorFbos[0].use(() => {
        regl.clear({color: [0, 0, 0, 0]});
        shaders.accumulate({
          video: videoTexture,
          means: means
        });
        regl.read(meansData);
      });

      reseedDegenerateMeans(meansData);
      var decay = Math.exp(-dt / 0.01);

      for (var i = 0, i4 = 0; i < k; i++, i4 += 4) {
        meansData[i4    ] = means[i][0] = decay * means[i][0] + (1.0 - decay) * meansData[i4    ];
        meansData[i4 + 1] = means[i][1] = decay * means[i][1] + (1.0 - decay) * meansData[i4 + 1];
        meansData[i4 + 2] = means[i][2] = decay * means[i][2] + (1.0 - decay) * meansData[i4 + 2];
      }
      meansBuffer.subdata(meansData);

      camera.tick();
      camera.setUniforms(() => {
        clipViewport(() => {
          regl.clear({color: [0.12, 0.12, 0.12, 1]});

          shaders.drawToScreen({
            video: videoTexture,
            fullPageVideo: easedState.fullPageVideo,
            means: means,
          });

          shaders.drawMeansToScreen({buffer: meansBuffer, count: k});

          drawAabbs({
            aabbs: aabb,
            count: 1,
            color: [1, 1, 1, 1],
            scale: state.colorSpace === 'YUV' ? [state.uvScale, 1, 1] : [1, 1, 1],
          });
        });

        shaders.debugMeans({means: meansBuffer})
      });

      if (easedState.fullPageVideo < 0.99999) {
        shaders.drawVideo({
          shift: [0, -2],
          fullPageVideo: easedState.fullPageVideo,
          src: videoTexture,
          means: means,
          labelOpacity: 1,
          scale: 0.75,
        });
        shaders.drawVideo({
          shift: [0, -1],
          fullPageVideo: easedState.fullPageVideo,
          src: videoTexture,
          means: means,
          labelOpacity: 0,
          scale: 0.75,
        });
      }

      previousTime = time;
    } catch (err) {
      loop.cancel();
      throw err;
    }
  });
}
