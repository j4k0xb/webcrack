import { expression } from '@babel/template';
import type { NodePath } from '@babel/traverse';
import traverse from '@babel/traverse';
import * as m from '@codemod/matchers';
import { constMemberExpression } from '../../ast-utils';
import type { WebpackBundle } from './bundle';

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
 * const getter = require.n(m);
 * console.log(getter.a.prop, getter().prop);
 * ```
 * ->
 * ```js
 * const m = require(1);
 * console.log(m.prop, m.prop);
 * ```
 */
export function convertDefaultRequire(bundle: WebpackBundle): void {
  function getRequiredModule(path: NodePath) {
    // The variable that's passed to require.n
    const binding = path.scope.getBinding(moduleArg.current!.name);
    const declarator = binding?.path.node;
    if (declaratorMatcher.match(declarator)) {
      return bundle.modules.get(requiredModuleId.current!.value.toString());
    }
  }

  const requiredModuleId = m.capture(m.numericLiteral());
  // E.g. const m = require(1);
  const declaratorMatcher = m.variableDeclarator(
    m.identifier(),
    m.callExpression(m.identifier('require'), [requiredModuleId]),
  );

  // E.g. m
  const moduleArg = m.capture(m.identifier());
  // E.g. getter
  const getterVarName = m.capture(m.identifier());
  // E.g. require.n(m)
  const requireN = m.callExpression(constMemberExpression('require', 'n'), [
    moduleArg,
  ]);
  // E.g. const getter = require.n(m)
  const defaultRequireMatcher = m.variableDeclarator(getterVarName, requireN);

  // E.g. require.n(m).a or require.n(m)()
  const defaultRequireMatcherAlternative = m.or(
    constMemberExpression(requireN, 'a'),
    m.callExpression(requireN, []),
  );

  const buildDefaultAccess = expression`OBJECT.default`;

  bundle.modules.forEach((module) => {
    traverse(module.ast, {
      'CallExpression|MemberExpression'(path) {
        if (defaultRequireMatcherAlternative.match(path.node)) {
          // Replace require.n(m).a or require.n(m)() with m or m.default
          const requiredModule = getRequiredModule(path);
          if (requiredModule?.ast.program.sourceType === 'module') {
            path.replaceWith(
              buildDefaultAccess({ OBJECT: moduleArg.current! }),
            );
          } else {
            path.replaceWith(moduleArg.current!);
          }
        }
      },
      VariableDeclarator(path) {
        if (defaultRequireMatcher.match(path.node)) {
          // Replace require.n(m); with m or m.default
          const requiredModule = getRequiredModule(path);
          const init = path.get('init');
          if (requiredModule?.ast.program.sourceType === 'module') {
            init.replaceWith(
              buildDefaultAccess({ OBJECT: moduleArg.current! }),
            );
          } else {
            init.replaceWith(moduleArg.current!);
          }

          // Replace getter.a.prop and getter().prop with getter.prop
          const binding = path.scope.getOwnBinding(getterVarName.current!.name);
          binding?.referencePaths.forEach((refPath) => {
            if (
              refPath.parentPath?.isCallExpression() ||
              refPath.parentPath?.isMemberExpression()
            ) {
              refPath.parentPath.replaceWith(refPath);
            }
          });
        }
      },
      noScope: true,
    });
  });
}
