import { test } from 'vitest';
import { testTransform } from '../../../test';
import controlFlowObject from '../control-flow-object';

const expectJS = testTransform(controlFlowObject);

// https://github.com/j4k0xb/webcrack/issues/98
test('inlined object', () => {
  expectJS(`
    ({
      QuFtJ: function (n, r) {
        return n === r;
      }
    }).QuFtJ(u, undefined);
  `).toMatchInlineSnapshot(`u === undefined;`);

  expectJS(`
    a = ({
      QuFtJ: function (n, r) {
        return n === r;
      }
    }).QuFtJ;
  `).toMatchInlineSnapshot(`
    a = function (n, r) {
      return n === r;
    };
  `);

  expectJS(`
    ({ YhxvC: "default" }).YhxvC;
  `).toMatchInlineSnapshot(`"default";`);
});
