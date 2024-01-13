import traverse, { Binding, NodePath, Scope } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { constMemberExpression, findPath, renameFast } from '../../ast-utils';

/**
 * Example: `__webpack_require__(id)`
 */
interface RequireCall {
  moduleId: string;
  path: NodePath<t.CallExpression>;
}

/**
 * Example: `var foo = __webpack_require__(id);`
 */
interface RequireVar {
  name: string;
  moduleId: string;
  binding: Binding;
}

export class ImportExportManager {
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
    this.collectExportDefinitions();
  }

  addExport(scope: Scope, exportName: string, value: t.Expression) {
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
        this.reExportAll(binding, requireVar.moduleId);
      } else {
        this.exportLocalVar(binding, exportName);
      }
    } else if (memberExpressionMatcher.match(value)) {
      const binding = scope.getBinding(objectName.current!);
      if (!binding) return;
      const requireVar = findRequireVar(binding);
      if (!requireVar) return;

      this.reExportNamed(
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
  private reExportNamed(
    binding: Binding,
    moduleId: string,
    localName: string,
    exportName: string,
  ) {
    const existingExport = this.reExportCache.get(moduleId);
    const specifier = t.exportSpecifier(
      t.identifier(localName),
      t.identifier(exportName),
    );
    if (existingExport) {
      existingExport.specifiers.push(specifier);
    } else {
      // TODO: resolve to file path
      const exportDeclaration = t.exportNamedDeclaration(
        undefined,
        [specifier],
        t.stringLiteral(moduleId),
      );
      binding.path.parentPath?.insertAfter(exportDeclaration);
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
  private exportLocalVar(binding: Binding, exportName: string) {
    const declaration = findPath(
      binding.path,
      m.or(
        m.variableDeclaration(),
        m.classDeclaration(),
        m.functionDeclaration(),
      ),
    );
    if (!declaration) return;
    // FIXME: check if its already exported and add `export { a as b }` instead.
    renameFast(binding, exportName);
    declaration.replaceWith(t.exportNamedDeclaration(declaration.node));
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
  private reExportAll(binding: Binding, moduleId: string) {
    // TODO: resolve to file path
    binding.path.parentPath?.insertAfter(
      t.exportAllDeclaration(t.stringLiteral(moduleId)),
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
            name: varName.current!,
            binding,
          });
        }
      });
    });
  }

  /**
   * Extract the export information from all `__webpack_require__.d` calls
   */
  private collectExportDefinitions() {
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

    const defaultExpressionExport = m.expressionStatement(
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
          this.addExport(path.scope, exportName.current!, returnValue.current!);
          path.remove();
        } else if (defaultExpressionExport.match(path.node)) {
          // TODO: handle
          // path.replaceWith(t.exportDefaultDeclaration(returnValue.current!));
        } else if (multiExport.match(path.node)) {
          for (const property of properties.current!) {
            objectProperty.match(property); // To easily get the captures per property
            this.addExport(
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
