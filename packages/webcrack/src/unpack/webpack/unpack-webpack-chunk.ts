import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Bundle } from '..';
import type { Transform } from '../../ast-utils';
import { constMemberExpression, renameParameters } from '../../ast-utils';
import { WebpackBundle } from './bundle';
import { getModuleFunctions, modulesContainerMatcher } from './common-matchers';
import { WebpackModule } from './module';

/**
 * Format:
 * ```js
 * (window.webpackJsonp = window.webpackJsonp || []).push([[0], {...}])
 * ```
 */
export default {
  name: 'unpack-webpack-chunk',
  tags: ['unsafe'],
  scope: true,
  visitor(options = { bundle: undefined }) {
    const container = modulesContainerMatcher();

    // Examples: self.webpackChunk_N_E, window.webpackJsonp, this.webpackJsonp
    const jsonpGlobal = m.capture(
      constMemberExpression(
        m.or(m.identifier(), m.thisExpression()),
        m.matcher((property) => property.startsWith('webpack')),
      ),
    );

    const chunkIds = m.capture(
      m.arrayOf(m.or(m.numericLiteral(), m.stringLiteral())),
    );
    const matcher = m.callExpression(
      constMemberExpression(
        m.assignmentExpression(
          '=',
          jsonpGlobal,
          m.logicalExpression(
            '||',
            m.fromCapture(jsonpGlobal),
            m.arrayExpression([]),
          ),
        ),
        'push',
      ),
      [
        m.arrayExpression(
          m.anyList(
            m.arrayExpression(chunkIds),
            container,
            // optional entry point like [["57iH",19,24,25]] or a function
            m.zeroOrMore(),
          ),
        ),
      ],
    );

    return {
      CallExpression(path) {
        if (!matcher.match(path.node)) return;
        path.stop();

        const modules = new Map<string, WebpackModule>();

        const containerPath = path.get(
          container.currentKeys!.join('.'),
        ) as NodePath<t.ArrayExpression | t.ObjectExpression>;

        for (const [id, func] of getModuleFunctions(containerPath)) {
          renameParameters(func, ['module', 'exports', 'require']);
          const isEntry = false; // FIXME: afaik after the modules there can be a function that specifies the entry point
          const file = t.file(t.program(func.node.body.body));
          modules.set(id, new WebpackModule(id, file, isEntry));
        }

        options.bundle = new WebpackBundle('', modules);
      },
    };
  },
} satisfies Transform<{ bundle: Bundle | undefined }>;
