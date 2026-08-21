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
  cli.ts              # commander entrypoint: lint / --write / --clean
  parser.ts           # walks a file with @babel/parser + traverse,
                       # yields identifiers with line/col/scope info
  injector.ts          # inline-comment injection for --write / --clean
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
```

Each rule is a pure function `(identifiers) => matches`, so they're trivial
to unit test in isolation — see `test/rules/`.

## Testing

```bash
npm test
```

Unit tests cover every rule (true-positive and true-negative cases each), the
parser's scope/loop-counter detection, the comment injector, and one
fixture-driven integration test (`test/fixtures/bad-names.ts`) that runs the
whole CLI pipeline end-to-end.

## Non-goals

This tool will never lint for bugs, correctness, or logic issues — only
names. It also doesn't (yet) wire into git hooks, track a roast history
across runs, or ship as an editor extension.
