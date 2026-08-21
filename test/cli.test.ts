import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runLint, runInject, runClean } from '../src/cli.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const fixtureSource = readFileSync(path.join(projectRoot, 'test/fixtures/bad-names.ts'), 'utf-8');

describe('cli integration', () => {
  it('flags every rule against the fixture file and exits non-zero', () => {
    const { output, exitCode } = runLint(['test/fixtures/bad-names.ts'], projectRoot);
    expect(exitCode).toBe(1);

    const structuralLines = output
      .split('\n')
      .filter(Boolean)
      .map((line) => line.match(/^(\S+:\d+:\d+)\s+(\[[\w-]+\])/)?.slice(1, 3).join('  '))
      .filter((line): line is string => Boolean(line))
      .sort();

    expect(structuralLines).toMatchSnapshot();
  });

  it('reports nothing for a well-named file', () => {
    const { output, exitCode } = runLint(['src/config.ts'], projectRoot);
    expect(exitCode).toBe(0);
    expect(output).toContain('Nothing to roast');
  });

  it('--write injects inline roast comments and --clean removes them', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'micromanager-'));
    const targetFile = 'sample.ts';
    writeFileSync(path.join(tmpDir, targetFile), fixtureSource, 'utf-8');

    const injectResult = runInject([targetFile], tmpDir);
    expect(injectResult.exitCode).toBe(1);
    expect(injectResult.output).toContain('injected');

    const injected = readFileSync(path.join(tmpDir, targetFile), 'utf-8');
    expect(injected).toContain('// [micromanager]');
    // the loop counter must stay exempt, so its line must not get a comment
    expect(injected.split('\n')[1]).not.toContain('[micromanager]');

    // re-running --write must replace, not duplicate, the inline comments
    runInject([targetFile], tmpDir);
    const reinjected = readFileSync(path.join(tmpDir, targetFile), 'utf-8');
    const genericNameLine = reinjected.split('\n').find((l) => l.includes('let data ='));
    expect(genericNameLine?.match(/\[micromanager\]/g)).toHaveLength(1);

    const cleanResult = runClean([targetFile], tmpDir);
    expect(cleanResult.exitCode).toBe(0);
    const cleaned = readFileSync(path.join(tmpDir, targetFile), 'utf-8');
    expect(cleaned).not.toContain('[micromanager]');
    expect(cleaned).toBe(fixtureSource);
  });
});
