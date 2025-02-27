import { test } from 'vitest';
import { testTransform } from '.';
import jsx from '../src/transforms/jsx';

const expectJS = testTransform(jsx);

test('tag name type', () =>
  expectJS('React.createElement("div", null);').toMatchInlineSnapshot(
    '<div />;',
  ));

test('component type', () =>
  expectJS('React.createElement(TodoList, null);').toMatchInlineSnapshot(
    '<TodoList />;',
  ));

test('deeply nested member expression type', () =>
  expectJS(
    'React.createElement(components.list.TodoList, null);',
  ).toMatchInlineSnapshot('<components.list.TodoList />;'));

test('rename component with conflicting name', () =>
  expectJS('function a(){} React.createElement(a, null);')
    .toMatchInlineSnapshot(`
      function Component() {}
      <Component />;
    `));

test('attributes', () =>
  expectJS(
    'React.createElement("div", { "data-hover": "tooltip", style: { display: "block" } });',
  ).toMatchInlineSnapshot(`
  <div data-hover="tooltip" style={{
    display: "block"
  }} />;
`));

test('spread attributes', () =>
  expectJS('React.createElement("div", {...props});').toMatchInlineSnapshot(
    '<div {...props} />;',
  ));

test('children', () =>
  expectJS(
    'React.createElement("div", null, React.createElement("span", null, "Hello ", name));',
  ).toMatchInlineSnapshot('<div><span>Hello {name}</span></div>;'));

test('spread children', () =>
  expectJS(
    'React.createElement("div", null, ...children);',
  ).toMatchInlineSnapshot('<div>{...children}</div>;'));

test('text with special chars', () =>
  expectJS(
    'React.createElement("div", null, ".style { color: red; }");',
  ).toMatchInlineSnapshot('<div>{".style { color: red; }"}</div>;'));

test('fragment', () =>
  expectJS(
    'React.createElement(React.Fragment, null, React.createElement("span", null), "test");',
  ).toMatchInlineSnapshot('<><span />test</>;'));

test('fragment with key', () =>
  expectJS(
    'React.createElement(React.Fragment, { key: o })',
  ).toMatchInlineSnapshot('<React.Fragment key={o} />;'));

test('fragment with children', () =>
  expectJS(
    'React.createElement(React.Fragment, null, "test", ...children);',
  ).toMatchInlineSnapshot('<>test{...children}</>;'));

test('remove leading comments', () =>
  expectJS(
    'return /*#__PURE__*/React.createElement("h1", null, /*#__PURE__*/React.createElement("div", null));',
  ).toMatchInlineSnapshot('return <h1><div /></h1>;'));

test('props with escaped strings', () =>
  expectJS(String.raw`
    React.createElement(Foo, {bar: 'abc'});
    React.createElement(Foo, {bar: 'a\\nbc'});
    React.createElement(Foo, {bar: 'ab\\tc'});
    React.createElement(Foo, {bar: 'ab"c'});
    React.createElement(Foo, {bar: "ab'c"});
  `).toMatchInlineSnapshot(`
    <Foo bar='abc' />;
    <Foo bar={'a\\\\nbc'} />;
    <Foo bar={'ab\\\\tc'} />;
    <Foo bar={'ab"c'} />;
    <Foo bar="ab'c" />;
  `));
