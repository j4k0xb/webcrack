import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../ast-utils';
import { codePreview, constMemberExpression } from '../ast-utils';
import { generateUid } from '../ast-utils/scope';

const DEFAULT_PRAGMA_CANDIDATES = [
  'jsx',
  'jsxs',
  '_jsx',
  '_jsxs',
  'jsxDEV',
  'jsxsDEV',
] as const;

/**
 * https://github.com/reactjs/rfcs/blob/createlement-rfc/text/0000-create-element-changes.md
 * https://new-jsx-transform.netlify.app/
 */
export default {
  name: 'jsx-new',
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
    const convertibleName = m.or(
      m.identifier(), // jsx(Component, ...)
      m.stringLiteral(), // jsx('div', ...)
      deepIdentifierMemberExpression, // jsx(Component.SubComponent, ...)
    );
    const type = m.capture(m.anyExpression());
    const fragmentType = constMemberExpression('React', 'Fragment');
    const props = m.capture(m.objectExpression());
    const key = m.capture(m.anyExpression());

    const jsxFunction = m.capture(m.or(...DEFAULT_PRAGMA_CANDIDATES));
    // jsx(type, props, key?) or (0, r.jsx)(type, props, key?) or obj.jsx(type, props, key?)
    const jsxMatcher = m.callExpression(
      m.or(
        m.identifier(jsxFunction),
        m.sequenceExpression([
          m.numericLiteral(0),
          constMemberExpression(m.identifier(), jsxFunction),
        ]),
        constMemberExpression(m.identifier(), jsxFunction),
      ),
      m.anyList(type, props, m.slice({ min: 0, max: 1, matcher: key })),
    );

    return {
      CallExpression: {
        exit(path) {
          if (!jsxMatcher.match(path.node)) return;

          let name: t.Node;
          if (convertibleName.match(type.current!)) {
            name = convertType(type.current);
          } else {
            name = t.jsxIdentifier(generateUid(path.scope, 'Component'));
            const componentVar = t.variableDeclaration('const', [
              t.variableDeclarator(t.identifier(name.name), type.current),
            ]);
            path.getStatementParent()?.insertBefore(componentVar);
          }
          const isFragment = fragmentType.match(type.current);

          // rename component to avoid conflict with built-in html tags
          // https://react.dev/reference/react/createElement#caveats
          if (
            t.isIdentifier(type.current) &&
            /^[a-z]/.test(type.current.name)
          ) {
            const binding = path.scope.getBinding(type.current.name);
            if (!binding) return;
            name = t.jsxIdentifier(path.scope.generateUid('Component'));
            path.scope.rename(type.current.name, name.name);
          }

          const attributes = convertAttributes(props.current!);
          if (path.node.arguments.length === 3) {
            attributes.push(
              t.jsxAttribute(
                t.jsxIdentifier('key'),
                convertAttributeValue(key.current!),
              ),
            );
          }
          const children = convertChildren(
            props.current!,
            jsxFunction.current!,
          );

          if (isFragment && attributes.length === 0) {
            const opening = t.jsxOpeningFragment();
            const closing = t.jsxClosingFragment();
            const fragment = t.jsxFragment(opening, closing, children);
            path.node.leadingComments = null;
            path.replaceWith(fragment);
          } else {
            const selfClosing = children.length === 0;
            const opening = t.jsxOpeningElement(name, attributes, selfClosing);
            const closing = t.jsxClosingElement(name);
            const element = t.jsxElement(opening, closing, children);
            path.node.leadingComments = null;
            path.replaceWith(element);
          }
          this.changes++;
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

  return object.properties.flatMap((property) => {
    if (matcher.match(property)) {
      if (name.current === 'children') return [];

      const jsxName = t.jsxIdentifier(name.current!);
      const jsxValue = convertAttributeValue(value.current!);
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

function convertAttributeValue(
  expression: t.Expression,
): t.JSXExpressionContainer | t.StringLiteral {
  if (expression.type === 'StringLiteral') {
    const hasSpecialChars = /["\\]/.test(expression.value);
    return hasSpecialChars ? t.jsxExpressionContainer(expression) : expression;
  }
  return t.jsxExpressionContainer(expression);
}

function convertChildren(
  object: t.ObjectExpression,
  pragma: string,
): (t.JSXText | t.JSXElement | t.JSXExpressionContainer)[] {
  const children = m.capture(m.anyExpression());
  const matcher = m.objectProperty(
    m.or(m.identifier('children'), m.stringLiteral('children')),
    children,
  );

  const prop = object.properties.find((prop) => matcher.match(prop));
  if (!prop) return [];

  if (pragma.includes('jsxs') && t.isArrayExpression(children.current)) {
    return children.current.elements.map((child) =>
      convertChild(child as t.Expression),
    );
  }
  return [convertChild(children.current!)];
}

function convertChild(
  child: t.Expression,
): t.JSXElement | t.JSXExpressionContainer | t.JSXText {
  if (t.isJSXElement(child)) {
    return child;
  } else if (t.isStringLiteral(child)) {
    const hasSpecialChars = /[{}<>\r\n]/.test(child.value);
    return hasSpecialChars
      ? t.jsxExpressionContainer(child)
      : t.jsxText(child.value);
  } else {
    return t.jsxExpressionContainer(child);
  }
}
