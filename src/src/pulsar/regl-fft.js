'use strict';

var planFFT = require('glsl-fft');
var glsl = require('glslify');

module.exports = function (regl, options) {
  var fftInversePasses = planFFT({
    width: options.width,
    height: options.height,
    input: 'input',
    ping: 'ping',
    pong: 'pong',
    output: 'output',
    forward: false,
    splitNormalization: options.splitNormalization
  });

  var fftForwardPasses = planFFT({
    width: options.width,
    height: options.height,
    input: 'input',
    ping: 'ping',
    pong: 'pong',
    output: 'output',
    forward: true,
    splitNormalization: options.splitNormalization
  });

  var fftKernel = regl({
    vert: `
      precision highp float;
      attribute vec2 aUV;
      void main () {
        gl_Position = vec4(aUV, 0, 1);
      }`,
    frag: glsl`
      precision highp float;
      #pragma glslify: fft = require(glsl-fft)
      uniform sampler2D src;
      uniform vec2 resolution;
      uniform float subtransformSize, normalization;
      uniform bool horizontal, forward;
      void main () {
        gl_FragColor = fft(src, resolution, subtransformSize, horizontal, forward, normalization);
      }`,
    attributes: {aUV: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      src: (ctx, props) => fftFbos[props.input],
      resolution: (ctx, props) => [props.resolution[0], 1.0 / ctx.framebufferHeight],
      subtransformSize: regl.prop('subtransformSize'),
      horizontal: regl.prop('horizontal'),
      forward: regl.prop('forward'),
      normalization: regl.prop('normalization'),
    },
    framebuffer: (ctx, props) => fftFbos[props.output],
    depth: {enable: false},
    count: 3
  });

  var fftFbos = {
    ping: options.ping,
    pong: options.pong
  };
  
  return function fft(dir, input, output) {
    fftFbos.input = input;
    fftFbos.output = output;
    fftKernel(dir > 0 ? fftForwardPasses : fftInversePasses);
  }
}
