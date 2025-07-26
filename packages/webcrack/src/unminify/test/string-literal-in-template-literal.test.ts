import { test } from 'vitest';
import { testTransform } from '../../../test';
import stringLiteralInTemplate from '../transforms/string-literal-in-template';

const expectJS = testTransform(stringLiteralInTemplate);

test('string-literal-in-template-literal', () => {
  expectJS(
    `
    const a = \`Hello \${'World'}!\`;
  `,
  ).toMatchInlineSnapshot(`const a = \`Hello World!\`;`);

  expectJS(
    `
    const a = \`Hello \${'World'}\${'!'}\`;
  `,
  ).toMatchInlineSnapshot(`const a = \`Hello World!\`;`);

  expectJS(
    `
    const a = \`\${"Hi!"}\`;
  `,
  ).toMatchInlineSnapshot(`const a = \`Hi!\`;`);
});
