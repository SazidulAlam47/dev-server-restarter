const esbuild = require('esbuild');

async function main() {
  await esbuild.build({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: false,
    sourcemap: true,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
  });
  console.log('Build complete -> dist/extension.js');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
