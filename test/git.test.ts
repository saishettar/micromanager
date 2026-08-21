import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { filterLintable, getStagedFiles } from '../src/git.js';

function initRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'micromanager-git-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  return dir;
}

describe('filterLintable', () => {
  it('keeps only JS/TS extensions', () => {
    expect(filterLintable(['a.ts', 'b.js', 'c.tsx', 'd.jsx', 'e.md', 'f.json'])).toEqual([
      'a.ts',
      'b.js',
      'c.tsx',
      'd.jsx',
    ]);
  });
});

describe('getStagedFiles', () => {
  it('returns staged JS/TS files and ignores unstaged ones', () => {
    const dir = initRepo();
    writeFileSync(path.join(dir, 'staged.ts'), 'let data = 1;\n');
    writeFileSync(path.join(dir, 'unstaged.ts'), 'let data = 1;\n');
    execFileSync('git', ['add', 'staged.ts'], { cwd: dir });

    const staged = getStagedFiles(dir);
    expect(staged).toEqual(['staged.ts']);
  });

  it('returns an empty array outside a git repo', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'micromanager-nogit-'));
    expect(getStagedFiles(dir)).toEqual([]);
  });
});
