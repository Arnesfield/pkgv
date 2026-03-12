import eslint from '@rollup/plugin-eslint';
import typescript from '@rollup/plugin-typescript';
import { RollupOptions } from 'rollup';
import cleanup from 'rollup-plugin-cleanup';
import esbuild from 'rollup-plugin-esbuild';
import outputSize from 'rollup-plugin-output-size';

const WATCH = process.env.ROLLUP_WATCH === 'true';
const external = ['fs', 'path'];

function defineConfig(options: (false | RollupOptions)[]) {
  return options.filter((options): options is RollupOptions => !!options);
}

export default defineConfig([
  {
    input: { cli: 'src/cli.ts' },
    output: { dir: 'lib', format: 'esm', exports: 'named' },
    external,
    plugins: [
      esbuild({ target: 'esnext' }),
      cleanup({
        comments: ['some', 'sources', /__PURE__/],
        extensions: ['js', 'ts']
      }),
      outputSize({ bytes: true })
    ]
  },
  // {
  //   input,
  //   output: { file: pkg.types, format: 'esm' },
  //   plugins: [dts(), size()]
  // },
  WATCH && {
    input: 'src/cli.ts',
    external,
    watch: { skipWrite: true },
    plugins: [eslint(), typescript()]
  }
]);
