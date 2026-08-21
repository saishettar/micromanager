import { describe, expect, it } from 'vitest';
import { generateRoast } from '../src/roast-generator.js';
import type { RuleMatch } from '../src/rules/types.js';

function match(overrides: Partial<RuleMatch> = {}): RuleMatch {
  return {
    ruleId: 'generic-name',
    identifier: { name: 'data', kind: 'var', line: 1, col: 1, scopeId: '0' },
    ...overrides,
  };
}

describe('generateRoast', () => {
  it('interpolates the identifier name into the template', () => {
    const roast = generateRoast(match(), 'mild', 'seed-a');
    expect(roast).toContain('data');
  });

  it('is deterministic for the same seed', () => {
    const a = generateRoast(match(), 'medium', 'same-seed');
    const b = generateRoast(match(), 'medium', 'same-seed');
    expect(a).toBe(b);
  });

  it('falls back to medium templates for an unknown intensity tier', () => {
    // @ts-expect-error intentionally passing an invalid intensity to exercise the fallback
    const roast = generateRoast(match(), 'nonexistent', 'seed-b');
    expect(roast.length).toBeGreaterThan(0);
  });
});
