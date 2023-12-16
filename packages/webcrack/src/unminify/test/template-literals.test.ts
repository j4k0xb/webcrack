import { test } from 'vitest';
import { testTransform } from '../../../test';
import { templateLiterals } from '../transforms';

const expectJS = testTransform(templateLiterals);

test('escape quotes', () =>
  expectJS(
    `"'".concat(foo, "' \\"").concat(bar, "\\"");`,
  ).toMatchInlineSnapshot(`\`'\${foo}' "\${bar}"\`;`));

test('expressions', () =>
  expectJS(`
    "".concat(1);
    1 + "".concat(foo).concat(bar).concat(baz);
    1 + "".concat(foo, "bar").concat(baz);
    "".concat(1, f, "oo", true).concat(b, "ar", 0).concat(baz);
  `).toMatchInlineSnapshot(`
    \`\${1}\`;
    1 + \`\${foo}\${bar}\${baz}\`;
    1 + \`\${foo}bar\${baz}\`;
    \`\${1}\${f}oo\${true}\${b}ar\${0}\${baz}\`;
  `));
