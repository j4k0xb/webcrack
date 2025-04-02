import type { Binding, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';

/**
 * Matches any literal except for template literals with expressions (that could have side effects)
 */
export const safeLiteral: m.Matcher<t.Literal> = m.matcher(
  (node) =>
    t.isLiteral(node) &&
    (!t.isTemplateLiteral(node) || node.expressions.length === 0),
);

export function infiniteLoop(
  body?: m.Matcher<t.Statement>,
): m.Matcher<t.ForStatement | t.WhileStatement> {
  return m.or(
    m.forStatement(undefined, null, undefined, body),
    m.forStatement(undefined, truthyMatcher, undefined, body),
    m.whileStatement(truthyMatcher, body),
  );
}

export function constKey(
  name?: string | m.Matcher<string>,
): m.Matcher<t.Identifier | t.StringLiteral> {
  return m.or(m.identifier(name), m.stringLiteral(name));
}

export function constObjectProperty(
  value?: m.Matcher<t.Expression>,
): m.Matcher<t.ObjectProperty> {
  return m.or(
    m.objectProperty(m.identifier(), value, false),
    m.objectProperty(m.or(m.stringLiteral(), m.numericLiteral()), value),
  );
}

export function anonymousFunction(
  params?:
    | m.Matcher<(t.Identifier | t.RestElement | t.Pattern)[]>
    | (
        | m.Matcher<t.Identifier>
        | m.Matcher<t.Pattern>
        | m.Matcher<t.RestElement>
      )[],
  body?: m.Matcher<t.BlockStatement>,
): m.Matcher<t.FunctionExpression | t.ArrowFunctionExpression> {
  return m.or(
    m.functionExpression(null, params, body, false),
    m.arrowFunctionExpression(params, body),
  );
}

export function iife(
  params?:
    | m.Matcher<(t.Identifier | t.RestElement | t.Pattern)[]>
    | (
        | m.Matcher<t.Identifier>
        | m.Matcher<t.Pattern>
        | m.Matcher<t.RestElement>
      )[],
  body?: m.Matcher<t.BlockStatement>,
): m.Matcher<t.CallExpression> {
  return m.callExpression(anonymousFunction(params, body));
}

/**
 * Matches either `object.property` and `object["property"]`
 */
export function constMemberExpression(
  object: string | m.Matcher<t.Expression>,
  property?: string | m.Matcher<string>,
): m.Matcher<t.MemberExpression> {
  if (typeof object === 'string') object = m.identifier(object);
  return m.or(
    m.memberExpression(object, m.identifier(property), false),
    m.memberExpression(object, m.stringLiteral(property), true),
  );
}

export const undefinedMatcher = m.or(
  m.identifier('undefined'),
  m.unaryExpression('void', m.numericLiteral(0)),
);

export const trueMatcher = m.or(
  m.booleanLiteral(true),
  m.unaryExpression('!', m.numericLiteral(0)),
  m.unaryExpression('!', m.unaryExpression('!', m.numericLiteral(1))),
  m.unaryExpression('!', m.unaryExpression('!', m.arrayExpression([]))),
);

export const falseMatcher = m.or(
  m.booleanLiteral(false),
  m.unaryExpression('!', m.arrayExpression([])),
);

export const truthyMatcher = m.or(trueMatcher, m.arrayExpression([]));

/**
 * Starting at the parent path of the current `NodePath` and going up the
 * tree, return the first `NodePath` that causes the provided `matcher`
 * to return true, or `null` if the `matcher` never returns true.
 */
export function findParent<T extends t.Node>(
  path: NodePath,
  matcher: m.Matcher<T>,
): NodePath<T> | null {
  return path.findParent((path) =>
    matcher.match(path.node),
  ) as NodePath<T> | null;
}

/**
 * Starting at current `NodePath` and going up the tree, return the first
 * `NodePath` that causes the provided `matcher` to return true,
 * or `null` if the `matcher` never returns true.
 */
export function findPath<T extends t.Node>(
  path: NodePath,
  matcher: m.Matcher<T>,
): NodePath<T> | null {
  return path.find((path) => matcher.match(path.node)) as NodePath<T> | null;
}

/**
 * Function expression matcher that captures the parameters
 * and allows them to be referenced in the body.
 */
export function createFunctionMatcher(
  params: number,
  body: (
    ...captures: m.Matcher<t.Identifier>[]
  ) => m.Matcher<t.Statement[]> | m.Matcher<t.Statement>[],
): m.Matcher<t.FunctionExpression> {
  const captures = Array.from({ length: params }, () =>
    m.capture(m.anyString()),
  );

  return m.functionExpression(
    undefined,
    captures.map(m.identifier),
    m.blockStatement(
      body(...captures.map((c) => m.identifier(m.fromCapture(c)))),
    ),
  );
}

/**
 * Returns true if every reference is a member expression whose value is read
 */
export function isReadonlyObject(
  binding: Binding,
  memberAccess: m.Matcher<t.MemberExpression>,
): boolean {
  // Workaround because sometimes babel treats the VariableDeclarator/binding itself as a violation
  if (!binding.constant && binding.constantViolations[0] !== binding.path)
    return false;

  function isPatternAssignment(member: NodePath<t.Node>) {
    const { parentPath } = member;
    return (
      // [obj.property] = [1];
      parentPath?.isArrayPattern() ||
      // ({ property: obj.property } = {})
      // ({ ...obj.property } = {})
      (parentPath?.parentPath?.isObjectPattern() &&
        (parentPath.isObjectProperty({ value: member.node }) ||
          parentPath.isRestElement())) ||
      // ([obj.property = 1] = [])
      // ({ property: obj.property = 1 } = {})
      parentPath?.isAssignmentPattern({ left: member.node })
    );
  }

  return binding.referencePaths.every(
    (path) =>
      // obj.property
      memberAccess.match(path.parent) &&
      // obj.property = 1
      !path.parentPath?.parentPath?.isAssignmentExpression({
        left: path.parent,
      }) &&
      // obj.property++
      !path.parentPath?.parentPath?.isUpdateExpression({
        argument: path.parent,
      }) &&
      // delete obj.property
      !path.parentPath?.parentPath?.isUnaryExpression({
        argument: path.parent,
        operator: 'delete',
      }) &&
      !isPatternAssignment(path.parentPath!),
  );
}

/**
 * Checks if the binding is a temporary variable that is only assigned
 * once and has limited references. Often created by transpilers.
 *
 * Example with 1 reference to `_tmp`:
 * ```js
 * var _tmp; x[_tmp = y] || (x[_tmp] = z);
 * ```
 */
export function isTemporaryVariable(
  binding: Binding | undefined,
  references: number,
  kind: 'var' | 'param' = 'var',
): binding is Binding {
  return (
    binding !== undefined &&
    binding.references === references &&
    binding.constantViolations.length === 1 &&
    (kind === 'var'
      ? binding.path.isVariableDeclarator() && binding.path.node.init === null
      : binding.path.listKey === 'params' && binding.path.isIdentifier())
  );
}

export class AnySubListMatcher<T> extends m.Matcher<T[]> {
  constructor(private readonly matchers: m.Matcher<T>[]) {
    super();
  }

  matchValue(array: unknown, keys: readonly PropertyKey[]): array is T[] {
    if (!Array.isArray(array)) return false;
    if (this.matchers.length === 0 && array.length === 0) return true;

    let j = 0;
    for (let i = 0; i < array.length; i++) {
      const matches = this.matchers[j].matchValue(array[i], [...keys, i]);

      if (matches) {
        j++;

        if (j === this.matchers.length) {
          return true;
        }
      }
    }

    return false;
  }
}

/**
 * Greedy matches elements in the specified order, allowing for any number of elements in between
 */
export function anySubList<T>(
  ...elements: Array<m.Matcher<T>>
): m.Matcher<Array<T>> {
  return new AnySubListMatcher(elements);
}
