import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { isConstantBinding, type Transform } from '../../ast-utils';
import type { NodePath, Scope } from '@babel/traverse';

export default {
  name: 'let-to-const',
  tags: ['safe'],
  visitor: () => ({
    VariableDeclaration: {
      exit(path) {
        if (!letMatcher.match(path.node)) return;
        // we can't do this transformation on the top-level
        if (path.parentPath.isProgram()) return;
        if (path.key === 'init' && path.parentPath.isForStatement()) return;

        const declarations: Array<t.VariableDeclaration> = [];
        let changes = 0;
        for (const declaration of path.node.declarations) {
          if (path.scope && isConstant(declaration.id, path.scope)) {
            declarations.push(t.variableDeclaration('const', [declaration]));
            changes++;
          } else {
            declarations.push(t.variableDeclaration('let', [declaration]));
          }
        }

        if (!changes) return;

        path.replaceWithMultiple(declarations);
        this.changes += changes;
      },
    },
  }),
  scope: true,
} satisfies Transform;

function isConstant(id: t.LVal, scope: Scope): boolean {
  if (t.isIdentifier(id)) {
    const binding = scope.getBinding(id.name);
    return binding ? isConstantBinding(binding) : false;
  }

  if (t.isArrayPattern(id)) {
    return id.elements.every(
      (element) => element && isConstant(element, scope),
    );
  }

  if (t.isObjectPattern(id)) {
    return id.properties.every((property) =>
      isConstant(
        t.isRestElement(property)
          ? property.argument
          : (property.value as t.LVal),
        scope,
      ),
    );
  }

  return false;
}

const letMatcher = m.variableDeclaration('let', m.anything());
