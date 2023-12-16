import { test } from 'vitest';
import { testTransform } from '../../../test';
import { unminifyBooleans } from '../transforms';

const expectJS = testTransform(unminifyBooleans);

test('true', () => {
  expectJS('!0').toMatchInlineSnapshot('true;');
  expectJS('!!1').toMatchInlineSnapshot('true;');
  expectJS('!![]').toMatchInlineSnapshot('true;');
});

test('false', () => {
  expectJS('!1').toMatchInlineSnapshot('false;');
  expectJS('![]').toMatchInlineSnapshot('false;');
});
