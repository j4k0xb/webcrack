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

test('rename object destructuring with conflict', () =>
  expectJS(`
    const gql = 1;

    function foo({
      gql: t,
      dispatchers: o,
      listener: i
    }, {
      gql: a,
      dispatchers: b,
      listener: c
    }) {
      o.delete(t, i, a, b, c);
    }
  `).toMatchInlineSnapshot(`
    const gql = 1;
    function foo({
      gql: _gql,
      dispatchers,
      listener
    }, {
      gql: _gql2,
      dispatchers: _dispatchers,
      listener: _listener
    }) {
      dispatchers.delete(_gql, listener, _gql2, _dispatchers, _listener);
    }
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
