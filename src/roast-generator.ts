import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { RuleMatch } from './rules/types.js';

export type Intensity = 'mild' | 'medium' | 'unhinged';

type RoastBank = Record<string, Record<string, string[]>>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bank: RoastBank = JSON.parse(readFileSync(path.join(__dirname, 'roasts.json'), 'utf-8'));

function interpolate(template: string, match: RuleMatch): string {
  return template
    .replace(/\{\{name\}\}/g, match.identifier.name)
    .replace(/\{\{detail\}\}/g, match.detail ?? match.identifier.name);
}

export function generateRoast(match: RuleMatch, intensity: Intensity): string {
  const templates = bank[match.ruleId]?.[intensity] ?? bank[match.ruleId]?.medium ?? [];
  if (templates.length === 0) {
    return `${match.identifier.name} — needs a better name.`;
  }
  const template = templates[Math.floor(Math.random() * templates.length)];
  return interpolate(template, match);
}
