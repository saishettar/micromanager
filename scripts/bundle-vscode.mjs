import { build } from 'esbuild';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const extDir = path.join(root, 'vscode-extension');
const coreDist = path.join(root, 'dist');

if (!existsSync(path.join(coreDist, 'roasts.json'))) {
  console.error('dist/roasts.json not found — run `npm run build` first.');
  process.exit(1);
}

await build({
  entryPoints: [path.join(extDir, 'src', 'extension.ts')],
  outfile: path.join(extDir, 'dist', 'extension.js'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: ['vscode'],
  sourcemap: true,
});

// the bundled roast-generator reads roasts.json relative to its own runtime
// location, which after bundling is this output file's directory.
mkdirSync(path.join(extDir, 'dist'), { recursive: true });
copyFileSync(path.join(coreDist, 'roasts.json'), path.join(extDir, 'dist', 'roasts.json'));

console.log('Built vscode-extension/dist/extension.js');
