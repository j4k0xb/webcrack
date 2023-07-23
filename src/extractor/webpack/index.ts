import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../../transforms';
import { getPropName } from '../../utils/ast';
import { constKey, constMemberExpression } from '../../utils/matcher';
import { renameParameters } from '../../utils/rename';
import { Bundle } from '../bundle';
import { WebpackBundle } from './bundle';
import { WebpackModule } from './module';

export const unpackWebpack = {
  name: 'unpack-webpack',
  tags: ['unsafe'],
  visitor(options) {
    const modules = new Map<string, WebpackModule>();

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
                m.or(m.numericLiteral(), m.stringLiteral(), m.identifier()),
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

    // Examples: self.webpackChunk_N_E, window.webpackJsonp
    const jsonpGlobal = m.capture(
      constMemberExpression(
        m.identifier(m.or('self', 'window')),
        m.matcher(s => (s as string).startsWith('webpack'))
      )
    );
    // (window.webpackJsonp = window.webpackJsonp || []).push([[0], {...}])
    const jsonpMatcher = m.callExpression(
      constMemberExpression(
        m.assignmentExpression(
          '=',
          jsonpGlobal,
          m.logicalExpression('||', jsonpGlobal, m.arrayExpression([]))
        ),
        'push'
      ),
      [
        m.arrayExpression(
          m.anyList(
            m.arrayExpression([m.numericLiteral()]), // chunkId
            moduleFunctionsMatcher,
            m.slice({ max: 1 }) // optional argument like [[188, 17, 16, 18]]
          )
        ),
      ]
    );

    return {
      CallExpression(path) {
        if (
          !webpack4Matcher.match(path.node) &&
          !webpack5Matcher.match(path.node) &&
          !jsonpMatcher.match(path.node)
        )
          return;
        path.stop();

        const modulesPath = path.get(
          moduleFunctionsMatcher.currentKeys!.join('.')
        ) as NodePath;

        const moduleWrappers = modulesPath.isArrayExpression()
          ? (modulesPath.get('elements') as NodePath<t.Node | null>[])
          : (modulesPath.get('properties') as NodePath[]);

        moduleWrappers.forEach((moduleWrapper, index) => {
          let moduleId = index.toString();
          if (t.isObjectProperty(moduleWrapper.node)) {
            moduleId = getPropName(moduleWrapper.node.key)!;
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
            if (
              lastNode?.trailingComments?.length === 1 &&
              lastNode.trailingComments[0].value === '*'
            ) {
              lastNode.trailingComments = null;
            }

            const module = new WebpackModule(
              moduleId,
              file,
              moduleId === entryIdMatcher.current?.value.toString()
            );

            modules.set(moduleId, module);
          }
        });

        if (modules.size > 0) {
          const entryId = entryIdMatcher.current?.value.toString() ?? '';
          options!.bundle = new WebpackBundle(entryId, modules);
        }
      },
      noScope: true,
    };
  },
} satisfies Transform<{ bundle: Bundle | undefined }>;
