import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import assert from 'assert';
import type { Transform } from '../../../ast-utils';
import { constMemberExpression } from '../../../ast-utils';
import { dereference } from '../../../ast-utils/binding';
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

    const moduleVarId = m.capture(m.identifier());
    const getDefaultExportMatcher = m.callExpression(
      constMemberExpression('__webpack_require__', 'n'),
      [moduleVarId],
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
      const moduleBinding = reference.scope.getBinding(
        moduleVarId.current!.name,
      );
      if (!moduleBinding) return;
      const requireVar = manager.findRequireVar(moduleBinding.path.node);
      if (!requireVar) return;

      dereference(requireVar.binding, moduleVarId.current!);

      const importName = manager.addDefaultImport(requireVar);

      const isInlined = !getDefaultExportVarMatcher.match(callPath.parent);
      if (isInlined) {
        callPath.parentPath?.replaceWith(t.identifier(importName));
      } else {
        const tmpVarBinding = reference.scope.getBinding(tmpVarName.current!);
        if (!tmpVarBinding) return;

        // `_tmp.a` or `_tmp()` -> `importName`
        tmpVarBinding.referencePaths.forEach((refPath) => {
          refPath.parentPath?.replaceWith(t.identifier(importName));
        });
        tmpVarBinding.path.remove();
      }
      this.changes++;
    });
  },
} satisfies Transform<ImportExportManager>;
