module.exports = function (regl) {
  return regl({
    vert: `
    precision highp float;
    attribute float dummy;
    uniform vec2 ealpha, rotation;
    uniform bool joukowsky;
    uniform mat4 view;
    uniform float pointSize;
    void main() {
      gl_Position = view * vec4(rotation * (joukowsky ? 2.0 : 1.0) + dummy, 0, 1);
      gl_PointSize = pointSize + 0.5;
    }`,
    frag: `
    precision highp float;
    uniform float pointSize;
    uniform bool kuttaCondition;
    float linearstep (float a, float b, float x) {
      return clamp((x - a) / (b - a), 0.0, 1.0);
    }
    void main () {
      float r = pointSize * 2.0 * length(gl_PointCoord.xy - 0.5);
      float alpha = linearstep(pointSize + 0.5, pointSize - 0.5, r);
      if (!kuttaCondition) alpha *= 0.5;
      vec3 color = mix(
        kuttaCondition ? vec3(0.2, 0.4, 1) : vec3(0.5),
        vec3(1), linearstep(pointSize - 3.0, pointSize - 2.0, r));
      gl_FragColor = vec4(color, alpha);
    }`,
    attributes: {
      dummy: [0]
    },
    uniforms: {
      pointSize: ({pixelRatio}) => pixelRatio * 8,
      point: regl.prop('point'),
    },
    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        srcAlpha: 1,
        dstRGB: 'one minus src alpha',
        dstAlpha: 1
      },
      equation: {
        rgb: 'add',
        alpha: 'add'
      },
    },
    depth: {
      enable: false
    },
    primitive: 'points',
    count: 1,
  });
};
