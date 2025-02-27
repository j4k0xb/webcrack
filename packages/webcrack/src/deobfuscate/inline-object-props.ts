import * as m from '@codemod/matchers';
import type { Transform } from '../ast-utils';
import {
  constKey,
  constMemberExpression,
  getPropName,
  inlineObjectProperties,
  isReadonlyObject,
} from '../ast-utils';

// TODO: move do decoder.ts collectCalls to avoid traversing the whole AST

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
    const propertyName = m.capture(
      m.matcher<string>((name) => /^[\w]+$/i.test(name)),
    );
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
    // E.g. { e: 0x80 }.e
    const literalMemberAccess = constMemberExpression(
      m.objectExpression(objectProperties),
      propertyName,
    );

    return {
      MemberExpression(path) {
        if (!literalMemberAccess.match(path.node)) return;
        const property = objectProperties.current!.find(
          (p) => getPropName(p.key) === propertyName.current,
        );
        if (!property) return;
        path.replaceWith(property.value);
        this.changes++;
      },
      VariableDeclarator(path) {
        if (!varMatcher.match(path.node)) return;
        if (objectProperties.current!.length === 0) return;

        const binding = path.scope.getBinding(varId.current!.name);
        if (!binding || !isReadonlyObject(binding, memberAccess)) return;

        inlineObjectProperties(
          binding,
          m.objectProperty(
            propertyKey,
            m.or(m.stringLiteral(), m.numericLiteral()),
          ),
        );
        this.changes++;
      },
    };
  },
} satisfies Transform;
