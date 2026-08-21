import type { Identifier, Rule, RuleMatch } from './types.js';

type CasingStyle = 'camel' | 'snake' | 'ambiguous';

function casingStyle(name: string): CasingStyle {
  // SCREAMING_SNAKE_CASE constants are their own convention, not a clash with camelCase.
  if (name.includes('_') && /[a-z]/.test(name)) return 'snake';
  if (name.includes('_')) return 'ambiguous';
  if (/[A-Z]/.test(name.slice(1))) return 'camel';
  return 'ambiguous';
}

export const inconsistentCasing: Rule = (identifiers) => {
  const byScope = new Map<string, Identifier[]>();
  for (const identifier of identifiers) {
    const list = byScope.get(identifier.scopeId) ?? [];
    list.push(identifier);
    byScope.set(identifier.scopeId, list);
  }

  const matches: RuleMatch[] = [];
  for (const scoped of byScope.values()) {
    const camelNames = scoped.filter((id) => casingStyle(id.name) === 'camel');
    const snakeNames = scoped.filter((id) => casingStyle(id.name) === 'snake');
    if (camelNames.length === 0 || snakeNames.length === 0) continue;

    for (const identifier of camelNames) {
      matches.push({
        ruleId: 'inconsistent-casing',
        identifier,
        detail: snakeNames[0].name,
      });
    }
    for (const identifier of snakeNames) {
      matches.push({
        ruleId: 'inconsistent-casing',
        identifier,
        detail: camelNames[0].name,
      });
    }
  }
  return matches;
};
