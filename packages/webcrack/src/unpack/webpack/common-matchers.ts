import type { Binding, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import {
  anyFunctionExpression,
  constMemberExpression,
  getPropName,
} from '../../ast-utils';

export type FunctionPath = NodePath<
  | t.FunctionExpression
  | (t.ArrowFunctionExpression & { body: t.BlockStatement })
>;

/**
 * Matches
 * - `[,,function (module, exports, require) {...}, ...]` where the indexes are the module ids
 * - or `{0: function (module, exports, require) {...}, ...}` where the keys are the module ids
 */
export function modulesContainerMatcher(): m.CapturedMatcher<
  t.ArrayExpression | t.ObjectExpression
> {
  return m.capture(
    m.or(
      m.arrayExpression(m.arrayOf(m.or(anyFunctionExpression(), null))),
      m.objectExpression(
        m.arrayOf(
          m.or(
            m.objectProperty(
              m.or(m.numericLiteral(), m.stringLiteral(), m.identifier()),
              anyFunctionExpression(),
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
        if (anyFunctionExpression().match(property.value)) {
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
