const mat3create = require('gl-mat3/create');

const DEFAULT_MARGIN = { t: 0, r: 0, b: 0, l: 0 };

module.exports = function createReglViewportConfiguration(regl) {
  const viewport3 = mat3create();

  let command = regl({
    scissor: {
      enable: true,
      box: {
        x: (ctx, props) => ctx.pixelRatio * props.margin.l,
        y: (ctx, props) => ctx.pixelRatio * props.margin.b,
        width: (ctx, props) =>
          ctx.viewportWidth -
          ctx.pixelRatio * (props.margin.r + props.margin.l),
        height: (ctx, props) =>
          ctx.viewportHeight -
          ctx.pixelRatio * (props.margin.t + props.margin.b)
      }
    },
    viewport: {
      x: (ctx, props) => ctx.pixelRatio * props.margin.l,
      y: (ctx, props) => ctx.pixelRatio * props.margin.b,
      width: (ctx, props) =>
        ctx.viewportWidth -
        ctx.pixelRatio * (props.margin.r + props.margin.l),
      height: (ctx, props) =>
        ctx.viewportHeight -
        ctx.pixelRatio * (props.margin.t + props.margin.b)
    },
    uniforms: {
      viewportResolution: (ctx, props) => [
        ctx.viewportWidth,
        ctx.viewportHeight
      ],
      framebufferResolution: (ctx) => [
        ctx.framebufferWidth,
        ctx.framebufferHeight
      ],
      inverseViewportResolution: (ctx, props) => [
        1 / ctx.viewportWidth,
        1 / ctx.viewportHeight
      ],
      inverseFramebufferResolution: (ctx) => [
        1 / ctx.framebufferWidth,
        1 / ctx.framebufferHeight
      ],
      pixelRatio: regl.context("pixelRatio")
    }
  });

  return function (viewport, callback) {
    const margin = Object.assign({}, DEFAULT_MARGIN);
    if (viewport && viewport.margin) Object.assign(margin, viewport.margin);
    command({ margin }, callback);
  };
};
