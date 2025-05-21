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

test('should not rename exported component starting with lowercase', async () => {
  const input = `
    import React from 'react';
    export function myComponent() {
      return React.createElement("div", null, "Hello");
    }
    const usage = React.createElement(myComponent);
  `;
  // Note: webcrack enables jsx transform by default if react is imported.
  const result = await webcrack(input);
  expect(result.code).toContain('export function myComponent()');
  // The usage of myComponent results in <myComponent />
  // The component itself returns <div>Hello</div>
  expect(result.code).toMatchInlineSnapshot(`
    "import React from 'react';
    export function myComponent() {
      return <div>Hello</div>;
    }
    const usage = <myComponent />;"
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
