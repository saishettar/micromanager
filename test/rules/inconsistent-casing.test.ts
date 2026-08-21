import { describe, expect, it } from 'vitest';
import { inconsistentCasing } from '../../src/rules/inconsistent-casing.js';
import type { Identifier } from '../../src/rules/types.js';

function id(overrides: Partial<Identifier>): Identifier {
  return { name: 'x', kind: 'var', line: 1, col: 1, scopeId: '0', ...overrides };
}

describe('inconsistent-casing', () => {
  it('flags camelCase next to snake_case in the same scope', () => {
    const matches = inconsistentCasing([id({ name: 'myVariable' }), id({ name: 'my_other_variable' })]);
    expect(matches.map((m) => m.identifier.name).sort()).toEqual(['myVariable', 'my_other_variable']);
  });

  it('does not flag a single consistent casing style', () => {
    expect(inconsistentCasing([id({ name: 'myVariable' }), id({ name: 'myOtherVariable' })])).toHaveLength(0);
  });

  it('does not cross scope boundaries', () => {
    const matches = inconsistentCasing([
      id({ name: 'myVariable', scopeId: '1' }),
      id({ name: 'my_other_variable', scopeId: '2' }),
    ]);
    expect(matches).toHaveLength(0);
  });
});
