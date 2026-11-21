import type { NodePath, Scope } from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform } from '../ast-utils';

function isConstantLiteral(node: t.Node): boolean {
  return (
    t.isStringLiteral(node) ||
    t.isNumericLiteral(node) ||
    t.isBooleanLiteral(node) ||
    t.isNullLiteral(node) ||
    t.isBigIntLiteral(node) ||
    (t.isTemplateLiteral(node) && node.expressions.length === 0)
  );
}

function isTopLevelStatement(stmtPath: NodePath): boolean {
  const parent = stmtPath.parentPath;

  if (!parent) return false;

  if (parent.isProgram()) return true;

  if (parent.isBlockStatement()) {
    const grandParent = parent.parentPath;

    return (
      !!grandParent && (grandParent.isFunction() || grandParent.isProgram())
    );
  }

  return false;
}

type ScopeInfo = {
  hasEvalOrWith: boolean;
  hasFunctionConstructor: boolean;
};

const scopeInfoCache = new WeakMap<NodePath, ScopeInfo>();

function getScopeInfo(scopePath: NodePath): ScopeInfo {
  const cached = scopeInfoCache.get(scopePath);

  if (cached) return cached;

  let hasEvalOrWith = false;
  let hasFunctionConstructor = false;

  scopePath.traverse({
    CallExpression(path) {
      if (
        t.isIdentifier(path.node.callee, {
          name: 'eval',
        })
      ) {
        hasEvalOrWith = true;
        path.stop();
        return;
      }

      if (
        t.isIdentifier(path.node.callee, {
          name: 'Function',
        })
      ) {
        hasFunctionConstructor = true;
        path.stop();
      }
    },

    NewExpression(path) {
      if (
        t.isIdentifier(path.node.callee, {
          name: 'Function',
        })
      ) {
        hasFunctionConstructor = true;
        path.stop();
      }
    },

    WithStatement(path) {
      hasEvalOrWith = true;
      path.stop();
    },
  });

  const result = {
    hasEvalOrWith,
    hasFunctionConstructor,
  };

  scopeInfoCache.set(scopePath, result);

  return result;
}

const duplicateVarCache = new WeakMap<NodePath, Set<string>>();

function getDuplicateVars(scopePath: NodePath): Set<string> {
  const cached = duplicateVarCache.get(scopePath);

  if (cached) return cached;

  const seen = new Set<string>();
  const duplicates = new Set<string>();

  scopePath.traverse({
    VariableDeclarator(path) {
      if (!t.isIdentifier(path.node.id)) return;

      const name = path.node.id.name;

      if (seen.has(name)) {
        duplicates.add(name);
      } else {
        seen.add(name);
      }
    },
  });

  duplicateVarCache.set(scopePath, duplicates);

  return duplicates;
}

function hasDuplicateVarDeclarator(scopePath: NodePath, name: string): boolean {
  return getDuplicateVars(scopePath).has(name);
}

function getVarScope(scope: Scope) {
  return scope.getFunctionParent() ?? scope.getProgramParent();
}

export default {
  name: 'dead-assignment-elimination',
  tags: ['unsafe'],
  scope: true,

  visitor() {
    return {
      VariableDeclarator(path) {
        const { node } = path;

        if (!t.isIdentifier(node.id)) return;

        const declaration = path.parentPath;

        if (!declaration.isVariableDeclaration({ kind: 'var' })) {
          return;
        }

        const name = node.id.name;

        const binding = path.scope.getBinding(name);

        if (!binding || binding.kind !== 'var') {
          return;
        }

        if (binding.path.node !== node) return;

        const varScope = binding.scope;
        const isGlobal = varScope.path.isProgram();

        if (hasDuplicateVarDeclarator(varScope.path, name)) {
          return;
        }

        const scopeInfo = getScopeInfo(varScope.path);

        if (scopeInfo.hasEvalOrWith) {
          return;
        }

        if (isGlobal && scopeInfo.hasFunctionConstructor) {
          return;
        }

        let valueNode: t.Expression;
        let removePath: NodePath | null = null;

        if (node.init) {
          if (binding.constantViolations.length > 0) {
            return;
          }

          if (!isConstantLiteral(node.init)) {
            return;
          }

          if (!isTopLevelStatement(declaration)) {
            return;
          }

          valueNode = node.init;
        } else {
          if (binding.constantViolations.length !== 1) {
            return;
          }

          const violation = binding.constantViolations[0];

          if (
            !violation.isAssignmentExpression({
              operator: '=',
            })
          ) {
            return;
          }

          const assignNode = violation.node;

          if (!t.isIdentifier(assignNode.left, { name })) {
            return;
          }

          if (!isConstantLiteral(assignNode.right)) {
            return;
          }

          const stmt = violation.parentPath;

          if (!stmt?.isExpressionStatement()) {
            return;
          }

          if (!isTopLevelStatement(stmt)) {
            return;
          }

          valueNode = assignNode.right;
          removePath = stmt;
        }

        const refs = binding.referencePaths;

        // IMPORTANT:
        // Do not delete unused variables.
        // This transform only eliminates assignments.
        if (refs.length === 0) {
          return;
        }

        const valueEndPos = removePath?.node.end ?? node.end;

        if (valueEndPos == null) {
          return;
        }

        for (const ref of refs) {
          if (getVarScope(ref.scope) !== varScope) {
            return;
          }

          if (ref.node.start == null) {
            return;
          }

          if (ref.node.start < valueEndPos) {
            return;
          }
        }

        for (const ref of refs) {
          ref.replaceWith(t.cloneNode(valueNode));
        }

        removePath?.remove();

        if (declaration.node.declarations.length === 1) {
          declaration.remove();
        } else {
          path.remove();
        }

        this.changes++;
      },
    };
  },
} satisfies Transform;
