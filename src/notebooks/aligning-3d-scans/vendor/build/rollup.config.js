import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: 'nurbs-entry.js',
    output: {
      file: '../nurbs.js',
      format: 'es'
    },
    plugins: [resolve(), commonjs()]
  },
  {
    input: 'regl-camera-entry.js',
    output: {
      file: '../regl-camera.js',
      format: 'es'
    },
    plugins: [resolve(), commonjs()]
  },
  {
    input: 'gl-matrix-entry.js',
    output: {
      file: '../gl-matrix.js',
      format: 'es'
    },
    plugins: [resolve(), commonjs()]
  }
];
