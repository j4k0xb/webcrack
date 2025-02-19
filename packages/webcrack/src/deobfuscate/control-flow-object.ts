import type { Binding, NodePath } from '@babel/traverse';
import type { FunctionExpression } from '@babel/types';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../ast-utils';
import {
  applyTransform,
  constKey,
  constMemberExpression,
  createFunctionMatcher,
  findParent,
  getPropName,
  inlineFunction,
  isReadonlyObject,
} from '../ast-utils';
import mergeStrings from '../unminify/transforms/merge-strings';

/**
 * Explanation: https://excalidraw.com/#json=0vehUdrfSS635CNPEQBXl,hDOd-UO9ETfSDWT9MxVX-A
 */

export default {
  name: 'control-flow-object',
  tags: ['safe'],
  scope: true,
  visitor() {
    const varId = m.capture(m.identifier());
    const propertyName = m.matcher<string>((name) => /^[a-z]{5}$/i.test(name));
    const propertyKey = constKey(propertyName);
    const propertyValue = m.or(
      // E.g. "6|0|4|3|1|5|2"
      m.stringLiteral(),
      // E.g. function (a, b) { return a + b }
      createFunctionMatcher(2, (left, right) => [
        m.returnStatement(
          m.or(
            m.binaryExpression(undefined, left, right),
            m.logicalExpression(undefined, left, right),
            m.binaryExpression(undefined, right, left),
            m.logicalExpression(undefined, right, left),
          ),
        ),
      ]),
      // E.g. function (a, b, c) { return a(b, c) } with an arbitrary number of arguments
      m.matcher<FunctionExpression>((node) => {
        return (
          t.isFunctionExpression(node) &&
          createFunctionMatcher(node.params.length, (...params) => [
            m.returnStatement(m.callExpression(params[0], params.slice(1))),
          ]).match(node)
        );
      }),
      // E.g. function (a, ...b) { return a(...b) }
      (() => {
        const fnName = m.capture(m.identifier());
        const restName = m.capture(m.identifier());

        return m.functionExpression(
          undefined,
          [fnName, m.restElement(restName)],
          m.blockStatement([
            m.returnStatement(
              m.callExpression(m.fromCapture(fnName), [
                m.spreadElement(m.fromCapture(restName)),
              ]),
            ),
          ]),
        );
      })(),
    );
    // E.g. "rLxJs": "6|0|4|3|1|5|2"
    const objectProperties = m.capture(
      m.arrayOf(m.objectProperty(propertyKey, propertyValue)),
    );
    const aliasId = m.capture(m.identifier());
    const aliasVar = m.variableDeclaration(m.anything(), [
      m.variableDeclarator(aliasId, m.fromCapture(varId)),
    ]);
    // E.g. "rLxJs"
    const assignedKey = m.capture(propertyName);
    // E.g. "6|0|4|3|1|5|2"
    const assignedValue = m.capture(propertyValue);
    // E.g. obj.rLxJs = "6|0|4|3|1|5|2"
    const assignment = m.expressionStatement(
      m.assignmentExpression(
        '=',
        constMemberExpression(m.fromCapture(varId), assignedKey),
        assignedValue,
      ),
    );
    const looseAssignment = m.expressionStatement(
      m.assignmentExpression(
        '=',
        constMemberExpression(m.fromCapture(varId), assignedKey),
      ),
    );
    // E.g. obj.rLxJs
    const memberAccess = constMemberExpression(
      m.or(m.fromCapture(varId), m.fromCapture(aliasId)),
      propertyName,
    );
    const varMatcher = m.variableDeclarator(
      varId,
      m.objectExpression(objectProperties),
    );
    // Example: { YhxvC: "default" }.YhxvC
    const inlineMatcher = constMemberExpression(
      m.objectExpression(objectProperties),
      propertyName,
    );

    const anyMemberAccess = constMemberExpression(m.identifier(), propertyName);
    const deadBranchTest = m.or(
      m.callExpression(anyMemberAccess, [anyMemberAccess, anyMemberAccess]),
      m.binaryExpression(
        m.or('===', '!=='),
        m.stringLiteral(),
        m.stringLiteral(),
      ),
    );
    const deadBranchMatcher = m.or(
      m.ifStatement(deadBranchTest),
      m.conditionalExpression(deadBranchTest),
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
        const isInDeadBranchMaybe = binding.constantViolations.every((path) =>
          findParent(path, deadBranchMatcher),
        );
        if (!isInDeadBranchMaybe && !isConstantBinding(binding)) return changes;
        if (!transformObjectKeys(binding)) return changes;
        if (!isInDeadBranchMaybe && !isReadonlyObject(binding, memberAccess))
          return changes;

        const props = new Map(
          objectProperties.current!.map((p) => [
            getPropName(p.key),
            p.value as t.FunctionExpression | t.StringLiteral,
          ]),
        );
        if (!props.size) return changes;

        const oldRefs = [...binding.referencePaths];

        // Have to loop backwards because we might replace a node that
        // contains another reference to the binding (https://github.com/babel/babel/issues/12943)
        [...binding.referencePaths].reverse().forEach((ref) => {
          const memberPath = ref.parentPath;

          // It should always be a MemberExpression unless when dead code injection is enabled
          if (!t.isMemberExpression(memberPath?.node)) return;

          const propName = getPropName(memberPath.node.property)!;
          const value = props.get(propName);
          if (!value) {
            ref.addComment('leading', 'webcrack:control_flow_missing_prop');
            return;
          }

          if (t.isStringLiteral(value)) {
            memberPath.replaceWith(value);
          } else if (t.isFunctionExpression(value)) {
            inlineFunction(
              value,
              memberPath.parentPath as NodePath<t.CallExpression>,
            );
          }
          changes++;
        });

        oldRefs.forEach((ref) => {
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
     *
     * In some forked versions of the obfuscator, some properties may be in the object
     * and others are assigned later.
     */
    function transformObjectKeys(objBinding: Binding): boolean {
      const container = objBinding.path.parentPath!.container as t.Statement[];
      const startIndex = (objBinding.path.parentPath!.key as number) + 1;
      const properties: t.ObjectProperty[] = [];

      for (let i = startIndex; i < container.length; i++) {
        const statement = container[i];

        // Example: _0x29d709["kHAOU"] = "5|1|2" + "|4|3|" + "0|6";
        // For performance reasons, only traverse if it is a potential match (value doesn't matter)
        if (looseAssignment.match(statement)) {
          applyTransform(statement, mergeStrings);
        }

        if (assignment.match(statement)) {
          properties.push(
            t.objectProperty(
              t.identifier(assignedKey.current!),
              assignedValue.current!,
            ),
          );
        } else {
          break;
        }
      }

      // If all properties are in the object then there typically won't be an alias variable
      const aliasAssignment = container[startIndex + properties.length];
      if (!aliasVar.match(aliasAssignment)) return true;

      // Avoid false positives
      if (objBinding.references !== properties.length + 1) return false;

      const aliasBinding = objBinding.scope.getBinding(aliasId.current!.name)!;
      if (!isReadonlyObject(aliasBinding, memberAccess)) return false;

      objectProperties.current!.push(...properties);
      container.splice(startIndex, properties.length);
      objBinding.referencePaths = aliasBinding.referencePaths;
      objBinding.references = aliasBinding.references;
      objBinding.identifier.name = aliasBinding.identifier.name;
      aliasBinding.path.remove();
      return true;
    }

    return {
      VariableDeclarator: {
        exit(path) {
          this.changes += transform(path);
        },
      },
      MemberExpression: {
        exit(path) {
          if (!inlineMatcher.match(path.node)) return;

          const propName = getPropName(path.node.property)!;
          const value = objectProperties.current!.find(
            (prop) => getPropName(prop.key) === propName,
          )?.value as t.FunctionExpression | t.StringLiteral | undefined;
          if (!value) return;

          if (t.isStringLiteral(value)) {
            path.replaceWith(value);
          } else if (path.parentPath.isCallExpression()) {
            inlineFunction(value, path.parentPath);
          } else {
            path.replaceWith(value);
          }
          this.changes++;
        },
      },
    };
  },
} satisfies Transform;
