import type { Identifier, Rule, RuleMatch } from './types.js';

const SUFFIXES = ['Copy', 'Final', 'Backup', 'Old', 'New'];

function stripSuffixes(name: string): { base: string; suffixCount: number } {
  let base = name;
  let suffixCount = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of SUFFIXES) {
      if (base.length > suffix.length && base.toLowerCase().endsWith(suffix.toLowerCase())) {
        base = base.slice(0, base.length - suffix.length);
        suffixCount++;
        changed = true;
        break;
      }
    }
  }
  return { base, suffixCount };
}

export const copyPasteSmell: Rule = (identifiers) => {
  const groups = new Map<string, { identifier: Identifier; suffixCount: number }[]>();

  for (const identifier of identifiers) {
    const { base, suffixCount } = stripSuffixes(identifier.name);
    if (!base) continue;
    const key = `${identifier.scopeId}::${base.toLowerCase()}`;
    const group = groups.get(key) ?? [];
    group.push({ identifier, suffixCount });
    groups.set(key, group);
  }

  const matches: RuleMatch[] = [];
  for (const group of groups.values()) {
    const hasSuffixedMember = group.some((entry) => entry.suffixCount >= 1);
    const hasRepeatedSuffix = group.some((entry) => entry.suffixCount >= 2);
    const isCoOccurrence = group.length >= 2 && hasSuffixedMember;
    if (!isCoOccurrence && !hasRepeatedSuffix) continue;

    for (const entry of group) {
      if (entry.suffixCount >= 1) {
        matches.push({ ruleId: 'copy-paste-smell', identifier: entry.identifier });
      }
    }
  }
  return matches;
};
