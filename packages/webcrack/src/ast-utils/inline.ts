import type { Binding, NodePath } from '@babel/traverse';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { getPropName } from '.';
import { findParent } from './matcher';

/**
 * Replace all references of a variable with the initializer.
 * Example:
 * `const a = 1; console.log(a);` -> `console.log(1);`
 *
 * Example with `unsafeAssignments` being `true`:
 * `let a; a = 2; console.log(a);` -> `console.log(2);`
 *
 * @param unsafeAssignments Also inline assignments to the variable (not guaranteed to be the final value)
 */
export function inlineVariable(
  binding: Binding,
  value = m.anyExpression(),
  unsafeAssignments = false,
) {
  const varDeclarator = binding.path.node;
  const varMatcher = m.variableDeclarator(
    m.identifier(binding.identifier.name),
    value,
  );
  const assignmentMatcher = m.assignmentExpression(
    '=',
    m.identifier(binding.identifier.name),
    value,
  );

  if (binding.constant && varMatcher.match(varDeclarator)) {
    binding.referencePaths.forEach((ref) => {
      ref.replaceWith(varDeclarator.init!);
    });
    binding.path.remove();
  } else if (unsafeAssignments && binding.constantViolations.length >= 1) {
    const assignments = binding.constantViolations
      .map((path) => path.node)
      .filter((node) => assignmentMatcher.match(node));
    if (!assignments.length) return;

    function getNearestAssignment(location: number) {
      return assignments.findLast((assignment) => assignment.start! < location);
    }

    for (const ref of binding.referencePaths) {
      const assignment = getNearestAssignment(ref.node.start!);
      if (assignment) ref.replaceWith(assignment.right);
    }

    for (const path of binding.constantViolations) {
      if (path.parentPath?.isExpressionStatement()) {
        path.remove();
      } else if (path.isAssignmentExpression()) {
        path.replaceWith(path.node.right);
      }
    }

    binding.path.remove();
  }
}

/**
 * Make sure the array is immutable and references are valid before using!
 *
 * Example:
 * `const arr = ["foo", "bar"]; console.log(arr[0]);` -> `console.log("foo");`
 */
export function inlineArrayElements(
  array: t.ArrayExpression,
  references: NodePath[],
): void {
  for (const reference of references) {
    const memberPath = reference.parentPath! as NodePath<t.MemberExpression>;
    const property = memberPath.node.property as t.NumericLiteral;
    const index = property.value;
    const replacement = array.elements[index]!;
    memberPath.replaceWith(t.cloneNode(replacement));
  }
}

export function inlineObjectProperties(
  binding: Binding,
  property = m.objectProperty(),
): void {
  const varDeclarator = binding.path.node;
  const objectProperties = m.capture(m.arrayOf(property));
  const varMatcher = m.variableDeclarator(
    m.identifier(binding.identifier.name),
    m.objectExpression(objectProperties),
  );
  if (!varMatcher.match(varDeclarator)) return;

  const propertyMap = new Map(
    objectProperties.current!.map((p) => [getPropName(p.key), p.value]),
  );
  if (
    !binding.referencePaths.every((ref) => {
      const member = ref.parent as t.MemberExpression;
      const propName = getPropName(member.property)!;
      return propertyMap.has(propName);
    })
  )
    return;

  binding.referencePaths.forEach((ref) => {
    const memberPath = ref.parentPath as NodePath<t.MemberExpression>;
    const propName = getPropName(memberPath.node.property)!;
    const value = propertyMap.get(propName)!;

    memberPath.replaceWith(value);
  });

  binding.path.remove();
}

/**
 * Inline function used in control flow flattening (that only returns an expression)
 * Example:
 * fn: `function (a, b) { return a(b) }`
 * caller: `fn(a, 1)`
 * ->
 * `a(1)`
 */
export function inlineFunctionCall(
  fn: t.FunctionExpression | t.FunctionDeclaration,
  caller: NodePath<t.CallExpression>,
): void {
  if (t.isRestElement(fn.params[1])) {
    caller.replaceWith(
      t.callExpression(
        caller.node.arguments[0] as t.Identifier,
        caller.node.arguments.slice(1),
      ),
    );
    return;
  }

  const returnedValue = (fn.body.body[0] as t.ReturnStatement).argument!;
  const clone = t.cloneNode(returnedValue, true);

  // Inline all arguments
  traverse(clone, {
    Identifier(path) {
      const paramIndex = fn.params.findIndex(
        (p) => (p as t.Identifier).name === path.node.name,
      );
      if (paramIndex !== -1) {
        path.replaceWith(
          caller.node.arguments[paramIndex] ??
            t.unaryExpression('void', t.numericLiteral(0)),
        );
        path.skip();
      }
    },
    noScope: true,
  });

  caller.replaceWith(clone);
}

