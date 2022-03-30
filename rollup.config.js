import typescript from '@rollup/plugin-typescript';
import {terser} from 'rollup-plugin-terser';

const name = 'TTVC';

export default [
  {
    input: 'src/index.ts',
    output: {
      compact: true,
      file: 'dist/index.cjs.min.js',
      format: 'cjs',
    },
    plugins: [typescript(), terser()],
  },
  {
    input: 'src/index.ts',
    output: {
      compact: true,
      file: 'dist/index.amd.min.js',
      format: 'amd',
    },
    plugins: [typescript(), terser()],
  },
  {
    input: 'src/index.ts',
    output: {
      compact: true,
      file: 'dist/index.min.js',
      format: 'umd',
      name,
    },
    plugins: [typescript(), terser()],
  },
];
