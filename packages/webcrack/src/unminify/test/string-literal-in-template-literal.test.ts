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

  // special characters must stay escaped in the template's raw value
  expectJS('const a = `${"`"}`;').toMatchInlineSnapshot(`const a = \`\\\`\`;`);
  expectJS('const a = `${"${x}"}`;').toMatchInlineSnapshot(
    `const a = \`\\\${x}\`;`,
  );
  expectJS('const a = `${"\\\\"}`;').toMatchInlineSnapshot(
    `const a = \`\\\\\`;`,
  );
});
