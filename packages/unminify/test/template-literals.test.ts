import { test } from 'vitest';
import { testTransform } from '.';
import { templateLiterals } from '../src/transforms';

const expectJS = testTransform(templateLiterals);

test('convert string with new lines', () =>
  expectJS('const a = "a\\nb\\nc";').toMatchInlineSnapshot(`
    const a = \`a
    b
    c\`;
  `));

test('ignore string without new lines', () =>
  expectJS('const a = "a";').toMatchInlineSnapshot('const a = "a";'));

test('string concat with non-literal', () =>
  expectJS('const a = "x" + y;').toMatchInlineSnapshot('const a = `x${y}`;'));

test('non-literal concat with string', () =>
  expectJS('const a = x + "y";').toMatchInlineSnapshot('const a = `${x}y`;'));

test('nested concat', () =>
  expectJS('const a = "x" + y + "z";').toMatchInlineSnapshot(
    'const a = `x${y}z`;',
  ));

test('escape dollar sign', () =>
  expectJS('const a = "a\\n${b}\\nc";').toMatchInlineSnapshot(`
    const a = \`a
    \\\${b}
    c\`;
  `));

test('escape backtick', () =>
  expectJS('const a = "a\\n`\\nc";').toMatchInlineSnapshot(`
    const a = \`a
    \\\`
    c\`;
  `));

// TODO: Needs more complex logic
test.skip('convert pre-escaped backtick', () =>
  expectJS('const a = "a\\n\\\\`\\nc";').toMatchInlineSnapshot());

test.skip('convert pre-escaped dollar sign', () =>
  expectJS('const a = "a\\n\\\\${b}\\nc";').toMatchInlineSnapshot());
