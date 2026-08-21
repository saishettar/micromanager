import { describe, expect, it } from 'vitest';
import { copyPasteSmell } from '../../src/rules/copy-paste-smell.js';
import type { Identifier } from '../../src/rules/types.js';

function id(overrides: Partial<Identifier>): Identifier {
  return { name: 'x', kind: 'var', line: 1, col: 1, scopeId: '0', ...overrides };
}

describe('copy-paste-smell', () => {
  it('flags a suffixed variant co-occurring with its base in the same scope', () => {
    const matches = copyPasteSmell([id({ name: 'data' }), id({ name: 'dataCopy' })]);
    expect(matches.map((m) => m.identifier.name)).toEqual(['dataCopy']);
  });

  it('flags repeated suffixes even without a sibling base present', () => {
    const matches = copyPasteSmell([id({ name: 'dataFinalFinal' })]);
    expect(matches.map((m) => m.identifier.name)).toEqual(['dataFinalFinal']);
  });

  it('does not flag unrelated names in the same scope', () => {
    expect(copyPasteSmell([id({ name: 'data' }), id({ name: 'userCount' })])).toHaveLength(0);
  });

  it('does not cross scope boundaries', () => {
    const matches = copyPasteSmell([
      id({ name: 'data', scopeId: '1' }),
      id({ name: 'dataCopy', scopeId: '2' }),
    ]);
    expect(matches).toHaveLength(0);
  });
});
