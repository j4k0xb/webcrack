import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import assert from 'assert';
import type { Transform } from '../../../ast-utils';
import { constMemberExpression } from '../../../ast-utils';
import type { ImportExportManager } from '../import-export-manager';

// var a = __webpack_require__(11); var i = __webpack_require__.n(a); let p = i.a;
// var c = __webpack_require__(11); let h = __webpack_require__.n(c).a;
// var i = __webpack_require__(11); __webpack_require__.n(i).a;
// const dDefault = __webpack_require__.n(b).a;
// const eDefault = __webpack_require__.n(c)();

/**
 * `__webpack_require__.n` is used when declaring a default import from a commonjs module.
 */
export default {
  name: 'get-default-export',
  tags: ['safe'],
  run(ast, manager) {
    assert(manager);

    const moduleVar = m.capture(m.anyString());
    const getDefaultExportMatcher = m.callExpression(
      constMemberExpression('__webpack_require__', 'n'),
      [m.identifier(moduleVar)],
    );
    const tmpVarName = m.capture(m.anyString());
    const getDefaultExportVarMatcher = m.variableDeclarator(
      m.identifier(tmpVarName),
      getDefaultExportMatcher,
    );

    manager.webpackRequire?.referencePaths.forEach((reference) => {
      // `__webpack_require__.n(moduleVar)`
      const callPath = reference.parentPath?.parentPath;
      if (!getDefaultExportMatcher.match(callPath?.node)) return;

      // Example: `__webpack_require__.n(moduleVar).a`
      const isInlined = !getDefaultExportVarMatcher.match(callPath.parent);
      if (isInlined) {
        const moduleBinding = reference.scope.getBinding(moduleVar.current!);
        if (!moduleBinding) return;
        const requireVar = manager.findRequireVar(moduleBinding.path.node);
        if (!requireVar) return;

        requireVar.binding.dereference();
        const importName = manager.addDefaultImport(requireVar);
        callPath.parentPath?.replaceWith(t.identifier(importName));
        this.changes++;
        return;
      }

      const tmpVarBinding = reference.scope.getBinding(tmpVarName.current!);
      const moduleBinding = reference.scope.getBinding(moduleVar.current!);
      if (!moduleBinding || !tmpVarBinding) return;
      const requireVar = manager.findRequireVar(moduleBinding.path.node);
      if (!requireVar) return;

      const importName = manager.addDefaultImport(requireVar);
      // `_tmp.a` or `_tmp()` -> `importName`
      tmpVarBinding.referencePaths.forEach((refPath) => {
        refPath.parentPath?.replaceWith(t.identifier(importName));
      });
      tmpVarBinding.path.remove();
      requireVar.binding.dereference();
      this.changes++;
    });
  },
} satisfies Transform<ImportExportManager>;
