import type { Binding, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import {
  anonymousFunction,
  anySubList,
  constMemberExpression,
  getPropName,
} from '../../ast-utils';

export type FunctionPath = NodePath<
  | t.FunctionExpression
  | (t.ArrowFunctionExpression & { body: t.BlockStatement })
>;

/**
 * @returns
 * - `webpackRequire`: A Matcher for `function __webpack_require__(moduleId) { ... }`
 * - `containerId`: A matcher for e.g. `__webpack_modules__` that has to be captured before `webpackRequire` is matched
 */
export function webpackRequireFunctionMatcher() {
  // Example: __webpack_modules__
  const containerId = m.capture(m.identifier());
  const webpackRequire = m.capture(
    m.functionDeclaration(
      m.identifier(), // __webpack_require__
      [m.identifier()], // moduleId
      m.blockStatement(
        anySubList(
          m.expressionStatement(
            m.callExpression(
              m.or(
                // Example (webpack 0.11.x): __webpack_modules__[moduleId].call(null, module, module.exports, __webpack_require__);
                // Example (webpack 4): __webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
                constMemberExpression(
                  m.memberExpression(
                    m.fromCapture(containerId),
                    m.identifier(),
                    true,
                  ),
                  'call',
                ),
                // Example (webpack 5): __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
                m.memberExpression(
                  m.fromCapture(containerId),
                  m.identifier(),
                  true,
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );

  return { webpackRequire, containerId };
}

/**
 * Matches
 * - `[,,function (module, exports, require) {...}, ...]` where the index is the module ID
 * - or `{0: function (module, exports, require) {...}, ...}` where the key is the module ID
 */
export function modulesContainerMatcher(): m.CapturedMatcher<
  t.ArrayExpression | t.ObjectExpression
> {
  return m.capture(
    m.or(
      m.arrayExpression(m.arrayOf(m.or(anonymousFunction(), null))),
      m.objectExpression(
        m.arrayOf(
          m.or(
            m.objectProperty(
              m.or(m.numericLiteral(), m.stringLiteral(), m.identifier()),
              anonymousFunction(),
            ),
            // Example (__webpack_public_path__): { c: "" }
            m.objectProperty(m.identifier('c'), m.stringLiteral()),
          ),
        ),
      ),
    ),
  );
}

/**
 * @param container A node path to the modules container
 * @returns A map of module IDs to their function node paths
 */
export function getModuleFunctions(
  container: NodePath<t.ArrayExpression | t.ObjectExpression>,
): Map<string, FunctionPath> {
  const functions = new Map<string, FunctionPath>();

  if (t.isArrayExpression(container.node)) {
    container.node.elements.forEach((element, index) => {
      if (element !== null) {
        functions.set(
          index.toString(),
          container.get(`elements.${index}`) as FunctionPath,
        );
      }
    });
  } else {
    (container.node.properties as t.ObjectProperty[]).forEach(
      (property, index) => {
        const key = getPropName(property.key)!;
        if (anonymousFunction().match(property.value)) {
          functions.set(
            key,
            container.get(`properties.${index}.value`) as FunctionPath,
          );
        }
      },
    );
  }

  return functions;
}

/**
 * Matches `__webpack_require__.s = <id>`
 */
export function findAssignedEntryId(webpackRequireBinding: Binding) {
  const entryId = m.capture(m.or(m.numericLiteral(), m.stringLiteral()));
  const assignment = m.assignmentExpression(
    '=',
    constMemberExpression(webpackRequireBinding.identifier.name, 's'),
    entryId,
  );
  for (const reference of webpackRequireBinding.referencePaths) {
    if (assignment.match(reference.parentPath?.parent)) {
      return String(entryId.current!.value);
    }
  }
}

/**
 * Matches `__webpack_require__(<id>)`
 */
export function findRequiredEntryId(webpackRequireBinding: Binding) {
  const entryId = m.capture(m.or(m.numericLiteral(), m.stringLiteral()));
  const call = m.callExpression(
    m.identifier(webpackRequireBinding.identifier.name),
    [entryId],
  );
  for (const reference of webpackRequireBinding.referencePaths) {
    if (call.match(reference.parent)) {
      return String(entryId.current!.value);
    }
  }
}
