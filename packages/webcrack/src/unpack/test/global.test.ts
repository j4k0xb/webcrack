import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { expect, test } from 'vitest';
import { testWebpackModuleTransform } from '.';
import { applyTransform } from '../../ast-utils';
import global from '../webpack/runtime/global';

const expectJS = testWebpackModuleTransform(
  global,
  ({ scope }) => scope.bindings.__webpack_require__,
);

test('replace __webpack_require__.g with global', () =>
  expectJS(`
    __webpack_require__.g.setTimeout(() => {});
  `).toMatchInlineSnapshot(`global.setTimeout(() => {});`));

test('a', () => {
  const ast = parse(`
    (function(module, exports, __webpack_require__) {
      __webpack_require__.g.setTimeout(() => {});
    });
  `);
  traverse(ast, {
    FunctionExpression(path) {
      path.stop();
      const binding = path.scope.bindings.__webpack_require__;
      applyTransform(path.node, global, binding);
      expect(path.node).toMatchInlineSnapshot(`
        function (module, exports, __webpack_require__) {
          global.setTimeout(() => {});
        }
      `);
    },
  });
});
