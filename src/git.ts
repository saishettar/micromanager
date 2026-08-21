import { execFileSync } from 'node:child_process';
import path from 'node:path';

const LINTABLE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);

/** Files staged for commit (added/copied/modified), relative to `cwd`. Empty array if not a git repo. */
export function getStagedFiles(cwd: string): string[] {
  try {
    const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
      cwd,
      encoding: 'utf-8',
      // execFileSync inherits the child's stderr to the parent by default;
      // pipe it instead so a "not a git repository" error doesn't leak to the terminal.
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function filterLintable(files: string[]): string[] {
  return files.filter((file) => LINTABLE_EXTENSIONS.has(path.extname(file)));
}
