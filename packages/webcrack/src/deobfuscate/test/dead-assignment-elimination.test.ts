import { test } from 'vitest';
import { testTransform } from '../../../test';
import deadAssignmentElimination from '../dead-assignment-elimination';

const expectJS = testTransform(deadAssignmentElimination);

/*
suppose: function named F that takes an input parameter, and logs it as an array of characters.

suppose: hoisted 'var' variable created,
set to a value ('y' in this case),
called to a Function and never reassigned.

This is eligible for transformation due to it being used as a constant,
and not being mutated afterwards.
*/
test('inline hoisted var assigned constant before use', () =>
  expectJS(`
    const Func = (x) => {
      console.log(x.split(''));
    };

    var x;

    x = 'y';
    Func(x);
  `).toMatchInlineSnapshot(`
    const Func = x => {
      console.log(x.split(''));
    };
    Func('y');
  `));

test('remove constant allocation when value is never reassigned', () =>
  expectJS(`
    const Func = (x) => {
      console.log(x.split(''));
    };

    var x;

    x = 'y';
    Func(x);
  `).toMatchInlineSnapshot(`
    const Func = x => {
      console.log(x.split(''));
    };
    Func('y');
  `));

/*
suppose: hoisted 'var' variable created,
a function is called on it before it could be initialized,
and then the variable is set to another value.

This is ineligible for transformation due to it being used before it was mutated.
*/
test('keep variable when used before initialization', () =>
  expectJS(`
    const Func = (x) => {
      console.log(x.split(''));
    };

    var y;

    Func(y);
    y = 'z';
  `).toMatchInlineSnapshot(`
    const Func = x => {
      console.log(x.split(''));
    };
    var y;
    Func(y);
    y = 'z';
  `));

/*
suppose: hoisted 'var' variable created,
z is set to a dynamic value (meaning, not a number, string, or any other type of constant.)
and then called on Func with its value.

This is ineligible for transformation due to it not being a constant.
*/
test('keep variable when assigned dynamic value', () =>
  expectJS(`
    const Func = (x) => {
      console.log(x.split(''));
    };

    var z;

    z = "fork".split('').join('z');

    Func(z);
  `).toMatchInlineSnapshot(`
    const Func = x => {
      console.log(x.split(''));
    };
    var z;
    z = "fork".split('').join('z');
    Func(z);
  `));

test('keep variable when reassigned after constant assignment', () =>
  expectJS(`
    const Func = (x) => {
      console.log(x.split(''));
    };

    var q;

    q = "y";
    Func(q);
    q = "z";
    Func(q);
  `).toMatchInlineSnapshot(`
    const Func = x => {
      console.log(x.split(''));
    };
    var q;
    q = "y";
    Func(q);
    q = "z";
    Func(q);
  `));

test('keep hoisted assignment before declaration', () =>
  expectJS(`
    q = "y";
    var q;
    console.log(q);
    q = "z";
    console.log(q);
  `).toMatchInlineSnapshot(`
    q = "y";
    var q;
    console.log(q);
    q = "z";
    console.log(q);
  `));
