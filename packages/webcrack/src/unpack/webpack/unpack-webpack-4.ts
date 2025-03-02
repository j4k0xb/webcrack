import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Bundle } from '..';
import type { Transform } from '../../ast-utils';
import { anySubList, renameParameters } from '../../ast-utils';
import { WebpackBundle } from './bundle';
import {
  findAssignedEntryId,
  findRequiredEntryId,
  getModuleFunctions,
  modulesContainerMatcher,
  webpackRequireFunctionMatcher,
} from './common-matchers';
import { WebpackModule } from './module';

/**
 * Format:
 * ```js
 * (function (__webpack_modules__) {
 *   function __webpack_require__(moduleId) { ... }
 * })([...]);
 * ```
 */
export default {
  name: 'unpack-webpack-4',
  tags: ['unsafe'],
  scope: true,
  visitor(options = { bundle: undefined }) {
    const { webpackRequire, containerId } = webpackRequireFunctionMatcher();
    const container = modulesContainerMatcher();

    const matcher = m.callExpression(
      m.functionExpression(
        null,
        [containerId],
        m.blockStatement(anySubList(webpackRequire)),
      ),
      [container],
    );

    return {
      CallExpression(path) {
        if (!matcher.match(path.node)) return;
        path.stop();

        const webpackRequireBinding = path
          .get('callee')
          .scope.getBinding(webpackRequire.current!.id!.name)!;

        const entryId =
          findAssignedEntryId(webpackRequireBinding) ||
          findRequiredEntryId(webpackRequireBinding);
        const containerPath = path.get(
          container.currentKeys!.join('.'),
        ) as NodePath<t.ArrayExpression | t.ObjectExpression>;

        const modules = new Map<string, WebpackModule>();

        for (const [id, func] of getModuleFunctions(containerPath)) {
          renameParameters(func, ['module', 'exports', 'require']);
          // Remove /***/ comments between modules (in webpack development builds)
          const isEntry = id === entryId;
          const file = t.file(t.program(func.node.body.body));
          const lastNode = file.program.body.at(-1);
          if (
            lastNode?.trailingComments?.length === 1 &&
            lastNode.trailingComments[0].value === '*'
          ) {
            lastNode.trailingComments = null;
          }
          modules.set(id, new WebpackModule(id, file, isEntry));
        }

        options.bundle = new WebpackBundle(entryId ?? '', modules);
      },
    };
  },
} satisfies Transform<{ bundle: Bundle | undefined }>;
