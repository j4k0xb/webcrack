import { test } from 'vitest';
import { testTransform } from '../../../test';
import { renameDestructuring } from '../transforms';

const expectJS = testTransform(renameDestructuring);

test('rename object destructuring', () =>
  expectJS(`
    const {
      gql: t,
      dispatchers: o,
      listener: i = noop
    } = n;
    o.delete(t, i);
  `).toMatchInlineSnapshot(`
    const {
      gql,
      dispatchers,
      listener = noop
    } = n;
    dispatchers.delete(gql, listener);
  `));

test('ignore same key and alias', () =>
  expectJS(`
    const {
      gql,
      dispatchers: dispatchers,
    } = n;
  `).toMatchInlineSnapshot(`
        const {
          gql,
          dispatchers
        } = n;
      `));

test('rename object destructuring with conflict', () =>
  expectJS(`
    const gql = 1;
    const {
      gql: t,
      dispatchers: o,
      listener: i
    } = n;

    function foo({
      gql: t,
      dispatchers: o,
      listener: i
    }) {
      o.delete(t, i);
    }
  `).toMatchInlineSnapshot(`
    const gql = 1;
    const {
      gql: _gql,
      dispatchers,
      listener
    } = n;
    function foo({
      gql: _gql2,
      dispatchers: _dispatchers,
      listener: _listener
    }) {
      _dispatchers.delete(_gql2, _listener);
    }
  `));

test('rename object destructuring with global variable conflict', () =>
  expectJS(`
    const {
      Object: t,
    } = n;
    Object.keys(t);
  `).toMatchInlineSnapshot(`
  const {
    Object: _Object
  } = n;
  Object.keys(_Object);
`));

test('rename object destructuring with reserved identifier', () =>
  expectJS(`
    const { delete: t } = n;
    t();
  `).toMatchInlineSnapshot(`
  const {
    delete: _delete
  } = n;
  _delete();
`));
