import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';
import { constKey, getPropName, iife, renameParameters } from '../../ast-utils';
import type { Bundle } from '../bundle';
import { resolveDependencyTree } from '../path';
import { BrowserifyBundle } from './bundle';
import { BrowserifyModule } from './module';

export const unpackBrowserify = {
  name: 'unpack-browserify',
  tags: ['unsafe'],
  scope: true,
  visitor(options) {
    const modules = new Map<string, BrowserifyModule>();

    const files = m.capture(
      m.arrayOf(
        m.objectProperty(
          m.or(m.numericLiteral(), m.stringLiteral(), m.identifier()),
          m.arrayExpression([
            // function(require, module, exports) {...}
            m.functionExpression(),
            // dependencies: { './add': 1, 'lib': 3 }
            m.objectExpression(
              m.arrayOf(
                m.objectProperty(
                  constKey(),
                  m.or(
                    m.numericLiteral(),
                    m.identifier('undefined'),
                    m.stringLiteral(),
                  ),
                ),
              ),
            ),
          ]),
        ),
      ),
    );
    // TODO: support multiple entry points
    const entryIdMatcher = m.capture(
      m.or(m.numericLiteral(), m.stringLiteral()),
    );

    const matcher = m.callExpression(
      m.or(
        // (function (files, cache, entryIds) {...})(...)
        m.functionExpression(undefined, [
          m.identifier(),
          m.identifier(),
          m.identifier(),
        ]),
        // (function () { function init(files, cache, entryIds) {...} return init; })()(...)
        iife(
          [],
          m.blockStatement([
            m.functionDeclaration(undefined, [
              m.identifier(),
              m.identifier(),
              m.identifier(),
            ]),
            m.returnStatement(m.identifier()),
          ]),
        ),
      ),
      [
        m.objectExpression(files),
        m.objectExpression(),
        m.arrayExpression(m.anyList(entryIdMatcher, m.zeroOrMore())),
      ],
    );

    return {
      CallExpression(path) {
        if (!matcher.match(path.node)) return;
        path.stop();

        const entryId = entryIdMatcher.current!.value.toString();

        const modulesPath = path.get(
          files.currentKeys!.join('.'),
        ) as NodePath<t.ObjectProperty>[];

        const dependencyTree: Record<string, Record<string, string>> = {};

        for (const moduleWrapper of modulesPath) {
          const id = getPropName(moduleWrapper.node.key)!;
          const fn = moduleWrapper.get(
            'value.elements.0',
          ) as NodePath<t.FunctionExpression>;

          const dependencies: Record<string, string> = (dependencyTree[id] =
            {});
          const dependencyProperties = (
            moduleWrapper.get(
              'value.elements.1',
            ) as NodePath<t.ObjectExpression>
          ).node.properties as t.ObjectProperty[];

          for (const dependency of dependencyProperties) {
            // skip external dependencies like { vscode: undefined }
            if (
              dependency.value.type !== 'NumericLiteral' &&
              dependency.value.type !== 'StringLiteral'
            )
              continue;

            const filePath = getPropName(dependency.key)!;
            const depId = dependency.value.value.toString();
            dependencies[depId] = filePath;
          }

          renameParameters(fn, ['require', 'module', 'exports']);
          const file = t.file(t.program(fn.node.body.body));
          const module = new BrowserifyModule(
            id,
            file,
            id === entryId,
            dependencies,
          );
          modules.set(id.toString(), module);
        }

        const resolvedPaths = resolveDependencyTree(dependencyTree, entryId);

        for (const module of modules.values()) {
          if (Object.hasOwn(resolvedPaths, module.id)) {
            module.path = resolvedPaths[module.id];
          }
        }

        if (modules.size > 0) {
          options!.bundle = new BrowserifyBundle(entryId, modules);
        }
      },
    };
  },
} satisfies Transform<{ bundle: Bundle | undefined }>;
