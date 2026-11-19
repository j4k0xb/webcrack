import { test } from 'vitest';
import { testTransform } from '../../../test';
import jsonParse from '../transforms/json-parse';

const expectJS = testTransform(jsonParse);

test('array', () =>
  expectJS('JSON.parse("[1,2,3]")').toMatchInlineSnapshot('[1, 2, 3];'));

test('large literal', () =>
  expectJS('JSON.parse("1000000000000000000000")').toMatchInlineSnapshot(
    '1000000000000000000000;',
  ));

test('ignore invalid json', () =>
  expectJS('JSON.parse("abc")').toMatchInlineSnapshot('JSON.parse("abc");'));

test('ignore when JSON is declared in scope', () =>
  expectJS('let JSON; JSON.parse("null")').toMatchInlineSnapshot(
    `
    let JSON;
    JSON.parse("null");
  `,
  ));

test('keep __proto__ as an own property', () =>
  expectJS(`JSON.parse('{"__proto__": {"admin": true}}')`)
    .toMatchInlineSnapshot(`
    ({
      ["__proto__"]: {
        "admin": true
      }
    });
  `));

test('keep nested and repeated __proto__ keys as own properties', () =>
  expectJS(
    `JSON.parse('[{"a": {"__proto__": 1}}, {"__proto__": 2, "__proto__": 3}]')`,
  ).toMatchInlineSnapshot(`
    [{
      "a": {
        ["__proto__"]: 1
      }
    }, {
      ["__proto__"]: 2,
      ["__proto__"]: 3
    }];
  `));
