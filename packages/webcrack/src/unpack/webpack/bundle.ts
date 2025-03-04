import type { NodePath } from '@babel/traverse';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Bundle } from '../bundle';
import { relativePath } from '../path';
import { convertESM } from './esm';
import { convertDefaultRequire } from './getDefaultExport';
import type { WebpackModule } from './module';
import { inlineVarInjections } from './varInjection';

export class WebpackBundle extends Bundle {
  constructor(entryId: string, modules: Map<string, WebpackModule>) {
    super('webpack', entryId, modules);
  }

  /**
   * Undoes some of the transformations that Webpack injected into the modules.
   */
  applyTransforms(): void {
    this.modules.forEach(inlineVarInjections);
    this.modules.forEach(convertESM);
    convertDefaultRequire(this);
    this.replaceRequirePaths();
  }

  /**
   * Replaces `require(id)` calls with `require("./relative/path.js")` calls.
   */
  private replaceRequirePaths() {
    const requireId = m.capture(m.or(m.numericLiteral(), m.stringLiteral()));
    const requireMatcher = m.or(
      m.callExpression(m.identifier('require'), [requireId]),
    );
    const importId = m.capture(m.stringLiteral());
    const importMatcher = m.importDeclaration(m.anything(), importId);

    this.modules.forEach((module) => {
      traverse(module.ast, {
        'CallExpression|ImportDeclaration': (path) => {
          let moduleId: string;
          let arg: NodePath;

          if (requireMatcher.match(path.node)) {
            moduleId = requireId.current!.value.toString();
            [arg] = path.get('arguments') as NodePath<t.Identifier>[];
          } else if (importMatcher.match(path.node)) {
            moduleId = importId.current!.value;
            arg = path.get('source') as NodePath;
          } else {
            return;
          }

          const requiredModule = this.modules.get(moduleId);
          arg.replaceWith(
            t.stringLiteral(
              relativePath(
                module.path,
                requiredModule?.path ?? `./${moduleId}.js`,
              ),
            ),
          );
          // For example if its stored in another chunk
          if (!requiredModule) {
            arg.addComment('leading', 'webcrack:missing');
          }
        },
        noScope: true,
      });

      MyExport2(module.ast);
    });
  }
}

const MyExport2 = (ast: any) => {
  // Traverse the AST to find and replace the require.d call.
  traverse(ast, {
    CallExpression(path) {
      const { node } = path;
      // Check that we have: require.d(...)
      if (
        t.isMemberExpression(node.callee) &&
        t.isIdentifier(node.callee.object, { name: 'require' }) &&
        t.isIdentifier(node.callee.property, { name: 'd' })
      ) {
        const args = node.arguments;
        // Ensure the first argument is "exports" and the second is an object expression.
        if (
          args.length === 2 &&
          t.isIdentifier(args[0], { name: 'exports' }) &&
          t.isObjectExpression(args[1])
        ) {
          args[1].properties.forEach((prop) => {
            // Handle properties defined as standard object properties.
            if (t.isObjectProperty(prop)) {
              // Get the property key (it could be an identifier or a literal).
              const keyName = t.isIdentifier(prop.key) ? prop.key.name : '';
              // The value should be a function that returns the desired value.
              if (
                t.isFunctionExpression(prop.value) ||
                t.isArrowFunctionExpression(prop.value)
              ) {
                let returnExpr = null;
                // If the function has a block body, look for a ReturnStatement.
                if (t.isBlockStatement(prop.value.body)) {
                  const returnStmt = prop.value.body.body.find((s) =>
                    t.isReturnStatement(s),
                  );
                  if (returnStmt) {
                    returnExpr = returnStmt.argument;
                  }
                } else {
                  // For arrow functions with an expression body.
                  returnExpr = prop.value.body;
                }

                if (returnExpr) {
                  // Build the new assignment expression: module.exports.B = <returnExpr>;
                  const assignment = t.expressionStatement(
                    t.assignmentExpression(
                      '=',
                      t.memberExpression(
                        t.memberExpression(
                          t.identifier('module'),
                          t.identifier('exports'),
                        ),
                        t.identifier(keyName),
                      ),
                      returnExpr,
                    ),
                  );
                  // Replace the entire statement containing the original require.d call.
                  ast.program.body.push(assignment);
                }
              }
            }
          });
          path.remove();
        }
      }
    },
  });
};

const MyExport = (ast: any) => {
  traverse(ast, {
    CallExpression(path) {
      if (
        t.isMemberExpression(path.node.callee) &&
        t.isIdentifier(path.node.callee.object, { name: 'require' }) &&
        t.isIdentifier(path.node.callee.property, { name: 'd' }) &&
        t.isIdentifier(path.node.arguments[0], { name: 'exports' }) &&
        t.isObjectExpression(path.node.arguments[1])
      ) {
        const exportSpecs: (t.ExportSpecifier | t.ExportDefaultSpecifier)[] =
          [];
        const properties = path.node.arguments[1].properties;

        properties.forEach((prop) => {
          if (
            t.isObjectProperty(prop) &&
            t.isIdentifier(prop.key) &&
            t.isFunctionExpression(prop.value)
          ) {
            const returnStmt = prop.value.body.body[0];
            if (prop.key.name === 'default') {
              // Handle default export
              if (t.isReturnStatement(returnStmt) && returnStmt.argument) {
                // Directly push default export to program body
                ast.program.body.push(
                  t.exportDefaultDeclaration(returnStmt.argument),
                );
              }
            } else if (
              t.isReturnStatement(returnStmt) &&
              t.isFunctionExpression(returnStmt.argument)
            ) {
              // Keep the returned function as is since it contains complex logic
              exportSpecs.push(
                t.exportSpecifier(
                  t.identifier(prop.key.name),
                  t.identifier(prop.key.name),
                ),
              );

              // Add a variable declaration for the function before the export
              ast.program.body.push(
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    t.identifier(prop.key.name),
                    returnStmt.argument,
                  ),
                ]),
              );
            } else if (
              t.isReturnStatement(returnStmt) &&
              t.isIdentifier(returnStmt.argument)
            ) {
              // Handle simple return of identifier
              exportSpecs.push(
                t.exportSpecifier(
                  t.identifier(returnStmt.argument.name),
                  t.identifier(prop.key.name),
                ),
              );
            }
          }
        });

        if (exportSpecs.length > 0) {
          ast.program.body.push(t.exportNamedDeclaration(null, exportSpecs));
        }

        path.remove();
      }
    },
  });
};
