import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Bundle } from '..';
import type { Transform } from '../../ast-utils';
import { renameFast } from '../../ast-utils';
import { WebpackBundle } from './bundle';
import {
  findAssignedEntryId,
  getModuleFunctions,
  modulesContainerMatcher,
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
    // Example: __webpack_modules__
    const modulesId = m.capture(m.identifier());
    const webpackRequire = m.capture(
      m.functionDeclaration(
        m.identifier(), // __webpack_require__
        [m.identifier()], // moduleId
        m.blockStatement(
          m.anyList(
            m.zeroOrMore(),
            // Example: __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
            m.expressionStatement(
              m.callExpression(
                m.memberExpression(
                  m.fromCapture(modulesId),
                  m.identifier(),
                  true,
                ),
              ),
            ),
            m.zeroOrMore(),
          ),
        ),
      ),
    );
    const container = modulesContainerMatcher();

    const matcher = m.blockStatement(
      m.anyList(
        m.zeroOrMore(),
        // Example: var __webpack_modules__ = { ... };
        m.variableDeclaration(undefined, [
          m.variableDeclarator(modulesId, container),
        ]),
        m.zeroOrMore(),
        webpackRequire,
        m.zeroOrMore(),
      ),
    );

    return {
      BlockStatement(path) {
        if (!matcher.match(path.node)) return;
        path.stop();

        const webpackRequireBinding = path.scope.getBinding(
          webpackRequire.current!.id!.name,
        )!;
        renameFast(webpackRequireBinding, '__webpack_require__');

        const entryId = findAssignedEntryId(webpackRequireBinding);
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
