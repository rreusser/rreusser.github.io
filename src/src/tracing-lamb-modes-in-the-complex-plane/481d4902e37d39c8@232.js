function _1(md){return(
md`# Jacob Rus' Rainbow Colorscale`
)}

function _createREGL(require){return(
require('regl')
)}

function _w(){return(
512
)}

function _h(){return(
64
)}

function _regl(createREGL,DOM,w,h){return(
createREGL({
  canvas: DOM.canvas(w, h),
  pixelRatio: 1,
  attributes: { preserveDrawingBuffer: true }
})
)}

function _6(regl){return(
regl._gl.canvas
)}

function _rainbow(createRainbow){return(
createRainbow()
)}

function _createRainbow(regl,transfer,colormapTex2,unwrapPolar,colormapTex,w,h){return(
function createRainbow(opts) {
  opts = opts || {};
  var saturation = opts.saturation === undefined ? 1 : opts.saturation;
  var lightnessRange =
    opts.lightnessRange === undefined ? [0.95, 0.95] : opts.lightnessRange;

  regl.poll();

  if (true) {
    transfer({
      src: colormapTex2,
      lightnessRange: lightnessRange,
      saturation: saturation
    });
  } else {
    unwrapPolar({
      src: colormapTex,
      lightnessRange: lightnessRange,
      saturation: saturation
    });
  }

  regl.poll();

  return {
    mag: 'linear',
    min: 'linear',
    wrapS: 'repeat',
    wrapT: 'clamp',
    width: w,
    height: h,
    data: regl.read()
  };
}
)}

function _colormapTex(regl,colormapImg){return(
regl.texture({
  data: colormapImg,
  min: 'linear',
  mag: 'linear'
})
)}

function _colormapTex2(regl,colormapImg2){return(
regl.texture({
  data: colormapImg2,
  min: 'linear',
  mag: 'linear',
  flipY: true
})
)}

function _transfer(regl,yuv2rgb,rgb2yuv){return(
regl({
  vert: `
    precision highp float;
    attribute vec2 xy;
    varying vec2 uv;
    void main () {
      uv = 0.5 + 0.5 * xy;
      gl_Position = vec4(xy, 0, 1);
    }`,
  frag: `
    precision highp float;

    ${yuv2rgb}
    ${rgb2yuv}

    uniform sampler2D src;
    uniform vec2 lightnessRange;
    uniform float saturation;
    varying vec2 uv;
    void main () {
      vec3 rgb = texture2D(src, uv).rgb;

      vec3 yuv = rgb2yuv(rgb);
      yuv.x *= mix(lightnessRange.x, lightnessRange.y, pow(uv.y, 1.0));
      yuv.yz *= saturation;

      rgb = yuv2rgb(yuv);

      gl_FragColor = vec4(rgb, 1);
    }`,
  attributes: {
    xy: [-4, -4, 4, -4, 0, 4]
  },
  depth: { enable: false },
  uniforms: {
    src: regl.prop('src'),
    lightnessRange: regl.prop('lightnessRange'),
    saturation: regl.prop('saturation')
  },
  count: 3
})
)}

function _unwrapPolar(regl,yuv2rgb,rgb2yuv,colormapTex){return(
regl({
  vert: `
    precision highp float;
    attribute vec2 xy;
    varying vec2 uv;
    void main () {
      uv = 0.5 + 0.5 * xy;
      gl_Position = vec4(xy, 0, 1);
    }`,
  frag: `
    precision highp float;

    ${yuv2rgb}
    ${rgb2yuv}

    uniform sampler2D src;
    uniform vec2 lightnessRange;
    uniform float saturation;
    varying vec2 uv;
    #define PI 3.14159265358979;
    void main () {
      float theta = (0.75 - uv.x) * 2.0 * PI;
      float r = 0.75;
      vec2 p = 0.5 + 0.5 * vec2(cos(theta), sin(theta)) * r;
      vec3 rgb = texture2D(src, p).rgb;

      vec3 yuv = rgb2yuv(rgb);
      yuv.x *= mix(lightnessRange.x, lightnessRange.y, pow(uv.y, 1.0));
      yuv.yz *= saturation;

      rgb = yuv2rgb(yuv);

      gl_FragColor = vec4(rgb, 1);
    }`,
  attributes: {
    xy: [-4, -4, 4, -4, 0, 4]
  },
  depth: { enable: false },
  uniforms: {
    src: colormapTex,
    lightnessRange: regl.prop('lightnessRange'),
    saturation: regl.prop('saturation')
  },
  count: 3
})
)}

