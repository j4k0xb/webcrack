import { test } from 'vitest';
import { testTransform } from '../../../test';
import letToConst from '../transforms/let-to-const';

const expectJS = testTransform(letToConst);

test('let to const', () =>
  expectJS('!function() {let a = 10; console.log(a)}()').toMatchInlineSnapshot(
    `
    !function () {
      const a = 10;
      console.log(a);
    }();
  `,
  ));

test('failed let to const', () =>
  expectJS('!function() {let a = 10; console.log(a); a = 5}()')
    .toMatchInlineSnapshot(`
      !function () {
        let a = 10;
        console.log(a);
        a = 5;
      }();
    `));

test('dont touch globals', () =>
  expectJS('let a = 10; console.log(a)').toMatchInlineSnapshot(`
    let a = 10;
    console.log(a);
  `));
