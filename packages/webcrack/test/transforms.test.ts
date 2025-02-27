import { expect, test } from 'vitest';
import { webcrack } from '../src';

test('decode bookmarklet', async () => {
  const code = `javascript:(function()%7Balert('hello%20world')%3B%7D)()%3B`;
  const result = await webcrack(code);
  expect(result.code).toMatchInlineSnapshot(`
    "(function () {
      alert("hello world");
    })();"
  `);
});

test('decode malformed bookmarklet', async () => {
  const code = `javascript:(function()%7Breturn%20v%F%3B%7D)()`;
  const result = await webcrack(code);
  expect(result.code).toMatchInlineSnapshot(`
    "(function () {
      return v % F;
    })();"
  `);
});

test('parser error recovery', async () => {
  const code = 'foo()+=1; 1+1;';
  const result = await webcrack(code);
  expect(result.code).toMatchInlineSnapshot(`
    "foo() += 1;
    2;"
  `);
});
