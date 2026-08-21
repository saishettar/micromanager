import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Intensity } from './roast-generator.js';

export interface MicromanagerConfig {
  intensity: Intensity;
  allow: string[];
}

const DEFAULT_CONFIG: MicromanagerConfig = {
  intensity: 'medium',
  allow: [],
};

export function loadConfig(cwd: string = process.cwd()): MicromanagerConfig {
  const configPath = path.join(cwd, '.micromanagerrc');
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    return {
      intensity: raw.intensity ?? DEFAULT_CONFIG.intensity,
      allow: Array.isArray(raw.allow) ? raw.allow : DEFAULT_CONFIG.allow,
    };
  } catch (err) {
    console.error(`Warning: failed to parse .micromanagerrc, using defaults. (${(err as Error).message})`);
    return DEFAULT_CONFIG;
  }
}
