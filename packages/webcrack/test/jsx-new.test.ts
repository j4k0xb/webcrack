import { test } from 'vitest';
import { testTransform } from '.';
import jsxNew from '../src/transforms/jsx-new';

const expectJS = testTransform(jsxNew);

test('tag name type', () =>
  expectJS('jsx("div", {});').toMatchInlineSnapshot('<div />;'));

test('component type', () =>
  expectJS('jsx(TodoList, {});').toMatchInlineSnapshot('<TodoList />;'));

test('deeply nested member expression type', () =>
  expectJS('jsx(components.list.TodoList, {});').toMatchInlineSnapshot(
    '<components.list.TodoList />;',
  ));

test('any other expression type', () =>
  expectJS('jsx(r ? "a" : "div", {});').toMatchInlineSnapshot(`
    const Component = r ? "a" : "div";
    <Component />;
  `));

test('rename component with conflicting name', () =>
  expectJS('function a(){} jsx(a, {});').toMatchInlineSnapshot(`
      function _Component() {}
      <_Component />;
    `));

test('attributes', () =>
  expectJS(
    'jsx("div", { "data-hover": "tooltip", style: { display: "block" } });',
  ).toMatchInlineSnapshot(`
      <div data-hover="tooltip" style={{
        display: "block"
      }} />;
    `));

test('spread attributes', () =>
  expectJS('jsx("div", {...props});').toMatchInlineSnapshot(
    '<div {...props} />;',
  ));

test('children', () =>
  expectJS(
    'jsx("div", { children: jsxs("span", { children: ["Hello ", name ] }) });',
  ).toMatchInlineSnapshot('<div><span>Hello {name}</span></div>;'));

test('text with special chars', () =>
  expectJS(
    'jsx("div", { children: ".style { color: red; }" });',
  ).toMatchInlineSnapshot('<div>{".style { color: red; }"}</div>;'));

test('component with key', () =>
  expectJS('jsx("div", {}, "test")').toMatchInlineSnapshot(
    '<div key="test" />;',
  ));

test('array expression child', () =>
  expectJS('jsx("div", { children: [1] })').toMatchInlineSnapshot(
    '<div>{[1]}</div>;',
  ));

test('fragment', () =>
  expectJS(
    'jsxs(React.Fragment, { children: [jsx("span", {}), "test"] });',
  ).toMatchInlineSnapshot('<><span />test</>;'));

test('fragment with key', () =>
  expectJS('jsx(React.Fragment, {}, o)').toMatchInlineSnapshot(
    '<React.Fragment key={o} />;',
  ));

test('remove leading comments', () =>
  expectJS(
    'return /*#__PURE__*/_jsx("h1", {children: /*#__PURE__*/_jsx("div", {})});',
  ).toMatchInlineSnapshot('return <h1><div /></h1>;'));

test('props with escaped strings', () =>
  expectJS(String.raw`
    _jsx(Foo, { bar: 'abc' });
    _jsx(Foo, { bar: 'a\\nbc' });
    _jsx(Foo, { bar: 'ab\\tc' });
    _jsx(Foo, { bar: 'ab"c' });
    _jsx(Foo, { bar: "ab'c" });
  `).toMatchInlineSnapshot(`
    <Foo bar='abc' />;
    <Foo bar={'a\\\\nbc'} />;
    <Foo bar={'ab\\\\tc'} />;
    <Foo bar={'ab"c'} />;
    <Foo bar="ab'c" />;
  `));

test('indirect jsx call', () =>
  expectJS('(0, r.jsx)("div", {})').toMatchInlineSnapshot('<div />;'));

test('object member jsxs and jsx', () =>
  expectJS(
    'r.jsxs(Foo, { bar: 1, children: [r.jsx(Child, {})] });',
  ).toMatchInlineSnapshot('<Foo bar={1}><Child /></Foo>;'));
