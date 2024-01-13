import { expression, statement } from '@babel/template';
import type { Binding, NodePath, Scope } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import assert from 'assert';
import { generate, renameFast } from '../../ast-utils';
import { dereference } from '../../ast-utils/binding';

// TODO: when it accesses module.exports, don't convert to esm

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
  defaultImport?: t.ImportDefaultSpecifier;
  namespaceImport?: t.ImportNamespaceSpecifier;
  namedImports: t.ImportSpecifier[];
  namespaceExports: t.ExportNamespaceSpecifier[];
  namedExports: t.ExportSpecifier[];
}

export class ImportExportManager {
  /**
   * All module ids that are imported
   */
  imports = new Set<string>();
  /**
   * Names of all exports
   */
  exports = new Set<string>();

  /**
   * All `var foo = __webpack_require__(id);` variable declarations
   */
  requireVars: RequireVar[] = [];
  /**
   * All `__webpack_require__(id)` calls
   */
  requireCalls: RequireCall[] = [];

  webpackRequire: Binding | undefined;

  private ast: t.File;

  constructor(ast: t.File, webpackRequireBinding: Binding | undefined) {
    this.ast = ast;
    this.webpackRequire = webpackRequireBinding;
    this.collectRequireCalls();
  }

  insertImportsAndExports() {
    this.requireVars.forEach((requireVar) => {
      // TODO: resolve module id to path
      const namedExports = t.exportNamedDeclaration(
        undefined,
        requireVar.namedExports,
        t.stringLiteral(requireVar.moduleId),
      );
      // TODO: resolve module id to path
      const namespaceExports = requireVar.namespaceExports.map((specifier) =>
        t.exportNamedDeclaration(
          undefined,
          [specifier],
          t.stringLiteral(requireVar.moduleId),
        ),
      );
      if (namedExports.specifiers.length > 0) {
        requireVar.binding.path.parentPath!.insertAfter(namedExports);
      }
      if (namespaceExports.length > 0) {
        requireVar.binding.path.parentPath!.insertAfter(namespaceExports);
      }
    });

    this.collectImports();

    this.requireVars.forEach((requireVar) => {
      this.sortImportSpecifiers(requireVar.namedImports);

      // TODO: resolve module id to path
      const namedImports = t.importDeclaration(
        [requireVar.defaultImport ?? [], requireVar.namedImports].flat(),
        t.stringLiteral(requireVar.moduleId),
      );

      if (namedImports.specifiers.length > 0) {
        requireVar.binding.path.parentPath!.insertAfter(namedImports);
      }
      if (requireVar.namespaceImport) {
        // TODO: resolve module id to path
        const namespaceImport = t.importDeclaration(
          [requireVar.namespaceImport],
          t.stringLiteral(requireVar.moduleId),
        );
        requireVar.binding.path.parentPath!.insertAfter(namespaceImport);
      }

      const hasImports =
        !!requireVar.defaultImport ||
        !!requireVar.namespaceImport ||
        requireVar.namedImports.length > 0;
      const hasExports =
        requireVar.namespaceExports.length > 0 ||
        requireVar.namedExports.length > 0;

      // side-effect import
      if (!requireVar.binding.referenced && !hasImports && !hasExports) {
        // TODO: resolve module id to path
        requireVar.binding.path.parentPath!.insertAfter(
          t.importDeclaration([], t.stringLiteral(requireVar.moduleId)),
        );
      }

      requireVar.binding.path.parentPath!.remove();
    });

    // this should never happen unless for mixed esm/commonjs:
    this.requireCalls.forEach(({ path, moduleId }) => {
      // TODO: resolve module id to path
      path.replaceWith(expression`require('${moduleId}')`());
    });
  }

  private sortImportSpecifiers(specifiers: t.ImportSpecifier[]) {
    specifiers.sort((a, b) =>
      (a.imported as t.Identifier).name.localeCompare(
        (b.imported as t.Identifier).name,
      ),
    );
  }

