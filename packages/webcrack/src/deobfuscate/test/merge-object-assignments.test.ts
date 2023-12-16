import { test } from 'vitest';
import { testTransform } from '../../../test';
import mergeObjectAssignments from '../merge-object-assignments';

const expectJS = testTransform(mergeObjectAssignments);

test('inline properties without inlining object', () =>
  expectJS(`
    const obj = {};
    obj.foo = foo;
    obj.bar = 1;
    foo++;
    return obj;
  `).toMatchInlineSnapshot(`
    const obj = {
      foo: foo,
      bar: 1
    };
    foo++;
    return obj;
  `));

test('inline properties and object', () =>
  expectJS(`
    const obj = {};
    obj.foo = 'foo';
    return obj;
  `).toMatchInlineSnapshot(`
    return {
      foo: 'foo'
    };
  `));

test('computed properties', () =>
  expectJS(`
    const obj = {};
    obj["a b c"] = 1;
    obj[1] = 2;
    return obj;
  `).toMatchInlineSnapshot(`
    return {
      "a b c": 1,
      1: 2
    };
  `));

test('ignore circular reference', () =>
  expectJS(`
    const obj = {};
    obj.foo = obj;
  `).toMatchInlineSnapshot(`
    const obj = {};
    obj.foo = obj;
  `));

test('ignore call with possible circular reference', () =>
  expectJS(`
    const obj = {};
    obj.foo = fn();
  `).toMatchInlineSnapshot(`
    const obj = {};
    obj.foo = fn();
  `));
