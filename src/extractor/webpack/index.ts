import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { constMemberExpression } from '../../utils/matcher';
import { renameParameters } from '../../utils/rename';
import { Bundle } from '../index';
import { Module } from '../module';

export function extract(ast: t.Node): Bundle | undefined {
  const modules = new Map<number, Module>();

  const entryIdMatcher = m.capture(m.numericLiteral());
  const moduleFunctionsMatcher = m.capture(
    m.or(
      // E.g. [,,function (e, t, i) {...}, ...], index is the module ID
      m.arrayExpression(m.arrayOf(m.or(m.functionExpression(), null))),
      // E.g. {0: function (e, t, i) {...}, ...}, key is the module ID
      m.objectExpression(
        m.arrayOf(m.objectProperty(m.numericLiteral(), m.functionExpression()))
      )
    )
  );

  const matcher = m.callExpression(
    m.functionExpression(
      undefined,
      undefined,
      m.blockStatement(
        m.anyList<t.Statement>(
          m.zeroOrMore(),
          m.functionDeclaration(),
          m.zeroOrMore(),
          m.containerOf(
            // E.g. __webpack_require__.s = 2
            m.assignmentExpression(
              '=',
              constMemberExpression(m.identifier(), 's'),
              entryIdMatcher
            )
          )
        )
      )
    ),
    [moduleFunctionsMatcher]
  );

  traverse(ast, {
    CallExpression(path) {
      if (matcher.match(path.node)) {
        path.stop();

        const argumentPath = path.get('arguments')[0];

        const moduleWrappers = argumentPath.isArrayExpression()
          ? (argumentPath.get('elements') as NodePath<t.Node | null>[])
          : (argumentPath.get('properties') as NodePath<t.Node>[]);

        moduleWrappers.forEach((moduleWrapper, id) => {
          if (t.isObjectProperty(moduleWrapper.node)) {
            id = (moduleWrapper.node.key as t.NumericLiteral).value;
            moduleWrapper = moduleWrapper.get('value') as NodePath<t.Node>;
          }

          if (moduleWrapper.isFunctionExpression()) {
            renameParameters(moduleWrapper, ['module', 'exports', 'require']);
            const file = t.file(t.program(moduleWrapper.node.body.body));
            const module = new Module(
              id,
              file,
              id === entryIdMatcher.current?.value
            );

            modules.set(id, module);
          }
        });
      }
    },
    noScope: true,
  });

  if (modules.size > 0 && entryIdMatcher.current) {
    return new Bundle('webpack', entryIdMatcher.current.value, modules);
  }
}
