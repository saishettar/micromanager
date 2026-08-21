# Micromanager.js

A CLI linter that critiques your *naming*, not your logic. It parses source files,
extracts identifiers, and roasts the lazy/bad ones with passive-aggressive
one-liners — while staying deliberately blind to real bugs. The joke: it has
strong opinions about `data2` but does not care if the same function throws a
NullPointerException.

## Goal for this session

Build a working MVP: a runnable CLI (`micromanager <file-or-glob>`) that parses
JS/TS files, flags bad identifier names via a small rules engine, and prints
snarky roasts with file/line numbers, like a normal linter's warning output.

Ship something runnable end-to-end before adding polish. Prefer a thin vertical
slice (one rule working end-to-end through CLI output) over building all rules
before wiring up output.

## Stack

- Node + TypeScript
- `@babel/parser` + `@babel/traverse` for AST parsing (handles JS and TS, JSX-safe)
- `commander` for CLI args
- Roast templates live in a plain JSON file, not hardcoded in TS, so they're
  easy to extend without touching logic
- `vitest` (or `node:test`) for unit tests on the rules engine — this is the
  part most worth testing since it's pure input→verdict logic

## Architecture

```
src/
  cli.ts              # commander entrypoint, arg parsing, glob expansion
  parser.ts           # walks a file with @babel/parser + traverse,
                       # yields { name, kind, line, col } for every identifier
                       # (variables, function names, params, class names)
  rules/
    index.ts           # rules engine: takes identifiers, returns matches
    generic-name.ts     # data, temp, foo, x, thing, stuff
    numbered-variant.ts # data2, user3, item_v2
    single-letter.ts    # single letters outside for-loop counters (i, j, k exempt)
    copy-paste-smell.ts # data, dataCopy, dataFinal, dataFinalFinal
    inconsistent-casing.ts # myVariable next to my_other_variable in same scope
  roasts.json          # rule id -> array of message templates, keyed by intensity
  roast-generator.ts   # picks + interpolates a template for a given match
  reporter.ts           # formats matches to terminal output (file:line + roast)
  config.ts             # loads .micromanagerrc (intensity, allowlist)
```

### Identifier kind matters for exemptions

The single-letter rule needs to know if an identifier is a `for`-loop counter
vs. a top-level variable — this requires walking with scope/parent context, not
just a flat identifier list. Babel's traverse gives you the parent path; use
that to detect `ForStatement` init and exempt `i`/`j`/`k`/`n` there.

### Rules engine contract

Keep each rule as a pure function:

```ts
type Identifier = { name: string; kind: 'var' | 'func' | 'param' | 'class'; line: number; col: number; scopeId: string };
type RuleMatch = { ruleId: string; identifier: Identifier; detail?: string };
type Rule = (identifiers: Identifier[]) => RuleMatch[];
```

Casing consistency and copy-paste-smell need to compare across identifiers
in the same scope, which is why rules take the full identifier list rather
than being called one-at-a-time — don't design them as single-identifier
predicates.

## MVP scope (build this)

1. **Parser**: extract all identifiers (var/func/param/class names) with
   line/col and enough scope info to exempt loop counters.
2. **Rules** (implement all five):
   - Generic names (`data`, `temp`, `foo`, `x`, `thing`, `stuff` — exact-match
     list, case-insensitive)
   - Numbered variants (`data2`, `user3`, `item_v2` — regex: base name + digit
     suffix, optionally with `_v` before the digit)
   - Single letters outside loop counters
   - Copy-paste smells (`x`, `xCopy`, `xFinal`, `xFinalFinal` — same base name
     with `Copy`/`Final`/`Backup`/`Old`/`New` suffix variants co-occurring)
   - Inconsistent casing (camelCase next to snake_case in the same file/scope)
3. **Roast generator**: template bank keyed by rule id, each with several
   variants so repeated offenses don't print the identical line every time.
4. **CLI output**: `micromanager src/**/*.ts` prints something like:

   ```
   src/utils.ts:14:7  [generic-name]  data2 — the sequel nobody asked for.
   src/utils.ts:22:3  [copy-paste]    dataFinalFinal — bold of you to assume this is final.
   ```

5. **Config**: `.micromanagerrc` (JSON) supporting:
   ```json
   { "intensity": "medium", "allow": ["temp", "data"] }
   ```
   `intensity` picks which roast tier to sample from (`mild` / `medium` /
   `unhinged`); `allow` suppresses matches on those exact names.

## Explicitly out of scope for MVP

- Injecting roasts as inline code comments (stretch — separate write-mode flag)
- Git pre-commit hook wiring
- Roast streak / Hall of Shame tracking across runs
- VS Code extension
- Any actual bug/logic linting — this tool must never evaluate correctness,
  only naming. Don't let scope creep pull in real lint rules.

If there's time after the MVP works end-to-end, pick up the comment-injection
mode next — it's the highest-leverage stretch goal since it's the "teammate
opens the file" punchline the whole project is built around.

## Testing expectations

Each rule needs unit tests with clear true-positive and true-negative cases
(e.g. `i` inside a `for` init is NOT flagged, `i` as a top-level var IS
flagged). Add a small fixture file under `test/fixtures/` with intentionally
bad names covering every rule, and one integration test that runs the CLI
against it and snapshots the output.

## Non-goals / guardrails

- Don't build a general-purpose AST framework — this only needs to walk
  declarations/params/classes, not full program analysis.
- Don't make roast templates configurable via plugin API in the MVP — a JSON
  file the user can edit directly is enough.
- Keep the roast tone snarky/passive-aggressive, not mean — it's a joke tool,
  not a hostile one.
