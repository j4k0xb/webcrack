import { test } from 'vitest';
import { testTransform } from '../../../test';
import { mergeElseIf } from '../transforms';

const expectJS = testTransform(mergeElseIf);

test('merge', () =>
  expectJS(`
    if (x) {
    } else {
      if (y) {}
    }`).toMatchInlineSnapshot('if (x) {} else if (y) {}'));

test('ignore when it contains other statements', () =>
  expectJS(`
    if (x) {
    } else {
      if (y) {}
      z();
    }`).toMatchInlineSnapshot(`
      if (x) {} else {
        if (y) {}
        z();
      }
    `));
