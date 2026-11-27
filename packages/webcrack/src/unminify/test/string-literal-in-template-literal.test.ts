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

test('keep substitutions of tagged templates', () => {
  // the tag receives the segments and the values separately
  expectJS('tag`a${"x"}b`;').toMatchInlineSnapshot(`tag\`a\${"x"}b\`;`);
  expectJS('String.raw`${"\\\\n"}`;').toMatchInlineSnapshot(
    `String.raw\`\${"\\\\n"}\`;`,
  );
  // a nested untagged template is still inlined
  expectJS('tag`${`a${"x"}b`}`;').toMatchInlineSnapshot(`tag\`\${\`axb\`}\`;`);
});

test('escape NUL before decimal digit', () => {
  expectJS('const a = `${"\\0"}1`;').toMatchInlineSnapshot(
    `const a = \`\\x001\`;`,
  );
  expectJS('const a = `${"\\x001"}`;').toMatchInlineSnapshot(
    `const a = \`\\x001\`;`,
  );
  expectJS('const a = `${"\\0"}`;').toMatchInlineSnapshot(`const a = \`\\0\`;`);
  expectJS('const a = `\\0${"1"}`;').toMatchInlineSnapshot(
    `const a = \`\\x001\`;`,
  );
  expectJS('const a = `\\0${""}1`;').toMatchInlineSnapshot(
    `const a = \`\\x001\`;`,
  );
  expectJS('const a = `\\\\0${"1"}`;').toMatchInlineSnapshot(
    `const a = \`\\\\01\`;`,
  );
});
