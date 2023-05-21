import traverse, { Binding, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';

/**
 * Inline function used in control flow flattening (that only returns an expression)
 * Example:
 * fn: `function (a, b) { return a(b) }`
 * caller: `fn(a, 1)`
 * ->
 * `a(1)`
 */
export function inlineCfFunction(
  fn: t.FunctionExpression,
  caller: NodePath<t.CallExpression>
): void {
  const returnedValue = (fn.body.body[0] as t.ReturnStatement).argument!;
  const clone = t.cloneNode(returnedValue, true);

  // Inline all arguments
  traverse(clone, {
    Identifier(path) {
      const paramIndex = fn.params.findIndex(
        p => (p as t.Identifier).name === path.node.name
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
 * `function alias(a, b) { return decode(b - 938, a); alias(1071, 1077);`
 * ->
 * `decode(1077 - 938, 1071)`
 */
export function inlineFunctionAliases(binding: Binding): { changes: number } {
  const state = { changes: 0 };
  const refs = [...binding.referencePaths];
  for (const ref of refs) {
    // TODO: can also be a function assigned to a variable
    const fn = ref.findParent(p =>
      p.isFunctionDeclaration()
    ) as NodePath<t.FunctionDeclaration> | null;

    // E.g. alias
    const fnName = m.capture(m.anyString());
    // E.g. decode(b - 938, a)
    const returnedCall = m.capture(
      m.callExpression(m.identifier(binding.identifier.name))
    );
    const matcher = m.functionDeclaration(
      m.identifier(fnName),
      m.anything(),
      m.blockStatement([m.returnStatement(returnedCall)])
    );

    if (fn && matcher.match(fn.node)) {
      const fnBinding = fn.scope.parent.getBinding(fnName.current!);
      if (!fnBinding) continue;
      // Check all further aliases (`function alias2(a, b) { return alias(a - 1, b + 3); }`)
      const fnRefs = fnBinding.referencePaths;
      refs.push(...fnRefs);

      // E.g. [alias(1071, 1077), alias(1, 2)]
      const callRefs = fnRefs
        .filter(ref => ref.parentPath?.isCallExpression())
        .map(ref => ref.parentPath!) as NodePath<t.CallExpression>[];

      for (const callRef of callRefs) {
        const fnClone = t.cloneNode(fn.node, true);

        // Inline all arguments
        traverse(fnClone.body, {
          Identifier(path) {
            const paramIndex = fnClone.params.findIndex(
              p => (p as t.Identifier).name === path.node.name
            );
            if (paramIndex !== -1) {
              path.replaceWith(callRef.node.arguments[paramIndex]);
              path.skip();
            }
          },
          noScope: true,
        });

        // Replace the alias call itself with the return value
        callRef.replaceWith(
          (fnClone.body.body[0] as t.ReturnStatement).argument!
        );
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
  targetName = binding.identifier.name
): { changes: number } {
  const state = { changes: 0 };
  const refs = [...binding.referencePaths];
  const varName = m.capture(m.anyString());
  const matcher = m.or(
    m.variableDeclarator(
      m.identifier(varName),
      m.identifier(binding.identifier.name)
    ),
    m.assignmentExpression(
      '=',
      m.identifier(varName),
      m.identifier(binding.identifier.name)
    )
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

        if (t.isExpressionStatement(ref.parentPath.parentPath)) {
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
