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

test('ignore when the function is in a for loop', () =>
  expectJS('for (var a = function() {}; false;) {}').toMatchInlineSnapshot(`
    for (var a = function () {}; false;) {}
  `));
