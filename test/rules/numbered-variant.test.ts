import { describe, expect, it } from 'vitest';
import { numberedVariant } from '../../src/rules/numbered-variant.js';
import type { Identifier } from '../../src/rules/types.js';

function id(overrides: Partial<Identifier>): Identifier {
  return { name: 'x', kind: 'var', line: 1, col: 1, scopeId: '0', ...overrides };
}

describe('numbered-variant', () => {
  it('flags base name + digit suffix', () => {
    expect(numberedVariant([id({ name: 'data2' })])).toHaveLength(1);
    expect(numberedVariant([id({ name: 'user3' })])).toHaveLength(1);
  });

  it('flags base_v + digit suffix', () => {
    expect(numberedVariant([id({ name: 'item_v2' })])).toHaveLength(1);
  });

  it('does not flag descriptive names with no digit suffix', () => {
    expect(numberedVariant([id({ name: 'userCount' })])).toHaveLength(0);
  });

  it('does not flag a single-letter base (guards against false positives like i2)', () => {
    expect(numberedVariant([id({ name: 'a1' })])).toHaveLength(0);
  });
});
