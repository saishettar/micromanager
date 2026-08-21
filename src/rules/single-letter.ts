import type { Rule } from './types.js';

export const singleLetter: Rule = (identifiers) => {
  return identifiers
    .filter((id) => id.name.length === 1 && !id.isForLoopCounter)
    .map((identifier) => ({ ruleId: 'single-letter', identifier }));
};
