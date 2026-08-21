const MARKER = '// [micromanager]';
const MARKER_PATTERN = /\s*\/\/ \[micromanager\].*$/;

/**
 * Injects roast text as an inline trailing comment on each given line.
 * Re-running on an already-annotated file replaces the old comment instead
 * of piling up duplicates, so this is safe to run repeatedly.
 */
export function injectRoasts(code: string, roastsByLine: Map<number, string[]>): string {
  const lines = code.split('\n');

  for (const [lineNumber, roastTexts] of roastsByLine) {
    const index = lineNumber - 1;
    if (index < 0 || index >= lines.length || roastTexts.length === 0) continue;

    const stripped = lines[index].replace(MARKER_PATTERN, '');
    lines[index] = `${stripped}  ${MARKER} ${roastTexts.join(' | ')}`;
  }

  return lines.join('\n');
}

/** Removes any previously injected roast comments, restoring the original lines. */
export function stripRoasts(code: string): string {
  return code
    .split('\n')
    .map((line) => line.replace(MARKER_PATTERN, ''))
    .join('\n');
}
