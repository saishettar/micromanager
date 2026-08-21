#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
import { filterLintable, getStagedFiles } from './git.js';
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

const HOOK_MARKER = '# --- micromanager pre-commit hook ---';

export function installHook(cwd: string = process.cwd()): LintResult {
  const gitDir = path.join(cwd, '.git');
  if (!existsSync(gitDir)) {
    return { output: 'No .git directory found here — run this from your repo root.', exitCode: 1 };
  }

  const hooksDir = path.join(gitDir, 'hooks');
  mkdirSync(hooksDir, { recursive: true });
  const hookPath = path.join(hooksDir, 'pre-commit');

  const existing = existsSync(hookPath) ? readFileSync(hookPath, 'utf-8') : '';
  if (existing.includes(HOOK_MARKER)) {
    return { output: 'micromanager pre-commit hook is already installed.', exitCode: 0 };
  }

  const block = `${HOOK_MARKER}\nnpx micromanager --staged\n`;
  const script = existing ? `${existing.trimEnd()}\n\n${block}` : `#!/bin/sh\n${block}`;

  writeFileSync(hookPath, script, 'utf-8');
  try {
    chmodSync(hookPath, 0o755);
  } catch {
    // best-effort: some filesystems (e.g. certain Windows setups) don't support POSIX modes
  }

  return {
    output: `Installed pre-commit hook at ${path.relative(cwd, hookPath)} — staged JS/TS files get roasted before every commit.`,
    exitCode: 0,
  };
}

export function uninstallHook(cwd: string = process.cwd()): LintResult {
  const hookPath = path.join(cwd, '.git', 'hooks', 'pre-commit');
  if (!existsSync(hookPath)) {
    return { output: 'No pre-commit hook found.', exitCode: 0 };
  }

  const content = readFileSync(hookPath, 'utf-8');
  if (!content.includes(HOOK_MARKER)) {
    return { output: 'pre-commit hook exists but was not installed by micromanager — leaving it alone.', exitCode: 0 };
  }

  const withoutBlock = content
    .replace(new RegExp(`\\n*${HOOK_MARKER}\\nnpx micromanager --staged\\n`), '')
    .trimEnd();

  const remainder = withoutBlock.replace(/^#!\/bin\/sh\s*$/m, '').trim();
  if (remainder.length === 0) {
    writeFileSync(hookPath, '', 'utf-8');
  } else {
    writeFileSync(hookPath, `${withoutBlock}\n`, 'utf-8');
  }

  return { output: 'Removed the micromanager pre-commit hook.', exitCode: 0 };
}

function main() {
  const program = new Command();

  program
    .name('micromanager')
    .description('A CLI linter that critiques your naming, not your logic.')
    .argument('[patterns...]', 'file or glob patterns to lint')
    .option('-w, --write', 'inject roasts as inline comments in the file instead of printing a report')
    .option('--clean', 'remove previously injected roast comments')
    .option('--staged', 'lint only git-staged JS/TS files (used by the pre-commit hook)')
    .action((patterns: string[], options: { write?: boolean; clean?: boolean; staged?: boolean }) => {
      let effectivePatterns = patterns;

      if (options.staged) {
        effectivePatterns = filterLintable(getStagedFiles(process.cwd()));
        if (effectivePatterns.length === 0) {
          console.log('No staged JS/TS files to lint.');
          process.exitCode = 0;
          return;
        }
      } else if (patterns.length === 0) {
        console.error('Error: provide file/glob patterns, or use --staged.');
        process.exitCode = 1;
        return;
      }

      const { output, exitCode } = options.clean
        ? runClean(effectivePatterns)
        : options.write
          ? runInject(effectivePatterns)
          : runLint(effectivePatterns);

      if (exitCode === 0) {
        console.log(output);
      } else {
        console.error(output);
      }
      process.exitCode = exitCode;
    });

  program
    .command('install-hook')
    .description('install a git pre-commit hook that roasts staged files before every commit')
    .action(() => {
      const { output, exitCode } = installHook();
      console.log(output);
      process.exitCode = exitCode;
    });

  program
    .command('uninstall-hook')
    .description('remove the micromanager pre-commit hook')
    .action(() => {
      const { output, exitCode } = uninstallHook();
      console.log(output);
      process.exitCode = exitCode;
    });

  program.parse();
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
