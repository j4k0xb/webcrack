import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import {
  Transform,
  constKey,
  constMemberExpression,
  getPropName,
  isReadonlyObject,
} from '../ast-utils';

/**
 * Inline objects that only have string or numeric literal properties.
 * Used by the "String Array Calls Transform" option for moving the
 * decode call arguments into an object.
 * Example:
 * ```js
 * const obj = {
 *   c: 0x2f2,
 *   d: '0x396',
 * };
 * console.log(decode(obj.c, obj.d));
 * ```
 * ->
 * ```js
 * console.log(decode(0x2f2, '0x396'));
 * ```
 */
export default {
  name: 'inline-object-props',
  tags: ['safe'],
  scope: true,
  visitor() {
    const varId = m.capture(m.identifier());
    const propertyName = m.matcher<string>((name) => /^[\w]+$/i.test(name));
    const propertyKey = constKey(propertyName);
    // E.g. "_0x51b74a": 0x80
    const objectProperties = m.capture(
      m.arrayOf(
        m.objectProperty(
          propertyKey,
          m.or(m.stringLiteral(), m.numericLiteral()),
        ),
      ),
    );
    // E.g. obj._0x51b74a
    const memberAccess = constMemberExpression(
      m.fromCapture(varId),
      propertyName,
    );
    const varMatcher = m.variableDeclarator(
      varId,
      m.objectExpression(objectProperties),
    );

    return {
      VariableDeclarator(path) {
        if (!varMatcher.match(path.node)) return;
        if (objectProperties.current!.length === 0) return;

        const binding = path.scope.getBinding(varId.current!.name);
        if (!binding || !isReadonlyObject(binding, memberAccess)) return;

        const props = new Map(
          objectProperties.current!.map((p) => [
            getPropName(p.key),
            p.value as t.StringLiteral | t.NumericLiteral,
          ]),
        );

        if (
          !binding.referencePaths.every((ref) => {
            const memberPath = ref.parentPath as NodePath<t.MemberExpression>;
            const propName = getPropName(memberPath.node.property)!;
            return props.has(propName);
          })
        )
          return;

        binding.referencePaths.forEach((ref) => {
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
