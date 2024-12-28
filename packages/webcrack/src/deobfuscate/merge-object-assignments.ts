import type { Binding, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../ast-utils';
import { constObjectProperty, findParent, safeLiteral } from '../ast-utils';

/**
 * Merges object assignments into the object expression.
 * Example:
 * ```js
 * const obj = {};
 * obj.foo = 'bar';
 * ```
 * ->
 * ```js
 * const obj = { foo: 'bar' };
 * ```
 */
export default {
  name: 'merge-object-assignments',
  tags: ['safe'],
  scope: true,
  visitor: () => {
    const id = m.capture(m.identifier());
    const object = m.capture(m.objectExpression([]));
    // Example: const obj = {};
    const varMatcher = m.variableDeclaration(undefined, [
      m.variableDeclarator(id, object),
    ]);
    const key = m.capture(m.anyExpression());
    const computed = m.capture<boolean>(m.anything());
    const value = m.capture(m.anyExpression());
    // Example: obj.foo = 'bar';
    const assignmentMatcher = m.expressionStatement(
      m.assignmentExpression(
        '=',
        m.memberExpression(m.fromCapture(id), key, computed),
        value,
      ),
    );

    return {
      Program(path) {
        // No idea why this is needed, crashes otherwise.
        path.scope.crawl();
      },
      VariableDeclaration: {
        exit(path) {
          if (!path.inList || !varMatcher.match(path.node)) return;

          const binding = path.scope.getBinding(id.current!.name)!;
          const container = path.container as t.Statement[];
          const siblingIndex = (path.key as number) + 1;

          while (siblingIndex < container.length) {
            const sibling = path.getSibling(siblingIndex);
            if (
              !assignmentMatcher.match(sibling.node) ||
              hasCircularReference(value.current!, binding)
            )
              return;

            // { [1]: value, "foo bar": value } can be simplified to { 1: value, "foo bar": value }
            const isComputed =
              computed.current! &&
              key.current!.type !== 'NumericLiteral' &&
              key.current!.type !== 'StringLiteral';

            // Example: const obj = { x: 1 }; obj.foo = 'bar'; -> const obj = { x: 1, foo: 'bar' };
            object.current!.properties.push(
              t.objectProperty(key.current!, value.current!, isComputed),
            );

            sibling.remove();
            binding.dereference();
            binding.referencePaths.shift();

            // Example: const obj = { foo: 'bar' }; return obj; -> return { foo: 'bar' };
            if (
              binding.references === 1 &&
              inlineableObject.match(object.current) &&
              !isRepeatedCallReference(binding, binding.referencePaths[0])
            ) {
              binding.referencePaths[0].replaceWith(object.current);
              path.remove();
              this.changes++;
            }
          }
        },
      },
    };
  },
} satisfies Transform;

/**
 * Used to avoid "Cannot access 'obj' before initialization" errors.
 */
function hasCircularReference(node: t.Node, binding: Binding) {
  return (
    // obj.foo = obj;
    binding.referencePaths.some((path) => path.find((p) => p.node === node)) ||
    // obj.foo = fn(); where fn could reference the binding or not, for simplicity we assume it does.
    m.containerOf(m.callExpression()).match(node)
  );
}

const repeatedCallMatcher = m.or(
  m.forStatement(),
  m.forOfStatement(),
  m.forInStatement(),
  m.whileStatement(),
  m.doWhileStatement(),
  m.function(),
  m.objectMethod(),
  m.classBody(),
);

/**
 * Returns true when the reference can be evaluated multiple times.
 * In that case, the object should not be inlined to avoid creating multiple instances.
 * Structure: Block{ binding, Repeatable{reference} }
 */
function isRepeatedCallReference(binding: Binding, reference: NodePath) {
  const block = binding.scope.getBlockParent().path;
  const repeatable = findParent(reference, repeatedCallMatcher);
  return repeatable?.isDescendant(block);
}

/**
 * Only literals, arrays and objects are allowed because variable values
 * might be different in the place the object will be inlined.
 */
const inlineableObject: m.Matcher<t.Expression> = m.matcher((node) =>
  m
    .or(
      safeLiteral,
      m.arrayExpression(m.arrayOf(inlineableObject)),
      m.objectExpression(m.arrayOf(constObjectProperty(inlineableObject))),
    )
    .match(node),
);