/**
 * Example:
 * `function alias(a, b) { return decode(b - 938, a); } alias(1071, 1077);`
 * ->
 * `decode(1077 - 938, 1071)`
 */
export function inlineFunctionAliases(binding: Binding): { changes: number } {
  const state = { changes: 0 };
  const refs = [...binding.referencePaths];
  for (const ref of refs) {
    const fn = findParent(ref, m.functionDeclaration());

    // E.g. alias
    const fnName = m.capture(m.anyString());
    // E.g. decode(b - 938, a)
    const returnedCall = m.capture(
      m.callExpression(
        m.identifier(binding.identifier.name),
        m.anyList(m.slice({ min: 2 })),
      ),
    );
    const matcher = m.functionDeclaration(
      m.identifier(fnName),
      m.anyList(m.slice({ min: 2 })),
      m.blockStatement([m.returnStatement(returnedCall)]),
    );

    if (fn && matcher.match(fn.node)) {
      // Avoid false positives of functions that return a string
      // It's only a wrapper if the function's params are used in the decode call
      const paramUsedInDecodeCall = fn.node.params.some((param) => {
        const binding = fn.scope.getBinding((param as t.Identifier).name);
        return binding?.referencePaths.some((ref) =>
          ref.findParent((p) => p.node === returnedCall.current),
        );
      });
      if (!paramUsedInDecodeCall) continue;

      const fnBinding = fn.scope.parent.getBinding(fnName.current!);
      if (!fnBinding) continue;
      // Check all further aliases (`function alias2(a, b) { return alias(a - 1, b + 3); }`)
      const fnRefs = fnBinding.referencePaths;
      refs.push(...fnRefs);

      // E.g. [alias(1071, 1077), alias(1, 2)]
      const callRefs = fnRefs
        .filter(
          (ref) =>
            t.isCallExpression(ref.parent) &&
            t.isIdentifier(ref.parent.callee, { name: fnName.current! }),
        )
        .map((ref) => ref.parentPath!) as NodePath<t.CallExpression>[];

      for (const callRef of callRefs) {
        inlineFunctionCall(fn.node, callRef);
        state.changes++;
      }

      fn.remove();
      state.changes++;
    }
  }

  // Have to crawl again because renaming messed up the references
  binding.scope.crawl();
  return state;
}

/**
 * Recursively renames all references to the binding.
 * Make sure the binding name isn't shadowed anywhere!
 *
 * Example: `var alias = decoder; alias(1);` -> `decoder(1);`
 */

export function inlineVariableAliases(
  binding: Binding,
  targetName = binding.identifier.name,
): { changes: number } {
  const state = { changes: 0 };
  const refs = [...binding.referencePaths];
  const varName = m.capture(m.anyString());
  const matcher = m.or(
    m.variableDeclarator(
      m.identifier(varName),
      m.identifier(binding.identifier.name),
    ),
    m.assignmentExpression(
      '=',
      m.identifier(varName),
      m.identifier(binding.identifier.name),
    ),
  );

  for (const ref of refs) {
    if (matcher.match(ref.parent)) {
      const varScope = ref.scope;
      const varBinding = varScope.getBinding(varName.current!);
      if (!varBinding) continue;
      // Avoid infinite loop from `alias = alias;` (caused by dead code injection?)
      if (ref.isIdentifier({ name: varBinding.identifier.name })) continue;

      // Check all further aliases (`var alias2 = alias;`)
      state.changes += inlineVariableAliases(varBinding, targetName).changes;

      if (ref.parentPath?.isAssignmentExpression()) {
        // Remove `var alias;` when the assignment happens separately
        varBinding.path.remove();

        if (t.isExpressionStatement(ref.parentPath.parent)) {
          // Remove `alias = decoder;`
          ref.parentPath.remove();
        } else {
          // Replace `(alias = decoder)(1);` with `decoder(1);`
          ref.parentPath.replaceWith(t.identifier(targetName));
        }
      } else if (ref.parentPath?.isVariableDeclarator()) {
        // Remove `alias = decoder;` of declarator
        ref.parentPath.remove();
      }
      state.changes++;
    } else {
      // Rename the reference
      ref.replaceWith(t.identifier(targetName));
      state.changes++;
    }
  }

  return state;
}
