# micromanager

A CLI linter that critiques your *naming*, not your logic.

It parses your JS/TS files, extracts identifiers, and roasts the lazy ones
with passive-aggressive one-liners — while staying deliberately blind to real
bugs. It has strong opinions about `data2`. It does not care if the same
function throws a `NullPointerException`.

```
src/utils.ts:14:7  [generic-name]    "data2" — the sequel nobody asked for.
src/utils.ts:22:3  [copy-paste-smell] "dataFinalFinal" — bold of you to assume this is final.
```

## Install

```bash
npm install
npm run build
```

Requires Node 18+.

## Usage

```bash
# print a roast report to the terminal
npx micromanager "src/**/*.ts"

# inject roasts as inline comments directly into the offending files
npx micromanager --write "src/**/*.ts"

# remove previously injected roast comments
npx micromanager --clean "src/**/*.ts"
```

Or during development, without building first:

```bash
npm start -- "src/**/*.ts"
```

The CLI exits with code `1` if anything got roasted, `0` if the codebase came
back suspiciously clean — so it plugs into CI like a normal linter, if you're
brave enough.

### `--write`: the inline-comment punchline

`--write` doesn't just print a report — it edits the file in place, appending
each roast as a trailing `// [micromanager] ...` comment on the offending
line. Next time your teammate opens the file, the roast is already there
waiting for them.

Running `--write` again re-rolls and replaces the comments instead of piling
up duplicates. `--clean` strips every injected comment and gives you your
file back exactly as it was.

## Git hook mode

```bash
npx micromanager install-hook
```

Installs a `pre-commit` hook (chaining after any hook already there) that
runs `micromanager --staged` before every commit — only your staged JS/TS
files get linted, and a bad name blocks the commit. This is the joke made
literal: an overbearing manager standing between you and `git commit`,
except the only thing it cares about is `data2`.

```bash
npx micromanager uninstall-hook   # removes it, leaving any other hook intact
npx micromanager --staged         # what the hook actually runs
```

## VS Code extension

`vscode-extension/` is a real, loadable extension that underlines flagged
identifiers directly in the editor (squiggly warning + roast on hover),
reusing the exact same parser/rules/config as the CLI — no duplicated logic.

Build it:

```bash
npm run build:vscode
```

This compiles the core library, then bundles `vscode-extension/src/extension.ts`
with esbuild into `vscode-extension/dist/extension.js` (CommonJS, `vscode`
left external, per how the extension host loads extensions).

To try it, open this repo in VS Code, then press <kbd>F5</kbd> (or Run →
Start Debugging) to launch an Extension Development Host with it loaded. Open
any `.js`/`.ts` file with a bad name in the new window and the underline
should appear. The command palette also has **Micromanager: Relint Open
Files** to force a re-check.

Diagnostics reuse `.micromanagerrc` from the workspace root, same as the CLI.
Each violation's roast is picked deterministically (seeded by file + position
+ rule) so it doesn't reroll into a different line on every keystroke — only
`--write`/`--clean` and the CLI report get the random pick that varies per run.

## What it checks

Five rules, all about *names*, none about *correctness*:

| Rule | Flags | Example |
|---|---|---|
| `generic-name` | Exact-match generic names (case-insensitive) | `data`, `temp`, `foo`, `x`, `thing`, `stuff` |
| `numbered-variant` | A base name with a trailing digit, optionally via `_v` | `data2`, `user3`, `item_v2` |
| `single-letter` | Single-letter identifiers, except `for`-loop counters | `x`, `n` — but not `i` in `for (let i = 0; ...)` |
| `copy-paste-smell` | A base name with `Copy`/`Final`/`Backup`/`Old`/`New` suffixes co-occurring | `data` + `dataCopy`, `dataFinalFinal` |
| `inconsistent-casing` | camelCase and snake_case identifiers mixed in the same scope | `myVariable` next to `my_other_variable` |

Loop-counter exemption is scope-aware: `i` inside a `for (let i = ...)` init
is exempt, but a top-level `let i` elsewhere is fair game.

## Configuration

Drop a `.micromanagerrc` (JSON) in your project root:

```json
{
  "intensity": "medium",
  "allow": ["temp", "data"]
}
```

- `intensity` — which roast tier to sample from: `mild`, `medium`, or
  `unhinged`.
- `allow` — exact identifier names (case-insensitive) to never flag.

## Architecture

```
src/
  cli.ts              # commander entrypoint: lint / --write / --clean /
                       # --staged / install-hook / uninstall-hook
  parser.ts           # walks a file with @babel/parser + traverse,
                       # yields identifiers with line/col/scope info
  injector.ts          # inline-comment injection for --write / --clean
  git.ts               # staged-file discovery for --staged / the pre-commit hook
  rules/
    index.ts           # rules engine: identifiers in, matches out
    generic-name.ts
    numbered-variant.ts
    single-letter.ts
    copy-paste-smell.ts
    inconsistent-casing.ts
  roasts.json          # rule id -> roast templates, keyed by intensity
  roast-generator.ts   # picks + interpolates a template for a match
  reporter.ts          # formats matches into terminal output
  config.ts            # loads .micromanagerrc

vscode-extension/
  package.json         # extension manifest
  src/extension.ts     # diagnostics provider, built on the same core modules
  dist/                # esbuild output (git-ignored, run `npm run build:vscode`)
```

Each rule is a pure function `(identifiers) => matches`, so they're trivial
to unit test in isolation — see `test/rules/`. The CLI, the git hook, and the
VS Code extension are all thin shells around the same
parser → rules → roast-generator pipeline; none of them re-implement it.

## Testing

```bash
npm test
```

Unit tests cover every rule (true-positive and true-negative cases each), the
parser's scope/loop-counter detection, the comment injector, roast-generator
determinism, staged-file discovery and the pre-commit hook lifecycle (against
real temp git repos), and one fixture-driven integration test
(`test/fixtures/bad-names.ts`) that runs the whole CLI pipeline end-to-end.

The VS Code extension bundle isn't part of the automated suite (it needs the
`vscode` module, which only exists inside a running VS Code process) — it's
verified by loading it in an actual Extension Development Host instead.

## Non-goals

This tool will never lint for bugs, correctness, or logic issues — only
names. It also doesn't track a roast history/leaderboard across runs, and the
VS Code extension isn't published to the Marketplace (build and load it via
the Extension Development Host, as above).
