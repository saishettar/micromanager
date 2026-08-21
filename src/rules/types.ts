import type { Identifier } from '../parser.js';

export type { Identifier };

export interface RuleMatch {
  ruleId: string;
  identifier: Identifier;
  detail?: string;
}

export type Rule = (identifiers: Identifier[]) => RuleMatch[];
