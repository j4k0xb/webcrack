import { test } from "vitest";
import { testTransform } from ".";
import { sequence } from "../src/transforms";

const expectJS = testTransform(sequence);

test("to statements", () =>
  expectJS(`
    if (a) b(), c();
  `).toMatchInlineSnapshot(`
    if (a) {
      b();
      c();
    }
  `));

test("rearrange from return", () =>
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

test("return void", () =>
  expectJS(`
    return void (a(), b());
  `).toMatchInlineSnapshot(`
    a();
    b();
    return;
  `));

test("rearrange from if", () =>
  expectJS(`
    if (a(), b()) c();
  `).toMatchInlineSnapshot(`
    a();
    if (b()) c();
  `));

test("rearrange from switch", () =>
  expectJS(`
    switch (a(), b()) {}
  `).toMatchInlineSnapshot(`
    a();
    switch (b()) {}
  `));

test("throw", () =>
  expectJS(`
    throw a(), b();
  `).toMatchInlineSnapshot(`
    a();
    throw b();
  `));

test("rearrange from for-in", () =>
  expectJS(`
    for (let key in a = 1, object) {}
  `).toMatchInlineSnapshot(`
    a = 1;
    for (let key in object) {}
  `));

test("rearrange from for loop init", () =>
  expectJS(`
    for((a(), b());;);
  `).toMatchInlineSnapshot(`
    a();
    b();
    for (;;);
  `));

test("rearrange from for loop update", () =>
  expectJS(`
    for(; i < 10; a(), b(), i++);
  `).toMatchInlineSnapshot(`
    for (; i < 10; i++) {
      a();
      b();
    }
  `));

test("rearrange variable declarator", () =>
  expectJS(`
   var t = (o = null, o);
  `).toMatchInlineSnapshot(`
    o = null;
    var t = o;
  `));

test("dont rearrange variable declarator in for loop", () =>
  expectJS(`
    for(let a = (b, c);;) {}
  `).toMatchInlineSnapshot(`
    b;
    for (let a = c;;) {}
  `));
