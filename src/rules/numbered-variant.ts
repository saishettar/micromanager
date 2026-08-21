import type { Rule } from './types.js';

// base name (letters, min 2 chars) + optional "_v" + trailing digits
// matches: data2, user3, item_v2 (case-insensitive on the "_v")
const NUMBERED_VARIANT = /^([a-zA-Z]+)(?:_v)?(\d+)$/i;

export const numberedVariant: Rule = (identifiers) => {
  const matches = [];
  for (const identifier of identifiers) {
    const match = NUMBERED_VARIANT.exec(identifier.name);
    if (!match) continue;
    const [, base] = match;
    if (base.length < 2) continue;
    matches.push({ ruleId: 'numbered-variant', identifier, detail: base });
  }
  return matches;
};
