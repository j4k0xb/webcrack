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

test('do not inline object into function', () =>
  expectJS(`
    const obj = {};
    obj.foo = 1;
    function f() {
      return obj;
    }
  `).toMatchInlineSnapshot(`
    const obj = {
      foo: 1
    };
    function f() {
      return obj;
    }
  `));

test('do not inline object into arrow function', () =>
  expectJS(`
    const obj = {};
    obj.foo = 1;
    const f = () => obj;
  `).toMatchInlineSnapshot(`
    const obj = {
      foo: 1
    };
    const f = () => obj;
  `));

test('do not inline object into method', () =>
  expectJS(`
    const obj = {};
    obj.foo = 1;
    const obj2 = { f() { return obj; } };
  `).toMatchInlineSnapshot(`
    const obj = {
      foo: 1
    };
    const obj2 = {
      f() {
        return obj;
      }
    };
  `));

test('do not inline object into class', () =>
  expectJS(`
    const obj = {};
    obj.foo = 1;
    class C {
      f = obj;
    }
  `).toMatchInlineSnapshot(`
    const obj = {
      foo: 1
    };
    class C {
      f = obj;
    }
  `));

test('do not inline object into while-loop', () =>
  expectJS(`
    const obj = {};
    obj.foo = 1;
    while (i < 2) {
      arr.push(obj);
    }
  `).toMatchInlineSnapshot(`
    const obj = {
      foo: 1
    };
    while (i < 2) {
      arr.push(obj);
    }
  `));

test('do not inline object into do-while-loop', () =>
  expectJS(`
    const obj = {};
    obj.foo = 1;
    do {
      arr.push(obj);
    } while (i < 2);
  `).toMatchInlineSnapshot(`
    const obj = {
      foo: 1
    };
    do {
      arr.push(obj);
    } while (i < 2);
  `));

test('do not inline object into for-loop', () =>
  expectJS(`
    const obj = {};
    obj.foo = 1;
    for (let i = 0; i < 2; i++) {
      arr.push(obj);
    }
  `).toMatchInlineSnapshot(`
    const obj = {
      foo: 1
    };
    for (let i = 0; i < 2; i++) {
      arr.push(obj);
    }
  `));

test('do not inline object into for-of-loop', () =>
  expectJS(`
    const obj = {};
    obj.foo = 1;
    for (const item of items) {
      arr.push(obj);
    }
  `).toMatchInlineSnapshot(`
    const obj = {
      foo: 1
    };
    for (const item of items) {
      arr.push(obj);
    }
  `));

test('do not inline object into for-in-loop', () =>
  expectJS(`
    const obj = {};
    obj.foo = 1;
    for (const key in [1, 2]) {
      arr.push(obj);
    }
  `).toMatchInlineSnapshot(`
    const obj = {
      foo: 1
    };
    for (const key in [1, 2]) {
      arr.push(obj);
    }
  `));
