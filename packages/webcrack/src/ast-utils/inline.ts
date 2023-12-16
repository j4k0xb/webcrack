import traverse, { Binding, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { findParent } from './matcher';

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
    memberPath.replaceWith(replacement);
  }
}

/**
 * Inline function used in control flow flattening (that only returns an expression)
 * Example:
 * fn: `function (a, b) { return a(b) }`
 * caller: `fn(a, 1)`
 * ->
 * `a(1)`
 */
export function inlineFunction(
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
        path.replaceWith(caller.node.arguments[paramIndex]);
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
        inlineFunction(fn.node, callRef);
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
          ref.parentPath.replaceWith(ref.parentPath.node.right);
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
