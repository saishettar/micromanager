import { createRequire } from 'node:module';
import { parse } from '@babel/parser';
import type { NodePath, TraverseOptions } from '@babel/traverse';
import type * as t from '@babel/types';

// @babel/traverse's CJS/ESM default-export shape isn't reliably typed under
// NodeNext resolution, so bypass it with a real `require` for the runtime value.
const require = createRequire(import.meta.url);
const traverseModule = require('@babel/traverse');
const traverse: (ast: t.Node, opts: TraverseOptions) => void = traverseModule.default ?? traverseModule;

export type IdentifierKind = 'var' | 'func' | 'param' | 'class';

export interface Identifier {
  name: string;
  kind: IdentifierKind;
  line: number;
  col: number;
  scopeId: string;
  /** True when this identifier is the loop-variable of a for/for-in/for-of init. */
  isForLoopCounter?: boolean;
}

function isForLoopCounter(path: NodePath<t.VariableDeclarator>): boolean {
  const declList = path.parentPath;
  const forLike = declList?.parentPath;
  if (!declList || !forLike) return false;

  if (forLike.isForStatement() && forLike.node.init === declList.node) {
    return true;
  }
  if ((forLike.isForInStatement() || forLike.isForOfStatement()) && forLike.node.left === declList.node) {
    return true;
  }
  return false;
}

export function parseFile(code: string, filename: string): Identifier[] {
  const ast = parse(code, {
    sourceType: 'unambiguous',
    plugins: ['typescript', 'jsx'],
    errorRecovery: true,
    attachComment: false,
  });

  const identifiers: Identifier[] = [];

  function record(id: t.Identifier | null | undefined, kind: IdentifierKind, scopeId: string, loopCounter = false) {
    if (!id || !id.loc) return;
    identifiers.push({
      name: id.name,
      kind,
      line: id.loc.start.line,
      col: id.loc.start.column + 1,
      scopeId,
      isForLoopCounter: loopCounter,
    });
  }

  function recordParams(params: t.Function['params'], scopeId: string) {
    for (const param of params) {
      if (param.type === 'Identifier') {
        record(param, 'param', scopeId);
      }
    }
  }

  traverse(ast, {
    VariableDeclarator(path) {
      if (path.node.id.type !== 'Identifier') return;
      record(path.node.id, 'var', String(path.scope.uid), isForLoopCounter(path));
    },
    FunctionDeclaration(path) {
      record(path.node.id, 'func', String(path.scope.uid));
      recordParams(path.node.params, String(path.scope.uid));
    },
    FunctionExpression(path) {
      record(path.node.id, 'func', String(path.scope.uid));
      recordParams(path.node.params, String(path.scope.uid));
    },
    ArrowFunctionExpression(path) {
      recordParams(path.node.params, String(path.scope.uid));
    },
    ClassDeclaration(path) {
      record(path.node.id, 'class', String(path.scope.uid));
    },
    ClassExpression(path) {
      record(path.node.id, 'class', String(path.scope.uid));
    },
  });

  return identifiers;
}
