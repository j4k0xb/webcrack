import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { renameFast, type Transform } from '../ast-utils';
import { generateUid } from '../ast-utils/scope';

export default {
  name: 'mangle',
  tags: ['safe'],
  scope: true,
  visitor(match = () => true) {
    return {
      BindingIdentifier: {
        exit(path) {
          if (!path.isBindingIdentifier()) return;
          if (path.parentPath.isImportSpecifier()) return;
          if (path.parentPath.isObjectProperty()) return;
          if (!match(path.node.name)) return;

          const binding = path.scope.getBinding(path.node.name);
          if (!binding) return;
          if (
            binding.referencePaths.some((ref) => ref.isExportNamedDeclaration())
          )
            return;

          renameFast(binding, inferName(path));
        },
      },
    };
  },
} satisfies Transform<(id: string) => boolean>;

const requireMatcher = m.variableDeclarator(
  m.identifier(),
  m.callExpression(m.identifier('require'), [m.stringLiteral()]),
);

function inferName(path: NodePath<t.Identifier>): string {
  if (path.parentPath.isClass({ id: path.node })) {
    return generateUid(path.scope, 'C');
  } else if (path.parentPath.isFunction({ id: path.node })) {
    return generateUid(path.scope, 'f');
  } else if (
    path.listKey === 'params' ||
    (path.parentPath.isAssignmentPattern({ left: path.node }) &&
      path.parentPath.listKey === 'params')
  ) {
    return generateUid(path.scope, 'p');
  } else if (requireMatcher.match(path.parent)) {
    return generateUid(
      path.scope,
      (path.parentPath.get('init.arguments.0') as NodePath<t.StringLiteral>)
        .node.value,
    );
  } else if (path.parentPath.isVariableDeclarator({ id: path.node })) {
    const init = path.parentPath.get('init');
    const suffix = (init.isExpression() && generateExpressionName(init)) || '';
    return generateUid(path.scope, 'v' + titleCase(suffix));
  } else if (path.parentPath.isCatchClause()) {
    return generateUid(path.scope, 'e');
  } else if (path.parentPath.isArrayPattern()) {
    return generateUid(path.scope, 'v');
  } else {
    return path.node.name;
  }
}

function generateExpressionName(
  expression: NodePath<t.Expression>,
): string | undefined {
  if (expression.isIdentifier()) {
    return expression.node.name;
  } else if (expression.isFunctionExpression()) {
    return expression.node.id?.name ?? 'f';
  } else if (expression.isArrowFunctionExpression()) {
    return 'f';
  } else if (expression.isClassExpression()) {
    return expression.node.id?.name ?? 'C';
  } else if (expression.isCallExpression()) {
    return generateExpressionName(
      expression.get('callee') as NodePath<t.Expression>,
    );
  } else if (expression.isThisExpression()) {
    return 'this';
  } else if (expression.isNumericLiteral()) {
    return 'LN' + expression.node.value.toString();
  } else if (expression.isStringLiteral()) {
    return 'LS' + titleCase(expression.node.value).slice(0, 20);
  } else if (expression.isObjectExpression()) {
    return 'O';
  } else if (expression.isArrayExpression()) {
    return 'A';
  } else {
    return undefined;
  }
}

function titleCase(str: string) {
  return str
    .replace(/(?:^|\s)([a-z])/g, (_, m) => (m as string).toUpperCase())
    .replace(/[^a-zA-Z0-9$_]/g, '');
}
