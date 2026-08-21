import { describe, expect, it } from 'vitest';
import { injectRoasts, stripRoasts } from '../src/injector.js';

describe('injectRoasts', () => {
  it('appends a trailing comment on the target line', () => {
    const code = 'let data = 1;\nlet other = 2;';
    const result = injectRoasts(code, new Map([[1, ['stop naming things data']]]));
    expect(result.split('\n')[0]).toBe('let data = 1;  // [micromanager] stop naming things data');
    expect(result.split('\n')[1]).toBe('let other = 2;');
  });

  it('joins multiple roasts on the same line with a separator', () => {
    const code = 'let x = 1;';
    const result = injectRoasts(code, new Map([[1, ['roast one', 'roast two']]]));
    expect(result).toBe('let x = 1;  // [micromanager] roast one | roast two');
  });

  it('replaces a previously injected comment instead of duplicating it', () => {
    const code = 'let data = 1;  // [micromanager] old roast';
    const result = injectRoasts(code, new Map([[1, ['new roast']]]));
    expect(result).toBe('let data = 1;  // [micromanager] new roast');
  });

  it('ignores line numbers outside the file', () => {
    const code = 'let data = 1;';
    const result = injectRoasts(code, new Map([[99, ['unreachable']]]));
    expect(result).toBe(code);
  });
});

describe('stripRoasts', () => {
  it('removes injected comments and restores the original line', () => {
    const code = 'let data = 1;  // [micromanager] stop it\nlet other = 2;';
    expect(stripRoasts(code)).toBe('let data = 1;\nlet other = 2;');
  });

  it('is a no-op on code with no injected comments', () => {
    const code = 'let data = 1; // a normal comment';
    expect(stripRoasts(code)).toBe(code);
  });
});
