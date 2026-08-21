import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import type { NodePath, TraverseOptions } from '@babel/traverse';
import type * as t from '@babel/types';

type TraverseFn = (ast: t.Node, opts: TraverseOptions) => void;

// @babel/traverse's CJS/ESM default-export shape isn't reliably typed under
// NodeNext resolution (the static type ends up as an uncallable module
// namespace), so resolve the real callable at runtime and give it its own
// explicit type instead of trusting `typeof _traverse`.
const traverse: TraverseFn = typeof _traverse === 'function' ? _traverse : (_traverse as any).default;

export type IdentifierKind = 'var' | 'func' | 'param' | 'class';

export interface Identifier {
  name: string;
  kind: IdentifierKind;
  line: number;
  col: number;
  scopeId: string;
  /** True when this identifier is the loop-variable of a for/for-in/for-of init. */
  isForLoopCounter?: boolean;
  /** 1-indexed column the identifier's name ends at (exclusive); used to size editor diagnostics. */
  endCol?: number;
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
      endCol: id.loc.end.column + 1,
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