function _yuv2rgb(){return(
`
  vec3 yuv2rgb (vec3 yuv) {
    return vec3(
      yuv.x + yuv.z * 1.4,
      yuv.x + yuv.y * -0.343 + yuv.z * -0.711,
      yuv.x + yuv.y * 1.765
    );
  }
`
)}

function _rgb2yuv(){return(
`
  vec3 rgb2yuv (vec3 rgb) {
    return vec3 (
      rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114,
      rgb.r * -0.169 + rgb.g * -0.331 + rgb.b * 0.5,
      rgb.r * 0.5 + rgb.g * -0.419 + rgb.b * -0.081
    );
  }
`
)}

async function _colormapImg(FileAttachment)
{
  var img = new Image();
  img.crossOrigin = "anonymous";
  img.src = await (await FileAttachment("colormap.png")).url();
  return new Promise(resolve => (img.onload = () => resolve(img)));
}


async function _colormapImg2(FileAttachment)
{
  var img = new Image();
  img.crossOrigin = "anonymous";
  img.src = await (await FileAttachment("rainbow.png")).url();
  return new Promise(resolve => (img.onload = () => resolve(img)));
}


export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["colormap.png", {url: new URL("./files/3ccaeebc8a14464ee129aa73b09a625f291be269f2f535857995d9dcb5e35a1aa3fb209dcfc0ccd2884f68477b235554e57d826e15bb021bafa1e55cca3ba193.png", import.meta.url), mimeType: "image/png", toString}],
    ["rainbow.png", {url: new URL("./files/ce8c4472649f19d5145f8fc36b2cb414dfed474055cfc54a25e17fa158dec258b00435db844bc945cbbe5613f6260334d932477b5be4d224ab9564d2fa9bc20b.png", import.meta.url), mimeType: "image/png", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("createREGL")).define("createREGL", ["require"], _createREGL);
  main.variable(observer("w")).define("w", _w);
  main.variable(observer("h")).define("h", _h);
  main.variable(observer("regl")).define("regl", ["createREGL","DOM","w","h"], _regl);
  main.variable(observer()).define(["regl"], _6);
  main.variable(observer("rainbow")).define("rainbow", ["createRainbow"], _rainbow);
  main.variable(observer("createRainbow")).define("createRainbow", ["regl","transfer","colormapTex2","unwrapPolar","colormapTex","w","h"], _createRainbow);
  main.variable(observer("colormapTex")).define("colormapTex", ["regl","colormapImg"], _colormapTex);
  main.variable(observer("colormapTex2")).define("colormapTex2", ["regl","colormapImg2"], _colormapTex2);
  main.variable(observer("transfer")).define("transfer", ["regl","yuv2rgb","rgb2yuv"], _transfer);
  main.variable(observer("unwrapPolar")).define("unwrapPolar", ["regl","yuv2rgb","rgb2yuv","colormapTex"], _unwrapPolar);
  main.variable(observer("yuv2rgb")).define("yuv2rgb", _yuv2rgb);
  main.variable(observer("rgb2yuv")).define("rgb2yuv", _rgb2yuv);
  main.variable(observer("colormapImg")).define("colormapImg", ["FileAttachment"], _colormapImg);
  main.variable(observer("colormapImg2")).define("colormapImg2", ["FileAttachment"], _colormapImg2);
  return main;
}
