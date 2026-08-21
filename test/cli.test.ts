import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runLint } from '../src/cli.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

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
});
