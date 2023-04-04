import { Binding, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { FunctionExpression } from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../transforms';
import { getPropName } from '../utils/ast';
import { inlineCfFunction } from '../utils/inline';
import {
  constKey,
  constMemberExpression,
  createFunctionMatcher,
} from '../utils/matcher';

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
    if (binding.constantViolations.length > 0) return changes;
    if (objectProperties.current!.length === 0) transformObjectKeys(binding);
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

function transformObjectKeys(objBinding: Binding) {
  const refs = objBinding.referencePaths;

  if (refs.length < 2) return;
  if (!aliasVar.match(refs.at(-1)?.parent)) return;

  const assignments: NodePath[] = [];

  for (let i = 0; i < refs.length - 1; i++) {
    const expressionStatement = refs[i].parentPath!.parentPath!.parentPath!;
    if (!assignment.match(expressionStatement.node)) return;

    assignments.push(expressionStatement);
    objectProperties.current!.push(
      t.objectProperty(
        t.identifier(assignedKey.current!),
        assignedValue.current!
      )
    );
  }

  const aliasBinding = objBinding.scope.getBinding(aliasId.current!.name)!;
  if (aliasBinding.constantViolations.length > 0) return;
  if (!aliasBinding.referencePaths.every(isValidReference)) return;

  objBinding.referencePaths = aliasBinding.referencePaths;
  objBinding.references = aliasBinding.references;

  objBinding.scope.rename(aliasId.current!.name, objBinding.identifier.name);

  assignments.forEach(p => p.remove());
  aliasBinding.path.remove();
}

function isValidReference(path: NodePath) {
  return (
    refMatcher.match(path.parent) &&
    !path.parentPath?.parentPath?.isAssignmentExpression({
      left: path.parent,
    })
  );
}

const varId = m.capture(m.identifier());
const propertyName = m.matcher<string>(i => /^[a-z]{5}$/i.test(i as string));
const propertyKey = constKey(propertyName);
const property = m.or(
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
);
// E.g. "rLxJs": "6|0|4|3|1|5|2"
const objectProperties = m.capture(
  m.arrayOf(m.objectProperty(propertyKey, property))
);
const aliasId = m.capture(m.identifier());
const aliasVar = m.variableDeclarator(aliasId, m.fromCapture(varId));
// E.g. "rLxJs"
const assignedKey = m.capture(propertyName);
// E.g. "6|0|4|3|1|5|2"
const assignedValue = m.capture(property);
// E.g. obj.rLxJs = "6|0|4|3|1|5|2"
const assignment = m.expressionStatement(
  m.assignmentExpression(
    '=',
    constMemberExpression(m.fromCapture(varId), assignedKey),
    assignedValue
  )
);
const refMatcher = constMemberExpression(
  m.or(m.fromCapture(varId), m.fromCapture(aliasId)),
  propertyName
);
const varMatcher = m.variableDeclarator(
  varId,
  m.capture(m.objectExpression(objectProperties))
);
