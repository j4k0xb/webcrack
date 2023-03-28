import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { FunctionExpression } from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../transforms';
import { getPropName } from '../utils/ast';
import { inlineCfFunction } from '../utils/inline';
import { constMemberExpression, createFunctionMatcher } from '../utils/matcher';

export default {
  name: 'controlFlowObject',
  tags: ['safe'],
  visitor: () => ({
    enter(path) {
      this.changes += transform(path);
    },
  }),
} satisfies Transform;

function transform(path: NodePath) {
  let changes = 0;
  if (varMatcher.match(path.node)) {
    // Verify all references to make sure they match how the obfuscator
    // would have generated the code (no reassignments, etc.)
    const binding = path.scope.getBinding(varId.current!.name);
    if (!binding) return changes;
    if (
      binding.constantViolations.length > 0 &&
      binding.constantViolations[0] !== path
    )
      return changes;
    if (!binding.referencePaths.every(isValidReference)) return changes;

    const props = new Map(
      objectProperties.current!.map(p => [
        getPropName(p.key),
        p.value as t.FunctionExpression | t.StringLiteral,
      ])
    );
    if (!props.size) return changes;

    const oldRefs = [...binding.referencePaths];

    // Have to loop backwards because we might replace a node that
    // contains another reference to the binding (https://github.com/babel/babel/issues/12943)
    [...binding.referencePaths].reverse().forEach(ref => {
      const memberPath = ref.parentPath as NodePath<t.MemberExpression>;
      const propName = getPropName(memberPath.node.property)!;
      const value = props.get(propName)!;

      if (t.isStringLiteral(value)) {
        memberPath.replaceWith(value);
      } else {
        inlineCfFunction(
          value,
          memberPath.parentPath as NodePath<t.CallExpression>
        );
      }
      changes++;
    });

    oldRefs.forEach(ref => {
      const varDeclarator = ref?.findParent(p => p.isVariableDeclarator());
      if (varDeclarator) changes += transform(varDeclarator);
    });

    path.remove();
    changes++;
  }
  return changes;
}

function isValidReference(path: NodePath) {
  return (
    refMatcher.match(path.parent) &&
    !path.parentPath?.parentPath?.isAssignmentExpression({
      left: path.parent,
    })
  );
}

const refMatcher = constMemberExpression(m.anything());

const varId = m.capture(m.identifier());
const propertyMatcher = m.or(
  m.identifier(m.matcher(i => /^[a-z]{5}$/i.test(i as string))),
  m.stringLiteral(m.matcher(i => /^[a-z]{5}$/i.test(i as string)))
);
const objectProperties = m.capture(
  m.arrayOf(
    // E.g. "rLxJs": "6|0|4|3|1|5|2"
    m.objectProperty(
      propertyMatcher,
      m.or(
        // E.g. "6|0|4|3|1|5|2"
        m.stringLiteral(),
        // E.g. function (a, b) { return a + b }
        createFunctionMatcher(2, (left, right) => [
          m.returnStatement(
            m.or(
              m.binaryExpression(undefined, left, right),
              m.logicalExpression(undefined, left, right)
            )
          ),
        ]),
        // E.g. function (a, b, c) { return a(b, c) } with an arbitrary number of arguments
        m.matcher<FunctionExpression>(node => {
          return (
            !!node &&
            t.isFunctionExpression(node) &&
            createFunctionMatcher(node.params.length, (...params) => [
              m.returnStatement(m.callExpression(params[0], params.slice(1))),
            ]).match(node)
          );
        })
      )
    )
  )
);
const varMatcher = m.variableDeclarator(
  varId,
  m.capture(m.objectExpression(objectProperties))
);
