import { test } from 'vitest';
import { testTransform } from '.';
import mergeObjectAssignments from '../src/var-functions';

const expectJS = testTransform(mergeObjectAssignments);

test('var to function declaration', () =>
  expectJS('var a = function() {}').toMatchInlineSnapshot(`
    function a() {}
  `));

test('var to async function declaration', () =>
  expectJS('var a = async function() {}').toMatchInlineSnapshot(`
    async function a() {}
  `));

test('ignore when the function has a name', () =>
  expectJS('var a = function b() {}').toMatchInlineSnapshot(`
    var a = function b() {};
  `));
