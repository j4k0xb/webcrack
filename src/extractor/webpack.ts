import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Bundle } from './index';
import { Module } from './module';

export function extract(ast: t.Node): Bundle | undefined {
  const modules = new Map<number, Module>();

  traverse(ast, {
    CallExpression(path) {
      if (matcher.match(path.node)) {
        path.stop();

        const argumentPath = path.get(
          'arguments'
        )[0] as NodePath<t.ArrayExpression>;

        argumentPath.get('elements').forEach((moduleWrapper, id) => {
          if (moduleWrapper.isFunctionExpression()) {
            renameParams(moduleWrapper);

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
  });

  if (modules.size > 0 && entryIdMatcher.current) {
    return new Bundle('webpack', entryIdMatcher.current.value, modules);
  }
}

/**
 * `function (e, t, i) {...}` -> `function (module, exports, require) {...}`
 */
function renameParams(moduleWrapper: NodePath<t.FunctionExpression>) {
  const FACTORY_PARAM_NAMES = ['module', 'exports', 'require'];

  // Rename existing bindings with this name so there's no risk of conflicts
  moduleWrapper.traverse({
    Identifier(path) {
      if (FACTORY_PARAM_NAMES.includes(path.node.name)) {
        path.scope.rename(path.node.name);
      }
    },
  });

  moduleWrapper.node.params.forEach((param, index) => {
    moduleWrapper.scope.rename(
      (param as t.Identifier).name,
      FACTORY_PARAM_NAMES[index]
    );
  });
}

const entryIdMatcher = m.capture(m.numericLiteral());
const moduleFunctionsMatcher = m.capture(
  m.arrayExpression(m.anyList(m.zeroOrMore(), m.functionExpression()))
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
            m.memberExpression(m.anything(), m.identifier('s')),
            entryIdMatcher
          )
        )
      )
    )
  ),
  [moduleFunctionsMatcher]
);
