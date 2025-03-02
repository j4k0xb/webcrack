import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Bundle } from '..';
import type { Transform } from '../../ast-utils';
import { anySubList, renameParameters } from '../../ast-utils';
import { WebpackBundle } from './bundle';
import {
  findAssignedEntryId,
  getModuleFunctions,
  modulesContainerMatcher,
  webpackRequireFunctionMatcher,
} from './common-matchers';
import { WebpackModule } from './module';

// TODO: the entry module can be at the bottom in an iife

/**
 * Format:
 * ```js
 * (function () {
 *   var __webpack_modules__ = { ... };
 *   function __webpack_require__(moduleId) { ... }
 * })();
 * ```
 */
export default {
  name: 'unpack-webpack-5',
  tags: ['unsafe'],
  scope: true,
  visitor(options = { bundle: undefined }) {
    const { webpackRequire, containerId } = webpackRequireFunctionMatcher();
    const container = modulesContainerMatcher();

    const matcher = m.blockStatement(
      anySubList<t.Statement>(
        // Example: var __webpack_modules__ = { ... };
        m.variableDeclaration(undefined, [
          m.variableDeclarator(containerId, container),
        ]),
        webpackRequire,
      ),
    );

    return {
      BlockStatement(path) {
        if (!matcher.match(path.node)) return;
        path.stop();

        const webpackRequireBinding = path.scope.getBinding(
          webpackRequire.current!.id!.name,
        )!;

        const entryId = findAssignedEntryId(webpackRequireBinding);
        const containerPath = path.get(
          container.currentKeys!.join('.'),
        ) as NodePath<t.ArrayExpression | t.ObjectExpression>;

        const modules = new Map<string, WebpackModule>();

        for (const [id, func] of getModuleFunctions(containerPath)) {
          renameParameters(func, ['module', 'exports', 'require']);
          const isEntry = id === entryId;
          const file = t.file(t.program(func.node.body.body));
          modules.set(id, new WebpackModule(id, file, isEntry));
        }

        options.bundle = new WebpackBundle(entryId ?? '', modules);
      },
    };
  },
} satisfies Transform<{ bundle: Bundle | undefined }>;
