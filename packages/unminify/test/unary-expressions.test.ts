import { test } from 'vitest';
import { testTransform } from '.';
import { unaryExpressions } from '../src/transforms';

const expectJS = testTransform(unaryExpressions);

test('void', () => expectJS('void foo();').toMatchInlineSnapshot('foo();'));

test('typeof', () => expectJS('typeof foo();').toMatchInlineSnapshot('foo();'));

test('logical not', () => expectJS('!foo();').toMatchInlineSnapshot('foo();'));

test('return void', () =>
  expectJS('return void foo();').toMatchInlineSnapshot(`
    foo();
    return;
  `));
