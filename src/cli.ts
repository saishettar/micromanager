#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import fg from 'fast-glob';
import { parseFile } from './parser.js';
import { runRules } from './rules/index.js';
import { loadConfig } from './config.js';
import { formatReport, type ReportedMatch } from './reporter.js';

export interface LintResult {
  output: string;
  exitCode: number;
}

export function runLint(patterns: string[], cwd: string = process.cwd()): LintResult {
  const config = loadConfig(cwd);
  const files = fg.sync(patterns, { onlyFiles: true, absolute: false, cwd });

  if (files.length === 0) {
    return { output: 'No files matched.', exitCode: 1 };
  }

  const allowSet = new Set(config.allow.map((name) => name.toLowerCase()));
  const reported: ReportedMatch[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const absolutePath = path.join(cwd, file);
    let code: string;
    try {
      code = readFileSync(absolutePath, 'utf-8');
    } catch (err) {
      errors.push(`Could not read ${file}: ${(err as Error).message}`);
      continue;
    }

    let identifiers;
    try {
      identifiers = parseFile(code, file);
    } catch (err) {
      errors.push(`Could not parse ${file}: ${(err as Error).message}`);
      continue;
    }

    const matches = runRules(identifiers).filter(
      (match) => !allowSet.has(match.identifier.name.toLowerCase()),
    );

    for (const match of matches) {
      reported.push({ file, match });
    }
  }

  reported.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.match.identifier.line - b.match.identifier.line;
  });

  const lines = [...errors];
  if (reported.length === 0) {
    lines.push('Nothing to roast. Suspiciously well-named codebase.');
  } else {
    lines.push(formatReport(reported, config.intensity));
  }

  return { output: lines.join('\n'), exitCode: reported.length > 0 ? 1 : 0 };
}

function main() {
  const program = new Command();

  program
    .name('micromanager')
    .description('A CLI linter that critiques your naming, not your logic.')
    .argument('<patterns...>', 'file or glob patterns to lint')
    .action((patterns: string[]) => {
      const { output, exitCode } = runLint(patterns);
      if (exitCode === 0) {
        console.log(output);
      } else {
        console.error(output);
      }
      process.exitCode = exitCode;
    });

  program.parse();
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
