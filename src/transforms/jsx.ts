import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';
import { constMemberExpression } from '../utils/matcher';

export default {
  name: 'jsx',
  tags: ['unsafe'],
  visitor: () => {
    const type = m.capture(m.anyString());
    const props = m.capture(m.objectExpression());

    // React.createElement(type, props, ...children)
    const matcher = m.callExpression(
      constMemberExpression(m.identifier('React'), 'createElement'),
      m.anyList<t.Expression>(
        m.stringLiteral(type),
        m.or(props, m.nullLiteral()),
        m.zeroOrMore()
      )
    );

    return {
      CallExpression: {
        exit(path) {
          if (matcher.match(path.node)) {
            const attributes = props.current
              ? convertAttributes(props.current!)
              : [];
            // FIXME: dont assume children are expressions
            const children = convertChildren(
              path.node.arguments.slice(2) as t.Expression[]
            );
            const opening = t.jsxOpeningElement(
              t.jsxIdentifier(type.current!),
              attributes
            );
            const closing = t.jsxClosingElement(t.jsxIdentifier(type.current!));
            const jsx = t.jsxElement(opening, closing, children);
            path.replaceWith(jsx);
          }
        },
      },
      noScope: true,
    };
  },
} satisfies Transform;

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
