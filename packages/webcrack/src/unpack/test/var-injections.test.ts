import { test } from 'vitest';
import { testTransform } from '../../../test';
import varInjections from '../webpack/var-injections';

const expectJS = testTransform(varInjections);

test('replace', () =>
  expectJS(`
    (function (m, n) {
      console.log(m, n);
    }.call(this, __webpack_require__(1), __webpack_require__(2)));
  `).toMatchInlineSnapshot(`
    var m = __webpack_require__(1);
    var n = __webpack_require__(2);
    console.log(m, n);
  `));

test('ignore different number of params and args', () =>
  expectJS(`
    (function (m, n) {
      console.log(m, n);
    }.call(this, foo));
  `).toMatchInlineSnapshot(`
    (function (m, n) {
      console.log(m, n);
    }).call(this, foo);
  `));
