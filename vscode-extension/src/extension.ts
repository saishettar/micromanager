import * as vscode from 'vscode';
import { parseFile } from '../../dist/parser.js';
import { runRules } from '../../dist/rules/index.js';
import { loadConfig } from '../../dist/config.js';
import { generateRoast } from '../../dist/roast-generator.js';

const LINT_LANGUAGES = new Set(['javascript', 'javascriptreact', 'typescript', 'typescriptreact']);
const DEBOUNCE_MS = 400;

let diagnostics: vscode.DiagnosticCollection;
const debounceTimers = new Map<string, NodeJS.Timeout>();

export function activate(context: vscode.ExtensionContext): void {
  diagnostics = vscode.languages.createDiagnosticCollection('micromanager');
  context.subscriptions.push(diagnostics);

  context.subscriptions.push(
    vscode.commands.registerCommand('micromanager.relint', () => {
      for (const doc of vscode.workspace.textDocuments) {
        lintDocument(doc);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => lintDocument(doc)),
    vscode.workspace.onDidChangeTextDocument((event) => scheduleLint(event.document)),
    vscode.workspace.onDidCloseTextDocument((doc) => diagnostics.delete(doc.uri)),
  );

  for (const doc of vscode.workspace.textDocuments) {
    lintDocument(doc);
  }
}

export function deactivate(): void {
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
}

function scheduleLint(doc: vscode.TextDocument): void {
  const key = doc.uri.toString();
  const existing = debounceTimers.get(key);
  if (existing) clearTimeout(existing);

  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      lintDocument(doc);
    }, DEBOUNCE_MS),
  );
}

function lintDocument(doc: vscode.TextDocument): void {
  if (!LINT_LANGUAGES.has(doc.languageId)) return;

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
  const cwd = workspaceFolder?.uri.fsPath ?? process.cwd();
  const config = loadConfig(cwd);
  const allowSet = new Set(config.allow.map((name) => name.toLowerCase()));

  let identifiers;
  try {
    identifiers = parseFile(doc.getText(), doc.fileName);
  } catch {
    // unparsable buffer (e.g. mid-edit syntax error) — clear stale diagnostics and wait for the next edit
    diagnostics.delete(doc.uri);
    return;
  }

  const matches = runRules(identifiers).filter((match) => !allowSet.has(match.identifier.name.toLowerCase()));

  const items: vscode.Diagnostic[] = matches.map((match) => {
    const { line, col, endCol, name } = match.identifier;
    // seeded so the same violation shows the same roast across relints instead of rerolling on every keystroke
    const seed = `${doc.fileName}:${line}:${col}:${name}:${match.ruleId}`;
    const roast = generateRoast(match, config.intensity, seed);

    const range = new vscode.Range(
      new vscode.Position(line - 1, col - 1),
      new vscode.Position(line - 1, (endCol ?? col + name.length) - 1),
    );

    const diagnostic = new vscode.Diagnostic(range, roast, vscode.DiagnosticSeverity.Warning);
    diagnostic.source = 'micromanager';
    diagnostic.code = match.ruleId;
    return diagnostic;
  });

  diagnostics.set(doc.uri, items);
}
