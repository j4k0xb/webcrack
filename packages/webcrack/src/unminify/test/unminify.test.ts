import { test } from 'vitest';
import unminify from '..';
import { testTransform } from '../../../test';

const expectJS = testTransform(unminify);

test('mixed typeof-undefined and yoda', () =>
  expectJS(`
    typeof x < "u";
    "u" > typeof x;
    typeof x > "u";
    "u" < typeof x;
  `).toMatchInlineSnapshot(`
    typeof x !== "undefined";
    typeof x !== "undefined";
    typeof x === "undefined";
    typeof x === "undefined";
  `));
