import { expression } from '@babel/template';
import traverse, { NodePath } from '@babel/traverse';
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
 * const mDefault = require.n(m);
 * console.log(mDefault.a.prop, mDefault().prop);
 * ```
 * ->
 * ```js
 * const m = require(1);
 * console.log(m.prop, m.prop);
 * ```
 */
export function convertDefaultRequire(bundle: Bundle) {
  function getRequiredModule(path: NodePath) {
    // The variable that's passed to require.n
    const binding = path.scope.getBinding(moduleArg.current!.name);
    const declarator = binding?.path.node;
    if (declaratorMatcher.match(declarator)) {
      return bundle.modules.get(requiredModuleId.current!.value);
    }
  }

  bundle.modules.forEach(module => {
    traverse(module.ast, {
      VariableDeclarator(path) {
        if (defaultRequireMatcher.match(path.node)) {
          // Replace require.n(m); with m or m.default
          const requiredModule = getRequiredModule(path);
          const init = path.get('init');
          if (requiredModule?.ast.program.sourceType === 'module') {
            init.replaceWith(expression`${moduleArg.current!}.default`());
          } else {
            init.replaceWith(moduleArg.current!);
          }

          // Replace mDefault.a.prop and mDefault().prop with mDefault.prop
          const binding = path.scope.getOwnBinding(
            defaultVarName.current!.name
          );
          binding?.referencePaths.forEach(refPath => {
            if (
              refPath.parentPath?.isCallExpression() ||
              refPath.parentPath?.isMemberExpression()
            ) {
              refPath.parentPath.replaceWith(refPath);
            }
          });
        }
      },
    });
  });
}

const requiredModuleId = m.capture(m.numericLiteral());
// E.g. const m = require(1);
const declaratorMatcher = m.variableDeclarator(
  m.identifier(),
  m.callExpression(m.identifier('require'), [requiredModuleId])
);

// E.g. m
const moduleArg = m.capture(m.identifier());
const defaultVarName = m.capture(m.identifier());
// E.g. const mDefault = require.n(m)
const defaultRequireMatcher = m.variableDeclarator(
  defaultVarName,
  m.callExpression(
    m.memberExpression(m.identifier('require'), m.identifier('n')),
    [moduleArg]
  )
);
