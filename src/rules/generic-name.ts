import type { Rule } from './types.js';

const GENERIC_NAMES = new Set(['data', 'temp', 'foo', 'x', 'thing', 'stuff']);

export const genericName: Rule = (identifiers) => {
  return identifiers
    .filter((id) => GENERIC_NAMES.has(id.name.toLowerCase()))
    .map((identifier) => ({ ruleId: 'generic-name', identifier }));
};
