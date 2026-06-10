import { test } from 'vitest';
import { testTransform } from '../../../test';
import controlFlowSwitch from '../control-flow-switch.js';

const expectJS = testTransform(controlFlowSwitch);

// https://github.com/j4k0xb/webcrack/issues/162
test('switch with return', () => {
  expectJS(`
function f() {
  var d = "0".split("|");
  var e = 0;
  while (true) {
    switch (d[e++]) {
      case "0":
        if (true) {
          return 123;
        } else {
          return 456;
        }
    }
    break;
  }
}`).toMatchInlineSnapshot(`
  function f() {
    if (true) {
      return 123;
    } else {
      return 456;
    }
  }
`);
});
