import { describe, expect, it } from 'vitest';
import { singleLetter } from '../../src/rules/single-letter.js';
import type { Identifier } from '../../src/rules/types.js';

function id(overrides: Partial<Identifier>): Identifier {
  return { name: 'x', kind: 'var', line: 1, col: 1, scopeId: '0', ...overrides };
}

describe('single-letter', () => {
  it('does not flag a for-loop counter', () => {
    expect(singleLetter([id({ name: 'i', isForLoopCounter: true })])).toHaveLength(0);
  });

  it('flags a top-level single-letter variable', () => {
    const matches = singleLetter([id({ name: 'i', isForLoopCounter: false })]);
    expect(matches).toHaveLength(1);
    expect(matches[0].ruleId).toBe('single-letter');
  });

  it('does not flag multi-letter names', () => {
    expect(singleLetter([id({ name: 'idx' })])).toHaveLength(0);
  });
});
