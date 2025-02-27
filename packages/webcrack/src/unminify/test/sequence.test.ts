import { test } from 'vitest';
import { testTransform } from '../../../test';
import sequence from '../transforms/sequence';

const expectJS = testTransform(sequence);

test('to statements', () =>
  expectJS(`
    if (a) b(), c();
  `).toMatchInlineSnapshot(`
    if (a) {
      b();
      c();
    }
  `));

test('rearrange from return', () =>
  expectJS(`
    function f() {
      return a(), b(), c();
    }
  `).toMatchInlineSnapshot(`
    function f() {
      a();
      b();
      return c();
    }
  `));

test('rearrange from if', () =>
  expectJS(`
    if (a(), b()) c();
  `).toMatchInlineSnapshot(`
    a();
    if (b()) c();
  `));

test('rearrange from switch', () =>
  expectJS(`
    switch (a(), b()) {}
  `).toMatchInlineSnapshot(`
    a();
    switch (b()) {}
  `));

test('throw', () =>
  expectJS(`
    throw a(), b();
  `).toMatchInlineSnapshot(`
    a();
    throw b();
  `));

test('rearrange from for-in', () =>
  expectJS(`
    for (let key in a = 1, object) {}
  `).toMatchInlineSnapshot(`
    a = 1;
    for (let key in object) {}
  `));

test('rearrange from for-of', () =>
  expectJS(`
    for (let value of (a = 1, array)) {}
  `).toMatchInlineSnapshot(`
    a = 1;
    for (let value of array) {}
  `));

test('rearrange from for loop init', () => {
  expectJS(`
    for((a(), b());;);
  `).toMatchInlineSnapshot(`
    a();
    b();
    for (;;);
  `);

  expectJS(`
    if (1) for ((a(), b());;) {}
  `).toMatchInlineSnapshot(`
    if (1) {
      a();
      b();
      for (;;) {}
    }
  `);
});

test('rearrange from for loop update', () =>
  expectJS(`
    for(; i < 10; a(), b(), i++);
  `).toMatchInlineSnapshot(`
    for (; i < 10; i++) {
      a();
      b();
    }
  `));

test('dont rearrange from while', () =>
  expectJS(`
    while (a(), b()) c();
  `).toMatchInlineSnapshot(`
    while (a(), b()) c();
  `));

test('dont rearrange from do-while', () =>
  expectJS(`
    do {} while (a(), b());
  `).toMatchInlineSnapshot(`
    do {} while (a(), b());
  `));

test('rearrange variable declarator', () => {
  expectJS(`
    var a = (b(), c());
  `).toMatchInlineSnapshot(`
    b();
    var a = c();
  `);

  expectJS(`
    for (let a = (b(), c());;) {}
  `).toMatchInlineSnapshot(`
    b();
    for (let a = c();;) {}
  `);
});

test('rearrange assignment', () => {
  expectJS(`
    a = (b(), c());
  `).toMatchInlineSnapshot(`
    b();
    a = c();
  `);

  expectJS(`
    a.x = (b(), c());
  `).toMatchInlineSnapshot(`
    b();
    a.x = c();
  `);

  expectJS(`
    a[1] = (b(), c());
  `).toMatchInlineSnapshot(`
    b();
    a[1] = c();
  `);

  expectJS(`
    a[x()] = (b(), c());
  `).toMatchInlineSnapshot(`a[x()] = (b(), c());`);

  expectJS(`
    console.log(a = (b(), c()));
  `).toMatchInlineSnapshot(`
    console.log((b(), a = c()));
  `);

  expectJS(`
    while (a = (b(), c()));
  `).toMatchInlineSnapshot(`
    while (b(), a = c());
  `);

  expectJS(`
    a ||= (b(), c());
    a &&= (b(), c());
    a ??= (b(), c());
  `).toMatchInlineSnapshot(`
    a ||= (b(), c());
    a &&= (b(), c());
    a ??= (b(), c());
  `);

  expectJS(`
    for (;;) a = (b(), c());
  `).toMatchInlineSnapshot(`
    for (;;) {
      b();
      a = c();
    }
  `);
});

// appears in some obfuscator.io forks
test('simplify computed property with only literals', () =>
  expectJS(`
    Lr[("nnQB", "jcIgN")]();
  `).toMatchInlineSnapshot('Lr["jcIgN"]();'));
