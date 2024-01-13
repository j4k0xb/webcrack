import { statement } from '@babel/template';
import traverse, { Binding, NodePath, Scope } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { constMemberExpression, renameFast } from '../../ast-utils';

/**
 * Example: `__webpack_require__(id)`
 */
interface RequireCall {
  path: NodePath<t.CallExpression>;
  moduleId: string;
}

/**
 * Example: `var foo = __webpack_require__(id);`
 */
interface RequireVar {
  binding: Binding;
  moduleId: string;
}

export class ImportExportManager {
  exports = new Set<string>();

  private ast: t.File;
  private webpackRequire: Binding | undefined;
  /**
   * All `var foo = __webpack_require__(id);` variable declarations
   */
  private requireVars: RequireVar[] = [];
  /**
   * All `__webpack_require__(id)` calls
   */
  private requireCalls: RequireCall[] = [];
  /**
   * Used for merging multiple re-exports of a module
   */
  private reExportCache = new Map<string, t.ExportNamedDeclaration>();

  constructor(ast: t.File, webpackRequireBinding: Binding | undefined) {
    this.ast = ast;
    this.webpackRequire = webpackRequireBinding;
    this.collectRequireCalls();
    this.transformExports();
  }

  private transformExport(
    scope: Scope,
    exportName: string,
    value: t.Expression,
  ) {
    this.exports.add(exportName);

    const objectName = m.capture(m.anyString());
    const propertyName = m.capture(m.anyString());
    const memberExpressionMatcher = m.memberExpression(
      m.identifier(objectName),
      m.identifier(propertyName),
    );

    const findRequireVar = (binding: Binding) =>
      this.requireVars.find((v) => v.binding.path.node === binding.path.node);

    if (t.isIdentifier(value)) {
      const binding = scope.getBinding(value.name);
      if (!binding) return;
      const requireVar = findRequireVar(binding);

      if (requireVar) {
        this.addExportAll(binding, requireVar.moduleId, exportName);
      } else if (exportName === 'default' && binding.references === 1) {
        this.addExportDefault(binding);
      } else {
        this.addExportDeclaration(binding, exportName);
      }
    } else if (memberExpressionMatcher.match(value)) {
      const binding = scope.getBinding(objectName.current!);
      if (!binding) return;
      const requireVar = findRequireVar(binding);
      if (!requireVar) return;

      this.addExportFrom(
        requireVar.binding,
        requireVar.moduleId,
        propertyName.current!,
        exportName,
      );
    } else {
      throw new Error(`Unexpected export: ${value.type}`);
    }
  }

  /**
   * Example:
   * ```js
   * __webpack_require__.d(exports, { foo: () => lib.bar });
   * var lib = __webpack_require__("lib");
   * ```
   * to
   * ```js
   * export { bar as foo } from 'lib';
   * ```
   */
  private addExportFrom(
    binding: Binding,
    moduleId: string,
    localName: string,
    exportName: string,
  ) {
    const existingExport = this.reExportCache.get(moduleId);
    if (existingExport) {
      existingExport.specifiers.push(
        t.exportSpecifier(t.identifier(localName), t.identifier(exportName)),
      );
    } else {
      // TODO: resolve to file path
      const exportDeclaration =
        statement`export { ${localName} as ${exportName} } from '${moduleId}'`() as t.ExportNamedDeclaration;
      const [path] = binding.path.parentPath!.insertAfter(exportDeclaration);
      binding.reference(path.get('specifiers.0.local') as NodePath);
      this.reExportCache.set(moduleId, exportDeclaration);
    }
  }

  /**
   * Example:
   * ```js
   * __webpack_require__.d(exports, { counter: () => foo });
   * var foo = 1;
   * ```
   * to
   * ```js
   * export var counter = 1;
   * ```
   */
  private addExportDeclaration(binding: Binding, exportName: string) {
    const statementPath = binding.path.getStatementParent()!;
    const matcher = m.or(
      m.variableDeclaration(),
      m.classDeclaration(),
      m.functionDeclaration(),
      m.exportNamedDeclaration(),
    );
    if (!matcher.match(statementPath.node)) return;

    const isDeclarationExport =
      exportName !== 'default' &&
      statementPath.type !== 'ExportNamedDeclaration';

    if (isDeclarationExport) {
      // Example: export var counter = 1;
      renameFast(binding, exportName);
      statementPath.replaceWith(t.exportNamedDeclaration(statementPath.node));
    } else {
      // Example: export { foo as bar };
      const [path] = statementPath.insertAfter(
        statement`export { ${binding.identifier.name} as ${exportName} }`(),
      );
      binding.reference(path.get('specifiers.0.local') as NodePath);
    }
  }

