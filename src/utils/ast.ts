import generate from '@babel/generator';
import traverse, { Binding, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';

export function codePreview(node: t.Node) {
  const { code } = generate(node, { compact: true, comments: false });
  if (code.length > 100) {
    return code.slice(0, 70) + ' … ' + code.slice(-30);
  }
  return code;
}

/**
 * Recursively renames all aliases variable declarations to the binding name.
 * Make sure the binding name isn't shadowed anywhere above the alias scope!
 *
 * Example: `var alias = original; alias(1);` -> `original(1);`
 */
export function inlineVariableAliases(binding: Binding) {
  const refs = [...binding.referencePaths];
  const varName = m.capture(m.anyString());
  const matcher = m.variableDeclarator(
    m.identifier(varName),
    m.identifier(binding.identifier.name)
  );

  for (const ref of refs) {
    if (matcher.match(ref.parent)) {
      const varScope = ref.scope;

      // Check all further aliases (`var alias2 = alias;`)
      const varRefs = varScope.bindings[varName.current!].referencePaths;
      refs.push(...varRefs);

      varScope.rename(varName.current!, binding.identifier.name);
      ref.parentPath?.remove();
    }
  }

  // Have to crawl again because renaming messed up the references
  binding.scope.crawl();
}

/**
 * Example:
 * `function alias(a, b) { return decode(b - 938, a); alias(1071, 1077);`
 * ->
 * `decode(1077 - 938, 1071)`
 */
export function inlineFunctionAliases(binding: Binding) {
  const refs = [...binding.referencePaths];
  for (const ref of refs) {
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
      // Check all further aliases (`function alias2(a, b) { return alias(a - 1, b + 3); }`)
      const fnRefs = fn.scope.parent.bindings[fnName.current!].referencePaths;
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
      }

      fn.remove();
    }
  }

  // Have to crawl again because renaming messed up the references
  binding.scope.crawl();
}
