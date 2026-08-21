#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import fg from 'fast-glob';
import { parseFile } from './parser.js';
import { runRules } from './rules/index.js';
import { loadConfig } from './config.js';
import { formatReport, type ReportedMatch } from './reporter.js';
import { generateRoast } from './roast-generator.js';
import { injectRoasts, stripRoasts } from './injector.js';
import type { RuleMatch } from './rules/types.js';

export interface LintResult {
  output: string;
  exitCode: number;
}

interface FileMatches {
  file: string;
  code: string;
  matches: RuleMatch[];
}

interface CollectResult {
  files: FileMatches[];
  errors: string[];
}

function collectMatches(patterns: string[], cwd: string): CollectResult {
  const config = loadConfig(cwd);
  const allowSet = new Set(config.allow.map((name) => name.toLowerCase()));
  const matched = fg.sync(patterns, { onlyFiles: true, absolute: false, cwd });

  const files: FileMatches[] = [];
  const errors: string[] = [];

  for (const file of matched) {
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

    files.push({ file, code, matches });
  }

  return { files, errors };
}

export function runLint(patterns: string[], cwd: string = process.cwd()): LintResult {
  const config = loadConfig(cwd);
  const { files, errors } = collectMatches(patterns, cwd);

  if (files.length === 0 && errors.length === 0) {
    return { output: 'No files matched.', exitCode: 1 };
  }

  const reported: ReportedMatch[] = files.flatMap(({ file, matches }) =>
    matches.map((match) => ({ file, match })),
  );

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

export function runInject(patterns: string[], cwd: string = process.cwd()): LintResult {
  const config = loadConfig(cwd);
  const { files, errors } = collectMatches(patterns, cwd);

  if (files.length === 0 && errors.length === 0) {
    return { output: 'No files matched.', exitCode: 1 };
  }

  const lines = [...errors];
  let totalMatches = 0;

  for (const { file, code, matches } of files) {
    if (matches.length === 0) continue;

    const roastsByLine = new Map<number, string[]>();
    for (const match of matches) {
      const line = match.identifier.line;
      const roastText = generateRoast(match, config.intensity);
      const existing = roastsByLine.get(line) ?? [];
      existing.push(roastText);
      roastsByLine.set(line, existing);
    }

    const updated = injectRoasts(code, roastsByLine);
    writeFileSync(path.join(cwd, file), updated, 'utf-8');
    totalMatches += matches.length;
    lines.push(`${file}: injected ${matches.length} roast${matches.length === 1 ? '' : 's'} inline.`);
  }

  if (totalMatches === 0) {
    lines.push('Nothing to roast. Suspiciously well-named codebase.');
  }

  return { output: lines.join('\n'), exitCode: totalMatches > 0 ? 1 : 0 };
}

export function runClean(patterns: string[], cwd: string = process.cwd()): LintResult {
  const matched = fg.sync(patterns, { onlyFiles: true, absolute: false, cwd });

  if (matched.length === 0) {
    return { output: 'No files matched.', exitCode: 1 };
  }

  const lines: string[] = [];
  let cleanedCount = 0;

  for (const file of matched) {
    const absolutePath = path.join(cwd, file);
    let code: string;
    try {
      code = readFileSync(absolutePath, 'utf-8');
    } catch (err) {
      lines.push(`Could not read ${file}: ${(err as Error).message}`);
      continue;
    }

    const cleaned = stripRoasts(code);
    if (cleaned !== code) {
      writeFileSync(absolutePath, cleaned, 'utf-8');
      cleanedCount++;
      lines.push(`${file}: removed injected roast comments.`);
    }
  }

  if (cleanedCount === 0) {
    lines.push('No injected roast comments found.');
  }

  return { output: lines.join('\n'), exitCode: 0 };
}

function main() {
  const program = new Command();

  program
    .name('micromanager')
    .description('A CLI linter that critiques your naming, not your logic.')
    .argument('<patterns...>', 'file or glob patterns to lint')
    .option('-w, --write', 'inject roasts as inline comments in the file instead of printing a report')
    .option('--clean', 'remove previously injected roast comments')
    .action((patterns: string[], options: { write?: boolean; clean?: boolean }) => {
      const { output, exitCode } = options.clean
        ? runClean(patterns)
        : options.write
          ? runInject(patterns)
          : runLint(patterns);

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
