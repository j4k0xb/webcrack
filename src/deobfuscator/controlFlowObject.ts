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
  findParent,
  isReadonlyObject,
} from '../utils/matcher';
import { renameFast } from '../utils/rename';

/**
 * Explanation: https://excalidraw.com/#json=0vehUdrfSS635CNPEQBXl,hDOd-UO9ETfSDWT9MxVX-A
 */

export default {
  name: 'controlFlowObject',
  tags: ['safe'],
  visitor() {
    const varId = m.capture(m.identifier());
    const propertyName = m.matcher<string>(name => /^[a-z]{5}$/i.test(name));
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
    // E.g. obj.rLxJs
    const memberAccess = constMemberExpression(
      m.or(m.fromCapture(varId), m.fromCapture(aliasId)),
      propertyName
    );
    const varMatcher = m.variableDeclarator(
      varId,
      m.capture(m.objectExpression(objectProperties))
    );

    function isConstantBinding(binding: Binding) {
      // Workaround because sometimes babel treats the VariableDeclarator/binding itself as a violation
      return binding.constant || binding.constantViolations[0] === binding.path;
    }

    function transform(path: NodePath<t.VariableDeclarator>) {
      let changes = 0;
      if (varMatcher.match(path.node)) {
        // Verify all references to make sure they match how the obfuscator
        // would have generated the code (no reassignments, etc.)
        const binding = path.scope.getBinding(varId.current!.name);
        if (!binding) return changes;
        if (!isConstantBinding(binding)) return changes;
        if (objectProperties.current!.length === 0)
          transformObjectKeys(binding);
        if (!isReadonlyObject(binding, memberAccess)) return changes;

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
          const varDeclarator = findParent(ref, m.variableDeclarator());
          if (varDeclarator) changes += transform(varDeclarator);
        });

        path.remove();
        changes++;
      }
      return changes;
    }

    /**
     * When the `Transform Object Keys` option is enabled, the obfuscator generates an empty
     * object, assigns the properties later and adds an alias variable to the object.
     * This function undoes that by converting the assignments to inline object properties.
     */
    function transformObjectKeys(objBinding: Binding) {
      const refs = objBinding.referencePaths;

      if (refs.length < 2) return;
      if (!aliasVar.match(refs.at(-1)?.parent)) return;

      const assignments: NodePath[] = [];

      for (let i = 0; i < refs.length - 1; i++) {
        const expressionStatement = refs[i].parentPath?.parentPath?.parentPath;
        if (!assignment.match(expressionStatement?.node)) return;

        assignments.push(expressionStatement!);
        objectProperties.current!.push(
          t.objectProperty(
            t.identifier(assignedKey.current!),
            assignedValue.current!
          )
        );
      }

      const aliasBinding = objBinding.scope.getBinding(aliasId.current!.name)!;
      if (!isReadonlyObject(aliasBinding, memberAccess)) return;

      objBinding.referencePaths = aliasBinding.referencePaths;
      objBinding.references = aliasBinding.references;

      renameFast(aliasBinding, objBinding.identifier.name);

      assignments.forEach(p => p.remove());
      aliasBinding.path.remove();
    }

    return {
      VariableDeclarator: {
        exit(path) {
          this.changes += transform(path);
        },
      },
      noScope: true,
    };
  },
} satisfies Transform;
