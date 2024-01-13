import traverse, { Binding, NodePath, Scope } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import assert from 'assert';
import { constMemberExpression, findPath, renameFast } from '../../ast-utils';

/**
 * Example: `__webpack_require__(id)`
 */
interface RequireCall {
  moduleId: string;
  path: NodePath<t.CallExpression>;
}

type RequireVarBinding = Binding & { path: NodePath<t.VariableDeclarator> };

/**
 * Example: `var foo = __webpack_require__(id);`
 */
interface RequireVar {
  name: string;
  moduleId: string;
  binding: RequireVarBinding;
}

type ExportDefinition =
  | {
      /**
       * Example:
       * ```js
       * __webpack_require__.d(exports, { counter: () => foo });
       * var foo = 1;
       * ```
       */
      kind: 'local-var';
      exportName: string;
      binding: Binding;
    }
  | {
      /**
       * Example:
       * ```js
       * __webpack_require__.d(exports, { readFile: () => lib.readFile });
       * var lib = __webpack_require__("lib");
       * ```
       */
      kind: 're-export-named';
      exportName: string;
      localName: string;
      moduleId: string;
      binding: RequireVarBinding;
    }
  | {
      /**
       * Example: `export * as lib from 'lib';`
       * ```js
       * __webpack_require__.d(exports, { lib: () => lib });
       * var lib = __webpack_require__("lib");
       * ```
       */
      kind: 're-export-all-named';
      exportName: string;
      moduleId: string;
      binding: RequireVarBinding;
    };

export class ImportExportManager {
  private ast: t.File;
  private requireBinding: Binding | undefined;
  /**
   * All `var foo = __webpack_require__(id);` statements
   */
  private requireVars: RequireVar[] = [];
  /**
   * All `__webpack_require__(id)` calls
   */
  private requireCalls: RequireCall[] = [];
  private exportDefinitions: ExportDefinition[] = [];

  constructor(ast: t.File, webpackRequireBinding: Binding | undefined) {
    this.ast = ast;
    this.requireBinding = webpackRequireBinding;
    this.collectRequireCalls();
    this.collectExportDefinitions();
    this.createExportStatements();
    this.removeUnusedVarRequires();
  }

  createExportStatements() {
    const mergedReExports = new Map<string, t.ExportNamedDeclaration>();

    for (const definition of this.exportDefinitions) {
      if (definition.kind === 'local-var') {
        const declaration = findPath(
          definition.binding.path,
          m.or(
            m.variableDeclaration(),
            m.classDeclaration(),
            m.functionDeclaration(),
          ),
        );
        if (!declaration) continue;

        renameFast(definition.binding, definition.exportName);
        declaration.replaceWith(t.exportNamedDeclaration(declaration.node));
      } else if (definition.kind === 're-export-named') {
        const existingExport = mergedReExports.get(definition.moduleId);
        const specifier = t.exportSpecifier(
          t.identifier(definition.localName),
          t.identifier(definition.exportName),
        );
        if (existingExport) {
          existingExport.specifiers.push(specifier);
        } else {
          // TODO: resolve to file path
          const exportDeclaration = t.exportNamedDeclaration(
            undefined,
            [specifier],
            t.stringLiteral(definition.moduleId),
          );
          definition.binding.path.parentPath.insertAfter(exportDeclaration);
          mergedReExports.set(definition.moduleId, exportDeclaration);
        }
      } else if (definition.kind === 're-export-all-named') {
        // TODO: resolve to file path
        definition.binding.path.parentPath.insertAfter(
          t.exportAllDeclaration(t.stringLiteral(definition.moduleId)),
        );
      }
    }
    console.log(this.exportDefinitions);
  }

  addExportDefinition(scope: Scope, exportName: string, value: t.Expression) {
    const object = m.capture(m.identifier());
    const property = m.capture(m.identifier());
    const memberExpressionMatcher = m.memberExpression(object, property);

    const findRequireVar = (binding: Binding) =>
      this.requireVars.find((v) => v.binding.path.node === binding.path.node);

    if (t.isIdentifier(value)) {
      const binding = scope.getBinding(value.name);
      if (!binding) return;
      const requireVar = findRequireVar(binding);

      if (requireVar) {
        this.exportDefinitions.push({
          kind: 're-export-all-named',
          exportName,
          moduleId: requireVar.moduleId,
          binding: requireVar.binding,
        });
      } else {
        this.exportDefinitions.push({
          kind: 'local-var',
          exportName,
          binding,
        });
      }
    } else if (memberExpressionMatcher.match(value)) {
      const binding = scope.getBinding(object.current!.name);
      if (!binding) return;
      const requireVar = findRequireVar(binding);
      if (!requireVar) return;

      this.exportDefinitions.push({
        kind: 're-export-named',
        exportName,
        localName: property.current!.name,
        moduleId: requireVar.moduleId,
        binding: requireVar.binding,
      });
    } else {
      // FIXME: implement, can this even happen?
      assert(false, 'Unexpected export value');
    }
  }

  removeUnusedVarRequires() {
    // for (const v of this.requireVars) {
      
    // }
  }

  /**
   * Finds all `__webpack_require__(id)` and `var foo = __webpack_require__(id);` calls
   */
  collectRequireCalls() {
    const idArg = m.capture(m.or(m.numericLiteral(), m.stringLiteral()));
    const requireCall = m.callExpression(m.identifier('__webpack_require__'), [
      idArg,
    ]);

    const varName = m.capture(m.anyString());
    const requireVar = m.variableDeclaration(undefined, [
      m.variableDeclarator(m.identifier(varName), requireCall),
    ]);

    this.requireBinding?.referencePaths.forEach((path) => {
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
            binding: binding as RequireVarBinding,
          });
        }
      });
    });
  }

  /**
   * Extract the export information from all `__webpack_require__.d` calls
   */
  collectExportDefinitions() {
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
          this.addExportDefinition(
            path.scope,
            exportName.current!,
            returnValue.current!,
          );
        } else if (defaultExpressionExport.match(path.node)) {
          // TODO: handle
          // path.replaceWith(t.exportDefaultDeclaration(returnValue.current!));
        } else if (multiExport.match(path.node)) {
          for (const property of properties.current!) {
            objectProperty.match(property); // To easily get the captures per property
            this.addExportDefinition(
              path.scope,
              exportName.current!,
              returnValue.current!,
            );
          }
        }
        path.remove();
      },
    });
  }
}
