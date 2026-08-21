import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

mkdirSync(path.join(root, 'dist'), { recursive: true });
copyFileSync(path.join(root, 'src', 'roasts.json'), path.join(root, 'dist', 'roasts.json'));
