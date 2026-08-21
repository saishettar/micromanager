import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { RuleMatch } from './rules/types.js';

export type Intensity = 'mild' | 'medium' | 'unhinged';

type RoastBank = Record<string, Record<string, string[]>>;

// `declare` only — erased at compile time, so it creates no runtime binding.
// A bundler that wraps this module as CommonJS (the VS Code extension build)
// already provides a real `__dirname`; a plain `typeof` check is safe even
// where no such binding exists at all (native ESM, which uses `import.meta.url`
// instead — and which a CJS bundler empties out, so it can't be used unconditionally).
declare const __dirname: string | undefined;

const moduleDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const bank: RoastBank = JSON.parse(readFileSync(path.join(moduleDir, 'roasts.json'), 'utf-8'));

function interpolate(template: string, match: RuleMatch): string {
  return template
    .replace(/\{\{name\}\}/g, match.identifier.name)
    .replace(/\{\{detail\}\}/g, match.detail ?? match.identifier.name);
}

// FNV-1a — good enough to distribute template picks evenly; not used for anything security-sensitive.
function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Picks and interpolates a roast template for a match.
 *
 * Without a `seed`, the template is chosen at random each call (what the CLI
 * wants, so repeated offenses in one run don't all print the same line).
 * With a `seed`, the pick is deterministic (what an editor integration wants,
 * so the same violation doesn't reroll its message on every relint).
 */
export function generateRoast(match: RuleMatch, intensity: Intensity, seed?: string): string {
  const templates = bank[match.ruleId]?.[intensity] ?? bank[match.ruleId]?.medium ?? [];
  if (templates.length === 0) {
    return `${match.identifier.name} — needs a better name.`;
  }
  const index = seed ? hashSeed(seed) % templates.length : Math.floor(Math.random() * templates.length);
  return interpolate(templates[index], match);
}