  /**
   * Example:
   * ```js
   * __webpack_require__.d(exports, { default: () => foo });
   * var foo = 1;
   * ```
   * to
   * ```js
   * export default 1;
   * ```
   */
  private addExportDefault(binding: Binding) {
    const node = binding.path.node;
    const value =
      node.type === 'VariableDeclarator'
        ? node.init!
        : (node as t.ClassDeclaration | t.FunctionDeclaration);
    binding.path
      .getStatementParent()!
      .replaceWith(statement`export default ${value}`());
  }

  /**
   * Example:
   * ```js
   * __webpack_require__.d(exports, { foo: () => lib });
   * var lib = __webpack_require__("lib");
   * ```
   * to
   * ```js
   * export * as foo from 'lib';
   * ```
   */
  private addExportAll(binding: Binding, moduleId: string, exportName: string) {
    // TODO: resolve to file path
    binding.path.parentPath!.insertAfter(
      statement`export * as ${exportName} from '${moduleId}'`(),
    );
  }

  /**
   * Finds all `__webpack_require__(id)` and `var foo = __webpack_require__(id);` calls
   */
  private collectRequireCalls() {
    const idArg = m.capture(m.or(m.numericLiteral(), m.stringLiteral()));
    const requireCall = m.callExpression(m.identifier('__webpack_require__'), [
      idArg,
    ]);

    const varName = m.capture(m.anyString());
    const requireVar = m.variableDeclaration(undefined, [
      m.variableDeclarator(m.identifier(varName), requireCall),
    ]);

    this.webpackRequire?.referencePaths.forEach((path) => {
      m.matchPath(requireCall, { idArg }, path.parentPath!, ({ idArg }) => {
        this.requireCalls.push({
          moduleId: idArg.node.value.toString(),
          path: path.parentPath as NodePath<t.CallExpression>,
        });
        if (requireVar.match(path.parentPath!.parentPath?.parent)) {
          const binding = path.scope.getBinding(varName.current!)!;
          this.requireVars.push({
            moduleId: idArg.node.value.toString(),
            binding,
          });
        }
      });
    });
  }

  /**
   * Extract the export information from all `__webpack_require__.d` calls
   */
  private transformExports() {
    const exportName = m.capture(m.anyString());
    const returnValue = m.capture(m.anyExpression());
    const getter = m.or(
      m.functionExpression(
        undefined,
        [],
        m.blockStatement([m.returnStatement(returnValue)]),
      ),
      m.arrowFunctionExpression([], returnValue),
    );
    // Example (webpack v4): __webpack_require__.d(exports, 'counter', function () { return local });
    const singleExport = m.expressionStatement(
      m.callExpression(constMemberExpression('__webpack_require__', 'd'), [
        m.identifier(),
        m.stringLiteral(exportName),
        getter,
      ]),
    );

    // Example (webpack v4): exports.default = 1;
    const defaultExportAssignment = m.expressionStatement(
      m.assignmentExpression(
        '=',
        constMemberExpression('exports', 'default'),
        returnValue,
      ),
    );

    const objectProperty = m.objectProperty(m.identifier(exportName), getter);
    const properties = m.capture(m.arrayOf(objectProperty));
    // Example (webpack v5): __webpack_require__.d(exports, { a: () => b, c: () => d });
    const multiExport = m.expressionStatement(
      m.callExpression(constMemberExpression('__webpack_require__', 'd'), [
        m.identifier(),
        m.objectExpression(properties),
      ]),
    );

    traverse(this.ast, {
      ExpressionStatement: (path) => {
        if (!path.parentPath.isProgram()) return path.skip();

        if (singleExport.match(path.node)) {
          this.transformExport(
            path.scope,
            exportName.current!,
            returnValue.current!,
          );
          path.remove();
        } else if (defaultExportAssignment.match(path.node)) {
          this.exports.add('default');
          path.replaceWith(statement`export default ${returnValue.current}`());
        } else if (multiExport.match(path.node)) {
          for (const property of properties.current!) {
            objectProperty.match(property); // To easily get the captures per property
            this.transformExport(
              path.scope,
              exportName.current!,
              returnValue.current!,
            );
          }
          path.remove();
        }
      },
    });
  }
}
