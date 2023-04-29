import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';
import {
  constMemberExpression,
  deepIdentifierMemberExpression,
} from '../utils/matcher';
import { renameFast } from '../utils/rename';

export default {
  name: 'jsx',
  tags: ['unsafe'],
  visitor: () => {
    const typeName = m.capture(m.anyString()); // Component
    const type = m.capture(
      m.or(
        m.identifier(typeName), // React.createElement(Component, ...)
        m.stringLiteral(), // React.createElement('div', ...)
        deepIdentifierMemberExpression // React.createElement(Component.SubComponent, ...)
      )
    );
    const props = m.capture(m.objectExpression());

    // React.createElement(type, props, ...children)
    const elementMatcher = m.callExpression(
      constMemberExpression(m.identifier('React'), 'createElement'),
      m.anyList<t.Expression>(
        type,
        m.or(props, m.nullLiteral()),
        m.zeroOrMore(m.anyExpression())
      )
    );

    // React.createElement(React.Fragment, null, ...children)
    const fragmentMatcher = m.callExpression(
      constMemberExpression(m.identifier('React'), 'createElement'),
      m.anyList<t.Expression>(
        constMemberExpression(m.identifier('React'), 'Fragment'),
        m.nullLiteral(),
        m.zeroOrMore(m.anyExpression())
      )
    );

    return {
      CallExpression: {
        exit(path) {
          if (fragmentMatcher.match(path.node)) {
            const children = convertChildren(
              path.node.arguments.slice(2) as t.Expression[]
            );
            const opening = t.jSXOpeningFragment();
            const closing = t.jsxClosingFragment();
            const fragment = t.jsxFragment(opening, closing, children);
            path.replaceWith(fragment);
            this.changes++;
          }

          if (elementMatcher.match(path.node)) {
            let name = convertType(type.current!);

            // rename component to avoid conflict with built-in html tags
            // https://react.dev/reference/react/createElement#caveats
            if (typeName.current! && /^[a-z]/.test(typeName.current)) {
              const binding = path.scope.getBinding(typeName.current!);
              if (!binding) return;
              name = t.jsxIdentifier(path.scope.generateUid('Component'));
              renameFast(binding, name.name);
            }

            const attributes = props.current
              ? convertAttributes(props.current!)
              : [];
            const children = convertChildren(
              path.node.arguments.slice(2) as t.Expression[]
            );
            const opening = t.jsxOpeningElement(name, attributes);
            const closing = t.jsxClosingElement(name);
            const element = t.jsxElement(opening, closing, children);
            path.replaceWith(element);
            this.changes++;
          }
        },
      },
      noScope: true,
    };
  },
} satisfies Transform;

/**
 * - `Component` -> `Component`
 * - `Component.SubComponent` -> `Component.SubComponent`
 * - `'div'` -> `div`
 */
function convertType(
  type: t.Identifier | t.MemberExpression | t.StringLiteral
): t.JSXIdentifier | t.JSXMemberExpression {
  if (t.isIdentifier(type)) {
    return t.jsxIdentifier(type.name);
  } else if (t.isStringLiteral(type)) {
    return t.jsxIdentifier(type.value);
  } else {
    const object = convertType(
      type.object as t.Identifier | t.MemberExpression
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
function convertAttributes(object: t.ObjectExpression): t.JSXAttribute[] {
  const name = m.capture(m.anyString());
  const value = m.capture(m.anyExpression());
  const matcher = m.objectProperty(m.identifier(name), value);

  return object.properties.map(property => {
    if (matcher.match(property)) {
      const jsxName = t.jsxIdentifier(name.current!);
      const jsxValue =
        value.current!.type === 'StringLiteral'
          ? value.current!
          : t.jsxExpressionContainer(value.current!);
      return t.jsxAttribute(jsxName, jsxValue);
    }
    // TODO: maybe a property is a SpreadElement or ObjectMethod?
    throw new Error('Not implemented');
  });
}

function convertChildren(
  children: t.Expression[]
): (t.JSXText | t.JSXElement | t.JSXExpressionContainer)[] {
  return children.map(child => {
    if (t.isJSXElement(child)) {
      return child;
    } else if (t.isStringLiteral(child)) {
      return t.jsxText(child.value);
    } else {
      return t.jsxExpressionContainer(child);
    }
  });
}
