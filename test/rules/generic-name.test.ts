import { describe, expect, it } from 'vitest';
import { genericName } from '../../src/rules/generic-name.js';
import type { Identifier } from '../../src/rules/types.js';

function id(overrides: Partial<Identifier>): Identifier {
  return { name: 'x', kind: 'var', line: 1, col: 1, scopeId: '0', ...overrides };
}

describe('generic-name', () => {
  it('flags exact-match generic names case-insensitively', () => {
    const matches = genericName([id({ name: 'Data' }), id({ name: 'FOO' }), id({ name: 'stuff' })]);
    expect(matches.map((m) => m.identifier.name)).toEqual(['Data', 'FOO', 'stuff']);
    expect(matches.every((m) => m.ruleId === 'generic-name')).toBe(true);
  });

  it('does not flag descriptive names', () => {
    const matches = genericName([id({ name: 'userCount' }), id({ name: 'requestPayload' })]);
    expect(matches).toHaveLength(0);
  });
});
