import { test } from 'vitest';
import { testTransform } from '../../../test';
import logicalAssignments from '../transforms/logical-assignments';

const expectJS = testTransform(logicalAssignments);

test('identifier or-assignment (Babel/TS/SWC/esbuild)', () =>
  expectJS('x || (x = y)').toMatchInlineSnapshot(`x ||= y;`));

test('identifier and-assignment (Babel/TS/SWC/esbuild)', () =>
  expectJS('x && (x = y)').toMatchInlineSnapshot(`x &&= y;`));

test('member expression or-assignment (Babel/TS/SWC/esbuild)', () =>
  expectJS(`
    var _x$y;
    (_x$y = x.y()).z || (_x$y.z = b);
  `).toMatchInlineSnapshot(`x.y().z ||= b;`));

test('computed member expression or-assignment (Babel/TS/SWC/esbuild)', () =>
  expectJS(`
    var _x$y;
    (_x$y = x.y())[z] || (_x$y[z] = b);
  `).toMatchInlineSnapshot(`x.y()[z] ||= b;`));

test('member expression or-assignment (TS/esbuild)', () =>
  expectJS('x.y || (x.y = z)').toMatchInlineSnapshot(`x.y ||= z;`));

test('computed member expression or-assignment (Babel/TS/SWC)', () =>
  expectJS(`
    var _x, _y;
    (_x = x)[_y = y] || (_x[_y] = z);
  `).toMatchInlineSnapshot(`x[y] ||= z;`));

test('computed member expression or-assignment (TS/esbuild)', () =>
  expectJS(`
    x[y] || (x[y] = z);
  `).toMatchInlineSnapshot(`x[y] ||= z;`));

test('computed member expression or-assignment (Babel)', () =>
  expectJS(`
    var _y;
    x[_y = y] || (x[_y] = z);
  `).toMatchInlineSnapshot(`x[y] ||= z;`));
