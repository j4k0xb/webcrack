import { test } from 'vitest';
import { testTransform } from '../../../test';
import mergeStrings from '../transforms/merge-strings';

const expectJS = testTransform(mergeStrings);

test('only strings', () =>
  expectJS(`
    "a" + "b" + "c";
  `).toMatchInlineSnapshot('"abc";'));

test('with variables', () =>
  expectJS(`
    "a" + "b" + xyz + "c" + "d";
  `).toMatchInlineSnapshot('"ab" + xyz + "cd";'));
