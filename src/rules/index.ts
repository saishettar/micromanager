import type { Identifier, Rule, RuleMatch } from './types.js';
import { genericName } from './generic-name.js';
import { numberedVariant } from './numbered-variant.js';
import { singleLetter } from './single-letter.js';
import { copyPasteSmell } from './copy-paste-smell.js';
import { inconsistentCasing } from './inconsistent-casing.js';

export type { Identifier, Rule, RuleMatch };
export { genericName, numberedVariant, singleLetter, copyPasteSmell, inconsistentCasing };

export const allRules: Rule[] = [genericName, numberedVariant, singleLetter, copyPasteSmell, inconsistentCasing];

export function runRules(identifiers: Identifier[]): RuleMatch[] {
  return allRules.flatMap((rule) => rule(identifiers));
}
