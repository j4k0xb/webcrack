import { Binding, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../transforms';
import { getPropName } from '../utils/ast';
import { constKey, constMemberExpression } from '../utils/matcher';

export default {
  name: 'objectLiterals',
  tags: ['safe'],
  visitor() {
    const varId = m.capture(m.identifier());
    const propertyName = m.matcher<string>(name =>
      /^[\w]+$/i.test(name as string)
    );
    const propertyKey = constKey(propertyName);
    // E.g. "_0x51b74a": 0x80
    const objectProperties = m.capture(
      m.arrayOf(
        m.objectProperty(
          propertyKey,
          m.or(m.stringLiteral(), m.numericLiteral())
        )
      )
    );
    // E.g. obj._0x51b74a
    const memberAccess = constMemberExpression(
      m.fromCapture(varId),
      propertyName
    );
    const varMatcher = m.variableDeclarator(
      varId,
      m.objectExpression(objectProperties)
    );

    return {
      VariableDeclarator(path) {
        if (!varMatcher.match(path.node)) return;

        const binding = path.scope.getBinding(varId.current!.name);
        if (
          !binding ||
          !isReadonlyBinding(binding) ||
          !hasValidReads(binding, memberAccess)
        )
          return;

        if (!objectProperties.current!.length) return;

        const props = new Map(
          objectProperties.current!.map(p => [
            getPropName(p.key),
            p.value as t.StringLiteral | t.NumericLiteral,
          ])
        );

        binding.referencePaths.forEach(ref => {
          const memberPath = ref.parentPath as NodePath<t.MemberExpression>;
          const propName = getPropName(memberPath.node.property)!;
          const value = props.get(propName)!;

          memberPath.replaceWith(value);
          this.changes++;
        });

        path.remove();
        this.changes++;
      },
    };
  },
} satisfies Transform;

/**
 * Returns true if every reference is a member expression whose value is read
 */
function hasValidReads(
  binding: Binding,
  memberAccess: m.Matcher<t.MemberExpression>
) {
  return binding.referencePaths.every(
    path =>
      memberAccess.match(path.parent) &&
      !path.parentPath?.parentPath?.isAssignmentExpression({
        left: path.parent,
      })
  );
}

function isReadonlyBinding(binding: Binding) {
  // Workaround because sometimes babel treats the VariableDeclarator/binding itself as a violation
  return binding.constant || binding.constantViolations[0] === binding.path;
}
