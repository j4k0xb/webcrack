import esbuild from 'esbuild';

const args = process.argv.slice(2);
const watch = args.length > 0 && /^(?:--watch|-w)$/i.test(args[0]);

/**
 * @type {esbuild.BuildOptions[]}
 */
const configs = [
  {
    entryPoints: ['src/index.ts'],
  },
  {
    entryPoints: [
      {
        in: 'src/cjs-wrapper.ts',
        out: 'index',
      },
    ],
    outExtension: { '.js': '.cjs' },
    format: 'cjs',
    bundle: false,
  },
  {
    entryPoints: ['src/cli.ts'],
    bundle: false,
  },
];

for (const config of configs) {
  const ctx = await esbuild.context({
    bundle: true,
    format: 'esm',
    platform: 'node',
    outdir: 'dist',
    sourcemap: true,
    packages: 'external',
    logLevel: 'info',
    ...config,
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}
