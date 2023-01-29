import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import findStringArray from './stringArray';

// https://astexplorer.net/#/gist/b1018df4a8daebfcb1daf9d61fe17557/4ff9ad0e9c40b9616956f17f59a2d9888cd62a4f

export default (ast: t.Node) => {
  const stringArray = findStringArray(ast);
  if (!stringArray) return;
  console.log(
    `String array of length ${stringArray.strings.length} found: ${stringArray.name}`
  );

  // print the line number of all references
  console.log(stringArray.references.map(ref => ref.node.loc?.start.line));

  traverse(ast, {
    ExpressionStatement(path) {
      if (!matchArrayRotator(path.node)) return;
      path.stop();
      // console.log(generate(path.node).code);
    },
  });
};

/**
 * Structure:
 * ```
 * iife (>= 2 parameters, called with 0 or 2 arguments)
 *  2 variable declarations (array and decoder)
 *  endless loop:
 *   try:
 *    if/break/parseInt/array.push(array.shift())
 *   catch:
 *    array.push(array.shift())
 * ```
 */
function matchArrayRotator(node: t.Node) {
  // e.g. 'array'
  const arrayName = m.capture(m.anyString());
  // e.g. array.push(array.shift())
  const pushShift = m.callExpression(
    m.memberExpression(
      m.identifier(m.fromCapture(arrayName)),
      m.identifier('push')
    ),
    [
      m.callExpression(
        m.memberExpression(
          m.identifier(m.fromCapture(arrayName)),
          m.identifier('shift')
        )
      ),
    ]
  );

  const matcher = m.expressionStatement(
    m.callExpression(
      m.functionExpression(
        null,
        m.anything(),
        m.blockStatement(
          m.anyList<t.Statement>(
            // = decodeFn
            m.variableDeclaration(),
            // = array
            m.variableDeclaration(undefined, [
              m.variableDeclarator(m.identifier(arrayName)),
            ]),
            m.zeroOrMore(),
            // TODO: preprocess and check the more general while(true) case
            m.forStatement(
              null,
              null,
              null,
              m.tryStatement(m.containerOf(pushShift), m.containerOf(pushShift))
            )
          )
        )
      )
    )
  );

  return matcher.match(node);
}
