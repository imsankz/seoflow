import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isWatch = process.argv.includes('--watch');

/** Find all .ts files recursively, skip .d.ts */
function findTsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== 'dist') {
      files.push(...findTsFiles(p));
    } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      files.push(p);
    }
  }
  return files;
}

const entryPoints = [
  path.join(__dirname, 'bin', 'cli.ts'),
  path.join(__dirname, 'run.ts'),
];

async function build() {
  const ctx = await esbuild.context({
    entryPoints,
    outdir: path.join(__dirname, 'dist'),
    platform: 'node',
    target: 'node18',
    format: 'esm',
    bundle: true,
    sourcemap: true,
    tsconfig: path.join(__dirname, 'tsconfig.json'),
    outbase: __dirname,
    packages: 'external',
  });

  if (isWatch) {
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('Build complete → dist/');
  }
}

build().catch(e => {
  console.error('Build failed:', e);
  process.exit(1);
});
