import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Bundle } from '..';
import type { Transform } from '../../ast-utils';
import { renameFast } from '../../ast-utils';
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
        m.blockStatement(
          m.anyList<t.Statement>(
            m.zeroOrMore(),
            webpackRequire,
            m.zeroOrMore(),
          ),
        ),
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
        renameFast(webpackRequireBinding, '__webpack_require__');

        const entryId =
          findAssignedEntryId(webpackRequireBinding) ||
          findRequiredEntryId(webpackRequireBinding);
        const containerPath = path.get(
          container.currentKeys!.join('.'),
        ) as NodePath<t.ArrayExpression | t.ObjectExpression>;

        const modules = new Map<string, WebpackModule>();

        for (const [id, func] of getModuleFunctions(containerPath)) {
          const isEntry = id === entryId;
          modules.set(id, new WebpackModule(id, func, isEntry));
        }

        options.bundle = new WebpackBundle(entryId ?? '', modules);
      },
    };
  },
} satisfies Transform<{ bundle: Bundle | undefined }>;
