import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../../transforms';
import { constKey, constMemberExpression } from '../../utils/matcher';
import { renameParameters } from '../../utils/rename';
import { Bundle } from '../bundle';
import { WebpackBundle } from './bundle';
import { WebpackModule } from './module';

export const unpackWebpack = {
  name: 'unpack-webpack',
  tags: ['unsafe'],
  visitor(options) {
    const modules = new Map<number, WebpackModule>();

    const entryIdMatcher = m.capture(m.numericLiteral());
    const moduleFunctionsMatcher = m.capture(
      m.or(
        // E.g. [,,function (e, t, i) {...}, ...], index is the module ID
        m.arrayExpression(
          m.arrayOf(
            m.or(m.functionExpression(), m.arrowFunctionExpression(), null)
          )
        ),
        // E.g. {0: function (e, t, i) {...}, ...}, key is the module ID
        m.objectExpression(
          m.arrayOf(
            m.or(
              m.objectProperty(
                m.numericLiteral(),
                m.or(m.functionExpression(), m.arrowFunctionExpression())
              ),
              // __webpack_public_path__ (c: "")
              m.objectProperty(constKey('c'), m.stringLiteral())
            )
          )
        )
      )
    );

    const webpack4Matcher = m.callExpression(
      m.functionExpression(
        undefined,
        undefined,
        m.blockStatement(
          m.anyList<t.Statement>(
            m.zeroOrMore(),
            m.functionDeclaration(),
            m.zeroOrMore(),
            m.containerOf(
              m.or(
                // E.g. __webpack_require__.s = 2
                m.assignmentExpression(
                  '=',
                  constMemberExpression(m.identifier(), 's'),
                  entryIdMatcher
                ),
                // E.g. return require(0);
                m.callExpression(m.identifier(), [entryIdMatcher])
              )
            )
          )
        )
      ),
      [moduleFunctionsMatcher]
    );

    const webpack5Matcher = m.callExpression(
      m.arrowFunctionExpression(
        undefined,
        m.blockStatement(
          m.anyList<t.Statement>(
            m.zeroOrMore(),
            m.variableDeclaration(undefined, [
              m.variableDeclarator(undefined, moduleFunctionsMatcher),
            ]),
            // var installedModules = {};
            m.variableDeclaration(),
            m.zeroOrMore(),
            // function __webpack_require__(moduleId) { ... }
            m.functionDeclaration(),
            m.zeroOrMore(),
            m.containerOf(
              // __webpack_require__.s = 2
              m.assignmentExpression(
                '=',
                constMemberExpression(m.identifier(), 's'),
                entryIdMatcher
              )
            ),
            // module.exports = entryModule
            m.expressionStatement(
              m.assignmentExpression(
                '=',
                constMemberExpression(m.identifier(), 'exports'),
                m.identifier()
              )
            )
          )
        )
      )
    );

    return {
      CallExpression(path) {
        if (
          !webpack4Matcher.match(path.node) &&
          !webpack5Matcher.match(path.node)
        )
          return;
        path.stop();

        const modulesPath = path.get(
          moduleFunctionsMatcher.currentKeys!.join('.')
        ) as NodePath;

        const moduleWrappers = modulesPath.isArrayExpression()
          ? (modulesPath.get('elements') as NodePath<t.Node | null>[])
          : (modulesPath.get('properties') as NodePath[]);

        moduleWrappers.forEach((moduleWrapper, id) => {
          if (t.isObjectProperty(moduleWrapper.node)) {
            id = (moduleWrapper.node.key as t.NumericLiteral).value;
            moduleWrapper = moduleWrapper.get('value') as NodePath;
          }

          if (
            moduleWrapper.isFunction() &&
            moduleWrapper.node.body.type === 'BlockStatement'
          ) {
            renameParameters(moduleWrapper, ['module', 'exports', 'require']);
            const file = t.file(t.program(moduleWrapper.node.body.body));

            // Remove /***/ comments between modules (in webpack development builds)
            const lastNode = file.program.body.at(-1);
            if (lastNode?.trailingComments?.[0].value === '*') {
              lastNode.trailingComments.shift();
            }

            const module = new WebpackModule(
              id,
              file,
              id === entryIdMatcher.current?.value
            );

            modules.set(id, module);
          }
        });

        if (modules.size > 0 && entryIdMatcher.current) {
          options!.bundle = new WebpackBundle(
            entryIdMatcher.current.value,
            modules
          );
        }
      },
      noScope: true,
    };
  },
} satisfies Transform<{ bundle: Bundle | undefined }>;
