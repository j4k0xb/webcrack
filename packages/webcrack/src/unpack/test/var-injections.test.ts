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

test('nested var injections', () =>
  expectJS(`
    (function (m, n) {
      (function (o) {
        console.log(m, n, o);
      }.call(this, __webpack_require__(3)));
    }.call(this, __webpack_require__(1), __webpack_require__(2)));
  `).toMatchInlineSnapshot(`
    var m = __webpack_require__(1);
    var n = __webpack_require__(2);
    var o = __webpack_require__(3);
    console.log(m, n, o);
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
