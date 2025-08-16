import { test } from 'vitest';
import { testTransform } from '../../../test';
import voidToUndefined from '../transforms/void-to-undefined';

const expectJS = testTransform(voidToUndefined);

test('void 0', () => expectJS('void 0').toMatchInlineSnapshot('undefined;'));

test('void 1', () => expectJS('void 1').toMatchInlineSnapshot('undefined;'));

test('ignore when undefined is declared in scope', () =>
  expectJS('let undefined = 1; { void 0; }').toMatchInlineSnapshot(`
    let undefined = 1;
    {
      void 0;
    }
  `));
