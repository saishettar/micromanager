import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { installHook, uninstallHook } from '../src/cli.js';

function initRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'micromanager-hook-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

describe('installHook / uninstallHook', () => {
  it('errors outside a git repo', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'micromanager-nogit-'));
    const result = installHook(dir);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('No .git directory');
  });

  it('installs a pre-commit hook that calls --staged', () => {
    const dir = initRepo();
    const result = installHook(dir);
    expect(result.exitCode).toBe(0);

    const hookPath = path.join(dir, '.git', 'hooks', 'pre-commit');
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('npx micromanager --staged');
  });

  it('is idempotent: installing twice does not duplicate the block', () => {
    const dir = initRepo();
    installHook(dir);
    const second = installHook(dir);
    expect(second.output).toContain('already installed');

    const hookPath = path.join(dir, '.git', 'hooks', 'pre-commit');
    const content = readFileSync(hookPath, 'utf-8');
    expect(content.match(/npx micromanager --staged/g)).toHaveLength(1);
  });

  it('preserves an existing pre-commit hook and appends after it', () => {
    const dir = initRepo();
    const hookPath = path.join(dir, '.git', 'hooks', 'pre-commit');
    writeFileSync(hookPath, '#!/bin/sh\necho "existing hook"\n', 'utf-8');

    installHook(dir);
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('echo "existing hook"');
    expect(content).toContain('npx micromanager --staged');
  });

  it('uninstalls cleanly and leaves other hook content intact', () => {
    const dir = initRepo();
    const hookPath = path.join(dir, '.git', 'hooks', 'pre-commit');
    writeFileSync(hookPath, '#!/bin/sh\necho "existing hook"\n', 'utf-8');

    installHook(dir);
    const result = uninstallHook(dir);
    expect(result.exitCode).toBe(0);

    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('echo "existing hook"');
    expect(content).not.toContain('micromanager');
  });

  it('does nothing to a hook it did not install', () => {
    const dir = initRepo();
    const hookPath = path.join(dir, '.git', 'hooks', 'pre-commit');
    writeFileSync(hookPath, '#!/bin/sh\necho "someone else"\n', 'utf-8');

    const result = uninstallHook(dir);
    expect(result.output).toContain('not installed by micromanager');

    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('echo "someone else"');
  });
});
