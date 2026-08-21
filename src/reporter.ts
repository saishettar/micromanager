import type { RuleMatch } from './rules/types.js';
import { generateRoast, type Intensity } from './roast-generator.js';

export interface ReportedMatch {
  file: string;
  match: RuleMatch;
}

export function formatReport(reported: ReportedMatch[], intensity: Intensity): string {
  return reported
    .map(({ file, match }) => {
      const location = `${file}:${match.identifier.line}:${match.identifier.col}`;
      const tag = `[${match.ruleId}]`;
      const roast = generateRoast(match, intensity);
      return `${location}  ${tag}  ${roast}`;
    })
    .join('\n');
}
