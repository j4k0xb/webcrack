import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { constKey } from '../../utils/matcher';
import { renameParameters } from '../../utils/rename';
import { Bundle } from '../bundle';
import { Module } from '../module';

export function extract(ast: t.Node): Bundle | undefined {
  const modules = new Map<number, Module>();

  const files = m.capture(
    m.arrayOf(
      m.objectProperty(
        m.numericLiteral(),
        m.arrayExpression([
          // module function wrapper
          m.functionExpression(),
          // dependencies: { './add': 1, 'lib': 3 }
          m.objectExpression(
            m.arrayOf(m.objectProperty(constKey(), m.numericLiteral()))
          ),
        ])
      )
    )
  );
  const cache = m.objectExpression();
  const entryId = m.capture(m.numericLiteral());

  const matcher = m.callExpression(
    m.functionExpression(undefined, [
      m.identifier(),
      m.identifier(),
      m.identifier(),
    ]),
    [m.objectExpression(files), cache, m.arrayExpression([entryId])]
  );
  traverse(ast, {
    CallExpression(path) {
      if (!matcher.match(path.node)) return;

      const modulesPath = path.get(
        files.currentKeys!.join('.')
      ) as NodePath<t.ObjectProperty>[];

      for (const moduleWrapper of modulesPath) {
        const id = (moduleWrapper.node.key as t.NumericLiteral).value;
        const fn = moduleWrapper.get(
          'value.elements.0'
        ) as NodePath<t.FunctionExpression>;

        // TODO: handle dependencies
        const dependencies = moduleWrapper.get(
          'value.elements.1'
        ) as NodePath<t.ObjectExpression>;

        renameParameters(fn, ['require', 'module', 'exports']);
        const file = t.file(t.program(fn.node.body.body));
        const module = new Module(id, file, id === entryId.current!.value);
        modules.set(id, module);
      }
    },
    noScope: true,
  });

  if (modules.size > 0) {
    return new Bundle('browserify', entryId.current!.value, modules);
  }
  return;
}
