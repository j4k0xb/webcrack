import { test } from 'vitest';
import { testTransform } from '../../../test/index';
import evaluateGlobals from '../evaluate-globals';

const expectJS = testTransform(evaluateGlobals);

test('atob', () =>
  expectJS('atob("aGVsbG8=")').toMatchInlineSnapshot('"hello";'));

test('atob that throws', () =>
  expectJS('atob("-")').toMatchInlineSnapshot(`atob("-");`));

const unsafe = `atob("zlHZOQnYtsBGvZHVYfNu236gabh5mIaAdhUh/dHa/vLuPTlVqRYW/ubY8cABLU4lnuzJ5Bn7ZhOWMQEZ8QReDI40GRzJqfahBg5TBiH4MOA+Vis+OeZI7jag47iR5fbDmvfueXVaCtM9qQzHOnh1GX1HqlkUSTvoWmUWOfjfylMnaQyy+txE2XYQahPmCcpGGvVg+WdZitCnKQ8KumttmdsrKg15yR+K2vmHuZPvSkQ46SW6esjBWVTo6vndiTZ/mv5XeZDMCjGeqcGMOlJSGdKSqnG7SY27WpzWOfk+turZZU5zTHmnGi/sxcGKuCufYTE6QlVcYNVlFWPwwcXmvC5UFxoHUtSXmgClFros4Q==");`;
test('atob with unsafe string', () =>
  expectJS(unsafe).toMatchInlineSnapshot(unsafe));

test('unescape', () =>
  expectJS('unescape("%41")').toMatchInlineSnapshot('"A";'));

test('decodeURI', () =>
  expectJS('decodeURI("%41")').toMatchInlineSnapshot('"A";'));

test('decodeURIComponent', () =>
  expectJS('decodeURIComponent("%41")').toMatchInlineSnapshot('"A";'));
