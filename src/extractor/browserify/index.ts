import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { getPropName } from '../../utils/ast';
import { constKey } from '../../utils/matcher';
import { resolveDependencyTree } from '../../utils/path';
import { renameParameters } from '../../utils/rename';
import { BrowserifyBundle } from './bundle';
import { BrowserifyModule } from './module';

export function extract(ast: t.Node): BrowserifyBundle | undefined {
  const modules = new Map<number, BrowserifyModule>();

  const files = m.capture(
    m.arrayOf(
      m.objectProperty(
        m.numericLiteral(),
        m.arrayExpression([
          // function(require, module, exports) {...}
          m.functionExpression(),
          // dependencies: { './add': 1, 'lib': 3 }
          m.objectExpression(
            m.arrayOf(m.objectProperty(constKey(), m.numericLiteral()))
          ),
        ])
      )
    )
  );
  const entryId = m.capture(m.numericLiteral());

  // (function (files, cache, entryIds) {...})(...)
  const matcher = m.callExpression(
    m.functionExpression(undefined, [
      m.identifier(),
      m.identifier(),
      m.identifier(),
    ]),
    [
      m.objectExpression(files),
      m.objectExpression(),
      m.arrayExpression([entryId]),
    ]
  );

  traverse(ast, {
    CallExpression(path) {
      if (!matcher.match(path.node)) return;

      const modulesPath = path.get(
        files.currentKeys!.join('.')
      ) as NodePath<t.ObjectProperty>[];

      const dependencyTree: Record<number, Record<number, string>> = {};

      for (const moduleWrapper of modulesPath) {
        const id = (moduleWrapper.node.key as t.NumericLiteral).value;
        const fn = moduleWrapper.get(
          'value.elements.0'
        ) as NodePath<t.FunctionExpression>;

        const dependencies: Record<number, string> = (dependencyTree[id] = {});
        const dependencyProperties = (
          moduleWrapper.get('value.elements.1') as NodePath<t.ObjectExpression>
        ).node.properties as t.ObjectProperty[];

        for (const dependency of dependencyProperties) {
          const filePath = getPropName(dependency.key)!;
          const id = (dependency.value as t.NumericLiteral).value;
          dependencies[id] = filePath;
        }

        renameParameters(fn, ['require', 'module', 'exports']);
        const file = t.file(t.program(fn.node.body.body));
        const module = new BrowserifyModule(
          id,
          file,
          id === entryId.current!.value,
          dependencies
        );
        modules.set(id, module);
      }

      const resolvedPaths = resolveDependencyTree(
        dependencyTree,
        entryId.current!.value
      );

      for (const module of modules.values()) {
        module.path = resolvedPaths[module.id];
      }
    },
    noScope: true,
  });

  if (modules.size > 0) {
    return new BrowserifyBundle(entryId.current!.value, modules);
  }
}
