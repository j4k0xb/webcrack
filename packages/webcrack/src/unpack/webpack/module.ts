import { Binding } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import {
  applyTransform,
  constMemberExpression,
  renameParameters,
} from '../../ast-utils';
import { Module } from '../module';
import { FunctionPath } from './common-matchers';
import { ImportExportManager } from './import-export-manager';
import {
  default as defineExport,
  default as definePropertyGetters,
} from './runtime/define-property-getters';
import getDefaultExport from './runtime/get-default-export';
import global from './runtime/global';
import hasOwnProperty from './runtime/has-own-property';
import moduleDecorator from './runtime/module-decorator';
import namespaceObject from './runtime/namespace-object';
import varInjections from './var-injections';

export class WebpackModule extends Module {
  #webpackRequireBinding: Binding | undefined;
  #importExportManager: ImportExportManager;
  // TODO: expose to public API
  #sourceType: 'commonjs' | 'esm' = 'commonjs';

  constructor(id: string, ast: FunctionPath, isEntry: boolean) {
    // TODO: refactor
    const file = t.file(t.program(ast.node.body.body));
    super(id, file, isEntry);

    renameParameters(ast, [
      '__webpack_module__',
      '__webpack_exports__',
      '__webpack_require__',
    ]);
    applyTransform(file, varInjections);
    this.removeTrailingComments();

    this.#webpackRequireBinding = ast.scope.getBinding('__webpack_require__');
    this.#importExportManager = new ImportExportManager(
      file,
      this.#webpackRequireBinding,
    );

    applyTransform(file, global, this.#webpackRequireBinding);
    applyTransform(file, hasOwnProperty, this.#webpackRequireBinding);
    applyTransform(file, moduleDecorator, this.#webpackRequireBinding);
    applyTransform(file, namespaceObject);
    applyTransform(file, getDefaultExport, this.#importExportManager);
    applyTransform(file, definePropertyGetters, this.#importExportManager);
    this.#importExportManager.insertImportsAndExports();

    // this.removeDefineESM();
    // // FIXME: some bundles don't define __esModule but still declare esm exports
    // // https://github.com/0xdevalias/chatgpt-source-watch/blob/main/orig/_next/static/chunks/167-121de668c4456907.js
    // if (this.#sourceType === 'esm') {
    //   this.convertExportsToESM();
    // }
  }

  /**
   * Remove /***\/ comments between modules (in webpack development builds)
   */
  private removeTrailingComments(): void {
    const lastNode = this.ast.program.body.at(-1);
    if (
      lastNode?.trailingComments &&
      lastNode.trailingComments.length >= 1 &&
      lastNode.trailingComments.at(-1)!.value === '*'
    ) {
      lastNode.trailingComments.pop();
    }
  }

  /**
   * Removes
   * - `__webpack_require__.r(exports);` (webpack/runtime/make namespace object)
   * - `Object.defineProperty(exports, "__esModule", { value: true });`
   */
  private removeDefineESM(): void {
    const matcher = m.expressionStatement(
      m.or(
        m.callExpression(constMemberExpression('__webpack_require__', 'r'), [
          m.identifier(),
        ]),
        m.callExpression(constMemberExpression('Object', 'defineProperty'), [
          m.identifier(),
          m.stringLiteral('__esModule'),
          m.objectExpression([
            m.objectProperty(m.identifier('value'), m.booleanLiteral(true)),
          ]),
        ]),
      ),
    );

    for (let i = 0; i < this.ast.program.body.length; i++) {
      const node = this.ast.program.body[i];
      if (matcher.match(node)) {
        this.#sourceType = 'esm';
        this.ast.program.body.splice(i, 1);
        i--;
      }
    }
  }

  private convertExportsToESM(): void {
    applyTransform(this.ast, defineExport);
  }

  /**
   * // TODO: refactor to use ImportExportManager
   * ```diff
   * - __webpack_require__(id)
   * + require("./relative/path.js")
   * ```
   * @internal
   */
  replaceRequireCalls() // onResolve: (id: string) => { path: string; external?: boolean },
  : void {
    // if (!this.#webpackRequireBinding) return;
    // return;
    // const idArg = m.capture(m.or(m.numericLiteral(), m.stringLiteral()));
    // const requireCall = m.callExpression(m.identifier('__webpack_require__'), [
    //   idArg,
    // ]);
    // this.#webpackRequireBinding.referencePaths.forEach((path) => {
    //   m.matchPath(requireCall, { idArg }, path.parentPath!, ({ idArg }) => {
    //     const id = idArg.node.value.toString();
    //     const result = onResolve(id);
    //     (path.node as t.Identifier).name = 'require';
    //     idArg.replaceWith(t.stringLiteral(result.path));
    //     if (result.external) {
    //       idArg.addComment('leading', 'webcrack:missing');
    //     }
    //     // this.#imports.push({
    //     //   id,
    //     //   path: result.path,
    //     //   nodePath: path.parentPath as NodePath<t.CallExpression>,
    //     // });
    //   });
    // });
  }
}
