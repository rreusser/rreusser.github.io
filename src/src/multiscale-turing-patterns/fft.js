'use strict';

var fft = require('glsl-fft');
var glsl = require('glslify');

module.exports = function (regl) {
  return function createFFT (width, height, ping, pong) {
    var buffers = {
      input: null,
      ping: {texture: ping, fbo: ping},
      pong: {texture: pong, fbo: pong},
      output: null,
    };

    var forwardSetup = fft({
      width: width,
      height: height,
      input: 'input',
      ping: 'ping',
      pong: 'pong',
      output: 'output',
      splitNormalization: true,
      forward: true
    });

    var inverseSetup = fft({
      width: width,
      height: height,
      input: 'input',
      ping: 'ping',
      pong: 'pong',
      output: 'output',
      splitNormalization: true,
      forward: false
    });

    var perform = regl({
      vert: `
        precision highp float;
        attribute vec2 xy;
        void main () {
          gl_Position = vec4(xy, 0, 1);
        }
      `,
      frag: glsl`
        precision highp float;

        #pragma glslify: fft = require(glsl-fft)

        uniform sampler2D uInput;
        uniform vec2 resolution;
        uniform float subtransformSize, normalization;
        uniform bool horizontal, forward;

        void main () {
          gl_FragColor = fft(
            uInput,
            resolution,
            subtransformSize,
            horizontal,
            forward,
            normalization
          );
        }
      `,
      attributes: {xy: [-4, -4, 0, 4, 4, -4]},
      uniforms: {
        uInput: (ctx, props) => buffers[props.input].texture,
        resolution: regl.prop('resolution'),
        subtransformSize: regl.prop('subtransformSize'),
        normalization: regl.prop('normalization'),
        horizontal: regl.prop('horizontal'),
        forward: regl.prop('forward'),
      },
      framebuffer: (ctx, props) => buffers[props.output].fbo,
      depth: {enable: false},
      count: 3
    });

    return {
      forward: function (props) {
        buffers.input = props.input;
        buffers.output = props.output;
        return perform(forwardSetup);
      },
      inverse: function (props) {
        buffers.input = props.input;
        buffers.output = props.output;
        return perform(inverseSetup);
      }
    };
  };
};