  private collectImports() {
    const property = m.capture(m.anyString());
    const memberExpression = m.memberExpression(
      m.identifier(),
      m.identifier(property),
      false,
    );
    const indirectCall = m.callExpression(
      m.or(
        // webpack 4: Object(lib.foo)("bar")
        m.callExpression(m.identifier('Object'), [memberExpression]),
        // webpack 5: (0, lib.foo)("bar")
        m.sequenceExpression([m.numericLiteral(0), memberExpression]),
      ),
    );

    this.requireVars.forEach((requireVar) => {
      const { binding } = requireVar;
      const importedLocalNames = new Set<string>();

      binding.referencePaths.forEach((reference) => {
        if (memberExpression.match(reference.parent)) {
          const importedName = property.current!;
          // lib.default -> _lib_default
          if (importedName === 'default') {
            const localName = this.addDefaultImport(requireVar);
            reference.parentPath!.replaceWith(t.identifier(localName));
            return;
          }

          let localName = importedName;
          if (!importedLocalNames.has(importedName)) {
            const hasNameConflict = binding.referencePaths.some((ref) =>
              ref.scope.hasBinding(importedName),
            );
            localName = hasNameConflict
              ? binding.path.scope.generateUid(importedName)
              : importedName;
            importedLocalNames.add(localName);
            this.addNamedImport(requireVar, localName, importedName);
          }

          if (
            indirectCall.match(reference.parentPath?.parentPath?.parent) &&
            reference.parentPath.parentPath?.key === 'callee'
          ) {
            reference.parentPath.parentPath.replaceWith(
              t.identifier(localName),
            );
          } else {
            reference.parentPath!.replaceWith(t.identifier(localName));
          }
        } else {
          this.addNamespaceImport(requireVar);
        }
      });
    });
  }

  addExport(scope: Scope, exportName: string, value: t.Expression) {
    this.exports.add(exportName);

    const objectId = m.capture(m.identifier());
    const propertyName = m.capture(m.anyString());
    const memberExpressionMatcher = m.memberExpression(
      objectId,
      m.identifier(propertyName),
    );

    if (t.isIdentifier(value)) {
      const binding = scope.getBinding(value.name);
      if (!binding) return;
      const requireVar = this.findRequireVar(binding.path.node);

      if (requireVar) {
        dereference(requireVar.binding, value);
        this.addExportNamespace(requireVar, exportName);
      } else if (exportName === 'default') {
        dereference(binding, value);
        this.addExportDefault(binding, binding.referenced ? value : undefined);
      } else {
        dereference(binding, value);
        this.addExportDeclaration(binding, exportName);
      }
    } else if (memberExpressionMatcher.match(value)) {
      const binding = scope.getBinding(objectId.current!.name);
      if (!binding) return;
      const requireVar = this.findRequireVar(binding.path.node);
      if (!requireVar) return;

      dereference(requireVar.binding, objectId.current!);
      this.addExportFrom(requireVar, propertyName.current!, exportName);
    } else {
      t.addComment(
        this.ast.program,
        'inner',
        `webcrack:unexpected-export: ${exportName} = ${generate(value)}`,
        true,
      );
    }
  }

  /**
   * Find the `var <name> = __webpack_require__(<id>);` statement that belongs to a binding node
   */
  findRequireVar(node: t.Node) {
    return this.requireVars.find((v) => v.binding.path.node === node);
  }

  /**
   * @returns local name of the default import
   */
  addDefaultImport(requireVar: RequireVar) {
    requireVar.defaultImport ??= t.importDefaultSpecifier(
      requireVar.binding.scope.generateUidIdentifier(
        `${requireVar.binding.identifier.name}_default`,
      ),
    );
    return requireVar.defaultImport.local.name;
  }

  private addNamedImport(
    requireVar: RequireVar,
    localName: string,
    importedName: string,
  ) {
    requireVar.namedImports.push(
      t.importSpecifier(t.identifier(localName), t.identifier(importedName)),
    );
  }

  private addNamespaceImport(requireVar: RequireVar) {
    requireVar.namespaceImport ??= t.importNamespaceSpecifier(
      t.identifier(requireVar.binding.identifier.name),
    );
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
    requireVar: RequireVar,
    localName: string,
    exportName: string,
  ) {
    requireVar.namedExports.push(
      t.exportSpecifier(t.identifier(localName), t.identifier(exportName)),
    );
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
    assert(
      matcher.match(statementPath.node),
      `unexpected export statement: ${statementPath.type}`,
    );

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
  private addExportDefault(binding: Binding, value?: t.Node) {
    const statementParent = binding.path.getStatementParent()!;
    if (value) {
      statementParent.insertAfter(statement`export default ${value}`());
    } else {
      const node = binding.path.node;
      value =
        node.type === 'VariableDeclarator'
          ? node.init!
          : (node as t.ClassDeclaration | t.FunctionDeclaration);
      statementParent.replaceWith(statement`export default ${value}`());
    }
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
  private addExportNamespace(requireVar: RequireVar, exportName: string) {
    requireVar.namespaceExports.push(
      t.exportNamespaceSpecifier(t.identifier(exportName)),
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
        const moduleId = idArg.node.value.toString();
        this.imports.add(moduleId);
        this.requireCalls.push({
          moduleId,
          path: path.parentPath as NodePath<t.CallExpression>,
        });

        if (requireVar.match(path.parentPath!.parentPath?.parent)) {
          const binding = path.scope.getBinding(varName.current!)!;
          this.requireVars.push({
            moduleId,
            binding,
            defaultImport: undefined,
            namespaceImport: undefined,
            namedImports: [],
            namespaceExports: [],
            namedExports: [],
          });
        }
      });
    });
  }
}
