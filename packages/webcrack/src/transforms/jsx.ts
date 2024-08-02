import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../ast-utils';
import { codePreview, constMemberExpression } from '../ast-utils';
import { generateUid } from '../ast-utils/scope';

export default {
  name: 'jsx',
  tags: ['unsafe'],
  scope: true,
  visitor: () => {
    const deepIdentifierMemberExpression = m.memberExpression(
      m.or(
        m.identifier(),
        m.matcher((node) => deepIdentifierMemberExpression.match(node)),
      ),
      m.identifier(),
      false,
    );

    const type = m.capture(
      m.or(
        m.identifier(), // React.createElement(Component, ...)
        m.stringLiteral(), // React.createElement('div', ...)
        deepIdentifierMemberExpression, // React.createElement(Component.SubComponent, ...)
      ),
    );
    const props = m.capture(m.or(m.objectExpression(), m.nullLiteral()));

    // React.createElement(type, props, ...children)
    const elementMatcher = m.callExpression(
      constMemberExpression('React', 'createElement'),
      m.anyList(
        type,
        props,
        m.zeroOrMore(m.or(m.anyExpression(), m.spreadElement())),
      ),
    );

    // React.createElement(React.Fragment, null, ...children)
    const fragmentMatcher = m.callExpression(
      constMemberExpression('React', 'createElement'),
      m.anyList(
        constMemberExpression('React', 'Fragment'),
        m.nullLiteral(),
        m.zeroOrMore(m.or(m.anyExpression(), m.spreadElement())),
      ),
    );

    return {
      CallExpression: {
        exit(path) {
          if (fragmentMatcher.match(path.node)) {
            const children = convertChildren(
              path.node.arguments.slice(2) as t.Expression[],
            );
            const opening = t.jsxOpeningFragment();
            const closing = t.jsxClosingFragment();
            const fragment = t.jsxFragment(opening, closing, children);
            path.node.leadingComments = null;
            path.replaceWith(fragment);
            this.changes++;
          }

          if (elementMatcher.match(path.node)) {
            let name = convertType(type.current!);

            // rename component to avoid conflict with built-in html tags
            // https://react.dev/reference/react/createElement#caveats
            if (
              t.isIdentifier(type.current) &&
              /^[a-z]/.test(type.current.name)
            ) {
              const binding = path.scope.getBinding(type.current.name);
              if (!binding) return;
              name = t.jsxIdentifier(generateUid(path.scope, 'Component'));
              path.scope.rename(type.current.name, name.name);
            }

            const attributes = t.isObjectExpression(props.current)
              ? convertAttributes(props.current)
              : [];
            const children = convertChildren(
              path.node.arguments.slice(2) as t.Expression[],
            );
            const selfClosing = children.length === 0;
            const opening = t.jsxOpeningElement(name, attributes, selfClosing);
            const closing = t.jsxClosingElement(name);
            const element = t.jsxElement(opening, closing, children);
            path.node.leadingComments = null;
            path.replaceWith(element);
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;

/**
 * - `Component` -> `Component`
 * - `Component.SubComponent` -> `Component.SubComponent`
 * - `'div'` -> `div`
 */
function convertType(
  type: t.Identifier | t.MemberExpression | t.StringLiteral,
): t.JSXIdentifier | t.JSXMemberExpression {
  if (t.isIdentifier(type)) {
    return t.jsxIdentifier(type.name);
  } else if (t.isStringLiteral(type)) {
    return t.jsxIdentifier(type.value);
  } else {
    const object = convertType(
      type.object as t.Identifier | t.MemberExpression,
    );
    const property = t.jsxIdentifier((type.property as t.Identifier).name);
    return t.jsxMemberExpression(object, property);
  }
}

/**
 * `{ className: 'foo', style: { display: 'block' } }`
 * ->
 * `className='foo' style={{ display: 'block' }}`
 */
function convertAttributes(
  object: t.ObjectExpression,
): (t.JSXAttribute | t.JSXSpreadAttribute)[] {
  const name = m.capture(m.anyString());
  const value = m.capture(m.anyExpression());
  const matcher = m.objectProperty(
    m.or(m.identifier(name), m.stringLiteral(name)),
    value,
  );

  return object.properties.map((property) => {
    if (matcher.match(property)) {
      const jsxName = t.jsxIdentifier(name.current!);
      if (value.current!.type === 'StringLiteral') {
        const hasSpecialChars = /["\\]/.test(value.current.value);
        const jsxValue = hasSpecialChars
          ? t.jsxExpressionContainer(value.current)
          : value.current;
        return t.jsxAttribute(jsxName, jsxValue);
      }
      const jsxValue = t.jsxExpressionContainer(value.current!);
      return t.jsxAttribute(jsxName, jsxValue);
    } else if (t.isSpreadElement(property)) {
      return t.jsxSpreadAttribute(property.argument);
    } else {
      throw new Error(
        `jsx: property type not implemented ${codePreview(object)}`,
      );
    }
  });
}

function convertChildren(
  children: (t.Expression | t.SpreadElement)[],
): (t.JSXText | t.JSXElement | t.JSXSpreadChild | t.JSXExpressionContainer)[] {
  return children.map((child) => {
    if (t.isJSXElement(child)) {
      return child;
    } else if (t.isStringLiteral(child)) {
      const hasSpecialChars = /[{}<>\r\n]/.test(child.value);
      return hasSpecialChars
        ? t.jsxExpressionContainer(child)
        : t.jsxText(child.value);
    } else if (t.isSpreadElement(child)) {
      return t.jsxSpreadChild(child.argument);
    } else {
      return t.jsxExpressionContainer(child);
    }
  });
}
