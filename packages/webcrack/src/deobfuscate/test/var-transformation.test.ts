import { test } from 'vitest';
import { testTransform } from '../../../test';
import varTransformation from '../var-transformation';

const expectJS = testTransform(varTransformation);

test('declare var as function arg', () => {
  expectJS(`function f(a, b, c) {
  console.log(b)
  b = 1;
  c = 2
}`).toMatchInlineSnapshot(`
  function f(a, b, c2) {
    console.log(b);
    b = 1;
    var c = 2;
  }
`);

  expectJS(`function f(a, b) {
    a ||= 1
    b = b || 2
}`).toMatchInlineSnapshot(`
  function f(a, b) {
    a ||= 1;
    b = b || 2;
  }
`);
});
