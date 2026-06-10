import * as t from '@babel/types';
import type { Transform } from '../../ast-utils';

function isMultiDeclaration(
  stmt: t.Node | null | undefined,
): stmt is t.VariableDeclaration {
  return t.isVariableDeclaration(stmt) && stmt.declarations.length > 1;
}

function isMultiExport(
  stmt: t.Node | null | undefined,
): stmt is t.ExportNamedDeclaration {
  return (
    t.isExportNamedDeclaration(stmt) && isMultiDeclaration(stmt.declaration)
  );
}

function isMultiDeclarationFor(
  stmt: t.Node | null | undefined,
): stmt is t.ForStatement {
  return (
    t.isForStatement(stmt) &&
    !stmt.test &&
    !stmt.update &&
    isMultiDeclaration(stmt.init) &&
    stmt.init.kind === 'var'
  );
}

export default {
  name: 'split-variable-declarations',
  tags: ['safe'],
  visitor: () => ({
    Block(path) {
      // Fast path (reached ~99% of the time): expand into multiple variable declarations
      // by allocating new array once instead of splicing for each match.
      const startIndex = path.node.body.findIndex(
        (stmt) =>
          isMultiDeclaration(stmt) ||
          isMultiDeclarationFor(stmt) ||
          isMultiExport(stmt),
      );
      if (startIndex === -1) return;

      const newBody: t.Statement[] = path.node.body.slice(0, startIndex);

      for (let i = startIndex; i < path.node.body.length; i++) {
        const stmt = path.node.body[i];
        if (isMultiDeclaration(stmt)) {
          stmt.declarations.forEach((decl) => {
            newBody.push(t.variableDeclaration(stmt.kind, [decl]));
          });
        } else if (isMultiDeclarationFor(stmt)) {
          const declaration = stmt.init as t.VariableDeclaration;
          declaration.declarations.forEach((decl) => {
            newBody.push(t.variableDeclaration('var', [decl]));
          });
          stmt.init = null;
          newBody.push(stmt);
        } else if (isMultiExport(stmt)) {
          const declaration = stmt.declaration as t.VariableDeclaration;
          declaration.declarations.forEach((decl) => {
            newBody.push(
              t.exportNamedDeclaration(
                t.variableDeclaration(declaration.kind, [decl]),
              ),
            );
          });
        } else {
          newBody.push(stmt);
        }
      }

      this.changes += newBody.length - path.node.body.length;
      path.node.body = newBody;
    },
    VariableDeclaration: {
      exit(path) {
        if (path.node.declarations.length > 1) {
          // E.g. for (var i = 0, j = 1;;)
          if (path.key === 'init' && path.parentPath.isForStatement()) {
            if (
              !path.parentPath.node.test &&
              !path.parentPath.node.update &&
              path.node.kind === 'var'
            ) {
              path.parentPath.insertBefore(
                path.node.declarations.map((declaration) =>
                  t.variableDeclaration(path.node.kind, [declaration]),
                ),
              );
              path.remove();
              this.changes++;
            }
          } else {
            if (path.parentPath.isExportNamedDeclaration()) {
              path.parentPath.replaceWithMultiple(
                path.node.declarations.map((declaration) =>
                  t.exportNamedDeclaration(
                    t.variableDeclaration(path.node.kind, [declaration]),
                  ),
                ),
              );
            } else {
              path.replaceWithMultiple(
                path.node.declarations.map((declaration) =>
                  t.variableDeclaration(path.node.kind, [declaration]),
                ),
              );
            }
            this.changes++;
          }
        }
      },
    },
  }),
} satisfies Transform;
