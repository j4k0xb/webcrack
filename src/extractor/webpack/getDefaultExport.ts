import { expression } from '@babel/template';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Bundle } from '..';

/*
 * webpack/runtime/compat get default export
 * getDefaultExport function for compatibility with non-harmony modules
 * ```js
 * __webpack_require__.n = (module) => {
 * 	var getter = module && module.__esModule ?
 * 		() => (module['default']) :
 * 		() => (module);
 * 	__webpack_require__.d(getter, { a: getter });
 * 	return getter;
 * };
 * ```
 */

/**
 * Convert require.n calls to require the default export depending on the target module type
 * ```js
 * const m = require(1);
 * const mDefault = require.n(a);
 * console.log(mDefault.a.prop, mDefault().prop)
 * ```
 */
export function convertDefaultRequire(bundle: Bundle) {
  const requiredModuleId = m.capture(m.numericLiteral());
  const requireMatcher = m.callExpression(m.identifier('require'), [
    requiredModuleId,
  ]);

  // E.g. t
  const moduleArg = m.capture(m.identifier());
  // E.g. require.n(t)
  const defaultRequireMatcher = m.callExpression(
    m.memberExpression(m.identifier('require'), m.identifier('n')),
    [moduleArg]
  );

  function getRequiredModule(path: NodePath, moduleArg: t.Expression) {
    if (t.isNumericLiteral(moduleArg)) {
      return bundle.modules.get(moduleArg.value);
    } else if (t.isIdentifier(moduleArg)) {
      // The variable that's passed to require.n
      const binding = path.scope.getBinding(moduleArg.name);
      const declarator = binding?.path.node;
      if (
        t.isVariableDeclarator(declarator) &&
        requireMatcher.match(declarator.init)
      ) {
        return bundle.modules.get(requiredModuleId.current!.value);
      }
    }
  }

  bundle.modules.forEach(module => {
    traverse(module.ast, {
      enter(path) {
        if (defaultRequireMatcher.match(path.node)) {
          const requiredModule = getRequiredModule(path, moduleArg.current!);
          if (requiredModule?.ast.program.sourceType === 'module') {
            path.replaceWith(expression`${moduleArg.current!}.default`());
          } else {
            path.replaceWith(moduleArg.current!);
          }

          if (t.isVariableDeclarator(path.parent)) {
            const binding = path.scope.getOwnBinding(
              (path.parent.id as t.Identifier).name
            );
            // Replace mDefault.a.prop and mDefault().prop with mDefault.prop
            binding?.referencePaths.forEach(refPath => {
              if (
                refPath.parentPath?.isCallExpression() ||
                refPath.parentPath?.isMemberExpression()
              ) {
                refPath.parentPath.replaceWith(refPath);
              }
            });
          }
        }
      },
    });
  });
}
